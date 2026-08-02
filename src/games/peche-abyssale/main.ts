// La pêche abyssale — descends ta ligne, ferre des créatures, remonte-les
// sans casser la ligne. Plus c'est profond, plus c'est bizarre et rare.
// Le cœur du jeu : la cupidité. Chaque prise accrochée alourdit la ligne,
// et c'est toi qui décides quand tu as trop poussé ta chance.

interface Creature {
  id: string;
  emoji: string;
  name: string;
  tier: number; // 1 à 5 — pèse sur la ligne tant qu'elle est accrochée
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
  near: boolean; // frôlé pendant la remontée → prime d'esquive s'il ressort
}

interface Hazard {
  x: number;
  y: number;
  vx: number;
  phase: number;
  r: number;
}

interface Loot {
  x: number;
  y: number;
  vx: number;
  phase: number;
  r: number;
  emoji: string;
  value: number;
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
  { id: "crevette", emoji: "🦐", name: "Crevette body-buildée", tier: 1, minDepth: 60, maxDepth: 500 },
  { id: "crabe", emoji: "🦀", name: "Crabe syndiqué", tier: 1, minDepth: 50, maxDepth: 500 },
  { id: "botte", emoji: "🥾", name: "Botte perdue", tier: 1, minDepth: 0, maxDepth: 600 },
  { id: "calamar", emoji: "🦑", name: "Calamar timide", tier: 2, minDepth: 300, maxDepth: 900 },
  { id: "homard", emoji: "🦞", name: "Homard à monocle", tier: 2, minDepth: 350, maxDepth: 950 },
  { id: "meduse", emoji: "🪼", name: "Méduse disco", tier: 2, minDepth: 300, maxDepth: 900 },
  { id: "fugu", emoji: "🐡", name: "Fugu vexé", tier: 2, minDepth: 350, maxDepth: 1000 },
  { id: "tortue", emoji: "🐢", name: "Tortue en retard", tier: 2, minDepth: 400, maxDepth: 1100 },
  { id: "conque", emoji: "🐚", name: "Conque qui chuchote", tier: 2, minDepth: 500, maxDepth: 1200 },
  { id: "requin", emoji: "🦈", name: "Requin végétarien", tier: 3, minDepth: 800, maxDepth: 1500 },
  { id: "poulpe", emoji: "🐙", name: "Poulpe DJ", tier: 3, minDepth: 800, maxDepth: 1500 },
  { id: "lanterne", emoji: "🏮", name: "Lanterne des abysses", tier: 3, minDepth: 900, maxDepth: 1700 },
  { id: "carpe", emoji: "🎏", name: "Carpe d'apparat", tier: 3, minDepth: 900, maxDepth: 1700 },
  { id: "dauphin", emoji: "🐬", name: "Dauphin incognito", tier: 3, minDepth: 850, maxDepth: 1600 },
  { id: "baleine", emoji: "🐋", name: "Bébé baleine XXL", tier: 4, minDepth: 1400, maxDepth: 2300 },
  { id: "ancre", emoji: "⚓", name: "Ancre hantée", tier: 4, minDepth: 1400, maxDepth: 2400 },
  { id: "moai", emoji: "🗿", name: "Moaï englouti", tier: 4, minDepth: 1500, maxDepth: 2500 },
  { id: "sirene", emoji: "🧜", name: "Sirène sceptique", tier: 4, minDepth: 1500, maxDepth: 2500 },
  { id: "fossile", emoji: "🦴", name: "Poisson d'avant", tier: 4, minDepth: 1500, maxDepth: 2500 },
  { id: "dragon", emoji: "🐉", name: "Dragon des fosses", tier: 5, minDepth: 2200, maxDepth: 99_999 },
  { id: "oeil", emoji: "👁️", name: "Le Regardeur", tier: 5, minDepth: 2300, maxDepth: 99_999 },
  { id: "ovni", emoji: "🛸", name: "OVNI aquatique", tier: 5, minDepth: 2400, maxDepth: 99_999 },
  { id: "couronne", emoji: "👑", name: "Couronne du roi noyé", tier: 5, minDepth: 2500, maxDepth: 99_999 },
  { id: "chaussette", emoji: "🧦", name: "La Chaussette originelle", tier: 5, minDepth: 2600, maxDepth: 99_999 },
];

