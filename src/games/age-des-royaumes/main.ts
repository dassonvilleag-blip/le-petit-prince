// L'Âge des Royaumes — un Age of Empires dans le navigateur. Étapes 1 et 2 :
// l'économie, puis l'armée et les âges. Ce fichier affiche la partie en
// isométrique et traduit la souris et le clavier en ordres pour sim.ts.
// Bâtiments et nature : sprites rendus depuis les modèles 3D KayKit (sprites.ts).
// shortcut: unités encore dessinées au canvas en attendant leurs sprites.

import { AGES, BATIMENTS, ECONOMIQUES, MILITAIRES, NATURE, RESSOURCES, UNITES, type BatimentId, type Cout, type Ressource, type UniteId } from "./data.ts";
import {
  annulerFormation,
  attaquer,
  avancerPartie,
  batimentEn,
  batimentsPourAge,
  construire,
  coutDe,
  dureeDe,
  ennemis,
  explore,
  fixerRalliement,
  former,
  nouvellePartie,
  ordonner,
  peutFormer,
  peutPayer,
  peutPoser,
  popActuelle,
  popMaxi,
  supprimer,
  visible,
  type Batiment,
  type Formation,
  type Noeud,
  type Unite,
} from "./sim.ts";
import { creerIA, NIVEAUX, penser, type Niveau } from "./ia.ts";
import { SPRITES } from "./sprites.ts";

const TW = 64; // largeur d'une case à l'écran
const TH = 32;

const ICONE: Record<Ressource, string> = { nourriture: "🍖", bois: "🪵", or: "🪙", pierre: "🪨" };
const TEINTE: Record<Ressource, string> = { nourriture: "#d94f3d", bois: "#8b5a2b", or: "#e6b422", pierre: "#9aa0a6" };
const EMBLEME: Record<BatimentId, string> = { hotel: "🏰", maison: "🏠", bucheron: "🪓", mineur: "⛏️", moulin: "🌾", ferme: "🌱", caserne: "⚔️", archerie: "🏹", ecurie: "🐎" };
const ICONE_UNITE: Record<UniteId, string> = { villageois: "🧑‍🌾", milicien: "🗡️", lancier: "🔱", archer: "🏹", tirailleur: "🎯", archerMonte: "🏇", eclaireur: "🐴", chevalier: "🛡️", loup: "🐺" };
const COULEUR_CAMP = ["#2a5bd7", "#c0392b"];
const MOI = 0; // le camp du joueur

// Ce que forme un bâtiment, dans l'ordre de la grille (Q, W, E…).
const formations = (t: BatimentId): Formation[] => [
  ...(Object.keys(UNITES) as UniteId[]).filter((u) => UNITES[u].lieu === t),
  ...(t === "hotel" ? (["age"] as const) : []),
];
const iconeDe = (f: Formation) => (f === "age" ? "⏫" : ICONE_UNITE[f]);

const canvas = document.getElementById("carte") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const barre = document.getElementById("barre")!;
const panneau = document.getElementById("panneau")!;
const intro = document.getElementById("intro")!;
const bulle = document.getElementById("bulle")!;

const p = nouvellePartie();
let ia = creerIA(1); // remplacée au lancement, selon le niveau choisi
const atlas = new Image();
atlas.src = "/sprites/royaumes.webp";
const moi = p.camps[MOI];
const T = p.taille;

// ---------- caméra ----------

let W = 0;
let H = 0;
const cam = { x: 0, y: 0 }; // position du coin nord de la carte, en pixels avant zoom
let zoom = 1;
let dpr = 1;

const iso = (x: number, y: number) => ({ x: (x - y) * (TW / 2) + cam.x, y: (x + y) * (TH / 2) + cam.y });
function monde(sx: number, sy: number) {
  const dx = (sx - cam.x) / (TW / 2);
  const dy = (sy - cam.y) / (TH / 2);
  return { x: (dx + dy) / 2, y: (dy - dx) / 2 };
}

function centrerSur(x: number, y: number): void {
  cam.x = W / zoom / 2 - (x - y) * (TW / 2);
  cam.y = H / zoom / 2 - (x + y) * (TH / 2);
}

function borner(): void {
  const c = monde(W / zoom / 2, H / zoom / 2);
  centrerSur(Math.min(Math.max(c.x, 0), T), Math.min(Math.max(c.y, 0), T));
}

function redimensionner(): void {
  const c = W ? monde(W / zoom / 2, H / zoom / 2) : null;
  dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  if (c) centrerSur(c.x, c.y);
}

// ---------- le sol ----------

// Une nuance fixe par case, parmi quelques verts doux comme ceux de KayKit.
const COULEURS_SOL = Array.from({ length: 8 }, (_, k) => `hsl(${86 + k}, 50%, ${44 + k / 2}%)`);
const nuance = Uint8Array.from({ length: T * T }, (_, i) => {
  const h = Math.sin((i % T) * 12.9898 + Math.floor(i / T) * 78.233) * 43758.5453;
  return Math.floor((h - Math.floor(h)) * COULEURS_SOL.length);
});

// Pave les cases à l'écran d'un losange chacune, un seul tracé par couleur ;
// `couleur` rend l'indice dans `couleurs`, ou -1 pour laisser la case vide.
function paver(couleurs: readonly string[], couleur: (i: number) => number): void {
  const coins = [monde(0, 0), monde(W / zoom, 0), monde(0, H / zoom), monde(W / zoom, H / zoom)];
  const xs = coins.map((c) => c.x);
  const ys = coins.map((c) => c.y);
  const [x0, x1] = [Math.max(0, Math.floor(Math.min(...xs)) - 1), Math.min(T - 1, Math.ceil(Math.max(...xs)) + 1)];
  const [y0, y1] = [Math.max(0, Math.floor(Math.min(...ys)) - 1), Math.min(T - 1, Math.ceil(Math.max(...ys)) + 1)];
  const seaux: number[][] = couleurs.map(() => []);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) seaux[couleur(y * T + x)]?.push(y * T + x);
  seaux.forEach((cases, k) => {
    ctx.fillStyle = couleurs[k];
    ctx.beginPath();
    for (const i of cases) {
      const a = iso(i % T, Math.floor(i / T));
      ctx.moveTo(a.x, a.y - 0.5);
      ctx.lineTo(a.x + TW / 2 + 0.5, a.y + TH / 2);
      ctx.lineTo(a.x, a.y + TH + 0.5);
      ctx.lineTo(a.x - TW / 2 - 0.5, a.y + TH / 2);
      ctx.closePath();
    }
    ctx.fill();
  });
}

