// Aléatoire déterministe : une même graine rejoue la même vie, ce qui permet
// la « vie du jour » et de reproduire un bug.

export interface Rng {
  (): number;
  etat(): number;
}

export function creerRng(graine: number): Rng {
  let a = graine >>> 0;
  const rng = (() => {
    // mulberry32
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as Rng;
  rng.etat = () => a;
  return rng;
}

export function hacher(texte: string): number {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function entre(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function parmi<T>(rng: () => number, liste: readonly T[]): T {
  return liste[Math.floor(rng() * liste.length)];
}

export function pondere<T>(rng: () => number, items: readonly T[], poids: (t: T) => number): T | undefined {
  let total = 0;
  for (const it of items) total += Math.max(0, poids(it));
  if (total <= 0) return undefined;
  let r = rng() * total;
  for (const it of items) {
    r -= Math.max(0, poids(it));
    if (r < 0) return it;
  }
  return items[items.length - 1];
}

/** Loi normale (Box-Muller). */
export function gauss(rng: () => number, moyenne: number, ecart: number): number {
  const u = 1 - rng();
  const v = rng();
  return moyenne + ecart * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
