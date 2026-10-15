// Le Tarot — règles pures (FFT) : cartes jouables, gagnant du pli, écart,
// poignées et décompte d'une donne. Aucun état ici : tout est testable seul.

import {
  BOUTS,
  EXCUSE,
  PETIT,
  couleur,
  demiPoints,
  estAtout,
  estBout,
  estRoi,
  rang,
  type Carte,
} from "./cartes.ts";

export const PASSE = 0;
export const PRISE = 1;
export const GARDE = 2;
export const GARDE_SANS = 3;
export const GARDE_CONTRE = 4;
export const NOMS_CONTRATS = ["Passe", "Prise", "Garde", "Garde sans", "Garde contre"];
export const MULTIPLICATEURS = [0, 1, 2, 4, 6];

/** cartes par joueur et taille du chien */
export const DISTRIBUTION: Record<number, { main: number; chien: number }> = {
  4: { main: 18, chien: 6 },
  5: { main: 15, chien: 3 },
};

/** points à réaliser selon le nombre de bouts (0 à 3) */
export const CIBLES = [56, 51, 41, 36];

/** atouts nécessaires (Excuse comprise) pour une poignée simple / double / triple */
export const SEUILS_POIGNEE: Record<number, number[]> = {
  4: [10, 13, 15],
  5: [8, 10, 13],
};
export const PRIMES_POIGNEE = [0, 20, 30, 40];
export const NOMS_POIGNEES = ["", "simple", "double", "triple"];

/** carte qui donne la couleur demandée : la première qui n'est pas l'Excuse */
export function carteDemandee(pli: readonly Carte[]): Carte {
  for (const c of pli) if (c !== EXCUSE) return c;
  return -1;
}

/** index (dans le pli) de la carte qui remporte le pli, l'Excuse ne gagnant jamais */
export function indexGagnant(pli: readonly Carte[]): number {
  const entame = carteDemandee(pli);
  if (entame < 0) return 0;
  const coulEntame = couleur(entame);
  let meilleur = -1;
  let meilleureForce = -1;
  for (let i = 0; i < pli.length; i++) {
    const c = pli[i];
    if (c === EXCUSE) continue;
    // un atout bat toute couleur ; sinon seule la couleur demandée compte
    const force = estAtout(c) ? 100 + rang(c) : couleur(c) === coulEntame ? rang(c) : -1;
    if (force > meilleureForce) {
      meilleureForce = force;
      meilleur = i;
    }
  }
  return meilleur;
}

/** plus fort atout déjà posé dans le pli (0 s'il n'y en a pas) */
export function plusFortAtout(pli: readonly Carte[]): number {
  let m = 0;
  for (const c of pli) if (estAtout(c) && rang(c) > m) m = rang(c);
  return m;
}

/**
 * Cartes que `main` a le droit de jouer sur `pli` : fournir à la couleur,
 * sinon couper, toujours monter à l'atout si possible ; l'Excuse passe partout.
 */
export function coupsLegaux(main: readonly Carte[], pli: readonly Carte[]): Carte[] {
  const entame = carteDemandee(pli);
  if (entame < 0) return [...main];
  const avecExcuse = (t: Carte[]): Carte[] => (main.includes(EXCUSE) ? [...t, EXCUSE] : t);

  if (!estAtout(entame)) {
    const memeCouleur = main.filter((c) => c !== EXCUSE && couleur(c) === couleur(entame));
    if (memeCouleur.length > 0) return avecExcuse(memeCouleur);
  }
  const atouts = main.filter(estAtout);
  if (atouts.length === 0) return [...main];
  const seuil = plusFortAtout(pli);
  const auDessus = atouts.filter((c) => rang(c) > seuil);
  return avecExcuse(auDessus.length > 0 ? auDessus : atouts);
}

/** carte interdite à l'écart : rois et bouts toujours, atouts sauf nécessité */
export function ecartValide(mainComplete: readonly Carte[], ecart: readonly Carte[], taille: number): string | null {
  if (ecart.length !== taille) return `Il faut écarter ${taille} cartes.`;
  if (new Set(ecart).size !== ecart.length) return "Carte en double.";
  if (ecart.some((c) => !mainComplete.includes(c))) return "Carte absente de ta main.";
  if (ecart.some(estRoi)) return "Les rois ne vont pas au chien.";
  if (ecart.some(estBout)) return "Les bouts ne vont pas au chien.";
  const atoutsEcartes = ecart.filter(estAtout).length;
  if (atoutsEcartes > 0) {
    // atouts tolérés seulement si les cartes « normales » ne suffisent pas
    const normales = mainComplete.filter((c) => !estAtout(c) && !estRoi(c) && c !== EXCUSE).length;
    if (normales >= taille) return "Pas d'atout au chien tant que tu as d'autres cartes.";
    if (atoutsEcartes > taille - normales) return "Trop d'atouts écartés.";
  }
  return null;
}