// ---------- dessin ----------

function losange(x: number, y: number, w: number, h = w): void {
  const a = iso(x, y);
  const b = iso(x + w, y);
  const c = iso(x + w, y + h);
  const d = iso(x, y + h);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
}

// Ce qui a été dessiné à la dernière image, dans l'ordre : on vise au pixel près.
type Visable = Unite | Batiment | Noeud;
const dessines: { objet: Visable; nom: string; x: number; y: number }[] = []; // x, y : coin haut-gauche à l'écran
let objetDessine: Visable | null = null; // l'objet dont on dessine les sprites

// Le sprite `nom` posé sur ce point du sol, décalé de (dx, dy) pixels ; false s'il manque.
function sprite(nom: string, x: number, y: number, dx = 0, dy = 0): boolean {
  const s = SPRITES[nom];
  if (!s || !atlas.complete) return false;
  const c = iso(x, y);
  const x0 = c.x + dx - s[4] / 2; // l'atlas est rendu en 2x
  const y0 = c.y + dy - s[5] / 2;
  ctx.drawImage(atlas, s[0], s[1], s[2], s[3], x0, y0, s[2] / 2, s[3] / 2);
  if (objetDessine) dessines.push({ objet: objetDessine, nom, x: x0, y: y0 });
  return true;
}

// Une copie lisible de l'atlas, pour savoir si un pixel est plein ou transparent.
const lecteur = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
atlas.addEventListener("load", () => {
  lecteur.canvas.width = atlas.width;
  lecteur.canvas.height = atlas.height;
  lecteur.drawImage(atlas, 0, 0);
});

// L'objet dessiné sous ce point écran, le plus en avant, parmi ceux qui passent `ok`.
// Les ombres (à moitié transparentes) ne comptent pas.
function objetSous(x: number, y: number, ok: (o: Visable) => boolean = () => true): Visable | undefined {
  for (let k = dessines.length - 1; k >= 0; k--) {
    const d = dessines[k];
    const s = SPRITES[d.nom];
    const px = Math.floor((x - d.x) * 2);
    const py = Math.floor((y - d.y) * 2);
    if (px < 0 || py < 0 || px >= s[2] || py >= s[3] || !ok(d.objet)) continue;
    if (lecteur.getImageData(s[0] + px, s[1] + py, 1, 1).data[3] > 110) return d.objet;
  }
}
const estUnite = (o: Visable): o is Unite => "tache" in o;
const estBatiment = (o: Visable): o is Batiment => "file" in o;

const spriteNoeud = (n: Noeud) =>
  n.nature === "arbre" ? `arbre${"AB"[n.id % 2]}` : n.nature === "baies" ? `baies${"AB"[n.id % 2]}` : `${n.nature}${"ABCDE"[n.id % 5]}`;

function spriteBatiment(b: Batiment): string {
  if (b.type === "ferme") return b.fini ? "ferme" : "fondation-3";
  if (!b.fini) return `chantier${"ABC"[Math.min(2, Math.floor((b.construit / BATIMENTS[b.type].duree) * 3))]}-${taille(b)}`;
  return b.type === "maison" && b.id % 2 ? `maisonB-${b.camp}` : `${b.type}-${b.camp}`;
}

function barreProgres(cx: number, cy: number, f: number, couleur = "#7ee07a", w = 40): void {
  ctx.fillStyle = "rgba(0,0,0,.6)";
  ctx.fillRect(cx - w / 2, cy, w, 5);
  ctx.fillStyle = couleur;
  ctx.fillRect(cx - w / 2 + 1, cy + 1, (w - 2) * Math.max(0, f), 3);
}

const couleurPv = (f: number) => (f > 0.5 ? "#7ee07a" : f > 0.25 ? "#e6b422" : "#e0453a");

const taille = (b: Batiment) => BATIMENTS[b.type].taille;

function dessinerBatiment(b: Batiment, choisi: boolean): void {
  const def = BATIMENTS[b.type];
  const t = def.taille;
  if (choisi) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    losange(b.x, b.y, t);
    ctx.stroke();
  }
  const c = iso(b.x + t / 2, b.y + t / 2);
  sprite(spriteBatiment(b), b.x + t / 2, b.y + t / 2);
  if (!b.fini) barreProgres(c.x, c.y + 6, b.construit / def.duree);
  else if (b.file.length) barreProgres(c.x, c.y + 10, b.chrono / dureeDe(p, b.file[0], b.camp), "#7fb6ff");
  if (b.fini && b.pv < def.pv) barreProgres(c.x, c.y + 18, b.pv / def.pv, couleurPv(b.pv / def.pv));
}

const aCheval = (u: Unite) => UNITES[u.type].classe === "cavalerie" || u.type === "archerMonte";

// Où regarde chaque unité et quand elle a bougé pour la dernière fois, pour l'animer.
const allures = new Map<number, { x: number; y: number; dir: number; bouge: number }>();
const directionEcran = (dx: number, dy: number) => (Math.round(Math.atan2((dx + dy) / 2, dx - dy) / (Math.PI / 4)) + 8) % 8;

// Ce sur quoi l'unité travaille ou tape, pour se tourner vers lui.
function viseeDe(u: Unite): { x: number; y: number } | null {
  const t = u.tache;
  if (t.type !== "recolter" && t.type !== "construire" && t.type !== "attaquer") return null;
  const c = p.unites.get(t.cible) ?? p.batiments.get(t.cible) ?? p.noeuds.get(t.cible);
  if (!c) return null;
  const w = "tache" in c ? 0 : "type" in c ? taille(c) : 1;
  return { x: c.x + w / 2, y: c.y + w / 2 };
}

