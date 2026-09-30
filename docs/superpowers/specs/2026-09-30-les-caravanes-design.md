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

## Rythme mesuré (simulation, joueur actif sans marchandage)

Lainebourg vers 9 min, 1er caravanier vers 23 min, Clos-Vermeil vers 46 min,
Sablemire vers 3 h, Mirazur vers 15 h. Le titre royal demande plus de 3 jours
(caravaniers compris). À rééquilibrer après les premiers retours.

## Confort « au bureau »

- Aucun son.
- Le titre de l'onglet annonce les arrivées : « (1) 🐪 Caravane arrivée ! ».
- **Échap** (ou 🙈) : mode discret, un tableur terne en plein écran, et
  l'onglet s'appelle « Budget_T3_v2.xlsx ». Échap ou double-clic pour revenir.

## Pistes pour la suite

Bateaux et routes maritimes, deuxième continent, événements (tempête,
bandits, foire), stocks limités par ville, succès.
