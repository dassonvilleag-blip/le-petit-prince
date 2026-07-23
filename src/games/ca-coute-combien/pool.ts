export interface PoolItem {
  id: string;
}

export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// If `roundSize` exceeds the total number of items in `items`, the returned round is silently truncated to the pool size (fewer than `roundSize` items).
export function drawRound<T extends PoolItem>(
  items: readonly T[],
  seenIds: readonly string[],
  roundSize: number,
): { round: T[]; updatedSeenIds: string[] } {
  const unseen = shuffle(items.filter((item) => !seenIds.includes(item.id)));
  const round = unseen.slice(0, roundSize);

  if (round.length === roundSize) {
    return { round, updatedSeenIds: [...seenIds, ...round.map((item) => item.id)] };
  }

  // Pool exhausted mid-draw: start a fresh cycle, refill the remainder from
  // the full pool (excluding what's already picked, so nothing repeats
  // within the same round), and reset seenIds to just this round's picks.
  const pickedIds = new Set(round.map((item) => item.id));
  const freshPool = shuffle(items.filter((item) => !pickedIds.has(item.id)));
  round.push(...freshPool.slice(0, roundSize - round.length));

  return { round, updatedSeenIds: round.map((item) => item.id) };
}
