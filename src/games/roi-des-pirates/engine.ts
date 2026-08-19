import type { Stats, StoryNode, Choice, EndingId, Fruit } from "./types";
import { pickRandomFruit } from "./fruits.ts";

export function resolveDuel(
  playerStat: number,
  opponentPower: number,
  rng: () => number = Math.random,
): "victoire" | "defaite-legere" | "blessure-grave" {
  const roll = playerStat - opponentPower + (rng() * 30 - 15);
  if (roll > 15) return "victoire";
  if (roll > -10) return "defaite-legere";
  return "blessure-grave";
}

export function filterChoices(choices: Choice[], flags: Set<string>): Choice[] {
  return choices.filter((c) => {
    if (c.requiresFlags?.some((f) => !flags.has(f))) return false;
    if (c.forbidsFlags?.some((f) => flags.has(f))) return false;
    return true;
  });
}

export function resolveText(
  text: string | ((flags: Set<string>) => string),
  flags: Set<string>,
): string {
  return typeof text === "function" ? text(flags) : text;
}

const INJURY_LABELS: Record<string, string> = {
  "bras-coupe": "ton bras manquant",
  "main-brisee": "ta main qui ne se referme plus tout à fait",
  "jambe-blessee": "ta jambe qui traîne un peu, certains soirs",
};

export function describeInjuries(flags: Set<string>): string[] {
  return Object.entries(INJURY_LABELS)
    .filter(([flag]) => flags.has(flag))
    .map(([, label]) => label);
}

export function validateStoryGraph(storyNodes: StoryNode[]): string[] {
  const errors: string[] = [];
  const ids = new Set(storyNodes.map((n) => n.id));
  if (ids.size !== storyNodes.length) {
    errors.push("Des identifiants de nœuds sont dupliqués.");
  }

  for (const node of storyNodes) {
    if (node.isEnding) continue;

    if (node.choices.length === 0) {
      errors.push(`${node.id}: aucun choix défini alors que ce n'est pas une fin.`);
      continue;
    }

    const hasUnconditional = node.choices.some(
      (c) => !c.requiresFlags?.length && !c.forbidsFlags?.length,
    );
    if (!hasUnconditional) {
      errors.push(`${node.id}: aucun choix inconditionnel disponible (risque d'écran bloqué).`);
    }

    for (const choice of node.choices) {
      const targets: string[] = [];
      if (choice.duel) targets.push(choice.duel.win, choice.duel.loseMinor, choice.duel.loseMajor);
      if (choice.eatPendingFruit) targets.push(choice.eatPendingFruit.next);
      if (choice.next) targets.push(choice.next);

      for (const target of targets) {
        if (target !== "__ending__" && !ids.has(target)) {
          errors.push(`${node.id}: la cible "${target}" ne correspond à aucun nœud.`);
        }
      }
    }
  }

  return errors;
}

let nodes: Record<string, StoryNode>;
let stats: Stats;
let currentNodeId: string;
let flags: Set<string>;
let pendingFruit: Fruit | undefined;

export function getPendingFruit(): Fruit | undefined {
  return pendingFruit;
}

const ARC_LABELS: Record<string, string> = {
  "east-blue": "East Blue",
  "grand-line": "Grand Line",
  "nouveau-monde": "Nouveau Monde",
  "final": "Laugh Tale",
};

function applyEffects(effects: Partial<Stats>): void {
  for (const [k, v] of Object.entries(effects) as [keyof Stats, number][]) {
    stats[k] = Math.max(0, Math.min(100, stats[k] + v));
  }
}

function computeEndingId(): EndingId {
  const combat = stats.force + Math.round(stats.fruitDuDemon * 0.75);
  if (combat >= 70 && stats.notoriete >= 50) return "fin-roi-des-pirates";
  if (stats.notoriete >= 75) return "fin-legende";
  if (stats.equipage >= 60) return "fin-retraite";
  return "fin-capture";
}

function renderStats(): void {
  const pairs: [keyof Stats, string][] = [
    ["force", "force"],
    ["notoriete", "notoriete"],
    ["equipage", "equipage"],
    ["fruitDuDemon", "fruit"],
  ];
  for (const [key, id] of pairs) {
    const val = stats[key];
    const fill = document.getElementById(`fill-${id}`);
    const label = document.getElementById(`val-${id}`);
    if (fill) fill.style.width = `${val}%`;
    if (label) label.textContent = String(val);
  }
}