function dessinerUnite(u: Unite, choisi: boolean): void {
  const c = iso(u.x, u.y);
  const d = UNITES[u.type];
  const cheval = aCheval(u);
  const saut = u.tache.type !== "rien" ? Math.abs(Math.sin(p.temps * 8 + u.id)) * 2 : 0;
  ctx.fillStyle = SPRITES[`${u.type}-repos-0-0`] ? `color-mix(in srgb, ${COULEUR_CAMP[u.camp] ?? "#777"} 60%, transparent)` : "rgba(0,0,0,.25)";
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, cheval ? 11 : 8, cheval ? 5 : 4, 0, 0, Math.PI * 2);
  ctx.fill();
  if (choisi) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  if (SPRITES[`${u.type}-repos-0-0`]) {
    const a = allures.get(u.id) ?? { x: u.x, y: u.y, dir: 1, bouge: -1 };
    allures.set(u.id, a);
    const vise = viseeDe(u);
    if (u.x !== a.x || u.y !== a.y) {
      a.dir = directionEcran(u.x - a.x, u.y - a.y);
      a.bouge = p.temps;
    } else if (vise) a.dir = directionEcran(vise.x - u.x, vise.y - u.y);
    a.x = u.x;
    a.y = u.y;
    const marche = p.temps - a.bouge < 0.2;
    const nom = marche ? `marche-${a.dir}-${Math.floor(p.temps * 6) % 8}` : vise ? `action-${a.dir}-${Math.floor(p.temps * 4) % 6}` : `repos-${a.dir}-0`;
    sprite(`${u.type}-${nom}`, u.x, u.y);
    if (u.charge && u.charge.n >= 1 && !sprite(`charge-${u.charge.res}`, u.x, u.y, 7, -12)) {
      ctx.fillStyle = TEINTE[u.charge.res];
      ctx.fillRect(c.x + 5, c.y - 22, 5, 5);
    }
    if (choisi || u.pv < d.pv) barreProgres(c.x, c.y - 44, u.pv / d.pv, couleurPv(u.pv / d.pv), 20);
    return;
  }
  let y = c.y - saut;
  if (u.type === "loup") {
    ctx.fillStyle = "#6f6a64";
    ctx.beginPath();
    ctx.ellipse(c.x, y - 7, 9, 5, 0, 0, Math.PI * 2);
    ctx.arc(c.x + 8, y - 11, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(c.x - 6, y - 4, 2, 4);
    ctx.fillRect(c.x + 4, y - 4, 2, 4);
  } else {
    if (cheval) {
      ctx.fillStyle = "#6b4426";
      ctx.beginPath();
      ctx.ellipse(c.x, y - 9, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(c.x - 8, y - 6, 2, 6);
      ctx.fillRect(c.x + 6, y - 6, 2, 6);
      ctx.fillRect(c.x + 8, y - 18, 4, 9);
      y -= 9;
    }
    ctx.fillStyle = COULEUR_CAMP[u.camp] ?? "#777";
    ctx.fillRect(c.x - 4, y - 15, 8, 12);
    ctx.fillStyle = d.classe === "villageois" || u.type === "tirailleur" || u.type === "archer" ? "#f1c9a0" : "#9aa0a6"; // casque
    ctx.beginPath();
    ctx.arc(c.x, y - 19, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5b3a1e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (d.portee) ctx.arc(c.x + 5, y - 11, 6, -Math.PI / 2, Math.PI / 2); // arc
    else if (u.type === "lancier") {
      ctx.moveTo(c.x + 6, y - 1);
      ctx.lineTo(c.x + 6, y - 30);
    } else if (d.classe !== "villageois") {
      ctx.strokeStyle = "#cfd4da"; // épée
      ctx.moveTo(c.x + 5, y - 8);
      ctx.lineTo(c.x + 10, y - 19);
    }
    ctx.stroke();
    if (u.charge && u.charge.n >= 1) {
      ctx.fillStyle = TEINTE[u.charge.res];
      ctx.fillRect(c.x + 3, y - 14, 5, 5);
    }
  }
  if (choisi || u.pv < d.pv) barreProgres(c.x, c.y - (cheval ? 44 : 32), u.pv / d.pv, couleurPv(u.pv / d.pv), 20);
}

// Le trait d'une flèche qui vient de partir.
function dessinerTirs(): void {
  ctx.strokeStyle = "rgba(255,240,190,.9)";
  ctx.lineWidth = 1.5;
  for (const u of p.unites.values()) {
    if (!UNITES[u.type].portee || p.temps - u.coup > 0.3 || u.tache.type !== "attaquer" || !visible(p, u.x, u.y)) continue;
    const cible = p.unites.get(u.tache.cible) ?? p.batiments.get(u.tache.cible);
    if (!cible) continue;
    const w = "tache" in cible ? 0 : taille(cible);
    const a = iso(u.x, u.y);
    const b = iso(cible.x + w / 2, cible.y + w / 2);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - (aCheval(u) ? 22 : 14));
    ctx.lineTo(b.x, b.y - 12);
    ctx.stroke();
  }
  for (const b of p.batiments.values()) {
    const cible = b.tir && p.temps - b.tir.t < 0.3 ? p.unites.get(b.tir.cible) : undefined;
    if (!cible || !explore(p, b.x, b.y)) continue;
    const a = iso(b.x + taille(b) / 2, b.y + taille(b) / 2);
    const c = iso(cible.x, cible.y);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - 60);
    ctx.lineTo(c.x, c.y - 12);
    ctx.stroke();
  }
}

// ---------- sélection & ordres ----------

let choix: number[] = []; // unités choisies
let choixBat: Batiment | null = null;
let choixNoeud: Noeud | null = null;
let pose: BatimentId | null = null;
let menu: "eco" | "militaire" | null = null; // F et G ouvrent les bâtiments, comme dans AoE II DE
let modeRalliement = false;
const souris = { x: 0, y: 0, dedans: false }; // en pixels écran
let glisse: { x: number; y: number } | null = null;
let clique: { x: number; y: number; t: number } | null = null; // le petit repère du clic droit

function choisir(unites: number[], bat: Batiment | null = null, noeud: Noeud | null = null): void {
  choix = unites;
  choixBat = bat;
  choixNoeud = noeud;
  pose = null;
  menu = null;
  modeRalliement = false;
  majPanneau(true);
}

const aMoi = (u: Unite) => u.camp === MOI;
const villageoisChoisis = () => choix.filter((id) => p.unites.get(id)?.type === "villageois");

function casePose(type: BatimentId) {
  const m = monde(souris.x / zoom, souris.y / zoom);
  const t = BATIMENTS[type].taille;
  return { x: Math.floor(m.x - t / 2 + 0.5), y: Math.floor(m.y - t / 2 + 0.5) };
}

let bulleChrono = 0;
function dire(msg: string): void {
  bulle.textContent = msg;
  bulle.classList.add("visible");
  clearTimeout(bulleChrono);
  bulleChrono = window.setTimeout(() => bulle.classList.remove("visible"), 1800);
}

// La case visée : celle de l'arbre, de la mine ou du bâtiment dessiné sous la souris, sinon le sol.
function caseVisee(x: number, y: number) {
  const o = objetSous(x, y, (o) => !estUnite(o));
  if (o) return { x: Math.floor(o.x), y: Math.floor(o.y) };
  const m = monde(x, y);
  return { x: Math.floor(m.x), y: Math.floor(m.y) };
}

