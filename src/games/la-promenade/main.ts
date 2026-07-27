// La Promenade — une balade zen lofi en pixel art.
// Les décors sont des images générées (Higgsfield) ; le personnage, les
// effets d'ambiance et les interactions au clic sont dessinés par-dessus
// sur le canvas, pour garder des animations fluides et fiables.

const BASE = import.meta.env.BASE_URL;

// ---------------------------------------------------------------------------
// Mondes
// ---------------------------------------------------------------------------

interface Skin {
  hat: string; // bonnet / capuche / casquette (ou couleur du casque)
  skin: string;
  top: string;
  pants: string;
  shoes: string;
  helmet?: boolean; // casque en verre (lune, océan)
}

interface Hotspot {
  x1: number;
  y1: number;
  x2: number;
  y2: number; // coords normalisées dans l'image
  effect: string;
}

interface World {
  id: string;
  name: string;
  file: string;
  groundY: number; // fraction de la hauteur d'image où posent les pieds
  ambience: "rain" | "city" | "waves" | "space" | "under";
  skin: Skin;
  gravity: number;
  jumpV: number;
  speed: number; // multiplicateur de vitesse de marche
  hotspots: Hotspot[];
  fallback: (nx: number, ny: number) => string; // effet par défaut selon la zone
}

const WORLDS: World[] = [
  {
    id: "foret",
    name: "la forêt qui goutte",
    file: "foret.png",
    groundY: 0.9,
    ambience: "rain",
    skin: { hat: "#c9a13b", skin: "#f2c9a0", top: "#e0b23c", pants: "#4a5a52", shoes: "#5a4632" },
    gravity: 2200,
    jumpV: 620,
    speed: 1,
    hotspots: [
      { x1: 0.53, y1: 0.5, x2: 0.73, y2: 0.76, effect: "cabin" },
      { x1: 0.02, y1: 0.35, x2: 0.09, y2: 0.5, effect: "lantern" },
      { x1: 0.26, y1: 0.25, x2: 0.34, y2: 0.4, effect: "lantern" },
      { x1: 0.4, y1: 0.3, x2: 0.47, y2: 0.42, effect: "lantern" },
      { x1: 0.51, y1: 0.24, x2: 0.58, y2: 0.35, effect: "lantern" },
      { x1: 0.79, y1: 0.35, x2: 0.87, y2: 0.5, effect: "lantern" },
      { x1: 0.88, y1: 0.4, x2: 0.94, y2: 0.5, effect: "lantern" },
    ],
    fallback: (_nx, ny) => (ny > 0.8 ? "fireflies" : "rainburst"),
  },
  {
    id: "ville",
    name: "la ville qui ronronne",
    file: "ville.png",
    groundY: 0.92,
    ambience: "city",
    skin: { hat: "#9a7bd0", skin: "#e8b48c", top: "#9a7bd0", pants: "#5b6a8c", shoes: "#e8e3d8" },
    gravity: 2200,
    jumpV: 620,
    speed: 1,
    hotspots: [
      { x1: 0.58, y1: 0.03, x2: 0.72, y2: 0.24, effect: "moonpulse" },
      { x1: 0.52, y1: 0.6, x2: 0.61, y2: 0.82, effect: "vending" },
      { x1: 0.2, y1: 0.46, x2: 0.5, y2: 0.84, effect: "neon" },
      { x1: 0.0, y1: 0.15, x2: 0.17, y2: 0.8, effect: "window" },
      { x1: 0.8, y1: 0.05, x2: 1.0, y2: 0.8, effect: "window" },
    ],
    fallback: (_nx, ny) => (ny < 0.45 ? "shootingstar" : "sparkle"),
  },
  {
    id: "plage",
    name: "la plage au crépuscule",
    file: "plage.png",
    groundY: 0.93,
    ambience: "waves",
    skin: { hat: "#6b4a35", skin: "#e8b48c", top: "#ef8a7a", pants: "#f2e3c2", shoes: "#e8b48c" },
    gravity: 2200,
    jumpV: 620,
    speed: 1,
    hotspots: [
      { x1: 0.77, y1: 0.28, x2: 0.86, y2: 0.52, effect: "lighthouse" },
      { x1: 0.42, y1: 0.4, x2: 0.56, y2: 0.53, effect: "sunpulse" },
      { x1: 0.62, y1: 0.68, x2: 0.85, y2: 0.88, effect: "shellburst" },
    ],
    fallback: (_nx, ny) => (ny > 0.79 ? "crab" : ny > 0.48 ? "ricochet" : "sparkle"),
  },
  {
    id: "lune",
    name: "la lune, en silence",
    file: "lune.png",
    groundY: 0.88,
    ambience: "space",
    skin: { hat: "#d8dee8", skin: "#f2c9a0", top: "#e8ecf2", pants: "#c8d0dc", shoes: "#8a94a4", helmet: true },
    gravity: 460,
    jumpV: 400,
    speed: 0.82,
    hotspots: [
      { x1: 0.14, y1: 0.07, x2: 0.34, y2: 0.42, effect: "earthpulse" },
      { x1: 0.3, y1: 0.6, x2: 0.42, y2: 0.78, effect: "lander" },
      { x1: 0.72, y1: 0.52, x2: 0.88, y2: 0.78, effect: "dome" },
    ],
    fallback: (_nx, ny) => (ny > 0.72 ? "moondust" : "comet"),
  },
  {
    id: "ocean",
    name: "le fond de l'océan",
    file: "ocean.png",
    groundY: 0.94,
    ambience: "under",
    skin: { hat: "#c98d4e", skin: "#f2c9a0", top: "#b0834f", pants: "#7a8ba0", shoes: "#5a4632", helmet: true },
    gravity: 800,
    jumpV: 330,
    speed: 0.7,
    hotspots: [{ x1: 0.57, y1: 0.4, x2: 0.88, y2: 0.86, effect: "porthole" }],
    fallback: (_nx, ny) => (ny > 0.82 ? "sandpuff" : "bubbles"),
  },
];

