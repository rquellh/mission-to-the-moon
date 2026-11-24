/**
 * "Drop the stages" ends each climb with "Up next": back to the flight it
 * was opened from, or, opened from the list, the flight where that liftoff
 * really happened. The real extra runs in the real sheet. jsdom draws no 3D
 * picture, so it climbs without one, and as the frames pass each part drops
 * by itself. What the sheet adds around the extra's own next step (the
 * picks, All missions, the phone's "More to explore") is tested in
 * src/ui/extra-sheet.test.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  mountMission,
  navigation,
  screen,
  within,
  type Frames,
  type User,
} from '../../test/test-utils.ts';
import { loadExtra } from '../index.ts';

/** Longer than any climb takes from Start to orbit, with every part dropping by itself. */
const A_WHOLE_CLIMB = 60;

/** The sheet, open on "Drop the stages". */
const theSheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Drop the stages' });

/** Press Start once the rocket is on the pad, and let the frames pass until it is in orbit. */
async function climbToOrbit(user: User, frames: Frames): Promise<HTMLElement> {
  await user.click(await within(theSheet()).findByRole('button', { name: 'Start' }));
  frames.advance(A_WHOLE_CLIMB);
  return within(theSheet()).getByRole('region', { name: 'Up next' });
}

/** Open the mission list from the welcome, and "Drop the stages" from it. */
async function openFromTheList(user: User): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'All missions' }));
  await user.click(screen.getByRole('button', { name: 'Open Drop the stages' }));
}

describe('drop the stages', () => {
  describe('the end of a climb', () => {
    it('puts focus on the result, not on a button, and offers the way back to the flight it was opened from', async () => {
      const { user, frames } = await mountMission('apollo-11', { event: 'liftoff', loadExtra });
      const tryIt = screen.getByRole('button', { name: 'Try it: Drop the stages' });
      await user.click(tryIt);

      const next = await climbToOrbit(user, frames);

      expect(
        within(theSheet()).getByRole('heading', { level: 3, name: 'In orbit around Earth' }),
      ).toHaveFocus();
      expect(
        within(next).getByRole('heading', { level: 3, name: 'Pick up Apollo 11 after liftoff' }),
      ).toBeVisible();
      expect(next).toHaveTextContent('Your flight is waiting where you left it.');

      await user.click(within(next).getByRole('button', { name: 'Back to Apollo 11' }));

      expect(screen.queryByRole('dialog', { name: 'Drop the stages' })).not.toBeInTheDocument();
      expect(tryIt).toHaveFocus();
    });

    it('goes back to the flight without a word of liftoff after another rocket was picked', async () => {
      const { user, frames } = await mountMission('apollo-11', { event: 'liftoff', loadExtra });
      await user.click(screen.getByRole('button', { name: 'Try it: Drop the stages' }));
      const first = await climbToOrbit(user, frames);
      await user.click(within(first).getByRole('button', { name: 'More to explore' }));
      await user.click(within(first).getByRole('button', { name: 'Try another rocket' }));
      await user.click(await within(theSheet()).findByRole('button', { name: /Gemini 8, 1966/ }));

      const next = await climbToOrbit(user, frames);

      expect(
        within(next).getByRole('heading', { level: 3, name: 'Pick up Apollo 11' }),
      ).toBeVisible();
      expect(within(next).getByRole('button', { name: 'Back to Apollo 11' })).toBeVisible();
    });

    it('opened from the list, offers the real liftoff of the rocket flown, and opens that flight at liftoff', async () => {
      const { user, frames } = await mountMission('apollo-11', { loadExtra });
      await openFromTheList(user);
      await user.click(await within(theSheet()).findByRole('button', { name: /Apollo 11, 1969/ }));

      const next = await climbToOrbit(user, frames);

      expect(
        within(next).getByRole('heading', { level: 3, name: 'See the real liftoff' }),
      ).toBeVisible();
      expect(within(next).getByText('Apollo 11, July 1969')).toBeInTheDocument();
      expect(
        within(next).getByText('Opens at liftoff. Fly it to collect its patch.'),
      ).toBeInTheDocument();

      await user.click(within(next).getByRole('button', { name: 'Fly Apollo 11' }));

      expect(navigation.address).toBe('http://localhost:3000/?mission=apollo-11&event=liftoff');
    });

    it('climbs again from the pad with Try again, with Drop it to hand', async () => {
      const { user, frames } = await mountMission('apollo-11', { event: 'liftoff', loadExtra });
      await user.click(screen.getByRole('button', { name: 'Try it: Drop the stages' }));
      const next = await climbToOrbit(user, frames);

      await user.click(within(next).getByRole('button', { name: 'Try again' }));

      expect(within(theSheet()).getByRole('button', { name: 'Drop it' })).toHaveFocus();
      expect(within(theSheet()).queryByRole('region', { name: 'Up next' })).not.toBeInTheDocument();
    });

    it('leaves the result as the visitor has it while the screen keeps drawing', async () => {
      const { user, frames } = await mountMission('apollo-11', { event: 'liftoff', loadExtra });
      await user.click(screen.getByRole('button', { name: 'Try it: Drop the stages' }));
      const next = await climbToOrbit(user, frames);
      await user.click(within(next).getByRole('button', { name: 'More to explore' }));

      frames.advance(1);

      expect(within(theSheet()).getByRole('button', { name: 'Try another rocket' })).toBeVisible();
      expect(
        within(theSheet()).getByRole('heading', {
          level: 3,
          name: 'Pick up Apollo 11 after liftoff',
        }),
      ).toHaveFocus();
    });
  });
});
