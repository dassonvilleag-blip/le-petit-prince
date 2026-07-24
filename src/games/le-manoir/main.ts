// Le Manoir — rogue-lite de plateforme façon Rogue Legacy : salles
// procédurales infinies, l'or survit à la mort et s'investit en
// améliorations permanentes, et chaque run se joue avec un héritier
// aux traits aléatoires.

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface MEnemyType {
  id: string;
  emoji: string;
  hp: number;
  dmgHearts: number;
  r: number;
}

const ENEMY_TYPES: Record<string, MEnemyType> = {
  skel: { id: "skel", emoji: "💀", hp: 3, dmgHearts: 1, r: 14 },
  slime: { id: "slime", emoji: "🟢", hp: 2, dmgHearts: 1, r: 13 },
  bat: { id: "bat", emoji: "🦇", hp: 2, dmgHearts: 1, r: 12 },
  statue: { id: "statue", emoji: "🗿", hp: 5, dmgHearts: 1, r: 16 },
};

interface MEnemy {
  type: MEnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  dir: number;
  timer: number;
  phase: number;
  platform: Rect | null;
}

interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Coin {
  x: number;
  y: number;
  taken: boolean;
}

interface Room {
  platforms: Rect[];
  spikes: Rect[];
  coins: Coin[];
  heart: { x: number; y: number; taken: boolean } | null;
  chest: { x: number; y: number; opened: boolean } | null;
  enemies: MEnemy[];
}

interface Trait {
  id: string;
  name: string;
  desc: string;
}

const TRAITS: Trait[] = [
  { id: "geant", name: "Géant", desc: "Immense : +40 % dégâts, grosse cible" },
  { id: "puce", name: "Puce", desc: "Minuscule : dur à toucher, -25 % dégâts" },
  { id: "sprinteur", name: "Sprinteur", desc: "+30 % de vitesse" },
  { id: "riche", name: "Enfant gâté", desc: "+60 % d'or, -1 cœur" },
  { id: "costaud", name: "Costaud", desc: "+1 cœur" },
  { id: "daltonien", name: "Daltonien", desc: "Voit le monde en noir et blanc" },
  { id: "myope", name: "Myope", desc: "Ne voit bien qu'au centre" },
  { id: "pacifiste", name: "Pacifiste", desc: "-50 % dégâts, +100 % d'or" },
];

const FIRST_NAMES = ["Edgar", "Berthe", "Aliénor", "Gontran", "Margaux", "Célestin", "Ysolde", "Barnabé", "Philomène", "Anselme"];
const SUFFIXES = ["le Brave", "la Foudre", "IV", "le Pâle", "Deux-Dents", "la Rusée", "Sans-Peur", "le Distrait", "la Terrible", "du Grenier"];

interface Upgrade {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  max: number;
  price: (l: number) => number;
}

const UPGRADES: Upgrade[] = [
  { id: "vit", emoji: "❤️", name: "Vitalité", desc: "+1 cœur de départ", max: 3, price: (l) => 30 * 2 ** l },
  { id: "force", emoji: "⚔️", name: "Force", desc: "+1 dégât d'épée", max: 4, price: (l) => 25 * 2 ** l },
  { id: "agilite", emoji: "🕊️", name: "Double saut", desc: "Un saut de plus, en l'air", max: 1, price: () => 80 },
  { id: "fortune", emoji: "🪙", name: "Fortune", desc: "+15 % d'or ramassé", max: 5, price: (l) => 20 * 2 ** l },
  { id: "bouclier", emoji: "🛡️", name: "Bouclier", desc: "+0,25 s d'invincibilité après un coup", max: 3, price: (l) => 25 * 2 ** l },
];

const SAVE_KEY = "manoir-save";

// ---------- DOM ----------

const canvas = document.getElementById("castle") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const hud = document.getElementById("hud")!;
const hudHearts = document.getElementById("hud-hearts")!;
const hudGold = document.getElementById("hud-gold")!;
const hudRoom = document.getElementById("hud-room")!;
const hudHeir = document.getElementById("hud-heir")!;
const overlay = document.getElementById("overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayText = document.getElementById("overlay-text")!;
const manorEl = document.getElementById("manor")!;
const manorGold = document.getElementById("manor-gold")!;
const upgradesEl = document.getElementById("upgrades")!;
const heirsEl = document.getElementById("heirs")!;
const heirCards = document.getElementById("heir-cards")!;
const toastEl = document.getElementById("toast")!;

let toastTimer = 0;
function toast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2200);
}

