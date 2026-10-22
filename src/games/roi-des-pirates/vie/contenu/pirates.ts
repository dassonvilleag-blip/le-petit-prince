// Contenu « pirates » — voir README.md pour le format et les conventions.
// La vie de pirate, de l'entrée à la sortie : partir, monter à bord, survivre
// aux mers, fonder son équipage, voir sa prime grimper, frôler les sommets,
// puis poser le sac (ou ne jamais le poser).

import type { Condition, Evenement, Metier, Mort, Rencontre, Zone } from "../types.ts";

// ── Outils ──

const BLUES: Zone[] = ["east-blue", "west-blue", "north-blue", "south-blue"];

/** Un pirate en activité : ni en prison, ni à la retraite, ni invalide. */
function actif(c: Condition = {}): Condition {
  return { ...c, camp: ["pirate"], pasFlags: ["prisonnier", "retraite", "invalide", ...(c.pasFlags ?? [])] };
}

/** Un civil libre, qui pourrait partir. Wano fermé, Impel Down et Marie-Joie exclus. */
function partant(c: Condition = {}): Condition {
  return {
    ...c,
    camp: c.camp ?? ["civil"],
    pasZone: ["impel-down", "red-line", ...(c.pasZone ?? [])],
    pasFlags: ["prisonnier", "retraite", "invalide", ...(c.pasFlags ?? [])],
    non: { zone: ["wano"], annee: [1504, 1523] },
  };
}

/** Un ancien pirate qui a posé le sac. */
function ancien(c: Condition = {}): Condition {
  return { ...c, flags: ["camp:pirate", "retraite", ...(c.flags ?? [])], pasFlags: ["prisonnier", ...(c.pasFlags ?? [])] };
}

const ENTREE = { flags: ["en-mer", "a-quitte-son-ile"] };

// ── Les personnages croisés ──

export const rencontres: Rencontre[] = [
  { id: "roger", nom: "Gol D. Roger", description: "Le Roi des Pirates. Sa mort a ouvert la Grande Ère." },
  { id: "rayleigh", nom: "Silvers Rayleigh", description: "Le bras droit de Roger, qui pose du coating à Sabaody." },
  { id: "shanks", nom: "Shanks le Roux", description: "Ancien mousse de Roger, devenu Empereur. Un bras, un chapeau prêté." },
  { id: "buggy", nom: "Baggy le Clown", description: "Ancien mousse de Roger, roi du malentendu, et de l'esbroufe." },
  { id: "barbe-blanche", nom: "Edward Newgate, Barbe Blanche", description: "L'homme le plus fort du monde, qui appelait ses hommes « mes fils »." },
  { id: "marco", nom: "Marco le Phénix", description: "Premier commandant de Barbe Blanche, aux flammes bleues qui soignent." },
  { id: "ace", nom: "Portgas D. Ace", description: "Deuxième commandant de Barbe Blanche, le fils de l'homme qu'on a pendu." },
  { id: "barbe-noire", nom: "Marshall D. Teach, Barbe Noire", description: "Le rire « Zehahaha », la patience d'un serpent, deux fruits." },
  { id: "kaido", nom: "Kaido aux Cent Bêtes", description: "La créature la plus forte du monde, dit-on. Il voulait mourir et n'y arrivait pas." },
  { id: "big-mom", nom: "Charlotte Linlin, Big Mom", description: "L'Empereur des gâteaux, qui exige des bonbons ou des vies." },
  { id: "rocks", nom: "Rocks D. Xebec", description: "Le capitaine d'un équipage de monstres, effacé de l'Histoire après God Valley." },
  { id: "shiki", nom: "Shiki le Lion d'or", description: "Le pirate des îles volantes, premier évadé d'Impel Down." },
  { id: "crocodile", nom: "Crocodile", description: "Grand Corsaire, maître secret d'une agence de chasseurs numérotés." },
  { id: "mihawk", nom: "Dracule Mihawk", description: "Le meilleur épéiste du monde, un chapeau à plume, un sabre noir." },
  { id: "kuma", nom: "Bartholomew Kuma", description: "Le tyran à la Bible, qui demandait où l'on voudrait partir en voyage." },
  { id: "moria", nom: "Gecko Moria", description: "Le Grand Corsaire qui volait les ombres, sur un navire-île du triangle de Florian." },
  { id: "doflamingo", nom: "Donquixote Doflamingo", description: "Le roi de Dressrosa, ses fils et ses jouets." },
  { id: "bellamy", nom: "Bellamy la Hyène", description: "Le pirate de Mock Town qui riait des rêveurs." },
  { id: "smoker", nom: "Smoker", description: "Le Marine aux deux cigares, chasseur de pirates à Loguetown." },
  { id: "zeff", nom: "Zeff au Pied Rouge", description: "Ancien capitaine pirate, chef du Baratie, une jambe de bois." },
  { id: "crocus", nom: "Crocus", description: "Le gardien du phare du Cap des Jumeaux, ancien médecin de bord de Roger." },
  { id: "laboon", nom: "Laboon", description: "La baleine qui attend ses amis au pied de Reverse Mountain." },
  { id: "shakky", nom: "Shakky", description: "La patronne d'un bar de Sabaody qui arnaque les pirates en souriant." },
  { id: "arlong", nom: "Arlong", description: "Le pirate Homme-Poisson qui a mis East Blue sous tribut." },
  { id: "jinbe", nom: "Jinbe", description: "Le paladin des mers, Grand Corsaire Homme-Poisson." },
  { id: "luffy", nom: "Monkey D. Luffy", description: "Un garçon au chapeau de paille qui veut devenir le Roi des Pirates." },
  { id: "zoro", nom: "Roronoa Zoro", description: "Un épéiste à trois sabres, sans aucun sens de l'orientation." },
  { id: "kizaru", nom: "Kizaru", description: "Amiral de la lumière, qui arrive toujours trop vite." },
  { id: "aokiji", nom: "Aokiji", description: "Amiral de la glace, qui gela une baie entière." },
  { id: "akainu", nom: "Akainu", description: "Amiral du magma, justice absolue." },
  { id: "dorry", nom: "Dorry", description: "Géant d'Elbaf, en duel depuis un siècle sur Little Garden." },
  { id: "brogy", nom: "Brogy", description: "L'autre géant de Little Garden, qui rit en se battant." },
  { id: "oden", nom: "Kozuki Oden", description: "Le seigneur samouraï qui navigua avec Barbe Blanche puis avec Roger." },
  { id: "law", nom: "Trafalgar Law", description: "Le Chirurgien de la mort, Supernova de North Blue." },
  { id: "kid", nom: "Eustass Kid", description: "Supernova de South Blue, la prime la plus haute de Sabaody." },
  { id: "hancock", nom: "Boa Hancock", description: "L'impératrice des Kuja, Grande Corsaire." },
  { id: "garp", nom: "Monkey D. Garp", description: "Le héros de la Marine, qui pourchassa Roger toute sa vie." },
];

export const morts: Mort[] = [
  { id: "mutinerie", libelle: "poignardé{/e} par les siens, une nuit de mutinerie", categorie: "combat" },
  { id: "marineford", libelle: "dans la baie de Marineford, au milieu de la plus grande guerre du siècle", categorie: "combat" },
  { id: "god-valley", libelle: "à God Valley, le jour où une île entière fut rayée de la carte", categorie: "combat" },
  { id: "abordage", libelle: "pendant un abordage, entre deux navires qui brûlaient", categorie: "combat" },
];

// ── 1. Entrer dans la piraterie ──

const entrer: Evenement[] = [
  {
    id: "pir-recit-du-vieux-pirate",
    quand: partant({ age: [9, 24], pasFlags: ["reve-de-mer"] }),
    poids: 2,
    tension: 1,
    titre: "Le vieux du port",
    texte: [
      "Un vieil homme à l'œil crevé boit seul au fond de la taverne. Pour un verre, il raconte Grand Line : des îles qui flottent dans le ciel, une mer qui monte une montagne, un trésor au bout du monde.",
      "Sur le quai, un ancien pirate répare ses filets. Il vous parle d'une île où il pleut des bonbons et d'une autre où l'hiver ne finit jamais. Vous ne savez pas s'il ment. Vous voulez savoir.",
    ],
    choix: [
      { label: "L'écouter jusqu'à l'aube", effets: { flags: ["reve-de-mer"], jauges: { savoir: 2 } }, texte: "Le lendemain, la mer n'a plus la même couleur.", auto: 2 },
      { label: "Rentrer chez vous, ce sont des histoires", effets: { jauges: { equipage: 1 } }, texte: "Vous dormez bien. Presque." },
    ],
  },
  {
    id: "pir-fugue",
    quand: partant({ age: [14, 24], flags: ["reve-de-mer"], pasFlags: ["a-quitte-son-ile"] }),
    poids: 1.5,
    tension: 3,
    titre: "Le navire au pavillon noir",
    texte: "Un navire au pavillon noir mouille dans la baie pour la nuit. Ils embarquent de l'eau et repartent à l'aube. Personne ne vous retient vraiment, sauf vous.",
    bascule: true,
    choix: [
      {
        label: "Se cacher dans un tonneau de pommes",
        effets: { camp: "pirate", lien: { creer: "capitaine" }, ...ENTREE },
        texte: "On vous découvre au large, la bouche pleine. Le capitaine rit si fort qu'il en oublie de vous jeter par-dessus bord. Vous voilà mousse.",
      },
      { label: "Les regarder partir depuis la falaise", effets: { jauges: { savoir: 1 } }, texte: "Les voiles disparaissent. Vous restez longtemps, les pieds dans le vide." },
    ],
    clinOeil: { id: "pir-tonneau", ref: "Luffy qui surgit d'un tonneau sur le navire d'Alvida, au tout début de l'aventure.", arc: "Romance Dawn" },
  },
  {
    id: "pir-recrutement-taverne",
    quand: partant({ age: [16, 35], ileTag: ["port"] }),
    poids: 1,
    tension: 2,
    titre: "Une place à bord",
    texte: [
      "Un homme à la barbe tressée pose une bourse sur la table. « Il nous manque des bras. La paie est mauvaise, la nourriture pire, mais tu verras le monde. »",
      "Une capitaine aux bras couverts de cicatrices fait le tour de la taverne. Elle cherche quelqu'un qui sait tenir une corde et se taire. Elle s'arrête devant vous.",
    ],
    choix: [
      {
        label: "Signer de votre nom",
        effets: { camp: "pirate", lien: { creer: "capitaine" }, ...ENTREE },
        texte: "Vous apprenez le soir même que la paie, c'est surtout l'espoir de la paie.",
      },
      { label: "Finir votre verre et rentrer", texte: "Le navire part sans vous. Le lendemain, vous vous levez à l'heure, comme toujours.", auto: 4 },
    ],
  },
  {
    id: "pir-rafle",
    quand: partant({ age: [15, 22], ileTag: ["port", "village"], pasZone: ["fond-marin", "ciel"] }),
    poids: 1,
    tension: 4,
    titre: "La rafle",
    texte: "Ils sont arrivés de nuit. Les greniers vidés, les hommes valides poussés vers la plage, une corde aux poignets. Un pirate vous regarde : « Celui-là. Il a des bras. »",
    choix: [
      {
        label: "Tenter de fuir dans les rochers",
        test: {
          jauge: "chance",
          difficulte: 55,
          reussite: { texte: "Vous restez deux jours dans une grotte, à écouter la mer. Quand vous sortez, le navire est loin.", effets: { sante: -5 } },
          echec: {
            texte: "Un coup de crosse, puis la cale. Quand vous ouvrez les yeux, la terre n'est plus qu'une ligne.",
            effets: { camp: "pirate", lien: { creer: "capitaine" }, sante: -8, ...ENTREE },
          },
        },
      },
      {
        label: "Tendre les poignets",
        effets: { camp: "pirate", lien: { creer: "capitaine" }, ...ENTREE },
        texte: "Vous survivez. C'est tout ce qu'on peut dire de la première année.",
      },
    ],
  },
  {
    id: "pir-plus-rien-a-perdre",
    quand: partant({ age: [16, 40], unFlag: ["deuil:mere", "deuil:pere", "deuil:conjoint", "deuil:enfant", "deuil:frere"] }),
    poids: 1.5,
    tension: 3,
    titre: "Plus rien qui vous retienne",
    texte: "La maison est trop grande, maintenant. Au port, un équipage cherche du monde, et personne ne vous demande d'où vous venez. C'est peut-être ça, la liberté : n'avoir plus rien à perdre.",
    bascule: true,
    choix: [
      {
        label: "Embarquer",
        effets: { camp: "pirate", lien: { creer: "capitaine" }, ...ENTREE },
        texte: "Vous fermez la porte à clé, puis vous jetez la clé dans le port.",
      },
      { label: "Rester, pour ceux qui restent", effets: { jauges: { haki: 1, equipage: 2 } }, texte: "Vous restez. Le chagrin s'use moins vite quand on le partage.", auto: 2 },
    ],
  },
  {
    id: "pir-grande-ere",
    quand: partant({ age: [15, 40], annee: [1500, 1504] }),
    poids: 3,
    tension: 3,
    titre: "La ruée",
    texte: [
      "Il est mort en souriant, disent les journaux. Il a dit que son trésor était là-bas, qu'il suffisait d'aller le chercher. Sur chaque quai, des garçons et des filles achètent des barques.",
      "« Mon trésor ? Je vous le laisse. » Depuis cette phrase, les ports se vident. Même le boulanger a vendu son four pour une chaloupe.",
    ],
    choix: [
      {
        label: "Partir chercher le trésor",
        effets: { camp: "pirate", lien: { creer: "capitaine" }, ...ENTREE },
        texte: "Vous embarquez sur un navire où personne ne sait naviguer. Tout le monde rit. Vous aussi.",
      },
      { label: "Laisser les fous partir", texte: "Vous les regardez s'éloigner. La moitié reviendra dans l'année. L'autre moitié, jamais.", auto: 3 },
    ],
    clinOeil: { id: "pir-mon-tresor", ref: "Les derniers mots de Gol D. Roger sur l'échafaud de Loguetown, qui lancèrent la Grande Ère des Pirates.", arc: "Prologue" },
    rencontre: "roger",
  },
  {
    id: "pir-barque-seul",
    quand: partant({ age: [16, 26], un: [{ reve: ["roi-des-pirates"] }, { flags: ["reve-de-mer"], trait: ["rire-contagieux", "graine-du-roi"] }] }),
    poids: 2,
    tension: 4,
    titre: "Une barque, un rêve",
    texte: "Vous avez une barque, un tonneau de vivres et pas d'équipage. Tout le village est sur le quai. Personne ne croit que vous irez loin, à part vous.",
    bascule: true,
    choix: [
      {
        label: "Larguer les amarres",
        effets: {
          grade: "capitaine-pirate",
          flags: ["en-mer", "a-quitte-son-ile", "capitaine-de-son-equipage"],
          equipageNom: "l'équipage de {prenom}",
          navire: "une barque sans nom",
          jauges: { haki: 2 },
        },
        texte: "Vous criez à la terre que vous trouverez des compagnons. Un tourbillon manque de vous avaler le premier jour. Vous riez quand même.",
        auto: 1.5,
      },
      { label: "Attendre d'être prêt{/e}", effets: { jauges: { force: 2 } }, texte: "Vous rangez la barque. Il faudra encore un an. Ou dix." },
    ],
    clinOeil: { id: "pir-depart-en-barque", ref: "Luffy quittant Fuchsia seul dans une barque, avant de se faire avaler par un tourbillon.", arc: "Romance Dawn" },
  },
  {
    id: "pir-dette",
    quand: partant({ age: [16, 35], classe: ["pauvre", "hors-la-loi"] }),
    poids: 1.5,
    tension: 2,
    titre: "La dette",
    texte: "Vous devez de l'argent à un homme qui a un navire et peu de patience. Il propose un marché : trois ans à bord, et l'ardoise est effacée.",
    choix: [
      { label: "Accepter le marché", effets: { camp: "pirate", lien: { creer: "capitaine" }, ...ENTREE }, texte: "Trois ans, a-t-il dit. Personne n'a jamais vu quelqu'un descendre au bout de trois ans." },
      {
        label: "Rembourser autrement",
        test: {
          jauge: "savoir",
          difficulte: 25,
          reussite: { texte: "Vous trouvez de quoi payer, en vendant ce que vous auriez voulu garder.", effets: { jauges: { savoir: 1 } } },
          echec: { texte: "On vous retrouve. On vous casse deux doigts. Puis on vous emmène quand même.", effets: { camp: "pirate", lien: { creer: "capitaine" }, sante: -10, ...ENTREE } },
        },
      },
    ],
  },
  {
    id: "pir-repeche",
    quand: partant({ age: [15, 40], flags: ["en-mer"] }),
    poids: 1.5,
    tension: 3,
    titre: "Repêché{/e}",
    texte: "Votre navire a sombré. Deux jours accroché{/e} à une planche, puis une coque noire, une corde, des rires. Le capitaine vous offre une soupe et une question : « Tu travailles ou tu nages ? »",
    choix: [
      { label: "Travailler", effets: { camp: "pirate", lien: { creer: "capitaine" }, ...ENTREE }, texte: "Vous travaillez. On ne vous demande jamais si vous vouliez rester." },
      { label: "Demander qu'on vous dépose au prochain port", effets: { jauges: { equipage: 1 } }, texte: "Ils vous déposent. Ils vous prennent vos bottes pour le prix du voyage.", auto: 2 },
    ],
  },
  {
    id: "pir-famille-pirate",
    quand: partant({ age: [14, 22], classe: ["famille-pirate"] }),
    poids: 4,
    tension: 3,
    titre: "L'ancien équipage",
    texte: "Un navire que vous ne connaissez pas porte le pavillon de votre famille. Le vieux second descend, vous regarde longtemps. « Tu as ses yeux. Il y a ta place à bord, si tu la veux. »",
    choix: [
      { label: "Monter à bord", effets: { camp: "pirate", lien: { creer: "capitaine" }, jauges: { equipage: 3 }, ...ENTREE }, texte: "Le pont craque exactement comme dans les histoires qu'on vous racontait.", auto: 2 },
      { label: "Leur dire que ce n'est pas votre vie", effets: { jauges: { savoir: 1 } }, texte: "Le vieux hoche la tête. « Lui aussi disait ça. » Il remonte à bord sans se retourner." },
    ],
  },
];

/** Les métiers qu'un équipage réclame : on embarque directement comme officier. */
const METIERS_EMBARQUES: { metier: Metier; id: string; titre: string; texte: string; oui: string; clin?: Evenement["clinOeil"] }[] = [
  {
    metier: "cuisinier", id: "pir-cuisinier-embarque", titre: "Un équipage affamé",
    texte: "Un pirate s'effondre devant votre cuisine, les joues creuses. Vous le nourrissez sans lui demander de quoi payer. Une semaine plus tard, son capitaine revient : ils n'ont plus de cuisinier.",
    oui: "Vous embarquez vos couteaux et rien d'autre. Personne à bord n'aura plus jamais faim, vous l'avez juré.",
    clin: { id: "pir-nourrir-l-affame", ref: "Sanji qui nourrit Gin, le pirate affamé, à l'arrière du Baratie : « Personne ne doit mourir de faim. »", arc: "Baratie" },
  },
  {
    metier: "navigateur", id: "pir-navigateur-embarque", titre: "Le ciel qui change",
    texte: "Vous avez prédit la tempête une heure avant qu'elle n'éclate. Un capitaine qui vous a vu{/e} faire vous attend sur le quai. « Sans quelqu'un comme toi, on ne passera jamais Grand Line. »",
    oui: "Vous emportez vos cartes, vos crayons, et le baromètre de votre enfance.",
  },
  {
    metier: "medecin", id: "pir-medecin-embarque", titre: "Un médecin pour la route",
    texte: "Un pirate vous amène son capitaine, une balle dans le ventre. Vous le sauvez. En se réveillant, il vous demande de venir avec eux : sur la mer, il n'y a pas de médecin.",
    oui: "Vous fermez votre cabinet. Sur la porte, vous laissez un mot : « Parti{/e} soigner ceux que personne ne soigne. »",
    clin: { id: "pir-medecin-de-bord", ref: "Chopper qui quitte Drum en traîneau, sous les cerisiers que le docteur Hiluluk avait rêvés.", arc: "Drum" },
  },
  {
    metier: "charpentier", id: "pir-charpentier-embarque", titre: "Un navire qui fuit",
    texte: "Un navire pirate arrive dans votre chantier, la quille fendue. Vous le réparez mieux qu'il n'a jamais été. Le capitaine propose de vous emmener : un navire a besoin de quelqu'un qui l'aime.",
    oui: "Vous emportez vos outils et le marteau de votre maître. Le navire ne fuit plus.",
  },
  {
    metier: "musicien", id: "pir-musicien-embarque", titre: "Une chanson pour la route",
    texte: "Vous jouez sur le port quand un équipage entier se met à danser. Leur capitaine vous tend la main. « Un navire sans musique, c'est un cercueil qui flotte. »",
    oui: "Vous jouez sur le pont dès le premier soir. On vous demande la même chanson jusqu'à l'aube.",
  },
  {
    metier: "epeiste", id: "pir-epeiste-embarque", titre: "Un sabre à louer",
    texte: "Vous avez battu trois pirates dans une ruelle. Le quatrième, leur capitaine, applaudit au lieu de sortir son arme. « J'ai besoin de quelqu'un comme toi. Le monde est grand, il y a des sabres plus forts que le tien. »",
    oui: "Ce n'est pas l'argent qui vous décide. C'est « des sabres plus forts que le tien ».",
  },
  {
    metier: "voleur", id: "pir-voleur-embarque", titre: "La carte volée",
    texte: "Vous avez volé la carte d'un capitaine pirate. Il vous rattrape, regarde la carte, regarde vous. « Tu l'as volée sans que je sente rien. Viens plutôt voler pour moi. »",
    oui: "Vous gardez un pied dehors. On ne sait jamais avec les pirates.",
    clin: { id: "pir-voleuse-de-cartes", ref: "Nami, voleuse de pirates, qui s'embarque d'abord pour mieux les dépouiller.", arc: "Orange Town" },
  },
  {
    metier: "tireur", id: "pir-tireur-embarque", titre: "La pomme sur la tête",
    texte: "Au concours de tir du port, vous coupez la tige d'une pomme à deux cents pas. Un pirate siffle. Son capitaine veut savoir si vous savez aussi viser un canon.",
    oui: "Vous savez. Vous le prouvez au premier navire de la Marine qui croise votre route.",
  },
];

