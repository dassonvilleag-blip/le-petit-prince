// Le Phare — co-op asymétrique à deux en WebRTC pair-à-pair (sans serveur).
// Le gardien (hôte) voit toute la carte mais ne contrôle que son faisceau.
// Le navire (invité) ne voit que ce que le faisceau éclaire.
// Chacun fait autorité sur sa propre entité ; l'hôte décide seed et niveau.

// ---------- monde ----------

const WORLD_W = 1600;
const WORLD_H = 1000;
const MAX_LEVEL = 3;
const HULL_MAX = 3;

interface Rock {
  x: number;
  y: number;
  r: number;
}

interface Current {
  x: number;
  y: number;
  r: number;
  dx: number;
  dy: number;
}

interface Monster {
  ax: number;
  ay: number;
  fx: number;
  fy: number;
  phase: number;
}

interface World {
  rocks: Rock[];
  currents: Current[];
  monster: Monster | null;
  start: { x: number; y: number };
  port: { x: number; y: number };
  lighthouse: { x: number; y: number };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildWorld(seed: number, level: number): World {
  const rng = mulberry32(seed);
  const lighthouse = { x: WORLD_W / 2, y: WORLD_H / 2 - 20 };
  const corners = [
    [{ x: 130, y: WORLD_H - 120 }, { x: WORLD_W - 130, y: 120 }],
    [{ x: 130, y: 120 }, { x: WORLD_W - 130, y: WORLD_H - 120 }],
    [{ x: WORLD_W - 130, y: WORLD_H - 120 }, { x: 130, y: 120 }],
  ];
  const [start, port] = corners[Math.floor(rng() * corners.length)];

  const rocks: Rock[] = [];
  const count = 24 + level * 8;
  let guard = 0;
  while (rocks.length < count && guard++ < 600) {
    const rock = { x: 60 + rng() * (WORLD_W - 120), y: 60 + rng() * (WORLD_H - 120), r: 16 + rng() * 30 };
    const clear = (p: { x: number; y: number }, d: number) => Math.hypot(rock.x - p.x, rock.y - p.y) > d;
    if (clear(start, 150) && clear(port, 150) && clear(lighthouse, 110)) rocks.push(rock);
  }

  const currents: Current[] = [];
  if (level >= 2) {
    for (let i = 0; i < 3; i++) {
      const a = rng() * Math.PI * 2;
      currents.push({
        x: 200 + rng() * (WORLD_W - 400),
        y: 200 + rng() * (WORLD_H - 400),
        r: 130 + rng() * 90,
        dx: Math.cos(a) * (45 + rng() * 40),
        dy: Math.sin(a) * (45 + rng() * 40),
      });
    }
  }

  const monster: Monster | null =
    level >= 3
      ? { ax: 480 + rng() * 120, ay: 300 + rng() * 80, fx: 0.1 + rng() * 0.05, fy: 0.14 + rng() * 0.05, phase: rng() * 10 }
      : null;

  return { rocks, currents, monster, start, port, lighthouse };
}

function monsterPos(world: World, t: number): { x: number; y: number } | null {
  if (!world.monster) return null;
  const m = world.monster;
  return {
    x: world.lighthouse.x + Math.sin(t * m.fx * Math.PI * 2 + m.phase) * m.ax,
    y: world.lighthouse.y + Math.cos(t * m.fy * Math.PI * 2 + m.phase * 1.7) * m.ay,
  };
}

// ---------- DOM ----------

const canvas = document.getElementById("mer") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const fog = document.createElement("canvas");
const fctx = fog.getContext("2d")!;

const hud = document.getElementById("hud")!;
const hudRole = document.getElementById("hud-role")!;
const hudLevel = document.getElementById("hud-level")!;
const hudTime = document.getElementById("hud-time")!;
const hudHull = document.getElementById("hud-hull")!;
const lobby = document.getElementById("lobby")!;
const lobbyChoice = document.getElementById("lobby-choice")!;
const flowHost = document.getElementById("flow-host")!;
const flowJoin = document.getElementById("flow-join")!;
const statusEl = document.getElementById("status")!;
const overlay = document.getElementById("overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayText = document.getElementById("overlay-text")!;
const toastEl = document.getElementById("toast")!;

let toastTimer = 0;
function toast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2600);
}

// ---------- état ----------

type Role = "gardien" | "navire";
let role: Role = "gardien";
let playing = false;
let world: World | null = null;
let level = 1;
let levelStart = 0;
let totalTime = 0;

