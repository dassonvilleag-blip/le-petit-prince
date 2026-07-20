# Échelle de temps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single static page where a horizontal scroll takes the user from "today" back to the Big Bang, using a non-linear time-to-position mapping so recent history isn't visually crushed.

**Architecture:** Pure vanilla ES modules, no build step, no dependencies. `mapping.js` holds the pure, unit-testable time→position (and inverse) functions. `data.js` holds the list of historical markers. `script.js` wires DOM rendering and scroll handling. `index.html` + `style.css` provide structure and the pastel visual design.

**Tech Stack:** HTML5, CSS3, vanilla JS (ES modules), Node's built-in `node:test` + `node:assert` for the mapping unit tests (no npm dependencies), git, GitHub Pages for hosting.

---

## Reference: design spec

See `docs/superpowers/specs/2026-07-20-echelle-de-temps-design.md` for the full design rationale (DA, UX, edge cases).

## File Structure

- `mapping.js` — pure functions: `yearsAgoToPosition`, `positionToYearsAgo`. No DOM, no imports beyond nothing — fully unit-testable in Node.
- `data.js` — exports `REPERES`, an array of `{ yearsAgo, label, description }`, sorted chronologically (oldest first).
- `script.js` — imports `mapping.js` and `data.js`; renders markers into the DOM, converts vertical wheel input into horizontal scroll, updates the position indicator on scroll/resize.
- `index.html` — page shell, loads `script.js` as `type="module"`.
- `style.css` — pastel DA, layout for the horizontal timeline track, marker styling, mobile responsiveness.
- `test/mapping.test.mjs` — `node:test` unit tests for `mapping.js`.

---

### Task 1: Pure mapping function (TDD)

**Files:**
- Create: `mapping.js`
- Test: `test/mapping.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
// test/mapping.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yearsAgoToPosition, positionToYearsAgo, MAX_YEARS_AGO } from '../mapping.js';

test('aujourd\'hui (0 an) est à la position 0', () => {
  assert.equal(yearsAgoToPosition(0), 0);
});

test('le Big Bang (âge max) est à la position 1', () => {
  assert.equal(yearsAgoToPosition(MAX_YEARS_AGO), 1);
});

test('la position croît avec yearsAgo et reste dans [0, 1]', () => {
  const p1 = yearsAgoToPosition(1);
  const p1000 = yearsAgoToPosition(1000);
  const p1e9 = yearsAgoToPosition(1_000_000_000);
  assert.ok(p1 > 0);
  assert.ok(p1000 > p1);
  assert.ok(p1e9 > p1000);
  assert.ok(p1e9 < 1);
});

test('les 10 000 dernières années occupent plus de 30% de l\'échelle', () => {
  const p = yearsAgoToPosition(10_000);
  assert.ok(p > 0.3, `position=${p}`);
});

test('positionToYearsAgo est l\'inverse de yearsAgoToPosition', () => {
  for (const yearsAgo of [1, 500, 10_000, 1_000_000, 4_600_000_000]) {
    const position = yearsAgoToPosition(yearsAgo);
    const roundTrip = positionToYearsAgo(position);
    const relativeError = Math.abs(roundTrip - yearsAgo) / yearsAgo;
    assert.ok(relativeError < 1e-9, `yearsAgo=${yearsAgo} roundTrip=${roundTrip}`);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/`
