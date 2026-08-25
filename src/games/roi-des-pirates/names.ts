import type { Gender } from "./types.ts";

const PIRATE_NAMES_HOMME = [
  "Gaspard",
  "Silas",
  "Talon",
  "Rourke",
  "Draven",
  "Cassius",
  "Oswin",
  "Barrick",
  "Ezra",
  "Kolt",
];

const PIRATE_NAMES_FEMME = [
  "Isaline",
  "Sarah",
  "Maelys",
  "Corvina",
  "Liora",
  "Vesna",
  "Odalys",
  "Rhiannon",
  "Selys",
  "Wilhelmine",
];

export function pickRandomName(gender: Gender, rng: () => number = Math.random): string {
  const pool = gender === "homme" ? PIRATE_NAMES_HOMME : PIRATE_NAMES_FEMME;
  return pool[Math.floor(rng() * pool.length)];
}
