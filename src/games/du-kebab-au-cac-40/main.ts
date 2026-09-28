// Du Kebab au CAC 40 — un AdVenture Capitalist à la française. Une colonne de
// commerces, du vide-grenier à la compagnie aérienne : on tape pour produire,
// on rachète, on embauche des gérants, puis on entre en Bourse.

import {
  AMELIORATIONS,
  BONUS_PAR_ACTION,
  COMMERCES,
  COMMERCE_PAR_ID,
  type CommerceDef,
  type CommerceId,
} from "./data.ts";
import { coutAchat, formatArgent, formatDuree, formatNombre, maxAchetable, prochainPalier } from "./eco.ts";
import {
  aGerant,
  acheterCommerce,
  actionsAGagner,
  ameliorer,
  avancer,
  charger,
  dureeMs,
  embaucher,
  entrerEnBourse,
  lancer,
  progression,
  revenuCycle,
  revenuParSeconde,
  sauver,
  type Etat,
} from "./state.ts";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// En dessous de cette durée, une barre qui se remplit ne fait que clignoter :
// on l'affiche pleine avec un débit en €/s.
const CYCLE_RAPIDE_MS = 150;

let etat: Etat = charger(Date.now());

// ---- utilitaires DOM ----

function setText(el: HTMLElement, txt: string): void {
  if (el.textContent !== txt) el.textContent = txt;
}

let toastTimer = 0;
function toast(msg: string): void {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("visible"), 2200);
}

// ---- mode d'achat ----

type Mode = 1 | 10 | 100 | "max";
const MODES: Mode[] = [1, 10, 100, "max"];
let mode: Mode = 1;

function quantite(def: CommerceDef): number {
  const nb = etat.commerces[def.id].nb;
  if (mode !== "max") return mode;
  return Math.max(1, maxAchetable(def, nb, etat.argent));
}

$("mode-achat").addEventListener("click", () => {
  mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
  $("mode-achat").firstChild!.textContent = mode === "max" ? "MAX" : `×${mode}`;
});

// ---- cartes des commerces ----

interface Carte {
  def: CommerceDef;
  el: HTMLElement;
  nb: HTMLElement;
  gerant: HTMLElement;
  rempli: HTMLElement;
  gain: HTMLElement;
  temps: HTMLElement;
  bouton: HTMLButtonElement;
  boutonTxt: HTMLElement;
  boutonPrix: HTMLElement;
  palierRempli: HTMLElement;
  palierTxt: HTMLElement;
}

function creerCarte(def: CommerceDef): Carte {
  const el = document.createElement("article");
  el.className = "carte";
  el.dataset.id = def.id;
  el.innerHTML = `
    <div class="carte-icone"><span class="emoji">${def.icone}</span><span class="carte-nb"></span></div>
    <div class="carte-corps">
      <div class="carte-ligne">
        <h2>${def.nom}</h2>
        <span class="carte-gerant"></span>
      </div>
      <div class="barre-prod"><div class="barre-rempli"></div><span class="barre-gain"></span></div>
      <div class="carte-ligne">
        <button type="button" class="acheter"><span class="acheter-txt"></span><b class="acheter-prix"></b></button>
        <span class="carte-temps"></span>
      </div>
      <div class="palier"><div class="palier-rempli"></div><small class="palier-txt"></small></div>
    </div>`;
  const q = <T extends HTMLElement>(sel: string) => el.querySelector(sel) as T;
  const carte: Carte = {
    def,
    el,
    nb: q(".carte-nb"),
    gerant: q(".carte-gerant"),
    rempli: q(".barre-rempli"),
    gain: q(".barre-gain"),
    temps: q(".carte-temps"),
    bouton: q(".acheter"),
    boutonTxt: q(".acheter-txt"),
    boutonPrix: q(".acheter-prix"),
    palierRempli: q(".palier-rempli"),
    palierTxt: q(".palier-txt"),
  };

  carte.bouton.addEventListener("click", (e) => {
    e.stopPropagation();
    const n = quantite(def);
    const avant = etat.commerces[def.id].nb;
    if (acheterCommerce(etat, def.id, n, Date.now())) {
      if (avant === 0) toast(`${def.icone} ${def.nom} ouvre ses portes !`);
      const palier = prochainPalier(avant);
      if (avant > 0 && palier.cible <= etat.commerces[def.id].nb)
        toast(`${def.icone} ${palier.cible} exemplaires : ${palier.vitesse ? "vitesse" : "revenus"} ×2 !`);
    }
  });
  el.addEventListener("click", () => {
    if (lancer(etat, def.id, Date.now())) el.classList.add("tape");
  });
  el.addEventListener("animationend", () => el.classList.remove("tape"));
  return carte;
}

