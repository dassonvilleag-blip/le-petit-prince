// L'Âge des Royaumes — les chiffres. Valeurs d'Age of Empires II (vitesse 1.0),
// le jeu tourne à VITESSE comme la vitesse « normale » d'AoE II DE.

export const VITESSE = 1.7;
export const TAILLE_CARTE = 144; // la « petite » carte d'AoE II
export const PORTEE = 10; // ce qu'un villageois porte avant de rentrer
export const POP_MAX = 200;

export type Ressource = "nourriture" | "bois" | "or" | "pierre";
export const RESSOURCES: Ressource[] = ["nourriture", "bois", "or", "pierre"];
export const DEPART: Record<Ressource, number> = { nourriture: 200, bois: 200, or: 100, pierre: 200 };

export type Cout = Partial<Record<Ressource, number>>;
export type Armure = [melee: number, perce: number];

export type NatureId = "arbre" | "baies" | "or" | "pierre";
export const NATURE: Record<NatureId, { res: Ressource; quantite: number; cadence: number; nom: string }> = {
  arbre: { res: "bois", quantite: 100, cadence: 0.39, nom: "Arbre" },
  baies: { res: "nourriture", quantite: 125, cadence: 0.31, nom: "Buisson de baies" },
  or: { res: "or", quantite: 800, cadence: 0.38, nom: "Mine d'or" },
  pierre: { res: "pierre", quantite: 350, cadence: 0.36, nom: "Mine de pierre" },
};

export type BatimentId = "hotel" | "maison" | "bucheron" | "mineur" | "moulin" | "ferme" | "caserne" | "archerie" | "ecurie";
export interface BatimentDef {
  nom: string;
  taille: number;
  cout: Cout;
  duree: number; // secondes de construction pour un villageois
  depot: Ressource[]; // ce qu'on peut y déposer
  pop: number;
  pv: number;
  armure: Armure;
  vue: number; // rayon qu'il dévoile dans le brouillard
  age: number; // âge où on peut le bâtir
  traversable?: boolean;
}

const B = (nom: string, taille: number, cout: Cout, duree: number, pv: number, armure: Armure, vue: number, age = 0, depot: Ressource[] = [], pop = 0) =>
  ({ nom, taille, cout, duree, pv, armure, vue, age, depot, pop }) as BatimentDef;

export const BATIMENTS: Record<BatimentId, BatimentDef> = {
  hotel: B("Hôtel de ville", 4, { bois: 275, pierre: 100 }, 150, 2400, [3, 5], 8, 2, ["nourriture", "bois", "or", "pierre"], 5),
  maison: B("Maison", 2, { bois: 25 }, 25, 550, [0, 7], 2, 0, [], 5),
  bucheron: B("Camp de bûcheron", 2, { bois: 100 }, 35, 600, [0, 7], 2, 0, ["bois"]),
  mineur: B("Camp de mineur", 2, { bois: 100 }, 35, 600, [0, 7], 2, 0, ["or", "pierre"]),
  moulin: B("Moulin", 2, { bois: 100 }, 35, 600, [0, 7], 2, 0, ["nourriture"]),
  ferme: { ...B("Ferme", 3, { bois: 60 }, 15, 480, [0, 0], 1), traversable: true },
  caserne: B("Caserne", 3, { bois: 175 }, 50, 1200, [0, 7], 5),
  archerie: B("Camp de tir à l'arc", 3, { bois: 175 }, 50, 1500, [0, 7], 5, 1),
  ecurie: B("Écurie", 3, { bois: 175 }, 50, 1500, [0, 7], 5, 1),
};

// L'Hôtel de ville tire une flèche sur l'ennemi proche, comme dans AoE II (sans garnison).
export const HOTEL_TIR = { attaque: 5, portee: 6, recharge: 2 };

export const ECONOMIQUES: BatimentId[] = ["maison", "moulin", "mineur", "bucheron", "ferme", "hotel"];
export const MILITAIRES: BatimentId[] = ["caserne", "archerie", "ecurie"];

export const FERME_NOURRITURE = 175;
export const FERME_CADENCE = 0.32;

