/**
 * The view buttons and the True scale switch: which views a flight offers,
 * what a press asks of the 3D scene, and showing whatever the scene reports.
 */
import { describe, expect, it } from 'vitest';
import { mountMission, screen, within } from '../test/test-utils.ts';

const viewButtons = (): HTMLElement[] => within(screen.getByRole('group', { name: 'Look at' })).getAllByRole('button');

describe('the view controls', () => {
  describe('rendering', () => {
    it('offers Earth, Moon, Ship, and Both on a flight to the Moon', async () => {
      await mountMission('apollo-17', { start: 'explore' });

      expect(viewButtons().map((button) => button.textContent)).toEqual(['Earth', 'Moon', 'Ship', 'Both']);
    });

    it('offers Earth and Ship on a flight that stayed in Earth orbit', async () => {
      await mountMission('gemini-8', { start: 'explore' });

      expect(viewButtons().map((button) => button.textContent)).toEqual(['Earth', 'Ship']);
    });
  });

  describe('choosing a view', () => {
    it('asks the scene for the view pressed, and shows it pressed', async () => {
      const { user, director } = await mountMission('apollo-17', { start: 'explore' });
      expect(screen.getByRole('button', { name: 'Both' })).toHaveAttribute('aria-pressed', 'true');

      await user.click(screen.getByRole('button', { name: 'Moon' }));

      expect(director.view).toBe('moon');
      expect(screen.getByRole('button', { name: 'Moon' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Both' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('shows the view the scene moved to by itself', async () => {
      const { director } = await mountMission('apollo-17', { start: 'explore' });

      director.cameraMovesTo('spacecraft');

      expect(screen.getByRole('button', { name: 'Ship' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows Earth when the scene reports a view an Earth-orbit flight does not offer', async () => {
      const { director } = await mountMission('gemini-8', { start: 'explore' });
      director.cameraMovesTo('spacecraft');

      director.cameraMovesTo('moon');

      expect(screen.getByRole('button', { name: 'Earth' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Ship' })).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('true scale', () => {
    it('switches a Moon flight to true scale and says how far the Moon really is', async () => {
      const { user, director } = await mountMission('apollo-17', { start: 'explore' });
      const toggle = screen.getByRole('button', { name: 'True scale' });
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText('Distances not to scale')).toBeInTheDocument();

      await user.click(toggle);

      expect(director.scaleMode).toBe('true');
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('True scale: the Moon is about 30 Earth-widths away')).toBeInTheDocument();
    });

    it('switches an Earth-orbit flight to true scale and back', async () => {
      const { user, director } = await mountMission('gemini-8', { start: 'explore' });
      expect(screen.getByText('Orbit height not to scale')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'True scale' }));
      expect(screen.getByText('True scale: orbit height drawn to scale')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'True scale' }));
      expect(director.scaleMode).toBe('readable');
      expect(screen.getByText('Orbit height not to scale')).toBeInTheDocument();
    });
  });
});
