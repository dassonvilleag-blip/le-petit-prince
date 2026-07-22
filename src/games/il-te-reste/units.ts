export const LIFE_EXPECTANCY_YEARS = 80;

export interface UnitDef {
  label: string;
  perYear: number;
}

export const UNITS: UnitDef[] = [
  { label: "nuits de sommeil", perYear: 365.25 },
  { label: "dimanches", perYear: 52.14 },
  { label: "lundis (le retour de vacances)", perYear: 52.14 },
  { label: "anniversaires", perYear: 1 },
  { label: "réveillons du 31 décembre", perYear: 1 },
  { label: "tasses de café", perYear: 730 },
  { label: "pizzas", perYear: 52 },
  { label: "verres d'eau", perYear: 2190 },
  { label: "repas", perYear: 1095 },
  { label: "fois où tu vas dire « c'est la dernière part promis »", perYear: 20 },
  { label: "fois où tu vas reperdre tes clés", perYear: 12 },
  { label: "fois où tu vas chercher ton téléphone alors qu'il est dans ta main", perYear: 20 },
  { label: "paires de chaussettes dépareillées après la lessive", perYear: 10 },
  { label: "cafés ou thés renversés sur toi", perYear: 3 },
  { label: "fois où tu vas te cogner le petit orteil", perYear: 8 },
  { label: "chargeurs perdus ou cassés", perYear: 2 },
  { label: "fois où tu vas dire « je commence lundi »", perYear: 52 },
  { label: "séries Netflix commencées sans être finies", perYear: 6 },
  { label: "fois où tu vas dire « on se refait ça vite »", perYear: 8 },
  { label: "bonnes résolutions abandonnées avant février", perYear: 1 },
  { label: "livres achetés jamais lus", perYear: 3 },
  { label: "déverrouillages de téléphone", perYear: 29200 },
  { label: "notifications reçues", perYear: 18250 },
  { label: "mots de passe oubliés", perYear: 6 },
  { label: "fois où quelqu'un te dira « ça passe vite la vie »", perYear: 5 },
  { label: "fois où tu parleras de la météo pour meubler un silence", perYear: 100 },
  { label: "couchers de soleil que tu pourrais regarder", perYear: 52 },
  { label: "éternuements", perYear: 365 },
  { label: "litres de salive produits", perYear: 438 },
  { label: "cheveux perdus", perYear: 36500 },
  { label: "respirations", perYear: 8409600 },
  { label: "clignements des yeux", perYear: 5956800 },
  { label: "pas effectués", perYear: 2555000 },
  { label: "battements de cœur", perYear: 42048000 },
];

export interface UnitValue {
  label: string;
  value: number;
}

export interface ComputedResult {
  daysLeft: number;
  units: UnitValue[];
}

export function computeUnitValues(birthDate: Date, today: Date): ComputedResult | null {
  const targetDate = new Date(birthDate);
  targetDate.setFullYear(targetDate.getFullYear() + LIFE_EXPECTANCY_YEARS);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.floor((targetDate.getTime() - today.getTime()) / msPerDay);
  if (daysLeft <= 0) return null;
  const yearsLeft = daysLeft / 365.25;
  const units = UNITS.map((u) => ({ label: u.label, value: Math.round(yearsLeft * u.perYear) }));
  return { daysLeft, units };
}
