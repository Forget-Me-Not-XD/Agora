# NOTE TO SELF: WEEK OF MONTH MOET OOK IN AG GENEEM WORD VIR PREDICTIONS - EK IS TE MOEG OM VANAAND AAN TE GAAN :)

# apps/ml — LSTM Attendance Prediction

> Scripts that train a small LSTM neural network to predict event fill rates
> and no-show rates for university events, then serve predictions on a
> Raspberry Pi 5.

---

## Test Envirionment

| Component | Version | Notes |
|---|---|---|
| Python ( dev machine ) | **3.11.9** | 3.12+ not supported by TensorFlow |
| Python (Raspberry pi server) | **3.11.9** | Default on Raspberry pi OS Bookworm |
| Tensorflow | **2.15.1** | Training only - never installed on Pi |
| tflite-runtime | **2.14.0** | Inference only - Pi only |
| scikit-learn | **>=1.3.0** | Both envirionments ( needed to deserialise scaler.pkl) |
| numpy | **>=1.24.0, < 2.0.0** | numpy 2.x has breaking changes incompatible with TF2.15 |
| OS (dev) | Windows 11 | |
| OS (pi server) | Raspberry Pi Os Bookworm (ARM 64) | |

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [How the Neural Network Works](#3-how-the-neural-network-works)
4. [Understanding the Training Curves](#4-understanding-the-training-curves)
5. [Complete Setup Guide — From Step 1](#5-complete-setup-guide--from-step-1)
6. [Deploying Artifacts to the Raspberry Pi](#6-deploying-artifacts-to-the-raspberry-pi)
7. [Testing predict.py Manually](#7-testing-predictpy-manually)
8. [Understanding the Output JSON](#8-understanding-the-output-json)
9. [Retraining as Real Events Accumulate](#9-retraining-as-real-events-accumulate)

---

## 1. Overview

Two Python scripts handle the full ML lifecycle:

| Script | Runs on | Purpose |
|---|---|---|
| `train.py` | Dev machine | Fetches historical event data from the NestJS API, trains the LSTM, saves `model.tflite` and `scaler.pkl` |
| `predict.py` | Raspberry Pi 5 | Loaded by the NestJS backend as a child process; reads the saved artifacts and returns a JSON prediction |

Training is intentionally separated from inference. The Pi only ever runs
`predict.py` — it never trains. Training happens on a development machine
with full TensorFlow installed, producing two small artifact files that are
then copied to the Pi.

---

## 2. System Architecture

```
╔══════════════════════════════════════════════════════════════════╗
║                        DEV MACHINE                               ║
║                                                                  ║
║   MongoDB ──► GET /analytics/training-data ──► train.py          ║
║   (events,     (NestJS API, port 3000)           │               ║
║    RSVPs)                                        │               ║
║                                          ┌───────┴────────┐      ║
║                                          │  model.tflite  │      ║
║                                          │  scaler.pkl    │      ║
║                                          └───────┬────────┘      ║
╚══════════════════════════════════════════════════╪═══════════════╝
                                                   │
                                          scp (copy over network)
                                                   │
╔══════════════════════════════════════════════════╪═══════════════╗
║                   RASPBERRY PI 5                 │               ║
║                                                  ▼               ║
║   Mobile App ◄── NestJS API ◄── spawn() ◄── predict.py           ║
║               (port 3000)      child process    │                ║
║                                                 ├── model.tflite ║
║                                                 └── scaler.pkl   ║
╚══════════════════════════════════════════════════════════════════╝
```

**Why two separate environments?**  
Full TensorFlow (~500 MB) is required to train but cannot be installed cleanly
on Raspberry Pi OS Bookworm. The TFLite runtime (`tflite-runtime`, ~6 MB) can
only *run* a pre-trained model, not build one. Training on a powerful machine
and shipping only the frozen artifact to the Pi is the standard embedded ML
deployment pattern.

---

## 3. How the Neural Network Works

### 3.1 Why LSTM and not a simpler model?

A standard feedforward neural network treats each event in isolation — it has
no concept of time or sequence. University event attendance is not isolated:
fill rates in February (orientation) are structurally different from fill rates
in May (exams). An LSTM (Long Short-Term Memory network) is designed for
exactly this kind of sequential data. It reads a window of consecutive events
and builds up an internal "memory" of patterns before making a prediction for
the next event.

Our model reads a window of **5 consecutive events** (controlled by
`SEQUENCE_LENGTH = 5` in `train.py`). During training this window slides across
the entire chronologically sorted event history, producing one training sample
per position.

### 3.2 Input Features

Every event is described by exactly **4 numbers** (`NUM_FEATURES = 4`):

| Index | Feature | What it captures |
|---|---|---|
| 0 | `maxCapacity` | Venue size — large venues fill proportionally less |
| 1 | `dayOfWeek` | 0 = Sunday … 6 = Saturday — Fridays are busiest |
| 2 | `month` | 1–12 — academic calendar effects (exams, orientation) |
| 3 | `daysInAdvance` | Days between event creation and event date — promotion time |

These are the same 4 features the NestJS `LstmService.toTrainingItem()` method
builds from the database, so training data and live prediction data always
have the same shape.

### 3.3 Feature Normalisation

Raw feature values have very different scales: `maxCapacity` might be 500 while
`dayOfWeek` is 0–6. Neural networks learn much faster when all inputs are on
the same scale.

A `MinMaxScaler` from scikit-learn is fit on the training set and maps each
feature to the range **[0, 1]** using the formula:

```
scaled_value = (raw_value - feature_min) / (feature_max - feature_min)
```

The scaler is saved to `scaler.pkl` so that `predict.py` can apply the **exact
same scaling** at inference time. If the scaler were discarded and a new one
fit on a single prediction point, the scaled values would be meaningless to the
model.

### 3.4 Network Architecture

```
         INPUT TENSOR  shape: (1, 5, 4)
         ─────────────────────────────────────────
         1 sample │ 5 timesteps │ 4 features each
         
         ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  ┌──────┐
         │  t₁  │ │  t₂  │ │  t₃  │ │  t₄  │  │  t₅  │   ← 5 timesteps
         │ [4f] │ │ [4f] │ │ [4f] │ │ [4f] │  │ [4f] │   ← 4 features each
         └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘  └──┬───┘
            └────────┴────────┴────────┴─────────┘
                                │
                                ▼
         ╔══════════════════════════════════════════╗
         ║         LSTM Layer  —  32 units          ║
         ║                                          ║
         ║  Reads all 5 timesteps in sequence.      ║
         ║  Each internal cell passes its state     ║
         ║  to the next, accumulating context.      ║
         ║  Output: 32-number summary vector.       ║
         ║                                          ║
         ║  Parameters: ~5,376                      ║
         ╚══════════════════╤═══════════════════════╝
                            │ 32 values
                            ▼
         ╔══════════════════════════════════════════╗
         ║         Dropout  —  rate 0.25            ║
         ║                                          ║
         ║  Training only: randomly zeroes 8 of     ║
         ║  the 32 values each forward pass.        ║
         ║  Forces the model to learn redundant,    ║
         ║  robust patterns — not to memorise.      ║
         ║  At inference: fully disabled.           ║
         ╚══════════════════╤═══════════════════════╝
                            │ 32 values
                            ▼
         ╔═══════════════════════════════════════════╗
         ║     Dense Layer  —  16 units  (ReLU)      ║
         ║                                           ║
         ║  Fully-connected: each of the 32 inputs   ║
         ║  connects to all 16 outputs.              ║
         ║  ReLU clips any negative value to zero,   ║
         ║  keeping only meaningful positive signals.║
         ║                                           ║
         ║  Parameters: 32×16 + 16 bias = 528        ║
         ╚══════════════════╤════════════════════════╝
                            │ 16 values
                            ▼
         ╔══════════════════════════════════════════╗
         ║         Dropout  —  rate 0.125           ║
         ║                                          ║
         ║  Lighter dropout before the output layer.║
         ║  12.5% of 16 values zeroed out.          ║
         ╚══════════════════╤═══════════════════════╝
                            │ 16 values
                            ▼
         ╔══════════════════════════════════════════╗
         ║   Output Layer  —  2 units  (Sigmoid)    ║
         ║                                          ║
         ║  Maps 16 → 2 values.                     ║
         ║  Sigmoid squashes each output to [0, 1], ║
         ║  matching our labels which are both      ║
         ║  proportions (rates between 0 and 1).    ║
         ║                                          ║
         ║  Parameters: 16×2 + 2 bias = 34          ║
         ╚══════════════╤═══════════════╤═══════════╝
                        │               │
                        ▼               ▼
                   output[0]       output[1]
                  fillRate        noShowRate
                 (0.0 – 1.0)     (0.0 – 1.0)
                 
         Total trainable parameters: ~5,938
         (Compare: ResNet-50 has 25,000,000)
```

### 3.5 The LSTM Cell Explained

A regular neural network layer applies a formula once and forgets. An LSTM cell
has two pieces of state it carries from timestep to timestep:

```
            ┌─────────────────────────────────────────────────────────┐
            │                    LSTM CELL                            │
            │                                                         │
            │   Three gates control what is remembered and forgotten: │
            │                                                         │
            │   FORGET GATE ──► "How much of my long-term memory      │
            │                    should I erase?"                     │
            │                   (sigmoid: 0 = forget, 1 = keep)       │
            │                                                         │
            │   INPUT GATE  ──► "What new information should I        │
            │                    write into long-term memory?"        │
            │                   (sigmoid × tanh)                      │
            │                                                         │
            │   OUTPUT GATE ──► "What part of my long-term memory     │
            │                    should I expose right now?"          │
            │                   (sigmoid × tanh of cell state)        │
            │                                                         │
  ───────►  hidden state (short-term)                                 ├──────►
  previous  cell state   (long-term)                                  │       next
  states    └─────────────────────────────────────────────────────────┘       states
```

In plain terms: imagine reading 5 event records one at a time. The forget gate
lets the model say "the season from 3 events ago is no longer relevant." The
input gate lets it say "this is exam month — write that into memory." The output
gate decides which part of that accumulated context to use when making the
final prediction.

### 3.6 Training vs Inference — The Window Repeat Problem

During training, the model sees **real sequences of 5 consecutive historical
events**, so it can genuinely learn temporal patterns.

At inference time, we are predicting a **future event** for which no history
exists. To satisfy the LSTM's required input shape of `(1, 5, 4)` we repeat the
single event's features 5 times:

```
         Inference input (all 5 rows are identical):

         t₁: [200, 5, 2, 30]   ← the event we want to predict
         t₂: [200, 5, 2, 30]   ← same event repeated
         t₃: [200, 5, 2, 30]   ← same event repeated
         t₄: [200, 5, 2, 30]   ← same event repeated
         t₅: [200, 5, 2, 30]   ← same event repeated
```

This is acceptable because the LSTM's ability to exploit "what happened in the
last 4 events" is absent — but the patterns it learned about **feature values
themselves** (capacity, day, month, lead time) still apply through the Dense
layers. The model degrades to a sophisticated feedforward network for this path,
which is sufficient for single-event prediction.

A future improvement would cache the 4 most recent past events and prepend them
as the leading timesteps, restoring true sequential context.

---

## 4. Understanding the Training Curves

Running `train.py` with matplotlib installed saves `training_curves.png` in
`apps/ml/`. The plot has two panels:

**Left panel — MSE Loss over epochs**
```
Loss
│╲
│ ╲         train loss
│  ╲___________________
│   ╲  val loss
│    ╲_______________
│
└──────────────────── Epochs
```
- Both lines should fall together and then flatten.  
- If **val loss rises while train loss keeps falling**, the model is overfitting
  (memorising training data). The Dropout layers and early stopping are designed
  to prevent this.  
- If **both lines plateau very early at a high value**, the model is
  underfitting — consider increasing `LSTM_UNITS` or `DENSE_UNITS` in
  `train.py`.

**Right panel — MAE over epochs**  
MAE (Mean Absolute Error) is more interpretable than loss: an MAE of 0.08 on
fill rate means predictions are off by about 8 percentage points on average.
For a university event planner, an 8–12 point MAE is operationally useful.

---

## 5. Complete Setup Guide — From Step 1

### 5.1 Prerequisites

Ensure the following are installed on your **dev machine**:

- Docker Desktop (for MongoDB)
- Node.js 18+ and npm
- Python 3.10 or 3.11
- Git

### 5.2 Start MongoDB

From the monorepo root:

```bash
docker compose up -d
```

Verify MongoDB is running:

```bash
docker ps
# Should show a container on port 27017
```

### 5.3 Install Backend Dependencies and Start the API

```bash
cd apps/backend
npm install
npm run start:dev
```

The API will be available at `http://localhost:3000/api/v1`.
Leave this terminal running.

### 5.4 Seed the Database

Open a new terminal from the monorepo root:

```bash
cd apps/backend
npx ts-node src/database/seeds/seed-analytics-mock-data.ts
```

This inserts 300 synthetic historical events (July 2021 – June 2026) and
~25,460 RSVP documents with realistic SA academic calendar patterns baked in.

### 5.5 Get an Admin JWT Token

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpassword"}' \
  | grep -o '"access_token":"[^"]*"'
```

Copy the token value — you will need it in the next step.

### 5.6 Install Training Dependencies

```bash
cd apps/ml
pip install -r requirements-train.txt
```

This installs full TensorFlow, scikit-learn, numpy, matplotlib, and requests.
**Do not run this on the Raspberry Pi.**

### 5.7 Run Training

**Option A — fetch live from the running API (recommended):**

```bash
python train.py --api http://localhost:3000/api/v1 --token YOUR_JWT_TOKEN_HERE
```

**Option B — from a saved JSON file (useful for offline retraining):**

```bash
# First dump the data
curl -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
     http://localhost:3000/api/v1/analytics/training-data > data.json

# Then train from the file
python train.py --json data.json
```

Training output you will see:

```
Fetching training data from http://localhost:3000/api/v1/analytics/training-data ...
Received 300 events.

Dataset: 300 events  |  X (300, 4)  |  y (300, 2)
Chronological split: 240 train / 60 val events

Normalising features ...
capacity       : [20, 500] -> scaled to [0, 1]
dayOfWeek      : [0, 6]    -> scaled to [0, 1]
month          : [1, 12]   -> scaled to [0, 1]
daysInAdvance  : [0, 90]   -> scaled to [0, 1]

Sequences: 236 train / 56 val
...
Epoch 1/300 — loss: 0.0842  val_loss: 0.0901
Epoch 2/300 — loss: 0.0791  val_loss: 0.0855
...
Restoring model weights from the end of the best epoch: 47.

Best epoch: 47  |  best val_loss: 0.0412

== Validation Metrics ==
 Fill Rate MAE:    0.0821  (8.2 percentage points avg error)
 No-Show Rate MAE: 0.0644  (6.4 percentage points avg error)

Converting to TFLite...
Saved -> apps/ml/model.tflite (18.4 KB with quantization)
```

### 5.8 Verify the Artifacts

After training completes, confirm these files exist in `apps/ml/`:

```bash
ls -lh apps/ml/model.tflite apps/ml/scaler.pkl
```

Expected output:

```
-rw-r--r--  model.tflite   ~18 KB
-rw-r--r--  scaler.pkl     ~1 KB
```

If `model.tflite` is missing, training failed — check the error output.  
If `scaler.pkl` is missing, the scaler was not saved — this should not happen
unless the training data was too small.

---

## 6. Deploying Artifacts to the Raspberry Pi

Only two files need to be transferred. They must live in the same directory
as `predict.py` on the Pi.

```bash
# Replace PI_USER and PI_IP with your Pi's credentials
scp apps/ml/model.tflite PI_USER@PI_IP:~/span4/apps/ml/
scp apps/ml/scaler.pkl   PI_USER@PI_IP:~/span4/apps/ml/
```

**First-time Pi setup** — install inference dependencies on the Pi:

```bash
# SSH into the Pi first
ssh PI_USER@PI_IP

# Then install inference-only dependencies (no TensorFlow)
cd ~/span4/apps/ml
pip install -r requirements-infer.txt
```

Verify the Pi can import the runtime correctly:

```bash
python -c "import tflite_runtime.interpreter; print('TFLite OK')"
python -c "import sklearn; print('scikit-learn OK')"
```

---

## 7. Testing predict.py Manually

Run from the `apps/ml/` directory on the Pi (or dev machine if artifacts are
present there):

```bash
# python predict.py <capacity> <dayOfWeek> <month> <daysInAdvance>
# dayOfWeek: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday,
#            5=Friday, 6=Saturday

python predict.py 200 5 2 30
```

This simulates a 200-seat event on a Friday in February, created 30 days in
advance.

**To test edge cases:**

```bash
# Small last-minute event on a Sunday in exam month
python predict.py 30 0 5 2

# Large venue, well in advance, mid-semester Thursday
python predict.py 800 4 3 60
```

**To confirm error handling works (model missing):**

```bash
mv model.tflite model.tflite.bak
python predict.py 200 5 2 30   # should exit 1 with error on stderr
mv model.tflite.bak model.tflite
```

---

## 8. Understanding the Output JSON

`predict.py` prints one JSON object to stdout and exits with code 0:

```json
{
  "predictedFillRate":   0.82,
  "estimatedRsvps":      164,
  "predictedNoShowRate": 0.12,
  "estimatedAttendees":  144,
  "estimatedBudgetZAR":  36700,
  "reasoning": [
    "Februarie is oriënteringweek - histories hoë bywoning word verwag",
    "Vrydag-geleentheid - die besigste dag vir studentebywoning op kampus",
    "Medium-grootte lokaal - goeie vulkoers word verwag met behoorlike promosie",
    "30 dae vooraf aangekondig - redelike promosietyd is beskikbaar"
  ]
}
```

| Field | Source | Meaning |
|---|---|---|
| `predictedFillRate` | LSTM output[0] | Fraction of seats expected to be filled (0–1) |
| `estimatedRsvps` | `fillRate × capacity` | Number of people expected to confirm |
| `predictedNoShowRate` | LSTM output[1] | Fraction of confirmed attendees expected not to show (0–1) |
| `estimatedAttendees` | `rsvps × (1 - noShowRate)` | Number of people expected to physically arrive |
| `estimatedBudgetZAR` | `attendees×R250 + venue hire` | Estimated event cost in South African Rand |
| `reasoning` | Rule-based engine | Plain-language Afrikaans explanations derived from input feature values |

**Budget breakdown:**

```
estimatedBudgetZAR = (estimatedAttendees × R200 catering)
                   + venue hire (tiered by capacity)
                   + (estimatedAttendees × R50 materials)

Venue hire tiers:
  < 50  seats  →  R500
  < 200 seats  →  R1,500
  < 500 seats  →  R3,000
  500+ seats   →  R8,000
```

Any error (missing model, bad arguments, Python exception) writes a plain-text
message to **stderr** and exits with a **non-zero code** — never to stdout.
The NestJS backend treats any non-zero exit as a 503 Service Unavailable.

---

## 9. Retraining as Real Events Accumulate

The model was initially trained on 300 synthetic events. As real events happen
and RSVP data is recorded, retraining on real data will improve accuracy.

### When to retrain

- After **~50 or more new past events** have accumulated in the database
- After any structural change to how events or RSVPs are captured
- If predicted fill rates are consistently far off after one full academic
  semester of real data

### Steps

**1. Dump fresh training data:**

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_JWT" \
     http://localhost:3000/api/v1/analytics/training-data > data.json
```

**2. Retrain on the dev machine:**

```bash
cd apps/ml
python train.py --json data.json
```

**3. Review validation metrics** printed at the end of training. Compare the
new MAE values to the previous run. If MAE has improved, the new model is
better. If it has gotten worse, investigate whether the new data has unusual
patterns or whether more data is needed before retraining.

**4. Deploy both new artifacts to the Pi:**

```bash
scp apps/ml/model.tflite PI_USER@PI_IP:~/span4/apps/ml/
scp apps/ml/scaler.pkl   PI_USER@PI_IP:~/span4/apps/ml/
```

**5.** The NestJS backend picks up the new files on the next incoming request.
No restart is required.

> **Always copy both files together.**  
> The scaler's min/max ranges are recalculated from scratch on every training
> run. A new `model.tflite` paired with an old `scaler.pkl` will produce
> incorrectly scaled inputs and unreliable predictions. Treat them as a matched
> pair — they are only valid together.
