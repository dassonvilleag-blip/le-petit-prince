// Les Caravanes — jeu de commerce « idle mais pas que ». Les caravanes font
// des trajets en temps réel entre des villes ; quand on a cinq minutes, on
// range soi-même la charrette (façon Tetris) et on marchande à l'arrivée ;
// quand on n'a pas le temps, des caravaniers font la navette tout seuls.

import {
  ATTELAGES,
  BIEN_PAR_ID,
  CARACTERES,
  CHARRETTES,
  PRIX_TITRE_ROYAL,
  VILLES,
  VILLE_PAR_ID,
  type BienId,
  type VilleId,
} from "./data.ts";
import {
  casesPiece,
  chargementAuto,
  coefVente,
  coursMonte,
  coutCargaison,
  dureeTrajet,
  formatDuree,
  formatEcus,
  formatNombre,
  occupation,
  peutPlacer,
  pieceEn,
  prixAchat,
  prixVente,
  taille,
  tourner,
  valeurCargaison,
  type Piece,
} from "./eco.ts";
import {
  accepterContreOffre,
  complimenter,
  montantFinal,
  ouvrir as ouvrirNegociation,
  proposer,
  type Negociation,
  type Reaction,
} from "./marchandage.ts";
import {
  acheterCaravane,
  acheterTitre,
  ameliorerAttelage,
  ameliorerCharrette,
  avancer,
  basculerAuto,
  charger,
  debloquerVille,
  embaucherCaravanier,
  encaisser,
  enChargement,
  grille,
  noterMarchandage,
  partir,
  poser,
  prixCaravane,
  prixCaravanier,
  prochaineVille,
  remplirAuto,
  reprendre,
  sauver,
  valeurAffichee,
  vider,
  type Caravane,
  type Etat,
} from "./state.ts";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let etat: Etat = charger(Date.now());

// ---- utilitaires ----

function setText(el: Element, txt: string): void {
  if (el.textContent !== txt) el.textContent = txt;
}

let toastTimer = 0;
function toast(msg: string): void {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("visible"), 2600);
}

function hasard<T>(liste: T[]): T {
  return liste[Math.floor(Math.random() * liste.length)];
}

function icones(biens: BienId[]): string {
  return biens.map((b) => BIEN_PAR_ID[b].icone).join(" ");
}

// Résumé d'une cargaison : « 🐟×4 🧂×1 ».
function resumeCargaison(c: Caravane): string {
  const n = new Map<BienId, number>();
  for (const p of c.cargaison) n.set(p.bien, (n.get(p.bien) ?? 0) + 1);
  return [...n].map(([b, k]) => `${BIEN_PAR_ID[b].icone}×${k}`).join(" ");
}

// ---- carte ----

const carte = document.getElementById("carte") as unknown as SVGSVGElement;
carte.innerHTML = `
  <defs>
    <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
      <stop offset="60%" stop-color="#5a3a1a" stop-opacity="0"/>
      <stop offset="100%" stop-color="#5a3a1a" stop-opacity="0.35"/>
    </radialGradient>
  </defs>
  <rect class="fond" width="100" height="60"/>
  <path class="mer" d="M0 0 H6 Q3 7 5 14 Q8 22 4 30 Q1 38 5 46 Q8 53 4 60 H0 Z"/>
  <path class="rivage" d="M6 0 Q3 7 5 14 Q8 22 4 30 Q1 38 5 46 Q8 53 4 60"/>
  <ellipse class="desert" cx="84" cy="40" rx="22" ry="17"/>
  <g class="deco">
    <text x="45" y="11">⛰️</text><text x="49" y="13.5">⛰️</text><text x="67" y="9">⛰️</text>
    <text x="19" y="51">🌲</text><text x="22" y="53">🌲</text><text x="47" y="33">🌲</text>
    <text x="64" y="30">🌳</text><text x="31" y="11">🌳</text>
    <text x="88" y="55">🌵</text><text x="64" y="54">🌵</text><text x="95" y="33">🌵</text>
    <text x="1.2" y="22">⛵</text>
  </g>
  <g id="routes"></g>
  <g id="trajets"></g>
  <g id="villes"></g>
  <g id="pions"></g>
  <rect width="100" height="60" fill="url(#vignette)" pointer-events="none"/>`;

const gRoutes = carte.querySelector("#routes")!;
const gTrajets = carte.querySelector("#trajets")!;
const gVilles = carte.querySelector("#villes")!;
const gPions = carte.querySelector("#pions")!;