// zones nommées : traverser une frontière l'annonce en grand
const ZONES: [number, string][] = [
  [0, "Les Eaux Claires"],
  [600, "La Zone Crépusculaire"],
  [1400, "Minuit Perpétuel"],
  [2400, "La Fosse Hurlante"],
  [3600, "L'Origine"],
];

const HOOK_R = 13;
const HOOK_Y = 0.45; // fraction de l'écran
const DESCENT_DRAIN = 0.6; // % de ligne par 100 m de descente, à vide
const CARRY_DRAIN = 0.2; // % par 100 m et par étoile de prise accrochée (descente)
const ASCENT_BASE_DRAIN = 0.5; // % par 100 m de remontée, à vide
const ASCENT_TIER_DRAIN = 0.35; // % par 100 m et par étoile accrochée
const HIT_DRAIN = 8; // % par collision de créature à la remontée
const MINE_DRAIN = 14; // % par mine, dans les deux sens
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
const hudSlots = document.getElementById("hud-slots")!;
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
let caught: Creature[] = [];
let hookX = 0;
let hookVX = 0;
let mouseX: number | null = null;
let swimmers: Swimmer[] = [];
let hazards: Hazard[] = [];
let loots: Loot[] = [];
let particles: Particle[] = [];
let spawnIn = 0;
let hazardIn = 0;
let lootIn = 0;
let shake = 0;
let now = 0;
let graceUntil = 0; // invincibilité brève après ferrage ET après chaque choc
let zoneBanner: { name: string; until: number } | null = null;
let lastZone = 0;

// stats de la plongée en cours, pour le récap de fin
let runTreasure = 0;
let runDodges = 0;

// petits chiffres flottants : chaque perte ou gain est visible et chiffré
interface Floater {
  x: number;
  y: number;
  txt: string;
  life: number;
  color?: string;
}
let floaters: Floater[] = [];
let bestiaire = new Set<string>();
try {
  bestiaire = new Set(JSON.parse(localStorage.getItem(BOOK_KEY) ?? "[]"));
} catch {
  bestiaire = new Set();
}

// ---- économie et équipement ----

interface Order {
  id: string; // creature id
  qty: number;
  got: number;
  reward: number;
}

let money = 0;
let upLine = 0; // ligne renforcée : +25 % de solidité par niveau
let upReel = 0; // moulinet turbo : +15 % de vitesse de remontée par niveau
let upWeight = 0; // lest de plomb : +15 % de vitesse de descente par niveau
let upHooks = 0; // viviers : +1 prise simultanée par niveau
let upLamp = 0; // lampe : repousse le noir des abysses
let upMagnet = 0; // aimant : attire les trésors
let knot = false; // nœud de secours : consommable, sauve UNE casse avec une prise
let knotUsed = false;
let orders: Order[] = [];
try {
  const s = JSON.parse(localStorage.getItem(SHOP_KEY) ?? "{}");
  money = s.money ?? 0;
  upLine = s.upLine ?? 0;
  upReel = s.upReel ?? 0;
  upWeight = s.upWeight ?? 0;
  upHooks = s.upHooks ?? 0;
  upLamp = s.upLamp ?? 0;
  upMagnet = s.upMagnet ?? 0;
  knot = s.knot ?? false;
  orders = Array.isArray(s.orders) ? s.orders : [];
} catch {
  /* valeurs par défaut */
}

function saveShop(): void {
  localStorage.setItem(
    SHOP_KEY,
    JSON.stringify({ money, upLine, upReel, upWeight, upHooks, upLamp, upMagnet, knot, orders }),
  );
}

function lineMax(): number {
  return 100 + upLine * 25;
}

function capacity(): number {
  return 1 + upHooks;
}

const UPGRADES = [
  { id: "up-line", name: "🧵 Ligne renforcée", max: 5, get: () => upLine, inc: () => upLine++, price: (l: number) => 20 * 2 ** l },
  { id: "up-reel", name: "🎣 Moulinet turbo", max: 5, get: () => upReel, inc: () => upReel++, price: (l: number) => 15 * 2 ** l },
  { id: "up-weight", name: "⚓ Lest de plomb", max: 5, get: () => upWeight, inc: () => upWeight++, price: (l: number) => 15 * 2 ** l },
  { id: "up-hooks", name: "🪝 Viviers (+1 prise)", max: 2, get: () => upHooks, inc: () => upHooks++, price: (l: number) => 60 * 3 ** l },
  { id: "up-lamp", name: "🔦 Lampe abyssale", max: 3, get: () => upLamp, inc: () => upLamp++, price: (l: number) => 30 * 2 ** l },
  { id: "up-magnet", name: "🧲 Aimant à trésors", max: 3, get: () => upMagnet, inc: () => upMagnet++, price: (l: number) => 25 * 2 ** l },
];

