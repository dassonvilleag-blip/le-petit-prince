# Sous-titres de nœud (Le Roi des Pirates) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chaque nœud de l'histoire "Le Roi des Pirates" affiche un second titre, sous le titre existant, résumant en quelques mots le dilemme ou le sujet du nœud.

**Architecture:** Nouveau champ obligatoire `subtitle: string` sur `StoryNode`, rendu dans un nouvel élément `#node-subtitle` entre `#node-title` et `#illustration`. Contenu écrit à la main pour les 34 nœuds existants. `validateStoryGraph` gagne une vérification qui signale tout nœud sans sous-titre, pour empêcher une régression future.

**Tech Stack:** TypeScript (`node --experimental-strip-types --test`), pas de framework, DOM natif.

Référence : `docs/superpowers/specs/2026-08-21-roi-des-pirates-sous-titres-design.md`.

---

### Task 1: Champ `subtitle` sur `StoryNode`

**Files:**
- Modify: `src/games/roi-des-pirates/types.ts:66-75`

- [ ] **Step 1: Ajouter le champ au type**

Dans `src/games/roi-des-pirates/types.ts`, remplacer :

```ts
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

par :

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

- [ ] **Step 2: Commit**

```bash
git add src/games/roi-des-pirates/types.ts
git commit -m "feat(roi-des-pirates): ajoute le champ subtitle sur StoryNode"
```

---

### Task 2: Rendu du sous-titre (HTML, CSS, moteur)

**Files:**
- Modify: `games/roi-des-pirates/index.html:38-40`
- Modify: `src/games/roi-des-pirates/game.css:128-135`
- Modify: `src/games/roi-des-pirates/engine.ts:154-161`

- [ ] **Step 1: Ajouter l'élément dans le HTML**

Dans `games/roi-des-pirates/index.html`, remplacer :

```html
      <p id="arc-label" class="arc-label"></p>
      <h2 id="node-title" class="node-title"></h2>
      <figure id="illustration" class="illustration"></figure>
```

par :

```html
      <p id="arc-label" class="arc-label"></p>
      <h2 id="node-title" class="node-title"></h2>
      <p id="node-subtitle" class="node-subtitle"></p>
      <figure id="illustration" class="illustration"></figure>
```

- [ ] **Step 2: Styler le sous-titre**

Dans `src/games/roi-des-pirates/game.css`, remplacer :

```css
.node-title {
  font-size: 22px;
  font-weight: normal;
  color: var(--text);
  margin-bottom: 16px;
  font-style: italic;
}
```

par :

```css
.node-title {
  font-size: 22px;
  font-weight: normal;
  color: var(--text);
  margin-bottom: 4px;
  font-style: italic;
}

.node-subtitle {
  font-family: sans-serif;
  font-size: 14px;
  color: var(--text-dim);
  margin-bottom: 16px;
}
```

- [ ] **Step 3: Remplir l'élément dans `renderNode()`**

Dans `src/games/roi-des-pirates/engine.ts`, remplacer :

```ts
  if (node.title) {
    const titleEl = document.getElementById("node-title");
    if (titleEl) titleEl.textContent = node.title;
  } else {
    const titleEl = document.getElementById("node-title");
    if (titleEl) titleEl.textContent = "";
  }
```

par :

```ts
  if (node.title) {
    const titleEl = document.getElementById("node-title");
    if (titleEl) titleEl.textContent = node.title;
  } else {
    const titleEl = document.getElementById("node-title");
    if (titleEl) titleEl.textContent = "";
  }

  const subtitleEl = document.getElementById("node-subtitle");
  if (subtitleEl) subtitleEl.textContent = node.subtitle;