// ---------------------------------------------------------------------------
// Canvas & état
// ---------------------------------------------------------------------------

const canvas = document.getElementById("scene") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const worldNameEl = document.getElementById("world-name")!;
const hintEl = document.getElementById("hint")!;
const muteBtn = document.getElementById("btn-mute") as HTMLButtonElement;

let W = 0;
let H = 0;
const resize = (): void => {
  W = canvas.width = window.innerWidth * devicePixelRatio;
  H = canvas.height = window.innerHeight * devicePixelRatio;
  ctx.imageSmoothingEnabled = false;
};
window.addEventListener("resize", resize);
resize();

const images = new Map<string, HTMLImageElement>();
for (const w of WORLDS) {
  const img = new Image();
  img.src = `${BASE}la-promenade/${w.file}`;
  images.set(w.id, img);
}

let worldIdx = 0;
let started = false;

// Fondu de transition entre mondes : -1 = aucun, sinon progression 0→1→0
let fade = 0;
let fadeDir = 0; // 1 = assombrit, -1 = éclaircit
let pendingIdx = -1;

interface Particle {
  update(dt: number): boolean; // false = mort
  draw(c: CanvasRenderingContext2D): void;
}
let particles: Particle[] = [];

// État persistant par monde (fenêtres allumées, cabane…)
const litWindows = new Map<string, { x: number; y: number }[]>();

// ---------------------------------------------------------------------------
// Placement du décor (fit "cover") + conversions de coordonnées
// ---------------------------------------------------------------------------

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const coverRect = (img: HTMLImageElement): Rect => {
  const s = Math.max(W / img.width, H / img.height);
  const w = img.width * s;
  const h = img.height * s;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
};

const imgToScreen = (r: Rect, nx: number, ny: number): { x: number; y: number } => ({
  x: r.x + nx * r.w,
  y: r.y + ny * r.h,
});

const screenToImg = (r: Rect, x: number, y: number): { nx: number; ny: number } => ({
  nx: (x - r.x) / r.w,
  ny: (y - r.y) / r.h,
});

// ---------------------------------------------------------------------------
// Personnage
// ---------------------------------------------------------------------------

const char = {
  x: 200,
  y: 0, // y des pieds
  vy: 0,
  facing: 1,
  walking: false,
  onGround: true,
  walkT: 0,
  idleT: 0,
  bubbleT: 0,
};

const keys = new Set<string>();
window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (["Space", "ArrowUp", "KeyW", "KeyZ"].includes(e.code)) jump();
});
window.addEventListener("keyup", (e) => keys.delete(e.code));

const jump = (): void => {
  if (!started || !char.onGround) return;
  const w = WORLDS[worldIdx];
  char.vy = -w.jumpV * S();
  char.onGround = false;
};

// Taille d'un "pixel" logique du personnage, selon l'écran
const S = (): number => Math.max(2, Math.round(H / 220));

const px = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void => {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

const drawChar = (c: CanvasRenderingContext2D): void => {
  const w = WORLDS[worldIdx];
  const k = w.skin;
  const s = S();
  const breath = Math.sin(char.idleT * 2.2) * 0.35 * s;
  const swing = char.walking ? Math.sin(char.walkT * 9) : 0;

  c.save();
  c.translate(Math.round(char.x), Math.round(char.y));
  if (char.facing < 0) c.scale(-1, 1);

  const legA = swing * 2 * s;
  const legB = -swing * 2 * s;
  // jambes
  px(c, -3 * s + legA * 0.4, -5 * s, 2 * s, 5 * s, k.pants);
  px(c, 1 * s + legB * 0.4, -5 * s, 2 * s, 5 * s, k.pants);
  // chaussures
  px(c, -3 * s + legA * 0.6, -1 * s, 2.6 * s, 1 * s, k.shoes);
  px(c, 1 * s + legB * 0.6, -1 * s, 2.6 * s, 1 * s, k.shoes);
  // corps
  px(c, -4 * s, -11 * s + breath, 8 * s, 6 * s, k.top);
  // bras (balancement opposé aux jambes)
  px(c, -5 * s, -10.6 * s + breath - swing * 0.8 * s, 1.6 * s, 4.6 * s, k.top);
  px(c, 3.4 * s, -10.6 * s + breath + swing * 0.8 * s, 1.6 * s, 4.6 * s, k.top);
  // tête
  px(c, -3.5 * s, -17 * s + breath, 7 * s, 6 * s, k.skin);
  // yeux (côté du regard)
  px(c, 1.6 * s, -15 * s + breath, 0.9 * s, 1 * s, "#2a2622");
  px(c, -0.6 * s, -15 * s + breath, 0.9 * s, 1 * s, "#2a2622");
  // couvre-chef : bonnet / capuche / casquette
  px(c, -3.8 * s, -18 * s + breath, 7.6 * s, 2.4 * s, k.hat);
  px(c, -3.8 * s, -16 * s + breath, 1.2 * s, 2 * s, k.hat);

  if (k.helmet) {
    // bulle de verre
    c.strokeStyle = "rgba(220, 240, 255, 0.75)";
    c.lineWidth = Math.max(1, s * 0.6);
    c.beginPath();
    c.arc(0, -14 * s + breath, 5.4 * s, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = "rgba(200, 235, 255, 0.12)";
    c.fill();
    px(c, 2 * s, -17.5 * s + breath, 1.4 * s, 1.4 * s, "rgba(255,255,255,0.55)");
  }
  c.restore();
};

// ---------------------------------------------------------------------------
// Effets — petites fabriques de particules
// ---------------------------------------------------------------------------

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

const addSparkle = (x: number, y: number, color = "#fff6d8", n = 6): void => {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2);
    const sp = rnd(20, 90) * (S() / 3);
    let vx = Math.cos(a) * sp;
    let vy = Math.sin(a) * sp;
    let life = rnd(0.4, 0.9);
    let t = 0;
    particles.push({
      update(dt) {
        t += dt;
        x += vx * dt;
        y += vy * dt;
        vx *= 0.97;
        vy *= 0.97;
        return t < life;
      },
      draw(c) {
        c.globalAlpha = 1 - t / life;
        px(c, x, y, S() * 0.8, S() * 0.8, color);
        c.globalAlpha = 1;
      },
    });
  }
};

