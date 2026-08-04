// Les Dés Menteurs — client. L'état de référence vit sur le serveur
// (rooms-server.ts) : le client ne fait que refléter la vue reçue par polling
// et envoyer les actions. La validation d'enchère est rejouée localement
// (engine.ts partagé) pour prévenir le joueur avant l'aller-retour réseau.

import { FACES, isValidBid, type Bid } from "./engine";
import type { RoomView, ViewPlayer } from "./rooms-server";
import * as rc from "./room-client";

const PSEUDO_KEY = "les-des-menteurs-pseudo";

const screenIntro = document.getElementById("screen-intro")!;
const screenLobby = document.getElementById("screen-lobby")!;
const screenGame = document.getElementById("screen-game")!;
const screenEnd = document.getElementById("screen-end")!;

const pseudoInput = document.getElementById("pseudo-input") as HTMLInputElement;
const codeInput = document.getElementById("code-input") as HTMLInputElement;
const btnCreateRoom = document.getElementById("btn-create-room")!;
const btnJoinRoom = document.getElementById("btn-join-room")!;
const multiErrorEl = document.getElementById("multi-error")!;

const lobbyCodeEl = document.getElementById("lobby-code")!;
const lobbyPlayersEl = document.getElementById("lobby-players")!;
const btnLaunch = document.getElementById("btn-launch")!;
const lobbyWaitEl = document.getElementById("lobby-wait")!;
const btnLeave = document.getElementById("btn-leave")!;

const roundNumEl = document.getElementById("round-num")!;
const diceTotalEl = document.getElementById("dice-total")!;
const palificoBadge = document.getElementById("palifico-badge")!;
const playersStrip = document.getElementById("players-strip")!;
const lastBidEl = document.getElementById("last-bid")!;
const turnStatusEl = document.getElementById("turn-status")!;
const myDiceEl = document.getElementById("my-dice")!;
const actionPanel = document.getElementById("action-panel")!;
const bidCountEl = document.getElementById("bid-count")!;
const btnCountMinus = document.getElementById("count-minus")!;
const btnCountPlus = document.getElementById("count-plus")!;
const facePicker = document.getElementById("face-picker")!;
const btnBid = document.getElementById("btn-bid")!;
const btnDudo = document.getElementById("btn-dudo")!;
const btnCalza = document.getElementById("btn-calza")!;
const bidErrorEl = document.getElementById("bid-error")!;
const revealPanel = document.getElementById("reveal-panel")!;
const revealCallEl = document.getElementById("reveal-call")!;
const revealDiceEl = document.getElementById("reveal-dice")!;
const revealVerdictEl = document.getElementById("reveal-verdict")!;
const btnNext = document.getElementById("btn-next")!;

const winnerNameEl = document.getElementById("winner-name")!;
const endNoteEl = document.getElementById("end-note")!;
const btnReplay = document.getElementById("btn-replay")!;
const endWaitEl = document.getElementById("end-wait")!;
const btnEndLeave = document.getElementById("btn-end-leave")!;

