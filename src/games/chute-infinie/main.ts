// La chute infinie — chute façon Doodle Jump inversé : inertie, wrap d'écran,
// murs à trous à enfiler, étoiles à collecter et power-ups.

interface Biome {
  name: string;
  bg: string;
  obstacles: string[];
  toast: string;
}

interface Wall {
  y: number;
  gaps: { x: number; w: number }[];
}

interface Obstacle {
  baseX: number;
  y: number;
  amp: number;
  phase: number;
  spd: number;
  emoji: string;
  r: number;
  x: number;
}

type ItemType = "star" | "shield" | "rocket" | "balloon";

interface Item {
  x: number;
  y: number;
  type: ItemType;
  r: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const BIOME_LEN = 800; // mètres par monde
const BIOMES: Biome[] = [
  { name: "ciel", bg: "#aee3f5", obstacles: ["☁️", "🦅", "🎈", "🪁"], toast: "Le ciel… ça commence doucement ☁️" },
  { name: "océan", bg: "#2a6fb0", obstacles: ["🐟", "🪼", "🐙", "🦈"], toast: "Plouf ! Bienvenue dans l'océan 🌊" },
  { name: "grotte", bg: "#3a2f3f", obstacles: ["🪨", "🦇", "💎", "🕷️"], toast: "La grotte. Attention aux chauves-souris 🦇" },
  { name: "espace", bg: "#171a33", obstacles: ["👾", "🛸", "🌑", "⭐"], toast: "…l'espace ?! Comment c'est possible 🛸" },
];

const PLAYER_R = 15;
const WALL_H = 26;
const RECORD_KEY = "chute-infinie-record";

// contrôle façon Doodle Jump : accélération + inertie + friction
const ACCEL = 2400;
const MAX_VX = 480;
const FRICTION = 0.8;

const canvas = document.getElementById("fall") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const hudDepth = document.getElementById("hud-depth")!;
const hudStars = document.getElementById("hud-stars")!;
const hudRecord = document.getElementById("hud-record")!;
const overlay = document.getElementById("overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayText = document.getElementById("overlay-text")!;
const toastEl = document.getElementById("toast")!;

let W = 0;
let H = 0;

type State = "ready" | "falling" | "dead";
let state: State = "ready";

let depth = 0;
let stars = 0;
let record = Number(localStorage.getItem(RECORD_KEY) ?? "0");
let playerX = 0;
let playerVX = 0;
let mouseX: number | null = null;
const keys = new Set<string>();

let walls: Wall[] = [];
let obstacles: Obstacle[] = [];
let items: Item[] = [];
let particles: Particle[] = [];

let distSinceWall = 0;
let nextWallIn = 400;
let lastBiomeIndex = -1;
let deadCooldown = 0;

let shield = false;
let rocketUntil = 0;
let balloonUntil = 0;
let invincibleUntil = 0;
let shake = 0;
let now = 0;

let toastTimer = 0;
function toast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2200);
}

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

function biomeAt(d: number): Biome {
  return BIOMES[Math.floor(d / BIOME_LEN) % BIOMES.length];
}

// démarre lentement, grimpe franchement : c'est ça la progression
function baseSpeed(): number {
  return Math.min(600, 170 + depth * 0.09);
}

function fallSpeed(): number {
  let s = baseSpeed();
  if (now < rocketUntil) s *= 2.1;
  else if (now < balloonUntil) s *= 0.55;
  return s;
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function backgroundColor(): string {
  const index = Math.floor(depth / BIOME_LEN) % BIOMES.length;
  const next = BIOMES[(index + 1) % BIOMES.length];
  const into = (depth % BIOME_LEN) / BIOME_LEN;
  if (into < 0.88) return BIOMES[index].bg;
  return lerpColor(BIOMES[index].bg, next.bg, (into - 0.88) / 0.12);
}

function burst(x: number, y: number, color: string, count: number): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 160;
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + Math.random() * 0.4, color });
  }
}

function reset(): void {
  depth = 0;
  stars = 0;
  walls = [];
  obstacles = [];
  items = [];
  particles = [];
  distSinceWall = 0;
  nextWallIn = 560;
  lastBiomeIndex = -1;
  playerX = W / 2;
  playerVX = 0;
  shield = false;
  rocketUntil = 0;
  balloonUntil = 0;
  invincibleUntil = 0;
  mouseX = null;
}