// navire (autorité : le joueur navire)
let shipX = 0;
let shipY = 0;
let shipVX = 0;
let shipVY = 0;
let shipA = 0;
let hull = HULL_MAX;
let invincibleUntil = 0;

// faisceau (autorité : le gardien)
let beamA = 0;
let beamW = 0.34;

// copies distantes interpolées
const remoteShip = { x: 0, y: 0, a: 0, tx: 0, ty: 0, ta: 0 };
const remoteBeam = { a: 0, w: 0.34, ta: 0, tw: 0.34 };

const keys = new Set<string>();
let pointer: { x: number; y: number } | null = null;
let pointerDown = false;
let now = 0;

let W = 0;
let H = 0;
let scale = 1;
let ox = 0;
let oy = 0;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fog.width = W;
  fog.height = H;
  scale = Math.min(W / WORLD_W, H / WORLD_H) * 0.96;
  ox = (W - WORLD_W * scale) / 2;
  oy = (H - WORLD_H * scale) / 2;
}

function toScreen(x: number, y: number): [number, number] {
  return [ox + x * scale, oy + y * scale];
}

function toWorld(px: number, py: number): [number, number] {
  return [(px - ox) / scale, (py - oy) / scale];
}

// ---------- réseau ----------

let pc: RTCPeerConnection | null = null;
let dc: RTCDataChannel | null = null;
let sendTimer = 0;

function encodeDesc(desc: RTCSessionDescription | null): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(desc))));
}

function decodeDesc(code: string): RTCSessionDescriptionInit {
  return JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
}

function newPeer(): RTCPeerConnection {
  const peer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun.cloudflare.com:3478" }],
  });
  peer.oniceconnectionstatechange = () => {
    if (peer.iceConnectionState === "failed" || peer.iceConnectionState === "disconnected") {
      if (playing) {
        toast("Connexion perdue 📡");
        backToLobby();
      }
    }
  };
  return peer;
}

function iceComplete(peer: RTCPeerConnection): Promise<void> {
  if (peer.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    peer.addEventListener("icegatheringstatechange", () => {
      if (peer.iceGatheringState === "complete") resolve();
    });
  });
}

function send(msg: object): void {
  if (dc && dc.readyState === "open") dc.send(JSON.stringify(msg));
}

function wireChannel(channel: RTCDataChannel): void {
  dc = channel;
  dc.onopen = () => {
    statusEl.textContent = "";
    if (role === "gardien") startLevel(Math.floor(Math.random() * 2 ** 31), 1, true);
  };
  dc.onclose = () => {
    if (playing) {
      toast("Ton coéquipier est parti 👋");
      backToLobby();
    }
  };
  dc.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    switch (msg.t) {
      case "level":
        startLevel(msg.seed, msg.level, false);
        break;
      case "ship":
        remoteShip.tx = msg.x;
        remoteShip.ty = msg.y;
        remoteShip.ta = msg.a;
        break;
      case "beam":
        remoteBeam.ta = msg.a;
        remoteBeam.tw = msg.w;
        break;
      case "hit":
        hull = msg.hull;
        toast("💥 Le navire a touché quelque chose !");
        break;
      case "port":
        if (role === "gardien") nextLevel();
        break;
      case "sink":
        if (role === "gardien") {
          showOverlay("Naufrage 🌊", "Le navire a coulé… on retente ce niveau.", 2600);
          startLevel(Math.floor(Math.random() * 2 ** 31), level, true);
        }
        break;
      case "win":
        finishGame(msg.total);
        break;
    }
  };
}

async function hostGame(): Promise<void> {
  role = "gardien";
  lobbyChoice.classList.add("hidden");
  flowHost.classList.remove("hidden");
  statusEl.textContent = "préparation du code…";
  pc = newPeer();
  wireChannel(pc.createDataChannel("phare"));
  await pc.setLocalDescription(await pc.createOffer());
  await iceComplete(pc);
  (document.getElementById("host-offer") as HTMLTextAreaElement).value = encodeDesc(pc.localDescription);
  statusEl.textContent = "en attente du matelot…";
}

async function acceptAnswer(): Promise<void> {
  const code = (document.getElementById("host-answer") as HTMLTextAreaElement).value;
  if (!pc || !code.trim()) return;
  try {
    await pc.setRemoteDescription(decodeDesc(code));
    statusEl.textContent = "connexion…";
  } catch {
    toast("Code invalide 🤔");
  }
}

