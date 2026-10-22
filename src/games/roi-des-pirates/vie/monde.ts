// Le monde : mers, îles, peuples, hiérarchies. Les années sont en calendrier
// Kaien ; Luffy prend la mer en 1522 (« an 0 »).

import type { Camp, Classe, Grade, Ile, Peuple, Zone } from "./types.ts";

export const AN_ZERO = 1522;
/** Au-delà, le monde est une projection (« une possibilité parmi d'autres »). */
export const LIGNE_CONNAISSANCE = 1524;

/**
 * Les futurs possibles après 1524 — le canon s'arrête là ; chaque monde en
 * tire un, et les cinq vies nées à la même seconde le partagent.
 */
export const MONDES: Record<string, { nom: string; poids: number }> = {
  aube: { nom: "L'Aube", poids: 30 },
  "siecle-noir": { nom: "Le Siècle Noir", poids: 15 },
  deluge: { nom: "Le Déluge", poids: 15 },
  restauration: { nom: "La Restauration", poids: 15 },
  "mille-pavillons": { nom: "Les Mille Pavillons", poids: 15 },
  rire: { nom: "Le Rire", poids: 10 },
};

export const ZONES: Record<Zone, { nom: string; danger: number; couleur: string }> = {
  "east-blue": { nom: "East Blue", danger: 1, couleur: "#3aa6d8" },
  "west-blue": { nom: "West Blue", danger: 1.2, couleur: "#4a8fd0" },
  "north-blue": { nom: "North Blue", danger: 1.2, couleur: "#6aa0c8" },
  "south-blue": { nom: "South Blue", danger: 1.1, couleur: "#2f9fb8" },
  paradis: { nom: "Grand Line — Paradis", danger: 1.7, couleur: "#e0a030" },
  "nouveau-monde": { nom: "Nouveau Monde", danger: 2.4, couleur: "#d84a3a" },
  "fond-marin": { nom: "Île des Hommes-Poissons", danger: 1.3, couleur: "#2bc0a8" },
  ciel: { nom: "Îles célestes", danger: 1.2, couleur: "#f0d890" },
  wano: { nom: "Pays de Wano", danger: 1.9, couleur: "#c45a8a" },
  elbaf: { nom: "Elbaf", danger: 1.6, couleur: "#8a9a4a" },
  "calm-belt": { nom: "Calm Belt", danger: 1.8, couleur: "#7a8a9a" },
  "red-line": { nom: "Red Line — Marie-Joie", danger: 1.4, couleur: "#d8c070" },
  "impel-down": { nom: "Impel Down", danger: 3, couleur: "#802020" },
};

