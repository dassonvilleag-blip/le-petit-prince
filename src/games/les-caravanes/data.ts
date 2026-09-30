// Les Caravanes — données du jeu : villes, marchandises (et leur forme dans la
// charrette), marchands, améliorations. Tout l'équilibrage vit ici.

export type VilleId = "portvent" | "terracuite" | "lainebourg" | "clos-vermeil" | "sablemire" | "mirazur";

export type BienId =
  | "sel"
  | "poisson"
  | "cordage"
  | "olives"
  | "ble"
  | "poterie"
  | "laine"
  | "fromage"
  | "tissu"
  | "miel"
  | "raisin"
  | "vin"
  | "dattes"
  | "the"
  | "epices"
  | "perles"
  | "parfum"
  | "soie";

// Une forme = liste de cases [x, y], normalisée (min x = min y = 0).
export type Forme = [number, number][];

export const FORMES = {
  un: [[0, 0]],
  i2: [
    [0, 0],
    [1, 0],
  ],
  i3: [
    [0, 0],
    [1, 0],
    [2, 0],
  ],
  l3: [
    [0, 0],
    [0, 1],
    [1, 1],
  ],
  o4: [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  t4: [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ],
  s4: [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ],
  l4: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2],
  ],
} satisfies Record<string, Forme>;

export interface BienDef {
  id: BienId;
  nom: string;
  icone: string;
  forme: Forme;
  base: number; // prix de référence d'une pièce, en écus
  couleur: string;
}

// Plus une pièce est grosse, meilleur est son prix par case : c'est ce qui
// rend le rangement intéressant (les grosses pièces rapportent mais se
// casent mal, les petites bouchent les trous).
export const BIENS: BienDef[] = [
  // Portvent
  { id: "sel", nom: "Sel", icone: "🧂", forme: FORMES.un, base: 3, couleur: "#e8e4dc" },
  { id: "poisson", nom: "Poisson séché", icone: "🐟", forme: FORMES.i2, base: 7, couleur: "#9cc3d8" },
  { id: "cordage", nom: "Cordage", icone: "🪢", forme: FORMES.l3, base: 12, couleur: "#c9a46a" },
  // Terracuite
  { id: "olives", nom: "Olives", icone: "🫒", forme: FORMES.un, base: 3, couleur: "#9aa85a" },
  { id: "ble", nom: "Blé", icone: "🌾", forme: FORMES.i3, base: 11, couleur: "#e6c35c" },
  { id: "poterie", nom: "Poterie", icone: "🏺", forme: FORMES.o4, base: 17, couleur: "#d0784a" },
  // Lainebourg
  { id: "laine", nom: "Laine", icone: "🧶", forme: FORMES.un, base: 7, couleur: "#e7a3b8" },
  { id: "fromage", nom: "Fromage", icone: "🧀", forme: FORMES.i2, base: 16, couleur: "#f1d06b" },
  { id: "tissu", nom: "Tissu", icone: "🧵", forme: FORMES.l4, base: 36, couleur: "#8f7fd1" },
  // Clos-Vermeil
  { id: "miel", nom: "Miel", icone: "🍯", forme: FORMES.un, base: 11, couleur: "#f0a93b" },
  { id: "raisin", nom: "Raisin", icone: "🍇", forme: FORMES.l3, base: 38, couleur: "#9a5fb5" },
  { id: "vin", nom: "Vin", icone: "🍷", forme: FORMES.o4, base: 54, couleur: "#a8324a" },
  // Sablemire
  { id: "dattes", nom: "Dattes", icone: "🌴", forme: FORMES.i2, base: 44, couleur: "#b07a3c" },
  { id: "the", nom: "Thé", icone: "🍵", forme: FORMES.l3, base: 72, couleur: "#6fa36a" },
  { id: "epices", nom: "Épices", icone: "🌶️", forme: FORMES.t4, base: 104, couleur: "#d9542b" },
  // Mirazur
  { id: "perles", nom: "Perles", icone: "🦪", forme: FORMES.un, base: 60, couleur: "#dfe6ee" },
  { id: "parfum", nom: "Parfum", icone: "🧴", forme: FORMES.i3, base: 195, couleur: "#e58fc4" },
  { id: "soie", nom: "Soie", icone: "🧣", forme: FORMES.s4, base: 280, couleur: "#4fb3c9" },
];

export const BIEN_PAR_ID = Object.fromEntries(BIENS.map((b) => [b.id, b])) as Record<BienId, BienDef>;

// ---- marchands ----

export type Caractere = "pressee" | "patient" | "flatteuse" | "radin" | "joueuse" | "capricieuse";

