// Paperasse — contenu du jeu : unités, projets, régions, usagers du Guichet,
// messages d'ambiance. Aucun calcul ici (voir eco.ts), aucun DOM.

import type { Etat } from "./state.ts";

export type Phase = 1 | 2 | 3 | 4;

// ---- multiplicateurs ----

// Chaque projet acheté multiplie certains de ces facteurs (sauf `pieces`, qui
// s'additionne : pièces justificatives offertes en plus des Cerfa).
export interface Mods {
  clic: number;
  stagiaire: number;
  tampon: number;
  agent: number;
  bureau: number;
  centre: number;
  plateforme: number;
  ia: number;
  tous: number; // débit de toutes les unités
  demande: number;
  valeur: number; // recette par dossier (en plus du timbre)
  feuilles: number; // feuilles consommées par dossier
  patience: number;
  notes: number; // production de notes de service
  cap: number; // plafond de notes
  grogneGain: number;
  grogneBaisse: number;
  pieces: number; // additif
  replication: number; // espace
  traitement: number; // espace
}

export const MODS_NEUTRES: Mods = {
  clic: 1,
  stagiaire: 1,
  tampon: 1,
  agent: 1,
  bureau: 1,
  centre: 1,
  plateforme: 1,
  ia: 1,
  tous: 1,
  demande: 1,
  valeur: 1,
  feuilles: 1,
  patience: 1,
  notes: 1,
  cap: 1,
  grogneGain: 1,
  grogneBaisse: 1,
  pieces: 0,
  replication: 1,
  traitement: 1,
};

// ---- constantes d'équilibrage ----

export const TIMBRE_DEPART = 0.25;
export const TIMBRE_PAS = 0.05;
export const TIMBRE_MIN = 0.05;
export const ELASTICITE = 1.15;
export const DEMANDE_BASE = 3; // usagers par seconde à Trifouilly, timbre à 0,25 €
export const ECHELLE_PHASE: Record<Phase, number> = { 1: 1, 2: 12, 3: 12, 4: 12 };

export const FEUILLES_PAR_RAMETTE = 500;
export const PRIX_RAMETTE_MOYEN = 5;
export const PRIX_RAMETTE_MIN = 3.5;
export const PRIX_RAMETTE_MAX = 6.5;

export const AFFICHAGE_COUT = 25;
export const AFFICHAGE_COEF = 1.6;
export const AFFICHAGE_MULT = 1.25;

export const PATIENCE_BASE = 30; // secondes (affichées en « jours »)

export const NOTES_PAR_REUNION = 2; // par seconde
export const NOTES_PAR_CLASSEUR = 1000;
export const GALON_ECHELLE = 1000; // galons aux paliers 1, 2, 3, 5, 8… × 1 000 dossiers

export const CERFA_COUT = 1500; // notes
export const CERFA_COEF = 1.45;

export const MEDAILLE_BONUS = 0.25;
export const HORS_LIGNE_MAX = 8 * 3600; // s

// Grogne (phase 3), en % par seconde
export const GROGNE_PAR_CERFA = 0.04;
export const GROGNE_PAR_DELAI = 0.6; // × (délai / patience)
export const GROGNE_BAISSE = 0.45;
export const GROGNE_HORS_LIGNE_MAX = 90;
export const CAMPAGNE_BAISSE = 25;
export const CAMPAGNE_SECONDES = 45; // coût en secondes de recettes
export const NEGO_SECONDES = 30;
export const GREVE_ATTENTE = 120;

// Espace (fin de phase 4)
export const MASSE_FEUILLE = 0.005; // kg
export const MASSE_GUICHET = 1000; // kg
export const REPLICATION_BASE = 0.05; // copies par guichet et par seconde
export const TRAITEMENT_BASE = 1e6; // dossiers par guichet et par seconde

// ---- unités ----

export type UniteId = "stagiaire" | "tampon" | "agent" | "bureau" | "centre" | "plateforme" | "ia";

export interface UniteDef {
  id: UniteId;
  nom: string;
  pluriel: string;
  icone: string;
  debit: number; // dossiers par seconde
  cout: number;
  coef: number;
  phase: Phase;
  projet?: string; // projet qui la débloque
  texte: string;
}

export const UNITES: UniteDef[] = [
  { id: "stagiaire", nom: "Stagiaire", pluriel: "Stagiaires", icone: "🧑‍🎓", debit: 1, cout: 10, coef: 1.09, phase: 1, texte: "Non rémunéré, très motivé." },
  { id: "tampon", nom: "Tampon automatique", pluriel: "Tampons automatiques", icone: "🖨️", debit: 12, cout: 500, coef: 1.1, phase: 1, projet: "tampon-dateur", texte: "Ne prend jamais de pause café." },
  { id: "agent", nom: "Agent titulaire", pluriel: "Agents titulaires", icone: "🧑‍💼", debit: 150, cout: 25_000, coef: 1.1, phase: 2, texte: "Emploi à vie, rythme de croisière." },
  { id: "bureau", nom: "Bureau (10 agents)", pluriel: "Bureaux", icone: "🏢", debit: 2_500, cout: 900_000, coef: 1.11, phase: 2, projet: "organigramme", texte: "Avec plante verte et calendrier des pompiers." },
  { id: "centre", nom: "Centre de traitement", pluriel: "Centres de traitement", icone: "🏭", debit: 60_000, cout: 6e8, coef: 1.12, phase: 3, texte: "Un hangar, 400 bureaux, un seul code Wi-Fi." },
  { id: "plateforme", nom: "Plateforme nationale", pluriel: "Plateformes nationales", icone: "🛰️", debit: 1.5e6, cout: 3e11, coef: 1.13, phase: 3, projet: "plateforme", texte: "Hotline ouverte de 14 h à 14 h 15." },
  { id: "ia", nom: "Intelligence administrative", pluriel: "Intelligences administratives", icone: "🤖", debit: 6e7, cout: 4e14, coef: 1.14, phase: 4, projet: "ia-administrative", texte: "Refuse les dossiers incomplets en 0,3 ms." },
];

