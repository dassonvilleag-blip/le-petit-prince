// Le Tarot — l'ordinateur. Trois niveaux :
//   facile    : joue « au feeling » — règles simples, sans mémoire, parfois au hasard
//   moyen     : compte les cartes, repère les coupes, charge son partenaire, protège le Petit
//   difficile : simule des dizaines de donnes compatibles avec ce qu'il sait et
//               garde le coup qui rapporte le plus en moyenne (voir ia-mc.ts)
// L'IA ne lit que ce que son siège a le droit de savoir (voir `connaissance`).

import {
  ATOUT,
  EXCUSE,
  PETIT,
  VINGT_ET_UN,
  carteCouleur,
  couleur,
  demiPoints,
  estAtout,
  estBout,
  estRoi,
  rang,
  type Alea,
  type Carte,
} from "./cartes.ts";
import { appelsPossibles, annoncesPossibles, type Donne } from "./donne.ts";
import { choisirCarteMC } from "./ia-mc.ts";
import {
  GARDE,
  GARDE_CONTRE,
  GARDE_SANS,
  PASSE,
  PRISE,
  atoutsPoignee,
  carteDemandee,
  coupsLegaux,
  indexGagnant,
  plusFortAtout,
  poigneePossible,
} from "./regles.ts";

export type Niveau = "facile" | "moyen" | "difficile";
export const NIVEAUX: Niveau[] = ["facile", "moyen", "difficile"];

// ─── ce que sait un siège ────────────────────────────────────────────────────

export interface Connaissance {
  moi: number;
  n: number;
  main: Carte[];
  preneur: number;
  contrat: number;
  /** partenaire du preneur tel que je le connais : -1 seul/aucun, null inconnu */
  partenaire: number | null;
  jouees: Set<Carte>;
  /** vides[j][coul] : j n'a plus de cette couleur (4 = atouts) */
  vides: boolean[][];
  /** plus fort atout que j peut encore avoir (0 : plus d'atout) */
  plafondAtout: number[];
  /** cartes dont je connais l'emplacement : écart (si je l'ai fait), atouts montrés */
  ecartConnu: Carte[] | null;
}

export function connaissance(d: Donne, moi: number): Connaissance {
  const jouees = new Set<Carte>();
  const vides = Array.from({ length: d.n }, () => [false, false, false, false, false]);
  const plafondAtout = new Array(d.n).fill(21);

  const lire = (cartes: Carte[], joueurs: number[]): void => {
    for (let k = 0; k < cartes.length; k++) {
      const c = cartes[k];
      const j = joueurs[k];
      jouees.add(c);
      if (c === EXCUSE || k === 0) continue;
      const demande = carteDemandee(cartes.slice(0, k));
      if (demande < 0) continue;
      const coulDemandee = couleur(demande);
      if (couleur(c) !== coulDemandee) {
        vides[j][coulDemandee] = true;
        if (!estAtout(c)) {
          vides[j][ATOUT] = true; // ni la couleur ni atout
          plafondAtout[j] = 0;
        }
      }
      if (estAtout(c)) {
        const avant = plusFortAtout(cartes.slice(0, k));
        // il n'a pas pu monter : aucun atout au-dessus de `avant`
        if (rang(c) < avant) plafondAtout[j] = Math.min(plafondAtout[j], avant - 1);
      }
    }
  };
  for (const p of d.plis) lire(p.cartes, p.joueurs);
  lire(d.pli.cartes, d.pli.joueurs);

  // à 5, le partenaire reste secret jusqu'à ce que la carte appelée tombe
  let partenaire: number | null = null;
  if (d.n === 4) partenaire = -1;
  else if (d.partenaireRevele) partenaire = d.partenaire;
  else if (moi !== d.preneur && d.mains[moi].includes(d.carteAppelee)) partenaire = moi;
  else if (moi === d.preneur && (d.mains[moi].includes(d.carteAppelee) || (d.contrat <= GARDE && d.ecart.includes(d.carteAppelee))))
    partenaire = -1; // il s'est appelé lui-même

  return {
    moi,
    n: d.n,
    main: d.mains[moi],
    preneur: d.preneur,
    contrat: d.contrat,
    partenaire,
    jouees,
    vides,
    plafondAtout,
    ecartConnu: moi === d.preneur && d.contrat <= GARDE ? d.ecart : null,
  };
}

