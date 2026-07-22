// Le juke-box cassé — séquenceur chiptune 16 pas.
// Gamme pentatonique (impossible de sonner faux) + 2 pistes de percussion.
// Toute la mélodie est encodée dans l'URL : partager = copier le lien.

const STEPS = 16;

interface Row {
  label: string;
  color: string;
  freq: number | null; // null = percussion
  drum?: "kick" | "hat";
}

const ROWS: Row[] = [
  { label: "do⁵", color: "#ff5c8a", freq: 523.25 },
  { label: "la", color: "#ff8c42", freq: 440 },
  { label: "sol", color: "#ffc93c", freq: 392 },
  { label: "mi", color: "#b5e48c", freq: 329.63 },
  { label: "ré", color: "#1fc7a8", freq: 293.66 },
  { label: "do", color: "#4cc9f0", freq: 261.63 },
  { label: "la₃", color: "#6c63ff", freq: 220 },
  { label: "sol₃", color: "#b388eb", freq: 196 },
  { label: "🥁", color: "#8a5a2b", freq: null, drum: "kick" },
  { label: "🎩", color: "#6d675c", freq: null, drum: "hat" },
];

const pattern: boolean[][] = ROWS.map(() => Array(STEPS).fill(false));
let tempo = 120;
let wave: OscillatorType = "square";

const gridEl = document.getElementById("grid")!;
const btnPlay = document.getElementById("btn-play")!;
const btnRandom = document.getElementById("btn-random")!;
const btnClear = document.getElementById("btn-clear")!;
const btnShare = document.getElementById("btn-share")!;
const tempoInput = document.getElementById("tempo") as HTMLInputElement;
const tempoVal = document.getElementById("tempo-val")!;
const waveSelect = document.getElementById("wave") as HTMLSelectElement;
const toastEl = document.getElementById("toast")!;

let toastTimer = 0;
function toast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2200);
}

// ---- encodage dans l'URL ----

function encode(): string {
  const rows = pattern
    .map((row) => row.reduce((acc, on, i) => acc | (on ? 1 << i : 0), 0).toString(16).padStart(4, "0"))
    .join("");
  const waveChar = wave === "square" ? "s" : wave === "triangle" ? "t" : "w";
  return `v1.${rows}.${tempo}.${waveChar}`;
}

