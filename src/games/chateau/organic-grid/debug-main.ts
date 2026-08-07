import { buildOrganicGrid } from "./organic-grid.ts";

const canvas = document.getElementById("debug-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const grid = buildOrganicGrid({
  width: 600,
  height: 600,
  cellSpacing: 60,
  subdivisions: 1,
  relaxIterations: 20,
  seed: 42,
});

ctx.translate(50, 50);
ctx.strokeStyle = "#7fd4c1";
ctx.lineWidth = 1.5;

for (const cell of grid.cells) {
  ctx.beginPath();
  cell.vertexIndices.forEach((vIndex, i) => {
    const v = grid.vertices[vIndex];
    if (i === 0) ctx.moveTo(v.x, v.y);
    else ctx.lineTo(v.x, v.y);
  });
  ctx.closePath();
  ctx.stroke();
}

export {};
