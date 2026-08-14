// La Colonie — toutes les données d'équilibrage : salles, unités, expéditions
// et cercles de symbiose. Ajouter une espèce ou une salle = ajouter une fiche
// ici, le reste du jeu est piloté par ces tables.

export type ResourceId = "feuilles" | "champignons" | "miellat";
export type UnitId = "ouvriere" | "soldate";

export interface Cost {
  feuilles?: number;
  champignons?: number;
  miellat?: number;
}

export const RESOURCES: Record<ResourceId, { nom: string; emoji: string }> = {
  feuilles: { nom: "Feuilles", emoji: "🍃" },
  champignons: { nom: "Champignons", emoji: "🍄" },
  miellat: { nom: "Miellat", emoji: "🍯" },
};

// ---- grille ----

export const COLS = 14;
export const ROWS = 10;
export const ENTRANCE_COL = 7; // colonne du puits d'entrée, connectée à la surface

// ---- la Reine ----
// Le niveau de la Reine débloque tout : salles, expéditions, cercles.

export interface QueenLevel {
  cout: Cost;
  secondes: number; // durée de l'amélioration vers CE niveau
  popMax: number; // population totale de fourmis autorisée
}

export const REINE: QueenLevel[] = [
  { cout: {}, secondes: 0, popMax: 10 }, // niveau 1 (départ)
  { cout: { feuilles: 250, champignons: 40 }, secondes: 120, popMax: 16 },
  { cout: { feuilles: 700, champignons: 220, miellat: 30 }, secondes: 480, popMax: 24 },
  { cout: { feuilles: 1800, champignons: 600, miellat: 120 }, secondes: 1500, popMax: 36 },
  { cout: { feuilles: 4000, champignons: 1500, miellat: 400 }, secondes: 3600, popMax: 50 },
];

export const REINE_MAX = REINE.length;

// ---- salles ----

export interface RoomLevel {
  cout: Cost;
  secondes: number;
  prodParMinute?: number; // production de `prodRes` par minute
  stockBonus?: number; // capacité ajoutée à chaque ressource
  fileMax?: number; // taille de la file de la nurserie
}

export interface RoomDef {
  id: string;
  nom: string;
  emoji: string;
  w: number;
  h: number;
  description: string;
  prodRes?: ResourceId;
  // nombre de salles autorisées selon le niveau de Reine (index niv-1)
  maxParReine: number[];
  // espèce symbiote requise pour construire (id de SYMBIOTES)
  symbioteRequis?: string;
  niveaux: RoomLevel[];
}

export const SALLES: RoomDef[] = [
  {
    id: "nurserie",
    nom: "Nurserie",
    emoji: "🥚",
    w: 2,
    h: 2,
    description: "Élève les larves : ouvrières et soldates naissent ici.",
    maxParReine: [1, 1, 2, 2, 2],
    niveaux: [
      { cout: { feuilles: 50 }, secondes: 30, fileMax: 3 },
      { cout: { feuilles: 200, champignons: 30 }, secondes: 120, fileMax: 5 },
      { cout: { feuilles: 600, champignons: 150, miellat: 20 }, secondes: 420, fileMax: 8 },
    ],
  },
  {
    id: "grenier",
    nom: "Grenier",
    emoji: "🫙",
    w: 2,
    h: 2,
    description: "Augmente la réserve de chaque ressource.",
    maxParReine: [1, 2, 2, 3, 3],
    niveaux: [
      { cout: { feuilles: 80 }, secondes: 45, stockBonus: 250 },
      { cout: { feuilles: 300, champignons: 50 }, secondes: 180, stockBonus: 500 },
      { cout: { feuilles: 900, champignons: 250, miellat: 30 }, secondes: 600, stockBonus: 1000 },
    ],
  },
  {
    id: "champignonniere",
    nom: "Champignonnière",
    emoji: "🍄",
    w: 2,
    h: 2,
    description: "Cultive des champignons sur compost de feuilles.",
    prodRes: "champignons",
    maxParReine: [1, 2, 2, 3, 3],
    niveaux: [
      { cout: { feuilles: 120 }, secondes: 60, prodParMinute: 2 },
      { cout: { feuilles: 400, champignons: 60 }, secondes: 240, prodParMinute: 4 },
      { cout: { feuilles: 1200, champignons: 300, miellat: 40 }, secondes: 720, prodParMinute: 7 },
    ],
  },
  {
    id: "etable",
    nom: "Étable à pucerons",
    emoji: "🐛",
    w: 2,
    h: 2,
    description: "Les pucerons y sont traits pour leur précieux miellat.",
    prodRes: "miellat",
    maxParReine: [0, 1, 1, 2, 2],
    symbioteRequis: "pucerons",
    niveaux: [
      { cout: { feuilles: 250, champignons: 60 }, secondes: 120, prodParMinute: 1 },
      { cout: { feuilles: 700, champignons: 200 }, secondes: 360, prodParMinute: 2 },
      { cout: { feuilles: 2000, champignons: 500, miellat: 60 }, secondes: 900, prodParMinute: 3.5 },
    ],
  },
];

export const SALLE_PAR_ID = new Map(SALLES.map((s) => [s.id, s]));

// Chambre de la Reine : salle spéciale pré-construite, dimensions fixes.
export const REINE_W = 3;
export const REINE_H = 2;