export interface CaractereDef {
  nom: string;
  indice: string; // ce que le joueur voit, pour apprendre à le manœuvrer
  margeMin: number; // marge secrète au-dessus du prix affiché qu'il acceptera
  margeMax: number;
  patience: number; // refus avant qu'il claque la porte
  compliment: { marge: number; patience: number; reponse: string };
}

export const CARACTERES: Record<Caractere, CaractereDef> = {
  pressee: {
    nom: "Pressée",
    indice: "Ne supporte pas qu'on traîne.",
    margeMin: 0.12,
    margeMax: 0.32,
    patience: 2,
    compliment: { marge: 0, patience: -1, reponse: "Abrège, j'ai du poisson qui attend !" },
  },
  patient: {
    nom: "Patient",
    indice: "Prend tout son temps, mais lâche peu.",
    margeMin: 0.08,
    margeMax: 0.24,
    patience: 5,
    compliment: { marge: 0.04, patience: 0, reponse: "Hé hé… merci bien, l'ami." },
  },
  flatteuse: {
    nom: "Sensible aux compliments",
    indice: "Un mot gentil la met de bonne humeur.",
    margeMin: 0.08,
    margeMax: 0.26,
    patience: 3,
    compliment: { marge: 0.12, patience: 0, reponse: "Oh, vous êtes adorable ! Bon, on s'arrange…" },
  },
  radin: {
    nom: "Radin",
    indice: "Compte chaque piécette.",
    margeMin: 0.04,
    margeMax: 0.16,
    patience: 4,
    compliment: { marge: 0, patience: 0, reponse: "Les compliments ne paient pas mes factures." },
  },
  joueuse: {
    nom: "Joueuse",
    indice: "Adore marchander, peut lâcher gros.",
    margeMin: 0.18,
    margeMax: 0.4,
    patience: 3,
    compliment: { marge: 0.04, patience: 0, reponse: "Flatteur ! Ça ne marchera pas… enfin, un peu." },
  },
  capricieuse: {
    nom: "Capricieuse",
    indice: "Imprévisible : parfois rien, parfois tout.",
    margeMin: 0,
    margeMax: 0.5,
    patience: 3,
    compliment: { marge: 0.06, patience: 0, reponse: "Mmh. Continuez." },
  },
};

export interface MarchandDef {
  nom: string;
  portrait: string;
  caractere: Caractere;
}

// ---- villes ----

export interface VilleDef {
  id: VilleId;
  nom: string;
  icone: string;
  x: number; // position sur la carte (viewBox 100 × 60)
  y: number;
  palier: number; // 1 à 5 : les villes lointaines ont des trajets plus longs
  deblocage: number; // prix pour ouvrir la route (0 = ouverte d'office)
  produit: BienId[];
  demande: BienId[];
  marchand: MarchandDef;
}

export const VILLES: VilleDef[] = [
  {
    id: "portvent",
    nom: "Portvent",
    icone: "⚓",
    x: 10,
    y: 36,
    palier: 1,
    deblocage: 0,
    produit: ["sel", "poisson", "cordage"],
    demande: ["olives", "ble", "raisin", "the"],
    marchand: { nom: "Yvonne la Poissonnière", portrait: "👵", caractere: "pressee" },
  },
  {
    id: "terracuite",
    nom: "Terracuite",
    icone: "🏺",
    x: 27,
    y: 22,
    palier: 1,
    deblocage: 0,
    produit: ["olives", "ble", "poterie"],
    demande: ["sel", "poisson", "miel", "dattes"],
    marchand: { nom: "Gaspard le Potier", portrait: "🧔", caractere: "patient" },
  },
  {
    id: "lainebourg",
    nom: "Lainebourg",
    icone: "🐑",
    x: 38,
    y: 46,
    palier: 2,
    deblocage: 150,
    produit: ["laine", "fromage", "tissu"],
    demande: ["cordage", "poterie", "vin", "parfum"],
    marchand: { nom: "Mère Bobine", portrait: "👩‍🦳", caractere: "flatteuse" },
  },
  {
    id: "clos-vermeil",
    nom: "Clos-Vermeil",
    icone: "🍇",
    x: 56,
    y: 20,
    palier: 3,
    deblocage: 1_500,
    produit: ["miel", "raisin", "vin"],
    demande: ["poisson", "fromage", "tissu", "perles"],
    marchand: { nom: "Le Baron de Vermeil", portrait: "🎩", caractere: "radin" },
  },
  {
    id: "sablemire",
    nom: "Sablemire",
    icone: "🐪",
    x: 74,
    y: 44,
    palier: 4,
    deblocage: 12_000,
    produit: ["dattes", "the", "epices"],
    demande: ["laine", "fromage", "vin", "soie"],
    marchand: { nom: "Zélie la Chamelière", portrait: "👩‍🦱", caractere: "joueuse" },
  },
  {
    id: "mirazur",
    nom: "Mirazur",
    icone: "💎",
    x: 90,
    y: 14,
    palier: 5,
    deblocage: 90_000,
    produit: ["perles", "parfum", "soie"],
    demande: ["epices", "the", "miel", "tissu"],
    marchand: { nom: "La Comtesse Opaline", portrait: "👸", caractere: "capricieuse" },
  },
];

