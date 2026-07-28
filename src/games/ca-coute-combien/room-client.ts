// Client des salons multijoueurs : petites requêtes JSON + polling léger.
// Le jeu étant au tour par tour, un GET toutes les 1,5 s suffit largement.

import type { Room } from "./rooms-server";

const API = "/api/ccc";
const POLL_MS = 1500;

export class RoomError extends Error {}

async function call(method: string, path: string, body?: unknown): Promise<{ room: Room; playerId?: string }> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new RoomError("serveur injoignable — le multijoueur n'est disponible que sur le site servi par le serveur du jeu");
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string; room?: Room; playerId?: string };
  if (!res.ok) throw new RoomError(data.error ?? `erreur ${res.status}`);
  return data as { room: Room; playerId?: string };
}

export const createRoom = (pseudo: string) => call("POST", "/rooms", { pseudo });
export const joinRoom = (code: string, pseudo: string) => call("POST", `/rooms/${code.toUpperCase()}/join`, { pseudo });
export const fetchRoom = (code: string) => call("GET", `/rooms/${code}`);
export const startRoom = (code: string, playerId: string, itemIds: string[]) =>
  call("POST", `/rooms/${code}/start`, { playerId, itemIds });
export const sendGuess = (code: string, playerId: string, guess: number) =>
  call("POST", `/rooms/${code}/guess`, { playerId, guess });
export const forceReveal = (code: string, playerId: string) => call("POST", `/rooms/${code}/reveal`, { playerId });
export const nextRound = (code: string, playerId: string) => call("POST", `/rooms/${code}/next`, { playerId });
export const replayRoom = (code: string, playerId: string) => call("POST", `/rooms/${code}/replay`, { playerId });

/** Poll le salon tant que stop() n'est pas appelé ; notifie à chaque changement de version. */
export function pollRoom(code: string, onUpdate: (room: Room) => void, onError: (e: RoomError) => void): () => void {
  let stopped = false;
  let lastVersion = -1;
  const tick = async (): Promise<void> => {
    if (stopped) return;
    try {
      const { room } = await fetchRoom(code);
      if (!stopped && room.version !== lastVersion) {
        lastVersion = room.version;
        onUpdate(room);
      }
    } catch (e) {
      if (!stopped && e instanceof RoomError) onError(e);
    }
    if (!stopped) setTimeout(() => void tick(), POLL_MS);
  };
  void tick();
  return () => {
    stopped = true;
  };
}
