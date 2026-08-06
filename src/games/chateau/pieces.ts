export type PieceCategory = "structure" | "toiture" | "verticalite" | "decor";

// "edge" : la pièce longe un seul bord de sa cellule (les 4 murs/créneau/herse partagent
// la même constante WALL_EDGE_Z dans piece-geometry.ts) — un autre bord de la MÊME cellule,
// au MÊME niveau, reste donc libre pour une pièce perpendiculaire (former un coin ou fermer
// une pièce en posant un mur sur chacun des 4 bords d'une même cellule). "cell" : la pièce
// occupe (ou domine visuellement) toute la cellule, quelle que soit sa rotation — deux
// pièces "cell" au même niveau se chevaucheraient forcément, donc la seconde continue
// d'empiler par-dessus, comme avant.
export type Footprint = "cell" | "edge";

export interface PieceDef {
  id: string;
  category: PieceCategory;
  label: string;
  rotatable: boolean;
  footprint: Footprint;
}

export const PIECES: PieceDef[] = [
  { id: "mur-plein", category: "structure", label: "Mur plein", rotatable: true, footprint: "edge" },
  { id: "mur-ouverture", category: "structure", label: "Mur avec ouverture", rotatable: true, footprint: "edge" },
  { id: "pilier", category: "structure", label: "Pilier", rotatable: false, footprint: "cell" },
  { id: "sol", category: "structure", label: "Sol / plateforme", rotatable: false, footprint: "cell" },
  { id: "toit-pan", category: "toiture", label: "Pan de toit", rotatable: true, footprint: "cell" },
  { id: "faitage", category: "toiture", label: "Faîtage", rotatable: true, footprint: "cell" },
  { id: "tourelle-conique", category: "toiture", label: "Tourelle conique", rotatable: false, footprint: "cell" },
  { id: "tour-ronde", category: "verticalite", label: "Tour ronde", rotatable: false, footprint: "cell" },
  { id: "tour-carree", category: "verticalite", label: "Tour carrée", rotatable: false, footprint: "cell" },
  { id: "escalier", category: "verticalite", label: "Escalier extérieur", rotatable: true, footprint: "cell" },
  { id: "creneau", category: "decor", label: "Créneau", rotatable: true, footprint: "edge" },
  { id: "pont-levis", category: "decor", label: "Pont-levis", rotatable: true, footprint: "cell" },
  { id: "grille-herse", category: "decor", label: "Grille / herse", rotatable: true, footprint: "edge" },
  { id: "torche", category: "decor", label: "Torche", rotatable: true, footprint: "cell" },
  { id: "blason", category: "decor", label: "Blason", rotatable: true, footprint: "cell" },
  { id: "plante-grimpante", category: "decor", label: "Plante grimpante", rotatable: true, footprint: "cell" },
];

export function pieceById(id: string): PieceDef | undefined {
  return PIECES.find((p) => p.id === id);
}