async function joinGame(): Promise<void> {
  role = "navire";
  lobbyChoice.classList.add("hidden");
  flowJoin.classList.remove("hidden");
}

async function makeAnswer(): Promise<void> {
  const code = (document.getElementById("join-offer") as HTMLTextAreaElement).value;
  if (!code.trim()) return;
  try {
    pc = newPeer();
    pc.ondatachannel = (e) => wireChannel(e.channel);
    await pc.setRemoteDescription(decodeDesc(code));
    await pc.setLocalDescription(await pc.createAnswer());
    await iceComplete(pc);
    (document.getElementById("join-answer") as HTMLTextAreaElement).value = encodeDesc(pc.localDescription);
    statusEl.textContent = "renvoie la réponse au gardien…";
  } catch {
    toast("Code invalide 🤔");
  }
}

function backToLobby(): void {
  playing = false;
  world = null;
  window.clearInterval(sendTimer);
  if (pc) pc.close();
  pc = null;
  dc = null;
  hud.classList.add("hidden");
  overlay.classList.add("hidden");
  lobby.classList.remove("hidden");
  lobbyChoice.classList.remove("hidden");
  flowHost.classList.add("hidden");
  flowJoin.classList.add("hidden");
  (document.getElementById("host-offer") as HTMLTextAreaElement).value = "";
  (document.getElementById("host-answer") as HTMLTextAreaElement).value = "";
  (document.getElementById("join-offer") as HTMLTextAreaElement).value = "";
  (document.getElementById("join-answer") as HTMLTextAreaElement).value = "";
  statusEl.textContent = "";
}

// ---------- déroulement ----------

let overlayTimer = 0;
function showOverlay(title: string, text: string, ms: number): void {
  overlayTitle.textContent = title;
  overlayText.innerHTML = text;
  overlay.classList.remove("hidden");
  window.clearTimeout(overlayTimer);
  if (ms > 0) overlayTimer = window.setTimeout(() => overlay.classList.add("hidden"), ms);
}

function startLevel(seed: number, lvl: number, broadcast: boolean): void {
  level = lvl;
  world = buildWorld(seed, lvl);
  shipX = world.start.x;
  shipY = world.start.y;
  shipVX = 0;
  shipVY = 0;
  hull = HULL_MAX;
  invincibleUntil = 0;
  remoteShip.x = remoteShip.tx = world.start.x;
  remoteShip.y = remoteShip.ty = world.start.y;
  levelStart = now;
  playing = true;
  lobby.classList.add("hidden");
  hud.classList.remove("hidden");
  hudRole.textContent = role === "gardien" ? "🗼 gardien" : "⛵ navire";
  if (broadcast) send({ t: "level", seed, level: lvl });
  window.clearInterval(sendTimer);
  sendTimer = window.setInterval(() => {
    if (role === "navire") send({ t: "ship", x: Math.round(shipX), y: Math.round(shipY), a: shipA });
    else send({ t: "beam", a: beamA, w: beamW });
  }, 66);
  showOverlay(
    `Niveau ${lvl}`,
    lvl === 1
      ? "Amenez le navire au port 🚩"
      : lvl === 2
        ? "Attention : des courants poussent le navire 🌀"
        : "Quelque chose rôde dans le noir… 🐙",
    2400,
  );
}

function nextLevel(): void {
  totalTime += now - levelStart;
  if (level >= MAX_LEVEL) {
    send({ t: "win", total: Math.round(totalTime) });
    finishGame(Math.round(totalTime));
  } else {
    showOverlay("Port atteint ! 🚩", `Niveau ${level + 1}…`, 2400);
    startLevel(Math.floor(Math.random() * 2 ** 31), level + 1, true);
  }
}

function finishGame(total: number): void {
  playing = false;
  const min = Math.floor(total / 60);
  const sec = Math.floor(total % 60);
  showOverlay(
    "Traversée accomplie ⚓",
    `Les trois ports en ${min > 0 ? `${min} min ` : ""}${sec} s à deux.<br />Recréez une partie en échangeant les rôles !`,
    0,
  );
}

// ---------- simulation ----------

