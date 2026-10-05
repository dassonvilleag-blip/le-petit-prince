// Du Kebab au CAC 40 — ce qui pimente la partie : les clients pressés qui
// traversent l'écran (on clique, on gagne un bonus) et les événements à choix.
// Gains et coûts se comptent en minutes de revenus, pour peser autant au
// premier kebab qu'au millième milliard.

import { formatArgent } from "./eco.ts";
import { COMMERCES, type CommerceId } from "./data.ts";
import { ajouterEffet, debit, encaisser, revenuParSeconde, type Etat } from "./state.ts";

export type Hasard = () => number;

// ---- conséquences ----

export type Consequence =
  | { type: "argent"; minutes: number } // > 0 gain, < 0 dépense
  | { type: "boost"; mult: number; secondes: number }
  | {
      type: "pari";
      chance: number;
      gagne: Consequence[];
      perdu: Consequence[];
      texteGagne: string;
      textePerdu: string;
    };

export interface OptionEvenement {
  libelle: string;
  effets: Consequence[];
  texte: string; // ce qui se passe, affiché après le choix (hors pari)
}

export interface Evenement {
  id: string;
  icone: string;
  titre: string;
  texte: string;
  condition: CommerceId; // l'événement ne tombe que si ce commerce est ouvert
  options: OptionEvenement[];
}

export interface Issue {
  reussi: boolean | null; // null : pas de pari
  texte: string;
  detail: string; // ce que ça a rapporté ou coûté
}

// « 2 min », « 1 h », « 45 s »
function duree(secondes: number): string {
  if (secondes < 60) return `${secondes} s`;
  if (secondes < 3600) return `${secondes / 60} min`;
  return `${secondes / 3600} h`;
}

function decrireUne(c: Consequence, d: number): string {
  if (c.type === "argent") {
    const montant = formatArgent(Math.abs(c.minutes) * 60 * d);
    return c.minutes > 0
      ? `+${duree(c.minutes * 60)} de revenus (${montant})`
      : `−${duree(-c.minutes * 60)} de revenus (${montant})`;
  }
  if (c.type === "boost") return `revenus ×${String(c.mult).replace(".", ",")} pendant ${duree(c.secondes)}`;
  if (!c.gagne.length) return `${Math.round((1 - c.chance) * 100)} % de risque : ${decrire(c.perdu, d)}`;
  const sinon = c.perdu.length ? decrire(c.perdu, d) : "rien";
  return `${Math.round(c.chance * 100)} % : ${decrire(c.gagne, d)} · sinon ${sinon}`;
}

// Résumé lisible des conséquences, montants calculés sur le débit `d` (€/s).
export function decrire(cs: Consequence[], d: number): string {
  return cs.map((c) => decrireUne(c, d)).join(", puis ");
}

// Applique les conséquences ; renvoie le texte du pari éventuel et son issue.
function appliquer(
  s: Etat,
  cs: Consequence[],
  d: number,
  icone: string,
  now: number,
  hasard: Hasard
): { reussi: boolean | null; texte: string | null; faits: Consequence[] } {
  let reussi: boolean | null = null;
  let texte: string | null = null;
  const faits: Consequence[] = [];
  for (const c of cs) {
    if (c.type === "argent") {
      if (c.minutes > 0) encaisser(s, c.minutes * 60 * d);
      else s.argent = Math.max(0, s.argent + c.minutes * 60 * d);
      faits.push(c);
    } else if (c.type === "boost") {
      ajouterEffet(s, { cible: "tous", mult: c.mult, fin: now + c.secondes * 1000, icone });
      faits.push(c);
    } else {
      reussi = hasard() < c.chance;
      texte = reussi ? c.texteGagne : c.textePerdu;
      faits.push(...appliquer(s, reussi ? c.gagne : c.perdu, d, icone, now, hasard).faits);
    }
  }
  return { reussi, texte, faits };
}

