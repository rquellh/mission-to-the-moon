/**
 * "Land on the Moon" offers Easy and Hard above its Start button and folds
 * the sources of its own sentences about the real flights under it. Each
 * landing ends with its stars and three goals, Play again and the other
 * level, then the real landing and "Up next": back to the flight it was
 * opened over, or, opened from the list, the flight of the first landing.
 * Running out of fuel ends a run with no stars, Play again, and no "Up
 * next"; a bump on the boulders says why and lets the run carry on, and
 * sliding on past the clear patch says to slide back. The level last chosen
 * and the best on each level are remembered on the device. The real extra
 * runs in the real sheet and is flown with its buttons as the frames pass.
 * jsdom draws no 3D view, so it flies by its read-outs (and says so in the
 * console, which these tests keep quiet). It is opened from the list
 * (drafts are listed under test, as on the dev server), by its address over
 * a flight, or with "Play" on Apollo 11's powered descent, the moment that
 * offers it, where the end still shows the landing itself. The rules of a
 * run, on both levels, are tested in game.test.ts, the shared level picker
 * and end of a run in src/extras/shared/, and what the sheet adds around the
 * extra's own next step in src/ui/extra-sheet.test.ts.
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
/** What the coach line says when the fuel runs out, and the result of that run. */
const OUT_OF_FUEL =
  'Out of fuel. The top half is flying the crew back up to orbit. No landing this time.';

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
 * Bring the lander down on the clear patch, once a run on Easy has started:
 * it starts high over the boulders, coming down too fast, so slow it down
 * and slide right for a while, then stop the slide over the clear patch and
 * let it come down. A firm touchdown with fuel to spare: two stars.
 */
async function bringItDown(user: User, frames: Frames): Promise<HTMLElement> {
  await push(user, 'Slower', 2);
  await push(user, 'Right', 3);
  frames.advance(11);
  await push(user, 'Left', 3);
  frames.advance(8);
  return within(theSheet()).getByRole('region', { name: 'Up next' });
}

/** Start on Easy, and land as `bringItDown` does. */
async function land(user: User, frames: Frames): Promise<HTMLElement> {
  await start(user);
  return bringItDown(user, frames);
}

/**
 * Bring the lander down on Hard's smaller patch, once a run on Hard has
 * started: it also starts out sliding left, so two pushes Right cancel that
 * before three more slide it over; the slide is stopped a little later, over
 * the patch. Firm, and too careful for Hard's fuel star: one star.
 */
async function bringItDownOnHard(user: User, frames: Frames): Promise<HTMLElement> {
  await push(user, 'Slower', 2);
  await push(user, 'Right', 5);
  frames.advance(12.2);
  await push(user, 'Left', 3);
  frames.advance(8);
  return within(theSheet()).getByRole('region', { name: 'Up next' });
}

/** Start on Easy, and hover over the boulders until the tank runs dry. */
async function runOutOfFuel(user: User, frames: Frames): Promise<void> {
  await start(user);
  await push(user, 'Slower', 5);
  frames.advance(33);
}

/** Open the mission list from the welcome, and "Land on the Moon" from it. */
async function openFromTheList(user: User): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'All missions' }));
  await user.click(screen.getByRole('button', { name: 'Play Land on the Moon' }));
}

/** The goals under the stars, named by the line that counts them. */
const theGoals = (line: string): HTMLElement =>
  within(theSheet()).getByRole('list', { name: line });

/** What each goal says, earned or not, with its tip. */
const goalWords = (line: string): (string | null)[] =>
  within(theGoals(line))
    .getAllByRole('listitem')
    .map((item) => item.textContent);

/** jsdom has no WebGL: the extra says so in the console and flies without its 3D view. */
const withoutItsView = (): void => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
};

