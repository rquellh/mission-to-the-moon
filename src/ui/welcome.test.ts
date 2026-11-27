/**
 * The welcome, the first thing a visitor sees on a plain address: what it
 * says about the mission on show, the ways in, Escape, "All missions", and
 * what it says without a 3D view. Choosing in the list itself is in
 * hub.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { copy } from '../content/copy.ts';
import type { Mission } from '../content/types.ts';
import { mountMission, navigation, screen, visitedMissions, within } from '../test/test-utils.ts';

/**
 * Apollo 11 with no tour stops (a tour of its key moments, with none
 * marked): every real flight has a tour, so a typed fixture.
 */
const withoutATour = (mission: Mission): Mission => ({
  ...mission,
  tour: 'key-moments',
  events: mission.events.map((event) => ({ ...event, keyMoment: false })),
});

const theWelcome = (missionName: string): HTMLElement =>
  screen.getByRole('region', { name: `Ride along on ${missionName}` });

describe('the welcome', () => {
  describe('rendering', () => {
    it('features the mission on show: its summary, its dates, and the ways in, in order', async () => {
      await mountMission('apollo-11');
      const welcome = theWelcome('Apollo 11');

      expect(within(welcome).getByText('Mission to the Moon')).toBeVisible();
      expect(within(welcome).getByRole('heading', { level: 2 })).toHaveTextContent(
        'Ride along on Apollo 11',
      );
      expect(
        within(welcome).getByText(
          'Apollo 11 was the first mission to land people on the Moon. In July 1969, Neil Armstrong and Buzz Aldrin walked on the Moon while Michael Collins orbited above.',
        ),
      ).toBeVisible();
      expect(within(welcome).getByText('July 16–24, 1969')).toBeVisible();
      const tour = within(welcome).getByRole('button', { name: 'Take the tour' });
      const explore = within(welcome).getByRole('button', { name: 'Explore on my own' });
      const allMissions = within(welcome).getByRole('button', { name: 'All missions' });
      expect(within(welcome).getAllByRole('button')).toEqual([tour, explore, allMissions]);
    });

    it.each([
      ['apollo-11', 'Apollo 11', '25 stops, from liftoff to splashdown'],
      ['gemini-3', 'Gemini 3', '6 stops, from liftoff to splashdown'],
    ])('says how many stops the tour of %s makes', async (id, missionName, stops) => {
      await mountMission(id);

      const tour = within(theWelcome(missionName)).getByRole('button', { name: 'Take the tour' });
      expect(tour).toHaveAccessibleDescription(stops);
      expect(within(tour).getByText(stops)).toBeVisible();
    });

    it('sums up the whole list behind "All missions"', async () => {
      await mountMission('gemini-3');

      const allMissions = within(theWelcome('Gemini 3')).getByRole('button', {
        name: 'All missions',
      });
      expect(allMissions).toHaveAccessibleDescription(
        'Gemini and Apollo, 1965 to 1972, 22 missions',
      );
      expect(within(allMissions).getByText('22')).toBeVisible();
    });

    it('offers only exploring when the mission has no tour', async () => {
      await mountMission('apollo-11', { story: withoutATour });
      const welcome = theWelcome('Apollo 11');

      expect(
        within(welcome).queryByRole('button', { name: 'Take the tour' }),
      ).not.toBeInTheDocument();
      const explore = within(welcome).getByRole('button', { name: 'Explore on my own' });
      const allMissions = within(welcome).getByRole('button', { name: 'All missions' });
      expect(within(welcome).getAllByRole('button')).toEqual([explore, allMissions]);
    });
  });

  describe('choosing', () => {
    it('starts the tour from its first stop when the visitor takes it', async () => {
      const { user } = await mountMission('apollo-11');

      await user.click(screen.getByRole('button', { name: 'Take the tour' }));

      expect(
        screen.queryByRole('region', { name: 'Ride along on Apollo 11' }),
      ).not.toBeInTheDocument();
      expect(document.body).not.toHaveClass('is-welcome');
      expect(screen.getByRole('region', { name: 'Guided tour' })).toHaveTextContent('Stop 1 of 25');
      expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
      expect(document.title).toBe('Apollo 11 · Mission to the Moon');
      expect(visitedMissions()).toEqual(['apollo-11']);
    });

    it('starts exploring, with Play ready to press, when the visitor would rather explore', async () => {
      const { user } = await mountMission('gemini-3');

      await user.click(screen.getByRole('button', { name: 'Explore on my own' }));

      expect(
        screen.queryByRole('region', { name: 'Ride along on Gemini 3' }),
      ).not.toBeInTheDocument();
      expect(document.body).not.toHaveClass('is-welcome');
      expect(document.body).not.toHaveClass('is-touring');
      expect(screen.getByRole('button', { name: 'Play' })).toHaveFocus();
    });
  });

  describe('leaving without a choice', () => {
    it('starts exploring when the welcome is closed with Escape', async () => {
      const { user } = await mountMission('apollo-11');

      await user.keyboard('{Escape}');

      expect(
        screen.queryByRole('region', { name: 'Ride along on Apollo 11' }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Play' })).toHaveFocus();
      expect(visitedMissions()).toEqual(['apollo-11']);
    });
  });

  describe('all missions', () => {
    it('opens the list over the welcome, and comes back to "All missions" when it closes', async () => {
      const { user } = await mountMission('apollo-11');
      const allMissions = screen.getByRole('button', { name: 'All missions' });

      await user.click(allMissions);

      expect(screen.getByRole('dialog', { name: 'All missions' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

      // Escape belongs to the list while it is open, so it closes the list rather than exploring.
      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog', { name: 'All missions' })).not.toBeInTheDocument();
      expect(theWelcome('Apollo 11')).toBeVisible();
      expect(document.body).toHaveClass('is-welcome');
      expect(allMissions).toHaveFocus();
      expect(document.title).toBe('Mission to the Moon');
      expect(visitedMissions()).toBeUndefined();
    });
  });

  describe('without a 3D view', () => {
    it('says so under the dates', async () => {
      await mountMission('gemini-8', { no3D: { note: copy.errors.noWebGL, offerReload: false } });
      const welcome = theWelcome('Gemini 8');

      expect(within(welcome).getByText(copy.errors.noWebGL)).toBeVisible();
      expect(within(welcome).queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument();
    });

    it('offers Reload when the 3D view may load next time', async () => {
      const { user } = await mountMission('gemini-8', {
        no3D: { note: copy.errors.scene, offerReload: true },
      });
      const welcome = theWelcome('Gemini 8');
      expect(within(welcome).getByText(copy.errors.scene)).toBeVisible();

      await user.click(within(welcome).getByRole('button', { name: 'Reload' }));

      expect(navigation.reloaded).toBe(true);
    });
  });
});
