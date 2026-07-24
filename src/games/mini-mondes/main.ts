// Les Mini-Mondes — plateforme à la Mario : des niveaux procéduraux
// assemblés par morceaux avec plusieurs routes (haute/basse, sorties
// secrètes), une carte de monde à embranchements, et un biome = une
// mécanique (ressorts, courants d'air, gravité inversée).
// Héros animé par spritesheets générées via Higgsfield.

// ---------- constantes ----------

const T = 16; // taille d'une tuile en px logiques
const CHUNK_W = 20;
const LEVEL_H = 15;
const SAVE_KEY = "mini-mondes-save";

type Biome = "prairie" | "vent" | "cristal";

interface BiomeDef {
  name: string;
  sky: [string, string];
  ground: string;
  groundDark: string;
  top: string;
  accent: string;
  deco: string;
}

const BIOMES: Record<Biome, BiomeDef> = {
  prairie: {
    name: "Prairie",
    sky: ["#8fd3ff", "#d8f7e6"],
    ground: "#8a5a3c",
    groundDark: "#6d4530",
    top: "#57c04c",
    accent: "#2f9e44",
    deco: "#ff7b9c",
  },
  vent: {
    name: "Canyon du Vent",
    sky: ["#ffd48a", "#ffedc9"],
    ground: "#c97b3f",
    groundDark: "#a15f2e",
    top: "#e8a25c",
    accent: "#d9822b",
    deco: "#7fd8d0",
  },
  cristal: {
    name: "Grottes de Cristal",
    sky: ["#3d2b66", "#6d4fa3"],
    ground: "#4a3b73",
    groundDark: "#382b59",
    top: "#8f7fd4",
    accent: "#b79bff",
    deco: "#63e6be",
  },
};

// ---------- RNG seedé ----------

let rngState = 1;
function seedRng(s: number): void {
  rngState = s >>> 0 || 1;
}
function rnd(): number {
  // xorshift32
  rngState ^= rngState << 13;
  rngState ^= rngState >>> 17;
  rngState ^= rngState << 5;
  rngState >>>= 0;
  return rngState / 4294967296;
}
function rndInt(a: number, b: number): number {
  return a + Math.floor(rnd() * (b - a + 1));
}
function pick<T2>(arr: T2[]): T2 {
  return arr[Math.floor(rnd() * arr.length)];
}

// ---------- DOM ----------

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const hud = document.getElementById("hud")!;
const hudHearts = document.getElementById("hud-hearts")!;
const hudCoins = document.getElementById("hud-coins")!;
const hudLevel = document.getElementById("hud-level")!;
const overlay = document.getElementById("overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayText = document.getElementById("overlay-text")!;
const shopEl = document.getElementById("shop")!;
const shopCoins = document.getElementById("shop-coins")!;
const shopItems = document.getElementById("shop-items")!;
const toastEl = document.getElementById("toast")!;
const btnShop = document.getElementById("btn-shop")!;
const btnCloseShop = document.getElementById("btn-close-shop")!;
const touchUi = document.getElementById("touch-ui")!;
const btnDash = document.getElementById("btn-dash")!;

let toastTimer = 0;
function toast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2400);
}

// ---------- sprites du héros (Higgsfield) ----------

const BASE = import.meta.env.BASE_URL;

interface Sheet {
  img: HTMLImageElement;
  frames: number;
  cw: number;
  ch: number;
  cols: number;
  fps: number;
  loop: boolean;
}

function loadSheet(file: string, frames: number, cw: number, ch: number, cols: number, fps: number, loop: boolean): Sheet {
  const img = new Image();
  img.src = `${BASE}mini-mondes/${file}`;
  return { img, frames, cw, ch, cols, fps, loop };
}

const SHEETS = {
  idle: loadSheet("trump_idle.png", 1, 93, 128, 1, 1, true),
  run: loadSheet("trump_run.png", 9, 108, 128, 3, 12, true),
  jump: loadSheet("trump_jump.png", 12, 87, 128, 4, 14, false),
  dash: loadSheet("trump_dash.png", 10, 162, 128, 4, 14, false),
};

function ready(s: Sheet): boolean {
  return s.img.complete && s.img.naturalWidth > 0;
}

// dessine la frame f d'une sheet, ancrée pieds au sol en (x, footY)
function drawSheetFrame(s: Sheet, f: number, x: number, footY: number, hLogical: number, flip: boolean): boolean {
  if (!ready(s)) return false;
  const fi = Math.max(0, Math.min(s.frames - 1, f));
  const sx = (fi % s.cols) * s.cw;
  const sy = Math.floor(fi / s.cols) * s.ch;
  const h = hLogical;
  const w = (s.cw / s.ch) * h;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(footY));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(s.img, sx, sy, s.cw, s.ch, -w / 2, -h, w, h);
  ctx.restore();
  return true;
}

// ---------- persistance ----------

interface SaveData {
  coins: number;
  up: Record<string, number>;
  world: number;
  seed: number;
  done: number[];
  secrets: number[];
  pos: number;
}

let saveData: SaveData = {
  coins: 0,
  up: {},
  world: 1,
  seed: (Date.now() % 100000) + 7,
  done: [],
  secrets: [],
  pos: 0,
};
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null");
  if (s && typeof s.seed === "number") saveData = { ...saveData, ...s };
} catch {
  /* défauts */
}
function save(): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
}
function up(id: string): number {
  return saveData.up[id] ?? 0;
}

interface Upgrade {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  max: number;
  price: (l: number) => number;
}

const UPGRADES: Upgrade[] = [
  { id: "coeur", emoji: "❤️", name: "Cœur en or", desc: "+1 cœur maximum", max: 2, price: (l) => 60 + 60 * l },
  { id: "dash", emoji: "💨", name: "Dash présidentiel", desc: "Recharge du dash plus rapide", max: 3, price: (l) => 40 + 35 * l },
  { id: "aimant", emoji: "🧲", name: "Lobby magnétique", desc: "Attire les pièces de plus loin", max: 3, price: (l) => 30 + 30 * l },
];

// ---------- carte de monde ----------

interface MapNode {
  id: number;
  x: number; // 0..1 relatif
  y: number;
  layer: number;
  biome: Biome;
  bonus: boolean;
  final: boolean;
  edges: number[]; // ids des nœuds suivants
  secretTo: number | null; // arête cachée débloquée par la sortie secrète
}

let nodes: MapNode[] = [];

