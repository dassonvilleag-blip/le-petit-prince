// Règles pures du Perudo (dés menteurs) — aucune dépendance, tout est
// vérifiable côté serveur : validation des enchères, comptage des dés,
// résolution des défis. La face 1 est le « paco » (l'étoile ⭐) : joker qui
// compte pour toutes les faces… sauf en manche palifico.

export interface Bid {
  count: number;
  face: number; // 1..6, 1 = paco/étoile
}

export const DICE_PER_PLAYER = 5;
export const FACES = [1, 2, 3, 4, 5, 6];

export const rollDice = (n: number, random: () => number = Math.random): number[] =>
  Array.from({ length: n }, () => 1 + Math.floor(random() * 6));

const isFace = (face: number): boolean => Number.isInteger(face) && face >= 1 && face <= 6;

/**
 * Une enchère est-elle jouable après `prev` ?
 * - ouverture : n'importe quelle face sauf les pacos (autorisés en palifico)
 * - passage aux pacos : au moins la moitié (arrondie au-dessus) du compte
 * - retour des pacos aux faces : au moins le double plus un
 * - sinon : compte strictement supérieur, ou même compte et face supérieure
 * - palifico : la face de l'ouverture est figée, seul le compte grimpe
 * Le compte est borné par le nombre total de dés en jeu.
 */
export function isValidBid(prev: Bid | null, next: Bid, totalDice: number, palifico: boolean): boolean {
  if (!isFace(next.face) || !Number.isInteger(next.count)) return false;
  if (next.count < 1 || next.count > totalDice) return false;

  if (prev === null) {
    return palifico || next.face !== 1;
  }

  if (palifico) {
    return next.face === prev.face && next.count > prev.count;
  }

  if (next.face === 1 && prev.face !== 1) return next.count >= Math.ceil(prev.count / 2);
  if (next.face !== 1 && prev.face === 1) return next.count >= prev.count * 2 + 1;
  return next.count > prev.count || (next.count === prev.count && next.face > prev.face);
}

/** Compte les dés qui valident une enchère (les pacos sont jokers hors palifico). */
export function countMatching(allDice: number[][], face: number, palifico: boolean): number {
  let total = 0;
  for (const dice of allDice) {
    for (const d of dice) {
      if (d === face || (!palifico && face !== 1 && d === 1)) total++;
    }
  }
  return total;
}

/** Résout un « dudo » : si l'enchère tient, le challenger perd un dé, sinon l'enchérisseur. */
export function resolveDudo(bid: Bid, actual: number): "bidder" | "challenger" {
  return actual >= bid.count ? "challenger" : "bidder";
}

/** Résout un « calza » : pile le bon compte, le joueur regagne un dé ; sinon il en perd un. */
export function resolveCalza(bid: Bid, actual: number): "gain" | "lose" {
  return actual === bid.count ? "gain" : "lose";
}
