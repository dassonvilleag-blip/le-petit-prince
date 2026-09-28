# Cité Petit Prince — design

> Statut : validé (brainstorming du 2026-09-28). Les commerces pourront être
> renommés plus tard.

## Pitch

Un *Tiny Tower* dans une cité. On part d'un hall et d'un appartement, on
empile les étages (appartements et commerces), on loge des habitants, on les
embauche dans les commerces, on réapprovisionne les stocks, on monte les
visiteurs en ascenseur. Enseigne du hall : « CITÉ PETIT PRINCE – Bât. A ».

Aucun lien avec le livre : c'est le nom de la cité.

## Boucle

- **Étages** — un étage de plus coûte `150 × n² × 1,06ⁿ` € (n = numéro du
  nouvel étage) et se construit en `10 s + 20 s × n` (max 20 min), un chantier
  à la fois. Chaque étage terminé rapporte 🎟️ 1.
- **Appartements** — 5 habitants. Un nouvel habitant emménage dès la fin du
  chantier, puis un toutes les 60 s tant qu'il reste de la place.
- **Commerces** — 20 commerces uniques (4 par catégorie), chacun
  constructible une seule fois, débloqués selon la hauteur de la tour (0, 6,
  14, 24 étages). Jusqu'à 3 employés.
- **Stocks** — 3 produits par commerce. Commander coûte de l'argent et prend
  un temps de livraison ; le stock se vend ensuite tout seul, unité par unité.
  Le produit n° k exige k employés pour être commandé.

  | Produit | Coût | Livraison | Quantité | Prix unitaire | Écoulé en |
  |---|---|---|---|---|---|
  | 1 | 30 € | 20 s | 10 | 6 € | 3 min |
  | 2 | 250 € | 2 min | 25 | 20 € | 15 min |
  | 3 | 1 500 € | 10 min | 50 | 70 € | 1 h |

  Valeurs × multiplicateur du rang du commerce : 1, 2,5, 6, 15.
- **Habitants** — prénom, compétences 0-9 dans chaque catégorie, métier de
  rêve (un commerce). Prix de vente × (1 + 3 % par point de compétence des
  employés dans la catégorie + 30 % par employé à son métier de rêve).
  Première fois à son métier de rêve : 🎟️ 1.
- **Ascenseur** — un visiteur arrive dans le hall toutes les 20 s (3 au plus)
  et veut aller à un étage. On le monte : pourboire selon l'étage et la taille
  de la tour, 8 % de chance d'un 🎟️.
- **Tickets 🎟️** — finir une livraison (1) ou un chantier (1 par tranche de
  2 min restantes).
- **Le Fil** — faux réseau social des habitants : posts sur les événements
  (emménagement, embauche, rupture de stock, nouvel étage) et posts d'ambiance
  aléatoires.
- **Hors ligne** — livraisons, ventes, chantiers et emménagements continuent ;
  popup de bilan au retour.

Départ : 1 500 €, 🎟️ 3, un appartement (2 habitants) et un Snack vide.

## Catégories et commerces

| Catégorie | Rang 1 | Rang 2 | Rang 3 | Rang 4 |
|---|---|---|---|---|
| 🍔 Bouffe | Snack | Tacos | Boulangerie | Pizzeria |
| ✂️ Services | Barbier | Laverie | Réparation téléphones | Auto-école |
| 🎮 Loisirs | Salle de sport | Salle d'arcade | City stade | Cinéma |
| 🛍️ Boutiques | Épicerie | Bazar | Sneakers | Téléphonie |
| 🎤 Créatif | Atelier graffiti | Tatoueur | Radio locale | Studio de rap |

## Écran

Canvas 2D : l'immeuble en coupe, défilement vertical (glisser / molette).
Hall en bas avec l'enseigne, gaine d'ascenseur à gauche, habitants en pixel
art qui se promènent, indicateurs de stock sur chaque commerce, étage fantôme
« + Nouvel étage » au sommet, toit avec paraboles. Ciel de jour ou de nuit
selon l'heure réelle.

Panneaux DOM en bas d'écran : étage (employés, stocks), construction,
habitants, Le Fil. Barre du bas : Ascenseur, Habitants, Le Fil, Construire.

## Architecture

```
games/cite-petit-prince/index.html
src/games/cite-petit-prince/
  data.ts     catégories, commerces, produits, prénoms, textes du Fil
  sim.ts      état, avancée du temps, actions, sauvegarde (pur, testé)
  render.ts   dessin canvas de la tour et test de clic
  main.ts     boucle, entrées, panneaux DOM
  cite.css
  test/sim.test.ts
```

## Hors scope (v1)

Visiteurs spéciaux (VIP), missions, décoration des étages, bâtiments B/C.
