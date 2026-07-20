// Petites Orbites — bac à sable gravitationnel façon neal.fun.
// Glisser-lancer des planètes autour d'un soleil ; le système survit tant
// qu'aucune planète ne brûle ni ne s'échappe.

interface Planet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  gm: number; // G * masse, en px³/s²
  color: string;
  seed: number;
  trail: { x: number; y: number }[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const INK = "#3b3a36";
const PAPER = "#fbf6ea";
const CRAYONS = ["#e07a5f", "#81b29a", "#5f8bd0", "#c98bb9", "#6a994e", "#bc4749", "#e6a23c", "#8e7cc3"];

const GM_SUN = 4_000_000; // px³/s² — orbite circulaire à 250 px ≈ 126 px/s
const SLING_K = 1.4; // px de drag → px/s de vitesse
const SUBSTEPS = 4;
const TRAIL_MAX = 80;
const RECORD_KEY = "petites-orbites-record";

const canvas = document.getElementById("space") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const hudPlanets = document.getElementById("hud-planets")!;
const hudTime = document.getElementById("hud-time")!;
const hudRecord = document.getElementById("hud-record")!;
const hint = document.getElementById("hint")!;
const toastEl = document.getElementById("toast")!;

let W = 0;
let H = 0;
let sunX = 0;
let sunY = 0;
let sunR = 0;
let stars: { x: number; y: number; r: number; a: number; cross: boolean }[] = [];

const planets: Planet[] = [];
const particles: Particle[] = [];

let stability = 0;
let record = Number(localStorage.getItem(RECORD_KEY) ?? "0");
let lastMilestone = 0;
let launched = false;

let drag: { sx: number; sy: number; cx: number; cy: number } | null = null;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sunX = W / 2;
  sunY = H / 2;
  sunR = Math.max(18, Math.min(W, H) * 0.035);
  stars = Array.from({ length: 110 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 2.6 + 1,
    a: Math.random() * 0.25 + 0.12,
    cross: Math.random() < 0.45,
  }));
}

function fr(seconds: number): string {
  return `${seconds.toFixed(1).replace(".", ",")} s`;
}

let toastTimer = 0;
function toast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function accelOn(x: number, y: number, self: Planet | null): { ax: number; ay: number } {
  let dx = sunX - x;
  let dy = sunY - y;
  let d2 = dx * dx + dy * dy;
  let d = Math.sqrt(d2) || 1;
  let ax = (GM_SUN / d2) * (dx / d);
  let ay = (GM_SUN / d2) * (dy / d);
  for (const p of planets) {
    if (p === self) continue;
    dx = p.x - x;
    dy = p.y - y;
    d2 = dx * dx + dy * dy + 100; // adoucissement pour éviter les frondes numériques
    d = Math.sqrt(d2);
    ax += (p.gm / d2) * (dx / d);
    ay += (p.gm / d2) * (dy / d);
  }
  return { ax, ay };
}

function burst(x: number, y: number, color: string, count: number): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 120;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.6 + Math.random() * 0.5,
      color,
    });
  }
}

function loseStability(): void {
  stability = 0;
  lastMilestone = 0;
}

function step(dt: number): void {
  const h = dt / SUBSTEPS;
  for (let s = 0; s < SUBSTEPS; s++) {
    for (const p of planets) {
      const { ax, ay } = accelOn(p.x, p.y, p);
      p.vx += ax * h;
      p.vy += ay * h;
      p.x += p.vx * h;
      p.y += p.vy * h;
    }
  }

  const escapeR = Math.max(W, H) * 1.5;
  for (let i = planets.length - 1; i >= 0; i--) {
    const p = planets[i];
    const dx = p.x - sunX;
    const dy = p.y - sunY;
    const d = Math.hypot(dx, dy);
    if (d < sunR + p.radius) {
      burst(p.x, p.y, "#e6a23c", 26);
      planets.splice(i, 1);
      toast("Une planète a brûlé dans le soleil ☀️");
      loseStability();
    } else if (d > escapeR) {
      planets.splice(i, 1);
      toast("Une planète s'est perdue dans l'espace 🌌");
      loseStability();
    }
  }

  // Fusions : deux planètes qui se touchent n'en forment plus qu'une.
  for (let i = planets.length - 1; i >= 0; i--) {
    for (let j = i - 1; j >= 0; j--) {
      const a = planets[i];
      const b = planets[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < a.radius + b.radius) {
        const gm = a.gm + b.gm;
        b.x = (a.x * a.gm + b.x * b.gm) / gm;
        b.y = (a.y * a.gm + b.y * b.gm) / gm;
        b.vx = (a.vx * a.gm + b.vx * b.gm) / gm;
        b.vy = (a.vy * a.gm + b.vy * b.gm) / gm;
        b.radius = Math.cbrt(a.radius ** 3 + b.radius ** 3);
        b.gm = gm;
        b.trail = [];
        burst(b.x, b.y, b.color, 16);
        planets.splice(i, 1);
        toast("Fusion planétaire 💫");
        break;
      }
    }
  }

  for (const p of planets) {
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > TRAIL_MAX) p.trail.shift();
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
    pa.vx *= 0.98;
    pa.vy *= 0.98;
  }

  if (planets.length > 0) {
    stability += dt;
    if (stability > record) {
      record = stability;
      localStorage.setItem(RECORD_KEY, String(record));
    }
    for (const milestone of [10, 30, 60, 120]) {
      if (stability >= milestone && lastMilestone < milestone) {
        lastMilestone = milestone;
        toast(
          milestone >= 60
            ? `${fr(stability)} de stabilité — Saint-Exupéry serait fier ⭐`
            : `${fr(stability)} de stabilité — un vrai petit système !`,
        );
      }
    }
  }
}

