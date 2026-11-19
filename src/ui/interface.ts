import type { Director, Player } from '../app/contract';
import type { FlightOutline } from '../app/outline';
import { Tour } from '../app/tour';
import { copy } from '../content/copy';
import { credits } from '../content/credits';
import type { Memorial, Mission, MissionSummary } from '../content/types';
import { renderAbout, renderHowDrawn } from './about-dialog';
import { renderCredits } from './credits-dialog';
import { setUpDialog } from './dialogs';
import { byId, hiddenText, reducedMotionQuery } from './dom';
import { setUpEventCard } from './event-card';
import { missionDates, speakMissionTime } from './format';
import { setUpHub } from './hub';
import { icon } from './icons';
import { watchViewInsets } from './layout';
import { setUpMemorial } from './memorial-dialog';
import { MissionIndex } from './mission-index';
import { setUpSheet } from './sheet';
import { setUpTimeline } from './timeline';
import { focusTourNext, setUpTourPanel } from './tour-panel';
import { setUpViewControls } from './view-controls';

export interface InterfaceOptions {
  mission: Mission;
  /** What the flight plan holds, so the notes say only what is true of this flight. */
  flight: FlightOutline;
  /** Every source id the flight cites, for the Sources dialog. */
  cited: ReadonlySet<string>;
  /** The mission list, in date order. */
  summaries: readonly MissionSummary[];
  /** Any mission's name by id, including one the list leaves out (a draft opened by its address). */
  nameOf(id: string): string | undefined;
  /** True for an unfinished mission (only the dev server lists one). */
  isDraft(summary: MissionSummary): boolean;
  /** Load a memorial page's content when it is opened. */
  loadMemorial(id: string): Promise<Memorial>;
  /** The address of a mission or memorial by id. */
  addressOf(id: string): string;
  player: Player;
  director: Director;
  /** False when there is no 3D view (for example, without WebGL). */
  has3D: boolean;
}

export interface MissionInterface {
  /** Show the mission picker over the 3D view, as the first thing a visitor sees, scrolled to an entry if one is named. */
  welcome(revealId?: string): void;
  /** Skip the picker and start exploring. */
  explore(): void;
  /** Skip the picker and start the guided tour (or explore, if the mission has no tour). */
  tour(): void;
  /** Open a memorial page, over the picker when it is showing. */
  memorial(id: string): void;
}

export interface MissionListOptions {
  summaries: readonly MissionSummary[];
  /** Any mission's name by id, including one the list leaves out (a draft opened by its address). */
  nameOf(id: string): string | undefined;
  isDraft(summary: MissionSummary): boolean;
  loadMemorial(id: string): Promise<Memorial>;
  addressOf(id: string): string;
}

/**
 * The mission list on its own, with no mission behind it: the way on when a
 * mission could not be loaded. Every entry opens its own page.
 */
export function setUpMissionList({ summaries, nameOf, isDraft, loadMemorial, addressOf }: MissionListOptions): {
  open(returnTo: HTMLElement): void;
} {
  const memorials = setUpMemorial({ load: loadMemorial, nameOf, addressOf });
  const hub = setUpHub({
    currentId: null,
    summaries,
    isDraft,
    onMemorial: (id, from) => memorials.open(id, from),
    // With no mission loaded there is nothing to do in place.
    onTour() {},
    onExplore() {},
    onReturn() {},
  });
  return { open: (returnTo) => hub.open(returnTo) };
}

/** A polite screen reader announcement that waits for things to settle. */
function makeAnnouncer(): (text: string) => void {
  const region = byId('announcer', HTMLParagraphElement);
  let timer: number | undefined;
  return (text) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      region.textContent = '';
      requestAnimationFrame(() => {
        region.textContent = text;
      });
    }, 500);
  };
}