/** j est-il dans mon camp ? null si je ne peux pas encore le savoir */
export function allie(k: Connaissance, j: number): boolean | null {
  if (j === k.moi) return true;
  const attaque = (x: number): boolean | null => {
    if (x === k.preneur) return true;
    if (k.partenaire === null) return x === k.moi ? false : null;
    return x === k.partenaire;
  };
  const moiAttaque = k.moi === k.preneur || k.partenaire === k.moi;
  // en défense à 5 sans partenaire révélé : je sais au moins que le preneur est adverse
  if (!moiAttaque && k.partenaire === null) return j === k.preneur ? false : null;
  const a = attaque(j);
  return a === null ? null : a === moiAttaque;
}

// ─── enchères ────────────────────────────────────────────────────────────────

/** force d'une main, à l'échelle d'une main de 18 cartes */
export function forceMain(main: readonly Carte[], n: number): number {
  const atouts = main.filter(estAtout);
  const nb = atouts.length;
  let f = 0;
  for (const c of atouts) {
    if (c === VINGT_ET_UN) f += 10;
    else if (c === PETIT) f += nb >= 6 ? 8 : nb >= 4 ? 5 : 1;
    else f += 2 + (rang(c) >= 16 ? 1 : 0);
  }
  if (main.includes(EXCUSE)) f += 7;
  for (let coul = 0; coul < 4; coul++) {
    const cartes = main.filter((c) => !estAtout(c) && c !== EXCUSE && couleur(c) === coul);
    const a = (r: number): boolean => cartes.includes(carteCouleur(coul, r));
    if (a(14)) f += a(13) ? 10 : 6;
    else if (a(13)) f += 3;
    if (a(12)) f += 2;
    if (a(11)) f += 1;
    if (cartes.length >= 5) f += (cartes.length - 4) * 2;
    if (cartes.length === 0) f += nb >= 4 ? 6 : 2;
    else if (cartes.length === 1) f += nb >= 4 ? 3 : 1;
  }
  return n === 5 ? (f * 18) / 15 : f;
}

/**
 * Paliers de force pour prise / garde / garde sans / garde contre, calibrés en
 * simulation : à 4, une main de force 40 gagne une prise sur deux, une de 37
 * un peu moins — on prend quand même, sinon une donne sur deux finit en passe.
 * À 5 le partenaire aide, on prend plus tôt.
 */
const PALIERS: Record<Niveau, number[]> = {
  facile: [37, 50, 999, 999],
  moyen: [37, 46, 58, 66],
  difficile: [37, 45, 56, 64],
};
const DECALAGE_A_5 = 7;

export function choisirAnnonce(d: Donne, j: number, niveau: Niveau, alea: Alea = Math.random): number {
  const possibles = annoncesPossibles(d);
  let f = forceMain(d.mains[j], d.n);
  if (d.n === 5) f += DECALAGE_A_5;
  if (niveau === "facile") f += (alea() - 0.5) * 16;
  if (niveau === "difficile") {
    // le Petit mal protégé est un risque : on le sait, on tempère
    const nb = d.mains[j].filter(estAtout).length;
    if (d.mains[j].includes(PETIT) && nb <= 4) f -= 4;
  }
  const p = PALIERS[niveau];
  let voulu = PASSE;
  if (f >= p[0]) voulu = PRISE;
  if (f >= p[1]) voulu = GARDE;
  if (f >= p[2]) voulu = GARDE_SANS;
  if (f >= p[3]) voulu = GARDE_CONTRE;
  // on ne surenchérit que si l'on veut au moins ce qui est possible
  const ok = possibles.filter((c) => c !== PASSE && c <= voulu);
  return ok.length > 0 ? ok[ok.length - 1] : PASSE;
}

// ─── appel du roi (à 5) ──────────────────────────────────────────────────────

export function choisirAppel(d: Donne, alea: Alea = Math.random): Carte {
  const main = d.mains[d.preneur];
  const possibles = appelsPossibles(main).filter((c) => !main.includes(c));
  const candidats = possibles.length > 0 ? possibles : appelsPossibles(main);
  // appeler dans la couleur où l'on a de quoi soutenir le partenaire (dame, cavalier…)
  let meilleur = candidats[0];
  let score = -Infinity;
  for (const c of candidats) {
    const coul = couleur(c);
    const miennes = main.filter((x) => !estAtout(x) && x !== EXCUSE && couleur(x) === coul);
    const s = miennes.reduce((t, x) => t + demiPoints(x), 0) + miennes.length + alea() * 0.5;
    if (s > score) {
      score = s;
      meilleur = c;
    }
  }
  return meilleur;
}

// ─── écart ───────────────────────────────────────────────────────────────────

