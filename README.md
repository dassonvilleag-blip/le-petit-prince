# le petit prince

Un site façon [neal.fun](https://neal.fun) : une collection de petites expériences
interactives inspirées de l'univers du Petit Prince.

## Jeux

- **Petites Orbites** (`/games/petites-orbites/`) — bac à sable gravitationnel.
  Glisse pour lancer des planètes autour du soleil et construis un système
  solaire qui survit le plus longtemps possible.
- **La Colonie** (`/games/la-colonie/`) — fourmilière en coupe façon Clash of
  Clans : creuse des galeries, construis nurserie et champignonnière, élève
  ouvrières et soldates, pars en expédition. Tout vit en temps réel, même hors
  ligne (localStorage). Les « cercles de symbiose » relient les espèces :
  chaque insecte du jardin peut devenir allié (les pucerons dès la v1) ou
  rester adversaire ; ajouter une espèce = une fiche dans
  `src/games/la-colonie/data.ts`.
- **Les Caravanes** (`/games/les-caravanes/`) — commerce en temps réel entre
  six villes. On range sa charrette façon Tetris, on marchande à l'arrivée
  avec des marchands qui ont chacun leur caractère, et des caravaniers font la
  navette tout seuls, même onglet fermé. Échap = mode discret.
- **Le Tarot** (`/games/tarot/`) — tarot FFT à 4 ou à 5 (appel au roi), en
  solo contre trois ou quatre habitués du café. Trois niveaux : facile
  (heuristiques sans mémoire), moyen (compte les cartes, charge son
  partenaire), difficile (Monte-Carlo : simule des donnes compatibles avec ce
  qu'il a vu avant chaque carte). Règles dans `src/games/tarot/regles.ts`.
- **L'Âge des Royaumes** (`/games/age-des-royaumes/`) — un Age of Empires en
  isométrique, construit par étapes. Étape 1 : l'économie (villageois,
  récolte, maisons, camps, moulin, fermes). Étape 2 : l'armée (caserne,
  archerie, écurie, 7 unités avec armures et bonus) et les âges sombre →
  féodal → châteaux. Étape 3 : une IA adverse (`ia.ts`, mêmes ordres que le
  joueur), le brouillard de guerre et la victoire par conquête. Chiffres
  d'AoE II dans `src/games/age-des-royaumes/data.ts`, moteur sans DOM dans
  `sim.ts`. Viendront les technologies, les murs et tours, la mini-carte.
- **Les Dés Menteurs** (`/games/les-des-menteurs/`) — Perudo en ligne, de 2 à
  6 joueurs dans un salon à code. Enchères, bluff, « Menteur ! » et « Pile
  poil ! » ; l'étoile ⭐ est joker, manches palifico incluses. Les dés vivent
  côté serveur (middleware vite en dev, Worker `workers/dudo-rooms` en prod) :
  chacun ne voit que sa main.

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
