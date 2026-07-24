# Ça coûte combien ?! Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a playable first wave of "Ça coûte combien ?!" — a 10-round price-guessing mini-game for the Le Petit Prince site, with 10 real starter items (real photos + real prices), scoring, sarcastic comments, a persistent record, and anti-repeat draw logic.

**Architecture:** Plain DOM/CSS/TypeScript game page (no framework, no canvas), following the exact structure of `games/juke-box` and `games/petites-orbites`. Game logic is split into small, independently testable pure modules (`scoring.ts`, `pool.ts`, `comments.ts`) plus static data modules (`items.ts`, `photo-credits.ts`), wired together by a DOM-manipulation `main.ts`. This mirrors the only precedent for testable logic in this codebase (`src/games/il-te-reste/units.ts` on the unmerged `feature/il-te-reste` branch).

**Tech Stack:** Vite + TypeScript (strict mode), no framework, no test framework dependency — uses Node's built-in `node:test` + `node:assert/strict` runner (`node --experimental-strip-types --test`), confirmed working with the installed Node v24.16.0.

**Content already sourced (done, not part of the tasks below):** 10 starter items' real photos have already been downloaded from Wikimedia Commons (free-licensed), converted to `.webp`, and placed at `public/photos/ca-coute-combien/*.webp`. The home-page tile art is at `public/tiles/prix.webp`. See Task 5 for the exact data (prices, names, photo credits) to wire into code.

---

### Task 1: Add a test script to `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the `test` script**

Open `package.json` and add a `"test"` entry to `"scripts"`:

```json
{
  "name": "le-petit-prince",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "node --experimental-strip-types --test \"src/**/*.test.ts\""
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: Verify the script runs (with zero test files, it should report no tests found, not error)**

Run: `npm test`
Expected: Node's test runner exits without a module-resolution error (it may print "no test files found" — that's fine, no `*.test.ts` files exist yet).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add node:test script for pure-logic unit tests"
```

---

### Task 2: `scoring.ts` — round score formula (TDD)

