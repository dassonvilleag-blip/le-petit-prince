// La Colonie — état du jeu, sauvegarde et simulation. Le temps est réel :
// `advance` rejoue les événements (chantiers, naissances, expéditions) dans
// l'ordre chronologique en accumulant la production entre chaque, si bien que
// la même fonction sert au tick d'une seconde et au retour après trois jours.

import {
  COLS,
  ROWS,
  ENTRANCE_COL,
  REINE,
  REINE_W,
  REINE_H,
  SALLE_PAR_ID,
  UNITE_PAR_ID,
  EXPEDITION_PAR_ID,
  STOCK_BASE,
  type Cost,
  type ResourceId,
  type UnitId,
} from "./data";

export interface RoomState {
  uid: number;
  type: string; // id dans SALLES, ou "reine"
  x: number;
  y: number;
  level: number; // 0 = en construction
  chantierFin: number | null; // fin de construction ou d'amélioration
}

export interface DigState {
  x: number;
  y: number;
  fin: number;
}

export interface QueueItem {
  unit: UnitId;
  fin: number | null; // null tant que l'œuf n'est pas en tête de file
}

export interface ExpeditionState {
  defId: string;
  escouade: Record<UnitId, number>;
  fin: number;
  seed: number;
}

export interface Rapport {
  titre: string;
  emoji: string;
  lignes: string[];
  lu: boolean;
}

export interface ColonyState {
  version: 1;
  savedAt: number;
  reineLevel: number;
  reineChantierFin: number | null;
  res: Record<ResourceId, number>;
  dug: boolean[]; // ROWS * COLS, tunnels creusés (hors salles)
  digs: DigState[];
  rooms: RoomState[];
  nextUid: number;
  units: Record<UnitId, number>;
  queue: QueueItem[];
  expeditions: ExpeditionState[];
  symbiotes: string[];
  rapports: Rapport[];
}

const STORAGE_KEY = "la-colonie-v1";

export const idx = (x: number, y: number): number => y * COLS + x;

// ---- création ----

export function newColony(now: number): ColonyState {
  const dug = new Array<boolean>(ROWS * COLS).fill(false);
  // puits d'entrée jusqu'à la chambre de la Reine
  dug[idx(ENTRANCE_COL, 0)] = true;
  dug[idx(ENTRANCE_COL, 1)] = true;
  dug[idx(ENTRANCE_COL, 2)] = true;
  return {
    version: 1,
    savedAt: now,
    reineLevel: 1,
    reineChantierFin: null,
    res: { feuilles: 150, champignons: 0, miellat: 0 },
    dug,
    digs: [],
    rooms: [{ uid: 1, type: "reine", x: 6, y: 3, level: 1, chantierFin: null }],
    nextUid: 2,
    units: { ouvriere: 3, soldate: 0 },
    queue: [],
    expeditions: [],
    symbiotes: [],
    rapports: [],
  };
}

export function load(now: number): ColonyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as ColonyState;
      if (s.version === 1) return s;
    }
  } catch {
    // sauvegarde illisible : on repart de zéro
  }
  return newColony(now);
}

