export type PieceCategory = "structure" | "toiture" | "verticalite" | "decor";

export interface PieceDef {
  id: string;
  category: PieceCategory;
  label: string;
  rotatable: boolean;
}

export const PIECES: PieceDef[] = [
  { id: "mur-plein", category: "structure", label: "Mur plein", rotatable: true },
  { id: "mur-ouverture", category: "structure", label: "Mur avec ouverture", rotatable: true },
  { id: "pilier", category: "structure", label: "Pilier", rotatable: false },
  { id: "sol", category: "structure", label: "Sol / plateforme", rotatable: false },
  { id: "toit-pan", category: "toiture", label: "Pan de toit", rotatable: true },
  { id: "faitage", category: "toiture", label: "Faîtage", rotatable: true },
  { id: "tourelle-conique", category: "toiture", label: "Tourelle conique", rotatable: false },
  { id: "tour-ronde", category: "verticalite", label: "Tour ronde", rotatable: false },
  { id: "tour-carree", category: "verticalite", label: "Tour carrée", rotatable: false },
  { id: "escalier", category: "verticalite", label: "Escalier extérieur", rotatable: true },
  { id: "creneau", category: "decor", label: "Créneau", rotatable: true },
  { id: "pont-levis", category: "decor", label: "Pont-levis", rotatable: true },
  { id: "grille-herse", category: "decor", label: "Grille / herse", rotatable: true },
  { id: "torche", category: "decor", label: "Torche", rotatable: true },
  { id: "blason", category: "decor", label: "Blason", rotatable: true },
  { id: "plante-grimpante", category: "decor", label: "Plante grimpante", rotatable: true },
];

export function pieceById(id: string): PieceDef | undefined {
  return PIECES.find((p) => p.id === id);
}