// ---- commandes du poissonnier : des objectifs qui donnent un cap ----

function newOrder(): Order {
  // cible raisonnable : tiers 1 à 4, pondérés vers le bas
  const pool = CREATURES.filter((c) => c.tier <= 4);
  const weighted = pool.flatMap((c) => Array(5 - c.tier).fill(c) as Creature[]);
  const c = weighted[Math.floor(Math.random() * weighted.length)];
  const qty = c.tier >= 3 ? 1 : 2;
  return { id: c.id, qty, got: 0, reward: Math.ceil(VALUE[c.tier] * qty * 0.9) };
}

function ensureOrders(): void {
  while (orders.length < 2) orders.push(newOrder());
}

function renderOrders(): void {
  const el = document.getElementById("orders");
  if (!el) return;
  ensureOrders();
  el.innerHTML =
    '<p class="shop-title">📜 Commandes du poissonnier</p>' +
    orders
      .map((o) => {
        const c = CREATURES.find((cr) => cr.id === o.id)!;
        return `<div class="order-line">${c.emoji} ${c.name} — ${o.got}/${o.qty} <span class="order-reward">prime ${o.reward} ⚓</span></div>`;
      })
      .join("");
}

// vendre des prises fait avancer les commandes ; primes en cascade possibles
function creditOrders(sold: Creature[]): string[] {
  const lines: string[] = [];
  for (const c of sold) {
    const o = orders.find((ord) => ord.id === c.id && ord.got < ord.qty);
    if (!o) continue;
    o.got++;
    if (o.got >= o.qty) {
      money += o.reward;
      lines.push(`📜 Commande honorée : ${c.emoji} ×${o.qty} — prime <strong>${o.reward} ⚓</strong>`);
      orders.splice(orders.indexOf(o), 1);
    }
  }
  ensureOrders();
  return lines;
}

function renderShop(): void {
  const moneyEl = document.getElementById("shop-money");
  if (moneyEl) moneyEl.textContent = String(money);
  for (const u of UPGRADES) {
    const btn = document.getElementById(u.id) as HTMLButtonElement | null;
    if (!btn) continue;
    const lvl = u.get();
    if (lvl >= u.max) {
      btn.textContent = `${u.name} · MAX`;
      btn.disabled = true;
    } else {
      const price = u.price(lvl);
      btn.textContent = `${u.name} ${"▮".repeat(lvl)}${"▯".repeat(u.max - lvl)} — ${price} ⚓`;
      btn.disabled = money < price;
    }
  }
  const knotBtn = document.getElementById("up-knot") as HTMLButtonElement | null;
  if (knotBtn) {
    if (knot) {
      knotBtn.textContent = "🪢 Nœud de secours · prêt ✓";
      knotBtn.disabled = true;
    } else {
      knotBtn.textContent = "🪢 Nœud de secours (sauve 1 casse) — 40 ⚓";
      knotBtn.disabled = money < 40;
    }
  }
  renderOrders();
}

let toastTimer = 0;
function toast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2400);
}

// ---- sons : petit synthé WebAudio, zéro fichier ----

let ac: AudioContext | null = null;
let sfxGain: GainNode | null = null;
let droneOsc: OscillatorNode | null = null;
let droneGain: GainNode | null = null;
let soundOn = localStorage.getItem("peche-son") !== "off";

function ensureAudio(): void {
  if (ac || !soundOn) return;
  ac = new AudioContext();
  sfxGain = ac.createGain();
  sfxGain.gain.value = 0.5;
  sfxGain.connect(ac.destination);
  // nappe des profondeurs : plus on descend, plus elle est grave et présente
  droneOsc = ac.createOscillator();
  droneOsc.type = "sine";
  droneOsc.frequency.value = 70;
  droneGain = ac.createGain();
  droneGain.gain.value = 0;
  droneOsc.connect(droneGain).connect(ac.destination);
  droneOsc.start();
}

