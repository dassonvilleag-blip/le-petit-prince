// Abysse — prototype de la boucle mobile (Tiny Fishing inversé).
// Descente : on guide l'hameçon, tout ce qu'on touche s'accroche et STOPPE
// la plongée. Remontée : on accroche tout ce qu'on peut, dans la limite des
// hameçons. Plus profond = plus rare = plus cher. Une main, 45 secondes.

interface Creature {
  id: string;
  emoji: string;
  name: string;
  tier: number;
  minDepth: number;
  maxDepth: number;
}

const CREATURES: Creature[] = [
  { id: "sardine", emoji: "🐟", name: "Sardine ponctuelle", tier: 1, minDepth: 0, maxDepth: 350 },
  { id: "clown", emoji: "🐠", name: "Clown sans cirque", tier: 1, minDepth: 0, maxDepth: 350 },
  { id: "crevette", emoji: "🦐", name: "Crevette véloce", tier: 1, minDepth: 40, maxDepth: 420 },
  { id: "crabe", emoji: "🦀", name: "Crabe à cran", tier: 1, minDepth: 60, maxDepth: 500 },
  { id: "meduse", emoji: "🪼", name: "Méduse mélomane", tier: 2, minDepth: 250, maxDepth: 800 },
  { id: "fugu", emoji: "🐡", name: "Fugu susceptible", tier: 2, minDepth: 300, maxDepth: 850 },
  { id: "calamar", emoji: "🦑", name: "Calamar discret", tier: 2, minDepth: 300, maxDepth: 900 },
  { id: "tortue", emoji: "🐢", name: "Tortue pas pressée", tier: 2, minDepth: 350, maxDepth: 950 },
  { id: "homard", emoji: "🦞", name: "Homard à monocle", tier: 2, minDepth: 400, maxDepth: 1000 },
  { id: "poulpe", emoji: "🐙", name: "Poulpe à huit projets", tier: 3, minDepth: 700, maxDepth: 1400 },
  { id: "requin", emoji: "🦈", name: "Requin au régime", tier: 3, minDepth: 750, maxDepth: 1450 },
  { id: "dauphin", emoji: "🐬", name: "Dauphin sous couverture", tier: 3, minDepth: 800, maxDepth: 1500 },
  { id: "lanterne", emoji: "🏮", name: "Lanterne d'en bas", tier: 3, minDepth: 850, maxDepth: 1600 },
  { id: "baleine", emoji: "🐋", name: "Baleineau XXL", tier: 4, minDepth: 1300, maxDepth: 2200 },
  { id: "sirene", emoji: "🧜", name: "Sirène blasée", tier: 4, minDepth: 1350, maxDepth: 2300 },
  { id: "moai", emoji: "🗿", name: "Moaï amphibie", tier: 4, minDepth: 1400, maxDepth: 2400 },
  { id: "dragon", emoji: "🐉", name: "Dragon des fosses", tier: 5, minDepth: 2100, maxDepth: 99_999 },
  { id: "ovni", emoji: "🛸", name: "OVNI en cale sèche", tier: 5, minDepth: 2200, maxDepth: 99_999 },
  { id: "couronne", emoji: "👑", name: "Couronne du roi noyé", tier: 5, minDepth: 2300, maxDepth: 99_999 },
  { id: "chaussette", emoji: "🧦", name: "La Chaussette originelle", tier: 5, minDepth: 2500, maxDepth: 99_999 },
];

const VALUE = [0, 2, 5, 12, 30, 80];

const ZONES: [number, string][] = [
  [0, "Les Eaux Claires"],
  [500, "La Zone Crépusculaire"],
  [1200, "Minuit Perpétuel"],
  [2100, "La Fosse Hurlante"],
  [3200, "L'Origine"],
];

const HOOK_R = 13;
const HOOK_Y = 0.42;
const SAVE_KEY = "abysse-save";

const canvas = document.getElementById("sea") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const hudDepth = document.getElementById("hud-depth")!;
const hudMoney = document.getElementById("hud-money")!;
const hudRecord = document.getElementById("hud-record")!;
const hudBook = document.getElementById("hud-book")!;
const overlay = document.getElementById("overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayText = document.getElementById("overlay-text")!;
const toastEl = document.getElementById("toast")!;

let W = 0;
let H = 0;

type State = "surface" | "descend" | "ascend";
let state: State = "surface";

let depth = 0;
let hookX = 0;
let hookVX = 0;
let mouseX: number | null = null;
let now = 0;
let shake = 0;
let zoneBanner: { name: string; until: number } | null = null;
let lastZone = 0;

interface Swimmer {
  creature: Creature;
  x: number;
  y: number;
  vx: number;
  phase: number;
  r: number;
  caught: boolean;
  slot: number; // position dans le chapelet une fois accroché
}
let swimmers: Swimmer[] = [];
let caught: Swimmer[] = [];
let spawnIn = 0;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}
let particles: Particle[] = [];

