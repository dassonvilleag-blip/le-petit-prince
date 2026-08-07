import type { Point } from "./poisson.ts";
import type { Polygon } from "./quads.ts";

// Garde un point milieu d'arête unique par paire de sommets, partagé entre les polygones
// voisins qui touchent cette arête — sans ça, la subdivision dupliquerait le point à
// chaque polygone et la grille ne serait plus connectée (chaque cellule aurait ses propres
// sommets, sans voisinage partagé).
export class VertexPool {
  points: Point[];
  private midpointCache = new Map<string, number>();

  constructor(points: Point[]) {
    this.points = points;
  }

  private key(a: number, b: number): string {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
  }

  midpoint(a: number, b: number): number {
    const key = this.key(a, b);
    const cached = this.midpointCache.get(key);
    if (cached !== undefined) return cached;
    const pa = this.points[a];
    const pb = this.points[b];
    const index = this.points.length;
    this.points.push({ x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 });
    this.midpointCache.set(key, index);
    return index;
  }

  centroid(vertices: number[]): number {
    let x = 0;
    let y = 0;
    for (const v of vertices) {
      x += this.points[v].x;
      y += this.points[v].y;
    }
    const index = this.points.length;
    this.points.push({ x: x / vertices.length, y: y / vertices.length });
    return index; // le centroïde n'est jamais partagé entre polygones, toujours un nouveau point
  }
}

// Subdivise chaque polygone (triangle ou quadrilatère) en autant de quadrilatères qu'il a
// de sommets, via ses milieux d'arête et son centroïde — après un passage, tous les
// polygones sont des quadrilatères, y compris ceux qui étaient des triangles.
export function subdivide(polygons: Polygon[], pool: VertexPool): Polygon[] {
  const result: Polygon[] = [];
  for (const poly of polygons) {
    const v = poly.vertices;
    const n = v.length;
    const mids = v.map((_, i) => pool.midpoint(v[i], v[(i + 1) % n]));
    const center = pool.centroid(v);
    for (let i = 0; i < n; i++) {
      const prevMid = mids[(i - 1 + n) % n];
      result.push({ vertices: [v[i], mids[i], center, prevMid] });
    }
  }
  return result;
}
