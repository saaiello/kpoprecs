import json
import os
import re
import requests

DATA_FILE = "../data/skz.json"
OUTPUT_FILE = "../data/skz.json"
GROUP_NAME = "Stray Kids"
COVERS_DIR = "../assets/covers"

PLACEHOLDER_ALBUMS = {"Singles/Solos/Features"}  # add other catch-all values here if you have them

def slugify(text):
    s = text.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s

def upsize_artwork_url(url, size=1200):
    return re.sub(r'/\d+x\d+bb\.jpg', f'/{size}x{size}bb.jpg', url)

def get_art_for_album(album, group_name):
    resp = requests.get(
        "https://itunes.apple.com/search",
        params={"term": f"{group_name} {album}", "media": "music", "entity": "album", "limit": 1},
        timeout=10,
    )
    results = resp.json().get("results", [])
    if not results:
        return None
    art_url = results[0].get("artworkUrl100")
    return upsize_artwork_url(art_url) if art_url else None

def get_art_for_song(title, artist_field, group_name):
    artist = artist_field or group_name
    resp = requests.get(
        "https://itunes.apple.com/search",
        params={"term": f"{artist} {title}", "media": "music", "entity": "song", "limit": 1},
        timeout=10,
    )
    results = resp.json().get("results", [])
    if not results:
        return None
    art_url = results[0].get("artworkUrl100")
    return upsize_artwork_url(art_url) if art_url else None

def main():
    os.makedirs(COVERS_DIR, exist_ok=True)
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # --- Real albums: one lookup per unique album, shared across all its songs ---
    real_albums = sorted(set(s["album"] for s in data if s["album"] not in PLACEHOLDER_ALBUMS))
    album_to_filename = {}

    for album in real_albums:
        filename = f"{slugify(album)}.jpg"
        filepath = os.path.join(COVERS_DIR, filename)
        if os.path.exists(filepath):
            album_to_filename[album] = filename
            continue
        url = get_art_for_album(album, GROUP_NAME)
        if not url:
            print(f"NO ART FOUND (album): {album}")
            continue
        img_data = requests.get(url, timeout=15).content
        with open(filepath, "wb") as f:
            f.write(img_data)
        album_to_filename[album] = filename
        print(f"Saved (album): {album} -> {filename}")

    for song in data:
        if song["album"] in album_to_filename and not song.get("art"):
            song["art"] = f"assets/covers/{album_to_filename[song['album']]}"

    # --- Placeholder albums: one lookup PER SONG, since each is its own real release ---
    for song in data:
        if song["album"] not in PLACEHOLDER_ALBUMS or song.get("art"):
            continue

        filename = f"{slugify(song['title'])}.jpg"
        filepath = os.path.join(COVERS_DIR, filename)
        if os.path.exists(filepath):
            song["art"] = f"assets/covers/{filename}"
            continue

        url = get_art_for_song(song["title"], song.get("artist"), GROUP_NAME)
        if not url:
            print(f"NO ART FOUND (song): {song['title']}")
            continue

        img_data = requests.get(url, timeout=15).content
        with open(filepath, "wb") as f:
            f.write(img_data)
        song["art"] = f"assets/covers/singles/skz/{filename}"
        print(f"Saved (song): {song['title']} -> {filename}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    main()