let dernierClic = { t: 0, id: 0 };
function clic(x: number, y: number, maj: boolean): void {
  if (pose) {
    const c = casePose(pose);
    if (!peutPayer(p, BATIMENTS[pose].cout)) return dire("Pas assez de ressources");
    if (!construire(p, pose, c.x, c.y, villageoisChoisis())) return dire("Impossible de bâtir ici");
    if (!maj) pose = null;
    return majPanneau(true);
  }
  if (modeRalliement && choixBat) {
    const c = caseVisee(x, y);
    fixerRalliement(p, choixBat.id, c.x, c.y);
    modeRalliement = false;
    return majPanneau(true);
  }
  const o = objetSous(x, y, (o) => !estUnite(o) || aMoi(o));
  const v = o && estUnite(o) ? o : undefined;
  if (v) {
    // double-clic : toutes les unités de ce type à l'écran
    const double = performance.now() - dernierClic.t < 350 && dernierClic.id === v.id;
    dernierClic = { t: performance.now(), id: v.id };
    if (double) return choisirZone({ x: 0, y: 0 }, { x: W, y: H }, false, v.type);
    if (!maj) return choisir([v.id]);
    return choisir(choix.includes(v.id) ? choix.filter((id) => id !== v.id) : [...choix, v.id]);
  }
  if (o && estBatiment(o)) return choisir([], o);
  choisir([], null, o && !estUnite(o) ? o : null);
}

// a et b en pixels écran
function choisirZone(a: { x: number; y: number }, b: { x: number; y: number }, maj: boolean, type?: UniteId): void {
  const [x0, x1] = [Math.min(a.x, b.x) / zoom, Math.max(a.x, b.x) / zoom];
  const [y0, y1] = [Math.min(a.y, b.y) / zoom, Math.max(a.y, b.y) / zoom];
  const ids = [...p.unites.values()]
    .filter((u) => {
      const c = iso(u.x, u.y);
      return aMoi(u) && (!type || u.type === type) && c.x >= x0 && c.x <= x1 && c.y - 10 >= y0 && c.y - 10 <= y1;
    })
    .map((u) => u.id);
  choisir(maj ? [...new Set([...choix, ...ids])] : ids);
}

// Clic droit : attaquer l'ennemi visé, sinon travailler ou marcher ; un
// bâtiment qui forme des unités y pose son point de ralliement.
function ordreDroit(x: number, y: number): void {
  if (pose || menu || modeRalliement) {
    pose = null;
    menu = null;
    modeRalliement = false;
    return majPanneau(true);
  }
  const ennemi = choix.length ? objetSous(x, y, (o) => estUnite(o) && ennemis(o.camp, MOI)) : undefined;
  if (ennemi) {
    attaquer(p, choix, ennemi.id);
    clique = { x: ennemi.x, y: ennemi.y, t: 0.6 };
    return;
  }
  const c = caseVisee(x, y);
  const b = batimentEn(p, c.x, c.y);
  if (choix.length && b && ennemis(b.camp, MOI) && explore(p, b.x, b.y)) attaquer(p, choix, b.id);
  else if (choix.length) ordonner(p, choix, c.x, c.y);
  else if (choixBat?.camp === MOI && formations(choixBat.type).length) fixerRalliement(p, choixBat.id, c.x, c.y);
  else return;
  clique = { x: c.x + 0.5, y: c.y + 0.5, t: 0.6 };
}

canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("mousedown", (e) => {
  if (enPause) return;
  if (e.button === 0) glisse = { x: e.clientX, y: e.clientY };
  if (e.button === 2) ordreDroit(e.clientX / zoom, e.clientY / zoom);
});
window.addEventListener("mouseup", (e) => {
  if (e.button !== 0 || !glisse) return;
  const g = glisse;
  glisse = null;
  if (Math.hypot(e.clientX - g.x, e.clientY - g.y) < 6) clic(e.clientX / zoom, e.clientY / zoom, e.shiftKey);
  else if (!pose) choisirZone(g, { x: e.clientX, y: e.clientY }, e.shiftKey);
});
canvas.addEventListener("mousemove", (e) => {
  souris.x = e.clientX;
  souris.y = e.clientY;
  souris.dedans = true;
});
canvas.addEventListener("mouseleave", () => (souris.dedans = false));

// Molette : zoom autour du curseur, comme dans AoE II DE.
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const avant = monde(e.clientX / zoom, e.clientY / zoom);
    zoom = Math.min(1.6, Math.max(0.5, zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
    const apres = iso(avant.x, avant.y);
    cam.x += e.clientX / zoom - apres.x;
    cam.y += e.clientY / zoom - apres.y;
    borner();
  },
  { passive: false },
);

// ---------- raccourcis d'AoE II DE (grille) ----------
// Les lettres de la grille sont des positions sur le clavier (e.code) : sur un
// AZERTY, « Q » est la touche A. L'interface affiche la lettre de ton clavier.

let disposition: Map<string, string> | null = null;
(navigator as Navigator & { keyboard?: { getLayoutMap(): Promise<Map<string, string>> } }).keyboard
  ?.getLayoutMap()
  .then((m) => {
    disposition = m;
    document.querySelectorAll<HTMLElement>("[data-code]").forEach((el) => (el.textContent = touche(el.dataset.code!)));
    majPanneau(true);
  })
  .catch(() => {});
const touche = (code: string) => (disposition?.get(code) ?? code.replace("Key", "")).toUpperCase();

// La grille : la n-ième commande d'un menu est sur la n-ième de ces touches.
const GRILLE = ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyA", "KeyS"];
const MENUS = { eco: ECONOMIQUES, militaire: MILITAIRES };

const groupes = new Map<string, { unites: number[]; bat: number | null }>();
let dernierGroupe = { code: "", t: 0 };

function allerAuGroupe(unites: number[], bat: Batiment | null): void {
  const v = unites.map((id) => p.unites.get(id)).find(Boolean);
  if (v) centrerSur(v.x, v.y);
  else if (bat) centrerSur(bat.x + taille(bat) / 2, bat.y + taille(bat) / 2);
}

