export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 3);
}

export function interpolate(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

export function visibleCharacterCount(text: string, elapsedMs: number, msPerChar: number): number {
  if (msPerChar <= 0) return text.length;
  return Math.min(text.length, Math.floor(elapsedMs / msPerChar));
}

let activeFrameIds: number[] = [];
let activeTimeoutIds: number[] = [];

export function cancelAllReveals(): void {
  for (const id of activeFrameIds) cancelAnimationFrame(id);
  for (const id of activeTimeoutIds) clearTimeout(id);
  activeFrameIds = [];
  activeTimeoutIds = [];
}

export function afterDelay(durationMs: number, fn: () => void): void {
  const id = setTimeout(fn, durationMs);
  activeTimeoutIds.push(id);
}

export function startCountUp(
  el: HTMLElement,
  from: number,
  to: number,
  durationMs: number,
  format: (value: number) => string,
): void {
  const start = performance.now();

  function frame(now: number) {
    const progress = Math.min(1, (now - start) / durationMs);
    const value = interpolate(from, to, easeOutCubic(progress));
    el.textContent = format(value);
    if (progress < 1) {
      activeFrameIds.push(requestAnimationFrame(frame));
    }
  }

  activeFrameIds.push(requestAnimationFrame(frame));
}

export function startTypewrite(el: HTMLElement, text: string, msPerChar: number): void {
  const start = performance.now();
  el.textContent = "";

  function frame(now: number) {
    const count = visibleCharacterCount(text, now - start, msPerChar);
    el.textContent = text.slice(0, count);
    if (count < text.length) {
      activeFrameIds.push(requestAnimationFrame(frame));
    }
  }

  activeFrameIds.push(requestAnimationFrame(frame));
}
