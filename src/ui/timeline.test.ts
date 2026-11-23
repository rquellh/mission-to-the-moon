/**
 * Play on the moment card, and the tools behind its "Controls" door: the
 * door itself, previous and next, the clock, the chapters, the scrubber's
 * keys, the speed, and the tools being out of reach while the tour drives
 * the clock. "Look at" and True scale, which Controls also open, are in
 * view-controls.test.ts. Fitting chapter names into a short row needs real
 * layout, so the browser tests own that.
 */
import { describe, expect, it } from 'vitest';
import { copy } from '../content/copy.ts';
import { mountMission, screen, within, type User } from '../test/test-utils.ts';

const theCard = (): HTMLElement => screen.getByRole('region', { name: 'What is happening' });

/** Open Controls from the card and find the tools, a region named Timeline. */
async function openControls(user: User): Promise<HTMLElement> {
  await user.click(within(theCard()).getByRole('button', { name: 'Controls' }));
  return screen.getByRole('region', { name: 'Timeline' });
}

describe('play and Controls', () => {
  describe('play and pause', () => {
    it('runs the clock while playing and holds it while paused', async () => {
      const { user, frames } = await mountMission('apollo-11', { start: 'explore', wide: true });
      const timeline = await openControls(user);

      await user.click(within(theCard()).getByRole('button', { name: 'Play' }));
      frames.advance(2);

      expect(within(theCard()).getByRole('button', { name: 'Pause' })).toBeInTheDocument();
      expect(within(timeline).queryByText('00:00:00')).not.toBeInTheDocument();

      await user.click(within(theCard()).getByRole('button', { name: 'Pause' }));
      const pausedAt = within(timeline).getByText(/^\d\d+:\d\d:\d\d$/).textContent ?? '';
      frames.advance(2);

      expect(within(theCard()).getByRole('button', { name: 'Play' })).toBeInTheDocument();
      expect(within(timeline).getByText(pausedAt)).toBeVisible();
    });
  });

  describe('the door', () => {
    it('opens the tools and "Look at", and closes them again', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });
      const door = within(theCard()).getByRole('button', { name: 'Controls' });
      expect(door).toHaveAttribute('aria-expanded', 'false');
      expect(door).toHaveAttribute('aria-controls', 'timeline views');
      expect(screen.queryByRole('region', { name: 'Timeline' })).not.toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'Look at' })).not.toBeInTheDocument();

      await user.click(door);

      expect(door).toHaveAttribute('aria-expanded', 'true');
      expect(door).toHaveFocus();
      expect(screen.getByRole('region', { name: 'Timeline' })).toBeVisible();
      expect(screen.getByRole('group', { name: 'Look at' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'True scale' })).toBeVisible();

      await user.click(door);

      expect(door).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('region', { name: 'Timeline' })).not.toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'Look at' })).not.toBeInTheDocument();
    });

    it('stays open while the flight plays on', async () => {
      const { user, frames } = await mountMission('apollo-11', { start: 'explore' });
      await openControls(user);

      await user.click(within(theCard()).getByRole('button', { name: 'Play' }));
      frames.advance(10);

      expect(within(theCard()).getByRole('button', { name: 'Controls' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      expect(screen.getByRole('region', { name: 'Timeline' })).toBeVisible();
    });

    it('opens the tools without "Look at" when there is no 3D view', async () => {
      const { user } = await mountMission('gemini-8', {
        no3D: { note: copy.errors.noWebGL, offerReload: false },
        start: 'explore',
      });
      const door = within(theCard()).getByRole('button', { name: 'Controls' });
      expect(door).toHaveAttribute('aria-controls', 'timeline');

      const timeline = await openControls(user);

      expect(within(timeline).getByRole('slider', { name: 'Mission time' })).toBeVisible();
      expect(screen.queryByRole('group', { name: 'Look at' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'True scale' })).not.toBeInTheDocument();
    });
  });

  describe('stepping', () => {
    it('steps to the next and previous events', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });
      const timeline = await openControls(user);
      expect(within(timeline).getByRole('button', { name: 'Previous event' })).toBeDisabled();

      await user.click(within(timeline).getByRole('button', { name: 'Next event' }));
      expect(within(theCard()).getByRole('heading', { level: 3 })).toHaveTextContent(
        'First stage separates',
      );
      expect(within(timeline).getByRole('button', { name: 'Previous event' })).toBeEnabled();

      await user.click(within(timeline).getByRole('button', { name: 'Previous event' }));
      expect(within(theCard()).getByRole('heading', { level: 3 })).toHaveTextContent('Liftoff');
    });

    it('stops at the last event and keeps keyboard focus on a button that still works', async () => {
      const { user } = await mountMission('apollo-11', { event: 'parachutes' });
      const timeline = await openControls(user);

      await user.click(within(timeline).getByRole('button', { name: 'Next event' }));

      expect(within(theCard()).getByRole('heading', { level: 3 })).toHaveTextContent('Splashdown');
      expect(within(timeline).getByRole('button', { name: 'Next event' })).toBeDisabled();
      expect(within(timeline).getByRole('button', { name: 'Previous event' })).toHaveFocus();
    });
  });

  describe('the clock', () => {
    it('reads the mission time and the day of a long flight, by Play on a phone', async () => {
      const { user } = await mountMission('apollo-11', { event: 'landing' });
      const where = within(theCard()).getByRole('group', { name: 'Where the flight is' });

      await openControls(user);

      expect(within(where).getByText('102:45:39')).toBeVisible();
      expect(within(where).getByText('since liftoff')).toBeVisible();
      expect(within(where).getByText('Day 5')).toBeVisible();
      // The chapter and "Day 5 of 9" give the clock their place.
      expect(within(where).getByText('Day 5 of 9')).not.toBeVisible();
    });

    it('reads it among the tools on a wide screen', async () => {
      const { user } = await mountMission('apollo-11', { event: 'landing', wide: true });

      const timeline = await openControls(user);

      expect(within(timeline).getByText('102:45:39')).toBeVisible();
      expect(within(timeline).getByText('since liftoff')).toBeVisible();
      expect(within(timeline).getByText('Day 5')).toBeVisible();
    });

    it('counts down before liftoff, and leaves out the day on a short flight', async () => {
      const { user } = await mountMission('gemini-8', { start: 'explore', wide: true });

      const timeline = await openControls(user);

      expect(within(timeline).getByText('−01:40:59')).toBeVisible();
      expect(within(timeline).getByText('before liftoff')).toBeVisible();
      expect(within(timeline).queryByText(/^Day \d/)).not.toBeInTheDocument();
    });
  });

  describe('chapters', () => {
    it('jumps to a chapter and marks it as the current one', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore', wide: true });
      const timeline = await openControls(user);
      const chapters = within(timeline).getByRole('group', { name: 'Chapters' });
      expect(within(chapters).getByRole('button', { name: 'Launch' })).toHaveAttribute(
        'aria-current',
        'step',
      );

      await user.click(within(chapters).getByRole('button', { name: 'Landing' }));

      expect(within(timeline).getByText('102:33:05')).toBeVisible();
      expect(within(chapters).getByRole('button', { name: 'Landing' })).toHaveAttribute(
        'aria-current',
        'step',
      );
      expect(within(chapters).getByRole('button', { name: 'Launch' })).not.toHaveAttribute(
        'aria-current',
      );
      expect(
        within(timeline).getByRole('combobox', { name: 'Jump to a chapter' }),
      ).toHaveDisplayValue('Landing');
    });

    it('jumps to a chapter chosen from the menu', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });
      const timeline = await openControls(user);

      await user.selectOptions(
        within(timeline).getByRole('combobox', { name: 'Jump to a chapter' }),
        'Splashdown',
      );

      const where = within(theCard()).getByRole('group', { name: 'Where the flight is' });
      expect(within(where).getByText('195:12:06')).toBeVisible();
      const chapters = within(timeline).getByRole('group', { name: 'Chapters' });
      expect(within(chapters).getByRole('button', { name: 'Splashdown' })).toHaveAttribute(
        'aria-current',
        'step',
      );
    });
  });

  describe('the scrubber', () => {
    it('steps to the next and previous event with Page Up and Page Down', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore', wide: true });
      const timeline = await openControls(user);
      await user.click(within(timeline).getByRole('slider', { name: 'Mission time' }));

      await user.keyboard('{PageUp}{PageUp}');
      expect(within(timeline).getByText('00:11:49')).toBeVisible();

      await user.keyboard('{PageDown}');
      expect(within(timeline).getByText('00:02:42')).toBeVisible();
    });

    it('jumps to the end and the start with End and Home, and says where it is', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore', wide: true });
      const timeline = await openControls(user);
      const scrubber = within(timeline).getByRole('slider', { name: 'Mission time' });
      await user.click(scrubber);

      await user.keyboard('{End}');
      expect(within(timeline).getByText('195:18:35')).toBeVisible();
      expect(scrubber).toHaveAttribute(
        'aria-valuetext',
        '195 hours 18 minutes after liftoff, day 9 of the flight. Splashdown',
      );

      await user.keyboard('{Home}');
      expect(within(timeline).getByText('00:00:00')).toBeVisible();
      expect(scrubber).toHaveAttribute(
        'aria-valuetext',
        'at liftoff, day 1 of the flight. Liftoff',
      );
    });

    it('nudges the time forward and back with the arrow keys', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore', wide: true });
      const timeline = await openControls(user);
      await user.click(within(timeline).getByRole('slider', { name: 'Mission time' }));

      await user.keyboard('{ArrowRight}');
      expect(within(timeline).queryByText('00:00:00')).not.toBeInTheDocument();

      await user.keyboard('{ArrowLeft}');
      expect(within(timeline).getByText('00:00:00')).toBeVisible();
    });
  });

  describe('speed', () => {
    it('keeps the speed chosen while the clock plays', async () => {
      const { user, frames } = await mountMission('apollo-11', { start: 'explore' });
      const timeline = await openControls(user);
      const speed = within(timeline).getByRole('combobox', { name: 'Speed' });
      expect(
        within(speed)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['½×', '1×', '2×', '4×']);
      expect(speed).toHaveDisplayValue('1×');

      await user.selectOptions(speed, '2×');
      await user.click(within(theCard()).getByRole('button', { name: 'Play' }));
      frames.advance(1);

      expect(speed).toHaveDisplayValue('2×');
    });
  });

  describe('during the tour', () => {
    it('leaves out Controls and rests Play, saying why', async () => {
      await mountMission('apollo-11', { start: 'tour' });

      expect(within(theCard()).queryByRole('button', { name: 'Controls' })).not.toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Timeline' })).not.toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'Look at' })).not.toBeInTheDocument();
      const play = within(theCard()).getByRole('button', { name: 'Play' });
      expect(play).toBeDisabled();
      expect(play).toHaveAccessibleDescription(
        'The tour runs the clock for you. Exit the tour to play it yourself.',
      );
    });

    it('closes Controls when a tour starts, and offers them again, closed, when it ends', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });
      await openControls(user);
      await user.click(screen.getByRole('button', { name: /all missions$/ }));
      await user.click(screen.getByRole('button', { name: 'Take the tour of Apollo 11' }));
      expect(within(theCard()).queryByRole('button', { name: 'Controls' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Exit tour' }));

      const door = within(theCard()).getByRole('button', { name: 'Controls' });
      expect(door).toHaveAttribute('aria-expanded', 'false');
      expect(within(theCard()).getByRole('button', { name: 'Play' })).toBeEnabled();
      expect(within(theCard()).getByRole('button', { name: 'Play' })).toHaveAccessibleDescription(
        '',
      );

      const timeline = await openControls(user);

      expect(within(timeline).getByRole('slider', { name: 'Mission time' })).toBeEnabled();
      expect(within(timeline).getByRole('button', { name: 'Landing' })).toBeEnabled();
    });
  });
});
