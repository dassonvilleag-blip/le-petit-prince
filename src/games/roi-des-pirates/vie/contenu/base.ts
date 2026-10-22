// Le socle : les morts, les questions des pauses, et les quelques
// événements dont le moteur a besoin pour qu'une vie tienne debout.

import type { Evenement, Mort, QuestionPause } from "../types.ts";

export const morts: Mort[] = [
  { id: "vieillesse", libelle: "de vieillesse, dans son sommeil", categorie: "naturelle" },
  { id: "coeur", libelle: "le cœur arrêté d'un coup", categorie: "naturelle" },
  { id: "maladie", libelle: "emporté{/e} par une maladie que personne n'a su soigner", categorie: "maladie" },
  { id: "fievre-enfance", libelle: "emporté{/e} par une fièvre, trop petit{/e} pour s'en souvenir", categorie: "maladie" },
  { id: "accident", libelle: "dans un accident bête, de ceux qui n'arrivent qu'aux autres", categorie: "accident" },
  { id: "naufrage", libelle: "dans un naufrage, loin de toute côte", categorie: "mer" },
  { id: "roi-des-mers", libelle: "dévoré{/e} par un Roi des Mers", categorie: "mer" },
  { id: "tempete-grand-line", libelle: "dans une tempête de Grand Line qu'aucun navigateur n'avait vue venir", categorie: "mer" },
  { id: "noye-fruit", libelle: "noyé{/e}, le fruit du démon dans le ventre et la mer qui ne pardonne pas", categorie: "mer" },
  { id: "pirates-raid", libelle: "pendant l'attaque de pirates sur son île", categorie: "combat" },
  { id: "combat", libelle: "au combat, l'arme à la main", categorie: "combat" },
  { id: "execution", libelle: "exécuté{/e} sur une place publique", categorie: "execution" },
  { id: "epuisement", libelle: "d'épuisement, les chaînes encore aux poignets", categorie: "autre" },
  { id: "prison", libelle: "au fond d'une cellule, oublié{/e} de tous", categorie: "autre" },
  { id: "deux-fruits", libelle: "le corps déchiré par un second fruit du démon", categorie: "autre" },
  { id: "sacrifice", libelle: "en protégeant quelqu'un, et sans regret", categorie: "sacrifice" },
];

export const pauses: QuestionPause[] = [
  { age: 5, texte: ["Vous avez cinq ans. Qu'est-ce qui vous fait peur ?", "Cinq ans. Si vous pouviez demander une seule chose à la mer, ce serait quoi ?"] },
  { age: 15, texte: ["Quinze ans. Qu'aimeriez-vous dire à l'enfant que vous étiez ?", "Quinze ans. Qu'est-ce que vous ne pardonnerez jamais ?"] },
  { age: 30, texte: ["Trente ans. Êtes-vous devenu{/e} ce que vous vouliez être ?", "Trente ans. Qui vous manque ?"] },
  { age: 50, texte: ["Cinquante ans. De quoi êtes-vous le plus fier{/e} ?", "Cinquante ans. Qu'est-ce que vous referiez autrement ?"] },
  { age: 70, texte: ["Soixante-dix ans. Que voulez-vous qu'on retienne de vous ?", "Soixante-dix ans. Avez-vous eu une belle vie ?"] },
];

// Les événements de naissance et le rêve d'enfance sont dans enfance.ts.
export const evenements: Evenement[] = [];
