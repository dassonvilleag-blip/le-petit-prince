// Le tirage de naissance, en six couches : année, île, peuple, sexe, milieu,
// héritage (le D. et les traits).

import type { EtatVie } from "./etat.ts";
import type { Classe, Ile, Jauges, Peuple, Sexe } from "./types.ts";
import { ILES, PEUPLES } from "./monde.ts";
import { gauss, pondere, parmi, entre } from "./rng.ts";
import { prenom, nomDeFamille, nomIleAnonyme } from "./noms.ts";

export interface Trait {
  id: string;
  nom: string;
  description: string;
  rarete: "commun" | "rare" | "legendaire";
  jauges?: Partial<Jauges>;
  sante?: number;
}

export const TRAITS: Trait[] = [
  { id: "robuste", nom: "Robuste", description: "Un corps qui encaisse.", rarete: "commun", jauges: { force: 3 }, sante: 10 },
  { id: "chetif", nom: "Chétif", description: "Souvent malade, petit pour son âge.", rarete: "commun", jauges: { force: -2, savoir: 2 }, sante: -15 },
  { id: "curieux", nom: "Curieux", description: "Pose trop de questions.", rarete: "commun", jauges: { savoir: 3 } },
  { id: "tetu", nom: "Têtu", description: "Ne lâche jamais rien.", rarete: "commun", jauges: { haki: 1 } },
  { id: "rieur", nom: "Rieur", description: "Rit pour un rien, même au pire moment.", rarete: "commun", jauges: { equipage: 3 } },
  { id: "mal-de-mer", nom: "Mal de mer", description: "La mer ne l'aime pas, et c'est réciproque.", rarete: "commun", sante: -5 },
  { id: "gros-mangeur", nom: "Gros mangeur", description: "Mange comme quatre.", rarete: "commun", jauges: { force: 2 } },
  { id: "reveur", nom: "Rêveur", description: "Regarde l'horizon plus que ses pieds.", rarete: "commun", jauges: { savoir: 1, haki: 1 } },
  { id: "bagarreur", nom: "Bagarreur", description: "Cherche la bagarre, et la trouve.", rarete: "commun", jauges: { force: 3, equipage: -1 } },
  { id: "timide", nom: "Timide", description: "Parle peu, observe beaucoup.", rarete: "commun", jauges: { savoir: 2, equipage: -1 } },
  { id: "boussole-cassee", nom: "Sans aucun sens de l'orientation", description: "Le nord, c'est en haut, non ?", rarete: "commun" },
  { id: "oeil-de-faucon", nom: "Œil de faucon", description: "Voit loin, très loin.", rarete: "rare", jauges: { savoir: 2 } },
  { id: "oreille-absolue", nom: "Oreille absolue", description: "Entend la musique partout.", rarete: "rare", jauges: { equipage: 2 } },
  { id: "memoire", nom: "Mémoire photographique", description: "N'oublie rien de ce qu'il lit.", rarete: "rare", jauges: { savoir: 5 } },
  { id: "peau-dure", nom: "Peau dure", description: "Les coups glissent.", rarete: "rare", jauges: { force: 4 }, sante: 5 },
  { id: "ne-sous-l-orage", nom: "Né sous l'orage", description: "La foudre ne lui fait pas peur.", rarete: "rare", jauges: { haki: 3 } },
  { id: "rire-contagieux", nom: "Rire contagieux", description: "Quand il rit, tout le monde rit.", rarete: "rare", jauges: { equipage: 5 } },
  { id: "main-verte", nom: "Main verte", description: "Les plantes poussent pour lui.", rarete: "rare", jauges: { savoir: 2 } },
  { id: "voix-de-toute-chose", nom: "La Voix de toute chose", description: "Entend parfois des voix là où il ne devrait pas y en avoir.", rarete: "legendaire", jauges: { haki: 5 } },
  { id: "graine-du-roi", nom: "???", description: "Quelque chose dort en lui.", rarete: "legendaire" },
  { id: "corps-de-monstre", nom: "Corps de monstre", description: "Une force qui inquiète les adultes.", rarete: "legendaire", jauges: { force: 10 }, sante: 10 },
  { id: "corps-singulier", nom: "Corps singulier", description: "Les médecins ne comprennent pas ce corps.", rarete: "legendaire" },
];

const TRAITS_PAR_ID = new Map(TRAITS.map((t) => [t.id, t]));
export function trait(id: string): Trait | undefined {
  return TRAITS_PAR_ID.get(id);
}

/** Année de naissance (Kaien), entre 1462 et 1527, plus dense autour de 1495. */
export function tirerAnnee(rng: () => number): number {
  const r = rng();
  let an: number;
  if (r < 0.55) an = gauss(rng, -27, 12);
  else if (r < 0.8) an = -60 + rng() * 65;
  else an = gauss(rng, -5, 6);
  an = Math.max(-60, Math.min(5, Math.round(an)));
  return 1522 + an;
}

