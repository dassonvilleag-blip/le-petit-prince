import { GRID_SIZE, MAX_FLOORS } from "./constants.ts";

export interface Cell {
  height: number; // 0 = eau/vide
  colorId: string;
}

export type Grid = Cell[][]; // grid[cellZ][cellX], GRID_SIZE x GRID_SIZE cases

const EMPTY_CELL: Cell = { height: 0, colorId: "" };

export function createGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ height: 0, colorId: "" })),
  );
}

function inBounds(cellX: number, cellZ: number): boolean {
  return cellX >= 0 && cellX < GRID_SIZE && cellZ >= 0 && cellZ < GRID_SIZE;
}

export function cellAt(grid: Grid, cellX: number, cellZ: number): Cell {
  return inBounds(cellX, cellZ) ? grid[cellZ][cellX] : EMPTY_CELL;
}

export function heightAt(grid: Grid, cellX: number, cellZ: number): number {
  return cellAt(grid, cellX, cellZ).height;
}

function withCell(grid: Grid, cellX: number, cellZ: number, next: Cell): Grid {
  if (!inBounds(cellX, cellZ)) return grid;
  return grid.map((row, z) => (z !== cellZ ? row : row.map((cell, x) => (x !== cellX ? cell : next))));
}

export function growCell(grid: Grid, cellX: number, cellZ: number, colorId: string): Grid {
  const current = cellAt(grid, cellX, cellZ);
  if (current.height === 0) {
    return withCell(grid, cellX, cellZ, { height: 1, colorId });
  }
  // Une fois qu'une case a une couleur, elle la garde pour tous les étages suivants —
  // le `colorId` fourni ici est ignoré volontairement (pas de "repeinte" en cours de
  // construction pour cette v1).
  return withCell(grid, cellX, cellZ, {
    height: Math.min(MAX_FLOORS, current.height + 1),
    colorId: current.colorId,
  });
}

export function shrinkCell(grid: Grid, cellX: number, cellZ: number): Grid {
  const current = cellAt(grid, cellX, cellZ);
  const height = Math.max(0, current.height - 1);
  return withCell(grid, cellX, cellZ, { height, colorId: height === 0 ? "" : current.colorId });
}