/** Build the whole interface for one mission and connect it to the clock and the camera. */
export function mountInterface(options: InterfaceOptions): MissionInterface {
  const { mission, flight, cited, summaries, nameOf, isDraft, loadMemorial, addressOf, player, director, has3D } = options;
  const index = new MissionIndex(mission);
  const motion = reducedMotionQuery();
  const announce = makeAnnouncer();

  /* The page, for this mission --------------------------------------- */
  document.title = copy.pageTitle(mission.name);
  byId('stage', HTMLCanvasElement).setAttribute('aria-label', copy.canvas[mission.destination]);
  byId('loading-text', HTMLParagraphElement).textContent = copy.loadingMission(mission.name);

  /* Header and dialogs ----------------------------------------------- */
  byId('mission-name', HTMLSpanElement).textContent = mission.name;
  byId('mission-dates', HTMLSpanElement).textContent = missionDates(mission);
  const hubButton = byId('hub-button', HTMLButtonElement);
  hubButton.title = copy.header.missionsHint;
  hubButton.append(icon('chevron-down', 'icon masthead__chevron'), hiddenText(`, ${copy.header.missions}`));
  renderAbout(mission);
  renderHowDrawn(mission, flight);
  renderCredits(credits, { mission, cited, summaries });
  const about = setUpDialog(byId('about-dialog', HTMLDialogElement));
  const drawn = setUpDialog(byId('drawn-dialog', HTMLDialogElement));
  const sources = setUpDialog(byId('credits-dialog', HTMLDialogElement));
  const aboutButton = byId('about-button', HTMLButtonElement);
  const creditsButton = byId('credits-button', HTMLButtonElement);
  const drawnButton = byId('drawn-button', HTMLButtonElement);
  aboutButton.addEventListener('click', () => about.open(aboutButton));
  creditsButton.addEventListener('click', () => sources.open(creditsButton));
  drawnButton.addEventListener('click', () => drawn.open(drawnButton));

  /* View controls ---------------------------------------------------- */
  document.body.classList.toggle('no-3d', !has3D);
  if (has3D) setUpViewControls(director, mission);

  /* Event card, timeline, and tour ---------------------------------- */
  const sheet = setUpSheet();
  const tour = new Tour(mission, player, director, { jumpStraight: () => motion.matches });

  const describe = (eventIndex: number): string => {
    const event = index.events[eventIndex];
    return event
      ? copy.card.nowShowing(event.title, speakMissionTime(index.seconds[eventIndex] ?? 0, index.countsDays))
      : mission.name;
  };

  const card = setUpEventCard({
    index,
    reducedMotion: () => motion.matches,
    onStep: (step) => {
      const target = Math.min(index.events.length - 1, Math.max(0, card.shown + step));
      const seconds = index.seconds[target];
      if (seconds === undefined) return;
      player.seek(seconds);
      // Several events can share a time; show exactly the one asked for.
      card.show(target);
      announce(describe(target));
    },
  });
  const timeline = setUpTimeline(player, index);

  // The card follows the clock, except while the tour holds it at a stop.
  let followed = -2;
  const follow = (): void => {
    const current = index.eventAt(player.time);
    if (current === followed) return;
    followed = current;
    if (tour.phase === 'stopped' || tour.phase === 'finished') return;
    card.show(current);
    if (!tour.active) announce(describe(current));
  };
  player.subscribe(follow);
  follow();

  const explore = (): void => {
    if (tour.active) {
      tour.exit();
      announce(copy.tour.ended);
    }
    // Begin at the first event rather than the moment before it.
    const first = index.seconds[0];
    if (index.eventAt(player.time) < 0 && first !== undefined) player.seek(first);
    byId('play', HTMLButtonElement).focus({ preventScroll: true });
  };

  tour.subscribe(() => {
    document.body.classList.toggle('is-touring', tour.active);
    timeline.setLocked(tour.active);
    card.setTourMode(tour.active);
    card.setHidden(tour.phase === 'finished');
    const stop = tour.stop;
    // On the way to a stop, the card follows the clock again.
    if (tour.phase === 'traveling') card.show(index.eventAt(player.time));
    if (tour.phase === 'stopped' && stop) {
      card.show(index.events.indexOf(stop));
      announce(copy.tour.arrived(tour.index + 1, tour.total, stop.title));
    }
  });
  setUpTourPanel(tour, {
    onExplore: explore,
    onRestart: () => {
      tour.start(0);
      focusTourNext();
    },
  });

  /* The mission picker ------------------------------------------------ */
  const startTour = (): void => {
    if (tour.total === 0) {
      explore();
    } else {
      sheet.setExpanded(false);
      tour.start(0);
      focusTourNext();
    }
    remeasure();
  };
  const startExploring = (): void => {
    explore();
    remeasure();
  };

  // Reopening the picker pauses the clock; closing it without a choice plays on.
  let resumeAfterHub = false;
  const memorials = setUpMemorial({ load: loadMemorial, nameOf, addressOf });
  const hub = setUpHub({
    currentId: mission.id,
    currentName: mission.name,
    summaries,
    isDraft,
    onMemorial: (id, from) => memorials.open(id, from),
    onTour: startTour,
    onExplore: startExploring,
    onReturn: () => {
      if (resumeAfterHub) player.play();
      resumeAfterHub = false;
    },
  });
  hubButton.addEventListener('click', () => {
    // A tour on its way to a stop arrives there when the clock pauses.
    resumeAfterHub = player.playing && !tour.active;
    player.pause();
    hub.open(hubButton);
  });

  /* Tell the scene what the interface covers ------------------------- */
  const remeasure = watchViewInsets(
    [
      { element: byId('masthead', HTMLElement), side: 'top' },
      { element: byId('views', HTMLDivElement), side: 'top' },
      { element: byId('sheet', HTMLElement), side: (wide) => (wide ? 'right' : 'bottom') },
      { element: byId('timeline', HTMLElement), side: 'bottom' },
      // The picker frames the view only as the welcome; reopened, it sits over everything.
      {
        element: byId('hub', HTMLDialogElement),
        side: (wide) => (hub.mode !== 'welcome' ? null : wide ? 'right' : 'bottom'),
      },
    ],
    (insets) => director.setViewInsets(insets),
  );

  return {
    welcome(revealId) {
      hub.welcome(revealId);
      remeasure();
    },
    explore: startExploring,
    tour: startTour,
    memorial(id) {
      // Over the picker, focus goes back to the entry's Read button when the page closes.
      const from = hub.mode ? hub.actionFor(id) : null;
      memorials.open(id, from);
    },
  };
}
