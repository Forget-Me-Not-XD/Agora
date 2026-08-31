"""
predict.py - LSTM Inference Script: Event Attendance Prediction
======================================================================

What this script will do:
1. Accepts a JSON array of SEQUENCE_LENGTH [capacity, dayOfWeek, month, daysInAdvance]
   rows as a single CLI argument - oldest event first, target event last
2. Loads scaler.pkl (MinMaxScaler from training) and normalises the sequence
3. Runs the TFLite interpreter on the real sequence to obtain fillRate and noShowRate
4. Computes a cost estimate from the predictions
5. Generates rules-based reasoning strings from the target event's own features
6. Prints a single JSON object to stdout (NestJS reads via spawn)

Usage:
    python predict.py '<JSON array of SEQUENCE_LENGTH [capacity, dayOfWeek, month, daysInAdvance] rows>'

Example:
    python predict.py '[[180,3,2,40],[220,5,2,35],...,[200,5,2,30]]'
    (10 rows: 9 real preceding events, then the target event as the final row)

    Exit code 0 on success, non-zero on any error
    Errors go to stderr; only the JSON result goes to stdout.
"""

# ========== Imports: ==========
import argparse
import json
import os
import pickle
import sys
import numpy as np

try:
    import ai_edge_litert.interpreter as tflite         # Pi: lightweight runtime (tflite-runtime's successor;
                                                        # required for op versions emitted by TF 2.15+ converters)
except ImportError:
    try:
        import tflite_runtime.interpreter as tflite      # older Pi installs pinned to tflite-runtime
    except ImportError:
        try:
            import tensorflow as _tf
            tflite = _tf.lite                            # Dev machine: use TF's bundled interpreter
        except ImportError:
            sys.stderr.write(
                "ERROR: Neither ai-edge-litert, tflite-runtime, nor tensorflow is installed.\n"
                "On Raspberry Pi:  pip install -r requirements-infer.txt\n"
                "On dev machine:   pip install -r requirements-train.txt\n"
            )
            sys.exit(1)
    

# Following values must match train.py EXACTLY - saved model was compiled with these dimensions and cannot accept any other input shape
SEQUENCE_LENGTH = 10    # timesteps the LSTM expects per sample
NUM_FEATURES = 6    # engineered: [capacity, sin(dow), cos(dow), sin(month), cos(month), log1p(daysInAdvance)]


# ============================================================
# ARTIFACT LAODING
# ============================================================

def load_artifacts(script_dir: str):
    # Load scaler.pkl and verify model.tflite exists.
    scaler_path = os.path.join(script_dir, 'scaler.pkl')
    model_path = os.path.join(script_dir, 'model.tflite')
    
    # Fail fast with human-readable message before attempting to load:
    if not os.path.exists(scaler_path):
        sys.stderr.write(
            f"ERROR: scaler.pkl not found at {scaler_path}\n"
            "Run train.py first, then copy scaler.pkl to the same directory as predict.py.\n"
        )
        sys.exit(1)

    if not os.path.exists(model_path):
        sys.stderr.write(
            f"ERROR: model.tflite not found at {model_path}\n"
            "Run train.py first, then copy model.tflite to the same directory as predict.py.\n"
        )
        sys.exit(1)

    with open(scaler_path, 'rb') as f:
        scaler = pickle.load(f)
        
    return scaler, model_path

# ============================================================
# FEATURE ENGINEERING: must catch train.py's engineer_features() EXACTLY
# ============================================================

def engineer_features(raw: np.ndarray) -> np.ndarray:
    capacity        =   raw[:, 0]
    day_of_week     =   raw[:, 1]
    month           =   raw[:, 2]
    days_advance    =   raw[:, 3]
    
    dow_angle = 2.0 * np.pi * day_of_week / 7.0
    month_angle = 2.0 * np.pi * (month - 1.0) / 12.0
    
    return np.column_stack([
        capacity,
        np.sin(dow_angle),
        np.cos(dow_angle),
        np.sin(month_angle),
        np.cos(month_angle),
        np.log1p(days_advance),
    ]).astype(np.float32)


# ============================================================
# TFLITE INFERENCE
# ============================================================

def run_inference(model_path: str, input_array: np.ndarray) -> tuple:
    # Load the TFLite model and run one forward pass - Returns (fillRate, noShowRate) as plain python floats
    interpreter = tflite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()
    
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    # Copy our (1, SEQUENCE_LENGTH, NUM_FEATURES) input array into the model's input buffer
    interpreter.set_tensor(input_details[0]['index'], input_array)
    
    # Run the Model:
    interpreter.invoke()
    
    # Read the (1, 2) output - [[fillRate, noShowRate]]
    output = interpreter.get_tensor(output_details[0]['index'])
    fill_rate = float(output[0][0])
    no_show_rate = float(output[0][1])
    
    return fill_rate, no_show_rate


