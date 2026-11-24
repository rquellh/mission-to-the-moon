/** Find a required element by id, checking its type. */
export function byId<T extends HTMLElement>(id: string, type: new () => T): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) {
    throw new Error(`Expected #${id} to be a ${type.name}`);
  }
  return element;
}

/** Find a required element inside a parent, checking its type. */
export function find<T extends Element>(
  parent: ParentNode,
  selector: string,
  type: new () => T,
): T {
  const element = parent.querySelector(selector);
  if (!(element instanceof type)) {
    throw new Error(`Expected ${selector} to be a ${type.name}`);
  }
  return element;
}

/** Create an element with optional class name and text. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** A button with a class and optional text. */
export function button(className: string, text?: string): HTMLButtonElement {
  const element = el('button', className, text);
  element.type = 'button';
  return element;
}

/** Text that only screen readers hear. */
export function hiddenText(text: string): HTMLSpanElement {
  return el('span', 'visually-hidden', text);
}

/** True when the person has asked the system to reduce motion. */
export function reducedMotionQuery(): MediaQueryList {
  return window.matchMedia('(prefers-reduced-motion: reduce)');
}

/**
 * The wide layout: the event card becomes a panel at the side and the
 * timeline runs along the bottom. Keep in step with the media query in
 * main.css.
 */
export function wideLayoutQuery(): MediaQueryList {
  return window.matchMedia('(min-width: 860px), (min-width: 600px) and (orientation: landscape)');
}

/** Set text only when it changes, to avoid needless layout work each frame. */
export function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}