function step(dt: number): void {
  if (!playing || !world) return;
  const t = now - levelStart;

  if (role === "navire") {
    let ax = 0;
    let ay = 0;
    if (keys.has("ArrowLeft") || keys.has("KeyA") || keys.has("KeyQ")) ax -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) ax += 1;
    if (keys.has("ArrowUp") || keys.has("KeyW") || keys.has("KeyZ")) ay -= 1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) ay += 1;
    if (ax === 0 && ay === 0 && pointerDown && pointer) {
      const [wx, wy] = toWorld(pointer.x, pointer.y);
      const d = Math.hypot(wx - shipX, wy - shipY);
      if (d > 12) {
        ax = (wx - shipX) / d;
        ay = (wy - shipY) / d;
      }
    }
    shipVX += ax * 300 * dt;
    shipVY += ay * 300 * dt;

    for (const c of world.currents) {
      if (Math.hypot(shipX - c.x, shipY - c.y) < c.r) {
        shipVX += c.dx * dt;
        shipVY += c.dy * dt;
      }
    }

    const damp = 0.985 ** (dt * 60);
    shipVX *= damp;
    shipVY *= damp;
    const sp = Math.hypot(shipVX, shipVY);
    if (sp > 230) {
      shipVX = (shipVX / sp) * 230;
      shipVY = (shipVY / sp) * 230;
    }
    shipX = Math.max(20, Math.min(WORLD_W - 20, shipX + shipVX * dt));
    shipY = Math.max(20, Math.min(WORLD_H - 20, shipY + shipVY * dt));
    if (sp > 25) shipA = Math.atan2(shipVY, shipVX);

    // collisions
    if (now > invincibleUntil) {
      const mp = monsterPos(world, t);
      const hazards: { x: number; y: number; r: number }[] = [...world.rocks];
      if (mp) hazards.push({ x: mp.x, y: mp.y, r: 30 });
      const lh = world.lighthouse;
      hazards.push({ x: lh.x, y: lh.y, r: 42 });
      for (const hz of hazards) {
        const d = Math.hypot(shipX - hz.x, shipY - hz.y);
        if (d < hz.r + 13) {
          hull--;
          invincibleUntil = now + 2.5;
          const nx = (shipX - hz.x) / (d || 1);
          const ny = (shipY - hz.y) / (d || 1);
          shipX = hz.x + nx * (hz.r + 16);
          shipY = hz.y + ny * (hz.r + 16);
          shipVX = nx * 130;
          shipVY = ny * 130;
          send({ t: "hit", hull });
          toast(hull > 0 ? "💥 Aïe ! La coque a pris cher" : "🌊 Le navire sombre…");
          if (hull <= 0) {
            send({ t: "sink" });
            showOverlay("Naufrage 🌊", "Le gardien relance le niveau…", 2600);
          }
          break;
        }
      }
    }

    if (Math.hypot(shipX - world.port.x, shipY - world.port.y) < 55) {
      send({ t: "port" });
      showOverlay("Port atteint ! 🚩", "Bien navigué. La suite arrive…", 2400);
    }
  } else {
    // gardien : le faisceau suit la souris, la molette règle la largeur
    if (pointer) {
      const [wx, wy] = toWorld(pointer.x, pointer.y);
      beamA = Math.atan2(wy - world.lighthouse.y, wx - world.lighthouse.x);
    }
  }

  // interpolation des entités distantes
  const k = Math.min(1, dt * 12);
  remoteShip.x += (remoteShip.tx - remoteShip.x) * k;
  remoteShip.y += (remoteShip.ty - remoteShip.y) * k;
  let da = remoteShip.ta - remoteShip.a;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  remoteShip.a += da * k;
  let db = remoteBeam.ta - remoteBeam.a;
  while (db > Math.PI) db -= Math.PI * 2;
  while (db < -Math.PI) db += Math.PI * 2;
  remoteBeam.a += db * k;
  remoteBeam.w += (remoteBeam.tw - remoteBeam.w) * k;
}

// ---------- rendu ----------

function beamLength(w: number): number {
  return Math.max(380, Math.min(980, 200 + 140 / w));
}

