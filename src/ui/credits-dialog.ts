import type { CreditEntry } from '../content/credits';
import { byId, el } from './dom';

function link(href: string, text: string): HTMLAnchorElement {
  const anchor = el('a', 'credits__link', text);
  anchor.href = href;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  return anchor;
}

function renderEntry(entry: CreditEntry): HTMLLIElement {
  const item = el('li', 'credits__item');
  item.id = `credit-${entry.id}`;

  const heading = el('h3', 'credits__item-title');
  heading.append(link(entry.sourcePageUrl, entry.title));
  item.append(heading);

  const details = el('dl', 'credits__details');
  const add = (term: string, value: string | Node): void => {
    details.append(el('dt', undefined, term));
    const dd = el('dd');
    dd.append(value);
    details.append(dd);
  };
  add('Credit', entry.credit);
  add('Used for', entry.usage);
  add('Changes', entry.modifications);
  if (entry.fileUrl !== entry.sourcePageUrl) {
    add('Original file', link(entry.fileUrl, entry.fileUrl.split('/').pop() ?? entry.fileUrl));
  }
  item.append(details);
  return item;
}

/** Fill the credits dialog and wire its open and close buttons. */
export function setUpCreditsDialog(credits: readonly CreditEntry[]): void {
  const dialog = byId('credits-dialog', HTMLDialogElement);
  const openButton = byId('credits-button', HTMLButtonElement);
  const closeButton = byId('credits-close', HTMLButtonElement);
  const list = byId('credits-list', HTMLUListElement);

  list.replaceChildren(...credits.map(renderEntry));

  openButton.addEventListener('click', () => {
    dialog.showModal();
    closeButton.focus();
  });
  closeButton.addEventListener('click', () => dialog.close());

  // Close when the backdrop (outside the dialog box) is clicked.
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    const outside =
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom;
    if (outside) dialog.close();
  });

  dialog.addEventListener('close', () => openButton.focus());
}
