// src/games/chateau/placement.ts
// note : extensions .ts nécessaires — voir la note dans terrain.ts (Task 2), même raison :
// ce fichier est chargé transitivement par placement.test.ts sous node --experimental-strip-types.
import { PLOT_SIZE, MAX_STACK_HEIGHT } from "./constants.ts";
import { terrainLevelAtCell, type Heightmap } from "./terrain.ts";

export type Rotation = 0 | 90 | 180 | 270;

export interface PlacedPiece {
  id: string;
  pieceId: string;
  cellX: number;
  cellZ: number;
  level: number;
  rotation: Rotation;
  materialId: string;
}

export interface PlacementResult {
  valid: boolean;
  level: number;
  reason?: string;
}

export function resolvePlacement(
  cellX: number,
  cellZ: number,
  terrain: Heightmap,
  existing: PlacedPiece[],
): PlacementResult {
  if (cellX < 0 || cellX >= PLOT_SIZE || cellZ < 0 || cellZ >= PLOT_SIZE) {
    return { valid: false, level: 0, reason: "hors de la parcelle" };
  }
  const stackLevels = existing
    .filter((p) => p.cellX === cellX && p.cellZ === cellZ)
    .map((p) => p.level);
  const groundLevel = terrainLevelAtCell(terrain, cellX, cellZ);
  const nextLevel = stackLevels.length === 0 ? groundLevel : Math.max(...stackLevels) + 1;
  if (nextLevel - groundLevel >= MAX_STACK_HEIGHT) {
    return { valid: false, level: nextLevel, reason: "pile trop haute" };
  }
  return { valid: true, level: nextLevel };
}

export function removeTopPiece(cellX: number, cellZ: number, existing: PlacedPiece[]): PlacedPiece[] {
  const stack = existing.filter((p) => p.cellX === cellX && p.cellZ === cellZ);
  if (stack.length === 0) return existing;
  const top = stack.reduce((a, b) => (a.level > b.level ? a : b));
  return existing.filter((p) => p !== top);
}
