import type { Director, Player } from '../app/contract';
import type { FlightOutline } from '../app/outline';
import { Tour } from '../app/tour';
import { copy } from '../content/copy';
import { credits } from '../content/credits';
import type { MissionBundle } from '../content/missions/bundle';
import type { Memorial, Mission, MissionSummary } from '../content/types';
import type { Extra, ExtraMeta } from '../extras/types';
import { renderAbout, renderHowDrawn } from './about-dialog';
import { pauseAllAudio } from './audio-player';
import { renderCredits } from './credits-dialog';
import { recordVisit } from './device-store';
import { setUpDialog } from './dialogs';
import { byId, el, hiddenText, reducedMotionQuery } from './dom';
import { setUpEventCard } from './event-card';
import { setUpExtraSheet } from './extra-sheet';
import { missionDates, speakMissionTime } from './format';
import { setUpHub, type HubOptions } from './hub';
import { icon } from './icons';
import { watchViewInsets } from './layout';
import { setUpMemorial } from './memorial-dialog';
import { MissionIndex } from './mission-index';
import { setUpSheet } from './sheet';
import { setUpTimeline } from './timeline';
import { focusTourNext, setUpTourPanel } from './tour-panel';
import { setUpViewControls } from './view-controls';
import { setUpWelcome, type WelcomeOptions } from './welcome';

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
  /** Load any mission's bundle (for extras). */
  loadBundle(id: string): Promise<MissionBundle>;
  /** The extras list: hands-on first, each group in order. */
  extras: readonly ExtraMeta[];
  /** Any extra's title by id, including one the list leaves out (a draft opened by its address). */
  extraTitleOf(id: string): string | undefined;
  /** True for an unfinished extra (only the dev server lists one). */
  isExtraDraft(meta: ExtraMeta): boolean;
  /** Load an extra's code when it is opened. */
  loadExtra(id: string): Promise<Extra>;
  player: Player;
  director: Director;
  /** False when there is no 3D view (for example, without WebGL). */
  has3D: boolean;
  /** Without a 3D view: the short note to show where it would be, and whether reloading may help. */
  no3D?: { note: string; offerReload: boolean };
}

export interface MissionInterface {
  /** Show the welcome over the 3D view, as the first thing a visitor sees. */
  welcome(): void;
  /** Skip the welcome and start exploring. */
  explore(): void;
  /** Skip the welcome and start the guided tour (or explore, if the mission has no tour). */
  tour(): void;
  /** Open a memorial page, over the welcome when it is showing. */
  memorial(id: string): void;
  /** Open an extra in its full-screen sheet, with the address's other values as its params. */
  extra(id: string, params: URLSearchParams): void;
}

export interface MissionListOptions {
  summaries: readonly MissionSummary[];
  /** Any mission's name by id, including one the list leaves out (a draft opened by its address). */
  nameOf(id: string): string | undefined;
  isDraft(summary: MissionSummary): boolean;
  loadMemorial(id: string): Promise<Memorial>;
  addressOf(id: string): string;
}

/** The mission list with no mission behind it, ready to open over the page. */
export interface MissionList {
  open(returnTo: HTMLElement): void;
}

/**
 * The mission list on its own, with no mission behind it: the way on when a
 * mission could not be loaded. Every entry opens its own page.
 */
