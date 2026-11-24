/**
 * The event card: what it shows for an event (title, time, text, photo,
 * recording, sources, "Try it"), and stepping from event to event.
 */
import { describe, expect, it } from 'vitest';
import type { Mission } from '../content/types.ts';
import { mountMission, screen, within } from '../test/test-utils.ts';

/** Apollo 11 told from its first stage separation, so the clock starts before the first event. */
const withoutLiftoff = (mission: Mission): Mission => ({
  ...mission,
  events: mission.events.filter((event) => event.id !== 'liftoff'),
});

/** Apollo 11 with nothing more to tell about its first stage separation. */
const withoutMoreOnStaging = (mission: Mission): Mission => ({
  ...mission,
  events: mission.events.map((event) =>
    event.id === 'first-stage-separation' ? { ...event, text: { short: event.text.short } } : event,
  ),
});

/** Apollo 11 with a "Try it" on its launch pointing at an extra the list does not show (a draft). */
const unlistedExtraOnLiftoff = (mission: Mission): Mission => ({
  ...mission,
  events: mission.events.map((event) =>
    event.id === 'liftoff' ? { ...event, handsOn: 'not-listed' } : event,
  ),
});

describe('the event card', () => {
  describe('rendering', () => {
    it("shows the event's title, mission time, date, and text", async () => {
      await mountMission('apollo-11', { event: 'landing' });

      const card = screen.getByRole('article');
      expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent(
        'The Eagle has landed',
      );
      expect(card).toHaveTextContent('102:45:39 after liftoff');
      expect(within(card).getByText('July 20, 1969, 20:17:39 UTC')).toBeInTheDocument();
      expect(card).toHaveTextContent('Armstrong flies Eagle past a crater full of boulders');
    });

    it('counts down to liftoff for an event before it', async () => {
      await mountMission('gemini-8', { start: 'explore' });

      const card = screen.getByRole('article');
      expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent(
        'The target launches',
      );
      expect(card).toHaveTextContent('−01:40:59 before liftoff');
      expect(within(card).getByText('March 16, 1966, 15:00:03 UTC')).toBeInTheDocument();
    });

    it('shows what the mission is before its first event', async () => {
      await mountMission('apollo-11', { story: withoutLiftoff });

      const card = screen.getByRole('article');
      expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent('Apollo 11');
      expect(card).toHaveTextContent('July 16–24, 1969');
      expect(card).toHaveTextContent('Apollo 11 was the first mission to land people on the Moon.');
      expect(within(card).queryByRole('button', { name: 'Tell me more' })).not.toBeInTheDocument();
    });
  });

  describe('stepping', () => {
    it('steps to the next and previous events', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });
      const card = screen.getByRole('article');
      expect(within(card).getByRole('button', { name: 'Previous event' })).toBeDisabled();

      await user.click(within(card).getByRole('button', { name: 'Next event' }));
      expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent(
        'First stage separates',
      );
      expect(within(card).getByRole('button', { name: 'Previous event' })).toBeEnabled();

      await user.click(within(card).getByRole('button', { name: 'Previous event' }));
      expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent('Liftoff');
    });

    it('stops at the last event and keeps keyboard focus on a button that still works', async () => {
      const { user } = await mountMission('apollo-11', { event: 'parachutes' });
      const card = screen.getByRole('article');

      await user.click(within(card).getByRole('button', { name: 'Next event' }));

      expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent('Splashdown');
      expect(within(card).getByRole('button', { name: 'Next event' })).toBeDisabled();
      expect(within(card).getByRole('button', { name: 'Previous event' })).toHaveFocus();
    });
  });

  describe('tell me more', () => {
    it('opens the fuller text, and keeps it open on the next event', async () => {
      const { user } = await mountMission('apollo-11', { event: 'landing' });
      const card = screen.getByRole('article');
      const toggle = within(card).getByRole('button', { name: 'Tell me more' });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(within(card).getByText(/^Eagle touched down at 4:17:39 p\.m\. EDT/)).not.toBeVisible();

      await user.click(toggle);
      expect(toggle).toHaveAccessibleName('Show less');
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(within(card).getByText(/^Eagle touched down at 4:17:39 p\.m\. EDT/)).toBeVisible();

      await user.click(within(card).getByRole('button', { name: 'Next event' }));
      expect(within(card).getByText(/^Armstrong's left foot touched the surface/)).toBeVisible();
      expect(within(card).getByRole('button', { name: 'Show less' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });

    it('is not offered when an event has nothing more to tell', async () => {
      await mountMission('apollo-11', {
        story: withoutMoreOnStaging,
        event: 'first-stage-separation',
      });

      const card = screen.getByRole('article');
      expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent(
        'First stage separates',
      );
      expect(within(card).queryByRole('button', { name: 'Tell me more' })).not.toBeInTheDocument();
    });
  });

  describe('photo', () => {
    it("shows the event's photo with its credit, and none on an event without one", async () => {
      const { user } = await mountMission('apollo-11', { event: 'landing' });
      const card = screen.getByRole('article');

      const photo = within(card).getByRole('figure');
      expect(within(photo).getByRole('img')).toHaveAccessibleName(
        /^The flat, gray surface of the Moon/,
      );
      expect(photo).toHaveTextContent('Photo: NASA.');
      expect(within(photo).getByRole('link', { name: /^Original/ })).toHaveAttribute(
        'href',
        'https://images.nasa.gov/details/as11-37-5458',
      );

      await user.click(within(card).getByRole('button', { name: 'Previous event' }));

      expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent('Computer alarms');
      expect(within(card).queryByRole('figure')).not.toBeInTheDocument();
    });
  });

  describe('sources', () => {
    it('folds the sources away under their count, with any disagreement inside', async () => {
      const { user } = await mountMission('apollo-11', { event: 'landing' });
      const card = screen.getByRole('article');
      const sources = within(card).getByRole('group');
      expect(within(sources).getByText('Sources (7)')).toBeVisible();
      expect(within(sources).getByText('Sources differ.')).not.toBeVisible();

      await user.click(within(sources).getByText('Sources (7)'));

      expect(within(sources).getByText('Sources differ.')).toBeVisible();
      expect(
        within(sources).getByText(/NSSDCA gives the landing time as 20:17:40 UT/),
      ).toBeVisible();
      expect(
        within(sources).getByRole('link', {
          name: /^Apollo 11 Timeline, row "LM lunar landing\."/,
        }),
      ).toBeVisible();
      // The note sits with the sources, never in the story.
      expect(within(card).getAllByText(/NSSDCA gives the landing time/)).toHaveLength(1);
    });
  });

  describe('try it', () => {
    it("offers an event's hands-on extra, and only on that event", async () => {
      const { user } = await mountMission('gemini-8', { event: 'liftoff' });
      const card = screen.getByRole('article');
      expect(within(card).getByRole('button', { name: 'Try it: Drop the stages' })).toBeVisible();

      await user.click(within(card).getByRole('button', { name: 'Next event' }));

      expect(within(card).queryByRole('button', { name: /^Try it/ })).not.toBeInTheDocument();
    });

    it('opens the extra for this moment of this mission', async () => {
      const { user } = await mountMission('gemini-8', { event: 'docking' });

      await user.click(screen.getByRole('button', { name: 'Try it: Dock two spacecraft' }));

      const sheet = screen.getByRole('dialog', { name: 'Dock two spacecraft' });
      expect(within(sheet).getByText('Dock two spacecraft for gemini-8')).toBeInTheDocument();
    });

    it('is not offered for an extra the list leaves out', async () => {
      await mountMission('apollo-11', { story: unlistedExtraOnLiftoff, start: 'explore' });

      expect(
        within(screen.getByRole('article')).queryByRole('button', { name: /^Try it/ }),
      ).not.toBeInTheDocument();
    });
  });

  describe('recording', () => {
    it('has a recording player, with the words written out, only on an event with a recording', async () => {
      const { user } = await mountMission('apollo-11', { event: 'landing' });
      const card = screen.getByRole('article');

      const recording = within(card).getByRole('region', { name: 'Recording' });
      expect(
        within(recording).getByRole('button', { name: 'Play the recording, 15 seconds' }),
      ).toBeInTheDocument();
      const words = within(recording).getByRole('list', { name: 'What they said' });
      expect(within(words).getAllByRole('listitem')[0]).toHaveTextContent(
        'Neil Armstrong: Houston, Tranquility Base here. The Eagle has landed.',
      );

      await user.click(within(card).getByRole('button', { name: 'Previous event' }));

      expect(within(card).queryByRole('region', { name: 'Recording' })).not.toBeInTheDocument();
    });
  });
});
