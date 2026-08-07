# Château → grille organique (chantier 1/5 vers un moteur fidèle à Townscaper)

*Document de conception — 2026-08-07.*

## Contexte : pourquoi ce chantier existe

En testant un habillage visuel (texture, contour, socle — voir
`2026-08-07-chateau-visual-redesign-design.md`), le retour a révélé un problème plus
profond que l'apparence : deux cases construites côte à côte fusionnent bien leurs murs
(l'arrondi de coin le fait déjà), mais **chaque case garde son propre toit** — un ensemble
de cases voisines ressemble à des tours collées, pas à un seul bâtiment. L'utilisateur veut
que le jeu se comporte **à l'identique du vrai Townscaper**, pas une approximation.

Une recherche (pas une supposition) sur le fonctionnement réel de Townscaper montre que la
fusion des toits n'y est pas une fonction isolée : c'est une conséquence de toute une
architecture différente de la nôtre :
- une grille **irrégulière et organique**, pas une grille carrée ;
- une classification par **sommet de grille** (façon marching cubes) qui regarde les 4
  cellules autour de chaque sommet ;
- une bibliothèque de **modules 3D** (mur, coin, toit, arche, escalier...) choisie par
  **Wave Function Collapse** selon les contraintes des voisins ;
- une **ré-évaluation en temps réel** de la structure à chaque modification.

Reproduire ça à l'identique est trop gros pour un seul chantier. Décomposé en 5 briques,
dans l'ordre où elles se construisent :

1. **La grille organique/irrégulière** (ce document)
2. La classification par sommet (façon marching cubes)
3. La bibliothèque de modules 3D par configuration
4. La sélection par Wave Function Collapse
5. La ré-évaluation temps réel à l'édition

Ce document couvre **uniquement la brique 1**. Les briques 2 à 5 restent à concevoir
séparément, une fois celle-ci construite et vérifiée — elles en dépendent directement
(la classification par sommet, brique 2, a besoin de la topologie produite ici).

## Portée de ce chantier

**Dedans** : générer la grille irrégulière, sa structure de données (cellules, sommets,
voisinage), et une vérification visuelle minimale (contours uniquement).

**Dehors** (pour les briques suivantes) : aucune classification par sommet, aucun module
3D, aucun Wave Function Collapse, aucune vraie géométrie de bâtiment. Le rendu de ce
chantier est un fil de fer, pas un château.

**Hypothèse posée sans redemander** (même logique que le document du 2026-08-06) : les
sauvegardes actuelles ne survivent pas à ce changement de structure de données — déjà
arrivé une fois lors du passage v1 → v2, pas un problème nouveau.

## Technique retenue

La technique documentée pour ce type de grille (recherchée directement, pas devinée) :

1. **Échantillonnage de points** — Poisson-disk sampling sur la zone du monde, avec une
   graine (seed) fixe pour rester déterministe et testable (comme le reste du projet, qui
   garde ses tests unitaires purs — voir `grid.test.ts`, `corners.test.ts` existants).
2. **Triangulation de Delaunay** — via `delaunator`, une bibliothèque compacte et éprouvée
   (utilisée dans de nombreux projets de génération procédurale), plutôt qu'une
   implémentation maison. Une triangulation de Delaunay robuste est piégeuse
   numériquement (prédicats géométriques, cas dégénérés) ; une bibliothèque testée évite
   des bugs de géométrie invisibles pendant des semaines. C'est la seule dépendance runtime
   ajoutée par ce chantier (le projet n'en a qu'une aujourd'hui : `three`).
3. **Fusion en quadrilatères** — les triangles adjacents sont fusionnés deux par deux quand
   le quadrilatère résultant est convexe et que ses angles restent dans une plage
   raisonnable (~0,2π à 0,9π) ; certains triangles restent non fusionnés aux endroits où
   aucune fusion valide n'existe.
4. **Subdivision** — chaque triangle/quadrilatère est subdivisé en quadrilatères plus
   petits, ce qui contrôle la densité de la grille (équivalent de `CELL_SIZE` aujourd'hui,
   mais plus une taille uniforme puisque la grille n'est plus carrée).
5. **Relaxation itérative ("quad squaring")** — chaque sommet accumule sur plusieurs
   itérations une force qui pousse les quadrilatères voisins vers un carré de taille fixe
   partageant leur centre de masse, ce qui rapproche la grille d'un aspect régulier sans la
   rendre parfaitement carrée — c'est ce qui donne l'aspect "organique mais grille" plutôt
   que chaotique.

## Structure de données

L'actuelle `Grid` (`grid.ts`) est un tableau 2D indexé `[cellZ][cellX]` — ça ne marche plus
sur une topologie irrégulière où une cellule n'a pas de coordonnées entières. Remplacée
par :

- **Cellules** : identifiées par un id (pas par `[x][z]`), portant leur polygone (liste de
  sommets), leur état de construction (hauteur, couleur — repris tel quel de `Cell`
  aujourd'hui), et la liste des cellules voisines qui partagent une arête avec elles.
- **Sommets** : position 2D, plus la liste des cellules qui le touchent — nécessaire pour
  la classification par sommet de la brique 2 (marching cubes = regarder les cellules
  autour d'un sommet, comme l'actuel `classifyCorners` regarde déjà les cellules autour
  d'un coin, mais sur une grille carrée à 4 configurations fixes par coin).

## Vérification

- Génération déterministe : même graine → même grille, testé comme les modules purs
  existants (`grid.test.ts`).
- Validité géométrique : aucun quadrilatère dégénéré ou auto-intersectant après relaxation
  — à vérifier par des tests sur des cas limites (bords du monde, où la relaxation a moins
  de voisins pour se stabiliser).
- Vérification visuelle : rendu en fil de fer (contours des cellules) via `npm run dev`,
  comparé visuellement à l'aspect "grille organique" des captures de townscaper.org déjà
  utilisées comme référence dans le document du 2026-08-07 sur la refonte visuelle.
- La suite de tests existante (`grid`, `corners`, `palette`, `save` — 71 tests) n'est pas
  concernée par ce chantier tant que l'ancien système coexiste ; elle devra être révisée
  une fois la bascule complète faite (briques suivantes), pas ici.

## Risques identifiés

- **Bords du monde** : la relaxation itérative peut mal converger là où une cellule a moins
  de voisines pour la stabiliser (bord de la zone échantillonnée) — à traiter explicitement
  pendant l'implémentation, pas juste espérer que ça se passe bien.
- **Nouvelle dépendance** (`delaunator`) : rompt le principe "zéro dépendance runtime à
  part `three`" tenu jusqu'ici dans ce projet — décision assumée ici pour la robustesse
  numérique, pas passée sous silence.
- **Ce chantier ne se voit pas encore** : sans les briques 2 et 3, le résultat visible reste
  un fil de fer abstrait, pas un château — le premier résultat qui "ressemble à quelque
  chose" n'arrivera qu'après la brique 3 (bibliothèque de modules). Le signaler pour ne pas
  créer d'attente déçue en cours de route.
