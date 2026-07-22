# Il te reste... Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new short interactive experience to the site — "Il te reste...", where the visitor enters their birth date and watches a sequence of absurd unit conversions of their remaining lifetime (using a fixed 80-year life expectancy) reveal one by one.

**Architecture:** Pure DOM/CSS page (no `<canvas>`), following the same pattern as `juke-box`/`echelle-du-temps`: a dedicated Vite page with a `main.ts` driving form handling and a timed sequential reveal, backed by a small pure calculation module (`units.ts`) that is unit-tested with Node's built-in test runner.

**Tech Stack:** Vite + TypeScript, plain DOM/CSS (no canvas), `node:test` for the pure calculation logic (Node 24 runs `.ts` test files directly, no build step needed), zero runtime dependencies. Visual style follows the site's current retro/pixel identity (`Pixelify Sans` + `VT323` fonts, `--ink`/`--card`/`--pink`/`--teal`/`--purple`/`--yellow` palette, thick borders + hard drop shadows) — **not** the older crayon look used when earlier experiences were first built.

---

## Spec reference

Full design: `docs/superpowers/specs/2026-07-21-il-te-reste-design.md`. Key decisions this plan implements:

- Fixed life expectancy of 80 years, no personalization.
- 35 units total: "jours restants" (raw days-left number, shown first) + 34 absurd unit conversions, each computed as `round((daysLeft / 365.25) × perYearFrequency)`.
- Sequential animated reveal, one line every ~1.3s, no skip/speed-up control in this version.
- Edge case: birth date ≥ 80 years ago → `computeUnitValues` returns `null`, UI shows a special message instead of the list, no crash and no negative numbers.
- No `localStorage`, no personalization slider, no share feature, no memento-mori tone — purely absurd/light.

## Current site state this plan builds on (checked 2026-07-22)

The site's visual identity changed since earlier experiences were designed: it's now a retro/pixel-arcade look (`Pixelify Sans` + `VT323` fonts, palette `--ink #17171b` / `--card #fffdf4` / `--pink #ff5c8a` / `--teal #1fc7a8` / `--purple #6c63ff` / `--yellow #ffc93c` / `--orange #ff8c42`, 3px solid borders with hard `Npx Npx 0 var(--ink)` drop shadows, `.back-link` in the top-left of every game page). `juke-box` (`games/juke-box/`, `src/games/juke-box/`) is the closest existing precedent: a pure-DOM (no canvas) experience with a `.machine`-style card container, styled buttons, and no game loop — this plan's HTML/CSS follows that page's conventions closely. Node is v24.16.0, which runs `.ts` test files directly via `node --test` without any build step.

## File structure

- Create `src/games/il-te-reste/units.ts` — pure data + calculation: the 34-unit list, the life-expectancy constant, and `computeUnitValues()`.
- Create `src/games/il-te-reste/test/units.test.ts` — `node:test` coverage for `computeUnitValues()`.
- Create `games/il-te-reste/index.html` — Vite page shell (intro form, reveal list, outro).
- Create `src/games/il-te-reste/style.css` — styles matching the site's current retro palette/conventions.
- Create `src/games/il-te-reste/main.ts` — form handling, sequential reveal, restart.
- Modify `package.json` — add a `test` script.
- Modify `vite.config.ts` — register the new page as a build entry.
- Modify `index.html` (site root) — add a tile linking to the new experience.
- Modify `README.md` — list the new experience.

---

### Task 1: Pure calculation logic, with tests

