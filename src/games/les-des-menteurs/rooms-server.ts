// Salons multijoueurs des « Dés Menteurs » — même architecture que ceux de
// « Ça coûte combien ?! » : une fonction pure `handle(method, path, body)`
// branchable sur le serveur vite comme sur le Worker Cloudflare.
//
// Différence clé : l'information cachée. Les dés vivent uniquement ici ; le
// client ne reçoit jamais que SA main (via POST /state avec son playerId),
// plus le nombre de dés des autres. Tout est révélé seulement au dudo/calza.

import {
  DICE_PER_PLAYER,
  countMatching,
  isValidBid,
  resolveCalza,
  resolveDudo,
  rollDice,
  type Bid,
} from "./engine.ts";

export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2;
export const ROOM_TTL_MS = 60 * 60_000;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans I/L/O/0/1 ambigus

export type RoomPhase = "lobby" | "bid" | "reveal" | "end";

interface Player {
  id: string;
  pseudo: string;
  dice: number[]; // secret — jamais sérialisé tel quel vers les autres
  palificoUsed: boolean;
}

export interface BidEntry extends Bid {
  playerId: string;
}

export interface Reveal {
  type: "dudo" | "calza";
  callerId: string;
  bid: BidEntry;
  actual: number;
  palifico: boolean;
  loserId: string | null;
  gainerId: string | null;
  eliminatedId: string | null;
  dice: Record<string, number[]>;
}

interface Room {
  code: string;
  hostId: string;
  players: Player[]; // dans l'ordre de table
  phase: RoomPhase;
  round: number;
  turnId: string;
  bids: BidEntry[];
  palifico: boolean;
  reveal: Reveal | null;
  winnerId: string | null;
  // préparés à la résolution, consommés au début de la manche suivante
  nextStarterId: string;
  nextPalifico: boolean;
  phaseAt: number;
  version: number;
  touchedAt: number;
}

// --- vue envoyée au client : les mains des autres sont réduites à un compte ---

export interface ViewPlayer {
  id: string;
  pseudo: string;
  diceCount: number;
  dice?: number[]; // seulement la main du joueur qui regarde
}

export interface RoomView {
  code: string;
  hostId: string;
  players: ViewPlayer[];
  phase: RoomPhase;
  round: number;
  turnId: string;
  bids: BidEntry[];
  palifico: boolean;
  reveal: Reveal | null;
  winnerId: string | null;
  phaseAt: number;
  version: number;
}

export interface RoomResponse {
  status: number;
  body: unknown;
}

const err = (status: number, error: string): RoomResponse => ({ status, body: { error } });