```

- [ ] **Step 4: Vérifier visuellement**

Run: `npm run dev`, ouvrir `games/roi-des-pirates/index.html`, avancer de quelques écrans. Le sous-titre doit apparaître sous le titre, en petit texte atténué. (Les nœuds n'ont pas encore de `subtitle` renseigné à ce stade — l'élément sera vide jusqu'à la Task 3-5 ; c'est attendu.)

- [ ] **Step 5: Commit**

```bash
git add games/roi-des-pirates/index.html src/games/roi-des-pirates/game.css src/games/roi-des-pirates/engine.ts
git commit -m "feat(roi-des-pirates): affiche le sous-titre de nœud sous le titre"
```

---

### Task 3: Contenu — intro + East Blue (12 nœuds)

**Files:**
- Modify: `src/games/roi-des-pirates/story.ts` (nœuds `intro`, `eb-*`)

- [ ] **Step 1: Ajouter `subtitle` à chacun des 12 nœuds**

Dans `src/games/roi-des-pirates/story.ts`, pour chaque nœud listé, ajouter la ligne `subtitle: "..."` juste après la ligne indiquée (juste après `id: "intro",` quand il n'y a pas de `title`, sinon juste après la ligne `title: "..."`).

| Nœud (repère = ligne `id` ou `title` existante) | Ligne à ajouter |
|---|---|
| `id: "intro",` | `subtitle: "L'appel du large",` |
| `title: "East Blue — Les origines",` | `subtitle: "D'où tu viens",` |
| `title: "East Blue — Le choix fondateur",` | `subtitle: "Une épave, un coffret, un mystère",` |
| `title: "East Blue — Le fruit inconnu",` | `subtitle: "Manger l'inconnu",` |
| `title: "East Blue — L'éveil du Fruit",` | `subtitle: "Vivre avec le pouvoir payé cher",` |
| `title: "East Blue — L'éveil du Haki",` | `subtitle: "La voie du corps et de la volonté",` |
| `title: "East Blue — Un épéiste dans une taverne",` | `subtitle: "Un épéiste à convaincre",` |
| `title: "East Blue — Un serment de lame",` | `subtitle: "Un adversaire convaincu",` |
| `title: "East Blue — Un duel serré, perdu de peu",` | `subtitle: "Une défaite honorable",` |
| `title: "East Blue — Le prix de l'orgueil",` | `subtitle: "Une cicatrice en prime",` |
| `title: "East Blue — Première confrontation",` | `subtitle: "Affronter la Marine ou s'éclipser",` |
| `title: "East Blue — Dernier regard vers le port",` | `subtitle: "Cap sur la Grand Line",` |

Exemple concret pour le premier nœud (`intro`), avant :

```ts
  {
    id: "intro",
    text: "La mer. Elle t'a toujours appelé. ...",
```

après :

```ts
  {
    id: "intro",
    subtitle: "L'appel du large",
    text: "La mer. Elle t'a toujours appelé. ...",
```

Et pour un nœud avec `title` (ex: `eb-origines`), avant :

```ts
    id: "eb-origines",
    arc: "east-blue",
    title: "East Blue — Les origines",
    text: "Mais d'où viens-tu, exactement ? ...",
```

après :

```ts
    id: "eb-origines",
    arc: "east-blue",
    title: "East Blue — Les origines",
    subtitle: "D'où tu viens",
    text: "Mais d'où viens-tu, exactement ? ...",
```

Répéter ce même schéma (insertion de `subtitle: "..."` juste après la ligne `title: "..."`) pour les 10 nœuds East Blue restants du tableau.

- [ ] **Step 2: Vérifier qu'il n'y a pas de régression**

Run: `npm test`
Expected: tous les tests passent (aucun test ne vérifie encore `subtitle` à ce stade — Task 6 l'ajoutera).

- [ ] **Step 3: Commit**

```bash
git add src/games/roi-des-pirates/story.ts
git commit -m "content(roi-des-pirates): sous-titres - intro et East Blue"
```

---

### Task 4: Contenu — Grand Line (9 nœuds)

**Files:**
- Modify: `src/games/roi-des-pirates/story.ts` (nœuds `gl-*`)

- [ ] **Step 1: Ajouter `subtitle` à chacun des 9 nœuds**

Même procédure que la Task 3 : insérer `subtitle: "..."` juste après la ligne `title: "..."` de chaque nœud.

| Nœud (repère = ligne `title` existante) | Ligne à ajouter |
|---|---|
| `title: "Grand Line — Le Paradis",` | `subtitle: "Le seuil de la Grand Line",` |
| `title: "Grand Line — Un visage familier ?",` | `subtitle: "Une seconde chance de recruter",` |
| `title: "Grand Line — Une navigatrice pour les mers folles",` | `subtitle: "Une navigatrice à embarquer",` |
| `title: "Grand Line — Un coffre bien gardé",` | `subtitle: "Voler un Fruit du Démon",` |
| `title: "Grand Line — Le coffre, enfin ouvert",` | `subtitle: "Le butin, à manger ou non",` |
| `title: "Grand Line — Un pouvoir volé",` | `subtitle: "Un pouvoir volé, désormais tien",` |
| `title: "Grand Line — Le coffre s'échappe",` | `subtitle: "Le coffre t'échappe",` |
| `title: "Grand Line — Mauvais calcul",` | `subtitle: "Une main brisée pour rien",` |
| `title: "Grand Line — Choisir son camp",` | `subtitle: "Choisir un camp — ou aucun",` |

- [ ] **Step 2: Vérifier qu'il n'y a pas de régression**

Run: `npm test`
Expected: tous les tests passent.

- [ ] **Step 3: Commit**

```bash
git add src/games/roi-des-pirates/story.ts
git commit -m "content(roi-des-pirates): sous-titres - Grand Line"
```

---

### Task 5: Contenu — Nouveau Monde, Laugh Tale et fins (13 nœuds)

**Files:**
- Modify: `src/games/roi-des-pirates/story.ts` (nœuds `nm-*`, `arc-final`, `fin-*`)

- [ ] **Step 1: Ajouter `subtitle` à chacun des 13 nœuds**

Même procédure : insérer `subtitle: "..."` juste après la ligne `title: "..."` de chaque nœud.

| Nœud (repère = ligne `title` existante) | Ligne à ajouter |
|---|---|
| `title: "Nouveau Monde",` | `subtitle: "Le seuil du Nouveau Monde",` |
| `title: "Nouveau Monde — Un médecin sans navire",` | `subtitle: "Un médecin à recruter",` |
| `title: "Nouveau Monde — La légende du bistouri",` | `subtitle: "Partir en quête de l'Ope Ope no Mi",` |
| `title: "Nouveau Monde — L'Ope Ope no Mi",` | `subtitle: "Le fruit le plus recherché des mers",` |
| `title: "Nouveau Monde — Une autre trouvaille",` | `subtitle: "Une trouvaille de consolation",` |
| `title: "Nouveau Monde — La quête de trop",` | `subtitle: "La quête qui a coûté une jambe",` |
| `title: "Nouveau Monde — Wano",` | `subtitle: "Trois chemins à Wano",` |
| `title: "Nouveau Monde — Avant la dernière ligne droite",` | `subtitle: "Le calme avant Laugh Tale",` |
| `title: "Laugh Tale — La fin du monde",` | `subtitle: "Le dernier voyage",` |
| `title: "Roi des Pirates",` | `subtitle: "Le rêve accompli",` |
| `title: "La Légende des Mers",` | `subtitle: "Une légende, pas un roi",` |
| `title: "Le Trésor trouvé",` | `subtitle: "Le choix de s'arrêter",` |
| `title: "Impel Down",` | `subtitle: "Enchaîné, pas vaincu",` |

- [ ] **Step 2: Vérifier qu'il n'y a pas de régression**

Run: `npm test`
Expected: tous les tests passent.

- [ ] **Step 3: Commit**

```bash
git add src/games/roi-des-pirates/story.ts
git commit -m "content(roi-des-pirates): sous-titres - Nouveau Monde, Laugh Tale et fins"
```

---

### Task 6: `validateStoryGraph` signale les nœuds sans sous-titre

**Files:**
- Modify: `src/games/roi-des-pirates/engine.ts:56` (début de la boucle dans `validateStoryGraph`)
- Modify: `src/games/roi-des-pirates/test/engine.test.ts` (fixtures existantes + nouveau test)

- [ ] **Step 1: Écrire le test qui échoue**

Dans `src/games/roi-des-pirates/test/engine.test.ts`, ajouter ce test juste après le test `"validateStoryGraph : signale des identifiants dupliqués"` (donc après la ligne 122, avant le test `"validateStoryGraph : signale un nœud non-fin sans aucun choix"`) :

```ts
test("validateStoryGraph : signale un nœud sans sous-titre", () => {
  const nodes: StoryNode[] = [
    { id: "a", subtitle: "", text: "A", svg: "", choices: [], isEnding: true },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("sous-titre")));
});

test("validateStoryGraph : une fin sans sous-titre est aussi signalée", () => {
  const nodes: StoryNode[] = [
    { id: "a", subtitle: "  ", text: "A", svg: "", choices: [], isEnding: true },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("a: aucun sous-titre défini.")));
});
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `npm test`
Expected: FAIL — les deux nouveaux tests échouent (`validateStoryGraph` ne connaît pas encore `subtitle`), et plusieurs tests existants échouent aussi car leurs fixtures `StoryNode` n'ont pas de `subtitle` (TypeScript ne bloque rien, `node.subtitle` vaudra `undefined` à l'exécution).

