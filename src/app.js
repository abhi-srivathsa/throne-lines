import { BOOKS, EXTRA_LINKS, HOUSES, MEDIA, PEOPLE, THRONE } from "./data.js";
import { PORTRAITS } from "./portraits.js";

const svg = document.querySelector("#familyGraph");
const detail = document.querySelector("#personDetail");
const tracePath = document.querySelector("#tracePath");
const searchInput = document.querySelector("#searchInput");
const searchResults = document.querySelector("#searchResults");
const mediaFilter = document.querySelector("#mediaFilter");
const houseFilter = document.querySelector("#houseFilter");
const traceFrom = document.querySelector("#traceFrom");
const traceTo = document.querySelector("#traceTo");
const timeline = document.querySelector("#throneTimeline");
const bookGrid = document.querySelector("#bookGrid");
const legend = document.querySelector("#legend");
const audioToggle = document.querySelector("#audioToggle");

const byId = new Map(PEOPLE.map((person) => [person.id, person]));
const houseById = new Map(HOUSES.map((house) => [house.id, house]));
const bookById = new Map(BOOKS.map((book) => [book.id, book]));

const state = {
  selectedId: "rhaenyra",
  media: "all",
  house: "all",
  from: "daemon_t",
  to: "jon_snow",
  query: ""
};

const svgNS = "http://www.w3.org/2000/svg";

function init() {
  populateControls();
  renderCounts();
  renderLegend();
  renderBooks();
  bindEvents();
  render();
}

function populateControls() {
  MEDIA.forEach((item) => mediaFilter.append(new Option(item.label, item.id)));
  HOUSES.forEach((item) => houseFilter.append(new Option(item.label, item.id)));

  const sortedPeople = [...PEOPLE].sort((a, b) => a.name.localeCompare(b.name));
  sortedPeople.forEach((person) => {
    const label = `${person.name}${person.epithet ? `, ${person.epithet}` : ""}`;
    traceFrom.append(new Option(label, person.id));
    traceTo.append(new Option(label, person.id));
  });

  mediaFilter.value = state.media;
  houseFilter.value = state.house;
  traceFrom.value = state.from;
  traceTo.value = state.to;
}

function renderCounts() {
  document.querySelector("#personCount").textContent = PEOPLE.length.toString();
  document.querySelector("#throneCount").textContent = THRONE.length.toString();
  document.querySelector("#bookCount").textContent = BOOKS.length.toString();
}

function bindEvents() {
  mediaFilter.addEventListener("change", () => {
    state.media = mediaFilter.value;
    render();
  });

  houseFilter.addEventListener("change", () => {
    state.house = houseFilter.value;
    render();
  });

  traceFrom.addEventListener("change", () => {
    state.from = traceFrom.value;
    render();
  });

  traceTo.addEventListener("change", () => {
    state.to = traceTo.value;
    render();
  });

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value.trim();
    renderSearch();
  });

  audioToggle.addEventListener("click", toggleAudio);
}

function render() {
  renderGraph();
  renderDetail();
  renderTrace();
  renderThrone();
  renderSearch();
  attachPortraitFallbacks();
}

function renderLegend() {
  const visibleHouses = HOUSES.filter((house) => house.id !== "all");
  legend.replaceChildren(
    ...visibleHouses.map((house) => {
      const item = document.createElement("span");
      item.innerHTML = `<i style="background:${house.color}"></i>${house.label}`;
      return item;
    })
  );
}

function mediaMatches(person) {
  return state.media === "all" || person.media.includes(state.media);
}

function houseMatches(person) {
  return state.house === "all" || person.house === state.house;
}

function isFocused(person) {
  return mediaMatches(person) && houseMatches(person);
}

function relationEdges() {
  const edges = [];
  const seenMarriage = new Set();

  PEOPLE.forEach((person) => {
    (person.parents || []).forEach((parentId) => {
      if (byId.has(parentId)) {
        edges.push({ source: parentId, target: person.id, type: "blood", label: "parent" });
      }
    });

    (person.legalParents || []).forEach((parentId) => {
      if (byId.has(parentId)) {
        edges.push({ source: parentId, target: person.id, type: "legal", label: "legal parent" });
      }
    });

    (person.spouses || []).forEach((spouseId) => {
      const key = [person.id, spouseId].sort().join(":");
      if (!seenMarriage.has(key) && byId.has(spouseId)) {
        seenMarriage.add(key);
        edges.push({ source: person.id, target: spouseId, type: "marriage", label: "marriage" });
      }
    });
  });

  EXTRA_LINKS.forEach((edge) => {
    if (byId.has(edge.source) && byId.has(edge.target)) edges.push(edge);
  });

  return edges;
}

