# Les Caravanes — design

> Statut : v1 livrée. Brainstorming du 2026-09-30.

## Pitch

Un jeu de commerce qu'on peut laisser tourner au boulot. Des caravanes font des
trajets **en temps réel** entre des villes (de 1 min 30 à plus de 30 min) :
on achète là où c'est produit, on revend là où c'est réclamé. Il y a deux façons de jouer :

- **Cinq minutes devant soi** : on range soi-même la charrette (façon Tetris) et
  on marchande à l'arrivée. Ça rapporte nettement plus.
- **Pas le temps** : des caravaniers font la navette tout seuls, même onglet
  fermé, en rejouant le dernier rangement fait à la main dans chaque ville.

Aucun lien avec le livre *Le Petit Prince* (c'est juste le nom du site).

## Boucle

1. **Comptoir** : on choisit la destination (⭐ = meilleure rentabilité
   estimée). L'étal montre, pour chaque marchandise, le prix d'achat,
   le prix de vente à destination et le bénéfice par pièce.
2. **Chargement** : chaque marchandise a une forme (1 à 4 cases). Les grosses
   pièces rapportent plus par case mais se casent mal. Clic droit ou `R` pour
   tourner, clic sur une pièce posée pour la reprendre (remboursée au prix
   payé). ✨ Auto fait un glouton correct mais pas optimal.
3. **Voyage** : durée = distance × 4 s × facteur du palier le plus lointain ÷
   vitesse de l'attelage.
4. **Arrivée** : on vend au prix affiché, ou on **marchande**.
5. **Atelier** : on ouvre les routes suivantes, on agrandit les charrettes, on
   améliore l'attelage, on achète des caravanes, on embauche des caravaniers,
   et on vise le titre de Marchand Royal (2 M).

## Prix

- Achat chez le producteur : 60 % du prix de référence.
- Vente : 170 % là où c'est réclamé, 110 % ailleurs, 50 % chez le producteur.
- Cours : ±20 %, en sinusoïde par couple ville/marchandise (période de 30 à
  120 min). C'est une pure fonction du temps, donc l'écran et la simulation
  hors ligne calculent la même chose. Même au pire des cours, revendre
  ailleurs que chez le producteur reste rentable.

## Saturation

Chaque pièce vendue fait baisser le prix de vente de ce bien dans cette ville :
0,8 % par case, plafonné à −30 %. L'effet se résorbe de moitié toutes les 10 min.
Dans une même vente, chaque pièce sature déjà la suivante du même bien : une
charrette variée se vend mieux qu'une charrette monoproduit, ce qui rend le
rangement plus intéressant. La saturation est un état sauvegardé,
décru paresseusement (`{ v, t }` par couple ville/bien).

## Nouvelles (événements)

Le temps est découpé en créneaux de 40 min. Chacun a 70 % de chances de
porter une nouvelle, tirée de façon déterministe parmi les villes ouvertes :

- 🎪 **Foire** : un bien produit ailleurs se vend +50 % dans une ville.
- 🌾 **Récolte exceptionnelle** : un bien s'achète −40 % chez son producteur.
- 🎉 **Fête** : tout se vend +25 % dans une ville.

Une fois tirée, la nouvelle d'un créneau est figée dans l'état (ouvrir une
ville en cours de créneau ne la change pas). Les événements sont uniquement
positifs, pour garder le jeu chill. Ils apparaissent dans le bandeau sous la carte, sur la carte, dans l'étal et
dans un toast au changement de créneau.

## Caravaniers

Le rangement rejoué est mémorisé **par trajet** (`départ>arrivée`), pas par
ville. Au comptoir, une case « Ensuite, le caravanier fait la navette sur ce
trajet » permet de rediriger un caravanier en un seul départ.

## Compétences

**Réputation** : chaque vente avec bénéfice en rapporte, à hauteur du
bénéfice. Bien marchander la multiplie par (1 + 2 × marge obtenue), et les
ventes des caravaniers n'en rapportent que la moitié. Le niveau n demande
60 × (2ⁿ − 1) de réputation, et chaque niveau donne 1 point. Il n'y a pas de
redistribution des points.

Trois branches de 5 compétences, à apprendre dans l'ordre :

| 🤝 Négoce | 🗺️ Routes | 📦 Logistique |
|---|---|---|
| Beau parleur : +1 patience | Raccourcis : trajets −10 % | Achat en gros : −10 % à l'achat |
| Œil du marchand : fourchette de 10 points qui encadre sa marge secrète | Éclaireur : la nouvelle du créneau suivant | Marchés profonds : saturation ×0,6 |
| Bonne réputation : marge secrète +5 % | Relais : trajets ×0,85 | Double fond : +1 rangée de charrette |
| Charmeur : compliment ≥ +8 %, sans jamais agacer | Informateurs : effets des nouvelles ×1,5 | Contremaître : caravaniers comblent les trous du rangement rejoué |
| Maître négociant : ventes des caravaniers +8 % | Grand voyageur : trajets de palier ≥ 4 ×0,8 | Flotte royale : 6e caravane (1 M) |

Rythme simulé : 1er point vers 5 min, 6 points vers 1 h 10, 10 vers 5 h 30,
15e compétence vers 56 h. Avec les compétences, le titre royal tombe vers 68 h.

## Marchandage

Chaque ville a un marchand avec un caractère (pressée, patient, sensible aux
compliments, radin, joueuse, capricieuse). Ce caractère fixe une **marge
secrète** tirée au hasard dans une fourchette, une **patience**, et l'effet
d'un compliment.

- Une demande ≤ marge est acceptée telle quelle.
- Sinon : un point de patience en moins, une réplique qui donne la
  « température » de la demande (presque / trop / beaucoup trop / insulte), et
  une **contre-offre** qui grimpe à chaque refus (35 %, 60 %, 80 %… de sa
  marge).
- Accepter la contre-offre ne coûte rien. Si la patience tombe à 0, on brade
  à −10 %.
- À la fin, on révèle ce qu'il aurait accepté (c'est comme ça qu'on apprend
  les marchands).

