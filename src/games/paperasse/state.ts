// Paperasse — état de la partie, écoulement du temps (`tick`), actions du
// joueur, hors ligne et sauvegarde. Le temps est en secondes de jeu.

import {
  AMBIANCE,
  AMBIANCE_ESPACE,
  CAMPAGNE_BAISSE,
  CAMPAGNE_SECONDES,
  CERFA_OBJETS,
  CERFA_TYPES,
  ENTETES,
  FEUILLES_PAR_RAMETTE,
  FRONTIERES,
  GREVE_ATTENTE,
  GROGNE_BAISSE,
  GROGNE_HORS_LIGNE_MAX,
  GROGNE_PAR_CERFA,
  GROGNE_PAR_DELAI,
  GUICHET_DELAI_MAX,
  GUICHET_DELAI_MIN,
  GUICHET_DUREE,
  HORS_LIGNE_MAX,
  MASSE_FEUILLE,
  MASSE_GUICHET,
  NEGO_SECONDES,
  PASSAGES,
  PRIX_RAMETTE_MAX,
  PRIX_RAMETTE_MIN,
  PRIX_RAMETTE_MOYEN,
  PROJET_PAR_ID,
  PROJETS,
  REGION_DEPART,
  REGION_PAR_ID,
  TIMBRE_DEPART,
  TIMBRE_MIN,
  TIMBRE_PAS,
  UNITE_PAR_ID,
  UNITES,
  USAGER_PAR_ID,
  USAGERS,
  type Mods,
  type Phase,
  type ProjetDef,
  type UniteId,
} from "./data.ts";
import {
  capNotes,
  capacite,
  coutAffichage,
  coutCerfa,
  coutRegion,
  coutUnite,
  delai,
  dossiersParClic,
  formatNombre,
  mods,
  notesParSec,
  patience,
  pieces,
  recetteParDossier,
  renonciation,
  replication,
  seuilGalon,
  traitementGuichet,
  usagersParSec,
} from "./eco.ts";

export interface EffetTemp {
  mult: number; // multiplicateur de demande
  fin: number; // t de fin
}

export interface Guichet {
  id: string;
  fin: number;
}

// Flux mesurés au dernier tick (affichage seulement).
export interface Flux {
  traites: number; // dossiers/s
  deposes: number; // dossiers/s arrivant dans la pile
  recettes: number; // €/s
  feuilles: number; // feuilles/s
  renonce: number; // 0..1
}

export interface Etat {
  v: 1;
  phase: Phase;
  espace: boolean;
  fin: boolean;
  medailles: number;
  t: number;
  tPhases: number[]; // t d'entrée dans chaque phase (index 0 = phase 1), puis t de fin
  savedAt: number; // ms

  dossiers: number;
  pile: number;
  budget: number;
  recettesTotales: number;
  clics: number;

  feuilles: number;
  prixRamette: number;
  ramettesAchetees: number;
  autoRamette: boolean;

  timbre: number;
  affichage: number;
  unites: Record<UniteId, number>;

  galons: number;
  galonsLibres: number;
  reunions: number;
  classeurs: number;
  notes: number;
  projets: string[];

  cerfas: string[];
  regions: string[];
  grogne: number;
  greve: boolean;
  greveFin: number; // t où la grève s'arrête d'elle-même si on attend (0 = on n'attend pas)
  requisitionFin: number;
  effets: EffetTemp[];
  guichet: Guichet | null;
  prochainGuichet: number;
  usagersVus: string[];
  prochaineAmbiance: number;

  matiere: number; // kg restant dans la frontière courante
  frontiere: number; // index dans FRONTIERES (-1 = pas encore dans l'espace)
  guichetsAuto: number;
  retraite: boolean; // la dernière demande est arrivée

  journal: string[]; // le plus récent d'abord
  flux: Flux;
  recettesClics: number; // € gagnés au tampon depuis le dernier tick
}

export const STORAGE_KEY = "paperasse-v1";
const JOURNAL_MAX = 60;

let rand: () => number = Math.random;
export function setRandom(f: () => number): void {
  rand = f;
}

