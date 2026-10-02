// Cité Petit Prince — un Tiny Tower dans une cité. La tour est dessinée sur
// le canvas ; tout ce qui se gère (étages, embauches, stocks, construction,
// Le Fil) passe par des panneaux DOM en bas d'écran.

import {
  CATEGORIES,
  CATEGORIE_PAR_ID,
  COMMERCES,
  COMMERCE_PAR_ID,
  DEBLOCAGE_RANG,
  EMPLOYES_MAX,
  PLACES_APPART,
  dureeChantier,
} from "./data.ts";
import { dessiner, hitTest, scrollMax, type Course, type Vue } from "./render.ts";
import {
  avancer,
  capacite,
  chantierEnCours,
  charger,
  commander,
  commerceDe,
  construire,
  coutProchainEtage,
  dejaConstruit,
  embaucher,
  embaucherGerant,
  employes,
  estDebloque,
  prixGerant,
  etagesConstruits,
  finirChantier,
  finirLivraison,
  formatArgent,
  formatDuree,
  licencier,
  monterVisiteur,
  multVente,
  nomHabitant,
  prixUnitaire,
  residents,
  sauver,
  ticketsPourChantier,
  type Etat,
  type Habitant,
} from "./sim.ts";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let etat: Etat = charger(Date.now());

// ---- canvas ----

const canvas = $<HTMLCanvasElement>("tour");
const ctx = canvas.getContext("2d")!;
const vue: Vue = { W: 0, H: 0, scroll: 0, now: Date.now(), course: null, selection: null };

// Sur grand écran, on grossit toute la scène : la tour remplit l'écran au
// lieu de flotter au milieu du ciel. Coordonnées du dessin = pixels / zoom.
let zoom = 1;

function redimensionner(): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  zoom = Math.max(1, Math.min(1.7, window.innerWidth / 600, window.innerHeight / 560));
  vue.W = window.innerWidth / zoom;
  vue.H = window.innerHeight / zoom;
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
  ctx.imageSmoothingEnabled = false;
  borner();
}
window.addEventListener("resize", redimensionner);

function borner(): void {
  vue.scroll = Math.min(scrollMax(etat, vue), Math.max(0, vue.scroll));
}

// ---- toast ----

let toastTimer = 0;
function toast(msg: string): void {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("visible"), 2400);
}

// ---- ascenseur ----

function courseEnCours(now: number): boolean {
  const c = vue.course;
  return c !== null && now < c.debut + 2 * c.montee + 400;
}

function lancerAscenseur(): void {
  const now = Date.now();
  if (courseEnCours(now)) return;
  const c = monterVisiteur(etat);
  if (!c) {
    toast("Personne n'attend l'ascenseur pour l'instant.");
    return;
  }
  const course: Course = { debut: now, etage: c.etage, montee: 500 + 110 * c.etage, visiteur: c.etage * 31 + etat.nextId };
  vue.course = course;
  window.setTimeout(
    () => toast(`🛗 ${c.etage + 1}e étage : +${formatArgent(c.gain)}${c.ticket ? " et 🎟️ 1 !" : ""}`),
    course.montee
  );
}
$("btn-ascenseur").addEventListener("click", lancerAscenseur);

// ---- entrées sur la tour ----

let appui: { id: number; y0: number; scroll0: number; bouge: boolean } | null = null;

canvas.addEventListener("pointerdown", (e) => {
  appui = { id: e.pointerId, y0: e.clientY, scroll0: vue.scroll, bouge: false };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!appui || appui.id !== e.pointerId) return;
  const dy = (e.clientY - appui.y0) / zoom;
  if (Math.abs(dy) > 6) appui.bouge = true;
  if (appui.bouge) {
    vue.scroll = appui.scroll0 + dy;
    borner();
  }
});
canvas.addEventListener("pointerup", (e) => {
  if (!appui || appui.id !== e.pointerId) return;
  const clic = !appui.bouge;
  appui = null;
  if (!clic) return;
  const cible = hitTest(etat, vue, e.clientX / zoom, e.clientY / zoom);
  if (!cible) return;
  if (cible.type === "ascenseur") lancerAscenseur();
  else if (cible.type === "fantome") ouvrir({ k: "construire" });
  else ouvrir({ k: "etage", i: cible.i });
});
canvas.addEventListener("pointercancel", () => (appui = null));
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    vue.scroll -= e.deltaY / zoom;
    borner();
  },
  { passive: false }
);