function spawnWall(): void {
  // très large au début (250 px), se resserre jusqu'à 90 px vers 3200 m
  const gapW = Math.max(90, 250 - depth * 0.05);
  const gaps: { x: number; w: number }[] = [];
  if (depth > 2000 && Math.random() < 0.35) {
    // deux trous plus étroits
    const w2 = gapW * 0.8;
    const x1 = 20 + Math.random() * (W / 2 - w2 - 40);
    const x2 = W / 2 + 20 + Math.random() * (W / 2 - w2 - 40);
    gaps.push({ x: x1, w: w2 }, { x: x2, w: w2 });
  } else {
    gaps.push({ x: 20 + Math.random() * (W - gapW - 40), w: gapW });
  }
  walls.push({ y: H + 40, gaps });

  // récompenses et dangers entre les murs
  const gap = gaps[Math.floor(Math.random() * gaps.length)];
  const gapCenter = gap.x + gap.w / 2;
  if (Math.random() < 0.55) {
    // petite ligne d'étoiles sous le trou
    for (let i = 0; i < 3; i++) {
      items.push({ x: gapCenter + (i - 1) * 34, y: H + 120 + Math.abs(i - 1) * 18, type: "star", r: 13 });
    }
  }
  if (Math.random() < 0.14) {
    const type: ItemType = (["shield", "rocket", "balloon"] as ItemType[])[Math.floor(Math.random() * 3)];
    items.push({ x: 40 + Math.random() * (W - 80), y: H + 200 + Math.random() * 120, type, r: 15 });
  }
  const biome = biomeAt(depth + 100);
  // progression : rien avant 400 m, un seul jusqu'à 1500 m, deux possibles ensuite
  const obsCount = depth < 400 ? 0 : depth < 1500 ? (Math.random() < 0.75 ? 1 : 0) : Math.random() < 0.6 ? 1 : 2;
  for (let i = 0; i < obsCount; i++) {
    const baseX = 30 + Math.random() * (W - 60);
    obstacles.push({
      baseX,
      x: baseX,
      y: H + 180 + Math.random() * 200,
      amp: Math.random() < 0.5 ? 0 : (30 + Math.random() * 70) * Math.min(1, depth / 1500),
      phase: Math.random() * Math.PI * 2,
      spd: 1 + Math.random() * 1.6,
      emoji: biome.obstacles[Math.floor(Math.random() * biome.obstacles.length)],
      r: 15 + Math.random() * 8,
    });
  }
}

function die(): void {
  state = "dead";
  deadCooldown = 0.8;
  shake = 10;
  burst(playerX, H * 0.3, "#ff5c8a", 30);
  const d = Math.floor(depth);
  if (d > record) {
    record = d;
    localStorage.setItem(RECORD_KEY, String(record));
    overlayTitle.textContent = `${d} m — nouveau record !`;
  } else {
    overlayTitle.textContent = `${d} m`;
  }
  overlayText.innerHTML = `⭐ ${stars} étoile${stars > 1 ? "s" : ""} — clique pour retomber.`;
  overlay.classList.remove("hidden");
}

function hit(): void {
  if (now < rocketUntil || now < invincibleUntil) return;
  if (shield) {
    shield = false;
    invincibleUntil = now + 1.2;
    shake = 6;
    burst(playerX, H * 0.3, "#4cc9f0", 18);
    toast("Le bouclier a tenu ! 🛡️");
    return;
  }
  die();
}

function collect(item: Item): void {
  switch (item.type) {
    case "star":
      stars++;
      burst(item.x, item.y, "#ffc93c", 10);
      break;
    case "shield":
      shield = true;
      burst(item.x, item.y, "#4cc9f0", 14);
      toast("Bouclier ! 🛡️");
      break;
    case "rocket":
      rocketUntil = now + 2.5;
      shake = 8;
      burst(item.x, item.y, "#ff8c42", 20);
      toast("FUSÉE — plus rien ne t'arrête 🚀");
      break;
    case "balloon":
      balloonUntil = now + 3.5;
      burst(item.x, item.y, "#ff9ecd", 14);
      toast("Ballon — chute ralentie 🎈");
      break;
  }
}