// Ce qu'une option coûte d'emblée (hors pari), en € ; le bouton est grisé
// tant qu'on ne peut pas payer.
export function coutImmediat(option: OptionEvenement, d: number): number {
  let cout = 0;
  for (const c of option.effets) if (c.type === "argent" && c.minutes < 0) cout -= c.minutes * 60 * d;
  return cout;
}

export function choisir(s: Etat, ev: Evenement, option: OptionEvenement, now: number, hasard: Hasard): Issue {
  // les montants se calculent hors bonus en cours : un Rush ne rend pas
  // l'amende sept fois plus chère
  const d = debit(s);
  const r = appliquer(s, option.effets, d, ev.icone, now, hasard);
  return {
    reussi: r.reussi,
    texte: r.texte ?? option.texte,
    detail: r.faits.length ? decrire(r.faits, d) : "rien ne change",
  };
}

export function evenementsPossibles(s: Etat): Evenement[] {
  return EVENEMENTS.filter((e) => s.commerces[e.condition].nb > 0);
}

export const EVENEMENTS: Evenement[] = [
  {
    id: "influenceur",
    icone: "📸",
    titre: "Un influenceur au vide-grenier",
    texte: "Deux millions d'abonnés, et il filme le stand de Françoise en direct.",
    condition: "vide-grenier",
    options: [
      {
        libelle: "Lui offrir le service à café",
        effets: [
          { type: "argent", minutes: -2 },
          { type: "boost", mult: 5, secondes: 60 },
        ],
        texte: "« Allez-y les gars, c'est pépite. » Tout le monde débarque.",
      },
      {
        libelle: "Le laisser filmer",
        effets: [
          {
            type: "pari",
            chance: 0.5,
            gagne: [{ type: "boost", mult: 5, secondes: 60 }],
            perdu: [],
            texteGagne: "La vidéo fait le buzz, la file d'attente aussi.",
            textePerdu: "Il a filmé le mauvais stand. Celui d'à côté te remercie.",
          },
        ],
        texte: "",
      },
    ],
  },
  {
    id: "classico",
    icone: "⚽",
    titre: "Soir de Classico",
    texte: "Coup d'envoi dans une heure, et tout le quartier va vouloir un kebab.",
    condition: "anatolie",
    options: [
      {
        libelle: "Broche XXL et heures sup",
        effets: [
          { type: "argent", minutes: -3 },
          { type: "boost", mult: 4, secondes: 120 },
        ],
        texte: "Eren envoie les sandwichs à la chaîne. Personne ne repart le ventre vide.",
      },
      {
        libelle: "Diffuser le match sur grand écran",
        effets: [
          {
            type: "pari",
            chance: 0.5,
            gagne: [{ type: "boost", mult: 8, secondes: 120 }],
            perdu: [],
            texteGagne: "Victoire à la 93e ! Tout le monde reste pour fêter ça.",
            textePerdu: "Défaite 3-0. Le quartier rentre bouder à la maison.",
          },
        ],
        texte: "",
      },
    ],
  },
  {
    id: "hygiene",
    icone: "🧽",
    titre: "Contrôle d'hygiène",
    texte: "Un inspecteur sonne chez ANATOLIE. L'huile de la friteuse date de mars.",
    condition: "anatolie",
    options: [
      {
        libelle: "Grand ménage, on ferme deux minutes",
        effets: [{ type: "boost", mult: 0.5, secondes: 120 }],
        texte: "Ça brille. L'inspecteur repart sans rien noter.",
      },
      {
        libelle: "Lui offrir un menu",
        effets: [
          {
            type: "pari",
            chance: 0.7,
            gagne: [],
            perdu: [{ type: "argent", minutes: -5 }],
            texteGagne: "Il repart ravi, sauce samouraï en plus.",
            textePerdu: "« Tentative de corruption, monsieur. » Amende.",
          },
        ],
        texte: "",
      },
    ],
  },
  {
    id: "farine",
    icone: "🌾",
    titre: "Pénurie de farine",
    texte: "Plus un sac chez le grossiste. Mme Lefèvre regarde son pétrin vide.",
    condition: "boulangerie",
    options: [
      {
        libelle: "Acheter au prix fort",
        effets: [{ type: "argent", minutes: -4 }],
        texte: "La farine arrive, la facture aussi.",
      },
      {
        libelle: "Lancer le pain au sarrasin à 8 €",
        effets: [
          {
            type: "pari",
            chance: 0.5,
            gagne: [{ type: "boost", mult: 3, secondes: 120 }],
            perdu: [{ type: "boost", mult: 0.5, secondes: 120 }],
            texteGagne: "Les bobos adorent. Rupture de stock en une heure.",
            textePerdu: "« 8 € le pain ?! » Les clients vont chez Paul.",
          },
        ],
        texte: "",
      },
    ],
  },
  {
    id: "canicule",
    icone: "☀️",
    titre: "Canicule",
    texte: "37 °C à l'ombre. Tout le monde cherche une boisson fraîche.",
    condition: "chez-rachid",
    options: [
      {
        libelle: "Remplir tous les frigos",
        effets: [
          { type: "argent", minutes: -2 },
          { type: "boost", mult: 3, secondes: 120 },
        ],
        texte: "Rachid vide une palette de canettes par heure.",
      },
      {
        libelle: "Monter les prix de 50 %",
        effets: [
          {
            type: "pari",
            chance: 0.5,
            gagne: [{ type: "boost", mult: 4, secondes: 120 }],
            perdu: [{ type: "boost", mult: 0.5, secondes: 120 }],
            texteGagne: "Ils payent sans broncher. Il fait trop chaud pour discuter.",
            textePerdu: "Le quartier boycotte et file à la supérette d'en face.",
          },
        ],
        texte: "",
      },
    ],
  },
  {
    id: "fisc",
    icone: "🕵️",
    titre: "Contrôle fiscal",
    texte: "Un courrier recommandé. Le fisc veut « échanger » sur tes comptes.",
    condition: "chez-rachid",
    options: [
      {
        libelle: "Engager un ténor du barreau",
        effets: [{ type: "argent", minutes: -8 }],
        texte: "Ton avocat parle trois heures. Le fisc abandonne par épuisement.",
      },
      {
        libelle: "Tout montrer",
        effets: [
          {
            type: "pari",
            chance: 0.6,
            gagne: [],
            perdu: [{ type: "argent", minutes: -20 }],
            texteGagne: "Tout est en règle. Pour une fois.",
            textePerdu: "Redressement. Il y avait une ligne « divers » un peu large.",
          },
        ],
        texte: "",
      },
    ],
  },
  {
    id: "loto",
    icone: "🎰",
    titre: "Un ticket oublié",
    texte: "Gégé jure qu'un client a oublié un ticket à gratter sur le comptoir.",
    condition: "tabac-presse",
    options: [
      {
        libelle: "Le rendre à son propriétaire",
        effets: [{ type: "boost", mult: 2, secondes: 120 }],
        texte: "Il revient avec toute sa famille pour te remercier. Et ils achètent.",
      },
      {
        libelle: "Le gratter",
        effets: [
          {
            type: "pari",
            chance: 0.1,
            gagne: [{ type: "argent", minutes: 60 }],
            perdu: [{ type: "boost", mult: 0.8, secondes: 120 }],
            texteGagne: "JACKPOT ! Gégé en tombe de sa chaise.",
            textePerdu: "Perdu. Et le client t'a vu faire.",
          },
        ],
        texte: "",
      },
    ],
  },
  {
    id: "greve",
    icone: "🚛",
    titre: "Grève des routiers",
    texte: "Ilyes et les gars bloquent le dépôt : ils veulent une prime.",
    condition: "transports",
    options: [
      {
        libelle: "Accorder la prime",
        effets: [
          { type: "argent", minutes: -5 },
          { type: "boost", mult: 2, secondes: 240 },
        ],
        texte: "Les camions repartent en klaxonnant. Livraisons record.",
      },
      {
        libelle: "Attendre que ça passe",
        effets: [{ type: "boost", mult: 0.7, secondes: 180 }],
        texte: "Trois minutes de rayons vides, puis tout le monde reprend.",
      },
    ],
  },
  {
    id: "jt",
    icone: "📺",
    titre: "Invité du 20 h",
    texte: "Jean-Pierre te propose un passage au JT. Huit millions de téléspectateurs.",
    condition: "chaine-tele",
    options: [
      {
        libelle: "Faire un sujet sur tes commerces",
        effets: [{ type: "boost", mult: 3, secondes: 180 }],
        texte: "Le lendemain, la France entière veut son kebab ANATOLIE.",
      },
      {
        libelle: "Vendre l'espace pub",
        effets: [{ type: "argent", minutes: 6 }],
        texte: "Trente secondes de pub pour une lessive, payées rubis sur l'ongle.",
      },
    ],
  },
  {
    id: "finale",
    icone: "🏆",
    titre: "Finale de Ligue des champions",
    texte: "Ton club est en finale ! Le Président veut motiver les joueurs.",
    condition: "club-foot",
    options: [
      {
        libelle: "Prime de match géante",
        effets: [
          { type: "argent", minutes: -10 },
          {
            type: "pari",
            chance: 0.75,
            gagne: [{ type: "boost", mult: 10, secondes: 180 }],
            perdu: [],
            texteGagne: "Champions d'Europe ! Les maillots partent par millions.",
            textePerdu: "Battus aux tirs au but. La prime est déjà dépensée.",
          },
        ],
        texte: "",
      },
      {
        libelle: "Jouer la défense, comme d'hab",
        effets: [
          {
            type: "pari",
            chance: 0.3,
            gagne: [{ type: "boost", mult: 10, secondes: 180 }],
            perdu: [],
            texteGagne: "1-0 sur un corner à la 89e. Personne n'y croyait.",
            textePerdu: "0-2. Le Président promet le titre la saison prochaine.",
          },
        ],
        texte: "",
      },
    ],
  },
];

