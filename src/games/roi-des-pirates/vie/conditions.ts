// Évaluation des conditions du contenu sur une vie.

import type { EtatVie, MetaLecture } from "./etat.ts";
import type { Borne, CondJumeau, Condition, Fruit } from "./types.ts";
import { PEUPLES, grade, ile as ileParId } from "./monde.ts";
import { lienActif } from "./texte.ts";

export interface Sujet {
  etat: EtatVie;
  jumeaux: EtatVie[];
  meta: MetaLecture;
  fruits: Map<string, Fruit>;
}

/** Âge ramené à l'échelle humaine (un géant de 50 ans est un jeune adulte). */
export function ageEchelle(v: EtatVie): number {
  return Math.floor(v.age / PEUPLES[v.peuple].longevite);
}

function dansBorne(valeur: number, borne: Borne): boolean {
  if (typeof borne === "number") return valeur >= borne;
  return valeur >= borne[0] && valeur <= borne[1];
}

function jumeauConvient(s: Sujet, j: EtatVie, c: CondJumeau): boolean {
  const v = s.etat;
  if (c.vivant !== false && !j.vivant) return false;
  if (c.vivant === false && j.vivant) return false;
  if (c.memeZone && j.zone !== v.zone) return false;
  if (c.memeIle && j.ile !== v.ile) return false;
  if (c.camp && !c.camp.includes(j.camp)) return false;
  if (c.pasCamp && c.pasCamp.includes(j.camp)) return false;
  if (c.primeMin !== undefined && j.prime < c.primeMin) return false;
  if (c.ageMin !== undefined && ageEchelle(j) < c.ageMin) return false;
  return true;
}

/** Le jumeau qui satisfait la condition, s'il y en a un. */
export function trouverJumeau(s: Sujet, c: CondJumeau): EtatVie | undefined {
  return s.jumeaux.find((j) => jumeauConvient(s, j, c));
}

export function verifier(c: Condition | undefined, s: Sujet, historique = false): boolean {
  if (!c) return true;
  const v = s.etat;
  const flags = historique ? v.flagsVus : v.flags;

  if (c.age && !dansBorne(ageEchelle(v), c.age)) return false;
  if (c.annee && !dansBorne(v.annee, c.annee)) return false;
  if (c.zone && !c.zone.includes(v.zone)) return false;
  if (c.pasZone && c.pasZone.includes(v.zone)) return false;
  if (c.ile && !c.ile.includes(v.ile)) return false;
  if (c.ileTag) {
    const tags = ileParId(v.ile).tags;
    if (!c.ileTag.some((t) => tags.includes(t))) return false;
  }
  if (c.peuple && !c.peuple.includes(v.peuple)) return false;
  if (c.sexe && c.sexe !== v.sexe) return false;
  if (c.classe && !c.classe.includes(v.classe)) return false;
  if (c.camp && !c.camp.includes(v.camp)) return false;
  if (c.pasCamp && c.pasCamp.includes(v.camp)) return false;
  if (c.grade && !(v.grade && c.grade.includes(v.grade))) return false;
  if (c.rangMin !== undefined || c.rangMax !== undefined) {
    const g = v.grade ? grade(v.grade) : undefined;
    const rang = g && g.camp === v.camp ? g.rang : -1;
    if (c.rangMin !== undefined && rang < c.rangMin) return false;
    if (c.rangMax !== undefined && rang > c.rangMax) return false;
  }
  if (c.metier && !(v.metier && c.metier.includes(v.metier))) return false;
  if (c.pasMetier && v.metier && c.pasMetier.includes(v.metier)) return false;
  if (c.sansMetier && v.metier) return false;
  if (c.reve && !(v.reve && c.reve.includes(v.reve))) return false;
  if (c.reveAccompli !== undefined && c.reveAccompli !== v.reveAccompli) return false;
  if (c.d !== undefined && c.d !== v.d) return false;
  if (c.fruit !== undefined && c.fruit !== Boolean(v.fruit)) return false;
  if (c.fruitType) {
    const f = v.fruit ? s.fruits.get(v.fruit) : undefined;
    if (!f || !c.fruitType.includes(f.type)) return false;
  }
  if (c.fruitId && !(v.fruit && c.fruitId.includes(v.fruit))) return false;
  if (c.fruitEnPoche !== undefined && c.fruitEnPoche !== Boolean(v.fruitEnPoche)) return false;
  if (c.haki && !c.haki.every((h) => v.haki.includes(h))) return false;
  if (c.pasHaki && c.pasHaki.some((h) => v.haki.includes(h))) return false;
  if (c.jauges) {
    for (const [j, borne] of Object.entries(c.jauges)) {
      if (borne !== undefined && !dansBorne(v.jauges[j as keyof typeof v.jauges], borne)) return false;
    }
  }
  if (c.prime !== undefined && !dansBorne(v.prime, c.prime)) return false;
  if (c.sante !== undefined && !dansBorne(v.sante, c.sante)) return false;
  if (c.flags && !c.flags.every((f) => flags.includes(f))) return false;
  if (c.pasFlags && c.pasFlags.some((f) => v.flags.includes(f))) return false;
  if (c.unFlag && !c.unFlag.some((f) => flags.includes(f))) return false;
  if (c.compteurs) {
    for (const [nom, min] of Object.entries(c.compteurs)) {
      if ((v.compteurs[nom] ?? 0) < min) return false;
    }
  }
  if (c.lien) {
    for (const [role, voulu] of Object.entries(c.lien)) {
      const present = Boolean(lienActif(v, role as never));
      if (present !== voulu) return false;
    }
  }
  if (c.trait && !c.trait.some((t) => v.traits.includes(t))) return false;
  if (c.meta) {
    if (c.meta.flags && !c.meta.flags.every((f) => s.meta.flags.has(f))) return false;
    if (c.meta.pasFlags && c.meta.pasFlags.some((f) => s.meta.flags.has(f))) return false;
    if (c.meta.viesMin !== undefined && s.meta.vies < c.meta.viesMin) return false;
  }
  if (c.monde && !c.monde.includes(v.monde)) return false;
  if (c.jumeau && !trouverJumeau(s, c.jumeau)) return false;
  if (c.tous && !c.tous.every((sc) => verifier(sc, s, historique))) return false;
  if (c.un && !c.un.some((sc) => verifier(sc, s, historique))) return false;
  if (c.non && verifier(c.non, s, historique)) return false;
  return true;
}
