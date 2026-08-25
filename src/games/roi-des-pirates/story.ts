import type { StoryNode } from "./types.ts";
import { getPendingFruit, describeInjuries } from "./engine.ts";
import { revealsFruit, findEatenFruit } from "./fruits.ts";
import {
  SVG_INTRO,
  SVG_EAST_BLUE,
  SVG_DEVIL_FRUIT,
  SVG_HAKI,
  SVG_MARINE,
  SVG_GRAND_LINE,
  SVG_ALLIANCE,
  SVG_NOUVEAU_MONDE,
  SVG_WANO,
  SVG_FINAL,
  SVG_FIN_ROI,
  SVG_FIN_LEGENDE,
  SVG_FIN_RETRAITE,
  SVG_FIN_CAPTURE,
} from "./illustrations.ts";

export const STORY: StoryNode[] = [
  {
    id: "creation-personnage",
    characterForm: true,
    subtitle: "Qui es-tu ?",
    text: "Avant de prendre la mer, une dernière chose : qui es-tu ?",
    svg: SVG_INTRO,
    choices: [
      { text: "Embarquer", effects: {}, next: "intro" },
    ],
  },

  {
    id: "intro",
    subtitle: "L'appel du large",
    text: "La mer. Elle t'a toujours appelé. Depuis l'enfance sur ce quai de bois vermoulu, tu regardais les voiles disparaître à l'horizon en te disant : un jour, ce sera moi. Ce jour est arrivé. Tu as dix-sept ans. Un couteau à la ceinture, quelques Berry dans la poche, et cette conviction qui brûle dans ta poitrine. Tu deviendras {le Roi/la Reine} des Pirates. Tu trouveras le One Piece. Personne ne te croit. Parfait.",
    svg: SVG_INTRO,
    choices: [
      { text: "Embarquer", effects: {}, next: "eb-origines" },
    ],
  },

  {
    id: "eb-origines",
    arc: "east-blue",
    title: "East Blue — Les origines",
    subtitle: "D'où tu viens",
    text: "Mais d'où viens-tu, exactement ? Cette question, les recruteurs de la Marine la posent toujours en premier. Et dans les tavernes de pirates, elle vaut son pesant de Berry. Ton passé définit qui tu es — ou qui tu étais. Avant.",
    svg: SVG_EAST_BLUE,
    choices: [
      {
        text: "D'un village côtier. Un soir, Shanks le Roux y a fait escale.",
        sub: "Il t'a appelé {prenom} en riant, avant de lâcher une phrase que tu n'as jamais oubliée.",
        effects: { force: 15, notoriete: 5 },
        next: "eb-choix-fondateur",
      },
      {
        text: "D'une famille noble tombée en disgrâce.",
        sub: "Tu as appris à sourire dans les salons, à survivre dans la rue — et à reconnaître certains fruits dans les livres de ton père.",
        effects: { notoriete: 15, equipage: 5 },
        setFlags: ["origine-noble"],
        next: "eb-choix-fondateur",
      },
      {
        text: "De nulle part. Tu t'es inventé toi-même.",
        sub: "Pierre après pierre. Sans filet, sans nom de famille.",
        effects: { force: 8, notoriete: 5, equipage: 7 },
        next: "eb-choix-fondateur",
      },
    ],
  },

  {
    id: "eb-choix-fondateur",
    arc: "east-blue",
    title: "East Blue — Le choix fondateur",
    subtitle: "Une épave, un coffret, un mystère",
    text: "Sur l'épave d'un navire pirate coulé, parmi les caisses brisées et le sel, tu trouves un coffret en bois rare. À l'intérieur : un fruit aux couleurs étranges, que tu ne reconnais pas. Personne, sur ce quai désert, ne pourrait te dire ce qu'il fait. Il n'y a qu'une façon de le savoir.",
    svg: SVG_DEVIL_FRUIT,
    choices: [
      {
        text: "Ouvrir le coffret, l'examiner de plus près.",
        effects: {},
        pickFruitCandidate: {},
        next: "eb-fruit-trouvaille",
      },
      {
        text: "Refermer le coffret. Le vrai pouvoir vient du corps, de l'esprit, de la volonté.",
        sub: "La voie du Haki. Plus longue, plus profonde.",
        effects: { force: 20 },
        next: "eb-avec-haki",
      },
    ],
  },

  {
    id: "eb-fruit-trouvaille",
    arc: "east-blue",
    title: "East Blue — Le fruit inconnu",
    subtitle: "Manger l'inconnu",
    text: (flags) => {
      const fruit = getPendingFruit();
      if (fruit && revealsFruit(flags, fruit)) {
        return `Tu tournes le fruit entre tes doigts. Tu le reconnais : un ${fruit.nom}. ${fruit.description} À toi de décider si tu le veux vraiment.`;
      }
      return "Tu tournes le fruit entre tes doigts, sans la moindre idée de ce qu'il cache. Aucun livre, aucune rumeur de taverne ne t'a jamais préparé à celui-là. Manger un fruit inconnu, c'est signer un pacte à l'aveugle.";
    },
    svg: SVG_DEVIL_FRUIT,
    choices: [
      {
        text: "Le manger. Peu importe le prix.",
        sub: "Puissance — la mer te tuera si tu tombes à l'eau.",
        effects: {},
        eatPendingFruit: { next: "eb-avec-fruit" },
      },
      {
        text: "Le laisser. Refermer le coffret et repartir.",
        effects: {},
        next: "eb-avec-haki",
      },
    ],
  },

  {
    id: "eb-avec-fruit",
    arc: "east-blue",
    title: "East Blue — L'éveil du Fruit",
    subtitle: "Vivre avec le pouvoir payé cher",
    text: (flags) => {
      const fruit = findEatenFruit(flags);
      const nom = fruit?.nom ?? "pouvoir";
      return `${nom} explose en toi. Le monde change de couleur l'espace d'un instant. Mais quand tu tombes à l'eau par accident, tu coules comme une pierre — la mer est ton ennemie jurée, désormais. Ce prix payé, il ne te reste plus qu'à apprendre à vivre avec.`;
    },
    svg: SVG_DEVIL_FRUIT,
    choices: [
      {
        text: "Bâtir un équipage. Tes faiblesses, leurs forces.",
        sub: "+Équipage, +Notoriété",
        effects: { equipage: 25, notoriete: 15 },
        next: "eb-rencontre-epeiste",
      },
      {
        text: "Maîtriser ton Fruit jusqu'à la perfection. Seul, pour l'instant.",
        sub: "+Fruit du Démon, +Force",
        effects: { fruitDuDemon: 15, force: 10 },
        next: "eb-rencontre-epeiste",
      },
    ],
  },

  {
    id: "eb-avec-haki",
    arc: "east-blue",
    title: "East Blue — L'éveil du Haki",
    subtitle: "La voie du corps et de la volonté",
    text: "Des mois passent. Tu saignes, tu recommences. Un vieux maître de mer t'initie aux rudiments du Haki d'Observation — voir sans yeux, sentir sans toucher. Lentement, quelque chose s'éveille. Quelque chose que peu de pirates connaissent. Tu n'as pas de Fruit, mais tu commences à comprendre ce que signifie vraiment la force.",
    svg: SVG_HAKI,
    choices: [
      {
        text: "Rassembler des alliés pour affronter la Grand Line.",
        sub: "+Équipage, +Notoriété",
        effects: { equipage: 20, notoriete: 10 },
        next: "eb-rencontre-epeiste",
      },
      {
        text: "Continuer seul. Un roi n'a besoin de personne au départ.",
        sub: "+Force",
        effects: { force: 15 },
        next: "eb-rencontre-epeiste",
      },
    ],
  },

  {
    id: "eb-rencontre-epeiste",
    arc: "east-blue",
    title: "East Blue — Un épéiste dans une taverne",
    subtitle: "Un épéiste à convaincre",
    text: "Dans l'arrière-salle d'une taverne qui sent la sciure et le rhum bon marché, un jeune épéiste vient de mettre trois hommes au tapis pour une histoire de dette impayée. Il te regarde, amusé, comme s'il jaugeait déjà un {espece} qui vient d'entrer.",
    svg: SVG_EAST_BLUE,
    choices: [
      {
        text: "Le défier en duel, pour de vrai. Jauger sa force avant de lui faire confiance.",
        effects: {},
        duel: {
          opponentPower: 35,
          win: "eb-epeiste-duel-victoire",
          winFlags: ["epeiste-recrute"],
          loseMinor: "eb-epeiste-duel-defaite",
          loseMajor: "eb-epeiste-duel-blessure",
          injuryFlag: "cicatrice-epeiste",
          counterFruitTypes: ["Logia"],
        },
      },
      {
        text: "Lui proposer directement de rejoindre l'équipage, sans épreuve.",
        sub: "+Équipage, +Force — un pari sur la confiance.",
        effects: { equipage: 20, force: 10 },
        setFlags: ["epeiste-recrute"],
        next: "eb-marine",
      },
      {
        text: "Continuer sa route. Pas le temps pour les bagarres de comptoir.",
        effects: {},
        next: "eb-marine",
      },
    ],
  },

  {
    id: "eb-epeiste-duel-victoire",
    arc: "east-blue",
    title: "East Blue — Un serment de lame",
    subtitle: "Un adversaire convaincu",
    text: "Tu le mets à terre, la pointe de ta lame — ou de ton poing — sous sa gorge. Il éclate de rire au lieu de supplier. \"C'est bon, tu m'as convaincu.\" Il se relève, tend la main. \"{Enchanté/Enchantée}, {prenom}.\" Un équipage vient de gagner son épéiste.",
    svg: SVG_EAST_BLUE,
    choices: [{ text: "Continuer.", effects: {}, next: "eb-marine" }],
  },

  {
    id: "eb-epeiste-duel-defaite",
    arc: "east-blue",
    title: "East Blue — Un duel serré, perdu de peu",
    subtitle: "Une défaite honorable",
    text: "Le combat est plus long que prévu. Tu finis à terre, {essoufflé/essoufflée}, mais {entier/entière}. Il te tend la main pour t'aider à te relever. \"Pas mal. Mais je ne rejoins pas les épaves.\" Il s'en va en sifflotant. Tu croiseras peut-être sa route ailleurs, un jour.",
    svg: SVG_EAST_BLUE,
    choices: [{ text: "Continuer.", effects: {}, next: "eb-marine" }],
  },

  {
    id: "eb-epeiste-duel-blessure",
    arc: "east-blue",
    title: "East Blue — Le prix de l'orgueil",
    subtitle: "Une cicatrice en prime",
    text: "Il est meilleur que tu ne le pensais — bien meilleur. Sa lame te marque avant que tu ne comprennes ton erreur : une entaille profonde le long du bras, pas mortelle, mais qui laissera une trace. Il s'excuse, presque sincère, et s'en va sans se retourner. Tu repars avec une leçon, et une cicatrice pour te la rappeler.",
    svg: SVG_EAST_BLUE,
    choices: [{ text: "Continuer, tant bien que mal.", effects: {}, next: "eb-marine" }],
  },

  {
    id: "eb-marine",
    arc: "east-blue",
    title: "East Blue — Première confrontation",
    subtitle: "Affronter la Marine ou s'éclipser",
    text: "Un capitaine de la Marine te coupe la route. Il est fier, arrogant, et il brandit un mandat d'arrestation où on peut lire, en toutes lettres : {prenom}. Une petite foule de villageois regarde depuis le quai. Ce moment pourrait définir qui tu es — ou du moins ce que les autres diront de toi.",
    svg: SVG_MARINE,
    choices: [
      {
        text: "Le vaincre en public. Laisser une prime sur ta tête et un souvenir dans les mémoires.",
        sub: "+Notoriété — le combat coûte",
        effects: { notoriete: 25, force: -5 },
        next: "eb-depart",
      },
      {
        text: "Disparaître dans les ruelles. L'esquive aussi est une forme de sagesse.",
        sub: "+Force, +Équipage",
        effects: { force: 5, equipage: 5 },
        next: "eb-depart",
      },
    ],
  },

  {
    id: "eb-depart",
    arc: "east-blue",
    title: "East Blue — Dernier regard vers le port",
    subtitle: "Cap sur la Grand Line",
    text: (flags) => {
      const morceaux = ["East Blue rétrécit derrière toi, plus petit à chaque vague."];
      if (flags.has("epeiste-recrute")) {
        morceaux.push("Ton épéiste s'entraîne déjà sur le pont, imperturbable.");
      }
      const injuries = describeInjuries(flags);
      if (injuries.length > 0) {
        morceaux.push(`Tu pars avec ${injuries.join(" et ")} — un souvenir qui ne s'efface pas.`);
      }
      morceaux.push("Devant toi : la Grand Line, et tout ce qu'elle refuse d'annoncer à l'avance.");
      return morceaux.join(" ");
    },
    svg: SVG_EAST_BLUE,
    choices: [{ text: "Mettre le cap sur la Grand Line.", effects: {}, next: "gl-arrivee" }],
  },

  {
    id: "gl-arrivee",
    arc: "grand-line",
    title: "Grand Line — Le Paradis",
    subtitle: "Le seuil de la Grand Line",
    text: "Le Log Pose pointe. Derrière toi, East Blue — les mers les plus calmes du monde. Devant, la Grand Line. Un passage étroit, des îles où la météo délire, des créatures qui ont oublié la taille raisonnable. Tu sens la différence immédiatement. L'air est plus dense, plus chargé, comme si le monde respirait autrement ici.",
    svg: SVG_GRAND_LINE,
    choices: [
      { text: "Avancer.", effects: {}, next: "gl-epeiste-retour" },
    ],
  },

  {
    id: "gl-epeiste-retour",
    arc: "grand-line",
    title: "Grand Line — Un visage familier ?",
    subtitle: "Une seconde chance de recruter",
    text: (flags) =>
      flags.has("epeiste-recrute")
        ? "Sur le pont, ton épéiste aiguise sa lame sans un mot, les yeux fixés sur l'horizon nouveau. La Grand Line ne l'impressionne pas — ou il le cache bien."
        : "Sur les quais d'une île de passage, tu croises à nouveau ce même épéiste d'East Blue, plus loin de chez lui que toi. Il te reconnaît, hausse un sourcil. \"Toujours vivant, à ce que je vois.\"",
    svg: SVG_GRAND_LINE,
    choices: [
      {
        text: "Lui proposer, une seconde fois, de rejoindre l'équipage.",
        sub: "+Équipage, +Force",
        effects: { equipage: 15, force: 8 },
        setFlags: ["epeiste-recrute"],
        forbidsFlags: ["epeiste-recrute"],
        next: "gl-rencontre-navigatrice",
      },
      {
        text: "Continuer sa route.",
        effects: {},
        next: "gl-rencontre-navigatrice",
      },
    ],
  },

  {
    id: "gl-rencontre-navigatrice",
    arc: "grand-line",
    title: "Grand Line — Une navigatrice pour les mers folles",
    subtitle: "Une navigatrice à embarquer",
    text: "Sur ce même quai, une jeune femme discute avec un marchand de cartes marines, l'air de connaître les courants mieux que quiconque à cent lieues à la ronde. La Grand Line dévore les navigateurs médiocres. Un bon connaît la différence entre une accalmie et un piège.",
    svg: SVG_GRAND_LINE,
    choices: [
      {
        text: "L'embarquer. Tu jugeras de sa valeur plus tard, sur le terrain.",
        sub: "+Équipage — sa vraie valeur reste à découvrir.",
        effects: { equipage: 10 },
        setFlags: ["navigatrice-recrute"],
        next: "gl-vol-fruit-rencontre",
      },
      {
        text: "Refuser. Un problème de plus à nourrir sur un bateau déjà trop plein.",
        effects: {},
        next: "gl-vol-fruit-rencontre",
      },
    ],
  },

  {
    id: "gl-vol-fruit-rencontre",
    arc: "grand-line",
    title: "Grand Line — Un coffre bien gardé",
    subtitle: "Voler un Fruit du Démon",
    text: "Un pirate isolé, la démarche trop assurée pour être honnête, traîne un petit coffre verrouillé qu'il ne quitte jamais des yeux. La rumeur du port dit qu'il contient un Fruit du Démon. La rumeur du port dit beaucoup de choses, mais celle-ci sent le vrai.",
    svg: SVG_ALLIANCE,
    choices: [
      {
        text: "L'affronter pour le lui prendre.",
        effects: {},
        duel: {
          opponentPower: 45,
          win: "gl-vol-fruit-butin",
          winPicksFruit: "any",
          loseMinor: "gl-vol-fruit-echec",
          loseMajor: "gl-vol-fruit-blessure",
          injuryFlag: "main-brisee",
        },
      },
      {
        text: "Le laisser partir. Pas la peine du risque, cette fois.",
        effects: {},
        next: "gl-grand-choix",
      },
    ],
  },

  {
    id: "gl-vol-fruit-butin",
    arc: "grand-line",
    title: "Grand Line — Le coffre, enfin ouvert",
    subtitle: "Le butin, à manger ou non",
    text: (flags) => {
      const fruit = getPendingFruit();
      if (fruit && revealsFruit(flags, fruit)) {
        return `Le pirate au sol, tu ouvres le coffre : un ${fruit.nom}. ${fruit.description} Le voler ne le rend pas moins tentant.`;
      }
      return "Le pirate au sol, tu ouvres le coffre : un fruit que tu ne reconnais pas, aux couleurs qui ne ressemblent à rien de familier. Voler un pouvoir, c'est aussi voler l'incertitude qui va avec.";
    },
    svg: SVG_ALLIANCE,
    choices: [
      {
        text: "Le manger.",
        effects: {},
        forbidsFlags: ["a-mange-un-fruit"],
        eatPendingFruit: { next: "gl-post-vol-fruit-mange" },
      },
      {
        text: "Le garder pour plus tard, sans le manger.",
        effects: {},
        next: "gl-grand-choix",
      },
    ],
  },

  {
    id: "gl-post-vol-fruit-mange",
    arc: "grand-line",
    title: "Grand Line — Un pouvoir volé",
    subtitle: "Un pouvoir volé, désormais tien",
    text: (flags) => {
      const fruit = findEatenFruit(flags);
      return `${fruit?.nom ?? "Le pouvoir"} coule en toi, arraché plutôt que trouvé. Ça ne change rien à l'effet. ${fruit?.description ?? ""}`;
    },
    svg: SVG_ALLIANCE,
    choices: [{ text: "Continuer.", effects: {}, next: "gl-grand-choix" }],
  },

  {
    id: "gl-vol-fruit-echec",
    arc: "grand-line",
    title: "Grand Line — Le coffre s'échappe",
    subtitle: "Le coffre t'échappe",
    text: "Le combat tourne mal. Le pirate profite d'une ouverture, ramasse son coffre et disparaît dans la foule du port. Tu restes debout, les mains vides, avec juste ta fierté écornée.",
    svg: SVG_ALLIANCE,
    choices: [{ text: "Continuer.", effects: {}, next: "gl-grand-choix" }],
  },

  {
    id: "gl-vol-fruit-blessure",
    arc: "grand-line",
    title: "Grand Line — Mauvais calcul",
    subtitle: "Une main brisée pour rien",
    text: "Il se défend mieux que son allure de vantard ne le laissait deviner. Un coup mal paré, et ta main ne se refermera plus jamais tout à fait comme avant. Il s'enfuit avec son coffre, et toi avec la leçon.",
    svg: SVG_ALLIANCE,
    choices: [{ text: "Continuer, la main serrée contre toi.", effects: {}, next: "gl-grand-choix" }],
  },

  {
    id: "gl-grand-choix",
    arc: "grand-line",
    title: "Grand Line — Choisir son camp",
    subtitle: "Choisir un camp — ou aucun",
    text: "À Loguetown, trois propositions arrivent presque en même temps. Crocodile, ex-Corsaire au sable entre les doigts, t'offre une alliance discrète. Big Mom, Emperatrice du sucre et de la mort, a entendu parler de toi — frapper son territoire serait une déclaration de guerre qui ferait trembler les mers. Ou tu refuses les deux et traces ta propre ligne.",
    svg: SVG_ALLIANCE,
    choices: [
      {
        text: "S'allier à Crocodile. La politique avant la violence.",
        sub: "+Notoriété, +Équipage",
        effects: { notoriete: 20, equipage: 15 },
        next: "nm-arrivee",
      },
      {
        text: "Foncer sur le territoire de Big Mom. Frapper fort, frapper maintenant.",
        sub: "+Notoriété (beaucoup)",
        effects: { notoriete: 35 },
        next: "nm-arrivee",
      },
      {
        text: "Refuser les deux. Faire sa propre route.",
        sub: "+Force, +Notoriété, +Équipage",
        effects: { force: 10, notoriete: 10, equipage: 10 },
        next: "nm-arrivee",
      },
    ],
  },

  {
    id: "nm-arrivee",
    arc: "nouveau-monde",
    title: "Nouveau Monde",
    subtitle: "Le seuil du Nouveau Monde",
    text: "De l'autre côté de Fishman Island, le Nouveau Monde t'attend. Ici, même la pluie peut brûler. Les quatre Empereurs tiennent ces mers comme leurs jardins privés. Kaido de la Bête domine Wano. Barbe Noire s'étend. Et quelque part, sur un bout de carte que personne ne partage vraiment, le One Piece attend. Tu es plus fort qu'à East Blue. Pas encore assez.",
    svg: SVG_NOUVEAU_MONDE,
    choices: [
      { text: "S'y aventurer.", effects: {}, next: "nm-rencontre-medecin" },
    ],
  },

  {
    id: "nm-rencontre-medecin",
    arc: "nouveau-monde",
    title: "Nouveau Monde — Un médecin sans navire",
    subtitle: "Un médecin à recruter",
    text: "Sur une île à moitié engloutie, un médecin erre depuis le naufrage de son propre équipage. Il connaît les blessures de guerre, les poisons des Logia, et — détail qu'il glisse presque timidement — les Fruits du Démon, qu'il a étudiés toute sa vie.",
    svg: SVG_NOUVEAU_MONDE,
    choices: [
      {
        text: "L'accueillir à bord.",
        sub: "+Équipage, +Force — et une vraie connaissance des fruits.",
        effects: { equipage: 15, force: 5 },
        setFlags: ["medecin-recrute", "compagnon-connaisseur"],
        next: "nm-quete-fruit",
      },
      {
        text: "Continuer seul. Une bouche de plus à nourrir, si près du but.",
        effects: {},
        next: "nm-quete-fruit",
      },
    ],
  },

  {
    id: "nm-quete-fruit",
    arc: "nouveau-monde",
    title: "Nouveau Monde — La légende du bistouri",
    subtitle: "Partir en quête de l'Ope Ope no Mi",
    text: "Une rumeur revient sans cesse dans les ports du Nouveau Monde : quelque part circule l'Ope Ope no Mi, le fruit du \"Chirurgien de la Mort\", capable — dit-on — de vendre jusqu'à l'immortalité elle-même. Le trouver prendrait du temps. Et rien ne garantit que la rumeur dise vrai.",
    svg: SVG_NOUVEAU_MONDE,
    choices: [
      {
        text: "Partir à sa recherche, coûte que coûte.",
        effects: {},
        duel: {
          opponentPower: 45,
          statUsed: "notoriete",
          win: "nm-fruit-ope-ope-trouve",
          loseMinor: "nm-quete-fruit-inconnu",
          loseMinorPicksFruit: "any",
          loseMajor: "nm-quete-fruit-echec",
          injuryFlag: "jambe-blessee",
        },
      },
      {
        text: "Laisser cette légende à d'autres.",
        effects: {},
        next: "nm-wano",
      },
    ],
  },

  {
    id: "nm-fruit-ope-ope-trouve",
    arc: "nouveau-monde",
    title: "Nouveau Monde — L'Ope Ope no Mi",
    subtitle: "Le fruit le plus recherché des mers",
    text: "La rumeur disait vrai. Après des semaines de recherche, tu tiens enfin l'Ope Ope no Mi entre tes mains — le fruit le plus recherché des mers, celui que même les Empereurs se disputent en silence.",
    svg: SVG_NOUVEAU_MONDE,
    choices: [
      {
        text: "Le dévorer. Ce pouvoir sera tien.",
        sub: "+Notoriété (beaucoup), +Force",
        effects: { notoriete: 30, force: 5, fruitDuDemon: 15 },
        setFlags: ["fruit-ope-ope", "a-mange-un-fruit"],
        forbidsFlags: ["a-mange-un-fruit"],
        next: "nm-wano",
      },
      {
        text: "Le garder sans le manger. Pas encore prêt à porter ce poids.",
        effects: {},
        next: "nm-wano",
      },
    ],
  },

  {
    id: "nm-quete-fruit-inconnu",
    arc: "nouveau-monde",
    title: "Nouveau Monde — Une autre trouvaille",
    subtitle: "Une trouvaille de consolation",
    text: (flags) => {
      const fruit = getPendingFruit();
      if (fruit && revealsFruit(flags, fruit)) {
        return `L'Ope Ope no Mi reste introuvable. Mais au fond d'une grotte oubliée, tu tombes sur autre chose : un ${fruit.nom}. ${fruit.description}`;
      }
      return "L'Ope Ope no Mi reste introuvable. Mais au fond d'une grotte oubliée, tu tombes sur un autre fruit — inconnu, celui-là, sans la moindre légende pour te préparer à ce qu'il cache.";
    },
    svg: SVG_NOUVEAU_MONDE,
    choices: [
      {
        text: "Le manger, puisqu'il est là.",
        effects: {},
        forbidsFlags: ["a-mange-un-fruit"],
        eatPendingFruit: { next: "nm-wano" },
      },
      {
        text: "Le laisser. Une légende à la fois suffit.",
        effects: {},
        next: "nm-wano",
      },
    ],
  },

  {
    id: "nm-quete-fruit-echec",
    arc: "nouveau-monde",
    title: "Nouveau Monde — La quête de trop",
    subtitle: "La quête qui a coûté une jambe",
    text: "La recherche tourne au désastre. Un éboulement, une chute mal négociée, et ta jambe ne te portera plus jamais aussi bien qu'avant. L'Ope Ope no Mi restera une légende parmi d'autres — pour toi, en tout cas.",
    svg: SVG_NOUVEAU_MONDE,
    choices: [{ text: "Continuer, en boitant.", effects: {}, next: "nm-wano" }],
  },

  {
    id: "nm-wano",
    arc: "nouveau-monde",
    title: "Nouveau Monde — Wano",
    subtitle: "Trois chemins à Wano",
    text: "Wano. Un pays fermé au monde, étouffé sous la botte de Kaido depuis vingt ans. Ses habitants résistent en silence. C'est ici que tout peut basculer — ou se terminer. Trois chemins s'ouvrent devant toi.",
    svg: SVG_WANO,
    choices: [
      {
        text: "Chercher les Road Ponéglyphes. Connaître la route avant de courir.",
        sub: "+Notoriété, +Force",
        effects: { notoriete: 20, force: 5 },
        next: "nm-avant-laugh-tale",
      },
      {
        text: "Libérer Wano d'abord. Un Roi des Pirates doit d'abord servir.",
        sub: "+Équipage, +Notoriété",
        effects: { equipage: 20, notoriete: 15 },
        next: "nm-avant-laugh-tale",
      },
      {
        text: "Défier Kaido ici, maintenant. C'est ça ou rien.",
        sub: "+Force, +Notoriété",
        effects: { force: 20, notoriete: 25 },
        next: "nm-avant-laugh-tale",
      },
    ],
  },

  {
    id: "nm-avant-laugh-tale",
    arc: "nouveau-monde",
    title: "Nouveau Monde — Avant la dernière ligne droite",
    subtitle: "Le calme avant Laugh Tale",
    text: (flags) => {
      const compagnons: string[] = [];
      if (flags.has("epeiste-recrute")) compagnons.push("ton épéiste");
      if (flags.has("navigatrice-recrute")) compagnons.push("ta navigatrice");
      if (flags.has("medecin-recrute")) compagnons.push("ton médecin");

      const morceaux = ["Wano derrière toi, Laugh Tale devant. Le silence, avant la dernière tempête."];
      if (compagnons.length > 0) {
        morceaux.push(`Sur le pont, ${compagnons.join(", ")} attendent, aussi silencieux que toi.`);
      }
      const injuries = describeInjuries(flags);
      if (injuries.length > 0) {
        morceaux.push(`Le voyage t'a laissé ${injuries.join(" et ")} — le prix payé pour arriver jusqu'ici.`);
      }
      const fruit = findEatenFruit(flags);
      if (fruit) {
        morceaux.push(`${fruit.nom} bat toujours en toi, prêt à servir une dernière fois.`);
      }
      return morceaux.join(" ");
    },
    svg: SVG_NOUVEAU_MONDE,
    choices: [{ text: "Voguer vers Laugh Tale.", effects: {}, next: "arc-final" }],
  },

  {
    id: "arc-final",
    arc: "final",
    title: "Laugh Tale — La fin du monde",
    subtitle: "Le dernier voyage",
    text: "Tu y es presque. Après tout ça — les tempêtes, les trahisons, les dieux marins et les Amiaux, les cicatrices qui ne s'effacent pas — tu approches de Laugh Tale. L'île que personne n'a atteinte depuis Gold Roger. Tu penses à ceux qui t'ont aidé. À ceux que tu as perdus. Tu réalises que tu n'es plus le même qu'au début du voyage. Le One Piece t'attend. Mais lequel des pirates que tu es devenu va l'atteindre ?",
    svg: SVG_FINAL,
    choices: [
      { text: "Découvrir mon destin", effects: {}, next: "__ending__" },
    ],
  },

  {
    id: "fin-roi-des-pirates",
    arc: "final",
    title: "Roi des Pirates",
    subtitle: "Le rêve accompli",
    text: "Le One Piece existait vraiment. Personne n'y croyait vraiment — même toi, au fond, tu n'osais pas trop y penser. Et là, devant tes yeux, c'est réel. Gold Roger l'a laissé ici il y a des décennies, en riant. Tu comprends pourquoi. Tu ris aussi. Le Roi des Pirates est mort. Vive le Roi des Pirates.",
    svg: SVG_FIN_ROI,
    isEnding: true,
    endingId: "fin-roi-des-pirates",
    choices: [],
  },

  {
    id: "fin-legende",
    arc: "final",
    title: "La Légende des Mers",
    subtitle: "Une légende, pas un roi",
    text: "Tu n'as pas trouvé le One Piece — pas encore, peut-être jamais. Mais ta prime dépasse celle de la plupart des Empereurs. Ton nom fait trembler les Amiraux. Dans les tavernes de chaque île de la Grand Line, on raconte des histoires sur toi — certaines vraies, d'autres inventées, toutes impressionnantes. Tu n'es pas le Roi. Tu es peut-être quelque chose de plus grand.",
    svg: SVG_FIN_LEGENDE,
    isEnding: true,
    endingId: "fin-legende",
    choices: [],
  },

  {
    id: "fin-retraite",
    arc: "final",
    title: "Le Trésor trouvé",
    subtitle: "Le choix de s'arrêter",
    text: "Ton équipage t'a sauvé la vie douze fois. Tu les as sauvés treize. Un soir, au large d'une île dont personne ne connaît le nom, tu décides que c'est assez. Le monde a tellement de trésors. Pas besoin que ce soit le One Piece. Vous vous installez. La mer est là, toujours là. Et c'est suffisant.",
    svg: SVG_FIN_RETRAITE,
    isEnding: true,
    endingId: "fin-retraite",
    choices: [],
  },

  {
    id: "fin-capture",
    arc: "final",
    title: "Impel Down",
    subtitle: "Enchaîné, pas vaincu",
    text: "La Marine t'a eu. Pas par la force — ils auraient perdu. Mais ils sont malins, et tu étais au mauvais endroit. Les chaînes Seastone coupent ta volonté en deux. Dans ta cellule d'Impel Down, tu comptes tes jours. Et tu commences déjà à planifier l'évasion. Parce que c'est ce que font les pirates. Ils ne s'arrêtent jamais vraiment.",
    svg: SVG_FIN_CAPTURE,
    isEnding: true,
    endingId: "fin-capture",
    choices: [],
  },
];
