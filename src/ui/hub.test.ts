/**
 * The list of every mission, opened from the welcome's "All missions" and
 * from the mission's name. How it is grouped and marked, what choosing an
 * entry does, and the way out.
 */
import { describe, expect, it } from 'vitest';
import type { MissionSummary } from '../content/types.ts';
import { mountMission, navigation, screen, within, type User } from '../test/test-utils.ts';

/** The real list, with Gemini 7 as a flight that has no tour (every real flight has one). */
const gemini7WithoutATour = (summaries: readonly MissionSummary[]): MissionSummary[] =>
  summaries.map((summary) =>
    summary.id === 'gemini-7' ? { ...summary, hasTour: false } : summary,
  );

const missionList = (): HTMLElement => screen.getByRole('dialog', { name: 'All missions' });

/** Open the list from the welcome, where a plain address begins. */
async function openTheList(user: User): Promise<HTMLElement> {
  await user.click(screen.getByRole('button', { name: 'All missions' }));
  return missionList();
}

const namesIn = (section: HTMLElement): Array<string | null> =>
  within(section)
    .getAllByRole('heading', { level: 4 })
    .map((heading) => heading.textContent);

describe('the mission list', () => {
  describe('rendering', () => {
    it('groups the missions by program, in date order, with the years each program flew', async () => {
      const { user } = await mountMission('apollo-11');
      const list = await openTheList(user);

      const gemini = within(list).getByRole('region', { name: /^Gemini/ });
      expect(within(gemini).getByRole('heading', { level: 3 })).toHaveTextContent(
        'Gemini 1965–1966',
      );
      expect(namesIn(gemini).slice(0, 6)).toEqual([
        'Gemini 3',
        'Gemini 4',
        'Gemini 5',
        'Gemini 7',
        'Gemini 6A',
        'Gemini 8',
      ]);
      const apollo = within(list).getByRole('region', { name: /^Apollo/ });
      expect(within(apollo).getByRole('heading', { level: 3 })).toHaveTextContent(
        'Apollo 1967–1972',
      );
      expect(namesIn(apollo)[0]).toBe('Apollo 1');
    });

    it('says what the list is for, and who is remembered in it', async () => {
      const { user } = await mountMission('apollo-11');

      const list = await openTheList(user);

      expect(within(list).getByRole('heading', { level: 2 })).toHaveTextContent('All missions');
      expect(list).toHaveAccessibleDescription(
        'Choose a flight and ride along in 3D, from liftoff to splashdown. Apollo 1 is remembered here too.',
      );
    });

    it('marks the mission on show', async () => {
      const { user } = await mountMission('apollo-11');
      const list = await openTheList(user);

      const showing = within(list).getByRole('listitem', { current: true });
      expect(within(showing).getByRole('heading', { level: 4 })).toHaveTextContent(
        'Apollo 11 Now showing',
      );
    });

    it('offers Read for the memorial, and the tour only on a flight that has one', async () => {
      const { user } = await mountMission('apollo-11', { missionList: gemini7WithoutATour });
      const list = await openTheList(user);

      expect(within(list).getByRole('button', { name: 'Read about Apollo 1' })).toBeInTheDocument();
      expect(
        within(list).queryByRole('button', { name: 'Explore Apollo 1' }),
      ).not.toBeInTheDocument();
      expect(within(list).getByRole('button', { name: 'Explore Gemini 7' })).toBeInTheDocument();
      expect(
        within(list).queryByRole('button', { name: 'Take the tour of Gemini 7' }),
      ).not.toBeInTheDocument();
      expect(
        within(list).getByRole('button', { name: 'Take the tour of Gemini 6A' }),
      ).toBeInTheDocument();
    });

    it('marks an unfinished mission as a draft', async () => {
      const { user } = await mountMission('apollo-11', {
        isDraft: (summary) => summary.id === 'apollo-17',
      });
      const list = await openTheList(user);

      expect(
        within(list).getByRole('heading', { level: 4, name: 'Apollo 17 Draft' }),
      ).toBeInTheDocument();
      expect(
        within(list).getByRole('heading', { level: 4, name: 'Apollo 16' }),
      ).toBeInTheDocument();
    });

    it('lists the extras in two groups under the missions', async () => {
      const { user } = await mountMission('apollo-11');
      const list = await openTheList(user);

      expect(namesIn(within(list).getByRole('region', { name: 'Play a game' }))).toEqual([
        'Fly to orbit',
        'Drop the stages',
        'Dock two spacecraft',
        'Land on the Moon',
      ]);
      expect(namesIn(within(list).getByRole('region', { name: 'More to explore' }))).toEqual([
        'Mission patches',
        'Six landings on the Moon',
        'Three rockets',
      ]);
    });

    it('offers Play for a game, and Open for something to look through', async () => {
      const { user } = await mountMission('apollo-11');
      const list = await openTheList(user);

      const games = within(list).getByRole('region', { name: 'Play a game' });
      expect(
        within(games).getByRole('button', { name: 'Play Dock two spacecraft' }),
      ).toHaveTextContent(/^Play$/);
      const toExplore = within(list).getByRole('region', { name: 'More to explore' });
      expect(
        within(toExplore).getByRole('button', { name: 'Open Three rockets' }),
      ).toHaveTextContent(/^Open$/);
    });
  });

  describe('choosing', () => {
    it('starts the tour of the mission on show, in place, leaving the welcome behind', async () => {
      const { user } = await mountMission('apollo-11');
      await openTheList(user);

      await user.click(screen.getByRole('button', { name: 'Take the tour of Apollo 11' }));

      expect(screen.queryByRole('dialog', { name: 'All missions' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('region', { name: 'Ride along on Apollo 11' }),
      ).not.toBeInTheDocument();
      expect(document.body).not.toHaveClass('is-welcome');
      expect(screen.getByRole('region', { name: 'Guided tour' })).toHaveTextContent('Stop 1 of 25');
      expect(document.title).toBe('Apollo 11 · Mission to the Moon');
      expect(navigation.address).toBeNull();
    });

    it('opens another mission at its own address, starting the way chosen', async () => {
      const { user } = await mountMission('apollo-11');
      await openTheList(user);

      await user.click(screen.getByRole('button', { name: 'Take the tour of Gemini 8' }));
      expect(navigation.address).toBe('http://localhost:3000/?mission=gemini-8&start=tour');

      await user.click(screen.getByRole('button', { name: 'Explore Apollo 17' }));
      expect(navigation.address).toBe('http://localhost:3000/?mission=apollo-17&start=explore');
    });

    it('opens the memorial page over the list', async () => {
      const { user } = await mountMission('apollo-11');
      await openTheList(user);

      await user.click(screen.getByRole('button', { name: 'Read about Apollo 1' }));

      expect(await screen.findByRole('dialog', { name: 'Apollo 1' })).toBeVisible();
      expect(missionList()).toBeVisible();
    });

    it('opens an extra over the list', async () => {
      const { user } = await mountMission('apollo-11');
      await openTheList(user);

      await user.click(screen.getByRole('button', { name: 'Open Three rockets' }));

      expect(await screen.findByRole('dialog', { name: 'Three rockets' })).toBeVisible();
      expect(missionList()).toBeVisible();
    });
  });

  describe('leaving without a choice', () => {
    it('puts the visitor back where they were when the list closes', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });
      const missionName = screen.getByRole('button', { name: /all missions$/ });
      await user.click(missionName);
      expect(document.title).toBe('Mission to the Moon');

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog', { name: 'All missions' })).not.toBeInTheDocument();
      expect(document.title).toBe('Apollo 11 · Mission to the Moon');
      expect(missionName).toHaveFocus();
    });
  });
});
