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

function photoItems(missions: readonly Mission[]): HTMLLIElement[] {
  const items: HTMLLIElement[] = [];
  const seen = new Set<string>();
  for (const mission of missions) {
    for (const event of mission.events) {
      const photo = event.photo;
      if (!photo || seen.has(photo.src)) continue;
      seen.add(photo.src);
      const item = el('li', 'credits__item');
      const heading = el('h4', 'credits__item-title');
      heading.append(externalLink(photo.sourceUrl, `${mission.name}: ${event.title}`));
      item.append(
        heading,
        details([
          [copy.credits.credit, photo.credit],
          [copy.credits.usedFor, photo.alt],
        ]),
      );
      items.push(item);
    }
  }
  return items;
}

/** Fill the "Sources and credits" dialog: the source registry, photo credits, and media credits. */
export function renderCredits(credits: readonly CreditEntry[], missions: readonly Mission[]): void {
  const body = byId('credits-body', HTMLDivElement);
  const ids = Object.keys(SOURCES) as SourceId[];
  const parts: HTMLElement[] = [
    el('p', 'credits__intro', copy.credits.intro),
    group(copy.credits.sources, ids.map(sourceItem)),
  ];
  const photos = photoItems(missions);
  if (photos.length) parts.push(group(copy.credits.photos, photos));
  parts.push(group(copy.credits.media, credits.map(mediaItem)));
  body.replaceChildren(...parts);
}
