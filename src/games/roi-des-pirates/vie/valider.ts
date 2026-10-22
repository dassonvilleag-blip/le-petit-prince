// Le linter du contenu : identifiants, références, gabarits, drapeaux.

import type { Contenu } from "./etat.ts";
import type { Choix, Condition, Effet, Evenement, Texte } from "./types.ts";
import { erreursGabarit } from "./texte.ts";
import { grade, ileExiste, MONDES } from "./monde.ts";
import { TRAITS } from "./naissance.ts";

/** Drapeaux posés par le moteur lui-même (préfixes ou noms exacts). */
const FLAGS_MOTEUR = [
  "camp:", "grade:", "metier:", "reve:", "zone:", "ile:", "fruit:", "haki:", "lien:", "deuil:", "blessure:",
  "mort:", "volonte:", "poneglyphe:", "meta:", "fruit-vendu:", "objet:",
];
const FLAGS_MOTEUR_EXACTS = new Set([
  "recherche", "orphelin", "porte-le-d", "graine-du-roi", "ne-en-mer", "ne-nage-plus", "reve-accompli",
  "d-revele", "deux-fruits", "fruit", "fruit-trouve", "fruit-vole", "fruit-offert", "fruit-achete", "fruit-herite",
]);

function flagMoteur(f: string): boolean {
  return FLAGS_MOTEUR_EXACTS.has(f) || FLAGS_MOTEUR.some((p) => f.startsWith(p));
}

function textes(t: Texte | undefined): string[] {
  if (t === undefined) return [];
  return typeof t === "string" ? [t] : t;
}

export interface Rapport {
  erreurs: string[];
  avertissements: string[];
}

