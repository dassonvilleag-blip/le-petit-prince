// Client des salons multijoueurs : petites requêtes JSON + polling léger.
// Le jeu étant au tour par tour, un GET toutes les 1,5 s suffit largement.

import type { Room } from "./rooms-server";

const API = "/api/ccc";
// URL du Worker Cloudflare (workers/ccc-rooms) : utilisée automatiquement
// quand le site est servi en statique (GitHub Pages) et n'a donc pas d'API.
const REMOTE_API = "https://ccc-rooms.le-petit-prince.workers.dev/api/ccc";
const POLL_MS = 1500;

export class RoomError extends Error {}

// on commence en same-origin (serveur vite / tunnel) et on bascule sur le
// Worker à la première réponse impossible (404/405 du statique, réseau…)
let apiBase = API;

async function request(base: string, method: string, path: string, body?: unknown): Promise<Response> {
  return fetch(`${base}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function call(method: string, path: string, body?: unknown): Promise<{ room: Room; playerId?: string }> {
  let res: Response | null = null;
  try {
    res = await request(apiBase, method, path, body);
  } catch {
    res = null;
  }
  if (apiBase === API && (res === null || res.status === 404 || res.status === 405)) {
    if (!REMOTE_API) {
      throw new RoomError(
        "cet hébergement est statique : il faut déployer le Worker (workers/ccc-rooms) et renseigner REMOTE_API",
      );
    }
    apiBase = REMOTE_API;
    try {
      res = await request(apiBase, method, path, body);
    } catch {
      throw new RoomError("serveur de salons injoignable");
    }
  }
  if (res === null) throw new RoomError("serveur de salons injoignable");
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
export const kickPlayer = (code: string, playerId: string, targetId: string) =>
  call("POST", `/rooms/${code}/kick`, { playerId, targetId });

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
