// Joueur simulé : joue une partie entière de façon gloutonne, pour caler les
// durées par phase et vérifier qu'on n'est jamais bloqué.
// Usage : node --experimental-strip-types src/games/paperasse/test/sim-cli.ts

import { FEUILLES_PAR_RAMETTE, PRIX_RAMETTE_MOYEN, REGIONS, UNITES, type UniteId } from "../data.ts";
import {
  capNotes,
  capacite,
  coutAffichage,
  coutCerfa,
  coutRegion,
  coutUnite,
  mods,
  pieces,
  recetteParDossier,
  usagersParSec,
} from "../eco.ts";
import {
  acheterAffichage,
  acheterProjet,
  acheterRamettes,
  acheterUnite,
  affichageDisponible,
  campagneDisponible,
  coutCampagne,
  decisionGreve,
  inventerCerfa,
  lancerCampagne,
  nouvelEtat,
  ouvrirRegion,
  partirALaRetraite,
  placerGalon,
  projetsVisibles,
  setRandom,
  tamponner,
  tick,
  uniteDisponible,
  type Etat,
} from "../state.ts";

export interface Resultat {
  etat: Etat;
  phases: number[]; // durée (s) de chaque phase
  total: number;
  fini: boolean;
  log: string[];
}

function graine(s: number): () => number {
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export interface OptionsSim {
  max?: number; // s de jeu
  clicsParSec?: number; // pendant les 5 premières minutes
  graine?: number;
  trace?: boolean;
}

export function jouer(o: OptionsSim = {}): Resultat {
  setRandom(graine(o.graine ?? 42));
  const e = nouvelEtat(0);
  const max = o.max ?? 8 * 3600;
  const log: string[] = [];
  let phaseVue = 1;
  let prochaineTrace = 0;

  while (e.t < max && !e.fin) {
    // clics actifs au début
    const m0 = mods(e);
    const enPanne = e.feuilles < capacite(e, m0) * m0.feuilles;
    const clics = e.t < 600 || enPanne ? (o.clicsParSec ?? 3) : 0;
    for (let i = 0; i < clics; i++) tamponner(e);
    tick(e, 1);
    decider(e);
    if (e.retraite) partirALaRetraite(e);

    if (e.phase !== phaseVue || (e.espace && phaseVue === 4 && !log.some((l) => l.includes("espace")))) {
      if (e.espace && !log.some((l) => l.includes("espace"))) log.push(`${fmt(e.t)} espace`);
      if (e.phase !== phaseVue) log.push(`${fmt(e.t)} phase ${e.phase}`);
      phaseVue = e.phase;
    }
    if (o.trace && e.t >= prochaineTrace) {
      prochaineTrace += 300;
      log.push(trace(e));
    }
  }

  const tp = [...e.tPhases];
  const fin = e.fin ? e.t : e.t;
  const phases = tp.map((t, i) => (tp[i + 1] ?? fin) - t).slice(0, 4);
  return { etat: e, phases, total: e.t, fini: e.fin, log };
}

const fmt = (s: number): string => `${Math.floor(s / 60)}m${String(Math.floor(s % 60)).padStart(2, "0")}`;

function trace(e: Etat): string {
  const m = mods(e);
  const u = UNITES.filter((x) => e.unites[x.id]).map((x) => `${x.id}:${e.unites[x.id]}`).join(" ");
  return `${fmt(e.t)} p${e.phase}${e.espace ? "E" + e.frontiere : ""} doss=${e.dossiers.toExponential(2)} bud=${e.budget.toExponential(2)} timbre=${e.timbre.toFixed(2)} cap=${capacite(e, m).toExponential(2)} dep=${e.flux.deposes.toExponential(2)} ren=${e.flux.renonce.toFixed(2)} aff=${e.affichage} galons=${e.galons} R${e.reunions}/C${e.classeurs} notes=${Math.round(e.notes)}/${Math.round(capNotes(e, m))} cerfa=${e.cerfas.length} reg=${e.regions.length} grogne=${e.grogne.toFixed(0)} guich=${e.guichetsAuto.toExponential(2)} proj=${e.projets.length} ${u}`;
}

function decider(e: Etat): void {
  const m = mods(e);

  // grève : on négocie si possible, sinon on attend
  if (e.greve && !decisionGreve(e, "negocier")) decisionGreve(e, "attendre");
  if (e.grogne > 70 && campagneDisponible(e) && coutCampagne(e) < e.budget * 0.5) lancerCampagne(e);

  // timbre : le prix qui maximise le bénéfice
  if (!e.espace && Math.floor(e.t) % 3 === 0) e.timbre = meilleurTimbre(e).timbre;

  // papier à la main tant qu'il n'y a pas la commande groupée
  if (!e.autoRamette && !e.espace) {
    const besoin = (capacite(e, m) + 3) * m.feuilles * 30;
    if (e.feuilles < besoin && (e.prixRamette < 21 || e.feuilles < besoin / 3)) acheterRamettes(e, 1);
  }

  // galons : classeur si un projet visible dépasse le plafond, sinon réunion
  while (e.galonsLibres > 0) {
    const visibles = projetsVisibles(e);
    const plusCher = Math.max(0, ...visibles.map((p) => p.notes ?? 0), e.phase >= 2 && !e.espace ? coutCerfa(e.cerfas.length) : 0);
    placerGalon(e, plusCher > capNotes(e, m) ? "classeur" : "reunion");
  }

  // projets : tout ce qui est abordable
  for (const p of projetsVisibles(e)) acheterProjet(e, p.id);

  // Cerfa si les notes débordent et qu'aucun projet n'attend
  if (e.phase >= 2 && !e.espace) {
    const attente = projetsVisibles(e).some((p) => (p.notes ?? 0) <= capNotes(e, mods(e)));
    if (!attente && e.notes >= coutCerfa(e.cerfas.length)) inventerCerfa(e);
  }

  if (e.espace) return;

  // budget : l'achat qui se rembourse le plus vite
  for (let garde = 0; garde < 200; garde++) {
    const base = meilleurTimbre(e).profit;
    const options: { gain: number; cout: number; faire: () => boolean }[] = [];
    const essai = (cout: number, faire: () => boolean, avant: () => void, apres: () => void): void => {
      avant();
      const gain = meilleurTimbre(e).profit - base;
      apres();
      options.push({ gain: Math.max(gain, 1e-9), cout, faire });
    };
    for (const u of UNITES) {
      if (!uniteDisponible(e, u.id as UniteId)) continue;
      essai(coutUnite(u, e.unites[u.id]), () => acheterUnite(e, u.id), () => e.unites[u.id]++, () => e.unites[u.id]--);
    }
    if (affichageDisponible(e)) essai(coutAffichage(e.affichage), () => acheterAffichage(e), () => e.affichage++, () => e.affichage--);
    if (e.phase === 3) {
      const r = REGIONS.filter((x) => !e.regions.includes(x.id)).sort((a, b) => b.pop - a.pop)[0];
      if (r) essai(coutRegion(e.regions.length), () => ouvrirRegion(e, r.id), () => e.regions.push(r.id), () => e.regions.pop());
    }
    // garder de quoi payer les projets qui demandent du budget
    const reserve = Math.max(0, ...projetsVisibles(e).filter((p) => (p.notes ?? 0) <= e.notes).map((p) => p.budget ?? 0));
    options.sort((a, b) => a.cout / a.gain - b.cout / b.gain);
    const best = options[0];
    if (!best || best.cout > e.budget - reserve - (e.autoRamette ? 0 : 25)) break;
    if (!best.faire()) break;
  }
}

// Bénéfice par seconde au meilleur prix du timbre (papier déduit).
function meilleurTimbre(e: Etat): { timbre: number; profit: number } {
  const m = mods(e);
  const cap = Math.max(capacite(e, m), e.t < 600 ? 3 * m.clic : 1);
  const t0 = e.timbre;
  let best = { timbre: t0, profit: -Infinity };
  for (let p = 0.05; p < 1e4; p = Math.max(p + 0.05, Math.round(p * 1.08 * 20) / 20)) {
    e.timbre = p;
    const q = Math.min(usagersParSec(e, m) * pieces(e, m), cap);
    const profit = q * (recetteParDossier(e, m) - (m.feuilles * PRIX_RAMETTE_MOYEN) / FEUILLES_PAR_RAMETTE);
    if (profit > best.profit) best = { timbre: p, profit };
  }
  e.timbre = t0;
  return best;
}