function genMap(seed: number): void {
  seedRng(seed);
  nodes = [];
  const biomes: Biome[] = ["prairie", "vent", "cristal"];
  const layerCounts = [1, rndInt(2, 3), 3, rndInt(2, 3), 1];
  let id = 0;
  const layers: MapNode[][] = [];
  for (let li = 0; li < layerCounts.length; li++) {
    const row: MapNode[] = [];
    const n = layerCounts[li];
    for (let i = 0; i < n; i++) {
      const biome = li === 0 ? "prairie" : biomes[Math.min(2, Math.floor((li - 1 + rnd() * 1.4) / 1.4))];
      row.push({
        id: id++,
        x: (li + 0.5) / layerCounts.length + (rnd() - 0.5) * 0.05,
        y: n === 1 ? 0.5 : 0.2 + (0.6 * i) / (n - 1) + (rnd() - 0.5) * 0.08,
        layer: li,
        biome,
        bonus: false,
        final: li === layerCounts.length - 1,
        edges: [],
        secretTo: null,
      });
    }
    layers.push(row);
  }
  // arêtes : chaque nœud rejoint 1-2 nœuds proches de la couche suivante,
  // et chaque nœud de la couche suivante a au moins un parent
  for (let li = 0; li < layers.length - 1; li++) {
    const next = layers[li + 1];
    for (const node of layers[li]) {
      const sorted = [...next].sort((a, b) => Math.abs(a.y - node.y) - Math.abs(b.y - node.y));
      const count = Math.min(next.length, rnd() < 0.5 ? 1 : 2);
      for (let k = 0; k < count; k++) node.edges.push(sorted[k].id);
    }
    for (const child of next) {
      if (!layers[li].some((p) => p.edges.includes(child.id))) {
        const parent = pick(layers[li]);
        parent.edges.push(child.id);
      }
    }
  }
  // nœuds bonus atteignables uniquement par une sortie secrète
  const flat = layers.flat();
  const candidates = flat.filter((n) => n.layer >= 1 && n.layer <= layers.length - 2 && !n.final);
  for (let b = 0; b < 2 && candidates.length > 0; b++) {
    const from = candidates.splice(Math.floor(rnd() * candidates.length), 1)[0];
    const bonusNode: MapNode = {
      id: id++,
      x: from.x + 0.02,
      y: from.y < 0.5 ? from.y - 0.16 : from.y + 0.16,
      layer: from.layer,
      biome: from.biome,
      bonus: true,
      final: false,
      edges: from.edges.slice(0, 1), // le bonus permet de continuer la route
      secretTo: null,
    };
    from.secretTo = bonusNode.id;
    flat.push(bonusNode);
  }
  nodes = flat;
}

function nodeById(nid: number): MapNode {
  return nodes.find((n) => n.id === nid)!;
}

// un nœud est accessible si départ, déjà fait, ou enfant d'un nœud fait
function unlocked(n: MapNode): boolean {
  if (n.layer === 0) return true;
  if (saveData.done.includes(n.id)) return true;
  return nodes.some(
    (p) =>
      (saveData.done.includes(p.id) || (p.bonus && saveData.secrets.includes(p.id))) &&
      (p.edges.includes(n.id) || (p.secretTo === n.id && saveData.secrets.includes(p.id))),
  );
}

// ---------- niveau : tuiles + entités ----------

// légende des chunks : # sol, = plateforme pleine, - plateforme traversable,
// ^ pique, o pièce, S ressort, w marcheur, f volant, k épineux,
// C checkpoint, E sortie, X sortie secrète, G orbe de gravité, . vide

const CHUNK_START = [
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "....................",
  "......o.o...........",
  "....................",
  "....................",
  "....................",
  "####################",
  "####################",
];

const CHUNK_END = [
  "....................",
  "....................",
  "....................",
  "........o...........",
  "......-----.........",
  "....................",
  "....................",
  "...o.o..............",
  "..------............",
  "....................",
  "....................",
  "..................E.",
  "....................",
  "####################",
  "####################",
];

const CHUNKS_MID = [
  [
    // routes haute et basse, piques au sol
    "....................",
    "....................",
    "....o..o..o.........",
    "...=========........",
    "....................",
    "................o...",
    "..............====..",
    ".....o..............",
    "....---.......f.....",
    "....................",
    "..w........w........",
    "....................",
    "......^^^...........",
    "####################",
    "####################",
  ],
  [
    // fosse centrale, pont haut
    "....................",
    "....................",
    "......o.o.o.o.......",
    ".....=========......",
    "....................",
    "....................",
    "...o.............o..",
    "..---..........---..",
    "....................",
    "........f...........",
    "....................",
    "..w.................",
    "......S.............",
    "######........######",
    "######........######",
  ],
  [
    // escalier + épineux au sommet
    "....................",
    "....................",
    "....................",
    "..........o.k.o.....",
    ".........========...",
    "....................",
    "......o.............",
    ".....====...........",
    "...o................",
    "..===...............",
    "...............w....",
    "....................",
    "....................",
    "####################",
    "####################",
  ],
  [
    // tunnel à trois étages (plateformes traversables)
    "....................",
    "....o...o...o...o...",
    "..----------------..",
    "....................",
    "....................",
    "..w...........k.....",
    "..----------------..",
    "....................",
    "....................",
    "......o...o.........",
    "..----------------..",
    "....................",
    "..........w.........",
    "####################",
    "####################",
  ],
  [
    // piliers et ressorts
    "....................",
    "....................",
    "....o.....o.....o...",
    "....................",
    "...===..............",
    "..........===.......",
    "....................",
    "................===.",
    "....................",
    "...S................",
    "......##......##....",
    "......##..w...##....",
    "......##......##....",
    "######################".slice(0, 20),
    "####################",
  ],
  [
    // plaine ouverte, plateformes flottantes
    "....................",
    "....................",
    "....................",
    "........o...........",
    ".......-----........",
    "....................",
    "..o.............o...",
    "..----.........----.",
    "..........f.........",
    "....................",
    "....................",
    ".....w.......w......",
    "....................",
    "####################",
    "####################",
  ],
];

const CHUNK_CHECKPOINT = [
  "....................",
  "....................",
  "....................",
  "....................",
  "........o.o.........",
  ".......------.......",
  "....................",
  "....................",
  "....................",
  "....................",
  "..........C.........",
  "....................",
  "....^^..............",
  "####################",
  "####################",
];

const CHUNK_SECRET = [
  "..........o.X.......",
  ".........=====......",
  "....................",
  "....................",
  "...S................",
  "..----..............",
  "....................",
  "....................",
  "........o.o.........",
  ".......------.......",
  "....................",
  "....................",
  "......S.....k.......",
  "####################",
  "####################",
];

// chunks cristal : sol ET plafond, l'orbe de gravité ouvre la route du haut
const CHUNKS_CRISTAL = [
  [
    "####################",
    "####################",
    "......o...o...o.....",
    "....................",
    "....................",
    "....................",
    "........G...........",
    "....................",
    "....................",
    "..w.......w.........",
    "....................",
    "....................",
    "......^^............",
    "####################",
    "####################",
  ],
  [
    "####################",
    "####################",
    "...o.............o..",
    "....................",
    "..........G.........",
    "....................",
    "......o.o.o.........",
    ".....=======........",
    "....................",
    "....................",
    "............w.......",
    "....................",
    "....k...............",
    "######........######",
    "######........######",
  ],
  [
    "####################",
    "####################",
    ".....o..o..o..o.....",
    "....................",
    "....................",
    "...G............G...",
    "....................",
    "....................",
    "........====........",
    "....o...........o...",
    "....................",
    "..w..........w......",
    "....................",
    "####################",
    "####################",
  ],
];

const enum Tile {
  Empty = 0,
  Solid = 1,
  OneWay = 2,
  Spike = 3,
  Spring = 4,
  Exit = 5,
  SecretExit = 6,
  Checkpoint = 7,
  GravOrb = 8,
}

interface Enemy {
  kind: "walker" | "flyer" | "spiky";
  x: number;
  y: number;
  vx: number;
  vy: number;
  dir: number;
  phase: number;
  baseY: number;
  dead: number; // timer d'écrasement
}

interface CoinEnt {
  x: number;
  y: number;
  taken: boolean;
}

