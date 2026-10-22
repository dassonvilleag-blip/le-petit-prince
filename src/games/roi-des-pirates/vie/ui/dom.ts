// Un petit créateur d'éléments, pour écrire l'interface sans framework.

type Enfant = Node | string | null | undefined | false;

export interface Props {
  class?: string;
  text?: string;
  title?: string;
  onclick?: (e: MouseEvent) => void;
  attrs?: Record<string, string>;
  style?: string;
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props | null = null, ...enfants: Enfant[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    if (props.class) el.className = props.class;
    if (props.text !== undefined) el.textContent = props.text;
    if (props.title) el.title = props.title;
    if (props.onclick) el.addEventListener("click", props.onclick as EventListener);
    if (props.style) el.setAttribute("style", props.style);
    for (const [k, v] of Object.entries(props.attrs ?? {})) el.setAttribute(k, v);
  }
  for (const e of enfants) {
    if (e === null || e === undefined || e === false) continue;
    el.appendChild(typeof e === "string" ? document.createTextNode(e) : e);
  }
  return el;
}

export function vider(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function attendre(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
