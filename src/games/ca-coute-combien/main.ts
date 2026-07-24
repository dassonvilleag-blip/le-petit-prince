import { ITEMS, type Item } from "./items";
import { PHOTO_CREDITS } from "./photo-credits";
import { drawRound } from "./pool";
import { computeRoundScore } from "./scoring";
import { pickRoundComment, pickClosingComment } from "./comments";
import { afterDelay, cancelAllReveals, startCountUp, startTypewrite } from "./reveal";

const ROUND_COUNT = 10;
const RECORD_KEY = "ca-coute-combien-record";
const SEEN_KEY = "ca-coute-combien-seen";
const REVEAL_COUNT_DURATION_MS = 800;
const REVEAL_TYPEWRITE_MS_PER_CHAR = 25;

const screenIntro = document.getElementById("screen-intro")!;
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
  for (const s of [screenIntro, screenRound, screenRecap]) {
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
  guessInput.value = "";
  roundResultEl.classList.add("hidden");
  guessForm.classList.remove("hidden");
  guessInput.focus();
}

function submitGuess(event: SubmitEvent) {
  event.preventDefault();
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
}

function nextRound() {
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
btnReplay.addEventListener("click", startGame);

recordValueEl.textContent = String(record);
renderCredits();

export {};
