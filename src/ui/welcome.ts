import { copy } from '../content/copy';
import type { Mission, MissionSummary } from '../content/types';
import { button, byId, hiddenText } from './dom';
import { missionDates, yearOf } from './format';
import { icon } from './icons';

export interface WelcomeOptions {
  /** The mission loaded behind the welcome, which it features. */
  mission: Mission;
  /** How many stops its guided tour makes. With none, the welcome offers only exploring. */
  tourStops: number;
  /** The mission list, in date order, for the line under "All missions". */
  summaries: readonly MissionSummary[];
  /** Without a 3D view: the note to show under the dates, and whether reloading may help. */
  no3D?: { note: string; offerReload: boolean };
  /** Start the guided tour of the mission. */
  onTour(): void;
  /** Explore the mission freely. Escape on the welcome means this too. */
  onExplore(): void;
  /** Open the list of every mission over the welcome; focus comes back to `from` when it closes. */
  onAllMissions(from: HTMLElement): void;
}

export interface Welcome {
  /**
   * Show the welcome over the bare 3D view, with the heading focused. The
   * rest of the interface is hidden; the 3D view can still be turned.
   */
  show(): void;
  /** Put the interface back. */
  hide(): void;
  /** True while the welcome is on the screen. */
  readonly showing: boolean;
  /** The "All missions" button, so focus can come back to it when something opened over the welcome closes. */
  readonly allMissions: HTMLButtonElement;
}

/** "Gemini and Apollo, 1965 to 1972": the programs in the list, in its order, and the years it covers. */
function listSpan(summaries: readonly MissionSummary[]): string {
  const programs = [...new Set(summaries.map((summary) => summary.program))].map(
    (program) => copy.hub.programs[program],
  );
  const years = summaries.flatMap((summary) => {
    const year = yearOf(summary.date);
    return year === null ? [] : [year];
  });
  if (!programs.length || !years.length) return '';
  const names = new Intl.ListFormat('en-US').format(programs);
  return copy.welcome.span(names, copy.hub.yearsSpoken(Math.min(...years), Math.max(...years)));
}

/**
 * The first thing a visitor sees: one mission, the one loaded, and one
 * obvious way in (the guided tour), with exploring beside it. The list of
 * every mission is one step away, behind "All missions".
 */
export function setUpWelcome(options: WelcomeOptions): Welcome {
  const { mission, tourStops, summaries, no3D, onTour, onExplore, onAllMissions } = options;
  const section = byId('welcome', HTMLElement);
  const title = byId('welcome-title', HTMLHeadingElement);
  const tourButton = byId('welcome-tour', HTMLButtonElement);
  const exploreButton = byId('welcome-explore', HTMLButtonElement);
  const allMissions = byId('welcome-all-missions', HTMLButtonElement);

  /* What it says ------------------------------------------------------ */
  byId('welcome-site', HTMLParagraphElement).textContent = copy.siteTitle;
  title.textContent = copy.welcome.title(mission.name);
  // The story's short summary, which the mission list's blurb repeats word for word.
  byId('welcome-summary', HTMLParagraphElement).textContent = mission.summary.text.short;
  const dates = byId('welcome-dates', HTMLParagraphElement);
  dates.textContent = missionDates(mission);
  dates.hidden = !dates.textContent;

  if (no3D) {
    const note = byId('welcome-note', HTMLParagraphElement);
    note.textContent = no3D.note;
    note.hidden = false;
    if (no3D.offerReload) {
      const reload = button('button button--quiet welcome__reload', copy.memorial.reload);
      reload.setAttribute('data-testid', 'welcome-reload');
      reload.addEventListener('click', () => window.location.reload());
      note.after(reload);
    }
  }

  /* The ways in -------------------------------------------------------- */
  // Without tour stops there is no tour, and exploring becomes the main way in.
  if (tourStops > 0) {
    tourButton.prepend(icon('play', 'icon welcome__play'));
    byId('welcome-tour-label', HTMLSpanElement).textContent = copy.welcome.tour;
    byId('welcome-tour-stops', HTMLSpanElement).textContent = copy.welcome.stops(tourStops);
    tourButton.addEventListener('click', () => onTour());
  } else {
    tourButton.hidden = true;
    exploreButton.classList.replace('button--quiet', 'button--primary');
  }
  exploreButton.textContent = copy.welcome.explore;
  exploreButton.addEventListener('click', () => onExplore());

  byId('welcome-all-missions-name', HTMLSpanElement).textContent = copy.welcome.allMissions;
  const span = byId('welcome-all-missions-line', HTMLSpanElement);
  span.textContent = listSpan(summaries);
  // The number is shown in a small pill, and read out with what it counts.
  span.append(hiddenText(`, ${copy.welcome.count(summaries.length)}`));
  byId('welcome-all-missions-count', HTMLSpanElement).textContent = String(summaries.length);
  allMissions.append(icon('next', 'icon welcome__chevron'));
  allMissions.addEventListener('click', () => onAllMissions(allMissions));

  /* Showing and leaving ------------------------------------------------ */
  let showing = false;

  const onKey = (event: KeyboardEvent): void => {
    // The welcome is not a dialog, so Escape is handled here, and means
    // "Explore on my own". A dialog open over it (the mission list, a
    // memorial page, an extra) takes Escape for itself. A page built again
    // in the same document (as the interface tests do) leaves this listener
    // behind, so it answers only while its own welcome is on the page.
    if (event.key !== 'Escape' || event.defaultPrevented || !section.isConnected) return;
    if (document.querySelector('dialog[open]')) return;
    event.preventDefault();
    onExplore();
  };

  return {
    show() {
      if (showing) return;
      showing = true;
      section.hidden = false;
      document.body.classList.add('is-welcome');
      document.addEventListener('keydown', onKey);
      document.title = copy.siteTitle;
      title.focus({ preventScroll: true });
    },
    hide() {
      if (!showing) return;
      showing = false;
      section.hidden = true;
      document.body.classList.remove('is-welcome');
      document.removeEventListener('keydown', onKey);
      document.title = copy.pageTitle(mission.name);
    },
    get showing() {
      return showing;
    },
    allMissions,
  };
}
