# Paperasse — design

> Statut : proposé. Brainstorming du 2026-10-15.

## Pitch

Un jeu incrémental narratif façon *Universal Paperclips*, dans l'administration
française. On commence stagiaire à la mairie de Trifouilly-les-Oies avec un
tampon, on finit ministre de la Simplification administrative… et l'univers
entier rempli en trois exemplaires. Le dernier dossier à tamponner est sa
propre demande de départ à la retraite.

Aucun lien avec le livre *Le Petit Prince* (c'est juste le nom du site).

Choix validés :
- **histoire avec une fin**, 4 phases, **3 à 5 h** de jeu, puis « Nouvelle
  carrière » avec un petit bonus ;
- **hors ligne partiel** : les agents et machines continuent (plafond 8 h),
  les projets et les décisions attendent le retour ;
- **style faux Cerfa** : papier, cases, police machine à écrire, tampons rouges
  animés ; l'en-tête change à chaque phase.

## Boucle de base (toute la partie)

Calquée sur la boucle éprouvée de Paperclips (fil → trombones → vente) :

| Paperclips | Paperasse |
|---|---|
| Fil de fer (prix qui fluctue) | **Ramettes de papier** (500 feuilles, prix 14–26 € qui fluctue) |
| Fabriquer un trombone | **Tamponner un dossier** (consomme des feuilles) |
| Stock + prix de vente + demande | **Pile « en attente »** : les usagers déposent des dossiers à un rythme qui dépend du **prix du timbre fiscal** |
| Argent | **Budget** (€) : chaque dossier tamponné rapporte le timbre |
| Marketing | **Affichage en mairie** (notoriété, demande ×1,1 par niveau) |
| Autoclippers / Megaclippers | **Stagiaires** / **Tampons automatiques** puis agents, bureaux… |
| Trust → processeurs / mémoire → opérations | **Galons** → **Réunions** / **Classeurs** → **Notes de service** |
| Projets | **Projets** (coûtent des notes de service, parfois du budget) |

- **Demande** : `dépôts/s = D0 × notoriété × (0,25 € / timbre)^1,2`. Timbre
  réglable par pas de 0,05 € (min 0,05 €).
- **Débit** = clics manuels + agents/machines, limité par la pile et le papier.
- **Délai affiché** = pile / débit (« Délai de traitement : 3 jours »), en
  jours fictifs pour l'humour.
- **Galons** aux paliers de dossiers tamponnés (suite de Fibonacci × 1 000,
  comme le Trust). Chaque galon va au choix dans une **Réunion** (+ vitesse
  de production des notes) ou un **Classeur** (+ plafond de notes).
- **Notes de service** : produites en continu, plafonnées par les classeurs.

Tous les chiffres ci-dessous sont des points de départ, **à caler par un joueur
simulé** (stratégie gloutonne) pour tenir les durées cibles par phase.

## Phase 1 — Stagiaire · Mairie de Trifouilly-les-Oies (~45 min)

En-tête : « RÉPUBLIQUE FRANÇAISE — Mairie de Trifouilly-les-Oies ».

Départ : 0 €, 1 ramette, timbre 0,25 €, pas d'agents. Au début, seuls le
bouton TAMPONNER, le compteur et la pile sont visibles. Le reste apparaît au
fil de la partie, comme dans Paperclips.

Projets (exemples, liste finale en implémentation) :
- *Tampon à double tête* : clic ×2.
- *Café gratuit*, *Tickets resto*, *Promesse d'embauche* : stagiaires +25 %,
  +50 %, +75 %.
- *Recto-verso* : feuilles par dossier ÷2.
- *Commande groupée* : achat automatique des ramettes sous un seuil.
- *Panneau lumineux* : notoriété ×1,5.
- *Tampon dateur* : débloque la machine « Tampon automatique ».
- *Ticket numéroté* : affiche le délai et sert d'humour.
- *Fermeture le mercredi après-midi* : réunions +50 % (plus de temps pour se
  réunir).
- **Concours interne** (fin de phase) : passer chef de bureau.

## Phase 2 — Chef de bureau · Sous-préfecture (~1 h)

Nouvelle mécanique : **inventer des Cerfa**. Chaque Cerfa coûte des notes et
porte un nom généré (« Cerfa n° 12345*02 — Attestation de non-attestation »).
Chaque Cerfa ajoute **+1 pièce justificative par dossier**. Chaque pièce est un
dossier de plus dans la pile et rapporte un timbre : la demande s'auto-alimente.

Contrepartie, la **renonciation** : si le délai dépasse la patience des
usagers, une part d'entre eux abandonne (demande × (1 − renonciation)). Il
faut embaucher pour suivre le rythme de ses propres Cerfa.

Nouvelles unités : *Agent titulaire*, *Bureau* (10 agents d'un coup).

Mini-événement actif : **le Guichet**. De temps en temps, un usager se
présente (« M. Durand veut un acte de naissance sans pièce d'identité »), avec
3 réponses au choix (« Revenez lundi », « Il manque le formulaire B-12 »,
« Accepter »). Selon la réponse, on gagne ou on perd des notes, du budget ou de
la notoriété. Il disparaît au bout de ~30 s, sur le principe du golden cookie.
On écrit 20 à 30 usagers différents.

Projets : *Formulaire en 3 exemplaires*, *Accusé de réception d'accusé de
réception* (+1 pièce gratuite), *Excel 97* (+ notes), *Prime au rendement*,
*Dématérialisation* (débit ×5 mais papier ×3, parce que tout le monde imprime),
**Concours de préfet** (fin de phase).

## Phase 3 — Préfet · France (~1 h 15)

Carte simplifiée des **13 régions**. On **ouvre une préfecture** par région
(budget) : chacune multiplie la demande et ajoute de la capacité.

La **grogne** (0–100 %) remplace la renonciation. Elle monte avec le délai et
le nombre de Cerfa :
- > 50 % : manifestations, demande réduite ;
- 100 % : **grève**, production à 0 jusqu'à une décision (négocier = budget,
  réquisitionner = grogne qui revient plus vite, attendre = 2 min).

Leviers : *Communication gouvernementale* (budget → grogne −), *Numéro vert
surtaxé* (grogne → budget), événements à choix façon Kebab (« Une émission de
télé veut filmer vos guichets »).

Fin de phase : 13 préfectures ouvertes + seuil de dossiers → **Remaniement**.

## Phase 4 — Ministre de la Simplification · L'univers (~45 min)

- Projet *Formulaire de réclamation* : la grogne disparaît et chaque plainte
  devient… un dossier. La boucle bascule (le clin d'œil Paperclips).
- *Simplification* : on fusionne des formulaires deux à deux. Chaque fusion
  crée un formulaire plus long qui rapporte plus.
- Expansion : *Cerfa européen* → *Préfecture de la Lune* → *Guichets
  autonomes auto-réplicants* (les sondes de Paperclips). Un compteur
  « Matière non administrée : 3 × 10⁵⁴ kg » descend : des papeteries
  convertissent la matière en papier, les guichets traitent.
- Quand la matière tombe à 0, il ne reste qu'un dossier : **« Demande de
  départ à la retraite »**. On le tamponne soi-même, à la main. Écran de fin :
  « Dossier classé. », avec les stats de la carrière.

## Nouvelle carrière

Après la fin, bouton « Nouvelle carrière » : la partie repart à zéro avec une
**Médaille du mérite administratif** (+25 % de production par médaille,
cumulable). Les médailles sont affichées dans l'en-tête.

## Hors ligne

Au retour (absence plafonnée à 8 h), on simule l'absence par pas de 1 s avec
la même fonction de tick : dépôts, tampons des agents, papier (si l'achat
automatique est débloqué), notes. Pas de Guichet ni d'événement, et la grogne
est plafonnée à 90 % (jamais de grève hors ligne). Une popup résume l'absence :
« Pendant votre absence : 12 480 dossiers tamponnés, +3 200 € ».

## Interface

- Une seule colonne façon formulaire sur mobile, deux colonnes sur grand écran
  (production à gauche, projets à droite). Chaque bloc ressemble à une
  rubrique de Cerfa : « CADRE 1 — PRODUCTION », « CADRE 2 — BUDGET »…
- Le tampon : gros bouton, gros « TRAITÉ » rouge animé (rotation aléatoire)
  à chaque clic.
- **Journal** (le fil de Paperclips) en haut : messages courts et drôles.
- **Mode discret** sur Échap : faux tableur, comme les autres jeux.
- **Titre d'onglet** : discret par défaut, « ⚠ Grève ! » ou « 🔔 Un usager au
  guichet » quand il le faut.
- Sauvegarde `localStorage` (`paperasse-v1`), toutes les 5 s et sur `pagehide`.
- Polices : machine à écrire (Special Elite ou Courier Prime) + une
  sans-serif administrative pour les en-têtes.

## Technique

- `games/paperasse/index.html` + `src/games/paperasse/`, avec la logique pure
  séparée de l'affichage :
  - `data.ts` : projets, usagers du Guichet, événements, noms de Cerfa ;
  - `eco.ts` : formules (demande, débit, coûts) ;
  - `state.ts` : état, `tick(dt)`, sauvegarde et migration ;
  - `main.ts` : DOM.
- Tests `node --test` sur `eco` et `state` : demande, papier, galons, phases,
  hors ligne, grève.
- Un **joueur simulé** (script de test) qui joue la partie de bout en bout
  pour vérifier les durées par phase et qu'on n'est jamais bloqué.
- Ajout dans `vite.config.ts` (entrée `paperasse`) et une carte sur
  l'accueil.
- Ship : branche `feat/paperasse` → merge `--no-ff` dans `master` → push.

## Hors scope (pour plus tard)

Sons, succès, partage du score, multijoueur.
