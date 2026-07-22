// La pêche abyssale — descends ta ligne, ferre une créature, remonte-la
// sans casser la ligne. Plus c'est profond, plus c'est bizarre et rare.

interface Creature {
  id: string;
  emoji: string;
  name: string;
  tier: number; // 1 à 5 — pèse sur la ligne à la remontée
  minDepth: number; // mètres
  maxDepth: number;
}

interface Swimmer {
  creature: Creature;
  x: number;
  y: number;
  vx: number;
  phase: number;
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

const CREATURES: Creature[] = [
  { id: "sardine", emoji: "🐟", name: "Sardine de base", tier: 1, minDepth: 0, maxDepth: 400 },
  { id: "clown", emoji: "🐠", name: "Poisson pas-drôle", tier: 1, minDepth: 0, maxDepth: 400 },
  { id: "crabe", emoji: "🦀", name: "Crabe syndiqué", tier: 1, minDepth: 50, maxDepth: 500 },
  { id: "botte", emoji: "🥾", name: "Botte perdue", tier: 1, minDepth: 0, maxDepth: 600 },
  { id: "calamar", emoji: "🦑", name: "Calamar timide", tier: 2, minDepth: 300, maxDepth: 900 },
  { id: "meduse", emoji: "🪼", name: "Méduse disco", tier: 2, minDepth: 300, maxDepth: 900 },
  { id: "fugu", emoji: "🐡", name: "Fugu vexé", tier: 2, minDepth: 350, maxDepth: 1000 },
  { id: "tortue", emoji: "🐢", name: "Tortue en retard", tier: 2, minDepth: 400, maxDepth: 1100 },
  { id: "requin", emoji: "🦈", name: "Requin végétarien", tier: 3, minDepth: 800, maxDepth: 1500 },
  { id: "poulpe", emoji: "🐙", name: "Poulpe DJ", tier: 3, minDepth: 800, maxDepth: 1500 },
  { id: "lanterne", emoji: "🏮", name: "Lanterne des abysses", tier: 3, minDepth: 900, maxDepth: 1700 },
  { id: "dauphin", emoji: "🐬", name: "Dauphin incognito", tier: 3, minDepth: 850, maxDepth: 1600 },
  { id: "baleine", emoji: "🐋", name: "Bébé baleine XXL", tier: 4, minDepth: 1400, maxDepth: 2300 },
  { id: "ancre", emoji: "⚓", name: "Ancre hantée", tier: 4, minDepth: 1400, maxDepth: 2400 },
  { id: "sirene", emoji: "🧜", name: "Sirène sceptique", tier: 4, minDepth: 1500, maxDepth: 2500 },
  { id: "fossile", emoji: "🦴", name: "Poisson d'avant", tier: 4, minDepth: 1500, maxDepth: 2500 },
  { id: "dragon", emoji: "🐉", name: "Dragon des fosses", tier: 5, minDepth: 2200, maxDepth: 99_999 },
  { id: "oeil", emoji: "👁️", name: "Le Regardeur", tier: 5, minDepth: 2300, maxDepth: 99_999 },
  { id: "ovni", emoji: "🛸", name: "OVNI aquatique", tier: 5, minDepth: 2400, maxDepth: 99_999 },
  { id: "chaussette", emoji: "🧦", name: "La Chaussette originelle", tier: 5, minDepth: 2600, maxDepth: 99_999 },
];

const HOOK_R = 13;
const HOOK_Y = 0.45; // fraction de l'écran
const DESCENT_DRAIN = 0.8; // % de ligne par 100 m de descente
const TIER_DRAIN = [0, 1.0, 1.4, 1.8, 2.1, 2.4]; // % par 100 m de remontée, par tier
const HIT_DRAIN = 10; // % par collision à la remontée
const ASCENT_SPEED = 1000; // px/s (100 m/s)

const RECORD_KEY = "peche-record";
const BOOK_KEY = "peche-bestiaire";

const canvas = document.getElementById("sea") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const hudDepth = document.getElementById("hud-depth")!;
const hudRecord = document.getElementById("hud-record")!;
const barFill = document.getElementById("bar-fill") as HTMLElement;
const btnBook = document.getElementById("btn-book")!;
const bookCount = document.getElementById("book-count")!;
const bookEl = document.getElementById("book")!;
const bookGrid = document.getElementById("book-grid")!;
const overlay = document.getElementById("overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayText = document.getElementById("overlay-text")!;
const toastEl = document.getElementById("toast")!;

let W = 0;
let H = 0;

type State = "surface" | "descend" | "ascend";
let state: State = "surface";

let depth = 0;
let line = 100;
let record = Number(localStorage.getItem(RECORD_KEY) ?? "0");
let caught: Creature | null = null;
let hookX = 0;
let hookVX = 0;
let mouseX: number | null = null;
let swimmers: Swimmer[] = [];
let particles: Particle[] = [];
let spawnIn = 0;
let shake = 0;
let now = 0;
let bestiaire = new Set<string>();
try {
  bestiaire = new Set(JSON.parse(localStorage.getItem(BOOK_KEY) ?? "[]"));
} catch {
  bestiaire = new Set();
}

let toastTimer = 0;
function toast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2400);
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

function descentSpeed(): number {
  return Math.min(700, 300 + depth * 0.05);
}

function scrollSpeed(): number {
  return state === "ascend" ? ASCENT_SPEED : descentSpeed();
}

function burst(x: number, y: number, color: string, count: number): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 150;
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + Math.random() * 0.4, color });
  }
}

