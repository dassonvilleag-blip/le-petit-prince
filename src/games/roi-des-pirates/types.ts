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

export interface Choice {
  text: string;
  sub?: string;
  effects: Partial<Stats>;
  next: string;
}

export interface StoryNode {
  id: string;
  arc?: ArcId;
  title?: string;
  text: string;
  svg: string;
  choices: Choice[];
  isEnding?: true;
  endingId?: EndingId;
}