const cartes = COMMERCES.map(creerCarte);
$("commerces").append(...cartes.map((c) => c.el));

function flotter(carte: Carte, txt: string): void {
  const f = document.createElement("span");
  f.className = "flotte";
  f.textContent = txt;
  carte.el.append(f);
  f.addEventListener("animationend", () => f.remove());
}

function majCarte(c: Carte, now: number): void {
  const { def, el } = c;
  const ce = etat.commerces[def.id];
  const possede = ce.nb > 0;
  const gerant = aGerant(etat, def.id);
  el.classList.toggle("verrouille", !possede);
  el.classList.toggle("auto", gerant);

  // bouton d'achat
  const n = quantite(def);
  const prix = coutAchat(def, ce.nb, n);
  c.bouton.disabled = prix > etat.argent;
  setText(c.boutonTxt, possede ? `Acheter ×${n}` : "🔒 Ouvrir");
  setText(c.boutonPrix, formatArgent(prix));

  if (!possede) {
    setText(c.nb, "");
    setText(c.gerant, "");
    setText(c.gain, "");
    setText(c.temps, "");
    c.rempli.style.width = "0%";
    c.palierRempli.style.width = "0%";
    setText(c.palierTxt, "");
    return;
  }

  setText(c.nb, String(ce.nb));
  setText(c.gerant, gerant ? `👤 ${def.gerant.nom}` : "");

  const duree = dureeMs(etat, def);
  const rapide = gerant && duree < CYCLE_RAPIDE_MS;
  el.classList.toggle("rapide", rapide);
  const attente = ce.debut === null && !gerant;
  el.classList.toggle("attente", attente);
  if (rapide) {
    c.rempli.style.width = "100%";
    setText(c.gain, `${formatArgent(revenuParSeconde(etat, def))}/s`);
    setText(c.temps, "");
  } else {
    c.rempli.style.width = `${progression(etat, def, now) * 100}%`;
    setText(c.gain, formatArgent(revenuCycle(etat, def)));
    const reste = ce.debut === null ? duree : duree - (now - ce.debut);
    setText(c.temps, attente ? "tape !" : formatDuree(reste / 1000));
  }

  const p = prochainPalier(ce.nb);
  c.palierRempli.style.width = `${((ce.nb - p.precedent) / (p.cible - p.precedent)) * 100}%`;
  setText(c.palierTxt, `${ce.nb}/${p.cible} → ${p.vitesse ? "vitesse" : "revenus"} ×2`);
}

// ---- en-tête ----

function majEntete(): void {
  setText($("argent"), formatArgent(etat.argent));
  let debit = 0;
  for (const def of COMMERCES)
    if (aGerant(etat, def.id) && etat.commerces[def.id].nb > 0) debit += revenuParSeconde(etat, def);
  setText($("debit"), debit > 0 ? `+${formatArgent(debit)}/s` : "");
  const pa = $("actions");
  pa.hidden = etat.actions === 0;
  setText(pa, `📈 ${formatNombre(etat.actions)} actions · +${formatNombre(etat.actions * BONUS_PAR_ACTION * 100)} %`);
}

// ---- panneaux ----

type Panneau = "gerants" | "ameliorations" | "bourse";
let panneauOuvert: Panneau | null = null;
let confirmeBourse = false;

const TITRES: Record<Panneau, string> = {
  gerants: "🧑‍💼 Gérants",
  ameliorations: "⭐ Améliorations",
  bourse: "📈 Introduction en Bourse",
};

function ouvrir(p: Panneau): void {
  panneauOuvert = p;
  confirmeBourse = false;
  $("panneau").hidden = false;
  $("voile").hidden = false;
  setText($("panneau-titre"), TITRES[p]);
  rendrePanneau();
  $("panneau-corps").scrollTop = 0;
}

