// Du Kebab au CAC 40 — contenu du jeu : commerces, gérants, améliorations.
// Les chiffres des commerces reprennent la courbe publique d'AdVenture
// Capitalist (coût initial, coefficient, cycle, revenu) ; les Transports
// poids lourds sont une marche intermédiaire à la moyenne géométrique d'OSR et
// du Supermarché.

export type CommerceId =
  | "vide-grenier"
  | "anatolie"
  | "boulangerie"
  | "chez-rachid"
  | "tabac-presse"
  | "osr"
  | "transports"
  | "supermarche"
  | "chaine-tele"
  | "club-foot"
  | "compagnie-aerienne";

export interface Gerant {
  nom: string;
  phrase: string;
  prix: number;
}

export interface CommerceDef {
  id: CommerceId;
  nom: string;
  icone: string;
  coutInitial: number;
  coef: number; // le prix de chaque exemplaire est multiplié par ce coef
  cycle: number; // secondes, avant paliers
  revenu: number; // € par cycle et par exemplaire, avant multiplicateurs
  gerant: Gerant;
}

export const COMMERCES: CommerceDef[] = [
  {
    id: "vide-grenier",
    nom: "Vide-grenier",
    icone: "🧺",
    coutInitial: 4,
    coef: 1.07,
    cycle: 1,
    revenu: 1,
    gerant: { nom: "Françoise", phrase: "Elle sait ce que vaut ce vieux service à café, au centime près.", prix: 1e3 },
  },
  {
    id: "anatolie",
    nom: "ANATOLIE",
    icone: "🥙",
    coutInitial: 60,
    coef: 1.15,
    cycle: 3,
    revenu: 60,
    gerant: { nom: "Eren", phrase: "Salade, tomates, oignons ? Il connaît ta commande par cœur.", prix: 15e3 },
  },
  {
    id: "boulangerie",
    nom: "Boulangerie",
    icone: "🥖",
    coutInitial: 720,
    coef: 1.14,
    cycle: 6,
    revenu: 540,
    gerant: { nom: "Mme Lefèvre", phrase: "Levée à 4 h, la première fournée sort toujours à l'heure.", prix: 100e3 },
  },
  {
    id: "chez-rachid",
    nom: "Chez Rachid",
    icone: "🛒",
    coutInitial: 8640,
    coef: 1.13,
    cycle: 12,
    revenu: 4320,
    gerant: { nom: "Rachid", phrase: "Ouvert quand tout le reste est fermé.", prix: 500e3 },
  },
  {
    id: "tabac-presse",
    nom: "Tabac-presse",
    icone: "📰",
    coutInitial: 103_680,
    coef: 1.12,
    cycle: 24,
    revenu: 51_840,
    gerant: { nom: "Gégé", phrase: "Il sait qui a gagné au Loto avant tout le monde.", prix: 1.2e6 },
  },
  {
    id: "osr",
    nom: "OSR – Objectif Sécurité Routière",
    icone: "🚗",
    coutInitial: 1_244_160,
    coef: 1.11,
    cycle: 96,
    revenu: 622_080,
    gerant: { nom: "Hichem", phrase: "Même en créneau sous la pluie, il reste zen.", prix: 10e6 },
  },
  {
    id: "transports",
    nom: "Transports poids lourds",
    icone: "🚛",
    coutInitial: 4_310_000,
    coef: 1.105,
    cycle: 192,
    revenu: 2_155_000,
    gerant: { nom: "Ilyes", phrase: "Lille–Marseille d'une traite, et jamais un retard.", prix: 33e6 },
  },
  {
    id: "supermarche",
    nom: "Supermarché",
    icone: "🏬",
    coutInitial: 14_929_920,
    coef: 1.1,
    cycle: 384,
    revenu: 7_464_960,
    gerant: { nom: "Sandrine", phrase: "Elle a un œil sur chaque caisse en même temps.", prix: 111.1e6 },
  },
  {
    id: "chaine-tele",
    nom: "Chaîne de télé",
    icone: "📺",
    coutInitial: 179_159_040,
    coef: 1.09,
    cycle: 1536,
    revenu: 89_579_520,
    gerant: { nom: "Jean-Pierre", phrase: "Il fait exploser l'audimat tous les soirs à 20 h.", prix: 555.5e6 },
  },
  {
    id: "club-foot",
    nom: "Club de foot",
    icone: "⚽",
    coutInitial: 2_149_908_480,
    coef: 1.08,
    cycle: 6144,
    revenu: 1_074_954_240,
    gerant: { nom: "Le Président", phrase: "Il promet le titre chaque saison. Chaque saison.", prix: 10e9 },
  },
  {
    id: "compagnie-aerienne",
    nom: "Compagnie aérienne",
    icone: "✈️",
    coutInitial: 25_798_901_760,
    coef: 1.07,
    cycle: 36_864,
    revenu: 29_668_737_024,
    gerant: { nom: "Commandant Bernard", phrase: "Mesdames et messieurs, ici votre commandant de bord.", prix: 100e9 },
  },
];

