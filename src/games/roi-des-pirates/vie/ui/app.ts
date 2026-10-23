// L'application « Vivre Card » : la Taverne, la naissance, la vie qui défile,
// la fin, le Livre des Mers et le Mémorial.

import { Vie, campTexte, zoneTexte, AGES_PAUSES } from "../moteur.ts";
import type { Ligne } from "../etat.ts";
import type { Jauge } from "../types.ts";
import { JAUGES } from "../types.ts";
import { CONTENU } from "../contenu/index.ts";
import { hacher } from "../rng.ts";
import { ZONES, PEUPLES, CLASSES, CAMPS, ILES, GRADES, MONDES, grade as gradeParId } from "../monde.ts";
import { TRAITS, trait as traitParId } from "../naissance.ts";
import { formaterPrime, nomDeLaVie, METIERS_NOMS, deLieu } from "../texte.ts";
import { REVES, FOCUS } from "../libelles.ts";
import { CLINS_ACTIONS, RYTHMES } from "../actions.ts";
import { ageEchelle } from "../conditions.ts";
import type { ResumeVie } from "../fin.ts";
import { h, vider, attendre } from "./dom.ts";
import { Scene } from "./scene.ts";
import { dessinerPortrait, canvasNet, traitsDe, type TraitsPortrait } from "./portrait.ts";
import { avisDeRecherche, vivreCard } from "./avis.ts";
import { faireLeBilan, type Bilan } from "./bilan.ts";
import {
  chargerMeta, sauverMeta, chargerPartie, sauverPartie, effacerPartie, VERSION_CONTENU,
  type Meta, type Partie, type Action, type SectionCodex,
} from "./sauvegarde.ts";

const racine = document.getElementById("vc-app")!;
let meta: Meta = chargerMeta();
let scene: Scene | null = null;
let minuteur: number | undefined;

const VITESSES = [1, 2, 4, 8, 12, 16];
const DUREES = [30, 60, 90];
/** Une vie « dure » ce nombre d'années, pour régler le pas d'une année sur la durée choisie. */
const ANNEES_REPERE = 80;

function ecran(classe: string): HTMLElement {
  if (minuteur !== undefined) clearTimeout(minuteur);
  minuteur = undefined;
  scene?.arreter();
  scene = null;
  vider(racine);
  racine.className = `vc ${classe}`;
  window.scrollTo({ top: 0 });
  return racine;
}

