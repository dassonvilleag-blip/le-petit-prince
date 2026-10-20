// Rend des modèles glTF en sprites isométriques 2:1 (vue d'AoE II), en 2x.
import * as THREE from "three";
import { GLTFLoader } from "/three/examples/jsm/loaders/GLTFLoader.js";
import { clone as clonerSquelette } from "/three/examples/jsm/utils/SkeletonUtils.js";

const S = 128 / Math.SQRT2; // pixels par unité : une case = losange de 128×64
const ELEV = Math.PI / 6; // 30° : sin = 1/2, d'où le 2:1
const DIR = new THREE.Vector3(Math.cos(ELEV) * Math.SQRT1_2, Math.sin(ELEV), Math.cos(ELEV) * Math.SQRT1_2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
const loader = new GLTFLoader();
const cache = new Map();
const gltf = (url) => {
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url));
  return cache.get(url);
};
const charger = (url) => gltf(url).then((g) => clonerSquelette(g.scene));

// Une scène : le modèle posé au centre, mis à l'échelle de `pied` cases.
async function preparer({ url, pied, rot = 0, teinte, couleur, aplatir = 1, decor }) {
  const groupe = new THREE.Group();
  const modele = await charger(url);
  modele.rotation.y = rot;
  const b0 = new THREE.Box3().setFromObject(modele);
  const k = pied / Math.max(b0.max.x - b0.min.x, b0.max.z - b0.min.z);
  modele.scale.set(k, k * aplatir, k);
  const b = new THREE.Box3().setFromObject(modele);
  const c = b.getCenter(new THREE.Vector3());
  modele.position.set(-c.x, -b.min.y, -c.z);
  modele.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    if (teinte || couleur) o.material = o.material.clone();
    if (teinte) o.material.color.multiply(new THREE.Color(teinte));
    if (couleur) {
      o.material.map = null; // une couleur franche à la place de la palette
      o.material.color.set(couleur);
      o.material.metalness = 0.35;
      o.material.roughness = 0.45;
    }
  });
  groupe.add(modele);
  if (decor) decor(groupe, THREE);
  return groupe;
}

function sceneEclairee(objet) {
  const scene = new THREE.Scene();
  scene.add(objet);
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6d6450, 1.6));
  const soleil = new THREE.DirectionalLight(0xffffff, 2.4);
  soleil.position.set(-4, 9, 2);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(1024, 1024);
  Object.assign(soleil.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
  soleil.shadow.bias = -0.0005;
  scene.add(soleil);
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.3 }));
  sol.rotation.x = -Math.PI / 2;
  sol.receiveShadow = true;
  scene.add(sol);
  return scene;
}

export async function cuire(def) {
  const objet = await preparer(def);
  const scene = sceneEclairee(objet);
  const haut = new THREE.Box3().setFromObject(objet).max.y;
  const p = Math.max(def.pied, 1);
  const W = Math.ceil(p * 128 + 96);
  const ay = Math.ceil(haut * Math.cos(ELEV) * S + 48); // où tombe le centre au sol, depuis le haut
  const H = ay + Math.ceil(p * 32 + 48);
  return { nom: def.nom, ...rendre(scene, W, H, ay) };
}

// Rend la scène dans un cadre W×H dont le centre au sol tombe à (W/2, ay), puis recadre au plus juste.
const tampon = document.createElement("canvas");
const pinceau = tampon.getContext("2d", { willReadFrequently: true });
function rendre(scene, W, H, ay) {
  // redimensionner remet le contexte à zéro : seulement si la taille change
  if (renderer.domElement.width !== W || renderer.domElement.height !== H) renderer.setSize(W, H, false);
  const cam = new THREE.OrthographicCamera(-W / 2 / S, W / 2 / S, ay / S, -(H - ay) / S, 0.1, 200);
  cam.position.copy(DIR).multiplyScalar(60);
  cam.lookAt(0, 0, 0);
  renderer.render(scene, cam);

  // recadre au plus juste
  const c = tampon;
  if (c.width !== W || c.height !== H) [c.width, c.height] = [W, H];
  const g = pinceau;
  g.clearRect(0, 0, W, H);
  g.drawImage(renderer.domElement, 0, 0);
  const d = g.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (d[(y * W + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const sortie = document.createElement("canvas");
  sortie.width = w;
  sortie.height = h;
  sortie.getContext("2d").drawImage(c, x0, y0, w, h, 0, 0, w, h);
  return { canvas: sortie, ax: W / 2 - x0, ay: ay - y0 };
}

// L'orientation du modèle pour qu'il regarde vers la direction d'écran n°d
// (0 : droite, puis dans le sens des aiguilles d'une montre, par 45°).
function angleDirection(d) {
  const a = (d * Math.PI) / 4;
  const dx = (Math.cos(a) + 2 * Math.sin(a)) / 2; // l'écran iso inversé : (x − z, (x + z) / 2)
  const dz = (2 * Math.sin(a) - Math.cos(a)) / 2;
  return Math.atan2(dx, dz);
}

// Un personnage animé : chaque animation, dans les 8 directions, en `n` images.
export async function cuireUnite({ nom, perso, cacher = [], armes = [], hauteur = 0.92, anims }) {
  const corps = await charger(perso);
  corps.traverse((o) => {
    if (cacher.includes(o.name)) o.visible = false;
    if (o.isMesh) o.castShadow = true;
  });
  for (const { url, main, fabriquer, rot } of armes) {
    const arme = url ? await charger(url) : fabriquer(THREE);
    if (rot) arme.rotation.set(...rot);
    arme.traverse((o) => o.isMesh && (o.castShadow = true));
    corps.getObjectByName(main).add(arme);
  }
  const b = new THREE.Box3().setFromObject(corps);
  corps.scale.setScalar(hauteur / (b.max.y - b.min.y));
  const pivot = new THREE.Group();
  pivot.add(corps);
  const scene = sceneEclairee(pivot);
  const mixer = new THREE.AnimationMixer(corps);
  const sprites = [];
  for (const [anim, [fichier, clip, n]] of Object.entries(anims)) {
    const c = (await gltf(fichier)).animations.find((a) => a.name === clip);
    mixer.stopAllAction();
    mixer.clipAction(c).play();
    for (let d = 0; d < 8; d++) {
      pivot.rotation.y = angleDirection(d);
      for (let f = 0; f < n; f++) {
        mixer.setTime((c.duration * f) / n);
        sprites.push({ nom: `${nom}-${anim}-${d}-${f}`, ...rendre(scene, 160, 170, 130) });
      }
    }
  }
  return sprites;
}

// Range les sprites en étagères dans un atlas, rend { png, carte }.
export function atlas(sprites, largeur = 4096) {
  const tries = [...sprites].sort((a, b) => b.canvas.height - a.canvas.height);
  let x = 0, y = 0, etage = 0;
  const places = [];
  for (const s of tries) {
    if (x + s.canvas.width > largeur) {
      x = 0;
      y += etage + 2;
      etage = 0;
    }
    places.push([s, x, y]);
    x += s.canvas.width + 2;
    etage = Math.max(etage, s.canvas.height);
  }
  const c = document.createElement("canvas");
  c.width = largeur;
  c.height = y + etage;
  const g = c.getContext("2d");
  const carte = {};
  for (const [s, px, py] of places) {
    g.drawImage(s.canvas, px, py);
    carte[s.nom] = [px, py, s.canvas.width, s.canvas.height, Math.round(s.ax), Math.round(s.ay)];
  }
  return { png: c.toDataURL("image/png"), carte, taille: [c.width, c.height] };
}

window.atelier = { cuire, cuireUnite, atlas };
window.atelierPret = true;
