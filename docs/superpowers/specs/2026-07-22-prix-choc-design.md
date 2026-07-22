# Prix choc — design (brainstorming en cours)

> Statut : brainstorming non terminé. Ce doc capture les décisions prises jusqu'ici + les points encore ouverts, pour pouvoir reprendre la conversation depuis n'importe quelle machine (`git pull` sur cette branche).

## Origine / inspiration

Inspiré du jeu ["The Auction Game" sur neal.fun](https://neal.fun/auction-game/) : le joueur devine le prix réel d'un objet, plus il est proche plus il marque de points. L'utilisateur veut garder le **mécanisme** (deviner un chiffre, être noté sur la précision), mais avec un thème différent et "beaucoup plus fun" que l'original.

## Décisions validées

- **Point de départ retenu :** le mécanisme de précision (deviner/noter un chiffre caché), pas le thème de l'art. Le thème de neal.fun (peintures/œuvres d'art) est abandonné.
- **Thème retenu :** objets/photos absurdes du quotidien (prix réels, décalés, comiques par le contraste — ex. un croissant à New York, une place de parking à Monaco...).
- **Facteur "fun" principal :** après chaque réponse, un **commentaire comique/sarcastique** réagissant à la précision du joueur (pas juste un score froid affiché). C'est LE point différenciateur par rapport à l'original.
- **Saisie :** champ numérique classique (comme l'original), pas de slider.
- **Format de partie :** 10 manches par partie.
- **Contenu :** liste fixe écrite à la main (~15-20 objets avec prix réels, sources vérifiables), mélangée aléatoirement en parties de 10. Pas d'API externe pour l'instant.
- **Visuels des objets :** de **vraies photos** (pas d'emoji, pas de pixel art dessiné à la main) — décision explicite de l'utilisateur.
- **Source des photos :** banques d'images libres de droits (Unsplash / Pexels / Wikimedia Commons ou équivalent CC0/licence libre) — à rechercher et proposer comme pour les assets Kenney de Panne au décollage. Pas de photos fournies par l'utilisateur, pas de scraping d'images protégées.
- **Calcul du score par manche :** formule basée sur l'écart en % entre l'estimation et le vrai prix (comme l'original neal.fun : deviner exactement ≈ 1000 points, très loin ≈ 0 point), pas un système à paliers fixes.

## Points encore ouverts (à trancher à la reprise)

- **Fin de partie :** quel récapitulatif ? (score total, meilleur/pire manche, un ton comique de conclusion ?)
- **Record persistant :** un meilleur score sauvegardé en `localStorage`, comme les autres expériences du site (`petites-orbites`, `il-te-reste`) ?
- **Style visuel (DA) :** le site est passé à une identité rétro/pixel-arcade (polices Pixelify Sans + VT323, palette `--ink`/`--card`/`--pink`/`--teal`/`--purple`/`--yellow`) depuis la refonte du collaborateur — à appliquer ici aussi, sauf si les vraies photos imposent un traitement visuel différent (cadre autour de la photo, filtre, etc. à définir).
- **Architecture technique :** probablement DOM/CSS (pas de canvas) comme `juke-box`/`il-te-reste`, étant donné que l'essentiel est photo + texte + champ de saisie — à confirmer.
- **Liste précise des ~15-20 objets et leurs prix réels** : à établir ensemble (avec sources vérifiables pour chaque prix).
- **Nom définitif de l'expérience** ("Prix choc" est un nom de travail provisoire, pas validé).

## Prochaine étape à la reprise

Reprendre le brainstorming (skill `superpowers:brainstorming`) sur les points ouverts ci-dessus, en particulier : choisir les objets + trouver les photos libres de droits + valider fin de partie/record/architecture. Une fois le design complet validé, écrire le plan d'implémentation (skill `superpowers:writing-plans`) avant de toucher au code.
