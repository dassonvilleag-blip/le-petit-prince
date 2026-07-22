# Il te reste... — design

## Concept

Une expérience courte, façon neal.fun : le visiteur donne sa date de naissance, et l'appli lui révèle, unité par unité et de façon animée, combien de temps il lui reste — converti dans une série d'unités absurdes (tasses de café, respirations, dimanches, battements de cœur...). Pas de jeu à proprement parler : pas de score, pas d'échec, une expérience à consommer une fois (et à recommencer si on veut).

## Déroulé

1. **Écran de départ** : un champ de saisie de date de naissance + un bouton "montre-moi". Une mention en italique précise l'hypothèse utilisée ("espérance de vie moyenne utilisée : 80 ans — ceci n'est absolument pas une prédiction sérieuse").
2. **Révélation animée** : une fois la date soumise, les unités de la liste (voir *Contenu*) apparaissent l'une après l'autre, à intervalle fixe (~1,3s), avec une animation de fondu/glissement. Chaque ligne reste affichée (empilée, façon fil de discussion) pendant que la suivante apparaît.
3. **Écran final** : une fois toutes les unités révélées, un message de clôture léger s'affiche, avec un bouton "recommencer" qui réinitialise vers l'écran de départ (nouvelle date possible).

Aucune interaction pendant la révélation autre qu'attendre — pas de bouton "suivant" à cliquer, pas de possibilité de passer en avance rapide pour la V1.

## Contenu

**Espérance de vie utilisée :** 80 ans, valeur fixe (pas de personnalisation en V1), assumée avec humour via le disclaimer de l'écran de départ.

**Calcul de base :** `joursRestants = (dateNaissance + 80 ans) - aujourd'hui`, arrondi à l'entier inférieur. Si le résultat est négatif ou nul (date de naissance de plus de 80 ans), afficher un message spécial ("Alors soit tu as un secret, soit..." ou équivalent) au lieu de la liste — cas limite à gérer explicitement, pas de crash ni de nombre négatif affiché.

