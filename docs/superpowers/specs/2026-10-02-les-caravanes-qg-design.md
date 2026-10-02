# Les Caravanes — le QG du marchand (entrepôt et fabrication)

> Statut : v1 codée le 2026-10-02 (brainstorming du même jour). Points
> ouverts 1 et 2 acceptés tels que proposés ; chiffres pas encore simulés.

## Pitch

Une fois les six villes ouvertes, il ne reste plus rien à viser à part le titre
royal. Le **QG** comble ce creux : un lieu à soi au centre de la carte, avec

- un **entrepôt**, pour stocker ce qu'on veut : des ingrédients, ou un bien
  acheté pas cher qu'on ressortira le jour d'une fête ou d'une foire ;
- un **atelier de fabrication**, qui transforme des biens venus de plusieurs
  villes en produits nouveaux, plus chers et plus compacts dans la charrette ;
- plus tard, des **caravaniers** qui alimentent le QG et écoulent ses produits
  tout seuls, selon des listes que le joueur choisit.

## Le QG sur la carte

- Un seul QG, ⛺, placé au centre de gravité des villes : **x 48, y 32**, entre
  Lainebourg et Clos-Vermeil.
- Il s'achète dans l'Atelier, **40 000** 🪙, une fois Sablemire ouverte (il
  tombe dans le creux entre Sablemire, vers 4 h, et Mirazur, vers 20 h).
- Ce n'est pas un marché : on n'y achète rien et on n'y vend rien. On y
  **dépose** et on y **reprend**.
- Les nouvelles (foire, récolte, fête) ne tombent jamais sur le QG.

### Trajets

Le QG compte comme un lieu de **palier 1** : la durée d'un trajet vers ou
depuis le QG prend donc le palier de la ville en face (QG ↔ Mirazur reste un
trajet de palier 5).

| Trajet | Distance | Durée (mulets, sans compétence) |
|---|---|---|
| QG ↔ Clos-Vermeil | 14 | 2:24 |
| QG ↔ Lainebourg | 17 | 1:43 |
| QG ↔ Terracuite | 23 | 1:33 |
| QG ↔ Sablemire | 29 | 7:38 |
| QG ↔ Portvent | 38 | 2:33 |
| QG ↔ Mirazur | 46 | 18:17 |

## L'entrepôt

- Le stock se compte **par bien**, en pièces, et la **capacité en cases** (une
  pièce de vin prend 4 cases, comme dans la charrette). Pas de Tetris dans
  l'entrepôt : le puzzle reste dans la charrette.
- Chaque bien garde son **coût moyen d'achat**. Quand on le ressort et qu'on le
  vend, le bénéfice (et donc la réputation) se calcule sur ce qu'on l'a payé.
- Tous les biens peuvent être stockés, pas seulement les ingrédients : c'est ce
  qui permet de **spéculer** (rafler à −40 % pendant une récolte
  exceptionnelle, ou en bas de la vague de cours, et ressortir à une fête).
- La saturation freine la revente massive : vider 200 cases d'un même bien dans
  une ville fait tomber son prix jusqu'à −30 %. Il faut doser ou répartir.
- Pas de denrées périssables en v1.

| Niveau | Capacité | Prix |
|---|---|---|
| Hangar (avec le QG) | 40 cases | — |
| Entrepôt | 100 cases | 25 000 |
| Grand entrepôt | 250 cases | 150 000 |
| Docks royaux | 600 cases | 800 000 |

### Arriver au QG, en partir

- **Arrivée** : à la place de « Vendre / Marchander », un bouton « Tout
  déposer ». Si l'entrepôt n'a pas la place, on dépose ce qui rentre (les biens
  les plus chers d'abord) et le reste demeure dans la charrette.
- **Départ** : le comptoir du QG fonctionne comme celui d'une ville, mais
  l'étal est l'entrepôt. Poser une pièce dans la charrette la retire du stock,
  la reprendre l'y remet. L'étal affiche le coût moyen et le prix de vente à
  destination. ✨ Auto marche aussi (glouton sur le stock).

## L'atelier de fabrication

- Une fabrication consomme ses ingrédients **pris dans l'entrepôt** et dépose
  le produit dans l'entrepôt une fois finie. Le produit prend toujours moins de
  place que ses ingrédients, donc il rentre toujours.
- **Temps réel, jamais instantané** : de 15 min à 1 h 30 selon la recette. Ça
  continue onglet fermé (le bilan « Pendant ton absence… » liste ce qui a été
  fabriqué).
- **1 emplacement** de fabrication avec le QG, un 2e à 60 000, un 3e à 400 000.
  Un emplacement fait une fabrication à la fois, **pas de file d'attente** (il
  faut repasser au QG pour relancer).
