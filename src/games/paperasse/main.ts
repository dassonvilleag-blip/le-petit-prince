// Paperasse — affichage et interactions. La structure des cadres n'est
// reconstruite que quand elle change (nouvelle phase, projet qui apparaît…) ;
// à chaque image, on ne met à jour que les valeurs et l'état des boutons.

import {
  ENTETES,
  FEUILLES_PAR_RAMETTE,
  FRONTIERES,
  REGIONS,
  UNITES,
  USAGER_PAR_ID,
  GUICHET_DUREE,
  type UniteId,
} from "./data.ts";
import {
  capNotes,
  capacite,
  coutAffichage,
  coutCerfa,
  coutRegion,
  coutUnite,
  debitUnite,
  formatDelai,
  formatDuree,
  formatEuros,
  formatMasse,
  formatNombre,
  formatTimbre,
  mods,
  notesParSec,
  notoriete,
  pieces,
  replication,
  traitementGuichet,
} from "./eco.ts";
import {
  acheterAffichage,
  acheterProjet,
  acheterRamettes,
  acheterUnite,
  affichageDisponible,
  campagneDisponible,
  changerTimbre,
  charger,
  coutCampagne,
  coutNegociation,
  decisionGreve,
  inventerCerfa,
  lancerCampagne,
  nouvelEtat,
  nouvelleCarriere,
  ouvrirRegion,
  partirALaRetraite,
  placerGalon,
  projetAbordable,
  projetsVisibles,
  rattraper,
  repondreGuichet,
  sauver,
  tamponner,
  tick,
  uniteDisponible,
  type Etat,
} from "./state.ts";

const $ = (id: string): HTMLElement => document.getElementById(id)!;
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

let etat: Etat = charger() ?? nouvelEtat(Date.now());

// ---- retour après une absence ----

function bilanAbsence(secondes: number): void {
  if (etat.fin || secondes < 30) return;
  const r = rattraper(etat, secondes);
  if (r.dossiers < 1 && r.budget < 1) return;
  const plafond = secondes > r.duree ? ` <small>(plafonné à ${formatDuree(r.duree)})</small>` : "";
  popup(`
    <h2>Pendant votre absence</h2>
    <p class="popup-duree">${formatDuree(secondes)}${plafond}</p>
    <ul class="popup-liste">
      <li>Dossiers tamponnés : <b>+${formatNombre(r.dossiers)}</b></li>
      ${r.budget >= 1 ? `<li>Budget : <b>+${formatEuros(r.budget)}</b></li>` : ""}
    </ul>
    <p class="popup-note">Les agents ont continué. Les projets vous attendaient.</p>
    <button type="button" class="btn-tampon-petit" data-act="fermer">Reprendre le travail</button>`);
}

bilanAbsence((Date.now() - etat.savedAt) / 1000);

// ---- popups ----

function popup(html: string): void {
  $("popup").innerHTML = `<div class="popup">${html}</div>`;
  $("popup").hidden = false;
}

function fermerPopup(): void {
  $("popup").hidden = true;
  $("popup").innerHTML = "";
}

// ---- construction des cadres ----

interface Cadre {
  id: string;
  titre: string;
  html: string;
}

function cadre(id: string, titre: string, html: string): Cadre {
  return { id, titre, html };
}

function ligne(libelle: string, valeur: string, extra = ""): string {
  return `<div class="ligne"><span class="libelle">${libelle}</span><span class="pointilles"></span><span class="valeur" ${valeur}></span>${extra}</div>`;
}

const v = (cle: string): string => `data-v="${cle}"`;

