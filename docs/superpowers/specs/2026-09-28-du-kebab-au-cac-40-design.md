# Du Kebab au CAC 40 — design

> Statut : validé. Brainstorming du 2026-09-28.

## Pitch

Un jeu incrémental façon *AdVenture Capitalist*, à la française. On démarre avec
un vide-grenier et quelques euros, on rachète des commerces de plus en plus gros
jusqu'à la compagnie aérienne, on embauche des gérants pour que tout tourne
tout seul, et on finit par entrer en Bourse pour recommencer plus fort.

Le jeu n'a aucun lien avec l'univers du livre *Le Petit Prince* (c'est juste le
nom du site).

## Boucle de jeu

1. **Produire** — chaque commerce possédé a une barre de production. Sans
   gérant, on tape la carte pour lancer un cycle ; la barre se remplit, puis
   l'argent tombe. Avec gérant, les cycles s'enchaînent seuls.
2. **Acheter** — chaque exemplaire supplémentaire d'un commerce augmente ses
   revenus par cycle ; son prix est multiplié par un coefficient à chaque achat.
   Sélecteur d'achat : ×1 / ×10 / ×100 / MAX.
3. **Paliers** — à 25, 50, 100, 200, 300 et 400 exemplaires, le cycle du
   commerce est deux fois plus court. Au-delà, chaque centaine (500, 600…)
   double ses revenus.
4. **Gérants** — achat unique par commerce, automatise la production.
5. **Améliorations** — achats uniques qui multiplient les revenus (×3 sur un
   commerce, puis ×3 sur tous).
6. **Introduction en Bourse** (prestige) — voir plus bas.
7. **Hors ligne** — au retour, les commerces avec gérant ont produit pendant
   l'absence ; une popup annonce « Pendant ton absence : +X € ».

## Les 11 commerces

Chiffres calqués sur les valeurs publiques d'AdVenture Capitalist (courbe
éprouvée), à rééquilibrer en playtest. Revenu = revenu de base × exemplaires ×
multiplicateurs.

| # | id | Nom affiché | Icône | Coût initial | Coef. | Cycle | Revenu de base |
|---|---|---|---|---|---|---|---|
| 1 | `vide-grenier` | Vide-grenier | 🧺 | 4 € | 1,07 | 1 s | 1 € |
| 2 | `anatolie` | ANATOLIE | 🥙 | 60 € | 1,15 | 3 s | 60 € |
| 3 | `boulangerie` | Boulangerie | 🥖 | 720 € | 1,14 | 6 s | 540 € |
| 4 | `chez-rachid` | Chez Rachid | 🛒 | 8 640 € | 1,13 | 12 s | 4 320 € |
| 5 | `tabac-presse` | Tabac-presse | 📰 | 103 680 € | 1,12 | 24 s | 51 840 € |
| 6 | `osr` | OSR – Objectif Sécurité Routière | 🚗 | 1,24 M€ | 1,11 | 96 s | 622 080 € |
| 7 | `transports` | Transports poids lourds | 🚛 | 4,31 M€ | 1,105 | 192 s | 2,15 M€ |
| 8 | `supermarche` | Supermarché | 🏬 | 14,9 M€ | 1,10 | 384 s | 7,46 M€ |
| 9 | `chaine-tele` | Chaîne de télé | 📺 | 179 M€ | 1,09 | 1 536 s | 89,6 M€ |
| 10 | `club-foot` | Club de foot | ⚽ | 2,15 Md€ | 1,08 | 6 144 s | 1,07 Md€ |
| 11 | `compagnie-aerienne` | Compagnie aérienne | ✈️ | 25,8 Md€ | 1,07 | 36 864 s | 29,7 Md€ |

Les Transports poids lourds sont une marche intermédiaire ajoutée après coup :
valeurs à la moyenne géométrique d'OSR et du Supermarché, sans décaler les
commerces suivants.

On commence avec 1 vide-grenier et 0 €. Un commerce non possédé affiche un
cadenas et son prix ; il se débloque dès le premier achat.