const fleches = new Set<string>();
window.addEventListener("keydown", (e) => {
  if (!enCours) return;
  // F10 : le menu, F3 : la pause, comme dans AoE II
  if (e.key === "F10" || e.key === "F3") {
    e.preventDefault();
    return e.key === "F10" ? mettrePause(menuJeu.hidden, true) : mettrePause(!enPause);
  }
  if (enPause) {
    if (e.key === "Escape") mettrePause(false);
    return;
  }
  if (e.key.startsWith("Arrow")) {
    fleches.add(e.key);
    e.preventDefault();
    return;
  }
  if (e.key === "Escape") {
    if (pose || menu || modeRalliement) {
      pose = null;
      menu = null;
      modeRalliement = false;
      return majPanneau(true);
    }
    return choisir([]);
  }
  // groupes : Ctrl+chiffre crée, chiffre choisit, deux fois de suite centre
  const chiffre = e.code.match(/^Digit(\d)$/)?.[1];
  if (chiffre) {
    e.preventDefault();
    if (e.ctrlKey) {
      groupes.set(chiffre, { unites: [...choix], bat: choixBat?.id ?? null });
      return dire(`Groupe ${chiffre} créé`);
    }
    const g = groupes.get(chiffre);
    if (!g) return;
    const bat = g.bat !== null ? (p.batiments.get(g.bat) ?? null) : null;
    const ids = g.unites.filter((id) => p.unites.has(id));
    choisir(ids, ids.length ? null : bat);
    if (e.shiftKey || (dernierGroupe.code === chiffre && performance.now() - dernierGroupe.t < 400)) allerAuGroupe(ids, bat);
    dernierGroupe = { code: chiffre, t: performance.now() };
    return;
  }
  if (e.key === "." || e.code === "Period") return villageoisOisif();
  if (e.code === "KeyH") {
    const hotels = [...p.batiments.values()].filter((b) => b.type === "hotel" && b.camp === MOI);
    if (!hotels.length) return;
    const h = hotels[(hotels.indexOf(choixBat!) + 1) % hotels.length];
    choisir([], h);
    return centrerSur(h.x + 2, h.y + 2);
  }
  if (e.key === "Delete") {
    const cibles = choix.length ? (e.shiftKey ? choix : choix.slice(0, 1)) : choixBat ? [choixBat.id] : [];
    cibles.forEach((id) => supprimer(p, id));
    return majPanneau(true);
  }
  if (villageoisChoisis().length) {
    if (e.code === "KeyF" || e.code === "KeyG") {
      menu = e.code === "KeyF" ? "eco" : "militaire";
      return majPanneau(true);
    }
    const t = menu ? MENUS[menu][GRILLE.indexOf(e.code)] : undefined;
    if (t) return choisirPose(t);
  }
  if (choixBat?.fini && choixBat.camp === MOI) {
    const f = formations(choixBat.type)[GRILLE.indexOf(e.code)];
    if (f) {
      for (let i = 0; i < (e.shiftKey && f !== "age" ? 5 : 1); i++) if (!lancer(choixBat, f)) break;
      return majPanneau(true);
    }
    if (e.code === "KeyT" && formations(choixBat.type).length) {
      modeRalliement = true;
      return dire("Clique où les unités formées doivent aller");
    }
  }
});

function choisirPose(t: BatimentId): void {
  if (BATIMENTS[t].age > moi.age) return dire(`Il faut l'${AGES[BATIMENTS[t].age].nom.toLowerCase()}`);
  if (!peutPayer(p, BATIMENTS[t].cout)) return dire("Pas assez de ressources");
  pose = t;
  majPanneau(true);
}

// Met en file, ou dit pourquoi c'est impossible ; false si refusé.
function lancer(b: Batiment, f: Formation): boolean {
  if (former(p, b.id, f)) return true;
  if (f === "age" && moi.age + 1 >= AGES.length) dire("Dernier âge atteint pour l'instant");
  else if (f === "age" && batimentsPourAge(p) < 2) dire(`Il faut 2 bâtiments parmi : ${AGES[moi.age + 1].requis.map((t) => BATIMENTS[t].nom).join(", ")}`);
  else if (f === "age" && !peutPayer(p, coutDe(p, f))) dire("Pas assez de ressources");
  else if (f === "age") dire("Déjà en cours");
  else if (UNITES[f].age > moi.age) dire(`Il faut l'${AGES[UNITES[f].age].nom.toLowerCase()}`);
  else dire("Pas assez de ressources");
  return false;
}
window.addEventListener("keyup", (e) => fleches.delete(e.key));
window.addEventListener("blur", () => fleches.clear());

let oisifRang = 0;
function villageoisOisif(): void {
  const oisifs = [...p.unites.values()].filter((u) => aMoi(u) && u.type === "villageois" && u.tache.type === "rien");
  if (!oisifs.length) return dire("Personne ne chôme");
  const v = oisifs[oisifRang++ % oisifs.length];
  choisir([v.id]);
  centrerSur(v.x, v.y);
}

function defiler(dt: number): void {
  const vit = (900 * dt) / zoom;
  let dx = 0;
  let dy = 0;
  if (fleches.has("ArrowLeft")) dx += vit;
  if (fleches.has("ArrowRight")) dx -= vit;
  if (fleches.has("ArrowUp")) dy += vit;
  if (fleches.has("ArrowDown")) dy -= vit;
  if (souris.dedans && !glisse) {
    if (souris.x < 14) dx += vit;
    if (souris.x > W - 14) dx -= vit;
    if (souris.y < 14) dy += vit;
    if (souris.y > H - 14) dy -= vit;
  }
  cam.x += dx;
  cam.y += dy;
  borner();
}

// ---------- interface ----------

const coutTexte = (c: Cout) => (Object.keys(c) as Ressource[]).map((r) => `${c[r]} ${ICONE[r]}`).join(" ");
const kbd = (code: string) => `<kbd>${touche(code)}</kbd>`;

panneau.addEventListener("pointerdown", (e) => {
  const btn = (e.target as HTMLElement).closest("button");
  if (!btn || btn.disabled) return;
  const [action, arg] = (btn.dataset.action ?? "").split(":");
  if (action === "menu") menu = arg as "eco" | "militaire";
  else if (action === "retour") menu = null;
  else if (action === "bâtir") return choisirPose(arg as BatimentId);
  else if (action === "former" && choixBat) lancer(choixBat, arg as Formation);
  else if (action === "annuler" && choixBat) annulerFormation(p, choixBat.id);
  else if (action === "ralliement") {
    modeRalliement = true;
    dire("Clique où les unités formées doivent aller");
  }
  majPanneau(true);
});

const ageRequis = (age: number) => (age > moi.age ? `<small>${AGES[age].nom}</small>` : "");

