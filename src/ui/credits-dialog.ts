import { copy } from '../content/copy';
import type { CreditEntry } from '../content/credits';
import { SOURCE_GROUPS, SOURCES, type SourceId } from '../content/sources';
import type { Mission, MissionSummary, Photo } from '../content/types';
import type { ExtraMeta } from '../extras/types';
import { externalLink } from './citations';
import { byId, el } from './dom';
import { formatIsoDay } from './format';
import { icon } from './icons';

export interface CreditsOptions {
  /** The open mission: its sources come first, and its photos are listed. */
  mission: Mission;
  /** Every source id the open mission cites, including any kept with another mission. */
  cited: ReadonlySet<string>;
  /** The mission list, to name the other missions whose sources are folded away. */
  summaries: readonly MissionSummary[];
  /** The extras list, to name each extra's own sources, folded the same way. */
  extras: readonly ExtraMeta[];
}

function details(rows: Array<[string, string | Node]>): HTMLDListElement {
  const list = el('dl', 'credits__details');
  for (const [term, value] of rows) {
    const dd = el('dd');
    dd.append(value);
    list.append(el('dt', undefined, term), dd);
  }
  return list;
}

function group(title: string, ...content: HTMLElement[]): HTMLElement {
  const section = el('section', 'credits__group');
  section.append(el('h3', 'credits__group-title', title), ...content);
  return section;
}

function list(items: HTMLElement[]): HTMLUListElement {
  const ul = el('ul', 'credits__list');
  ul.append(...items);
  return ul;
}

function isSourceId(id: string): id is SourceId {
  return Object.hasOwn(SOURCES, id);
}

function sourceItem(id: SourceId): HTMLLIElement {
  const source = SOURCES[id];
  const item = el('li', 'credits__item');
  item.id = `source-${id}`;
  const heading = el('h5', 'credits__item-title');
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
 * The sources, in the order a reader of this mission needs them: the open
 * mission's own (with any it borrows from another mission), then the ones
 * many missions share, then every other mission's own, each folded away
 * under its name. Each source is listed once.
 */
function sourceGroups({ mission, cited, summaries, extras }: CreditsOptions): HTMLElement {
  const listed = new Set<string>();
  const take = (ids: readonly string[]): HTMLLIElement[] =>
    ids.flatMap((id) => {
      if (!isSourceId(id) || listed.has(id)) return [];
      listed.add(id);
      return [sourceItem(id)];
    });

  const sharedIds = Object.keys(SOURCE_GROUPS.shared);
  const ownIds = Object.keys(SOURCE_GROUPS.missions[mission.id] ?? {});
  const borrowedIds = [...cited].filter((id) => !sharedIds.includes(id) && !ownIds.includes(id));
  const parts: HTMLElement[] = [];

  const own = take([...ownIds, ...borrowedIds]);
  if (own.length) parts.push(el('h4', 'credits__subgroup-title', mission.name), list(own));
  const shared = take(sharedIds);
  if (shared.length) parts.push(el('h4', 'credits__subgroup-title', copy.credits.shared), list(shared));

  /** A group of sources folded away under a name, or null when all of them are listed already. */
  const fold = (name: string, ids: readonly string[]): HTMLElement | null => {
    const items = take(ids);
    if (!items.length) return null;
    const details = el('details', 'credits__fold');
    const summary = el('summary', 'credits__fold-summary');
    summary.append(
      el('span', 'credits__fold-name', name),
      el('span', 'credits__fold-count', copy.credits.sourceCount(items.length)),
      icon('chevron-down', 'icon credits__fold-icon'),
    );
    details.append(summary, list(items));
    return details;
  };

  const missionFolds: HTMLElement[] = [];
  for (const [id, sources] of Object.entries(SOURCE_GROUPS.missions)) {
    const name = summaries.find((summary) => summary.id === id)?.name;
    if (id === mission.id || !name) continue;
    const folded = fold(name, Object.keys(sources));
    if (folded) missionFolds.push(folded);
  }
  if (missionFolds.length) parts.push(el('h4', 'credits__subgroup-title', copy.credits.otherMissions), ...missionFolds);

  // Each listed extra's own sources, in the list's order, named with its title.
  const extraFolds: HTMLElement[] = [];
  for (const meta of extras) {
    const folded = fold(meta.title, Object.keys(SOURCE_GROUPS.extras[meta.id] ?? {}));
    if (folded) extraFolds.push(folded);
  }
  if (extraFolds.length) parts.push(el('h4', 'credits__subgroup-title', copy.credits.extras), ...extraFolds);

  return group(copy.credits.sources, ...parts);
}

/**
 * The open mission's photo credits. Other missions' photos are credited on
 * their own cards; listing them all here would make the list too long to read.
 */
function photoGroup(mission: Mission): HTMLElement {
  const seen = new Set<string>();
  const items: HTMLLIElement[] = [];
  // The crew's portrait from "About this mission" first, then each event's photo.
  const photos: Array<{ title: string; photo: Photo | undefined }> = [
    { title: copy.about.crew, photo: mission.crewPhoto },
    ...mission.events.map((event) => ({ title: event.title, photo: event.photo })),
  ];
  for (const { title, photo } of photos) {
    if (!photo || seen.has(photo.src)) continue;
    seen.add(photo.src);
    const item = el('li', 'credits__item');
    const heading = el('h4', 'credits__item-title');
    heading.append(externalLink(photo.sourceUrl, title));
    item.append(
      heading,
      details([
        [copy.credits.credit, photo.credit],
        [copy.credits.usedFor, photo.alt],
      ]),
    );
    items.push(item);
  }
  const note = el('p', 'credits__note', copy.credits.photosNote);
  return items.length ? group(copy.credits.photos, note, list(items)) : group(copy.credits.photos, note);
}

/** Fill the "Sources and credits" dialog: sources, this mission's photo credits, and site-wide credits. */
export function renderCredits(credits: readonly CreditEntry[], options: CreditsOptions): void {
  byId('credits-body', HTMLDivElement).replaceChildren(
    el('p', 'credits__intro', copy.credits.intro(options.mission.name)),
    sourceGroups(options),
    photoGroup(options.mission),
    group(copy.credits.media, list(credits.map(mediaItem))),
  );
}
