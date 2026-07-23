export interface Item {
  id: string;
  nom: string;
  photo: string;
  prix: number;
}

const BASE = import.meta.env.BASE_URL;

export const ITEMS: Item[] = [
  {
    id: "ticket-metro-paris",
    nom: "Un ticket de métro à l'unité, à Paris",
    photo: `${BASE}photos/ca-coute-combien/ticket-metro-paris.webp`,
    prix: 2.15,
  },
  {
    id: "pizza-napoli",
    nom: "Une pizza margherita dans une pizzeria historique de Naples",
    photo: `${BASE}photos/ca-coute-combien/pizza-napoli.webp`,
    prix: 5,
  },
  {
    id: "big-mac",
    nom: "Un Big Mac, menu solo, en France",
    photo: `${BASE}photos/ca-coute-combien/big-mac.webp`,
    prix: 5.9,
  },
  {
    id: "cabane-arbre",
    nom: "Une nuit dans une cabane perchée dans les arbres",
    photo: `${BASE}photos/ca-coute-combien/cabane-arbre.webp`,
    prix: 180,
  },
  {
    id: "san-marco-cafe",
    nom: "Un café en terrasse sur la Piazza San Marco, à Venise",
    photo: `${BASE}photos/ca-coute-combien/san-marco-cafe.webp`,
    prix: 13,
  },
  {
    id: "icehotel",
    nom: "Une nuit dans une chambre de glace à l'Icehotel, en Suède",
    photo: `${BASE}photos/ca-coute-combien/icehotel.webp`,
    prix: 400,
  },
  {
    id: "monaco-gp-tribune",
    nom: "Une place en tribune pour les 3 jours du Grand Prix de Monaco",
    photo: `${BASE}photos/ca-coute-combien/monaco-gp-tribune.webp`,
    prix: 990,
  },
  {
    id: "truffe-alba",
    nom: "Une truffe blanche d'Alba, les 100 grammes en pleine saison",
    photo: `${BASE}photos/ca-coute-combien/truffe-alba.webp`,
    prix: 450,
  },
  {
    id: "burj-al-arab",
    nom: "Une nuit dans la suite la moins chère du Burj Al Arab, à Dubaï",
    photo: `${BASE}photos/ca-coute-combien/burj-al-arab.webp`,
    prix: 1900,
  },
  {
    id: "yacht-saint-tropez",
    nom: "Une journée de location d'un yacht à Saint-Tropez",
    photo: `${BASE}photos/ca-coute-combien/yacht-saint-tropez.webp`,
    prix: 3500,
  },
  {
    id: "ticket-eiffel-sommet",
    nom: "Un billet pour le sommet de la Tour Eiffel, à Paris",
    photo: `${BASE}photos/ca-coute-combien/ticket-eiffel-sommet.webp`,
    prix: 28.3,
  },
  {
    id: "boeuf-kobe",
    nom: "Une portion de bœuf de Kobe (200 g), au restaurant",
    photo: `${BASE}photos/ca-coute-combien/boeuf-kobe.webp`,
    prix: 180,
  },
  {
    id: "capsule-hotel-tokyo",
    nom: "Une nuit dans une capsule, dans un capsule hotel à Tokyo",
    photo: `${BASE}photos/ca-coute-combien/capsule-hotel-tokyo.webp`,
    prix: 35,
  },
  {
    id: "gondole-venise",
    nom: "Un tour en gondole à Venise (30 minutes)",
    photo: `${BASE}photos/ca-coute-combien/gondole-venise.webp`,
    prix: 90,
  },
  {
    id: "lego-minifigure",
    nom: "Une figurine Lego collector, à l'unité",
    photo: `${BASE}photos/ca-coute-combien/lego-minifigure.webp`,
    prix: 5,
  },
  {
    id: "champagne-dom-perignon",
    nom: "Une bouteille de champagne Dom Pérignon",
    photo: `${BASE}photos/ca-coute-combien/champagne-dom-perignon.webp`,
    prix: 190,
  },
  {
    id: "wimbledon-centre-court",
    nom: "Un billet en tribune pour un après-midi au Centre Court de Wimbledon",
    photo: `${BASE}photos/ca-coute-combien/wimbledon-centre-court.webp`,
    prix: 200,
  },
  {
    id: "montgolfiere-cappadoce",
    nom: "Un vol en montgolfière au lever du soleil, en Cappadoce",
    photo: `${BASE}photos/ca-coute-combien/montgolfiere-cappadoce.webp`,
    prix: 180,
  },
  {
    id: "rolex-submariner",
    nom: "Une montre Rolex Submariner, neuve en boutique",
    photo: `${BASE}photos/ca-coute-combien/rolex-submariner.webp`,
    prix: 9200,
  },
  {
    id: "colisee-rome",
    nom: "Un billet d'entrée au Colisée, à Rome",
    photo: `${BASE}photos/ca-coute-combien/colisee-rome.webp`,
    prix: 18,
  },
  {
    id: "huitres-brasserie",
    nom: "Une douzaine d'huîtres, au comptoir d'une brasserie parisienne",
    photo: `${BASE}photos/ca-coute-combien/huitres-brasserie.webp`,
    prix: 24,
  },
  {
    id: "louvre-pyramide",
    nom: "Un billet d'entrée au musée du Louvre, à Paris",
    photo: `${BASE}photos/ca-coute-combien/louvre-pyramide.webp`,
    prix: 22,
  },
  {
    id: "helico-manhattan",
    nom: "Un tour en hélicoptère de 15 minutes au-dessus de Manhattan",
    photo: `${BASE}photos/ca-coute-combien/helico-manhattan.webp`,
    prix: 230,
  },
  {
    id: "cronut-nyc",
    nom: "Un cronut, à la boulangerie originale de New York",
    photo: `${BASE}photos/ca-coute-combien/cronut-nyc.webp`,
    prix: 6.5,
  },
  {
    id: "sneakers-air-jordan",
    nom: "Une paire de sneakers Air Jordan 1, prix boutique",
    photo: `${BASE}photos/ca-coute-combien/sneakers-air-jordan.webp`,
    prix: 180,
  },
];
