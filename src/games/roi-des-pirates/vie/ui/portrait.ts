// Un portrait dessiné à partir de la graine : le même visage d'un bout à
// l'autre de la vie, qui vieillit, se balafre, change de chapeau.

import type { EtatVie } from "../etat.ts";
import type { Camp, Peuple, Sexe } from "../types.ts";
import { creerRng, hacher, parmi } from "../rng.ts";
import { PEUPLES, grade as gradeParId } from "../monde.ts";

export interface TraitsPortrait {
  graine: number;
  sexe: Sexe;
  peuple: Peuple;
  /** Âge à l'échelle humaine. */
  age: number;
  camp: Camp;
  rang: number;
  zone: string;
  classe: string;
  blessures: number;
  rieur: boolean;
}

export function traitsDe(v: EtatVie): TraitsPortrait {
  const g = v.grade ? gradeParId(v.grade) : undefined;
  return {
    graine: v.graine,
    sexe: v.sexe,
    peuple: v.peuple,
    age: Math.floor(v.age / PEUPLES[v.peuple].longevite),
    camp: v.camp,
    rang: g && g.camp === v.camp ? g.rang : 0,
    zone: v.zone,
    classe: v.classe,
    blessures: v.flagsVus.filter((f) => f.startsWith("blessure:")).length,
    rieur: v.traits.includes("rieur") || v.traits.includes("rire-contagieux"),
  };
}

const PEAUX = ["#f6d7b0", "#efc9a0", "#e2b48a", "#c99266", "#a8714a", "#7d4f31", "#5a3622"];
const PEAUX_POISSON = ["#7fb4d0", "#6fae9a", "#d08080", "#8fbf74", "#a99ad4", "#e0a060"];
const FOURRURES = ["#d9a05b", "#f0e4cc", "#8b6b4a", "#e3c26c", "#b8b8b8", "#c47a3c"];
const CHEVEUX = ["#1d1a1a", "#2c1d14", "#4a2e1a", "#7a4a22", "#c9a24a", "#e3c766", "#b0402a", "#d86a2c", "#3f7a3a", "#d07fa8", "#3a5fa8", "#e9e4dc", "#6a3a8a"];
const POIDS_CHEVEUX = [30, 22, 16, 10, 6, 4, 4, 3, 1.5, 1.5, 1.2, 0.6, 0.6];