function findPath(startId, endId) {
  if (startId === endId) return [startId];

  const adjacency = new Map();
  PEOPLE.forEach((person) => adjacency.set(person.id, []));

  relationEdges().forEach((edge) => {
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  });

  const queue = [startId];
  const previous = new Map([[startId, null]]);

  while (queue.length) {
    const current = queue.shift();
    for (const next of adjacency.get(current) || []) {
      if (previous.has(next)) continue;
      previous.set(next, current);
      if (next === endId) {
        const path = [endId];
        let step = current;
        while (step) {
          path.unshift(step);
          step = previous.get(step);
        }
        return path;
      }
      queue.push(next);
    }
  }

  return [];
}

function renderGraph() {
  svg.replaceChildren();
  svg.setAttribute("viewBox", "0 0 1720 1925");

  const defs = node("defs");
  defs.innerHTML = `
    <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="5" result="blur"></feGaussianBlur>
      <feMerge>
        <feMergeNode in="blur"></feMergeNode>
        <feMergeNode in="SourceGraphic"></feMergeNode>
      </feMerge>
    </filter>
    <linearGradient id="bloodLine" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#bfa76d"></stop>
      <stop offset="1" stop-color="#7d2c36"></stop>
    </linearGradient>
  `;
  svg.append(defs);

  const pathIds = new Set(findPath(state.from, state.to));
  const edgeLayer = node("g", { class: "edges" });
  const nodeLayer = node("g", { class: "nodes" });

  relationEdges().forEach((edge) => {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    const inPath = pathIds.has(edge.source) && pathIds.has(edge.target);
    const visible = (isFocused(source) || isFocused(target)) && (mediaMatches(source) || mediaMatches(target));

    const line = node("path", {
      class: `edge ${edge.type}${inPath ? " edge-path" : ""}${visible ? "" : " is-muted"}`,
      d: curvedPath(source, target, edge.type)
    });
    edgeLayer.append(line);
  });

  PEOPLE.forEach((person) => {
    const active = person.id === state.selectedId;
    const onPath = pathIds.has(person.id);
    const focus = isFocused(person);
    const house = houseById.get(person.house) || houseById.get("other");

    const group = node("g", {
      class: `person-node${active ? " is-active" : ""}${onPath ? " is-path" : ""}${focus ? "" : " is-dim"}`,
      transform: `translate(${person.x} ${person.y})`,
      role: "button",
      tabindex: "0",
      "data-id": person.id,
      "aria-label": person.name
    });

    const portrait = portraitFor(person);
    const width = 174;
    const height = 58;
    group.append(
      node("rect", {
        x: -width / 2,
        y: -height / 2,
        width,
        height,
        rx: 6,
        fill: "rgba(10, 12, 13, 0.84)",
        stroke: house.color
      })
    );
    group.append(
      node("image", {
        x: -width / 2 + 8,
        y: -height / 2 + 8,
        width: 42,
        height: 42,
        href: portrait.fallback,
        preserveAspectRatio: "xMidYMid slice"
      })
    );
    group.append(
      node("rect", {
        x: -width / 2 + 8,
        y: -height / 2 + 8,
        width: 42,
        height: 42,
        fill: "none",
        stroke: house.color
      })
    );
    group.append(
      textNode(person.name, {
        x: 24,
        y: -3,
        class: "node-name"
      })
    );
    group.append(
      textNode(person.epithet || house.label, {
        x: 24,
        y: 15,
        class: "node-meta"
      })
    );

    group.addEventListener("click", () => selectPerson(person.id));
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectPerson(person.id);
      }
    });

    nodeLayer.append(group);
  });

  svg.append(edgeLayer, nodeLayer);
}

function curvedPath(source, target, type) {
  const sx = source.x;
  const sy = source.y;
  const tx = target.x;
  const ty = target.y;
  if (type === "marriage" || type === "sworn") {
    return `M ${sx} ${sy} C ${(sx + tx) / 2} ${sy - 28}, ${(sx + tx) / 2} ${ty - 28}, ${tx} ${ty}`;
  }
  const midY = (sy + ty) / 2;
  return `M ${sx} ${sy + 24} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty - 24}`;
}

