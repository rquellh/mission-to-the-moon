/**
 * "Sources and credits", on Gemini 7, which cites some sources kept with
 * Gemini 6A and Gemini 8: the open mission's sources come first, each
 * source is listed once, and the crew portrait leads the photo credits.
 */
import { describe, expect, it } from 'vitest';
import { mountMission, screen, within, type User } from '../test/test-utils.ts';
import { SOURCES } from '../content/sources.ts';

async function openCredits(user: User): Promise<HTMLElement> {
  await user.click(screen.getByRole('button', { name: 'Sources and credits' }));
  return screen.getByRole('dialog', { name: 'Sources and credits' });
}

/** A group of the dialog, found by its title (the groups have no label of their own). */
function groupTitled(dialog: HTMLElement, title: string): HTMLElement {
  const group = within(dialog).getByRole('heading', { level: 3, name: title }).closest('section');
  if (!group) throw new Error(`No group titled ${title}`);
  return group;
}

describe('Sources and credits', () => {
  describe('sources', () => {
    it("lists the open mission's sources first, with the ones it borrows from other missions", async () => {
      const { user } = await mountMission('gemini-7', { start: 'explore' });
      const dialog = await openCredits(user);

      const sources = groupTitled(dialog, 'Sources');
      expect(within(sources).getAllByRole('heading', { level: 4 })[0]).toHaveTextContent('Gemini 7');
      const [own] = within(sources).getAllByRole('list');
      expect(within(own!).getAllByRole('listitem')).toHaveLength(7);
      expect(within(own!).getByRole('link', { name: /^Gemini VII Capsule/ })).toBeInTheDocument();
      expect(within(own!).getByRole('link', { name: /^Gemini Program Mission Report: Gemini VII \(MSC-G-R-66-1\)/ })).toBeInTheDocument();
      expect(within(own!).getByRole('link', { name: /^Gemini Program Mission Report: Gemini VIII \(MSC-G-R-66-4\)/ })).toBeInTheDocument();
    });

    it('lists each source once, and every one of them', async () => {
      const { user } = await mountMission('gemini-7', { start: 'explore' });
      const dialog = await openCredits(user);

      const sources = groupTitled(dialog, 'Sources');
      expect(within(sources).getAllByRole('heading', { level: 5 })).toHaveLength(Object.keys(SOURCES).length);
      expect(within(sources).getAllByRole('link', { name: /^Gemini Program Mission Report: Gemini VII \(MSC-G-R-66-1\)/ })).toHaveLength(1);
      // Gemini 6A keeps seven sources; Gemini 7 lists three of them as its own, so its fold has four.
      // (A fold's summary has no accessible name, so the name's own line leads to it.)
      expect(within(sources).getByText('Gemini 6A').closest('summary')).toHaveTextContent('Gemini 6A4 sources');
    });

    it('says when the link of each source was last checked', async () => {
      const { user } = await mountMission('gemini-7', { start: 'explore' });
      const dialog = await openCredits(user);

      const sources = groupTitled(dialog, 'Sources');
      expect(within(sources).getAllByText(/^Link checked [A-Z][a-z]+ \d{1,2}, \d{4}$/)).toHaveLength(
        Object.keys(SOURCES).length,
      );
    });
  });

  describe('photos', () => {
    it('credits the crew portrait first, then each photo of the mission once', async () => {
      const { user } = await mountMission('gemini-7', { start: 'explore' });
      const dialog = await openCredits(user);

      const photos = groupTitled(dialog, 'Photos');
      expect(within(photos).getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent)).toEqual([
        'The crew (opens in a new tab)',
        'Liftoff for two weeks (opens in a new tab)',
        'Watching a missile launch (opens in a new tab)',
        'Visitors (opens in a new tab)',
        'Splashdown (opens in a new tab)',
      ]);
    });
  });
});
