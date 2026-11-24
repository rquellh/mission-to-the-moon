/**
 * "About this mission" and "How this is drawn", opened from the links at
 * the end of "Tell me more": what each says for a real mission, and that a
 * section a mission has nothing for is left out. The paragraphs of "How
 * this is drawn" are picked by a pure function, tested on its own at the end.
 */
import { describe, expect, it } from 'vitest';
import { outlineOf } from '../app/outline.ts';
import type { FlightOutline } from '../app/outline.ts';
import { copy } from '../content/copy.ts';
import { bundle as apollo8 } from '../content/missions/apollo-8/index.ts';
import { bundle as apollo11 } from '../content/missions/apollo-11/index.ts';
import { bundle as gemini3 } from '../content/missions/gemini-3/index.ts';
import { bundle as gemini8 } from '../content/missions/gemini-8/index.ts';
import { mountMission, screen, within, type User } from '../test/test-utils.ts';
import { howDrawnParagraphs } from './about-dialog.ts';

/** A flight with no landing and no splashdown: none of the real ones, so a typed fixture. */
const noLandingNoSplashdown: FlightOutline = {
  ships: 1,
  landsOnMoon: false,
  splashdown: false,
  turns: false,
};

/** Open "Tell me more" on the card, then one of the mission's own pages from the links at its end. */
async function openFromTellMeMore(user: User, link: string): Promise<HTMLElement> {
  await user.click(screen.getByRole('button', { name: 'Tell me more' }));
  await user.click(screen.getByRole('button', { name: link }));
  return screen.getByRole('dialog', { name: link });
}

describe('About this mission', () => {
  describe('opening', () => {
    it('opens from "Tell me more", named for the mission', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });

      const about = await openFromTellMeMore(user, 'About Apollo 11');

      expect(within(about).getByRole('button', { name: 'Close' })).toHaveFocus();
    });
  });

  describe('rendering', () => {
    it('gives the dates and the launch', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });

      const about = await openFromTellMeMore(user, 'About Apollo 11');
      expect(within(about).getByText('July 16–24, 1969')).toBeInTheDocument();
      expect(
        within(about).getByText(
          'Launched July 16, 1969, at 13:32 UTC from Launch Complex 39, Pad A, Kennedy Space Center, Florida, on a Saturn V (SA-506).',
        ),
      ).toBeInTheDocument();
    });

    it('shows the crew portrait, says who is who, and names each person and their job', async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });

      const about = await openFromTellMeMore(user, 'About Apollo 11');
      expect(
        within(about).getByRole('heading', { level: 3, name: 'The crew' }),
      ).toBeInTheDocument();
      expect(
        within(about).getByRole('img', { name: /^From left, Neil A\. Armstrong, Michael Collins/ }),
      ).toBeInTheDocument();
      expect(
        within(about).getByText(/^From left, Neil A\. Armstrong, Michael Collins/),
      ).toBeVisible();
      expect(within(about).getByText('Michael Collins')).toBeInTheDocument();
      expect(within(about).getByText('Command module pilot')).toBeInTheDocument();
    });

    it("lists the spacecraft's names, what the crew did, and where the spacecraft is now", async () => {
      const { user } = await mountMission('apollo-11', { start: 'explore' });

      const about = await openFromTellMeMore(user, 'About Apollo 11');
      expect(
        within(about).getByRole('heading', { level: 3, name: 'Spacecraft names' }),
      ).toBeInTheDocument();
      expect(within(about).getByText('Columbia')).toBeInTheDocument();
      expect(within(about).getByText('Eagle')).toBeInTheDocument();
      expect(
        within(about).getByRole('heading', { level: 3, name: 'What they did' }),
      ).toBeInTheDocument();
      expect(
        within(about).getByText(/^Neil Armstrong and Buzz Aldrin became the first people/),
      ).toBeInTheDocument();
      expect(
        within(about).getByRole('heading', { level: 3, name: 'Where the spacecraft is now' }),
      ).toBeInTheDocument();
      expect(within(about).getByText('Command module Columbia')).toBeInTheDocument();
      expect(
        within(about).getByText('National Air and Space Museum, Washington, D.C.'),
      ).toBeInTheDocument();
    });

    it('leaves out a section the mission has nothing for', async () => {
      const { user } = await mountMission('gemini-8', { start: 'explore' });

      const about = await openFromTellMeMore(user, 'About Gemini 8');
      expect(
        within(about).getByRole('heading', { level: 3, name: 'The crew' }),
      ).toBeInTheDocument();
      expect(
        within(about).queryByRole('heading', { level: 3, name: 'Spacecraft names' }),
      ).not.toBeInTheDocument();
    });
  });
});

describe('How this is drawn', () => {
  it('opens from "Tell me more" with the notes true of this flight', async () => {
    const { user } = await mountMission('gemini-8', { start: 'explore' });

    const note = await openFromTellMeMore(user, 'How this is drawn');

    expect(within(note).getByText(copy.howDrawn.loops)).toBeInTheDocument();
    expect(within(note).queryByText(copy.howDrawn.heldStill)).not.toBeInTheDocument();
  });

  describe('howDrawnParagraphs', () => {
    const { howDrawn } = copy;

    it('a Moon landing: Earth and Moon held still, the landing exact, more than one spacecraft', () => {
      const paragraphs = howDrawnParagraphs(apollo11.mission, outlineOf(apollo11));

      expect(paragraphs[0]).toBe(howDrawn.heldStill);
      expect(paragraphs).toContain(howDrawn.exact.moonLanding);
      expect(paragraphs).toContain(howDrawn.models.many);
      expect(paragraphs).not.toContain(howDrawn.loops);
    });

    it('a Moon flight with no landing: the splashdown exact, one spacecraft', () => {
      const paragraphs = howDrawnParagraphs(apollo8.mission, outlineOf(apollo8));

      expect(paragraphs).toContain(howDrawn.heldStill);
      expect(paragraphs).toContain(howDrawn.exact.splashdown);
      expect(paragraphs).toContain(howDrawn.models.one);
    });

    it('two spacecraft in Earth orbit, one of them spinning: close together, turning, loops', () => {
      const paragraphs = howDrawnParagraphs(gemini8.mission, outlineOf(gemini8));

      expect(paragraphs).not.toContain(howDrawn.heldStill);
      expect(paragraphs).toContain(howDrawn.closeTogether);
      expect(paragraphs).toContain(howDrawn.turning);
      expect(paragraphs).toContain(howDrawn.loops);
      expect(paragraphs.at(-1)).toBe(howDrawn.sunlight['earth-orbit']);
    });

    it('one spacecraft in Earth orbit: nothing about two flying close together', () => {
      const paragraphs = howDrawnParagraphs(gemini3.mission, outlineOf(gemini3));

      expect(paragraphs).toContain(howDrawn.models.one);
      expect(paragraphs).not.toContain(howDrawn.closeTogether);
      expect(paragraphs).not.toContain(howDrawn.turning);
    });

    it('a flight with no landing and no splashdown: only the engine firings are exact', () => {
      const paragraphs = howDrawnParagraphs(gemini3.mission, noLandingNoSplashdown);

      expect(paragraphs).toContain(howDrawn.exact.other);
    });
  });
});
