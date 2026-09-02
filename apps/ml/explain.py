# ========== Imports: ==========
import numpy as np

FEATURE_NAMES = ['capacity', 'dayOfWeek', 'month', 'dayOfMonth', 'daysInAdvance']

WEIGHT_FILL = 0.7
WEIGHT_NOSHOW = 0.3

MIN_REASONING_IMPACT = 0.0005
MAX_REASONS = 3

AFRIKAANS_DAYS = ['Sondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrydag', 'Saterdag']
AFRIKAANS_MONTHS = ['', 'Januarie', 'Februarie', 'Maart', 'April', 'Mei', 'Junie', 'Julie', 'Augustus', 'September', 'Oktober', 'November', 'Desember']

def reference_values(history_raw: np.ndarray) -> np.ndarray:
    return np.median(history_raw, axis=0)

def build_counterfactual(raw_sequence: np.ndarray, feature_idx: int, ref_value: float) -> np.ndarray:
    cf = raw_sequence.copy()
    cf[-1, feature_idx] = ref_value
    return cf

def score_sequence(raw_sequence, scaler, engineer_features_fn, invoke_fn) -> tuple:
    engineered = engineer_features_fn(raw_sequence)
    scaled = scaler.transform(engineered)
    input_array = scaled.reshape(1, raw_sequence.shape[0], scaled.shape[1]).astype(np.float32)
    return invoke_fn(input_array)

def compute_occlusion_reasoning(
    raw_sequence: np.ndarray,
    baseline_fill: float,
    baseline_noshow: float,
    scaler,
    engineer_features_fn,
    invoke_fn,
):
    history_raw = raw_sequence[:-1]
    target_raw = raw_sequence[-1]
    refs = reference_values(history_raw)
    
    candidates = []
    for i, name in enumerate(FEATURE_NAMES):
        ref = refs[i]
        cf_sequence = build_counterfactual(raw_sequence, i, ref)
        cf_fill, cf_noshow = score_sequence(cf_sequence, scaler, engineer_features_fn, invoke_fn)
        
        delta_fill = baseline_fill - cf_fill
        delta_noshow = baseline_noshow - cf_noshow
        impact = abs(delta_fill) * WEIGHT_FILL + abs(delta_noshow) * WEIGHT_NOSHOW
        
        candidates.append((impact, name, target_raw[i], ref, delta_fill, delta_noshow))
        
    candidates.sort(key=lambda c: c[0], reverse=True)

    # Two separate gates, not one:
    #  - impact >= MIN_REASONING_IMPACT rules out true near-zero cases (padded/
    #    degenerate history) — MIN_REASONING_IMPACT is deliberately tiny, just
    #    above floating-point noise, since real single-feature effects on real
    #    data are often well under 1 percentage point and still worth reporting.
    #  - round(delta_fill%) != 0 guards what actually gets PRINTED: format_reason()
    #    always reports the fillRate delta specifically, so a candidate that only
    #    clears the impact bar via its noShowRate component (leaving delta_fill
    #    too small to round to a whole percentage point) would otherwise print a
    #    nonsensical "...increased fill rate by 0 percentage points".
    strong = [
        c for c in candidates
        if c[0] >= MIN_REASONING_IMPACT and round(abs(c[4]) * 100) >= 1
    ][:MAX_REASONS]
    
    if not strong:
        return None
    
    return [format_reason(*c[1:]) for c in strong]

def format_reason(name, actual, ref, delta_fill, delta_noshow) -> str:
    direction = "verhoog" if delta_fill >= 0 else "verlaag"
    pct = round(abs(delta_fill) * 100)
    
    if name == 'capacity':
        return (f"Kapasiteit van {int(actual)} sitplekke (teenoor {int(ref)} tipies by "
                f"onlangse geleenthede) het die verwagte vulkoers met {pct} persentasiepunte {direction}")
    if name == 'dayOfWeek':
        return (f"{AFRIKAANS_DAYS[int(actual)]}-geleentheid (onlangse gemiddeld was eerder "
                f"{AFRIKAANS_DAYS[int(ref)]}) het die vulkoers met {pct} persentasiepunte {direction}")
    if name == 'month':
        return (f"{AFRIKAANS_MONTHS[int(actual)]} (teenoor {AFRIKAANS_MONTHS[int(ref)]} onlangs) "
                f"het die vulkoers met {pct} persentasiepunte {direction}")
    if name == 'dayOfMonth':
        return (f"Dag {int(actual)} van die maand (onlangse tipiese dag was {int(ref)}) "
                f"het die vulkoers met {pct} persentasiepunte {direction}")
    if name == 'daysInAdvance':
        return (f"{int(actual)} dae vooraf beplan (onlangse tipiese waarde: {int(ref)} dae) "
                f"het die vulkoers met {pct} persentasiepunte {direction}")