// texture de mur générée (Higgsfield) ; repli sur l'aplat si absente
const wallTex = new Image();
let wallPattern: CanvasPattern | null = null;
wallTex.onload = () => {
  wallPattern = ctx.createPattern(wallTex, "repeat");
};
wallTex.src = `${import.meta.env.BASE_URL}textures/manoir-mur.webp`;

// ---------- persistance ----------

let gold = 0;
let upLevels: Record<string, number> = {};
let bestRoom = 0;
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "{}");
  gold = s.gold ?? 0;
  upLevels = s.up ?? {};
  bestRoom = s.bestRoom ?? 0;
} catch {
  /* défauts */
}

function save(): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify({ gold, up: upLevels, bestRoom }));
}

function up(id: string): number {
  return upLevels[id] ?? 0;
}

// ---------- état ----------

type State = "menu" | "manor" | "play" | "dead";
let state: State = "menu";

let W = 0;
let H = 0;

let room: Room | null = null;
let roomIndex = 1;
let orbs: Orb[] = [];

// héritier courant
let heirName = "";
let heirTraits: Trait[] = [];
let mods = { size: 1, speed: 1, gold: 1, dmg: 1, hearts: 0, gray: false, vignette: false };

// joueur
let px = 0;
let py = 0;
let pvx = 0;
let pvy = 0;
let onGround = false;
let jumpsLeft = 0;
let facing = 1;
let hearts = 3;
let iframes = 0;
let attackT = 0;
let attackCd = 0;
let runGold = 0;
let shake = 0;
let autoSwing = false; // activé au premier contrôle tactile

interface Floater {
  x: number;
  y: number;
  txt: string;
  life: number;
  color: string;
}
let floaters: Floater[] = [];

const keys = new Set<string>();
let touchDir = 0;
let paused = false;

function pw(): number {
  return 15 * mods.size;
}

function ph(): number {
  return 24 * mods.size;
}

function maxHearts(): number {
  return Math.max(1, 3 + up("vit") + mods.hearts);
}

function swordDmg(): number {
  return Math.max(1, Math.round((2 + up("force")) * mods.dmg));
}

function iframeDur(): number {
  return 0.8 + up("bouclier") * 0.25;
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

// ---------- génération de salle ----------

function genRoom(depth: number): Room {
  const floorY = H - 36;
  const platforms: Rect[] = [{ x: 0, y: floorY, w: W, h: 36 }];
  const spikes: Rect[] = [];
  const coins: Coin[] = [];
  const enemies: MEnemy[] = [];

  // plateformes par étages, toujours atteignables (écarts < hauteur de saut)
  const levels = [floorY - 120, floorY - 230, floorY - 335];
  for (let li = 0; li < levels.length; li++) {
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const w = 100 + Math.random() * 90;
      platforms.push({
        x: 60 + Math.random() * (W - 120 - w),
        y: levels[li] + (Math.random() - 0.5) * 30,
        w,
        h: 16,
      });
    }
  }

  // piques au sol (jamais près de l'entrée ni de la porte)
  const spikeCount = Math.min(3, Math.floor(depth / 3));
  for (let i = 0; i < spikeCount; i++) {
    const w = 60 + Math.random() * 60;
    const x = 140 + Math.random() * (W - 320 - w);
    spikes.push({ x, y: floorY - 14, w, h: 14 });
  }

  // pièces sur les plateformes et au sol
  const coinCount = 4 + Math.floor(Math.random() * 5);
  for (let i = 0; i < coinCount; i++) {
    const p = platforms[Math.floor(Math.random() * platforms.length)];
    coins.push({ x: p.x + 20 + Math.random() * (p.w - 40), y: p.y - 18, taken: false });
  }

  // ennemis, plus nombreux et costauds avec la profondeur
  const scale = 1 + depth * 0.13;
  const enemyCount = Math.min(6, 1 + Math.floor(depth / 2));
  const pool = depth < 3 ? ["skel", "slime"] : depth < 6 ? ["skel", "slime", "bat"] : ["skel", "slime", "bat", "statue"];
  for (let i = 0; i < enemyCount; i++) {
    const type = ENEMY_TYPES[pool[Math.floor(Math.random() * pool.length)]];
    let ex: number;
    let ey: number;
    let plat: Rect | null = null;
    if (type.id === "bat") {
      ex = W * 0.4 + Math.random() * W * 0.5;
      ey = 100 + Math.random() * (H - 300);
    } else {
      plat = platforms[Math.floor(Math.random() * platforms.length)];
      ex = Math.max(plat.x + 20, Math.min(plat.x + plat.w - 20, W * 0.35 + Math.random() * W * 0.6));
      ey = plat.y - type.r;
      if (plat === platforms[0]) ex = W * 0.4 + Math.random() * (W * 0.55);
    }
    enemies.push({
      type,
      x: ex,
      y: ey,
      vx: 0,
      vy: 0,
      hp: type.hp * scale,
      dir: Math.random() < 0.5 ? -1 : 1,
      timer: Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
      platform: plat,
    });
  }

  const heart = Math.random() < 0.14 ? { x: 80 + Math.random() * (W - 160), y: 60, taken: false } : null;
  const chest = depth % 5 === 0 ? { x: W / 2, y: floorY - 20, opened: false } : null;

  return { platforms, spikes, coins, heart, chest, enemies };
}