export function setUpMissionList({
  summaries,
  nameOf,
  isDraft,
  loadMemorial,
  addressOf,
}: MissionListOptions): MissionList {
  const memorials = setUpMemorial({ load: loadMemorial, nameOf, addressOf });
  const hub = setUpHub({
    currentId: null,
    summaries,
    isDraft,
    onMemorial: (id, from) => memorials.open(id, from),
    // Extras open over a mission, so the list on its own leaves them out.
    extras: [],
    isExtraDraft: () => false,
    onExtra() {},
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
  const {
    mission,
    flight,
    cited,
    summaries,
    nameOf,
    isDraft,
    loadMemorial,
    addressOf,
    player,
    director,
    has3D,
  } = options;
  const { extras, extraTitleOf, isExtraDraft, loadExtra, loadBundle } = options;
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
  hubButton.append(
    icon('chevron-down', 'icon masthead__chevron'),
    hiddenText(`, ${copy.header.missions}`),
  );
  renderAbout(mission);
  renderHowDrawn(mission, flight);
  renderCredits(credits, { mission, cited, summaries, extras });
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
  if (options.no3D) {
    const note = byId('stage-note', HTMLDivElement);
    byId('stage-note-text', HTMLParagraphElement).textContent = options.no3D.note;
    if (options.no3D.offerReload) {
      const reload = el('button', 'button', copy.memorial.reload);
      reload.setAttribute('data-testid', 'stage-note-reload');
      reload.type = 'button';
      reload.addEventListener('click', () => window.location.reload());
      note.append(reload);
    }
    note.hidden = false;
  }

  // Fast forward: the scene says when the ship circles too fast to follow.
  // A quiet mark takes the date's place by the clock (the date spins too fast
  // to read then), and screen readers hear why once, not on every lap.
  const fastMark = byId('clock-fast', HTMLSpanElement);
  fastMark.textContent = copy.timeline.fastForward;
  let fastShown = false;
  let fastSpokenAt = -Infinity;
  director.subscribe(() => {
    const fast = director.fastForward === true;
    if (fast === fastShown) return;
    fastShown = fast;
    fastMark.hidden = !fast;
    fastMark.parentElement?.classList.toggle('clock__date--fast', fast);
    const now = performance.now();
    if (fast && now - fastSpokenAt > 60_000) {
      fastSpokenAt = now;
      announce(copy.timeline.fastForwardSpoken);
    }
  });

  /* Event card, timeline, and tour ---------------------------------- */
  const sheet = setUpSheet();
  const tour = new Tour(mission, player, director, { jumpStraight: () => motion.matches });

  const describe = (eventIndex: number): string => {
    const event = index.events[eventIndex];
    return event
      ? copy.card.nowShowing(
          event.title,
          speakMissionTime(index.seconds[eventIndex] ?? 0, index.countsDays),
        )
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
    // "Try it" only for an extra the list shows, so a draft stays hidden in a published build.
    extraTitle: (id) => extras.find((meta) => meta.id === id)?.title,
    onTryIt: (extraId, event, from) =>
      extraSheet.open(extraId, new URLSearchParams({ mission: mission.id, event: event.id }), from),
  });
  const timeline = setUpTimeline(player, index);

  // The card follows the clock, except on the tour, which holds it on its stop.
  let followed = -2;
  const follow = (): void => {
    const current = index.eventAt(player.time);
    if (current === followed) return;
    followed = current;
    if (tour.active) return;
    card.show(current);
    announce(describe(current));
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

  let tourPhase = tour.phase;
  tour.subscribe(() => {
    document.body.classList.toggle('is-touring', tour.active);
    timeline.setLocked(tour.active);
    card.setTourMode(tour.active);
    card.setHidden(tour.phase === 'finished');
    // Opening an extra pauses the clock, which would end a tour's travel early, so
    // "Try it" waits for the stop. At a stop the clock is already still.
    card.setTryItAllowed(tour.phase !== 'traveling');
    const stop = tour.stop;
    // On the way, the card already shows the stop it is heading for, so it
    // turns once as the trip begins rather than flicking through every event
    // passed, which go by too quickly to read. The clock and the timeline show the way.
    if (stop) card.show(index.events.indexOf(stop));
    if (tour.phase === 'stopped' && stop)
      announce(copy.tour.arrived(tour.index + 1, tour.total, stop.title));
    // Leaving the tour partway to a stop: the card catches up with the clock.
    if (tour.phase === 'off' && tourPhase === 'traveling') card.show(index.eventAt(player.time));
    tourPhase = tour.phase;
  });
  setUpTourPanel(tour, {
    onExplore: explore,
    onRestart: () => {
      tour.start(0);
      focusTourNext();
    },
  });

  /* The welcome ------------------------------------------------------- */
  const welcomeOptions: WelcomeOptions = {
    mission,
    tourStops: tour.total,
    summaries,
    onTour: () => startTour(),
    onExplore: () => startExploring(),
    onAllMissions: (from) => openList(from),
  };
  // Without a 3D view, the welcome says so.
  if (options.no3D) welcomeOptions.no3D = options.no3D;
  const welcome = setUpWelcome(welcomeOptions);

  // Starting a tour or exploring counts as a visit (the patch book reads it); the welcome and the list alone do not.
  // The welcome goes first, so the interface is back on the screen before focus moves into it.
  const startTour = (): void => {
    welcome.hide();
    recordVisit(mission.id);
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
    welcome.hide();
    recordVisit(mission.id);
    explore();
    remeasure();
  };

  /* Extras ----------------------------------------------------------- */
  // While an extra is open the clock and the 3D view rest; closing puts them back.
  let resumeAfterExtra = false;
  const extraSheet = setUpExtraSheet({
    load: loadExtra,
    titleOf: extraTitleOf,
    summaries,
    missionId: mission.id,
    loadBundle,
    announce,
    onOpen: () => {
      pauseAllAudio();
      resumeAfterExtra = player.playing && !tour.active;
      player.pause();
      director.setDrawing?.(false);
    },
    onClose: () => {
      director.setDrawing?.(true);
      if (resumeAfterExtra) player.play();
      resumeAfterExtra = false;
    },
  });

  /* The mission list -------------------------------------------------- */
  // Opening the list pauses the clock; closing it without a choice plays on.
  let resumeAfterHub = false;
  const memorials = setUpMemorial({ load: loadMemorial, nameOf, addressOf });
  const hubOptions: HubOptions = {
    currentId: mission.id,
    summaries,
    isDraft,
    onMemorial: (id, from) => memorials.open(id, from),
    extras,
    isExtraDraft,
    onExtra: (id, from) => extraSheet.open(id, new URLSearchParams(), from),
    onTour: startTour,
    onExplore: startExploring,
    onReturn: () => {
      if (resumeAfterHub) player.play();
      resumeAfterHub = false;
    },
  };
  // Without a 3D view, the list opens with a line that says so.
  if (options.no3D) hubOptions.lede = copy.hub.ledeNo3D;
  const hub = setUpHub(hubOptions);
  const openList = (from: HTMLElement): void => {
    // A tour on its way to a stop arrives there when the clock pauses.
    resumeAfterHub = player.playing && !tour.active;
    player.pause();
    pauseAllAudio();
    hub.open(from);
  };
  hubButton.addEventListener('click', () => openList(hubButton));

  /* Tell the scene what the interface covers ------------------------- */
  const remeasure = watchViewInsets(
    [
      { element: byId('masthead', HTMLElement), side: 'top' },
      { element: byId('views', HTMLDivElement), side: 'top' },
      { element: byId('sheet', HTMLElement), side: (wide) => (wide ? 'right' : 'bottom') },
      { element: byId('timeline', HTMLElement), side: 'bottom' },
      // The welcome: beside the view on a wide screen, under it on a phone. It counts only
      // while it shows, and the rest of the interface is hidden then.
      { element: byId('welcome', HTMLElement), side: (wide) => (wide ? 'right' : 'bottom') },
    ],
    (insets) => director.setViewInsets(insets),
  );

  return {
    welcome() {
      welcome.show();
      remeasure();
    },
    explore: startExploring,
    tour: startTour,
    memorial(id) {
      // Over the welcome, focus goes to "All missions" when the page closes.
      memorials.open(id, welcome.showing ? welcome.allMissions : null);
    },
    extra(id, params) {
      // Over the welcome, focus goes to "All missions" when the sheet closes.
      extraSheet.open(id, params, welcome.showing ? welcome.allMissions : null);
    },
  };
}
