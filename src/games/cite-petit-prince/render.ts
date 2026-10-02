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
const FACADE = 30; // façade extérieure de chaque côté (balcons, fenêtres), réduite sur mobile
const MARGE_BAS = 96; // barre du bas + trottoir
const CONTOUR = "#2a2420";

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
  const tourW = Math.min(500, v.W - 16);
  const tourX = Math.round((v.W - tourW) / 2);
  const f = tourW < 440 ? 20 : FACADE;
  const baseY = v.H - MARGE_BAS + v.scroll;
  const coeurX = tourX + f; // la coupe, entre les deux façades
  const coeurW = tourW - 2 * f;
  const salleX = coeurX + MUR + SW + 4;
  const salleW = coeurX + coeurW - MUR - salleX;
  return { tourW, tourX, baseY, salleX, salleW, coeurX, coeurW, f };
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

// Police lisible sur le canvas (la police pixel rendait « 2 » comme « 8 »).
function police(ctx: CanvasRenderingContext2D, taille: number, gras = true): void {
  ctx.font = `${gras ? 800 : 500} ${taille}px "Trebuchet MS", system-ui, sans-serif`;
}

// Rectangle plein cerné d'un trait sombre : le contour qui donne du relief.
function bloc(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string, trait = CONTOUR): void {
  ctx.fillStyle = trait;
  ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, Math.round(w) + 2, Math.round(h) + 2);
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
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
  const u = 3;
  const px = (dx: number, dy: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x + dx * u), Math.round(yBas - dy * u), w * u, h * u);
  };
  // ombre au sol
  ctx.fillStyle = "rgba(20,16,12,0.25)";
  ctx.beginPath();
  ctx.ellipse(x + 3 * u, yBas, 4 * u, u, 0, 0, Math.PI * 2);
  ctx.fill();
  const peau = PEAUX[a.peau];
  // jambes (l'une se lève à chaque pas)
  px(1, 4 + (pas === 1 ? 1 : 0), 2, 4, "#2b2d42");
  px(3, 4 + (pas === 2 ? 1 : 0), 2, 4, "#2b2d42");
  // corps
  px(0, 9, 6, 5, TENUES[a.tenue]);
  px(versGauche ? 0 : 5, 6, 1, 1, peau); // main
  // chaussures
  px(1, 1, 2, 1, "#1d1a16");
  px(3, 1, 2, 1, "#1d1a16");
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

export function estNuit(v: Vue): boolean {
  const heure = new Date(v.now).getHours();
  return heure >= 21 || heure < 7;
}