for (const m of METIERS_EMBARQUES) {
  entrer.push({
    id: m.id,
    quand: partant({ age: [16, 42], metier: [m.metier] }),
    poids: 1.5,
    tension: 3,
    titre: m.titre,
    texte: m.texte,
    bascule: true,
    choix: [
      {
        label: "Partir avec eux",
        effets: { grade: "officier-pirate", lien: { creer: "capitaine" }, ...ENTREE },
        texte: m.oui,
      },
      { label: "Rester où l'on a besoin de vous", effets: { jauges: { equipage: 2 } }, texte: "Ils partent sans vous. Il vous arrive de regarder l'horizon un peu trop longtemps.", auto: 3 },
    ],
    clinOeil: m.clin,
  });
}

entrer.push(
  {
    id: "pir-chasseur-rejoint",
    quand: partant({ age: [17, 40], camp: ["chasseur"] }),
    poids: 3,
    tension: 3,
    titre: "Le capitaine qui ne s'enfuit pas",
    texte: "Vous étiez venu{/e} pour sa tête. Il vous a battu{/e}, puis il vous a offert à boire. « Tu te bats bien. Pourquoi tu chasses des gens comme moi au lieu de voir le monde ? »",
    bascule: true,
    choix: [
      { label: "Rejoindre son équipage", effets: { grade: "officier-pirate", lien: { creer: "capitaine" }, prime: 8_000_000, ...ENTREE }, texte: "Vos anciens collègues mettent un an à vous pardonner. Certains ne le feront jamais." },
      { label: "Lui promettre de revenir le chercher", effets: { jauges: { force: 2 } }, texte: "Il rit. « Je t'attendrai. » Vous ne le reverrez jamais.", auto: 2 },
    ],
    clinOeil: { id: "pir-chasseur-rallie", ref: "Zoro, chasseur de pirates, qui finit second d'un équipage pirate.", arc: "Shells Town" },
  },
  {
    id: "pir-pegre-vers-la-mer",
    quand: partant({ age: [17, 40], camp: ["pegre"] }),
    poids: 1,
    tension: 3,
    titre: "Prendre le large",
    texte: "Le parrain veut votre tête pour une dette qui n'est pas la vôtre. Il reste une solution : la mer, où même la pègre ne vous suivra pas longtemps.",
    choix: [
      { label: "Voler un sloop et partir", effets: { grade: "capitaine-pirate", flags: ["en-mer", "a-quitte-son-ile", "capitaine-de-son-equipage"], equipageNom: "les Pirates de {famille}", navire: "un sloop volé", prime: 2_000_000 }, texte: "Le sloop est petit, l'équipage se compose de vous. C'est un début." },
      { label: "Payer et rester", effets: { jauges: { equipage: -2 } }, texte: "Vous payez. Vous paierez toute votre vie.", auto: 3 },
    ],
  },
  {
    id: "pir-marine-deserte",
    quand: partant({ age: [20, 45], camp: ["marine"], rangMax: 5 }),
    poids: 2,
    rarete: "peu-commun",
    tension: 4,
    titre: "Le pavillon qu'on retourne",
    texte: "On vous a ordonné de brûler un village pour l'exemple. Vos hommes vous regardent. Le navire est à vous, cette nuit, si vous le voulez.",
    bascule: true,
    choix: [
      {
        label: "Hisser le pavillon noir",
        effets: { grade: "capitaine-pirate", flags: ["en-mer", "capitaine-de-son-equipage", "trahison"], equipageNom: "les Déserteurs", prime: 30_000_000, lien: { creer: "compagnon", metier: "soldat" } },
        texte: "La moitié de vos hommes vous suit. L'autre moitié, vous la déposez sur la côte, vivante. Le lendemain, votre portrait est partout.",
      },
      { label: "Obéir, et vous taire", effets: { jauges: { haki: -2 } }, texte: "Vous obéissez. Vous ne dormez plus très bien.", auto: 2 },
    ],
    clinOeil: { id: "pir-ancien-contre-amiral", ref: "X Drake, ancien contre-amiral de la Marine devenu capitaine pirate et Supernova.", arc: "Sabaody" },
  },
);

// ── 2. La vie à bord ──

const bord: Evenement[] = [
  {
    id: "pir-premier-jour",
    quand: actif({ grade: ["mousse"], age: [12, 50] }),
    poids: 30,
    tension: 1,
    titre: "Le seau et la brosse",
    texte: [
      "On vous a donné un seau, une brosse et un hamac qui sent le poisson. Le pont fait trente pas de long. Vous le connaîtrez bientôt mieux que votre propre visage.",
      "Le maître d'équipage vous apprend trois nœuds, deux jurons et une règle : on ne siffle pas sur le pont. Personne ne sait pourquoi. Personne ne siffle.",
    ],
    choix: [
      { label: "Travailler plus dur que les autres", effets: { jauges: { force: 3 } }, texte: "Le soir, vos mains saignent. Le maître d'équipage fait semblant de ne pas le voir, puis vous lance un onguent." },
      { label: "Écouter les vieux marins", effets: { jauges: { savoir: 3 } }, texte: "Vous apprenez à lire le vent dans la couleur des vagues, et à ne jamais jouer aux dés avec le cuisinier." },
      { label: "Se faire des amis", effets: { jauges: { equipage: 3 }, lien: { creer: "compagnon" } }, texte: "{compagnon:Il/Elle} s'appelle {compagnon}. {compagnon:Il/Elle} vous montre où l'on cache le rhum." },
    ],
  },
  {
    id: "pir-gourdin-de-fer",
    quand: actif({ grade: ["mousse"], age: [12, 25], zone: ["east-blue"], annee: [1505, 1522] }),
    poids: 20,
    tension: 2,
    titre: "La plus belle des mers",
    texte: "Votre capitaine porte un gourdin de fer et exige, chaque matin, qu'on lui dise qu'elle est la plus belle des mers. Vous avez appris à mentir vite.",
    choix: [
      { label: "Continuer à mentir", effets: { jauges: { equipage: 2 } }, texte: "Vous mentez avec un tel talent qu'elle vous offre une ration double." },
      {
        label: "Lui dire la vérité",
        test: {
          jauge: "pc",
          difficulte: 22,
          reussite: { texte: "Le gourdin s'écrase à côté de votre tête. Elle vous regarde, puis éclate de rire. Vous êtes promu{/e} le jour même.", effets: { promotion: true, jauges: { haki: 2 } } },
          echec: { texte: "Le gourdin, lui, ne ment jamais. Vous passez une semaine à fond de cale.", effets: { sante: -10, blessure: "cotes-cassees" } },
        },
      },
      { label: "Fuir dans un tonneau à la prochaine escale", effets: { camp: "civil", retirerFlags: ["en-mer"], jauges: { savoir: 2 } }, texte: "Vous roulez jusqu'à la plage. Personne ne vient vous chercher. On ne cherche pas un mousse.", auto: 0.5 },
    ],
    clinOeil: { id: "pir-plus-belle-des-mers", ref: "Alvida et sa massue de fer, et Koby forcé de lui répéter qu'elle est la plus belle des mers.", arc: "Romance Dawn" },
  },
  {
    id: "pir-promotion-matelot",
    quand: actif({ grade: ["mousse"], compteurs: { "annees:pirate": 1 } }),
    poids: 25,
    tension: 1,
    titre: "Un vrai marin",
    texte: [
      "Le capitaine vous lance un couteau, sans un mot. Le maître d'équipage explique : on ne donne pas de couteau à un mousse. Vous n'en êtes plus un.",
      "Vous avez tenu la barre pendant toute une tempête. Le lendemain, on vous appelle par votre prénom. C'est comme ça qu'on devient matelot.",
    ],
    effets: { promotion: true, jauges: { equipage: 2 } },
  },
  {
    id: "pir-promotion-officier",
    quand: actif({ grade: ["matelot-pirate"], compteurs: { "annees:pirate": 3 }, un: [{ jauges: { force: 28 } }, { jauges: { savoir: 28 } }, { jauges: { equipage: 30 } }] }),
    poids: 12,
    tension: 2,
    titre: "Une place à la table du capitaine",
    texte: [
      "Le second est mort de fièvre au large. Le capitaine pose sa main sur votre épaule devant tout l'équipage. Désormais, c'est vous qui répondez des autres.",
      "Vous avez sauvé la cargaison, le navire et le capitaine, dans cet ordre. Il ne vous en veut pas pour l'ordre. Il vous donne une cabine.",
    ],
    effets: { promotion: true, jauges: { equipage: 3 } },
  },
  {
    id: "pir-partage-du-butin",
    quand: actif({ rangMin: 1, rangMax: 2, age: [15, 50] }),
    poids: 8,
    tension: 2,
    titre: "Le partage",
    texte: "Le butin est étalé sur le pont. Le capitaine prend la moitié, puis le collier. Personne ne dit rien. Un vieux matelot vous regarde : il attend de voir ce que vous allez faire.",
    choix: [
      { label: "Vous taire", texte: "Rien ne change. C'est peut-être ça le pire." },
      { label: "Réclamer votre part à voix haute", effets: { jauges: { equipage: 5, haki: 1 } }, texte: "Le capitaine vous fixe longtemps. Puis il vous lance une pièce. L'équipage s'en souviendra." },
      {
        label: "Voler le collier la nuit",
        test: {
          jauge: "savoir",
          difficulte: 30,
          reussite: { texte: "Le collier dort désormais dans votre botte. Le capitaine accuse le cuisinier.", effets: { compteurs: { mensonges: 1 } } },
          echec: { texte: "On vous débarque sur un rocher avec une gourde d'eau. Un navire marchand vous repêche cinq jours plus tard.", effets: { camp: "civil", sante: -12, retirerFlags: ["en-mer"], lien: { perdre: "capitaine" } } },
        },
        auto: 0.5,
      },
    ],
  },
  {
    id: "pir-ami-a-bord",
    quand: actif({ age: [14, 60], lien: { compagnon: false } }),
    poids: 10,
    tension: 1,
    titre: "Quelqu'un sur qui compter",
    texte: [
      "Pendant le quart de nuit, un matelot de votre âge vous raconte son île, sa mère, la personne qu'il n'a jamais osé embrasser. À l'aube, vous êtes amis pour la vie.",
      "Une bagarre, un œil au beurre noir chacun, puis une bouteille partagée sur le gaillard d'avant. C'est comme ça que les amitiés commencent, à bord.",
    ],
    effets: { lien: { creer: "compagnon", sexe: "h" }, jauges: { equipage: 3 }, journal: "Il s'appelle {compagnon}. Il ne vous quittera plus." },
  },
  {
    id: "pir-mentor-a-bord",
    quand: actif({ age: [14, 35], pasFlags: ["mentor-haki", "mentor-epee"] }),
    poids: 5,
    tension: 2,
    titre: "Le vieux second",
    texte: "Le vieux second ne parle presque jamais. Un soir, il vous bande les yeux et vous lance des noyaux de cerise. « Ne les regarde pas. Écoute-les venir. »",
    choix: [
      { label: "Apprendre à écouter", effets: { flags: ["mentor-haki"], lien: { creer: "mentor", sexe: "h" }, jauges: { haki: 4 } }, texte: "Au bout d'un an, vous en évitez un sur trois. Il dit que c'est un début honnête." },
      { label: "Lui demander plutôt de vous apprendre le sabre", effets: { flags: ["mentor-epee"], lien: { creer: "mentor", sexe: "h" }, jauges: { force: 4 } }, texte: "Il soupire, puis sort une vieille lame. « Un sabre, ça s'écoute aussi. »" },
    ],
  },
  {
    id: "pir-premier-sang",
    quand: actif({ age: [15, 45], pasFlags: ["a-tue"] }),
    poids: 6,
    tension: 4,
    titre: "La première fois",
    texte: "L'abordage tourne mal. Un marin adverse vous plaque contre le bastingage, un couteau à la main. Vous avez une fraction de seconde.",
    choix: [
      { label: "Frapper pour tuer", effets: { flags: ["a-tue"], jauges: { force: 3, haki: -1 } }, texte: "Il tombe. Le soir, l'équipage boit à votre santé. Vous ne buvez pas." },
      {
        label: "Le désarmer",
        test: {
          jauge: "pc",
          difficulte: 25,
          reussite: { texte: "Le couteau tombe à la mer. L'homme vous regarde comme on regarde un fou, puis saute par-dessus bord.", effets: { jauges: { haki: 2 } } },
          echec: { texte: "La lame vous ouvre le bras jusqu'à l'os. On vous recoud avec du fil à voile.", effets: { blessure: "bras-entaille", sante: -12 } },
        },
      },
    ],
  },
  {
    id: "pir-pillage",
    quand: actif({ age: [15, 55], zone: [...BLUES, "paradis", "nouveau-monde"] }),
    poids: 5,
    repetable: 6,
    tension: 3,
    titre: "Le village sans défense",
    texte: "Un village de pêcheurs, des greniers pleins, pas une arme. Le capitaine donne l'ordre de débarquer. Une vieille femme vous regarde depuis sa porte.",
    choix: [
      { label: "Prendre ce qu'on vous a dit de prendre", effets: { prime: 1_000_000, jauges: { equipage: 1 } }, texte: "Vous prenez. Vous ne regardez plus les portes." },
      { label: "Laisser de quoi passer l'hiver", effets: { jauges: { haki: 2 } }, texte: "Vous laissez un sac de riz derrière la porte. La vieille femme ne dit rien. Elle hoche la tête." },
      { label: "Refuser devant tout le monde", si: { rangMin: 2 }, effets: { jauges: { equipage: 4, haki: 2 } }, texte: "Le capitaine hésite. Trop de matelots sont derrière vous. Le navire repart les cales vides et la tête haute." },
    ],
  },
  {
    id: "pir-banquet",
    quand: actif({ age: [14, 80] }),
    poids: 10,
    repetable: 2,
    tension: 0,
    titre: "Le banquet",
    texte: [
      "On a vidé la cale pour faire de la place. Le cuisinier a fait cuire tout ce qui bougeait encore. On danse sur les tonneaux jusqu'à ce que le pont tangue tout seul.",
      "On fête une victoire, un anniversaire, ou rien du tout. Quelqu'un joue faux. Tout le monde chante plus faux encore. Vous riez à vous en faire mal au ventre.",
      "La viande grille sur la plage d'une île sans nom. Le capitaine raconte la même histoire qu'au dernier banquet, avec un monstre deux fois plus grand.",
    ],
    effets: { compteurs: { banquets: 1 }, jauges: { equipage: 2 } },
  },
  {
    id: "pir-chanson-de-binks",
    quand: actif({ age: [14, 90], compteurs: { banquets: 2 } }),
    poids: 6,
    tension: 1,
    titre: "Le saké de Binks",
    texte: "Tard dans la nuit, le plus vieux de l'équipage entonne la chanson que tous les pirates connaissent, celle du saké qu'on porte à travers les mers. Vous ne connaissiez pas les paroles. Vous ne les oublierez jamais.",
    effets: { compteurs: { banquets: 1 }, jauges: { equipage: 3 } },
    clinOeil: { id: "pir-binks", ref: "« Le saké de Binks », la chanson que Brook chante à Laboon et que l'équipage de Roger chantait déjà.", arc: "Thriller Bark" },
  },
  {
    id: "pir-bagarre-taverne",
    quand: actif({ age: [15, 60] }),
    poids: 7,
    repetable: 3,
    tension: 2,
    titre: "La taverne du port",
    texte: [
      "Un pirate d'un autre équipage vous a renversé son verre sur la tête. Il s'excuse en riant. Ses amis se lèvent. Les vôtres aussi.",
      "On vous a pris votre table, votre bière et votre place près du feu. Le patron range déjà les chaises.",
    ],
    choix: [
      {
        label: "Cogner le premier",
        test: {
          jauge: "pc",
          difficulte: 25,
          reussite: { texte: "Quand la poussière retombe, vous êtes le seul debout. Le patron vous présente l'addition des chaises.", effets: { jauges: { force: 2, equipage: 1 }, compteurs: { "combats-gagnes": 1 } } },
          echec: { texte: "Vous vous réveillez dans le caniveau, sans bottes et sans dent de devant.", effets: { sante: -8 } },
        },
      },
      { label: "Rire, et payer une tournée", effets: { jauges: { equipage: 2, haki: 1 } }, texte: "Ils boivent à votre santé. Le lendemain, deux d'entre eux veulent changer d'équipage." },
      { label: "Partir sans rien dire", texte: "Le vrai courage, c'est aussi de finir son verre ailleurs." },
    ],
    clinOeil: { id: "pir-verre-renverse", ref: "Shanks qui laisse un bandit lui renverser du saké sur la tête, et en rit, à Fuchsia.", arc: "Romance Dawn" },
  },
  {
    id: "pir-carte-au-tresor",
    quand: actif({ age: [15, 65] }),
    poids: 5,
    repetable: 8,
    tension: 2,
    titre: "La carte au trésor",
    texte: [
      "Dans le coffre d'un navire coulé, une carte dessinée à l'encre de seiche : une île, une croix, et une phrase qui dit « ne creusez pas ».",
      "Un ivrogne vous vend une carte pour le prix d'un verre. Le papier est vieux, la croix précise. Tout l'équipage rit. Puis tout l'équipage se tait.",
    ],
    choix: [
      {
        label: "Mettre le cap sur la croix",
        test: {
          jauge: "chance",
          difficulte: 58,
          reussite: { texte: "Sous deux mètres de sable : un coffre plein de pièces anciennes. Pour une fois, la carte ne mentait pas.", effets: { jauges: { equipage: 5 }, compteurs: { banquets: 1 } } },
          echec: { texte: "Sous la croix, il y a un squelette et une autre carte. Vous la gardez, au cas où.", effets: { jauges: { savoir: 2 } } },
        },
      },
      { label: "La vendre au prochain naïf", effets: { compteurs: { mensonges: 1 } }, texte: "Vous la revendez trois fois plus cher. Le commerce, c'est aussi de la piraterie." },
    ],
  },
  {
    id: "pir-fruit-dans-le-butin",
    quand: actif({ age: [15, 60], fruit: false, fruitEnPoche: false }),
    poids: 1,
    rarete: "peu-commun",
    tension: 4,
    titre: "Le coffre scellé",
    texte: "Dans la cale du navire abordé, un petit coffre scellé à la cire. À l'intérieur, sur un coussin de velours, un fruit couvert de spirales. Tout le monde s'est tu.",
    bascule: true,
    choix: [
      { label: "Le manger avant que quelqu'un d'autre ne le fasse", effets: { fruit: { mode: "trouve" } }, texte: "C'est le pire goût du monde. Puis la mer, soudain, vous fait peur." },
      { label: "Le remettre au capitaine", si: { lien: { capitaine: true } }, effets: { jauges: { equipage: 4 } }, texte: "Le capitaine le soupèse longtemps, puis le range. On vous fait confiance, désormais." },
      { label: "Le cacher pour plus tard", effets: { fruit: { mode: "trouve", manger: false } }, texte: "Vous le roulez dans une chemise. La nuit, vous entendez l'équipage chuchoter." },
    ],
  },
  {
    id: "pir-scorbut",
    quand: actif({ age: [14, 70], pasZone: ["fond-marin", "ciel"] }),
    poids: 4,
    tension: 3,
    titre: "Le mal des gencives",
    texte: "Trois mois sans escale. Les gencives saignent, les dents bougent, les vieilles cicatrices se rouvrent. Le cuisinier jure qu'il ne manque que des citrons.",
    choix: [
      {
        label: "Forcer l'allure vers la première île",
        test: {
          jauge: "savoir",
          difficulte: 30,
          reussite: { texte: "Une île aux citronniers, au bout de cinq jours. On mange même l'écorce.", effets: { jauges: { savoir: 2 } } },
          echec: { texte: "Il faut dix jours. On en enterre trois en mer.", effets: { sante: -15, lien: { mort: "compagnon" } } },
        },
      },
      { label: "Donner votre part à ceux qui vont le plus mal", effets: { sante: -10, jauges: { equipage: 5 }, compteurs: { "vies-sauvees": 1 } }, texte: "Vous tenez debout par entêtement. L'équipage ne l'oubliera pas." },
    ],
    clinOeil: { id: "pir-citrons", ref: "Sanji qui soigne le scorbut de l'équipage avec du jus de citron, en route vers Loguetown.", arc: "Loguetown" },
  },
  {
    id: "pir-capitaine-meurt",
    quand: actif({ rangMin: 1, age: [17, 60], lien: { capitaine: true }, pasFlags: ["capitaine-de-son-equipage"], compteurs: { "annees:pirate": 3 } }),
    poids: 5,
    tension: 4,
    titre: "Le capitaine est mort",
    texte: [
      "{capitaine} est {capitaine:mort/morte} d'une balle perdue, sur un abordage qui ne valait rien. L'équipage s'est rassemblé autour du corps. Tous les regards finissent par se poser sur vous.",
      "Une fièvre a emporté {capitaine} en trois jours. {capitaine:Il/Elle} a demandé à vous voir, à la fin, mais n'a rien pu dire. L'équipage attend.",
    ],
    effets: { lien: { mort: "capitaine" } },
    bascule: true,
    choix: [
      {
        label: "Prendre la barre",
        si: { un: [{ rangMin: 2 }, { jauges: { equipage: 25 } }] },
        effets: { grade: "capitaine-pirate", flags: ["capitaine-de-son-equipage"], jauges: { equipage: 4 } },
        texte: "Vous gardez son chapeau, mais pas son nom sur le pavillon. Désormais, les décisions vous empêcheront de dormir.",
      },
      { label: "Laisser le second prendre la barre", effets: { lien: { creer: "capitaine" } }, texte: "Le nouveau capitaine est plus prudent. Vous ne savez pas encore si c'est une bonne nouvelle." },
      { label: "Quitter l'équipage au prochain port", effets: { camp: "civil", retirerFlags: ["en-mer"] }, texte: "Sans {capitaine:lui/elle}, ce navire n'est plus qu'un tas de planches.", auto: 0.5 },
    ],
  },
  {
    id: "pir-rocher",
    quand: actif({ age: [15, 50], rangMax: 2 }),
    poids: 2,
    rarete: "peu-commun",
    tension: 4,
    titre: "Le rocher",
    texte: "Une tempête vous a jeté{/e} sur un rocher avec un autre naufragé, un vieux pirate. Il ne reste qu'un sac de vivres. Il vous le tend en entier, sans un mot.",
    choix: [
      { label: "Le partager", effets: { sante: -15, jauges: { haki: 3, equipage: 3 }, lien: { creer: "mentor", sexe: "h" } }, texte: "Quatre-vingts jours plus tard, un navire vous trouve. Il a perdu une jambe. Vous avez gagné un père." },
      { label: "Le prendre, puisqu'il le donne", effets: { sante: -5, jauges: { force: 1 } }, texte: "Quand on vous repêche, il est mort. Son sac à lui était plein d'or, pas de vivres." },
    ],
    clinOeil: { id: "pir-quatre-vingt-cinq-jours", ref: "Zeff et le jeune Sanji, quatre-vingt-cinq jours sur un rocher : Zeff avait tout donné et mangé sa propre jambe.", arc: "Baratie" },
    rencontre: "zeff",
  },
  {
    id: "pir-lettre",
    quand: actif({ age: [15, 40], un: [{ lien: { mere: true } }, { lien: { pere: true } }] }),
    poids: 5,
    tension: 1,
    titre: "La lettre",
    texte: "À l'escale, un marchand accepte de porter une lettre jusqu'{aIleNatale}. Vous avez une feuille, un crayon et trop de choses à dire.",
    choix: [
      { label: "Écrire que tout va bien", effets: { jauges: { equipage: 1 }, flags: ["promesse"] }, texte: "Vous promettez de revenir. Vous ne mentionnez ni le pavillon, ni la cicatrice." },
      { label: "Écrire la vérité", effets: { jauges: { haki: 2 } }, texte: "Trois pages. La réponse arrive un an plus tard, deux lignes : « Mange bien. Reviens vivant{/e}. »" },
      { label: "Ne rien écrire", texte: "Mieux vaut qu'on vous croie {mort/morte} que pirate. C'est ce que vous vous dites." },
    ],
  },
  {
    id: "pir-mutinerie",
    quand: actif({ age: [20, 60], rangMin: 2, jauges: { equipage: [0, 30] } }),
    poids: 5,
    tension: 5,
    titre: "La mutinerie",
    texte: "On a frappé à votre cabine à trois heures du matin. Ce sont les vôtres, avec des couteaux. Le plus jeune tremble si fort que sa lame cogne contre la porte.",
    choix: [
      {
        label: "Vous battre",
        test: {
          jauge: "pc",
          difficulte: 32,
          reussite: { texte: "À l'aube, trois hommes dans la chaloupe et le navire à vous. L'équipage ne vous aime pas. Il vous craint.", effets: { jauges: { equipage: -5, force: 2 }, flags: ["a-tue"] } },
          echec: { texte: "Ils étaient trop nombreux.", effets: { mort: "mutinerie" } },
        },
      },
      {
        label: "Leur demander ce qu'ils veulent",
        test: {
          jauge: "equipage",
          difficulte: 20,
          reussite: { texte: "Une part plus juste, une escale par mois, et qu'on arrête de manger du hareng. Vous acceptez. Ils rangent les couteaux.", effets: { jauges: { equipage: 10 } } },
          echec: { texte: "Ils vous débarquent sur une île déserte avec un pistolet et une balle. Vous ne vous en servez pas.", effets: { camp: "civil", sante: -10, retirerFlags: ["en-mer", "capitaine-de-son-equipage"] } },
        },
        auto: 2,
      },
      { label: "Partir seul{/e} avec la chaloupe", effets: { camp: "civil", retirerFlags: ["en-mer", "capitaine-de-son-equipage"] }, texte: "Personne ne vous retient. C'est ce qui fait le plus mal." },
    ],
  },
  {
    id: "pir-klabautermann",
    quand: actif({ age: [14, 80], rangMin: 1 }),
    poids: 2,
    rarete: "peu-commun",
    tension: 2,
    titre: "La silhouette sur le pont",
    texte: "Une nuit de tempête, vous voyez une petite silhouette en ciré réparer le mât avec un marteau. Au matin, la fissure est rebouchée. Personne à bord ne sait manier un marteau comme ça.",
    effets: { jauges: { haki: 2 } },
    clinOeil: { id: "pir-klabautermann", ref: "Le Klabautermann, l'esprit des navires aimés, aperçu par l'équipage sur le Vogue Merry.", arc: "Water Seven" },
  },
  {
    id: "pir-quart-de-nuit",
    quand: actif({ age: [14, 80] }),
    poids: 8,
    repetable: 3,
    tension: 0,
    texte: [
      "Le quart de nuit, seul{/e} à la barre. Les étoiles se reflètent si bien qu'on ne sait plus où finit la mer.",
      "Un banc de dauphins accompagne le navire toute une matinée. Même le canonnier, qui ne sourit jamais, leur fait signe.",
      "Trois semaines de calme plat. On pêche, on dort, on se dispute pour savoir qui a mangé le dernier jambon.",
      "Vous apprenez à recoudre une voile, à prédire la pluie à l'odeur et à dormir dans n'importe quel hamac. La mer vous change sans demander la permission.",
      "Une île au loin, verte et inconnue. Personne ne connaît son nom. Vous lui en donnez un, que vous ne dites à personne.",
    ],
    effets: { jauges: { savoir: 1 } },
  },
];

