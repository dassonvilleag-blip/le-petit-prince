# Le Roi des Pirates — histoire étoffée — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Étoffer l'histoire du visual novel "Le Roi des Pirates" (`games/roi-des-pirates`) — passer de 15 à ~55-65 nœuds narratifs, avec un système de drapeaux permanents, des compagnons recrutables, une mécanique de duel partagée (recrutement + vol), et une table de 30 Fruits du Démon avec trois méthodes d'acquisition.

**Architecture:** Extension du moteur existant (`engine.ts`/`types.ts`) avec un `Set<string>` de drapeaux permanents, des fonctions pures testables (résolution de duel, filtrage de choix, tirage de fruit, révélation, validation du graphe narratif), puis expansion du contenu narratif (`story.ts`) arc par arc en réutilisant les illustrations SVG existantes.

**Tech Stack:** TypeScript, Vite, `node --experimental-strip-types --test` (aucune dépendance runtime), pas de DOM shim — seule la logique pure est testée automatiquement (convention déjà suivie par `ca-coute-combien` et `les-des-menteurs`).

Design de référence : `docs/superpowers/specs/2026-08-19-roi-des-pirates-histoire-etoffee-design.md`

---

## Repères du code existant

- `src/games/roi-des-pirates/types.ts` (32 lignes) : `Stats`, `EndingId`, `ArcId`, `Choice`, `StoryNode`.
- `src/games/roi-des-pirates/engine.ts` (127 lignes) : état module (`nodes`, `stats`, `currentNodeId`), `applyEffects`, `computeEndingId`, `renderStats`, `renderNode`, `navigate`, `startEngine`.
- `src/games/roi-des-pirates/story.ts` (277 lignes) : `STORY: StoryNode[]`, 15 nœuds actuels (`intro`, `eb-origines`, `eb-choix-fondateur`, `eb-avec-fruit`, `eb-avec-haki`, `eb-marine`, `gl-arrivee`, `gl-grand-choix`, `nm-arrivee`, `nm-wano`, `arc-final`, 4 fins).
- `src/games/roi-des-pirates/illustrations.ts` : exporte `SVG_INTRO`, `SVG_EAST_BLUE`, `SVG_DEVIL_FRUIT`, `SVG_HAKI`, `SVG_MARINE`, `SVG_GRAND_LINE`, `SVG_ALLIANCE`, `SVG_NOUVEAU_MONDE`, `SVG_WANO`, `SVG_FINAL`, `SVG_FIN_ROI`, `SVG_FIN_LEGENDE`, `SVG_FIN_RETRAITE`, `SVG_FIN_CAPTURE` — **tous réutilisés tels quels**, aucun nouvel SVG dans ce plan.
- Commande de test du projet (`package.json`) : `node --experimental-strip-types --test "src/**/*.test.ts"`.

---

### Task 1: Extension des types

**Files:**
- Modify: `src/games/roi-des-pirates/types.ts`

- [ ] **Step 1: Réécrire le fichier avec les nouveaux types**

Remplacer tout le contenu de `src/games/roi-des-pirates/types.ts` par :

```ts
export interface Stats {
  force: number;
  notoriete: number;
  equipage: number;
  fruitDuDemon: number;
}

export type EndingId =
  | "fin-roi-des-pirates"
  | "fin-legende"
  | "fin-retraite"
  | "fin-capture";

export type ArcId = "east-blue" | "grand-line" | "nouveau-monde" | "final";

export type FruitType = "Zoan" | "Paramecia" | "Logia";

export interface Fruit {
  id: string;
  nom: string;
  type: FruitType;
  description: string;
  effects: Partial<Stats>;
}

export interface DuelOutcome {
  /** Force cachée de l'adversaire (ou difficulté, si statUsed n'est pas "force"). */
  opponentPower: number;
  /** Stat du joueur comparée à opponentPower. Par défaut "force". */
  statUsed?: keyof Stats;
  win: string;
  loseMinor: string;
  loseMajor: string;
  /** Drapeaux posés uniquement en cas de victoire (ex: recrutement réussi). */
  winFlags?: string[];
  /** Tire un fruit du démon (aléatoire) en cas de victoire, stocké comme "fruit en attente". */
  winPicksFruit?: FruitType | "any";
  /** Tire un fruit du démon en cas de défaite légère (ex: échec partiel d'une quête). */
  loseMinorPicksFruit?: FruitType | "any";
  /** Drapeau de blessure permanente posé en cas de défaite grave. */
  injuryFlag?: string;
}

export interface Choice {
  text: string;
  sub?: string;
  effects: Partial<Stats>;
  /** Nœud suivant. Absent si `duel` est défini (le duel détermine la suite). */
  next?: string;
  /** Drapeaux posés inconditionnellement quand ce choix est pris. */
  setFlags?: string[];
  /** Ce choix n'est affiché que si tous ces drapeaux sont posés. */
  requiresFlags?: string[];
  /** Ce choix est masqué si un de ces drapeaux est posé. */
  forbidsFlags?: string[];
  /** Déclenche une résolution de duel au lieu d'utiliser `next` directement. */
  duel?: DuelOutcome;
  /** Tire un fruit candidat (sans l'appliquer) et le stocke comme "fruit en attente". */
  pickFruitCandidate?: { type?: FruitType };
  /** Applique les effets du "fruit en attente", pose son drapeau `fruit-<id>`, puis va à `next`. */
  eatPendingFruit?: { next: string };
}

export interface StoryNode {
  id: string;
  arc?: ArcId;
  title?: string;
  text: string | ((flags: Set<string>) => string);
  svg: string;
  choices: Choice[];
  isEnding?: true;
  endingId?: EndingId;
}
```

- [ ] **Step 2: Vérifier que ça compile**

