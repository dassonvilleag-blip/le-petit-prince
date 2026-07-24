# Ça coûte combien ?! — refonte UX de l'écran de manche

## Contexte

Retour utilisateur sur le jeu existant (`games/ca-coute-combien`) : les contrôles sont "chiants" (aucun retour visuel entre la validation d'une estimation et l'affichage du résultat, tout apparaît instantanément et figé), et la présentation de la photo (cadre polaroid, recadrage `object-fit: cover` sur une hauteur fixe de 300px) peut mal recadrer des photos au ratio inhabituel. L'idée des phrases sarcastiques (`round-comment`) plaît, mais gagnerait à être mise en scène plutôt qu'affichée d'un coup.

Périmètre : uniquement l'écran de manche (`#screen-round`) et sa séquence de révélation. Pas de changement sur l'écran d'intro, l'écran de récap, le contenu des items, ou la logique de scoring/tirage (`scoring.ts`, `pool.ts`, `comments.ts` restent inchangés).

## Comportement cible

### 1. Séquence de révélation à la validation

Au clic sur "Valider" (`submitGuess`), au lieu d'afficher immédiatement le résultat final :

1. Le formulaire se cache (comme aujourd'hui).
2. Le score s'anime de 0 jusqu'à sa valeur finale (ex: 0 → 740), sur une **durée fixe courte (~700-900ms)**, avec un easing (ease-out), indépendamment de l'ampleur du nombre.
3. En parallèle ou juste après, le prix réel s'anime aussi de 0 jusqu'à sa valeur (ex: 0 → 800 000 000 €), **sur la même durée fixe** — donc le pas d'incrémentation par frame s'adapte à la grandeur du nombre (calcul basé sur le temps écoulé / easing, pas sur un incrément fixe par frame). Formaté avec `Intl.NumberFormat` comme aujourd'hui à chaque frame.
4. Une fois les deux chiffres arrivés à leur valeur finale, la phrase sarcastique (`round-comment`) s'écrit lettre par lettre façon machine à écrire (~20-30ms par caractère).
5. Le bouton "Manche suivante" reste affiché comme aujourd'hui — pas de défilement automatique, l'utilisateur garde la main pour passer à la suite.

Si l'utilisateur clique sur "Manche suivante" pendant qu'une animation est encore en cours, l'animation en cours est interrompue proprement (pas de timers fantômes qui continuent à écrire dans le DOM de la manche suivante) — ex: annuler les timers/`requestAnimationFrame` actifs.

### 2. Présentation de la photo

- Suppression du cadre "polaroid" (`.polaroid`, effet scanlines, marge blanche).
- La photo est affichée plus grande, dans un conteneur qui respecte son ratio réel (pas de recadrage forcé en hauteur fixe 300px avec `object-fit: cover`) — largeur contrainte (comme aujourd'hui, `min(420px, 100%)` ou similaire), hauteur libre selon le ratio de l'image, avec une hauteur max raisonnable pour éviter qu'une image très verticale ne pousse tout l'écran (`max-height`, `object-fit: contain` si nécessaire au-delà de cette limite).
- Coins légèrement arrondis, ombre discrète pour la détacher du fond — mais nettement plus sobre que le cadre polaroid actuel.
- À chaque nouvelle manche (`showRound`), la photo apparaît avec une petite animation d'entrée : fondu + léger zoom-out (départ ~1.05 scale → 1, opacité 0 → 1), sur ~400-500ms.

### 3. Police des chiffres

Retour utilisateur : la police actuelle des chiffres (`VT323`, utilisée par défaut sur tout le `body`) est difficile à lire. Comme les chiffres deviennent l'élément central de l'animation de révélation, on bascule tous les éléments affichant des chiffres (score, prix, compteur de manche `round-index`, record, champ de saisie `guess-input`) sur `"Pixelify Sans"` — déjà chargée sur la page pour les titres, donc aucune nouvelle police à charger. `VT323` reste utilisé pour le texte "flavor" (phrase sarcastique, libellés).

### 4. Ce qui ne change pas

- Le champ de saisie numérique (`guess-input`) reste un simple input number — pas de slider, pas de "chaud/froid" en direct (l'utilisateur a validé que le seul vrai problème était l'absence de retour après validation, pas la saisie elle-même).
- Le bouton "Manche suivante" reste une action explicite.
- Aucune donnée (`items.ts`, `photo-credits.ts`) ni logique de scoring/tirage ne change.

## Approche technique

CSS (transitions/keyframes) + JS vanilla, cohérent avec le reste du repo (100% vanilla, zéro dépendance) :

- **Compteur animé (score + prix)** : une petite fonction utilitaire réutilisable `animateCount(el, from, to, durationMs, format)` pilotée par `requestAnimationFrame`, avec easing (ex: `easeOutCubic`), qui met à jour `el.textContent` à chaque frame via la fonction de formatage fournie (le formatage prix réutilise l'`Intl.NumberFormat` déjà en place). Durée fixe quel que soit `to`.
- **Machine à écrire** : petite fonction utilitaire `typewrite(el, text, msPerChar)` pilotée par `setInterval` (ou `requestAnimationFrame` avec accumulation de temps), qui ajoute les caractères un par un à `el.textContent`.
- **Annulation propre** : ces fonctions retournent un handle (id de timer / flag d'annulation) stocké dans une variable module-level (ex: `currentRevealHandles`), nettoyé au début de `showRound()` et de `submitGuess()` avant de démarrer une nouvelle séquence.
- **Animation photo** : classe CSS togglée (ex: retirer/rajouter une classe `.entering` sur l'élément photo via un reflow forcé ou un `requestAnimationFrame`) combinée à une transition CSS sur `opacity`/`transform`.
- Toute la logique d'animation reste dans `main.ts` (ou un nouveau petit module `reveal.ts` si `main.ts` devient trop chargé — à trancher pendant l'implémentation selon la taille réelle du diff).

## Tests

Le projet a des tests `node:test` uniquement sur la logique pure (`scoring.ts`, `pool.ts`, `comments.ts`) — aucun test DOM/UI existant. Les nouvelles fonctions utilitaires pures (calcul du easing/valeur intermédiaire d'un compteur à un instant `t`, découpage du texte pour la machine à écrire) peuvent être extraites sous une forme testable (fonction pure `interpolate(from, to, progress, easingFn)` par exemple) et couvertes par `node:test`, en cohérence avec le reste du projet. Le rendu DOM/animation lui-même est vérifié manuellement dans le navigateur (comme le reste du jeu).

## Hors périmètre

- Écran d'intro et écran de récap (non mentionnés dans la demande).
- Ajout de nouveaux items/contenu.
- Toute dépendance externe (librairie d'animation) — écartée volontairement pour rester cohérent avec le reste du repo.
