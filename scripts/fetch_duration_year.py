import json
import time
import requests
from difflib import SequenceMatcher
import re

# --- Config ---
DATA_FILE = "../data/ateez.json"
OUTPUT_FILE = "../data/ateez.json"
GROUP_NAME = "ATEEZ"

# Apple's own docs say "~20 calls per minute" but describe it as approximate
# and note real-world enforcement varies. Staying well under it, at 12/min
# (one call every 5s), leaves real margin instead of just barely fitting.
CALLS_PER_MINUTE = 12
MIN_INTERVAL = 60.0 / CALLS_PER_MINUTE
_last_call_time = [0.0]  # mutable holder so the closure below can update it

def rate_limited_wait():
    now = time.monotonic()
    elapsed = now - _last_call_time[0]
    if elapsed < MIN_INTERVAL:
        time.sleep(MIN_INTERVAL - elapsed)
    _last_call_time[0] = time.monotonic()

def _strip_parens(t):
    return re.sub(r'\([^)]*\)', '', t)

def _extract_paren_content(t):
    matches = re.findall(r'\(([^)]*)\)', t)
    return ' '.join(matches)

def normalize_chars(t):
    t = t.lower()
    outside = _strip_parens(t)
    outside = re.sub(r'\[[^\]]*\]', '', outside)
    outside_clean = re.sub(r'[^a-z0-9]', '', outside)
    if outside_clean:
        return outside_clean
    inside_clean = re.sub(r'[^a-z0-9]', '', _extract_paren_content(t))
    return inside_clean

def normalize_words(t):
    t = t.lower()
    outside = _strip_parens(t)
    outside = re.sub(r'\[[^\]]*\]', '', outside)
    outside_words = set(w for w in re.sub(r'[^a-z0-9\s]', '', outside).split() if w)
    if outside_words:
        return outside_words
    inside_words = set(w for w in re.sub(r'[^a-z0-9\s]', '', _extract_paren_content(t)).split() if w)
    return inside_words

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

def ms_to_duration(ms):
    total_seconds = round(ms / 1000)
    minutes = total_seconds // 60
    seconds = total_seconds % 60
    return f"{minutes}:{seconds:02d}"

def get_metadata(song, group_name, max_retries=3):
    title = song.get("_search_title_override") or song["title"]
    artist_field = song.get("artist")
    artist = artist_field or group_name

    for attempt in range(max_retries):
        rate_limited_wait()  # <-- enforce pacing BEFORE every request, success or retry
        try:
            resp = requests.get(
                "https://itunes.apple.com/search",
                params={"term": f"{artist} {title}", "media": "music", "limit": 1},
                timeout=10,
            )
            data = resp.json()
            break
        except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
            if attempt < max_retries - 1:
                wait = 15 * (attempt + 1)  # 15s, then 30s -- longer backoff, since 5/10s wasn't enough last time
                print(f"    (rate-limited or network error, waiting {wait}s and retrying...)")
                time.sleep(wait)
            else:
                return {"rejected": f"lookup error after {max_retries} tries: {e}"}

    results = data.get("results", [])
    if not results:
        return None
    r = results[0]
    matched_name = r.get("trackName")
    matched_artist = r.get("artistName")
    matched_collection_artist = r.get("collectionArtistName", "")

    if not titles_match(title, matched_name):
        return {"rejected": f"title mismatch: {matched_name}"}
    artist_ok = artist_matches(matched_artist, artist_field, group_name)
    collection_ok = group_name.lower() in matched_collection_artist.lower()
    if not (artist_ok or collection_ok):
        return {"rejected": f"artist mismatch: {matched_artist}"}

    duration = ms_to_duration(r["trackTimeMillis"]) if r.get("trackTimeMillis") else None
    year = None
    if r.get("releaseDate"):
        year = int(r["releaseDate"][:4])

    return {"duration": duration, "year": year, "matched_name": matched_name}

def main():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    remaining = [s for s in data if not (s.get("duration") and s.get("year"))]
    est_minutes = len(remaining) / CALLS_PER_MINUTE
    print(f"{len(remaining)} songs still need data. At {CALLS_PER_MINUTE}/min, expect ~{est_minutes:.1f} minutes minimum.\n")

    failures = []
    matches_for_review = []

    for i, song in enumerate(data):
        if song.get("duration") and song.get("year"):
            continue

        title = song["title"]
        print(f"[{i+1}/{len(data)}] {title}")

        result = get_metadata(song, GROUP_NAME)
        if not result or "rejected" in result:
            reason = result["rejected"] if result else "no results"
            print(f"    NO MATCH ({reason})")
            failures.append(title)
            continue

        if not song.get("duration"):
            song["duration"] = result["duration"]
        if not song.get("year"):
            song["year"] = result["year"]

        matches_for_review.append((title, result["matched_name"], result["duration"], result["year"]))
        print(f"    OK — duration={result['duration']}  year={result['year']}  (matched: \"{result['matched_name']}\")")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\nDone. {len(matches_for_review)} updated, {len(failures)} failed.")
    print(f"Written to {OUTPUT_FILE}")

    if failures:
        print("\n--- No match / failed ---")
        for f_title in failures:
            print(f"  {f_title}")

if __name__ == "__main__":
    main()