**Files:**
- Create: `src/games/il-te-reste/units.ts`
- Create: `src/games/il-te-reste/test/units.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing tests first**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeUnitValues, UNITS } from "../units.ts";

test("cas nominal : une date de naissance plausible retourne des valeurs positives", () => {
  const birthDate = new Date("2000-01-01T00:00:00Z");
  const today = new Date("2026-07-22T00:00:00Z");
  const result = computeUnitValues(birthDate, today);
  assert.ok(result !== null);
  assert.ok(result.daysLeft > 0);
  assert.equal(result.units.length, UNITS.length);
  for (const u of result.units) {
    assert.ok(u.value >= 0, `${u.label} ne doit pas être négatif`);
  }
});

test("cas limite : une date de naissance de plus de 80 ans retourne null", () => {
  const birthDate = new Date("1900-01-01T00:00:00Z");
  const today = new Date("2026-07-22T00:00:00Z");
  const result = computeUnitValues(birthDate, today);
  assert.equal(result, null);
});

test("cas limite : exactement 80 ans aujourd'hui retourne null (daysLeft <= 0)", () => {
  const birthDate = new Date("1946-07-22T00:00:00Z");
  const today = new Date("2026-07-22T00:00:00Z");
  const result = computeUnitValues(birthDate, today);
  assert.equal(result, null);
});

test("les nuits de sommeil restent cohérentes avec les jours restants", () => {
  const birthDate = new Date("2000-01-01T00:00:00Z");
  const today = new Date("2026-07-22T00:00:00Z");
  const result = computeUnitValues(birthDate, today);
  assert.ok(result !== null);
  const nights = result.units.find((u) => u.label === "nuits de sommeil");
  assert.ok(nights !== undefined);
  // ~1 nuit par jour restant, à quelques jours près à cause de l'arrondi et de 365.25
  assert.ok(Math.abs(nights.value - result.daysLeft) < 5);
});
```

Save this as `src/games/il-te-reste/test/units.test.ts`.

- [ ] **Step 2: Add a `test` script to `package.json`**

Modify `package.json`'s `"scripts"` block (currently):

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
```

Add a `test` entry so it reads:

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "node --experimental-strip-types --test \"src/**/*.test.ts\""
  },
```

**Note (post-review correction) :** la version initiale de ce script (`node --experimental-strip-types --test src`) ne fonctionne pas sur ce Node 24 — Node tente de charger `src` comme point d'entrée plutôt que comme racine de découverte récursive des tests, et échoue avec `MODULE_NOT_FOUND`. Le glob explicite et gardé entre guillemets (pour que ce soit Node, et non le shell, qui l'étende) fonctionne correctement et découvre les fichiers `*.test.ts` à toute profondeur sous `src/`.

- [ ] **Step 3: Run the tests and confirm they fail with "module not found"**

Run: `npm test`
Expected: FAIL — `units.ts` doesn't exist yet, so the import in the test file errors out (module resolution failure), not an assertion failure.

- [ ] **Step 4: Write `units.ts` — the minimal implementation to make the tests pass**