function choisirPondere<T>(rng: () => number, items: T[], poids: number[]): T {
  const total = poids.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= poids[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

function melanger(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const c = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

const VETEMENTS: Record<Camp, string[]> = {
  civil: ["#7a6a52", "#5a6b7a", "#8a5a3a", "#6a7a4a", "#9a8a6a", "#4a5a6a"],
  pirate: ["#8a2a2a", "#2a2a2a", "#2a4a7a", "#6a2a6a", "#c08a2a", "#1a5a4a"],
  marine: ["#f2f2ee"],
  revolution: ["#2a3a2a", "#3a2a2a"],
  "cipher-pol": ["#1a1a1e"],
  chasseur: ["#4a3a2a", "#3a3a3a", "#5a2a1a"],
  pegre: ["#2a1a2a", "#3a2a1a", "#1a1a1a"],
  esclave: ["#8a8478"],
  celeste: ["#f6f4ec"],
};

/** Dessine le portrait dans un carré (x, y, taille). */
export function dessinerPortrait(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: TraitsPortrait): void {
  const rng = creerRng(hacher(`${t.graine}:portrait`));
  const enfant = t.age < 13;
  const vieux = t.age >= 55;
  const tresVieux = t.age >= 72;

  const peau = t.peuple === "homme-poisson" || t.peuple === "sirene" ? parmi(rng, PEAUX_POISSON)
    : t.peuple === "mink" ? parmi(rng, FOURRURES)
    : t.peuple === "lunarien" ? "#5a3e30"
    : parmi(rng, PEAUX);
  let cheveux = choisirPondere(rng, CHEVEUX, POIDS_CHEVEUX);
  if (t.peuple === "lunarien") cheveux = "#f4f1ea";
  if (t.age >= 45) cheveux = melanger(cheveux, "#b8b4ac", Math.min(1, (t.age - 45) / 25));
  if (tresVieux) cheveux = "#e8e4dc";
  const coupe = Math.floor(rng() * 7);
  const vetement = parmi(rng, VETEMENTS[t.camp]);
  const barbe = t.sexe === "h" && t.age >= 22 && rng() < (t.peuple === "geant" ? 0.7 : 0.35);
  const chauve = t.sexe === "h" && t.age >= 50 && rng() < 0.3;
  const yeuxEcart = 0.11 + rng() * 0.04;
  const formeVisage = 0.9 + rng() * 0.18;
  const bandana = rng() < 0.4;
  const boucle = rng() < 0.3;

  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const encre = "#2a1c12";
  const trait = Math.max(1, s * 0.012);

  const cx = s / 2;
  const tete = s * (enfant ? 0.27 : 0.24) * (t.peuple === "geant" ? 1.06 : 1);
  const cy = s * (enfant ? 0.5 : 0.46);

  // Ailes (ciel, Lunariens) — derrière tout.
  if (t.peuple === "skypieen" || t.peuple === "shandia") {
    ctx.fillStyle = "#f4f2ea";
    ctx.strokeStyle = encre;
    ctx.lineWidth = trait;
    for (const sens of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + sens * tete * 1.15, cy + tete * 1.25, tete * 0.42, tete * 0.22, sens * -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  if (t.peuple === "lunarien") {
    ctx.fillStyle = "#1a1416";
    for (const sens of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sens * tete * 0.6, cy + tete * 1.1);
      ctx.quadraticCurveTo(cx + sens * tete * 2.1, cy - tete * 0.4, cx + sens * tete * 1.7, cy + tete * 1.6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,140,40,0.85)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + tete * 1.5, tete * 0.5, tete * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Épaules et vêtements.
  ctx.fillStyle = vetement;
  ctx.strokeStyle = encre;
  ctx.lineWidth = trait;
  ctx.beginPath();
  const epaule = s * (enfant ? 0.34 : 0.42) * (t.peuple === "geant" ? 1.1 : 1);
  ctx.moveTo(cx - epaule, s * 1.02);
  ctx.quadraticCurveTo(cx - epaule, cy + tete * 1.25, cx, cy + tete * 1.15);
  ctx.quadraticCurveTo(cx + epaule, cy + tete * 1.25, cx + epaule, s * 1.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (t.camp === "marine") {
    ctx.fillStyle = "#2a4a8a";
    ctx.beginPath();
    ctx.moveTo(cx - tete * 0.55, cy + tete * 1.18);
    ctx.lineTo(cx, cy + tete * 1.65);
    ctx.lineTo(cx + tete * 0.55, cy + tete * 1.18);
    ctx.closePath();
    ctx.fill();
  }
  if (t.camp === "esclave") {
    ctx.fillStyle = "#6a6a70";
    ctx.fillRect(cx - tete * 0.42, cy + tete * 0.95, tete * 0.84, tete * 0.16);
    ctx.strokeRect(cx - tete * 0.42, cy + tete * 0.95, tete * 0.84, tete * 0.16);
  }

  // Cheveux de derrière (longs), sous le cou : sinon ils dessinent une barbe.
  if (!chauve && (coupe === 2 || coupe === 5 || (t.sexe === "f" && coupe !== 4))) {
    ctx.fillStyle = cheveux;
    ctx.beginPath();
    ctx.ellipse(cx, cy + tete * 0.35, tete * 1.08, tete * (coupe === 5 ? 1.35 : 1.1), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cou.
  ctx.fillStyle = peau;
  ctx.fillRect(cx - tete * 0.28, cy + tete * 0.6, tete * 0.56, tete * 0.5);
  if (t.peuple === "homme-poisson" || t.peuple === "sirene") {
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - tete * 0.22, cy + tete * (0.72 + i * 0.1));
      ctx.lineTo(cx - tete * 0.08, cy + tete * (0.76 + i * 0.1));
      ctx.stroke();
    }
  }

  // Oreilles.
  ctx.fillStyle = peau;
  ctx.strokeStyle = encre;
  if (t.peuple === "mink") {
    const rondes = rng() < 0.5;
    for (const sens of [-1, 1]) {
      ctx.beginPath();
      if (rondes) ctx.ellipse(cx + sens * tete * 0.7, cy - tete * 0.85, tete * 0.28, tete * 0.28, 0, 0, Math.PI * 2);
      else {
        ctx.moveTo(cx + sens * tete * 0.35, cy - tete * 0.7);
        ctx.lineTo(cx + sens * tete * 0.85, cy - tete * 1.45);
        ctx.lineTo(cx + sens * tete * 0.95, cy - tete * 0.4);
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();
    }
  } else {
    for (const sens of [-1, 1]) {
      ctx.beginPath();
      if (t.peuple === "homme-poisson" || t.peuple === "sirene") {
        ctx.moveTo(cx + sens * tete * 0.9, cy - tete * 0.1);
        ctx.lineTo(cx + sens * tete * 1.3, cy - tete * 0.35);
        ctx.lineTo(cx + sens * tete * 0.95, cy + tete * 0.25);
        ctx.closePath();
      } else {
        ctx.ellipse(cx + sens * tete * 0.92, cy + tete * 0.05, tete * 0.14, tete * 0.22, 0, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
    }
  }

  // Le visage.
  ctx.fillStyle = peau;
  ctx.beginPath();
  ctx.ellipse(cx, cy, tete * 0.92 * formeVisage, tete * (enfant ? 0.95 : 1.02), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (t.peuple === "geant" || (t.sexe === "h" && !enfant && formeVisage > 1.02)) {
    // Mâchoire carrée.
    ctx.beginPath();
    ctx.moveTo(cx - tete * 0.8, cy + tete * 0.2);
    ctx.quadraticCurveTo(cx - tete * 0.75, cy + tete * 0.95, cx, cy + tete * 1.02);
    ctx.quadraticCurveTo(cx + tete * 0.75, cy + tete * 0.95, cx + tete * 0.8, cy + tete * 0.2);
    ctx.fill();
  }
  if (t.peuple === "mink") {
    ctx.fillStyle = melanger(peau.startsWith("#") ? peau : "#d9a05b", "#ffffff", 0.45);
    ctx.beginPath();
    ctx.ellipse(cx, cy + tete * 0.42, tete * 0.42, tete * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Taches de rousseur, peinture shandia, rides.
  if (t.peuple === "shandia") {
    ctx.strokeStyle = "#a8302a";
    ctx.lineWidth = trait * 1.6;
    for (const sens of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sens * tete * 0.35, cy + tete * 0.15);
      ctx.lineTo(cx + sens * tete * 0.7, cy + tete * 0.25);
      ctx.stroke();
    }
    ctx.lineWidth = trait;
  }
  if (vieux) {
    ctx.strokeStyle = "rgba(60,40,30,0.45)";
    for (let i = 0; i < (tresVieux ? 3 : 2); i++) {
      ctx.beginPath();
      ctx.moveTo(cx - tete * 0.35, cy - tete * (0.55 - i * 0.1));
      ctx.quadraticCurveTo(cx, cy - tete * (0.6 - i * 0.1), cx + tete * 0.35, cy - tete * (0.55 - i * 0.1));
      ctx.stroke();
    }
    for (const sens of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sens * tete * 0.3, cy + tete * 0.35);
      ctx.quadraticCurveTo(cx + sens * tete * 0.42, cy + tete * 0.55, cx + sens * tete * 0.3, cy + tete * 0.7);
      ctx.stroke();
    }
  }

  // Les yeux.
  const yeuxY = cy - tete * 0.02;
  const tailleOeil = tete * (enfant ? 0.17 : 0.13);
  for (const sens of [-1, 1]) {
    const ox = cx + sens * s * yeuxEcart;
    ctx.fillStyle = "#fbf8f0";
    ctx.beginPath();
    ctx.ellipse(ox, yeuxY, tailleOeil * 0.85, tailleOeil, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = encre;
    ctx.stroke();
    ctx.fillStyle = t.peuple === "lunarien" ? "#d0402a" : encre;
    ctx.beginPath();
    ctx.ellipse(ox + sens * tailleOeil * 0.1, yeuxY + tailleOeil * 0.1, tailleOeil * 0.5, tailleOeil * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ox + sens * tailleOeil * 0.2 - tailleOeil * 0.15, yeuxY - tailleOeil * 0.15, tailleOeil * 0.18, 0, Math.PI * 2);
    ctx.fill();
    // Sourcils.
    ctx.strokeStyle = t.peuple === "mink" ? encre : cheveux;
    ctx.lineWidth = trait * 2;
    ctx.beginPath();
    ctx.moveTo(ox - tailleOeil, yeuxY - tailleOeil * 1.5 + (sens > 0 ? 0 : 1));
    ctx.lineTo(ox + tailleOeil, yeuxY - tailleOeil * 1.7);
    ctx.stroke();
    ctx.lineWidth = trait;
    if (t.sexe === "f" && !enfant) {
      ctx.strokeStyle = encre;
      ctx.beginPath();
      ctx.moveTo(ox + sens * tailleOeil * 0.8, yeuxY - tailleOeil * 0.6);
      ctx.lineTo(ox + sens * tailleOeil * 1.2, yeuxY - tailleOeil * 0.9);
      ctx.stroke();
    }
  }
  if (t.peuple === "trois-yeux") {
    ctx.fillStyle = "#fbf8f0";
    ctx.beginPath();
    ctx.ellipse(cx, cy - tete * 0.42, tailleOeil * 0.7, tailleOeil * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = encre;
    ctx.beginPath();
    ctx.arc(cx, cy - tete * 0.4, tailleOeil * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nez et bouche.
  ctx.strokeStyle = encre;
  ctx.beginPath();
  if (t.peuple === "mink") {
    ctx.fillStyle = encre;
    ctx.ellipse(cx, cy + tete * 0.3, tete * 0.1, tete * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.moveTo(cx + tete * 0.04, cy + tete * 0.12);
    ctx.lineTo(cx - tete * 0.04, cy + tete * 0.3);
    ctx.lineTo(cx + tete * 0.06, cy + tete * 0.32);
    ctx.stroke();
  }
  ctx.beginPath();
  if (t.rieur) {
    ctx.fillStyle = "#5a1a1a";
    ctx.moveTo(cx - tete * 0.38, cy + tete * 0.48);
    ctx.quadraticCurveTo(cx, cy + tete * 0.95, cx + tete * 0.38, cy + tete * 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx - tete * 0.3, cy + tete * 0.5, tete * 0.6, tete * 0.08);
  } else {
    const humeur = t.camp === "esclave" ? -0.05 : 0.08;
    ctx.moveTo(cx - tete * 0.22, cy + tete * 0.55);
    ctx.quadraticCurveTo(cx, cy + tete * (0.55 + humeur * 2), cx + tete * 0.22, cy + tete * 0.55);
    ctx.stroke();
  }

  // Barbe.
  if (barbe) {
    ctx.fillStyle = cheveux;
    ctx.beginPath();
    ctx.moveTo(cx - tete * 0.75, cy + tete * 0.35);
    ctx.quadraticCurveTo(cx - tete * 0.6, cy + tete * 1.25, cx, cy + tete * (t.peuple === "geant" ? 1.5 : 1.2));
    ctx.quadraticCurveTo(cx + tete * 0.6, cy + tete * 1.25, cx + tete * 0.75, cy + tete * 0.35);
    ctx.quadraticCurveTo(cx, cy + tete * 0.8, cx - tete * 0.75, cy + tete * 0.35);
    ctx.fill();
  }

  // Cicatrices.
  if (t.blessures > 0) {
    ctx.strokeStyle = "#8a2a20";
    ctx.lineWidth = trait * 1.4;
    ctx.beginPath();
    ctx.moveTo(cx + tete * 0.25, cy - tete * 0.4);
    ctx.lineTo(cx + tete * 0.55, cy + tete * 0.25);
    ctx.stroke();
    if (t.blessures > 1) {
      ctx.beginPath();
      ctx.moveTo(cx - tete * 0.6, cy + tete * 0.2);
      ctx.lineTo(cx - tete * 0.3, cy + tete * 0.42);
      ctx.moveTo(cx - tete * 0.55, cy + tete * 0.42);
      ctx.lineTo(cx - tete * 0.35, cy + tete * 0.18);
      ctx.stroke();
    }
    ctx.lineWidth = trait;
  }

  // Cheveux de devant.
  if (!chauve && t.peuple !== "mink") {
    ctx.fillStyle = cheveux;
    ctx.strokeStyle = encre;
    ctx.beginPath();
    const haut = cy - tete * 1.02;
    switch (coupe) {
      case 0: // court
        ctx.ellipse(cx, cy - tete * 0.55, tete * 0.95, tete * 0.55, 0, Math.PI, Math.PI * 2);
        break;
      case 1: // en pétard
        ctx.moveTo(cx - tete * 0.95, cy - tete * 0.3);
        for (let i = 0; i <= 6; i++) {
          const a = Math.PI + (i / 6) * Math.PI;
          const r = tete * (i % 2 ? 1.35 : 1.0);
          ctx.lineTo(cx + Math.cos(a) * r, cy - tete * 0.25 + Math.sin(a) * r);
        }
        ctx.closePath();
        break;
      case 3: // en brosse
        ctx.rect(cx - tete * 0.8, haut - tete * 0.15, tete * 1.6, tete * 0.55);
        break;
      case 4: // rasé sur les côtés, crête
        ctx.ellipse(cx, haut + tete * 0.1, tete * 0.25, tete * 0.45, 0, 0, Math.PI * 2);
        break;
      default: // frange
        ctx.moveTo(cx - tete * 0.98, cy);
        ctx.quadraticCurveTo(cx - tete, haut - tete * 0.2, cx, haut - tete * 0.1);
        ctx.quadraticCurveTo(cx + tete, haut - tete * 0.2, cx + tete * 0.98, cy);
        ctx.quadraticCurveTo(cx + tete * 0.5, cy - tete * 0.75, cx, cy - tete * 0.55);
        ctx.quadraticCurveTo(cx - tete * 0.5, cy - tete * 0.75, cx - tete * 0.98, cy);
    }
    ctx.fill();
    ctx.stroke();
  }
  if (t.peuple === "homme-poisson" || t.peuple === "sirene") {
    ctx.fillStyle = melanger(peau, "#000000", 0.25);
    ctx.beginPath();
    ctx.moveTo(cx - tete * 0.1, cy - tete * 0.95);
    ctx.quadraticCurveTo(cx + tete * 0.2, cy - tete * 1.7, cx + tete * 0.5, cy - tete * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Couvre-chefs selon le camp.
  if (t.classe === "celeste" || t.camp === "celeste") {
    ctx.strokeStyle = "rgba(180,220,255,0.9)";
    ctx.fillStyle = "rgba(200,235,255,0.18)";
    ctx.lineWidth = trait * 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, tete * 1.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = trait;
  } else if (t.camp === "marine" && t.age >= 15) {
    ctx.fillStyle = "#f4f4f0";
    ctx.strokeStyle = encre;
    ctx.beginPath();
    ctx.ellipse(cx, cy - tete * 0.78, tete * 0.95, tete * 0.42, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#2a4a8a";
    ctx.fillRect(cx - tete * 0.95, cy - tete * 0.82, tete * 1.9, tete * 0.12);
  } else if (t.camp === "pirate" && t.rang >= 3) {
    // Tricorne de capitaine.
    ctx.fillStyle = "#1e1a18";
    ctx.beginPath();
    ctx.moveTo(cx - tete * 1.35, cy - tete * 0.6);
    ctx.quadraticCurveTo(cx, cy - tete * 0.35, cx + tete * 1.35, cy - tete * 0.6);
    ctx.quadraticCurveTo(cx + tete * 0.6, cy - tete * 1.8, cx, cy - tete * 1.35);
    ctx.quadraticCurveTo(cx - tete * 0.6, cy - tete * 1.8, cx - tete * 1.35, cy - tete * 0.6);
    ctx.fill();
    ctx.fillStyle = "#f4f1ea";
    ctx.beginPath();
    ctx.arc(cx, cy - tete * 0.95, tete * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else if (t.camp === "pirate" && bandana) {
    ctx.fillStyle = parmi(rng, ["#a82a2a", "#2a4a8a", "#2a2a2a", "#c8a030"]);
    ctx.beginPath();
    ctx.ellipse(cx, cy - tete * 0.62, tete * 0.98, tete * 0.48, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if ((t.zone === "wano" || t.classe === "samourai") && t.sexe === "h" && t.age >= 15 && !chauve) {
    ctx.fillStyle = cheveux;
    ctx.beginPath();
    ctx.ellipse(cx, cy - tete * 1.12, tete * 0.18, tete * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (t.camp === "revolution") {
    ctx.fillStyle = "#24302a";
    ctx.beginPath();
    ctx.ellipse(cx, cy - tete * 0.2, tete * 1.15, tete * 1.15, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.lineTo(cx + tete * 1.1, cy + tete * 0.4);
    ctx.lineTo(cx - tete * 1.1, cy + tete * 0.4);
    ctx.closePath();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }
  if (boucle && (t.camp === "pirate" || t.classe === "kuja")) {
    ctx.fillStyle = "#e0b030";
    ctx.beginPath();
    ctx.arc(cx - tete * 0.92, cy + tete * 0.3, tete * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Un canvas prêt à l'emploi, net sur les écrans haute densité. */
export function canvasNet(largeur: number, hauteur: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = Math.round(largeur * dpr);
  canvas.height = Math.round(hauteur * dpr);
  canvas.style.width = `${largeur}px`;
  canvas.style.height = `${hauteur}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  return { canvas, ctx };
}