interface Floater {
  x: number;
  y: number;
  txt: string;
  life: number;
  color: string;
}
let floaters: Floater[] = [];

// ---- sauvegarde : argent, améliorations, record, bestiaire ----

let money = 0;
let upDepth = 0;
let upHooks = 0;
let upValue = 0;
let record = 0;
let bestiaire = new Set<string>();
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "{}");
  money = s.money ?? 0;
  upDepth = s.upDepth ?? 0;
  upHooks = s.upHooks ?? 0;
  upValue = s.upValue ?? 0;
  record = s.record ?? 0;
  bestiaire = new Set(s.bestiaire ?? []);
} catch {
  /* valeurs par défaut */
}

function save(): void {
  localStorage.setItem(
    SAVE_KEY,
    JSON.stringify({ money, upDepth, upHooks, upValue, record, bestiaire: [...bestiaire] }),
  );
}

const maxDepth = (): number => 350 + upDepth * 280;
const capacity = (): number => 1 + upHooks;
const valueMul = (): number => 1 + upValue * 0.25;

const UPGRADES = [
  { id: "up-depth", icon: "🧵", name: "Ligne", desc: () => `${maxDepth()} m`, get: () => upDepth, inc: () => upDepth++, max: 12, price: (l: number) => Math.round(18 * 1.7 ** l) },
  { id: "up-hooks", icon: "🪝", name: "Hameçons", desc: () => `${capacity()} prises`, get: () => upHooks, inc: () => upHooks++, max: 9, price: (l: number) => Math.round(28 * 1.8 ** l) },
  { id: "up-value", icon: "💰", name: "Négoce", desc: () => `×${valueMul().toFixed(2)}`, get: () => upValue, inc: () => upValue++, max: 10, price: (l: number) => Math.round(22 * 1.75 ** l) },
];

function renderShop(): void {
  for (const u of UPGRADES) {
    const btn = document.getElementById(u.id) as HTMLButtonElement | null;
    if (!btn) continue;
    const lvl = u.get();
    if (lvl >= u.max) {
      btn.innerHTML = `${u.icon} ${u.name}<br /><strong>${u.desc()}</strong><br />MAX`;
      btn.disabled = true;
    } else {
      const price = u.price(lvl);
      btn.innerHTML = `${u.icon} ${u.name}<br /><strong>${u.desc()}</strong><br />→ ${price} 🪙`;
      btn.disabled = money < price;
    }
  }
}

let toastTimer = 0;
function toast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2200);
}

// ---- sons : petit synthé WebAudio ----

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let soundOn = localStorage.getItem("abysse-son") !== "off";

function ensureAudio(): void {
  if (ac || !soundOn) return;
  ac = new AudioContext();
  master = ac.createGain();
  master.gain.value = 0.45;
  master.connect(ac.destination);
}

function blip(freq: number, dur: number, gain: number, type: OscillatorType = "sine", slideTo = 0): void {
  if (!ac || !master || !soundOn) return;
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, ac.currentTime);
  if (slideTo > 0) o.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  o.connect(g).connect(master);
  o.start();
  o.stop(ac.currentTime + dur + 0.05);
}

const sfx = {
  splash: () => {
    blip(300, 0.25, 0.2, "sine", 90);
  },
  catch: (tier: number, chain: number) => {
    blip(300 + tier * 60 + chain * 40, 0.12, 0.22, "square", 600 + tier * 100 + chain * 60);
  },
  flip: () => {
    blip(140, 0.3, 0.22, "sine", 420);
  },
  sell: () => {
    [660, 830, 990, 1320].forEach((f, i) => window.setTimeout(() => blip(f, 0.12, 0.16, "square"), i * 80));
  },
  zone: () => {
    blip(120, 0.8, 0.2, "sine", 60);
  },
};

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

const descentSpeed = (): number => Math.min(720, 340 + depth * 0.06);
const ascentSpeed = (): number => 560;
const scrollSpeed = (): number => (state === "ascend" ? ascentSpeed() : descentSpeed());

