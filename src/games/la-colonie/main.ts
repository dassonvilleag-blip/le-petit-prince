// La Colonie — une fourmilière en coupe, façon vivarium. On creuse, on
// construit, on élève, on part en expédition ; et la colonie vit en temps
// réel, même quand la page est fermée.

import {
  COLS,
  ROWS,
  ENTRANCE_COL,
  CREUSE_COUT,
  CREUSE_SECONDES_BASE,
  CREUSE_SECONDES_PAR_RANG,
  CHANTIERS_MAX,
  EXPEDITIONS,
  REINE,
  REINE_MAX,
  REINE_W,
  REINE_H,
  RESOURCES,
  SALLES,
  SALLE_PAR_ID,
  SYMBIOTES,
  UNITES,
  UNITE_PAR_ID,
  type Cost,
  type ResourceId,
  type RoomDef,
  type UnitId,
} from "./data";
import {
  advance,
  chantiersEnCours,
  constructible,
  creusable,
  estCreusee,
  fileMax,
  load,
  nbSalles,
  popMax,
  popTotale,
  prodParMinute,
  save,
  stockMax,
  type ColonyState,
  type RoomState,
} from "./state";
import { ameliorerReine, ameliorerSalle, construire, creuser, lancerExpedition, pondre } from "./actions";

// ---- DOM ----

const canvas = document.getElementById("colonie") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const hudRes = document.getElementById("hud-res")!;
const hudPop = document.getElementById("hud-pop")!;
const panelEl = document.getElementById("panel")!;
const panelBody = document.getElementById("panel-body")!;
const panelTitle = document.getElementById("panel-title")!;
const bandeau = document.getElementById("bandeau")!;
const toastEl = document.getElementById("toast")!;
const popupEl = document.getElementById("popup")!;
const badgeRapports = document.getElementById("badge-rapports")!;
const hint = document.getElementById("hint")!;

let W = 0;
let H = 0;

// ---- état ----

const state: ColonyState = load(Date.now());

type Mode = { type: "normal" } | { type: "dig" } | { type: "build"; def: RoomDef };
let mode: Mode = { type: "normal" };
let panelOuvert: string | null = null;
let hover: { x: number; y: number } | null = null;
const escouades = new Map<string, Record<UnitId, number>>(); // sélection par expédition

// ---- utilitaires ----

let toastTimer = 0;
function toast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2600);
}

function fmtCout(cout: Cost): string {
  const parts: string[] = [];
  for (const [r, n] of Object.entries(cout) as [ResourceId, number][])
    parts.push(`${n} ${RESOURCES[r].emoji}`);
  return parts.length ? parts.join(" · ") : "gratuit";
}

function fmtDuree(secondes: number): string {
  if (secondes < 60) return `${Math.ceil(secondes)}s`;
  if (secondes < 3600) return `${Math.floor(secondes / 60)}min ${Math.ceil(secondes % 60)}s`;
  return `${Math.floor(secondes / 3600)}h ${Math.floor((secondes % 3600) / 60)}min`;
}

function resteMs(fin: number): string {
  return fmtDuree(Math.max(0, fin - Date.now()) / 1000);
}

// ---- géométrie de la grille ----

let cell = 40;
let gridX = 0;
let gridY = 0; // haut de la rangée 0 (niveau du sol)

function layout(): void {
  cell = Math.min((W * 0.94) / COLS, (H * 0.66) / ROWS);
  gridX = (W - cell * COLS) / 2;
  gridY = H * 0.2;
}

function cellAt(px: number, py: number): { x: number; y: number } | null {
  const x = Math.floor((px - gridX) / cell);
  const y = Math.floor((py - gridY) / cell);
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return null;
  return { x, y };
}

// ---- fourmis décoratives ----

interface Fourmi {
  x: number; // position en cellules (fractionnaire)
  y: number;
  tx: number; // cible
  ty: number;
  vitesse: number;
  surface: boolean;
  feuille: boolean; // porte une feuille (surface)
}

const fourmis: Fourmi[] = [];

function cellulesCreusees(): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) if (estCreusee(state, x, y)) out.push({ x, y });
  return out;
}

