import json
import time
import os
import requests
import librosa
import numpy as np
import subprocess
from difflib import SequenceMatcher
import re

# --- Config ---
DATA_FILE = "../data/skz.json"
OUTPUT_FILE = "../data/skz.json"   # writes to a NEW file — doesn't touch your real data yet
GROUP_NAME = "Stray Kids"
LIMIT = None  # only process the first 10 songs for now — set to None for a full run later
TMP_FILE = "tmp_preview.m4a"

FEATURES = ["spectral_centroid", "spectral_rolloff", "zero_crossing_rate", "rms_energy", "spectral_contrast"]

def normalize_title(t):
    t = t.lower()
    t = re.sub(r'\([^)]*\)', '', t)
    t = re.sub(r'\[[^\]]*\]', '', t)
    t = re.sub(r'[^a-z0-9]', '', t)
    return t

def titles_match(a, b, threshold=0.5):
    na, nb = normalize_title(a), normalize_title(b)
    if not na or not nb:
        return False
    return SequenceMatcher(None, na, nb).ratio() >= threshold

def get_preview_url(title, artist):
    try:
        resp = requests.get(
            "https://itunes.apple.com/search",
            params={"term": f"{artist} {title}", "media": "music", "limit": 1},
            timeout=10,
        )
        results = resp.json().get("results", [])
        if not results:
            return None, None
        matched_name = results[0].get("trackName")
        if not titles_match(title, matched_name):
            return None, f"REJECTED (too dissimilar): {matched_name}"
        return results[0].get("previewUrl"), matched_name
    except Exception as e:
        print(f"    lookup error: {e}")
        return None, None

def extract_features(preview_url):
    r = requests.get(preview_url, timeout=15)
    with open(TMP_FILE, "wb") as f:
        f.write(r.content)

    wav_file = "tmp_preview.wav"
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", TMP_FILE, "-ar", "22050", "-ac", "1", wav_file],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        os.remove(TMP_FILE)
        raise RuntimeError(f"ffmpeg conversion failed: {result.stderr[-300:]}")

    y, sr = librosa.load(wav_file, sr=22050)
    feats = {
        "spectral_centroid": float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))),
        "spectral_rolloff": float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr))),
        "zero_crossing_rate": float(np.mean(librosa.feature.zero_crossing_rate(y=y))),
        "rms_energy": float(np.mean(librosa.feature.rms(y=y))),
        "spectral_contrast": float(np.mean(librosa.feature.spectral_contrast(y=y, sr=sr))),
    }
    os.remove(TMP_FILE)
    os.remove(wav_file)
    return feats

def main():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    songs = data if LIMIT is None else data[:LIMIT]
    failures = []
    matches_for_review = []

    for i, song in enumerate(songs):
        title = song["title"]
        artist = song.get("artist") or GROUP_NAME
        print(f"[{i+1}/{len(songs)}] {artist} — {title}")

        preview_url, matched_name = get_preview_url(title, artist)
        if not preview_url:
            print(f"    NO PREVIEW FOUND {matched_name or ''}")
            failures.append(title)
            continue

        matches_for_review.append((title, matched_name))
        try:
            song["acoustic"] = extract_features(preview_url)
            print(f"    OK (matched iTunes title: \"{matched_name}\")")
        except Exception as e:
            print(f"    extraction failed: {e}")
            failures.append(title)

        time.sleep(0.5)  # be polite to the API

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\nDone. {len(songs) - len(failures)}/{len(songs)} succeeded.")
    print(f"Written to {OUTPUT_FILE}")

    print("\n--- Title matches to spot-check ---")
    for original, matched in matches_for_review:
        flag = "  <-- CHECK THIS" if original.lower() not in matched.lower() and matched.lower() not in original.lower() else ""
        print(f"  \"{original}\" -> iTunes: \"{matched}\"{flag}")

    if failures:
        print("\n--- No preview found / failed ---")
        for f_title in failures:
            print(f"  {f_title}")

if __name__ == "__main__":
    main()