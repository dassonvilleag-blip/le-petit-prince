import * as THREE from "three";
import { CELL_SIZE, LEVEL_HEIGHT } from "./constants";

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Les murs longent un bord de la cellule (celui à Z minimal avant rotation) plutôt que de
// la traverser en son centre : deux murs posés dans des cellules voisines, avec la bonne
// rotation, se rejoignent alors pile au coin partagé et forment un angle propre — poser un
// mur centré dans chaque cellule ne les fait jamais vraiment se toucher. La rotation (0/90/
// 180/270, appliquée par buildPieceMesh autour du centre de la cellule) fait donc pivoter
// le mur d'un bord à l'autre plutôt que de simplement l'orienter sur place.
const WALL_EDGE_Z = -CELL_SIZE / 2;
const WALL_THICKNESS = 0.25;
// Un mur pile à la largeur de la cellule laisse son bout (l'épaisseur, une fine face qui
// hérite mal de la texture) dépasser à nu au coin — c'est le rebord disgracieux constaté
// en jeu. En le rallongeant d'une demi-épaisseur de chaque côté, chaque mur empiète
// légèrement sur les cellules voisines : au coin, le bout de chaque mur se retrouve
// entièrement noyé à l'intérieur du volume du mur perpendiculaire, donc invisible.
const WALL_LENGTH = CELL_SIZE + WALL_THICKNESS;

function wallSolid(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(WALL_LENGTH, LEVEL_HEIGHT, WALL_THICKNESS);
  geo.translate(0, LEVEL_HEIGHT / 2, WALL_EDGE_Z);
  group.add(mesh(geo, material));
  return group;
}

function wallWithOpening(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const postWidth = CELL_SIZE * 0.25;
  const postGeo = new THREE.BoxGeometry(postWidth, LEVEL_HEIGHT, WALL_THICKNESS);
  postGeo.translate(0, LEVEL_HEIGHT / 2, WALL_EDGE_Z);
  const left = mesh(postGeo, material);
  left.position.x = -(CELL_SIZE / 2 - postWidth / 2);
  const right = mesh(postGeo.clone(), material);
  right.position.x = CELL_SIZE / 2 - postWidth / 2;
  const lintelHeight = LEVEL_HEIGHT * 0.3;
  const lintelGeo = new THREE.BoxGeometry(WALL_LENGTH, lintelHeight, WALL_THICKNESS);
  lintelGeo.translate(0, LEVEL_HEIGHT - lintelHeight / 2, WALL_EDGE_Z);
  group.add(left, right, mesh(lintelGeo, material));
  return group;
}

function pillar(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.CylinderGeometry(CELL_SIZE * 0.18, CELL_SIZE * 0.2, LEVEL_HEIGHT, 12);
  geo.translate(0, LEVEL_HEIGHT / 2, 0);
  group.add(mesh(geo, material));
  return group;
}

function platform(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const thickness = LEVEL_HEIGHT * 0.15;
  const geo = new THREE.BoxGeometry(CELL_SIZE, thickness, CELL_SIZE);
  geo.translate(0, thickness / 2, 0);
  group.add(mesh(geo, material));
  return group;
}

function roofSlope(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const half = CELL_SIZE / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(half, 0);
  shape.lineTo(-half, LEVEL_HEIGHT);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: CELL_SIZE, bevelEnabled: false });
  geo.translate(0, 0, -half);
  group.add(mesh(geo, material));
  return group;
}

function ridgeCap(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const w = CELL_SIZE * 0.18;
  const shape = new THREE.Shape();
  shape.moveTo(-w, 0);
  shape.lineTo(w, 0);
  shape.lineTo(0, w * 0.8);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: CELL_SIZE, bevelEnabled: false });
  geo.rotateY(Math.PI / 2);
  geo.translate(-CELL_SIZE / 2, LEVEL_HEIGHT, 0);
  group.add(mesh(geo, material));
  return group;
}

function conicalTurretRoof(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.ConeGeometry(CELL_SIZE * 0.55, LEVEL_HEIGHT * 1.4, 16);
  geo.translate(0, LEVEL_HEIGHT * 0.7, 0);
  group.add(mesh(geo, material));
  return group;
}

function roundTower(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.CylinderGeometry(CELL_SIZE * 0.5, CELL_SIZE * 0.5, LEVEL_HEIGHT, 20);
  geo.translate(0, LEVEL_HEIGHT / 2, 0);
  group.add(mesh(geo, material));
  return group;
}

function squareTower(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(CELL_SIZE, LEVEL_HEIGHT, CELL_SIZE);
  geo.translate(0, LEVEL_HEIGHT / 2, 0);
  group.add(mesh(geo, material));
  return group;
}

function stairs(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const steps = 4;
  const stepDepth = CELL_SIZE / steps;
  for (let s = 0; s < steps; s++) {
    const stepHeight = ((s + 1) / steps) * LEVEL_HEIGHT;
    const geo = new THREE.BoxGeometry(CELL_SIZE, stepHeight, stepDepth);
    geo.translate(0, stepHeight / 2, -CELL_SIZE / 2 + stepDepth * (s + 0.5));
    group.add(mesh(geo, material));
  }
  return group;
}

