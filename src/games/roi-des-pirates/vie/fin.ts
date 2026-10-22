// Ce qui reste d'une vie : son titre, ses secrets, ce qu'elle a frôlé,
// et les Volontés qu'elle peut transmettre.

import type { EtatVie, MetaLecture, Volonte } from "./etat.ts";
import type { Secret } from "./types.ts";
import { verifier, type Sujet } from "./conditions.ts";
import type { Vie } from "./moteur.ts";
import { rendre, nomDeLaVie, lienActif, deLieu, METIERS_NOMS } from "./texte.ts";
import { REVES } from "./libelles.ts";
import { grade as gradeParId } from "./monde.ts";

function sujetFinal(vie: Vie): Sujet {
  return {
    etat: vie.etat,
    jumeaux: vie.jumeaux.map((j) => j.etat),
    meta: vie.meta,
    fruits: new Map(vie.contenu.fruits.map((f) => [f.id, f])),
  };
}

export function titreDeFin(vie: Vie): string {
  const t = titreGagne(vie);
  return t ? rendre(t, vie.etat) : titreParDefaut(vie.etat);
}

/** Le gabarit du titre gagné (son id dans le codex), ou rien si la vie finit sur le titre par défaut. */
export function titreGagne(vie: Vie): string | undefined {
  const s = sujetFinal(vie);
  const titres = [...vie.contenu.titres].sort((a, b) => b.priorite - a.priorite);
  return titres.find((t) => verifier(t.si, s, true))?.titre;
}

export function titreParDefaut(v: EtatVie): string {
  const g = v.grade ? gradeParId(v.grade) : undefined;
  const lieu = deLieu(v.nomIleNatale);
  if (g && g.rang >= 3) return `${g.nom} ${lieu}`;
  if (v.metier) return `${capitaliser(METIERS_NOMS[v.metier][v.sexe === "h" ? "m" : "f"])} ${lieu}`;
  return `${v.sexe === "h" ? "Un enfant" : "Une enfant"} ${lieu}`;
}

function capitaliser(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface EtatSecret {
  secret: Secret;
  remplies: string[];
  manquantes: string[];
  obtenu: boolean;
}

export function evaluerSecrets(vie: Vie): EtatSecret[] {
  const s = sujetFinal(vie);
  return vie.contenu.secrets.map((secret) => {
    const remplies: string[] = [];
    const manquantes: string[] = [];
    for (const c of secret.conditions) (verifier(c.test, s, true) ? remplies : manquantes).push(c.nom);
    return { secret, remplies, manquantes, obtenu: manquantes.length === 0 };
  });
}

/** Les deux secrets les plus proches d'être atteints (une condition manquante). */
export function presqueAtteints(etats: EtatSecret[], connus: Set<string>): { connu: boolean; secret: Secret; manque: string }[] {
  return etats
    .filter((e) => !e.obtenu && e.manquantes.length === 1 && e.remplies.length >= 1)
    .sort((a, b) => b.secret.difficulte - a.secret.difficulte)
    .slice(0, 2)
    .map((e) => ({ connu: connus.has(e.secret.id), secret: e.secret, manque: e.manquantes[0] }));
}

export function volontesProduites(vie: Vie): Volonte[] {
  const v = vie.etat;
  const de = nomDeLaVie(v);
  const out: Volonte[] = [];
  const reliqueEnCours = vie.volonte?.type === "relique" ? vie.volonte : undefined;
  for (const f of v.flags) {
    if (!f.startsWith("objet:")) continue;
    const id = f.slice("objet:".length);
    const r = vie.contenu.reliques.find((x) => x.id === id);
    if (!r) continue;
    const chronique = reliqueEnCours?.valeur === id ? [...reliqueEnCours.chronique, de] : [de];
    out.push({ type: "relique", libelle: r.nom, de, valeur: id, chronique });
  }
  if (v.reve && !v.reveAccompli) {
    out.push({ type: "reve", libelle: `Un rêve inachevé : « ${REVES[v.reve].nom} »`, de, valeur: v.reve, chronique: [de] });
  }
  const rival = lienActif(v, "rival");
  if (rival) out.push({ type: "rival", libelle: `${rival.nom}, votre rival, vous survit`, de, valeur: rival.nom, chronique: [de] });
  if (v.fruit) {
    const f = vie.fruit(v.fruit);
    if (f) out.push({ type: "fruit", libelle: `${f.nom} renaîtra quelque part`, de, valeur: f.id, chronique: [de] });
  }
  if (v.jauges.savoir >= 70 || v.poneglyphes.length) {
    out.push({ type: "savoir", libelle: "Ce que vous saviez — des carnets, des cartes, des noms", de, valeur: String(Math.round(v.jauges.savoir)), chronique: [de] });
  }
  return out.slice(0, 3);
}

export interface ResumeVie {
  n: number;
  graine: number;
  date: string;
  nom: string;
  prenom: string;
  sexe: EtatVie["sexe"];
  peuple: EtatVie["peuple"];
  classe: EtatVie["classe"];
  d: boolean;
  ileNatale: string;
  zoneNatale: EtatVie["zoneNatale"];
  anneeNaissance: number;
  ageMort: number;
  anneeMort: number;
  mortId: string;
  mortTexte: string;
  camp: EtatVie["camp"];
  grade?: string;
  metier?: string;
  prime: number;
  primeMax: number;
  fruit?: string;
  haki: EtatVie["haki"];
  reve?: string;
  reveAccompli: boolean;
  titre: string;
  notes: Record<number, string>;
  mots?: string;
  blessures: string[];
  jumeaux: { nom: string; ageMort?: number; texte: string }[];
  secrets: string[];
  traits: string[];
}

export function resumer(vie: Vie, n: number, titre: string, secrets: string[]): ResumeVie {
  const v = vie.etat;
  return {
    n,
    graine: v.graine,
    date: new Date().toISOString(),
    nom: nomDeLaVie(v),
    prenom: v.prenom,
    sexe: v.sexe,
    peuple: v.peuple,
    classe: v.classe,
    d: v.d,
    ileNatale: v.nomIleNatale,
    zoneNatale: v.zoneNatale,
    anneeNaissance: v.anneeNaissance,
    ageMort: v.mort?.age ?? v.age,
    anneeMort: v.mort?.annee ?? v.annee,
    mortId: v.mort?.id ?? "inconnue",
    mortTexte: v.mort?.texte ?? "",
    camp: v.camp,
    grade: v.grade,
    metier: v.metier,
    prime: v.prime,
    primeMax: v.primeMax,
    fruit: v.fruit,
    haki: [...v.haki],
    reve: v.reve,
    reveAccompli: v.reveAccompli,
    titre,
    notes: { ...v.notes },
    blessures: v.flagsVus.filter((f) => f.startsWith("blessure:")).map((f) => f.slice(9)),
    jumeaux: vie.jumeaux.map((j) => ({
      nom: j.nom,
      ageMort: j.etat.vivant ? undefined : j.etat.mort?.age,
      texte: j.etat.vivant ? `${j.nom} vit encore, ${j.etat.age} ans.` : (j.etat.mort?.texte ?? ""),
    })),
    secrets,
    traits: [...v.traits],
  };
}

/** Lecture de la méta pour une nouvelle vie. */
export function metaLecture(flags: string[], vies: number): MetaLecture {
  return { flags: new Set(flags), vies };
}
