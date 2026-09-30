// Les Caravanes — état de la partie, écoulement du temps, actions du joueur et
// sauvegarde. Le temps est réel : `avancer` sert au tick de chaque image comme
// au retour après une nuit d'absence (les caravaniers enchaînent les allers-
// retours pendant ce temps-là).

import {
  AMPLIF_INFORMATEURS,
  ATTELAGES,
  BONUS_MAITRE_NEGOCIANT,
  BONUS_REPUTATION_MARCHAND,
  CHARRETTES,
  COMPETENCES,
  COMPETENCE_PAR_ID,
  FACTEUR_MARCHES_PROFONDS,
  PRIX_FLOTTE_ROYALE,
  REMISE_EN_GROS,
  REPUTATION_AUTO,
  REPUTATION_MARCHANDAGE,
  REPUTATION_PREMIER,
  REPUTATION_RAISON,
  VILLE_PAR_ID,
  DEMI_VIE_SATURATION,
  DUREE_CRENEAU,
  ECUS_DEPART,
  SATURATION_MAX,
  PRIX_CARAVANES,
  PRIX_CARAVANIERS,
  PRIX_TITRE_ROYAL,
  VILLES,
  type BienId,
  type CompetenceId,
  type VilleId,
} from "./data.ts";
import type { Talents } from "./marchandage.ts";
import {
  chargementAuto,
  evenementDuCreneau,
  peutPlacer,
  prixAchat,
  rejouerGabarit,
  saturationPiece,
  valeurCargaison,
  dureeTrajet,
  type Evenement,
  type Marche,
  type Piece,
} from "./eco.ts";

export interface Trajet {
  de: VilleId;
  vers: VilleId;
  depart: number;
  arrivee: number;
}

export interface Colis extends Piece {
  paye: number; // prix payé, remboursé à l'identique si on le repose
}

export interface Caravane {
  nom: string;
  ville: VilleId; // ville actuelle, ou destination si en route
  trajet: Trajet | null;
  cargaison: Colis[];
  cout: number; // prix d'achat de la cargaison actuelle
  aVendre: boolean; // arrivée, cargaison pas encore écoulée
  caravanier: boolean;
  auto: boolean; // le caravanier fait la navette tout seul
  gabarits: Record<string, Piece[]>; // "départ>arrivée" → dernier rangement fait à la main pour ce trajet
}

export interface Etat {
  version: 1;
  savedAt: number;
  ecus: number;
  gainsCumules: number;
  villes: VilleId[];
  caravanes: Caravane[];
  charrette: number;
  attelage: number;
  titre: boolean;
  stats: { voyages: number; marchandages: number; meilleureMarge: number };
  // "ville:bien" → saturation au moment t (elle décroît ensuite)
  saturation: Record<string, { v: number; t: number }>;
  // nouvelle du créneau, figée une fois tirée (ouvrir une ville ne la change pas)
  nouvelle: { creneau: number; evenement: Evenement | null } | null;
  reputation: number;
  competences: CompetenceId[];
}

const STORAGE_KEY = "les-caravanes:v1";

export const NOMS_CARAVANES = ["La Téméraire", "La Vagabonde", "L'Intrépide", "La Flâneuse", "La Dorée", "La Royale"];

function nouvelleCaravane(index: number): Caravane {
  return {
    nom: NOMS_CARAVANES[index] ?? `Caravane ${index + 1}`,
    ville: "portvent",
    trajet: null,
    cargaison: [],
    cout: 0,
    aVendre: false,
    caravanier: false,
    auto: false,
    gabarits: {},
  };
}

export function nouvelEtat(now: number): Etat {
  return {
    version: 1,
    savedAt: now,
    ecus: ECUS_DEPART,
    gainsCumules: 0,
    villes: VILLES.filter((v) => v.deblocage === 0).map((v) => v.id),
    caravanes: [nouvelleCaravane(0)],
    charrette: 0,
    attelage: 0,
    titre: false,
    stats: { voyages: 0, marchandages: 0, meilleureMarge: 0 },
    saturation: {},
    nouvelle: null,
    reputation: 0,
    competences: [],
  };
}

// ---- valeurs dérivées ----

export function grille(s: Etat): { l: number; h: number } {
  const c = CHARRETTES[s.charrette];
  return { l: c.l, h: c.h + (sait(s, "double-fond") ? 1 : 0) };
}

export function aQuai(c: Caravane): boolean {
  return c.trajet === null;
}