export const UNITE_PAR_ID = Object.fromEntries(UNITES.map((u) => [u.id, u])) as Record<UniteId, UniteDef>;

// ---- régions (phase 3) ----

export interface RegionDef {
  id: string;
  nom: string;
  pop: number; // millions d'habitants
  col: number; // place sur la carte simplifiée (grille 5 × 5)
  lig: number;
}

// La préfecture de départ est en Centre-Val de Loire (Trifouilly-les-Oies est
// forcément quelque part par là).
export const REGION_DEPART = "cvl";

export const REGIONS: RegionDef[] = [
  { id: "hdf", nom: "Hauts-de-France", pop: 6.0, col: 2, lig: 0 },
  { id: "nor", nom: "Normandie", pop: 3.3, col: 1, lig: 1 },
  { id: "idf", nom: "Île-de-France", pop: 12.3, col: 2, lig: 1 },
  { id: "ges", nom: "Grand Est", pop: 5.6, col: 3, lig: 1 },
  { id: "bre", nom: "Bretagne", pop: 3.4, col: 0, lig: 1 },
  { id: "pdl", nom: "Pays de la Loire", pop: 3.9, col: 1, lig: 2 },
  { id: "cvl", nom: "Centre-Val de Loire", pop: 2.6, col: 2, lig: 2 },
  { id: "bfc", nom: "Bourgogne-Franche-Comté", pop: 2.8, col: 3, lig: 2 },
  { id: "naq", nom: "Nouvelle-Aquitaine", pop: 6.1, col: 1, lig: 3 },
  { id: "ara", nom: "Auvergne-Rhône-Alpes", pop: 8.1, col: 3, lig: 3 },
  { id: "occ", nom: "Occitanie", pop: 6.1, col: 2, lig: 4 },
  { id: "pac", nom: "Provence-Alpes-Côte d'Azur", pop: 5.1, col: 3, lig: 4 },
  { id: "cor", nom: "Corse", pop: 0.35, col: 4, lig: 4 },
];

export const REGION_PAR_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<string, RegionDef>;
export const REGION_COUT = 2e8;
export const REGION_COEF = 1.9;

// ---- espace ----

export interface FrontiereDef {
  nom: string;
  masse: number; // kg
  projet: string;
}

export const FRONTIERES: FrontiereDef[] = [
  { nom: "la Lune", masse: 7.3e22, projet: "prefecture-lune" },
  { nom: "le Système solaire (Soleil exclu, trop chaud pour le papier)", masse: 2.7e27, projet: "systeme-solaire" },
  { nom: "la Voie lactée", masse: 1.5e42, projet: "voie-lactee" },
  { nom: "l'Univers observable", masse: 3e54, projet: "univers" },
];

// ---- projets ----

export interface ProjetDef {
  id: string;
  phase: Phase;
  nom: string;
  texte: string;
  notes?: number;
  budget?: number;
  visible: (e: Etat) => boolean;
  mods?: Partial<Mods>;
  journal: string;
}

const a = (e: Etat, id: string): boolean => e.projets.includes(id);
const n = (e: Etat, id: UniteId): number => e.unites[id];

