// Le Tarot — table de jeu en solo contre l'ordinateur. Toute la logique de
// règles vit dans donne.ts / regles.ts, l'IA dans ia.ts : ici on ne fait que
// mettre en scène la donne et attendre les choix du joueur (siège 0, en bas).

import { EXCUSE, SYMBOLES, couleur, estAtout, estBout, libelleCourt, nomCarte, rang, type Carte } from "./cartes.ts";
import {
  annoncer,
  annoncerPoignee,
  annoncesPossibles,
  appeler,
  appelsPossibles,
  chienCache,
  distribuer,
  faireEcart,
  jouer,
  legaux,
  peutAnnoncerPoignee,
  type Donne,
} from "./donne.ts";
import { choisirAnnonce, choisirAppel, choisirCarte, choisirEcart, choisirPoignee, type Niveau } from "./ia.ts";
import { NOMS_CONTRATS, NOMS_POIGNEES, SEUILS_POIGNEE, ecartValide, type Decompte, type PliJoue } from "./regles.ts";

// ─── sauvegarde ──────────────────────────────────────────────────────────────

const CLE = "tarot-petit-prince";

interface Ligne {
  preneur: number;
  contrat: number;
  gagne: boolean;
  scores: number[];
}

interface Sauvegarde {
  n: number;
  niveau: Niveau;
  pseudo: string;
  donneur: number;
  historique: Ligne[];
}

function charger(): Sauvegarde {
  const defaut: Sauvegarde = { n: 4, niveau: "moyen", pseudo: "", donneur: 0, historique: [] };
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) return { ...defaut, ...JSON.parse(brut) };
  } catch {
    /* stockage indisponible : on joue sans mémoire */
  }
  return defaut;
}

function sauver(): void {
  try {
    localStorage.setItem(CLE, JSON.stringify(sv));
  } catch {
    /* tant pis */
  }
}

let sv = charger();

// ─── les habitués du café ────────────────────────────────────────────────────

const HABITUES = [
  { nom: "Gégé", avatar: "🧔" },
  { nom: "Mireille", avatar: "👵" },
  { nom: "Le Comte", avatar: "🎩" },
  { nom: "Josiane", avatar: "💁‍♀️" },
];

const POSITIONS: Record<number, string[]> = {
  4: ["bas", "droite", "haut", "gauche"],
  5: ["bas", "droite", "haut-droite", "haut-gauche", "gauche"],
};

const AIDE_NIVEAUX: Record<Niveau, string> = {
  facile: "Ils jouent au feeling et oublient ce qui est tombé.",
  moyen: "Ils comptent les atouts, chargent leur partenaire et protègent le Petit.",
  difficile: "Ils imaginent des dizaines de donnes possibles avant chaque carte.",
};

const nom = (j: number): string => (j === 0 ? sv.pseudo || "Toi" : HABITUES[j - 1].nom);
const avatar = (j: number): string => (j === 0 ? "🙂" : HABITUES[j - 1].avatar);

// ─── éléments ────────────────────────────────────────────────────────────────

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

const ecranAccueil = $("ecran-accueil");
const ecranTable = $("ecran-table");
const champPseudo = $<HTMLInputElement>("pseudo");
const choixN = $("choix-n");
const choixNiveau = $("choix-niveau");
const aideNiveau = $("aide-niveau");
const btnJouer = $("btn-jouer");
const btnReprendre = $("btn-reprendre");

const infoDonne = $("info-donne");
const btnDernierPli = $<HTMLButtonElement>("btn-dernier-pli");
const btnFeuille = $("btn-feuille");
const btnQuitter = $("btn-quitter");
const elSieges = $("sieges");
const elCentre = $("centre");
const elMessage = $("message");
const elActions = $("actions");
const elMain = $("ma-main");

