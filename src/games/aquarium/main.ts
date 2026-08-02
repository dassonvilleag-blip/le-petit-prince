// L'Aquarium abyssal — un merge-game physique : laisse tomber des créatures
// dans l'aquarium, deux identiques fusionnent en l'espèce supérieure, et si
// ça déborde c'est fini. Physique maison (cercles + gravité), une main.

interface Species {
  emoji: string;
  name: string;
  r: number; // rayon en unités du bassin (le bassin fait 100 de large)
  points: number;
}

// la chaîne alimentaire, de la bulle à la baleine
const SPECIES: Species[] = [
  { emoji: "🫧", name: "Bulle", r: 3.4, points: 1 },
  { emoji: "🦐", name: "Crevette", r: 4.4, points: 2 },
  { emoji: "🐚", name: "Conque", r: 5.6, points: 4 },
  { emoji: "🐟", name: "Sardine", r: 7, points: 8 },
  { emoji: "🐠", name: "Poisson-clown", r: 8.8, points: 14 },
  { emoji: "🪼", name: "Méduse", r: 11, points: 22 },
  { emoji: "🐡", name: "Fugu", r: 13.6, points: 34 },
  { emoji: "🦑", name: "Calamar", r: 16.6, points: 50 },
  { emoji: "🐙", name: "Poulpe", r: 20, points: 72 },
  { emoji: "🦈", name: "Requin", r: 24, points: 100 },
  { emoji: "🐋", name: "Baleine", r: 29, points: 200 },
];

// on ne lâche que les 5 premières espèces, pondérées vers les petites
const DROP_WEIGHTS = [5, 4, 3, 2, 1];

const TANK_W = 100; // unités logiques ; tout est mis à l'échelle à l'écran
const TANK_H = 130;
const DANGER_Y = 24; // ligne de débordement, en unités depuis le haut
const GRAVITY = 260;
const RESTITUTION = 0.12;
const FRICTION = 0.995;
const RECORD_KEY = "aquarium-record";

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  level: number;
  born: number; // pop d'apparition
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const canvas = document.getElementById("tank") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const hudScore = document.getElementById("hud-score")!;
const hudRecord = document.getElementById("hud-record")!;
const overlay = document.getElementById("overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayText = document.getElementById("overlay-text")!;
const toastEl = document.getElementById("toast")!;

let W = 0;
let H = 0;
let scale = 1; // pixels par unité logique
let tankX = 0; // coin haut-gauche du bassin à l'écran
let tankY = 0;

let balls: Ball[] = [];
let particles: Particle[] = [];
let score = 0;
let record = Number(localStorage.getItem(RECORD_KEY) ?? "0");
let playing = false;
let now = 0;
let shake = 0;
let dangerT = 0; // temps passé au-dessus de la ligne
let combo = 0;
let comboUntil = 0;

// la créature en main et la suivante
let current = 0;
let next = 0;
let aimX = TANK_W / 2;
let dropCooldownUntil = 0;

function pickDrop(): number {
  const total = DROP_WEIGHTS.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < DROP_WEIGHTS.length; i++) {
    roll -= DROP_WEIGHTS[i];
    if (roll <= 0) return i;
  }
  return 0;
}

// ---- sons : petit synthé WebAudio ----

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let soundOn = localStorage.getItem("aquarium-son") !== "off";

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
  drop: () => blip(220, 0.1, 0.15, "sine", 140),
  // le pop de fusion monte avec l'espèce : les gros accords s'entendent
  merge: (level: number) => {
    blip(300 + level * 70, 0.14, 0.22, "square", 500 + level * 110);
    blip(600 + level * 140, 0.22, 0.14, "triangle", 900 + level * 160);
  },
  whale: () => {
    [440, 550, 660, 880].forEach((f, i) => window.setTimeout(() => blip(f, 0.25, 0.2, "triangle"), i * 110));
    blip(70, 1.2, 0.25, "sine", 45);
  },
  over: () => {
    blip(300, 0.5, 0.25, "sawtooth", 90);
  },
};

