# Château → bac à sable façon Townscaper (v2, remplace la v1)

*Document de conception — 2026-08-06. Remplace intégralement
`2026-08-04-chateau-design.md` : après une v1 fonctionnelle (13 tâches, catalogue de
pièces, placement/pile, terrain sculptable), le retour terrain est que le mécanisme
"choisir une pièce et la poser" ne plaît pas — l'objectif devient de reproduire le vrai
mécanisme de Townscaper (faire grandir une masse de bâtiment qui s'arrondit et se
recompose automatiquement), pas juste son style visuel.*

## Contexte et portée du changement

Ceci n'est pas un correctif de la v1, c'est un nouveau jeu sur les mêmes fondations de
site. Les mécaniques suivantes de la v1 sont **abandonnées** :

- Le terrain sculptable (creuser/monter) — le vrai Townscaper n'a pas de terrain à
  sculpter, le sol est fixe et seule la masse des bâtiments grandit. Décidé explicitement
  en faveur de la fidélité au jeu original.
- Le catalogue de pièces (murs, tours, toits, décor) et le système de placement/pile —
  remplacé par un mécanisme continu de croissance de blocs.
- Les matériaux PBR (pierre, brique, bois...) — le vrai Townscaper utilise des couleurs
  douces posées directement sur la géométrie, pas de texture (les textures se déforment
  mal sur des surfaces arrondies). On adopte cette logique.
- La caméra en vol libre (ZQSD + Ctrl-glisser + molette) — remplacée par une caméra en
  orbite fidèle à Townscaper (voir section Caméra).

**Conservé tel quel** : le squelette de page (`games/chateau/index.html`, Vite, lien
retour), l'éclairage et le ciel de `scene.ts`.

**Hypothèse assumée, non redemandée à l'utilisateur** : le jeu reste hébergé sous
`games/chateau/` avec le nom "Château" — rien n'empêche un joueur de façonner un résultat
qui ressemble à un château (choix de couleurs, forme du bâti), même si le mécanisme est
désormais un bac à sable de ville générique, pas un catalogue de pièces médiévales. Un
renommage de la page reste possible plus tard, séparément, si besoin.

## Le mécanisme central