## Gérants

Un par commerce, prix inspirés d'AdCap. Chacun a un nom et une petite phrase
drôle.

| Commerce | Gérant | Prix |
|---|---|---|
| Vide-grenier | Françoise | 1 k€ |
| ANATOLIE | Eren | 15 k€ |
| Boulangerie | Mme Lefèvre | 100 k€ |
| Chez Rachid | Rachid | 500 k€ |
| Tabac-presse | Gégé | 1,2 M€ |
| OSR | Hichem | 10 M€ |
| Transports poids lourds | Ilyes | 33 M€ |
| Supermarché | Sandrine | 111 M€ |
| Chaîne de télé | Jean-Pierre | 555 M€ |
| Club de foot | Le Président | 10 Md€ |
| Compagnie aérienne | Commandant Bernard | 100 Md€ |

## Améliorations

Liste ordonnée dans `data.ts`, affichée par prix croissant, les moins chères
d'abord. Première vague : un ×3 par commerce (de 250 k€ à 10 Md€), puis un
« ×3 sur tous les commerces ». Vagues suivantes ajoutées au playtest.

## Introduction en Bourse (prestige)

- Actions disponibles = `floor(150 × √(gains cumulés / 1e13))` − actions déjà
  obtenues. Constante `1e13` réglable.
- Chaque action détenue donne **+2 %** de revenus sur tout.
- Entrer en Bourse remet à zéro l'argent, les commerces, les gérants et les
  améliorations ; on garde les actions et les gains cumulés.
- Le panneau Bourse affiche les actions détenues et les actions gagnées si on
  entre en Bourse maintenant ; bouton avec confirmation intégrée.

## Affichage des nombres

Échelle longue française : mille, million, milliard, billion, billiard,
trillion, trilliard, quadrillion… puis notation scientifique au-delà.
Ex. `12,4 millions €`, `3,2 k€` pour les petits montants dans les cartes.

## Écran (DOM, pas de canvas)

Liste verticale de cartes, une par commerce, pensée d'abord pour téléphone :

- En-tête : argent total, actions détenues.
- Carte : icône, nom, nombre d'exemplaires, barre de progression, gain du
  cycle, temps restant, bouton « Acheter ×N : prix » (grisé si trop cher),
  jauge vers le prochain palier.
- Barre du bas : Gérants / Améliorations / Bourse (panneaux coulissants), plus
  le sélecteur ×1 / ×10 / ×100 / MAX.
- Lien retour « ← le petit prince » comme les autres jeux.

Quand un cycle est plus court que ~0,1 s, la barre reste pleine et affiche un
débit en €/s au lieu de clignoter.

## Sauvegarde

`localStorage`, clé `du-kebab-au-cac-40:v1`, objet `{ version, savedAt,
argent, gainsCumules, actions, commerces: {id: {nb, cycleDebut}}, gerants,
ameliorations }`. Sauvegarde toutes les 5 s et sur `visibilitychange`.
Accès protégé par try/catch (le jeu reste jouable sans stockage).

## Architecture

```
games/du-kebab-au-cac-40/index.html
src/games/du-kebab-au-cac-40/
  data.ts        commerces, gérants, améliorations, constantes
  eco.ts         fonctions pures : coût de N achats, max achetable, durée de
                 cycle, revenu par cycle, actions de prestige, formatage
  state.ts       état, avancée du temps (tick et hors ligne), save/load
  main.ts        rendu DOM et interactions
  cac40.css
  test/eco.test.ts
```

- Ajout de l'entrée dans `vite.config.ts` et d'une tuile sur l'accueil
  (`public/tiles/cac40.svg`).
- La logique éco est pure et testée avec `node --test` (coûts géométriques,
  max achetable, paliers, calcul hors ligne, actions).

## Hors scope (v1)

Événements temporaires, succès, mondes multiples (la Lune, Mars d'AdCap),
sons, pubs/monétisation, multijoueur.
