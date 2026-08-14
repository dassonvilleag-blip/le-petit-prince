// La Colonie — une fourmilière en coupe, façon vivarium. On creuse, on
// construit, on élève, on part en expédition ; et la colonie vit en temps
// réel, même quand la page est fermée.

import {
  COLS,
  ROWS,
  ENTRANCE_COL,
  CREUSE_COUT,
  CREUSE_SECONDES_BASE,
  CREUSE_SECONDES_PAR_RANG,
  CHANTIERS_MAX,
  EXPEDITIONS,
  REINE,
  REINE_MAX,
  REINE_W,
  REINE_H,
  RESOURCES,
  SALLES,
  SALLE_PAR_ID,
  SYMBIOTES,
  UNITES,
  UNITE_PAR_ID,
  type Cost,
  type ResourceId,
  type RoomDef,
  type UnitId,
} from "./data";
import {
  advance,
  chantiersEnCours,
  creusable,
  estCreusee,
  fileMax,
  load,
  nbSalles,
  peutPayer,
  popMax,
  popTotale,
  prodParMinute,
  save,
  stockMax,
  type ColonyState,
  type RoomState,
} from "./state";
import { ameliorerReine, ameliorerSalle, construire, creuser, lancerExpedition, pondre } from "./actions";
import {
  apercuReine,
  apercuSalle,
  avisConstruction,
  avisCreuse,
  coutCreuse,
  htmlCout,
  pronostic,
} from "./previews";

// ---- illustrations (générées, voir public/colonie/) ----

const IMG_BASE = "../../colonie/"; // relatif à /games/la-colonie/, suit la base Vite
const IMG_VERSION = 2; // à incrémenter quand une illustration change, pour casser le cache
const IMAGES = new Map<string, HTMLImageElement>();

function imgUrl(id: string): string {
  return `${IMG_BASE}${id}.jpg?v=${IMG_VERSION}`;
}

function image(id: string): HTMLImageElement | null {
  let im = IMAGES.get(id);
  if (!im) {
    im = new Image();
    im.src = imgUrl(id);
    IMAGES.set(id, im);
  }
  return im.complete && im.naturalWidth > 0 ? im : null;
}

// préchargement
for (const id of [
  "reine",
  "nurserie",
  "grenier",
  "champignonniere",
  "etable",
  "ouvriere",
  "soldate",
  "exp-clairiere",
  "exp-vieux-chene",
  "exp-pucerons",
  "sp-pucerons",
  "sp-lucioles",
  "sp-scarabees",
  "sp-abeilles",
  "sp-mante",
])
  image(id);

const EXP_IMG: Record<string, string> = {
  clairiere: "exp-clairiere",
  "vieux-chene": "exp-vieux-chene",
  "capture-pucerons": "exp-pucerons",
};

// ---- DOM ----

const canvas = document.getElementById("colonie") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const hudRes = document.getElementById("hud-res")!;
const hudPop = document.getElementById("hud-pop")!;
const panelEl = document.getElementById("panel")!;
const panelBody = document.getElementById("panel-body")!;
const panelTitle = document.getElementById("panel-title")!;
const bandeau = document.getElementById("bandeau")!;
const toastEl = document.getElementById("toast")!;
const popupEl = document.getElementById("popup")!;
const badgeRapports = document.getElementById("badge-rapports")!;
const hint = document.getElementById("hint")!;

let W = 0;
let H = 0;

// ---- état ----

const state: ColonyState = load(Date.now());

type Mode = { type: "normal" } | { type: "dig" } | { type: "build"; def: RoomDef };
let mode: Mode = { type: "normal" };
let panelOuvert: string | null = null;
let hover: { x: number; y: number } | null = null;
const escouades = new Map<string, Record<UnitId, number>>(); // sélection par expédition

// ---- utilitaires ----

let toastTimer = 0;
function toast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2600);
}

function fmtCout(cout: Cost): string {
  const parts: string[] = [];
  for (const [r, n] of Object.entries(cout) as [ResourceId, number][])
    parts.push(`${n} ${RESOURCES[r].emoji}`);
  return parts.length ? parts.join(" · ") : "gratuit";
}

function fmtDuree(secondes: number): string {
  if (secondes < 60) return `${Math.ceil(secondes)}s`;
  if (secondes < 3600) return `${Math.floor(secondes / 60)}min ${Math.ceil(secondes % 60)}s`;
  return `${Math.floor(secondes / 3600)}h ${Math.floor((secondes % 3600) / 60)}min`;
}

function resteMs(fin: number): string {
  return fmtDuree(Math.max(0, fin - Date.now()) / 1000);
}

// ---- géométrie de la grille ----

let cell = 40;
let gridX = 0;
let gridY = 0; // haut de la rangée 0 (niveau du sol)

function layout(): void {
  cell = Math.min((W * 0.94) / COLS, (H * 0.66) / ROWS);
  gridX = (W - cell * COLS) / 2;
  gridY = H * 0.2;
}

function cellAt(px: number, py: number): { x: number; y: number } | null {
  const x = Math.floor((px - gridX) / cell);
  const y = Math.floor((py - gridY) / cell);
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return null;
  return { x, y };
}

// ---- fourmis vivantes ----
// Les fourmis parcourent réellement le réseau : marche de cellule creusée en
// cellule creusée, pattes animées, allers-retours de récolte en surface.

interface Fourmi {
  x: number; // position en cellules (fractionnaire)
  y: number;
  tx: number; // centre de la cellule cible
  ty: number;
  px: number; // cellule d'où l'on vient (pour éviter les demi-tours)
  py: number;
  vitesse: number;
  phase: number; // animation des pattes
  surface: boolean;
  feuille: boolean; // porte une feuille (récolte en surface)
}

const fourmis: Fourmi[] = [];

const VOISINS4 = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

function prochaineCellule(f: Fourmi): { x: number; y: number } | null {
  const cx = Math.round(f.tx);
  const cy = Math.round(f.ty);
  const options: { x: number; y: number }[] = [];
  for (const [dx, dy] of VOISINS4) {
    const nx = cx + dx;
    const ny = cy + dy;
    if (estCreusee(state, nx, ny)) options.push({ x: nx, y: ny });
  }
  if (!options.length) return null;
  // éviter de revenir sur ses pas, sauf cul-de-sac
  const avant = options.filter((o) => !(o.x === Math.round(f.px) && o.y === Math.round(f.py)));
  const parmi = avant.length ? avant : options;
  return parmi[Math.floor(Math.random() * parmi.length)];
}

function syncFourmis(): void {
  const visibles = Math.min(16, Math.max(3, popTotale(state)));
  while (fourmis.length < visibles) {
    const surface = Math.random() < 0.4;
    fourmis.push({
      x: ENTRANCE_COL + (Math.random() - 0.5) * 0.3,
      y: surface ? -0.42 : 0.5 + Math.random() * 1.5,
      tx: ENTRANCE_COL,
      ty: surface ? -0.42 : 1,
      px: ENTRANCE_COL,
      py: surface ? -0.42 : 0,
      vitesse: 0.55 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
      surface,
      feuille: false,
    });
  }
  if (fourmis.length > visibles) fourmis.length = visibles;
}