// Les escales : on navigue dans sa mer, d'île en île.
const ESCALES: { zone: Zone; textes: string[] }[] = [
  { zone: "east-blue", textes: [
    "Escale {aIle}. Le marché sent la mandarine et le poisson grillé. On vous regarde de travers, mais on vous vend quand même du rhum.",
    "Le navire mouille {aIle}, dans la mer la plus calme du monde, disent-ils. Les gens d'ici n'ont jamais vu Grand Line, et ils dorment bien.",
  ] },
  { zone: "west-blue", textes: [
    "Escale {aIle}. Ici, les familles de la pègre tiennent les ports. Il faut payer pour amarrer, et payer pour repartir.",
    "Le navire mouille {aIle}. Un marché aux livres sur le quai. Le navigateur dépense toute sa paie en cartes anciennes.",
  ] },
  { zone: "north-blue", textes: [
    "Escale {aIle}. Le froid mord les doigts. On repart avec des fourrures, de l'alcool de pomme de terre et un mousse de plus, qui ne parle pas.",
    "Le navire mouille {aIle}. Des soldats partout, des royaumes qui se surveillent. Un pirate doit savoir se faire oublier.",
  ] },
  { zone: "south-blue", textes: [
    "Escale {aIle}. Il fait chaud, les fruits tombent tout seuls des arbres, et la Marine fait la sieste.",
    "Le navire mouille {aIle}. Les tavernes sont pleines de jeunes capitaines qui veulent tous devenir le Roi des Pirates.",
  ] },
  { zone: "paradis", textes: [
    "Le Log Pose s'est réglé sur {ile}. L'île apparaît après six jours de tempêtes, de neige et de soleil, dans le désordre.",
    "Escale {aIle}. Sur Grand Line, chaque île a ses propres saisons, ses propres lois et ses propres façons de vous tuer.",
    "Le navire mouille {aIle}. Il faut attendre que le Log Pose se recharge. Une semaine, un mois, nul ne le sait.",
  ] },
  { zone: "nouveau-monde", textes: [
    "Les trois aiguilles du Log Pose tremblent. Vous choisissez la plus calme. Elle mène {aIle}.",
    "Escale {aIle}. Ici, chaque île appartient à quelqu'un, et ce quelqu'un a un pavillon qu'il vaut mieux connaître.",
    "Le navire mouille {aIle}. La mer était rouge hier et la foudre tombait à l'horizontale. Personne ne commente plus.",
  ] },
];

for (const e of ESCALES) {
  bord.push({
    id: `pir-escale-${e.zone}`,
    quand: actif({ zone: [e.zone], age: [14, 80] }),
    poids: 12,
    repetable: 2,
    tension: 0,
    texte: e.textes,
    effets: { aller: { zone: e.zone } },
  });
}

// Les abordages et les tempêtes, plus durs à mesure qu'on avance.
const PALIERS: { id: string; zones: Zone[]; difficulte: number; butin: number; tempete: string[]; abordage: string[] }[] = [
  {
    id: "blue", zones: BLUES, difficulte: 18, butin: 1_000_000,
    abordage: [
      "Un navire marchand, lourd, lent, mal défendu. Le capitaine donne l'ordre de lancer les grappins.",
      "Un autre équipage pirate vous dispute la même baie. Leurs canons sont vieux. Les vôtres aussi.",
    ],
    tempete: [
      "Un grain se lève d'un coup. Les voiles claquent, une vague balaie le pont et emporte les tonneaux d'eau douce.",
      "La tempête dure trois jours. On a attaché tout le monde au mât, même le cuisinier, qui prie à voix haute.",
    ],
  },
  {
    id: "grand-line", zones: ["paradis"], difficulte: 34, butin: 5_000_000,
    abordage: [
      "Un galion chargé d'or d'un royaume de Grand Line, escorté par deux frégates. Le capitaine sourit comme un enfant.",
      "Un équipage rival, des primes affichées sur le mât comme des trophées. Ils vous ont vus avant que vous ne les voyiez.",
    ],
    tempete: [
      "Un cyclone apparaît sur une mer d'huile, sans prévenir. Sur Grand Line, le ciel ment toujours.",
      "Il neige, puis il grêle, puis le soleil cogne, dans la même heure. La boussole tourne sur elle-même comme une folle.",
    ],
  },
  {
    id: "nouveau-monde", zones: ["nouveau-monde"], difficulte: 50, butin: 20_000_000,
    abordage: [
      "Un navire sous le pavillon d'un vassal d'Empereur. Les attaquer, c'est déclarer la guerre à plus grand que vous.",
      "Un équipage du Nouveau Monde vous coupe la route, des monstres à bord, des hommes plus grands que des mâts.",
    ],
    tempete: [
      "La foudre tombe sur la mer comme une pluie. Une vague rouge, haute comme une île, se lève à l'horizon.",
      "Un tourbillon géant s'ouvre devant l'étrave. Le Nouveau Monde ne fait pas de différence entre les forts et les faibles.",
    ],
  },
];

for (const p of PALIERS) {
  bord.push({
    id: `pir-abordage-${p.id}`,
    quand: actif({ zone: p.zones, age: [14, 70] }),
    poids: 11,
    repetable: 2,
    tension: 3,
    titre: "À l'abordage",
    texte: p.abordage,
    choix: [
      {
        label: "Sauter le premier",
        test: {
          jauge: "pc",
          difficulte: p.difficulte,
          reussite: {
            texte: ["Vous êtes de l'autre côté avant que les cordes ne soient tendues. Le combat ne dure pas.", "Ils se rendent quand ils vous voient arriver. On parlera de vous dans les tavernes."],
            effets: { jauges: { force: 2, equipage: 2 }, prime: p.butin, compteurs: { "combats-gagnes": 1 } },
          },
          echec: {
            texte: ["Une balle, un coup de sabre, une chute entre les deux coques. On vous repêche à moitié mort{/e}.", "Vous tombez à la mer au premier choc. On vous récupère, sans votre dignité."],
            effets: { sante: -14, blessure: "abordage" },
          },
        },
      },
      {
        label: "Tenir les canons",
        test: {
          jauge: "savoir",
          difficulte: p.difficulte - 6,
          reussite: { texte: "Votre boulet fend leur mât en deux. Le reste n'est qu'une formalité.", effets: { jauges: { savoir: 2 }, prime: Math.round(p.butin / 2) } },
          echec: { texte: "Un canon explose à côté de vous. Vous n'entendez plus rien d'une oreille pendant un mois.", effets: { sante: -8 } },
        },
      },
      { label: "Rester en arrière", effets: { jauges: { equipage: -2 } }, texte: "Vous survivez. Les autres l'ont remarqué.", auto: 0.4 },
    ],
  });
  bord.push({
    id: `pir-tempete-${p.id}`,
    quand: actif({ zone: p.zones, age: [14, 80] }),
    poids: 7,
    repetable: 3,
    tension: 3,
    titre: "La tempête",
    texte: p.tempete,
    choix: [
      {
        label: "Lire la mer et tenir la barre",
        test: {
          jauge: "savoir",
          difficulte: p.difficulte,
          reussite: { texte: "Vous sentez la vague avant qu'elle ne vienne. Le navire passe, à un mètre près.", effets: { jauges: { savoir: 3, equipage: 2 } } },
          echec: { texte: "Le mât casse. Quand le calme revient, il manque quelqu'un à l'appel.", effets: { sante: -10, lien: { mort: "compagnon" } } },
        },
      },
      {
        label: "Grimper serrer les voiles",
        test: {
          jauge: "force",
          difficulte: p.difficulte,
          reussite: { texte: "Vous restez pendu{/e} au mât une heure entière. Personne ne sait comment vous avez tenu.", effets: { jauges: { force: 3 } } },
          echec: { texte: "Une rafale vous arrache du mât. Vous vous brisez sur le pont.", effets: { sante: -18, blessure: "chute-du-mat" } },
        },
      },
    ],
  });
}

bord.push(
  {
    id: "pir-roi-des-mers",
    quand: actif({ zone: ["paradis", "nouveau-monde", "calm-belt"], age: [14, 80] }),
    poids: 5,
    repetable: 5,
    tension: 4,
    titre: "Un Roi des Mers",
    texte: [
      "La mer se soulève. Une tête plus grande que le navire sort de l'eau, et ses yeux vous regardent, vous, personnellement.",
      "Ce que vous preniez pour un récif ouvre la gueule. Le navigateur a juste le temps de dire « Roi des Mers ».",
    ],
    choix: [
      {
        label: "Le frapper entre les yeux",
        test: {
          jauge: "pc",
          difficulte: 48,
          reussite: { texte: "La bête recule, puis s'enfuit. Vous mangez du Roi des Mers pendant deux semaines.", effets: { jauges: { force: 3, haki: 2 }, compteurs: { "combats-gagnes": 1, banquets: 1 } } },
          echec: { texte: "La queue balaie le pont. On vous retrouve dans les haubans, quatre côtes en moins.", effets: { sante: -20, blessure: "roi-des-mers" } },
        },
      },
      {
        label: "Fuir à pleine voile",
        test: {
          jauge: "savoir",
          difficulte: 35,
          reussite: { texte: "Vous filez entre deux récifs où il ne peut pas passer. La bête plonge, déçue.", effets: { jauges: { savoir: 2 } } },
          echec: { texte: "Il emporte l'arrière du navire et deux hommes avec. Vous ne pouvez rien faire.", effets: { sante: -8, lien: { mort: "compagnon" } } },
        },
      },
    ],
    clinOeil: { id: "pir-roi-des-mers", ref: "Les Rois des Mers de la Calm Belt, et le monstre de Fuchsia qui prit le bras de Shanks.", arc: "Romance Dawn" },
  },
  {
    id: "pir-chasseurs-de-primes",
    quand: actif({ age: [15, 75], prime: 1 }),
    poids: 8,
    repetable: 3,
    tension: 3,
    titre: "Des chasseurs",
    texte: [
      "Trois chasseurs de primes vous attendent sur le quai, votre avis de recherche à la main. L'un d'eux le compare à votre visage. Il n'a pas l'air convaincu.",
      "Une chasseuse aux cheveux blancs vous suit depuis trois îles. Ce soir, elle est assise à votre table.",
    ],
    choix: [
      {
        label: "Les affronter",
        test: {
          jauge: "pc",
          difficulte: 30,
          reussite: { texte: "Ils repartent à la nage. Votre réputation grimpe d'un cran.", effets: { prime: 3_000_000, jauges: { force: 2 }, compteurs: { "combats-gagnes": 1 } } },
          echec: { texte: "Vous vous échappez de justesse, une balle dans l'épaule.", effets: { sante: -14, blessure: "balle-epaule" } },
        },
      },
      { label: "Prétendre que ce n'est pas vous", si: { flags: ["photo-ratee"] }, effets: { compteurs: { mensonges: 1 } }, texte: "Ils regardent le portrait, puis vous. Ils s'excusent. Bénie soit la photo ratée." },
      { label: "Fuir par les toits", effets: { jauges: { force: 1 } }, texte: "Vous perdez votre chapeau, mais pas votre tête." },
    ],
  },
  {
    id: "pir-marine-aux-trousses",
    quand: actif({ age: [15, 75], prime: 1 }),
    poids: 8,
    repetable: 3,
    tension: 4,
    titre: "La Marine",
    texte: [
      "Une voile blanche à l'horizon, la mouette bleue sur le pavillon. Puis deux voiles. Puis cinq.",
      "Un navire de guerre surgit du brouillard, les sabords ouverts. Un officier hurle au porte-voix que vous êtes en état d'arrestation.",
    ],
    choix: [
      {
        label: "Forcer le blocus",
        test: {
          jauge: "pc",
          difficulte: 36,
          reussite: { texte: "Vous coulez leur navire de tête et passez entre les autres. Le journal en parlera.", effets: { prime: 8_000_000, jauges: { equipage: 3 }, compteurs: { "combats-gagnes": 1 } } },
          echec: { texte: "Ils vous criblent de boulets. On vous jette aux fers.", effets: { flags: ["prisonnier"], sante: -12 } },
        },
      },
      {
        label: "Semer la Marine dans les récifs",
        test: {
          jauge: "savoir",
          difficulte: 30,
          reussite: { texte: "Vous connaissez ces eaux mieux qu'eux. Leur navire s'échoue en beauté.", effets: { jauges: { savoir: 3 } } },
          echec: { texte: "Les récifs vous déchirent la coque. Les menottes de granit marin sont froides.", effets: { flags: ["prisonnier"] } },
        },
        auto: 2,
      },
      { label: "Vous rendre pour sauver l'équipage", effets: { flags: ["prisonnier"], jauges: { equipage: 6, haki: 2 }, compteurs: { "vies-sauvees": 1 } }, texte: "Vous descendez seul{/e} dans la chaloupe, les mains levées. Votre équipage s'enfuit. Il vous doit la vie.", auto: 0.4 },
    ],
  },
);

// ── 3. Les fers ──

