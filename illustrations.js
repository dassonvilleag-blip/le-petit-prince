// Illustrations vectorielles plates, dessinées à la main, viewBox 0 0 100 100.
// Une entrée par `slug` de data.js. Silhouette unique en fill="#33302c" (var(--text)).
export const ILLUSTRATIONS = {
  'big-bang': `<path d="M50 6 L58 40 L92 50 L58 60 L50 94 L42 60 L8 50 L42 40 Z"/>`,

  'formation-voie-lactee': `
    <circle cx="50" cy="50" r="10"/>
    <ellipse cx="50" cy="50" rx="42" ry="12" fill="none" stroke="#33302c" stroke-width="4" transform="rotate(0 50 50)"/>
    <ellipse cx="50" cy="50" rx="42" ry="12" fill="none" stroke="#33302c" stroke-width="4" transform="rotate(60 50 50)"/>
    <ellipse cx="50" cy="50" rx="42" ry="12" fill="none" stroke="#33302c" stroke-width="4" transform="rotate(120 50 50)"/>`,

  'formation-systeme-solaire': `
    <circle cx="50" cy="50" r="9"/>
    <circle cx="50" cy="50" r="22" fill="none" stroke="#33302c" stroke-width="2"/>
    <circle cx="50" cy="50" r="34" fill="none" stroke="#33302c" stroke-width="2"/>
    <circle cx="50" cy="50" r="45" fill="none" stroke="#33302c" stroke-width="2"/>
    <circle cx="72" cy="50" r="4"/>
    <circle cx="16" cy="50" r="3"/>
    <circle cx="50" cy="5" r="3.5"/>`,

  'formation-terre': `
    <circle cx="50" cy="50" r="38" fill="none" stroke="#33302c" stroke-width="5"/>
    <path d="M25 38 Q35 30 45 38 Q40 48 28 46 Z"/>
    <path d="M55 55 Q70 50 78 62 Q68 72 55 68 Z"/>`,

  'formation-lune': `<path d="M60 8 A42 42 0 1 0 60 92 A32 32 0 1 1 60 8 Z"/>`,

  'apparition-eau-liquide': `
    <path d="M8 35 Q25 25 42 35 T76 35 T110 35" fill="none" stroke="#33302c" stroke-width="6" stroke-linecap="round"/>
    <path d="M8 55 Q25 45 42 55 T76 55 T110 55" fill="none" stroke="#33302c" stroke-width="6" stroke-linecap="round"/>
    <path d="M8 75 Q25 65 42 75 T76 75 T110 75" fill="none" stroke="#33302c" stroke-width="6" stroke-linecap="round"/>`,

  'premiere-vie': `
    <path d="M50 20 Q80 20 82 50 Q84 82 52 80 Q18 78 20 48 Q22 22 50 20 Z"/>
    <circle cx="48" cy="48" r="8" fill="#fbf9f6"/>`,

  'grande-oxydation': `
    <circle cx="35" cy="78" r="8"/>
    <circle cx="55" cy="55" r="11"/>
    <circle cx="42" cy="30" r="14"/>`,

  'premiers-eucaryotes': `
    <circle cx="50" cy="50" r="40" fill="none" stroke="#33302c" stroke-width="5"/>
    <circle cx="50" cy="50" r="15"/>`,

  'premiers-organismes-multicellulaires': `
    <circle cx="35" cy="40" r="16"/>
    <circle cx="65" cy="38" r="14"/>
    <circle cx="50" cy="65" r="18"/>
    <circle cx="72" cy="66" r="10"/>`,

  'explosion-cambrienne': `<path d="M50 4 L57 34 L86 22 L64 44 L96 50 L64 56 L86 78 L57 66 L50 96 L43 66 L14 78 L36 56 L4 50 L36 44 L14 22 L43 34 Z"/>`,

  'sortie-des-eaux': `
    <path d="M10 55 Q35 30 60 55 Q50 62 45 58 Q35 68 20 60 Q14 58 10 55 Z"/>
    <path d="M60 55 L82 45 L78 55 L82 65 Z"/>`,

  'apparition-dinosaures': `
    <path d="M15 70 Q10 40 30 32 Q34 22 42 26 Q40 32 36 34 Q55 34 62 50 Q78 48 88 58 Q80 60 70 58 Q72 66 66 72 Q66 64 60 60 Q40 62 30 58 Q22 66 15 70 Z"/>`,

  'apparition-mammiferes': `
    <ellipse cx="45" cy="60" rx="26" ry="16"/>
    <circle cx="76" cy="50" r="13"/>
    <path d="M84 40 L90 30 L86 42 Z"/>
    <path d="M70 40 L68 28 L76 38 Z"/>
    <path d="M20 60 Q8 66 6 76" fill="none" stroke="#33302c" stroke-width="4" stroke-linecap="round"/>`,

  'apparition-oiseaux': `<path d="M50 30 Q20 20 6 40 Q26 38 40 48 Q20 52 12 68 Q34 62 46 46 Q50 62 44 78 Q58 64 56 46 Q68 60 90 62 Q78 48 60 44 Q76 34 94 36 Q78 20 50 30 Z"/>`,

  'extinction-dinosaures': `
    <circle cx="62" cy="34" r="14"/>
    <path d="M20 78 L80 78 M30 70 L70 70 M38 62 L86 62" fill="none" stroke="#33302c" stroke-width="4" stroke-linecap="round"/>`,

  'premiers-primates': `
    <circle cx="50" cy="45" r="24"/>
    <circle cx="28" cy="35" r="9"/>
    <circle cx="72" cy="35" r="9"/>
    <ellipse cx="50" cy="80" rx="20" ry="14"/>`,

  'separation-humains-chimpanzes': `
    <path d="M50 90 L50 55" fill="none" stroke="#33302c" stroke-width="6" stroke-linecap="round"/>
    <path d="M50 55 L20 15" fill="none" stroke="#33302c" stroke-width="6" stroke-linecap="round"/>
    <path d="M50 55 L80 15" fill="none" stroke="#33302c" stroke-width="6" stroke-linecap="round"/>
    <circle cx="20" cy="10" r="8"/>
    <circle cx="80" cy="10" r="8"/>`,

  'premiers-homo': `<path d="M30 90 L45 20 L58 20 L48 55 L70 45 L52 65 L60 90 L48 90 L42 68 L36 90 Z"/>`,

  'maitrise-du-feu': `<path d="M50 10 Q66 34 56 48 Q70 46 68 62 Q66 84 50 90 Q30 84 32 62 Q34 70 40 70 Q34 56 44 44 Q44 54 48 54 Q42 30 50 10 Z"/>`,

  'apparition-homo-sapiens': `
    <circle cx="50" cy="20" r="12"/>
    <path d="M50 32 L50 65 M50 40 L28 55 M50 40 L72 55 M50 65 L34 92 M50 65 L66 92" fill="none" stroke="#33302c" stroke-width="7" stroke-linecap="round"/>`,

  'sortie-afrique': `
    <ellipse cx="42" cy="70" rx="16" ry="24" transform="rotate(-10 42 70)"/>
    <circle cx="30" cy="42" r="6"/>
    <circle cx="38" cy="38" r="5"/>
    <circle cx="47" cy="36" r="5"/>
    <circle cx="55" cy="38" r="5"/>`,

  'invention-agriculture': `
    <path d="M50 92 L50 30" fill="none" stroke="#33302c" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="42" cy="30" rx="6" ry="12" transform="rotate(-20 42 30)"/>
    <ellipse cx="58" cy="30" rx="6" ry="12" transform="rotate(20 58 30)"/>
    <ellipse cx="50" cy="20" rx="6" ry="14"/>
    <ellipse cx="42" cy="46" rx="6" ry="12" transform="rotate(-20 42 46)"/>
    <ellipse cx="58" cy="46" rx="6" ry="12" transform="rotate(20 58 46)"/>`,

  'invention-ecriture': `
    <rect x="18" y="15" width="64" height="70" rx="4" fill="none" stroke="#33302c" stroke-width="5"/>
    <path d="M28 32 L72 32 M28 46 L72 46 M28 60 L58 60" fill="none" stroke="#33302c" stroke-width="5" stroke-linecap="round"/>`,

  'pyramides-gizeh': `
    <path d="M50 12 L88 82 L12 82 Z"/>
    <path d="M8 82 L92 82" fill="none" stroke="#33302c" stroke-width="4" stroke-linecap="round"/>`,

  'fondation-rome': `
    <rect x="20" y="12" width="60" height="8"/>
    <rect x="20" y="80" width="60" height="8"/>
    <rect x="28" y="24" width="8" height="52"/>
    <rect x="46" y="24" width="8" height="52"/>
    <rect x="64" y="24" width="8" height="52"/>`,

  'chute-empire-romain': `
    <rect x="14" y="16" width="10" height="48" transform="rotate(-8 14 16)"/>
    <rect x="60" y="40" width="10" height="44" transform="rotate(12 60 40)"/>
    <rect x="20" y="82" width="60" height="8"/>`,

  'invention-imprimerie': `
    <path d="M50 20 Q30 12 12 20 L12 76 Q30 68 50 76 Q70 68 88 76 L88 20 Q70 12 50 20 Z" fill="none" stroke="#33302c" stroke-width="5"/>
    <path d="M50 20 L50 76" fill="none" stroke="#33302c" stroke-width="4"/>`,

  'revolution-francaise': `
    <path d="M30 8 L30 92" fill="none" stroke="#33302c" stroke-width="5" stroke-linecap="round"/>
    <path d="M30 14 L82 26 L30 40 Z"/>`,

  'premier-pas-lune': `
    <path d="M50 10 L66 40 L58 80 Q50 90 42 80 L34 40 Z"/>
    <path d="M40 50 L60 50 M42 62 L58 62" fill="none" stroke="#fbf9f6" stroke-width="4"/>
    <path d="M28 88 Q40 82 50 88 Q60 82 72 88" fill="none" stroke="#33302c" stroke-width="4" stroke-linecap="round"/>`,

  'aujourdhui': `
    <path d="M50 90 Q20 60 20 38 A30 30 0 1 1 80 38 Q80 60 50 90 Z" fill="none" stroke="#33302c" stroke-width="5"/>
    <circle cx="50" cy="38" r="11"/>`,
};