function bougeFourmis(dt: number): void {
  for (const f of fourmis) {
    f.phase += dt * (6 + f.vitesse * 6);
    const dx = f.tx - f.x;
    const dy = f.ty - f.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.06) {
      if (f.surface) {
        // navette : partir chercher une feuille, la ramener au dôme
        if (f.feuille && Math.abs(f.x - ENTRANCE_COL) < 0.4) f.feuille = false;
        else if (!f.feuille && Math.abs(f.x - ENTRANCE_COL) > 2) f.feuille = true;
        f.px = f.tx;
        f.py = f.ty;
        f.tx = f.feuille ? ENTRANCE_COL + (Math.random() - 0.5) * 0.5 : 0.5 + Math.random() * (COLS - 1);
        f.ty = -0.42;
      } else {
        const suivante = prochaineCellule(f);
        if (suivante) {
          f.px = f.tx;
          f.py = f.ty;
          f.tx = suivante.x + (Math.random() - 0.5) * 0.25;
          f.ty = suivante.y + (Math.random() - 0.5) * 0.25;
        }
      }
    } else {
      f.x += (dx / d) * f.vitesse * dt;
      f.y += (dy / d) * f.vitesse * dt;
    }
  }
}

// ---- particules ----

interface Particule {
  x: number; // pixels
  y: number;
  vx: number;
  vy: number;
  vie: number;
  max: number;
  taille: number;
  teinte: string;
  gravite: number;
  balancement: number; // pour les feuilles qui tombent
}

const particules: Particule[] = [];

function emet(x: number, y: number, teinte: string, options?: Partial<Particule>): void {
  if (particules.length > 220) return;
  particules.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 40,
    vy: -30 - Math.random() * 50,
    vie: 0,
    max: 0.5 + Math.random() * 0.5,
    taille: 1.5 + Math.random() * 2.5,
    teinte,
    gravite: 220,
    balancement: 0,
    ...options,
  });
}

let prochaineFeuille = 2;

function majParticules(dt: number, t: number): void {
  // la terre vole sur les chantiers de creusage
  for (const d of state.digs)
    if (Math.random() < dt * 9)
      emet(gridX + (d.x + 0.3 + Math.random() * 0.4) * cell, gridY + (d.y + 0.55) * cell, "#4a3018");
  // les marteaux des chantiers de salle font aussi des éclats
  for (const r of state.rooms)
    if (r.chantierFin !== null && Math.random() < dt * 5) {
      const def = r.type === "reine" ? { w: REINE_W, h: REINE_H } : SALLE_PAR_ID.get(r.type)!;
      emet(gridX + (r.x + Math.random() * def.w) * cell, gridY + (r.y + 0.4) * cell, "#5e3d22");
    }
  // de temps en temps, une feuille tombe du ciel
  prochaineFeuille -= dt;
  if (prochaineFeuille <= 0) {
    prochaineFeuille = 3 + Math.random() * 5;
    emet(Math.random() * W, -10, ["#7cb268", "#9ec97f", "#5e9a53"][Math.floor(Math.random() * 3)], {
      vx: 0,
      vy: 26 + Math.random() * 14,
      max: (gridY + 10) / 32,
      taille: 3.5 + Math.random() * 2,
      gravite: 0,
      balancement: 1.4 + Math.random(),
    });
  }
  for (let i = particules.length - 1; i >= 0; i--) {
    const p = particules[i];
    p.vie += dt;
    if (p.vie >= p.max) {
      particules.splice(i, 1);
      continue;
    }
    p.vy += p.gravite * dt;
    p.x += p.vx * dt + (p.balancement ? Math.sin(t * 2.2 + p.y * 0.05) * 28 * dt : 0);
    p.y += p.vy * dt;
  }
}

