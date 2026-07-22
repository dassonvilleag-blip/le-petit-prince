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
const DESCENT_DRAIN = 0.6; // % de ligne par 100 m de descente
const TIER_DRAIN = [0, 0.8, 1.1, 1.4, 1.7, 2.0]; // % par 100 m de remontée, par tier
const HIT_DRAIN = 8; // % par collision à la remontée
const ASCENT_SPEED = 550; // px/s — assez lent pour rendre l'esquive lisible

const RECORD_KEY = "peche-record";
const BOOK_KEY = "peche-bestiaire";
const SHOP_KEY = "peche-boutique";

// valeur de vente par tier ; une première capture vaut double
const VALUE = [0, 3, 8, 18, 40, 100];
const QUIPS = [
  "le poissonnier n'a posé aucune question.",
  "ça finira en sushi douteux.",
  "il sentait bizarre. Tant mieux, ça fait monter le prix.",
  "la science le réclamait, la poêle l'a eu.",
  "vendu à un collectionneur louche.",
  "il a mordu, c'est sa faute.",
  "l'aquarium municipal dit merci.",
];

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
let graceUntil = 0; // invincibilité brève après le ferrage
let bestiaire = new Set<string>();
try {
  bestiaire = new Set(JSON.parse(localStorage.getItem(BOOK_KEY) ?? "[]"));
} catch {
  bestiaire = new Set();
}

// ---- économie et équipement ----

let money = 0;
let upLine = 0; // ligne renforcée : +25 % de solidité par niveau
let upReel = 0; // moulinet turbo : +15 % de vitesse de remontée par niveau
let upWeight = 0; // lest de plomb : +15 % de vitesse de descente par niveau
try {
  const s = JSON.parse(localStorage.getItem(SHOP_KEY) ?? "{}");
  money = s.money ?? 0;
  upLine = s.upLine ?? 0;
  upReel = s.upReel ?? 0;
  upWeight = s.upWeight ?? 0;
} catch {
  /* valeurs par défaut */
}

function saveShop(): void {
  localStorage.setItem(SHOP_KEY, JSON.stringify({ money, upLine, upReel, upWeight }));
}

function lineMax(): number {
  return 100 + upLine * 25;
}

const UPGRADES = [
  { id: "up-line", name: "🧵 Ligne renforcée", get: () => upLine, inc: () => upLine++, price: (l: number) => 20 * 2 ** l },
  { id: "up-reel", name: "🎣 Moulinet turbo", get: () => upReel, inc: () => upReel++, price: (l: number) => 15 * 2 ** l },
  { id: "up-weight", name: "⚓ Lest de plomb", get: () => upWeight, inc: () => upWeight++, price: (l: number) => 15 * 2 ** l },
];
const UP_MAX = 5;

function renderShop(): void {
  const moneyEl = document.getElementById("shop-money");
  if (moneyEl) moneyEl.textContent = String(money);
  for (const u of UPGRADES) {
    const btn = document.getElementById(u.id) as HTMLButtonElement | null;
    if (!btn) continue;
    const lvl = u.get();
    if (lvl >= UP_MAX) {
      btn.textContent = `${u.name} · MAX`;
      btn.disabled = true;
    } else {
      const price = u.price(lvl);
      btn.textContent = `${u.name} ${"▮".repeat(lvl)}${"▯".repeat(UP_MAX - lvl)} — ${price} ⚓`;
      btn.disabled = money < price;
    }
  }
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
  return Math.min(700, 300 + depth * 0.05) * (1 + 0.15 * upWeight);
}

function scrollSpeed(): number {
  return state === "ascend" ? ASCENT_SPEED * (1 + 0.15 * upReel) : descentSpeed();
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
      ? `<span class="emoji">${c.emoji}</span><span>${c.name}<small>${"★".repeat(c.tier)} · ${VALUE[c.tier]} ⚓</small></span>`
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
    const value = VALUE[caught.tier] * (isNew ? 2 : 1);
    money += value;
    saveShop();
    const quip = QUIPS[Math.floor(Math.random() * QUIPS.length)];
    overlayTitle.textContent = `${caught.emoji} ${caught.name} !`;
    overlayText.innerHTML =
      `${"★".repeat(caught.tier)}${isNew ? " — <strong>NOUVEAU</strong> au bestiaire 📖 (prime ×2)" : ""}` +
      `<br />Vendu <strong>${value} ⚓</strong> — ${quip}<br />Clique pour replonger.`;
  } else if (caught) {
    overlayTitle.textContent = "La ligne a cassé 💔";
    overlayText.innerHTML = `${caught.emoji} ${caught.name} est reparti dans les profondeurs…<br />Clique pour replonger.`;
  } else {
    overlayTitle.textContent = "Remonté bredouille";
    overlayText.innerHTML = "Clique pour replonger.";
  }
  caught = null;
  renderShop();
  document.getElementById("shop")!.classList.remove("hidden");
  overlay.classList.remove("hidden");
}