export const ILES: Ile[] = [
  // East Blue — « la plus faible des mers »
  { id: "eb-anonyme", nom: "", zone: "east-blue", poids: 150, tags: ["port", "village"], anonyme: true },
  { id: "loguetown", nom: "Loguetown", zone: "east-blue", poids: 10, tags: ["port", "ville", "base-marine"] },
  { id: "goa-ville-haute", nom: "Goa (ville haute)", zone: "east-blue", poids: 2, tags: ["royaume", "ville", "noble"] },
  { id: "goa-ville-basse", nom: "Goa (ville basse)", zone: "east-blue", poids: 5, tags: ["royaume", "ville", "port"] },
  { id: "grey-terminal", nom: "le Grey Terminal", zone: "east-blue", poids: 3, tags: ["pauvre", "decharge"], habitee: [1440, 1512] },
  { id: "fuchsia", nom: "Fuchsia", zone: "east-blue", poids: 1, tags: ["village", "port"] },
  { id: "shells-town", nom: "Shells Town", zone: "east-blue", poids: 3, tags: ["ville", "base-marine", "port"] },
  { id: "orange-town", nom: "Orange Town", zone: "east-blue", poids: 2, tags: ["village"] },
  { id: "syrup", nom: "le village de Syrup", zone: "east-blue", poids: 2, tags: ["village", "port"] },
  { id: "cocoyashi", nom: "Cocoyashi", zone: "east-blue", poids: 3, tags: ["village", "port"] },
  { id: "shimotsuki", nom: "le village de Shimotsuki", zone: "east-blue", poids: 1, tags: ["village", "dojo"] },
  { id: "baratie", nom: "le Baratie", zone: "east-blue", poids: 0.2, tags: ["navire", "restaurant"] },

  // North Blue — mers froides, royaumes militaires
  { id: "nb-anonyme", nom: "", zone: "north-blue", poids: 155, tags: ["port", "froid"], anonyme: true },
  { id: "flevance", nom: "Flevance, la ville blanche", zone: "north-blue", poids: 2, tags: ["ville", "royaume", "froid"], habitee: [1440, 1508] },
  { id: "spider-miles", nom: "Spider Miles", zone: "north-blue", poids: 1, tags: ["pegre", "port", "pauvre"] },
  { id: "lvneel", nom: "le royaume de Lvneel", zone: "north-blue", poids: 1, tags: ["royaume", "port"] },
  { id: "germa", nom: "le royaume de Germa", zone: "north-blue", poids: 0.5, tags: ["royaume", "navire", "germa"] },
  { id: "minion", nom: "l'île de Minion", zone: "north-blue", poids: 0.5, tags: ["hiver", "froid"] },

  // West Blue — mafias et savants
  { id: "wb-anonyme", nom: "", zone: "west-blue", poids: 158, tags: ["port"], anonyme: true },
  { id: "ohara", nom: "Ohara", zone: "west-blue", poids: 2, tags: ["savant", "village"], habitee: [1440, 1502] },
  { id: "ilisia", nom: "le royaume d'Ilisia", zone: "west-blue", poids: 1, tags: ["royaume"] },
  { id: "cite-des-familles", nom: "la Cité des Familles", zone: "west-blue", poids: 3, tags: ["pegre", "ville", "port"] },

  // South Blue
  { id: "sb-anonyme", nom: "", zone: "south-blue", poids: 162, tags: ["port"], anonyme: true },
  { id: "baterilla", nom: "Baterilla", zone: "south-blue", poids: 1, tags: ["village", "port"] },
  { id: "sorbet", nom: "le royaume de Sorbet", zone: "south-blue", poids: 1, tags: ["royaume"], peuples: { humain: 0.98, buccaneer: 0.02 } },

  // Grand Line — Paradis
  { id: "pa-anonyme", nom: "", zone: "paradis", poids: 86, tags: ["port"], anonyme: true },
  { id: "alubarna", nom: "Alubarna", zone: "paradis", poids: 4, tags: ["desert", "royaume", "ville"] },
  { id: "nanohana", nom: "Nanohana", zone: "paradis", poids: 2, tags: ["desert", "port"] },
  { id: "yuba", nom: "l'oasis de Yuba", zone: "paradis", poids: 1, tags: ["desert", "village"] },
  { id: "water-seven", nom: "Water Seven", zone: "paradis", poids: 6, tags: ["ville", "port", "chantier"] },
  { id: "sabaody", nom: "l'archipel Sabaody", zone: "paradis", poids: 5, tags: ["port", "ville", "esclavage"], peuples: { humain: 0.93, "homme-poisson": 0.04, "long-bras": 0.015, "long-jambes": 0.015 } },
  { id: "drum", nom: "le royaume de Drum", zone: "paradis", poids: 3, tags: ["hiver", "froid", "royaume"] },
  { id: "jaya", nom: "Mock Town, sur Jaya", zone: "paradis", poids: 2, tags: ["port", "pegre"] },
  { id: "whisky-peak", nom: "Whisky Peak", zone: "paradis", poids: 1, tags: ["village", "chasseurs"] },
  { id: "marineford", nom: "Marineford", zone: "paradis", poids: 2, tags: ["base-marine", "quartier-general"], habitee: [1440, 1522] },
  { id: "cap-des-jumeaux", nom: "le Cap des Jumeaux", zone: "paradis", poids: 0.1, tags: ["phare"] },

  // Nouveau Monde
  { id: "nm-anonyme", nom: "", zone: "nouveau-monde", poids: 66, tags: ["port"], anonyme: true, peuples: { humain: 0.92, "homme-poisson": 0.03, "long-bras": 0.015, "long-jambes": 0.015, "trois-yeux": 0.005, geant: 0.015 } },
  { id: "dressrosa", nom: "Dressrosa", zone: "nouveau-monde", poids: 5, tags: ["royaume", "ville", "colisee"] },
  { id: "green-bit", nom: "Green Bit", zone: "nouveau-monde", poids: 0.6, tags: ["foret"], peuples: { nain: 1 } },
  { id: "totto-land", nom: "Totto Land", zone: "nouveau-monde", poids: 4, tags: ["royaume", "multi"], peuples: { humain: 0.6, geant: 0.06, "homme-poisson": 0.08, mink: 0.06, "long-bras": 0.06, "long-jambes": 0.06, "trois-yeux": 0.08 } },
  { id: "zou", nom: "Zou, sur le dos de Zunesha", zone: "nouveau-monde", poids: 2.5, tags: ["foret", "mink"], peuples: { mink: 1 } },
  { id: "hachinosu", nom: "Hachinosu", zone: "nouveau-monde", poids: 1, tags: ["pirate", "pegre"] },
  { id: "lulusia", nom: "le royaume de Lulusia", zone: "nouveau-monde", poids: 1, tags: ["royaume"], habitee: [1440, 1524] },
  { id: "egghead", nom: "Egghead", zone: "nouveau-monde", poids: 0.2, tags: ["science"] },
  { id: "g5", nom: "la base G-5", zone: "nouveau-monde", poids: 0.5, tags: ["base-marine"] },

  // Sous la mer
  { id: "ile-des-hommes-poissons", nom: "l'île des Hommes-Poissons", zone: "fond-marin", poids: 25, tags: ["sous-marin", "royaume"], peuples: { "homme-poisson": 0.6, sirene: 0.39, humain: 0.01 } },

  // Wano, fermé au monde
  { id: "wano-capitale", nom: "la Capitale des Fleurs", zone: "wano", poids: 3, tags: ["ville", "samourai"] },
  { id: "ebisu", nom: "le village d'Ebisu", zone: "wano", poids: 2, tags: ["village", "pauvre"] },
  { id: "okobore", nom: "Okobore", zone: "wano", poids: 2, tags: ["pauvre", "village"] },
  { id: "kuri", nom: "Kuri", zone: "wano", poids: 2, tags: ["village"] },
  { id: "ringo", nom: "Ringo", zone: "wano", poids: 2, tags: ["hiver", "froid", "sabres"] },
  { id: "udon", nom: "Udon", zone: "wano", poids: 1, tags: ["mine"] },

  // Elbaf
  { id: "elbaf", nom: "Elbaf", zone: "elbaf", poids: 6, tags: ["foret", "geants"], peuples: { geant: 0.97, humain: 0.03 } },

  // Le ciel
  { id: "skypiea", nom: "Skypiea, sur l'île des Anges", zone: "ciel", poids: 3, tags: ["celeste-ile"], peuples: { skypieen: 1 } },
  { id: "upper-yard", nom: "l'Upper Yard", zone: "ciel", poids: 1.5, tags: ["foret", "celeste-ile"], peuples: { shandia: 1 } },

  // Calm Belt
  { id: "amazon-lily", nom: "Amazon Lily", zone: "calm-belt", poids: 2, tags: ["kuja", "foret"] },

  // Red Line
  { id: "marie-joie", nom: "Marie-Joie", zone: "red-line", poids: 0.5, tags: ["celeste", "esclavage"], peuples: { humain: 0.9, "homme-poisson": 0.05, buccaneer: 0.02, geant: 0.03 } },
  { id: "red-line-ruines", nom: "des ruines au sommet de la Red Line", zone: "red-line", poids: 0.02, tags: ["ruines"], peuples: { lunarien: 1 } },

  // Impel Down
  { id: "impel-down", nom: "Impel Down", zone: "impel-down", poids: 0.05, tags: ["prison"] },
];