/** taille de poignée (0 à 3) que permet un nombre d'atouts */
export function poigneePossible(nbAtouts: number, n: number): number {
  const s = SEUILS_POIGNEE[n];
  let t = 0;
  for (let i = 0; i < s.length; i++) if (nbAtouts >= s[i]) t = i + 1;
  return t;
}

/** atouts comptés pour la poignée (Excuse comprise) */
export function atoutsPoignee(main: readonly Carte[]): Carte[] {
  return main.filter((c) => estAtout(c) || c === EXCUSE);
}

export interface PliJoue {
  cartes: Carte[];
  joueurs: number[];
  gagnant: number;
}

export interface EntreeDecompte {
  n: number;
  contrat: number;
  preneur: number;
  /** partenaire réel à 5 (-1 si le preneur joue seul ou à 4) */
  partenaire: number;
  plis: PliJoue[];
  /** cartes mises de côté (écart du preneur, ou chien en garde sans / contre) */
  ecart: Carte[];
  poignees: { joueur: number; taille: number }[];
}

export interface Decompte {
  gagne: boolean;
  /** points réalisés par l'attaque, en demi-points */
  demiPointsAttaque: number;
  bouts: number;
  cible: number;
  /** écart arrondi au point supérieur */
  ecartPoints: number;
  petitAuBout: number; // +1 attaque, -1 défense, 0 personne
  poignee: number; // prime totale (avant signe)
  chelem: number; // +1 attaque, -1 défense
  /** marque d'une part (la défense prend -part chacun) */
  part: number;
  scores: number[];
}

export function dansAttaque(j: number, preneur: number, partenaire: number): boolean {
  return j === preneur || j === partenaire;
}

export function decompter(e: EntreeDecompte): Decompte {
  const attaque = (j: number): boolean => dansAttaque(j, e.preneur, e.partenaire);
  let demi = 0;
  let bouts = 0;
  const prendre = (c: Carte, pourAttaque: boolean): void => {
    if (!pourAttaque) return;
    demi += demiPoints(c);
    if (estBout(c)) bouts++;
  };

  // l'écart revient à l'attaque, sauf en garde contre où le chien va en défense
  for (const c of e.ecart) prendre(c, e.contrat !== 4);

  const dernier = e.plis.length - 1;
  for (let i = 0; i < e.plis.length; i++) {
    const p = e.plis[i];
    const camp = attaque(p.gagnant);
    for (let k = 0; k < p.cartes.length; k++) {
      const c = p.cartes[k];
      if (c === EXCUSE && i !== dernier) {
        // l'Excuse reste à son camp, qui donne une demi-carte (½ point) en échange
        const campExcuse = attaque(p.joueurs[k]);
        prendre(c, campExcuse);
        if (campExcuse !== camp) demi += camp ? 1 : -1;
      } else {
        prendre(c, camp);
      }
    }
  }

  const cible = CIBLES[bouts];
  const diff = demi - cible * 2;
  const gagne = diff >= 0;
  const signe = gagne ? 1 : -1;
  const ecartPoints = Math.ceil(Math.abs(diff) / 2);
  const mult = MULTIPLICATEURS[e.contrat];

  let petitAuBout = 0;
  const pliFinal = e.plis[dernier];
  if (pliFinal && pliFinal.cartes.includes(PETIT)) petitAuBout = attaque(pliFinal.gagnant) ? 1 : -1;

  const poignee = e.poignees.reduce((s, p) => s + PRIMES_POIGNEE[p.taille], 0);

  const plisAttaque = e.plis.filter((p) => attaque(p.gagnant)).length;
  const chelem = plisAttaque === e.plis.length ? 1 : plisAttaque === 0 ? -1 : 0;

  const part = signe * (25 + ecartPoints) * mult + petitAuBout * 10 * mult + signe * poignee + chelem * 200;

  const scores = new Array(e.n).fill(0);
  const seul = e.partenaire < 0 || e.partenaire === e.preneur;
  for (let j = 0; j < e.n; j++) {
    if (j === e.preneur) scores[j] = part * (seul ? e.n - 1 : e.n - 3);
    else if (j === e.partenaire) scores[j] = part;
    else scores[j] = -part;
  }
  return { gagne, demiPointsAttaque: demi, bouts, cible, ecartPoints, petitAuBout, poignee, chelem, part, scores };
}

/** nombre de bouts dans un paquet de cartes */
export const compterBouts = (cartes: readonly Carte[]): number => cartes.filter((c) => BOUTS.includes(c)).length;