function boutonsBatir(liste: BatimentId[]): string {
  return liste
    .map((t, i) => {
      const def = BATIMENTS[t];
      const ok = def.age <= moi.age && peutPayer(p, def.cout);
      return `<button type="button" data-action="bâtir:${t}" ${ok ? "" : "disabled"} class="${pose === t ? "actif" : ""}" title="${def.nom}"><span class="emb">${EMBLEME[t]}</span><span>${def.nom} ${kbd(GRILLE[i])}</span>${ageRequis(def.age) || `<small>${coutTexte(def.cout)}</small>`}</button>`;
    })
    .join("");
}

function boutonsFormer(b: Batiment): string {
  return formations(b.type)
    .map((f, i) => {
      if (f === "age") {
        const suivant = AGES[moi.age + 1];
        if (!suivant) return "";
        return `<button type="button" data-action="former:age" ${peutFormer(p, b, f) ? "" : "disabled"}><span class="emb">⏫</span><span>${suivant.nom} ${kbd(GRILLE[i])}</span><small>${coutTexte(suivant.cout)}</small></button>`;
      }
      const d = UNITES[f];
      return `<button type="button" data-action="former:${f}" ${peutFormer(p, b, f) ? "" : "disabled"}><span class="emb">${ICONE_UNITE[f]}</span><span>${d.nom} ${kbd(GRILLE[i])}</span>${ageRequis(d.age) || `<small>${coutTexte(d.cout)}</small>`}</button>`;
    })
    .join("");
}

let cleAvant = "";
function majPanneau(force = false): void {
  choix = choix.filter((id) => p.unites.has(id));
  if (choixBat && !p.batiments.has(choixBat.id)) choixBat = null;
  if (choixNoeud && !p.noeuds.has(choixNoeud.id)) choixNoeud = null;
  const b = choixBat;
  const unites = choix.map((id) => p.unites.get(id)!);
  const finis = [...p.batiments.values()].filter((x) => x.fini).length;
  const cle = [choix.join(), unites.map((u) => `${Math.ceil(u.pv)}/${Math.floor(u.charge?.n ?? 0)}`).join(), menu, b?.id, b?.file.join(), b?.fini, b && Math.floor(b.construit), b && Math.ceil(b.pv), b && Math.floor(b.reste), choixNoeud && Math.floor(choixNoeud.reste), RESSOURCES.map((r) => Math.floor(moi.stock[r])).join(), pose, moi.age, finis, popActuelle(p) >= popMaxi(p)].join("|");
  if (!force && cle === cleAvant) return;
  cleAvant = cle;

  let html = "";
  if (choix.length) {
    const parType = new Map<UniteId, number>();
    for (const u of unites) parType.set(u.type, (parType.get(u.type) ?? 0) + 1);
    html = `<h2>${[...parType].map(([t, n]) => `${ICONE_UNITE[t]} ${n > 1 ? `${n} × ` : ""}${UNITES[t].nom}`).join(" · ")}</h2>`;
    if (unites.length === 1) {
      const u = unites[0];
      const d = UNITES[u.type];
      html += `<p>❤️ ${Math.ceil(u.pv)}/${d.pv} · ⚔️ ${d.attaque}${d.portee ? ` (portée ${d.portee})` : ""} · 🛡️ ${d.armure.join("/")}`;
      if (u.charge && u.charge.n >= 1) html += ` · porte ${Math.floor(u.charge.n)} ${ICONE[u.charge.res]}`;
      html += `</p>`;
    }
    if (villageoisChoisis().length) {
      html += `<div class="actions">`;
      if (!menu) {
        html += `<button type="button" data-action="menu:eco"><span class="emb">🔨</span><span>Bâtiments économiques</span><small>${kbd("KeyF")}</small></button>`;
        html += `<button type="button" data-action="menu:militaire"><span class="emb">⚔️</span><span>Bâtiments militaires</span><small>${kbd("KeyG")}</small></button>`;
      } else {
        html += boutonsBatir(MENUS[menu]);
        html += `<button type="button" data-action="retour"><span class="emb">↩</span><span>Retour</span><small><kbd>Échap</kbd></small></button>`;
      }
      html += `</div>`;
    }
  } else if (b) {
    const def = BATIMENTS[b.type];
    html = `<h2>${EMBLEME[b.type]} ${def.nom}</h2>`;
    if (!b.fini) html += `<p>En construction : ${Math.floor((b.construit / def.duree) * 100)} %</p>`;
    else if (b.type === "ferme") html += `<p>Reste ${Math.floor(b.reste)} ${ICONE.nourriture}</p>`;
    else html += `<p>❤️ ${Math.ceil(b.pv)}/${def.pv}${def.depot.length && b.type !== "hotel" ? ` · dépôt ${def.depot.map((r) => ICONE[r]).join(" ")}` : ""}${def.pop && b.type !== "hotel" ? ` · loge ${def.pop}` : ""}</p>`;
    if (b.camp !== MOI) html += `<p class="alerte">Ennemi</p>`;
    else if (b.fini && formations(b.type).length) {
      html += `<div class="actions">${boutonsFormer(b)}`;
      html += `<button type="button" data-action="ralliement"><span class="emb">🚩</span><span>Ralliement ${kbd("KeyT")}</span><small>ou clic droit</small></button>`;
      if (b.file.length) html += `<button type="button" data-action="annuler"><span class="emb">✖</span><span>Annuler le dernier</span><small>rembourse</small></button>`;
      html += `</div>`;
      if (b.file.length) html += `<p>En file : ${b.file.map(iconeDe).join(" ")}</p>`;
      if (b.file.some((f) => f !== "age") && popActuelle(p) >= popMaxi(p)) html += `<p class="alerte">Population au max : bâtis des maisons 🏠</p>`;
      if (b.type === "hotel" && AGES[moi.age + 1] && batimentsPourAge(p) < 2)
        html += `<p>${AGES[moi.age + 1].nom} : ${batimentsPourAge(p)}/2 bâtiments parmi ${AGES[moi.age + 1].requis.map((t) => BATIMENTS[t].nom).join(", ")}</p>`;
    }
  } else if (choixNoeud) {
    const n = NATURE[choixNoeud.nature];
    html = `<h2>${n.nom}</h2><p>Reste ${Math.floor(choixNoeud.reste)} ${ICONE[n.res]}</p>`;
  }
  panneau.innerHTML = html;
  panneau.hidden = !html;
}

