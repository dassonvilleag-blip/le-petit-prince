// Ce que la vie fait d'elle-même, entre deux coups du destin : chercher du
// travail, partir en voyage, faire un banquet… Chaque action se fait à la main
// (une fois par an au plus) ou se règle en habitude : tous les N ans, toute seule.

import type { Condition, Effet, Metier, Test, Texte } from "./types.ts";

export interface IssueAction {
  si?: Condition;
  poids?: number;
  texte: Texte;
  effets?: Effet;
}

export interface ActionVie {
  id: string;
  nom: string;
  icone: string;
  /** Une ligne sous le bouton. */
  detail: string;
  si?: Condition;
  /** En berrys, payé à chaque fois. */
  cout?: number;
  /** Peut se régler en habitude (tous les N ans). */
  habitude?: boolean;
  /** On ne revient pas en arrière : l'interface demande confirmation. */
  bascule?: boolean;
  /** Une issue tirée parmi celles dont la condition passe. */
  issues?: IssueAction[];
  test?: Test;
}

/** Les rythmes proposés pour une habitude, en années. */
export const RYTHMES = [1, 2, 3, 5];

const METIER_PAR_ILE: [Metier, Condition, number][] = [
  ["pecheur", { ileTag: ["port", "village"] }, 30],
  ["paysan", { ileTag: ["village", "foret"] }, 25],
  ["cuisinier", {}, 12],
  ["charpentier", { ileTag: ["port", "navire"] }, 14],
  ["forgeron", { ileTag: ["ville", "sabres", "samourai", "mine"] }, 10],
  ["medecin", { jauges: { savoir: 45 } }, 6],
  ["archeologue", { jauges: { savoir: 55 } }, 2],
  ["navigateur", { ileTag: ["port"], jauges: { savoir: 30 } }, 8],
  ["marchand", { ileTag: ["port", "ville", "royaume"] }, 14],
  ["journaliste", { ileTag: ["ville", "royaume"], jauges: { savoir: 35 } }, 4],
  ["musicien", {}, 4],
  ["artiste", {}, 3],
  ["mineur", { ileTag: ["mine", "pauvre"] }, 8],
  ["erudit", { ileTag: ["savant", "science"], jauges: { savoir: 50 } }, 6],
  ["soldat", { ileTag: ["royaume"], jauges: { force: 25 } }, 8],
];

const PAS_EN_MER: Condition = { pasFlags: ["en-mer"] };