// ---- panneaux ----

type Panneau =
  | { k: "etage"; i: number }
  | { k: "embauche"; i: number }
  | { k: "construire" }
  | { k: "habitants" }
  | { k: "fil" };

let panneau: Panneau | null = null;
let dernierHtml = "";
let doigtSurPanneau = false;

function ouvrir(p: Panneau): void {
  panneau = p;
  dernierHtml = "";
  vue.selection = null;
  $("panneau").hidden = false;
  $("voile").hidden = false;
  if (p.k === "fil") etat.filNonLus = 0;
  rafraichirPanneau(true);
  $("panneau-corps").scrollTop = 0;
}

function fermer(): void {
  panneau = null;
  vue.selection = null;
  $("panneau").hidden = true;
  $("voile").hidden = true;
}

$("panneau-fermer").addEventListener("click", fermer);
$("voile").addEventListener("click", fermer);
document.querySelectorAll<HTMLButtonElement>("[data-panneau]").forEach((b) =>
  b.addEventListener("click", () => {
    const k = b.dataset.panneau as "habitants" | "fil" | "construire";
    if (panneau?.k === k) fermer();
    else ouvrir({ k });
  })
);

// Un bouton reconstruit entre l'appui et le relâché perdrait le clic : on
// ne touche pas au panneau tant qu'un doigt est dessus.
const corps = $("panneau-corps");
corps.addEventListener("pointerdown", () => (doigtSurPanneau = true));
window.addEventListener("pointerup", () => setTimeout(() => (doigtSurPanneau = false), 0));
window.addEventListener("pointercancel", () => (doigtSurPanneau = false));

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function bouton(action: string, texte: string, actif: boolean, classe = ""): string {
  return `<button type="button" class="item-bouton ${classe}" data-action="${action}" ${actif ? "" : "disabled"}>${texte}</button>`;
}

function item(icone: string, titre: string, sous: string, droite: string, classe = ""): string {
  return `<div class="item ${classe}"><span class="item-icone">${icone}</span><div class="item-texte"><b>${titre}</b><small>${sous}</small></div>${droite}</div>`;
}

function etoiles(n: number): string {
  return `<span class="etoiles">${"★".repeat(Math.round(n / 3))}${"☆".repeat(3 - Math.round(n / 3))}</span> ${n}/9`;
}

function reveDe(h: Habitant): string {
  const c = COMMERCE_PAR_ID[h.reve];
  return `${c.icone} ${c.nom}`;
}

function travailDe(h: Habitant): string {
  if (h.travail === null) return "sans emploi";
  const c = commerceDe(etat.etages[h.travail]);
  return `💼 ${c?.nom ?? "?"} (${h.travail + 1}e)`;
}

function titreEtHtml(now: number): [string, string] {
  const p = panneau!;
  if (p.k === "etage") return panneauEtage(p.i, now);
  if (p.k === "embauche") return panneauEmbauche(p.i);
  if (p.k === "construire") return panneauConstruire(now);
  if (p.k === "habitants") return panneauHabitants();
  return panneauFil(now);
}

