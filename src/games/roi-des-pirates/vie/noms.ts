// Prénoms, noms et îles générés, à la manière des noms de One Piece :
// un mélange de sonorités européennes, avec Wano, le ciel, les géants et
// les Minks à part.

import type { Peuple, Sexe, Zone } from "./types.ts";
import { parmi } from "./rng.ts";

type Culture = "commun" | "wano" | "geant" | "mink" | "ciel" | "mer";

const PRENOMS: Record<Culture, { h: string[]; f: string[] }> = {
  commun: {
    h: ["Bastien", "Hugo", "Marlo", "Teodor", "Lukas", "Bram", "Corin", "Elio", "Gaspard", "Jonas", "Kael", "Léandre", "Milo", "Nils", "Oskar", "Pablo", "Quentin", "Rafael", "Silas", "Tobias", "Ugo", "Victor", "Wes", "Yanis", "Zeno", "Anselme", "Barto", "Cyprien", "Dario", "Edgar", "Fabio", "Gunnar", "Hector", "Ivo", "Joris", "Kenzo", "Lazare", "Mattéo", "Nico", "Otto", "Pepe", "Rocco", "Sven", "Thibo", "Vasco", "Wolfgang", "Alonzo", "Benno", "Carlo", "Django", "Emil", "Felix", "Gino", "Henk", "Igor", "Jasper", "Lino", "Morgan", "Noé", "Orson", "Piotr", "Remy", "Sacha", "Tristan", "Ulric", "Valentin", "Yorick", "Zack"],
    f: ["Lina", "Maeva", "Nora", "Olga", "Perle", "Rosa", "Sola", "Tessa", "Uma", "Vera", "Wanda", "Yuna", "Zoé", "Ada", "Bianca", "Clara", "Dora", "Elsa", "Flora", "Gemma", "Hilde", "Iris", "Jade", "Kira", "Léna", "Margot", "Nina", "Odile", "Paola", "Rita", "Selma", "Thea", "Ulla", "Vida", "Alma", "Berthe", "Carmen", "Della", "Erna", "Frida", "Greta", "Hanna", "Ilse", "Jolene", "Katia", "Lotte", "Mila", "Nadia", "Ophélie", "Pia", "Romy", "Sienna", "Tilda", "Valma", "Wilma", "Ysé", "Zelda", "Aurore", "Bella", "Coline", "Daria", "Esmé", "Fanny", "Gloria", "Hélène", "Inès", "Josefa", "Lou", "Mira"],
  },
  wano: {
    h: ["Kintaro", "Gonzo", "Hyogo", "Isuke", "Jubei", "Kanjuro", "Matsu", "Noboru", "Oboro", "Rokuro", "Sanji-maru", "Tatsuo", "Ushimaru", "Yasuie", "Zenkichi", "Goemon", "Hanzo", "Ichizo", "Kotaro", "Shinsuke"],
    f: ["Akane", "Chiyo", "Fuku", "Hana", "Ise", "Kiku", "Matsuko", "Natsu", "O-Sen", "O-Kame", "Rin", "Sayo", "Tsuru", "Ume", "Yuki", "O-Toku", "Komachi", "Kurenai", "Shino", "Haru"],
  },
  geant: {
    h: ["Brogar", "Dagmund", "Eirik", "Gerd", "Halvard", "Ingvar", "Jarl", "Knut", "Olaf", "Ragnar", "Sigurd", "Torvald", "Ulf", "Vidar", "Yngve"],
    f: ["Astrid", "Brynja", "Dagny", "Eira", "Freya", "Gudrun", "Hilda", "Ingrid", "Ragna", "Sigrid", "Solveig", "Thora", "Ylva", "Runa", "Kelda"],
  },
  mink: {
    h: ["Bepomir", "Carro", "Dorio", "Fennec", "Grizz", "Hazel", "Inuro", "Kotsu", "Lupo", "Mokko", "Pekon", "Ruffo", "Tasso", "Vulpo", "Zorro"],
    f: ["Belle", "Caramel", "Fiora", "Kiri", "Lapine", "Moka", "Nyala", "Perrine", "Rikka", "Sylka", "Tilly", "Wanda", "Yumi", "Zibeline", "Pomme"],
  },
  ciel: {
    h: ["Aisu", "Braham", "Conis-o", "Gedatsu-no", "Kamaki", "Laki-o", "Pagaya-no", "Satori-no", "Wyper-no", "Ohmu-no", "Seto", "Kalgo", "Upa", "Noro", "Hira"],
    f: ["Aisa", "Conis", "Laki", "Mira", "Nola", "Pia", "Sora", "Tali", "Yuna", "Kiri", "Hana", "Lula", "Sayla", "Mio", "Ena"],
  },
  mer: {
    h: ["Hachi", "Kuroobi", "Maki", "Zeo", "Ikaros", "Wadatsu", "Dosun", "Hyozo", "Ryuboshi", "Fukaboshi", "Sharko", "Tarao", "Kelp", "Ankou", "Umi"],
    f: ["Camie", "Madame", "Ishilly", "Shyarly", "Kairen", "Mero", "Sora", "Naiara", "Ondine", "Perla", "Coralie", "Marina", "Sirena", "Lagune", "Ama"],
  },
};