const addGlowPulse = (x: number, y: number, color: string, radius: number): void => {
  let t = 0;
  const life = 1.4;
  particles.push({
    update(dt) {
      t += dt;
      return t < life;
    },
    draw(c) {
      const p = t / life;
      const r = radius * (0.5 + p * 0.9);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.save();
      c.globalCompositeOperation = "lighter";
      c.globalAlpha = 0.55 * (1 - p);
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
      c.restore();
    },
  });
};

const addFirefly = (x: number, y: number): void => {
  let t = 0;
  const life = rnd(5, 10);
  const wob = rnd(1, 2.5);
  const phase = rnd(0, 10);
  let vx = rnd(-12, 12);
  let vy = rnd(-16, -4);
  particles.push({
    update(dt) {
      t += dt;
      x += (vx + Math.sin(t * wob + phase) * 18) * dt;
      y += (vy + Math.cos(t * wob * 0.7 + phase) * 10) * dt;
      return t < life;
    },
    draw(c) {
      const a = Math.min(1, t * 2, (life - t) / 2) * (0.5 + 0.5 * Math.sin(t * 4 + phase));
      c.save();
      c.globalCompositeOperation = "lighter";
      c.globalAlpha = Math.max(0, a);
      const s = S();
      px(c, x, y, s, s, "#ffe9a0");
      c.globalAlpha = Math.max(0, a * 0.35);
      c.beginPath();
      c.arc(x + s / 2, y + s / 2, s * 2.4, 0, Math.PI * 2);
      c.fillStyle = "#ffd76a";
      c.fill();
      c.restore();
    },
  });
};

const addRainDrop = (r: Rect): void => {
  const groundY = imgToScreen(r, 0, WORLDS[worldIdx].groundY).y;
  let x = rnd(-40, W + 40);
  let y = rnd(-60, -10);
  const v = rnd(700, 1000) * (H / 900);
  particles.push({
    update(dt) {
      x -= v * 0.12 * dt;
      y += v * dt;
      if (y >= groundY) {
        addSplash(x, groundY);
        return false;
      }
      return true;
    },
    draw(c) {
      c.globalAlpha = 0.35;
      c.strokeStyle = "#cfe6e8";
      c.lineWidth = Math.max(1, S() * 0.4);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + v * 0.12 * 0.016, y - v * 0.016);
      c.stroke();
      c.globalAlpha = 1;
    },
  });
};

const addSplash = (x: number, y: number): void => {
  for (let i = 0; i < 3; i++) {
    let sx = x;
    let sy = y;
    let vx = rnd(-40, 40);
    let vy = rnd(-90, -30);
    let t = 0;
    const life = rnd(0.2, 0.4);
    particles.push({
      update(dt) {
        t += dt;
        sx += vx * dt;
        sy += vy * dt;
        vy += 600 * dt;
        return t < life;
      },
      draw(c) {
        c.globalAlpha = 0.5 * (1 - t / life);
        px(c, sx, sy, S() * 0.6, S() * 0.6, "#cfe6e8");
        c.globalAlpha = 1;
      },
    });
  }
};

const addShootingStar = (x: number, y: number, color = "#fff2c8"): void => {
  const a = rnd(Math.PI * 0.12, Math.PI * 0.3);
  const dir = Math.random() < 0.5 ? -1 : 1;
  let vx = Math.cos(a) * rnd(400, 640) * dir;
  let vy = Math.sin(a) * rnd(180, 280);
  let t = 0;
  const life = rnd(0.9, 1.5);
  const trail: { x: number; y: number }[] = [];
  particles.push({
    update(dt) {
      t += dt;
      x += vx * dt;
      y += vy * dt;
      trail.push({ x, y });
      if (trail.length > 14) trail.shift();
      return t < life;
    },
    draw(c) {
      c.save();
      c.globalCompositeOperation = "lighter";
      for (let i = 0; i < trail.length; i++) {
        c.globalAlpha = (i / trail.length) * 0.7 * (1 - t / life);
        px(c, trail[i].x, trail[i].y, S() * 0.9, S() * 0.9, color);
      }
      c.restore();
    },
  });
};

const addMoonDust = (x: number, y: number): void => {
  for (let i = 0; i < 12; i++) {
    let sx = x + rnd(-6, 6);
    let sy = y;
    let vx = rnd(-50, 50);
    let vy = rnd(-70, -20);
    let t = 0;
    const life = rnd(1.2, 2.6); // retombe lentement : faible gravité
    particles.push({
      update(dt) {
        t += dt;
        sx += vx * dt;
        sy += vy * dt;
        vy += 60 * dt;
        return t < life;
      },
      draw(c) {
        c.globalAlpha = 0.5 * (1 - t / life);
        px(c, sx, sy, S() * 0.7, S() * 0.7, "#cdd6e2");
        c.globalAlpha = 1;
      },
    });
  }
};

