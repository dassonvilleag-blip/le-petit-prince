// L'Âge des Royaumes — le moteur de la partie, sans DOM : carte, chemins,
// récolte, construction, formation, combat, âges, brouillard, victoire.
// main.ts l'affiche et lui passe les ordres du joueur, ia.ts ceux de l'IA.

import {
  AGES,
  BATIMENTS,
  DEPART,
  FERME_CADENCE,
  FERME_NOURRITURE,
  HOTEL_TIR,
  NATURE,
  POP_MAX,
  PORTEE,
  TAILLE_CARTE,
  UNITES,
  VITESSE,
  type BatimentId,
  type Cout,
  type NatureId,
  type Ressource,
  type UniteId,
} from "./data.ts";

export interface Point {
  x: number;
  y: number;
}

export interface Noeud {
  id: number;
  nature: NatureId;
  x: number;
  y: number;
  reste: number;
}

// Ce qu'un bâtiment a en file : des unités, ou le passage à l'âge suivant.
export type Formation = UniteId | "age";

export interface Batiment {
  id: number;
  type: BatimentId;
  camp: number;
  x: number;
  y: number;
  pv: number;
  construit: number; // secondes de travail déjà faites
  fini: boolean;
  reste: number; // nourriture d'une ferme
  file: Formation[];
  chrono: number;
  ralliement: Point | null; // où vont les unités formées
  recharge: number; // l'Hôtel de ville entre deux flèches
  tir: { cible: number; t: number } | null; // sa dernière flèche, pour l'affichage
}

export type Tache =
  | { type: "rien" }
  | { type: "aller" }
  | { type: "recolter"; cible: number; nature: NatureId | "ferme" }
  | { type: "construire"; cible: number }
  | { type: "deposer"; cible: number }
  | { type: "attaquer"; cible: number };

export interface Unite {
  id: number;
  type: UniteId;
  camp: number;
  x: number; // en cases, flottant
  y: number;
  pv: number;
  chemin: Point[];
  but: string; // destination du chemin en cours, pour ne pas le recalculer
  tache: Tache;
  charge: { res: Ressource; n: number } | null;
  recharge: number; // secondes avant le prochain coup
  coup: number; // instant du dernier coup porté, pour l'affichage
}

export interface Camp {
  stock: Record<Ressource, number>;
  age: number;
}

export interface Partie {
  taille: number;
  bloque: Uint8Array; // case infranchissable
  occupe: Uint8Array; // case prise (une ferme se traverse mais s'occupe)
  caseNoeud: Int32Array;
  noeuds: Map<number, Noeud>;
  batiments: Map<number, Batiment>;
  unites: Map<number, Unite>;
  camps: Camp[]; // 0 : le joueur, 1 : l'IA
  enJeu: number[]; // les camps qui se disputent la victoire
  vainqueur: number | null;
  vu: Uint8Array; // brouillard du joueur : 0 jamais vu, 1 exploré, 2 visible
  temps: number;
  prochainId: number;
}

export const SAUVAGE = 2; // le camp des loups
const RIEN: Tache = { type: "rien" };

export function partieVide(taille: number): Partie {
  const n = taille * taille;
  return {
    taille,
    bloque: new Uint8Array(n),
    occupe: new Uint8Array(n),
    caseNoeud: new Int32Array(n),
    noeuds: new Map(),
    batiments: new Map(),
    unites: new Map(),
    camps: [0, 1].map(() => ({ stock: { ...DEPART }, age: 0 })),
    enJeu: [],
    vainqueur: null,
    vu: new Uint8Array(n),
    temps: 0,
    prochainId: 1,
  };
}

// ---------- carte ----------

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

const dedans = (p: Partie, x: number, y: number) => x >= 0 && y >= 0 && x < p.taille && y < p.taille;
const libre = (p: Partie, x: number, y: number) => dedans(p, x, y) && !p.occupe[y * p.taille + x];
export const franchissable = (p: Partie, x: number, y: number) => dedans(p, x, y) && !p.bloque[y * p.taille + x];

export function ajouterNoeud(p: Partie, nature: NatureId, x: number, y: number): Noeud {
  const n: Noeud = { id: p.prochainId++, nature, x, y, reste: NATURE[nature].quantite };
  const i = y * p.taille + x;
  p.noeuds.set(n.id, n);
  p.bloque[i] = p.occupe[i] = 1;
  p.caseNoeud[i] = n.id;
  return n;
}

function retirerNoeud(p: Partie, n: Noeud): void {
  const i = n.y * p.taille + n.x;
  p.noeuds.delete(n.id);
  p.bloque[i] = p.occupe[i] = 0;
  p.caseNoeud[i] = 0;
}

