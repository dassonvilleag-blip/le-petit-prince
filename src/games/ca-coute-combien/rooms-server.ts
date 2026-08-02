// Salons multijoueurs de « Ça coûte combien ?! » — état en mémoire côté
// serveur de dev (même philosophie que la signalisation du Phare : zéro
// infra supplémentaire, les salons vivent le temps d'une partie).
//
// Ce module est volontairement indépendant de vite/node:http : une seule
// fonction `handle(method, path, body)` → { status, body }, ce qui le rend
// trivial à tester et à brancher sur n'importe quel serveur.

export const MAX_PLAYERS = 8;
export const ROOM_TTL_MS = 60 * 60_000;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans I/L/O/0/1 ambigus

export interface RoomPlayer {
  id: string;
  pseudo: string;
}

export type RoomPhase = "lobby" | "guess" | "reveal" | "end";

export interface Room {
  code: string;
  hostId: string;
  players: RoomPlayer[];
  phase: RoomPhase;
  itemIds: string[];
  roundIdx: number;
  // guesses[manche][playerId] = estimation en euros
  guesses: Record<number, Record<string, number>>;
  version: number;
  touchedAt: number;
}

export interface RoomResponse {
  status: number;
  body: unknown;
}

const ok = (body: unknown): RoomResponse => ({ status: 200, body });
const err = (status: number, error: string): RoomResponse => ({ status, body: { error } });

export function createRoomStore(now: () => number = Date.now) {
  const rooms = new Map<string, Room>();

  const newCode = (): string => {
    let code = "";
    do {
      code = Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
    } while (rooms.has(code));
    return code;
  };

  const newId = (): string =>
    Array.from({ length: 16 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");

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

  function handle(method: string, path: string, body: unknown): RoomResponse {
    purge();
    const b = (body ?? {}) as Record<string, unknown>;

    if (method === "POST" && path === "/rooms") {
      const pseudo = cleanPseudo(b.pseudo);
      if (!pseudo) return err(400, "pseudo manquant");
      const player: RoomPlayer = { id: newId(), pseudo };
      const room: Room = {
        code: newCode(),
        hostId: player.id,
        players: [player],
        phase: "lobby",
        itemIds: [],
        roundIdx: 0,
        guesses: {},
        version: 0,
        touchedAt: now(),
      };
      rooms.set(room.code, room);
      return ok({ playerId: player.id, room });
    }

    const m = path.match(/^\/rooms\/([A-Z0-9]{4})(?:\/([a-z]+))?$/);
    if (!m) return err(404, "route inconnue");
    const room = rooms.get(m[1]);
    if (!room) return err(404, "salon inconnu");
    const action = m[2];

    if (method === "GET" && !action) return ok({ room });

    if (method !== "POST") return err(405, "méthode invalide");

    if (action === "join") {
      const pseudo = cleanPseudo(b.pseudo);
      if (!pseudo) return err(400, "pseudo manquant");
      if (room.phase !== "lobby") return err(409, "la partie a déjà commencé");
      if (room.players.length >= MAX_PLAYERS) return err(409, "salon complet");
      const player: RoomPlayer = { id: newId(), pseudo };
      room.players.push(player);
      touch(room);
      return ok({ playerId: player.id, room });
    }

    const playerId = typeof b.playerId === "string" ? b.playerId : "";
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return err(403, "joueur inconnu dans ce salon");
    const isHost = playerId === room.hostId;

    if (action === "kick") {
      if (!isHost) return err(403, "seul l'hôte peut exclure un joueur");
      if (room.phase !== "lobby") return err(409, "exclusion possible seulement dans le salon");
      const targetId = typeof b.targetId === "string" ? b.targetId : "";
      if (targetId === room.hostId) return err(400, "l'hôte ne peut pas s'exclure");
      const idx = room.players.findIndex((p) => p.id === targetId);
      if (idx < 0) return err(404, "joueur introuvable");
      room.players.splice(idx, 1);
      touch(room);
      return ok({ room });
    }

    if (action === "start") {
      if (!isHost) return err(403, "seul l'hôte peut lancer la partie");
      if (room.phase !== "lobby") return err(409, "déjà lancée");
      const itemIds = Array.isArray(b.itemIds) ? b.itemIds.filter((x): x is string => typeof x === "string") : [];
      if (itemIds.length < 1) return err(400, "itemIds manquants");
      room.itemIds = itemIds;
      room.phase = "guess";
      room.roundIdx = 0;
      room.guesses = {};
      touch(room);
      return ok({ room });
    }

    if (action === "guess") {
      if (room.phase !== "guess") return err(409, "pas en phase d'estimation");
      const guess = typeof b.guess === "number" && Number.isFinite(b.guess) ? Math.max(0, b.guess) : null;
      if (guess === null) return err(400, "estimation invalide");
      const roundGuesses = (room.guesses[room.roundIdx] ??= {});
      if (roundGuesses[playerId] !== undefined) return err(409, "tu as déjà validé pour cette manche");
      roundGuesses[playerId] = guess;
      if (room.players.every((p) => roundGuesses[p.id] !== undefined)) room.phase = "reveal";
      touch(room);
      return ok({ room });
    }

    if (action === "reveal") {
      if (!isHost) return err(403, "seul l'hôte peut révéler");
      if (room.phase !== "guess") return err(409, "pas en phase d'estimation");
      room.guesses[room.roundIdx] ??= {};
      room.phase = "reveal";
      touch(room);
      return ok({ room });
    }

    if (action === "next") {
      if (!isHost) return err(403, "seul l'hôte peut avancer");
      if (room.phase !== "reveal") return err(409, "pas en phase de révélation");
      if (room.roundIdx + 1 < room.itemIds.length) {
        room.roundIdx++;
        room.phase = "guess";
      } else {
        room.phase = "end";
      }
      touch(room);
      return ok({ room });
    }

    if (action === "replay") {
      if (!isHost) return err(403, "seul l'hôte peut relancer");
      if (room.phase !== "end") return err(409, "la partie n'est pas finie");
      room.phase = "lobby";
      room.itemIds = [];
      room.roundIdx = 0;
      room.guesses = {};
      touch(room);
      return ok({ room });
    }

    return err(404, "action inconnue");
  }

  return { handle, rooms };
}