export const COMMERCE_PAR_ID = Object.fromEntries(COMMERCES.map((c) => [c.id, c])) as Record<CommerceId, CommerceDef>;

// ---- paliers ----

// À chacun de ces nombres d'exemplaires, le cycle du commerce est deux fois
// plus court. Au-delà du dernier, chaque centaine double les revenus.
export const PALIERS_VITESSE = [25, 50, 100, 200, 300, 400];
export const PALIER_REVENU_PAS = 100;

// ---- améliorations ----

export interface AmeliorationDef {
  id: string;
  nom: string;
  cible: CommerceId | "tous";
  mult: number;
  prix: number;
}

// Noms des trois vagues d'améliorations, par commerce.
const NOMS_AMELIO: Record<CommerceId | "tous", [string, string, string]> = {
  "vide-grenier": ["Nappe à carreaux", "Panneau « tout à 1 € »", "Camion de brocanteur"],
  anatolie: ["Sauce samouraï", "Broche XXL", "Galette maison"],
  boulangerie: ["Four à bois", "Baguette primée", "Croissant au beurre AOP"],
  "chez-rachid": ["Ouvert jusqu'à 2 h", "Rayon frais", "Livraison en trottinette"],
  "tabac-presse": ["Tickets à gratter", "Relais colis", "Borne de paris sportifs"],
  osr: ["Voiture double commande", "Code en ligne", "Permis poids lourds"],
  transports: ["Semi-remorque", "Tachygraphe numérique", "Flotte électrique"],
  supermarche: ["Carte de fidélité", "Caisses automatiques", "Drive"],
  "chaine-tele": ["Jeu de 18 h", "Téléréalité", "Droits du foot"],
  "club-foot": ["Buteur brésilien", "Nouveau stade", "Ligue des champions"],
  "compagnie-aerienne": ["Bagage cabine payant", "Ligne Paris–New York", "Airbus A380"],
  tous: ["Expert-comptable", "Optimisation fiscale", "Lobbying à Bruxelles"],
};

// Prix de la première vague, commerce par commerce ; les vagues suivantes
// sont ce même barème multiplié.
const PRIX_VAGUE_1: Record<CommerceId, number> = {
  "vide-grenier": 250e3,
  anatolie: 500e3,
  boulangerie: 1e6,
  "chez-rachid": 5e6,
  "tabac-presse": 10e6,
  osr: 25e6,
  transports: 100e6,
  supermarche: 500e6,
  "chaine-tele": 1e9,
  "club-foot": 5e9,
  "compagnie-aerienne": 10e9,
};
const VAGUES = [
  { facteur: 1, tous: 25e9 },
  { facteur: 4e5, tous: 1e16 },
  { facteur: 1.6e11, tous: 1e22 },
];

export const AMELIORATIONS: AmeliorationDef[] = VAGUES.flatMap((v, i) => [
  ...COMMERCES.map((c) => ({
    id: `${c.id}-${i + 1}`,
    nom: NOMS_AMELIO[c.id][i],
    cible: c.id,
    mult: 3,
    prix: PRIX_VAGUE_1[c.id] * v.facteur,
  })),
  { id: `tous-${i + 1}`, nom: NOMS_AMELIO.tous[i], cible: "tous" as const, mult: 3, prix: v.tous },
]).sort((a, b) => a.prix - b.prix);

// ---- Bourse (prestige) ----

export const BOURSE_DIVISEUR = 1e13; // gains cumulés pour ~150 actions
export const BOURSE_ECHELLE = 150;
export const BONUS_PAR_ACTION = 0.02;