function spawnSwimmer(fromTop: boolean): void {
  const candidates = CREATURES.filter((c) => depth >= c.minDepth && depth <= c.maxDepth);
  if (candidates.length === 0) return;
  const weighted = candidates.flatMap((c) => Array(c.tier === 5 ? 1 : 3 - Math.floor(c.tier / 3)).fill(c) as Creature[]);
  const creature = weighted[Math.floor(Math.random() * weighted.length)];
  const fromLeft = Math.random() < 0.5;
  swimmers.push({
    creature,
    x: fromLeft ? -50 : W + 50,
    y: fromTop ? -50 : H + 50,
    vx: (fromLeft ? 1 : -1) * (50 + Math.random() * 90 + depth * 0.01),
    phase: Math.random() * Math.PI * 2,
    r: 16 + creature.tier * 2,
  });
}

function saveBook(): void {
  localStorage.setItem(BOOK_KEY, JSON.stringify([...bestiaire]));
}

function renderBook(): void {
  bookCount.textContent = `${bestiaire.size}/${CREATURES.length}`;
  bookGrid.innerHTML = "";
  for (const c of CREATURES) {
    const has = bestiaire.has(c.id);
    const div = document.createElement("div");
    div.className = `book-entry${has ? " caught" : ""}`;
    div.innerHTML = has
      ? `<span class="emoji">${c.emoji}</span><span>${c.name}<small>${"★".repeat(c.tier)}</small></span>`
      : `<span class="emoji">❓</span><span>???<small>à partir de ${c.minDepth} m</small></span>`;
    bookGrid.appendChild(div);
  }
}

function endDive(success: boolean): void {
  state = "surface";
  swimmers = [];
  if (success && caught) {
    const isNew = !bestiaire.has(caught.id);
    bestiaire.add(caught.id);
    saveBook();
    renderBook();
    overlayTitle.textContent = `${caught.emoji} ${caught.name} !`;
    overlayText.innerHTML = `${"★".repeat(caught.tier)}${isNew ? " — <strong>NOUVEAU</strong> au bestiaire 📖" : " — déjà au bestiaire"}<br />Clique pour replonger.`;
  } else if (caught) {
    overlayTitle.textContent = "La ligne a cassé 💔";
    overlayText.innerHTML = `${caught.emoji} ${caught.name} est reparti dans les profondeurs…<br />Clique pour replonger.`;
  } else {
    overlayTitle.textContent = "Remonté bredouille";
    overlayText.innerHTML = "Clique pour replonger.";
  }
  caught = null;
  overlay.classList.remove("hidden");
}