const addBubble = (x: number, y: number, big = false): void => {
  let t = 0;
  const life = rnd(2, 5);
  const r0 = (big ? rnd(2, 3.4) : rnd(0.8, 2)) * S();
  const wob = rnd(2, 4);
  const phase = rnd(0, 10);
  particles.push({
    update(dt) {
      t += dt;
      y -= (30 + r0 * 6) * dt;
      x += Math.sin(t * wob + phase) * 14 * dt;
      return t < life && y > -20;
    },
    draw(c) {
      c.globalAlpha = 0.5;
      c.strokeStyle = "#cfeef2";
      c.lineWidth = Math.max(1, S() * 0.4);
      c.beginPath();
      c.arc(x, y, r0, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 1;
    },
  });
};

const addFishSchool = (_r: Rect, fromX: number, fromY: number): void => {
  const dir = fromX > W / 2 ? -1 : 1;
  const n = 3 + Math.floor(rnd(0, 4));
  for (let i = 0; i < n; i++) {
    let x = fromX + rnd(-30, 30) - dir * 60;
    let y = fromY + rnd(-40, 40);
    const v = rnd(120, 220) * dir;
    const phase = rnd(0, 10);
    let t = 0;
    const life = rnd(3, 5);
    const col = ["#ef9a8a", "#e8c56a", "#9ad0c8"][i % 3];
    particles.push({
      update(dt) {
        t += dt;
        x += v * dt;
        y += Math.sin(t * 3 + phase) * 20 * dt;
        return t < life && x > -40 && x < W + 40;
      },
      draw(c) {
        const s = S();
        c.globalAlpha = 0.85;
        px(c, x, y, 2.4 * s, 1.2 * s, col);
        px(c, x - Math.sign(v) * 2 * s, y + 0.2 * s, s, 0.8 * s, col);
        c.globalAlpha = 1;
      },
    });
  }
};

const addJellyfish = (): void => {
  let x = rnd(W * 0.1, W * 0.9);
  let y = H + 30;
  let t = 0;
  const life = rnd(14, 20);
  const phase = rnd(0, 10);
  particles.push({
    update(dt) {
      t += dt;
      y -= (14 + Math.max(0, Math.sin(t * 1.6 + phase)) * 26) * dt;
      x += Math.sin(t * 0.5 + phase) * 12 * dt;
      return t < life && y > -60;
    },
    draw(c) {
      const s = S();
      const pulse = 1 + Math.sin(t * 1.6 + phase) * 0.12;
      c.save();
      c.globalAlpha = 0.55;
      c.fillStyle = "#e8a8c8";
      c.beginPath();
      c.arc(x, y, 3.2 * s * pulse, Math.PI, 0);
      c.fill();
      c.strokeStyle = "#e8a8c8";
      c.lineWidth = Math.max(1, s * 0.35);
      for (let i = -1; i <= 1; i++) {
        c.beginPath();
        c.moveTo(x + i * s * 1.4, y);
        c.quadraticCurveTo(x + i * s * 1.4 + Math.sin(t * 2 + i) * s * 2, y + 3 * s, x + i * s * 1.4 + Math.sin(t * 2.4 + i) * s * 3, y + 6 * s);
        c.stroke();
      }
      c.restore();
    },
  });
};

const addCrab = (r: Rect, atX: number): void => {
  const groundY = imgToScreen(r, 0, 0.965).y;
  let x = atX;
  const dir = Math.random() < 0.5 ? -1 : 1;
  let t = 0;
  const life = rnd(4, 7);
  particles.push({
    update(dt) {
      t += dt;
      x += Math.sin(t * 6) > -0.4 ? 46 * dir * dt : 0; // trottine par à-coups
      return t < life && x > -30 && x < W + 30;
    },
    draw(c) {
      const s = S();
      const y = groundY + Math.abs(Math.sin(t * 10)) * -1.2 * s;
      px(c, x - 1.6 * s, y - 1.6 * s, 3.2 * s, 1.8 * s, "#e07a5a");
      px(c, x - 2.4 * s, y - 0.6 * s, 0.8 * s, 0.8 * s, "#e07a5a");
      px(c, x + 1.6 * s, y - 0.6 * s, 0.8 * s, 0.8 * s, "#e07a5a");
      px(c, x - 1.2 * s, y - 2.2 * s, 0.6 * s, 0.6 * s, "#2a2622");
      px(c, x + 0.6 * s, y - 2.2 * s, 0.6 * s, 0.6 * s, "#2a2622");
    },
  });
};

const addRicochet = (r: Rect, targetX: number, targetY: number): void => {
  let x = char.x;
  let y = char.y - 10 * S();
  const dir = Math.sign(targetX - x) || 1;
  const waterY = Math.max(targetY, imgToScreen(r, 0, 0.55).y);
  let vx = dir * rnd(260, 320);
  let vy = -rnd(150, 200);
  let hops = 0;
  let t = 0;
  particles.push({
    update(dt) {
      t += dt;
      x += vx * dt;
      y += vy * dt;
      vy += 900 * dt;
      if (y >= waterY && vy > 0) {
        addSplash(x, waterY);
        hops++;
        vy = -Math.abs(vy) * 0.55;
        vx *= 0.8;
        if (hops >= 4 || Math.abs(vy) < 60) return false;
      }
      return t < 6 && x > -30 && x < W + 30;
    },
    draw(c) {
      px(c, x, y, S(), S() * 0.8, "#6b6f78");
    },
  });
};

const addSmokePuff = (x: number, y: number): void => {
  let t = 0;
  const life = rnd(2.4, 4);
  let sx = x;
  let sy = y;
  const drift = rnd(-6, 14);
  particles.push({
    update(dt) {
      t += dt;
      sy -= 22 * dt;
      sx += drift * dt;
      return t < life;
    },
    draw(c) {
      const p = t / life;
      c.globalAlpha = 0.28 * (1 - p);
      c.fillStyle = "#d8d4cc";
      c.beginPath();
      c.arc(sx, sy, S() * (1.2 + p * 3.2), 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    },
  });
};

const addBeam = (x: number, y: number): void => {
  let t = 0;
  const life = 6;
  particles.push({
    update(dt) {
      t += dt;
      return t < life;
    },
    draw(c) {
      const a = t * 0.9 - 0.8;
      const len = W * 0.5;
      const fadeA = Math.min(1, t * 2, (life - t) * 1.2) * 0.16;
      c.save();
      c.globalCompositeOperation = "lighter";
      c.globalAlpha = fadeA;
      c.fillStyle = "#fff2c0";
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len - 40);
      c.lineTo(x + Math.cos(a + 0.16) * len, y + Math.sin(a + 0.16) * len);
      c.closePath();
      c.fill();
      c.restore();
    },
  });
};

const addGull = (): void => {
  let x = -30;
  let y = rnd(H * 0.08, H * 0.3);
  const v = rnd(40, 70);
  let t = 0;
  particles.push({
    update(dt) {
      t += dt;
      x += v * dt;
      y += Math.sin(t * 1.4) * 8 * dt;
      return x < W + 30;
    },
    draw(c) {
      const s = S();
      const flap = Math.sin(t * 6) * 1.2 * s;
      c.strokeStyle = "rgba(90, 70, 80, 0.6)";
      c.lineWidth = Math.max(1, s * 0.4);
      c.beginPath();
      c.moveTo(x - 2 * s, y - flap);
      c.lineTo(x, y);
      c.lineTo(x + 2 * s, y - flap);
      c.stroke();
    },
  });
};

// ---------------------------------------------------------------------------
// Audio — lofi génératif + ambiances (WebAudio)
// ---------------------------------------------------------------------------

const PENTA = [261.6, 293.7, 329.6, 392, 440, 523.3];
const CHORDS = [
  [174.6, 220, 261.6, 329.6], // Fmaj7
  [164.8, 196, 246.9, 293.7], // Em7
  [146.8, 174.6, 220, 261.6], // Dm7
  [130.8, 164.8, 196, 246.9], // Cmaj7
];
const BAR = 3.4;

class Lofi {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicBus!: GainNode;
  ambBus!: GainNode;
  muted = false;
  private nextBar = 0;
  private barIdx = 0;
  private ambNodes: { gain: GainNode; stops: (() => void)[] } | null = null;

  start(): void {
    if (this.ctx) return;
    const ac = new AudioContext();
    this.ctx = ac;
    this.master = ac.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ac.destination);
    this.musicBus = ac.createGain();
    this.musicBus.gain.value = 0.8;
    this.ambBus = ac.createGain();
    this.ambBus.gain.value = 1;
    this.musicBus.connect(this.master);
    this.ambBus.connect(this.master);

    this.startCrackle();
    this.nextBar = ac.currentTime + 0.1;
    setInterval(() => this.tick(), 200);
    this.setAmbience(WORLDS[worldIdx].ambience);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.ctx) this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.9, this.ctx.currentTime + 0.15);
    return this.muted;
  }

  private noiseBuffer(seconds: number, brown = false): AudioBuffer {
    const ac = this.ctx!;
    const buf = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else {
        d[i] = w;
      }
    }
    return buf;
  }

  private startCrackle(): void {
    const ac = this.ctx!;
    const buf = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < 260; i++) {
      const at = Math.floor(Math.random() * d.length);
      const amp = Math.random() * 0.5;
      for (let j = 0; j < 40 && at + j < d.length; j++) d[at + j] += (Math.random() * 2 - 1) * amp * Math.exp(-j / 8);
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 1800;
    const g = ac.createGain();
    g.gain.value = 0.05;
    src.connect(f).connect(g).connect(this.musicBus);
    src.start();
  }

  private osc(freq: number, t0: number, dur: number, type: OscillatorType, gain: number, dest: AudioNode, filterHz = 0): void {
    const ac = this.ctx!;
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = rnd(-6, 6);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node: AudioNode = g;
    if (filterHz) {
      const f = ac.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = filterHz;
      o.connect(f).connect(g);
    } else {
      o.connect(g);
    }
    node.connect(dest);
    o.start(t0);
    o.stop(t0 + dur + 0.1);
  }

  private tick(): void {
    const ac = this.ctx!;
    while (this.nextBar < ac.currentTime + 0.9) {
      this.scheduleBar(this.nextBar, this.barIdx);
      this.nextBar += BAR;
      this.barIdx++;
    }
  }

  private scheduleBar(t0: number, bar: number): void {
    const chord = CHORDS[bar % CHORDS.length];
    // nappe d'accord, feutrée
    for (const f of chord) this.osc(f, t0, BAR * 0.96, "triangle", 0.035, this.musicBus, 900);
    // basse ronde
    this.osc(chord[0] / 2, t0, BAR * 0.9, "sine", 0.09, this.musicBus);
    // batterie discrète : boum sur 1 et 3, tick feutré sur 2 et 4
    for (let b = 0; b < 4; b++) {
      const bt = t0 + (b * BAR) / 4;
      if (b % 2 === 0) this.kick(bt);
      else this.tickHat(bt);
    }
    // mélodie clairsemée
    if (Math.random() < 0.65) {
      const n = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) {
        const at = t0 + rnd(0, BAR * 0.7);
        const f = chord[Math.floor(Math.random() * chord.length)] * 2;
        this.osc(f, at, 1.4, "triangle", 0.045, this.musicBus, 1600);
      }
    }
  }

  private kick(t0: number): void {
    const ac = this.ctx!;
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(110, t0);
    o.frequency.exponentialRampToValueAtTime(42, t0 + 0.14);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.16, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
    o.connect(g).connect(this.musicBus);
    o.start(t0);
    o.stop(t0 + 0.3);
  }

  private tickHat(t0: number): void {
    const ac = this.ctx!;
    const src = ac.createBufferSource();
    src.buffer = this.noiseBuffer(0.05);
    const f = ac.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 5000;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.03, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
    src.connect(f).connect(g).connect(this.musicBus);
    src.start(t0);
  }

  pluck(): void {
    if (!this.ctx) return;
    const f = PENTA[Math.floor(Math.random() * PENTA.length)];
    this.osc(f, this.ctx.currentTime, 0.5, "triangle", 0.09, this.master, 1800);
  }

  // --- ambiances par monde -------------------------------------------------

  setAmbience(kind: World["ambience"]): void {
    const ac = this.ctx;
    if (!ac) return;
    if (this.ambNodes) {
      const old = this.ambNodes;
      old.gain.gain.linearRampToValueAtTime(0, ac.currentTime + 1.8);
      setTimeout(() => {
        old.stops.forEach((s) => s());
        old.gain.disconnect();
      }, 2200);
    }
    const gain = ac.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(1, ac.currentTime + 2.2);
    gain.connect(this.ambBus);
    const stops: (() => void)[] = [];

    const loopNoise = (brown: boolean, type: BiquadFilterType, freq: number, g0: number): GainNode => {
      const src = ac.createBufferSource();
      src.buffer = this.noiseBuffer(3, brown);
      src.loop = true;
      const f = ac.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      const g = ac.createGain();
      g.gain.value = g0;
      src.connect(f).connect(g).connect(gain);
      src.start();
      stops.push(() => src.stop());
      return g;
    };

    const sporadic = (minS: number, maxS: number, fn: () => void): void => {
      let alive = true;
      const loop = (): void => {
        if (!alive) return;
        fn();
        setTimeout(loop, rnd(minS, maxS) * 1000);
      };
      setTimeout(loop, rnd(minS, maxS) * 500);
      stops.push(() => (alive = false));
    };

    if (kind === "rain") {
      loopNoise(false, "bandpass", 900, 0.045);
      loopNoise(true, "lowpass", 300, 0.02);
      sporadic(0.4, 1.6, () => {
        // goutte qui plinke
        this.osc(rnd(1100, 2400), ac.currentTime, 0.2, "sine", 0.012, gain);
      });
    } else if (kind === "city") {
      loopNoise(true, "lowpass", 260, 0.028);
      sporadic(9, 22, () => {
        // voiture lointaine : souffle filtré qui passe
        const src = ac.createBufferSource();
        src.buffer = this.noiseBuffer(3);
        const f = ac.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.setValueAtTime(200, ac.currentTime);
        f.frequency.linearRampToValueAtTime(500, ac.currentTime + 2.4);
        const g = ac.createGain();
        g.gain.setValueAtTime(0, ac.currentTime);
        g.gain.linearRampToValueAtTime(0.02, ac.currentTime + 1.2);
        g.gain.linearRampToValueAtTime(0, ac.currentTime + 2.6);
        src.connect(f).connect(g).connect(gain);
        src.start();
      });
    } else if (kind === "waves") {
      const g = loopNoise(false, "lowpass", 520, 0.02);
      const lfo = ac.createOscillator();
      lfo.frequency.value = 0.09;
      const lg = ac.createGain();
      lg.gain.value = 0.018;
      lfo.connect(lg).connect(g.gain);
      lfo.start();
      stops.push(() => lfo.stop());
      sporadic(14, 30, () => this.osc(rnd(900, 1400), ac.currentTime, 0.6, "sine", 0.008, gain));
    } else if (kind === "space") {
      const o1 = ac.createOscillator();
      o1.type = "sine";
      o1.frequency.value = 55;
      const o2 = ac.createOscillator();
      o2.type = "sine";
      o2.frequency.value = 110.7;
      const g = ac.createGain();
      g.gain.value = 0.018;
      o1.connect(g);
      o2.connect(g);
      g.connect(gain);
      o1.start();
      o2.start();
      stops.push(() => {
        o1.stop();
        o2.stop();
      });
      sporadic(8, 18, () => this.osc(1568, ac.currentTime, 2.4, "sine", 0.006, gain));
    } else if (kind === "under") {
      const g = loopNoise(true, "lowpass", 320, 0.035);
      const lfo = ac.createOscillator();
      lfo.frequency.value = 0.13;
      const lg = ac.createGain();
      lg.gain.value = 0.02;
      lfo.connect(lg).connect(g.gain);
      lfo.start();
      stops.push(() => lfo.stop());
      sporadic(2, 6, () => {
        // blup de bulle
        const o = ac.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(rnd(240, 400), ac.currentTime);
        o.frequency.exponentialRampToValueAtTime(rnd(700, 1100), ac.currentTime + 0.12);
        const og = ac.createGain();
        og.gain.setValueAtTime(0.014, ac.currentTime);
        og.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.15);
        o.connect(og).connect(gain);
        o.start();
        o.stop(ac.currentTime + 0.2);
      });
    }

    this.ambNodes = { gain, stops };
  }
}