function startDive(): void {
  depth = 0;
  line = lineMax();
  caught = null;
  swimmers = [];
  particles = [];
  spawnIn = 0.4;
  hookX = W / 2;
  hookVX = 0;
  graceUntil = 0;
  state = "descend";
  overlay.classList.add("hidden");
  document.getElementById("shop")!.classList.add("hidden");
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
    // la remontée fait apparaître moins de monde : l'esquive doit rester lisible
    const base = Math.max(0.3, 0.8 - depth / 4000);
    spawnIn = state === "ascend" ? base * 1.7 : base;
    spawnSwimmer(state === "ascend");
  }

  for (let i = swimmers.length - 1; i >= 0; i--) {
    const s = swimmers[i];
    s.x += s.vx * dt;
    // vitesse relative réduite : on a le temps de viser (ou d'esquiver)
    s.y += (state === "descend" ? -scroll * 0.75 : scroll * 0.6) * dt;
    s.y += Math.sin(now * 2 + s.phase) * 18 * dt;
    if (s.y < -80 || s.y > H + 80 || s.x < -90 || s.x > W + 90) {
      swimmers.splice(i, 1);
      continue;
    }
    if (Math.hypot(s.x - hookX, s.y - hy) < s.r * 0.85 + HOOK_R - 3) {
      if (state === "descend") {
        // ferré !
        caught = s.creature;
        swimmers.splice(i, 1);
        burst(hookX, hy, "#ffc93c", 20);
        shake = 5;
        graceUntil = now + 1.5;
        toast(`${s.creature.emoji} ${s.creature.name} — ferré ! Remonte !`);
        state = "ascend";
      } else if (now >= graceUntil) {
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

function waterColorAt(d: number): string {
  // de bleu clair à noir abyssal
  const stops: [number, number[]][] = [
    [0, [42, 111, 176]],
    [600, [24, 74, 128]],
    [1400, [16, 42, 84]],
    [2400, [10, 16, 40]],
    [3600, [4, 5, 14]],
  ];
  const dd = Math.max(0, d);
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (dd >= stops[i][0] && dd <= stops[i + 1][0]) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const t = hi[0] === lo[0] ? 0 : Math.min(1, (dd - lo[0]) / (hi[0] - lo[0]));
  const c = lo[1].map((v, i) => Math.round(v + (hi[1][i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function draw(t: number): void {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  // l'eau : un vrai dégradé selon la profondeur visible à l'écran
  const hyd = H * HOOK_Y;
  const grad = ctx.createLinearGradient(0, -20, 0, H + 20);
  grad.addColorStop(0, waterColorAt(depth - hyd / 10));
  grad.addColorStop(1, waterColorAt(depth + (H - hyd) / 10));
  ctx.fillStyle = grad;
  ctx.fillRect(-20, -20, W + 40, H + 40);

  // marqueurs de profondeur qui défilent : le monde bouge vraiment
  if (state !== "surface") {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "17px 'VT323', monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.lineWidth = 1.5;
    const first = Math.max(250, Math.ceil((depth - hyd / 10) / 250) * 250);
    for (let md = first; md <= depth + (H - hyd) / 10; md += 250) {
      const y = hyd + (md - depth) * 10;
      ctx.setLineDash([10, 14]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(`${md} m`, 12, y - 5);
    }
  }

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
    // les créatures rares brillent dans le noir
    if (s.creature.tier >= 3) {
      const glowR = s.r * (2.2 + 0.25 * Math.sin(t * 3 + s.phase));
      const glow = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, glowR);
      const c = s.creature.tier >= 5 ? "255, 92, 138" : s.creature.tier === 4 ? "255, 201, 60" : "76, 201, 240";
      glow.addColorStop(0, `rgba(${c}, 0.4)`);
      glow.addColorStop(1, `rgba(${c}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(s.x, s.y + Math.sin(t * 2 + s.phase) * 5);
    if (s.vx > 0) ctx.scale(-1, 1); // les emojis nagent vers la gauche par défaut
    ctx.font = `${s.r * 2}px serif`;
    ctx.fillText(s.creature.emoji, 0, 0);
    ctx.restore();
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

    // hameçon (clignote pendant la grâce post-ferrage)
    if (now >= graceUntil || Math.floor(now * 8) % 2 === 0) {
      ctx.font = `${HOOK_R * 2.2}px serif`;
      ctx.fillText("🪝", hookX, hy);
    }
    if (caught) {
      const dangle = Math.sin(t * 4) * 6;
      ctx.font = `${(16 + caught.tier * 3) * 2}px serif`;
      ctx.fillText(caught.emoji, hookX + dangle, hy + HOOK_R + 20 + caught.tier * 3);
      if (caught.tier >= 4) {
        ctx.font = "16px serif";
        ctx.fillText("✨", hookX + dangle + 30, hy + HOOK_R + 10);
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
  const moneyEl = document.getElementById("hud-money");
  if (moneyEl) moneyEl.textContent = String(money);
  const pct = (Math.max(0, line) / lineMax()) * 100;
  barFill.style.width = `${pct}%`;
  barFill.style.background = pct > 50 ? "#1fc7a8" : pct > 25 ? "#ffc93c" : "#ff5c8a";
  const btnUp = document.getElementById("btn-up");
  if (btnUp) btnUp.classList.toggle("hidden", state !== "descend");
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
  // cliquer sert uniquement à plonger : plus de remontée accidentelle
  if (state === "surface") startDive();
});

document.getElementById("btn-up")!.addEventListener("click", () => {
  if (state !== "descend") return;
  toast("Remontée à vide… courageux 🐔");
  state = "ascend";
});

for (const u of UPGRADES) {
  document.getElementById(u.id)!.addEventListener("click", () => {
    const lvl = u.get();
    const price = u.price(lvl);
    if (lvl >= UP_MAX || money < price) return;
    money -= price;
    u.inc();
    saveShop();
    renderShop();
    toast("Équipement amélioré 🛠️");
  });
}

btnBook.addEventListener("click", () => {
  renderBook();
  bookEl.classList.toggle("hidden");
});

bookEl.addEventListener("click", () => bookEl.classList.add("hidden"));

window.addEventListener("resize", resize);
resize();
renderBook();
renderShop();
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
