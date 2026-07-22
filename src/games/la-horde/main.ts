// La Horde de Minuit — roguelike de survie : tiens de minuit (0:00) à
// l'aube (10:00) contre des vagues de cauchemars. Gemmes à ramasser,
// montée de niveau avec choix d'armes/pouvoirs, bestiaire persistant.

// ---------- données ----------

interface EnemyType {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  hp: number;
  speed: number;
  dmg: number;
  xp: number;
  r: number;
  minT: number; // seconde d'apparition dans la nuit
}

const ENEMY_TYPES: EnemyType[] = [
  { id: "rat", emoji: "🐀", name: "Rat de gouttière", desc: "Il court, il court, il mord.", hp: 3, speed: 72, dmg: 8, xp: 1, r: 13, minT: 0 },
  { id: "bat", emoji: "🦇", name: "Chauve-sourite", desc: "Vole en zigzag pour t'énerver.", hp: 2, speed: 108, dmg: 6, xp: 1, r: 12, minT: 45 },
  { id: "zombie", emoji: "🧟", name: "Zombron", desc: "Lent, coriace, très motivé.", hp: 9, speed: 42, dmg: 16, xp: 2, r: 16, minT: 100 },
  { id: "snake", emoji: "🐍", name: "Vipère express", desc: "Fonce par à-coups vicieux.", hp: 5, speed: 60, dmg: 12, xp: 2, r: 14, minT: 165 },
  { id: "ghost", emoji: "👻", name: "Fantômiette", desc: "À moitié là, entièrement pénible.", hp: 5, speed: 92, dmg: 10, xp: 2, r: 14, minT: 235 },
  { id: "pumpkin", emoji: "🎃", name: "Citrouillard", desc: "Explose de rage à sa mort.", hp: 13, speed: 55, dmg: 14, xp: 3, r: 16, minT: 310 },
  { id: "troll", emoji: "🧌", name: "Troll des ronces", desc: "Un mur avec des jambes.", hp: 30, speed: 34, dmg: 24, xp: 5, r: 20, minT: 390 },
  { id: "shadow", emoji: "🌑", name: "Ombre affamée", desc: "La nuit elle-même a faim.", hp: 16, speed: 96, dmg: 18, xp: 4, r: 15, minT: 470 },
];

interface WeaponDef {
  id: string;
  emoji: string;
  name: string;
  desc: string;
}

const WEAPONS: WeaponDef[] = [
  { id: "blades", emoji: "🗡️", name: "Lames orbitales", desc: "Des lames tournent autour de toi." },
  { id: "boomer", emoji: "🪃", name: "Boomerang", desc: "Part, traverse tout, revient." },
  { id: "garlic", emoji: "🧄", name: "Aura d'ail", desc: "Zone piquante autour de toi." },
  { id: "bolt", emoji: "⚡", name: "Éclair en chaîne", desc: "Saute de cauchemar en cauchemar." },
  { id: "bees", emoji: "🐝", name: "Abeilles gardiennes", desc: "Elles chassent toutes seules." },
  { id: "bubble", emoji: "🫧", name: "Canon à bulles", desc: "Perce et repousse la horde." },
];

const PASSIVES: WeaponDef[] = [
  { id: "hp", emoji: "❤️", name: "Gros cœur", desc: "+20 % de vie max, soigne 30." },
  { id: "boots", emoji: "👟", name: "Bottes véloces", desc: "+8 % de vitesse." },
  { id: "magnet", emoji: "🧲", name: "Aimant à gemmes", desc: "+35 % de portée de ramassage." },
  { id: "clover", emoji: "🍀", name: "Trèfle chanceux", desc: "+15 % d'expérience." },
  { id: "fist", emoji: "💪", name: "Poigne de fer", desc: "+15 % de dégâts." },
];

const DAWN = 600; // 10 minutes
const MAX_WEAPONS = 4;
const LVL_MAX = 5;
const BOOK_KEY = "horde-bestiaire";
const RECORD_KEY = "horde-record";

// ---------- DOM ----------