let signatureCarte = "";
function rendreCarte(): void {
  const prochaine = prochaineVille(etat);
  const sig = etat.villes.join() + "|" + etat.caravanes.map((c) => (c.trajet ? c.trajet.de + c.trajet.vers : "")).join();
  if (sig === signatureCarte) return;
  signatureCarte = sig;

  const ouvertes = VILLES.filter((v) => etat.villes.includes(v.id));
  let routes = "";
  for (let a = 0; a < ouvertes.length; a++)
    for (let b = a + 1; b < ouvertes.length; b++)
      routes += `<line class="route" x1="${ouvertes[a].x}" y1="${ouvertes[a].y}" x2="${ouvertes[b].x}" y2="${ouvertes[b].y}"/>`;
  gRoutes.innerHTML = routes;

  gTrajets.innerHTML = etat.caravanes
    .filter((c) => c.trajet)
    .map((c) => {
      const a = VILLE_PAR_ID[c.trajet!.de];
      const b = VILLE_PAR_ID[c.trajet!.vers];
      return `<line class="trajet" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
    })
    .join("");

  gVilles.innerHTML = VILLES.map((v) => {
    const ouverte = etat.villes.includes(v.id);
    const estProchaine = prochaine?.id === v.id;
    const cls = ouverte ? "ville" : estProchaine ? "ville verrouillee prochaine" : "ville verrouillee";
    const nom = ouverte ? v.nom : estProchaine ? `🔒 ${formatEcus(v.deblocage)}` : "???";
    return `
      <g class="${cls}" data-ville="${v.id}" transform="translate(${v.x} ${v.y})">
        <circle r="4.2"/>
        <text class="ville-icone" y="1.5">${ouverte || estProchaine ? v.icone : "❔"}</text>
        <text class="ville-nom" y="7.6">${nom}</text>
      </g>`;
  }).join("");

  gPions.innerHTML = etat.caravanes
    .map((_, i) => `<g class="pion" data-i="${i}"><text>🐪</text><circle class="pion-alerte" cx="1.8" cy="-2.6" r="1.1"/></g>`)
    .join("");
}

function majPions(now: number): void {
  gPions.querySelectorAll<SVGGElement>(".pion").forEach((g) => {
    const i = Number(g.dataset.i);
    const c = etat.caravanes[i];
    if (!c) return;
    let x: number;
    let y: number;
    let sens = 1;
    if (c.trajet) {
      const a = VILLE_PAR_ID[c.trajet.de];
      const b = VILLE_PAR_ID[c.trajet.vers];
      const f = Math.min(1, Math.max(0, (now - c.trajet.depart) / (c.trajet.arrivee - c.trajet.depart)));
      x = a.x + (b.x - a.x) * f;
      y = a.y + (b.y - a.y) * f;
      // léger balancement de marche
      y += Math.sin(now / 180 + i) * 0.25;
      sens = b.x > a.x ? -1 : 1; // l'emoji regarde à gauche
    } else {
      // à quai : en éventail autour de la ville
      const v = VILLE_PAR_ID[c.ville];
      const memes = etat.caravanes.filter((k) => !k.trajet && k.ville === c.ville);
      const k = memes.indexOf(c);
      const angle = -0.6 + k * 0.9;
      x = v.x + Math.cos(angle) * 6.2;
      y = v.y + Math.sin(angle) * 6.2 - 1;
    }
    g.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    g.firstElementChild!.setAttribute("transform", `scale(${sens} 1)`);
    g.classList.toggle("attend", c.aVendre || (enChargement(c) && !(c.caravanier && c.auto)));
  });
}

carte.addEventListener("click", (e) => {
  const cible = e.target as Element;
  const pion = cible.closest<SVGGElement>(".pion");
  if (pion) return agir(Number(pion.dataset.i));
  const ville = cible.closest<SVGGElement>("[data-ville]");
  if (!ville) return;
  const id = ville.dataset.ville as VilleId;
  if (etat.villes.includes(id)) ouvrirPanneau({ type: "ville", id });
  else if (prochaineVille(etat)?.id === id) ouvrirPanneau({ type: "atelier" });
  else toast("Une route à découvrir plus tard…");
});

// ---- fiches des caravanes ----

// Action par défaut d'une caravane (clic sur son pion ou sa fiche).
function agir(i: number): void {
  const c = etat.caravanes[i];
  if (c.aVendre) ouvrirMarche(i);
  else if (enChargement(c)) ouvrirComptoir(i);
}

function signatureFiche(c: Caravane): string {
  return [c.ville, c.trajet?.de ?? "", c.aVendre, c.caravanier, c.auto, c.cargaison.length, etat.charrette].join("|");
}

let signaturesFiches: string[] = [];

function htmlFiche(c: Caravane, i: number): string {
  const ville = VILLE_PAR_ID[c.ville];
  const bouton = (action: string, txt: string, cls = "") =>
    `<button type="button" class="${cls}" data-action="${action}" data-i="${i}">${txt}</button>`;
  const auto = c.caravanier
    ? bouton("auto", c.auto ? "🤠 Caravanier en service" : "🤠 Caravanier en pause", c.auto ? "auto actif" : "auto")
    : "";

  let statut: string;
  let actions = "";
  let etatCls: string;
  if (c.trajet) {
    etatCls = "en-route";
    const de = VILLE_PAR_ID[c.trajet.de];
    statut = `${de.icone} ${de.nom} → ${ville.icone} ${ville.nom} · <span class="fiche-temps"></span>
      <br><small>${c.cargaison.length ? resumeCargaison(c) : "à vide"}</small>`;
  } else if (c.aVendre) {
    etatCls = "arrivee";
    statut = `Arrivée à ${ville.icone} <b>${ville.nom}</b> ! <small>${resumeCargaison(c)}</small>
      <br><small>Prix affiché : <span class="fiche-valeur"></span></small>`;
    actions =
      bouton("vendre", "💰 Vendre", "") +
      bouton("marchander", `🤝 Marchander avec ${VILLE_PAR_ID[c.ville].marchand.portrait}`, "principal");
  } else {
    etatCls = "quai";
    statut = `À quai à ${ville.icone} <b>${ville.nom}</b>${
      c.cargaison.length ? ` · chargée <small>${resumeCargaison(c)}</small>` : ""
    }`;
    actions = bouton("charger", c.cargaison.length ? "📦 Finir le chargement" : "📦 Charger", "principal");
  }

  return `
    <article class="fiche ${etatCls}" data-i="${i}">
      <div class="fiche-icone">🐪</div>
      <div class="fiche-corps">
        <div class="fiche-ligne"><b class="fiche-nom">${c.nom}</b>${auto}</div>
        <div class="fiche-statut">${statut}</div>
        ${c.trajet ? `<div class="fiche-barre"><div class="fiche-rempli"></div></div>` : ""}
        ${actions ? `<div class="fiche-actions">${actions}</div>` : ""}
      </div>
    </article>`;
}

function rendreFiches(now: number): void {
  const liste = $("caravanes");
  const sigs = etat.caravanes.map(signatureFiche);
  if (sigs.length !== signaturesFiches.length) {
    liste.innerHTML = etat.caravanes.map(htmlFiche).join("");
  } else {
    sigs.forEach((s, i) => {
      if (s === signaturesFiches[i]) return;
      const vieille = liste.children[i];
      const tmp = document.createElement("div");
      tmp.innerHTML = htmlFiche(etat.caravanes[i], i);
      vieille.replaceWith(tmp.firstElementChild!);
    });
  }
  signaturesFiches = sigs;

  etat.caravanes.forEach((c, i) => {
    const el = liste.children[i];
    if (c.trajet) {
      const total = c.trajet.arrivee - c.trajet.depart;
      const f = Math.min(1, (now - c.trajet.depart) / total);
      (el.querySelector(".fiche-rempli") as HTMLElement).style.width = `${f * 100}%`;
      setText(el.querySelector(".fiche-temps")!, formatDuree((c.trajet.arrivee - now) / 1000));
    } else if (c.aVendre) {
      setText(el.querySelector(".fiche-valeur")!, formatEcus(valeurAffichee(etat, i, now)));
    }
  });
}

$("caravanes").addEventListener("click", (e) => {
  const cible = e.target as HTMLElement;
  const b = cible.closest<HTMLButtonElement>("button[data-action]");
  if (b) {
    const i = Number(b.dataset.i);
    const now = Date.now();
    switch (b.dataset.action) {
      case "charger":
        return ouvrirComptoir(i);
      case "marchander":
        return ouvrirMarche(i);
      case "vendre": {
        const montant = valeurAffichee(etat, i, now);
        const benef = encaisser(etat, i, montant);
        return toast(`💰 Vendu ${formatEcus(montant)} · bénéfice ${benef >= 0 ? "+" : ""}${formatEcus(benef)}`);
      }
      case "auto": {
        basculerAuto(etat, i);
        const c = etat.caravanes[i];
        return toast(
          c.auto
            ? c.trajet
              ? "🤠 Le caravanier reprend la navette à la prochaine arrivée."
              : "🤠 Le caravanier prendra la navette au prochain départ."
            : "🤠 Le caravanier s'arrêtera à la prochaine ville."
        );
      }
    }
    return;
  }
  const fiche = cible.closest<HTMLElement>(".fiche");
  if (fiche) agir(Number(fiche.dataset.i));
});

// ---- comptoir (chargement de la charrette) ----

let comptoirI: number | null = null;
let destination: VilleId = "terracuite";
let enMain: { bien: BienId; rot: number } | null = null;
let survol: { x: number; y: number } | null = null;

function caravaneComptoir(): Caravane | null {
  return comptoirI === null ? null : etat.caravanes[comptoirI];
}

// Rentabilité estimée d'une destination (écus par minute) avec un chargement auto.
function rentabilite(depuis: VilleId, vers: VilleId, now: number): number {
  const { l, h } = grille(etat);
  const p = chargementAuto(l, h, depuis, vers, now, Infinity);
  const gain = valeurCargaison(p, vers, now) - coutCargaison(p, depuis, now);
  return gain / (dureeTrajet(depuis, vers, etat.attelage) / 60_000);
}

function meilleureDestination(depuis: VilleId, now: number): VilleId {
  let best: VilleId | null = null;
  let bestR = -Infinity;
  for (const v of etat.villes) {
    if (v === depuis) continue;
    const r = rentabilite(depuis, v, now);
    if (r > bestR) {
      bestR = r;
      best = v;
    }
  }
  return best ?? depuis;
}

function ouvrirComptoir(i: number): void {
  const c = etat.caravanes[i];
  if (!enChargement(c)) return;
  fermerTout();
  comptoirI = i;
  enMain = null;
  survol = null;
  destination = meilleureDestination(c.ville, Date.now());
  $("comptoir").hidden = false;
  $("voile").hidden = false;
  rendreComptoir();
}

function fermerComptoir(): void {
  comptoirI = null;
  enMain = null;
  $("comptoir").hidden = true;
}

function rendreComptoir(): void {
  const c = caravaneComptoir();
  if (!c) return;
  const now = Date.now();
  const ville = VILLE_PAR_ID[c.ville];
  setText($("comptoir-titre"), `📦 Comptoir de ${ville.nom} · ${c.nom}`);

  // destinations
  const meilleure = meilleureDestination(c.ville, now);
  $("destinations").innerHTML =
    `<span class="etiquette">Destination</span>` +
    etat.villes
      .filter((v) => v !== c.ville)
      .map((v) => {
        const d = VILLE_PAR_ID[v];
        return `<button type="button" class="dest${v === destination ? " choisie" : ""}" data-dest="${v}">
          ${d.icone} ${d.nom} <small>${formatDuree(dureeTrajet(c.ville, v, etat.attelage) / 1000)}${
            v === meilleure ? " · ⭐" : ""
          }</small></button>`;
      })
      .join("");

  rendreEtal(now);
  rendreGrille();
  rendreResume(now);
}

function rendreEtal(now: number): void {
  const c = caravaneComptoir();
  if (!c) return;
  const ville = VILLE_PAR_ID[c.ville];
  $("etal").innerHTML =
    `<div class="etal-tete">Étal de ${ville.marchand.portrait} ${ville.marchand.nom}</div>` +
    ville.produit
      .map((b) => {
        const def = BIEN_PAR_ID[b];
        const achat = prixAchat(c.ville, b, now)!;
        const vente = prixVente(destination, b, now);
        const reclame = coefVente(destination, b) > 1.5;
        const forme = tourner(def.forme, 0);
        const { l, h } = taille(forme);
        const mini = forme
          .map(([x, y]) => `<i style="grid-area:${y + 1}/${x + 1};background:${def.couleur}"></i>`)
          .join("");
        return `
          <button type="button" class="marchandise${enMain?.bien === b ? " en-main" : ""}" data-bien="${b}">
            <span class="mini-forme" style="grid-template-columns:repeat(${l},10px);grid-template-rows:repeat(${h},10px)">${mini}</span>
            <span class="m-texte">
              <b>${def.icone} ${def.nom}</b>
              <small>achat ${formatNombre(achat)} ${coursMonte(c.ville, b, now) ? "↗" : "↘"} · vente ${formatNombre(vente)}${
                reclame ? ` <em class="reclame">★ réclamé</em>` : ""
              }</small>
            </span>
            <span class="m-gain">+${formatNombre(vente - achat)}</span>
          </button>`;
      })
      .join("");
}

const elGrille = $("grille");

function rendreGrille(): void {
  const c = caravaneComptoir();
  if (!c) return;
  const { l, h } = grille(etat);
  elGrille.style.setProperty("--l", String(l));
  elGrille.style.setProperty("--h", String(h));
  let html = "";
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++) html += `<div class="case" style="grid-area:${y + 1}/${x + 1}"></div>`;
  c.cargaison.forEach((p) => (html += htmlPiece(p, "bloc")));
  if (enMain && survol) {
    const p = pieceSurvol();
    if (p) {
      const ok = peutPlacer(l, h, c.cargaison, p) && (prixAchat(c.ville, p.bien, Date.now()) ?? Infinity) <= etat.ecus;
      html += htmlPiece(p, `fantome ${ok ? "ok" : "ko"}`, l, h);
    }
  }
  elGrille.innerHTML = html;
}

// Blocs d'une pièce : une case par div, bords arrondis seulement à
// l'extérieur de la pièce pour qu'elle se lise comme un seul objet.
function htmlPiece(p: Piece, cls: string, l = Infinity, h = Infinity): string {
  const def = BIEN_PAR_ID[p.bien];
  const cases = casesPiece(p).filter(([x, y]) => x >= 0 && y >= 0 && x < l && y < h);
  const a = new Set(cases.map(([x, y]) => `${x},${y}`));
  const cx = cases.reduce((s, c) => s + c[0], 0) / cases.length;
  const cy = cases.reduce((s, c) => s + c[1], 0) / cases.length;
  let centre = 0;
  cases.forEach(([x, y], k) => {
    const [bx, by] = cases[centre];
    if (Math.hypot(x - cx, y - cy) < Math.hypot(bx - cx, by - cy)) centre = k;
  });
  return cases
    .map(([x, y], k) => {
      const haut = a.has(`${x},${y - 1}`);
      const bas = a.has(`${x},${y + 1}`);
      const gauche = a.has(`${x - 1},${y}`);
      const droite = a.has(`${x + 1},${y}`);
      const m = (voisin: boolean) => (voisin ? "0" : "3px");
      const r = (v1: boolean, v2: boolean) => (v1 || v2 ? "0" : "7px");
      const style = [
        `grid-area:${y + 1}/${x + 1}`,
        `--c:${def.couleur}`,
        `margin:${m(haut)} ${m(droite)} ${m(bas)} ${m(gauche)}`,
        `border-radius:${r(haut, gauche)} ${r(haut, droite)} ${r(bas, droite)} ${r(bas, gauche)}`,
      ].join(";");
      return `<div class="${cls}" style="${style}">${k === centre ? def.icone : ""}</div>`;
    })
    .join("");
}

// La pièce en main, centrée sur la case survolée.
function pieceSurvol(): Piece | null {
  if (!enMain || !survol) return null;
  const forme = tourner(BIEN_PAR_ID[enMain.bien].forme, enMain.rot);
  const { l, h } = taille(forme);
  return {
    bien: enMain.bien,
    rot: enMain.rot,
    x: survol.x - Math.floor((l - 1) / 2),
    y: survol.y - Math.floor((h - 1) / 2),
  };
}

function caseSous(e: PointerEvent | MouseEvent): { x: number; y: number } | null {
  const { l, h } = grille(etat);
  const r = elGrille.getBoundingClientRect();
  const x = Math.floor(((e.clientX - r.left) / r.width) * l);
  const y = Math.floor(((e.clientY - r.top) / r.height) * h);
  if (x < 0 || y < 0 || x >= l || y >= h) return null;
  return { x, y };
}

elGrille.addEventListener("pointermove", (e) => {
  const cs = caseSous(e);
  if (cs?.x === survol?.x && cs?.y === survol?.y) return;
  survol = cs;
  if (enMain) rendreGrille();
});
elGrille.addEventListener("pointerleave", () => {
  survol = null;
  if (enMain) rendreGrille();
});

elGrille.addEventListener("click", (e) => {
  const c = caravaneComptoir();
  const cs = caseSous(e);
  if (!c || !cs || comptoirI === null) return;
  survol = cs;
  const now = Date.now();
  if (enMain) {
    const p = pieceSurvol()!;
    const { l, h } = grille(etat);
    if (!peutPlacer(l, h, c.cargaison, p)) {
      // clic sur une pièce déjà posée avec autre chose en main : on l'échange
      const k = pieceEn(c.cargaison, cs.x, cs.y);
      if (k >= 0) {
        const reprise = reprendre(etat, comptoirI, k)!;
        enMain = { bien: reprise.bien, rot: reprise.rot };
      } else toast("Ça ne rentre pas là.");
    } else if (!poser(etat, comptoirI, p, now)) toast("Pas assez d'écus.");
  } else {
    const k = pieceEn(c.cargaison, cs.x, cs.y);
    if (k >= 0) {
      const reprise = reprendre(etat, comptoirI, k)!;
      enMain = { bien: reprise.bien, rot: reprise.rot };
    }
  }
  rendreEtal(now);
  rendreGrille();
  rendreResume(now);
});

function tournerMain(): void {
  if (!enMain) return;
  enMain.rot = (enMain.rot + 1) % 4;
  rendreGrille();
}

$("comptoir").addEventListener("contextmenu", (e) => {
  e.preventDefault();
  tournerMain();
});
$("btn-tourner").addEventListener("click", tournerMain);

$("etal").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-bien]");
  if (!b) return;
  const bien = b.dataset.bien as BienId;
  enMain = enMain?.bien === bien ? null : { bien, rot: enMain?.rot ?? 0 };
  rendreEtal(Date.now());
  rendreGrille();
});

$("destinations").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-dest]");
  if (!b) return;
  destination = b.dataset.dest as VilleId;
  rendreComptoir();
});

$("btn-auto").addEventListener("click", () => {
  if (comptoirI === null) return;
  const n = remplirAuto(etat, comptoirI, destination, Date.now());
  if (n === 0) toast(etat.ecus < 1 ? "Plus un écu en poche." : "Plus rien ne rentre.");
  rendreComptoir();
});

$("btn-vider").addEventListener("click", () => {
  if (comptoirI === null) return;
  vider(etat, comptoirI);
  rendreComptoir();
});

function rendreResume(now: number): void {
  const c = caravaneComptoir();
  if (!c) return;
  const { l, h } = grille(etat);
  const occupees = occupation(c.cargaison).size;
  const vente = valeurCargaison(c.cargaison, destination, now);
  const benef = vente - c.cout;
  $("resume").innerHTML = `
    <div><dt>Payé</dt><dd>${formatEcus(c.cout)}</dd></div>
    <div><dt>Vente estimée</dt><dd>${formatEcus(vente)}</dd></div>
    <div><dt>Bénéfice</dt><dd class="${benef >= 0 ? "positif" : "negatif"}">${benef >= 0 ? "+" : ""}${formatEcus(benef)}</dd></div>
    <div><dt>Charrette</dt><dd>${occupees}/${l * h} cases</dd></div>
    <div><dt>En poche</dt><dd>${formatEcus(etat.ecus)}</dd></div>`;
  const d = VILLE_PAR_ID[destination];
  const duree = formatDuree(dureeTrajet(c.ville, destination, etat.attelage) / 1000);
  setText(
    $("btn-partir"),
    c.cargaison.length ? `🐪 En route pour ${d.nom} (${duree})` : `🐪 Partir à vide pour ${d.nom} (${duree})`
  );
}

$("btn-partir").addEventListener("click", () => {
  if (comptoirI === null) return;
  const c = etat.caravanes[comptoirI];
  if (partir(etat, comptoirI, destination, Date.now())) {
    toast(`🐪 ${c.nom} prend la route de ${VILLE_PAR_ID[destination].nom} !`);
    fermerTout();
  }
});

// ---- marchandage ----

const REPLIQUES: Record<Reaction, string[]> = {
  accepte: ["Marché conclu !", "Tope là !", "Bon… d'accord. Affaire faite.", "Tu es dur en affaires. Va pour ça."],
  presque: ["Hmm… tu y es presque.", "On se rapproche…", "C'est un poil trop.", "Encore un petit effort."],
  trop: ["C'est trop, l'ami.", "Non, non, non.", "Tu rêves un peu.", "Redescends sur terre."],
  "beaucoup-trop": ["Beaucoup trop cher !", "Tu veux me ruiner ?", "Ha ! Certainement pas."],
  insulte: ["Tu te moques de moi ?!", "C'est une plaisanterie ?", "Je fais semblant de n'avoir rien entendu."],
  fache: ["Ça suffit ! Va vendre ta camelote ailleurs.", "Dehors ! Et ne reviens pas avant demain !"],
};

const ACCUEILS = [
  "Voyons voir ce que tu m'apportes…",
  "Ah, une caravane ! Montre-moi ça.",
  "Hmm. Ça a fait bon voyage, ça ?",
];

interface Marche {
  i: number;
  n: Negociation;
  demande: number;
  bulle: string;
}
let marche: Marche | null = null;

function ouvrirMarche(i: number): void {
  const c = etat.caravanes[i];
  if (!c.aVendre) return;
  fermerTout();
  const m = VILLE_PAR_ID[c.ville].marchand;
  marche = {
    i,
    n: ouvrirNegociation(m.caractere, valeurAffichee(etat, i, Date.now())),
    demande: 0.2,
    bulle: hasard(ACCUEILS),
  };
  $("marche").hidden = false;
  $("voile").hidden = false;
  rendreMarche();
}

function fermerMarche(): void {
  marche = null;
  $("marche").hidden = true;
}

function pct(m: number): string {
  return `${m >= 0 ? "+" : ""}${Math.round(m * 100)} %`;
}

function rendreMarche(): void {
  if (!marche) return;
  const { n, demande } = marche;
  const c = etat.caravanes[marche.i];
  const m = VILLE_PAR_ID[c.ville].marchand;
  const car = CARACTERES[m.caractere];
  const humeur = n.fin?.fache
    ? "😡"
    : n.fin
      ? "😄"
      : ["😠", "😒", "😐", "🙂"][Math.min(3, Math.floor((n.patience / n.patienceMax) * 4))];
  const jauge = "●".repeat(n.patience) + "○".repeat(n.patienceMax - n.patience);
  const commence = n.refus > 0 || n.complimente;

  let bas: string;
  if (n.fin) {
    const montant = montantFinal(n);
    const regret = n.fin.fache
      ? `<p class="regret">Tu brades au marché voisin : ${pct(n.fin.marge)}.</p>`
      : `<p class="regret">${m.nom.split(" ")[0]} aurait accepté jusqu'à <b>${pct(n.marge)}</b>.</p>`;
    bas = `
      <p class="verdict">Vendu <b>${formatEcus(montant)}</b> (${pct(n.fin.marge)})</p>
      ${regret}
      <button type="button" class="gros-bouton" data-m="encaisser">💰 Encaisser</button>`;
  } else {
    bas = `
      <div class="demande">
        <button type="button" data-m="moins" ${demande <= 0 ? "disabled" : ""}>−</button>
        <div class="demande-valeur"><b>${pct(demande)}</b><small>${formatEcus(n.valeur * (1 + demande))}</small></div>
        <button type="button" data-m="plus" ${demande >= 0.6 ? "disabled" : ""}>+</button>
      </div>
      <button type="button" class="gros-bouton" data-m="proposer">🗣️ Je veux ${formatEcus(n.valeur * (1 + demande))}</button>
      <div class="marche-options">
        <button type="button" data-m="contre">🤝 Accepter son offre : ${pct(n.contreOffre)} · ${formatEcus(n.valeur * (1 + n.contreOffre))}</button>
        <button type="button" data-m="compliment" ${n.complimente ? "disabled" : ""}>💬 Complimenter</button>
      </div>`;
  }

  $("marche").innerHTML = `
    <div class="marche-tete">
      <span>🤝 Marché de ${VILLE_PAR_ID[c.ville].nom}</span>
      ${commence || n.fin ? "" : `<button type="button" class="fermer" data-m="fermer" aria-label="fermer">✕</button>`}
    </div>
    <div class="marchand">
      <div class="portrait">${m.portrait}<span class="humeur">${humeur}</span></div>
      <div>
        <b>${m.nom}</b>
        <small class="caractere">${car.nom} — ${car.indice}</small>
        <small class="patience" title="patience">Patience ${jauge}</small>
      </div>
    </div>
    <div class="bulle">« ${marche.bulle} »</div>
    <p class="affiche">Prix affiché de ta cargaison (${resumeCargaison(c)}) : <b>${formatEcus(n.valeur)}</b></p>
    ${bas}`;
}

$("marche").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-m]");
  if (!b || !marche) return;
  const { n } = marche;
  switch (b.dataset.m) {
    case "moins":
      marche.demande = Math.max(0, Math.round((marche.demande - 0.05) * 100) / 100);
      break;
    case "plus":
      marche.demande = Math.min(0.6, Math.round((marche.demande + 0.05) * 100) / 100);
      break;
    case "proposer": {
      const r = proposer(n, marche.demande);
      marche.bulle = hasard(REPLIQUES[r]);
      if (!n.fin) marche.bulle += ` Je t'en donne ${pct(n.contreOffre)}.`;
      break;
    }
    case "contre":
      accepterContreOffre(n);
      marche.bulle = hasard(REPLIQUES.accepte);
      break;
    case "compliment":
      marche.bulle = complimenter(n);
      if (n.fin?.fache) marche.bulle += " " + hasard(REPLIQUES.fache);
      break;
    case "encaisser": {
      const montant = montantFinal(n);
      if (!n.fin!.fache) noterMarchandage(etat, n.fin!.marge);
      const benef = encaisser(etat, marche.i, montant);
      toast(`💰 ${formatEcus(montant)} · bénéfice du voyage ${benef >= 0 ? "+" : ""}${formatEcus(benef)}`);
      fermerTout();
      return;
    }
    case "fermer":
      fermerTout();
      return;
  }
  rendreMarche();
});

