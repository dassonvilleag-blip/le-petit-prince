# Les Caravanes — la Ravitailleuse

> Statut : codée le 2026-10-05 (branche `feat/les-caravanes-ravitailleuse`).

## Pitch

Aujourd'hui, pour remplir le QG sans y aller soi-même, il faut 📋 Intendant et
une navette ville ↔ QG **par ville**, à installer en faisant d'abord le trajet
à la main. Pour une Tarte au miel (3 villes), il faut donc 3 caravanes.

La **Ravitailleuse** règle ça : on affecte une caravane au QG en un clic, et
elle va chercher toute seule, **dans n'importe quelle ville**, ce qui manque à
la liste 📥 Approvisionnement, puis le dépose au QG. À l'aller, elle emporte ce
que la liste 📤 Écoulement autorise et le vend dans la ville où elle achète.

## Règles

- **Disponible dès l'achat du QG**, sans compétence. Il faut juste une caravane
  qui a un caravanier.
- **Affecter** : depuis l'onglet Caravaniers du QG, sur une caravane à quai et
  vide (au QG, elle dépose d'abord sa cargaison). Elle part tout de suite.
- **Elle achète et elle écoule** : à l'aller, elle emporte du stock selon la
  liste 📤 Écoulement (au-delà du stock gardé) et le vend en ville ; au retour,
  elle rapporte ce qui manque.
- **Pas de prix plafond** en v1 : elle achète au prix du jour.

### Une tournée

1. **Au QG**, elle calcule ce qui manque : pour chaque bien coché, le stock visé
   moins le stock, **moins ce qui est déjà en route vers le QG** (dans
   n'importe quelle caravane, pour que deux ravitailleuses n'achètent pas deux
   fois la même chose). Le tout est plafonné à la place libre de l'entrepôt.
2. Elle choisit **une seule ville**, celle où la tournée rapporte le plus par
   minute d'aller-retour. Pour chaque ville ouverte, on simule :
   - la vente : ✨ Auto sur le stock à écouler, vers cette ville → bénéfice
     (prix de vente − coût moyen). Elle n'emporte que ce qui s'y vend plus cher
     que son coût moyen : pas de revente à perte chez le producteur ;
   - l'achat : ✨ Auto limité à ce qui manque → valeur de référence des biens
     rapportés (on ne les vend pas, c'est leur valeur pour le QG) ;

   puis on divise la somme par la durée QG → ville → QG. Une seule ville par
   tournée, pour que le rangement de la charrette reste simple.
3. **Au départ du QG**, elle charge le stock à écouler pour cette ville (✨ Auto
   sur le stock, comme au comptoir du QG).
4. **À la ville**, elle vend au prix affiché, comme les caravaniers
   (saturation et réputation comprises, bénéfice calculé sur le coût moyen).
   Puis elle recalcule ce qui manque (le stock a pu bouger en route), achète
   avec ✨ Auto limité à ces biens et à la place libre, dans la limite des
   écus, et repart au QG. Si plus rien ne manque, elle rentre à vide.
5. **Au QG**, elle dépose tout et recommence.

Si elle n'a rien à vendre ni à acheter (listes vides, stock gardé atteint,
entrepôt plein, écus à zéro), elle **attend au QG** (« ⏸ Rien à faire ») et
réessaie toutes les 5 min, comme les navettes. Tout ça continue onglet fermé.

### Rappeler

Un bouton **Rappeler** : elle finit son trajet en cours et redevient une
caravane normale à l'arrivée. Au QG, on retrouve le bouton « Tout déposer » ;
en ville, elle est à quai avec ce qu'elle a acheté.

## Interface

- **Onglet Caravaniers du QG** : nouvelle section **🚚 Ravitailleuses** en haut.
  Elle liste les caravanes qui ont un caravanier, avec leur état (en route vers
  🍯 Clos-Vermeil avec 6 pièces à vendre, rentre au QG avec 12 pièces, ⏸ rien
  à faire, libre) et un
  bouton Affecter ou Rappeler. Si la liste 📥 est vide, une ligne le signale.
- La liste 📥 Approvisionnement est **toujours éditable**. Le cadenas 📋
  Intendant ne parle plus que des navettes ville ↔ QG et de l'écoulement.
- **Fiche de la caravane** : badge « 📥 Ravitailleuse » avec son état ; pas de
  comptoir ni de bouton « auto » tant qu'elle est en mission.
- **Pendant ton absence…** : les dépôts et les ventes sont déjà comptés, on
  ajoute les écus dépensés en achats.

## Effet de bord sur l'Intendant

On corrige au passage le calcul de ce qui manque pour les navettes de
l'Intendant : elles aussi déduiront ce qui est déjà en route vers le QG.
Aujourd'hui, deux navettes peuvent acheter chacune le même manque.

**Point ouvert** : la Ravitailleuse fait maintenant tout ce que fait
l'Intendant, sans compétence et sur toutes les villes. Les navettes de
l'Intendant ne gardent qu'un petit avantage : elles rejouent ton rangement
fait à la main. Pour que la compétence garde du sens, on peut la transformer,
par exemple « les ravitailleuses peuvent passer par 2 villes par tournée »
(c'est justement ce qu'on a mis hors v1). À trancher plus tard ; en v1 on ne
touche pas à l'Intendant.

## Notes techniques

- `Caravane.mission?: "ravitaillement" | null`. Sauvegarde compatible (champ
  absent = pas de mission).
- `enService` : une caravane en mission est toujours en service, sans
  Intendant.
- `arriver` / `repartir` : branche dédiée à la mission (choix de la ville et
  chargement du stock au QG, vente puis achat en ville). L'attente réutilise
  `attente` / `navette`.
- `quotaAppro` déduit les cargaisons des caravanes en route vers le QG ;
  plafond de place libre appliqué après `chargementAuto` (on retire les
  dernières pièces qui dépassent).
- Tests dans `test/ravitailleuse.test.ts` : choix de la ville, écoulement
  vendu en ville (stock gardé respecté), pas de double achat entre deux
  caravanes, entrepôt plein, listes vides → attente, rappel, simulation hors
  ligne sur plusieurs heures.

## Hors périmètre v1

Prix plafond (prévu pour une prochaine version), tournées sur plusieurs
villes.