export const PROJETS: ProjetDef[] = [
  // — phase 1 : stagiaire —
  {
    id: "tampon-double", phase: 1, nom: "Tampon à double tête", texte: "Chaque coup de tampon traite 2 dossiers.",
    notes: 150, visible: (e) => e.dossiers >= 150, mods: { clic: 2 },
    journal: "Le tampon à double tête est arrivé. Le bureau d'à côté est jaloux.",
  },
  {
    id: "ticket-numerote", phase: 1, nom: "Ticket numéroté", texte: "Affiche le délai de traitement. Avec un ticket, on patiente 50 % plus longtemps.",
    notes: 400, visible: (e) => e.dossiers >= 600, mods: { patience: 1.5 },
    journal: "Le n° 47 est appelé. Personne ne bouge : tout le monde a le 48.",
  },
  {
    id: "cafe", phase: 1, nom: "Café gratuit", texte: "Stagiaires +25 %.",
    notes: 500, visible: (e) => n(e, "stagiaire") >= 3, mods: { stagiaire: 1.25 },
    journal: "La machine à café fait aussi soupe à la tomate. Personne ne sait pourquoi.",
  },
  {
    id: "recto-verso", phase: 1, nom: "Recto-verso", texte: "Deux fois moins de feuilles par dossier.",
    notes: 750, visible: (e) => e.ramettesAchetees >= 3, mods: { feuilles: 0.5 },
    journal: "Révolution : on écrit derrière. Le service juridique enquête.",
  },
  {
    id: "panneau", phase: 1, nom: "Panneau lumineux", texte: "Notoriété ×1,5.",
    notes: 900, visible: (e) => e.affichage >= 2, mods: { demande: 1.5 },
    journal: "Le panneau lumineux affiche « BIENVENUE » avec deux N. Ça attire du monde.",
  },
  {
    id: "commande-groupee", phase: 1, nom: "Commande groupée", texte: "Rachète les ramettes tout seul quand le stock baisse.",
    notes: 1000, budget: 150, visible: (e) => e.dossiers >= 3000, mods: {},
    journal: "Bon de commande n° 1 signé. Le fournisseur vous envoie une carte de vœux.",
  },
  {
    id: "tickets-resto", phase: 1, nom: "Tickets resto", texte: "Stagiaires +50 %.",
    notes: 1400, visible: (e) => a(e, "cafe") && n(e, "stagiaire") >= 10, mods: { stagiaire: 1.5 },
    journal: "Les stagiaires mangent enfin autre chose que des chips du distributeur.",
  },
  {
    id: "tampon-dateur", phase: 1, nom: "Tampon dateur", texte: "Débloque le tampon automatique.",
    notes: 1800, visible: (e) => n(e, "stagiaire") >= 12, mods: {},
    journal: "Le tampon automatique date tout du 1er janvier 1970. Personne ne le remarque.",
  },
  {
    id: "mercredi", phase: 1, nom: "Fermeture le mercredi après-midi", texte: "Notes de service +50 % (plus de temps pour se réunir), demande −10 %.",
    notes: 2200, visible: (e) => e.galons >= 4, mods: { notes: 1.5, demande: 0.9 },
    journal: "Fermé le mercredi après-midi. Et le vendredi après-midi, par solidarité.",
  },
  {
    id: "encre", phase: 1, nom: "Encre longue durée", texte: "Tampons automatiques ×2.",
    notes: 2800, visible: (e) => n(e, "tampon") >= 5, mods: { tampon: 2 },
    journal: "Nouvelle encre : un violet administratif inédit, le « Pantone 404 ».",
  },
  {
    id: "promesse", phase: 1, nom: "Promesse d'embauche", texte: "Stagiaires ×2.",
    notes: 3500, visible: (e) => a(e, "tickets-resto") && n(e, "stagiaire") >= 25, mods: { stagiaire: 2 },
    journal: "Promesse d'embauche signée. En CDD de 3 mois renouvelable 14 fois.",
  },
  {
    id: "concours-interne", phase: 1, nom: "Concours interne", texte: "Passer chef de bureau à la sous-préfecture.",
    notes: 4000, visible: (e) => e.dossiers >= 80_000, mods: {},
    journal: "Admis au concours interne ! Sujet de l'épreuve : « Le tampon, outil ou finalité ? »",
  },

  // — phase 2 : chef de bureau —
  {
    id: "trois-exemplaires", phase: 2, nom: "Formulaire en 3 exemplaires", texte: "Recette par dossier ×2, mais 3 fois plus de feuilles.",
    notes: 2500, visible: (e) => e.phase >= 2, mods: { valeur: 2, feuilles: 3 },
    journal: "Un exemplaire pour l'usager, un pour le dossier, un pour l'exemplaire.",
  },
  {
    id: "salle-attente", phase: 2, nom: "Salle d'attente chauffée", texte: "Patience des usagers ×2.",
    notes: 3000, budget: 20_000, visible: (e) => e.phase >= 2 && e.cerfas.length >= 1, mods: { patience: 2 },
    journal: "Salle d'attente chauffée à 26 °C. Certains usagers ne veulent plus partir.",
  },
  {
    id: "prime-rendement", phase: 2, nom: "Prime au rendement", texte: "Agents titulaires ×2.",
    notes: 4000, visible: (e) => n(e, "agent") >= 5, mods: { agent: 2 },
    journal: "La prime au rendement est versée. En bons d'achat valables au self.",
  },
  {
    id: "ar-ar", phase: 2, nom: "Accusé de réception d'accusé de réception", texte: "+1 pièce justificative offerte par dossier.",
    notes: 5000, visible: (e) => e.cerfas.length >= 2, mods: { pieces: 1 },
    journal: "Vous accusez réception de l'accusé de réception. Vous recevez un accusé de réception.",
  },
  {
    id: "excel", phase: 2, nom: "Excel 97", texte: "Notes de service ×2.",
    notes: 4500, budget: 60_000, visible: (e) => e.phase >= 2 && e.galons >= 9, mods: { notes: 2 },
    journal: "Excel 97 installé. Le trombone animé vous demande si vous rédigez une lettre.",
  },
  {
    id: "titularisation", phase: 2, nom: "Titularisation des stagiaires", texte: "Stagiaires ×10.",
    notes: 5500, visible: (e) => e.phase >= 2 && n(e, "agent") >= 10, mods: { stagiaire: 10 },
    journal: "Les stagiaires sont titularisés. Ils ont 54 ans en moyenne.",
  },
  {
    id: "organigramme", phase: 2, nom: "Organigramme en arbre", texte: "Débloque les bureaux de 10 agents.",
    notes: 6000, visible: (e) => n(e, "agent") >= 15, mods: {},
    journal: "Nouvel organigramme : 14 niveaux hiérarchiques, dont 3 vacants.",
  },
  {
    id: "slogan", phase: 2, nom: "Slogan officiel", texte: "« L'administration, c'est vous. » Notoriété ×2.",
    notes: 7000, budget: 400_000, visible: (e) => e.phase >= 2 && e.affichage >= 12, mods: { demande: 2 },
    journal: "Slogan validé après 9 comités. La version finale tient en 41 mots.",
  },
  {
    id: "classement-vertical", phase: 2, nom: "Classement vertical", texte: "Plafond de notes ×2.",
    notes: 8000, visible: (e) => e.phase >= 2 && e.classeurs >= 8, mods: { cap: 2 },
    journal: "Les classeurs tiennent debout. Une avancée majeure de la science.",
  },
  {
    id: "dematerialisation", phase: 2, nom: "Dématérialisation", texte: "Toutes les unités ×5. Mais 3 fois plus de feuilles : tout le monde imprime.",
    notes: 10_000, budget: 5e6, visible: (e) => n(e, "bureau") >= 3, mods: { tous: 5, feuilles: 3 },
    journal: "Dossier 100 % dématérialisé. Merci de l'imprimer en 4 exemplaires.",
  },
  {
    id: "pause-cafe", phase: 2, nom: "Machine à café au 2e étage", texte: "Bureaux ×2.",
    notes: 12_000, visible: (e) => n(e, "bureau") >= 8, mods: { bureau: 2 },
    journal: "La machine à café du 2e est enfin réparée. La productivité double.",
  },
  {
    id: "concours-prefet", phase: 2, nom: "Concours de préfet", texte: "Prendre la préfecture de région.",
    notes: 18_000, budget: 2e8, visible: (e) => e.phase >= 2 && e.dossiers >= 2e8, mods: {},
    journal: "Nommé préfet ! On vous remet un képi, une voiture et un discours tout prêt.",
  },

  // — phase 3 : préfet —
  {
    id: "communication", phase: 3, nom: "Service de communication", texte: "Débloque les campagnes de com' pour calmer la grogne.",
    notes: 6000, visible: (e) => e.phase >= 3, mods: {},
    journal: "Le service com' propose un logo. Il ressemble beaucoup à l'ancien.",
  },
  {
    id: "mediateur", phase: 3, nom: "Médiateur départemental", texte: "La grogne retombe 2 fois plus vite.",
    notes: 9000, visible: (e) => e.phase >= 3 && e.grogne >= 20, mods: { grogneBaisse: 2 },
    journal: "Le médiateur écoute tout le monde. Il ne décide rien, mais il écoute très bien.",
  },
  {
    id: "rendez-vous", phase: 3, nom: "Prise de rendez-vous en ligne", texte: "Patience ×3 (prochain créneau : dans 4 mois).",
    notes: 11_000, budget: 2e9, visible: (e) => e.phase >= 3 && e.regions.length >= 3, mods: { patience: 3 },
    journal: "Rendez-vous en ligne ouvert. Premier créneau disponible : le 31 février.",
  },
  {
    id: "plateforme", phase: 3, nom: "Plateformes nationales", texte: "Débloque les plateformes nationales.",
    notes: 14_000, visible: (e) => n(e, "centre") >= 10, mods: {},
    journal: "La plateforme nationale est ouverte. Votre appel est important pour nous.",
  },
  {
    id: "numero-vert", phase: 3, nom: "Numéro vert surtaxé", texte: "Chaque point de grogne augmente les recettes de 1 %.",
    notes: 12_000, visible: (e) => e.phase >= 3 && e.projets.includes("communication"), mods: {},
    journal: "Numéro vert à 3,50 €/min. Les usagers en colère financent le service.",
  },
  {
    id: "timbre-electronique", phase: 3, nom: "Timbre fiscal électronique", texte: "Recette par dossier ×3.",
    notes: 16_000, budget: 5e9, visible: (e) => e.phase >= 3 && e.regions.length >= 5, mods: { valeur: 3 },
    journal: "Le timbre électronique est un PDF qu'on imprime et qu'on colle.",
  },
  {
    id: "logiciel-national", phase: 3, nom: "Logiciel national (v0.9 bêta)", texte: "Centres et plateformes ×3, mais la grogne monte 50 % plus vite.",
    notes: 20_000, visible: (e) => n(e, "centre") >= 20, mods: { centre: 3, plateforme: 3, grogneGain: 1.5 },
    journal: "Le logiciel national est livré avec 7 ans de retard et un mode d'emploi en latin.",
  },
  {
    id: "renouvellement", phase: 3, nom: "Renouvellement tous les 2 ans", texte: "Demande ×3, grogne +50 %.",
    notes: 25_000, visible: (e) => e.phase >= 3 && e.regions.length >= 7, mods: { demande: 3, grogneGain: 1.5 },
    journal: "Les cartes d'identité expirent désormais tous les 2 ans. Et les photos tous les 6 mois.",
  },
  {
    id: "seminaire", phase: 3, nom: "Séminaire de cohésion à Deauville", texte: "Notes ×2, plafond ×2.",
    notes: 18_000, budget: 1e10, visible: (e) => e.phase >= 3 && e.galons >= 30, mods: { notes: 2, cap: 2 },
    journal: "Séminaire à Deauville : 3 jours, 1 atelier, 14 cocktails.",
  },
  {
    id: "remaniement", phase: 3, nom: "Remaniement ministériel", texte: "Devenir ministre de la Simplification administrative.",
    notes: 40_000, visible: (e) => e.regions.length >= REGIONS.length, mods: {},
    journal: "Remaniement : vous êtes ministre. Votre première mesure : un formulaire de prise de fonctions.",
  },

  // — phase 4 : ministre —
  {
    id: "reclamation", phase: 4, nom: "Formulaire de réclamation", texte: "Plus de grogne : chaque plainte devient un dossier. Demande ×2.",
    notes: 20_000, visible: (e) => e.phase >= 4, mods: { demande: 2 },
    journal: "Les plaintes sont désormais des dossiers. La colère est devenue une ressource.",
  },
  {
    id: "choc-1", phase: 4, nom: "Choc de simplification", texte: "On fusionne les Cerfa 1 à 400. Recette par dossier ×2.",
    notes: 25_000, visible: (e) => e.phase >= 4, mods: { valeur: 2 },
    journal: "400 Cerfa fusionnés en un seul. Il fait 212 pages.",
  },
  {
    id: "ia-administrative", phase: 4, nom: "Intelligence administrative", texte: "Débloque l'IA qui tamponne toute seule.",
    notes: 30_000, budget: 1e13, visible: (e) => e.phase >= 4 && a(e, "reclamation"), mods: {},
    journal: "L'IA administrative est en service. Elle demande déjà un formulaire de mise en service.",
  },
  {
    id: "cerfa-europeen", phase: 4, nom: "Cerfa européen", texte: "Demande ×8.",
    notes: 35_000, budget: 3e13, visible: (e) => e.phase >= 4 && a(e, "choc-1"), mods: { demande: 8 },
    journal: "Le Cerfa européen existe en 24 langues. Aucune n'est comprise.",
  },
  {
    id: "choc-2", phase: 4, nom: "Formulaire unique (1 200 pages)", texte: "Recette par dossier ×3.",
    notes: 45_000, visible: (e) => a(e, "cerfa-europeen"), mods: { valeur: 3 },
    journal: "Il n'y a plus qu'un seul formulaire. Il est livré sur palette.",
  },
  {
    id: "cerfa-mondial", phase: 4, nom: "Cerfa mondial", texte: "Demande ×10.",
    notes: 60_000, budget: 2e15, visible: (e) => a(e, "cerfa-europeen") && n(e, "ia") >= 5, mods: { demande: 10 },
    journal: "L'ONU adopte le Cerfa mondial. Le Vatican demande un délai.",
  },
  {
    id: "prefecture-lune", phase: 4, nom: "Préfecture de la Lune", texte: "Envoyer un guichet autonome auto-réplicant sur la Lune.",
    notes: 80_000, budget: 2e16, visible: (e) => a(e, "cerfa-mondial"), mods: {},
    journal: "Un guichet autonome alunit. Premier dossier : une demande de permis de construire un autre guichet.",
  },
  {
    id: "tampon-quantique", phase: 4, nom: "Tampon quantique", texte: "Traitement des guichets ×10.",
    notes: 50_000, visible: (e) => e.espace, mods: { traitement: 10 },
    journal: "Le tampon quantique tamponne et ne tamponne pas. Le dossier est validé quand on le regarde.",
  },
  {
    id: "photocopie-guichet", phase: 4, nom: "Photocopie de guichet", texte: "Réplication ×1,5.",
    notes: 60_000, visible: (e) => e.espace, mods: { replication: 1.5 },
    journal: "Les guichets se photocopient eux-mêmes. Recto-verso, bien sûr.",
  },
  {
    id: "systeme-solaire", phase: 4, nom: "Sous-préfecture de Mars", texte: "Ouvrir le Système solaire à l'administration.",
    notes: 90_000, visible: (e) => e.espace && e.frontiere === 0, mods: {},
    journal: "Mars a désormais une sous-préfecture. Les Martiens n'ont pas de pièce d'identité.",
  },
  {
    id: "trois-exemplaires-orbitaux", phase: 4, nom: "Réplication en 3 exemplaires", texte: "Réplication ×1,5.",
    notes: 120_000, visible: (e) => e.espace && e.frontiere >= 1, mods: { replication: 1.5 },
    journal: "Chaque guichet se réplique en trois exemplaires. Un pour lui, un pour le dossier, un pour l'exemplaire.",
  },
  {
    id: "voie-lactee", phase: 4, nom: "Rectorat de la Voie lactée", texte: "Ouvrir la galaxie.",
    notes: 150_000, visible: (e) => e.espace && e.frontiere === 1, mods: {},
    journal: "La Voie lactée est rattachée à l'académie de Créteil.",
  },
  {
    id: "trou-noir", phase: 4, nom: "Classement en trou noir", texte: "Traitement ×100 : on archive tout dans un trou noir.",
    notes: 200_000, visible: (e) => e.espace && e.frontiere >= 2, mods: { traitement: 100, replication: 1.3 },
    journal: "Les archives sont rangées dans un trou noir. Rien n'en ressort, comme avant.",
  },
  {
    id: "univers", phase: 4, nom: "Ministère de l'Univers", texte: "Administrer l'Univers observable.",
    notes: 300_000, visible: (e) => e.espace && e.frontiere === 2, mods: {},
    journal: "Il y a désormais un guichet dans chaque galaxie. Le délai moyen est de 13 milliards d'années.",
  },
];

