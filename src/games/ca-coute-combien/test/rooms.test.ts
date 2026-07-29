import { test } from "node:test";
import assert from "node:assert/strict";
import { createRoomStore, MAX_PLAYERS, ROOM_TTL_MS, type Room } from "../rooms-server.ts";

type Result = { status: number; body: { room?: Room; playerId?: string; error?: string } };

const call = (store: ReturnType<typeof createRoomStore>, method: string, path: string, body?: unknown): Result =>
  store.handle(method, path, body) as Result;

function setup(playerCount = 3) {
  const store = createRoomStore();
  const host = call(store, "POST", "/rooms", { pseudo: "hôte" });
  const code = host.body.room!.code;
  const players = [host.body.playerId!];
  for (let i = 1; i < playerCount; i++) {
    players.push(call(store, "POST", `/rooms/${code}/join`, { pseudo: `p${i}` }).body.playerId!);
  }
  return { store, code, players };
}

test("créer un salon donne un code à 4 lettres et un hôte", () => {
  const store = createRoomStore();
  const res = call(store, "POST", "/rooms", { pseudo: "  Angelo  " });
  assert.equal(res.status, 200);
  assert.match(res.body.room!.code, /^[A-Z0-9]{4}$/);
  assert.equal(res.body.room!.players[0].pseudo, "Angelo");
  assert.equal(res.body.room!.hostId, res.body.playerId);
  assert.equal(res.body.room!.phase, "lobby");
});

test("le salon refuse le 9e joueur", () => {
  const { store, code } = setup(MAX_PLAYERS);
  const res = call(store, "POST", `/rooms/${code}/join`, { pseudo: "trop" });
  assert.equal(res.status, 409);
});

test("on ne peut pas rejoindre une partie lancée", () => {
  const { store, code, players } = setup(2);
  call(store, "POST", `/rooms/${code}/start`, { playerId: players[0], itemIds: ["a", "b"] });
  const res = call(store, "POST", `/rooms/${code}/join`, { pseudo: "retard" });
  assert.equal(res.status, 409);
});

test("seul l'hôte peut lancer, révéler et avancer", () => {
  const { store, code, players } = setup(2);
  assert.equal(call(store, "POST", `/rooms/${code}/start`, { playerId: players[1], itemIds: ["a"] }).status, 403);
  call(store, "POST", `/rooms/${code}/start`, { playerId: players[0], itemIds: ["a"] });
  assert.equal(call(store, "POST", `/rooms/${code}/reveal`, { playerId: players[1] }).status, 403);
});

test("la révélation arrive automatiquement quand tout le monde a répondu", () => {
  const { store, code, players } = setup(3);
  call(store, "POST", `/rooms/${code}/start`, { playerId: players[0], itemIds: ["a", "b"] });
  call(store, "POST", `/rooms/${code}/guess`, { playerId: players[0], guess: 10 });
  call(store, "POST", `/rooms/${code}/guess`, { playerId: players[1], guess: 20 });
  let room = call(store, "GET", `/rooms/${code}`).body.room!;
  assert.equal(room.phase, "guess");
  call(store, "POST", `/rooms/${code}/guess`, { playerId: players[2], guess: 30 });
  room = call(store, "GET", `/rooms/${code}`).body.room!;
  assert.equal(room.phase, "reveal");
  assert.deepEqual(room.guesses[0], { [players[0]]: 10, [players[1]]: 20, [players[2]]: 30 });
});

test("l'hôte peut forcer la révélation sans attendre les retardataires", () => {
  const { store, code, players } = setup(2);
  call(store, "POST", `/rooms/${code}/start`, { playerId: players[0], itemIds: ["a"] });
  call(store, "POST", `/rooms/${code}/guess`, { playerId: players[0], guess: 5 });
  const res = call(store, "POST", `/rooms/${code}/reveal`, { playerId: players[0] });
  assert.equal(res.body.room!.phase, "reveal");
});

test("next enchaîne les manches puis termine la partie", () => {
  const { store, code, players } = setup(2);
  call(store, "POST", `/rooms/${code}/start`, { playerId: players[0], itemIds: ["a", "b"] });
  for (const p of players) call(store, "POST", `/rooms/${code}/guess`, { playerId: p, guess: 1 });
  let room = call(store, "POST", `/rooms/${code}/next`, { playerId: players[0] }).body.room!;
  assert.equal(room.phase, "guess");
  assert.equal(room.roundIdx, 1);
  for (const p of players) call(store, "POST", `/rooms/${code}/guess`, { playerId: p, guess: 2 });
  room = call(store, "POST", `/rooms/${code}/next`, { playerId: players[0] }).body.room!;
  assert.equal(room.phase, "end");
});

test("replay ramène tout le monde au lobby, prêt pour une nouvelle partie", () => {
  const { store, code, players } = setup(2);
  call(store, "POST", `/rooms/${code}/start`, { playerId: players[0], itemIds: ["a"] });
  for (const p of players) call(store, "POST", `/rooms/${code}/guess`, { playerId: p, guess: 1 });
  call(store, "POST", `/rooms/${code}/next`, { playerId: players[0] });
  const room = call(store, "POST", `/rooms/${code}/replay`, { playerId: players[0] }).body.room!;
  assert.equal(room.phase, "lobby");
  assert.deepEqual(room.guesses, {});
  assert.equal(room.players.length, 2);
});

test("la première estimation est définitive : re-valider est refusé", () => {
  const { store, code, players } = setup(2);
  call(store, "POST", `/rooms/${code}/start`, { playerId: players[0], itemIds: ["a"] });
  call(store, "POST", `/rooms/${code}/guess`, { playerId: players[0], guess: 10 });
  const res = call(store, "POST", `/rooms/${code}/guess`, { playerId: players[0], guess: 999 });
  assert.equal(res.status, 409);
  const room = call(store, "GET", `/rooms/${code}`).body.room!;
  assert.equal(room.guesses[0][players[0]], 10);
});

test("une estimation hors phase ou invalide est rejetée", () => {
  const { store, code, players } = setup(2);
  assert.equal(call(store, "POST", `/rooms/${code}/guess`, { playerId: players[0], guess: 5 }).status, 409);
  call(store, "POST", `/rooms/${code}/start`, { playerId: players[0], itemIds: ["a"] });
  assert.equal(call(store, "POST", `/rooms/${code}/guess`, { playerId: players[0], guess: NaN }).status, 400);
  assert.equal(call(store, "POST", `/rooms/${code}/guess`, { playerId: "inconnu", guess: 5 }).status, 403);
});

test("les salons inactifs expirent après le TTL", () => {
  let t = 0;
  const store = createRoomStore(() => t);
  const code = call(store, "POST", "/rooms", { pseudo: "x" }).body.room!.code;
  t = ROOM_TTL_MS + 1;
  assert.equal(call(store, "GET", `/rooms/${code}`).status, 404);
});
