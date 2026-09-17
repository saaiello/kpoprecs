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
  "Pop", "Dance-Pop", "House/Club EDM", "Electronic/Atmospheric",
  "Hip-Hop", "R&B/Soul", "Ballad", "Rock/Punk/Metal",
  "Acoustic/Lo-fi", "Afrobeat/Global"
];
const BUCKET_DISPLAY_NAMES = {
  "House/Club EDM": "EDM",
  "Electronic/Atmospheric": "Chill Electronic",
  "Rock/Punk/Metal": "Rock",
  "Acoustic/Lo-fi": "Acoustic",
  "Afrobeat/Global": "Global Beats",
  "Dance-Pop": "Synth-Pop"
};
function bucketDisplayName(bucket){
  return BUCKET_DISPLAY_NAMES[bucket] || bucket;
}

const PLAYLISTS = [
  { title: "EDM Nights", sub: "House/Club EDM across every group", genre: "House/Club EDM" },
  { title: "Ballad Feels", sub: "Slow down with tracks from all five", genre: "Ballad" },
  { title: "Hip-Hop Heat", sub: "The heaviest beats, cross-group", genre: "Hip-Hop" },
  { title: "Chill Electronic", sub: "Atmospheric, not clubby", genre: "Electronic/Atmospheric" },
  { title: "Stray Kids Essentials", sub: "Just Stray Kids", groups: "skz" },
  { title: "EDM Crossover", sub: "Stray Kids × BTS, House/Club EDM", genre: "House/Club EDM", groups: "skz,bts" }
];

const RECENT_KEY = "discograph_recent";
const THEME_KEY = "discograph_theme";

const hero = document.getElementById("hero");
const searchMode = document.getElementById("searchMode");
const heroSearch = document.getElementById("heroSearch");
const heroForm = document.getElementById("heroForm");
const modeSearch = document.getElementById("modeSearch");
const modeForm = document.getElementById("modeForm");
const closeSearch = document.getElementById("closeSearch");
const recentList = document.getElementById("recentList");
const playlistGrid = document.getElementById("playlistGrid");
const groupNavEl = document.getElementById("groupNav");
const genreNavEl = document.getElementById("genreNav");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const sidebarCloseEl = document.getElementById("sidebarClose");
const sidebarEl = document.querySelector(".sidebar");
const playlistsSection = document.querySelector(".playlists");

let songs = [];

/* ---- Mobile sidebar ---- */
function openSidebar(){
  sidebarEl.classList.add("open");
  sidebarOverlay.classList.add("open");
}
function closeSidebar(){
  sidebarEl.classList.remove("open");
  sidebarOverlay.classList.remove("open");
}
mobileMenuBtn.addEventListener("click", openSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);
sidebarCloseEl.addEventListener("click", closeSidebar);

/* ---- Theme ---- */
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

/* ---- Sidebar: groups (link into Explore, filtered) ---- */
function renderGroupNav(){
  groupNavEl.innerHTML = Object.entries(groupMeta).map(([key, g]) =>
    `<a href="index.html?groups=${key}" class="sidenav-item">
      <i class="icon" style="color:${g.color}">●</i> ${g.name}
    </a>`
  ).join("");
}

/* ---- Sidebar: genres (link into Explore, filtered) ---- */
function renderGenreNav(){
  genreNavEl.innerHTML = GENRE_BUCKETS.map(genre =>
    `<a href="index.html?genre=${encodeURIComponent(genre)}" class="sidenav-item">
      <i class="icon">◆</i> ${bucketDisplayName(genre)}
    </a>`
  ).join("");
}

/* ---- Recent searches ---- */
function loadRecent(){
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Could not read recent searches", err);
    return [];
  }
}
function pushRecent(songId){
  let recent = loadRecent().filter(id => id !== songId);
  recent.unshift(songId);
  recent = recent.slice(0, 5);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch (err) {
    console.warn("Could not save recent searches", err);
  }
}
function renderRecent(){
  const recent = loadRecent()
    .map(id => songs.find(s => s.id === id))
    .filter(Boolean);

  if (recent.length === 0){
    recentList.innerHTML = `<p style="color:var(--muted); font-size:13px; padding:12px 14px;">
      Nothing searched yet — try a song title below.
    </p>`;
    return;
  }

  recentList.innerHTML = recent.map(s => {
    const meta = groupMeta[s.group];
    return `<button class="recent-item" data-id="${s.id}">
      <span class="rdot" style="background:${meta.color}"></span>
      <span>
        <div class="recent-title">${s.title}</div>
        <div class="recent-sub">${meta.name}</div>
      </span>
    </button>`;
  }).join("");

  recentList.querySelectorAll(".recent-item").forEach(el => {
    el.addEventListener("click", () => {
      window.location.href = `index.html?song=${el.getAttribute("data-id")}`;
    });
  });
}

/* ---- Playlists ---- */
function renderPlaylists(){
  playlistGrid.innerHTML = PLAYLISTS.map((p, i) => `
    <button class="playlist-tile" data-index="${i}">
      <div class="playlist-title">${p.title}</div>
      <div class="playlist-sub">${p.sub}</div>
    </button>
  `).join("");

  playlistGrid.querySelectorAll(".playlist-tile").forEach(el => {
    el.addEventListener("click", () => {
      const p = PLAYLISTS[el.getAttribute("data-index")];
      const params = new URLSearchParams();
      if (p.genre) params.set("genre", p.genre);
      if (p.groups) params.set("groups", p.groups);
      window.location.href = `index.html?${params.toString()}`;
    });
  });
}

/* ---- Search ---- */
function openSearchMode(){
  hero.classList.add("hidden");
  playlistsSection.classList.add("hidden");
  searchMode.classList.add("active");
  modeSearch.value = heroSearch.value;
  modeSearch.focus();
  document.querySelector(".content").scrollTop = 0;
}
function closeSearchMode(){
  searchMode.classList.remove("active");
  hero.classList.remove("hidden");
  playlistsSection.classList.remove("hidden");
  heroSearch.value = "";
  modeSearch.value = "";
}

function handleSubmit(value){
  const query = value.trim();
  if (!query) return;

  const match = songs.find(s => s.title.toLowerCase().includes(query.toLowerCase()));
  if (match){
    pushRecent(match.id);
    window.location.href = `index.html?song=${match.id}`;
  } else {
    window.location.href = `index.html?q=${encodeURIComponent(query)}`;
  }
}
heroSearch.addEventListener("focus", openSearchMode);
closeSearch.addEventListener("click", closeSearchMode);
heroForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleSubmit(heroSearch.value);
});
modeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleSubmit(modeSearch.value);
});

/* ---- Data loading ---- */
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
  renderPlaylists();
  try {
    songs = await loadAllSources();
  } catch (err) {
    console.error("Could not load song data for search matching", err);
  }
  renderRecent();
}

init();