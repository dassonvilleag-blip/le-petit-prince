import { mulberry32 } from "./random.ts";

export interface Point {
  x: number;
  y: number;
}

// Échantillonnage de Poisson-disk (algorithme de Bridson) : produit des points répartis
// aléatoirement mais jamais plus proches que `minDistance` les uns des autres — la base de
// la grille organique (voir docs/superpowers/specs/2026-08-07-chateau-grille-organique-design.md).
export function poissonDiskSample(
  width: number,
  height: number,
  minDistance: number,
  seed: number,
  maxAttempts = 30,
): Point[] {
  const rng = mulberry32(seed);
  const cellSize = minDistance / Math.SQRT2;
  const gridWidth = Math.max(1, Math.ceil(width / cellSize));
  const gridHeight = Math.max(1, Math.ceil(height / cellSize));
  const grid: (Point | null)[] = new Array(gridWidth * gridHeight).fill(null);
  const points: Point[] = [];
  const active: Point[] = [];

  const gridIndexOf = (p: Point): number => {
    const gx = Math.min(gridWidth - 1, Math.floor(p.x / cellSize));
    const gy = Math.min(gridHeight - 1, Math.floor(p.y / cellSize));
    return gy * gridWidth + gx;
  };

  const farEnough = (candidate: Point): boolean => {
    const gx = Math.floor(candidate.x / cellSize);
    const gy = Math.floor(candidate.y / cellSize);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= gridWidth || ny >= gridHeight) continue;
        const neighbor = grid[ny * gridWidth + nx];
        if (!neighbor) continue;
        const ddx = neighbor.x - candidate.x;
        const ddy = neighbor.y - candidate.y;
        if (ddx * ddx + ddy * ddy < minDistance * minDistance) return false;
      }
    }
    return true;
  };

  const first: Point = { x: rng() * width, y: rng() * height };
  points.push(first);
  active.push(first);
  grid[gridIndexOf(first)] = first;

  while (active.length > 0) {
    const activeIndex = Math.floor(rng() * active.length);
    const origin = active[activeIndex];
    let placed = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const angle = rng() * Math.PI * 2;
      const radius = minDistance * (1 + rng());
      const candidate: Point = {
        x: origin.x + Math.cos(angle) * radius,
        y: origin.y + Math.sin(angle) * radius,
      };
      if (candidate.x < 0 || candidate.y < 0 || candidate.x >= width || candidate.y >= height) continue;
      if (!farEnough(candidate)) continue;

      points.push(candidate);
      active.push(candidate);
      grid[gridIndexOf(candidate)] = candidate;
      placed = true;
      break;
    }

    if (!placed) active.splice(activeIndex, 1);
  }

  return points;
}
