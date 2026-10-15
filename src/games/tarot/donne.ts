// Le Tarot — déroulé d'une donne : distribution, enchères, appel du roi (à 5),
// chien et écart, jeu de la carte, décompte. L'état est muté en place par des
// fonctions qui refusent tout coup illégal (elles lèvent une erreur) : l'UI et
// l'IA passent par les mêmes portes.

import {
  EXCUSE,
  PETIT,
  carteCouleur,
  estAtout,
  melanger,
  paquetNeuf,
  rang,
  trierMain,
  type Alea,
  type Carte,
} from "./cartes.ts";
import {
  DISTRIBUTION,
  GARDE,
  GARDE_CONTRE,
  GARDE_SANS,
  SEUILS_POIGNEE,
  atoutsPoignee,
  coupsLegaux,
  dansAttaque,
  decompter,
  ecartValide,
  indexGagnant,
  poigneePossible,
  type Decompte,
  type PliJoue,
} from "./regles.ts";

export type Phase = "encheres" | "appel" | "ecart" | "jeu" | "fin";

export interface Poignee {
  joueur: number;
  taille: number;
  atouts: Carte[];
}

export interface Donne {
  n: number;
  donneur: number;
  phase: Phase;
  /** joueur qui doit agir */
  tour: number;
  mains: Carte[][];
  chien: Carte[];
  /** annonce de chacun : null = pas encore parlé, 0 = passe, 1..4 = contrat */
  annonces: (number | null)[];
  preneur: number;
  contrat: number;
  /** carte appelée à 5 joueurs (-1 sinon) */
  carteAppelee: Carte;
  /** partenaire réel (-1 si seul) — secret tant que la carte appelée n'est pas tombée */
  partenaire: number;
  partenaireRevele: boolean;
  /** le chien a été montré à tous (prise et garde) */
  chienMontre: boolean;
  ecart: Carte[];
  /** atouts que le preneur a dû écarter : ils sont montrés */
  ecartMontre: Carte[];
  plis: PliJoue[];
  pli: { cartes: Carte[]; joueurs: number[] };
  poignees: Poignee[];
  decompte: Decompte | null;
}

/** joueur suivant dans le sens du jeu */
export const suivant = (d: Donne, j: number): number => (j + 1) % d.n;

/** petit sec : le Petit seul atout, sans l'Excuse — la donne est annulée */
function aPetitSec(main: Carte[]): boolean {
  return main.includes(PETIT) && !main.includes(EXCUSE) && main.filter(estAtout).length === 1;
}

export function distribuer(n: number, donneur: number, alea: Alea = Math.random): Donne {
  const { main, chien } = DISTRIBUTION[n];
  let paquet: Carte[];
  let mains: Carte[][];
  do {
    paquet = melanger(paquetNeuf(), alea);
    mains = Array.from({ length: n }, (_, j) => trierMain(paquet.slice(j * main, (j + 1) * main)));
  } while (mains.some(aPetitSec));
  return {
    n,
    donneur,
    phase: "encheres",
    tour: (donneur + 1) % n,
    mains,
    chien: paquet.slice(n * main, n * main + chien),
    annonces: new Array(n).fill(null),
    preneur: -1,
    contrat: 0,
    carteAppelee: -1,
    partenaire: -1,
    partenaireRevele: false,
    chienMontre: false,
    ecart: [],
    ecartMontre: [],
    plis: [],
    pli: { cartes: [], joueurs: [] },
    poignees: [],
    decompte: null,
  };
}

export const meilleureAnnonce = (d: Donne): number => Math.max(0, ...d.annonces.map((a) => a ?? 0));

/** contrats que le joueur au tour peut annoncer (0 = passe toujours possible) */
export function annoncesPossibles(d: Donne): number[] {
  const m = meilleureAnnonce(d);
  return [0, 1, 2, 3, 4].filter((c) => c === 0 || c > m);
}

/**
 * Enregistre l'annonce du joueur au tour. Retourne "redonne" si tout le
 * monde a passé (il faut alors redistribuer).
 */
export function annoncer(d: Donne, joueur: number, contrat: number): "ok" | "redonne" {
  if (d.phase !== "encheres" || joueur !== d.tour) throw new Error("pas ton tour d'annoncer");
  if (!annoncesPossibles(d).includes(contrat)) throw new Error("annonce trop basse");
  d.annonces[joueur] = contrat;
  if (d.annonces.some((a) => a === null)) {
    d.tour = suivant(d, joueur);
    return "ok";
  }
  const m = meilleureAnnonce(d);
  if (m === 0) {
    d.phase = "fin";
    return "redonne";
  }
  d.contrat = m;
  d.preneur = d.annonces.indexOf(m);
  d.tour = d.preneur;
  if (d.n === 5) d.phase = "appel";
  else apresAppel(d);
  return "ok";
}

/**
 * Cartes que le preneur peut appeler à 5 : un roi ; une dame s'il a les
 * quatre rois ; un cavalier s'il a aussi les quatre dames.
 */
export function appelsPossibles(main: readonly Carte[]): Carte[] {
  for (const r of [14, 13, 12, 11]) {
    const cartes = [0, 1, 2, 3].map((coul) => carteCouleur(coul, r));
    if (r === 11 || !cartes.every((c) => main.includes(c))) return cartes;
  }
  return [];
}