function renderDetail() {
  const person = byId.get(state.selectedId);
  if (!person) return;
  const parents = labelList(person.parents);
  const legalParents = labelList(person.legalParents);
  const spouses = labelList(person.spouses);
  const children = PEOPLE.filter((entry) => (entry.parents || []).includes(person.id));
  const house = houseById.get(person.house) || houseById.get("other");
  const bookLabels = (person.books || []).map((id) => bookById.get(id)?.title).filter(Boolean);
  const portrait = portraitFor(person);
  const sourceLink = portrait.sourceUrl
    ? `<a href="${portrait.sourceUrl}" target="_blank" rel="noreferrer">${portrait.sourceName}</a>`
    : portrait.sourceName;

  detail.innerHTML = `
    <div class="detail-portrait" style="--house-color:${house.color}">
      <img src="${portrait.image}" alt="${person.name} portrait" data-fallback="${portrait.fallback}" />
      <div class="portrait-source ${portrait.sourceType}">
        <span>${sourceTypeLabel(portrait.sourceType)}</span>
        <small>${portrait.sourceLabel}</small>
      </div>
    </div>
    <div class="detail-header">
      <span class="house-dot" style="background:${house.color}"></span>
      <p class="eyebrow">${house.label}</p>
      <h2>${person.name}</h2>
      ${person.epithet ? `<p class="subtitle">${person.epithet}</p>` : ""}
    </div>
    <p class="detail-note">${person.note}</p>
    <dl class="fact-list">
      ${parents ? `<dt>Blood parents</dt><dd>${parents}</dd>` : ""}
      ${legalParents ? `<dt>Legal parentage</dt><dd>${legalParents}</dd>` : ""}
      ${spouses ? `<dt>Marriage</dt><dd>${spouses}</dd>` : ""}
      ${children.length ? `<dt>Children</dt><dd>${children.map((child) => child.name).join(", ")}</dd>` : ""}
      <dt>Appears in</dt><dd>${person.media.map(mediaLabel).join(", ")}</dd>
      ${bookLabels.length ? `<dt>Books</dt><dd>${bookLabels.join(", ")}</dd>` : ""}
      <dt>Portrait</dt><dd>${sourceLink}</dd>
      <dt>Traits</dt><dd>${portrait.generatedTraits}</dd>
    </dl>
  `;
}

function renderTrace() {
  const path = findPath(state.from, state.to);
  tracePath.replaceChildren();

  if (!path.length) {
    const item = document.createElement("li");
    item.textContent = "No recorded connection in this dataset.";
    tracePath.append(item);
    return;
  }

  path.forEach((id) => {
    const person = byId.get(id);
    const item = document.createElement("li");
    item.textContent = person.name;
    if (id === state.selectedId) item.classList.add("is-current");
    item.addEventListener("click", () => selectPerson(id));
    tracePath.append(item);
  });
}

function renderSearch() {
  const query = state.query.toLowerCase();
  searchResults.replaceChildren();
  if (!query) return;

  const matches = PEOPLE.filter((person) => {
    const house = houseById.get(person.house)?.label || "";
    const books = (person.books || []).map((id) => bookById.get(id)?.title || "").join(" ");
    return `${person.name} ${person.epithet || ""} ${house} ${books}`.toLowerCase().includes(query);
  }).slice(0, 8);

  if (!matches.length) {
    const empty = document.createElement("p");
    empty.textContent = "No results";
    searchResults.append(empty);
    return;
  }

  matches.forEach((person) => {
    const button = document.createElement("button");
    const house = houseById.get(person.house) || houseById.get("other");
    const portrait = portraitFor(person);
    button.type = "button";
    button.innerHTML = `
      <img src="${portrait.image}" alt="" data-fallback="${portrait.fallback}" />
      <i style="background:${house.color}"></i>
      <span>${person.name}</span>
      <small>${house.label}</small>
    `;
    button.addEventListener("click", () => {
      selectPerson(person.id);
      state.from = person.id;
      traceFrom.value = person.id;
      render();
    });
    searchResults.append(button);
  });
  attachPortraitFallbacks(searchResults);
}

function renderThrone() {
  timeline.replaceChildren();
  THRONE.forEach((entry, index) => {
    const person = byId.get(entry.id);
    const portrait = person ? portraitFor(person) : undefined;
    const card = document.createElement("button");
    card.type = "button";
    card.className = `throne-card ${entry.status}`;
    if (entry.id === state.selectedId) card.classList.add("is-active");
    card.innerHTML = `
      ${portrait ? `<img src="${portrait.image}" alt="" data-fallback="${portrait.fallback}" />` : ""}
      <span class="ordinal">${String(index + 1).padStart(2, "0")}</span>
      <strong>${entry.ruler}</strong>
      <span>${entry.years}</span>
      <small>${entry.note}</small>
    `;
    card.addEventListener("click", () => {
      if (byId.has(entry.id)) selectPerson(entry.id);
    });
    timeline.append(card);
  });
}

