/**
 * "Fly to orbit" folds the sources of its own sentences about the real
 * flights under its Start button, and ends each climb to orbit with the
 * flight's own orbit event (or, when its story has none, its liftoff), the
 * real times its stages dropped away, and "Up next": back to the flight it
 * was opened over, or, opened from the list, the flight where that liftoff
 * really happened. Running out of fuel ends a run with "Try again"
 * and no "Up next". Tipping too far in the thick air, pressing "Drop it"
 * too early, and leaving an empty stage on each say why, and the run
 * carries on. The real extra runs in the real sheet and is flown with its
 * keys as the frames pass: the arrows tip the rocket, and the space bar
 * presses "Drop it", which has the focus. jsdom draws no 3D view, so it
 * flies over its flat picture (and says so in the console, which these
 * tests keep quiet). It opens from the list and by its address over a
 * flight; no mission's moment offers it yet. That it can fly every flight's
 * own rocket to an event of the flight's own is checked in
 * src/sim/test/all-missions.test.ts, and how a rocket is read from a
 * flight's files in rocket.test.ts. The rules of a run are tested in
 * game.test.ts, and what the sheet adds around the extra's own next step in
 * src/ui/extra-sheet.test.ts.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  mountMission,
  navigation,
  screen,
  within,
  type Frames,
  type MountedMission,
  type User,
} from '../../test/test-utils.ts';
import { loadExtra } from '../index.ts';

/** A press in a climb: when, in seconds after Start, and the key pressed then. */
type Press = readonly [seconds: number, key: string];

/**
 * A clean climb to orbit with the Saturn V's three stages: "Tip over" with
 * the right arrow, first as the tail clears the thick air and then every two
 * and a half seconds, and the space bar on "Drop it" on the first frame each
 * stage shows empty. A tank's fuel runs out a hair after its whole seconds
 * (7 for the first stage, 8 for the second), so that is the frame after.
 * Orbit comes at about 22 seconds.
 */
const THREE_STAGES: readonly Press[] = [
  [3.8, '{ArrowRight}'],
  [6.3, '{ArrowRight}'],
  [7.1, '[Space]'],
  [8.8, '{ArrowRight}'],
  [11.3, '{ArrowRight}'],
  [13.8, '{ArrowRight}'],
  [15.2, '[Space]'],
  [16.3, '{ArrowRight}'],
];
/** The same climb with a rocket of two stages, whose first stage has 11 seconds of fuel. Orbit comes at about 22 seconds. */
const TWO_STAGES: readonly Press[] = [
  [3.8, '{ArrowRight}'],
  [6.3, '{ArrowRight}'],
  [8.8, '{ArrowRight}'],
  [11.1, '[Space]'],
  [11.3, '{ArrowRight}'],
  [13.8, '{ArrowRight}'],
  [16.3, '{ArrowRight}'],
];
/** Longer than a clean climb takes to reach orbit (about 22 seconds). */
const TO_ORBIT = 25;
/** Longer than the Saturn V takes to run out of fuel when nothing is pressed (about 28 seconds). */
const OUT_OF_FUEL = 30;
/** The first frame on which the Saturn V's first stage shows empty, in seconds after Start (it has 7 seconds of fuel). */
const FIRST_STAGE_EMPTY = 7.1;
/** The same for the first stage of Gemini 8's rocket, with 11 seconds of fuel. */
const TITAN_FIRST_STAGE_EMPTY = 11.1;
/** Longer than an empty Saturn V first stage, left on, takes to drop by itself (2 seconds after it is empty). */
const DROPPED_BY_ITSELF = 9.5;
/** Longer than a short message stays before the usual advice comes back (4 seconds). */
const A_SHORT_MESSAGE = 5;
/** What the coach line says from the pad: the rocket starts in the thick air. */
const ON_THE_PAD = 'Go straight up first. The air down here is thick.';
/** What the coach line says when the fuel runs out. */
const OUT_OF_FUEL_LINE =
  'Out of fuel, and not fast enough to stay up. The spacecraft lets go of the rocket and comes down in the ocean under its parachutes. No orbit this time.';

/** The sheet, open on "Fly to orbit". */
const theSheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Fly to orbit' });

/** The three buttons that fly the rocket. */
const theControls = (): HTMLElement =>
  within(theSheet()).getByRole('group', { name: 'Rocket controls' });