export function ajouterUnite(p: Partie, type: UniteId, x: number, y: number, camp = 0): Unite {
  const u: Unite = { id: p.prochainId++, type, camp, x, y, pv: UNITES[type].pv, chemin: [], but: "", tache: RIEN, charge: null, recharge: 0, coup: -1 };
  p.unites.set(u.id, u);
  return u;
}

// Un amas qui pousse au hasard à partir d'une case : forêt, mine, buissons.
function amas(p: Partie, nature: NatureId, x0: number, y0: number, n: number, r: () => number, ok: (x: number, y: number) => boolean): void {
  if (!libre(p, x0, y0) || !ok(x0, y0)) return;
  const cases = [ajouterNoeud(p, nature, x0, y0)];
  for (let essais = 0; cases.length < n && essais < n * 20; essais++) {
    const c = cases[Math.floor(r() * cases.length)];
    const x = c.x + Math.floor(r() * 3) - 1;
    const y = c.y + Math.floor(r() * 3) - 1;
    if (libre(p, x, y) && ok(x, y)) cases.push(ajouterNoeud(p, nature, x, y));
  }
}

// Deux bases face à face. Tout ce qui pousse autour de la première a son
// reflet autour de la seconde : la carte est la même pour les deux camps.
export function nouvellePartie(graine = Date.now()): Partie {
  const T = TAILLE_CARTE;
  const p = partieVide(T);
  p.enJeu = [0, 1];
  const r = alea(graine);
  const h = Math.round(T * 0.12); // les bases près de deux coins opposés
  const surface = (T / 64) ** 2; // la carte d'origine faisait 64 de côté
  const a = r() < 0.5 ? { x: h, y: h } : { x: h, y: T - 4 - h };
  const b = { x: T - 4 - a.x, y: T - 4 - a.y };
  poser(p, "hotel", a.x, a.y, true, 0);
  poser(p, "hotel", b.x, b.y, true, 1);
  const ca = { x: a.x + 2, y: a.y + 2 };
  const cb = { x: b.x + 2, y: b.y + 2 };
  const d = (x: number, y: number, c: Point) => Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y);
  const auHasard = (dmin: number, dmax: number) => {
    const angle = r() * Math.PI * 2;
    const dist = dmin + r() * (dmax - dmin);
    return { x: Math.floor(ca.x + Math.cos(angle) * dist), y: Math.floor(ca.y + Math.sin(angle) * dist) };
  };
  const semer = (nature: NatureId, n: number, dmin: number, dmax: number) => {
    const ok = (x: number, y: number) => d(x, y, ca) >= dmin - 2 && d(x, y, cb) >= 13;
    for (let essai = 0; essai < 60; essai++) {
      const { x, y } = auHasard(dmin, dmax);
      if (libre(p, x, y) && ok(x, y)) return amas(p, nature, x, y, n, r, ok);
    }
  };
  semer("baies", 6, 6, 8);
  semer("arbre", 20, 9, 12);
  semer("or", 7, 8, 11);
  semer("pierre", 5, 8, 11);
  semer("or", 7, 16, 26);
  semer("pierre", 5, 16, 26);
  semer("baies", 6, 14, 22);
  for (let i = 0; i < 3; i++) {
    semer("or", 7, 28, T * 0.7);
    semer("pierre", 5, 28, T * 0.7);
    semer("baies", 6, 24, T * 0.6);
  }
  for (let i = 0; i < 12 * surface; i++) semer("arbre", 20 + Math.floor(r() * 50), 13, T * 0.95);
  for (const n of [...p.noeuds.values()]) if (libre(p, T - 1 - n.x, T - 1 - n.y)) ajouterNoeud(p, n.nature, T - 1 - n.x, T - 1 - n.y);
  for (const [camp, c] of [ca, cb].entries()) for (const v of casesLibresAutour(p, { x: c.x, y: c.y + 3 }, 3)) ajouterUnite(p, "villageois", v.x + 0.5, v.y + 0.5, camp);
  // une forêt ne doit pas couper la route entre les bases : on y ouvre une trouée (symétrique)
  if (!chemin(p, p.unites.values().next().value!, b.x, b.y, 4, 1))
    for (let k = 0; k <= 100; k++)
      for (const [dx, dy] of [[0, 0], ...VOISINS]) {
        const x = Math.floor(ca.x + ((cb.x - ca.x) * k) / 100) + dx;
        const y = Math.floor(ca.y + ((cb.y - ca.y) * k) / 100) + dy;
        for (const n of [noeudEn(p, x, y), noeudEn(p, T - 1 - x, T - 1 - y)]) if (n) retirerNoeud(p, n);
      }
  // des loups qui rôdent loin des villages, comme sur les cartes d'AoE II
  for (let i = 0; i < 2 * surface; i++) {
    const [c] = casesLibresAutour(p, auHasard(18, T * 0.6), 1);
    if (!c || d(c.x, c.y, cb) < 18) continue;
    ajouterUnite(p, "loup", c.x + 0.5, c.y + 0.5, SAUVAGE);
    ajouterUnite(p, "loup", T - 0.5 - c.x, T - 0.5 - c.y, SAUVAGE);
  }
  majVue(p);
  return p;
}

