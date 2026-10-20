# Atelier des sprites de L'Âge des Royaumes

Les bâtiments, la nature et les unités du jeu sont des modèles 3D KayKit
(Kay Lousberg, CC0) rendus en sprites isométriques 2:1, comme le faisait
Age of Empires II. Ce dossier sert à les re-cuire ; le jeu, lui, n'utilise que
le résultat (`public/sprites/royaumes.png` et `src/games/age-des-royaumes/sprites.ts`).

- `modeles/` : tous les modèles glTF des packs KayKit Medieval Hexagon,
  Adventurers, Forest Nature et Resource Bits (licences dans chaque dossier).
- `three/` : le strict nécessaire de three.js 0.186 (MIT), pour le rendu seulement.
- `recette.mjs` : bâtiments et nature ; `unites.mjs` : personnages, armes, animations.
- `cuisson.mjs` : le rendu (caméra orthographique à 30°, 8 directions pour les unités).

Re-cuire (Windows, Chrome installé ; quelques minutes en rendu logiciel) :

```sh
node outils/atelier-royaumes/piloter.mjs outils/atelier-royaumes outils/atelier-royaumes/sortie
node outils/atelier-royaumes/publier.mjs outils/atelier-royaumes/sortie .
```
