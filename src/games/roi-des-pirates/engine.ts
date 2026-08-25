import type { Stats, StoryNode, Choice, EndingId, Fruit, FruitType, Player, Gender, SpeciesId } from "./types";
import { pickRandomFruit, findEatenFruit } from "./fruits.ts";
import { resolvePlayerText, SPECIES_ORDER, SPECIES_LABELS } from "./player.ts";
import { pickRandomName } from "./names.ts";

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
  "cicatrice-epeiste": "une cicatrice sur le bras, qui te rappelle ce premier combat",
  "main-brisee": "ta main qui ne se referme plus tout à fait",
  "jambe-blessee": "ta jambe qui traîne un peu, certains soirs",
};

export function fruitCounters(
  eatenFruit: Fruit | undefined,
  counterFruitTypes: FruitType[] | undefined,
): boolean {
  return Boolean(eatenFruit && counterFruitTypes?.includes(eatenFruit.type));
}

export function describeInjuries(flags: Set<string>): string[] {
  return Object.entries(INJURY_LABELS)
    .filter(([flag]) => flags.has(flag))
    .map(([, label]) => label);
}

function hasUnbalancedPlaceholder(text: string): boolean {
  const open = (text.match(/\{/g) ?? []).length;
  const close = (text.match(/\}/g) ?? []).length;
  return open !== close;
}