export const VILLE_PAR_ID = Object.fromEntries(VILLES.map((v) => [v.id, v])) as Record<VilleId, VilleDef>;

// ---- prix ----

export const COEF_ACHAT = 0.6; // on achète à 60 % du prix de référence chez le producteur
export const COEF_DEMANDE = 1.7; // ville qui réclame ce bien
export const COEF_NEUTRE = 1.1; // ville qui ne produit ni ne réclame
export const COEF_PRODUCTEUR = 0.5; // revendre au producteur : mauvaise idée
export const AMPLITUDE_COURS = 0.2; // les cours ondulent de ±20 %
export const PERIODE_COURS_MIN = 30; // minutes
export const PERIODE_COURS_MAX = 120;

// Saturation : chaque case vendue d'un bien dans une ville fait baisser son
// prix de vente là-bas ; l'effet se résorbe de moitié toutes les DEMI_VIE.
export const SATURATION_PAR_CASE = 0.008;
export const SATURATION_MAX = 0.3;
export const DEMI_VIE_SATURATION = 10 * 60_000;

// ---- événements ----

// Le temps est découpé en créneaux ; chacun porte au plus une nouvelle.
export const DUREE_CRENEAU = 40 * 60_000;
export const CHANCE_EVENEMENT = 0.7;
export const MULT_FOIRE = 1.5; // un bien se vend +50 % dans une ville
export const MULT_RECOLTE = 0.6; // un bien s'achète −40 % chez son producteur
export const MULT_FETE = 1.25; // tout se vend +25 % dans une ville

// ---- trajets ----

export const SECONDES_PAR_UNITE = 4; // une unité de carte à allure de mulet, palier 1
export const FACTEUR_PALIER = [1, 1, 1.5, 2.5, 4, 6]; // indexé par palier (0 inutilisé)

// ---- améliorations ----

export interface NiveauCharrette {
  nom: string;
  l: number; // largeur de la grille
  h: number;
  prix: number;
}

export const CHARRETTES: NiveauCharrette[] = [
  { nom: "Carriole", l: 3, h: 3, prix: 0 },
  { nom: "Charrette", l: 4, h: 3, prix: 60 },
  { nom: "Chariot bâché", l: 4, h: 4, prix: 400 },
  { nom: "Grand chariot", l: 5, h: 4, prix: 2_500 },
  { nom: "Fourgon ferré", l: 5, h: 5, prix: 15_000 },
  { nom: "Convoi double", l: 6, h: 5, prix: 80_000 },
  { nom: "Caravansérail roulant", l: 6, h: 6, prix: 400_000 },
];

export interface NiveauAttelage {
  nom: string;
  icone: string;
  vitesse: number;
  prix: number;
}

export const ATTELAGES: NiveauAttelage[] = [
  { nom: "Mulets", icone: "🫏", vitesse: 1, prix: 0 },
  { nom: "Chevaux de trait", icone: "🐴", vitesse: 1.3, prix: 300 },
  { nom: "Dromadaires", icone: "🐪", vitesse: 1.7, prix: 3_000 },
  { nom: "Chevaux arabes", icone: "🐎", vitesse: 2.2, prix: 30_000 },
  { nom: "Relais de poste", icone: "📯", vitesse: 3, prix: 300_000 },
];

// Prix de la n-ième caravane (index 1 = la deuxième).
export const PRIX_CARAVANES = [0, 200, 2_000, 20_000, 200_000];

// Prix du n-ième caravanier embauché (index 0 = le premier).
export const PRIX_CARAVANIERS = [300, 3_000, 30_000, 300_000, 3_000_000];

// Objectif final de la v1.
export const PRIX_TITRE_ROYAL = 2_000_000;

export const ECUS_DEPART = 30;

// Si le marchand claque la porte, on brade au marché voisin.
export const DECOTE_FACHE = 0.9;

// ---- compétences ----