export function ilesHabitees(annee: number): Ile[] {
  return ILES.filter((i) => !i.habitee || (annee >= i.habitee[0] && annee <= i.habitee[1]));
}

function tirerPeuple(rng: () => number, i: Ile, sexe: Sexe): Peuple {
  if (!i.peuples) return "humain";
  const entrees = Object.entries(i.peuples) as [Peuple, number][];
  let p = pondere(rng, entrees, ([, w]) => w)?.[0] ?? "humain";
  if (p === "sirene" && sexe === "h" && rng() < 0.5) p = "homme-poisson";
  return p;
}

function tirerClasse(rng: () => number, i: Ile, annee: number, peuple: Peuple): Classe {
  const t = i.tags;
  const r = rng();
  if (i.id === "marie-joie") {
    if (peuple !== "humain") return "esclave";
    return r < 0.55 ? "celeste" : r < 0.9 ? "esclave" : "serviteur";
  }
  if (i.id === "grey-terminal") return "pauvre";
  if (i.id === "germa") return r < 0.8 ? "germa" : "artisan";
  if (i.id === "amazon-lily") return "kuja";
  if (i.id === "upper-yard") return "guerrier-shandia";
  if (i.zone === "elbaf" && peuple === "geant" && r < 0.5) return "guerrier-elbaf";
  if (i.zone === "wano" && r < 0.15) return "samourai";
  if (i.id === "ohara" && r < 0.3) return "savant";
  if (i.id === "goa-ville-haute" && r < 0.7) return "noble";
  if (i.id === "impel-down") return "hors-la-loi";
  if (t.includes("base-marine") && r < 0.3) return "famille-marine";
  if (t.includes("pegre") && r < 0.25) return "hors-la-loi";
  if (t.includes("esclavage") && r < 0.08) return "esclave";
  if (t.includes("royaume") && r < 0.06) return "noble";
  if (t.includes("pauvre") && r < 0.5) return "pauvre";
  if ((peuple === "homme-poisson" || peuple === "sirene" || peuple === "buccaneer") && r < 0.03) return "esclave";

  const table: [Classe, number][] = [
    ["villageois", 38], ["artisan", 20], ["pauvre", 14], ["marchand", 9], ["famille-marine", 5],
    ["famille-pirate", 4], ["noble", 3], ["hors-la-loi", 3], ["esclave", 1], ["savant", 0.5],
    ["famille-revolutionnaire", annee >= 1502 ? 0.3 : 0],
  ];
  return pondere(rng, table, ([, w]) => w)?.[0] ?? "villageois";
}

const BONUS_CLASSE: Partial<Record<Classe, Partial<Jauges>>> = {
  villageois: { force: 3, equipage: 2 },
  artisan: { savoir: 2, equipage: 2 },
  pauvre: { force: 4, savoir: -2 },
  marchand: { savoir: 4 },
  "famille-marine": { force: 2, savoir: 2 },
  "famille-pirate": { force: 3, equipage: 3 },
  noble: { savoir: 6, force: -1 },
  "hors-la-loi": { force: 2, savoir: 1 },
  esclave: { force: 2, savoir: -3, equipage: -2 },
  savant: { savoir: 8 },
  samourai: { force: 4, haki: 1 },
  "guerrier-shandia": { force: 4 },
  kuja: { force: 4, haki: 2 },
  "guerrier-elbaf": { force: 6 },
  germa: { force: 3, savoir: 2 },
  celeste: { savoir: 5, force: -3, equipage: -5 },
};

const BONUS_PEUPLE: Partial<Record<Peuple, Partial<Jauges>>> = {
  geant: { force: 8 },
  "homme-poisson": { force: 5 },
  mink: { force: 4, haki: 1 },
  lunarien: { force: 5 },
  buccaneer: { force: 5 },
  nain: { force: 3 },
  "trois-yeux": { haki: 3 },
};

function tirerTraits(rng: () => number): string[] {
  const tirer = (): string => {
    const r = rng();
    const rarete = r < 0.03 ? "legendaire" : r < 0.25 ? "rare" : "commun";
    // Le corps singulier est une anomalie sur dix mille.
    const pool = TRAITS.filter((t) => t.rarete === rarete && (t.id !== "corps-singulier" || rng() < 0.01));
    return parmi(rng, pool.length ? pool : TRAITS.filter((t) => t.rarete === "commun")).id;
  };
  const premiers = [tirer()];
  if (rng() < 0.2) {
    const second = tirer();
    if (!premiers.includes(second)) premiers.push(second);
  }
  return premiers;
}

export interface NaissanceImposee {
  annee?: number;
  ile?: string;
  peuple?: Peuple;
  sexe?: Sexe;
}