const voileFin = $("voile-fin");
const ficheFin = $("fiche-fin");
const voileFeuille = $("voile-feuille");
const elFeuille = $("feuille");
const voilePli = $("voile-pli");
const elDernierPli = $("dernier-pli");
const elDernierPliGagnant = $("dernier-pli-gagnant");

// ─── état de la table ────────────────────────────────────────────────────────

let d: Donne | null = null;
/** ce que chaque siège a dit en dernier (annonce, appel, poignée) */
let bulles: string[] = [];
/** pli complet affiché un instant avant d'être ramassé */
let pliAffiche: PliJoue | null = null;
let dernierPli: PliJoue | null = null;
/** le chien est étalé au centre */
let chienAuCentre = false;
/** cartes du chien arrivées dans la main du preneur humain */
let nouvelles = new Set<Carte>();
let selection = new Set<Carte>();
let erreurEcart = "";

type Attente = "annonce" | "appel" | "ecart" | "carte" | "suite" | "fin" | null;
let attente: Attente = null;
let resoudre: ((v: unknown) => void) | null = null;

/** jeton de partie : quitter la table invalide la boucle en cours */
let jeton = 0;
class Abandon extends Error {}

function demander<T>(quoi: Attente): Promise<T> {
  attente = quoi;
  rendre();
  const id = jeton;
  return new Promise<T>((ok) => {
    resoudre = ok as (v: unknown) => void;
  }).then((v) => {
    if (id !== jeton) throw new Abandon();
    return v;
  });
}

function repondre(v: unknown): void {
  const r = resoudre;
  resoudre = null;
  attente = null;
  r?.(v);
}

function pause(ms: number): Promise<void> {
  const id = jeton;
  return new Promise<void>((ok) => setTimeout(ok, ms)).then(() => {
    if (id !== jeton) throw new Abandon();
  });
}

/** laisse le navigateur peindre avant un calcul lourd (IA difficile) */
function calculer<T>(f: () => T): Promise<T> {
  const id = jeton;
  return new Promise<T>((ok) => setTimeout(() => ok(f()), 30)).then((v) => {
    if (id !== jeton) throw new Abandon();
    return v;
  });
}

const DELAI = 650;

function message(t: string): void {
  elMessage.textContent = t;
}

// ─── rendu des cartes ────────────────────────────────────────────────────────

const CLASSES_COULEURS = ["pique", "coeur", "carreau", "trefle"];

// Les atouts racontent une journée : le Petit se lève à l'aube, le soleil
// passe au zénith vers le 10, se couche au 18, et le 21 est en pleine nuit.
// [rang, haut du ciel, bas du ciel, collines]
const CIELS: [number, string, string, string][] = [
  [1, "#2b3a78", "#f2a06a", "#3b2f4a"],
  [5, "#4f7fc4", "#f7d08a", "#3d5a3a"],
  [9, "#3f8ee0", "#b9e2f8", "#3f6b3c"],
  [13, "#3a84d0", "#cfe6f0", "#40683a"],
  [16, "#5a6db8", "#f4c98a", "#3e5536"],
  [18, "#5b3f8f", "#ef7f5a", "#33283f"],
  [19, "#252a66", "#8a4d78", "#1d1a33"],
  [21, "#0b1030", "#1f2c66", "#0a0d22"],
];

function melangeHex(a: string, b: string, t: number): string {
  const ca = parseInt(a.slice(1), 16);
  const cb = parseInt(b.slice(1), 16);
  let r = "#";
  for (const dec of [16, 8, 0]) {
    const v = Math.round(((ca >> dec) & 255) * (1 - t) + ((cb >> dec) & 255) * t);
    r += v.toString(16).padStart(2, "0");
  }
  return r;
}

