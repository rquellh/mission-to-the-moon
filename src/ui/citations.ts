import { copy } from '../content/copy';
import { SOURCES, type SourceId } from '../content/sources';
import type { Citation } from '../content/types';
import { el, hiddenText } from './dom';
import { icon } from './icons';

/** A link that opens in a new tab, with a small marker and a spoken note saying so. */
export function externalLink(href: string, text: string, className = 'link'): HTMLAnchorElement {
  const anchor = el('a', className);
  anchor.href = href;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.append(text, icon('external', 'icon icon--external'), hiddenText(` ${copy.opensInNewTab}`));
  return anchor;
}

/**
 * Citations grouped by source: each source's title from the registry, then
 * the exact places in it, each linking to the citation's own page when it
 * has one and to the source's main page otherwise.
 */
export function citationList(citations: readonly Citation[]): HTMLUListElement {
  const groups = new Map<SourceId, Citation[]>();
  const seen = new Set<string>();
  for (const citation of citations) {
    const key = `${citation.source}|${citation.locator}|${citation.url ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const group = groups.get(citation.source) ?? [];
    group.push(citation);
    groups.set(citation.source, group);
  }

  const list = el('ul', 'citations');
  for (const [id, group] of groups) {
    const source = SOURCES[id];
    const item = el('li', 'citations__source');
    item.append(el('p', 'citations__title', source.title));
    const places = el('ul', 'citations__places');
    for (const citation of group) {
      const place = el('li', 'citations__place');
      place.append(externalLink(citation.url ?? source.url, citation.locator || source.title, 'link citations__link'));
      places.append(place);
    }
    item.append(places);
    list.append(item);
  }
  return list;
}

/** How many distinct citations a list has. */
function countCitations(citations: readonly Citation[]): number {
  return new Set(citations.map((c) => `${c.source}|${c.locator}|${c.url ?? ''}`)).size;
}

/**
 * A fact's sources, folded behind a "Sources (n)" summary so the text stays
 * easy to read. Opening it lists every source and the exact place in it,
 * then any notes on where the sources disagree. Those notes live here, with
 * the sources, so they never interrupt the story.
 */
export function sourcesBlock(
  citations: readonly Citation[],
  ...discrepancies: Array<string | undefined>
): HTMLDetailsElement {
  const details = el('details', 'sources');
  const summary = el('summary', 'sources__summary');
  summary.append(
    el('span', 'sources__label', `${copy.card.sources} (${countCitations(citations)})`),
    icon('chevron-down', 'icon sources__icon'),
  );
  const notes = discrepancies.filter((text): text is string => Boolean(text)).map(discrepancyNote);
  details.append(summary, citationList(citations), ...notes);
  return details;
}

/** The small-print note shown, under the sources, when sources disagree. */
function discrepancyNote(text: string): HTMLParagraphElement {
  const note = el('p', 'discrepancy');
  note.append(el('span', 'discrepancy__label', copy.card.sourcesDiffer), ` ${text}`);
  return note;
}