function syncFourmis(): void {
  const visibles = Math.min(14, Math.max(2, popTotale(state)));
  while (fourmis.length < visibles) {
    const surface = Math.random() < 0.45;
    fourmis.push({
      x: ENTRANCE_COL,
      y: surface ? -0.5 : 1,
      tx: ENTRANCE_COL,
      ty: surface ? -0.5 : 1,
      vitesse: 0.5 + Math.random() * 0.7,
      surface,
      feuille: false,
    });
  }
  if (fourmis.length > visibles) fourmis.length = visibles;
}

function bougeFourmis(dt: number): void {
  const creusees = cellulesCreusees();
  for (const f of fourmis) {
    const dx = f.tx - f.x;
    const dy = f.ty - f.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.05) {
      if (f.surface) {
        // aller-retour entre l'entrée et un point de la surface
        f.feuille = !f.feuille && Math.random() < 0.7;
        f.tx = f.feuille ? ENTRANCE_COL + (Math.random() - 0.5) * 0.6 : Math.random() * COLS;
        f.ty = -0.45 - Math.random() * 0.25;
      } else if (creusees.length > 0) {
        // marche aléatoire vers une cellule creusée voisine de la position
        const ici = creusees.filter((c) => Math.abs(c.x - f.x) + Math.abs(c.y - f.y) < 2.5);
        const cible = (ici.length && Math.random() < 0.8 ? ici : creusees)[
          Math.floor(Math.random() * (Math.random() < 0.8 && ici.length ? ici.length : creusees.length))
        ];
        f.tx = cible.x + 0.2 + Math.random() * 0.6;
        f.ty = cible.y + 0.3 + Math.random() * 0.5;
      }
    } else {
      f.x += (dx / d) * f.vitesse * dt;
      f.y += (dy / d) * f.vitesse * dt;
    }
  }
}

// ---- rendu ----

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layout();
}

