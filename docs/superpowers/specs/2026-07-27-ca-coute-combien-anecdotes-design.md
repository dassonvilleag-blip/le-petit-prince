# Ça coûte combien — anecdotes "Le saviez-vous ?"

## Contexte

Pendant une partie entre potes, personne n'a su expliquer pourquoi une
Ferrari 250 GTO vaut ce qu'elle vaut — il a fallu chercher sur internet.
Pour certains objets/expériences du pool (les rares, les insolites, ceux
dont le prix surprend), on veut donner l'explication directement dans le
jeu, sans faire ça pour un ticket de métro ou un Big Mac.

## Modèle de données

Ajout d'un champ optionnel à `Item` (`src/games/ca-coute-combien/items.ts`) :

```ts
export interface Item {
  id: string;
  nom: string;
  photo: string;
  prix: number;
  anecdote?: string;
}
```

`anecdote` reste `undefined` pour la grande majorité des ~224 objets
actuels. Aucune migration : les objets existants sans le champ continuent
de fonctionner tels quels.

## Affichage

Dans `games/ca-coute-combien/index.html`, un nouveau bloc après
`#round-comment` :

```html
<div id="round-anecdote-wrap" class="hidden">
  <p class="anecdote-label">Le saviez-vous ?</p>
  <p id="round-anecdote" class="round-anecdote"></p>
</div>
```

Dans `main.ts`, à la fin de `submitGuess()` : si `item.anecdote` est défini,
on retire `.hidden` de `#round-anecdote-wrap` et on lance son typewrite
(`startTypewrite`, même helper que `round-comment`) après un délai =
`REVEAL_COUNT_DURATION_MS` + durée estimée du typewrite du commentaire
(`comment.length * REVEAL_TYPEWRITE_MS_PER_CHAR`), pour enchaîner
proprement après le commentaire sarcastique. Si `item.anecdote` est
`undefined`, le bloc reste masqué — comportement inchangé pour les objets
sans anecdote.

Style (`game.css`) : nouvelle classe `.round-anecdote`, police du corps de
texte (pas `.numeric`), distincte visuellement du commentaire sarcastique
rose (ex. bordure gauche colorée ou fond légèrement teinté) pour bien
séparer les deux blocs.

## Contenu : sélection et rédaction

1. Claude relit les ~224 objets du pool actuel et propose une liste
   d'objets/expériences qui ont une histoire intéressante derrière leur
   prix (rareté, record, contexte historique, etc.) — à valider par
   l'utilisateur avant rédaction.
2. Pour chaque objet validé, Claude rédige un petit paragraphe (2-4
   phrases) expliquant le prix.
3. Le contenu est ajouté par lots (même approche que les "content waves"
   déjà utilisées pour peupler le pool initial), chaque lot dans sa
   propre branche/PR.

Ce travail de contenu est un chantier séparé de l'implémentation
technique ci-dessus — il peut démarrer une fois le système en place et
testé sur un ou deux objets d'exemple.

## Tests

Le projet n'a que des tests `node:test` sur la logique pure
(scoring, pool, comments, reveal). La sélection/rédaction des anecdotes et
le rendu DOM ne sont pas du ressort de ces tests — vérification visuelle
manuelle (comme pour les précédentes features UX de ce jeu). Si une
logique pure apparaît (ex. un helper de timing de reveal), elle suit le
même pattern de tests que `reveal.ts`.

## Hors périmètre

- Le multijoueur (chantier séparé, à brainstormer indépendamment).
- Afficher l'anecdote dans le récap final : pas demandé, elle n'apparaît
  que pendant la manche.