```ts
export const LIFE_EXPECTANCY_YEARS = 80;

export interface UnitDef {
  label: string;
  perYear: number;
}

export const UNITS: UnitDef[] = [
  { label: "nuits de sommeil", perYear: 365.25 },
  { label: "dimanches", perYear: 52.14 },
  { label: "lundis (le retour de vacances)", perYear: 52.14 },
  { label: "anniversaires", perYear: 1 },
  { label: "réveillons du 31 décembre", perYear: 1 },
  { label: "tasses de café", perYear: 730 },
  { label: "pizzas", perYear: 52 },
  { label: "verres d'eau", perYear: 2190 },
  { label: "repas", perYear: 1095 },
  { label: "fois où tu vas dire « c'est la dernière part promis »", perYear: 20 },
  { label: "fois où tu vas reperdre tes clés", perYear: 12 },
  { label: "fois où tu vas chercher ton téléphone alors qu'il est dans ta main", perYear: 20 },
  { label: "paires de chaussettes dépareillées après la lessive", perYear: 10 },
  { label: "cafés ou thés renversés sur toi", perYear: 3 },
  { label: "fois où tu vas te cogner le petit orteil", perYear: 8 },
  { label: "chargeurs perdus ou cassés", perYear: 2 },
  { label: "fois où tu vas dire « je commence lundi »", perYear: 52 },
  { label: "séries Netflix commencées sans être finies", perYear: 6 },
  { label: "fois où tu vas dire « on se refait ça vite »", perYear: 8 },
  { label: "bonnes résolutions abandonnées avant février", perYear: 1 },
  { label: "livres achetés jamais lus", perYear: 3 },
  { label: "déverrouillages de téléphone", perYear: 29200 },
  { label: "notifications reçues", perYear: 18250 },
  { label: "mots de passe oubliés", perYear: 6 },
  { label: "fois où quelqu'un te dira « ça passe vite la vie »", perYear: 5 },
  { label: "fois où tu parleras de la météo pour meubler un silence", perYear: 100 },
  { label: "couchers de soleil que tu pourrais regarder", perYear: 52 },
  { label: "éternuements", perYear: 365 },
  { label: "litres de salive produits", perYear: 438 },
  { label: "cheveux perdus", perYear: 36500 },
  { label: "respirations", perYear: 8409600 },
  { label: "clignements des yeux", perYear: 5956800 },
  { label: "pas effectués", perYear: 2555000 },
  { label: "battements de cœur", perYear: 42048000 },
];

export interface UnitValue {
  label: string;
  value: number;
}

export interface ComputedResult {
  daysLeft: number;
  units: UnitValue[];
}

export function computeUnitValues(birthDate: Date, today: Date): ComputedResult | null {
  const targetDate = new Date(birthDate);
  targetDate.setFullYear(targetDate.getFullYear() + LIFE_EXPECTANCY_YEARS);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.floor((targetDate.getTime() - today.getTime()) / msPerDay);
  if (daysLeft <= 0) return null;
  const yearsLeft = daysLeft / 365.25;
  const units = UNITS.map((u) => ({ label: u.label, value: Math.round(yearsLeft * u.perYear) }));
  return { daysLeft, units };
}
```

Save this as `src/games/il-te-reste/units.ts`.

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS — all 4 tests green, no failures.

- [ ] **Step 6: Commit**

```bash
git add src/games/il-te-reste/units.ts src/games/il-te-reste/test/units.test.ts package.json
git commit -m "feat: add pure lifetime-unit calculation logic with tests"
```

---

### Task 2: Page shell and interactivity

**Files:**
- Create: `games/il-te-reste/index.html`
- Create: `src/games/il-te-reste/style.css`
- Create: `src/games/il-te-reste/main.ts`
- Modify: `vite.config.ts`

- [ ] **Step 1: Create the page shell**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Il te reste...</title>
    <meta name="description" content="Découvre combien de temps il te reste, converti en unités totalement absurdes." />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⏳</text></svg>" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400..700&family=VT323&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/src/games/il-te-reste/style.css" />
  </head>
  <body>
    <a class="back-link" href="/">← le petit prince</a>

    <main class="card">
      <section id="intro">
        <h1>Il te reste...</h1>
        <p class="tip">Donne ta date de naissance, on te dit ce qu'il te reste — dans des unités qui n'ont aucun sens.</p>
        <form id="form">
          <input id="birthdate" type="date" required />
          <button type="submit">montre-moi</button>
        </form>
        <p class="disclaimer">Espérance de vie moyenne utilisée : 80 ans. Ceci n'est absolument pas une prédiction sérieuse.</p>
      </section>

      <section id="reveal" class="hidden">
        <ul id="reveal-list"></ul>
      </section>

      <section id="outro" class="hidden">
        <p id="outro-message"></p>
        <button id="btn-restart" type="button">recommencer</button>
      </section>
    </main>

    <script type="module" src="/src/games/il-te-reste/main.ts"></script>
  </body>
