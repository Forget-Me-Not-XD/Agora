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
import json
import os
import pickle
import sys

import numpy as np
import requests
from sklearn.preprocessing import MinMaxScaler
import tensorflow as tf
from tensorflow import keras


# ============================================================
# Configuration:
# All tunable constants liev here so code digging is minimal - to later fine tune this model
# ============================================================

SEQUENCE_LENGTH = 5    #<-- How many consecutive events the LSTM "reads" before making a prediction. (Short Term memory window)
NUM_FEATURES = 4    #<-- [maxCapacity, dayOfWeek (0-6), month (1-12), daysInAdvance]
NUM_OUTPUTS = 2    #<-- [fillRate, noShowRate] Multi output regression - both values gets determined simultaneously
LSTM_UNITS = 32    #<-- Size of the LSTM's hidden state ('working memory')
DENSE_UNITS = 16    #<-- The intermediate Dense layer compresses the 32 LSTM outputs to 16 numbers before final prediction layer
DROPOUT_RATE = 0.25    #<-- After the LSTM and the Dense layer, we randomly zero out this fraction of activations during training - LSTM can't rely on a single neuron
LEARNING_RATE = 0.001    #<-- Step size for weight updates - If training unstable increase to 0.005
BATCH_SIZE = 16    #<-- Hoe many sequences are processed before weights are updated once.
MAX_EPOCHS = 300    #<-- Hard cap on training iterations
PATIENCE = 25    #<-- Early stopping: id val_liss hasn't improved for this many epochs.
VAL_SPLIT = 0.20    #<-- 20% Of events are held back for validation - never used in training

# ============================================================
# DATA LOADING:
# ============================================================

def load_from_api(base_url: str, token: str) -> list:
    url = f"{base_url.rstrip('/')}/analytics/training-data"
    print(f"Fetching training data from {url} ...")
    resp = request.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
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
# FEATURE NORMALISATION:
# ============================================================

def fit_and_save_scaler(X_train: np.ndarray, output_dir: str) -> MinMaxScaler:
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaler.fit(X_train)
    
    path = os.path.join(output_dir, 'scaler.pkl')
    with open(path, 'wb') as f:
        pickle.dump(scaler, f)
    print(f"Scaler saved -> {path}")
    labels = ['capacity', 'dayOfWeek', 'month', 'daysInAdvance']
    for label, lo, hi in zip(labels, scaler.data_min_, scaler.data_max_):
        print(f"{label:15s}: [{lo:.of}, {hi:.0f}] -> scaled to [0, 1]")
        print()
        return scaler
    
    
# ============================================================
# SLIDING WINDOW SEQUENCE:
# ============================================================

def create_sequence(X: np.ndarray, y: np.ndarray) -> tuple:
    X_out, y_out = [], []
    for i in range(len(X) - SEQUENCE_LENGTH + 1):
        X_out.append(X[i : i + SEQUENCE_LENGTH])    # (SEQUENCE LENGTH, 4)
        y_out.append(y[i + SEQUENCE_LENGTH - 1])    # Labels of last event
    return np.array(X_out, dtype=np.float32), np.array(y_out, dtype=np.float32)


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
        keras.layers.Desne(DENSE_UNITS, activation='relu', name='dense_hidden'),
        keras.layers.Dropout(DROPOUT_RATE / 2, name='dropout_dense'),
        keras.layers.Dense(NUM_OUTPUTS, activation='sigmoid', name='output'),
    ])
    
    model.compile(
        optimizer = keras.optimizers.Adam(learning_rate = LEARNING_RATE),
        loss = 'mae',
        metrics = ['mae'],
    )
    return model


# ============================================================
# TRAINING WITH CALLBACKS:
# ============================================================

def train_model(model, X_train, y_train, X_val, y_val):
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
            min_lr = 1e - 6,
            verbose = 1
        ),
    ]
    
    print(f"Training: {len(X_train)} sequences | Validation: {len(X_val)} sequences")
    history = model.fit(
        X_train, y_train,
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
    converter  = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    
    tflite_model = converter.convert()
    
    path = os.path.join(output_dir, 'model.tflite')
    with open(path, 'wb') as f:
        f.write(tflite_model)
    
    size_kb = len(tflite_model) / 1024
    print(f"Saved -. {path} ({size_kb:.1f} KB with quanmtization)\n")


# ============================================================
# EVALUATION:
# ============================================================

