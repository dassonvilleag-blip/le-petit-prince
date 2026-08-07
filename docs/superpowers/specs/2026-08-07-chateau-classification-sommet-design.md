# Château — classification par sommet (chantier 2/5)

*Document de conception — 2026-08-07. Dépend de la brique 1
(`2026-08-07-chateau-grille-organique-design.md`, `src/games/chateau/organic-grid/`,
notamment `OrganicGrid`/`OrganicCell`/`OrganicVertex` de `mesh.ts`), déjà construite et
mergée.*

## Contexte et portée du changement

La brique 1 a produit la topologie de la grille organique (cellules, sommets, voisinage
par arête) mais rien qui dise, pour un sommet donné, quelle forme de mur/coin doit
apparaître à cet endroit. Sur l'ancienne grille carrée, `classifyCorners` faisait ce
travail en 2D (convexe/concave/plat), en regardant toujours exactement 3 cellules fixes
par coin (2 orthogonales + 1 diagonale) — un cas simple rendu possible par la régularité de
la grille carrée.

Deux différences obligent à généraliser plutôt qu'à réutiliser `classifyCorners` tel quel :

1. **Le nombre de cellules autour d'un sommet varie** (recherché et confirmé, pas supposé
   — voir "Que fait le vrai Townscaper" ci-dessous) : 3, 5, 6 voisins sont possibles, pas
   toujours 4.
2. **Le vrai Townscaper classe en tenant compte de la hauteur dès cette étape**, pas
   seulement construit/vide — décision confirmée explicitement pour ce chantier plutôt que
   reportée à la brique 3.

### Que fait le vrai Townscaper (recherché, pas deviné)

Un thread technique d'Élie Michel (@exppad, qui a lui-même reproduit Townscaper) confirme
que la classification y est un vrai marching cubes **en 3D** : "*labeled with the cases of
empty/full neighboring voxels they fit*". Ce n'est pas un plan au sol classé une fois puis
empilé en étages identiques (ce que fait le système actuel) — chaque sommet, à chaque
niveau de hauteur, regarde ses voisins à la fois horizontalement et verticalement. C'est ce
qui permet des toits qui s'arrêtent à des hauteurs différentes selon les voisins,
contrairement à l'actuel système où chaque case pose systématiquement son propre toit à sa
propre hauteur, sans regarder ses voisines (la cause du problème "village de tours" qui a
déclenché ce chantier).

**Portée de ce chantier** : la fonction de classification elle-même. Pas la génération de
géométrie 3D (brique 3), pas la sélection de modules par Wave Function Collapse (brique
4), pas la mise en cache/invalidation à l'édition (brique 5).

