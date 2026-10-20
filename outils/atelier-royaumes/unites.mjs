// Les unités : personnages KayKit Adventurers, armes dans les mains, 8 directions.
const K = "/modeles/adventurers";
const P = (n) => `${K}/Characters/gltf/${n}.glb`;
const A = (n) => `${K}/Assets/gltf/${n}.gltf`;
const GEN = `${K}/Animations/gltf/Rig_Medium/Rig_Medium_General.glb`;
const MVT = `${K}/Animations/gltf/Rig_Medium/Rig_Medium_MovementBasic.glb`;
const anims = (action) => ({ repos: [GEN, "Idle_A", 1], marche: [MVT, "Walking_A", 8], action: [GEN, action, 6] });
// une lance : hampe de bois et fer gris, il n'y en a pas dans le pack
const lance = (THREE) => {
  const g = new THREE.Group();
  const hampe = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 8), new THREE.MeshStandardMaterial({ color: "#8a5a32" }));
  const fer = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 8), new THREE.MeshStandardMaterial({ color: "#c9ced6", metalness: 0.4, roughness: 0.4 }));
  fer.position.y = 1.26;
  g.add(hampe, fer);
  g.position.y = 0.4;
  return g;
};
export default [
  { nom: "villageois", perso: P("Rogue"), cacher: ["Rogue_Cape"], armes: [{ url: A("axe_1handed"), main: "handslotr" }], anims: anims("Interact") },
  { nom: "milicien", perso: P("Barbarian"), armes: [{ url: A("sword_1handed"), main: "handslotr" }, { url: A("shield_round_barbarian"), main: "handslotl" }], anims: anims("Use_Item") },
  { nom: "lancier", perso: P("Knight"), armes: [{ fabriquer: lance, main: "handslotr" }, { url: A("shield_badge"), main: "handslotl" }], anims: anims("Use_Item") },
  { nom: "archer", perso: P("Ranger"), armes: [{ url: A("bow_withString"), main: "handslotl" }], anims: anims("Throw") },
  { nom: "tirailleur", perso: P("Rogue_Hooded"), armes: [{ url: A("crossbow_1handed"), main: "handslotr" }], anims: anims("Throw") },
];
