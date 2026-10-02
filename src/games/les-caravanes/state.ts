// Les Caravanes — état de la partie, écoulement du temps, actions du joueur et
// sauvegarde. Le temps est réel : `avancer` sert au tick de chaque image comme
// au retour après une nuit d'absence (les caravaniers enchaînent les allers-
// retours pendant ce temps-là).

import {
  AMPLIF_INFORMATEURS,
  ATTELAGES,
  ATTENTE_CARAVANIER,
  BIEN_PAR_ID,
  ENTREPOTS,
  MULT_MAITRE_ARTISAN,
  PRIX_EMPLACEMENTS,
  PRIX_QG,
  RECETTE_PAR_PRODUIT,
  VILLE_AVANT_QG,
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
  type Lieu,
  type RecetteDef,
  type VilleId,
} from "./data.ts";
import type { Talents } from "./marchandage.ts";
import {
  chargementAuto,
  chargementStock,
  infoLieu,
  rejouerGabaritStock,
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
  type Quota,
} from "./eco.ts";

export interface Trajet {
  de: Lieu;
  vers: Lieu;
  depart: number;
  arrivee: number;
}

export interface Colis extends Piece {
  paye: number; // prix payé, remboursé à l'identique si on le repose
}

export interface Caravane {
  nom: string;
  ville: Lieu; // lieu actuel, ou destination si en route
  trajet: Trajet | null;
  cargaison: Colis[];
  cout: number; // prix d'achat de la cargaison actuelle
  aVendre: boolean; // arrivée, cargaison pas encore écoulée
  caravanier: boolean;
  auto: boolean; // le caravanier fait la navette tout seul
  gabarits: Record<string, Piece[]>; // "départ>arrivée" → dernier rangement fait à la main pour ce trajet
  // navette avec le QG : le caravanier qui n'a rien à livrer attend à quai
  // et réessaie à `attente`, pour repartir vers `navette`
  attente?: number | null;
  navette?: Lieu | null;
}

export interface Fabrication {
  recette: BienId; // le produit
  debut: number;
  fin: number;
  cout: number; // coût des ingrédients consommés
}

export interface Stock {
  n: number; // pièces
  cout: number; // coût total des n pièces (le coût moyen suit les dépôts)
}

export interface EtatQG {
  entrepot: number; // niveau dans ENTREPOTS
  stock: Partial<Record<BienId, Stock>>;
  emplacements: (Fabrication | null)[];
  appro: Partial<Record<BienId, number>>; // bien coché → stock visé (pièces)
  ecoulement: Partial<Record<BienId, number>>; // bien coché → stock gardé (pièces)
  pretes: number; // fabrications finies que le joueur n'a pas encore vues
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
  qg: EtatQG | null;
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
    qg: null,
  };
}

// ---- valeurs dérivées ----

export function grille(s: Etat): { l: number; h: number } {
  const c = CHARRETTES[s.charrette];
  return { l: c.l, h: c.h + (sait(s, "double-fond") ? 1 : 0) };
}