const fers: Evenement[] = [
  {
    id: "pir-cellule",
    quand: { camp: ["pirate"], flags: ["prisonnier"], pasZone: ["impel-down"], prime: [0, 39_999_999] },
    poids: 60,
    repetable: 1,
    tension: 3,
    titre: "La cellule",
    texte: [
      "Une cellule de base Marine, quatre pas sur trois. Un gardien qui siffle faux. Les menottes de granit marin vous laissent des marques violettes.",
      "On vous a jeté{/e} dans une cave humide en attendant le navire-prison. Par le soupirail, vous entendez la mer, si proche.",
    ],
    choix: [
      {
        label: "Desceller les barreaux",
        test: {
          jauge: "force",
          difficulte: 34,
          reussite: { texte: "Trois nuits à gratter le mortier avec une cuillère. La quatrième, vous êtes sur les toits.", effets: { retirerFlags: ["prisonnier"], flags: ["evade"], prime: 2_000_000 } },
          echec: { texte: "Le gardien vous surprend. Les coups de crosse ne laissent pas de marques. Ils savent faire.", effets: { sante: -10 } },
        },
      },
      {
        label: "Convaincre le gardien",
        test: {
          jauge: "savoir",
          difficulte: 32,
          reussite: { texte: "Une histoire de trésor enterré, une carte dessinée sur un mouchoir. Le gardien ouvre la porte. Il cherche encore.", effets: { retirerFlags: ["prisonnier"], flags: ["evade"], compteurs: { mensonges: 1 } } },
          echec: { texte: "Il rit, prend la carte, et ne revient jamais.", effets: { jauges: { savoir: 1 } } },
        },
      },
      {
        label: "Attendre votre équipage",
        test: {
          jauge: "equipage",
          difficulte: 30,
          reussite: { texte: "Une nuit, une explosion souffle le mur. Votre équipage est là, hilare, couvert de suie.", effets: { retirerFlags: ["prisonnier"], flags: ["evade"], jauges: { equipage: 5 }, prime: 3_000_000 } },
          echec: { texte: "Personne ne vient. Vous apprenez à compter les jours avec les ongles.", effets: { sante: -5 } },
        },
      },
    ],
  },
  {
    id: "pir-transfert-impel-down",
    quand: { camp: ["pirate"], flags: ["prisonnier"], pasZone: ["impel-down"], prime: 40_000_000 },
    poids: 80,
    tension: 5,
    titre: "Impel Down",
    texte: "Avec une prime comme la vôtre, on ne vous garde pas dans une base. Un navire-prison vous emmène à travers la Calm Belt, jusqu'à la grande porte de la prison sous-marine.",
    effets: { aller: { ile: "impel-down" }, sante: -5 },
    bascule: true,
  },
  {
    id: "pir-impel-down",
    quand: { camp: ["pirate"], flags: ["prisonnier"], zone: ["impel-down"] },
    poids: 50,
    repetable: 1,
    tension: 3,
    titre: "Les niveaux",
    texte: [
      "Le niveau des fauves. Les gardiens lâchent les bêtes pour le plaisir de vous voir courir.",
      "Le niveau du feu. Vous ne transpirez plus, vous n'avez plus d'eau à perdre.",
      "Le niveau du froid. Votre voisin de cellule ne répond plus depuis trois jours. Personne ne vient le chercher.",
      "Le directeur fait sa ronde. Son poison suinte sur les dalles. Tout le monde baisse les yeux.",
    ],
    choix: [
      { label: "Tenir", effets: { sante: -6, jauges: { haki: 2 } }, texte: "Vous tenez. C'est la seule chose qu'on ne peut pas vous prendre." },
      {
        label: "Tenter l'impossible",
        test: {
          jauge: "pc",
          difficulte: 72,
          reussite: { texte: "Personne ne s'évade d'Impel Down. Vous, si. Le journal refuse de l'imprimer.", effets: { retirerFlags: ["prisonnier"], flags: ["evade"], aller: { zone: "paradis" }, prime: 100_000_000 } },
          echec: { texte: "On vous rattrape au niveau inférieur. On vous y laisse.", effets: { sante: -18 } },
        },
        auto: 0.4,
      },
    ],
  },
  {
    id: "pir-shiki-s-evade",
    quand: { camp: ["pirate"], flags: ["prisonnier"], zone: ["impel-down"], annee: [1500, 1500] },
    poids: 500,
    tension: 4,
    titre: "Le premier évadé",
    texte: "Une rumeur traverse les étages : le Lion d'or s'est coupé les deux jambes pour se défaire des chaînes, et il est parti en volant. Les gardiens doublent les rondes. Les prisonniers, eux, se remettent à espérer.",
    effets: { jauges: { haki: 2 }, rencontre: "shiki" },
    clinOeil: { id: "pir-lion-d-or", ref: "Shiki le Lion d'or, premier évadé d'Impel Down, qui se trancha les jambes pour fuir.", arc: "Strong World" },
  },
  {
    id: "pir-grande-evasion",
    quand: { camp: ["pirate"], flags: ["prisonnier"], zone: ["impel-down"], annee: [1522, 1522] },
    poids: 1000,
    tension: 5,
    titre: "La grande évasion",
    texte: "Un garçon au chapeau de paille a tout cassé. Les portes s'ouvrent étage après étage, des centaines de prisonniers courent vers la sortie. Il faut choisir qui suivre.",
    bascule: true,
    rencontre: "luffy",
    choix: [
      {
        label: "Suivre le clown que tout le monde acclame",
        effets: { retirerFlags: ["prisonnier"], flags: ["evade"], aller: { zone: "paradis" }, jauges: { equipage: 6 }, rencontre: "buggy" },
        texte: "Il ne sait pas où il va, mais il y va avec panache. Vous criez son nom avec les autres. Vous ne savez pas pourquoi.",
      },
      {
        label: "Accepter l'offre de l'homme à la barbe noire",
        effets: { retirerFlags: ["prisonnier"], flags: ["evade", "sous-barbe-noire"], aller: { zone: "nouveau-monde" }, primeX: 3, rencontre: "barbe-noire" },
        texte: "Il descend au dernier niveau choisir ses hommes. Il rit d'un rire étrange. Il vous désigne du doigt. Personne, à bord, ne sera jamais votre ami.",
        auto: 0.4,
      },
      { label: "Rester dans votre cellule", effets: { jauges: { haki: 1 } }, texte: "Les cris s'éloignent. Le silence revient. Vous ne saurez jamais pourquoi vous êtes resté{/e}." , auto: 0.2 },
    ],
    clinOeil: { id: "pir-grande-evasion", ref: "L'évasion d'Impel Down : Baggy acclamé par les évadés, Barbe Noire qui recrute au niveau 6.", arc: "Impel Down" },
  },
  {
    id: "pir-echafaud",
    quand: { camp: ["pirate"], flags: ["prisonnier"], prime: 100_000_000 },
    poids: 12,
    tension: 5,
    titre: "L'échafaud",
    texte: "On vous a fait monter sur une estrade, sur la place d'une ville que vous ne connaissez pas. La foule est immense, curieuse, un peu honteuse. Le bourreau vous demande si vous avez quelque chose à dire.",
    bascule: true,
    choix: [
      { label: "Dire où est caché votre trésor", effets: { mort: "execution", flags: ["testament-tresor"] }, texte: "Toute la place retient son souffle. Vous souriez. Les lames se croisent." },
      { label: "Sourire, et ne rien dire", effets: { mort: "execution" }, texte: "Vous souriez jusqu'au bout. Dans la foule, quelqu'un ne l'oubliera jamais." },
      {
        label: "Regarder votre équipage dans la foule",
        si: { jauges: { equipage: 45 } },
        test: {
          jauge: "equipage",
          difficulte: 65,
          reussite: { texte: "La foudre tombe sur l'échafaud. Quand la fumée se dissipe, vous êtes sur les épaules de votre second, et vous riez.", effets: { retirerFlags: ["prisonnier"], flags: ["evade"], primeX: 1.5, jauges: { equipage: 8 } } },
          echec: { texte: "Ils sont venus. Ils n'étaient pas assez nombreux.", effets: { mort: "execution" } },
        },
        auto: 3,
      },
    ],
    clinOeil: { id: "pir-echafaud", ref: "L'échafaud de Loguetown, celui de Roger, et Luffy qui y sourit avant que la foudre ne tombe.", arc: "Loguetown" },
  },
];

// ── 4. La route de Grand Line ──

const route: Evenement[] = [
  {
    id: "pir-loguetown",
    quand: actif({ zone: ["east-blue"], annee: [1500, 1540], compteurs: { "annees:pirate": 1 } }),
    poids: 8,
    tension: 2,
    titre: "La ville du début et de la fin",
    texte: "À Loguetown, tous les pirates d'East Blue font la même chose avant Grand Line : ils vont voir l'échafaud où le Roi des Pirates est mort. Vous y êtes. Il est plus petit que vous ne pensiez.",
    choix: [
      { label: "Monter sur l'échafaud", effets: { jauges: { haki: 2 }, prime: 2_000_000 }, texte: "La foule murmure. Un marine fume deux cigares au bout de la place, et il vous regarde." },
      { label: "Rester en bas, chapeau à la main", effets: { jauges: { savoir: 1, equipage: 1 } }, texte: "Vous pensez à ce qu'il a vu, là-haut. La place entière, et la mer derrière." },
    ],
    clinOeil: { id: "pir-loguetown", ref: "Loguetown, ville natale et lieu d'exécution de Roger, où Luffy grimpe sur l'échafaud sous les yeux de Smoker.", arc: "Loguetown" },
    rencontre: "smoker",
  },
  {
    id: "pir-reverse-mountain",
    quand: actif({ zone: BLUES, age: [15, 55], compteurs: { "annees:pirate": 2 } }),
    poids: 9,
    repetable: 3,
    tension: 4,
    titre: "Reverse Mountain",
    texte: "Les quatre mers se jettent dans le même courant, qui monte une montagne et redescend de l'autre côté. Au-delà, c'est Grand Line, le cimetière des pirates. L'équipage attend votre avis.",
    bascule: true,
    choix: [
      {
        label: "Monter la montagne",
        test: {
          jauge: "savoir",
          difficulte: 22,
          reussite: { texte: "Le navire grimpe une rivière qui défie le ciel, puis plonge dans des nuages. Vous hurlez tous. De joie, surtout.", effets: { aller: { ile: "cap-des-jumeaux" }, jauges: { equipage: 3 } } },
          echec: { texte: "Le gouvernail casse contre la paroi. Vous passez quand même, mais pas tous.", effets: { aller: { ile: "cap-des-jumeaux" }, sante: -12, lien: { mort: "compagnon" } } },
        },
        auto: 2,
      },
      { label: "Rester dans les eaux qu'on connaît", effets: { jauges: { savoir: 1 } }, texte: "Il y a des pirates heureux qui n'ont jamais vu Grand Line. Vous serez peut-être l'un d'eux." },
    ],
  },
  {
    id: "pir-laboon",
    quand: actif({ ile: ["cap-des-jumeaux"], annee: [1475, 1530] }),
    poids: 200,
    tension: 3,
    titre: "La baleine",
    texte: "Au pied de la montagne, une baleine immense cogne sa tête couverte de cicatrices contre la Red Line. Un vieux médecin, sur le phare, dit qu'elle attend des amis depuis des dizaines d'années.",
    rencontre: "laboon",
    effets: { rencontre: "crocus" },
    choix: [
      { label: "Rester un jour pour écouter le vieil homme", effets: { jauges: { savoir: 3 } }, texte: "Il vous parle d'un équipage de musiciens partis dans la Calm Belt. Il ne dit pas qu'ils sont morts. Il n'a pas besoin de le dire." },
      { label: "Promettre à la baleine de revenir", effets: { flags: ["promesse", "promesse-laboon"] }, texte: "Vous le criez à la mer. La baleine pousse un cri qui fait trembler le phare. Elle a entendu." },
      { label: "Régler le Log Pose et repartir", texte: "La première aiguille de votre vie tremble, puis s'immobilise. Grand Line commence." },
    ],
    clinOeil: { id: "pir-laboon", ref: "Laboon, la baleine du Cap des Jumeaux, qui attend les pirates de Rumbar, et Crocus, son gardien.", arc: "Reverse Mountain" },
  },
  {
    id: "pir-ville-qui-vous-attendait",
    quand: actif({ zone: ["paradis"], annee: [1515, 1522], age: [16, 50] }),
    poids: 6,
    tension: 3,
    titre: "Une ville qui vous attendait",
    texte: "On vous accueille avec des fanfares, des barriques et des chansons. Le maire vous serre la main trop longtemps. À minuit, tout le monde dort, sauf la ville.",
    choix: [
      {
        label: "Boire avec eux",
        test: {
          jauge: "pc",
          difficulte: 32,
          reussite: { texte: "Ils sortent les fusils à minuit. Vous n'étiez pas aussi ivre qu'ils le pensaient. Au matin, une centaine de chasseurs dorment sur la place.", effets: { jauges: { equipage: 4 }, prime: 5_000_000, compteurs: { "combats-gagnes": 1 } } },
          echec: { texte: "Vous vous réveillez ligoté{/e} dans une cave. La moitié de l'équipage a été vendue à la Marine.", effets: { jauges: { equipage: -8 }, lien: { perdre: "compagnon" } } },
        },
      },
      { label: "Rester sobre sur le pont", effets: { jauges: { haki: 2 } }, texte: "Vous voyez les fusils sortir à minuit. Vous levez l'ancre avant le premier coup de feu." },
      { label: "Accepter leur offre : rejoindre l'agence", effets: { camp: "pegre", flags: ["agent-numero"], retirerFlags: ["en-mer"] }, texte: "On vous donne un numéro au lieu d'un nom. Le patron, personne ne l'a jamais vu.", auto: 0.3 },
    ],
    clinOeil: { id: "pir-whisky-peak", ref: "Whisky Peak, la ville-piège des chasseurs de Baroque Works, et Zoro qui abat cent chasseurs après la fête.", arc: "Whisky Peak" },
    rencontre: "crocodile",
  },
  {
    id: "pir-little-garden",
    quand: actif({ zone: ["paradis"], annee: [1430, 1522], age: [16, 60] }),
    poids: 3,
    rarete: "peu-commun",
    tension: 2,
    titre: "Les deux géants",
    texte: "Sur une île préhistorique, deux géants se battent depuis cent ans. Ils ne savent plus pourquoi. Chaque fois que le volcan fume, ils reprennent. Entre deux coups, ils vous offrent du dinosaure grillé.",
    effets: { jauges: { haki: 2 }, compteurs: { banquets: 1 }, rencontre: ["dorry", "brogy"] },
    clinOeil: { id: "pir-little-garden", ref: "Dorry et Brogy, les deux guerriers d'Elbaf en duel depuis un siècle sur Little Garden.", arc: "Little Garden" },
  },
  {
    id: "pir-mock-town",
    quand: actif({ zone: ["paradis"], annee: [1518, 1522], age: [16, 60] }),
    poids: 5,
    tension: 2,
    titre: "Le rire des autres",
    texte: "À Mock Town, un pirate à la prime confortable rit de vous devant toute la taverne. « Les îles dans le ciel ? Le trésor du Roi ? Le temps des rêves est fini. »",
    choix: [
      { label: "Ne pas répondre", effets: { jauges: { haki: 3 } }, texte: "Il vous frappe. Vous ne rendez pas le coup. Il y a des combats qui ne valent rien." },
      {
        label: "Lui fermer la bouche",
        test: {
          jauge: "pc",
          difficulte: 38,
          reussite: { texte: "Un seul coup. Il passe à travers le plancher. Personne ne rit plus.", effets: { prime: 6_000_000, jauges: { force: 2 } } },
          echec: { texte: "Il rebondit sur les murs comme un ressort. Vous ne voyez rien venir.", effets: { sante: -12 } },
        },
      },
      { label: "Lui demander pourquoi il a arrêté de rêver", effets: { jauges: { savoir: 2 } }, texte: "Il ne répond pas. Il commande un autre verre et ne vous regarde plus." },
    ],
    clinOeil: { id: "pir-mock-town", ref: "Bellamy la Hyène à Mock Town, qui se moque des rêveurs, et Luffy qui refuse de se battre.", arc: "Jaya" },
    rencontre: "bellamy",
  },
  {
    id: "pir-knock-up-stream",
    quand: actif({ zone: ["paradis"], age: [16, 60] }),
    poids: 3,
    rarete: "peu-commun",
    tension: 4,
    titre: "Le courant ascendant",
    texte: "Un vieux rêveur couvert de dettes jure que les îles du ciel existent. Il suffit de se laisser porter par un courant qui jaillit de la mer jusqu'aux nuages. Tout le monde le traite de menteur.",
    choix: [
      {
        label: "Tenter le coup",
        test: {
          jauge: "chance",
          difficulte: 45,
          reussite: { texte: "La mer explose sous la coque et vous monte jusqu'au ciel. Il y avait vraiment une île au-dessus des nuages.", effets: { aller: { zone: "ciel" }, jauges: { savoir: 4, haki: 2 } } },
          echec: { texte: "Le courant vous recrache à la mer, dix mètres trop tôt. Le navire survit. Votre fierté, moins.", effets: { sante: -10 } },
        },
        auto: 2,
      },
      { label: "Rire avec les autres", texte: "Toute votre vie, vous vous demanderez s'il mentait." },
    ],
    clinOeil: { id: "pir-knock-up", ref: "Le Knock Up Stream qui propulse le Vogue Merry jusqu'à la mer blanche, et Montblanc Cricket, le rêveur moqué.", arc: "Jaya" },
  },
  {
    id: "pir-ciel",
    quand: actif({ zone: ["ciel"] }),
    poids: 60,
    tension: 2,
    titre: "La mer blanche",
    texte: [
      "Le navire flotte sur une mer de nuages. Des gens avec de petites ailes vous regardent comme on regarde des bêtes curieuses.",
      "Ici, la terre est un trésor rare, et l'on se bat pour elle depuis quatre cents ans. Un dieu, dit-on, entend tout ce que vous dites.",
    ],
    effets: { jauges: { savoir: 2 } },
  },
  {
    id: "pir-redescendre-du-ciel",
    quand: actif({ zone: ["ciel"] }),
    poids: 30,
    repetable: 1,
    tension: 2,
    titre: "La descente",
    texte: "Une pieuvre géante gonflée d'air vous porte jusqu'à la mer bleue. En bas, personne ne vous croira. Vous le savez déjà.",
    effets: { aller: { zone: "paradis" } },
  },
  {
    id: "pir-davy-back-fight",
    quand: actif({ zone: ["paradis"], annee: [1505, 1524], age: [16, 55] }),
    poids: 4,
    tension: 3,
    titre: "Le jeu des pirates",
    texte: "Un capitaine à la coupe de cheveux absurde vous défie à un jeu ancien : trois épreuves, et chaque victoire rapporte un membre de l'équipage adverse. Il collectionne les gens.",
    choix: [
      {
        label: "Accepter le duel",
        test: {
          jauge: "pc",
          difficulte: 30,
          reussite: { texte: "Vous gagnez. Vous choisissez le cuisinier adverse, qui pleure de joie. Il dit qu'on ne lui avait jamais demandé son avis.", effets: { lien: { creer: "compagnon", metier: "cuisinier", sexe: "h" }, jauges: { equipage: 3 } } },
          echec: { texte: "Vous perdez. {compagnon} passe dans l'autre camp, la tête basse. On lui donne un masque ridicule.", effets: { lien: { perdre: "compagnon" }, jauges: { equipage: -4 } } },
        },
      },
      { label: "Refuser et lever l'ancre", effets: { jauges: { equipage: -1 } }, texte: "Il vous traite de lâche pendant trois milles. Vous ne vous retournez pas." },
    ],
    clinOeil: { id: "pir-davy-back", ref: "Le Davy Back Fight de Foxy le Renard argenté, et Chopper perdu puis regagné.", arc: "Long Ring Long Land" },
  },
  {
    id: "pir-thriller-bark",
    quand: actif({ zone: ["paradis"], annee: [1510, 1521], age: [16, 60], pasFlags: ["sans-ombre"] }),
    poids: 3,
    rarete: "peu-commun",
    tension: 4,
    titre: "Le brouillard",
    texte: "Dans un triangle de brouillard, un navire grand comme une île. Des zombies vous servent le thé. Le soir, une paire de ciseaux immense vous coupe l'ombre comme on découpe du papier.",
    choix: [
      {
        label: "Courir après votre ombre",
        test: {
          jauge: "pc",
          difficulte: 45,
          reussite: { texte: "Vous la rattrapez dans un couloir. Elle se recolle à vos talons avec un bruit mouillé.", effets: { jauges: { force: 2, haki: 2 } } },
          echec: { texte: "Vous repartez sans ombre. Le premier rayon de soleil vous brûle comme un fer rouge.", effets: { flags: ["sans-ombre"], sante: -10 } },
        },
      },
      { label: "Fuir avant d'en perdre d'autres", effets: { flags: ["sans-ombre"] }, texte: "Vous fuyez. Désormais, vous vivez la nuit." },
    ],
    clinOeil: { id: "pir-ombres", ref: "Thriller Bark et Gecko Moria, qui volait les ombres pour animer ses zombies.", arc: "Thriller Bark" },
    rencontre: "moria",
  },
  {
    id: "pir-ombre-rendue",
    quand: { flags: ["sans-ombre"], annee: [1522, 1600] },
    poids: 200,
    tension: 2,
    titre: "Votre ombre",
    texte: "Un matin, sans prévenir, votre ombre revient se coller à vos pieds. Quelque part, quelqu'un a battu l'homme aux ciseaux. Vous restez une heure au soleil, à la regarder bouger.",
    effets: { retirerFlags: ["sans-ombre"], sante: 10 },
  },
  {
    id: "pir-water-seven",
    quand: actif({ ile: ["water-seven"], rangMin: 3 }),
    poids: 40,
    tension: 3,
    titre: "La ville des charpentiers",
    texte: "Les meilleurs charpentiers du monde inspectent votre navire. Le verdict tombe : la quille est brisée, il ne reprendra plus jamais la mer. Ils le disent doucement, comme des médecins.",
    choix: [
      { label: "Lui offrir des funérailles en mer", effets: { navire: "un navire tout neuf", jauges: { equipage: 5, haki: 2 } }, texte: "Vous l'incendiez au large, tous ensemble. Dans le crépitement, vous entendez une petite voix : « Pardon de ne pas pouvoir vous emmener plus loin. »" },
      { label: "Le faire réparer quand même", test: { jauge: "chance", difficulte: 50, reussite: { texte: "Contre tout avis, il tient. Il tiendra encore longtemps.", effets: { jauges: { equipage: 3 } } }, echec: { texte: "Il se brise en deux à la première tempête. Vous rentrez à la nage.", effets: { sante: -10, navire: "une épave rafistolée" } } } },
    ],
    clinOeil: { id: "pir-adieu-au-navire", ref: "Les adieux au Vogue Merry, brûlé en mer après Enies Lobby, qui parle à son équipage.", arc: "Water Seven" },
  },
  {
    id: "pir-marineford-par-erreur",
    quand: actif({ ile: ["marineford", "g5"] }),
    poids: 80,
    tension: 4,
    titre: "Mauvaise adresse",
    texte: "Le navigateur a mal lu le Log Pose. Le port où vous venez d'amarrer est plein de navires de guerre. Des centaines de marines vous regardent, aussi surpris que vous.",
    choix: [
      { label: "Lever l'ancre, vite", test: { jauge: "savoir", difficulte: 40, reussite: { texte: "Vous êtes partis avant qu'ils ne comprennent. Le journal en fait une caricature.", effets: { aller: { zone: "paradis" }, prime: 5_000_000 } }, echec: { texte: "Ils comprennent très vite.", effets: { flags: ["prisonnier"] } } } },
      { label: "Faire comme si de rien n'était", test: { jauge: "chance", difficulte: 55, reussite: { texte: "Vous achetez des cigarettes, saluez un officier et repartez. Personne ne vérifie. Personne n'y croira.", effets: { aller: { zone: "paradis" }, compteurs: { mensonges: 1 } } }, echec: { texte: "Le marchand de cigarettes vous reconnaît.", effets: { flags: ["prisonnier"] } } } },
    ],
  },
  {
    id: "pir-cap-sur-sabaody",
    quand: actif({ zone: ["paradis"], age: [16, 60], compteurs: { "annees:pirate": 4 }, pasFlags: ["vu-sabaody"] }),
    poids: 8,
    tension: 2,
    titre: "Le bout de Paradis",
    texte: "Toutes les aiguilles finissent par pointer vers le même endroit : l'archipel au pied de la Red Line, où l'on prépare les navires pour descendre sous la mer.",
    effets: { aller: { ile: "sabaody" }, flags: ["vu-sabaody"] },
  },
  {
    id: "pir-sabaody",
    quand: actif({ ile: ["sabaody"] }),
    poids: 60,
    repetable: 4,
    tension: 3,
    titre: "Le coating",
    texte: "Pour passer de l'autre côté, il faut couvrir le navire d'une bulle et descendre dix mille mètres sous la mer. Un vieil homme aux lunettes rondes propose de faire le travail. Il a l'air de savoir.",
    choix: [
      { label: "Descendre vers le Nouveau Monde", effets: { aller: { ile: "ile-des-hommes-poissons" }, jauges: { equipage: 2 } }, texte: "Il vous regarde partir longtemps, un verre à la main. Vous jureriez qu'il sourit à quelqu'un d'autre.", auto: 2 },
      { label: "Rester à Paradis", effets: { aller: { zone: "paradis" } }, texte: "Beaucoup s'arrêtent ici. Ce n'est pas de la honte. C'est de la mémoire." },
    ],
    clinOeil: { id: "pir-coating", ref: "Silvers Rayleigh, l'ancien second de Roger, qui fait du coating à Sabaody et boit chez Shakky.", arc: "Sabaody" },
    rencontre: "rayleigh",
  },
  {
    id: "pir-sabaody-dragon",
    quand: actif({ ile: ["sabaody"], age: [16, 70] }),
    poids: 20,
    tension: 5,
    titre: "Le passant",
    texte: "La rue se vide. Tout le monde s'agenouille. Un homme en scaphandre passe, tire sur un passant qui ne s'est pas baissé assez vite, et repart en riant.",
    choix: [
      { label: "Vous agenouiller", effets: { flags: ["honte-sabaody"] }, texte: "Vous gardez le front contre le pavé. Ça revient, parfois, la nuit." },
      { label: "Porter le blessé chez un médecin", effets: { jauges: { equipage: 3, haki: 2 }, compteurs: { "vies-sauvees": 1 } }, texte: "Il s'en sortira. Il ne saura jamais votre nom." },
      {
        label: "Le frapper",
        test: {
          jauge: "pc",
          difficulte: 80,
          reussite: { texte: "Il vole à travers la rue. Un amiral arrive dans l'heure, et vous n'êtes déjà plus là. Le monde entier connaît votre visage.", effets: { primeX: 3, prime: 50_000_000, flags: ["ennemi-des-dragons"], jauges: { equipage: 10 } } },
          echec: { texte: "Une lumière jaune, une voix traînante, et plus rien. On vous emmène.", effets: { flags: ["prisonnier", "ennemi-des-dragons"], sante: -25, primeX: 2, rencontre: "kizaru" } },
        },
        auto: 0.3,
      },
    ],
    clinOeil: { id: "pir-dragon-celeste", ref: "Saint Charlos tirant sur des passants à Sabaody, Luffy qui le frappe, et Kizaru qui débarque.", arc: "Sabaody" },
  },
  {
    id: "pir-kuma",
    quand: actif({ zone: ["paradis"], annee: [1510, 1522], age: [16, 70] }),
    poids: 2,
    rarete: "peu-commun",
    tension: 4,
    titre: "Une question",
    texte: "Un géant tenant une Bible se dresse devant vous. Il ne menace pas. Il pose une question, très calmement : « Si tu pouvais partir en voyage, où irais-tu ? »",
    rencontre: "kuma",
    choix: [
      { label: "« Là où il fait chaud »", effets: { aller: { zone: "south-blue" } }, texte: "Il retire son gant. Il pose sa paume sur vous. Vous volez trois jours. Vous atterrissez dans un champ de cannes à sucre." },
      { label: "« Là où personne ne me connaît »", effets: { aller: { zone: "nouveau-monde" } }, texte: "Sa patte vous touche à peine. Vous vous réveillez sur une île inconnue, de l'autre côté de la Red Line." },
      { label: "« Nulle part. Je reste avec les miens »", effets: { jauges: { haki: 3, equipage: 3 } }, texte: "Il vous regarde longtemps. Puis il range son gant et s'en va. Vous ne saurez jamais pourquoi." },
    ],
    clinOeil: { id: "pir-ou-voudrais-tu-partir", ref: "Bartholomew Kuma et sa question, avant d'expédier l'équipage de Luffy aux quatre coins du monde.", arc: "Sabaody" },
  },
  {
    id: "pir-ile-des-hommes-poissons",
    quand: actif({ zone: ["fond-marin"], non: { peuple: ["homme-poisson", "sirene"] } }),
    poids: 60,
    tension: 2,
    titre: "Dix mille mètres sous la mer",
    texte: [
      "La bulle traverse des abysses noirs, puis une lumière : une île entière sous une coupole, des sirènes, des coraux plus hauts que des maisons. Le soleil arrive jusqu'ici par les racines d'un arbre immense.",
      "Sur l'île des Hommes-Poissons, on vous regarde avec méfiance. Les humains, ici, ont mauvaise réputation. Ils l'ont méritée.",
    ],
    effets: { jauges: { savoir: 2 }, flags: ["vu-ile-hp"] },
  },
  {
    id: "pir-vers-le-nouveau-monde",
    quand: actif({ zone: ["fond-marin"], un: [{ flags: ["vu-ile-hp"] }, { peuple: ["homme-poisson", "sirene"] }] }),
    poids: 25,
    repetable: 1,
    tension: 4,
    titre: "Le Nouveau Monde",
    texte: "La bulle remonte vers la surface, de l'autre côté de la Red Line. Le Log Pose a maintenant trois aiguilles. L'une d'elles s'affole déjà.",
    bascule: true,
    choix: [
      { label: "Entrer dans le Nouveau Monde", effets: { aller: { zone: "nouveau-monde" } }, texte: "Le premier jour, la mer est rouge et le ciel est vert. Paradis, finalement, portait bien son nom.", auto: 3 },
      { label: "Remonter vers Paradis", effets: { aller: { zone: "paradis" } }, texte: "Vous faites demi-tour. Vous aurez vu les deux côtés du monde, c'est déjà beaucoup." },
    ],
  },
  {
    id: "pir-reprendre-la-mer",
    quand: actif({ zone: ["elbaf", "calm-belt", "red-line"] }),
    poids: 30,
    repetable: 2,
    tension: 1,
    texte: "Le navire est réparé, les vivres embarqués. Il est temps de retrouver les routes des pirates.",
    effets: { aller: { zone: "nouveau-monde" } },
  },
];