function fermer(): void {
  panneauOuvert = null;
  $("panneau").hidden = true;
  $("voile").hidden = true;
}

document.querySelectorAll<HTMLButtonElement>("[data-panneau]").forEach((b) =>
  b.addEventListener("click", () => {
    const p = b.dataset.panneau as Panneau;
    if (panneauOuvert === p) fermer();
    else ouvrir(p);
  })
);
$("panneau-fermer").addEventListener("click", fermer);
$("voile").addEventListener("click", fermer);

function ligne(icone: string, titre: string, sous: string, action: string, bouton: string, prix: number | null): string {
  const attrs = prix === null ? "disabled" : `data-action="${action}" data-prix="${prix}"`;
  return `
    <div class="item${prix === null ? " fait" : ""}">
      <span class="item-icone">${icone}</span>
      <div class="item-texte"><b>${titre}</b><small>${sous}</small></div>
      <button type="button" class="item-bouton" ${attrs}>${bouton}</button>
    </div>`;
}

function rendrePanneau(): void {
  const corps = $("panneau-corps");
  if (panneauOuvert === "gerants") {
    corps.innerHTML =
      `<p class="intro">Un gérant fait tourner son commerce tout seul, même quand tu n'es pas là.</p>` +
      COMMERCES.map((def) => {
        const g = def.gerant;
        const fait = aGerant(etat, def.id);
        return ligne(
          def.icone,
          `${g.nom} <span class="pour">· ${def.nom}</span>`,
          g.phrase,
          `gerant:${def.id}`,
          fait ? "✓ en poste" : formatArgent(g.prix),
          fait ? null : g.prix
        );
      }).join("");
  } else if (panneauOuvert === "ameliorations") {
    const restantes = AMELIORATIONS.filter((a) => !etat.ameliorations.includes(a.id));
    const faites = AMELIORATIONS.length - restantes.length;
    corps.innerHTML =
      `<p class="intro">Chaque amélioration triple les revenus de sa cible. ${faites > 0 ? `(${faites} déjà achetée${faites > 1 ? "s" : ""})` : ""}</p>` +
      restantes
        .map((a) => {
          const cible = a.cible === "tous" ? null : COMMERCE_PAR_ID[a.cible];
          return ligne(
            cible ? cible.icone : "🌍",
            a.nom,
            cible ? `${cible.nom} ×${a.mult}` : `Tous les commerces ×${a.mult}`,
            `amelio:${a.id}`,
            formatArgent(a.prix),
            a.prix
          );
        })
        .join("") +
      (restantes.length === 0 ? `<p class="intro">Tout est acheté. Chapeau, patron.</p>` : "");
  } else if (panneauOuvert === "bourse") {
    corps.innerHTML = `
      <p class="intro">Entrer en Bourse, c'est tout revendre pour repartir de zéro… avec des <b>actions</b>.
      Chaque action donne <b>+${BONUS_PAR_ACTION * 100} %</b> de revenus sur tous tes commerces, pour toujours.
      Plus ta fortune cumulée est grande, plus tu en reçois.</p>
      <dl class="bourse">
        <dt>Actions détenues</dt><dd id="b-actions"></dd>
        <dt>Bonus actuel</dt><dd id="b-bonus"></dd>
        <dt>Fortune cumulée</dt><dd id="b-cumul"></dd>
        <dt>Actions si tu entres maintenant</dt><dd id="b-gain" class="gros"></dd>
      </dl>
      <div id="b-zone"></div>`;
    rendreZoneBourse();
  }
  majPanneau();
}

function rendreZoneBourse(): void {
  const zone = document.getElementById("b-zone");
  if (!zone) return;
  zone.innerHTML = confirmeBourse
    ? `<p class="alerte">Sûr ? Argent, commerces, gérants et améliorations repartent à zéro.</p>
       <div class="boutons">
         <button type="button" class="item-bouton" data-action="bourse-non">Non, pas encore</button>
         <button type="button" class="item-bouton danger" data-action="bourse-oui">Oui, j'entre en Bourse</button>
       </div>`
    : `<button type="button" class="item-bouton large" data-action="bourse-demande" id="b-bouton">🔔 Entrer en Bourse</button>`;
}

