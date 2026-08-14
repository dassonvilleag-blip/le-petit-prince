// La Colonie — prévisualisations : tout ce que le joueur peut savoir AVANT
// d'agir. Fonctions pures, alignées sur les formules de state.ts, pour que la
// promesse affichée corresponde toujours à ce que la simulation fera.

import {
  COLS,
  ROWS,
  CREUSE_COUT,
  CREUSE_SECONDES_BASE,
  CREUSE_SECONDES_PAR_RANG,
  CHANTIERS_MAX,
  EXPEDITIONS,
  REINE,
  RESOURCES,
  SALLES,
  UNITE_PAR_ID,
  type Cost,
  type ResourceId,
  type UnitId,
} from "./data";
import {
  chantiersEnCours,
  constructible,
  creusable,
  estCreusee,
  peutPayer,
  type ColonyState,
} from "./state";

// ---- coûts annotés ----

export interface CoutAnnote {
  res: ResourceId;
  n: number;
  ok: boolean; // payable avec les réserves actuelles
}

export function annoterCout(s: ColonyState, cout: Cost): CoutAnnote[] {
  return (Object.entries(cout) as [ResourceId, number][]).map(([res, n]) => ({
    res,
    n,
    ok: s.res[res] >= n,
  }));
}

// rendu HTML d'un coût : chaque ressource verte (payable) ou rouge (manque)
export function htmlCout(s: ColonyState, cout: Cost): string {
  const parts = annoterCout(s, cout);
  if (!parts.length) return `<span class="cout ok">gratuit</span>`;
  return parts
    .map(
      (p) =>
        `<span class="cout ${p.ok ? "ok" : "manque"}" title="${p.ok ? "" : `il manque ${Math.ceil(p.n - s.res[p.res])} ${RESOURCES[p.res].nom.toLowerCase()}`}">${p.n} ${RESOURCES[p.res].emoji}</span>`
    )
    .join(" ");
}

// ---- expéditions : chances et pertes AVANT de partir ----

export interface PronosticExpedition {
  force: number;
  chance: number; // probabilité de victoire, 0..1
  pertesMin: number; // fourmis perdues si tout va bien
  pertesMax: number; // fourmis perdues si tout va mal
  verdict: string; // résumé lisible
  couleur: "vert" | "jaune" | "rouge";
}

// même modèle que resoudreExpedition : ratio = force × U(0.85, 1.15) / difficulté
export function pronostic(escouade: Record<UnitId, number>, difficulte: number): PronosticExpedition {
  let force = 0;
  for (const [u, n] of Object.entries(escouade) as [UnitId, number][])
    force += UNITE_PAR_ID.get(u)!.force * n;
  const total = escouade.ouvriere + escouade.soldate;

  if (force === 0)
    return { force, chance: 0, pertesMin: 0, pertesMax: 0, verdict: "compose ton escouade", couleur: "rouge" };

  // P(force × u ≥ difficulté) avec u uniforme sur [0.85, 1.15]
  const chance = Math.min(1, Math.max(0, ((force * 1.15) / difficulte - 1) / 0.3));

  // taux de pertes aux deux extrêmes du tirage (formule de resoudreExpedition)
  const taux = (ratio: number): number => Math.min(0.8, Math.max(0, 0.45 / Math.max(ratio, 0.1) - 0.3));
  const pertesMin = Math.round(total * taux((force * 1.15) / difficulte));
  const pertesMax = Math.round(total * taux((force * 0.85) / difficulte));

  const pct = Math.round(chance * 100);
  if (chance >= 1)
    return { force, chance, pertesMin, pertesMax, verdict: "victoire assurée", couleur: "vert" };
  if (chance >= 0.7)
    return { force, chance, pertesMin, pertesMax, verdict: `${pct}% de victoire`, couleur: "vert" };
  if (chance >= 0.35)
    return { force, chance, pertesMin, pertesMax, verdict: `${pct}% de victoire`, couleur: "jaune" };
  if (chance > 0)
    return { force, chance, pertesMin, pertesMax, verdict: `${pct}% de victoire — téméraire`, couleur: "rouge" };
  return { force, chance, pertesMin, pertesMax, verdict: "défaite assurée", couleur: "rouge" };
}

// ---- placement : pourquoi une case est valide ou non ----