export function enChargement(c: Caravane): boolean {
  return c.trajet === null && !c.aVendre;
}

export function prochaineVille(s: Etat) {
  return VILLES.find((v) => !s.villes.includes(v.id)) ?? null;
}

export function prixCaravane(s: Etat): number | null {
  if (s.caravanes.length === PRIX_CARAVANES.length && sait(s, "flotte-royale")) return PRIX_FLOTTE_ROYALE;
  return PRIX_CARAVANES[s.caravanes.length] ?? null;
}

// ---- compétences ----

export function sait(s: Etat, id: CompetenceId): boolean {
  return s.competences.includes(id);
}

// Réputation totale qu'il faut pour atteindre le niveau n.
export function seuilNiveau(n: number): number {
  return (REPUTATION_PREMIER * (REPUTATION_RAISON ** n - 1)) / (REPUTATION_RAISON - 1);
}

export function niveau(reputation: number): number {
  let n = 0;
  while (n < COMPETENCES.length && seuilNiveau(n + 1) <= reputation) n++;
  return n;
}

export function pointsLibres(s: Etat): number {
  return niveau(s.reputation) - s.competences.length;
}

// La compétence d'avant dans la même branche (null pour la première).
export function prerequis(id: CompetenceId): CompetenceId | null {
  const def = COMPETENCE_PAR_ID[id];
  const branche = COMPETENCES.filter((c) => c.branche === def.branche);
  const k = branche.indexOf(def);
  return k > 0 ? branche[k - 1].id : null;
}

export function peutApprendre(s: Etat, id: CompetenceId): boolean {
  const avant = prerequis(id);
  return !sait(s, id) && pointsLibres(s) > 0 && (avant === null || sait(s, avant));
}

export function apprendre(s: Etat, id: CompetenceId): boolean {
  if (!peutApprendre(s, id)) return false;
  s.competences.push(id);
  return true;
}

export function talents(s: Etat): Talents {
  return {
    patience: sait(s, "beau-parleur") ? 1 : 0,
    marge: sait(s, "bonne-reputation") ? BONUS_REPUTATION_MARCHAND : 0,
    charmeur: sait(s, "charmeur"),
    oeil: sait(s, "oeil"),
  };
}

// Raccourcis cumulés des compétences de routes pour ce trajet.
export function multDuree(s: Etat, a: VilleId, b: VilleId): number {
  let m = 1;
  if (sait(s, "raccourcis")) m *= 0.9;
  if (sait(s, "relais")) m *= 0.85;
  if (sait(s, "grand-voyageur") && Math.max(VILLE_PAR_ID[a].palier, VILLE_PAR_ID[b].palier) >= 4) m *= 0.8;
  return m;
}

export function duree(s: Etat, a: VilleId, b: VilleId): number {
  return dureeTrajet(a, b, s.attelage, multDuree(s, a, b));
}

export function prixCaravanier(s: Etat): number | null {
  const n = s.caravanes.filter((c) => c.caravanier).length;
  return PRIX_CARAVANIERS[n] ?? null;
}

// ---- marché ----

export function saturationA(s: Etat, ville: VilleId, bien: BienId, t: number): number {
  const e = s.saturation[`${ville}:${bien}`];
  if (!e) return 0;
  return e.v * 0.5 ** (Math.max(0, t - e.t) / DEMI_VIE_SATURATION);
}

function saturer(s: Etat, ville: VilleId, pieces: Piece[], t: number): void {
  for (const p of pieces) {
    const v = Math.min(SATURATION_MAX, saturationA(s, ville, p.bien, t) + saturationPiece(p.bien, marche(s, t)));
    s.saturation[`${ville}:${p.bien}`] = { v, t };
  }
  // on oublie ce qui s'est résorbé, pour ne pas faire grossir la sauvegarde
  for (const [k, e] of Object.entries(s.saturation))
    if (e.v * 0.5 ** (Math.max(0, t - e.t) / DEMI_VIE_SATURATION) < 0.005) delete s.saturation[k];
}

export function creneauA(t: number): number {
  return Math.floor(t / DUREE_CRENEAU);
}

export function evenementA(s: Etat, t: number): Evenement | null {
  const creneau = creneauA(t);
  if (s.nouvelle?.creneau !== creneau) s.nouvelle = { creneau, evenement: evenementDuCreneau(creneau, s.villes) };
  return s.nouvelle.evenement;
}