function enterRoom(depth: number): void {
  roomIndex = depth;
  room = genRoom(depth);
  orbs = [];
  px = 40;
  py = H - 60;
  pvx = 0;
  pvy = 0;
  if (depth > bestRoom) {
    bestRoom = depth;
    save();
  }
}

// ---------- héritiers ----------

function makeHeir(): { name: string; traits: Trait[] } {
  const name = `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)]}`;
  const shuffled = [...TRAITS].sort(() => Math.random() - 0.5);
  const traits = shuffled.slice(0, Math.random() < 0.35 ? 2 : 1);
  return { name, traits };
}

function applyHeir(heir: { name: string; traits: Trait[] }): void {
  heirName = heir.name;
  heirTraits = heir.traits;
  mods = { size: 1, speed: 1, gold: 1, dmg: 1, hearts: 0, gray: false, vignette: false };
  for (const t of heir.traits) {
    if (t.id === "geant") {
      mods.size = 1.45;
      mods.dmg *= 1.4;
    } else if (t.id === "puce") {
      mods.size = 0.65;
      mods.dmg *= 0.75;
    } else if (t.id === "sprinteur") mods.speed = 1.3;
    else if (t.id === "riche") {
      mods.gold *= 1.6;
      mods.hearts -= 1;
    } else if (t.id === "costaud") mods.hearts += 1;
    else if (t.id === "daltonien") mods.gray = true;
    else if (t.id === "myope") mods.vignette = true;
    else if (t.id === "pacifiste") {
      mods.dmg *= 0.5;
      mods.gold *= 2;
    }
  }
}

function showManor(): void {
  state = "manor";
  overlay.classList.add("hidden");
  hud.classList.add("hidden");
  heirsEl.classList.add("hidden");
  manorGold.textContent = String(Math.floor(gold));
  upgradesEl.innerHTML = "";
  for (const u of UPGRADES) {
    const lvl = up(u.id);
    const btn = document.createElement("button");
    btn.type = "button";
    if (lvl >= u.max) {
      btn.innerHTML = `${u.emoji} <strong>${u.name}</strong> · MAX<br /><small>${u.desc}</small>`;
      btn.disabled = true;
    } else {
      const price = u.price(lvl);
      btn.innerHTML = `${u.emoji} <strong>${u.name}</strong> ${"▮".repeat(lvl)}${"▯".repeat(u.max - lvl)} — ${price} 🪙<br /><small>${u.desc}</small>`;
      btn.disabled = gold < price;
      btn.addEventListener("click", () => {
        if (gold < price) return;
        gold -= price;
        upLevels[u.id] = lvl + 1;
        save();
        toast(`${u.emoji} ${u.name} amélioré !`);
        showManor();
      });
    }
    upgradesEl.appendChild(btn);
  }
  manorEl.classList.remove("hidden");
}

function showHeirs(): void {
  manorEl.classList.add("hidden");
  heirCards.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const heir = makeHeir();
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML =
      `<span class="h-name">🧑‍🚀 ${heir.name}</span>` +
      heir.traits.map((t) => `<span class="h-trait">◈ ${t.name} — ${t.desc}</span>`).join("");
    btn.addEventListener("click", () => {
      applyHeir(heir);
      startRun();
    });
    heirCards.appendChild(btn);
  }
  heirsEl.classList.remove("hidden");
}