Expected: FAIL — `Cannot find module '../mapping.js'` (file doesn't exist yet)

- [ ] **Step 3: Implement the minimal mapping module**

```js
// mapping.js
export const MAX_YEARS_AGO = 13_800_000_000;

export function yearsAgoToPosition(yearsAgo, maxYearsAgo = MAX_YEARS_AGO) {
  if (yearsAgo <= 0) return 0;
  return Math.log1p(yearsAgo) / Math.log1p(maxYearsAgo);
}

export function positionToYearsAgo(position, maxYearsAgo = MAX_YEARS_AGO) {
  if (position <= 0) return 0;
  return Math.expm1(position * Math.log1p(maxYearsAgo));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/`
Expected: PASS — 5 tests passing, 0 failing

- [ ] **Step 5: Commit**

```bash
git add mapping.js test/mapping.test.mjs
git commit -m "feat: add non-linear time-to-position mapping with unit tests"
```

---

### Task 2: Historical markers data

**Files:**
- Create: `data.js`

- [ ] **Step 1: Write the data file**

```js
// data.js
// yearsAgo calculé par rapport à 2026. Trié du plus ancien au plus récent.
export const REPERES = [
  { yearsAgo: 13_800_000_000, label: "Big Bang", description: "Naissance de l'univers observable." },
  { yearsAgo: 13_000_000_000, label: "Formation de la Voie lactée", description: "Notre galaxie prend forme." },
  { yearsAgo: 4_600_000_000, label: "Formation du Système solaire", description: "Le Soleil et les planètes se forment à partir d'un nuage de gaz et de poussière." },
  { yearsAgo: 4_540_000_000, label: "Formation de la Terre", description: "Notre planète s'agrège." },
  { yearsAgo: 4_500_000_000, label: "Formation de la Lune", description: "Issue d'une collision entre la Terre et une protoplanète." },
  { yearsAgo: 4_000_000_000, label: "Apparition de l'eau liquide", description: "Les océans primitifs se forment." },
  { yearsAgo: 3_800_000_000, label: "Première vie", description: "Les premières bactéries apparaissent." },
  { yearsAgo: 2_400_000_000, label: "Grande Oxydation", description: "La photosynthèse enrichit l'atmosphère en oxygène." },
  { yearsAgo: 1_850_000_000, label: "Premiers eucaryotes", description: "Des cellules avec un noyau apparaissent." },
  { yearsAgo: 600_000_000, label: "Premiers organismes multicellulaires", description: "La vie se complexifie." },
  { yearsAgo: 541_000_000, label: "Explosion cambrienne", description: "Diversification rapide des formes de vie animale." },
  { yearsAgo: 375_000_000, label: "Sortie des eaux", description: "Les premiers tétrapodes s'aventurent hors de l'eau." },
  { yearsAgo: 240_000_000, label: "Apparition des dinosaures", description: "Ils domineront la Terre pendant plus de 150 millions d'années." },
  { yearsAgo: 200_000_000, label: "Apparition des mammifères", description: "De petits mammifères coexistent avec les dinosaures." },
  { yearsAgo: 150_000_000, label: "Apparition des oiseaux", description: "Descendants directs des dinosaures théropodes." },
  { yearsAgo: 66_000_000, label: "Extinction des dinosaures", description: "Un astéroïde percute la Terre près du Yucatán." },
  { yearsAgo: 55_000_000, label: "Premiers primates", description: "Nos lointains ancêtres apparaissent." },
  { yearsAgo: 6_000_000, label: "Séparation humains / chimpanzés", description: "Nos lignées évolutives divergent." },
  { yearsAgo: 2_400_000, label: "Premiers Homo", description: "Apparition du genre Homo, avec Homo habilis." },
  { yearsAgo: 1_000_000, label: "Maîtrise du feu", description: "Un tournant pour l'alimentation et la survie." },
  { yearsAgo: 300_000, label: "Apparition d'Homo sapiens", description: "Notre espèce apparaît en Afrique." },
  { yearsAgo: 70_000, label: "Sortie d'Afrique", description: "Homo sapiens commence à peupler le reste du monde." },
  { yearsAgo: 12_000, label: "Invention de l'agriculture", description: "La révolution néolithique transforme les sociétés humaines." },
  { yearsAgo: 5_200, label: "Invention de l'écriture", description: "En Mésopotamie, avec les premiers systèmes cunéiformes." },
  { yearsAgo: 4_500, label: "Pyramides de Gizeh", description: "Construction de la grande pyramide de Khéops." },
  { yearsAgo: 2_779, label: "Fondation de Rome", description: "Selon la tradition, en 753 avant notre ère." },
  { yearsAgo: 1_550, label: "Chute de l'Empire romain d'Occident", description: "Marque conventionnellement la fin de l'Antiquité." },
  { yearsAgo: 586, label: "Invention de l'imprimerie", description: "Gutenberg révolutionne la diffusion du savoir." },
  { yearsAgo: 237, label: "Révolution française", description: "Bouleversement politique et social majeur en Europe." },
  { yearsAgo: 57, label: "Premier pas sur la Lune", description: "Neil Armstrong marche sur la Lune en 1969." },
  { yearsAgo: 0, label: "Aujourd'hui", description: "Le moment présent, point de départ de ce voyage." },
];
```

- [ ] **Step 2: Verify the data loads without syntax errors**

Run: `node -e "import('./data.js').then(m => console.log(m.REPERES.length + ' repères chargés'))"`
Expected: `31 repères chargés`

- [ ] **Step 3: Commit**

```bash
git add data.js
git commit -m "feat: add historical markers dataset"
```

---

### Task 3: Page shell and pastel styling

**Files:**
- Create: `index.html`
- Create: `style.css`

- [ ] **Step 1: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Le Petit Prince — Une échelle de temps</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="indicator" aria-live="polite">Aujourd'hui</div>
  <main id="timeline-viewport">
    <div id="timeline-track"></div>
  </main>
  <noscript>Active JavaScript pour voir la frise interactive.</noscript>
  <script type="module" src="script.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `style.css`**

```css
:root {
  --bg: #fbf9f6;
  --track-bg: #ffffff;
  --line: #d8d2c9;
  --text: #33302c;
  --accent-cosmos: #a7c7e7;
  --accent-earth: #b7d7a8;
  --accent-life: #f6cbb7;
  --accent-human: #e8b4d8;
  font-size: 16px;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  overflow: hidden;
  height: 100vh;
}

#indicator {
  position: fixed;
  top: 1.5rem;
  left: 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  z-index: 10;
  background: rgba(255, 255, 255, 0.85);
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

#timeline-viewport {
  height: 100vh;
  width: 100vw;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: auto;
}

#timeline-track {
  position: relative;
  height: 100%;
  width: 6000px;
}

#timeline-track::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--line);
}

.marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

.marker-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-earth);
  border: 2px solid var(--track-bg);
  box-shadow: 0 0 0 1px var(--line);
}

.marker-label {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  white-space: nowrap;
  max-width: 8rem;
  text-align: center;
}

.marker-description {
  display: none;
  position: absolute;
  top: 2.2rem;
  width: 14rem;
  font-size: 0.7rem;
  text-align: center;
  background: var(--track-bg);
  border-radius: 0.5rem;
  padding: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.marker:hover .marker-description,
.marker.active .marker-description {
  display: block;
}

@media (max-width: 640px) {
  #timeline-track { width: 3000px; }
  .marker-label { font-size: 0.65rem; max-width: 5rem; }
  #indicator { font-size: 0.85rem; padding: 0.3rem 0.7rem; }
}
```

- [ ] **Step 3: Commit**

```bash
git add index.html style.css
git commit -m "feat: add page shell and pastel visual design"
```

---

### Task 4: Rendering, scroll handling, and position indicator

**Files:**
- Create: `script.js`

- [ ] **Step 1: Write `script.js`**

```js
// script.js
import { REPERES } from './data.js';
import { yearsAgoToPosition, positionToYearsAgo, MAX_YEARS_AGO } from './mapping.js';

const track = document.getElementById('timeline-track');
const viewport = document.getElementById('timeline-viewport');
const indicator = document.getElementById('indicator');

function trackWidth() {
  return track.getBoundingClientRect().width;
}

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
      <div class="marker-description">${repere.description}</div>
    `;
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
```

- [ ] **Step 2: Manual smoke test in the browser**

Run: `python -m http.server 8000` (or any static server) from the project root, then open `http://localhost:8000`.
Expected: markers appear along a horizontal line; scrolling the mouse wheel moves the timeline horizontally; the top-left indicator updates as you scroll; "Aujourd'hui" shows at the very left, "Big Bang" at the far right.

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "feat: render markers and wire horizontal scroll with live indicator"
```

---

### Task 5: Manual verification pass

**Files:** none (verification only)

- [ ] **Step 1: Desktop check**

Open the page in a desktop browser window. Confirm: mouse wheel scrolls horizontally, marker labels are readable without overlapping at every point of the scroll, hovering a marker shows its description, the indicator text stays legible and updates smoothly.

- [ ] **Step 2: Mobile / narrow viewport check**

Resize the browser to a narrow width (or use dev tools device emulation). Confirm: horizontal swipe scrolls the timeline, marker labels don't overflow the viewport, tapping a marker toggles its description (via the `active` class).

- [ ] **Step 3: Resize check**

While scrolled to roughly the middle of the timeline, resize the browser window. Confirm the indicator text still reflects a sensible position (no jump to "Aujourd'hui" or "Big Bang" caused by using absolute pixels instead of scroll percentage).

- [ ] **Step 4: No-JS check**

Disable JavaScript in the browser (or check via dev tools "Disable JavaScript") and reload. Confirm the `<noscript>` message is visible instead of a blank page.

---

### Task 6: GitHub repo and Pages deployment

**Files:** none (repo/hosting configuration only)

> **Checkpoint:** this task makes the code public. Confirm the repo name and that the user is ready to publish before running the push.

- [ ] **Step 1: Confirm repo name and visibility with the user**

Ask: "Je crée le dépôt GitHub `le-petit-prince` (public, nécessaire pour GitHub Pages gratuit) et j'y pousse le code — je continue ?"

- [ ] **Step 2: Create the GitHub repo and push**

```bash
gh repo create le-petit-prince --public --source=. --remote=origin --push
```

Expected: repo created under the user's GitHub account, `master` branch pushed, `origin` remote set.

- [ ] **Step 3: Enable GitHub Pages**

```bash
gh api repos/{owner}/le-petit-prince/pages -X POST -f "source[branch]=master" -f "source[path]=/"
```

Expected: JSON response confirming Pages is building from `master` at `/`. The site becomes available at `https://<owner>.github.io/le-petit-prince/` within a few minutes.

- [ ] **Step 4: Verify the live URL**

Open `https://<owner>.github.io/le-petit-prince/` once Pages finishes building (check with `gh api repos/{owner}/le-petit-prince/pages` — status should be `built`). Confirm the page loads and behaves as in the local manual verification pass.

---

## Self-Review Notes

- **Spec coverage:** architecture (Task 1, 3, 4), data model (Task 2), navigation/mapping (Task 1, 4), responsive (Task 3 media query, Task 5 step 2), edge cases — no-JS (Task 3 `<noscript>`, Task 5 step 4), resize (Task 4 percentage-based indicator, Task 5 step 3), verification (Task 5), hosting (Task 6) — all covered.
- **Type/name consistency checked:** `yearsAgoToPosition`/`positionToYearsAgo`/`MAX_YEARS_AGO` used identically across `mapping.js`, its test file, and `script.js`. `REPERES` used identically across `data.js` and `script.js`.
