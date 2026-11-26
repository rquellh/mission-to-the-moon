/**
 * "Land on the Moon" ends each landing with the real landing and "Up next":
 * back to the flight it was opened over, or, opened from the list, the
 * flight of the first landing. Running out of fuel ends a run with "Try
 * again" and no "Up next", a bump on the boulders says why and lets the run
 * carry on, and sliding on past the clear patch says to slide back. The real
 * extra runs in the real sheet and is flown with its buttons as the frames
 * pass. jsdom draws no 3D view, so it flies by its read-outs (and says so in
 * the console, which these tests keep quiet). It is opened from the list
 * (drafts are listed under test, as on the dev server), by its address over
 * a flight, or with "Try it" on Apollo 11's powered descent, the moment that
 * offers it, where the end still shows the landing itself. The rules of a
 * run are tested in game.test.ts, and what the sheet adds around the extra's
 * own next step in src/ui/extra-sheet.test.ts.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  mountMission,
  navigation,
  screen,
  within,
  type Frames,
  type User,
} from '../../test/test-utils.ts';
import { loadExtra } from '../index.ts';

/** Longer than the lander takes to come down onto the boulders when nothing is pressed (about 10 seconds). */
const DOWN_ON_THE_BOULDERS = 11;
/** Longer than a bump's message stays before the usual advice comes back. */
const A_BUMP_MESSAGE = 5;
/** What the coach line says at the start of a run: the lander starts out coming down too fast. */
const AT_THE_START = 'Too fast. Push Slower before you touch down.';

/** The sheet, open on "Land on the Moon". */
const theSheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Land on the Moon' });

/** The four buttons that fly the lander. */
const theControls = (): HTMLElement =>
  within(theSheet()).getByRole('group', { name: 'Lander controls' });

/** Press one of the lander's controls `times` times. */
async function push(user: User, name: string, times: number): Promise<void> {
  for (let pushed = 0; pushed < times; pushed += 1)
    await user.click(within(theControls()).getByRole('button', { name }));
}

/** Press Start once the lander is ready. */
async function start(user: User): Promise<void> {
  await user.click(await within(theSheet()).findByRole('button', { name: 'Start' }));
}

/**
 * Start, and bring the lander down on the clear patch: it starts high over
 * the boulders, coming down too fast, so slow it down and slide right for a
 * while, then stop the slide over the clear patch and let it come down.
 */
async function land(user: User, frames: Frames): Promise<HTMLElement> {
  await start(user);
  await push(user, 'Slower', 2);
  await push(user, 'Right', 3);
  frames.advance(11);
  await push(user, 'Left', 3);
  frames.advance(8);
  return within(theSheet()).getByRole('region', { name: 'Up next' });
}

/** Start, and hover over the boulders until the tank runs dry. */
async function runOutOfFuel(user: User, frames: Frames): Promise<void> {
  await start(user);
  await push(user, 'Slower', 5);
  frames.advance(33);
}

/** Open the mission list from the welcome, and "Land on the Moon" from it. */
async function openFromTheList(user: User): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'All missions' }));
  await user.click(screen.getByRole('button', { name: 'Open Land on the Moon' }));
}

/** jsdom has no WebGL: the extra says so in the console and flies without its 3D view. */
const withoutItsView = (): void => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
};

