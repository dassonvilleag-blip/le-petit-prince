// La bande de mer en haut de l'écran : le ciel, l'île ou le navire, la
// tempête quand la vie s'agite. Elle change avec la mer où l'on vit.

import type { Zone } from "../types.ts";

export interface EtatScene {
  zone: Zone;
  enMer: boolean;
  pavillon: "pirate" | "marine" | "aucun";
  tension: number;
  annee: number;
  mort: boolean;
}

interface Palette {
  ciel: [string, string];
  mer: [string, string];
  terre: string;
}

const PALETTES: Record<Zone, Palette> = {
  "east-blue": { ciel: ["#1b3a5c", "#e8b07a"], mer: ["#1f5f86", "#0b2a42"], terre: "#2b3b2a" },
  "west-blue": { ciel: ["#22304f", "#d89a7a"], mer: ["#22567c", "#0c243c"], terre: "#2f3528" },
  "north-blue": { ciel: ["#2a3a52", "#b8c4d4"], mer: ["#2c5a78", "#0f2638"], terre: "#d8dde4" },
  "south-blue": { ciel: ["#1a4a66", "#f0c27a"], mer: ["#1b6a8a", "#0a2e44"], terre: "#3a4a28" },
  paradis: { ciel: ["#3a2a4a", "#f09a4a"], mer: ["#2a6a7a", "#0e2a36"], terre: "#4a3a24" },
  "nouveau-monde": { ciel: ["#2a1420", "#d8503a"], mer: ["#3a3a5a", "#120e1e"], terre: "#2a1e1a" },
  "fond-marin": { ciel: ["#0a3a4a", "#1a7a8a"], mer: ["#0e5a6a", "#04202a"], terre: "#3a7a6a" },
  ciel: { ciel: ["#6ab0e8", "#fff4d8"], mer: ["#f4f4f4", "#c8d8e8"], terre: "#7aa05a" },
  wano: { ciel: ["#2a1a3a", "#e88aa8"], mer: ["#2a4a6a", "#0e1a2a"], terre: "#2a2228" },
  elbaf: { ciel: ["#1a3a2a", "#c8d89a"], mer: ["#24506a", "#0a2030"], terre: "#1e3a1e" },
  "calm-belt": { ciel: ["#4a5a6a", "#c8d0d8"], mer: ["#5a7a8a", "#2a3a44"], terre: "#3a4a2a" },
  "red-line": { ciel: ["#3a2a2a", "#f0d8a0"], mer: ["#3a5a7a", "#101e2c"], terre: "#a83a2a" },
  "impel-down": { ciel: ["#120808", "#3a1010"], mer: ["#2a1a1a", "#0a0404"], terre: "#1a1414" },
};

