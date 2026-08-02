// Contrôles tactiles partagés : des boutons à l'écran qui synthétisent de
// vrais événements clavier (KeyboardEvent avec `code`). Les jeux qui lisent
// keydown/keyup sur window fonctionnent tels quels, sans toucher à leur
// logique d'entrée. N'apparaît que sur écran tactile (pointer: coarse).
//
// Usage :
//   installTouchControls({
//     left:  [{ code: "ArrowLeft", label: "◀" }, { code: "ArrowRight", label: "▶" }],
//     right: [{ code: "Space", label: "⤒" }],
//   });

export interface TouchButtonSpec {
  code: string; // e.code synthétisé (ex. "ArrowLeft", "Space", "KeyE")
  label: string; // contenu affiché (emoji / flèche)
  /** bouton plus large (ex. saut) */
  wide?: boolean;
}

export interface TouchControlsSpec {
  left: TouchButtonSpec[];
  right: TouchButtonSpec[];
}

export function isTouchDevice(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

const press = (code: string, type: "keydown" | "keyup"): void => {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }));
};

function makeButton(spec: TouchButtonSpec): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tc-btn" + (spec.wide ? " tc-wide" : "");
  btn.textContent = spec.label;
  btn.setAttribute("aria-label", spec.code);

  let active = false;
  const down = (e: PointerEvent): void => {
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);
    if (!active) {
      active = true;
      btn.classList.add("tc-active");
      press(spec.code, "keydown");
    }
  };
  const up = (e: PointerEvent): void => {
    e.preventDefault();
    if (active) {
      active = false;
      btn.classList.remove("tc-active");
      press(spec.code, "keyup");
    }
  };
  btn.addEventListener("pointerdown", down);
  btn.addEventListener("pointerup", up);
  btn.addEventListener("pointercancel", up);
  // le doigt qui glisse hors du bouton doit relâcher la touche
  btn.addEventListener("pointerleave", (e) => {
    if (active) up(e);
  });
  btn.addEventListener("contextmenu", (e) => e.preventDefault());
  return btn;
}

let installed = false;

export function installTouchControls(spec: TouchControlsSpec): void {
  if (installed || !isTouchDevice()) return;
  installed = true;

  const style = document.createElement("style");
  style.textContent = `
.tc-zone {
  position: fixed;
  bottom: max(14px, env(safe-area-inset-bottom));
  z-index: 40;
  display: flex;
  gap: 12px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.tc-left { left: max(14px, env(safe-area-inset-left)); }
.tc-right { right: max(14px, env(safe-area-inset-right)); }
.tc-btn {
  width: 62px;
  height: 62px;
  border-radius: 16px;
  border: 3px solid rgba(20, 20, 30, 0.55);
  background: rgba(250, 248, 240, 0.55);
  backdrop-filter: blur(3px);
  color: rgba(20, 20, 30, 0.85);
  font-size: 26px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
  cursor: pointer;
  padding: 0;
}
.tc-wide { width: 84px; }
.tc-btn.tc-active {
  background: rgba(255, 201, 60, 0.85);
  transform: scale(0.94);
}
`;
  document.head.appendChild(style);

  for (const [side, buttons] of [
    ["tc-left", spec.left],
    ["tc-right", spec.right],
  ] as const) {
    if (!buttons.length) continue;
    const zone = document.createElement("div");
    zone.className = `tc-zone ${side}`;
    for (const b of buttons) zone.appendChild(makeButton(b));
    document.body.appendChild(zone);
  }
}
