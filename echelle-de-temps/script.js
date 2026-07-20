import { REPERES } from './data.js';
import { ILLUSTRATIONS } from './illustrations.js';
import { yearsAgoToPosition, positionToYearsAgo, MAX_YEARS_AGO } from './mapping.js';

const track = document.getElementById('timeline-track');
const viewport = document.getElementById('timeline-viewport');
const spotlight = document.getElementById('spotlight');
const spotlightImage = document.getElementById('spotlight-image');
const spotlightTime = document.getElementById('spotlight-time');
const spotlightLabel = document.getElementById('spotlight-label');
const spotlightDescription = document.getElementById('spotlight-description');

let markerEls = [];

// La ligne ne s'étend pas sur toute la largeur utilisable du scroll : le centre du
// viewport est toujours en retrait d'une demi-largeur de viewport par rapport aux
// bords de la piste. Sans cette marge, "Aujourd'hui" et "Big Bang" ne seraient
// jamais atteignables comme repère le plus proche du centre, même en scrollant à fond.
function usableWidth() {
  return track.scrollWidth - viewport.clientWidth;
}

function positionToPx(position) {
  return viewport.clientWidth / 2 + position * usableWidth();
}

function centerToPosition() {
  const usable = usableWidth();
  if (usable <= 0) return 0;
  const centerPx = viewport.scrollLeft + viewport.clientWidth / 2;
  return Math.min(1, Math.max(0, (centerPx - viewport.clientWidth / 2) / usable));
}

function renderMarkers() {
  track.innerHTML = '';
  markerEls = REPERES.map((repere) => {
    const el = document.createElement('div');
    el.className = 'marker';
    el.innerHTML = `<div class="marker-dot"></div>`;
    track.appendChild(el);
    return el;
  });
}

function layoutMarkers() {
  markerEls.forEach((el, i) => {
    const position = yearsAgoToPosition(REPERES[i].yearsAgo);
    el.style.left = `${positionToPx(position)}px`;
  });
}

function formatYearsAgo(yearsAgo) {
  if (yearsAgo < 1) return "Aujourd'hui";
  const rounded = yearsAgo < 1000
    ? Math.round(yearsAgo)
    : yearsAgo < 1_000_000
      ? `${Math.round(yearsAgo / 1000)} mille`
      : yearsAgo < 1_000_000_000
        ? `${Math.round(yearsAgo / 1_000_000)} millions`
        : `${(yearsAgo / 1_000_000_000).toFixed(1)} milliards`;
  return `il y a ${rounded} an${yearsAgo >= 2 ? 's' : ''}`;
}

function nearestRepereIndex(position) {
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

function updateSpotlight() {
  const position = centerToPosition();
  const yearsAgo = positionToYearsAgo(position, MAX_YEARS_AGO);
  spotlightTime.textContent = formatYearsAgo(yearsAgo);

  const index = nearestRepereIndex(position);
  const repere = REPERES[index];

  spotlight.className = `category-${repere.category}`;
  spotlightImage.innerHTML = `<svg viewBox="0 0 100 100">${ILLUSTRATIONS[repere.slug] || ''}</svg>`;
  spotlightLabel.textContent = repere.label;
  spotlightDescription.textContent = repere.description;

  markerEls.forEach((el, i) => el.classList.toggle('active', i === index));
}

function refreshLayout() {
  layoutMarkers();
  updateSpotlight();
}

viewport.addEventListener('wheel', (event) => {
  if (event.deltaY === 0) return;
  event.preventDefault();
  viewport.scrollLeft += event.deltaY;
}, { passive: false });

viewport.addEventListener('scroll', updateSpotlight);
window.addEventListener('resize', refreshLayout);

renderMarkers();
refreshLayout();