function drawParticules(t: number): void {
  for (const p of particules) {
    const restant = 1 - p.vie / p.max;
    ctx.globalAlpha = Math.min(1, restant * 2.5);
    ctx.fillStyle = p.teinte;
    if (p.balancement) {
      // petite feuille qui virevolte
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(t * 2.2 + p.y * 0.05) * 0.9);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.taille * 1.5, p.taille * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.taille * restant + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ---- rendu ----

// deux tampons hors écran : la silhouette du réseau creusé, et sa version
// teintée — c'est ce qui permet de fusionner tunnels et salles en une seule
// forme organique avec un liseré de terre claire tout autour
const silCanvas = document.createElement("canvas");
const silCtx = silCanvas.getContext("2d")!;
const teinteCanvas = document.createElement("canvas");
const teinteCtx = teinteCanvas.getContext("2d")!;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const [c, cc] of [
    [silCanvas, silCtx],
    [teinteCanvas, teinteCtx],
  ] as const) {
    c.width = W * dpr;
    c.height = H * dpr;
    cc.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  layout();
}

// petit bruit stable pour les mouchetures de la terre
function speckle(i: number): number {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

function drawFond(t: number): void {
  // ciel
  const ciel = ctx.createLinearGradient(0, 0, 0, gridY);
  ciel.addColorStop(0, "#9ed4ee");
  ciel.addColorStop(1, "#e7f3d8");
  ctx.fillStyle = ciel;
  ctx.fillRect(0, 0, W, gridY);

  // soleil et son halo
  const sx0 = W * 0.82;
  const sy0 = gridY * 0.32;
  const halo = ctx.createRadialGradient(sx0, sy0, 5, sx0, sy0, gridY * 0.8);
  halo.addColorStop(0, "rgba(255,236,170,0.9)");
  halo.addColorStop(1, "rgba(255,236,170,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, gridY);
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.arc(sx0, sy0, Math.min(30, gridY * 0.26), 0, Math.PI * 2);
  ctx.fill();

  // nuages paresseux
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let n = 0; n < 3; n++) {
    const nx = ((speckle(n + 40) * 1.4 * W + t * (5 + n * 3)) % (W + 260)) - 130;
    const ny = gridY * (0.2 + speckle(n + 50) * 0.4);
    const s = 0.7 + speckle(n + 60) * 0.7;
    for (const [ox, oy, r] of [
      [0, 0, 26],
      [22, 6, 18],
      [-24, 7, 16],
      [4, -10, 17],
    ])
      ctx.beginPath(), ctx.ellipse(nx + ox * s, ny + oy * s, r * s, r * s * 0.72, 0, 0, Math.PI * 2), ctx.fill();
  }

  // terre en strates douces
  const terre = ctx.createLinearGradient(0, gridY, 0, H);
  terre.addColorStop(0, "#8a5a33");
  terre.addColorStop(0.35, "#6f462a");
  terre.addColorStop(0.7, "#57351e");
  terre.addColorStop(1, "#3a2314");
  ctx.fillStyle = terre;
  ctx.fillRect(0, gridY, W, H - gridY);

  // limites de strates légèrement ondulées
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 3;
  for (let s = 1; s <= 3; s++) {
    const sy = gridY + ((H - gridY) * s) / 4;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 24)
      ctx.lineTo(x, sy + Math.sin(x * 0.02 + s * 7) * 6);
    ctx.stroke();
  }

  // cailloux et radicelles (stables, seedés)
  for (let i = 0; i < 90; i++) {
    const px = speckle(i) * W;
    const py = gridY + 14 + speckle(i + 300) * (H - gridY - 20);
    const r = 1.5 + speckle(i + 600) * 3.5;
    ctx.fillStyle = speckle(i + 700) < 0.5 ? "rgba(0,0,0,0.14)" : "rgba(255,230,190,0.07)";
    ctx.beginPath();
    ctx.ellipse(px, py, r * 1.3, r, speckle(i + 800) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(30,16,6,0.16)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) {
    const px = speckle(i + 20) * W;
    let py = gridY + 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    let dx = 0;
    const long = 30 + speckle(i + 25) * 70;
    for (let s = 0; s < 5; s++) {
      dx += (speckle(i * 7 + s) - 0.5) * 26;
      py += long / 5;
      ctx.lineTo(px + dx, py);
    }
    ctx.stroke();
  }

  // herbe
  ctx.fillStyle = "#588157";
  ctx.fillRect(0, gridY - 7, W, 10);
  ctx.strokeStyle = "#3a5a40";
  ctx.lineWidth = 2;
  for (let i = 0; i < W; i += 8) {
    const h = 5 + speckle(i) * 10;
    const sway = Math.sin(t * 1.4 + i * 0.4) * 2;
    ctx.beginPath();
    ctx.moveTo(i, gridY - 5);
    ctx.quadraticCurveTo(i + sway * 0.4, gridY - 5 - h * 0.6, i + sway, gridY - 5 - h);
    ctx.stroke();
  }
  // quelques fleurs
  for (let i = 0; i < 8; i++) {
    const fx = speckle(i + 90) * W;
    if (Math.abs(fx - (gridX + (ENTRANCE_COL + 0.5) * cell)) < cell * 1.4) continue;
    const fh = 10 + speckle(i + 95) * 8;
    const sway = Math.sin(t * 1.4 + fx * 0.4) * 2;
    ctx.strokeStyle = "#3a5a40";
    ctx.beginPath();
    ctx.moveTo(fx, gridY - 4);
    ctx.quadraticCurveTo(fx + sway * 0.5, gridY - 4 - fh * 0.6, fx + sway, gridY - 4 - fh);
    ctx.stroke();
    ctx.fillStyle = ["#ff5c8a", "#ffc93c", "#b388eb", "#ff8c42"][i % 4];
    ctx.beginPath();
    ctx.arc(fx + sway, gridY - 5 - fh, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fffdf4";
    ctx.beginPath();
    ctx.arc(fx + sway, gridY - 5 - fh, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // dôme de l'entrée : petit volcan de terre aux couches claires
  const ex = gridX + (ENTRANCE_COL + 0.5) * cell;
  for (const [ry, teinte] of [
    [1.15, "#7a5230"],
    [0.9, "#8a5f3a"],
    [0.62, "#9a6c42"],
  ] as const) {
    ctx.fillStyle = teinte;
    ctx.beginPath();
    ctx.ellipse(ex, gridY - 3, cell * ry, cell * ry * 0.52, 0, Math.PI, 0);
    ctx.fill();
  }
  ctx.fillStyle = "#241407";
  ctx.beginPath();
  ctx.ellipse(ex, gridY - 4, cell * 0.3, cell * 0.34, 0, Math.PI, 0);
  ctx.fill();
}

// ---- silhouette organique du réseau ----
// Tout ce qui est creusé (tunnels, salles, chantiers) est peint en une seule
// silhouette sur un tampon, puis reporté à l'écran : d'abord décalé en anneau
// pour le liseré de terre claire, ensuite teinté sombre pour la cavité.

function dimsSalle(room: RoomState): { w: number; h: number } {
  return room.type === "reine" ? { w: REINE_W, h: REINE_H } : SALLE_PAR_ID.get(room.type)!;
}

// forme d'une salle : rectangle très arrondi + bosses seedées sur le pourtour
function traceSalle(cc: CanvasRenderingContext2D, room: RoomState): void {
  const { w, h } = dimsSalle(room);
  const px = gridX + room.x * cell;
  const py = gridY + room.y * cell;
  const m = cell * 0.08;
  cc.beginPath();
  cc.roundRect(px + m, py + m, w * cell - 2 * m, h * cell - 2 * m, cell * 0.5);
  cc.fill();
  for (let i = 0; i < 5; i++) {
    const a = speckle(room.uid * 13 + i) * Math.PI * 2;
    const bx = px + (w * cell) / 2 + Math.cos(a) * (w * cell * 0.38);
    const by = py + (h * cell) / 2 + Math.sin(a) * (h * cell * 0.34);
    cc.beginPath();
    cc.arc(bx, by, cell * (0.18 + speckle(room.uid * 31 + i) * 0.14), 0, Math.PI * 2);
    cc.fill();
  }
}

function chemineSalle(room: RoomState): Path2D {
  const { w, h } = dimsSalle(room);
  const px = gridX + room.x * cell;
  const py = gridY + room.y * cell;
  const m = cell * 0.08;
  const p = new Path2D();
  p.roundRect(px + m, py + m, w * cell - 2 * m, h * cell - 2 * m, cell * 0.5);
  return p;
}

function traceReseau(cc: CanvasRenderingContext2D): void {
  cc.clearRect(0, 0, W, H);
  cc.fillStyle = "#000";
  cc.strokeStyle = "#000";
  cc.lineCap = "round";

  // le puits de l'entrée plonge depuis la surface
  cc.lineWidth = cell * 0.5;
  cc.beginPath();
  cc.moveTo(gridX + (ENTRANCE_COL + 0.5) * cell, gridY - cell * 0.25);
  cc.lineTo(gridX + (ENTRANCE_COL + 0.5) * cell, gridY + 0.5 * cell);
  cc.stroke();

  // tunnels : une bulle par cellule, des cordons vers les voisines creusées
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      if (!state.dug[y * COLS + x]) continue;
      const cx = gridX + (x + 0.5) * cell;
      const cy = gridY + (y + 0.5) * cell;
      cc.beginPath();
      cc.arc(cx, cy, cell * (0.3 + speckle(x * 91 + y * 57) * 0.09), 0, Math.PI * 2);
      cc.fill();
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
      ])
        if (estCreusee(state, x + dx, y + dy)) {
          cc.lineWidth = cell * (0.42 + speckle(x * 17 + y * 43) * 0.1);
          cc.beginPath();
          cc.moveTo(cx, cy);
          cc.lineTo(gridX + (x + dx + 0.5) * cell, gridY + (y + dy + 0.5) * cell);
          cc.stroke();
        }
    }

  // chantiers de creusage : la bulle grandit avec l'avancement
  for (const d of state.digs) {
    const total = (CREUSE_SECONDES_BASE + CREUSE_SECONDES_PAR_RANG * d.y) * 1000;
    const avancement = Math.min(1, Math.max(0.12, 1 - (d.fin - Date.now()) / total));
    cc.beginPath();
    cc.arc(gridX + (d.x + 0.5) * cell, gridY + (d.y + 0.5) * cell, cell * 0.36 * avancement, 0, Math.PI * 2);
    cc.fill();
  }

  for (const room of state.rooms) traceSalle(cc, room);
}

// reporte la silhouette teintée d'une couleur (ou d'un dégradé) sur `ctx`
function teinteEt(remplissage: string | CanvasGradient, ox: number, oy: number): void {
  teinteCtx.save();
  teinteCtx.setTransform(1, 0, 0, 1, 0, 0);
  teinteCtx.clearRect(0, 0, teinteCanvas.width, teinteCanvas.height);
  teinteCtx.drawImage(silCanvas, 0, 0);
  teinteCtx.restore();
  // source-in : la couleur ne se dépose QUE sur la silhouette du réseau
  teinteCtx.globalCompositeOperation = "source-in";
  teinteCtx.fillStyle = remplissage;
  teinteCtx.fillRect(0, 0, W, H);
  teinteCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(teinteCanvas, ox, oy, W, H);
}

function drawReseau(): void {
  traceReseau(silCtx);
  // liseré de terre claire tout autour du réseau
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    teinteEt("#a97445", Math.cos(a) * 4, Math.sin(a) * 4);
  }
  // ombre portée vers le bas, puis la cavité sombre elle-même
  teinteEt("rgba(20,10,3,0.55)", 0, 5);
  const fond = ctx.createLinearGradient(0, gridY, 0, H);
  fond.addColorStop(0, "#2e1b0c");
  fond.addColorStop(1, "#1c0f05");
  teinteEt(fond, 0, 0);
}

// petite étiquette d'information dessinée près d'une case (préviews de mode)
function chip(px: number, py: number, lignes: string[], ok: boolean): void {
  ctx.font = `${Math.max(13, cell * 0.32)}px "VT323", monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const pad = 8;
  const lh = Math.max(15, cell * 0.36);
  const wMax = Math.max(...lignes.map((l) => ctx.measureText(l).width));
  let bx = px + cell * 0.6;
  let by = py - lh * lignes.length - 10;
  bx = Math.min(bx, W - wMax - pad * 2 - 8);
  by = Math.max(by, 8);
  ctx.fillStyle = ok ? "rgba(23,23,27,0.88)" : "rgba(120,30,30,0.9)";
  ctx.beginPath();
  ctx.roundRect(bx, by, wMax + pad * 2, lh * lignes.length + pad, 8);
  ctx.fill();
  ctx.fillStyle = "#fffdf4";
  lignes.forEach((l, i) => ctx.fillText(l, bx + pad, by + pad / 2 + lh * (i + 0.5)));
}

// une fourmi stylisée : trois segments, pattes animées, antennes
function peindreFourmi(
  px: number,
  py: number,
  taille: number,
  angle: number,
  phase: number,
  teinte = "#241206",
  feuille = false
): void {
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);
  ctx.strokeStyle = teinte;
  ctx.fillStyle = teinte;
  ctx.lineWidth = Math.max(1, taille * 0.09);
  // pattes : trois paires qui trottinent
  for (let i = 0; i < 3; i++) {
    const balance = Math.sin(phase + i * 2.1) * 0.45;
    for (const cote of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo((i - 1) * taille * 0.22, 0);
      ctx.lineTo((i - 1) * taille * 0.22 + balance * taille * 0.3, cote * taille * 0.34);
      ctx.stroke();
    }
  }
  // abdomen, thorax, tête
  ctx.beginPath();
  ctx.ellipse(-taille * 0.34, 0, taille * 0.3, taille * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, taille * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(taille * 0.28, 0, taille * 0.15, 0, Math.PI * 2);
  ctx.fill();
  // antennes
  for (const cote of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(taille * 0.38, cote * taille * 0.04);
    ctx.quadraticCurveTo(taille * 0.55, cote * taille * 0.22, taille * 0.62, cote * taille * 0.14);
    ctx.stroke();
  }
  // reflet sur l'abdomen
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.ellipse(-taille * 0.4, -taille * 0.07, taille * 0.1, taille * 0.05, -0.4, 0, Math.PI * 2);
  ctx.fill();
  if (feuille) {
    ctx.fillStyle = "#7cb268";
    ctx.beginPath();
    ctx.ellipse(taille * 0.1, -taille * 0.3, taille * 0.34, taille * 0.18, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5e9a53";
    ctx.beginPath();
    ctx.moveTo(-taille * 0.12, -taille * 0.18);
    ctx.lineTo(taille * 0.32, -taille * 0.44);
    ctx.stroke();
  }
  ctx.restore();
}

// halo lumineux chaleureux (lanternes, champignons)
function halo(px: number, py: number, r: number, alpha: number, teinte = "255,209,102"): void {
  const g = ctx.createRadialGradient(px, py, 0, px, py, r);
  g.addColorStop(0, `rgba(${teinte},${alpha})`);
  g.addColorStop(1, `rgba(${teinte},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fill();
}

// ---- intérieurs des salles, dessinés et animés ----

function interieurReine(cx: number, cy: number, w: number, h: number, t: number): void {
  // lit de feuilles
  ctx.fillStyle = "#4c6b3c";
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(cx + i * cell * 0.35, cy + h * 0.32, cell * 0.34, cell * 0.14, i * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  // lanternes de miel qui tremblotent
  for (const cote of [-1, 1]) {
    const lx = cx + cote * w * 0.36;
    const ly = cy - h * 0.18;
    halo(lx, ly, cell * 0.55, 0.3 + 0.08 * Math.sin(t * 3 + cote));
    ctx.fillStyle = "#e8a54b";
    ctx.beginPath();
    ctx.ellipse(lx, ly, cell * 0.1, cell * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7a5230";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, ly - cell * 0.13);
    ctx.lineTo(lx, cy - h * 0.5);
    ctx.stroke();
  }
  // la Reine, qui respire doucement
  const souffle = 1 + 0.05 * Math.sin(t * 1.7);
  ctx.fillStyle = "#2b1608";
  ctx.beginPath();
  ctx.ellipse(cx - cell * 0.34, cy + h * 0.06, cell * 0.42, cell * 0.28 * souffle, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + cell * 0.12, cy + h * 0.02, cell * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + cell * 0.4, cy - h * 0.04, cell * 0.15, 0, Math.PI * 2);
  ctx.fill();
  // rayures dorées sur l'abdomen
  ctx.strokeStyle = "rgba(255,209,102,0.5)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(cx - cell * (0.2 + i * 0.16), cy + h * 0.06, cell * 0.24 * souffle, -1.1, 1.1);
    ctx.stroke();
  }
  // œil et couronne
  ctx.fillStyle = "#fffdf4";
  ctx.beginPath();
  ctx.arc(cx + cell * 0.45, cy - h * 0.08, cell * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  const kx = cx + cell * 0.4;
  const ky = cy - h * 0.04 - cell * 0.19;
  ctx.moveTo(kx - cell * 0.1, ky);
  ctx.lineTo(kx - cell * 0.1, ky - cell * 0.09);
  ctx.lineTo(kx - cell * 0.045, ky - cell * 0.045);
  ctx.lineTo(kx, ky - cell * 0.11);
  ctx.lineTo(kx + 0.045 * cell, ky - cell * 0.045);
  ctx.lineTo(kx + cell * 0.1, ky - cell * 0.09);
  ctx.lineTo(kx + cell * 0.1, ky);
  ctx.closePath();
  ctx.fill();
  // antennes
  ctx.strokeStyle = "#2b1608";
  ctx.lineWidth = 2;
  for (const cote of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + cell * 0.48, cy - h * 0.1);
    ctx.quadraticCurveTo(cx + cell * 0.62, cy - h * 0.3, cx + cell * (0.56 + 0.12 * cote), cy - h * 0.36);
    ctx.stroke();
  }
}

function interieurNurserie(cx: number, cy: number, w: number, h: number, t: number, uid: number): void {
  ctx.fillStyle = "#557a44";
  ctx.beginPath();
  ctx.ellipse(cx, cy + h * 0.3, w * 0.42, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 7; i++) {
    const ex = cx + ((i % 4) - 1.5) * cell * 0.26 + (i > 3 ? cell * 0.13 : 0);
    const ey = cy + (i > 3 ? h * 0.02 : h * 0.2);
    const fremis = Math.sin(t * 2.4 + i * 1.7 + uid) * 0.06;
    ctx.fillStyle = "#f6efdf";
    ctx.beginPath();
    ctx.ellipse(ex, ey, cell * 0.11, cell * 0.15 * (1 + fremis), fremis * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.ellipse(ex - cell * 0.03, ey - cell * 0.05, cell * 0.03, cell * 0.045, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function interieurGrenier(cx: number, cy: number, w: number, h: number): void {
  const cap = stockMax(state);
  const sol = cy + h * 0.38;
  // pile de feuilles (grandit avec la réserve)
  const nF = 2 + Math.round((state.res.feuilles / cap) * 6);
  ctx.fillStyle = "#6f9c53";
  for (let i = 0; i < nF; i++) {
    ctx.beginPath();
    ctx.ellipse(
      cx - w * 0.26 + (i % 3) * cell * 0.12 - cell * 0.12,
      sol - Math.floor(i / 3) * cell * 0.12,
      cell * 0.2,
      cell * 0.09,
      (i % 3) * 0.3 - 0.3,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  // tas de champignons séchés
  const nC = Math.round((state.res.champignons / cap) * 9);
  ctx.fillStyle = "#d9a05b";
  for (let i = 0; i < nC; i++) {
    ctx.beginPath();
    ctx.arc(
      cx + w * 0.1 + (i % 3) * cell * 0.11,
      sol - Math.floor(i / 3) * cell * 0.1 - cell * 0.04,
      cell * 0.055,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  // jarre de miellat, remplie selon la réserve
  const jx = cx + w * 0.32;
  ctx.fillStyle = "#c8b08e";
  ctx.beginPath();
  ctx.ellipse(jx, sol - cell * 0.12, cell * 0.11, cell * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  const niveau = Math.min(1, state.res.miellat / Math.max(60, cap * 0.2));
  if (niveau > 0.02) {
    ctx.fillStyle = "#e8a54b";
    ctx.beginPath();
    ctx.ellipse(jx, sol - cell * 0.06 - niveau * cell * 0.08, cell * 0.08, cell * 0.1 * niveau, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function interieurChampignonniere(cx: number, cy: number, w: number, h: number, t: number, room: RoomState): void {
  ctx.fillStyle = "#2a1a0c";
  ctx.beginPath();
  ctx.ellipse(cx, cy + h * 0.36, w * 0.44, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  const n = 2 + room.level * 2;
  const teintes = ["#e0793f", "#e8a54b", "#b5c96b"];
  for (let i = 0; i < n; i++) {
    const mx = cx + (speckle(room.uid * 7 + i) - 0.5) * w * 0.72;
    const base = cy + h * 0.34;
    const haut = cell * (0.22 + speckle(room.uid * 11 + i) * 0.22);
    const pulse = 0.2 + 0.1 * Math.sin(t * 2 + i * 1.9);
    halo(mx, base - haut, cell * 0.4, pulse);
    ctx.fillStyle = "#efe3c8";
    ctx.beginPath();
    ctx.roundRect(mx - cell * 0.045, base - haut, cell * 0.09, haut, cell * 0.04);
    ctx.fill();
    ctx.fillStyle = teintes[i % 3];
    ctx.beginPath();
    ctx.ellipse(mx, base - haut, cell * (0.13 + speckle(room.uid + i) * 0.06), cell * 0.09, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "rgba(255,253,244,0.8)";
    for (let d = 0; d < 3; d++) {
      ctx.beginPath();
      ctx.arc(mx + (speckle(i * 5 + d) - 0.5) * cell * 0.16, base - haut - cell * 0.035, cell * 0.014, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function interieurEtable(cx: number, cy: number, w: number, h: number, t: number, room: RoomState): void {
  const n = 2 + room.level;
  for (let i = 0; i < n; i++) {
    const ax = cx + (speckle(room.uid * 5 + i) - 0.5) * w * 0.66;
    const ay = cy + h * 0.24 + (speckle(room.uid * 9 + i) - 0.5) * h * 0.18;
    // litière de paille
    ctx.fillStyle = "#caa54e";
    ctx.beginPath();
    ctx.ellipse(ax, ay + cell * 0.09, cell * 0.24, cell * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    // puceron dodu qui respire
    const souffle = 1 + 0.07 * Math.sin(t * 1.4 + i * 2.3);
    ctx.fillStyle = "#b9d39a";
    ctx.beginPath();
    ctx.ellipse(ax, ay, cell * 0.17, cell * 0.12 * souffle, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9ab97e";
    for (let d = 0; d < 3; d++) {
      ctx.beginPath();
      ctx.arc(ax - cell * 0.08 + d * cell * 0.08, ay - cell * 0.04, cell * 0.022, 0, Math.PI * 2);
      ctx.fill();
    }
    // œil fermé (il dort)
    ctx.strokeStyle = "#5c7a48";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ax + cell * 0.11, ay - cell * 0.02, cell * 0.03, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // goutte de miellat qui perle près de la lanterne
  halo(cx + w * 0.34, cy - h * 0.2, cell * 0.4, 0.25 + 0.08 * Math.sin(t * 2.6));
  ctx.fillStyle = "#e8a54b";
  ctx.beginPath();
  ctx.arc(cx + w * 0.34, cy - h * 0.2, cell * 0.06, 0, Math.PI * 2);
  ctx.fill();
}

function drawColonie(t: number): void {
  drawReseau();

  for (const room of state.rooms) {
    const { w, h } = dimsSalle(room);
    const px = gridX + room.x * cell;
    const py = gridY + room.y * cell;
    const cx = px + (w * cell) / 2;
    const cy = py + (h * cell) / 2;

    if (room.level > 0) {
      ctx.save();
      ctx.clip(chemineSalle(room));
      // lueur d'occupation au sol
      halo(cx, cy + h * cell * 0.2, Math.max(w, h) * cell * 0.5, 0.06);
      if (room.type === "reine") interieurReine(cx, cy, w * cell, h * cell, t);
      else if (room.type === "nurserie") interieurNurserie(cx, cy, w * cell, h * cell, t, room.uid);
      else if (room.type === "grenier") interieurGrenier(cx, cy, w * cell, h * cell);
      else if (room.type === "champignonniere") interieurChampignonniere(cx, cy, w * cell, h * cell, t, room);
      else if (room.type === "etable") interieurEtable(cx, cy, w * cell, h * cell, t, room);
      ctx.restore();
    } else {
      // en chantier : étais de bois et tas de terre
      ctx.save();
      ctx.clip(chemineSalle(room));
      ctx.strokeStyle = "rgba(180,130,80,0.5)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(px + ((i + 0.5) * (w * cell)) / 3, py + h * cell);
        ctx.lineTo(px + ((i + 0.5) * (w * cell)) / 3, py);
        ctx.stroke();
      }
      ctx.fillStyle = "#4a3018";
      ctx.beginPath();
      ctx.ellipse(cx, py + h * cell - cell * 0.1, w * cell * 0.3, cell * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // pastilles de niveau
    if (room.level > 0 && room.type !== "reine") {
      ctx.fillStyle = "#ffd166";
      ctx.strokeStyle = "#241206";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < room.level; i++) {
        ctx.beginPath();
        ctx.arc(px + cell * 0.3 + i * 9, py + h * cell - cell * 0.22, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    if (room.type === "reine") {
      ctx.font = `${cell * 0.26}px "VT323", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const badge = `✦ niv. ${state.reineLevel} ✦`;
      ctx.fillStyle = "rgba(23,18,6,0.6)";
      const bw = ctx.measureText(badge).width + 10;
      ctx.beginPath();
      ctx.roundRect(cx - bw / 2, py + h * cell - cell * 0.36, bw, cell * 0.3, 6);
      ctx.fill();
      ctx.fillStyle = "#ffd166";
      ctx.fillText(badge, cx, py + h * cell - cell * 0.21);
      if (state.reineChantierFin !== null) {
        ctx.font = `${cell * 0.4}px sans-serif`;
        ctx.fillText("✨", cx + cell * 0.9, py + cell * 0.35 + Math.sin(t * 5) * 2);
      }
    }

    // chantier : marteau et anneau de progression
    if (room.chantierFin !== null) {
      const def = room.type === "reine" ? null : SALLE_PAR_ID.get(room.type)!;
      const total = def ? def.niveaux[room.level]?.secondes ?? 60 : 60;
      const fraction = Math.min(1, Math.max(0, 1 - (room.chantierFin - Date.now()) / (total * 1000)));
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(px + w * cell - cell * 0.3, py + cell * 0.3, cell * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(px + w * cell - cell * 0.3, py + cell * 0.3, cell * 0.2, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2);
      ctx.stroke();
      ctx.font = `${cell * 0.3}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🔨", px + w * cell - cell * 0.3, py + cell * 0.3 + Math.sin(t * 8) * 1.5);
    }
  }

  // creusages : pioche et barre de progression
  for (const d of state.digs) {
    const px = gridX + d.x * cell;
    const py = gridY + d.y * cell;
    ctx.font = `${cell * 0.36}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⛏️", px + cell / 2, py + cell / 2 + Math.sin(t * 8) * 1.5);
  }

  // surbrillances selon le mode
  if (mode.type === "dig") {
    const pulse = 0.35 + 0.25 * Math.sin(t * 5);
    ctx.strokeStyle = `rgba(255,209,102,${pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (creusable(state, x, y)) {
          ctx.beginPath();
          ctx.arc(gridX + (x + 0.5) * cell, gridY + (y + 0.5) * cell, cell * 0.34, 0, Math.PI * 2);
          ctx.stroke();
        }
    ctx.setLineDash([]);
    // préview sous le curseur : coût, durée, et pourquoi c'est impossible
    if (hover) {
      const avis = avisCreuse(state, hover.x, hover.y);
      const { cout, secondes } = coutCreuse(hover.y);
      ctx.fillStyle = avis.ok ? "rgba(128,222,120,0.35)" : "rgba(230,80,70,0.3)";
      ctx.fillRect(gridX + hover.x * cell, gridY + hover.y * cell, cell, cell);
      chip(
        gridX + hover.x * cell,
        gridY + hover.y * cell,
        avis.ok ? [`⛏️ ${cout} 🍃 · ${secondes}s`] : [`✕ ${avis.raison}`],
        avis.ok
      );
    }
  }
  if (mode.type === "build" && hover) {
    const { w, h } = mode.def;
    const avis = avisConstruction(state, mode.def.id, hover.x, hover.y);
    ctx.fillStyle = avis.ok ? "rgba(128,222,120,0.35)" : "rgba(230,80,70,0.35)";
    ctx.fillRect(gridX + hover.x * cell, gridY + hover.y * cell, w * cell, h * cell);
    ctx.font = `${cell * 0.7}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.7;
    ctx.fillText(mode.def.emoji, gridX + (hover.x + w / 2) * cell, gridY + (hover.y + h / 2) * cell);
    ctx.globalAlpha = 1;
    chip(
      gridX + hover.x * cell,
      gridY + hover.y * cell,
      avis.ok
        ? [`${mode.def.emoji} ${mode.def.nom} — ${fmtCout(mode.def.niveaux[0].cout)} · ${fmtDuree(mode.def.niveaux[0].secondes)}`]
        : [`✕ ${avis.raison}`],
      avis.ok
    );
  }
}

function drawFourmis(): void {
  for (const f of fourmis) {
    const px = gridX + (f.x + 0.5) * cell;
    const py = gridY + (f.y + 0.5) * cell;
    const dx = f.tx - f.x;
    const dy = f.ty - f.y;
    const angle = Math.abs(dx) + Math.abs(dy) > 0.01 ? Math.atan2(dy, dx) : 0;
    peindreFourmi(px, py, cell * (f.surface ? 0.4 : 0.46), angle, f.phase, "#241206", f.feuille);
  }
}

let lastT = 0;
function frame(ms: number): void {
  const t = ms / 1000;
  const dt = Math.min(0.05, Math.max(0, t - lastT));
  lastT = t;
  bougeFourmis(dt);
  majParticules(dt, t);
  ctx.clearRect(0, 0, W, H);
  drawFond(t);
  drawColonie(t);
  drawFourmis();
  drawParticules(t);
  // vignette douce pour poser l'ambiance
  const vg = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.45, W / 2, H * 0.55, Math.max(W, H) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(10,5,0,0.28)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  requestAnimationFrame(frame);
}

// ---- HUD ----

function renderHUD(): void {
  const cap = stockMax(state);
  const prod = prodParMinute(state);
  hudRes.innerHTML = (Object.keys(RESOURCES) as ResourceId[])
    .map((r) => {
      const visible = r !== "miellat" || state.symbiotes.includes("pucerons") || state.res.miellat > 0;
      if (!visible) return "";
      return `<span class="pill" title="${RESOURCES[r].nom} — +${prod[r].toFixed(1)}/min">${RESOURCES[r].emoji} ${Math.floor(state.res[r])}<small>/${cap}</small></span>`;
    })
    .join("");
  hudPop.innerHTML = `🐜 ${popTotale(state)}<small>/${popMax(state)}</small> · ⛏️ ${chantiersEnCours(state)}<small>/${CHANTIERS_MAX}</small>`;
  const nonLus = state.rapports.filter((r) => !r.lu).length;
  badgeRapports.textContent = nonLus ? String(nonLus) : "";
  badgeRapports.classList.toggle("show", nonLus > 0);
}

// ---- panneaux ----

function fermerPanel(): void {
  panelOuvert = null;
  panelEl.classList.remove("show");
  popupEl.classList.remove("show");
}

function ouvrirPanel(id: string, titre: string, html: string): void {
  panelOuvert = id;
  panelTitle.textContent = titre;
  panelBody.innerHTML = html;
  panelEl.classList.add("show");
  popupEl.classList.remove("show");
}

function setMode(m: Mode, message?: string): void {
  mode = m;
  bandeau.classList.toggle("show", m.type !== "normal");
  if (message) bandeau.querySelector("span")!.textContent = message;
  if (m.type !== "normal") fermerPanel();
}

function panelConstruire(): void {
  const html = SALLES.map((def) => {
    const n = nbSalles(state, def.id);
    const max = def.maxParReine[state.reineLevel - 1];
    const bloqueSymbiote = def.symbioteRequis && !state.symbiotes.includes(def.symbioteRequis);
    const bloqueMax = n >= max;
    const dispo = !bloqueSymbiote && !bloqueMax;
    const raison = bloqueSymbiote
      ? `<small class="carte-cout">🔒 réservée aux alliés du Cercle I — voir les expéditions</small>`
      : bloqueMax
        ? `<small class="carte-cout">🔒 ${max === 0 ? "la Reine doit gagner un niveau" : `limite atteinte (${n}/${max})`}</small>`
        : `<small class="carte-cout">${htmlCout(state, def.niveaux[0].cout)} · ${fmtDuree(def.niveaux[0].secondes)} · ${def.w}×${def.h}</small>`;
    return `<button class="carte ${dispo ? "" : "off"}" data-salle="${def.id}" ${dispo ? "" : "disabled"}>
      <img class="carte-img" src="${imgUrl(def.id)}" alt="" />
      <span class="carte-corps"><b>${def.emoji} ${def.nom}</b><small>${def.description}</small>${raison}</span>
    </button>`;
  }).join("");
  ouvrirPanel(
    "construire",
    "🏗️ Construire",
    `${html}<button class="carte" data-action="mode-creuser">
      <span class="carte-emoji">⛏️</span>
      <span class="carte-corps"><b>Creuser un tunnel</b><small>Étend les galeries, cellule par cellule.</small><small class="carte-cout">${CREUSE_COUT} 🍃 · ${CREUSE_SECONDES_BASE}s + profondeur</small></span>
    </button>`
  );
}

function panelNurserie(): void {
  const enFile = state.queue
    .map((q, i) => {
      const def = UNITE_PAR_ID.get(q.unit)!;
      const reste = i === 0 && q.fin != null ? ` — ${resteMs(q.fin)}` : "";
      return `<span class="pill">${def.emoji} ${def.nom}${reste}</span>`;
    })
    .join(" ");
  const plein = state.queue.length >= fileMax(state);
  const surpop = popTotale(state) >= popMax(state);
  const html = UNITES.map((def) => {
    const payable = peutPayer(state, def.cout);
    const dispo = payable && !plein && !surpop;
    const blocage = surpop
      ? `<small class="carte-cout">🔒 colonie au complet — améliore la Reine</small>`
      : plein
        ? `<small class="carte-cout">🔒 la file de la nurserie est pleine</small>`
        : "";
    return `<button class="carte ${dispo ? "" : "off"}" data-pondre="${def.id}" ${dispo ? "" : "disabled"}>
      <img class="carte-img" src="${imgUrl(def.id)}" alt="" />
      <span class="carte-corps"><b>${def.emoji} ${def.nom}</b><small>${def.description}</small><small>force ${def.force}${def.recolte ? ` · récolte ${def.recolte} 🍃/min` : ""}</small><small class="carte-cout">${htmlCout(state, def.cout)} · ${fmtDuree(def.secondes)}</small>${blocage}</span>
    </button>`;
  }).join("");
  ouvrirPanel(
    "nurserie",
    "🥚 Nurserie",
    `<p class="note">File : ${state.queue.length}/${fileMax(state)} · Colonie : ${popTotale(state)}/${popMax(state)}</p>
     ${html}
     <div class="file">${enFile || "<small>Aucun œuf en couveuse.</small>"}</div>`
  );
}

function panelExpeditions(): void {
  const enCours = state.expeditions
    .map((e) => {
      const def = EXPEDITIONS.find((d) => d.id === e.defId)!;
      return `<div class="carte exp off"><img class="carte-hero" src="${imgUrl(EXP_IMG[def.id])}" alt="" />
        <span class="carte-corps"><b>${def.emoji} ${def.nom}</b><small>escouade en route — retour dans ${resteMs(e.fin)}</small></span></div>`;
    })
    .join("");

  const dispo = EXPEDITIONS.filter((d) => !(d.recrute && state.symbiotes.includes(d.recrute)))
    .map((def) => {
      if (!escouades.has(def.id)) escouades.set(def.id, { ouvriere: 0, soldate: 0 });
      const esc = escouades.get(def.id)!;
      const bloque = state.reineLevel < def.reineMin;
      const prono = pronostic(esc, def.difficulte);
      const offrandeOk = !def.offrande || peutPayer(state, def.offrande);
      const partable = prono.force > 0 && offrandeOk;
      const offrande = def.offrande ? ` · offrande ${htmlCout(state, def.offrande)}` : "";
      const pertes =
        prono.force === 0
          ? ""
          : prono.pertesMax === 0
            ? "aucune perte à prévoir"
            : `pertes estimées : ${prono.pertesMin === prono.pertesMax ? prono.pertesMax : `${prono.pertesMin} à ${prono.pertesMax}`} 🐜`;
      const butin = (Object.entries(def.butin) as [keyof typeof RESOURCES, number][])
        .map(([r, n]) => `${n} ${RESOURCES[r].emoji}`)
        .join(" · ");
      return `<div class="carte exp ${bloque ? "off" : ""}">
        <img class="carte-hero" src="${imgUrl(EXP_IMG[def.id])}" alt="" />
        <span class="carte-corps">
          <b>${def.emoji} ${def.nom}</b><small>${def.description}</small>
          <small class="carte-cout">durée ${fmtDuree(def.secondes)} · difficulté ${def.difficulte} · butin ${butin}${offrande}</small>
          ${
            bloque
              ? `<small class="carte-cout">🔒 👑 Reine niv. ${def.reineMin} requise</small>`
              : `<span class="steppers">
                  ${UNITES.map(
                    (u) => `<span class="stepper">${u.emoji}
                      <button data-esc="${def.id}" data-unit="${u.id}" data-delta="-1">−</button>
                      <b>${esc[u.id]}</b>
                      <button data-esc="${def.id}" data-unit="${u.id}" data-delta="1">+</button>
                    </span>`
                  ).join("")}
                </span>
                <span class="prono prono-${prono.couleur}">
                  <span class="prono-barre"><span style="width:${Math.round(prono.chance * 100)}%"></span></span>
                  <small>force ${prono.force} — ${prono.verdict}${pertes ? ` · ${pertes}` : ""}</small>
                </span>
                <button class="go" data-partir="${def.id}" ${partable ? "" : "disabled"}>${offrandeOk ? "Partir" : "offrande impayable"}</button>`
          }
        </span>
      </div>`;
    })
    .join("");
  ouvrirPanel("expeditions", "🗺️ Expéditions", `${enCours}${dispo}`);
}

function panelCercles(): void {
  const parCercle = new Map<number, string[]>();
  for (const sp of SYMBIOTES) {
    const recrutee = state.symbiotes.includes(sp.id);
    const etat = recrutee ? "✅ alliée de la colonie" : sp.disponible ? `🎯 ${sp.effort}` : "🌫️ à venir";
    const carte = `<div class="carte ${recrutee ? "" : "off"}">
      <img class="carte-img ${recrutee ? "" : "grise"}" src="${imgUrl(`sp-${sp.id}`)}" alt="" />
      <span class="carte-corps"><b>${sp.emoji} ${sp.nom}</b><small>${sp.apporte}</small><small class="carte-cout">${etat}</small></span>
    </div>`;
    if (!parCercle.has(sp.cercle)) parCercle.set(sp.cercle, []);
    parCercle.get(sp.cercle)!.push(carte);
  }
  const html = [...parCercle.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(
      ([c, cartes]) =>
        `<p class="note">Cercle ${"I".repeat(c).replace("IIII", "IV")} — ${c === 1 ? "la confiance facile" : c === 2 ? "il faudra faire ses preuves" : c === 3 ? "les alliances coûteuses" : "les légendes du jardin"}</p>${cartes.join("")}`
    )
    .join("");
  ouvrirPanel(
    "cercles",
    "🕸️ Cercles de symbiose",
    `<p class="note">Chaque insecte du jardin peut rejoindre la colonie. Plus le cercle est haut, plus l'effort est grand — et une espèce jamais recrutée reste une adversaire.</p>${html}`
  );
}

function panelRapports(): void {
  const html = state.rapports.length
    ? state.rapports
        .map((r) => {
          const def = EXPEDITIONS.find((d) => d.nom === r.titre);
          const vignette = def
            ? `<img class="carte-img" src="${imgUrl(EXP_IMG[def.id])}" alt="" />`
            : `<span class="carte-emoji">${r.emoji}</span>`;
          return `<div class="carte">${vignette}
          <span class="carte-corps"><b>${r.emoji} ${r.titre}</b>${r.lignes.map((l) => `<small>${l}</small>`).join("")}</span></div>`;
        })
        .join("")
    : `<p class="note">Aucun rapport pour l'instant — envoie une escouade en expédition !</p>`;
  for (const r of state.rapports) r.lu = true;
  ouvrirPanel("rapports", "📜 Rapports d'expédition", html);
  renderHUD();
}

// popup d'une salle cliquée
function ouvrirPopup(room: RoomState): void {
  fermerPanel();
  let html: string;
  if (room.type === "reine") {
    const suivant = state.reineLevel < REINE_MAX ? REINE[state.reineLevel] : null;
    const gains = suivant
      ? `<div class="apercu">${apercuReine(state.reineLevel)
          .map((g) => `<small>▸ ${g}</small>`)
          .join("")}</div>`
      : "";
    html = `<img class="popup-img" src="${imgUrl("reine")}" alt="" />
      <b>👑 Chambre de la Reine — niv. ${state.reineLevel}</b>
      <small>Le cœur de la colonie. Son niveau autorise salles, expéditions et cercles.</small>
      ${
        state.reineChantierFin !== null
          ? `<small>✨ Mue en cours — ${resteMs(state.reineChantierFin)}</small>`
          : suivant
            ? `${gains}<button class="go" data-ameliorer-reine ${peutPayer(state, suivant.cout) ? "" : "disabled"}>Passer niv. ${state.reineLevel + 1} — ${htmlCout(state, suivant.cout)} · ${fmtDuree(suivant.secondes)}</button>`
            : `<small>La Reine règne au sommet.</small>`
      }`;
  } else {
    const def = SALLE_PAR_ID.get(room.type)!;
    const suivant = room.level < def.niveaux.length ? def.niveaux[room.level] : null;
    const prodTxt =
      def.prodRes && room.level > 0
        ? `<small>Production : ${def.niveaux[room.level - 1].prodParMinute} ${RESOURCES[def.prodRes].emoji}/min</small>`
        : "";
    const apercu =
      suivant && room.chantierFin === null && room.level < state.reineLevel
        ? `<div class="apercu">${apercuSalle(room.type, room.level)
            .map((l) => `<small>▸ ${l.label} : ${l.avant} → <b>${l.apres}</b></small>`)
            .join("")}</div>`
        : "";
    html = `<img class="popup-img" src="${imgUrl(room.type)}" alt="" />
      <b>${def.emoji} ${def.nom}${room.level > 0 ? ` — niv. ${room.level}` : ""}</b>
      <small>${def.description}</small>${prodTxt}
      ${
        room.chantierFin !== null
          ? `<small>🔨 Chantier — ${resteMs(room.chantierFin)}</small>`
          : suivant
            ? room.level >= state.reineLevel
              ? `<small>🔒 👑 La Reine doit d'abord gagner un niveau.</small>`
              : `${apercu}<button class="go" data-ameliorer="${room.uid}" ${peutPayer(state, suivant.cout) ? "" : "disabled"}>Améliorer — ${htmlCout(state, suivant.cout)} · ${fmtDuree(suivant.secondes)}</button>`
            : `<small>Niveau maximum atteint.</small>`
      }`;
  }
  popupEl.innerHTML = html;
  popupEl.classList.add("show");
}

// re-rendu du panneau ouvert (compteurs, timers)
function rafraichirPanel(): void {
  if (panelOuvert === "nurserie") panelNurserie();
  else if (panelOuvert === "expeditions") panelExpeditions();
}

// ---- boucle de jeu ----

function tick(): void {
  const evts = advance(state, Date.now());
  for (const e of evts) toast(e);
  if (evts.length) {
    syncFourmis();
    rafraichirPanel();
  }
  renderHUD();
  if (panelOuvert === "nurserie" || panelOuvert === "expeditions") rafraichirPanel();
}

// ---- interactions ----

canvas.addEventListener("pointermove", (ev) => {
  hover = cellAt(ev.clientX, ev.clientY);
});

canvas.addEventListener("pointerdown", (ev) => {
  hint.classList.add("hidden");
  const c = cellAt(ev.clientX, ev.clientY);
  if (!c) {
    fermerPanel();
    return;
  }
  if (mode.type === "dig") {
    const err = creuser(state, c.x, c.y, Date.now());
    if (err) toast(err);
    else renderHUD();
    return;
  }
  if (mode.type === "build") {
    const err = construire(state, mode.def.id, c.x, c.y, Date.now());
    if (err) toast(err);
    else {
      toast(`${mode.def.emoji} Chantier lancé !`);
      setMode({ type: "normal" });
      renderHUD();
    }
    return;
  }
  const room = state.rooms.find((r) => {
    const def = r.type === "reine" ? { w: REINE_W, h: REINE_H } : SALLE_PAR_ID.get(r.type)!;
    return c.x >= r.x && c.x < r.x + def.w && c.y >= r.y && c.y < r.y + def.h;
  });
  if (room) ouvrirPopup(room);
  else fermerPanel();
});

document.addEventListener("click", (ev) => {
  const el = ev.target as HTMLElement;
  const btn = el.closest("button, [data-action]") as HTMLElement | null;
  if (!btn) return;

  if (btn.dataset.ouvre) {
    hint.classList.add("hidden");
    const id = btn.dataset.ouvre;
    if (panelOuvert === id) return fermerPanel();
    setMode({ type: "normal" });
    if (id === "construire") panelConstruire();
    else if (id === "nurserie") panelNurserie();
    else if (id === "expeditions") panelExpeditions();
    else if (id === "cercles") panelCercles();
    else if (id === "rapports") panelRapports();
    return;
  }
  if (btn.dataset.action === "fermer") return fermerPanel();
  if (btn.dataset.action === "annuler-mode") return setMode({ type: "normal" });
  if (btn.dataset.action === "mode-creuser")
    return setMode({ type: "dig" }, "⛏️ Touche une case de terre collée aux galeries — Échap pour annuler");
  if (btn.dataset.salle) {
    const def = SALLE_PAR_ID.get(btn.dataset.salle)!;
    return setMode({ type: "build", def }, `${def.emoji} Touche la terre pour placer la ${def.nom} (${def.w}×${def.h})`);
  }
  if (btn.dataset.pondre) {
    const err = pondre(state, btn.dataset.pondre as UnitId, Date.now());
    if (err) toast(err);
    panelNurserie();
    renderHUD();
    return;
  }
  if (btn.dataset.esc) {
    const esc = escouades.get(btn.dataset.esc)!;
    const unit = btn.dataset.unit as UnitId;
    const delta = Number(btn.dataset.delta);
    esc[unit] = Math.max(0, Math.min(state.units[unit], esc[unit] + delta));
    panelExpeditions();
    return;
  }
  if (btn.dataset.partir) {
    const esc = escouades.get(btn.dataset.partir)!;
    const err = lancerExpedition(state, btn.dataset.partir, esc, Date.now());
    if (err) toast(err);
    else {
      toast("🐜 L'escouade s'ébranle !");
      escouades.set(btn.dataset.partir, { ouvriere: 0, soldate: 0 });
      syncFourmis();
    }
    panelExpeditions();
    renderHUD();
    return;
  }
  if (btn.dataset.ameliorer) {
    const err = ameliorerSalle(state, Number(btn.dataset.ameliorer), Date.now());
    if (err) toast(err);
    else toast("🔨 Chantier lancé !");
    popupEl.classList.remove("show");
    renderHUD();
    return;
  }
  if ("ameliorerReine" in btn.dataset) {
    const err = ameliorerReine(state, Date.now());
    if (err) toast(err);
    else toast("✨ La Reine entame sa mue…");
    popupEl.classList.remove("show");
    renderHUD();
    return;
  }
});

window.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") {
    setMode({ type: "normal" });
    fermerPanel();
  }
});

// ---- sauvegarde ----

window.setInterval(() => save(state, Date.now()), 10_000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") save(state, Date.now());
});
window.addEventListener("pagehide", () => save(state, Date.now()));

// ---- démarrage ----

window.addEventListener("resize", resize);
resize();

{
  // rattrapage du temps passé loin de la colonie
  const avant = { ...state.res };
  const absence = Date.now() - state.savedAt;
  const evts = advance(state, Date.now());
  if (absence > 90_000) {
    const gains = (Object.keys(avant) as ResourceId[])
      .map((r) => ({ r, n: Math.floor(state.res[r] - avant[r]) }))
      .filter((g) => g.n > 0)
      .map((g) => `+${g.n} ${RESOURCES[g.r].emoji}`);
    const morceaux = [...gains, ...evts];
    if (morceaux.length) toast(`Pendant ton absence : ${morceaux.slice(0, 4).join(" · ")}`);
  }
}

syncFourmis();
renderHUD();
window.setInterval(tick, 1000);
requestAnimationFrame(frame);