// ── 5. Son propre pavillon ──

const capitaine: Evenement[] = [
  {
    id: "pir-fonder-son-equipage",
    quand: actif({ rangMin: 1, rangMax: 2, age: [18, 50], compteurs: { "annees:pirate": 2 }, un: [{ jauges: { equipage: 22 } }, { jauges: { force: 32 } }, { reve: ["roi-des-pirates", "voir-le-monde", "navire-legendaire"] }] }),
    poids: 7,
    tension: 4,
    titre: "Votre propre pavillon",
    texte: "Une vieille coque à vendre au port, pour presque rien. Trois matelots qui vous suivraient n'importe où. Il ne manque plus que votre décision.",
    bascule: true,
    choix: [
      {
        label: "Fonder votre équipage",
        effets: { grade: "capitaine-pirate", flags: ["capitaine-de-son-equipage"], lien: [{ perdre: "capitaine" }, { creer: "compagnon" }], navire: "une vieille coque", suite: "pir-baptiser" },
        texte: "Vous serrez la main de votre ancien capitaine. Il vous dit que vous ferez un mauvais capitaine. Il sourit en le disant.",
        auto: 2,
      },
      { label: "Rester fidèle à {capitaine}", si: { lien: { capitaine: true } }, effets: { jauges: { equipage: 3 } }, texte: "Ce n'est pas encore le moment. Peut-être que ce ne le sera jamais, et ce n'est pas grave." },
      { label: "Pas encore", si: { lien: { capitaine: false } }, effets: { jauges: { force: 1 } }, texte: "Vous regardez la coque longtemps. Elle sera vendue à quelqu'un d'autre." },
    ],
  },
  {
    id: "pir-baptiser",
    pool: "chaine",
    tension: 2,
    titre: "Le nom",
    texte: "Il faut un nom pour l'équipage, quelque chose qu'on criera dans les abordages et qu'on lira sous les avis de recherche. Tout le monde a une idée. Elles sont toutes mauvaises.",
    choix: [
      { label: "Les Pirates de {famille}", effets: { equipageNom: "les Pirates de {famille}", suite: "pir-pavillon" } },
      { label: "Les Pirates du Vent Debout", effets: { equipageNom: "les Pirates du Vent Debout", suite: "pir-pavillon" } },
      { label: "Les Pirates de la Dernière Chance", effets: { equipageNom: "les Pirates de la Dernière Chance", suite: "pir-pavillon" } },
      { label: "L'équipage de {prenom}, tout simplement", effets: { equipageNom: "l'équipage de {prenom}", suite: "pir-pavillon" } },
    ],
  },
  {
    id: "pir-pavillon",
    pool: "chaine",
    tension: 2,
    titre: "Le pavillon",
    texte: "Vous avez un drap noir, un pot de peinture blanche et tout l'équipage autour de vous. Il manque un symbole. On vous tend le pinceau.",
    choix: [
      { label: "Le dessiner vous-même", effets: { flags: ["pavillon-maison"], jauges: { equipage: 5 }, suite: "pir-navire" }, texte: "Le crâne ressemble à une pomme de terre inquiète. L'équipage l'adore. Personne ne veut qu'on le refasse." },
      { label: "Laisser le plus doué le refaire proprement", effets: { jauges: { equipage: 2, savoir: 2 }, suite: "pir-navire" }, texte: "Il rectifie votre esquisse sans rien dire. Le résultat fait vraiment peur. C'est un peu dommage." },
      { label: "Copier le pavillon d'un pirate célèbre", effets: { flags: ["imposteur"], prime: 2_000_000, suite: "pir-navire" }, texte: "Dans les ports, on vous confond avec plus fort que vous. Ça marche, pour l'instant." },
    ],
    clinOeil: { id: "pir-pavillon-rate", ref: "Le pavillon raté dessiné par Luffy, redessiné par Usopp ; l'imposteur rappelle les faux Chapeaux de paille de Sabaody.", arc: "Syrup" },
  },
  {
    id: "pir-navire",
    pool: "chaine",
    tension: 1,
    titre: "Le navire",
    texte: "On peint le nom sur la poupe en lettres maladroites. Un navire sans nom, disent les vieux, ne revient jamais.",
    choix: [
      { label: "La Mouette Ivre", effets: { navire: "la Mouette Ivre" } },
      { label: "Le Lendemain", effets: { navire: "le Lendemain" } },
      { label: "La Vieille Promesse", effets: { navire: "la Vieille Promesse" } },
      { label: "Le nom de votre mère", si: { flags: ["lien:mere"] }, effets: { navire: "le {mere}", jauges: { haki: 1 } } },
    ],
  },
  {
    id: "pir-imposteur-demasque",
    quand: actif({ flags: ["imposteur"], compteurs: { "annees:pirate": 4 } }),
    poids: 15,
    tension: 4,
    titre: "L'original",
    texte: "Le pirate dont vous copiez le pavillon depuis des années est dans la même baie. Il regarde votre drapeau. Puis il vous regarde, vous.",
    choix: [
      { label: "Vous excuser et repeindre", effets: { retirerFlags: ["imposteur"], flags: ["pavillon-maison"], jauges: { equipage: -2, haki: 2 } }, texte: "Il rit. Il vous offre à boire. Il dit que lui aussi a copié, au début." },
      { label: "L'affronter", test: { jauge: "pc", difficulte: 50, reussite: { texte: "Vous gagnez. Désormais, le pavillon est à vous pour de bon.", effets: { retirerFlags: ["imposteur"], prime: 20_000_000 } }, echec: { texte: "Il brûle votre drapeau et vous laisse la vie. C'est pire.", effets: { retirerFlags: ["imposteur"], sante: -15, jauges: { equipage: -5 } } } } },
    ],
  },
  {
    id: "pir-compagnon-meurt",
    quand: actif({ age: [16, 80], lien: { compagnon: true } }),
    poids: 3,
    repetable: 6,
    tension: 5,
    titre: "{compagnon}",
    texte: [
      "{compagnon} s'est jeté{compagnon:/e} devant la balle qui vous était destinée. {compagnon:Il/Elle} a souri en tombant, comme si c'était une bonne blague.",
      "Une fièvre, trois jours, et {compagnon} n'est plus là. {compagnon:Il/Elle} vous a demandé de continuer. {compagnon:Il/Elle} n'a pas dit quoi.",
    ],
    effets: { lien: { mort: "compagnon" } },
    choix: [
      { label: "L'enterrer sur une île, face à la mer", effets: { jauges: { haki: 3 } }, texte: "Vous plantez son arme dans le sable. Vous ne reviendrez jamais, et vous le savez." },
      { label: "Le confier à la mer", effets: { jauges: { equipage: 3 } }, texte: "L'équipage chante. Vous ne chantez pas. Vous tenez la barre jusqu'au matin." },
      { label: "Jurer de finir ce qu'{compagnon:il/elle} avait commencé", effets: { flags: ["promesse"], jauges: { haki: 2, force: 2 } }, texte: "Vous gardez son foulard au poignet. Vous ne l'enlèverez plus." },
    ],
  },
  {
    id: "pir-compagnon-reve",
    quand: actif({ age: [16, 70], lien: { compagnon: true } }),
    poids: 5,
    repetable: 8,
    tension: 1,
    titre: "Le rêve de {compagnon}",
    texte: [
      "Une nuit, {compagnon} vous avoue son rêve : retrouver une mer où vivent tous les poissons du monde. {compagnon:Il/Elle} attend que vous riiez.",
      "{compagnon} veut dessiner la carte du monde entier. {compagnon:Il/Elle} vous montre ses croquis, en rougissant.",
      "{compagnon} veut un jour revoir quelqu'un qu'{compagnon:il/elle} a laissé derrière. {compagnon:Il/Elle} ne dit pas qui.",
    ],
    choix: [
      { label: "Promettre de l'y emmener", effets: { flags: ["promesse"], jauges: { equipage: 4 } }, texte: "{compagnon} ne dit rien. {compagnon:Il/Elle} vous frappe l'épaule, fort." },
      { label: "Rire, puis lui dire que c'est possible", effets: { jauges: { equipage: 2, haki: 1 } }, texte: "Vous ne vous moquez jamais d'un rêve. C'est la seule règle du bord." },
    ],
  },
  {
    id: "pir-compagnon-part",
    quand: actif({ age: [20, 75], lien: { compagnon: true }, compteurs: { "annees:pirate": 5 } }),
    poids: 3,
    repetable: 8,
    tension: 3,
    titre: "Le départ",
    texte: "{compagnon} a trouvé ce qu'{compagnon:il/elle} cherchait : une île, quelqu'un, une raison de rester. {compagnon:Il/Elle} ne sait pas comment vous le dire.",
    choix: [
      { label: "Lui dire de partir", effets: { lien: { perdre: "compagnon" }, jauges: { haki: 2 } }, texte: "Vous lui tendez son sac avant qu'{compagnon:il/elle} ne le demande. Sur le quai, {compagnon:il/elle} salue jusqu'à ce que le navire disparaisse." },
      { label: "Lui demander de rester", test: { jauge: "equipage", difficulte: 35, reussite: { texte: "{compagnon:Il/Elle} reste. Vous ne saurez jamais si c'était le bon choix.", effets: { jauges: { equipage: 2 } } }, echec: { texte: "{compagnon:Il/Elle} part quand même, sans dire au revoir.", effets: { lien: { perdre: "compagnon" }, jauges: { equipage: -3 } } } } },
    ],
  },
  {
    id: "pir-enfant-du-port",
    quand: actif({ rangMin: 3, age: [25, 60], pasFlags: ["chapeau-confie"] }),
    poids: 3,
    rarete: "peu-commun",
    tension: 4,
    titre: "Le gamin du port",
    texte: "Depuis un an, un gamin de l'île où vous faites escale vous supplie de l'emmener. Ce matin, vous partez pour de bon. Il pleure sur le quai, les poings serrés.",
    choix: [
      { label: "Lui confier votre chapeau", effets: { flags: ["chapeau-confie", "promesse"], jauges: { haki: 3 }, planifier: { id: "pir-le-chapeau-revient", dans: [12, 18] } }, texte: "« Rends-le-moi quand tu seras devenu un grand pirate. » Le chapeau lui tombe sur les yeux." },
      { label: "L'emmener", effets: { lien: { creer: "compagnon", sexe: "h" }, jauges: { equipage: 2 } }, texte: "Il a le mal de mer pendant un mois et ne s'en plaint jamais." },
      { label: "Partir sans vous retourner", texte: "Il criera votre nom jusqu'au bout du quai. Vous l'entendrez encore longtemps." },
    ],
    clinOeil: { id: "pir-chapeau-confie", ref: "Shanks qui pose son chapeau de paille sur la tête de Luffy, à Fuchsia : « Rends-le-moi quand tu seras devenu un grand pirate. »", arc: "Romance Dawn" },
  },
  {
    id: "pir-le-chapeau-revient",
    pool: "chaine",
    quand: { flags: ["chapeau-confie"] },
    tension: 4,
    titre: "Le chapeau",
    texte: "Un journal, à la page des avis de recherche. Un jeune visage, une grande prime, et sur sa tête, votre vieux chapeau, rapiécé. Il n'est pas encore venu vous le rendre. Il viendra.",
    effets: { jauges: { haki: 4, equipage: 3 } },
  },
  {
    id: "pir-duel-de-capitaines",
    quand: actif({ rangMin: 3, prime: 1, age: [18, 70] }),
    poids: 5,
    repetable: 4,
    tension: 4,
    titre: "Deux capitaines",
    texte: [
      "Un capitaine rival vous attend sur la plage, seul. « Pas d'équipage, pas de canon. Toi et moi, et le perdant baisse son pavillon. »",
      "Votre rival de toujours a encore croisé votre route. Il a une nouvelle cicatrice, et une prime plus haute que la vôtre. Il veut que ça change.",
    ],
    choix: [
      { label: "Accepter le duel", test: { jauge: "pc", difficulte: 42, reussite: { texte: "Il tombe à genoux. Vous ne prenez pas son pavillon. Vous prenez juste son respect.", effets: { prime: 15_000_000, jauges: { force: 2, equipage: 3 }, compteurs: { "combats-gagnes": 1 } } }, echec: { texte: "Vous perdez. Vous baissez votre pavillon devant tout le monde. Ça brûle plus qu'une blessure.", effets: { sante: -15, jauges: { equipage: -4 } } } } },
      { label: "Refuser : vous avez mieux à faire", effets: { jauges: { haki: 1 } }, texte: "Il crie au lâche. Votre équipage sait que vous n'êtes pas lâche. Ça suffit." },
    ],
  },
  {
    id: "pir-alliance",
    quand: actif({ rangMin: 3, zone: ["paradis", "nouveau-monde"], age: [20, 70] }),
    poids: 3,
    tension: 3,
    titre: "L'alliance",
    texte: "Un autre capitaine vous propose une alliance. Ensemble, vous pourriez attaquer plus grand que vous. Mais une alliance de pirates, ça ne dure que tant qu'elle arrange.",
    choix: [
      { label: "Accepter", test: { jauge: "chance", difficulte: 45, reussite: { texte: "L'alliance tient. Contre toute attente, il devient un ami.", effets: { prime: 20_000_000, lien: { creer: "ami" }, jauges: { equipage: 3 } } }, echec: { texte: "Il vous vend à la Marine dès le premier coup réussi.", effets: { flags: ["trahi"], jauges: { equipage: -4 }, sante: -10 } } } },
      { label: "Refuser", texte: "Vous préférez être petit et libre. Il vous trouve naïf. Il a peut-être raison." },
    ],
    clinOeil: { id: "pir-alliance", ref: "L'alliance entre Luffy et Law à Punk Hazard, que tout le monde jugeait vouée à la trahison.", arc: "Punk Hazard" },
  },
  {
    id: "pir-grande-flotte",
    quand: actif({ rangMin: 3, prime: 80_000_000, jauges: { equipage: 50 }, age: [22, 70], pasFlags: ["grande-flotte"] }),
    poids: 4,
    rarete: "peu-commun",
    tension: 4,
    titre: "Les coupes de saké",
    texte: "Sept capitaines que vous avez aidés, un jour ou l'autre, montent à bord avec une coupe de saké chacun. Ils veulent devenir vos subordonnés. Vous n'avez rien demandé.",
    choix: [
      { label: "Boire avec eux", effets: { flags: ["grande-flotte"], prime: 100_000_000, jauges: { equipage: 8 } }, texte: "Vous buvez. Le lendemain, cinq mille pirates savent votre nom." },
      { label: "Refuser : vous voulez des amis, pas des vassaux", effets: { flags: ["grande-flotte"], prime: 60_000_000, jauges: { equipage: 5, haki: 2 } }, texte: "Ils boivent quand même. « Tu n'as pas à accepter. On a juste décidé. »" },
    ],
    clinOeil: { id: "pir-grande-flotte", ref: "La Grande Flotte du Chapeau de paille, sept équipages qui boivent la coupe du serment après Dressrosa.", arc: "Dressrosa" },
  },
];

/** Les recrues : un capitaine cherche ce qui manque à son navire. */
const RECRUES: { metier: Metier; sexe: "h" | "f"; texte: string; oui: string }[] = [
  { metier: "cuisinier", sexe: "h", texte: "Depuis trois mois, on mange du biscuit de mer et du poisson cru. Dans un restaurant flottant, un cuisinier qui se bat avec les pieds refuse de vous servir sans payer.", oui: "Il vient. Le soir même, l'équipage pleure devant une soupe." },
  { metier: "navigateur", sexe: "f", texte: "Vous vous êtes encore perdus. Dans le port, une jeune cartographe vend des cartes trop précises pour être honnêtes.", oui: "Elle accepte de naviguer pour vous, à condition de garder la moitié des trésors." },
  { metier: "medecin", sexe: "h", texte: "La moitié de l'équipage tousse. Sur une île d'hiver, un médecin bizarre soigne les gens que personne ne veut soigner.", oui: "Il hésite longtemps. Puis il prend sa sacoche. « Quelqu'un doit vous garder en vie, bande d'idiots. »" },
  { metier: "charpentier", sexe: "h", texte: "Le navire prend l'eau par trois endroits. Sur le chantier, un charpentier chante en réparant une coque qui n'est pas à lui.", oui: "Il tapote votre bastingage. « Il mérite mieux que vous. Je viens pour lui. »" },
  { metier: "musicien", sexe: "h", texte: "Le silence pèse sur le pont depuis des semaines. Dans une taverne, un musicien joue une chanson de pirate que vous connaissiez enfant.", oui: "Il monte à bord avec son violon. Le silence ne revient jamais." },
  { metier: "tireur", sexe: "h", texte: "Les canonniers de la Marine vous touchent toujours, et les vôtres jamais. Au bout du port, quelqu'un abat une mouette à trois cents pas, sans regarder.", oui: "Il ment beaucoup, sur tout. Sauf quand il vise." },
  { metier: "epeiste", sexe: "f", texte: "Une silhouette attachée à un poteau, au soleil, depuis des jours. On dit qu'elle a défié un officier de la Marine. Elle a trois sabres et aucun sens de l'orientation.", oui: "Vous la détachez. Elle vous suit. Elle se perd en route vers le navire." },
];

