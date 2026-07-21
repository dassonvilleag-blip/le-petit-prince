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

const INK = "#0d0f22";
const SPACE = "#171a33";
const CRAYONS = ["#ff5c8a", "#1fc7a8", "#6c63ff", "#ffc93c", "#ff8c42", "#4cc9f0", "#b5e48c", "#f72585"];

const GM_SUN = 4_000_000; // px³/s² — orbite circulaire à 250 px ≈ 126 px/s
const SLING_K = 1.4; // px de drag → px/s de vitesse
const SUBSTEPS = 4;
const TRAIL_MAX = 80;
const RECORD_KEY = "petites-orbites-record";
const MILESTONES = [10, 30, 60, 120];

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

// Happenings : de temps en temps, l'espace fait des siennes.
interface Comet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number }[];
}
let comet: Comet | null = null;
let flare = 0; // secondes restantes d'éruption solaire
let nextEvent = 12 + Math.random() * 15;

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
  // Perdre une planète coûte la moitié du chrono ; tout perdre remet à zéro.
  stability = planets.length > 0 ? stability / 2 : 0;
  lastMilestone = 0;
  for (const m of MILESTONES) if (stability >= m) lastMilestone = m;
}

function spawnComet(): void {
  const fromLeft = Math.random() < 0.5;
  const x = fromLeft ? -60 : W + 60;
  const y = Math.random() * H;
  const tx = W * (0.3 + Math.random() * 0.4);
  const ty = H * (0.3 + Math.random() * 0.4);
  const d = Math.hypot(tx - x, ty - y) || 1;
  const speed = 260 + Math.random() * 120;
  comet = { x, y, vx: ((tx - x) / d) * speed, vy: ((ty - y) / d) * speed, trail: [] };
  toast("Une comète traverse le système ☄️");
}

function updateHappenings(dt: number): void {
  if (planets.length > 0) nextEvent -= dt;
  if (nextEvent <= 0) {
    nextEvent = 20 + Math.random() * 20;
    const roll = Math.random();
    if (roll < 0.45) {
      spawnComet();
    } else if (roll < 0.75) {
      flare = 1.2;
      toast("Éruption solaire ! Accroche-toi 🌋");
      for (const p of planets) {
        const dx = p.x - sunX;
        const dy = p.y - sunY;
        const d = Math.hypot(dx, dy) || 1;
        const kick = Math.min(140, 42_000 / d);
        p.vx += (dx / d) * kick;
        p.vy += (dy / d) * kick;
      }
    } else {
      toast("Pluie d'étoiles filantes ✨");
      for (let i = 0; i < 7; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H * 0.5,
          vx: 260 + Math.random() * 160,
          vy: 130 + Math.random() * 80,
          life: 0.9 + Math.random() * 0.7,
          color: "#ffffff",
        });
      }
    }
  }
  if (flare > 0) flare -= dt;

  if (comet) {
    comet.x += comet.vx * dt;
    comet.y += comet.vy * dt;
    comet.trail.push({ x: comet.x, y: comet.y });
    if (comet.trail.length > 26) comet.trail.shift();
    for (let i = planets.length - 1; i >= 0; i--) {
      const p = planets[i];
      if (Math.hypot(p.x - comet.x, p.y - comet.y) < p.radius + 6) {
        burst(p.x, p.y, "#4cc9f0", 30);
        planets.splice(i, 1);
        toast("Une comète a percuté une planète ☄️");
        loseStability();
        comet = null;
        break;
      }
    }
    if (comet) {
      const dSun = Math.hypot(comet.x - sunX, comet.y - sunY);
      const out = comet.x < -100 || comet.x > W + 100 || comet.y < -100 || comet.y > H + 100;
      if (dSun < sunR) burst(comet.x, comet.y, "#4cc9f0", 20);
      if (dSun < sunR || out) comet = null;
    }
  }
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

  updateHappenings(dt);

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
    for (const milestone of MILESTONES) {
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

// Rendu flat rétro : aplats vifs cerclés d'un trait sombre bien net.
function flatCircle(x: number, y: number, r: number, stroke: string, fill: string | null): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function draw(): void {
  ctx.fillStyle = SPACE;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#ffffff";
  ctx.lineCap = "round";
  for (const s of stars) {
    ctx.globalAlpha = s.a * 2;
    if (s.cross) {
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x - s.r, s.y);
      ctx.lineTo(s.x + s.r, s.y);
      ctx.moveTo(s.x, s.y - s.r);
      ctx.lineTo(s.x, s.y + s.r);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(s.x - 1, s.y - 1, 2.5, 2.5);
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

  // Comète de passage
  if (comet) {
    if (comet.trail.length > 1) {
      ctx.strokeStyle = "#4cc9f0";
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(comet.trail[0].x, comet.trail[0].y);
      for (const t of comet.trail) ctx.lineTo(t.x, t.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    flatCircle(comet.x, comet.y, 6, INK, "#bdf3ff");
  }

  // Soleil flat à rayons épais (gonfle pendant une éruption)
  const sr = sunR * (1 + Math.max(0, flare) * 0.3);
  ctx.strokeStyle = "#ffc93c";
  ctx.lineWidth = 4;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r2 = sr * (i % 2 === 0 ? 1.8 : 1.5);
    ctx.beginPath();
    ctx.moveTo(sunX + Math.cos(a) * sr * 1.22, sunY + Math.sin(a) * sr * 1.22);
    ctx.lineTo(sunX + Math.cos(a) * r2, sunY + Math.sin(a) * r2);
    ctx.stroke();
  }
  flatCircle(sunX, sunY, sr, INK, flare > 0 ? "#ff8c42" : "#ffc93c");

  for (const p of planets) {
    flatCircle(p.x, p.y, p.radius, INK, p.color);
  }

  // Planètes hors écran : une flèche au bord pour ne pas les perdre de vue
  for (const p of planets) {
    if (p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H) continue;
    const ex = Math.min(W - 16, Math.max(16, p.x));
    const ey = Math.min(H - 16, Math.max(16, p.y));
    const a = Math.atan2(p.y - ey, p.x - ex);
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-5, -7);
    ctx.lineTo(-5, 7);
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
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
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(drag.sx, drag.sy);
    ctx.lineTo(drag.cx, drag.cy);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    for (const pt of previewPath(drag.sx, drag.sy, vx, vy)) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    flatCircle(drag.sx, drag.sy, 6, "#ffffff", null);
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
  step(dt);
  draw();
  updateHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export {};
