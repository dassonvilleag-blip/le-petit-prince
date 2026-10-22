// Rassemble tout le contenu du mode « Vivre Card ». Chaque fichier exporte
// les tableaux qu'il veut (evenements, histoire, fruits, morts, rencontres,
// secrets, titres, repliques, pauses, reliques) ; on les met bout à bout.

import type { Contenu } from "../etat.ts";
import * as base from "./base.ts";
import * as enfance from "./enfance.ts";
import * as pirates from "./pirates.ts";
import * as marine from "./marine.ts";
import * as civils from "./civils.ts";
import * as factions from "./factions.ts";
import * as histoire from "./histoire.ts";
import * as pouvoirs from "./pouvoirs.ts";
import * as liens from "./liens.ts";
import * as legendes from "./legendes.ts";

export const MODULES: Record<string, Partial<Contenu>> = {
  base, enfance, pirates, marine, civils, factions, histoire, pouvoirs, liens, legendes,
};

function rassembler(): Contenu {
  const c: Contenu = {
    evenements: [], histoire: [], fruits: [], morts: [], rencontres: [], secrets: [],
    titres: [], repliques: [], pauses: [], reliques: [],
  };
  for (const m of Object.values(MODULES)) {
    for (const cle of Object.keys(c) as (keyof Contenu)[]) {
      const tableau = m[cle];
      if (Array.isArray(tableau)) (c[cle] as unknown[]).push(...tableau);
    }
  }
  // Les rencontres et les morts peuvent être déclarées par plusieurs fichiers.
  c.rencontres = [...new Map(c.rencontres.map((r) => [r.id, r])).values()];
  c.morts = [...new Map(c.morts.map((m) => [m.id, m])).values()];
  c.histoire.sort((a, b) => a.annee - b.annee);
  return c;
}

export const CONTENU: Contenu = rassembler();