// ---- creusage ----

export const CREUSE_COUT = 8; // feuilles par cellule
export const CREUSE_SECONDES_BASE = 10;
export const CREUSE_SECONDES_PAR_RANG = 4; // plus c'est profond, plus c'est long
export const CHANTIERS_MAX = 2; // creusages + constructions simultanés

// ---- unités ----

export interface UnitDef {
  id: UnitId;
  nom: string;
  emoji: string;
  cout: Cost;
  secondes: number;
  force: number; // puissance en expédition
  recolte: number; // feuilles récoltées par minute en surface
  description: string;
}

export const UNITES: UnitDef[] = [
  {
    id: "ouvriere",
    nom: "Ouvrière",
    emoji: "🐜",
    cout: { feuilles: 25 },
    secondes: 20,
    force: 2,
    recolte: 3,
    description: "Récolte des feuilles en surface. Le cœur de la colonie.",
  },
  {
    id: "soldate",
    nom: "Soldate",
    emoji: "⚔️",
    cout: { champignons: 25 },
    secondes: 50,
    force: 10,
    recolte: 0,
    description: "Mandibules d'acier. Indispensable en expédition.",
  },
];

export const UNITE_PAR_ID = new Map(UNITES.map((u) => [u.id, u]));

// ---- expéditions ----

export interface ExpeditionDef {
  id: string;
  nom: string;
  emoji: string;
  description: string;
  reineMin: number;
  secondes: number;
  difficulte: number; // à comparer à la force de l'escouade
  offrande?: Cost; // payée au départ
  butin: Partial<Record<ResourceId, number>>; // butin max (si victoire totale)
  recrute?: string; // id de symbiote débloqué en cas de victoire
}

export const EXPEDITIONS: ExpeditionDef[] = [
  {
    id: "clairiere",
    nom: "La clairière",
    emoji: "🌿",
    description: "Une razzia tranquille sur les feuilles tendres de la clairière.",
    reineMin: 1,
    secondes: 180,
    difficulte: 6,
    butin: { feuilles: 120 },
  },
  {
    id: "vieux-chene",
    nom: "Le vieux chêne",
    emoji: "🌳",
    description: "Champignons rares sous l'écorce — mais des perce-oreilles montent la garde.",
    reineMin: 2,
    secondes: 480,
    difficulte: 45,
    butin: { feuilles: 150, champignons: 80 },
  },
  {
    id: "capture-pucerons",
    nom: "Capturer des pucerons",
    emoji: "🐛",
    description:
      "Un troupeau de pucerons broute sur un rosier gardé par des coccinelles. Ramène-le vivant et le Cercle I s'ouvrira.",
    reineMin: 2,
    secondes: 600,
    difficulte: 60,
    offrande: { feuilles: 150 },
    butin: { miellat: 20 },
    recrute: "pucerons",
  },
];

export const EXPEDITION_PAR_ID = new Map(EXPEDITIONS.map((e) => [e.id, e]));

// ---- cercles de symbiose ----
// Le lien entre toutes les espèces : chaque insecte du jardin peut rejoindre la
// colonie, mais plus son cercle est élevé, plus l'effort demandé est grand.
// Une espèce non recrutée reste un adversaire potentiel.

export interface SymbioteDef {
  id: string;
  nom: string;
  emoji: string;
  cercle: number;
  apporte: string; // ce que l'espèce offre une fois recrutée
  effort: string; // ce qu'il faut accomplir pour la recruter
  disponible: boolean; // false = « à venir » (prochaines versions)
}

export const SYMBIOTES: SymbioteDef[] = [
  {
    id: "pucerons",
    nom: "Les pucerons",
    emoji: "🐛",
    cercle: 1,
    apporte: "L'Étable à pucerons : du miellat 🍯 en continu.",
    effort: "Reine niv. 2 · expédition « Capturer des pucerons » · offrande de 150 🍃",
    disponible: true,
  },
  {
    id: "lucioles",
    nom: "Les lucioles",
    emoji: "✨",
    cercle: 2,
    apporte: "Éclairent les galeries profondes : creusage plus rapide.",
    effort: "Reine niv. 3 · une expédition nocturne · offrande de miellat",
    disponible: false,
  },
  {
    id: "scarabees",
    nom: "Les scarabées",
    emoji: "🪲",
    cercle: 2,
    apporte: "Des béliers vivants : la garde lourde des expéditions.",
    effort: "Reine niv. 3 · vaincre le scarabée champion en duel",
    disponible: false,
  },
  {
    id: "abeilles",
    nom: "Les abeilles",
    emoji: "🐝",
    cercle: 3,
    apporte: "Une escadrille volante et le commerce du miel.",
    effort: "Reine niv. 4 · sauver la ruche des frelons · lourde offrande",
    disponible: false,
  },
  {
    id: "mante",
    nom: "La mante religieuse",
    emoji: "🦗",
    cercle: 4,
    apporte: "Une championne solitaire, l'arme ultime de la colonie.",
    effort: "Reine niv. 5 · gagner son respect au terme de trois épreuves",
    disponible: false,
  },
];

// ---- capacités ----

export const STOCK_BASE = 300; // capacité de départ pour chaque ressource