export const ACTIONS: ActionVie[] = [
  {
    id: "travail",
    nom: "Chercher du travail",
    icone: "💼",
    detail: "Un métier, ou une meilleure place.",
    si: { age: [14, 70], camp: ["civil"], pasFlags: ["retraite"] },
    habitude: true,
    issues: [
      ...METIER_PAR_ILE.map(([metier, si, poids]): IssueAction => ({
        si: { ...si, sansMetier: true },
        poids,
        texte: [
          "Vous frappez à toutes les portes {deIle}. L'une finit par s'ouvrir.",
          "Quelqu'un cherchait des bras, vous en avez deux. L'affaire est conclue d'une poignée de main.",
          "On vous prend à l'essai. Une semaine plus tard, on ne parle plus d'essai.",
        ],
        effets: { metier },
      })),
      {
        si: { metier: ["pecheur", "paysan", "cuisinier", "charpentier", "forgeron", "medecin", "archeologue", "navigateur", "marchand", "journaliste", "musicien", "artiste", "mineur", "erudit", "soldat"] },
        poids: 4,
        texte: [
          "Un meilleur patron, une meilleure paie. Vous rentrez le soir avec quelque chose de plus qu'avant.",
          "On a remarqué votre travail. On vous confie davantage, et on vous paie en conséquence.",
          "Vous montez votre propre affaire, petite mais à vous.",
        ],
        effets: { compteurs: { place: 1 }, jauges: { savoir: 1 } },
      },
      {
        si: { non: { sansMetier: true } },
        poids: 6,
        texte: [
          "Rien de mieux pour cette année. Vous gardez votre place, et votre patience.",
          "Les places sont prises. On vous dit de repasser l'an prochain.",
        ],
      },
      {
        si: { sansMetier: true },
        poids: 3,
        texte: "Personne n'embauche cette année. Vous rentrez les mains vides.",
      },
    ],
  },
  {
    id: "banquet",
    nom: "Faire un banquet",
    icone: "🍖",
    detail: "Viande, musique, et des amis pour la vie.",
    si: { age: [14, 110] },
    cout: 10_000,
    habitude: true,
    issues: [
      {
        si: { camp: ["pirate"] },
        texte: [
          "Le pont croule sous la viande. Quelqu'un se met des baguettes dans le nez et danse. Vous riez jusqu'à l'aube.",
          "Un banquet comme on n'en fait qu'en mer : on chante le saké de Binks jusqu'à ne plus savoir les paroles.",
        ],
        effets: { jauges: { equipage: 3 }, sante: 1, compteurs: { banquets: 1 } },
      },
      {
        si: { camp: ["marine"] },
        texte: "Une soirée au mess, entre soldats. On oublie les grades le temps de quelques chopes.",
        effets: { jauges: { equipage: 2 }, sante: 1, compteurs: { banquets: 1 } },
      },
      {
        si: { pasCamp: ["pirate", "marine"] },
        texte: [
          "Toute la rue est invitée. Il y a trop à manger, et c'est exactement ce qu'il fallait.",
          "Une grande tablée {aIle}. Les voisins apportent ce qu'ils ont, vous apportez la viande.",
        ],
        effets: { jauges: { equipage: 2 }, sante: 1, compteurs: { banquets: 1 } },
      },
    ],
  },
  {
    id: "voyage",
    nom: "Partir en voyage",
    icone: "⛵",
    detail: "Voir d'autres îles, et revenir.",
    si: { age: [16, 85], tous: [PAS_EN_MER] },
    cout: 30_000,
    habitude: true,
    issues: [
      {
        si: { lien: { conjoint: true, enfant: true } },
        poids: 6,
        texte: "Un voyage en famille. {enfant} a le mal de mer le premier jour, et ne veut plus rentrer le dernier.",
        effets: { sante: 5, jauges: { equipage: 2 } },
      },
      {
        si: { lien: { conjoint: true } },
        poids: 4,
        texte: "Quelques semaines avec {conjoint}, loin de tout. Vous revenez plus proches qu'au départ.",
        effets: { sante: 5, jauges: { equipage: 1 } },
      },
      {
        si: { zone: ["paradis"], annee: [1490, 1530] },
        texte: "Une journée au parc de Sabaody. Les bulles montent du sol ; vous changez de trottoir quand passe un homme casqué de verre.",
        effets: { sante: 4, jauges: { savoir: 1 }, clinOeil: "action-sabaody" },
      },
      {
        si: { zone: ["paradis"] },
        texte: "Water Seven, ses canaux, ses yagaras. Vous assistez à une course de navires sur l'eau des chantiers.",
        effets: { sante: 4, jauges: { savoir: 1 }, clinOeil: "action-water-seven" },
      },
      {
        si: { zone: ["east-blue"] },
        texte: "Une escale au Baratie, le restaurant flottant. Le chef a une jambe de bois et une très mauvaise humeur. Le meilleur repas de votre vie.",
        effets: { sante: 5, clinOeil: "action-baratie" },
      },
      {
        si: { zone: ["east-blue"], annee: [1500, 1530] },
        texte: "Loguetown. Sur la grand-place, l'échafaud où est mort le Roi des Pirates. Des enfants y jouent aux pirates.",
        effets: { sante: 3, jauges: { haki: 1 }, clinOeil: "action-loguetown" },
      },
      {
        texte: [
          "Une île que vous ne connaissiez pas. Vous rapportez des souvenirs, et l'envie d'en voir d'autres.",
          "Quelques semaines ailleurs. Les gens y parlent vite et mangent épicé. Vous revenez reposé{/e}.",
          "Le voyage est plus long que prévu, les tempêtes plus fortes. Vous revenez avec de belles histoires.",
        ],
        effets: { sante: 4, jauges: { savoir: 1 } },
      },
    ],
  },
  {
    id: "medecin",
    nom: "Voir un médecin",
    icone: "🩺",
    detail: "Se faire soigner avant qu'il ne soit trop tard.",
    si: { sante: [0, 85] },
    cout: 15_000,
    habitude: true,
    issues: [
      {
        si: { ileTag: ["hiver", "froid"] },
        poids: 2,
        texte: "Une vieille doctoresse qui boit sec et se dit centenaire. Elle vous soigne, puis vous facture le double.",
        effets: { sante: 16, clinOeil: "action-kureha" },
      },
      {
        texte: [
          "Le médecin écoute votre poitrine, fronce les sourcils, et vous prescrit du repos. Vous obéissez, pour une fois.",
          "Des herbes, des bandages et un sermon. Vous allez mieux.",
        ],
        effets: { sante: 12 },
      },
    ],
  },
  {
    id: "etudier",
    nom: "Étudier",
    icone: "📚",
    detail: "Des livres, des cartes, un maître.",
    si: { age: [8, 90] },
    cout: 5_000,
    habitude: true,
    issues: [
      {
        si: { flags: ["illettre"] },
        texte: "Quelqu'un accepte de vous apprendre les lettres. Un soir, vous lisez votre premier avis de recherche tout{/e} seul{/e}.",
        effets: { jauges: { savoir: 3 }, retirerFlags: ["illettre"], flags: ["sait-lire"] },
      },
      {
        texte: [
          "Des nuits entières sur des livres empruntés. Ce que vous apprenez, personne ne pourra vous le prendre.",
          "Vous recopiez des cartes marines à la chandelle. Les courants n'ont plus de secret pour vous.",
          "Un vieil érudit accepte de répondre à vos questions. Il en pose davantage qu'il n'en résout.",
        ],
        effets: { jauges: { savoir: 2 } },
      },
    ],
  },
  {
    id: "famille",
    nom: "Rendre visite aux siens",
    icone: "💌",
    detail: "Une lettre, une visite, une tombe à fleurir.",
    si: { age: [16, 110], un: [{ lien: { mere: true } }, { lien: { pere: true } }, { flags: ["deuil:mere"] }, { flags: ["deuil:pere"] }] },
    habitude: true,
    issues: [
      {
        si: { lien: { mere: true } },
        texte: [
          "{mere} vous serre longtemps contre elle, puis vous trouve trop maigre. Vous repartez avec trop à manger.",
          "Vous écrivez à {mere}. La réponse arrive trois mois plus tard, par une mouette qui a l'air épuisée.",
        ],
        effets: { jauges: { equipage: 1 }, sante: 2 },
      },
      {
        si: { lien: { pere: true } },
        texte: "Une soirée avec {pere}. Il ne dit pas grand-chose, mais il ne vous quitte pas des yeux.",
        effets: { jauges: { equipage: 1 }, sante: 2 },
      },
      {
        si: { unFlag: ["deuil:mere", "deuil:pere"] },
        texte: "Vous fleurissez la tombe des vôtres. Vous leur racontez l'année, à voix basse.",
        effets: { jauges: { haki: 1 } },
      },
    ],
  },
  {
    id: "amour",
    nom: "Chercher l'amour",
    icone: "💘",
    detail: "Le cœur, ça se tente.",
    si: { age: [16, 70], lien: { amour: false, conjoint: false } },
    habitude: true,
    test: {
      jauge: "equipage",
      difficulte: 32,
      reussite: {
        texte: [
          "Un regard au marché, un deuxième le lendemain. Le troisième jour, vous vous parlez enfin.",
          "Vous dansez toute une nuit avec quelqu'un. Au matin, aucun{/e} de vous deux ne veut rentrer.",
        ],
        effets: { lien: { creer: "amour" }, sante: 2 },
      },
      echec: {
        texte: [
          "Une tentative, un refus poli. Vous rentrez seul{/e}, en sifflotant quand même.",
          "Vous cherchez, sans trouver. Le cœur a son calendrier.",
        ],
      },
    },
  },
  {
    id: "mariage",
    nom: "Demander en mariage",
    icone: "💍",
    detail: "{amour}, pour la vie.",
    si: { age: [17, 90], lien: { amour: true, conjoint: false } },
    cout: 30_000,
    test: {
      jauge: "equipage",
      difficulte: 20,
      reussite: {
        texte: "{amour} dit oui avant la fin de la question. La noce dure trois jours.",
        effets: { lien: { devient: { de: "amour", vers: "conjoint" } }, flags: ["marie"], sante: 3, jauges: { equipage: 2 } },
      },
      echec: { texte: "{amour} veut encore attendre. Ce n'est pas un non." },
    },
  },
  {
    id: "enfant",
    nom: "Avoir un enfant",
    icone: "👶",
    detail: "Une maison pleine de rires.",
    si: { lien: { conjoint: true }, un: [{ sexe: "f", age: [18, 44] }, { sexe: "h", age: [18, 60] }], non: { compteurs: { enfants: 4 } } },
    habitude: true,
    test: {
      jauge: "chance",
      difficulte: 50,
      reussite: {
        texte: [
          "Un enfant naît, minuscule et furieux. Vous n'avez jamais rien tenu d'aussi précieux.",
          "Un cri dans la nuit, le premier. {conjoint} pleure, vous aussi.",
        ],
        effets: { lien: { creer: "enfant" }, flags: ["parent"], jauges: { haki: 1 }, compteurs: { enfants: 1 } },
      },
      echec: { texte: "L'enfant se fait attendre. Vous avez le temps." },
    },
  },
  {
    id: "entrainement",
    nom: "S'entraîner jusqu'à l'épuisement",
    icone: "🥋",
    detail: "Plus fort, au prix de sa santé.",
    si: { age: [12, 60], sante: [30, 100], pasFlags: ["invalide"] },
    habitude: true,
    issues: [
      {
        texte: [
          "Mille pompes, mille abdos, et un tour de l'île en courant. Le lendemain, vous recommencez.",
          "Vous soulevez des poids absurdes jusqu'à ce que vos bras tremblent. On vous regarde de travers.",
          "Vous frappez un tronc jusqu'à ce qu'il cède. Vos poings saignent ; vous souriez.",
        ],
        effets: { jauges: { force: 3 }, sante: -5 },
      },
    ],
  },
  {
    id: "jeux",
    nom: "Tenter sa chance aux jeux",
    icone: "🎲",
    detail: "Dés, cartes, et de l'or qui change de main.",
    si: { age: [16, 100] },
    cout: 10_000,
    habitude: true,
    test: {
      jauge: "chance",
      difficulte: 63,
      reussite: {
        texte: [
          "Les dés vous aiment ce soir. Vous ramassez la mise sous les yeux noirs de la table.",
          "Une main impossible. Vous repartez les poches pleines, avant qu'on ne vous les vide.",
        ],
        effets: { bourse: 65_000 },
      },
      echec: {
        texte: [
          "La maison gagne toujours. Vous le saviez, pourtant.",
          "Un tricheur, sans doute. Vous ne le prouverez jamais.",
        ],
      },
    },
  },
  {
    id: "demenager",
    nom: "S'installer ailleurs",
    icone: "🧳",
    detail: "Une autre île, une autre vie.",
    si: { age: [16, 80], camp: ["civil"], tous: [PAS_EN_MER] },
    cout: 80_000,
    issues: [
      {
        poids: 3,
        texte: "Vos affaires tiennent dans un coffre. Vous ne vous retournez pas en quittant le port.",
        effets: { aller: { memeZone: true }, flags: ["a-quitte-son-ile"] },
      },
      {
        si: { zone: ["east-blue", "west-blue", "north-blue", "south-blue"] },
        texte: "Vous passez Reverse Mountain sur un navire marchand, le cœur au bord des lèvres. De l'autre côté : Grand Line, et une nouvelle vie.",
        effets: { aller: { zone: "paradis" }, flags: ["a-quitte-son-ile"], clinOeil: "action-reverse-mountain" },
      },
    ],
  },
  {
    id: "marine",
    nom: "S'engager dans la Marine",
    icone: "⚓",
    detail: "La Justice, l'uniforme blanc, et la mer.",
    si: { age: [15, 32], camp: ["civil"], prime: [0, 0] },
    bascule: true,
    issues: [
      {
        texte: "Vous signez au bureau de recrutement. On vous donne un uniforme trop grand et une mouette brodée sur la casquette.",
        effets: { camp: "marine", flags: ["en-mer", "a-quitte-son-ile"], aller: { tag: "base-marine" } },
      },
    ],
  },
  {
    id: "pirate",
    nom: "Prendre la mer en pirate",
    icone: "🏴‍☠️",
    detail: "La liberté, et une prime un jour.",
    si: { age: [15, 50], camp: ["civil"] },
    bascule: true,
    issues: [
      {
        si: { jauges: { equipage: 30 } },
        poids: 2,
        texte: "Vous hissez votre propre pavillon, un crâne mal dessiné sur un drap. Ceux qui vous suivent le trouvent superbe.",
        effets: { camp: "pirate", flags: ["en-mer", "a-quitte-son-ile", "capitaine-de-son-equipage"], equipageNom: "l'équipage de {prenom}" },
      },
      {
        texte: "Un navire pirate fait escale {aIle}. Vous montez à bord sans rien dire à personne ; le capitaine vous regarde, et hoche la tête.",
        effets: { camp: "pirate", flags: ["en-mer", "a-quitte-son-ile"], lien: { creer: "capitaine" } },
      },
    ],
  },
  {
    id: "chasseur",
    nom: "Devenir chasseur de primes",
    icone: "🎯",
    detail: "Les avis de recherche, pour gagner sa vie.",
    si: { age: [16, 45], camp: ["civil"], jauges: { force: 20 } },
    bascule: true,
    issues: [
      {
        texte: "Vous décrochez un avis de recherche d'un mur, puis un deuxième. Votre arme est prête ; votre conscience, presque.",
        effets: { camp: "chasseur", flags: ["a-quitte-son-ile"] },
      },
    ],
  },
  {
    id: "marche-noir",
    nom: "Acheter un fruit du démon",
    icone: "🍎",
    detail: "Au marché noir. Hors de prix, et sans garantie.",
    si: { age: [16, 90], fruit: false, fruitEnPoche: false, pasCamp: ["esclave"] },
    cout: 50_000_000,
    issues: [
      {
        texte: "Un intermédiaire au sourire trop large vous tend un coffret. À l'intérieur, un fruit aux motifs en spirale. Vous ne savez pas lequel.",
        effets: { fruit: { mode: "achete", rareteMax: 3, manger: false } },
      },
    ],
  },
  {
    id: "manger-fruit",
    nom: "Manger le fruit",
    icone: "🍽",
    detail: "Un pouvoir, et la mer pour ennemie à jamais.",
    si: { fruitEnPoche: true },
    bascule: true,
    issues: [
      {
        texte: "Vous croquez. C'est la pire chose que vous ayez jamais goûtée. Puis quelque chose change, tout au fond de vous.",
        effets: { mangerFruitEnPoche: true },
      },
    ],
  },
  {
    id: "vendre-fruit",
    nom: "Vendre le fruit",
    icone: "💰",
    detail: "Une fortune, contre un rêve qu'on ne fera pas.",
    si: { fruitEnPoche: true },
    issues: [
      {
        texte: "L'acheteur ne pose pas de questions, vous non plus. Le coffret change de mains contre un autre, bien plus lourd.",
        effets: { vendreFruitEnPoche: true, bourse: 30_000_000 },
      },
    ],
  },
  {
    id: "retraite",
    nom: "Prendre sa retraite",
    icone: "🪑",
    detail: "Poser les armes, ou les outils.",
    si: { age: [55, 120], pasFlags: ["retraite"] },
    bascule: true,
    issues: [
      {
        si: { camp: ["pirate", "marine", "chasseur", "revolution", "cipher-pol"] },
        texte: "Vous rendez ce qui doit être rendu, gardez ce qui doit être gardé. Une maison face à la mer suffira.",
        effets: { flags: ["retraite"], retirerFlags: ["en-mer"], sante: 5 },
      },
      {
        texte: "Vous transmettez votre ouvrage à plus jeune que vous. Les matinées sont longues ; vous apprenez à les aimer.",
        effets: { flags: ["retraite"], sante: 5 },
      },
    ],
  },
];