function panneauEtage(i: number, now: number): [string, string] {
  const e = etat.etages[i];
  vue.selection = i;
  const c = commerceDe(e);
  const titre = c ? `${c.icone} ${c.nom} · ${i + 1}e` : `🏠 Appartement · ${i + 1}e`;
  if (e.chantierFin !== null) {
    const n = ticketsPourChantier(etat, i, now);
    return [
      titre,
      `<p class="intro">🏗️ Chantier en cours : encore <b>${formatDuree(e.chantierFin - now)}</b>.</p>` +
        bouton("finir-chantier", `Finir tout de suite · 🎟️ ${n}`, etat.tickets >= n, "large"),
    ];
  }
  if (!c) {
    const hab = residents(etat, i);
    return [
      titre,
      `<p class="intro">${hab.length}/${PLACES_APPART} habitants.</p>` +
        hab.map((h) => item("🙂", esc(nomHabitant(h)), `${travailDe(h)} · rêve : ${reveDe(h)}`, "")).join("") +
        (hab.length < PLACES_APPART ? `<p class="intro">Un nouvel habitant arrive bientôt…</p>` : ""),
    ];
  }
  const cat = CATEGORIE_PAR_ID[c.categorie];
  const emp = employes(etat, i);
  let html = `<p class="intro">${cat.icone} ${cat.nom} · prix de vente ×${multVente(etat, i).toFixed(2).replace(".", ",")}</p>`;
  html += `<h3>Employés ${emp.length}/${EMPLOYES_MAX}</h3>`;
  for (let k = 0; k < EMPLOYES_MAX; k++) {
    const h = emp[k];
    if (h)
      html += item(
        h.reve === c.id ? "🤩" : "🙂",
        esc(nomHabitant(h)),
        `${cat.nom} ${etoiles(h.competences[c.categorie])}${h.reve === c.id ? " · ✨ métier de rêve" : ""}`,
        bouton(`licencier:${h.id}`, "Renvoyer", true, "discret")
      );
    else
      html += item("➕", "Poste libre", "Un employé de plus débloque un produit.", bouton(`choisir:${i}`, "Embaucher", true));
  }
  html += `<h3>Stocks</h3>`;
  c.produits.forEach((def, k) => {
    const p = e.produits[k];
    const pu = prixUnitaire(etat, i, def);
    let sous: string;
    let droite: string;
    if (p.etat === "livraison") {
      sous = `🚚 en livraison · ${formatDuree(p.fin - now)}`;
      droite = bouton(`livrer:${i}:${k}`, "Finir · 🎟️ 1", etat.tickets >= 1);
    } else if (p.etat === "vente") {
      sous = `🟢 en vente · ${def.quantite - p.vendus}/${def.quantite} restants · ${formatArgent(pu)} l'unité`;
      droite = "";
    } else {
      sous = `${def.quantite} × ${formatArgent(pu)} · livré en ${formatDuree(def.livraison * 1000)}`;
      droite =
        emp.length >= k + 1
          ? bouton(`commander:${i}:${k}`, `Commander · ${formatArgent(def.cout)}`, etat.argent >= def.cout)
          : bouton("", `${k + 1} employé${k ? "s" : ""} requis`, false);
    }
    html += item(["①", "②", "③"][k], esc(def.nom), sous, droite, p.etat === "vide" && emp.length >= k + 1 ? "alerte" : "");
  });
  html += `<h3>Gérant</h3>`;
  const pg = prixGerant(etat, i)!;
  html += e.gerant
    ? item("🧑‍💼", "Gérant en poste", "Il recommande tout seul chaque stock épuisé, même onglet fermé (s'il y a de quoi payer).", "")
    : item(
        "🧑‍💼",
        "Embaucher un gérant",
        "Il recommande tout seul chaque stock épuisé, même onglet fermé. Idéal quand tu n'as pas le temps.",
        bouton(`gerant:${i}`, formatArgent(pg), etat.argent >= pg)
      );
  return [titre, html];
}