export const PROJET_PAR_ID = Object.fromEntries(PROJETS.map((p) => [p.id, p])) as Record<string, ProjetDef>;

// Projets qui font changer de phase.
export const PASSAGES: Record<string, Phase> = {
  "concours-interne": 2,
  "concours-prefet": 3,
  remaniement: 4,
};

// ---- en-têtes ----

export const ENTETES: Record<Phase, { lieu: string; grade: string; cerfa: string }> = {
  1: { lieu: "Mairie de Trifouilly-les-Oies", grade: "Stagiaire", cerfa: "Cerfa n° 15-PAPE*01" },
  2: { lieu: "Sous-préfecture de Pétaouchnok-sur-Marne", grade: "Chef de bureau", cerfa: "Cerfa n° 15-PAPE*02" },
  3: { lieu: "Préfecture de la région Centre-Val de Loire", grade: "Préfet", cerfa: "Cerfa n° 15-PAPE*03" },
  4: { lieu: "Ministère de la Simplification administrative", grade: "Ministre", cerfa: "Cerfa n° 15-PAPE*04" },
};

// ---- noms de Cerfa ----

export const CERFA_TYPES = [
  "Attestation", "Déclaration", "Demande", "Certificat", "Récépissé", "Justificatif",
  "Formulaire", "Avis", "Notice", "Bordereau", "Relevé", "Procès-verbal",
];