const canvas = document.getElementById("arena") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const hud = document.getElementById("hud")!;
const hudTime = document.getElementById("hud-time")!;
const hudLevel = document.getElementById("hud-level")!;
const hudKills = document.getElementById("hud-kills")!;
const hudWeapons = document.getElementById("hud-weapons")!;
const hpFill = document.getElementById("hp-fill") as HTMLElement;
const xpFill = document.getElementById("xp-fill") as HTMLElement;
const overlay = document.getElementById("overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayText = document.getElementById("overlay-text")!;
const choicesEl = document.getElementById("choices")!;
const choiceBtns = document.getElementById("choice-btns")!;
const bookEl = document.getElementById("book")!;
const bookGrid = document.getElementById("book-grid")!;
const bookCount = document.getElementById("book-count")!;
const toastEl = document.getElementById("toast")!;

let toastTimer = 0;
function toast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2200);
}

// ---------- état ----------

type State = "menu" | "play" | "choose" | "dead";
let state: State = "menu";

let W = 0;
let H = 0;

// texture de sol générée (Higgsfield) ; repli sur l'aplat si absente
const groundTex = new Image();
let groundPattern: CanvasPattern | null = null;
groundTex.onload = () => {
  groundPattern = ctx.createPattern(groundTex, "repeat");
};
groundTex.src = "/textures/horde-sol.webp";

// arène procédurale : des obstacles thématiques, une nouvelle carte par nuit
interface Obstacle {
  x: number;
  y: number;
  r: number;
  emoji: string;
}
let obstacles: Obstacle[] = [];
let night = 1;
const THEMES = [
  ["🪦", "🌲", "🗿"],
  ["🌲", "🍄", "🪵"],
  ["🏛️", "🗿", "⚱️"],
  ["🧊", "⛄", "❄️"],
];

function genObstacles(): void {
  obstacles = [];
  const theme = THEMES[(night - 1) % THEMES.length];
  const count = 9 + Math.floor(Math.random() * 5);
  let guard = 0;
  while (obstacles.length < count && guard++ < 300) {
    const o = {
      x: 60 + Math.random() * (W - 120),
      y: 60 + Math.random() * (H - 120),
      r: 18 + Math.random() * 10,
      emoji: theme[Math.floor(Math.random() * theme.length)],
    };
    if (Math.hypot(o.x - W / 2, o.y - H / 2) < 150) continue; // zone de départ libre
    if (obstacles.every((b) => Math.hypot(o.x - b.x, o.y - b.y) > o.r + b.r + 70)) obstacles.push(o);
  }
}

function collideObstacles(x: number, y: number, r: number): [number, number] {
  for (const o of obstacles) {
    const d = Math.hypot(x - o.x, y - o.y);
    const min = o.r + r;
    if (d < min && d > 0) {
      x = o.x + ((x - o.x) / d) * min;
      y = o.y + ((y - o.y) / d) * min;
    }
  }
  return [x, y];
}

interface Enemy {
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  phase: number;
  dashT: number;
  iframes: Record<string, number>;
}

interface Gem {
  x: number;
  y: number;
  v: number;
}

interface Drop {
  x: number;
  y: number;
  kind: "heal" | "chest";
}

interface Boomerang {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  back: boolean;
}

interface Bubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Bee {
  x: number;
  y: number;
  cd: number;
}

interface Bolt {
  pts: { x: number; y: number }[];
  life: number;
}

interface Floater {
  x: number;
  y: number;
  txt: string;
  life: number;
  color: string;
}

let px = 0;
let py = 0;
let hp = 100;
let level = 1;
let xp = 0;
let kills = 0;
let runT = 0;
let playerIframes = 0;
let shake = 0;

let weapons = new Map<string, number>();
let passives = new Map<string, number>();
const timers: Record<string, number> = {};
let bladeAngle = 0;

let enemies: Enemy[] = [];
let gems: Gem[] = [];
let drops: Drop[] = [];
let boomers: Boomerang[] = [];
let bubbles: Bubble[] = [];
let bees: Bee[] = [];
let bolts: Bolt[] = [];
let floaters: Floater[] = [];
let spawnIn = 0;
let discoveredThisRun = 0;

let record = Number(localStorage.getItem(RECORD_KEY) ?? "0");
let bestiaire: Record<string, number> = {};
try {
  bestiaire = JSON.parse(localStorage.getItem(BOOK_KEY) ?? "{}");
} catch {
  bestiaire = {};
}

const keys = new Set<string>();
let touch: { x: number; y: number } | null = null;
let paused = false;

// ---------- helpers ----------

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

