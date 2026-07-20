// Une échelle de temps — frise horizontale du présent au Big Bang.
// Repris du prototype d'origine (script.js), porté en TypeScript et
// habillé façon carnet de croquis : graduations, fond qui change d'ère,
// navigation clavier, et un petit prince qui marche sur la ligne.

import { REPERES } from "./data";
import { yearsAgoToPosition, MAX_YEARS_AGO } from "./mapping";

// Miniatures : un emoji net par repère (les SVG du prototype étaient incomplets).
const EMOJI: Record<string, string> = {
  "big-bang": "💥",
  "formation-voie-lactee": "🌌",
  "formation-systeme-solaire": "☀️",
  "formation-terre": "🌍",
  "formation-lune": "🌕",
  "apparition-eau-liquide": "🌊",
  "premiere-vie": "🦠",
  "grande-oxydation": "🫧",
  "premiers-eucaryotes": "🧫",
  "premiers-organismes-multicellulaires": "🪸",
  "explosion-cambrienne": "🦑",
  "sortie-des-eaux": "🦎",
  "apparition-dinosaures": "🦖",
  "apparition-mammiferes": "🐭",
  "apparition-oiseaux": "🐦",
  "extinction-dinosaures": "☄️",
  "premiers-primates": "🐒",
  "separation-humains-chimpanzes": "🐵",
  "premiers-homo": "👣",
  "maitrise-du-feu": "🔥",
  "apparition-homo-sapiens": "🧍",
  "sortie-afrique": "🧭",
  "invention-agriculture": "🌾",
  "invention-ecriture": "📜",
  "pyramides-gizeh": "🔺",
  "fondation-rome": "🏛️",
  "chute-empire-romain": "⚔️",
  "invention-imprimerie": "📖",
  "revolution-francaise": "🇫🇷",
  "premier-pas-lune": "👨‍🚀",
  "aujourdhui": "🌅",
};

const track = document.getElementById("timeline-track")!;
const viewport = document.getElementById("timeline-viewport")!;
const spotlight = document.getElementById("spotlight")!;
const spotlightImage = document.getElementById("spotlight-image")!;
const spotlightTime = document.getElementById("spotlight-time")!;
const spotlightLabel = document.getElementById("spotlight-label")!;
const spotlightDescription = document.getElementById("spotlight-description")!;

// Largeur de scroll : assez pour que les repères récents (échelle log) respirent.
const TRACK_SCREENS = 10;

let markerEls: HTMLElement[] = [];

// La ligne ne s'étend pas sur toute la largeur utilisable du scroll : le centre du
// viewport est toujours en retrait d'une demi-largeur de viewport par rapport aux
// bords de la piste. Sans cette marge, "Aujourd'hui" et "Big Bang" ne seraient
// jamais atteignables comme repère le plus proche du centre, même en scrollant à fond.
function usableWidth(): number {
  return track.scrollWidth - viewport.clientWidth;
}

function positionToPx(position: number): number {
  return viewport.clientWidth / 2 + position * usableWidth();
}

function centerToPosition(): number {
  const usable = usableWidth();
  if (usable <= 0) return 0;
  return Math.min(1, Math.max(0, viewport.scrollLeft / usable));
}

function renderMarkers(): void {
  track.innerHTML = "";

  // Graduations aux puissances de dix : de « il y a 10 ans » au Big Bang.
  for (let exp = 1; exp <= 10; exp++) {
    const yearsAgo = 10 ** exp;
    if (yearsAgo > MAX_YEARS_AGO) break;
    const tick = document.createElement("div");
    tick.className = "tick";
    tick.dataset.yearsAgo = String(yearsAgo);
    tick.innerHTML = `<div class="tick-line"></div><div class="tick-label">${tickLabel(yearsAgo)}</div>`;
    track.appendChild(tick);
  }

  markerEls = REPERES.map((repere) => {
    const el = document.createElement("div");
    el.className = `marker marker-${repere.category}`;
    el.innerHTML = `<div class="marker-dot"></div>`;
    el.addEventListener("click", () => {
      scrollToPosition(yearsAgoToPosition(repere.yearsAgo));
    });
    track.appendChild(el);
    return el;
  });
}