- [ ] **Step 3: Implémenter la vérification**

Dans `src/games/roi-des-pirates/engine.ts`, dans `validateStoryGraph`, remplacer :

```ts
  for (const node of storyNodes) {
    if (node.isEnding) continue;
```

par :

```ts
  for (const node of storyNodes) {
    if (!node.subtitle?.trim()) {
      errors.push(`${node.id}: aucun sous-titre défini.`);
    }

    if (node.isEnding) continue;
```

- [ ] **Step 4: Mettre à jour les fixtures existantes du fichier de test**

Dans `src/games/roi-des-pirates/test/engine.test.ts`, ajouter `subtitle: "x"` à chaque objet `StoryNode` littéral qui n'en a pas encore (celles créées à l'étape 1 ont déjà leur propre `subtitle`). Remplacer :

```ts
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
```

par :

```ts
test("validateStoryGraph : accepte un graphe valide à deux nœuds", () => {
  const nodes: StoryNode[] = [
    { id: "a", subtitle: "x", text: "A", svg: "", choices: [{ text: "aller à b", effects: {}, next: "b" }] },
    { id: "b", subtitle: "x", text: "B", svg: "", choices: [], isEnding: true },
  ];
  assert.deepEqual(validateStoryGraph(nodes), []);
});

test("validateStoryGraph : signale une référence next vers un id inexistant", () => {
  const nodes: StoryNode[] = [
    { id: "a", subtitle: "x", text: "A", svg: "", choices: [{ text: "x", effects: {}, next: "n-existe-pas" }] },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("n-existe-pas")));
});

test("validateStoryGraph : signale des identifiants dupliqués", () => {
  const nodes: StoryNode[] = [
    { id: "a", subtitle: "x", text: "A", svg: "", choices: [], isEnding: true },
    { id: "a", subtitle: "x", text: "A bis", svg: "", choices: [], isEnding: true },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("dupliqué")));
});
```

