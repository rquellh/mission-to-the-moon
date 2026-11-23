/**
 * The extras sheet, opened from "Try it" on Apollo 11's liftoff, from the
 * mission list, and by an address. The extra inside is a tiny stand-in
 * passed through `loadExtra` (the interface's edge): each real extra's own
 * code is tested on its own (src/extras/<id>/*.test.ts). What is tested
 * here is the sheet: what it pauses and starts again, the ways it closes, a
 * sheet whose extra did not load, and "Up next", which it builds at the end
 * of a run from what the extra says. Which extras "Up next" picks is
 * src/app/related.test.ts's business.
 */
import { describe, expect, it, vi } from 'vitest';
import type { Mission } from '../content/types.ts';
import { extras } from '../extras/index.ts';
import { meta as stages } from '../extras/stages/meta.ts';
import type { Extra, ExtraMeta } from '../extras/types.ts';
import {
  mountMission,
  navigation,
  rememberVisits,
  screen,
  sound,
  within,
  type User,
} from '../test/test-utils.ts';

/** A tiny extra: it says where it was opened, and can close itself or open another mission. */
const tinyStages: Extra = {
  meta: stages,
  mount(host, context, params) {
    const where = document.createElement('p');
    where.textContent = `Opened over ${context.missionId}, at ${params.get('event') ?? 'no event'}`;
    const done = document.createElement('button');
    done.type = 'button';
    done.textContent = 'Done';
    done.addEventListener('click', () => context.close());
    const fly = document.createElement('button');
    fly.type = 'button';
    fly.textContent = 'Fly Gemini 8';
    fly.addEventListener('click', () => context.openMission('gemini-8', { event: 'docking' }));
    host.append(where, done, fly);
    return { dispose() {} };
  },
};

const loadTinyStages = (): Promise<Extra> => Promise.resolve(tinyStages);

/**
 * A tiny extra whose run is over as soon as it opens. It says how it was
 * opened, and ends with "Up next" the way a real one does: back to the
 * flight behind the sheet, or, from the list, the flight of the real docking.
 */
const tinyWithAnEnd = (meta: ExtraMeta): Extra => ({
  meta,
  mount(host, context, params) {
    const where = document.createElement('p');
    const from = context.origin === 'flight' ? 'a flight' : 'the list';
    where.textContent = `${meta.title} for ${params.get('mission') ?? 'no mission'}, opened from ${from}`;
    const runs = document.createElement('p');
    runs.textContent = 'Run 1';
    let run = 1;
    const flight =
      context.summaries.find((summary) => summary.id === context.missionId)?.name ??
      context.missionId;
    const next =
      context.origin === 'flight'
        ? {
            title: `Pick up ${flight}`,
            line: 'Your flight is waiting where you left it.',
            primary: { label: `Back to ${flight}`, run: () => context.close() },
          }
        : {
            title: 'See the real docking',
            line: 'Gemini 8, March 1966',
            sentence: 'Opens at the first docking.',
            mission: 'gemini-8',
            primary: {
              label: 'Fly Gemini 8',
              run: () => context.openMission('gemini-8', { event: 'docking' }),
            },
          };
    const again = {
      label: 'Try again',
      again: true,
      run: () => {
        run += 1;
        runs.textContent = `Run ${run}`;
      },
    };
    const other = { label: 'Pick another', run: () => {} };
    host.append(where, runs, context.upNext({ ...next, actions: [again, other] }));
    return { dispose() {} };
  },
});

/** Every extra opened as a tiny one that ends at once. */
const loadTinyEnds = (id: string): Promise<Extra> => {
  const meta = extras.find((listed) => listed.id === id);
  return meta
    ? Promise.resolve(tinyWithAnEnd(meta))
    : Promise.reject(new Error(`There is no extra "${id}"`));
};

/** Apollo 11 with "Try it" on the landing too, which has a recording (no real event has both). */
const tryItOnTheLanding = (mission: Mission): Mission => ({
  ...mission,
  events: mission.events.map((event) =>
    event.id === 'landing' ? { ...event, handsOn: 'stages' } : event,
  ),
});