// ---- panneaux (atelier, aide, ville) ----

type Panneau = { type: "atelier" } | { type: "aide" } | { type: "ville"; id: VilleId };
let panneau: Panneau | null = null;

function ouvrirPanneau(p: Panneau): void {
  fermerTout();
  panneau = p;
  $("panneau").hidden = false;
  $("voile").hidden = false;
  rendrePanneau();
  $("panneau-corps").scrollTop = 0;
}

function fermerPanneau(): void {
  panneau = null;
  $("panneau").hidden = true;
}

function fermerTout(): void {
  fermerPanneau();
  fermerComptoir();
  fermerMarche();
  $("voile").hidden = true;
}

document.querySelectorAll<HTMLButtonElement>("[data-panneau]").forEach((b) =>
  b.addEventListener("click", () => {
    const type = b.dataset.panneau as "atelier" | "aide";
    if (panneau?.type === type) fermerTout();
    else ouvrirPanneau({ type });
  })
);
document.querySelectorAll("[data-fermer]").forEach((b) => b.addEventListener("click", fermerTout));
$("voile").addEventListener("click", () => {
  // un marchandage entamé se termine au comptoir, pas en cliquant à côté
  if (marche && (marche.n.refus > 0 || marche.n.complimente || marche.n.fin)) return;
  fermerTout();
});

