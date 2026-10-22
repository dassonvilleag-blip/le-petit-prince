// Gabarits de texte : {prenom}, {ile}, {rival}… et accords {m/f}.
//
//   {m/f}            accord sur le sexe de la vie : « {né/née} »
//   {ami:m/f}        accord sur le sexe d'un lien : « {ami:il/elle} »
//   {prenom} {nom} {famille} {ile} {aIle} {deIle} {zone} {ileNatale}
//   {aIleNatale} {deIleNatale} {annee} {age}
//   {ami} {rival} {amour} {conjoint} {mentor} {capitaine} {compagnon}
//   {enfant} {frere} {mere} {pere} {jumeau} {equipage} {navire}
//   {fruit} {prime} {surnom} {peuple} {metier} {grade}

import type { EtatVie, Lien } from "./etat.ts";
import type { Role, Sexe, Texte } from "./types.ts";
import { ZONES, PEUPLES, grade as gradeParId } from "./monde.ts";
import { nomComplet } from "./noms.ts";

export interface ContexteTexte {
  jumeau?: { nom: string; sexe: Sexe };
  fruitNom?: string;
  compagnon?: Lien;
}

const ROLES: Role[] = ["mere", "pere", "ami", "rival", "amour", "conjoint", "mentor", "capitaine", "compagnon", "enfant", "frere"];

export const VARIABLES = new Set([
  "prenom", "nom", "famille", "ile", "aIle", "deIle", "zone", "ileNatale", "aIleNatale", "deIleNatale", "annee", "age", "jumeau", "equipage", "navire",
  "fruit", "prime", "surnom", "peuple", "metier", "grade", ...ROLES,
]);

export const METIERS_NOMS: Record<string, { m: string; f: string }> = {
  pecheur: { m: "pêcheur", f: "pêcheuse" },
  paysan: { m: "paysan", f: "paysanne" },
  cuisinier: { m: "cuisinier", f: "cuisinière" },
  charpentier: { m: "charpentier", f: "charpentière" },
  forgeron: { m: "forgeron", f: "forgeronne" },
  medecin: { m: "médecin", f: "médecin" },
  archeologue: { m: "archéologue", f: "archéologue" },
  navigateur: { m: "navigateur", f: "navigatrice" },
  marchand: { m: "marchand", f: "marchande" },
  journaliste: { m: "journaliste", f: "journaliste" },
  musicien: { m: "musicien", f: "musicienne" },
  artiste: { m: "artiste", f: "artiste" },
  mineur: { m: "mineur", f: "mineuse" },
  tireur: { m: "tireur d'élite", f: "tireuse d'élite" },
  epeiste: { m: "épéiste", f: "épéiste" },
  combattant: { m: "combattant", f: "combattante" },
  voleur: { m: "voleur", f: "voleuse" },
  erudit: { m: "érudit", f: "érudite" },
  soldat: { m: "soldat", f: "soldate" },
};

/** « le village de Syrup » → « du village de Syrup » ; « Ohara » → « d'Ohara ». */
export function deLieu(nom: string): string {
  if (nom.startsWith("le ")) return "du " + nom.slice(3);
  if (nom.startsWith("les ")) return "des " + nom.slice(4);
  if (nom.startsWith("la ") || nom.startsWith("l'")) return "de " + nom;
  if (/^[AEIOUYÉÈÊaeiouyéèê]/.test(nom)) return "d'" + nom;
  return "de " + nom;
}

/** « le village de Syrup » → « au village de Syrup » ; « Ohara » → « à Ohara ». */
export function aLieu(nom: string): string {
  if (nom.startsWith("le ")) return "au " + nom.slice(3);
  if (nom.startsWith("les ")) return "aux " + nom.slice(4);
  return "à " + nom;
}

export function formaterPrime(berrys: number): string {
  if (berrys >= 1_000_000_000) {
    const md = berrys / 1_000_000_000;
    return `${md.toLocaleString("fr-FR", { maximumFractionDigits: md < 10 ? 2 : 1 })} milliard${md >= 2 ? "s" : ""} de berrys`;
  }
  if (berrys >= 1_000_000) {
    const m = berrys / 1_000_000;
    return `${m.toLocaleString("fr-FR", { maximumFractionDigits: m < 10 ? 1 : 0 })} million${m >= 2 ? "s" : ""} de berrys`;
  }
  return `${Math.round(berrys).toLocaleString("fr-FR")} berrys`;
}

export function nomDeLaVie(v: EtatVie): string {
  return nomComplet(v.prenom, v.famille, v.d && v.dConnu);
}

