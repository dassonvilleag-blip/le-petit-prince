export function computeRoundScore(guess: number, price: number): number {
  if (price <= 0) return 0;
  const errorRatio = Math.abs(guess - price) / price;
  const raw = 1000 * (1 - errorRatio);
  return Math.round(Math.max(0, Math.min(1000, raw)));
}