export type Classe = "villageois" | "infanterie" | "archer" | "cavalerie" | "bete";
export type UniteId = "villageois" | "milicien" | "lancier" | "archer" | "tirailleur" | "archerMonte" | "eclaireur" | "chevalier" | "loup";
export interface UniteDef {
  nom: string;
  classe: Classe;
  lieu: BatimentId | null; // où on la forme
  age: number;
  cout: Cout;
  duree: number;
  pv: number;
  attaque: number;
  portee: number; // 0 : corps à corps (dégâts de mêlée), sinon perce
  recharge: number; // secondes entre deux coups
  armure: Armure;
  vitesse: number; // cases par seconde
  vue: number; // distance à laquelle elle repère un ennemi
  bonus?: Partial<Record<Classe, number>>;
}

export const UNITES: Record<UniteId, UniteDef> = {
  villageois: { nom: "Villageois", classe: "villageois", lieu: "hotel", age: 0, cout: { nourriture: 50 }, duree: 25, pv: 25, attaque: 3, portee: 0, recharge: 2, armure: [0, 0], vitesse: 0.8, vue: 4 },
  milicien: { nom: "Milicien", classe: "infanterie", lieu: "caserne", age: 0, cout: { nourriture: 60, or: 20 }, duree: 21, pv: 40, attaque: 4, portee: 0, recharge: 2, armure: [0, 1], vitesse: 0.9, vue: 4 },
  lancier: { nom: "Lancier", classe: "infanterie", lieu: "caserne", age: 1, cout: { nourriture: 35, bois: 25 }, duree: 22, pv: 45, attaque: 3, portee: 0, recharge: 3, armure: [0, 0], vitesse: 1, vue: 4, bonus: { cavalerie: 15 } },
  archer: { nom: "Archer", classe: "archer", lieu: "archerie", age: 1, cout: { bois: 25, or: 45 }, duree: 35, pv: 30, attaque: 4, portee: 4, recharge: 2, armure: [0, 0], vitesse: 0.96, vue: 6 },
  tirailleur: { nom: "Tirailleur", classe: "archer", lieu: "archerie", age: 1, cout: { nourriture: 25, bois: 35 }, duree: 22, pv: 30, attaque: 2, portee: 4, recharge: 3, armure: [0, 3], vitesse: 0.96, vue: 6, bonus: { archer: 3 } },
  archerMonte: { nom: "Archer monté", classe: "archer", lieu: "archerie", age: 2, cout: { bois: 40, or: 70 }, duree: 34, pv: 50, attaque: 6, portee: 4, recharge: 2, armure: [0, 0], vitesse: 1.4, vue: 5 },
  eclaireur: { nom: "Éclaireur", classe: "cavalerie", lieu: "ecurie", age: 1, cout: { nourriture: 80 }, duree: 30, pv: 45, attaque: 3, portee: 0, recharge: 2, armure: [0, 2], vitesse: 1.2, vue: 6 },
  chevalier: { nom: "Chevalier", classe: "cavalerie", lieu: "ecurie", age: 2, cout: { nourriture: 60, or: 75 }, duree: 30, pv: 100, attaque: 10, portee: 0, recharge: 1.8, armure: [2, 2], vitesse: 1.35, vue: 4 },
  loup: { nom: "Loup", classe: "bete", lieu: null, age: 0, cout: {}, duree: 0, pv: 25, attaque: 3, portee: 0, recharge: 2, armure: [0, 0], vitesse: 1.1, vue: 4 },
};

// Pour passer à l'âge suivant, comme dans AoE II : payer, et avoir bâti 2
// bâtiments différents parmi `requis` (ceux de l'âge en cours).
export const AGES: { nom: string; cout: Cout; duree: number; requis: BatimentId[] }[] = [
  { nom: "Âge sombre", cout: {}, duree: 0, requis: [] },
  { nom: "Âge féodal", cout: { nourriture: 500 }, duree: 130, requis: ["caserne", "moulin", "bucheron", "mineur"] },
  { nom: "Âge des châteaux", cout: { nourriture: 800, or: 200 }, duree: 160, requis: ["archerie", "ecurie"] },
];
