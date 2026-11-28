/**
 * "Dock two spacecraft" offers Easy and Hard above its Start button. Each
 * docking ends with its stars and three goals, Play again and the other
 * level, then the real docking and "Up next": back to the flight it was
 * opened from, or, opened from the list, the flight of the real docking. The
 * level last chosen and the best on each level are remembered on the
 * device. The real extra runs in the real sheet and is flown with its
 * thruster buttons as the frames pass. jsdom draws no 3D view, so it flies
 * by its read-outs (and says so in the console, which these tests keep
 * quiet). The rules of a run, on both levels, are tested in game.test.ts,
 * the shared level picker and end of a run in src/extras/shared/, and what
 * the sheet adds around the extra's own next step in
 * src/ui/extra-sheet.test.ts.
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

/** The sheet, open on "Dock two spacecraft". */
const theSheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Dock two spacecraft' });

/** The six buttons that fly the Gemini. */
const theThrusters = (): HTMLElement =>
  within(theSheet()).getByRole('group', { name: 'Thrusters' });

/** Press one of the thrusters `times` times. */
async function push(user: User, name: string, times: number): Promise<void> {
  for (let pushed = 0; pushed < times; pushed += 1)
    await user.click(within(theThrusters()).getByRole('button', { name }));
}

/** Press Start once the spacecraft are ready. */
async function start(user: User): Promise<void> {
  await user.click(await within(theSheet()).findByRole('button', { name: 'Start' }));
}

/**
 * Fly the Gemini into the cone, once a run on Easy has started: it starts
 * off to the left and a little high, drifting left, so push right and a
 * little down and close in at a gentle speed; once lined up, stop the drift
 * and let it close in. Closing at Easy's fastest gentle speed, with no bump:
 * two stars.
 */
async function bringItIn(user: User, frames: Frames): Promise<HTMLElement> {
  await push(user, 'Right', 4);
  await push(user, 'Down', 1);
  await push(user, 'Forward', 3);
  frames.advance(10);
  await push(user, 'Left', 3);
  await push(user, 'Up', 1);
  frames.advance(15);
  return within(theSheet()).getByRole('region', { name: 'Up next' });
}

/** Start on Easy, and dock as `bringItIn` does. */
async function dock(user: User, frames: Frames): Promise<HTMLElement> {
  await start(user);
  return bringItIn(user, frames);
}

/**
 * Fly the Gemini into the cone on Hard, once a run on Hard has started: it
 * starts further off, sliding left faster and drifting up, so two pushes
 * Right and one Down cancel that before the same aim as on Easy, and it
 * closes in at Hard's fastest gentle speed, one push slower. No bump: two
 * stars.
 */
async function bringItInOnHard(user: User, frames: Frames): Promise<HTMLElement> {
  await push(user, 'Right', 5);
  await push(user, 'Down', 2);
  await push(user, 'Forward', 2);
  frames.advance(13.5);
  await push(user, 'Left', 3);
  await push(user, 'Up', 1);
  frames.advance(18);
  return within(theSheet()).getByRole('region', { name: 'Up next' });
}

/** Explore Gemini 8 to the end of its clock, Finish, and open the docking from "More to explore" on the ending. */
async function openFromTheEndOfGemini8(user: User): Promise<void> {
  const card = screen.getByRole('region', { name: 'What is happening' });
  await user.click(within(card).getByRole('button', { name: 'Controls' }));
  await user.click(screen.getByRole('slider', { name: 'Mission time' }));
  await user.keyboard('{End}');
  await user.click(within(card).getByRole('button', { name: 'Finish' }));
  const ending = screen.getByRole('region', { name: 'That’s the flight!' });
  await user.click(within(ending).getByRole('button', { name: 'More to explore' }));
  await user.click(within(ending).getByRole('button', { name: 'Play Dock two spacecraft' }));
}

/** Open the mission list from the welcome, and "Dock two spacecraft" from it. */
async function openFromTheList(user: User): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'All missions' }));
  await user.click(screen.getByRole('button', { name: 'Play Dock two spacecraft' }));
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