function vignetteAtout(r: number): string {
  const i = Math.max(1, CIELS.findIndex(([k]) => k >= r));
  const [ka, ha, ba, ca] = CIELS[i - 1];
  const [kb, hb, bb, cb] = CIELS[i];
  const t = Math.min(1, Math.max(0, (r - ka) / (kb - ka)));
  const nuit = r >= 19;
  // le soleil fait son arc du 1 au 18, puis la lune monte
  const p = (r - 1) / 17;
  const ax = nuit ? 22 + (r - 19) * 26 : 12 + 76 * p;
  const ay = nuit ? 34 - (r - 19) * 10 : 72 - 56 * Math.sin(Math.PI * p);
  const style =
    `--ciel-haut:${melangeHex(ha, hb, t)};--ciel-bas:${melangeHex(ba, bb, t)};` +
    `--colline:${melangeHex(ca, cb, t)};--ax:${ax.toFixed(1)}%;--ay:${ay.toFixed(1)}%`;
  return (
    `<span class="vignette${nuit ? " nuit" : ""}" style="${style}">` +
    `<span class="astre${nuit ? " lune" : ""}"></span><b>${r}</b></span>`
  );
}

function carteEl(c: Carte): HTMLElement {
  const el = document.createElement("div");
  el.dataset.carte = String(c);
  const lib = libelleCourt(c);
  if (c === EXCUSE) {
    el.className = "carte excuse";
    el.innerHTML = `<span class="coin">★</span><span class="milieu"><b>★</b><small>Excuse</small></span>`;
  } else if (estAtout(c)) {
    el.className = `carte atout${estBout(c) ? " bout" : ""}`;
    el.innerHTML = `<span class="coin">${lib}</span>${vignetteAtout(rang(c))}<span class="coin coin-bas">${lib}</span>`;
  } else {
    const coul = couleur(c);
    const sym = SYMBOLES[coul];
    const tete = /[VCDR]/.test(lib);
    el.className = `carte ${CLASSES_COULEURS[coul]}${tete ? " tete" : ""}`;
    el.innerHTML =
      `<span class="coin">${lib}<i>${sym}</i></span>` +
      `<span class="milieu">${tete ? `<b>${lib}</b>` : ""}<i>${sym}</i></span>` +
      `<span class="coin coin-bas">${lib}<i>${sym}</i></span>`;
  }
  el.title = nomCarte(c);
  return el;
}

function rangeeCartes(cartes: Carte[]): HTMLElement {
  const r = document.createElement("div");
  r.className = "rangee-cartes";
  for (const c of cartes) r.append(carteEl(c));
  return r;
}

// ─── rendu de la table ───────────────────────────────────────────────────────

function rendre(): void {
  if (!d) return;
  rendreBandeau();
  rendreSieges();
  rendreCentre();
  rendreActions();
  rendreMain();
}

function rendreBandeau(): void {
  if (!d) return;
  const numero = sv.historique.length + (d.phase === "fin" ? 0 : 1);
  let t = `Donne ${numero} · ${nom(d.donneur)} distribue`;
  if (d.preneur >= 0) {
    t = `Donne ${numero} · ${nom(d.preneur)} — ${NOMS_CONTRATS[d.contrat]}`;
    if (d.carteAppelee >= 0) t += ` · appelle ${libelleCourt(d.carteAppelee)}${SYMBOLES[couleur(d.carteAppelee)]}`;
  }
  infoDonne.textContent = t;
  btnDernierPli.disabled = !dernierPli;
}

function rendreSieges(): void {
  if (!d) return;
  const pos = POSITIONS[d.n];
  elSieges.innerHTML = "";
  for (let j = 0; j < d.n; j++) {
    const s = document.createElement("div");
    s.className = `siege pos-${pos[j]}`;
    if (d.phase !== "fin" && d.tour === j && d.phase !== "ecart") s.classList.add("a-son-tour");
    if (j === d.preneur) s.classList.add("preneur");
    const partenaireVisible = d.partenaire === j && (d.partenaireRevele || j === 0);
    if (partenaireVisible) s.classList.add("partenaire");

    const badges: string[] = [];
    if (j === d.donneur) badges.push(`<span class="badge donneur" title="donneur">D</span>`);
    if (j === d.preneur) badges.push(`<span class="badge">preneur</span>`);
    if (partenaireVisible) badges.push(`<span class="badge">partenaire</span>`);

    const nbCartes = d.mains[j].length;
    s.innerHTML =
      `<div class="avatar">${avatar(j)}</div>` +
      `<div class="nom">${echapper(nom(j))}</div>` +
      (j === 0 ? "" : `<div class="dos" title="${nbCartes} cartes"><span>${nbCartes}</span></div>`) +
      `<div class="badges">${badges.join("")}</div>` +
      (bulles[j] ? `<div class="bulle">${echapper(bulles[j])}</div>` : "");
    elSieges.append(s);
  }
}

