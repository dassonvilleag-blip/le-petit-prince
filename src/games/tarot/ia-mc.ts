// Le Tarot — niveau difficile : Monte-Carlo par « déterminisation ».
// On ne connaît pas les mains adverses, alors on en tire au sort des dizaines
// de versions compatibles avec tout ce qu'on a vu (coupes, sous-coupes,
// poignées, chien montré, règles de l'écart). Pour chaque version, chaque coup
// possible est joué jusqu'au bout avec une politique rapide, et l'on garde le
// coup dont le score moyen est le meilleur.

import { ATOUT, EXCUSE, NB_CARTES, couleur, estAtout, estBout, estRoi, rang, type Alea, type Carte } from "./cartes.ts";
import { jouer, legaux, type Donne } from "./donne.ts";
import { GARDE } from "./regles.ts";

/** ce que l'IA sait (sous-ensemble de Connaissance, pour éviter un import circulaire) */
export interface Indices {
  moi: number;
  jouees: Set<Carte>;
  vides: boolean[][];
  plafondAtout: number[];
}

export type Politique = (d: Donne, j: number) => Carte;

export function cloner(d: Donne): Donne {
  return {
    ...d,
    mains: d.mains.map((m) => [...m]),
    annonces: [...d.annonces],
    ecart: [...d.ecart],
    plis: [...d.plis],
    pli: { cartes: [...d.pli.cartes], joueurs: [...d.pli.joueurs] },
    poignees: [...d.poignees],
  };
}

/**
 * Tire une répartition des cartes inconnues compatible avec les indices.
 * Retourne les mains de tous les joueurs et l'écart, ou null si les
 * contraintes n'ont pas pu être satisfaites.
 */
export function echantillonner(d: Donne, ind: Indices, alea: Alea, strict = true): { mains: Carte[][]; ecart: Carte[] } | null {
  const { moi } = ind;
  const ECART = d.n; // emplacement « écart » après les joueurs
  const jeConnaisLEcart = moi === d.preneur && d.contrat <= GARDE;
  const ecartReglemente = d.contrat <= GARDE; // en garde sans/contre, le chien est brut

  const mains: Carte[][] = d.mains.map((m, j) => (j === moi ? [...m] : []));
  const ecart: Carte[] = jeConnaisLEcart ? [...d.ecart] : [];
  const capacite = d.mains.map((m, j) => (j === moi ? 0 : m.length));
  capacite.push(jeConnaisLEcart ? 0 : d.ecart.length);

  const place = new Set<Carte>(d.mains[moi]);
  for (const c of ind.jouees) place.add(c);
  if (jeConnaisLEcart) for (const c of d.ecart) place.add(c);

  const poser = (c: Carte, s: number): void => {
    (s === ECART ? ecart : mains[s]).push(c);
    capacite[s]--;
    place.add(c);
  };

  // emplacements connus : atouts montrés en poignée (pas encore joués), atouts écartés
  for (const p of d.poignees) {
    if (p.joueur === moi) continue;
    for (const c of p.atouts) if (!place.has(c)) poser(c, p.joueur);
  }
  if (!jeConnaisLEcart) for (const c of d.ecartMontre) if (!place.has(c)) poser(c, ECART);

  const chienVu = d.chienMontre && moi !== d.preneur ? new Set(d.chien) : null;

  const autorise = (c: Carte, s: number): boolean => {
    if (capacite[s] <= 0) return false;
    if (!strict) return true;
    // une carte vue au chien est chez le preneur ou dans son écart
    if (chienVu && chienVu.has(c) && s !== d.preneur && s !== ECART) return false;
    if (s === ECART) return !ecartReglemente || (!estRoi(c) && !estBout(c) && !estAtout(c));
    if (c === EXCUSE) return true;
    const coul = couleur(c);
    if (ind.vides[s][coul]) return false;
    if (coul === ATOUT && rang(c) > ind.plafondAtout[s]) return false;
    return true;
  };

  const inconnues: Carte[] = [];
  for (let c = 0; c < NB_CARTES; c++) if (!place.has(c)) inconnues.push(c);
  const emplacements = Array.from({ length: d.n + 1 }, (_, s) => s);

  // les cartes les plus contraintes d'abord
  const options = (c: Carte): number => emplacements.filter((s) => autorise(c, s)).length;
  const ordre = inconnues.map((c) => ({ c, o: options(c), r: alea() })).sort((a, b) => a.o - b.o || a.r - b.r);

  for (const { c } of ordre) {
    const possibles = emplacements.filter((s) => autorise(c, s));
    if (possibles.length === 0) return null;
    // tirage pondéré par la place restante
    let total = 0;
    for (const s of possibles) total += capacite[s];
    let x = alea() * total;
    let choisi = possibles[possibles.length - 1];
    for (const s of possibles) {
      x -= capacite[s];
      if (x < 0) {
        choisi = s;
        break;
      }
    }
    poser(c, choisi);
  }
  return { mains, ecart };
}

function deroulerJusquauBout(sim: Donne, politique: Politique): void {
  while (sim.phase === "jeu") jouer(sim, sim.tour, politique(sim, sim.tour));
}

export function choisirCarteMC(
  d: Donne,
  ind: Indices,
  alea: Alea,
  politique: Politique,
  budget = 2400,
): Carte {
  const moi = ind.moi;
  const coups = legaux(d, moi);
  if (coups.length === 1) return coups[0];

  const nbEchantillons = Math.max(12, Math.min(80, Math.floor(budget / coups.length)));
  const totaux = new Array(coups.length).fill(0);

  for (let e = 0; e < nbEchantillons; e++) {
    let tirage = null;
    for (let essai = 0; essai < 20 && !tirage; essai++) tirage = echantillonner(d, ind, alea);
    tirage ??= echantillonner(d, ind, alea, false);
    if (!tirage) continue;

    const base = cloner(d);
    base.mains = tirage.mains;
    base.ecart = tirage.ecart;
    if (!d.partenaireRevele && d.carteAppelee >= 0) {
      const porteur = tirage.mains.findIndex((m) => m.includes(d.carteAppelee));
      base.partenaire = porteur >= 0 && porteur !== d.preneur ? porteur : -1;
    }

    for (let i = 0; i < coups.length; i++) {
      const sim = cloner(base);
      jouer(sim, moi, coups[i]);
      deroulerJusquauBout(sim, politique);
      totaux[i] += sim.decompte!.scores[moi];
    }
  }

  let meilleur = 0;
  for (let i = 1; i < coups.length; i++) if (totaux[i] > totaux[meilleur]) meilleur = i;
  return coups[meilleur];
}