</html>
```

Save this as `games/il-te-reste/index.html`.

- [ ] **Step 2: Create the stylesheet**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --ink: #17171b;
  --card: #fffdf4;
  --pink: #ff5c8a;
  --teal: #1fc7a8;
  --purple: #6c63ff;
  --yellow: #ffc93c;
  --orange: #ff8c42;
}

html,
body {
  min-height: 100%;
  font-family: "VT323", "Courier New", monospace;
  color: var(--ink);
  background:
    conic-gradient(#f6efdd 90deg, #f1e8d2 90deg 180deg, #f6efdd 180deg 270deg, #f1e8d2 270deg)
    0 0 / 28px 28px;
}

.back-link {
  position: fixed;
  z-index: 10;
  top: 16px;
  left: 18px;
  color: var(--ink);
  text-decoration: none;
  font-size: 1.3rem;
  line-height: 1;
  padding: 8px 14px;
  background: var(--card);
  border: 3px solid var(--ink);
  border-radius: 8px;
  box-shadow: 4px 4px 0 var(--ink);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.back-link:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--pink);
}

.card {
  width: min(640px, calc(100% - 32px));
  margin: 90px auto 40px;
  background: var(--card);
  border: 3px solid var(--ink);
  border-radius: 14px;
  box-shadow: 8px 8px 0 var(--ink);
  padding: 28px 26px;
  text-align: center;
}

.card h1 {
  font-family: "Pixelify Sans", "VT323", monospace;
  font-size: clamp(1.9rem, 5vw, 2.8rem);
  font-weight: 700;
  margin-bottom: 14px;
  text-shadow: 3px 3px 0 var(--yellow);
}

.tip {
  font-size: 1.2rem;
  margin-bottom: 20px;
}

form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}

input[type="date"] {
  font-family: inherit;
  font-size: 1.2rem;
  padding: 6px 10px;
  border: 3px solid var(--ink);
  border-radius: 8px;
  background: #efe8d6;
  color: var(--ink);
}

button {
  font-family: inherit;
  font-size: 1.2rem;
  line-height: 1;
  padding: 8px 16px;
  background: var(--teal);
  color: var(--ink);
  border: 3px solid var(--ink);
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 3px 3px 0 var(--ink);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

button:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--pink);
}

button:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--ink);
}

.disclaimer {
  font-size: 1rem;
  font-style: italic;
  color: #6d675c;
}

.hidden {
  display: none;
}

#reveal-list {
  list-style: none;
  text-align: left;
  font-size: 1.3rem;
  line-height: 1.7;
}

#reveal-list li {
  opacity: 0;
  transform: translateY(6px);
  animation: reveal-in 0.4s ease forwards;
}

@keyframes reveal-in {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

#reveal-list li strong {
  color: var(--pink);
}

#outro p {
  font-size: 1.3rem;
  margin-bottom: 18px;
}
```

Save this as `src/games/il-te-reste/style.css`.

- [ ] **Step 3: Create `main.ts`**