**Non-objectif explicite** : les bâtiments qui débordent latéralement (ponts, porte-à-faux)
restent hors de portée — chaque case garde un modèle de pile verticale simple (un seul
`height`, comme dans `OrganicCell` aujourd'hui), déjà noté comme limitation connue dans le
backlog du 2026-08-06. Cette brique prépare le terrain (elle fournit l'information "cette
cellule se termine à cet étage") mais ne résout pas le cas du porte-à-faux lui-même.

## Design retenu

### 1. Ordre cyclique des cellules autour d'un sommet

Prérequis technique découvert pendant ce brainstorming : `OrganicVertex.incidentCellIds`
(brique 1) liste les cellules qui touchent un sommet, mais dans l'ordre où elles ont été
rencontrées pendant la construction du graphe — pas dans l'ordre spatial. La
classification a besoin de savoir qui est "à côté de qui" en tournant autour du point.

Résolu en triant `incidentCellIds` par angle (`atan2`) entre le sommet et le centroïde de
chaque cellule (moyenne des positions de ses sommets) — technique simple, robuste, ne
dépend d'aucune autre bibliothèque.

### 2. Détection des arêtes réellement partagées à ce sommet

Deux cellules peuvent se toucher uniquement en un point (contact diagonal, comme le cas
déjà géré par l'ancien `classifyCorners` pour deux cases qui se touchent uniquement par un
coin) sans partager d'arête. Une fois les cellules triées par angle, on regarde, pour
chaque paire cycliquement consécutive, si elles apparaissent l'une dans le
`neighborCellIds` de l'autre à l'arête qui touche ce sommet précis — information déjà
présente dans `OrganicCell` (brique 1), pas besoin de la recalculer depuis zéro.

### 3. Classification par (sommet, étage)

Pas une classification par sommet, mais par **couple (sommet, étage)** — de l'étage 0
jusqu'à la hauteur maximale parmi les cellules touchant ce sommet moins un.

Pour un couple (sommet, étage F) donné :

- Chaque cellule touchant le sommet est dans un des trois états à cet étage, dérivés
  simplement de son `height` (pas de nouveau champ de données requis) :
  - **vide à cet étage** : `height <= F` ;
  - **continue** : `height > F + 1` (encore au moins un étage au-dessus) ;
  - **se termine ici** : `height === F + 1` (c'est le dernier étage de cette cellule — un
    toit ou une transition doit apparaître à cet endroit).
- Seules les cellules **non vides** à cet étage participent à la classification de forme
  (convexe/concave/plat) — une cellule vide à cet étage est traitée comme absente, comme
  l'eau dans l'ancien système.
- Pour chaque cellule active, en regardant ses deux voisines cycliquement adjacentes :
  - si elle n'est **attachée à aucune des deux** (aucune arête partagée à ce sommet) →
    coin **convexe** ;
  - si les cellules actives attachées les unes aux autres forment une chaîne qui continue
    sans refermer d'angle (le mur passe simplement par ce sommet) → **plat** ;
  - si un renfoncement se forme (plusieurs cellules actives attachées entourent un coin
    resté vide) → coin **concave**, la généralisation directe de l'ancien cas concave, mais
    sur un nombre de voisins qui n'est plus fixé à 4.

Ce n'est pas un algorithme différent de l'ancien `classifyCorners` dans son esprit — c'est
la même idée (regarder qui est plein/vide autour d'un point pour décider convexe/concave/
plat) généralisée à un nombre de voisins variable et rejouée à chaque étage plutôt qu'une
seule fois.

### Forme de sortie

```
VertexFloorClassification {
  vertexId: number
  floor: number
  wedges: {
    cellId: number
    cornerKind: "convex" | "concave" | "flush"
    floorState: "continues" | "terminates"
  }[]
}
```

Calculée **à la demande** pour un (sommet, étage) donné — pas précalculée pour tous les
sommets × tous les étages d'un coup. Sur une grille de plusieurs centaines de cellules ×
jusqu'à 8 étages, garder cette information à jour en continu à chaque édition serait un
problème de cache/invalidation à part entière — délibérément laissé à la brique 5
("ré-évaluation temps réel"), qui décidera de la stratégie (calcul à la volée, cache
invalidé par voisinage comme l'actuel `rebuildNeighborhood`, etc.). Cette brique fournit
uniquement la fonction de calcul pure, indépendante de toute stratégie de mise en cache.

## Non-objectifs (explicite)

- Pas de génération de géométrie 3D à partir de cette classification (brique 3).
- Pas de sélection de modules par Wave Function Collapse (brique 4).
- Pas de stratégie de cache/invalidation à l'édition (brique 5).
- Pas de support des bâtiments en porte-à-faux/ponts (modèle de cellule à pile verticale
  simple conservé, limitation déjà connue).
- Pas de changement à `OrganicCell`/`OrganicVertex`/`OrganicGrid` (brique 1) — cette brique
  lit ces structures, ne les modifie pas.

## Vérification

- Tests unitaires purs sur la fonction de classification, dans le même esprit que
  `corners.test.ts` de l'ancien système : sommet isolé (une seule cellule active → coin
  convexe partout), chaîne de cellules alignées (→ plat aux jonctions), renfoncement en L
  généralisé à un sommet à 5 ou 6 voisins (→ concave), deux cellules qui ne se touchent
  qu'en diagonale (→ chacune son coin convexe indépendant, comme l'ancien test équivalent).
- Cas spécifique à la hauteur : deux cellules voisines de hauteurs différentes (l'une
  `height=2`, l'autre `height=4`) — vérifier qu'au niveau `F=2`, la première ressort en
  `floorState: "terminates"` pendant que la seconde ressort en `"continues"`, et que la
  classification de forme (convexe/concave/plat) au même sommet reste correcte à ce niveau
  précis même si elle diffère de celle du niveau `F=0` ou `F=1`.
- Vérification par génération : faire tourner la classification sur une grille organique
  réelle produite par `buildOrganicGrid` (brique 1) à tous les (sommet, étage) possibles
  d'un jeu de hauteurs de test, et vérifier qu'aucun cas ne lève d'erreur / ne produit de
  configuration incohérente (ex. une cellule classée dans deux états à la fois).