export function validerContenu(c: Contenu): Rapport {
  const erreurs: string[] = [];
  const avertissements: string[] = [];
  const ids = new Set<string>();
  const morts = new Set(c.morts.map((m) => m.id));
  const rencontres = new Set(c.rencontres.map((r) => r.id));
  const fruits = new Set(c.fruits.map((f) => f.id));
  const reliques = new Set(c.reliques.map((r) => r.id));
  const traits = new Set(TRAITS.map((t) => t.id));
  const poses = new Set<string>();
  const lus: { flag: string; ou: string }[] = [];
  const cibles: { id: string; ou: string }[] = [];

  for (const e of c.evenements) {
    if (ids.has(e.id)) erreurs.push(`identifiant en double : ${e.id}`);
    ids.add(e.id);
  }
  for (const f of c.fruits) {
    if (f.rarete < 1 || f.rarete > 5) erreurs.push(`fruit ${f.id} : rareté hors de 1-5`);
  }

  const gabarit = (t: string | undefined, ou: string): void => {
    if (!t) return;
    for (const err of erreursGabarit(t)) erreurs.push(`${ou} : ${err} — « ${t.slice(0, 60)}… »`);
  };

  const condition = (cond: Condition | undefined, ou: string): void => {
    if (!cond) return;
    for (const f of [...(cond.flags ?? []), ...(cond.pasFlags ?? []), ...(cond.unFlag ?? [])]) lus.push({ flag: f, ou });
    for (const i of cond.ile ?? []) if (!ileExiste(i)) erreurs.push(`${ou} : île inconnue ${i}`);
    for (const g of cond.grade ?? []) if (!grade(g)) erreurs.push(`${ou} : grade inconnu ${g}`);
    for (const f of cond.fruitId ?? []) if (!fruits.has(f)) erreurs.push(`${ou} : fruit inconnu ${f}`);
    for (const t of cond.trait ?? []) if (!traits.has(t)) erreurs.push(`${ou} : trait inconnu ${t}`);
    if (cond.age && cond.age[0] > cond.age[1]) erreurs.push(`${ou} : tranche d'âge inversée`);
    for (const m of cond.monde ?? []) if (!MONDES[m]) erreurs.push(`${ou} : monde inconnu ${m}`);
    for (const sc of [...(cond.tous ?? []), ...(cond.un ?? []), ...(cond.non ? [cond.non] : [])]) condition(sc, ou);
  };

  const effet = (e: Effet | undefined, ou: string): void => {
    if (!e) return;
    for (const f of e.flags ?? []) {
      poses.add(f);
      if (f.startsWith("objet:") && !reliques.has(f.slice(6))) avertissements.push(`${ou} : relique non déclarée ${f}`);
    }
    if (e.mort && !morts.has(e.mort)) erreurs.push(`${ou} : mort inconnue ${e.mort}`);
    if (e.grade && !grade(e.grade)) erreurs.push(`${ou} : grade inconnu ${e.grade}`);
    if (e.aller?.ile && !ileExiste(e.aller.ile)) erreurs.push(`${ou} : île inconnue ${e.aller.ile}`);
    if (e.fruit?.id && !fruits.has(e.fruit.id)) erreurs.push(`${ou} : fruit inconnu ${e.fruit.id}`);
    for (const r of e.rencontre ? (Array.isArray(e.rencontre) ? e.rencontre : [e.rencontre]) : []) {
      if (!rencontres.has(r)) erreurs.push(`${ou} : rencontre non déclarée ${r}`);
    }
    if (e.suite) cibles.push({ id: e.suite, ou });
    for (const p of e.planifier ? (Array.isArray(e.planifier) ? e.planifier : [e.planifier]) : []) cibles.push({ id: p.id, ou });
    gabarit(e.journal, `${ou} (journal)`);
    gabarit(e.equipageNom, `${ou} (équipage)`);
    gabarit(e.surnom, `${ou} (surnom)`);
    gabarit(e.navire, `${ou} (navire)`);
  };

  const choix = (ch: Choix, ou: string): void => {
    gabarit(ch.label, ou);
    gabarit(ch.detail, ou);
    for (const t of textes(ch.texte)) gabarit(t, ou);
    condition(ch.si, ou);
    effet(ch.effets, ou);
    if (ch.test) {
      for (const t of [...textes(ch.test.reussite.texte), ...textes(ch.test.echec.texte)]) gabarit(t, ou);
      effet(ch.test.reussite.effets, `${ou} (réussite)`);
      effet(ch.test.echec.effets, `${ou} (échec)`);
    }
  };

  const evenement = (e: Evenement): void => {
    const ou = e.id;
    for (const t of textes(e.texte)) {
      gabarit(t, ou);
      if (t.length > 420) avertissements.push(`${ou} : texte long (${t.length} caractères)`);
    }
    gabarit(e.titre, ou);
    condition(e.quand, ou);
    effet(e.effets, ou);
    if (e.rencontre && !rencontres.has(e.rencontre)) erreurs.push(`${ou} : rencontre non déclarée ${e.rencontre}`);
    (e.choix ?? []).forEach((ch, i) => choix(ch, `${ou} [choix ${i + 1}]`));
    if (e.choix && e.choix.length && e.choix.every((ch) => ch.si)) avertissements.push(`${ou} : tous les choix sont conditionnels`);
    if (e.pool !== "chaine" && !e.quand) avertissements.push(`${ou} : tirable sans aucune condition`);
  };

  c.evenements.forEach(evenement);

  for (const f of c.histoire) {
    if (f.vecu) cibles.push({ id: f.vecu, ou: `histoire ${f.id}` });
    if (f.ile && !ileExiste(f.ile)) erreurs.push(`histoire ${f.id} : île inconnue ${f.ile}`);
    for (const m of f.monde ?? []) if (!MONDES[m]) erreurs.push(`histoire ${f.id} : monde inconnu ${m}`);
    gabarit(f.manchette, `histoire ${f.id}`);
    gabarit(f.rumeur, `histoire ${f.id}`);
  }
  for (const s of c.secrets) for (const k of s.conditions) condition(k.test, `secret ${s.id}`);
  for (const t of c.titres) {
    condition(t.si, `titre « ${t.titre} »`);
    gabarit(t.titre, "titre");
  }
  for (const r of c.repliques) {
    condition(r.si, "réplique");
    for (const t of textes(r.texte)) gabarit(t, "réplique");
  }
  for (const p of c.pauses) {
    condition(p.si, `pause ${p.age}`);
    for (const t of textes(p.texte)) gabarit(t, `pause ${p.age}`);
  }

  for (const { id, ou } of cibles) {
    if (!ids.has(id)) erreurs.push(`${ou} : enchaîne sur un événement inexistant ${id}`);
  }
  const vus = new Set<string>();
  for (const { flag, ou } of lus) {
    if (poses.has(flag) || flagMoteur(flag) || vus.has(flag)) continue;
    vus.add(flag);
    erreurs.push(`${ou} : le drapeau « ${flag} » est lu mais jamais posé`);
  }
  const atteints = new Set(cibles.map((x) => x.id));
  for (const e of c.evenements) {
    if (e.pool === "chaine" && !atteints.has(e.id) && !e.id.startsWith("volonte-")) {
      avertissements.push(`${e.id} : événement de chaîne jamais appelé`);
    }
  }
  return { erreurs, avertissements };
}
