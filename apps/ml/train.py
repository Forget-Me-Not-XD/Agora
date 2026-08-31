"""
train.py - LSTM Training Script: Event Attendance Prediction
============================================================

What this Script will do:
1. Loads historical event data from the NestJS API or a local JSON file
2. Sorts events chronologically and normalises all 4 features to the range [0, 1]
3. Organises events into overlapping sequences of 5 (Sliding window)
4. Trains a small LSTM to predict fill rate AND no-show rate simultaneously
5. Converts the trained model to TFLite with quantization for Raspberry Pi (<-- Server hosting platform)
6. Saves model.tflite and scaler.pkl - these are the file going on the server (Raspberry Pi)

Run from apps/ml/ :
    #Option A: fetch live from the running API
    python train.py --api http://localhost:3000/api/v1 --token YOUR_ADMIN_JWT
    
    #Option B: Use a JSON file (dump from curl first)
    # curl -H "Authorization: Bearer TOKEN" localhost:3000/api/v1/analytics/training-data > data.json
    python train.py --json data.json
"""

# ========== Imports: ==========
import argparse
import datetime
import json
import os
import pickle
import sys
import math

import numpy as np
import requests
from sklearn.preprocessing import MinMaxScaler
import tensorflow as tf
from tensorflow import keras


# ============================================================
# Configuration:
# All tunable constants liev here so code digging is minimal - to later fine tune this model
# ============================================================

SEQUENCE_LENGTH = 10    #<-- How many consecutive events the LSTM "reads" before making a prediction. (Short Term memory window)
NUM_FEATURES = 8    #<-- engineered: [capacity, sin(dow), cos(dow), sin(month), cos(month), sin(dom), cos(dom), log1p(daysInAdvance)]
NUM_OUTPUTS = 2    #<-- [fillRate, noShowRate] Multi output regression - both values gets determined simultaneously
LSTM_UNITS = 64   #<-- Size of the LSTM's hidden state ('working memory')
DENSE_UNITS = 32    #<-- The intermediate Dense layer compresses the 64 LSTM outputs to 32 numbers before final prediction layer
DROPOUT_RATE = 0.2    #<-- After the LSTM and the Dense layer, we randomly zero out this fraction of activations during training - LSTM can't rely on a single neuron
LEARNING_RATE = 0.001    #<-- Step size for weight updates - If training unstable increase to 0.005
BATCH_SIZE = 32    #<-- How many sequences are processed before weights are updated once.
MAX_EPOCHS = 300    #<-- Hard cap on training iterations
PATIENCE = 25    #<-- Early stopping: id val_liss hasn't improved for this many epochs.
VAL_SPLIT = 0.20    #<-- 20% Of events are held back for validation - never used in training
HUBER_DELTA = 0.3    #<-- Residuals bigger than this (fill/no-show rate units) get linear instead of quadratic loss - dampens outlier historical events
FAR_FUTURE_THRESHOLD_DAYS = 45    #<-- Validation events at/after this many days-in-advance get their own MAE/RMSE breakdown
SAMPLE_WEIGHT_SCALE = 30.0    #<-- Every this-many days of daysInAdvance adds +1.0 to a training sample's weight
SAMPLE_WEIGHT_CAP_DAYS = 120    #<-- daysInAdvance is capped at this value before computing weight, so one extreme outlier can't dominate a batch
MIN_VALID_CAPACITY = 10    #<-- Events with a smaller maxCapacity than this look like test/junk data, not real venues, and are dropped before training

# ============================================================
# DATA LOADING:
# ============================================================

def load_from_api(base_url: str, token: str) -> list:
    url = f"{base_url.rstrip('/')}/analytics/training-data"
    print(f"Fetching training data from {url} ...")
    resp = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    resp.raise_for_status()
    items = resp.json()
    print(f"Recieved {len(items)} events.\n")
    return items


def load_from_file(path: str) -> list:
    print(f"Loading training data from {path} ...")
    with open(path, encoding='utf-8') as f:
        items = json.load(f)
    print(f"Loaded {len(items)} events.\n")
    return items