export function naitre(rng: () => number, graine: number, impose: NaissanceImposee = {}): EtatVie {
  const anneeNaissance = impose.annee ?? tirerAnnee(rng);
  const iles = ilesHabitees(anneeNaissance);
  const ileChoisie = (impose.ile && iles.find((i) => i.id === impose.ile)) || pondere(rng, iles, (i) => i.poids)!;
  let sexe: Sexe = impose.sexe ?? (rng() < 0.5 ? "h" : "f");
  if (ileChoisie.id === "amazon-lily") sexe = "f";
  const peuple = impose.peuple ?? tirerPeuple(rng, ileChoisie, sexe);
  const classe = tirerClasse(rng, ileChoisie, anneeNaissance, peuple);
  const nomIle = ileChoisie.anonyme ? nomIleAnonyme(rng, ileChoisie.zone) : ileChoisie.nom;

  const chanceD = (peuple === "humain" || peuple === "geant" ? 1 / 250 : 1 / 1000) * (classe === "famille-pirate" ? 2 : 1);
  const d = rng() < chanceD;
  const traits = tirerTraits(rng);

  const jauges: Jauges = { force: 2, haki: 0, savoir: 2, equipage: 3 };
  let sante = 75;
  const ajouter = (b?: Partial<Jauges>): void => {
    if (!b) return;
    for (const [k, val] of Object.entries(b)) jauges[k as keyof Jauges] += val ?? 0;
  };
  ajouter(BONUS_CLASSE[classe]);
  ajouter(BONUS_PEUPLE[peuple]);
  for (const id of traits) {
    const t = trait(id);
    ajouter(t?.jauges);
    sante += t?.sante ?? 0;
  }
  for (const k of Object.keys(jauges) as (keyof Jauges)[]) jauges[k] = Math.max(0, Math.min(100, jauges[k]));

  let potentielHaki = Math.round(Math.max(8, Math.min(95, gauss(rng, 32, 18))));
  if (traits.includes("graine-du-roi")) potentielHaki = Math.max(potentielHaki, 85);
  if (traits.includes("voix-de-toute-chose")) potentielHaki = Math.max(potentielHaki, 60);
  if (d) potentielHaki = Math.min(100, potentielHaki + 15);

  const camp = classe === "celeste" ? "celeste" : classe === "esclave" ? "esclave" : "civil";
  const flags: string[] = [];
  if (traits.includes("graine-du-roi")) flags.push("graine-du-roi");
  if (d) flags.push("porte-le-d");
  if (rng() < 0.006 && ileChoisie.tags.includes("port")) flags.push("ne-en-mer");

  const famille = nomDeFamille(rng, peuple, ileChoisie.zone);
  const etat: EtatVie = {
    graine,
    monde: "aube",
    prenom: prenom(rng, sexe, peuple, ileChoisie.zone),
    famille,
    sexe,
    peuple,
    classe,
    d,
    dConnu: d && rng() < 0.4,
    traits,
    potentielHaki,
    anneeNaissance,
    annee: anneeNaissance,
    age: 0,
    pas: PEUPLES[peuple].longevite >= 2 ? 2 : 1,
    zone: ileChoisie.zone,
    ile: ileChoisie.id,
    nomIle,
    ileNatale: ileChoisie.id,
    nomIleNatale: nomIle,
    zoneNatale: ileChoisie.zone,
    zonesVisitees: [ileChoisie.zone],
    ilesVisitees: [ileChoisie.id],
    jauges,
    sante: Math.max(20, Math.min(100, sante)),
    prime: 0,
    primeMax: 0,
    bourse: 0,
    camp,
    grade: camp === "celeste" ? "dragon-celeste" : camp === "esclave" ? "esclave" : undefined,
    reveAccompli: false,
    fruitsManges: 0,
    haki: [],
    flags: [...flags],
    flagsVus: [...flags],
    compteurs: {},
    liens: [],
    prochainLien: 1,
    planifies: [],
    vus: {},
    journal: [],
    grille: [],
    focus: "equipage",
    vivant: true,
    rencontres: [],
    clins: [],
    rumeurs: [],
    poneglyphes: [],
    notes: {},
    pausesFaites: [],
    faits: [],
    habitudes: {},
    faites: {},
  };

  // Les parents. Un sur dix grandit sans eux (un sur quatre chez les plus pauvres).
  const orphelin = rng() < (classe === "pauvre" || classe === "esclave" ? 0.25 : 0.1);
  if (orphelin) {
    etat.flags.push("orphelin");
    etat.flagsVus.push("orphelin");
  } else {
    for (const role of ["mere", "pere"] as const) {
      etat.liens.push({
        id: etat.prochainLien++,
        role,
        nom: prenom(rng, role === "mere" ? "f" : "h", peuple, ileChoisie.zone),
        sexe: role === "mere" ? "f" : "h",
        vivant: true,
        parti: role === "pere" && rng() < 0.12,
        depuis: 0,
      });
    }
  }
  if (rng() < 0.35 && !orphelin) {
    const sexeFrere: Sexe = rng() < 0.5 ? "h" : "f";
    etat.liens.push({ id: etat.prochainLien++, role: "frere", nom: prenom(rng, sexeFrere, peuple, ileChoisie.zone), sexe: sexeFrere, vivant: true, parti: false, depuis: entre(rng, 0, 4) });
  }
  return etat;
}
