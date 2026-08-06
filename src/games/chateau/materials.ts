export interface MaterialDef {
  id: string;
  label: string;
  diffuse: string;
  normal: string;
  roughness: string;
}

function texturePaths(id: string) {
  const base = `/textures/chateau/${id}`;
  return { diffuse: `${base}/diffuse.webp`, normal: `${base}/normal.webp`, roughness: `${base}/roughness.webp` };
}

export const MATERIALS: MaterialDef[] = [
  { id: "pierre-claire", label: "Pierre claire", ...texturePaths("pierre-claire") },
  { id: "pierre-sombre", label: "Pierre sombre", ...texturePaths("pierre-sombre") },
  { id: "brique", label: "Brique", ...texturePaths("brique") },
  { id: "bois", label: "Bois", ...texturePaths("bois") },
  { id: "ardoise", label: "Ardoise", ...texturePaths("ardoise") },
  { id: "tuile-terre-cuite", label: "Tuile terre cuite", ...texturePaths("tuile-terre-cuite") },
];

export const DEFAULT_MATERIAL_ID = "pierre-claire";

export function materialById(id: string): MaterialDef {
  return MATERIALS.find((m) => m.id === id) ?? MATERIALS[0];
}