function renderNode(): void {
  const node = nodes[currentNodeId];
  if (!node) return;

  const arcEl = document.getElementById("arc-label");
  const illustEl = document.getElementById("illustration");
  const textEl = document.getElementById("node-text");
  const choicesEl = document.getElementById("choices");
  const replayEl = document.getElementById("replay-btn");

  if (!arcEl || !illustEl || !textEl || !choicesEl || !replayEl) return;

  document.body.dataset.arc = node.arc ?? "";

  arcEl.textContent = node.arc ? ARC_LABELS[node.arc] : "";

  if (node.title) {
    const titleEl = document.getElementById("node-title");
    if (titleEl) titleEl.textContent = node.title;
  } else {
    const titleEl = document.getElementById("node-title");
    if (titleEl) titleEl.textContent = "";
  }

  illustEl.innerHTML = node.svg;
  textEl.textContent = resolveText(node.text, flags);
  choicesEl.innerHTML = "";
  replayEl.hidden = true;

  renderStats();

  if (node.isEnding) {
    replayEl.hidden = false;
    return;
  }

  for (const choice of filterChoices(node.choices, flags)) {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    const textSpan = document.createElement("span");
    textSpan.className = "choice-text";
    textSpan.textContent = choice.text;
    btn.appendChild(textSpan);
    if (choice.sub) {
      const subSpan = document.createElement("span");
      subSpan.className = "choice-sub";
      subSpan.textContent = choice.sub;
      btn.appendChild(subSpan);
    }
    btn.addEventListener("click", () => navigate(choice));
    choicesEl.appendChild(btn);
  }
}

function navigate(choice: Choice): void {
  applyEffects(choice.effects);
  for (const flag of choice.setFlags ?? []) flags.add(flag);

  if (choice.duel) {
    const stat = choice.duel.statUsed ?? "force";
    const outcome = resolveDuel(stats[stat], choice.duel.opponentPower);
    if (outcome === "victoire") {
      for (const flag of choice.duel.winFlags ?? []) flags.add(flag);
      if (choice.duel.winPicksFruit !== undefined) {
        pendingFruit = pickRandomFruit(
          choice.duel.winPicksFruit === "any" ? undefined : choice.duel.winPicksFruit,
        );
      }
      currentNodeId = choice.duel.win;
    } else if (outcome === "defaite-legere") {
      if (choice.duel.loseMinorPicksFruit !== undefined) {
        pendingFruit = pickRandomFruit(
          choice.duel.loseMinorPicksFruit === "any" ? undefined : choice.duel.loseMinorPicksFruit,
        );
      }
      currentNodeId = choice.duel.loseMinor;
    } else {
      if (choice.duel.injuryFlag) flags.add(choice.duel.injuryFlag);
      currentNodeId = choice.duel.loseMajor;
    }
  } else if (choice.pickFruitCandidate) {
    pendingFruit = pickRandomFruit(choice.pickFruitCandidate.type);
    currentNodeId = choice.next!;
  } else if (choice.eatPendingFruit) {
    if (pendingFruit) {
      applyEffects(pendingFruit.effects);
      flags.add(`fruit-${pendingFruit.id}`);
      flags.add("a-mange-un-fruit");
    }
    currentNodeId = choice.eatPendingFruit.next;
  } else if (choice.next === "__ending__") {
    currentNodeId = computeEndingId();
  } else {
    currentNodeId = choice.next!;
  }

  renderNode();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function startEngine(storyNodes: StoryNode[]): void {
  nodes = Object.fromEntries(storyNodes.map((n) => [n.id, n]));
  stats = { force: 0, notoriete: 0, equipage: 0, fruitDuDemon: 0 };
  flags = new Set();
  pendingFruit = undefined;
  currentNodeId = "intro";

  const replayBtn = document.getElementById("replay-btn");
  if (replayBtn) {
    replayBtn.addEventListener("click", () => {
      stats = { force: 0, notoriete: 0, equipage: 0, fruitDuDemon: 0 };
      flags = new Set();
      pendingFruit = undefined;
      currentNodeId = "intro";
      renderNode();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  renderNode();
}
