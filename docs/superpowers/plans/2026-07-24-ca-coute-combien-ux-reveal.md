# Ça coûte combien ?! — animations de révélation & refonte photo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the instant, static result display in the "Ça coûte combien ?!" round screen with an animated reveal (counting score/price, typewriter comment), remove the polaroid photo frame in favor of a larger properly-proportioned photo with an entrance animation, and switch numeric text to a more legible font.

**Architecture:** A new pure/testable module `reveal.ts` provides easing/interpolation/typewriter-timing math plus thin `requestAnimationFrame`-driven DOM helpers (`startCountUp`, `startTypewrite`, `cancelAllReveals`) that `main.ts` calls from `submitGuess()` and `showRound()`. CSS changes in `game.css` handle the photo frame removal, entrance animation, and numeric font. No changes to `items.ts`, `photo-credits.ts`, `scoring.ts`, `pool.ts`, or `comments.ts`.

**Tech Stack:** Vanilla TypeScript + CSS (no new dependencies), `node:test` for the pure timing functions, following the existing conventions in `src/games/ca-coute-combien/`.

Spec: `docs/superpowers/specs/2026-07-24-ca-coute-combien-ux-design.md`

Repo: `C:\Users\adassonville-grosbor\Desktop\Claude Code\Le Petit Prince`, branch `feat/ca-coute-combien-ux-reveal` (already created off master, spec commit `6df9ecf` already on it).

Workflow rule for this repo (do not violate): never push/merge to `master` directly — this task ends with the branch pushed and a PR opened, not merged.

---

### Task 1: `reveal.ts` — easing and interpolation (TDD)

**Files:**
- Create: `src/games/ca-coute-combien/reveal.ts`
- Test: `src/games/ca-coute-combien/test/reveal.test.ts`

- [ ] **Step 1: Write the failing tests for `easeOutCubic` and `interpolate`**

Create `src/games/ca-coute-combien/test/reveal.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { easeOutCubic, interpolate, visibleCharacterCount } from "../reveal.ts";

test("easeOutCubic returns 0 at t=0", () => {
  assert.equal(easeOutCubic(0), 0);
});

test("easeOutCubic returns 1 at t=1", () => {
  assert.equal(easeOutCubic(1), 1);
});

test("easeOutCubic clamps values above 1", () => {
  assert.equal(easeOutCubic(1.5), 1);
});

test("easeOutCubic clamps values below 0", () => {
  assert.equal(easeOutCubic(-0.2), 0);
});

test("easeOutCubic is not linear (front-loaded easing)", () => {
  // ease-out should be further along than linear at the midpoint
  assert.ok(easeOutCubic(0.5) > 0.5);
});

test("interpolate at progress 0 returns the start value", () => {
  assert.equal(interpolate(0, 100, 0), 0);
});

test("interpolate at progress 1 returns the end value", () => {
  assert.equal(interpolate(0, 100, 1), 100);
});

test("interpolate at progress 0.5 is the linear midpoint", () => {
  assert.equal(interpolate(0, 100, 0.5), 50);
});

test("interpolate handles a decreasing range", () => {
  assert.equal(interpolate(10, 5, 0.5), 7.5);
});

test("interpolate works for large values (e.g. an 800 million euro item)", () => {
  assert.equal(interpolate(0, 800_000_000, 1), 800_000_000);
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../reveal.ts'` (the file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/games/ca-coute-combien/reveal.ts`:

```ts
export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 3);
}

export function interpolate(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}
```

- [ ] **Step 4: Run the tests and confirm the easing/interpolate tests pass**

Run: `npm test`
Expected: the 10 `easeOutCubic`/`interpolate` tests PASS, the `visibleCharacterCount` tests still FAIL (not implemented yet — expected at this point).

- [ ] **Step 5: Commit**

```bash
git add src/games/ca-coute-combien/reveal.ts src/games/ca-coute-combien/test/reveal.test.ts
git commit -m "feat(ca-coute-combien): add easing/interpolation helpers for reveal animations"
```

---

### Task 2: `reveal.ts` — typewriter character-count timing (TDD)

**Files:**
- Modify: `src/games/ca-coute-combien/reveal.ts`
- Modify: `src/games/ca-coute-combien/test/reveal.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/games/ca-coute-combien/test/reveal.test.ts` (below the existing tests):

```ts
test("visibleCharacterCount shows nothing at elapsed=0", () => {
  assert.equal(visibleCharacterCount("bonjour", 0, 30), 0);
});

