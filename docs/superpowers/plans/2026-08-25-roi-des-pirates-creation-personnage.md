# Création de personnage (Le Roi des Pirates, étape 1/3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Au tout début d'une partie, le joueur crée son personnage (prénom avec générateur aléatoire, genre, espèce parmi 5) via un nouveau nœud `creation-personnage`. Le texte narratif existant peut ensuite référencer ce personnage via trois placeholders (`{prenom}`, `{espece}`, `{motM/motF}`), appliqués sur une sélection de nœuds représentative des 3 arcs et des fins.

**Architecture:** Nouveau nœud `creation-personnage` (premier du graphe, `characterForm: true`) affichant un formulaire DOM à la place des boutons de choix habituels. État `player` module-level dans `engine.ts`, réinitialisé à chaque partie (comme `stats`/`flags`), avec retour à `creation-personnage` (pas `intro`) au clic sur "Recommencer". Une fonction `resolvePlayerText()` (nouveau fichier `player.ts`) substitue les placeholders sur le texte déjà résolu par `resolveText()`, donc compatible avec les nœuds à texte conditionnel existants.

**Tech Stack:** TypeScript (`node --experimental-strip-types --test`), pas de framework, DOM natif, Vite pour le dev server.

Référence : `docs/superpowers/specs/2026-08-25-roi-des-pirates-creation-personnage-design.md`.

---

### Task 1: Types — `Gender`, `SpeciesId`, `Player`, `characterForm`

**Files:**
- Modify: `src/games/roi-des-pirates/types.ts:1-6` et `types.ts:66-76`

- [ ] **Step 1: Ajouter les nouveaux types après `Stats`**

Dans `src/games/roi-des-pirates/types.ts`, remplacer :

```ts
export interface Stats {
  force: number;
  notoriete: number;
  equipage: number;
  fruitDuDemon: number;
}
```

par :

```ts
export interface Stats {
  force: number;
  notoriete: number;
  equipage: number;
  fruitDuDemon: number;
}

export type Gender = "homme" | "femme";
export type SpeciesId = "humain" | "geant" | "homme-poisson" | "buccaneer" | "lunarien";

export interface Player {
  name: string;
  gender: Gender;
  species: SpeciesId;
}
```

- [ ] **Step 2: Ajouter `characterForm` sur `StoryNode`**

Dans le même fichier, remplacer :

```ts
export interface StoryNode {
  id: string;
  arc?: ArcId;
  title?: string;
  subtitle: string;
  text: string | ((flags: Set<string>) => string);
  svg: string;
  choices: Choice[];
  isEnding?: true;
  endingId?: EndingId;
}
```

par :

```ts
export interface StoryNode {
  id: string;
  characterForm?: true;
  arc?: ArcId;
  title?: string;
  subtitle: string;
  text: string | ((flags: Set<string>) => string);
  svg: string;
  choices: Choice[];
  isEnding?: true;
  endingId?: EndingId;
}
```

- [ ] **Step 3: Vérifier que le projet compile toujours**

Run: `npx tsc --noEmit -p .` (ou, si pas de `tsconfig.json` à la racine, `npm run build`)
Expected: pas de nouvelle erreur liée à ces types (ils ne sont pas encore utilisés ailleurs).

- [ ] **Step 4: Commit**

```bash
git add src/games/roi-des-pirates/types.ts
git commit -m "feat(roi-des-pirates): ajoute les types Gender/SpeciesId/Player et characterForm"
```

---

### Task 2: Générateur de noms de pirates

**Files:**
- Create: `src/games/roi-des-pirates/names.ts`
- Test: `src/games/roi-des-pirates/test/names.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/games/roi-des-pirates/test/names.test.ts` :

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickRandomName } from "../names.ts";

test("pickRandomName : rng=0 renvoie toujours le premier nom du pool masculin", () => {
  assert.equal(pickRandomName("homme", () => 0), "Gaspard");
});

test("pickRandomName : rng=0 renvoie toujours le premier nom du pool féminin", () => {
  assert.equal(pickRandomName("femme", () => 0), "Isaline");
});

test("pickRandomName : rng proche de 1 renvoie le dernier nom du pool", () => {
  assert.equal(pickRandomName("homme", () => 0.999999), "Kolt");
});