function rendreCentre(): void {
  if (!d) return;
  elCentre.innerHTML = "";
  if (chienAuCentre) {
    const bloc = document.createElement("div");
    bloc.className = "chien";
    bloc.innerHTML = `<p class="etiquette">Le chien</p>`;
    bloc.append(rangeeCartes(d.chien));
    elCentre.append(bloc);
    return;
  }
  const pli = pliAffiche ?? d.pli;
  const pos = POSITIONS[d.n];
  pli.cartes.forEach((c, i) => {
    const el = carteEl(c);
    el.classList.add("au-pli", `pli-${pos[pli.joueurs[i]]}`);
    if (pliAffiche && pliAffiche.joueurs[i] === pliAffiche.gagnant) el.classList.add("gagnante");
    elCentre.append(el);
  });
}

function bouton(texte: string, action: () => void, classe = "btn-action"): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = classe;
  b.innerHTML = texte;
  b.addEventListener("click", action);
  return b;
}

function rendreActions(): void {
  if (!d) return;
  elActions.innerHTML = "";
  const partie = d;

  if (attente === "annonce") {
    const possibles = annoncesPossibles(partie);
    for (let c = 0; c <= 4; c++) {
      const b = bouton(NOMS_CONTRATS[c], () => repondre(c), c === 0 ? "btn-action passe" : "btn-action");
      b.disabled = !possibles.includes(c);
      elActions.append(b);
    }
  } else if (attente === "appel") {
    const lab = document.createElement("span");
    lab.className = "consigne";
    lab.textContent = "Quelle carte appelles-tu ?";
    elActions.append(lab);
    for (const c of appelsPossibles(partie.mains[0])) {
      const b = bouton(`${libelleCourt(c)}<span class="sym ${CLASSES_COULEURS[couleur(c)]}">${SYMBOLES[couleur(c)]}</span>`, () => repondre(c));
      b.title = nomCarte(c);
      elActions.append(b);
    }
  } else if (attente === "ecart") {
    const taille = partie.chien.length;
    const lab = document.createElement("span");
    lab.className = "consigne";
    lab.textContent = erreurEcart || `Choisis ${taille} cartes à écarter (${selection.size}/${taille})`;
    if (erreurEcart) lab.classList.add("erreur");
    elActions.append(lab);
    const b = bouton("Valider l'écart", () => {
      const err = ecartValide(partie.mains[0], [...selection], taille);
      if (err) {
        erreurEcart = err;
        rendre();
        return;
      }
      faireEcart(partie, [...selection]);
      selection = new Set();
      nouvelles = new Set();
      repondre(null);
    });
    b.disabled = selection.size !== taille;
    elActions.append(b);
  } else if (attente === "carte") {
    const max = peutAnnoncerPoignee(partie, 0);
    if (max > 0) {
      const lab = document.createElement("span");
      lab.className = "consigne";
      lab.textContent = "Tu as une poignée !";
      elActions.append(lab);
      for (let t = 1; t <= max; t++) {
        elActions.append(
          bouton(`Annoncer ${NOMS_POIGNEES[t]} (${SEUILS_POIGNEE[partie.n][t - 1]})`, () => {
            const p = annoncerPoignee(partie, 0, t);
            bulles[0] = `Poignée ${NOMS_POIGNEES[t]}`;
            message(`Tu montres ${p.atouts.map(libelleCourt).join(", ")}.`);
            rendre();
          }),
        );
      }
    } else {
      const lab = document.createElement("span");
      lab.className = "consigne discrete";
      lab.textContent = "À toi de jouer";
      elActions.append(lab);
    }
  } else if (attente === "suite") {
    elActions.append(bouton("Continuer", () => repondre(null)));
  }
}

