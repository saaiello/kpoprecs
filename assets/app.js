import { GENRE_MAP } from './genre-map.js';

const groupMeta = {
  skz: { name: "Stray Kids", color: "#5EEAD4" },
  bts: { name: "BTS", color: "#A78BFA" },
  ateez: { name: "Ateez", color: "#FB923C" },
  enhypen: { name: "Enhypen", color: "#F472B6" },
  wonho: { name: "WONHO", color: "#daf472" }
};

const DATA_SOURCES = [
  { group: "skz", file: "data/skz.json" },
  { group: "bts", file: "data/bts.json" },
  { group: "ateez", file: "data/ateez.json" },
  { group: "enhypen", file: "data/enhypen.json" },
  { group: "wonho", file: "data/wonho.json" }
];

const GENRE_BUCKETS = [
  "Pop",
  "Dance-Pop",
  "House/Club EDM",
  "Electronic",
  "Hip-Hop",
  "R&B/Soul",
  "Ballad",
  "Rock/Punk/Metal",
  "Acoustic",
  "Afrobeat/Global",
  "Interlude/Other"
];

const BUCKET_DISPLAY_NAMES = {
  "House/Club EDM": "EDM",
  "Electronic/Atmospheric": "Chill Electronic",
  "Rock/Punk/Metal": "Rock",
  "Acoustic": "Acoustic",
  "Afrobeat/Global": "Global Beats",
  "Dance-Pop": "Synth-Pop"
};

function bucketDisplayName(bucket){
  return BUCKET_DISPLAY_NAMES[bucket] || bucket;
}

const FAVORITES_KEY = "discograph_favorites";
const GRAPH_WIDTH_KEY = "discograph_graph_width";
const THEME_KEY = "discograph_theme";

const listenPlatforms = [
  { key: "spotify", label: "Spotify" },
  { key: "appleMusic", label: "Apple Music" }
];
const watchPlatforms = [
  { key: "youtube", label: "Music Video" }
];

let songs = [];
let byId = {};
let favorites = new Set(loadFavorites());
let expandedId = null;
let favoritesOnly = false;
let ostOnly = false;
let currentFilter = "";
let selectedGroups = new Set();
let selectedGenres = new Set();

const listEl = document.getElementById("list");
const svg = document.getElementById("graph");
const graphEmptyEl = document.getElementById("graphEmpty");
const songCardEl = document.getElementById("songCard");
const searchEl = document.getElementById("search");
const groupNavEl = document.getElementById("groupNav");
const genreNavEl = document.getElementById("genreNav");
const navAllEl = document.getElementById("navAll");
const navFavoritesEl = document.getElementById("navFavorites");
const navOSTEl = document.getElementById("navOST");
const resizeHandle = document.getElementById("resizeHandle");
const graphPaneEl = document.querySelector(".graphpane");
const mobileRandomBtn = document.getElementById("mobileRandomBtn");

const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const sidebarCloseEl = document.getElementById("sidebarClose");
const sidebarEl = document.querySelector(".sidebar");

function openSidebar(){
  sidebarEl.classList.add("open");
  sidebarOverlay.classList.add("open");
}
function closeSidebar(){
  sidebarEl.classList.remove("open");
  sidebarOverlay.classList.remove("open");
}
function closeSidebarIfMobile(){
  if (window.innerWidth <= 768) closeSidebar();
}

mobileMenuBtn.addEventListener("click", openSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);
sidebarCloseEl.addEventListener("click", closeSidebar);

mobileRandomBtn.addEventListener("click", () => {
  if (!songs.length) return;
  const randomSong = songs[Math.floor(Math.random() * songs.length)];
  selectAndExpand(randomSong.id);
});

/* ---- Artist display: use a per-song artist override if present
   (for collabs/solos/OSTs), otherwise fall back to the group name ---- */
function displayArtist(song){
  return song.artist || groupMeta[song.group].name;
}