const barreEls = Object.fromEntries(
  [...RESSOURCES, "pop", "age", "temps"].map((k) => {
    const el = document.createElement("span");
    barre.append(el);
    return [k, el];
  }),
) as Record<Ressource | "pop" | "age" | "temps", HTMLSpanElement>;
const oisifBtn = document.createElement("button");
oisifBtn.type = "button";
oisifBtn.title = "Villageois oisif (.)";
oisifBtn.addEventListener("click", villageoisOisif);
barre.append(oisifBtn);
const menuBtn = document.createElement("button");
menuBtn.type = "button";
menuBtn.title = "Menu (F10)";
menuBtn.textContent = "☰";
menuBtn.addEventListener("click", () => enCours && mettrePause(true, true));
barre.append(menuBtn);

function majBarre(): void {
  for (const r of RESSOURCES) barreEls[r].textContent = `${ICONE[r]} ${Math.floor(moi.stock[r])}`;
  const plein = popActuelle(p) >= popMaxi(p);
  barreEls.pop.textContent = `👥 ${popActuelle(p)}/${popMaxi(p)}`;
  barreEls.pop.classList.toggle("alerte", plein);
  barreEls.age.textContent = AGES[moi.age].nom;
  const s = Math.floor(p.temps);
  barreEls.temps.textContent = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const oisifs = [...p.unites.values()].filter((u) => aMoi(u) && u.type === "villageois" && u.tache.type === "rien").length;
  oisifBtn.textContent = `😴 ${oisifs}`;
  oisifBtn.classList.toggle("alerte", oisifs > 0);
}

// Sur le sol : noir là où on n'est jamais allé, voilé là où on ne voit plus.
const BROUILLARD = ["#0d130a", "rgba(0,0,0,.42)"]; // jamais vu, exploré
const dessinerBrouillard = () => paver(BROUILLARD, (i) => (p.vu[i] === 2 ? -1 : p.vu[i]));

function finDePartie(): void {
  const fin = document.createElement("div");
  fin.className = "intro";
  fin.style.cursor = "pointer";
  const gagne = p.vainqueur === MOI;
  fin.innerHTML = `<div class="parchemin"><h1>${gagne ? "Victoire !" : "Défaite…"}</h1><p class="etape">${gagne ? "Le royaume adverse est tombé." : "Ton royaume est tombé."} Partie de ${Math.floor(p.temps / 60)} min, niveau ${NIVEAUX[ia.niveau].nom.toLowerCase()}.</p><p class="go">Clique pour rejouer</p></div>`;
  fin.addEventListener("click", () => location.reload());
  document.body.append(fin);
}

// ---------- boucle ----------

