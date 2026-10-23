// Ce qui persiste entre les vies (le Livre des Mers, le Mémorial, la Volonté
// en attente) et la partie en cours, rejouée à l'identique au rechargement.

import type { Volonte } from "../etat.ts";
import type { ResumeVie } from "../fin.ts";
import type { Jauge } from "../types.ts";

const CLE_META = "roi-des-pirates-vie-meta";
const CLE_PARTIE = "roi-des-pirates-vie-partie";
export const VERSION_CONTENU = 2;

export type SectionCodex =
  | "iles" | "zones" | "peuples" | "metiers" | "camps" | "grades" | "fruits" | "morts"
  | "rencontres" | "clins" | "secrets" | "titres" | "reliques";

export interface Options {
  vitesse: number;
  /** Durée visée d'une vie à ×1, en minutes (comme 1 sur 8 milliards : 30, 60 ou 90). */
  duree: number;
  pauses: boolean;
  auto: boolean;
}

export interface Meta {
  v: 1;
  vies: ResumeVie[];
  nbVies: number;
  codex: Record<SectionCodex, string[]>;
  /** Combien de fois chaque entrée a été vécue. */
  compte: Record<string, number>;
  rumeurs: string[];
  flags: string[];
  volonte?: Volonte;
  poneglyphes: number[];
  options: Options;
  /** Répliques de la Tenancière déjà entendues (pour varier). */
  entendues: string[];
}

export type Action = ["a"] | ["c", number] | ["n", string] | ["f", Jauge | "repos"] | ["x", string] | ["h", string, number];

export interface Partie {
  version: number;
  graine: number;
  monde?: string;
  volonte?: Volonte;
  metaFlags: string[];
  metaVies: number;
  jour?: string;
  actions: Action[];
  /** Contrôle : longueur du journal après rejeu. */
  journal: number;
}

function vide(): Meta {
  return {
    v: 1,
    vies: [],
    nbVies: 0,
    codex: {
      iles: [], zones: [], peuples: [], metiers: [], camps: [], grades: [], fruits: [], morts: [],
      rencontres: [], clins: [], secrets: [], titres: [], reliques: [],
    },
    compte: {},
    rumeurs: [],
    flags: [],
    poneglyphes: [],
    options: { vitesse: 1, duree: 60, pauses: true, auto: false },
    entendues: [],
  };
}

function lire<T>(cle: string): T | undefined {
  try {
    const brut = localStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : undefined;
  } catch {
    return undefined;
  }
}

function ecrire(cle: string, valeur: unknown): void {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // Stockage plein ou interdit : la partie continue sans sauvegarde.
  }
}

export function chargerMeta(): Meta {
  const m = lire<Meta>(CLE_META);
  if (!m || m.v !== 1) return vide();
  const base = vide();
  return { ...base, ...m, codex: { ...base.codex, ...m.codex }, options: { ...base.options, ...m.options } };
}

export function sauverMeta(m: Meta): void {
  if (m.vies.length > 300) m.vies = m.vies.slice(-300);
  ecrire(CLE_META, m);
}

export function chargerPartie(): Partie | undefined {
  const p = lire<Partie>(CLE_PARTIE);
  return p && p.version === VERSION_CONTENU ? p : undefined;
}

export function sauverPartie(p: Partie): void {
  ecrire(CLE_PARTIE, p);
}

export function effacerPartie(): void {
  try {
    localStorage.removeItem(CLE_PARTIE);
  } catch {
    // rien
  }
}

export function noter(m: Meta, section: SectionCodex, id: string): boolean {
  const cle = `${section}:${id}`;
  m.compte[cle] = (m.compte[cle] ?? 0) + 1;
  if (m.codex[section].includes(id)) return false;
  m.codex[section].push(id);
  return true;
}
