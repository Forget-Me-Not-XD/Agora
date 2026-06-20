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
    print(f"Loading..........")