function ligne(icone: string, titre: string, sous: string, action: string, bouton: string, prix: number | null): string {
  const attrs = prix === null ? "disabled" : `data-action="${action}" data-prix="${prix}"`;
  return `
    <div class="item${prix === null ? " fait" : ""}">
      <span class="item-icone">${icone}</span>
      <div class="item-texte"><b>${titre}</b><small>${sous}</small></div>
      <button type="button" class="item-bouton" ${attrs}>${bouton}</button>
    </div>`;
}

function lignesAtelier(): string {
  let html = "";
  const v = prochaineVille(etat);
  if (v)
    html += ligne(
      "🗺️",
      `Ouvrir la route de ${v.icone} ${v.nom}`,
      `Produit ${icones(v.produit)} · réclame ${icones(v.demande)}`,
      "ville",
      formatEcus(v.deblocage),
      v.deblocage
    );

  const ch = CHARRETTES[etat.charrette];
  const chSuiv = CHARRETTES[etat.charrette + 1];
  html += chSuiv
    ? ligne("🛒", `${chSuiv.nom} · ${chSuiv.l}×${chSuiv.h}`, `Toutes tes caravanes. Actuelle : ${ch.nom} ${ch.l}×${ch.h}`, "charrette", formatEcus(chSuiv.prix), chSuiv.prix)
    : ligne("🛒", `${ch.nom} · ${ch.l}×${ch.h}`, "La plus grande charrette du royaume.", "", "✓", null);

  const at = ATTELAGES[etat.attelage];
  const atSuiv = ATTELAGES[etat.attelage + 1];
  html += atSuiv
    ? ligne(atSuiv.icone, `${atSuiv.nom} · vitesse ×${String(atSuiv.vitesse).replace(".", ",")}`, `Toutes tes caravanes. Actuel : ${at.nom}`, "attelage", formatEcus(atSuiv.prix), atSuiv.prix)
    : ligne(at.icone, at.nom, "Plus rapide, tu téléportes.", "", "✓", null);

  const pc = prixCaravane(etat);
  html +=
    pc !== null
      ? ligne("🐪", "Nouvelle caravane", `Tu en as ${etat.caravanes.length}. Elle part de Portvent.`, "caravane", formatEcus(pc), pc)
      : ligne("🐪", "Flotte complète", `${etat.caravanes.length} caravanes sur les routes.`, "", "✓", null);

  const pv = prixCaravanier(etat);
  etat.caravanes.forEach((c, i) => {
    if (c.caravanier) return;
    html += ligne(
      "🤠",
      `Caravanier pour ${c.nom}`,
      "Fait la navette tout seul, même quand tu n'es pas là. Il rejoue ton dernier rangement dans chaque ville et vend au prix affiché.",
      `caravanier:${i}`,
      pv === null ? "—" : formatEcus(pv),
      pv
    );
  });

  html += etat.titre
    ? ligne("👑", "Marchand Royal", "Le titre est à toi. Les routes continuent de tourner.", "", "✓", null)
    : ligne("👑", "Titre de Marchand Royal", "Le but ultime du commerce.", "titre", formatEcus(PRIX_TITRE_ROYAL), PRIX_TITRE_ROYAL);
  return html;
}