function startRun(): void {
  heirsEl.classList.add("hidden");
  hud.classList.remove("hidden");
  hearts = maxHearts();
  iframes = 0;
  attackT = 0;
  attackCd = 0;
  runGold = 0;
  jumpsLeft = 0;
  floaters = [];
  state = "play";
  enterRoom(1);
  hudHeir.textContent = `${heirName} · ${heirTraits.map((t) => t.name).join(", ")}`;
}

function die(): void {
  state = "dead";
  shake = 10;
  overlayTitle.textContent = `${heirName} n'est plus 💀`;
  overlayText.innerHTML =
    `Salle ${roomIndex} atteinte · ${Math.floor(runGold)} 🪙 légués au manoir` +
    `<br />record : salle ${bestRoom}` +
    "<br />Clique pour retourner au manoir.";
  overlay.classList.remove("hidden");
  hud.classList.add("hidden");
}

// ---------- simulation ----------

function hurtPlayer(heartsLost: number): void {
  if (iframes > 0) return;
  hearts -= heartsLost;
  iframes = iframeDur();
  shake = 7;
  floaters.push({ x: px, y: py - ph(), txt: "-1 ❤️", life: 0.9, color: "#ff5c8a" });
  pvy = -260;
  if (hearts <= 0) die();
}

function addGold(amount: number, x: number, y: number): void {
  const v = amount * mods.gold * (1 + 0.15 * up("fortune"));
  gold += v;
  runGold += v;
  save();
  floaters.push({ x, y, txt: `+${Math.round(v)} 🪙`, life: 0.8, color: "#ffc93c" });
}

function attack(): void {
  if (attackCd > 0 || state !== "play") return;
  attackCd = 0.38;
  attackT = 0.14;
}