function cadresGauche(e: Etat): Cadre[] {
  const m = mods(e);
  const c: Cadre[] = [];
  if (e.espace) {
    c.push(cadre("univers", "Administration de l'Univers", cadreUnivers(e)));
    return c;
  }

  c.push(
    cadre(
      "traitement",
      "Traitement des dossiers",
      `<div class="poste">
        <button type="button" class="tampon" data-act="tamponner" aria-label="Tamponner un dossier">
          <span class="tampon-manche"></span><span class="tampon-tete">TAMPONNER</span>
        </button>
        <div class="pile" id="pile-visuel" aria-hidden="true"></div>
      </div>
      ${ligne("Dossiers en attente", v("pile"))}
      ${e.projets.includes("ticket-numerote") ? ligne("Délai de traitement", v("delai")) : ""}
      ${e.phase >= 2 || e.flux.renonce > 0 ? ligne("Usagers découragés", v("renonce")) : ""}
      ${capacite(e, m) > 0 ? ligne("Débit des agents", v("debit")) : ""}`,
    ),
  );

  c.push(
    cadre(
      "recettes",
      "Recettes",
      `${ligne("Budget", v("budget"))}
      <div class="ligne timbre">
        <span class="libelle">Timbre fiscal</span><span class="pointilles"></span>
        <button type="button" class="btn-pm" data-act="timbre:-1" aria-label="Baisser le timbre">−</button>
        <span class="valeur" ${v("timbre")}></span>
        <button type="button" class="btn-pm" data-act="timbre:1" aria-label="Augmenter le timbre">+</button>
      </div>
      ${ligne("Dossiers déposés", v("demande"))}
      ${ligne("Recettes", v("recettes"))}`,
    ),
  );

  c.push(
    cadre(
      "fournitures",
      "Fournitures",
      `${ligne("Feuilles en stock", v("feuilles"))}
      <div class="ligne">
        <span class="libelle">Ramette (${FEUILLES_PAR_RAMETTE} f.)</span><span class="pointilles"></span>
        <span class="valeur" ${v("prixRamette")}></span>
        ${
          e.projets.includes("commande-groupee")
            ? `<button type="button" class="btn-case" data-act="auto"><span ${v("auto")}></span> auto</button>`
            : `<button type="button" class="btn-petit" data-act="ramette">Acheter</button>`
        }
      </div>
      ${e.flux.feuilles > 0 || e.unites.stagiaire > 0 ? ligne("Consommation", v("conso")) : ""}`,
    ),
  );

  const unites = UNITES.filter((u) => uniteDisponible(e, u.id));
  if (unites.length) {
    c.push(
      cadre(
        "personnel",
        "Personnel",
        unites
          .map(
            (u) => `
        <div class="unite">
          <span class="unite-icone">${u.icone}</span>
          <span class="unite-nom">${u.pluriel}<small>${esc(u.texte)}</small></span>
          <span class="unite-nb" ${v(`n-${u.id}`)}></span>
          <span class="unite-debit" ${v(`d-${u.id}`)}></span>
          <button type="button" class="btn-petit" data-act="unite:${u.id}"><span ${v(`c-${u.id}`)}></span></button>
        </div>`,
          )
          .join(""),
      ),
    );
  }

  if (affichageDisponible(e)) {
    c.push(
      cadre(
        "communication",
        "Communication",
        `<div class="ligne">
          <span class="libelle">Affiches en mairie</span><span class="pointilles"></span>
          <span class="valeur" ${v("affichage")}></span>
          <button type="button" class="btn-petit" data-act="affichage"><span ${v("c-affichage")}></span></button>
        </div>
        ${ligne("Notoriété", v("notoriete"))}`,
      ),
    );
  }

  if (e.phase >= 2) {
    const derniers = e.cerfas.slice(-4).reverse();
    c.push(
      cadre(
        "cerfa",
        "Formulaires Cerfa",
        `${ligne("Pièces par usager", v("pieces"))}
        <button type="button" class="btn-large" data-act="cerfa">Inventer un Cerfa <small ${v("c-cerfa")}></small></button>
        ${derniers.length ? `<ul class="cerfas">${derniers.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}`,
      ),
    );
  }

  if (e.phase === 3) c.push(cadre("territoire", "Territoire", cadreTerritoire(e)));
  return c;
}

function cadreTerritoire(e: Etat): string {
  const tuiles = REGIONS.map((r) => {
    const ouverte = e.regions.includes(r.id);
    const style = `style="grid-column:${r.col + 1};grid-row:${r.lig + 1}"`;
    return ouverte
      ? `<div class="region ouverte" ${style}><b>${esc(r.nom)}</b><small>${r.pop.toString().replace(".", ",")} M hab.</small></div>`
      : `<button type="button" class="region" ${style} data-act="region:${r.id}"><b>${esc(r.nom)}</b><small>${r.pop.toString().replace(".", ",")} M hab.</small></button>`;
  }).join("");
  const grogne = e.projets.includes("reclamation")
    ? ""
    : `<div class="jauge-titre"><span>Grogne</span><span ${v("grogne")}></span></div>
       <div class="jauge"><div class="jauge-barre" data-w="grogne"></div></div>
       ${
         campagneDisponible(e)
           ? `<button type="button" class="btn-large" data-act="campagne">Campagne de com' <small ${v("c-campagne")}></small></button>`
           : ""
       }`;
  return `${ligne("Prochaine préfecture", v("c-region"))}
    <div class="carte">${tuiles}</div>
    ${grogne}`;
}

function cadreUnivers(e: Etat): string {
  if (e.retraite) {
    return `<p class="derniere">Il ne reste qu'un dossier. Il est à votre nom.</p>
      <button type="button" class="tampon tampon-final" data-act="retraite">
        <span class="tampon-manche"></span><span class="tampon-tete">DEMANDE DE DÉPART<br />À LA RETRAITE</span>
      </button>`;
  }
  const fr = FRONTIERES[e.frontiere];
  return `<p class="frontiere">Territoire : <b>${esc(fr.nom)}</b></p>
    ${ligne("Matière non administrée", v("matiere"))}
    <div class="jauge"><div class="jauge-barre bleue" data-w="frontiere"></div></div>
    ${ligne("Guichets autonomes", v("guichets"))}
    ${ligne("Réplication", v("replication"))}
    ${ligne("Traitement par guichet", v("traitement"))}
    ${ligne("Dossiers traités", v("debit-espace"))}`;
}

function cadresDroite(e: Etat): Cadre[] {
  const c: Cadre[] = [];
  if (e.galons > 0 || e.dossiers >= 100) {
    c.push(
      cadre(
        "hierarchie",
        "Hiérarchie",
        `${ligne("Galons", v("galons"))}
        <div class="ligne">
          <span class="libelle">Réunions</span><span class="pointilles"></span>
          <span class="valeur" ${v("reunions")}></span>
          <button type="button" class="btn-pm" data-act="galon:reunion" aria-label="Ajouter une réunion">+</button>
        </div>
        <div class="ligne">
          <span class="libelle">Classeurs</span><span class="pointilles"></span>
          <span class="valeur" ${v("classeurs")}></span>
          <button type="button" class="btn-pm" data-act="galon:classeur" aria-label="Ajouter un classeur">+</button>
        </div>
        <div class="jauge-titre"><span>Notes de service</span><span ${v("notes")}></span></div>
        <div class="jauge"><div class="jauge-barre bleue" data-w="notes"></div></div>
        <p class="aide" ${v("notes-rythme")}></p>`,
      ),
    );
  }

  const visibles = projetsVisibles(e).sort((a, b) => (a.notes ?? 0) - (b.notes ?? 0));
  if (visibles.length || e.projets.length) {
    c.push(
      cadre(
        "projets",
        "Projets",
        (visibles.length
          ? visibles
              .map(
                (p) => `
          <button type="button" class="projet" data-act="projet:${p.id}">
            <span class="case">☐</span>
            <span class="projet-corps">
              <span class="projet-nom">${esc(p.nom)}</span>
              <span class="projet-texte">${esc(p.texte)}</span>
              <span class="projet-cout">${[p.notes ? `${formatNombre(p.notes)} notes` : "", p.budget ? formatEuros(p.budget) : ""].filter(Boolean).join(" · ")}</span>
              ${(p.notes ?? 0) > capNotes(e, mods(e)) ? `<span class="projet-alerte">Plus de notes que vos classeurs n'en rangent : ajoutez des classeurs.</span>` : ""}
            </span>
          </button>`,
              )
              .join("")
          : `<p class="aide">Aucun projet en attente. Continuez à tamponner.</p>`) +
          `<p class="aide">Projets réalisés : ${e.projets.length}</p>`,
      ),
    );
  }
  return c;
}

function rendreCadres(liste: Cadre[], debut: number): string {
  return liste
    .map(
      (c, i) => `
    <section class="cadre" data-cadre="${c.id}">
      <h2><span class="cadre-num">Cadre ${debut + i}</span> ${c.titre}</h2>
      <div class="cadre-corps">${c.html}</div>
    </section>`,
    )
    .join("");
}

// Ce qui, en changeant, oblige à reconstruire les cadres.
function cleStructure(e: Etat): string {
  const m = mods(e);
  return JSON.stringify([
    e.phase,
    e.espace,
    e.frontiere,
    e.retraite,
    e.fin,
    e.projets.length,
    projetsVisibles(e).map((p) => p.id),
    UNITES.filter((u) => uniteDisponible(e, u.id)).length,
    affichageDisponible(e),
    e.galons > 0 || e.dossiers >= 100,
    Math.floor(capNotes(e, m)),
    e.cerfas.length,
    e.regions.length,
    capacite(e, m) > 0,
    e.flux.renonce > 0 || e.phase >= 2,
    e.unites.stagiaire > 0,
  ]);
}

let structure = "";
let valeursEls: HTMLElement[] = [];
let boutonsEls: HTMLButtonElement[] = [];
let barresEls: HTMLElement[] = [];

function reconstruire(): void {
  const g = cadresGauche(etat);
  const d = cadresDroite(etat);
  $("col-g").innerHTML = rendreCadres(g, 1);
  $("col-d").innerHTML = rendreCadres(d, g.length + 1);
  const ent = ENTETES[etat.phase];
  $("lieu").textContent = etat.espace ? "Ministère de l'Univers" : ent.lieu;
  $("grade").textContent = etat.espace ? "Ministre de tout" : ent.grade;
  $("num-cerfa").textContent = ent.cerfa;
  document.body.dataset.phase = String(etat.phase);
  document.body.classList.toggle("espace", etat.espace);
  const med = $("medailles");
  med.hidden = etat.medailles === 0;
  med.textContent = `🎖️ × ${etat.medailles}`;
  valeursEls = [...document.querySelectorAll<HTMLElement>("#formulaire [data-v]")];
  boutonsEls = [...document.querySelectorAll<HTMLButtonElement>("#formulaire button[data-act]")];
  barresEls = [...document.querySelectorAll<HTMLElement>("#formulaire [data-w]")];
  majPile(true);
}

// ---- valeurs ----

function valeurs(e: Etat): Record<string, string> {
  const m = mods(e);
  const cap = capacite(e, m);
  const val: Record<string, string> = {
    pile: formatNombre(e.pile),
    delai: formatDelai(e.pile / Math.max(cap, 1)),
    renonce: `${Math.round(e.flux.renonce * 100)} %`,
    debit: `${formatNombre(cap)} /s`,
    budget: formatEuros(e.budget),
    timbre: formatTimbre(e.timbre),
    demande: `${formatNombre(lisse.deposes)} /s`,
    recettes: `${formatEuros(lisse.recettes)} /s`,
    feuilles: formatNombre(e.feuilles),
    prixRamette: formatTimbre(e.prixRamette),
    auto: e.autoRamette ? "☒" : "☐",
    conso: `${formatNombre(e.flux.feuilles)} f./s`,
    affichage: `niv. ${e.affichage}`,
    "c-affichage": formatEuros(coutAffichage(e.affichage)),
    notoriete: `× ${formatMult(notoriete(e, m))}`,
    pieces: formatNombre(pieces(e, m)),
    "c-cerfa": `${formatNombre(coutCerfa(e.cerfas.length))} notes`,
    grogne: `${Math.round(e.grogne)} %`,
    "c-campagne": formatEuros(coutCampagne(e)),
    "c-region": e.regions.length >= REGIONS.length ? "toutes ouvertes" : formatEuros(coutRegion(e.regions.length)),
    galons: e.galonsLibres > 0 ? `${e.galons} (${e.galonsLibres} à placer)` : String(e.galons),
    reunions: String(e.reunions),
    classeurs: String(e.classeurs),
    notes: `${formatNombre(e.notes)} / ${formatNombre(capNotes(e, m))}`,
    "notes-rythme": `+${formatNombre(notesParSec(e, m))} notes/s · chaque réunion en produit, chaque classeur en range ${formatNombre(1000 * m.cap)}`,
  };
  for (const u of UNITES) {
    val[`n-${u.id}`] = `× ${formatNombre(e.unites[u.id])}`;
    val[`d-${u.id}`] = `${formatNombre(debitUnite(e, m, u))} /s`;
    val[`c-${u.id}`] = formatEuros(coutUnite(u, e.unites[u.id]));
  }
  if (e.espace && e.frontiere >= 0) {
    val.matiere = formatMasse(e.matiere);
    val.guichets = formatNombre(e.guichetsAuto);
    val.replication = `+${formatMult(replication(m) * 100)} % /s`;
    val.traitement = `${formatNombre(traitementGuichet(e, m))} /s`;
    val["debit-espace"] = `${formatNombre(e.flux.traites)} /s`;
  }
  return val;
}

function formatMult(x: number): string {
  if (x >= 1000) return formatNombre(x);
  return x.toFixed(x >= 10 ? 0 : 2).replace(".", ",").replace(/,00$/, "");
}

function largeurs(e: Etat): Record<string, number> {
  const m = mods(e);
  const fr = e.frontiere >= 0 ? FRONTIERES[e.frontiere].masse : 1;
  return {
    notes: e.notes / Math.max(1, capNotes(e, m)),
    grogne: e.grogne / 100,
    frontiere: 1 - e.matiere / fr,
  };
}

function actif(e: Etat, act: string): boolean {
  const [nom, arg] = act.split(":");
  switch (nom) {
    case "tamponner":
      return true;
    case "timbre":
      return arg === "1" || e.timbre > 0.05;
    case "ramette":
      return e.budget >= e.prixRamette;
    case "unite":
      return e.budget >= coutUnite(UNITES.find((u) => u.id === arg)!, e.unites[arg as UniteId]);
    case "affichage":
      return e.budget >= coutAffichage(e.affichage);
    case "galon":
      return e.galonsLibres > 0;
    case "projet": {
      const p = projetsVisibles(e).find((x) => x.id === arg);
      return !!p && projetAbordable(e, p);
    }
    case "cerfa":
      return e.notes >= coutCerfa(e.cerfas.length);
    case "region":
      return e.budget >= coutRegion(e.regions.length);
    case "campagne":
      return !e.greve && e.budget >= coutCampagne(e);
    default:
      return true;
  }
}

function majValeurs(): void {
  const val = valeurs(etat);
  for (const el of valeursEls) {
    const t = val[el.dataset.v!];
    if (t !== undefined && el.textContent !== t) el.textContent = t;
  }
  for (const b of boutonsEls) {
    const ok = actif(etat, b.dataset.act!);
    if (b.disabled === ok) b.disabled = !ok;
  }
  const w = largeurs(etat);
  for (const el of barresEls) {
    const x = Math.max(0, Math.min(1, w[el.dataset.w!] ?? 0));
    el.style.width = `${(x * 100).toFixed(1)}%`;
    if (el.dataset.w === "grogne") el.classList.toggle("rouge", x > 0.7);
  }
  $("dossiers").textContent = formatNombre(etat.dossiers);
  $("anciennete").textContent = formatDuree(etat.t);
}

// La pile de dossiers en attente, dessinée (échelle logarithmique).
let pileAffichee = -1;
function majPile(force = false): void {
  const el = document.getElementById("pile-visuel");
  if (!el) return;
  const n = Math.min(14, Math.ceil(Math.log2(etat.pile + 1)));
  if (n === pileAffichee && !force) return;
  pileAffichee = n;
  el.innerHTML = Array.from({ length: n }, (_, i) => `<i style="--i:${i};--r:${((i * 37) % 7) - 3}deg"></i>`).join("");
}

// ---- journal ----

let journalCle = "";
function majJournal(): void {
  const cle = `${etat.journal.length}|${etat.journal[0]}`;
  if (cle === journalCle) return;
  const neuf = journalCle !== "";
  journalCle = cle;
  $("journal").innerHTML = etat.journal
    .slice(0, 5)
    .map((l, i) => `<li class="${i === 0 && neuf ? "neuf" : ""}">${esc(l)}</li>`)
    .join("");
}

// ---- Guichet et grève ----

let guichetCle = "";
function majGuichet(): void {
  const g = etat.guichet;
  const cle = g ? `${g.id}|${g.fin}` : "";
  const el = $("guichet");
  if (cle !== guichetCle) {
    guichetCle = cle;
    if (!g) {
      el.hidden = true;
      el.innerHTML = "";
    } else {
      const u = USAGER_PAR_ID[g.id];
      el.innerHTML = `
        <div class="guichet-tete">🛎️ Au guichet</div>
        <div class="guichet-qui"><span class="guichet-icone">${u.icone}</span><b>${esc(u.qui)}</b></div>
        <p>${esc(u.demande)}</p>
        <div class="guichet-reponses">
          ${u.reponses.map((r, i) => `<button type="button" class="btn-reponse" data-act="guichet:${i}">${esc(r.texte)}</button>`).join("")}
        </div>
        <div class="guichet-temps"><div id="guichet-barre"></div></div>`;
      el.hidden = false;
    }
  }
  if (g) {
    const reste = Math.max(0, (g.fin - etat.t) / GUICHET_DUREE);
    const barre = document.getElementById("guichet-barre");
    if (barre) barre.style.width = `${reste * 100}%`;
  }
}

let greveCle = "";
function majGreve(): void {
  const cle = etat.greve ? `greve|${etat.greveFin > 0}` : "";
  const el = $("greve");
  if (cle !== greveCle) {
    greveCle = cle;
    if (!etat.greve) {
      el.hidden = true;
      el.innerHTML = "";
    } else {
      el.innerHTML = `
        <div class="greve-panneau">
          <div class="greve-titre">GRÈVE</div>
          <p>Plus aucun dossier ne sort. Les agents ont tendu une banderole « PAPERASSE = DÉTRESSE ».</p>
          ${
            etat.greveFin > 0
              ? `<p class="greve-attente">Vous attendez que ça passe… <span id="greve-reste"></span></p>`
              : `<div class="greve-choix">
              <button type="button" class="btn-reponse" data-act="greve:negocier">Négocier <small id="greve-cout"></small></button>
              <button type="button" class="btn-reponse" data-act="greve:requisitionner">Réquisitionner <small>(grogne à 70 %, et elle remonte plus vite)</small></button>
              <button type="button" class="btn-reponse" data-act="greve:attendre">Attendre <small>(2 min)</small></button>
            </div>`
          }
        </div>`;
      el.hidden = false;
    }
  }
  if (etat.greve) {
    const cout = document.getElementById("greve-cout");
    if (cout) cout.textContent = `(${formatEuros(coutNegociation(etat))})`;
    const reste = document.getElementById("greve-reste");
    if (reste) reste.textContent = formatDuree(Math.max(0, etat.greveFin - etat.t));
    const nego = el.querySelector<HTMLButtonElement>('[data-act="greve:negocier"]');
    if (nego) nego.disabled = etat.budget < coutNegociation(etat);
  }
}

// ---- la fin ----

let finAffichee = false;
function majFin(): void {
  if (!etat.fin || finAffichee) return;
  finAffichee = true;
  const tp = etat.tPhases;
  const noms = ["Stagiaire", "Chef de bureau", "Préfet", "Ministre"];
  const lignes = noms
    .map((n, i) => (tp[i] !== undefined ? `<li>${n} : <b>${formatDuree((tp[i + 1] ?? etat.t) - tp[i])}</b></li>` : ""))
    .join("");
  popup(`
    <div class="fin-tampon">CLASSÉ</div>
    <h2>Dossier classé.</h2>
    <p>Vous avez tamponné votre propre demande de départ à la retraite. L'Univers entier est administré, en trois exemplaires.</p>
    <ul class="popup-liste">
      <li>Durée de la carrière : <b>${formatDuree(etat.t)}</b></li>
      ${lignes}
      <li>Dossiers tamponnés : <b>${formatNombre(etat.dossiers)}</b></li>
      <li>Coups de tampon à la main : <b>${formatNombre(etat.clics)}</b></li>
      <li>Cerfa inventés : <b>${etat.cerfas.length}</b></li>
    </ul>
    <p class="popup-note">Une nouvelle carrière vous attend, avec une médaille du mérite administratif de plus (+25 % de production).</p>
    <button type="button" class="btn-tampon-petit" data-act="nouvelle">Nouvelle carrière</button>
    <button type="button" class="btn-lien" data-act="fermer">Contempler l'Univers classé</button>`);
}

// ---- tampons qui volent ----

function coupDeTampon(x: number, y: number, n: number): void {
  const s = document.createElement("span");
  s.className = "coup";
  s.textContent = n > 1 ? `TRAITÉ ×${formatNombre(n)}` : "TRAITÉ";
  s.style.left = `${x}px`;
  s.style.top = `${y}px`;
  s.style.setProperty("--r", `${Math.round(Math.random() * 30 - 15)}deg`);
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 900);
}

// ---- actions ----

let dernierClic = 0;
function agir(act: string, ev: MouseEvent, bouton: HTMLElement): void {
  const [nom, arg] = act.split(":");
  switch (nom) {
    case "tamponner": {
      const now = performance.now();
      if (now - dernierClic < 45) return; // ~20 coups/s au maximum
      dernierClic = now;
      const n = tamponner(etat);
      if (n > 0) {
        // au clavier, clientX/Y valent 0 : on vise le milieu du tampon
        const r = bouton.getBoundingClientRect();
        const x = ev.clientX || r.left + r.width / 2;
        const y = ev.clientY || r.top + r.height / 2;
        coupDeTampon(x, y, n);
      }
      majPile();
      break;
    }
    case "timbre":
      changerTimbre(etat, arg === "1" ? 1 : -1);
      break;
    case "ramette":
      acheterRamettes(etat, 1);
      break;
    case "auto":
      etat.autoRamette = !etat.autoRamette;
      break;
    case "unite":
      acheterUnite(etat, arg as UniteId);
      break;
    case "affichage":
      acheterAffichage(etat);
      break;
    case "galon":
      placerGalon(etat, arg === "reunion" ? "reunion" : "classeur");
      break;
    case "projet":
      acheterProjet(etat, arg);
      break;
    case "cerfa":
      inventerCerfa(etat);
      break;
    case "region":
      ouvrirRegion(etat, arg);
      break;
    case "campagne":
      lancerCampagne(etat);
      break;
    case "greve":
      decisionGreve(etat, arg as "negocier" | "requisitionner" | "attendre");
      break;
    case "guichet":
      repondreGuichet(etat, Number(arg) as 0 | 1 | 2);
      break;
    case "retraite":
      if (partirALaRetraite(etat)) coupDeTampon(ev.clientX || innerWidth / 2, ev.clientY || innerHeight / 2, 1);
      break;
    case "nouvelle":
      etat = nouvelleCarriere(etat, Date.now());
      finAffichee = false;
      fermerPopup();
      sauver(etat, Date.now());
      break;
    case "fermer":
      fermerPopup();
      break;
  }
  rafraichir();
}

document.addEventListener("click", (ev) => {
  const b = (ev.target as Element).closest<HTMLElement>("[data-act]");
  if (!b || (b as HTMLButtonElement).disabled) return;
  agir(b.dataset.act!, ev, b);
});

// ---- mode discret et titre de l'onglet ----

const TITRE = "Paperasse";
let discret = false;

function construireDiscret(): void {
  const cols = "ABCDEFGHIJKL".split("");
  const libelles = ["Fournitures", "Papier", "Encre", "Tampons", "Affranchissement", "Reprographie", "Mobilier", "Formation", "Déplacements", "Divers"];
  const entetes = ["Poste", "Budget N-1", "Budget N", "Réalisé", "Écart", "Taux"];
  let lignes = `<tr><th></th>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>`;
  let somme = 0;
  for (let r = 1; r <= 40; r++) {
    let cellules: string[] = cols.map(() => "");
    if (r === 1) cellules = entetes;
    else if (r >= 2 && r < 2 + libelles.length) {
      const base = 800 + ((Math.imul(r, 2654435761) >>> 0) % 5200);
      const n = Math.round(base * 1.04);
      const real = Math.round(base * 0.97);
      somme += real;
      cellules = [libelles[r - 2], String(base), String(n), String(real), String(real - n), `${Math.round((real / n) * 100)} %`];
    } else if (r === 2 + libelles.length) cellules = ["TOTAL", "", "", String(somme)];
    lignes += `<tr><th>${r}</th>${cols.map((_, k) => `<td>${cellules[k] ?? ""}</td>`).join("")}</tr>`;
  }
  $("discret").innerHTML = `
    <div class="d-ruban"><span>Fichier</span><span>Accueil</span><span>Insertion</span><span>Mise en page</span><span>Formules</span><span>Données</span><span>Révision</span><span>Affichage</span></div>
    <div class="d-formule"><span>D12</span><span>fx</span><span>=SOMME(D2:D11)</span></div>
    <div class="d-feuille"><table>${lignes}</table></div>
    <div class="d-onglets"><span class="actif">Fournitures 2027</span><span>Détail</span><span>Hypothèses</span></div>`;
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

let titreActuel = "";
function majTitre(): void {
  let t = TITRE;
  if (discret) t = "Budget_fournitures_2027_v3.xlsx";
  else if (etat.greve) t = "⚠ Grève !";
  else if (etat.guichet) t = "🛎️ Un usager au guichet";
  else if (etat.retraite && !etat.fin) t = "📋 Un dernier dossier";
  if (t !== titreActuel) {
    titreActuel = t;
    document.title = t;
  }
}

// ---- boucle ----

function avancer(secondes: number): void {
  if (secondes > 120) {
    // onglet en veille longtemps : rattrapage comme une absence
    bilanAbsence(secondes);
    return;
  }
  while (secondes > 0) {
    const pas = Math.min(1, secondes);
    tick(etat, pas);
    secondes -= pas;
  }
}

// Flux lissés pour l'affichage (les clics arrivent par à-coups).
const lisse = { deposes: 0, recettes: 0 };
let dernierLissage = performance.now();
function lisser(): void {
  const now = performance.now();
  const k = Math.min(1, (now - dernierLissage) / 1500);
  dernierLissage = now;
  lisse.deposes += (etat.flux.deposes - lisse.deposes) * k;
  lisse.recettes += (etat.flux.recettes - lisse.recettes) * k;
}

function rafraichir(): void {
  lisser();
  const cle = cleStructure(etat);
  if (cle !== structure) {
    structure = cle;
    reconstruire();
  }
  majValeurs();
  majPile();
  majJournal();
  majGuichet();
  majGreve();
  majFin();
  majTitre();
}

let dernier = performance.now();
function boucle(): void {
  const now = performance.now();
  avancer((now - dernier) / 1000);
  dernier = now;
  rafraichir();
}

// rAF quand l'onglet est visible ; setInterval prend le relais en arrière-plan
// (le titre de l'onglet annonce alors le Guichet ou la grève).
function frame(): void {
  boucle();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
setInterval(() => {
  if (document.hidden) boucle();
}, 1000);

setInterval(() => sauver(etat, Date.now()), 5000);
window.addEventListener("pagehide", () => sauver(etat, Date.now()));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) sauver(etat, Date.now());
});

rafraichir();