Un marchandage entamé ne peut plus être fermé sans conclure.

## Villes (v1)

| Palier | Ville | Ouverture | Produit | Réclame |
|---|---|---|---|---|
| 1 | ⚓ Portvent | — | sel, poisson, cordage | olives, blé, raisin, thé |
| 1 | 🏺 Terracuite | — | olives, blé, poterie | sel, poisson, miel, dattes |
| 2 | 🐑 Lainebourg | 150 | laine, fromage, tissu | cordage, poterie, vin, parfum |
| 3 | 🍇 Clos-Vermeil | 1 500 | miel, raisin, vin | poisson, fromage, tissu, perles |
| 4 | 🐪 Sablemire | 12 000 | dattes, thé, épices | laine, fromage, vin, soie |
| 5 | 💎 Mirazur | 90 000 | perles, parfum, soie | épices, thé, miel, tissu |

## Rythme mesuré (simulation)

Le bot joue avec le chargement auto, sans marchander, et redirige ses
caravaniers toutes les heures. Avec saturation et nouvelles : Lainebourg vers
11 min, 1er caravanier vers 31 min, Clos-Vermeil vers 1 h, Sablemire vers
4 h, Mirazur vers 20 h, titre royal vers 100 h. (Sans saturation, le titre
tombait vers 55 h.) À rééquilibrer après les premiers retours.

## Confort « au bureau »

- Aucun son.
- Le titre de l'onglet annonce les arrivées : « (1) 🐪 Caravane arrivée ! ».
- **Échap** (ou 🙈) : mode discret, un tableur terne en plein écran, et
  l'onglet s'appelle « Budget_T3_v2.xlsx ». Échap ou double-clic pour revenir.

## Pistes pour la suite

Bateaux et routes maritimes, deuxième continent, stocks limités par
ville, succès.
