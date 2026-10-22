// L'avis de recherche (pour qui a eu une prime) et la Vivre Card (pour tous).

import { dessinerPortrait, canvasNet, type TraitsPortrait } from "./portrait.ts";
import { creerRng, hacher } from "../rng.ts";

export interface DonneesAvis {
  traits: TraitsPortrait;
  nom: string;
  prime: number;
  mort?: boolean;
  /** Mention en bas : « MARINE » ou autre. */
  pied?: string;
}

function papier(ctx: CanvasRenderingContext2D, l: number, h: number, graine: number, teinte = "#e9d8ad"): void {
  ctx.fillStyle = teinte;
  ctx.fillRect(0, 0, l, h);
  const rng = creerRng(hacher(`${graine}:papier`));
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(90,60,30,${rng() * 0.07})`;
    ctx.fillRect(rng() * l, rng() * h, 1 + rng() * 2, 1 + rng() * 2);
  }
  const g = ctx.createRadialGradient(l / 2, h / 2, Math.min(l, h) * 0.3, l / 2, h / 2, Math.max(l, h) * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(90,55,20,0.35)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, l, h);
}

export function formatBerry(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")}-`;
}

/** Un avis de recherche de 240×340 (multiplié par `echelle`). */
export function avisDeRecherche(d: DonneesAvis, echelle = 1): HTMLCanvasElement {
  const L = 240 * echelle;
  const H = 340 * echelle;
  const { canvas, ctx } = canvasNet(L, H);
  ctx.scale(echelle, echelle);
  const l = 240;
  papier(ctx, l, 340, d.traits.graine);
  const encre = "#3a2614";
  ctx.fillStyle = encre;
  ctx.textAlign = "center";
  ctx.font = "bold 46px Georgia, 'Times New Roman', serif";
  ctx.fillText("WANTED", l / 2, 52);

  // La photo.
  ctx.fillStyle = "#d9c79a";
  ctx.fillRect(22, 64, l - 44, 168);
  ctx.save();
  ctx.beginPath();
  ctx.rect(22, 64, l - 44, 168);
  ctx.clip();
  ctx.fillStyle = "#cdb98a";
  ctx.fillRect(22, 64, l - 44, 168);
  dessinerPortrait(ctx, l / 2 - 90, 62, 180, d.traits);
  ctx.restore();
  ctx.strokeStyle = encre;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(22, 64, l - 44, 168);

  ctx.fillStyle = encre;
  ctx.font = "bold 19px Georgia, serif";
  ctx.fillText("DEAD OR ALIVE", l / 2, 256);
  ctx.font = "bold 17px Georgia, serif";
  const nom = d.nom.toUpperCase();
  let taille = 17;
  while (ctx.measureText(nom).width > l - 30 && taille > 9) {
    taille--;
    ctx.font = `bold ${taille}px Georgia, serif`;
  }
  ctx.fillText(nom, l / 2, 282);
  ctx.font = "bold 20px Georgia, serif";
  ctx.textAlign = "left";
  const prime = formatBerry(d.prime);
  const largeur = ctx.measureText(prime).width + 22;
  const x0 = l / 2 - largeur / 2;
  // Le symbole du berry : un B barré de deux traits.
  ctx.font = "bold 22px Georgia, serif";
  ctx.fillText("B", x0, 310);
  ctx.fillRect(x0 + 2, 297, 13, 2);
  ctx.fillRect(x0 + 2, 302, 13, 2);
  ctx.font = "bold 20px Georgia, serif";
  ctx.fillText(prime, x0 + 20, 310);
  ctx.textAlign = "center";
  ctx.font = "bold 11px Georgia, serif";
  ctx.fillText(d.pied ?? "MARINE", l / 2, 330);

  if (d.mort) {
    ctx.save();
    ctx.translate(l / 2, 160);
    ctx.rotate(-0.32);
    ctx.strokeStyle = "rgba(170,25,20,0.85)";
    ctx.fillStyle = "rgba(170,25,20,0.85)";
    ctx.lineWidth = 4;
    ctx.strokeRect(-78, -26, 156, 52);
    ctx.font = "bold 38px Georgia, serif";
    ctx.fillText("DEAD", 0, 14);
    ctx.restore();
  }
  return canvas;
}

/** La Vivre Card : un bout de papier qui se consume avec la vie. `reste` de 0 à 1. */
export function vivreCard(graine: number, reste: number, largeur = 120, hauteur = 70): HTMLCanvasElement {
  const { canvas, ctx } = canvasNet(largeur, hauteur);
  const rng = creerRng(hacher(`${graine}:vivre`));
  const r = Math.max(0, Math.min(1, reste));
  const bord = largeur * (0.08 + 0.92 * r);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(bord, 0);
  for (let y = 0; y <= hauteur; y += 4) ctx.lineTo(bord - rng() * Math.min(10, bord), y);
  ctx.lineTo(0, hauteur);
  ctx.closePath();
  ctx.clip();
  papier(ctx, largeur, hauteur, graine, "#f4efe2");
  ctx.restore();
  if (r < 1) {
    ctx.strokeStyle = r > 0 ? "rgba(255,140,40,0.9)" : "rgba(60,40,30,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const rng2 = creerRng(hacher(`${graine}:vivre`));
    ctx.moveTo(bord, 0);
    for (let y = 0; y <= hauteur; y += 4) ctx.lineTo(bord - rng2() * Math.min(10, bord), y);
    ctx.stroke();
  }
  return canvas;
}