def clean_items(items: list) -> list:
    """
    Drops events that look like test/junk data rather than real bookings:
        - maxCapacity below MIN_VALID_CAPACITY (placeholder/test events, not real venues)
        - fillRate above 1.0 (confirmedAttendees exceeded maxCapacity - an impossible
        target for the sigmoid output layer, and a sign the capacity value itself
        isn't trustworthy for that event)
    """
    cleaned = []
    dropped_capacity = 0
    dropped_fillrate = 0
    for e in items:
        capacity = e['features'][0]
        fill_rate = e['labels']['fillRate']
        if capacity < MIN_VALID_CAPACITY:
            dropped_capacity += 1
            continue
        if fill_rate > 1.0:
            dropped_fillrate += 1
            continue
        cleaned.append(e)

    print(
        f"Data cleaning: dropped {dropped_capacity} events with capacity < {MIN_VALID_CAPACITY}, "
        f"{dropped_fillrate} events with fillRate > 1.0  ({len(cleaned)}/{len(items)} kept)\n"
    )
    return cleaned


def parse_items(items: list) -> tuple:
    """Convert the raw JSON list into numpy arrays, sorted chronologically"""
    items = sorted(items, key=lambda e: e.get('date', ''))
    
    x = np.array([e['features'] for e in items], dtype=np.float32)
    y = np.array(
        [[e['labels']['fillRate'], e['labels']['noShowRate']] for e in items],
        dtype=np.float32,
    )
    return x, y

# ============================================================
# FEATURE ENGINEERING: cyclical encoding + log compression
# ============================================================

def engineer_features(raw: np.ndarray) -> np.ndarray:
    """
    Expands the 5 raw features NestJS sends into the 8 features the model trains on.
    Pure function of the raw values - no fitting involved - so it's safe to apply before
    the train/val split without any data leakage.
    """
    capacity        =   raw[:, 0]
    day_of_week     =   raw[:, 1]
    month           =   raw[:, 2]
    day_of_month    =   raw[:, 3]
    days_advance    =   raw[:, 4]
    
    dow_angle = 2.0 * np.pi * day_of_week / 7.0
    month_angle = 2.0 * np.pi * (month - 1.0) / 12.0
    dom_angle = 2.0 * np.pi * (day_of_month - 1.0) / 31.0
    
    return np.column_stack([
        capacity,
        np.sin(dow_angle),
        np.cos(dow_angle),
        np.sin(month_angle),
        np.cos(month_angle),
        np.sin(dom_angle),
        np.cos(dom_angle),
        np.log1p(days_advance),
    ]).astype(np.float32)
    


# ============================================================
# FEATURE NORMALISATION:
# ============================================================

def fit_and_save_scaler(X_train: np.ndarray, output_dir: str) -> MinMaxScaler:
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaler.fit(X_train)
    
    path = os.path.join(output_dir, 'scaler.pkl')
    with open(path, 'wb') as f:
        pickle.dump(scaler, f)
    print(f"Scaler saved -> {path}")
    labels = ['capacity', 'dow_sin', 'dow_cos', 'month_sin', 'month_cos', 'dom_sin', 'dom_cos', 'daysInAdvance_log1p']
    for label, lo, hi in zip(labels, scaler.data_min_, scaler.data_max_):
        print(f"{label:15s}: [{lo:.0f}, {hi:.0f}] -> scaled to [0, 1]")
    print()
    return scaler
    
    
# ============================================================
# SLIDING WINDOW SEQUENCE:
# ============================================================

def create_sequences(X: np.ndarray, y: np.ndarray) -> tuple:
    X_out, y_out = [], []
    for i in range(len(X) - SEQUENCE_LENGTH + 1):
        X_out.append(X[i : i + SEQUENCE_LENGTH])    # (SEQUENCE LENGTH, 4)
        y_out.append(y[i + SEQUENCE_LENGTH - 1])    # Labels of last event
    return np.array(X_out, dtype=np.float32), np.array(y_out, dtype=np.float32)

# ============================================================
# SAMPLE WEIGHTING: make far-future events count more
# ============================================================

def create_sample_weights(days_advance_raw: np.ndarray) -> np.ndarray:
    """
    One weight per training sequence, aligned with the create_sequence()'s 
    y_out indexing (the target event is always the last timestep, at index i + SEQUENCE_LENGTH - 1).
    Near-term events dominate by sheer count in real historical data, so plain average loss barely
    "notices" the far-future examples - this makes each one count more.
    """
    n_seq = len(days_advance_raw) - SEQUENCE_LENGTH + 1
    target_days = np.array(
        [days_advance_raw[i + SEQUENCE_LENGTH - 1] for i in range(n_seq)],
        dtype = np.float32,
    )
    capped = np.minimum(target_days, SAMPLE_WEIGHT_CAP_DAYS)
    return (1.0 + capped / SAMPLE_WEIGHT_SCALE).astype(np.float32)
    