function blip(freq: number, dur: number, gain: number, type: OscillatorType = "sine", slideTo = 0): void {
  if (!ac || !sfxGain || !soundOn) return;
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, ac.currentTime);
  if (slideTo > 0) o.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  o.connect(g).connect(sfxGain);
  o.start();
  o.stop(ac.currentTime + dur + 0.05);
}

function noiseBurst(dur: number, gain: number, filterHz: number): void {
  if (!ac || !sfxGain || !soundOn) return;
  const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = filterHz;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(sfxGain);
  src.start();
}

const sfx = {
  splash: () => noiseBurst(0.35, 0.35, 900),
  catch: (tier: number) => {
    blip(300 + tier * 60, 0.12, 0.25, "square", 600 + tier * 120);
    blip(600 + tier * 120, 0.2, 0.2, "triangle", 900 + tier * 150);
  },
  hit: () => {
    noiseBurst(0.12, 0.3, 500);
    blip(160, 0.15, 0.25, "sawtooth");
  },
  mine: () => {
    noiseBurst(0.3, 0.45, 300);
    blip(90, 0.3, 0.3, "sawtooth");
  },
  break: () => {
    noiseBurst(0.5, 0.5, 600);
    blip(400, 0.4, 0.3, "sawtooth", 60);
  },
  coin: () => {
    blip(880, 0.09, 0.2, "square");
    window.setTimeout(() => blip(1320, 0.14, 0.2, "square"), 70);
  },
  dodge: () => blip(1200, 0.08, 0.12, "sine", 1800),
  zone: () => {
    blip(140, 0.9, 0.25, "sine", 70);
    blip(210, 0.9, 0.15, "sine", 105);
  },
  sell: () => {
    [660, 830, 990, 1320].forEach((f, i) => window.setTimeout(() => blip(f, 0.12, 0.18, "square"), i * 90));
  },
};

function updateDrone(): void {
  if (!ac || !droneGain || !droneOsc) return;
  const target = state === "surface" || !soundOn ? 0 : Math.min(0.12, (depth / 3500) * 0.12);
  droneGain.gain.setTargetAtTime(target, ac.currentTime, 0.4);
  droneOsc.frequency.setTargetAtTime(70 - Math.min(38, depth / 100), ac.currentTime, 0.6);
}

let paused = false;

// changer d'onglet en pleine plongée : pause automatique
function autoPause(): void {
  if (state !== "surface") paused = true;
}
window.addEventListener("blur", autoPause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) autoPause();
});
window.addEventListener("keydown", (e) => {
  if ((e.code === "Escape" || e.code === "KeyP") && state !== "surface") paused = !paused;
});

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
    near: false,
  });
}

function spawnHazard(fromTop: boolean): void {
  const fromLeft = Math.random() < 0.5;
  hazards.push({
    x: fromLeft ? -40 : W + 40,
    y: fromTop ? -40 : H + 40,
    vx: (fromLeft ? 1 : -1) * (20 + Math.random() * 40),
    phase: Math.random() * Math.PI * 2,
    r: 17,
  });
}