const ILES_PAR_ID = new Map(ILES.map((i) => [i.id, i]));
export function ile(id: string): Ile {
  const trouve = ILES_PAR_ID.get(id);
  if (!trouve) throw new Error(`Île inconnue : ${id}`);
  return trouve;
}
export function ileExiste(id: string): boolean {
  return ILES_PAR_ID.has(id);
}

export const PEUPLES: Record<Peuple, { m: string; f: string; longevite: number; nage: boolean }> = {
  humain: { m: "Humain", f: "Humaine", longevite: 1, nage: true },
  geant: { m: "Géant", f: "Géante", longevite: 2.5, nage: true },
  "homme-poisson": { m: "Homme-Poisson", f: "Femme-Poisson", longevite: 1, nage: true },
  sirene: { m: "Triton", f: "Sirène", longevite: 1, nage: true },
  mink: { m: "Mink", f: "Mink", longevite: 1, nage: true },
  skypieen: { m: "Skypiéen", f: "Skypiéenne", longevite: 1, nage: true },
  shandia: { m: "Shandia", f: "Shandia", longevite: 1, nage: true },
  nain: { m: "Tontatta", f: "Tontatta", longevite: 1.2, nage: true },
  "long-bras": { m: "Long-Bras", f: "Long-Bras", longevite: 1, nage: true },
  "long-jambes": { m: "Long-Jambes", f: "Long-Jambes", longevite: 1, nage: true },
  "trois-yeux": { m: "Trois-Yeux", f: "Trois-Yeux", longevite: 1, nage: true },
  buccaneer: { m: "Buccaneer", f: "Buccaneer", longevite: 1.1, nage: true },
  lunarien: { m: "Lunarien", f: "Lunarienne", longevite: 1.3, nage: true },
};