// Le décor d'un commerce selon sa catégorie, dans la moitié gauche de la salle.
function decorCommerce(ctx: CanvasRenderingContext2D, cat: string, x: number, haut: number, sol: number, dw: number, now: number, i: number): void {
  if (cat === "bouffe") {
    // ardoise du menu, four, tabourets
    bloc(ctx, x + 4, haut + 22, 46, 22, "#2f3a33");
    ctx.fillStyle = "#e9e1d0";
    for (let k = 0; k < 3; k++) ctx.fillRect(x + 9, haut + 27 + k * 6, 22 + ((k * 7) % 12), 2);
    bloc(ctx, x + 60, sol - 30, 38, 30, "#5c5f66");
    ctx.fillStyle = Math.floor(now / 300) % 2 ? "#ff8a3d" : "#ffb03d";
    ctx.fillRect(x + 66, sol - 22, 26, 12);
    for (let k = 0; k < (dw > 150 ? 2 : 0); k++) {
      bloc(ctx, x + 108 + k * 24, sol - 16, 14, 4, "#c0392b");
      ctx.fillStyle = "#7a7d85";
      ctx.fillRect(x + 114 + k * 24, sol - 12, 2, 12);
    }
  } else if (cat === "services") {
    // miroir et fauteuil
    for (let k = 0; k < 2; k++) {
      const mx = x + 8 + k * 70;
      bloc(ctx, mx, haut + 18, 34, 24, "#d7ecf2", "#8a7560");
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect(mx + 4, haut + 21, 6, 18);
      bloc(ctx, mx + 4, sol - 22, 26, 12, "#c0392b");
      bloc(ctx, mx + 2, sol - 32, 6, 22, "#a93226");
      ctx.fillStyle = "#b0b6bf";
      ctx.fillRect(mx + 15, sol - 10, 4, 10);
    }
  } else if (cat === "loisirs") {
    // deux bornes d'arcade qui clignotent
    for (let k = 0; k < 2; k++) {
      const bx = x + 8 + k * 46;
      bloc(ctx, bx, sol - 46, 32, 46, k ? "#3a86ff" : "#8338ec");
      ctx.fillStyle = `hsl(${(now / 8 + k * 120 + i * 30) % 360} 80% 60%)`;
      ctx.fillRect(bx + 5, sol - 40, 22, 16);
      ctx.fillStyle = "#ffd23f";
      ctx.fillRect(bx + 8, sol - 20, 4, 4);
      ctx.fillStyle = "#ef476f";
      ctx.fillRect(bx + 18, sol - 20, 4, 4);
    }
    // poster
    bloc(ctx, x + 104, haut + 18, 28, 34, "#ffbe0b");
    ctx.fillStyle = "#1d1a16";
    ctx.fillRect(x + 110, haut + 24, 16, 3);
    ctx.fillRect(x + 110, haut + 30, 10, 3);
  } else if (cat === "boutiques") {
    // étagères garnies
    for (let r = 0; r < 3; r++) {
      bloc(ctx, x + 4, haut + 18 + r * 14, Math.min(dw - 8, 130), 3, "#7a5a3f");
      for (let k = 0; k < Math.min(9, Math.floor((dw - 16) / 14)); k++) {
        if (hash(i * 50 + r * 9 + k) < 0.2) continue;
        ctx.fillStyle = ["#e63946", "#2a9d8f", "#ffbe0b", "#457b9d", "#f4a261"][(k + r + i) % 5];
        ctx.fillRect(x + 8 + k * 14, haut + 9 + r * 14, 9, 9);
      }
    }
  } else {
    // créatif : mur tagué, micro et projecteur
    const couleurs = ["#ff006e", "#3a86ff", "#ffbe0b", "#06d6a0"];
    couleurs.forEach((c, k) => {
      ctx.fillStyle = c;
      ctx.fillRect(x + 6 + k * 12, haut + 22 + ((k * 5) % 9), 18, 7);
    });
    police(ctx, 13);
    ctx.fillStyle = "#1d1a16";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("CPP", x + 12, haut + 48);
    ctx.fillStyle = "#3a3d46";
    ctx.fillRect(x + 84, sol - 40, 3, 40);
    bloc(ctx, x + 80, sol - 48, 11, 9, "#8a8f99");
    ctx.fillStyle = "rgba(255,240,180,0.22)";
    ctx.beginPath();
    ctx.moveTo(x + dw - 10, haut + 8);
    ctx.lineTo(x + dw - 50, sol);
    ctx.lineTo(x + dw + 20, sol);
    ctx.fill();
    bloc(ctx, x + dw - 16, haut + 6, 12, 8, "#1d1a16");
  }
}