describe('land on the moon', () => {
  describe('the start screen', () => {
    it('folds the sources of its sentences about the real flights under Start, labeled as theirs', async () => {
      withoutItsView();
      const { user } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);
      await within(theSheet()).findByRole('button', { name: 'Start' });

      const sources = within(theSheet()).getByRole('group', {
        description:
          'Where the sentences on the boulders, the real descent, and the top half flying the crew back to orbit come from:',
      });
      expect(sources).toHaveTextContent('Sources (9)');

      await user.click(within(sources).getByText('Sources (9)'));

      expect(sources).toHaveAttribute('open');
      for (const title of [
        'Apollo 11 Mission Report (MSC-00171)',
        'Apollo by the Numbers: A Statistical Reference (NASA SP-2000-4029)',
        'NSSDCA Master Catalog',
        'Apollo Lunar Descent and Ascent Trajectories (NASA TM X-58040)',
      ])
        expect(within(sources).getByText(title)).toBeVisible();
      expect(
        within(sources).getByRole('link', { name: /^Section 4\.10\.3, "Powered Descent"/ }),
      ).toHaveAttribute(
        'href',
        'https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf',
      );
    });

    it('offers Easy and Hard above Start, Easy the first time, with a line about the level chosen', async () => {
      withoutItsView();
      const { user } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);
      await within(theSheet()).findByRole('button', { name: 'Start' });

      const levels = within(theSheet()).getByRole('group', { name: 'Level' });

      expect(within(levels).getByRole('radio', { name: 'Easy. Not tried yet.' })).toBeChecked();
      expect(within(levels).getByRole('radio', { name: 'Hard. Not tried yet.' })).not.toBeChecked();
      expect(
        within(levels).getByText('Plenty of fuel, and a wide patch of clear ground.'),
      ).toBeVisible();

      await user.click(within(levels).getByRole('radio', { name: /^Hard\./ }));

      expect(
        within(levels).getByText('Less fuel, a smaller patch, and you start out sliding.'),
      ).toBeVisible();
    });

    it('starts a run on Hard once Hard is chosen: the lander is already sliding left', async () => {
      withoutItsView();
      const { user } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);
      await within(theSheet()).findByRole('button', { name: 'Start' });
      await user.click(within(theSheet()).getByRole('radio', { name: /^Hard\./ }));

      await start(user);

      expect(within(theControls()).getByRole('button', { name: 'Slower' })).toHaveFocus();
      expect(within(theSheet()).getByText('Sliding left')).toBeVisible();
      expect(within(theSheet()).getByText(AT_THE_START)).toBeVisible();
    });
  });

  describe('the end of a landing', () => {
    it('keeps focus on the landed line, counts its stars, and opened from the list, offers the real landing and opens Apollo 11 at it', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);

      const next = await land(user, frames);

      expect(within(theSheet()).getByText('Landed. The Eagle is on the Moon.')).toHaveFocus();
      expect(within(theSheet()).getByText('2 of 3 stars on Easy')).toBeVisible();
      expect(within(theSheet()).getByText('New best!')).toBeVisible();
      expect(goalWords('2 of 3 stars on Easy')).toEqual([
        'Earned: Landed on clear ground',
        'Not yet: Gentle touchdown. Slow down a little more before you touch.',
        'Earned: Fuel to spare',
      ]);
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
          name: 'Play: Land on the Moon',
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

    it("leaves Play again as the one amber button: Up next's own is plain, with no Try again", async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);

      const next = await land(user, frames);

      expect(within(theSheet()).getByRole('button', { name: 'Play again' })).toHaveClass(
        'button--primary',
      );
      expect(within(theSheet()).getByRole('button', { name: 'Play on Hard' })).not.toHaveClass(
        'button--primary',
      );
      expect(within(next).getByRole('button', { name: 'Fly Apollo 11' })).not.toHaveClass(
        'button--primary',
      );
      expect(within(next).queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    });

    it('comes down again from the start with Play again, on the same level, with Slower to hand', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);
      await land(user, frames);

      await user.click(within(theSheet()).getByRole('button', { name: 'Play again' }));

      expect(within(theControls()).getByRole('button', { name: 'Slower' })).toHaveFocus();
      expect(within(theSheet()).queryByRole('region', { name: 'Up next' })).not.toBeInTheDocument();
      expect(within(theSheet()).getByText('2 of 3 stars on Easy')).not.toBeVisible();
      expect(within(theSheet()).getByText(AT_THE_START)).toBeVisible();
      expect(within(theSheet()).getByText('Almost still')).toBeVisible();
    });

    it('starts on Hard at once with Play on Hard, and lands there for a new best on Hard', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);
      await land(user, frames);

      await user.click(within(theSheet()).getByRole('button', { name: 'Play on Hard' }));

      expect(within(theControls()).getByRole('button', { name: 'Slower' })).toHaveFocus();
      expect(within(theSheet()).getByText('Sliding left')).toBeVisible();

      await bringItDownOnHard(user, frames);

      expect(within(theSheet()).getByText('Landed. The Eagle is on the Moon.')).toHaveFocus();
      expect(within(theSheet()).getByText('1 of 3 stars on Hard')).toBeVisible();
      expect(goalWords('1 of 3 stars on Hard')).toEqual([
        'Earned: Landed on clear ground',
        'Not yet: Gentle touchdown. Slow down a little more before you touch.',
        'Not yet: Fuel to spare. Be bolder: slide across faster and slow down later.',
      ]);
      expect(within(theSheet()).getByText('New best!')).toBeVisible();
      expect(within(theSheet()).getByRole('button', { name: 'Play on Easy' })).toBeVisible();
    });

    it('says not to hover, on Easy, after a landing that hovered too long for the fuel star', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);
      await start(user);
      await push(user, 'Slower', 2);
      await push(user, 'Right', 3);
      frames.advance(11);
      await push(user, 'Left', 3);
      await push(user, 'Slower', 3);

      frames.advance(6);
      await push(user, 'Faster', 3);
      frames.advance(8);

      expect(goalWords('1 of 3 stars on Easy')).toEqual([
        'Earned: Landed on clear ground',
        'Not yet: Gentle touchdown. Slow down a little more before you touch.',
        'Not yet: Fuel to spare. Do not hover. Head for the clear ground right away.',
      ]);
    });

    it('does not call a second landing that only equals the best a new best', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);
      await land(user, frames);
      await user.click(within(theSheet()).getByRole('button', { name: 'Play again' }));

      await bringItDown(user, frames);

      expect(within(theSheet()).getByText('2 of 3 stars on Easy')).toBeVisible();
      expect(within(theSheet()).getByText('New best!')).not.toBeVisible();
    });
  });

  describe('remembering', () => {
    it('opens on the level last played, with the best on each, after the game is closed and opened again', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);
      await land(user, frames);
      await user.click(within(theSheet()).getByRole('button', { name: 'Play on Hard' }));
      await user.click(within(theSheet()).getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog', { name: 'Land on the Moon' })).not.toBeInTheDocument();

      await openFromTheList(user);
      await within(theSheet()).findByRole('button', { name: 'Start' });

      const levels = within(theSheet()).getByRole('group', { name: 'Level' });
      expect(within(levels).getByRole('radio', { name: 'Hard. Not tried yet.' })).toBeChecked();
      expect(
        within(levels).getByRole('radio', { name: 'Easy. Your best: 2 of 3 stars.' }),
      ).not.toBeChecked();
      expect(within(levels).getByText('Your best')).toBeVisible();
    });
  });

  // The announcer waits half a second for things to settle, then speaks on the next frame.
  describe('announcements', () => {
    const settle = (frames: Frames): void => {
      vi.advanceTimersByTime(500);
      frames.frame();
    };

    it('says the landing and its stars in one message', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);
      await start(user);
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

      await bringItDown(user, frames);
      settle(frames);

      expect(
        screen.getByText('Landed. The Eagle is on the Moon. 2 of 3 stars on Easy. New best!'),
      ).toHaveAttribute('aria-live', 'polite');
    });

    it('says the fuel ran out and that the run earned no stars in one message', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);
      await start(user);
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

      await push(user, 'Slower', 5);
      frames.advance(33);
      settle(frames);

      expect(screen.getByText(`${OUT_OF_FUEL} No stars this time, on Easy.`)).toHaveAttribute(
        'aria-live',
        'polite',
      );
    });
  });

  describe('running out of fuel', () => {
    it('says the fuel ran out with focus on it, shows no stars, puts the controls away, and offers no Up next', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);

      await runOutOfFuel(user, frames);

      expect(within(theSheet()).getByText(OUT_OF_FUEL)).toHaveFocus();
      expect(within(theSheet()).getByText('No stars this time, on Easy')).toBeVisible();
      expect(goalWords('No stars this time, on Easy')).toEqual([
        'Not yet: Land on clear ground. Stop your slide first, then come down.',
        'Not yet: Gentle touchdown',
        'Not yet: Fuel to spare',
      ]);
      expect(
        within(theSheet()).queryByRole('group', { name: 'Lander controls' }),
      ).not.toBeInTheDocument();
      expect(within(theSheet()).getByText('Falling speed')).not.toBeVisible();
      expect(
        within(theSheet()).queryByRole('button', { name: 'Start over' }),
      ).not.toBeInTheDocument();
      expect(within(theSheet()).queryByRole('region', { name: 'Up next' })).not.toBeInTheDocument();
      expect(within(theSheet()).getByRole('button', { name: 'Play again' })).toBeVisible();
      expect(within(theSheet()).getByRole('button', { name: 'Play on Hard' })).toBeVisible();
    });

    it('comes down again from the start with Play again, with the controls back and Slower to hand', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-3', { loadExtra });
      await openFromTheList(user);
      await runOutOfFuel(user, frames);

      await user.click(within(theSheet()).getByRole('button', { name: 'Play again' }));

      expect(within(theControls()).getByRole('button', { name: 'Slower' })).toHaveFocus();
      for (const name of ['Slower', 'Faster', 'Left', 'Right'])
        expect(within(theControls()).getByRole('button', { name })).toBeEnabled();
      expect(within(theSheet()).getByText(AT_THE_START)).toBeVisible();
      expect(within(theSheet()).getByRole('button', { name: 'Start over' })).toBeVisible();
      expect(within(theSheet()).getByText('No stars this time, on Easy')).not.toBeVisible();
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