function previewPath(sx: number, sy: number, vx: number, vy: number): { x: number; y: number }[] {
  // Aperçu avec la gravité du soleil seulement : lisible et suffisant.
  const pts: { x: number; y: number }[] = [];
  let x = sx;
  let y = sy;
  const h = 1 / 60;
  for (let i = 0; i < 260; i++) {
    const dx = sunX - x;
    const dy = sunY - y;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2) || 1;
    vx += (GM_SUN / d2) * (dx / d) * h;
    vy += (GM_SUN / d2) * (dy / d) * h;
    x += vx * h;
    y += vy * h;
    if (d < sunR) break;
    if (i % 5 === 0) pts.push({ x, y });
  }
  return pts;
}

// « Bouillonnement » : le tremblé des traits change quelques fois par seconde,
// comme un dessin animé redessiné image par image.
let wobble = 0;

function jitter(seed: number, i: number): number {
  const s = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function sketchCircle(
  x: number,
  y: number,
  r: number,
  stroke: string,
  fill: string | null,
  seed: number,
): void {
  const n = Math.max(10, Math.floor(r * 0.9));
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const j = (jitter(seed + pass * 7 + wobble, i % n) - 0.5) * Math.max(1.6, r * 0.14);
      const rr = r + j;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (pass === 0 && fill) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.globalAlpha = pass === 0 ? 0.9 : 0.4;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = pass === 0 ? 1.8 : 1;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function draw(): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  for (const s of stars) {
    ctx.globalAlpha = s.a;
    if (s.cross) {
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x - s.r, s.y);
      ctx.lineTo(s.x + s.r, s.y);
      ctx.moveTo(s.x, s.y - s.r);
      ctx.lineTo(s.x, s.y + s.r);
      ctx.stroke();
    } else {
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  for (const p of planets) {
    if (p.trail.length > 1) {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = Math.max(1.2, p.radius * 0.3);
      ctx.setLineDash([5, 7]);
      ctx.beginPath();
      ctx.moveTo(p.trail[0].x, p.trail[0].y);
      for (const t of p.trail) ctx.lineTo(t.x, t.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }

  // Soleil crayonné avec ses rayons
  sketchCircle(sunX, sunY, sunR, "#c9932e", "#f4cf6d", 42);
  ctx.strokeStyle = "#c9932e";
  ctx.lineWidth = 1.6;
  ctx.globalAlpha = 0.8;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + jitter(wobble, i) * 0.2;
    const r1 = sunR * (1.25 + jitter(wobble + 3, i) * 0.15);
    const r2 = sunR * (1.55 + jitter(wobble + 9, i) * 0.3);
    ctx.beginPath();
    ctx.moveTo(sunX + Math.cos(a) * r1, sunY + Math.sin(a) * r1);
    ctx.lineTo(sunX + Math.cos(a) * r2, sunY + Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const p of planets) {
    sketchCircle(p.x, p.y, p.radius, INK, p.color, p.seed);
  }

  for (const pa of particles) {
    ctx.globalAlpha = Math.min(1, pa.life * 1.6);
    ctx.fillStyle = pa.color;
    ctx.beginPath();
    ctx.arc(pa.x, pa.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (drag) {
    const vx = (drag.sx - drag.cx) * SLING_K;
    const vy = (drag.sy - drag.cy) * SLING_K;
    ctx.strokeStyle = "rgba(59, 58, 54, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(drag.sx, drag.sy);
    ctx.lineTo(drag.cx, drag.cy);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(59, 58, 54, 0.45)";
    for (const pt of previewPath(drag.sx, drag.sy, vx, vy)) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    sketchCircle(drag.sx, drag.sy, 6, INK, null, 7);
  }
}

function updateHud(): void {
  hudPlanets.textContent = String(planets.length);
  hudTime.textContent = fr(stability);
  hudRecord.textContent = fr(record);
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  drag = { sx: e.clientX, sy: e.clientY, cx: e.clientX, cy: e.clientY };
});

canvas.addEventListener("pointermove", (e) => {
  if (drag) {
    drag.cx = e.clientX;
    drag.cy = e.clientY;
  }
});

canvas.addEventListener("pointerup", (e) => {
  if (!drag) return;
  const vx = (drag.sx - e.clientX) * SLING_K;
  const vy = (drag.sy - e.clientY) * SLING_K;
  planets.push({
    x: drag.sx,
    y: drag.sy,
    vx,
    vy,
    radius: 4.5 + Math.random() * 4.5,
    gm: 0,
    color: CRAYONS[Math.floor(Math.random() * CRAYONS.length)],
    seed: Math.floor(Math.random() * 1000),
    trail: [],
  });
  const p = planets[planets.length - 1];
  p.gm = p.radius ** 3 * 6;
  drag = null;
  if (!launched) {
    launched = true;
    hint.classList.add("hidden");
  }
});

canvas.addEventListener("pointercancel", () => {
  drag = null;
});

window.addEventListener("resize", resize);
resize();

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  wobble = Math.floor(now / 150);
  step(dt);
  draw();
  updateHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