function step(dt: number): void {
  if (deadCooldown > 0) deadCooldown -= dt;
  if (shake > 0) shake = Math.max(0, shake - dt * 18);

  for (let i = particles.length - 1; i >= 0; i--) {
    const pa = particles[i];
    pa.life -= dt;
    if (pa.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    pa.x += pa.vx * dt;
    pa.y += pa.vy * dt;
  }

  if (state !== "falling") return;

  const speed = fallSpeed();
  depth += (speed * dt) / 10; // 10 px ≈ 1 m

  const absoluteIndex = Math.floor(depth / BIOME_LEN);
  if (absoluteIndex !== lastBiomeIndex) {
    lastBiomeIndex = absoluteIndex;
    if (absoluteIndex > 0) toast(BIOMES[absoluteIndex % BIOMES.length].toast);
    if (absoluteIndex === BIOMES.length) toast("Tu as fait le tour. Ça recommence 🔁");
  }

  // ---- contrôle avec inertie ----
  let dir = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA") || keys.has("KeyQ")) dir = -1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dir = 1;
  if (dir !== 0) {
    // clavier : pur momentum
    playerVX += dir * ACCEL * dt;
    playerVX = Math.max(-MAX_VX, Math.min(MAX_VX, playerVX));
  } else if (mouseX !== null) {
    // souris : suivi amorti — vitesse proportionnelle à la distance,
    // convergence douce, aucune oscillation autour du curseur
    const desired = Math.max(-MAX_VX, Math.min(MAX_VX, (mouseX - playerX) * 7));
    playerVX += (desired - playerVX) * Math.min(1, dt * 14);
  } else {
    playerVX *= FRICTION ** (dt * 60);
  }
  playerX += playerVX * dt;

  // wrap d'écran, signature Doodle Jump
  if (playerX < -PLAYER_R) playerX = W + PLAYER_R;
  if (playerX > W + PLAYER_R) playerX = -PLAYER_R;

  // ---- apparition des murs ----
  distSinceWall += speed * dt;
  if (distSinceWall >= nextWallIn) {
    distSinceWall = 0;
    // les murs se rapprochent avec la profondeur
    nextWallIn = Math.max(360, 640 - depth * 0.06) + Math.random() * 200;
    spawnWall();
  }

  const py = H * 0.3;

  // ---- murs ----
  for (let i = walls.length - 1; i >= 0; i--) {
    const w = walls[i];
    w.y -= speed * dt;
    if (w.y < -WALL_H - 10) {
      walls.splice(i, 1);
      continue;
    }
    if (py + PLAYER_R - 5 > w.y && py - PLAYER_R + 5 < w.y + WALL_H) {
      const inGap = w.gaps.some((g) => playerX - PLAYER_R + 9 > g.x && playerX + PLAYER_R - 9 < g.x + g.w);
      if (!inGap) {
        if (now < rocketUntil) {
          // la fusée défonce le mur
          burst(playerX, w.y + WALL_H / 2, "#fffdf4", 16);
          walls.splice(i, 1);
        } else {
          hit();
          if (state !== "falling") return;
        }
      }
    }
  }

  // ---- obstacles ----
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.y -= speed * dt;
    o.x = o.baseX + Math.sin(now * o.spd + o.phase) * o.amp;
    if (o.y < -60) {
      obstacles.splice(i, 1);
      continue;
    }
    if (Math.hypot(o.x - playerX, o.y - py) < o.r + PLAYER_R - 6) {
      if (now < rocketUntil) {
        burst(o.x, o.y, "#ff8c42", 14);
        obstacles.splice(i, 1);
      } else {
        hit();
        if (state !== "falling") return;
      }
    }
  }

  // ---- objets à ramasser ----
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    it.y -= speed * dt;
    if (it.y < -40) {
      items.splice(i, 1);
      continue;
    }
    if (Math.hypot(it.x - playerX, it.y - py) < it.r + PLAYER_R) {
      collect(it);
      items.splice(i, 1);
    }
  }
}

