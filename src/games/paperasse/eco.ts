// Paperasse — calculs purs (aucun DOM) : multiplicateurs, demande, débit,
// coûts, galons, et mise en forme des nombres.

import {
  AFFICHAGE_COEF,
  AFFICHAGE_COUT,
  AFFICHAGE_MULT,
  CERFA_COEF,
  CERFA_COUT,
  DEMANDE_BASE,
  ECHELLE_PHASE,
  ELASTICITE,
  GALON_ECHELLE,
  MEDAILLE_BONUS,
  MODS_NEUTRES,
  NOTES_PAR_CLASSEUR,
  NOTES_PAR_REUNION,
  PATIENCE_BASE,
  PROJET_PAR_ID,
  REGION_COEF,
  REGION_COUT,
  REGION_DEPART,
  REGION_PAR_ID,
  REPLICATION_BASE,
  TIMBRE_DEPART,
  TRAITEMENT_BASE,
  UNITES,
  type Mods,
  type UniteDef,
} from "./data.ts";
import type { Etat } from "./state.ts";

// ---- multiplicateurs ----

export function mods(e: Etat): Mods {
  const m: Mods = { ...MODS_NEUTRES };
  for (const id of e.projets) {
    const p = PROJET_PAR_ID[id]?.mods;
    if (!p) continue;
    for (const k of Object.keys(p) as (keyof Mods)[]) {
      if (k === "pieces") m.pieces += p.pieces ?? 0;
      else m[k] *= p[k] ?? 1;
    }
  }
  return m;
}

export function bonusMedailles(e: Etat): number {
  return 1 + MEDAILLE_BONUS * e.medailles;
}

// ---- production ----

export function debitUnite(e: Etat, m: Mods, u: UniteDef): number {
  return u.debit * m[u.id] * m.tous * bonusMedailles(e);
}

// Dossiers par seconde traitables par les unités (hors clics), grève comprise.
export function capacite(e: Etat, m: Mods): number {
  if (e.greve) return 0;
  let c = 0;
  for (const u of UNITES) c += e.unites[u.id] * debitUnite(e, m, u);
  return c;
}

export function dossiersParClic(e: Etat, m: Mods): number {
  return m.clic * bonusMedailles(e);
}

// ---- demande ----

export function multRegions(e: Etat): number {
  if (e.phase < 3) return 1;
  const depart = REGION_PAR_ID[REGION_DEPART].pop;
  let pop = 0;
  for (const id of e.regions) pop += REGION_PAR_ID[id].pop;
  return pop / depart;
}

export function notoriete(e: Etat, m: Mods): number {
  let n = AFFICHAGE_MULT ** e.affichage * m.demande;
  for (const ef of e.effets) n *= ef.mult;
  return n;
}

// Pièces justificatives par usager : chaque pièce est un dossier.
export function pieces(e: Etat, m: Mods): number {
  return 1 + e.cerfas.length + m.pieces;
}

export function patience(m: Mods): number {
  return PATIENCE_BASE * m.patience;
}

// Usagers par seconde qui se présentent (avant renonciation).
export function usagersParSec(e: Etat, m: Mods): number {
  const prix = (TIMBRE_DEPART / e.timbre) ** ELASTICITE;
  const manif = e.phase === 3 && e.grogne > 50 ? 1 - (e.grogne - 50) / 100 : 1;
  return DEMANDE_BASE * ECHELLE_PHASE[e.phase] * multRegions(e) * notoriete(e, m) * prix * manif;
}

// Délai d'attente (s) : temps pour écouler la pile au rythme actuel.
export function delai(pile: number, debit: number): number {
  if (pile <= 0) return 0;
  if (debit <= 0) return Infinity;
  return pile / debit;
}

// Part des usagers qui renoncent en voyant la file.
export function renonciation(delaiS: number, patienceS: number): number {
  if (delaiS <= patienceS) return 0;
  return Math.min(1, (delaiS - patienceS) / (2 * patienceS));
}

export function recetteParDossier(e: Etat, m: Mods): number {
  const numeroVert = e.projets.includes("numero-vert") && e.phase === 3 ? 1 + e.grogne / 100 : 1;
  return e.timbre * m.valeur * numeroVert;
}

// ---- coûts ----

