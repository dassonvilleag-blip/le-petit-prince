// Le bilan d'une vie : on remplit le Livre des Mers, on range la vie au
// Mémorial, on prépare ce que la Tenancière dira.

import type { Vie } from "../moteur.ts";
import type { Volonte } from "../etat.ts";
import type { CondFin, Replique, Secret } from "../types.ts";
import { verifier, type Sujet } from "../conditions.ts";
import { titreDeFin, titreGagne, evaluerSecrets, presqueAtteints, volontesProduites, resumer, type ResumeVie } from "../fin.ts";
import { choisirVariante, rendre } from "../texte.ts";
import { noter, type Meta, type SectionCodex } from "./sauvegarde.ts";

export interface Gain {
  section: SectionCodex;
  id: string;
}

export interface Bilan {
  resume: ResumeVie;
  titre: string;
  gains: Gain[];
  secrets: Secret[];
  presque: { connu: boolean; secret: Secret; manque: string }[];
  volontes: Volonte[];
  replique: string;
}

function repliqueConvient(r: Replique, vie: Vie, sujet: Sujet, n: number): boolean {
  const c: CondFin | undefined = r.si;
  if (!c) return true;
  const v = vie.etat;
  const m = v.mort;
  const cat = m ? vie.contenu.morts.find((x) => x.id === m.id)?.categorie : undefined;
  if (c.mortCategorie && !(cat && c.mortCategorie.includes(cat))) return false;
  if (c.mortId && !(m && c.mortId.includes(m.id))) return false;
  if (c.ageMortMin !== undefined && v.age < c.ageMortMin) return false;
  if (c.ageMortMax !== undefined && v.age > c.ageMortMax) return false;
  if (c.viesMin !== undefined && n < c.viesMin) return false;
  if (c.viesMax !== undefined && n > c.viesMax) return false;
  return verifier(c, sujet, true);
}

export function faireLeBilan(vie: Vie, meta: Meta): Bilan {
  const v = vie.etat;
  const n = meta.nbVies + 1;
  const titre = titreDeFin(vie);
  const etats = evaluerSecrets(vie);
  const obtenus = etats.filter((e) => e.obtenu).map((e) => e.secret);
  const connus = new Set([...meta.rumeurs, ...meta.codex.secrets]);
  const presque = presqueAtteints(etats, connus);

  const gains: Gain[] = [];
  const marquer = (section: SectionCodex, id: string | undefined): void => {
    if (id && noter(meta, section, id)) gains.push({ section, id });
  };
  for (const i of v.ilesVisitees) marquer("iles", i);
  for (const z of v.zonesVisitees) marquer("zones", z);
  marquer("peuples", v.peuple);
  for (const f of v.flagsVus) {
    if (f.startsWith("metier:")) marquer("metiers", f.slice(7));
    if (f.startsWith("camp:")) marquer("camps", f.slice(5));
    if (f.startsWith("grade:")) marquer("grades", f.slice(6));
    if (f.startsWith("fruit:")) marquer("fruits", f.slice(6));
    if (f.startsWith("objet:")) marquer("reliques", f.slice(6));
    if (f.startsWith("meta:") && !meta.flags.includes(f.slice(5))) meta.flags.push(f.slice(5));
  }
  marquer("camps", v.camp);
  marquer("morts", v.mort?.id);
  for (const r of v.rencontres) marquer("rencontres", r);
  for (const c of v.clins) marquer("clins", c);
  for (const s of obtenus) marquer("secrets", s.id);
  marquer("titres", titreGagne(vie));
  for (const r of v.rumeurs) if (!meta.rumeurs.includes(r)) meta.rumeurs.push(r);
  for (const p of presque) if (!p.connu && !meta.rumeurs.includes(p.secret.id)) meta.rumeurs.push(p.secret.id);
  for (const p of v.poneglyphes) if (!meta.poneglyphes.includes(p)) meta.poneglyphes.push(p);

  // La Tenancière : la réplique la plus précise qui convient, pas déjà entendue si possible.
  const sujet: Sujet = { etat: v, jumeaux: vie.jumeaux.map((j) => j.etat), meta: vie.meta, fruits: new Map(vie.contenu.fruits.map((f) => [f.id, f])) };
  const possibles = vie.contenu.repliques.filter((r) => repliqueConvient(r, vie, sujet, n));
  possibles.sort((a, b) => (b.priorite ?? 0) - (a.priorite ?? 0));
  const neuves = possibles.filter((r) => !meta.entendues.includes(JSON.stringify(r.texte).slice(0, 60)));
  const meilleure = (neuves.length ? neuves : possibles)[0];
  let replique = "Assieds-toi. Raconte-moi.";
  if (meilleure) {
    replique = rendre(choisirVariante(meilleure.texte, Math.random), v);
    meta.entendues.push(JSON.stringify(meilleure.texte).slice(0, 60));
    if (meta.entendues.length > 400) meta.entendues.shift();
  }

  const resume = resumer(vie, n, titre, obtenus.map((s) => s.id));
  meta.vies.push(resume);
  meta.nbVies = n;
  return { resume, titre, gains, secrets: obtenus, presque, volontes: volontesProduites(vie), replique };
}