function burst(x: number, y: number, color: string, count: number): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 140;
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4 + Math.random() * 0.4, color });
  }
}

function spawnSwimmer(fromTop: boolean): void {
  const candidates = CREATURES.filter((c) => depth >= c.minDepth && depth <= c.maxDepth);
  if (candidates.length === 0) return;
  const weighted = candidates.flatMap((c) => Array(c.tier === 5 ? 1 : 4 - Math.floor(c.tier / 2)).fill(c) as Creature[]);
  const creature = weighted[Math.floor(Math.random() * weighted.length)];
  const fromLeft = Math.random() < 0.5;
  swimmers.push({
    creature,
    x: fromLeft ? -50 : W + 50,
    y: fromTop ? -60 : H + 60,
    vx: (fromLeft ? 1 : -1) * (40 + Math.random() * 80 + depth * 0.008),
    phase: Math.random() * Math.PI * 2,
    r: 15 + creature.tier * 2.5,
    caught: false,
    slot: 0,
  });
}

function startDive(): void {
  ensureAudio();
  depth = 0;
  hookX = W / 2;
  hookVX = 0;
  swimmers = [];
  caught = [];
  particles = [];
  floaters = [];
  spawnIn = 0.35;
  lastZone = 0;
  zoneBanner = null;
  state = "descend";
  sfx.splash();
  overlay.classList.add("hidden");
}

function flipToAscend(): void {
  if (state !== "descend") return;
  state = "ascend";
  sfx.flip();
  shake = 5;
}

function endDive(): void {
  state = "surface";
  swimmers = [];
  let total = 0;
  const lines: string[] = [];
  for (const s of caught) {
    const isNew = !bestiaire.has(s.creature.id);
    bestiaire.add(s.creature.id);
    const v = Math.round(VALUE[s.creature.tier] * valueMul() * (isNew ? 2 : 1));
    total += v;
    lines.push(
      `${s.creature.emoji} ${s.creature.name} — <strong>${v} 🪙</strong>${isNew ? " <strong>NOUVEAU ×2</strong> 📖" : ""}`,
    );
  }
  money += total;
  save();
  if (caught.length > 0) sfx.sell();

  overlayTitle.textContent = caught.length > 0 ? `+${total} 🪙` : "Remonté à vide";
  overlayText.innerHTML =
    (lines.length ? lines.join("<br />") + "<br /><br />" : "") +
    `Profondeur atteinte : <strong>${Math.floor(record)} m</strong> — bestiaire ${bestiaire.size}/${CREATURES.length}`;
  caught = [];
  renderShop();
  overlay.classList.remove("hidden");
}