function maxHp(): number {
  return Math.round(100 * (1 + 0.2 * (passives.get("hp") ?? 0)));
}

function playerSpeed(): number {
  return 190 * (1 + 0.08 * (passives.get("boots") ?? 0));
}

function magnetR(): number {
  return 70 * (1 + 0.35 * (passives.get("magnet") ?? 0));
}

function dmgMult(): number {
  return 1 + 0.15 * (passives.get("fist") ?? 0);
}

function xpMult(): number {
  return 1 + 0.15 * (passives.get("clover") ?? 0);
}

function xpNeeded(): number {
  return 6 + (level - 1) * 4;
}

function nearestEnemy(x: number, y: number, maxD: number, except?: Set<Enemy>): Enemy | null {
  let best: Enemy | null = null;
  let bd = maxD;
  for (const e of enemies) {
    if (except?.has(e)) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
}

function hurt(e: Enemy, amount: number, weaponId: string, iframe: number): void {
  const nowT = runT;
  if ((e.iframes[weaponId] ?? -1) > nowT) return;
  e.iframes[weaponId] = nowT + iframe;
  const dmg = amount * dmgMult();
  e.hp -= dmg;
  floaters.push({ x: e.x, y: e.y - e.type.r, txt: String(Math.round(dmg)), life: 0.7, color: "#ffc93c" });
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e: Enemy): void {
  const i = enemies.indexOf(e);
  if (i === -1) return;
  enemies.splice(i, 1);
  kills++;
  if (!bestiaire[e.type.id]) {
    discoveredThisRun++;
    toast(`📖 ${e.type.emoji} ${e.type.name} ajouté au bestiaire !`);
  }
  bestiaire[e.type.id] = (bestiaire[e.type.id] ?? 0) + 1;
  localStorage.setItem(BOOK_KEY, JSON.stringify(bestiaire));

  gems.push({ x: e.x, y: e.y, v: e.type.xp });
  const roll = Math.random();
  if (roll < 0.015) drops.push({ x: e.x, y: e.y, kind: "heal" });
  else if (roll < 0.023) drops.push({ x: e.x, y: e.y, kind: "chest" });

  // le Citrouillard explose : danger au corps à corps
  if (e.type.id === "pumpkin") {
    floaters.push({ x: e.x, y: e.y, txt: "💥", life: 0.8, color: "#ff8c42" });
    if (Math.hypot(px - e.x, py - e.y) < 70 && playerIframes <= 0) {
      damagePlayer(12);
    }
  }
}

function damagePlayer(amount: number): void {
  if (playerIframes > 0) return;
  hp -= amount;
  playerIframes = 0.7;
  shake = 7;
  floaters.push({ x: px, y: py - 24, txt: `-${Math.round(amount)}`, life: 0.9, color: "#ff5c8a" });
  if (hp <= 0) endRun();
}

// ---------- déroulement ----------

function startRun(): void {
  state = "play";
  night = 1;
  genObstacles();
  px = W / 2;
  py = H / 2;
  hp = 100;
  level = 1;
  xp = 0;
  kills = 0;
  runT = 0;
  playerIframes = 0;
  weapons = new Map([["blades", 1]]);
  passives = new Map();
  enemies = [];
  gems = [];
  drops = [];
  boomers = [];
  bubbles = [];
  bees = [];
  bolts = [];
  floaters = [];
  spawnIn = 0.5;
  discoveredThisRun = 0;
  for (const k of Object.keys(timers)) delete timers[k];
  overlay.classList.add("hidden");
  hud.classList.remove("hidden");
}

function fmtTotal(total: number): string {
  const n = Math.floor(total / DAWN) + 1;
  const rem = total % DAWN;
  return `Nuit ${n} · ${String(Math.floor(rem / 60)).padStart(2, "0")}:${String(rem % 60).padStart(2, "0")}`;
}

function endRun(): void {
  state = "dead";
  const total = (night - 1) * DAWN + Math.floor(runT);
  if (total > record) {
    record = total;
    localStorage.setItem(RECORD_KEY, String(record));
  }
  overlayTitle.textContent = "La horde t'a eu 💀";
  overlayText.innerHTML =
    `Tenu jusqu'à ${fmtTotal(total)} — niveau ${level} · ${kills} cauchemars vaincus` +
    `${discoveredThisRun > 0 ? ` · ${discoveredThisRun} découverte${discoveredThisRun > 1 ? "s" : ""} 📖` : ""}` +
    `<br />record : ${fmtTotal(record)}` +
    "<br />Clique pour retenter la nuit.";
  overlay.classList.remove("hidden");
}

function nextNight(): void {
  night++;
  runT = 0;
  enemies = [];
  genObstacles();
  hp = Math.min(maxHp(), hp + 40);
  shake = 6;
  toast(`☀️ L'aube… non. 🌙 NUIT ${night} — ils reviennent plus forts !`);
}

interface Choice {
  emoji: string;
  name: string;
  desc: string;
  apply: () => void;
}

function buildChoices(): Choice[] {
  const pool: Choice[] = [];
  for (const w of WEAPONS) {
    const lvl = weapons.get(w.id);
    if (lvl === undefined && weapons.size < MAX_WEAPONS) {
      pool.push({ emoji: w.emoji, name: `${w.name} (nouveau)`, desc: w.desc, apply: () => weapons.set(w.id, 1) });
    } else if (lvl !== undefined && lvl < LVL_MAX) {
      pool.push({ emoji: w.emoji, name: `${w.name} niv ${lvl + 1}`, desc: "Plus fort, plus large, plus souvent.", apply: () => weapons.set(w.id, lvl + 1) });
    }
  }
  for (const p of PASSIVES) {
    const lvl = passives.get(p.id) ?? 0;
    if (lvl < LVL_MAX) {
      pool.push({
        emoji: p.emoji,
        name: `${p.name}${lvl > 0 ? ` niv ${lvl + 1}` : ""}`,
        desc: p.desc,
        apply: () => {
          passives.set(p.id, lvl + 1);
          if (p.id === "hp") hp = Math.min(maxHp(), hp + 30);
        },
      });
    }
  }
  // mélange et pioche 3
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

function levelUp(): void {
  level++;
  xp = 0;
  state = "choose";
  choiceBtns.innerHTML = "";
  for (const c of buildChoices()) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = `<span class="c-title">${c.emoji} ${c.name}</span><span class="c-desc">${c.desc}</span>`;
    btn.addEventListener("click", () => {
      c.apply();
      choicesEl.classList.add("hidden");
      state = "play";
    });
    choiceBtns.appendChild(btn);
  }
  choicesEl.classList.remove("hidden");
}

// ---------- bestiaire ----------

function renderBook(): void {
  const found = ENEMY_TYPES.filter((t) => bestiaire[t.id]).length;
  bookCount.textContent = `${found}/${ENEMY_TYPES.length}`;
  bookGrid.innerHTML = "";
  for (const t of ENEMY_TYPES) {
    const known = Boolean(bestiaire[t.id]);
    const div = document.createElement("div");
    div.className = `book-entry${known ? " caught" : ""}`;
    div.innerHTML = known
      ? `<span class="emoji">${t.emoji}</span><span>${t.name}<small>${t.desc} · ${bestiaire[t.id]} vaincu${bestiaire[t.id] > 1 ? "s" : ""}</small></span>`
      : `<span class="emoji">❓</span><span>???<small>apparaît vers ${Math.floor(t.minT / 60)}:${String(t.minT % 60).padStart(2, "0")}</small></span>`;
    bookGrid.appendChild(div);
  }
}

// ---------- simulation ----------

function spawnEnemy(): void {
  const unlocked = ENEMY_TYPES.filter((t) => runT >= t.minT);
  const weights = unlocked.map((t) => 1 + (runT - t.minT) / 150);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  let type = unlocked[0];
  for (let i = 0; i < unlocked.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      type = unlocked[i];
      break;
    }
  }
  const side = Math.floor(Math.random() * 4);
  const m = 40;
  const x = side === 0 ? -m : side === 1 ? W + m : Math.random() * W;
  const y = side === 2 ? -m : side === 3 ? H + m : Math.random() * H;
  // les cauchemars durcissent au fil de la nuit, et à chaque nuit suivante
  const hpScale = (1 + runT / 240) * (1 + (night - 1) * 0.55);
  enemies.push({ type, x, y, hp: type.hp * hpScale, phase: Math.random() * Math.PI * 2, dashT: 0, iframes: {} });
}