test("visibleCharacterCount shows characters proportional to elapsed time", () => {
  assert.equal(visibleCharacterCount("bonjour", 89, 30), 2);
});

test("visibleCharacterCount clamps to the text length", () => {
  assert.equal(visibleCharacterCount("bonjour", 10_000, 30), 7);
});

test("visibleCharacterCount shows the full text immediately when msPerChar is 0", () => {
  assert.equal(visibleCharacterCount("bonjour", 50, 0), 7);
});

test("visibleCharacterCount handles an empty string", () => {
  assert.equal(visibleCharacterCount("", 500, 30), 0);
});
```

- [ ] **Step 2: Run the tests and confirm the new ones fail**

Run: `npm test`
Expected: FAIL — `visibleCharacterCount is not a function` (or import error).

- [ ] **Step 3: Write the implementation**

Add to `src/games/ca-coute-combien/reveal.ts`:

```ts
export function visibleCharacterCount(text: string, elapsedMs: number, msPerChar: number): number {
  if (msPerChar <= 0) return text.length;
  return Math.min(text.length, Math.floor(elapsedMs / msPerChar));
}
```

- [ ] **Step 4: Run the tests and confirm all pass**

Run: `npm test`
Expected: PASS — all 15 tests in `reveal.test.ts` green (the existing `scoring.test.ts`/`pool.test.ts`/`comments.test.ts` still have their own 15, for 30 total across the suite).

- [ ] **Step 5: Commit**

```bash
git add src/games/ca-coute-combien/reveal.ts src/games/ca-coute-combien/test/reveal.test.ts
git commit -m "feat(ca-coute-combien): add typewriter character-count timing helper"
```

---

### Task 3: `reveal.ts` — DOM-driving reveal helpers (count-up, typewriter, cancellation)

These are thin `requestAnimationFrame`/`setTimeout` wrappers around the pure functions from Tasks 1-2. They touch the DOM and browser timing APIs, so they are not covered by `node:test` (consistent with the spec) — verified manually in the browser in Task 6.

**Files:**
- Modify: `src/games/ca-coute-combien/reveal.ts`

- [ ] **Step 1: Add the DOM-driving helpers**

Add to `src/games/ca-coute-combien/reveal.ts` (below the pure functions):

```ts
let activeFrameIds: number[] = [];
let activeTimeoutIds: number[] = [];

export function cancelAllReveals(): void {
  for (const id of activeFrameIds) cancelAnimationFrame(id);
  for (const id of activeTimeoutIds) clearTimeout(id);
  activeFrameIds = [];
  activeTimeoutIds = [];
}

export function startCountUp(
  el: HTMLElement,
  from: number,
  to: number,
  durationMs: number,
  format: (value: number) => string,
): void {
  const start = performance.now();

  function frame(now: number) {
    const progress = Math.min(1, (now - start) / durationMs);
    const value = interpolate(from, to, easeOutCubic(progress));
    el.textContent = format(value);
    if (progress < 1) {
      activeFrameIds.push(requestAnimationFrame(frame));
    }
  }

  activeFrameIds.push(requestAnimationFrame(frame));
}

export function startTypewrite(el: HTMLElement, text: string, msPerChar: number): void {
  const start = performance.now();
  el.textContent = "";

  function frame(now: number) {
    const count = visibleCharacterCount(text, now - start, msPerChar);
    el.textContent = text.slice(0, count);
    if (count < text.length) {
      activeFrameIds.push(requestAnimationFrame(frame));
    }
  }

  activeFrameIds.push(requestAnimationFrame(frame));
}
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

