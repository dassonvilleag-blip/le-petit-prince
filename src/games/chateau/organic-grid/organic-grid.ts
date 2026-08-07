import { poissonDiskSample, type Point } from "./poisson.ts";
import { triangulate } from "./triangulate.ts";
import { mergeTrianglesToQuads, type Polygon } from "./quads.ts";
import { VertexPool, subdivide } from "./subdivide.ts";
import { relax } from "./relax.ts";
import { buildCellGraph, type OrganicGrid } from "./mesh.ts";

export interface OrganicGridOptions {
  width: number;
  height: number;
  cellSpacing: number; // distance minimale entre points avant subdivision
  subdivisions: number; // nombre de passages de subdivision (contrôle la densité finale)
  relaxIterations: number;
  seed: number;
}

export function buildOrganicGrid(options: OrganicGridOptions): OrganicGrid {
  const samples = poissonDiskSample(options.width, options.height, options.cellSpacing, options.seed);
  const points: Point[] = samples.map((p) => ({ ...p }));

  const { triangles, halfedges } = triangulate(points);
  let polygons: Polygon[] = mergeTrianglesToQuads(points, triangles, halfedges);

  const pool = new VertexPool(points);
  for (let i = 0; i < options.subdivisions; i++) {
    polygons = subdivide(polygons, pool);
  }

  const targetEdgeLength = options.cellSpacing / Math.pow(2, options.subdivisions);
  relax(pool.points, polygons, { iterations: options.relaxIterations, targetEdgeLength, strength: 0.3 });

  return buildCellGraph(pool.points, polygons);
}
