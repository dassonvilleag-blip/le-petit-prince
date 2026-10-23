# Contenu du mode « Vivre Card »

Une vie tirée au hasard dans le monde de One Piece, vécue année par année jusqu'à la mort
(inspiré de 1in8b.life). Le joueur est **un anonyme à côté de l'Histoire**, jamais Luffy.
Le moteur (`../moteur.ts`) tire chaque année 1 à 3 événements **éligibles** (conditions)
selon leur **poids** et les joue. Un événement à **choix** ne met le jeu en pause que s'il pèse
(`bascule`, changement de camp/métier/rêve, fruit, mort, amour, voyage… ou `tension` ≥ 4), et pas plus
d'une fois tous les 3 ans ; sinon la vie tranche toute seule selon son cap. Les actions que le joueur
lance ou règle en habitude (travail, voyage, banquet…) sont dans `../actions.ts`.

Les types font foi : `../types.ts`. Ce fichier explique comment écrire.

## 1. Les fichiers et qui écrit quoi

Chaque fichier exporte les tableaux qu'il veut : `evenements`, `histoire`, `fruits`, `morts`,
`rencontres`, `secrets`, `titres`, `repliques`, `pauses`, `reliques`. `index.ts` les rassemble.

| Fichier | Préfixe d'id | Sujet |
|---|---|---|
| `enfance.ts` | `enf-` | 0-15 ans, partout. Le rêve (vers 7 ans). Les enfances canon (Ohara, Grey Terminal, Fuchsia…). |
| `pirates.ts` | `pir-` | Devenir pirate, la vie à bord, capitaine, primes, Grand Line, Nouveau Monde, Supernova, Empereurs. |
| `marine.ts` | `mar-` | Marine (recrue → amiral), Cipher Pol, chasseurs de primes. |
| `civils.ts` | `civ-` | Les métiers (pêcheur, cuisinier, charpentier, forgeron, médecin, archéologue, navigateur, marchand, journaliste…), la vie quotidienne, la vieillesse ordinaire. |
| `factions.ts` | `fac-` | Révolution, pègre, esclavage, Dragons Célestes, noblesse, peuples (Minks, Hommes-Poissons, Géants, ciel, Kuja, Wano), Impel Down. |
| `histoire.ts` | `his-` | La frise de l'Histoire (`histoire`) + les événements « vécus » sur place + le futur après 1524. |
| `pouvoirs.ts` | `pou-` | `fruits` (la liste), trouver/voler/manger un fruit, le Haki, les sabres, les styles, les combats, les primes. |
| `liens.ts` | `lie-` | Équipage, amour, mariage, enfants, parents, frères de sang, mentors, rivaux, croisements avec les 4 jumeaux, deuils, vieillesse, Volonté héritée (`volonte-*`). |
| `legendes.ts` | `leg-` | `secrets`, `titres` de fin, `repliques` de la Tenancière, `reliques`, Ponéglyphes, Laugh Tale, le D. |
| `base.ts` | — | Les morts de base, les pauses par défaut (ne pas toucher). |

**Règles de cohabitation**
- On n'écrit **que dans son fichier**. Pas de `suite`/`planifier` vers l'id d'un autre fichier.
- On communique entre fichiers par les **drapeaux partagés** (§5) : un fichier pose `reve-de-mer`, un autre le lit.
- `rencontres` et `morts` peuvent être redéclarées dans plusieurs fichiers (même id = même entrée, dédoublonnée).

## 2. Un événement

