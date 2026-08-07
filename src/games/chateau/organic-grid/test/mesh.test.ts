import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCellGraph } from "../mesh.ts";
import type { Point } from "../poisson.ts";
import type { Polygon } from "../quads.ts";

test("two quads sharing an edge become mutual neighbors at the right edge index", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: 2, y: 0 },
    { x: 2, y: 1 },
  ];
  const polygons: Polygon[] = [
    { vertices: [0, 1, 2, 3] }, // cell 0
    { vertices: [1, 4, 5, 2] }, // cell 1, partage l'arête (1,2) avec cell 0
  ];

  const grid = buildCellGraph(points, polygons);

  assert.equal(grid.cells.length, 2);
  assert.equal(grid.cells[0].neighborCellIds[1], 1); // edge 1 de cell0 = (1,2)
  assert.equal(grid.cells[1].neighborCellIds[3], 0); // edge 3 de cell1 = (2,1), même arête
  assert.equal(grid.cells[0].neighborCellIds[0], -1); // edge 0 = (0,1), bord, aucune voisine
});

test("every vertex lists the cells that touch it", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  const polygons: Polygon[] = [{ vertices: [0, 1, 2, 3] }];

  const grid = buildCellGraph(points, polygons);

  for (const v of grid.vertices) assert.deepEqual(v.incidentCellIds, [0]);
});

test("cells start unbuilt (height 0, no color)", () => {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  const grid = buildCellGraph(points, [{ vertices: [0, 1, 2, 3] }]);
  assert.equal(grid.cells[0].height, 0);
  assert.equal(grid.cells[0].colorId, null);
});