# ============================================================
# MODEL ARCHITECTURE:
# ============================================================

def build_model() -> keras.Model:
    model = keras.Sequential([
        keras.layers.LSTM(
            units = LSTM_UNITS,
            input_shape = (SEQUENCE_LENGTH, NUM_FEATURES),
            name = 'lstm'
        ),
        keras.layers.Dropout(DROPOUT_RATE, name='dropout_lstm'),
        keras.layers.Dense(DENSE_UNITS, activation='relu', name='dense_hidden'),
        keras.layers.Dropout(DROPOUT_RATE / 2, name='dropout_dense'),
        keras.layers.Dense(NUM_OUTPUTS, activation='sigmoid', name='output'),
    ])
    
    model.compile(
        optimizer = keras.optimizers.Adam(learning_rate = LEARNING_RATE, clipnorm = 1.0),
        loss = keras.losses.Huber(delta = HUBER_DELTA),
        metrics = ['mae'],
    )
    return model


# ============================================================
# TRAINING WITH CALLBACKS:
# ============================================================

def train_model(model, X_train, y_train, X_val, y_val, sample_weight=None):
    callbacks = [
        # EarlyStopping - Most important safeguard against overfitting
        # Monitors val_loss. If it hasn't improved for PATIENCE consecutive expochs, training stops
        # Model rewinds to use best weights
        keras.callbacks.EarlyStopping(
            monitor = 'val_loss',
            patience = PATIENCE,
            restore_best_weights = True,
            verbose = 1,
        ),
        # SECONDARY SafeGuard - If val_loss stagnates for 10 epochs, halve the learning rate This lets the model take smaller more careful steps
        keras.callbacks.ReduceLROnPlateau(
            monitor = 'val_loss',
            factor = 0.5,
            patience = 10,
            min_lr = 1e-6,
            verbose = 1
        ),
    ]
    
    print(f"Training: {len(X_train)} sequences | Validation: {len(X_val)} sequences")
    history = model.fit(
        X_train, y_train,
        sample_weight = sample_weight,
        validation_data = (X_val, y_val),
        epochs = MAX_EPOCHS,
        batch_size = BATCH_SIZE,
        callbacks = callbacks,
        verbose = 1,
    )
    return history


# ============================================================
# KERAS -> TFLITE CONVERSION:
# ============================================================

def convert_to_tflite(model: keras.Model, output_dir: str) -> None:
    print("Converting to TFlite...")

    # from_keras_model traces with dynamic shapes, causing TensorListReserve
    # to fail. from_concrete_functions with a fixed input_signature makes all
    # tensor shapes static, which TFLite requires for LSTM conversion.
    @tf.function(input_signature=[
        tf.TensorSpec(shape=[1, SEQUENCE_LENGTH, NUM_FEATURES], dtype=tf.float32)
    ])
    def predict_fn(x):
        return model(x, training=False)

    converter = tf.lite.TFLiteConverter.from_concrete_functions(
        [predict_fn.get_concrete_function()]
    )
    converter.optimizations = [tf.lite.Optimize.DEFAULT]

    tflite_model = converter.convert()

    path = os.path.join(output_dir, 'model.tflite')
    with open(path, 'wb') as f:
        f.write(tflite_model)

    size_kb = len(tflite_model) / 1024
    print(f"Saved -> {path} ({size_kb:.1f} KB with quantization)\n")


