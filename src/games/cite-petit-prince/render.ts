// Cité Petit Prince — dessin de la tour en coupe (Canvas 2D) et test de clic.
// Coordonnées « monde » : y part du trottoir et monte ; l'écran défile avec
// `scroll` (0 = le hall posé en bas de l'écran).

import { CATEGORIE_PAR_ID, CHEVEUX, PEAUX, TENUES } from "./data.ts";
import {
  chantierEnCours,
  commerceDe,
  coutProchainEtage,
  employes,
  formatArgent,
  formatDuree,
  residents,
  type Etat,
  type Habitant,
} from "./sim.ts";

export const FH = 66; // hauteur d'un étage
export const LH = 90; // hauteur du hall
const TOIT = 70;
const SW = 38; // largeur de la gaine d'ascenseur
const MUR = 6; // épaisseur des murs de façade
const MARGE_BAS = 96; // barre du bas + trottoir

export interface Course {
  debut: number;
  etage: number;
  montee: number; // ms
  visiteur: number; // graine d'apparence
}

export interface Vue {
  W: number;
  H: number;
  scroll: number;
  now: number;
  course: Course | null;
  selection: number | null;
}

export function geometrie(v: Vue) {
  const tourW = Math.min(440, v.W - 32);
  const tourX = Math.round((v.W - tourW) / 2);
  const baseY = v.H - MARGE_BAS + v.scroll;
  const salleX = tourX + MUR + SW + 4;
  const salleW = tourX + tourW - MUR - salleX;
  return { tourW, tourX, baseY, salleX, salleW };
}

export function hauteurTotale(s: Etat): number {
  return LH + (s.etages.length + 1) * FH + TOIT;
}

export function scrollMax(s: Etat, v: Vue): number {
  return Math.max(0, hauteurTotale(s) - (v.H - MARGE_BAS - 110));
}

export type Cible =
  | { type: "etage"; i: number }
  | { type: "fantome" }
  | { type: "ascenseur" }
  | null;

export function hitTest(s: Etat, v: Vue, x: number, y: number): Cible {
  const g = geometrie(v);
  if (x < g.tourX || x > g.tourX + g.tourW) return null;
  const wy = g.baseY - y;
  if (wy < 0) return null;
  if (wy < LH) return { type: "ascenseur" };
  const i = Math.floor((wy - LH) / FH);
  if (i === s.etages.length) return { type: "fantome" };
  if (i > s.etages.length) return null;
  return x < g.salleX ? { type: "ascenseur" } : { type: "etage", i };
}

// ---- petits outils ----

function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function police(ctx: CanvasRenderingContext2D, taille: number, gras = true): void {
  ctx.font = `${gras ? 700 : 400} ${taille}px "Pixelify Sans", "VT323", sans-serif`;
}

function pastille(ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, fond: string, encre: string): number {
  police(ctx, 12);
  const w = ctx.measureText(txt).width + 10;
  ctx.fillStyle = fond;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 17, 5);
  ctx.fill();
  ctx.fillStyle = encre;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(txt, x + 5, y + 9);
  return w;
}

// Petit personnage en pixel art (u = taille d'un pixel), pieds en (x, yBas).
interface Apparence {
  peau: number;
  cheveux: number;
  tenue: number;
  genre: "f" | "m";
}

function personnage(ctx: CanvasRenderingContext2D, a: Apparence, x: number, yBas: number, pas: number, versGauche: boolean): void {
  const u = 2;
  const px = (dx: number, dy: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x + dx * u), Math.round(yBas - dy * u), w * u, h * u);
  };
  const peau = PEAUX[a.peau];
  // jambes (l'une se lève à chaque pas)
  px(1, 4 + (pas === 1 ? 1 : 0), 2, 4, "#2b2d42");
  px(3, 4 + (pas === 2 ? 1 : 0), 2, 4, "#2b2d42");
  // corps
  px(0, 9, 6, 5, TENUES[a.tenue]);
  px(versGauche ? 0 : 5, 6, 1, 1, peau); // main
  // tête
  px(1, 13, 4, 4, peau);
  px(versGauche ? 1 : 4, 11, 1, 1, "#1d1a16"); // œil
  // cheveux
  px(1, 14, 4, 2, CHEVEUX[a.cheveux]);
  if (a.genre === "f") px(versGauche ? 4 : 0, 12, 2, 4, CHEVEUX[a.cheveux]);
}