Une grille de cases. Chaque case possède un nombre d'étages (0 = vide/eau, entier ≥ 1 =
un bâtiment). On fait grandir un bâtiment en cliquant/glissant sur des cases vides
(passent à 1 étage) ; cliquer sur une case déjà construite ajoute un étage. Un clic
Alt-modifié retire un étage (jusqu'à revenir à 0 = eau).

Valeurs de départ (ajustables sans remettre en cause le design) : grille de 20×20 cases,
hauteur maximale de 8 étages par case, `FLOOR_HEIGHT` et `CELL_SIZE` égaux à 1 unité
monde, rayon des coins arrondis d'environ un tiers de `CELL_SIZE`, rétrécissement d'environ
6 % de `CELL_SIZE` par étage au-dessus du rez-de-chaussée.

## L'arrondi automatique des coins

Pour chaque case construite, on classe chacun de ses 4 coins en observant seulement 3
cases voisines : les 2 cases qui touchent ce coin par un côté, et la case en diagonale.

- Les 2 cases-côté sont **vides** → coin extérieur d'un bâtiment → arrondi **vers
  l'extérieur** (bombé).
- Les 2 cases-côté sont **construites**, la diagonale est **vide** → creux d'un coude en
  L → arrondi **vers l'intérieur** (renfoncement).
- Une seule case-côté est construite → le mur continue tout droit à cet endroit, pas de
  coin à traiter ici (le virage, s'il y en a un, se règle à un autre coin de la même case
  ou d'une case voisine).
- Les 2 cases-côté sont vides mais que ce coin est aussi celui d'une case en diagonale
  construite → chaque case traite son propre coin indépendamment (elles se frôlent sans se
  souder), exactement comme dans le vrai jeu.

Cette classification ne regarde que 3 voisines par coin — pas de table de correspondance à
16 configurations à gérer séparément, le cas ambigu (diagonale) se résout naturellement en
traitant chaque case pour son propre compte.

## Construction du volume 3D

Pour chaque case construite, une fois ses 4 coins classés, on dessine son contour en 2D
(`THREE.Shape`) avec un arc de cercle aux coins arrondis et une ligne droite ailleurs. Un
coin de rayon fixe (petit, de l'ordre d'un tiers de la taille d'une case). Cette technique
(Shape + Extrude) est déjà utilisée dans le jeu actuel pour les pans de toit — pas une
technologie inconnue du projet.

Chaque étage est extrudé **séparément** (une tranche de hauteur `FLOOR_HEIGHT`, empilées
les unes sur les autres), et non le bâtiment entier en une seule extrusion — c'est ce qui
permet le rétrécissement par étage décrit ci-dessous. Le rez-de-chaussée utilise le contour
calculé directement sur la case ; chaque étage au-dessus rejoue le même calcul de contour
(même classification de coins, puisqu'elle ne dépend que de l'occupation des cases
voisines, pas de la taille) mais avec une case légèrement rétrécie en entrée — pas une
opération générique de rétrécissement de polygone, juste le même calcul avec une entrée
plus petite.

Seules les cases affectées par une modification (la case cliquée + son voisinage direct,
puisque leur classification de coin peut changer) sont reconstruites — pas la grille
entière à chaque clic.

**Toit** : un toit à deux pans avec faîtière, posé sur le contour (rétréci) du dernier
étage — repris de la même technique déjà utilisée par l'actuelle v1 pour ses pans de toit
(`THREE.Shape` + `ExtrudeGeometry` d'une section triangulaire) plutôt qu'un algorithme
inventé de zéro. Simplification volontaire pour cette v1 : le toit se pose **par case**
(chaque case de bâtiment a son propre petit toit, pas un toit unique calculé sur la forme
globale d'un bâtiment à plusieurs cases). L'orientation de la faîtière est déterministe et
fixe, pas basée sur une analyse de la forme réelle du bâtiment : faîtière le long de l'axe
X si `(cellX + cellZ)` est pair, le long de l'axe Z sinon — juste assez de variété pour
qu'un ensemble de cases voisines n'ait pas toutes la même orientation de toit, sans calcul
de forme. Un toit unique par bâtiment avec orientation intelligente est un raffinement
possible plus tard, pas dans cette v1.

**Couleur** : chaque bâtiment reçoit, au moment de sa création, une teinte tirée d'une
petite palette de couleurs franches choisie dans l'interface (remplace la palette de
matériaux) — proche de la palette visible dans le jeu (rouge, orange, jaune, vert, bleu,
violet, rose, brun, gris...). Les cases déjà construites gardent leur couleur d'origine —
pas d'outil de repeinte en v1.

**Eau** : un unique plan d'eau plat sous toute la grille, visible partout où il n'y a pas
de bâtiment. Pas de niveau de terrain variable.

## Interaction

- **Construire** : clic gauche pose/fait grandir. Glisser avec le clic gauche maintenu
  peint plusieurs cases d'un coup — mais ne touche que les cases **vides** traversées
  pendant le glissement (les cases déjà construites survolées pendant le même glissement
  ne gagnent pas d'étage supplémentaire à répétition, sinon un simple glissement ferait
  exploser la hauteur d'un bâtiment existant).
- **Retirer** : Alt + clic retire un étage de la case cliquée.
- Palette de couleurs : sélection de la teinte active pour les prochaines cases posées,
  même emplacement d'interface que l'ancienne palette de matériaux.

## Caméra (fidèle à Townscaper)

Une caméra en orbite, pas de vol libre :

- **Clic droit + glisser** : fait tourner la vue autour d'un point cible, comme un plateau
  tournant.
- **Molette** : zoom (rapproche/éloigne la caméra du point cible).
- **Clic milieu + glisser** : déplace le point cible sur le plan du sol (panoramique).
- **Clic gauche** : réservé à la construction (jamais à la caméra — aucun conflit possible
  puisque construire et regarder utilisent des boutons différents, contrairement à
  l'ancienne caméra en vol libre qui devait gérer Ctrl pour éviter ce conflit).
- L'angle de vue reste toujours incliné vers le bas (jamais à l'horizontale, jamais à la
  verticale stricte), comme dans le jeu original.

Implémentation recommandée : réutiliser `OrbitControls` de three.js (retiré lors du passage
au vol libre), reconfiguré avec `enablePan = true`, `screenSpacePanning = false` (le
panoramique déplace la cible sur le plan du sol, pas dans l'espace écran de la caméra), et
les boutons de souris réassignés (`mouseButtons`) pour que le clic gauche ne déclenche
aucune action caméra.

## Sauvegarde

Le format change entièrement : `WorldState` devient simplement la grille (hauteur +
couleur par case). Pas de liste de pièces posées séparée. Toujours dans `localStorage`,
même principe de secours sur donnée corrompue (case invalide ignorée plutôt que de faire
planter le chargement).

## Fichiers concernés (aperçu, détaillé dans le plan d'implémentation)

**Supprimés** : `terrain.ts`, `terrain-mesh.ts`, `pieces.ts`, `piece-geometry.ts`,
`materials.ts`, `materials-three.ts`, `placement.ts`, `fly-controls.ts`, et les fichiers de
test associés.

**Nouveaux** : un module de grille (hauteur/couleur par case, pur et testé comme l'était
`terrain.ts`), un module de classification des coins (pur et testé), un module de
génération de géométrie (Shape + Extrude, non testable automatiquement — pas de WebGL sous
Node, comme le reste du rendu Three.js du projet), une palette de couleurs.

**Réécrits** : `scene.ts` (retour à `OrbitControls`), `save.ts` (nouveau format),
`main.ts` (nouvelle interaction), `constants.ts` (nouvelles constantes de grille).

**Conservés sans changement** : le squelette de page, l'éclairage/le ciel de `scene.ts`
(hors caméra).

---

*Prochaine étape : plan d'implémentation détaillé (superpowers:writing-plans).*
