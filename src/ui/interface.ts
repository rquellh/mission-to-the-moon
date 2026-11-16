import type { Director, Player } from '../app/contract';
import { Tour } from '../app/tour';
import { copy } from '../content/copy';
import { credits } from '../content/credits';
import type { Mission } from '../content/types';
import { renderAbout, renderHowDrawn } from './about-dialog';
import { renderCredits } from './credits-dialog';
import { setUpDialog } from './dialogs';
import { byId, reducedMotionQuery } from './dom';
import { setUpEventCard } from './event-card';
import { missionDates, speakElapsed } from './format';
import { watchViewInsets } from './layout';
import { MissionIndex } from './mission-index';
import { setUpSheet } from './sheet';
import { setUpTimeline } from './timeline';
import { focusTourNext, setUpTourPanel } from './tour-panel';
import { setUpViewControls } from './view-controls';
import { setUpWelcome } from './welcome';

export interface InterfaceOptions {
  mission: Mission;
  /** Every mission on the site, for the photo credits. */
  missions: readonly Mission[];
  player: Player;
  director: Director;
  /** False when there is no 3D view (for example, without WebGL). */
  has3D: boolean;
}

export interface MissionInterface {
  /** Show the welcome with its two choices. */
  welcome(): void;
  /** Skip the welcome and start exploring. */
  explore(): void;
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

  /* Header and dialogs ----------------------------------------------- */
  byId('mission-name', HTMLSpanElement).textContent = mission.name;
  byId('mission-dates', HTMLSpanElement).textContent = missionDates(mission);
  renderAbout(mission);
  renderHowDrawn();
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
  if (has3D) setUpViewControls(director, copy.scaleNote);

  /* Event card, timeline, and tour ---------------------------------- */
  const sheet = setUpSheet();
  const tour = new Tour(index.events, player, director, { jumpStraight: () => motion.matches });

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

  /* Tell the scene what the interface covers ------------------------- */
  const remeasure = watchViewInsets(
    [
      { element: byId('masthead', HTMLElement), side: 'top' },
      { element: byId('views', HTMLDivElement), side: 'top' },
      { element: byId('sheet', HTMLElement), side: (wide) => (wide ? 'right' : 'bottom') },
      { element: byId('timeline', HTMLElement), side: 'bottom' },
      { element: byId('welcome', HTMLElement), side: 'bottom' },
    ],
    (insets) => director.setViewInsets(insets),
  );

  const welcome = setUpWelcome({
    stops: tour.total,
    onTour: () => {
      sheet.setExpanded(false);
      tour.start(0);
      focusTourNext();
      remeasure();
    },
    onExplore: () => {
      explore();
      remeasure();
    },
  });

  return {
    welcome() {
      welcome.show();
      remeasure();
    },
    explore() {
      explore();
      remeasure();
    },
  };
}
