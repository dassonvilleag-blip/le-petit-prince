# Ça coûte combien ?! — design

> Statut : validé. Brainstorming terminé le 2026-07-23, prêt pour le plan d'implémentation.

## Origine / inspiration

Inspiré du jeu ["The Auction Game" sur neal.fun](https://neal.fun/auction-game/) : le joueur devine le prix réel d'un objet, plus il est proche plus il marque de points. Le mécanisme (deviner un chiffre, être noté sur la précision) est conservé, avec un thème différent et un ton "beaucoup plus fun" que l'original.

## Concept & nom

**Nom retenu : « Ça coûte combien ?! »** (le nom de travail "Prix choc" est abandonné).

Le joueur devine le prix réel d'items insolites du quotidien — objets et "expériences" (une nuit d'hôtel dans tel pays, une place de parking à Monaco, etc.) — prix réels/décalés, comiques par le contraste. Après chaque réponse, un commentaire comique/sarcastique réagit à la précision du joueur : c'est le point différenciateur principal par rapport à l'original.

## Contenu

- **Types d'items** : objets physiques ET "expériences" (nuit d'hôtel, place de parking, etc.), pas seulement des objets.
- **Pool d'items** : première vague ~40 items rédigés à la main, avec des prix réalistes et plausibles (recherchés sérieusement mais pas de champ "source" stocké ni affiché dans le jeu pour l'instant — pourra être ajouté plus tard si besoin). D'autres vagues pourront être ajoutées après coup sans limite fixe.
- **Photos** : vraies photos (pas d'emoji, pas de pixel art dessiné à la main), libres de droits (Unsplash / Pexels / Wikimedia Commons ou équivalent CC0/licence libre) — à rechercher et proposer comme pour les assets Kenney de Panne au décollage. Pour les items "expérience", la photo doit être authentique et représentative du même lieu/produit (ex : une vraie photo d'une chambre du Burj Al Arab pour illustrer son prix moyen), pas forcément LA photo exacte de l'annonce. Pas de photos fournies par l'utilisateur, pas de scraping d'images protégées.
- **Format de partie** : 10 manches par partie, tirées du pool.
- **Anti-répétition entre parties** : la liste des items déjà joués est mémorisée en `localStorage`. Chaque nouvelle partie pioche en priorité parmi les items non-vus. Une fois le pool entièrement épuisé, il est remélangé aléatoirement (nouvel ordre de tirage à chaque cycle, pas de répétition prévisible d'un cycle à l'autre).

## Scoring

- **Score par manche** : basé sur l'écart en % entre l'estimation du joueur et le prix réel (formule façon neal.fun : deviner exactement ≈ 1000 points, très loin ≈ 0 point). Pas un système à paliers fixes.
- **Score total** : cumul sur 10 manches, max 10 000 points.
- **Commentaire par manche** : après chaque réponse, un texte comique/sarcastique tiré aléatoirement dans une banque de commentaires organisée par tranche de précision (ex : quasi-exact → fier/impressionné ; très loin → moqueur). C'est le point différenciateur principal par rapport à l'original.
- **Saisie** : champ numérique classique (comme l'original neal.fun), pas de slider.

## Fin de partie

Récapitulatif affiché en fin de partie :
- Score total (sur 10 000).
- La manche où le joueur a été le plus précis, et celle où il a été le plus loin.
- Un commentaire de conclusion sarcastique, adapté au score global (ex : d'un ton moqueur pour un score faible à un ton impressionné pour un score élevé).

## Record persistant

Le meilleur score est sauvegardé en `localStorage`, comme les autres expériences du site (`petites-orbites`, `il-te-reste`). Le suivi des items déjà vus (anti-répétition) est également stocké en `localStorage`, séparément.

## Direction artistique

- Le site a une identité rétro/pixel-arcade (polices Pixelify Sans + VT323, palette `--ink`/`--card`/`--pink`/`--teal`/`--purple`/`--yellow`) — appliquée ici pour l'UI (cadre, boutons, textes).
- **Traitement des photos** : présentées façon **polaroid avec léger effet scanlines**. Photo intacte (pas de filtre de couleur type duotone), cadrée dans une bordure façon polaroid (bordure crème épaisse, plus large en bas) avec un overlay scanlines discret par-dessus pour rappeler l'esthétique rétro du site sans dénaturer les couleurs réelles de la photo. Décision prise après comparaison visuelle de 3 traitements (cadre brut / duotone arcade / polaroid+scanlines) — le polaroid+scanlines a été retenu pour garder le réalisme de la photo tout en s'intégrant à la DA du site.

## Architecture technique

- **Stack** : DOM/CSS + TypeScript, pas de canvas — cohérent avec les expériences similaires du site (`juke-box`, `petites-orbites`), étant donné que l'essentiel est photo + texte + champ de saisie.
- **Emplacement** : `games/ca-coute-combien/index.html` + `src/games/ca-coute-combien/{main.ts, game.css}`, suivant la structure des autres expériences du site.
- **Données** : le pool d'items vit dans un fichier de données séparé du code du jeu (JSON ou module TS), un objet par item avec `{ id, nom, photo (chemin local), prix }`. Cette séparation permet d'ajouter facilement de nouvelles vagues d'items par la suite sans toucher au code du jeu.
- **Photos locales** : les photos téléchargées (libres de droits) sont stockées dans le dossier de l'expérience, référencées par chemin dans le fichier de données.

## Hors scope (pour l'instant)

- Pas d'API externe pour la génération/récupération de prix ou de photos.
- Pas de champ "source" affiché ou stocké pour les prix — à réévaluer plus tard si besoin de traçabilité.
- Pas de slider de saisie, uniquement un champ numérique.