/* ---- Favorites (localStorage) ---- */
function loadFavorites(){
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Could not read favorites from localStorage", err);
    return [];
  }
}
function saveFavorites(){
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  } catch (err) {
    console.warn("Could not save favorites to localStorage", err);
  }
}

/* ---- Theme (localStorage) ---- */
function loadTheme(){
  return localStorage.getItem(THEME_KEY) || "dark";
}
function saveTheme(theme){
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (err) {
    console.warn("Could not save theme", err);
  }
}

function applyTheme(theme){
  if (theme === "dark") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
  document.querySelectorAll(".theme-option").forEach(el => {
    const isActive = el.getAttribute("data-theme") === theme;
    el.classList.toggle("active", isActive);
    el.querySelector(".theme-swatch").classList.toggle("active", isActive);
  });
}

document.querySelectorAll(".theme-option").forEach(el => {
  el.addEventListener("click", () => {
    const theme = el.getAttribute("data-theme");
    applyTheme(theme);
    saveTheme(theme);
  });
});

applyTheme(loadTheme());

/* ---- Graph panel resize (localStorage) ---- */
function loadGraphWidth(){
  const saved = localStorage.getItem(GRAPH_WIDTH_KEY);
  return saved ? parseInt(saved, 10) : 300;
}
function saveGraphWidth(px){
  try {
    localStorage.setItem(GRAPH_WIDTH_KEY, String(px));
  } catch (err) {
    console.warn("Could not save graph width", err);
  }
}
graphPaneEl.style.width = loadGraphWidth() + "px";

let resizing = false;
resizeHandle.addEventListener("mousedown", () => {
  resizing = true;
  resizeHandle.classList.add("dragging");
  document.body.style.userSelect = "none";
});
window.addEventListener("mousemove", (e) => {
  if (!resizing) return;
  const contentRect = document.querySelector(".content").getBoundingClientRect();
  let newWidth = contentRect.right - e.clientX;
  newWidth = Math.max(200, Math.min(900, newWidth));
  graphPaneEl.style.width = `${newWidth}px`;
});
window.addEventListener("mouseup", () => {
  if (!resizing) return;
  resizing = false;
  resizeHandle.classList.remove("dragging");
  document.body.style.userSelect = "";
  saveGraphWidth(parseInt(graphPaneEl.style.width, 10));
});

/* ---- Album art with fallback ---- */
function handleArtError(img){
  const span = document.createElement("span");
  span.className = "art art-fallback";
  span.style.background = img.dataset.color;
  span.textContent = img.dataset.fallback;
  img.replaceWith(span);
}
window.handleArtError = handleArtError;

function artHtml(song, className){
  const meta = groupMeta[song.group];
  const letter = song.title.charAt(0).toUpperCase();
  if (song.art) {
    return `<img class="${className}" src="${song.art}" alt="${song.album} cover"
      data-fallback="${letter}" data-color="${meta.color}" onerror="handleArtError(this)">`;
  }
  return `<span class="${className} art-fallback" style="background:${meta.color}">${letter}</span>`;
}

function getMainGenres(song){
  const mapped = song.genres
    .map(g => GENRE_MAP[g.toLowerCase()])
    .filter(Boolean);
  const unique = [...new Set(mapped)];
  return unique.length ? unique.slice(0, 3) : ["Interlude/Other"];
}

/* ================================================================
   SIMILARITY SCORING
   ================================================================ */

function genreSimilarity(a, b){
  const ag = getMainGenres(a);
  const bg = getMainGenres(b);
  const shared = ag.filter(g => bg.includes(g)).length;
  if (shared === 0) return 0;
  const union = new Set([...ag, ...bg]).size;
  return shared / union;
}

function bpmSimilarity(a, b){
  if (a.bpm == null || b.bpm == null) return 0.5;
  const diff = Math.abs(a.bpm - b.bpm);
  return Math.max(0, 1 - diff / 40);
}

function styleSimilarity(a, b){
  const as = a.style || [];
  const bs = b.style || [];
  if (!as.length || !bs.length) return null;
  const shared = as.filter(s => bs.includes(s)).length;
  const union = new Set([...as, ...bs]).size;
  return union ? shared / union : 0;
}

