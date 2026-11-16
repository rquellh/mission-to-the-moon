import type { Director, Player } from '../app/contract';
import { Tour } from '../app/tour';
import { copy } from '../content/copy';
import { credits } from '../content/credits';
import type { Mission } from '../content/types';
import { renderAbout, renderHowDrawn } from './about-dialog';
import { renderCredits } from './credits-dialog';
import { setUpDialog } from './dialogs';
import { byId, hiddenText, reducedMotionQuery } from './dom';
import { setUpEventCard } from './event-card';
import { missionDates, speakElapsed } from './format';
import { setUpHub } from './hub';
import { icon } from './icons';
import { watchViewInsets } from './layout';
import { MissionIndex } from './mission-index';
import { setUpSheet } from './sheet';
import { setUpTimeline } from './timeline';
import { focusTourNext, setUpTourPanel } from './tour-panel';
import { setUpViewControls } from './view-controls';

export interface InterfaceOptions {
  mission: Mission;
  /** Every mission on the site, in flight order: for the mission picker and the photo credits. */
  missions: readonly Mission[];
  player: Player;
  director: Director;
  /** False when there is no 3D view (for example, without WebGL). */
  has3D: boolean;
}

export interface MissionInterface {
  /** Show the mission picker over the 3D view, as the first thing a visitor sees. */
  welcome(): void;
  /** Skip the picker and start exploring. */
  explore(): void;
  /** Skip the picker and start the guided tour (or explore, if the mission has no tour). */
  tour(): void;
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
export function mountInterface({ mission, missions, player, director, has3D }: InterfaceOptions): MissionInterface {
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
  renderHowDrawn(mission);
  renderCredits(credits, missions);
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
    return event ? copy.card.nowShowing(event.title, speakElapsed(index.seconds[eventIndex] ?? 0)) : mission.name;
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
  const hub = setUpHub({
    mission,
    missions,
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
    welcome() {
      hub.welcome();
      remeasure();
    },
    explore: startExploring,
    tour: startTour,
  };
}