export function coutUnite(u: UniteDef, possede: number): number {
  return u.cout * u.coef ** possede;
}

export function coutAffichage(niveau: number): number {
  return AFFICHAGE_COUT * AFFICHAGE_COEF ** niveau;
}

export function coutCerfa(n: number): number {
  return Math.round(CERFA_COUT * CERFA_COEF ** n);
}

// `ouvertes` compte la préfecture de départ.
export function coutRegion(ouvertes: number): number {
  return REGION_COUT * REGION_COEF ** (ouvertes - 1);
}

// ---- hiérarchie ----

// Dossiers nécessaires pour le galon n° n (0-indexé) : 1, 2, 3, 5, 8… × 1 000.
export function seuilGalon(n: number): number {
  let a = 1;
  let b = 2;
  for (let i = 0; i < n; i++) {
    const c = a + b;
    a = b;
    b = c;
  }
  return a * GALON_ECHELLE;
}

export function notesParSec(e: Etat, m: Mods): number {
  return e.reunions * NOTES_PAR_REUNION * m.notes;
}

export function capNotes(e: Etat, m: Mods): number {
  return e.classeurs * NOTES_PAR_CLASSEUR * m.cap;
}

// ---- espace ----

export function replication(m: Mods): number {
  return REPLICATION_BASE * m.replication;
}

export function traitementGuichet(e: Etat, m: Mods): number {
  return TRAITEMENT_BASE * m.traitement * bonusMedailles(e);
}

// ---- mise en forme ----

// Échelle longue, celle du français.
const GRANDS = [
  [1e57, "nonilliard"],
  [1e54, "nonillion"],
  [1e51, "octilliard"],
  [1e48, "octillion"],
  [1e45, "septilliard"],
  [1e42, "septillion"],
  [1e39, "sextilliard"],
  [1e36, "sextillion"],
  [1e33, "quintilliard"],
  [1e30, "quintillion"],
  [1e27, "quadrilliard"],
  [1e24, "quadrillion"],
  [1e21, "trilliard"],
  [1e18, "trillion"],
  [1e15, "billiard"],
  [1e12, "billion"],
  [1e9, "milliard"],
  [1e6, "million"],
] as const;

const espaces = (n: number): string => Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

export function formatNombre(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  if (n < 0) return "−" + formatNombre(-n);
  if (n >= 1e60) return n.toExponential(2).replace(".", ",").replace("e+", " × 10^");
  for (const [v, nom] of GRANDS) {
    if (n >= v) {
      const x = n / v;
      const txt = x >= 100 ? espaces(x) : x.toFixed(x >= 10 ? 1 : 2).replace(".", ",").replace(/,?0+$/, "");
      return `${txt} ${nom}${x >= 2 ? "s" : ""}`;
    }
  }
  return espaces(n);
}

export function formatEuros(n: number): string {
  if (Math.abs(n) < 1000 && Math.abs(n) % 1 !== 0) return n.toFixed(2).replace(".", ",") + " €";
  const t = formatNombre(n);
  return /[a-z]$/.test(t) ? `${t} d'euros` : `${t} €`;
}

export function formatTimbre(n: number): string {
  return n.toFixed(2).replace(".", ",") + " €";
}

export function formatDuree(s: number): string {
  if (!Number.isFinite(s)) return "∞";
  s = Math.round(s);
  if (s < 60) return `${s} s`;
  const min = Math.floor(s / 60);
  if (min < 60) return `${min} min${s % 60 ? ` ${String(s % 60).padStart(2, "0")}` : ""}`;
  const h = Math.floor(min / 60);
  return `${h} h ${String(min % 60).padStart(2, "0")}`;
}

// Délai affiché en jours fictifs (1 s = 1 jour, c'est l'administration).
export function formatDelai(s: number): string {
  if (!Number.isFinite(s)) return "indéterminé";
  const j = Math.round(s);
  if (j < 1) return "immédiat";
  if (j < 365) return `${j} jour${j > 1 ? "s" : ""}`;
  return `${formatNombre(j / 365)} an${j >= 730 ? "s" : ""}`;
}

export function formatMasse(kg: number): string {
  if (kg < 1000) return `${Math.round(kg)} kg`;
  return `${formatNombre(kg / 1000)} t`;
}