// ---------- chemins ----------

const VOISINS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// A* en 8 directions jusqu'à une case à moins de `marge` du rectangle. Rend les
// centres des cases à suivre (au moins une, la dernière), ou null si inaccessible.
export function chemin(p: Partie, de: Point, rx: number, ry: number, w: number, marge: number): Point[] | null {
  const T = p.taille;
  const sx = Math.floor(de.x);
  const sy = Math.floor(de.y);
  const estBut = (x: number, y: number) => x >= rx - marge && x < rx + w + marge && y >= ry - marge && y < ry + w + marge;
  const h = (x: number, y: number) => {
    const dx = Math.max(rx - marge - x, 0, x - (rx + w + marge - 1));
    const dy = Math.max(ry - marge - y, 0, y - (ry + w + marge - 1));
    return Math.max(dx, dy) + 0.41 * Math.min(dx, dy);
  };
  const g = new Float32Array(T * T).fill(Infinity);
  const venu = new Int32Array(T * T).fill(-1);
  const ferme = new Uint8Array(T * T);
  // tas binaire des cases ouvertes, la plus prometteuse en tête
  const tas: number[] = [];
  const f: number[] = [];
  const echanger = (i: number, j: number) => {
    [tas[i], tas[j]] = [tas[j], tas[i]];
    [f[i], f[j]] = [f[j], f[i]];
  };
  const ouvrir = (i: number) => {
    tas.push(i);
    f.push(g[i] + h(i % T, Math.floor(i / T)));
    for (let k = tas.length - 1; k > 0 && f[(k - 1) >> 1] > f[k]; k = (k - 1) >> 1) echanger(k, (k - 1) >> 1);
  };
  const prendre = () => {
    const tete = tas[0];
    echanger(0, tas.length - 1);
    tas.pop();
    f.pop();
    for (let k = 0; ; ) {
      const [l, r] = [2 * k + 1, 2 * k + 2];
      let m = k;
      if (l < tas.length && f[l] < f[m]) m = l;
      if (r < tas.length && f[r] < f[m]) m = r;
      if (m === k) break;
      echanger(k, m);
      k = m;
    }
    return tete;
  };
  g[sy * T + sx] = 0;
  ouvrir(sy * T + sx);
  while (tas.length) {
    const i = prendre();
    const x = i % T;
    const y = Math.floor(i / T);
    if (estBut(x, y) && (i === sy * T + sx || franchissable(p, x, y))) {
      const route: Point[] = [];
      for (let c = i; c !== -1; c = venu[c]) route.push({ x: (c % T) + 0.5, y: Math.floor(c / T) + 0.5 });
      route.reverse();
      return route.length > 1 ? route.slice(1) : route;
    }
    if (ferme[i]) continue;
    ferme[i] = 1;
    for (const [dx, dy] of VOISINS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!franchissable(p, nx, ny)) continue;
      // pas de coin coupé entre deux obstacles
      if (dx && dy && (!franchissable(p, x + dx, y) || !franchissable(p, x, y + dy))) continue;
      const n = ny * T + nx;
      const ng = g[i] + (dx && dy ? 1.41 : 1);
      if (ng < g[n]) {
        g[n] = ng;
        venu[n] = i;
        ouvrir(n);
      }
    }
  }
  return null;
}

// Les `n` cases franchissables les plus proches d'un point, pour disperser un groupe.
export function casesLibresAutour(p: Partie, de: Point, n: number): Point[] {
  const T = p.taille;
  const vu = new Uint8Array(T * T);
  const file = [{ x: Math.floor(de.x), y: Math.floor(de.y) }];
  const res: Point[] = [];
  for (let k = 0; k < file.length && res.length < n; k++) {
    const c = file[k];
    if (!dedans(p, c.x, c.y) || vu[c.y * T + c.x]) continue;
    vu[c.y * T + c.x] = 1;
    if (franchissable(p, c.x, c.y)) res.push(c);
    for (const [dx, dy] of VOISINS.slice(0, 4)) file.push({ x: c.x + dx, y: c.y + dy });
  }
  return res;
}