export function lienActif(v: EtatVie, role: Role): Lien | undefined {
  for (let i = v.liens.length - 1; i >= 0; i--) {
    const l = v.liens[i];
    if (l.role === role && l.vivant && !l.parti) return l;
  }
  return undefined;
}

function lienPourTexte(v: EtatVie, role: Role, ctx: ContexteTexte): Lien | undefined {
  if (role === "compagnon" && ctx.compagnon) return ctx.compagnon;
  return lienActif(v, role) ?? [...v.liens].reverse().find((l) => l.role === role);
}

function valeur(nom: string, v: EtatVie, ctx: ContexteTexte): string | undefined {
  switch (nom) {
    case "prenom": return v.prenom;
    case "nom": return nomDeLaVie(v);
    case "famille": return v.famille;
    case "ile": return v.nomIle;
    case "aIle": return aLieu(v.nomIle);
    case "deIle": return deLieu(v.nomIle);
    case "ileNatale": return v.nomIleNatale;
    case "aIleNatale": return aLieu(v.nomIleNatale);
    case "deIleNatale": return deLieu(v.nomIleNatale);
    case "zone": return ZONES[v.zone].nom;
    case "annee": return String(v.annee);
    case "age": return String(v.age);
    case "jumeau": return ctx.jumeau?.nom ?? "un inconnu";
    case "equipage": return v.equipageNom ?? "l'équipage";
    case "navire": return v.navire ?? "le navire";
    case "fruit": return ctx.fruitNom ?? "le fruit";
    case "prime": return formaterPrime(v.prime);
    case "surnom": return v.surnom ?? v.prenom;
    case "peuple": return PEUPLES[v.peuple][v.sexe === "h" ? "m" : "f"];
    case "metier": return v.metier ? METIERS_NOMS[v.metier][v.sexe === "h" ? "m" : "f"] : "sans métier";
    case "grade": return (v.grade && gradeParId(v.grade)?.nom) ?? "";
  }
  if ((ROLES as string[]).includes(nom)) {
    return lienPourTexte(v, nom as Role, ctx)?.nom ?? "quelqu'un";
  }
  return undefined;
}

function sexeDe(sujet: string, v: EtatVie, ctx: ContexteTexte): Sexe {
  if (sujet === "jumeau") return ctx.jumeau?.sexe ?? "h";
  if ((ROLES as string[]).includes(sujet)) return lienPourTexte(v, sujet as Role, ctx)?.sexe ?? "h";
  return v.sexe;
}

export function choisirVariante(texte: Texte, rng: () => number): string {
  if (typeof texte === "string") return texte;
  return texte[Math.floor(rng() * texte.length)] ?? "";
}

/** Une seule passe sur le texte d'origine : une valeur insérée n'est jamais relue. */
export function rendre(texte: string, v: EtatVie, ctx: ContexteTexte = {}): string {
  const brut = texte.replace(/\{([^{}]+)\}/g, (tout, jeton: string) => {
    const slash = jeton.indexOf("/");
    if (slash >= 0) {
      const deuxPoints = jeton.indexOf(":");
      const sujet = deuxPoints >= 0 && deuxPoints < slash ? jeton.slice(0, deuxPoints) : "";
      const corps = sujet ? jeton.slice(deuxPoints + 1) : jeton;
      const [m, f] = corps.split("/");
      return sexeDe(sujet, v, ctx) === "h" ? m : (f ?? m);
    }
    return valeur(jeton, v, ctx) ?? tout;
  });
  return majusculeInitiale(brut);
}

function majusculeInitiale(s: string): string {
  return s.replace(/^(\s*[«"]?\s*)(\p{Ll})/u, (_t, avant: string, lettre: string) => avant + lettre.toUpperCase());
}

/** Les problèmes d'un gabarit (pour le validateur de contenu). */
export function erreursGabarit(texte: string): string[] {
  const erreurs: string[] = [];
  const ouvrantes = (texte.match(/\{/g) ?? []).length;
  const fermantes = (texte.match(/\}/g) ?? []).length;
  if (ouvrantes !== fermantes) erreurs.push("accolades déséquilibrées");
  for (const [, jeton] of texte.matchAll(/\{([^{}]+)\}/g)) {
    if (jeton.includes("/")) {
      const deuxPoints = jeton.indexOf(":");
      if (deuxPoints >= 0 && deuxPoints < jeton.indexOf("/")) {
        const sujet = jeton.slice(0, deuxPoints);
        if (!(ROLES as string[]).includes(sujet) && sujet !== "jumeau") erreurs.push(`sujet d'accord inconnu : ${sujet}`);
      }
      continue;
    }
    if (!VARIABLES.has(jeton)) erreurs.push(`variable inconnue : {${jeton}}`);
  }
  return erreurs;
}