let toastTimer = 0;
function toast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2000);
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
  // le bassin occupe le centre, marges pour le HUD et la créature en main
  const availW = Math.min(W - 24, 520);
  const availH = H - 150;
  scale = Math.min(availW / TANK_W, availH / TANK_H);
  tankX = (W - TANK_W * scale) / 2;
  tankY = H - 24 - TANK_H * scale;
}

function startGame(): void {
  ensureAudio();
  balls = [];
  particles = [];
  score = 0;
  playing = true;
  dangerT = 0;
  combo = 0;
  current = pickDrop();
  next = pickDrop();
  aimX = TANK_W / 2;
  dropCooldownUntil = 0;
  overlay.classList.add("hidden");
}

function endGame(): void {
  playing = false;
  sfx.over();
  shake = 10;
  if (score > record) {
    record = score;
    localStorage.setItem(RECORD_KEY, String(record));
  }
  const best = balls.reduce((m, b) => Math.max(m, b.level), 0);
  overlayTitle.textContent = "L'aquarium déborde !";
  overlayText.innerHTML =
    `Score : <strong>${score}</strong> — record : ${record}<br />` +
    `Ta plus grosse créature : ${SPECIES[best].emoji} ${SPECIES[best].name}<br /><br />` +
    "Clique pour rejouer.";
  overlay.classList.remove("hidden");
}

function clampAim(level: number): void {
  const r = SPECIES[level].r;
  aimX = Math.max(r + 1, Math.min(TANK_W - r - 1, aimX));
}

function drop(): void {
  if (!playing || now < dropCooldownUntil) return;
  clampAim(current);
  balls.push({ x: aimX, y: -SPECIES[current].r, vx: 0, vy: 10, level: current, born: now });
  sfx.drop();
  current = next;
  next = pickDrop();
  clampAim(current);
  dropCooldownUntil = now + 0.45;
}

function burst(x: number, y: number, color: string, count: number, speed = 60): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = speed * (0.4 + Math.random());
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, life: 0.5 + Math.random() * 0.4, color });
  }
}

function tryMerges(): void {
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const b = balls[j];
      if (a.level !== b.level || a.level >= SPECIES.length - 1) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < SPECIES[a.level].r + SPECIES[b.level].r - 0.6) {
        const nl = a.level + 1;
        const nx = (a.x + b.x) / 2;
        const ny = (a.y + b.y) / 2;
        balls.splice(j, 1);
        balls.splice(i, 1);
        balls.push({ x: nx, y: ny, vx: 0, vy: -14, level: nl, born: now });
        // combo : les fusions en chaîne rapportent de plus en plus
        if (now < comboUntil) combo++;
        else combo = 1;
        comboUntil = now + 1.4;
        const gained = SPECIES[nl].points * combo;
        score += gained;
        burst(nx * scale + tankX, ny * scale + tankY, "#1fc7a8", 10 + nl * 2, 40 + nl * 8);
        sfx.merge(nl);
        shake = Math.min(8, 1 + nl * 0.6);
        if (combo > 1) toast(`combo ×${combo} ! +${gained}`);
        if (nl === SPECIES.length - 1) {
          sfx.whale();
          toast("🐋 UNE BALEINE ! Majestueux.");
          burst(nx * scale + tankX, ny * scale + tankY, "#ffc93c", 40, 90);
        }
        return; // une fusion par passe : les chaînes se font sur les frames suivantes
      }
    }
  }
}