function fireWeapons(dt: number): void {
  const wLvl = (id: string) => weapons.get(id) ?? 0;

  // 🗡️ lames orbitales : contact permanent
  const bl = wLvl("blades");
  if (bl > 0) {
    bladeAngle += dt * (2 + bl * 0.25);
    const count = 1 + bl;
    const radius = 62 + bl * 6;
    for (let i = 0; i < count; i++) {
      const a = bladeAngle + (i / count) * Math.PI * 2;
      const bx = px + Math.cos(a) * radius;
      const by = py + Math.sin(a) * radius;
      for (const e of enemies) {
        if (Math.hypot(e.x - bx, e.y - by) < e.type.r + 14) hurt(e, 3 + bl, "blades", 0.4);
      }
    }
  }

  // 🪃 boomerang
  const bo = wLvl("boomer");
  if (bo > 0) {
    timers.boomer = (timers.boomer ?? 0) - dt;
    if (timers.boomer <= 0 && boomers.length < Math.ceil(bo / 2)) {
      timers.boomer = Math.max(0.9, 2 - bo * 0.2);
      const target = nearestEnemy(px, py, 9999);
      if (target) {
        const d = Math.hypot(target.x - px, target.y - py) || 1;
        boomers.push({ x: px, y: py, vx: (target.x - px) / d, vy: (target.y - py) / d, speed: 380 + bo * 30, back: false });
      }
    }
  }

  // 🧄 aura d'ail : tic de zone
  const ga = wLvl("garlic");
  if (ga > 0) {
    timers.garlic = (timers.garlic ?? 0) - dt;
    if (timers.garlic <= 0) {
      timers.garlic = 0.5;
      const radius = 55 + ga * 14;
      for (const e of enemies) {
        if (Math.hypot(e.x - px, e.y - py) < radius + e.type.r) hurt(e, 2 + ga, "garlic", 0.25);
      }
    }
  }

  // ⚡ éclair en chaîne
  const ec = wLvl("bolt");
  if (ec > 0) {
    timers.bolt = (timers.bolt ?? 0) - dt;
    if (timers.bolt <= 0) {
      timers.bolt = Math.max(0.8, 1.8 - ec * 0.18);
      const hit = new Set<Enemy>();
      let from = { x: px, y: py };
      let target = nearestEnemy(px, py, 280);
      const pts = [{ x: px, y: py }];
      while (target && hit.size < 2 + ec) {
        hit.add(target);
        pts.push({ x: target.x, y: target.y });
        hurt(target, 6 + ec * 2, "bolt", 0.1);
        from = { x: target.x, y: target.y };
        target = nearestEnemy(from.x, from.y, 190, hit);
      }
      if (hit.size > 0) bolts.push({ pts, life: 0.22 });
    }
  }

  // 🐝 abeilles : population = niveau
  const be = wLvl("bees");
  while (be > 0 && bees.length < be) bees.push({ x: px, y: py, cd: 0 });

  // 🫧 canon à bulles
  const bu = wLvl("bubble");
  if (bu > 0) {
    timers.bubble = (timers.bubble ?? 0) - dt;
    if (timers.bubble <= 0) {
      timers.bubble = Math.max(0.55, 1.4 - bu * 0.16);
      const target = nearestEnemy(px, py, 9999);
      if (target) {
        const d = Math.hypot(target.x - px, target.y - py) || 1;
        bubbles.push({ x: px, y: py, vx: ((target.x - px) / d) * 165, vy: ((target.y - py) / d) * 165, life: 2.6 });
      }
    }
  }
}