export function nouvelEtat(now: number, medailles = 0): Etat {
  const unites = Object.fromEntries(UNITES.map((u) => [u.id, 0])) as Record<UniteId, number>;
  return {
    v: 1,
    phase: 1,
    espace: false,
    fin: false,
    medailles,
    t: 0,
    tPhases: [0],
    savedAt: now,
    dossiers: 0,
    pile: 0,
    budget: 0,
    recettesTotales: 0,
    clics: 0,
    feuilles: FEUILLES_PAR_RAMETTE,
    prixRamette: PRIX_RAMETTE_MOYEN,
    ramettesAchetees: 0,
    autoRamette: false,
    timbre: TIMBRE_DEPART,
    affichage: 0,
    unites,
    galons: 0,
    galonsLibres: 0,
    reunions: 1,
    classeurs: 1,
    notes: 0,
    projets: [],
    cerfas: [],
    regions: [REGION_DEPART],
    grogne: 0,
    greve: false,
    greveFin: 0,
    requisitionFin: 0,
    effets: [],
    guichet: null,
    prochainGuichet: 0,
    usagersVus: [],
    prochaineAmbiance: 90,
    matiere: 0,
    frontiere: -1,
    guichetsAuto: 0,
    retraite: false,
    journal: [
      medailles > 0
        ? `Nouvelle carrière. ${medailles} médaille${medailles > 1 ? "s" : ""} du mérite administratif au revers de la veste.`
        : "Premier jour à la mairie de Trifouilly-les-Oies. On vous a donné un tampon.",
    ],
    flux: { traites: 0, deposes: 0, recettes: 0, feuilles: 0, renonce: 0 },
    recettesClics: 0,
  };
}

export function noter(e: Etat, msg: string): void {
  e.journal.unshift(msg);
  if (e.journal.length > JOURNAL_MAX) e.journal.length = JOURNAL_MAX;
}

// ---- le temps qui passe ----

export interface TickOptions {
  horsLigne?: boolean;
}

export function tick(e: Etat, dt: number, opts: TickOptions = {}): void {
  if (e.fin || dt <= 0) return;
  e.t += dt;
  const m = mods(e);

  marcheDuPapier(e, dt);
  e.effets = e.effets.filter((ef) => ef.fin > e.t);

  if (e.espace) tickEspace(e, m, dt);
  else tickTerre(e, m, dt);

  // notes de service
  e.notes = Math.min(capNotes(e, m), e.notes + notesParSec(e, m) * dt);

  // galons
  while (e.dossiers >= seuilGalon(e.galons)) {
    e.galons++;
    e.galonsLibres++;
    if (e.galons === 1) noter(e, "Vous gagnez un galon. Où le mettre : réunion ou classeur ?");
  }

  if (e.phase === 3 && !e.espace) tickGrogne(e, m, dt, !!opts.horsLigne);

  if (!opts.horsLigne) {
    tickGuichet(e);
    tickAmbiance(e);
  }
}

function marcheDuPapier(e: Etat, dt: number): void {
  // marche aléatoire qui revient vers le prix moyen
  const pas = Math.sqrt(dt);
  e.prixRamette += (PRIX_RAMETTE_MOYEN - e.prixRamette) * 0.01 * dt + (rand() - 0.5) * ((PRIX_RAMETTE_MAX - PRIX_RAMETTE_MIN) / 15) * pas;
  e.prixRamette = Math.min(PRIX_RAMETTE_MAX, Math.max(PRIX_RAMETTE_MIN, e.prixRamette));
}

function tickTerre(e: Etat, m: Mods, dt: number): void {
  const cap = capacite(e, m);
  const f = m.feuilles;
  const pat = patience(m);
  // plancher à 1/s : le rythme d'un humain qui tamponne à la main
  const ren = renonciation(delai(e.pile, Math.max(cap, 1)), pat);
  const deposes = usagersParSec(e, m) * pieces(e, m) * (1 - ren);
  e.pile += deposes * dt;

  // achat automatique : de quoi tenir 20 s
  if (e.autoRamette) {
    const besoin = cap * f * 20 - e.feuilles;
    if (besoin > 0) acheterRamettes(e, Math.ceil(besoin / FEUILLES_PAR_RAMETTE), true);
  }

  const traites = Math.max(0, Math.min(e.pile, cap * dt, e.feuilles / f));
  traiter(e, m, traites);

  e.flux = {
    traites: traites / dt,
    deposes,
    recettes: (traites * recetteParDossier(e, m) + e.recettesClics) / dt,
    feuilles: (traites * f) / dt,
    renonce: ren,
  };
  e.recettesClics = 0;
}

