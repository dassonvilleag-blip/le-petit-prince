# Conception : le jeu mobile qu'on va vendre

*Document de travail — 2026-08-04. Objectif : choisir et cadrer un jeu pensé mobile
dès le premier jour, monétisable, réaliste pour une toute petite équipe.*

---

## 1. Ce qui se vend vraiment sur mobile (état du terrain)

Trois modèles économiques réalistes pour nous :

| Modèle | Ce que ça demande | Exemples | Verdict pour nous |
|---|---|---|---|
| **F2P + pubs (rewarded)** | Boucle courte ultra-claire, rétention D1 > 35 %, sessions 30 s–3 min | Tiny Fishing, Block Blast, Higher Lower Game | ✅ Le plus accessible : pas de serveur de paiement, AdMob suffit |
| **F2P + IAP légers** | Meta-progression + collection + « no ads » | Hooked Inc, Suika clones | ✅ En complément des pubs |
| **Premium (3–8 €)** | Une identité forte, de la presse/bouche-à-oreille, un jeu « fini » | Monument Valley, Balatro, Papers Please | ⚠️ Marché étroit, mais marges saines — viable seulement avec un concept à forte personnalité |

Réalités à garder en tête :
- **L'hypercasual pur est mort** (coûts d'acquisition > revenus). Ce qui marche : l'« hybrid casual » — une boucle simple + une meta de collection/progression qui retient.
- Un petit jeu ne perce pas par la pub payante : il perce par **le format viral** (streamable, défiable entre amis) ou **le charme** (presse, features stores).
- Notre force unique : une **chaîne de production d'assets générés** (décors, sprites, 248 objets illustrés) + un ton comique déjà rodé + un site qui sert de **banc d'essai gratuit** avant le store.

---

## 2. Concepts à copier sans honte (ils ont fait leurs preuves)

1. **Tiny Fishing** (web/mobile, un des mini-jeux les plus joués au monde) — on lance la ligne, on descend, on attrape un maximum de poissons À LA REMONTÉE, on vend, on améliore (profondeur, hameçons, valeur). Session de 30 secondes, compulsion immédiate.
2. **The Higher Lower Game** (viral 2016, toujours vivant) — « ce truc est-il plus recherché que cet autre ? », série jusqu'à l'erreur. Format streamable par excellence.
3. **Suika Game** — merge physique. *Déjà prototypé chez nous (l'Aquarium abyssal), mais marché inondé de clones depuis 2023 : on garde en web, pas en cheval mobile.*
4. **Balatro / Luck be a Landlord** — roguelite de deck/synergies, premium. Marges superbes, mais équilibrage = des mois.
5. **Papers, Please** — le « jeu de guichet » narratif premium. La presse adore, scope d'écriture élevé.
6. **Hooked Inc / idle fishing** — la couche idle/collection qui transforme un mini-jeu en jeu qui retient 30 jours.

---

## 3. Nos cinq pistes, filtrées par nos forces

### 🥇 Piste A — « Abysse » : le Tiny Fishing qu'on possède déjà
- **Pitch** : la pêche abyssale, refaite mobile-native. Lancer d'une main, descendre le plus profond possible en évitant les créatures, puis **tout attraper à la remontée** (l'inversion Tiny Fishing : la remontée devient la récolte, pas l'esquive). Vendre, améliorer, replonger.
- **Ce qu'on copie** : la boucle Tiny Fishing (prouvée à l'échelle mondiale) + la meta Hooked Inc (bestiaire, zones, revenus hors-ligne).
- **Ce qu'on ajoute (notre signature)** : les créatures absurdes avec leurs fiches façon « anecdotes de prix » (la Chaussette originelle…), le ton, la DA générée cohérente.
- **Monétisation** : rewarded ads (gains ×2, plongée bonus), IAP « no ads » 3,99 €, skins de ligne/bateau.
- **Pourquoi nous** : l'univers existe, Angelo aime la boucle d'origine (une plongée/une prise = à réconcilier avec la récolte en remontée à valider en prototype), le site teste gratuitement.
- **Risques** : clones nombreux → le charme et la collection font la différence ; il faut accepter une boucle légèrement différente du jeu web.

### 🥈 Piste B — « Plus cher ou moins cher ? » : le Higher/Lower des prix
- **Pitch** : deux objets illustrés, « lequel coûte plus cher ? ». Swipe, série jusqu'à l'erreur, records, défis quotidiens, duels entre amis.
- **Ce qu'on copie** : The Higher Lower Game, le « daily » façon Wordle.
- **Notre atout déloyal** : la base de **248 objets illustrés + anecdotes** existe déjà, extensible à volonté par génération ; les salons multijoueurs sont déjà codés.
- **Monétisation** : interstitiels espacés + rewarded « seconde chance » + packs thématiques (luxe, bouffe, espace…).
- **Effort** : le plus petit des cinq — 2 à 3 semaines de prototype. Excellent premier lancement pour apprendre les stores/la pub.
- **Risques** : clonable en un week-end, rétention fragile sans le daily et les duels.

