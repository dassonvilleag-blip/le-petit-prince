// Types du mode « Vivre Card » : une vie tirée au hasard dans le monde de
// One Piece, vécue année par année jusqu'à la mort. Le contenu (événements,
// fruits, secrets…) est de la donnée typée ; le moteur l'interprète.

export type Jauge = "force" | "haki" | "savoir" | "equipage";
export type Jauges = Record<Jauge, number>;
export const JAUGES: Jauge[] = ["force", "haki", "savoir", "equipage"];

export type Sexe = "h" | "f";

export type Peuple =
  | "humain"
  | "geant"
  | "homme-poisson"
  | "sirene"
  | "mink"
  | "skypieen"
  | "shandia"
  | "nain"
  | "long-bras"
  | "long-jambes"
  | "trois-yeux"
  | "buccaneer"
  | "lunarien";

export type Zone =
  | "east-blue"
  | "west-blue"
  | "north-blue"
  | "south-blue"
  | "paradis"
  | "nouveau-monde"
  | "fond-marin"
  | "ciel"
  | "wano"
  | "elbaf"
  | "calm-belt"
  | "red-line"
  | "impel-down";

/** Milieu de naissance. */
export type Classe =
  | "villageois"
  | "artisan"
  | "pauvre"
  | "marchand"
  | "famille-marine"
  | "famille-pirate"
  | "noble"
  | "hors-la-loi"
  | "esclave"
  | "savant"
  | "famille-revolutionnaire"
  | "samourai"
  | "guerrier-shandia"
  | "kuja"
  | "guerrier-elbaf"
  | "germa"
  | "celeste"
  | "serviteur";

/** Appartenance actuelle. */
export type Camp =
  | "civil"
  | "pirate"
  | "marine"
  | "revolution"
  | "cipher-pol"
  | "chasseur"
  | "pegre"
  | "esclave"
  | "celeste";

export type Metier =
  | "pecheur"
  | "paysan"
  | "cuisinier"
  | "charpentier"
  | "forgeron"
  | "medecin"
  | "archeologue"
  | "navigateur"
  | "marchand"
  | "journaliste"
  | "musicien"
  | "artiste"
  | "mineur"
  | "tireur"
  | "epeiste"
  | "combattant"
  | "voleur"
  | "erudit"
  | "soldat";

export type Reve =
  | "roi-des-pirates"
  | "meilleur-epeiste"
  | "carte-du-monde"
  | "all-blue"
  | "grand-guerrier"
  | "medecin-universel"
  | "verite-histoire"
  | "amiral"
  | "liberer-esclaves"
  | "proteger-village"
  | "voir-le-monde"
  | "famille"
  | "richesse"
  | "vengeance"
  | "navire-legendaire";

export type HakiType = "observation" | "armement" | "rois";

export type FruitType = "paramecia" | "zoan" | "zoan-antique" | "zoan-mythique" | "logia";

export type Role =
  | "mere"
  | "pere"
  | "ami"
  | "rival"
  | "amour"
  | "conjoint"
  | "mentor"
  | "capitaine"
  | "compagnon"
  | "enfant"
  | "frere";

export type Rarete = "commun" | "peu-commun" | "rare" | "tres-rare" | "legendaire";

/** Un texte : une chaîne, ou des variantes tirées au hasard. */
export type Texte = string | string[];

// ── Monde ──

export interface Ile {
  id: string;
  nom: string;
  zone: Zone;
  /** Poids de naissance (‰ de la population mondiale). */
  poids: number;
  /** Mots-clés : "port", "froid", "desert", "base-marine", "royaume", "savant", "hiver", "pauvre"… */
  tags: string[];
  /** Peuples qu'on y trouve à la naissance, avec leur part. Absent = humains. */
  peuples?: Partial<Record<Peuple, number>>;
  /** Années (Kaien) où l'on peut y naître. */
  habitee?: [number, number];
  /** Île sans nom propre : son nom est généré à la naissance. */
  anonyme?: true;
}