function traiter(e: Etat, m: Mods, n: number): void {
  if (n <= 0) return;
  e.pile -= n;
  e.dossiers += n;
  e.feuilles -= n * m.feuilles;
  const r = n * recetteParDossier(e, m);
  e.budget += r;
  e.recettesTotales += r;
}

function tickGrogne(e: Etat, m: Mods, dt: number, horsLigne: boolean): void {
  if (e.projets.includes("reclamation")) {
    e.grogne = 0;
    return;
  }
  if (e.greve) {
    if (e.greveFin > 0 && e.t >= e.greveFin) finirGreve(e, 50, "La grève s'essouffle. Tout le monde reprend, en traînant des pieds.");
    return;
  }
  const cap = capacite(e, m);
  const d = Math.min(delai(e.pile, Math.max(cap, 1)), 10 * patience(m));
  const requis = e.t < e.requisitionFin ? 1.5 : 1;
  const gain = (GROGNE_PAR_CERFA * e.cerfas.length + GROGNE_PAR_DELAI * (d / patience(m))) * m.grogneGain * requis;
  e.grogne += (gain - GROGNE_BAISSE * m.grogneBaisse) * dt;
  e.grogne = Math.max(0, Math.min(horsLigne ? GROGNE_HORS_LIGNE_MAX : 100, e.grogne));
  if (e.grogne >= 100) {
    e.greve = true;
    e.greveFin = 0;
    noter(e, "GRÈVE GÉNÉRALE ! Plus aucun dossier ne sort. Il faut décider quelque chose.");
  }
}

function tickEspace(e: Etat, m: Mods, dt: number): void {
  if (e.retraite) return;
  const r = replication(m);
  const k = traitementGuichet(e, m);
  let nouveaux = e.guichetsAuto * r * dt;
  let traites = e.guichetsAuto * k * dt;
  const masse = nouveaux * MASSE_GUICHET + traites * MASSE_FEUILLE;
  if (masse > e.matiere) {
    const s = e.matiere / masse;
    nouveaux *= s;
    traites *= s;
  }
  e.guichetsAuto += nouveaux;
  e.matiere = Math.max(0, e.matiere - (nouveaux * MASSE_GUICHET + traites * MASSE_FEUILLE));
  e.dossiers += traites;
  e.flux = { traites: traites / dt, deposes: 0, recettes: 0, feuilles: traites / dt, renonce: 0 };

  if (e.matiere <= 0 && traites + nouveaux > 0) {
    const derniere = e.frontiere === FRONTIERES.length - 1;
    if (derniere) {
      e.retraite = true;
      noter(e, "Il n'y a plus rien à administrer. Plus rien. Sauf un dernier dossier, sur votre bureau.");
    } else {
      noter(e, `Plus un gramme de matière à administrer sur ${FRONTIERES[e.frontiere].nom}. Il faut voir plus grand.`);
    }
  }
}

function tickGuichet(e: Etat): void {
  if (e.phase < 2 || e.phase > 3 || e.espace) return;
  if (e.guichet && e.t >= e.guichet.fin) {
    noter(e, `${USAGER_PAR_ID[e.guichet.id].qui} est reparti sans réponse.`);
    e.guichet = null;
    e.prochainGuichet = e.t + attenteGuichet();
  }
  if (!e.guichet && e.prochainGuichet === 0) e.prochainGuichet = e.t + 20;
  if (!e.guichet && e.t >= e.prochainGuichet) {
    const pool = USAGERS.filter((u) => u.phase <= e.phase && (e.phase !== 3 || u.phase === 3 || rand() < 0.3));
    let dispo = pool.filter((u) => !e.usagersVus.includes(u.id));
    if (dispo.length === 0) {
      e.usagersVus = [];
      dispo = pool;
    }
    const u = dispo[Math.floor(rand() * dispo.length)];
    e.usagersVus.push(u.id);
    e.guichet = { id: u.id, fin: e.t + GUICHET_DUREE };
  }
}