// petit bruit stable pour les mouchetures de la terre
function speckle(i: number): number {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

function drawFond(t: number): void {
  // ciel
  const ciel = ctx.createLinearGradient(0, 0, 0, gridY);
  ciel.addColorStop(0, "#8ecae6");
  ciel.addColorStop(1, "#d4ecdd");
  ctx.fillStyle = ciel;
  ctx.fillRect(0, 0, W, gridY);

  // soleil
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.arc(W * 0.82, gridY * 0.35, Math.min(34, gridY * 0.3), 0, Math.PI * 2);
  ctx.fill();

  // terre
  const terre = ctx.createLinearGradient(0, gridY, 0, H);
  terre.addColorStop(0, "#7a5230");
  terre.addColorStop(0.5, "#5e3d22");
  terre.addColorStop(1, "#432b17");
  ctx.fillStyle = terre;
  ctx.fillRect(0, gridY, W, H - gridY);

  // mouchetures (cailloux, racines)
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  for (let i = 0; i < 140; i++) {
    const sx = speckle(i) * W;
    const sy = gridY + speckle(i + 500) * (H - gridY);
    const r = 1 + speckle(i + 900) * 2.5;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // herbe
  ctx.fillStyle = "#588157";
  ctx.fillRect(0, gridY - 7, W, 9);
  ctx.strokeStyle = "#3a5a40";
  ctx.lineWidth = 2;
  for (let i = 0; i < W; i += 9) {
    const h = 5 + speckle(i) * 9;
    const sway = Math.sin(t * 1.4 + i * 0.4) * 1.6;
    ctx.beginPath();
    ctx.moveTo(i, gridY - 5);
    ctx.lineTo(i + sway, gridY - 5 - h);
    ctx.stroke();
  }

  // dôme de l'entrée
  ctx.fillStyle = "#6b4423";
  ctx.beginPath();
  const ex = gridX + (ENTRANCE_COL + 0.5) * cell;
  ctx.ellipse(ex, gridY - 4, cell * 0.9, cell * 0.5, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#2a1a0e";
  ctx.beginPath();
  ctx.ellipse(ex, gridY - 3, cell * 0.32, cell * 0.3, 0, Math.PI, 0);
  ctx.fill();
}

function cavite(x: number, y: number, w: number, h: number): void {
  const px = gridX + x * cell;
  const py = gridY + y * cell;
  const r = cell * 0.22;
  ctx.beginPath();
  ctx.roundRect(px + 2, py + 2, w * cell - 4, h * cell - 4, r);
  ctx.fill();
}

function drawGrille(t: number): void {
  // tunnels creusés
  ctx.fillStyle = "#2e1d10";
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      if (!state.dug[y * COLS + x]) continue;
      cavite(x, y, 1, 1);
      // jonctions avec les cellules creusées voisines pour un réseau continu
      if (x + 1 < COLS && estCreusee(state, x + 1, y))
        ctx.fillRect(gridX + (x + 0.6) * cell, gridY + (y + 0.25) * cell, cell * 0.8, cell * 0.5);
      if (y + 1 < ROWS && estCreusee(state, x, y + 1))
        ctx.fillRect(gridX + (x + 0.25) * cell, gridY + (y + 0.6) * cell, cell * 0.5, cell * 0.8);
    }

  // creusages en cours
  for (const d of state.digs) {
    const px = gridX + d.x * cell;
    const py = gridY + d.y * cell;
    const total = (CREUSE_SECONDES_BASE + CREUSE_SECONDES_PAR_RANG * d.y) * 1000;
    const avancement = Math.min(1, Math.max(0, 1 - (d.fin - Date.now()) / total));
    ctx.fillStyle = "rgba(46,29,16,0.55)";
    cavite(d.x, d.y, 1, 1);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(px + 4, py + cell - 8, (cell - 8) * avancement, 4);
    ctx.font = `${cell * 0.4}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⛏️", px + cell / 2, py + cell / 2 + Math.sin(t * 8) * 1.5);
  }

  // salles
  for (const room of state.rooms) {
    const est = room.type === "reine";
    const def = est ? null : SALLE_PAR_ID.get(room.type)!;
    const w = est ? REINE_W : def!.w;
    const h = est ? REINE_H : def!.h;
    const px = gridX + room.x * cell;
    const py = gridY + room.y * cell;

    ctx.fillStyle = room.level === 0 ? "rgba(46,29,16,0.6)" : "#3b2717";
    cavite(room.x, room.y, w, h);
    if (room.level > 0) {
      ctx.fillStyle = "rgba(255,209,102,0.08)";
      cavite(room.x, room.y, w, h);
    }

    ctx.font = `${cell * (est ? 1.0 : 0.8)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(est ? "👑" : def!.emoji, px + (w * cell) / 2, py + (h * cell) / 2);

    // pastilles de niveau
    if (room.level > 0 && !est) {
      ctx.fillStyle = "#ffd166";
      for (let i = 0; i < room.level; i++) {
        ctx.beginPath();
        ctx.arc(px + 10 + i * 9, py + h * cell - 10, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (est) {
      ctx.font = `bold ${cell * 0.28}px "VT323", monospace`;
      ctx.fillStyle = "#ffd166";
      ctx.fillText(`niv. ${state.reineLevel}`, px + (w * cell) / 2, py + h * cell - cell * 0.22);
      if (state.reineChantierFin !== null) {
        ctx.font = `${cell * 0.4}px sans-serif`;
        ctx.fillText("✨", px + (w * cell) / 2 + cell * 0.8, py + cell * 0.4);
      }
    }

    // chantier en cours
    if (room.chantierFin !== null) {
      ctx.font = `${cell * 0.45}px sans-serif`;
      ctx.fillText("🔨", px + w * cell - cell * 0.35, py + cell * 0.35 + Math.sin(t * 8) * 2);
    }
  }

  // surbrillances selon le mode
  if (mode.type === "dig") {
    const pulse = 0.35 + 0.25 * Math.sin(t * 5);
    ctx.strokeStyle = `rgba(255,209,102,${pulse})`;
    ctx.lineWidth = 2;
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (creusable(state, x, y))
          ctx.strokeRect(gridX + x * cell + 3, gridY + y * cell + 3, cell - 6, cell - 6);
  }
  if (mode.type === "build" && hover) {
    const { w, h } = mode.def;
    const ok = constructible(state, hover.x, hover.y, w, h);
    ctx.fillStyle = ok ? "rgba(128,222,120,0.35)" : "rgba(230,80,70,0.35)";
    ctx.fillRect(gridX + hover.x * cell, gridY + hover.y * cell, w * cell, h * cell);
    ctx.font = `${cell * 0.7}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.7;
    ctx.fillText(mode.def.emoji, gridX + (hover.x + w / 2) * cell, gridY + (hover.y + h / 2) * cell);
    ctx.globalAlpha = 1;
  }
}

function drawFourmis(): void {
  for (const f of fourmis) {
    const px = gridX + (f.x + 0.5) * cell;
    const py = gridY + (f.y + 0.5) * cell;
    const r = Math.max(2.2, cell * 0.07);
    ctx.fillStyle = "#1d1208";
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.arc(px + r * 1.4 * Math.sign(f.tx - f.x || 1), py, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    if (f.feuille) {
      ctx.font = `${cell * 0.28}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("🍃", px, py - r * 2.2);
    }
  }
}

let lastT = 0;
function frame(ms: number): void {
  const t = ms / 1000;
  const dt = Math.min(0.05, t - lastT);
  lastT = t;
  bougeFourmis(dt);
  ctx.clearRect(0, 0, W, H);
  drawFond(t);
  drawGrille(t);
  drawFourmis();
  requestAnimationFrame(frame);
}

// ---- HUD ----

function renderHUD(): void {
  const cap = stockMax(state);
  const prod = prodParMinute(state);
  hudRes.innerHTML = (Object.keys(RESOURCES) as ResourceId[])
    .map((r) => {
      const visible = r !== "miellat" || state.symbiotes.includes("pucerons") || state.res.miellat > 0;
      if (!visible) return "";
      return `<span class="pill" title="${RESOURCES[r].nom} — +${prod[r].toFixed(1)}/min">${RESOURCES[r].emoji} ${Math.floor(state.res[r])}<small>/${cap}</small></span>`;
    })
    .join("");
  hudPop.innerHTML = `🐜 ${popTotale(state)}<small>/${popMax(state)}</small> · ⛏️ ${chantiersEnCours(state)}<small>/${CHANTIERS_MAX}</small>`;
  const nonLus = state.rapports.filter((r) => !r.lu).length;
  badgeRapports.textContent = nonLus ? String(nonLus) : "";
  badgeRapports.classList.toggle("show", nonLus > 0);
}

// ---- panneaux ----

function fermerPanel(): void {
  panelOuvert = null;
  panelEl.classList.remove("show");
  popupEl.classList.remove("show");
}

function ouvrirPanel(id: string, titre: string, html: string): void {
  panelOuvert = id;
  panelTitle.textContent = titre;
  panelBody.innerHTML = html;
  panelEl.classList.add("show");
  popupEl.classList.remove("show");
}

function setMode(m: Mode, message?: string): void {
  mode = m;
  bandeau.classList.toggle("show", m.type !== "normal");
  if (message) bandeau.querySelector("span")!.textContent = message;
  if (m.type !== "normal") fermerPanel();
}

function panelConstruire(): void {
  const html = SALLES.map((def) => {
    const n = nbSalles(state, def.id);
    const max = def.maxParReine[state.reineLevel - 1];
    const bloqueSymbiote = def.symbioteRequis && !state.symbiotes.includes(def.symbioteRequis);
    const bloqueMax = n >= max;
    const dispo = !bloqueSymbiote && !bloqueMax;
    const raison = bloqueSymbiote
      ? "réservée aux alliés du Cercle I — voir les expéditions"
      : bloqueMax
        ? max === 0
          ? "la Reine doit gagner un niveau"
          : `limite atteinte (${n}/${max})`
        : `${fmtCout(def.niveaux[0].cout)} · ${fmtDuree(def.niveaux[0].secondes)} · ${def.w}×${def.h}`;
    return `<button class="carte ${dispo ? "" : "off"}" data-salle="${def.id}" ${dispo ? "" : "disabled"}>
      <span class="carte-emoji">${def.emoji}</span>
      <span class="carte-corps"><b>${def.nom}</b><small>${def.description}</small><small class="carte-cout">${raison}</small></span>
    </button>`;
  }).join("");
  ouvrirPanel(
    "construire",
    "🏗️ Construire",
    `${html}<button class="carte" data-action="mode-creuser">
      <span class="carte-emoji">⛏️</span>
      <span class="carte-corps"><b>Creuser un tunnel</b><small>Étend les galeries, cellule par cellule.</small><small class="carte-cout">${CREUSE_COUT} 🍃 · ${CREUSE_SECONDES_BASE}s + profondeur</small></span>
    </button>`
  );
}

function panelNurserie(): void {
  const enFile = state.queue
    .map((q, i) => {
      const def = UNITE_PAR_ID.get(q.unit)!;
      const reste = i === 0 && q.fin != null ? ` — ${resteMs(q.fin)}` : "";
      return `<span class="pill">${def.emoji} ${def.nom}${reste}</span>`;
    })
    .join(" ");
  const html = UNITES.map(
    (def) => `<button class="carte" data-pondre="${def.id}">
      <span class="carte-emoji">${def.emoji}</span>
      <span class="carte-corps"><b>${def.nom}</b><small>${def.description}</small><small class="carte-cout">${fmtCout(def.cout)} · ${fmtDuree(def.secondes)}</small></span>
    </button>`
  ).join("");
  ouvrirPanel(
    "nurserie",
    "🥚 Nurserie",
    `<p class="note">File : ${state.queue.length}/${fileMax(state)} · Colonie : ${popTotale(state)}/${popMax(state)}</p>
     ${html}
     <div class="file">${enFile || "<small>Aucun œuf en couveuse.</small>"}</div>`
  );
}

function panelExpeditions(): void {
  const enCours = state.expeditions
    .map((e) => {
      const def = EXPEDITIONS.find((d) => d.id === e.defId)!;
      return `<div class="carte off"><span class="carte-emoji">${def.emoji}</span>
        <span class="carte-corps"><b>${def.nom}</b><small>escouade en route — retour dans ${resteMs(e.fin)}</small></span></div>`;
    })
    .join("");

  const dispo = EXPEDITIONS.filter((d) => !(d.recrute && state.symbiotes.includes(d.recrute)))
    .map((def) => {
      if (!escouades.has(def.id)) escouades.set(def.id, { ouvriere: 0, soldate: 0 });
      const esc = escouades.get(def.id)!;
      const bloque = state.reineLevel < def.reineMin;
      const force = esc.ouvriere * UNITE_PAR_ID.get("ouvriere")!.force + esc.soldate * UNITE_PAR_ID.get("soldate")!.force;
      const jauge = force === 0 ? "" : force >= def.difficulte * 1.2 ? "🟢 sûr" : force >= def.difficulte ? "🟡 jouable" : "🔴 risqué";
      const offrande = def.offrande ? ` · offrande ${fmtCout(def.offrande)}` : "";
      return `<div class="carte ${bloque ? "off" : ""}">
        <span class="carte-emoji">${def.emoji}</span>
        <span class="carte-corps">
          <b>${def.nom}</b><small>${def.description}</small>
          <small class="carte-cout">durée ${fmtDuree(def.secondes)} · difficulté ${def.difficulte}${offrande}</small>
          ${
            bloque
              ? `<small class="carte-cout">👑 Reine niv. ${def.reineMin} requise</small>`
              : `<span class="steppers">
                  ${UNITES.map(
                    (u) => `<span class="stepper">${u.emoji}
                      <button data-esc="${def.id}" data-unit="${u.id}" data-delta="-1">−</button>
                      <b>${esc[u.id]}</b>
                      <button data-esc="${def.id}" data-unit="${u.id}" data-delta="1">+</button>
                    </span>`
                  ).join("")}
                  <span class="jauge">${jauge}</span>
                  <button class="go" data-partir="${def.id}">Partir</button>
                </span>`
          }
        </span>
      </div>`;
    })
    .join("");
  ouvrirPanel("expeditions", "🗺️ Expéditions", `${enCours}${dispo}`);
}

function panelCercles(): void {
  const parCercle = new Map<number, string[]>();
  for (const sp of SYMBIOTES) {
    const recrutee = state.symbiotes.includes(sp.id);
    const etat = recrutee ? "✅ alliée de la colonie" : sp.disponible ? `🎯 ${sp.effort}` : "🌫️ à venir";
    const carte = `<div class="carte ${recrutee ? "" : "off"}">
      <span class="carte-emoji">${sp.emoji}</span>
      <span class="carte-corps"><b>${sp.nom}</b><small>${sp.apporte}</small><small class="carte-cout">${etat}</small></span>
    </div>`;
    if (!parCercle.has(sp.cercle)) parCercle.set(sp.cercle, []);
    parCercle.get(sp.cercle)!.push(carte);
  }
  const html = [...parCercle.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(
      ([c, cartes]) =>
        `<p class="note">Cercle ${"I".repeat(c).replace("IIII", "IV")} — ${c === 1 ? "la confiance facile" : c === 2 ? "il faudra faire ses preuves" : c === 3 ? "les alliances coûteuses" : "les légendes du jardin"}</p>${cartes.join("")}`
    )
    .join("");
  ouvrirPanel(
    "cercles",
    "🕸️ Cercles de symbiose",
    `<p class="note">Chaque insecte du jardin peut rejoindre la colonie. Plus le cercle est haut, plus l'effort est grand — et une espèce jamais recrutée reste une adversaire.</p>${html}`
  );
}

function panelRapports(): void {
  const html = state.rapports.length
    ? state.rapports
        .map(
          (r) => `<div class="carte"><span class="carte-emoji">${r.emoji}</span>
          <span class="carte-corps"><b>${r.titre}</b>${r.lignes.map((l) => `<small>${l}</small>`).join("")}</span></div>`
        )
        .join("")
    : `<p class="note">Aucun rapport pour l'instant — envoie une escouade en expédition !</p>`;
  for (const r of state.rapports) r.lu = true;
  ouvrirPanel("rapports", "📜 Rapports d'expédition", html);
  renderHUD();
}

// popup d'une salle cliquée
function ouvrirPopup(room: RoomState): void {
  fermerPanel();
  let html: string;
  if (room.type === "reine") {
    const suivant = state.reineLevel < REINE_MAX ? REINE[state.reineLevel] : null;
    html = `<b>👑 Chambre de la Reine — niv. ${state.reineLevel}</b>
      <small>Le cœur de la colonie. Son niveau autorise salles, expéditions et cercles.</small>
      ${
        state.reineChantierFin !== null
          ? `<small>✨ Mue en cours — ${resteMs(state.reineChantierFin)}</small>`
          : suivant
            ? `<button class="go" data-ameliorer-reine>Passer niv. ${state.reineLevel + 1} — ${fmtCout(suivant.cout)} · ${fmtDuree(suivant.secondes)}</button>`
            : `<small>La Reine règne au sommet.</small>`
      }`;
  } else {
    const def = SALLE_PAR_ID.get(room.type)!;
    const suivant = room.level < def.niveaux.length ? def.niveaux[room.level] : null;
    const prodTxt =
      def.prodRes && room.level > 0
        ? `<small>Production : ${def.niveaux[room.level - 1].prodParMinute} ${RESOURCES[def.prodRes].emoji}/min</small>`
        : "";
    html = `<b>${def.emoji} ${def.nom}${room.level > 0 ? ` — niv. ${room.level}` : ""}</b>
      <small>${def.description}</small>${prodTxt}
      ${
        room.chantierFin !== null
          ? `<small>🔨 Chantier — ${resteMs(room.chantierFin)}</small>`
          : suivant
            ? room.level >= state.reineLevel
              ? `<small>👑 La Reine doit d'abord gagner un niveau.</small>`
              : `<button class="go" data-ameliorer="${room.uid}">Améliorer — ${fmtCout(suivant.cout)} · ${fmtDuree(suivant.secondes)}</button>`
            : `<small>Niveau maximum atteint.</small>`
      }`;
  }
  popupEl.innerHTML = html;
  popupEl.classList.add("show");
}

// re-rendu du panneau ouvert (compteurs, timers)
function rafraichirPanel(): void {
  if (panelOuvert === "nurserie") panelNurserie();
  else if (panelOuvert === "expeditions") panelExpeditions();
}

// ---- boucle de jeu ----

function tick(): void {
  const evts = advance(state, Date.now());
  for (const e of evts) toast(e);
  if (evts.length) {
    syncFourmis();
    rafraichirPanel();
  }
  renderHUD();
  if (panelOuvert === "nurserie" || panelOuvert === "expeditions") rafraichirPanel();
}

// ---- interactions ----

canvas.addEventListener("pointermove", (ev) => {
  hover = cellAt(ev.clientX, ev.clientY);
});

canvas.addEventListener("pointerdown", (ev) => {
  hint.classList.add("hidden");
  const c = cellAt(ev.clientX, ev.clientY);
  if (!c) {
    fermerPanel();
    return;
  }
  if (mode.type === "dig") {
    const err = creuser(state, c.x, c.y, Date.now());
    if (err) toast(err);
    else renderHUD();
    return;
  }
  if (mode.type === "build") {
    const err = construire(state, mode.def.id, c.x, c.y, Date.now());
    if (err) toast(err);
    else {
      toast(`${mode.def.emoji} Chantier lancé !`);
      setMode({ type: "normal" });
      renderHUD();
    }
    return;
  }
  const room = state.rooms.find((r) => {
    const def = r.type === "reine" ? { w: REINE_W, h: REINE_H } : SALLE_PAR_ID.get(r.type)!;
    return c.x >= r.x && c.x < r.x + def.w && c.y >= r.y && c.y < r.y + def.h;
  });
  if (room) ouvrirPopup(room);
  else fermerPanel();
});

document.addEventListener("click", (ev) => {
  const el = ev.target as HTMLElement;
  const btn = el.closest("button, [data-action]") as HTMLElement | null;
  if (!btn) return;

  if (btn.dataset.ouvre) {
    hint.classList.add("hidden");
    const id = btn.dataset.ouvre;
    if (panelOuvert === id) return fermerPanel();
    setMode({ type: "normal" });
    if (id === "construire") panelConstruire();
    else if (id === "nurserie") panelNurserie();
    else if (id === "expeditions") panelExpeditions();
    else if (id === "cercles") panelCercles();
    else if (id === "rapports") panelRapports();
    return;
  }
  if (btn.dataset.action === "fermer") return fermerPanel();
  if (btn.dataset.action === "annuler-mode") return setMode({ type: "normal" });
  if (btn.dataset.action === "mode-creuser")
    return setMode({ type: "dig" }, "⛏️ Touche une case de terre collée aux galeries — Échap pour annuler");
  if (btn.dataset.salle) {
    const def = SALLE_PAR_ID.get(btn.dataset.salle)!;
    return setMode({ type: "build", def }, `${def.emoji} Touche la terre pour placer la ${def.nom} (${def.w}×${def.h})`);
  }
  if (btn.dataset.pondre) {
    const err = pondre(state, btn.dataset.pondre as UnitId, Date.now());
    if (err) toast(err);
    panelNurserie();
    renderHUD();
    return;
  }
  if (btn.dataset.esc) {
    const esc = escouades.get(btn.dataset.esc)!;
    const unit = btn.dataset.unit as UnitId;
    const delta = Number(btn.dataset.delta);
    esc[unit] = Math.max(0, Math.min(state.units[unit], esc[unit] + delta));
    panelExpeditions();
    return;
  }
  if (btn.dataset.partir) {
    const esc = escouades.get(btn.dataset.partir)!;
    const err = lancerExpedition(state, btn.dataset.partir, esc, Date.now());
    if (err) toast(err);
    else {
      toast("🐜 L'escouade s'ébranle !");
      escouades.set(btn.dataset.partir, { ouvriere: 0, soldate: 0 });
      syncFourmis();
    }
    panelExpeditions();
    renderHUD();
    return;
  }
  if (btn.dataset.ameliorer) {
    const err = ameliorerSalle(state, Number(btn.dataset.ameliorer), Date.now());
    if (err) toast(err);
    else toast("🔨 Chantier lancé !");
    popupEl.classList.remove("show");
    renderHUD();
    return;
  }
  if ("ameliorerReine" in btn.dataset) {
    const err = ameliorerReine(state, Date.now());
    if (err) toast(err);
    else toast("✨ La Reine entame sa mue…");
    popupEl.classList.remove("show");
    renderHUD();
    return;
  }
});

window.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") {
    setMode({ type: "normal" });
    fermerPanel();
  }
});

// ---- sauvegarde ----

window.setInterval(() => save(state, Date.now()), 10_000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") save(state, Date.now());
});
window.addEventListener("pagehide", () => save(state, Date.now()));

// ---- démarrage ----

window.addEventListener("resize", resize);
resize();

{
  // rattrapage du temps passé loin de la colonie
  const avant = { ...state.res };
  const absence = Date.now() - state.savedAt;
  const evts = advance(state, Date.now());
  if (absence > 90_000) {
    const gains = (Object.keys(avant) as ResourceId[])
      .map((r) => ({ r, n: Math.floor(state.res[r] - avant[r]) }))
      .filter((g) => g.n > 0)
      .map((g) => `+${g.n} ${RESOURCES[g.r].emoji}`);
    const morceaux = [...gains, ...evts];
    if (morceaux.length) toast(`Pendant ton absence : ${morceaux.slice(0, 4).join(" · ")}`);
  }
}

syncFourmis();
renderHUD();
window.setInterval(tick, 1000);
requestAnimationFrame(frame);
