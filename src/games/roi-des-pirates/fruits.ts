import type { Fruit, FruitType } from "./types";

export const FRUITS: Fruit[] = [
  // Zoan
  { id: "neko-tigre", nom: "Neko Neko no Mi, modèle Tigre", type: "Zoan", description: "Tu bondis plus vite que l'œil ne suit, toutes griffes dehors.", effects: { force: 25, notoriete: 5, fruitDuDemon: 15 } },
  { id: "inu-loup", nom: "Inu Inu no Mi, modèle Loup", type: "Zoan", description: "Un instinct de meute s'éveille en toi — tu ne marches plus jamais vraiment seul.", effects: { force: 18, equipage: 10, fruitDuDemon: 15 } },
  { id: "tori-faucon", nom: "Tori Tori no Mi, modèle Faucon", type: "Zoan", description: "Le ciel t'appartient un peu, et les rumeurs sur toi voyagent aussi vite que tes ailes.", effects: { force: 15, notoriete: 10, fruitDuDemon: 15 } },
  { id: "uma-cheval", nom: "Uma Uma no Mi, modèle Cheval", type: "Zoan", description: "Increvable, tu portes ton équipage plus loin que la logique ne l'autorise.", effects: { force: 12, equipage: 8, fruitDuDemon: 12 } },
  { id: "kuma-ours", nom: "Kuma Kuma no Mi, modèle Ours", type: "Zoan", description: "Une force brute, presque effrayante — certains hésitent avant de dormir dans la cale voisine.", effects: { force: 30, equipage: -5, fruitDuDemon: 18 } },
  { id: "same-requin", nom: "Same Same no Mi, modèle Requin", type: "Zoan", description: "Tes dents s'allongent, ta morsure devient une légende de marché aux poissons.", effects: { force: 20, fruitDuDemon: 18 } },
  { id: "ryu-dragon", nom: "Ryu Ryu no Mi, modèle Dragon Antique", type: "Zoan", description: "Un pouvoir venu d'avant les cartes marines — rarissime, terrassant.", effects: { force: 35, notoriete: 20, fruitDuDemon: 25 } },
  { id: "zou-elephant", nom: "Zou Zou no Mi, modèle Éléphant", type: "Zoan", description: "Ton pas fait trembler les pontons ; ton bateau, lui, grince sous le poids.", effects: { force: 28, equipage: -10, fruitDuDemon: 16 } },
  { id: "hebi-vipere", nom: "Hebi Hebi no Mi, modèle Vipère", type: "Zoan", description: "Un venin dans les crocs, une réputation qui précède désormais chacun de tes pas.", effects: { force: 15, notoriete: 8, fruitDuDemon: 14 } },
  { id: "oni-demon", nom: "Oni Oni no Mi, modèle Démon Antique", type: "Zoan", description: "Des cornes, un rictus, et des marins qui se signent en te croisant.", effects: { force: 32, notoriete: 15, fruitDuDemon: 20 } },

  // Paramecia
  { id: "bane-ressort", nom: "Bane Bane no Mi", type: "Paramecia", description: "Tes membres se détendent comme des ressorts — pratique pour frapper, pratique pour rire un peu de toi-même.", effects: { force: 15, equipage: 5, fruitDuDemon: 6 } },
  { id: "doku-poison", nom: "Doku Doku no Mi", type: "Paramecia", description: "Tu sécrètes des poisons qu'aucun docteur de ces mers ne sait nommer.", effects: { force: 20, notoriete: 15, fruitDuDemon: 10 } },
  { id: "kilo-poids", nom: "Kilo Kilo no Mi", type: "Paramecia", description: "De plume à enclume à volonté — utile pour surprendre, encore plus pour t'échapper.", effects: { force: 10, equipage: 5, fruitDuDemon: 6 } },
  { id: "toge-epines", nom: "Toge Toge no Mi", type: "Paramecia", description: "Ta peau se hérisse de pointes — les embrassades, désormais, se font à distance.", effects: { force: 18, fruitDuDemon: 8 } },
  { id: "awa-bulles", nom: "Awa Awa no Mi", type: "Paramecia", description: "Tu peux laver la force d'un ennemi comme on récure un pont — un pouvoir qu'on sous-estime toujours trop tard.", effects: { equipage: 15, notoriete: 5, fruitDuDemon: 8 } },
  { id: "nikyu-coussin", nom: "Nikyu Nikyu no Mi", type: "Paramecia", description: "Tu repousses tout ce qui t'approche, y compris — parfois — ceux qui voudraient rester.", effects: { force: 25, equipage: -10, fruitDuDemon: 12 } },
  { id: "ope-ope", nom: "Ope Ope no Mi", type: "Paramecia", description: "Le fruit du Chirurgien de la Mort — le plus recherché des mers, dit capable de vendre jusqu'à l'immortalité.", effects: { notoriete: 30, force: 5, fruitDuDemon: 15 } },
  { id: "bari-barriere", nom: "Bari Bari no Mi", type: "Paramecia", description: "Des murs invisibles jaillissent de tes mains — ton équipage dort mieux la nuit, en mer hostile.", effects: { force: 15, equipage: 10, fruitDuDemon: 10 } },
  { id: "horo-fantome", nom: "Horo Horo no Mi", type: "Paramecia", description: "Des fantômes qui volent la volonté d'un adversaire d'un seul regard triste.", effects: { force: 10, notoriete: 10, fruitDuDemon: 10 } },
  { id: "doru-cire", nom: "Doru Doru no Mi", type: "Paramecia", description: "Tu sculptes la cire plus dure que l'acier — pratique pour un pont, une arme, ou une couronne improvisée.", effects: { force: 12, equipage: 8, fruitDuDemon: 8 } },

  // Logia
  { id: "mera-feu", nom: "Mera Mera no Mi", type: "Logia", description: "Ton corps devient flamme — les Marines racontent déjà des histoires à ton sujet, autour du feu, ironiquement.", effects: { force: 30, notoriete: 20, fruitDuDemon: 22 } },
  { id: "hie-glace", nom: "Hie Hie no Mi", type: "Logia", description: "Un froid absolu qui fige la mer elle-même sous tes pas.", effects: { force: 28, notoriete: 18, fruitDuDemon: 22 } },
  { id: "suna-sable", nom: "Suna Suna no Mi", type: "Logia", description: "Tu deviens désert — insaisissable, asséchant tout ce qui t'entoure.", effects: { force: 25, notoriete: 15, fruitDuDemon: 20 } },
  { id: "goro-foudre", nom: "Goro Goro no Mi", type: "Logia", description: "La foudre elle-même t'obéit — on dit que c'est le plus puissant des Logia, et pour une fois ce n'est pas exagéré.", effects: { force: 35, notoriete: 25, fruitDuDemon: 28 } },
  { id: "yami-tenebres", nom: "Yami Yami no Mi", type: "Logia", description: "Les ténèbres avalent tout, même les autres pouvoirs — une malédiction en plus de la malédiction, et une solitude que peu supportent.", effects: { force: 30, notoriete: 10, equipage: -15, fruitDuDemon: 25 } },
  { id: "moku-fumee", nom: "Moku Moku no Mi", type: "Logia", description: "Tu te disperses en fumée avant même que le coup ne parte.", effects: { force: 20, notoriete: 12, fruitDuDemon: 18 } },
  { id: "numa-marais", nom: "Numa Numa no Mi", type: "Logia", description: "Un marécage vivant qui engloutit lentement tout ce qui s'y aventure — y compris, parfois, tes propres bottes.", effects: { force: 18, equipage: -5, fruitDuDemon: 16 } },
  { id: "pika-lumiere", nom: "Pika Pika no Mi", type: "Logia", description: "Tu te déplaces à la vitesse de la lumière — littéralement, ce qui rend les duels plutôt courts.", effects: { force: 32, notoriete: 20, fruitDuDemon: 26 } },
  { id: "magu-magma", nom: "Magu Magu no Mi", type: "Logia", description: "Un pouvoir qui fait fondre jusqu'au feu lui-même — le sommet de la hiérarchie des Logia.", effects: { force: 35, notoriete: 22, fruitDuDemon: 28 } },
  { id: "gasu-gaz", nom: "Gasu Gasu no Mi", type: "Logia", description: "Un nuage toxique et volatile — difficile à combattre, encore plus difficile à respirer.", effects: { force: 22, notoriete: 10, fruitDuDemon: 18 } },
];

export function pickRandomFruit(type?: FruitType, rng: () => number = Math.random): Fruit {
  const pool = type ? FRUITS.filter((f) => f.type === type) : FRUITS;
  return pool[Math.floor(rng() * pool.length)];
}

export function revealsFruit(flags: Set<string>, fruit: Fruit): boolean {
  if (flags.has("compagnon-connaisseur")) return true;
  if (flags.has("origine-noble") && fruit.type === "Paramecia") return true;
  return false;
}

export function findEatenFruit(flags: Set<string>): Fruit | undefined {
  for (const flag of flags) {
    if (flag.startsWith("fruit-")) {
      const found = FRUITS.find((f) => f.id === flag.slice("fruit-".length));
      if (found) return found;
    }
  }
  return undefined;
}
