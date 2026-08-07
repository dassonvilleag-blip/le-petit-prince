import type { Point } from "./poisson.ts";

export interface Polygon {
  vertices: number[]; // indices dans le tableau de points, dans l'ordre du contour
}

const MIN_ANGLE = 0.2 * Math.PI;
const MAX_ANGLE = 0.9 * Math.PI;

function nextEdge(e: number): number {
  return e % 3 === 2 ? e - 2 : e + 1;
}

function prevEdge(e: number): number {
  return e % 3 === 0 ? e + 2 : e - 1;
}

function triangleVertices(t: number, triangles: Uint32Array): number[] {
  return [triangles[t * 3], triangles[t * 3 + 1], triangles[t * 3 + 2]];
}

// Fusionne les deux triangles qui partagent le bord `edge` (dans le triangle A) / `opposite`
// (dans le triangle B, le demi-bord jumeau) en un quadrilatère. Ordre dérivé du sens de
// parcours réel des deux triangles (pas deviné) : le contour de A est a0→a1→apexA→a0, celui
// de B est a1→a0→apexB→a1 (le demi-bord jumeau parcourt le bord partagé en sens inverse,
// convention documentée de delaunator) — en retirant le bord interne partagé, le contour
// combiné est apexA→a0→apexB→a1.
function mergeQuad(triangles: Uint32Array, edge: number, opposite: number): number[] {
  const a0 = triangles[edge];
  const a1 = triangles[nextEdge(edge)];
  const apexA = triangles[prevEdge(edge)];
  const apexB = triangles[prevEdge(opposite)];
  return [apexA, a0, apexB, a1];
}

function turnCross(p0: Point, p1: Point, p2: Point): number {
  const ux = p1.x - p0.x;
  const uy = p1.y - p0.y;
  const vx = p2.x - p1.x;
  const vy = p2.y - p1.y;
  return ux * vy - uy * vx;
}

export function isConvexQuad(quad: number[], points: Point[]): boolean {
  const n = quad.length;
  let sign = 0;
  for (let i = 0; i < n; i++) {
    const p0 = points[quad[i]];
    const p1 = points[quad[(i + 1) % n]];
    const p2 = points[quad[(i + 2) % n]];
    const cross = turnCross(p0, p1, p2);
    if (Math.abs(cross) < 1e-9) continue; // presque colinéaire : toléré, pas décisif
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

function interiorAngle(prev: Point, corner: Point, next: Point): number {
  const v1x = prev.x - corner.x;
  const v1y = prev.y - corner.y;
  const v2x = next.x - corner.x;
  const v2y = next.y - corner.y;
  const dot = v1x * v2x + v1y * v2y;
  const det = v1x * v2y - v1y * v2x;
  return Math.atan2(Math.abs(det), dot); // dans [0, π]
}

export function anglesWithinRange(quad: number[], points: Point[]): boolean {
  const n = quad.length;
  for (let i = 0; i < n; i++) {
    const prev = points[quad[(i - 1 + n) % n]];
    const corner = points[quad[i]];
    const next = points[quad[(i + 1) % n]];
    const angle = interiorAngle(prev, corner, next);
    if (angle < MIN_ANGLE || angle > MAX_ANGLE) return false;
  }
  return true;
}

// Fusionne les triangles adjacents deux par deux quand le quadrilatère résultant est
// convexe et a des angles raisonnables ; les triangles qui n'ont aucune fusion valide
// restent des triangles (voir docs/superpowers/specs/2026-08-07-chateau-grille-organique-design.md).
// Parcours déterministe (ordre des triangles, puis ordre de leurs 3 bords) : premier
// voisin valide trouvé, pas de recherche du "meilleur" appariement — suffisant pour
// reproduire l'esprit de la technique documentée.
export function mergeTrianglesToQuads(points: Point[], triangles: Uint32Array, halfedges: Int32Array): Polygon[] {
  const numTriangles = triangles.length / 3;
  const used = new Array(numTriangles).fill(false);
  const polygons: Polygon[] = [];

  for (let t = 0; t < numTriangles; t++) {
    if (used[t]) continue;
    let merged = false;

    for (let corner = 0; corner < 3; corner++) {
      const edge = t * 3 + corner;
      const opposite = halfedges[edge];
      if (opposite === -1) continue;
      const neighbor = Math.floor(opposite / 3);
      if (used[neighbor]) continue;

      const quad = mergeQuad(triangles, edge, opposite);
      if (!isConvexQuad(quad, points)) continue;
      if (!anglesWithinRange(quad, points)) continue;

      polygons.push({ vertices: quad });
      used[t] = true;
      used[neighbor] = true;
      merged = true;
      break;
    }

    if (!merged) {
      polygons.push({ vertices: triangleVertices(t, triangles) });
      used[t] = true;
    }
  }

  return polygons;
}
