// La Promenade — une balade zen lofi en pixel art.
// Les décors sont des images générées (Higgsfield) ; le personnage, les
// effets d'ambiance et les interactions au clic sont dessinés par-dessus
// sur le canvas, pour garder des animations fluides et fiables.

import { installTouchControls, isTouchDevice } from "../touch-controls";

const BASE = import.meta.env.BASE_URL;

// ---------------------------------------------------------------------------
// Mondes
// ---------------------------------------------------------------------------

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
  ambience: "lake" | "city" | "waves" | "space" | "under";
  gravity: number;
  jumpH: number; // hauteur de saut voulue, en pixels logiques du personnage
  platforms?: { x1: number; x2: number; y: number }[]; // surfaces d'atterrissage (coords image)
  speed: number; // multiplicateur de vitesse de marche
  hotspots: Hotspot[];
  fallback: (nx: number, ny: number) => string; // effet par défaut selon la zone
}

const WORLDS: World[] = [
  {
    id: "peche",
    name: "le lac des pêcheurs",
    file: "peche.png",
    groundY: 0.88,
    ambience: "lake",
    gravity: 2200,
    jumpH: 45,
    speed: 1,
    hotspots: [
      { x1: 0.42, y1: 0.68, x2: 0.54, y2: 0.92, effect: "fisher" },
      { x1: 0.7, y1: 0.68, x2: 0.82, y2: 0.92, effect: "fisher" },
      { x1: 0.17, y1: 0.58, x2: 0.32, y2: 0.68, effect: "boat" },
      { x1: 0.31, y1: 0.54, x2: 0.5, y2: 0.62, effect: "boat" },
      { x1: 0.62, y1: 0.54, x2: 0.71, y2: 0.62, effect: "boat" },
      { x1: 0.0, y1: 0.24, x2: 0.42, y2: 0.58, effect: "lantern" },
      { x1: 0.72, y1: 0.45, x2: 1.0, y2: 0.82, effect: "birds" },
    ],
    fallback: (_nx, ny) => (ny > 0.5 && ny < 0.82 ? "ripple" : ny <= 0.5 ? "birds" : "sparkle"),
  },
  {
    id: "ville",
    name: "la ville qui ronronne",
    file: "ville.png",
    groundY: 0.92,
    ambience: "city",
    gravity: 2200,
    jumpH: 45,
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
    gravity: 2200,
    jumpH: 45,
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
    gravity: 460,
    jumpH: 85,
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
    gravity: 800,
    jumpH: 38,
    speed: 0.7,
    hotspots: [{ x1: 0.57, y1: 0.4, x2: 0.88, y2: 0.86, effect: "porthole" }],
    fallback: (_nx, ny) => (ny > 0.82 ? "sandpuff" : "bubbles"),
    // remontée vers la sortie en haut à droite (→ la lune), par paliers
    // réguliers atteignables avec le saut sous-marin
    platforms: [
      { x1: 0.2, x2: 0.32, y: 0.81 },
      { x1: 0.36, x2: 0.46, y: 0.68 },
      { x1: 0.5, x2: 0.6, y: 0.555 },
      { x1: 0.63, x2: 0.72, y: 0.43 },
      { x1: 0.75, x2: 0.83, y: 0.31 },
      { x1: 0.86, x2: 0.99, y: 0.2 },
    ],
  },
];

// ordre du voyage : pêche → plongée dans l'océan → (en haut à droite) la
// lune → la ville → la plage → retour au lac
const ORDER = ["peche", "ocean", "lune", "ville", "plage"];
WORLDS.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

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
  idleSince: 0, // secondes d'immobilité (déclenche la contemplation)
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
  // impulsion calculée pour atteindre exactement jumpH pixels logiques,
  // quelle que soit la taille de l'écran (sinon le saut sortait de l'écran)
  const g = w.gravity * (S() / 3);
  char.vy = -Math.sqrt(2 * g * w.jumpH * S());
  char.onGround = false;
};

// Taille d'un "pixel" logique du personnage, selon l'écran
const S = (): number => Math.max(2, Math.round(H / 220));