function step(dt: number): void {
  if (shake > 0) shake = Math.max(0, shake - dt * 16);

  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.life -= dt;
    f.y -= 38 * dt;
    if (f.life <= 0) floaters.splice(i, 1);
  }
  for (let i = bolts.length - 1; i >= 0; i--) {
    bolts[i].life -= dt;
    if (bolts[i].life <= 0) bolts.splice(i, 1);
  }

  if (state !== "play") return;

  runT += dt;
  if (playerIframes > 0) playerIframes -= dt;
  if (runT >= DAWN) {
    nextNight();
    return;
  }

  // ---- joueur ----
  let mx = 0;
  let my = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA") || keys.has("KeyQ")) mx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) mx += 1;
  if (keys.has("ArrowUp") || keys.has("KeyW") || keys.has("KeyZ")) my -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) my += 1;
  if (mx === 0 && my === 0 && touch) {
    const d = Math.hypot(touch.x - px, touch.y - py);
    if (d > 14) {
      mx = (touch.x - px) / d;
      my = (touch.y - py) / d;
    }
  }
  const mn = Math.hypot(mx, my);
  if (mn > 0) {
    px += (mx / mn) * playerSpeed() * dt;
    py += (my / mn) * playerSpeed() * dt;
  }
  px = Math.max(16, Math.min(W - 16, px));
  py = Math.max(16, Math.min(H - 16, py));
  [px, py] = collideObstacles(px, py, 13);

  // ---- apparitions : chaque nuit densifie la horde ----
  spawnIn -= dt;
  if (spawnIn <= 0) {
    spawnIn = Math.max(0.18, 1.1 - runT / 700 - (night - 1) * 0.12);
    const batch = 1 + Math.floor(runT / 150) + (night - 1);
    for (let i = 0; i < batch; i++) spawnEnemy();
  }

  // ---- ennemis ----
  for (const e of enemies) {
    const d = Math.hypot(px - e.x, py - e.y) || 1;
    let sp = e.type.speed;
    let ux = (px - e.x) / d;
    let uy = (py - e.y) / d;
    if (e.type.id === "bat") {
      const a = Math.atan2(uy, ux) + Math.sin(runT * 4 + e.phase) * 0.7;
      ux = Math.cos(a);
      uy = Math.sin(a);
    } else if (e.type.id === "snake") {
      e.dashT -= dt;
      if (e.dashT <= 0) e.dashT = 1.4;
      sp = e.dashT < 0.45 ? e.type.speed * 3.2 : e.type.speed * 0.4;
    } else if (e.type.id === "ghost") {
      sp = e.type.speed * (0.55 + 0.45 * Math.sin(runT * 2 + e.phase));
    }
    e.x += ux * sp * dt;
    e.y += uy * sp * dt;
    if (e.type.id !== "ghost") [e.x, e.y] = collideObstacles(e.x, e.y, e.type.r); // les fantômes traversent
    // jamais très loin hors écran, quoi qu'il arrive
    e.x = Math.max(-80, Math.min(W + 80, e.x));
    e.y = Math.max(-80, Math.min(H + 80, e.y));

    if (d < e.type.r + 13) damagePlayer(e.type.dmg);
  }

  // ---- armes ----
  fireWeapons(dt);

  for (let i = boomers.length - 1; i >= 0; i--) {
    const b = boomers[i];
    if (!b.back) {
      b.speed -= 520 * dt;
      if (b.speed <= 0) b.back = true;
    }
    if (b.back) {
      const d = Math.hypot(px - b.x, py - b.y) || 1;
      b.vx = (px - b.x) / d;
      b.vy = (py - b.y) / d;
      b.speed = 460;
      if (d < 22) {
        boomers.splice(i, 1);
        continue;
      }
    }
    b.x += b.vx * b.speed * dt;
    b.y += b.vy * b.speed * dt;
    for (const e of enemies) {
      if (Math.hypot(e.x - b.x, e.y - b.y) < e.type.r + 13) hurt(e, 5 + (weapons.get("boomer") ?? 1) * 2, "boomer", 0.35);
    }
  }

  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life <= 0 || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) {
      bubbles.splice(i, 1);
      continue;
    }
    for (const e of enemies) {
      if (Math.hypot(e.x - b.x, e.y - b.y) < e.type.r + 12) {
        // knockback UNE fois par touche (même garde-fou que les dégâts),
        // sinon la poussée s'applique à chaque frame et éjecte la horde
        const ready = (e.iframes["bubble"] ?? -1) <= runT;
        hurt(e, 4 + (weapons.get("bubble") ?? 1) * 2, "bubble", 0.3);
        if (ready) {
          const kn = 34;
          const d2 = Math.hypot(b.vx, b.vy) || 1;
          e.x += (b.vx / d2) * kn;
          e.y += (b.vy / d2) * kn;
        }
      }
    }
  }

  for (const b of bees) {
    b.cd -= dt;
    const target = nearestEnemy(b.x, b.y, 9999);
    if (target) {
      const d = Math.hypot(target.x - b.x, target.y - b.y) || 1;
      b.x += ((target.x - b.x) / d) * 175 * dt;
      b.y += ((target.y - b.y) / d) * 175 * dt;
      if (d < target.type.r + 10 && b.cd <= 0) {
        b.cd = 0.5;
        hurt(target, 3 + (weapons.get("bees") ?? 1), "bee" + bees.indexOf(b), 0.1);
      }
    } else {
      const d = Math.hypot(px - b.x, py - b.y) || 1;
      if (d > 50) {
        b.x += ((px - b.x) / d) * 140 * dt;
        b.y += ((py - b.y) / d) * 140 * dt;
      }
    }
  }

  // ---- collectibles ----
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    const d = Math.hypot(px - g.x, py - g.y);
    if (d < magnetR()) {
      g.x += ((px - g.x) / d) * 330 * dt;
      g.y += ((py - g.y) / d) * 330 * dt;
    }
    if (d < 16) {
      gems.splice(i, 1);
      xp += g.v * xpMult();
      if (xp >= xpNeeded()) levelUp();
    }
  }

  for (let i = drops.length - 1; i >= 0; i--) {
    const dr = drops[i];
    if (Math.hypot(px - dr.x, py - dr.y) < 22) {
      drops.splice(i, 1);
      if (dr.kind === "heal") {
        hp = Math.min(maxHp(), hp + 25);
        floaters.push({ x: px, y: py - 24, txt: "+25", life: 0.9, color: "#1fc7a8" });
      } else {
        // coffre : améliore une arme possédée au hasard
        const upgradable = [...weapons.entries()].filter(([, l]) => l < LVL_MAX);
        if (upgradable.length > 0) {
          const [id, l] = upgradable[Math.floor(Math.random() * upgradable.length)];
          weapons.set(id, l + 1);
          const def = WEAPONS.find((w) => w.id === id)!;
          toast(`📦 ${def.emoji} ${def.name} passe niveau ${l + 1} !`);
        } else {
          hp = Math.min(maxHp(), hp + 25);
        }
      }
    }
  }
}