function drawBoat(x: number, y: number, a: number, ghost: boolean): void {
  const [sx, sy] = toScreen(x, y);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(a);
  ctx.scale(scale, scale);
  ctx.globalAlpha = ghost ? 0.9 : 1;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-12, -10);
  ctx.lineTo(-12, 10);
  ctx.closePath();
  ctx.fillStyle = "#b5651d";
  ctx.fill();
  ctx.strokeStyle = "#17171b";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2, -2);
  ctx.lineTo(2, -22);
  ctx.lineTo(-10, -4);
  ctx.closePath();
  ctx.fillStyle = "#fffdf4";
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function draw(): void {
  ctx.fillStyle = "#0b1026";
  ctx.fillRect(0, 0, W, H);
  if (!world) return;

  const t = now - levelStart;
  const shipVisX = role === "navire" ? shipX : remoteShip.x;
  const shipVisY = role === "navire" ? shipY : remoteShip.y;
  const shipVisA = role === "navire" ? shipA : remoteShip.a;
  const bA = role === "gardien" ? beamA : remoteBeam.a;
  const bW = role === "gardien" ? beamW : remoteBeam.w;
  const lh = world.lighthouse;
  const [lx, ly] = toScreen(lh.x, lh.y);
  const bLen = beamLength(bW) * scale;

  // mer
  const [wx0, wy0] = toScreen(0, 0);
  ctx.fillStyle = "#10163a";
  ctx.fillRect(wx0, wy0, WORLD_W * scale, WORLD_H * scale);
  ctx.strokeStyle = "#fffdf4";
  ctx.lineWidth = 2;
  ctx.strokeRect(wx0, wy0, WORLD_W * scale, WORLD_H * scale);

  // courants
  for (const c of world.currents) {
    const [cx, cy] = toScreen(c.x, c.y);
    ctx.strokeStyle = "rgba(76, 201, 240, 0.35)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (c.r - i * 26) * scale, 0, Math.PI * 2);
      ctx.stroke();
    }
    const aLen = 26 * scale;
    const na = Math.atan2(c.dy, c.dx);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(na) * aLen, cy + Math.sin(na) * aLen);
    ctx.stroke();
  }

  // rochers
  for (const r of world.rocks) {
    const [rx, ry] = toScreen(r.x, r.y);
    ctx.beginPath();
    ctx.arc(rx, ry, r.r * scale, 0, Math.PI * 2);
    ctx.fillStyle = "#3c4055";
    ctx.fill();
    ctx.strokeStyle = "#17171b";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rx - r.r * scale * 0.25, ry - r.r * scale * 0.3, r.r * scale * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "#565b73";
    ctx.fill();
  }

  // port
  const [px, py] = toScreen(world.port.x, world.port.y);
  ctx.fillStyle = "#8a5a2b";
  ctx.strokeStyle = "#17171b";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(px - 30 * scale, py - 14 * scale, 60 * scale, 28 * scale, 6 * scale);
  ctx.fill();
  ctx.stroke();
  ctx.font = `${30 * scale}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🚩", px, py - 24 * scale);

  // monstre
  const mp = monsterPos(world, t);
  if (mp) {
    const [mx, my] = toScreen(mp.x, mp.y);
    ctx.font = `${52 * scale}px serif`;
    ctx.fillText("🐙", mx, my);
  }

  // bateau
  drawBoat(shipVisX, shipVisY, shipVisA, role === "gardien");
  if (role === "navire" && now < invincibleUntil && Math.floor(now * 8) % 2 === 0) {
    const [sx, sy] = toScreen(shipX, shipY);
    ctx.strokeStyle = "#ffc93c";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(sx, sy, 24 * scale, 0, Math.PI * 2);
    ctx.stroke();
  }

  // phare
  ctx.beginPath();
  ctx.arc(lx, ly, 34 * scale, 0, Math.PI * 2);
  ctx.fillStyle = "#565b73";
  ctx.fill();
  ctx.strokeStyle = "#17171b";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = "#fffdf4";
  ctx.strokeStyle = "#17171b";
  ctx.beginPath();
  ctx.roundRect(lx - 10 * scale, ly - 46 * scale, 20 * scale, 48 * scale, 4 * scale);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ff5c8a";
  ctx.fillRect(lx - 10 * scale, ly - 34 * scale, 20 * scale, 8 * scale);
  ctx.fillRect(lx - 10 * scale, ly - 18 * scale, 20 * scale, 8 * scale);
  ctx.beginPath();
  ctx.arc(lx, ly - 50 * scale, 6 * scale, 0, Math.PI * 2);
  ctx.fillStyle = "#ffc93c";
  ctx.fill();
  ctx.stroke();

  if (role === "gardien") {
    // le faisceau, vu du ciel
    const g = ctx.createRadialGradient(lx, ly, 20 * scale, lx, ly, bLen);
    g.addColorStop(0, "rgba(255, 201, 60, 0.4)");
    g.addColorStop(1, "rgba(255, 201, 60, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.arc(lx, ly, bLen, bA - bW / 2, bA + bW / 2);
    ctx.closePath();
    ctx.fill();
  } else {
    // brouillard percé par le faisceau et le halo du bateau
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    fctx.clearRect(0, 0, W, H);
    fctx.fillStyle = "rgba(4, 6, 18, 0.965)";
    fctx.fillRect(0, 0, W, H);
    fctx.globalCompositeOperation = "destination-out";
    const cone = fctx.createRadialGradient(lx, ly, 10, lx, ly, bLen);
    cone.addColorStop(0, "rgba(0,0,0,1)");
    cone.addColorStop(0.85, "rgba(0,0,0,0.9)");
    cone.addColorStop(1, "rgba(0,0,0,0)");
    fctx.fillStyle = cone;
    fctx.beginPath();
    fctx.moveTo(lx, ly);
    fctx.arc(lx, ly, bLen, bA - bW / 2, bA + bW / 2);
    fctx.closePath();
    fctx.fill();
    const [sx, sy] = toScreen(shipX, shipY);
    const halo = fctx.createRadialGradient(sx, sy, 6, sx, sy, 85 * scale);
    halo.addColorStop(0, "rgba(0,0,0,1)");
    halo.addColorStop(1, "rgba(0,0,0,0)");
    fctx.fillStyle = halo;
    fctx.beginPath();
    fctx.arc(sx, sy, 85 * scale, 0, Math.PI * 2);
    fctx.fill();
    fctx.globalCompositeOperation = "source-over";
    ctx.drawImage(fog, 0, 0, W, H);

    // la bouée du port clignote à travers la nuit
    if (Math.sin(now * 3) > 0.35) {
      ctx.beginPath();
      ctx.arc(px, py - 24 * scale, 4 * scale, 0, Math.PI * 2);
      ctx.fillStyle = "#ffc93c";
      ctx.fill();
    }
    // la lampe du phare aussi
    ctx.beginPath();
    ctx.arc(lx, ly - 50 * scale, 5 * scale, 0, Math.PI * 2);
    ctx.fillStyle = "#ffc93c";
    ctx.fill();
  }
}

function updateHud(): void {
  if (!playing) return;
  hudLevel.textContent = String(level);
  hudTime.textContent = `${Math.floor(now - levelStart)} s`;
  hudHull.textContent = "❤️".repeat(Math.max(0, hull)) + "🖤".repeat(HULL_MAX - Math.max(0, hull));
}

// ---------- entrées ----------

canvas.addEventListener("pointermove", (e) => {
  pointer = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener("pointerdown", (e) => {
  pointer = { x: e.clientX, y: e.clientY };
  pointerDown = true;
});
canvas.addEventListener("pointerup", () => {
  pointerDown = false;
});
canvas.addEventListener(
  "wheel",
  (e) => {
    if (role !== "gardien" || !playing) return;
    e.preventDefault();
    beamW = Math.max(0.16, Math.min(0.6, beamW + (e.deltaY > 0 ? 0.03 : -0.03)));
  },
  { passive: false },
);
window.addEventListener("keydown", (e) => {
  if (e.code.startsWith("Arrow")) e.preventDefault();
  keys.add(e.code);
});
window.addEventListener("keyup", (e) => keys.delete(e.code));

document.getElementById("btn-host")!.addEventListener("click", () => void hostGame());
document.getElementById("btn-join")!.addEventListener("click", () => void joinGame());
document.getElementById("btn-accept-answer")!.addEventListener("click", () => void acceptAnswer());
document.getElementById("btn-make-answer")!.addEventListener("click", () => void makeAnswer());
document.getElementById("btn-copy-offer")!.addEventListener("click", () => {
  void navigator.clipboard.writeText((document.getElementById("host-offer") as HTMLTextAreaElement).value);
  toast("Code copié 📋");
});
document.getElementById("btn-copy-answer")!.addEventListener("click", () => {
  void navigator.clipboard.writeText((document.getElementById("join-answer") as HTMLTextAreaElement).value);
  toast("Réponse copiée 📋");
});

window.addEventListener("resize", resize);
resize();

let last = 0;
function frame(nowMs: number): void {
  const t = nowMs / 1000;
  const dt = Math.min(0.05, Math.max(0, t - last));
  last = t;
  now = t;
  step(dt);
  draw();
  updateHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export {};
