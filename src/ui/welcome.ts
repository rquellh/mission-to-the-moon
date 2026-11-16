import { copy } from '../content/copy';
import { byId } from './dom';

export interface WelcomeOptions {
  /** How many stops the tour has; the tour choice hides when there are none. */
  stops: number;
  onTour(): void;
  onExplore(): void;
}

export interface Welcome {
  show(): void;
}

/**
 * The first thing a visitor sees over the 3D view: the site title, one
 * sentence about the mission, and two choices. While it is up, the rest of
 * the interface is hidden and inert.
 */
export function setUpWelcome({ stops, onTour, onExplore }: WelcomeOptions): Welcome {
  const welcome = byId('welcome', HTMLElement);
  const hud = byId('hud', HTMLDivElement);
  const tourButton = byId('welcome-tour', HTMLButtonElement);
  const exploreButton = byId('welcome-explore', HTMLButtonElement);

  byId('welcome-title', HTMLHeadingElement).textContent = copy.siteTitle;
  byId('welcome-lede', HTMLParagraphElement).textContent = copy.welcome.lede;
  byId('welcome-note', HTMLParagraphElement).textContent = stops > 0 ? copy.welcome.stops(stops) : '';
  tourButton.textContent = copy.welcome.tour;
  exploreButton.textContent = copy.welcome.explore;
  tourButton.hidden = stops === 0;

  const hide = (): void => {
    welcome.hidden = true;
    hud.inert = false;
    document.body.classList.remove('is-welcome');
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || welcome.hidden) return;
    hide();
    onExplore();
  };

  tourButton.addEventListener('click', () => {
    hide();
    onTour();
  });
  exploreButton.addEventListener('click', () => {
    hide();
    onExplore();
  });

  return {
    show() {
      document.body.classList.add('is-welcome');
      hud.inert = true;
      welcome.hidden = false;
      document.addEventListener('keydown', onKey);
    },
  };
}