// ---------- bâtiments ----------

export function peutPoser(p: Partie, type: BatimentId, x: number, y: number): boolean {
  const t = BATIMENTS[type].taille;
  for (let j = y; j < y + t; j++) for (let i = x; i < x + t; i++) if (!libre(p, i, j)) return false;
  return true;
}

export const peutPayer = (p: Partie, c: Cout, camp = 0) => (Object.keys(c) as Ressource[]).every((r) => p.camps[camp].stock[r] >= (c[r] ?? 0));

function payer(p: Partie, camp: number, c: Cout, sens = 1): void {
  for (const r of Object.keys(c) as Ressource[]) p.camps[camp].stock[r] -= sens * (c[r] ?? 0);
}

export function poser(p: Partie, type: BatimentId, x: number, y: number, fini = false, camp = 0): Batiment {
  const def = BATIMENTS[type];
  const b: Batiment = { id: p.prochainId++, type, camp, x, y, pv: fini ? def.pv : 1, construit: 0, fini: false, reste: 0, file: [], chrono: 0, ralliement: null, recharge: 0, tir: null };
  p.batiments.set(b.id, b);
  for (let j = y; j < y + def.taille; j++)
    for (let i = x; i < x + def.taille; i++) {
      p.occupe[j * p.taille + i] = 1;
      if (!def.traversable) p.bloque[j * p.taille + i] = 1;
    }
  if (fini) terminer(b);
  return b;
}

function terminer(b: Batiment): void {
  b.fini = true;
  b.construit = BATIMENTS[b.type].duree;
  if (b.type === "ferme") b.reste = FERME_NOURRITURE;
}

function retirerBatiment(p: Partie, b: Batiment): void {
  const t = BATIMENTS[b.type].taille;
  p.batiments.delete(b.id);
  for (let j = b.y; j < b.y + t; j++) for (let i = b.x; i < b.x + t; i++) p.occupe[j * p.taille + i] = p.bloque[j * p.taille + i] = 0;
}

export function batimentEn(p: Partie, x: number, y: number): Batiment | undefined {
  for (const b of p.batiments.values()) {
    const t = BATIMENTS[b.type].taille;
    if (x >= b.x && x < b.x + t && y >= b.y && y < b.y + t) return b;
  }
}

export const noeudEn = (p: Partie, x: number, y: number) => (dedans(p, x, y) ? p.noeuds.get(p.caseNoeud[y * p.taille + x]) : undefined);

// ---------- population ----------

export function popActuelle(p: Partie, camp = 0): number {
  let n = 0;
  for (const u of p.unites.values()) if (u.camp === camp) n++;
  return n;
}

export function popMaxi(p: Partie, camp = 0): number {
  let n = 0;
  for (const b of p.batiments.values()) if (b.fini && b.camp === camp) n += BATIMENTS[b.type].pop;
  return Math.min(n, POP_MAX);
}

// ---------- âges ----------

// Combien de bâtiments différents, parmi ceux qu'exige l'âge suivant, sont debout.
export function batimentsPourAge(p: Partie, camp = 0): number {
  const requis = AGES[p.camps[camp].age + 1]?.requis ?? [];
  return new Set([...p.batiments.values()].filter((b) => b.camp === camp && b.fini && requis.includes(b.type)).map((b) => b.type)).size;
}

const ageEnCours = (p: Partie, camp: number) => [...p.batiments.values()].some((b) => b.camp === camp && b.file.includes("age"));

export const coutDe = (p: Partie, quoi: Formation, camp = 0) => (quoi === "age" ? AGES[p.camps[camp].age + 1].cout : UNITES[quoi].cout);
export const dureeDe = (p: Partie, quoi: Formation, camp = 0) => (quoi === "age" ? AGES[p.camps[camp].age + 1].duree : UNITES[quoi].duree);

// Ce bâtiment peut-il lancer ça maintenant (âge, prérequis, ressources) ?
export function peutFormer(p: Partie, b: Batiment, quoi: Formation): boolean {
  if (!b.fini) return false;
  const age = p.camps[b.camp].age;
  if (quoi === "age")
    return b.type === "hotel" && age + 1 < AGES.length && batimentsPourAge(p, b.camp) >= 2 && !ageEnCours(p, b.camp) && peutPayer(p, coutDe(p, quoi, b.camp), b.camp);
  const d = UNITES[quoi];
  return d.lieu === b.type && d.age <= age && peutPayer(p, d.cout, b.camp);
}

