export interface Stats {
  force: number;
  notoriete: number;
  equipage: number;
  fruitDuDemon: number;
}

export type EndingId =
  | "fin-roi-des-pirates"
  | "fin-legende"
  | "fin-retraite"
  | "fin-capture";

export type ArcId = "east-blue" | "grand-line" | "nouveau-monde" | "final";

export type FruitType = "Zoan" | "Paramecia" | "Logia";

export interface Fruit {
  id: string;
  nom: string;
  type: FruitType;
  description: string;
  effects: Partial<Stats>;
}

export interface DuelOutcome {
  /** Force cachée de l'adversaire (ou difficulté, si statUsed n'est pas "force"). */
  opponentPower: number;
  /** Stat du joueur comparée à opponentPower. Par défaut "force". */
  statUsed?: keyof Stats;
  win: string;
  loseMinor: string;
  loseMajor: string;
  /** Drapeaux posés uniquement en cas de victoire (ex: recrutement réussi). */
  winFlags?: string[];
  /** Tire un fruit du démon (aléatoire) en cas de victoire, stocké comme "fruit en attente". */
  winPicksFruit?: FruitType | "any";
  /** Tire un fruit du démon en cas de défaite légère (ex: échec partiel d'une quête). */
  loseMinorPicksFruit?: FruitType | "any";
  /** Drapeau de blessure permanente posé en cas de défaite grave. */
  injuryFlag?: string;
  /** Si le fruit déjà mangé par le joueur est d'un de ces types, victoire automatique (contre un adversaire sans Haki). */
  counterFruitTypes?: FruitType[];
}

export interface Choice {
  text: string;
  sub?: string;
  effects: Partial<Stats>;
  /** Nœud suivant. Absent si `duel` est défini (le duel détermine la suite). */
  next?: string;
  /** Drapeaux posés inconditionnellement quand ce choix est pris. */
  setFlags?: string[];
  /** Ce choix n'est affiché que si tous ces drapeaux sont posés. */
  requiresFlags?: string[];
  /** Ce choix est masqué si un de ces drapeaux est posé. */
  forbidsFlags?: string[];
  /** Déclenche une résolution de duel au lieu d'utiliser `next` directement. */
  duel?: DuelOutcome;
  /** Tire un fruit candidat (sans l'appliquer) et le stocke comme "fruit en attente". */
  pickFruitCandidate?: { type?: FruitType };
  /** Applique les effets du "fruit en attente", pose son drapeau `fruit-<id>`, puis va à `next`. */
  eatPendingFruit?: { next: string };
}

export interface StoryNode {
  id: string;
  arc?: ArcId;
  title?: string;
  subtitle: string;
  text: string | ((flags: Set<string>) => string);
  svg: string;
  choices: Choice[];
  isEnding?: true;
  endingId?: EndingId;
}