describe('dock two spacecraft', () => {
  describe('the start screen', () => {
    it('offers Easy and Hard above Start, Easy the first time, with a line about the level chosen', async () => {
      withoutItsView();
      const { user } = await mountMission('apollo-11', { loadExtra });
      await openFromTheList(user);
      await within(theSheet()).findByRole('button', { name: 'Start' });

      const levels = within(theSheet()).getByRole('group', { name: 'Level' });

      expect(within(levels).getByRole('radio', { name: 'Easy. Not tried yet.' })).toBeChecked();
      expect(within(levels).getByRole('radio', { name: 'Hard. Not tried yet.' })).not.toBeChecked();
      expect(
        within(levels).getByText('The Gemini starts almost lined up, and drifts slowly.'),
      ).toBeVisible();

      await user.click(within(levels).getByRole('radio', { name: /^Hard\./ }));

      expect(
        within(levels).getByText(
          'It starts further off and drifts faster, and the cone is a tighter fit.',
        ),
      ).toBeVisible();
    });

    it("starts a run on Hard once Hard is chosen, where Easy's fastest gentle speed is too fast", async () => {
      withoutItsView();
      const { user } = await mountMission('apollo-11', { loadExtra });
      await openFromTheList(user);
      await within(theSheet()).findByRole('button', { name: 'Start' });
      await user.click(within(theSheet()).getByRole('radio', { name: /^Hard\./ }));

      await start(user);

      expect(within(theThrusters()).getByRole('button', { name: 'Forward' })).toHaveFocus();
      expect(within(theSheet()).getByText('Go right and down')).toBeVisible();

      await push(user, 'Forward', 3);

      expect(within(theSheet()).getByText('Too fast')).toBeVisible();
      expect(within(theSheet()).getByText('Too fast. Push Back to slow down.')).toBeVisible();
    });
  });

  describe('the end of a docking', () => {
    it('keeps focus on the docked line, counts its stars, and offers the way back to the flight it was opened from', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-8', { event: 'docking', loadExtra });
      const tryIt = screen.getByRole('button', { name: 'Play: Dock two spacecraft' });
      await user.click(tryIt);

      const next = await dock(user, frames);

      expect(
        within(theSheet()).getByText('Docked. The Gemini and the Agena are joined.'),
      ).toHaveFocus();
      expect(within(theSheet()).getByText('2 of 3 stars on Easy')).toBeVisible();
      expect(within(theSheet()).getByText('New best!')).toBeVisible();
      expect(goalWords('2 of 3 stars on Easy')).toEqual([
        'Earned: Docked',
        'Earned: On the first try',
        'Not yet: A soft touch. Push Back to come in slower.',
      ]);
      expect(
        within(next).getByRole('heading', { level: 3, name: 'Pick up Gemini 8 after the docking' }),
      ).toBeVisible();
      expect(next).toHaveTextContent('Your flight is waiting where you left it.');

      await user.click(within(next).getByRole('button', { name: 'Back to Gemini 8' }));

      expect(screen.queryByRole('dialog', { name: 'Dock two spacecraft' })).not.toBeInTheDocument();
      expect(tryIt).toHaveFocus();
    });

    it("opened from the end of the flight, shows that flight's docking and goes back to its end, not to the docking", async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-8', { start: 'explore', loadExtra });
      await openFromTheEndOfGemini8(user);

      const next = await dock(user, frames);

      expect(
        within(theSheet()).getByRole('heading', { level: 3, name: 'Gemini 8: The first docking' }),
      ).toBeVisible();
      expect(
        within(next).getByRole('heading', { level: 3, name: 'Pick up Gemini 8' }),
      ).toBeVisible();
      expect(within(next).getByRole('button', { name: 'Back to Gemini 8' })).toBeVisible();
    });

    it('opened from the list, offers the real docking, and opens its flight at the first docking', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('apollo-11', { loadExtra });
      await openFromTheList(user);

      const next = await dock(user, frames);

      expect(
        within(next).getByRole('heading', { level: 3, name: 'See the real docking' }),
      ).toBeVisible();
      expect(within(next).getByText('Gemini 8, March 1966')).toBeInTheDocument();
      expect(
        within(next).getByText('Opens at the first docking. Fly it to collect its patch.'),
      ).toBeInTheDocument();

      await user.click(within(next).getByRole('button', { name: 'Fly Gemini 8' }));

      expect(navigation.address).toBe('http://localhost:3000/?mission=gemini-8&event=docking');
    });

    it('earns all three stars when it pushes Back before the touch to come in slower', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('apollo-11', { loadExtra });
      await openFromTheList(user);
      await start(user);
      await push(user, 'Right', 4);
      await push(user, 'Down', 1);
      await push(user, 'Forward', 3);
      frames.advance(10);
      await push(user, 'Left', 3);
      await push(user, 'Up', 1);
      // About a meter and a half from the cone.
      frames.advance(8.7);

      await push(user, 'Back', 2);
      frames.advance(10);

      expect(
        within(theSheet()).getByText('Docked. The Gemini and the Agena are joined.'),
      ).toHaveFocus();
      expect(goalWords('All 3 stars on Easy')).toEqual([
        'Earned: Docked',
        'Earned: On the first try',
        'Earned: A soft touch',
      ]);
    });

    it('misses the star for the first try after a bump, and says how to get it', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('apollo-11', { loadExtra });
      await openFromTheList(user);
      await start(user);
      await push(user, 'Right', 4);
      await push(user, 'Down', 1);
      await push(user, 'Forward', 4);
      frames.advance(10);
      await push(user, 'Left', 3);
      await push(user, 'Up', 1);
      frames.advance(10);
      expect(within(theSheet()).getByText('Bump. Slow down before you touch.')).toBeVisible();

      await push(user, 'Forward', 3);
      frames.advance(10);

      expect(goalWords('2 of 3 stars on Easy')).toEqual([
        'Earned: Docked',
        'Not yet: First try. Line up and slow down before the nose reaches the cone.',
        'Earned: A soft touch',
      ]);
    });

    it("leaves Play again as the one amber button: Up next's own is plain, with no Try again", async () => {
      withoutItsView();
      const { user, frames } = await mountMission('apollo-11', { loadExtra });
      await openFromTheList(user);

      const next = await dock(user, frames);

      expect(within(theSheet()).getByRole('button', { name: 'Play again' })).toHaveClass(
        'button--primary',
      );
      expect(within(theSheet()).getByRole('button', { name: 'Play on Hard' })).not.toHaveClass(
        'button--primary',
      );
      expect(within(next).getByRole('button', { name: 'Fly Gemini 8' })).not.toHaveClass(
        'button--primary',
      );
      expect(
        within(theSheet()).queryByRole('button', { name: 'Try again' }),
      ).not.toBeInTheDocument();
    });

    it('flies again from the start with Play again, on the same level, with Forward to hand', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-8', { event: 'docking', loadExtra });
      await user.click(screen.getByRole('button', { name: 'Play: Dock two spacecraft' }));
      await dock(user, frames);

      await user.click(within(theSheet()).getByRole('button', { name: 'Play again' }));

      expect(within(theThrusters()).getByRole('button', { name: 'Forward' })).toHaveFocus();
      expect(within(theSheet()).queryByRole('region', { name: 'Up next' })).not.toBeInTheDocument();
      expect(within(theSheet()).getByText('2 of 3 stars on Easy')).not.toBeVisible();
      expect(within(theSheet()).getByText('Go right and down')).toBeVisible();

      await push(user, 'Forward', 3);

      expect(within(theSheet()).getByText('Slow and steady')).toBeVisible();
    });

    it('starts on Hard at once with Play on Hard, and docks there for a new best on Hard', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('apollo-11', { loadExtra });
      await openFromTheList(user);
      await dock(user, frames);

      await user.click(within(theSheet()).getByRole('button', { name: 'Play on Hard' }));

      expect(within(theThrusters()).getByRole('button', { name: 'Forward' })).toHaveFocus();

      await bringItInOnHard(user, frames);

      expect(
        within(theSheet()).getByText('Docked. The Gemini and the Agena are joined.'),
      ).toHaveFocus();
      expect(within(theSheet()).getByText('2 of 3 stars on Hard')).toBeVisible();
      expect(within(theSheet()).getByText('New best!')).toBeVisible();
      expect(within(theSheet()).getByRole('button', { name: 'Play on Easy' })).toBeVisible();
    });

    it('does not call a second docking that only equals the best a new best', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('apollo-11', { loadExtra });
      await openFromTheList(user);
      await dock(user, frames);
      await user.click(within(theSheet()).getByRole('button', { name: 'Play again' }));

      await bringItIn(user, frames);

      expect(within(theSheet()).getByText('2 of 3 stars on Easy')).toBeVisible();
      expect(within(theSheet()).getByText('New best!')).not.toBeVisible();
    });
  });

  describe('remembering', () => {
    it('opens on the level last played, with the best on each, after the game is closed and opened again', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('apollo-11', { loadExtra });
      await openFromTheList(user);
      await dock(user, frames);
      await user.click(within(theSheet()).getByRole('button', { name: 'Play on Hard' }));
      await user.click(within(theSheet()).getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog', { name: 'Dock two spacecraft' })).not.toBeInTheDocument();

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

    it('says the docking and its stars in one message', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('apollo-11', { loadExtra });
      await openFromTheList(user);
      await start(user);
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

      await bringItIn(user, frames);
      settle(frames);

      expect(
        screen.getByText(
          'Docked. The Gemini and the Agena are joined. 2 of 3 stars on Easy. New best!',
        ),
      ).toHaveAttribute('aria-live', 'polite');
    });
  });
});
