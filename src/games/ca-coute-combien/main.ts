import { ITEMS, type Item } from "./items";
import { PHOTO_CREDITS } from "./photo-credits";
import { drawRound } from "./pool";
import { computeRoundScore } from "./scoring";
import { pickRoundComment, pickClosingComment } from "./comments";
import { afterDelay, cancelAllReveals, startCountUp, startTypewrite } from "./reveal";
import type { Room } from "./rooms-server";
import * as rc from "./room-client";

const ROUND_COUNT = 10;
const RECORD_KEY = "ca-coute-combien-record";
const SEEN_KEY = "ca-coute-combien-seen";
const REVEAL_COUNT_DURATION_MS = 800;
const REVEAL_TYPEWRITE_MS_PER_CHAR = 25;

const screenIntro = document.getElementById("screen-intro")!;
const screenLobby = document.getElementById("screen-lobby")!;
const screenRound = document.getElementById("screen-round")!;
const screenRecap = document.getElementById("screen-recap")!;

const recordValueEl = document.getElementById("record-value")!;
const creditsEl = document.getElementById("photo-credits")!;
const btnStart = document.getElementById("btn-start")!;

const roundIndexEl = document.getElementById("round-index")!;
const roundPhotoEl = document.getElementById("round-photo") as HTMLImageElement;
const roundNameEl = document.getElementById("round-name")!;
const guessForm = document.getElementById("guess-form") as HTMLFormElement;
const guessInput = document.getElementById("guess-input") as HTMLInputElement;
const roundResultEl = document.getElementById("round-result")!;
const roundCommentEl = document.getElementById("round-comment")!;
const roundPriceEl = document.getElementById("round-price")!;
const roundScoreEl = document.getElementById("round-score")!;
const roundAnecdoteEl = document.getElementById("round-anecdote")!;
const btnNext = document.getElementById("btn-next")!;

const recapTotalEl = document.getElementById("recap-total")!;
const recapBestEl = document.getElementById("recap-best")!;
const recapWorstEl = document.getElementById("recap-worst")!;
const recapCommentEl = document.getElementById("recap-comment")!;
const recapRecordEl = document.getElementById("recap-record")!;
const btnReplay = document.getElementById("btn-replay")!;

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

let record = Number(localStorage.getItem(RECORD_KEY) ?? "0");
let seenIds: string[] = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");

let round: Item[] = [];
let roundIndex = 0;
let roundScores: number[] = [];

function showScreen(screen: HTMLElement) {
  for (const s of [screenIntro, screenLobby, screenRound, screenRecap]) {
    s.classList.toggle("hidden", s !== screen);
  }
}

function renderCredits() {
  creditsEl.innerHTML = PHOTO_CREDITS.map(
    (c) => `<li><a href="${c.sourceUrl}" target="_blank" rel="noopener">${c.author}</a> — ${c.license}</li>`,
  ).join("");
}

function startGame() {
  const draw = drawRound(ITEMS, seenIds, ROUND_COUNT);
  round = draw.round;
  seenIds = draw.updatedSeenIds;
  localStorage.setItem(SEEN_KEY, JSON.stringify(seenIds));

  roundIndex = 0;
  roundScores = [];
  showRound();
  showScreen(screenRound);
}

function showRound() {
  cancelAllReveals();
  const item = round[roundIndex];
  roundIndexEl.textContent = String(roundIndex + 1);
  roundPhotoEl.src = item.photo;
  roundPhotoEl.alt = item.nom;
  roundNameEl.textContent = item.nom;

  roundPhotoEl.classList.remove("entering");
  void roundPhotoEl.offsetWidth; // force reflow so the animation restarts
  roundPhotoEl.classList.add("entering");

  guessInput.value = "";
  roundResultEl.classList.add("hidden");
  roundAnecdoteEl.classList.add("hidden");
  guessForm.classList.remove("hidden");
  guessInput.focus();
}

// la petite explication du prix, pour les objets qui en valent la peine
function revealAnecdote(item: Item) {
  if (!item.anecdote) return;
  roundAnecdoteEl.textContent = "";
  roundAnecdoteEl.classList.remove("hidden");
  afterDelay(REVEAL_COUNT_DURATION_MS + 900, () => {
    startTypewrite(roundAnecdoteEl, item.anecdote!, REVEAL_TYPEWRITE_MS_PER_CHAR);
  });
}