interface WindZone {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Level {
  w: number; // en tuiles
  tiles: Uint8Array;
  enemies: Enemy[];
  coins: CoinEnt[];
  winds: WindZone[];
  biome: Biome;
  hasSecret: boolean;
}

let level: Level | null = null;

function tileAt(tx: number, ty: number): Tile {
  if (!level) return Tile.Empty;
  if (tx < 0 || tx >= level.w) return Tile.Solid;
  if (ty < 0 || ty >= LEVEL_H) return Tile.Empty;
  return level.tiles[ty * level.w + tx] as Tile;
}

function setTile(tx: number, ty: number, v: Tile): void {
  if (!level) return;
  if (tx < 0 || tx >= level.w || ty < 0 || ty >= LEVEL_H) return;
  level.tiles[ty * level.w + tx] = v;
}

function genLevel(node: MapNode, seed: number): Level {
  seedRng(seed ^ (node.id * 7919 + saveData.world * 104729));
  const biome = node.biome;
  const isCristal = biome === "cristal";
  const midPool = isCristal ? CHUNKS_CRISTAL : CHUNKS_MID;
  const midCount = node.bonus ? 2 : 3 + Math.min(2, Math.floor((saveData.world - 1) / 2) + (node.layer > 2 ? 1 : 0));

  const chunkList: string[][] = [CHUNK_START];
  const mids: string[][] = [];
  for (let i = 0; i < midCount; i++) mids.push(pick(midPool));
  // un checkpoint au milieu, et la salle secrète quelque part (pas en bonus)
  mids.splice(Math.floor(midCount / 2), 0, isCristal ? pick(CHUNKS_CRISTAL) : CHUNK_CHECKPOINT);
  const hasSecret = !node.bonus && node.secretTo !== null;
  if (hasSecret) mids.splice(rndInt(1, mids.length - 1), 0, CHUNK_SECRET);
  chunkList.push(...mids, CHUNK_END);

  const w = chunkList.length * CHUNK_W;
  const tiles = new Uint8Array(w * LEVEL_H);
  const enemies: Enemy[] = [];
  const coins: CoinEnt[] = [];
  const winds: WindZone[] = [];

  for (let c = 0; c < chunkList.length; c++) {
    const chunk = chunkList[c];
    for (let y = 0; y < LEVEL_H; y++) {
      for (let x = 0; x < CHUNK_W; x++) {
        const ch = chunk[y][x];
        const gx = c * CHUNK_W + x;
        const wx = (gx + 0.5) * T;
        const wy = (y + 0.5) * T;
        switch (ch) {
          case "#":
            tiles[y * w + gx] = Tile.Solid;
            break;
          case "=":
            tiles[y * w + gx] = Tile.Solid;
            break;
          case "-":
            tiles[y * w + gx] = Tile.OneWay;
            break;
          case "^":
            tiles[y * w + gx] = Tile.Spike;
            break;
          case "S":
            tiles[y * w + gx] = Tile.Spring;
            break;
          case "E":
            tiles[y * w + gx] = Tile.Exit;
            break;
          case "X":
            tiles[y * w + gx] = Tile.SecretExit;
            break;
          case "C":
            tiles[y * w + gx] = Tile.Checkpoint;
            break;
          case "G":
            tiles[y * w + gx] = Tile.GravOrb;
            break;
          case "o":
            coins.push({ x: wx, y: wy, taken: false });
            break;
          case "w":
            enemies.push({ kind: "walker", x: wx, y: wy, vx: 0, vy: 0, dir: rnd() < 0.5 ? -1 : 1, phase: rnd() * 7, baseY: wy, dead: 0 });
            break;
          case "f":
            enemies.push({ kind: "flyer", x: wx, y: wy, vx: 0, vy: 0, dir: 1, phase: rnd() * 7, baseY: wy, dead: 0 });
            break;
          case "k":
            enemies.push({ kind: "spiky", x: wx, y: wy, vx: 0, vy: 0, dir: rnd() < 0.5 ? -1 : 1, phase: rnd() * 7, baseY: wy, dead: 0 });
            break;
        }
      }
    }
    // biome vent : les fosses deviennent des courants ascendants
    if (biome === "vent") {
      for (let x = 0; x < CHUNK_W; x++) {
        const gx = c * CHUNK_W + x;
        if (tiles[(LEVEL_H - 1) * w + gx] === Tile.Empty && tiles[(LEVEL_H - 2) * w + gx] === Tile.Empty) {
          winds.push({ x: gx * T, y: 4 * T, w: T, h: (LEVEL_H - 4) * T });
        }
      }
    }
  }

  // pièces bonus éparpillées (niveau bonus = pluie de pièces)
  const extra = node.bonus ? 26 : 8;
  for (let i = 0; i < extra; i++) {
    const tx = rndInt(CHUNK_W, w - CHUNK_W);
    const ty = rndInt(2, LEVEL_H - 4);
    if (tiles[ty * w + tx] === Tile.Empty) coins.push({ x: (tx + 0.5) * T, y: (ty + 0.5) * T, taken: false });
  }

  // les ennemis terrestres se posent sur le sol le plus proche sous eux
  for (const e of enemies) {
    if (e.kind === "flyer") continue;
    let ty = Math.floor(e.y / T);
    while (ty < LEVEL_H - 1) {
      const below = tiles[(ty + 1) * w + Math.floor(e.x / T)];
      if (below === Tile.Solid || below === Tile.OneWay) break;
      ty++;
    }
    e.y = (ty + 1) * T - 8;
    e.baseY = e.y;
  }

  // difficulté : quelques ennemis de plus selon le monde
  const extraEnemies = Math.min(6, (saveData.world - 1) * 2 + node.layer);
  for (let i = 0; i < extraEnemies; i++) {
    const tx = rndInt(CHUNK_W + 2, w - CHUNK_W - 2);
    for (let ty = 1; ty < LEVEL_H - 1; ty++) {
      if (tiles[ty * w + tx] === Tile.Empty && (tiles[(ty + 1) * w + tx] === Tile.Solid || tiles[(ty + 1) * w + tx] === Tile.OneWay)) {
        enemies.push({
          kind: rnd() < 0.7 ? "walker" : "spiky",
          x: (tx + 0.5) * T,
          y: (ty + 0.5) * T,
          vx: 0,
          vy: 0,
          dir: rnd() < 0.5 ? -1 : 1,
          phase: rnd() * 7,
          baseY: (ty + 0.5) * T,
          dead: 0,
        });
        break;
      }
    }
  }

  return { w, tiles, enemies, coins, winds, biome, hasSecret };
}

// ---------- état ----------

type State = "title" | "map" | "play" | "dead" | "clear";
let state: State = "title";

let W = 0;
let H = 0;
let zoom = 3;

let currentNode: MapNode | null = null;

// joueur (px logiques)
let px = 0;
let py = 0;
let pvx = 0;
let pvy = 0;
let onGround = false;
let facing = 1;
let gdir = 1; // sens de la gravité (biome cristal)
let hearts = 3;
let iframes = 0;
let coyote = 0;
let jumpBuf = 0;
let landT = 0;
let jumpAnimT = 99;
let dashT = 0;
let dashCd = 0;
let dashDir = 1;
let runAnimT = 0;
let freeze = 0;
let shake = 0;
let camX = 0;
let checkpointX = 40;
let checkpointY = 0;
let levelCoins = 0;

const PW = 11;
const PH = 24;

function maxHearts(): number {
  return 3 + up("coeur");
}
function dashCooldown(): number {
  return 0.95 - up("dash") * 0.18;
}
function magnetR(): number {
  return 18 + up("aimant") * 22;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  grav: number;
}
let particles: Particle[] = [];

function burst(x: number, y: number, color: string, count: number, speed = 90, grav = 260): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.35 + Math.random() * 0.65);
    const life = 0.3 + Math.random() * 0.3;
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 25, life, max: life, size: 1 + Math.random() * 2, color, grav });
  }
}

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

