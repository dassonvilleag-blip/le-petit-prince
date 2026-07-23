interface CommentTier {
  min: number;
  lines: string[];
}

export const ROUND_COMMENTS: CommentTier[] = [
  {
    min: 950,
    lines: [
      "Radar à prix intégré, sérieux.",
      "Précision chirurgicale. On se calme.",
      "T'as un abonnement à la vraie vie ou quoi ?",
    ],
  },
  {
    min: 800,
    lines: [
      "Très solide, tu sens le marché.",
      "Presque trop bon pour être honnête.",
      "Le vendeur t'aurait embauché direct.",
    ],
  },
  {
    min: 600,
    lines: [
      "Correct, sans plus. Tu tâtonnes bien.",
      "Dans le bon quartier, pas dans la bonne rue.",
      "On sent l'effort. Ça paie un peu.",
    ],
  },
  {
    min: 350,
    lines: [
      "Bon, on va dire que t'as tenté quelque chose.",
      "Ça sent le chiffre lancé en l'air.",
      "Un peu au hasard, avoue.",
    ],
  },
  {
    min: 150,
    lines: [
      "Aïe. Tu vis sur une autre planète niveau prix.",
      "Alors là, non.",
      "Le porte-monnaie a dû trembler en lisant ça.",
    ],
  },
  {
    min: 0,
    lines: [
      "Au doigt mouillé, littéralement.",
      "Tu confonds peut-être avec le prix d'un pays entier.",
      "C'est pas grave, respire.",
    ],
  },
];

export function pickRoundComment(score: number): string {
  const tier = ROUND_COMMENTS.find((t) => score >= t.min)!;
  return tier.lines[Math.floor(Math.random() * tier.lines.length)];
}

export const CLOSING_COMMENTS: CommentTier[] = [
  {
    min: 8500,
    lines: [
      "Tu ferais un excellent commissaire-priseur.",
      "Sérieusement, tu bosses dans l'estimation ou c'est un don ?",
    ],
  },
  {
    min: 6000,
    lines: [
      "Bon niveau, tu as le sens des étiquettes.",
      "Pas mal du tout, tu sors gagnant de ce magasin imaginaire.",
    ],
  },
  {
    min: 3500,
    lines: [
      "Moyen, mais on a vu pire au rayon estimation.",
      "Ça se discute, comme au marché.",
    ],
  },
  {
    min: 0,
    lines: [
      "Radar à prix cassé. Direction le stage chez un antiquaire.",
      "Tu ferais un mauvais commissaire-priseur.",
    ],
  },
];

export function pickClosingComment(totalScore: number): string {
  const tier = CLOSING_COMMENTS.find((t) => totalScore >= t.min)!;
  return tier.lines[Math.floor(Math.random() * tier.lines.length)];
}