export function save(s: ColonyState, now: number): void {
  s.savedAt = now;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function reset(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ---- valeurs dérivées ----

export function stockMax(s: ColonyState): number {
  let cap = STOCK_BASE;
  for (const r of s.rooms) {
    if (r.type !== "grenier" || r.level < 1) continue;
    cap += SALLE_PAR_ID.get("grenier")!.niveaux[r.level - 1].stockBonus ?? 0;
  }
  return cap;
}

export function popMax(s: ColonyState): number {
  return REINE[s.reineLevel - 1].popMax;
}

export function popTotale(s: ColonyState): number {
  let n = s.units.ouvriere + s.units.soldate + s.queue.length;
  for (const e of s.expeditions) n += e.escouade.ouvriere + e.escouade.soldate;
  return n;
}

export function fileMax(s: ColonyState): number {
  let m = 0;
  for (const r of s.rooms) {
    if (r.type !== "nurserie" || r.level < 1) continue;
    m += SALLE_PAR_ID.get("nurserie")!.niveaux[r.level - 1].fileMax ?? 0;
  }
  return m;
}

export function chantiersEnCours(s: ColonyState): number {
  let n = s.digs.length;
  for (const r of s.rooms) if (r.chantierFin !== null) n++;
  return n;
}

export function nurserieDisponible(s: ColonyState): boolean {
  return s.rooms.some((r) => r.type === "nurserie" && r.level >= 1);
}

// production par minute de chaque ressource (état courant)
export function prodParMinute(s: ColonyState): Record<ResourceId, number> {
  const prod: Record<ResourceId, number> = { feuilles: 0, champignons: 0, miellat: 0 };
  prod.feuilles = s.units.ouvriere * UNITE_PAR_ID.get("ouvriere")!.recolte;
  for (const r of s.rooms) {
    if (r.level < 1) continue;
    const def = SALLE_PAR_ID.get(r.type);
    if (!def?.prodRes) continue;
    prod[def.prodRes] += def.niveaux[r.level - 1].prodParMinute ?? 0;
  }
  return prod;
}

export function peutPayer(s: ColonyState, cout: Cost): boolean {
  return (Object.entries(cout) as [ResourceId, number][]).every(([r, n]) => s.res[r] >= n);
}

export function payer(s: ColonyState, cout: Cost): void {
  for (const [r, n] of Object.entries(cout) as [ResourceId, number][]) s.res[r] -= n;
}

// nombre de salles d'un type (construites ou en chantier)
export function nbSalles(s: ColonyState, type: string): number {
  return s.rooms.filter((r) => r.type === type).length;
}

// ---- grille ----

export function cellDansSalle(s: ColonyState, x: number, y: number): RoomState | null {
  for (const r of s.rooms) {
    const def = r.type === "reine" ? { w: REINE_W, h: REINE_H } : SALLE_PAR_ID.get(r.type)!;
    if (x >= r.x && x < r.x + def.w && y >= r.y && y < r.y + def.h) return r;
  }
  return null;
}

export function estCreusee(s: ColonyState, x: number, y: number): boolean {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
  return s.dug[idx(x, y)] || cellDansSalle(s, x, y) !== null;
}

const VOISINS = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

// une cellule de terre est creusable si elle touche le réseau
export function creusable(s: ColonyState, x: number, y: number): boolean {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
  if (estCreusee(s, x, y)) return false;
  if (s.digs.some((d) => d.x === x && d.y === y)) return false;
  return VOISINS.some(([dx, dy]) => estCreusee(s, x + dx, y + dy));
}

// une salle w×h est constructible ici : que de la terre vierge, et au moins
// une cellule du pourtour touche le réseau
export function constructible(s: ColonyState, x: number, y: number, w: number, h: number): boolean {
  if (x < 0 || y < 0 || x + w > COLS || y + h > ROWS) return false;
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) {
      if (estCreusee(s, i, j)) return false;
      if (s.digs.some((d) => d.x === i && d.y === j)) return false;
    }
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++)
      if (VOISINS.some(([dx, dy]) => estCreusee(s, i + dx, j + dy))) return true;
  return false;
}

// ---- simulation ----

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// accumule la production entre deux instants, bornée par la capacité
function accumuler(s: ColonyState, deMs: number, aMs: number): void {
  const minutes = Math.max(0, aMs - deMs) / 60_000;
  if (minutes <= 0) return;
  const prod = prodParMinute(s);
  const cap = stockMax(s);
  for (const r of Object.keys(prod) as ResourceId[]) {
    s.res[r] = Math.min(cap, s.res[r] + prod[r] * minutes);
  }
}