for (const r of RECRUES) {
  capitaine.push({
    id: `pir-recrue-${r.metier}`,
    quand: actif({ flags: ["capitaine-de-son-equipage"], pasFlags: [`recrue-${r.metier}`], age: [17, 70] }),
    poids: 6,
    tension: 2,
    titre: "Une recrue",
    texte: r.texte,
    choix: [
      {
        label: "Lui proposer de vous suivre",
        test: {
          jauge: "equipage",
          difficulte: 18,
          reussite: { texte: r.oui, effets: { lien: { creer: "compagnon", metier: r.metier, sexe: r.sexe }, flags: [`recrue-${r.metier}`], jauges: { equipage: 4 } } },
          echec: { texte: "Refus poli. Vous reviendrez peut-être, avec de meilleurs arguments.", effets: { jauges: { equipage: 1 } } },
        },
      },
      { label: "Vous débrouiller sans", effets: { flags: [`recrue-${r.metier}`] }, texte: "Vous vous débrouillez. Mal, mais vous vous débrouillez." , auto: 0.3 },
    ],
    clinOeil: r.metier === "epeiste" ? { id: "pir-epeiste-attache", ref: "Zoro attaché à un poteau à Shells Town, que Luffy vient recruter.", arc: "Shells Town" } : undefined,
  });
}

// ── 6. Les primes ──

const primes: Evenement[] = [
  {
    id: "pir-photo-ratee",
    quand: actif({ prime: 1, pasFlags: ["photo-ratee"] }),
    poids: 2,
    rarete: "peu-commun",
    tension: 1,
    titre: "Le portrait",
    texte: "Le nouvel avis de recherche est arrivé. Le chiffre est juste. Le portrait, lui, est un dessin d'enfant : on dirait vaguement un cochon avec vos sourcils.",
    choix: [
      { label: "Écrire au journal pour protester", effets: { flags: ["photo-ratee"], jauges: { savoir: 1 } }, texte: "On vous répond poliment que le dessinateur a fait de son mieux." },
      { label: "S'en réjouir : personne ne vous reconnaîtra", effets: { flags: ["photo-ratee"], jauges: { equipage: 2 } }, texte: "L'équipage l'affiche dans la cambuse et le salue tous les matins." },
    ],
    clinOeil: { id: "pir-portrait-rate", ref: "Le premier avis de recherche de Sanji, un portrait raté que personne ne reconnaît.", arc: "Enies Lobby" },
  },
  {
    id: "pir-surnom",
    quand: actif({ prime: 15_000_000, pasFlags: ["a-un-surnom"] }),
    poids: 9,
    tension: 2,
    titre: "Un nom dans le journal",
    texte: "Le journal vous a donné un surnom. Les journalistes hésitaient entre plusieurs. Dans les tavernes, on attend de savoir lequel vous allez assumer.",
    choix: [
      { label: "{prenom} {le Rieur/la Rieuse}", si: { trait: ["rieur", "rire-contagieux"] }, effets: { surnom: "{prenom} {le Rieur/la Rieuse}", flags: ["a-un-surnom"] } },
      { label: "{prenom} aux Trois Lames", si: { metier: ["epeiste"] }, effets: { surnom: "{prenom} aux Trois Lames", flags: ["a-un-surnom"] } },
      { label: "{prenom} {le Démon/la Démone} des Mers", si: { fruit: true }, effets: { surnom: "{prenom} {le Démon/la Démone} des Mers", flags: ["a-un-surnom"] } },
      { label: "{prenom} {le Têtu/la Têtue}", effets: { surnom: "{prenom} {le Têtu/la Têtue}", flags: ["a-un-surnom"] } },
      { label: "{prenom} la Tempête", effets: { surnom: "{prenom} la Tempête", flags: ["a-un-surnom"] } },
      { label: "{prenom} Poing-de-Fer", si: { jauges: { force: 40 } }, effets: { surnom: "{prenom} Poing-de-Fer", flags: ["a-un-surnom"] } },
    ],
  },
  {
    id: "pir-famille-menacee",
    quand: actif({ prime: 5_000_000, age: [16, 60], unFlag: ["lien:mere", "lien:pere", "lien:frere", "lien:conjoint"] }),
    poids: 4,
    tension: 4,
    titre: "Une visite {deIleNatale}",
    texte: "Une lettre, d'une écriture que vous reconnaissez. La Marine est venue {aIleNatale}. Ils ont posé des questions sur vous. Ils ont dit qu'ils reviendraient.",
    choix: [
      { label: "Rentrer les voir, au risque d'être pris{/e}", test: { jauge: "chance", difficulte: 45, reussite: { texte: "Vous passez une nuit à la maison, une seule. Vous repartez avant l'aube, le cœur en morceaux et le ventre plein.", effets: { jauges: { haki: 3, equipage: 2 } } }, echec: { texte: "Ils vous attendaient. On vous arrête devant la porte.", effets: { flags: ["prisonnier"] } } } },
      { label: "Ne plus jamais écrire, pour les protéger", effets: { jauges: { haki: 2 } }, texte: "Vous brûlez la lettre. C'est la dernière que vous recevrez." },
    ],
  },
  {
    id: "pir-only-alive",
    quand: actif({ prime: 30_000_000, un: [{ peuple: ["lunarien", "buccaneer"] }, { trait: ["voix-de-toute-chose", "corps-singulier"] }] }),
    poids: 15,
    tension: 4,
    titre: "Uniquement vivant{/e}",
    texte: "Votre nouvel avis de recherche porte une mention qu'on ne voit presque jamais : « uniquement vivant{/e} ». Le Gouvernement ne veut pas votre mort. Il veut quelque chose que vous avez.",
    effets: { flags: ["only-alive"], primeX: 1.5 },
    clinOeil: { id: "pir-only-alive", ref: "L'avis « uniquement vivant » de Sanji après Whole Cake, et ce que le Gouvernement voulait vraiment.", arc: "Whole Cake Island" },
  },
  {
    id: "pir-dix-chiffres",
    quand: actif({ prime: 1_000_000_000, pasFlags: ["prime-milliard"] }),
    poids: 50,
    tension: 4,
    titre: "Dix chiffres",
    texte: "Votre prime vient de dépasser le milliard. Dans les ports, les gens se taisent quand votre navire entre. Les enfants jouent à être vous. Vous ne pouvez plus prendre un verre en paix.",
    effets: { flags: ["prime-milliard"], jauges: { equipage: 3 } },
  },
  {
    id: "pir-jumeau-marine",
    quand: actif({ prime: 1, jumeau: { memeZone: true, camp: ["marine"], ageMin: 18 } }),
    poids: 6,
    tension: 3,
    titre: "Le marine",
    texte: "Un officier de la Marine vous traque d'île en île depuis des mois. Il s'appelle {jumeau}. Quand vos regards se croisent enfin, sur un quai, vous avez l'impression absurde de vous connaître depuis toujours.",
    choix: [
      { label: "Le saluer", effets: { jauges: { haki: 2 } }, texte: "Il vous rend le salut, malgré lui. Puis il ordonne le feu." },
      { label: "Fuir sans vous retourner", effets: { jauges: { savoir: 1 } }, texte: "Vous vous demanderez longtemps pourquoi ce visage vous hante." },
    ],
  },
  {
    id: "pir-jumeau-rival",
    quand: actif({ rangMin: 1, jumeau: { memeZone: true, camp: ["pirate"], ageMin: 18 } }),
    poids: 5,
    tension: 2,
    titre: "Un autre pavillon",
    texte: "Dans la même baie, un autre équipage, et un pirate qui s'appelle {jumeau}. Vous buvez ensemble jusqu'à l'aube sans savoir pourquoi vous vous entendez si bien. Vous êtes nés le même jour, découvrez-vous. À la même heure.",
    effets: { compteurs: { banquets: 1 }, jauges: { equipage: 2 } },
  },
];

// Premières primes et réévaluations : l'ordre de grandeur dépend de la mer.
const MERS_PRIMES: { id: string; zones: Zone[]; premiere: number; hausse: number; plafond: number }[] = [
  { id: "blue", zones: BLUES, premiere: 3_000_000, hausse: 5_000_000, plafond: 40_000_000 },
  { id: "grand-line", zones: ["paradis", "ciel", "fond-marin"], premiere: 15_000_000, hausse: 30_000_000, plafond: 250_000_000 },
  { id: "nouveau-monde", zones: ["nouveau-monde", "wano", "elbaf"], premiere: 60_000_000, hausse: 90_000_000, plafond: 1_800_000_000 },
];

for (const m of MERS_PRIMES) {
  primes.push(
    {
      id: `pir-premiere-prime-${m.id}`,
      quand: actif({ zone: m.zones, prime: [0, 0], rangMin: 1, compteurs: { "annees:pirate": 1 } }),
      poids: 9,
      tension: 3,
      titre: "Votre visage sur un mur",
      texte: [
        "Sur le panneau du port, entre deux avis de recherche, il y a le vôtre. Vous avez l'air plus méchant{/e} que dans la vraie vie. Le chiffre, lui, est exact.",
        "Un matelot vous tend un papier encore humide d'encre : c'est vous. Le Gouvernement mondial a décidé que vous valiez quelque chose.",
      ],
      effets: { prime: m.premiere },
      choix: [
        { label: "Clouer l'affiche dans la cabine", effets: { jauges: { equipage: 3 } }, texte: "L'équipage fait la fête toute la nuit. Une prime, c'est un baptême." },
        { label: "La plier dans votre poche", effets: { flags: ["premiere-affiche"] }, texte: "Vous la garderez toute votre vie. Elle jaunira contre votre cœur." },
        { label: "Penser à ceux {deIleNatale}", effets: { jauges: { haki: 1 } }, texte: "Votre mère verra ce visage dans le journal. Vous espérez qu'elle le trouvera ressemblant." },
      ],
    },
    {
      id: `pir-hausse-de-prime-${m.id}`,
      quand: actif({ zone: m.zones, prime: [1, m.plafond], rangMin: 1 }),
      poids: 7,
      repetable: 2,
      tension: 2,
      titre: "Réévaluation",
      texte: [
        "Le journal a raconté votre dernier coup, en l'exagérant à peine. Le Gouvernement réévalue votre menace.",
        "Une mouette-facteur dépose le journal. Votre avis de recherche a changé de chiffre. L'équipage trinque à votre mauvaise réputation.",
        "Quelqu'un a survécu pour raconter. C'est toujours comme ça que les primes montent.",
      ],
      effets: { prime: m.hausse },
    },
  );
}

// ── 7. Le canon, de près ou de loin ──

const canon: Evenement[] = [
  {
    id: "pir-rocks",
    quand: actif({ zone: ["nouveau-monde"], annee: [1476, 1485], age: [18, 45], pasFlags: ["equipage-de-rocks"] }),
    poids: 3,
    rarete: "rare",
    tension: 4,
    titre: "L'île des pirates",
    texte: "Sur une île nommée d'après les abeilles, un capitaine rassemble les pires monstres des mers. Sur son navire, on s'entretue entre deux pillages. Il cherche encore des bras. Il ne demande pas si on veut vivre longtemps.",
    bascule: true,
    choix: [
      { label: "Monter à bord", effets: { flags: ["equipage-de-rocks"], prime: 30_000_000, jauges: { force: 4 }, rencontre: "rocks" }, texte: "Le premier jour, deux hommes se tuent pour un hamac. Un géant à la moustache en croissant vous apprend à dormir d'un œil." },
      { label: "Fuir cette île", texte: "Vous ne regrettez rien. Dans dix ans, vous comprendrez à quel point vous aviez raison." },
    ],
    clinOeil: { id: "pir-hachinosu", ref: "L'équipage de Rocks à Hachinosu, où naviguaient ensemble les futurs Barbe Blanche, Big Mom et Kaido.", arc: "Wano (flash-back)" },
  },
  {
    id: "pir-god-valley",
    quand: { flags: ["equipage-de-rocks"], annee: [1486, 1486], camp: ["pirate"] },
    poids: 1000,
    tension: 5,
    titre: "God Valley",
    texte: "Une île sacrée, des nobles venus chasser des esclaves, et votre capitaine qui veut tout prendre. Puis un héros de la Marine et un jeune pirate au chapeau de paille, côte à côte. Le ciel s'effondre.",
    bascule: true,
    effets: { rencontre: ["garp", "roger"] },
    choix: [
      { label: "Courir vers la mer", test: { jauge: "chance", difficulte: 48, reussite: { texte: "Vous nagez loin d'une île qui disparaît derrière vous. Le monde décidera que ce jour n'a jamais existé.", effets: { flags: ["survivant-god-valley"], retirerFlags: ["equipage-de-rocks"], prime: 80_000_000, jauges: { haki: 4 } } }, echec: { texte: "Il n'y a plus d'île.", effets: { mort: "god-valley" } } } },
      { label: "Rester aux côtés du capitaine", test: { jauge: "pc", difficulte: 70, reussite: { texte: "Vous survivez à quelque chose que le monde effacera des livres. Vous ne le raconterez jamais.", effets: { flags: ["survivant-god-valley"], retirerFlags: ["equipage-de-rocks"], prime: 150_000_000, jauges: { haki: 6, force: 4 } } }, echec: { texte: "Vous tombez avec lui.", effets: { mort: "god-valley" } } } },
    ],
    clinOeil: { id: "pir-god-valley", ref: "L'incident de God Valley : Garp et Roger alliés contre Rocks, et une île rayée de la carte.", arc: "Wano (flash-back)" },
  },
  {
    id: "pir-oro-jackson",
    quand: actif({ zone: ["paradis", "nouveau-monde"], annee: [1489, 1499], age: [14, 70] }),
    poids: 3,
    rarete: "peu-commun",
    tension: 3,
    titre: "Le navire du Roi",
    texte: "Dans le même port que vous, un grand navire à la proue en tête de lion. Deux mousses se disputent sur le quai : un rouquin au chapeau de paille et un gamin au gros nez rouge. Derrière eux, un homme rit si fort que les mouettes s'envolent.",
    effets: { jauges: { haki: 3 }, rencontre: ["roger", "shanks", "buggy"] },
    clinOeil: { id: "pir-mousses-de-roger", ref: "Shanks et Baggy, mousses sur l'Oro Jackson de Gol D. Roger, qui se disputaient sans cesse.", arc: "Wano (flash-back)" },
  },
  {
    id: "pir-edd-war",
    quand: actif({ zone: ["nouveau-monde"], annee: [1497, 1497] }),
    poids: 150,
    tension: 4,
    titre: "La bataille dans la tempête",
    texte: "Une flotte immense, venue d'îles qui flottent dans le ciel, attaque un seul navire dans la tempête. La flotte perd. On racontera longtemps que le temps lui-même avait choisi son camp.",
    effets: { jauges: { savoir: 2 }, rencontre: ["shiki", "roger"] },
    clinOeil: { id: "pir-edd-war", ref: "La bataille d'Edd War : la flotte de Shiki le Lion d'or contre Roger, défaite par une tempête.", arc: "Strong World" },
  },
  {
    id: "pir-trois-jours",
    quand: actif({ zone: ["nouveau-monde"], annee: [1498, 1498] }),
    poids: 150,
    tension: 4,
    titre: "Trois jours et trois nuits",
    texte: "Depuis trois jours, au large, la mer tremble et le ciel se fend. Deux capitaines se battent. Au quatrième matin, des marins passent avec des barriques : ils ont fini par boire ensemble.",
    effets: { jauges: { haki: 2 }, rencontre: ["roger", "barbe-blanche"] },
    clinOeil: { id: "pir-trois-jours", ref: "L'affrontement de Roger et de Barbe Blanche, qui finirent en buvant ensemble.", arc: "Wano (flash-back)" },
  },
  {
    id: "pir-grande-ere-en-mer",
    quand: actif({ annee: [1500, 1502] }),
    poids: 30,
    tension: 2,
    titre: "La Grande Ère",
    texte: "En quelques mois, la mer s'est remplie. Des milliers de pavillons neufs, mal cousus, mal dessinés, et partout la même phrase dans les tavernes : il l'a laissé là-bas, il suffit d'aller le chercher.",
    choix: [
      { label: "Profiter de la cohue pour monter un coup", effets: { prime: 4_000_000, jauges: { force: 2 } }, texte: "Les petits nouveaux ne savent pas se défendre. Vous n'êtes pas fier{/e} de vous." },
      { label: "Prendre un jeune équipage sous votre aile", effets: { jauges: { equipage: 4 }, lien: { creer: "compagnon" } }, texte: "Ils ne savent pas faire un nœud. Ils apprennent. L'un d'eux ne vous quittera plus." },
    ],
  },
  {
    id: "pir-moria-kaido",
    quand: actif({ zone: ["nouveau-monde"], annee: [1499, 1501], lien: { capitaine: true }, pasFlags: ["capitaine-de-son-equipage"] }),
    poids: 40,
    rarete: "rare",
    tension: 5,
    titre: "Le dragon",
    texte: "Votre capitaine, un géant pâle qui commande à des ombres, a voulu défier le plus fort. Un dragon d'azur descend du ciel au-dessus de votre flotte. En une nuit, il ne reste presque rien.",
    effets: { rencontre: ["moria", "kaido"] },
    choix: [
      { label: "Vous cacher sous les morts", test: { jauge: "chance", difficulte: 45, reussite: { texte: "Au matin, vous êtes vivant{/e}. Votre capitaine aussi, mais il ne parlera plus jamais de ses compagnons.", effets: { jauges: { haki: 3 } } }, echec: { texte: "Le dragon ne laisse rien.", effets: { mort: "combat" } } } },
      { label: "Charger le dragon", test: { jauge: "pc", difficulte: 85, reussite: { texte: "Vous lui avez tenu tête trois secondes. Il s'en souviendra peut-être. Vous, toute votre vie.", effets: { jauges: { haki: 6 }, prime: 50_000_000 } }, echec: { texte: "Trois secondes. C'était déjà beaucoup.", effets: { mort: "combat" } } }, auto: 0.3 },
    ],
    clinOeil: { id: "pir-moria-kaido", ref: "Kaido qui anéantit l'équipage de Gecko Moria dans le Nouveau Monde.", arc: "Thriller Bark" },
  },
  {
    id: "pir-arlong",
    quand: actif({ zone: ["east-blue"], annee: [1514, 1522] }),
    poids: 4,
    tension: 3,
    titre: "Les eaux interdites",
    texte: "Les pêcheurs vous préviennent : n'approchez pas des côtes de l'est. Des pirates hommes-poissons y ont fait un royaume et prélèvent un tribut sur chaque tête, même celle des enfants.",
    choix: [
      { label: "Faire un détour", texte: "Vous faites le détour. Vous n'aimez pas ce que ça dit de vous." },
      { label: "Aller voir", test: { jauge: "pc", difficulte: 45, reussite: { texte: "Vous repartez avec des bleus et la certitude que quelqu'un, un jour, cassera ce royaume-là.", effets: { jauges: { force: 3 } } }, echec: { texte: "Un homme-requin vous brise trois côtes d'une seule main.", effets: { sante: -20, blessure: "cotes-cassees" } } } },
    ],
    clinOeil: { id: "pir-arlong-park", ref: "Arlong Park, et le tribut qu'Arlong imposait à Cocoyashi pour chaque vie.", arc: "Arlong Park" },
    rencontre: "arlong",
  },
  {
    id: "pir-baratie",
    quand: actif({ zone: ["east-blue"], annee: [1513, 1560] }),
    poids: 5,
    tension: 1,
    titre: "Le restaurant flottant",
    texte: "Un restaurant en forme de poisson, au milieu de la mer. Le chef a une jambe de bois et une seule règle : on nourrit tous ceux qui ont faim, même les pirates. Ceux qui se battent à table repartent à la nage.",
    choix: [
      { label: "Manger comme jamais", effets: { sante: 10, compteurs: { banquets: 1 } }, texte: "Vous laissez un pourboire énorme. Le serveur blond vous regarde de travers et l'empoche quand même." },
      { label: "Proposer au chef de rejoindre l'équipage", effets: { jauges: { equipage: 1 } }, texte: "Il rit. « J'ai déjà été capitaine. Ça m'a coûté une jambe. »" },
    ],
    clinOeil: { id: "pir-baratie", ref: "Le Baratie, le restaurant de Zeff au Pied Rouge, où Sanji servait les pirates affamés.", arc: "Baratie" },
    rencontre: "zeff",
  },
  {
    id: "pir-cirque",
    quand: actif({ zone: ["east-blue"], annee: [1518, 1522], rangMax: 2 }),
    poids: 4,
    tension: 2,
    titre: "Le chapiteau",
    texte: "Une ville entière s'est vidée devant un équipage de clowns. Leur capitaine porte un nez rouge, hurle des ordres absurdes, et ses mains volent à travers la pièce. Il cherche des recrues.",
    choix: [
      { label: "Rejoindre la troupe", effets: { lien: { creer: "capitaine" }, flags: ["troupe-du-clown"], jauges: { equipage: 3 }, rencontre: "buggy" }, texte: "Vous apprenez à jongler avec des boulets. Vous ne savez pas pourquoi vous restez. Personne ne le sait." },
      { label: "Ne surtout pas parler de son nez", effets: { jauges: { savoir: 1 } }, texte: "Le matelot à côté de vous en a parlé. Il a reçu un boulet." },
    ],
    clinOeil: { id: "pir-nez-rouge", ref: "Baggy le Clown à Orange Town, et sa colère dès qu'on parle de son nez.", arc: "Orange Town" },
  },
  {
    id: "pir-krieg",
    quand: actif({ zone: ["east-blue", "paradis"], annee: [1521, 1522] }),
    poids: 30,
    tension: 4,
    titre: "La flotte de cinquante navires",
    texte: "La plus grande flotte d'East Blue est partie pour Grand Line. Sept jours plus tard, un seul navire revient, en lambeaux. Les survivants parlent d'un homme seul aux yeux de faucon, et d'un sabre noir.",
    effets: { jauges: { savoir: 2 }, rencontre: "mihawk" },
    clinOeil: { id: "pir-armada-de-krieg", ref: "L'armada de Don Krieg, cinquante navires détruits par Dracule Mihawk à l'entrée de Grand Line.", arc: "Baratie" },
  },
  {
    id: "pir-sabre-noir",
    quand: actif({ zone: ["paradis", "nouveau-monde", "east-blue"], annee: [1495, 1530], age: [16, 70] }),
    poids: 2,
    rarete: "peu-commun",
    tension: 4,
    titre: "Le petit bateau",
    texte: "Un esquif en forme de cercueil, une seule voile, un homme au chapeau à plume. Votre capitaine fait tirer dessus pour rire. L'homme se lève, tire un sabre immense, et votre navire se coupe en deux.",
    choix: [
      { label: "Nager vers l'esquif", effets: { jauges: { haki: 4 } }, texte: "Il vous laisse vous accrocher au bord, sans un mot. Au matin, il vous dépose sur une plage. Il n'a jamais dit son nom." },
      { label: "Nager loin, très loin", effets: { sante: -8 }, texte: "Vous survivez. Vous ne raconterez jamais l'histoire en entier, on ne vous croirait pas." },
    ],
    rencontre: "mihawk",
    clinOeil: { id: "pir-oeil-de-faucon", ref: "Dracule Mihawk, qui fend des galions d'un seul coup depuis son esquif-cercueil.", arc: "Baratie" },
  },
  {
    id: "pir-cerises",
    quand: actif({ zone: ["paradis"], annee: [1518, 1522], age: [16, 70] }),
    poids: 3,
    rarete: "peu-commun",
    tension: 3,
    titre: "La tarte aux cerises",
    texte: "Au comptoir, un gros homme édenté engloutit une tarte aux cerises. Il vous a entendu{/e} parler de votre rêve. Il éclate d'un rire étrange. « Les rêves des hommes ne meurent jamais. »",
    effets: { jauges: { haki: 2 }, rencontre: "barbe-noire" },
    clinOeil: { id: "pir-zehahaha", ref: "Barbe Noire à Mock Town, mangeant une tarte aux cerises : « Les rêves des hommes ne meurent jamais. »", arc: "Jaya" },
  },
  {
    id: "pir-shanks-banquet",
    quand: actif({ zone: ["east-blue", "paradis", "nouveau-monde"], annee: [1508, 1530], age: [15, 70] }),
    poids: 2,
    rarete: "peu-commun",
    tension: 2,
    titre: "Le banquet sans fin",
    texte: "Un équipage s'est installé sur la plage pour un banquet qui dure depuis trois jours. Leur capitaine aux cheveux rouges vous fait signe d'approcher. « Vous avez l'air d'avoir soif. Asseyez-vous. »",
    effets: { compteurs: { banquets: 1 }, jauges: { equipage: 3, haki: 2 }, rencontre: "shanks" },
    clinOeil: { id: "pir-le-roux", ref: "Shanks le Roux et son équipage, toujours un verre à la main, toujours un banquet en cours.", arc: "Romance Dawn" },
  },
  {
    id: "pir-tribut-bonbons",
    quand: actif({ zone: ["nouveau-monde"], annee: [1495, 1524], rangMin: 3, pasFlags: ["sous-big-mom"] }),
    poids: 4,
    tension: 3,
    titre: "Des bonbons ou la vie",
    texte: "Une émissaire aux bras chargés de gâteaux monte à bord. Cette île est sous la protection de l'Impératrice. Le tribut est payable en sucreries, une tonne par mois. Les retards sont punis par la mort.",
    choix: [
      { label: "Payer en sucre", effets: { jauges: { equipage: -2 } }, texte: "Vous videz vos cales de mélasse. Vos hommes mangeront du pain sec." },
      { label: "Refuser", test: { jauge: "pc", difficulte: 58, reussite: { texte: "Vous jetez l'émissaire à la mer, avec ses gâteaux. Le journal du lendemain vous donne pour mort. Vous ne l'êtes pas encore.", effets: { prime: 60_000_000, jauges: { force: 2 } } }, echec: { texte: "Ils reviennent la semaine suivante, avec un homme fait de mochi. Vous payez double.", effets: { sante: -18 } } } },
    ],
    clinOeil: { id: "pir-tribut-sucre", ref: "Les territoires de Big Mom, qui paient tribut en bonbons, et l'Halloween de Whole Cake.", arc: "Whole Cake Island" },
    rencontre: "big-mom",
  },
  {
    id: "pir-dressrosa-jouet",
    quand: actif({ ile: ["dressrosa"], annee: [1514, 1523], lien: { compagnon: true } }),
    poids: 40,
    tension: 4,
    titre: "Le soldat de plomb",
    texte: "À Dressrosa, les jouets marchent dans les rues comme des gens. Un matin, il vous manque quelqu'un à bord. Vous ne savez plus qui. Un petit soldat en fer-blanc vous regarde depuis le quai, et il pleure.",
    effets: { lien: { perdre: "compagnon" }, jauges: { equipage: -3 } },
    clinOeil: { id: "pir-jouets-oublies", ref: "Les jouets de Dressrosa, gens transformés par le pouvoir de Sugar et effacés de la mémoire de tous.", arc: "Dressrosa" },
    rencontre: "doflamingo",
  },
  {
    id: "pir-colisee",
    quand: actif({ zone: ["nouveau-monde"], annee: [1524, 1524] }),
    poids: 30,
    tension: 4,
    titre: "Le Colisée",
    texte: "À Dressrosa, un tournoi. Le prix est un fruit du démon légendaire, celui d'un pirate mort deux ans plus tôt. Des centaines de combattants. Vous voulez ce fruit, ou au moins de voir qui l'aura.",
    choix: [
      { label: "Combattre", test: { jauge: "pc", difficulte: 60, reussite: { texte: "Vous arrivez en finale. Un jeune homme masqué au chapeau haut-de-forme vous envoie au tapis d'un seul coup. Il pleure en mangeant le fruit.", effets: { prime: 40_000_000, jauges: { force: 3, haki: 2 } } }, echec: { texte: "Éliminé{/e} au premier tour par un gladiateur qui se bat avec une seule jambe.", effets: { sante: -12 } } } },
      { label: "Regarder depuis les gradins", effets: { jauges: { savoir: 2 } }, texte: "Vous voyez un homme masqué gagner, et pleurer. Personne ne comprend pourquoi. Vous, presque." },
    ],
    clinOeil: { id: "pir-mera-mera", ref: "Le tournoi du Colisée de Dressrosa, et Sabo qui remporte le fruit du Feu de son frère Ace.", arc: "Dressrosa" },
  },
  {
    id: "pir-hachinosu-teach",
    quand: actif({ zone: ["nouveau-monde"], annee: [1523, 1560], pasFlags: ["sous-barbe-noire"] }),
    poids: 4,
    tension: 4,
    titre: "Les chasseurs de fruits",
    texte: "Un navire aux trois crânes croise votre route. On dit qu'ils traquent ceux qui ont mangé un fruit du démon, pour les livrer à leur capitaine. Il collectionne les pouvoirs comme d'autres les pièces.",
    choix: [
      { label: "Fuir", test: { jauge: "savoir", difficulte: 45, reussite: { texte: "Vous les semez dans un banc de brume. Vous ne dormez pas pendant une semaine.", effets: { jauges: { savoir: 2 } } }, echec: { texte: "Ils vous rattrapent, vous fouillent, et repartent déçus. Ils vous laissent la vie. Pas le navire.", effets: { sante: -15, navire: "une chaloupe" } } } },
      { label: "Combattre", test: { jauge: "pc", difficulte: 66, reussite: { texte: "Vous coulez leur navire. Désormais, quelqu'un de très patient connaît votre nom.", effets: { primeX: 2, prime: 50_000_000 } }, echec: { texte: "Ils étaient trop forts.", effets: { mort: "combat" } } }, auto: 0.3 },
    ],
    clinOeil: { id: "pir-trois-cranes", ref: "Les pirates de Barbe Noire, qui chassent les détenteurs de fruits depuis Hachinosu.", arc: "Égghead" },
    rencontre: "barbe-noire",
  },
  {
    id: "pir-cross-guild",
    quand: actif({ annee: [1524, 1560], prime: 30_000_000, pasFlags: ["cross-guild"] }),
    poids: 5,
    tension: 3,
    titre: "Les primes à l'envers",
    texte: "Une nouvelle organisation fait placarder ses propres avis de recherche : sur la tête des marines. Son chef officiel est un clown que tout le monde prend pour un génie. Ils recrutent.",
    choix: [
      { label: "Rejoindre la Guilde", effets: { flags: ["cross-guild"], prime: 30_000_000, jauges: { equipage: 2 }, rencontre: ["buggy", "crocodile", "mihawk"] }, texte: "Le clown vous serre la main en tremblant. Derrière lui, un homme au crochet et un homme au sabre noir ne disent rien." },
      { label: "Rester indépendant{/e}", effets: { jauges: { haki: 1 } }, texte: "Vous gardez votre pavillon. Les marines, vous les éviterez à l'ancienne." },
    ],
    clinOeil: { id: "pir-cross-guild", ref: "Cross Guild, fondée par Crocodile et Mihawk autour de Baggy, qui met à prix la tête des marines.", arc: "Wano / Égghead" },
  },
];