function rendrePanneau(): void {
  if (!panneau) return;
  const corps = $("panneau-corps");
  if (panneau.type === "atelier") {
    setText($("panneau-titre"), "🛠️ Atelier");
    corps.innerHTML = lignesAtelier();
  } else if (panneau.type === "aide") {
    setText($("panneau-titre"), "❔ Comment jouer");
    corps.innerHTML = `
      <div class="aide">
        <p><b>Achète bas, vends haut.</b> Chaque ville produit trois marchandises (pas chères chez elle) et en réclame d'autres (payées ★ très cher).</p>
        <p><b>📦 Charge ta charrette.</b> Chaque marchandise a une forme : les grosses rapportent plus par case mais se casent mal. Clic droit ou <kbd>R</kbd> pour tourner, clic sur une pièce posée pour la reprendre (remboursée). Le bouton ✨ Auto fait un rangement correct, toi tu peux faire mieux.</p>
        <p><b>🐪 Pars.</b> Le voyage dure en vrai : ferme l'onglet, reviens plus tard.</p>
        <p><b>🤝 Marchande à l'arrivée.</b> Chaque marchand a son caractère. Accepter sa contre-offre est sans risque ; en demander trop use sa patience… et s'il claque la porte, tu brades.</p>
        <p><b>🤠 Embauche des caravaniers</b> (atelier) : ils font la navette tout seuls, même onglet fermé, en rejouant ton dernier rangement. Range bien, ils rangeront bien.</p>
        <p><b>🙈 Échap</b> : mode discret.</p>
      </div>`;
  } else {
    const v = VILLE_PAR_ID[panneau.id];
    const car = CARACTERES[v.marchand.caractere];
    const now = Date.now();
    setText($("panneau-titre"), `${v.icone} ${v.nom}`);
    const liste = (biens: BienId[], achat: boolean) =>
      biens
        .map((b) => {
          const d = BIEN_PAR_ID[b];
          const p = achat ? prixAchat(v.id, b, now)! : prixVente(v.id, b, now);
          return `<li>${d.icone} ${d.nom} <b>${formatNombre(p)}</b> ${coursMonte(v.id, b, now) ? "↗" : "↘"}</li>`;
        })
        .join("");
    corps.innerHTML = `
      <div class="fiche-ville">
        <p class="marchand-ligne">${v.marchand.portrait} <b>${v.marchand.nom}</b><br><small>${car.nom} — ${car.indice}</small></p>
        <h3>Produit (prix d'achat)</h3><ul>${liste(v.produit, true)}</ul>
        <h3>Réclame ★ (prix de vente)</h3><ul>${liste(v.demande, false)}</ul>
      </div>`;
  }
  majPanneau();
}