export const CLASSES: Record<Classe, { nom: string; part: number }> = {
  villageois: { nom: "une famille de pêcheurs et de paysans", part: 38 },
  artisan: { nom: "une famille d'artisans", part: 20 },
  pauvre: { nom: "une famille pauvre", part: 14 },
  marchand: { nom: "une famille de marchands", part: 9 },
  "famille-marine": { nom: "une famille de la Marine", part: 5 },
  "famille-pirate": { nom: "une famille de pirates", part: 4 },
  noble: { nom: "une famille noble", part: 3 },
  "hors-la-loi": { nom: "une famille de hors-la-loi", part: 3 },
  esclave: { nom: "l'esclavage", part: 1 },
  savant: { nom: "une famille de savants", part: 0.5 },
  "famille-revolutionnaire": { nom: "une famille de révolutionnaires", part: 0.3 },
  samourai: { nom: "une lignée de samouraïs", part: 0 },
  "guerrier-shandia": { nom: "une famille de guerriers shandia", part: 0 },
  kuja: { nom: "la tribu des Kuja", part: 0 },
  "guerrier-elbaf": { nom: "une lignée de guerriers d'Elbaf", part: 0 },
  germa: { nom: "le peuple de Germa", part: 0 },
  celeste: { nom: "la noblesse mondiale — les Dragons Célestes", part: 0 },
  serviteur: { nom: "une famille de serviteurs", part: 0 },
};

export const CAMPS: Record<Camp, string> = {
  civil: "Civil",
  pirate: "Pirate",
  marine: "Marine",
  revolution: "Armée révolutionnaire",
  "cipher-pol": "Cipher Pol",
  chasseur: "Chasseur de primes",
  pegre: "Pègre",
  esclave: "Esclave",
  celeste: "Dragon Céleste",
};

/** Risque de mort violente selon le camp (multiplie le danger de la mer). */
export const RISQUE_CAMP: Record<Camp, number> = {
  civil: 1,
  pirate: 3,
  marine: 1.8,
  revolution: 2.2,
  "cipher-pol": 1.8,
  chasseur: 2.5,
  pegre: 2.4,
  esclave: 3,
  celeste: 0.3,
};

