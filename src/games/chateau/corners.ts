import { heightAt, type Grid } from "./grid.ts";

export type CornerRounding = "flush" | "convex" | "concave";

export interface CellCorners {
  pp: CornerRounding; // coin (+x, +z) : voisins (cellX+1,cellZ) et (cellX,cellZ+1), diagonale (cellX+1,cellZ+1)
  pn: CornerRounding; // coin (+x, -z) : voisins (cellX+1,cellZ) et (cellX,cellZ-1), diagonale (cellX+1,cellZ-1)
  np: CornerRounding; // coin (-x, +z) : voisins (cellX-1,cellZ) et (cellX,cellZ+1), diagonale (cellX-1,cellZ+1)
  nn: CornerRounding; // coin (-x, -z) : voisins (cellX-1,cellZ) et (cellX,cellZ-1), diagonale (cellX-1,cellZ-1)
}

// La hauteur exacte n'est jamais pertinente ici, seulement "vide ou pas" : la
// classification des coins est calculée une seule fois par colonne (Task 7), pas par
// étage — un voisin à 1 étage ou à 8 étages donne le même résultat.
function isFilled(grid: Grid, cellX: number, cellZ: number): boolean {
  return heightAt(grid, cellX, cellZ) > 0;
}

// Ne regarde que 3 voisines pour classer UN coin : les 2 côtés qui le touchent, et la
// diagonale. Ne dépend jamais de la case elle-même — l'appelant ne classe que des cases
// déjà remplies, mais la fonction n'a pas besoin de le vérifier.
function classifyCorner(grid: Grid, cellX: number, cellZ: number, dx: 1 | -1, dz: 1 | -1): CornerRounding {
  const sideXFilled = isFilled(grid, cellX + dx, cellZ);
  const sideZFilled = isFilled(grid, cellX, cellZ + dz);
  if (!sideXFilled && !sideZFilled) return "convex";
  if (sideXFilled && sideZFilled) {
    const diagFilled = isFilled(grid, cellX + dx, cellZ + dz);
    return diagFilled ? "flush" : "concave";
  }
  return "flush"; // un seul côté rempli : le mur continue tout droit, pas de coin ici
}

export function classifyCorners(grid: Grid, cellX: number, cellZ: number): CellCorners {
  return {
    pp: classifyCorner(grid, cellX, cellZ, 1, 1),
    pn: classifyCorner(grid, cellX, cellZ, 1, -1),
    np: classifyCorner(grid, cellX, cellZ, -1, 1),
    nn: classifyCorner(grid, cellX, cellZ, -1, -1),
  };
}