export const CERFA_OBJETS = [
  "de non-attestation", "de perte de récépissé", "de domicile du domicile", "de présence à son propre guichet",
  "de bonne foi (en 3 exemplaires)", "de non-opposition à l'opposition", "d'existence", "de vie commune avec un ficus",
  "de changement de stylo", "de demande de formulaire", "de non-déménagement", "de respiration sur la voie publique",
  "d'accord tacite explicite", "de photocopie conforme à la photocopie", "de retard justifié d'avance",
  "de possession d'un tampon", "de dispense de dispense", "d'absence de pièce manquante", "de rattachement au rattachement",
  "de reconnaissance d'écriture illisible", "de sortie de file d'attente", "de conformité à la non-conformité",
  "de déclaration de déclaration", "de garde alternée d'un hamster",
];

// ---- usagers du Guichet (phases 2 et 3) ----

export type EffetGuichet =
  | { notes: number } // fraction du plafond
  | { budget: number } // secondes de recettes (négatif = perte)
  | { notoriete: number; duree: number } // multiplicateur temporaire de demande
  | { grogne: number } // points de grogne (phase 3)
  | Record<string, never>; // rien

export interface ReponseGuichet {
  texte: string;
  resultat: string;
  effet: EffetGuichet;
}

export interface UsagerDef {
  id: string;
  phase: 2 | 3;
  qui: string;
  icone: string;
  demande: string;
  reponses: [ReponseGuichet, ReponseGuichet, ReponseGuichet];
}

const rien = {} as Record<string, never>;

