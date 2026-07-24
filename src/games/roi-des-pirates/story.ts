import type { StoryNode } from "./types";
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
} from "./illustrations";

export const STORY: StoryNode[] = [
  {
    id: "intro",
    text: "La mer. Elle t'a toujours appelé. Depuis l'enfance sur ce quai de bois vermoulu, tu regardais les voiles disparaître à l'horizon en te disant : un jour, ce sera moi. Ce jour est arrivé. Tu as dix-sept ans. Un couteau à la ceinture, quelques Berry dans la poche, et cette conviction qui brûle dans ta poitrine. Tu deviendras Roi des Pirates. Tu trouveras le One Piece. Personne ne te croit. Parfait.",
    svg: SVG_INTRO,
    choices: [
      { text: "Embarquer", effects: {}, next: "eb-origines" },
    ],
  },

  {
    id: "eb-origines",
    arc: "east-blue",
    title: "East Blue — Les origines",
    text: "Mais d'où viens-tu, exactement ? Cette question, les recruteurs de la Marine la posent toujours en premier. Et dans les tavernes de pirates, elle vaut son pesant de Berry. Ton passé définit qui tu es — ou qui tu étais. Avant.",
    svg: SVG_EAST_BLUE,
    choices: [
      {
        text: "D'un village côtier. Un soir, Shanks le Roux y a fait escale.",
        sub: "Il t'a dit quelque chose en riant. Tu n'as jamais oublié.",
        effects: { force: 15, notoriete: 5 },
        next: "eb-choix-fondateur",
      },
      {
        text: "D'une famille noble tombée en disgrâce.",
        sub: "Tu as appris à sourire dans les salons, à survivre dans la rue.",
        effects: { notoriete: 15, equipage: 5 },
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
    text: "Sur l'épave d'un navire pirate coulé, parmi les caisses brisées et le sel, tu trouves un coffret en bois rare. À l'intérieur : un fruit violet aux spirales étranges. Un Fruit du Démon. Sa valeur est inestimable. Sa malédiction aussi — jamais plus tu ne pourras nager. Tu refermes le coffret. Ou pas.",
    svg: SVG_DEVIL_FRUIT,
    choices: [
      {
        text: "L'avaler. Peu importe le prix.",
        sub: "Puissance absolue. La mer te tuera si tu tombes à l'eau.",
        effects: { fruitDuDemon: 50, force: 5 },
        next: "eb-avec-fruit",
      },
      {
        text: "Rester humain. Le vrai pouvoir vient du corps, de l'esprit, de la volonté.",
        sub: "La voie du Haki. Plus longue, plus profonde.",
        effects: { force: 20 },
        next: "eb-avec-haki",
      },
    ],
  },

  {
    id: "eb-avec-fruit",
    arc: "east-blue",
    title: "East Blue — L'éveil du Fruit",
    text: "Le monde explose. Le pouvoir coule dans tes veines comme un fleuve de feu. Mais quand tu tombes à l'eau par accident, tu coules comme une pierre. La mer est ton ennemie jurée, désormais. Des compagnons se présentent — un jeune épéiste trop ambitieux, une navigatrice qui lit les étoiles. Ensemble ou seul ?",
    svg: SVG_DEVIL_FRUIT,
    choices: [
      {
        text: "Bâtir un équipage. Tes faiblesses, leurs forces.",
        sub: "+Équipage, +Notoriété",
        effects: { equipage: 25, notoriete: 15 },
        next: "eb-marine",
      },
      {
        text: "Maîtriser ton Fruit jusqu'à la perfection. Seul, pour l'instant.",
        sub: "+Fruit du Démon, +Force",
        effects: { fruitDuDemon: 15, force: 10 },
        next: "eb-marine",
      },
    ],
  },

  {
    id: "eb-avec-haki",
    arc: "east-blue",
    title: "East Blue — L'éveil du Haki",
    text: "Des mois passent. Tu saignes, tu recommences. Un vieux maître de mer t'initie aux rudiments du Haki d'Observation — voir sans yeux, sentir sans toucher. Lentement, quelque chose s'éveille. Quelque chose que peu de pirates connaissent. Tu n'as pas de Fruit, mais tu commences à comprendre ce que signifie vraiment la force.",
    svg: SVG_HAKI,
    choices: [
      {
        text: "Rassembler des alliés pour affronter la Grand Line.",
        sub: "+Équipage, +Notoriété",
        effects: { equipage: 20, notoriete: 10 },
        next: "eb-marine",
      },
      {
        text: "Continuer seul. Un roi n'a besoin de personne au départ.",
        sub: "+Force",
        effects: { force: 15 },
        next: "eb-marine",
      },
    ],
  },

  {
    id: "eb-marine",
    arc: "east-blue",
    title: "East Blue — Première confrontation",
    text: "Un capitaine de la Marine te coupe la route. Il est fier, arrogant, et il a un mandat d'arrestation avec ton nom dessus. Une petite foule de villageois regarde depuis le quai. Ce moment pourrait définir qui tu es — ou du moins ce que les autres diront de toi.",
    svg: SVG_MARINE,
    choices: [
      {
        text: "Le vaincre en public. Laisser une prime sur ta tête et un souvenir dans les mémoires.",
        sub: "+Notoriété — le combat coûte",
        effects: { notoriete: 25, force: -5 },
        next: "gl-arrivee",
      },
      {
        text: "Disparaître dans les ruelles. L'esquive aussi est une forme de sagesse.",
        sub: "+Force, +Équipage",
        effects: { force: 5, equipage: 5 },
        next: "gl-arrivee",
      },
    ],
  },

  {
    id: "gl-arrivee",
    arc: "grand-line",
    title: "Grand Line — Le Paradis",
    text: "Le Log Pose pointe. Derrière toi, East Blue — les mers les plus calmes du monde. Devant, la Grand Line. Un passage étroit, des îles où la météo délire, des créatures qui ont oublié la taille raisonnable. Tu sens la différence immédiatement. L'air est plus dense, plus chargé, comme si le monde respirait autrement ici.",
    svg: SVG_GRAND_LINE,
    choices: [
      { text: "Avancer.", effects: {}, next: "gl-grand-choix" },
    ],
  },

  {
    id: "gl-grand-choix",
    arc: "grand-line",
    title: "Grand Line — Choisir son camp",
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
    text: "De l'autre côté de Fishman Island, le Nouveau Monde t'attend. Ici, même la pluie peut brûler. Les quatre Empereurs tiennent ces mers comme leurs jardins privés. Kaido de la Bête domine Wano. Barbe Noire s'étend. Et quelque part, sur un bout de carte que personne ne partage vraiment, le One Piece attend. Tu es plus fort qu'à East Blue. Pas encore assez.",
    svg: SVG_NOUVEAU_MONDE,
    choices: [
      { text: "S'y aventurer.", effects: {}, next: "nm-wano" },
    ],
  },

  {
    id: "nm-wano",
    arc: "nouveau-monde",
    title: "Nouveau Monde — Wano",
    text: "Wano. Un pays fermé au monde, étouffé sous la botte de Kaido depuis vingt ans. Ses habitants résistent en silence. C'est ici que tout peut basculer — ou se terminer. Trois chemins s'ouvrent devant toi.",
    svg: SVG_WANO,
    choices: [
      {
        text: "Chercher les Road Ponéglyphes. Connaître la route avant de courir.",
        sub: "+Notoriété, +Force",
        effects: { notoriete: 20, force: 5 },
        next: "arc-final",
      },
      {
        text: "Libérer Wano d'abord. Un Roi des Pirates doit d'abord servir.",
        sub: "+Équipage, +Notoriété",
        effects: { equipage: 20, notoriete: 15 },
        next: "arc-final",
      },
      {
        text: "Défier Kaido ici, maintenant. C'est ça ou rien.",
        sub: "+Force, +Notoriété",
        effects: { force: 20, notoriete: 25 },
        next: "arc-final",
      },
    ],
  },

  {
    id: "arc-final",
    arc: "final",
    title: "Laugh Tale — La fin du monde",
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
    text: "La Marine t'a eu. Pas par la force — ils auraient perdu. Mais ils sont malins, et tu étais au mauvais endroit. Les chaînes Seastone coupent ta volonté en deux. Dans ta cellule d'Impel Down, tu comptes tes jours. Et tu commences déjà à planifier l'évasion. Parce que c'est ce que font les pirates. Ils ne s'arrêtent jamais vraiment.",
    svg: SVG_FIN_CAPTURE,
    isEnding: true,
    endingId: "fin-capture",
    choices: [],
  },
];