```ts
import { computeUnitValues, LIFE_EXPECTANCY_YEARS, type UnitValue } from "./units";

const REVEAL_INTERVAL_MS = 1300;

const introEl = document.getElementById("intro")!;
const revealEl = document.getElementById("reveal")!;
const revealListEl = document.getElementById("reveal-list")!;
const outroEl = document.getElementById("outro")!;
const outroMessageEl = document.getElementById("outro-message")!;
const formEl = document.getElementById("form") as HTMLFormElement;
const birthdateInput = document.getElementById("birthdate") as HTMLInputElement;
const restartButton = document.getElementById("btn-restart")!;

function formatNumber(n: number): string {
  return n.toLocaleString("fr-FR");
}

function appendRevealLine(html: string): void {
  const li = document.createElement("li");
  li.innerHTML = html;
  revealListEl.appendChild(li);
}

function runReveal(daysLeft: number, units: UnitValue[]): void {
  introEl.classList.add("hidden");
  revealListEl.innerHTML = "";
  revealEl.classList.remove("hidden");
  outroEl.classList.add("hidden");

  const lines = [
    `Il te reste environ <strong>${formatNumber(daysLeft)}</strong> jours.`,
    ...units.map((u) => `Ça fait à peu près <strong>${formatNumber(u.value)}</strong> ${u.label}.`),
  ];

  let index = 0;
  function revealNext(): void {
    if (index >= lines.length) {
      window.setTimeout(() => {
        revealEl.classList.add("hidden");
        outroMessageEl.textContent = "Voilà. Fais-en bon usage (ou pas, c'est toi qui vois).";
        outroEl.classList.remove("hidden");
      }, REVEAL_INTERVAL_MS);
      return;
    }
    appendRevealLine(lines[index]);
    index += 1;
    window.setTimeout(revealNext, REVEAL_INTERVAL_MS);
  }
  revealNext();
}

function showTooOldMessage(): void {
  introEl.classList.add("hidden");
  outroMessageEl.textContent = `Avec une espérance de vie moyenne de ${LIFE_EXPECTANCY_YEARS} ans, il n'y a plus rien à calculer ici. Soit tu as un secret, soit ce site n'est pas pour toi.`;
  outroEl.classList.remove("hidden");
}

formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = birthdateInput.value;
  if (!value) return;
  const birthDate = new Date(value);
  const result = computeUnitValues(birthDate, new Date());
  if (!result) {
    showTooOldMessage();
    return;
  }
  runReveal(result.daysLeft, result.units);
});

restartButton.addEventListener("click", () => {
  outroEl.classList.add("hidden");
  revealListEl.innerHTML = "";
  birthdateInput.value = "";
  introEl.classList.remove("hidden");
});
```

Save this as `src/games/il-te-reste/main.ts`.

- [ ] **Step 4: Register the page in Vite's build entries**

Modify `vite.config.ts` (currently):

```ts
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  server: {
    // le tunnel Cloudflare présente ce hostname au serveur de dev
    allowedHosts: ["leptitprince.simptom.fr"],
  },
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, "index.html"),
        orbites: resolve(__dirname, "games/petites-orbites/index.html"),
        echelle: resolve(__dirname, "games/echelle-du-temps/index.html"),
        jardin: resolve(__dirname, "games/jardin-infini/index.html"),
        chute: resolve(__dirname, "games/chute-infinie/index.html"),
        jukebox: resolve(__dirname, "games/juke-box/index.html"),
      },
    },
  },
});
```

Add an `ilTeReste` entry so it reads:

```ts
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  server: {
    // le tunnel Cloudflare présente ce hostname au serveur de dev
    allowedHosts: ["leptitprince.simptom.fr"],
  },
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, "index.html"),
        orbites: resolve(__dirname, "games/petites-orbites/index.html"),
        echelle: resolve(__dirname, "games/echelle-du-temps/index.html"),
        jardin: resolve(__dirname, "games/jardin-infini/index.html"),
        chute: resolve(__dirname, "games/chute-infinie/index.html"),
        jukebox: resolve(__dirname, "games/juke-box/index.html"),
        ilTeReste: resolve(__dirname, "games/il-te-reste/index.html"),
      },
    },
  },
});
```

**Note:** if `vite.config.ts` has changed further by the time this task is implemented (e.g. more games added by a collaborator), add the `ilTeReste` entry to whatever the current `input` object looks like — don't blindly overwrite the whole file with the version shown above if it no longer matches. Re-read the file first.

- [ ] **Step 5: Verify manually in the browser**

Run: `npm run dev` (if not already running)
Open: `http://localhost:5173/games/il-te-reste/`
Expected: a card with the title "Il te reste...", a date input, a "montre-moi" button, and the disclaimer text. Enter a plausible birth date (e.g. 25+ years ago) and submit: the form disappears and lines start appearing one by one (~1.3s apart), starting with "Il te reste environ N jours.", followed by each absurd unit, ending on "battements de cœur". After the last line, wait ~1.3s more: the list disappears and a closing message + "recommencer" button appears. Click "recommencer": the form reappears, empty, ready for another date. Try a birth date more than 80 years ago: instead of the list, the "soit tu as un secret" message appears directly.

