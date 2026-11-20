/**
 * The guided tour's panel, on Gemini 3's six stops: where the tour is, the
 * trip to the next stop, Skip, the ending, and the ways out. How long a trip
 * takes and when the camera moves belong to the tour itself (src/app/tour.test.ts);
 * here the frames only carry each trip to its end.
 */
import { describe, expect, it } from 'vitest';
import { mountMission, screen, within, type Frames, type User } from '../test/test-utils.ts';

/** Longer than any trip between two stops takes. */
const A_WHOLE_TRIP = 16;

/** Press Next and let the frames carry the tour to the next stop. */
async function travelToNextStop(user: User, frames: Frames): Promise<void> {
  await user.click(screen.getByRole('button', { name: /^(Next|Finish)$/ }));
  frames.advance(A_WHOLE_TRIP);
}

describe('the tour panel', () => {
  describe('rendering', () => {
    it('says which stop this is, out of how many', async () => {
      await mountMission('gemini-3', { start: 'tour' });

      const panel = screen.getByRole('region', { name: 'Guided tour' });
      expect(panel).toHaveTextContent('Stop 1 of 6');
      expect(within(panel).getByRole('button', { name: 'Back' })).toBeDisabled();
      expect(within(panel).getByRole('button', { name: 'Next' })).toHaveFocus();
      expect(screen.getByRole('heading', { level: 3, name: 'Liftoff' })).toBeInTheDocument();
    });
  });

  describe('traveling', () => {
    it('sets off for the next stop, and arrives when the trip is over', async () => {
      const { user, frames } = await mountMission('gemini-3', { start: 'tour' });
      const panel = screen.getByRole('region', { name: 'Guided tour' });

      await user.click(within(panel).getByRole('button', { name: 'Next' }));

      expect(panel).toHaveTextContent('Stop 2 of 6 On the way…');
      expect(within(panel).getByRole('button', { name: 'Skip to this stop' })).toHaveTextContent('Skip');
      expect(screen.getByRole('heading', { level: 3, name: 'The first orbit change' })).toBeInTheDocument();

      frames.advance(A_WHOLE_TRIP);

      expect(panel).toHaveTextContent('Stop 2 of 6');
      expect(panel).not.toHaveTextContent('On the way…');
      expect(within(panel).getByRole('button', { name: 'Next' })).toBeEnabled();
      expect(within(screen.getByRole('region', { name: 'Timeline' })).getByText('01:33:00')).toBeInTheDocument();
    });

    it('skips the rest of the trip and arrives at once', async () => {
      const { user, frames } = await mountMission('gemini-3', { start: 'tour' });
      const panel = screen.getByRole('region', { name: 'Guided tour' });
      await user.click(within(panel).getByRole('button', { name: 'Next' }));
      frames.advance(0.5);

      await user.click(within(panel).getByRole('button', { name: 'Skip to this stop' }));

      expect(panel).toHaveTextContent('Stop 2 of 6');
      expect(panel).not.toHaveTextContent('On the way…');
      expect(within(screen.getByRole('region', { name: 'Timeline' })).getByText('01:33:00')).toBeInTheDocument();
    });

    it('goes back to the stop before', async () => {
      const { user, frames } = await mountMission('gemini-3', { start: 'tour' });
      await travelToNextStop(user, frames);

      await user.click(screen.getByRole('button', { name: 'Back' }));
      frames.advance(A_WHOLE_TRIP);

      expect(screen.getByRole('region', { name: 'Guided tour' })).toHaveTextContent('Stop 1 of 6');
      expect(screen.getByRole('heading', { level: 3, name: 'Liftoff' })).toBeInTheDocument();
    });
  });

  describe('the ending', () => {
    /** Tour Gemini 3 to its last stop. */
    async function atTheLastStop(): Promise<{ user: User; frames: Frames }> {
      const { user, frames } = await mountMission('gemini-3', { start: 'tour' });
      for (let stop = 2; stop <= 6; stop += 1) await travelToNextStop(user, frames);
      return { user, frames };
    }

    it('reads Finish on the last stop, then shows the ending', async () => {
      const { user } = await atTheLastStop();
      const panel = screen.getByRole('region', { name: 'Guided tour' });
      expect(panel).toHaveTextContent('Stop 6 of 6');

      await user.click(within(panel).getByRole('button', { name: 'Finish' }));

      expect(within(panel).getByRole('heading', { name: 'That’s the tour!' })).toHaveFocus();
      expect(screen.queryByRole('article')).not.toBeInTheDocument();
    });

    it('hands over to exploring', async () => {
      const { user } = await atTheLastStop();
      await user.click(screen.getByRole('button', { name: 'Finish' }));

      await user.click(screen.getByRole('button', { name: 'Explore on my own' }));

      expect(screen.queryByRole('region', { name: 'Guided tour' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Play' })).toHaveFocus();
      expect(screen.getByRole('heading', { level: 3, name: 'Molly Brown comes aboard' })).toBeInTheDocument();
    });

    it('starts the tour again from the first stop', async () => {
      const { user, frames } = await atTheLastStop();
      await user.click(screen.getByRole('button', { name: 'Finish' }));

      await user.click(screen.getByRole('button', { name: 'Start the tour again' }));
      frames.advance(A_WHOLE_TRIP);

      const panel = screen.getByRole('region', { name: 'Guided tour' });
      expect(panel).toHaveTextContent('Stop 1 of 6');
      expect(within(panel).getByRole('button', { name: 'Next' })).toHaveFocus();
    });
  });

  describe('leaving', () => {
    it('leaves the tour where it is and gives the timeline and the card their own controls back', async () => {
      const { user, frames } = await mountMission('gemini-3', { start: 'tour' });
      await travelToNextStop(user, frames);

      await user.click(screen.getByRole('button', { name: 'Exit tour' }));

      expect(screen.queryByRole('region', { name: 'Guided tour' })).not.toBeInTheDocument();
      expect(document.body).not.toHaveClass('is-touring');
      const timeline = screen.getByRole('region', { name: 'Timeline' });
      expect(within(timeline).getByText('01:33:00')).toBeInTheDocument();
      expect(within(timeline).getByRole('button', { name: 'Play' })).toHaveFocus();
      expect(within(screen.getByRole('article')).getByRole('button', { name: 'Next event' })).toBeEnabled();
    });
  });
});
