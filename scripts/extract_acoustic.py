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
DATA_FILE = "../data/bts.json"
OUTPUT_FILE = "../data/bts.json"
GROUP_NAME = "BTS"
LIMIT = None
TMP_FILE = "tmp_preview.m4a"

FEATURES = ["spectral_centroid", "spectral_rolloff", "zero_crossing_rate", "rms_energy", "spectral_contrast"]

def normalize_chars(t):
    t = t.lower()
    t = re.sub(r'\([^)]*\)', '', t)
    t = re.sub(r'\[[^\]]*\]', '', t)
    t = re.sub(r'[^a-z0-9]', '', t)
    return t

def normalize_words(t):
    t = t.lower()
    t = re.sub(r'\([^)]*\)', '', t)
    t = re.sub(r'\[[^\]]*\]', '', t)
    t = re.sub(r'[^a-z0-9\s]', '', t)
    return set(w for w in t.split() if w)

def char_ratio(a, b):
    na, nb = normalize_chars(a), normalize_chars(b)
    if not na or not nb:
        return 0
    return SequenceMatcher(None, na, nb).ratio()

def word_jaccard(a, b):
    wa, wb = normalize_words(a), normalize_words(b)
    if not wa or not wb:
        return 0
    return len(wa & wb) / len(wa | wb)

def titles_match(a, b, char_threshold=0.5, high_char_threshold=0.95, word_threshold=0.6):
    c = char_ratio(a, b)
    if c < char_threshold:
        return False
    if c >= high_char_threshold:
        return True
    return word_jaccard(a, b) >= word_threshold

def artist_matches(returned_artist, artist_field, group_name):
    if not returned_artist:
        return False
    ra = returned_artist.lower()
    candidates = [group_name.lower()]
    if artist_field:
        candidates.append(artist_field.lower())
    return any(c in ra or ra in c for c in candidates)

def build_search_term(song, group_name):
    if song.get("_search_title_override"):
        artist_field = song.get("artist") or group_name
        return f"{artist_field} {song['_search_title_override']}"
    artist_field = song.get("artist")
    if not artist_field:
        return f"{group_name} {song['title']}"
    return f"{artist_field} {song['title']}"

def get_preview_url(song, group_name):
    # Use the override title for VALIDATION too, not just the search query --
    # comparing "Extraordinary You" against "끝나지 않을 이야기" would always fail.
    title = song.get("_search_title_override") or song["title"]
    artist_field = song.get("artist")
    query = build_search_term(song, group_name)
    try:
        resp = requests.get(
            "https://itunes.apple.com/search",
            params={"term": query, "media": "music", "limit": 1},
            timeout=10,
        )
        results = resp.json().get("results", [])
        if not results:
            return None, None
        matched_name = results[0].get("trackName")
        matched_artist = results[0].get("artistName")
        matched_collection_artist = results[0].get("collectionArtistName", "")
        if not titles_match(title, matched_name):
            return None, f"REJECTED (title): {matched_name}"
        artist_ok = artist_matches(matched_artist, artist_field, group_name)
        collection_ok = group_name.lower() in matched_collection_artist.lower()
        if not (artist_ok or collection_ok):
            return None, f"REJECTED (artist: {matched_artist}): {matched_name}"
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

        if song.get("acoustic"):
            continue

        print(f"[{i+1}/{len(songs)}] {artist} — {title}")

        preview_url, matched_name = get_preview_url(song, GROUP_NAME)
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