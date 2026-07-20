export const MAX_YEARS_AGO = 13_800_000_000;

export function yearsAgoToPosition(yearsAgo, maxYearsAgo = MAX_YEARS_AGO) {
  if (yearsAgo <= 0) return 0;
  return Math.log1p(yearsAgo) / Math.log1p(maxYearsAgo);
}

export function positionToYearsAgo(position, maxYearsAgo = MAX_YEARS_AGO) {
  if (position <= 0) return 0;
  return Math.expm1(position * Math.log1p(maxYearsAgo));
}