function renderBooks() {
  bookGrid.replaceChildren();
  BOOKS.forEach((book) => {
    const card = document.createElement("article");
    card.className = "book-card";
    card.innerHTML = `
      <span>${book.year}</span>
      <h3>${book.title}</h3>
      <p>${book.era}</p>
      <div>${book.media.map(mediaLabel).join(" / ")}</div>
    `;
    bookGrid.append(card);
  });
}

function selectPerson(id) {
  state.selectedId = id;
  render();
}

function labelList(ids = []) {
  return ids.map((id) => byId.get(id)?.name).filter(Boolean).join(", ");
}

function mediaLabel(id) {
  return MEDIA.find((item) => item.id === id)?.label || id;
}

function portraitFor(person) {
  return (
    PORTRAITS[person.id] || {
      image: "./assets/portraits/generated/aegon_i.svg",
      fallback: "./assets/portraits/generated/aegon_i.svg",
      sourceType: "generated",
      sourceLabel: "Local trait portrait",
      sourceName: "Original generated asset",
      sourceUrl: "",
      generatedTraits: person.note
    }
  );
}

function sourceTypeLabel(type) {
  if (type === "show") return "Show";
  if (type === "book-art") return "Book / Lore";
  return "Generated";
}

function attachPortraitFallbacks(root = document) {
  root.querySelectorAll("img[data-fallback]").forEach((image) => {
    image.addEventListener(
      "error",
      () => {
        if (image.src.endsWith(image.dataset.fallback)) return;
        image.src = image.dataset.fallback;
      },
      { once: true }
    );
  });
}

function node(name, attrs = {}) {
  const el = document.createElementNS(svgNS, name);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function textNode(content, attrs = {}) {
  const text = node("text", attrs);
  text.textContent = content;
  return text;
}

let audioState = {
  context: null,
  master: null,
  timers: [],
  oscillators: [],
  active: false
};

function toggleAudio() {
  if (audioState.active) {
    stopAudio();
  } else {
    startAudio();
  }
}

function startAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const context = new AudioContext();
  const master = context.createGain();
  const filter = context.createBiquadFilter();
  master.gain.value = 0.055;
  filter.type = "lowpass";
  filter.frequency.value = 860;
  master.connect(filter);
  filter.connect(context.destination);

  const droneNotes = [73.42, 110, 146.83];
  const oscillators = droneNotes.map((freq, index) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.frequency.value = freq;
    osc.type = index === 1 ? "triangle" : "sine";
    gain.gain.value = index === 1 ? 0.28 : 0.18;
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    return osc;
  });

  audioState = {
    context,
    master,
    timers: [],
    oscillators,
    active: true
  };

  const pulse = window.setInterval(() => playPluck(context, master), 2600);
  const swell = window.setInterval(() => {
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.08, now + 1.2);
    master.gain.linearRampToValueAtTime(0.045, now + 3.6);
  }, 7200);
  audioState.timers.push(pulse, swell);

  audioToggle.classList.add("is-on");
  audioToggle.setAttribute("aria-pressed", "true");
}

function playPluck(context, destination) {
  const notes = [220, 246.94, 293.66, 329.63, 392, 440];
  const freq = notes[Math.floor(Math.random() * notes.length)];
  const osc = context.createOscillator();
  const gain = context.createGain();
  const delay = context.createDelay();
  const feedback = context.createGain();

  osc.type = "triangle";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.13, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.6);

  delay.delayTime.value = 0.38;
  feedback.gain.value = 0.18;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(destination);

  osc.connect(gain);
  gain.connect(destination);
  gain.connect(delay);
  osc.start();
  osc.stop(context.currentTime + 1.7);
}

function stopAudio() {
  audioState.timers.forEach((timer) => window.clearInterval(timer));
  audioState.oscillators.forEach((osc) => osc.stop());
  audioState.context?.close();
  audioState = {
    context: null,
    master: null,
    timers: [],
    oscillators: [],
    active: false
  };
  audioToggle.classList.remove("is-on");
  audioToggle.setAttribute("aria-pressed", "false");
}

init();