function stepPhysics(dt: number): void {
  for (const b of balls) {
    b.vy += GRAVITY * dt;
    b.vx *= FRICTION;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }

  // collisions : plusieurs passes de correction pour la stabilité de la pile
  for (let pass = 0; pass < 5; pass++) {
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      const ra = SPECIES[a.level].r;
      // parois et fond
      if (a.x < ra) {
        a.x = ra;
        a.vx = Math.abs(a.vx) * RESTITUTION;
      } else if (a.x > TANK_W - ra) {
        a.x = TANK_W - ra;
        a.vx = -Math.abs(a.vx) * RESTITUTION;
      }
      if (a.y > TANK_H - ra) {
        a.y = TANK_H - ra;
        if (a.vy > 0) a.vy = -a.vy * RESTITUTION;
        a.vx *= 0.96;
      }
      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j];
        const rb = SPECIES[b.level].r;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const overlap = ra + rb - d;
        if (overlap <= 0) continue;
        const nx = dx / d;
        const ny = dy / d;
        // séparation pondérée par la masse (∝ r²)
        const ma = ra * ra;
        const mb = rb * rb;
        const total = ma + mb;
        a.x -= nx * overlap * (mb / total);
        a.y -= ny * overlap * (mb / total);
        b.x += nx * overlap * (ma / total);
        b.y += ny * overlap * (ma / total);
        // impulsion le long de la normale
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel < 0) {
          const imp = (-(1 + RESTITUTION) * rel) / (1 / ma + 1 / mb);
          a.vx -= (imp / ma) * nx;
          a.vy -= (imp / ma) * ny;
          b.vx += (imp / mb) * nx;
          b.vy += (imp / mb) * ny;
        }
      }
    }
  }

  tryMerges();

  // débordement : une créature posée au-dessus de la ligne fait monter le danger
  let overLine = false;
  for (const b of balls) {
    if (b.y - SPECIES[b.level].r < DANGER_Y && Math.abs(b.vy) < 18 && now - b.born > 1.2) {
      overLine = true;
      break;
    }
  }
  dangerT = overLine ? dangerT + dt : Math.max(0, dangerT - dt * 2);
  if (dangerT > 2) {
    endGame();
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const pa = particles[i];
    pa.life -= dt;
    if (pa.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    pa.x += pa.vx * dt;
    pa.y += pa.vy * dt;
    pa.vy += 120 * dt;
  }

  if (shake > 0) shake = Math.max(0, shake - dt * 22);
}

