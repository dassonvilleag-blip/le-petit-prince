# Château — bac à sable de construction 3D (v1)

*Document de conception — 2026-08-04.*

## Contexte

Nouveau mini-jeu pour le hub `le-petit-prince` (façon neal.fun). Tous les jeux existants
sont en Canvas 2D, zéro dépendance à l'exécution. Celui-ci est le premier jeu 3D du site
et introduit Three.js comme dépendance.

## Concept

Un bac à sable de construction de château, vu uniquement de l'extérieur (pas de mode
intérieur/pièces). Pas d'objectif, pas de score, pas de fin de partie : pure construction
libre, dans l'esprit "petit prince" du reste du hub (une expérience contemplative plutôt
qu'un jeu à but).

## Portée v1

- Un seul joueur, une seule parcelle par partie
- Terrain modelable (relief : colline, douves/eau)
- Construction libre par pièces génériques combinables (pas un catalogue de préfabriqués
  du genre "tour complète", mais des éléments de base : mur, toit, pilier...)
- Personnalisation des matériaux/couleurs par pièce
- Caméra en orbite, contrôles souris/desktop
- Sauvegarde locale (`localStorage`)

## Hors scope v1

- Tactile / mobile (contrôles desktop uniquement pour cette version)
- Partage, galerie, multijoueur
- Intérieur des bâtiments
- Score, objectifs, progression, saisons/météo
- Réplication de l'algorithme de lissage de coins de Townscaper ou d'un rendu
  photoréaliste poussé (voir "Références et limites" ci-dessous)

## Références et limites (pour cadrer les attentes)

Deux références ont été évoquées en discussion et écartées explicitement :

- **Photoréalisme poussé** (type visualisation d'architecture) : écarté — demanderait des
  modèles très détaillés et une chaîne d'assets 3D immature comparée au pipeline 2D déjà
  utilisé sur le site pour Ça coûte combien.
- **Rendu Townscaper à l'identique** : écarté — Townscaper repose sur un algorithme
  propriétaire de lissage/arrondi de coins et d'harmonisation des couleurs, développé sur
  plusieurs années par un spécialiste de génération procédurale. Hors de portée d'une v1
  solo.

La barre visée est intermédiaire : **"réaliste tangible"** — matières et lumière crédibles
(PBR), géométrie modérément détaillée, un résultat qui a l'air fini et cohérent sans
viser le photoréalisme ni un algorithme de rendu sur mesure.

## Approche technique

**Géométrie procédurale + textures PBR réelles.** Les pièces sont générées à partir de
primitives (boîtes, cylindres, formes extrudées), pas de modèles 3D importés. Le réalisme
vient des textures (PBR gratuites/CC0, type PolyHaven — pierre, brique, bois, ardoise,
tuile) et de l'éclairage, pas du détail géométrique. Ça évite deux problèmes : dépendre
d'un kit de modèles tiers incomplet ou trop stylisé, et un chantier de modélisation sur
mesure hors de portée d'une v1 solo.

Approches écartées :
- *Kit de modèles 3D tout fait (Kenney/Quaternius)* : soit low-poly stylisé (retour au
  style écarté en amont), soit pensé "préfabriqués" plutôt que "pièces combinables
  librement" — ne correspond pas à la mécanique de construction voulue.
- *Modélisation sur mesure d'un kit dédié* : meilleur résultat possible, mais chantier
  d'art 3D avant même de commencer le code — hors scope solo.

## Terrain

Grille de hauteurs (heightmap) éditable : le joueur monte/creuse des cellules pour
façonner colline, plateau, douves. Un plan d'eau (shader simple, légère réflexion) occupe
automatiquement les creux sous un niveau donné — pas de simulation hydraulique, juste un
niveau d'eau fixe par rapport au terrain.

## Système de construction

Pièces génériques posées sur une grille 3D alignée au terrain, avec accroche automatique
aux points d'ancrage (coin de mur, bord de toit, sommet de tour) pour garantir un
assemblage toujours cohérent visuellement, même sans compétence de construction de la
part du joueur.

Catalogue de pièces v1 :

- **Structure** : mur plein, mur avec ouverture (porte/fenêtre), pilier/colonne,
  sol/plateforme
- **Toiture** : pan de toit incliné, faîtage, tourelle conique
- **Verticalité** : tour ronde, tour carrée, escalier extérieur
- **Décor** : créneau, pont-levis, grille/herse, quelques éléments (torche, blason,
  plante grimpante)

## Personnalisation

Chaque pièce propose une palette de 4 à 6 matériaux/teintes prédéfinis (pierre claire,
pierre sombre, brique, bois, ardoise, tuile terre cuite), appliqués via les textures PBR
choisies pour cette pièce. Pas de color picker libre : la palette bornée garantit un
résultat toujours cohérent.

## Rendu & éclairage

Three.js, `MeshStandardMaterial` (PBR). Un soleil directionnel (ombres portées) + une
lumière ambiante douce pour éviter les zones totalement noires. Ciel en dégradé simple
(pas de skybox photo, pour garder le poids de page raisonnable).

## Caméra & contrôles

Orbite autour du centre de la parcelle : glisser pour tourner, molette pour zoomer.
Desktop/souris uniquement pour cette v1. Palette de pièces affichée sur le côté ; clic
pour sélectionner une pièce, survol de la grille pour prévisualiser le placement (avec
accroche), clic pour poser. Une touche permet de faire pivoter la pièce sélectionnée
avant la pose.

## Sauvegarde

`localStorage` uniquement. Un objet JSON décrit :
- le heightmap du terrain (grille de hauteurs)
- la liste des pièces posées (type, position sur la grille, rotation, matériau choisi)

Un bouton "recommencer" vide la sauvegarde et réinitialise la parcelle. Pas de serveur,
pas de compte, pas de partage en v1.

## Gestion des erreurs / cas limites

- Pose invalide (pièce hors parcelle, chevauchement non permis par les points d'ancrage) :
  la pièce fantôme de prévisualisation s'affiche en rouge et le clic est ignoré.
- Terrain : les cellules ne peuvent pas descendre sous un niveau plancher fixe (évite un
  trou infini) ni monter au-delà d'un plafond fixe (évite un pic dégénéré qui casserait la
  lisibilité de la grille de construction).
- Sauvegarde corrompue/absente au chargement : la parcelle démarre vide plutôt que de
  planter.

## Tests

Pas de framework de test existant sur le site pour les autres jeux (vérification manuelle
en jouant). On garde la même approche : vérification manuelle du parcours (modeler le
terrain, poser/pivoter/retirer des pièces de chaque catégorie, changer un matériau,
recharger la page pour vérifier la persistance, "recommencer").

---

*Prochaine étape : plan d'implémentation détaillé (superpowers:writing-plans).*