/* ---- Acoustic (librosa-derived) similarity ----
   Raw feature values live on very different scales (spectral_centroid/
   spectral_rolloff are in the thousands, zero_crossing_rate/rms_energy
   are 0-1), so we normalize each feature to 0-1 across the whole catalog
   BEFORE computing distance. computeAcousticRanges() must run once,
   after songs load, before any similarity scores are computed. */
const ACOUSTIC_KEYS = ['spectral_centroid', 'spectral_rolloff', 'zero_crossing_rate', 'rms_energy', 'spectral_contrast'];
let acousticRanges = {};

function computeAcousticRanges(allSongs){
  ACOUSTIC_KEYS.forEach(key => {
    const values = allSongs
      .filter(s => s.acoustic && s.acoustic[key] != null)
      .map(s => s.acoustic[key]);
    if (values.length) {
      acousticRanges[key] = { min: Math.min(...values), max: Math.max(...values) };
    }
  });
}

function normalizedAcoustic(song, key){
  const range = acousticRanges[key];
  if (!range || range.max === range.min) return 0.5;
  return (song.acoustic[key] - range.min) / (range.max - range.min);
}

function acousticSimilarity(a, b){
  if (!a.acoustic || !b.acoustic) return null;
  const dist = Math.sqrt(
    ACOUSTIC_KEYS.reduce((sum, key) => {
      const diff = normalizedAcoustic(a, key) - normalizedAcoustic(b, key);
      return sum + diff * diff;
    }, 0)
  );
  return Math.max(0, 1 - dist / Math.sqrt(ACOUSTIC_KEYS.length));
}

/* ---- Hand-tagged texture similarity (fallback for songs with no
   acoustic data — e.g. tracks with no streaming preview available) ---- */
function textureSimilarity(a, b){
  const at = a.texture || [];
  const bt = b.texture || [];
  if (!at.length || !bt.length) return null;
  const shared = at.filter(t => bt.includes(t)).length;
  const union = new Set([...at, ...bt]).size;
  return union ? shared / union : 0;
}

/* ---- Combined "how it sounds" score: prefer measured acoustic data,
   fall back to hand-tagged texture when acoustic is missing on either side ---- */
function soundSimilarity(a, b){
  const acoustic = acousticSimilarity(a, b);
  if (acoustic !== null) return acoustic;
  return textureSimilarity(a, b);
}

function similarityScore(a, b){
  const gScore = genreSimilarity(a, b);
  const bScore = bpmSimilarity(a, b);
  const sScore = styleSimilarity(a, b);
  const soundScore = soundSimilarity(a, b);

  const weights = { genre: 0.30, style: 0.20, bpm: 0.20, sound: 0.30 };
  const parts = [
    [gScore, weights.genre],
    [bScore, weights.bpm],
  ];
  if (sScore !== null) parts.push([sScore, weights.style]);
  if (soundScore !== null) parts.push([soundScore, weights.sound]);

  const totalWeight = parts.reduce((sum, [, w]) => sum + w, 0);
  return parts.reduce((sum, [s, w]) => sum + s * w, 0) / totalWeight;
}

const MIN_REC_SCORE = 0.75;

function computeRecommendations(allSongs){
  allSongs.forEach(song => {
    const ranked = allSongs
      .filter(other => other.id !== song.id)
      .map(other => ({ id: other.id, score: similarityScore(song, other) }))
      .sort((a, b) => b.score - a.score);

    song.recs = ranked.filter(r => r.score >= MIN_REC_SCORE).slice(0, 3).map(r => r.id);
    song.graphRecs = ranked.filter(r => r.score >= MIN_REC_SCORE).slice(0, 5).map(r => r.id);
  });
}