function crenellation(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const baseHeight = LEVEL_HEIGHT * 0.15;
  const baseGeo = new THREE.BoxGeometry(WALL_LENGTH, baseHeight, CELL_SIZE * 0.5);
  baseGeo.translate(0, baseHeight / 2, WALL_EDGE_Z);
  group.add(mesh(baseGeo, material));
  const merlonCount = 3;
  const merlonWidth = CELL_SIZE / (merlonCount * 2);
  const merlonHeight = LEVEL_HEIGHT * 0.35;
  for (let i = 0; i < merlonCount; i++) {
    const geo = new THREE.BoxGeometry(merlonWidth, merlonHeight, CELL_SIZE * 0.5);
    const x = -CELL_SIZE / 2 + merlonWidth * (2 * i + 1);
    geo.translate(x, baseHeight + merlonHeight / 2, WALL_EDGE_Z);
    group.add(mesh(geo, material));
  }
  return group;
}

function drawbridge(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const thickness = LEVEL_HEIGHT * 0.1;
  const geo = new THREE.BoxGeometry(CELL_SIZE, thickness, CELL_SIZE);
  geo.translate(0, thickness / 2, 0);
  group.add(mesh(geo, material));
  return group;
}

function portcullis(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const barThickness = 0.06;
  const verticalBars = 5;
  const span = CELL_SIZE * 0.7;
  for (let i = 0; i < verticalBars; i++) {
    const geo = new THREE.BoxGeometry(barThickness, LEVEL_HEIGHT * 0.9, barThickness);
    geo.translate(-span / 2 + (span / (verticalBars - 1)) * i, LEVEL_HEIGHT * 0.45, WALL_EDGE_Z);
    group.add(mesh(geo, material));
  }
  const horizontalBars = 4;
  for (let i = 0; i < horizontalBars; i++) {
    const geo = new THREE.BoxGeometry(span, barThickness, barThickness);
    geo.translate(0, (LEVEL_HEIGHT * 0.9 * (i + 0.5)) / horizontalBars, WALL_EDGE_Z);
    group.add(mesh(geo, material));
  }
  return group;
}

// La torche et la plante grimpante ignorent volontairement le matériau choisi :
// flamme et feuillage n'ont pas de sens en "ardoise" ou "tuile terre cuite".
function torch(_material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3320, roughness: 0.8 });
  const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, LEVEL_HEIGHT * 0.5, 8);
  handleGeo.translate(0, LEVEL_HEIGHT * 0.25, 0);
  group.add(mesh(handleGeo, handleMaterial));
  const flameMaterial = new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0xff6a00, emissiveIntensity: 1.2 });
  const flameGeo = new THREE.SphereGeometry(0.09, 10, 10);
  flameGeo.translate(0, LEVEL_HEIGHT * 0.55, 0);
  group.add(mesh(flameGeo, flameMaterial));
  return group;
}

function shieldDecor(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(CELL_SIZE * 0.35, LEVEL_HEIGHT * 0.5, 0.06);
  geo.translate(0, LEVEL_HEIGHT * 0.5, CELL_SIZE / 2 - 0.1);
  group.add(mesh(geo, material));
  return group;
}

function climbingVine(_material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const vineMaterial = new THREE.MeshStandardMaterial({ color: 0x4c8a3e, roughness: 0.9 });
  const clusters = 5;
  for (let i = 0; i < clusters; i++) {
    const geo = new THREE.SphereGeometry(0.1, 8, 8);
    const y = (LEVEL_HEIGHT * (i + 0.5)) / clusters;
    geo.translate((i % 2 === 0 ? -1 : 1) * 0.05, y, CELL_SIZE / 2 - 0.1);
    group.add(mesh(geo, vineMaterial));
  }
  return group;
}

const BUILDERS: Record<string, (material: THREE.Material) => THREE.Group> = {
  "mur-plein": wallSolid,
  "mur-ouverture": wallWithOpening,
  pilier: pillar,
  sol: platform,
  "toit-pan": roofSlope,
  faitage: ridgeCap,
  "tourelle-conique": conicalTurretRoof,
  "tour-ronde": roundTower,
  "tour-carree": squareTower,
  escalier: stairs,
  creneau: crenellation,
  "pont-levis": drawbridge,
  "grille-herse": portcullis,
  torche: torch,
  blason: shieldDecor,
  "plante-grimpante": climbingVine,
};

export function buildPieceMesh(pieceId: string, rotationDeg: number, material: THREE.Material): THREE.Object3D {
  const builder = BUILDERS[pieceId];
  if (!builder) throw new Error(`pièce inconnue : ${pieceId}`);
  const group = builder(material);
  group.rotation.y = (rotationDeg * Math.PI) / 180;
  return group;
}
