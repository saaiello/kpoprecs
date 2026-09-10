# Discograph v2 — cross-group K-pop discovery

## File structure
```
index.html        structure only
assets/style.css  all styling
assets/app.js     data fetch, rendering, favorites
data/songs.json   song data — swap in real catalogs here
README.md         this file
```

## Running it locally

`app.js` uses `fetch()` to load `data/songs.json`. Browsers block `fetch()`
against `file://` paths for security reasons, so opening `index.html`
directly by double-clicking it will show a "couldn't load" message in the
list pane. You need a local server instead — pick whichever's easiest:

**VS Code — Live Server extension (easiest)**
1. Install the "Live Server" extension (by Ritwick Dey) from the Extensions panel
2. Right-click `index.html` → "Open with Live Server"
3. It opens in your browser and auto-reloads on save

**Terminal — Python (no install needed if you have Python 3)**
```
cd discograph-v2
python3 -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

**Terminal — Node (if you have it and prefer it)**
```
npx serve
```

## Where to start customizing

- **Colors/fonts/spacing** → `assets/style.css`, all in one file, grouped by section (nav, list pane, graph pane)
- **Add more songs** → `data/songs.json`. Each song needs `id`, `title`, `group` (must match a key in `groupMeta` in `app.js`), `album`, `bpm`, `x`, `y`, and `recs` (an array of other song `id`s)
- **Change group colors/names** → `groupMeta` object at the top of `assets/app.js`
- **Favorites storage** → `loadFavorites()` / `saveFavorites()` in `app.js`, currently using `localStorage` under the key `discograph_favorites`

## Known limitation to keep in mind

Node `x`/`y` positions in `songs.json` are hand-placed right now. Once
you're comfortable moving things around in this structure, the next step
discussed was swapping static positions for a `d3-force` physics
simulation (Obsidian-style node movement) — that's a separate, self-contained
change to `app.js` and doesn't require touching `index.html` or the data
schema beyond removing the hardcoded `x`/`y` values.