function startDive(): void {
  depth = 0;
  line = 100;
  caught = null;
  swimmers = [];
  particles = [];
  spawnIn = 0.4;
  hookX = W / 2;
  hookVX = 0;
  state = "descend";
  overlay.classList.add("hidden");
}

function step(dt: number): void {
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

  if (state === "surface") return;

  const scroll = scrollSpeed();
  const hy = H * HOOK_Y;

  // ---- hameçon : suivi souris amorti ----
  if (mouseX !== null) {
    const desired = Math.max(-520, Math.min(520, (mouseX - hookX) * 7));
    hookVX += (desired - hookVX) * Math.min(1, dt * 14);
  } else {
    hookVX *= 0.9 ** (dt * 60);
  }
  hookX += hookVX * dt;
  hookX = Math.max(HOOK_R, Math.min(W - HOOK_R, hookX));

  // ---- profondeur et usure de la ligne ----
  const meters = (scroll * dt) / 10;
  if (state === "descend") {
    depth += meters;
    line -= (meters / 100) * DESCENT_DRAIN;
    if (depth > record) {
      record = Math.floor(depth);
      localStorage.setItem(RECORD_KEY, String(record));
    }
  } else {
    depth -= meters;
    line -= (meters / 100) * TIER_DRAIN[caught?.tier ?? 1];
    if (depth <= 0) {
      endDive(true);
      return;
    }
  }
  if (line <= 0) {
    line = 0;
    burst(hookX, hy, "#ff5c8a", 26);
    shake = 8;
    toast("CRAC. La ligne a lâché 💔");
    endDive(false);
    return;
  }

  // ---- créatures ----
  spawnIn -= dt;
  if (spawnIn <= 0) {
    spawnIn = Math.max(0.3, 0.8 - depth / 4000);
    spawnSwimmer(state === "ascend");
  }

  for (let i = swimmers.length - 1; i >= 0; i--) {
    const s = swimmers[i];
    s.x += s.vx * dt;
    s.y += (state === "descend" ? -scroll : scroll) * dt * 0.9;
    s.y += Math.sin(now * 2 + s.phase) * 18 * dt;
    if (s.y < -80 || s.y > H + 80 || s.x < -90 || s.x > W + 90) {
      swimmers.splice(i, 1);
      continue;
    }
    if (Math.hypot(s.x - hookX, s.y - hy) < s.r + HOOK_R) {
      if (state === "descend") {
        // ferré !
        caught = s.creature;
        swimmers.splice(i, 1);
        burst(hookX, hy, "#ffc93c", 20);
        shake = 5;
        toast(`${s.creature.emoji} ${s.creature.name} — ferré ! Remonte !`);
        state = "ascend";
      } else {
        // collision pendant la remontée : la ligne souffre
        swimmers.splice(i, 1);
        line -= HIT_DRAIN;
        burst(s.x, s.y, "#4cc9f0", 14);
        shake = 6;
        toast(`Aïe, ${s.creature.emoji} ! La ligne fatigue…`);
      }
    }
  }

  // bulles d'ambiance
  if (Math.random() < dt * 8) {
    particles.push({
      x: Math.random() * W,
      y: H + 10,
      vx: (Math.random() - 0.5) * 20,
      vy: -60 - Math.random() * 60,
      life: 1.4,
      color: "rgba(255,255,255,0.5)",
    });
  }
}