describe('land on the moon', () => {
  describe('the end of a landing', () => {
    it('keeps focus on the landed line, and opened from the list, offers the real landing and opens Apollo 11 at it', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);

      const next = await land(user, frames);

      expect(within(theSheet()).getByText('Landed. The Eagle is on the Moon.')).toHaveFocus();
      expect(within(theSheet()).getByText('Firm')).toBeVisible();
      expect(within(theSheet()).getByText('About half')).toBeVisible();
      expect(
        within(next).getByRole('heading', { level: 3, name: 'See the real landing' }),
      ).toBeVisible();
      expect(within(next).getByText('Apollo 11, July 1969')).toBeVisible();
      expect(
        within(next).getByText('Opens at the landing. Fly it to collect its patch.'),
      ).toBeVisible();

      await user.click(within(next).getByRole('button', { name: 'Fly Apollo 11' }));

      expect(navigation.address).toBe('http://localhost:3000/?mission=apollo-11&event=landing');
    });

    it("opened over a flight at its landing, shows that flight's landing and offers the way back to it", async () => {
      withoutItsView();
      const { user, frames } = await mountMission('apollo-17', {
        event: 'landing',
        extra: 'landing',
        loadExtra,
      });

      const next = await land(user, frames);

      expect(within(theSheet()).getByText('Landed. The Challenger is on the Moon.')).toHaveFocus();
      expect(
        within(theSheet()).getByRole('heading', { level: 3, name: 'Landing at Taurus-Littrow' }),
      ).toBeVisible();
      expect(
        within(next).getByRole('heading', {
          level: 3,
          name: 'Pick up Apollo 17 after the landing',
        }),
      ).toBeVisible();
      expect(next).toHaveTextContent('Your flight is waiting where you left it.');
      expect(within(next).queryByRole('button', { name: /^Fly / })).not.toBeInTheDocument();

      await user.click(within(next).getByRole('button', { name: 'Back to Apollo 17' }));

      expect(screen.queryByRole('dialog', { name: 'Land on the Moon' })).not.toBeInTheDocument();
    });

    it("opened from Apollo 11's powered descent, shows the landing itself and offers the way back to the flight", async () => {
      withoutItsView();
      const { user, frames } = await mountMission('apollo-11', {
        event: 'powered-descent',
        loadExtra,
      });
      await user.click(
        within(screen.getByRole('region', { name: 'What is happening' })).getByRole('button', {
          name: 'Try it: Land on the Moon',
        }),
      );

      const next = await land(user, frames);

      expect(
        within(theSheet()).getByRole('heading', { level: 3, name: 'The Eagle has landed' }),
      ).toBeVisible();
      expect(
        within(theSheet()).queryByRole('heading', { name: 'Powered descent begins' }),
      ).not.toBeInTheDocument();
      expect(
        within(next).getByRole('heading', { level: 3, name: 'Pick up Apollo 11' }),
      ).toBeVisible();
      expect(next).not.toHaveTextContent('after the landing');
      expect(next).toHaveTextContent('Your flight is waiting where you left it.');
      expect(within(next).getByRole('button', { name: 'Back to Apollo 11' })).toBeVisible();
    });

    it('comes down again from the start with Try again, with Slower to hand', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);
      const next = await land(user, frames);

      await user.click(within(next).getByRole('button', { name: 'Try again' }));

      expect(within(theControls()).getByRole('button', { name: 'Slower' })).toHaveFocus();
      expect(within(theSheet()).queryByRole('region', { name: 'Up next' })).not.toBeInTheDocument();
      expect(within(theSheet()).getByText(AT_THE_START)).toBeVisible();
    });
  });

  describe('running out of fuel', () => {
    it('says the fuel ran out with focus on it, turns the controls off, and offers no Up next', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);

      await runOutOfFuel(user, frames);

      expect(
        within(theSheet()).getByText(
          'Out of fuel. The top half is flying the crew back up to orbit. No landing this time.',
        ),
      ).toHaveFocus();
      for (const name of ['Slower', 'Faster', 'Left', 'Right'])
        expect(within(theControls()).getByRole('button', { name })).toBeDisabled();
      expect(within(theSheet()).queryByRole('region', { name: 'Up next' })).not.toBeInTheDocument();
      expect(within(theSheet()).getByRole('button', { name: 'Try again' })).toBeVisible();
    });

    it('comes down again from the start with Try again, with the controls back on and Slower to hand', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);
      await runOutOfFuel(user, frames);

      await user.click(within(theSheet()).getByRole('button', { name: 'Try again' }));

      expect(within(theControls()).getByRole('button', { name: 'Slower' })).toHaveFocus();
      for (const name of ['Slower', 'Faster', 'Left', 'Right'])
        expect(within(theControls()).getByRole('button', { name })).toBeEnabled();
      expect(within(theSheet()).getByText(AT_THE_START)).toBeVisible();
      expect(within(theSheet()).getByRole('button', { name: 'Start over' })).toBeVisible();
    });
  });

  describe('bumps', () => {
    it('says why after a bump on the boulders, and the run carries on', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);
      await start(user);

      frames.advance(DOWN_ON_THE_BOULDERS);

      expect(
        within(theSheet()).getByText(
          'Rocks. The lander cannot stand on boulders. Slide over to clear ground.',
        ),
      ).toBeVisible();
      expect(within(theControls()).getByRole('button', { name: 'Faster' })).toBeEnabled();
      expect(within(theSheet()).queryByRole('region', { name: 'Up next' })).not.toBeInTheDocument();

      frames.advance(A_BUMP_MESSAGE);

      expect(
        within(theSheet()).getByText('You are going up. Push Faster to come back down.'),
      ).toBeVisible();
    });
  });

  describe('the clear patch', () => {
    it('says to slide back after sliding on past the clear ground', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);
      await start(user);
      await push(user, 'Slower', 3);
      await push(user, 'Right', 3);

      frames.advance(14);

      expect(
        within(theSheet()).getByText('You slid past the clear ground. Push Left to slide back.'),
      ).toBeVisible();
    });
  });
});
