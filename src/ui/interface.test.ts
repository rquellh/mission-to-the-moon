/**
 * The whole interface, mounted the way the site mounts it, for real
 * missions: what a visitor sees first, and how the parts work together (the
 * card and the clock, the tour and the card's doors, the mission list and
 * the clock). Each part's details have their own file beside its module.
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
      // The mission's own pages open from the end of "Tell me more", not from the header.
      expect(screen.queryByRole('button', { name: 'About this mission' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Sources and credits' })).not.toBeInTheDocument();
    });

    it('keeps the story of the moment on screen, with both doors closed', async () => {
      await mountMission('apollo-11', { start: 'explore' });

      const card = screen.getByRole('region', { name: 'What is happening' });
      expect(within(card).getByRole('article', { name: 'Liftoff' })).toBeVisible();
      expect(within(card).getByRole('button', { name: 'Tell me more' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      expect(within(card).getByRole('button', { name: 'Controls' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      expect(screen.queryByRole('region', { name: 'Timeline' })).not.toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'Look at' })).not.toBeInTheDocument();
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
      const story = screen.getByRole('article', { name: 'Liftoff' });
      expect(within(story).getByText('Launch · Day 1 · July 16, 1969')).toBeVisible();
    });

    it('moves the card along with the clock', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });
      await user.click(screen.getByRole('button', { name: 'Controls' }));

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
      expect(screen.queryByRole('button', { name: 'Controls' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Next event' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Previous event' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tell me more' })).toBeEnabled();
    });

    it('holds the card on the stop just left until the clock reaches the next, not each event it passes', async () => {
      const { user, frames } = await mountMission('apollo-11', { start: 'tour' });
      const card = screen.getByRole('region', { name: 'What is happening' });

      await user.click(screen.getByRole('button', { name: 'Next' }));
      frames.advance(3);

      expect(screen.getByRole('region', { name: 'Guided tour' })).toHaveTextContent(
        'On the way to Stop 2 of 12',
      );
      // The card never names a moment the clock has not reached, and the events passed on
      // the way go by too quickly to read, so it does not show them either.
      expect(within(card).getByRole('heading', { level: 3, name: 'Liftoff' })).toBeInTheDocument();
      expect(
        within(card).queryByRole('heading', { name: 'First stage separates' }),
      ).not.toBeInTheDocument();

      frames.advance(16);

      expect(
        within(card).getByRole('heading', { level: 3, name: 'Burn toward the Moon' }),
      ).toBeInTheDocument();
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
      const { user, director } = await mountMission('apollo-11', { start: 'explore' });
      await user.click(screen.getByRole('button', { name: 'Controls' }));
      expect(screen.getByText('Fast forward')).not.toBeVisible();

      director.setFastForward(true);
      expect(screen.getByText('Fast forward')).toBeVisible();

      director.setFastForward(false);
      expect(screen.getByText('Fast forward')).not.toBeVisible();
    });

    // On the screen a dot stands between "Fast forward" and the count; screen readers skip it.
    it('says "Fast forward" alone until the ship has really gone all the way around once', async () => {
      const { user, director } = await mountMission('apollo-11', { start: 'explore' });
      await user.click(screen.getByRole('button', { name: 'Controls' }));

      director.setFastForward(true);
      director.setFastForwardLaps(0.9);

      expect(screen.getByText('Fast forward')).toBeVisible();
      expect(screen.getByText('Fast forward')).toHaveTextContent(/^Fast forward$/);
    });

    it('counts the orbits the ship really flies, in whole orbits', async () => {
      const { user, director } = await mountMission('apollo-11', { start: 'explore' });
      await user.click(screen.getByRole('button', { name: 'Controls' }));
      director.setFastForward(true);

      director.setFastForwardLaps(1);
      expect(screen.getByText('Fast forward')).toHaveTextContent(/^Fast forward 1 orbit$/);
      expect(screen.getByText('1 orbit')).toBeVisible();

      director.setFastForwardLaps(1.8);
      expect(screen.getByText('Fast forward')).toHaveTextContent(/^Fast forward 1 orbit$/);

      director.setFastForwardLaps(2.1);
      expect(screen.getByText('Fast forward')).toHaveTextContent(/^Fast forward 2 orbits$/);

      director.setFastForwardLaps(12.95);
      expect(screen.getByText('Fast forward')).toHaveTextContent(/^Fast forward 12 orbits$/);
    });

    it('hides the count with fast forward, and starts the next one without it', async () => {
      const { user, director } = await mountMission('apollo-11', { start: 'explore' });
      await user.click(screen.getByRole('button', { name: 'Controls' }));
      director.setFastForward(true);
      director.setFastForwardLaps(3.4);
      expect(screen.getByText('3 orbits')).toBeVisible();

      director.setFastForward(false);

      expect(screen.getByText('Fast forward')).not.toBeVisible();
      expect(screen.getByText('Fast forward')).toHaveTextContent(/^Fast forward$/);

      director.setFastForward(true);

      expect(screen.getByText('Fast forward')).toBeVisible();
      expect(screen.getByText('Fast forward')).toHaveTextContent(/^Fast forward$/);
    });

    it('explains itself to a visitor who points at it', async () => {
      const { user, director } = await mountMission('apollo-11', { start: 'explore' });
      await user.click(screen.getByRole('button', { name: 'Controls' }));

      director.setFastForward(true);

      expect(screen.getByText('Fast forward')).toHaveAttribute(
        'title',
        'The clock is running fast. The ship is shown gliding slowly around its orbit, not where it really is. The count shows how many times it has really gone around.',
      );
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
      expect(screen.queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Controls' }));
      expect(screen.getByRole('region', { name: 'Timeline' })).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Earth' })).not.toBeInTheDocument();

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
      await user.click(screen.getByRole('button', { name: 'Controls' }));

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

    it('says where the tour is going as it sets off, and the stop as its card appears', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const { user, frames } = await mountMission('gemini-3', { start: 'tour' });
      settle(frames);

      await user.click(screen.getByRole('button', { name: 'Next' }));
      settle(frames);

      expect(
        screen.getByText('On the way to stop 2 of 6: The first orbit change.'),
      ).toHaveAttribute('aria-live', 'polite');

      frames.advance(16);
      settle(frames);

      expect(screen.getByText('Stop 2 of 6: The first orbit change.')).toHaveAttribute(
        'aria-live',
        'polite',
      );
    });

    it('explains fast forward once, not on every lap', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const { user, director, frames } = await mountMission('apollo-11', { start: 'explore' });
      await user.click(screen.getByRole('button', { name: 'Controls' }));
      director.setFastForward(true);
      settle(frames);
      expect(screen.getByText(copy.timeline.fastForwardSpoken)).toBeInTheDocument();

      director.setFastForward(false);
      await user.click(screen.getByRole('button', { name: 'Next event' }));
      director.setFastForward(true);
      settle(frames);

      expect(screen.queryByText(copy.timeline.fastForwardSpoken)).not.toBeInTheDocument();
    });

    it('says why the ship glides slowly, and never reads out the count as it goes up', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const { user, director, frames } = await mountMission('apollo-11', { start: 'explore' });
      await user.click(screen.getByRole('button', { name: 'Controls' }));
      director.setFastForward(true);
      settle(frames);
      expect(
        screen.getByText(
          'Fast forward. The clock is running fast. The ship is shown gliding slowly around its orbit, and its path shows as a ring.',
        ),
      ).toHaveAttribute('aria-live', 'polite');

      director.setFastForwardLaps(1);
      settle(frames);
      director.setFastForwardLaps(2);
      settle(frames);

      // The announcer still holds the explanation, and the count is in no live region of its own.
      expect(screen.getByText(copy.timeline.fastForwardSpoken)).toHaveAttribute(
        'aria-live',
        'polite',
      );
      expect(screen.getByText('2 orbits').closest('[aria-live], [role="status"]')).toBeNull();
    });
  });
});