function auditRecCoverage(allSongs){
  const empty = allSongs.filter(s => s.recs.length === 0);
  console.log(`${empty.length} of ${allSongs.length} songs have zero recs at threshold ${MIN_REC_SCORE}`);
  empty.forEach(s => {
    console.log(`  ${s.title} — genres: ${JSON.stringify(getMainGenres(s))}, bpm: ${s.bpm}`);
  });
  return empty;
}

/* ---- Sidebar: groups (multi-select) ---- */
function renderGroupNav(){
  groupNavEl.innerHTML = Object.entries(groupMeta).map(([key, g]) => {
    const isActive = selectedGroups.has(key) ? "active" : "";
    return `<button class="sidenav-item ${isActive}" data-group="${key}" aria-pressed="${selectedGroups.has(key)}">
      <i class="icon" style="color:${g.color}">●</i> ${g.name}
    </button>`;
  }).join("");

  groupNavEl.querySelectorAll("[data-group]").forEach(el => {
    el.addEventListener("click", () => {
      const key = el.getAttribute("data-group");
      if (selectedGroups.has(key)) selectedGroups.delete(key); else selectedGroups.add(key);
      renderGroupNav();
      renderNavStates();
      renderTable();
      closeSidebarIfMobile();
    });
  });
}

/* ---- Sidebar: genre buckets (multi-select) ---- */
function renderGenreNav(){
  const visibleBuckets = GENRE_BUCKETS.filter(g => g !== "Interlude/Other");
  genreNavEl.innerHTML = visibleBuckets.map(genre => {
    const isActive = selectedGenres.has(genre) ? "active" : "";
    return `<button class="sidenav-item ${isActive}" data-genre="${genre}" aria-pressed="${selectedGenres.has(genre)}">
      <i class="icon">◆</i> ${bucketDisplayName(genre)}
    </button>`;
  }).join("");

  genreNavEl.querySelectorAll("[data-genre]").forEach(el => {
    el.addEventListener("click", () => {
      const genre = el.getAttribute("data-genre");
      if (selectedGenres.has(genre)) selectedGenres.delete(genre); else selectedGenres.add(genre);
      renderGenreNav();
      renderNavStates();
      renderTable();
      closeSidebarIfMobile();
      updateScrollFade(genreNavEl);
    });
  });
}

function renderNavStates(){
  const nothingFiltered = selectedGroups.size === 0 && selectedGenres.size === 0 && !favoritesOnly && !ostOnly && !currentFilter;
  navAllEl.classList.toggle("active", nothingFiltered);
  navFavoritesEl.classList.toggle("active", favoritesOnly);
  navFavoritesEl.setAttribute("aria-pressed", favoritesOnly);
  navOSTEl.classList.toggle("active", ostOnly);
  navOSTEl.setAttribute("aria-pressed", ostOnly);
}

