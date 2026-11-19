import { copy } from '../content/copy';
import type { Citation, Fact, Memorial } from '../content/types';
import { sourcesBlock } from './citations';
import { setUpDialog } from './dialogs';
import { button, byId, el } from './dom';
import { formatDate } from './format';
import { icon } from './icons';
import { fillPhoto } from './photo';

export interface MemorialOptions {
  /** Load a memorial's content, which is not part of the page until it is asked for. */
  load(id: string): Promise<Memorial>;
  /** The name to show while it loads, from the mission list. */
  nameOf(id: string): string | undefined;
  /** The address that opens this memorial, for reloading after a failed load. */
  addressOf(id: string): string;
}

export interface MemorialPages {
  /** Open a memorial page; focus goes back to `returnTo` when it closes. */
  open(id: string, returnTo?: HTMLElement | null): void;
}

function section(title: string): HTMLElement {
  const block = el('section', 'about__section');
  block.append(el('h3', 'about__heading', title));
  return block;
}

/** "1967-01-27" as "January 27, 1967", or the text as given when it does not read as a date. */
function dayOf(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : formatDate(date);
}

let disclosures = 0;

/**
 * A fact at its first reading level, with "Tell me more" for the fuller one,
 * then its sources folded away. `alsoCites` adds the sources of things shown
 * with the fact (the date, beside the summary).
 */
function factBlock(fact: Fact, className: string, alsoCites: readonly Citation[] = [], alsoDiffers?: string): HTMLElement {
  const wrap = el('div', className);
  wrap.append(el('p', 'about__short', fact.text.short));
  if (fact.text.more) {
    const more = el('p', 'about__more', fact.text.more);
    more.id = `memorial-more-${(disclosures += 1)}`;
    more.hidden = true;
    const toggle = button('disclosure memorial__toggle');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', more.id);
    const label = el('span', 'disclosure__label', copy.card.tellMore);
    toggle.append(label, icon('chevron-down', 'icon disclosure__icon'));
    toggle.addEventListener('click', () => {
      const open = more.hidden;
      more.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      label.textContent = open ? copy.card.tellLess : copy.card.tellMore;
    });
    wrap.append(toggle, more);
  }
  wrap.append(sourcesBlock([...fact.citations, ...alsoCites], fact.discrepancy, alsoDiffers));
  return wrap;
}

/** The page itself: the date, the photo, the summary, the crew, then each section in reading order. */
function renderMemorial(memorial: Memorial): HTMLElement[] {
  const parts: HTMLElement[] = [];

  const intro = el('section', 'about__section about__section--intro memorial__intro');
  const byline = el('p', 'about__byline');
  byline.append(el('span', 'about__dates', dayOf(memorial.date.value)));
  intro.append(byline);
  if (memorial.photo) {
    const figure = el('figure', 'card__photo memorial__photo');
    fillPhoto(figure, memorial.photo);
    intro.append(figure);
  }
  intro.append(factBlock(memorial.summary, 'about__summary', memorial.date.citations, memorial.date.discrepancy));
  parts.push(intro);

  const crew = section(copy.memorial.crew);
  const crewList = el('ul', 'about__crew');
  for (const member of memorial.crew.value) {
    const item = el('li', 'about__crew-member');
    item.append(el('span', 'about__crew-name', member.name), el('span', 'about__crew-role', member.role));
    crewList.append(item);
  }
  crew.append(crewList, sourcesBlock(memorial.crew.citations, memorial.crew.discrepancy));
  parts.push(crew);

  for (const part of memorial.sections) {
    const block = section(part.title);
    const list = el('ol', 'about__list');
    for (const fact of part.facts) {
      const item = el('li', 'about__item');
      item.append(factBlock(fact, 'about__fact'));
      list.append(item);
    }
    block.append(list);
    parts.push(block);
  }
  return parts;
}

/**
 * Memorial pages, in the same dialog system as About and Sources. Nothing
 * of a memorial is in the page until it is opened; it loads then, with a
 * short note while it does.
 */
export function setUpMemorial({ load, nameOf, addressOf }: MemorialOptions): MemorialPages {
  const dialog = byId('memorial-dialog', HTMLDialogElement);
  const title = byId('memorial-title', HTMLHeadingElement);
  const body = byId('memorial-body', HTMLDivElement);
  const handle = setUpDialog(dialog);

  // Only the latest opening may fill the page.
  let opening = 0;
  let titleBefore = document.title;
  dialog.addEventListener('close', () => {
    opening += 1;
    document.title = titleBefore;
  });

  const note = (text: string): HTMLParagraphElement => {
    const line = el('p', 'memorial__status', text);
    line.setAttribute('role', 'status');
    return line;
  };

  return {
    open(id, returnTo) {
      const ticket = (opening += 1);
      const name = nameOf(id);
      title.textContent = name ?? '';
      body.setAttribute('aria-busy', 'true');
      body.replaceChildren(note(name ? copy.loadingMission(name) : copy.memorial.loadingUnnamed));
      if (!dialog.open) titleBefore = document.title;
      if (name) document.title = copy.pageTitle(name);
      handle.open(returnTo);

      load(id).then(
        (memorial) => {
          if (ticket !== opening) return;
          title.textContent = memorial.name;
          document.title = copy.pageTitle(memorial.name);
          body.replaceChildren(...renderMemorial(memorial));
          body.removeAttribute('aria-busy');
        },
        (error: unknown) => {
          console.error(error);
          if (ticket !== opening) return;
          const reload = button('button', copy.memorial.reload);
          reload.addEventListener('click', () => window.location.assign(addressOf(id)));
          const failed = el('div', 'memorial__failed');
          failed.append(note(copy.memorial.failed), reload);
          body.replaceChildren(failed);
          body.removeAttribute('aria-busy');
        },
      );
    },
  };
}