### Piste C — « Le Douanier d'Ormuz » : Papers Please satirique
- Tamponner des cargaisons absurdes au détroit, dans l'univers mini-mondes. Premium 4,99 €. Fort potentiel presse, mais scope écriture/contenu important. À garder pour un « deuxième jeu » avec plus de moyens.

### Piste D — Roguelite de poche (Balatro-like)
- Le plafond le plus haut, le risque le plus haut (équilibrage). Pas pour un premier lancement commercial.

### Piste E — Compagnon lofi (Spirit City-like)
- La Promenade en produit de productivité (pomodoro, sons, décor qu'on habite). C'est un *produit* plus qu'un jeu — piste sérieuse mais différente ; à réévaluer plus tard.

---

## 4. Recommandation : lancer A avec B en éclaireur

**Stratégie deux temps :**
1. **« Plus cher ou moins cher ? » d'abord** (3 semaines) : il réutilise 90 % d'existant, il nous apprend TOUT le pipeline mobile (stores, AdMob, analytics, ASO) avec un risque minuscule, et son format viral peut amener des joueurs vers le reste.
2. **« Abysse » ensuite** (2-3 mois) : le vrai cheval commercial, prototypé d'abord sur le site (l'Atelier) pour valider la boucle inversée avant d'investir le portage.

**Stack de portage** — décision à prendre :
- **Capacitor (WebView autour de notre canvas)** : on garde 100 % du code web, AdMob s'intègre, parfait pour B et suffisant pour A. Time-to-store minimal.
- **Unity** : meilleur pour le très long terme (perfs, plugins, consoles), mais tout est à réécrire. À réserver au moment où un jeu a prouvé son marché.
→ Proposition : **Capacitor pour les deux premiers lancements**, Unity seulement si un jeu décolle.

---

## 5. Mini-GDD — « Plus cher ou moins cher ? » (l'éclaireur)

- **Core loop (10 s)** : objet A (prix affiché) vs objet B (prix caché) → swipe ⬆︎ « plus cher » / ⬇︎ « moins cher » → révélation animée (compteur, anecdote une fois sur trois) → série +1 ou game over.
- **Modes** : Série infinie (record) · **Le Daily** (10 duels, même ordre pour tout le monde, partage du score en emojis façon Wordle) · Duel en salon (nos rooms, 2-8 joueurs, même séquence, meilleur streak).
- **Contenu** : base actuelle 248 objets → objectif 400 au lancement (générables), packs thématiques ensuite.
- **Monétisation** : interstitiel toutes les 3 parties perdues · rewarded « seconde chance » (1/partie) · IAP no-ads 2,99 € · packs à 0,99 €.
- **KPI de validation (sur le site d'abord)** : partie moyenne > 8 duels, >30 % des joueurs refont une partie dans la session.
- **Noms candidats** : « Plus cher ?! », « À quel prix ! », « Cash ou Crash », « Le Juste Swipe ».

## 6. Mini-GDD — « Abysse » (le cheval)

- **Core loop (45 s)** : toucher = lancer · descente en slalom (une main, l'hameçon suit le doigt) en ÉVITANT les créatures · au fond (ou sur toucher) la remontée s'inverse : **tout ce qu'on touche est attrapé** · caisse, vente, 2-3 améliorations visibles, replongée.
- **Progression** : profondeur max (le vrai « nombre qui monte ») · nb de prises simultanées · valeur/rareté par zone. Zones : Eaux Claires → Crépusculaire → Minuit → Fosse → l'Origine (on garde nos noms).
- **Meta de rétention** : bestiaire 60+ créatures avec fiches drôles · aquarium-vitrine · une créature « légende » par zone (apparition rare).
- **Offline** : un filet passif qui pêche pendant l'absence (à la Hooked Inc), à collecter en revenant.
- **Monétisation** : rewarded ×2 sur la vente, « plongée profonde » bonus 1/jour, no-ads 3,99 €, skins.
- **Étapes** : proto web de la boucle inversée (1 semaine, dans l'Atelier) → validation Angelo → habillage complet → Capacitor + AdMob → soft launch.

---

*Prochaine décision attendue : valider la stratégie deux temps (ou choisir un seul cheval), et trancher Capacitor vs Unity pour le premier lancement.*
