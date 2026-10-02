// Cité Petit Prince — état de la tour, écoulement du temps et actions du
// joueur. Tout est pur (hormis charger/sauver) et piloté par l'heure réelle :
// `avancer` sert au tick de chaque image comme au retour après une absence.

import {
  ARRIVEE_MS,
  BONUS_COMPETENCE,
  BONUS_REVE,
  CATEGORIES,
  CHANCE_TICKET_ASCENSEUR,
  CHEVEUX,
  COMMERCES,
  COMMERCE_PAR_ID,
  DEBLOCAGE_RANG,
  EMPLOYES_MAX,
  PEAUX,
  PLACES_APPART,
  POSTS_AMBIANCE,
  POSTS_EMBAUCHE,
  POSTS_EMMENAGE,
  POSTS_OUVERTURE,
  POSTS_REVE,
  POSTS_RUPTURE,
  PRENOMS,
  TENUES,
  TICKET_CHANTIER_MS,
  VISITEURS_MAX,
  VISITEUR_MS,
  coutEtage,
  dureeChantier,
  type CategorieId,
  type CommerceDef,
  type ProduitDef,
} from "./data.ts";

export type Rng = () => number;

export interface Habitant {
  id: number;
  prenom: string;
  initiale: string;
  genre: "f" | "m";
  peau: number;
  cheveux: number;
  tenue: number;
  competences: Record<CategorieId, number>;
  reve: string; // id de commerce
  logement: number; // index d'étage
  travail: number | null; // index d'étage
  reveFete: boolean; // ticket du métier de rêve déjà versé
}

export interface ProduitEtat {
  etat: "vide" | "livraison" | "vente";
  fin: number; // fin de livraison
  debut: number; // début de la vente
  vendus: number;
}

export interface Etage {
  type: string; // "appartement" ou id de commerce
  chantierFin: number | null;
  produits: ProduitEtat[]; // vide pour un appartement
  gerant?: boolean; // recommande tout seul les stocks épuisés
}

export interface Post {
  auteur: string;
  texte: string;
  at: number;
}

export interface Etat {
  version: 1;
  savedAt: number;
  argent: number;
  tickets: number;
  etages: Etage[]; // index 0 = 1er étage (le hall n'en fait pas partie)
  habitants: Habitant[];
  nextId: number;
  prochaineArrivee: number | null;
  visiteurs: number[]; // index d'étage visé, dans l'ordre d'arrivée
  prochainVisiteur: number;
  fil: Post[];
  filNonLus: number;
  prochainPost: number;
}

const STORAGE_KEY = "cite-petit-prince:v1";
const FIL_MAX = 80;

const pick = <T>(arr: T[], rng: Rng): T => arr[Math.floor(rng() * arr.length)];

// ---- création ----

function produitsVides(type: string): ProduitEtat[] {
  if (type === "appartement") return [];
  return COMMERCE_PAR_ID[type].produits.map(() => ({ etat: "vide", fin: 0, debut: 0, vendus: 0 }));
}

export function nouvelHabitant(s: Etat, logement: number, rng: Rng): Habitant {
  const [prenom, genre] = pick(PRENOMS, rng);
  const competences = Object.fromEntries(
    CATEGORIES.map((c) => [c.id, Math.floor(rng() * 10)])
  ) as Record<CategorieId, number>;
  const h: Habitant = {
    id: s.nextId++,
    prenom,
    initiale: String.fromCharCode(65 + Math.floor(rng() * 26)),
    genre,
    peau: Math.floor(rng() * PEAUX.length),
    cheveux: Math.floor(rng() * CHEVEUX.length),
    tenue: Math.floor(rng() * TENUES.length),
    competences,
    reve: pick(COMMERCES, rng).id,
    logement,
    travail: null,
    reveFete: false,
  };
  s.habitants.push(h);
  return h;
}

export function nouvelEtat(now: number, rng: Rng = Math.random): Etat {
  const s: Etat = {
    version: 1,
    savedAt: now,
    argent: 1500,
    tickets: 3,
    etages: [
      { type: "appartement", chantierFin: null, produits: [] },
      { type: "snack", chantierFin: null, produits: produitsVides("snack") },
    ],
    habitants: [],
    nextId: 1,
    prochaineArrivee: now + ARRIVEE_MS,
    visiteurs: [],
    prochainVisiteur: now + VISITEUR_MS / 2,
    fil: [],
    filNonLus: 0,
    prochainPost: now + 30_000,
  };
  nouvelHabitant(s, 0, rng);
  nouvelHabitant(s, 0, rng);
  poster(s, s.habitants[0], "Bienvenue à la Cité Petit Prince ! Le Snack du 2e cherche du monde 👀", now);
  return s;
}