// ---- clients pressés ----

export const CLIENTS = [
  { icone: "🛵", nom: "Un livreur pressé" },
  { icone: "🤤", nom: "Un client affamé" },
  { icone: "🧳", nom: "Un touriste perdu" },
  { icone: "💼", nom: "Un homme d'affaires" },
];

// Ce que rapporte un client attrapé ; renvoie le message à afficher.
export function recompenseClient(s: Etat, now: number, hasard: Hasard): string {
  const r = hasard();
  if (r < 0.45) {
    ajouterEffet(s, { cible: "tous", mult: 7, fin: now + 77_000, icone: "🔥" });
    return "🔥 Rush ! Revenus ×7 pendant 77 s";
  }
  if (r < 0.85 || r >= 0.97) {
    const minutes = r < 0.85 ? 10 : 60;
    // pendant un Rush, le pourboire suit : c'est tout l'intérêt du combo
    const gain = debit(s, now) * minutes * 60;
    encaisser(s, gain);
    return minutes === 10
      ? `💶 Gros pourboire : +${formatArgent(gain)}`
      : `🍀 Il te lègue sa fortune : +${formatArgent(gain)}`;
  }
  // Coup de pub sur un commerce ouvert, tiré au prorata de ce qu'il rapporte
  const ouverts = COMMERCES.filter((d) => s.commerces[d.id].nb > 0);
  const parts = ouverts.map((d) => ({ d, v: revenuParSeconde(s, d, now) }));
  const total = parts.reduce((a, p) => a + p.v, 0);
  let x = hasard() * total;
  let choisi = parts[parts.length - 1].d;
  for (const p of parts) {
    x -= p.v;
    if (x < 0) {
      choisi = p.d;
      break;
    }
  }
  ajouterEffet(s, { cible: choisi.id, mult: 20, fin: now + 45_000, icone: choisi.icone });
  return `${choisi.icone} Coup de pub : ${choisi.nom} ×20 pendant 45 s`;
}