/* ---- Graph: ego network around the expanded song ---- */
function egoLayout(centerId){
  const center = byId[centerId];
  const recs = (center.graphRecs || []).map(id => byId[id]).filter(Boolean);
  const cx = 140, cy = 140, radius = 95;
  const positions = { [centerId]: { x: cx, y: cy } };
  recs.forEach((r, i) => {
    const angle = (i / Math.max(recs.length, 1)) * Math.PI * 2 - Math.PI / 2;
    positions[r.id] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
  return { center, recs, positions };
}

function truncateLabel(title, maxLength = 16){
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength - 1).trim() + "…";
}

function renderGraph(){
  if (!expandedId || !byId[expandedId]) {
    svg.innerHTML = "";
    graphEmptyEl.classList.remove("hidden");
    return;
  }
  graphEmptyEl.classList.add("hidden");

  const { center, recs, positions } = egoLayout(expandedId);
  const nodes = [center, ...recs];

  const edges = recs.map(r =>
    `<line class="edge" x1="${positions[center.id].x}" y1="${positions[center.id].y}" x2="${positions[r.id].x}" y2="${positions[r.id].y}"></line>`
  ).join("");

  const nodeMarkup = nodes.map(s => {
    const color = groupMeta[s.group].color;
    const isActive = s.id === expandedId ? "active" : "";
    const isFav = favorites.has(s.id) ? "favorited" : "";
    const pos = positions[s.id];
    return `<g class="node ${isActive} ${isFav}" data-id="${s.id}" transform="translate(${pos.x},${pos.y})">
      <circle class="ring" r="15"></circle>
      <circle class="base" r="9" fill="${color}"></circle>
      <text x="14" y="5"><title>${s.title}</title>${truncateLabel(s.title)}</text>
    </g>`;
  }).join("");

  svg.innerHTML = edges + nodeMarkup;
  svg.querySelectorAll(".node").forEach(el => {
    el.addEventListener("click", () => selectAndExpand(el.getAttribute("data-id")));
  });
}

/* ---- YouTube embed ---- */
function extractYoutubeId(url){
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]+)/,
    /youtu\.be\/([\w-]+)/,
    /youtube\.com\/embed\/([\w-]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
function buildVideoEmbed(links){
  const videoId = extractYoutubeId(links.youtube);
  if (!videoId) return "";
  return `
    <div class="song-card-video">
      <iframe
        src="https://www.youtube.com/embed/${videoId}"
        title="Music video"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen>
      </iframe>
    </div>
  `;
}

/* ---- Song card ---- */
function renderSongCard(){
  if (!expandedId || !byId[expandedId]) {
    songCardEl.innerHTML = `<p class="song-card-empty">Select a song to see details</p>`;
    return;
  }
  const s = byId[expandedId];

  songCardEl.innerHTML = `
    <div class="song-card-content">
      ${artHtml(s, "art")}
      <div class="song-card-info">
        <div class="song-card-title">${s.title}</div>
        <div class="song-card-meta">${displayArtist(s)} · ${s.album}</div>
        <div class="song-card-meta">${s.year ?? "—"} · ${s.duration}${s.bpm ? " · " + s.bpm + " BPM" : ""}</div>
        <div class="song-card-genres">
          ${s.isOST ? `<span class="ost-badge">OST</span>` : ""}
          ${s.genres.map(g => `<span class="genre-tag">${g}</span>`).join("")}
        </div>
      </div>
    </div>
    <div class="song-card-links">
      ${buildLinksContent(s.links || {})}
    </div>
    ${buildVideoEmbed(s.links || {})}
  `;
}

/* ---- Listen/watch links ---- */
function buildLinksContent(links){
  const listenButtons = listenPlatforms
    .filter(p => links[p.key])
    .map(p => `<a class="listen-link" href="${links[p.key]}" target="_blank" rel="noopener noreferrer">${p.label}</a>`)
    .join("");
  const watchButtons = watchPlatforms
    .filter(p => links[p.key])
    .map(p => `<a class="listen-link" href="${links[p.key]}" target="_blank" rel="noopener noreferrer">${p.label}</a>`)
    .join("");

  if (!listenButtons && !watchButtons) return "";

  return `
    ${listenButtons ? `<div class="link-group"><span class="listen-label">Listen here:</span>${listenButtons}</div>` : ""}
    ${watchButtons ? `<div class="link-group"><span class="listen-label">Watch here:</span>${watchButtons}</div>` : ""}
  `;
}

/* ---- Song-card recs grid (currently unused — removed from renderSongCard,
   kept here in case you bring it back) ---- */
function songCardRecsHtml(song){
  const recs = (song.recs || []).map(id => byId[id]).filter(Boolean);
  if (!recs.length) return "";
  return `
    <div class="song-card-recs">
      <p class="recs-label">Recommended Songs—</p>
      <div class="song-card-recs-grid">
        ${recs.map(r => {
          const crossGroup = r.group !== song.group;
          return `<button class="song-card-rec-item" data-id="${r.id}">
            ${artHtml(r, "art")}
            <div class="song-card-rec-title">${r.title}</div>
            <div class="song-card-rec-sub">${displayArtist(r)}${crossGroup ? " · new to you" : ""}</div>
          </button>`;
        }).join("")}
      </div>
    </div>
  `;
}

/* ---- "If you liked this, try" recs (accordion) ---- */
function recsHtml(song){
  const recs = (song.recs || []).map(id => byId[id]).filter(Boolean);
  if (!recs.length) return `<p class="no-recs">No strong matches yet</p>`; // was: return "";
  return `
    <div class="recs-label">Recommended Songs —</div>
    <div class="recs-grid">
      ${recs.map(r => {
        const crossGroup = r.group !== song.group;
        const accent = groupMeta[r.group].color;
        return `<button class="rec-item" data-id="${r.id}" style="--rec-accent:${accent}">
          ${artHtml(r, "art")}
          <div class="rec-title">${r.title}</div>
          <div class="rec-sub">${displayArtist(r)}${crossGroup ? " · new to you" : ""} · ${r.bpm} bpm</div>
        </button>`;
      }).join("")}
    </div>
  `;
}

/* ---- Scroll ---- */
function updateScrollFade(navEl){
  const wrap = navEl.closest(".sidenav-scroll-wrap");
  if (!wrap) return;
  const atBottom = navEl.scrollHeight - navEl.scrollTop <= navEl.clientHeight + 2;
  wrap.classList.toggle("scrolled-to-end", atBottom);
}

function attachScrollFadeListener(navEl){
  navEl.addEventListener("scroll", () => updateScrollFade(navEl));
}

/* ---- Combined filtering: search + groups + genres + favorites ---- */
function matchesFilters(s){
  const q = currentFilter.toLowerCase();
  const artistText = (s.artist || groupMeta[s.group].name).toLowerCase();
  const matchesSearch = !q || s.title.toLowerCase().includes(q) || artistText.includes(q);
  const matchesGroup = selectedGroups.size === 0 || selectedGroups.has(s.group);
  const matchesGenre = selectedGenres.size === 0 || getMainGenres(s).some(g => selectedGenres.has(g));
  const matchesFav = !favoritesOnly || favorites.has(s.id);
  const matchesOST = !ostOnly || s.isOST === true;
  return matchesSearch && matchesGroup && matchesGenre && matchesFav && matchesOST;
}

/* ---- Main table ---- */
function renderTable(){
  const filtered = songs.filter(matchesFilters);

  listEl.innerHTML = filtered.map((s, i) => {
    const isFav = favorites.has(s.id);
    const isExpanded = s.id === expandedId;
    const panelId = `recs-${s.id}`;

    return `<div class="track ${isExpanded ? 'expanded' : ''}">
      <div class="row">
        <button class="heart ${isFav ? 'filled' : ''}" data-heart="${s.id}"
          aria-pressed="${isFav}" aria-label="${isFav ? 'Remove' : 'Add'} ${s.title} ${isFav ? 'from' : 'to'} favorites">
          ${isFav ? '♥' : '♡'}
        </button>
        <button class="track-row" data-id="${s.id}" aria-expanded="${isExpanded}" aria-controls="${panelId}">
          <div class="col-index">${i + 1}</div>
          ${artHtml(s, "art")}
          <div class="track-info">
            <div class="title">${s.title}</div>
            <div class="subrow">
              <span class="group-name">${displayArtist(s)}</span>
              <span class="meta">
                ${s.isOST ? `<span class="ost-badge">OST</span>` : ""}
                ${s.genres.map(g => `<span class="genre-tag">${g}</span>`).join("")}
              </span>
            </div>
          </div>
          <div class="col-album">${s.album}</div>
          <div class="col-year">${s.year ?? "—"}</div>
          <div class="col-duration">${s.duration}</div>
          <div class="col-bpm">${s.bpm ?? "—"}</div>
          <div class="chevron">&#9656;</div>
        </button>
      </div>
      ${isExpanded ? `
        <div id="${panelId}">
          <div class="track-links">
            ${buildLinksContent(s.links || {})}
          </div>
          <div class="track-recs">
            ${recsHtml(s)}
          </div>
        </div>
      ` : ""}
    </div>`;
  }).join("");

  listEl.querySelectorAll(".track-row").forEach(el => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-id");
      if (id === expandedId) {
        collapseAll();
      } else {
        selectAndExpand(id);
      }
    });
  });
  listEl.querySelectorAll("[data-heart]").forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = el.getAttribute("data-heart");
      if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
      saveFavorites();
      renderTable();
      renderGraph();
    });
  });
  listEl.querySelectorAll(".rec-item").forEach(el => {
    el.addEventListener("click", () => selectAndExpand(el.getAttribute("data-id")));
  });
}

