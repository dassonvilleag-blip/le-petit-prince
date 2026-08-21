# Le Roi des Pirates — sous-titres de nœud — design

> Statut : validé. Brainstorming terminé le 2026-08-21, prêt pour le plan d'implémentation.

## Origine / constat

Chaque nœud de l'histoire affiche déjà un titre (`StoryNode.title`, ex: "East Blue — Les origines"), rendu dans `#node-title`. L'utilisateur veut un **second titre, affiché juste en dessous**, plus court, qui résume en quelques mots le dilemme/sujet que ce nœud pose au joueur — avant même qu'il lise le texte complet. Exemple donné : "Fruit du démon" pour un nœud où il faut décider de manger un fruit trouvé.

Ce chantier est le premier d'une liste de 4 idées évoquées dans la même session (les 3 autres — création de personnage, fiche "Dead or Alive", et refonte des choix à 4 branches — sont hors scope ici et feront chacune l'objet d'une session de brainstorming séparée).

## Modèle de données

Nouveau champ **obligatoire** `subtitle: string` sur `StoryNode` (`types.ts`), au même niveau que `title`. Obligatoire (pas optionnel) parce qu'il s'applique aux 34 nœuds existants (30 nœuds d'histoire + 4 fins) : rendre le champ requis permet à TypeScript de signaler tout nœud oublié pendant l'implémentation, plutôt que de laisser un sous-titre vide passer inaperçu.

## Rendu

- Nouvel élément `<p id="node-subtitle" class="node-subtitle"></p>` dans `games/roi-des-pirates/index.html`, placé entre `#node-title` et `#illustration`.
- `renderNode()` (`engine.ts`) le remplit à chaque nœud, sur le même modèle que le remplissage de `#node-title`.
- Style (`game.css`) : plus discret que `.node-title` — petit, non-italique, couleur atténuée dans l'esprit de `.arc-label` mais sans majuscules ni letter-spacing (c'est une phrase courte, pas une catégorie).

## Contenu

Sous-titre écrit à la main pour chacun des 34 nœuds (30 nœuds d'histoire + 4 fins), résumant :
- pour un nœud à choix : le dilemme/sujet posé (ex: "Fruit du démon", "Un compagnon à convaincre") ;
- pour un nœud de fin : une formule de conclusion courte plutôt qu'une question (ex: "Le rêve accompli").

Ton validé par l'utilisateur sur les 3 exemples ci-dessus.

## Tests

Pas de nouvelle logique testable en soi (assignation de texte statique). `validateStoryGraph` (dans `engine.ts`) pourrait gagner une vérification "tout nœud a un `subtitle` non vide" pour empêcher une régression future si un nœud est ajouté sans sous-titre — à trancher au moment du plan selon si ça s'intègre proprement à la fonction existante.

## Hors scope

- Création de personnage (prénom + genre) — chantier séparé.
- Fiche "Dead or Alive" (portrait + prime évolutive) — chantier séparé.
- Passage à 4 choix par nœud avec branches narratives multipliées — chantier séparé, plus gros.
- Illustrations SVG — toujours hors scope (cf. spec précédente du 2026-08-19).