const lofi = new Lofi();

// ---------------------------------------------------------------------------
// Interactions au clic
// ---------------------------------------------------------------------------

const applyEffect = (effect: string, x: number, y: number, r: Rect): void => {
  const w = WORLDS[worldIdx];
  switch (effect) {
    case "cabin": {
      const chimney = imgToScreen(r, 0.664, 0.5);
      for (let i = 0; i < 4; i++) setTimeout(() => addSmokePuff(chimney.x, chimney.y), i * 350);
      addGlowPulse(x, y, "rgba(255, 190, 90, 0.8)", 60 * (S() / 3));
      break;
    }
    case "lantern":
      addGlowPulse(x, y, "rgba(255, 190, 90, 0.9)", 46 * (S() / 3));
      addSparkle(x, y, "#ffd76a", 5);
      break;
    case "rainburst":
      for (let i = 0; i < 10; i++) addSplash(x + rnd(-30, 30), y + rnd(-20, 20));
      break;
    case "fireflies":
      for (let i = 0; i < 5; i++) addFirefly(x + rnd(-20, 20), y + rnd(-20, 10));
      break;
    case "moonpulse":
      addGlowPulse(x, y, "rgba(220, 230, 255, 0.8)", 90 * (S() / 3));
      break;
    case "vending":
      addSparkle(x, y, "#a0e8e0", 8);
      addGlowPulse(x, y, "rgba(160, 232, 224, 0.7)", 40 * (S() / 3));
      break;
    case "neon":
      addGlowPulse(x, y, "rgba(255, 150, 200, 0.75)", 60 * (S() / 3));
      addSparkle(x, y, "#ffb0d8", 6);
      break;
    case "window": {
      // allume / éteint une petite lueur persistante à cet endroit
      const list = litWindows.get(w.id) ?? [];
      const n = screenToImg(r, x, y);
      const near = list.findIndex((p) => Math.hypot(p.x - n.nx, p.y - n.ny) < 0.03);
      if (near >= 0) list.splice(near, 1);
      else list.push({ x: n.nx, y: n.ny });
      litWindows.set(w.id, list);
      break;
    }
    case "shootingstar":
      addShootingStar(x, y);
      break;
    case "ricochet":
      addRicochet(r, x, y);
      break;
    case "crab":
      addCrab(r, x);
      break;
    case "shellburst":
      addSparkle(x, y, "#ffe2c8", 8);
      break;
    case "lighthouse": {
      const top = imgToScreen(r, 0.818, 0.33);
      addBeam(top.x, top.y);
      break;
    }
    case "sunpulse":
      addGlowPulse(x, y, "rgba(255, 220, 170, 0.8)", 110 * (S() / 3));
      break;
    case "earthpulse":
      addGlowPulse(x, y, "rgba(120, 210, 255, 0.8)", 100 * (S() / 3));
      break;
    case "lander":
      addSparkle(x, y, "#a0e8ff", 6);
      addGlowPulse(x, y, "rgba(160, 220, 255, 0.7)", 36 * (S() / 3));
      break;
    case "dome":
      addGlowPulse(x, y, "rgba(255, 200, 110, 0.8)", 50 * (S() / 3));
      break;
    case "comet":
      addShootingStar(x, y, "#b8e6ff");
      addSparkle(x, y, "#d8f0ff", 4);
      break;
    case "moondust":
      addMoonDust(x, y);
      break;
    case "porthole":
      addGlowPulse(x, y, "rgba(255, 200, 120, 0.8)", 55 * (S() / 3));
      for (let i = 0; i < 5; i++) addBubble(x + rnd(-20, 20), y + rnd(-20, 20));
      break;
    case "bubbles":
      for (let i = 0; i < 8; i++) addBubble(x + rnd(-24, 24), y + rnd(-10, 26));
      if (Math.random() < 0.45) addFishSchool(r, x, y);
      break;
    case "sandpuff":
      addMoonDust(x, y);
      for (let i = 0; i < 4; i++) addBubble(x + rnd(-14, 14), y - rnd(0, 20));
      break;
    default:
      addSparkle(x, y);
  }
};

