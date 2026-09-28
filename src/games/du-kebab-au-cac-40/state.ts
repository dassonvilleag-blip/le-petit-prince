// Du Kebab au CAC 40 — état de la partie, écoulement du temps, actions du
// joueur et sauvegarde. Le temps est réel : `avancer` sert aussi bien au tick
// de chaque image qu'au retour après trois jours d'absence.

import { AMELIORATIONS, COMMERCES, COMMERCE_PAR_ID, type CommerceDef, type CommerceId } from "./data.ts";
import { actionsTotales, coutAchat, dureeCycle, multActions, multPalierRevenu } from "./eco.ts";

export interface CommerceEtat {
  nb: number;
  debut: number | null; // début du cycle en cours (ms), null = à l'arrêt
}

export interface Etat {
  version: 1;
  savedAt: number;
  argent: number;
  gainsCumules: number; // depuis toujours, entrées en Bourse comprises
  actions: number;
  commerces: Record<CommerceId, CommerceEtat>;
  gerants: CommerceId[];
  ameliorations: string[];
}

const STORAGE_KEY = "du-kebab-au-cac-40:v1";

export function nouvelEtat(now: number, actions = 0, gainsCumules = 0): Etat {
  const commerces = Object.fromEntries(COMMERCES.map((c) => [c.id, { nb: 0, debut: null }])) as Record<
    CommerceId,
    CommerceEtat
  >;
  commerces["vide-grenier"].nb = 1;
  return {
    version: 1,
    savedAt: now,
    argent: 0,
    gainsCumules,
    actions,
    commerces,
    gerants: [],
    ameliorations: [],
  };
}

// ---- valeurs dérivées ----

export function aGerant(s: Etat, id: CommerceId): boolean {
  return s.gerants.includes(id);
}

export function multAmelio(s: Etat, id: CommerceId): number {
  let m = 1;
  for (const a of AMELIORATIONS)
    if ((a.cible === id || a.cible === "tous") && s.ameliorations.includes(a.id)) m *= a.mult;
  return m;
}

export function revenuCycle(s: Etat, def: CommerceDef): number {
  const nb = s.commerces[def.id].nb;
  return def.revenu * nb * multAmelio(s, def.id) * multPalierRevenu(nb) * multActions(s.actions);
}

export function dureeMs(s: Etat, def: CommerceDef): number {
  return dureeCycle(def, s.commerces[def.id].nb) * 1000;
}

// Revenu par seconde d'un commerce tournant en continu.
export function revenuParSeconde(s: Etat, def: CommerceDef): number {
  return (revenuCycle(s, def) * 1000) / dureeMs(s, def);
}

// Progression du cycle en cours, entre 0 et 1.
export function progression(s: Etat, def: CommerceDef, now: number): number {
  const c = s.commerces[def.id];
  if (c.debut === null) return 0;
  return Math.min(1, (now - c.debut) / dureeMs(s, def));
}

export function actionsAGagner(s: Etat): number {
  return Math.max(0, actionsTotales(s.gainsCumules) - s.actions);
}

// ---- temps ----

// Encaisse tous les cycles terminés jusqu'à `now`. Renvoie le gain.
export function avancer(s: Etat, now: number): number {
  let gain = 0;
  for (const def of COMMERCES) {
    const c = s.commerces[def.id];
    if (c.nb === 0 || c.debut === null) continue;
    const duree = dureeMs(s, def);
    const ecoule = now - c.debut;
    if (ecoule < duree) continue;
    if (aGerant(s, def.id)) {
      const cycles = Math.floor(ecoule / duree);
      gain += cycles * revenuCycle(s, def);
      c.debut += cycles * duree;
    } else {
      gain += revenuCycle(s, def);
      c.debut = null;
    }
  }
  s.argent += gain;
  s.gainsCumules += gain;
  return gain;
}

// ---- actions du joueur ----

// Lance un cycle à la main. Renvoie false si rien n'a démarré.
export function lancer(s: Etat, id: CommerceId, now: number): boolean {
  const c = s.commerces[id];
  if (c.nb === 0 || c.debut !== null) return false;
  c.debut = now;
  return true;
}

export function acheterCommerce(s: Etat, id: CommerceId, n: number, now: number): boolean {
  const c = s.commerces[id];
  const prix = coutAchat(COMMERCE_PAR_ID[id], c.nb, n);
  if (n <= 0 || prix > s.argent) return false;
  s.argent -= prix;
  c.nb += n;
  if (aGerant(s, id) && c.debut === null) c.debut = now;
  return true;
}

export function embaucher(s: Etat, id: CommerceId, now: number): boolean {
  const prix = COMMERCE_PAR_ID[id].gerant.prix;
  if (aGerant(s, id) || prix > s.argent) return false;
  s.argent -= prix;
  s.gerants.push(id);
  const c = s.commerces[id];
  if (c.nb > 0 && c.debut === null) c.debut = now;
  return true;
}

export function ameliorer(s: Etat, amelioId: string): boolean {
  const a = AMELIORATIONS.find((x) => x.id === amelioId);
  if (!a || s.ameliorations.includes(a.id) || a.prix > s.argent) return false;
  s.argent -= a.prix;
  s.ameliorations.push(a.id);
  return true;
}

// Repart de zéro avec les actions gagnées ; renvoie le nouvel état.
export function entrerEnBourse(s: Etat, now: number): Etat {
  return nouvelEtat(now, s.actions + actionsAGagner(s), s.gainsCumules);
}

// ---- sauvegarde ----

export function charger(now: number): Etat {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Etat;
      if (s.version === 1) {
        // un commerce ajouté après la sauvegarde démarre à zéro
        const neuf = nouvelEtat(now);
        s.commerces = { ...neuf.commerces, ...s.commerces };
        return s;
      }
    }
  } catch {
    // stockage indisponible ou sauvegarde illisible : on repart de zéro
  }
  return nouvelEtat(now);
}

export function sauver(s: Etat, now: number): void {
  s.savedAt = now;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // navigation privée ou quota plein : le jeu reste jouable sans sauvegarde
  }
}
