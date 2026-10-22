// Libellés partagés : rêves, focus de l'année, reliques transmissibles.

import type { Jauge, Reve } from "./types.ts";

export const REVES: Record<Reve, { nom: string; enfant: string }> = {
  "roi-des-pirates": { nom: "Devenir le Roi des Pirates", enfant: "Je serai le Roi des Pirates." },
  "meilleur-epeiste": { nom: "Devenir le meilleur épéiste du monde", enfant: "Un jour, plus personne ne me battra au sabre." },
  "carte-du-monde": { nom: "Dessiner la carte du monde entier", enfant: "Je dessinerai toutes les mers sur une seule carte." },
  "all-blue": { nom: "Trouver All Blue", enfant: "Il existe une mer où vivent tous les poissons du monde. Je la trouverai." },
  "grand-guerrier": { nom: "Devenir un grand guerrier des mers", enfant: "Je serai un guerrier dont on chantera le nom." },
  "medecin-universel": { nom: "Devenir un médecin capable de tout guérir", enfant: "Je guérirai toutes les maladies." },
  "verite-histoire": { nom: "Découvrir la vérité sur l'Histoire", enfant: "Je veux savoir ce qu'on nous cache." },
  amiral: { nom: "Devenir amiral de la Marine", enfant: "Je serai amiral, et je protégerai les gens." },
  "liberer-esclaves": { nom: "Libérer ceux qu'on enchaîne", enfant: "Plus personne ne portera de chaînes." },
  "proteger-village": { nom: "Protéger les siens", enfant: "Je resterai ici, et rien n'arrivera aux miens." },
  "voir-le-monde": { nom: "Voir le monde", enfant: "Je veux voir ce qu'il y a derrière l'horizon." },
  famille: { nom: "Fonder une famille", enfant: "Je veux une maison pleine de rires." },
  richesse: { nom: "Faire fortune", enfant: "Un jour, je serai riche, et plus jamais je n'aurai faim." },
  vengeance: { nom: "Se venger", enfant: "Je n'oublierai pas ce qu'ils ont fait." },
  "navire-legendaire": { nom: "Construire un navire qui fera le tour du monde", enfant: "Je construirai le plus beau navire des mers." },
};

export const FOCUS: Record<Jauge | "repos", { nom: string; verbe: string; icone: string }> = {
  force: { nom: "Force", verbe: "S'endurcir", icone: "⚔" },
  haki: { nom: "Haki", verbe: "Forger sa volonté", icone: "◉" },
  savoir: { nom: "Savoir", verbe: "Apprendre", icone: "✒" },
  equipage: { nom: "Équipage", verbe: "Se lier aux autres", icone: "⚓" },
  repos: { nom: "Santé", verbe: "Prendre soin de soi", icone: "✚" },
};