function decode(hash: string): boolean {
  const parts = hash.replace(/^#/, "").split(".");
  if (parts.length !== 4 || parts[0] !== "v1" || parts[1].length !== ROWS.length * 4) return false;
  for (let r = 0; r < ROWS.length; r++) {
    const bits = parseInt(parts[1].slice(r * 4, r * 4 + 4), 16);
    if (Number.isNaN(bits)) return false;
    for (let s = 0; s < STEPS; s++) pattern[r][s] = Boolean(bits & (1 << s));
  }
  const t = Number(parts[2]);
  if (t >= 80 && t <= 200) tempo = t;
  wave = parts[3] === "t" ? "triangle" : parts[3] === "w" ? "sawtooth" : "square";
  return true;
}

function syncUrl(): void {
  history.replaceState(null, "", `#${encode()}`);
}

// ---- audio ----

let audio: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let playing = false;
let currentStep = 0;
let nextNoteTime = 0;
let schedulerId = 0;

function ensureAudio(): AudioContext {
  if (!audio) {
    audio = new AudioContext();
    noiseBuffer = audio.createBuffer(1, audio.sampleRate * 0.1, audio.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return audio;
}

function playNote(row: Row, time: number): void {
  const ac = ensureAudio();
  if (row.freq !== null) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = wave;
    osc.frequency.value = row.freq;
    gain.gain.setValueAtTime(0.16, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    osc.connect(gain).connect(ac.destination);
    osc.start(time);
    osc.stop(time + 0.25);
  } else if (row.drum === "kick") {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
    osc.connect(gain).connect(ac.destination);
    osc.start(time);
    osc.stop(time + 0.18);
  } else {
    const src = ac.createBufferSource();
    const gain = ac.createGain();
    const filter = ac.createBiquadFilter();
    src.buffer = noiseBuffer;
    filter.type = "highpass";
    filter.frequency.value = 6000;
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    src.connect(filter).connect(gain).connect(ac.destination);
    src.start(time);
  }
}

function showPlayhead(step: number, when: number): void {
  const ac = ensureAudio();
  window.setTimeout(() => {
    if (!playing) return;
    gridEl.querySelectorAll(".cell.playhead").forEach((c) => c.classList.remove("playhead"));
    gridEl.querySelectorAll<HTMLElement>(`.cell[data-step="${step}"]`).forEach((c) => c.classList.add("playhead"));
  }, Math.max(0, (when - ac.currentTime) * 1000));
}

function scheduler(): void {
  const ac = ensureAudio();
  const stepDur = 60 / tempo / 4;
  while (nextNoteTime < ac.currentTime + 0.12) {
    for (let r = 0; r < ROWS.length; r++) {
      if (pattern[r][currentStep]) playNote(ROWS[r], nextNoteTime);
    }
    showPlayhead(currentStep, nextNoteTime);
    nextNoteTime += stepDur;
    currentStep = (currentStep + 1) % STEPS;
  }
}

function start(): void {
  const ac = ensureAudio();
  void ac.resume();
  playing = true;
  currentStep = 0;
  nextNoteTime = ac.currentTime + 0.06;
  schedulerId = window.setInterval(scheduler, 25);
  btnPlay.textContent = "⏸ pause";
}

function stop(): void {
  playing = false;
  window.clearInterval(schedulerId);
  gridEl.querySelectorAll(".cell.playhead").forEach((c) => c.classList.remove("playhead"));
  btnPlay.textContent = "▶ jouer";
}

// ---- interface ----

function renderGrid(): void {
  gridEl.style.gridTemplateColumns = `52px repeat(${STEPS}, 34px)`;
  gridEl.innerHTML = "";
  ROWS.forEach((row, r) => {
    const label = document.createElement("span");
    label.className = "row-label";
    label.textContent = row.label;
    label.style.alignSelf = "center";
    label.style.fontSize = "1.05rem";
    gridEl.appendChild(label);
    for (let s = 0; s < STEPS; s++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.step = String(s);
      cell.style.setProperty("--row-color", row.color);
      cell.classList.toggle("on", pattern[r][s]);
      cell.addEventListener("click", () => {
        pattern[r][s] = !pattern[r][s];
        cell.classList.toggle("on", pattern[r][s]);
        if (pattern[r][s] && !playing) playNote(ROWS[r], ensureAudio().currentTime + 0.01);
        syncUrl();
      });
      gridEl.appendChild(cell);
    }
  });
}

btnPlay.addEventListener("click", () => (playing ? stop() : start()));

tempoInput.addEventListener("input", () => {
  tempo = Number(tempoInput.value);
  tempoVal.textContent = String(tempo);
  syncUrl();
});

waveSelect.addEventListener("change", () => {
  wave = waveSelect.value as OscillatorType;
  syncUrl();
});

btnClear.addEventListener("click", () => {
  for (const row of pattern) row.fill(false);
  renderGrid();
  syncUrl();
});

btnRandom.addEventListener("click", () => {
  for (const row of pattern) row.fill(false);
  for (let r = 0; r < 8; r++) {
    for (let n = 0; n < 3; n++) pattern[r][Math.floor(Math.random() * STEPS)] = Math.random() < 0.75;
  }
  for (let s = 0; s < STEPS; s += 4) pattern[8][s] = true; // grosse caisse carrée
  for (let s = 2; s < STEPS; s += 4) pattern[9][s] = Math.random() < 0.8;
  renderGrid();
  syncUrl();
  if (!playing) start();
});

btnShare.addEventListener("click", async () => {
  syncUrl();
  try {
    await navigator.clipboard.writeText(location.href);
    toast("Lien copié ! Envoie ta mélodie 🎵");
  } catch {
    toast("Copie impossible — copie l'URL à la main");
  }
});

// ---- init ----

if (decode(location.hash)) {
  toast("Mélodie chargée depuis le lien 🎶");
}
tempoInput.value = String(tempo);
tempoVal.textContent = String(tempo);
waveSelect.value = wave;
renderGrid();

export {};