function showScreen(screen: HTMLElement) {
  for (const s of [screenIntro, screenLobby, screenGame, screenEnd]) {
    s.classList.toggle("hidden", s !== screen);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// ------------------------------------------------------------------- dés

// positions des points sur une grille 3×3 (indices 0..8), la face 1 est ⭐
const PIPS: Record<number, number[]> = {
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function dieEl(face: number, small = false, hit = false): HTMLElement {
  const el = document.createElement("span");
  el.className = `die${small ? " small" : ""}${hit ? " hit" : ""}`;
  if (face === 1) {
    el.classList.add("star");
    el.textContent = "★";
  } else {
    for (let i = 0; i < 9; i++) {
      const pip = document.createElement("i");
      if (PIPS[face]?.includes(i)) pip.classList.add("on");
      el.appendChild(pip);
    }
  }
  return el;
}

// --------------------------------------------------------------- session

interface MultiSession {
  code: string;
  playerId: string;
  stop: () => void;
}

let multi: MultiSession | null = null;
let lastRoom: RoomView | null = null;
let busy = false; // une action réseau à la fois

const isHost = (room: RoomView) => multi !== null && room.hostId === multi.playerId;
const me = (room: RoomView): ViewPlayer | undefined => room.players.find((p) => multi && p.id === multi.playerId);
const nameOf = (room: RoomView, id: string | null): string =>
  room.players.find((p) => p.id === id)?.pseudo ?? "?";
const totalDice = (room: RoomView): number => room.players.reduce((sum, p) => sum + p.diceCount, 0);
const aliveCount = (room: RoomView): number => room.players.filter((p) => p.diceCount > 0).length;

function showMultiError(e: unknown) {
  multiErrorEl.textContent = e instanceof Error ? e.message : String(e);
  multiErrorEl.classList.remove("hidden");
}

async function act(fn: () => Promise<{ room: RoomView }>, errEl: HTMLElement = multiErrorEl) {
  if (!multi || busy) return;
  busy = true;
  try {
    const { room } = await fn();
    onRoomUpdate(room);
  } catch (e) {
    errEl.textContent = e instanceof Error ? e.message : String(e);
    errEl.classList.remove("hidden");
  } finally {
    busy = false;
  }
}

// ----------------------------------------------------------- enchérisseur

let selCount = 1;
let selFace = 2;
// clé de la situation pour laquelle le sélecteur a été initialisé :
// on ne réinitialise pas pendant que le joueur ajuste son annonce
let builderKey = "";

/** plus petite enchère valide : point de départ du sélecteur. */
function minimalBid(room: RoomView): Bid {
  const prev = room.bids.at(-1) ?? null;
  const total = totalDice(room);
  const faceOrder = [2, 3, 4, 5, 6, 1];
  for (let count = 1; count <= total; count++) {
    for (const face of faceOrder) {
      if (isValidBid(prev, { count, face }, total, room.palifico)) return { count, face };
    }
  }
  return { count: total, face: 6 };
}

function syncBuilder(room: RoomView) {
  const key = `${room.round}:${room.bids.length}`;
  if (builderKey !== key) {
    builderKey = key;
    const min = minimalBid(room);
    selCount = min.count;
    selFace = min.face;
    bidErrorEl.classList.add("hidden");
  }
  bidCountEl.textContent = String(selCount);
  facePicker.innerHTML = "";
  const prev = room.bids.at(-1) ?? null;
  for (const face of FACES) {
    const btn = document.createElement("button");
    btn.className = `face-btn${face === selFace ? " selected" : ""}`;
    btn.appendChild(dieEl(face, true));
    // en palifico la face est figée dès l'ouverture ; hors palifico
    // l'ouverture aux étoiles est interdite
    const openingStar = prev === null && face === 1 && !room.palifico;
    const palificoLock = room.palifico && prev !== null && face !== prev.face;
    (btn as HTMLButtonElement).disabled = openingStar || palificoLock;
    btn.addEventListener("click", () => {
      selFace = face;
      syncBuilder(room);
    });
    facePicker.appendChild(btn);
  }
}

btnCountMinus.addEventListener("click", () => {
  if (!lastRoom) return;
  selCount = Math.max(1, selCount - 1);
  syncBuilder(lastRoom);
});

btnCountPlus.addEventListener("click", () => {
  if (!lastRoom) return;
  selCount = Math.min(totalDice(lastRoom), selCount + 1);
  syncBuilder(lastRoom);
});

btnBid.addEventListener("click", () => {
  if (!multi || !lastRoom) return;
  const prev = lastRoom.bids.at(-1) ?? null;
  if (!isValidBid(prev, { count: selCount, face: selFace }, totalDice(lastRoom), lastRoom.palifico)) {
    bidErrorEl.textContent = "cette annonce ne monte pas assez — augmente le compte ou la face";
    bidErrorEl.classList.remove("hidden");
    return;
  }
  void act(() => rc.sendBid(multi!.code, multi!.playerId, selCount, selFace), bidErrorEl);
});

btnDudo.addEventListener("click", () => void act(() => rc.sendDudo(multi!.code, multi!.playerId), bidErrorEl));
btnCalza.addEventListener("click", () => void act(() => rc.sendCalza(multi!.code, multi!.playerId), bidErrorEl));
btnNext.addEventListener("click", () => void act(() => rc.nextRound(multi!.code, multi!.playerId)));

// ------------------------------------------------------------------ rendu

function renderLobby(room: RoomView) {
  lobbyCodeEl.textContent = room.code;
  const host = isHost(room);
  lobbyPlayersEl.innerHTML = room.players
    .map(
      (p) =>
        `<li>${escapeHtml(p.pseudo)}${p.id === room.hostId ? ' <span class="host-tag">(hôte)</span>' : ""}${multi && p.id === multi.playerId ? " ← toi" : ""}${host && p.id !== room.hostId ? `<button type="button" class="btn-kick" data-kick="${p.id}" aria-label="exclure ${escapeHtml(p.pseudo)}">✕</button>` : ""}</li>`,
    )
    .join("");
  btnLaunch.classList.toggle("hidden", !host);
  lobbyWaitEl.classList.toggle("hidden", host);
  showScreen(screenLobby);
}

function renderPlayersStrip(room: RoomView) {
  playersStrip.innerHTML = "";
  for (const p of room.players) {
    const chip = document.createElement("div");
    chip.className = "player-chip";
    if (room.phase === "bid" && p.id === room.turnId) chip.classList.add("turn");
    if (multi && p.id === multi.playerId) chip.classList.add("me");
    if (p.diceCount === 0) chip.classList.add("out");
    const name = document.createElement("span");
    name.className = "chip-name";
    name.textContent = p.pseudo;
    const dice = document.createElement("span");
    dice.className = "chip-dice";
    dice.textContent = "⚄".repeat(p.diceCount);
    chip.append(name, dice);
    playersStrip.appendChild(chip);
  }
}

function renderLastBid(room: RoomView) {
  lastBidEl.innerHTML = "";
  const bid = room.bids.at(-1);
  if (!bid) {
    lastBidEl.textContent = room.round === 1 ? "Première annonce de la partie…" : "Nouvelle manche, à qui l'audace ?";
    return;
  }
  const who = document.createElement("span");
  who.textContent = `${nameOf(room, bid.playerId)} annonce`;
  const count = document.createElement("span");
  count.textContent = `${bid.count} ×`;
  lastBidEl.append(who, count, dieEl(bid.face, true));
}

function renderGame(room: RoomView) {
  roundNumEl.textContent = String(room.round);
  diceTotalEl.textContent = String(totalDice(room));
  palificoBadge.classList.toggle("hidden", !room.palifico);
  renderPlayersStrip(room);
  renderLastBid(room);

  const my = me(room);
  myDiceEl.innerHTML = "";
  for (const face of my?.dice ?? []) myDiceEl.appendChild(dieEl(face));

  if (room.phase === "bid") {
    revealPanel.classList.add("hidden");
    const myTurn = multi !== null && room.turnId === multi.playerId && (my?.diceCount ?? 0) > 0;
    turnStatusEl.textContent = myTurn ? "À toi de jouer !" : `Au tour de ${nameOf(room, room.turnId)}…`;
    turnStatusEl.classList.toggle("mine", myTurn);
    actionPanel.classList.toggle("hidden", !myTurn);
    if (myTurn) {
      syncBuilder(room);
      const hasBid = room.bids.length > 0;
      btnDudo.classList.toggle("hidden", !hasBid);
      btnCalza.classList.toggle("hidden", !hasBid);
    }
  } else {
    // reveal : tout le monde sur la table
    actionPanel.classList.add("hidden");
    turnStatusEl.textContent = "";
    turnStatusEl.classList.remove("mine");
    renderReveal(room);
  }
  showScreen(screenGame);
}

function renderReveal(room: RoomView) {
  const reveal = room.reveal;
  if (!reveal) return;
  revealPanel.classList.remove("hidden");

  const caller = nameOf(room, reveal.callerId);
  const bidder = nameOf(room, reveal.bid.playerId);
  revealCallEl.textContent =
    reveal.type === "dudo"
      ? `🗯️ ${caller} traite ${bidder} de menteur !`
      : `🎯 ${caller} tente le pile poil !`;

  revealDiceEl.innerHTML = "";
  for (const p of room.players) {
    const dice = reveal.dice[p.id];
    if (!dice) continue;
    const row = document.createElement("div");
    row.className = "reveal-row";
    const name = document.createElement("span");
    name.className = "rv-name";
    name.textContent = p.pseudo;
    row.appendChild(name);
    for (const face of dice) {
      const hit = face === reveal.bid.face || (!reveal.palifico && reveal.bid.face !== 1 && face === 1);
      row.appendChild(dieEl(face, true, hit));
    }
    revealDiceEl.appendChild(row);
  }

  const faceTxt = reveal.bid.face === 1 ? "⭐" : String(reveal.bid.face);
  const held = reveal.actual >= reveal.bid.count;
  let verdict =
    `Annonce : <strong>${reveal.bid.count} × ${faceTxt}</strong> — il y en avait <strong>${reveal.actual}</strong>. ` +
    (reveal.type === "dudo"
      ? held
        ? "L'annonce tenait bon ! "
        : `${escapeHtml(bidder)} bluffait ! `
      : reveal.gainerId
        ? "Pile exact !! "
        : "Raté, ce n'était pas le compte. ");
  if (reveal.loserId) verdict += `<span class="lost">${escapeHtml(nameOf(room, reveal.loserId))} perd un dé.</span>`;
  if (reveal.gainerId)
    verdict += `<span class="gained">${escapeHtml(nameOf(room, reveal.gainerId))} regagne un dé.</span>`;
  if (reveal.eliminatedId)
    verdict += ` 💀 <span class="lost">${escapeHtml(nameOf(room, reveal.eliminatedId))} n'a plus de dés !</span>`;
  revealVerdictEl.innerHTML = verdict;

  btnNext.textContent = aliveCount(room) <= 1 ? "Voir le vainqueur" : "Manche suivante";
}

function renderEnd(room: RoomView) {
  winnerNameEl.textContent = nameOf(room, room.winnerId);
  const iWon = multi !== null && room.winnerId === multi.playerId;
  endNoteEl.textContent = iWon
    ? "Personne n'a percé ton bluff. Le businessman peut aller compter ses étoiles."
    : "Il ne te reste plus un seul dé… la prochaine fois, bluffe plus fort.";
  btnReplay.classList.toggle("hidden", !isHost(room));
  endWaitEl.classList.toggle("hidden", isHost(room));
  showScreen(screenEnd);
}

function onRoomUpdate(room: RoomView) {
  if (!multi) return;
  lastRoom = room;
  multiErrorEl.classList.add("hidden");

  // exclu par l'hôte : retour à l'accueil
  if (!room.players.some((p) => multi && p.id === multi.playerId)) {
    leaveMulti();
    showMultiError(new Error("tu as été exclu du salon par l'hôte"));
    return;
  }

  if (room.phase === "lobby") renderLobby(room);
  else if (room.phase === "bid" || room.phase === "reveal") renderGame(room);
  else renderEnd(room);
}

// -------------------------------------------------------- entrée / sortie

function enterMulti(code: string, playerId: string) {
  builderKey = "";
  multi = {
    code,
    playerId,
    stop: rc.pollRoom(code, playerId, onRoomUpdate, showMultiError),
  };
}

function leaveMulti() {
  multi?.stop();
  multi = null;
  lastRoom = null;
  showScreen(screenIntro);
}

function savedPseudo(): string | null {
  const pseudo = pseudoInput.value.trim().slice(0, 20);
  if (!pseudo) {
    showMultiError(new Error("choisis un pseudo d'abord"));
    pseudoInput.focus();
    return null;
  }
  localStorage.setItem(PSEUDO_KEY, pseudo);
  return pseudo;
}

btnCreateRoom.addEventListener("click", () => {
  const pseudo = savedPseudo();
  if (!pseudo) return;
  rc.createRoom(pseudo)
    .then(({ room, playerId }) => {
      enterMulti(room.code, playerId!);
      onRoomUpdate(room);
    })
    .catch(showMultiError);
});

btnJoinRoom.addEventListener("click", () => {
  const pseudo = savedPseudo();
  if (!pseudo) return;
  const code = codeInput.value.trim().toUpperCase();
  if (code.length !== 4) {
    showMultiError(new Error("code à 4 lettres"));
    codeInput.focus();
    return;
  }
  rc.joinRoom(code, pseudo)
    .then(({ room, playerId }) => {
      enterMulti(room.code, playerId!);
      onRoomUpdate(room);
    })
    .catch(showMultiError);
});

btnLaunch.addEventListener("click", () => void act(() => rc.startRoom(multi!.code, multi!.playerId)));
btnReplay.addEventListener("click", () => void act(() => rc.replayRoom(multi!.code, multi!.playerId)));
btnLeave.addEventListener("click", leaveMulti);
btnEndLeave.addEventListener("click", leaveMulti);

lobbyPlayersEl.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-kick]");
  if (!btn || !multi) return;
  void act(() => rc.kickPlayer(multi!.code, multi!.playerId, (btn as HTMLElement).dataset.kick!));
});

pseudoInput.value = localStorage.getItem(PSEUDO_KEY) ?? "";

export {};