function apparenceVisiteur(graine: number): Apparence {
  return {
    peau: Math.floor(hash(graine) * PEAUX.length),
    cheveux: Math.floor(hash(graine + 1) * CHEVEUX.length),
    tenue: Math.floor(hash(graine + 2) * TENUES.length),
    genre: hash(graine + 3) < 0.5 ? "f" : "m",
  };
}

// Un habitant qui se promène entre xMin et xMax.
function promeneur(ctx: CanvasRenderingContext2D, h: Habitant, xMin: number, xMax: number, yBas: number, now: number): void {
  const periode = 9000 + hash(h.id) * 9000;
  const phase = ((now / periode + hash(h.id + 7)) % 1) * 2; // 0..2 aller-retour
  const t = phase < 1 ? phase : 2 - phase;
  // petites pauses aux extrémités
  const lisse = Math.min(1, Math.max(0, (t - 0.08) / 0.84));
  const x = xMin + (xMax - xMin) * lisse;
  const marche = lisse > 0 && lisse < 1;
  const pas = marche ? 1 + (Math.floor(now / 160 + h.id) % 2) : 0;
  personnage(ctx, h, x, yBas, pas, phase >= 1);
}

// ---- décor ----

function ciel(ctx: CanvasRenderingContext2D, v: Vue): boolean {
  const heure = new Date(v.now).getHours();
  const nuit = heure >= 21 || heure < 7;
  const grad = ctx.createLinearGradient(0, 0, 0, v.H);
  if (nuit) {
    grad.addColorStop(0, "#0b1026");
    grad.addColorStop(1, "#2b2f5a");
  } else {
    grad.addColorStop(0, "#6ec3f4");
    grad.addColorStop(1, "#d8f0fb");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, v.W, v.H);
  if (nuit) {
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 70; i++) {
      const x = hash(i) * v.W;
      const y = (hash(i + 100) * v.H * 1.6 + v.scroll * 0.2) % v.H;
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(v.now / 900 + i));
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 6; i++) {
      const x = ((hash(i) * v.W * 1.4 + v.now / (60 + i * 20)) % (v.W + 200)) - 100;
      const y = ((hash(i + 50) * v.H * 2 + v.scroll * 0.3) % (v.H + 100)) - 50;
      ctx.beginPath();
      ctx.ellipse(x, y, 46, 14, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 26, y - 8, 28, 13, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return nuit;
}

function ville(ctx: CanvasRenderingContext2D, v: Vue, baseY: number, nuit: boolean): void {
  // silhouettes d'immeubles au loin, avec parallaxe
  const y0 = v.H - MARGE_BAS + v.scroll * 0.45;
  for (let i = 0; i < 16; i++) {
    const w = 40 + hash(i + 3) * 50;
    const h = 60 + hash(i + 9) * 170;
    const x = (i / 16) * (v.W + 80) - 40;
    ctx.fillStyle = nuit ? "#1c2044" : "#a9c6d6";
    ctx.fillRect(x, y0 - h, w, h + 400);
    if (nuit) {
      ctx.fillStyle = "#f7d774";
      for (let k = 0; k < 8; k++)
        if (hash(i * 31 + k) < 0.5) ctx.fillRect(x + 6 + (k % 3) * 12, y0 - h + 10 + Math.floor(k / 3) * 16, 5, 7);
    }
  }
  // rue
  ctx.fillStyle = "#8d8f94";
  ctx.fillRect(0, baseY, v.W, 10);
  ctx.fillStyle = "#4a4d55";
  ctx.fillRect(0, baseY + 10, v.W, v.H);
  ctx.fillStyle = "#e9e3cf";
  for (let x = ((v.now / 40) % 60) - 60; x < v.W; x += 60) ctx.fillRect(x, baseY + 34, 30, 4);
}

// ---- étages ----

const APPART_MURS = ["#c9dcef", "#e8d5c4", "#d4e7c5", "#ecd0dc", "#d9d2ef"];

function indicateursStock(ctx: CanvasRenderingContext2D, s: Etat, i: number, xDroite: number, y: number, now: number): void {
  const e = s.etages[i];
  const c = commerceDe(e)!;
  const nbEmp = employes(s, i).length;
  const w = 24;
  e.produits.forEach((p, k) => {
    const x = xDroite - (3 - k) * (w + 5);
    const def = c.produits[k];
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x, y, w, 9);
    if (p.etat === "livraison") {
      const t = 1 - Math.max(0, p.fin - now) / (def.livraison * 1000);
      ctx.fillStyle = "#4ea8ff";
      ctx.fillRect(x + 1, y + 1, (w - 2) * t, 7);
    } else if (p.etat === "vente") {
      ctx.fillStyle = "#3ccf7a";
      ctx.fillRect(x + 1, y + 1, (w - 2) * (1 - p.vendus / def.quantite), 7);
    } else if (nbEmp >= k + 1) {
      // rupture : à commander !
      ctx.fillStyle = Math.floor(now / 450) % 2 ? "#ff4d4d" : "#ffb3b3";
      ctx.fillRect(x + 1, y + 1, w - 2, 7);
    } else {
      ctx.fillStyle = "#6b6258";
      ctx.fillRect(x + 1, y + 1, w - 2, 7);
    }
  });
}