function majPanneau(): void {
  if (panneau?.type !== "atelier") return;
  document.querySelectorAll<HTMLButtonElement>("#panneau-corps [data-prix]").forEach((b) => {
    b.disabled = Number(b.dataset.prix) > etat.ecus;
  });
}

$("panneau-corps").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
  if (!b || b.disabled) return;
  const [type, arg] = b.dataset.action!.split(":");
  let ok = false;
  if (type === "ville") {
    const v = prochaineVille(etat)!;
    ok = debloquerVille(etat);
    if (ok) toast(`🗺️ La route de ${v.nom} est ouverte !`);
  } else if (type === "charrette") {
    ok = ameliorerCharrette(etat);
    if (ok) toast(`🛒 ${CHARRETTES[etat.charrette].nom} ! Refais tes rangements, il y a de la place.`);
  } else if (type === "attelage") {
    ok = ameliorerAttelage(etat);
    if (ok) toast(`${ATTELAGES[etat.attelage].icone} ${ATTELAGES[etat.attelage].nom} ! Les prochains départs iront plus vite.`);
  } else if (type === "caravane") {
    ok = acheterCaravane(etat);
    if (ok) toast(`🐪 ${etat.caravanes[etat.caravanes.length - 1].nom} rejoint ta flotte !`);
  } else if (type === "caravanier") {
    const i = Number(arg);
    ok = embaucherCaravanier(etat, i);
    if (ok)
      toast(
        etat.caravanes[i].trajet
          ? `🤠 Embauché ! Il prend la navette dès l'arrivée de ${etat.caravanes[i].nom}.`
          : `🤠 Embauché ! Il prendra la navette au prochain départ de ${etat.caravanes[i].nom}.`
      );
  } else if (type === "titre") {
    ok = acheterTitre(etat);
    if (ok) celebrer();
  }
  if (ok) {
    sauver(etat, Date.now());
    rendrePanneau();
  }
});