canvas.addEventListener("pointerdown", (e) => {
  if (!started) return;
  const x = e.clientX * devicePixelRatio;
  const y = e.clientY * devicePixelRatio;
  const img = images.get(WORLDS[worldIdx].id)!;
  if (!img.complete) return;
  const r = coverRect(img);
  const { nx, ny } = screenToImg(r, x, y);
  const w = WORLDS[worldIdx];
  const hs = w.hotspots.find((h) => nx >= h.x1 && nx <= h.x2 && ny >= h.y1 && ny <= h.y2);
  applyEffect(hs ? hs.effect : w.fallback(nx, ny), x, y, r);
  lofi.pluck();
});

// ---------------------------------------------------------------------------
// Boucle principale
// ---------------------------------------------------------------------------

let ambT = 0;

const spawnAmbience = (dt: number, r: Rect): void => {
  const w = WORLDS[worldIdx];
  ambT += dt;
  if (w.id === "foret") {
    for (let i = 0; i < 3; i++) if (Math.random() < 0.9) addRainDrop(r);
    if (Math.random() < dt * 0.5) addFirefly(rnd(0, W), rnd(H * 0.5, H * 0.85));
    if (Math.random() < dt * 0.4) {
      const chimney = imgToScreen(r, 0.664, 0.5);
      addSmokePuff(chimney.x, chimney.y);
    }
  } else if (w.id === "ville") {
    if (Math.random() < dt * 0.05) addShootingStar(rnd(W * 0.1, W * 0.9), rnd(0, H * 0.2));
    if (Math.random() < dt * 2) addSparkle(rnd(0, W), rnd(0, H * 0.25), "#fffbe8", 1);
  } else if (w.id === "plage") {
    if (Math.random() < dt * 1.6) {
      const p = imgToScreen(r, rnd(0.3, 0.7), rnd(0.5, 0.75));
      addSparkle(p.x, p.y, "#ffe8c0", 1);
    }
    if (Math.random() < dt * 0.05) addGull();
  } else if (w.id === "lune") {
    if (Math.random() < dt * 1.4) addSparkle(rnd(0, W), rnd(0, H * 0.5), "#e8f2ff", 1);
    if (Math.random() < dt * 0.03) addShootingStar(rnd(0, W), rnd(0, H * 0.25), "#b8e6ff");
  } else if (w.id === "ocean") {
    if (Math.random() < dt * 1.2) addBubble(rnd(0, W), H + 10);
    if (Math.random() < dt * 0.08) addJellyfish();
    if (Math.random() < dt * 0.05) addFishSchool(r, Math.random() < 0.5 ? 0 : W, rnd(H * 0.3, H * 0.7));
  }
};

