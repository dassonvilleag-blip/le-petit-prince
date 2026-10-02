// Les Caravanes — calculs purs (aucun état, aucun DOM) : formes et rangement
// dans la charrette, cours du marché, durées de trajet, mise en forme.

import {
  AMPLITUDE_COURS,
  ATTELAGES,
  BIEN_PAR_ID,
  COEF_ACHAT,
  COEF_DEMANDE,
  COEF_NEUTRE,
  COEF_PRODUCTEUR,
  CHANCE_EVENEMENT,
  FACTEUR_PALIER,
  MULT_FETE,
  MULT_FOIRE,
  MULT_RECOLTE,
  QG,
  RECETTE_PAR_PRODUIT,
  PERIODE_COURS_MAX,
  PERIODE_COURS_MIN,
  SATURATION_MAX,
  SATURATION_PAR_CASE,
  SECONDES_PAR_UNITE,
  VILLE_PAR_ID,
  type BienId,
  type Forme,
  type Lieu,
  type VilleId,
} from "./data.ts";

// ---- formes ----

// Quart de tour horaire, `rot` fois, puis renormalisation en haut à gauche.
export function tourner(forme: Forme, rot: number): Forme {
  let cases = forme.map(([x, y]) => [x, y] as [number, number]);
  for (let i = 0; i < ((rot % 4) + 4) % 4; i++) cases = cases.map(([x, y]) => [-y, x]);
  const mx = Math.min(...cases.map((c) => c[0]));
  const my = Math.min(...cases.map((c) => c[1]));
  return cases.map(([x, y]) => [x - mx, y - my] as [number, number]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

export function taille(forme: Forme): { l: number; h: number } {
  return {
    l: Math.max(...forme.map((c) => c[0])) + 1,
    h: Math.max(...forme.map((c) => c[1])) + 1,
  };
}

// Rotations distinctes d'une forme (1 pour le carré, 2 pour la barre…).
export function rotationsUtiles(forme: Forme): number[] {
  const vues = new Set<string>();
  const out: number[] = [];
  for (let r = 0; r < 4; r++) {
    const cle = JSON.stringify(tourner(forme, r));
    if (!vues.has(cle)) {
      vues.add(cle);
      out.push(r);
    }
  }
  return out;
}

// ---- rangement ----

export interface Piece {
  bien: BienId;
  rot: number;
  x: number;
  y: number;
}

export function casesPiece(p: Piece): [number, number][] {
  return tourner(BIEN_PAR_ID[p.bien].forme, p.rot).map(([x, y]) => [x + p.x, y + p.y]);
}

export function occupation(pieces: Piece[]): Set<string> {
  const occ = new Set<string>();
  for (const p of pieces) for (const [x, y] of casesPiece(p)) occ.add(`${x},${y}`);
  return occ;
}

export function peutPlacer(l: number, h: number, pieces: Piece[], p: Piece, occ = occupation(pieces)): boolean {
  return casesPiece(p).every(([x, y]) => x >= 0 && y >= 0 && x < l && y < h && !occ.has(`${x},${y}`));
}

// Index de la pièce qui couvre la case (x, y), ou -1.
export function pieceEn(pieces: Piece[], x: number, y: number): number {
  return pieces.findIndex((p) => casesPiece(p).some(([a, b]) => a === x && b === y));
}

export function casesOccupees(pieces: Piece[]): number {
  return pieces.reduce((n, p) => n + BIEN_PAR_ID[p.bien].forme.length, 0);
}

// ---- cours du marché ----

// Hachage FNV-1a : chaque couple ville/bien a sa propre vague de cours.
function hacher(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Multiplicateur de cours, entre 1 − A et 1 + A. Fonction du seul temps : le
// même calcul sert à l'écran et à la simulation hors ligne.
export function cours(ville: VilleId, bien: BienId, t: number): number {
  const h = hacher(`${ville}:${bien}`);
  const periode = (PERIODE_COURS_MIN + (h % (PERIODE_COURS_MAX - PERIODE_COURS_MIN + 1))) * 60_000;
  const phase = (((h >>> 10) % 1000) / 1000) * 2 * Math.PI;
  return 1 + AMPLITUDE_COURS * Math.sin((2 * Math.PI * t) / periode + phase);
}

// Le cours monte-t-il ? (pour la petite flèche à côté du prix)
export function coursMonte(ville: VilleId, bien: BienId, t: number): boolean {
  return cours(ville, bien, t + 60_000) >= cours(ville, bien, t);
}

// ---- événements ----

export type Evenement =
  | { type: "foire"; ville: VilleId; bien: BienId; creneau: number }
  | { type: "recolte"; ville: VilleId; bien: BienId; creneau: number }
  | { type: "fete"; ville: VilleId; creneau: number };

// Générateur pseudo-aléatoire déterministe (mulberry32).
function alea(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// La nouvelle d'un créneau, tirée parmi les villes ouvertes. Déterministe :
// l'écran et la simulation hors ligne voient la même.
export function evenementDuCreneau(creneau: number, villes: VilleId[]): Evenement | null {
  const r = alea(hacher(`creneau:${creneau}`));
  if (r() >= CHANCE_EVENEMENT || villes.length < 2) return null;
  const pick = <T>(l: T[]): T => l[Math.floor(r() * l.length)];
  const ville = pick(villes);
  const type = pick(["foire", "foire", "recolte", "fete"] as const);
  if (type === "fete") return { type, ville, creneau };
  if (type === "recolte") return { type, ville, bien: pick(VILLE_PAR_ID[ville].produit), creneau };
  // une foire réclame un bien qu'on peut se procurer ailleurs
  const ailleurs = villes.filter((v) => v !== ville).flatMap((v) => VILLE_PAR_ID[v].produit);
  return { type, ville, bien: pick(ailleurs), creneau };
}

// Ce qu'il faut savoir du marché à un instant donné, au-delà des cours.
// Les compétences du joueur y ajoutent leurs effets.
export interface Marche {
  evenement: Evenement | null;
  saturation: (ville: VilleId, bien: BienId) => number;
  remiseAchat: number; // multiplicateur des prix d'achat
  amplifEvenement: number; // 1 = effet normal des nouvelles
  facteurSaturation: number; // 1 = saturation normale
}

export const MARCHE_NEUTRE: Marche = {
  evenement: null,
  saturation: () => 0,
  remiseAchat: 1,
  amplifEvenement: 1,
  facteurSaturation: 1,
};

// Effet d'une nouvelle, amplifié (ou non) par les informateurs.
function amplifier(mult: number, amplif: number): number {
  return 1 + (mult - 1) * amplif;
}

// Multiplicateur d'achat dû à la nouvelle en cours (la remise en gros est à part).
export function multAchat(m: Marche, ville: VilleId, bien: BienId): number {
  const e = m.evenement;
  return e?.type === "recolte" && e.ville === ville && e.bien === bien
    ? amplifier(MULT_RECOLTE, m.amplifEvenement)
    : 1;
}

export function multVente(m: Marche, ville: VilleId, bien: BienId): number {
  const e = m.evenement;
  if (!e || e.ville !== ville) return 1;
  if (e.type === "fete") return amplifier(MULT_FETE, m.amplifEvenement);
  if (e.type === "foire" && e.bien === bien) return amplifier(MULT_FOIRE, m.amplifEvenement);
  return 1;
}

// ---- prix ----

// Prix d'achat d'une pièce, ou null si la ville ne produit pas ce bien.
export function prixAchat(ville: VilleId, bien: BienId, t: number, m: Marche = MARCHE_NEUTRE): number | null {
  if (!VILLE_PAR_ID[ville].produit.includes(bien)) return null;
  return BIEN_PAR_ID[bien].base * COEF_ACHAT * cours(ville, bien, t) * multAchat(m, ville, bien) * m.remiseAchat;
}

export function coefVente(ville: VilleId, bien: BienId): number {
  const recette = RECETTE_PAR_PRODUIT[bien];
  if (recette) return recette.reclame.includes(ville) ? COEF_DEMANDE : COEF_NEUTRE;
  const v = VILLE_PAR_ID[ville];
  if (v.demande.includes(bien)) return COEF_DEMANDE;
  if (v.produit.includes(bien)) return COEF_PRODUCTEUR;
  return COEF_NEUTRE;
}

// Prix de vente hors saturation.
export function prixVenteBrut(ville: VilleId, bien: BienId, t: number, m: Marche = MARCHE_NEUTRE): number {
  return BIEN_PAR_ID[bien].base * coefVente(ville, bien) * cours(ville, bien, t) * multVente(m, ville, bien);
}

export function prixVente(ville: VilleId, bien: BienId, t: number, m: Marche = MARCHE_NEUTRE): number {
  return prixVenteBrut(ville, bien, t, m) * (1 - Math.min(SATURATION_MAX, m.saturation(ville, bien)));
}

export function saturationPiece(bien: BienId, m: Marche = MARCHE_NEUTRE): number {
  return BIEN_PAR_ID[bien].forme.length * SATURATION_PAR_CASE * m.facteurSaturation;
}

// Valeur d'une cargaison vendue d'un coup : chaque pièce sature un peu le
// marché pour la suivante du même bien. Varier sa cargaison paie.
export function valeurCargaison(pieces: Piece[], ville: VilleId, t: number, m: Marche = MARCHE_NEUTRE): number {
  const ajout = new Map<BienId, number>();
  let total = 0;
  for (const p of pieces) {
    const deja = ajout.get(p.bien) ?? 0;
    const sat = Math.min(SATURATION_MAX, m.saturation(ville, p.bien) + deja);
    total += prixVenteBrut(ville, p.bien, t, m) * (1 - sat);
    ajout.set(p.bien, deja + saturationPiece(p.bien, m));
  }
  return total;
}

export function coutCargaison(pieces: Piece[], ville: VilleId, t: number, m: Marche = MARCHE_NEUTRE): number {
  return pieces.reduce((s, p) => s + (prixAchat(ville, p.bien, t, m) ?? 0), 0);
}

// ---- trajets ----

// Position sur la carte et palier d'un lieu (le QG compte comme palier 1).
export function infoLieu(l: Lieu): { nom: string; icone: string; x: number; y: number; palier: number } {
  return l === "qg" ? QG : VILLE_PAR_ID[l];
}

export function distance(a: Lieu, b: Lieu): number {
  const va = infoLieu(a);
  const vb = infoLieu(b);
  return Math.hypot(va.x - vb.x, va.y - vb.y);
}

// `mult` : raccourcis des compétences (1 = aucun).
export function dureeTrajet(a: Lieu, b: Lieu, attelage: number, mult = 1): number {
  const palier = Math.max(infoLieu(a).palier, infoLieu(b).palier);
  const secondes = (distance(a, b) * SECONDES_PAR_UNITE * FACTEUR_PALIER[palier] * mult) / ATTELAGES[attelage].vitesse;
  return Math.round(secondes * 1000);
}

// ---- chargement automatique ----

// Remplissage glouton : les biens les plus rentables par case d'abord, chacun
// posé tant qu'il trouve une place (première case libre, toutes rotations).
// Honnête mais pas optimal : un joueur attentif fait mieux à la main.
export function chargementAuto(
  l: number,
  h: number,
  depuis: VilleId,
  vers: Lieu,
  t: number,
  budget: number,
  deja: Piece[] = [],
  m: Marche = MARCHE_NEUTRE,
  quota?: Quota
): Piece[] {
  const pieces = [...deja];
  // vers le QG, on ne vend rien : on range ce qui vaut le plus par case
  const valeur = (bien: BienId) => (vers === "qg" ? BIEN_PAR_ID[bien].base : prixVente(vers, bien, t, m));
  const candidats = VILLE_PAR_ID[depuis].produit
    .filter((bien) => !quota || (quota[bien] ?? 0) > 0)
    .map((bien) => {
      const achat = prixAchat(depuis, bien, t, m)!;
      const marge = valeur(bien) - achat;
      return { bien, achat, parCase: marge / BIEN_PAR_ID[bien].forme.length };
    })
    .filter((c) => c.parCase > 0)
    .sort((a, b) => b.parCase - a.parCase);

  let reste = budget;
  const occ = occupation(pieces);
  for (const c of candidats) {
    const rots = rotationsUtiles(BIEN_PAR_ID[c.bien].forme);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < l; x++) {
        if (reste < c.achat || (quota && (quota[c.bien] ?? 0) <= 0)) break;
        for (const rot of rots) {
          const p: Piece = { bien: c.bien, rot, x, y };
          if (peutPlacer(l, h, pieces, p, occ)) {
            prendre(quota, c.bien);
            pieces.push(p);
            for (const [a, b] of casesPiece(p)) occ.add(`${a},${b}`);
            reste -= c.achat;
            break;
          }
        }
      }
  }
  return pieces;
}

// Rejoue un rangement enregistré, pièce par pièce, tant que le budget suit.
// `quota` : combien de pièces de chaque bien on a le droit de prendre (sans
// limite si absent) ; il est décompté au fil du rangement.
export function rejouerGabarit(
  gabarit: Piece[],
  l: number,
  h: number,
  ville: VilleId,
  t: number,
  budget: number,
  m: Marche = MARCHE_NEUTRE,
  quota?: Quota
): Piece[] {
  const pieces: Piece[] = [];
  let reste = budget;
  for (const p of gabarit) {
    const prix = prixAchat(ville, p.bien, t, m);
    if (prix === null || prix > reste || !peutPlacer(l, h, pieces, p) || !prendre(quota, p.bien)) continue;
    pieces.push({ ...p });
    reste -= prix;
  }
  return pieces;
}

// Pièces encore permises par bien : liste d'approvisionnement, stock du QG…
export type Quota = Partial<Record<BienId, number>>;

function prendre(quota: Quota | undefined, bien: BienId): boolean {
  if (!quota) return true;
  const n = quota[bien] ?? 0;
  if (n <= 0) return false;
  quota[bien] = n - 1;
  return true;
}

// Le même rangement, mais en puisant dans un stock (rien à payer), autour de
// ce qui est déjà chargé. Renvoie tout le chargement, `deja` compris.
export function rejouerGabaritStock(gabarit: Piece[], l: number, h: number, quota: Quota, deja: Piece[] = []): Piece[] {
  const pieces = [...deja];
  for (const p of gabarit) if (peutPlacer(l, h, pieces, p) && prendre(quota, p.bien)) pieces.push({ ...p });
  return pieces;
}

// Remplissage glouton depuis un stock : ce qui se vend le mieux par case à
// destination d'abord, dans la limite des pièces disponibles.
export function chargementStock(
  l: number,
  h: number,
  quota: Quota,
  vers: VilleId,
  t: number,
  deja: Piece[] = [],
  m: Marche = MARCHE_NEUTRE
): Piece[] {
  const pieces = [...deja];
  const biens = (Object.keys(quota) as BienId[])
    .filter((b) => (quota[b] ?? 0) > 0)
    .sort((a, b) => prixVente(vers, b, t, m) / BIEN_PAR_ID[b].forme.length - prixVente(vers, a, t, m) / BIEN_PAR_ID[a].forme.length);
  const occ = occupation(pieces);
  for (const bien of biens) {
    const rots = rotationsUtiles(BIEN_PAR_ID[bien].forme);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < l; x++) {
        if ((quota[bien] ?? 0) <= 0) break;
        for (const rot of rots) {
          const p: Piece = { bien, rot, x, y };
          if (peutPlacer(l, h, pieces, p, occ)) {
            pieces.push(p);
            for (const [a, b] of casesPiece(p)) occ.add(`${a},${b}`);
            prendre(quota, bien);
            break;
          }
        }
      }
  }
  return pieces;
}

// ---- mise en forme ----

const ESPACE = " ";

function grouper(entier: number): string {
  return String(entier).replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE);
}

export function formatNombre(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  if (n < 0) return "-" + formatNombre(-n);
  if (n < 100) {
    const t = Math.floor(n * 10 + 1e-9) / 10;
    return Number.isInteger(t) ? String(t) : t.toFixed(1).replace(".", ",");
  }
  if (n < 1e6) return grouper(Math.floor(n));
  if (n < 1e9) return (Math.floor(n / 1e4) / 100).toFixed(2).replace(".", ",") + ESPACE + "M";
  return (Math.floor(n / 1e7) / 100).toFixed(2).replace(".", ",") + ESPACE + "Md";
}

export function formatEcus(n: number): string {
  return formatNombre(n) + ESPACE + "🪙";
}

// 88 → « 1:28 », 2064 → « 34:24 », 7300 → « 2 h 01 ».
export function formatDuree(secondes: number): string {
  const s = Math.max(0, Math.ceil(secondes));
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h >= 48) return `${Math.floor(h / 24)} j ${h % 24} h`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}