- [ ] **Step 6: Run the full test suite and build one more time**

Run: `npm test`
Expected: PASS (still 4/4, unaffected by this task's changes).

Run: `npm run build`
Expected: succeeds, producing a `games/il-te-reste/index.html` entry in `dist/` alongside the existing pages.

- [ ] **Step 7: Commit**

```bash
git add games/il-te-reste/index.html src/games/il-te-reste/style.css src/games/il-te-reste/main.ts vite.config.ts
git commit -m "feat: add Il te reste page shell and reveal interaction"
```

---

### Task 3: Homepage integration

**Files:**
- Modify: `index.html` (site root)
- Modify: `README.md`

- [ ] **Step 1: Add a tile for the new experience**

Re-read the current `<main class="grid">` block in the root `index.html` before editing — other collaborators may have added more tiles since this plan was written. Add a new tile as the **first** entry in the grid (matching the convention of newest-first), following the exact same structure as the existing tiles (an `<a class="tile">` with a `<span class="badge">NOUVEAU</span>`, an `<img class="tile-art">` or emoji `<div class="tile-art">`, and an `<h2 class="tile-name">`):

```html
      <a class="tile" href="/games/il-te-reste/">
        <span class="badge">NOUVEAU</span>
        <div class="tile-art" aria-hidden="true">⏳</div>
        <h2 class="tile-name">Il te reste...</h2>
      </a>
```

Insert it as the first child of `<main class="grid">`, before whatever tile currently comes first. Don't remove any existing tile or badge — the current convention (as of this plan) keeps multiple `NOUVEAU` badges active at once, unlike the older single-badge convention from earlier in the site's history.

- [ ] **Step 2: Update the README's experience list**

Re-read the current `## Jeux` section of `README.md` before editing (it may already list more experiences than shown here, added by a collaborator). Add a new bullet **above** whatever bullet currently comes first:

```markdown
- **Il te reste...** (`/games/il-te-reste/`) — donne ta date de naissance, regarde
  ton temps restant se convertir en unités totalement absurdes (tasses de café,
  battements de cœur, fois où tu vas reperdre tes clés...).
```

- [ ] **Step 3: Verify the homepage and the production build**

Run: `npm run dev` (if not already running)
Confirm: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` returns 200, and `curl -s http://localhost:5173/ | grep -o "Il te reste"` finds the new tile text.

Run: `npm run build`
Expected: build succeeds with no errors; `dist/games/il-te-reste/index.html` exists alongside all the other pages.

Run: `npm test`
Expected: PASS (unaffected by this task).

- [ ] **Step 4: Commit**

```bash
git add index.html README.md
git commit -m "feat: add Il te reste tile to the homepage"
```

---

## Self-review notes

- **Spec coverage:** concept & déroulé (Task 2), contenu/35 unités + calcul + cas limite (Task 1), architecture technique (Tasks 1-2), hors scope items are simply not built (no personnalisation d'espérance de vie, pas de bouton "passer", pas de partage, pas de `localStorage`).
- **No placeholders:** every step ships complete, compilable TypeScript/HTML/CSS/JSON, with real test code (not "write tests for the above").
- **Type consistency:** `UnitDef`, `UnitValue`, `ComputedResult`, and `computeUnitValues()`'s signature are defined once in Task 1's `units.ts` and imported verbatim in Task 2's `main.ts` — no renamed fields.
- **Divergence from the original design spec doc:** the spec's "Architecture technique" section originally described the old crayon visual palette (written before a collaborator reworked the whole site's look). This plan uses the site's *current* retro/pixel palette and `juke-box`'s DOM conventions instead — the spec file has been updated to match, so both documents are now consistent with each other and with the live codebase.
