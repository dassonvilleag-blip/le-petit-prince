// Cité Petit Prince — contenu : catégories, commerces, produits, prénoms et
// textes du Fil. Les valeurs chiffrées sont regroupées ici pour l'équilibrage.

export type CategorieId = "bouffe" | "services" | "loisirs" | "boutiques" | "creatif";

export interface CategorieDef {
  id: CategorieId;
  nom: string;
  icone: string;
  mur: string; // couleur du mur des commerces de la catégorie
}

export const CATEGORIES: CategorieDef[] = [
  { id: "bouffe", nom: "Bouffe", icone: "🍔", mur: "#f4a261" },
  { id: "services", nom: "Services", icone: "✂️", mur: "#5fb7a8" },
  { id: "loisirs", nom: "Loisirs", icone: "🎮", mur: "#a07ad8" },
  { id: "boutiques", nom: "Boutiques", icone: "🛍️", mur: "#e9c46a" },
  { id: "creatif", nom: "Créatif", icone: "🎤", mur: "#e57a9e" },
];

export const CATEGORIE_PAR_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategorieId,
  CategorieDef
>;

export interface ProduitDef {
  nom: string;
  cout: number; // prix de la commande
  livraison: number; // secondes
  quantite: number;
  prix: number; // prix de vente unitaire, avant bonus des employés
  dureeVente: number; // secondes pour écouler tout le stock
}

export interface CommerceDef {
  id: string;
  nom: string;
  icone: string;
  categorie: CategorieId;
  rang: number; // 0..3
  produits: ProduitDef[];
}

// Barème des trois produits d'un commerce de rang 0 ; multiplié ensuite.
const PRODUITS_BASE = [
  { cout: 30, livraison: 20, quantite: 10, prix: 6, dureeVente: 180 },
  { cout: 250, livraison: 120, quantite: 25, prix: 20, dureeVente: 900 },
  { cout: 1500, livraison: 600, quantite: 50, prix: 70, dureeVente: 3600 },
];

export const MULT_RANG = [1, 2.5, 6, 15];
export const DEBLOCAGE_RANG = [0, 6, 14, 24]; // étages construits requis

const COMMERCES_BRUTS: [string, string, string, CategorieId, [string, string, string]][] = [
  ["snack", "Snack", "🍟", "bouffe", ["Frites", "Panini", "Assiette américaine"]],
  ["tacos", "Tacos", "🌮", "bouffe", ["Tacos simple", "Tacos XL", "Tacos gratiné 3 viandes"]],
  ["boulangerie", "Boulangerie", "🥖", "bouffe", ["Baguette", "Pain au chocolat", "Pièce montée"]],
  ["pizzeria", "Pizzeria", "🍕", "bouffe", ["Part de margherita", "Pizza 4 fromages", "Pizza géante 60 cm"]],
  ["barbier", "Barbier", "💈", "services", ["Contour", "Dégradé", "Coupe, barbe et soin"]],
  ["laverie", "Laverie", "🫧", "services", ["Machine 7 kg", "Séchage", "Couette XXL"]],
  ["reparation", "Réparation téléphones", "🔧", "services", ["Coque", "Écran cassé", "Carte mère"]],
  ["auto-ecole", "Auto-école", "🚗", "services", ["Heure de conduite", "Code en ligne", "Permis accéléré"]],
  ["salle-sport", "Salle de sport", "🏋️", "loisirs", ["Séance", "Abonnement du mois", "Coaching privé"]],
  ["arcade", "Salle d'arcade", "🕹️", "loisirs", ["Partie", "Tournoi FIFA", "Soirée privatisée"]],
  ["city-stade", "City stade", "⚽", "loisirs", ["Match 5 contre 5", "Tournoi de quartier", "Coupe de la cité"]],
  ["cinema", "Cinéma", "🎬", "loisirs", ["Place", "Menu popcorn", "Avant-première"]],
  ["epicerie", "Épicerie", "🥫", "boutiques", ["Canette", "Paquet de chips", "Courses du mois"]],
  ["bazar", "Bazar", "🧰", "boutiques", ["Rallonge", "Poêle", "Parure de lit"]],
  ["sneakers", "Sneakers", "👟", "boutiques", ["Lacets", "Paire de running", "Édition limitée"]],
  ["telephonie", "Téléphonie", "📶", "boutiques", ["Recharge", "Forfait", "Dernier smartphone"]],
  ["graffiti", "Atelier graffiti", "🎨", "creatif", ["Bombe de peinture", "Tag sur commande", "Fresque murale"]],
  ["tatoueur", "Tatoueur", "🖋️", "creatif", ["Petit tatouage", "Prénom calligraphié", "Bras complet"]],
  ["radio", "Radio locale", "📻", "creatif", ["Dédicace", "Spot pub", "Émission spéciale"]],
  ["studio-rap", "Studio de rap", "🎤", "creatif", ["Heure de studio", "Mixage", "Album complet"]],
];

export const COMMERCES: CommerceDef[] = COMMERCES_BRUTS.map(([id, nom, icone, categorie, noms]) => {
  const rang = COMMERCES_BRUTS.filter((c) => c[3] === categorie).findIndex((c) => c[0] === id);
  const m = MULT_RANG[rang];
  return {
    id,
    nom,
    icone,
    categorie,
    rang,
    produits: PRODUITS_BASE.map((p, i) => ({
      nom: noms[i],
      cout: p.cout * m,
      livraison: p.livraison,
      quantite: p.quantite,
      prix: p.prix * m,
      dureeVente: p.dureeVente,
    })),
  };
});

export const COMMERCE_PAR_ID = Object.fromEntries(COMMERCES.map((c) => [c.id, c])) as Record<string, CommerceDef>;

// ---- constantes de simulation ----