function draw(t: number): void {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  // fond marin
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0d2438");
  bg.addColorStop(1, "#071019");
  ctx.fillStyle = bg;
  ctx.fillRect(-20, -20, W + 40, H + 40);

  const px = (x: number): number => tankX + x * scale;
  const py = (y: number): number => tankY + y * scale;

  // l'eau du bassin
  const water = ctx.createLinearGradient(0, py(0), 0, py(TANK_H));
  water.addColorStop(0, "rgba(31, 199, 168, 0.14)");
  water.addColorStop(1, "rgba(15, 60, 110, 0.35)");
  ctx.fillStyle = water;
  ctx.fillRect(px(0), py(0), TANK_W * scale, TANK_H * scale);

  // parois en verre
  ctx.strokeStyle = "rgba(190, 235, 255, 0.55)";
  ctx.lineWidth = Math.max(3, scale * 1.2);
  ctx.beginPath();
  ctx.moveTo(px(0), py(-6));
  ctx.lineTo(px(0), py(TANK_H));
  ctx.lineTo(px(TANK_W), py(TANK_H));
  ctx.lineTo(px(TANK_W), py(-6));
  ctx.stroke();

  // ligne de danger : pulse quand on s'en approche
  const dangerAlpha = 0.25 + (dangerT > 0 ? 0.45 * Math.abs(Math.sin(t * 6)) : 0);
  ctx.strokeStyle = `rgba(255, 92, 138, ${dangerAlpha})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(px(0), py(DANGER_Y));
  ctx.lineTo(px(TANK_W), py(DANGER_Y));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // bulles d'ambiance dans le bassin
  if (playing && Math.random() < 0.1) {
    particles.push({
      x: px(Math.random() * TANK_W),
      y: py(TANK_H),
      vx: (Math.random() - 0.5) * 10,
      vy: -30 - Math.random() * 30,
      life: 1.6,
      color: "rgba(220, 245, 255, 0.35)",
    });
  }

  // les créatures
  for (const b of balls) {
    const sp = SPECIES[b.level];
    const pop = Math.min(1, (now - b.born) * 5);
    const r = sp.r * scale * (0.6 + 0.4 * pop);
    if (b.level >= 7) {
      const glow = ctx.createRadialGradient(px(b.x), py(b.y), 2, px(b.x), py(b.y), r * 1.7);
      glow.addColorStop(0, "rgba(255, 201, 60, 0.25)");
      glow.addColorStop(1, "rgba(255, 201, 60, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px(b.x), py(b.y), r * 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = `${r * 2}px serif`;
    ctx.fillText(sp.emoji, px(b.x), py(b.y) + Math.sin(t * 1.6 + b.x) * 1.5);
  }

  for (const pa of particles) {
    ctx.globalAlpha = Math.min(1, pa.life * 1.6);
    ctx.fillStyle = pa.color;
    ctx.beginPath();
    ctx.arc(pa.x, pa.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // la créature en main + visée + la suivante
  if (playing) {
    const sp = SPECIES[current];
    clampAim(current);
    const hx = px(aimX);
    const hy = py(-sp.r - 2);
    // fil de visée
    ctx.strokeStyle = "rgba(232, 244, 240, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(hx, hy + sp.r * scale);
    ctx.lineTo(hx, py(TANK_H));
    ctx.stroke();
    ctx.setLineDash([]);
    const ready = now >= dropCooldownUntil;
    ctx.globalAlpha = ready ? 1 : 0.5;
    ctx.font = `${sp.r * 2 * scale}px serif`;
    ctx.fillText(sp.emoji, hx, hy);
    ctx.globalAlpha = 1;
    // aperçu de la suivante
    ctx.font = "16px 'VT323', monospace";
    ctx.fillStyle = "rgba(232, 244, 240, 0.75)";
    ctx.textAlign = "left";
    ctx.fillText("suivante :", px(0), Math.max(18, py(-16)));
    ctx.font = `${Math.max(18, SPECIES[next].r * scale)}px serif`;
    ctx.fillText(SPECIES[next].emoji, px(0) + 74, Math.max(18, py(-16)));
    ctx.textAlign = "center";
  }

  ctx.restore();
}

function updateHud(): void {
  hudScore.textContent = String(score);
  hudRecord.textContent = String(record);
}

// ---- entrées : viser au doigt/souris, lâcher au relâchement ----

function toTankX(clientX: number): number {
  return (clientX - tankX) / scale;
}

let pointerHeld = false;

canvas.addEventListener("pointerdown", (e) => {
  ensureAudio();
  if (!playing) return;
  pointerHeld = true;
  aimX = toTankX(e.clientX);
});
canvas.addEventListener("pointermove", (e) => {
  if (playing && (pointerHeld || e.pointerType === "mouse")) aimX = toTankX(e.clientX);
});
canvas.addEventListener("pointerup", (e) => {
  if (!playing) return;
  if (pointerHeld) {
    aimX = toTankX(e.clientX);
    drop();
  }
  pointerHeld = false;
});
canvas.addEventListener("pointercancel", () => {
  pointerHeld = false;
});

overlay.addEventListener("click", () => {
  startGame();
});

const btnSound = document.getElementById("btn-sound")!;
function renderSound(): void {
  btnSound.textContent = soundOn ? "🔊" : "🔇";
}
btnSound.addEventListener("click", () => {
  soundOn = !soundOn;
  localStorage.setItem("aquarium-son", soundOn ? "on" : "off");
  if (soundOn) ensureAudio();
  renderSound();
});
renderSound();

window.addEventListener("keydown", (e) => {
  if (e.code === "ArrowLeft") aimX -= 4;
  if (e.code === "ArrowRight") aimX += 4;
  if (e.code === "Space" || e.code === "ArrowDown") drop();
});

window.addEventListener("resize", resize);
resize();
updateHud();

let last = 0;
function frame(nowMs: number): void {
  const t = nowMs / 1000;
  const dt = Math.min(0.033, Math.max(0, t - last));
  last = t;
  now = t;
  if (playing) stepPhysics(dt);
  draw(t);
  updateHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export {};
