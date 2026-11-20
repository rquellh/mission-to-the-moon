/**
 * The extras sheet, opened from "Try it" on Apollo 11's liftoff. The extra
 * inside is a tiny stand-in passed through `loadExtra` (the interface's
 * edge): each real extra's own code is tested on its own. What is tested
 * here is the sheet: what it pauses and starts again, the ways it closes,
 * and a sheet whose extra did not load.
 */
import { describe, expect, it, vi } from 'vitest';
import { mountMission, navigation, screen, sound, within } from '../test/test-utils.ts';
import { meta as stages } from '../extras/stages/meta.ts';
import type { Mission } from '../content/types.ts';
import type { Extra } from '../extras/types.ts';

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

/** Apollo 11 with "Try it" on the landing too, which has a recording (no real event has both). */
const tryItOnTheLanding = (mission: Mission): Mission => ({
  ...mission,
  events: mission.events.map((event) => (event.id === 'landing' ? { ...event, handsOn: 'stages' } : event)),
});

describe('the extras sheet', () => {
  describe('opening', () => {
    it('opens the extra for the moment it was opened from', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore', loadExtra: loadTinyStages });

      await user.click(screen.getByRole('button', { name: 'Try it: Drop the stages' }));

      const sheet = screen.getByRole('dialog', { name: 'Drop the stages' });
      expect(await within(sheet).findByText('Opened over apollo-11, at liftoff')).toBeInTheDocument();
      expect(within(sheet).getByRole('button', { name: 'Close' })).toHaveFocus();
      expect(document.title).toBe('Drop the stages · Mission to the Moon');
    });

    it('rests the clock and the 3D view while open, and starts them again when it closes', async () => {
      const { user, director } = await mountMission('apollo-11', { start: 'explore', loadExtra: loadTinyStages });
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
      const recording = screen.getByRole('region', { name: 'Recording' });
      await user.click(within(recording).getByRole('button', { name: 'Play the recording, 15 seconds' }));
      sound.starts();

      await user.click(screen.getByRole('button', { name: 'Try it: Drop the stages' }));

      expect(within(recording).getByRole('status')).toHaveTextContent('Recording paused.');
    });
  });

  describe('closing', () => {
    it('closes when the extra asks, putting the page back as it was', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore', loadExtra: loadTinyStages });
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
      const { user } = await mountMission('apollo-11', { start: 'explore', loadExtra: loadTinyStages });
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

      expect(navigation.address).toBe('http://localhost:3000/?mission=apollo-11&event=liftoff&extra=stages');
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
});
