/**
 * The memorial page for Apollo 1, opened from the mission list: loading,
 * the page itself, a page that did not load, and closing. Its content loads
 * only when it is opened, through `loadMemorial`, so a test controls when
 * (and whether) the answer comes.
 */
import { describe, expect, it, vi } from 'vitest';
import { loadMemorial } from '../content/missions/index.ts';
import type { Memorial } from '../content/types.ts';
import {
  later,
  mountMission,
  navigation,
  screen,
  waitFor,
  within,
  type User,
} from '../test/test-utils.ts';

const readApollo1 = (user: User): Promise<void> =>
  user.click(screen.getByRole('button', { name: 'Read about Apollo 1' }));

/** Open the mission list from the welcome, then Apollo 1's page from the list. */
async function openApollo1(user: User): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'All missions' }));
  await readApollo1(user);
}

describe('the memorial page', () => {
  describe('loading', () => {
    it('says it is loading until the page arrives', async () => {
      const answer = later<Memorial>();
      const { user } = await mountMission('apollo-11', { loadMemorial: () => answer.promise });

      await openApollo1(user);

      const page = screen.getByRole('dialog', { name: 'Apollo 1' });
      expect(within(page).getByRole('status')).toHaveTextContent('Loading Apollo 1…');
      expect(document.title).toBe('Apollo 1 · Mission to the Moon');

      answer.resolve(await loadMemorial('apollo-1'));

      await waitFor(() => {
        expect(within(page).queryByRole('status')).not.toBeInTheDocument();
      });
      expect(within(page).getByText('January 27, 1967')).toBeInTheDocument();
    });
  });

  describe('rendering', () => {
    it('shows the day, the crew, and each part of the story with its sources', async () => {
      const { user } = await mountMission('apollo-11');

      await openApollo1(user);

      const page = screen.getByRole('dialog', { name: 'Apollo 1' });
      expect(await within(page).findByText('January 27, 1967')).toBeInTheDocument();
      expect(
        within(page).getByRole('img', { name: /^Ed White, Gus Grissom, and Roger Chaffee/ }),
      ).toBeInTheDocument();
      expect(within(page).getByRole('heading', { level: 3, name: 'The crew' })).toBeInTheDocument();
      expect(within(page).getByText('Edward H. White II')).toBeInTheDocument();
      expect(within(page).getByText('Senior pilot')).toBeInTheDocument();
      expect(
        within(page).getByRole('heading', { level: 3, name: 'What happened' }),
      ).toBeInTheDocument();
      expect(
        within(page).getByRole('heading', { level: 3, name: 'How they are remembered' }),
      ).toBeInTheDocument();
      expect(
        within(page).getByText(
          /^Apollo 1 was going to be the first Apollo flight with astronauts on board\./,
        ),
      ).toBeInTheDocument();
      expect(within(page).getAllByText(/^Sources \(\d+\)$/).length).toBeGreaterThan(4);
    });

    it('tells more of a fact when asked', async () => {
      const { user } = await mountMission('apollo-11');
      await openApollo1(user);
      const page = screen.getByRole('dialog', { name: 'Apollo 1' });
      const [toggle] = await within(page).findAllByRole('button', { name: 'Tell me more' });

      await user.click(toggle!);

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(toggle).toHaveAccessibleName('Show less');
    });
  });

  describe('failing to load', () => {
    it('says the page did not load and offers to reload it', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { user } = await mountMission('apollo-11', {
        loadMemorial: () => Promise.reject(new Error('The network went away')),
      });
      await openApollo1(user);
      const page = screen.getByRole('dialog', { name: 'Apollo 1' });

      expect(
        await within(page).findByText(
          'This page did not load. Check your connection and reload the page.',
        ),
      ).toBeInTheDocument();

      await user.click(within(page).getByRole('button', { name: 'Reload' }));

      expect(navigation.address).toBe('http://localhost:3000/?mission=apollo-1');
    });
  });

  describe('closing', () => {
    it('puts the tab title back and returns to the Read button', async () => {
      const { user } = await mountMission('apollo-11');
      await openApollo1(user);
      const page = screen.getByRole('dialog', { name: 'Apollo 1' });
      await within(page).findByText('January 27, 1967');

      await user.click(within(page).getByRole('button', { name: 'Close' }));

      expect(screen.queryByRole('dialog', { name: 'Apollo 1' })).not.toBeInTheDocument();
      expect(document.title).toBe('Mission to the Moon');
      expect(screen.getByRole('button', { name: 'Read about Apollo 1' })).toHaveFocus();
    });

    it('closes with Escape and leaves the mission list open', async () => {
      const { user } = await mountMission('apollo-11');
      await openApollo1(user);

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog', { name: 'Apollo 1' })).not.toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'All missions' })).toBeVisible();
    });

    it('ignores a page that arrives after it was closed', async () => {
      const closedEarly = later<Memorial>();
      const openedAgain = later<Memorial>();
      const answers = [closedEarly, openedAgain];
      const { user } = await mountMission('apollo-11', {
        loadMemorial: () => (answers.shift() ?? later<Memorial>()).promise,
      });
      await openApollo1(user);
      await user.click(
        within(screen.getByRole('dialog', { name: 'Apollo 1' })).getByRole('button', {
          name: 'Close',
        }),
      );
      await readApollo1(user);
      const page = screen.getByRole('dialog', { name: 'Apollo 1' });

      closedEarly.resolve(await loadMemorial('apollo-1'));
      await closedEarly.promise;

      expect(within(page).getByRole('status')).toHaveTextContent('Loading Apollo 1…');

      openedAgain.resolve(await loadMemorial('apollo-1'));

      expect(await within(page).findByText('January 27, 1967')).toBeInTheDocument();
    });
  });
});
