// Les Caravanes — le marchandage, en logique pure. Le marchand a une marge
// secrète (ce qu'il acceptera au-dessus du prix affiché) et une patience.
// À chaque refus il fait une contre-offre un peu meilleure : prendre sa
// contre-offre est sans risque, pousser plus loin use sa patience.

import { CARACTERES, COMPLIMENT_CHARMEUR, DECOTE_FACHE, type Caractere } from "./data.ts";

export interface Negociation {
  caractere: Caractere;
  valeur: number; // prix affiché de la cargaison
  marge: number; // secrète : au-delà, refus
  patience: number;
  patienceMax: number;
  contreOffre: number; // marge qu'il propose en ce moment (0 = prix affiché)
  refus: number;
  complimente: boolean;
  fin: null | { marge: number; fache: boolean };
  talents: Talents;
  fourchette: [number, number] | null; // œil du marchand : encadre la marge secrète
}

// Ce que les compétences de négoce changent au marchandage.
export interface Talents {
  patience: number; // en plus
  marge: number; // en plus
  charmeur: boolean;
  oeil: boolean;
}

export const SANS_TALENT: Talents = { patience: 0, marge: 0, charmeur: false, oeil: false };

const LARGEUR_FOURCHETTE = 0.1;

// Part de sa marge secrète qu'il concède après 1, 2, 3… refus.
const CONCESSIONS = [0.35, 0.6, 0.8, 0.9, 0.95];

export function ouvrir(
  caractere: Caractere,
  valeur: number,
  alea: () => number = Math.random,
  talents: Talents = SANS_TALENT
): Negociation {
  const c = CARACTERES[caractere];
  const marge = c.margeMin + alea() * (c.margeMax - c.margeMin) + talents.marge;
  const bas = Math.max(0, marge - alea() * LARGEUR_FOURCHETTE);
  return {
    caractere,
    valeur,
    marge,
    patience: c.patience + talents.patience,
    patienceMax: c.patience + talents.patience,
    contreOffre: 0,
    refus: 0,
    complimente: false,
    fin: null,
    talents,
    fourchette: talents.oeil ? [bas, bas + LARGEUR_FOURCHETTE] : null,
  };
}

export type Reaction = "accepte" | "presque" | "trop" | "beaucoup-trop" | "insulte" | "fache";

// Le joueur demande `demande` (0,2 = +20 % sur le prix affiché).
export function proposer(n: Negociation, demande: number): Reaction {
  if (n.fin) return n.fin.fache ? "fache" : "accepte";
  if (demande <= n.marge + 1e-9) {
    n.fin = { marge: demande, fache: false };
    return "accepte";
  }
  n.patience--;
  n.refus++;
  if (n.patience <= 0) {
    n.fin = { marge: DECOTE_FACHE - 1, fache: true };
    return "fache";
  }
  const concession = CONCESSIONS[Math.min(n.refus, CONCESSIONS.length) - 1];
  n.contreOffre = Math.max(n.contreOffre, Math.floor(n.marge * concession * 100) / 100);
  const ecart = demande - n.marge;
  if (ecart > 0.2) return "insulte";
  if (ecart > 0.1) return "beaucoup-trop";
  if (ecart > 0.04) return "trop";
  return "presque";
}

export function accepterContreOffre(n: Negociation): void {
  if (!n.fin) n.fin = { marge: n.contreOffre, fache: false };
}

// Un compliment, une seule fois par négociation. Renvoie sa réponse.
export function complimenter(n: Negociation): string {
  const c = CARACTERES[n.caractere].compliment;
  if (n.complimente || n.fin) return "";
  n.complimente = true;
  // le charmeur ne rate jamais son effet et n'agace personne
  const gain = n.talents.charmeur ? Math.max(c.marge, COMPLIMENT_CHARMEUR) : c.marge;
  n.marge += gain;
  if (n.fourchette) n.fourchette = [n.fourchette[0] + gain, n.fourchette[1] + gain];
  if (n.talents.charmeur) return c.marge > 0 ? c.reponse : "Oh… Vous savez parler aux gens, vous.";
  n.patience = Math.min(n.patienceMax, n.patience + c.patience);
  if (n.patience <= 0) n.fin = { marge: DECOTE_FACHE - 1, fache: true };
  return c.reponse;
}

export function montantFinal(n: Negociation): number {
  return n.fin ? n.valeur * (1 + n.fin.marge) : n.valeur;
}
