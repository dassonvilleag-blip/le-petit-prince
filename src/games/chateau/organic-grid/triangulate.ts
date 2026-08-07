import Delaunator from "delaunator";
import type { Point } from "./poisson.ts";

export interface Triangulation {
  // Uint32Array de longueur (nb de triangles × 3) : chaque groupe de 3 est un triangle,
  // dans le sens anti-horaire (garanti par delaunator).
  triangles: Uint32Array;
  // Int32Array de même longueur : halfedges[i] est l'index du demi-bord jumeau dans le
  // triangle voisin qui partage le bord de triangles[i], ou -1 si ce bord est sur
  // l'enveloppe convexe (aucun voisin).
  halfedges: Int32Array;
}

export function triangulate(points: Point[]): Triangulation {
  const delaunay = Delaunator.from(
    points,
    (p) => p.x,
    (p) => p.y,
  );
  return { triangles: delaunay.triangles, halfedges: delaunay.halfedges };
}