export function lieuOuvert(s: Etat, l: Lieu): boolean {
  return l === "qg" ? s.qg !== null : s.villes.includes(l);
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
  if (COMPETENCE_PAR_ID[id].branche === "qg" && !s.qg) return false;
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
export function multDuree(s: Etat, a: Lieu, b: Lieu): number {
  let m = 1;
  if (sait(s, "raccourcis")) m *= 0.9;
  if (sait(s, "relais")) m *= 0.85;
  if (sait(s, "grand-voyageur") && Math.max(infoLieu(a).palier, infoLieu(b).palier) >= 4) m *= 0.8;
  return m;
}

export function duree(s: Etat, a: Lieu, b: Lieu): number {
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

// ---- QG : entrepôt ----

export function stockN(qg: EtatQG, bien: BienId): number {
  return qg.stock[bien]?.n ?? 0;
}

export function coutMoyen(qg: EtatQG, bien: BienId): number {
  const e = qg.stock[bien];
  return e && e.n > 0 ? e.cout / e.n : 0;
}

function cases(bien: BienId): number {
  return BIEN_PAR_ID[bien].forme.length;
}

export function capaciteQG(qg: EtatQG): number {
  return ENTREPOTS[qg.entrepot].cases;
}

// Cases prises : le stock, plus la place réservée aux produits en fabrication.
export function casesQG(qg: EtatQG): number {
  let n = 0;
  for (const [bien, e] of Object.entries(qg.stock)) n += e!.n * cases(bien as BienId);
  for (const f of qg.emplacements) if (f) n += cases(f.recette);
  return n;
}

function ajouterStock(qg: EtatQG, bien: BienId, n: number, cout: number): void {
  const e = qg.stock[bien] ?? { n: 0, cout: 0 };
  e.n += n;
  e.cout += cout;
  qg.stock[bien] = e;
}

// Retire n pièces au coût moyen et renvoie ce coût.
function retirerStock(qg: EtatQG, bien: BienId, n: number): number {
  const e = qg.stock[bien]!;
  const cout = n >= e.n ? e.cout : (e.cout / e.n) * n;
  e.n -= n;
  e.cout -= cout;
  if (e.n <= 0) delete qg.stock[bien];
  return cout;
}

// Décharge la cargaison dans l'entrepôt, les pièces les plus chères d'abord,
// tant qu'il y a de la place. Ce qui ne rentre pas reste dans la charrette.
function decharger(s: Etat, c: Caravane): number {
  const qg = s.qg!;
  let libre = capaciteQG(qg) - casesQG(qg);
  const tri = [...c.cargaison].sort((a, b) => BIEN_PAR_ID[b.bien].base - BIEN_PAR_ID[a.bien].base);
  const reste = new Set<Colis>();
  for (const colis of tri) {
    if (cases(colis.bien) > libre) {
      reste.add(colis);
      continue;
    }
    libre -= cases(colis.bien);
    ajouterStock(qg, colis.bien, 1, colis.paye);
  }
  const n = c.cargaison.length - reste.size;
  c.cargaison = c.cargaison.filter((p) => reste.has(p));
  c.cout = c.cargaison.reduce((k, p) => k + p.paye, 0);
  return n;
}

// Le joueur décharge une caravane arrivée au QG. Renvoie les pièces déposées.
// Ce qui n'a pas trouvé place reste chargé, prêt à repartir.
export function deposer(s: Etat, i: number): number {
  const c = s.caravanes[i];
  if (!c.aVendre || c.ville !== "qg" || !s.qg) return 0;
  const n = decharger(s, c);
  c.aVendre = false;
  return n;
}

// Pièces que les caravaniers peuvent encore apporter (jusqu'au stock visé),
// éventuellement limitées à ce que produit une ville.
export function quotaAppro(s: Etat, ville?: VilleId): Quota {
  const q: Quota = {};
  if (!s.qg) return q;
  for (const [bien, vise] of Object.entries(s.qg.appro) as [BienId, number][]) {
    if (ville && !VILLE_PAR_ID[ville].produit.includes(bien)) continue;
    const n = vise - stockN(s.qg, bien);
    if (n > 0) q[bien] = n;
  }
  return q;
}

// Pièces que les caravaniers peuvent emporter (au-delà du stock gardé).
export function quotaEcoulement(s: Etat): Quota {
  const q: Quota = {};
  if (!s.qg) return q;
  for (const [bien, garde] of Object.entries(s.qg.ecoulement) as [BienId, number][]) {
    const n = stockN(s.qg, bien) - garde;
    if (n > 0) q[bien] = n;
  }
  return q;
}

function vide(q: Quota): boolean {
  return Object.values(q).every((n) => !n);
}

// ---- QG : fabrication ----

// Une recette apparaît quand les villes de tous ses ingrédients sont ouvertes.
export function recetteVisible(s: Etat, r: RecetteDef): boolean {
  return r.ingredients.every(([b]) => s.villes.some((v) => VILLE_PAR_ID[v].produit.includes(b)));
}

export function peutFabriquer(s: Etat, r: RecetteDef): boolean {
  return !!s.qg && r.ingredients.every(([b, n]) => stockN(s.qg!, b) >= n);
}

export function dureeFabrication(s: Etat, r: RecetteDef): number {
  return r.duree * (sait(s, "maitre-artisan") ? MULT_MAITRE_ARTISAN : 1);
}

// Lance une fabrication dans l'emplacement k (libre), ingrédients pris au stock.
export function fabriquer(s: Etat, k: number, produit: BienId, now: number): boolean {
  const qg = s.qg;
  const r = RECETTE_PAR_PRODUIT[produit];
  if (!qg || !r || k >= qg.emplacements.length || qg.emplacements[k] || !peutFabriquer(s, r)) return false;
  let cout = 0;
  for (const [b, n] of r.ingredients) cout += retirerStock(qg, b, n);
  qg.emplacements[k] = { recette: produit, debut: now, fin: now + dureeFabrication(s, r), cout };
  return true;
}

function finirFabrication(s: Etat, k: number, bilan: Bilan): void {
  const qg = s.qg!;
  const f = qg.emplacements[k]!;
  qg.emplacements[k] = null;
  ajouterStock(qg, f.recette, 1, f.cout);
  qg.pretes++;
  bilan.fabrications++;
  if (sait(s, "compagnon")) fabriquer(s, k, f.recette, f.fin);
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

function lancer(s: Etat, c: Caravane, vers: Lieu, t: number): void {
  c.trajet = { de: c.ville, vers, depart: t, arrivee: t + duree(s, c.ville, vers) };
  c.ville = vers;
  c.attente = null;
  c.navette = null;
}

export interface Bilan {
  gain: number; // ventes faites par les caravaniers
  voyages: number;
  fabrications: number;
  depots: number; // pièces déposées au QG par les caravaniers
}

// Le caravanier conduit-il ce trajet ? Avec le QG, il lui faut l'Intendant.
function enService(s: Etat, c: Caravane, a: Lieu, b: Lieu): boolean {
  return c.caravanier && c.auto && ((a !== "qg" && b !== "qg") || (s.qg !== null && sait(s, "intendant")));
}

// Prend des pièces au stock du QG et les charge (au coût moyen).
function chargerDepuisStock(s: Etat, c: Caravane, pieces: Piece[]): void {
  for (const p of pieces) {
    const paye = retirerStock(s.qg!, p.bien, 1);
    c.cargaison.push({ ...p, paye });
    c.cout += paye;
  }
}

// Le caravanier recharge là où il est et repart vers `c.navette` — ou attend,
// s'il n'aurait rien à transporter ni à l'aller ni au retour.
function repartir(s: Etat, c: Caravane, t: number): void {
  const vers = c.navette!;
  const { l, h } = grille(s);
  const m = marche(s, t);
  if (c.ville === "qg") {
    const ville = vers as VilleId;
    const quota = quotaEcoulement(s);
    const deja: Piece[] = c.cargaison.map(({ bien, rot, x, y }) => ({ bien, rot, x, y }));
    const gabarit = c.gabarits[`qg>${ville}`];
    let pieces = gabarit ? rejouerGabaritStock(gabarit, l, h, quota, deja) : chargementStock(l, h, quota, ville, t, deja, m);
    if (gabarit && sait(s, "contremaitre")) pieces = chargementStock(l, h, quota, ville, t, pieces, m);
    chargerDepuisStock(s, c, pieces.slice(deja.length));
    if (c.cargaison.length === 0 && vide(quotaAppro(s, ville))) return attendre(c, vers, t);
  } else {
    const ville = c.ville;
    const quota = vers === "qg" ? quotaAppro(s, ville) : undefined;
    const gabarit = c.gabarits[`${ville}>${vers}`];
    let pieces = gabarit
      ? rejouerGabarit(gabarit, l, h, ville, t, s.ecus, m, quota)
      : chargementAuto(l, h, ville, vers, t, s.ecus, [], m, quota);
    if (gabarit && sait(s, "contremaitre")) {
      const cout = pieces.reduce((k, p) => k + prixAchat(ville, p.bien, t, m)!, 0);
      pieces = chargementAuto(l, h, ville, vers, t, s.ecus - cout, pieces, m, quota);
    }
    payerChargement(s, c, pieces, ville, t);
    if (vers === "qg" && c.cargaison.length === 0 && vide(quotaEcoulement(s))) return attendre(c, vers, t);
  }
  lancer(s, c, vers, t);
}

function attendre(c: Caravane, vers: Lieu, t: number): void {
  c.navette = vers;
  c.attente = t + ATTENTE_CARAVANIER;
}

function arriver(s: Etat, c: Caravane, bilan: Bilan): void {
  const { de, arrivee: t } = c.trajet!;
  c.trajet = null;
  s.stats.voyages++;
  if (!enService(s, c, de, c.ville)) {
    c.aVendre = c.cargaison.length > 0;
    if (!c.aVendre) c.cout = 0;
    return;
  }
  bilan.voyages++;
  if (c.ville === "qg") {
    bilan.depots += decharger(s, c);
  } else {
    const m = marche(s, t);
    const vente = valeurCargaison(c.cargaison, c.ville, t, m) * (sait(s, "maitre-negociant") ? BONUS_MAITRE_NEGOCIANT : 1);
    saturer(s, c.ville, c.cargaison, t);
    s.reputation += Math.max(0, vente - c.cout) * REPUTATION_AUTO;
    gagner(s, vente);
    bilan.gain += vente;
    c.cargaison = [];
    c.cout = 0;
  }
  c.navette = de;
  repartir(s, c, t);
}

// Fait arriver les caravanes dont le trajet est fini et finir les
// fabrications, dans l'ordre chronologique pour que l'argent et le stock
// circulent juste. Les caravanes qui ont un caravanier en service vendent (ou
// déposent au QG), rechargent (le dernier rangement fait à la main sur ce
// trajet, sinon un chargement auto) et repartent d'où elles viennent — autant
// de fois que le temps écoulé le permet.
export function avancer(s: Etat, now: number): Bilan {
  const bilan: Bilan = { gain: 0, voyages: 0, fabrications: 0, depots: 0 };
  for (;;) {
    let t = Infinity;
    let suite: (() => void) | null = null;
    s.qg?.emplacements.forEach((f, k) => {
      if (f && f.fin <= now && f.fin < t) {
        t = f.fin;
        suite = () => finirFabrication(s, k, bilan);
      }
    });
    for (const c of s.caravanes) {
      if (c.trajet) {
        if (c.trajet.arrivee <= now && c.trajet.arrivee < t) {
          t = c.trajet.arrivee;
          suite = () => arriver(s, c, bilan);
        }
      } else if (c.attente != null && c.attente <= now && c.attente < t) {
        const quand = c.attente;
        t = quand;
        suite = () => {
          c.attente = null;
          if (c.navette && enService(s, c, c.ville, c.navette)) repartir(s, c, quand);
          else c.navette = null;
        };
      }
    }
    if (!suite) break;
    (suite as () => void)();
  }
  return bilan;
}

// ---- chargement ----

export function poser(s: Etat, i: number, p: Piece, now: number): boolean {
  const c = s.caravanes[i];
  if (!enChargement(c)) return false;
  const { l, h } = grille(s);
  if (c.ville === "qg") {
    if (!s.qg || stockN(s.qg, p.bien) <= 0 || !peutPlacer(l, h, c.cargaison, p)) return false;
    chargerDepuisStock(s, c, [p]);
    return true;
  }
  const prix = prixAchat(c.ville, p.bien, now, marche(s, now));
  if (prix === null || prix > s.ecus || !peutPlacer(l, h, c.cargaison, p)) return false;
  payerChargement(s, c, [p], c.ville, now);
  return true;
}

// Repose une pièce à l'étal (remboursée au prix payé) ou, au QG, dans
// l'entrepôt (s'il a la place). Renvoie la pièce.
export function reprendre(s: Etat, i: number, index: number): Piece | null {
  const c = s.caravanes[i];
  const colis = c.cargaison[index];
  if (!enChargement(c) || !colis) return null;
  if (c.ville === "qg") {
    if (casesQG(s.qg!) + cases(colis.bien) > capaciteQG(s.qg!)) return null;
    ajouterStock(s.qg!, colis.bien, 1, colis.paye);
  } else s.ecus += colis.paye;
  c.cargaison.splice(index, 1);
  c.cout -= colis.paye;
  if (c.cargaison.length === 0) c.cout = 0; // pas de poussière d'arrondi
  return { bien: colis.bien, rot: colis.rot, x: colis.x, y: colis.y };
}

export function vider(s: Etat, i: number): void {
  const c = s.caravanes[i];
  if (!enChargement(c)) return;
  while (c.cargaison.length && reprendre(s, i, c.cargaison.length - 1));
}

export function remplirAuto(s: Etat, i: number, vers: Lieu, now: number): number {
  const c = s.caravanes[i];
  if (!enChargement(c)) return 0;
  const { l, h } = grille(s);
  const avant = c.cargaison.length;
  if (c.ville === "qg") {
    if (vers === "qg") return 0;
    const quota: Quota = {};
    for (const [b, e] of Object.entries(s.qg!.stock)) quota[b as BienId] = e!.n;
    const pieces = chargementStock(l, h, quota, vers, now, c.cargaison, marche(s, now)).slice(avant);
    chargerDepuisStock(s, c, pieces);
    return pieces.length;
  }
  const pieces = chargementAuto(l, h, c.ville, vers, now, s.ecus, c.cargaison, marche(s, now)).slice(avant);
  payerChargement(s, c, pieces, c.ville, now);
  return pieces.length;
}

// `confier` : le caravanier (s'il y en a un) reprend la navette sur ce trajet.
export function partir(s: Etat, i: number, vers: Lieu, now: number, confier?: boolean): boolean {
  const c = s.caravanes[i];
  if (!enChargement(c) || vers === c.ville || !lieuOuvert(s, vers)) return false;
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
  if (!c.aVendre || c.ville === "qg") return 0;
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
  if (c.ville === "qg") return 0;
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

export function qgAchetable(s: Etat): boolean {
  return !s.qg && s.villes.includes(VILLE_AVANT_QG);
}

export function acheterQG(s: Etat): boolean {
  if (!qgAchetable(s) || !payer(s, PRIX_QG)) return false;
  s.qg = { entrepot: 0, stock: {}, emplacements: [null], appro: {}, ecoulement: {}, pretes: 0 };
  return true;
}

export function ameliorerEntrepot(s: Etat): boolean {
  const suivant = s.qg ? ENTREPOTS[s.qg.entrepot + 1] : undefined;
  if (!suivant || !payer(s, suivant.prix)) return false;
  s.qg!.entrepot++;
  return true;
}

export function prixEmplacement(s: Etat): number | null {
  return s.qg ? (PRIX_EMPLACEMENTS[s.qg.emplacements.length] ?? null) : null;
}

export function acheterEmplacement(s: Etat): boolean {
  if (!payer(s, prixEmplacement(s))) return false;
  s.qg!.emplacements.push(null);
  return true;
}

// Coche (avec une quantité) ou décoche (null) un bien dans une des listes des caravaniers.
export function regler(s: Etat, liste: "appro" | "ecoulement", bien: BienId, n: number | null): void {
  if (!s.qg) return;
  if (n === null) delete s.qg[liste][bien];
  else s.qg[liste][bien] = Math.max(0, Math.floor(n));
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