# ============================================================
# EVALUATION:
# ============================================================
def evaluate(model: keras.Model, X_val: np.ndarray, y_val: np.ndarray, val_days_adnvance: np.ndarray, history=None) -> dict:
    preds = model.predict(X_val, verbose=0)    # shape (n_val, 2)
    
    def mae(a, b): return float(np.mean(np.abs(a - b)))
    def rmse(a, b): return float(np.sqrt(np.mean((a - b) ** 2)))
    
    fill_mae    =   mae(preds[:, 0], y_val[:, 0])
    noshow_mae  =   mae(preds[:, 1], y_val[:, 1])
    fill_rmse   =   rmse(preds[:, 0], y_val[:, 0])
    noshow_rmse =   rmse(preds[:, 1], y_val[:, 1])
    
    far_mask = val_days_adnvance >= FAR_FUTURE_THRESHOLD_DAYS
    n_far = int(far_mask.sum())
    if n_far > 0:
        far_fill_mae    = mae(preds[far_mask, 0], y_val[far_mask, 0])
        far_noshow_mae  = mae(preds[far_mask, 1], y_val[far_mask, 1])
        far_fill_rmse   = rmse(preds[far_mask, 0], y_val[far_mask, 0])
        far_noshow_rmse = rmse(preds[far_mask, 1], y_val[far_mask, 1])
    else:
        far_fill_mae = far_noshow_mae = far_fill_rmse = far_noshow_rmse = None
        
    print("== Validation Metrics ========================================")
    print(f" Fill Rate    MAE: {fill_mae:.4f}   RMSE: {fill_rmse:.4f}")
    print(f" No-Show Rate MAE: {noshow_mae:.4f}   RMSE: {noshow_rmse:.4f}")
    print()
    print(f"== Far-future subset (daysInAdvance >= {FAR_FUTURE_THRESHOLD_DAYS}, n={n_far}) ====")
    if n_far > 0:
        print(f" Fill Rate    MAE: {far_fill_mae:.4f}   RMSE: {far_fill_rmse:.4f}")
        print(f" No-Show Rate MAE: {far_noshow_mae:.4f}   RMSE: {far_noshow_rmse:.4f}")
    else:
        print(" (no far-future validation events in this split)")
    print()

    metrics = {
        "fill_mae": round(fill_mae, 4), "fill_rmse": round(fill_rmse, 4),
        "noshow_mae": round(noshow_mae, 4), "noshow_rmse": round(noshow_rmse, 4),
        "far_future_n": n_far,
        "far_future_fill_mae": round(far_fill_mae, 4) if n_far > 0 else None,
        "far_future_fill_rmse": round(far_fill_rmse, 4) if n_far > 0 else None,
        "far_future_noshow_mae": round(far_noshow_mae, 4) if n_far > 0 else None,
        "far_future_noshow_rmse": round(far_noshow_rmse, 4) if n_far > 0 else None,
    }
    
    print("== Sample predictions vs actual (first 8 validation sequences) ==")
    print(f"  {'fill actual':>12}  {'fill pred':>10}  {'noshow actual':>14}  {'noshow pred':>12}")
    for i in range(min(8, len(y_val))):
        fa, nsa = y_val[i]
        fp, nsp = preds[i]
        print(f"  {fa:>12.3f}  {fp:>10.3f}  {nsa:>14.3f}  {nsp:>12.3f}")
    print()

    # ==============================
    # Optional training curve plot (Requires matplotlib in requirements-train.txt)
    # ==============================
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        print("(matplotlib not installed - skipping training curve plot)")
        return metrics

    if history is not None:
        _, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))

        ax1.plot(history.history['loss'],     label='train loss')
        ax1.plot(history.history['val_loss'], label='val loss')
        ax1.set_title('MSE Loss over Epochs')
        ax1.set_xlabel('Epoch'); ax1.set_ylabel('MSE')
        ax1.legend(); ax1.grid(True)

        ax2.plot(history.history['mae'],     label='train MAE')
        ax2.plot(history.history['val_mae'], label='val MAE')
        ax2.set_title('MAE over Epochs')
        ax2.set_xlabel('Epoch'); ax2.set_ylabel('MAE')
        ax2.legend(); ax2.grid(True)

        output_dir = os.path.dirname(os.path.abspath(__file__))
        chart_path = os.path.join(output_dir, 'training_curves.png')
        plt.tight_layout()
        plt.savefig(chart_path, dpi=150)
        print(f"Training curve saved → {chart_path}")
        plt.close()

    return metrics


