// src/games/chateau/building-geometry.ts
import * as THREE from "three";
import type { CellCorners, CornerRounding } from "./corners";
import { CORNER_RADIUS, FLOOR_HEIGHT, FLOOR_INSET, MIN_HALF_EXTENT, ROOF_HEIGHT, CELL_SIZE } from "./constants";

interface Quadrant {
  dx: 1 | -1;
  dz: 1 | -1;
  rounding: CornerRounding;
}

// Construit le contour 2D (plan propre au Shape) d'un étage, à partir de sa classification
// de coins, pour une demi-largeur `half` et un rayon `radius` donnés. Parcours dans l'ordre
// pn → pp → np → nn.
//
// IMPORTANT : extrudeFlat() applique rotateX(-PI/2) pour mettre l'extrusion debout, et
// cette rotation envoie l'axe Y du Shape sur -Z monde (vérifié numériquement, pas une
// supposition). `gz = -dz` compense ce renversement pour que "dz" représente bien le
// voisin de grille réel (cellZ+1/cellZ-1) une fois le mur rendu en 3D — sans cette
// compensation, les coins arrondis/chamfrés se retrouveraient du mauvais côté par rapport
// aux vraies cases voisines. `dx` n'a besoin d'aucune compensation (axe X non affecté par
// cette rotation, vérifié aussi).
//
// - "convex" : arc de coin de rectangle arrondi standard (centre en retrait de `radius`
//   dans les deux axes, arc court de 90° qui bombe vers le coin). Construction vérifiée
//   par calcul de tangence.
// - "concave" : chamfre (coupe droite à 45°) via le même point en retrait que le centre de
//   l'arc convexe — un vrai arc lisse tangent aux mêmes bords n'existe pas pour cette
//   configuration. Recule bien vers le centre par rapport au coin plein (vérifié :
//   distance à l'origine strictement plus petite).
// - "flush" : angle droit, jusqu'au coin plein, sans traitement.
export function buildFloorShape(corners: CellCorners, half: number, radius: number): THREE.Shape {
  const r = Math.min(radius, half);
  const shape = new THREE.Shape();
  const quadrants: Quadrant[] = [
    { dx: 1, dz: -1, rounding: corners.pn },
    { dx: 1, dz: 1, rounding: corners.pp },
    { dx: -1, dz: 1, rounding: corners.np },
    { dx: -1, dz: -1, rounding: corners.nn },
  ];

  let started = false;
  const moveOrLine = (x: number, y: number): void => {
    if (!started) {
      shape.moveTo(x, y);
      started = true;
    } else {
      shape.lineTo(x, y);
    }
  };

  for (const { dx, dz, rounding } of quadrants) {
    const gz = (-dz) as 1 | -1; // compensation du renversement d'axe — voir la note ci-dessus
    const cornerX = dx * half;
    const cornerY = gz * half;

    if (rounding === "flush") {
      moveOrLine(cornerX, cornerY);
      continue;
    }

    const tangentAX = cornerX - dx * r; // point d'entrée
    const tangentAY = cornerY;
    const tangentBX = cornerX; // point de sortie
    const tangentBY = cornerY - gz * r;

    moveOrLine(tangentAX, tangentAY);

    if (rounding === "convex") {
      const centerX = cornerX - dx * r;
      const centerY = cornerY - gz * r;
      const startAngle = Math.atan2(tangentAY - centerY, tangentAX - centerX);
      const endAngle = Math.atan2(tangentBY - centerY, tangentBX - centerX);
      // Sens vérifié par calcul de tangence (pas deviné) : sens horaire quand dx et gz ont
      // le même signe, sens inverse sinon — dx*gz>0 capture exactement ce cas.
      shape.absarc(centerX, centerY, r, startAngle, endAngle, dx * gz > 0);
    } else {
      shape.lineTo(cornerX - dx * r, cornerY - gz * r);
      shape.lineTo(tangentBX, tangentBY);
    }
  }
  shape.closePath();
  return shape;
}

function extrudeFlat(shape: THREE.Shape, height: number, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2); // Shape est dans le plan XY ; on le couche pour extruder vers le haut
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Toit à deux pans + faîtière, technique reprise de piece-geometry.ts v1 (Shape triangulaire
// extrudé) plutôt qu'inventée de zéro. `half` est la demi-largeur du DERNIER étage (déjà
// rétréci). `alongX` détermine l'orientation de la faîtière (décidée par l'appelant, de
// façon déterministe — voir main.ts / le document de conception).
function buildRoof(half: number, alongX: boolean, material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(half, 0);
  shape.lineTo(0, ROOF_HEIGHT);
  shape.closePath();
  const depth = half * 2;
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -half); // centre l'extrusion sur l'axe de la faîtière
  if (!alongX) geometry.rotateY(Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

export interface BuildingMaterials {
  walls: THREE.Material;
  roof: THREE.Material;
}

// Construit la colonne complète d'une case (tous les étages, rétrécis, + toit), positionnée
// à l'origine locale (0,0) — l'appelant place le groupe résultant au centre monde de la
// case. `height` = nombre d'étages (>=1 — n'appelle jamais cette fonction pour une case
// vide). `cellX`/`cellZ` ne servent qu'à dériver une orientation de toit déterministe.
export function buildBuildingColumn(
  corners: CellCorners,
  height: number,
  cellX: number,
  cellZ: number,
  materials: BuildingMaterials,
): THREE.Group {
  const group = new THREE.Group();
  const baseHalf = CELL_SIZE / 2;
  let lastHalf = baseHalf;

  for (let floor = 0; floor < height; floor++) {
    const half = Math.max(MIN_HALF_EXTENT, baseHalf - floor * FLOOR_INSET);
    const shape = buildFloorShape(corners, half, CORNER_RADIUS);
    const mesh = extrudeFlat(shape, FLOOR_HEIGHT, materials.walls);
    mesh.position.y = floor * FLOOR_HEIGHT;
    group.add(mesh);
    lastHalf = half;
  }

  const roof = buildRoof(lastHalf, (cellX + cellZ) % 2 === 0, materials.roof);
  roof.position.y = height * FLOOR_HEIGHT;
  group.add(roof);

  return group;
}
