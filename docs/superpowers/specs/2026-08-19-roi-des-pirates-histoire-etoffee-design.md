# Le Roi des Pirates — histoire étoffée — design

> Statut : validé. Brainstorming terminé le 2026-08-19, prêt pour le plan d'implémentation.

## Origine / constat

Le jeu "Le Roi des Pirates" (visual novel One Piece, `games/roi-des-pirates`) existe déjà : moteur générique (`engine.ts`), contenu (`story.ts`), 15 nœuds sur 4 arcs (East Blue, Grand Line, Nouveau Monde, Laugh Tale), 4 fins. L'utilisateur juge l'histoire trop courte sur deux plans à la fois : trop peu d'écrans au total, et les choix ne divergent pas assez — la plupart reconvergent immédiatement vers le même nœud suivant. East Blue est déjà le plus étoffé (5 nœuds, 1 branche) ; Grand Line et Nouveau Monde n'ont chacun qu'un seul vrai point de choix.

Ce document couvre l'ajout de contenu et des deux nouveaux systèmes qui en découlent : **compagnons recrutables** et **Fruits du Démon variés**. Les illustrations (`illustrations.ts`) sont explicitement hors scope — les nouveaux nœuds réutilisent les SVG d'arc déjà existants.

## Principe directeur : reconvergence + rappels narratifs

Les branches ne restent pas indépendantes jusqu'à la fin (ce qui ferait exploser le nombre de nœuds de façon combinatoire). À la place : chaque choix ouvre 2-3 écrans propres à la branche, puis le fil reconverge — mais les choix passés laissent une trace via un **système de drapeaux permanents**, qui influence les textes et les choix disponibles plus loin dans l'histoire. C'est ce qui fait la différence entre "reconverger" et "reconverger sans conséquence".

## Système de drapeaux (nouveau, dans le moteur)

- `flags: Set<string>` — mémorisé pendant toute la partie (comme `stats`), remis à zéro au replay.
- `Choice` gagne des champs optionnels :
  - `setFlags?: string[]` — drapeaux posés quand ce choix est pris.
  - `requiresFlags?: string[]` — le choix n'est affiché que si tous ces drapeaux sont posés.
  - `forbidsFlags?: string[]` — le choix est masqué si un de ces drapeaux est posé.
- `StoryNode.text` (et `Choice.text`/`Choice.sub`) peuvent être soit une chaîne fixe, soit une fonction `(flags: Set<string>) => string` — pour les rappels narratifs (ex : mentionner un bras manquant) sans dupliquer des nœuds entiers.
- `renderNode` filtre les choix selon `requiresFlags`/`forbidsFlags` avant de les afficher.

Usages prévus des drapeaux : recrue refusée puis re-proposée plus tard, blessure permanente qui ferme certains choix physiques, fruit mangé référencé dans le texte, origine narrative qui ouvre une source de connaissance sur les fruits.

## Compagnons recrutables

Pas de roster séparé avec fiche de personnage — un compagnon existe comme un drapeau (`<id>-recrute`, `<id>-refuse`, `<id>-mort`...) plus un effet ponctuel sur les stats au moment du recrutement. Ça reste volontairement léger : pas de nouvel écran d'inventaire d'équipage.

**Occasions de recrutement** : au moins une par arc (East Blue, Grand Line, Nouveau Monde). Si une recrue est refusée, une occasion de la recroiser (elle ou une autre) doit réapparaître plus tard dans l'histoire plutôt que de disparaître définitivement — géré via `forbidsFlags: ["<id>-recrute"]` sur le nœud de re-proposition.

**Trois façons de gérer une rencontre de recrue**, choisies selon le contexte narratif du nœud (pas une règle uniforme) :
1. **Stats visibles** — le texte annonce clairement l'apport du personnage avant de choisir.
2. **Stats cachées, découvertes en jouant** — tu recrutes ou refuses sans savoir, tu le découvres après coup dans le texte qui suit.
3. **Duel d'évaluation** — un choix "le tester au combat" déclenche une résolution de duel (voir ci-dessous) avant de décider.

### Résolution de duel (nouvelle fonction du moteur)

```ts
function resolveDuel(playerForce: number, opponentPower: number): "victoire" | "defaite-legere" | "blessure-grave"
```

Compare la Force du joueur à une force cachée propre à l'adversaire (définie par nœud), plus une part d'aléa (`Math.random()`), et retourne une issue parmi trois. `Choice` gagne un champ optionnel `duel?: { opponentPower: number; win: string; loseMinor: string; loseMajor: string }` — si présent, `navigate()` calcule le prochain nœud via `resolveDuel` au lieu d'utiliser `next` directement. L'issue `blessure-grave` pose systématiquement un drapeau de blessure permanente (ex: `bras-coupe`), qui peut ensuite fermer des choix physiques ailleurs via `forbidsFlags`.