export function createRoomStore(now: () => number = Date.now, random: () => number = Math.random) {
  const rooms = new Map<string, Room>();
  const ok = (body: Record<string, unknown>): RoomResponse => ({ status: 200, body: { ...body, now: now() } });

  const newCode = (): string => {
    let code = "";
    do {
      code = Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]).join("");
    } while (rooms.has(code));
    return code;
  };

  const newId = (): string =>
    Array.from({ length: 16 }, () => "0123456789abcdef"[Math.floor(random() * 16)]).join("");

  const purge = (): void => {
    const t = now();
    for (const [code, room] of rooms) if (t - room.touchedAt > ROOM_TTL_MS) rooms.delete(code);
  };

  const touch = (room: Room): void => {
    room.touchedAt = now();
    room.version++;
  };

  const cleanPseudo = (raw: unknown): string | null => {
    if (typeof raw !== "string") return null;
    const pseudo = raw.trim().slice(0, 20);
    return pseudo.length ? pseudo : null;
  };

  const alive = (room: Room): Player[] => room.players.filter((p) => p.dice.length > 0);
  const totalDice = (room: Room): number => room.players.reduce((sum, p) => sum + p.dice.length, 0);

  /** joueur vivant suivant dans l'ordre de table, en partant après `fromId`. */
  const nextAlive = (room: Room, fromId: string): Player => {
    const idx = room.players.findIndex((p) => p.id === fromId);
    for (let step = 1; step <= room.players.length; step++) {
      const p = room.players[(idx + step) % room.players.length];
      if (p.dice.length > 0) return p;
    }
    return room.players[idx]; // ne devrait pas arriver : au moins un vivant
  };

  const view = (room: Room, viewerId: string): RoomView => ({
    code: room.code,
    hostId: room.hostId,
    players: room.players.map((p) => ({
      id: p.id,
      pseudo: p.pseudo,
      diceCount: p.dice.length,
      ...(p.id === viewerId ? { dice: [...p.dice] } : {}),
    })),
    phase: room.phase,
    round: room.round,
    turnId: room.turnId,
    bids: room.bids,
    palifico: room.palifico,
    reveal: room.reveal,
    winnerId: room.winnerId,
    phaseAt: room.phaseAt,
    version: room.version,
  });

  const startRound = (room: Room): void => {
    room.round++;
    for (const p of room.players) if (p.dice.length > 0) p.dice = rollDice(p.dice.length, random);
    room.bids = [];
    room.reveal = null;
    room.palifico = room.nextPalifico;
    room.nextPalifico = false;
    const starter = room.players.find((p) => p.id === room.nextStarterId);
    room.turnId = starter && starter.dice.length > 0 ? starter.id : nextAlive(room, room.nextStarterId).id;
    room.phase = "bid";
    room.phaseAt = now();
  };

  /** applique la perte/gain d'un dé et prépare la manche suivante. */
  const applyReveal = (room: Room, reveal: Reveal): void => {
    const loser = room.players.find((p) => p.id === reveal.loserId);
    if (loser) {
      loser.dice.pop();
      if (loser.dice.length === 0) reveal.eliminatedId = loser.id;
      else if (loser.dice.length === 1 && !loser.palificoUsed && alive(room).length > 2) {
        // le joueur réduit à un dé ouvre une manche palifico (une seule fois)
        loser.palificoUsed = true;
        room.nextPalifico = true;
      }
      room.nextStarterId = loser.dice.length > 0 ? loser.id : nextAlive(room, loser.id).id;
    }
    const gainer = room.players.find((p) => p.id === reveal.gainerId);
    if (gainer) {
      if (gainer.dice.length < DICE_PER_PLAYER) gainer.dice.push(1);
      room.nextStarterId = gainer.id;
    }
    room.reveal = reveal;
    room.phase = "reveal";
    room.phaseAt = now();
  };

  function handle(method: string, path: string, body: unknown): RoomResponse {
    purge();
    const b = (body ?? {}) as Record<string, unknown>;

    if (method === "POST" && path === "/rooms") {
      const pseudo = cleanPseudo(b.pseudo);
      if (!pseudo) return err(400, "pseudo manquant");
      const player: Player = { id: newId(), pseudo, dice: [], palificoUsed: false };
      const room: Room = {
        code: newCode(),
        hostId: player.id,
        players: [player],
        phase: "lobby",
        round: 0,
        turnId: "",
        bids: [],
        palifico: false,
        reveal: null,
        winnerId: null,
        nextStarterId: player.id,
        nextPalifico: false,
        phaseAt: now(),
        version: 0,
        touchedAt: now(),
      };
      rooms.set(room.code, room);
      return ok({ playerId: player.id, room: view(room, player.id) });
    }

    const m = path.match(/^\/rooms\/([A-Z0-9]{4})(?:\/([a-z]+))?$/);
    if (!m) return err(404, "route inconnue");
    const room = rooms.get(m[1]);
    if (!room) return err(404, "salon inconnu");
    const action = m[2];

    if (method === "GET" && !action) return ok({ room: view(room, "") });

    if (method !== "POST") return err(405, "méthode invalide");

    if (action === "join") {
      const pseudo = cleanPseudo(b.pseudo);
      if (!pseudo) return err(400, "pseudo manquant");
      if (room.phase !== "lobby") return err(409, "la partie a déjà commencé");
      if (room.players.length >= MAX_PLAYERS) return err(409, "salon complet");
      const player: Player = { id: newId(), pseudo, dice: [], palificoUsed: false };
      room.players.push(player);
      touch(room);
      return ok({ playerId: player.id, room: view(room, player.id) });
    }

    const playerId = typeof b.playerId === "string" ? b.playerId : "";
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return err(403, "joueur inconnu dans ce salon");
    const isHost = playerId === room.hostId;

    if (action === "state") return ok({ room: view(room, playerId) });

    if (action === "kick") {
      if (!isHost) return err(403, "seul l'hôte peut exclure un joueur");
      if (room.phase !== "lobby") return err(409, "exclusion possible seulement dans le salon");
      const targetId = typeof b.targetId === "string" ? b.targetId : "";
      if (targetId === room.hostId) return err(400, "l'hôte ne peut pas s'exclure");
      const idx = room.players.findIndex((p) => p.id === targetId);
      if (idx < 0) return err(404, "joueur introuvable");
      room.players.splice(idx, 1);
      touch(room);
      return ok({ room: view(room, playerId) });
    }

    if (action === "start") {
      if (!isHost) return err(403, "seul l'hôte peut lancer la partie");
      if (room.phase !== "lobby") return err(409, "déjà lancée");
      if (room.players.length < MIN_PLAYERS) return err(409, "il faut au moins 2 joueurs");
      for (const p of room.players) {
        p.dice = Array.from({ length: DICE_PER_PLAYER }, () => 1);
        p.palificoUsed = false;
      }
      room.round = 0;
      room.winnerId = null;
      // premier à parler tiré au sort, ensuite c'est le perdant qui ouvre
      room.nextStarterId = room.players[Math.floor(random() * room.players.length)].id;
      room.nextPalifico = false;
      startRound(room);
      touch(room);
      return ok({ room: view(room, playerId) });
    }

    if (action === "bid") {
      if (room.phase !== "bid") return err(409, "pas en phase d'enchères");
      if (room.turnId !== playerId) return err(409, "ce n'est pas ton tour");
      const count = typeof b.count === "number" ? b.count : NaN;
      const face = typeof b.face === "number" ? b.face : NaN;
      const prev = room.bids.at(-1) ?? null;
      if (!isValidBid(prev, { count, face }, totalDice(room), room.palifico)) {
        return err(400, "enchère invalide");
      }
      room.bids.push({ playerId, count, face });
      room.turnId = nextAlive(room, playerId).id;
      touch(room);
      return ok({ room: view(room, playerId) });
    }

    if (action === "dudo" || action === "calza") {
      if (room.phase !== "bid") return err(409, "pas en phase d'enchères");
      if (room.turnId !== playerId) return err(409, "ce n'est pas ton tour");
      const bid = room.bids.at(-1);
      if (!bid) return err(409, "aucune enchère à contester");
      const actual = countMatching(
        alive(room).map((p) => p.dice),
        bid.face,
        room.palifico,
      );
      const dice = Object.fromEntries(alive(room).map((p) => [p.id, [...p.dice]]));
      const reveal: Reveal = {
        type: action,
        callerId: playerId,
        bid,
        actual,
        palifico: room.palifico,
        loserId: null,
        gainerId: null,
        eliminatedId: null,
        dice,
      };
      if (action === "dudo") {
        reveal.loserId = resolveDudo(bid, actual) === "bidder" ? bid.playerId : playerId;
      } else {
        if (resolveCalza(bid, actual) === "gain") reveal.gainerId = playerId;
        else reveal.loserId = playerId;
      }
      applyReveal(room, reveal);
      touch(room);
      return ok({ room: view(room, playerId) });
    }

    if (action === "next") {
      if (room.phase !== "reveal") return err(409, "pas en phase de révélation");
      const survivors = alive(room);
      if (survivors.length <= 1) {
        room.phase = "end";
        room.winnerId = survivors[0]?.id ?? null;
        room.phaseAt = now();
      } else {
        startRound(room);
      }
      touch(room);
      return ok({ room: view(room, playerId) });
    }

    if (action === "replay") {
      if (!isHost) return err(403, "seul l'hôte peut relancer");
      if (room.phase !== "end") return err(409, "la partie n'est pas finie");
      room.phase = "lobby";
      room.round = 0;
      room.bids = [];
      room.reveal = null;
      room.winnerId = null;
      room.palifico = false;
      room.nextPalifico = false;
      for (const p of room.players) {
        p.dice = [];
        p.palificoUsed = false;
      }
      room.phaseAt = now();
      touch(room);
      return ok({ room: view(room, playerId) });
    }

    return err(404, "action inconnue");
  }

  return { handle, rooms };
}