// sélection sur la carte
let mapSel = 0;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  zoom = Math.max(1.8, Math.min(H / (LEVEL_H * T + 12), W / 420));
}

// ---------- transitions ----------

function showTitle(): void {
  state = "title";
  overlay.classList.remove("hidden");
  overlayTitle.textContent = "Les Mini-Mondes";
  overlayText.innerHTML =
    "Un archipel de mini-mondes générés, plein de chemins et de secrets.<br />" +
    "←→ courir · ↑/espace sauter · Maj/X dash · les sorties ⭐ ouvrent des routes cachées.<br />" +
    "Clique pour ouvrir la carte.";
  hud.classList.add("hidden");
  shopEl.classList.add("hidden");
}

function showMap(): void {
  state = "map";
  overlay.classList.add("hidden");
  shopEl.classList.add("hidden");
  hud.classList.remove("hidden");
  hudLevel.textContent = `monde ${saveData.world}`;
  mapSel = saveData.pos;
  updateHud();
}

function startLevel(node: MapNode): void {
  currentNode = node;
  level = genLevel(node, saveData.seed);
  state = "play";
  overlay.classList.add("hidden");
  shopEl.classList.add("hidden");
  hearts = maxHearts();
  gdir = 1;
  px = 40;
  py = (LEVEL_H - 3) * T;
  pvx = 0;
  pvy = 0;
  camX = 0;
  iframes = 0;
  dashT = 0;
  dashCd = 0;
  freeze = 0;
  levelCoins = 0;
  checkpointX = 40;
  checkpointY = py;
  particles = [];
  floaters = [];
  hudLevel.textContent = `${BIOMES[node.biome].name}${node.bonus ? " ★ bonus" : ""}`;
  updateHud();
}

function finishLevel(secret: boolean): void {
  if (!currentNode) return;
  if (!saveData.done.includes(currentNode.id)) saveData.done.push(currentNode.id);
  if (secret && currentNode.secretTo !== null && !saveData.secrets.includes(currentNode.id)) {
    saveData.secrets.push(currentNode.id);
    toast("⭐ Sortie secrète ! Une route cachée s'ouvre sur la carte.");
  }
  saveData.pos = currentNode.id;
  save();
  state = "clear";
  overlayTitle.textContent = secret ? "⭐ Sortie secrète !" : "Niveau terminé !";
  overlayText.innerHTML = `+${levelCoins} 🪙 · total ${Math.floor(saveData.coins)} 🪙<br />Clique pour revenir à la carte.`;
  overlay.classList.remove("hidden");

  if (currentNode.final) {
    saveData.world += 1;
    saveData.seed = (saveData.seed * 16807) % 2147483647 || 42;
    saveData.done = [];
    saveData.secrets = [];
    saveData.pos = 0;
    save();
    genMap(saveData.seed);
    overlayTitle.textContent = `🏆 Monde ${saveData.world - 1} conquis !`;
    overlayText.innerHTML = `Un nouvel archipel apparaît, plus retors…<br />+${levelCoins} 🪙 · Clique pour découvrir le monde ${saveData.world}.`;
  }
}

function die(): void {
  state = "dead";
  shake = 8;
  burst(px, py, "#ffc93c", 14, 130);
  overlayTitle.textContent = "K.O. 💥";
  overlayText.innerHTML = `Les pièces sont gardées (${Math.floor(saveData.coins)} 🪙).<br />Clique pour revenir à la carte.`;
  overlay.classList.remove("hidden");
}

// ---------- boutique ----------

function renderShop(): void {
  shopCoins.textContent = String(Math.floor(saveData.coins));
  shopItems.innerHTML = "";
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
      btn.disabled = saveData.coins < price;
      btn.addEventListener("click", () => {
        if (saveData.coins < price) return;
        saveData.coins -= price;
        saveData.up[u.id] = lvl + 1;
        save();
        toast(`${u.emoji} ${u.name} amélioré !`);
        renderShop();
        updateHud();
      });
    }
    shopItems.appendChild(btn);
  }
}

btnShop.addEventListener("click", () => {
  if (state !== "map") return;
  renderShop();
  shopEl.classList.remove("hidden");
});
btnCloseShop.addEventListener("click", () => shopEl.classList.add("hidden"));

// ---------- simulation ----------

function addCoin(x: number, y: number): void {
  saveData.coins += 1;
  levelCoins += 1;
  save();
  floaters.push({ x, y, txt: "+1", life: 0.6, color: "#ffc93c" });
  burst(x, y, "#ffc93c", 4, 60, 150);
}

function hurt(): void {
  if (iframes > 0 || dashT > 0) return;
  hearts -= 1;
  iframes = 1.1;
  shake = 6;
  freeze = Math.max(freeze, 0.05);
  burst(px, py, "#ff5c8a", 8, 100);
  pvy = -140 * gdir;
  pvx = -facing * 90;
  if (hearts <= 0) die();
  updateHud();
}

function respawnAtCheckpoint(): void {
  hurt();
  if (state !== "play") return;
  px = checkpointX;
  py = checkpointY;
  pvx = 0;
  pvy = 0;
  gdir = 1;
}

function tryJump(): void {
  jumpBuf = 0.12;
}

function tryDash(): void {
  if (state !== "play" || dashCd > 0 || dashT > 0) return;
  dashT = 0.24;
  dashCd = dashCooldown();
  dashDir = facing;
  freeze = Math.max(freeze, 0.02);
  burst(px - facing * 8, py, "#cfd5ff", 6, 70, 60);
}