- Quand une fabrication finit, le titre de l'onglet prévient :
  « (1) ⛺ Fabrication terminée ! ».
- Une recette apparaît dès que les villes de tous ses ingrédients sont ouvertes.

### Recettes (v1)

Les produits fabriqués sont des **biens nouveaux, produits nulle part**, faits
avec des ingrédients d'au moins deux villes. Ils ne s'achètent nulle part, se
vendent au prix neutre (110 %) partout et au prix fort (170 %) dans les villes
qui les réclament.

Règle de prix de départ : **prix de référence = 1,5 × la somme des prix de
référence des ingrédients**.

| Produit | Ingrédients | Villes | Forme | Prix réf. | Durée | Réclamé à |
|---|---|---|---|---|---|---|
| 🥫 Salaisons en jarre | 2 poisson, 1 sel, 1 poterie | Portvent, Terracuite | o4 (4 cases, contre 9) | 51 | 15 min | Lainebourg, Clos-Vermeil |
| 🧺 Panier du berger | 2 fromage, 1 blé, 1 olives | Lainebourg, Terracuite | l3 (3 cases, contre 8) | 69 | 20 min | Portvent, Mirazur |
| 🥧 Tarte au miel | 2 miel, 1 blé, 1 fromage | Clos-Vermeil, Terracuite, Lainebourg | i3 (3 cases, contre 7) | 74 | 30 min | Portvent, Sablemire |
| 🍶 Hypocras | 1 vin, 2 miel, 1 épices | Clos-Vermeil, Sablemire | o4 (4 cases, contre 9) | 270 | 45 min | Lainebourg, Mirazur |
| 🍬 Douceurs d'Orient | 2 dattes, 1 miel, 1 thé | Sablemire, Clos-Vermeil | t4 (4 cases, contre 8) | 256 | 45 min | Terracuite, Lainebourg |
| 👗 Robe d'apparat | 1 tissu, 1 soie, 2 perles | Lainebourg, Mirazur | l4 (4 cases, contre 10) | 654 | 1 h 30 | Clos-Vermeil, Sablemire |

Pourquoi ça ne casse pas l'économie : un produit demande **deux voyages**
(ingrédients vers le QG, puis produit vers le marché). Pour les Salaisons, on
transporte 9 + 4 = 13 cases pour un bénéfice d'environ 66, soit ≈ 5,1 par
case transportée, contre ≈ 4,2 en revendant les ingrédients séparément là où
ils sont réclamés (+23 %). Le craft doit rapporter **+20 à 40 % par case
transportée**, pas ×2. À vérifier par simulation.

## Les caravaniers et le QG

Sans compétence, les caravaniers ne vont pas au QG : on l'alimente à la main.
La nouvelle branche de compétences (ci-dessous) leur ouvre la route, **selon
deux listes que le joueur choisit** au QG.

| Liste | Pour chaque bien | Effet |
|---|---|---|
| 📥 Approvisionnement | coché + **stock visé** (ex. olives : 20) | les caravaniers n'apportent au QG que les biens cochés, jusqu'au stock visé |
| 📤 Écoulement | coché + **stock gardé** (ex. Robe : garder 1) | les caravaniers n'emportent du QG que les biens cochés, au-delà du stock gardé |

Le stock visé évite de retrouver 300 olives le matin pour une recette qui en
demande 2. Le stock gardé permet de réserver une Robe d'apparat pour la
marchander soi-même, ou de garder des ingrédients pour l'atelier.

La navette d'un caravanier sur un trajet ville ↔ QG :

1. **À la ville** : il rejoue ton dernier rangement pour ce trajet, mais
   seulement avec les biens de la liste d'approvisionnement qui manquent
   encore (le Contremaître comble les trous avec ces mêmes biens).