function etage(ctx: CanvasRenderingContext2D, s: Etat, v: Vue, i: number, g: ReturnType<typeof geometrie>): void {
  const e = s.etages[i];
  const bas = g.baseY - LH - i * FH;
  const haut = bas - FH;
  if (bas < -10 || haut > v.H + 10) return;
  const { salleX: x, salleW: w } = g;
  const sol = bas - 5;

  if (e.chantierFin !== null) {
    ctx.fillStyle = "#6d6a64";
    ctx.fillRect(x, haut, w, FH);
    ctx.strokeStyle = "#c8a24a";
    ctx.lineWidth = 3;
    for (let k = x + 10; k < x + w; k += 34) {
      ctx.beginPath();
      ctx.moveTo(k, bas);
      ctx.lineTo(k + 26, haut);
      ctx.stroke();
    }
    for (let k = 0; k < w; k += 16) {
      ctx.fillStyle = (k / 16) % 2 ? "#1d1a16" : "#ffd23f";
      ctx.fillRect(x + k, sol - 6, 16, 6);
    }
    police(ctx, 15);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const c = commerceDe(e);
    const nom = c ? `${c.icone} ${c.nom}` : "🏠 Appartement";
    ctx.fillStyle = "#fff";
    ctx.fillText(`🏗️ ${nom} · ${formatDuree(e.chantierFin - v.now)}`, x + w / 2, haut + FH / 2 - 4);
  } else if (e.type === "appartement") {
    ctx.fillStyle = APPART_MURS[i % APPART_MURS.length];
    ctx.fillRect(x, haut, w, FH);
    // papier peint
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    for (let k = x + 8; k < x + w; k += 22) ctx.fillRect(k, haut, 6, FH);
    // fenêtre
    ctx.fillStyle = "#5d4a3a";
    ctx.fillRect(x + w - 58, haut + 12, 44, 30);
    ctx.fillStyle = "#9fd7f5";
    ctx.fillRect(x + w - 55, haut + 15, 38, 24);
    ctx.fillStyle = "#5d4a3a";
    ctx.fillRect(x + w - 37, haut + 15, 2, 24);
    // canapé
    ctx.fillStyle = "#b5523b";
    ctx.fillRect(x + w * 0.42, sol - 16, 56, 16);
    ctx.fillRect(x + w * 0.42 - 4, sol - 22, 8, 22);
    ctx.fillRect(x + w * 0.42 + 52, sol - 22, 8, 22);
    // plante
    police(ctx, 18, false);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("🪴", x + 6, sol - 2);
    for (const h of residents(s, i)) promeneur(ctx, h, x + 26, x + w - 30, sol, v.now);
  } else {
    const c = commerceDe(e)!;
    const cat = CATEGORIE_PAR_ID[c.categorie];
    ctx.fillStyle = cat.mur;
    ctx.fillRect(x, haut, w, FH);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(x, haut + FH * 0.55, w, FH * 0.45);
    // comptoir
    const cx = x + w * 0.52;
    ctx.fillStyle = "#6b4a2f";
    ctx.fillRect(cx, sol - 20, w * 0.44, 20);
    ctx.fillStyle = "#8a6440";
    ctx.fillRect(cx - 3, sol - 23, w * 0.44 + 6, 5);
    // enseigne
    police(ctx, 28, false);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(c.icone, x + w * 0.3, haut + FH * 0.45);
    // employés derrière le comptoir
    employes(s, i).forEach((h, k) => {
      const ex = cx + 14 + k * 30;
      const bob = Math.floor(v.now / 400 + h.id) % 2;
      personnage(ctx, h, ex, sol - 6 - bob, 0, true);
    });
    indicateursStock(ctx, s, i, x + w - 6, haut + 6, v.now);
  }

  // étiquette et dalle
  const c = commerceDe(e);
  const nom = e.chantierFin !== null ? "" : c ? c.nom : "Appart";
  if (nom) pastille(ctx, `${i + 1} · ${nom}`, x + 4, haut + 4, "rgba(29,26,22,0.72)", "#fff");
  ctx.fillStyle = "#5b534a";
  ctx.fillRect(g.tourX, bas - 4, g.tourW, 4);
  if (v.selection === i) {
    ctx.strokeStyle = "#ffd23f";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, haut + 1.5, w - 3, FH - 7);
  }
}

