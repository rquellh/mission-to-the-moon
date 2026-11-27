/**
 * The moment card: the story of the moment on the clock (its chapter, day,
 * and date, its title, and its short text in full), what sits beside it
 * (the photo's small picture, "Listen", the "Tell me more" door, "Try
 * it"), and where the flight is beside Play while "Tell me more" is open.
 * What "Tell me more" holds is in records.test.ts, and the tools behind
 * Controls in timeline.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { story as apollo11 } from '../content/missions/apollo-11/story.ts';
import type { Mission } from '../content/types.ts';
import { mountMission, screen, within } from '../test/test-utils.ts';

/** Apollo 11 told from its first stage separation, so the clock starts before the first event. */
const withoutLiftoff = (mission: Mission): Mission => ({
  ...mission,
  events: mission.events.filter((event) => event.id !== 'liftoff'),
});

/** Apollo 11 with nothing more to tell about its first stage separation (no real event has only its sources). */
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

const theCard = (): HTMLElement => screen.getByRole('region', { name: 'What is happening' });
const theStory = (): HTMLElement => within(theCard()).getByRole('article');

describe('the moment card', () => {
  describe('rendering', () => {
    it('tells the moment: its chapter, day, and date, its title, and its whole short text', async () => {
      await mountMission('apollo-11', { event: 'landing' });

      const story = theStory();
      expect(story).toHaveAccessibleName('The Eagle has landed');
      expect(within(story).getByText('Landing · Day 5 · July 20, 1969')).toBeVisible();
      expect(within(story).getByRole('heading', { level: 3 })).toHaveTextContent(
        'The Eagle has landed',
      );
      const landing = apollo11.events.find((event) => event.id === 'landing');
      // The short text in full, never cut down to fit.
      expect(within(story).getByText(landing?.text.short ?? 'missing')).toHaveTextContent(
        "Armstrong flies Eagle past a crater full of boulders and lands on the Moon's Sea of Tranquility. People have landed on the Moon for the first time.",
      );
    });

    it('offers the photo, the recording, and more on a moment that has them, with the photo credited', async () => {
      await mountMission('apollo-11', { event: 'landing' });

      const card = theCard();
      expect(within(card).getByRole('button', { name: 'See the photo' })).toBeVisible();
      expect(within(card).getByText('Photo: NASA')).toBeVisible();
      // A short word on the card; its spoken name says what it plays, and for how long.
      expect(
        within(card).getByRole('button', { name: 'Listen to the recording, 15 seconds' }),
      ).toHaveTextContent('Listen0:15');
      expect(within(card).getByRole('button', { name: 'Tell me more' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      expect(within(card).getByRole('button', { name: 'Controls' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });

    it('leaves out the photo and the recording on a moment with neither', async () => {
      await mountMission('apollo-11', { event: 'translunar-injection' });

      const card = theCard();
      expect(within(theStory()).getByText('Earth orbit · Day 1 · July 16, 1969')).toBeVisible();
      expect(within(card).queryByRole('button', { name: 'See the photo' })).not.toBeInTheDocument();
      expect(within(card).queryByText(/^Photo:/)).not.toBeInTheDocument();
      expect(
        within(card).queryByRole('button', { name: /^Listen to the recording/ }),
      ).not.toBeInTheDocument();
      expect(within(card).getByRole('button', { name: 'Tell me more' })).toBeVisible();
    });

    it('names the door Sources when the moment has nothing more than its sources', async () => {
      await mountMission('apollo-11', {
        story: withoutMoreOnStaging,
        event: 'first-stage-separation',
      });

      const door = within(theCard()).getByRole('button', { name: 'Sources' });
      expect(door).toHaveAttribute('aria-expanded', 'false');
      expect(
        within(theCard()).queryByRole('button', { name: 'Tell me more' }),
      ).not.toBeInTheDocument();
    });

    it('shows what the mission is before its first event', async () => {
      await mountMission('apollo-11', { story: withoutLiftoff });

      const story = theStory();
      expect(within(story).getByText('July 16–24, 1969')).toBeVisible();
      expect(within(story).getByRole('heading', { level: 3 })).toHaveTextContent('Apollo 11');
      expect(story).toHaveTextContent(
        'Apollo 11 was the first mission to land people on the Moon.',
      );
      expect(within(theCard()).getByRole('button', { name: 'Tell me more' })).toBeVisible();
    });

    it('leaves the day out before liftoff, and on a flight too short to count days', async () => {
      await mountMission('gemini-8', { start: 'explore' });

      const story = theStory();
      expect(within(story).getByRole('heading', { level: 3 })).toHaveTextContent(
        'The target launches',
      );
      expect(within(story).getByText('The target · March 16, 1966')).toBeVisible();
    });
  });

  describe('where the flight is', () => {
    it.each([
      ['on a phone', false],
      ['on a wide screen', true],
    ])(
      'leaves the chapter and the day to the story %s, rather than saying them again beside Play',
      async (_layout, wide) => {
        await mountMission('apollo-11', { event: 'landing', wide });

        expect(within(theStory()).getByText('Landing · Day 5 · July 20, 1969')).toBeVisible();
        expect(
          within(theCard()).queryByRole('group', { name: 'Where the flight is' }),
        ).not.toBeInTheDocument();
      },
    );

    it('says the chapter and the day beside Play while "Tell me more" has the story\'s place', async () => {
      const { user } = await mountMission('apollo-11', { event: 'landing' });

      await user.click(within(theCard()).getByRole('button', { name: 'Tell me more' }));

      const where = within(theCard()).getByRole('group', { name: 'Where the flight is' });
      expect(within(where).getByText('Landing')).toBeVisible();
      expect(within(where).getByText('Day 5 of 9')).toBeVisible();

      await user.click(screen.getByRole('button', { name: 'Show less' }));

      expect(
        within(theCard()).queryByRole('group', { name: 'Where the flight is' }),
      ).not.toBeInTheDocument();
    });

    it('keeps the chapter and the day beside Play with Controls open on a wide screen, where the clock is among the tools', async () => {
      const { user } = await mountMission('apollo-11', { event: 'landing', wide: true });
      await user.click(within(theCard()).getByRole('button', { name: 'Tell me more' }));

      await user.click(within(theCard()).getByRole('button', { name: 'Controls' }));

      const where = within(theCard()).getByRole('group', { name: 'Where the flight is' });
      expect(within(where).getByText('Landing')).toBeVisible();
      expect(within(where).getByText('Day 5 of 9')).toBeVisible();
      const timeline = screen.getByRole('region', { name: 'Timeline' });
      expect(within(timeline).getByText('102:45:39')).toBeVisible();
    });

    it('leaves out the day on a flight too short to count days', async () => {
      const { user } = await mountMission('gemini-3', { start: 'explore' });

      await user.click(within(theCard()).getByRole('button', { name: 'Tell me more' }));

      const where = within(theCard()).getByRole('group', { name: 'Where the flight is' });
      expect(within(where).getByText('Launch')).toBeVisible();
      expect(where).not.toHaveTextContent(/Day \d/);
    });
  });

  describe('the photo', () => {
    it('opens "Tell me more" at the photo when its small picture is pressed', async () => {
      const { user } = await mountMission('apollo-11', { event: 'landing' });

      await user.click(within(theCard()).getByRole('button', { name: 'See the photo' }));

      const records = screen.getByRole('region', { name: 'The Eagle has landed' });
      expect(within(records).getByRole('heading', { level: 3 })).toHaveFocus();
      expect(within(theCard()).getByRole('button', { name: 'Tell me more' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      expect(within(records).getByRole('figure')).toBeVisible();
    });
  });

  describe('try it', () => {
    it("offers an event's hands-on extra, and only on that event", async () => {
      const { user } = await mountMission('gemini-8', { event: 'liftoff' });
      expect(
        within(theCard()).getByRole('button', { name: 'Try it: Drop the stages' }),
      ).toBeVisible();
      await user.click(screen.getByRole('button', { name: 'Controls' }));

      await user.click(screen.getByRole('button', { name: 'Next event' }));

      expect(within(theCard()).queryByRole('button', { name: /^Try it/ })).not.toBeInTheDocument();
    });

    it('opens the extra for this moment of this mission', async () => {
      const { user } = await mountMission('gemini-8', { event: 'docking' });

      await user.click(
        within(theCard()).getByRole('button', { name: 'Try it: Dock two spacecraft' }),
      );

      const sheet = screen.getByRole('dialog', { name: 'Dock two spacecraft' });
      expect(within(sheet).getByText('Dock two spacecraft for gemini-8')).toBeInTheDocument();
    });

    it('is not offered for an extra the list leaves out', async () => {
      await mountMission('apollo-11', { story: unlistedExtraOnLiftoff, start: 'explore' });

      expect(within(theCard()).queryByRole('button', { name: /^Try it/ })).not.toBeInTheDocument();
    });
  });
});