# ============================================================
# BUDGET ESTIMATION - TO BE CALIBRATED !!!
# ============================================================

def venue_cost(capacity: int) -> int:
    if capacity < 50:
        return 500
    elif capacity < 200:
        return 1500
    elif capacity < 500:
        return 3000
    else:
        return 8000

def compute_budget(fill_rate: float, no_show_rate: float, capacity: int) -> tuple:
    """
    Derive 3 estimated from the models predictions:
    1. estimatedRsvps     = seats × fillRate  (people who will confirm)
    2. estimatedAttendees = rsvps × (1 - noShowRate)  (people who will arrive)
    3. estimatedBudget    = (R200 catering + R50 materials) per attendee + venue hire
    """
    estimated_rsvps = round(fill_rate * capacity)
    estimated_attendees = round(estimated_rsvps * (1 - no_show_rate))
    budget = (
        estimated_attendees * 200    # catering: R200 per attendee
        + venue_cost(capacity)    # Venue Hire (Tiered by capacity)
        + estimated_attendees * 50    # materials / refreshments: R50 per Attendee
    )
    return estimated_rsvps, estimated_attendees, budget


# ============================================================
# RULE-BASED REASONING ENGINE
# ============================================================
def generate_reasoning(capacity: int, dow: int, month: int, days_in_advance: int) -> list:
    reasons = []
    
    # === Rule 1: Academic calendar effect (Month) ===
    if month == 2:
        reasons.append(
            "Februarie is oriënteringweek - histories hoë bywoning word verwag tydens hierdie tydperk"
        )
    elif month == 5:
        reasons.append(
            "Mei-eksamentydperk nader - bywoning daal tipies gedurende hierdie tydperk"
        )
    elif month == 10:
        reasons.append(
            "Oktober-eksamentyd nader - bywoning daal tipies gedurende hierdie tydperk"
        )
    elif month in (12, 1):
        reasons.append(
            "Vakansietyd (Desember/Januarie) - Baie studente is nie op kampus nie"
        )
    elif month in (3, 4):
        reasons.append(
            "Eerste semester in volle swaaing - bogemiddelde bywoning word verwag"
        )
    elif month in (7, 8):
        reasons.append(
            "Tweede semester begin - studentebetrokkenheid is tipies hoog"
        )
    elif month == 9:
        reasons.append(
            "September voor Oktober-eksamens - bywoning kan daal namate studente begin studeer"
        )
    elif month == 6:
        reasons.append(
            "Junie-halfjaarbreek - bywoning is wisselvallig tydens eksamen- en semesterbreektyd"
        )
    elif month == 11:
        reasons.append(
            "November-eksames nader / Studente is klaar met eksamens - studente fokus eerder op studeer as geleenthede"
        )
    else:
        reasons.append(
            "Neutrale akademiese tydperk - geen sterk seisoeneffek word verwag nie"
        )

    # === Rule 2: Day of the week effect ===
    if dow == 5:
        reasons.append(
            "Vrydag-geleentheid - die besigste dag vir studentebywoning op kampus"
        )
    elif dow == 4:
        reasons.append(
            "Donderdag-geleentheid - een van die gewildste dae vir studente-aktiwiteite"
        )
    elif dow == 3:
        reasons.append(
            "Woensdag-geleentheid - middeweekdag, goed vir akademiese byeenkomste"
        )
    elif dow == 2:
        reasons.append(
            "Dinsdag-geleentheid - vroeë weekdag, bywoning is gewoonlik gemiddeld"
        )
    elif dow == 1:
        reasons.append(
            "Maandag-geleentheid - studente begin die week, bywoning kan wisselvallig wees"
        )
    elif dow == 0:
        reasons.append(
            "Sondag-geleentheid - baie studente is nie op kampus nie, lae bywoning verwag"
        )
    else:  # dow == 6, Saturday
        reasons.append(
            "Saterdag-geleentheid - laer bywoning as werksdae word verwag"
        )

    # === Rule 3: Venue Capacity Effect ===
    if capacity < 50:
        reasons.append(
            "Klein lokaal (Onder 50 sitplekke) - sulke lokale vul gewoonlik vinnig en volledig"
        )
    elif capacity < 200:
        reasons.append(
            "Medium-grootte lokaal - goeie vulkoers word verwag met behoorlike promosie"
        )
    elif capacity < 500:
        reasons.append(
            "Groot lokaal - proporsioneel laer vulkoers is normaal vir hierdie lokaalgrootte"
        )
    else:
        reasons.append(
            "Baie groot lokaal (500+ sitplekke) - hoë vulkoers vereis intensiewe bemarking"
        )

    # === Rule 4: Planning lead time effect ===
    if days_in_advance >= 45:
        reasons.append(
            f"{days_in_advance} dae vooraf beplan - voldoende promosietyd vir maksimum bywoning"
        )
    elif days_in_advance >= 14:
        reasons.append(
            f"{days_in_advance} dae vooraf aangekondig - redelike promosietyd is beskikbaar"
        )
    elif days_in_advance >= 7:
        reasons.append(
            f"Slegs {days_in_advance} dae kennis - beperkte promosietyd kan bywoning negatief beïnvloed"
        )
    else:
        reasons.append(
            f"Minder as 7 dae kennis gegee ({days_in_advance} dae) - lae bywoning word verwag"
        )
    
    return reasons