export const USAGERS: UsagerDef[] = [
  {
    id: "durand", phase: 2, qui: "M. Durand", icone: "👴",
    demande: "Il veut un acte de naissance. Pour l'obtenir, il faut une pièce d'identité. Pour la pièce d'identité, il faut un acte de naissance.",
    reponses: [
      { texte: "« Revenez lundi. »", resultat: "Il reviendra lundi. Et mardi. Et mercredi.", effet: rien },
      { texte: "« Il vous manque le formulaire B-12. »", resultat: "Vous inventez le B-12 sur un coin de bureau. Brillant.", effet: { notes: 0.25 } },
      { texte: "« Allez, pour cette fois. »", resultat: "Il le raconte à tout le village. Affluence au guichet !", effet: { notoriete: 1.6, duree: 60 } },
    ],
  },
  {
    id: "michu", phase: 2, qui: "Mme Michu", icone: "👵",
    demande: "Elle voudrait faire photocopier la photocopie de sa photocopie, « pour avoir un original ».",
    reponses: [
      { texte: "Facturer la photocopie", resultat: "0,15 € la copie. Elle en veut 400.", effet: { budget: 40 } },
      { texte: "Lui expliquer ce qu'est un original", resultat: "45 minutes plus tard, elle repart convaincue que vous êtes l'original.", effet: { notes: -0.1 } },
      { texte: "Tamponner « CONFORME »", resultat: "Elle est ravie. Vous aussi, c'est votre tampon préféré.", effet: { notoriete: 1.3, duree: 90 } },
    ],
  },
  {
    id: "livreur", phase: 2, qui: "Un livreur", icone: "📦",
    demande: "Il livre 40 cartons de Cerfa vierges commandés en 2009. Il faut signer en 3 exemplaires.",
    reponses: [
      { texte: "Signer", resultat: "40 cartons de notes de service vierges. Ça peut servir.", effet: { notes: 0.3 } },
      { texte: "Refuser la livraison", resultat: "Il repartira avec en 2031.", effet: rien },
      { texte: "Revendre les cartons", resultat: "Un collectionneur de Cerfa vintage vous en offre une fortune.", effet: { budget: 60 } },
    ],
  },
  {
    id: "rapper", phase: 2, qui: "Un rappeur local", icone: "🎤",
    demande: "Il veut tourner un clip devant votre guichet. « Pour l'ambiance authentique. »",
    reponses: [
      { texte: "Accepter", resultat: "Le clip « Pièce manquante » cartonne. Tout le monde veut voir le guichet.", effet: { notoriete: 2, duree: 60 } },
      { texte: "Exiger une autorisation de tournage", resultat: "Il remplit le formulaire en freestyle. Respect.", effet: { notes: 0.15 } },
      { texte: "Faire figurant", resultat: "Vous avez une meilleure présence à l'écran qu'au guichet.", effet: { budget: 30 } },
    ],
  },
  {
    id: "chat", phase: 2, qui: "Un chat", icone: "🐈",
    demande: "Il s'est assis sur la pile de dossiers et refuse de bouger.",
    reponses: [
      { texte: "Le déclarer à l'état civil", resultat: "Le chat s'appelle désormais Cerfa. Il est titularisé.", effet: { notoriete: 1.4, duree: 120 } },
      { texte: "Le déplacer", resultat: "Il vous griffe. Arrêt de travail de 3 jours.", effet: { budget: -20 } },
      { texte: "Attendre qu'il parte", resultat: "Il ne part pas. Vous profitez de la pause pour rédiger des notes.", effet: { notes: 0.2 } },
    ],
  },
  {
    id: "inspecteur", phase: 2, qui: "Un inspecteur des finances", icone: "🕵️",
    demande: "Il vient contrôler l'utilisation des trombones sur l'exercice 2014.",
    reponses: [
      { texte: "Montrer le registre des trombones", resultat: "Le registre est impeccable. Il vous félicite par écrit.", effet: { notes: 0.3 } },
      { texte: "Lui offrir un café", resultat: "Il repart avec la machine à café. Pour expertise.", effet: { budget: -30 } },
      { texte: "Lui demander son ordre de mission", resultat: "Il ne l'a pas. Il repart chercher le formulaire.", effet: rien },
    ],
  },
  {
    id: "touriste", phase: 2, qui: "Un touriste japonais", icone: "📸",
    demande: "Il prend en photo votre tampon depuis 20 minutes. Il veut savoir s'il est à vendre.",
    reponses: [
      { texte: "Le vendre", resultat: "Vendu à prix d'or. Vous en commandez un autre.", effet: { budget: 90 } },
      { texte: "Lui tamponner le passeport", resultat: "Il repart avec « TRAITÉ » sur la page de son visa. Il est ravi.", effet: { notoriete: 1.5, duree: 60 } },
      { texte: "Lui tamponner la main", resultat: "Ça ne part pas. Il revient demain se plaindre (et déposer un dossier).", effet: { notes: 0.1 } },
    ],
  },
  {
    id: "maire", phase: 2, qui: "Le maire de Trifouilly", icone: "🎩",
    demande: "Votre ancien patron veut un passe-droit pour un permis de construire une piscine en forme de tampon.",
    reponses: [
      { texte: "Accorder le passe-droit", resultat: "Il vous invite à l'inauguration. Le buffet est payé par la mairie.", effet: { budget: 50 } },
      { texte: "Appliquer la procédure", resultat: "18 mois d'instruction. Il vous respecte, au fond.", effet: { notes: 0.25 } },
      { texte: "Lui envoyer le Cerfa le plus long", resultat: "Il abandonne le projet. Le village respire.", effet: { notoriete: 1.3, duree: 90 } },
    ],
  },
  {
    id: "stagiaire-perdu", phase: 2, qui: "Un stagiaire perdu", icone: "🧭",
    demande: "Il est arrivé en 2019 pour un stage de 2 mois. Personne ne lui a jamais dit que c'était fini.",
    reponses: [
      { texte: "Lui dire que c'est fini", resultat: "Il fond en larmes. Il voulait juste un badge.", effet: rien },
      { texte: "Lui confier un bureau", resultat: "Il connaît toutes les procédures par cœur. Une mine d'or.", effet: { notes: 0.35 } },
      { texte: "Le nommer responsable des stagiaires", resultat: "Il fait embaucher 30 stagiaires. Le guichet déborde.", effet: { notoriete: 1.5, duree: 90 } },
    ],
  },
  {
    id: "influenceuse", phase: 2, qui: "Une influenceuse", icone: "🤳",
    demande: "Elle filme une story : « Je teste la sous-préfecture la plus lente de France ».",
    reponses: [
      { texte: "Accélérer pour la caméra", resultat: "Record : 4 minutes. 2 millions de vues. Tout le monde veut essayer.", effet: { notoriete: 2.2, duree: 45 } },
      { texte: "Lui demander une autorisation de filmer", resultat: "Elle filme le formulaire. 5 millions de vues. Personne ne vient.", effet: { notes: 0.2 } },
      { texte: "Placer un produit", resultat: "Elle fait la promo du timbre fiscal. Lien en bio.", effet: { budget: 45 } },
    ],
  },
  {
    id: "jumeaux", phase: 2, qui: "Des jumeaux", icone: "👯",
    demande: "Ils ont échangé leurs papiers à 6 ans. Ils ne savent plus qui est qui.",
    reponses: [
      { texte: "Tirer à pile ou face", resultat: "C'est réglé. Peut-être dans le mauvais sens, mais réglé.", effet: { notoriete: 1.3, duree: 60 } },
      { texte: "Ouvrir une enquête", resultat: "L'enquête génère 46 sous-dossiers. Excellent.", effet: { notes: 0.3 } },
      { texte: "Leur facturer deux dossiers", resultat: "Ils paient. Ils ont l'habitude de tout payer en double.", effet: { budget: 35 } },
    ],
  },
  {
    id: "fantome", phase: 2, qui: "M. Martin (décédé en 1987)", icone: "👻",
    demande: "Il demande à être officiellement déclaré vivant : il en a assez de recevoir des courriers de condoléances.",
    reponses: [
      { texte: "Le déclarer vivant", resultat: "Il reçoit aussitôt 37 ans de rappels d'impôts. Le Trésor vous remercie.", effet: { budget: 80 } },
      { texte: "Exiger un certificat de vie", resultat: "Il revient avec. Signé par lui-même.", effet: { notes: 0.15 } },
      { texte: "Lui proposer un café", resultat: "Il traverse la tasse. Ambiance.", effet: rien },
    ],
  },
  // — situations de préfet (phase 3) —
  {
    id: "tele", phase: 3, qui: "Une équipe de télé", icone: "🎥",
    demande: "Une émission veut filmer « une journée dans la préfecture la plus efficace de France ».",
    reponses: [
      { texte: "Ouvrir les portes", resultat: "Diffusé en prime time. La grogne retombe, l'affluence explose.", effet: { grogne: -15 } },
      { texte: "Mettre en scène de faux usagers", resultat: "Les vrais usagers ne se reconnaissent pas. Ils grognent.", effet: { grogne: 10 } },
      { texte: "Facturer le tournage", resultat: "Droits de tournage : une belle somme.", effet: { budget: 60 } },
    ],
  },
  {
    id: "syndicat", phase: 3, qui: "Le délégué syndical", icone: "📣",
    demande: "Il exige des chaises à roulettes pour tous les agents. « Sinon, on avise. »",
    reponses: [
      { texte: "Commander les chaises", resultat: "Course de chaises dans les couloirs. Moral au beau fixe.", effet: { budget: -40 } },
      { texte: "Créer un groupe de travail", resultat: "Le groupe de travail se réunira en 2029. La grogne monte.", effet: { grogne: 12 } },
      { texte: "Lui proposer une promotion", resultat: "Il est promu. Son successeur exige des chaises à roulettes.", effet: { notes: 0.2 } },
    ],
  },
  {
    id: "ministre-visite", phase: 3, qui: "Le ministre de l'Intérieur", icone: "🚔",
    demande: "Il arrive dans 10 minutes pour une visite surprise annoncée il y a trois semaines.",
    reponses: [
      { texte: "Repeindre les murs en vitesse", resultat: "La peinture n'est pas sèche. Le ministre repart vert pâle, mais ravi.", effet: { notes: 0.3 } },
      { texte: "Cacher la file d'attente", resultat: "Les usagers sont enfermés au sous-sol. Ils n'apprécient pas.", effet: { grogne: 15 } },
      { texte: "Lui faire remplir un dossier", resultat: "Il manque une pièce. Il repart furieux, mais impressionné.", effet: { notoriete: 1.5, duree: 90 } },
    ],
  },
  {
    id: "manif-agri", phase: 3, qui: "Des agriculteurs", icone: "🚜",
    demande: "Ils ont déversé du fumier devant la préfecture. Ils réclament moins de paperasse.",
    reponses: [
      { texte: "Leur promettre un formulaire de simplification", resultat: "Le formulaire fait 30 pages. Ils repartent, perplexes.", effet: { grogne: -10 } },
      { texte: "Vendre le fumier", resultat: "Excellent engrais. Le jardin de la préfecture vous remercie.", effet: { budget: 50 } },
      { texte: "Faire constater par huissier", resultat: "Le constat génère un dossier de 80 pages. Vos agents adorent.", effet: { notes: 0.25 } },
    ],
  },
  {
    id: "panne", phase: 3, qui: "Le service informatique", icone: "💻",
    demande: "Le serveur est tombé. Il était branché sur la même prise que la bouilloire.",
    reponses: [
      { texte: "Débrancher la bouilloire", resultat: "Le serveur repart. Les agents font une grève du thé.", effet: { grogne: 8 } },
      { texte: "Acheter une multiprise", resultat: "Problème réglé pour 9,99 €. Un exploit budgétaire.", effet: { notes: 0.2 } },
      { texte: "Tout passer au papier", resultat: "Le papier, ça ne tombe jamais en panne. Vous gagnez du temps.", effet: { budget: 40 } },
    ],
  },
  {
    id: "lettre-anonyme", phase: 3, qui: "Une lettre anonyme", icone: "✉️",
    demande: "« Votre préfecture est la plus lente du pays. Signé : un usager (Gérard, 12 rue des Lilas). »",
    reponses: [
      { texte: "Répondre à Gérard", resultat: "Vous lui envoyez un questionnaire de satisfaction. Il est ému.", effet: { grogne: -8 } },
      { texte: "Classer sans suite", resultat: "La lettre rejoint 40 000 autres. Elle est en bonne compagnie.", effet: rien },
      { texte: "Ouvrir un dossier", resultat: "Gérard reçoit une convocation. Il ne grogne plus jamais.", effet: { notes: 0.15 } },
    ],
  },
  {
    id: "sangliers", phase: 3, qui: "Une harde de sangliers", icone: "🐗",
    demande: "Elle occupe le parking de la préfecture depuis ce matin.",
    reponses: [
      { texte: "Leur délivrer un titre de séjour", resultat: "Les sangliers sont régularisés. La presse adore.", effet: { notoriete: 1.6, duree: 60 } },
      { texte: "Appeler la louveterie", resultat: "Battue administrative : 14 formulaires, 0 sanglier.", effet: { notes: 0.2 } },
      { texte: "Faire payer le stationnement", resultat: "Ils ne paient pas. Vous verbalisez quand même.", effet: { budget: 20 } },
    ],
  },
  {
    id: "neige", phase: 3, qui: "Météo-France", icone: "❄️",
    demande: "Alerte neige : 2 cm attendus. Faut-il fermer la préfecture ?",
    reponses: [
      { texte: "Fermer par précaution", resultat: "Les agents font des bonhommes de neige. La grogne retombe.", effet: { grogne: -12 } },
      { texte: "Ouvrir quand même", resultat: "Il ne neige pas. Personne ne vient. Vous rédigez des notes au calme.", effet: { notes: 0.25 } },
      { texte: "Installer un guichet drive", resultat: "Le guichet drive est un succès. On fait la queue en doudoune.", effet: { budget: 45 } },
    ],
  },
];

