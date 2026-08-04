import { test } from "node:test";
import assert from "node:assert/strict";
import { createRoomStore, MIN_PLAYERS, ROOM_TTL_MS, type RoomView } from "../rooms-server.ts";

type Result = { status: number; body: { room?: RoomView; playerId?: string; error?: string; now?: number } };

// petit PRNG déterministe (mulberry32) : ids et tirages reproductibles mais distincts
function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setup(seed = 1) {
  let time = 1000;
  const store = createRoomStore(() => time, seededRandom(seed));
  const call = (method: string, path: string, body?: unknown): Result =>
    store.handle(method, path, body) as Result;
  return { store, call, tick: (ms: number) => (time += ms) };
}

/** salon à `n` joueurs, partie lancée ; renvoie code + ids dans l'ordre de table. */
function startedGame(n = 3, seed = 1) {
  const s = setup(seed);
  const created = s.call("POST", "/rooms", { pseudo: "Hôte" });
  const code = created.body.room!.code;
  const ids = [created.body.playerId!];
  for (let i = 1; i < n; i++) {
    ids.push(s.call("POST", `/rooms/${code}/join`, { pseudo: `J${i}` }).body.playerId!);
  }
  const started = s.call("POST", `/rooms/${code}/start`, { playerId: ids[0] });
  assert.equal(started.status, 200);
  return { ...s, code, ids, hostId: ids[0], room: () => s.store.rooms.get(code)! };
}

test("création et jointure : vue personnelle avec ses dés seulement", () => {
  const g = startedGame(3);
  const state = g.call("POST", `/rooms/${g.code}/state`, { playerId: g.ids[1] });
  const room = state.body.room!;
  const me = room.players.find((p) => p.id === g.ids[1])!;
  assert.equal(me.dice!.length, 5);
  for (const p of room.players) {
    assert.equal(p.diceCount, 5);
    if (p.id !== g.ids[1]) assert.equal(p.dice, undefined);
  }
});

test("GET public : aucun dé visible", () => {
  const g = startedGame(2);
  const room = (g.call("GET", `/rooms/${g.code}`) as Result).body.room!;
  assert.equal(room.players.every((p) => p.dice === undefined), true);
});

test("il faut au moins 2 joueurs pour lancer", () => {
  const s = setup();
  const created = s.call("POST", "/rooms", { pseudo: "Solo" });
  const code = created.body.room!.code;
  const res = s.call("POST", `/rooms/${code}/start`, { playerId: created.body.playerId });
  assert.equal(res.status, 409);
  assert.equal(MIN_PLAYERS, 2);
});

test("enchères : tour par tour, validation, rotation", () => {
  const g = startedGame(3);
  const turn0 = g.room().turnId;
  const other = g.ids.find((id) => id !== turn0)!;
  // pas son tour
  assert.equal(g.call("POST", `/rooms/${g.code}/bid`, { playerId: other, count: 2, face: 3 }).status, 409);
  // ouverture aux pacos interdite
  assert.equal(g.call("POST", `/rooms/${g.code}/bid`, { playerId: turn0, count: 2, face: 1 }).status, 400);
  // ouverture valide → le tour passe au suivant vivant
  const res = g.call("POST", `/rooms/${g.code}/bid`, { playerId: turn0, count: 2, face: 3 });
  assert.equal(res.status, 200);
  assert.notEqual(g.room().turnId, turn0);
  // surenchère trop basse refusée
  const turn1 = g.room().turnId;
  assert.equal(g.call("POST", `/rooms/${g.code}/bid`, { playerId: turn1, count: 2, face: 2 }).status, 400);
});

test("dudo : perdant identifié, dé perdu, révélation complète, relance", () => {
  const g = startedGame(3);
  const [a, b] = [g.room().turnId, ""];
  // main truquée : 5 dés « 6 » chez l'enchérisseur, aucun 6 ni paco ailleurs
  for (const p of g.room().players) p.dice = p.id === a ? [6, 6, 6, 6, 6] : [2, 3, 4, 2, 3];
  g.call("POST", `/rooms/${g.code}/bid`, { playerId: a, count: 5, face: 6 });
  const challenger = g.room().turnId;
  const res = g.call("POST", `/rooms/${g.code}/dudo`, { playerId: challenger });
  assert.equal(res.status, 200);
  const reveal = g.room().reveal!;
  assert.equal(reveal.actual, 5); // exactement les cinq 6
  assert.equal(reveal.loserId, challenger); // l'enchère tenait
  assert.equal(g.room().players.find((p) => p.id === challenger)!.dice.length, 4);
  assert.equal(Object.keys(reveal.dice).length, 3);
  // manche suivante : le perdant ouvre, mains relancées, enchères vides
  g.call("POST", `/rooms/${g.code}/next`, { playerId: a });
  assert.equal(g.room().phase, "bid");
  assert.equal(g.room().turnId, challenger);
  assert.equal(g.room().bids.length, 0);
  assert.equal(g.room().reveal, null);
  void b;
});

test("dudo perdu par l'enchérisseur quand l'enchère ne tient pas", () => {
  const g = startedGame(2);
  const a = g.room().turnId;
  for (const p of g.room().players) p.dice = [2, 2, 3, 4, 5];
  g.call("POST", `/rooms/${g.code}/bid`, { playerId: a, count: 9, face: 6 });
  const challenger = g.room().turnId;
  g.call("POST", `/rooms/${g.code}/dudo`, { playerId: challenger });
  assert.equal(g.room().reveal!.loserId, a);
  assert.equal(g.room().players.find((p) => p.id === a)!.dice.length, 4);
});