function resoudreExpedition(s: ColonyState, e: ExpeditionState, evts: string[]): void {
  const def = EXPEDITION_PAR_ID.get(e.defId)!;
  const r = mulberry32(e.seed);
  let force = 0;
  for (const [u, n] of Object.entries(e.escouade) as [UnitId, number][])
    force += UNITE_PAR_ID.get(u)!.force * n;

  const ratio = (force * (0.85 + 0.3 * r())) / def.difficulte;
  const victoire = ratio >= 1;
  const lignes: string[] = [];

  // pertes : nulles si écrasante victoire, lourdes en cas de déroute
  const tauxPertes = Math.min(0.8, Math.max(0, 0.45 / Math.max(ratio, 0.1) - 0.3));
  const survivants: Record<UnitId, number> = { ouvriere: 0, soldate: 0 };
  let pertes = 0;
  for (const [u, n] of Object.entries(e.escouade) as [UnitId, number][]) {
    let morts = 0;
    for (let i = 0; i < n; i++) if (r() < tauxPertes) morts++;
    if (victoire && morts === n && n > 0) morts = n - 1; // une victoire ramène toujours quelqu'un
    survivants[u] = n - morts;
    pertes += morts;
  }
  s.units.ouvriere += survivants.ouvriere;
  s.units.soldate += survivants.soldate;

  // butin : total si victoire, maigre part sinon
  const part = victoire ? 1 : Math.min(0.35, ratio * 0.35);
  const cap = stockMax(s);
  const butin: string[] = [];
  for (const [res, n] of Object.entries(def.butin) as [ResourceId, number][]) {
    const gain = Math.round(n * part);
    if (gain > 0) {
      s.res[res] = Math.min(cap, s.res[res] + gain);
      butin.push(`${gain} ${res === "feuilles" ? "🍃" : res === "champignons" ? "🍄" : "🍯"}`);
    }
  }

  if (victoire) {
    lignes.push(`Victoire ! L'escouade a dominé le terrain (force ${force} contre ${def.difficulte}).`);
    if (butin.length) lignes.push(`Butin rapporté : ${butin.join(", ")}.`);
    if (def.recrute && !s.symbiotes.includes(def.recrute)) {
      s.symbiotes.push(def.recrute);
      lignes.push("🎉 Le troupeau suit la colonne : une nouvelle espèce rejoint la colonie !");
      evts.push("Cercle de symbiose élargi !");
    }
  } else {
    lignes.push(`Défaite… l'escouade était trop faible (force ${force} contre ${def.difficulte}).`);
    if (butin.length) lignes.push(`Sauvé de la débâcle : ${butin.join(", ")}.`);
    else lignes.push("L'escouade rentre les mandibules vides.");
  }
  if (pertes > 0) lignes.push(`${pertes} fourmi(s) ne rentreront pas.`);
  else lignes.push("Aucune perte, toutes les fourmis sont rentrées.");

  s.rapports.unshift({ titre: def.nom, emoji: def.emoji, lignes, lu: false });
  if (s.rapports.length > 8) s.rapports.length = 8;
  evts.push(`${def.emoji} ${def.nom} : ${victoire ? "victoire !" : "défaite…"}`);
}

// Fait avancer la colonie jusqu'à `now`. Retourne les événements survenus
// (pour les toasts et le résumé de retour).
export function advance(s: ColonyState, now: number): string[] {
  const evts: string[] = [];
  let t = s.savedAt;

  for (let garde = 0; garde < 10_000; garde++) {
    // prochain événement daté
    let best = Infinity;
    if (s.reineChantierFin !== null) best = Math.min(best, s.reineChantierFin);
    for (const d of s.digs) best = Math.min(best, d.fin);
    for (const r of s.rooms) if (r.chantierFin !== null) best = Math.min(best, r.chantierFin);
    if (s.queue[0]?.fin != null) best = Math.min(best, s.queue[0].fin);
    for (const e of s.expeditions) best = Math.min(best, e.fin);
    if (best > now) break;

    accumuler(s, t, best);
    t = best;

    if (s.reineChantierFin !== null && s.reineChantierFin <= t) {
      s.reineChantierFin = null;
      s.reineLevel++;
      evts.push(`👑 La Reine atteint le niveau ${s.reineLevel} !`);
      continue;
    }
    const dig = s.digs.find((d) => d.fin <= t);
    if (dig) {
      s.digs.splice(s.digs.indexOf(dig), 1);
      s.dug[idx(dig.x, dig.y)] = true;
      evts.push("⛏️ Tunnel creusé.");
      continue;
    }
    const room = s.rooms.find((r) => r.chantierFin !== null && r.chantierFin <= t);
    if (room) {
      room.chantierFin = null;
      room.level++;
      const def = SALLE_PAR_ID.get(room.type)!;
      evts.push(
        room.level === 1 ? `${def.emoji} ${def.nom} construite !` : `${def.emoji} ${def.nom} → niv. ${room.level}`
      );
      continue;
    }
    if (s.queue[0]?.fin != null && s.queue[0].fin <= t) {
      const né = s.queue.shift()!;
      s.units[né.unit]++;
      evts.push(`${UNITE_PAR_ID.get(né.unit)!.emoji} Une ${UNITE_PAR_ID.get(né.unit)!.nom.toLowerCase()} est née.`);
      if (s.queue[0]) s.queue[0].fin = t + UNITE_PAR_ID.get(s.queue[0].unit)!.secondes * 1000;
      continue;
    }
    const exp = s.expeditions.find((e) => e.fin <= t);
    if (exp) {
      s.expeditions.splice(s.expeditions.indexOf(exp), 1);
      resoudreExpedition(s, exp, evts);
      continue;
    }
    break; // sécurité : rien à traiter alors qu'un événement était daté
  }

  accumuler(s, t, now);
  s.savedAt = now;
  return evts;
}