function attenteGuichet(): number {
  return GUICHET_DELAI_MIN + rand() * (GUICHET_DELAI_MAX - GUICHET_DELAI_MIN);
}

function tickAmbiance(e: Etat): void {
  if (e.t < e.prochaineAmbiance) return;
  e.prochaineAmbiance = e.t + 80 + rand() * 80;
  const liste = e.espace ? AMBIANCE_ESPACE : AMBIANCE[e.phase];
  noter(e, liste[Math.floor(rand() * liste.length)]);
}

// ---- actions du joueur ----

export function tamponner(e: Etat): number {
  if (e.fin || e.espace) return 0;
  const m = mods(e);
  e.clics++;
  const n = Math.max(0, Math.min(e.pile, dossiersParClic(e, m)));
  if (n <= 0) return 0;
  // à la main, on tamponne au dos des vieux dossiers : pas de papier
  traiter(e, m, n);
  e.feuilles += n * m.feuilles; // traiter() les a décomptées : on les rend
  e.recettesClics += n * recetteParDossier(e, m);
  return n;
}

// Le pas suit l'ordre de grandeur : 0,05 € jusqu'à 1 €, puis 0,10 €, 1 €, 10 €…
export function pasTimbre(timbre: number, sens: 1 | -1): number {
  const ref = sens < 0 ? timbre * 0.999 : timbre; // en descendant, on reste dans la décade du dessous
  if (ref < 1) return TIMBRE_PAS;
  return 10 ** Math.floor(Math.log10(ref)) / 10;
}

export function changerTimbre(e: Etat, sens: 1 | -1): void {
  const pas = pasTimbre(e.timbre, sens);
  e.timbre = Math.max(TIMBRE_MIN, Math.round((e.timbre + sens * pas) * 100) / 100);
}

export function acheterRamettes(e: Etat, n: number, auto = false): boolean {
  const cout = n * e.prixRamette;
  if (n <= 0 || cout > e.budget) {
    if (!auto) return false;
    // en automatique, on achète ce qu'on peut
    n = Math.floor(e.budget / e.prixRamette);
    if (n <= 0) return false;
  }
  e.budget -= n * e.prixRamette;
  e.feuilles += n * FEUILLES_PAR_RAMETTE;
  e.ramettesAchetees += n;
  // les gros achats font monter le prix
  e.prixRamette = Math.min(PRIX_RAMETTE_MAX, e.prixRamette + (auto ? 0 : 0.08 * Math.min(n, 10)));
  return true;
}

export function uniteDisponible(e: Etat, id: UniteId): boolean {
  const u = UNITE_PAR_ID[id];
  if (e.espace) return false;
  if (u.projet) return e.projets.includes(u.projet);
  if (u.id === "stagiaire") return e.unites.stagiaire > 0 || e.budget >= 5 || e.dossiers >= 20;
  return e.phase >= u.phase;
}

export function acheterUnite(e: Etat, id: UniteId): boolean {
  if (!uniteDisponible(e, id)) return false;
  const cout = coutUnite(UNITE_PAR_ID[id], e.unites[id]);
  if (cout > e.budget) return false;
  e.budget -= cout;
  e.unites[id]++;
  return true;
}

export function affichageDisponible(e: Etat): boolean {
  return !e.espace && (e.affichage > 0 || e.unites.stagiaire >= 2);
}

export function acheterAffichage(e: Etat): boolean {
  if (!affichageDisponible(e)) return false;
  const cout = coutAffichage(e.affichage);
  if (cout > e.budget) return false;
  e.budget -= cout;
  e.affichage++;
  return true;
}

export function placerGalon(e: Etat, ou: "reunion" | "classeur"): boolean {
  if (e.galonsLibres <= 0) return false;
  e.galonsLibres--;
  if (ou === "reunion") e.reunions++;
  else e.classeurs++;
  return true;
}

export function projetsVisibles(e: Etat): ProjetDef[] {
  if (e.fin) return [];
  return PROJETS.filter((p) => !e.projets.includes(p.id) && p.visible(e));
}

