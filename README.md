# le petit prince

Un site façon [neal.fun](https://neal.fun) : une collection de petites expériences
interactives inspirées de l'univers du Petit Prince.

## Jeux

- **Petites Orbites** (`/games/petites-orbites/`) — bac à sable gravitationnel.
  Glisse pour lancer des planètes autour du soleil et construis un système
  solaire qui survit le plus longtemps possible.

## Assets en cours (branche `feature/panne-au-decollage`)

Packs isométriques gratuits (CC0 / CC-BY) à récupérer pour le rendu du prochain jeu :

- [Kenney - Isometric Miniature Dungeon](https://kenney.nl/assets/isometric-miniature-dungeon) (CC0, priorité)
- [Kenney - Isometric Blocks](https://kenney.nl/assets/isometric-blocks) (CC0, complément)
- [Kenney - Space Kit](https://kenney.nl/assets/space-kit) (CC0, props spatiaux : consoles, tuyaux, éléments de vaisseau)

## Stack

- [Vite](https://vite.dev) + TypeScript
- Canvas 2D, zéro dépendance à l'exécution

## Développement

```sh
npm install
npm run dev      # serveur de dev
npm run build    # build de production dans dist/
```

Chaque jeu est une page Vite séparée (`games/<nom>/index.html`) avec son code
dans `src/games/<nom>/`.
