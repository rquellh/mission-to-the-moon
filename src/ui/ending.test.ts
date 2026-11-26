/**
 * The end of every flight, in the moment card: "Finish" once exploring has
 * reached the end of the clock, then the ending in the moment's place (Watch
 * again, the last moment, the patch collected, the next flight, and "More to
 * explore"), the card opened with one pick from each shelf and the quiet
 * ways on, and a device that has flown every flight. Which flight and
 * extras are picked is src/app/related.test.ts's business; the tour's way
 * into the ending is in tour-panel.test.ts.
 */
import { describe, expect, it, vi } from 'vitest';
import { copy } from '../content/copy.ts';
import { summaries } from '../content/missions/index.ts';
import type { Mission } from '../content/types.ts';
import { extras } from '../extras/index.ts';
import type { Extra } from '../extras/types.ts';
import {
  mountMission,
  navigation,
  rememberVisits,
  screen,
  within,
  type Frames,
  type MountedMission,
  type User,
} from '../test/test-utils.ts';

/** Apollo 11 with no moment naming a hands-on extra (every real flight names one). */
const withoutTryIt = (mission: Mission): Mission => ({
  ...mission,
  events: mission.events.map((event) => {
    const plain = { ...event };
    delete plain.handsOn;
    return plain;
  }),
});

/** Each extra opened as a tiny one that says which flight and moment it was opened for. */
const sayWhereOpened = (id: string): Promise<Extra> => {
  const meta = extras.find((listed) => listed.id === id);
  if (!meta) return Promise.reject(new Error(`There is no extra "${id}"`));
  return Promise.resolve({
    meta,
    mount(host, _context, params) {
      const where = document.createElement('p');
      where.textContent = `${meta.title} for ${params.get('mission') ?? 'no mission'}, at ${params.get('event') ?? 'no moment'}`;
      host.append(where);
      return { dispose() {} };
    },
  });
};

const theCard = (): HTMLElement => screen.getByRole('region', { name: 'What is happening' });
const theEnding = (): HTMLElement => screen.getByRole('region', { name: 'That’s the flight!' });

/** Open Controls and press End on the scrubber, then close them: the clock at the end of the flight. */
async function moveToTheEnd(user: User): Promise<void> {
  await user.click(within(theCard()).getByRole('button', { name: 'Controls' }));
  await user.click(screen.getByRole('slider', { name: 'Mission time' }));
  await user.keyboard('{End}');
  await user.click(within(theCard()).getByRole('button', { name: 'Controls' }));
}

/** Apollo 11 at splashdown, its last moment at the end of the clock, with Finish pressed. */
async function atTheEndOfApollo11(
  options: Parameters<typeof mountMission>[1] = {},
): Promise<MountedMission> {
  const mounted = await mountMission('apollo-11', { event: 'splashdown', ...options });
  await mounted.user.click(within(theCard()).getByRole('button', { name: 'Finish' }));
  return mounted;
}

/** Explore a flight to the end of its clock and press Finish. */
async function finishExploring(
  id: string,
  options: Parameters<typeof mountMission>[1] = {},
): Promise<MountedMission> {
  const mounted = await mountMission(id, { start: 'explore', ...options });
  await moveToTheEnd(mounted.user);
  await mounted.user.click(within(theCard()).getByRole('button', { name: 'Finish' }));
  return mounted;
}

/** Longer than any trip between two tour stops takes. */
const A_WHOLE_TRIP = 16;

/** Take Gemini 3's six-stop tour to its last stop and press Finish. */
async function atTheEndOfTheGemini3Tour(): Promise<MountedMission> {
  const mounted = await mountMission('gemini-3', { start: 'tour' });
  for (let stop = 2; stop <= 6; stop += 1) {
    await mounted.user.click(screen.getByRole('button', { name: 'Next' }));
    mounted.frames.advance(A_WHOLE_TRIP);
  }
  await mounted.user.click(screen.getByRole('button', { name: 'Finish' }));
  return mounted;
}

