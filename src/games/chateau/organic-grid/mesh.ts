import type { Point } from "./poisson.ts";
import type { Polygon } from "./quads.ts";

export interface OrganicCell {
  id: number;
  vertexIndices: number[]; // indices dans OrganicGrid.vertices, dans l'ordre du contour
  // même longueur/ordre que vertexIndices : neighborCellIds[i] est la cellule voisine qui
  // partage l'arête (vertexIndices[i] -> vertexIndices[i+1]), ou -1 si c'est un bord.
  neighborCellIds: number[];
  height: number; // repris de l'actuel Cell (grid.ts) — 0 = vide, ≥1 = construit
  colorId: string | null;
}

export interface OrganicVertex extends Point {
  incidentCellIds: number[]; // nécessaire pour la classification par sommet du chantier 2
}

export interface OrganicGrid {
  cells: OrganicCell[];
  vertices: OrganicVertex[];
}

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function buildCellGraph(points: Point[], polygons: Polygon[]): OrganicGrid {
  const vertices: OrganicVertex[] = points.map((p) => ({ x: p.x, y: p.y, incidentCellIds: [] }));
  const cells: OrganicCell[] = polygons.map((poly, id) => ({
    id,
    vertexIndices: poly.vertices,
    neighborCellIds: new Array(poly.vertices.length).fill(-1),
    height: 0,
    colorId: null,
  }));

  for (const cell of cells) {
    for (const v of cell.vertexIndices) vertices[v].incidentCellIds.push(cell.id);
  }

  const edgeOwner = new Map<string, { cellId: number; edgeIndex: number }>();
  // Assumes a proper 2-manifold mesh: each edge is touched by at most 2 cells.
  // If a third cell claimed an already-owned edge, only the first two cells would be linked,
  // and the third's neighbor slot for that edge would remain unset (-1).
  for (const cell of cells) {
    const n = cell.vertexIndices.length;
    for (let i = 0; i < n; i++) {
      const a = cell.vertexIndices[i];
      const b = cell.vertexIndices[(i + 1) % n];
      const key = edgeKey(a, b);
      const existing = edgeOwner.get(key);
      if (existing) {
        cell.neighborCellIds[i] = existing.cellId;
        cells[existing.cellId].neighborCellIds[existing.edgeIndex] = cell.id;
      } else {
        edgeOwner.set(key, { cellId: cell.id, edgeIndex: i });
      }
    }
  }

  return { cells, vertices };
}
