import { REPERES } from './data.js';
import { yearsAgoToPosition, positionToYearsAgo, MAX_YEARS_AGO } from './mapping.js';

const track = document.getElementById('timeline-track');
const viewport = document.getElementById('timeline-viewport');
const indicator = document.getElementById('indicator');

function renderMarkers() {
  track.innerHTML = '';
  for (const repere of REPERES) {
    const position = yearsAgoToPosition(repere.yearsAgo);
    const el = document.createElement('div');
    el.className = 'marker';
    el.style.left = `${position * 100}%`;
    el.innerHTML = `
      <div class="marker-dot"></div>
      <div class="marker-label">${repere.label}</div>
      <div class="marker-description">
        <div class="marker-text">${repere.description}</div>
      </div>
    `;
    if (repere.image) {
      const description = el.querySelector('.marker-description');
      const img = document.createElement('img');
      img.className = 'marker-image';
      img.src = repere.image;
      img.alt = repere.label;
      img.addEventListener('error', () => img.remove());
      description.prepend(img);
    }
    el.addEventListener('click', () => el.classList.toggle('active'));
    track.appendChild(el);
  }
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

function updateIndicator() {
  const maxScroll = track.scrollWidth - viewport.clientWidth;
  const scrollPercent = maxScroll > 0 ? viewport.scrollLeft / maxScroll : 0;
  const yearsAgo = positionToYearsAgo(scrollPercent, MAX_YEARS_AGO);
  indicator.textContent = formatYearsAgo(yearsAgo);
}

viewport.addEventListener('wheel', (event) => {
  if (event.deltaY === 0) return;
  event.preventDefault();
  viewport.scrollLeft += event.deltaY;
}, { passive: false });

viewport.addEventListener('scroll', updateIndicator);
window.addEventListener('resize', updateIndicator);

renderMarkers();
updateIndicator();