/** Un événement de l'Histoire, daté. Chaque vie le reçoit selon où elle est. */
export interface FaitHistorique {
  id: string;
  annee: number;
  /** Manchette du World Economy News (« lu » partout ailleurs). */
  manchette: string;
  /** Où il se passe. */
  zone?: Zone;
  ile?: string;
  /** Rumeur entendue quand on est dans la même zone. */
  rumeur?: string;
  /** Événement joué si la vie est sur place (et que ses conditions passent). */
  vecu?: string;
  /** Événement du futur (projection), affiché en gris. */
  projection?: true;
  /** Ne se produit que dans ces futurs (voir MONDES). */
  monde?: string[];
}

// ── Conditions ──

export type Borne = number | [number, number];

export interface CondJumeau {
  memeZone?: boolean;
  memeIle?: boolean;
  camp?: Camp[];
  pasCamp?: Camp[];
  vivant?: boolean;
  primeMin?: number;
  ageMin?: number;
}

export interface Condition {
  /** Âge (réel) de la vie, bornes incluses. Pour les peuples longévifs, l'âge est ramené à l'échelle humaine. */
  age?: [number, number];
  annee?: [number, number];
  zone?: Zone[];
  pasZone?: Zone[];
  ile?: string[];
  ileTag?: string[];
  peuple?: Peuple[];
  sexe?: Sexe;
  classe?: Classe[];
  camp?: Camp[];
  pasCamp?: Camp[];
  grade?: string[];
  /** Rang minimal dans la hiérarchie de son camp (0 = entrée). */
  rangMin?: number;
  rangMax?: number;
  metier?: Metier[];
  pasMetier?: Metier[];
  sansMetier?: boolean;
  reve?: Reve[];
  reveAccompli?: boolean;
  d?: boolean;
  /** true = a mangé un fruit, false = n'en a pas. */
  fruit?: boolean;
  fruitType?: FruitType[];
  fruitId?: string[];
  fruitEnPoche?: boolean;
  haki?: HakiType[];
  pasHaki?: HakiType[];
  /** Nombre = minimum ; paire = intervalle. */
  jauges?: Partial<Record<Jauge, Borne>>;
  prime?: Borne;
  sante?: Borne;
  flags?: string[];
  pasFlags?: string[];
  unFlag?: string[];
  compteurs?: Record<string, number>;
  /** true : a un lien vivant de ce rôle ; false : n'en a pas. */
  lien?: Partial<Record<Role, boolean>>;
  /** Le trait de naissance. */
  trait?: string[];
  meta?: { flags?: string[]; pasFlags?: string[]; viesMin?: number };
  /** Le futur tiré pour ce monde (voir MONDES). */
  monde?: string[];
  jumeau?: CondJumeau;
  tous?: Condition[];
  un?: Condition[];
  non?: Condition;
}

// ── Effets ──

export interface EffetFruit {
  /** Comment il arrive : sert au texte et au codex. */
  mode: "trouve" | "vole" | "offert" | "achete" | "herite";
  type?: FruitType[];
  id?: string;
  /** Rareté maximale tirée (1 commun → 5 légendaire). */
  rareteMax?: number;
  /** false : on le garde en poche sans le manger. */
  manger?: boolean;
}

export interface EffetLien {
  creer?: Role;
  nom?: string;
  sexe?: Sexe;
  metier?: Metier;
  /** Le lien de ce rôle meurt. */
  mort?: Role;
  /** Le lien de ce rôle s'en va (vivant). */
  perdre?: Role;
  /** Le rôle change (ex. amour → conjoint). */
  devient?: { de: Role; vers: Role };
}