function step(dt: number): void {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.life -= dt;
    f.y -= 24 * dt;
    if (f.life <= 0) floaters.splice(i, 1);
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.vy += p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  if (shake > 0) shake = Math.max(0, shake - dt * 14);

  if (state !== "play" || !level) return;
  if (freeze > 0) {
    freeze -= dt;
    return;
  }

  if (iframes > 0) iframes -= dt;
  if (coyote > 0) coyote -= dt;
  if (jumpBuf > 0) jumpBuf -= dt;
  if (landT > 0) landT -= dt;
  if (dashCd > 0) dashCd -= dt;
  jumpAnimT += dt;

  // ---- entrées ----
  let dir = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA") || keys.has("KeyQ")) dir = -1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dir = 1;
  if (dir === 0) dir = touchDir;
  if (dir !== 0 && dashT <= 0) facing = dir;

  // ---- vitesse ----
  if (dashT > 0) {
    dashT -= dt;
    pvx = dashDir * 300;
    pvy = 0;
  } else {
    const target = dir * 125;
    const accel = onGround ? 900 : 620;
    if (pvx < target) pvx = Math.min(target, pvx + accel * dt);
    else if (pvx > target) pvx = Math.max(target, pvx - accel * dt);
    pvy += 820 * gdir * dt;
    // vent ascendant
    for (const wz of level.winds) {
      if (px > wz.x && px < wz.x + wz.w && py > wz.y && py < wz.y + wz.h) {
        pvy -= 1500 * dt;
        if (Math.random() < 0.3) particles.push({ x: wz.x + Math.random() * wz.w, y: py + 30, vx: 0, vy: -120, life: 0.4, max: 0.4, size: 1.5, color: "#ffffff88", grav: 0 });
      }
    }
    pvy = Math.max(-430, Math.min(430, pvy));
  }

  const hw = PW / 2;
  const hh = PH / 2;

  // ---- collisions X ----
  px += pvx * dt;
  const y0 = Math.floor((py - hh + 1) / T);
  const y1 = Math.floor((py + hh - 1) / T);
  if (pvx > 0) {
    const tx = Math.floor((px + hw) / T);
    for (let ty = y0; ty <= y1; ty++) {
      if (tileAt(tx, ty) === Tile.Solid) {
        px = tx * T - hw - 0.01;
        pvx = 0;
        if (dashT > 0) {
          dashT = 0;
          burst(px + hw, py, "#fff3c4", 6, 90);
          shake = Math.max(shake, 2);
        }
        break;
      }
    }
  } else if (pvx < 0) {
    const tx = Math.floor((px - hw) / T);
    for (let ty = y0; ty <= y1; ty++) {
      if (tileAt(tx, ty) === Tile.Solid) {
        px = (tx + 1) * T + hw + 0.01;
        pvx = 0;
        if (dashT > 0) dashT = 0;
        break;
      }
    }
  }
  px = Math.max(hw, Math.min(level.w * T - hw, px));

  // ---- collisions Y ----
  py += pvy * dt;
  const wasGround = onGround;
  onGround = false;
  const x0 = Math.floor((px - hw + 1) / T);
  const x1 = Math.floor((px + hw - 1) / T);
  if (pvy * gdir > 0) {
    // on tombe (dans le sens de la gravité)
    const footY = gdir > 0 ? py + hh : py - hh;
    const ty = Math.floor(footY / T);
    for (let tx = x0; tx <= x1; tx++) {
      const t = tileAt(tx, ty);
      const oneWayOk =
        t === Tile.OneWay &&
        gdir > 0 &&
        py + hh - pvy * dt <= ty * T + 2; // on vient d'au-dessus
      if (t === Tile.Solid || oneWayOk) {
        if (gdir > 0) py = ty * T - hh - 0.01;
        else py = (ty + 1) * T + hh + 0.01;
        if (Math.abs(pvy) > 300) landT = 0.11;
        pvy = 0;
        onGround = true;
        coyote = 0.09;
        break;
      }
    }
  } else if (pvy * gdir < 0) {
    const headY = gdir > 0 ? py - hh : py + hh;
    const ty = Math.floor(headY / T);
    for (let tx = x0; tx <= x1; tx++) {
      if (tileAt(tx, ty) === Tile.Solid) {
        if (gdir > 0) py = (ty + 1) * T + hh + 0.01;
        else py = ty * T - hh - 0.01;
        pvy = 0;
        break;
      }
    }
  }
  if (onGround && !wasGround) burst(px, py + hh * gdir, "#ffffff55", 3, 40, 80);

  // saut (bufferisé + coyote), inversé si gravité inversée
  if (jumpBuf > 0 && (onGround || coyote > 0)) {
    pvy = -295 * gdir;
    onGround = false;
    coyote = 0;
    jumpBuf = 0;
    landT = 0;
    jumpAnimT = 0;
  }

  // sortie de l'écran dans le sens de la gravité = chute
  if ((gdir > 0 && py - hh > LEVEL_H * T + 24) || (gdir < 0 && py + hh < -24)) {
    respawnAtCheckpoint();
    return;
  }

  // ---- tuiles spéciales ----
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = Math.floor((py - hh) / T); ty <= Math.floor((py + hh) / T); ty++) {
      const t = tileAt(tx, ty);
      if (t === Tile.Spike) {
        hurt();
      } else if (t === Tile.Spring) {
        pvy = -440 * gdir;
        jumpAnimT = 0;
        burst((tx + 0.5) * T, ty * T, "#ff5c8a", 6, 90);
      } else if (t === Tile.Checkpoint) {
        if (checkpointX !== (tx + 0.5) * T) {
          checkpointX = (tx + 0.5) * T;
          checkpointY = (ty + 0.5) * T;
          toast("🚩 Checkpoint !");
          burst(checkpointX, checkpointY, "#1fc7a8", 8, 80);
        }
      } else if (t === Tile.GravOrb) {
        setTile(tx, ty, Tile.Empty);
        gdir = -gdir;
        pvy = 60 * gdir;
        shake = 3;
        freeze = Math.max(freeze, 0.04);
        burst((tx + 0.5) * T, (ty + 0.5) * T, "#63e6be", 14, 120);
        toast(gdir < 0 ? "🔮 Gravité inversée !" : "🔮 Gravité rétablie !");
      } else if (t === Tile.Exit) {
        finishLevel(false);
        return;
      } else if (t === Tile.SecretExit) {
        finishLevel(true);
        return;
      }
    }
  }

  // ---- pièces (avec aimant) ----
  for (const c of level.coins) {
    if (c.taken) continue;
    const d = Math.hypot(c.x - px, c.y - py);
    if (d < 14) {
      c.taken = true;
      addCoin(c.x, c.y);
    } else if (d < magnetR()) {
      c.x += ((px - c.x) / d) * 190 * dt;
      c.y += ((py - c.y) / d) * 190 * dt;
    }
  }

  // ---- ennemis ----
  for (const e of level.enemies) {
    if (e.dead > 0) {
      e.dead -= dt;
      continue;
    }
    if (e.kind === "walker" || e.kind === "spiky") {
      const sp = e.kind === "walker" ? 28 : 20;
      e.x += e.dir * sp * dt;
      const aheadTx = Math.floor((e.x + e.dir * 7) / T);
      const groundAhead = tileAt(aheadTx, Math.floor((e.y + 9) / T)) !== Tile.Empty;
      const wallAhead = tileAt(aheadTx, Math.floor(e.y / T)) === Tile.Solid;
      if (!groundAhead || wallAhead) e.dir *= -1;
    } else {
      e.x += Math.cos(performance.now() / 900 + e.phase) * 26 * dt;
      e.y = e.baseY + Math.sin(performance.now() / 500 + e.phase) * 18;
    }

    // collision joueur
    const er = 8;
    if (Math.abs(e.x - px) < er + hw - 1 && Math.abs(e.y - py) < er + hh - 2) {
      const stomping = gdir > 0 ? pvy > 60 && py < e.y - 4 : pvy < -60 && py > e.y + 4;
      if (dashT > 0) {
        e.dead = 0.35;
        freeze = Math.max(freeze, 0.045);
        shake = Math.max(shake, 3);
        addCoin(e.x, e.y);
        burst(e.x, e.y, "#fff3c4", 10, 130);
      } else if (stomping && e.kind !== "spiky") {
        e.dead = 0.35;
        pvy = -210 * gdir;
        jumpAnimT = 0;
        freeze = Math.max(freeze, 0.03);
        addCoin(e.x, e.y);
        burst(e.x, e.y, "#fff3c4", 8, 110);
      } else {
        hurt();
      }
    }
  }
  for (let i = level.enemies.length - 1; i >= 0; i--) {
    if (level.enemies[i].dead > 0 && level.enemies[i].dead < 0.02) level.enemies.splice(i, 1);
  }

  // animation de course
  if (onGround && Math.abs(pvx) > 20) runAnimT += dt * (Math.abs(pvx) / 125);
  else if (!onGround) runAnimT = 0;

  // caméra avec avance sur le regard
  const target = px + facing * 40 - W / zoom / 2;
  camX += (target - camX) * Math.min(1, dt * 6);
  camX = Math.max(0, Math.min(level.w * T - W / zoom, camX));
}