function hall(ctx: CanvasRenderingContext2D, s: Etat, v: Vue, g: ReturnType<typeof geometrie>): void {
  const bas = g.baseY;
  const haut = bas - LH;
  const { salleX: x, salleW: w } = g;
  ctx.fillStyle = "#d9cbb0";
  ctx.fillRect(x, haut, w, LH);
  // carrelage
  for (let k = 0; k < w; k += 14) {
    ctx.fillStyle = (k / 14) % 2 ? "#b9ab8f" : "#cfc1a4";
    ctx.fillRect(x + k, bas - 8, 14, 8);
  }
  // enseigne
  const ex = x + w / 2;
  ctx.fillStyle = "#1f3b5a";
  ctx.fillRect(ex - 104, haut + 6, 208, 22);
  police(ctx, 13);
  ctx.fillStyle = "#ffd23f";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CITÉ PETIT PRINCE – Bât. A", ex, haut + 17);
  // boîtes aux lettres
  ctx.fillStyle = "#8c8f96";
  ctx.fillRect(x + w - 60, haut + 38, 50, 30);
  ctx.fillStyle = "#5f636b";
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) ctx.fillRect(x + w - 57 + k * 12, haut + 41 + r * 9, 9, 6);
  // porte vitrée
  ctx.fillStyle = "#6b4f3a";
  ctx.fillRect(x + w * 0.38, haut + 36, 44, LH - 44);
  ctx.fillStyle = "#b8e1f2";
  ctx.fillRect(x + w * 0.38 + 4, haut + 40, 17, LH - 52);
  ctx.fillRect(x + w * 0.38 + 23, haut + 40, 17, LH - 52);

  // visiteurs qui attendent l'ascenseur
  s.visiteurs.forEach((cible, k) => {
    const vx = x + 10 + k * 26;
    const graine = cible * 17 + k * 101;
    personnage(ctx, apparenceVisiteur(graine), vx, bas - 8, 0, true);
    // bulle avec l'étage voulu
    const by = bas - 8 - 46 - (Math.floor(v.now / 500 + k) % 2);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(vx - 4, by, 22, 16, 4);
    ctx.fill();
    ctx.fillStyle = "#1d1a16";
    police(ctx, 12);
    ctx.textAlign = "center";
    ctx.fillText(String(cible + 1), vx + 7, by + 8);
  });
  ctx.fillStyle = "#5b534a";
  ctx.fillRect(g.tourX, bas - 4, g.tourW, 4);
}