export interface AvisPlacement {
  ok: boolean;
  raison: string; // vide si ok, sinon l'explication à afficher
}

export function avisCreuse(s: ColonyState, x: number, y: number): AvisPlacement {
  if (estCreusee(s, x, y)) return { ok: false, raison: "déjà creusé" };
  if (s.digs.some((d) => d.x === x && d.y === y)) return { ok: false, raison: "chantier en cours ici" };
  if (!creusable(s, x, y)) return { ok: false, raison: "doit toucher une galerie" };
  if (chantiersEnCours(s) >= CHANTIERS_MAX) return { ok: false, raison: "équipes de chantier occupées" };
  if (!peutPayer(s, { feuilles: CREUSE_COUT }))
    return { ok: false, raison: `il manque ${Math.ceil(CREUSE_COUT - s.res.feuilles)} 🍃` };
  return { ok: true, raison: "" };
}

export function coutCreuse(y: number): { cout: number; secondes: number } {
  return { cout: CREUSE_COUT, secondes: CREUSE_SECONDES_BASE + CREUSE_SECONDES_PAR_RANG * y };
}

export function avisConstruction(s: ColonyState, type: string, x: number, y: number): AvisPlacement {
  const def = SALLES.find((d) => d.id === type)!;
  if (!constructible(s, x, y, def.w, def.h)) {
    // affiner la raison : hors grille, terre occupée, ou réseau trop loin
    if (x < 0 || y < 0 || x + def.w > COLS || y + def.h > ROWS)
      return { ok: false, raison: "dépasse de la terre" };
    for (let j = y; j < y + def.h; j++)
      for (let i = x; i < x + def.w; i++)
        if (estCreusee(s, i, j) || s.digs.some((d) => d.x === i && d.y === j))
          return { ok: false, raison: "il faut de la terre vierge" };
    return { ok: false, raison: "doit toucher une galerie" };
  }
  if (chantiersEnCours(s) >= CHANTIERS_MAX) return { ok: false, raison: "équipes de chantier occupées" };
  if (!peutPayer(s, def.niveaux[0].cout)) return { ok: false, raison: "pas assez de ressources" };
  return { ok: true, raison: "" };
}

// ---- améliorations : avant → après ----

export interface LigneApercu {
  label: string;
  avant: string;
  apres: string;
}

export function apercuSalle(type: string, niveauActuel: number): LigneApercu[] {
  const def = SALLES.find((d) => d.id === type)!;
  if (niveauActuel >= def.niveaux.length) return [];
  const avant = niveauActuel > 0 ? def.niveaux[niveauActuel - 1] : null;
  const apres = def.niveaux[niveauActuel];
  const lignes: LigneApercu[] = [];
  if (apres.prodParMinute !== undefined && def.prodRes)
    lignes.push({
      label: `production ${RESOURCES[def.prodRes].emoji}`,
      avant: `${avant?.prodParMinute ?? 0}/min`,
      apres: `${apres.prodParMinute}/min`,
    });
  if (apres.stockBonus !== undefined)
    lignes.push({
      label: "réserve apportée",
      avant: `+${avant?.stockBonus ?? 0}`,
      apres: `+${apres.stockBonus}`,
    });
  if (apres.fileMax !== undefined)
    lignes.push({
      label: "file de ponte",
      avant: `${avant?.fileMax ?? 0} œufs`,
      apres: `${apres.fileMax} œufs`,
    });
  return lignes;
}

// tout ce que le prochain niveau de Reine débloque
export function apercuReine(niveauActuel: number): string[] {
  if (niveauActuel >= REINE.length) return [];
  const gains: string[] = [];
  gains.push(`population ${REINE[niveauActuel - 1].popMax} → ${REINE[niveauActuel].popMax} 🐜`);
  for (const salle of SALLES) {
    const avant = salle.maxParReine[niveauActuel - 1];
    const apres = salle.maxParReine[niveauActuel];
    if (apres > avant)
      gains.push(avant === 0 ? `débloque : ${salle.emoji} ${salle.nom}` : `${salle.emoji} ${salle.nom} : ${avant} → ${apres}`);
  }
  for (const exp of EXPEDITIONS)
    if (exp.reineMin === niveauActuel + 1) gains.push(`expédition : ${exp.emoji} ${exp.nom}`);
  return gains;
}
