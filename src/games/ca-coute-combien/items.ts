export interface Item {
  id: string;
  nom: string;
  photo: string;
  prix: number;
}

export const ITEMS: Item[] = [
  {
    id: "ticket-metro-paris",
    nom: "Un ticket de métro à l'unité, à Paris",
    photo: "/photos/ca-coute-combien/ticket-metro-paris.webp",
    prix: 2.15,
  },
  {
    id: "pizza-napoli",
    nom: "Une pizza margherita dans une pizzeria historique de Naples",
    photo: "/photos/ca-coute-combien/pizza-napoli.webp",
    prix: 5,
  },
  {
    id: "big-mac",
    nom: "Un Big Mac, menu solo, en France",
    photo: "/photos/ca-coute-combien/big-mac.webp",
    prix: 5.9,
  },
  {
    id: "cabane-arbre",
    nom: "Une nuit dans une cabane perchée dans les arbres",
    photo: "/photos/ca-coute-combien/cabane-arbre.webp",
    prix: 180,
  },
  {
    id: "san-marco-cafe",
    nom: "Un café en terrasse sur la Piazza San Marco, à Venise",
    photo: "/photos/ca-coute-combien/san-marco-cafe.webp",
    prix: 13,
  },
  {
    id: "icehotel",
    nom: "Une nuit dans une chambre de glace à l'Icehotel, en Suède",
    photo: "/photos/ca-coute-combien/icehotel.webp",
    prix: 400,
  },
  {
    id: "monaco-gp-tribune",
    nom: "Une place en tribune pour les 3 jours du Grand Prix de Monaco",
    photo: "/photos/ca-coute-combien/monaco-gp-tribune.webp",
    prix: 990,
  },
  {
    id: "truffe-alba",
    nom: "Une truffe blanche d'Alba, les 100 grammes en pleine saison",
    photo: "/photos/ca-coute-combien/truffe-alba.webp",
    prix: 450,
  },
  {
    id: "burj-al-arab",
    nom: "Une nuit dans la suite la moins chère du Burj Al Arab, à Dubaï",
    photo: "/photos/ca-coute-combien/burj-al-arab.webp",
    prix: 1900,
  },
  {
    id: "yacht-saint-tropez",
    nom: "Une journée de location d'un yacht à Saint-Tropez",
    photo: "/photos/ca-coute-combien/yacht-saint-tropez.webp",
    prix: 3500,
  },
];