test("pickRandomName : ne renvoie jamais une chaîne vide, quel que soit le genre", () => {
  assert.ok(pickRandomName("homme").length > 0);
  assert.ok(pickRandomName("femme").length > 0);
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npm test`
Expected: FAIL — `Cannot find module '../names.ts'` (le fichier n'existe pas encore).

- [ ] **Step 3: Implémenter `names.ts`**

Créer `src/games/roi-des-pirates/names.ts` :

```ts
import type { Gender } from "./types.ts";

const PIRATE_NAMES_HOMME = [
  "Gaspard",
  "Silas",
  "Talon",
  "Rourke",
  "Draven",
  "Cassius",
  "Oswin",
  "Barrick",
  "Ezra",
  "Kolt",
];

const PIRATE_NAMES_FEMME = [
  "Isaline",
  "Sarah",
  "Maelys",
  "Corvina",
  "Liora",
  "Vesna",
  "Odalys",
  "Rhiannon",
  "Selys",
  "Wilhelmine",
];

export function pickRandomName(gender: Gender, rng: () => number = Math.random): string {
  const pool = gender === "homme" ? PIRATE_NAMES_HOMME : PIRATE_NAMES_FEMME;
  return pool[Math.floor(rng() * pool.length)];
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npm test`
Expected: PASS (les 4 nouveaux tests, plus tous les tests existants).

- [ ] **Step 5: Commit**

```bash
git add src/games/roi-des-pirates/names.ts src/games/roi-des-pirates/test/names.test.ts
git commit -m "feat(roi-des-pirates): générateur de noms de pirates aléatoires"
```

---

### Task 3: Templating joueur — `resolvePlayerText`

**Files:**
- Create: `src/games/roi-des-pirates/player.ts`
- Test: `src/games/roi-des-pirates/test/player.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/games/roi-des-pirates/test/player.test.ts` :

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePlayerText, SPECIES_LABELS, SPECIES_ORDER } from "../player.ts";
import type { Player } from "../types.ts";

const joueurHomme: Player = { name: "Gaspard", gender: "homme", species: "geant" };
const joueurFemme: Player = { name: "Isaline", gender: "femme", species: "lunarien" };

test("resolvePlayerText : remplace {prenom} par le prénom du joueur", () => {
  assert.equal(resolvePlayerText("Bonjour {prenom}.", joueurHomme), "Bonjour Gaspard.");
});

test("resolvePlayerText : remplace {espece} par le libellé accordé au genre", () => {
  assert.equal(resolvePlayerText("Un {espece} passe.", joueurHomme), "Un Géant passe.");
  assert.equal(resolvePlayerText("Une {espece} passe.", joueurFemme), "Une Lunarienne passe.");
});

test("resolvePlayerText : résout {motM/motF} selon le genre", () => {
  assert.equal(resolvePlayerText("Tu es {prêt/prête}.", joueurHomme), "Tu es prêt.");
  assert.equal(resolvePlayerText("Tu es {prêt/prête}.", joueurFemme), "Tu es prête.");
});

test("resolvePlayerText : combine plusieurs placeholders dans un même texte", () => {
  const result = resolvePlayerText("{prenom}, {espece} {prêt/prête} au combat.", joueurFemme);
  assert.equal(result, "Isaline, Lunarienne prête au combat.");
});

test("resolvePlayerText : un texte sans placeholder reste inchangé", () => {
  assert.equal(resolvePlayerText("Rien à substituer ici.", joueurHomme), "Rien à substituer ici.");
});

test("resolvePlayerText : une accolade non refermée reste telle quelle, sans planter", () => {
  assert.equal(resolvePlayerText("Un { orphelin.", joueurHomme), "Un { orphelin.");
});

test("SPECIES_LABELS : couvre exactement les 5 espèces de SPECIES_ORDER", () => {
  assert.deepEqual(Object.keys(SPECIES_LABELS).sort(), [...SPECIES_ORDER].sort());
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npm test`
Expected: FAIL — `Cannot find module '../player.ts'`.

- [ ] **Step 3: Implémenter `player.ts`**

Créer `src/games/roi-des-pirates/player.ts` :

```ts
import type { Player, SpeciesId } from "./types.ts";

export const SPECIES_ORDER: SpeciesId[] = [
  "humain",
  "geant",
  "homme-poisson",
  "buccaneer",
  "lunarien",
];

export const SPECIES_LABELS: Record<SpeciesId, { m: string; f: string }> = {
  humain: { m: "Humain", f: "Humaine" },
  geant: { m: "Géant", f: "Géante" },
  "homme-poisson": { m: "Homme-Poisson", f: "Homme-Poisson" },
  buccaneer: { m: "Buccaneer", f: "Buccaneer" },
  lunarien: { m: "Lunarien", f: "Lunarienne" },
};

export function resolvePlayerText(text: string, player: Player): string {
  let result = text.replaceAll("{prenom}", player.name);
  const speciesLabel = SPECIES_LABELS[player.species][player.gender === "homme" ? "m" : "f"];
  result = result.replaceAll("{espece}", speciesLabel);
  result = result.replace(/\{([^{}/]+)\/([^{}]+)\}/g, (_match, m: string, f: string) =>
    player.gender === "homme" ? m : f,
  );
  return result;
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npm test`
Expected: PASS (les 7 nouveaux tests, plus tous les tests existants).

- [ ] **Step 5: Commit**

```bash
git add src/games/roi-des-pirates/player.ts src/games/roi-des-pirates/test/player.test.ts
git commit -m "feat(roi-des-pirates): templating {prenom}/{espece}/{motM-motF} pour le texte narratif"
```

---

### Task 4: Nœud `creation-personnage` dans `story.ts`

**Files:**
- Modify: `src/games/roi-des-pirates/story.ts:21-30`

- [ ] **Step 1: Insérer le nouveau premier nœud**

Dans `src/games/roi-des-pirates/story.ts`, remplacer :

```ts
export const STORY: StoryNode[] = [
  {
    id: "intro",
    subtitle: "L'appel du large",
    text: "La mer. Elle t'a toujours appelé. Depuis l'enfance sur ce quai de bois vermoulu, tu regardais les voiles disparaître à l'horizon en te disant : un jour, ce sera moi. Ce jour est arrivé. Tu as dix-sept ans. Un couteau à la ceinture, quelques Berry dans la poche, et cette conviction qui brûle dans ta poitrine. Tu deviendras Roi des Pirates. Tu trouveras le One Piece. Personne ne te croit. Parfait.",
    svg: SVG_INTRO,
    choices: [
      { text: "Embarquer", effects: {}, next: "eb-origines" },
    ],
  },
```

par :

```ts
export const STORY: StoryNode[] = [
  {
    id: "creation-personnage",
    characterForm: true,
    subtitle: "Qui es-tu ?",
    text: "Avant de prendre la mer, une dernière chose : qui es-tu ?",
    svg: SVG_INTRO,
    choices: [
      { text: "Embarquer", effects: {}, next: "intro" },
    ],
  },

  {
    id: "intro",
    subtitle: "L'appel du large",
    text: "La mer. Elle t'a toujours appelé. Depuis l'enfance sur ce quai de bois vermoulu, tu regardais les voiles disparaître à l'horizon en te disant : un jour, ce sera moi. Ce jour est arrivé. Tu as dix-sept ans. Un couteau à la ceinture, quelques Berry dans la poche, et cette conviction qui brûle dans ta poitrine. Tu deviendras Roi des Pirates. Tu trouveras le One Piece. Personne ne te croit. Parfait.",
    svg: SVG_INTRO,
    choices: [
      { text: "Embarquer", effects: {}, next: "eb-origines" },
    ],
  },
```

(Le texte de `intro` sera modifié pour utiliser un placeholder à la Task 9 — ne pas y toucher ici.)

- [ ] **Step 2: Vérifier qu'il n'y a pas de régression**

Run: `npm test`
Expected: tous les tests passent — `validateStoryGraph(STORY)` accepte toujours le graphe (le nouveau nœud a un `subtitle`, un choix inconditionnel avec `next: "intro"` qui existe).

- [ ] **Step 3: Commit**

```bash
git add src/games/roi-des-pirates/story.ts
git commit -m "feat(roi-des-pirates): ajoute le nœud creation-personnage en tête du graphe"
```

---

### Task 5: `validateStoryGraph` — exige `creation-personnage` et signale les placeholders mal formés

**Files:**
- Modify: `src/games/roi-des-pirates/engine.ts:49-94`
- Modify: `src/games/roi-des-pirates/test/engine.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/games/roi-des-pirates/test/engine.test.ts`, remplacer la ligne d'import :

```ts
import { resolveDuel, filterChoices, resolveText, describeInjuries, fruitCounters } from "../engine.ts";
import type { Choice } from "../types.ts";
```

par :

```ts
import { resolveDuel, filterChoices, resolveText, describeInjuries, fruitCounters, validateStoryGraph } from "../engine.ts";
import type { Choice, StoryNode } from "../types.ts";
```

Puis ajouter à la fin du fichier :

```ts
test("validateStoryGraph : signale l'absence du nœud creation-personnage", () => {
  const nodes: StoryNode[] = [
    { id: "intro", subtitle: "s", text: "t", svg: "", choices: [], isEnding: true },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.includes("Le nœud creation-personnage est manquant."));
});

test("validateStoryGraph : signale un creation-personnage sans characterForm", () => {
  const nodes: StoryNode[] = [
    { id: "creation-personnage", subtitle: "s", text: "t", svg: "", choices: [], isEnding: true },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.includes("Le nœud creation-personnage doit avoir characterForm: true."));
});

test("validateStoryGraph : signale une accolade de placeholder non refermée dans le texte d'un nœud", () => {
  const nodes: StoryNode[] = [
    { id: "creation-personnage", characterForm: true, subtitle: "s", text: "t", svg: "", choices: [], isEnding: true },
    {
      id: "a",
      subtitle: "s",
      text: "Bonjour { prenom",
      svg: "",
      choices: [{ text: "Continuer", effects: {}, next: "creation-personnage" }],
    },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("accolade de placeholder non refermée dans le texte")));
});

test("validateStoryGraph : signale une accolade non refermée dans le texte d'un choix", () => {
  const nodes: StoryNode[] = [
    { id: "creation-personnage", characterForm: true, subtitle: "s", text: "t", svg: "", choices: [], isEnding: true },
    {
      id: "a",
      subtitle: "s",
      text: "t",
      svg: "",
      choices: [{ text: "Un {prenom mal fermé", effects: {}, next: "creation-personnage" }],
    },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("accolade de placeholder non refermée dans le choix")));
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npm test`
Expected: FAIL — les 4 nouveaux tests échouent (le comportement n'est pas encore implémenté dans `validateStoryGraph`).

- [ ] **Step 3: Implémenter les vérifications**

Dans `src/games/roi-des-pirates/engine.ts`, remplacer :

```ts
export function validateStoryGraph(storyNodes: StoryNode[]): string[] {
  const errors: string[] = [];
  const ids = new Set(storyNodes.map((n) => n.id));
  if (ids.size !== storyNodes.length) {
    errors.push("Des identifiants de nœuds sont dupliqués.");
  }

  for (const node of storyNodes) {
    if (!node.subtitle?.trim()) {
      errors.push(`${node.id}: aucun sous-titre défini.`);
    }

    if (node.isEnding) continue;

    if (node.choices.length === 0) {
      errors.push(`${node.id}: aucun choix défini alors que ce n'est pas une fin.`);
      continue;
    }

    const hasUnconditional = node.choices.some(
      (c) => !c.requiresFlags?.length && !c.forbidsFlags?.length,
    );
    if (!hasUnconditional) {
      errors.push(`${node.id}: aucun choix inconditionnel disponible (risque d'écran bloqué).`);
    }

    for (const choice of node.choices) {
      if (!choice.duel && !choice.eatPendingFruit && !choice.next) {
        errors.push(`${node.id}: le choix "${choice.text}" n'a aucun routage (ni next, ni duel, ni eatPendingFruit).`);
      }

      const targets: string[] = [];
      if (choice.duel) targets.push(choice.duel.win, choice.duel.loseMinor, choice.duel.loseMajor);
      if (choice.eatPendingFruit) targets.push(choice.eatPendingFruit.next);
      if (choice.next) targets.push(choice.next);

      for (const target of targets) {
        if (target !== "__ending__" && !ids.has(target)) {
          errors.push(`${node.id}: la cible "${target}" ne correspond à aucun nœud.`);
        }
      }
    }
  }

  return errors;
}
```

par :

```ts
function hasUnbalancedPlaceholder(text: string): boolean {
  const open = (text.match(/\{/g) ?? []).length;
  const close = (text.match(/\}/g) ?? []).length;
  return open !== close;
}

export function validateStoryGraph(storyNodes: StoryNode[]): string[] {
  const errors: string[] = [];
  const ids = new Set(storyNodes.map((n) => n.id));
  if (ids.size !== storyNodes.length) {
    errors.push("Des identifiants de nœuds sont dupliqués.");
  }

  const creation = storyNodes.find((n) => n.id === "creation-personnage");
  if (!creation) {
    errors.push("Le nœud creation-personnage est manquant.");
  } else if (creation.characterForm !== true) {
    errors.push("Le nœud creation-personnage doit avoir characterForm: true.");
  }

  for (const node of storyNodes) {
    if (!node.subtitle?.trim()) {
      errors.push(`${node.id}: aucun sous-titre défini.`);
    }

    if (typeof node.text === "string" && hasUnbalancedPlaceholder(node.text)) {
      errors.push(`${node.id}: accolade de placeholder non refermée dans le texte.`);
    }

    if (node.isEnding) continue;

    if (node.choices.length === 0) {
      errors.push(`${node.id}: aucun choix défini alors que ce n'est pas une fin.`);
      continue;
    }

    const hasUnconditional = node.choices.some(
      (c) => !c.requiresFlags?.length && !c.forbidsFlags?.length,
    );
    if (!hasUnconditional) {
      errors.push(`${node.id}: aucun choix inconditionnel disponible (risque d'écran bloqué).`);
    }

    for (const choice of node.choices) {
      if (hasUnbalancedPlaceholder(choice.text)) {
        errors.push(`${node.id}: accolade de placeholder non refermée dans le choix "${choice.text}".`);
      }
      if (choice.sub && hasUnbalancedPlaceholder(choice.sub)) {
        errors.push(`${node.id}: accolade de placeholder non refermée dans le sous-texte du choix "${choice.text}".`);
      }

      if (!choice.duel && !choice.eatPendingFruit && !choice.next) {
        errors.push(`${node.id}: le choix "${choice.text}" n'a aucun routage (ni next, ni duel, ni eatPendingFruit).`);
      }

      const targets: string[] = [];
      if (choice.duel) targets.push(choice.duel.win, choice.duel.loseMinor, choice.duel.loseMajor);
      if (choice.eatPendingFruit) targets.push(choice.eatPendingFruit.next);
      if (choice.next) targets.push(choice.next);

      for (const target of targets) {
        if (target !== "__ending__" && !ids.has(target)) {
          errors.push(`${node.id}: la cible "${target}" ne correspond à aucun nœud.`);
        }
      }
    }
  }

  return errors;
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npm test`
Expected: PASS — tous les tests, y compris `story.test.ts` (le vrai `STORY` a bien son nœud `creation-personnage` depuis la Task 4).

- [ ] **Step 5: Commit**

```bash
git add src/games/roi-des-pirates/engine.ts src/games/roi-des-pirates/test/engine.test.ts
git commit -m "feat(roi-des-pirates): validateStoryGraph exige creation-personnage et signale les placeholders mal formés"
```

---

### Task 6: État du joueur dans le moteur + application du templating

**Files:**
- Modify: `src/games/roi-des-pirates/engine.ts:1-2`, `engine.ts:96-100`, `engine.ts:171`, `engine.ts:182-197`, `engine.ts:249-266`

- [ ] **Step 1: Étendre les imports**

Dans `src/games/roi-des-pirates/engine.ts`, remplacer :

```ts
import type { Stats, StoryNode, Choice, EndingId, Fruit, FruitType } from "./types";
import { pickRandomFruit, findEatenFruit } from "./fruits.ts";
```

par :

```ts
import type { Stats, StoryNode, Choice, EndingId, Fruit, FruitType, Player } from "./types";
import { pickRandomFruit, findEatenFruit } from "./fruits.ts";
import { resolvePlayerText } from "./player.ts";
```

- [ ] **Step 2: Ajouter l'état `player`**

Remplacer :

```ts
let nodes: Record<string, StoryNode>;
let stats: Stats;
let currentNodeId: string;
let flags: Set<string>;
let pendingFruit: Fruit | undefined;
```

par :

```ts
let nodes: Record<string, StoryNode>;
let stats: Stats;
let currentNodeId: string;
let flags: Set<string>;
let pendingFruit: Fruit | undefined;
let player: Player;

function defaultPlayer(): Player {
  return { name: "", gender: "homme", species: "humain" };
}
```

- [ ] **Step 3: Appliquer le templating à l'affichage du texte de nœud**

Remplacer :

```ts
  textEl.textContent = resolveText(node.text, flags);
```

par :

```ts
  textEl.textContent = resolvePlayerText(resolveText(node.text, flags), player);
```

- [ ] **Step 4: Appliquer le templating aux choix**

Remplacer :

```ts
  for (const choice of filterChoices(node.choices, flags)) {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    const textSpan = document.createElement("span");
    textSpan.className = "choice-text";
    textSpan.textContent = choice.text;
    btn.appendChild(textSpan);
    if (choice.sub) {
      const subSpan = document.createElement("span");
      subSpan.className = "choice-sub";
      subSpan.textContent = choice.sub;
      btn.appendChild(subSpan);
    }
    btn.addEventListener("click", () => navigate(choice));
    choicesEl.appendChild(btn);
  }
```

par :

```ts
  for (const choice of filterChoices(node.choices, flags)) {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    const textSpan = document.createElement("span");
    textSpan.className = "choice-text";
    textSpan.textContent = resolvePlayerText(choice.text, player);
    btn.appendChild(textSpan);
    if (choice.sub) {
      const subSpan = document.createElement("span");
      subSpan.className = "choice-sub";
      subSpan.textContent = resolvePlayerText(choice.sub, player);
      btn.appendChild(subSpan);
    }
    btn.addEventListener("click", () => navigate(choice));
    choicesEl.appendChild(btn);
  }
```

- [ ] **Step 5: Initialiser et réinitialiser `player`, démarrer sur `creation-personnage`**

Remplacer :

```ts
export function startEngine(storyNodes: StoryNode[]): void {
  nodes = Object.fromEntries(storyNodes.map((n) => [n.id, n]));
  stats = { force: 0, notoriete: 0, equipage: 0, fruitDuDemon: 0 };
  flags = new Set();
  pendingFruit = undefined;
  currentNodeId = "intro";

  const replayBtn = document.getElementById("replay-btn");
  if (replayBtn) {
    replayBtn.addEventListener("click", () => {
      stats = { force: 0, notoriete: 0, equipage: 0, fruitDuDemon: 0 };
      flags = new Set();
      pendingFruit = undefined;
      currentNodeId = "intro";
      renderNode();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  renderNode();
}
```

par :

```ts
export function startEngine(storyNodes: StoryNode[]): void {
  nodes = Object.fromEntries(storyNodes.map((n) => [n.id, n]));
  stats = { force: 0, notoriete: 0, equipage: 0, fruitDuDemon: 0 };
  flags = new Set();
  pendingFruit = undefined;
  player = defaultPlayer();
  currentNodeId = "creation-personnage";

  const replayBtn = document.getElementById("replay-btn");
  if (replayBtn) {
    replayBtn.addEventListener("click", () => {
      stats = { force: 0, notoriete: 0, equipage: 0, fruitDuDemon: 0 };
      flags = new Set();
      pendingFruit = undefined;
      player = defaultPlayer();
      currentNodeId = "creation-personnage";
      renderNode();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  renderNode();
}
```

- [ ] **Step 6: Vérifier qu'il n'y a pas de régression**

Run: `npm test`
Expected: tous les tests passent (aucun test n'exerce encore `startEngine`/`renderNode`, qui dépendent du DOM — c'est cohérent avec la couverture existante du moteur).

- [ ] **Step 7: Commit**

```bash
git add src/games/roi-des-pirates/engine.ts
git commit -m "feat(roi-des-pirates): état du joueur dans le moteur, reset vers creation-personnage"
```

---

### Task 7: Formulaire DOM de création de personnage

**Files:**
- Modify: `src/games/roi-des-pirates/engine.ts` (imports, `renderNode()`, nouvelle fonction `renderCharacterForm`)

- [ ] **Step 1: Étendre les imports**

Remplacer :

```ts
import type { Stats, StoryNode, Choice, EndingId, Fruit, FruitType, Player } from "./types";
import { pickRandomFruit, findEatenFruit } from "./fruits.ts";
import { resolvePlayerText } from "./player.ts";
```

par :

```ts
import type { Stats, StoryNode, Choice, EndingId, Fruit, FruitType, Player, Gender, SpeciesId } from "./types";
import { pickRandomFruit, findEatenFruit } from "./fruits.ts";
import { resolvePlayerText, SPECIES_ORDER, SPECIES_LABELS } from "./player.ts";
import { pickRandomName } from "./names.ts";
```

- [ ] **Step 2: Brancher le rendu du formulaire dans `renderNode()`**

Remplacer :

```ts
  renderStats();

  if (node.isEnding) {
    replayEl.hidden = false;
    return;
  }

  for (const choice of filterChoices(node.choices, flags)) {
```

par :

```ts
  renderStats();

  if (node.isEnding) {
    replayEl.hidden = false;
    return;
  }

  if (node.characterForm) {
    renderCharacterForm(node, choicesEl);
    return;
  }

  for (const choice of filterChoices(node.choices, flags)) {
```

- [ ] **Step 3: Ajouter `renderCharacterForm`**

Juste après la fonction `renderNode` (avant `function navigate(choice: Choice): void {`), ajouter :

```ts
function renderCharacterForm(node: StoryNode, container: HTMLElement): void {
  const state: { name: string; gender?: Gender; species?: SpeciesId } = { name: "" };

  const form = document.createElement("div");
  form.className = "character-form";

  const nameRow = document.createElement("div");
  nameRow.className = "form-row name-row";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.maxLength = 24;
  nameInput.placeholder = "Ton prénom de pirate";
  nameInput.className = "name-input";
  const diceBtn = document.createElement("button");
  diceBtn.type = "button";
  diceBtn.className = "dice-btn";
  diceBtn.textContent = "🎲";
  diceBtn.disabled = true;
  nameRow.appendChild(nameInput);
  nameRow.appendChild(diceBtn);
  form.appendChild(nameRow);

  const genderLabels: Record<Gender, string> = { homme: "Homme", femme: "Femme" };
  const genderButtons = new Map<Gender, HTMLButtonElement>();
  const genderGroup = document.createElement("div");
  genderGroup.className = "option-group";
  for (const gender of Object.keys(genderLabels) as Gender[]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.textContent = genderLabels[gender];
    btn.addEventListener("click", () => {
      state.gender = gender;
      for (const b of genderButtons.values()) b.classList.remove("selected");
      btn.classList.add("selected");
      diceBtn.disabled = false;
      updateSubmit();
    });
    genderButtons.set(gender, btn);
    genderGroup.appendChild(btn);
  }
  form.appendChild(genderGroup);

  const speciesButtons = new Map<SpeciesId, HTMLButtonElement>();
  const speciesGroup = document.createElement("div");
  speciesGroup.className = "option-group";
  for (const species of SPECIES_ORDER) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.textContent = SPECIES_LABELS[species].m;
    btn.addEventListener("click", () => {
      state.species = species;
      for (const b of speciesButtons.values()) b.classList.remove("selected");
      btn.classList.add("selected");
      updateSubmit();
    });
    speciesButtons.set(species, btn);
    speciesGroup.appendChild(btn);
  }
  form.appendChild(speciesGroup);

  const submitBtn = document.createElement("button");
  submitBtn.type = "button";
  submitBtn.className = "choice-btn";
  submitBtn.textContent = "Embarquer";
  submitBtn.disabled = true;
  submitBtn.addEventListener("click", () => {
    player = { name: state.name.trim(), gender: state.gender!, species: state.species! };
    navigate(node.choices[0]);
  });
  form.appendChild(submitBtn);

  function updateSubmit(): void {
    submitBtn.disabled = !(
      state.name.trim().length > 0 &&
      state.gender !== undefined &&
      state.species !== undefined
    );
  }

  nameInput.addEventListener("input", () => {
    state.name = nameInput.value;
    updateSubmit();
  });

  diceBtn.addEventListener("click", () => {
    if (!state.gender) return;
    nameInput.value = pickRandomName(state.gender);
    state.name = nameInput.value;
    updateSubmit();
  });

  container.appendChild(form);
}
```

- [ ] **Step 4: Vérifier qu'il n'y a pas de régression**

Run: `npm test`
Expected: tous les tests passent (cette fonction manipule le DOM, elle est vérifiée manuellement à la Task 8, comme le reste de `renderNode`/`navigate`).

- [ ] **Step 5: Commit**

```bash
git add src/games/roi-des-pirates/engine.ts
git commit -m "feat(roi-des-pirates): formulaire DOM de création de personnage"
```

---

### Task 8: Styles CSS du formulaire + vérification manuelle

**Files:**
- Modify: `src/games/roi-des-pirates/game.css:198-210`

- [ ] **Step 1: Ajouter les styles**

Dans `src/games/roi-des-pirates/game.css`, remplacer :

```css
.choice-text {
  display: block;
}

.choice-sub {
  display: block;
  font-size: 13px;
  color: var(--arc-color);
  font-family: sans-serif;
  opacity: 0.8;
}

/* ── Replay button (ending) ── */
```

par :

```css
.choice-text {
  display: block;
}

.choice-sub {
  display: block;
  font-size: 13px;
  color: var(--arc-color);
  font-family: sans-serif;
  opacity: 0.8;
}

.choice-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Character creation form ── */
.character-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-bottom: 32px;
}

.form-row {
  display: flex;
  gap: 8px;
}

.name-input {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  padding: 12px 14px;
  font-family: Georgia, serif;
  font-size: 16px;
}

.dice-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 18px;
  padding: 0 16px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.dice-btn:hover:not(:disabled) {
  border-color: var(--arc-color);
}
.dice-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.option-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.option-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  padding: 10px 16px;
  cursor: pointer;
  font-family: sans-serif;
  font-size: 14px;
  transition: background 0.15s, border-color 0.15s;
}
.option-btn:hover {
  border-color: var(--arc-color);
}
.option-btn.selected {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--arc-color);
  color: var(--arc-color);
}

/* ── Replay button (ending) ── */
```

- [ ] **Step 2: Vérifier visuellement le parcours complet**

Run: `npm run dev`, ouvrir `games/roi-des-pirates/index.html` dans le navigateur.

Vérifier :
- Le premier écran est bien "Qui es-tu ?" avec le formulaire (champ prénom + dé, boutons Homme/Femme, 5 boutons d'espèce, bouton "Embarquer").
- Le dé 🎲 est désactivé tant qu'aucun genre n'est sélectionné ; une fois un genre choisi, cliquer dessus remplit le champ prénom avec un nom cohérent (masculin/féminin selon le genre choisi).
- "Embarquer" reste désactivé tant que prénom, genre et espèce ne sont pas tous renseignés.
- Une fois "Embarquer" cliqué, le jeu passe au nœud `intro` normalement.
- Arriver jusqu'à une fin, cliquer sur "Recommencer" : le jeu revient bien à l'écran de création (pas directement à `intro`), stats à zéro.

- [ ] **Step 3: Commit**

```bash
git add src/games/roi-des-pirates/game.css
git commit -m "style(roi-des-pirates): styles du formulaire de création de personnage"
```

---

### Task 9: Contenu — placeholders sur intro + East Blue

**Files:**
- Modify: `src/games/roi-des-pirates/story.ts` (nœuds `intro`, `eb-origines`, `eb-rencontre-epeiste`, `eb-epeiste-duel-victoire`, `eb-epeiste-duel-defaite`, `eb-marine`)

- [ ] **Step 1: `intro` — gendrer l'ambition du personnage**

Remplacer :

```ts
    text: "La mer. Elle t'a toujours appelé. Depuis l'enfance sur ce quai de bois vermoulu, tu regardais les voiles disparaître à l'horizon en te disant : un jour, ce sera moi. Ce jour est arrivé. Tu as dix-sept ans. Un couteau à la ceinture, quelques Berry dans la poche, et cette conviction qui brûle dans ta poitrine. Tu deviendras Roi des Pirates. Tu trouveras le One Piece. Personne ne te croit. Parfait.",
```

par :

```ts
    text: "La mer. Elle t'a toujours appelé. Depuis l'enfance sur ce quai de bois vermoulu, tu regardais les voiles disparaître à l'horizon en te disant : un jour, ce sera moi. Ce jour est arrivé. Tu as dix-sept ans. Un couteau à la ceinture, quelques Berry dans la poche, et cette conviction qui brûle dans ta poitrine. Tu deviendras {le Roi/la Reine} des Pirates. Tu trouveras le One Piece. Personne ne te croit. Parfait.",
```

- [ ] **Step 2: `eb-origines` — Shanks interpelle le joueur par son prénom**

Remplacer :

```ts
      {
        text: "D'un village côtier. Un soir, Shanks le Roux y a fait escale.",
        sub: "Il t'a dit quelque chose en riant. Tu n'as jamais oublié.",
        effects: { force: 15, notoriete: 5 },
        next: "eb-choix-fondateur",
      },
```

par :

```ts
      {
        text: "D'un village côtier. Un soir, Shanks le Roux y a fait escale.",
        sub: "Il t'a appelé {prenom} en riant, avant de lâcher une phrase que tu n'as jamais oubliée.",
        effects: { force: 15, notoriete: 5 },
        next: "eb-choix-fondateur",
      },
```

- [ ] **Step 3: `eb-rencontre-epeiste` — l'épéiste jauge l'espèce du joueur**

Remplacer :

```ts
    text: "Dans l'arrière-salle d'une taverne qui sent la sciure et le rhum bon marché, un jeune épéiste vient de mettre trois hommes au tapis pour une histoire de dette impayée. Il te regarde, amusé, comme s'il te jaugeait déjà.",
```

par :

```ts
    text: "Dans l'arrière-salle d'une taverne qui sent la sciure et le rhum bon marché, un jeune épéiste vient de mettre trois hommes au tapis pour une histoire de dette impayée. Il te regarde, amusé, comme s'il jaugeait déjà ce {espece} qui vient d'entrer.",
```

- [ ] **Step 4: `eb-epeiste-duel-victoire` — l'épéiste te salue par ton prénom**

Remplacer :

```ts
    text: "Tu le mets à terre, la pointe de ta lame — ou de ton poing — sous sa gorge. Il éclate de rire au lieu de supplier. \"C'est bon, tu m'as convaincu.\" Il se relève, tend la main. Un équipage vient de gagner son épéiste.",
```

par :

```ts
    text: "Tu le mets à terre, la pointe de ta lame — ou de ton poing — sous sa gorge. Il éclate de rire au lieu de supplier. \"C'est bon, tu m'as convaincu.\" Il se relève, tend la main. \"Enchanté, {prenom}.\" Un équipage vient de gagner son épéiste.",
```

- [ ] **Step 5: `eb-epeiste-duel-defaite` — accord de l'état du joueur après le duel**

Remplacer :

```ts
    text: "Le combat est plus long que prévu. Tu finis à terre, essoufflé, mais entier. Il te tend la main pour t'aider à te relever. \"Pas mal. Mais je ne rejoins pas les épaves.\" Il s'en va en sifflotant. Tu croiseras peut-être sa route ailleurs, un jour.",
```

par :

```ts
    text: "Le combat est plus long que prévu. Tu finis à terre, {essoufflé/essoufflée}, mais {entier/entière}. Il te tend la main pour t'aider à te relever. \"Pas mal. Mais je ne rejoins pas les épaves.\" Il s'en va en sifflotant. Tu croiseras peut-être sa route ailleurs, un jour.",
```

- [ ] **Step 6: `eb-marine` — le mandat d'arrestation porte le prénom du joueur**

Remplacer :

```ts
    text: "Un capitaine de la Marine te coupe la route. Il est fier, arrogant, et il a un mandat d'arrestation avec ton nom dessus. Une petite foule de villageois regarde depuis le quai. Ce moment pourrait définir qui tu es — ou du moins ce que les autres diront de toi.",
```

par :

```ts
    text: "Un capitaine de la Marine te coupe la route. Il est fier, arrogant, et il brandit un mandat d'arrestation où on peut lire, en toutes lettres : {prenom}. Une petite foule de villageois regarde depuis le quai. Ce moment pourrait définir qui tu es — ou du moins ce que les autres diront de toi.",
```

- [ ] **Step 7: Vérifier qu'il n'y a pas de régression**

Run: `npm test`
Expected: tous les tests passent (`validateStoryGraph` ne trouve aucune accolade mal formée dans ces textes).

- [ ] **Step 8: Commit**

```bash
git add src/games/roi-des-pirates/story.ts
git commit -m "content(roi-des-pirates): placeholders {prenom}/{espece}/{motM-motF} - intro et East Blue"
```

---

### Task 10: Contenu — placeholders sur Grand Line et Nouveau Monde

**Files:**
- Modify: `src/games/roi-des-pirates/story.ts` (nœuds `gl-epeiste-retour`, `nm-rencontre-medecin`, `nm-avant-laugh-tale`)

- [ ] **Step 1: `gl-epeiste-retour` — l'épéiste retrouvé nomme le joueur (branche "pas encore recruté")**

Remplacer :

```ts
    text: (flags) =>
      flags.has("epeiste-recrute")
        ? "Sur le pont, ton épéiste aiguise sa lame sans un mot, les yeux fixés sur l'horizon nouveau. La Grand Line ne l'impressionne pas — ou il le cache bien."
        : "Sur les quais d'une île de passage, tu croises à nouveau ce même épéiste d'East Blue, plus loin de chez lui que toi. Il te reconnaît, hausse un sourcil. \"Toujours vivant, à ce que je vois.\"",
```

par :

```ts
    text: (flags) =>
      flags.has("epeiste-recrute")
        ? "Sur le pont, ton épéiste aiguise sa lame sans un mot, les yeux fixés sur l'horizon nouveau. La Grand Line ne l'impressionne pas — ou il le cache bien."
        : "Sur les quais d'une île de passage, tu croises à nouveau ce même épéiste d'East Blue, plus loin de chez lui que toi. Il te reconnaît, hausse un sourcil. \"Toujours vivant, {prenom}, à ce que je vois.\"",
```

- [ ] **Step 2: `nm-rencontre-medecin` — le médecin remarque l'espèce du joueur**

Remplacer :

```ts
    text: "Sur une île à moitié engloutie, un médecin erre depuis le naufrage de son propre équipage. Il connaît les blessures de guerre, les poisons des Logia, et — détail qu'il glisse presque timidement — les Fruits du Démon, qu'il a étudiés toute sa vie.",
```

par :

```ts
    text: "Sur une île à moitié engloutie, un médecin erre depuis le naufrage de son propre équipage. Il te dévisage un instant — un {espece}, en pleine mer, ce n'est pas si courant — puis reprend son sérieux. Il connaît les blessures de guerre, les poisons des Logia, et — détail qu'il glisse presque timidement — les Fruits du Démon, qu'il a étudiés toute sa vie.",
```

- [ ] **Step 3: `nm-avant-laugh-tale` — dernière ligne ajoutée avant Laugh Tale**

Remplacer :

```ts
    text: (flags) => {
      const compagnons: string[] = [];
      if (flags.has("epeiste-recrute")) compagnons.push("ton épéiste");
      if (flags.has("navigatrice-recrute")) compagnons.push("ta navigatrice");
      if (flags.has("medecin-recrute")) compagnons.push("ton médecin");

      const morceaux = ["Wano derrière toi, Laugh Tale devant. Le silence, avant la dernière tempête."];
      if (compagnons.length > 0) {
        morceaux.push(`Sur le pont, ${compagnons.join(", ")} attendent, aussi silencieux que toi.`);
      }
      const injuries = describeInjuries(flags);
      if (injuries.length > 0) {
        morceaux.push(`Le voyage t'a laissé ${injuries.join(" et ")} — le prix payé pour arriver jusqu'ici.`);
      }
      const fruit = findEatenFruit(flags);
      if (fruit) {
        morceaux.push(`${fruit.nom} bat toujours en toi, prêt à servir une dernière fois.`);
      }
      return morceaux.join(" ");
    },
```

par :

```ts
    text: (flags) => {
      const compagnons: string[] = [];
      if (flags.has("epeiste-recrute")) compagnons.push("ton épéiste");
      if (flags.has("navigatrice-recrute")) compagnons.push("ta navigatrice");
      if (flags.has("medecin-recrute")) compagnons.push("ton médecin");

      const morceaux = ["Wano derrière toi, Laugh Tale devant. Le silence, avant la dernière tempête."];
      if (compagnons.length > 0) {
        morceaux.push(`Sur le pont, ${compagnons.join(", ")} attendent, aussi silencieux que toi.`);
      }
      const injuries = describeInjuries(flags);
      if (injuries.length > 0) {
        morceaux.push(`Le voyage t'a laissé ${injuries.join(" et ")} — le prix payé pour arriver jusqu'ici.`);
      }
      const fruit = findEatenFruit(flags);
      if (fruit) {
        morceaux.push(`${fruit.nom} bat toujours en toi, prêt à servir une dernière fois.`);
      }
      morceaux.push("{prenom}, tu es {prêt/prête} — ou tu ne le seras jamais.");
      return morceaux.join(" ");
    },
```

(Cette ligne montre que `resolvePlayerText` s'applique bien sur le résultat d'une fonction conditionnelle aux flags, pas seulement sur du texte statique — les placeholders littéraux `{prenom}` et `{prêt/prête}` sont poussés dans `morceaux` comme n'importe quelle autre chaîne, puis résolus après coup dans `renderNode()`.)

- [ ] **Step 4: Vérifier qu'il n'y a pas de régression**

Run: `npm test`
Expected: tous les tests passent.

- [ ] **Step 5: Commit**

```bash
git add src/games/roi-des-pirates/story.ts
git commit -m "content(roi-des-pirates): placeholders {prenom}/{espece}/{motM-motF} - Grand Line et Nouveau Monde"
```

---

### Task 11: Contenu — placeholders sur les fins, run complet

**Files:**
- Modify: `src/games/roi-des-pirates/story.ts` (nœuds `arc-final`, `fin-roi-des-pirates`, `fin-legende`)

- [ ] **Step 1: `arc-final` — accord + prénom, et correction d'une coquille au passage ("Amiaux" → "Amiraux")**

Remplacer :

```ts
    text: "Tu y es presque. Après tout ça — les tempêtes, les trahisons, les dieux marins et les Amiaux, les cicatrices qui ne s'effacent pas — tu approches de Laugh Tale. L'île que personne n'a atteinte depuis Gold Roger. Tu penses à ceux qui t'ont aidé. À ceux que tu as perdus. Tu réalises que tu n'es plus le même qu'au début du voyage. Le One Piece t'attend. Mais lequel des pirates que tu es devenu va l'atteindre ?",
```

par :

```ts
    text: "Tu y es presque. Après tout ça — les tempêtes, les trahisons, les dieux marins et les Amiraux, les cicatrices qui ne s'effacent pas — tu approches de Laugh Tale. L'île que personne n'a atteinte depuis Gold Roger. Tu penses à ceux qui t'ont aidé. À ceux que tu as perdus. Tu réalises que tu n'es plus {le même/la même} qu'au début du voyage, {prenom}. Le One Piece t'attend. Mais lequel des pirates que tu es devenu va l'atteindre ?",
```

- [ ] **Step 2: `fin-roi-des-pirates` — la proclamation finale, gendrée**

Remplacer :

```ts
    text: "Le One Piece existait vraiment. Personne n'y croyait vraiment — même toi, au fond, tu n'osais pas trop y penser. Et là, devant tes yeux, c'est réel. Gold Roger l'a laissé ici il y a des décennies, en riant. Tu comprends pourquoi. Tu ris aussi. Le Roi des Pirates est mort. Vive le Roi des Pirates.",
```

par :

```ts
    text: "Le One Piece existait vraiment. Personne n'y croyait vraiment — même toi, au fond, tu n'osais pas trop y penser. Et là, devant tes yeux, c'est réel. Gold Roger l'a laissé ici il y a des décennies, en riant. Tu comprends pourquoi. Tu ris aussi. {Le Roi des Pirates est mort. Vive le Roi des Pirates/La Reine des Pirates est morte. Vive la Reine des Pirates}, {prenom}.",
```

- [ ] **Step 3: `fin-legende` — le nom du joueur, et le titre refusé, gendrés**

Remplacer :

```ts
    text: "Tu n'as pas trouvé le One Piece — pas encore, peut-être jamais. Mais ta prime dépasse celle de la plupart des Empereurs. Ton nom fait trembler les Amiraux. Dans les tavernes de chaque île de la Grand Line, on raconte des histoires sur toi — certaines vraies, d'autres inventées, toutes impressionnantes. Tu n'es pas le Roi. Tu es peut-être quelque chose de plus grand.",
```

par :

```ts
    text: "Tu n'as pas trouvé le One Piece — pas encore, peut-être jamais. Mais ta prime dépasse celle de la plupart des Empereurs. Le nom de {prenom} fait trembler les Amiraux. Dans les tavernes de chaque île de la Grand Line, on raconte des histoires sur toi — certaines vraies, d'autres inventées, toutes impressionnantes. Tu n'es pas {le Roi/la Reine} des Pirates. Tu es peut-être quelque chose de plus grand.",
```

- [ ] **Step 4: Run complet des tests**

Run: `npm test`
Expected: PASS — l'intégralité de la suite (existante + les nouveaux tests des Tasks 2, 3, 5).

- [ ] **Step 5: Vérification manuelle finale**

Run: `npm run dev`, ouvrir `games/roi-des-pirates/index.html`. Créer un personnage (ex. genre Femme, espèce Lunarien, prénom généré via le dé), jouer jusqu'à `eb-origines`, `eb-marine`, et une fin — confirmer que `{prenom}`, `{espece}` et les accords s'affichent correctement résolus (pas d'accolades visibles à l'écran).

- [ ] **Step 6: Commit**

```bash
git add src/games/roi-des-pirates/story.ts
git commit -m "content(roi-des-pirates): placeholders {prenom}/{espece}/{motM-motF} - fins"
```

---

## Hors scope (rappel)

- Bonus de stats de départ par espèce — étape 2, session de brainstorming séparée.
- Branches narratives dédiées par espèce — étape 3, chantier séparé.
- Fiche "Dead or Alive" (③) et refonte des choix à 4 branches (④) — chantiers séparés, inchangés.
- Affichage du personnage dans l'en-tête — laissé à la fiche "Dead or Alive" (③).