// ── 8. Les sommets ──

const sommets: Evenement[] = [
  {
    id: "pir-supernova",
    quand: actif({ zone: ["paradis"], prime: 100_000_000, age: [16, 32], rangMin: 3, pasFlags: ["supernova"] }),
    poids: 60,
    tension: 4,
    titre: "Supernova",
    texte: "Le journal publie une liste : les capitaines qui ont dépassé cent millions avant d'atteindre la Red Line. Votre nom y figure. On les appelle les Supernovas. Tout le monde attend de voir lesquels survivront.",
    effets: { grade: "supernova", flags: ["supernova"], jauges: { equipage: 4 } },
    bascule: true,
  },
  {
    id: "pir-pire-generation",
    quand: actif({ grade: ["supernova"], annee: [1522, 1522] }),
    poids: 300,
    tension: 5,
    titre: "La pire génération",
    texte: "Onze capitaines à plus de cent millions sur le même archipel, en même temps. Un chirurgien au chapeau tacheté, un rouquin aux bras de métal, un garçon au chapeau de paille. Vous êtes l'un d'eux, ou presque. L'air sent la poudre.",
    effets: { jauges: { haki: 3 }, rencontre: ["law", "kid", "luffy"] },
    clinOeil: { id: "pir-pire-generation", ref: "Les onze Supernovas réunis à Sabaody, que l'on appellera la Pire Génération.", arc: "Sabaody" },
  },
  {
    id: "pir-regard-de-l-empereur",
    quand: actif({ zone: ["nouveau-monde"], rangMin: 1, pasFlags: ["volonte-royale"] }),
    poids: 6,
    tension: 4,
    titre: "Le regard",
    texte: "Un Empereur entre dans le port. Il ne fait rien. Il regarde. Autour de vous, les hommes tombent comme des sacs, les yeux révulsés, l'écume aux lèvres.",
    choix: [
      { label: "Rester debout", test: { jauge: "haki", difficulte: 38, reussite: { texte: "Vos genoux tremblent. Vous restez debout. Il vous regarde une seconde de plus que les autres, et il sourit.", effets: { flags: ["volonte-royale"], jauges: { haki: 5 } } }, echec: { texte: "Vous vous réveillez sur le pavé, au soir. Personne ne parle de ce qui s'est passé.", effets: { sante: -5 } } } },
      { label: "Baisser les yeux", texte: "Vous baissez les yeux. Vous restez conscient{/e}. C'est peut-être ça, la sagesse." },
    ],
    clinOeil: { id: "pir-haki-des-rois", ref: "Le Haki des rois, qui fait perdre connaissance aux faibles, comme Shanks en arrivant à bord de Barbe Blanche.", arc: "Marineford" },
  },
  {
    id: "pir-emissaire",
    quand: actif({ zone: ["nouveau-monde"], rangMin: 1, age: [18, 60], pasFlags: ["pavillon-empereur"], un: [{ prime: 30_000_000 }, { jauges: { force: 42 } }] }),
    poids: 10,
    tension: 4,
    titre: "Sous un pavillon plus grand",
    texte: "Un émissaire monte à bord, sans arme. Il pose un drapeau plié sur la table. « Vous pouvez naviguer sous lui. Vous devrez obéir, payer, et mourir quand on vous le demandera. En échange, plus personne n'osera vous toucher. »",
    bascule: true,
    choix: [
      { label: "Le crâne à la moustache en croissant", si: { annee: [1480, 1522] }, effets: { flags: ["pavillon-empereur", "sous-barbe-blanche"], primeX: 1.3, rencontre: "barbe-blanche" }, texte: "Le vieil homme vous reçoit sur son navire-baleine. Il vous appelle « mon fils » dès le premier soir." },
      { label: "Le crâne coiffé d'un chapeau", si: { annee: [1490, 1524] }, effets: { flags: ["pavillon-empereur", "sous-big-mom"], primeX: 1.3, rencontre: "big-mom" }, texte: "On vous remet une liste de sucreries à fournir et la date du prochain goûter. Ne pas venir n'est pas une option." },
      { label: "Le crâne aux cornes", si: { annee: [1500, 1524] }, effets: { flags: ["pavillon-empereur", "sous-kaido"], primeX: 1.3, rencontre: "kaido" }, texte: "On vous tatoue le pavillon sur l'épaule. Ici, on se bat pour vivre et on vit pour se battre." },
      { label: "Le crâne aux cicatrices et aux sabres croisés", si: { annee: [1512, 1560] }, effets: { flags: ["pavillon-empereur", "sous-shanks"], primeX: 1.2, rencontre: "shanks" }, texte: "Le capitaine aux cheveux rouges vous serre la main de son unique bras. « On ne protège pas des territoires. On protège des amis. »" },
      { label: "Les trois crânes", si: { annee: [1523, 1560] }, effets: { flags: ["pavillon-empereur", "sous-barbe-noire"], primeX: 1.5, rencontre: "barbe-noire" }, texte: "Il rit d'un rire étrange. Personne, sur ces navires, ne vous tournera le dos. Vous non plus." },
      { label: "Refuser poliment", effets: { flags: ["independant"], prime: 10_000_000, jauges: { haki: 2 } }, texte: "L'émissaire replie son drapeau sans un mot. Le Nouveau Monde vient de devenir plus dangereux." },
    ],
    clinOeil: { id: "pir-vassal", ref: "Les équipages vassaux : les 43 capitaines alliés de Barbe Blanche, les territoires de Big Mom, les Pirates aux Cent Bêtes.", arc: "Marineford" },
  },
  {
    id: "pir-mes-fils",
    quand: actif({ flags: ["sous-barbe-blanche"], annee: [1480, 1522] }),
    poids: 20,
    tension: 2,
    titre: "Mes fils",
    texte: "Sur le pont du navire-baleine, le vieil homme boit à même la barrique. Il n'a pas d'enfant, dit-il, alors il a pris tous ceux que la mer lui a amenés. Un homme aux flammes bleues soigne vos blessures sans demander qui vous êtes.",
    effets: { jauges: { equipage: 6, haki: 2 }, compteurs: { banquets: 1 }, rencontre: ["barbe-blanche", "marco"] },
    clinOeil: { id: "pir-mes-fils", ref: "Barbe Blanche, qui appelait ses hommes « mes fils », et Marco le Phénix.", arc: "Marineford" },
  },
  {
    id: "pir-commandant",
    quand: actif({ flags: ["pavillon-empereur"], prime: 250_000_000, age: [20, 60], pasFlags: ["grade:commandant-empereur"] }),
    poids: 8,
    rarete: "peu-commun",
    tension: 4,
    titre: "Une division",
    texte: "L'Empereur vous fait venir. Un de ses commandants est tombé. Il vous regarde longtemps, sans rien dire. Puis il vous demande si vous êtes prêt{/e} à commander mille hommes.",
    bascule: true,
    choix: [
      { label: "Accepter", test: { jauge: "pc", difficulte: 58, reussite: { texte: "Vous prenez la tête d'une division. Le journal triple votre prime. Les anciens de la division vous jaugent. Vous tiendrez.", effets: { grade: "commandant-empereur", prime: 300_000_000, jauges: { equipage: 5 } } }, echec: { texte: "Un rival de la division vous défie. Vous perdez. On vous renvoie à votre place.", effets: { sante: -15, jauges: { equipage: -3 } } } } },
      { label: "Rester capitaine de votre propre navire", effets: { jauges: { haki: 2 } }, texte: "Il hoche la tête. Il respecte ça. Il ne vous le proposera pas deux fois." },
    ],
  },
  {
    id: "pir-marineford",
    quand: { camp: ["pirate"], unFlag: ["sous-barbe-blanche"], annee: [1522, 1522], pasFlags: ["prisonnier", "retraite", "invalide"] },
    poids: 1000,
    tension: 5,
    titre: "La guerre au sommet",
    texte: "La baie est pleine de navires et de géants. Sur l'échafaud, un jeune homme au chapeau orange attend la mort. Le vieil homme a dit qu'il ramènerait son fils, et tous ses fils ont suivi.",
    bascule: true,
    effets: { aller: { ile: "marineford" }, rencontre: ["ace", "barbe-blanche", "akainu", "aokiji"] },
    choix: [
      { label: "Charger avec la première vague", test: { jauge: "pc", difficulte: 62, reussite: { texte: "Vous traversez le champ de bataille. Vous voyez le vieux tenir debout, sans dos tourné, jusqu'au bout. Un homme aux cheveux rouges arrive et met fin à la guerre.", effets: { flags: ["marineford"], prime: 120_000_000, jauges: { haki: 5 }, aller: { zone: "nouveau-monde" } } }, echec: { texte: "Un poing de magma traverse la baie.", effets: { mort: "marineford" } } } },
      { label: "Tenir la ligne de retraite pour les blessés", effets: { flags: ["marineford"], jauges: { equipage: 8 }, compteurs: { "vies-sauvees": 3 }, aller: { zone: "nouveau-monde" } }, texte: "Vous portez des hommes jusqu'aux navires toute la journée. Vous n'avez jamais su qui avait gagné. Personne n'a gagné." },
      { label: "Fuir quand la baie gèle", effets: { flags: ["lache-marineford"], jauges: { equipage: -8 }, aller: { zone: "nouveau-monde" } }, texte: "La mer devient glace sous vos pieds. Vous courez dans l'autre sens. Vous vous en souviendrez à chaque anniversaire." },
    ],
    clinOeil: { id: "pir-marineford", ref: "La guerre de Marineford : Ace sur l'échafaud, Aokiji qui gèle la baie, la mort de Barbe Blanche, et Shanks qui y met fin.", arc: "Marineford" },
  },
  {
    id: "pir-orphelins-du-vieux",
    quand: actif({ flags: ["sous-barbe-blanche"], annee: [1523, 1530] }),
    poids: 60,
    tension: 4,
    titre: "Le territoire du vieux",
    texte: "Le vieil homme est mort. Ses territoires sont à prendre, et l'homme aux trois crânes les prend un par un. Les fils du vieux se dispersent ou se battent.",
    effets: { retirerFlags: ["pavillon-empereur", "sous-barbe-blanche"] },
    choix: [
      { label: "Défendre une île du vieux", test: { jauge: "pc", difficulte: 60, reussite: { texte: "L'île tient. Personne ne vous remercie, et c'est très bien comme ça.", effets: { jauges: { haki: 3 }, prime: 80_000_000, compteurs: { "vies-sauvees": 1 } } }, echec: { texte: "Il y avait un homme qui riait, et la terre qui tremblait.", effets: { sante: -25, blessure: "seisme" } } } },
      { label: "Rejoindre ceux qui protègent son village natal", effets: { jauges: { equipage: 4 }, rencontre: "marco" }, texte: "Un homme aux flammes bleues soigne les villageois d'une île lointaine. Il vous accueille sans question." },
      { label: "Prendre votre propre route", effets: { jauges: { force: 2 } }, texte: "Vous gardez son pavillon dans votre coffre. Vous ne le hisserez plus." },
    ],
  },
  {
    id: "pir-smile",
    quand: actif({ flags: ["sous-kaido"], annee: [1514, 1524], pasFlags: ["smile"] }),
    poids: 15,
    tension: 4,
    titre: "Le fruit artificiel",
    texte: "On vous tend un fruit fabriqué dans un laboratoire. La plupart donnent des pouvoirs bizarres. Un sur dix ne donne rien, sauf un sourire qui ne quittera plus jamais votre visage, même quand vous pleurez.",
    choix: [
      { label: "Le manger", test: { jauge: "chance", difficulte: 50, reussite: { texte: "Une corne vous pousse sur le front, ou une tête de bête sur la cuisse. Vous êtes plus fort{/e}. Vous n'êtes plus tout à fait vous.", effets: { flags: ["smile"], jauges: { force: 8 } } }, echec: { texte: "Rien. Puis un rire, qui monte et ne s'arrête plus. Vous riez à l'enterrement de votre mère, à des années de là.", effets: { flags: ["smile", "rire-eternel"], jauges: { equipage: -3 } } } } },
      { label: "Le jeter à la mer", effets: { jauges: { haki: 2 } }, texte: "Vous dites que vous l'avez mangé. Vous faites semblant de rire. Vous mentez bien." },
    ],
    clinOeil: { id: "pir-smile", ref: "Les SMILE, fruits artificiels de Kaido ; ceux qui n'en tirent rien sont condamnés à rire, comme les habitants d'Ebisu.", arc: "Wano" },
  },
  {
    id: "pir-chute-des-empereurs",
    quand: { camp: ["pirate"], unFlag: ["sous-kaido", "sous-big-mom"], annee: [1524, 1524], pasFlags: ["prisonnier"] },
    poids: 1000,
    tension: 5,
    titre: "Wano",
    texte: "Le journal arrive comme une détonation : à Wano, deux Empereurs sont tombés la même nuit. Le pavillon que vous portiez ne protège plus personne. Les marchands, déjà, ne baissent plus les yeux.",
    effets: { retirerFlags: ["pavillon-empereur", "sous-kaido", "sous-big-mom"] },
    choix: [
      { label: "Arracher le tatouage", effets: { sante: -5, jauges: { haki: 2 } }, texte: "Avec un couteau chauffé au rouge. Ce qui reste, vous le cacherez sous une manche." },
      { label: "Rester fidèle à un pavillon mort", effets: { jauges: { equipage: 2 }, prime: 30_000_000 }, texte: "Les autres disent que vous êtes fou. Vous dites que vous êtes fidèle." },
    ],
  },
  {
    id: "pir-offre-corsaire",
    quand: actif({ prime: 150_000_000, annee: [1490, 1523], rangMin: 3, age: [22, 65], pasFlags: ["ennemi-des-dragons", "refus-corsaire", "pavillon-empereur"] }),
    poids: 6,
    rarete: "rare",
    tension: 5,
    titre: "Une lettre du Gouvernement",
    texte: "Une lettre scellée de la Marine, portée par un vice-amiral qui n'a pas l'air content d'être là. Un des sept sièges de Grand Corsaire est vacant. Le Gouvernement vous l'offre.",
    bascule: true,
    choix: [
      { label: "Accepter", effets: { grade: "grand-corsaire", jauges: { equipage: -3 } }, texte: "Votre avis de recherche disparaît des murs. Vous avez le droit de piller les pirates. Vos anciens amis ne vous adressent plus la parole." },
      { label: "Refuser", effets: { flags: ["refus-corsaire"], prime: 50_000_000, jauges: { haki: 3, equipage: 3 } }, texte: "Vous déchirez la lettre devant le vice-amiral. Il sourit, malgré lui. Votre prime monte dès la semaine suivante." },
    ],
    clinOeil: { id: "pir-grand-corsaire", ref: "Les sept Grands Corsaires, pirates au service du Gouvernement, comme Crocodile, Jinbe ou Hancock.", arc: "Alabasta" },
  },
  {
    id: "pir-vie-de-corsaire",
    quand: { camp: ["pirate"], grade: ["grand-corsaire"], pasFlags: ["prisonnier"] },
    poids: 12,
    repetable: 3,
    tension: 3,
    titre: "Le chien du Gouvernement",
    texte: [
      "Le Gouvernement vous envoie un ordre : un équipage de jeunes pirates, à écraser. Ils ont votre âge quand vous avez commencé.",
      "À la réunion des sept, personne ne se parle. Un homme en manteau de plumes rit tout seul. Une femme d'une beauté terrible regarde ailleurs.",
    ],
    choix: [
      { label: "Obéir", effets: { jauges: { force: 2 }, compteurs: { "combats-gagnes": 1 } }, texte: "Vous obéissez. Leur capitaine vous regarde avec un mépris que vous connaissez bien." },
      { label: "Les laisser filer", effets: { jauges: { haki: 2 } }, texte: "Vous arrivez en retard, exprès. Ils sont partis. Vous rédigez un rapport plein de brouillard." },
    ],
    rencontre: "doflamingo",
  },
  {
    id: "pir-convocation",
    quand: { camp: ["pirate"], grade: ["grand-corsaire"], annee: [1522, 1522] },
    poids: 1000,
    tension: 5,
    titre: "La convocation",
    texte: "Le Gouvernement convoque les Grands Corsaires à Marineford. On exécute le fils du Roi. Le vieil homme aux moustaches viendra. Vous devez vous battre contre lui.",
    bascule: true,
    choix: [
      { label: "Obéir", effets: { flags: ["marineford"], jauges: { force: 3 } }, texte: "Vous vous battez du côté de la Marine. Vous n'oublierez jamais le regard du vieux quand il a compris que vous étiez là." },
      { label: "Refuser", effets: { flags: ["prisonnier"], aller: { ile: "impel-down" }, grade: "capitaine-pirate", jauges: { haki: 4 }, rencontre: "jinbe" }, texte: "On vous retire le titre et on vous jette à Impel Down. Dans la cellule voisine, un Homme-Poisson a fait le même choix." },
    ],
  },
  {
    id: "pir-reverie",
    quand: { camp: ["pirate"], grade: ["grand-corsaire"], annee: [1524, 1600] },
    poids: 1000,
    tension: 5,
    titre: "L'abolition",
    texte: "Les rois du monde ont voté à Marie-Joie. Le système des Grands Corsaires est aboli. En une nuit, votre immunité disparaît. Les navires de la Marine sont déjà en route.",
    bascule: true,
    effets: { grade: "capitaine-pirate", prime: 200_000_000 },
    choix: [
      { label: "Rejoindre le clown, le crochet et le sabre noir", effets: { flags: ["cross-guild"], rencontre: ["buggy", "crocodile", "mihawk"] }, texte: "Ils mettent à prix la tête des marines. Vous aimez assez l'idée." },
      { label: "Affronter la flotte qui vient", test: { jauge: "pc", difficulte: 65, reussite: { texte: "Trois vice-amiraux, et vous êtes toujours là. Le monde apprend que vous n'étiez pas un chien.", effets: { primeX: 1.5 } }, echec: { texte: "On vous enchaîne avec du granit marin.", effets: { flags: ["prisonnier"] } } } },
      { label: "Disparaître", effets: { aller: { zone: "south-blue" } }, texte: "Vous changez de nom, de navire, de mer. Ça marche un temps." },
    ],
    clinOeil: { id: "pir-abolition", ref: "L'abolition des Grands Corsaires à la Rêverie, Hancock attaquée sur Amazon Lily, et la naissance de Cross Guild.", arc: "Rêverie" },
  },
  {
    id: "pir-trone-vide",
    quand: actif({ annee: [1525, 1600], zone: ["nouveau-monde"], prime: 1_200_000_000, rangMin: 3, age: [28, 65], jauges: { force: 65, equipage: 55 } }),
    poids: 30,
    rarete: "tres-rare",
    tension: 5,
    titre: "Un trône vide",
    texte: "Quelque part dans le Nouveau Monde, un Empereur est tombé. Ses territoires flottent sans maître, ses vassaux hésitent. Le journal publie déjà des noms. Le vôtre est le premier.",
    bascule: true,
    choix: [
      { label: "Prendre le trône", test: { jauge: "pc", difficulte: 75, reussite: { texte: "Trois capitaines vous défient. Il en reste un, à genoux. Le journal du lendemain vous désigne sans hésiter : Empereur.", effets: { grade: "empereur", primeX: 2, jauges: { equipage: 8 } } }, echec: { texte: "Un autre a été plus rapide, plus fort, plus cruel. Vous repartez avec une cicatrice et votre vie.", effets: { sante: -25, blessure: "trone" } } } },
      { label: "Laisser la place", effets: { jauges: { haki: 4 } }, texte: "Vous ne voulez pas de territoires. Vous voulez la mer. Les autres ne comprennent pas." },
    ],
    clinOeil: { id: "pir-trone-vide", ref: "Les sièges d'Empereur qui changent de main, comme celui de Barbe Blanche repris par Barbe Noire.", arc: "Ellipse" },
  },
  {
    id: "pir-empereur-malgre-lui",
    quand: actif({ annee: [1525, 1600], prime: 400_000_000, rangMin: 3, jauges: { equipage: 70 }, pasFlags: ["grade:empereur"] }),
    poids: 40,
    rarete: "legendaire",
    tension: 5,
    titre: "Un malentendu",
    texte: "Vos subordonnés ont tout fait : les batailles, les alliances, les discours. Le journal, lui, a retenu votre nom. Ce matin, vous apprenez au petit-déjeuner que vous êtes Empereur.",
    bascule: true,
    effets: { grade: "empereur", primeX: 5, jauges: { equipage: 5 } },
    clinOeil: { id: "pir-empereur-malentendu", ref: "Baggy, proclamé Empereur à la place de ses associés de Cross Guild, et qui n'y comprend rien.", arc: "Wano" },
  },
  {
    id: "pir-empereur-regne",
    quand: actif({ grade: ["empereur"] }),
    poids: 20,
    repetable: 2,
    tension: 3,
    titre: "Votre territoire",
    texte: [
      "Une île vous demande votre protection contre un roi qui les affame. Hisser votre pavillon sur leur port suffira. Il faudra ensuite le défendre.",
      "Un émissaire du Gouvernement vient négocier. Il transpire beaucoup. Vous le faites attendre trois jours sur le pont.",
      "Un jeune capitaine a hissé son pavillon sur une de vos îles. Il a l'âge que vous aviez. Il vous ressemble un peu trop.",
    ],
    choix: [
      { label: "Protéger", effets: { jauges: { equipage: 3 }, compteurs: { "vies-sauvees": 5 } }, texte: "Les enfants de l'île dessinent votre pavillon sur les murs. Ils le dessinent mal. Vous adorez." },
      { label: "Écraser", effets: { prime: 200_000_000, jauges: { force: 2, equipage: -3 } }, texte: "On vous craint un peu plus. On vous aime un peu moins. C'est le prix." },
      { label: "Laisser faire", effets: { jauges: { haki: 2 } }, texte: "Vous laissez la mer décider. Parfois, un Empereur ne fait rien, et c'est sa plus grande force." },
    ],
  },
];