export function validateStoryGraph(storyNodes: StoryNode[]): string[] {
  const errors: string[] = [];
  const ids = new Set(storyNodes.map((n) => n.id));
  if (ids.size !== storyNodes.length) {
    errors.push("Des identifiants de nœuds sont dupliqués.");
  }

  const creation = storyNodes.find((n) => n.id === "creation-personnage");
  if (!creation) {
    errors.push("Le nœud creation-personnage est manquant.");
  } else if (creation.characterForm !== true) {
    errors.push("Le nœud creation-personnage doit avoir characterForm: true.");
  }

  for (const node of storyNodes) {
    if (!node.subtitle?.trim()) {
      errors.push(`${node.id}: aucun sous-titre défini.`);
    }

    if (typeof node.text === "string" && hasUnbalancedPlaceholder(node.text)) {
      errors.push(`${node.id}: accolade de placeholder non refermée dans le texte.`);
    }

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
      if (hasUnbalancedPlaceholder(choice.text)) {
        errors.push(`${node.id}: accolade de placeholder non refermée dans le choix "${choice.text}".`);
      }
      if (choice.sub && hasUnbalancedPlaceholder(choice.sub)) {
        errors.push(`${node.id}: accolade de placeholder non refermée dans le sous-texte du choix "${choice.text}".`);
      }

      if (!choice.duel && !choice.eatPendingFruit && !choice.next) {
        errors.push(`${node.id}: le choix "${choice.text}" n'a aucun routage (ni next, ni duel, ni eatPendingFruit).`);
      }

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
let player: Player;

function defaultPlayer(): Player {
  return { name: "", gender: "homme", species: "humain" };
}

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

  const subtitleEl = document.getElementById("node-subtitle");
  if (subtitleEl) subtitleEl.textContent = node.subtitle;

  illustEl.innerHTML = node.svg;
  textEl.textContent = resolvePlayerText(resolveText(node.text, flags), player);
  choicesEl.innerHTML = "";
  replayEl.hidden = true;

  renderStats();

  if (node.isEnding) {
    replayEl.hidden = false;
    return;
  }

  if (node.characterForm) {
    renderCharacterForm(node, choicesEl);
    return;
  }

  for (const choice of filterChoices(node.choices, flags)) {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    const textSpan = document.createElement("span");
    textSpan.className = "choice-text";
    textSpan.textContent = resolvePlayerText(choice.text, player);
    btn.appendChild(textSpan);
    if (choice.sub) {
      const subSpan = document.createElement("span");
      subSpan.className = "choice-sub";
      subSpan.textContent = resolvePlayerText(choice.sub, player);
      btn.appendChild(subSpan);
    }
    btn.addEventListener("click", () => navigate(choice));
    choicesEl.appendChild(btn);
  }
}

function renderCharacterForm(node: StoryNode, container: HTMLElement): void {
  const state: { name: string; gender?: Gender; species?: SpeciesId } = { name: "" };

  const form = document.createElement("div");
  form.className = "character-form";

  const nameRow = document.createElement("div");
  nameRow.className = "form-row name-row";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.maxLength = 24;
  nameInput.placeholder = "Ton prénom de pirate";
  nameInput.className = "name-input";
  const diceBtn = document.createElement("button");
  diceBtn.type = "button";
  diceBtn.className = "dice-btn";
  diceBtn.textContent = "🎲";
  diceBtn.disabled = true;
  nameRow.appendChild(nameInput);
  nameRow.appendChild(diceBtn);
  form.appendChild(nameRow);

  const genderLabels: Record<Gender, string> = { homme: "Homme", femme: "Femme" };
  const genderButtons = new Map<Gender, HTMLButtonElement>();
  const genderGroup = document.createElement("div");
  genderGroup.className = "option-group";
  for (const gender of Object.keys(genderLabels) as Gender[]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.textContent = genderLabels[gender];
    btn.addEventListener("click", () => {
      state.gender = gender;
      for (const b of genderButtons.values()) b.classList.remove("selected");
      btn.classList.add("selected");
      diceBtn.disabled = false;
      updateSubmit();
    });
    genderButtons.set(gender, btn);
    genderGroup.appendChild(btn);
  }
  form.appendChild(genderGroup);

  const speciesButtons = new Map<SpeciesId, HTMLButtonElement>();
  const speciesGroup = document.createElement("div");
  speciesGroup.className = "option-group";
  for (const species of SPECIES_ORDER) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.textContent = SPECIES_LABELS[species].m;
    btn.addEventListener("click", () => {
      state.species = species;
      for (const b of speciesButtons.values()) b.classList.remove("selected");
      btn.classList.add("selected");
      updateSubmit();
    });
    speciesButtons.set(species, btn);
    speciesGroup.appendChild(btn);
  }
  form.appendChild(speciesGroup);

  const submitBtn = document.createElement("button");
  submitBtn.type = "button";
  submitBtn.className = "choice-btn";
  submitBtn.textContent = "Embarquer";
  submitBtn.disabled = true;
  submitBtn.addEventListener("click", () => {
    player = { name: state.name.trim(), gender: state.gender!, species: state.species! };
    navigate(node.choices[0]);
  });
  form.appendChild(submitBtn);

  function updateSubmit(): void {
    submitBtn.disabled = !(
      state.name.trim().length > 0 &&
      state.gender !== undefined &&
      state.species !== undefined
    );
  }

  nameInput.addEventListener("input", () => {
    state.name = nameInput.value;
    updateSubmit();
  });

  diceBtn.addEventListener("click", () => {
    if (!state.gender) return;
    nameInput.value = pickRandomName(state.gender);
    state.name = nameInput.value;
    updateSubmit();
  });

  container.appendChild(form);
}

function navigate(choice: Choice): void {
  applyEffects(choice.effects);
  for (const flag of choice.setFlags ?? []) flags.add(flag);

  if (choice.duel) {
    const stat = choice.duel.statUsed ?? "force";
    const outcome = fruitCounters(findEatenFruit(flags), choice.duel.counterFruitTypes)
      ? "victoire"
      : resolveDuel(stats[stat], choice.duel.opponentPower);
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
      pendingFruit = undefined;
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
  player = defaultPlayer();
  currentNodeId = "creation-personnage";

  const replayBtn = document.getElementById("replay-btn");
  if (replayBtn) {
    replayBtn.addEventListener("click", () => {
      stats = { force: 0, notoriete: 0, equipage: 0, fruitDuDemon: 0 };
      flags = new Set();
      pendingFruit = undefined;
      player = defaultPlayer();
      currentNodeId = "creation-personnage";
      renderNode();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  renderNode();
}