function panneauEmbauche(i: number): [string, string] {
  const c = commerceDe(etat.etages[i])!;
  const tries = etat.habitants
    .filter((h) => h.travail !== i)
    .sort(
      (a, b) =>
        Number(a.travail !== null) - Number(b.travail !== null) ||
        Number(b.reve === c.id) - Number(a.reve === c.id) ||
        b.competences[c.categorie] - a.competences[c.categorie]
    );
  const cat = CATEGORIE_PAR_ID[c.categorie];
  const html =
    `<p class="intro">Qui embaucher au ${c.icone} ${c.nom} ? Compétence en ${cat.nom} : +3 % de prix par point. Métier de rêve : +30 % et 🎟️ 1.</p>` +
    (tries.length === 0 ? `<p class="intro">Personne de disponible : construis un appartement !</p>` : "") +
    tries
      .map((h) =>
        item(
          h.reve === c.id ? "🤩" : "🙂",
          esc(nomHabitant(h)) + (h.reve === c.id ? ` <span class="reve">✨ son rêve</span>` : ""),
          `${cat.nom} ${etoiles(h.competences[c.categorie])} · ${travailDe(h)}`,
          bouton(`embaucher:${h.id}:${i}`, h.travail === null ? "Embaucher" : "Transférer", true)
        )
      )
      .join("");
  return [`${c.icone} Embaucher · ${c.nom}`, html];
}

function panneauConstruire(now: number): [string, string] {
  const n = etat.etages.length + 1;
  const ch = chantierEnCours(etat);
  if (ch !== null) {
    const e = etat.etages[ch];
    const t = ticketsPourChantier(etat, ch, now);
    return [
      "🏗️ Construire",
      `<p class="intro">Un chantier à la fois : le ${ch + 1}e étage sera prêt dans <b>${formatDuree(e.chantierFin! - now)}</b>.</p>` +
        bouton("finir-chantier", `Finir tout de suite · 🎟️ ${t}`, etat.tickets >= t, "large"),
    ];
  }
  const cout = coutProchainEtage(etat);
  const assez = etat.argent >= cout;
  const hauteur = etagesConstruits(etat);
  let html = `<p class="intro">Étage n° ${n} · <b>${formatArgent(cout)}</b> · chantier de ${formatDuree(dureeChantier(n))}. Chaque étage terminé rapporte 🎟️ 1.</p>`;
  html += item("🏠", "Appartement", `Loge ${PLACES_APPART} habitants`, bouton("construire:appartement", "Construire", assez));
  for (const cat of CATEGORIES) {
    html += `<h3>${cat.icone} ${cat.nom}</h3>`;
    for (const c of COMMERCES.filter((x) => x.categorie === cat.id)) {
      let droite: string;
      let sous: string;
      if (dejaConstruit(etat, c.id)) {
        sous = "déjà dans la tour";
        droite = `<span class="fait">✓</span>`;
      } else if (!estDebloque(etat, c)) {
        sous = `🔒 à partir de ${DEBLOCAGE_RANG[c.rang]} étages (${hauteur} pour l'instant)`;
        droite = "";
      } else {
        sous = c.produits.map((p) => p.nom).join(" · ");
        droite = bouton(`construire:${c.id}`, "Construire", assez);
      }
      html += item(c.icone, c.nom, sous, droite, estDebloque(etat, c) ? "" : "verrou");
    }
  }
  return ["🏗️ Construire", html];
}

function panneauHabitants(): [string, string] {
  const sans = etat.habitants.filter((h) => h.travail === null).length;
  const html =
    `<p class="intro">${etat.habitants.length} habitants · ${sans} sans emploi. Place chacun dans le commerce de ses rêves pour un bonus !</p>` +
    etat.habitants
      .map((h) => {
        const i = etat.etages.findIndex((e) => e.type === h.reve && e.chantierFin === null);
        const peut = i !== -1 && h.travail !== i && employes(etat, i).length < EMPLOYES_MAX;
        return item(
          h.travail !== null && etat.etages[h.travail].type === h.reve ? "🤩" : "🙂",
          esc(nomHabitant(h)),
          `🏠 ${h.logement + 1}e · ${travailDe(h)} · rêve : ${reveDe(h)}`,
          peut ? bouton(`embaucher:${h.id}:${i}`, "✨ Au rêve", true) : ""
        );
      })
      .join("");
  return ["👥 Habitants", html];
}