export class Scene {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private etat: EtatScene = { zone: "east-blue", enMer: false, pavillon: "aucun", tension: 0, annee: 1500, mort: false };
  private t = 0;
  private dernier = 0;
  private eclair = 0;
  private gouttes: { x: number; y: number }[] = [];
  private actif = true;

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "vc-scene";
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;
    for (let i = 0; i < 90; i++) this.gouttes.push({ x: Math.random(), y: Math.random() });
    const boucle = (ms: number): void => {
      if (!this.actif) return;
      const dt = Math.min(0.05, (ms - this.dernier) / 1000 || 0);
      this.dernier = ms;
      this.t += dt;
      this.dessiner(dt);
      requestAnimationFrame(boucle);
    };
    requestAnimationFrame(boucle);
  }

  mettreAJour(e: Partial<EtatScene>): void {
    if (e.tension !== undefined && e.tension >= 4 && this.etat.tension < 4) this.eclair = 1;
    this.etat = { ...this.etat, ...e };
  }

  arreter(): void {
    this.actif = false;
  }

  private dessiner(dt: number): void {
    const c = this.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const L = c.clientWidth;
    const H = c.clientHeight;
    if (!L || !H) return;
    if (c.width !== Math.round(L * dpr) || c.height !== Math.round(H * dpr)) {
      c.width = Math.round(L * dpr);
      c.height = Math.round(H * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const p = PALETTES[this.etat.zone];
    const orage = this.etat.tension >= 4;
    const horizon = H * 0.62;

    // Le ciel.
    const ciel = ctx.createLinearGradient(0, 0, 0, horizon);
    ciel.addColorStop(0, orage ? "#121418" : p.ciel[0]);
    ciel.addColorStop(1, orage ? "#3a3e46" : p.ciel[1]);
    ctx.fillStyle = ciel;
    ctx.fillRect(0, 0, L, horizon);

    if (this.etat.zone === "fond-marin") this.bulles(ctx, L, H);
    else if (!orage) {
      // Soleil ou lune selon l'année (pair / impair), pour que le temps passe.
      const jour = this.etat.annee % 2 === 0;
      ctx.fillStyle = jour ? "rgba(255,230,170,0.9)" : "rgba(240,240,255,0.85)";
      ctx.beginPath();
      ctx.arc(L * 0.78, horizon * 0.42, Math.min(26, H * 0.12), 0, Math.PI * 2);
      ctx.fill();
      this.nuages(ctx, L, horizon, "rgba(255,255,255,0.25)");
    } else {
      this.nuages(ctx, L, horizon, "rgba(20,22,26,0.7)");
    }

    this.decor(ctx, L, horizon);

    // La mer : trois couches de vagues.
    for (let k = 0; k < 3; k++) {
      const y0 = horizon + k * (H - horizon) * 0.3;
      const amp = (orage ? 6 : 2.5) * (k + 1) * 0.7;
      const mer = ctx.createLinearGradient(0, y0, 0, H);
      mer.addColorStop(0, p.mer[0]);
      mer.addColorStop(1, p.mer[1]);
      ctx.fillStyle = mer;
      ctx.globalAlpha = 0.75 + k * 0.1;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= L; x += 8) {
        ctx.lineTo(x, y0 + Math.sin(x / (40 + k * 25) + this.t * (0.8 + k * 0.4)) * amp);
      }
      ctx.lineTo(L, H);
      ctx.closePath();
      ctx.fill();
      if (k === 0) this.objets(ctx, L, horizon);
    }
    ctx.globalAlpha = 1;

    if (orage) {
      ctx.strokeStyle = "rgba(200,210,230,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const g of this.gouttes) {
        g.y += dt * 1.6;
        g.x -= dt * 0.25;
        if (g.y > 1) { g.y = 0; g.x = Math.random() * 1.2; }
        ctx.moveTo(g.x * L, g.y * H);
        ctx.lineTo(g.x * L - 4, g.y * H + 10);
      }
      ctx.stroke();
      if (Math.random() < 0.004) this.eclair = 1;
    }
    if (this.eclair > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.eclair * 0.5})`;
      ctx.fillRect(0, 0, L, H);
      this.eclair = Math.max(0, this.eclair - dt * 3);
    }
    if (this.etat.mort) {
      ctx.fillStyle = "rgba(6,6,15,0.55)";
      ctx.fillRect(0, 0, L, H);
    }
  }

  private nuages(ctx: CanvasRenderingContext2D, L: number, horizon: number, couleur: string): void {
    ctx.fillStyle = couleur;
    for (let i = 0; i < 5; i++) {
      const x = ((i * 0.27 + this.t * 0.008 * (1 + i * 0.2)) % 1.3) * L - L * 0.15;
      const y = horizon * (0.18 + (i % 3) * 0.18);
      ctx.beginPath();
      ctx.ellipse(x, y, 46 + i * 6, 9 + (i % 2) * 4, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 30, y - 6, 30, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private bulles(ctx: CanvasRenderingContext2D, L: number, H: number): void {
    ctx.strokeStyle = "rgba(200,255,255,0.35)";
    for (let i = 0; i < 14; i++) {
      const x = ((i * 73) % 100) / 100 * L;
      const y = H - ((this.t * 18 + i * 37) % H);
      ctx.beginPath();
      ctx.arc(x, y, 2 + (i % 4), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /** Le décor propre à chaque mer, à l'horizon. */
  private decor(ctx: CanvasRenderingContext2D, L: number, horizon: number): void {
    const z = this.etat.zone;
    const p = PALETTES[z];
    ctx.fillStyle = p.terre;
    if (z === "red-line") {
      ctx.fillRect(L * 0.08, horizon * 0.15, L * 0.12, horizon * 0.85);
      ctx.fillStyle = "#f0e6c8";
      ctx.fillRect(L * 0.09, horizon * 0.08, L * 0.1, horizon * 0.08);
    } else if (z === "elbaf") {
      ctx.fillStyle = "#1a2a18";
      ctx.fillRect(L * 0.16, horizon * 0.25, L * 0.025, horizon * 0.75);
      ctx.beginPath();
      ctx.ellipse(L * 0.17, horizon * 0.22, L * 0.12, horizon * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (z === "wano") {
      ctx.beginPath();
      ctx.moveTo(L * 0.02, horizon);
      ctx.lineTo(L * 0.18, horizon * 0.35);
      ctx.lineTo(L * 0.34, horizon);
      ctx.fill();
      ctx.fillStyle = "#f4f0f0";
      ctx.beginPath();
      ctx.moveTo(L * 0.15, horizon * 0.47);
      ctx.lineTo(L * 0.18, horizon * 0.35);
      ctx.lineTo(L * 0.21, horizon * 0.47);
      ctx.fill();
    } else if (z === "impel-down") {
      ctx.fillRect(L * 0.12, horizon * 0.3, L * 0.07, horizon * 0.7);
      ctx.fillStyle = "rgba(255,80,40,0.5)";
      ctx.fillRect(L * 0.145, horizon * 0.45, 4, 6);
    } else if (z === "fond-marin") {
      ctx.strokeStyle = "rgba(220,255,255,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(L * 0.2, horizon, horizon * 0.7, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
  }

  /** L'île natale ou le navire, posés sur la mer. */
  private objets(ctx: CanvasRenderingContext2D, L: number, horizon: number): void {
    const p = PALETTES[this.etat.zone];
    if (!this.etat.enMer) {
      ctx.fillStyle = p.terre;
      ctx.beginPath();
      ctx.ellipse(L * 0.32, horizon + 2, L * 0.14, horizon * 0.22, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // Quelques maisons.
      ctx.fillStyle = "rgba(255,220,150,0.7)";
      for (let i = 0; i < 4; i++) ctx.fillRect(L * (0.26 + i * 0.035), horizon - 8 - (i % 2) * 4, 3, 3);
      return;
    }
    const x = L * 0.5 + Math.sin(this.t * 0.3) * L * 0.05;
    const y = horizon + Math.sin(this.t * 1.3) * 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(this.t * 1.1) * (this.etat.tension >= 4 ? 0.08 : 0.03));
    ctx.fillStyle = "#3a2618";
    ctx.beginPath();
    ctx.moveTo(-34, -6);
    ctx.lineTo(34, -6);
    ctx.lineTo(24, 6);
    ctx.lineTo(-26, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-1.5, -48, 3, 42);
    ctx.fillStyle = "#efe6cf";
    ctx.beginPath();
    ctx.moveTo(-1, -46);
    ctx.quadraticCurveTo(22, -30, -1, -12);
    ctx.closePath();
    ctx.fill();
    if (this.etat.pavillon !== "aucun") {
      ctx.fillStyle = this.etat.pavillon === "pirate" ? "#111" : "#f4f4f4";
      const onde = Math.sin(this.t * 6) * 1.5;
      ctx.fillRect(1.5, -48, 14, 9 + onde * 0.2);
      ctx.fillStyle = this.etat.pavillon === "pirate" ? "#f4f4f4" : "#2a4a8a";
      ctx.beginPath();
      ctx.arc(8.5, -44, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
