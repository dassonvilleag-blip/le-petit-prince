// Le Tarot — les 78 cartes, codées en entiers pour que l'IA puisse simuler
// des milliers de donnes sans allouer d'objets :
//   0..55  couleurs : couleur = floor(c / 14), rang = c % 14 + 1 (11 V, 12 C, 13 D, 14 R)
//   56..76 atouts 1 (le Petit) à 21
//   77     l'Excuse
// Les points sont comptés en demi-points (total 182 = 91 points) pour rester
// en entiers.

export type Carte = number;

export const PIQUE = 0;
export const COEUR = 1;
export const CARREAU = 2;
export const TREFLE = 3;
/** pseudo-couleur des atouts (l'Excuse n'a pas de couleur : -1) */
export const ATOUT = 4;

export const PETIT = 56;
export const VINGT_ET_UN = 76;
export const EXCUSE = 77;
export const BOUTS: readonly Carte[] = [PETIT, VINGT_ET_UN, EXCUSE];

export const NB_CARTES = 78;
export const TOTAL_DEMI_POINTS = 182;

export const estAtout = (c: Carte): boolean => c >= 56 && c <= 76;
export const estBout = (c: Carte): boolean => c === PETIT || c === VINGT_ET_UN || c === EXCUSE;
/** atout 1..21, ou rang 1..14 pour une couleur, 0 pour l'Excuse */
export const rang = (c: Carte): number => (c < 56 ? (c % 14) + 1 : c < 77 ? c - 55 : 0);
export const couleur = (c: Carte): number => (c < 56 ? Math.floor(c / 14) : c < 77 ? ATOUT : -1);
export const estRoi = (c: Carte): boolean => c < 56 && c % 14 === 13;
export const carteCouleur = (coul: number, r: number): Carte => coul * 14 + r - 1;
export const atout = (n: number): Carte => 55 + n;

/** valeur en demi-points */
export function demiPoints(c: Carte): number {
  if (c >= 56) return c === PETIT || c === VINGT_ET_UN || c === EXCUSE ? 9 : 1;
  switch (c % 14) {
    case 13:
      return 9; // roi
    case 12:
      return 7; // dame
    case 11:
      return 5; // cavalier
    case 10:
      return 3; // valet
    default:
      return 1;
  }
}

export const SYMBOLES = ["♠", "♥", "♦", "♣"];
export const NOMS_COULEURS = ["pique", "cœur", "carreau", "trèfle"];
const TETES = ["V", "C", "D", "R"];
const NOMS_TETES = ["Valet", "Cavalier", "Dame", "Roi"];

/** libellé court affiché sur la carte : « 7 », « R », « 21 » */
export function libelleCourt(c: Carte): string {
  if (c === EXCUSE) return "★";
  if (estAtout(c)) return String(rang(c));
  const r = rang(c);
  return r <= 10 ? String(r) : TETES[r - 11];
}

/** nom complet : « Roi de cœur », « le Petit », « atout 14 » */
export function nomCarte(c: Carte): string {
  if (c === EXCUSE) return "l'Excuse";
  if (c === PETIT) return "le Petit";
  if (c === VINGT_ET_UN) return "le 21";
  if (estAtout(c)) return `l'atout ${rang(c)}`;
  const r = rang(c);
  const coul = NOMS_COULEURS[couleur(c)];
  if (r === 1) return `l'as de ${coul}`;
  if (r <= 10) return `le ${r} de ${coul}`;
  return `le ${NOMS_TETES[r - 11]} de ${coul}`.replace("le Dame", "la Dame");
}

/** ordre d'affichage d'une main : atouts, puis couleurs alternées (♠ ♥ ♣ ♦), Excuse au bout */
const ORDRE_COULEURS = [0, 1, 3, 2]; // rang d'affichage de pique, cœur, carreau, trèfle
export function cleTri(c: Carte): number {
  if (c === EXCUSE) return 1000;
  if (estAtout(c)) return rang(c);
  return 100 + ORDRE_COULEURS[couleur(c)] * 20 + rang(c);
}

export function trierMain(main: Carte[]): Carte[] {
  return [...main].sort((a, b) => cleTri(a) - cleTri(b));
}

export function paquetNeuf(): Carte[] {
  return Array.from({ length: NB_CARTES }, (_, i) => i);
}

export type Alea = () => number;

export function melanger<T>(t: T[], alea: Alea = Math.random): T[] {
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    const x = t[i];
    t[i] = t[j];
    t[j] = x;
  }
  return t;
}

/** générateur pseudo-aléatoire reproductible (mulberry32), pour les tests */
export function aleaGraine(graine: number): Alea {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