// ---------- rendu ----------

function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

function drawBackground(b: BiomeDef, biome: Biome): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, b.sky[0]);
  g.addColorStop(1, b.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // soleil / lune
  ctx.fillStyle = biome === "cristal" ? "#e6dbff" : "#fff3c4";
  ctx.beginPath();
  ctx.arc(W * 0.82, H * 0.16, 26, 0, Math.PI * 2);
  ctx.fill();

  // silhouettes parallaxe
  ctx.save();
  ctx.translate(-((camX * 0.25) % (W + 300)), 0);
  ctx.fillStyle = biome === "prairie" ? "#7cc576" : biome === "vent" ? "#e0b072" : "#55418a";
  for (let i = -1; i < 5; i++) {
    const bx = i * 260;
    if (biome === "vent") {
      ctx.beginPath();
      ctx.moveTo(bx, H);
      ctx.lineTo(bx + 90, H * 0.45 + (i % 2) * 40);
      ctx.lineTo(bx + 180, H);
      ctx.fill();
    } else if (biome === "cristal") {
      ctx.beginPath();
      ctx.moveTo(bx, H);
      ctx.lineTo(bx + 50, H * 0.5 + (i % 3) * 30);
      ctx.lineTo(bx + 100, H);
      ctx.moveTo(bx + 120, H);
      ctx.lineTo(bx + 150, H * 0.62);
      ctx.lineTo(bx + 190, H);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(bx + 120, H + 60, 170, Math.PI, 0);
      ctx.fill();
    }
  }
  ctx.restore();

  // nuages
  ctx.save();
  ctx.translate(-((camX * 0.5) % (W + 200)), 0);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  for (let i = -1; i < 5; i++) {
    const cx = i * 230 + 60;
    const cy = 40 + (i % 3) * 34;
    ctx.fillRect(cx, cy, 54, 12);
    ctx.fillRect(cx + 10, cy - 8, 30, 8);
  }
  ctx.restore();
}

function drawTiles(b: BiomeDef): void {
  if (!level) return;
  const tx0 = Math.max(0, Math.floor(camX / T) - 1);
  const tx1 = Math.min(level.w - 1, Math.ceil((camX + W / zoom) / T) + 1);
  const now = performance.now() / 1000;
  for (let ty = 0; ty < LEVEL_H; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = tileAt(tx, ty);
      const x = tx * T;
      const y = ty * T;
      if (t === Tile.Solid) {
        const topFree = tileAt(tx, ty - 1) !== Tile.Solid;
        ctx.fillStyle = hash2(tx, ty) < 0.5 ? b.ground : b.groundDark;
        ctx.fillRect(x, y, T, T);
        if (topFree) {
          ctx.fillStyle = b.top;
          ctx.fillRect(x, y, T, 5);
          ctx.fillStyle = b.accent;
          if (hash2(tx, ty + 7) < 0.4) ctx.fillRect(x + 3 + Math.floor(hash2(tx, 3) * 8), y - 3, 2, 3);
        }
        // le bas d'un bloc suspendu est plus sombre
        if (tileAt(tx, ty + 1) !== Tile.Solid) {
          ctx.fillStyle = "rgba(0,0,0,0.22)";
          ctx.fillRect(x, y + T - 3, T, 3);
        }
      } else if (t === Tile.OneWay) {
        ctx.fillStyle = b.groundDark;
        ctx.fillRect(x, y, T, 5);
        ctx.fillStyle = b.top;
        ctx.fillRect(x, y, T, 2);
      } else if (t === Tile.Spike) {
        ctx.fillStyle = "#dfe3ee";
        ctx.beginPath();
        ctx.moveTo(x, y + T);
        ctx.lineTo(x + T / 4, y + 3);
        ctx.lineTo(x + T / 2, y + T);
        ctx.lineTo(x + (3 * T) / 4, y + 3);
        ctx.lineTo(x + T, y + T);
        ctx.fill();
      } else if (t === Tile.Spring) {
        const sq = Math.abs(Math.sin(now * 3 + tx)) * 2;
        ctx.fillStyle = "#c0392b";
        ctx.fillRect(x + 2, y + 8 + sq, T - 4, 8 - sq);
        ctx.fillStyle = "#fffdf4";
        ctx.fillRect(x + 2, y + 6 + sq, T - 4, 3);
      } else if (t === Tile.Exit) {
        // drapeau d'arrivée
        ctx.fillStyle = "#4a445f";
        ctx.fillRect(x + 6, y - T * 2, 3, T * 3);
        ctx.fillStyle = "#ffc93c";
        const wave = Math.sin(now * 4) * 2;
        ctx.beginPath();
        ctx.moveTo(x + 9, y - T * 2);
        ctx.lineTo(x + 9 + 14, y - T * 2 + 5 + wave);
        ctx.lineTo(x + 9, y - T * 2 + 10);
        ctx.fill();
      } else if (t === Tile.SecretExit) {
        const tw = now * 5;
        ctx.fillStyle = `rgba(255, 201, 60, ${0.6 + 0.4 * Math.sin(tw)})`;
        ctx.beginPath();
        const cx = x + T / 2;
        const cy = y + T / 2;
        for (let i = 0; i < 5; i++) {
          const a = (i * 2 * Math.PI) / 5 - Math.PI / 2 + tw / 8;
          const r1 = 7;
          const r2 = 3;
          ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
          ctx.lineTo(cx + Math.cos(a + Math.PI / 5) * r2, cy + Math.sin(a + Math.PI / 5) * r2);
        }
        ctx.fill();
      } else if (t === Tile.Checkpoint) {
        ctx.fillStyle = "#4a445f";
        ctx.fillRect(x + 6, y - T, 2, T * 2);
        ctx.fillStyle = "#1fc7a8";
        ctx.beginPath();
        ctx.moveTo(x + 8, y - T);
        ctx.lineTo(x + 8 + 10, y - T + 4);
        ctx.lineTo(x + 8, y - T + 8);
        ctx.fill();
      } else if (t === Tile.GravOrb) {
        const pulse = 1 + Math.sin(now * 5 + tx) * 0.15;
        ctx.fillStyle = "#63e6be";
        ctx.beginPath();
        ctx.arc(x + T / 2, y + T / 2, 5 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#2b8a6e";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x + T / 2, y + T / 2, 7 * pulse, 0.3, Math.PI * 1.4);
        ctx.stroke();
      }
    }
  }

  // courants d'air (biome vent)
  for (const wz of level.winds) {
    if (wz.x + wz.w < camX || wz.x > camX + W / zoom) continue;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const yy = wz.y + ((now * 90 + i * 40 + wz.x * 3) % wz.h);
      const wx = wz.x + wz.w / 2 + Math.sin(now * 3 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(wx, wz.y + wz.h - (yy - wz.y));
      ctx.lineTo(wx, wz.y + wz.h - (yy - wz.y) - 8);
      ctx.stroke();
    }
  }
}

