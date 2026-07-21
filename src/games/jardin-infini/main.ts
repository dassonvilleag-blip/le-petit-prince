// Le jardin infini — clique pour planter, chaque fleur est unique (seed),
// et le jardin continue de pousser même quand la page est fermée : la
// croissance dépend du temps réel écoulé depuis la plantation.

interface Plant {
  x: number; // fraction de la largeur
  y: number; // fraction de la hauteur (profondeur dans l'herbe)
  seed: number;
  plantedAt: number; // epoch ms
}

interface PlantParams {
  type: number; // 0 marguerite, 1 tulipe, 2 tournesol, 3 clochette, 4 champignon
  height: number;
  lean: number;
  swayPhase: number;
  swaySpeed: number;
  petalColor: string;
  centerColor: string;
  petalCount: number;
  headSize: number;
  leafCount: number;
}

const STORAGE_KEY = "jardin-infini-v1";
const GROW_SECONDS = 35;
const HORIZON = 0.62;

const INK = "#17171b";
const PETALS = ["#ff5c8a", "#ffc93c", "#ff8c42", "#6c63ff", "#4cc9f0", "#f72585", "#ff9ecd", "#b388eb"];
const CENTERS = ["#17171b", "#ffc93c", "#ff8c42", "#fffdf4"];

const canvas = document.getElementById("garden") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const hudCount = document.getElementById("hud-count")!;
const btnMow = document.getElementById("btn-mow")!;
const hint = document.getElementById("hint")!;
const toastEl = document.getElementById("toast")!;

let W = 0;
let H = 0;

// ---- utilitaires ----

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

function computeParams(seed: number): PlantParams {
  const r = mulberry32(seed);
  return {
    type: Math.floor(r() * 5),
    height: 70 + r() * 85,
    lean: (r() - 0.5) * 0.3,
    swayPhase: r() * Math.PI * 2,
    swaySpeed: 0.8 + r() * 0.9,
    petalColor: PETALS[Math.floor(r() * PETALS.length)],
    centerColor: CENTERS[Math.floor(r() * CENTERS.length)],
    petalCount: 6 + Math.floor(r() * 7),
    headSize: 13 + r() * 9,
    leafCount: 1 + Math.floor(r() * 3),
  };
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

// ---- état ----

let plants: Plant[] = [];
const paramsCache = new Map<Plant, PlantParams>();

// Happenings : la météo et la faune font vivre le jardin.
let rainUntil = 0;
let windUntil = 0;
let bird: { x: number; y: number; vx: number; dropAt: number; dropped: boolean } | null = null;
let nextEvent = 18 + Math.random() * 15;
let lastT = 0;

function load(): void {
  try {
    plants = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    plants = [];
  }
  for (const p of plants) paramsCache.set(p, computeParams(p.seed));
}

function save(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
}

function growth(p: Plant): number {
  const age = (Date.now() - p.plantedAt) / 1000;
  return Math.min(1, age / GROW_SECONDS);
}

let toastTimer = 0;
function toast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2200);
}

// ---- rendu ----

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawSky(t: number): void {
  ctx.fillStyle = "#aee3f5";
  ctx.fillRect(0, 0, W, H * HORIZON);

  // soleil à rayons tournants
  const sx = W * 0.84;
  const sy = H * 0.18;
  const sr = Math.min(W, H) * 0.05;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(t * 0.05);
  ctx.strokeStyle = "#ffc93c";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r2 = sr * (i % 2 === 0 ? 1.9 : 1.55);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * sr * 1.25, Math.sin(a) * sr * 1.25);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = "#ffc93c";
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();

  // nuages plats qui dérivent
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = INK;
  for (let i = 0; i < 3; i++) {
    const speed = 8 + i * 5;
    const cw = 90 + i * 30;
    const cx = ((i * 421 + t * speed) % (W + cw * 2)) - cw;
    const cy = H * (0.1 + i * 0.09);
    ctx.beginPath();
    ctx.roundRect(cx, cy, cw, 26, 13);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(cx + cw * 0.22, cy - 14, cw * 0.5, 22, 11);
    ctx.fill();
    ctx.stroke();
  }
}

function drawGround(): void {
  ctx.fillStyle = "#7ec850";
  ctx.fillRect(0, H * HORIZON, W, H);
  ctx.fillStyle = "#6ab53f";
  ctx.fillRect(0, H * HORIZON, W, 8);
  // touffes d'herbe fixes
  const r = mulberry32(1234);
  ctx.strokeStyle = "#5da335";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (let i = 0; i < 90; i++) {
    const gx = r() * W;
    const gy = H * (HORIZON + 0.03 + r() * 0.33);
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx - 3, gy - 8 - r() * 6);
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + 4, gy - 7 - r() * 6);
    ctx.stroke();
  }
}

