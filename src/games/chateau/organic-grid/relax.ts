import type { Point } from "./poisson.ts";
import type { Polygon } from "./quads.ts";

export interface RelaxOptions {
  iterations: number;
  targetEdgeLength: number;
  strength: number; // 0..1, fraction de la correction appliquée par itération
}

// Simplification assumée par rapport au document de conception : au lieu de dériver la
// formule fermée du "carré optimal" par arctan (technique de référence, risquée à
// implémenter sans pouvoir la vérifier numériquement pas à pas), cette relaxation utilise
// un lissage par ressorts — chaque sommet est tiré vers ses voisins pour que la longueur
// de chaque arête se rapproche de `targetEdgeLength`. Même effet recherché (rapprocher la
// grille d'un aspect régulier sans la rendre parfaitement carrée), technique standard et
// vérifiable. Un sommet en bordure du monde a moins de voisins : la force qu'il reçoit est
// simplement moins contrainte (normalisée par son propre nombre de voisins, pas par un
// nombre fixe), ce qui suffit à éviter une divergence — pas besoin de traitement spécial
// des bords pour ce chantier.
export function relax(points: Point[], polygons: Polygon[], options: RelaxOptions): void {
  const neighbors: Set<number>[] = points.map(() => new Set<number>());
  for (const poly of polygons) {
    const v = poly.vertices;
    for (let i = 0; i < v.length; i++) {
      const a = v[i];
      const b = v[(i + 1) % v.length];
      neighbors[a].add(b);
      neighbors[b].add(a);
    }
  }

  for (let iter = 0; iter < options.iterations; iter++) {
    const forces = points.map(() => ({ x: 0, y: 0 }));

    for (let i = 0; i < points.length; i++) {
      const neigh = neighbors[i];
      if (neigh.size === 0) continue;
      const p = points[i];
      for (const j of neigh) {
        const q = points[j];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const dist = Math.hypot(dx, dy) || 1e-6;
        const correction = (dist - options.targetEdgeLength) / dist;
        forces[i].x += dx * correction;
        forces[i].y += dy * correction;
      }
      forces[i].x /= neigh.size;
      forces[i].y /= neigh.size;
    }

    for (let i = 0; i < points.length; i++) {
      points[i].x += forces[i].x * options.strength;
      points[i].y += forces[i].y * options.strength;
    }
  }
}