export function marche(s: Etat, t: number): Marche {
  return {
    evenement: evenementA(s, t),
    saturation: (v, b) => saturationA(s, v, b, t),
    remiseAchat: sait(s, "achat-en-gros") ? REMISE_EN_GROS : 1,
    amplifEvenement: sait(s, "informateurs") ? AMPLIF_INFORMATEURS : 1,
    facteurSaturation: sait(s, "marches-profonds") ? FACTEUR_MARCHES_PROFONDS : 1,
  };
}

// ---- temps ----

function gagner(s: Etat, montant: number): void {
  s.ecus += montant;
  s.gainsCumules += Math.max(0, montant);
}

function payerChargement(s: Etat, c: Caravane, pieces: Piece[], ville: VilleId, t: number): void {
  for (const p of pieces) {
    const paye = prixAchat(ville, p.bien, t, marche(s, t))!;
    s.ecus -= paye;
    c.cargaison.push({ ...p, paye });
    c.cout += paye;
  }
}

function lancer(s: Etat, c: Caravane, vers: VilleId, t: number): void {
  c.trajet = { de: c.ville, vers, depart: t, arrivee: t + duree(s, c.ville, vers) };
  c.ville = vers;
}

export interface Bilan {
  gain: number; // ventes faites par les caravaniers
  voyages: number;
}

// Fait arriver les caravanes dont le trajet est fini. Celles qui ont un
// caravanier en service vendent au prix affiché, rechargent (le dernier
// rangement fait à la main dans cette ville, sinon un chargement auto) et
// repartent d'où elles viennent — autant de fois que le temps écoulé le permet.
export function avancer(s: Etat, now: number): Bilan {
  const bilan: Bilan = { gain: 0, voyages: 0 };
  // ordre chronologique des arrivées, pour que l'argent circule juste
  for (;;) {
    let c: Caravane | null = null;
    for (const k of s.caravanes)
      if (k.trajet && k.trajet.arrivee <= now && (!c || k.trajet.arrivee < c.trajet!.arrivee)) c = k;
    if (!c) break;
    const { de, arrivee: t } = c.trajet!;
    c.trajet = null;
    s.stats.voyages++;
    if (!(c.caravanier && c.auto)) {
      c.aVendre = c.cargaison.length > 0;
      if (!c.aVendre) c.cout = 0;
      continue;
    }
    const m = marche(s, t);
    const vente = valeurCargaison(c.cargaison, c.ville, t, m) * (sait(s, "maitre-negociant") ? BONUS_MAITRE_NEGOCIANT : 1);
    saturer(s, c.ville, c.cargaison, t);
    s.reputation += Math.max(0, vente - c.cout) * REPUTATION_AUTO;
    gagner(s, vente);
    bilan.gain += vente;
    bilan.voyages++;
    c.cargaison = [];
    c.cout = 0;
    const { l, h } = grille(s);
    const gabarit = c.gabarits[`${c.ville}>${de}`];
    let pieces = gabarit
      ? rejouerGabarit(gabarit, l, h, c.ville, t, s.ecus, m)
      : chargementAuto(l, h, c.ville, de, t, s.ecus, [], m);
    if (gabarit && sait(s, "contremaitre")) {
      const cout = pieces.reduce((k, p) => k + prixAchat(c!.ville, p.bien, t, m)!, 0);
      pieces = chargementAuto(l, h, c.ville, de, t, s.ecus - cout, pieces, m);
    }
    payerChargement(s, c, pieces, c.ville, t);
    lancer(s, c, de, t);
  }
  return bilan;
}

// ---- chargement ----

export function poser(s: Etat, i: number, p: Piece, now: number): boolean {
  const c = s.caravanes[i];
  if (!enChargement(c)) return false;
  const prix = prixAchat(c.ville, p.bien, now, marche(s, now));
  const { l, h } = grille(s);
  if (prix === null || prix > s.ecus || !peutPlacer(l, h, c.cargaison, p)) return false;
  payerChargement(s, c, [p], c.ville, now);
  return true;
}

// Repose une pièce à l'étal (remboursée au prix payé). Renvoie la pièce.
export function reprendre(s: Etat, i: number, index: number): Piece | null {
  const c = s.caravanes[i];
  if (!enChargement(c) || !c.cargaison[index]) return null;
  const [colis] = c.cargaison.splice(index, 1);
  s.ecus += colis.paye;
  c.cout -= colis.paye;
  if (c.cargaison.length === 0) c.cout = 0; // pas de poussière d'arrondi
  return { bien: colis.bien, rot: colis.rot, x: colis.x, y: colis.y };
}

