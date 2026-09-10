const groupMeta = {
  skz: { name: "Stray Kids", color: "#5EEAD4" },
  bts: { name: "BTS", color: "#A78BFA" },
  ateez: { name: "Ateez", color: "#FB923C" }
};

const RECENT_KEY = "discograph_recent";

const hero = document.getElementById("hero");
const searchMode = document.getElementById("searchMode");
const heroSearch = document.getElementById("heroSearch");
const heroForm = document.getElementById("heroForm");
const modeSearch = document.getElementById("modeSearch");
const modeForm = document.getElementById("modeForm");
const closeSearch = document.getElementById("closeSearch");
const recentList = document.getElementById("recentList");
const mixGrid = document.getElementById("mixGrid");

let songs = [];

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
      window.location.href = `explore.html?song=${el.getAttribute("data-id")}`;
    });
  });
}

function renderMixes(){
  const mixes = [
    { id: "mix1", label: "EDM crossover<br>Stray Kids × BTS", classes: "mix1" },
    { id: "mix2", label: "Late-night ballads<br>BTS × Ateez", classes: "mix2" },
    { id: "mix3", label: "High-BPM chaos<br>Ateez × Stray Kids", classes: "mix3" },
    { id: "mix4", label: "Hip-hop bridge<br>Stray Kids × Ateez", classes: "mix4" }
  ];
  mixGrid.innerHTML = mixes.map(m =>
    `<button class="mixtile ${m.classes}" data-mix="${m.id}"><span>${m.label}</span></button>`
  ).join("");

  mixGrid.querySelectorAll(".mixtile").forEach(el => {
    el.addEventListener("click", () => {
      window.location.href = `explore.html?mix=${el.getAttribute("data-mix")}`;
    });
  });
}

function openSearchMode(){
  hero.classList.add("hidden");
  searchMode.classList.add("active");
  modeSearch.value = heroSearch.value;
  modeSearch.focus();
}

function closeSearchMode(){
  searchMode.classList.remove("active");
  hero.classList.remove("hidden");
  heroSearch.value = "";
  modeSearch.value = "";
}

function handleSubmit(value){
  const query = value.trim();
  if (!query) return;

  const match = songs.find(s => s.title.toLowerCase().includes(query.toLowerCase()));
  if (match){
    pushRecent(match.id);
    window.location.href = `explore.html?song=${match.id}`;
  } else {
    window.location.href = `explore.html?q=${encodeURIComponent(query)}`;
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

async function init(){
  renderMixes();
  try {
    const res = await fetch("data/songs.json");
    songs = await res.json();
  } catch (err) {
    console.error("Could not load song data for search matching", err);
  }
  renderRecent();
}

init();