// ---------- ordres ----------

export function construire(p: Partie, type: BatimentId, x: number, y: number, ouvriers: number[], camp = 0): Batiment | null {
  const def = BATIMENTS[type];
  if (def.age > p.camps[camp].age || !peutPoser(p, type, x, y) || !peutPayer(p, def.cout, camp)) return null;
  payer(p, camp, def.cout);
  const b = poser(p, type, x, y, false, camp);
  for (const id of ouvriers) if (p.unites.get(id)?.type === "villageois") affecter(p, id, { type: "construire", cible: b.id });
  return b;
}

export function former(p: Partie, id: number, quoi: Formation): boolean {
  const b = p.batiments.get(id);
  if (!b || !peutFormer(p, b, quoi)) return false;
  payer(p, b.camp, coutDe(p, quoi, b.camp));
  b.file.push(quoi);
  return true;
}

// Retire le dernier de la file et le rembourse.
export function annulerFormation(p: Partie, id: number): void {
  const b = p.batiments.get(id);
  const quoi = b?.file.pop();
  if (!b || !quoi) return;
  if (!b.file.length) b.chrono = 0;
  payer(p, b.camp, coutDe(p, quoi, b.camp), -1);
}

export function fixerRalliement(p: Partie, id: number, x: number, y: number): void {
  const b = p.batiments.get(id);
  if (b) b.ralliement = { x, y };
}

// Touche Suppr : comme dans AoE, une fondation pas encore commencée est remboursée.
export function supprimer(p: Partie, id: number): void {
  if (p.unites.delete(id)) return;
  const b = p.batiments.get(id);
  if (!b) return;
  if (!b.fini && b.construit === 0) payer(p, b.camp, BATIMENTS[b.type].cout, -1);
  for (const quoi of b.file) payer(p, b.camp, coutDe(p, quoi, b.camp), -1);
  retirerBatiment(p, b);
}

function affecter(p: Partie, id: number, t: Tache): void {
  const u = p.unites.get(id);
  if (!u) return;
  u.tache = t;
  u.chemin = [];
  u.but = "";
}

// Ce qu'un villageois fait d'un clic droit sur la case : récolter, construire, cultiver, déposer.
function travailEn(p: Partie, x: number, y: number, camp: number): Tache | null {
  const n = noeudEn(p, x, y);
  if (n) return { type: "recolter", cible: n.id, nature: n.nature };
  const b = batimentEn(p, x, y);
  if (!b || b.camp !== camp) return null;
  if (!b.fini) return { type: "construire", cible: b.id };
  if (b.type === "ferme") return { type: "recolter", cible: b.id, nature: "ferme" };
  return { type: "deposer", cible: b.id };
}

// Clic droit sur la case (x, y) : les villageois y travaillent, les autres s'y rendent.
export function ordonner(p: Partie, ids: number[], x: number, y: number): void {
  const travail = travailEn(p, x, y, p.unites.get(ids[0])?.camp ?? 0);
  const marcheurs = travail ? ids.filter((id) => p.unites.get(id)?.type !== "villageois") : ids;
  if (travail) for (const id of ids) if (!marcheurs.includes(id)) affecter(p, id, { ...travail });
  const cases = casesLibresAutour(p, { x, y }, marcheurs.length);
  marcheurs.forEach((id, k) => {
    affecter(p, id, { type: "aller" });
    const u = p.unites.get(id);
    const c = cases[k];
    if (u && c) u.chemin = chemin(p, u, c.x, c.y, 1, 0) ?? [];
  });
}

export function attaquer(p: Partie, ids: number[], cible: number): void {
  for (const id of ids) affecter(p, id, { type: "attaquer", cible });
}

// ---------- combat ----------

export const ennemis = (a: number, b: number) => a !== b;

// Comme dans AoE II : attaque + bonus contre sa classe − l'armure (mêlée ou perce), au moins 1.
export function degats(a: UniteId, cible: Unite | Batiment): number {
  const d = UNITES[a];
  const armure = "tache" in cible ? UNITES[cible.type].armure : BATIMENTS[cible.type].armure;
  const bonus = "tache" in cible ? (d.bonus?.[UNITES[cible.type].classe] ?? 0) : 0;
  return Math.max(1, d.attaque + bonus - armure[d.portee ? 1 : 0]);
}

// ---------- le temps qui passe ----------