export function vider(s: Etat, i: number): void {
  const c = s.caravanes[i];
  if (!enChargement(c)) return;
  while (c.cargaison.length) reprendre(s, i, c.cargaison.length - 1);
}

export function remplirAuto(s: Etat, i: number, vers: VilleId, now: number): number {
  const c = s.caravanes[i];
  if (!enChargement(c)) return 0;
  const { l, h } = grille(s);
  const avant = c.cargaison.length;
  const pieces = chargementAuto(l, h, c.ville, vers, now, s.ecus, c.cargaison, marche(s, now)).slice(avant);
  payerChargement(s, c, pieces, c.ville, now);
  return pieces.length;
}

// `confier` : le caravanier (s'il y en a un) reprend la navette sur ce trajet.
export function partir(s: Etat, i: number, vers: VilleId, now: number, confier?: boolean): boolean {
  const c = s.caravanes[i];
  if (!enChargement(c) || vers === c.ville || !s.villes.includes(vers)) return false;
  if (c.cargaison.length > 0)
    c.gabarits[`${c.ville}>${vers}`] = c.cargaison.map(({ bien, rot, x, y }) => ({ bien, rot, x, y }));
  if (c.caravanier && confier !== undefined) c.auto = confier;
  lancer(s, c, vers, now);
  return true;
}

// ---- vente ----

// Écoule la cargaison pour `montant` écus (ce qui sature le marché local).
// `marge` : ce que le marchandage a obtenu, qui bonifie la réputation.
// Renvoie le bénéfice du voyage.
export function encaisser(s: Etat, i: number, montant: number, now: number, marge = 0): number {
  const c = s.caravanes[i];
  if (!c.aVendre) return 0;
  const benefice = montant - c.cout;
  saturer(s, c.ville, c.cargaison, now);
  s.reputation += Math.max(0, benefice) * (1 + REPUTATION_MARCHANDAGE * Math.max(0, marge));
  gagner(s, montant);
  c.cargaison = [];
  c.cout = 0;
  c.aVendre = false;
  return benefice;
}

export function valeurAffichee(s: Etat, i: number, now: number): number {
  const c = s.caravanes[i];
  return valeurCargaison(c.cargaison, c.ville, now, marche(s, now));
}

export function noterMarchandage(s: Etat, marge: number): void {
  s.stats.marchandages++;
  s.stats.meilleureMarge = Math.max(s.stats.meilleureMarge, marge);
}

// ---- achats ----

function payer(s: Etat, prix: number | null): boolean {
  if (prix === null || prix > s.ecus) return false;
  s.ecus -= prix;
  return true;
}

export function debloquerVille(s: Etat): boolean {
  const v = prochaineVille(s);
  if (!v || !payer(s, v.deblocage)) return false;
  s.villes.push(v.id);
  return true;
}

export function ameliorerCharrette(s: Etat): boolean {
  const suivante = CHARRETTES[s.charrette + 1];
  if (!suivante || !payer(s, suivante.prix)) return false;
  s.charrette++;
  return true;
}

export function ameliorerAttelage(s: Etat): boolean {
  const suivant = ATTELAGES[s.attelage + 1];
  if (!suivant || !payer(s, suivant.prix)) return false;
  s.attelage++;
  return true;
}

export function acheterCaravane(s: Etat): boolean {
  if (!payer(s, prixCaravane(s))) return false;
  s.caravanes.push(nouvelleCaravane(s.caravanes.length));
  return true;
}

export function embaucherCaravanier(s: Etat, i: number): boolean {
  const c = s.caravanes[i];
  if (!c || c.caravanier || !payer(s, prixCaravanier(s))) return false;
  c.caravanier = true;
  c.auto = true;
  return true;
}

export function basculerAuto(s: Etat, i: number): void {
  const c = s.caravanes[i];
  if (c.caravanier) c.auto = !c.auto;
}

export function acheterTitre(s: Etat): boolean {
  if (s.titre || !payer(s, PRIX_TITRE_ROYAL)) return false;
  s.titre = true;
  return true;
}

// ---- sauvegarde ----

export function charger(now: number): Etat {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Etat;
      if (s.version === 1) return { ...nouvelEtat(now), ...s };
    }
  } catch {
    // stockage indisponible ou sauvegarde illisible : on repart de zéro
  }
  return nouvelEtat(now);
}

export function sauver(s: Etat, now: number): void {
  s.savedAt = now;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // navigation privée ou quota plein : le jeu reste jouable sans sauvegarde
  }
}
