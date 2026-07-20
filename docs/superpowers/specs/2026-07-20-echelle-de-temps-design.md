# Échelle de temps — Design

Date : 2026-07-20
Projet : "Le Petit Prince" (nom de code du dossier/dépôt)

## Contexte et objectif

Mini-site inspiré de neal.fun (esprit, pas copie) : une frise interactive qui permet de parcourir, en un seul geste de scroll, l'histoire depuis le Big Bang (il y a ~13,8 milliards d'années) jusqu'à aujourd'hui. Objectif : donner un effet "waouh" immédiat, sans compte, sans menu, sans friction — une seule page.

## Périmètre (v1)

- Une trentaine de repères historiques clés (Big Bang, formation du système solaire, apparition de la vie, dinosaures, humains, écriture, événements historiques marquants, jusqu'à aujourd'hui). Pas de contenu personnel, pas d'exhaustivité recherchée : une courbe lisible plutôt qu'un inventaire.
- Contenu en français.
- Pas d'authentification, pas de backend, pas de base de données.

## Direction artistique

Épurée pastel : fond clair, palette douce de 3-4 couleurs (ex. bleu poudré, corail léger, vert sauge) pour distinguer visuellement les grandes périodes (univers / Terre / vie / humains / histoire écrite), typographie géométrique sans-serif. Ambiance calme et scientifique, à l'opposé d'un thème sombre/cosmique — volontairement différente de la DA de neal.fun pour ne pas copier son style.

## Architecture

Site 100 % statique, vanilla, sans dépendance ni build :

- `index.html` — structure de la page, écran unique
- `style.css` — DA pastel décrite ci-dessus
- `script.js` — logique de scroll horizontal, fonction de mapping non-linéaire, rendu des repères et de l'indicateur de position
- `data.js` — tableau des ~30 repères, séparé du code pour rester facile à enrichir

## Modèle de données

Dans `data.js`, un tableau d'objets :

```js
{
  yearsAgo: 13_800_000_000,
  label: "Big Bang",
  description: "Naissance de l'univers observable"
}
```

Trié par ordre chronologique (du plus ancien au plus récent). `yearsAgo` est la seule donnée numérique utilisée par la fonction de mapping ; `label`/`description` sont du texte libre affiché au survol/tap.

## Navigation et mapping temporel

- **Navigation** : scroll horizontal. La molette verticale (desktop) est convertie en défilement horizontal (`wheel` → `scrollLeft`) ; sur mobile, swipe horizontal natif.
- **Mapping non-linéaire continu** : la position horizontale d'un repère n'est ni strictement linéaire, ni strictement logarithmique par rapport à `yearsAgo`. Une fonction de type puissance (à ajuster empiriquement pendant l'implémentation) donne artificiellement plus d'espace de scroll aux périodes récentes/denses en événements (derniers 10 000 ans), tout en conservant, sur les débuts de la frise, une vraie sensation de traverser des milliards d'années en peu de scroll. Approche inspirée de "The Deep Sea" (neal.fun), qui applique le même principe à la profondeur.
- **Indicateur de position** : un repère textuel discret (ex. "il y a 4,5 milliards d'années"), mis à jour en continu pendant le scroll, pour garder le sens de l'échelle à tout moment.
- **Repères visuels** : chaque événement est un point sur une ligne horizontale centrale ; label au survol (desktop) ou au tap (mobile), description qui apparaît au-dessus ou en dessous selon l'espace disponible.

## Responsive

Sur mobile : scroll horizontal au doigt (swipe), mise en page resserrée, texte des repères tronqué par défaut avec tap pour développer le détail complet.

## Cas limites et robustesse

- **JS désactivé / navigateur très ancien** : message de repli minimal ("active JavaScript pour voir la frise"), pas de version alternative complexe.
- **Redimensionnement de fenêtre** : la position affichée se recalcule à partir du pourcentage de scroll plutôt que de coordonnées pixel absolues, pour ne pas perdre le repère temporel affiché en cas de resize.
- **Performance** : ~30 repères seulement → DOM/CSS classique suffisant, pas besoin de canvas ni de virtualisation.

## Vérification

Pas de suite de tests automatisés (pas de logique métier complexe à tester). Validation manuelle avant mise en ligne :
- scroll fonctionnel à la molette (desktop) et au swipe (mobile)
- repères lisibles à toutes les échelles de la frise
- rendu correct sur mobile et desktop
- page correctement servie une fois déployée sur GitHub Pages

## Hébergement / déploiement

- Dépôt git local initialisé dans `Desktop/Claude Code/Le Petit Prince`.
- Poussé vers un dépôt GitHub (nom à définir, ex. `le-petit-prince`) — **le push initial sera validé explicitement avec l'utilisateur avant d'être effectué**, car il rend le code public.
- GitHub Pages activé sur ce dépôt pour servir le site (`tonpseudo.github.io/le-petit-prince`).