function selectAndExpand(id){
  expandedId = id;
  renderTable();
  renderGraph();
  renderSongCard();
  const row = listEl.querySelector(`[data-id="${id}"]`);
  if (row) row.scrollIntoView({ block: "start" });
}

function collapseAll(){
  expandedId = null;
  renderTable();
  renderGraph();
  renderSongCard();
}

navAllEl.addEventListener("click", () => {
  selectedGroups.clear();
  selectedGenres.clear();
  favoritesOnly = false;
  ostOnly = false;
  searchEl.value = "";
  currentFilter = "";
  renderGroupNav();
  renderGenreNav();
  renderNavStates();
  renderTable();
  closeSidebarIfMobile();
  updateScrollFade(groupNavEl);
  updateScrollFade(genreNavEl);
});

navFavoritesEl.addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  renderNavStates();
  renderTable();
  closeSidebarIfMobile();
});

navOSTEl.addEventListener("click", () => {
  ostOnly = !ostOnly;
  renderNavStates();
  renderTable();
  closeSidebarIfMobile();
});

searchEl.addEventListener("input", () => {
  currentFilter = searchEl.value;
  renderNavStates();
  renderTable();
});

async function loadAllSources(){
  const results = await Promise.all(
    DATA_SOURCES.map(async (source) => {
      const res = await fetch(source.file);
      const data = await res.json();
      return data.map((song, i) => ({
        ...song,
        id: `${source.group}-${i}`,
        group: source.group
      }));
    })
  );
  return results.flat();
}