const NOMS: Record<Culture, string[]> = {
  commun: ["Marlowe", "Brindel", "Coste", "Dalgren", "Esparza", "Ferrol", "Galdo", "Hendrix", "Ivarsen", "Jansky", "Kroll", "Lazzaro", "Morvan", "Nordin", "Orsini", "Palmer", "Quarto", "Rosso", "Salvo", "Tarrant", "Ulmer", "Varga", "Wexley", "Yarrow", "Zorin", "Abello", "Barrow", "Calder", "Drake", "Estrada", "Fenwick", "Grimaldi", "Holm", "Iseult", "Jarvis", "Kestrel", "Lindqvist", "Mancuso", "Navarre", "Ostrava", "Pelletier", "Ruggiero", "Sandoval", "Toscano", "Underhill", "Vasquez", "Wolfe", "Bellamar", "Corvino", "Delacroix", "Fairbanks", "Gallo", "Harker", "Ironside", "Lamarck", "Mirabel", "Noceda", "Pike", "Rackham", "Saltz", "Thorne", "Valdez", "Winslow"],
  wano: ["Kurozumi", "Shimotsuki", "Kazenbo", "Hitetsu", "Kawamatsu", "Tenguyama", "Inuarashi", "Ashura", "Kyoshiro", "Yamato", "Kikunojo", "Raizo", "Denjiro", "Hyogoro", "Tonoyasu"],
  geant: ["fils d'Harald", "fille de Jarul", "de la Forêt d'Elbaf", "le Grand", "de l'Arbre-Monde", "fils de Brog", "fille de Dorri", "du Fjord Rouge"],
  mink: ["de la Forêt de la Baleine", "du Mokomo", "de Zou", "aux Longues Oreilles", "le Garde", "du Clan des Griffes"],
  ciel: ["de l'île des Anges", "de Shandora", "des Nuages Blancs", "de la Mer Blanche", "du Cloud End"],
  mer: ["de la Crique des Sirènes", "du Quartier des Poissons", "de Ryugu", "de la Forêt Marine", "des Récifs", "de Noah"],
};

const SURNOMS = ["le Rouge", "aux Mille Cicatrices", "le Silencieux", "la Tempête", "Œil-de-Lynx", "le Rieur", "Main-de-Fer", "le Revenant", "la Marée", "le Chanceux", "aux Pieds Nus", "le Têtu", "la Brûlure", "le Fou", "Dent-de-Requin", "le Sans-Nom", "la Lame", "le Corbeau", "Bras-de-Pierre", "l'Ombre"];

const ILES_ANONYMES = ["Kalmo", "Rivelle", "Tormund", "Salicorne", "Brumaire", "Oyster", "Cormoran", "Pelican", "Gourde", "Hautvent", "Lagan", "Mistral", "Noirmoutre", "Ostende", "Pointe-Sel", "Ressac", "Sargasse", "Tamaris", "Varech", "Writtle", "Ambre", "Bigorneau", "Calanque", "Durance", "Écume", "Falaise", "Goémon", "Houle", "Islette", "Jusant", "Kelpie", "Lanterne", "Mouette", "Nacre", "Orque", "Phare-Blanc", "Quille", "Roche-Grise", "Saumure", "Tribord", "Vigie", "Pommeraie", "Cannelle", "Laurier", "Cendre", "Coquille", "Corail", "Étoile-de-Mer", "Fanal", "Grève"];

function culture(peuple: Peuple, zone: Zone): Culture {
  if (peuple === "geant") return "geant";
  if (peuple === "mink") return "mink";
  if (peuple === "skypieen" || peuple === "shandia") return "ciel";
  if (peuple === "homme-poisson" || peuple === "sirene") return "mer";
  if (zone === "wano") return "wano";
  return "commun";
}

export function prenom(rng: () => number, sexe: Sexe, peuple: Peuple = "humain", zone: Zone = "east-blue"): string {
  return parmi(rng, PRENOMS[culture(peuple, zone)][sexe]);
}

export function nomDeFamille(rng: () => number, peuple: Peuple = "humain", zone: Zone = "east-blue"): string {
  return parmi(rng, NOMS[culture(peuple, zone)]);
}

export function surnom(rng: () => number): string {
  return parmi(rng, SURNOMS);
}

export function nomIleAnonyme(rng: () => number, zone: Zone): string {
  const base = parmi(rng, ILES_ANONYMES);
  const de = /^[AEIOUYÉÈ]/.test(base) ? `d'${base}` : `de ${base}`;
  const forme = rng();
  if (zone === "north-blue" && forme < 0.3) return `le royaume ${de}`;
  if (forme < 0.45) return `l'île ${de}`;
  if (forme < 0.7) return `le village ${de}`;
  if (forme < 0.85) return `${base}-sur-Mer`;
  return `le port de ${base}`;
}

/** « Bastien Marlowe », ou « Hachi » pour les peuples sans nom de famille à la mode humaine. */
export function nomComplet(prenomTexte: string, famille: string, d: boolean): string {
  if (/^(de |du |des |fils |fille |le |la |aux )/.test(famille)) return `${prenomTexte} ${famille}`;
  return d ? `${famille} D. ${prenomTexte}` : `${prenomTexte} ${famille}`;
}
