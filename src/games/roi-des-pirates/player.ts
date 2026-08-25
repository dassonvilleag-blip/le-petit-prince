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
  const speciesLabel = SPECIES_LABELS[player.species][player.gender === "homme" ? "m" : "f"];
  return text.replace(/\{(prenom|espece|[^{}/]+\/[^{}]+)\}/g, (_match, token: string) => {
    if (token === "prenom") return player.name;
    if (token === "espece") return speciesLabel;
    const slashIndex = token.indexOf("/");
    const m = token.slice(0, slashIndex);
    const f = token.slice(slashIndex + 1);
    return player.gender === "homme" ? m : f;
  });
}