# ============================================================
# MAIN
# ============================================================

def main() -> None:
    parser = argparse.ArgumentParser(
        description = "LSTM inference: predict fill rate and no show rate from a real event sequence"
    )
    parser.add_argument(
        'sequence', type = str,
        help = f'JSON array of exactly {SEQUENCE_LENGTH} [capacity, dayOfWeek, month, daysInAdvance] rows, oldest first, target event last',
    )
    args = parser.parse_args()

    try:
        sequence = json.loads(args.sequence)
    except json.JSONDecodeError as exc:
        sys.stderr.write(f"ERROR: sequence argument is not valid JSON: {exc}\n")
        sys.exit(1)

    if not isinstance(sequence, list) or len(sequence) != SEQUENCE_LENGTH:
        got = len(sequence) if isinstance(sequence, list) else type(sequence).__name__
        sys.stderr.write(f"ERROR: sequence must be a JSON array with exactly {SEQUENCE_LENGTH} rows, got {got}\n")
        sys.exit(1)

    for row in sequence:
        if not isinstance(row, list) or len(row) != 4:
            sys.stderr.write("ERROR: each sequence row must have exactly 4 values [capacity, dayOfWeek, month, daysInAdvance]\n")
            sys.exit(1)

    # Resolve the dir this script lives in:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    scaler, model_path = load_artifacts(script_dir)

    # Build the raw sequence, engineer + scale it exactly like training:
    raw_features = np.array(sequence, dtype = np.float32)      # Shape (SEQUENCE_LENGTH, 4)
    engineered = engineer_features(raw_features)                # Shape (SEQUENCE_LENGTH, 6)
    scaled = scaler.transform(engineered)                       # Shape (SEQUENCE_LENGTH, 6)

    input_array = scaled.reshape(1, SEQUENCE_LENGTH, NUM_FEATURES).astype(np.float32)

    fill_rate, no_show_rate = run_inference(model_path, input_array)

    # Sigmoid output is theoretically [0, 1]
    fill_rate = max(0.0, min(1.0, fill_rate))
    no_show_rate = max(0.0, min(1.0, no_show_rate))

    # The target event is always the LAST row of the sequence - use its own raw
    # values for the budget estimate and reasoning strings, not any historical row.
    target_capacity, target_dow, target_month, target_days_advance = sequence[-1]
    target_capacity = int(target_capacity)
    target_dow = int(target_dow)
    target_month = int(target_month)
    target_days_advance = int(target_days_advance)

    estimated_rsvps, estimated_attendees, budget = compute_budget(
        fill_rate, no_show_rate, target_capacity
    )

    reasoning = generate_reasoning(
        target_capacity, target_dow, target_month, target_days_advance
    )

    result = {
        "predictedFillRate": round(fill_rate, 4),
        "estimatedRsvps": estimated_rsvps,
        "predictedNoShowRate": round(no_show_rate, 4),
        "estimatedAttendees":  estimated_attendees,
        "estimatedBudgetZAR":  budget,
        "reasoning":           reasoning,
    }
    
    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0)

if __name__ == '__main__':
    try:
        main()
    except SystemExit:
        raise # let argparse errors and explicit sys.exit() vall trhough unchanged
    except Exception as exc:
        sys.stderr.write(f"ERROR: {exc}\n")
        sys.exit(1)