function outlined(fill: string): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function drawHead(params: PlantParams, scale: number): void {
  const s = params.headSize * scale;
  switch (params.type) {
    case 0: // marguerite
    case 2: { // tournesol
      const petal = params.type === 2 ? "#ffc93c" : params.petalColor;
      const center = params.type === 2 ? "#8a5a2b" : params.centerColor;
      for (let i = 0; i < params.petalCount; i++) {
        const a = (i / params.petalCount) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(s * 0.9, 0, s * 0.75, s * 0.32, 0, 0, Math.PI * 2);
        outlined(petal);
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
      outlined(center);
      break;
    }
    case 1: { // tulipe
      ctx.beginPath();
      ctx.moveTo(-s * 0.75, -s * 0.4);
      ctx.quadraticCurveTo(-s * 0.85, s * 0.8, 0, s * 0.9);
      ctx.quadraticCurveTo(s * 0.85, s * 0.8, s * 0.75, -s * 0.4);
      ctx.quadraticCurveTo(s * 0.4, s * 0.05, 0, -s * 0.5);
      ctx.quadraticCurveTo(-s * 0.4, s * 0.05, -s * 0.75, -s * 0.4);
      ctx.closePath();
      outlined(params.petalColor);
      break;
    }
    case 3: { // clochette
      ctx.beginPath();
      ctx.moveTo(-s * 0.65, -s * 0.5);
      ctx.quadraticCurveTo(-s * 0.75, s * 0.55, -s * 0.35, s * 0.75);
      ctx.lineTo(s * 0.35, s * 0.75);
      ctx.quadraticCurveTo(s * 0.75, s * 0.55, s * 0.65, -s * 0.5);
      ctx.quadraticCurveTo(0, -s * 0.95, -s * 0.65, -s * 0.5);
      ctx.closePath();
      outlined(params.petalColor);
      ctx.beginPath();
      ctx.arc(0, s * 0.85, s * 0.16, 0, Math.PI * 2);
      outlined(params.centerColor);
      break;
    }
    default: { // champignon
      ctx.beginPath();
      ctx.moveTo(-s, s * 0.25);
      ctx.quadraticCurveTo(0, -s * 1.35, s, s * 0.25);
      ctx.closePath();
      outlined(params.petalColor);
      const r = mulberry32(params.petalCount);
      ctx.fillStyle = "#fffdf4";
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc((r() - 0.5) * s * 1.4, -s * (0.1 + r() * 0.5), s * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawPlant(p: Plant, t: number): void {
  const params = paramsCache.get(p)!;
  const g = growth(p);
  const bx = p.x * W;
  const by = p.y * H;
  // profondeur : plus bas = plus proche = plus grand
  const depth = 0.7 + ((p.y - HORIZON - 0.04) / 0.32) * 0.55;

  if (g < 0.12) {
    // petite butte + graine
    ctx.beginPath();
    ctx.ellipse(bx, by, 9 * depth, 4.5 * depth, 0, 0, Math.PI * 2);
    outlined("#8a5a2b");
    return;
  }

  const windy = t < windUntil ? 2.8 : 1;
  const stemLen = params.height * depth * (0.12 + 0.88 * easeOutCubic(g));
  const sway = Math.sin(t * params.swaySpeed * windy + params.swayPhase) * 5 * depth * g * windy;
  const hx = bx + params.lean * stemLen + sway;
  const hy = by - stemLen;

  const isMushroom = params.type === 4;
  if (!isMushroom) {
    // tige
    ctx.strokeStyle = "#2e8b3a";
    ctx.lineWidth = 4 * depth;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + params.lean * stemLen * 0.3, by - stemLen * 0.6, hx, hy);
    ctx.stroke();

    // feuilles
    for (let i = 0; i < params.leafCount; i++) {
      const f = 0.3 + i * 0.22;
      const lx = bx + params.lean * stemLen * 0.3 * f + sway * f * 0.5;
      const ly = by - stemLen * f;
      const side = i % 2 === 0 ? 1 : -1;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(side * -0.9);
      ctx.beginPath();
      ctx.ellipse(side * 9 * depth, 0, 11 * depth, 4.5 * depth, 0, 0, Math.PI * 2);
      outlined("#3da24a");
      ctx.restore();
    }
  } else {
    // pied du champignon
    ctx.beginPath();
    ctx.roundRect(bx - 5 * depth, by - stemLen * 0.55, 10 * depth, stemLen * 0.55, 4);
    outlined("#f3e6c8");
  }

  // tête (apparaît en fin de croissance)
  const headScale = Math.max(0, (g - 0.55) / 0.45);
  if (headScale > 0) {
    ctx.save();
    if (isMushroom) ctx.translate(bx, by - stemLen * 0.55);
    else ctx.translate(hx, hy);
    ctx.scale(depth, depth);
    drawHead(params, easeOutCubic(headScale));
    ctx.restore();
  }
}

function drawBees(t: number): void {
  const bloomed = plants.filter((p) => growth(p) >= 1);
  const count = Math.min(5, Math.floor(bloomed.length / 4));
  for (let i = 0; i < count; i++) {
    const target = bloomed[(i * 7) % bloomed.length];
    const params = paramsCache.get(target)!;
    const depth = 0.7 + ((target.y - HORIZON - 0.04) / 0.32) * 0.55;
    const cx = target.x * W + params.lean * params.height * depth;
    const cy = target.y * H - params.height * depth;
    const bx = cx + Math.cos(t * 1.3 + i * 2.4) * 34;
    const by = cy + Math.sin(t * 2.1 + i * 1.7) * 18 - 10;

    ctx.save();
    ctx.translate(bx, by);
    // ailes
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.ellipse(-2, -6, 4, 6, -0.4, 0, Math.PI * 2);
    ctx.ellipse(3, -6, 4, 6, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // corps
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 5, 0, 0, Math.PI * 2);
    outlined("#ffc93c");
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-2, -4.5);
    ctx.lineTo(-2, 4.5);
    ctx.moveTo(2, -4.5);
    ctx.lineTo(2, 4.5);
    ctx.stroke();
    ctx.restore();
  }
}

function updateHappenings(t: number, dt: number): void {
  nextEvent -= dt;
  if (nextEvent <= 0) {
    nextEvent = 25 + Math.random() * 20;
    const roll = Math.random();
    if (roll < 0.4 && plants.length > 0) {
      rainUntil = t + 8;
      for (const p of plants) p.plantedAt -= 10_000;
      save();
      toast("Il pleut ! Tout pousse plus vite 🌧️");
    } else if (roll < 0.7 && plants.length > 0) {
      windUntil = t + 9;
      toast("Coup de vent ! 🍃");
    } else {
      const fromLeft = Math.random() < 0.5;
      bird = {
        x: fromLeft ? -40 : W + 40,
        y: H * (0.12 + Math.random() * 0.25),
        vx: fromLeft ? 130 : -130,
        dropAt: W * (0.25 + Math.random() * 0.5),
        dropped: false,
      };
    }
  }

  if (bird) {
    bird.x += bird.vx * dt;
    if (!bird.dropped && ((bird.vx > 0 && bird.x >= bird.dropAt) || (bird.vx < 0 && bird.x <= bird.dropAt))) {
      bird.dropped = true;
      const plant: Plant = {
        x: bird.x / W,
        y: HORIZON + 0.06 + Math.random() * 0.28,
        seed: Math.floor(Math.random() * 2 ** 31),
        plantedAt: Date.now(),
      };
      plants.push(plant);
      paramsCache.set(plant, computeParams(plant.seed));
      save();
      hint.classList.add("hidden");
      toast("Un oiseau a semé une graine 🐦");
    }
    if (bird.x < -60 || bird.x > W + 60) bird = null;
  }
}

function drawBird(t: number): void {
  if (!bird) return;
  ctx.font = "26px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.save();
  ctx.translate(bird.x, bird.y + Math.sin(t * 6) * 4);
  if (bird.vx > 0) ctx.scale(-1, 1); // l'emoji regarde à gauche par défaut
  ctx.fillText("🐦", 0, 0);
  ctx.restore();
}

function drawRain(t: number): void {
  if (t >= rainUntil) return;
  ctx.fillStyle = "rgba(90, 105, 150, 0.16)";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(80, 140, 220, 0.75)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (let i = 0; i < 60; i++) {
    const rx = Math.random() * W;
    const ry = Math.random() * H;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - 3, ry + 12);
    ctx.stroke();
  }
}

function draw(t: number): void {
  drawSky(t);
  drawGround();
  const sorted = [...plants].sort((a, b) => a.y - b.y);
  for (const p of sorted) drawPlant(p, t);
  drawBees(t);
  drawBird(t);
  drawRain(t);
}

// ---- interactions ----

const MILESTONES: [number, string][] = [
  [1, "Ta première graine est plantée 🌱"],
  [10, "Dix plantes ! Ça commence à ressembler à un jardin"],
  [25, "25 plantes — les abeilles arrivent 🐝"],
  [50, "50 plantes ! Un vrai petit paradis"],
  [100, "100 plantes. Le jardin est infini, toi aussi apparemment"],
];

canvas.addEventListener("pointerdown", (e) => {
  const yFrac = e.clientY / H;
  if (yFrac < HORIZON + 0.04) {
    toast("Plante dans l'herbe ! 🌱");
    return;
  }
  const plant: Plant = {
    x: e.clientX / W,
    y: Math.min(0.97, yFrac),
    seed: Math.floor(Math.random() * 2 ** 31),
    plantedAt: Date.now(),
  };
  plants.push(plant);
  paramsCache.set(plant, computeParams(plant.seed));
  save();
  hint.classList.add("hidden");
  const milestone = MILESTONES.find(([n]) => n === plants.length);
  if (milestone) toast(milestone[1]);
});

btnMow.addEventListener("click", () => {
  if (plants.length === 0) return;
  plants = [];
  paramsCache.clear();
  save();
  toast("Jardin tondu. On recommence ! 🚜");
});

window.addEventListener("resize", resize);
resize();
load();
if (plants.length > 0) hint.classList.add("hidden");

function frame(now: number): void {
  const t = now / 1000;
  const dt = Math.min(0.05, Math.max(0, t - lastT));
  lastT = t;
  updateHappenings(t, dt);
  draw(t);
  hudCount.textContent = String(plants.length);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export {};
