# Le Roi des Pirates — création de personnage (étape 1/3) — design

> Statut : validé. Brainstorming terminé le 2026-08-25, prêt pour le plan d'implémentation.

## Origine / constat

Chantier ② de la liste évoquée le 2026-08-21 (après ① sous-titres, PR #17 mergée) : au tout début de la partie, le joueur choisit un prénom et un genre pour son personnage. En cours de brainstorming, la demande s'est élargie : générateur de noms de pirates aléatoire, et choix d'une espèce/origine (Humain, Géant, Homme-Poisson, Buccaneer, Lunarien).

Avec la décision que le genre affecte les accords grammaticaux du texte narratif, que le prénom soit interpellé par des PNJ, et que l'espèce ait à terme des bonus de stats **et** des branches narratives dédiées, le chantier est devenu trop large pour un seul spec — il est découpé en 3 étapes livrables séparément :

1. **Écran de création + passe de contenu genre/prénom/espèce (ce spec).** Livrable jouable de bout en bout.
2. Bonus de stats de départ par espèce (impacte l'équilibrage des duels, déjà calibré post-playtest) — session de brainstorming séparée.
3. Branches narratives dédiées par espèce (le plus gros morceau — ex. l'incapacité canonique des Homme-Poisson à nager après avoir mangé un fruit, qui interagirait avec le mécanisme `eb-choix-fondateur`) — session de brainstorming séparée.

Les chantiers ③ (fiche "Dead or Alive") et ④ (refonte des choix à 4 branches) restent également hors scope, inchangés depuis le 2026-08-21.

## Modèle de données

`types.ts` :

```ts
export type Gender = "homme" | "femme";
export type SpeciesId = "humain" | "geant" | "homme-poisson" | "buccaneer" | "lunarien";

export interface Player {
  name: string;
  gender: Gender;
  species: SpeciesId;
}
```

Nouveau champ optionnel sur `StoryNode` : `characterForm?: true`, posé uniquement sur le nœud `"creation-personnage"`.

`StoryNode.text` et `Choice.text`/`Choice.sub` ne changent pas de type (toujours `string | ((flags) => string)` pour `text`, `string` pour les choix) : le prénom/genre/espèce ne sont pas thread à travers des paramètres de fonction, mais résolus en aval par substitution textuelle (voir "Templating").

## Écran de création

Nouveau nœud `"creation-personnage"`, premier du graphe (`"intro"` devient sa cible unique). `characterForm: true` sur ce nœud fait bifurquer `renderNode()` : au lieu de la liste de boutons de choix habituelle, un formulaire est affiché :

- Champ texte prénom, avec un bouton dé 🎲 à côté (désactivé tant que le genre n'est pas choisi) qui tire un nom aléatoire dans la liste correspondant au genre sélectionné et le place dans le champ (reste éditable ensuite).
- Deux boutons genre (Homme / Femme), un seul actif à la fois.
- Cinq boutons espèce (Humain / Géant / Homme-Poisson / Buccaneer / Lunarien), un seul actif à la fois.
- Bouton "Embarquer", désactivé tant que : prénom non vide après `trim()` (max 24 caractères), genre choisi, espèce choisie.

Au clic sur "Embarquer", le module `engine.ts` enregistre `player = { name, gender, species }` (nouvelle variable module-level, au même niveau que `stats`/`flags`) puis navigue vers `"intro"` comme un choix classique.

**Reset** : `player` est réinitialisé avec l'ensemble stats/flags dans `startEngine()` et dans le handler du bouton "Recommencer" ; `currentNodeId` repart sur `"creation-personnage"` (pas `"intro"`) au clic sur "Recommencer", pour repasser par la création à chaque partie.

## Générateur de noms

Nouveau fichier `names.ts` : deux listes statiques de prénoms à consonance pirate/One Piece, `PIRATE_NAMES_HOMME` et `PIRATE_NAMES_FEMME`, avec une fonction `pickRandomName(gender: Gender): string`.

## Templating pour genre/prénom/espèce

Nouvelle fonction `resolvePlayerText(text: string, player: Player): string`, appliquée après `resolveText(flags)` sur le résultat de `StoryNode.text` et sur `Choice.text`/`Choice.sub`, avant affichage. Trois formes de placeholder reconnues :

- `{prenom}` → `player.name`
- `{motM/motF}` → `motM` si `player.gender === "homme"`, `motF` sinon (ex. `{prêt/prête}`, `{sûr/sûre}`)
- `{espece}` → le nom de l'espèce accordé au genre, via une table `SPECIES_LABELS: Record<SpeciesId, { m: string; f: string }>` (ex. `{ m: "Géant", f: "Géante" }`)

Ce mécanisme s'applique uniformément que le texte source soit une string littérale ou le résultat d'une des 8 fonctions `(flags) => string` déjà présentes dans `story.ts` — la substitution opère sur la string finale, sans toucher à la logique conditionnelle sur les flags.

## Contenu

Reprise des 34 nœuds + choix existants (comme la passe sous-titres ①, décomposée par arc dans le plan) pour introduire des placeholders là où c'est naturel : pas d'obligation d'en mettre un partout, seulement là où un PNJ nommerait le joueur ou où le texte contient un accord genré s'adressant à lui. Le nœud `"creation-personnage"` lui-même et le nœud `"intro"` (immédiatement après) ne référencent pas encore le joueur par son nom dans le texte actuel — le premier usage de `{prenom}`/`{espece}` apparaîtra naturellement dès qu'un PNJ interagit avec le personnage (ex. Shanks dans `"eb-origines"`).

## Tests

- `resolvePlayerText()` : prénom seul, accord seul, espèce seule (par genre), combinaisons multiples dans un même texte, absence de placeholder (texte inchangé), placeholder mal formé laissé tel quel plutôt que planter.
- `validateStoryGraph` étendu : vérifie que le nœud `"creation-personnage"` existe et porte `characterForm: true` ; signale toute accolade `{` non refermée dans un `text`/`sub` (placeholder malformé).
- `pickRandomName()` : retourne toujours une valeur non vide, respecte la liste correspondant au genre demandé.
- Tests d'intégration du formulaire (dans le style des tests moteur existants) : bouton "Embarquer" désactivé/activé selon l'état du formulaire, bouton dé désactivé tant que le genre n'est pas choisi, reset de `player` et retour à `"creation-personnage"` au clic sur "Recommencer".

## Hors scope

- Bonus de stats de départ par espèce — étape 2, chantier séparé.
- Branches narratives dédiées par espèce — étape 3, chantier séparé, le plus gros des trois.
- Fiche "Dead or Alive" (③) et refonte des choix à 4 branches (④) — inchangés depuis le 2026-08-21.
- Illustrations SVG — toujours hors scope (cf. spec du 2026-08-19).
- Genre "neutre"/troisième option, espèces additionnelles (Nain, Mink...) — écartés lors du brainstorming pour maîtriser le scope de cette étape.
