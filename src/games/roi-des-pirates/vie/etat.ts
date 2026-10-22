// L'état d'une vie en cours, et ce que le moteur rend à l'interface.

import type {
  Camp, Classe, Evenement, FaitHistorique, Fruit, HakiType, Jauge, Jauges, Metier, Mort, Peuple, Rencontre,
  Relique, Replique, Reve, Role, Secret, Sexe, TitreFin, QuestionPause, Zone,
} from "./types.ts";

export interface Lien {
  id: number;
  role: Role;
  nom: string;
  sexe: Sexe;
  vivant: boolean;
  /** Parti (vivant mais sorti de la vie). */
  parti: boolean;
  metier?: Metier;
  /** Âge de la vie quand le lien est né. */
  depuis: number;
}

export type TypeLigne =
  | "annee"
  | "recit"
  | "resultat"
  | "monde"
  | "rumeur"
  | "jumeau"
  | "clin"
  | "mort"
  | "pause"
  | "gain"
  | "titre";

export interface Ligne {
  age: number;
  annee: number;
  type: TypeLigne;
  texte: string;
  /** Couleur d'humeur, pour l'interface. */
  ton?: "bon" | "mauvais" | "neutre";
  projection?: boolean;
}

export interface ChoixVisible {
  index: number;
  label: string;
  detail?: string;
  risque?: boolean;
}

export interface Decision {
  type: "evenement" | "pause";
  id: string;
  titre?: string;
  texte: string;
  choix: ChoixVisible[];
  bascule?: boolean;
  age: number;
}

export interface CaseGrille {
  age: number;
  annee: number;
  camp: Camp;
  zone: Zone;
  tension: number;
  /** Quelque chose de marquant cette année-là. */
  marque?: string;
}

export interface MortVecue {
  id: string;
  age: number;
  annee: number;
  texte: string;
  /** Mort pendant un événement ou de causes « naturelles ». */
  evenement?: string;
}

export interface EtatVie {
  graine: number;
  /** Le futur de ce monde après 1524 (partagé avec les jumeaux). */
  monde: string;
  prenom: string;
  famille: string;
  sexe: Sexe;
  peuple: Peuple;
  classe: Classe;
  d: boolean;
  dConnu: boolean;
  traits: string[];
  /** Plafond caché du Haki. */
  potentielHaki: number;

  anneeNaissance: number;
  annee: number;
  age: number;
  /** Années par tour (2 pour les peuples très longévifs). */
  pas: number;

  zone: Zone;
  ile: string;
  nomIle: string;
  ileNatale: string;
  nomIleNatale: string;
  zoneNatale: Zone;
  zonesVisitees: Zone[];
  ilesVisitees: string[];

  jauges: Jauges;
  sante: number;
  prime: number;
  primeMax: number;

  camp: Camp;
  grade?: string;
  metier?: Metier;
  reve?: Reve;
  reveAccompli: boolean;

  fruit?: string;
  fruitEnPoche?: string;
  fruitsManges: number;
  haki: HakiType[];

  flags: string[];
  /** Tous les drapeaux posés au moins une fois (pour les secrets). */
  flagsVus: string[];
  compteurs: Record<string, number>;
  liens: Lien[];
  prochainLien: number;

  equipageNom?: string;
  navire?: string;
  surnom?: string;

  planifies: { id: string; annee: number }[];
  /** Dernière année où chaque événement a été vécu. */
  vus: Record<string, number>;

  journal: Ligne[];
  grille: CaseGrille[];
  focus: Jauge | "repos";

  vivant: boolean;
  mort?: MortVecue;

  rencontres: string[];
  clins: string[];
  rumeurs: string[];
  poneglyphes: number[];
  notes: Record<number, string>;
  pausesFaites: number[];
  /** Pour les « jumeaux » : quelques faits marquants seulement. */
  faits: Ligne[];
}

export interface Contenu {
  evenements: Evenement[];
  histoire: FaitHistorique[];
  fruits: Fruit[];
  morts: Mort[];
  rencontres: Rencontre[];
  secrets: Secret[];
  titres: TitreFin[];
  repliques: Replique[];
  pauses: QuestionPause[];
  reliques: Relique[];
}

/** Ce que la vie sait des vies passées (lecture seule). */
export interface MetaLecture {
  flags: Set<string>;
  vies: number;
}

/** La Volonté héritée d'une vie passée. */
export interface Volonte {
  type: "relique" | "reve" | "rival" | "savoir" | "promesse" | "fruit";
  libelle: string;
  /** Nom de la vie qui l'a transmise. */
  de: string;
  /** Selon le type : id de relique, rêve, nom du rival, id de fruit… */
  valeur: string;
  /** Les vies qui l'ont portée (chronique de la relique). */
  chronique: string[];
}