Remplacer aussi :

```ts
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
```

par :

```ts
test("validateStoryGraph : signale un nœud non-fin sans aucun choix", () => {
  const nodes: StoryNode[] = [{ id: "a", subtitle: "x", text: "A", svg: "", choices: [] }];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("aucun choix")));
});

test("validateStoryGraph : signale un nœud dont tous les choix sont conditionnels", () => {
  const nodes: StoryNode[] = [
    {
      id: "a",
      subtitle: "x",
      text: "A",
      svg: "",
      choices: [{ text: "x", effects: {}, next: "b", requiresFlags: ["flag"] }],
    },
    { id: "b", subtitle: "x", text: "B", svg: "", choices: [], isEnding: true },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("inconditionnel")));
});
```

Remplacer aussi :

```ts
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

test("validateStoryGraph : signale un choix sans aucun routage (ni next, ni duel, ni eatPendingFruit)", () => {
  const nodes: StoryNode[] = [
    {
      id: "a",
      text: "A",
      svg: "",
      choices: [{ text: "choix orphelin", effects: {} }],
    },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("aucun routage")));
});

test("validateStoryGraph : un choix pickFruitCandidate accompagné de next n'est pas signalé", () => {
  const nodes: StoryNode[] = [
    {
      id: "a",
      text: "A",
      svg: "",
      choices: [{ text: "ouvrir", effects: {}, pickFruitCandidate: {}, next: "b" }],
    },
    { id: "b", text: "B", svg: "", choices: [], isEnding: true },
  ];
  assert.deepEqual(validateStoryGraph(nodes), []);
});
```

par :

```ts
test("validateStoryGraph : suit aussi les cibles de duel et de fruit en attente", () => {
  const nodes: StoryNode[] = [
    {
      id: "a",
      subtitle: "x",
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
    { id: "b", subtitle: "x", text: "B", svg: "", choices: [], isEnding: true },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("victoire-manquante")));
  assert.ok(errors.some((e) => e.includes("manger-manquant")));
});

test("validateStoryGraph : signale un choix sans aucun routage (ni next, ni duel, ni eatPendingFruit)", () => {
  const nodes: StoryNode[] = [
    {
      id: "a",
      subtitle: "x",
      text: "A",
      svg: "",
      choices: [{ text: "choix orphelin", effects: {} }],
    },
  ];
  const errors = validateStoryGraph(nodes);
  assert.ok(errors.some((e) => e.includes("aucun routage")));
});

test("validateStoryGraph : un choix pickFruitCandidate accompagné de next n'est pas signalé", () => {
  const nodes: StoryNode[] = [
    {
      id: "a",
      subtitle: "x",
      text: "A",
      svg: "",
      choices: [{ text: "ouvrir", effects: {}, pickFruitCandidate: {}, next: "b" }],
    },
    { id: "b", subtitle: "x", text: "B", svg: "", choices: [], isEnding: true },
  ];
  assert.deepEqual(validateStoryGraph(nodes), []);
});
```

- [ ] **Step 5: Lancer les tests, vérifier qu'ils passent**

Run: `npm test`
Expected: PASS — tous les tests passent, y compris `story.test.ts` (les 34 nœuds de `STORY` ont désormais tous un `subtitle` grâce aux Tasks 3-5).

- [ ] **Step 6: Commit**

```bash
git add src/games/roi-des-pirates/engine.ts src/games/roi-des-pirates/test/engine.test.ts
git commit -m "test(roi-des-pirates): validateStoryGraph signale les nœuds sans sous-titre"
```