const ITEM_EMOJI: Record<ItemType, string> = { star: "⭐", shield: "🛡️", rocket: "🚀", balloon: "🎈" };

function draw(t: number): void {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  ctx.fillStyle = state === "ready" ? BIOMES[0].bg : backgroundColor();
  ctx.fillRect(-20, -20, W + 40, H + 40);

  if (state === "falling") {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    const speed = fallSpeed();
    for (let i = 0; i < 10; i++) {
      const lx = ((i * 191) % W) + Math.sin(i * 7) * 20;
      const ly = H - (((t * speed * 0.9) + i * 173) % (H + 80)) - 40;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx, ly + 26 + speed * 0.04);
      ctx.stroke();
    }
  }

  // murs à trous
  for (const w of walls) {
    const edges = [0, ...w.gaps.flatMap((g) => [g.x, g.x + g.w]), W].sort((a, b) => a - b);
    for (let i = 0; i < edges.length; i += 2) {
      const x0 = edges[i];
      const x1 = edges[i + 1];
      if (x1 - x0 < 4) continue;
      ctx.beginPath();
      ctx.roundRect(x0 - 6, w.y, x1 - x0 + (i === 0 ? 6 : 12), WALL_H, 8);
      ctx.fillStyle = "#fffdf4";
      ctx.fill();
      ctx.strokeStyle = "#17171b";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const it of items) {
    ctx.save();
    ctx.translate(it.x, it.y + Math.sin(t * 3 + it.x) * 4);
    ctx.font = `${it.r * 2}px serif`;
    ctx.fillText(ITEM_EMOJI[it.type], 0, 0);
    ctx.restore();
  }

  for (const o of obstacles) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(Math.sin(t * 2 + o.phase) * 0.25);
    ctx.font = `${o.r * 2.1}px serif`;
    ctx.fillText(o.emoji, 0, 0);
    ctx.restore();
  }

  for (const pa of particles) {
    ctx.globalAlpha = Math.min(1, pa.life * 2);
    ctx.fillStyle = pa.color;
    ctx.fillRect(pa.x - 2.5, pa.y - 2.5, 5, 5);
  }
  ctx.globalAlpha = 1;

  if (state !== "ready") {
    const py = H * 0.3;
    ctx.save();
    ctx.translate(playerX, py);
    // penche dans le sens du mouvement, comme il se doit
    if (state === "falling") ctx.rotate(Math.max(-0.5, Math.min(0.5, playerVX / MAX_VX)) * 0.6);
    if (shield) {
      ctx.strokeStyle = "#4cc9f0";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_R + 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (now < rocketUntil) {
      ctx.font = `${PLAYER_R * 1.6}px serif`;
      ctx.fillText("🔥", 0, -PLAYER_R * 1.6);
    }
    ctx.font = `${PLAYER_R * 2.4}px serif`;
    ctx.fillText(state === "dead" ? "😵" : now < rocketUntil ? "🚀" : "🤸", 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

function updateHud(): void {
  hudDepth.textContent = `${Math.floor(depth)} m`;
  hudStars.textContent = String(stars);
  hudRecord.textContent = `${record} m`;
}

canvas.addEventListener("pointermove", (e) => {
  mouseX = e.clientX;
});

canvas.addEventListener("pointerdown", (e) => {
  mouseX = e.clientX;
  if (state === "ready" || (state === "dead" && deadCooldown <= 0)) {
    reset();
    state = "falling";
    overlay.classList.add("hidden");
  }
});

window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "KeyQ", "Space"].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  // dès qu'on touche le clavier, la souris ne pilote plus
  if (e.code.startsWith("Arrow") || ["KeyA", "KeyD", "KeyQ"].includes(e.code)) mouseX = null;
  if (e.code === "Space" && (state === "ready" || (state === "dead" && deadCooldown <= 0))) {
    reset();
    state = "falling";
    overlay.classList.add("hidden");
  }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

window.addEventListener("resize", resize);
resize();
reset();
updateHud();

let last = 0;
function frame(nowMs: number): void {
  const t = nowMs / 1000;
  const dt = Math.min(0.05, Math.max(0, t - last));
  last = t;
  now = t;
  step(dt);
  draw(t);
  updateHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export {};