```ts
{
  id: "pir-premiere-prime",          // préfixe du fichier, en kebab-case
  quand: { camp: ["pirate"], age: [16, 40], prime: [0, 0] },   // éligibilité (voir §4)
  poids: 10,                          // défaut 10 ; 30 = fréquent, 3 = rare
  rarete: "peu-commun",               // commun ×1 · peu-commun ×0,4 · rare ×0,1 · tres-rare ×0,025 · legendaire ×0,006
  repetable: 5,                       // absent = une fois par vie ; sinon délai minimal en années
  tension: 3,                         // 0 calme … 5 climax (marque la grille de vie)
  titre: "Votre visage sur un mur",   // affiché en tête de la carte de décision / du récit
  texte: "Un marin vous tend un papier encore humide. C'est vous, en plus laid.",   // ou un tableau de variantes
  effets: { prime: 5_000_000 },       // appliqués dès que l'événement est joué
  choix: [                            // optionnel : met le jeu en pause
    { label: "Le clouer au mur de la cabine", effets: { jauges: { equipage: 3 } }, texte: "L'équipage rit pendant une semaine." },
    { label: "Le brûler", effets: { jauges: { haki: 1 } } },
    { label: "Défier le chasseur qui le brandit", test: { jauge: "pc", difficulte: 30,
        reussite: { texte: "Il repart à la nage.", effets: { prime: 2_000_000 } },
        echec: { texte: "Il vous laisse une cicatrice.", effets: { blessure: "cicatrice-joue", sante: -10 } } } },
  ],
  clinOeil: { id: "prime-photo-ratee", ref: "La prime de Sanji et son portrait raté", arc: "Enies Lobby" },
  bascule: true,                      // optionnel : « Ce choix changera votre vie » (moments irréversibles)
  rencontre: "sanji",                 // optionnel : personnage canon croisé (déclaré dans `rencontres`)
}
```

- `pool: "chaine"` : l'événement n'est **jamais tiré au hasard** ; on y arrive par `suite` (enchaînement
  immédiat), `planifier` (dans N années, conditions revérifiées) ou par la frise (`vecu`).
- Un **test** compare une jauge (+ un aléa gaussien σ=12) à la difficulté. `"pc"` = puissance de combat
  (≈ force×0,6 + haki×0,4 + fruit + Haki éveillés), `"chance"` = 50. Repères de difficulté : 20 facile,
  40 sérieux, 60 très dur, 80 héroïque, 95 quasi impossible.
- `auto` sur un choix : poids pour le mode automatique (0 = jamais choisi en auto).

## 3. Le texte

- **Au « vous »**, sobre, au présent ou au passé composé. **2 à 3 phrases, 300 caractères max.** Pas de point
  d'exclamation dans la narration (seulement dans les répliques). Pas niais : la grandeur dans les petites choses.
- Accords : `{m/f}` sur la vie (`{né/née}`, `{il/elle}`), `{ami:m/f}` sur un lien (`{rival:il/elle}`).
- Variables : `{prenom} {nom} {famille} {ile} {aIle} {deIle} {ileNatale} {aIleNatale} {deIleNatale} {zone}
  {annee} {age} {ami} {rival} {amour} {conjoint} {mentor} {capitaine} {compagnon} {enfant} {frere} {mere}
  {pere} {jumeau} {equipage} {navire} {fruit} {prime} {surnom} {peuple} {metier} {grade}`.
  - `{ile}` peut être « le village de Tamaris » : écrire **`{aIle}`** (« au village de Tamaris ») et
    **`{deIle}`** (« du village de Tamaris ») au lieu de « à {ile} » / « de {ile} ».
  - `{compagnon}` = un membre d'équipage vivant tiré au hasard (pensez `quand: { lien: { compagnon: true } }`).
  - `{jumeau}` = l'une des 4 vies nées à la même seconde, trouvée par `quand.jumeau` (voir §4).
