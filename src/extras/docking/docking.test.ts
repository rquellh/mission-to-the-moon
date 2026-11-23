/**
 * "Dock two spacecraft" ends each docking with "Up next": back to the flight
 * it was opened from, or, opened from the list, the flight of the real
 * docking. The real extra runs in the real sheet and is flown with its
 * thruster buttons as the frames pass. jsdom draws no 3D view, so it flies
 * by its read-outs (and says so in the console, which these tests keep
 * quiet). What the sheet adds around the extra's own next step is tested in
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

/**
 * Start, and fly the Gemini into the cone: it starts off to the left and a
 * little high, drifting left, so push right and a little down and close in
 * at a gentle speed; once lined up, stop the sideways drift and let it close in.
 */
async function dock(user: User, frames: Frames): Promise<HTMLElement> {
  await user.click(await within(theSheet()).findByRole('button', { name: 'Start' }));
  const thrusters = within(theSheet()).getByRole('group', { name: 'Thrusters' });
  const push = async (name: string, times: number): Promise<void> => {
    for (let pushed = 0; pushed < times; pushed += 1)
      await user.click(within(thrusters).getByRole('button', { name }));
  };
  await push('Right', 4);
  await push('Down', 1);
  await push('Forward', 3);
  frames.advance(10);
  await push('Left', 3);
  await push('Up', 1);
  frames.advance(15);
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
  await user.click(within(ending).getByRole('button', { name: 'Open Dock two spacecraft' }));
}

/** jsdom has no WebGL: the extra says so in the console and flies without its 3D view. */
const withoutItsView = (): void => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
};

describe('dock two spacecraft', () => {
  describe('the end of a docking', () => {
    it('keeps focus on the docked line, and offers the way back to the flight it was opened from', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-8', { event: 'docking', loadExtra });
      const tryIt = screen.getByRole('button', { name: 'Try it: Dock two spacecraft' });
      await user.click(tryIt);

      const next = await dock(user, frames);

      expect(
        within(theSheet()).getByText('Docked. The Gemini and the Agena are joined.'),
      ).toHaveFocus();
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
      await user.click(screen.getByRole('button', { name: 'All missions' }));
      await user.click(screen.getByRole('button', { name: 'Open Dock two spacecraft' }));

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

    it('flies again from the start with Try again, with Forward to hand', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('gemini-8', { event: 'docking', loadExtra });
      await user.click(screen.getByRole('button', { name: 'Try it: Dock two spacecraft' }));
      const next = await dock(user, frames);

      await user.click(within(next).getByRole('button', { name: 'Try again' }));

      expect(within(theSheet()).getByRole('button', { name: 'Forward' })).toHaveFocus();
      expect(within(theSheet()).queryByRole('region', { name: 'Up next' })).not.toBeInTheDocument();
    });
  });
});