function rendreMain(): void {
  if (!d) return;
  const main = d.mains[0];
  const jouables = attente === "carte" ? new Set(legaux(d, 0)) : null;
  elMain.innerHTML = "";
  for (const c of main) {
    const el = carteEl(c);
    if (jouables && !jouables.has(c)) el.classList.add("interdite");
    if (jouables && jouables.has(c)) el.classList.add("jouable");
    if (attente === "ecart") el.classList.add("selectionnable");
    if (selection.has(c)) el.classList.add("choisie");
    if (nouvelles.has(c)) el.classList.add("nouvelle");
    el.addEventListener("click", () => clicCarte(c));
    elMain.append(el);
  }
  ajusterChevauchement();
}

/** resserre les cartes de la main pour qu'elles tiennent sur une ligne */
function ajusterChevauchement(): void {
  const cartes = [...elMain.children] as HTMLElement[];
  if (cartes.length < 2) return;
  const largeurCarte = cartes[0].getBoundingClientRect().width;
  const dispo = elMain.clientWidth - 16;
  const marge = Math.min(4, (dispo - cartes.length * largeurCarte) / (cartes.length - 1));
  cartes.forEach((el, i) => (el.style.marginLeft = i === 0 ? "0" : `${marge}px`));
}

function clicCarte(c: Carte): void {
  if (!d) return;
  if (attente === "carte") {
    if (legaux(d, 0).includes(c)) repondre(c);
  } else if (attente === "ecart") {
    if (selection.has(c)) selection.delete(c);
    else if (selection.size < d.chien.length) selection.add(c);
    erreurEcart = "";
    rendre();
  }
}

