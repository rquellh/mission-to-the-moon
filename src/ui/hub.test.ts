/**
 * The mission list: the welcome, and reopened from the mission's name. How
 * it is grouped and marked, what choosing an entry does, and the ways out.
 */
import { describe, expect, it } from 'vitest';
import { mountMission, navigation, screen, visitedMissions, within } from '../test/test-utils.ts';
import type { MissionSummary } from '../content/types.ts';

/** The real list, with Gemini 7 as a flight that has no tour (every real flight has one). */
const gemini7WithoutATour = (summaries: readonly MissionSummary[]): MissionSummary[] =>
  summaries.map((summary) => (summary.id === 'gemini-7' ? { ...summary, hasTour: false } : summary));

const missionList = (): HTMLElement => screen.getByRole('dialog', { name: 'Mission to the Moon' });

const namesIn = (section: HTMLElement): Array<string | null> =>
  within(section)
    .getAllByRole('heading', { level: 4 })
    .map((heading) => heading.textContent);

describe('the mission list', () => {
  describe('rendering', () => {
    it('groups the missions by program, in date order, with the years each program flew', async () => {
      await mountMission('apollo-11');
      const list = missionList();

      const gemini = within(list).getByRole('region', { name: /^Gemini/ });
      expect(within(gemini).getByRole('heading', { level: 3 })).toHaveTextContent('Gemini 1965–1966');
      expect(namesIn(gemini).slice(0, 6)).toEqual(['Gemini 3', 'Gemini 4', 'Gemini 5', 'Gemini 7', 'Gemini 6A', 'Gemini 8']);
      const apollo = within(list).getByRole('region', { name: /^Apollo/ });
      expect(within(apollo).getByRole('heading', { level: 3 })).toHaveTextContent('Apollo 1967–1972');
      expect(namesIn(apollo)[0]).toBe('Apollo 1');
    });

    it('says what the list is for, and who is remembered in it', async () => {
      await mountMission('apollo-11');

      expect(missionList()).toHaveAccessibleDescription(
        'Choose a flight and ride along in 3D, from liftoff to splashdown. Apollo 1 is remembered here too.',
      );
    });

    it('marks the mission on show', async () => {
      await mountMission('apollo-11');

      const showing = within(missionList()).getByRole('listitem', { current: true });
      expect(within(showing).getByRole('heading', { level: 4 })).toHaveTextContent('Apollo 11 Now showing');
    });

    it('offers Read for the memorial, and the tour only on a flight that has one', async () => {
      await mountMission('apollo-11', { missionList: gemini7WithoutATour });
      const list = missionList();

      expect(within(list).getByRole('button', { name: 'Read about Apollo 1' })).toBeInTheDocument();
      expect(within(list).queryByRole('button', { name: 'Explore Apollo 1' })).not.toBeInTheDocument();
      expect(within(list).getByRole('button', { name: 'Explore Gemini 7' })).toBeInTheDocument();
      expect(within(list).queryByRole('button', { name: 'Take the tour of Gemini 7' })).not.toBeInTheDocument();
      expect(within(list).getByRole('button', { name: 'Take the tour of Gemini 6A' })).toBeInTheDocument();
    });

    it('marks an unfinished mission as a draft', async () => {
      await mountMission('apollo-11', { isDraft: (summary) => summary.id === 'apollo-17' });

      expect(within(missionList()).getByRole('heading', { level: 4, name: 'Apollo 17 Draft' })).toBeInTheDocument();
      expect(within(missionList()).getByRole('heading', { level: 4, name: 'Apollo 16' })).toBeInTheDocument();
    });

    it('lists the extras in two groups under the missions', async () => {
      await mountMission('apollo-11');
      const list = missionList();

      expect(namesIn(within(list).getByRole('region', { name: 'Try it yourself' }))).toEqual([
        'Drop the stages',
        'Dock two spacecraft',
      ]);
      expect(namesIn(within(list).getByRole('region', { name: 'More to explore' }))).toEqual([
        'Mission patches',
        'Six landings on the Moon',
        'Three rockets',
      ]);
    });
  });

  describe('choosing', () => {
    it('starts the tour of the mission on show, in place', async () => {
      const { user } = await mountMission('apollo-11');

      await user.click(screen.getByRole('button', { name: 'Take the tour of Apollo 11' }));

      expect(screen.queryByRole('dialog', { name: 'Mission to the Moon' })).not.toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Guided tour' })).toHaveTextContent('Stop 1 of 12');
      expect(navigation.address).toBeNull();
    });

    it("opens another mission at its own address, starting the way chosen", async () => {
      const { user } = await mountMission('apollo-11');

      await user.click(screen.getByRole('button', { name: 'Take the tour of Gemini 8' }));
      expect(navigation.address).toBe('http://localhost:3000/?mission=gemini-8&start=tour');

      await user.click(screen.getByRole('button', { name: 'Explore Apollo 17' }));
      expect(navigation.address).toBe('http://localhost:3000/?mission=apollo-17&start=explore');
    });

    it('opens the memorial page over the list', async () => {
      const { user } = await mountMission('apollo-11');

      await user.click(screen.getByRole('button', { name: 'Read about Apollo 1' }));

      expect(await screen.findByRole('dialog', { name: 'Apollo 1' })).toBeVisible();
      expect(missionList()).toBeVisible();
    });

    it('opens an extra over the list', async () => {
      const { user } = await mountMission('apollo-11');

      await user.click(screen.getByRole('button', { name: 'Open Three rockets' }));

      expect(await screen.findByRole('dialog', { name: 'Three rockets' })).toBeVisible();
      expect(missionList()).toBeVisible();
    });
  });

  describe('leaving without a choice', () => {
    it('starts exploring when the welcome is closed with Escape', async () => {
      const { user } = await mountMission('apollo-11');

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog', { name: 'Mission to the Moon' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Play' })).toHaveFocus();
      expect(visitedMissions()).toEqual(['apollo-11']);
    });

    it('puts the visitor back where they were when the reopened list closes', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });
      const missionName = screen.getByRole('button', { name: /all missions$/ });
      await user.click(missionName);
      expect(document.title).toBe('Mission to the Moon');

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog', { name: 'Mission to the Moon' })).not.toBeInTheDocument();
      expect(document.title).toBe('Apollo 11 · Mission to the Moon');
      expect(missionName).toHaveFocus();
    });
  });
});