// ---- valeurs dérivées ----

export const nomHabitant = (h: Habitant) => `${h.prenom} ${h.initiale}.`;

export function estConstruit(e: Etage): boolean {
  return e.chantierFin === null;
}

export function commerceDe(e: Etage): CommerceDef | null {
  return e.type === "appartement" ? null : COMMERCE_PAR_ID[e.type];
}

export function employes(s: Etat, i: number): Habitant[] {
  return s.habitants.filter((h) => h.travail === i);
}

export function residents(s: Etat, i: number): Habitant[] {
  return s.habitants.filter((h) => h.logement === i);
}

export function capacite(s: Etat): number {
  return s.etages.filter((e) => e.type === "appartement" && estConstruit(e)).length * PLACES_APPART;
}

export function etagesConstruits(s: Etat): number {
  return s.etages.filter(estConstruit).length;
}

export function estDebloque(s: Etat, c: CommerceDef): boolean {
  return etagesConstruits(s) >= DEBLOCAGE_RANG[c.rang];
}

export function dejaConstruit(s: Etat, commerceId: string): boolean {
  return s.etages.some((e) => e.type === commerceId);
}

export function coutProchainEtage(s: Etat): number {
  return coutEtage(s.etages.length + 1);
}

export function chantierEnCours(s: Etat): number | null {
  const i = s.etages.findIndex((e) => e.chantierFin !== null);
  return i === -1 ? null : i;
}

// Bonus de vente d'un commerce, selon ses employés.
export function multVente(s: Etat, i: number): number {
  const c = commerceDe(s.etages[i]);
  if (!c) return 1;
  let m = 1;
  for (const h of employes(s, i)) {
    m += BONUS_COMPETENCE * h.competences[c.categorie];
    if (h.reve === c.id) m += BONUS_REVE;
  }
  return m;
}

export function prixUnitaire(s: Etat, i: number, p: ProduitDef): number {
  return Math.round(p.prix * multVente(s, i));
}

export function ticketsPourChantier(s: Etat, i: number, now: number): number {
  const fin = s.etages[i].chantierFin;
  if (fin === null) return 0;
  return Math.max(1, Math.ceil((fin - now) / TICKET_CHANTIER_MS));
}

export function pourboire(s: Etat, etage: number): number {
  return Math.round(5 + (etage + 1) * 4 * (1 + s.etages.length / 10));
}

// ---- Le Fil ----

function remplir(txt: string, vars: Record<string, string>): string {
  return txt.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}

function poster(s: Etat, auteur: Habitant | undefined, texte: string, at: number): void {
  if (!auteur) return;
  s.fil.unshift({ auteur: nomHabitant(auteur), texte, at });
  if (s.fil.length > FIL_MAX) s.fil.length = FIL_MAX;
  s.filNonLus++;
}

function varsCommerce(i: number, e: Etage): Record<string, string> {
  return { commerce: commerceDe(e)?.nom ?? "", etage: String(i + 1) };
}

// ---- temps ----

export interface Bilan {
  ventes: number;
  arrivees: number;
}