function depuis(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  return h < 24 ? `il y a ${h} h` : `il y a ${Math.floor(h / 24)} j`;
}

function panneauFil(now: number): [string, string] {
  etat.filNonLus = 0;
  const html = etat.fil
    .map(
      (p) => `<div class="post"><div class="post-tete"><b>@${esc(p.auteur)}</b><small>${depuis(now - p.at)}</small></div><p>${esc(p.texte)}</p></div>`
    )
    .join("");
  return ["📱 Le Fil", html || `<p class="intro">Rien pour l'instant.</p>`];
}

function rafraichirPanneau(force = false): void {
  if (!panneau || (doigtSurPanneau && !force)) return;
  const [titre, html] = titreEtHtml(Date.now());
  $("panneau-titre").textContent = titre;
  if (html !== dernierHtml) {
    corps.innerHTML = html;
    dernierHtml = html;
  }
}

corps.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
  if (!b || b.disabled || !b.dataset.action) return;
  const [a, x, y] = b.dataset.action.split(":");
  const now = Date.now();
  if (a === "finir-chantier") {
    if (finirChantier(etat, now)) toast("🏗️ Chantier terminé !");
  } else if (a === "licencier") {
    licencier(etat, Number(x));
  } else if (a === "choisir") {
    ouvrir({ k: "embauche", i: Number(x) });
    return;
  } else if (a === "embaucher") {
    const h = etat.habitants.find((k) => k.id === Number(x))!;
    const i = Number(y);
    const reve = h.reve === etat.etages[i].type && !h.reveFete;
    if (embaucher(etat, h.id, i, now)) {
      toast(reve ? `✨ ${h.prenom} réalise son rêve ! 🎟️ +1` : `💼 ${h.prenom} est embauché(e) !`);
      if (panneau?.k === "embauche") {
        ouvrir({ k: "etage", i });
        return;
      }
    }
  } else if (a === "commander") {
    commander(etat, Number(x), Number(y), now);
  } else if (a === "livrer") {
    finirLivraison(etat, Number(x), Number(y), now);
  } else if (a === "gerant") {
    if (embaucherGerant(etat, Number(x))) toast("🧑‍💼 Gérant embauché : il s'occupe des commandes !");
  } else if (a === "construire") {
    if (construire(etat, x, now)) {
      const c = COMMERCE_PAR_ID[x];
      toast(`🏗️ Chantier lancé : ${c ? c.nom : "appartement"}`);
      fermer();
      vue.scroll = scrollMax(etat, vue);
      return;
    }
  }
  rafraichirPanneau(true);
});

// ---- HUD ----

function setText(el: HTMLElement, t: string): void {
  if (el.textContent !== t) el.textContent = t;
}

function badge(id: string, n: number): void {
  const el = $(id);
  el.hidden = n === 0;
  setText(el, String(n));
}

function majHud(): void {
  setText($("hud-argent"), `💶 ${formatArgent(etat.argent)}`);
  setText($("hud-tickets"), `🎟️ ${etat.tickets}`);
  setText($("hud-pop"), `👥 ${etat.habitants.length}/${capacite(etat)}`);
  badge("badge-ascenseur", etat.visiteurs.length);
  badge("badge-habitants", etat.habitants.filter((h) => h.travail === null).length);
  badge("badge-fil", Math.min(99, etat.filNonLus));
}

// ---- mode discret et titre de l'onglet ----

const TITRE = document.title;
let discret = false;

