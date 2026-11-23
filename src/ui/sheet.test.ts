/**
 * The bottom sheet that holds the event card on a phone: its handle, and
 * tapping the compact card to open it. A swipe needs real pointer
 * movement on a real screen, so the browser tests own it.
 */
import { describe, expect, it } from 'vitest';
import { mountMission, screen, within } from '../test/test-utils.ts';

describe('the card sheet', () => {
  describe('the handle', () => {
    it('shows the whole card, then less of it', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });
      const handle = screen.getByRole('button', { name: 'Show the whole card' });
      expect(handle).toHaveAttribute('aria-expanded', 'false');

      await user.click(handle);

      expect(handle).toHaveAttribute('aria-expanded', 'true');
      expect(handle).toHaveAccessibleName('Show less of the card');

      await user.click(handle);

      expect(handle).toHaveAttribute('aria-expanded', 'false');
      expect(handle).toHaveAccessibleName('Show the whole card');
    });

    it('starts the tour with the card showing less', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });
      await user.click(screen.getByRole('button', { name: 'Show the whole card' }));
      await user.click(screen.getByRole('button', { name: /all missions$/ }));

      await user.click(screen.getByRole('button', { name: 'Take the tour of Apollo 11' }));

      expect(screen.getByRole('button', { name: 'Show the whole card' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });
  });

  describe('tapping the card', () => {
    it('opens the compact card on a phone', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });
      const [line] = within(screen.getByRole('article')).getAllByText(
        /^A Saturn V rocket lifts Apollo 11 off/,
      );

      await user.click(line!);

      expect(screen.getByRole('button', { name: 'Show less of the card' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });

    it("leaves the card as it is when one of the card's buttons is pressed", async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });

      await user.click(screen.getByRole('button', { name: 'Next event' }));

      expect(screen.getByRole('button', { name: 'Show the whole card' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });

    it('does nothing in the wide layout, where the card always shows everything', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore', wide: true });
      const [line] = within(screen.getByRole('article')).getAllByText(
        /^A Saturn V rocket lifts Apollo 11 off/,
      );

      await user.click(line!);

      expect(screen.getByRole('button', { name: 'Show the whole card' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });
  });
});