export function projetAbordable(e: Etat, p: ProjetDef): boolean {
  return (p.notes ?? 0) <= e.notes && (p.budget ?? 0) <= e.budget;
}

export function acheterProjet(e: Etat, id: string): boolean {
  const p = PROJET_PAR_ID[id];
  if (!p || e.projets.includes(id) || !p.visible(e) || !projetAbordable(e, p)) return false;
  e.notes -= p.notes ?? 0;
  e.budget -= p.budget ?? 0;
  e.projets.push(id);
  noter(e, p.journal);
  if (id === "commande-groupee") e.autoRamette = true;
  if (id in PASSAGES) changerPhase(e, PASSAGES[id]);
  if (id === "reclamation") {
    e.grogne = 0;
    if (e.greve) finirGreve(e, 0, "");
  }
  const fr = FRONTIERES.findIndex((f) => f.projet === id);
  if (fr >= 0) entrerFrontiere(e, fr);
  return true;
}

function changerPhase(e: Etat, phase: Phase): void {
  e.phase = phase;
  e.tPhases[phase - 1] = e.t;
  e.guichet = null;
  e.prochainGuichet = 0;
  if (phase === 4 && e.greve) finirGreve(e, 0, "");
  const ent = ENTETES[phase];
  noter(e, `Nouvelle affectation : ${ent.grade.toLowerCase()}, ${ent.lieu}.`);
}

function entrerFrontiere(e: Etat, i: number): void {
  if (i === 0) {
    e.espace = true;
    e.guichetsAuto = 1;
    e.pile = 0;
  }
  e.frontiere = i;
  e.matiere = FRONTIERES[i].masse;
}

// ---- Cerfa (phase 2+) ----

export function cerfaDisponible(e: Etat): boolean {
  return e.phase >= 2 && !e.espace;
}

export function inventerCerfa(e: Etat): string | null {
  if (!cerfaDisponible(e)) return null;
  const cout = coutCerfa(e.cerfas.length);
  if (cout > e.notes) return null;
  e.notes -= cout;
  const num = String(10000 + Math.floor(rand() * 89999));
  const nom = `Cerfa n° ${num}*0${1 + Math.floor(rand() * 9)} — ${pick(CERFA_TYPES)} ${pick(CERFA_OBJETS)}`;
  e.cerfas.push(nom);
  noter(e, `Nouveau formulaire : ${nom}. Chaque usager doit désormais fournir ${formatNombre(e.cerfas.length + 1 + mods(e).pieces)} pièces.`);
  return nom;
}

function pick<T>(l: T[]): T {
  return l[Math.floor(rand() * l.length)];
}

// ---- régions (phase 3) ----

export function ouvrirRegion(e: Etat, id: string): boolean {
  if (e.phase < 3 || e.espace || e.regions.includes(id) || !REGION_PAR_ID[id]) return false;
  const cout = coutRegion(e.regions.length);
  if (cout > e.budget) return false;
  e.budget -= cout;
  e.regions.push(id);
  noter(e, `Préfecture ouverte : ${REGION_PAR_ID[id].nom}. Les usagers affluent.`);
  return true;
}

// ---- grogne et grève (phase 3) ----

export function campagneDisponible(e: Etat): boolean {
  return e.phase === 3 && e.projets.includes("communication") && !e.projets.includes("reclamation");
}

export function coutCampagne(e: Etat): number {
  return Math.max(1000, e.flux.recettes * CAMPAGNE_SECONDES);
}

export function lancerCampagne(e: Etat): boolean {
  if (!campagneDisponible(e) || e.greve) return false;
  const cout = coutCampagne(e);
  if (cout > e.budget) return false;
  e.budget -= cout;
  e.grogne = Math.max(0, e.grogne - CAMPAGNE_BAISSE);
  noter(e, "Campagne de com' : « Votre préfecture vous aime. » Les affiches sont bleu-blanc-beige.");
  return true;
}

// Recettes de référence pendant la grève (le flux est à 0) : estimées
// d'après la demande, pour chiffrer la négociation.
export function coutNegociation(e: Etat): number {
  const m = mods(e);
  return Math.max(1000, usagersParSec(e, m) * pieces(e, m) * recetteParDossier(e, m) * NEGO_SECONDES);
}