// ---------- rendu ----------

function skyProgress(): number {
  return Math.min(1, runT / DAWN);
}

function draw(): void {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  // sol texturé, puis la nuit vire lentement à l'aube par-dessus
  const p = skyProgress();
  ctx.fillStyle = groundPattern ?? "#10101e";
  ctx.fillRect(-20, -20, W + 40, H + 40);
  ctx.fillStyle = `rgba(8, 8, 24, ${0.6 * (1 - p)})`; // voile nocturne qui se lève
  ctx.fillRect(-20, -20, W + 40, H + 40);
  if (p > 0.4) {
    ctx.fillStyle = `rgba(255, 170, 60, ${(p - 0.4) * 0.28})`; // lueur d'aube
    ctx.fillRect(-20, -20, W + 40, H + 40);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // obstacles de l'arène
  for (const o of obstacles) {
    ctx.font = `${o.r * 2.2}px serif`;
    ctx.fillText(o.emoji, o.x, o.y);
  }

  // gemmes
  for (const gm of gems) {
    ctx.save();
    ctx.translate(gm.x, gm.y);
    ctx.rotate(Math.PI / 4);
    const s = gm.v >= 3 ? 8 : 5.5;
    ctx.fillStyle = gm.v >= 3 ? "#b388eb" : "#4cc9f0";
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.strokeStyle = "#fffdf4";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-s, -s, s * 2, s * 2);
    ctx.restore();
  }

  for (const dr of drops) {
    ctx.font = "26px serif";
    ctx.fillText(dr.kind === "heal" ? "🍗" : "📦", dr.x, dr.y);
  }

  // aura d'ail
  const ga = weapons.get("garlic") ?? 0;
  if (ga > 0 && state === "play") {
    const radius = 55 + ga * 14;
    ctx.strokeStyle = "rgba(181, 228, 140, 0.5)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // éclairs
  for (const bo of bolts) {
    ctx.strokeStyle = `rgba(255, 224, 102, ${Math.min(1, bo.life * 5)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bo.pts[0].x, bo.pts[0].y);
    for (const pt of bo.pts.slice(1)) ctx.lineTo(pt.x + (Math.random() - 0.5) * 8, pt.y + (Math.random() - 0.5) * 8);
    ctx.stroke();
  }

  // ennemis
  for (const e of enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.type.id === "ghost") ctx.globalAlpha = 0.55 + 0.35 * Math.sin(runT * 2 + e.phase);
    ctx.font = `${e.type.r * 2.1}px serif`;
    ctx.fillText(e.type.emoji, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // armes visibles
  const bl = weapons.get("blades") ?? 0;
  if (bl > 0 && state !== "menu") {
    const count = 1 + bl;
    const radius = 62 + bl * 6;
    ctx.font = "22px serif";
    for (let i = 0; i < count; i++) {
      const a = bladeAngle + (i / count) * Math.PI * 2;
      ctx.save();
      ctx.translate(px + Math.cos(a) * radius, py + Math.sin(a) * radius);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillText("🗡️", 0, 0);
      ctx.restore();
    }
  }
  ctx.font = "22px serif";
  for (const b of boomers) ctx.fillText("🪃", b.x, b.y);
  for (const b of bees) ctx.fillText("🐝", b.x, b.y);
  for (const b of bubbles) {
    ctx.globalAlpha = Math.min(1, b.life);
    ctx.fillText("🫧", b.x, b.y);
  }
  ctx.globalAlpha = 1;

  // joueur
  if (state !== "menu") {
    if (playerIframes <= 0 || Math.floor(runT * 10) % 2 === 0) {
      ctx.font = "30px serif";
      ctx.fillText(state === "dead" ? "😵" : "🧑‍🚒", px, py);
    }
  }

  for (const f of floaters) {
    ctx.globalAlpha = Math.min(1, f.life * 1.6);
    ctx.font = "19px 'VT323', monospace";
    ctx.strokeStyle = "#17171b";
    ctx.lineWidth = 3;
    ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

function updateHud(): void {
  if (state === "menu") return;
  const t = Math.floor(runT);
  hudTime.textContent = `Nuit ${night} · ${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  hudLevel.textContent = String(level);
  hudKills.textContent = String(kills);
  hpFill.style.width = `${Math.max(0, (hp / maxHp()) * 100)}%`;
  xpFill.style.width = `${Math.min(100, (xp / xpNeeded()) * 100)}%`;
  hudWeapons.textContent = [...weapons.entries()]
    .map(([id, l]) => `${WEAPONS.find((w) => w.id === id)!.emoji}${l}`)
    .join(" ");
}

// ---------- entrées ----------

window.addEventListener("keydown", (e) => {
  if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
  if ((e.code === "Escape" || e.code === "KeyP") && state === "play") {
    paused = !paused;
    return;
  }
  keys.add(e.code);
});
window.addEventListener("keyup", (e) => keys.delete(e.code));

// changer d'onglet : pause automatique + purge des touches coincées
function autoPause(): void {
  keys.clear();
  touch = null;
  if (state === "play") paused = true;
}
window.addEventListener("blur", autoPause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) autoPause();
});

canvas.addEventListener("pointerdown", (e) => {
  if (paused) {
    paused = false;
    return;
  }
  if (!bookEl.classList.contains("hidden")) {
    bookEl.classList.add("hidden");
    return;
  }
  if (state === "menu" || state === "dead") {
    startRun();
    return;
  }
  touch = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener("pointermove", (e) => {
  if (touch) touch = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener("pointerup", () => {
  touch = null;
});

document.getElementById("btn-book")!.addEventListener("click", () => {
  renderBook();
  bookEl.classList.toggle("hidden");
});
bookEl.addEventListener("click", () => bookEl.classList.add("hidden"));

window.addEventListener("resize", resize);
resize();
renderBook();

let last = 0;
function frame(nowMs: number): void {
  const t = nowMs / 1000;
  const dt = Math.min(0.05, Math.max(0, t - last));
  last = t;
  if (!paused) step(dt);
  draw();
  if (paused) drawPause();
  updateHud();
  requestAnimationFrame(frame);
}

function drawPause(): void {
  ctx.fillStyle = "rgba(10, 10, 24, 0.62)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fffdf4";
  ctx.font = "bold 46px 'Pixelify Sans', monospace";
  ctx.fillText("⏸ PAUSE", W / 2, H / 2 - 24);
  ctx.font = "24px 'VT323', monospace";
  ctx.fillText("clique ou appuie sur P pour reprendre", W / 2, H / 2 + 22);
}
requestAnimationFrame(frame);

export {};
