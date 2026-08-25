import type { Player, SpeciesId } from "./types.ts";

export const SPECIES_ORDER: SpeciesId[] = [
  "humain",
  "geant",
  "homme-poisson",
  "buccaneer",
  "lunarien",
];

export const SPECIES_LABELS: Record<SpeciesId, { m: string; f: string }> = {
  humain: { m: "Humain", f: "Humaine" },
  geant: { m: "Géant", f: "Géante" },
  "homme-poisson": { m: "Homme-Poisson", f: "Homme-Poisson" },
  buccaneer: { m: "Buccaneer", f: "Buccaneer" },
  lunarien: { m: "Lunarien", f: "Lunarienne" },
};

export function resolvePlayerText(text: string, player: Player): string {
  let result = text.replaceAll("{prenom}", player.name);
  const speciesLabel = SPECIES_LABELS[player.species][player.gender === "homme" ? "m" : "f"];
  result = result.replaceAll("{espece}", speciesLabel);
  result = result.replace(/\{([^{}/]+)\/([^{}]+)\}/g, (_match, m: string, f: string) =>
    player.gender === "homme" ? m : f,
  );
  return result;
}