- **Clins d'œil** : beaucoup, mais subtils. Le joueur doit **reconnaître** (un chapeau de paille, une jambe de
  bois, un rire « Zehahaha »), pas lire un nom en majuscules. Une réplique canon courte maximum par
  événement, en situation, paraphrasée (VF Glénat de mémoire). Chaque clin d'œil a un `clinOeil` avec un id
  unique et une `ref` qui explique la référence (elle s'affiche quand le joueur la découvre).
- **Inviolabilité du canon** : un personnage canon ne meurt, ne perd, ne change de camp que comme dans le
  canon. Le joueur est témoin, figurant, victime collatérale, celui qui tient la porte. Il peut atteindre
  les sommets (Empereur, Amiral, Roi des Pirates) mais seulement par des chemins ultra-rares, de préférence
  dans le futur (après 1524) ou sur des sièges vacants.

## 4. Les conditions (`quand`, `si`)

Âges à l'échelle humaine (le moteur ramène l'âge d'un géant). Tout est optionnel ; tout doit être vrai.

`age:[min,max]` · `annee:[min,max]` (calendrier Kaien) · `zone:[...]` / `pasZone` · `ile:[...]` · `ileTag:[...]`
· `peuple` · `sexe:"h"|"f"` · `classe` · `camp` / `pasCamp` · `grade:[...]` · `rangMin` / `rangMax` (rang dans le
camp) · `metier` / `pasMetier` / `sansMetier` · `reve` / `reveAccompli` · `d` · `fruit` / `fruitType` / `fruitId` /
`fruitEnPoche` · `haki:[...]` / `pasHaki` · `jauges:{force: 40}` (minimum) ou `{force:[10,30]}` · `prime` ·
`sante` · `flags` / `pasFlags` / `unFlag` · `compteurs:{merite: 30}` · `lien:{rival:true, conjoint:false}` ·
`trait:[...]` · `meta:{flags, viesMin}` · `monde:[...]` · `jumeau:{memeZone, memeIle, camp, pasCamp, primeMin, vivant}`
· combinateurs `tous`, `un`, `non`.

**Toujours borner l'âge** des événements tirables. Un événement sans `quand` est tiré n'importe quand.

## 5. Les drapeaux partagés (le vocabulaire commun)

Posés par le moteur (ne pas les poser à la main, mais on peut les lire) :
`camp:<camp>` (a été dans ce camp) · `grade:<id>` · `metier:<m>` · `reve:<r>` · `zone:<z>` · `ile:<id>` ·
`fruit` · `fruit:<id>` · `ne-nage-plus` · `haki:<type>` · `lien:<role>` (a eu ce lien) · `deuil:<role>` · `blessure:<x>` ·
`recherche` (a eu une prime) · `orphelin` · `porte-le-d` · `d-revele` · `graine-du-roi` · `ne-en-mer` ·
`reve-accompli` · `poneglyphe:<n>` · `volonte:<type>` · `objet:<id>` (relique portée, à poser soi-même).

Vocabulaire commun (à poser/lire entre fichiers, **et seulement ceux-là** pour les échanges) :

| Drapeau | Sens | Posé surtout par |
|---|---|---|
| `reve-choisi` | le rêve d'enfance a été dit | enfance |
| `reve-de-mer` | veut prendre la mer | enfance, civils |
| `a-quitte-son-ile` | a quitté son île natale | tous |
| `en-mer` | vit en mer (marin, pirate, Marine embarquée) | pirates, marine, civils |
| `sait-lire` / `illettre` | | enfance |
| `lit-poneglyphes` | sait lire les Ponéglyphes | legendes, factions (Ohara) |
| `mentor-haki`, `mentor-epee`, `mentor-medecine`, `mentor-savoir` | a eu un maître | tous |
| `a-tue` | a tué quelqu'un | tous |
| `prisonnier` | en prison en ce moment (retirer à la sortie) | marine, factions |
| `evade` | s'est évadé | factions |
| `invalide` | blessure qui interdit le combat | tous |
| `retraite` | a pris sa retraite | tous |
| `marie` | marié | liens |
| `parent` | a eu un enfant | liens |
| `capitaine-de-son-equipage` | a fondé son propre équipage | pirates |
| `pavillon-empereur` | sert sous le pavillon d'un Empereur | pirates |
| `a-vu-roger` | était à l'exécution de Roger | histoire |
| `rescape-ohara` | a survécu au Buster Call | histoire, enfance |
| `marque-esclave` / `marque-soleil` | | factions |
| `trahison` | a trahi les siens | tous |
| `promesse` | a fait une promesse importante (texte libre dans l'événement) | tous |
| `laugh-tale` | a atteint Laugh Tale | legendes |
| `voix-de-toute-chose` | entend la Voix de toute chose (aussi le trait du même nom) | pouvoirs, legendes |
| `volonte-royale` | a résisté à un Haki des rois (prérequis du sien) | histoire, pouvoirs |
| `doctrine-absolue` / `doctrine-morale` | doctrine marquée (Marine, CP) | marine |

Compteurs partagés : `merite` (carrière Marine/CP/révolution/pègre), `doctrine` (−10 morale … +10 absolue),
`banquets`, `combats-gagnes`, `vies-sauvees`, `mensonges`.

**Changer de camp** : `effets: { camp: "pirate" }` (pose le grade d'entrée). Monter : `promotion: true`
(sauf grades à siège : `supernova`, `grand-corsaire`, `commandant-empereur`, `empereur`, `roi-des-pirates`,
`amiral`, `amiral-en-chef`, `cp0`, `commandant-revolution`, `chasseur-legende`, `courtier`, qu'on donne avec
`grade: "<id>"`). Grades : voir `../monde.ts`. Métier : `metier: "cuisinier"`. Voyager : `aller: { zone: "paradis" }`
(île tirée dans la zone), `aller: { ile: "water-seven" }`, `aller: { tag: "base-marine" }`. Les îles : `../monde.ts`.

## 6. La chronologie de référence (Kaien ; Luffy prend la mer en 1522 = « an 0 »)

1447 naissance de Roger · ~1480 équipage de Rocks (Hachinosu) · **1486 God Valley** · 1497 Edd War · 1498 Roger contre
Barbe Blanche, trois jours · 1499 Roger atteint Laugh Tale, dissout l'équipage ; Oden rentre à Wano · **1500 exécution de
Roger à Loguetown, début de la Grande Ère** · 1500-1502 la Marine traque l'enfant de Roger (Baterilla) · 1501 Kaido écrase
l'équipage de Moria · **1502 Buster Call sur Ohara**, naissance d'Ace ; fondation de l'Armée révolutionnaire (≈) ·
**1504 Oden bouilli vif ; Wano fermé jusqu'en 1524** · 1505 naissance de Luffy · **1508 chute de Flevance** ·
**1509 Fisher Tiger libère les esclaves de Marie-Joie** · 1511 mort de Corazon (Minion) · **1512 incendie du Grey
Terminal ; Shanks perd son bras à Fuchsia ; mort de Fisher Tiger** · 1513 mort de Kuina ; Arlong libéré ·
**1514 Arlong prend Cocoyashi ; Doflamingo prend Dressrosa ; Otohime assassinée** · ~1515 Hiluluk meurt (Drum) ·
1519 Ace prend la mer · **1522 : Luffy part (févr.), Arlong Park, Alabasta, Skypiea, Water Seven, Enies Lobby, Thriller
Bark, Sabaody (un Dragon Céleste frappé), Impel Down, Marineford (mort d'Ace et de Barbe Blanche), Barbe Noire vole le
fruit du Séisme ; début de l'ellipse** · 1523 Barbe Noire devient Empereur · **1524 : île des Hommes-Poissons, Punk Hazard,
Dressrosa (chute de Doflamingo), Zou, Whole Cake, Rêverie (abolition des Grands Corsaires), Wano (chute de Kaido et Big
Mom ; Wano s'ouvre), Cross Guild, Lulusia rayée de la carte, Egghead (diffusion de Vegapunk), Elbaf** · après 1524 :
**projection** (« une possibilité parmi d'autres »), selon le monde tiré : `aube`, `siecle-noir`, `deluge`,
`restauration`, `mille-pavillons`, `rire` (voir `../monde.ts`).

## 7. Identifiants communs des personnages canon (`rencontres`)

Déclarez ceux que vous utilisez : `{ id, nom, description }` (description courte, sans spoiler inutile).
Ids à réutiliser tels quels : `luffy zoro nami usopp sanji chopper robin franky brook jinbe shanks roger rayleigh
barbe-blanche ace sabo dragon garp sengoku akainu aokiji kizaru fujitora ryokugyu koby helmeppo smoker tashigi
hina mihawk crocodile doflamingo kuma hancock buggy kaido big-mom barbe-noire marco oden toki yamato kid law
vivi cobra iceburg tom zeff kuina koshiro bellemere genzo nojiko arlong hiluluk kureha fisher-tiger otohime
saul clover vegapunk ivankov bon-clay magellan crocus laboon morgans shakky rouge makino dadan enel wyper
gan-fall noland cricket bellamy moria perona kizaru shiki rocks kozuki-momonosuke kinemon hiyori orochi
inuarashi nekomamushi carrot pedro caesar monet vergo corazon wapol dalton dorry brogy loki harald`.

## 8. Vérifier son travail

```
node --experimental-strip-types outils/vie-rapport.ts 0 <prefixe>     # erreurs de son fichier (doit être 0)
node --experimental-strip-types outils/vie-rapport.ts 400             # 400 vies simulées : fréquences, jamais vus
node --experimental-strip-types outils/vie-rapport.ts 1 --vie 42      # raconte une vie entière
```
Les autres fichiers sont écrits en même temps par d'autres : si une erreur ne vient pas de votre préfixe,
ignorez-la. Visez **0 erreur** sur votre préfixe, et que vos événements tirables soient **vus** dans la
simulation (sinon les conditions sont trop strictes ou le poids trop faible).
