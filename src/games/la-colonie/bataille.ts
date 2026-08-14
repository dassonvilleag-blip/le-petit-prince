// La Colonie — la scène de bataille. Quand une expédition se résout, on ne
// lit pas un rapport : on REGARDE le combat. La chorégraphie est déterministe
// (seed du rapport) et aboutit exactement aux pertes et au verdict calculés
// par la simulation.

import { EXPEDITION_PAR_ID, RESOURCES, UNITE_PAR_ID, type ResourceId, type UnitId } from "./data";
import type { Rapport } from "./state";
import { ENNEMI_PAR_EXPEDITION, EXP_IMG, peindreEnnemi, peindreFourmi, type EnnemiId } from "./sprites";

const overlay = document.getElementById("bataille")!;
const bCanvas = document.getElementById("bataille-canvas") as HTMLCanvasElement;
const bCtx = bCanvas.getContext("2d")!;
const bBouton = document.getElementById("bataille-bouton") as HTMLButtonElement;

interface Combattant {
  camp: "allie" | "ennemi";
  type: UnitId | EnnemiId;
  x0: number; // position de rang (fraction de la largeur)
  y0: number;
  naissance: number; // instant d'entrée en scène
  mort: number | null; // instant de chute, sinon null
  phase: number;
}

let enCours = false;
let raf = 0;
let fini: (() => void) | null = null;

export function batailleEnCours(): boolean {
  return enCours;
}

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

const DUREE_ENTREE = 1.4;
const DEBUT_MELEE = 1.8;
const FIN_MELEE = 5.6;
const DUREE_TOTALE = 8.5;

