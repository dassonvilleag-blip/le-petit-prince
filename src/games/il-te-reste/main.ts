import { computeUnitValues, LIFE_EXPECTANCY_YEARS, type UnitValue } from "./units";

const REVEAL_INTERVAL_MS = 1300;

const introEl = document.getElementById("intro")!;
const revealEl = document.getElementById("reveal")!;
const revealListEl = document.getElementById("reveal-list")!;
const outroEl = document.getElementById("outro")!;
const outroMessageEl = document.getElementById("outro-message")!;
const formEl = document.getElementById("form") as HTMLFormElement;
const birthdateInput = document.getElementById("birthdate") as HTMLInputElement;
const restartButton = document.getElementById("btn-restart")!;

function formatNumber(n: number): string {
  return n.toLocaleString("fr-FR");
}

function appendRevealLine(html: string): void {
  const li = document.createElement("li");
  li.innerHTML = html;
  revealListEl.appendChild(li);
}

function runReveal(daysLeft: number, units: UnitValue[]): void {
  introEl.classList.add("hidden");
  revealListEl.innerHTML = "";
  revealEl.classList.remove("hidden");
  outroEl.classList.add("hidden");

  const lines = [
    `Il te reste environ <strong>${formatNumber(daysLeft)}</strong> jours.`,
    ...units.map((u) => `Ça fait à peu près <strong>${formatNumber(u.value)}</strong> ${u.label}.`),
  ];

  let index = 0;
  function revealNext(): void {
    if (index >= lines.length) {
      window.setTimeout(() => {
        revealEl.classList.add("hidden");
        outroMessageEl.textContent = "Voilà. Fais-en bon usage (ou pas, c'est toi qui vois).";
        outroEl.classList.remove("hidden");
      }, REVEAL_INTERVAL_MS);
      return;
    }
    appendRevealLine(lines[index]);
    index += 1;
    window.setTimeout(revealNext, REVEAL_INTERVAL_MS);
  }
  revealNext();
}

function showTooOldMessage(): void {
  introEl.classList.add("hidden");
  outroMessageEl.textContent = `Avec une espérance de vie moyenne de ${LIFE_EXPECTANCY_YEARS} ans, il n'y a plus rien à calculer ici. Soit tu as un secret, soit ce site n'est pas pour toi.`;
  outroEl.classList.remove("hidden");
}

formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = birthdateInput.value;
  if (!value) return;
  const birthDate = new Date(value);
  const result = computeUnitValues(birthDate, new Date());
  if (!result) {
    showTooOldMessage();
    return;
  }
  runReveal(result.daysLeft, result.units);
});

restartButton.addEventListener("click", () => {
  outroEl.classList.add("hidden");
  revealListEl.innerHTML = "";
  birthdateInput.value = "";
  introEl.classList.remove("hidden");
});