function submitGuess(event: SubmitEvent) {
  event.preventDefault();
  if (multi) {
    void multiSubmitGuess();
    return;
  }
  cancelAllReveals();

  const item = round[roundIndex];
  const guess = Number(guessInput.value);
  const score = computeRoundScore(guess, item.prix);
  roundScores.push(score);

  guessForm.classList.add("hidden");
  roundResultEl.classList.remove("hidden");

  roundScoreEl.textContent = "";
  roundPriceEl.textContent = "";
  roundCommentEl.textContent = "";

  startCountUp(roundScoreEl, 0, score, REVEAL_COUNT_DURATION_MS, (value) => `${Math.round(value)} / 1000 points`);
  startCountUp(
    roundPriceEl,
    0,
    item.prix,
    REVEAL_COUNT_DURATION_MS,
    (value) => `Prix réel : ${euros.format(value)} (ton estimation : ${euros.format(guess)})`,
  );

  afterDelay(REVEAL_COUNT_DURATION_MS, () => {
    startTypewrite(roundCommentEl, pickRoundComment(score), REVEAL_TYPEWRITE_MS_PER_CHAR);
  });
  revealAnecdote(item);
}

function nextRound() {
  if (multi) {
    void rc.nextRound(multi.code, multi.playerId).catch(showMultiError);
    return;
  }
  roundIndex += 1;
  if (roundIndex >= ROUND_COUNT) {
    finishGame();
    return;
  }
  showRound();
}

function finishGame() {
  const total = roundScores.reduce((sum, s) => sum + s, 0);
  const bestIndex = roundScores.indexOf(Math.max(...roundScores));
  const worstIndex = roundScores.indexOf(Math.min(...roundScores));

  recapTotalEl.textContent = `Score total : ${total} / 10 000`;
  recapBestEl.textContent = `Meilleure manche : ${round[bestIndex].nom} (${roundScores[bestIndex]} pts)`;
  recapWorstEl.textContent = `Pire manche : ${round[worstIndex].nom} (${roundScores[worstIndex]} pts)`;
  recapCommentEl.textContent = pickClosingComment(total);

  if (total > record) {
    record = total;
    localStorage.setItem(RECORD_KEY, String(record));
  }
  recapRecordEl.textContent = `Record : ${record} / 10 000`;

  showScreen(screenRecap);
}

btnStart.addEventListener("click", startGame);
guessForm.addEventListener("submit", submitGuess);
btnNext.addEventListener("click", nextRound);
btnReplay.addEventListener("click", () => {
  if (multi) {
    void rc.replayRoom(multi.code, multi.playerId).catch(showMultiError);
    return;
  }
  startGame();
});

recordValueEl.textContent = String(record);
renderCredits();

// ---------------------------------------------------------------------------
// Multijoueur — salons jusqu'à 8 joueurs, manches synchronisées, classement.
// L'état de référence vit sur le serveur (voir rooms-server.ts) ; le client
// ne fait que refléter le salon reçu par polling.
// ---------------------------------------------------------------------------

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
const multiStatusEl = document.getElementById("multi-status")!;
const btnForce = document.getElementById("btn-force")!;
const multiResultsEl = document.getElementById("multi-results")!;
const multiNextWaitEl = document.getElementById("multi-next-wait")!;
const recapPodiumEl = document.getElementById("recap-podium")!;
const recapWaitEl = document.getElementById("recap-wait")!;
const btnRecapLeave = document.getElementById("btn-recap-leave")!;

const ITEMS_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));
const PSEUDO_KEY = "ca-coute-combien-pseudo";

interface MultiSession {
  code: string;
  playerId: string;
  stop: () => void;
}

let multi: MultiSession | null = null;
let multiShownRound = -1; // dernière manche affichée (pour ne pas re-render)
let multiRevealed = false;
let guessSentRound = -1; // manche pour laquelle j'ai déjà validé (verrou local)

const isHost = (room: Room) => multi !== null && room.hostId === multi.playerId;
const myGuess = (room: Room) => (multi ? room.guesses[room.roundIdx]?.[multi.playerId] : undefined);

function showMultiError(e: unknown) {
  multiErrorEl.textContent = e instanceof Error ? e.message : String(e);
  multiErrorEl.classList.remove("hidden");
}

function multiTotals(room: Room): Map<string, number> {
  const totals = new Map<string, number>(room.players.map((p) => [p.id, 0]));
  for (let i = 0; i < room.itemIds.length; i++) {
    // la manche en cours ne compte qu'une fois révélée
    if (i > room.roundIdx || (i === room.roundIdx && room.phase === "guess")) break;
    const item = ITEMS_BY_ID.get(room.itemIds[i]);
    if (!item) continue;
    for (const p of room.players) {
      const g = room.guesses[i]?.[p.id];
      if (g !== undefined) totals.set(p.id, (totals.get(p.id) ?? 0) + computeRoundScore(g, item.prix));
    }
  }
  return totals;
}

