// Ce qu'on cuit : chaque bâtiment du jeu dans les couleurs des deux camps, les chantiers, la nature.
const HEX = "/modeles/hexagon";
const bat = (nom) => (c) => `${HEX}/buildings/${c}/${nom}_${c}.gltf`;
const BATIMENTS = {
  hotel: [bat("building_castle"), 4],
  maison: [bat("building_home_A"), 2],
  maisonB: [bat("building_home_B"), 2],
  bucheron: [bat("building_lumbermill"), 2],
  mineur: [bat("building_mine"), 2],
  moulin: [bat("building_windmill"), 2],
  caserne: [bat("building_barracks"), 3],
  archerie: [bat("building_archeryrange"), 3],
  ecurie: [bat("building_tavern"), 3], // shortcut: pas d'écurie dans le pack
};
const recette = [];
for (const [nom, [url, pied]] of Object.entries(BATIMENTS))
  for (const [camp, couleur] of [[0, "blue"], [1, "red"]]) recette.push({ nom: `${nom}-${camp}`, url: url(couleur), pied });
for (const pied of [2, 3, 4])
  for (const etape of ["A", "B", "C"]) recette.push({ nom: `chantier${etape}-${pied}`, url: `${HEX}/buildings/neutral/building_stage_${etape}.gltf`, pied });
recette.push({ nom: "ferme", url: `${HEX}/buildings/neutral/building_grain.gltf`, pied: 3 });
recette.push({ nom: "fondation-3", url: `${HEX}/buildings/neutral/building_dirt.gltf`, pied: 3 });
for (const v of ["A", "B"]) recette.push({ nom: `arbre${v}`, url: `${HEX}/decoration/nature/tree_single_${v}.gltf`, pied: 0.9 });
for (const v of ["A", "B", "C", "D", "E"]) {
  recette.push({ nom: `pierre${v}`, url: `${HEX}/decoration/nature/rock_single_${v}.gltf`, pied: 0.9 });
  recette.push({ nom: `or${v}`, url: `${HEX}/decoration/nature/rock_single_${v}.gltf`, pied: 0.9, couleur: "#f2b51c" });
}
// des baies : un buisson rond piqué de fruits rouges
const baies = (graine) => (groupe, THREE) => {
  const fruit = new THREE.MeshStandardMaterial({ color: "#d42a3c", roughness: 0.4 });
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4 + graine;
    const r = 0.18 + ((i * 37) % 10) / 50;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), fruit);
    m.position.set(Math.cos(a) * r, 0.18 + ((i * 53) % 10) / 45, Math.sin(a) * r);
    m.castShadow = true;
    groupe.add(m);
  }
};
const BUISSON = "/modeles/forest";
for (const [v, graine] of [["A", 0], ["B", 1]]) recette.push({ nom: `baies${v}`, url: `${BUISSON}/Bush_4_${v}_Color1.gltf`, pied: 0.8, decor: baies(graine) });
// ce que porte un villageois qui rentre déposer
const BITS = "/modeles/bits";
recette.push({ nom: "charge-bois", url: `${BITS}/Wood_Log_A.gltf`, pied: 0.32 });
recette.push({ nom: "charge-or", url: `${BITS}/Gold_Nugget_Medium.gltf`, pied: 0.22 });
recette.push({ nom: "charge-pierre", url: `${BITS}/Stone_Chunks_Small.gltf`, pied: 0.25 });
recette.push({ nom: "charge-nourriture", url: `${HEX}/decoration/props/sack.gltf`, pied: 0.25 });
export default recette;
