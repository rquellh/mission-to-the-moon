/**
 * The timeline: Play and Pause, the clock readout, the chapters, the
 * scrubber's keys, the speed, and the lock while the tour drives the clock.
 * Fitting chapter names into a short row needs real layout, so the browser
 * tests own that.
 */
import { describe, expect, it } from 'vitest';
import { mountMission, screen, within } from '../test/test-utils.ts';

const timelineRegion = (): HTMLElement => screen.getByRole('region', { name: 'Timeline' });

describe('the timeline', () => {
  describe('play and pause', () => {
    it('runs the clock while playing and holds it while paused', async () => {
      const { user, frames } = await mountMission('apollo-11', { start: 'explore' });
      const timeline = timelineRegion();

      await user.click(within(timeline).getByRole('button', { name: 'Play' }));
      frames.advance(2);

      expect(within(timeline).getByRole('button', { name: 'Pause' })).toBeInTheDocument();
      expect(within(timeline).queryByText('00:00:00')).not.toBeInTheDocument();

      await user.click(within(timeline).getByRole('button', { name: 'Pause' }));
      const pausedAt = within(timeline).getByText(/^\d\d+:\d\d:\d\d$/).textContent ?? '';
      frames.advance(2);

      expect(within(timeline).getByRole('button', { name: 'Play' })).toBeInTheDocument();
      expect(within(timeline).getByText(pausedAt)).toBeInTheDocument();
    });
  });

  describe('the clock', () => {
    it('reads the mission time, the day of a long flight, and the date', async () => {
      await mountMission('apollo-11', { event: 'landing' });
      const timeline = timelineRegion();

      expect(within(timeline).getByText('102:45:39')).toBeInTheDocument();
      expect(within(timeline).getByText('since liftoff')).toBeInTheDocument();
      expect(within(timeline).getByText('Day 5')).toBeVisible();
      expect(timeline).toHaveTextContent('Jul 20, 1969 20:17:39 UTC');
    });

    it('counts down before liftoff, and leaves out the day on a short flight', async () => {
      await mountMission('gemini-8', { start: 'explore' });
      const timeline = timelineRegion();

      expect(within(timeline).getByText('−01:40:59')).toBeInTheDocument();
      expect(within(timeline).getByText('before liftoff')).toBeInTheDocument();
      expect(within(timeline).queryByText(/^Day \d/)).not.toBeInTheDocument();
      expect(timeline).toHaveTextContent('Mar 16, 1966 15:00:03 UTC');
    });
  });

  describe('chapters', () => {
    it('jumps to a chapter and marks it as the current one', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });
      const timeline = timelineRegion();
      const chapters = within(timeline).getByRole('group', { name: 'Chapters' });
      expect(within(chapters).getByRole('button', { name: 'Launch' })).toHaveAttribute('aria-current', 'step');

      await user.click(within(chapters).getByRole('button', { name: 'Landing' }));

      expect(within(timeline).getByText('102:33:05')).toBeInTheDocument();
      expect(within(chapters).getByRole('button', { name: 'Landing' })).toHaveAttribute('aria-current', 'step');
      expect(within(chapters).getByRole('button', { name: 'Launch' })).not.toHaveAttribute('aria-current');
      expect(within(timeline).getByRole('combobox', { name: 'Jump to a chapter' })).toHaveDisplayValue('Landing');
    });

    it('jumps to a chapter chosen from the menu', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });
      const timeline = timelineRegion();

      await user.selectOptions(within(timeline).getByRole('combobox', { name: 'Jump to a chapter' }), 'Splashdown');

      expect(within(timeline).getByText('195:12:06')).toBeInTheDocument();
      const chapters = within(timeline).getByRole('group', { name: 'Chapters' });
      expect(within(chapters).getByRole('button', { name: 'Splashdown' })).toHaveAttribute('aria-current', 'step');
    });
  });

  describe('the scrubber', () => {
    it('steps to the next and previous event with Page Up and Page Down', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });
      const timeline = timelineRegion();
      await user.click(within(timeline).getByRole('slider', { name: 'Mission time' }));

      await user.keyboard('{PageUp}{PageUp}');
      expect(within(timeline).getByText('00:11:49')).toBeInTheDocument();

      await user.keyboard('{PageDown}');
      expect(within(timeline).getByText('00:02:42')).toBeInTheDocument();
    });

    it('jumps to the end and the start with End and Home, and says where it is', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });
      const timeline = timelineRegion();
      const scrubber = within(timeline).getByRole('slider', { name: 'Mission time' });
      await user.click(scrubber);

      await user.keyboard('{End}');
      expect(within(timeline).getByText('195:18:35')).toBeInTheDocument();
      expect(scrubber).toHaveAttribute('aria-valuetext', '195 hours 18 minutes after liftoff, day 9 of the flight. Splashdown');

      await user.keyboard('{Home}');
      expect(within(timeline).getByText('00:00:00')).toBeInTheDocument();
      expect(scrubber).toHaveAttribute('aria-valuetext', 'at liftoff, day 1 of the flight. Liftoff');
    });

    it('nudges the time forward and back with the arrow keys', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });
      const timeline = timelineRegion();
      await user.click(within(timeline).getByRole('slider', { name: 'Mission time' }));

      await user.keyboard('{ArrowRight}');
      expect(within(timeline).queryByText('00:00:00')).not.toBeInTheDocument();

      await user.keyboard('{ArrowLeft}');
      expect(within(timeline).getByText('00:00:00')).toBeInTheDocument();
    });
  });

  describe('speed', () => {
    it('keeps the speed chosen while the clock plays', async () => {
      const { user, frames } = await mountMission('apollo-11', { start: 'explore' });
      const timeline = timelineRegion();
      const speed = within(timeline).getByRole('combobox', { name: 'Speed' });
      expect(within(speed).getAllByRole('option').map((option) => option.textContent)).toEqual(['½×', '1×', '2×', '4×']);
      expect(speed).toHaveDisplayValue('1×');

      await user.selectOptions(speed, '2×');
      await user.click(within(timeline).getByRole('button', { name: 'Play' }));
      frames.advance(1);

      expect(speed).toHaveDisplayValue('2×');
    });
  });

  describe('during the tour', () => {
    it('locks every control and says why', async () => {
      await mountMission('apollo-11', { start: 'tour' });
      const timeline = timelineRegion();

      expect(timeline).toHaveAttribute('title', 'The timeline follows the tour. Exit the tour to use it.');
      expect(within(timeline).getByRole('button', { name: 'Play' })).toBeDisabled();
      expect(within(timeline).getByRole('slider', { name: 'Mission time' })).toBeDisabled();
      expect(within(timeline).getByRole('combobox', { name: 'Jump to a chapter' })).toBeDisabled();
      expect(within(timeline).getByRole('combobox', { name: 'Speed' })).toBeDisabled();
      expect(within(timeline).getByRole('button', { name: 'Landing' })).toBeDisabled();
    });

    it('unlocks when the tour ends', async () => {
      const { user } = await mountMission('apollo-11', { start: 'tour' });

      await user.click(screen.getByRole('button', { name: 'Exit tour' }));

      const timeline = timelineRegion();
      expect(timeline).not.toHaveAttribute('title', 'The timeline follows the tour. Exit the tour to use it.');
      expect(within(timeline).getByRole('slider', { name: 'Mission time' })).toBeEnabled();
      expect(within(timeline).getByRole('button', { name: 'Landing' })).toBeEnabled();
    });
  });
});