function dessiner(): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#1c2a16";
  ctx.fillRect(0, 0, W, H);
  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
  paver(COULEURS_SOL, (i) => nuance[i]);
  const aLEcran = (x: number, y: number) => {
    const c = iso(x, y);
    return c.x > -150 && c.x < W / zoom + 150 && c.y > -60 && c.y < H / zoom + 320; // un château dépasse de 300 px
  };
  // le brouillard sur le sol seulement : un toit qui dépasse au-dessus d'une case noire reste visible
  dessinerBrouillard();

  const vus: [number, Visable, () => void][] = [];
  // shortcut: un bâtiment ennemi exploré s'affiche tel qu'il est, pas tel qu'on l'a vu la dernière fois.
  for (const b of p.batiments.values()) {
    const t = BATIMENTS[b.type].taille;
    if (aLEcran(b.x + t / 2, b.y + t / 2) && (b.camp === MOI || explore(p, b.x, b.y))) vus.push([b.type === "ferme" ? -1e6 : b.x + b.y + t, b, () => dessinerBatiment(b, b === choixBat)]);
  }
  for (const n of p.noeuds.values()) if (aLEcran(n.x, n.y) && explore(p, n.x, n.y)) vus.push([n.x + n.y + 1, n, () => sprite(spriteNoeud(n), n.x + 0.5, n.y + 0.5)]);
  const choisis = new Set(choix);
  for (const u of p.unites.values()) if (aLEcran(u.x, u.y) && (u.camp === MOI || visible(p, u.x, u.y))) vus.push([u.x + u.y, u, () => dessinerUnite(u, choisis.has(u.id))]);
  vus.sort((a, b) => a[0] - b[0]);
  dessines.length = 0;
  for (const [, objet, f] of vus) {
    objetDessine = objet;
    const t = "file" in objet ? taille(objet) / 2 : "nature" in objet ? 0.5 : 0;
    ctx.filter = visible(p, objet.x + t, objet.y + t) ? "none" : "brightness(0.58)"; // exploré mais plus en vue
    f();
  }
  ctx.filter = "none";
  objetDessine = null;
  dessinerTirs();

  if (choixNoeud) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    losange(choixNoeud.x, choixNoeud.y, 1);
    ctx.stroke();
  }
  if (clique) {
    const c = iso(clique.x, clique.y);
    ctx.strokeStyle = `rgba(255,255,120,${clique.t / 0.6})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, 12 * clique.t + 4, 6 * clique.t + 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (pose && souris.dedans) {
    const c = casePose(pose);
    ctx.fillStyle = peutPoser(p, pose, c.x, c.y) && peutPayer(p, BATIMENTS[pose].cout) ? "rgba(120,255,120,.4)" : "rgba(255,80,80,.45)";
    losange(c.x, c.y, BATIMENTS[pose].taille);
    ctx.fill();
  }
  if (choixBat?.ralliement) {
    const c = iso(choixBat.ralliement.x + 0.5, choixBat.ralliement.y + 0.5);
    ctx.font = "20px serif";
    ctx.textAlign = "center";
    ctx.fillText("🚩", c.x + 4, c.y - 2);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (glisse && !pose && Math.hypot(souris.x - glisse.x, souris.y - glisse.y) >= 6) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(glisse.x, glisse.y, souris.x - glisse.x, souris.y - glisse.y);
    ctx.setLineDash([]);
  }
}

// ---------- mini-carte ----------
// La carte en losange, une case par pixel (2T × T), comme celle d'AoE II.

const mini = document.getElementById("mini") as HTMLCanvasElement;
mini.width = 2 * T;
mini.height = T;
const mctx = mini.getContext("2d")!;
const pixels = document.createElement("canvas");
pixels.width = pixels.height = T;
const pctx = pixels.getContext("2d")!;
const image = pctx.createImageData(T, T);
const COULEUR_MINI: Record<string, [number, number, number]> = {
  sol: [112, 168, 68],
  inconnu: [38, 50, 32], // le losange de la carte, encore à explorer
  arbre: [34, 102, 56],
  or: [240, 190, 40],
  pierre: [170, 174, 180],
  baies: [205, 60, 80],
  camp0: [70, 120, 240],
  camp1: [225, 60, 50],
  camp2: [150, 150, 150],
};
let miniChrono = 0;

// Repeint les pixels de la carte (4 fois par seconde suffit).
function majMini(): void {
  const d = image.data;
  const poser = (x: number, y: number, c: [number, number, number], f = 1) => {
    const i = (Math.floor(y) * T + Math.floor(x)) * 4;
    [d[i], d[i + 1], d[i + 2], d[i + 3]] = [c[0] * f, c[1] * f, c[2] * f, 255];
  };
  for (let i = 0; i < T * T; i++) {
    poser(i % T, Math.floor(i / T), p.vu[i] ? COULEUR_MINI.sol : COULEUR_MINI.inconnu, p.vu[i] === 1 ? 0.6 : 1);
  }
  for (const n of p.noeuds.values()) if (explore(p, n.x, n.y)) poser(n.x, n.y, COULEUR_MINI[n.nature], visible(p, n.x, n.y) ? 1 : 0.6);
  for (const b of p.batiments.values()) {
    if (b.camp !== MOI && !explore(p, b.x, b.y)) continue;
    for (let j = 0; j < taille(b); j++) for (let i = 0; i < taille(b); i++) poser(b.x + i, b.y + j, COULEUR_MINI[`camp${b.camp}`]);
  }
  for (const u of p.unites.values()) if (u.camp === MOI || visible(p, u.x, u.y)) poser(u.x, u.y, COULEUR_MINI[`camp${u.camp}`]);
  pctx.putImageData(image, 0, 0);
}

function dessinerMini(): void {
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.clearRect(0, 0, mini.width, mini.height);
  mctx.imageSmoothingEnabled = false;
  mctx.setTransform(1, 0.5, -1, 0.5, T, 0); // (x, y) → (x − y + T, (x + y) / 2) : le losange
  mctx.drawImage(pixels, 0, 0);
  // le cadre de ce qu'on voit à l'écran
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.strokeStyle = "#fff";
  mctx.lineWidth = 1;
  mctx.beginPath();
  for (const [sx, sy] of [[0, 0], [W, 0], [W, H], [0, H]]) {
    const m = monde(sx / zoom, sy / zoom);
    mctx.lineTo(m.x - m.y + T, (m.x + m.y) / 2);
  }
  mctx.closePath();
  mctx.stroke();
}

// Le point de la carte sous la souris, sur la mini-carte.
function surMini(e: MouseEvent) {
  const r = mini.getBoundingClientRect();
  const mx = ((e.clientX - r.left) * mini.width) / r.width;
  const my = ((e.clientY - r.top) * mini.height) / r.height;
  return { x: (mx - T + 2 * my) / 2, y: (2 * my - mx + T) / 2 };
}
mini.addEventListener("contextmenu", (e) => e.preventDefault());
mini.addEventListener("mousedown", (e) => {
  if (!enCours || enPause) return;
  const m = surMini(e);
  if (e.button === 0) {
    centrerSur(m.x, m.y);
    borner();
  } else if (e.button === 2 && choix.length) {
    ordonner(p, choix, Math.floor(m.x), Math.floor(m.y));
    clique = { x: m.x, y: m.y, t: 0.6 };
  }
});
mini.addEventListener("mousemove", (e) => {
  if (!(e.buttons & 1) || !enCours || enPause) return;
  const m = surMini(e);
  centrerSur(m.x, m.y);
  borner();
});

// ---------- pause et menu ----------

const menuJeu = document.getElementById("menu")!;
const bandeauPause = document.getElementById("pause")!;
let enPause = false;

function mettrePause(oui: boolean, avecMenu = false): void {
  enPause = oui;
  menuJeu.hidden = !(oui && avecMenu);
  bandeauPause.hidden = !(oui && !avecMenu);
  fleches.clear();
  glisse = null;
}

menuJeu.addEventListener("click", (e) => {
  const action = (e.target as HTMLElement).closest("button")?.dataset.menu;
  if (action === "reprendre") mettrePause(false);
  else if (action === "recommencer") {
    // une nouvelle partie au même niveau, sans repasser par l'accueil
    try {
      sessionStorage.setItem("royaumes-relancer", ia.niveau);
    } catch {}
    location.reload();
  } else if (action === "niveau") location.reload();
  else if (action === "quitter") location.href = "../../";
});

let avant = 0;
let enCours = false;
function boucle(t: number): void {
  const dt = Math.min((t - avant) / 1000, 0.1);
  avant = t;
  if (enCours && !enPause) {
    penser(p, ia);
    avancerPartie(p, dt);
    if (p.vainqueur !== null) {
      enCours = false;
      finDePartie();
    }
    defiler(dt);
    if (clique && (clique.t -= dt) <= 0) clique = null;
    majBarre();
    majPanneau();
  }
  dessiner();
  if ((miniChrono -= dt) <= 0) {
    miniChrono = 0.25;
    majMini();
  }
  dessinerMini();
  requestAnimationFrame(boucle);
}

window.addEventListener("resize", redimensionner);
redimensionner();
const hotel = [...p.batiments.values()].find((b) => b.type === "hotel" && b.camp === MOI)!;
centrerSur(hotel.x + 2, hotel.y + 2);
// Le niveau de l'IA, choisi sur l'écran d'accueil ; le dernier choix est retenu.
const niveaux = document.getElementById("niveaux")!;
let niveauRetenu: string | null = null;
try {
  niveauRetenu = localStorage.getItem("royaumes-niveau");
} catch {}
niveaux.innerHTML = (Object.keys(NIVEAUX) as Niveau[])
  .map((n) => `<button type="button" data-niveau="${n}" class="${n === (niveauRetenu ?? "modere") ? "actif" : ""}">${NIVEAUX[n].nom}</button>`)
  .join("");
function demarrer(n: Niveau): void {
  ia = creerIA(1, n);
  intro.hidden = true;
  enCours = true;
  choisir([], hotel);
}
niveaux.addEventListener("click", (e) => {
  const n = (e.target as HTMLElement).closest("button")?.dataset.niveau as Niveau | undefined;
  if (!n) return;
  try {
    localStorage.setItem("royaumes-niveau", n);
  } catch {}
  demarrer(n);
});
// « Recommencer » depuis le menu : on repart directement au même niveau
let relance: string | null = null;
try {
  relance = sessionStorage.getItem("royaumes-relancer");
  sessionStorage.removeItem("royaumes-relancer");
} catch {}
if (relance && relance in NIVEAUX) demarrer(relance as Niveau);
requestAnimationFrame((t) => {
  avant = t;
  boucle(t);
});