const px = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void => {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

// Personnage : planches de sprites générées (4 frames de marche par monde),
// fond magenta rendu transparent au chargement, frames recadrées sur leur
// boîte englobante et ancrées par les pieds.
interface CharSheet {
  canvas: HTMLCanvasElement;
  frames: { sx: number; sy: number; sw: number; sh: number }[];
  idle: number; // frame la plus étroite = jambes jointes
  refH: number; // hauteur de référence commune : la taille ne "respire" pas
}
const charSheets = new Map<string, CharSheet>();

const loadSheet = (key: string, file: string, cells: number): void => {
  const img = new Image();
  img.src = `${BASE}la-promenade/${file}`;
  img.onload = () => {
    const cv = document.createElement("canvas");
    cv.width = img.width;
    cv.height = img.height;
    const cc = cv.getContext("2d")!;
    cc.drawImage(img, 0, 0);
    // les planches sont déjà nettoyées hors-ligne (fond transparent, cadres
    // et lignes de sol retirés) : il ne reste qu'à découper les cellules
    // et recadrer chaque frame sur sa boîte englobante
    const d = cc.getImageData(0, 0, cv.width, cv.height).data;
    const frames: CharSheet["frames"] = [];
    const cw = Math.floor(cv.width / cells);
    for (let f = 0; f < cells; f++) {
      let minX = cv.width;
      let maxX = 0;
      let minY = cv.height;
      let maxY = 0;
      for (let y = 0; y < cv.height; y++) {
        for (let x = f * cw; x < (f + 1) * cw; x++) {
          if (d[(y * cv.width + x) * 4 + 3] > 40) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      frames.push(
        maxX > minX
          ? { sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1 }
          : { sx: f * cw, sy: 0, sw: cw, sh: cv.height },
      );
    }
    let idle = 0;
    let refH = 0;
    for (let f = 0; f < frames.length; f++) {
      if (frames[f].sw < frames[idle].sw) idle = f;
      if (frames[f].sh > refH) refH = frames[f].sh;
    }
    charSheets.set(key, { canvas: cv, frames, idle, refH });
  };
};
for (const w of WORLDS) {
  loadSheet(w.id, `perso-${w.id}.png`, 4);
  loadSheet(`${w.id}-dos`, `perso-${w.id}-dos.png`, 2);
}

// hauteur du personnage à l'écran (~11 % de la hauteur, cohérent avec les
// portes et pontons des décors)
const CHAR_H = 24;

const drawChar = (c: CanvasRenderingContext2D): void => {
  const w = WORLDS[worldIdx];
  const s = S();
  const targetH = CHAR_H * s;
  // immobile depuis un moment : il se tourne vers l'horizon
  const backSheet = charSheets.get(`${w.id}-dos`);
  const contemplating = char.idleSince > 2.5 && char.onGround && backSheet;
  const sheet = contemplating ? backSheet : charSheets.get(w.id);
  const bob = char.walking ? 0 : Math.sin(char.idleT * 2.2) * 0.3 * s;
  c.save();
  c.translate(Math.round(char.x), Math.round(char.y + bob));
  if (!contemplating && char.facing < 0) c.scale(-1, 1);
  if (sheet) {
    let fi: number;
    if (contemplating) {
      // micro-animation de temps en temps (main en visière, tête levée…)
      fi = (char.idleSince - 2.5) % 7 > 5.6 ? 1 : 0;
    } else if (!char.onGround) {
      fi = 1; // en l'air : jambes en pleine foulée
    } else if (char.walking) {
      fi = Math.floor(char.walkT * 8) % 4;
    } else {
      fi = sheet.idle;
    }
    const f = sheet.frames[Math.min(fi, sheet.frames.length - 1)];
    const scale = targetH / sheet.refH;
    const dw = f.sw * scale;
    const dh = f.sh * scale;
    c.imageSmoothingEnabled = false;
    c.drawImage(sheet.canvas, f.sx, f.sy, f.sw, f.sh, -dw / 2, -dh, dw, dh);
  } else {
    // secours le temps du chargement
    px(c, -3 * s, -16 * s, 6 * s, 16 * s, "rgba(60, 60, 80, 0.5)");
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


const addSteam = (x: number, y: number): void => {
  let t = 0;
  const life = rnd(1.6, 2.6);
  let sx = x;
  let sy = y;
  const drift = rnd(-4, 10);
  particles.push({
    update(dt) {
      t += dt;
      sy -= 26 * dt;
      sx += drift * dt;
      return t < life;
    },
    draw(c) {
      const p = t / life;
      c.globalAlpha = 0.16 * (1 - p);
      c.fillStyle = "#e8e8f0";
      c.beginPath();
      c.arc(sx, sy, S() * (0.8 + p * 2.2), 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    },
  });
};

const addSpark = (x: number, y: number): void => {
  let sx = x + rnd(-4, 4);
  let sy = y;
  let vx = rnd(-14, 14);
  let t = 0;
  const life = rnd(0.7, 1.4);
  particles.push({
    update(dt) {
      t += dt;
      sy -= rnd(40, 70) * dt;
      sx += vx * dt;
      return t < life;
    },
    draw(c) {
      c.globalAlpha = (1 - t / life) * (0.5 + 0.5 * Math.sin(t * 20));
      px(c, sx, sy, S() * 0.5, S() * 0.5, "#ffca6a");
      c.globalAlpha = 1;
    },
  });
};

const addRipple = (x: number, y: number): void => {
  let t = 0;
  const life = 1.8;
  particles.push({
    update(dt) {
      t += dt;
      return t < life;
    },
    draw(c) {
      c.save();
      c.strokeStyle = "#fff2dc";
      c.lineWidth = Math.max(1, S() * 0.35);
      for (const off of [0, 0.5]) {
        const p = (t - off) / (life - off);
        if (p < 0 || p > 1) continue;
        c.globalAlpha = 0.4 * (1 - p);
        c.beginPath();
        c.ellipse(x, y, (6 + p * 34) * (S() / 3), (2 + p * 10) * (S() / 3), 0, 0, Math.PI * 2);
        c.stroke();
      }
      c.restore();
    },
  });
};

const addJumpFish = (x: number, waterY: number): void => {
  const dir = Math.random() < 0.5 ? -1 : 1;
  let t = 0;
  const dur = rnd(0.9, 1.3);
  const height = rnd(26, 46) * (S() / 3);
  const span = rnd(30, 60) * (S() / 3) * dir;
  addRipple(x, waterY);
  particles.push({
    update(dt) {
      t += dt;
      if (t >= dur) {
        addRipple(x + span, waterY);
        addSplash(x + span, waterY);
        return false;
      }
      return true;
    },
    draw(c) {
      const p = t / dur;
      const fx = x + span * p;
      const fy = waterY - Math.sin(p * Math.PI) * height;
      const s = S();
      const climbing = p < 0.5;
      c.globalAlpha = 0.9;
      px(c, fx, fy, 2 * s, s, "#c8d8e0");
      px(c, fx + (climbing ? -1.4 : 1.4) * s * Math.sign(span), fy + (climbing ? 0.6 : -0.6) * s, s, 0.7 * s, "#a8bcc8");
      c.globalAlpha = 1;
    },
  });
};

const addBirdFlock = (x: number, y: number): void => {
  const dir = x > W / 2 ? -1 : 1;
  const n = 3 + Math.floor(rnd(0, 3));
  for (let i = 0; i < n; i++) {
    let bx = x + rnd(-20, 20);
    let by = y + rnd(-14, 14);
    const v = rnd(50, 80) * dir;
    const phase = rnd(0, 10);
    let t = 0;
    particles.push({
      update(dt) {
        t += dt;
        bx += v * dt;
        by -= rnd(6, 14) * dt;
        return bx > -30 && bx < W + 30 && by > -30;
      },
      draw(c) {
        const s = S();
        const flap = Math.sin(t * 7 + phase) * 1.1 * s;
        c.strokeStyle = "rgba(70, 60, 70, 0.65)";
        c.lineWidth = Math.max(1, s * 0.4);
        c.beginPath();
        c.moveTo(bx - 1.6 * s, by - flap);
        c.lineTo(bx, by);
        c.lineTo(bx + 1.6 * s, by - flap);
        c.stroke();
      },
    });
  }
};

const addWalker = (r: Rect): void => {
  const groundY = imgToScreen(r, 0, WORLDS[worldIdx].groundY).y;
  const dir = Math.random() < 0.5 ? 1 : -1;
  let x = dir > 0 ? -20 : W + 20;
  const v = rnd(26, 40) * (S() / 3) * dir;
  let t = 0;
  particles.push({
    update(dt) {
      t += dt;
      x += v * dt;
      return x > -30 && x < W + 30;
    },
    draw(c) {
      const s = S() * 1.25;
      const step = Math.sin(t * 7);
      c.globalAlpha = 0.8;
      // silhouette encapuchonnée qui passe, tête baissée
      px(c, x - 2 * s, groundY - 12 * s, 4 * s, 5 * s, "#3a3550");
      px(c, x - 1.6 * s, groundY - 15 * s, 3.2 * s, 3 * s, "#3a3550");
      px(c, x - 1.5 * s + step * 0.8 * s, groundY - 7 * s, 1.4 * s, 7 * s, "#2c2840");
      px(c, x + 0.1 * s - step * 0.8 * s, groundY - 7 * s, 1.4 * s, 7 * s, "#2c2840");
      c.globalAlpha = 1;
    },
  });
};

const addSailboat = (r: Rect, ny: number): void => {
  const dir = Math.random() < 0.5 ? 1 : -1;
  let x = dir > 0 ? -30 : W + 30;
  const y = imgToScreen(r, 0, ny).y;
  const v = rnd(8, 14) * (S() / 3) * dir;
  let t = 0;
  particles.push({
    update(dt) {
      t += dt;
      x += v * dt;
      return x > -40 && x < W + 40;
    },
    draw(c) {
      const s = S() * 0.8;
      const bob = Math.sin(t * 1.1) * 0.5 * s;
      c.globalAlpha = 0.85;
      px(c, x - 2.4 * s, y + bob, 4.8 * s, 1.2 * s, "#5a4a52");
      px(c, x - 0.2 * s, y - 4.6 * s + bob, 0.5 * s, 4.6 * s, "#5a4a52");
      for (let i = 0; i < 4; i++) px(c, x + 0.3 * s, y - 4.4 * s + i * s + bob, (3.4 - i * 0.7) * s, s, "#f2e8d8");
      c.globalAlpha = 1;
    },
  });
};

const addWhale = (): void => {
  const dir = Math.random() < 0.5 ? 1 : -1;
  let x = dir > 0 ? -220 : W + 220;
  const y = rnd(H * 0.22, H * 0.42);
  const v = rnd(16, 24) * (S() / 3) * dir;
  let t = 0;
  particles.push({
    update(dt) {
      t += dt;
      x += v * dt;
      if (Math.random() < dt * 0.4) addBubble(x + dir * 10 * S(), y - 3 * S());
      return x > -260 && x < W + 260;
    },
    draw(c) {
      const s = S();
      const bob = Math.sin(t * 0.7) * 2 * s;
      const tail = Math.sin(t * 1.8) * 1.6 * s;
      c.save();
      c.globalAlpha = 0.5;
      c.fillStyle = "#1f4550";
      c.beginPath();
      c.ellipse(x, y + bob, 15 * s, 4.6 * s, 0, 0, Math.PI * 2);
      c.fill();
      // queue
      px(c, x - dir * 15 * s, y + bob - 1.4 * s + tail, 3.6 * s, 1.4 * s, "#1f4550");
      px(c, x - dir * 17.5 * s, y + bob - 3 * s + tail * 1.4, 2.4 * s, 1.6 * s, "#1f4550");
      // nageoire + œil
      px(c, x - dir * 2 * s, y + bob + 3 * s, 3 * s, 1.6 * s, "#183842");
      c.globalAlpha = 0.8;
      px(c, x + dir * 10 * s, y + bob - 1.6 * s, 0.9 * s, 0.9 * s, "#0d232a");
      c.restore();
    },
  });
};

const addSatellite = (): void => {
  const dir = Math.random() < 0.5 ? 1 : -1;
  let x = dir > 0 ? -20 : W + 20;
  const y = rnd(H * 0.06, H * 0.22);
  const v = rnd(26, 40) * dir;
  particles.push({
    update(dt) {
      x += v * dt;
      return x > -30 && x < W + 30;
    },
    draw(c) {
      const s = S();
      c.globalAlpha = 0.85;
      px(c, x, y, s, s, "#e8f0ff");
      px(c, x - 1.8 * s, y + 0.1 * s, 1.4 * s, 0.7 * s, "#7ad0e0");
      px(c, x + 1.4 * s, y + 0.1 * s, 1.4 * s, 0.7 * s, "#7ad0e0");
      c.globalAlpha = 1;
    },
  });
};

// ---------------------------------------------------------------------------
// Fixtures — petites animations permanentes façon vidéos lofi, ancrées
// aux coordonnées normalisées de chaque décor
// ---------------------------------------------------------------------------

const glow = (c: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number): void => {
  if (alpha <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.save();
  c.globalCompositeOperation = "lighter";
  c.globalAlpha = alpha;
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, radius, 0, Math.PI * 2);
  c.fill();
  c.restore();
};

const drawSleepingCat = (c: CanvasRenderingContext2D, x: number, y: number, t: number): void => {
  const s = S() * 0.8;
  const breath = 1 + Math.sin(t * 1.7) * 0.07;
  // corps lové
  px(c, x - 3.4 * s, y - 2.4 * s * breath, 6.4 * s, 2.4 * s * breath, "#d8905a");
  px(c, x - 2.6 * s, y - 2.9 * s * breath, 4.6 * s, 0.8 * s, "#d8905a");
  // rayures
  px(c, x - 1.4 * s, y - 2.4 * s * breath, 0.7 * s, 1.6 * s, "#b06a3c");
  px(c, x + 0.4 * s, y - 2.4 * s * breath, 0.7 * s, 1.6 * s, "#b06a3c");
  // tête posée sur le côté
  px(c, x + 1.8 * s, y - 3.2 * s, 2.4 * s, 2.2 * s, "#d8905a");
  px(c, x + 1.9 * s, y - 3.9 * s, 0.7 * s, 0.8 * s, "#d8905a");
  px(c, x + 3.4 * s, y - 3.9 * s, 0.7 * s, 0.8 * s, "#d8905a");
  // queue qui remue doucement
  const tip = Math.sin(t * 1.3) * 1.6 * s;
  px(c, x - 4.2 * s, y - 1.2 * s, 1.4 * s, 0.7 * s, "#b06a3c");
  px(c, x - 5.2 * s + tip * 0.2, y - 1.6 * s - Math.abs(tip) * 0.3, 1.2 * s, 0.7 * s, "#b06a3c");
};

const drawSittingCat = (c: CanvasRenderingContext2D, x: number, y: number, t: number): void => {
  const s = S() * 0.8;
  // silhouette sombre assise
  px(c, x - 1.6 * s, y - 3.6 * s, 3.2 * s, 3.6 * s, "#2f2a3a");
  px(c, x - 1.2 * s, y - 5.6 * s, 2.6 * s, 2.2 * s, "#2f2a3a");
  px(c, x - 1.2 * s, y - 6.3 * s, 0.7 * s, 0.8 * s, "#2f2a3a");
  px(c, x + 0.7 * s, y - 6.3 * s, 0.7 * s, 0.8 * s, "#2f2a3a");
  // queue qui balaie le sol
  const sw = Math.sin(t * 1.1);
  px(c, x + 1.6 * s, y - 0.8 * s, 1.6 * s, 0.7 * s, "#2f2a3a");
  px(c, x + 3.0 * s, y - 0.8 * s - sw * 1.2 * s, 1.2 * s, 0.7 * s, "#2f2a3a");
  // yeux qui luisent, clignent parfois
  if (t % 5 < 4.8) {
    px(c, x - 0.7 * s, y - 5 * s, 0.5 * s, 0.5 * s, "#a8e06a");
    px(c, x + 0.4 * s, y - 5 * s, 0.5 * s, 0.5 * s, "#a8e06a");
  }
};

const drawCampfire = (c: CanvasRenderingContext2D, x: number, y: number, t: number): void => {
  const s = S();
  // bûches croisées
  px(c, x - 3 * s, y - 1 * s, 6 * s, 1 * s, "#5a4632");
  px(c, x - 2.4 * s, y - 1.8 * s, 4.8 * s, 0.9 * s, "#6b5138");
  // flammes : colonnes de pixels qui dansent
  const cols = [-1.5, -0.5, 0.5, 1.5];
  for (let i = 0; i < cols.length; i++) {
    const hgt = (2.6 + Math.sin(t * 9 + i * 2.1) * 0.9 + Math.sin(t * 15 + i) * 0.5) * s;
    const wob = Math.sin(t * 11 + i * 1.7) * 0.4 * s;
    px(c, x + cols[i] * s + wob, y - 1.8 * s - hgt, s, hgt, i % 2 ? "#ff9a4a" : "#e06a3a");
    px(c, x + cols[i] * s + wob * 0.6, y - 1.8 * s - hgt * 0.55, s * 0.8, hgt * 0.55, "#ffd98a");
  }
  glow(c, x, y - 3 * s, 26 * (S() / 3) * (1 + Math.sin(t * 8) * 0.08), "rgba(255, 170, 80, 0.55)", 0.4);
};

// --- pêcheurs animés du lac ----------------------------------------------

interface Fisher {
  nx: number; // position sur le ponton (coord image)
  coat: string;
  phase: number;
  nextCatch: number; // horloge absolue (s) de la prochaine prise
  catchT: number; // début de la prise en cours (-1 si aucune)
}
const FISHERS: Fisher[] = [
  { nx: 0.48, coat: "#e08a4a", phase: 0, nextCatch: 12, catchT: -1 },
  { nx: 0.76, coat: "#5a9a9a", phase: 2.3, nextCatch: 24, catchT: -1 },
];
const PECHE_WATER_Y = 0.77; // ligne d'eau où flottent les bouchons
const CATCH_DUR = 2.0;

const fisherCatch = (screenX: number, r: Rect): void => {
  let best: Fisher | null = null;
  let bestD = Infinity;
  for (const f of FISHERS) {
    const d = Math.abs(imgToScreen(r, f.nx, 0).x - screenX);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  if (best && best.catchT < 0) best.nextCatch = 0; // prise au prochain frame
};

// le poisson décroché : projeté sur le ponton, il frétille en sautillant,
// puis bondit par-dessus le bord et replonge dans le lac
const addCaughtFish = (startX: number, startY: number, deckX: number, deckY: number, waterY: number): void => {
  let phase = 0; // 0 = vol vers le ponton, 1 = frétille sur les planches, 2 = replongeon
  let t = 0;
  let x = startX;
  let y = startY;
  let vy = 0;
  let hops = 2 + Math.floor(rnd(0, 3));
  const flightDur = 0.55;
  const diveDur = 0.8;
  let diveStart = { x: 0, y: 0 };
  let diveX = 0;
  let scale = 1;
  const dir = Math.sign(deckX - startX) || 1;
  particles.push({
    update(dt) {
      t += dt;
      if (phase === 0) {
        // arc de la canne jusqu'aux planches
        const p = Math.min(1, t / flightDur);
        x = startX + (deckX - startX) * p;
        y = startY + (deckY - startY) * p - Math.sin(p * Math.PI) * 46 * (S() / 3);
        if (p >= 1) {
          phase = 1;
          t = 0;
          vy = -rnd(70, 110) * (S() / 3);
        }
      } else if (phase === 1) {
        // sautille sur le ponton, de moins en moins haut
        vy += 900 * (S() / 3) * dt;
        y += vy * dt;
        x += dir * 14 * (S() / 3) * dt;
        if (y >= deckY) {
          y = deckY;
          hops--;
          if (hops <= 0) {
            phase = 2;
            t = 0;
            diveStart = { x, y };
            diveX = x + rnd(-30, 30) * (S() / 3);
          } else {
            vy = -rnd(50, 100) * (S() / 3);
          }
        }
      } else {
        // bond final : par-dessus le bord, vers l'eau (il rapetisse en s'éloignant)
        const p = Math.min(1, t / diveDur);
        x = diveStart.x + (diveX - diveStart.x) * p;
        y = diveStart.y + (waterY - diveStart.y) * p - Math.sin(p * Math.PI) * 60 * (S() / 3);
        scale = 1 - p * 0.5;
        if (p >= 1) {
          addSplash(x, waterY);
          addRipple(x, waterY);
          return false;
        }
      }
      return true;
    },
    draw(c) {
      const s = S() * 1.45 * scale;
      // frétillement : rapide au sol, plus lâche en l'air
      const wig = Math.sin(t * (phase === 1 ? 34 : 16)) * (phase === 1 ? 1.1 : 0.6) * s;
      px(c, x - s + wig * 0.3, y - 0.8 * s, 2 * s, s, "#c8d8e0");
      px(c, x + s + wig, y - 0.6 * s, 0.9 * s, 0.7 * s, "#a8bcc8");
      px(c, x - 0.4 * s, y - 0.6 * s, 0.4 * s, 0.4 * s, "#2a2622");
    },
  });
};

const drawFisher = (c: CanvasRenderingContext2D, f: Fisher, r: Rect, t: number): void => {
  const s = S() * 1.45;
  const base = imgToScreen(r, f.nx, WORLDS[worldIdx].groundY);
  const waterY = imgToScreen(r, 0, PECHE_WATER_Y).y;
  const x = base.x;
  const y = base.y;

  // déclenchement d'une prise
  if (f.catchT < 0 && t > f.nextCatch) {
    f.catchT = t;
    f.nextCatch = t + CATCH_DUR + rnd(16, 34);
  }
  const ph = f.catchT >= 0 ? (t - f.catchT) / CATCH_DUR : -1;
  if (ph > 1) {
    f.catchT = -1;
    // le poisson se décroche et atterrit sur le ponton
    const tipX0 = x - 8.5 * s;
    const tipY0 = y - 18 * s;
    const deckX = x + (Math.random() < 0.7 ? 1 : -1) * rnd(4, 9) * s;
    addCaughtFish(tipX0, tipY0, deckX, y - 0.6 * s, waterY);
  }
  const pulling = ph >= 0 && ph <= 1;

  // bonhomme de profil, face à l'eau (vers la gauche)
  px(c, x - 1.8 * s, y - 1 * s, 1.6 * s, 1 * s, "#4a3826");
  px(c, x + 0.2 * s, y - 1 * s, 1.6 * s, 1 * s, "#4a3826");
  px(c, x - 1.6 * s, y - 5 * s, 3.2 * s, 4 * s, "#3a4a6b");
  px(c, x - 2 * s, y - 9 * s, 4 * s, 4 * s, f.coat);
  px(c, x - 1.6 * s, y - 12 * s, 3.2 * s, 3 * s, "#f2c9a0");
  px(c, x - 2.4 * s, y - 13 * s, 4.8 * s, 1.2 * s, "#c9a13b");
  px(c, x - 1.8 * s, y - 12.4 * s, 3.6 * s, 0.7 * s, "#c9a13b");
  px(c, x - 1.5 * s, y - 11.2 * s, 0.7 * s, 0.7 * s, "#2a2622");
  // bras tendu vers la canne
  px(c, x - 2.8 * s, y - 8.6 * s + (pulling ? -0.8 * s : 0), 1.6 * s, 1 * s, f.coat);

  // canne (elle se redresse quand ça mord)
  const lift = pulling ? Math.sin(Math.min(1, ph * 2) * Math.PI * 0.5) * 3 * s : Math.sin(t * 1.6 + f.phase) * 0.5 * s;
  const tipX = x - 8.5 * s;
  const tipY = y - 15 * s - lift;
  c.strokeStyle = "#6b4a35";
  c.lineWidth = Math.max(1, s * 0.45);
  c.beginPath();
  c.moveTo(x - 2.2 * s, y - 8 * s);
  c.lineTo(tipX, tipY);
  c.stroke();

  // ligne + bouchon (ou poisson qui remonte)
  c.strokeStyle = "rgba(255, 255, 255, 0.35)";
  c.lineWidth = Math.max(1, s * 0.3);
  if (pulling) {
    const fy = waterY - (waterY - tipY - 2 * s) * Math.min(1, ph * 1.4);
    c.beginPath();
    c.moveTo(tipX, tipY);
    c.lineTo(tipX, fy);
    c.stroke();
    // petit poisson argenté qui frétille au bout
    const wig = Math.sin(t * 26) * 0.8 * s;
    px(c, tipX - s + wig, fy, 2 * s, s, "#c8d8e0");
    px(c, tipX + s + wig, fy + 0.2 * s, 0.8 * s, 0.6 * s, "#a8bcc8");
    if (ph < 0.05) {
      addSplash(tipX, waterY);
      addRipple(tipX, waterY);
    }
  } else {
    const bobY = waterY + Math.sin(t * 1.9 + f.phase) * 1.2 * s;
    c.beginPath();
    c.moveTo(tipX, tipY);
    c.lineTo(tipX, bobY);
    c.stroke();
    px(c, tipX - 0.5 * s, bobY - 0.6 * s, s, 0.6 * s, "#e05a4a");
    px(c, tipX - 0.5 * s, bobY, s, 0.6 * s, "#f2e8d8");
    if ((t + f.phase * 3) % 6 < 0.04) addRipple(tipX, bobY);
  }
};

// coordonnées normalisées des éléments animés du lac (calibrées sur l'image)
const PECHE_LANTERNS: [number, number][] = [
  [0.131, 0.475],
  [0.203, 0.478],
  [0.24, 0.47],
  [0.281, 0.487],
  [0.321, 0.487],
  [0.38, 0.46],
];
const PECHE_CAT: [number, number] = [0.09, 0.88];

const drawFixtures = (c: CanvasRenderingContext2D, r: Rect, t: number): void => {
  const w = WORLDS[worldIdx];
  const at = (nx: number, ny: number): { x: number; y: number } => imgToScreen(r, nx, ny);
  const u = S() / 3; // unité d'échelle des halos

  if (w.id === "peche") {
    for (let i = 0; i < PECHE_LANTERNS.length; i++) {
      const p = at(PECHE_LANTERNS[i][0], PECHE_LANTERNS[i][1]);
      glow(c, p.x, p.y, 28 * u, "rgba(255, 190, 90, 0.8)", 0.15 + Math.sin(t * 1.3 + i * 1.9) * 0.05);
    }
    // reflet du soleil levant qui scintille sur le lac
    const sun = at(0.6, 0.5);
    glow(c, sun.x, sun.y, 80 * u, "rgba(255, 210, 160, 0.6)", 0.08 + Math.sin(t * 0.6) * 0.02);
    for (const f of FISHERS) drawFisher(c, f, r, t);
    const cat = at(PECHE_CAT[0], PECHE_CAT[1]);
    drawSleepingCat(c, cat.x, cat.y, t);
  } else if (w.id === "ville") {
    // néons qui grésillent
    const drop = Math.sin(t * 7.3) + Math.sin(t * 13.7) > 1.85 ? 0.3 : 1;
    const n1 = at(0.375, 0.515);
    glow(c, n1.x, n1.y, 60 * u, "rgba(255, 200, 120, 0.7)", 0.16 * drop);
    const n2 = at(0.268, 0.527);
    glow(c, n2.x, n2.y, 40 * u, "rgba(255, 140, 200, 0.75)", 0.18 * (drop < 1 ? 1 : 0.9 + Math.sin(t * 3.1) * 0.1));
    const n3 = at(0.477, 0.57);
    glow(c, n3.x, n3.y, 44 * u, "rgba(255, 190, 110, 0.7)", 0.15 + Math.sin(t * 2.2) * 0.04);
    const lant = at(0.235, 0.66);
    glow(c, lant.x, lant.y, 26 * u, "rgba(255, 120, 90, 0.8)", 0.16 + Math.sin(t * 1.6) * 0.05);
    const vend = at(0.565, 0.7);
    glow(c, vend.x, vend.y, 36 * u, "rgba(150, 220, 230, 0.7)", 0.14 + Math.sin(t * 0.9) * 0.04);
    const cat = at(0.635, 0.905);
    drawSittingCat(c, cat.x, cat.y, t);
  } else if (w.id === "plage") {
    const fire = at(0.16, 0.885);
    drawCampfire(c, fire.x, fire.y, t);
    // scintillement du reflet du soleil
    const sun = at(0.5, 0.47);
    glow(c, sun.x, sun.y, 70 * u, "rgba(255, 220, 170, 0.6)", 0.1 + Math.sin(t * 0.7) * 0.03);
  } else if (w.id === "lune") {
    // balise du module lunaire qui clignote
    if (t % 1.6 < 0.25) {
      const b = at(0.363, 0.645);
      px(c, b.x, b.y, S() * 0.8, S() * 0.8, "#ff6a5a");
      glow(c, b.x, b.y, 16 * u, "rgba(255, 110, 90, 0.9)", 0.35);
    }
    const dome = at(0.777, 0.6);
    glow(c, dome.x, dome.y, 30 * u, "rgba(255, 200, 110, 0.8)", 0.14 + Math.sin(t * 1.1) * 0.05);
  } else if (w.id === "ocean") {
    const p1 = at(0.685, 0.72);
    const p2 = at(0.8, 0.72);
    glow(c, p1.x, p1.y, 30 * u, "rgba(255, 200, 120, 0.8)", 0.16 + Math.sin(t * 2.3) * 0.05);
    glow(c, p2.x, p2.y, 26 * u, "rgba(255, 200, 120, 0.8)", 0.13 + Math.sin(t * 1.7 + 2) * 0.05);
    // anémones roses qui pulsent doucement
    for (const [ax, ay, ph] of [
      [0.09, 0.82, 0],
      [0.22, 0.85, 2],
      [0.93, 0.82, 4],
    ] as [number, number, number][]) {
      const p = at(ax, ay);
      glow(c, p.x, p.y, 22 * u, "rgba(232, 150, 190, 0.7)", 0.1 + Math.sin(t * 1.2 + ph) * 0.04);
    }
    // plateformes de la remontée : planches d'épave flottantes
    const s = S();
    for (const p of w.platforms ?? []) {
      const a = at(p.x1, p.y);
      const b = at(p.x2, p.y);
      const sway = Math.sin(t * 0.9 + p.x1 * 20) * 0.4 * s;
      px(c, a.x, a.y + sway, b.x - a.x, 1.3 * s, "#8a6a42");
      px(c, a.x, a.y + sway, b.x - a.x, 0.4 * s, "#b08a5a");
      for (let nx = a.x + 3 * s; nx < b.x - 2 * s; nx += 6 * s) px(c, nx, a.y + sway + 0.5 * s, 0.5 * s, 0.5 * s, "#5f4830");
      // brins d'algues accrochés aux extrémités
      px(c, a.x + 0.5 * s, a.y + sway + 1.3 * s, 0.6 * s, (1.6 + Math.sin(t * 1.4 + p.x1 * 30) * 0.5) * s, "#4a8a6a");
      px(c, b.x - s, a.y + sway + 1.3 * s, 0.6 * s, (1.2 + Math.cos(t * 1.1 + p.x1 * 30) * 0.5) * s, "#4a8a6a");
    }
  }
};

// ---------------------------------------------------------------------------
// Audio — lofi génératif + ambiances (WebAudio)
// ---------------------------------------------------------------------------

// Une couleur musicale par monde : accords, tempo, timbre, batterie et
// gamme des petites notes jouées au clic.
interface MusicStyle {
  bar: number; // durée d'une mesure (s)
  chords: number[][];
  scale: number[]; // notes de la mélodie et des plucks au clic
  pad: OscillatorType;
  padGain: number;
  padFilter: number;
  padAttack: number; // temps de montée de la nappe (s)
  bass: "steady" | "pulse" | "bossa" | "drone" | "none";
  drums: "none" | "soft" | "lofi" | "shaker";
  melodyProb: number; // 1 = à chaque mesure
  melodyMul: number; // transposition de la mélodie
  melodyDur: number;
}

const MUSIC: Record<string, MusicStyle> = {
  // aube sur le lac : majeur paisible, presque acoustique
  peche: {
    bar: 3.6,
    chords: [
      [130.8, 164.8, 196, 246.9], // Cmaj7
      [110, 164.8, 220, 261.6], // Am7
      [174.6, 220, 261.6, 329.6], // Fmaj7
      [196, 246.9, 293.7, 349.2], // G7
    ],
    scale: [261.6, 293.7, 329.6, 392, 440, 523.3],
    pad: "triangle",
    padGain: 0.032,
    padFilter: 850,
    padAttack: 0.1,
    bass: "steady",
    drums: "soft",
    melodyProb: 0.5,
    melodyMul: 2,
    melodyDur: 1.6,
  },
  // grands fonds : mineur lent et aquatique, sans batterie
  ocean: {
    bar: 4.4,
    chords: [
      [146.8, 220, 261.6, 329.6], // Dm9
      [116.5, 174.6, 220, 293.7], // B♭maj7
      [98, 146.8, 174.6, 233.1], // Gm7
      [110, 164.8, 220, 261.6], // Am7
    ],
    scale: [293.7, 349.2, 392, 440, 523.3],
    pad: "sine",
    padGain: 0.042,
    padFilter: 600,
    padAttack: 1.2,
    bass: "drone",
    drums: "none",
    melodyProb: 0.35,
    melodyMul: 1,
    melodyDur: 2.4,
  },
  // la lune : quintes ouvertes, cloches lointaines, très lent
  lune: {
    bar: 5.2,
    chords: [
      [130.8, 196, 293.7], // C–G–D
      [110, 164.8, 246.9], // A–E–B
      [87.3, 130.8, 196], // F–C–G
      [98, 146.8, 220], // G–D–A
    ],
    scale: [523.3, 587.3, 659.3, 784, 880],
    pad: "sine",
    padGain: 0.03,
    padFilter: 500,
    padAttack: 0.8,
    bass: "none",
    drums: "none",
    melodyProb: 1,
    melodyMul: 1,
    melodyDur: 3,
  },
  // la ville : le vrai lofi hip-hop, groove feutré
  ville: {
    bar: 3.2,
    chords: [
      [174.6, 220, 261.6, 329.6], // Fmaj7
      [164.8, 196, 246.9, 293.7], // Em7
      [146.8, 174.6, 220, 261.6], // Dm7
      [130.8, 164.8, 196, 246.9], // Cmaj7
    ],
    scale: [261.6, 293.7, 329.6, 392, 440, 523.3],
    pad: "triangle",
    padGain: 0.035,
    padFilter: 900,
    padAttack: 0.05,
    bass: "pulse",
    drums: "lofi",
    melodyProb: 0.65,
    melodyMul: 2,
    melodyDur: 1.4,
  },
  // plage au crépuscule : douceur bossa, maracas discrètes
  plage: {
    bar: 3.4,
    chords: [
      [174.6, 220, 261.6, 329.6], // Fmaj7
      [196, 246.9, 293.7, 349.2], // G7
      [164.8, 196, 246.9, 293.7], // Em7
      [110, 164.8, 220, 261.6], // Am7
    ],
    scale: [261.6, 293.7, 329.6, 392, 440, 523.3],
    pad: "triangle",
    padGain: 0.03,
    padFilter: 1000,
    padAttack: 0.08,
    bass: "bossa",
    drums: "shaker",
    melodyProb: 0.55,
    melodyMul: 2,
    melodyDur: 1.5,
  },
};

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
    g.gain.value = 0.016;
    src.connect(f).connect(g).connect(this.musicBus);
    src.start();
  }

  private osc(freq: number, t0: number, dur: number, type: OscillatorType, gain: number, dest: AudioNode, filterHz = 0, attack = 0.06): void {
    const ac = this.ctx!;
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = rnd(-6, 6);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
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
      // le style peut changer entre deux mesures : chaque monde a sa musique
      const m = MUSIC[WORLDS[worldIdx].id];
      this.scheduleBar(this.nextBar, this.barIdx, m);
      this.nextBar += m.bar;
      this.barIdx++;
    }
  }

  private scheduleBar(t0: number, bar: number, m: MusicStyle): void {
    const chord = m.chords[bar % m.chords.length];
    // nappe d'accord, feutrée (attaque propre au monde)
    for (const f of chord) this.osc(f, t0, m.bar * 0.96, m.pad, m.padGain, this.musicBus, m.padFilter, m.padAttack);
    // basse : chaque monde a son motif
    if (m.bass === "steady") {
      this.osc(chord[0] / 2, t0, m.bar * 0.9, "sine", 0.09, this.musicBus);
    } else if (m.bass === "pulse") {
      this.osc(chord[0] / 2, t0, m.bar * 0.45, "sine", 0.11, this.musicBus);
      this.osc(chord[2] / 2, t0 + m.bar / 2, m.bar * 0.35, "sine", 0.07, this.musicBus);
    } else if (m.bass === "bossa") {
      this.osc(chord[0] / 2, t0, m.bar * 0.3, "sine", 0.1, this.musicBus);
      this.osc(chord[0] / 2, t0 + m.bar * 0.375, m.bar * 0.12, "sine", 0.07, this.musicBus);
      this.osc(chord[2] / 2, t0 + m.bar * 0.5, m.bar * 0.3, "sine", 0.08, this.musicBus);
    } else if (m.bass === "drone") {
      this.osc(chord[0] / 2, t0, m.bar, "sine", 0.08, this.musicBus, 0, 1.4);
      this.osc(chord[0] / 4, t0, m.bar, "sine", 0.04, this.musicBus, 0, 1.4);
    }
    // batterie selon le monde
    if (m.drums === "lofi") {
      for (let b = 0; b < 4; b++) {
        const bt = t0 + (b * m.bar) / 4;
        if (b % 2 === 0) this.kick(bt, 0.16);
      }
      for (let b = 0; b < 8; b++) this.tickHat(t0 + (b * m.bar) / 8, b % 2 === 0 ? 0.026 : 0.013);
    } else if (m.drums === "soft") {
      this.kick(t0, 0.09);
    } else if (m.drums === "shaker") {
      for (let b = 0; b < 8; b++) this.tickHat(t0 + (b * m.bar) / 8, b % 2 === 0 ? 0.016 : 0.009);
      this.kick(t0, 0.08);
      this.kick(t0 + m.bar / 2, 0.06);
    }
    // mélodie clairsemée dans la gamme du monde
    if (Math.random() < m.melodyProb) {
      const n = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) {
        const at = t0 + rnd(0, m.bar * 0.7);
        const f = m.scale[Math.floor(Math.random() * m.scale.length)] * m.melodyMul;
        this.osc(f, at, m.melodyDur, m.pad, 0.045, this.musicBus, 1600);
      }
    }
  }

  private kick(t0: number, gain: number): void {
    const ac = this.ctx!;
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(110, t0);
    o.frequency.exponentialRampToValueAtTime(42, t0 + 0.14);
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
    o.connect(g).connect(this.musicBus);
    o.start(t0);
    o.stop(t0 + 0.3);
  }

  private tickHat(t0: number, gain: number): void {
    const ac = this.ctx!;
    const src = ac.createBufferSource();
    src.buffer = this.noiseBuffer(0.05);
    const f = ac.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 5000;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
    src.connect(f).connect(g).connect(this.musicBus);
    src.start(t0);
  }

  pluck(): void {
    if (!this.ctx) return;
    const m = MUSIC[WORLDS[worldIdx].id];
    const f = m.scale[Math.floor(Math.random() * m.scale.length)];
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

    if (kind === "lake") {
      // clapotis très doux + oiseaux du matin + plocs d'eau
      const g = loopNoise(false, "lowpass", 460, 0.014);
      const lfo = ac.createOscillator();
      lfo.frequency.value = 0.07;
      const lg = ac.createGain();
      lg.gain.value = 0.011;
      lfo.connect(lg).connect(g.gain);
      lfo.start();
      stops.push(() => lfo.stop());
      sporadic(3, 9, () => {
        const f0 = rnd(1700, 2400);
        this.osc(f0, ac.currentTime, 0.09, "sine", 0.008, gain);
        this.osc(f0 * rnd(1.15, 1.3), ac.currentTime + 0.13, 0.11, "sine", 0.007, gain);
      });
      sporadic(6, 15, () => this.osc(rnd(380, 560), ac.currentTime, 0.16, "sine", 0.012, gain));
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
    case "lantern":
      addGlowPulse(x, y, "rgba(255, 190, 90, 0.9)", 46 * (S() / 3));
      addSparkle(x, y, "#ffd76a", 5);
      break;
    case "ripple":
      addRipple(x, y);
      if (Math.random() < 0.4) addJumpFish(x, y);
      break;
    case "fisher":
      fisherCatch(x, r);
      break;
    case "boat":
      addRipple(x, y + 10 * (S() / 3));
      addSparkle(x, y, "#ffe8c0", 4);
      break;
    case "birds":
      addBirdFlock(x, y);
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
  if (w.id === "peche") {
    if (Math.random() < dt * 0.5) {
      const p = imgToScreen(r, rnd(0.08, 0.92), rnd(PECHE_WATER_Y - 0.16, PECHE_WATER_Y));
      addRipple(p.x, p.y);
    }
    if (Math.random() < dt * 0.07) {
      const p = imgToScreen(r, rnd(0.15, 0.85), PECHE_WATER_Y);
      addJumpFish(p.x, p.y);
    }
    if (Math.random() < dt * 0.4) {
      const p = imgToScreen(r, rnd(0.1, 0.9), PECHE_WATER_Y - 0.02);
      addSteam(p.x, p.y); // brume qui s'élève du lac
    }
    if (Math.random() < dt * 0.04) addBirdFlock(Math.random() < 0.5 ? 10 : W - 10, rnd(H * 0.1, H * 0.3));
    if (Math.random() < dt * 0.05) addGull();
  } else if (w.id === "ville") {
    if (Math.random() < dt * 0.05) addShootingStar(rnd(W * 0.1, W * 0.9), rnd(0, H * 0.2));
    if (Math.random() < dt * 2) addSparkle(rnd(0, W), rnd(0, H * 0.25), "#fffbe8", 1);
    if (Math.random() < dt * 0.9) {
      const vent = imgToScreen(r, 0.395, 0.445);
      addSteam(vent.x + rnd(-4, 4), vent.y);
    }
    if (Math.random() < dt * 0.03) addWalker(r);
  } else if (w.id === "plage") {
    if (Math.random() < dt * 1.6) {
      const p = imgToScreen(r, rnd(0.3, 0.7), rnd(0.5, 0.75));
      addSparkle(p.x, p.y, "#ffe8c0", 1);
    }
    if (Math.random() < dt * 0.05) addGull();
    if (Math.random() < dt * 0.015) addSailboat(r, 0.55);
    if (Math.random() < dt * 0.05) addCrab(r, rnd(W * 0.1, W * 0.9));
    const fire = imgToScreen(r, 0.16, 0.865);
    if (Math.random() < dt * 2.2) addSpark(fire.x, fire.y);
    if (Math.random() < dt * 0.5) addSmokePuff(fire.x, fire.y - 10);
  } else if (w.id === "lune") {
    if (Math.random() < dt * 1.4) addSparkle(rnd(0, W), rnd(0, H * 0.5), "#e8f2ff", 1);
    if (Math.random() < dt * 0.03) addShootingStar(rnd(0, W), rnd(0, H * 0.25), "#b8e6ff");
    if (Math.random() < dt * 0.04) addSatellite();
  } else if (w.id === "ocean") {
    if (Math.random() < dt * 1.2) addBubble(rnd(0, W), H + 10);
    if (Math.random() < dt * 0.4) {
      const mast = imgToScreen(r, 0.75, 0.55);
      addBubble(mast.x + rnd(-10, 10), mast.y);
    }
    if (Math.random() < dt * 0.08) addJellyfish();
    if (Math.random() < dt * 0.05) addFishSchool(r, Math.random() < 0.5 ? 0 : W, rnd(H * 0.3, H * 0.7));
    if (Math.random() < dt * 0.012) addWhale();
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

      drawFixtures(ctx, r, now / 1000);

      // physique du personnage
      const groundY = imgToScreen(r, 0, w.groundY).y;
      const plats = (w.platforms ?? []).map((p) => ({
        x1: imgToScreen(r, p.x1, p.y).x,
        x2: imgToScreen(r, p.x2, p.y).x,
        y: imgToScreen(r, p.x1, p.y).y,
      }));
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
      if (char.walking || !char.onGround) char.idleSince = 0;
      else char.idleSince += dt;
      const land = (y: number): void => {
        char.y = y;
        char.vy = 0;
        char.onGround = true;
        if (w.id === "lune") addMoonDust(char.x, char.y);
        if (w.id === "ocean") addBubble(char.x, char.y - 20);
      };
      if (!char.onGround) {
        const prevY = char.y;
        char.vy += w.gravity * (S() / 3) * dt;
        char.y += char.vy * dt;
        if (char.vy > 0) {
          for (const p of plats) {
            if (char.x >= p.x1 && char.x <= p.x2 && prevY <= p.y && char.y >= p.y) {
              land(p.y);
              break;
            }
          }
        }
        if (!char.onGround && char.y >= groundY) land(groundY);
      } else {
        // rester sur le support ; tomber si on a marché dans le vide
        const onPlat = plats.find((p) => Math.abs(char.y - p.y) < 4 && char.x >= p.x1 - 3 && char.x <= p.x2 + 3);
        if (onPlat) char.y = onPlat.y;
        else if (char.y >= groundY - 4) char.y = groundY;
        else {
          char.onGround = false;
          char.vy = 0;
        }
      }

      // bulles du scaphandre
      if (w.id === "ocean") {
        char.bubbleT += dt;
        if (char.bubbleT > 1.4) {
          char.bubbleT = 0;
          addBubble(char.x + char.facing * 4 * S(), char.y - 16 * S());
        }
      }

      // traversée des bords → monde suivant / précédent. Cas particulier de
      // l'océan : la sortie de droite est en hauteur (fin de la remontée) ;
      // en bas, un léger courant bloque le passage.
      if (fade === 0) {
        if (w.id === "ocean") {
          const topExitY = r.y + r.h * 0.32;
          if (char.x > W - 8 && char.y < topExitY) switchWorld(1);
          else {
            if (char.x > W - 6) {
              char.x = W - 6;
              if (Math.random() < dt * 6) addBubble(char.x + rnd(-6, 6), char.y - rnd(0, 40));
            }
            if (char.x < -20) switchWorld(-1);
          }
        } else if (char.x > W + 20) switchWorld(1);
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
    vg.addColorStop(1, "rgba(10, 8, 18, 0.18)");
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
      if (nw.id === "ocean" && char.facing < 0 && nw.platforms) {
        // on redescend depuis la lune : on réapparaît sur la planche du haut
        const top = nw.platforms[nw.platforms.length - 1];
        char.x = imgToScreen(nr, (top.x1 + top.x2) / 2, top.y).x;
        char.y = imgToScreen(nr, 0, top.y).y;
      } else {
        char.x = char.facing > 0 ? -14 : W + 14;
        char.y = imgToScreen(nr, 0, nw.groundY).y;
      }
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

installTouchControls({
  left: [
    { code: "ArrowLeft", label: "◀" },
    { code: "ArrowRight", label: "▶" },
  ],
  right: [{ code: "Space", label: "⭡", wide: true }],
});
if (isTouchDevice()) {
  const p = hintEl.querySelector("p");
  if (p) p.innerHTML = "◀ ▶ pour marcher, ⭡ pour sauter.<br />Traverse le bord de l'écran pour changer de monde.<br />Au fond de l'océan, grimpe les planches jusqu'en haut à droite…<br />Touche le décor pour te détendre. C'est tout.";
}

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