function echapper(t: string): string {
  return t.replace(/[&<>"]/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[x]!);
}

// ─── déroulé d'une donne ─────────────────────────────────────────────────────

async function jouerDonne(): Promise<void> {
  const n = sv.n;
  const partie = distribuer(n, sv.donneur);
  d = partie;
  bulles = new Array(n).fill("");
  pliAffiche = null;
  dernierPli = null;
  chienAuCentre = false;
  selection = new Set();
  nouvelles = new Set();
  message(`${nom(partie.donneur)} distribue.`);
  rendre();
  await pause(500);

  // enchères
  while (partie.phase === "encheres") {
    const j = partie.tour;
    message(j === 0 ? "À toi de parler." : `${nom(j)} réfléchit…`);
    rendre();
    let c: number;
    if (j === 0) c = await demander<number>("annonce");
    else {
      await pause(DELAI);
      c = choisirAnnonce(partie, j, sv.niveau);
    }
    const r = annoncer(partie, j, c);
    bulles[j] = NOMS_CONTRATS[c];
    rendre();
    if (r === "redonne") {
      message("Tout le monde passe : on redistribue.");
      await pause(1600);
      sv.donneur = (sv.donneur + 1) % n;
      sauver();
      return jouerDonne();
    }
  }
  await pause(400);
  bulles = bulles.map((_, j) => (j === partie.preneur ? NOMS_CONTRATS[partie.contrat] : ""));
  message(partie.preneur === 0 ? `Tu prends : ${NOMS_CONTRATS[partie.contrat]}.` : `${nom(partie.preneur)} prend : ${NOMS_CONTRATS[partie.contrat]}.`);
  rendre();
  await pause(900);

  // appel du roi (à 5)
  if (partie.phase === "appel") {
    let carte: Carte;
    if (partie.preneur === 0) carte = await demander<Carte>("appel");
    else {
      await pause(DELAI);
      carte = choisirAppel(partie);
    }
    appeler(partie, carte);
    bulles[partie.preneur] = `J'appelle ${nomCarte(carte)}`;
    message(
      partie.preneur === 0
        ? `Tu appelles ${nomCarte(carte)}.`
        : partie.partenaire === 0
          ? `${nom(partie.preneur)} appelle ${nomCarte(carte)}… c'est toi qui l'as ! Chut.`
          : `${nom(partie.preneur)} appelle ${nomCarte(carte)}.`,
    );
    rendre();
    await pause(1400);
  }

  // chien et écart
  if (partie.chienMontre) {
    chienAuCentre = true;
    message(partie.preneur === 0 ? "Voici le chien." : `Voici le chien de ${nom(partie.preneur)}.`);
    rendre();
    await demander("suite");
    chienAuCentre = false;
    if (partie.preneur === 0) {
      nouvelles = new Set(partie.chien);
      message("Fais ton écart : ni roi, ni bout.");
      await demander("ecart");
      message("Écart fait.");
    } else {
      await pause(DELAI);
      faireEcart(partie, choisirEcart(partie));
      const montres = partie.ecartMontre;
      message(
        montres.length > 0
          ? `${nom(partie.preneur)} fait son écart et doit montrer ${montres.map(nomCarte).join(", ")}.`
          : `${nom(partie.preneur)} fait son écart.`,
      );
    }
  } else if (chienCache(partie)) {
    message(partie.contrat === 3 ? "Garde sans : le chien reste caché, il comptera pour le preneur." : "Garde contre : le chien part en défense, sans être vu.");
  }
  rendre();
  await pause(900);

  // jeu de la carte
  while (partie.phase === "jeu") {
    const j = partie.tour;
    let carte: Carte;
    if (j === 0) {
      if (partie.pli.cartes.length === 0) message("À toi d'entamer.");
      else message("À toi.");
      carte = await demander<Carte>("carte");
    } else {
      message("");
      await pause(DELAI);
      if (peutAnnoncerPoignee(partie, j)) {
        const t = choisirPoignee(partie, j, sv.niveau);
        if (t > 0) {
          const p = annoncerPoignee(partie, j, t);
          bulles[j] = `Poignée ${NOMS_POIGNEES[t]} !`;
          message(`${nom(j)} montre ${p.atouts.map(libelleCourt).join(", ")}.`);
          rendre();
          await pause(2000);
        }
      }
      carte = await calculer(() => choisirCarte(partie, j, sv.niveau));
    }
    const revele = carte === partie.carteAppelee && !partie.partenaireRevele;
    const fini = jouer(partie, j, carte);
    if (partie.plis.length === 0 && partie.pli.cartes.length === 1) bulles = bulles.map((b) => (b.startsWith("Poignée") ? b : ""));
    if (revele) {
      message(
        partie.partenaire < 0
          ? `${nom(partie.preneur)} avait ${nomCarte(carte)} : le preneur joue seul !`
          : partie.partenaire === 0
            ? `Te voilà démasqué : tu es le partenaire de ${nom(partie.preneur)} !`
            : `${nom(partie.partenaire)} est le partenaire de ${nom(partie.preneur)} !`,
      );
    }
    if (fini) {
      pliAffiche = fini;
      rendre();
      await pause(1200);
      pliAffiche = null;
      dernierPli = fini;
      if (partie.plis.length === 1) bulles = bulles.map(() => "");
    }
    rendre();
  }

  // décompte
  const dc = partie.decompte!;
  sv.historique.push({ preneur: partie.preneur, contrat: partie.contrat, gagne: dc.gagne, scores: dc.scores });
  sv.donneur = (sv.donneur + 1) % n;
  sauver();
  afficherFin(partie, dc);
  await demander("fin");
  voileFin.classList.add("hidden");
  return jouerDonne();
}

// ─── fin de donne ────────────────────────────────────────────────────────────

function signe(x: number): string {
  return x > 0 ? `+${x}` : String(x);
}

function afficherFin(partie: Donne, dc: Decompte): void {
  const preneur = nom(partie.preneur);
  const contrat = NOMS_CONTRATS[partie.contrat];
  const humainAttaque = partie.preneur === 0 || partie.partenaire === 0;
  const humainGagne = humainAttaque === dc.gagne;
  const pts = dc.demiPointsAttaque / 2;

  const titre =
    partie.preneur === 0
      ? dc.gagne
        ? `Tu passes ta ${contrat} de ${dc.ecartPoints}`
        : `Tu chutes de ${dc.ecartPoints}`
      : dc.gagne
        ? `${preneur} passe sa ${contrat} de ${dc.ecartPoints}`
        : `${preneur} chute de ${dc.ecartPoints}`;

  const lignes: string[] = [];
  lignes.push(`<li>Points réalisés : <b>${String(pts).replace(".", ",")}</b> pour ${dc.cible} demandés (${dc.bouts} bout${dc.bouts > 1 ? "s" : ""})</li>`);
  if (partie.n === 5)
    lignes.push(
      `<li>${partie.partenaire >= 0 ? `Partenaire : ${nom(partie.partenaire)}` : "Le preneur jouait seul"} (${nomCarte(partie.carteAppelee)} appelé)</li>`,
    );
  if (dc.petitAuBout) lignes.push(`<li>Petit au bout pour ${dc.petitAuBout > 0 ? "l'attaque" : "la défense"}</li>`);
  for (const p of partie.poignees) lignes.push(`<li>Poignée ${NOMS_POIGNEES[p.taille]} de ${nom(p.joueur)} : ${[0, 20, 30, 40][p.taille]} pour le camp gagnant</li>`);
  if (dc.chelem) lignes.push(`<li>Chelem ${dc.chelem > 0 ? "de l'attaque" : "de la défense"} !</li>`);

  const scores = partie.mains
    .map((_, j) => `<div class="score-joueur${j === 0 ? " moi" : ""}"><span>${avatar(j)} ${echapper(nom(j))}</span><b class="${dc.scores[j] >= 0 ? "pos" : "neg"}">${signe(dc.scores[j])}</b></div>`)
    .join("");

  const vu = partie.contrat <= 2 ? "L'écart" : partie.contrat === 3 ? "Le chien (pour le preneur)" : "Le chien (pour la défense)";

  ficheFin.innerHTML =
    `<p class="verdict ${humainGagne ? "bon" : "mauvais"}">${humainGagne ? "Bien joué !" : "Aïe."}</p>` +
    `<h2>${echapper(titre)}</h2>` +
    `<ul class="detail">${lignes.join("")}</ul>` +
    `<div class="scores">${scores}</div>` +
    `<p class="etiquette">${vu}</p>`;
  ficheFin.append(rangeeCartes(partie.ecart));
  const actions = document.createElement("div");
  actions.className = "fiche-actions";
  actions.append(bouton("Feuille de marque", ouvrirFeuille, "btn-discret"), bouton("Donne suivante", () => repondre(null), "btn-principal"));
  ficheFin.append(actions);
  voileFin.classList.remove("hidden");
}

// ─── feuille de marque ───────────────────────────────────────────────────────

const LETTRES_CONTRATS = ["", "P", "G", "GS", "GC"];

function ouvrirFeuille(): void {
  const n = sv.n;
  const totaux = new Array(n).fill(0);
  const tete = Array.from({ length: n }, (_, j) => `<th>${avatar(j)}<br>${echapper(nom(j))}</th>`).join("");
  const corps = sv.historique
    .map((l, i) => {
      l.scores.forEach((s, j) => (totaux[j] += s));
      const cells = totaux.map((t) => `<td class="${t >= 0 ? "pos" : "neg"}">${t}</td>`).join("");
      return `<tr><td class="contrat-cell">${i + 1}. ${echapper(nom(l.preneur))} ${LETTRES_CONTRATS[l.contrat]} ${l.gagne ? "✔" : "✘"}</td>${cells}</tr>`;
    })
    .join("");
  elFeuille.innerHTML =
    sv.historique.length === 0
      ? `<p class="aide">Aucune donne jouée pour l'instant.</p>`
      : `<table><thead><tr><th></th>${tete}</tr></thead><tbody>${corps}</tbody></table>`;
  voileFeuille.classList.remove("hidden");
}

// ─── accueil ─────────────────────────────────────────────────────────────────

function rendreAccueil(): void {
  champPseudo.value = sv.pseudo;
  for (const b of choixN.querySelectorAll<HTMLButtonElement>("button")) b.classList.toggle("actif", Number(b.dataset.n) === sv.n);
  for (const b of choixNiveau.querySelectorAll<HTMLButtonElement>("button")) b.classList.toggle("actif", b.dataset.niveau === sv.niveau);
  aideNiveau.textContent = AIDE_NIVEAUX[sv.niveau];
  btnReprendre.classList.toggle("hidden", sv.historique.length === 0);
}

let nChoisi = sv.n;

choixN.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest("button");
  if (!b) return;
  nChoisi = Number(b.dataset.n);
  for (const x of choixN.querySelectorAll("button")) x.classList.toggle("actif", x === b);
});