/** Open "More to explore" from the ending line. */
async function openMore(user: User): Promise<HTMLElement> {
  await user.click(within(theEnding()).getByRole('button', { name: 'More to explore' }));
  return theEnding();
}

describe('the end of a flight', () => {
  describe('finishing', () => {
    it('offers Finish only once the clock has reached the end, and keeps the last moment on the card', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore', wide: true });
      expect(within(theCard()).queryByRole('button', { name: 'Finish' })).not.toBeInTheDocument();

      await moveToTheEnd(user);

      expect(within(theCard()).getByRole('button', { name: 'Finish' })).toBeVisible();
      expect(within(theCard()).getByRole('article', { name: 'Splashdown' })).toBeVisible();
      expect(screen.queryByRole('region', { name: 'That’s the flight!' })).not.toBeInTheDocument();

      await user.click(within(theCard()).getByRole('button', { name: 'Controls' }));
      await user.click(screen.getByRole('slider', { name: 'Mission time' }));
      await user.keyboard('{Home}');

      expect(within(theCard()).queryByRole('button', { name: 'Finish' })).not.toBeInTheDocument();
    });

    it('waits at the end for Finish when the flight plays out', async () => {
      const { user, frames } = await mountMission('apollo-11', { event: 'parachutes' });

      await user.click(within(theCard()).getByRole('button', { name: 'Play' }));
      frames.advance(120);

      expect(within(theCard()).getByRole('button', { name: 'Play' })).toBeInTheDocument();
      expect(within(theCard()).getByRole('article', { name: 'Splashdown' })).toBeVisible();
      expect(within(theCard()).getByRole('button', { name: 'Finish' })).toBeVisible();
      expect(screen.queryByRole('region', { name: 'That’s the flight!' })).not.toBeInTheDocument();
    });
  });

  describe('the ending line', () => {
    it("takes the moment's place: the last moment, the patch collected, and the ways on, with focus on its title", async () => {
      await atTheEndOfApollo11();

      const ending = theEnding();
      expect(
        within(ending).getByRole('heading', { level: 3, name: 'That’s the flight!' }),
      ).toHaveFocus();
      expect(ending).toHaveTextContent('Splashdown · July 24, 1969');
      expect(within(ending).getByText('Patch collected · 1 of 21')).toBeVisible();
      const again = within(ending).getByRole('button', { name: 'Watch again' });
      const next = within(ending).getByRole('button', { name: 'Next: Apollo 12' });
      const more = within(ending).getByRole('button', { name: 'More to explore' });
      expect(within(ending).getAllByRole('button')).toEqual([again, next, more]);
      expect(more).toHaveAttribute('aria-expanded', 'false');
      // The moment, its doors, Play, and Controls step aside.
      expect(within(theCard()).queryByRole('article')).not.toBeInTheDocument();
      expect(
        within(theCard()).queryByRole('button', { name: 'Tell me more' }),
      ).not.toBeInTheDocument();
      expect(within(theCard()).queryByRole('button', { name: 'Controls' })).not.toBeInTheDocument();
      expect(within(theCard()).queryByRole('button', { name: 'Play' })).not.toBeInTheDocument();
      expect(within(theCard()).queryByRole('button', { name: 'Finish' })).not.toBeInTheDocument();
    });

    it('closes the tools and "Tell me more" for the ending', async () => {
      const { user } = await mountMission('apollo-11', { event: 'splashdown', wide: true });
      await user.click(within(theCard()).getByRole('button', { name: 'Tell me more' }));
      await user.click(within(theCard()).getByRole('button', { name: 'Controls' }));

      await user.click(within(theCard()).getByRole('button', { name: 'Finish' }));

      expect(screen.queryByRole('region', { name: 'Splashdown' })).not.toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Timeline' })).not.toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'Look at' })).not.toBeInTheDocument();
      expect(within(theEnding()).getByRole('heading', { level: 3 })).toHaveFocus();
    });

    it('ends a flight in Earth orbit with its own last moment, and suggests the docking to try', async () => {
      const { user } = await finishExploring('gemini-8');

      const ending = theEnding();
      expect(ending).toHaveTextContent('Aboard the destroyer · March 17, 1966');
      expect(within(ending).getByRole('button', { name: 'Next: Gemini 9A' })).toBeVisible();

      await openMore(user);

      const toTry = within(ending).getByRole('group', { name: 'Try it yourself' });
      expect(within(toTry).getByRole('heading', { level: 4 })).toHaveTextContent(
        'Dock two spacecraft',
      );
      const toExplore = within(ending).getByRole('group', { name: 'More to explore' });
      expect(within(toExplore).getByRole('heading', { level: 4 })).toHaveTextContent(
        'Three rockets',
      );
    });

    it('counts the flights this device has flown, and suggests the next one not flown yet', async () => {
      rememberVisits(['gemini-3', 'apollo-12']);

      await atTheEndOfApollo11();

      expect(within(theEnding()).getByText('Patch collected · 3 of 21')).toBeVisible();
      expect(within(theEnding()).getByRole('button', { name: 'Next: Apollo 13' })).toBeVisible();
    });

    it('opens the next flight exploring, as this one was explored', async () => {
      const { user } = await atTheEndOfApollo11();

      await user.click(within(theEnding()).getByRole('button', { name: 'Next: Apollo 12' }));

      expect(navigation.address).toBe('http://localhost:3000/?mission=apollo-12&start=explore');
    });
  });

  describe('the patch', () => {
    it("shows the flight's patch, with what it shows, once the card is open", async () => {
      const { user } = await atTheEndOfApollo11();

      const ending = await openMore(user);

      expect(
        within(ending).getByRole('img', {
          name: /^A round patch with a bald eagle landing on the Moon/,
        }),
      ).toBeVisible();
      expect(ending).toHaveTextContent(
        'You flew Apollo 11 from liftoff to splashdown. Its patch is in your book: 1 of 21.',
      );
    });

    it('says the flight is collected, with no picture, when its crew had no patch', async () => {
      const { user } = await finishExploring('gemini-3');

      expect(within(theEnding()).getByText('Flight collected · 1 of 21')).toBeVisible();

      const ending = await openMore(user);

      expect(within(ending).queryByRole('img')).not.toBeInTheDocument();
      expect(ending).toHaveTextContent(
        'You flew Gemini 3 from liftoff to splashdown. Its page in your book is filled in: 1 of 21.',
      );
    });
  });

  describe('more to explore', () => {
    it('opens with focus on its title, and Show less gives focus back to its door', async () => {
      const { user } = await atTheEndOfApollo11();

      const ending = await openMore(user);

      expect(
        within(ending).getByRole('heading', { level: 3, name: 'That’s the flight!' }),
      ).toHaveFocus();
      expect(
        within(ending).queryByRole('button', { name: 'Next: Apollo 12' }),
      ).not.toBeInTheDocument();

      await user.click(within(ending).getByRole('button', { name: 'Show less' }));

      const door = within(ending).getByRole('button', { name: 'More to explore' });
      expect(door).toHaveFocus();
      expect(door).toHaveAttribute('aria-expanded', 'false');
      expect(within(ending).queryByRole('group')).not.toBeInTheDocument();
    });

    it('closes with Escape while focus is inside it', async () => {
      const { user } = await atTheEndOfApollo11({ wide: true });
      await openMore(user);

      await user.keyboard('{Escape}');

      expect(within(theEnding()).getByRole('button', { name: 'More to explore' })).toHaveFocus();
      expect(
        within(theEnding()).queryByRole('button', { name: 'Show less' }),
      ).not.toBeInTheDocument();
    });

    it('offers one pick from each shelf, with the next flight first', async () => {
      const { user } = await atTheEndOfApollo11();

      const ending = await openMore(user);

      const next = within(ending).getByRole('group', { name: 'Next flight' });
      const toTry = within(ending).getByRole('group', { name: 'Try it yourself' });
      const toExplore = within(ending).getByRole('group', { name: 'More to explore' });
      expect(within(ending).getAllByRole('group')).toEqual([next, toTry, toExplore]);
      expect(within(next).getByRole('heading', { level: 4 })).toHaveTextContent('Apollo 12');
      expect(within(next).getByText('November 14–24, 1969')).toBeVisible();
      expect(
        within(next).getByText(/^Apollo 12 was the second mission to land people on the Moon\./),
      ).toBeVisible();
      expect(within(next).getByRole('button', { name: 'Fly Apollo 12' })).toBeVisible();
      // Still a draft, so it is picked here (the tests run as the dev server does) but not on the published site.
      expect(within(toTry).getByRole('heading', { level: 4 })).toHaveTextContent(
        'Land on the Moon',
      );
      expect(
        within(toTry).getByText(
          "Bring a lunar module down past the boulders to clear ground before the fuel runs out, the way Apollo 11's crew did first.",
        ),
      ).toBeVisible();
      expect(within(toExplore).getByRole('heading', { level: 4 })).toHaveTextContent(
        'Six landings on the Moon',
      );
    });

    it('flies the next flight from its pick', async () => {
      const { user } = await atTheEndOfApollo11();
      const ending = await openMore(user);

      await user.click(within(ending).getByRole('button', { name: 'Fly Apollo 12' }));

      expect(navigation.address).toBe('http://localhost:3000/?mission=apollo-12&start=explore');
    });

    it("opens each extra over the ending, on this flight's page, and gives focus back", async () => {
      const { user } = await finishExploring('gemini-8', { loadExtra: sayWhereOpened });
      const ending = await openMore(user);
      const openDocking = within(ending).getByRole('button', { name: 'Open Dock two spacecraft' });

      await user.click(openDocking);

      const docking = screen.getByRole('dialog', { name: 'Dock two spacecraft' });
      expect(
        await within(docking).findByText('Dock two spacecraft for gemini-8, at no moment'),
      ).toBeInTheDocument();
      await user.click(within(docking).getByRole('button', { name: 'Close' }));
      expect(openDocking).toHaveFocus();

      await user.click(within(ending).getByRole('button', { name: 'Open Three rockets' }));

      const rockets = screen.getByRole('dialog', { name: 'Three rockets' });
      expect(
        await within(rockets).findByText('Three rockets for gemini-8, at no moment'),
      ).toBeInTheDocument();
    });

    it('leaves out the shelf to try when no moment of the flight names something to try', async () => {
      const { user } = await atTheEndOfApollo11({ story: withoutTryIt });

      const ending = await openMore(user);

      expect(within(ending).getAllByRole('group')).toEqual([
        within(ending).getByRole('group', { name: 'Next flight' }),
        within(ending).getByRole('group', { name: 'More to explore' }),
      ]);
    });

    it("opens the mission's own pages, and gives focus back", async () => {
      const { user } = await atTheEndOfApollo11({ wide: true });
      const ending = await openMore(user);
      const about = within(ending).getByRole('button', { name: 'About Apollo 11' });

      await user.click(about);
      expect(screen.getByRole('dialog', { name: 'About Apollo 11' })).toBeVisible();
      await user.keyboard('{Escape}');
      expect(about).toHaveFocus();

      await user.click(within(ending).getByRole('button', { name: 'Sources and credits' }));
      expect(screen.getByRole('dialog', { name: 'Sources and credits' })).toBeVisible();
    });

    it('opens the mission list, and comes back to the ending when it closes', async () => {
      const { user } = await atTheEndOfApollo11();
      const ending = await openMore(user);
      const allMissions = within(ending).getByRole('button', { name: 'All missions, 22 missions' });

      await user.click(allMissions);
      expect(screen.getByRole('dialog', { name: 'All missions' })).toBeVisible();
      await user.keyboard('{Escape}');

      expect(allMissions).toHaveFocus();
      expect(
        within(theEnding()).getByRole('heading', { level: 3, name: 'That’s the flight!' }),
      ).toBeVisible();
    });
  });

  describe('watch again', () => {
    it('starts the flight over from the beginning, playing, and leaves the ending', async () => {
      const { user } = await atTheEndOfApollo11();

      await user.click(within(theEnding()).getByRole('button', { name: 'Watch again' }));

      expect(screen.queryByRole('region', { name: 'That’s the flight!' })).not.toBeInTheDocument();
      expect(within(theCard()).getByRole('article', { name: 'Liftoff' })).toBeVisible();
      expect(within(theCard()).getByRole('button', { name: 'Pause' })).toHaveFocus();
      expect(within(theCard()).queryByRole('button', { name: 'Finish' })).not.toBeInTheDocument();
    });

    it('is also among the quiet ways on, which need no other way to keep exploring', async () => {
      const { user } = await atTheEndOfApollo11();
      const ending = await openMore(user);
      // "Explore on my own" is offered only after the tour (see tour-panel.test.ts).
      expect(
        within(ending).queryByRole('button', { name: 'Explore on my own' }),
      ).not.toBeInTheDocument();

      await user.click(within(ending).getByRole('button', { name: 'Watch again' }));

      expect(within(theCard()).getByRole('article', { name: 'Liftoff' })).toBeVisible();
    });
  });

  describe('every flight flown', () => {
    it('offers the mission list in place of a next flight, and says why', async () => {
      rememberVisits(
        summaries.filter((summary) => summary.kind === 'flight').map((summary) => summary.id),
      );
      const { user } = await atTheEndOfApollo11();
      expect(within(theEnding()).getByText('Patch collected · 21 of 21')).toBeVisible();
      const allMissions = within(theEnding()).getByRole('button', { name: 'All missions' });

      await user.click(allMissions);
      expect(screen.getByRole('dialog', { name: 'All missions' })).toBeVisible();
      await user.keyboard('{Escape}');
      expect(allMissions).toHaveFocus();

      const ending = await openMore(user);
      const next = within(ending).getByRole('group', { name: 'Next flight' });
      expect(next).toHaveTextContent(
        'You have flown every flight! Pick any one to fly again from All missions.',
      );
      expect(within(next).getByRole('button', { name: 'All missions' })).toBeVisible();
      expect(within(next).queryByRole('heading')).not.toBeInTheDocument();
    });
  });

  describe('without a 3D view', () => {
    it('ends the flight the same way', async () => {
      const { user } = await finishExploring('gemini-8', {
        no3D: { note: copy.errors.noWebGL, offerReload: false },
      });

      expect(within(theEnding()).getByRole('heading', { level: 3 })).toHaveFocus();
      const ending = await openMore(user);

      expect(within(ending).getByRole('button', { name: 'Fly Gemini 9A' })).toBeVisible();
    });
  });

  // The announcer waits half a second for things to settle, then speaks on the next frame.
  describe('announcements', () => {
    const settle = (frames: Frames): void => {
      vi.advanceTimersByTime(500);
      frames.frame();
    };

    it('says the tour has ended when the visitor explores on their own from its end', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const { user, frames } = await atTheEndOfTheGemini3Tour();
      await openMore(user);

      await user.click(within(theEnding()).getByRole('button', { name: 'Explore on my own' }));
      settle(frames);

      expect(screen.getByText(copy.tour.ended)).toHaveAttribute('aria-live', 'polite');
    });

    it('says the flight is over, and how full the patch book is', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const { frames } = await atTheEndOfApollo11();

      settle(frames);

      expect(
        screen.getByText(
          'That’s the flight! You flew Apollo 11 from liftoff to splashdown. Its patch is in your book: 1 of 21.',
        ),
      ).toHaveAttribute('aria-live', 'polite');
    });
  });
});