export const GRADES: Grade[] = [
  { id: "mousse", nom: "Mousse", camp: "pirate", rang: 0 },
  { id: "matelot-pirate", nom: "Matelot", camp: "pirate", rang: 1 },
  { id: "officier-pirate", nom: "Officier de bord", camp: "pirate", rang: 2 },
  { id: "capitaine-pirate", nom: "Capitaine", camp: "pirate", rang: 3 },
  { id: "supernova", nom: "Supernova", camp: "pirate", rang: 4 },
  { id: "commandant-empereur", nom: "Commandant d'un Empereur", camp: "pirate", rang: 5 },
  { id: "grand-corsaire", nom: "Grand Corsaire", camp: "pirate", rang: 5 },
  { id: "empereur", nom: "Empereur", camp: "pirate", rang: 6 },
  { id: "roi-des-pirates", nom: "Roi des Pirates", camp: "pirate", rang: 7 },

  { id: "recrue", nom: "Recrue", camp: "marine", rang: 0 },
  { id: "matelot-marine", nom: "Matelot", camp: "marine", rang: 1 },
  { id: "sous-officier", nom: "Sous-officier", camp: "marine", rang: 2 },
  { id: "lieutenant", nom: "Lieutenant", camp: "marine", rang: 3 },
  { id: "capitaine-marine", nom: "Capitaine", camp: "marine", rang: 4 },
  { id: "commodore", nom: "Commodore", camp: "marine", rang: 5 },
  { id: "contre-amiral", nom: "Contre-amiral", camp: "marine", rang: 6 },
  { id: "vice-amiral", nom: "Vice-amiral", camp: "marine", rang: 7 },
  { id: "amiral", nom: "Amiral", camp: "marine", rang: 8 },
  { id: "amiral-en-chef", nom: "Amiral en chef", camp: "marine", rang: 9 },

  { id: "sympathisant", nom: "Sympathisant", camp: "revolution", rang: 0 },
  { id: "membre-revolution", nom: "Révolutionnaire", camp: "revolution", rang: 1 },
  { id: "agent-revolution", nom: "Agent de terrain", camp: "revolution", rang: 2 },
  { id: "officier-revolution", nom: "Officier révolutionnaire", camp: "revolution", rang: 3 },
  { id: "commandant-revolution", nom: "Commandant d'armée", camp: "revolution", rang: 4 },

  { id: "agent-cp", nom: "Agent du Cipher Pol", camp: "cipher-pol", rang: 0 },
  { id: "cp9", nom: "Agent du CP9", camp: "cipher-pol", rang: 1 },
  { id: "cp0", nom: "Agent du CP0", camp: "cipher-pol", rang: 2 },

  { id: "chasseur", nom: "Chasseur de primes", camp: "chasseur", rang: 0 },
  { id: "chasseur-renomme", nom: "Chasseur renommé", camp: "chasseur", rang: 1 },
  { id: "chasseur-legende", nom: "Légende des chasseurs", camp: "chasseur", rang: 2 },

  { id: "petite-main", nom: "Petite main", camp: "pegre", rang: 0 },
  { id: "homme-de-main", nom: "Homme de main", camp: "pegre", rang: 1 },
  { id: "lieutenant-pegre", nom: "Lieutenant de la pègre", camp: "pegre", rang: 2 },
  { id: "courtier", nom: "Courtier de l'ombre", camp: "pegre", rang: 3 },

  { id: "esclave", nom: "Esclave", camp: "esclave", rang: 0 },
  { id: "dragon-celeste", nom: "Dragon Céleste", camp: "celeste", rang: 0 },
];

const GRADES_PAR_ID = new Map(GRADES.map((g) => [g.id, g]));
export function grade(id: string): Grade | undefined {
  return GRADES_PAR_ID.get(id);
}
export function gradeEntree(camp: Camp): Grade | undefined {
  return GRADES.find((g) => g.camp === camp && g.rang === 0);
}
export function gradeSuivant(id: string | undefined, camp: Camp): Grade | undefined {
  const actuel = id ? grade(id) : undefined;
  const rang = actuel && actuel.camp === camp ? actuel.rang + 1 : 0;
  // Les grades « à sièges » ne s'obtiennent pas par simple promotion.
  const bloques = new Set(["supernova", "grand-corsaire", "commandant-empereur", "empereur", "roi-des-pirates", "amiral", "amiral-en-chef", "cp0", "commandant-revolution", "chasseur-legende", "courtier"]);
  return GRADES.find((g) => g.camp === camp && g.rang === rang && !bloques.has(g.id));
}

export function nomZone(zone: Zone): string {
  return ZONES[zone].nom;
}