export function appeler(d: Donne, carte: Carte): void {
  if (d.phase !== "appel") throw new Error("pas d'appel en cours");
  if (!appelsPossibles(d.mains[d.preneur]).includes(carte)) throw new Error("carte non appelable");
  d.carteAppelee = carte;
  const porteur = d.mains.findIndex((m) => m.includes(carte));
  // carte au chien ou dans sa propre main : le preneur joue seul
  d.partenaire = porteur >= 0 && porteur !== d.preneur ? porteur : -1;
  apresAppel(d);
}

function apresAppel(d: Donne): void {
  if (d.contrat <= GARDE) {
    d.chienMontre = true;
    d.mains[d.preneur] = trierMain([...d.mains[d.preneur], ...d.chien]);
    d.phase = "ecart";
    d.tour = d.preneur;
    // le roi appelé vu au chien : tout le monde sait que le preneur est seul
    if (d.carteAppelee >= 0 && d.chien.includes(d.carteAppelee)) d.partenaireRevele = true;
    return;
  }
  // garde sans : le chien compte pour le preneur ; garde contre : pour la défense
  d.ecart = [...d.chien];
  commencerJeu(d);
}

export function faireEcart(d: Donne, cartes: Carte[]): void {
  if (d.phase !== "ecart") throw new Error("pas d'écart en cours");
  const main = d.mains[d.preneur];
  const erreur = ecartValide(main, cartes, d.chien.length);
  if (erreur) throw new Error(erreur);
  d.ecart = [...cartes];
  d.ecartMontre = cartes.filter(estAtout);
  d.mains[d.preneur] = main.filter((c) => !cartes.includes(c));
  commencerJeu(d);
}

function commencerJeu(d: Donne): void {
  d.phase = "jeu";
  d.tour = suivant(d, d.donneur);
}

/** le joueur peut-il encore annoncer une poignée ? (avant sa première carte) */
export function peutAnnoncerPoignee(d: Donne, joueur: number): number {
  if (d.phase !== "jeu" || d.plis.length > 0 || d.pli.joueurs.includes(joueur)) return 0;
  if (d.poignees.some((p) => p.joueur === joueur)) return 0;
  return poigneePossible(atoutsPoignee(d.mains[joueur]).length, d.n);
}

/**
 * Annonce une poignée : on montre exactement le nombre d'atouts requis. Si on
 * montre l'Excuse, c'est qu'on n'a pas d'autre atout (règle FFT) — on la garde
 * donc pour la fin.
 */
export function annoncerPoignee(d: Donne, joueur: number, taille: number): Poignee {
  const max = peutAnnoncerPoignee(d, joueur);
  if (taille < 1 || taille > max) throw new Error("poignée impossible");
  const requis = SEUILS_POIGNEE[d.n][taille - 1];
  const atouts = d.mains[joueur].filter(estAtout).sort((a, b) => rang(a) - rang(b));
  // on montre les plus petits : inutile d'en dire plus que nécessaire
  const montres = atouts.length >= requis ? atouts.slice(0, requis) : [...atouts, EXCUSE];
  const p = { joueur, taille, atouts: montres.sort((a, b) => a - b) };
  d.poignees.push(p);
  return p;
}

export function legaux(d: Donne, joueur: number): Carte[] {
  if (d.phase !== "jeu" || joueur !== d.tour) return [];
  return coupsLegaux(d.mains[joueur], d.pli.cartes);
}

/**
 * Joue une carte. Retourne le pli terminé s'il vient d'être ramassé (pour
 * l'animation), sinon null.
 */
export function jouer(d: Donne, joueur: number, carte: Carte): PliJoue | null {
  if (d.phase !== "jeu" || joueur !== d.tour) throw new Error("pas ton tour");
  if (!coupsLegaux(d.mains[joueur], d.pli.cartes).includes(carte)) throw new Error("coup interdit");
  d.mains[joueur] = d.mains[joueur].filter((c) => c !== carte);
  d.pli.cartes.push(carte);
  d.pli.joueurs.push(joueur);
  if (carte === d.carteAppelee) d.partenaireRevele = true;

  if (d.pli.cartes.length < d.n) {
    d.tour = suivant(d, joueur);
    return null;
  }

  const { cartes, joueurs } = d.pli;
  let gagnant = joueurs[indexGagnant(cartes)];
  // chelem : l'Excuse jouée au dernier pli par un camp qui a tout pris remporte ce pli
  const dernier = d.mains.every((m) => m.length === 0);
  const iExcuse = cartes.indexOf(EXCUSE);
  if (dernier && iExcuse >= 0) {
    const camp = dansAttaque(joueurs[iExcuse], d.preneur, d.partenaire);
    if (d.plis.length > 0 && d.plis.every((p) => dansAttaque(p.gagnant, d.preneur, d.partenaire) === camp)) {
      gagnant = joueurs[iExcuse];
    }
  }
  const fini: PliJoue = { cartes: [...cartes], joueurs: [...joueurs], gagnant };
  d.plis.push(fini);
  d.pli = { cartes: [], joueurs: [] };
  d.tour = gagnant;

  if (dernier) {
    d.phase = "fin";
    d.partenaireRevele = true;
    d.decompte = decompter({
      n: d.n,
      contrat: d.contrat,
      preneur: d.preneur,
      partenaire: d.partenaire,
      plis: d.plis,
      ecart: d.ecart,
      poignees: d.poignees,
    });
  }
  return fini;
}

/** en garde sans / contre, personne ne voit le chien avant la fin */
export const chienCache = (d: Donne): boolean => d.contrat === GARDE_SANS || d.contrat === GARDE_CONTRE;