function step(dt: number): void {
  if (shake > 0) shake = Math.max(0, shake - dt * 16);
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.life -= dt;
    f.y -= 36 * dt;
    if (f.life <= 0) floaters.splice(i, 1);
  }

  if (state !== "play" || !room) return;

  if (iframes > 0) iframes -= dt;
  if (attackCd > 0) attackCd -= dt;
  if (attackT > 0) attackT -= dt;

  // ---- déplacements joueur ----
  let dir = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA") || keys.has("KeyQ")) dir = -1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dir = 1;
  if (dir === 0) dir = touchDir;
  if (dir !== 0) facing = dir;
  pvx = dir * 235 * mods.speed;
  pvy += 1450 * dt;
  pvy = Math.min(760, pvy);

  const hw = pw() / 2;
  const hh = ph() / 2;

  // axe X
  px += pvx * dt;
  px = Math.max(hw, px);
  for (const p of room.platforms) {
    if (px + hw > p.x && px - hw < p.x + p.w && py + hh > p.y && py - hh < p.y + p.h) {
      px = pvx > 0 ? p.x - hw : p.x + p.w + hw;
    }
  }

  // axe Y
  py += pvy * dt;
  onGround = false;
  for (const p of room.platforms) {
    if (px + hw > p.x && px - hw < p.x + p.w && py + hh > p.y && py - hh < p.y + p.h) {
      if (pvy > 0 && py - hh < p.y) {
        py = p.y - hh;
        pvy = 0;
        onGround = true;
        jumpsLeft = up("agilite") > 0 ? 2 : 1;
      } else if (pvy < 0) {
        py = p.y + p.h + hh;
        pvy = 0;
      }
    }
  }
  if (py - hh > H + 40) {
    hurtPlayer(1);
    px = 40;
    py = H - 80;
    pvy = 0;
  }

  // piques
  for (const s of room.spikes) {
    if (px + hw > s.x && px - hw < s.x + s.w && py + hh > s.y) hurtPlayer(1);
  }

  // porte à droite → salle suivante
  if (px > W - 24) {
    enterRoom(roomIndex + 1);
    return;
  }

  // ---- attaque ----
  if (autoSwing && attackCd <= 0) {
    const reach = 52 * mods.size + 10;
    if (room.enemies.some((e) => Math.abs(e.y - py) < 50 && Math.abs(e.x - px) < reach + e.type.r)) attack();
  }
  if (attackT > 0) {
    const reach = 52 * mods.size;
    const hit: Rect = { x: facing > 0 ? px : px - reach, y: py - 26, w: reach, h: 52 };
    for (const e of room.enemies) {
      if (e.x + e.type.r > hit.x && e.x - e.type.r < hit.x + hit.w && e.y + e.type.r > hit.y && e.y - e.type.r < hit.y + hit.h) {
        e.hp -= swordDmg() * dt * 14; // dégâts au contact pendant la fenêtre du coup
        if (e.hp <= 0) {
          room.enemies.splice(room.enemies.indexOf(e), 1);
          addGold(2 + roomIndex * 0.5, e.x, e.y);
          floaters.push({ x: e.x, y: e.y, txt: "💥", life: 0.5, color: "#ffc93c" });
        }
      }
    }
  }

  // ---- ennemis ----
  for (const e of room.enemies) {
    if (e.type.id === "skel") {
      const p = e.platform!;
      e.x += e.dir * 55 * dt;
      if (e.x < p.x + 14 || e.x > p.x + p.w - 14) e.dir *= -1;
    } else if (e.type.id === "slime") {
      e.timer -= dt;
      e.vy += 1450 * dt;
      if (e.timer <= 0 && Math.abs(e.vy) < 1) {
        e.timer = 1.6 + Math.random() * 0.8;
        e.vy = -430;
        e.vx = Math.sign(px - e.x) * 110;
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      const p = e.platform!;
      if (e.y > p.y - e.type.r && e.vy > 0) {
        e.y = p.y - e.type.r;
        e.vy = 0;
        e.vx = 0;
      }
    } else if (e.type.id === "bat") {
      const d = Math.hypot(px - e.x, py - e.y) || 1;
      e.x += ((px - e.x) / d) * 46 * dt;
      e.y += ((py - e.y) / d) * 46 * dt + Math.sin(performance.now() / 200 + e.phase) * 40 * dt;
    } else if (e.type.id === "statue") {
      e.timer -= dt;
      if (e.timer <= 0) {
        e.timer = 2.4;
        const d = Math.hypot(px - e.x, py - e.y) || 1;
        orbs.push({ x: e.x, y: e.y - 10, vx: ((px - e.x) / d) * 190, vy: ((py - e.y) / d) * 190, life: 4 });
      }
    }
    if (Math.abs(e.x - px) < e.type.r + hw && Math.abs(e.y - py) < e.type.r + hh) hurtPlayer(e.type.dmgHearts);
  }

  // ---- projectiles ----
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    o.life -= dt;
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    if (o.life <= 0 || o.x < 0 || o.x > W || o.y < 0 || o.y > H) {
      orbs.splice(i, 1);
      continue;
    }
    if (Math.abs(o.x - px) < 10 + hw && Math.abs(o.y - py) < 10 + hh) {
      orbs.splice(i, 1);
      hurtPlayer(1);
    }
  }

  // ---- collectibles ----
  for (const c of room.coins) {
    if (!c.taken && Math.abs(c.x - px) < 20 + hw && Math.abs(c.y - py) < 24 + hh) {
      c.taken = true;
      addGold(1, c.x, c.y);
    }
  }
  if (room.heart && !room.heart.taken && Math.abs(room.heart.x - px) < 22 && Math.abs(room.heart.y - py) < 26) {
    room.heart.taken = true;
    hearts = Math.min(maxHearts(), hearts + 1);
    floaters.push({ x: px, y: py - ph(), txt: "+1 ❤️", life: 0.9, color: "#1fc7a8" });
  }
  if (room.chest && !room.chest.opened && Math.abs(room.chest.x - px) < 26 && Math.abs(room.chest.y - py) < 30) {
    room.chest.opened = true;
    addGold(25, room.chest.x, room.chest.y - 20);
    toast("📦 Le trésor du manoir !");
  }
}

function jump(): void {
  if (state !== "play") return;
  if (onGround || jumpsLeft > 0) {
    if (!onGround) jumpsLeft--;
    else jumpsLeft = up("agilite") > 0 ? 1 : 0;
    pvy = -560;
  }
}

// ---------- rendu ----------