export function decisionGreve(e: Etat, choix: "negocier" | "requisitionner" | "attendre"): boolean {
  if (!e.greve) return false;
  if (choix === "negocier") {
    const cout = coutNegociation(e);
    if (cout > e.budget) return false;
    e.budget -= cout;
    finirGreve(e, 40, "Accord signé à 4 h du matin : une prime, et des croissants le vendredi.");
  } else if (choix === "requisitionner") {
    e.requisitionFin = e.t + 300;
    finirGreve(e, 70, "Réquisition. Tout le monde reprend… mais ça grogne deux fois plus.");
  } else {
    if (e.greveFin === 0) {
      e.greveFin = e.t + GREVE_ATTENTE;
      noter(e, "Vous attendez que ça passe. Les grévistes jouent à la belote dans le hall.");
    }
  }
  return true;
}

function finirGreve(e: Etat, grogne: number, msg: string): void {
  e.greve = false;
  e.greveFin = 0;
  e.grogne = grogne;
  if (msg) noter(e, msg);
}

// ---- le Guichet ----

export function repondreGuichet(e: Etat, i: 0 | 1 | 2): string | null {
  if (!e.guichet) return null;
  const u = USAGER_PAR_ID[e.guichet.id];
  const r = u.reponses[i];
  const m = mods(e);
  const ef = r.effet;
  const recettes = Math.max(e.flux.recettes, 1);
  if ("notes" in ef) e.notes = Math.max(0, Math.min(capNotes(e, m), e.notes + ef.notes * capNotes(e, m)));
  if ("budget" in ef) e.budget = Math.max(0, e.budget + ef.budget * recettes);
  if ("notoriete" in ef) e.effets.push({ mult: ef.notoriete, fin: e.t + ef.duree });
  if ("grogne" in ef && e.phase === 3) e.grogne = Math.max(0, Math.min(99, e.grogne + ef.grogne));
  e.guichet = null;
  e.prochainGuichet = e.t + attenteGuichet();
  noter(e, `${u.qui} : ${r.resultat}`);
  return r.resultat;
}

// ---- la fin ----

export function partirALaRetraite(e: Etat): boolean {
  if (!e.retraite || e.fin) return false;
  e.dossiers += 1;
  e.fin = true;
  e.tPhases[4] = e.t;
  noter(e, "Demande de départ à la retraite : TRAITÉ. Dossier classé.");
  return true;
}

export function nouvelleCarriere(e: Etat, now: number): Etat {
  return nouvelEtat(now, e.medailles + 1);
}

// ---- hors ligne ----

// Rejoue l'absence par pas de 1 s (au plus 8 h). Renvoie le bilan.
export function rattraper(e: Etat, secondes: number): { duree: number; dossiers: number; budget: number } {
  const duree = Math.min(HORS_LIGNE_MAX, Math.max(0, secondes));
  const d0 = e.dossiers;
  const b0 = e.budget;
  let reste = duree;
  while (reste > 0 && !e.fin) {
    const pas = Math.min(1, reste);
    tick(e, pas, { horsLigne: true });
    reste -= pas;
  }
  // le Guichet ne garde personne pendant l'absence
  if (e.guichet) {
    e.guichet = null;
    e.prochainGuichet = e.t + 20;
  }
  return { duree, dossiers: e.dossiers - d0, budget: e.budget - b0 };
}

// ---- sauvegarde ----

export function sauver(e: Etat, now: number): void {
  e.savedAt = now;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(e));
  } catch {
    // stockage plein ou bloqué : on joue sans sauvegarde
  }
}

export function charger(): Etat | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return reparer(JSON.parse(raw));
  } catch {
    return null;
  }
}

// Complète une sauvegarde avec les champs ajoutés depuis.
export function reparer(brut: Partial<Etat>): Etat | null {
  if (!brut || brut.v !== 1) return null;
  const base = nouvelEtat(brut.savedAt ?? Date.now(), brut.medailles ?? 0);
  const e = { ...base, ...brut } as Etat;
  e.unites = { ...base.unites, ...(brut.unites ?? {}) };
  e.flux = { ...base.flux, ...(brut.flux ?? {}) };
  return e;
}