async function init(){
  renderGroupNav();
  renderGenreNav();
  attachScrollFadeListener(groupNavEl);
  attachScrollFadeListener(genreNavEl);
  updateScrollFade(groupNavEl);
  updateScrollFade(genreNavEl);
  try {
    songs = await loadAllSources();
    songs.sort((a, b) => (b.year ?? -Infinity) - (a.year ?? -Infinity));
    byId = Object.fromEntries(songs.map(s => [s.id, s]));
    computeAcousticRanges(songs);
    computeRecommendations(songs);
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      window.songs = songs;
      window.similarityScore = similarityScore;
      window.genreSimilarity = genreSimilarity;
      window.styleSimilarity = styleSimilarity;
      window.bpmSimilarity = bpmSimilarity;
      window.soundSimilarity = soundSimilarity;
    }
    auditRecCoverage(songs);

    const params = new URLSearchParams(window.location.search);
    const songParam = params.get("song");
    const qParam = params.get("q");
    const genreParam = params.get("genre");
    const groupsParam = params.get("groups");

    if (genreParam) selectedGenres.add(genreParam);
    if (groupsParam) groupsParam.split(",").forEach(g => selectedGroups.add(g));

    const viewParam = params.get("view");
    if (viewParam === "favorites") favoritesOnly = true;
    if (viewParam === "ost") ostOnly = true;

    if (songParam && byId[songParam]){
      selectAndExpand(songParam);
    } else if (qParam){
      searchEl.value = qParam;
      currentFilter = qParam;
    }

    renderGroupNav();
    renderGenreNav();
    renderNavStates();
    renderTable();
    renderGraph();
    renderSongCard();
  } catch (err) {
    console.error("Could not load song data", err);
    listEl.innerHTML = `<div style="padding:16px; color:var(--muted); font-size:13px;">
      Couldn't load song data — run a local server (e.g. <code>python3 -m http.server</code>)
      since fetch() needs http:// not file://.
    </div>`;
  }
}
init();