export function jouerBataille(rapport: Rapport, onFin: () => void): void {
  if (enCours || !rapport.defId || rapport.seed === undefined) {
    onFin();
    return;
  }
  const def = EXPEDITION_PAR_ID.get(rapport.defId);
  if (!def) {
    onFin();
    return;
  }
  enCours = true;
  fini = onFin;
  overlay.classList.add("show");
  bBouton.textContent = "passer ▸";

  const r = mulberry32(rapport.seed);
  const ennemiType = ENNEMI_PAR_EXPEDITION[rapport.defId] ?? "criquet";
  const decor = new Image();
  decor.src = `../../colonie/${EXP_IMG[rapport.defId]}.jpg?v=2`;

  // effectifs : les alliés réels, des ennemis proportionnés à la difficulté
  const combattants: Combattant[] = [];
  const effectif = rapport.effectif ?? { ouvriere: 0, soldate: 1 };
  const allies: UnitId[] = [];
  for (const [u, n] of Object.entries(effectif) as [UnitId, number][])
    for (let i = 0; i < n; i++) allies.push(u);
  const nEnnemis = Math.max(1, Math.min(8, Math.round(def.difficulte / 9)));

  const range = (n: number, camp: "allie" | "ennemi"): { x: number; y: number }[] => {
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const colonne = Math.floor(i / 4);
      const rang = i % 4;
      const x = camp === "allie" ? 0.3 - colonne * 0.09 : 0.7 + colonne * 0.09;
      out.push({ x: x + (r() - 0.5) * 0.03, y: 0.62 + rang * 0.09 + (r() - 0.5) * 0.03 });
    }
    return out;
  };

  const posA = range(allies.length, "allie");
  allies.forEach((type, i) =>
    combattants.push({ camp: "allie", type, x0: posA[i].x, y0: posA[i].y, naissance: r() * DUREE_ENTREE * 0.5, mort: null, phase: r() * 7 })
  );
  const posE = range(nEnnemis, "ennemi");
  for (let i = 0; i < nEnnemis; i++)
    combattants.push({ camp: "ennemi", type: ennemiType, x0: posE[i].x, y0: posE[i].y, naissance: r() * DUREE_ENTREE * 0.5, mort: null, phase: r() * 7 });

  // programmer les chutes pour retomber exactement sur le bilan du rapport
  const pertes = rapport.pertes ?? { ouvriere: 0, soldate: 0 };
  const tombes: Combattant[] = [];
  for (const [u, n] of Object.entries(pertes) as [UnitId, number][]) {
    const vivants = combattants.filter((c) => c.camp === "allie" && c.type === u && c.mort === null && !tombes.includes(c));
    for (let i = 0; i < n && i < vivants.length; i++) tombes.push(vivants[i]);
  }
  const ennemisTombes = combattants.filter((c) => c.camp === "ennemi");
  const nEnnemisTombes = rapport.victoire
    ? ennemisTombes.length
    : Math.min(ennemisTombes.length - 1, Math.round(ennemisTombes.length * 0.4));
  const chutes = [...tombes, ...ennemisTombes.slice(0, nEnnemisTombes)];
  chutes.forEach((c, i) => {
    c.mort = DEBUT_MELEE + 0.4 + ((FIN_MELEE - DEBUT_MELEE - 0.8) * (i + r() * 0.6)) / Math.max(1, chutes.length);
  });

  // impacts : de petites étincelles pendant toute la mêlée
  const impacts: { t: number; x: number; y: number }[] = [];
  for (let tI = DEBUT_MELEE; tI < FIN_MELEE; tI += 0.22 + r() * 0.25)
    impacts.push({ t: tI, x: 0.42 + r() * 0.16, y: 0.55 + r() * 0.35 });

  const depart = performance.now();

  const dessiner = (): void => {
    const t = (performance.now() - depart) / 1000;
    const W = bCanvas.clientWidth;
    const H = bCanvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    if (bCanvas.width !== W * dpr) {
      bCanvas.width = W * dpr;
      bCanvas.height = H * dpr;
    }
    bCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // décor : l'illustration de l'expédition, légèrement assombrie
    bCtx.fillStyle = "#2b1a0d";
    bCtx.fillRect(0, 0, W, H);
    if (decor.complete && decor.naturalWidth > 0) {
      const s = Math.max(W / decor.naturalWidth, H / decor.naturalHeight);
      bCtx.drawImage(decor, (W - decor.naturalWidth * s) / 2, (H - decor.naturalHeight * s) / 2, decor.naturalWidth * s, decor.naturalHeight * s);
      bCtx.fillStyle = "rgba(20,10,4,0.25)";
      bCtx.fillRect(0, 0, W, H);
    }
    // bande de sol pour ancrer les combattants
    const solG = bCtx.createLinearGradient(0, H * 0.5, 0, H);
    solG.addColorStop(0, "rgba(40,24,10,0)");
    solG.addColorStop(1, "rgba(40,24,10,0.75)");
    bCtx.fillStyle = solG;
    bCtx.fillRect(0, H * 0.5, W, H * 0.5);

    // tremblement d'écran sur les impacts récents
    let shakeX = 0;
    let shakeY = 0;
    for (const imp of impacts) {
      const d = t - imp.t;
      if (d > 0 && d < 0.15) {
        shakeX += Math.sin(t * 90) * 3 * (1 - d / 0.15);
        shakeY += Math.cos(t * 77) * 2 * (1 - d / 0.15);
      }
    }
    bCtx.save();
    bCtx.translate(shakeX, shakeY);

    const taille = Math.min(W, H) * 0.085;
    const triees = [...combattants].sort((a, b) => a.y0 - b.y0);
    for (const c of triees) {
      if (t < c.naissance) continue;
      const entree = Math.min(1, (t - c.naissance) / 0.8);
      const ease = 1 - (1 - entree) ** 3;
      const bordX = c.camp === "allie" ? -0.1 : 1.1;
      let x = bordX + (c.x0 - bordX) * ease;
      let y = c.y0;
      const mortDepuis = c.mort !== null && t > c.mort ? t - c.mort : 0;

      // pendant la mêlée, chacun s'élance vers le centre en petits assauts
      if (mortDepuis === 0 && t > DEBUT_MELEE && t < FIN_MELEE + 0.4) {
        const elan = Math.max(0, Math.sin(t * 2.4 + c.phase * 3));
        x += (c.camp === "allie" ? 1 : -1) * elan * 0.045;
        y += Math.sin(t * 5 + c.phase) * 0.008;
      }
      // dénouement : les vaincus fuient, les vainqueurs sautillent
      if (t > FIN_MELEE && mortDepuis === 0) {
        const gagne = rapport.victoire ? c.camp === "allie" : c.camp === "ennemi";
        if (gagne) y += Math.abs(Math.sin((t - FIN_MELEE) * 6 + c.phase)) * -0.015;
        else x += (c.camp === "allie" ? -1 : 1) * (t - FIN_MELEE) * 0.22;
      }

      const px = x * W;
      const py = y * H;
      const angle = c.camp === "allie" ? 0 : Math.PI;
      bCtx.save();
      if (mortDepuis > 0) {
        // chute : on se retourne et on s'estompe
        bCtx.globalAlpha = Math.max(0, 1 - mortDepuis / 1.6);
        bCtx.translate(px, py);
        bCtx.rotate(Math.min(Math.PI, mortDepuis * 6));
        bCtx.translate(-px, -py);
      }
      if (c.camp === "allie") peindreFourmi(bCtx, px, py, taille, angle, t * 9 + c.phase, c.type === "soldate");
      else peindreEnnemi(bCtx, c.type as EnnemiId, px, py, taille * 1.15, angle, t * 8 + c.phase);
      bCtx.restore();
    }

    // étincelles d'impact
    for (const imp of impacts) {
      const d = t - imp.t;
      if (d < 0 || d > 0.3) continue;
      const a = 1 - d / 0.3;
      bCtx.strokeStyle = `rgba(255,220,120,${a})`;
      bCtx.lineWidth = 2.5;
      for (let b = 0; b < 6; b++) {
        const ang = (b / 6) * Math.PI * 2 + imp.t * 13;
        const r0 = 4 + d * 46;
        bCtx.beginPath();
        bCtx.moveTo(imp.x * W + Math.cos(ang) * r0 * 0.4, imp.y * H + Math.sin(ang) * r0 * 0.4);
        bCtx.lineTo(imp.x * W + Math.cos(ang) * r0, imp.y * H + Math.sin(ang) * r0);
        bCtx.stroke();
      }
    }
    bCtx.restore();

    // titre d'entrée puis bannière de fin
    bCtx.textAlign = "center";
    bCtx.textBaseline = "middle";
    if (t < DEBUT_MELEE) {
      bCtx.font = `${Math.min(W, H) * 0.07}px "Pixelify Sans", "VT323", monospace`;
      bCtx.fillStyle = "rgba(255,253,244,0.95)";
      bCtx.fillText(`${def.emoji} ${def.nom}`, W / 2, H * 0.16);
    }
    if (t > FIN_MELEE + 0.3) {
      const a = Math.min(1, (t - FIN_MELEE - 0.3) / 0.5);
      bCtx.fillStyle = `rgba(23,18,6,${a * 0.72})`;
      bCtx.fillRect(0, H * 0.32, W, H * 0.36);
      bCtx.font = `${Math.min(W, H) * 0.11}px "Pixelify Sans", "VT323", monospace`;
      bCtx.fillStyle = rapport.victoire ? `rgba(255,209,102,${a})` : `rgba(224,116,102,${a})`;
      bCtx.fillText(rapport.victoire ? "⚔️ VICTOIRE !" : "💔 DÉFAITE…", W / 2, H * 0.44);
      bCtx.font = `${Math.min(W, H) * 0.052}px "VT323", monospace`;
      bCtx.fillStyle = `rgba(255,253,244,${a})`;
      const butin = Object.entries(rapport.butinGagne ?? {})
        .map(([res, n]) => `+${n} ${RESOURCES[res as ResourceId].emoji}`)
        .join("   ");
      const pertesTotal = Object.values(rapport.pertes ?? {}).reduce((s, n) => s + n, 0);
      const bilan: string[] = [];
      if (butin) bilan.push(butin);
      bilan.push(pertesTotal > 0 ? `${pertesTotal} ${UNITE_PAR_ID.get("ouvriere")!.emoji} perdue(s)` : "aucune perte");
      bCtx.fillText(bilan.join("   ·   "), W / 2, H * 0.56);
      if (bBouton.textContent !== "continuer ✓") bBouton.textContent = "continuer ✓";
    }

    if (t < DUREE_TOTALE) raf = requestAnimationFrame(dessiner);
  };

  raf = requestAnimationFrame(dessiner);
}

function fermer(): void {
  if (!enCours) return;
  cancelAnimationFrame(raf);
  overlay.classList.remove("show");
  enCours = false;
  const cb = fini;
  fini = null;
  cb?.();
}

bBouton.addEventListener("click", fermer);