// Le point est-il à moins de `marge` du rectangle (un point si w = 0) ?
const contre = (v: Point, x: number, y: number, w: number, marge = 0.75) =>
  Math.hypot(Math.max(x - v.x, 0, v.x - (x + w)), Math.max(y - v.y, 0, v.y - (y + w))) <= marge;

function avancer(u: Unite, dt: number): void {
  let pas = UNITES[u.type].vitesse * dt;
  while (pas > 0 && u.chemin.length) {
    const c = u.chemin[0];
    const d = Math.hypot(c.x - u.x, c.y - u.y);
    if (d <= pas) {
      u.x = c.x;
      u.y = c.y;
      u.chemin.shift();
      pas -= d;
    } else {
      u.x += ((c.x - u.x) / d) * pas;
      u.y += ((c.y - u.y) / d) * pas;
      pas = 0;
    }
  }
}

// Marche vers un rectangle ; false si c'est inaccessible.
function allerVers(p: Partie, u: Unite, x: number, y: number, w: number, dt: number, marge = 1): boolean {
  const but = `${x},${y},${w}`;
  if (u.but !== but || !u.chemin.length) {
    const c = chemin(p, u, x, y, w, marge);
    if (!c) return false;
    u.chemin = c;
    u.but = but;
  }
  avancer(u, dt);
  return true;
}

export function plusProche<T extends Point>(choix: Iterable<T>, de: Point, w: (t: T) => number, ok: (t: T) => boolean): T | undefined {
  let mieux: T | undefined;
  let dmin = Infinity;
  for (const t of choix) {
    if (!ok(t)) continue;
    const d = Math.hypot(t.x + w(t) / 2 - de.x, t.y + w(t) / 2 - de.y);
    if (d < dmin) [dmin, mieux] = [d, t];
  }
  return mieux;
}

export const taille = (b: Batiment) => BATIMENTS[b.type].taille;

// Marche jusqu'au bâtiment et y vide sa charge s'il la prend ; true une fois arrivé.
function deposer(p: Partie, u: Unite, b: Batiment, dt: number): boolean {
  if (!contre(u, b.x, b.y, taille(b))) {
    if (!allerVers(p, u, b.x, b.y, taille(b), dt)) u.tache = RIEN;
    return false;
  }
  if (u.charge && BATIMENTS[b.type].depot.includes(u.charge.res)) {
    p.camps[u.camp].stock[u.charge.res] += u.charge.n;
    u.charge = null;
  }
  u.chemin = [];
  u.but = "";
  return true;
}

function rentrer(p: Partie, u: Unite, dt: number): void {
  const res = u.charge!.res;
  const depot = plusProche(p.batiments.values(), u, taille, (b) => b.fini && b.camp === u.camp && BATIMENTS[b.type].depot.includes(res));
  if (depot) deposer(p, u, depot, dt); // shortcut: sans dépôt il attend sur place qu'on en bâtisse un
}

// Le bâtiment fini, le villageois se met au travail à côté, comme dans AoE.
function apresConstruction(p: Partie, u: Unite, b: Batiment | undefined): void {
  u.tache = RIEN;
  if (!b) return;
  if (b.type === "ferme") {
    const prise = [...p.unites.values()].some((o) => o.tache.type === "recolter" && o.tache.cible === b.id);
    if (!prise) affecter(p, u.id, { type: "recolter", cible: b.id, nature: "ferme" });
    return;
  }
  const depot = BATIMENTS[b.type].depot;
  const n = plusProche(p.noeuds.values(), u, () => 1, (n) => depot.includes(NATURE[n.nature].res) && Math.hypot(n.x - u.x, n.y - u.y) < 12);
  if (n) affecter(p, u.id, { type: "recolter", cible: n.id, nature: n.nature });
}

// La plus proche de cette nature qu'on peut atteindre : le cœur d'une forêt ne l'est pas.
function voisineAccessible(p: Partie, u: Unite, nature: NatureId): Noeud | undefined {
  const d = (n: Noeud) => Math.hypot(n.x - u.x, n.y - u.y);
  return [...p.noeuds.values()]
    .filter((n) => n.nature === nature && d(n) < 12)
    .sort((a, b) => d(a) - d(b))
    .slice(0, 8)
    .find((n) => chemin(p, u, n.x, n.y, 1, 1));
}

