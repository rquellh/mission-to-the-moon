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
import { setUpDialog, type DialogHandle } from './dialogs';
import { setUpDock } from './dock';
import { byId, el, hiddenText, reducedMotionQuery } from './dom';
import { setUpEnding, type EndingAfter } from './ending';
import { setUpEventCard } from './event-card';
import { setUpExtraSheet } from './extra-sheet';
import { missionDates, speakMissionTime } from './format';
import { setUpHub, type HubOptions } from './hub';
import { icon } from './icons';
import { watchViewInsets } from './layout';
import { setUpMemorial } from './memorial-dialog';
import { MissionIndex } from './mission-index';
import { setUpRecords } from './records';
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
  // The mission's own pages open from the reference links at the end of "Tell me more" (and About and
  // Sources and credits from the end of the flight too).
  const dialogs = {
    about: setUpDialog(byId('about-dialog', HTMLDialogElement)),
    drawn: setUpDialog(byId('drawn-dialog', HTMLDialogElement)),
    credits: setUpDialog(byId('credits-dialog', HTMLDialogElement)),
  };
  const dialogLinks: Array<[string, DialogHandle]> = [
    ['records-about', dialogs.about],
    ['records-how-drawn', dialogs.drawn],
    ['records-credits', dialogs.credits],
  ];
  for (const [linkId, dialog] of dialogLinks) {
    const link = byId(linkId, HTMLButtonElement);
    link.append(icon('next', 'icon records__link-icon'));
    link.addEventListener('click', () => dialog.open(link));
  }

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
  // A quiet mark shows by the clock, and screen readers hear why once, not
  // on every lap.
  const fastMark = byId('clock-fast', HTMLSpanElement);
  fastMark.textContent = copy.timeline.fastForward;
  let fastShown = false;
  let fastSpokenAt = -Infinity;
  director.subscribe(() => {
    const fast = director.fastForward === true;
    if (fast === fastShown) return;
    fastShown = fast;
    fastMark.hidden = !fast;
    const now = performance.now();
    if (fast && now - fastSpokenAt > 60_000) {
      fastSpokenAt = now;
      announce(copy.timeline.fastForwardSpoken);
    }
  });

  /* The moment card, its two doors, and the tour ---------------------- */
  const tour = new Tour(mission, player, director, { jumpStraight: () => motion.matches });
  // The doors change what covers the 3D view; a resize alone may not show it (the card only moves).
  const dock = setUpDock({ has3D, onLayout: () => remeasure() });
  const records = setUpRecords({ index, reducedMotion: () => motion.matches });

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
    records,
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
      extraSheet.open(
        extraId,
        new URLSearchParams({ mission: mission.id, event: event.id }),
        'flight',
        from,
      ),
    // The photo's small picture opens "Tell me more" and brings the photo into view.
    onPhoto: () => {
      dock.openRecords();
      records.revealPhoto();
    },
    onFinish: () => showEnding('explore'),
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

  /* The end of the flight ---------------------------------------------- */
  // After the tour's last stop, or "Finish" at the end of the clock while exploring, the card says what's next.
  let endedAfter: EndingAfter | null = null;
  const ending = setUpEnding({
    index,
    summaries,
    extras,
    announce,
    onWatchAgain: () => watchAgain(),
    // After the tour: leave the ending and the tour, and explore from the last stop, with Play focused.
    onExplore: () => {
      hideEnding();
      explore();
    },
    onExtra: (id, params, from) => extraSheet.open(id, params, 'flight', from),
    onAbout: (from) => dialogs.about.open(from),
    onCredits: (from) => dialogs.credits.open(from),
    onAllMissions: (from) => openList(from),
    onLayout: () => remeasure(),
  });

  // "Finish" is offered while exploring, once the clock has reached the end of the flight. The last
  // moment is at the end, so the card keeps it there to be read until the visitor moves on.
  const offerFinish = (): void => {
    const atEnd = player.storyTime >= player.story.duration - 1e-6;
    card.setFinishOffered(atEnd && !tour.active && endedAfter === null);
  };
  player.subscribe(offerFinish);
  offerFinish();

  const showEnding = (after: EndingAfter): void => {
    endedAfter = after;
    card.setHidden(true);
    dock.setEnding(true);
    offerFinish();
    ending.show(after);
  };
  const hideEnding = (): void => {
    if (endedAfter === null) return;
    endedAfter = null;
    ending.hide();
    dock.setEnding(false);
    card.setHidden(false);
    offerFinish();
  };

  /** The flight from the beginning, or, after the tour, the tour from its first stop. */
  const watchAgain = (): void => {
    if (endedAfter === 'tour') {
      // Leaving the tour's end hides the ending (see the tour's listener below).
      tour.start(0);
      focusTourNext();
      return;
    }
    hideEnding();
    player.seek(index.seconds[0] ?? player.start);
    player.play();
    byId('play', HTMLButtonElement).focus({ preventScroll: true });
  };

  let tourPhase = tour.phase;
  tour.subscribe(() => {
    document.body.classList.toggle('is-touring', tour.active);
    timeline.setLocked(tour.active);
    dock.setTour(tour.active ? 'touring' : 'off');
    // Past the last stop, the tour ends the way every flight does.
    if (tour.phase === 'finished' && tourPhase !== 'finished') showEnding('tour');
    if (tour.phase !== 'finished' && tourPhase === 'finished') hideEnding();
    offerFinish();
    // Opening an extra pauses the clock, which would end a tour's travel early, so
    // "Try it" waits for the stop. At a stop the clock is already still.
    card.setTryItAllowed(tour.phase !== 'traveling');
    const stop = tour.stop;
    // On the way, the card already shows the stop it is heading for, so it
    // turns once as the trip begins rather than flicking through every event
    // passed, which go by too quickly to read. The scene shows the way.
    if (stop) card.show(index.events.indexOf(stop));
    if (tour.phase === 'stopped' && stop)
      announce(copy.tour.arrived(tour.index + 1, tour.total, stop.title));
    // Leaving the tour partway to a stop: the card catches up with the clock.
    if (tour.phase === 'off' && tourPhase === 'traveling') card.show(index.eventAt(player.time));
    tourPhase = tour.phase;
  });
  setUpTourPanel(tour, { onExplore: explore });

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
    hideEnding();
    recordVisit(mission.id);
    if (tour.total === 0) {
      explore();
    } else {
      tour.start(0);
      focusTourNext();
    }
    remeasure();
  };
  const startExploring = (): void => {
    welcome.hide();
    hideEnding();
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
    extras,
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
    // "All missions" at the end of a run opened from the list: back to the list (still open under an extra opened from it).
    onAllMissions: (from) => {
      if (!hub.showing) openList(from ?? hubButton);
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
    onExtra: (id, from) => extraSheet.open(id, new URLSearchParams(), 'list', from),
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
      // "Look at" and True scale, while Controls are open.
      { element: byId('views', HTMLDivElement), side: 'top' },
      { element: byId('dock', HTMLElement), side: 'bottom' },
      // "Tell me more": a panel at the side on a wide screen, one sheet with the card on a phone.
      { element: byId('records', HTMLElement), side: (wide) => (wide ? 'right' : 'bottom') },
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
      // Over the welcome there is no flight behind the sheet, as when it opens from the list,
      // and focus goes to "All missions" when it closes. Otherwise the flight waits behind it.
      if (welcome.showing) extraSheet.open(id, params, 'list', welcome.allMissions);
      else extraSheet.open(id, params, 'flight');
    },
  };
}
