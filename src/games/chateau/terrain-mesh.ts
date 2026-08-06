// src/games/chateau/terrain-mesh.ts
import * as THREE from "three";
import type { Heightmap } from "./terrain";
import { PLOT_SIZE, CELL_SIZE, LEVEL_HEIGHT, WATER_LEVEL } from "./constants";

export function buildTerrainGeometry(grid: Heightmap): THREE.BufferGeometry {
  const verticesPerSide = PLOT_SIZE + 1;
  const positions = new Float32Array(verticesPerSide * verticesPerSide * 3);
  const uvs = new Float32Array(verticesPerSide * verticesPerSide * 2);
  let vi = 0;
  let ui = 0;
  for (let iz = 0; iz < verticesPerSide; iz++) {
    for (let ix = 0; ix < verticesPerSide; ix++) {
      positions[vi++] = ix * CELL_SIZE;
      positions[vi++] = grid[iz][ix] * LEVEL_HEIGHT;
      positions[vi++] = iz * CELL_SIZE;
      uvs[ui++] = ix / PLOT_SIZE;
      uvs[ui++] = iz / PLOT_SIZE;
    }
  }

  const indices: number[] = [];
  for (let iz = 0; iz < PLOT_SIZE; iz++) {
    for (let ix = 0; ix < PLOT_SIZE; ix++) {
      const a = iz * verticesPerSide + ix;
      const b = a + 1;
      const c = a + verticesPerSide;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createTerrainMesh(grid: Heightmap): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({ color: 0x8fbf6a, roughness: 0.95 });
  const mesh = new THREE.Mesh(buildTerrainGeometry(grid), material);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

export function updateTerrainMesh(mesh: THREE.Mesh, grid: Heightmap): void {
  mesh.geometry.dispose();
  mesh.geometry = buildTerrainGeometry(grid);
}

export function createWaterMesh(): THREE.Mesh {
  const size = PLOT_SIZE * CELL_SIZE;
  const geometry = new THREE.PlaneGeometry(size, size);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(size / 2, 0, size / 2);
  const material = new THREE.MeshStandardMaterial({
    color: 0x2f7bb0,
    transparent: true,
    opacity: 0.75,
    roughness: 0.15,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = WATER_LEVEL * LEVEL_HEIGHT;
  return mesh;
}

/** Coordonnées de cellule (arrondi au sommet de grille le plus proche) sous un point d'intersection sur le maillage du terrain. */
export function nearestVertex(point: THREE.Vector3): { x: number; z: number } {
  return {
    x: Math.round(point.x / CELL_SIZE),
    z: Math.round(point.z / CELL_SIZE),
  };
}