function step(dt: number): void {
  if (shake > 0) shake = Math.max(0, shake - dt * 16);

  for (let i = particles.length - 1; i >= 0; i--) {
    const pa = particles[i];
    pa.life -= dt;
    if (pa.life <= 0) particles.splice(i, 1);
    else {
      pa.x += pa.vx * dt;
      pa.y += pa.vy * dt;
    }
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.life -= dt;
    f.y -= 46 * dt;
    if (f.life <= 0) floaters.splice(i, 1);
  }

  if (state === "surface") return;

  const scroll = scrollSpeed();
  const hy = H * HOOK_Y;

  // hameçon : suivi du doigt amorti
  if (mouseX !== null) {
    const desired = Math.max(-560, Math.min(560, (mouseX - hookX) * 7.5));
    hookVX += (desired - hookVX) * Math.min(1, dt * 15);
  } else {
    hookVX *= 0.9 ** (dt * 60);
  }
  hookX += hookVX * dt;
  hookX = Math.max(HOOK_R, Math.min(W - HOOK_R, hookX));

  const meters = (scroll * dt) / 10;
  if (state === "descend") {
    depth += meters;
    if (depth > record) {
      record = depth;
    }
    // bannières de zone
    for (const [zd, zn] of ZONES) {
      if (zd > lastZone && depth >= zd) {
        lastZone = zd;
        if (zd > 0) {
          zoneBanner = { name: zn, until: now + 2.4 };
          sfx.zone();
        }
      }
    }
    if (depth >= maxDepth()) {
      flipToAscend();
    }
  } else {
    depth -= meters;
    if (depth <= 0) {
      endDive();
      return;
    }
  }

  // apparitions
  spawnIn -= dt;
  if (spawnIn <= 0) {
    spawnIn = Math.max(0.24, 0.62 - depth / 6000);
    spawnSwimmer(state === "ascend");
  }

  for (let i = swimmers.length - 1; i >= 0; i--) {
    const s = swimmers[i];
    s.x += s.vx * dt;
    s.y += (state === "descend" ? -scroll * 0.8 : scroll * 0.75) * dt;
    s.y += Math.sin(now * 2 + s.phase) * 16 * dt;
    if (s.y < -90 || s.y > H + 90 || s.x < -100 || s.x > W + 100) {
      swimmers.splice(i, 1);
      continue;
    }
    if (Math.hypot(s.x - hookX, s.y - hy) < s.r * 0.85 + HOOK_R - 2) {
      if (state === "descend") {
        // premier contact : accroché, et la plongée s'arrête là
        s.caught = true;
        s.slot = 0;
        caught.push(s);
        swimmers.splice(i, 1);
        burst(hookX, hy, "#ffc93c", 18);
        floaters.push({ x: hookX, y: hy - 26, txt: `${s.creature.emoji} accroché !`, life: 1.3, color: "#ffc93c" });
        sfx.catch(s.creature.tier, 0);
        shake = 4;
        flipToAscend();
      } else if (caught.length < capacity()) {
        s.caught = true;
        s.slot = caught.length;
        caught.push(s);
        swimmers.splice(i, 1);
        burst(s.x, s.y, "#1fc7a8", 12);
        floaters.push({
          x: s.x,
          y: s.y - 20,
          txt: `${s.creature.emoji} +1 (${caught.length}/${capacity()})`,
          life: 1.1,
          color: "#1fc7a8",
        });
        sfx.catch(s.creature.tier, caught.length);
      }
    }
  }

  // bulles d'ambiance
  if (Math.random() < dt * 7) {
    particles.push({
      x: Math.random() * W,
      y: H + 10,
      vx: (Math.random() - 0.5) * 18,
      vy: -60 - Math.random() * 60,
      life: 1.4,
      color: "rgba(255,255,255,0.4)",
    });
  }
}