/**
 * Écart du preneur : on cherche à se faire des coupes (vider les couleurs
 * courtes sans roi), puis on met au chien les têtes isolées qui risqueraient
 * de tomber chez l'adversaire.
 */
export function choisirEcart(d: Donne): Carte[] {
  const main = d.mains[d.preneur];
  const taille = d.chien.length;
  const ecartables = main.filter((c) => !estAtout(c) && c !== EXCUSE && !estRoi(c));
  const ecart: Carte[] = [];

  const parCouleur = [0, 1, 2, 3].map((coul) => ({
    coul,
    cartes: ecartables.filter((c) => couleur(c) === coul).sort((a, b) => demiPoints(b) - demiPoints(a) || rang(b) - rang(a)),
    roi: main.includes(carteCouleur(coul, 14)),
  }));
  // couleurs sans roi d'abord, des plus courtes aux plus longues
  parCouleur.sort((a, b) => Number(a.roi) - Number(b.roi) || a.cartes.length - b.cartes.length);
  for (const g of parCouleur) {
    if (g.roi || g.cartes.length === 0) continue;
    if (ecart.length + g.cartes.length <= taille) ecart.push(...g.cartes);
  }
  // compléter avec les cartes les plus chères des couleurs restantes (les têtes non protégées)
  const reste = ecartables
    .filter((c) => !ecart.includes(c))
    .sort((a, b) => {
      const longueur = (x: Carte): number => ecartables.filter((y) => couleur(y) === couleur(x)).length;
      return demiPoints(b) - demiPoints(a) || longueur(a) - longueur(b) || rang(a) - rang(b);
    });
  while (ecart.length < taille && reste.length > 0) ecart.push(reste.shift()!);
  // pas assez de cartes « normales » : on écarte les plus petits atouts (hors bouts)
  const atouts = main.filter((c) => estAtout(c) && !estBout(c)).sort((a, b) => rang(a) - rang(b));
  while (ecart.length < taille) ecart.push(atouts.shift()!);
  return ecart;
}

// ─── poignée ─────────────────────────────────────────────────────────────────

/** taille de poignée à annoncer (0 = rien). La prime va au camp gagnant : en défense on se tait. */
export function choisirPoignee(d: Donne, j: number, niveau: Niveau, alea: Alea = Math.random): number {
  const max = poigneePossible(atoutsPoignee(d.mains[j]).length, d.n);
  if (max === 0) return 0;
  if (niveau === "facile") return alea() < 0.7 ? max : 0;
  const attaque = j === d.preneur || d.mains[j].includes(d.carteAppelee);
  return attaque ? max : 0;
}

// ─── jeu de la carte : heuristique ───────────────────────────────────────────

interface Options {
  /** compte les cartes tombées (sinon ne connaît que les cartes « évidentes ») */
  comptage: boolean;
  /** charge le pli d'un partenaire */
  charger: boolean;
}

const OPTIONS: Record<"facile" | "moyen", Options> = {
  facile: { comptage: false, charger: false },
  moyen: { comptage: true, charger: true },
};

/** la carte est-elle maîtresse (plus aucune carte supérieure dehors) ? */
function maitre(c: Carte, k: Connaissance, o: Options): boolean {
  if (c === EXCUSE) return false;
  const coul = couleur(c);
  const haut = coul === ATOUT ? 21 : 14;
  if (!o.comptage) return rang(c) === haut;
  for (let r = rang(c) + 1; r <= haut; r++) {
    const x = coul === ATOUT ? 55 + r : carteCouleur(coul, r);
    if (!k.jouees.has(x) && !k.main.includes(x)) return false;
  }
  return true;
}

/** coût de « donner » une carte : sa valeur, le Petit et les gros atouts comptent plus */
function cout(c: Carte): number {
  if (c === PETIT) return 30;
  if (c === EXCUSE) return 1; // elle revient à son camp
  if (estAtout(c)) return 1.5 + rang(c) / 10;
  return demiPoints(c) + rang(c) / 100;
}

const minPar = (t: Carte[], f: (c: Carte) => number): Carte => t.reduce((m, c) => (f(c) < f(m) ? c : m));
const maxPar = (t: Carte[], f: (c: Carte) => number): Carte => t.reduce((m, c) => (f(c) > f(m) ? c : m));