export function avancer(s: Etat, now: number, rng: Rng = Math.random): Bilan {
  const bilan: Bilan = { ventes: 0, arrivees: 0 };

  // chantiers
  s.etages.forEach((e, i) => {
    if (e.chantierFin === null || e.chantierFin > now) return;
    const fin = e.chantierFin;
    e.chantierFin = null;
    s.tickets++;
    if (e.type === "appartement") {
      const h = nouvelHabitant(s, i, rng);
      bilan.arrivees++;
      poster(s, h, remplir(pick(POSTS_EMMENAGE, rng), { etage: String(i + 1) }), fin);
      if (s.prochaineArrivee === null) s.prochaineArrivee = fin + ARRIVEE_MS;
    } else if (s.habitants.length > 0) {
      poster(s, pick(s.habitants, rng), remplir(pick(POSTS_OUVERTURE, rng), varsCommerce(i, e)), fin);
    }
  });

  // livraisons et ventes ; le gérant recommande dès que le stock est épuisé,
  // autant de cycles que le temps écoulé le permet (absence comprise)
  s.etages.forEach((e, i) => {
    const c = commerceDe(e);
    if (!c || !estConstruit(e)) return;
    e.produits.forEach((p, k) => {
      const def = c.produits[k];
      const reassort = (t: number): boolean => {
        if (!e.gerant || employes(s, i).length < k + 1 || def.cout > s.argent) return false;
        s.argent -= def.cout;
        p.etat = "livraison";
        p.fin = t + def.livraison * 1000;
        return true;
      };
      if (p.etat === "vide") reassort(now);
      for (let garde = 0; garde < 10_000; garde++) {
        if (p.etat === "livraison" && now >= p.fin) {
          p.etat = "vente";
          p.debut = p.fin;
          p.vendus = 0;
        }
        if (p.etat !== "vente") return;
        const vendus = Math.min(def.quantite, Math.floor(((now - p.debut) / (def.dureeVente * 1000)) * def.quantite));
        if (vendus > p.vendus) {
          const gain = (vendus - p.vendus) * prixUnitaire(s, i, def);
          s.argent += gain;
          bilan.ventes += gain;
          p.vendus = vendus;
        }
        if (p.vendus < def.quantite) return;
        p.etat = "vide";
        if (reassort(p.debut + def.dureeVente * 1000)) continue;
        const auteur = s.habitants.length ? pick(s.habitants, rng) : undefined;
        if (rng() < 0.35) poster(s, auteur, remplir(pick(POSTS_RUPTURE, rng), { produit: def.nom, commerce: c.nom }), now);
        return;
      }
    });
  });

  // emménagements
  while (s.prochaineArrivee !== null && s.prochaineArrivee <= now) {
    const libre = s.etages.findIndex(
      (e, i) => e.type === "appartement" && estConstruit(e) && residents(s, i).length < PLACES_APPART
    );
    if (libre === -1) {
      s.prochaineArrivee = null;
      break;
    }
    const h = nouvelHabitant(s, libre, rng);
    bilan.arrivees++;
    poster(s, h, remplir(pick(POSTS_EMMENAGE, rng), { etage: String(libre + 1) }), s.prochaineArrivee);
    s.prochaineArrivee += ARRIVEE_MS;
  }

  // visiteurs dans le hall
  const construits = s.etages.map((e, i) => (estConstruit(e) ? i : -1)).filter((i) => i >= 0);
  while (s.prochainVisiteur <= now) {
    if (s.visiteurs.length < VISITEURS_MAX && construits.length) s.visiteurs.push(pick(construits, rng));
    s.prochainVisiteur += VISITEUR_MS;
    if (s.visiteurs.length >= VISITEURS_MAX) s.prochainVisiteur = Math.max(s.prochainVisiteur, now + VISITEUR_MS);
  }

  // un post d'ambiance de temps en temps (un seul au retour d'une absence)
  if (s.prochainPost <= now && s.habitants.length) {
    const auteur = pick(s.habitants, rng);
    const autres = s.habitants.filter((h) => h !== auteur);
    const commerces = s.etages.map((e, i) => [e, i] as const).filter(([e]) => commerceDe(e) && estConstruit(e));
    const [ce, ci] = commerces.length ? pick(commerces, rng) : [null, 0];
    const texte = remplir(pick(POSTS_AMBIANCE, rng), {
      voisin: autres.length ? pick(autres, rng).prenom : "le voisin",
      commerce: ce ? commerceDe(ce)!.nom : "snack",
      etage: String((ce ? ci : Math.floor(rng() * s.etages.length)) + 1),
    });
    poster(s, auteur, texte, now);
    s.prochainPost = now + 40_000 + rng() * 40_000;
  }

  return bilan;
}

// ---- actions du joueur ----

export function construire(s: Etat, type: string, now: number): boolean {
  if (chantierEnCours(s) !== null) return false;
  const cout = coutProchainEtage(s);
  if (cout > s.argent) return false;
  if (type !== "appartement") {
    const c = COMMERCE_PAR_ID[type];
    if (!c || dejaConstruit(s, type) || !estDebloque(s, c)) return false;
  }
  s.argent -= cout;
  s.etages.push({ type, chantierFin: now + dureeChantier(s.etages.length + 1), produits: produitsVides(type) });
  return true;
}