export const PLACES_APPART = 5;
export const EMPLOYES_MAX = 3;
export const ARRIVEE_MS = 60_000;
export const VISITEUR_MS = 20_000;
export const VISITEURS_MAX = 3;
export const CHANCE_TICKET_ASCENSEUR = 0.08;
export const BONUS_COMPETENCE = 0.03; // par point de compétence
export const BONUS_REVE = 0.3; // par employé à son métier de rêve
export const TICKET_CHANTIER_MS = 120_000; // 1 🎟️ par tranche restante

export function coutEtage(n: number): number {
  const brut = 150 * n * n * 1.06 ** n;
  // arrondi à deux chiffres significatifs : des prix « ronds »
  const p = 10 ** Math.max(0, Math.floor(Math.log10(brut)) - 1);
  return Math.round(brut / p) * p;
}

export function dureeChantier(n: number): number {
  return Math.min(20 * 60, 10 + 20 * n) * 1000;
}

// ---- habitants ----

export const PRENOMS: [string, "f" | "m"][] = [
  ["Karim", "m"], ["Inès", "f"], ["Kevin", "m"], ["Sofiane", "m"], ["Jessica", "f"],
  ["Moussa", "m"], ["Fatou", "f"], ["Lucas", "m"], ["Yanis", "m"], ["Nadia", "f"],
  ["Dylan", "m"], ["Aïcha", "f"], ["Mehdi", "m"], ["Sarah", "f"], ["Bryan", "m"],
  ["Samia", "f"], ["Enzo", "m"], ["Lina", "f"], ["Ibrahim", "m"], ["Chloé", "f"],
  ["Rayan", "m"], ["Océane", "f"], ["Bilal", "m"], ["Manon", "f"], ["Amadou", "m"],
  ["Yasmine", "f"], ["Théo", "m"], ["Kenza", "f"], ["Nassim", "m"], ["Laura", "f"],
  ["Adama", "m"], ["Mélissa", "f"], ["Hugo", "m"], ["Djeneba", "f"], ["Ilyes", "m"],
  ["Sabrina", "f"], ["Jordan", "m"], ["Maëlys", "f"], ["Wassim", "m"], ["Awa", "f"],
  ["Mathis", "m"], ["Salomé", "f"], ["Rachid", "m"], ["Nora", "f"], ["Eren", "m"],
  ["Hichem", "m"], ["Françoise", "f"], ["Loïc", "m"], ["Anaïs", "f"], ["Samir", "m"],
];

export const PEAUX = ["#f6d5b8", "#e8b48a", "#c98a5a", "#9a5f37", "#6b3f22"];
export const CHEVEUX = ["#1d1a16", "#3b2416", "#6b4423", "#b5651d", "#e0c068", "#8a8a8a"];
export const TENUES = ["#e63946", "#457b9d", "#2a9d8f", "#f4a261", "#8338ec", "#ffbe0b", "#fb5607", "#3a86ff", "#06d6a0", "#ef476f"];

// ---- Le Fil ----

// {nom} auteur, {voisin} autre habitant, {commerce} un commerce de la tour,
// {etage} un numéro d'étage.
export const POSTS_AMBIANCE = [
  "Qui a encore bloqué l'ascenseur au {etage}e ??? 😤",
  "Quelqu'un a vu mon colis ? Le livreur dit qu'il l'a « déposé dans le hall » 🙄",
  "Le {commerce} au {etage}e c'est une dinguerie franchement",
  "{voisin} si tu lis ça rends-moi mon chargeur",
  "Réunion des locataires jeudi 18 h. Venez nombreux (on sera 3)",
  "Y'a une odeur de frites dans toute la cage d'escalier, je valide",
  "Ascenseur en panne... ah non c'est bon il redémarre",
  "Le wifi du {etage}e il est à qui ? Mot de passe svp 🙏",
  "Big up au gardien qui a réparé la porte du hall 👏",
  "Je cherche quelqu'un pour garder mon chat ce week-end 🐈",
  "Qui fait du bruit à 3 h du mat au-dessus de chez moi ??",
  "Match de foot en bas à 17 h, ramenez un ballon qui est gonflé cette fois",
  "Vue de ouf depuis le toit ce soir 🌇",
  "{voisin} t'as oublié ton linge à la laverie depuis 4 jours frérot",
  "La tour elle grandit trop vite, bientôt on voit la mer",
  "Quelqu'un a des œufs ? J'fais des crêpes 🥞",
  "C'est qui qui a tagué « {voisin} ❤️ » dans l'ascenseur ?",
  "Anniversaire de ma mère samedi, tout l'immeuble est invité (vraiment)",
];

export const POSTS_EMMENAGE = [
  "Premier jour à la Cité Petit Prince. Les voisins ont l'air sympas 👋",
  "Cartons déballés ! Enfin chez moi 📦",
  "Nouvel appart au {etage}e, la vue est pas mal du tout",
];

export const POSTS_EMBAUCHE = [
  "Je commence au {commerce} demain 💼",
  "Nouveau taf au {commerce} ! Venez me voir 😎",
  "Embauché(e) au {commerce}, la daronne est fière",
];

export const POSTS_REVE = [
  "JE BOSSE ENFIN AU {commerce} !!! C'était mon rêve depuis petit 😭✨",
  "Le {commerce}, c'était ÇA mon destin. Merci la cité 🙏",
];

export const POSTS_OUVERTURE = [
  "Un {commerce} vient d'ouvrir au {etage}e ! Qui teste avec moi ?",
  "Enfin un {commerce} dans la tour, on n'a plus besoin de sortir 😂",
];

export const POSTS_RUPTURE = [
  "Plus de « {produit} » au {commerce}... sérieux ? 😩",
  "Rupture de « {produit} » au {commerce}, je suis dégoûté(e)",
];