**Files:**
- Create: `src/games/ca-coute-combien/scoring.ts`
- Test: `src/games/ca-coute-combien/test/scoring.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/games/ca-coute-combien/test/scoring.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeRoundScore } from "../scoring.ts";

test("an exact guess scores 1000", () => {
  assert.equal(computeRoundScore(100, 100), 1000);
});

test("a guess exactly double the price scores 0", () => {
  assert.equal(computeRoundScore(200, 100), 0);
});

test("a guess wildly above the price clamps to 0, never negative", () => {
  assert.equal(computeRoundScore(1000, 100), 0);
});

test("a guess 10% off the price scores 900", () => {
  assert.equal(computeRoundScore(110, 100), 900);
});

test("undershooting and overshooting by the same amount score the same", () => {
  assert.equal(computeRoundScore(90, 100), computeRoundScore(110, 100));
});

test("a price of 0 never divides by zero", () => {
  assert.equal(computeRoundScore(50, 0), 0);
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../scoring.ts'` (the file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/games/ca-coute-combien/scoring.ts`:

```ts
export function computeRoundScore(guess: number, price: number): number {
  if (price <= 0) return 0;
  const errorRatio = Math.abs(guess - price) / price;
  const raw = 1000 * (1 - errorRatio);
  return Math.round(Math.max(0, Math.min(1000, raw)));
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/games/ca-coute-combien/scoring.ts src/games/ca-coute-combien/test/scoring.test.ts
git commit -m "feat(ca-coute-combien): add round scoring formula"
```

---

### Task 3: `pool.ts` — shuffle + anti-repeat draw (TDD)

**Files:**
- Create: `src/games/ca-coute-combien/pool.ts`
- Test: `src/games/ca-coute-combien/test/pool.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/games/ca-coute-combien/test/pool.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { shuffle, drawRound } from "../pool.ts";

const ITEMS = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

test("shuffle returns all the same elements, in some order", () => {
  const result = shuffle(ITEMS);
  const sortById = (arr: { id: string }[]) => [...arr].sort((a, b) => a.id.localeCompare(b.id));
  assert.deepEqual(sortById(result), sortById(ITEMS));
});

test("shuffle does not mutate the input array", () => {
  const copy = [...ITEMS];
  shuffle(ITEMS);
  assert.deepEqual(ITEMS, copy);
});

test("drawRound picks only unseen items when enough are available", () => {
  const { round, updatedSeenIds } = drawRound(ITEMS, ["a"], 2);
  assert.equal(round.length, 2);
  assert.ok(round.every((item) => item.id !== "a"));
  assert.deepEqual(updatedSeenIds.sort(), ["a", ...round.map((i) => i.id)].sort());
});

test("drawRound cycles the pool when not enough unseen items remain", () => {
  const { round, updatedSeenIds } = drawRound(ITEMS, ["a", "b", "c"], 2);
  assert.equal(round.length, 2);
  assert.ok(round.some((item) => item.id === "d"));
  assert.equal(updatedSeenIds.length, 2);
});

test("drawRound never repeats an item within the same round", () => {
  const { round } = drawRound(ITEMS, ["a", "b", "c"], 3);
  const ids = round.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../pool.ts'`.

- [ ] **Step 3: Write the implementation**

Create `src/games/ca-coute-combien/pool.ts`:

```ts
export interface PoolItem {
  id: string;
}

export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function drawRound<T extends PoolItem>(
  items: readonly T[],
  seenIds: readonly string[],
  roundSize: number,
): { round: T[]; updatedSeenIds: string[] } {
  const unseen = shuffle(items.filter((item) => !seenIds.includes(item.id)));
  const round = unseen.slice(0, roundSize);

  if (round.length === roundSize) {
    return { round, updatedSeenIds: [...seenIds, ...round.map((item) => item.id)] };
  }

  // Pool exhausted mid-draw: start a fresh cycle, refill the remainder from
  // the full pool (excluding what's already picked, so nothing repeats
  // within the same round), and reset seenIds to just this round's picks.
  const pickedIds = new Set(round.map((item) => item.id));
  const freshPool = shuffle(items.filter((item) => !pickedIds.has(item.id)));
  round.push(...freshPool.slice(0, roundSize - round.length));

  return { round, updatedSeenIds: round.map((item) => item.id) };
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS — all 5 tests green (11 total across both files).

- [ ] **Step 5: Commit**

```bash
git add src/games/ca-coute-combien/pool.ts src/games/ca-coute-combien/test/pool.test.ts
git commit -m "feat(ca-coute-combien): add shuffle and anti-repeat round draw"
```

**Note for later tasks:** with exactly 10 starter items and `ROUND_COUNT = 10` (Task 5/7), every game draws all 10 items — anti-repeat has no visible effect until the pool grows beyond 10 in a later content wave. This is expected, not a bug.

---

### Task 4: `comments.ts` — sarcastic comment bank (TDD)

**Files:**
- Create: `src/games/ca-coute-combien/comments.ts`
- Test: `src/games/ca-coute-combien/test/comments.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/games/ca-coute-combien/test/comments.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { ROUND_COMMENTS, pickRoundComment, CLOSING_COMMENTS, pickClosingComment } from "../comments.ts";

test("pickRoundComment for a perfect score uses the top tier", () => {
  const comment = pickRoundComment(1000);
  assert.ok(ROUND_COMMENTS[0].lines.includes(comment));
});

test("pickRoundComment for a zero score uses the bottom tier", () => {
  const comment = pickRoundComment(0);
  const bottomTier = ROUND_COMMENTS[ROUND_COMMENTS.length - 1];
  assert.ok(bottomTier.lines.includes(comment));
});

test("pickClosingComment for a perfect total uses the top tier", () => {
  const comment = pickClosingComment(10000);
  assert.ok(CLOSING_COMMENTS[0].lines.includes(comment));
});

test("pickClosingComment for a zero total uses the bottom tier", () => {
  const comment = pickClosingComment(0);
  const bottomTier = CLOSING_COMMENTS[CLOSING_COMMENTS.length - 1];
  assert.ok(bottomTier.lines.includes(comment));
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../comments.ts'`.

- [ ] **Step 3: Write the implementation**

Create `src/games/ca-coute-combien/comments.ts`:

```ts
interface CommentTier {
  min: number;
  lines: string[];
}

export const ROUND_COMMENTS: CommentTier[] = [
  {
    min: 950,
    lines: [
      "Radar à prix intégré, sérieux.",
      "Précision chirurgicale. On se calme.",
      "T'as un abonnement à la vraie vie ou quoi ?",
    ],
  },
  {
    min: 800,
    lines: [
      "Très solide, tu sens le marché.",
      "Presque trop bon pour être honnête.",
      "Le vendeur t'aurait embauché direct.",
    ],
  },
  {
    min: 600,
    lines: [
      "Correct, sans plus. Tu tâtonnes bien.",
      "Dans le bon quartier, pas dans la bonne rue.",
      "On sent l'effort. Ça paie un peu.",
    ],
  },
  {
    min: 350,
    lines: [
      "Bon, on va dire que t'as tenté quelque chose.",
      "Ça sent le chiffre lancé en l'air.",
      "Un peu au hasard, avoue.",
    ],
  },
  {
    min: 150,
    lines: [
      "Aïe. Tu vis sur une autre planète niveau prix.",
      "Alors là, non.",
      "Le porte-monnaie a dû trembler en lisant ça.",
    ],
  },
  {
    min: 0,
    lines: [
      "Au doigt mouillé, littéralement.",
      "Tu confonds peut-être avec le prix d'un pays entier.",
      "C'est pas grave, respire.",
    ],
  },
];

export function pickRoundComment(score: number): string {
  const tier = ROUND_COMMENTS.find((t) => score >= t.min)!;
  return tier.lines[Math.floor(Math.random() * tier.lines.length)];
}

export const CLOSING_COMMENTS: CommentTier[] = [
  {
    min: 8500,
    lines: [
      "Tu ferais un excellent commissaire-priseur.",
      "Sérieusement, tu bosses dans l'estimation ou c'est un don ?",
    ],
  },
  {
    min: 6000,
    lines: [
      "Bon niveau, tu as le sens des étiquettes.",
      "Pas mal du tout, tu sors gagnant de ce magasin imaginaire.",
    ],
  },
  {
    min: 3500,
    lines: [
      "Moyen, mais on a vu pire au rayon estimation.",
      "Ça se discute, comme au marché.",
    ],
  },
  {
    min: 0,
    lines: [
      "Radar à prix cassé. Direction le stage chez un antiquaire.",
      "Tu ferais un mauvais commissaire-priseur.",
    ],
  },
];

export function pickClosingComment(totalScore: number): string {
  const tier = CLOSING_COMMENTS.find((t) => totalScore >= t.min)!;
  return tier.lines[Math.floor(Math.random() * tier.lines.length)];
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS — all 4 tests green (15 total across all three test files).

- [ ] **Step 5: Commit**

```bash
git add src/games/ca-coute-combien/comments.ts src/games/ca-coute-combien/test/comments.test.ts
git commit -m "feat(ca-coute-combien): add sarcastic comment banks"
```

---

### Task 5: Data — `items.ts` and `photo-credits.ts`

**Files:**
- Create: `src/games/ca-coute-combien/items.ts`
- Create: `src/games/ca-coute-combien/photo-credits.ts`

These are static data, not logic — no tests. Photos referenced here already exist on disk at `public/photos/ca-coute-combien/*.webp` (sourced from Wikimedia Commons, free-licensed, downloaded and converted to webp in the same session that wrote this plan).

- [ ] **Step 1: Create the items data file**

Create `src/games/ca-coute-combien/items.ts`:

```ts
export interface Item {
  id: string;
  nom: string;
  photo: string;
  prix: number;
}

export const ITEMS: Item[] = [
  {
    id: "ticket-metro-paris",
    nom: "Un ticket de métro à l'unité, à Paris",
    photo: "/photos/ca-coute-combien/ticket-metro-paris.webp",
    prix: 2.15,
  },
  {
    id: "pizza-napoli",
    nom: "Une pizza margherita dans une pizzeria historique de Naples",
    photo: "/photos/ca-coute-combien/pizza-napoli.webp",
    prix: 5,
  },
  {
    id: "big-mac",
    nom: "Un Big Mac, menu solo, en France",
    photo: "/photos/ca-coute-combien/big-mac.webp",
    prix: 5.9,
  },
  {
    id: "cabane-arbre",
    nom: "Une nuit dans une cabane perchée dans les arbres",
    photo: "/photos/ca-coute-combien/cabane-arbre.webp",
    prix: 180,
  },
  {
    id: "san-marco-cafe",
    nom: "Un café en terrasse sur la Piazza San Marco, à Venise",
    photo: "/photos/ca-coute-combien/san-marco-cafe.webp",
    prix: 13,
  },
  {
    id: "icehotel",
    nom: "Une nuit dans une chambre de glace à l'Icehotel, en Suède",
    photo: "/photos/ca-coute-combien/icehotel.webp",
    prix: 400,
  },
  {
    id: "monaco-gp-tribune",
    nom: "Une place en tribune pour les 3 jours du Grand Prix de Monaco",
    photo: "/photos/ca-coute-combien/monaco-gp-tribune.webp",
    prix: 990,
  },
  {
    id: "truffe-alba",
    nom: "Une truffe blanche d'Alba, les 100 grammes en pleine saison",
    photo: "/photos/ca-coute-combien/truffe-alba.webp",
    prix: 450,
  },
  {
    id: "burj-al-arab",
    nom: "Une nuit dans la suite la moins chère du Burj Al Arab, à Dubaï",
    photo: "/photos/ca-coute-combien/burj-al-arab.webp",
    prix: 1900,
  },
  {
    id: "yacht-saint-tropez",
    nom: "Une journée de location d'un yacht à Saint-Tropez",
    photo: "/photos/ca-coute-combien/yacht-saint-tropez.webp",
    prix: 3500,
  },
];
```

- [ ] **Step 2: Create the photo credits file**

Every photo is free-licensed but not all are CC0 — CC BY / CC BY-SA require attribution. This file records it. Create `src/games/ca-coute-combien/photo-credits.ts`:

```ts
export interface PhotoCredit {
  id: string;
  author: string;
  license: string;
  sourceUrl: string;
}

export const PHOTO_CREDITS: PhotoCredit[] = [
  {
    id: "ticket-metro-paris",
    author: "Tangopaso",
    license: "Domaine public",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Ticket_metro_Paris_recto_%26_verso.jpg",
  },
  {
    id: "pizza-napoli",
    author: "Fabryx98",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Pizza-napoletana.jpg",
  },
  {
    id: "big-mac",
    author: "rob_rob2001",
    license: "CC BY-SA 2.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Big_Mac_47.jpg",
  },
  {
    id: "cabane-arbre",
    author: "Mgwalter",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Cashie_River_Treehouses_Windsor,_NC,_USA.jpg",
  },
  {
    id: "san-marco-cafe",
    author: "Tiia Monto",
    license: "CC BY-SA 3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Piazza_San_Marco,_Venice.jpg",
  },
  {
    id: "icehotel",
    author: "Stephan Herz",
    license: "CC BY 2.5",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Icehotel-se-04.JPG",
  },
  {
    id: "monaco-gp-tribune",
    author: "Abxbay",
    license: "CC BY-SA 3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Monaco_preparing_for_grand_prix.JPG",
  },
  {
    id: "truffe-alba",
    author: "Mortazavifar",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:White-truffle-pic.jpg",
  },
  {
    id: "burj-al-arab",
    author: "Yacine Hary",
    license: "CC BY 2.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Burj_Al_Arab_and_Jumeirah_Beach_(9601659067).jpg",
  },
  {
    id: "yacht-saint-tropez",
    author: "dronepicr",
    license: "CC BY 2.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Yachts_at_the_port_of_Saint-Tropez,_France_(52723273867).jpg",
  },
];
```

- [ ] **Step 3: Confirm the referenced photo files exist**

Run: `ls "public/photos/ca-coute-combien"`
Expected: 10 `.webp` files, one per `id` above (`ticket-metro-paris.webp`, `pizza-napoli.webp`, `big-mac.webp`, `cabane-arbre.webp`, `san-marco-cafe.webp`, `icehotel.webp`, `monaco-gp-tribune.webp`, `truffe-alba.webp`, `burj-al-arab.webp`, `yacht-saint-tropez.webp`).

- [ ] **Step 4: Commit**

```bash
git add src/games/ca-coute-combien/items.ts src/games/ca-coute-combien/photo-credits.ts public/photos/ca-coute-combien public/tiles/prix.webp
git commit -m "feat(ca-coute-combien): add starter item pool and photo credits"
```

---

### Task 6: Game page markup and styles

**Files:**
- Create: `games/ca-coute-combien/index.html`
- Create: `src/games/ca-coute-combien/game.css`

- [ ] **Step 1: Create the HTML**

Create `games/ca-coute-combien/index.html`:

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>%F0%9F%92%B8</text></svg>" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400..700&family=VT323&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/src/games/ca-coute-combien/game.css" />
    <title>Ça coûte combien ?! — Le Petit Prince</title>
  </head>
  <body>
    <a class="back-link" href="/">← le petit prince</a>

    <main>
      <section id="screen-intro">
        <h1 class="title">Ça coûte combien ?!</h1>
        <p class="subtitle">10 objets et expériences insolites. Devine leur vrai prix, le plus précisément possible.</p>
        <p class="record">Record : <span id="record-value">0</span> / 10 000</p>
        <button id="btn-start" class="btn-main">Jouer</button>
        <details class="credits">
          <summary>Crédits photos</summary>
          <ul id="photo-credits" class="credits-list"></ul>
        </details>
      </section>

      <section id="screen-round" class="hidden">
        <p class="round-counter">Manche <span id="round-index">1</span> / 10</p>
        <div class="polaroid">
          <img id="round-photo" class="round-photo" src="" alt="" />
        </div>
        <h2 id="round-name" class="round-name"></h2>

        <form id="guess-form" class="guess-form">
          <label for="guess-input">Ton estimation (€)</label>
          <input id="guess-input" type="number" min="0" step="0.01" required autocomplete="off" />
          <button type="submit" class="btn-main">Valider</button>
        </form>

        <div id="round-result" class="hidden">
          <p id="round-comment" class="round-comment"></p>
          <p id="round-price" class="round-price"></p>
          <p id="round-score" class="round-score"></p>
          <button id="btn-next" class="btn-main">Manche suivante</button>
        </div>
      </section>

      <section id="screen-recap" class="hidden">
        <h2 class="title">Partie terminée !</h2>
        <p id="recap-total" class="recap-total"></p>
        <p id="recap-best" class="recap-line"></p>
        <p id="recap-worst" class="recap-line"></p>
        <p id="recap-comment" class="recap-comment"></p>
        <p id="recap-record" class="recap-record"></p>
        <button id="btn-replay" class="btn-main">Rejouer</button>
      </section>
    </main>

    <script type="module" src="/src/games/ca-coute-combien/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Create the stylesheet**

Create `src/games/ca-coute-combien/game.css`:

```css
:root {
  --ink: #17171b;
  --card: #fffdf4;
  --pink: #ff5c8a;
  --teal: #1fc7a8;
  --purple: #6c63ff;
  --yellow: #ffc93c;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: #f6efdd;
  color: var(--ink);
  font-family: "VT323", "Courier New", monospace;
  font-size: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px 60px;
}

.back-link {
  align-self: flex-start;
  color: var(--ink);
  text-decoration: none;
  font-family: "Pixelify Sans", monospace;
  margin-bottom: 20px;
}
.back-link:hover {
  color: var(--pink);
}

main {
  width: min(520px, 100%);
}

.hidden {
  display: none;
}

.title {
  font-family: "Pixelify Sans", monospace;
  font-size: 42px;
  text-align: center;
  text-shadow: 4px 4px 0 var(--yellow);
  margin: 0 0 12px;
}

.subtitle,
.round-counter {
  text-align: center;
  color: #4a453c;
}

.record,
.recap-record {
  text-align: center;
  font-size: 22px;
}

.btn-main {
  display: block;
  margin: 20px auto 0;
  padding: 12px 28px;
  background: var(--yellow);
  color: var(--ink);
  font-family: "Pixelify Sans", monospace;
  font-size: 20px;
  border: 3px solid var(--ink);
  border-radius: 6px;
  box-shadow: 4px 4px 0 var(--ink);
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.btn-main:hover {
  box-shadow: 6px 6px 0 var(--pink);
  transform: translate(-2px, -2px);
}

.credits {
  margin-top: 30px;
  font-size: 16px;
}
.credits summary {
  cursor: pointer;
}
.credits-list {
  list-style: none;
  padding: 0;
  margin: 10px 0 0;
}
.credits-list li {
  margin-bottom: 4px;
}
.credits-list a {
  color: var(--purple);
}

.polaroid {
  width: 260px;
  margin: 20px auto 10px;
  padding: 10px 10px 26px;
  background: var(--card);
  box-shadow: 0 0 0 3px var(--ink), 4px 6px 0 var(--purple);
  position: relative;
}
.polaroid::after {
  content: "";
  position: absolute;
  inset: 10px 10px 26px 10px;
  background: repeating-linear-gradient(
    0deg,
    rgba(23, 23, 27, 0.12) 0px,
    rgba(23, 23, 27, 0.12) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
}
.round-photo {
  width: 100%;
  height: 190px;
  object-fit: cover;
  display: block;
}

.round-name {
  font-family: "Pixelify Sans", monospace;
  font-size: 24px;
  text-align: center;
  margin: 0 0 16px;
}

.guess-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.guess-form label {
  font-size: 18px;
}
.guess-form input {
  width: 160px;
  padding: 8px 10px;
  font-family: "VT323", monospace;
  font-size: 22px;
  border: 3px solid var(--ink);
  border-radius: 6px;
  text-align: center;
}

.round-comment {
  font-family: "Pixelify Sans", monospace;
  font-size: 22px;
  color: var(--pink);
  text-align: center;
}
.round-price,
.round-score {
  font-size: 20px;
  text-align: center;
}

.recap-total {
  text-align: center;
  font-family: "Pixelify Sans", monospace;
  font-size: 28px;
  text-shadow: 3px 3px 0 var(--teal);
}
.recap-line {
  text-align: center;
}
.recap-comment {
  text-align: center;
  font-style: italic;
  color: var(--purple);
  margin: 14px 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add games/ca-coute-combien/index.html src/games/ca-coute-combien/game.css
git commit -m "feat(ca-coute-combien): add game page markup and styles"
```

---

### Task 7: `main.ts` — wire the game together

**Files:**
- Create: `src/games/ca-coute-combien/main.ts`

- [ ] **Step 1: Write the implementation**

Create `src/games/ca-coute-combien/main.ts`:

```ts
import { ITEMS, type Item } from "./items";
import { PHOTO_CREDITS } from "./photo-credits";
import { drawRound } from "./pool";
import { computeRoundScore } from "./scoring";
import { pickRoundComment, pickClosingComment } from "./comments";

const ROUND_COUNT = 10;
const RECORD_KEY = "ca-coute-combien-record";
const SEEN_KEY = "ca-coute-combien-seen";

const screenIntro = document.getElementById("screen-intro")!;
const screenRound = document.getElementById("screen-round")!;
const screenRecap = document.getElementById("screen-recap")!;

const recordValueEl = document.getElementById("record-value")!;
const creditsEl = document.getElementById("photo-credits")!;
const btnStart = document.getElementById("btn-start")!;

const roundIndexEl = document.getElementById("round-index")!;
const roundPhotoEl = document.getElementById("round-photo") as HTMLImageElement;
const roundNameEl = document.getElementById("round-name")!;
const guessForm = document.getElementById("guess-form") as HTMLFormElement;
const guessInput = document.getElementById("guess-input") as HTMLInputElement;
const roundResultEl = document.getElementById("round-result")!;
const roundCommentEl = document.getElementById("round-comment")!;
const roundPriceEl = document.getElementById("round-price")!;
const roundScoreEl = document.getElementById("round-score")!;
const btnNext = document.getElementById("btn-next")!;

const recapTotalEl = document.getElementById("recap-total")!;
const recapBestEl = document.getElementById("recap-best")!;
const recapWorstEl = document.getElementById("recap-worst")!;
const recapCommentEl = document.getElementById("recap-comment")!;
const recapRecordEl = document.getElementById("recap-record")!;
const btnReplay = document.getElementById("btn-replay")!;

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

let record = Number(localStorage.getItem(RECORD_KEY) ?? "0");
let seenIds: string[] = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");

let round: Item[] = [];
let roundIndex = 0;
let roundScores: number[] = [];

function showScreen(screen: HTMLElement) {
  for (const s of [screenIntro, screenRound, screenRecap]) {
    s.classList.toggle("hidden", s !== screen);
  }
}

function renderCredits() {
  creditsEl.innerHTML = PHOTO_CREDITS.map(
    (c) => `<li><a href="${c.sourceUrl}" target="_blank" rel="noopener">${c.author}</a> — ${c.license}</li>`,
  ).join("");
}

function startGame() {
  const draw = drawRound(ITEMS, seenIds, ROUND_COUNT);
  round = draw.round;
  seenIds = draw.updatedSeenIds;
  localStorage.setItem(SEEN_KEY, JSON.stringify(seenIds));

  roundIndex = 0;
  roundScores = [];
  showRound();
  showScreen(screenRound);
}

function showRound() {
  const item = round[roundIndex];
  roundIndexEl.textContent = String(roundIndex + 1);
  roundPhotoEl.src = item.photo;
  roundPhotoEl.alt = item.nom;
  roundNameEl.textContent = item.nom;
  guessInput.value = "";
  roundResultEl.classList.add("hidden");
  guessForm.classList.remove("hidden");
  guessInput.focus();
}

function submitGuess(event: SubmitEvent) {
  event.preventDefault();
  const item = round[roundIndex];
  const guess = Number(guessInput.value);
  const score = computeRoundScore(guess, item.prix);
  roundScores.push(score);

  roundCommentEl.textContent = pickRoundComment(score);
  roundPriceEl.textContent = `Prix réel : ${euros.format(item.prix)} (ton estimation : ${euros.format(guess)})`;
  roundScoreEl.textContent = `${score} / 1000 points`;

  guessForm.classList.add("hidden");
  roundResultEl.classList.remove("hidden");
}

function nextRound() {
  roundIndex += 1;
  if (roundIndex >= ROUND_COUNT) {
    finishGame();
    return;
  }
  showRound();
}

function finishGame() {
  const total = roundScores.reduce((sum, s) => sum + s, 0);
  const bestIndex = roundScores.indexOf(Math.max(...roundScores));
  const worstIndex = roundScores.indexOf(Math.min(...roundScores));

  recapTotalEl.textContent = `Score total : ${total} / 10 000`;
  recapBestEl.textContent = `Meilleure manche : ${round[bestIndex].nom} (${roundScores[bestIndex]} pts)`;
  recapWorstEl.textContent = `Pire manche : ${round[worstIndex].nom} (${roundScores[worstIndex]} pts)`;
  recapCommentEl.textContent = pickClosingComment(total);

  if (total > record) {
    record = total;
    localStorage.setItem(RECORD_KEY, String(record));
  }
  recapRecordEl.textContent = `Record : ${record} / 10 000`;

  showScreen(screenRecap);
}

btnStart.addEventListener("click", startGame);
guessForm.addEventListener("submit", submitGuess);
btnNext.addEventListener("click", nextRound);
btnReplay.addEventListener("click", startGame);

recordValueEl.textContent = String(record);
renderCredits();

export {};
```

- [ ] **Step 2: Type-check the file**

Run: `npx tsc --noEmit`
Expected: No errors. (If errors appear, they're almost always a missing `!` non-null assertion or a wrong `as` cast — fix and re-run.)

- [ ] **Step 3: Commit**

```bash
git add src/games/ca-coute-combien/main.ts
git commit -m "feat(ca-coute-combien): wire game flow (start, rounds, recap, record)"
```

---

### Task 8: Register the game on the site

**Files:**
- Modify: `index.html` (site root)
- Modify: `vite.config.ts`

- [ ] **Step 1: Add the home page tile**

In `index.html`, inside `<main class="grid">`, add this tile immediately before the `tile-incoming` placeholder div:

```html
<a class="tile" href="/games/ca-coute-combien/">
  <span class="badge">NOUVEAU</span>
  <img class="tile-art" src="/tiles/prix.webp" alt="" />
  <h2 class="tile-name">Ça coûte combien ?!</h2>
</a>
```

- [ ] **Step 2: Register the build entry**

In `vite.config.ts`, inside `build.rollupOptions.input`, add:

```ts
caCouteCombien: resolve(__dirname, "games/ca-coute-combien/index.html"),
```

- [ ] **Step 3: Verify the production build picks it up**

Run: `npm run build`
Expected: Build succeeds, and `dist/games/ca-coute-combien/index.html` exists.

Run: `ls dist/games/ca-coute-combien/index.html`
Expected: file listed, no "No such file" error.

- [ ] **Step 4: Commit**

```bash
git add index.html vite.config.ts
git commit -m "feat: add Ça coûte combien tile to the home page and build"
```

---

### Task 9: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`
Expected: All tests pass (15 tests across `scoring.test.ts`, `pool.test.ts`, `comments.test.ts`).

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`
Expected: Vite prints a local URL (e.g. `http://localhost:5173`).

- [ ] **Step 3: Play a full game in the browser**

Open the printed URL, click the "Ça coûte combien ?!" tile (or go directly to `/games/ca-coute-combien/`), and play through all 10 rounds. Check:
- Each round shows a photo (polaroid + scanlines look), an item name, and a numeric input.
- Submitting a guess shows a comment, the real price, your guess, and a score out of 1000.
- After round 10, the recap screen shows total score, best/worst round, a closing comment, and the record.
- Reload the page: the record persists (shown on the intro screen) and playing again does not repeat the same round order twice in a row in the exact same sequence (order is reshuffled).
- "Crédits photos" on the intro screen expands and lists all 10 authors with working links.

- [ ] **Step 4: Fix anything broken, then re-run Step 1**

If any issue surfaces, fix it in the relevant file from Tasks 2–8, re-run `npm test`, and re-verify manually before proceeding.

- [ ] **Step 5: Final commit (only if fixes were made in Step 4)**

```bash
git add -A
git commit -m "fix(ca-coute-combien): address issues found in manual playtest"
```

---

## Explicitly out of scope for this plan

- Growing the pool beyond 10 items (next content wave — data-only, no code changes needed beyond appending to `ITEMS`/`PHOTO_CREDITS`).
- A "source" field for prices (deferred per the design spec).
- Any visual polish beyond what's specified (no additional animations, no sound).
