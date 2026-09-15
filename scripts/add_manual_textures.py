import json

DATA_FILE = "../data/skz.json"

# Fill in texture tags by ear — 1-2 tags per song from your vocabulary:
# raw, metallic, polished, airy, synthetic
manual_textures = {
    "Mixtape #2 (Behind the Light)": ["raw"],
    "Mixtape #4 (Broken Compass)": ["raw"],
    "Hoodie Season (Mixtape #5)": ["polished"],
    "NIGHT (English Version)": ["polished"],
    "Ai o Kureta noni, Naze": ["polished"],
    "GIANT (Korean Ver.)": ["metallic", "synthetic"],
    "ESCAPE (Bang Chan, Hyunjin)": ["metallic"],
    "Roman Empire (Bang Chan)": ["polished"],
    "LOVER (Hyunjin)": ["polished"],
    "Raining Stars (HAN)": ["airy"],
    "BABY (Bang Chan)": ["polished"],
    "Don't Say (HAN)": ["polished"],
    "REV IT UP": ["synthetic", "metallic"],
    "Extraordinary You": ["airy"],
    "Updraft": ["synthetic"],
    "Let It Show": ["polished"],
    "can't love": ["polished"],
}

with open(DATA_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

updated = 0
not_found = []
for song in data:
    if song["title"] in manual_textures:
        song["texture"] = manual_textures[song["title"]]
        updated += 1

found_titles = {s["title"] for s in data if "texture" in s and s["title"] in manual_textures}
for title in manual_textures:
    if title not in found_titles:
        not_found.append(title)

with open(DATA_FILE, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Tagged {updated} songs.")
if not_found:
    print("Titles not found in file (check exact spelling):", not_found)