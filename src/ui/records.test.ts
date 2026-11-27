/**
 * "Tell me more": the records of the moment on the card, opened from the
 * card's door. Opening and closing it (focus, Escape, the door's state),
 * what it holds for moments that differ, following the flight, and the
 * mission's own pages at its end. Its recording, shared with the card, is
 * in audio-player.test.ts.
 */
import { describe, expect, it } from 'vitest';
import type { Mission } from '../content/types.ts';
import { mountMission, screen, within, type User } from '../test/test-utils.ts';

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

const theCard = (): HTMLElement => screen.getByRole('region', { name: 'What is happening' });

/** Press the card's door ("Tell me more", or "Sources") and find the records, named by the moment's title. */
async function openRecords(user: User, title: string, door = 'Tell me more'): Promise<HTMLElement> {
  await user.click(within(theCard()).getByRole('button', { name: door }));
  return screen.getByRole('region', { name: title });
}

const partsOf = (records: HTMLElement): Array<string | null> =>
  within(records)
    .getAllByRole('heading', { level: 4 })
    .map((heading) => heading.textContent);

describe('"Tell me more"', () => {
  describe('opening and closing', () => {
    it('opens from its door with focus on its heading, and Close gives focus back to the door', async () => {
      const { user } = await mountMission('apollo-11', { event: 'landing', wide: true });
      const door = within(theCard()).getByRole('button', { name: 'Tell me more' });
      expect(door).toHaveAttribute('aria-controls', 'records');
      expect(
        screen.queryByRole('region', { name: 'The Eagle has landed' }),
      ).not.toBeInTheDocument();

      const records = await openRecords(user, 'The Eagle has landed');

      expect(door).toHaveAttribute('aria-expanded', 'true');
      expect(within(records).getByRole('heading', { level: 3 })).toHaveFocus();

      await user.click(within(records).getByRole('button', { name: 'Close' }));

      expect(
        screen.queryByRole('region', { name: 'The Eagle has landed' }),
      ).not.toBeInTheDocument();
      expect(door).toHaveAttribute('aria-expanded', 'false');
      expect(door).toHaveFocus();
    });

    it('closes with Escape while focus is inside it', async () => {
      const { user } = await mountMission('apollo-11', { event: 'landing' });
      await openRecords(user, 'The Eagle has landed');

      await user.keyboard('{Escape}');

      expect(
        screen.queryByRole('region', { name: 'The Eagle has landed' }),
      ).not.toBeInTheDocument();
      expect(within(theCard()).getByRole('button', { name: 'Tell me more' })).toHaveFocus();
    });

    it('folds back into the card with "Show less" on a phone', async () => {
      const { user } = await mountMission('apollo-11', { event: 'landing' });
      const records = await openRecords(user, 'The Eagle has landed');

      await user.click(within(records).getByRole('button', { name: 'Show less' }));

      expect(
        screen.queryByRole('region', { name: 'The Eagle has landed' }),
      ).not.toBeInTheDocument();
      expect(within(theCard()).getByRole('button', { name: 'Tell me more' })).toHaveFocus();
    });

    it('stays open as the flight moves on, and always shows the moment on the card', async () => {
      const { user } = await mountMission('apollo-11', { event: 'landing', wide: true });
      await openRecords(user, 'The Eagle has landed');
      await user.click(within(theCard()).getByRole('button', { name: 'Controls' }));

      await user.click(screen.getByRole('button', { name: 'Next event' }));

      const records = screen.getByRole('region', { name: 'First step on the Moon' });
      expect(within(records).getByText('On the Moon · Day 5 · July 21, 1969')).toBeVisible();
      expect(within(theCard()).getByRole('button', { name: 'Tell me more' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });
  });

  describe('rendering', () => {
    it("heads the records with the moment's chapter, day, and date, its title, and its exact time", async () => {
      const { user } = await mountMission('apollo-11', { event: 'landing' });

      const records = await openRecords(user, 'The Eagle has landed');

      expect(within(records).getByText('Landing · Day 5 · July 20, 1969')).toBeVisible();
      expect(within(records).getByRole('heading', { level: 3 })).toHaveTextContent(
        'The Eagle has landed',
      );
      expect(records).toHaveTextContent('102:45:39 after liftoff');
      expect(within(records).getByText('July 20, 1969, 20:17:39 UTC')).toBeVisible();
    });

    it('holds the full story, what they said, the photo, and the sources of a moment that has them all', async () => {
      const { user } = await mountMission('apollo-11', { event: 'landing' });

      const records = await openRecords(user, 'The Eagle has landed');

      expect(partsOf(records)).toEqual(['The full story', 'What they said', 'Photo', 'Sources']);
      expect(within(records).getByText(/^Eagle touched down at 4:17:39 p\.m\. EDT/)).toBeVisible();
      const recording = within(records).getByRole('region', { name: 'Recording' });
      expect(within(recording).getAllByRole('listitem')[0]).toHaveTextContent(
        'Neil Armstrong: Houston, Tranquility Base here. The Eagle has landed.',
      );
      const photo = within(records).getByRole('figure');
      expect(within(photo).getByRole('img')).toHaveAccessibleName(
        /^The flat, gray surface of the Moon/,
      );
      expect(photo).toHaveTextContent('Photo: NASA.');
      expect(within(photo).getByRole('link', { name: /^Original/ })).toHaveAttribute(
        'href',
        'https://images.nasa.gov/details/as11-37-5458',
      );
    });

    it('lists every source in full, with any disagreement after them, never in the story', async () => {
      const { user } = await mountMission('apollo-11', { event: 'landing' });

      const records = await openRecords(user, 'The Eagle has landed');

      expect(
        within(records).getByRole('link', {
          name: /^Apollo 11 Timeline, row "LM lunar landing\."/,
        }),
      ).toBeVisible();
      expect(within(records).getByText('Sources differ.')).toBeVisible();
      expect(
        within(records).getAllByText(/NSSDCA gives the landing time as 20:17:40 UT/),
      ).toHaveLength(1);
    });

    it('leaves out the parts a moment does not have', async () => {
      const { user } = await mountMission('apollo-11', { event: 'translunar-injection' });

      const records = await openRecords(user, 'Burn toward the Moon');

      expect(partsOf(records)).toEqual(['The full story', 'Sources']);
      expect(within(records).queryByRole('region', { name: 'Recording' })).not.toBeInTheDocument();
      expect(within(records).queryByRole('figure')).not.toBeInTheDocument();
    });

    it('holds only the sources behind the Sources door', async () => {
      const { user } = await mountMission('apollo-11', {
        story: withoutMoreOnStaging,
        event: 'first-stage-separation',
      });

      const records = await openRecords(user, 'First stage separates', 'Sources');

      expect(partsOf(records)).toEqual(['Sources']);
      expect(within(records).getAllByRole('link', { name: /^Apollo/ }).length).toBeGreaterThan(0);
    });

    it('tells about the mission itself before its first event', async () => {
      const { user } = await mountMission('apollo-11', { story: withoutLiftoff });

      const records = await openRecords(user, 'Apollo 11');

      expect(within(records).getByText('July 16–24, 1969')).toBeVisible();
      expect(records).not.toHaveTextContent('after liftoff');
      expect(partsOf(records)).toEqual(['The full story', 'Sources']);
      expect(
        within(records).getByText(/^Apollo 11 launched from Kennedy Space Center/),
      ).toBeVisible();
    });

    it('counts down to liftoff for a moment before it', async () => {
      const { user } = await mountMission('gemini-8', { start: 'explore' });

      const records = await openRecords(user, 'The target launches');

      expect(records).toHaveTextContent('−01:40:59 before liftoff');
      expect(within(records).getByText('March 16, 1966, 15:00:03 UTC')).toBeVisible();
    });
  });

  describe("the mission's own pages", () => {
    it('opens About, How this is drawn, and Sources and credits, and gives focus back to each link', async () => {
      const { user } = await mountMission('apollo-11', { event: 'landing' });
      const records = await openRecords(user, 'The Eagle has landed');
      const about = within(records).getByRole('button', { name: 'About Apollo 11' });
      expect(about).toHaveAccessibleDescription('Crew, spacecraft names, what they did');

      await user.click(about);
      const aboutPage = screen.getByRole('dialog', { name: 'About Apollo 11' });
      await user.click(within(aboutPage).getByRole('button', { name: 'Close' }));
      expect(about).toHaveFocus();

      await user.click(within(records).getByRole('button', { name: 'How this is drawn' }));
      expect(screen.getByRole('dialog', { name: 'How this is drawn' })).toBeVisible();
      await user.keyboard('{Escape}');

      await user.click(within(records).getByRole('button', { name: 'Sources and credits' }));
      expect(screen.getByRole('dialog', { name: 'Sources and credits' })).toBeVisible();
    });

    it('says what About holds for a mission whose spacecraft had no names of their own', async () => {
      const { user } = await mountMission('gemini-8', { start: 'explore' });

      const records = await openRecords(user, 'The target launches');

      expect(
        within(records).getByRole('button', { name: 'About Gemini 8' }),
      ).toHaveAccessibleDescription('Crew and what they did');
    });
  });
});
