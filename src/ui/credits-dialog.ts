import { copy } from '../content/copy';
import type { CreditEntry } from '../content/credits';
import { SOURCES, type SourceId } from '../content/sources';
import type { Mission } from '../content/types';
import { externalLink } from './citations';
import { byId, el } from './dom';
import { formatIsoDay } from './format';

function details(rows: Array<[string, string | Node]>): HTMLDListElement {
  const list = el('dl', 'credits__details');
  for (const [term, value] of rows) {
    const dd = el('dd');
    dd.append(value);
    list.append(el('dt', undefined, term), dd);
  }
  return list;
}

function group(title: string, items: HTMLElement[]): HTMLElement {
  const section = el('section', 'credits__group');
  const list = el('ul', 'credits__list');
  list.append(...items);
  section.append(el('h3', 'credits__group-title', title), list);
  return section;
}

function sourceItem(id: SourceId): HTMLLIElement {
  const source = SOURCES[id];
  const item = el('li', 'credits__item');
  item.id = `source-${id}`;
  const heading = el('h4', 'credits__item-title');
  heading.append(externalLink(source.url, source.title));
  item.append(
    heading,
    el('p', 'credits__publisher', source.publisher),
    el('p', 'credits__use', source.use),
    el('p', 'credits__checked', copy.credits.checked(formatIsoDay(source.checked))),
  );
  return item;
}

function mediaItem(entry: CreditEntry): HTMLLIElement {
  const item = el('li', 'credits__item');
  item.id = `credit-${entry.id}`;
  const heading = el('h4', 'credits__item-title');
  heading.append(externalLink(entry.sourcePageUrl, entry.title));
  const rows: Array<[string, string | Node]> = [
    [copy.credits.credit, entry.credit],
    [copy.credits.usedFor, entry.usage],
    [copy.credits.changes, entry.modifications],
  ];
  if (entry.fileUrl !== entry.sourcePageUrl) {
    rows.push([
      copy.credits.originalFile,
      externalLink(entry.fileUrl, entry.fileUrl.split('/').pop() ?? entry.fileUrl),
    ]);
  }
  item.append(heading, details(rows));
  return item;
}

/**
 * Photo credits, one list per mission in flight order, each under the
 * mission's name. A photo used by more than one mission is listed once.
 */
function photoGroups(missions: readonly Mission[]): HTMLElement | null {
  const seen = new Set<string>();
  const sections: HTMLElement[] = [];
  for (const mission of missions) {
    const items: HTMLLIElement[] = [];
    for (const event of mission.events) {
      const photo = event.photo;
      if (!photo || seen.has(photo.src)) continue;
      seen.add(photo.src);
      const item = el('li', 'credits__item');
      const heading = el('h5', 'credits__item-title');
      heading.append(externalLink(photo.sourceUrl, event.title));
      item.append(
        heading,
        details([
          [copy.credits.credit, photo.credit],
          [copy.credits.usedFor, photo.alt],
        ]),
      );
      items.push(item);
    }
    if (!items.length) continue;
    const section = el('section', 'credits__mission');
    const list = el('ul', 'credits__list');
    list.append(...items);
    section.append(el('h4', 'credits__mission-title', mission.name), list);
    sections.push(section);
  }
  if (!sections.length) return null;
  const block = el('section', 'credits__group');
  block.append(el('h3', 'credits__group-title', copy.credits.photos), ...sections);
  return block;
}

/** Fill the "Sources and credits" dialog: the source registry, photo credits per mission, and media credits. */
export function renderCredits(credits: readonly CreditEntry[], missions: readonly Mission[]): void {
  const body = byId('credits-body', HTMLDivElement);
  const ids = Object.keys(SOURCES) as SourceId[];
  const parts: HTMLElement[] = [
    el('p', 'credits__intro', copy.credits.intro),
    group(copy.credits.sources, ids.map(sourceItem)),
  ];
  const photos = photoGroups(missions);
  if (photos) parts.push(photos);
  parts.push(group(copy.credits.media, credits.map(mediaItem)));
  body.replaceChildren(...parts);
}