export function jouerHeuristique(d: Donne, k: Connaissance, o: Options): Carte {
  const legaux = coupsLegaux(k.main, d.pli.cartes);
  if (legaux.length === 1) return legaux[0];
  // l'Excuse ne doit pas rester pour le dernier pli
  if (legaux.includes(EXCUSE) && k.main.length <= 2) return EXCUSE;
  const sansExcuse = legaux.filter((c) => c !== EXCUSE);
  return d.pli.cartes.length === 0 ? entamer(d, k, o, sansExcuse) : suivre(d, k, o, legaux, sansExcuse);
}

function entamer(d: Donne, k: Connaissance, o: Options, legaux: Carte[]): Carte {
  const moiAttaque = k.moi === k.preneur || k.partenaire === k.moi;
  const atouts = legaux.filter(estAtout);
  const couleurs = legaux.filter((c) => !estAtout(c));
  const adversaires = Array.from({ length: k.n }, (_, j) => j).filter((j) => allie(k, j) === false);

  // atouts encore dehors (estimation)
  const atoutsDehors = 21 - [...k.jouees].filter(estAtout).length - atouts.length - (k.ecartConnu?.filter(estAtout).length ?? 0);

  if (k.moi === k.preneur && atouts.length > 0 && atoutsDehors > 0) {
    // le preneur bien armé fait tomber les atouts pour protéger son jeu
    const gros = atouts.filter((c) => c !== PETIT);
    if (gros.length >= Math.ceil(atoutsDehors / 2) + 1 && gros.length > 0) {
      const maitres = gros.filter((c) => maitre(c, k, o));
      return maitres.length > 0 ? maxPar(maitres, rang) : minPar(gros, rang);
    }
  }

  if (couleurs.length > 0) {
    // une carte maîtresse dans une couleur où aucun adversaire n'est connu pour couper
    const sures = couleurs.filter(
      (c) => maitre(c, k, o) && demiPoints(c) >= 5 && !adversaires.some((a) => o.comptage && k.vides[a][couleur(c)] && !k.vides[a][ATOUT]),
    );
    if (sures.length > 0) return maxPar(sures, demiPoints);

    if (!moiAttaque) {
      // en défense : chercher le partenaire caché dans la couleur appelée, sinon
      // faire couper le preneur dans sa couleur courte avec une petite carte
      const appelee = d.carteAppelee >= 0 && k.partenaire === null ? couleur(d.carteAppelee) : -1;
      const dansAppelee = couleurs.filter((c) => couleur(c) === appelee);
      if (dansAppelee.length > 0) return minPar(dansAppelee, cout);
      const coupeParPreneur = couleurs.filter((c) => o.comptage && k.vides[k.preneur][couleur(c)]);
      if (coupeParPreneur.length > 0) return minPar(coupeParPreneur, cout);
    } else if (k.partenaire !== null && k.partenaire >= 0 && k.partenaire !== k.moi) {
      // partenaire du preneur : jouer là où il coupe
      const ouIlCoupe = couleurs.filter((c) => o.comptage && k.vides[k.partenaire as number][couleur(c)]);
      if (ouIlCoupe.length > 0) return minPar(ouIlCoupe, cout);
    }
    // petite carte de sa couleur la plus longue (en attaque : la plus courte, pour se faire une coupe)
    const longueur = (c: Carte): number => couleurs.filter((x) => couleur(x) === couleur(c)).length;
    const petites = couleurs.filter((c) => demiPoints(c) <= 3);
    const pool = petites.length > 0 ? petites : couleurs;
    return minPar(pool, (c) => (moiAttaque ? longueur(c) : -longueur(c)) * 10 + cout(c));
  }
  // que des atouts : le plus petit qui n'est pas le Petit
  const hors = atouts.filter((c) => c !== PETIT);
  return hors.length > 0 ? minPar(hors, rang) : atouts[0] ?? legaux[0];
}