export const USAGER_PAR_ID = Object.fromEntries(USAGERS.map((u) => [u.id, u])) as Record<string, UsagerDef>;
export const GUICHET_DUREE = 30; // s avant que l'usager reparte
export const GUICHET_DELAI_MIN = 70;
export const GUICHET_DELAI_MAX = 150;

// ---- ambiance (le journal) ----

export const AMBIANCE: Record<Phase, string[]> = {
  1: [
    "Mme Michu demande si on peut photocopier sa photocopie.",
    "Le stylo attaché au comptoir a encore disparu. Avec sa chaîne.",
    "Un usager demande où est le guichet. C'est ici. Il ne vous croit pas.",
    "Panne de l'imprimante. On a essayé de l'éteindre et de la rallumer.",
    "La plante verte du hall est déclarée en arrêt maladie.",
    "Un monsieur attend depuis 9 h. Il voulait juste savoir l'heure.",
    "Réunion de service sur l'organisation des réunions de service.",
    "Le distributeur de tickets est en panne. Un stagiaire écrit les numéros à la main.",
  ],
  2: [
    "Note de service : les notes de service doivent être numérotées.",
    "Le sous-préfet a perdu son tampon. Cellule de crise.",
    "Un usager est reparti avec le mauvais dossier. Il est désormais marié.",
    "Le parapheur a fait un bourrage papier.",
    "Une circulaire annule la circulaire qui annulait la circulaire.",
    "La file d'attente fait le tour du bâtiment. Deux fois.",
    "Pot de départ en retraite de Jean-Mi. Il revient lundi comme vacataire.",
    "Le formulaire en ligne est disponible. Merci de l'imprimer et de le déposer au guichet.",
  ],
  3: [
    "Le préfet de la Creuse demande à être rattaché à votre région. Il n'en a pas le droit.",
    "Un rapport de la Cour des comptes vous qualifie de « singulier ».",
    "Le standard est saturé. Le message d'attente est une valse de 40 minutes.",
    "Votre képi est exposé au musée de la Préfecture.",
    "Un député pose une question écrite. La réponse fait 3 pages et ne répond pas.",
    "Les agents organisent un pot pour le millionième dossier. Puis pour le millionième pot.",
    "Une file d'attente est inscrite au patrimoine immatériel de l'humanité.",
    "Le Wi-Fi de la préfecture s'appelle « Réseau_Officiel_NE_PAS_UTILISER ».",
  ],
  4: [
    "Conseil des ministres : vous présentez un projet de loi sur la simplification des projets de loi.",
    "Le Sénat examine votre texte. Il compte 4 000 amendements, dont 3 999 de vous.",
    "Votre portrait officiel est un tampon.",
    "Les manuels d'histoire parlent de « l'ère Paperasse ».",
    "Un sondage : 98 % des Français ne savent plus vivre sans formulaire.",
    "Les pays voisins demandent des Cerfa. Vous leur demandez un Cerfa.",
    "La Poste ouvre un guichet spécial pour vos courriers. Il est déjà débordé.",
  ],
};

export const AMBIANCE_ESPACE = [
  "Un astéroïde a été tamponné « TRAITÉ ». Il change de trajectoire par respect.",
  "Les anneaux de Saturne sont reclassés en trombones.",
  "Un guichet autonome demande un congé paternité pour ses 4 milliards de copies.",
  "Une comète passe. Elle n'avait pas de visa.",
  "Le vide intersidéral est déclaré « en attente de pièces justificatives ».",
  "Une civilisation lointaine envoie un message. C'est une réclamation.",
  "Les étoiles s'éteignent une à une. Elles ont été classées.",
];
