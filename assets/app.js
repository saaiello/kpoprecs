import { GENRE_MAP } from './genre-map.js';

const groupMeta = {
  skz: { name: "Stray Kids", color: "#5EEAD4" },
  bts: { name: "BTS", color: "#A78BFA" },
  ateez: { name: "Ateez", color: "#FB923C" }
};

const DATA_SOURCES = [
  { group: "skz", file: "data/songs.json" },
  { group: "bts", file: "data/bts.json" },
  { group: "ateez", file: "data/ateez.json" }
];

const GENRE_BUCKETS = [
  "Pop",
  "Dance-Pop",
  "House/Club EDM",
  "Electronic/Atmospheric",
  "Hip-Hop",
  "R&B/Soul",
  "Ballad",
  "Rock/Punk/Metal",
  "Acoustic/Lo-fi",
  "Afrobeat/Global",
  "Interlude/Other"
];

const FAVORITES_KEY = "discograph_favorites";
const GRAPH_WIDTH_KEY = "discograph_graph_width";

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
const resizeHandle = document.getElementById("resizeHandle");
const graphPaneEl = document.querySelector(".graphpane");

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
  return Math.max(0, 1 - diff / 100);
}
function similarityScore(a, b){
  const gScore = genreSimilarity(a, b);
  const bScore = bpmSimilarity(a, b);
  if (bScore === null) {
    return gScore * 0.6 + 0.5 * 0.4;
  }
  return gScore * 0.6 + bScore * 0.4;
}
function computeRecommendations(allSongs){
  allSongs.forEach(song => {
    const ranked = allSongs
      .filter(other => other.id !== song.id)
      .map(other => ({ id: other.id, score: similarityScore(song, other) }))
      .sort((a, b) => b.score - a.score);

    song.recs = ranked.slice(0, 3).map(r => r.id);
    song.graphRecs = ranked.slice(0, 5).map(r => r.id);
  });
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
    });
  });
}

/* ---- Sidebar: genre buckets (multi-select) ---- */
function renderGenreNav(){
  genreNavEl.innerHTML = GENRE_BUCKETS.map(genre => {
    const isActive = selectedGenres.has(genre) ? "active" : "";
    return `<button class="sidenav-item ${isActive}" data-genre="${genre}" aria-pressed="${selectedGenres.has(genre)}">
      <i class="icon">◆</i> ${genre}
    </button>`;
  }).join("");

  genreNavEl.querySelectorAll("[data-genre]").forEach(el => {
    el.addEventListener("click", () => {
      const genre = el.getAttribute("data-genre");
      if (selectedGenres.has(genre)) selectedGenres.delete(genre); else selectedGenres.add(genre);
      renderGenreNav();
      renderNavStates();
      renderTable();
    });
  });
}

function renderNavStates(){
  const nothingFiltered = selectedGroups.size === 0 && selectedGenres.size === 0 && !favoritesOnly && !currentFilter;
  navAllEl.classList.toggle("active", nothingFiltered);
  navFavoritesEl.classList.toggle("active", favoritesOnly);
  navFavoritesEl.setAttribute("aria-pressed", favoritesOnly);
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
      <p class="recs-label">If you liked this, try —</p>
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
  if (!recs.length) return "";
  return `
    <div class="recs-label">If you liked this, try —</div>
    ${recs.map(r => {
      const crossGroup = r.group !== song.group;
      return `<button class="rec-item" data-id="${r.id}">
        ${artHtml(r, "art")}
        <div>
          <div class="rname">${r.title}</div>
          <div class="rmeta">${displayArtist(r)}${crossGroup ? " · new to you" : ""} · ${r.bpm} bpm</div>
        </div>
      </button>`;
    }).join("")}
  `;
}

/* ---- Combined filtering: search + groups + genres + favorites ---- */
function matchesFilters(s){
  const q = currentFilter.toLowerCase();
  const artistText = (s.artist || groupMeta[s.group].name).toLowerCase();
  const matchesSearch = !q || s.title.toLowerCase().includes(q) || artistText.includes(q);
  const matchesGroup = selectedGroups.size === 0 || selectedGroups.has(s.group);
  const matchesGenre = selectedGenres.size === 0 || getMainGenres(s).some(g => selectedGenres.has(g));
  const matchesFav = !favoritesOnly || favorites.has(s.id);
  return matchesSearch && matchesGroup && matchesGenre && matchesFav;
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
              <span class="meta">${s.genres.map(g => `<span class="genre-tag">${g}</span>`).join("")}</span>
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
        <div class="track-recs" id="${panelId}">
          ${buildLinksContent(s.links || {})}
          ${recsHtml(s)}
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
  searchEl.value = "";
  currentFilter = "";
  renderGroupNav();
  renderGenreNav();
  renderNavStates();
  renderTable();
});

navFavoritesEl.addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  renderNavStates();
  renderTable();
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
  try {
    songs = await loadAllSources();
    songs.sort((a, b) => (b.year ?? -Infinity) - (a.year ?? -Infinity));
    byId = Object.fromEntries(songs.map(s => [s.id, s]));
    computeRecommendations(songs);

    const params = new URLSearchParams(window.location.search);
    const songParam = params.get("song");
    const qParam = params.get("q");

    if (songParam && byId[songParam]){
      selectAndExpand(songParam);
    } else if (qParam){
      searchEl.value = qParam;
      currentFilter = qParam;
    }

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