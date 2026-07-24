export function computeRoundScore(guess: number, price: number): number {
  if (price <= 0 || guess <= 0) return 0;
  const logError = Math.abs(Math.log(guess / price));
  const raw = 1000 * (1 - logError / Math.log(10));
  return Math.round(Math.max(0, Math.min(1000, raw)));
}