function layoutMarkers(): void {
  track.style.width = `${viewport.clientWidth * TRACK_SCREENS}px`;
  markerEls.forEach((el, i) => {
    el.style.left = `${positionToPx(yearsAgoToPosition(REPERES[i].yearsAgo))}px`;
  });
  track.querySelectorAll<HTMLElement>(".tick").forEach((el) => {
    el.style.left = `${positionToPx(yearsAgoToPosition(Number(el.dataset.yearsAgo)))}px`;
  });
}

function tickLabel(yearsAgo: number): string {
  if (yearsAgo < 1_000_000) return `${yearsAgo.toLocaleString("fr-FR")} ans`;
  if (yearsAgo < 1_000_000_000) return `${yearsAgo / 1_000_000} M d'années`;
  return `${yearsAgo / 1_000_000_000} Md d'années`;
}

function formatYearsAgo(yearsAgo: number): string {
  if (yearsAgo < 1) return "Aujourd'hui";
  if (yearsAgo < 1_000_000) {
    return `il y a ${Math.round(yearsAgo).toLocaleString("fr-FR")} ans`;
  }
  if (yearsAgo < 1_000_000_000) {
    const m = parseFloat((yearsAgo / 1_000_000).toFixed(1));
    return `il y a ${String(m).replace(".", ",")} million${m >= 2 ? "s" : ""} d'années`;
  }
  const b = parseFloat((yearsAgo / 1_000_000_000).toFixed(2));
  return `il y a ${String(b).replace(".", ",")} milliard${b >= 2 ? "s" : ""} d'années`;
}

function nearestRepereIndex(position: number): number {
  let bestIndex = 0;
  let bestDistance = Infinity;
  REPERES.forEach((repere, index) => {
    const distance = Math.abs(yearsAgoToPosition(repere.yearsAgo) - position);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

let currentIndex = -1;

function updateSpotlight(): void {
  const position = centerToPosition();
  const index = nearestRepereIndex(position);
  const repere = REPERES[index];

  if (index !== currentIndex) {
    currentIndex = index;
    spotlight.className = `category-${repere.category}`;
    document.body.dataset.category = repere.category;
    // La date affichée est celle du repère : stable et juste, plutôt qu'une
    // interpolation qui défile n'importe comment entre deux événements.
    spotlightTime.textContent = formatYearsAgo(repere.yearsAgo);
    spotlightImage.textContent = EMOJI[repere.slug] ?? "✨";
    spotlightLabel.textContent = repere.label;
    spotlightDescription.textContent = repere.description;
    // relance la petite animation d'apparition
    spotlight.classList.remove("pop");
    void spotlight.offsetWidth;
    spotlight.classList.add("pop");
    markerEls.forEach((el, i) => el.classList.toggle("active", i === index));
  }
}

function scrollToPosition(position: number): void {
  viewport.scrollTo({ left: position * usableWidth(), behavior: "smooth" });
}

function refreshLayout(): void {
  layoutMarkers();
  updateSpotlight();
}

// Molette et trackpad n'importe où sur la page : tout part dans le scroll
// horizontal de la frise (rien d'autre ne scrolle sur cette page).
window.addEventListener(
  "wheel",
  (event: WheelEvent) => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (delta === 0) return;
    event.preventDefault();
    viewport.scrollLeft += delta;
  },
  { passive: false },
);

window.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  // gauche = plus ancien (la frise remonte le temps vers la droite du scroll)
  const next = event.key === "ArrowRight" ? currentIndex - 1 : currentIndex + 1;
  const clamped = Math.min(REPERES.length - 1, Math.max(0, next));
  scrollToPosition(yearsAgoToPosition(REPERES[clamped].yearsAgo));
});

viewport.addEventListener("scroll", updateSpotlight);
window.addEventListener("resize", refreshLayout);

renderMarkers();
refreshLayout();
