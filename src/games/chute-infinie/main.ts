// La chute infinie — tombe à travers des mondes qui s'enchaînent en boucle,
// esquive à la souris, et bats ton record de profondeur.

interface Biome {
  name: string;
  bg: string;
  obstacles: string[];
  toast: string;
}

interface Obstacle {
  x: number;
  y: number;
  vx: number;
  emoji: string;
  r: number;
  spin: number;
}

const BIOME_LEN = 800; // mètres par monde
const BIOMES: Biome[] = [
  { name: "ciel", bg: "#aee3f5", obstacles: ["☁️", "🦅", "🎈", "🪁"], toast: "Le ciel… ça commence doucement ☁️" },
  { name: "océan", bg: "#2a6fb0", obstacles: ["🐟", "🪼", "🐙", "🦈"], toast: "Plouf ! Bienvenue dans l'océan 🌊" },
  { name: "grotte", bg: "#3a2f3f", obstacles: ["🪨", "🦇", "💎", "🕷️"], toast: "La grotte. Attention aux chauves-souris 🦇" },
  { name: "espace", bg: "#171a33", obstacles: ["👾", "🛸", "🌑", "⭐"], toast: "…l'espace ?! Comment c'est possible 🛸" },
];

const PLAYER_R = 15;
const RECORD_KEY = "chute-infinie-record";

const canvas = document.getElementById("fall") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const hudDepth = document.getElementById("hud-depth")!;
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
let record = Number(localStorage.getItem(RECORD_KEY) ?? "0");
let playerX = 0;
let targetX = 0;
let obstacles: Obstacle[] = [];
let spawnIn = 0;
let lastBiomeIndex = -1;
let deadCooldown = 0;

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

function fallSpeed(): number {
  return Math.min(620, 240 + depth * 0.055);
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
  // transition sur les derniers 12 % du monde
  if (into < 0.88) return BIOMES[index].bg;
  return lerpColor(BIOMES[index].bg, next.bg, (into - 0.88) / 0.12);
}

function reset(): void {
  depth = 0;
  obstacles = [];
  spawnIn = 0.6;
  lastBiomeIndex = -1;
  playerX = W / 2;
  targetX = W / 2;
}

function die(): void {
  state = "dead";
  deadCooldown = 0.8; // évite de relancer par accident en cliquant trop vite
  const d = Math.floor(depth);
  if (d > record) {
    record = d;
    localStorage.setItem(RECORD_KEY, String(record));
    overlayTitle.textContent = `${d} m — nouveau record !`;
  } else {
    overlayTitle.textContent = `${d} m`;
  }
  overlayText.innerHTML = "Clique pour retomber.";
  overlay.classList.remove("hidden");
}

function step(dt: number): void {
  if (deadCooldown > 0) deadCooldown -= dt;
  if (state !== "falling") return;

  const speed = fallSpeed();
  depth += (speed * dt) / 10; // 10 px ≈ 1 m

  // annonce du nouveau monde
  const index = Math.floor(depth / BIOME_LEN) % BIOMES.length;
  const absoluteIndex = Math.floor(depth / BIOME_LEN);
  if (absoluteIndex !== lastBiomeIndex) {
    lastBiomeIndex = absoluteIndex;
    if (absoluteIndex > 0) toast(BIOMES[index].toast);
    if (absoluteIndex === BIOMES.length) toast("Tu as fait le tour. Ça recommence 🔁");
  }

  // le joueur suit la souris en douceur
  playerX += (targetX - playerX) * Math.min(1, dt * 10);
  playerX = Math.min(W - PLAYER_R, Math.max(PLAYER_R, playerX));

  // apparition d'obstacles
  spawnIn -= dt;
  if (spawnIn <= 0) {
    spawnIn = Math.max(0.22, 0.75 - depth / 6000);
    const biome = biomeAt(depth + 60); // ce qui arrive d'en bas appartient au monde suivant
    obstacles.push({
      x: Math.random() * W,
      y: H + 50,
      vx: (Math.random() - 0.5) * 70,
      emoji: biome.obstacles[Math.floor(Math.random() * biome.obstacles.length)],
      r: 15 + Math.random() * 9,
      spin: (Math.random() - 0.5) * 2,
    });
  }

  // déplacement + collisions
  const py = H * 0.3;
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.y -= speed * dt;
    o.x += o.vx * dt;
    if (o.y < -60) {
      obstacles.splice(i, 1);
      continue;
    }
    if (Math.hypot(o.x - playerX, o.y - py) < o.r + PLAYER_R - 6) {
      die();
      return;
    }
  }
}

function draw(t: number): void {
  ctx.fillStyle = state === "ready" ? BIOMES[0].bg : backgroundColor();
  ctx.fillRect(0, 0, W, H);

  // lignes de vitesse
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

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const o of obstacles) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(Math.sin(t * o.spin) * 0.3);
    ctx.font = `${o.r * 2.1}px serif`;
    ctx.fillText(o.emoji, 0, 0);
    ctx.restore();
  }

  if (state !== "ready") {
    const py = H * 0.3;
    ctx.save();
    ctx.translate(playerX, py);
    if (state === "falling") ctx.rotate(Math.sin(t * 3) * 0.22);
    ctx.font = `${PLAYER_R * 2.4}px serif`;
    ctx.fillText(state === "dead" ? "😵" : "🤸", 0, 0);
    ctx.restore();
  }
}

function updateHud(): void {
  hudDepth.textContent = `${Math.floor(depth)} m`;
  hudRecord.textContent = `${record} m`;
}

canvas.addEventListener("pointermove", (e) => {
  targetX = e.clientX;
});

canvas.addEventListener("pointerdown", (e) => {
  targetX = e.clientX;
  if (state === "ready" || (state === "dead" && deadCooldown <= 0)) {
    reset();
    state = "falling";
    overlay.classList.add("hidden");
  }
});

window.addEventListener("resize", resize);
resize();
reset();
updateHud();

let last = 0;
function frame(now: number): void {
  const t = now / 1000;
  const dt = Math.min(0.05, Math.max(0, t - last));
  last = t;
  step(dt);
  draw(t);
  updateHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export {};