choixNiveau.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest("button");
  if (!b) return;
  sv.niveau = b.dataset.niveau as Niveau;
  for (const x of choixNiveau.querySelectorAll("button")) x.classList.toggle("actif", x === b);
  aideNiveau.textContent = AIDE_NIVEAUX[sv.niveau];
});

function sAsseoir(nouvelle: boolean): void {
  sv.pseudo = champPseudo.value.trim().slice(0, 16);
  if (nouvelle || nChoisi !== sv.n) {
    sv.n = nChoisi;
    sv.historique = [];
    sv.donneur = Math.floor(Math.random() * sv.n);
  }
  sauver();
  ecranAccueil.classList.add("hidden");
  ecranTable.classList.remove("hidden");
  ecranTable.classList.toggle("a-cinq", sv.n === 5);
  jeton++;
  jouerDonne().catch((e) => {
    if (!(e instanceof Abandon)) throw e;
  });
}

btnJouer.addEventListener("click", () => sAsseoir(true));
btnReprendre.addEventListener("click", () => sAsseoir(false));

btnQuitter.addEventListener("click", () => {
  jeton++;
  repondre(null);
  d = null;
  voileFin.classList.add("hidden");
  ecranTable.classList.add("hidden");
  ecranAccueil.classList.remove("hidden");
  rendreAccueil();
});

btnFeuille.addEventListener("click", ouvrirFeuille);
$("btn-fermer-feuille").addEventListener("click", () => voileFeuille.classList.add("hidden"));
$("btn-nouvelle-partie").addEventListener("click", () => {
  if (!confirm("Remettre tous les scores à zéro ?")) return;
  sv.historique = [];
  sauver();
  ouvrirFeuille();
});

btnDernierPli.addEventListener("click", () => {
  if (!dernierPli || !d) return;
  elDernierPli.innerHTML = "";
  dernierPli.cartes.forEach((c, i) => {
    const bloc = document.createElement("div");
    bloc.className = "carte-signee";
    bloc.append(carteEl(c));
    const s = document.createElement("span");
    s.textContent = nom(dernierPli!.joueurs[i]);
    bloc.append(s);
    elDernierPli.append(bloc);
  });
  elDernierPliGagnant.textContent = `Remporté par ${nom(dernierPli.gagnant)}.`;
  voilePli.classList.remove("hidden");
});
$("btn-fermer-pli").addEventListener("click", () => voilePli.classList.add("hidden"));

window.addEventListener("resize", ajusterChevauchement);

rendreAccueil();