/** "Drop it", in the middle of the controls. */
const dropIt = (): HTMLElement => within(theControls()).getByRole('button', { name: 'Drop it' });

/** Open "Fly to orbit" by its address over a flight, at the flight's liftoff. */
const openOver = (id: string): Promise<MountedMission> =>
  mountMission(id, { event: 'liftoff', extra: 'orbit', loadExtra });

/** Open the mission list from the welcome, and "Fly to orbit" from it. */
async function openFromTheList(user: User): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'All missions' }));
  await user.click(screen.getByRole('button', { name: 'Open Fly to orbit' }));
}

/** On the start, open "Try another rocket", pick a flight's rocket, and wait for it to stand on the pad. */
async function pickRocket(user: User, flight: string): Promise<void> {
  await user.click(await within(theSheet()).findByRole('button', { name: 'Try another rocket' }));
  await user.click(within(theSheet()).getByRole('button', { name: `${flight}'s rocket` }));
  await within(theSheet()).findByRole('button', { name: 'Start' });
}

/** Let the flight go on for `seconds`, one frame (a tenth of a second) at a time. */
function flyFor(frames: Frames, seconds: number): void {
  for (let frame = 0; frame < Math.round(seconds * 10); frame += 1) frames.frame();
}

/**
 * Press Start once the rocket is on the pad, and draw the first frame,
 * which has no time in it: from here on each frame is a tenth of a second
 * of flight.
 */
async function start(user: User, frames: Frames): Promise<void> {
  await user.click(await within(theSheet()).findByRole('button', { name: 'Start' }));
  frames.frame();
}

/** Start, press each key at its time, and fly on to orbit. */
async function flyToOrbit(
  user: User,
  frames: Frames,
  presses: readonly Press[],
): Promise<HTMLElement> {
  await start(user, frames);
  let clock = 0;
  for (const [seconds, key] of presses) {
    flyFor(frames, seconds - clock);
    clock = seconds;
    await user.keyboard(key);
  }
  flyFor(frames, TO_ORBIT - clock);
  return within(theSheet()).getByRole('region', { name: 'Up next' });
}

/** Start, and press nothing until the last stage runs dry. */
async function runOutOfFuel(user: User, frames: Frames): Promise<void> {
  await start(user, frames);
  flyFor(frames, OUT_OF_FUEL);
}

/** jsdom has no WebGL: the extra says so in the console and flies over its flat picture. */
const withoutItsView = (): void => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
};