function drawEnemy(e: Enemy, b: BiomeDef): void {
  const now = performance.now() / 1000;
  ctx.save();
  ctx.translate(Math.round(e.x), Math.round(e.y));
  if (e.dead > 0) {
    // écrasé
    ctx.scale(1.3, 0.4);
    ctx.globalAlpha = Math.min(1, e.dead / 0.2);
  }
  if (e.kind === "walker") {
    const bob = Math.abs(Math.sin(now * 6 + e.phase)) * 1.5;
    ctx.fillStyle = b.accent;
    ctx.fillRect(-7, -6 - bob, 14, 12);
    ctx.fillStyle = "#17141f";
    ctx.fillRect(e.dir > 0 ? 1 : -4, -3 - bob, 3, 3);
    ctx.fillStyle = "#fffdf4";
    ctx.fillRect(e.dir > 0 ? 2 : -3, -2 - bob, 1, 1);
    ctx.fillStyle = "#17141f";
    ctx.fillRect(-6, 6, 4, 2);
    ctx.fillRect(2, 6, 4, 2);
  } else if (e.kind === "flyer") {
    const flap = Math.sin(now * 14 + e.phase);
    ctx.fillStyle = b.deco;
    ctx.fillRect(-5, -4, 10, 8);
    ctx.fillStyle = "#17141f";
    ctx.fillRect(1, -2, 2, 2);
    ctx.fillStyle = b.deco;
    ctx.save();
    ctx.scale(1, flap);
    ctx.fillRect(-11, -6, 6, 5);
    ctx.fillRect(5, -6, 6, 5);
    ctx.restore();
  } else {
    // épineux : pics tout autour, immunisé au saut
    ctx.fillStyle = "#e8590c";
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + now;
      ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
      ctx.lineTo(Math.cos(a + Math.PI / 8) * 5, Math.sin(a + Math.PI / 8) * 5);
    }
    ctx.fill();
    ctx.fillStyle = "#17141f";
    ctx.fillRect(-2, -2, 2, 2);
    ctx.fillRect(1, -2, 2, 2);
  }
  ctx.restore();
}

function drawPlayer(): void {
  if (iframes > 0 && Math.floor(performance.now() / 90) % 2 === 1) return;
  const footY = py + (PH / 2) * gdir;
  const hVis = 34;
  const flip = facing < 0;

  ctx.save();
  if (gdir < 0) {
    ctx.translate(0, Math.round(py) * 2);
    ctx.scale(1, -1);
  }

  let drawn = false;
  if (dashT > 0 || dashCd > dashCooldown() - 0.14) {
    const prog = dashT > 0 ? 1 - dashT / 0.24 : 1;
    const f = 2 + Math.floor(prog * 5);
    drawn = drawSheetFrame(SHEETS.dash, f, px, gdir > 0 ? footY : py + PH / 2, hVis, flip);
  } else if (!onGround) {
    let f = 6;
    const vy = pvy * gdir;
    if (vy < -140) f = 5;
    else if (vy < 0) f = 6;
    else if (vy < 160) f = 7;
    else f = 8;
    drawn = drawSheetFrame(SHEETS.jump, f, px, gdir > 0 ? footY : py + PH / 2, hVis, flip);
  } else if (Math.abs(pvx) > 20) {
    const f = Math.floor(runAnimT * SHEETS.run.fps) % SHEETS.run.frames;
    drawn = drawSheetFrame(SHEETS.run, f, px, gdir > 0 ? footY : py + PH / 2, hVis, flip);
  } else {
    // idle : sprite de base + respiration code
    const breathe = 1 + Math.sin(performance.now() / 420) * 0.015;
    ctx.save();
    ctx.translate(Math.round(px), Math.round(gdir > 0 ? footY : py + PH / 2));
    ctx.scale(flip ? -1 : 1, breathe);
    if (ready(SHEETS.idle)) {
      const h = hVis;
      const w = (SHEETS.idle.cw / SHEETS.idle.ch) * h;
      ctx.drawImage(SHEETS.idle.img, -w / 2, -h, w, h);
      drawn = true;
    }
    ctx.restore();
  }
  if (!drawn) {
    ctx.fillStyle = "#ffc93c";
    ctx.fillRect(px - PW / 2, py - PH / 2, PW, PH);
  }

  // écrasement à l'atterrissage : petites poussières
  if (landT > 0.06) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(px - 9, footY - 2 * gdir, 4, 2);
    ctx.fillRect(px + 5, footY - 2 * gdir, 4, 2);
  }
  ctx.restore();
}