function waterColor(): string {
  // de bleu clair à noir abyssal
  const stops: [number, number[]][] = [
    [0, [42, 111, 176]],
    [600, [24, 74, 128]],
    [1400, [16, 42, 84]],
    [2400, [10, 16, 40]],
    [3600, [4, 5, 14]],
  ];
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (depth >= stops[i][0] && depth <= stops[i + 1][0]) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const t = hi[0] === lo[0] ? 0 : Math.min(1, (depth - lo[0]) / (hi[0] - lo[0]));
  const c = lo[1].map((v, i) => Math.round(v + (hi[1][i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function draw(t: number): void {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  ctx.fillStyle = waterColor();
  ctx.fillRect(-20, -20, W + 40, H + 40);

  // rayons de lumière près de la surface
  if (depth < 500) {
    ctx.globalAlpha = 0.14 * (1 - depth / 500);
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 5; i++) {
      const rx = ((i * 293) % W) + Math.sin(t * 0.4 + i) * 30;
      ctx.beginPath();
      ctx.moveTo(rx, -20);
      ctx.lineTo(rx + 70, -20);
      ctx.lineTo(rx - 40, H + 20);
      ctx.lineTo(rx - 110, H + 20);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const s of swimmers) {
    ctx.save();
    ctx.translate(s.x, s.y + Math.sin(t * 2 + s.phase) * 5);
    if (s.vx > 0) ctx.scale(-1, 1); // les emojis nagent vers la gauche par défaut
    ctx.font = `${s.r * 2}px serif`;
    ctx.fillText(s.creature.emoji, 0, 0);
    ctx.restore();
    if (s.creature.tier >= 4) {
      ctx.font = "14px serif";
      ctx.fillText("✨", s.x + s.r + 8, s.y - s.r);
    }
  }

  for (const pa of particles) {
    ctx.globalAlpha = Math.min(1, pa.life * 1.6);
    ctx.fillStyle = pa.color;
    ctx.beginPath();
    ctx.arc(pa.x, pa.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // la ligne et l'hameçon
  if (state !== "surface") {
    const hy = H * HOOK_Y;
    ctx.strokeStyle = line > 30 ? "#fffdf4" : "#ff5c8a";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(hookX - hookVX * 0.06, -10);
    ctx.quadraticCurveTo(hookX - hookVX * 0.1, hy * 0.5, hookX, hy - HOOK_R);
    ctx.stroke();

    ctx.font = `${HOOK_R * 2.2}px serif`;
    ctx.fillText("🪝", hookX, hy);
    if (caught) {
      ctx.font = `${(16 + caught.tier * 3) * 2}px serif`;
      ctx.fillText(caught.emoji, hookX, hy + HOOK_R + 20 + caught.tier * 3);
      if (caught.tier >= 4) {
        ctx.font = "16px serif";
        ctx.fillText("✨", hookX + 30, hy + HOOK_R + 10);
      }
    }

    // halo de lampe dans le noir
    if (depth > 900) {
      const dark = Math.min(0.62, (depth - 900) / 2200);
      const g = ctx.createRadialGradient(hookX, hy, 60, hookX, hy, Math.max(W, H) * 0.7);
      g.addColorStop(0, "rgba(0, 0, 0, 0)");
      g.addColorStop(1, `rgba(0, 0, 5, ${dark})`);
      ctx.fillStyle = g;
      ctx.fillRect(-20, -20, W + 40, H + 40);
    }
  }

  ctx.restore();
}

function updateHud(): void {
  hudDepth.textContent = `${Math.floor(Math.max(0, depth))} m`;
  hudRecord.textContent = `${record} m`;
  barFill.style.width = `${Math.max(0, line)}%`;
  barFill.style.background = line > 50 ? "#1fc7a8" : line > 25 ? "#ffc93c" : "#ff5c8a";
}

canvas.addEventListener("pointermove", (e) => {
  mouseX = e.clientX;
});

canvas.addEventListener("pointerdown", (e) => {
  mouseX = e.clientX;
  if (!bookEl.classList.contains("hidden")) {
    bookEl.classList.add("hidden");
    return;
  }
  if (state === "surface") startDive();
  else if (state === "descend" && !caught) {
    toast("Remontée à vide… courageux 🐔");
    state = "ascend";
  }
});

btnBook.addEventListener("click", () => {
  renderBook();
  bookEl.classList.toggle("hidden");
});

bookEl.addEventListener("click", () => bookEl.classList.add("hidden"));

window.addEventListener("resize", resize);
resize();
renderBook();
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
