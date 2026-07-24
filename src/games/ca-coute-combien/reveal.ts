export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 3);
}

export function interpolate(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}
