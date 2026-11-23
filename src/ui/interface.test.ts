/**
 * The whole interface, mounted the way the site mounts it, for real
 * missions: what a visitor sees first, and how the parts work together (the
 * card and the clock, the tour and the timeline, the mission list and the
 * clock). Each part's details have their own file beside its module.
 */
import { describe, expect, it, vi } from 'vitest';
import { copy } from '../content/copy.ts';
import {
  mountMission,
  navigation,
  screen,
  visitedMissions,
  within,
  type Frames,
} from '../test/test-utils.ts';

describe('the mission interface', () => {
  describe('rendering', () => {
    it('names the mission in the tab title and the masthead', async () => {
      await mountMission('apollo-11', { start: 'explore' });

      expect(document.title).toBe('Apollo 11 · Mission to the Moon');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mission to the Moon');
      const missionName = screen.getByRole('heading', { level: 2, name: /^Apollo 11/ });
      expect(within(missionName).getByRole('button', { name: /all missions$/ })).toHaveTextContent(
        'Apollo 11 July 16–24, 1969',
      );
      expect(screen.getByRole('button', { name: 'About this mission' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sources and credits' })).toBeInTheDocument();
    });

    it('welcomes the visitor with the mission on show, and keeps the rest back until they choose', async () => {
      await mountMission('apollo-11');

      const welcome = screen.getByRole('region', { name: 'Ride along on Apollo 11' });
      expect(welcome).toBeVisible();
      expect(
        within(welcome).getByRole('heading', { level: 2, name: 'Ride along on Apollo 11' }),
      ).toHaveFocus();
      expect(document.body).toHaveClass('is-welcome');
      expect(document.title).toBe('Mission to the Moon');
    });
  });

  describe('exploring', () => {
    it('starts at the first event with Play ready to press', async () => {
      const { user } = await mountMission('apollo-11');

      await user.click(screen.getByRole('button', { name: 'Explore on my own' }));

      expect(screen.getByRole('button', { name: 'Play' })).toHaveFocus();
      const timeline = screen.getByRole('region', { name: 'Timeline' });
      expect(within(timeline).getByText('00:00:00')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Liftoff' })).toBeInTheDocument();
    });

    it('moves the card along with the clock', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });

      await user.click(screen.getByRole('slider', { name: 'Mission time' }));
      await user.keyboard('{PageUp}');

      expect(
        screen.getByRole('heading', { level: 3, name: 'First stage separates' }),
      ).toBeInTheDocument();
    });

    it('pauses the clock while the mission list is open, and plays on when it closes', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });
      await user.click(screen.getByRole('button', { name: 'Play' }));

      await user.click(screen.getByRole('button', { name: /all missions$/ }));

      expect(screen.getByRole('dialog', { name: 'All missions' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Close' }));

      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    });
  });

  describe('touring', () => {
    it('hands the page to the tour', async () => {
      await mountMission('apollo-11', { start: 'tour' });

      expect(document.body).toHaveClass('is-touring');
      expect(screen.getByRole('region', { name: 'Guided tour' })).toHaveTextContent('Stop 1 of 12');
      expect(screen.getByRole('region', { name: 'Timeline' })).toHaveAttribute(
        'title',
        'The timeline follows the tour. Exit the tour to use it.',
      );
      expect(screen.queryByRole('button', { name: 'Next event' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Previous event' })).not.toBeInTheDocument();
    });

    it('holds the card on the stop it is heading for, not each event it passes', async () => {
      const { user, frames } = await mountMission('apollo-11', { start: 'tour' });

      await user.click(screen.getByRole('button', { name: 'Next' }));
      frames.advance(3);

      expect(screen.getByRole('region', { name: 'Guided tour' })).toHaveTextContent('On the way…');
      expect(
        screen.getByRole('heading', { level: 3, name: 'Burn toward the Moon' }),
      ).toBeInTheDocument();
      expect(
        within(screen.getByRole('region', { name: 'Timeline' })).queryByText('02:44:16'),
      ).not.toBeInTheDocument();
    });

    it('notes the visit on this device once, however often it starts', async () => {
      const { user } = await mountMission('apollo-11', { start: 'tour' });
      await user.click(screen.getByRole('button', { name: /all missions$/ }));

      await user.click(screen.getByRole('button', { name: 'Explore Apollo 11' }));

      expect(visitedMissions()).toEqual(['apollo-11']);
    });
  });

  describe('fast forward', () => {
    it('shows "Fast forward" by the clock while the scene is in its fast-forward view', async () => {
      const { director } = await mountMission('apollo-11', { start: 'explore' });
      expect(screen.getByText('Fast forward')).not.toBeVisible();

      director.setFastForward(true);
      expect(screen.getByText('Fast forward')).toBeVisible();

      director.setFastForward(false);
      expect(screen.getByText('Fast forward')).not.toBeVisible();
    });
  });

  describe('without a 3D view', () => {
    it('shows the note in its place, leaves out the view buttons, and says so in the mission list', async () => {
      const { user } = await mountMission('gemini-8', {
        no3D: { note: copy.errors.noWebGL, offerReload: false },
        start: 'explore',
      });

      // The welcome says it too, but it has gone by now.
      const [inPlace, onTheWelcome] = screen.getAllByText(copy.errors.noWebGL);
      expect(inPlace).toBeVisible();
      expect(onTheWelcome).not.toBeVisible();
      expect(screen.queryByRole('button', { name: 'Earth' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /all missions$/ }));

      expect(screen.getByRole('dialog', { name: 'All missions' })).toHaveAccessibleDescription(
        /^Choose a flight and follow it, from liftoff to splashdown\. This browser can’t show the 3D view/,
      );
    });

    it('offers Reload when the 3D view may load next time', async () => {
      const { user } = await mountMission('gemini-8', {
        no3D: { note: copy.errors.scene, offerReload: true },
        start: 'explore',
      });

      await user.click(screen.getByRole('button', { name: 'Reload' }));

      expect(navigation.reloaded).toBe(true);
    });
  });

  // The announcer waits half a second for things to settle, then speaks on the next frame.
  describe('announcements', () => {
    const settle = (frames: Frames): void => {
      vi.advanceTimersByTime(500);
      frames.frame();
    };

    it('says the event and its time once the card stops stepping, and only the latest', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const { user, frames } = await mountMission('apollo-11', { start: 'explore' });

      await user.click(screen.getByRole('button', { name: 'Next event' }));
      await user.click(screen.getByRole('button', { name: 'Next event' }));
      settle(frames);

      expect(
        screen.getByText('In orbit around Earth, 11 minutes after liftoff, day 1 of the flight.'),
      ).toHaveAttribute('aria-live', 'polite');
      expect(screen.queryByText(/^First stage separates,/)).not.toBeInTheDocument();
    });

    it('says when each tour stop is reached, and when the tour ends', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const { user, frames } = await mountMission('gemini-3', { start: 'tour' });
      settle(frames);
      expect(screen.getByText('Stop 1 of 6: Liftoff.')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Exit tour' }));
      settle(frames);

      expect(screen.getByText('Tour ended. You are exploring on your own.')).toBeInTheDocument();
    });

    it('explains fast forward once, not on every lap', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const { user, director, frames } = await mountMission('apollo-11', { start: 'explore' });
      director.setFastForward(true);
      settle(frames);
      expect(screen.getByText(copy.timeline.fastForwardSpoken)).toBeInTheDocument();

      director.setFastForward(false);
      await user.click(screen.getByRole('button', { name: 'Next event' }));
      director.setFastForward(true);
      settle(frames);

      expect(screen.queryByText(copy.timeline.fastForwardSpoken)).not.toBeInTheDocument();
    });
  });
});