function aujourdhui(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function portraitCanvas(t: TraitsPortrait, taille: number): HTMLCanvasElement {
  const { canvas, ctx } = canvasNet(taille, taille);
  ctx.fillStyle = "#d9c79a";
  ctx.fillRect(0, 0, taille, taille);
  dessinerPortrait(ctx, 0, 0, taille, t);
  canvas.className = "vc-portrait";
  return canvas;
}

function traitsResume(r: ResumeVie): TraitsPortrait {
  const g = r.grade ? gradeParId(r.grade) : undefined;
  return {
    graine: r.graine, sexe: r.sexe, peuple: r.peuple,
    age: Math.floor(r.ageMort / PEUPLES[r.peuple].longevite),
    camp: r.camp, rang: g && g.camp === r.camp ? g.rang : 0, zone: r.zoneNatale, classe: r.classe,
    blessures: r.blessures.length, rieur: r.traits.includes("rieur") || r.traits.includes("rire-contagieux"),
  };
}

// ════════════════════════ La Taverne ════════════════════════

export function accueil(): void {
  const el = ecran("vc-accueil");
  const partie = chargerPartie();
  const n = meta.nbVies;
  const derniere = meta.vies[meta.vies.length - 1];

  el.appendChild(h("header", { class: "vc-haut" },
    h("a", { class: "vc-retour", text: "← le petit prince", attrs: { href: "../../" } }),
  ));

  const enseigne = h("div", { class: "vc-enseigne" },
    h("p", { class: "vc-sur-titre", text: "Le Roi des Pirates" }),
    h("h1", { text: "Vivre Card" }),
    h("p", { class: "vc-accroche", text: "Personne n'a choisi où naître. Une vie au hasard dans le monde de One Piece, vécue jusqu'au bout." }),
  );
  el.appendChild(enseigne);

  if (n > 0) {
    const replique = meta.derniereReplique ?? "Encore toi.";
    el.appendChild(h("section", { class: "vc-tenanciere" },
      h("div", { class: "vc-verre", text: "🍶" }),
      h("blockquote", null, h("p", { text: `« ${replique} »` }), h("cite", { text: "— la Tenancière" })),
    ));
  } else {
    el.appendChild(h("section", { class: "vc-tenanciere" },
      h("div", { class: "vc-verre", text: "🍶" }),
      h("blockquote", null,
        h("p", { text: "« Entre, entre. Ici, on sert les vies qui finissent et celles qui commencent. La tienne n'a pas encore commencé. Tu ne sais pas où tu vas naître, ni qui tu seras. Personne ne le sait. C'est ça qui est beau. »" }),
        h("cite", { text: "— la Tenancière" })),
    ));
  }

  if (meta.volonte) {
    const vo = meta.volonte;
    el.appendChild(h("section", { class: "vc-volonte-attente" },
      h("h3", { text: "Une Volonté vous attend" }),
      h("p", { text: vo.libelle }),
      h("p", { class: "vc-petit", text: vo.chronique.length > 1 ? `Portée par : ${vo.chronique.join(", ")}.` : `Transmise par ${vo.de}.` }),
    ));
  }

  const actions = h("div", { class: "vc-actions" });
  if (partie) {
    actions.appendChild(h("button", { class: "vc-bouton vc-principal", text: "Reprendre la vie en cours", onclick: () => reprendre(partie) }));
  }
  actions.appendChild(h("button", {
    class: `vc-bouton ${partie ? "" : "vc-principal"}`,
    text: n === 0 ? "Naître" : "Renaître",
    onclick: () => {
      if (partie && !confirm("Une vie est en cours. L'abandonner pour en commencer une autre ?")) return;
      nouvelleVie(hacher(`${Date.now()}:${Math.random()}`));
    },
  }));
  const jour = aujourdhui();
  const dejaJour = meta.vies.some((v) => v.date.startsWith(jour) && v.graine === hacher(`jour:${jour}`));
  actions.appendChild(h("button", {
    class: "vc-bouton",
    text: dejaJour ? "Revivre la vie du jour" : "La vie du jour",
    title: "Tout le monde naît pareil aujourd'hui. Qu'en ferez-vous ?",
    onclick: () => {
      if (partie && !confirm("Une vie est en cours. L'abandonner ?")) return;
      nouvelleVie(hacher(`jour:${jour}`), jour);
    },
  }));
  el.appendChild(actions);

  el.appendChild(h("nav", { class: "vc-liens" },
    h("button", { class: "vc-lien", text: `📖 Le Livre des Mers — ${progressionCodex()} %`, onclick: () => codex() }),
    h("button", { class: "vc-lien", text: `🕯 Le Mémorial — ${n} vie${n > 1 ? "s" : ""}`, onclick: () => memorial() }),
  ));

  if (derniere) {
    el.appendChild(h("p", { class: "vc-derniere", text: `Dernière vie : ${derniere.nom}, ${derniere.titre.toLowerCase()} — ${derniere.ageMort} ans.` }));
  }

  const opts = meta.options;
  el.appendChild(h("section", { class: "vc-options" },
    h("label", null, (() => {
      const c = h("input", { attrs: { type: "checkbox" } });
      c.checked = opts.pauses;
      c.addEventListener("change", () => { opts.pauses = c.checked; sauverMeta(meta); });
      return c;
    })(), " Pauses réflexives (5, 15, 30, 50, 70 ans)"),
    h("label", null, "Durée d'une vie ", (() => {
      const choix = h("select", { class: "vc-duree" },
        ...DUREES.map((m) => h("option", { text: m < 60 ? `environ ${m} min` : `environ ${m / 60} h`.replace("1.5 h", "1 h 30"), attrs: { value: String(m) } })));
      choix.value = String(opts.duree);
      choix.addEventListener("change", () => { opts.duree = Number(choix.value); sauverMeta(meta); });
      return choix;
    })()),
  ));
}

// ════════════════════════ Naissance ════════════════════════

function nouvelleVie(graine: number, jour?: string): void {
  const partie: Partie = {
    version: VERSION_CONTENU,
    graine,
    volonte: jour ? undefined : meta.volonte,
    metaFlags: [...meta.flags],
    metaVies: meta.nbVies,
    jour,
    actions: [],
    journal: 0,
  };
  if (!jour) meta.volonte = undefined;
  sauverMeta(meta);
  const vie = creerVie(partie);
  sauverPartie(partie);
  naissance(vie, partie);
}

function creerVie(p: Partie): Vie {
  return new Vie({
    graine: p.graine,
    contenu: CONTENU,
    meta: { flags: new Set(p.metaFlags), vies: p.metaVies },
    volonte: p.volonte,
    monde: p.monde,
  });
}

function rejouer(p: Partie): Vie | null {
  try {
    const vie = creerVie(p);
    for (const a of p.actions) appliquerAction(vie, a);
    if (vie.etat.journal.length !== p.journal) return null;
    return vie;
  } catch {
    return null;
  }
}

function appliquerAction(vie: Vie, a: Action): Ligne[] {
  switch (a[0]) {
    case "a": return vie.avancer();
    case "c": return vie.choisir(a[1]);
    case "n": return vie.choisir(-1, a[1]);
    case "f": vie.etat.focus = a[1]; return [];
    case "x": return vie.agir(a[1]);
    case "h": vie.regler(a[1], a[2]); return [];
  }
}

function reprendre(p: Partie): void {
  const vie = rejouer(p);
  if (!vie) {
    alert("Cette vie ne peut pas reprendre : le monde a changé depuis (mise à jour du jeu). Elle s'efface.");
    effacerPartie();
    accueil();
    return;
  }
  if (!vie.etat.vivant) {
    fin(vie, p);
    return;
  }
  jouer(vie, p);
}

function naissance(vie: Vie, partie: Partie): void {
  const el = ecran("vc-naissance");
  const v = vie.etat;
  const acte = h("section", { class: "vc-acte" });
  el.appendChild(acte);
  acte.appendChild(h("p", { class: "vc-sur-titre", text: partie.jour ? `La vie du jour — ${partie.jour}` : "Acte de naissance" }));

  const lignes: [string, string][] = [
    ["Année", `${v.anneeNaissance} du calendrier Kaien`],
    ["Lieu", `${v.nomIle} — ${ZONES[v.zone].nom}`],
    ["Peuple", PEUPLES[v.peuple][v.sexe === "h" ? "m" : "f"]],
    ["Né{/e} dans", CLASSES[v.classe].nom],
    ["Parents", parentsTexte(vie)],
    ["Traits", v.traits.map((t) => (traitParId(t)?.rarete === "legendaire" && t === "graine-du-roi" ? "???" : traitParId(t)?.nom ?? t)).join(", ")],
  ];
  const grille = h("dl", { class: "vc-acte-lignes" });
  acte.appendChild(grille);

  const nom = h("h2", { class: "vc-acte-nom", text: "" });
  const portrait = portraitCanvas(traitsDe(v), 132);
  acte.insertBefore(h("div", { class: "vc-acte-tete" }, portrait, nom), grille);

  const jumeaux = h("section", { class: "vc-jumeaux-naissance" });
  el.appendChild(jumeaux);
  const bouton = h("button", { class: "vc-bouton vc-principal vc-cache", text: "Vivre", onclick: () => jouer(vie, partie) });
  el.appendChild(h("div", { class: "vc-actions" }, bouton));

  void (async () => {
    await attendre(300);
    nom.textContent = v.d && !v.dConnu ? `${v.prenom} ${v.famille} ?` : nomDeLaVie(v);
    nom.classList.add("vc-apparait");
    if (v.d && !v.dConnu) nom.title = "Quelque chose manque à ce nom.";
    for (const [k, val] of lignes) {
      await attendre(420);
      grille.appendChild(h("dt", { class: "vc-apparait", text: k.replace("{/e}", v.sexe === "h" ? "" : "e") }));
      grille.appendChild(h("dd", { class: "vc-apparait", text: val }));
    }
    if (vie.volonte) {
      await attendre(400);
      acte.appendChild(h("p", { class: "vc-acte-volonte vc-apparait", text: `Quelque part, une Volonté vous cherche : ${vie.volonte.libelle}.` }));
    }
    await attendre(600);
    jumeaux.appendChild(h("h3", { class: "vc-apparait", text: "Nés à la même seconde" }));
    const liste = h("div", { class: "vc-jumeaux-liste" });
    jumeaux.appendChild(liste);
    for (const j of vie.jumeaux) {
      await attendre(260);
      const e = j.etat;
      liste.appendChild(h("div", { class: "vc-jumeau-naissance vc-apparait" },
        portraitCanvas(traitsDe(e), 54),
        h("div", null,
          h("strong", { text: e.d && !e.dConnu ? `${e.prenom} ${e.famille}` : nomDeLaVie(e) }),
          h("span", { text: `${e.nomIle}, ${ZONES[e.zone].nom}` }),
          h("span", { class: "vc-petit", text: CLASSES[e.classe].nom }),
        )));
    }
    await attendre(400);
    bouton.classList.remove("vc-cache");
  })();
}

function parentsTexte(vie: Vie): string {
  const v = vie.etat;
  if (v.flags.includes("orphelin")) return "inconnus";
  const mere = v.liens.find((l) => l.role === "mere");
  const pere = v.liens.find((l) => l.role === "pere");
  const parts: string[] = [];
  if (mere) parts.push(mere.nom);
  if (pere) parts.push(pere.parti ? `${pere.nom} (parti avant votre naissance)` : pere.nom);
  return parts.join(" et ") || "inconnus";
}

// ════════════════════════ La vie ════════════════════════

interface Partie2 {
  vie: Vie;
  partie: Partie;
  vitesse: number;
  enPause: boolean;
  journal: HTMLElement;
  fiche: HTMLElement;
  jumeaux: HTMLElement;
  grille: HTMLElement;
  cap: HTMLElement;
  actions: HTMLElement;
  /** Ce que montre le panneau des actions (pour ne le refaire que s'il change). */
  signatureActions?: string;
  modale: HTMLElement;
  etiquette: HTMLElement;
  boutonPause: HTMLButtonElement;
  vitesses: HTMLButtonElement[];
  auto: HTMLInputElement;
  derniereAnnee?: HTMLElement;
  /** Les lignes de l'année en cours, distillées une à une au fil de l'année. */
  file: Ligne[];
  /** Temps entre deux lignes de l'année en cours, à ×1 (ms). */
  pas: number;
}

function jouer(vie: Vie, partie: Partie): void {
  const el = ecran("vc-jeu");
  const barre = h("header", { class: "vc-barre" });
  el.appendChild(barre);
  const zoneScene = h("div", { class: "vc-zone-scene" });
  el.appendChild(zoneScene);
  scene = new Scene(zoneScene);
  const etiquette = h("div", { class: "vc-etiquette" });
  zoneScene.appendChild(etiquette);

  const corps = h("div", { class: "vc-corps" });
  el.appendChild(corps);
  const colRecit = h("section", { class: "vc-col-recit" });
  const colFiche = h("aside", { class: "vc-col-fiche" });
  corps.append(colRecit, colFiche);
  const journal = h("div", { class: "vc-journal", attrs: { "aria-live": "polite" } });
  colRecit.appendChild(journal);

  const fiche = h("div", { class: "vc-fiche" });
  const cap = h("div", { class: "vc-cap" });
  const actions = h("div", { class: "vc-actions-vie" });
  const jumeaux = h("div", { class: "vc-jumeaux" });
  const grille = h("div", { class: "vc-grille" });
  colFiche.append(
    fiche,
    h("h3", { class: "vc-titre-bloc", text: "Le cap de l'année" }), cap,
    h("h3", { class: "vc-titre-bloc", text: "Ce que vous faites de votre vie" }), actions,
    h("h3", { class: "vc-titre-bloc", text: "Nés à la même seconde" }), jumeaux,
    h("h3", { class: "vc-titre-bloc", text: "Une case par année" }), grille,
  );
  const modale = h("div", { class: "vc-modale vc-cache" });
  el.appendChild(modale);

  const boutonPause = h("button", { class: "vc-ctrl", text: "⏸", title: "Pause" });
  const vitesses = VITESSES.map((x) => h("button", { class: "vc-ctrl", text: `×${x}` }));
  const auto = h("input", { attrs: { type: "checkbox" } });
  auto.checked = meta.options.auto;
  barre.append(
    h("button", { class: "vc-ctrl vc-quitter", text: "← Taverne", onclick: () => { sauverPartie(partie); accueil(); } }),
    h("div", { class: "vc-ctrls" }, boutonPause, ...vitesses),
    h("label", { class: "vc-auto", title: "Les choix se font tout seuls ; la vie défile." }, auto, " Laisser vivre"),
    h("button", { class: "vc-ctrl", text: "📖", title: "Le Livre des Mers", onclick: () => { s.enPause = true; majControles(s); ouvrirCodexModal(s); } }),
  );

  const s: Partie2 = {
    vie, partie, vitesse: meta.options.vitesse || 1, enPause: false, journal, fiche, jumeaux, grille, cap, modale,
    etiquette, boutonPause, vitesses, auto, actions, file: [], pas: 0,
  };
  boutonPause.addEventListener("click", () => { s.enPause = !s.enPause; majControles(s); if (!s.enPause) programmer(s, 50); });
  vitesses.forEach((b, i) => b.addEventListener("click", () => {
    s.vitesse = VITESSES[i];
    meta.options.vitesse = s.vitesse;
    sauverMeta(meta);
    majControles(s);
  }));
  auto.addEventListener("change", () => {
    meta.options.auto = auto.checked;
    sauverMeta(meta);
    // Une décision déjà ouverte se laisse aussi vivre.
    if (auto.checked && vie.enAttente && s.modale.classList.contains("vc-ouverte")) montrerDecision(s);
  });

  // Rejouer l'affichage du journal déjà vécu.
  for (const l of vie.etat.journal) afficherLigne(s, l, false);
  majTout(s);
  majControles(s);
  journal.scrollTop = 0;

  if (vie.enAttente) montrerDecision(s);
  else programmer(s, 600);
}

function majControles(s: Partie2): void {
  s.boutonPause.textContent = s.enPause ? "▶" : "⏸";
  s.vitesses.forEach((b, i) => b.classList.toggle("vc-actif", VITESSES[i] === s.vitesse));
}

function programmer(s: Partie2, ms: number): void {
  if (minuteur !== undefined) clearTimeout(minuteur);
  minuteur = window.setTimeout(() => tour(s), ms);
}

function enregistrer(s: Partie2, a: Action): Ligne[] {
  s.partie.actions.push(a);
  const lignes = appliquerAction(s.vie, a);
  s.partie.journal = s.vie.etat.journal.length;
  sauverPartie(s.partie);
  return lignes;
}

function tour(s: Partie2): void {
  minuteur = undefined;
  if (s.enPause || s.modale.classList.contains("vc-ouverte")) return;
  const vie = s.vie;
  // Une année à la fois, distillée sur toute sa durée (40 à 60 s à ×1 pour une vie d'une heure).
  if (s.file.length) {
    const l = s.file.shift()!;
    afficherLigne(s, l, true);
    if (l.type === "annee") s.etiquette.textContent = `${l.annee} · ${l.age} an${l.age > 1 ? "s" : ""} · ${vie.etat.nomIle}`;
    if (!s.file.length) majTout(s);
    programmer(s, s.pas / s.vitesse);
    return;
  }
  if (!vie.etat.vivant) {
    s.enPause = true;
    void mourir(s);
    return;
  }
  if (vie.enAttente) {
    montrerDecision(s);
    return;
  }
  const lignes = enregistrer(s, ["a"]);
  const recit = lignes.filter((l) => l.type !== "annee").length;
  const annee = (meta.options.duree * 60_000 / ANNEES_REPERE) * (0.85 + 0.05 * Math.min(6, recit)) * vie.etat.pas;
  s.pas = annee / Math.max(1, lignes.length);
  s.file = lignes;
  tour(s);
}

function afficherLigne(s: Partie2, l: Ligne, anime: boolean): void {
  const v = s.vie.etat;
  if (l.type === "annee") {
    const age = l.age;
    // L'année la plus récente en haut ; dans une année, le récit se lit de haut en bas.
    const bloc = h("section", { class: "vc-an" }, h("div", { class: "vc-annee" },
      h("span", { class: "vc-annee-num", text: String(l.annee) }),
      h("span", { class: "vc-annee-age", text: age === 0 ? "naissance" : `${age} an${age > 1 ? "s" : ""}` }),
    ));
    s.journal.prepend(bloc);
    s.derniereAnnee = bloc;
    if (anime && s.journal.scrollTop < 220) s.journal.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const classes = `vc-l vc-l-${l.type}${l.ton ? ` vc-ton-${l.ton}` : ""}${l.projection ? " vc-projection" : ""}${anime ? " vc-apparait" : ""}`;
  let el: HTMLElement;
  switch (l.type) {
    case "monde":
      el = h("p", { class: classes }, h("span", { class: "vc-l-icone", text: "📰" }), l.texte);
      break;
    case "rumeur":
      el = h("p", { class: classes }, h("span", { class: "vc-l-icone", text: "🗣" }), l.texte);
      break;
    case "jumeau":
      el = h("p", { class: classes }, h("span", { class: "vc-l-icone", text: "📜" }), l.texte);
      break;
    case "action":
      el = h("h4", { class: classes, text: l.texte });
      break;
    case "routine":
      el = h("p", { class: classes }, h("span", { class: "vc-l-icone", text: "🔁" }), l.texte);
      break;
    case "clin":
      el = h("p", { class: classes }, h("span", { class: "vc-clin-badge", text: "👁 Clin d'œil" }), " ", l.texte);
      break;
    case "titre":
      el = h("h4", { class: classes, text: l.texte });
      break;
    default:
      el = h("p", { class: classes, text: l.texte });
  }
  (s.derniereAnnee ?? s.journal).appendChild(el);
  void v;
}

function majTout(s: Partie2): void {
  const v = s.vie.etat;
  const derniere = v.grille[v.grille.length - 1];
  scene?.mettreAJour({
    zone: v.zone,
    enMer: v.flags.includes("en-mer") || ((v.camp === "pirate" || v.camp === "marine") && !v.flags.includes("retraite")),
    pavillon: v.camp === "pirate" ? "pirate" : v.camp === "marine" ? "marine" : "aucun",
    tension: derniere?.tension ?? 0,
    annee: v.annee,
    mort: !v.vivant,
  });
  s.etiquette.textContent = `${v.annee} · ${v.age} an${v.age > 1 ? "s" : ""} · ${v.nomIle}`;
  majFiche(s);
  majCap(s);
  majActions(s);
  majJumeaux(s);
  majGrille(s.grille, v.grille, v.anneeNaissance);
}

function barre(nom: string, icone: string, valeur: number, classe: string): HTMLElement {
  return h("div", { class: `vc-jauge vc-j-${classe}` },
    h("span", { class: "vc-jauge-nom", text: `${icone} ${nom}` }),
    h("span", { class: "vc-jauge-piste" }, h("span", { class: "vc-jauge-rempli", style: `width:${Math.round(valeur)}%` })),
    h("span", { class: "vc-jauge-val", text: String(Math.round(valeur)) }),
  );
}

function majFiche(s: Partie2): void {
  const vie = s.vie;
  const v = vie.etat;
  vider(s.fiche);
  const g = v.grade ? gradeParId(v.grade) : undefined;
  const statut = [
    g ? g.nom : campTexte(v.camp, v.sexe),
    v.metier ? METIERS_NOMS[v.metier][v.sexe === "h" ? "m" : "f"] : "",
  ].filter(Boolean).join(" · ");
  s.fiche.append(
    h("div", { class: "vc-fiche-tete" },
      portraitCanvas(traitsDe(v), 84),
      h("div", null,
        h("strong", { class: "vc-fiche-nom", text: v.d && !v.dConnu ? `${v.prenom} ${v.famille} ?` : nomDeLaVie(v) }),
        h("span", { text: `${PEUPLES[v.peuple][v.sexe === "h" ? "m" : "f"]} · ${v.age} an${v.age > 1 ? "s" : ""}` }),
        h("span", { class: "vc-petit", text: statut }),
        v.surnom ? h("span", { class: "vc-petit", text: `« ${v.surnom} »` }) : null,
      )),
  );
  for (const j of JAUGES) s.fiche.appendChild(barre(FOCUS[j].nom, FOCUS[j].icone, v.jauges[j], j));
  s.fiche.appendChild(barre("Santé", "✚", v.sante, "sante"));
  const infos = h("div", { class: "vc-fiche-infos" });
  if (v.prime > 0 || v.primeMax > 0) infos.appendChild(h("p", { class: "vc-prime", text: `Prime : ${formaterPrime(v.prime)}` }));
  if (ageEchelle(v) >= 14) infos.appendChild(h("p", { text: `💰 ${formaterPrime(v.bourse)} d'économies` }));
  if (v.fruit) infos.appendChild(h("p", { text: `🍎 ${vie.fruit(v.fruit)?.nom ?? "un fruit du démon"}` }));
  if (v.fruitEnPoche) infos.appendChild(h("p", { text: `🎒 un fruit du démon, dans votre sac` }));
  if (v.haki.length) infos.appendChild(h("p", { text: `◉ Haki : ${v.haki.map((x) => ({ observation: "observation", armement: "armement", rois: "des rois" })[x]).join(", ")}` }));
  if (v.reve) infos.appendChild(h("p", { text: `${v.reveAccompli ? "★" : "☆"} ${REVES[v.reve].nom}` }));
  if (v.equipageNom && (v.camp === "pirate" || v.flags.includes("en-mer"))) infos.appendChild(h("p", { text: `⚓ ${v.equipageNom}${v.navire ? `, à bord du ${v.navire}` : ""}` }));
  infos.appendChild(h("p", { class: "vc-petit", text: `${ZONES[v.zone].nom} — ${v.nomIle}` }));
  s.fiche.appendChild(infos);

  const liens = v.liens.filter((l) => l.role !== "compagnon" || l.vivant);
  if (liens.length) {
    const noms: Record<string, [string, string]> = {
      mere: ["mère", "mère"], pere: ["père", "père"], ami: ["ami", "amie"], rival: ["rival", "rivale"], amour: ["amour", "amour"],
      conjoint: ["époux", "épouse"], mentor: ["maître", "maîtresse"], capitaine: ["capitaine", "capitaine"],
      compagnon: ["compagnon", "compagne"], enfant: ["fils", "fille"], frere: ["frère", "sœur"],
    };
    s.fiche.appendChild(h("ul", { class: "vc-liens-vie" },
      ...liens.slice(-10).map((l) => h("li", { class: l.vivant ? (l.parti ? "vc-parti" : "") : "vc-mort" },
        `${l.nom}`, h("span", { class: "vc-petit", text: ` ${noms[l.role][l.sexe === "f" ? 1 : 0]}${l.vivant ? "" : " ✝"}` }))),
    ));
  }
}

function majCap(s: Partie2): void {
  const v = s.vie.etat;
  vider(s.cap);
  for (const f of [...JAUGES, "repos"] as (Jauge | "repos")[]) {
    const b = h("button", {
      class: `vc-cap-bouton${v.focus === f ? " vc-actif" : ""}`,
      title: FOCUS[f].verbe,
      onclick: () => {
        if (!v.vivant) return;
        enregistrer(s, ["f", f]);
        majCap(s);
      },
    }, h("span", { class: "vc-cap-icone", text: FOCUS[f].icone }), h("span", { text: FOCUS[f].verbe }));
    s.cap.appendChild(b);
  }
}

function majActions(s: Partie2): void {
  const vie = s.vie;
  const v = vie.etat;
  const liste = vie.actions();
  const etats = liste.map((a) => vie.possible(a));
  const signature = `${v.annee}|${liste.map((a, i) => `${a.id}:${etats[i]}:${v.habitudes[a.id] ?? 0}`).join(",")}|${s.vie.enAttente ? 1 : 0}`;
  if (signature === s.signatureActions) return;
  s.signatureActions = signature;
  vider(s.actions);
  if (!liste.length) {
    s.actions.appendChild(h("p", { class: "vc-petit", text: v.vivant ? "Pour l'instant, la vie décide pour vous." : "" }));
    return;
  }
  liste.forEach((a, i) => {
    const ok = etats[i] === true;
    const detail = vie.rendre(a.detail);
    const bouton = h("button", {
      class: "vc-action-faire",
      title: ok ? detail : `${detail} — ${etats[i]}`,
      onclick: () => {
        if (!v.vivant || vie.enAttente || vie.possible(a) !== true) return;
        if (a.bascule && !confirm(`${a.nom} : ce choix changera votre vie. On y va ?`)) return;
        const lignes = enregistrer(s, ["x", a.id]);
        for (const l of lignes) afficherLigne(s, l, true);
        majTout(s);
        if (!v.vivant) void mourir(s);
        else if (vie.enAttente) montrerDecision(s);
      },
    },
    h("span", { class: "vc-action-icone", text: a.icone }),
    h("span", { class: "vc-action-nom" }, a.nom, h("small", { text: a.cout ? formaterPrime(a.cout) : detail })));
    bouton.disabled = !ok;
    const ligne = h("div", { class: `vc-action${ok ? "" : " vc-indispo"}` }, bouton);
    if (a.habitude) {
      const choix = h("select", { class: "vc-action-rythme", title: "En faire une habitude" },
        h("option", { text: "à la main", attrs: { value: "0" } }),
        ...RYTHMES.map((n) => h("option", { text: n === 1 ? "chaque année" : `tous les ${n} ans`, attrs: { value: String(n) } })));
      choix.value = String(v.habitudes[a.id] ?? 0);
      choix.classList.toggle("vc-actif", Boolean(v.habitudes[a.id]));
      choix.addEventListener("change", () => {
        enregistrer(s, ["h", a.id, Number(choix.value)]);
        majActions(s);
      });
      ligne.appendChild(choix);
    }
    s.actions.appendChild(ligne);
  });
}

function resteDeVie(e: { vivant: boolean; age: number; peuple: keyof typeof PEUPLES; sante: number }): number {
  if (!e.vivant) return 0;
  const age = e.age / PEUPLES[e.peuple].longevite;
  return Math.max(0.08, Math.min(1, (1 - age / 95) * (0.5 + e.sante / 200)));
}

function majJumeaux(s: Partie2): void {
  vider(s.jumeaux);
  for (const j of s.vie.jumeaux) {
    const e = j.etat;
    const dernier = e.faits[e.faits.length - 1];
    const g = e.grade ? gradeParId(e.grade) : undefined;
    s.jumeaux.appendChild(h("div", { class: `vc-jumeau${e.vivant ? "" : " vc-eteint"}` },
      vivreCard(e.graine, resteDeVie(e), 64, 38),
      h("div", { class: "vc-jumeau-texte" },
        h("strong", { text: e.d && !e.dConnu ? `${e.prenom} ${e.famille}` : nomDeLaVie(e) }),
        h("span", { class: "vc-petit", text: e.vivant ? `${e.age} an${e.age > 1 ? "s" : ""} · ${g ? g.nom : campTexte(e.camp, e.sexe)} · ${zoneTexte(e.zone)}` : `✝ ${e.mort?.age ?? "?"} ans` }),
        dernier ? h("span", { class: "vc-jumeau-fait", text: dernier.texte }) : null,
      )));
  }
}

const COULEURS_CAMP: Record<string, string> = {
  civil: "#8a7a5a", pirate: "#b03a2a", marine: "#3a6ab0", revolution: "#3a7a4a", "cipher-pol": "#2a2a3a",
  chasseur: "#8a5a2a", pegre: "#5a3a6a", esclave: "#6a6a6a", celeste: "#d8c070",
};

function majGrille(el: HTMLElement, cases: { age: number; annee: number; camp: string; tension: number; marque?: string }[], _naissance: number): void {
  vider(el);
  for (const c of cases) {
    const lum = 0.45 + c.tension * 0.11;
    el.appendChild(h("span", {
      class: `vc-case${c.marque ? " vc-case-marque" : ""}`,
      title: `${c.annee} · ${c.age} ans${c.marque ? ` — ${c.marque}` : ""}`,
      style: `background:${COULEURS_CAMP[c.camp] ?? "#777"};opacity:${lum.toFixed(2)}`,
    }));
  }
}

function montrerDecision(s: Partie2): void {
  const d = s.vie.enAttente;
  if (!d) return;
  const auto = s.auto.checked;
  if (d.type === "pause" && (!meta.options.pauses || auto)) {
    s.file.push(...enregistrer(s, ["n", ""]));
    programmer(s, 300);
    return;
  }
  const m = s.modale;
  vider(m);
  const carte = h("div", { class: `vc-carte vc-carte-${d.type}` });
  m.appendChild(carte);
  if (d.bascule) carte.appendChild(h("p", { class: "vc-bascule", text: "Ce choix changera votre vie." }));
  if (d.titre) carte.appendChild(h("h3", { text: d.type === "pause" ? `Vous avez ${d.titre}` : d.titre }));
  carte.appendChild(h("p", { class: "vc-carte-texte", text: d.texte }));

  const fermer = (lignes: Ligne[]): void => {
    m.classList.remove("vc-ouverte");
    m.classList.add("vc-cache");
    // La suite de l'année reprend son cours, au même rythme.
    s.file.push(...lignes);
    programmer(s, 300);
  };

  if (d.type === "pause") {
    const zone = h("textarea", { class: "vc-note", attrs: { rows: "3", maxlength: "500", placeholder: "Quelques mots, ou rien du tout." } });
    carte.append(zone, h("div", { class: "vc-choix" },
      h("button", { class: "vc-bouton vc-principal", text: "Continuer", onclick: () => fermer(enregistrer(s, ["n", zone.value])) })));
    setTimeout(() => zone.focus(), 50);
  } else {
    const choix = h("div", { class: "vc-choix" });
    for (const c of d.choix) {
      choix.appendChild(h("button", {
        class: "vc-bouton vc-choix-bouton",
        onclick: () => fermer(enregistrer(s, ["c", c.index])),
      }, h("span", { text: c.label }), c.risque ? h("span", { class: "vc-risque", text: "🎲", title: "Rien n'est joué d'avance." }) : null,
      c.detail ? h("small", { text: c.detail }) : null));
    }
    carte.appendChild(choix);
    if (auto) {
      setTimeout(() => {
        if (s.vie.enAttente !== d) return;
        fermer(enregistrer(s, ["c", s.vie.choixAuto()]));
      }, 1600 / Math.sqrt(s.vitesse));
    }
  }
  m.classList.remove("vc-cache");
  m.classList.add("vc-ouverte");
}

async function mourir(s: Partie2): Promise<void> {
  await attendre(2200);
  fin(s.vie, s.partie);
}

// ════════════════════════ La fin ════════════════════════

function fin(vie: Vie, partie: Partie): void {
  const bilan = faireLeBilan(vie, meta);
  meta.derniereReplique = bilan.replique;
  effacerPartie();
  sauverMeta(meta);
  void partie;
  ecranFin(vie, bilan);
}

const NOMS_SECTIONS: Record<SectionCodex, string> = {
  iles: "Îles", zones: "Mers", peuples: "Peuples", metiers: "Métiers", camps: "Destins", grades: "Rangs",
  fruits: "Fruits du démon", morts: "Morts", rencontres: "Rencontres", clins: "Clins d'œil", secrets: "Secrets",
  titres: "Titres", reliques: "Reliques",
};

function ecranFin(vie: Vie, b: Bilan): void {
  const el = ecran("vc-fin");
  const v = vie.etat;
  el.appendChild(h("p", { class: "vc-fin-mort", text: v.mort?.texte ?? "" }));

  const recherche = v.primeMax > 0;
  const affiche = recherche
    ? avisDeRecherche({ traits: traitsDe(v), nom: nomDeLaVie(v), prime: v.primeMax, mort: true }, 1.15)
    : carteDeVieFinale(vie);
  el.appendChild(h("section", { class: "vc-fin-affiche" }, affiche,
    h("div", { class: "vc-fin-titre" },
      h("p", { class: "vc-sur-titre", text: `${v.anneeNaissance} — ${v.mort?.annee ?? v.annee}` }),
      h("h2", { text: b.titre }),
      h("p", { text: nomDeLaVie(v) }),
    )));

  const grille = h("div", { class: "vc-grille vc-grille-fin" });
  majGrille(grille, v.grille, v.anneeNaissance);
  el.appendChild(h("section", { class: "vc-fin-bloc" }, h("h3", { text: "Une case par année" }), grille));

  el.appendChild(h("section", { class: "vc-fin-bloc" },
    h("h3", { text: "Les quatre autres, nés à la même seconde" }),
    h("ul", { class: "vc-fin-jumeaux" }, ...vie.jumeaux.map((j) => h("li", null,
      portraitCanvas(traitsDe(j.etat), 44),
      h("span", { text: j.etat.vivant ? `${j.nom} vit encore, ${j.etat.age} ans — ${j.etat.faits.slice(-1)[0]?.texte ?? ""}` : (j.etat.mort?.texte ?? "") })))),
  ));

  if (b.gains.length || b.secrets.length) {
    const parSection = new Map<SectionCodex, number>();
    for (const g of b.gains) parSection.set(g.section, (parSection.get(g.section) ?? 0) + 1);
    el.appendChild(h("section", { class: "vc-fin-bloc" },
      h("h3", { text: "Le Livre des Mers s'enrichit" }),
      h("div", { class: "vc-tampons" }, ...[...parSection].map(([sec, n]) => h("span", { class: "vc-tampon", text: `+${n} ${NOMS_SECTIONS[sec]}` }))),
      ...b.secrets.map((s) => h("p", { class: "vc-secret-obtenu", text: `★ Secret : ${s.nom} — ${s.recompense}` })),
    ));
  }
  if (b.presque.length) {
    el.appendChild(h("section", { class: "vc-fin-bloc vc-presque" },
      ...b.presque.map((p) => h("p", {
        text: p.connu
          ? `Vous étiez à une condition de « ${p.secret.nom} » : il manquait ${p.manque.toLowerCase()}.`
          : `Vous avez frôlé quelque chose de rare… On murmure : « ${p.secret.rumeur} »`,
      }))));
  }

  const mots = h("textarea", { class: "vc-note", attrs: { rows: "3", maxlength: "500", placeholder: `Un dernier mot pour ${v.prenom} ?` } });
  el.appendChild(h("section", { class: "vc-fin-bloc" }, h("h3", { text: "Un dernier mot" }), mots));

  let choisie: number | null = null;
  if (b.volontes.length) {
    const liste = h("div", { class: "vc-volontes" });
    b.volontes.forEach((vo, i) => {
      const bouton = h("button", { class: "vc-volonte", onclick: () => {
        choisie = choisie === i ? null : i;
        liste.querySelectorAll(".vc-volonte").forEach((x, k) => x.classList.toggle("vc-actif", k === choisie));
      } }, h("strong", { text: vo.libelle }), vo.chronique.length > 1 ? h("small", { text: `Portée par ${vo.chronique.length} vies` }) : null);
      liste.appendChild(bouton);
    });
    el.appendChild(h("section", { class: "vc-fin-bloc" },
      h("h3", { text: "La Volonté héritée" }),
      h("p", { class: "vc-petit", text: "Choisissez ce qui survivra à cette vie et cherchera la suivante. Une seule chose, ou rien." }),
      liste));
  }

  el.appendChild(h("div", { class: "vc-actions" }, h("button", {
    class: "vc-bouton vc-principal",
    text: "Retourner à la Taverne",
    onclick: () => {
      const r = meta.vies[meta.vies.length - 1];
      if (r && mots.value.trim()) r.mots = mots.value.trim().slice(0, 500);
      meta.volonte = choisie !== null ? b.volontes[choisie] : meta.volonte;
      sauverMeta(meta);
      accueil();
    },
  })));
}

function carteDeVieFinale(vie: Vie): HTMLElement {
  const v = vie.etat;
  const bloc = h("div", { class: "vc-carte-vie-finale" });
  bloc.appendChild(vivreCard(v.graine, 0.04, 220, 130));
  bloc.appendChild(portraitCanvas(traitsDe(v), 120));
  return bloc;
}

// ════════════════════════ Le Livre des Mers ════════════════════════

function clinsDuContenu(): Map<string, { ref: string; arc?: string }> {
  const m = new Map<string, { ref: string; arc?: string }>();
  for (const e of CONTENU.evenements) if (e.clinOeil) m.set(e.clinOeil.id, { ref: e.clinOeil.ref, arc: e.clinOeil.arc });
  for (const c of CLINS_ACTIONS) m.set(c.id, { ref: c.ref, arc: c.arc });
  return m;
}

function entreesCodex(): Record<SectionCodex, { id: string; nom: string; detail?: string }[]> {
  const clins = clinsDuContenu();
  const titres = [...new Set(CONTENU.titres.map((t) => t.titre))];
  return {
    zones: Object.entries(ZONES).map(([id, z]) => ({ id, nom: z.nom })),
    iles: ILES.filter((i) => i.poids > 0.01).map((i) => ({ id: i.id, nom: i.anonyme ? `Une île sans histoire — ${ZONES[i.zone].nom}` : i.nom, detail: ZONES[i.zone].nom })),
    peuples: Object.entries(PEUPLES).map(([id, p]) => ({ id, nom: `${p.m} / ${p.f}` })),
    metiers: Object.entries(METIERS_NOMS).map(([id, m]) => ({ id, nom: m.m })),
    camps: Object.entries(CAMPS).map(([id, nom]) => ({ id, nom })),
    grades: GRADES.map((g) => ({ id: g.id, nom: g.nom, detail: CAMPS[g.camp] })),
    fruits: CONTENU.fruits.map((f) => ({ id: f.id, nom: f.nom, detail: `${"★".repeat(f.rarete)} — ${f.description}` })),
    morts: CONTENU.morts.map((m) => ({ id: m.id, nom: m.libelle.replace(/\{([^{}/]*)\/[^{}]*\}/g, "$1") })),
    rencontres: CONTENU.rencontres.map((r) => ({ id: r.id, nom: r.nom, detail: r.description })),
    clins: [...clins].map(([id, c]) => ({ id, nom: c.ref, detail: c.arc })),
    secrets: CONTENU.secrets.map((s) => ({ id: s.id, nom: s.nom, detail: `${"★".repeat(s.difficulte)} — ${s.recompense}` })),
    titres: titres.map((t) => ({ id: t, nom: t.replace(/\{([^{}/]*)\/[^{}]*\}/g, "$1") })),
    reliques: CONTENU.reliques.map((r) => ({ id: r.id, nom: r.nom, detail: r.description })),
  };
}

function progressionCodex(): number {
  const e = entreesCodex();
  let total = 0;
  let vus = 0;
  for (const k of Object.keys(e) as SectionCodex[]) {
    total += e[k].length;
    vus += e[k].filter((x) => meta.codex[k].includes(x.id)).length;
  }
  return total ? Math.round((100 * vus) / total) : 0;
}

function contenuCodex(cible: HTMLElement, section: SectionCodex = "zones"): void {
  vider(cible);
  const e = entreesCodex();
  const onglets = h("div", { class: "vc-onglets" });
  const ordre: SectionCodex[] = ["zones", "iles", "peuples", "metiers", "camps", "grades", "fruits", "morts", "rencontres", "clins", "secrets", "titres", "reliques"];
  for (const k of ordre) {
    const vus = e[k].filter((x) => meta.codex[k].includes(x.id)).length;
    onglets.appendChild(h("button", { class: `vc-onglet${k === section ? " vc-actif" : ""}`, text: `${NOMS_SECTIONS[k]} ${vus}/${e[k].length}`, onclick: () => contenuCodex(cible, k) }));
  }
  cible.appendChild(onglets);
  const liste = h("div", { class: "vc-codex-liste" });
  for (const x of e[section]) {
    const vu = meta.codex[section].includes(x.id);
    const rumeur = section === "secrets" && !vu && meta.rumeurs.includes(x.id);
    const secret = CONTENU.secrets.find((s) => s.id === x.id);
    const n = meta.compte[`${section}:${x.id}`];
    liste.appendChild(h("div", { class: `vc-entree${vu ? "" : " vc-inconnue"}` },
      h("strong", { text: vu ? x.nom : rumeur ? "Rumeur" : "???" }),
      vu && x.detail ? h("span", { class: "vc-petit", text: x.detail }) : null,
      rumeur && secret ? h("span", { class: "vc-petit", text: `« ${secret.rumeur} »` }) : null,
      vu && n && n > 1 ? h("span", { class: "vc-compte", text: `×${n}` }) : null,
    ));
  }
  cible.appendChild(liste);
  if (section === "secrets" && meta.poneglyphes.length) {
    cible.appendChild(h("p", { class: "vc-poneglyphes", text: `Carnet des Ponéglyphes : ${[1, 2, 3, 4].map((i) => (meta.poneglyphes.includes(i) ? "▣" : "□")).join(" ")}` }));
  }
}

function codex(): void {
  const el = ecran("vc-codex");
  el.appendChild(h("header", { class: "vc-haut" }, h("button", { class: "vc-retour", text: "← La Taverne", onclick: () => accueil() })));
  el.appendChild(h("h1", { text: "Le Livre des Mers" }));
  el.appendChild(h("p", { class: "vc-accroche", text: `${progressionCodex()} % du monde connu. Chaque vie y ajoute quelque chose, même la plus courte.` }));
  const zone = h("div");
  el.appendChild(zone);
  contenuCodex(zone);
}

function ouvrirCodexModal(s: Partie2): void {
  const m = s.modale;
  vider(m);
  const carte = h("div", { class: "vc-carte vc-carte-codex" });
  const zone = h("div");
  carte.append(h("h3", { text: "Le Livre des Mers" }), zone, h("div", { class: "vc-choix" },
    h("button", { class: "vc-bouton", text: "Fermer", onclick: () => {
      m.classList.remove("vc-ouverte");
      m.classList.add("vc-cache");
      s.enPause = false;
      majControles(s);
      programmer(s, 300);
    } })));
  m.appendChild(carte);
  contenuCodex(zone);
  m.classList.remove("vc-cache");
  m.classList.add("vc-ouverte");
}

// ════════════════════════ Le Mémorial ════════════════════════

function memorial(): void {
  const el = ecran("vc-memorial");
  el.appendChild(h("header", { class: "vc-haut" }, h("button", { class: "vc-retour", text: "← La Taverne", onclick: () => accueil() })));
  el.appendChild(h("h1", { text: "Le Mémorial" }));
  el.appendChild(h("p", { class: "vc-accroche", text: "« Quand meurt un homme ? Quand on l'oublie. » Ici, on n'oublie pas." }));
  if (!meta.vies.length) {
    el.appendChild(h("p", { class: "vc-petit", text: "Personne encore. Allez vivre." }));
    return;
  }
  const liste = h("div", { class: "vc-memorial-liste" });
  for (const r of [...meta.vies].reverse()) {
    const detail = h("div", { class: "vc-memorial-detail vc-cache" },
      h("p", { text: r.mortTexte }),
      h("p", { class: "vc-petit", text: `Né${r.sexe === "f" ? "e" : ""} en ${r.anneeNaissance} ${deLieu(r.ileNatale)} (${ZONES[r.zoneNatale].nom}).${r.reve ? ` Rêve : ${REVES[r.reve as keyof typeof REVES]?.nom ?? r.reve}${r.reveAccompli ? " — accompli." : "."}` : ""}` }),
      ...Object.entries(r.notes).map(([age, note]) => h("p", { class: "vc-note-memo", text: `À ${age} ans : « ${note} »` })),
      r.mots ? h("p", { class: "vc-note-memo", text: `Vos derniers mots pour ${r.prenom} : « ${r.mots} »` }) : null,
      h("ul", { class: "vc-petit" }, ...r.jumeaux.map((j) => h("li", { text: j.texte }))),
    );
    const carte = h("article", { class: "vc-memorial-vie", onclick: () => detail.classList.toggle("vc-cache") },
      r.primeMax > 0
        ? avisDeRecherche({ traits: traitsResume(r), nom: r.nom, prime: r.primeMax, mort: true }, 0.42)
        : portraitCanvas(traitsResume(r), 80),
      h("div", null,
        h("strong", { text: r.titre }),
        h("span", { text: `${r.nom} · ${r.anneeNaissance}–${r.anneeMort} · ${r.ageMort} ans` }),
        h("span", { class: "vc-petit", text: `Vie n° ${r.n}` }),
      ),
    );
    liste.append(carte, detail);
  }
  el.appendChild(liste);
}

// Les âges des pauses, pour l'aide.
export const AIDE = { pauses: AGES_PAUSES, mondes: MONDES, traits: TRAITS.length, ageEchelle };

declare module "./sauvegarde.ts" {
  interface Meta {
    derniereReplique?: string;
  }
}
