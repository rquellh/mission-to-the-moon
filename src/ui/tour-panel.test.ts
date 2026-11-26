/**
 * The guided tour in the moment card, on Gemini 3's six stops: where the
 * tour is, the trip to the next stop, Skip, the ways out, and the tour
 * handing over to the end of the flight (whose own details are in
 * ending.test.ts). How long a trip takes and when the camera moves
 * belong to the tour itself (src/app/tour.test.ts); here the frames only
 * carry each trip to its end.
 */
import { describe, expect, it } from 'vitest';
import { copy } from '../content/copy.ts';
import {
  mountMission,
  navigation,
  screen,
  sound,
  within,
  type Frames,
  type User,
} from '../test/test-utils.ts';

/** Longer than any trip between two stops takes. */
const A_WHOLE_TRIP = 16;

const theCard = (): HTMLElement => screen.getByRole('region', { name: 'What is happening' });

/** Press Next and let the frames carry the tour to the next stop. */
async function travelToNextStop(user: User, frames: Frames): Promise<void> {
  await user.click(screen.getByRole('button', { name: /^(Next|Finish)$/ }));
  frames.advance(A_WHOLE_TRIP);
}

describe('the tour panel', () => {
  describe('rendering', () => {
    it('says which stop this is, out of how many, in the card under the stop', async () => {
      await mountMission('gemini-3', { start: 'tour' });

      const panel = within(theCard()).getByRole('region', { name: 'Guided tour' });
      expect(panel).toHaveTextContent('Stop 1 of 6');
      expect(within(panel).getByRole('button', { name: 'Back' })).toBeDisabled();
      expect(within(panel).getByRole('button', { name: 'Next' })).toHaveFocus();
      expect(
        within(theCard()).getByRole('heading', { level: 3, name: 'Liftoff' }),
      ).toBeInTheDocument();
    });

    it('takes the place of Controls, and rests Play, on a wide screen', async () => {
      await mountMission('gemini-3', { start: 'tour', wide: true });

      expect(within(theCard()).queryByRole('button', { name: 'Controls' })).not.toBeInTheDocument();
      expect(within(theCard()).getByRole('button', { name: 'Play' })).toBeDisabled();
    });

    it('keeps "Tell me more" open on the tour, following it from stop to stop', async () => {
      const { user, frames } = await mountMission('gemini-3', { start: 'tour' });

      await user.click(within(theCard()).getByRole('button', { name: 'Tell me more' }));
      expect(screen.getByRole('region', { name: 'Liftoff' })).toBeVisible();
      await travelToNextStop(user, frames);

      expect(screen.getByRole('region', { name: 'The first orbit change' })).toBeVisible();
      expect(within(theCard()).getByRole('button', { name: 'Tell me more' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });
  });

  describe('traveling', () => {
    it('sets off for the next stop, and arrives when the trip is over', async () => {
      const { user, frames } = await mountMission('gemini-3', { start: 'tour' });
      const panel = screen.getByRole('region', { name: 'Guided tour' });

      await user.click(within(panel).getByRole('button', { name: 'Next' }));

      expect(panel).toHaveTextContent('On the way to Stop 2 of 6');
      expect(within(panel).getByRole('button', { name: 'Skip to this stop' })).toHaveTextContent(
        'Skip',
      );
      // The card stays on the stop just left until the clock reaches the next one.
      expect(
        within(theCard()).getByRole('heading', { level: 3, name: 'Liftoff' }),
      ).toBeInTheDocument();

      frames.advance(A_WHOLE_TRIP);

      expect(panel).toHaveTextContent('Stop 2 of 6');
      expect(panel).not.toHaveTextContent('On the way to');
      expect(within(panel).getByRole('button', { name: 'Next' })).toBeEnabled();
      expect(
        within(theCard()).getByRole('heading', { level: 3, name: 'The first orbit change' }),
      ).toBeInTheDocument();
    });

    it('skips the rest of the trip and arrives at once', async () => {
      const { user, frames } = await mountMission('gemini-3', { start: 'tour' });
      const panel = screen.getByRole('region', { name: 'Guided tour' });
      await user.click(within(panel).getByRole('button', { name: 'Next' }));
      frames.advance(0.5);

      await user.click(within(panel).getByRole('button', { name: 'Skip to this stop' }));

      expect(panel).toHaveTextContent('Stop 2 of 6');
      expect(panel).not.toHaveTextContent('On the way to');
      expect(within(panel).getByRole('button', { name: 'Next' })).toHaveFocus();
    });

    it('goes back to the stop before', async () => {
      const { user, frames } = await mountMission('gemini-3', { start: 'tour' });
      await travelToNextStop(user, frames);

      await user.click(screen.getByRole('button', { name: 'Back' }));
      frames.advance(A_WHOLE_TRIP);

      expect(screen.getByRole('region', { name: 'Guided tour' })).toHaveTextContent('Stop 1 of 6');
      expect(
        within(theCard()).getByRole('heading', { level: 3, name: 'Liftoff' }),
      ).toBeInTheDocument();
    });

    it('offers "Try it" at a stop, and holds it back on the way, even on the stop just left', async () => {
      // Gemini 8's tour starts at the target's launch, before its own liftoff, which has "Try it".
      const { user, frames } = await mountMission('gemini-8', { start: 'tour' });
      await travelToNextStop(user, frames);
      expect(within(theCard()).getByRole('heading', { level: 3 })).toHaveTextContent('Liftoff');
      expect(
        within(theCard()).getByRole('button', { name: 'Try it: Drop the stages' }),
      ).toBeVisible();

      await user.click(screen.getByRole('button', { name: 'Next' }));

      expect(screen.getByRole('region', { name: 'Guided tour' })).toHaveTextContent(
        'On the way to',
      );
      expect(within(theCard()).getByRole('heading', { level: 3 })).toHaveTextContent('Liftoff');
      expect(
        within(theCard()).queryByRole('button', { name: 'Try it: Drop the stages' }),
      ).not.toBeInTheDocument();
    });

    it('stops a recording playing on the card as the tour sets off for the next stop', async () => {
      // On a tour of key moments: on Apollo 11's tour of every event, the landing turns straight to the first step (below).
      const { user, frames } = await mountMission('apollo-11', {
        start: 'tour',
        story: (mission) => ({ ...mission, tour: 'key-moments' }),
      });
      // Next and Skip to the landing, the sixth stop.
      for (let stop = 2; stop <= 6; stop += 1) {
        await user.click(screen.getByRole('button', { name: 'Next' }));
        frames.advance(0.5);
        await user.click(screen.getByRole('button', { name: 'Skip to this stop' }));
      }
      await user.click(
        within(theCard()).getByRole('button', { name: 'Listen to the recording, 15 seconds' }),
      );
      sound.starts();
      expect(
        within(theCard()).getByRole('button', { name: 'Pause the recording' }),
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Next' }));

      expect(
        within(theCard()).getByRole('heading', { level: 3, name: 'The Eagle has landed' }),
      ).toBeInTheDocument();
      expect(
        within(theCard()).getByRole('button', { name: 'Listen to the recording, 15 seconds' }),
      ).toBeInTheDocument();
    });
  });

  // Apollo 11 rides along through every event. On the Moon's surface nothing moves between
  // two stops, so Next and Back turn straight to the next page.
  // At a stop that rests after its event, the clock reaches the event, holds there, and plays on
  // to where it rests, with the stop's card showing: the panel says the tour is at the stop.
  describe("a stop's own action", () => {
    const thePanel = (): HTMLElement => screen.getByRole('region', { name: 'Guided tour' });

    /** The panel and card while the stop's own action plays: at the stop, with Skip still on to where it rests. */
    function expectAtTheStop(stop: string, title: string): void {
      expect(within(theCard()).getByRole('heading', { level: 3, name: title })).toBeInTheDocument();
      expect(thePanel()).toHaveTextContent(stop);
      expect(thePanel()).not.toHaveTextContent('On the way');
      expect(screen.getByRole('button', { name: 'Skip to this stop' })).toBeInTheDocument();
    }

    it('reads the stop on show while a part falls away under its card (Apollo 11, a tour of every event)', async () => {
      const { user, frames } = await mountMission('apollo-11', { start: 'tour' });
      await user.click(screen.getByRole('button', { name: 'Next' }));
      frames.advance(3);
      expect(thePanel()).toHaveTextContent('On the way to Stop 2 of 25');

      // The clock holds on the first stage separating, then plays on as it falls away.
      frames.advance(3);
      expectAtTheStop('Stop 2 of 25', 'First stage separates');
      frames.advance(2);
      expectAtTheStop('Stop 2 of 25', 'First stage separates');

      frames.advance(A_WHOLE_TRIP);
      expect(thePanel()).toHaveTextContent('Stop 2 of 25');
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    });

    it('reads the stop on show while two craft part under its card (Apollo 11, a tour of key moments)', async () => {
      const { user, frames } = await mountMission('apollo-11', {
        start: 'tour',
        story: (mission) => ({ ...mission, tour: 'key-moments' }),
      });
      // Next and Skip to "Into orbit around the Moon", the fourth stop.
      for (let stop = 2; stop <= 4; stop += 1) {
        await user.click(screen.getByRole('button', { name: 'Next' }));
        frames.advance(0.5);
        await user.click(screen.getByRole('button', { name: 'Skip to this stop' }));
      }
      await user.click(screen.getByRole('button', { name: 'Next' }));
      frames.advance(6);
      expect(thePanel()).toHaveTextContent('On the way to Stop 5 of 12');

      // The clock holds on Eagle undocking, then plays on as the two part.
      frames.advance(7);
      expectAtTheStop('Stop 5 of 12', 'Eagle undocks');
      frames.advance(3);
      expectAtTheStop('Stop 5 of 12', 'Eagle undocks');

      frames.advance(A_WHOLE_TRIP);
      expect(thePanel()).toHaveTextContent('Stop 5 of 12');
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    });
  });

  describe('turning the page', () => {
    const thePanel = (): HTMLElement => screen.getByRole('region', { name: 'Guided tour' });

    /** Apollo 11's tour at the landing, its twelfth stop, reached with Next and Skip. */
    async function atTheLanding(): Promise<{ user: User; frames: Frames }> {
      const mounted = await mountMission('apollo-11', { start: 'tour' });
      for (let stop = 2; stop <= 12; stop += 1) {
        await mounted.user.click(screen.getByRole('button', { name: 'Next' }));
        mounted.frames.advance(0.5);
        await mounted.user.click(screen.getByRole('button', { name: 'Skip to this stop' }));
      }
      expect(
        within(theCard()).getByRole('heading', { level: 3, name: 'The Eagle has landed' }),
      ).toBeInTheDocument();
      return mounted;
    }

    it('Next shows the next stop at once, with nothing to wait for', async () => {
      const { user } = await atTheLanding();

      await user.click(screen.getByRole('button', { name: 'Next' }));

      expect(thePanel()).toHaveTextContent('Stop 13 of 25');
      expect(thePanel()).not.toHaveTextContent('On the way');
      expect(
        within(theCard()).getByRole('heading', { level: 3, name: 'First step on the Moon' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
    });

    it('Back does the same', async () => {
      const { user } = await atTheLanding();
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await user.click(screen.getByRole('button', { name: 'Next' }));
      expect(thePanel()).toHaveTextContent('Stop 14 of 25');

      await user.click(screen.getByRole('button', { name: 'Back' }));

      expect(thePanel()).toHaveTextContent('Stop 13 of 25');
      expect(thePanel()).not.toHaveTextContent('On the way');
      expect(
        within(theCard()).getByRole('heading', { level: 3, name: 'First step on the Moon' }),
      ).toBeInTheDocument();
    });
  });

  // The mark by the clock is out of sight on the tour, so the panel says it on a trip.
  // On the screen a dot stands between "Fast forward" and the count; screen readers skip it.
  describe('fast forward', () => {
    const thePanel = (): HTMLElement => screen.getByRole('region', { name: 'Guided tour' });

    it('says "Fast forward" on a trip while the clock runs fast, then counts the orbits', async () => {
      const { user, director } = await mountMission('gemini-3', { start: 'tour' });
      await user.click(within(thePanel()).getByRole('button', { name: 'Next' }));

      director.setFastForward(true);

      const mark = within(thePanel()).getByText('Fast forward');
      expect(mark).toBeVisible();
      expect(mark).toHaveTextContent(/^Fast forward$/);
      expect(mark).toHaveAttribute('title', copy.timeline.fastForwardHint);
      expect(thePanel()).toHaveTextContent('On the way to Stop 2 of 6');

      director.setFastForwardLaps(1.5);
      expect(mark).toHaveTextContent(/^Fast forward 1 orbit$/);

      director.setFastForwardLaps(12.2);
      expect(mark).toHaveTextContent(/^Fast forward 12 orbits$/);
      expect(within(thePanel()).getByText('12 orbits')).toBeVisible();
    });

    it('says nothing of it at a stop', async () => {
      const { director } = await mountMission('gemini-3', { start: 'tour' });

      director.setFastForward(true);
      director.setFastForwardLaps(3.5);

      expect(thePanel()).toHaveTextContent('Stop 1 of 6');
      expect(within(thePanel()).queryByText('Fast forward')).not.toBeInTheDocument();
    });

    it('goes when the clock slows down again, on the same trip', async () => {
      const { user, director } = await mountMission('gemini-3', { start: 'tour' });
      await user.click(within(thePanel()).getByRole('button', { name: 'Next' }));
      director.setFastForward(true);
      director.setFastForwardLaps(4.1);
      expect(within(thePanel()).getByText('4 orbits')).toBeVisible();

      director.setFastForward(false);

      expect(within(thePanel()).queryByText('Fast forward')).not.toBeInTheDocument();
      expect(thePanel()).toHaveTextContent('On the way to Stop 2 of 6');
    });

    it('goes when the trip arrives', async () => {
      const { user, director, frames } = await mountMission('gemini-3', { start: 'tour' });
      await user.click(within(thePanel()).getByRole('button', { name: 'Next' }));
      director.setFastForward(true);
      director.setFastForwardLaps(2.3);
      expect(within(thePanel()).getByText('2 orbits')).toBeVisible();

      frames.advance(A_WHOLE_TRIP);

      expect(thePanel()).toHaveTextContent('Stop 2 of 6');
      expect(thePanel()).not.toHaveTextContent('On the way to');
      expect(within(thePanel()).queryByText('Fast forward')).not.toBeInTheDocument();
    });
  });

  describe('the ending', () => {
    /** Tour Gemini 3 to its last stop. */
    async function atTheLastStop(): Promise<{ user: User; frames: Frames }> {
      const { user, frames } = await mountMission('gemini-3', { start: 'tour' });
      for (let stop = 2; stop <= 6; stop += 1) await travelToNextStop(user, frames);
      return { user, frames };
    }

    it('reads Finish on the last stop, then steps aside for the end of the flight', async () => {
      const { user } = await atTheLastStop();
      const panel = screen.getByRole('region', { name: 'Guided tour' });
      expect(panel).toHaveTextContent('Stop 6 of 6');

      await user.click(within(panel).getByRole('button', { name: 'Finish' }));

      expect(screen.queryByRole('region', { name: 'Guided tour' })).not.toBeInTheDocument();
      const ending = within(theCard()).getByRole('region', { name: 'That’s the flight!' });
      expect(within(ending).getByRole('heading', { level: 3 })).toHaveFocus();
      expect(ending).toHaveTextContent('Molly Brown comes aboard · March 23, 1965');
      // The ending takes the moment's place in the card.
      expect(within(theCard()).queryByRole('article')).not.toBeInTheDocument();
      expect(
        within(theCard()).queryByRole('button', { name: 'Tell me more' }),
      ).not.toBeInTheDocument();
      expect(within(theCard()).queryByRole('button', { name: 'Play' })).not.toBeInTheDocument();
    });

    it('closes "Tell me more" for the ending', async () => {
      const { user } = await atTheLastStop();
      await user.click(within(theCard()).getByRole('button', { name: 'Tell me more' }));
      expect(screen.getByRole('region', { name: 'Molly Brown comes aboard' })).toBeVisible();

      await user.click(screen.getByRole('button', { name: 'Finish' }));

      expect(
        screen.queryByRole('region', { name: 'Molly Brown comes aboard' }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'That’s the flight!' })).toHaveFocus();
    });

    it('starts the tour again from the first stop', async () => {
      const { user, frames } = await atTheLastStop();
      await user.click(screen.getByRole('button', { name: 'Finish' }));

      await user.click(screen.getByRole('button', { name: 'Start the tour again' }));
      frames.advance(A_WHOLE_TRIP);

      expect(screen.queryByRole('region', { name: 'That’s the flight!' })).not.toBeInTheDocument();
      const panel = screen.getByRole('region', { name: 'Guided tour' });
      expect(panel).toHaveTextContent('Stop 1 of 6');
      expect(within(panel).getByRole('button', { name: 'Next' })).toHaveFocus();
    });

    it('takes the next flight as a tour too', async () => {
      const { user } = await atTheLastStop();
      await user.click(screen.getByRole('button', { name: 'Finish' }));

      await user.click(screen.getByRole('button', { name: 'Next: Gemini 4' }));

      expect(navigation.address).toBe('http://localhost:3000/?mission=gemini-4&start=tour');
    });

    it('hands over to exploring with Explore on my own, at the last stop', async () => {
      const { user } = await atTheLastStop();
      await user.click(screen.getByRole('button', { name: 'Finish' }));
      await user.click(screen.getByRole('button', { name: 'More to explore' }));

      await user.click(screen.getByRole('button', { name: 'Explore on my own' }));

      expect(screen.queryByRole('region', { name: 'That’s the flight!' })).not.toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Guided tour' })).not.toBeInTheDocument();
      expect(document.body).not.toHaveClass('is-touring');
      expect(within(theCard()).getByRole('button', { name: 'Play' })).toHaveFocus();
      expect(
        within(theCard()).getByRole('heading', { level: 3, name: 'Molly Brown comes aboard' }),
      ).toBeInTheDocument();
    });

    it("leaves the ending for exploring from the mission list's Explore too", async () => {
      const { user } = await atTheLastStop();
      await user.click(screen.getByRole('button', { name: 'Finish' }));
      await user.click(screen.getByRole('button', { name: /all missions$/ }));

      await user.click(screen.getByRole('button', { name: 'Explore Gemini 3' }));

      expect(screen.queryByRole('region', { name: 'That’s the flight!' })).not.toBeInTheDocument();
      expect(document.body).not.toHaveClass('is-touring');
      expect(within(theCard()).getByRole('button', { name: 'Play' })).toHaveFocus();
    });
  });

  describe('leaving', () => {
    it('leaves the tour where it is and gives the card Play and Controls back', async () => {
      const { user, frames } = await mountMission('gemini-3', { start: 'tour', wide: true });
      await travelToNextStop(user, frames);

      await user.click(screen.getByRole('button', { name: 'Exit tour' }));

      expect(screen.queryByRole('region', { name: 'Guided tour' })).not.toBeInTheDocument();
      expect(document.body).not.toHaveClass('is-touring');
      expect(within(theCard()).getByRole('button', { name: 'Play' })).toHaveFocus();
      await user.click(within(theCard()).getByRole('button', { name: 'Controls' }));
      const timeline = screen.getByRole('region', { name: 'Timeline' });
      expect(within(timeline).getByText('01:33:00')).toBeVisible();
      expect(within(timeline).getByRole('button', { name: 'Next event' })).toBeEnabled();
    });
  });
});