function drawLevel(): void {
  if (!level || !currentNode) return;
  const b = BIOMES[level.biome];
  drawBackground(b, level.biome);

  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  ctx.scale(zoom, zoom);
  ctx.translate(-Math.round(camX), Math.round((H / zoom - LEVEL_H * T) / 2));

  drawTiles(b);

  const now = performance.now() / 1000;
  for (const c of level.coins) {
    if (c.taken) continue;
    if (c.x < camX - 20 || c.x > camX + W / zoom + 20) continue;
    const spin = Math.abs(Math.sin(now * 4 + c.x * 0.13));
    ctx.fillStyle = "#ffc93c";
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + Math.sin(now * 3 + c.x) * 1.5, Math.max(1.2, 5 * spin), 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#b8860b";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  for (const e of level.enemies) {
    if (e.x < camX - 30 || e.x > camX + W / zoom + 30) continue;
    drawEnemy(e, b);
  }

  drawPlayer();

  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  ctx.font = "7px 'Pixelify Sans', monospace";
  ctx.textAlign = "center";
  for (const f of floaters) {
    ctx.globalAlpha = Math.min(1, f.life * 2);
    ctx.fillStyle = f.color;
    ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // jauge de dash
  if (state === "play") {
    const dashReady = dashCd <= 0;
    ctx.fillStyle = "rgba(20,16,32,0.55)";
    ctx.fillRect(18, H - 34, 90, 14);
    ctx.fillStyle = dashReady ? "#1fc7a8" : "#6c63ff";
    const frac = dashReady ? 1 : 1 - dashCd / dashCooldown();
    ctx.fillRect(20, H - 32, 86 * frac, 10);
    ctx.fillStyle = "#fffdf4";
    ctx.font = "11px 'VT323', monospace";
    ctx.textAlign = "left";
    ctx.fillText(dashReady ? "DASH prêt (Maj/X)" : "DASH…", 114, H - 23);
  }
}

// ---------- rendu de la carte ----------

function mapNodePos(n: MapNode): [number, number] {
  return [W * 0.08 + n.x * W * 0.84, H * 0.16 + n.y * H * 0.66];
}

function drawMap(): void {
  // fond parchemin nocturne
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1d2b53");
  g.addColorStop(1, "#3a2b66");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const now = performance.now() / 1000;
  // étoiles
  for (let i = 0; i < 40; i++) {
    const sx = hash2(i, 1) * W;
    const sy = hash2(i, 2) * H * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * Math.abs(Math.sin(now + i))})`;
    ctx.fillRect(sx, sy, 2, 2);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#fffdf4";
  ctx.font = "bold 26px 'Pixelify Sans', monospace";
  ctx.fillText(`Monde ${saveData.world}`, W / 2, 44);
  ctx.font = "15px 'VT323', monospace";
  ctx.fillStyle = "#c9c3e6";
  ctx.fillText("←→↑↓ choisir · Entrée / clic jouer · ⭐ = secret trouvé", W / 2, 68);

  // arêtes
  for (const n of nodes) {
    const [x1, y1] = mapNodePos(n);
    for (const eid of n.edges) {
      const [x2, y2] = mapNodePos(nodeById(eid));
      ctx.strokeStyle = saveData.done.includes(n.id) ? "#ffc93c" : "rgba(255,255,255,0.25)";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    if (n.secretTo !== null && saveData.secrets.includes(n.id)) {
      const [x2, y2] = mapNodePos(nodeById(n.secretTo));
      ctx.strokeStyle = "#ffe066";
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);

  // nœuds
  for (const n of nodes) {
    if (n.bonus && !nodes.some((p) => p.secretTo === n.id && saveData.secrets.includes(p.id))) continue; // caché tant que non découvert
    const [x, y] = mapNodePos(n);
    const b = BIOMES[n.biome];
    const isUnlocked = unlocked(n);
    const isDone = saveData.done.includes(n.id);
    const isSel = mapSel === n.id;
    ctx.fillStyle = isUnlocked ? b.top : "#3d3d55";
    ctx.strokeStyle = isSel ? "#fffdf4" : "#17141f";
    ctx.lineWidth = isSel ? 4 : 2;
    ctx.beginPath();
    if (n.final) {
      // château final
      ctx.rect(x - 16, y - 14, 32, 28);
    } else if (n.bonus) {
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        ctx.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14);
        ctx.lineTo(x + Math.cos(a + Math.PI / 5) * 6, y + Math.sin(a + Math.PI / 5) * 6);
      }
      ctx.closePath();
    } else {
      ctx.arc(x, y, 13, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    if (isDone) {
      ctx.fillStyle = "#17141f";
      ctx.font = "bold 13px monospace";
      ctx.fillText("✓", x, y + 5);
    }
    if (n.secretTo !== null) {
      ctx.font = "11px serif";
      ctx.fillText(saveData.secrets.includes(n.id) ? "⭐" : "?", x + 15, y - 10);
    }
    if (n.final) {
      ctx.font = "16px serif";
      ctx.fillText("🏰", x, y + 6);
    }
  }

  // jeton du joueur : le héros idle posé sur le nœud courant
  const cur = nodeById(saveData.pos);
  const [pxm, pym] = mapNodePos(cur);
  const bob = Math.sin(now * 3) * 3;
  if (ready(SHEETS.idle)) {
    const h = 42;
    const w = (SHEETS.idle.cw / SHEETS.idle.ch) * h;
    ctx.drawImage(SHEETS.idle.img, pxm - w / 2, pym - 24 - h + bob, w, h);
  }
}

// navigation sur la carte
function mapMove(dx: number, dy: number): void {
  const cur = nodeById(mapSel);
  const [cx, cy] = mapNodePos(cur);
  let best: MapNode | null = null;
  let bestScore = Infinity;
  for (const n of nodes) {
    if (n.id === mapSel || !unlocked(n)) continue;
    if (n.bonus && !nodes.some((p) => p.secretTo === n.id && saveData.secrets.includes(p.id))) continue;
    const [x, y] = mapNodePos(n);
    const ddx = x - cx;
    const ddy = y - cy;
    const dot = ddx * dx + ddy * dy;
    if (dot <= 8) continue;
    const dist = Math.hypot(ddx, ddy) + Math.abs(dx !== 0 ? ddy : ddx) * 1.6;
    if (dist < bestScore) {
      bestScore = dist;
      best = n;
    }
  }
  if (best) mapSel = best.id;
}

function mapEnter(): void {
  const n = nodeById(mapSel);
  if (!unlocked(n)) {
    toast("🔒 Termine d'abord un niveau qui y mène !");
    return;
  }
  saveData.pos = n.id;
  save();
  startLevel(n);
}

// ---------- HUD ----------

function updateHud(): void {
  hudHearts.textContent = state === "play" ? "❤️".repeat(Math.max(0, hearts)) + "🖤".repeat(Math.max(0, maxHearts() - hearts)) : "";
  hudCoins.textContent = String(Math.floor(saveData.coins));
}

// ---------- entrées ----------

const JUMP_KEYS = ["ArrowUp", "Space", "KeyW", "KeyZ"];
const DASH_KEYS = ["ShiftLeft", "ShiftRight", "KeyX", "KeyK"];

window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
  if ((e.code === "Escape" || e.code === "KeyP") && state === "play") {
    paused = !paused;
    return;
  }
  if (e.repeat) return;
  if (state === "play" && !paused) {
    if (JUMP_KEYS.includes(e.code)) tryJump();
    if (DASH_KEYS.includes(e.code)) tryDash();
  } else if (state === "map") {
    if (e.code === "ArrowLeft") mapMove(-1, 0);
    if (e.code === "ArrowRight") mapMove(1, 0);
    if (e.code === "ArrowUp") mapMove(0, -1);
    if (e.code === "ArrowDown") mapMove(0, 1);
    if (e.code === "Enter" || e.code === "Space") mapEnter();
  } else if (state === "title" || state === "dead" || state === "clear") {
    if (e.code === "Enter" || e.code === "Space") showMap();
  }
  keys.add(e.code);
});
window.addEventListener("keyup", (e) => {
  if (JUMP_KEYS.includes(e.code) && state === "play" && !paused && pvy * gdir < -80) pvy *= 0.45;
  keys.delete(e.code);
});

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
  if (state === "title" || state === "dead" || state === "clear") {
    showMap();
    return;
  }
  if (state === "map") {
    // clic sur un nœud
    for (const n of nodes) {
      if (n.bonus && !nodes.some((p) => p.secretTo === n.id && saveData.secrets.includes(p.id))) continue;
      const [x, y] = mapNodePos(n);
      if (Math.hypot(e.clientX - x, e.clientY - y) < 24) {
        mapSel = n.id;
        mapEnter();
        return;
      }
    }
    return;
  }
  if (state !== "play") return;
  if (e.pointerType === "touch") {
    touchUi.classList.add("visible");
    if (e.clientY < H * 0.45) tryJump();
    else touchDir = e.clientX < W / 2 ? -1 : 1;
  }
});
canvas.addEventListener("pointerup", () => {
  touchDir = 0;
});
btnDash.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  tryDash();
});

window.addEventListener("resize", resize);
resize();

// ---------- boucle ----------

genMap(saveData.seed);
// répare une sauvegarde dont le nœud courant n'existe plus
if (!nodes.some((n) => n.id === saveData.pos)) saveData.pos = 0;
showTitle();

let last = 0;
function frame(nowMs: number): void {
  const t = nowMs / 1000;
  const dt = Math.min(0.033, Math.max(0, t - last));
  last = t;
  if (!paused) step(dt);

  if (state === "play" || state === "dead") drawLevel();
  else if (state === "map") drawMap();
  else {
    // écran titre : la carte floutée derrière
    drawMap();
    ctx.fillStyle = "rgba(20, 16, 40, 0.55)";
    ctx.fillRect(0, 0, W, H);
  }
  if (paused) {
    ctx.fillStyle = "rgba(10, 8, 22, 0.62)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fffdf4";
    ctx.font = "bold 42px 'Pixelify Sans', monospace";
    ctx.fillText("⏸ PAUSE", W / 2, H / 2 - 20);
    ctx.font = "22px 'VT323', monospace";
    ctx.fillText("clique ou P pour reprendre", W / 2, H / 2 + 20);
  }
  updateHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export {};