// ── 9. Poser le sac ──

const sortir: Evenement[] = [
  {
    id: "pir-poser-le-sac",
    quand: actif({ age: [45, 80] }),
    poids: 10,
    tension: 3,
    titre: "Poser le sac",
    texte: "Vos mains tremblent un peu le matin. Le dernier mousse court plus vite que vous ne l'avez jamais fait. Sur un archipel tranquille, un aubergiste vous propose de reprendre son comptoir.",
    bascule: true,
    choix: [
      { label: "Ouvrir un bar où les pirates boivent sans se battre", effets: { camp: "civil", metier: "marchand", flags: ["retraite", "bar-neutre"], retirerFlags: ["en-mer"] }, texte: "Les jeunes pirates viennent vous demander conseil. Vous leur facturez le double." },
      { label: "Ouvrir un restaurant flottant", effets: { camp: "civil", metier: "cuisinier", flags: ["retraite"], retirerFlags: ["en-mer"] }, texte: "Vous nourrissez tous ceux qui ont faim. C'est la seule règle de la maison." },
      { label: "Un dernier voyage", effets: { jauges: { haki: 2 } }, texte: "Le sac attendra. La mer, elle, n'attend jamais.", auto: 2 },
    ],
    clinOeil: { id: "pir-poser-le-sac", ref: "Rayleigh qui fait du coating et boit chez Shakky, Zeff qui ouvre le Baratie : les vieux pirates qui ont posé le sac.", arc: "Sabaody" },
  },
  {
    id: "pir-blessure-qui-arrete-tout",
    quand: actif({ age: [20, 70], sante: [0, 20] }),
    poids: 5,
    tension: 4,
    titre: "La blessure",
    texte: "Le médecin a mis longtemps à vous regarder dans les yeux. La jambe ne reviendra pas comme avant. Plus de mât, plus d'abordage. On peut vivre avec, dit-il. Il n'a pas dit comment.",
    bascule: true,
    choix: [
      { label: "Rester à bord, en cuisine", effets: { camp: "civil", metier: "cuisinier", flags: ["invalide", "retraite"], blessure: "jambe-de-bois" }, texte: "Une jambe de bois, une louche, et l'équipage qui mange mieux que jamais. Ce n'est pas rien." },
      { label: "Débarquer au prochain port", effets: { camp: "civil", flags: ["invalide", "retraite"], retirerFlags: ["en-mer"], blessure: "jambe-de-bois" }, texte: "L'équipage vous porte jusqu'au quai. Vous ne vous retournez pas. Eux, si." },
      { label: "Refuser de s'arrêter", test: { jauge: "haki", difficulte: 40, reussite: { texte: "Vous remontez au mât six mois plus tard, plus lent mais vivant{/e}. Personne n'ose rien dire.", effets: { sante: 20 } } , echec: { texte: "La plaie se rouvre au premier combat. Vous n'avez pas le temps d'avoir peur.", effets: { mort: "combat" } } }, auto: 0.3 },
    ],
  },
  {
    id: "pir-desertion",
    quand: actif({ rangMax: 2, age: [17, 45], compteurs: { "annees:pirate": 2 } }),
    poids: 3,
    tension: 3,
    titre: "La nuit de l'escale",
    texte: "Le navire repart à l'aube. Vous êtes sur le quai, votre sac à l'épaule, et personne ne vous a vu{/e} descendre. Il suffit de ne pas remonter.",
    choix: [
      { label: "Ne pas remonter", effets: { camp: "civil", retirerFlags: ["en-mer"], lien: { perdre: "capitaine" } }, texte: "Le navire part sans vous. On ne vous cherche pas. Vous êtes à la fois libre et seul{/e}." },
      { label: "Remonter à bord", effets: { jauges: { equipage: 2 } }, texte: "Le second vous regarde monter, puis détourne les yeux. Il a fait la même chose, un jour.", auto: 2 },
    ],
  },
  {
    id: "pir-vers-la-marine",
    quand: actif({ grade: ["mousse", "matelot-pirate"], age: [14, 24], prime: [0, 0] }),
    poids: 3,
    tension: 4,
    titre: "L'autre uniforme",
    texte: "Un inconnu de passage vous a dit qu'on peut toujours changer de vie, même un mousse. À la base Marine de l'île, ils recrutent. Personne ne connaît votre visage. Pas encore.",
    bascule: true,
    choix: [
      { label: "Vous engager dans la Marine", effets: { camp: "marine", flags: ["trahison"], retirerFlags: ["capitaine-de-son-equipage"], lien: { perdre: "capitaine" } }, texte: "Vous mentez sur votre passé dès le premier jour. Vous serez un bon marine. Vous le savez déjà." },
      { label: "Rester pirate", texte: "Vous ne seriez jamais à votre place là-bas. Ou peut-être que si. Vous ne le saurez pas." , auto: 2 },
    ],
    clinOeil: { id: "pir-ancien-mousse", ref: "Koby, ancien mousse d'Alvida, qui devient marine après sa rencontre avec Luffy.", arc: "Shells Town" },
  },
  {
    id: "pir-vers-chasseur",
    quand: actif({ rangMin: 1, age: [20, 55], jauges: { force: 30 } }),
    poids: 2,
    tension: 3,
    titre: "Changer de côté du papier",
    texte: "Vous connaissez les pirates mieux que personne : où ils boivent, ce qu'ils craignent, comment ils fuient. Un chasseur de primes vous propose de travailler avec lui. Le papier est le même, dit-il. On le tient juste à l'envers.",
    choix: [
      { label: "Devenir chasseur", effets: { camp: "chasseur", flags: ["trahison"], retirerFlags: ["capitaine-de-son-equipage"], lien: { perdre: "capitaine" } }, texte: "Votre première prime est un homme avec qui vous avez bu. Vous l'attrapez quand même." },
      { label: "Refuser", texte: "Il y a des lignes qu'on ne franchit pas. Vous en avez peu. Celle-là en est une.", auto: 3 },
    ],
  },
  {
    id: "pir-vers-la-revolution",
    quand: actif({ age: [18, 55], annee: [1503, 1600], jauges: { haki: 10 } }),
    poids: 2,
    tension: 4,
    titre: "Une autre guerre",
    texte: "Un homme encapuchonné vous a vu{/e} libérer des esclaves d'un navire marchand. Il ne veut pas de votre butin. Il vous parle d'un monde où personne ne s'agenouille devant les Dragons Célestes.",
    bascule: true,
    choix: [
      { label: "Le suivre", effets: { camp: "revolution", retirerFlags: ["capitaine-de-son-equipage"], lien: { perdre: "capitaine" } }, texte: "Vous rangez le pavillon noir. Vous en hisserez un autre, plus dangereux encore." },
      { label: "Rester libre", effets: { jauges: { haki: 1 } }, texte: "Vous ne voulez servir personne, même pas une bonne cause.", auto: 3 },
    ],
  },
  {
    id: "pir-jamais-rentre",
    quand: ancien({ age: [50, 95] }),
    poids: 10,
    tension: 2,
    titre: "{ileNatale}",
    texte: [
      "Vous n'êtes jamais vraiment rentré{/e} {aIleNatale}. Mais certains soirs, quand le vent vient de là-bas, vous sentez encore l'odeur des cuisines de votre enfance.",
      "On vous écrit {deIleNatale} : on se souvient de vous, là-bas. Pas du pirate. De l'enfant qui grimpait sur le phare. Vous relisez la lettre jusqu'à l'user.",
    ],
    effets: { jauges: { haki: 1 } },
  },
  {
    id: "pir-conseils",
    quand: ancien({ age: [48, 95] }),
    poids: 8,
    repetable: 4,
    tension: 1,
    titre: "Les jeunes",
    texte: [
      "Un jeune capitaine pousse la porte, des étoiles plein les yeux. Il veut savoir ce qu'il y a au bout de Grand Line. Vous lui servez à boire et vous ne dites rien. Il doit le découvrir.",
      "Un équipage de gamins vous demande comment passer Reverse Mountain. Vous leur dessinez une carte sur une serviette. Vous savez que la moitié n'en reviendra pas. Vous leur souhaitez bon vent.",
    ],
    choix: [
      { label: "Raconter vos aventures", effets: { jauges: { equipage: 2 } }, texte: "Vous exagérez un peu. Beaucoup. Ils boivent chaque mot." },
      { label: "Leur dire de rentrer chez eux", effets: { jauges: { savoir: 1 } }, texte: "Ils rient. Vous aussi, vous auriez ri." },
    ],
  },
  {
    id: "pir-vieille-prime",
    quand: ancien({ age: [45, 90], prime: 1 }),
    poids: 6,
    repetable: 6,
    tension: 3,
    titre: "Le vieil avis",
    texte: "Un jeune chasseur de primes pose sur votre table un avis de recherche jauni. Le visage a trente ans de moins. Le chiffre n'a jamais été annulé.",
    choix: [
      { label: "Lui offrir un verre", test: { jauge: "equipage", difficulte: 25, reussite: { texte: "Il repart sans vous, avec une histoire à raconter. Il revient la semaine suivante pour en entendre une autre.", effets: { jauges: { equipage: 2 } } }, echec: { texte: "Il sort ses menottes. Vous soupirez.", effets: { flags: ["prisonnier"] } } } },
      { label: "Lui montrer que vous n'avez rien oublié", test: { jauge: "pc", difficulte: 22, reussite: { texte: "Il ne voit même pas votre main bouger. Il repart à reculons, le chapeau à la main.", effets: { jauges: { haki: 2 } } }, echec: { texte: "Vos genoux ne suivent plus. Il vous passe les menottes en s'excusant presque.", effets: { flags: ["prisonnier"], sante: -10 } } } },
    ],
  },
  {
    id: "pir-visite-d-un-ancien",
    quand: ancien({ age: [50, 95], flags: ["lien:compagnon"] }),
    poids: 6,
    tension: 2,
    titre: "Un vieux pavillon",
    texte: "Un vieillard frappe à votre porte avec une bouteille. Il vous faut une minute pour reconnaître le matelot qui chantait faux sur le pont, il y a quarante ans. Il chante toujours aussi faux.",
    effets: { compteurs: { banquets: 1 }, jauges: { equipage: 3 } },
  },
  {
    id: "pir-derniere-chanson",
    quand: ancien({ age: [65, 110], compteurs: { banquets: 3 } }),
    poids: 8,
    tension: 2,
    titre: "La dernière chanson",
    texte: "Ce soir, au bar, quelqu'un entonne la vieille chanson du saké qu'on porte à travers les mers. Votre voix tremble, mais vous connaissez encore toutes les paroles. Tous les vieux pirates de la salle chantent avec vous.",
    effets: { compteurs: { banquets: 1 }, jauges: { haki: 2 } },
  },
  {
    id: "pir-retour-laboon",
    quand: { flags: ["promesse-laboon"], age: [50, 95], pasFlags: ["prisonnier"] },
    poids: 30,
    tension: 4,
    titre: "La promesse",
    texte: "Vous l'aviez promis. Vous revenez au pied de la montagne, vieux{/ille} et lent{/e}. La baleine est toujours là. Elle vous reconnaît au premier coup d'œil, et pousse un cri qui fait trembler le phare.",
    effets: { aller: { ile: "cap-des-jumeaux" }, retirerFlags: ["promesse-laboon"], jauges: { haki: 4 }, rencontre: "laboon" },
  },
];

export const evenements: Evenement[] = [...entrer, ...bord, ...fers, ...route, ...capitaine, ...primes, ...canon, ...sommets, ...sortir];

// Une vie de pirate doit sentir la mer : face au reste du contenu (des centaines
// d'événements tirables à tout âge), on renforce le poids des événements de bord.
// Les événements « forcés » (poids ≥ 100 : dates canon, transferts) ne bougent pas.
const ACCENT_PIRATE = 3;
for (const e of evenements) {
  const w = e.poids ?? 10;
  if (e.quand?.camp?.includes("pirate") && w < 100) e.poids = w * ACCENT_PIRATE;
}