/** Try it on Apollo 11's liftoff, and the end of its run: "Up next". */
async function endFromLiftoff(user: User): Promise<HTMLElement> {
  await user.click(screen.getByRole('button', { name: 'Try it: Drop the stages' }));
  return within(screen.getByRole('dialog', { name: 'Drop the stages' })).findByRole('region', {
    name: 'Up next',
  });
}

/** The mission list from the welcome, then an extra from it, and the end of its run. */
async function endFromTheList(user: User, title: string): Promise<HTMLElement> {
  await user.click(screen.getByRole('button', { name: 'All missions' }));
  await user.click(screen.getByRole('button', { name: `Open ${title}` }));
  return within(screen.getByRole('dialog', { name: title })).findByRole('region', {
    name: 'Up next',
  });
}

describe('the extras sheet', () => {
  describe('opening', () => {
    it('opens the extra for the moment it was opened from', async () => {
      const { user } = await mountMission('apollo-11', {
        start: 'explore',
        loadExtra: loadTinyStages,
      });

      await user.click(screen.getByRole('button', { name: 'Try it: Drop the stages' }));

      const sheet = screen.getByRole('dialog', { name: 'Drop the stages' });
      expect(
        await within(sheet).findByText('Opened over apollo-11, at liftoff'),
      ).toBeInTheDocument();
      expect(within(sheet).getByRole('button', { name: 'Close' })).toHaveFocus();
      expect(document.title).toBe('Drop the stages · Mission to the Moon');
    });

    it('rests the clock and the 3D view while open, and starts them again when it closes', async () => {
      const { user, director } = await mountMission('apollo-11', {
        start: 'explore',
        loadExtra: loadTinyStages,
      });
      await user.click(screen.getByRole('button', { name: 'Play' }));

      await user.click(screen.getByRole('button', { name: 'Try it: Drop the stages' }));

      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
      expect(director.drawing).toBe(false);

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog', { name: 'Drop the stages' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
      expect(director.drawing).toBe(true);
    });

    it('pauses a recording that is playing', async () => {
      const { user } = await mountMission('apollo-11', {
        story: tryItOnTheLanding,
        event: 'landing',
        loadExtra: loadTinyStages,
      });
      const card = screen.getByRole('region', { name: 'What is happening' });
      await user.click(
        within(card).getByRole('button', { name: 'Hear the recording, 15 seconds' }),
      );
      sound.starts();

      await user.click(within(card).getByRole('button', { name: 'Try it: Drop the stages' }));

      expect(within(card).getByRole('status')).toHaveTextContent('Recording paused.');
    });
  });

  describe('closing', () => {
    it('closes when the extra asks, putting the page back as it was', async () => {
      const { user } = await mountMission('apollo-11', {
        start: 'explore',
        loadExtra: loadTinyStages,
      });
      const tryIt = screen.getByRole('button', { name: 'Try it: Drop the stages' });
      await user.click(tryIt);
      const sheet = screen.getByRole('dialog', { name: 'Drop the stages' });

      await user.click(await within(sheet).findByRole('button', { name: 'Done' }));

      expect(screen.queryByRole('dialog', { name: 'Drop the stages' })).not.toBeInTheDocument();
      expect(screen.queryByText('Opened over apollo-11, at liftoff')).not.toBeInTheDocument();
      expect(document.title).toBe('Apollo 11 · Mission to the Moon');
      expect(tryIt).toHaveFocus();
    });

    it('lets the extra open another mission', async () => {
      const { user } = await mountMission('apollo-11', {
        start: 'explore',
        loadExtra: loadTinyStages,
      });
      await user.click(screen.getByRole('button', { name: 'Try it: Drop the stages' }));

      await user.click(await screen.findByRole('button', { name: 'Fly Gemini 8' }));

      expect(navigation.address).toBe('http://localhost:3000/?mission=gemini-8&event=docking');
    });
  });

  describe('failing to load', () => {
    it('says the extra did not load and offers to reload it here', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { user } = await mountMission('apollo-11', {
        start: 'explore',
        loadExtra: () => Promise.reject(new Error('The network went away')),
      });
      await user.click(screen.getByRole('button', { name: 'Try it: Drop the stages' }));
      const sheet = screen.getByRole('dialog', { name: 'Drop the stages' });

      expect(await within(sheet).findByRole('status')).toHaveTextContent(
        'Drop the stages did not load. Check your connection and reload the page, or go back to the mission.',
      );
      expect(within(sheet).getByRole('button', { name: 'Back to the mission' })).toHaveFocus();

      await user.click(within(sheet).getByRole('button', { name: 'Reload' }));

      expect(navigation.address).toBe(
        'http://localhost:3000/?mission=apollo-11&event=liftoff&extra=stages',
      );
    });

    it('goes back to the mission', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { user } = await mountMission('apollo-11', {
        start: 'explore',
        loadExtra: () => Promise.reject(new Error('The network went away')),
      });
      await user.click(screen.getByRole('button', { name: 'Try it: Drop the stages' }));

      await user.click(await screen.findByRole('button', { name: 'Back to the mission' }));

      expect(screen.queryByRole('dialog', { name: 'Drop the stages' })).not.toBeInTheDocument();
      expect(document.title).toBe('Apollo 11 · Mission to the Moon');
    });
  });
  describe('up next', () => {
    it('ends a run opened from a moment with the way back to the flight, one pick from each shelf, and no All missions', async () => {
      const { user } = await mountMission('apollo-11', {
        event: 'liftoff',
        wide: true,
        loadExtra: loadTinyEnds,
      });

      const next = await endFromLiftoff(user);

      expect(
        screen.getByText('Drop the stages for apollo-11, opened from a flight'),
      ).toBeInTheDocument();
      expect(
        within(next).getByRole('heading', { level: 3, name: 'Pick up Apollo 11' }),
      ).toBeVisible();
      expect(next).toHaveTextContent('Your flight is waiting where you left it.');
      const toTry = within(next).getByRole('group', { name: 'Try it yourself' });
      expect(within(toTry).getByRole('heading', { level: 4 })).toHaveTextContent(
        'Dock two spacecraft',
      );
      const toExplore = within(next).getByRole('group', { name: 'More to explore' });
      expect(within(toExplore).getByRole('heading', { level: 4 })).toHaveTextContent(
        'Six landings on the Moon',
      );
      expect(within(next).getAllByRole('button')).toEqual([
        within(next).getByRole('button', { name: 'Back to Apollo 11' }),
        within(toTry).getByRole('button', { name: 'Open Dock two spacecraft' }),
        within(toExplore).getByRole('button', { name: 'Open Six landings on the Moon' }),
        within(next).getByRole('button', { name: 'Try again' }),
        within(next).getByRole('button', { name: 'Pick another' }),
      ]);
    });

    it("runs the extra's own next step and quiet actions", async () => {
      const { user } = await mountMission('apollo-11', {
        event: 'liftoff',
        wide: true,
        loadExtra: loadTinyEnds,
      });
      const tryIt = screen.getByRole('button', { name: 'Try it: Drop the stages' });
      const next = await endFromLiftoff(user);

      await user.click(within(next).getByRole('button', { name: 'Try again' }));
      expect(screen.getByText('Run 2')).toBeInTheDocument();

      await user.click(within(next).getByRole('button', { name: 'Back to Apollo 11' }));
      expect(screen.queryByRole('dialog', { name: 'Drop the stages' })).not.toBeInTheDocument();
      expect(tryIt).toHaveFocus();
    });

    it('opens a pick in place of this extra, over the same flight, and gives focus back where it was when the sheet closes', async () => {
      const { user } = await mountMission('apollo-11', {
        event: 'liftoff',
        wide: true,
        loadExtra: loadTinyEnds,
      });
      const tryIt = screen.getByRole('button', { name: 'Try it: Drop the stages' });
      const next = await endFromLiftoff(user);

      await user.click(within(next).getByRole('button', { name: 'Open Dock two spacecraft' }));

      const docking = screen.getByRole('dialog', { name: 'Dock two spacecraft' });
      expect(
        await within(docking).findByText('Dock two spacecraft for apollo-11, opened from a flight'),
      ).toBeInTheDocument();
      expect(
        within(docking).queryByText('Drop the stages for apollo-11, opened from a flight'),
      ).not.toBeInTheDocument();
      expect(document.title).toBe('Dock two spacecraft · Mission to the Moon');

      await user.click(within(docking).getByRole('button', { name: 'Close' }));

      expect(tryIt).toHaveFocus();
      expect(document.title).toBe('Apollo 11 · Mission to the Moon');
    });

    it('ends a run opened from the list with the flight to fly, its patch to collect, and All missions back to the list', async () => {
      const { user } = await mountMission('apollo-11', { wide: true, loadExtra: loadTinyEnds });

      const next = await endFromTheList(user, 'Dock two spacecraft');

      expect(
        screen.getByText('Dock two spacecraft for no mission, opened from the list'),
      ).toBeInTheDocument();
      expect(
        within(next).getByRole('heading', { level: 3, name: 'See the real docking' }),
      ).toBeVisible();
      expect(within(next).getByText('Gemini 8, March 1966')).toBeVisible();
      expect(
        within(next).getByText('Opens at the first docking. Fly it to collect its patch.'),
      ).toBeVisible();
      const toTry = within(next).getByRole('group', { name: 'Try it yourself' });
      expect(within(toTry).getByRole('heading', { level: 4 })).toHaveTextContent('Drop the stages');
      const toExplore = within(next).getByRole('group', { name: 'More to explore' });
      expect(within(toExplore).getByRole('heading', { level: 4 })).toHaveTextContent(
        'Three rockets',
      );

      await user.click(within(next).getByRole('button', { name: 'All missions' }));

      expect(screen.queryByRole('dialog', { name: 'Dock two spacecraft' })).not.toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'All missions' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Open Dock two spacecraft' })).toHaveFocus();
    });

    it('opens the picks for the flight the next step flies', async () => {
      const { user } = await mountMission('apollo-11', { wide: true, loadExtra: loadTinyEnds });
      const next = await endFromTheList(user, 'Dock two spacecraft');

      await user.click(within(next).getByRole('button', { name: 'Open Three rockets' }));

      const rockets = screen.getByRole('dialog', { name: 'Three rockets' });
      expect(
        await within(rockets).findByText('Three rockets for gemini-8, opened from the list'),
      ).toBeInTheDocument();
    });

    it('says nothing of collecting a patch that is collected already', async () => {
      rememberVisits(['gemini-8']);
      const { user } = await mountMission('apollo-11', { wide: true, loadExtra: loadTinyEnds });

      const next = await endFromTheList(user, 'Dock two spacecraft');

      expect(within(next).getByText('Opens at the first docking.')).toBeVisible();
      expect(next).not.toHaveTextContent('collect');
    });

    it('opened by an address over the welcome, comes from the list, and All missions opens the list', async () => {
      const { user } = await mountMission('apollo-11', {
        extra: 'docking',
        wide: true,
        loadExtra: loadTinyEnds,
      });
      const sheet = screen.getByRole('dialog', { name: 'Dock two spacecraft' });
      const next = await within(sheet).findByRole('region', { name: 'Up next' });
      expect(
        within(sheet).getByText('Dock two spacecraft for no mission, opened from the list'),
      ).toBeInTheDocument();

      await user.click(within(next).getByRole('button', { name: 'All missions' }));

      expect(screen.getByRole('dialog', { name: 'All missions' })).toBeVisible();
      await user.keyboard('{Escape}');
      expect(screen.getByRole('button', { name: 'All missions' })).toHaveFocus();
    });

    it('opened by an address that names a moment, or from the end of a flight, comes from the flight', async () => {
      const { user } = await mountMission('gemini-8', {
        event: 'docking',
        extra: 'docking',
        wide: true,
        loadExtra: loadTinyEnds,
      });
      const sheet = screen.getByRole('dialog', { name: 'Dock two spacecraft' });
      const next = await within(sheet).findByRole('region', { name: 'Up next' });
      expect(
        within(sheet).getByText('Dock two spacecraft for gemini-8, opened from a flight'),
      ).toBeInTheDocument();
      expect(within(next).queryByRole('button', { name: 'All missions' })).not.toBeInTheDocument();
      await user.click(within(sheet).getByRole('button', { name: 'Close' }));

      await user.click(
        within(screen.getByRole('region', { name: 'What is happening' })).getByRole('button', {
          name: 'Controls',
        }),
      );
      await user.click(screen.getByRole('slider', { name: 'Mission time' }));
      await user.keyboard('{End}');
      await user.click(screen.getByRole('button', { name: 'Finish' }));
      await user.click(screen.getByRole('button', { name: 'More to explore' }));
      await user.click(screen.getByRole('button', { name: 'Open Three rockets' }));

      expect(
        await screen.findByText('Three rockets for gemini-8, opened from a flight'),
      ).toBeInTheDocument();
    });

    describe('on a phone', () => {
      it('pins the next step, with the run again and More to explore in reach', async () => {
        const { user } = await mountMission('apollo-11', {
          event: 'liftoff',
          loadExtra: loadTinyEnds,
        });

        const next = await endFromLiftoff(user);

        const back = within(next).getByRole('button', { name: 'Back to Apollo 11' });
        const again = within(next).getByRole('button', { name: 'Try again' });
        const more = within(next).getByRole('button', { name: 'More to explore' });
        expect(within(next).getAllByRole('button')).toEqual([back, again, more]);
        expect(more).toHaveAttribute('aria-expanded', 'false');
        expect(within(next).queryByRole('group')).not.toBeInTheDocument();
      });

      it('pulls up the picks and the other ways on with More to explore, and Show less puts them back', async () => {
        const { user } = await mountMission('apollo-11', {
          event: 'liftoff',
          loadExtra: loadTinyEnds,
        });
        const next = await endFromLiftoff(user);
        const more = within(next).getByRole('button', { name: 'More to explore' });

        await user.click(more);

        expect(
          within(next).getByRole('heading', { level: 3, name: 'Pick up Apollo 11' }),
        ).toHaveFocus();
        expect(more).toHaveAttribute('aria-expanded', 'true');
        expect(within(next).getAllByRole('group')).toEqual([
          within(next).getByRole('group', { name: 'Try it yourself' }),
          within(next).getByRole('group', { name: 'More to explore' }),
        ]);
        expect(within(next).getByRole('button', { name: 'Pick another' })).toBeVisible();
        expect(
          within(next).queryByRole('button', { name: 'More to explore' }),
        ).not.toBeInTheDocument();

        await user.click(within(next).getByRole('button', { name: 'Show less' }));

        expect(more).toHaveFocus();
        expect(more).toHaveAttribute('aria-expanded', 'false');
        expect(within(next).queryByRole('group')).not.toBeInTheDocument();
        expect(
          within(next).queryByRole('button', { name: 'Pick another' }),
        ).not.toBeInTheDocument();
      });

      it('puts them back with Escape, and the sheet stays open', async () => {
        const { user } = await mountMission('apollo-11', {
          event: 'liftoff',
          loadExtra: loadTinyEnds,
        });
        const next = await endFromLiftoff(user);
        await user.click(within(next).getByRole('button', { name: 'More to explore' }));

        await user.keyboard('{Escape}');

        expect(within(next).getByRole('button', { name: 'More to explore' })).toHaveFocus();
        expect(screen.getByRole('dialog', { name: 'Drop the stages' })).toBeVisible();
      });
    });
  });
});