function celebrer(): void {
  fermerTout();
  const popup = $("popup");
  popup.innerHTML = `
    <div class="popup-cadre">
      <div class="popup-grand">👑</div>
      <h2>Marchand Royal !</h2>
      <p>De trois sacs de sel à Portvent jusqu'aux soies de Mirazur : le royaume entier commerce avec toi.</p>
      <p><small>${formatNombre(etat.stats.voyages)} voyages · ${formatNombre(etat.stats.marchandages)} marchandages réussis · record ${pct(etat.stats.meilleureMarge)}</small></p>
      <button type="button" class="gros-bouton">Continuer à commercer</button>
    </div>`;
  popup.hidden = false;
  popup.querySelector("button")!.addEventListener("click", () => (popup.hidden = true));
}

// ---- badges ----

function nbAchetables(): number {
  let n = 0;
  const v = prochaineVille(etat);
  if (v && v.deblocage <= etat.ecus) n++;
  const ch = CHARRETTES[etat.charrette + 1];
  if (ch && ch.prix <= etat.ecus) n++;
  const at = ATTELAGES[etat.attelage + 1];
  if (at && at.prix <= etat.ecus) n++;
  const pc = prixCaravane(etat);
  if (pc !== null && pc <= etat.ecus) n++;
  const pv = prixCaravanier(etat);
  if (pv !== null && pv <= etat.ecus && etat.caravanes.some((c) => !c.caravanier)) n++;
  return n;
}