function recolter(p: Partie, u: Unite, t: Extract<Tache, { type: "recolter" }>, dt: number): void {
  if (u.charge && u.charge.n >= PORTEE) return rentrer(p, u, dt);
  const ferme = t.nature === "ferme" ? p.batiments.get(t.cible) : undefined;
  const noeud = t.nature === "ferme" ? undefined : p.noeuds.get(t.cible);
  if (!ferme && !noeud) {
    // source épuisée : la voisine de même nature, sinon on rentre déposer
    const n = t.nature !== "ferme" ? voisineAccessible(p, u, t.nature) : undefined;
    if (n) t.cible = n.id;
    else if (u.charge) rentrer(p, u, dt);
    else u.tache = RIEN;
    return;
  }
  const s = (ferme ?? noeud)!;
  const w = ferme ? taille(ferme) : 1;
  if (!contre(u, s.x, s.y, w)) {
    if (allerVers(p, u, s.x, s.y, w, dt)) return;
    const n = noeud && voisineAccessible(p, u, noeud.nature);
    if (n) t.cible = n.id;
    else u.tache = RIEN;
    return;
  }
  const res: Ressource = ferme ? "nourriture" : NATURE[noeud!.nature].res;
  if (u.charge?.res !== res) u.charge = { res, n: 0 }; // comme dans AoE, changer de ressource jette l'ancienne
  const q = Math.min((ferme ? FERME_CADENCE : NATURE[noeud!.nature].cadence) * dt, s.reste, PORTEE - u.charge.n);
  u.charge.n += q;
  s.reste -= q;
  if (s.reste <= 1e-9) {
    if (ferme) retirerBatiment(p, ferme);
    else retirerNoeud(p, noeud!);
  }
}

// Le soldat ennemi le plus proche à moins de `r` cases (les villageois ne comptent pas).
const menace = (p: Partie, u: Unite, r: number) =>
  plusProche(p.unites.values(), u, () => 0, (o) => ennemis(o.camp, u.camp) && o.type !== "villageois" && Math.hypot(o.x - u.x, o.y - u.y) <= r);

function blesser(p: Partie, c: Unite | Batiment, n: number): void {
  c.pv -= n;
  if (c.pv > 0) return;
  if ("tache" in c) p.unites.delete(c.id);
  else retirerBatiment(p, c);
}

// Approche la cible jusqu'à la portée, puis frappe à chaque recharge.
function combattre(p: Partie, u: Unite, t: Extract<Tache, { type: "attaquer" }>, dt: number): void {
  const c = p.unites.get(t.cible) ?? p.batiments.get(t.cible);
  if (!c) {
    u.tache = RIEN;
    return;
  }
  const d = UNITES[u.type];
  const unite = "tache" in c;
  // en route vers un bâtiment, on répond aux soldats qui s'en prennent à nous
  const riposte = unite ? undefined : menace(p, u, Math.min(d.vue, 4));
  if (riposte) {
    t.cible = riposte.id;
    return;
  }
  const w = unite ? 0 : taille(c);
  if (!contre(u, c.x, c.y, w, d.portee + 0.75)) {
    const ok = unite ? allerVers(p, u, Math.floor(c.x), Math.floor(c.y), 1, dt, 0) : allerVers(p, u, c.x, c.y, w, dt);
    if (!ok) u.tache = RIEN;
    return;
  }
  u.chemin = [];
  u.but = "";
  if (u.recharge > 0) return;
  // shortcut: les flèches touchent à l'instant, sans projectile qui vole ni qui rate.
  u.recharge = d.recharge;
  u.coup = p.temps;
  blesser(p, c, degats(u.type, c));
}

// Une unité de combat au repos attaque le premier ennemi qu'elle voit, comme
// la posture agressive d'AoE ; à défaut d'unité, un bâtiment (pas les loups).
// Les villageois, eux, attendent un ordre.
function guetter(p: Partie, u: Unite): void {
  const vue = UNITES[u.type].vue;
  const e =
    plusProche(p.unites.values(), u, () => 0, (o) => ennemis(o.camp, u.camp) && Math.hypot(o.x - u.x, o.y - u.y) <= vue) ??
    (u.camp === SAUVAGE ? undefined : plusProche(p.batiments.values(), u, taille, (b) => ennemis(b.camp, u.camp) && contre(u, b.x, b.y, taille(b), vue)));
  if (e) u.tache = { type: "attaquer", cible: e.id };
}