const switchWorld = (dir: number): void => {
  pendingIdx = (worldIdx + dir + WORLDS.length) % WORLDS.length;
  fadeDir = 1;
};

const showWorldName = (): void => {
  worldNameEl.textContent = WORLDS[worldIdx].name;
  worldNameEl.classList.add("show");
  setTimeout(() => worldNameEl.classList.remove("show"), 4200);
};

let last = performance.now();
const frame = (now: number): void => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const w = WORLDS[worldIdx];
  const img = images.get(w.id)!;

  ctx.fillStyle = "#0d0f1a";
  ctx.fillRect(0, 0, W, H);

  if (img.complete && img.naturalWidth > 0) {
    const r = coverRect(img);
    ctx.drawImage(img, r.x, r.y, r.w, r.h);

    if (started) {
      // fenêtres allumées (ville) — persistantes
      const lit = litWindows.get(w.id);
      if (lit && lit.length) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (const p of lit) {
          const sp = imgToScreen(r, p.x, p.y);
          const flick = 0.55 + Math.sin(now / 300 + p.x * 40) * 0.08;
          const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 26 * (S() / 3));
          g.addColorStop(0, `rgba(255, 205, 110, ${0.5 * flick})`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 26 * (S() / 3), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // physique du personnage
      const groundY = imgToScreen(r, 0, w.groundY).y;
      const spd = 46 * S() * w.speed;
      const left = keys.has("ArrowLeft") || keys.has("KeyA") || keys.has("KeyQ");
      const right = keys.has("ArrowRight") || keys.has("KeyD");
      char.walking = fade === 0 && left !== right;
      if (char.walking) {
        char.facing = left ? -1 : 1;
        char.x += char.facing * spd * dt;
        char.walkT += dt;
      }
      char.idleT += dt;
      if (!char.onGround) {
        char.vy += w.gravity * (S() / 3) * dt;
        char.y += char.vy * dt;
        if (char.y >= groundY) {
          char.y = groundY;
          char.vy = 0;
          char.onGround = true;
          if (w.id === "lune") addMoonDust(char.x, char.y);
          if (w.id === "ocean") addBubble(char.x, char.y - 20);
        }
      } else {
        char.y = groundY;
      }

      // bulles du scaphandre
      if (w.id === "ocean") {
        char.bubbleT += dt;
        if (char.bubbleT > 1.4) {
          char.bubbleT = 0;
          addBubble(char.x + char.facing * 4 * S(), char.y - 16 * S());
        }
      }

      // traversée des bords → monde suivant / précédent
      if (fade === 0) {
        if (char.x > W + 20) switchWorld(1);
        else if (char.x < -20) switchWorld(-1);
      }

      spawnAmbience(dt, r);
      particles = particles.filter((p) => p.update(dt));
      for (const p of particles) p.draw(ctx);

      drawChar(ctx);
    }

    // vignette douce pour l'ambiance lofi
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(10, 8, 18, 0.32)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  // fondu entre mondes
  if (fadeDir !== 0) {
    fade += fadeDir * dt * 1.6;
    if (fade >= 1) {
      fade = 1;
      fadeDir = -1;
      worldIdx = pendingIdx;
      particles = [];
      const nw = WORLDS[worldIdx];
      const nimg = images.get(nw.id)!;
      const nr = nimg.complete ? coverRect(nimg) : { x: 0, y: 0, w: W, h: H };
      char.x = char.facing > 0 ? -14 : W + 14;
      char.y = imgToScreen(nr, 0, nw.groundY).y;
      char.vy = 0;
      char.onGround = true;
      lofi.setAmbience(nw.ambience);
      showWorldName();
    } else if (fade <= 0) {
      fade = 0;
      fadeDir = 0;
    }
    ctx.fillStyle = `rgba(8, 8, 14, ${Math.min(1, Math.max(0, fade))})`;
    ctx.fillRect(0, 0, W, H);
  }

  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------

hintEl.addEventListener("click", () => {
  if (started) return;
  started = true;
  hintEl.classList.add("hidden");
  lofi.start();
  const w = WORLDS[worldIdx];
  const img = images.get(w.id)!;
  const r = img.complete ? coverRect(img) : { x: 0, y: 0, w: W, h: H };
  char.x = W * 0.18;
  char.y = imgToScreen(r, 0, w.groundY).y;
  showWorldName();
});

muteBtn.addEventListener("click", () => {
  const muted = lofi.toggleMute();
  muteBtn.textContent = muted ? "🔇" : "🔊";
});