function construireDiscret(): void {
  const cols = "ABCDEFGHIJKL".split("");
  const libelles = ["Loyers", "Charges", "Entretien", "Ascenseur", "Gardiennage", "Eau", "Électricité", "Assurances", "Travaux", "Divers"];
  const mois = ["Juil.", "Août", "Sept.", "Total T3", "Budget", "Écart"];
  let lignes = `<tr><th></th>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>`;
  let somme = 0;
  for (let r = 1; r <= 40; r++) {
    let cellules: string[] = cols.map(() => "");
    if (r === 1) cellules = ["Poste", ...mois];
    else if (r >= 2 && r < 2 + libelles.length) {
      const base = 500 + ((Math.imul(r, 2654435761) >>> 0) % 4200);
      const m = [base, Math.round(base * 1.03), Math.round(base * 0.98)];
      const total = m[0] + m[1] + m[2];
      const budget = Math.round((total * 1.02) / 100) * 100;
      somme += total;
      cellules = [libelles[r - 2], ...m.map(String), String(total), String(budget), String(budget - total)];
    } else if (r === 2 + libelles.length) cellules = ["TOTAL", "", "", "", String(somme), "", ""];
    lignes += `<tr><th>${r}</th>${cols.map((_, k) => `<td>${cellules[k] ?? ""}</td>`).join("")}</tr>`;
  }
  $("discret").innerHTML = `
    <div class="d-ruban"><span>Fichier</span><span>Accueil</span><span>Insertion</span><span>Mise en page</span><span>Formules</span><span>Données</span><span>Révision</span><span>Affichage</span></div>
    <div class="d-formule"><span>E12</span><span>fx</span><span>=SOMME(E2:E11)</span></div>
    <div class="d-feuille"><table>${lignes}</table></div>
    <div class="d-onglets"><span class="actif">Charges T3</span><span>Détail</span><span>Hypothèses</span></div>`;
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
  if (e.key !== "Escape") return;
  e.preventDefault();
  basculerDiscret();
});

// Ruptures à commander (hors gérants) : annoncées dans le titre de l'onglet.
function majTitre(): void {
  if (discret) return setText(document.querySelector("title")!, "Charges_T3_v2.xlsx");
  let ruptures = 0;
  etat.etages.forEach((e, i) => {
    if (e.gerant || !commerceDe(e) || e.chantierFin !== null) return;
    const n = employes(etat, i).length;
    e.produits.forEach((p, k) => {
      if (p.etat === "vide" && n >= k + 1) ruptures++;
    });
  });
  setText(document.querySelector("title")!, ruptures ? `(${ruptures}) 📦 Rupture de stock !` : TITRE);
}

// ---- boucle ----

let dernierLent = 0;
function frame(): void {
  const now = Date.now();
  vue.now = now;
  avancer(etat, now);
  if (vue.course && !courseEnCours(now)) vue.course = null;
  borner();
  dessiner(ctx, etat, vue);
  if (now - dernierLent > 300) {
    dernierLent = now;
    majHud();
    majTitre();
    rafraichirPanneau();
  }
  requestAnimationFrame(frame);
}

// ---- retour d'absence ----

function accueillir(): void {
  const now = Date.now();
  const absence = now - etat.savedAt;
  const bilan = avancer(etat, now);
  if (absence < 30_000 || (bilan.ventes === 0 && bilan.arrivees === 0)) return;
  const popup = $("popup");
  popup.innerHTML = `
    <div class="popup-cadre">
      <h2>Pendant ton absence…</h2>
      <p>${formatDuree(absence)} plus tard, la cité a continué de vivre :</p>
      ${bilan.ventes > 0 ? `<p class="popup-gain">+${formatArgent(bilan.ventes)}</p><p>de ventes</p>` : ""}
      ${bilan.arrivees > 0 ? `<p>🏠 ${bilan.arrivees} nouvel${bilan.arrivees > 1 ? "s" : ""} habitant${bilan.arrivees > 1 ? "s" : ""}</p>` : ""}
      <button type="button" class="item-bouton large">Voir la tour</button>
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

redimensionner();
accueillir();
majHud();
if (etat.habitants.every((h) => h.travail === null) && etat.etages.length === 2)
  setTimeout(() => toast("👆 Touche le Snack pour embaucher tes premiers habitants !"), 800);
requestAnimationFrame(frame);