function majUnite(p: Partie, u: Unite, dt: number): void {
  u.recharge = Math.max(0, u.recharge - dt);
  if (u.tache.type === "rien" && u.type !== "villageois") guetter(p, u);
  const t = u.tache;
  if (t.type === "aller") {
    avancer(u, dt);
    if (!u.chemin.length) u.tache = RIEN;
  } else if (t.type === "construire") {
    const b = p.batiments.get(t.cible);
    if (!b || b.fini) return apresConstruction(p, u, b);
    if (!contre(u, b.x, b.y, taille(b))) {
      if (!allerVers(p, u, b.x, b.y, taille(b), dt)) u.tache = RIEN;
      return;
    }
    const def = BATIMENTS[b.type];
    b.construit += dt;
    b.pv = Math.min(def.pv, b.pv + (def.pv * dt) / def.duree); // il gagne ses PV en montant, comme dans AoE
    if (b.construit >= def.duree) terminer(b);
  } else if (t.type === "recolter") recolter(p, u, t, dt);
  else if (t.type === "deposer") {
    const b = p.batiments.get(t.cible);
    if (!b || deposer(p, u, b, dt)) u.tache = RIEN;
  } else if (t.type === "attaquer") combattre(p, u, t, dt);
}

function majFormation(p: Partie, b: Batiment, dt: number): void {
  const quoi = b.file[0];
  if (!quoi || (quoi !== "age" && popActuelle(p, b.camp) >= popMaxi(p, b.camp))) return;
  b.chrono += dt;
  if (b.chrono < dureeDe(p, quoi, b.camp)) return;
  if (quoi === "age") p.camps[b.camp].age++;
  else {
    const t = taille(b);
    const [c] = casesLibresAutour(p, { x: b.x + Math.floor(t / 2), y: b.y + t }, 1);
    if (!c) return;
    const u = ajouterUnite(p, quoi, c.x + 0.5, c.y + 0.5, b.camp);
    if (b.ralliement) ordonner(p, [u.id], b.ralliement.x, b.ralliement.y);
  }
  b.file.shift();
  b.chrono = 0;
}

function majDefense(p: Partie, b: Batiment, dt: number): void {
  b.recharge = Math.max(0, b.recharge - dt);
  if (b.recharge > 0) return;
  const t = taille(b);
  const e = plusProche(p.unites.values(), { x: b.x + t / 2, y: b.y + t / 2 }, () => 0, (u) => ennemis(u.camp, b.camp) && contre(u, b.x, b.y, t, HOTEL_TIR.portee));
  if (!e) return;
  b.recharge = HOTEL_TIR.recharge;
  b.tir = { cible: e.id, t: p.temps };
  blesser(p, e, Math.max(1, HOTEL_TIR.attaque - UNITES[e.type].armure[1]));
}

// Le brouillard du joueur : ce que voient ses unités et ses bâtiments.
function majVue(p: Partie): void {
  const T = p.taille;
  for (let i = 0; i < p.vu.length; i++) if (p.vu[i] === 2) p.vu[i] = 1;
  const voir = (cx: number, cy: number, r: number) => {
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(T - 1, Math.floor(cy + r)); y++)
      for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(T - 1, Math.floor(cx + r)); x++)
        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) p.vu[y * T + x] = 2;
  };
  for (const u of p.unites.values()) if (u.camp === 0) voir(u.x, u.y, UNITES[u.type].vue);
  for (const b of p.batiments.values()) if (b.camp === 0) voir(b.x + taille(b) / 2, b.y + taille(b) / 2, BATIMENTS[b.type].vue + taille(b) / 2);
}

export const visible = (p: Partie, x: number, y: number) => dedans(p, Math.floor(x), Math.floor(y)) && p.vu[Math.floor(y) * p.taille + Math.floor(x)] === 2;
export const explore = (p: Partie, x: number, y: number) => dedans(p, Math.floor(x), Math.floor(y)) && p.vu[Math.floor(y) * p.taille + Math.floor(x)] > 0;

// Conquête, comme dans AoE II : un camp sans unité ni bâtiment a perdu.
function majVictoire(p: Partie): void {
  if (p.vainqueur !== null || p.enJeu.length < 2) return;
  const vivants = new Set<number>();
  for (const u of p.unites.values()) vivants.add(u.camp);
  for (const b of p.batiments.values()) vivants.add(b.camp);
  const restants = p.enJeu.filter((c) => vivants.has(c));
  if (restants.length <= 1) p.vainqueur = restants[0] ?? null;
}

export function avancerPartie(p: Partie, secondes: number): void {
  if (p.vainqueur !== null) return;
  const dt = secondes * VITESSE;
  p.temps += dt;
  for (const b of p.batiments.values()) {
    if (!b.fini) continue;
    majFormation(p, b, dt);
    if (b.type === "hotel") majDefense(p, b, dt);
  }
  for (const u of p.unites.values()) majUnite(p, u, dt);
  majVue(p);
  majVictoire(p);
}
