/**
 * The view buttons and the True scale switch, which Controls open at the
 * top left: which views a flight offers, what a press asks of the 3D scene,
 * and showing whatever the scene reports, even while they are closed.
 */
import { describe, expect, it } from 'vitest';
import { mountMission, screen, within, type MountedMission } from '../test/test-utils.ts';

const viewButtons = (): HTMLElement[] =>
  within(screen.getByRole('group', { name: 'Look at' })).getAllByRole('button');

/** Explore a mission with Controls open, so "Look at" and True scale are on the screen. */
async function exploreWithControls(id: string): Promise<MountedMission> {
  const mounted = await mountMission(id, { start: 'explore' });
  await mounted.user.click(screen.getByRole('button', { name: 'Controls' }));
  return mounted;
}

describe('the view controls', () => {
  describe('rendering', () => {
    it('offers Earth, Moon, Ship, and Both on a flight to the Moon', async () => {
      await exploreWithControls('apollo-17');

      expect(viewButtons().map((button) => button.textContent)).toEqual([
        'Earth',
        'Moon',
        'Ship',
        'Both',
      ]);
    });

    it('offers Earth and Ship on a flight that stayed in Earth orbit', async () => {
      await exploreWithControls('gemini-8');

      expect(viewButtons().map((button) => button.textContent)).toEqual(['Earth', 'Ship']);
    });
  });

  describe('choosing a view', () => {
    it('asks the scene for the view pressed, and shows it pressed', async () => {
      const { user, director } = await exploreWithControls('apollo-17');
      expect(screen.getByRole('button', { name: 'Both' })).toHaveAttribute('aria-pressed', 'true');

      await user.click(screen.getByRole('button', { name: 'Moon' }));

      expect(director.view).toBe('moon');
      expect(screen.getByRole('button', { name: 'Moon' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Both' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('shows the view the scene moved to by itself, including while Controls were closed', async () => {
      const { user, director } = await mountMission('apollo-17', { start: 'explore' });

      director.cameraMovesTo('spacecraft');
      await user.click(screen.getByRole('button', { name: 'Controls' }));

      expect(screen.getByRole('button', { name: 'Ship' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows Earth when the scene reports a view an Earth-orbit flight does not offer', async () => {
      const { director } = await exploreWithControls('gemini-8');
      director.cameraMovesTo('spacecraft');

      director.cameraMovesTo('moon');

      expect(screen.getByRole('button', { name: 'Earth' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Ship' })).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('true scale', () => {
    it('switches a Moon flight to true scale and says how far the Moon really is', async () => {
      const { user, director } = await exploreWithControls('apollo-17');
      const toggle = screen.getByRole('button', { name: 'True scale' });
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText('Distances not to scale')).toHaveAttribute('aria-live', 'polite');

      await user.click(toggle);

      expect(director.scaleMode).toBe('true');
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
      expect(
        screen.getByText('True scale: the Moon is about 30 Earth-widths away'),
      ).toBeInTheDocument();
    });

    it('switches an Earth-orbit flight to true scale and back', async () => {
      const { user, director } = await exploreWithControls('gemini-8');
      expect(screen.getByText('Orbit height not to scale')).toBeVisible();

      await user.click(screen.getByRole('button', { name: 'True scale' }));
      expect(screen.getByText('True scale: orbit height drawn to scale')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'True scale' }));
      expect(director.scaleMode).toBe('readable');
      expect(screen.getByText('Orbit height not to scale')).toBeInTheDocument();
    });
  });
});