export function finirChantier(s: Etat, now: number): boolean {
  const i = chantierEnCours(s);
  if (i === null) return false;
  const n = ticketsPourChantier(s, i, now);
  if (n > s.tickets) return false;
  s.tickets -= n;
  s.etages[i].chantierFin = now;
  return true;
}

export function commander(s: Etat, i: number, k: number, now: number): boolean {
  const e = s.etages[i];
  const c = commerceDe(e);
  if (!c || !estConstruit(e)) return false;
  const p = e.produits[k];
  const def = c.produits[k];
  if (p.etat !== "vide" || employes(s, i).length < k + 1 || def.cout > s.argent) return false;
  s.argent -= def.cout;
  p.etat = "livraison";
  p.fin = now + def.livraison * 1000;
  return true;
}

// Le gérant coûte trois commandes du produit le plus cher du commerce.
export function prixGerant(s: Etat, i: number): number | null {
  const c = commerceDe(s.etages[i]);
  return c ? c.produits[2].cout * 3 : null;
}

export function embaucherGerant(s: Etat, i: number): boolean {
  const e = s.etages[i];
  const prix = prixGerant(s, i);
  if (!e || e.gerant || !estConstruit(e) || prix === null || prix > s.argent) return false;
  s.argent -= prix;
  e.gerant = true;
  return true;
}

export function finirLivraison(s: Etat, i: number, k: number, now: number): boolean {
  const p = s.etages[i]?.produits[k];
  if (!p || p.etat !== "livraison" || s.tickets < 1) return false;
  s.tickets--;
  p.fin = now;
  return true;
}

export function embaucher(s: Etat, habitantId: number, i: number, now: number): boolean {
  const h = s.habitants.find((x) => x.id === habitantId);
  const e = s.etages[i];
  if (!h || !e || !commerceDe(e) || !estConstruit(e)) return false;
  if (h.travail === i || employes(s, i).length >= EMPLOYES_MAX) return false;
  h.travail = i;
  if (h.reve === e.type && !h.reveFete) {
    h.reveFete = true;
    s.tickets++;
    poster(s, h, remplir(pick(POSTS_REVE, Math.random), varsCommerce(i, e)), now);
  } else {
    poster(s, h, remplir(pick(POSTS_EMBAUCHE, Math.random), varsCommerce(i, e)), now);
  }
  return true;
}

export function licencier(s: Etat, habitantId: number): boolean {
  const h = s.habitants.find((x) => x.id === habitantId);
  if (!h || h.travail === null) return false;
  h.travail = null;
  return true;
}

export interface Course {
  etage: number;
  gain: number;
  ticket: boolean;
}

// Monte le premier visiteur du hall. Le gain est versé tout de suite ;
// l'animation de l'ascenseur n'est que cosmétique.
export function monterVisiteur(s: Etat, rng: Rng = Math.random): Course | null {
  const etage = s.visiteurs.shift();
  if (etage === undefined) return null;
  const gain = pourboire(s, etage);
  const ticket = rng() < CHANCE_TICKET_ASCENSEUR;
  s.argent += gain;
  if (ticket) s.tickets++;
  return { etage, gain, ticket };
}

// ---- sauvegarde ----

export function charger(now: number): Etat {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Etat;
      if (s.version === 1) return s;
    }
  } catch {
    // stockage indisponible ou sauvegarde illisible : nouvelle partie
  }
  return nouvelEtat(now);
}

export function sauver(s: Etat, now: number): void {
  s.savedAt = now;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // navigation privée ou quota plein : on joue sans sauvegarde
  }
}

// ---- mise en forme ----

export function formatArgent(n: number): string {
  const v = Math.floor(n);
  if (v < 1e6) return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " €";
  const unites: [number, string][] = [
    [1e12, "billion"],
    [1e9, "milliard"],
    [1e6, "million"],
  ];
  for (const [u, nom] of unites)
    if (v >= u) {
      const x = Math.floor((v / u) * 100) / 100;
      return `${String(x).replace(".", ",")} ${nom}${x >= 2 ? "s" : ""} €`;
    }
  return String(v);
}

export function formatDuree(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
}