export type BrancheId = "negoce" | "routes" | "logistique";

export type CompetenceId =
  | "beau-parleur"
  | "oeil"
  | "bonne-reputation"
  | "charmeur"
  | "maitre-negociant"
  | "raccourcis"
  | "eclaireur"
  | "relais"
  | "informateurs"
  | "grand-voyageur"
  | "achat-en-gros"
  | "marches-profonds"
  | "double-fond"
  | "contremaitre"
  | "flotte-royale";

export interface BrancheDef {
  id: BrancheId;
  nom: string;
  icone: string;
}

export const BRANCHES: BrancheDef[] = [
  { id: "negoce", nom: "Négoce", icone: "🤝" },
  { id: "routes", nom: "Routes", icone: "🗺️" },
  { id: "logistique", nom: "Logistique", icone: "📦" },
];

export interface CompetenceDef {
  id: CompetenceId;
  branche: BrancheId;
  nom: string;
  icone: string;
  effet: string;
}

// Dans chaque branche, une compétence demande d'avoir appris la précédente.
export const COMPETENCES: CompetenceDef[] = [
  { id: "beau-parleur", branche: "negoce", nom: "Beau parleur", icone: "🗣️", effet: "+1 de patience chez tous les marchands." },
  { id: "oeil", branche: "negoce", nom: "Œil du marchand", icone: "👁️", effet: "Tu devines une fourchette de ce qu'il acceptera." },
  { id: "bonne-reputation", branche: "negoce", nom: "Bonne réputation", icone: "📜", effet: "Les marchands acceptent +5 % de plus." },
  { id: "charmeur", branche: "negoce", nom: "Charmeur", icone: "💐", effet: "Tes compliments font mouche sur tout le monde." },
  { id: "maitre-negociant", branche: "negoce", nom: "Maître négociant", icone: "🎩", effet: "Tes caravaniers marchandent aussi : +8 % sur leurs ventes." },
  { id: "raccourcis", branche: "routes", nom: "Raccourcis", icone: "🧭", effet: "Trajets −10 %." },
  { id: "eclaireur", branche: "routes", nom: "Éclaireur", icone: "🔭", effet: "Tu connais la prochaine nouvelle à l'avance." },
  { id: "relais", branche: "routes", nom: "Relais", icone: "🏕️", effet: "Trajets encore −15 %." },
  { id: "informateurs", branche: "routes", nom: "Informateurs", icone: "🕵️", effet: "Foires, fêtes et récoltes rapportent moitié plus." },
  { id: "grand-voyageur", branche: "routes", nom: "Grand voyageur", icone: "🐫", effet: "Trajets vers Sablemire et Mirazur −20 %." },
  { id: "achat-en-gros", branche: "logistique", nom: "Achat en gros", icone: "🧾", effet: "Tout s'achète −10 %." },
  { id: "marches-profonds", branche: "logistique", nom: "Marchés profonds", icone: "🏛️", effet: "Tes ventes saturent les marchés 40 % moins." },
  { id: "double-fond", branche: "logistique", nom: "Double fond", icone: "🧰", effet: "+1 rangée dans toutes les charrettes." },
  { id: "contremaitre", branche: "logistique", nom: "Contremaître", icone: "👷", effet: "Les caravaniers comblent les trous de ton rangement." },
  { id: "flotte-royale", branche: "logistique", nom: "Flotte royale", icone: "⚜️", effet: "Débloque une 6e caravane." },
];

export const COMPETENCE_PAR_ID = Object.fromEntries(COMPETENCES.map((c) => [c.id, c])) as Record<CompetenceId, CompetenceDef>;

// Réputation : gagnée avec le bénéfice des ventes. Le niveau n demande
// REPUTATION_PREMIER × (RAISON^n − 1) / (RAISON − 1) ; chaque niveau = 1 point.
export const REPUTATION_PREMIER = 60;
export const REPUTATION_RAISON = 2.0;
export const REPUTATION_AUTO = 0.5; // part de réputation des ventes des caravaniers
export const REPUTATION_MARCHANDAGE = 2; // bonus : ×(1 + 2 × marge obtenue)

export const BONUS_REPUTATION_MARCHAND = 0.05;
export const BONUS_MAITRE_NEGOCIANT = 1.08;
export const COMPLIMENT_CHARMEUR = 0.08;
export const AMPLIF_INFORMATEURS = 1.5;
export const REMISE_EN_GROS = 0.9;
export const FACTEUR_MARCHES_PROFONDS = 0.6;
export const PRIX_FLOTTE_ROYALE = 1_000_000; // la 6e caravane