Ce même mécanisme de duel sert aussi bien au recrutement (tester une recrue) qu'au vol de fruit (voir plus bas) — une seule fonction, deux usages.

## Fruits du Démon : table de 30 + méthodes d'acquisition

Manger un Fruit du Démon aujourd'hui donne un bonus générique fixe. À la place :

**Table de données** (nouveau fichier ou section de `story.ts`) : 30 fruits, chacun `{ id, nom, type: "Zoan" | "Paramecia" | "Logia", description courte, effects: Partial<Stats> }`. Écriture façon table de données (comme le pool de 224 items de "Ça coûte combien"), pas 30 intrigues séparées — c'est la **méthode d'acquisition**, pas le fruit lui-même, qui varie l'histoire.

**Trois méthodes d'acquisition**, apparaissant à différents points selon le fil de l'histoire du joueur (ses origines, ses choix précédents) :
1. **La trouvaille** — tombé par hasard (épave, marché, cachette). Identité inconnue jusqu'à consommation (sauf révélation, voir ci-dessous) → tirage aléatoire dans les 30.
2. **Le vol** — croiser un pirate qui en possède un dans son coffre ; se joue comme un duel (même mécanisme que le recrutement — tu peux gagner le fruit, ou te faire blesser en tentant de le voler) → tirage aléatoire.
3. **La quête ciblée** — le joueur part activement à la recherche d'un fruit précis dont il a entendu parler. Plus long, pas garanti (peut échouer et retomber sur un fruit inconnu à la place) ; en cas de succès, il sait ce qu'il mange avant de le faire.

**Révélation de l'identité avant consommation** : indépendamment de la méthode, l'identité peut être révélée à l'avance si le joueur dispose d'une **source de connaissance**, posée par des drapeaux antérieurs :
- origine noble (a étudié les fruits dans les livres),
- un compagnon connaisseur recruté,
- éventuellement d'autres sources ajoutées en écrivant (un vieux marin croisé, un fruit déjà mangé qui apprend à reconnaître les autres du même type...).

Une fonction croise les drapeaux de connaissance du joueur avec le fruit tiré ; si au moins une source couvre ce fruit, l'identité est affichée avant le choix de manger ou non — sinon c'est à l'aveugle.

Le fruit mangé pose un drapeau `fruit-<id>` que le texte plus loin dans l'histoire peut référencer (nom, type).

## Budget de contenu

- Chaque arc (East Blue / Grand Line / Nouveau Monde) passe de 2-5 nœuds à ~8-10 nœuds.
- Au moins un point de recrutement par arc (avec re-proposition possible si refusé).
- Le passage Fruit du Démon (actuellement 1 nœud de choix) devient plusieurs nœuds : les 3 méthodes d'acquisition + leurs résolutions (duel/quête) + le nœud de consommation qui pioche dans la table de 30.
- Illustrations : réutilisation des SVG d'arc existants (`SVG_EAST_BLUE`, `SVG_GRAND_LINE`, etc.) pour tous les nouveaux nœuds — pas de nouvel art dans ce chantier.
- Estimation totale : ~55-65 nœuds narratifs (vs 15 actuellement), plus la table des 30 fruits.

## Tests

Le projet suit le pattern `src/games/<jeu>/test/*.test.ts` (`node --experimental-strip-types --test`), déjà utilisé par `ca-coute-combien` et `les-des-menteurs`. À couvrir pour `roi-des-pirates` :
- `resolveDuel` : distribution des trois issues selon des Force/opponentPower connus (bornes, cas extrêmes).
- La fonction de tirage de fruit (respecte le filtre par type si fourni).
- La fonction de révélation (croise drapeaux de connaissance × fruit tiré → booléen).
- Le filtrage des choix par `requiresFlags`/`forbidsFlags` dans le moteur.

Pas de test automatisé sur le contenu narratif lui-même (texte, cohérence de l'histoire) — vérification manuelle en jouant plusieurs parcours après implémentation, comme fait pour la version initiale.

## Hors scope (pour l'instant)

- Nouvelles illustrations SVG pour les nouveaux nœuds (réutilisation de l'existant).
- Roster/écran d'équipage dédié (les compagnons restent des drapeaux, pas des objets avec fiche).
- Fruits inventés proceduralement (la liste de 30 est écrite à la main, pas générée).
- Système de duel généralisé à tout type de conflit narratif (recrutement + vol de fruit uniquement pour l'instant, pas de refonte des affrontements Marine/Empereurs existants).