function majBadges(): void {
  const el = $("badge-atelier");
  const n = nbAchetables();
  el.hidden = n === 0;
  if (n) setText(el, String(n));
}

// ---- mode discret ----

const TITRE = "Les Caravanes";
let discret = false;

function construireDiscret(): void {
  const cols = "ABCDEFGHIJKL".split("");
  const libelles = ["Loyer", "Fournitures", "Déplacements", "Abonnements", "Formation", "Téléphonie", "Assurances", "Maintenance", "Honoraires", "Divers"];
  const mois = ["Juil.", "Août", "Sept.", "Total T3", "Budget", "Écart"];
  let lignes = `<tr><th></th>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>`;
  let somme = 0;
  for (let r = 1; r <= 40; r++) {
    let cellules: string[] = cols.map(() => "");
    if (r === 1) cellules = ["Poste", ...mois];
    else if (r >= 2 && r < 2 + libelles.length) {
      const base = 400 + (Math.imul(r, 2654435761) >>> 0) % 2600;
      const m = [base, Math.round(base * 1.04), Math.round(base * 0.97)];
      const total = m[0] + m[1] + m[2];
      const budget = Math.round(total * 1.02 / 100) * 100;
      somme += total;
      cellules = [libelles[r - 2], ...m.map(String), String(total), String(budget), String(budget - total)];
    } else if (r === 2 + libelles.length) cellules = ["TOTAL", "", "", "", String(somme), "", ""];
    lignes += `<tr><th>${r}</th>${cols.map((_, k) => `<td>${cellules[k] ?? ""}</td>`).join("")}</tr>`;
  }
  $("discret").innerHTML = `
    <div class="d-ruban"><span>Fichier</span><span>Accueil</span><span>Insertion</span><span>Mise en page</span><span>Formules</span><span>Données</span><span>Révision</span><span>Affichage</span></div>
    <div class="d-formule"><span>E12</span><span>fx</span><span>=SOMME(E2:E11)</span></div>
    <div class="d-feuille"><table>${lignes}</table></div>
    <div class="d-onglets"><span class="actif">Budget T3</span><span>Détail</span><span>Hypothèses</span></div>`;
}

function basculerDiscret(): void {
  discret = !discret;
  if (discret && !$("discret").innerHTML) construireDiscret();
  $("discret").hidden = !discret;
  majTitre();
}

$("btn-discret").addEventListener("click", basculerDiscret);
$("discret").addEventListener("dblclick", basculerDiscret);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    basculerDiscret();
  } else if ((e.key === "r" || e.key === "R") && comptoirI !== null && !discret) tournerMain();
});

function majTitre(): void {
  if (discret) return setText(document.querySelector("title")!, "Budget_T3_v2.xlsx");
  const n = etat.caravanes.filter((c) => c.aVendre || (enChargement(c) && !(c.caravanier && c.auto))).length;
  const arrivees = etat.caravanes.filter((c) => c.aVendre).length;
  setText(
    document.querySelector("title")!,
    arrivees ? `(${arrivees}) 🐪 Caravane arrivée !` : n ? `(${n}) ${TITRE}` : TITRE
  );
}

// ---- en-tête ----

function majEntete(): void {
  setText($("ecus"), formatEcus(etat.ecus));
}

function flotterGain(montant: number): void {
  const f = document.createElement("span");
  f.className = "flotte";
  f.textContent = `+${formatEcus(montant)}`;
  $("ecus").append(f);
  f.addEventListener("animationend", () => f.remove());
}

// ---- boucle ----

let dernierLent = 0;
let dernierEtal = 0;
function frame(): void {
  const now = Date.now();
  const avant = etat.caravanes.map((c) => c.aVendre);
  const bilan = avancer(etat, now);
  if (bilan.gain > 0) flotterGain(bilan.gain);
  etat.caravanes.forEach((c, i) => {
    if (c.aVendre && !avant[i]) toast(`🐪 ${c.nom} est arrivée à ${VILLE_PAR_ID[c.ville].nom} !`);
  });

  majEntete();
  rendreCarte();
  majPions(now);
  rendreFiches(now);
  if (now - dernierLent > 250) {
    dernierLent = now;
    majPanneau();
    majBadges();
    majTitre();
  }
  if (comptoirI !== null && now - dernierEtal > 2000) {
    dernierEtal = now;
    rendreEtal(now);
    rendreResume(now);
  }
  requestAnimationFrame(frame);
}

// ---- retour d'absence ----

function accueillir(): void {
  const now = Date.now();
  const absence = now - etat.savedAt;
  const bilan = avancer(etat, now);
  const attendent = etat.caravanes.filter((c) => c.aVendre).length;
  if (absence < 60_000 || (bilan.voyages === 0 && attendent === 0)) return;
  const popup = $("popup");
  popup.innerHTML = `
    <div class="popup-cadre">
      <h2>Pendant ton absence…</h2>
      <p>${formatDuree(absence / 1000)} ont passé sur les routes.</p>
      ${
        bilan.voyages
          ? `<p>Tes caravaniers ont fait <b>${bilan.voyages}</b> voyage${bilan.voyages > 1 ? "s" : ""} et encaissé</p>
             <p class="popup-gain">+${formatEcus(bilan.gain)}</p>`
          : ""
      }
      ${attendent ? `<p>🐪 ${attendent} caravane${attendent > 1 ? "s t'attendent" : " t'attend"} au marché.</p>` : ""}
      <button type="button" class="gros-bouton">En route !</button>
    </div>`;
  popup.hidden = false;
  popup.querySelector("button")!.addEventListener("click", () => (popup.hidden = true));
}

// ---- sauvegarde ----

setInterval(() => sauver(etat, Date.now()), 5000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") sauver(etat, Date.now());
});
window.addEventListener("pagehide", () => sauver(etat, Date.now()));

accueillir();
requestAnimationFrame(frame);