**Unités révélées, dans cet ordre** (chaque valeur = `round((joursRestants / 365.25) × fréquence par an)`, sauf l'unité n°1 qui est `joursRestants` brut) :

| # | Unité | Fréquence/an | Justification |
|---|---|---|---|
| 1 | Jours restants | — | calcul de base, affiché brut en ouverture |
| 2 | Nuits de sommeil | 365,25 | 1/nuit |
| 3 | Dimanches | 52,14 | nombre exact de dimanches/an |
| 4 | Lundis (le retour de vacances) | 52,14 | idem |
| 5 | Anniversaires | 1 | 1/an |
| 6 | Réveillons du 31 décembre | 1 | 1/an |
| 7 | Tasses de café | 730 | 2/jour |
| 8 | Pizzas | 52 | 1/semaine |
| 9 | Verres d'eau | 2190 | 6/jour (~1,5L/jour, verre 250ml) |
| 10 | Repas | 1095 | 3/jour |
| 11 | Fois où tu vas dire "c'est la dernière part promis" | 20 | arbitraire |
| 12 | Fois où tu vas reperdre tes clés | 12 | 1/mois |
| 13 | Fois où tu vas chercher ton téléphone alors qu'il est dans ta main | 20 | arbitraire |
| 14 | Paires de chaussettes dépareillées après la lessive | 10 | arbitraire |
| 15 | Cafés/thés renversés sur toi | 3 | arbitraire |
| 16 | Fois où tu vas te cogner le petit orteil | 8 | arbitraire |
| 17 | Chargeurs perdus ou cassés | 2 | arbitraire |
| 18 | Fois où tu vas dire "je commence lundi" | 52 | 1/semaine |
| 19 | Séries Netflix commencées sans être finies | 6 | arbitraire |
| 20 | Fois où tu vas dire "on se refait ça vite" | 8 | arbitraire |
| 21 | Bonnes résolutions abandonnées avant février | 1 | 1/an |
| 22 | Livres achetés jamais lus | 3 | arbitraire |
| 23 | Déverrouillages de téléphone | 29200 | ~80/jour (moyenne étudiée) |
| 24 | Notifications reçues | 18250 | ~50/jour |
| 25 | Mots de passe oubliés | 6 | arbitraire |
| 26 | Fois où quelqu'un dira "ça passe vite la vie" | 5 | arbitraire |
| 27 | Fois où tu parleras de la météo pour meubler un silence | 100 | ~2/semaine |
| 28 | Couchers de soleil que tu pourrais regarder | 52 | 1/semaine |
| 29 | Éternuements | 365 | ~1/jour |
| 30 | Litres de salive produits | 438 | ~1,2L/jour |
| 31 | Cheveux perdus | 36500 | ~100/jour |
| 32 | Respirations | 8409600 | 16/min |
| 33 | Clignements des yeux | 5956800 | ~17/min sur 16h éveillées/jour |
| 34 | Pas effectués | 2555000 | ~7000/jour |
| 35 | Battements de cœur | 42048000 | ~80 bpm |

L'ordre est volontairement croissant en "vertige" : ça commence par du banal/relatable (dimanches, café) et finit sur les très grands nombres corporels (respirations, battements de cœur), pour un effet comique progressif.

## Architecture technique

Contrairement aux deux jeux du site qui tournent sur `<canvas>` (`petites-orbites`, `panne-au-decollage`), cette expérience est majoritairement du texte animé en DOM/CSS — même approche que `echelle-du-temps` (piloté par du DOM, pas de canvas) :

- `games/il-te-reste/index.html` — page Vite dédiée : écran de saisie, conteneur de révélation, écran final.
- `src/games/il-te-reste/units.ts` — données pures : liste des 35 unités (`{ label: string; perYear: number }`), l'espérance de vie utilisée (`LIFE_EXPECTANCY_YEARS = 80`), et une fonction pure `computeUnitValues(birthDate: Date, today: Date): { daysLeft: number; units: { label: string; value: number }[] } | null` (retourne `null` si `daysLeft <= 0`, cas limite de la date de naissance trop ancienne).
- `src/games/il-te-reste/main.ts` — orchestration : lecture du formulaire, appel à `computeUnitValues`, séquencement de la révélation (`setTimeout` + classes CSS pour l'animation), affichage de l'écran final, bouton "recommencer".
- `src/games/il-te-reste/style.css` — mise en page + charte graphique actuelle du site (mise à jour depuis l'écriture initiale de ce spec) : palette rétro/arcade (`--bg`, `--card`, `--ink`, `--soft`, `--pink`, `--teal`, `--purple`, `--yellow`, `--orange`), police `VT323` pour le corps de texte et `Pixelify Sans` pour les titres, bordures épaisses (3px solid `--ink`) avec ombres portées franches (`4px 4px 0 ...`), cohérente avec `petites-orbites`/`echelle-du-temps` et la homepage tels qu'ils sont aujourd'hui.
- Tuile ajoutée sur la page d'accueil + entrée `vite.config.ts` + mise à jour du README, suivant la convention des expériences précédentes.

### Tests

`computeUnitValues` est une fonction pure (date d'entrée → nombres en sortie), isolée dans `units.ts` sans dépendance DOM — bon candidat pour des tests unitaires `node:test`, comme le `mapping.ts` de l'échelle de temps. Contrairement à `panne-au-decollage`, cette expérience a une vraie logique de calcul isolable qui mérite d'être testée : cas nominal (date passée plausible), cas limite (`daysLeft <= 0`), et vérification qu'aucune valeur n'est négative.

## Hors scope (V1)

- Personnalisation de l'espérance de vie (slider, pays, etc.) — fixe à 80 ans.
- Bouton pour passer/accélérer la révélation, ou revenir en arrière dans la séquence.
- Partage du résultat (image, lien, réseaux sociaux).
- Unités "touchantes"/memento mori (ton choisi : 100% absurde et léger).
- Sauvegarde de la date de naissance (`localStorage`) — chaque visite repart d'un écran vierge.