function draw(): void {
  ctx.save();
  ctx.filter = mods.gray && state === "play" ? "grayscale(1)" : "none";
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  // murs du manoir
  ctx.fillStyle = wallPattern ?? "#241e33";
  ctx.fillRect(-20, -20, W + 40, H + 40);
  ctx.fillStyle = "rgba(14, 10, 26, 0.45)";
  ctx.fillRect(-20, -20, W + 40, H + 40);

  if (room) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // torches d'ambiance
    ctx.font = "22px serif";
    ctx.fillText("🕯️", W * 0.25, 60);
    ctx.fillText("🕯️", W * 0.75, 60);

    // plateformes
    for (const p of room.platforms) {
      ctx.fillStyle = "#3c3752";
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = "#565073";
      ctx.fillRect(p.x, p.y, p.w, 4);
      ctx.strokeStyle = "#17171b";
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    }

    // piques
    ctx.fillStyle = "#b9b9c9";
    ctx.strokeStyle = "#17171b";
    for (const s of room.spikes) {
      const n = Math.floor(s.w / 14);
      for (let i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.moveTo(s.x + i * 14, s.y + s.h);
        ctx.lineTo(s.x + i * 14 + 7, s.y);
        ctx.lineTo(s.x + i * 14 + 14, s.y + s.h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // porte
    ctx.font = "40px serif";
    ctx.fillText("🚪", W - 26, H - 62);

    for (const c of room.coins) {
      if (!c.taken) {
        ctx.font = "17px serif";
        ctx.fillText("🪙", c.x, c.y + Math.sin(performance.now() / 300 + c.x) * 3);
      }
    }
    if (room.heart && !room.heart.taken) {
      ctx.font = "22px serif";
      ctx.fillText("❤️", room.heart.x, room.heart.y + Math.sin(performance.now() / 350) * 4);
    }
    if (room.chest) {
      ctx.font = "30px serif";
      ctx.fillText(room.chest.opened ? "🗃️" : "📦", room.chest.x, room.chest.y);
    }

    for (const e of room.enemies) {
      ctx.font = `${e.type.r * 2.1}px serif`;
      ctx.fillText(e.type.emoji, e.x, e.y);
    }

    ctx.font = "16px serif";
    for (const o of orbs) ctx.fillText("🔮", o.x, o.y);

    // joueur
    if (state === "play" && (iframes <= 0 || Math.floor(performance.now() / 90) % 2 === 0)) {
      ctx.save();
      ctx.translate(px, py);
      if (facing < 0) ctx.scale(-1, 1);
      ctx.font = `${30 * mods.size}px serif`;
      ctx.fillText("🤺", 0, 0);
      if (attackT > 0) {
        ctx.font = `${24 * mods.size}px serif`;
        ctx.fillText("⚔️", 40 * mods.size, -4);
      }
      ctx.restore();
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

  // myopie : vignette
  if (mods.vignette && state === "play") {
    const g = ctx.createRadialGradient(px, py, 110, px, py, Math.max(W, H) * 0.55);
    g.addColorStop(0, "rgba(10, 8, 20, 0)");
    g.addColorStop(1, "rgba(10, 8, 20, 0.93)");
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, W + 40, H + 40);
  }

  ctx.restore();
}

function updateHud(): void {
  if (state !== "play") return;
  hudHearts.textContent = "❤️".repeat(Math.max(0, hearts)) + "🖤".repeat(Math.max(0, maxHearts() - hearts));
  hudGold.textContent = String(Math.floor(gold));
  hudRoom.textContent = String(roomIndex);
}

// ---------- entrées ----------

window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(e.code)) e.preventDefault();
  if ((e.code === "Escape" || e.code === "KeyP") && state === "play") {
    paused = !paused;
    return;
  }
  if (!e.repeat && !paused) {
    if (["ArrowUp", "Space", "KeyW", "KeyZ"].includes(e.code)) jump();
    if (["KeyX", "KeyK", "KeyJ"].includes(e.code)) attack();
  }
  keys.add(e.code);
});
window.addEventListener("keyup", (e) => keys.delete(e.code));

// changer d'onglet : pause automatique + purge des touches coincées
function autoPause(): void {
  keys.clear();
  touchDir = 0;
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
  if (state === "menu" || state === "dead") {
    showManor();
    return;
  }
  if (state !== "play") return;
  if (e.pointerType === "touch") {
    autoSwing = true;
    if (e.clientY < H * 0.4) jump();
    else touchDir = e.clientX < W / 2 ? -1 : 1;
  } else {
    attack();
  }
});
canvas.addEventListener("pointerup", () => {
  touchDir = 0;
});

document.getElementById("btn-heirs")!.addEventListener("click", showHeirs);

window.addEventListener("resize", () => {
  resize();
  if (state === "play") enterRoom(roomIndex); // re-génère à la bonne taille
});
resize();

let last = 0;
function frame(nowMs: number): void {
  const t = nowMs / 1000;
  const dt = Math.min(0.04, Math.max(0, t - last));
  last = t;
  if (!paused) step(dt);
  draw();
  if (paused) drawPause();
  updateHud();
  requestAnimationFrame(frame);
}

function drawPause(): void {
  ctx.fillStyle = "rgba(10, 8, 22, 0.62)";
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