function renderResultRow(rank: string, pseudo: string, mine: boolean, guessTxt: string, ptsTxt: string): string {
  return `<li${mine ? ' class="me"' : ""}><span>${rank}</span><span class="mr-pseudo">${escapeHtml(pseudo)}</span><span class="mr-guess">${guessTxt}</span><span class="mr-pts numeric">${ptsTxt}</span></li>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function onRoomUpdate(room: Room) {
  if (!multi) return;
  multiErrorEl.classList.add("hidden");

  // exclu par l'hôte : retour à l'accueil
  if (!room.players.some((p) => multi && p.id === multi.playerId)) {
    leaveMulti();
    showMultiError(new Error("tu as été exclu du salon par l'hôte"));
    return;
  }

  if (room.phase === "lobby") {
    multiShownRound = -1;
    multiRevealed = false;
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
    return;
  }

  if (room.phase === "guess" || room.phase === "reveal") {
    round = room.itemIds.map((id) => ITEMS_BY_ID.get(id)).filter((i): i is Item => i !== undefined);
    if (room.roundIdx !== multiShownRound) {
      multiShownRound = room.roundIdx;
      multiRevealed = false;
      roundIndex = room.roundIdx;
      showRound();
      showScreen(screenRound);
    }

    if (room.phase === "guess") {
      const answered = room.players.filter((p) => room.guesses[room.roundIdx]?.[p.id] !== undefined).length;
      const iAnswered = myGuess(room) !== undefined || guessSentRound === room.roundIdx;
      guessForm.classList.toggle("hidden", iAnswered);
      multiStatusEl.textContent = `${answered} / ${room.players.length} ont répondu…`;
      multiStatusEl.classList.remove("hidden");
      btnForce.classList.toggle("hidden", !(isHost(room) && iAnswered && answered < room.players.length));
      roundResultEl.classList.add("hidden");
    } else {
      multiRenderReveal(room);
    }
    return;
  }

  if (room.phase === "end") {
    multiRenderEnd(room);
  }
}

function multiRenderReveal(room: Room) {
  if (multiRevealed) return;
  multiRevealed = true;

  const item = round[room.roundIdx];
  const mine = myGuess(room);
  const myScore = mine !== undefined ? computeRoundScore(mine, item.prix) : 0;

  guessForm.classList.add("hidden");
  multiStatusEl.classList.add("hidden");
  btnForce.classList.add("hidden");
  roundResultEl.classList.remove("hidden");

  cancelAllReveals();
  roundScoreEl.textContent = "";
  roundPriceEl.textContent = "";
  roundCommentEl.textContent = "";
  startCountUp(roundScoreEl, 0, myScore, REVEAL_COUNT_DURATION_MS, (value) => `${Math.round(value)} / 1000 points`);
  startCountUp(roundPriceEl, 0, item.prix, REVEAL_COUNT_DURATION_MS, (value) =>
    mine !== undefined
      ? `Prix réel : ${euros.format(value)} (ton estimation : ${euros.format(mine)})`
      : `Prix réel : ${euros.format(value)}`,
  );
  afterDelay(REVEAL_COUNT_DURATION_MS, () => {
    startTypewrite(roundCommentEl, pickRoundComment(myScore), REVEAL_TYPEWRITE_MS_PER_CHAR);
  });
  revealAnecdote(item);

  // classement de la manche + totaux
  const totals = multiTotals(room);
  const rows = room.players
    .map((p) => {
      const g = room.guesses[room.roundIdx]?.[p.id];
      return {
        pseudo: p.pseudo,
        mine: multi !== null && p.id === multi.playerId,
        guess: g,
        pts: g !== undefined ? computeRoundScore(g, item.prix) : 0,
        total: totals.get(p.id) ?? 0,
      };
    })
    .sort((a, b) => b.pts - a.pts);
  multiResultsEl.innerHTML = rows
    .map((r, i) =>
      renderResultRow(
        `${i + 1}.`,
        r.pseudo,
        r.mine,
        r.guess !== undefined ? euros.format(r.guess) : "—",
        `+${r.pts} (${r.total})`,
      ),
    )
    .join("");
  multiResultsEl.classList.remove("hidden");

  const lastRound = room.roundIdx + 1 >= room.itemIds.length;
  btnNext.textContent = lastRound ? "Voir le classement final" : "Objet suivant";
  btnNext.classList.toggle("hidden", !isHost(room));
  multiNextWaitEl.classList.toggle("hidden", isHost(room));
}

function multiRenderEnd(room: Room) {
  const totals = multiTotals(room);
  const standing = [...room.players]
    .map((p) => ({ pseudo: p.pseudo, mine: multi !== null && p.id === multi.playerId, total: totals.get(p.id) ?? 0 }))
    .sort((a, b) => b.total - a.total);
  const medals = ["🥇", "🥈", "🥉"];
  recapPodiumEl.innerHTML = standing
    .map((s, i) => renderResultRow(medals[i] ?? `${i + 1}.`, s.pseudo, s.mine, "", `${s.total}`))
    .join("");
  recapPodiumEl.classList.remove("hidden");

  const myRank = standing.findIndex((s) => s.mine) + 1;
  const myTotal = standing.find((s) => s.mine)?.total ?? 0;
  recapTotalEl.textContent = `Ton score : ${myTotal} / ${room.itemIds.length * 1000} — ${myRank === 1 ? "1ᵉʳ" : `${myRank}ᵉ`} sur ${standing.length}`;
  recapBestEl.textContent = "";
  recapWorstEl.textContent = "";
  recapCommentEl.textContent = pickClosingComment(myTotal);

  if (room.itemIds.length === ROUND_COUNT && myTotal > record) {
    record = myTotal;
    localStorage.setItem(RECORD_KEY, String(record));
  }
  recapRecordEl.textContent = `Record : ${record} / 10 000`;

  btnReplay.textContent = "Rejouer ensemble";
  btnReplay.classList.toggle("hidden", !isHost(room));
  recapWaitEl.classList.toggle("hidden", isHost(room));
  btnRecapLeave.classList.remove("hidden");
  showScreen(screenRecap);
}

async function multiSubmitGuess() {
  if (!multi || guessSentRound === multiShownRound) return;
  const guess = Number(guessInput.value);
  if (!Number.isFinite(guess) || guess < 0) return;
  guessSentRound = multiShownRound;
  guessForm.classList.add("hidden");
  try {
    const { room } = await rc.sendGuess(multi.code, multi.playerId, guess);
    onRoomUpdate(room);
  } catch (e) {
    // « déjà validé » n'est pas une raison de ré-ouvrir le formulaire
    if (!(e instanceof rc.RoomError && e.message.includes("déjà validé"))) {
      guessSentRound = -1;
      guessForm.classList.remove("hidden");
      showMultiError(e);
    }
  }
}

function enterMulti(code: string, playerId: string) {
  multi = {
    code,
    playerId,
    stop: rc.pollRoom(code, onRoomUpdate, showMultiError),
  };
  multiShownRound = -1;
  multiRevealed = false;
  guessSentRound = -1;
}

function leaveMulti() {
  multi?.stop();
  multi = null;
  multiResultsEl.classList.add("hidden");
  multiStatusEl.classList.add("hidden");
  multiNextWaitEl.classList.add("hidden");
  recapPodiumEl.classList.add("hidden");
  recapWaitEl.classList.add("hidden");
  btnRecapLeave.classList.add("hidden");
  btnForce.classList.add("hidden");
  btnNext.classList.remove("hidden");
  btnReplay.classList.remove("hidden");
  btnReplay.textContent = "Rejouer";
  btnNext.textContent = "Manche suivante";
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
    .then(({ room, playerId }) => enterMulti(room.code, playerId!))
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
    .then(({ room, playerId }) => enterMulti(room.code, playerId!))
    .catch(showMultiError);
});

btnLaunch.addEventListener("click", () => {
  if (!multi) return;
  const itemIds = drawRound(ITEMS, [], ROUND_COUNT).round.map((item) => item.id);
  rc.startRoom(multi.code, multi.playerId, itemIds).catch(showMultiError);
});

btnForce.addEventListener("click", () => {
  if (multi) rc.forceReveal(multi.code, multi.playerId).catch(showMultiError);
});

btnLeave.addEventListener("click", leaveMulti);
btnRecapLeave.addEventListener("click", leaveMulti);

lobbyPlayersEl.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-kick]");
  if (!btn || !multi) return;
  rc.kickPlayer(multi.code, multi.playerId, (btn as HTMLElement).dataset.kick!)
    .then((r) => onRoomUpdate(r.room))
    .catch(showMultiError);
});

pseudoInput.value = localStorage.getItem(PSEUDO_KEY) ?? "";

export {};
