import type { Stats, StoryNode, Choice, EndingId } from "./types";

let nodes: Record<string, StoryNode>;
let stats: Stats;
let currentNodeId: string;

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
  textEl.textContent = node.text;
  choicesEl.innerHTML = "";
  replayEl.hidden = true;

  renderStats();

  if (node.isEnding) {
    replayEl.hidden = false;
    return;
  }

  for (const choice of node.choices) {
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

  if (choice.next === "__ending__") {
    currentNodeId = computeEndingId();
  } else {
    currentNodeId = choice.next;
  }

  renderNode();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function startEngine(storyNodes: StoryNode[]): void {
  nodes = Object.fromEntries(storyNodes.map((n) => [n.id, n]));
  stats = { force: 0, notoriete: 0, equipage: 0, fruitDuDemon: 0 };
  currentNodeId = "intro";

  const replayBtn = document.getElementById("replay-btn");
  if (replayBtn) {
    replayBtn.addEventListener("click", () => {
      stats = { force: 0, notoriete: 0, equipage: 0, fruitDuDemon: 0 };
      currentNodeId = "intro";
      renderNode();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  renderNode();
}
