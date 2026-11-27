/**
 * The guided tour in the moment card, on Gemini 3's six stops: where the
 * tour is, the trip to the next stop, Skip, the ways out, and the tour
 * handing over to the end of the flight (whose own details are in
 * ending.test.ts). How long a trip takes and when the camera moves
 * belong to the tour itself (src/app/tour.test.ts); here the frames only
 * carry each trip to its end.
 */
import { describe, expect, it } from 'vitest';
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
      const { user, frames } = await mountMission('apollo-11', { start: 'tour' });
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