test("calza : compte exact → dé regagné, sinon dé perdu", () => {
  const g = startedGame(3);
  const a = g.room().turnId;
  for (const p of g.room().players) p.dice = p.id === a ? [3, 3, 2, 4, 5] : [3, 2, 6, 6, 4];
  // trois 3 au total (pas de pacos) → enchère 3 × 3 exacte
  g.call("POST", `/rooms/${g.code}/bid`, { playerId: a, count: 3, face: 3 });
  const caller = g.room().turnId;
  // le calza rend un dé seulement si on en a moins de 5 : on en retire un d'abord
  g.room().players.find((p) => p.id === caller)!.dice = [2, 2, 6, 6];
  const res = g.call("POST", `/rooms/${g.code}/calza`, { playerId: caller });
  assert.equal(res.status, 200);
  assert.equal(g.room().reveal!.gainerId, caller);
  assert.equal(g.room().players.find((p) => p.id === caller)!.dice.length, 5);
  // le gagnant du calza ouvre la manche suivante
  g.call("POST", `/rooms/${g.code}/next`, { playerId: a });
  assert.equal(g.room().turnId, caller);
});

test("calza raté : le joueur perd un dé", () => {
  const g = startedGame(2);
  const a = g.room().turnId;
  for (const p of g.room().players) p.dice = [2, 2, 3, 4, 5];
  g.call("POST", `/rooms/${g.code}/bid`, { playerId: a, count: 1, face: 6 });
  const caller = g.room().turnId;
  g.call("POST", `/rooms/${g.code}/calza`, { playerId: caller });
  assert.equal(g.room().reveal!.loserId, caller);
  assert.equal(g.room().players.find((p) => p.id === caller)!.dice.length, 4);
});

test("élimination et victoire", () => {
  const g = startedGame(2);
  const a = g.room().turnId;
  const other = g.ids.find((id) => id !== a)!;
  // le challenger n'a plus qu'un dé et va perdre son dudo
  for (const p of g.room().players) p.dice = p.id === a ? [6, 6, 6, 6, 6] : [2];
  g.call("POST", `/rooms/${g.code}/bid`, { playerId: a, count: 5, face: 6 });
  g.call("POST", `/rooms/${g.code}/dudo`, { playerId: other });
  assert.equal(g.room().reveal!.eliminatedId, other);
  g.call("POST", `/rooms/${g.code}/next`, { playerId: a });
  assert.equal(g.room().phase, "end");
  assert.equal(g.room().winnerId, a);
});

test("palifico : déclenché à 1 dé restant (à plus de 2 joueurs), une seule fois", () => {
  const g = startedGame(3);
  const a = g.room().turnId;
  const loserToBe = g.room().players.find((p) => p.id !== a)!;
  for (const p of g.room().players) p.dice = p.id === a ? [6, 6, 6, 6, 6] : p === loserToBe ? [2, 3] : [2, 3, 4];
  g.call("POST", `/rooms/${g.code}/bid`, { playerId: a, count: 5, face: 6 });
  // on force le challenger à être notre futur perdant si ce n'est pas déjà lui
  g.room().turnId = loserToBe.id;
  g.call("POST", `/rooms/${g.code}/dudo`, { playerId: loserToBe.id });
  assert.equal(g.room().players.find((p) => p.id === loserToBe.id)!.dice.length, 1);
  g.call("POST", `/rooms/${g.code}/next`, { playerId: a });
  assert.equal(g.room().palifico, true);
  // en palifico l'ouverture aux pacos est permise et la face est figée
  assert.equal(g.room().turnId, loserToBe.id);
  assert.equal(g.call("POST", `/rooms/${g.code}/bid`, { playerId: loserToBe.id, count: 1, face: 1 }).status, 200);
  const next = g.room().turnId;
  assert.equal(g.call("POST", `/rooms/${g.code}/bid`, { playerId: next, count: 2, face: 3 }).status, 400);
  assert.equal(g.call("POST", `/rooms/${g.code}/bid`, { playerId: next, count: 2, face: 1 }).status, 200);
});

test("replay : retour au salon, mains vidées", () => {
  const g = startedGame(2);
  const a = g.room().turnId;
  const other = g.ids.find((id) => id !== a)!;
  for (const p of g.room().players) p.dice = p.id === a ? [6, 6, 6, 6, 6] : [2];
  g.call("POST", `/rooms/${g.code}/bid`, { playerId: a, count: 5, face: 6 });
  g.call("POST", `/rooms/${g.code}/dudo`, { playerId: other });
  g.call("POST", `/rooms/${g.code}/next`, { playerId: a });
  assert.equal(g.call("POST", `/rooms/${g.code}/replay`, { playerId: other }).status, 403); // pas l'hôte
  const res = g.call("POST", `/rooms/${g.code}/replay`, { playerId: g.hostId });
  assert.equal(res.status, 200);
  assert.equal(g.room().phase, "lobby");
  assert.equal(g.room().players.every((p) => p.dice.length === 0), true);
});

test("les salons expirent après une heure d'inactivité", () => {
  const g = startedGame(2);
  g.tick(ROOM_TTL_MS + 1);
  assert.equal(g.call("GET", `/rooms/${g.code}`).status, 404);
});
