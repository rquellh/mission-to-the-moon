/**
 * Citation lists and the folded "Sources" block, built on their own from
 * typed citations of real sources: duplicates, grouping, and where each
 * link goes.
 */
import { describe, expect, it } from 'vitest';
import { SOURCES } from '../content/sources.ts';
import type { Citation } from '../content/types.ts';
import { within } from '../test/test-utils.ts';
import { citationList, externalLink, sourcesBlock } from './citations.ts';

const TIMELINE: Citation = {
  source: 'apollo-by-the-numbers',
  locator: 'Apollo 11 Timeline, row "LM lunar landing."',
  url: 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_11i_Timeline.htm',
};
const SUMMARY: Citation = {
  source: 'apollo-by-the-numbers',
  locator: 'Apollo 11 mission summary, footnote 1',
  url: 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_11a_Summary.htm',
};
/** No place and no link of its own: the link is the source's main page, named for the source. */
const WHOLE_CATALOG: Citation = { source: 'nssdca-master-catalog', locator: '' };

describe('citationList', () => {
  it('lists a citation given twice only once', () => {
    const list = citationList([TIMELINE, TIMELINE, SUMMARY]);

    expect(within(list).getAllByRole('link')).toHaveLength(2);
  });

  it('groups the places under the title of their source', () => {
    const list = citationList([TIMELINE, WHOLE_CATALOG, SUMMARY]);

    // One row per source, with its places in a list of their own inside it.
    const [numbers, catalog] = within(list)
      .getAllByRole('listitem')
      .filter((item) => item.parentElement === list);
    expect(numbers).toHaveTextContent(SOURCES['apollo-by-the-numbers'].title);
    expect(within(numbers!).getAllByRole('link')).toHaveLength(2);
    expect(catalog).toHaveTextContent(SOURCES['nssdca-master-catalog'].title);
  });

  it("links to the citation's own page, or else to the source's", () => {
    const list = citationList([TIMELINE, WHOLE_CATALOG]);

    expect(within(list).getByRole('link', { name: /^Apollo 11 Timeline/ })).toHaveAttribute(
      'href',
      TIMELINE.url,
    );
    expect(within(list).getByRole('link', { name: /^NSSDCA Master Catalog/ })).toHaveAttribute(
      'href',
      SOURCES['nssdca-master-catalog'].url,
    );
  });
});

describe('externalLink', () => {
  it('opens in a new tab, and says so', () => {
    const link = externalLink('https://www.nasa.gov/', 'NASA');

    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveTextContent('NASA (opens in a new tab)');
  });
});

describe('sourcesBlock', () => {
  it('counts each distinct citation, and adds a note for each disagreement', () => {
    const block = sourcesBlock([TIMELINE, TIMELINE, SUMMARY], 'NSSDCA gives 20:17:40.', undefined);

    expect(block).toHaveTextContent('Sources (2)');
    expect(within(block).getAllByText('Sources differ.')).toHaveLength(1);
    expect(block).toHaveTextContent('Sources differ. NSSDCA gives 20:17:40.');
  });
});
