import json
import os
import re
import requests

DATA_FILE = "../data/ateez.json"
OUTPUT_FILE = "../data/ateez.json"
GROUP_NAME = "ATEEZ"
COVERS_DIR = "../assets/covers"

# Add any generic catch-all album placeholder values here if this file uses one
# (SKZ used "Singles/Solos/Features" -- Ateez doesn't appear to, but flagging
# in case that changes later)
PLACEHOLDER_ALBUMS = {"Singles/Solos/Features"}

def slugify(text):
    s = text.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s

def upsize_artwork_url(url, size=1200):
    return re.sub(r'/\d+x\d+bb\.jpg', f'/{size}x{size}bb.jpg', url)

def artist_matches(returned_artist, group_name):
    if not returned_artist:
        return False
    ra = returned_artist.lower()
    gn = group_name.lower()
    return gn in ra or ra in gn

def get_art_for_album(album, group_name):
    resp = requests.get(
        "https://itunes.apple.com/search",
        params={"term": f"{group_name} {album}", "media": "music", "entity": "album", "limit": 3},
        timeout=10,
    )
    results = resp.json().get("results", [])
    for r in results:
        # check both the album's own artist AND, since group albums sometimes list
        # a member as primary artist with the group as collection artist
        if artist_matches(r.get("artistName"), group_name) or artist_matches(r.get("collectionArtistName", ""), group_name):
            art_url = r.get("artworkUrl100")
            return upsize_artwork_url(art_url) if art_url else None
    return None

def get_art_for_song(title, artist_field, group_name):
    artist = artist_field or group_name
    resp = requests.get(
        "https://itunes.apple.com/search",
        params={"term": f"{artist} {title}", "media": "music", "entity": "song", "limit": 3},
        timeout=10,
    )
    results = resp.json().get("results", [])
    for r in results:
        if artist_matches(r.get("artistName"), group_name) or artist_matches(r.get("collectionArtistName", ""), group_name):
            art_url = r.get("artworkUrl100")
            return upsize_artwork_url(art_url) if art_url else None
    return None

def main():
    os.makedirs(COVERS_DIR, exist_ok=True)
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    real_albums = sorted(set(s["album"] for s in data if s["album"] not in PLACEHOLDER_ALBUMS))
    album_to_filename = {}
    no_art_albums = []

    for album in real_albums:
        filename = f"{slugify(album)}.jpg"
        filepath = os.path.join(COVERS_DIR, filename)
        if os.path.exists(filepath):
            album_to_filename[album] = filename
            continue

        url = get_art_for_album(album, GROUP_NAME)
        if not url:
            print(f"NO ART FOUND (album, artist-verified): {album}")
            no_art_albums.append(album)
            continue

        img_data = requests.get(url, timeout=15).content
        with open(filepath, "wb") as f:
            f.write(img_data)
        album_to_filename[album] = filename
        print(f"Saved (album): {album} -> {filename}")

    for song in data:
        if song["album"] in album_to_filename and not song.get("art"):
            song["art"] = f"assets/covers/{album_to_filename[song['album']]}"

    no_art_songs = []
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
            print(f"NO ART FOUND (song, artist-verified): {song['title']}")
            no_art_songs.append(song['title'])
            continue

        img_data = requests.get(url, timeout=15).content
        with open(filepath, "wb") as f:
            f.write(img_data)
        song["art"] = f"assets/covers/{filename}"
        print(f"Saved (song): {song['title']} -> {filename}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\nDone. {len(no_art_albums)} albums and {len(no_art_songs)} songs had no artist-verified match.")

if __name__ == "__main__":
    main()