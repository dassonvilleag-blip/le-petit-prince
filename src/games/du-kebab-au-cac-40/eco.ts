// Du Kebab au CAC 40 — calculs économiques purs (aucun état, aucun DOM) :
// prix d'achat, paliers, prestige, et mise en forme des montants.

import {
  BONUS_PAR_ACTION,
  BOURSE_DIVISEUR,
  BOURSE_ECHELLE,
  PALIERS_VITESSE,
  PALIER_REVENU_PAS,
  type CommerceDef,
} from "./data.ts";

// ---- achats ----

// Prix de `n` exemplaires quand on en possède déjà `possede` : somme d'une
// suite géométrique de raison `coef`.
export function coutAchat(def: CommerceDef, possede: number, n: number): number {
  if (n <= 0) return 0;
  const premier = def.coutInitial * def.coef ** possede;
  return (premier * (def.coef ** n - 1)) / (def.coef - 1);
}

// Plus grand `n` tel que coutAchat(n) <= argent.
export function maxAchetable(def: CommerceDef, possede: number, argent: number): number {
  const premier = def.coutInitial * def.coef ** possede;
  if (argent < premier) return 0;
  let n = Math.floor(Math.log((argent * (def.coef - 1)) / premier + 1) / Math.log(def.coef));
  // l'arrondi flottant peut viser un cran trop haut ou trop bas
  while (n > 0 && coutAchat(def, possede, n) > argent) n--;
  while (coutAchat(def, possede, n + 1) <= argent) n++;
  return n;
}

// ---- paliers ----

export function paliersAtteints(nb: number): number {
  return PALIERS_VITESSE.filter((p) => nb >= p).length;
}

// Durée d'un cycle en secondes, paliers de vitesse compris.
export function dureeCycle(def: CommerceDef, nb: number): number {
  return def.cycle / 2 ** paliersAtteints(nb);
}

// Au-delà du dernier palier de vitesse, chaque centaine double les revenus.
export function multPalierRevenu(nb: number): number {
  const dernier = PALIERS_VITESSE[PALIERS_VITESSE.length - 1];
  if (nb < dernier + PALIER_REVENU_PAS) return 1;
  return 2 ** Math.floor((nb - dernier) / PALIER_REVENU_PAS);
}

// Prochain palier (vitesse ou revenu) et celui d'avant, pour la jauge.
export function prochainPalier(nb: number): { precedent: number; cible: number; vitesse: boolean } {
  let precedent = 0;
  for (const p of PALIERS_VITESSE) {
    if (nb < p) return { precedent, cible: p, vitesse: true };
    precedent = p;
  }
  const cible = (Math.floor(nb / PALIER_REVENU_PAS) + 1) * PALIER_REVENU_PAS;
  return { precedent: cible - PALIER_REVENU_PAS, cible, vitesse: false };
}

// ---- Bourse ----

// Nombre total d'actions que valent ces gains cumulés (déjà obtenues comprises).
export function actionsTotales(gainsCumules: number): number {
  return Math.floor(BOURSE_ECHELLE * Math.sqrt(Math.max(0, gainsCumules) / BOURSE_DIVISEUR));
}

export function multActions(actions: number): number {
  return 1 + BONUS_PAR_ACTION * actions;
}

// ---- mise en forme ----

// Échelle longue française : 10^6 million, 10^9 milliard, 10^12 billion…
const ECHELLE = [
  "million",
  "milliard",
  "billion",
  "billiard",
  "trillion",
  "trilliard",
  "quadrillion",
  "quadrilliard",
  "quintillion",
  "quintilliard",
  "sextillion",
  "sextilliard",
  "septillion",
  "septilliard",
  "octillion",
  "octilliard",
  "nonillion",
  "nonilliard",
  "décillion",
  "décilliard",
];

const ESPACE = " ";

function grouper(entier: number): string {
  return String(entier).replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE);
}

// Nombre avec au plus `dec` décimales (tronquées, jamais arrondies vers le
// haut : on n'affiche pas un argent qu'on n'a pas), virgule décimale.
function decimal(v: number, dec: number): string {
  const f = 10 ** dec;
  const t = Math.floor(v * f + 1e-9) / f;
  const [e, d] = t.toFixed(dec).split(".");
  const dTrim = (d ?? "").replace(/0+$/, "");
  return grouper(Number(e)) + (dTrim ? "," + dTrim : "");
}

export function formatNombre(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  if (n < 0) return "-" + formatNombre(-n);
  if (n < 100) return decimal(n, 2);
  if (n < 1e6) return grouper(Math.floor(n));
  const k = Math.floor(Math.log10(n) / 3);
  let rang = k - 2;
  let v = n / 10 ** (3 * k);
  // log10 flottant : 999 999,999… peut tomber d'un côté ou de l'autre
  if (v >= 1000) {
    v /= 1000;
    rang++;
  } else if (v < 1) {
    v *= 1000;
    rang--;
  }
  if (rang >= ECHELLE.length) return n.toExponential(2).replace(".", ",");
  return `${decimal(v, 2)} ${ECHELLE[rang]}${v >= 2 ? "s" : ""}`;
}

export function formatArgent(n: number): string {
  return formatNombre(n) + ESPACE + "€";
}

// 5 → « 0:05 », 96 → « 1:36 », 6144 → « 1 h 42 », 36864 → « 10 h 14 ».
export function formatDuree(secondes: number): string {
  const s = Math.max(0, Math.ceil(secondes));
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h >= 48) return `${Math.floor(h / 24)} j ${h % 24} h`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}