# ============================================================
# MAIN
# ============================================================
def main() -> None:
    np.random.seed(42)
    tf.random.set_seed(42)
    parser = argparse.ArgumentParser(
        description = "Train LSTM model for event attendance prediction"
    )
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument('--api', metavar='URL',
                        help='Base API Url (e.g. http://localhost:3000/api/v1)')
    source.add_argument('--json', metavar='FILE',
                        help='Path to local JSON training data file')
    parser.add_argument('--token', metavar='JWT',
                        help='Admin JWT token (required when using --api)')
    args = parser.parse_args()
    
    if args.api and not args.token:
        parser.error('--token is required when using --api')
    
    # == LOAD ============================================================
    items = load_from_api(args.api, args.token) if args.api else load_from_file(args.json)
    items = clean_items(items)

    min_required = math.ceil(SEQUENCE_LENGTH / VAL_SPLIT)
    if len(items) < min_required:
        print(f"ERROR: Need at least {min_required} events. Got {len(items)}.")
        sys.exit(1)

    X_raw, y_raw = parse_items(items)
    days_advance_raw = X_raw[:, 4].copy()    # keep pre-engineering, needed for sample weights + far-future eval
    X_raw = engineer_features(X_raw)
    print(f"Dataset: {len(X_raw)} events  |  X {X_raw.shape}  |  y {y_raw.shape}\n")

    # == Chronological train / val split ==================================================
    split = int((1 - VAL_SPLIT) * len(X_raw))
    X_train_raw, X_val_raw = X_raw[:split], X_raw[split:]
    y_train_raw, y_val_raw = y_raw[:split], y_raw[split:]
    days_advance_train, days_advance_val = days_advance_raw[:split], days_advance_raw[split:]
    print(f"Chronological split: {len(X_train_raw)} train / {len(X_val_raw)} val events\n")

    # == Normalise ============================================================
    print("Normalising features (fitting scaler on training data only) …")
    output_dir = os.path.dirname(os.path.abspath(__file__))
    scaler = fit_and_save_scaler(X_train_raw, output_dir)

    X_train_scaled = scaler.transform(X_train_raw)  # fit was already done above
    X_val_scaled   = scaler.transform(X_val_raw)    # transform only — no re-fitting

    # == Build sequences ============================================================
    X_train_seq, y_train_seq = create_sequences(X_train_scaled, y_train_raw)
    X_val_seq,   y_val_seq   = create_sequences(X_val_scaled,   y_val_raw)
    
    train_sample_weights = create_sample_weights(days_advance_train)
    val_target_days = np.array(
        [days_advance_val[i + SEQUENCE_LENGTH - 1] for i in range(len(X_val_seq))],
        dtype=np.float32,
    )

    print(f"Sequences: {len(X_train_seq)} train / {len(X_val_seq)} val")
    print(f"  X_train shape : {X_train_seq.shape}  (sequences × timesteps × features)")
    print(f"  y_train shape : {y_train_seq.shape}  (sequences × outputs)\n")

    # == Build model ============================================================
    model = build_model()
    model.summary()
    total_params = model.count_params()
    print(f"\nTotal trainable parameters: {total_params:,}")
    print("(This is tiny — good for Pi inference. Full ResNet-50 has 25 million.)\n")

    # == Train ======================================================================
    history = train_model(model, X_train_seq, y_train_seq, X_val_seq, y_val_seq, sample_weight=train_sample_weights)
    best_epoch    = int(np.argmin(history.history['val_loss'])) + 1
    best_val_loss = float(min(history.history['val_loss']))
    print(f"\nBest epoch : {best_epoch}  |  best val_loss : {best_val_loss:.6f}\n")

    # == Evaluate ======================================================================
    metrics = evaluate(model, X_val_seq, y_val_seq, val_target_days, history)

    # == Convert to TFLite ============================================================
    convert_to_tflite(model, output_dir)
    
    # == Save metadata ===============================================================
    meta = {
        "trained_at":    datetime.datetime.utcnow().isoformat() + "Z",
        "n_events":      len(X_raw),
        "best_epoch":    best_epoch,
        "best_val_loss": round(best_val_loss, 6),
        "loss_function": "huber",
        **metrics,
    }
    meta_path = os.path.join(output_dir, 'model_meta.json')
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"Model metadata saved -> {meta_path}")

    # == Done ======================================================================
    print("═" * 60)
    print("Training complete. Deploy these two files to the Raspberry Pi,")
    print("into the same directory as predict.py:")
    print("  model.tflite")
    print("  scaler.pkl")
    print("  model_meta.json")
    print("═" * 60)


if __name__ == '__main__':
    main()