export interface Effet {
  jauges?: Partial<Jauges>;
  sante?: number;
  prime?: number;
  primeX?: number;
  flags?: string[];
  retirerFlags?: string[];
  compteurs?: Record<string, number>;
  camp?: Camp;
  grade?: string;
  /** Monte d'un rang dans son camp. */
  promotion?: boolean;
  metier?: Metier;
  reve?: Reve;
  reveAccompli?: boolean;
  /** Voyage : vers une île précise, ou une île tirée dans une zone (ou ayant un tag). */
  aller?: { ile?: string; zone?: Zone; tag?: string };
  fruit?: EffetFruit;
  mangerFruitEnPoche?: boolean;
  vendreFruitEnPoche?: boolean;
  /** Pose `objet:<id>` de la relique héritée d'une vie passée, s'il y en a une. */
  heriterRelique?: true;
  haki?: HakiType;
  revelerD?: boolean;
  lien?: EffetLien | EffetLien[];
  /** Cause de mort (id de MORTS). */
  mort?: string;
  blessure?: string;
  planifier?: { id: string; dans: [number, number] } | { id: string; dans: [number, number] }[];
  /** Enchaîne immédiatement sur cet événement. */
  suite?: string;
  journal?: string;
  rencontre?: string | string[];
  clinOeil?: string;
  rumeur?: string;
  metaFlags?: string[];
  poneglyphe?: number;
  equipageNom?: string;
  navire?: string;
  surnom?: string;
}

export interface Issue {
  texte?: Texte;
  effets?: Effet;
}

export interface Test {
  /** "pc" = puissance de combat (force + haki + fruit). */
  jauge: Jauge | "pc" | "chance";
  difficulte: number;
  reussite: Issue;
  echec: Issue;
}

export interface Choix {
  label: string;
  detail?: string;
  si?: Condition;
  effets?: Effet;
  texte?: Texte;
  test?: Test;
  /** Poids pour le mode automatique (défaut 1). 0 = jamais choisi en auto. */
  auto?: number;
}

export interface ClinOeil {
  id: string;
  /** Ce que la référence évoque (affiché au codex). */
  ref: string;
  arc?: string;
}

export interface Evenement {
  id: string;
  quand?: Condition;
  poids?: number;
  rarete?: Rarete;
  /** Absent : une seule fois par vie. Nombre : délai minimal (années) avant de revenir. */
  repetable?: number;
  /** 0 à 5 ; 4-5 = climax. */
  tension?: number;
  /** "chaine" : jamais tiré au hasard, seulement via suite/planifier/histoire. */
  pool?: "annee" | "chaine";
  titre?: string;
  texte: Texte;
  effets?: Effet;
  choix?: Choix[];
  clinOeil?: ClinOeil;
  bascule?: boolean;
  /** Personnage canon croisé (id du codex des rencontres). */
  rencontre?: string;
}

// ── Données annexes ──

export interface Fruit {
  id: string;
  nom: string;
  /** Nom court affiché (« le fruit du Feu »). */
  surnom: string;
  type: FruitType;
  /** 1 = commun → 5 = légendaire. */
  rarete: number;
  description: string;
  bonus: Partial<Jauges>;
  primeX?: number;
  /** Années (Kaien) où il est libre dans le monde. Absent = toujours. */
  libre?: [number, number][];
  canon?: boolean;
}

export interface Grade {
  id: string;
  nom: string;
  camp: Camp;
  rang: number;
}

export interface Mort {
  id: string;
  /** « emporté par la fièvre » — accordé avec {m/f}. */
  libelle: string;
  categorie: "naturelle" | "maladie" | "mer" | "combat" | "execution" | "accident" | "sacrifice" | "autre";
}

export interface Rencontre {
  id: string;
  nom: string;
  description: string;
}

export interface Secret {
  id: string;
  nom: string;
  difficulte: 1 | 2 | 3 | 4 | 5;
  conditions: { nom: string; test: Condition }[];
  recompense: string;
  clinOeil?: string;
  /** Indice cryptique (Carnet de rumeurs). */
  rumeur: string;
}

export interface TitreFin {
  si: Condition;
  titre: string;
  priorite: number;
}

export interface Replique {
  si?: CondFin;
  texte: Texte;
  priorite?: number;
}

/** Conditions sur une vie terminée (pour la Tenancière). */
export interface CondFin extends Condition {
  mortCategorie?: Mort["categorie"][];
  mortId?: string[];
  ageMortMin?: number;
  ageMortMax?: number;
  viesMin?: number;
  viesMax?: number;
}

/** Un objet qui peut traverser les vies (Volonté héritée). Posé par le drapeau `objet:<id>`. */
export interface Relique {
  id: string;
  nom: string;
  description: string;
}

export interface QuestionPause {
  age: number;
  si?: Condition;
  texte: Texte;
}
