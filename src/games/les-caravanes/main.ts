// Les Caravanes — jeu de commerce « idle mais pas que ». Les caravanes font
// des trajets en temps réel entre des villes ; quand on a cinq minutes, on
// range soi-même la charrette (façon Tetris) et on marchande à l'arrivée ;
// quand on n'a pas le temps, des caravaniers font la navette tout seuls.

import {
  AMPLIF_INFORMATEURS,
  ATTELAGES,
  BIEN_PAR_ID,
  BRANCHES,
  COMPETENCES,
  COMPETENCE_PAR_ID,
  CARACTERES,
  CHARRETTES,
  DUREE_CRENEAU,
  MULT_FETE,
  MULT_FOIRE,
  MULT_RECOLTE,
  ENTREPOTS,
  PRIX_QG,
  PRIX_TITRE_ROYAL,
  QG,
  RECETTES,
  VILLES,
  VILLE_PAR_ID,
  type BienId,
  type CompetenceId,
  type Lieu,
  type VilleId,
} from "./data.ts";
import {
  casesPiece,
  chargementAuto,
  chargementStock,
  infoLieu,
  coefVente,
  coursMonte,
  coutCargaison,
  evenementDuCreneau,
  formatDuree,
  formatEcus,
  formatNombre,
  multAchat,
  multVente,
  occupation,
  peutPlacer,
  pieceEn,
  prixAchat,
  prixVente,
  taille,
  tourner,
  valeurCargaison,
  type Evenement,
  type Piece,
  type Quota,
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
  acheterEmplacement,
  acheterQG,
  acheterTitre,
  ameliorerEntrepot,
  capaciteQG,
  casesQG,
  coutMoyen,
  deposer,
  dureeFabrication,
  fabriquer,
  peutFabriquer,
  prixEmplacement,
  qgAchetable,
  recetteVisible,
  regler,
  stockN,
  apprendre,
  duree,
  niveau,
  peutApprendre,
  pointsLibres,
  prerequis,
  sait,
  seuilNiveau,
  talents,
  ameliorerAttelage,
  ameliorerCharrette,
  avancer,
  basculerAuto,
  charger,
  debloquerVille,
  embaucherCaravanier,
  encaisser,
  enChargement,
  evenementA,
  creneauA,
  grille,
  marche as marcheA,
  noterMarchandage,
  partir,
  poser,
  prixCaravane,
  prixCaravanier,
  prochaineVille,
  remplirAuto,
  reprendre,
  sauver,
  saturationA,
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

function pctEntier(x: number): string {
  return `${Math.round(x * 100)} %`;
}

// ---- nouvelles (événements) ----

const ICONES_EVT: Record<Evenement["type"], string> = { foire: "🎪", recolte: "🌾", fete: "🎉" };

function texteEvenement(e: Evenement): string {
  const amp = sait(etat, "informateurs") ? AMPLIF_INFORMATEURS : 1;
  const fete = 1 + (MULT_FETE - 1) * amp;
  const foire = 1 + (MULT_FOIRE - 1) * amp;
  const recolte = 1 + (MULT_RECOLTE - 1) * amp;
  const v = VILLE_PAR_ID[e.ville];
  const ville = `${v.icone} <b>${v.nom}</b>`;
  if (e.type === "fete") return `🎉 Fête à ${ville} : tout s'y vend <b>+${pctEntier(fete - 1)}</b>`;
  const b = BIEN_PAR_ID[e.bien];
  if (e.type === "foire") return `🎪 Foire à ${ville} : ${b.icone} ${b.nom} s'y vend <b>+${pctEntier(foire - 1)}</b>`;
  return `🌾 Récolte exceptionnelle à ${ville} : ${b.icone} ${b.nom} <b>−${pctEntier(1 - recolte)}</b> à l'achat`;
}

let creneauAnnonce = -1;
function majNouvelles(now: number): void {
  const e = evenementA(etat, now);
  const creneau = creneauA(now);
  const reste = formatDuree(((creneau + 1) * DUREE_CRENEAU - now) / 1000);
  let html = e
    ? `${texteEvenement(e)} <small>· encore ${reste}</small>`
    : `🌤️ Marchés calmes <small>· prochaines nouvelles dans ${reste}</small>`;
  if (sait(etat, "eclaireur")) {
    const suite = evenementDuCreneau(creneau + 1, etat.villes);
    html += `<br><small class="eclaireur">🔭 Ensuite : ${suite ? texteEvenement(suite) : "marchés calmes"}</small>`;
  }
  const el = $("nouvelles");
  if (el.innerHTML !== html) el.innerHTML = html;
  el.classList.toggle("active", !!e);
  if (creneauAnnonce !== -1 && creneauAnnonce !== creneau && e) toast(`📰 ${texteEvenement(e).replace(/<[^>]+>/g, "")}`);
  creneauAnnonce = creneau;
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
    <text x="19" y="51">🌲</text><text x="22" y="53">🌲</text><text x="31" y="35">🌲</text>
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
  const evt = evenementA(etat, Date.now());
  const sig =
    etat.villes.join() +
    "|" +
    etat.caravanes.map((c) => (c.trajet ? c.trajet.de + c.trajet.vers : "")).join() +
    "|" +
    (evt ? evt.type + evt.ville : "") +
    "|" +
    (etat.qg ? `qg${etat.qg.pretes > 0}` : qgAchetable(etat));
  if (sig === signatureCarte) return;
  signatureCarte = sig;

  const ouvertes = VILLES.filter((v) => etat.villes.includes(v.id));
  let routes = "";
  for (let a = 0; a < ouvertes.length; a++)
    for (let b = a + 1; b < ouvertes.length; b++)
      routes += `<line class="route" x1="${ouvertes[a].x}" y1="${ouvertes[a].y}" x2="${ouvertes[b].x}" y2="${ouvertes[b].y}"/>`;
  if (etat.qg)
    for (const v of ouvertes) routes += `<line class="route route-qg" x1="${QG.x}" y1="${QG.y}" x2="${v.x}" y2="${v.y}"/>`;
  gRoutes.innerHTML = routes;

  gTrajets.innerHTML = etat.caravanes
    .filter((c) => c.trajet)
    .map((c) => {
      const a = infoLieu(c.trajet!.de);
      const b = infoLieu(c.trajet!.vers);
      return `<line class="trajet" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
    })
    .join("");

  // le QG : visible dès qu'on peut le fonder
  const qg = etat.qg
    ? `
      <g class="ville qg" data-lieu="qg" transform="translate(${QG.x} ${QG.y})">
        <rect x="-4.2" y="-4.2" width="8.4" height="8.4" rx="1.6"/>
        <text class="ville-icone" y="1.5">${QG.icone}</text>
        <text class="ville-nom" y="7.6">${QG.nom}</text>
        ${etat.qg.pretes > 0 ? `<text class="ville-evt" x="3.6" y="-2.6">✨</text>` : ""}
      </g>`
    : qgAchetable(etat)
      ? `
      <g class="ville qg verrouillee prochaine" data-lieu="qg" transform="translate(${QG.x} ${QG.y})">
        <rect x="-4.2" y="-4.2" width="8.4" height="8.4" rx="1.6"/>
        <text class="ville-icone" y="1.5">${QG.icone}</text>
        <text class="ville-nom" y="7.6">🔒 ${formatEcus(PRIX_QG)}</text>
      </g>`
      : "";

  gVilles.innerHTML = qg + VILLES.map((v) => {
    const ouverte = etat.villes.includes(v.id);
    const estProchaine = prochaine?.id === v.id;
    const cls = ouverte ? "ville" : estProchaine ? "ville verrouillee prochaine" : "ville verrouillee";
    const nom = ouverte ? v.nom : estProchaine ? `🔒 ${formatEcus(v.deblocage)}` : "???";
    return `
      <g class="${cls}" data-ville="${v.id}" transform="translate(${v.x} ${v.y})">
        <circle r="4.2"/>
        <text class="ville-icone" y="1.5">${ouverte || estProchaine ? v.icone : "❔"}</text>
        <text class="ville-nom" y="7.6">${nom}</text>
        ${evt?.ville === v.id ? `<text class="ville-evt" x="3.6" y="-2.6">${ICONES_EVT[evt.type]}</text>` : ""}
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
      const a = infoLieu(c.trajet.de);
      const b = infoLieu(c.trajet.vers);
      const f = Math.min(1, Math.max(0, (now - c.trajet.depart) / (c.trajet.arrivee - c.trajet.depart)));
      x = a.x + (b.x - a.x) * f;
      y = a.y + (b.y - a.y) * f;
      // léger balancement de marche
      y += Math.sin(now / 180 + i) * 0.25;
      sens = b.x > a.x ? -1 : 1; // l'emoji regarde à gauche
    } else {
      // à quai : en éventail autour de la ville
      const v = infoLieu(c.ville);
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
  if (cible.closest("[data-lieu=qg]")) return ouvrirPanneau(etat.qg ? { type: "qg", onglet: "entrepot" } : { type: "atelier" });
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
  if (c.aVendre && c.ville === "qg") toutDeposer(i);
  else if (c.aVendre) ouvrirMarche(i);
  else if (enChargement(c)) ouvrirComptoir(i);
}

function toutDeposer(i: number): void {
  const n = deposer(etat, i);
  const reste = etat.caravanes[i].cargaison.length;
  toast(
    reste
      ? `📥 ${n} pièce${n > 1 ? "s" : ""} déposée${n > 1 ? "s" : ""}. Entrepôt plein : ${reste} reste${reste > 1 ? "nt" : ""} dans la charrette.`
      : `📥 ${n} pièce${n > 1 ? "s" : ""} rangée${n > 1 ? "s" : ""} à l'entrepôt.`
  );
  sauver(etat, Date.now());
  if (panneau?.type === "qg") rendrePanneau();
}

function signatureFiche(c: Caravane): string {
  return [c.ville, c.trajet?.de ?? "", c.aVendre, c.caravanier, c.auto, c.cargaison.length, etat.charrette, c.attente != null].join("|");
}

let signaturesFiches: string[] = [];

function htmlFiche(c: Caravane, i: number): string {
  const ville = infoLieu(c.ville);
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
    const de = infoLieu(c.trajet.de);
    statut = `${de.icone} ${de.nom} → ${ville.icone} ${ville.nom} · <span class="fiche-temps"></span>
      <br><small>${c.cargaison.length ? resumeCargaison(c) : "à vide"}</small>`;
  } else if (c.aVendre && c.ville === "qg") {
    etatCls = "arrivee";
    statut = `Arrivée au ${ville.icone} <b>QG</b> ! <small>${resumeCargaison(c)}</small>`;
    actions = bouton("deposer", "📥 Tout déposer", "principal");
  } else if (c.aVendre) {
    etatCls = "arrivee";
    statut = `Arrivée à ${ville.icone} <b>${ville.nom}</b> ! <small>${resumeCargaison(c)}</small>
      <br><small>Prix affiché : <span class="fiche-valeur"></span></small>`;
    actions =
      bouton("vendre", "💰 Vendre", "") +
      bouton("marchander", `🤝 Marchander avec ${VILLE_PAR_ID[c.ville as VilleId].marchand.portrait}`, "principal");
  } else {
    etatCls = "quai";
    statut = `À quai ${c.ville === "qg" ? "au" : "à"} ${ville.icone} <b>${ville.nom}</b>${
      c.cargaison.length ? ` · chargée <small>${resumeCargaison(c)}</small>` : ""
    }${c.attente != null && c.auto ? `<br><small>⏸ Rien à livrer : le caravanier réessaie dans quelques minutes.</small>` : ""}`;
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
    } else if (c.aVendre && c.ville !== "qg") {
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
      case "deposer":
        return toutDeposer(i);
      case "vendre": {
        const montant = valeurAffichee(etat, i, now);
        const benef = encaisser(etat, i, montant, now);
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
let destination: Lieu = "terracuite";
let enMain: { bien: BienId; rot: number } | null = null;
let survol: { x: number; y: number } | null = null;

function caravaneComptoir(): Caravane | null {
  return comptoirI === null ? null : etat.caravanes[comptoirI];
}

// Tout le stock du QG, pièce par pièce.
function quotaStock(): Quota {
  const q: Quota = {};
  if (etat.qg) for (const [b, e] of Object.entries(etat.qg.stock)) q[b as BienId] = e!.n;
  return q;
}

// Rentabilité estimée d'une destination (écus par minute) avec un chargement
// auto — depuis le QG, avec ce qu'il y a en stock.
function rentabilite(depuis: Lieu, vers: VilleId, now: number): number {
  const { l, h } = grille(etat);
  const m = marcheA(etat, now);
  if (depuis === "qg") {
    const p = chargementStock(l, h, quotaStock(), vers, now, [], m);
    const gain = valeurCargaison(p, vers, now, m) - p.reduce((k, x) => k + coutMoyen(etat.qg!, x.bien), 0);
    return gain / (duree(etat, depuis, vers) / 60_000);
  }
  const p = chargementAuto(l, h, depuis, vers, now, Infinity, [], m);
  const gain = valeurCargaison(p, vers, now, m) - coutCargaison(p, depuis, now, m);
  return gain / (duree(etat, depuis, vers) / 60_000);
}

// La meilleure ville où vendre (le QG n'a pas d'⭐ : on y va pour stocker).
function meilleureDestination(depuis: Lieu, now: number): Lieu {
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
  ($("confier") as HTMLInputElement).checked = true;
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
  setText($("comptoir-titre"), c.ville === "qg" ? `📦 Entrepôt du QG · ${c.nom}` : `📦 Comptoir de ${infoLieu(c.ville).nom} · ${c.nom}`);
  // la navette avec le QG demande l'Intendant
  const avecQG = c.ville === "qg" || destination === "qg";
  $("confier-ligne").hidden = !c.caravanier || (avecQG && !sait(etat, "intendant"));

  // destinations
  const meilleure = meilleureDestination(c.ville, now);
  const lieux: Lieu[] = [...etat.villes, ...(etat.qg ? (["qg"] as const) : [])];
  $("destinations").innerHTML =
    `<span class="etiquette">Destination</span>` +
    lieux
      .filter((v) => v !== c.ville)
      .map((v) => {
        const d = infoLieu(v);
        return `<button type="button" class="dest${v === destination ? " choisie" : ""}" data-dest="${v}">
          ${d.icone} ${d.nom} <small>${formatDuree(duree(etat, c.ville, v) / 1000)}${
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
  const m = marcheA(etat, now);
  const depuisQG = c.ville === "qg";
  const biens: BienId[] = depuisQG
    ? (Object.keys(etat.qg!.stock) as BienId[]).sort((a, b) => BIEN_PAR_ID[b].base - BIEN_PAR_ID[a].base)
    : VILLE_PAR_ID[c.ville as VilleId].produit;
  const tete = depuisQG
    ? `<div class="etal-tete">⛺ Entrepôt · ${casesQG(etat.qg!)}/${capaciteQG(etat.qg!)} cases</div>`
    : `<div class="etal-tete">Étal de ${VILLE_PAR_ID[c.ville as VilleId].marchand.portrait} ${VILLE_PAR_ID[c.ville as VilleId].marchand.nom}</div>`;
  if (depuisQG && biens.length === 0) {
    $("etal").innerHTML = tete + `<p class="etal-vide">L'entrepôt est vide. Dépose des marchandises ou fabrique au QG.</p>`;
    return;
  }
  $("etal").innerHTML =
    tete +
    biens
      .map((b) => {
        const def = BIEN_PAR_ID[b];
        // au QG, la marchandise est déjà payée : on affiche ce qu'elle a coûté
        const achat = depuisQG ? coutMoyen(etat.qg!, b) : prixAchat(c.ville as VilleId, b, now, m)!;
        const versQG = destination === "qg";
        const dest = destination as VilleId;
        const vente = versQG ? 0 : prixVente(dest, b, now, m);
        const reclame = !versQG && coefVente(dest, b) > 1.5;
        const sat = versQG ? 0 : saturationA(etat, dest, b, now);
        const badges = [
          !depuisQG && multAchat(m, c.ville as VilleId, b) < 1
            ? `<em class="evt">🌾 récolte −${pctEntier(1 - multAchat(m, c.ville as VilleId, b))}</em>`
            : "",
          !versQG && multVente(m, dest, b) > 1 ? `<em class="evt">${ICONES_EVT[m.evenement!.type]} +${pctEntier(multVente(m, dest, b) - 1)}</em>` : "",
          sat >= 0.02 ? `<em class="sature">saturé −${pctEntier(sat)}</em>` : "",
        ].join("");
        const forme = tourner(def.forme, 0);
        const { l, h } = taille(forme);
        const mini = forme
          .map(([x, y]) => `<i style="grid-area:${y + 1}/${x + 1};background:${def.couleur}"></i>`)
          .join("");
        const prix = depuisQG
          ? `×${stockN(etat.qg!, b)} · coût ${formatNombre(achat)}`
          : `achat ${formatNombre(achat)} ${coursMonte(c.ville as VilleId, b, now) ? "↗" : "↘"}`;
        return `
          <button type="button" class="marchandise${enMain?.bien === b ? " en-main" : ""}" data-bien="${b}">
            <span class="mini-forme" style="grid-template-columns:repeat(${l},10px);grid-template-rows:repeat(${h},10px)">${mini}</span>
            <span class="m-texte">
              <b>${def.icone} ${def.nom}</b>
              <small>${prix}${versQG ? " · à stocker" : ` · vente ${formatNombre(vente)}`}${
                reclame ? ` <em class="reclame">★ réclamé</em>` : ""
              }${badges}</small>
            </span>
            <span class="m-gain">${versQG ? "⛺" : `+${formatNombre(vente - achat)}`}</span>
          </button>`;
      })
      .join("");
}

// Peut-on prendre une pièce de ce bien ici (écus à l'étal, stock au QG) ?
function disponible(c: Caravane, bien: BienId, now: number): boolean {
  if (c.ville === "qg") return !!etat.qg && stockN(etat.qg, bien) > 0;
  return (prixAchat(c.ville, bien, now, marcheA(etat, now)) ?? Infinity) <= etat.ecus;
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
      const ok = peutPlacer(l, h, c.cargaison, p) && disponible(c, p.bien, Date.now());
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
      if (k >= 0) prendreEnMain(comptoirI, k);
      else toast("Ça ne rentre pas là.");
    } else if (!poser(etat, comptoirI, p, now)) toast(c.ville === "qg" ? "Plus rien de ça en stock." : "Pas assez d'écus.");
  } else {
    const k = pieceEn(c.cargaison, cs.x, cs.y);
    if (k >= 0) prendreEnMain(comptoirI, k);
  }
  rendreEtal(now);
  rendreGrille();
  rendreResume(now);
});

// Reprend une pièce posée (à l'étal, ou dans l'entrepôt au QG) et la garde en main.
function prendreEnMain(i: number, k: number): void {
  const reprise = reprendre(etat, i, k);
  if (reprise) enMain = { bien: reprise.bien, rot: reprise.rot };
  else toast("L'entrepôt est plein : la pièce reste dans la charrette.");
}

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
  destination = b.dataset.dest as Lieu;
  rendreComptoir();
});

$("btn-auto").addEventListener("click", () => {
  if (comptoirI === null) return;
  const c = etat.caravanes[comptoirI];
  const n = remplirAuto(etat, comptoirI, destination, Date.now());
  if (n === 0)
    toast(c.ville === "qg" ? "Plus rien en stock qui rentre." : etat.ecus < 1 ? "Plus un écu en poche." : "Plus rien ne rentre.");
  rendreComptoir();
});

$("btn-vider").addEventListener("click", () => {
  if (comptoirI === null) return;
  vider(etat, comptoirI);
  if (etat.caravanes[comptoirI].cargaison.length) toast("L'entrepôt est plein : le reste demeure dans la charrette.");
  rendreComptoir();
});

function rendreResume(now: number): void {
  const c = caravaneComptoir();
  if (!c) return;
  const { l, h } = grille(etat);
  const occupees = occupation(c.cargaison).size;
  const lignes = [`<div><dt>${c.ville === "qg" ? "Coût du stock" : "Payé"}</dt><dd>${formatEcus(c.cout)}</dd></div>`];
  if (destination === "qg") {
    const libre = capaciteQG(etat.qg!) - casesQG(etat.qg!);
    lignes.push(`<div><dt>Place à l'entrepôt</dt><dd class="${occupees > libre ? "negatif" : ""}">${libre} cases</dd></div>`);
  } else {
    const vente = valeurCargaison(c.cargaison, destination, now, marcheA(etat, now));
    const benef = vente - c.cout;
    lignes.push(
      `<div><dt>Vente estimée</dt><dd>${formatEcus(vente)}</dd></div>`,
      `<div><dt>Bénéfice</dt><dd class="${benef >= 0 ? "positif" : "negatif"}">${benef >= 0 ? "+" : ""}${formatEcus(benef)}</dd></div>`
    );
  }
  lignes.push(
    `<div><dt>Charrette</dt><dd>${occupees}/${l * h} cases</dd></div>`,
    `<div><dt>En poche</dt><dd>${formatEcus(etat.ecus)}</dd></div>`
  );
  $("resume").innerHTML = lignes.join("");
  const nomDest = destination === "qg" ? "le QG" : infoLieu(destination).nom;
  const temps = formatDuree(duree(etat, c.ville, destination) / 1000);
  setText(
    $("btn-partir"),
    c.cargaison.length ? `🐪 En route pour ${nomDest} (${temps})` : `🐪 Partir à vide pour ${nomDest} (${temps})`
  );
}

$("btn-partir").addEventListener("click", () => {
  if (comptoirI === null) return;
  const c = etat.caravanes[comptoirI];
  const confier = c.caravanier && !$("confier-ligne").hidden ? ($("confier") as HTMLInputElement).checked : undefined;
  if (partir(etat, comptoirI, destination, Date.now(), confier)) {
    toast(`🐪 ${c.nom} prend la route ${destination === "qg" ? "du QG" : `de ${infoLieu(destination).nom}`} !`);
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
  const m = VILLE_PAR_ID[c.ville as VilleId].marchand;
  marche = {
    i,
    n: ouvrirNegociation(m.caractere, valeurAffichee(etat, i, Date.now()), Math.random, talents(etat)),
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
  const m = VILLE_PAR_ID[c.ville as VilleId].marchand;
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
      <span>🤝 Marché de ${VILLE_PAR_ID[c.ville as VilleId].nom}</span>
      ${commence || n.fin ? "" : `<button type="button" class="fermer" data-m="fermer" aria-label="fermer">✕</button>`}
    </div>
    <div class="marchand">
      <div class="portrait">${m.portrait}<span class="humeur">${humeur}</span></div>
      <div>
        <b>${m.nom}</b>
        <small class="caractere">${car.nom} — ${car.indice}</small>
        <small class="patience" title="patience">Patience ${jauge}</small>
        ${n.fourchette && !n.fin ? `<small class="oeil">👁️ Il lâchera entre ${pct(n.fourchette[0])} et ${pct(n.fourchette[1])}</small>` : ""}
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
      const benef = encaisser(etat, marche.i, montant, Date.now(), n.fin!.fache ? 0 : n.fin!.marge);
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

// ---- panneaux (atelier, aide, ville, QG) ----

type OngletQG = "entrepot" | "fabrication" | "caravaniers";
type Panneau =
  | { type: "atelier" }
  | { type: "talents" }
  | { type: "aide" }
  | { type: "ville"; id: VilleId }
  | { type: "qg"; onglet: OngletQG };
let panneau: Panneau | null = null;
let ongletQG: OngletQG = "entrepot";

function ouvrirPanneau(p: Panneau): void {
  fermerTout();
  if (p.type === "qg") {
    ongletQG = p.onglet;
    if (etat.qg) etat.qg.pretes = 0; // les fabrications finies sont vues
  }
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
    const type = b.dataset.panneau as "atelier" | "talents" | "aide" | "qg";
    if (panneau?.type === type) fermerTout();
    else ouvrirPanneau(type === "qg" ? { type, onglet: ongletQG } : { type });
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

  html += lignesQG();

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

// Achats liés au QG : sa fondation, puis l'entrepôt et les emplacements.
function lignesQG(): string {
  if (qgAchetable(etat))
    return ligne(
      QG.icone,
      "Fonder ton QG",
      "Au centre de la carte : un entrepôt pour stocker ce que tu veux, et un atelier pour fabriquer des produits qui valent plus cher.",
      "qg",
      formatEcus(PRIX_QG),
      PRIX_QG
    );
  if (!etat.qg) return "";
  const en = ENTREPOTS[etat.qg.entrepot];
  const enSuiv = ENTREPOTS[etat.qg.entrepot + 1];
  let html = enSuiv
    ? ligne("📦", `${enSuiv.nom} · ${enSuiv.cases} cases`, `Au QG. Actuel : ${en.nom}, ${en.cases} cases.`, "entrepot", formatEcus(enSuiv.prix), enSuiv.prix)
    : ligne("📦", `${en.nom} · ${en.cases} cases`, "Le plus grand entrepôt du royaume.", "", "✓", null);
  const pe = prixEmplacement(etat);
  html +=
    pe !== null
      ? ligne("⚒️", "Nouvel emplacement de fabrication", `Tu en as ${etat.qg.emplacements.length}. Une fabrication de plus en même temps.`, "emplacement", formatEcus(pe), pe)
      : ligne("⚒️", "Atelier complet", `${etat.qg.emplacements.length} emplacements de fabrication.`, "", "✓", null);
  return html;
}

function nbCases(n: number): string {
  return `${n} case${n > 1 ? "s" : ""}`;
}

// Durée d'une recette : « 15 min », « 1 h 30 » (pas « 15:00 », qu'on lirait comme une heure).
function dureeLisible(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, "0")}` : ""}`;
}

function htmlQG(onglet: OngletQG): string {
  const qg = etat.qg!;
  const onglets = (
    [
      ["entrepot", "📦 Entrepôt"],
      ["fabrication", "⚒️ Fabrication"],
      ["caravaniers", "🤠 Caravaniers"],
    ] as const
  )
    .map(([id, nom]) => `<button type="button" class="onglet${id === onglet ? " actif" : ""}" data-onglet="${id}">${nom}</button>`)
    .join("");
  let corps = "";
  if (onglet === "entrepot") {
    const pris = casesQG(qg);
    const cap = capaciteQG(qg);
    const lignes = (Object.entries(qg.stock) as [BienId, { n: number; cout: number }][])
      .sort(([a], [b]) => BIEN_PAR_ID[b].base - BIEN_PAR_ID[a].base)
      .map(([b, e]) => {
        const d = BIEN_PAR_ID[b];
        return `<li><span>${d.icone} ${d.nom} <b>×${e.n}</b></span><small>${nbCases(e.n * d.forme.length)} · coût ${formatNombre(e.cout / e.n)} pièce</small></li>`;
      })
      .join("");
    const enCours = qg.emplacements.filter((f) => f).length;
    corps = `
      <div class="jauge-qg">
        <div class="rep-ligne"><b>${ENTREPOTS[qg.entrepot].nom}</b><small>${pris} / ${cap} cases${enCours ? ` (dont ${enCours} produit${enCours > 1 ? "s" : ""} en fabrication)` : ""}</small></div>
        <div class="rep-barre"><div style="width:${Math.min(100, (pris / cap) * 100).toFixed(1)}%"></div></div>
      </div>
      ${lignes ? `<ul class="stock">${lignes}</ul>` : `<p class="vide-qg">L'entrepôt est vide. Envoie une caravane au ⛺ QG et dépose sa cargaison : tu peux y garder ce que tu veux, des ingrédients ou une marchandise achetée pas cher à ressortir un jour de fête.</p>`}
      <p class="astuce-qg">Pour repartir avec du stock, charge une caravane à quai au QG.</p>
      ${lignesQG()}`;
  } else if (onglet === "fabrication") {
    const now = Date.now();
    const libre = qg.emplacements.findIndex((f) => !f);
    const emplacements = qg.emplacements
      .map((f, k) => {
        if (!f) return `<div class="emplacement libre">⚒️ Emplacement ${k + 1} · libre</div>`;
        const d = BIEN_PAR_ID[f.recette];
        const pct = Math.min(100, ((now - f.debut) / (f.fin - f.debut)) * 100);
        return `
          <div class="emplacement">
            <span>${d.icone} ${d.nom} · <span class="fab-temps" data-fin="${f.fin}">${formatDuree((f.fin - now) / 1000)}</span></span>
            <div class="fiche-barre"><div class="fiche-rempli fab-rempli" data-debut="${f.debut}" data-fin="${f.fin}" style="width:${pct.toFixed(1)}%"></div></div>
          </div>`;
      })
      .join("");
    const recettes = RECETTES.filter((r) => recetteVisible(etat, r))
      .map((r) => {
        const d = BIEN_PAR_ID[r.produit];
        const ingr = r.ingredients
          .map(([b, n]) => {
            const a = stockN(qg, b);
            return `<span class="${a >= n ? "ok" : "manque"}">${BIEN_PAR_ID[b].icone} ${a}/${n}</span>`;
          })
          .join(" ");
        const cout = r.ingredients.reduce((k, [b, n]) => k + coutMoyen(qg, b) * n, 0);
        const villes = r.reclame.map((v) => VILLE_PAR_ID[v].icone + " " + VILLE_PAR_ID[v].nom).join(", ");
        const ok = peutFabriquer(etat, r) && libre >= 0;
        return `
          <div class="item recette">
            <span class="item-icone">${d.icone}</span>
            <div class="item-texte">
              <b>${d.nom} <small>· ${dureeLisible(dureeFabrication(etat, r))} · ${nbCases(d.forme.length)}</small></b>
              <small class="ingredients">${ingr}</small>
              <small>★ réclamé à ${villes} (≈ ${formatNombre(d.base * 1.7)} pièce)${cout > 0 && peutFabriquer(etat, r) ? ` · ingrédients ${formatNombre(cout)}` : ""}</small>
            </div>
            <button type="button" class="item-bouton" data-fabriquer="${r.produit}" ${ok ? "" : "disabled"}>Lancer</button>
          </div>`;
      })
      .join("");
    corps = `
      <div class="emplacements">${emplacements}</div>
      ${recettes || `<p class="vide-qg">Ouvre plus de routes pour découvrir des recettes.</p>`}
      <p class="astuce-qg">Les ingrédients se prennent dans l'entrepôt. La fabrication continue même onglet fermé${sait(etat, "compagnon") ? ", et l'atelier relance la même recette tant qu'il a de quoi faire" : ""}.</p>`;
  } else {
    // les biens qu'on peut déjà se procurer, puis les produits de l'atelier
    const produits = VILLES.filter((v) => etat.villes.includes(v.id)).flatMap((v) => v.produit);
    const fabriques = RECETTES.filter((r) => recetteVisible(etat, r)).map((r) => r.produit);
    const liste = (nom: "appro" | "ecoulement", biens: BienId[], defaut: number) =>
      biens
        .map((b) => {
          const d = BIEN_PAR_ID[b];
          const n = qg[nom][b];
          const coche = n !== undefined;
          return `
            <label class="regle${coche ? " cochee" : ""}">
              <input type="checkbox" data-liste="${nom}" data-bien="${b}" ${coche ? "checked" : ""}>
              <span>${d.icone} ${d.nom}</span>
              <small>en stock ${stockN(qg, b)}</small>
              <input type="number" min="0" max="999" inputmode="numeric" data-qte="${nom}" data-bien="${b}" value="${n ?? defaut}" ${coche ? "" : "disabled"}>
            </label>`;
        })
        .join("");
    corps = `
      ${
        sait(etat, "intendant")
          ? ""
          : `<p class="avis-qg">🔒 Apprends <b>📋 Intendant</b> (compétences, branche ⛺ QG) pour que tes caravaniers fassent la navette avec le QG. Tu peux déjà préparer tes listes.</p>`
      }
      <h3>📥 Approvisionnement</h3>
      <p class="astuce-qg">Ce que les caravaniers apportent au QG, jusqu'au <b>stock visé</b>.</p>
      <div class="regles">${liste("appro", produits, 10)}</div>
      <h3>📤 Écoulement</h3>
      <p class="astuce-qg">Ce qu'ils emportent du QG pour le vendre, en <b>gardant</b> ce nombre en stock.</p>
      <div class="regles">${liste("ecoulement", [...fabriques, ...produits], 0)}</div>`;
  }
  return `<div class="onglets">${onglets}</div>${corps}`;
}

function rendrePanneau(): void {
  if (!panneau) return;
  const corps = $("panneau-corps");
  if (panneau.type === "qg") {
    setText($("panneau-titre"), "⛺ QG du marchand");
    corps.innerHTML = htmlQG(panneau.onglet);
    signatureQG = signaturePanneauQG();
  } else if (panneau.type === "atelier") {
    setText($("panneau-titre"), "🛠️ Atelier");
    corps.innerHTML = lignesAtelier();
  } else if (panneau.type === "talents") {
    setText($("panneau-titre"), "🌟 Compétences");
    corps.innerHTML = htmlTalents();
  } else if (panneau.type === "aide") {
    setText($("panneau-titre"), "❔ Comment jouer");
    corps.innerHTML = `
      <div class="aide">
        <p><b>Achète bas, vends haut.</b> Chaque ville produit trois marchandises (pas chères chez elle) et en réclame d'autres (payées ★ très cher).</p>
        <p><b>📦 Charge ta charrette.</b> Chaque marchandise a une forme : les grosses rapportent plus par case mais se casent mal. Clic droit ou <kbd>R</kbd> pour tourner, clic sur une pièce posée pour la reprendre (remboursée). Le bouton ✨ Auto fait un rangement correct, toi tu peux faire mieux.</p>
        <p><b>🐪 Pars.</b> Le voyage dure en vrai : ferme l'onglet, reviens plus tard.</p>
        <p><b>🤝 Marchande à l'arrivée.</b> Chaque marchand a son caractère. Accepter sa contre-offre est sans risque ; en demander trop use sa patience… et s'il claque la porte, tu brades.</p>
        <p><b>📰 Nouvelles.</b> Foires, fêtes, récoltes exceptionnelles : toutes les 40 minutes, une ville peut s'animer. C'est le moment d'y envoyer du monde.</p>
        <p><b>📉 Marchés saturés.</b> Chaque pièce vendue fait baisser le prix de ce bien dans la ville (ça remonte tout seul en une demi-heure environ). Varie tes cargaisons et tes destinations.</p>
        <p><b>🤠 Embauche des caravaniers</b> (atelier) : ils font la navette tout seuls, même onglet fermé, en rejouant ton dernier rangement. Range bien, ils rangeront bien.</p>
        <p><b>🌟 Réputation.</b> Chaque bénéfice te fait connaître, et bien marchander en rapporte davantage. Chaque niveau donne un point de compétence.</p>
        <p><b>⛺ Le QG</b> (atelier, une fois Sablemire ouverte) : au centre de la carte. Dépose-y ce que tu veux (des ingrédients, ou une marchandise achetée pas cher à ressortir un jour de fête), et fabrique des produits qui valent plus cher que leurs ingrédients. La fabrication prend du temps, même onglet fermé.</p>
        <p><b>🙈 Échap</b> : mode discret.</p>
      </div>`;
  } else {
    const v = VILLE_PAR_ID[panneau.id];
    const car = CARACTERES[v.marchand.caractere];
    const now = Date.now();
    const m = marcheA(etat, now);
    setText($("panneau-titre"), `${v.icone} ${v.nom}`);
    const liste = (biens: BienId[], achat: boolean) =>
      biens
        .map((b) => {
          const d = BIEN_PAR_ID[b];
          const p = achat ? prixAchat(v.id, b, now, m)! : prixVente(v.id, b, now, m);
          const sat = achat ? 0 : saturationA(etat, v.id, b, now);
          return `<li>${d.icone} ${d.nom} <b>${formatNombre(p)}</b> ${coursMonte(v.id, b, now) ? "↗" : "↘"}${
            sat >= 0.02 ? ` <em class="sature">saturé −${pctEntier(sat)}</em>` : ""
          }</li>`;
        })
        .join("");
    const evt = m.evenement?.ville === v.id ? `<p class="nouvelle-ville">${texteEvenement(m.evenement)}</p>` : "";
    const fabriques = etat.qg ? RECETTES.filter((r) => r.reclame.includes(v.id) && recetteVisible(etat, r)).map((r) => r.produit) : [];
    corps.innerHTML = `
      <div class="fiche-ville">
        ${evt}
        <p class="marchand-ligne">${v.marchand.portrait} <b>${v.marchand.nom}</b><br><small>${car.nom} — ${car.indice}</small></p>
        <h3>Produit (prix d'achat)</h3><ul>${liste(v.produit, true)}</ul>
        <h3>Réclame ★ (prix de vente)</h3><ul>${liste(v.demande, false)}</ul>
        ${fabriques.length ? `<h3>Réclame ★ (produits du QG)</h3><ul>${liste(fabriques, false)}</ul>` : ""}
      </div>`;
  }
  majPanneau();
}

function htmlTalents(): string {
  const n = niveau(etat.reputation);
  const libres = pointsLibres(etat);
  const bas = seuilNiveau(n);
  const haut = seuilNiveau(n + 1);
  const max = n >= COMPETENCES.length;
  const f = max ? 1 : (etat.reputation - bas) / (haut - bas);
  const tete = `
    <div class="reputation">
      <div class="rep-ligne"><b>Réputation · niveau ${n}</b><small>${
        max ? "niveau maximum" : `${formatNombre(etat.reputation)} / ${formatNombre(haut)}`
      }</small></div>
      <div class="rep-barre"><div style="width:${(f * 100).toFixed(1)}%"></div></div>
      <p class="rep-points">${
        libres > 0
          ? `✨ <b>${libres}</b> point${libres > 1 ? "s" : ""} à dépenser`
          : "Vends avec bénéfice pour gagner de la réputation (bien marchander en rapporte davantage)."
      }</p>
    </div>`;
  // la branche du QG n'apparaît qu'une fois le QG fondé
  const branches = BRANCHES.filter((br) => br.id !== "qg" || etat.qg);
  const colonnes = branches.map((br) => {
    const noeuds = COMPETENCES.filter((c) => c.branche === br.id)
      .map((c) => {
        const appris = sait(etat, c.id);
        const dispo = peutApprendre(etat, c.id);
        const avant = prerequis(c.id);
        const bloque = !appris && avant !== null && !sait(etat, avant);
        const cls = appris ? "appris" : dispo ? "dispo" : bloque ? "bloque" : "attente";
        return `
          <button type="button" class="talent ${cls}" data-talent="${c.id}" ${dispo ? "" : "disabled"}>
            <span class="talent-icone">${bloque ? "🔒" : c.icone}</span>
            <b>${c.nom}</b>
            <small>${c.effet}</small>
          </button>`;
      })
      .join(`<span class="lien"></span>`);
    return `<div class="branche"><h3>${br.icone} ${br.nom}</h3>${noeuds}</div>`;
  }).join("");
  return tete + `<div class="arbre${branches.length > 3 ? " quatre" : ""}">${colonnes}</div>`;
}

// Ce qui, au QG, demande de redessiner le panneau (le reste se met à jour sur place).
let signatureQG = "";
function signaturePanneauQG(): string {
  const qg = etat.qg;
  if (!qg || panneau?.type !== "qg" || panneau.onglet === "caravaniers") return "";
  return JSON.stringify([panneau.onglet, qg.stock, qg.entrepot, qg.emplacements.map((f) => f?.recette ?? null)]);
}

function majPanneau(): void {
  if (panneau?.type !== "atelier" && panneau?.type !== "qg") return;
  if (panneau.type === "qg") {
    if (signaturePanneauQG() !== signatureQG) return rendrePanneau();
    const now = Date.now();
    document.querySelectorAll<HTMLElement>("#panneau-corps .fab-temps").forEach((el) => {
      setText(el, formatDuree((Number(el.dataset.fin) - now) / 1000));
    });
    document.querySelectorAll<HTMLElement>("#panneau-corps .fab-rempli").forEach((el) => {
      const debut = Number(el.dataset.debut);
      el.style.width = `${Math.min(100, ((now - debut) / (Number(el.dataset.fin) - debut)) * 100).toFixed(1)}%`;
    });
  }
  document.querySelectorAll<HTMLButtonElement>("#panneau-corps [data-prix]").forEach((b) => {
    b.disabled = Number(b.dataset.prix) > etat.ecus;
  });
}

// Listes des caravaniers : case cochée = bien suivi, nombre = stock visé / gardé.
$("panneau-corps").addEventListener("change", (e) => {
  const el = e.target as HTMLInputElement;
  const bien = el.dataset.bien as BienId | undefined;
  if (!bien || !etat.qg) return;
  const nom = (el.dataset.liste ?? el.dataset.qte) as "appro" | "ecoulement";
  const qte = $("panneau-corps").querySelector<HTMLInputElement>(`input[data-qte="${nom}"][data-bien="${bien}"]`)!;
  const coche = $("panneau-corps").querySelector<HTMLInputElement>(`input[data-liste="${nom}"][data-bien="${bien}"]`)!;
  const n = Math.max(0, Math.min(999, Math.floor(Number(qte.value) || 0)));
  qte.value = String(n);
  qte.disabled = !coche.checked;
  coche.closest(".regle")!.classList.toggle("cochee", coche.checked);
  regler(etat, nom, bien, coche.checked ? n : null);
  sauver(etat, Date.now());
});

$("panneau-corps").addEventListener("click", (e) => {
  const t = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-talent]");
  if (t && !t.disabled) {
    const id = t.dataset.talent as CompetenceId;
    if (apprendre(etat, id)) {
      toast(`🌟 ${COMPETENCE_PAR_ID[id].nom} : ${COMPETENCE_PAR_ID[id].effet}`);
      sauver(etat, Date.now());
      signaturesFiches = []; // la charrette a pu grandir, les durées changer
      rendrePanneau();
    }
    return;
  }
  const o = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-onglet]");
  if (o) {
    ouvrirPanneau({ type: "qg", onglet: o.dataset.onglet as OngletQG });
    return;
  }
  const f = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-fabriquer]");
  if (f && !f.disabled && etat.qg) {
    const produit = f.dataset.fabriquer as BienId;
    if (fabriquer(etat, etat.qg.emplacements.findIndex((x) => !x), produit, Date.now())) {
      toast(`⚒️ ${BIEN_PAR_ID[produit].icone} ${BIEN_PAR_ID[produit].nom} en fabrication !`);
      sauver(etat, Date.now());
      rendrePanneau();
    }
    return;
  }
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
  if (!b || b.disabled) return;
  const [type, arg] = b.dataset.action!.split(":");
  let ok = false;
  if (type === "qg") {
    ok = acheterQG(etat);
    if (ok) toast("⛺ Ton QG est fondé, au centre de la carte ! Une nouvelle branche de compétences s'ouvre.");
  } else if (type === "entrepot") {
    ok = ameliorerEntrepot(etat);
    if (ok) toast(`📦 ${ENTREPOTS[etat.qg!.entrepot].nom} : ${ENTREPOTS[etat.qg!.entrepot].cases} cases au QG.`);
  } else if (type === "emplacement") {
    ok = acheterEmplacement(etat);
    if (ok) toast(`⚒️ ${etat.qg!.emplacements.length} fabrications en même temps au QG.`);
  } else if (type === "ville") {
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
  if (qgAchetable(etat) && PRIX_QG <= etat.ecus) n++;
  if (etat.qg) {
    const en = ENTREPOTS[etat.qg.entrepot + 1];
    if (en && en.prix <= etat.ecus) n++;
    const pe = prixEmplacement(etat);
    if (pe !== null && pe <= etat.ecus) n++;
  }
  return n;
}

let niveauAnnonce = niveau(etat.reputation);
function majBadges(): void {
  const el = $("badge-atelier");
  const n = nbAchetables();
  el.hidden = n === 0;
  if (n) setText(el, String(n));
  const libres = pointsLibres(etat);
  const bt = $("badge-talents");
  bt.hidden = libres <= 0;
  if (libres > 0) setText(bt, String(libres));
  $("btn-qg").hidden = !etat.qg;
  const pretes = etat.qg?.pretes ?? 0;
  const bq = $("badge-qg");
  bq.hidden = pretes <= 0;
  if (pretes > 0) setText(bq, String(pretes));
  const niv = niveau(etat.reputation);
  if (niv > niveauAnnonce) {
    toast(`🌟 Réputation niveau ${niv} ! Un point de compétence à dépenser.`);
    if (panneau?.type === "talents") rendrePanneau();
  }
  niveauAnnonce = niv;
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
  const pretes = etat.qg?.pretes ?? 0;
  setText(
    document.querySelector("title")!,
    arrivees
      ? `(${arrivees}) 🐪 Caravane arrivée !`
      : pretes
        ? `(${pretes}) ⛺ Fabrication terminée !`
        : n
          ? `(${n}) ${TITRE}`
          : TITRE
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
  if (bilan.fabrications > 0) {
    if (panneau?.type === "qg") etat.qg!.pretes = 0; // déjà sous les yeux
    toast(`⛺ ${bilan.fabrications > 1 ? `${bilan.fabrications} fabrications terminées` : "Fabrication terminée"} au QG !`);
  }
  etat.caravanes.forEach((c, i) => {
    if (c.aVendre && !avant[i]) toast(`🐪 ${c.nom} est arrivée ${c.ville === "qg" ? "au QG" : `à ${infoLieu(c.ville).nom}`} !`);
  });

  majEntete();
  majNouvelles(now);
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
  if (absence < 60_000 || (bilan.voyages === 0 && attendent === 0 && bilan.fabrications === 0)) return;
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
      ${bilan.depots ? `<p>📥 Ils ont déposé <b>${bilan.depots}</b> pièce${bilan.depots > 1 ? "s" : ""} au QG.</p>` : ""}
      ${bilan.fabrications ? `<p>⚒️ L'atelier du QG a terminé <b>${bilan.fabrications}</b> fabrication${bilan.fabrications > 1 ? "s" : ""}.</p>` : ""}
      ${attendent ? `<p>🐪 ${attendent} caravane${attendent > 1 ? "s t'attendent" : " t'attend"} à l'arrivée.</p>` : ""}
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