// Met à jour ce qui bouge dans le panneau ouvert sans le reconstruire (un
// bouton recréé entre l'appui et le relâché perdrait le clic).
function majPanneau(): void {
  if (!panneauOuvert) return;
  document.querySelectorAll<HTMLButtonElement>("#panneau-corps [data-prix]").forEach((b) => {
    b.disabled = Number(b.dataset.prix) > etat.argent;
  });
  if (panneauOuvert === "bourse") {
    const gain = actionsAGagner(etat);
    setText($("b-actions"), formatNombre(etat.actions));
    setText($("b-bonus"), `+${formatNombre(etat.actions * BONUS_PAR_ACTION * 100)} %`);
    setText($("b-cumul"), formatArgent(etat.gainsCumules));
    setText($("b-gain"), `+${formatNombre(gain)}`);
    const b = document.getElementById("b-bouton") as HTMLButtonElement | null;
    if (b) b.disabled = gain === 0;
  }
}

$("panneau-corps").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
  if (!b || b.disabled) return;
  const [type, id] = b.dataset.action!.split(":");
  const now = Date.now();
  if (type === "gerant") {
    const def = COMMERCE_PAR_ID[id as CommerceId];
    if (embaucher(etat, def.id, now)) {
      toast(`${def.gerant.nom} prend les commandes de ${def.nom} !`);
      rendrePanneau();
    }
  } else if (type === "amelio") {
    const a = AMELIORATIONS.find((x) => x.id === id)!;
    if (ameliorer(etat, a.id)) {
      toast(`⭐ ${a.nom} !`);
      rendrePanneau();
    }
  } else if (type === "bourse-demande") {
    confirmeBourse = true;
    rendreZoneBourse();
  } else if (type === "bourse-non") {
    confirmeBourse = false;
    rendreZoneBourse();
    majPanneau();
  } else if (type === "bourse-oui") {
    const gain = actionsAGagner(etat);
    etat = entrerEnBourse(etat, now);
    sauver(etat, now);
    fermer();
    toast(`🔔 Bienvenue en Bourse : +${formatNombre(gain)} actions !`);
  }
});

// ---- badges ----

function majBadges(): void {
  const gerants = COMMERCES.filter(
    (d) => etat.commerces[d.id].nb > 0 && !aGerant(etat, d.id) && d.gerant.prix <= etat.argent
  ).length;
  const amelios = AMELIORATIONS.filter((a) => !etat.ameliorations.includes(a.id) && a.prix <= etat.argent).length;
  const bourse = actionsAGagner(etat) >= Math.max(10, etat.actions);
  const badge = (id: string, n: number | string | null) => {
    const el = $(id);
    el.hidden = n === null || n === 0;
    if (!el.hidden) setText(el, String(n));
  };
  badge("badge-gerants", gerants);
  badge("badge-ameliorations", amelios);
  badge("badge-bourse", bourse ? "!" : null);
}

// ---- boucle ----

let dernierLent = 0;
function frame(): void {
  const now = Date.now();
  // cycles manuels sur le point de finir : on fera flotter le gain
  const manuels = cartes.filter((c) => {
    const ce = etat.commerces[c.def.id];
    return ce.debut !== null && !aGerant(etat, c.def.id);
  });
  avancer(etat, now);
  for (const c of manuels)
    if (etat.commerces[c.def.id].debut === null) flotter(c, `+${formatArgent(revenuCycle(etat, c.def))}`);

  majEntete();
  for (const c of cartes) majCarte(c, now);
  if (now - dernierLent > 250) {
    dernierLent = now;
    majPanneau();
    majBadges();
  }
  requestAnimationFrame(frame);
}

// ---- retour d'absence ----

function accueillir(): void {
  const now = Date.now();
  const absence = now - etat.savedAt;
  const gain = avancer(etat, now);
  if (gain <= 0 || absence < 30_000) return;
  const popup = $("popup");
  popup.innerHTML = `
    <div class="popup-cadre">
      <h2>Pendant ton absence…</h2>
      <p>${formatDuree(absence / 1000)} plus tard, tes gérants ont encaissé</p>
      <p class="popup-gain">+${formatArgent(gain)}</p>
      <button type="button" class="item-bouton large">Merci l'équipe 👏</button>
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