Run: `npm test`
Expected: PASS — same 30 tests as before (these new functions aren't unit tested, but nothing here should break existing tests).

- [ ] **Step 3: Run the build to confirm the new browser APIs typecheck**

Run: `npm run build`
Expected: build succeeds (confirms `HTMLElement`, `requestAnimationFrame`, `performance.now()` etc. resolve correctly against the existing `tsconfig.json`/DOM lib settings).

- [ ] **Step 4: Commit**

```bash
git add src/games/ca-coute-combien/reveal.ts
git commit -m "feat(ca-coute-combien): add DOM-driving count-up/typewriter reveal helpers"
```

---

### Task 4: Wire the reveal animation into `main.ts`

**Files:**
- Modify: `src/games/ca-coute-combien/main.ts`

- [ ] **Step 1: Import the new helpers and add timing constants**

In `src/games/ca-coute-combien/main.ts`, change the import block at the top (currently lines 1-5) to add the `reveal.ts` import, and add two constants right after `RECORD_KEY`/`SEEN_KEY`:

```ts
import { ITEMS, type Item } from "./items";
import { PHOTO_CREDITS } from "./photo-credits";
import { drawRound } from "./pool";
import { computeRoundScore } from "./scoring";
import { pickRoundComment, pickClosingComment } from "./comments";
import { cancelAllReveals, startCountUp, startTypewrite } from "./reveal";

const ROUND_COUNT = 10;
const RECORD_KEY = "ca-coute-combien-record";
const SEEN_KEY = "ca-coute-combien-seen";
const REVEAL_COUNT_DURATION_MS = 800;
const REVEAL_TYPEWRITE_MS_PER_CHAR = 25;
```

- [ ] **Step 2: Add a small delayed-call helper to `reveal.ts`**

`main.ts` needs to start the typewriter only after the count-up animations finish, but the `activeTimeoutIds`/`activeFrameIds` cancellation list from Task 3 is module-private to `reveal.ts`. Add a helper there instead of reaching into its internals.

Add to `src/games/ca-coute-combien/reveal.ts` (below `cancelAllReveals`):

```ts
export function afterDelay(durationMs: number, fn: () => void): void {
  const id = setTimeout(fn, durationMs);
  activeTimeoutIds.push(id);
}
```

- [ ] **Step 3: Update the `main.ts` import to include the new helpers**

Change the import added in Step 1 to:

```ts
import { afterDelay, cancelAllReveals, startCountUp, startTypewrite } from "./reveal";
```

- [ ] **Step 4: Replace the instant result display in `submitGuess` with the animated reveal**

Replace the current `submitGuess` function body:

```ts
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
```

with:

```ts
function submitGuess(event: SubmitEvent) {
  event.preventDefault();
  cancelAllReveals();

  const item = round[roundIndex];
  const guess = Number(guessInput.value);
  const score = computeRoundScore(guess, item.prix);
  roundScores.push(score);

  guessForm.classList.add("hidden");
  roundResultEl.classList.remove("hidden");

  roundScoreEl.textContent = "";
  roundPriceEl.textContent = "";
  roundCommentEl.textContent = "";

  startCountUp(roundScoreEl, 0, score, REVEAL_COUNT_DURATION_MS, (value) => `${Math.round(value)} / 1000 points`);
  startCountUp(
    roundPriceEl,
    0,
    item.prix,
    REVEAL_COUNT_DURATION_MS,
    (value) => `Prix réel : ${euros.format(value)} (ton estimation : ${euros.format(guess)})`,
  );

  afterDelay(REVEAL_COUNT_DURATION_MS, () => {
    startTypewrite(roundCommentEl, pickRoundComment(score), REVEAL_TYPEWRITE_MS_PER_CHAR);
  });
}
```

- [ ] **Step 5: Cancel any in-flight reveal when a new round starts**

In `showRound()`, add a `cancelAllReveals()` call at the very top:

```ts
function showRound() {
  cancelAllReveals();
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
```

- [ ] **Step 6: Run the test suite and build**

Run: `npm test`
Expected: PASS — 30 tests (this task doesn't add new pure functions).

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/games/ca-coute-combien/main.ts src/games/ca-coute-combien/reveal.ts
git commit -m "feat(ca-coute-combien): animate score/price count-up and typewriter comment reveal"
```

---

### Task 5: Photo entrance animation

**Files:**
- Modify: `src/games/ca-coute-combien/main.ts`

- [ ] **Step 1: Retrigger the entrance animation each round**

In `showRound()` (from Task 4, Step 5), add the class toggle right after setting `roundPhotoEl.src`/`alt`:

```ts
function showRound() {
  cancelAllReveals();
  const item = round[roundIndex];
  roundIndexEl.textContent = String(roundIndex + 1);
  roundPhotoEl.src = item.photo;
  roundPhotoEl.alt = item.nom;
  roundNameEl.textContent = item.nom;

  roundPhotoEl.classList.remove("entering");
  void roundPhotoEl.offsetWidth; // force reflow so the animation restarts
  roundPhotoEl.classList.add("entering");

  guessInput.value = "";
  roundResultEl.classList.add("hidden");
  guessForm.classList.remove("hidden");
  guessInput.focus();
}
```

- [ ] **Step 2: Run the build to confirm no typecheck errors**

Run: `npm run build`
Expected: build succeeds. (The `.entering` CSS class doesn't exist yet — that's Task 6 — but this step only needs the TypeScript to compile, which it does since `classList` methods are already typed.)

- [ ] **Step 3: Commit**

```bash
git add src/games/ca-coute-combien/main.ts
git commit -m "feat(ca-coute-combien): retrigger photo entrance animation each round"
```

---

### Task 6: Photo frame CSS — remove polaroid, add sizing + entrance animation

**Files:**
- Modify: `games/ca-coute-combien/index.html`
- Modify: `src/games/ca-coute-combien/game.css`

- [ ] **Step 1: Remove the polaroid wrapper markup**

In `games/ca-coute-combien/index.html`, replace:

```html
        <div class="polaroid">
          <img id="round-photo" class="round-photo" src="" alt="" />
        </div>
```

with:

```html
        <img id="round-photo" class="round-photo" src="" alt="" />
```

- [ ] **Step 2: Remove the polaroid CSS rules and replace the photo sizing/animation rules**

In `src/games/ca-coute-combien/game.css`, remove the `.polaroid` and `.polaroid::after` rules entirely (currently the block starting `.polaroid {` through the closing `}` of `.polaroid::after`).

Replace the existing `.round-photo` rule:

```css
.round-photo {
  width: 100%;
  height: 300px;
  object-fit: cover;
  display: block;
}
```

with:

```css
.round-photo {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 420px;
  margin: 20px auto 16px;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(23, 23, 27, 0.28);
}

.round-photo.entering {
  animation: photo-enter 450ms ease-out;
}

@keyframes photo-enter {
  from {
    opacity: 0;
    transform: scale(1.05);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

- [ ] **Step 3: Visually verify in the dev server**

Run: `npm run dev` (leave it running)

Open the game in a browser, click "Jouer", and confirm:
- The photo shows without the polaroid frame, at a larger size, without odd cropping on a portrait-oriented item.
- A fade+scale-in plays each time a new round's photo appears.

Stop the dev server once confirmed (`Ctrl+C`).

- [ ] **Step 4: Commit**

```bash
git add "games/ca-coute-combien/index.html" src/games/ca-coute-combien/game.css
git commit -m "feat(ca-coute-combien): remove polaroid frame, resize photo, add entrance animation"
```

---

### Task 7: Numeric font — switch to Pixelify Sans

**Files:**
- Modify: `games/ca-coute-combien/index.html`
- Modify: `src/games/ca-coute-combien/game.css`

- [ ] **Step 1: Add the `numeric` class to every element displaying digits**

In `games/ca-coute-combien/index.html`, add `class="numeric"` to these elements (merging with any existing class):

```html
<p class="record">Record : <span id="record-value" class="numeric">0</span> / 10 000</p>
```

```html
<p class="round-counter">Manche <span id="round-index" class="numeric">1</span> / 10</p>
```

```html
<input id="guess-input" class="numeric" type="number" min="0" step="0.01" required autocomplete="off" />
```

```html
<p id="round-price" class="round-price numeric"></p>
<p id="round-score" class="round-score numeric"></p>
```

```html
<p id="recap-record" class="recap-record numeric"></p>
```

- [ ] **Step 2: Add the CSS rule**

In `src/games/ca-coute-combien/game.css`, add near the top (after the `:root` block):

```css
.numeric {
  font-family: "Pixelify Sans", monospace;
}
```

- [ ] **Step 3: Visually verify**

Run: `npm run dev`, play a round with a high-value item (e.g. one of the million-euro art/tech items), and confirm the score, price, round counter, record, and input field render in the more legible font while the sarcastic comment and labels stay in the original retro font.

Stop the dev server (`Ctrl+C`).

- [ ] **Step 4: Commit**

```bash
git add "games/ca-coute-combien/index.html" src/games/ca-coute-combien/game.css
git commit -m "feat(ca-coute-combien): switch numeric displays to a more legible font"
```

---

### Task 8: Full manual verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated check**

Run: `npm test && npm run build`
Expected: 30/30 tests pass, build succeeds.

- [ ] **Step 2: Play a full 10-round game in the browser**

Run: `npm run dev`, open the game, click "Jouer", and play through all 10 rounds, specifically checking:
- The score and price count up smoothly and finish within well under a second even for a very cheap item (e.g. a €2 ticket) and a very expensive one (e.g. an item priced in the hundreds of millions) — both should take about the same time to finish, not a per-digit fixed increment.
- The sarcastic comment always starts typing only after both numbers finish counting, never overlapping or appearing instantly.
- Clicking "Manche suivante" immediately after the reveal starts (without waiting for the animation to finish) does not leave stray text bleeding into the next round — the next round's score/price/comment fields start clean.
- The photo entrance animation plays on every round, including round 1.
- The recap screen and record display still work (`recap-record` uses the new font but the recap flow itself is unchanged).

Stop the dev server (`Ctrl+C`).

- [ ] **Step 3: Fix any issues found, re-run Step 1 and Step 2 until clean**

- [ ] **Step 4: Push the branch and open a PR**

```bash
git push -u origin feat/ca-coute-combien-ux-reveal
gh pr create --repo dassonvilleag-blip/le-petit-prince \
  --title "feat(ca-coute-combien): animations de révélation + refonte photo + police lisible" \
  --body "$(cat <<'EOF'
## Résumé

- Révélation animée à la validation : le score et le prix réel comptent visuellement jusqu'à leur valeur (durée fixe ~800ms quel que soit le montant, donc pas de ralentissement sur les items à plusieurs centaines de millions d'euros), puis la phrase sarcastique s'écrit lettre par lettre.
- Suppression du cadre polaroid : la photo est plus grande, garde ses proportions réelles (plus de recadrage forcé), avec une animation de fondu/zoom à chaque nouvelle manche.
- Les chiffres (score, prix, compteur de manche, record, champ de saisie) passent de VT323 à Pixelify Sans (déjà chargée sur la page) pour rester lisibles — le reste du texte garde VT323.
- Logique de scoring/tirage/contenu strictement inchangée.

Voir le design (`docs/superpowers/specs/2026-07-24-ca-coute-combien-ux-design.md`) et le plan (`docs/superpowers/plans/2026-07-24-ca-coute-combien-ux-reveal.md`).

## Test plan

- [x] `npm test` — 30/30 tests passent (15 existants + 15 nouveaux dans `reveal.test.ts` : easing, interpolation, timing machine à écrire)
- [x] `npm run build` — build de prod OK
- [x] Partie complète jouée en navigateur (10 manches, item bon marché et item à plusieurs centaines de millions, changement de manche pendant une animation en cours, écran de récap)
EOF
)"
```

Do not merge the PR — the human merges `master` themselves.

- [ ] **Step 5: Report back**

Report the PR URL and confirm all verification steps passed.