export const ACTIONS_PAR_ID = new Map(ACTIONS.map((a) => [a.id, a]));

/** Ce qu'une vie gagne en un an (avant les frais de la vie), en berrys. */
export const REVENU_METIER: Record<Metier, number> = {
  pecheur: 30_000, paysan: 25_000, cuisinier: 50_000, charpentier: 60_000, forgeron: 50_000, medecin: 120_000,
  archeologue: 40_000, navigateur: 70_000, marchand: 150_000, journaliste: 60_000, musicien: 30_000, artiste: 30_000,
  mineur: 35_000, tireur: 40_000, epeiste: 40_000, combattant: 40_000, voleur: 50_000, erudit: 70_000, soldat: 45_000,
};

export const CLINS_ACTIONS: { id: string; ref: string; arc?: string }[] = [
  { id: "action-sabaody", ref: "Le parc de Sabaody et les Dragons Célestes en casque de verre", arc: "Sabaody" },
  { id: "action-water-seven", ref: "Les yagaras et les chantiers navals de Water Seven", arc: "Water Seven" },
  { id: "action-baratie", ref: "Le Baratie et Zeff « Pied Rouge », le chef à la jambe de bois", arc: "Baratie" },
  { id: "action-loguetown", ref: "L'échafaud de Loguetown, où Roger a lancé la Grande Ère", arc: "Loguetown" },
  { id: "action-reverse-mountain", ref: "Reverse Mountain, où les quatre mers montent à l'assaut de la Red Line", arc: "Reverse Mountain" },
  { id: "action-kureha", ref: "Docteur Kureha, la doctoresse de Drum, 139 ans et le secret de sa jeunesse", arc: "Drum" },
];
