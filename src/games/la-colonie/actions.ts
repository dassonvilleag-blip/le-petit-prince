// La Colonie — les actions du joueur. Chaque fonction valide, mute l'état et
// retourne null en cas de succès, ou le message d'erreur à afficher.

import {
  CHANTIERS_MAX,
  CREUSE_COUT,
  CREUSE_SECONDES_BASE,
  CREUSE_SECONDES_PAR_RANG,
  EXPEDITION_PAR_ID,
  REINE,
  REINE_MAX,
  SALLE_PAR_ID,
  UNITE_PAR_ID,
  type UnitId,
} from "./data";
import {
  chantiersEnCours,
  constructible,
  creusable,
  fileMax,
  nbSalles,
  nurserieDisponible,
  payer,
  peutPayer,
  popMax,
  popTotale,
  type ColonyState,
  type ExpeditionState,
} from "./state";

export function creuser(s: ColonyState, x: number, y: number, now: number): string | null {
  if (!creusable(s, x, y)) return "Il faut creuser depuis une galerie existante.";
  if (chantiersEnCours(s) >= CHANTIERS_MAX) return "Toutes les équipes de chantier sont occupées.";
  if (!peutPayer(s, { feuilles: CREUSE_COUT })) return `Il faut ${CREUSE_COUT} 🍃 pour creuser.`;
  payer(s, { feuilles: CREUSE_COUT });
  const secondes = CREUSE_SECONDES_BASE + CREUSE_SECONDES_PAR_RANG * y;
  s.digs.push({ x, y, fin: now + secondes * 1000 });
  return null;
}

export function construire(s: ColonyState, type: string, x: number, y: number, now: number): string | null {
  const def = SALLE_PAR_ID.get(type);
  if (!def) return "Salle inconnue.";
  if (def.symbioteRequis && !s.symbiotes.includes(def.symbioteRequis))
    return "Cette espèce n'a pas encore rejoint la colonie.";
  if (nbSalles(s, type) >= def.maxParReine[s.reineLevel - 1])
    return "La Reine doit gagner un niveau pour autoriser cette salle.";
  if (!constructible(s, x, y, def.w, def.h)) return "Il faut de la terre vierge, collée aux galeries.";
  if (chantiersEnCours(s) >= CHANTIERS_MAX) return "Toutes les équipes de chantier sont occupées.";
  const niveau = def.niveaux[0];
  if (!peutPayer(s, niveau.cout)) return "Pas assez de ressources.";
  payer(s, niveau.cout);
  s.rooms.push({ uid: s.nextUid++, type, x, y, level: 0, chantierFin: now + niveau.secondes * 1000 });
  return null;
}

export function ameliorerSalle(s: ColonyState, uid: number, now: number): string | null {
  const room = s.rooms.find((r) => r.uid === uid);
  if (!room || room.type === "reine") return "Salle introuvable.";
  if (room.chantierFin !== null) return "Un chantier est déjà en cours ici.";
  const def = SALLE_PAR_ID.get(room.type)!;
  if (room.level >= def.niveaux.length) return "Cette salle est déjà au niveau maximum.";
  if (room.level >= s.reineLevel) return "La Reine doit d'abord gagner un niveau.";
  if (chantiersEnCours(s) >= CHANTIERS_MAX) return "Toutes les équipes de chantier sont occupées.";
  const niveau = def.niveaux[room.level];
  if (!peutPayer(s, niveau.cout)) return "Pas assez de ressources.";
  payer(s, niveau.cout);
  room.chantierFin = now + niveau.secondes * 1000;
  return null;
}

export function ameliorerReine(s: ColonyState, now: number): string | null {
  if (s.reineChantierFin !== null) return "La Reine mue déjà.";
  if (s.reineLevel >= REINE_MAX) return "La Reine règne déjà au sommet.";
  const niveau = REINE[s.reineLevel]; // coût du niveau suivant
  if (!peutPayer(s, niveau.cout)) return "Pas assez de ressources.";
  payer(s, niveau.cout);
  s.reineChantierFin = now + niveau.secondes * 1000;
  return null;
}

export function pondre(s: ColonyState, unit: UnitId, now: number): string | null {
  if (!nurserieDisponible(s)) return "Construis d'abord une nurserie.";
  const def = UNITE_PAR_ID.get(unit)!;
  if (s.queue.length >= fileMax(s)) return "La nurserie est pleine.";
  if (popTotale(s) >= popMax(s)) return "La colonie est au complet — améliore la Reine.";
  if (!peutPayer(s, def.cout)) return "Pas assez de ressources.";
  payer(s, def.cout);
  s.queue.push({ unit, fin: s.queue.length === 0 ? now + def.secondes * 1000 : null });
  return null;
}

export function lancerExpedition(
  s: ColonyState,
  defId: string,
  escouade: Record<UnitId, number>,
  now: number
): string | null {
  const def = EXPEDITION_PAR_ID.get(defId);
  if (!def) return "Expédition inconnue.";
  if (s.reineLevel < def.reineMin) return `La Reine doit être niveau ${def.reineMin}.`;
  if (def.recrute && s.symbiotes.includes(def.recrute)) return "Cette espèce est déjà des nôtres.";
  const total = escouade.ouvriere + escouade.soldate;
  if (total < 1) return "Il faut au moins une fourmi dans l'escouade.";
  if (escouade.ouvriere > s.units.ouvriere || escouade.soldate > s.units.soldate)
    return "Pas assez de fourmis disponibles.";
  if (def.offrande && !peutPayer(s, def.offrande)) return "Pas assez de ressources pour l'offrande.";
  if (def.offrande) payer(s, def.offrande);
  s.units.ouvriere -= escouade.ouvriere;
  s.units.soldate -= escouade.soldate;
  const exp: ExpeditionState = {
    defId,
    escouade: { ...escouade },
    fin: now + def.secondes * 1000,
    seed: (Math.random() * 2 ** 32) >>> 0,
  };
  s.expeditions.push(exp);
  return null;
}