describe('fly to orbit', () => {
  describe('the start screen', () => {
    it('folds the sources of its sentences about the real flights under Start, labeled as theirs', async () => {
      withoutItsView();
      const { user } = await mountMission('apollo-11', { loadExtra });
      await openFromTheList(user);
      await within(theSheet()).findByRole('button', { name: 'Start' });

      const sources = within(theSheet()).getByRole('group', {
        description:
          'Where the sentences on what an orbit is, the climb through the thick air, the computers that steered, and the spacecraft coming down in the ocean come from:',
      });
      expect(sources).toHaveTextContent('Sources (14)');

      await user.click(within(sources).getByText('Sources (14)'));

      expect(sources).toHaveAttribute('open');
      for (const title of [
        'Basics of Space Flight, Chapter 3: Gravity & Mechanics',
        'What Is an Orbit?',
        'Flight To Orbit (Beginners Guide to Aeronautics)',
        'Cards, Launch Vehicle Digital Computer, Saturn V',
        'Apollo 7 Mission Report (MSC-PA-R-68-15)',
        'Gemini Launch Vehicle Development (Gemini Midprogram Conference, NASA SP-121, paper 12)',
        'On the Shoulders of Titans: A History of Project Gemini (NASA SP-4203)',
        'Gemini Program Mission Report: Gemini VIII (MSC-G-R-66-4)',
        'Apollo Experience Report: Abort Planning (NASA TN D-6847)',
      ])
        expect(within(sources).getByText(title)).toBeVisible();
      expect(
        within(sources).getByRole('link', { name: /^Launch Phase, "Return to Earth"/ }),
      ).toHaveAttribute(
        'href',
        'https://ntrs.nasa.gov/api/citations/19720017278/downloads/19720017278.pdf',
      );
    });

    it("says in its practice-toy note that computers steered the real rocket, not the crew, with the flight's own climb time", async () => {
      withoutItsView();

      await openOver('gemini-8');

      expect(
        await within(theSheet()).findByText(
          'A practice toy, not a simulator. Computers steered the real rocket, not the crew, and its climb took about six minutes. The heights and speeds here are not the real ones.',
        ),
      ).toBeVisible();
    });
  });

  describe('the end of a climb to orbit', () => {
    it('keeps focus on the result line, and opened from the list, shows the real orbit and drop times and opens Apollo 11 at its liftoff', async () => {
      withoutItsView();
      const { user, frames } = await mountMission('apollo-11', { loadExtra });
      await openFromTheList(user);

      const next = await flyToOrbit(user, frames, THREE_STAGES);

      expect(within(theSheet()).getByText('You are in orbit.')).toHaveFocus();
      expect(within(theSheet()).getByText('Orbit speed')).toBeVisible();
      expect(within(theSheet()).getByText('Some')).toBeVisible();
      expect(
        within(theSheet()).getByRole('heading', {
          level: 3,
          name: 'Apollo 11: In orbit around Earth',
        }),
      ).toBeVisible();
      expect(
        within(theSheet()).getByText(
          'About 12 minutes after liftoff, Apollo 11 is circling Earth. The crew checks the spacecraft before heading for the Moon.',
        ),
      ).toBeVisible();
      expect(
        within(theSheet()).getByText('July 16, 1969. 11 minutes 49.33 seconds after liftoff.'),
      ).toBeVisible();
      expect(
        within(theSheet()).getByText(
          'The real first stage dropped away at 2 minutes 42.30 seconds.',
        ),
      ).toBeVisible();
      expect(
        within(theSheet()).getByText(
          'The real second stage dropped away at 9 minutes 9.00 seconds.',
        ),
      ).toBeVisible();
      expect(
        within(next).getByRole('heading', { level: 3, name: 'See the real liftoff' }),
      ).toBeVisible();
      expect(within(next).getByText('Apollo 11, July 1969')).toBeVisible();
      expect(
        within(next).getByText('Opens at liftoff. Fly it to collect its patch.'),
      ).toBeVisible();

      await user.click(within(next).getByRole('button', { name: 'Fly Apollo 11' }));

      expect(navigation.address).toBe('http://localhost:3000/?mission=apollo-11&event=liftoff');
    });

    it("opened over Gemini 8 at its liftoff, flies that flight's two stages, shows its own orbit, and offers the way back to it", async () => {
      withoutItsView();
      const { user, frames } = await openOver('gemini-8');
      expect(
        await within(theSheet()).findByText(
          "Gemini 8's rocket: the Titan II Gemini Launch Vehicle",
        ),
      ).toBeVisible();

      const next = await flyToOrbit(user, frames, TWO_STAGES);

      expect(within(theSheet()).getByText('You are in orbit.')).toHaveFocus();
      expect(
        within(theSheet()).getByRole('heading', { level: 3, name: 'Gemini 8: In orbit' }),
      ).toBeVisible();
      expect(
        within(theSheet()).getByText('March 16, 1966. 6 minutes 5.66 seconds after liftoff.'),
      ).toBeVisible();
      expect(
        within(theSheet()).getByText(
          'The real first stage dropped away at 2 minutes 35.29 seconds.',
        ),
      ).toBeVisible();
      expect(within(theSheet()).queryByText(/^The real second stage/)).not.toBeInTheDocument();
      expect(
        within(next).getByRole('heading', { level: 3, name: 'Pick up Gemini 8 after liftoff' }),
      ).toBeVisible();
      expect(next).toHaveTextContent('Your flight is waiting where you left it.');
      expect(within(next).queryByRole('button', { name: /^Fly / })).not.toBeInTheDocument();

      await user.click(within(next).getByRole('button', { name: 'Back to Gemini 8' }));

      expect(screen.queryByRole('dialog', { name: 'Fly to orbit' })).not.toBeInTheDocument();
    });

    it('opened over Apollo 12, whose story has no event at orbit insertion, ends on its liftoff with the day alone and its real drop times', async () => {
      withoutItsView();
      const { user, frames } = await openOver('apollo-12');
      expect(await within(theSheet()).findByText("Apollo 12's rocket: the Saturn V")).toBeVisible();

      const next = await flyToOrbit(user, frames, THREE_STAGES);

      expect(within(theSheet()).getByText('You are in orbit.')).toHaveFocus();
      expect(
        within(theSheet()).getByRole('heading', { level: 3, name: 'Apollo 12: Liftoff' }),
      ).toBeVisible();
      expect(
        within(theSheet()).getByText(
          'A Saturn V rocket lifts Apollo 12 off its launch pad in Florida, up into rain and thick gray clouds.',
        ),
      ).toBeVisible();
      expect(within(theSheet()).getByText('November 14, 1969.')).toBeVisible();
      expect(
        within(theSheet()).getByText(
          'The real first stage dropped away at 2 minutes 42.4 seconds.',
        ),
      ).toBeVisible();
      expect(
        within(theSheet()).getByText(
          'The real second stage dropped away at 9 minutes 13.20 seconds.',
        ),
      ).toBeVisible();
      expect(
        within(next).getByRole('heading', { level: 3, name: 'Pick up Apollo 12 after liftoff' }),
      ).toBeVisible();
    });

    it("flies Gemini 12's Titan II to orbit with two stages and one drop, though its orbit came long after its second stage let go", async () => {
      withoutItsView();
      const { user, frames } = await openOver('gemini-12');
      expect(
        await within(theSheet()).findByText(
          "Gemini 12's rocket: the Titan II Gemini Launch Vehicle",
        ),
      ).toBeVisible();

      await flyToOrbit(user, frames, TWO_STAGES);

      expect(within(theSheet()).getByText('You are in orbit.')).toHaveFocus();
      expect(
        within(theSheet()).getByText(
          'The real first stage dropped away at 2 minutes 35.45 seconds.',
        ),
      ).toBeVisible();
      expect(within(theSheet()).queryByText(/^The real second stage/)).not.toBeInTheDocument();
      expect(
        within(theSheet()).getByRole('heading', { level: 3, name: 'Gemini 12: Liftoff' }),
      ).toBeVisible();
    });

    it('climbs again from the pad with Try again, with Drop it to hand', async () => {
      withoutItsView();
      const { user, frames } = await openOver('apollo-11');
      const next = await flyToOrbit(user, frames, THREE_STAGES);

      await user.click(within(next).getByRole('button', { name: 'Try again' }));

      expect(dropIt()).toHaveFocus();
      expect(within(theSheet()).queryByRole('region', { name: 'Up next' })).not.toBeInTheDocument();
      expect(within(theSheet()).getByText('Straight up')).toBeVisible();
      expect(within(theSheet()).getByText('First stage fuel')).toBeVisible();
      expect(within(theSheet()).getByText(ON_THE_PAD)).toBeVisible();
    });
  });

  describe('running out of fuel', () => {
    it('says the fuel ran out with focus on it, turns the controls off, and offers no Up next', async () => {
      withoutItsView();
      const { user, frames } = await openOver('apollo-11');

      await runOutOfFuel(user, frames);

      expect(within(theSheet()).getByText(OUT_OF_FUEL_LINE)).toHaveFocus();
      for (const name of ['Tip back', 'Drop it', 'Tip over'])
        expect(within(theControls()).getByRole('button', { name })).toBeDisabled();
      expect(within(theSheet()).queryByRole('region', { name: 'Up next' })).not.toBeInTheDocument();
      expect(within(theSheet()).getByRole('button', { name: 'Try again' })).toBeVisible();
      expect(
        within(theSheet()).queryByRole('button', { name: 'Start over' }),
      ).not.toBeInTheDocument();
    });

    it('climbs again from the pad with Try again, with the controls back on and Drop it to hand', async () => {
      withoutItsView();
      const { user, frames } = await openOver('apollo-11');
      await runOutOfFuel(user, frames);

      await user.click(within(theSheet()).getByRole('button', { name: 'Try again' }));

      expect(dropIt()).toHaveFocus();
      for (const name of ['Tip back', 'Drop it', 'Tip over'])
        expect(within(theControls()).getByRole('button', { name })).toBeEnabled();
      expect(within(theSheet()).getByText(ON_THE_PAD)).toBeVisible();
      expect(within(theSheet()).getByRole('button', { name: 'Start over' })).toBeVisible();
    });
  });

  describe('messages', () => {
    it('says why after tipping too far in the thick air, and the run carries on', async () => {
      withoutItsView();
      const { user, frames } = await openOver('apollo-11');
      await start(user, frames);

      await user.keyboard('{ArrowRight}{ArrowRight}');

      expect(
        within(theSheet()).getByText('The air is too thick to tip that far. Climb higher first.'),
      ).toBeVisible();
      expect(within(theSheet()).getByText('Leaning over')).toBeVisible();
      expect(within(theControls()).getByRole('button', { name: 'Tip over' })).toBeEnabled();

      flyFor(frames, A_SHORT_MESSAGE);

      expect(
        within(theSheet()).getByText('The air is thin now. Start tipping over.'),
      ).toBeVisible();
      expect(within(theSheet()).queryByRole('region', { name: 'Up next' })).not.toBeInTheDocument();
    });

    it('says Not yet when Drop it is pressed while the stage still has fuel', async () => {
      withoutItsView();
      const { user, frames } = await openOver('apollo-11');
      await start(user, frames);

      await user.click(dropIt());

      expect(
        within(theSheet()).getByText('Not yet. The first stage still has fuel.'),
      ).toBeVisible();
      expect(within(theSheet()).getByText('First stage fuel')).toBeVisible();
    });

    it('says so when an empty stage is left on and drops by itself', async () => {
      withoutItsView();
      const { user, frames } = await openOver('apollo-11');
      await start(user, frames);

      flyFor(frames, DROPPED_BY_ITSELF);

      expect(within(theSheet()).getByText('The first stage dropped by itself.')).toBeVisible();
      expect(within(theSheet()).getByText('Second stage fuel')).toBeVisible();
    });
  });

  describe('the keyboard', () => {
    it('tips over one step with the right arrow, and back with the left arrow', async () => {
      withoutItsView();
      const { user, frames } = await openOver('apollo-11');
      await start(user, frames);
      expect(within(theSheet()).getByText('Straight up')).toBeVisible();

      await user.keyboard('{ArrowRight}');

      expect(within(theSheet()).getByText('Leaning over')).toBeVisible();

      await user.keyboard('{ArrowLeft}');

      expect(within(theSheet()).getByText('Straight up')).toBeVisible();
    });

    it('drops an empty stage with the space bar', async () => {
      withoutItsView();
      const { user, frames } = await openOver('apollo-11');
      await start(user, frames);
      flyFor(frames, FIRST_STAGE_EMPTY);

      await user.keyboard('[Space]');

      expect(within(theSheet()).getByText('Second stage fuel')).toBeVisible();
      expect(dropIt()).toHaveAccessibleDescription('when a stage is empty');
    });

    it('tips over instead of dropping when the space bar is pressed on Tip over, reached with Tab', async () => {
      withoutItsView();
      const { user, frames } = await openOver('apollo-11');
      await start(user, frames);
      flyFor(frames, FIRST_STAGE_EMPTY);
      await user.tab();
      expect(within(theControls()).getByRole('button', { name: 'Tip over' })).toHaveFocus();

      await user.keyboard('[Space]');

      expect(within(theSheet()).getByText('Leaning over')).toBeVisible();
      expect(within(theSheet()).getByText('First stage fuel')).toBeVisible();
      expect(dropIt()).toHaveAccessibleDescription('the first stage');
    });

    it('tips over with a click on Tip over, and leaves the focus on Drop it', async () => {
      withoutItsView();
      const { user, frames } = await openOver('apollo-11');
      await start(user, frames);

      await user.click(within(theControls()).getByRole('button', { name: 'Tip over' }));

      expect(within(theSheet()).getByText('Leaning over')).toBeVisible();
      expect(dropIt()).toHaveFocus();
    });

    it('still drops an empty stage with the space bar after a click on Tip over', async () => {
      withoutItsView();
      const { user, frames } = await openOver('apollo-11');
      await start(user, frames);
      await user.click(within(theControls()).getByRole('button', { name: 'Tip over' }));
      flyFor(frames, FIRST_STAGE_EMPTY);

      await user.keyboard('[Space]');

      expect(within(theSheet()).getByText('Second stage fuel')).toBeVisible();
      expect(dropIt()).toHaveAccessibleDescription('when a stage is empty');
    });

    it('does nothing with a key before Start', async () => {
      withoutItsView();
      const { user } = await openOver('apollo-11');
      const startButton = await within(theSheet()).findByRole('button', { name: 'Start' });

      await user.keyboard('{ArrowRight}{ArrowLeft}');

      expect(startButton).toBeVisible();
      expect(
        within(theSheet()).getByRole('img', {
          name: 'The rocket standing on the launch pad. High above it, a dashed line marks orbit.',
        }),
      ).toBeInTheDocument();
      expect(
        within(theSheet()).queryByRole('group', { name: 'Rocket controls' }),
      ).not.toBeInTheDocument();
    });

    it('does nothing with a key once the run is over', async () => {
      withoutItsView();
      const { user, frames } = await openOver('apollo-11');
      await runOutOfFuel(user, frames);

      await user.keyboard('{ArrowRight}[Space]');

      expect(within(theSheet()).getByText('Straight up')).toBeVisible();
      expect(within(theSheet()).getByText(OUT_OF_FUEL_LINE)).toHaveFocus();
    });
  });

  describe('drop it', () => {
    it('keeps the focus while there is nothing to drop, and says when it can be used', async () => {
      withoutItsView();
      const { user, frames } = await openOver('apollo-11');

      await start(user, frames);

      expect(dropIt()).toHaveFocus();
      expect(dropIt()).toBeEnabled();
      expect(dropIt()).toHaveAttribute('aria-disabled', 'true');
      expect(dropIt()).toHaveAccessibleDescription('when a stage is empty');
    });

    it('names the stage to drop once it is empty', async () => {
      withoutItsView();
      const { user, frames } = await openOver('apollo-11');
      await start(user, frames);

      flyFor(frames, FIRST_STAGE_EMPTY);

      expect(dropIt()).toHaveAccessibleDescription('the first stage');
      expect(dropIt()).not.toHaveAttribute('aria-disabled');
      expect(dropIt()).toHaveFocus();
    });
  });

  describe('another rocket', () => {
    it('offers three rockets with Try another rocket, with focus on the first', async () => {
      withoutItsView();
      const { user } = await openOver('apollo-11');

      await user.click(
        await within(theSheet()).findByRole('button', { name: 'Try another rocket' }),
      );

      expect(
        within(theSheet()).getByRole('heading', { level: 3, name: 'Pick a rocket' }),
      ).toBeVisible();
      const choices = within(within(theSheet()).getByRole('list')).getAllByRole('button');
      expect(choices.map((choice) => choice.textContent)).toEqual([
        "Gemini 8's rocket",
        "Apollo 7's rocket",
        "Apollo 11's rocket",
      ]);
      expect(choices[0]).toHaveFocus();
    });

    it('stands the rocket picked on the pad, named for the flight that flew it, with focus on Start', async () => {
      withoutItsView();
      const { user } = await openOver('apollo-11');
      expect(await within(theSheet()).findByText("Apollo 11's rocket: the Saturn V")).toBeVisible();
      await user.click(within(theSheet()).getByRole('button', { name: 'Try another rocket' }));

      await user.click(within(theSheet()).getByRole('button', { name: "Gemini 8's rocket" }));

      expect(await within(theSheet()).findByRole('button', { name: 'Start' })).toHaveFocus();
      expect(
        within(theSheet()).getByText("Gemini 8's rocket: the Titan II Gemini Launch Vehicle"),
      ).toBeVisible();
      expect(
        within(theSheet()).queryByText("Apollo 11's rocket: the Saturn V"),
      ).not.toBeInTheDocument();
    });

    it('flies the rocket picked with its own stages: of two, the second is the last', async () => {
      withoutItsView();
      const { user, frames } = await openOver('apollo-11');
      await pickRocket(user, 'Gemini 8');
      await start(user, frames);
      flyFor(frames, TITAN_FIRST_STAGE_EMPTY);
      await user.keyboard('[Space]');
      expect(within(theSheet()).getByText('Second stage fuel')).toBeVisible();

      await user.keyboard('[Space]');

      expect(
        within(theSheet()).getByText('This is the last stage. It stays on all the way to orbit.'),
      ).toBeVisible();
    });
  });
});
