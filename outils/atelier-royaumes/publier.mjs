// Copie l'atlas cuit dans le repo : l'image dans public/, la carte dans sprites.ts.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
const [SORTIE, REPO] = process.argv.slice(2);
mkdirSync(join(REPO, "public", "sprites"), { recursive: true });
copyFileSync(join(SORTIE, "royaumes.png"), join(REPO, "public", "sprites", "royaumes.png"));
const carte = JSON.parse(readFileSync(join(SORTIE, "royaumes.json"), "utf8"));
const lignes = Object.entries(carte).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `  ${JSON.stringify(k)}: [${v.join(", ")}],`);
writeFileSync(
  join(REPO, "src", "games", "age-des-royaumes", "sprites.ts"),
  `// L'Âge des Royaumes — où est chaque sprite dans /sprites/royaumes.png, rendu en 2x
// depuis les modèles 3D KayKit (CC0, Kay Lousberg) : [x, y, largeur, hauteur, ancreX, ancreY].
// L'ancre est le centre au sol de l'objet. Fichier généré par l'atelier de cuisson, ne pas éditer.

export const SPRITES: Record<string, [number, number, number, number, number, number]> = {
${lignes.join("\n")}
};
`,
);
console.log(Object.keys(carte).length, "sprites publiés");
