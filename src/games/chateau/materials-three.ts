import * as THREE from "three";
import { MATERIALS, materialById } from "./materials";

const loader = new THREE.TextureLoader();
const cache = new Map<string, THREE.MeshStandardMaterial>();

function loadTiledTexture(url: string): THREE.Texture {
  const texture = loader.load(url);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function threeMaterialFor(materialId: string): THREE.MeshStandardMaterial {
  const cached = cache.get(materialId);
  if (cached) return cached;
  const def = materialById(materialId);
  const map = loadTiledTexture(def.diffuse);
  map.colorSpace = THREE.SRGBColorSpace;
  const normalMap = loadTiledTexture(def.normal);
  const roughnessMap = loadTiledTexture(def.roughness);
  const material = new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap });
  cache.set(materialId, material);
  return material;
}

export function preloadAllMaterials(): void {
  for (const def of MATERIALS) threeMaterialFor(def.id);
}