function waterColorAt(d: number): string {
  const stops: [number, number[]][] = [
    [0, [36, 105, 170]],
    [500, [22, 70, 124]],
    [1200, [14, 38, 80]],
    [2100, [8, 14, 38]],
    [3200, [3, 4, 12]],
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

  const hy = H * HOOK_Y;
  const grad = ctx.createLinearGradient(0, -20, 0, H + 20);
  grad.addColorStop(0, waterColorAt(depth - hy / 10));
  grad.addColorStop(1, waterColorAt(depth + (H - hy) / 10));
  ctx.fillStyle = grad;
  ctx.fillRect(-20, -20, W + 40, H + 40);

  // marqueurs de profondeur
  if (state !== "surface") {
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "16px 'VT323', monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.lineWidth = 1.5;
    const first = Math.max(200, Math.ceil((depth - hy / 10) / 200) * 200);
    for (let md = first; md <= depth + (H - hy) / 10; md += 200) {
      const y = hy + (md - depth) * 10;
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(`${md} m`, 12, y - 4);
    }
    // repère de fond de ligne : où la plongée s'arrêtera
    const floorY = hy + (maxDepth() - depth) * 10;
    if (floorY < H + 30 && state === "descend") {
      ctx.strokeStyle = "rgba(255, 92, 138, 0.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(0, floorY);
      ctx.lineTo(W, floorY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // rayons près de la surface
  if (depth < 420) {
    ctx.globalAlpha = 0.13 * (1 - depth / 420);
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
    if (s.creature.tier >= 3) {
      const glowR = s.r * (2 + 0.25 * Math.sin(t * 3 + s.phase));
      const glow = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, glowR);
      const c = s.creature.tier >= 5 ? "255, 92, 138" : s.creature.tier === 4 ? "255, 201, 60" : "76, 201, 240";
      glow.addColorStop(0, `rgba(${c}, 0.38)`);
      glow.addColorStop(1, `rgba(${c}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(s.x, s.y + Math.sin(t * 2 + s.phase) * 5);
    if (s.vx > 0) ctx.scale(-1, 1);
    ctx.font = `${s.r * 2}px serif`;
    ctx.fillText(s.creature.emoji, 0, 0);
    ctx.restore();
  }

  for (const pa of particles) {
    ctx.globalAlpha = Math.min(1, pa.life * 1.6);
    ctx.fillStyle = pa.color;
    ctx.beginPath();
    ctx.arc(pa.x, pa.y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const f of floaters) {
    ctx.globalAlpha = Math.min(1, f.life * 1.5);
    ctx.font = "20px 'VT323', monospace";
    ctx.strokeStyle = "#0b1016";
    ctx.lineWidth = 3;
    ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  // ligne + hameçon + chapelet de prises
  if (state !== "surface") {
    ctx.strokeStyle = "#fffdf4";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(hookX - hookVX * 0.05, -10);
    ctx.quadraticCurveTo(hookX - hookVX * 0.09, hy * 0.5, hookX, hy - HOOK_R);
    ctx.stroke();

    ctx.font = `${HOOK_R * 2.2}px serif`;
    ctx.fillText("🪝", hookX, hy);

    for (let i = 0; i < caught.length; i++) {
      const c = caught[i];
      const dangle = Math.sin(t * 4 + i * 1.4) * (5 + i * 1.6);
      ctx.font = `${(13 + c.creature.tier * 3) * 2}px serif`;
      ctx.fillText(c.creature.emoji, hookX + dangle, hy + HOOK_R + 18 + i * 30 + c.creature.tier * 2);
    }

    // compteur de prises pendant la remontée
    if (state === "ascend") {
      ctx.font = "22px 'Pixelify Sans', monospace";
      ctx.fillStyle = "rgba(255,253,244,0.85)";
      ctx.fillText(`${caught.length}/${capacity()}`, hookX, hy - 34);
    }

    // le noir des profondeurs
    if (depth > 900) {
      const dark = Math.min(0.6, (depth - 900) / 2600);
      const g = ctx.createRadialGradient(hookX, hy, 70, hookX, hy, Math.max(W, H) * 0.72);
      g.addColorStop(0, "rgba(0, 0, 0, 0)");
      g.addColorStop(1, `rgba(0, 0, 5, ${dark})`);
      ctx.fillStyle = g;
      ctx.fillRect(-20, -20, W + 40, H + 40);
    }

    // bannière de zone
    if (zoneBanner && now < zoneBanner.until) {
      const a = Math.min(1, (zoneBanner.until - now) / 0.5, (now - (zoneBanner.until - 2.4)) * 2.5);
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = "bold 34px 'Pixelify Sans', monospace";
      ctx.strokeStyle = "#0b1016";
      ctx.lineWidth = 5;
      ctx.strokeText(zoneBanner.name, W / 2, H * 0.2);
      ctx.fillStyle = "#fffdf4";
      ctx.fillText(zoneBanner.name, W / 2, H * 0.2);
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
}

function updateHud(): void {
  hudDepth.textContent = `${Math.floor(Math.max(0, depth))} m`;
  hudMoney.textContent = String(money);
  hudRecord.textContent = `${Math.floor(record)} m`;
  hudBook.textContent = `${bestiaire.size}/${CREATURES.length}`;
}

canvas.addEventListener("pointermove", (e) => {
  mouseX = e.clientX;
});
canvas.addEventListener("pointerdown", (e) => {
  mouseX = e.clientX;
  ensureAudio();
});
canvas.addEventListener("pointerup", (e) => {
  if (e.pointerType === "touch") mouseX = null;
});
canvas.addEventListener("pointercancel", () => {
  mouseX = null;
});

overlay.addEventListener("click", (e) => {
  // les boutons de la boutique ne lancent pas la plongée
  if ((e.target as HTMLElement).closest(".shop")) return;
  startDive();
});

for (const u of UPGRADES) {
  document.getElementById(u.id)?.addEventListener("click", () => {
    const lvl = u.get();
    const price = u.price(lvl);
    if (lvl >= u.max || money < price) return;
    money -= price;
    u.inc();
    save();
    renderShop();
    updateHud();
    blip(880, 0.1, 0.15, "square", 1200);
    toast("🛠️ Amélioré !");
  });
}

const btnSound = document.getElementById("btn-sound")!;
function renderSound(): void {
  btnSound.textContent = soundOn ? "🔊" : "🔇";
}
btnSound.addEventListener("click", () => {
  soundOn = !soundOn;
  localStorage.setItem("abysse-son", soundOn ? "on" : "off");
  if (soundOn) ensureAudio();
  renderSound();
});
renderSound();

window.addEventListener("resize", resize);
resize();
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
