import { PLOT_SIZE, MIN_TERRAIN_LEVEL, MAX_TERRAIN_LEVEL } from "./constants.ts";

export type Heightmap = number[][]; // grid[z][x], (PLOT_SIZE+1) x (PLOT_SIZE+1) vertices

export function createHeightmap(): Heightmap {
  return Array.from({ length: PLOT_SIZE + 1 }, () => Array(PLOT_SIZE + 1).fill(0));
}

function inBounds(x: number, z: number): boolean {
  return x >= 0 && x <= PLOT_SIZE && z >= 0 && z <= PLOT_SIZE;
}

export function heightAt(grid: Heightmap, x: number, z: number): number {
  return inBounds(x, z) ? grid[z][x] : 0;
}

function withVertex(grid: Heightmap, x: number, z: number, next: number): Heightmap {
  if (!inBounds(x, z)) return grid;
  const clamped = Math.max(MIN_TERRAIN_LEVEL, Math.min(MAX_TERRAIN_LEVEL, next));
  return grid.map((row, rz) => (rz !== z ? row : row.map((h, rx) => (rx !== x ? h : clamped))));
}

export function raiseVertex(grid: Heightmap, x: number, z: number): Heightmap {
  return withVertex(grid, x, z, heightAt(grid, x, z) + 1);
}

export function lowerVertex(grid: Heightmap, x: number, z: number): Heightmap {
  return withVertex(grid, x, z, heightAt(grid, x, z) - 1);
}

export function terrainLevelAtCell(grid: Heightmap, cellX: number, cellZ: number): number {
  const corners = [
    heightAt(grid, cellX, cellZ),
    heightAt(grid, cellX + 1, cellZ),
    heightAt(grid, cellX, cellZ + 1),
    heightAt(grid, cellX + 1, cellZ + 1),
  ];
  const avg = corners.reduce((a, b) => a + b, 0) / 4;
  return Math.round(avg);
}