function suivre(d: Donne, k: Connaissance, o: Options, legaux: Carte[], sansExcuse: Carte[]): Carte {
  const pli = d.pli.cartes;
  const iGagnant = indexGagnant(pli);
  const gagnant = d.pli.joueurs[iGagnant];
  const carteGagnante = pli[iGagnant];
  const apres = Array.from({ length: k.n - pli.length - 1 }, (_, i) => (k.moi + 1 + i) % k.n);
  const adversesApres = apres.filter((j) => allie(k, j) !== true);
  const dernier = adversesApres.length === 0;
  const valeurPli = pli.reduce((s, c) => s + (c === EXCUSE ? 0 : demiPoints(c)), 0);
  const entame = carteDemandee(pli);
  const coulDemandee = entame >= 0 ? couleur(entame) : -1;

  const bat = (c: Carte): boolean => c !== EXCUSE && indexGagnant([...pli, c]) === pli.length;
  const gagnants = sansExcuse.filter(bat);

  // le pli est-il assuré pour mon camp ?
  const allieGagne = allie(k, gagnant) === true;
  let assure = allieGagne && dernier;
  if (allieGagne && !dernier && maitre(carteGagnante, k, o)) {
    // une carte de couleur maîtresse peut encore se faire couper
    assure = estAtout(carteGagnante) || (o.comptage && !adversesApres.some((a) => k.vides[a][coulDemandee] && !k.vides[a][ATOUT]));
  }

  if (assure) {
    if (sansExcuse.includes(PETIT)) return PETIT; // le Petit sauvé
    if (!o.charger) return minPar(sansExcuse.length > 0 ? sansExcuse : legaux, cout);
    const nonAtouts = sansExcuse.filter((c) => !estAtout(c));
    if (nonAtouts.length > 0) {
      // charger : la plus grosse carte, sauf un roi qui ferait son pli tout seul plus tard
      const chargeables = nonAtouts.filter((c) => !(estRoi(c) && couleur(c) !== coulDemandee && !k.jouees.has(carteCouleur(couleur(c), 13))));
      return maxPar(chargeables.length > 0 ? chargeables : nonAtouts, demiPoints);
    }
    return minPar(sansExcuse.length > 0 ? sansExcuse : legaux, cout);
  }

  if (gagnants.length > 0) {
    const atoutsGagnants = gagnants.filter(estAtout);
    const couleursGagnantes = gagnants.filter((c) => !estAtout(c));
    if (couleursGagnantes.length > 0) {
      // fournir et monter : la plus forte si elle est sûre, sinon on ne se découvre pas
      const sur = dernier || couleursGagnantes.some((c) => maitre(c, k, o));
      if (sur) return maxPar(couleursGagnantes, (c) => demiPoints(c) * 100 + rang(c));
      if (valeurPli >= 5 || !o.comptage) return maxPar(couleursGagnantes, rang);
    } else if (atoutsGagnants.length > 0) {
      // couper : le Petit seulement s'il ne peut plus être surcoupé
      const petitSur = atoutsGagnants.includes(PETIT) && dernier;
      if (petitSur) return PETIT;
      const hors = atoutsGagnants.filter((c) => c !== PETIT);
      if (hors.length > 0) {
        if (dernier || adversesApres.every((a) => k.vides[a][ATOUT])) return minPar(hors, rang);
        // des adversaires peuvent surcouper : un atout maître si le pli vaut le coup
        const maitres = hors.filter((c) => maitre(c, k, o));
        if (valeurPli >= 7 && maitres.length > 0) return minPar(maitres, rang);
        if (pli.includes(PETIT) && maitres.length > 0) return minPar(maitres, rang); // chasse au Petit
        return minPar(hors, rang);
      }
    }
  }

  // on ne prendra pas ce pli : donner le moins possible
  const moinsCher = minPar(sansExcuse.length > 0 ? sansExcuse : legaux, (c) => cout(c) + defausse(c, k));
  if (legaux.includes(EXCUSE) && cout(moinsCher) >= 5) return EXCUSE;
  return moinsCher;
}

/** préférence de défausse : vider ses couleurs courtes (bonus négatif) */
function defausse(c: Carte, k: Connaissance): number {
  if (estAtout(c) || c === EXCUSE) return 0;
  const longueur = k.main.filter((x) => !estAtout(x) && x !== EXCUSE && couleur(x) === couleur(c)).length;
  return longueur * 0.05;
}

// ─── point d'entrée ──────────────────────────────────────────────────────────

export function choisirCarte(d: Donne, j: number, niveau: Niveau, alea: Alea = Math.random): Carte {
  const k = connaissance(d, j);
  if (niveau === "difficile") return choisirCarteMC(d, k, alea, jouerRapide);
  if (niveau === "facile" && alea() < 0.25) {
    const legaux = coupsLegaux(k.main, d.pli.cartes);
    const pasLePetit = legaux.filter((c) => c !== PETIT);
    const pool = pasLePetit.length > 0 ? pasLePetit : legaux;
    return pool[Math.floor(alea() * pool.length)];
  }
  return jouerHeuristique(d, k, OPTIONS[niveau]);
}

/** politique rapide utilisée pendant les simulations (le camp de chacun est connu) */
export function jouerRapide(d: Donne, j: number): Carte {
  const k = connaissance(d, j);
  k.partenaire = d.partenaire;
  return jouerHeuristique(d, k, OPTIONS.moyen);
}