// Façade extérieure d'un étage : fenêtres d'un côté, balcon de l'autre
// (paraboles, linge qui sèche, plantes), fenêtres allumées la nuit.
function facade(ctx: CanvasRenderingContext2D, v: Vue, i: number, haut: number, g: ReturnType<typeof geometrie>, nuit: boolean): void {
  for (const cote of [0, 1]) {
    const fx = cote ? g.coeurX + g.coeurW : g.tourX;
    ctx.fillStyle = (i + cote) % 2 ? "#cdbfa6" : "#c4b59a";
    ctx.fillRect(fx, haut, g.f, FH);
    const graine = i * 7 + cote * 3;
    // fenêtre
    const allumee = nuit ? hash(graine + Math.floor(v.now / 60_000)) < 0.6 : false;
    bloc(ctx, fx + 6, haut + 12, g.f - 12, 26, allumee ? "#ffd77a" : nuit ? "#27305a" : "#8fc9e8", "#6b5d4a");
    ctx.fillStyle = "#6b5d4a";
    ctx.fillRect(fx + g.f / 2 - 1, haut + 12, 2, 26);
    // balcon
    ctx.fillStyle = "#7d7062";
    ctx.fillRect(fx + 2, haut + 44, g.f - 4, 3);
    for (let k = fx + 4; k < fx + g.f - 3; k += 5) ctx.fillRect(k, haut + 47, 2, 12);
    ctx.fillRect(fx + 2, haut + 58, g.f - 4, 3);
    const deco = hash(graine + 11);
    if (deco < 0.3) {
      // parabole
      ctx.fillStyle = "#e8e8e8";
      ctx.beginPath();
      ctx.ellipse(fx + g.f / 2, haut + 40, 8, 6, cote ? 0.5 : -0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (deco < 0.6) {
      // linge
      ctx.fillStyle = "#5b534a";
      ctx.fillRect(fx + 3, haut + 42, g.f - 6, 1);
      ["#e63946", "#3a86ff", "#ffbe0b"].forEach((c, k) => {
        ctx.fillStyle = c;
        ctx.fillRect(fx + 5 + k * 7, haut + 43, 5, 7);
      });
    } else if (deco < 0.75) {
      ctx.fillStyle = "#3f8f4a";
      ctx.fillRect(fx + 6, haut + 38, 8, 6);
      ctx.fillRect(fx + 16, haut + 36, 6, 8);
    }
  }
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
    // papier peint et plinthe
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    for (let k = x + 8; k < x + w; k += 22) ctx.fillRect(k, haut, 6, FH);
    ctx.fillStyle = "#8a7560";
    ctx.fillRect(x, sol - 4, w, 4);
    // fenêtre avec rideaux
    bloc(ctx, x + w - 60, haut + 12, 46, 30, "#5d4a3a");
    ctx.fillStyle = v.now && estNuit(v) ? "#2b3563" : "#9fd7f5";
    ctx.fillRect(x + w - 57, haut + 15, 40, 24);
    ctx.fillStyle = "#e9e1d0";
    ctx.fillRect(x + w - 57, haut + 15, 8, 24);
    ctx.fillRect(x + w - 25, haut + 15, 8, 24);
    // télé sur son meuble
    bloc(ctx, x + w * 0.2, sol - 14, 34, 10, "#7a5a3f");
    bloc(ctx, x + w * 0.2 + 5, sol - 32, 24, 16, "#1f2430");
    ctx.fillStyle = `hsl(${(v.now / 30 + i * 40) % 360} 60% 60%)`;
    ctx.fillRect(x + w * 0.2 + 7, sol - 30, 20, 12);
    // canapé
    const kx = x + w * 0.45;
    bloc(ctx, kx, sol - 22, 64, 8, "#9c4130");
    bloc(ctx, kx, sol - 14, 64, 10, "#b5523b");
    bloc(ctx, kx - 6, sol - 18, 6, 14, "#9c4130");
    bloc(ctx, kx + 64, sol - 18, 6, 14, "#9c4130");
    // plante
    bloc(ctx, x + 8, sol - 12, 10, 10, "#b5651d");
    ctx.fillStyle = "#3f8f4a";
    ctx.fillRect(x + 6, sol - 24, 14, 12);
    ctx.fillRect(x + 10, sol - 30, 6, 6);
    for (const h of residents(s, i)) promeneur(ctx, h, x + 26, x + w - 40, sol, v.now);
  } else {
    const c = commerceDe(e)!;
    const cat = CATEGORIE_PAR_ID[c.categorie];
    ctx.fillStyle = cat.mur;
    ctx.fillRect(x, haut, w, FH);
    // soubassement plus sombre et sol
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(x, haut + FH * 0.6, w, FH * 0.4);
    ctx.fillStyle = "#6e5a48";
    ctx.fillRect(x, sol - 3, w, 3);
    decorCommerce(ctx, c.categorie, x + 6, haut, sol, w * 0.46, v.now, i);
    // comptoir
    const cx = x + w * 0.56;
    const cw = w * 0.4;
    // employés derrière le comptoir
    employes(s, i).forEach((h, k) => {
      const ex = cx + 6 + k * 26;
      const bob = Math.floor(v.now / 400 + h.id) % 2;
      personnage(ctx, h, ex, sol - 8 - bob, 0, true);
    });
    bloc(ctx, cx, sol - 20, cw, 20, "#6b4a2f"); // le comptoir passe devant eux
    bloc(ctx, cx - 3, sol - 24, cw + 6, 5, "#a37a4f");
    bloc(ctx, cx + cw - 22, sol - 34, 16, 10, "#3a3d46");
    ctx.fillStyle = "#7cf29a";
    ctx.fillRect(cx + cw - 19, sol - 32, 10, 3);
    indicateursStock(ctx, s, i, x + w - 6, haut + 6, v.now);
  }

  // étiquette et dalle
  const c = commerceDe(e);
  const nom = e.chantierFin !== null ? "" : c ? `${c.icone} ${c.nom}` : "Appart";
  if (nom) pastille(ctx, `${i + 1} · ${nom}`, x + 4, haut + 4, "rgba(29,26,22,0.8)", "#fff");
  // ombre portée du plafond
  const ombre = ctx.createLinearGradient(0, haut, 0, haut + 12);
  ombre.addColorStop(0, "rgba(0,0,0,0.28)");
  ombre.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = ombre;
  ctx.fillRect(x, haut, w, 12);
  ctx.fillStyle = "#5b534a";
  ctx.fillRect(g.coeurX, bas - 4, g.coeurW, 4);
  ctx.fillStyle = CONTOUR;
  ctx.fillRect(g.coeurX, bas - 5, g.coeurW, 1);
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
    const vx = x + 10 + k * 30;
    const graine = cible * 17 + k * 101;
    personnage(ctx, apparenceVisiteur(graine), vx, bas - 8, 0, true);
    // bulle avec l'étage voulu
    const by = bas - 8 - 62 - (Math.floor(v.now / 500 + k) % 2);
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
  const sx = g.coeurX + MUR;
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
  if (occupe && c) personnage(ctx, apparenceVisiteur(c.visiteur), sx + 10, cy + hCab - 1, 0, false);

  // murs de façade
  ctx.fillStyle = "#a89880";
  ctx.fillRect(g.coeurX, top - FH, MUR, g.baseY - top + FH);
  ctx.fillRect(g.coeurX + g.coeurW - MUR, top - FH, MUR, g.baseY - top + FH);
}

function fantomeEtToit(ctx: CanvasRenderingContext2D, s: Etat, v: Vue, g: ReturnType<typeof geometrie>): void {
  const bas = g.baseY - LH - s.etages.length * FH;
  const haut = bas - FH;
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.strokeRect(g.coeurX + MUR + 2, haut + 4, g.coeurW - 2 * MUR - 4, FH - 8);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(g.coeurX + MUR + 2, haut + 4, g.coeurW - 2 * MUR - 4, FH - 8);
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
  if (nuit) {
    // intérieurs un peu tamisés la nuit (les façades gardent leurs fenêtres allumées)
    ctx.fillStyle = "rgba(20,20,60,0.14)";
    ctx.fillRect(g.coeurX, 0, g.coeurW, g.baseY);
  }
  // façades : rez-de-chaussée en piliers, puis un balcon par étage
  for (const fx of [g.tourX, g.coeurX + g.coeurW]) {
    ctx.fillStyle = "#9c8e78";
    ctx.fillRect(fx, g.baseY - LH, g.f, LH);
    ctx.fillStyle = "#8a7c68";
    for (let k = 0; k < 3; k++) ctx.fillRect(fx + 4 + k * 9, g.baseY - LH + 8, 5, LH - 12);
  }
  for (let i = 0; i < s.etages.length; i++) {
    const haut = g.baseY - LH - (i + 1) * FH;
    if (haut + FH < -10 || haut > v.H + 10) continue;
    facade(ctx, v, i, haut, g, nuit);
    ctx.fillStyle = "#8a7c68";
    ctx.fillRect(g.tourX, haut + FH - 4, g.f, 4);
    ctx.fillRect(g.coeurX + g.coeurW, haut + FH - 4, g.f, 4);
  }
  // contour de l'immeuble
  const top = g.baseY - LH - s.etages.length * FH;
  ctx.strokeStyle = CONTOUR;
  ctx.lineWidth = 2;
  ctx.strokeRect(g.tourX, top, g.tourW, g.baseY - top);
  fantomeEtToit(ctx, s, v, g);
}
