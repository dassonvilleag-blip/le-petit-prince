export const MAX_YEARS_AGO = 13_800_000_000;

// Échelle logarithmique : la moitié de la frise couvre les derniers ~100 000 ans,
// l'autre moitié remonte jusqu'au Big Bang.
export function yearsAgoToPosition(yearsAgo: number, maxYearsAgo = MAX_YEARS_AGO): number {
  if (yearsAgo <= 0) return 0;
  return Math.log1p(yearsAgo) / Math.log1p(maxYearsAgo);
}

export function positionToYearsAgo(position: number, maxYearsAgo = MAX_YEARS_AGO): number {
  if (position <= 0) return 0;
  return Math.expm1(position * Math.log1p(maxYearsAgo));
}
