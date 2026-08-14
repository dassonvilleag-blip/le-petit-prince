// La Colonie — sprites dessinés au canvas, partagés entre la fourmilière et
// les scènes de bataille : fourmis alliées et bestiaire ennemi.

export const EXP_IMG: Record<string, string> = {
  clairiere: "exp-clairiere",
  "vieux-chene": "exp-vieux-chene",
  "capture-pucerons": "exp-pucerons",
};

// une fourmi stylisée : trois segments roux, pattes animées, antennes.
// Les tons roux se détachent aussi bien de la terre que des galeries sombres.
export function peindreFourmi(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  taille: number,
  angle: number,
  phase: number,
  soldate = false,
  feuille = false
): void {
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);
  const corps = soldate ? "#7d3b1e" : "#9c4f2a";
  const sombre = "#4a2313";
  ctx.strokeStyle = sombre;
  ctx.fillStyle = corps;
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
  ctx.fillStyle = sombre;
  ctx.beginPath();
  ctx.arc(taille * 0.28, 0, taille * (soldate ? 0.18 : 0.15), 0, Math.PI * 2);
  ctx.fill();
  // mandibules des soldates
  if (soldate) {
    ctx.lineWidth = Math.max(1.2, taille * 0.11);
    for (const cote of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(taille * 0.42, cote * taille * 0.08, taille * 0.12, cote * 1.8, cote * 3.6, cote < 0);
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(1, taille * 0.09);
  }
  // antennes
  for (const cote of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(taille * 0.36, cote * taille * 0.04);
    ctx.quadraticCurveTo(taille * 0.52, cote * taille * 0.24, taille * 0.6, cote * taille * 0.16);
    ctx.stroke();
  }
  // œil et reflet
  ctx.fillStyle = "#fffdf4";
  ctx.beginPath();
  ctx.arc(taille * 0.32, -taille * 0.05, taille * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.ellipse(-taille * 0.4, -taille * 0.08, taille * 0.11, taille * 0.05, -0.4, 0, Math.PI * 2);
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

// ---- bestiaire ennemi ----

export type EnnemiId = "criquet" | "perce-oreille" | "coccinelle" | "guepe";

export const ENNEMI_PAR_EXPEDITION: Record<string, EnnemiId> = {
  clairiere: "criquet",
  "vieux-chene": "perce-oreille",
  "capture-pucerons": "coccinelle",
};

export function peindreEnnemi(
  ctx: CanvasRenderingContext2D,
  id: EnnemiId,
  px: number,
  py: number,
  taille: number,
  angle: number,
  phase: number
): void {
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);
  if (id === "criquet") {
    // petit criquet vert, grandes pattes arrière
    ctx.strokeStyle = "#3f6b2e";
    ctx.lineWidth = Math.max(1.2, taille * 0.1);
    for (const cote of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-taille * 0.1, cote * taille * 0.1);
      ctx.lineTo(-taille * 0.34, cote * taille * 0.34 + Math.sin(phase) * taille * 0.06);
      ctx.lineTo(-taille * 0.14, cote * taille * 0.42);
      ctx.stroke();
    }
    ctx.fillStyle = "#6d9c4b";
    ctx.beginPath();
    ctx.ellipse(0, 0, taille * 0.42, taille * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#557a3a";
    ctx.beginPath();
    ctx.arc(taille * 0.38, -taille * 0.04, taille * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fffdf4";
    ctx.beginPath();
    ctx.arc(taille * 0.42, -taille * 0.08, taille * 0.04, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === "perce-oreille") {
    // perce-oreille brun, pinces à l'arrière
    ctx.strokeStyle = "#4a2c15";
    ctx.lineWidth = Math.max(1.2, taille * 0.1);
    for (const cote of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(-taille * 0.5, cote * taille * 0.1, taille * 0.16, cote * 0.6, cote * 2.4, cote < 0);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const balance = Math.sin(phase + i * 2.1) * 0.4;
        ctx.beginPath();
        ctx.moveTo((i - 1) * taille * 0.16, 0);
        ctx.lineTo((i - 1) * taille * 0.16 + balance * taille * 0.2, cote * taille * 0.26);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#6b3d1d";
    ctx.beginPath();
    ctx.ellipse(0, 0, taille * 0.44, taille * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    // segments
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * taille * 0.14, -taille * 0.13);
      ctx.lineTo(i * taille * 0.14, taille * 0.13);
      ctx.stroke();
    }
    ctx.fillStyle = "#4a2c15";
    ctx.beginPath();
    ctx.arc(taille * 0.42, 0, taille * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fffdf4";
    ctx.beginPath();
    ctx.arc(taille * 0.46, -taille * 0.04, taille * 0.035, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === "guepe") {
    // guêpe : abdomen rayé jaune et noir, ailes vrombissantes, dard
    for (const cote of [-1, 1]) {
      ctx.fillStyle = "rgba(220,235,255,0.55)";
      ctx.beginPath();
      ctx.ellipse(
        -taille * 0.05,
        cote * taille * 0.16,
        taille * 0.3,
        taille * 0.12,
        cote * (0.5 + Math.sin(phase * 4) * 0.35),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.fillStyle = "#e8b13a";
    ctx.beginPath();
    ctx.ellipse(-taille * 0.24, 0, taille * 0.3, taille * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#241206";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(-taille * (0.12 + i * 0.14), 0, taille * 0.045, taille * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // dard
    ctx.strokeStyle = "#241206";
    ctx.lineWidth = Math.max(1.2, taille * 0.07);
    ctx.beginPath();
    ctx.moveTo(-taille * 0.52, 0);
    ctx.lineTo(-taille * 0.66, 0);
    ctx.stroke();
    // thorax et tête
    ctx.fillStyle = "#3a2210";
    ctx.beginPath();
    ctx.arc(taille * 0.08, 0, taille * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(taille * 0.34, 0, taille * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fffdf4";
    ctx.beginPath();
    ctx.arc(taille * 0.38, -taille * 0.04, taille * 0.04, 0, Math.PI * 2);
    ctx.fill();
    // sourcil fâché
    ctx.strokeStyle = "#fffdf4";
    ctx.lineWidth = Math.max(1, taille * 0.045);
    ctx.beginPath();
    ctx.moveTo(taille * 0.3, -taille * 0.12);
    ctx.lineTo(taille * 0.42, -taille * 0.07);
    ctx.stroke();
  } else {
    // coccinelle : dôme rouge à points, air sévère
    ctx.strokeStyle = "#2b1608";
    ctx.lineWidth = Math.max(1.2, taille * 0.09);
    for (let i = 0; i < 3; i++) {
      const balance = Math.sin(phase + i * 2.1) * 0.3;
      for (const cote of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo((i - 1) * taille * 0.18, cote * taille * 0.06);
        ctx.lineTo((i - 1) * taille * 0.18 + balance * taille * 0.2, cote * taille * 0.3);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#d84a3a";
    ctx.beginPath();
    ctx.ellipse(0, 0, taille * 0.38, taille * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a2318";
    ctx.beginPath();
    ctx.moveTo(0, -taille * 0.3);
    ctx.lineTo(0, taille * 0.3);
    ctx.stroke();
    ctx.fillStyle = "#2b1608";
    for (const [ox, oy] of [
      [-0.18, -0.12],
      [-0.14, 0.14],
      [0.12, -0.16],
      [0.16, 0.12],
    ]) {
      ctx.beginPath();
      ctx.arc(ox * taille, oy * taille, taille * 0.055, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(taille * 0.4, 0, taille * 0.14, 0, Math.PI * 2);
    ctx.fill();
    // sourcil fâché
    ctx.strokeStyle = "#fffdf4";
    ctx.lineWidth = Math.max(1, taille * 0.05);
    ctx.beginPath();
    ctx.moveTo(taille * 0.34, -taille * 0.12);
    ctx.lineTo(taille * 0.46, -taille * 0.05);
    ctx.stroke();
  }
  ctx.restore();
}