function ascenseur(ctx: CanvasRenderingContext2D, s: Etat, v: Vue, g: ReturnType<typeof geometrie>): void {
  const sx = g.tourX + MUR;
  const top = g.baseY - LH - s.etages.length * FH;
  ctx.fillStyle = "#3d3a36";
  ctx.fillRect(sx, top, SW, g.baseY - top);
  ctx.fillStyle = "#2b2926";
  ctx.fillRect(sx + SW / 2 - 1, top, 2, g.baseY - top);

  // position de la cabine
  let niveau = 0; // hauteur monde du plancher de la cabine
  let occupe = false;
  const c = v.course;
  if (c) {
    const cible = LH + c.etage * FH;
    const t = v.now - c.debut;
    if (t < c.montee) {
      niveau = cible * (t / c.montee);
      occupe = true;
    } else if (t < c.montee + 400) niveau = cible;
    else niveau = cible * Math.max(0, 1 - (t - c.montee - 400) / c.montee);
  }
  const hCab = FH - 14;
  const cy = g.baseY - niveau - 4 - hCab;
  ctx.fillStyle = "#cfd8dc";
  ctx.fillRect(sx + 3, cy, SW - 6, hCab);
  ctx.fillStyle = "#90a4ae";
  ctx.fillRect(sx + SW / 2 - 1, cy + 3, 2, hCab - 6);
  ctx.fillStyle = "#ffd23f";
  ctx.fillRect(sx + 3, cy, SW - 6, 3);
  if (occupe && c) personnage(ctx, apparenceVisiteur(c.visiteur), sx + 13, cy + hCab - 1, 0, false);

  // murs de façade
  ctx.fillStyle = "#a89880";
  ctx.fillRect(g.tourX, top - FH, MUR, g.baseY - top + FH);
  ctx.fillRect(g.tourX + g.tourW - MUR, top - FH, MUR, g.baseY - top + FH);
}

function fantomeEtToit(ctx: CanvasRenderingContext2D, s: Etat, v: Vue, g: ReturnType<typeof geometrie>): void {
  const bas = g.baseY - LH - s.etages.length * FH;
  const haut = bas - FH;
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.strokeRect(g.tourX + MUR + 2, haut + 4, g.tourW - 2 * MUR - 4, FH - 8);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(g.tourX + MUR + 2, haut + 4, g.tourW - 2 * MUR - 4, FH - 8);
  police(ctx, 15);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 3;
  const txt =
    chantierEnCours(s) !== null
      ? "🏗️ chantier en cours…"
      : `＋ Nouvel étage · ${formatArgent(coutProchainEtage(s))}`;
  ctx.strokeText(txt, g.tourX + g.tourW / 2, haut + FH / 2);
  ctx.fillText(txt, g.tourX + g.tourW / 2, haut + FH / 2);

  // toit : parapet, antennes, paraboles
  const t = haut - 4;
  ctx.fillStyle = "#8a7c68";
  ctx.fillRect(g.tourX - 4, t, g.tourW + 8, 8);
  ctx.fillStyle = "#6e6252";
  ctx.fillRect(g.tourX + 30, t - 30, 3, 30);
  ctx.fillRect(g.tourX + 22, t - 26, 19, 2);
  ctx.fillRect(g.tourX + 25, t - 20, 13, 2);
  ctx.fillRect(g.tourX + g.tourW - 70, t - 44, 3, 44);
  ctx.fillStyle = Math.floor(v.now / 700) % 2 ? "#ff4d4d" : "#7a1f1f";
  ctx.fillRect(g.tourX + g.tourW - 71, t - 48, 5, 5);
  ctx.fillStyle = "#e8e8e8";
  for (let k = 0; k < 3; k++) {
    const px = g.tourX + 70 + k * 44;
    ctx.beginPath();
    ctx.ellipse(px, t - 12, 11, 8, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9e9e9e";
    ctx.fillRect(px - 1, t - 8, 2, 8);
    ctx.fillStyle = "#e8e8e8";
  }
}

export function dessiner(ctx: CanvasRenderingContext2D, s: Etat, v: Vue): void {
  const g = geometrie(v);
  const nuit = ciel(ctx, v);
  ville(ctx, v, g.baseY, nuit);
  // fond de la tour
  ctx.fillStyle = "#b8a88e";
  ctx.fillRect(g.tourX, g.baseY - LH - s.etages.length * FH, g.tourW, LH + s.etages.length * FH);
  hall(ctx, s, v, g);
  for (let i = 0; i < s.etages.length; i++) etage(ctx, s, v, i, g);
  ascenseur(ctx, s, v, g);
  fantomeEtToit(ctx, s, v, g);
  if (nuit) {
    // lumière chaude des fenêtres la nuit
    ctx.fillStyle = "rgba(20,20,60,0.18)";
    ctx.fillRect(g.tourX, 0, g.tourW, g.baseY);
  }
}