function spawnLoot(fromTop: boolean): void {
  const gem = depth > 1200 && Math.random() < 0.4;
  const fromLeft = Math.random() < 0.5;
  loots.push({
    x: fromLeft ? -40 : W + 40,
    y: fromTop ? -40 : H + 40,
    vx: (fromLeft ? 1 : -1) * (25 + Math.random() * 35),
    phase: Math.random() * Math.PI * 2,
    r: 15,
    emoji: gem ? "💎" : "💰",
    value: gem ? 25 : 8,
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
  hazards = [];
  loots = [];
  updateDrone();
  const extras: string[] = [];
  if (runTreasure > 0) extras.push(`💰 Trésors repêchés : <strong>${runTreasure} ⚓</strong>`);
  if (runDodges > 0) extras.push(`🌀 Esquives parfaites : ${runDodges} (+${runDodges} ⚓)`);

  if (success && caught.length > 0) {
    let total = 0;
    const lines = caught.map((c) => {
      const isNew = !bestiaire.has(c.id);
      bestiaire.add(c.id);
      const value = VALUE[c.tier] * (isNew ? 2 : 1);
      total += value;
      return `${c.emoji} ${c.name} ${"★".repeat(c.tier)} — <strong>${value} ⚓</strong>${isNew ? " <strong>NOUVEAU ×2</strong> 📖" : ""}`;
    });
    money += total;
    const orderLines = creditOrders(caught);
    saveBook();
    renderBook();
    saveShop();
    sfx.sell();
    const quip = QUIPS[Math.floor(Math.random() * QUIPS.length)];
    overlayTitle.textContent = caught.length > 1 ? `${caught.length} prises au port !` : `${caught[0].emoji} ${caught[0].name} !`;
    overlayText.innerHTML =
      lines.join("<br />") +
      `<br />— ${quip}` +
      (orderLines.length ? `<br />${orderLines.join("<br />")}` : "") +
      (extras.length ? `<br />${extras.join("<br />")}` : "") +
      "<br />Clique pour replonger.";
  } else if (caught.length > 0) {
    sfx.break();
    overlayTitle.textContent = "La ligne a cassé 💔";
    overlayText.innerHTML =
      `${caught.map((c) => c.emoji).join(" ")} — ${caught.length > 1 ? "toutes tes prises sont reparties" : "ta prise est repartie"} dans les profondeurs…` +
      (extras.length ? `<br />${extras.join("<br />")} (ça, c'est gardé)` : "") +
      "<br />Clique pour replonger.";
  } else {
    overlayTitle.textContent = "Remonté bredouille";
    overlayText.innerHTML = (extras.length ? `${extras.join("<br />")}<br />` : "") + "Clique pour replonger.";
  }
  caught = [];
  saveShop();
  renderShop();
  document.getElementById("shop")!.classList.remove("hidden");
  overlay.classList.remove("hidden");
}

function startDive(): void {
  ensureAudio();
  depth = 0;
  line = lineMax();
  caught = [];
  swimmers = [];
  hazards = [];
  loots = [];
  particles = [];
  spawnIn = 0.4;
  hazardIn = 3;
  lootIn = 5;
  hookX = W / 2;
  hookVX = 0;
  graceUntil = 0;
  knotUsed = false;
  floaters = [];
  runTreasure = 0;
  runDodges = 0;
  lastZone = 0;
  zoneBanner = null;
  state = "descend";
  sfx.splash();
  overlay.classList.add("hidden");
  document.getElementById("shop")!.classList.add("hidden");
}

function carriedStars(): number {
  return caught.reduce((sum, c) => sum + c.tier, 0);
}

function loseLine(amount: number, x: number, y: number, isMine: boolean): void {
  line -= amount;
  graceUntil = now + 1.2;
  floaters.push({ x, y: y - 20, txt: `-${amount} 🧵`, life: 1.4 });
  burst(x, y, isMine ? "#ff8c42" : "#4cc9f0", isMine ? 22 : 14);
  shake = isMine ? 9 : 6;
  if (isMine) sfx.mine();
  else sfx.hit();
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

  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.life -= dt;
    f.y -= 42 * dt;
    if (f.life <= 0) floaters.splice(i, 1);
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
    // descendre en portant des prises coûte cher : c'est le prix de la cupidité
    line -= (meters / 100) * (DESCENT_DRAIN + carriedStars() * CARRY_DRAIN);
    if (depth > record) {
      record = Math.floor(depth);
      localStorage.setItem(RECORD_KEY, String(record));
    }
    // bannière de zone
    for (const [zDepth, zName] of ZONES) {
      if (zDepth > lastZone && depth >= zDepth) {
        lastZone = zDepth;
        if (zDepth > 0) {
          zoneBanner = { name: zName, until: now + 2.8 };
          sfx.zone();
        }
      }
    }
  } else {
    depth -= meters;
    line -= (meters / 100) * (ASCENT_BASE_DRAIN + carriedStars() * ASCENT_TIER_DRAIN);
    if (depth <= 0) {
      endDive(true);
      return;
    }
  }
  updateDrone();
  if (line <= 0) {
    if (state === "ascend" && caught.length > 0 && knot && !knotUsed) {
      // le nœud de secours sauve UNE casse par plongée (consommable)
      knot = false;
      knotUsed = true;
      saveShop();
      line = 12;
      graceUntil = now + 3;
      shake = 8;
      floaters.push({ x: hookX, y: hy - 34, txt: "🪢 le nœud tient !", life: 2 });
      toast("🪢 Le nœud de secours tient bon ! Fonce !");
    } else {
      line = 0;
      burst(hookX, hy, "#ff5c8a", 26);
      shake = 8;
      toast("CRAC. La ligne a lâché 💔");
      endDive(false);
      return;
    }
  }

  // ---- apparitions ----
  spawnIn -= dt;
  if (spawnIn <= 0) {
    // la remontée fait apparaître moins de monde : l'esquive doit rester lisible
    const base = Math.max(0.3, 0.8 - depth / 4000);
    spawnIn = state === "ascend" ? base * 1.7 : base;
    spawnSwimmer(state === "ascend");
  }
  if (depth > 350) {
    hazardIn -= dt;
    if (hazardIn <= 0) {
      hazardIn = Math.max(1.6, 4.5 - depth / 1200);
      spawnHazard(state === "ascend");
    }
  }
  lootIn -= dt;
  if (lootIn <= 0) {
    lootIn = 4 + Math.random() * 5;
    spawnLoot(state === "ascend");
  }

  // ---- créatures ----
  for (let i = swimmers.length - 1; i >= 0; i--) {
    const s = swimmers[i];
    s.x += s.vx * dt;
    // vitesse relative réduite : on a le temps de viser (ou d'esquiver)
    s.y += (state === "descend" ? -scroll * 0.75 : scroll * 0.6) * dt;
    s.y += Math.sin(now * 2 + s.phase) * 18 * dt;
    if (s.y < -80 || s.y > H + 80 || s.x < -90 || s.x > W + 90) {
      // frôlée sans la toucher pendant la remontée : prime d'esquive
      if (s.near && state === "ascend") {
        runDodges++;
        money++;
        floaters.push({ x: Math.max(30, Math.min(W - 30, s.x)), y: Math.max(30, s.y), txt: "esquive ! +1 ⚓", life: 1.2, color: "#1fc7a8" });
        sfx.dodge();
      }
      swimmers.splice(i, 1);
      continue;
    }
    const dist = Math.hypot(s.x - hookX, s.y - hy);
    if (state === "ascend" && dist < s.r + HOOK_R + 30) s.near = true;
    if (dist < s.r * 0.85 + HOOK_R - 3) {
      if (state === "descend" && now >= graceUntil) {
        // ferré !
        caught.push(s.creature);
        swimmers.splice(i, 1);
        burst(hookX, hy, "#ffc93c", 20);
        shake = 5;
        graceUntil = now + 1.5;
        sfx.catch(s.creature.tier);
        if (caught.length >= capacity()) {
          toast(`${s.creature.emoji} ferré ! Viviers pleins — remonte !`);
          state = "ascend";
        } else {
          toast(`${s.creature.emoji} ${s.creature.name} — ferré ! (${caught.length}/${capacity()})`);
        }
      } else if (state === "ascend" && now >= graceUntil) {
        // collision pendant la remontée : la ligne souffre, puis 1,2 s
        // d'invincibilité — un banc groupé ne compte plus qu'une touche
        swimmers.splice(i, 1);
        loseLine(HIT_DRAIN, s.x, s.y, false);
        toast(`Aïe, ${s.creature.emoji} ! La ligne fatigue…`);
      }
    }
  }

  // ---- mines : dangereuses dans les deux sens ----
  for (let i = hazards.length - 1; i >= 0; i--) {
    const hz = hazards[i];
    hz.x += hz.vx * dt;
    hz.y += (state === "descend" ? -scroll * 0.75 : scroll * 0.6) * dt;
    hz.y += Math.sin(now * 1.6 + hz.phase) * 12 * dt;
    if (hz.y < -80 || hz.y > H + 80 || hz.x < -90 || hz.x > W + 90) {
      hazards.splice(i, 1);
      continue;
    }
    if (now >= graceUntil && Math.hypot(hz.x - hookX, hz.y - hy) < hz.r + HOOK_R - 3) {
      hazards.splice(i, 1);
      loseLine(MINE_DRAIN, hz.x, hz.y, true);
      toast("💣 BOUM ! La ligne a morflé !");
    }
  }

  // ---- trésors : à attraper, l'aimant aide ----
  for (let i = loots.length - 1; i >= 0; i--) {
    const lo = loots[i];
    lo.x += lo.vx * dt;
    lo.y += (state === "descend" ? -scroll * 0.7 : scroll * 0.55) * dt;
    lo.y += Math.sin(now * 1.8 + lo.phase) * 10 * dt;
    if (upMagnet > 0) {
      const dx = hookX - lo.x;
      const dy = hy - lo.y;
      const d = Math.hypot(dx, dy);
      const range = 70 + upMagnet * 70;
      if (d < range && d > 1) {
        const pull = (1 - d / range) * (140 + upMagnet * 60);
        lo.x += (dx / d) * pull * dt;
        lo.y += (dy / d) * pull * dt;
      }
    }
    if (lo.y < -80 || lo.y > H + 80 || lo.x < -90 || lo.x > W + 90) {
      loots.splice(i, 1);
      continue;
    }
    if (Math.hypot(lo.x - hookX, lo.y - hy) < lo.r + HOOK_R) {
      loots.splice(i, 1);
      money += lo.value;
      runTreasure += lo.value;
      floaters.push({ x: lo.x, y: lo.y - 18, txt: `+${lo.value} ⚓`, life: 1.4, color: "#ffc93c" });
      burst(lo.x, lo.y, "#ffc93c", 12);
      sfx.coin();
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

  // mines : lueur rouge qui pulse, on les voit venir
  for (const hz of hazards) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 5 + hz.phase);
    const glow = ctx.createRadialGradient(hz.x, hz.y, 2, hz.x, hz.y, hz.r * 2.4);
    glow.addColorStop(0, `rgba(255, 92, 60, ${0.35 + pulse * 0.2})`);
    glow.addColorStop(1, "rgba(255, 92, 60, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(hz.x, hz.y, hz.r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `${hz.r * 2}px serif`;
    ctx.fillText("💣", hz.x, hz.y + Math.sin(t * 1.6 + hz.phase) * 4);
  }

  // trésors : scintillement doré
  for (const lo of loots) {
    const glow = ctx.createRadialGradient(lo.x, lo.y, 2, lo.x, lo.y, lo.r * 2);
    glow.addColorStop(0, "rgba(255, 201, 60, 0.35)");
    glow.addColorStop(1, "rgba(255, 201, 60, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lo.x, lo.y, lo.r * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `${lo.r * 2}px serif`;
    ctx.fillText(lo.emoji, lo.x, lo.y + Math.sin(t * 1.8 + lo.phase) * 4);
  }

  for (const pa of particles) {
    ctx.globalAlpha = Math.min(1, pa.life * 1.6);
    ctx.fillStyle = pa.color;
    ctx.beginPath();
    ctx.arc(pa.x, pa.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // dégâts et gains chiffrés : plus jamais de « la ligne a cassé toute seule »
  for (const f of floaters) {
    ctx.globalAlpha = Math.min(1, f.life * 1.5);
    ctx.font = "22px 'VT323', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "#17171b";
    ctx.lineWidth = 3;
    ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillStyle = f.color ?? "#ff5c8a";
    ctx.fillText(f.txt, f.x, f.y);
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
    // les prises pendent en chapelet sous l'hameçon
    for (let i = 0; i < caught.length; i++) {
      const c = caught[i];
      const dangle = Math.sin(t * 4 + i * 1.3) * (6 + i * 2);
      ctx.font = `${(14 + c.tier * 3) * 2}px serif`;
      ctx.fillText(c.emoji, hookX + dangle, hy + HOOK_R + 20 + i * 34 + c.tier * 2);
      if (c.tier >= 4) {
        ctx.font = "16px serif";
        ctx.fillText("✨", hookX + dangle + 30, hy + HOOK_R + 10 + i * 34);
      }
    }

    // halo de lampe dans le noir — la lampe abyssale le repousse
    const darkStart = 900 + upLamp * 350;
    if (depth > darkStart) {
      const dark = Math.min(0.62 - upLamp * 0.08, (depth - darkStart) / 2200);
      if (dark > 0) {
        const radius = Math.max(W, H) * (0.7 + upLamp * 0.12);
        const g = ctx.createRadialGradient(hookX, hy, 60 + upLamp * 40, hookX, hy, radius);
        g.addColorStop(0, "rgba(0, 0, 0, 0)");
        g.addColorStop(1, `rgba(0, 0, 5, ${dark})`);
        ctx.fillStyle = g;
        ctx.fillRect(-20, -20, W + 40, H + 40);
      }
    }

    // bannière de zone
    if (zoneBanner && now < zoneBanner.until) {
      const a = Math.min(1, (zoneBanner.until - now) / 0.6, (now - (zoneBanner.until - 2.8)) * 2);
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = "bold 40px 'Pixelify Sans', monospace";
      ctx.textAlign = "center";
      ctx.strokeStyle = "#17171b";
      ctx.lineWidth = 5;
      ctx.strokeText(zoneBanner.name, W / 2, H * 0.24);
      ctx.fillStyle = "#fffdf4";
      ctx.fillText(zoneBanner.name, W / 2, H * 0.24);
      ctx.globalAlpha = 1;
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
  hudSlots.textContent =
    state === "surface" ? "" : caught.map((c) => c.emoji).join("") + "▯".repeat(Math.max(0, capacity() - caught.length));
  const btnUp = document.getElementById("btn-up");
  if (btnUp) btnUp.classList.toggle("hidden", state !== "descend");
}

canvas.addEventListener("pointermove", (e) => {
  mouseX = e.clientX;
});

canvas.addEventListener("pointerdown", (e) => {
  mouseX = e.clientX;
  ensureAudio();
  if (paused) {
    paused = false;
    return;
  }
  if (!bookEl.classList.contains("hidden")) {
    bookEl.classList.add("hidden");
    return;
  }
  // cliquer sert uniquement à plonger : plus de remontée accidentelle
  if (state === "surface") startDive();
});

// au tactile, lever le doigt ne doit pas laisser l'hameçon viser l'ancienne
// position : on coupe le suivi (l'amorti ramène la vitesse à zéro)
canvas.addEventListener("pointerup", (e) => {
  if (e.pointerType === "touch") mouseX = null;
});
canvas.addEventListener("pointercancel", () => {
  mouseX = null;
});

document.getElementById("btn-up")!.addEventListener("click", () => {
  if (state !== "descend") return;
  if (caught.length === 0) toast("Remontée à vide… courageux 🐔");
  else toast(`Remontée avec ${caught.length} prise${caught.length > 1 ? "s" : ""} — tiens bon !`);
  state = "ascend";
});

for (const u of UPGRADES) {
  document.getElementById(u.id)?.addEventListener("click", () => {
    const lvl = u.get();
    const price = u.price(lvl);
    if (lvl >= u.max || money < price) return;
    money -= price;
    u.inc();
    saveShop();
    renderShop();
    sfx.coin();
    toast("Équipement amélioré 🛠️");
  });
}

document.getElementById("up-knot")!.addEventListener("click", () => {
  if (knot || money < 40) return;
  money -= 40;
  knot = true;
  saveShop();
  renderShop();
  sfx.coin();
  toast("🪢 Nœud acheté — il sauvera ta prochaine casse");
});

const btnSound = document.getElementById("btn-sound");
function renderSound(): void {
  if (btnSound) btnSound.textContent = soundOn ? "🔊" : "🔇";
}
btnSound?.addEventListener("click", () => {
  soundOn = !soundOn;
  localStorage.setItem("peche-son", soundOn ? "on" : "off");
  if (soundOn) ensureAudio();
  renderSound();
  updateDrone();
});
renderSound();

btnBook.addEventListener("click", () => {
  renderBook();
  bookEl.classList.toggle("hidden");
});

bookEl.addEventListener("click", () => bookEl.classList.add("hidden"));

window.addEventListener("resize", resize);
resize();
ensureOrders();
saveShop();
renderBook();
renderShop();
updateHud();

let last = 0;
function drawPause(): void {
  ctx.fillStyle = "rgba(6, 10, 24, 0.62)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fffdf4";
  ctx.font = "bold 46px 'Pixelify Sans', monospace";
  ctx.fillText("⏸ PAUSE", W / 2, H / 2 - 24);
  ctx.font = "24px 'VT323', monospace";
  ctx.fillText("clique ou appuie sur P pour reprendre", W / 2, H / 2 + 22);
}

function frame(nowMs: number): void {
  const t = nowMs / 1000;
  const dt = Math.min(0.05, Math.max(0, t - last));
  last = t;
  if (!paused) {
    now = t;
    step(dt);
  }
  draw(t);
  if (paused) drawPause();
  updateHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export {};