Run: `npx tsc --noEmit -p tsconfig.json` (depuis la racine du repo)
Expected: aucune nouvelle erreur mentionnant `roi-des-pirates` (les erreurs préexistantes sur `node:test` dans d'autres jeux ne sont pas de notre ressort, à ignorer).

- [ ] **Step 3: Commit**

```bash
git add src/games/roi-des-pirates/types.ts
git commit -m "feat(roi-des-pirates): types pour drapeaux, duels et fruits du démon"
```

---

### Task 2: `resolveDuel` — résolution de duel/épreuve

**Files:**
- Modify: `src/games/roi-des-pirates/engine.ts`
- Test: `src/games/roi-des-pirates/test/engine.test.ts`

- [ ] **Step 1: Écrire le test (fichier n'existe pas encore, le créer)**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveDuel } from "../engine.ts";

test("resolveDuel : victoire nette si la stat du joueur domine largement", () => {
  assert.equal(resolveDuel(80, 20, () => 0.5), "victoire");
});

test("resolveDuel : blessure grave si l'adversaire domine largement", () => {
  assert.equal(resolveDuel(20, 80, () => 0.5), "blessure-grave");
});

test("resolveDuel : à la limite haute (roll pile 15), c'est une défaite légère, pas une victoire", () => {
  // playerForce - opponentPower + (rng*30-15) = 15 + (0.5*30-15) = 15 + 0 = 15 → pas > 15
  assert.equal(resolveDuel(15, 0, () => 0.5), "defaite-legere");
});

test("resolveDuel : à la limite basse (roll pile -10), c'est une blessure grave, pas une défaite légère", () => {
  // 0 - 10 + (0.5*30-15) = -10 + 0 = -10 → pas > -10
  assert.equal(resolveDuel(0, 10, () => 0.5), "blessure-grave");
});

test("resolveDuel : l'aléa peut faire pencher un combat sinon perdu", () => {
  // 10 - 10 + (1*30-15) = 0 + 15 = 15 → pas > 15, donc defaite-legere (pas victoire)
  assert.equal(resolveDuel(10, 10, () => 1), "defaite-legere");
  // 10 - 10 + (0*30-15) = 0 - 15 = -15 → blessure-grave
  assert.equal(resolveDuel(10, 10, () => 0), "blessure-grave");
});
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `npm test`
Expected: FAIL — `resolveDuel is not a function` (ou erreur d'import, `engine.ts` ne l'exporte pas encore).

- [ ] **Step 3: Implémenter `resolveDuel` dans `engine.ts`**

Ajouter, juste après les imports en haut de `src/games/roi-des-pirates/engine.ts` (après la ligne `import type { Stats, StoryNode, Choice, EndingId } from "./types";`) :

```ts
export function resolveDuel(
  playerStat: number,
  opponentPower: number,
  rng: () => number = Math.random,
): "victoire" | "defaite-legere" | "blessure-grave" {
  const roll = playerStat - opponentPower + (rng() * 30 - 15);
  if (roll > 15) return "victoire";
  if (roll > -10) return "defaite-legere";
  return "blessure-grave";
}
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `npm test`
Expected: PASS (tous les tests de `resolveDuel`).

- [ ] **Step 5: Commit**

```bash
git add src/games/roi-des-pirates/engine.ts src/games/roi-des-pirates/test/engine.test.ts
git commit -m "feat(roi-des-pirates): résolution de duel/épreuve testable"
```

---

### Task 3: `filterChoices`, `resolveText`, `describeInjuries`

**Files:**
- Modify: `src/games/roi-des-pirates/engine.ts`
- Modify: `src/games/roi-des-pirates/test/engine.test.ts`

- [ ] **Step 1: Ajouter les tests**

Ajouter à la fin de `src/games/roi-des-pirates/test/engine.test.ts` :

```ts
import { filterChoices, resolveText, describeInjuries } from "../engine.ts";
import type { Choice } from "../types.ts";

test("filterChoices : cache un choix dont requiresFlags n'est pas satisfait", () => {
  const choices: Choice[] = [
    { text: "A", effects: {}, next: "x", requiresFlags: ["epeiste-recrute"] },
    { text: "B", effects: {}, next: "y" },
  ];
  const result = filterChoices(choices, new Set());
  assert.deepEqual(result.map((c) => c.text), ["B"]);
});

test("filterChoices : montre le choix requiresFlags quand le drapeau est posé", () => {
  const choices: Choice[] = [
    { text: "A", effects: {}, next: "x", requiresFlags: ["epeiste-recrute"] },
  ];
  const result = filterChoices(choices, new Set(["epeiste-recrute"]));
  assert.deepEqual(result.map((c) => c.text), ["A"]);
});

test("filterChoices : cache un choix dont forbidsFlags est posé", () => {
  const choices: Choice[] = [
    { text: "Recruter", effects: {}, next: "x", forbidsFlags: ["epeiste-recrute"] },
    { text: "Continuer", effects: {}, next: "y" },
  ];
  const result = filterChoices(choices, new Set(["epeiste-recrute"]));
  assert.deepEqual(result.map((c) => c.text), ["Continuer"]);
});

test("resolveText : renvoie une chaîne fixe telle quelle", () => {
  assert.equal(resolveText("Bonjour", new Set()), "Bonjour");
});

test("resolveText : appelle la fonction avec les drapeaux courants", () => {
  const text = (flags: Set<string>) => (flags.has("x") ? "avec x" : "sans x");
  assert.equal(resolveText(text, new Set()), "sans x");
  assert.equal(resolveText(text, new Set(["x"])), "avec x");
});

test("describeInjuries : liste vide sans blessure", () => {
  assert.deepEqual(describeInjuries(new Set()), []);
});

test("describeInjuries : décrit chaque blessure connue posée", () => {
  const result = describeInjuries(new Set(["bras-coupe", "jambe-blessee"]));
  assert.equal(result.length, 2);
  assert.ok(result.every((s) => typeof s === "string" && s.length > 0));
});
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `npm test`
Expected: FAIL — `filterChoices`/`resolveText`/`describeInjuries` non exportés.

- [ ] **Step 3: Implémenter dans `engine.ts`**

Ajouter juste après `resolveDuel` :

```ts
export function filterChoices(choices: Choice[], flags: Set<string>): Choice[] {
  return choices.filter((c) => {
    if (c.requiresFlags?.some((f) => !flags.has(f))) return false;
    if (c.forbidsFlags?.some((f) => flags.has(f))) return false;
    return true;
  });
}

export function resolveText(
  text: string | ((flags: Set<string>) => string),
  flags: Set<string>,
): string {
  return typeof text === "function" ? text(flags) : text;
}

const INJURY_LABELS: Record<string, string> = {
  "bras-coupe": "ton bras manquant",
  "main-brisee": "ta main qui ne se referme plus tout à fait",
  "jambe-blessee": "ta jambe qui traîne un peu, certains soirs",
};

export function describeInjuries(flags: Set<string>): string[] {
  return Object.entries(INJURY_LABELS)
    .filter(([flag]) => flags.has(flag))
    .map(([, label]) => label);
}
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/roi-des-pirates/engine.ts src/games/roi-des-pirates/test/engine.test.ts
git commit -m "feat(roi-des-pirates): filtrage de choix par drapeaux, texte dynamique, description des blessures"
```

---

### Task 4: `validateStoryGraph` — intégrité du graphe narratif

**Files:**
- Modify: `src/games/roi-des-pirates/engine.ts`
- Modify: `src/games/roi-des-pirates/test/engine.test.ts`

- [ ] **Step 1: Ajouter les tests**

Ajouter à la fin de `src/games/roi-des-pirates/test/engine.test.ts` :

```ts
import { validateStoryGraph } from "../engine.ts";
import type { StoryNode } from "../types.ts";

test("validateStoryGraph : accepte un graphe valide à deux nœuds", () => {
  const nodes: StoryNode[] = [
    { id: "a", text: "A", svg: "", choices: [{ text: "aller à b", effects: {}, next: "b" }] },
    { id: "b", text: "B", svg: "", choices: [], isEnding: true },
  ];
  assert.deepEqual(validateStoryGraph(nodes), []);
});

test("validateStoryGraph : signale une référence next vers un id inexistant", () => {
  const nodes: StoryNode[] = [
    { id: "a", text: "A", svg: "", choices: [{ text: "x", effects: {}, next: "n-existe-pas" }] },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("n-existe-pas")));
});

test("validateStoryGraph : signale des identifiants dupliqués", () => {
  const nodes: StoryNode[] = [
    { id: "a", text: "A", svg: "", choices: [], isEnding: true },
    { id: "a", text: "A bis", svg: "", choices: [], isEnding: true },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("dupliqué")));
});

test("validateStoryGraph : signale un nœud non-fin sans aucun choix", () => {
  const nodes: StoryNode[] = [{ id: "a", text: "A", svg: "", choices: [] }];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("aucun choix")));
});

test("validateStoryGraph : signale un nœud dont tous les choix sont conditionnels", () => {
  const nodes: StoryNode[] = [
    {
      id: "a",
      text: "A",
      svg: "",
      choices: [{ text: "x", effects: {}, next: "b", requiresFlags: ["flag"] }],
    },
    { id: "b", text: "B", svg: "", choices: [], isEnding: true },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("inconditionnel")));
});

test("validateStoryGraph : suit aussi les cibles de duel et de fruit en attente", () => {
  const nodes: StoryNode[] = [
    {
      id: "a",
      text: "A",
      svg: "",
      choices: [
        {
          text: "duel",
          effects: {},
          duel: {
            opponentPower: 10,
            win: "victoire-manquante",
            loseMinor: "b",
            loseMajor: "b",
          },
        },
        { text: "manger", effects: {}, eatPendingFruit: { next: "manger-manquant" } },
      ],
    },
    { id: "b", text: "B", svg: "", choices: [], isEnding: true },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("victoire-manquante")));
  assert.ok(errors.some((e) => e.includes("manger-manquant")));
});
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `npm test`
Expected: FAIL — `validateStoryGraph` non exporté.

- [ ] **Step 3: Implémenter dans `engine.ts`**

Ajouter juste après `describeInjuries` :

```ts
export function validateStoryGraph(storyNodes: StoryNode[]): string[] {
  const errors: string[] = [];
  const ids = new Set(storyNodes.map((n) => n.id));
  if (ids.size !== storyNodes.length) {
    errors.push("Des identifiants de nœuds sont dupliqués.");
  }

  for (const node of storyNodes) {
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

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/roi-des-pirates/engine.ts src/games/roi-des-pirates/test/engine.test.ts
git commit -m "feat(roi-des-pirates): validation automatique du graphe narratif"
```

---

### Task 5: Table des 30 Fruits du Démon + tirage + révélation

**Files:**
- Create: `src/games/roi-des-pirates/fruits.ts`
- Create: `src/games/roi-des-pirates/test/fruits.test.ts`

- [ ] **Step 1: Écrire le test**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { FRUITS, pickRandomFruit, revealsFruit, findEatenFruit } from "../fruits.ts";

test("FRUITS : contient exactement 30 fruits, 10 par type", () => {
  assert.equal(FRUITS.length, 30);
  assert.equal(FRUITS.filter((f) => f.type === "Zoan").length, 10);
  assert.equal(FRUITS.filter((f) => f.type === "Paramecia").length, 10);
  assert.equal(FRUITS.filter((f) => f.type === "Logia").length, 10);
});

test("FRUITS : identifiants tous uniques", () => {
  const ids = new Set(FRUITS.map((f) => f.id));
  assert.equal(ids.size, FRUITS.length);
});

test("pickRandomFruit : sans filtre, rng=0 renvoie le premier fruit de la table", () => {
  assert.equal(pickRandomFruit(undefined, () => 0), FRUITS[0]);
});

test("pickRandomFruit : sans filtre, rng proche de 1 renvoie le dernier fruit", () => {
  assert.equal(pickRandomFruit(undefined, () => 0.999999), FRUITS[FRUITS.length - 1]);
});

test("pickRandomFruit : avec filtre de type, ne renvoie que ce type", () => {
  const fruit = pickRandomFruit("Logia", () => 0.5);
  assert.equal(fruit.type, "Logia");
});

test("revealsFruit : un compagnon connaisseur révèle n'importe quel fruit", () => {
  const fruit = FRUITS.find((f) => f.type === "Logia")!;
  assert.equal(revealsFruit(new Set(["compagnon-connaisseur"]), fruit), true);
});

test("revealsFruit : l'origine noble ne révèle que les Paramecia", () => {
  const paramecia = FRUITS.find((f) => f.type === "Paramecia")!;
  const logia = FRUITS.find((f) => f.type === "Logia")!;
  assert.equal(revealsFruit(new Set(["origine-noble"]), paramecia), true);
  assert.equal(revealsFruit(new Set(["origine-noble"]), logia), false);
});

test("revealsFruit : sans source de connaissance, rien n'est révélé", () => {
  const fruit = FRUITS[0];
  assert.equal(revealsFruit(new Set(), fruit), false);
});

test("findEatenFruit : retrouve le fruit correspondant au drapeau fruit-<id>", () => {
  const fruit = FRUITS[3];
  const found = findEatenFruit(new Set([`fruit-${fruit.id}`, "autre-drapeau"]));
  assert.equal(found, fruit);
});

test("findEatenFruit : undefined si aucun drapeau fruit-<id>", () => {
  assert.equal(findEatenFruit(new Set(["epeiste-recrute"])), undefined);
});
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `npm test`
Expected: FAIL — le module `../fruits.ts` n'existe pas.

- [ ] **Step 3: Créer `src/games/roi-des-pirates/fruits.ts`**

```ts
import type { Fruit, FruitType } from "./types";

export const FRUITS: Fruit[] = [
  // Zoan
  { id: "neko-tigre", nom: "Neko Neko no Mi, modèle Tigre", type: "Zoan", description: "Tu bondis plus vite que l'œil ne suit, toutes griffes dehors.", effects: { force: 25, notoriete: 5, fruitDuDemon: 15 } },
  { id: "inu-loup", nom: "Inu Inu no Mi, modèle Loup", type: "Zoan", description: "Un instinct de meute s'éveille en toi — tu ne marches plus jamais vraiment seul.", effects: { force: 18, equipage: 10, fruitDuDemon: 15 } },
  { id: "tori-faucon", nom: "Tori Tori no Mi, modèle Faucon", type: "Zoan", description: "Le ciel t'appartient un peu, et les rumeurs sur toi voyagent aussi vite que tes ailes.", effects: { force: 15, notoriete: 10, fruitDuDemon: 15 } },
  { id: "uma-cheval", nom: "Uma Uma no Mi, modèle Cheval", type: "Zoan", description: "Increvable, tu portes ton équipage plus loin que la logique ne l'autorise.", effects: { force: 12, equipage: 8, fruitDuDemon: 12 } },
  { id: "kuma-ours", nom: "Kuma Kuma no Mi, modèle Ours", type: "Zoan", description: "Une force brute, presque effrayante — certains hésitent avant de dormir dans la cale voisine.", effects: { force: 30, equipage: -5, fruitDuDemon: 18 } },
  { id: "same-requin", nom: "Same Same no Mi, modèle Requin", type: "Zoan", description: "Tes dents s'allongent, ta morsure devient une légende de marché aux poissons.", effects: { force: 20, fruitDuDemon: 18 } },
  { id: "ryu-dragon", nom: "Ryu Ryu no Mi, modèle Dragon Antique", type: "Zoan", description: "Un pouvoir venu d'avant les cartes marines — rarissime, terrassant.", effects: { force: 35, notoriete: 20, fruitDuDemon: 25 } },
  { id: "zou-elephant", nom: "Zou Zou no Mi, modèle Éléphant", type: "Zoan", description: "Ton pas fait trembler les pontons ; ton bateau, lui, grince sous le poids.", effects: { force: 28, equipage: -10, fruitDuDemon: 16 } },
  { id: "hebi-vipere", nom: "Hebi Hebi no Mi, modèle Vipère", type: "Zoan", description: "Un venin dans les crocs, une réputation qui précède désormais chacun de tes pas.", effects: { force: 15, notoriete: 8, fruitDuDemon: 14 } },
  { id: "oni-demon", nom: "Oni Oni no Mi, modèle Démon Antique", type: "Zoan", description: "Des cornes, un rictus, et des marins qui se signent en te croisant.", effects: { force: 32, notoriete: 15, fruitDuDemon: 20 } },

  // Paramecia
  { id: "bane-ressort", nom: "Bane Bane no Mi", type: "Paramecia", description: "Tes membres se détendent comme des ressorts — pratique pour frapper, pratique pour rire un peu de toi-même.", effects: { force: 15, equipage: 5, fruitDuDemon: 6 } },
  { id: "doku-poison", nom: "Doku Doku no Mi", type: "Paramecia", description: "Tu sécrètes des poisons qu'aucun docteur de ces mers ne sait nommer.", effects: { force: 20, notoriete: 15, fruitDuDemon: 10 } },
  { id: "kilo-poids", nom: "Kilo Kilo no Mi", type: "Paramecia", description: "De plume à enclume à volonté — utile pour surprendre, encore plus pour t'échapper.", effects: { force: 10, equipage: 5, fruitDuDemon: 6 } },
  { id: "toge-epines", nom: "Toge Toge no Mi", type: "Paramecia", description: "Ta peau se hérisse de pointes — les embrassades, désormais, se font à distance.", effects: { force: 18, fruitDuDemon: 8 } },
  { id: "awa-bulles", nom: "Awa Awa no Mi", type: "Paramecia", description: "Tu peux laver la force d'un ennemi comme on récure un pont — un pouvoir qu'on sous-estime toujours trop tard.", effects: { equipage: 15, notoriete: 5, fruitDuDemon: 8 } },
  { id: "nikyu-coussin", nom: "Nikyu Nikyu no Mi", type: "Paramecia", description: "Tu repousses tout ce qui t'approche, y compris — parfois — ceux qui voudraient rester.", effects: { force: 25, equipage: -10, fruitDuDemon: 12 } },
  { id: "ope-ope", nom: "Ope Ope no Mi", type: "Paramecia", description: "Le fruit du Chirurgien de la Mort — le plus recherché des mers, dit capable de vendre jusqu'à l'immortalité.", effects: { notoriete: 30, force: 5, fruitDuDemon: 15 } },
  { id: "bari-barriere", nom: "Bari Bari no Mi", type: "Paramecia", description: "Des murs invisibles jaillissent de tes mains — ton équipage dort mieux la nuit, en mer hostile.", effects: { force: 15, equipage: 10, fruitDuDemon: 10 } },
  { id: "horo-fantome", nom: "Horo Horo no Mi", type: "Paramecia", description: "Des fantômes qui volent la volonté d'un adversaire d'un seul regard triste.", effects: { force: 10, notoriete: 10, fruitDuDemon: 10 } },
  { id: "doru-cire", nom: "Doru Doru no Mi", type: "Paramecia", description: "Tu sculptes la cire plus dure que l'acier — pratique pour un pont, une arme, ou une couronne improvisée.", effects: { force: 12, equipage: 8, fruitDuDemon: 8 } },

  // Logia
  { id: "mera-feu", nom: "Mera Mera no Mi", type: "Logia", description: "Ton corps devient flamme — les Marines racontent déjà des histoires à ton sujet, autour du feu, ironiquement.", effects: { force: 30, notoriete: 20, fruitDuDemon: 22 } },
  { id: "hie-glace", nom: "Hie Hie no Mi", type: "Logia", description: "Un froid absolu qui fige la mer elle-même sous tes pas.", effects: { force: 28, notoriete: 18, fruitDuDemon: 22 } },
  { id: "suna-sable", nom: "Suna Suna no Mi", type: "Logia", description: "Tu deviens désert — insaisissable, asséchant tout ce qui t'entoure.", effects: { force: 25, notoriete: 15, fruitDuDemon: 20 } },
  { id: "goro-foudre", nom: "Goro Goro no Mi", type: "Logia", description: "La foudre elle-même t'obéit — on dit que c'est le plus puissant des Logia, et pour une fois ce n'est pas exagéré.", effects: { force: 35, notoriete: 25, fruitDuDemon: 28 } },
  { id: "yami-tenebres", nom: "Yami Yami no Mi", type: "Logia", description: "Les ténèbres avalent tout, même les autres pouvoirs — une malédiction en plus de la malédiction, et une solitude que peu supportent.", effects: { force: 30, notoriete: 10, equipage: -15, fruitDuDemon: 25 } },
  { id: "moku-fumee", nom: "Moku Moku no Mi", type: "Logia", description: "Tu te disperses en fumée avant même que le coup ne parte.", effects: { force: 20, notoriete: 12, fruitDuDemon: 18 } },
  { id: "numa-marais", nom: "Numa Numa no Mi", type: "Logia", description: "Un marécage vivant qui engloutit lentement tout ce qui s'y aventure — y compris, parfois, tes propres bottes.", effects: { force: 18, equipage: -5, fruitDuDemon: 16 } },
  { id: "pika-lumiere", nom: "Pika Pika no Mi", type: "Logia", description: "Tu te déplaces à la vitesse de la lumière — littéralement, ce qui rend les duels plutôt courts.", effects: { force: 32, notoriete: 20, fruitDuDemon: 26 } },
  { id: "magu-magma", nom: "Magu Magu no Mi", type: "Logia", description: "Un pouvoir qui fait fondre jusqu'au feu lui-même — le sommet de la hiérarchie des Logia.", effects: { force: 35, notoriete: 22, fruitDuDemon: 28 } },
  { id: "gasu-gaz", nom: "Gasu Gasu no Mi", type: "Logia", description: "Un nuage toxique et volatile — difficile à combattre, encore plus difficile à respirer.", effects: { force: 22, notoriete: 10, fruitDuDemon: 18 } },
];

export function pickRandomFruit(type?: FruitType, rng: () => number = Math.random): Fruit {
  const pool = type ? FRUITS.filter((f) => f.type === type) : FRUITS;
  return pool[Math.floor(rng() * pool.length)];
}

export function revealsFruit(flags: Set<string>, fruit: Fruit): boolean {
  if (flags.has("compagnon-connaisseur")) return true;
  if (flags.has("origine-noble") && fruit.type === "Paramecia") return true;
  return false;
}

export function findEatenFruit(flags: Set<string>): Fruit | undefined {
  for (const flag of flags) {
    if (flag.startsWith("fruit-")) {
      const found = FRUITS.find((f) => f.id === flag.slice("fruit-".length));
      if (found) return found;
    }
  }
  return undefined;
}
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/roi-des-pirates/fruits.ts src/games/roi-des-pirates/test/fruits.test.ts
git commit -m "feat(roi-des-pirates): table de 30 Fruits du Démon, tirage et révélation"
```

---

### Task 6: Câbler drapeaux/duels/fruits dans le moteur (`engine.ts`)

**Files:**
- Modify: `src/games/roi-des-pirates/engine.ts`

Cette tâche relie les fonctions pures des tâches 2-5 à l'état du jeu et au DOM. Comme le reste du moteur (`renderNode`, `navigate`) touche le DOM, elle n'est pas couverte par un test automatisé — elle est vérifiée manuellement à la Task 9 (playtest) une fois le contenu narratif en place, conformément à la convention déjà suivie par le reste du site (voir section "Tests" du design).

- [ ] **Step 1: Lire le fichier actuel pour repérer les points d'insertion**

Le fichier `src/games/roi-des-pirates/engine.ts` a, à ce stade (après Tasks 2-4), les fonctions pures ajoutées en haut, puis plus bas le code d'état/DOM original :

```ts
let nodes: Record<string, StoryNode>;
let stats: Stats;
let currentNodeId: string;
```

- [ ] **Step 2: Ajouter l'état des drapeaux et du fruit en attente**

Juste après `let currentNodeId: string;`, ajouter :

```ts
let flags: Set<string>;
let pendingFruit: Fruit | undefined;

export function getPendingFruit(): Fruit | undefined {
  return pendingFruit;
}
```

Et mettre à jour l'import en haut du fichier :

```ts
import type { Stats, StoryNode, Choice, EndingId, Fruit } from "./types";
import { pickRandomFruit } from "./fruits";
```

- [ ] **Step 3: Mettre à jour `renderNode` pour utiliser `resolveText` et `filterChoices`**

Remplacer les deux lignes suivantes dans `renderNode` :

```ts
  arcEl.textContent = node.arc ? ARC_LABELS[node.arc] : "";
```
```ts
  illustEl.innerHTML = node.svg;
  textEl.textContent = node.text;
  choicesEl.innerHTML = "";
```

par (texte résolu dynamiquement) :

```ts
  arcEl.textContent = node.arc ? ARC_LABELS[node.arc] : "";
```
```ts
  illustEl.innerHTML = node.svg;
  textEl.textContent = resolveText(node.text, flags);
  choicesEl.innerHTML = "";
```

Puis, dans la boucle `for (const choice of node.choices)`, remplacer :

```ts
  for (const choice of node.choices) {
```

par :

```ts
  for (const choice of filterChoices(node.choices, flags)) {
```

Et dans cette même boucle, la ligne qui affecte `textSpan.textContent` et `subSpan.textContent` doit utiliser `resolveText` aussi (au cas où un `Choice.text`/`sub` deviendrait dynamique plus tard) — **ne pas changer ces deux lignes** : `Choice.text`/`Choice.sub` restent des `string` simples dans les types (Task 1), donc aucun changement nécessaire ici.

- [ ] **Step 4: Réécrire `navigate` pour gérer drapeaux, duels et fruits**

Remplacer entièrement la fonction `navigate` :

```ts
function navigate(choice: Choice): void {
  applyEffects(choice.effects);
  for (const flag of choice.setFlags ?? []) flags.add(flag);

  if (choice.duel) {
    const stat = choice.duel.statUsed ?? "force";
    const outcome = resolveDuel(stats[stat], choice.duel.opponentPower);
    if (outcome === "victoire") {
      for (const flag of choice.duel.winFlags ?? []) flags.add(flag);
      if (choice.duel.winPicksFruit !== undefined) {
        pendingFruit = pickRandomFruit(
          choice.duel.winPicksFruit === "any" ? undefined : choice.duel.winPicksFruit,
        );
      }
      currentNodeId = choice.duel.win;
    } else if (outcome === "defaite-legere") {
      if (choice.duel.loseMinorPicksFruit !== undefined) {
        pendingFruit = pickRandomFruit(
          choice.duel.loseMinorPicksFruit === "any" ? undefined : choice.duel.loseMinorPicksFruit,
        );
      }
      currentNodeId = choice.duel.loseMinor;
    } else {
      if (choice.duel.injuryFlag) flags.add(choice.duel.injuryFlag);
      currentNodeId = choice.duel.loseMajor;
    }
  } else if (choice.pickFruitCandidate) {
    pendingFruit = pickRandomFruit(choice.pickFruitCandidate.type);
    currentNodeId = choice.next!;
  } else if (choice.eatPendingFruit) {
    if (pendingFruit) {
      applyEffects(pendingFruit.effects);
      flags.add(`fruit-${pendingFruit.id}`);
      flags.add("a-mange-un-fruit");
    }
    currentNodeId = choice.eatPendingFruit.next;
  } else if (choice.next === "__ending__") {
    currentNodeId = computeEndingId();
  } else {
    currentNodeId = choice.next!;
  }

  renderNode();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
```

Note : `flags.add("a-mange-un-fruit")` (posé en plus de `fruit-<id>` quand un fruit est mangé via `eatPendingFruit`) sert de garde-fou narratif — dans le lore, manger un deuxième Fruit du Démon est fatal, et `findEatenFruit` (Task 5) ne retrouve de toute façon que le premier fruit mangé. Les tâches 9 et 10 (Grand Line, Nouveau Monde) posent `forbidsFlags: ["a-mange-un-fruit"]` sur leurs choix "manger" pour empêcher d'en manger un second une fois ce drapeau posé.

- [ ] **Step 5: Initialiser et réinitialiser `flags`/`pendingFruit` dans `startEngine`**

Dans `startEngine`, remplacer :

```ts
export function startEngine(storyNodes: StoryNode[]): void {
  nodes = Object.fromEntries(storyNodes.map((n) => [n.id, n]));
  stats = { force: 0, notoriete: 0, equipage: 0, fruitDuDemon: 0 };
  currentNodeId = "intro";

  const replayBtn = document.getElementById("replay-btn");
  if (replayBtn) {
    replayBtn.addEventListener("click", () => {
      stats = { force: 0, notoriete: 0, equipage: 0, fruitDuDemon: 0 };
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

- [ ] **Step 6: Vérifier la compilation**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: aucune nouvelle erreur pour `roi-des-pirates`.

- [ ] **Step 7: Vérifier que les tests existants passent toujours**

Run: `npm test`
Expected: PASS (les tests des Tasks 2-5 ne touchent pas au DOM, donc inchangés).

- [ ] **Step 8: Commit**

```bash
git add src/games/roi-des-pirates/engine.ts
git commit -m "feat(roi-des-pirates): câble drapeaux, duels et fruits dans le moteur de jeu"
```

---

### Task 7: Filet de sécurité — `story.test.ts` sur le contenu actuel

**Files:**
- Create: `src/games/roi-des-pirates/test/story.test.ts`

Ce test tourne AVANT l'expansion de contenu (Tasks 8-10) pour prouver que le validateur fonctionne sur la base actuelle (15 nœuds), puis reste actif comme garde-fou pendant l'écriture des ~50 nouveaux nœuds.

- [ ] **Step 1: Créer le test**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateStoryGraph } from "../engine.ts";
import { STORY } from "../story.ts";

test("STORY : le graphe narratif ne contient aucune référence cassée", () => {
  const errors = validateStoryGraph(STORY);
  assert.deepEqual(errors, []);
});

test("STORY : les 4 fins existent et sont bien marquées comme telles", () => {
  const endingIds = ["fin-roi-des-pirates", "fin-legende", "fin-retraite", "fin-capture"];
  for (const id of endingIds) {
    const node = STORY.find((n) => n.id === id);
    assert.ok(node, `fin manquante: ${id}`);
    assert.equal(node!.isEnding, true);
  }
});
```

- [ ] **Step 2: Lancer les tests, vérifier le succès sur la base actuelle**

Run: `npm test`
Expected: PASS — le graphe à 15 nœuds est déjà valide (aucune référence cassée dans le contenu existant).

- [ ] **Step 3: Commit**

```bash
git add src/games/roi-des-pirates/test/story.test.ts
git commit -m "test(roi-des-pirates): filet de sécurité sur l'intégrité du graphe narratif"
```

---

### Task 8: Contenu — East Blue étoffé (11 nœuds, était 5)

**Files:**
- Modify: `src/games/roi-des-pirates/story.ts`

Nouveau fil East Blue : `intro → eb-origines → eb-choix-fondateur → eb-fruit-trouvaille → (eb-avec-fruit | eb-avec-haki) → eb-rencontre-epeiste → (eb-epeiste-duel-victoire | eb-epeiste-duel-defaite | eb-epeiste-duel-blessure) → eb-marine → eb-depart → gl-arrivee`.

- [ ] **Step 1: Poser le drapeau `origine-noble` sur le choix "famille noble" de `eb-origines`**

`revealsFruit` (Task 5) vérifie le drapeau `origine-noble`, mais aucun choix ne le pose encore — sans ce step, cette source de connaissance ne se déclenche jamais en jeu. Dans le nœud `eb-origines` déjà existant, remplacer :

```ts
      {
        text: "D'une famille noble tombée en disgrâce.",
        sub: "Tu as appris à sourire dans les salons, à survivre dans la rue.",
        effects: { notoriete: 15, equipage: 5 },
        next: "eb-choix-fondateur",
      },
```

par :

```ts
      {
        text: "D'une famille noble tombée en disgrâce.",
        sub: "Tu as appris à sourire dans les salons, à survivre dans la rue — et à reconnaître certains fruits dans les livres de ton père.",
        effects: { notoriete: 15, equipage: 5 },
        setFlags: ["origine-noble"],
        next: "eb-choix-fondateur",
      },
```

- [ ] **Step 2: Modifier `eb-choix-fondateur`**

Remplacer entièrement ce nœud (garder le même `id`) :

```ts
  {
    id: "eb-choix-fondateur",
    arc: "east-blue",
    title: "East Blue — Le choix fondateur",
    text: "Sur l'épave d'un navire pirate coulé, parmi les caisses brisées et le sel, tu trouves un coffret en bois rare. À l'intérieur : un fruit aux couleurs étranges, que tu ne reconnais pas. Personne, sur ce quai désert, ne pourrait te dire ce qu'il fait. Il n'y a qu'une façon de le savoir.",
    svg: SVG_DEVIL_FRUIT,
    choices: [
      { text: "Ouvrir le coffret, l'examiner de plus près.", effects: {}, next: "eb-fruit-trouvaille" },
      {
        text: "Refermer le coffret. Le vrai pouvoir vient du corps, de l'esprit, de la volonté.",
        sub: "La voie du Haki. Plus longue, plus profonde.",
        effects: { force: 20 },
        next: "eb-avec-haki",
      },
    ],
  },
```

- [ ] **Step 3: Ajouter `eb-fruit-trouvaille` juste après**

```ts
  {
    id: "eb-fruit-trouvaille",
    arc: "east-blue",
    title: "East Blue — Le fruit inconnu",
    text: (flags) => {
      const fruit = getPendingFruit();
      if (fruit && revealsFruit(flags, fruit)) {
        return `Tu tournes le fruit entre tes doigts. Tu le reconnais : un ${fruit.nom}. ${fruit.description} À toi de décider si tu le veux vraiment.`;
      }
      return "Tu tournes le fruit entre tes doigts, sans la moindre idée de ce qu'il cache. Aucun livre, aucune rumeur de taverne ne t'a jamais préparé à celui-là. Manger un fruit inconnu, c'est signer un pacte à l'aveugle.";
    },
    svg: SVG_DEVIL_FRUIT,
    choices: [
      {
        text: "Le manger. Peu importe le prix.",
        sub: "Puissance — la mer te tuera si tu tombes à l'eau.",
        effects: {},
        eatPendingFruit: { next: "eb-avec-fruit" },
      },
      {
        text: "Le laisser. Refermer le coffret et repartir.",
        effects: {},
        next: "eb-avec-haki",
      },
    ],
  },
```

Ce nœud est atteint après un choix `pickFruitCandidate` — il faut donc que le choix "Ouvrir le coffret" de `eb-choix-fondateur` (Step 1) déclenche le tirage. Reprendre `eb-choix-fondateur` et remplacer son premier choix :

```ts
      { text: "Ouvrir le coffret, l'examiner de plus près.", effects: {}, next: "eb-fruit-trouvaille" },
```

par :

```ts
      {
        text: "Ouvrir le coffret, l'examiner de plus près.",
        effects: {},
        pickFruitCandidate: {},
        next: "eb-fruit-trouvaille",
      },
```

- [ ] **Step 4: Mettre à jour l'import en haut de `story.ts`**

Remplacer :

```ts
import type { StoryNode } from "./types";
```

par :

```ts
import type { StoryNode } from "./types";
import { getPendingFruit, describeInjuries } from "./engine";
import { revealsFruit, findEatenFruit } from "./fruits";
```

- [ ] **Step 5: Mettre à jour le texte de `eb-avec-fruit` pour référencer le fruit mangé**

Remplacer le champ `text` de `eb-avec-fruit` :

```ts
    text: "Le monde explose. Le pouvoir coule dans tes veines comme un fleuve de feu. Mais quand tu tombes à l'eau par accident, tu coules comme une pierre. La mer est ton ennemie jurée, désormais. Des compagnons se présentent — un jeune épéiste trop ambitieux, une navigatrice qui lit les étoiles. Ensemble ou seul ?",
```

par :

```ts
    text: (flags) => {
      const fruit = findEatenFruit(flags);
      const nom = fruit?.nom ?? "pouvoir";
      return `${nom} explose en toi. Le monde change de couleur l'espace d'un instant. Mais quand tu tombes à l'eau par accident, tu coules comme une pierre — la mer est ton ennemie jurée, désormais. Ce prix payé, il ne te reste plus qu'à apprendre à vivre avec.`;
    },
```

- [ ] **Step 6: Ajouter la rencontre de l'épéiste, après `eb-avec-fruit`/`eb-avec-haki`, avant `eb-marine`**

Les deux nœuds `eb-avec-fruit` et `eb-avec-haki` pointent aujourd'hui vers `eb-marine` dans leurs deux choix respectifs. Remplacer, dans **les deux nœuds**, chaque occurrence de `next: "eb-marine"` par `next: "eb-rencontre-epeiste"`.

Ajouter ensuite ce nouveau nœud et ses trois issues de duel, juste avant `eb-marine` :

```ts
  {
    id: "eb-rencontre-epeiste",
    arc: "east-blue",
    title: "East Blue — Un épéiste dans une taverne",
    text: "Dans l'arrière-salle d'une taverne qui sent la sciure et le rhum bon marché, un jeune épéiste vient de mettre trois hommes au tapis pour une histoire de dette impayée. Il te regarde, amusé, comme s'il te jaugeait déjà.",
    svg: SVG_EAST_BLUE,
    choices: [
      {
        text: "Le défier en duel, pour de vrai. Jauger sa force avant de lui faire confiance.",
        effects: {},
        duel: {
          opponentPower: 55,
          win: "eb-epeiste-duel-victoire",
          winFlags: ["epeiste-recrute"],
          loseMinor: "eb-epeiste-duel-defaite",
          loseMajor: "eb-epeiste-duel-blessure",
          injuryFlag: "bras-coupe",
        },
      },
      {
        text: "Lui proposer directement de rejoindre l'équipage, sans épreuve.",
        sub: "+Équipage, +Force — un pari sur la confiance.",
        effects: { equipage: 20, force: 10 },
        setFlags: ["epeiste-recrute"],
        next: "eb-marine",
      },
      {
        text: "Continuer sa route. Pas le temps pour les bagarres de comptoir.",
        effects: {},
        next: "eb-marine",
      },
    ],
  },

  {
    id: "eb-epeiste-duel-victoire",
    arc: "east-blue",
    title: "East Blue — Un serment de lame",
    text: "Tu le mets à terre, la pointe de ta lame — ou de ton poing — sous sa gorge. Il éclate de rire au lieu de supplier. \"C'est bon, tu m'as convaincu.\" Il se relève, tend la main. Un équipage vient de gagner son épéiste.",
    svg: SVG_EAST_BLUE,
    choices: [{ text: "Continuer.", effects: {}, next: "eb-marine" }],
  },

  {
    id: "eb-epeiste-duel-defaite",
    arc: "east-blue",
    title: "East Blue — Un duel serré, perdu de peu",
    text: "Le combat est plus long que prévu. Tu finis à terre, essoufflé, mais entier. Il te tend la main pour t'aider à te relever. \"Pas mal. Mais je ne rejoins pas les épaves.\" Il s'en va en sifflotant. Tu croiseras peut-être sa route ailleurs, un jour.",
    svg: SVG_EAST_BLUE,
    choices: [{ text: "Continuer.", effects: {}, next: "eb-marine" }],
  },

  {
    id: "eb-epeiste-duel-blessure",
    arc: "east-blue",
    title: "East Blue — Le prix de l'orgueil",
    text: "Il est meilleur que tu ne le pensais — bien meilleur. Sa lame trouve ton bras avant que tu ne comprennes ton erreur. La blessure ne guérira jamais tout à fait. Il s'excuse, presque sincère, et s'en va sans se retourner. Tu repars avec une leçon, et un bras en moins.",
    svg: SVG_EAST_BLUE,
    choices: [{ text: "Continuer, tant bien que mal.", effects: {}, next: "eb-marine" }],
  },
```

- [ ] **Step 7: Ajouter `eb-depart` entre `eb-marine` et `gl-arrivee`**

Le nœud `eb-marine` a deux choix qui pointent vers `gl-arrivee`. Remplacer les deux occurrences de `next: "gl-arrivee"` dans `eb-marine` par `next: "eb-depart"`.

Ajouter ce nouveau nœud juste après `eb-marine` :

```ts
  {
    id: "eb-depart",
    arc: "east-blue",
    title: "East Blue — Dernier regard vers le port",
    text: (flags) => {
      const morceaux = ["East Blue rétrécit derrière toi, plus petit à chaque vague."];
      if (flags.has("epeiste-recrute")) {
        morceaux.push("Ton épéiste s'entraîne déjà sur le pont, imperturbable.");
      }
      const injuries = describeInjuries(flags);
      if (injuries.length > 0) {
        morceaux.push(`Tu pars avec ${injuries.join(" et ")} — un souvenir qui ne s'efface pas.`);
      }
      morceaux.push("Devant toi : la Grand Line, et tout ce qu'elle refuse d'annoncer à l'avance.");
      return morceaux.join(" ");
    },
    svg: SVG_EAST_BLUE,
    choices: [{ text: "Mettre le cap sur la Grand Line.", effects: {}, next: "gl-arrivee" }],
  },
```

`describeInjuries` est déjà disponible via l'import mis à jour au Step 4.

- [ ] **Step 8: Vérifier la compilation et les tests**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: aucune nouvelle erreur pour `roi-des-pirates`.

Run: `npm test`
Expected: PASS — `validateStoryGraph(STORY)` doit rester `[]` (toutes les nouvelles cibles `next`/`duel.*` pointent vers des nœuds qui existent bien dans ce fichier).

- [ ] **Step 9: Commit**

```bash
git add src/games/roi-des-pirates/story.ts
git commit -m "feat(roi-des-pirates): étoffe l'arc East Blue (fruit trouvé, épéiste recrutable, départ)"
```

---

### Task 9: Contenu — Grand Line étoffé (9 nœuds, était 2)

**Files:**
- Modify: `src/games/roi-des-pirates/story.ts`

Nouveau fil : `gl-arrivee → gl-epeiste-retour → gl-rencontre-navigatrice → gl-vol-fruit-rencontre → (gl-vol-fruit-butin → gl-post-vol-fruit-mange | gl-vol-fruit-echec | gl-vol-fruit-blessure) → gl-grand-choix → nm-arrivee`.

- [ ] **Step 1: Rediriger `gl-arrivee`**

Remplacer le choix de `gl-arrivee` :

```ts
    choices: [
      { text: "Avancer.", effects: {}, next: "gl-grand-choix" },
    ],
```

par :

```ts
    choices: [
      { text: "Avancer.", effects: {}, next: "gl-epeiste-retour" },
    ],
```

- [ ] **Step 2: Ajouter `gl-epeiste-retour`**

```ts
  {
    id: "gl-epeiste-retour",
    arc: "grand-line",
    title: "Grand Line — Un visage familier ?",
    text: (flags) =>
      flags.has("epeiste-recrute")
        ? "Sur le pont, ton épéiste aiguise sa lame sans un mot, les yeux fixés sur l'horizon nouveau. La Grand Line ne l'impressionne pas — ou il le cache bien."
        : "Sur les quais d'une île de passage, tu croises à nouveau ce même épéiste d'East Blue, plus loin de chez lui que toi. Il te reconnaît, hausse un sourcil. \"Toujours vivant, à ce que je vois.\"",
    svg: SVG_GRAND_LINE,
    choices: [
      {
        text: "Lui proposer, une seconde fois, de rejoindre l'équipage.",
        sub: "+Équipage, +Force",
        effects: { equipage: 15, force: 8 },
        setFlags: ["epeiste-recrute"],
        forbidsFlags: ["epeiste-recrute"],
        next: "gl-rencontre-navigatrice",
      },
      {
        text: "Continuer sa route.",
        effects: {},
        next: "gl-rencontre-navigatrice",
      },
    ],
  },
```

- [ ] **Step 3: Ajouter `gl-rencontre-navigatrice`**

```ts
  {
    id: "gl-rencontre-navigatrice",
    arc: "grand-line",
    title: "Grand Line — Une navigatrice pour les mers folles",
    text: "Sur ce même quai, une jeune femme discute avec un marchand de cartes marines, l'air de connaître les courants mieux que quiconque à cent lieues à la ronde. La Grand Line dévore les navigateurs médiocres. Un bon connaît la différence entre une accalmie et un piège.",
    svg: SVG_GRAND_LINE,
    choices: [
      {
        text: "L'embarquer. Tu jugeras de sa valeur plus tard, sur le terrain.",
        sub: "+Équipage — sa vraie valeur reste à découvrir.",
        effects: { equipage: 10 },
        setFlags: ["navigatrice-recrute"],
        next: "gl-vol-fruit-rencontre",
      },
      {
        text: "Refuser. Un problème de plus à nourrir sur un bateau déjà trop plein.",
        effects: {},
        next: "gl-vol-fruit-rencontre",
      },
    ],
  },
```

- [ ] **Step 4: Ajouter `gl-vol-fruit-rencontre` et ses trois issues**

```ts
  {
    id: "gl-vol-fruit-rencontre",
    arc: "grand-line",
    title: "Grand Line — Un coffre bien gardé",
    text: "Un pirate isolé, la démarche trop assurée pour être honnête, traîne un petit coffre verrouillé qu'il ne quitte jamais des yeux. La rumeur du port dit qu'il contient un Fruit du Démon. La rumeur du port dit beaucoup de choses, mais celle-ci sent le vrai.",
    svg: SVG_ALLIANCE,
    choices: [
      {
        text: "L'affronter pour le lui prendre.",
        effects: {},
        duel: {
          opponentPower: 60,
          win: "gl-vol-fruit-butin",
          winPicksFruit: "any",
          loseMinor: "gl-vol-fruit-echec",
          loseMajor: "gl-vol-fruit-blessure",
          injuryFlag: "main-brisee",
        },
      },
      {
        text: "Le laisser partir. Pas la peine du risque, cette fois.",
        effects: {},
        next: "gl-grand-choix",
      },
    ],
  },

  {
    id: "gl-vol-fruit-butin",
    arc: "grand-line",
    title: "Grand Line — Le coffre, enfin ouvert",
    text: (flags) => {
      const fruit = getPendingFruit();
      if (fruit && revealsFruit(flags, fruit)) {
        return `Le pirate au sol, tu ouvres le coffre : un ${fruit.nom}. ${fruit.description} Le voler ne le rend pas moins tentant.`;
      }
      return "Le pirate au sol, tu ouvres le coffre : un fruit que tu ne reconnais pas, aux couleurs qui ne ressemblent à rien de familier. Voler un pouvoir, c'est aussi voler l'incertitude qui va avec.";
    },
    svg: SVG_ALLIANCE,
    choices: [
      {
        text: "Le manger.",
        effects: {},
        forbidsFlags: ["a-mange-un-fruit"],
        eatPendingFruit: { next: "gl-post-vol-fruit-mange" },
      },
      {
        text: "Le garder pour plus tard, sans le manger.",
        effects: {},
        next: "gl-grand-choix",
      },
    ],
  },

  {
    id: "gl-post-vol-fruit-mange",
    arc: "grand-line",
    title: "Grand Line — Un pouvoir volé",
    text: (flags) => {
      const fruit = findEatenFruit(flags);
      return `${fruit?.nom ?? "Le pouvoir"} coule en toi, arraché plutôt que trouvé. Ça ne change rien à l'effet. ${fruit?.description ?? ""}`;
    },
    svg: SVG_ALLIANCE,
    choices: [{ text: "Continuer.", effects: {}, next: "gl-grand-choix" }],
  },

  {
    id: "gl-vol-fruit-echec",
    arc: "grand-line",
    title: "Grand Line — Le coffre s'échappe",
    text: "Le combat tourne mal. Le pirate profite d'une ouverture, ramasse son coffre et disparaît dans la foule du port. Tu restes debout, les mains vides, avec juste ta fierté écornée.",
    svg: SVG_ALLIANCE,
    choices: [{ text: "Continuer.", effects: {}, next: "gl-grand-choix" }],
  },

  {
    id: "gl-vol-fruit-blessure",
    arc: "grand-line",
    title: "Grand Line — Mauvais calcul",
    text: "Il se défend mieux que son allure de vantard ne le laissait deviner. Un coup mal paré, et ta main ne se refermera plus jamais tout à fait comme avant. Il s'enfuit avec son coffre, et toi avec la leçon.",
    svg: SVG_ALLIANCE,
    choices: [{ text: "Continuer, la main serrée contre toi.", effects: {}, next: "gl-grand-choix" }],
  },
```

- [ ] **Step 5: Vérifier la compilation et les tests**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: aucune nouvelle erreur pour `roi-des-pirates`.

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/games/roi-des-pirates/story.ts
git commit -m "feat(roi-des-pirates): étoffe l'arc Grand Line (retour épéiste, navigatrice, vol de fruit)"
```

---

### Task 10: Contenu — Nouveau Monde étoffé (8 nœuds, était 2) + fin dynamique

**Files:**
- Modify: `src/games/roi-des-pirates/story.ts`

Nouveau fil : `nm-arrivee → nm-rencontre-medecin → nm-quete-fruit → (nm-fruit-ope-ope-trouve | nm-quete-fruit-inconnu | nm-quete-fruit-echec) → nm-wano → nm-avant-laugh-tale → arc-final`.

- [ ] **Step 1: Rediriger `nm-arrivee`**

Remplacer :

```ts
    choices: [
      { text: "S'y aventurer.", effects: {}, next: "nm-wano" },
    ],
```

par :

```ts
    choices: [
      { text: "S'y aventurer.", effects: {}, next: "nm-rencontre-medecin" },
    ],
```

- [ ] **Step 2: Ajouter `nm-rencontre-medecin`**

```ts
  {
    id: "nm-rencontre-medecin",
    arc: "nouveau-monde",
    title: "Nouveau Monde — Un médecin sans navire",
    text: "Sur une île à moitié engloutie, un médecin erre depuis le naufrage de son propre équipage. Il connaît les blessures de guerre, les poisons des Logia, et — détail qu'il glisse presque timidement — les Fruits du Démon, qu'il a étudiés toute sa vie.",
    svg: SVG_NOUVEAU_MONDE,
    choices: [
      {
        text: "L'accueillir à bord.",
        sub: "+Équipage, +Force — et une vraie connaissance des fruits.",
        effects: { equipage: 15, force: 5 },
        setFlags: ["medecin-recrute", "compagnon-connaisseur"],
        next: "nm-quete-fruit",
      },
      {
        text: "Continuer seul. Une bouche de plus à nourrir, si près du but.",
        effects: {},
        next: "nm-quete-fruit",
      },
    ],
  },
```

- [ ] **Step 3: Ajouter `nm-quete-fruit` et ses trois issues**

```ts
  {
    id: "nm-quete-fruit",
    arc: "nouveau-monde",
    title: "Nouveau Monde — La légende du bistouri",
    text: "Une rumeur revient sans cesse dans les ports du Nouveau Monde : quelque part circule l'Ope Ope no Mi, le fruit du \"Chirurgien de la Mort\", capable — dit-on — de vendre jusqu'à l'immortalité elle-même. Le trouver prendrait du temps. Et rien ne garantit que la rumeur dise vrai.",
    svg: SVG_NOUVEAU_MONDE,
    choices: [
      {
        text: "Partir à sa recherche, coûte que coûte.",
        effects: {},
        duel: {
          opponentPower: 65,
          statUsed: "notoriete",
          win: "nm-fruit-ope-ope-trouve",
          loseMinor: "nm-quete-fruit-inconnu",
          loseMinorPicksFruit: "any",
          loseMajor: "nm-quete-fruit-echec",
          injuryFlag: "jambe-blessee",
        },
      },
      {
        text: "Laisser cette légende à d'autres.",
        effects: {},
        next: "nm-wano",
      },
    ],
  },

  {
    id: "nm-fruit-ope-ope-trouve",
    arc: "nouveau-monde",
    title: "Nouveau Monde — L'Ope Ope no Mi",
    text: "La rumeur disait vrai. Après des semaines de recherche, tu tiens enfin l'Ope Ope no Mi entre tes mains — le fruit le plus recherché des mers, celui que même les Empereurs se disputent en silence.",
    svg: SVG_NOUVEAU_MONDE,
    choices: [
      {
        text: "Le dévorer. Ce pouvoir sera tien.",
        sub: "+Notoriété (beaucoup), +Force",
        effects: { notoriete: 30, force: 5, fruitDuDemon: 15 },
        setFlags: ["fruit-ope-ope", "a-mange-un-fruit"],
        forbidsFlags: ["a-mange-un-fruit"],
        next: "nm-wano",
      },
      {
        text: "Le garder sans le manger. Pas encore prêt à porter ce poids.",
        effects: {},
        next: "nm-wano",
      },
    ],
  },

  {
    id: "nm-quete-fruit-inconnu",
    arc: "nouveau-monde",
    title: "Nouveau Monde — Une autre trouvaille",
    text: (flags) => {
      const fruit = getPendingFruit();
      if (fruit && revealsFruit(flags, fruit)) {
        return `L'Ope Ope no Mi reste introuvable. Mais au fond d'une grotte oubliée, tu tombes sur autre chose : un ${fruit.nom}. ${fruit.description}`;
      }
      return "L'Ope Ope no Mi reste introuvable. Mais au fond d'une grotte oubliée, tu tombes sur un autre fruit — inconnu, celui-là, sans la moindre légende pour te préparer à ce qu'il cache.";
    },
    svg: SVG_NOUVEAU_MONDE,
    choices: [
      {
        text: "Le manger, puisqu'il est là.",
        effects: {},
        forbidsFlags: ["a-mange-un-fruit"],
        eatPendingFruit: { next: "nm-wano" },
      },
      {
        text: "Le laisser. Une légende à la fois suffit.",
        effects: {},
        next: "nm-wano",
      },
    ],
  },

  {
    id: "nm-quete-fruit-echec",
    arc: "nouveau-monde",
    title: "Nouveau Monde — La quête de trop",
    text: "La recherche tourne au désastre. Un éboulement, une chute mal négociée, et ta jambe ne te portera plus jamais aussi bien qu'avant. L'Ope Ope no Mi restera une légende parmi d'autres — pour toi, en tout cas.",
    svg: SVG_NOUVEAU_MONDE,
    choices: [{ text: "Continuer, en boitant.", effects: {}, next: "nm-wano" }],
  },
```

- [ ] **Step 4: Ajouter `nm-avant-laugh-tale` entre `nm-wano` et `arc-final`**

Le nœud `nm-wano` a trois choix qui pointent tous vers `arc-final`. Remplacer les trois occurrences de `next: "arc-final"` dans `nm-wano` par `next: "nm-avant-laugh-tale"`.

Ajouter ce nouveau nœud juste après `nm-wano` :

```ts
  {
    id: "nm-avant-laugh-tale",
    arc: "nouveau-monde",
    title: "Nouveau Monde — Avant la dernière ligne droite",
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
    svg: SVG_NOUVEAU_MONDE,
    choices: [{ text: "Voguer vers Laugh Tale.", effects: {}, next: "arc-final" }],
  },
```

- [ ] **Step 5: Vérifier la compilation et les tests**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: aucune nouvelle erreur pour `roi-des-pirates`.

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/games/roi-des-pirates/story.ts
git commit -m "feat(roi-des-pirates): étoffe l'arc Nouveau Monde (médecin, quête de l'Ope Ope no Mi, avant Laugh Tale)"
```

---

### Task 11: Playtest manuel et vérification finale

**Files:** aucun changement de code — vérification uniquement.

- [ ] **Step 1: Lancer le serveur de dev**

Run (depuis `Desktop\le-petit-prince\.worktrees\feat-roi-des-pirates`) :
```bash
npx vite --port 5199 --strictPort
```
Expected: serveur prêt sur `http://localhost:5199`.

- [ ] **Step 2: Jouer au moins 4 parcours complets dans le navigateur**, en variant à chaque fois pour couvrir :
- Les 3 méthodes d'acquisition de fruit (trouvaille à East Blue, vol à Grand Line, quête ciblée à Nouveau Monde) — au moins une fois chacune sur les 4 parcours.
- Au moins une victoire de duel, une défaite légère, une blessure grave (relancer si le tirage aléatoire ne tombe pas du bon côté — c'est attendu, `resolveDuel` est probabiliste).
- Au moins une apparition de chacune des 4 fins (`fin-roi-des-pirates`, `fin-legende`, `fin-retraite`, `fin-capture`).
- Vérifier qu'aucun écran ne s'affiche sans aucun bouton cliquable.
- Vérifier qu'aucune erreur n'apparaît dans la console du navigateur (DevTools → Console).

- [ ] **Step 3: Vérifier la console développeur pendant les 4 parcours**

Aucune erreur JavaScript ne doit apparaître (`pageerror` ou `console.error`).

- [ ] **Step 4: Noter à l'utilisateur si l'équilibrage des fins semble déséquilibré**

Avec beaucoup plus de bonus de stats disponibles (fruits, recrutements), il est possible qu'une fin devienne trop facile ou trop difficile à atteindre par rapport aux seuils actuels dans `computeEndingId` (`engine.ts`). Ce n'est pas dans le scope de ce plan de rééquilibrer ces seuils — à signaler à l'utilisateur après le playtest, pour décider si un ajustement est souhaité dans un prochain chantier.

- [ ] **Step 5: Lancer la suite complète une dernière fois**

Run: `npm test`
Expected: PASS (tous les tests des Tasks 2-7).

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: aucune nouvelle erreur pour `roi-des-pirates` (les erreurs préexistantes `node:test` dans d'autres jeux restent, sans rapport).

- [ ] **Step 6: Arrêter le serveur de dev**

Run: `lsof -ti:5199 -sTCP:LISTEN | xargs -r kill`

---

## Résumé des fichiers touchés

- `src/games/roi-des-pirates/types.ts` — étendu (Task 1)
- `src/games/roi-des-pirates/engine.ts` — étendu (Tasks 2, 3, 4, 6)
- `src/games/roi-des-pirates/fruits.ts` — créé (Task 5)
- `src/games/roi-des-pirates/story.ts` — étendu de 15 à 44 nœuds (Tasks 8, 9, 10)
- `src/games/roi-des-pirates/test/engine.test.ts` — créé (Tasks 2, 3, 4)
- `src/games/roi-des-pirates/test/fruits.test.ts` — créé (Task 5)
- `src/games/roi-des-pirates/test/story.test.ts` — créé (Task 7)

Aucun fichier d'illustration (`illustrations.ts`) ni fichier hors de `src/games/roi-des-pirates/` n'est modifié.

**Note sur le budget de contenu** : le design visait ~55-65 nœuds ; ce plan en livre 44 (15 existants + 29 nouveaux, en comptant les fins). L'écart vient du choix de garder chaque branche resserrée (2-4 nœuds par embranchement plutôt que 3-5) pour rester dans une portée réalisable en une passe. Si le résultat semble encore court après le playtest de la Task 11, une passe supplémentaire (plus de nœuds intermédiaires par arc, plus d'occasions de recrutement) peut être ajoutée comme chantier séparé.