2. **Au QG** : il dépose tout, puis charge ce que la liste d'écoulement
   autorise (rejoue ton rangement `qg>ville` s'il existe, sinon ✨ Auto).
3. **De retour à la ville** : il vend au prix affiché, comme aujourd'hui, et
   recommence.

S'il n'a rien à apporter ni à reprendre, il **attend** au lieu de rouler à vide
(« ⏸ Rien à livrer ») et réessaie toutes les 5 min, simulation hors ligne
comprise.

## Compétences : branche ⛺ QG

Une 4e branche, de 3 compétences, visible une fois le QG acheté (même règle :
dans l'ordre).

| # | Compétence | Effet |
|---|---|---|
| 1 | 📋 Intendant | Les caravaniers peuvent faire la navette avec le QG, selon tes listes. |
| 2 | 🔁 Compagnon | Un emplacement qui finit relance la même recette tant qu'il a les ingrédients. |
| 3 | ⚒️ Maître artisan | Fabrications −30 % de temps. |

## Interface

- **Carte** : le QG apparaît en ⛺ au centre, avec une petite jauge de
  remplissage de l'entrepôt et une pastille quand une fabrication est prête.
- **Écran du QG**, trois onglets : **Entrepôt** (stock, capacité, amélioration),
  **Fabrication** (emplacements, recettes avec ce qui manque, coût et valeur
  estimés), **Caravaniers** (les deux listes, avec Intendant).
- **Comptoir** : le QG figure dans les destinations. L'⭐ de rentabilité ne
  s'applique pas au QG (on y va pour stocker, pas pour vendre).
- **Atelier** : achat du QG, des niveaux d'entrepôt et des emplacements.
- **Pendant ton absence…** : ajoute les fabrications terminées et ce que les
  caravaniers ont livré au QG ou en ont emporté.

## Notes techniques

- Le QG n'est pas une `VilleId` : il ne doit pas entrer dans `s.villes` (sinon
  les nouvelles pourraient tomber dessus). Un type `Lieu = VilleId | "qg"` pour
  les trajets et la position des caravanes.
- Les produits fabriqués sont des `BienId` comme les autres (forme, prix,
  couleur), produits par aucune ville : `prixAchat` renvoie `null` partout, et
  les villes qui les réclament les ajoutent à leur `demande`.
- État sauvegardé : `qg: { entrepot, stock: Record<BienId, { n, cout }>,
  emplacements: ({ recette, fin } | null)[], appro, ecoulement } | null`. Le
  chargement fusionne avec `nouvelEtat`, donc les anciennes sauvegardes
  restent valides sans changer de version.
- `avancer` traite les fins de fabrication dans l'ordre chronologique avec les
  arrivées (une fabrication finie à 3 h peut être emportée par un caravanier
  arrivé à 3 h 05), et réveille les caravaniers en attente toutes les 5 min.

## Points ouverts

1. **Le QG peut servir de relais.** Comme la durée dépend du palier par trajet,
   « Lainebourg → QG → Mirazur » (≈ 300 unités-palier) bat le trajet direct
   (≈ 366), soit ≈ 18 % de gagné, au prix d'un déchargement et d'un
   rechargement. Seuls les longs trajets d'ouest en est vers Mirazur sont
   concernés. Proposition : l'accepter (c'est le rôle d'un QG) et vérifier par
   simulation que ça ne déséquilibre pas la fin de partie.
2. **Niveau maximum.** Le niveau est plafonné au nombre de compétences : on
   passe de 15 à 18, et les niveaux 16 à 18 demandent 3,9 M, 7,9 M et 15,7 M de
   réputation. On ne pourra sans doute plus tout apprendre, et il faudra
   choisir. Proposition : le garder, et vérifier par simulation qu'Intendant
   reste atteignable en fin de partie.
3. **Chiffres** (prix du QG, capacités, recettes, durées) : à caler par
   simulation, comme pour la v1, avec un bot qui utilise le QG.

## Hors périmètre v1

Plusieurs QG, file d'attente de fabrication, denrées périssables, recettes à
découvrir, événements négatifs.
