/**
 * "Land on the Moon": bring a lunar module down past a field of boulders to
 * a patch of clear, flat ground, stop its slide, and set it down slowly
 * before the fuel runs out, the way Apollo 11's crew made the first landing. A practice toy,
 * not a simulator: its rules and made-up numbers are in game.ts, and the
 * screen says what is simplified.
 *
 * The facts shown come from missions' cited stories, with their own
 * citations: the real landing (Apollo 11's landing event, or the landing
 * event of the mission this was opened from, when it has one) and the
 * lunar module's name, from that mission's call signs. The game's own few
 * sentences about the real flights (the boulders, the real descent, the
 * top half flying back to orbit) are cited in facts.ts, and their sources
 * are folded under the Start button, as "Dock two spacecraft" does.
 *
 * It has two levels (game.ts says what differs), chosen above Start with
 * the games' shared level picker; each run ends with the shared stars, its
 * three goals, and Play again (src/extras/shared/). The level last chosen
 * and the most stars on each level are remembered on this device.
 */
import './landing.css';
import type { Citation, ElapsedTime, Mission, MissionEvent } from '../../content/types.ts';
import { sourcesBlock } from '../../ui/citations.ts';
import { button, el, setText } from '../../ui/dom.ts';
import { formatDate, monthOf } from '../../ui/format.ts';
import { createLevelPicker } from '../shared/level-picker.ts';
import type { Level } from '../shared/levels.ts';
import { gameRecord } from '../shared/record.ts';
import { createRunEnd, type Goal } from '../shared/run-end.ts';
import type { Extra, ExtraContext, ExtraMount, UpNextOptions } from '../types.ts';
import { BACK_TO_ORBIT, BOULDERS, DESCENT } from './facts.ts';
import {
  LEVEL_RULES,
  RULES,
  advance,
  ahead,
  driftShows,
  fuelLeft,
  groundUnder,
  isStill,
  isTooFast,
  landingRoom,
  overClear,
  pastClear,
  push,
  runGoals,
  startFlight,
  type Contact,
  type Flight,
  type RunGoals,
  type Thrust,
} from './game.ts';
import { meta } from './meta.ts';
import { RING_PX, createLandingScene, type LandingScene } from './scene.ts';

/** The mission of the first landing, whose story the end of a run shows. */
const FIRST_LANDING = 'apollo-11';

/* ------------------------------------------------------------------ */
/* Facts from the missions' stories.                                   */
/* ------------------------------------------------------------------ */

/**
 * A story's landing: the event called "landing", which every flight that
 * landed has. The moment that offers this game need not be the landing
 * (Apollo 11 offers it as the powered descent begins), so offering it does
 * not make a moment the landing.
 */
function landingEvent(mission: Mission): MissionEvent | undefined {
  return mission.events.find((event) => event.id === 'landing');
}

/** The lunar module's radio name, as the mission's cited call signs give it: "Eagle". */
function landerName(mission: Mission | undefined): string | undefined {
  return mission?.callSigns?.value.find((sign) => /\blunar module\b/i.test(sign.craft))?.name;
}

/**
 * "4 days 6 hours 45 minutes 39.9 seconds", keeping the precision the story
 * prints; no part that is zero. A flight to the Moon takes days, so whole
 * days come out of the hours (our arithmetic).
 */
function elapsedInWords(elapsed: ElapsedTime): string {
  const [h = '0', m = '0', s = '0'] = elapsed.replace('-', '').split(':');
  const unit = (count: string, one: string): string =>
    `${count} ${Number(count) === 1 ? one : `${one}s`}`;
  const days = Math.floor(Number(h) / 24);
  const hours = Number(h) % 24;
  const parts: string[] = [];
  if (days) parts.push(unit(String(days), 'day'));
  if (hours) parts.push(unit(String(hours), 'hour'));
  if (Number(m)) parts.push(unit(String(Number(m)), 'minute'));
  if (Number(s)) parts.push(unit(s.replace(/^0(?=\d)/, ''), 'second'));
  return parts.join(' ');
}

/** The landing the end of a run shows as the real one: its flight's story, and the landing in it. */
interface RealLanding {
  mission: Mission;
  event: MissionEvent;
}

/** The landing in a flight's story; null when the story does not load or tells of no landing. */
async function landingIn(context: ExtraContext, id: string): Promise<RealLanding | null> {
  const bundle = await context.loadBundle(id).catch(() => null);
  const event = bundle ? landingEvent(bundle.mission) : undefined;
  return bundle && event ? { mission: bundle.mission, event } : null;
}

/**
 * The real landing to show: that of the flight this was opened over, when
 * it has one, else Apollo 11's, whose story loads only then. Null when that
 * does not load either.
 */
async function realLanding(
  context: ExtraContext,
  params: URLSearchParams,
): Promise<RealLanding | null> {
  const from = params.get('mission');
  if (from && from !== FIRST_LANDING && context.summaries.some((summary) => summary.id === from)) {
    const theirs = await landingIn(context, from);
    if (theirs) return theirs;
  }
  return landingIn(context, FIRST_LANDING);
}

/* ------------------------------------------------------------------ */
/* Words on screen.                                                    */
/* ------------------------------------------------------------------ */

const TEXT = {
  loading: 'Getting the lander ready.',
  canvas:
    'The lander above the Moon. A patch of clear, flat ground lies to the right, with boulders on both sides of it.',
  canvasLanded: 'The lander standing on clear, flat ground on the Moon.',
  canvasAborted:
    'The lander has split in two. The top half is flying back up, and the bottom half has dropped to the ground.',
  noWebgl:
    'This browser cannot draw the 3D view, so the lander is not shown. You can still land it by the read-outs.',
  height: 'Height',
  across: 'Over the ground',
  // Not a fact from a source: what the word means, as the game uses it.
  whatLanding: 'Landing means bringing the lander down so gently that it can fly home again.',
  // Its first sentence is Apollo 11's, cited in facts.ts (BOULDERS); the
  // rest says how the game plays.
  howTo:
    'The computer is heading for a field of boulders. Slide over to clear ground, stop your slide, and come down slowly. Things in space keep moving: each push keeps going until you push the other way.',
  fuelRule: 'The engine holds you up, but it burns fuel every second. Do not take too long.',
  // Under the level picker, for the level chosen.
  levels: {
    easy: 'Plenty of fuel, and a wide patch of clear ground.',
    hard: 'Less fuel, a smaller patch, and you start out sliding.',
  } satisfies Record<Level, string>,
  start: 'Start',
  // Over the folded sources under Start: the game's sentences about the real flights that they back.
  sourcesFor:
    'Where the sentences on the boulders, the real descent, and the top half flying the crew back to orbit come from:',
  pad: 'Lander controls',
  thrust: {
    up: 'Slower',
    down: 'Faster',
    left: 'Left',
    right: 'Right',
  } satisfies Record<Thrust, string>,
  rule: 'Each press is one push. It keeps going until you push the other way.',
  startOver: 'Start over',
  fuel: 'Fuel',
  fuelWord: { plenty: 'Plenty', low: 'Getting low', almost: 'Almost out', empty: 'Empty' },
  falling: 'Falling speed',
  speed: { rising: 'Going up', hovering: 'Hovering', gentle: 'Slow and steady', fast: 'Too fast' },
  slide: 'Sideways slide',
  slideWord: { still: 'Almost still', left: 'Sliding left', right: 'Sliding right' },
  clearGround: 'Clear ground',
  // Beside the drift ring: where the lander will be this far ahead.
  aheadLabel: `in ${RULES.aheadSeconds} seconds`,
  coach: {
    rising: 'You are going up. Push Faster to come back down.',
    hovering: 'You are hovering, and that burns fuel. Push Faster to come down.',
    tooFast: 'Too fast. Push Slower before you touch down.',
    // Before the clear patch.
    boulders: 'Boulders below. Push Right to slide over to clear ground.',
    close: 'Clear ground is close. Push Left to slow your slide.',
    keepSliding: 'Keep sliding. Clear ground is ahead.',
    // Past it, over the far boulders.
    slidPast: 'You slid past the clear ground. Push Left to slide back.',
    slidingBack: 'Keep sliding back. Clear ground is close.',
    // Over it.
    stopRight: 'Clear ground below. Push Left to stop your slide.',
    stopLeft: 'Clear ground below. Push Right to stop your slide.',
    clearBelow: 'Clear ground below. Come down slowly.',
  },
  // Why a bump did not land (see bumpWord).
  bump: {
    rocks: 'Rocks. The lander cannot stand on boulders. Slide over to clear ground.',
    tooFastAndSliding:
      'Too hard, and still sliding. Slow down and stop your slide before you touch.',
    tooFast: 'Too hard. Slow your fall before you touch down.',
    sliding: 'Still sliding. Stop your slide before you touch down.',
  },
  backToStart: 'You are back at the start.',
  started: 'Started. The lander is coming down fast over the boulders.',
  fuelLow: 'Fuel is getting low.',
  fuelAlmost: 'Fuel is almost out.',
  // The top half flying the crew back up to orbit is cited in facts.ts (BACK_TO_ORBIT).
  outOfFuel: 'Out of fuel. The top half is flying the crew back up to orbit. No landing this time.',
  landed: (name: string | undefined): string =>
    name ? `Landed. The ${name} is on the Moon.` : 'Landed. The lander is on the Moon.',
  // The three stars of a run: what each is for when it was earned and when not, and a tip when not
  // (the fuel star's depends on the level: on Hard it needs a bold run).
  goals: {
    landed: {
      met: 'Landed on clear ground',
      missed: 'Land on clear ground',
      tip: 'Stop your slide first, then come down.',
    },
    gentle: {
      met: 'Gentle touchdown',
      missed: 'Gentle touchdown',
      tip: 'Slow down a little more before you touch.',
    },
    spareFuel: {
      met: 'Fuel to spare',
      missed: 'Fuel to spare',
      tip: {
        easy: 'Do not hover. Head for the clear ground right away.',
        hard: 'Be bolder: slide across faster and slow down later.',
      },
    },
  } satisfies Record<
    keyof RunGoals,
    { met: string; missed: string; tip: string | Record<Level, string> }
  >,
  // The line over the real landing: its flight and the day it happened.
  realLine: (mission: Mission, event: MissionEvent): string =>
    event.utc ? `${mission.name} · ${formatDate(new Date(event.utc))}` : mission.name,
  when: (mission: Mission, event: MissionEvent): string =>
    mission.launch
      ? `${mission.name} lifted off on ${formatDate(new Date(mission.launch.value.utc))}. This came ${elapsedInWords(event.elapsed)} later.`
      : `This came ${elapsedInWords(event.elapsed)} after liftoff.`,
  // What's next, from a flight: back to it, at the landing when that is where it was left.
  pickUp: (flight: string, atTheLanding: boolean): string =>
    atTheLanding ? `Pick up ${flight} after the landing` : `Pick up ${flight}`,
  waiting: 'Your flight is waiting where you left it.',
  back: (flight: string): string => `Back to ${flight}`,
  // What's next, from the list: the flight where the landing really happened.
  seeReal: 'See the real landing',
  flightAndMonth: (name: string, month: string): string => (month ? `${name}, ${month}` : name),
  // A landing's title is a sentence ("The Eagle has landed"), not a name for the moment.
  opensAt: 'Opens at the landing.',
  fly: (name: string): string => `Fly ${name}`,
  // The simplification, said once in plain words. The real descent and the
  // computer's help are cited in facts.ts (DESCENT).
  simplified:
    'A practice toy, not a simulator. The real descent took more than twelve minutes, and a computer helped the crew most of the way down. The distances and speeds here are not the real ones.',
} as const;

/** The key each button answers to, by its name. */
const KEY_NAME: Readonly<Record<Thrust, string>> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
};

/** The push each key makes: the same table, the other way round. */
const KEYS: ReadonlyMap<string, Thrust> = new Map(
  Object.entries(KEY_NAME).map(([thrust, key]) => [key, thrust as Thrust]),
);

/** The key hint shown on each button, where there is likely a keyboard. */
const KEY_HINT: Readonly<Record<Thrust, string>> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

/** How many pips the falling-speed read-out has: the gentle ones, then the too fast ones. */
const PIPS = RULES.maxFalling;
/** How far the slide marker moves for each sideways push, in percent of its track. */
const SLIDE_STEP = 8;
/** How long a bump's message stays before the usual advice comes back, in seconds. */
const BUMP_MESSAGE_SECONDS = 4;
/** How long the lander settles on its footpads before the result shows, in seconds. */
const SETTLE_SECONDS = 0.8;
/** Where the "Clear ground" label goes on a level: under the middle of the clear patch's marker, in front of the lander's path. */
const clearLabelAt = (level: Level) => ({
  x: (LEVEL_RULES[level].clearFrom + RULES.clearTo) / 2,
  height: -2.5,
});

/** What the falling-speed read-out says. */
function fallingWord(f: Flight): string {
  if (f.pushesDown < 0) return TEXT.speed.rising;
  if (f.pushesDown === 0) return TEXT.speed.hovering;
  return isTooFast(f) ? TEXT.speed.fast : TEXT.speed.gentle;
}

/** What the slide read-out says. */
function slideWord(f: Flight): string {
  if (isStill(f)) return TEXT.slideWord.still;
  return f.pushesX < 0 ? TEXT.slideWord.left : TEXT.slideWord.right;
}

/** What the fuel strip says. */
function fuelWord(f: Flight): string {
  const left = fuelLeft(f);
  if (left >= 0.5) return TEXT.fuelWord.plenty;
  if (left >= 0.15) return TEXT.fuelWord.low;
  return left > 0 ? TEXT.fuelWord.almost : TEXT.fuelWord.empty;
}

/** True when the ground under where the lander will be in 5 seconds is the clear patch. */
const clearAhead = (f: Flight): boolean => groundUnder(f.level, ahead(f).x) === 0;

/**
 * The three goals of a run that ended on a level, for the stars: worded for
 * how it went, with a tip under each one missed. A run that ran out of fuel
 * missed them all, and only the first, the landing, gets its tip.
 */
function goalsOf(goals: RunGoals, level: Level): readonly [Goal, Goal, Goal] {
  const goal = (key: keyof RunGoals, withTip: boolean): Goal => {
    const words = TEXT.goals[key];
    if (goals[key]) return { label: words.met, met: true };
    if (!withTip) return { label: words.missed, met: false };
    const tip = typeof words.tip === 'string' ? words.tip : words.tip[level];
    return { label: words.missed, met: false, tip };
  };
  return [goal('landed', true), goal('gentle', goals.landed), goal('spareFuel', goals.landed)];
}

/** Why a bump did not land: the boulders first, then too fast, still sliding, or both. */
function bumpWord({ tooFast, sliding, rocks }: Extract<Contact, { kind: 'bump' }>): string {
  if (rocks) return TEXT.bump.rocks;
  if (tooFast && sliding) return TEXT.bump.tooFastAndSliding;
  if (tooFast) return TEXT.bump.tooFast;
  return TEXT.bump.sliding;
}

/* ------------------------------------------------------------------ */
/* Pieces of the screen.                                               */
/* ------------------------------------------------------------------ */

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

/** An arrow on the 24-unit icon grid, pointing up, turned for the other ways. */
function arrowIcon(thrust: Thrust): SVGSVGElement {
  const turn = { up: 0, right: 90, down: 180, left: 270 }[thrust];
  const icon = svg('svg', {
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
    focusable: 'false',
    class: 'landing__arrow',
  });
  icon.append(
    svg('path', {
      d: 'M12 19V5.5M6 11.5l6-6 6 6',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.75,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      transform: `rotate(${turn} 12 12)`,
    }),
  );
  return icon;
}

/** A bar that fills from the left, and the part of it that fills. */
interface FillBar {
  bar: HTMLDivElement;
  fill: HTMLSpanElement;
}

/** A bar for the fuel, and the height without the 3D view. */
function fillBar(): FillBar {
  const bar = el('div', 'landing__bar');
  bar.setAttribute('aria-hidden', 'true');
  const fill = el('span', 'landing__bar-fill');
  bar.append(fill);
  return { bar, fill };
}

/** Where a place across the ground sits on the flat track: 0 at the play area's left edge, 100 at its right. */
const acrossPercent = (x: number): number => ((x + RULES.maxSide) / (2 * RULES.maxSide)) * 100;

/** A label over the picture, for the eye only, placed where the scene says a point is. */
interface PictureLabel {
  element: HTMLSpanElement;
  /** Puts it at the point (fractions of the canvas from its top left corner), or hides it when the point is out of view. */
  place(spot: { left: number; top: number } | null): void;
}

/** A label over the picture, hidden until placed; placing it again where it already is writes nothing. */
function pictureLabel(className: string, text: string): PictureLabel {
  const element = el('span', className, text);
  element.setAttribute('aria-hidden', 'true');
  element.hidden = true;
  let left = Number.NaN;
  let top = Number.NaN;
  return {
    element,
    place(spot) {
      if (element.hidden !== (spot === null)) element.hidden = spot === null;
      if (!spot || (spot.left === left && spot.top === top)) return;
      left = spot.left;
      top = spot.top;
      element.style.left = `${(left * 100).toFixed(2)}%`;
      element.style.top = `${(top * 100).toFixed(2)}%`;
    },
  };
}

/** The falling-speed and slide read-outs, and the parts of them that change as it flies. */
function flightReadouts() {
  const readouts = el('div', 'landing__readouts');
  const fallPanel = el('div', 'landing__readout');
  const pipRow = el('div', 'landing__pips');
  pipRow.setAttribute('aria-hidden', 'true');
  const pips = Array.from({ length: PIPS }, (_, index) => {
    const pip = el(
      'span',
      index < RULES.gentleFalling ? 'landing__pip' : 'landing__pip landing__pip--fast',
    );
    pipRow.append(pip);
    return pip;
  });
  const fallValue = el('p', 'landing__value');
  fallValue.setAttribute('data-testid', 'landing-falling');
  fallPanel.append(el('p', 'landing__label', TEXT.falling), pipRow, fallValue);

  const slidePanel = el('div', 'landing__readout');
  // The marker shows which way and how fast the slide is; inside the outlined middle is almost still.
  const slideTrack = el('div', 'landing__track');
  slideTrack.setAttribute('aria-hidden', 'true');
  const slideMarker = el('span', 'landing__marker');
  slideTrack.append(el('span', 'landing__zone'), slideMarker);
  const slideValue = el('p', 'landing__value');
  slideValue.setAttribute('data-testid', 'landing-slide');
  slidePanel.append(el('p', 'landing__label', TEXT.slide), slideTrack, slideValue);
  readouts.append(fallPanel, slidePanel);
  return { readouts, fallPanel, pips, fallValue, slidePanel, slideMarker, slideValue };
}

/** The real landing: its flight and day, its title, what happened, how long after liftoff, and the sources. */
function realStory({ mission, event }: RealLanding): HTMLDivElement {
  const story = el('div', 'landing__real');
  const citations: Citation[] = [...event.citations, ...(mission.launch?.citations ?? [])];
  story.append(
    el('p', 'landing__label', TEXT.realLine(mission, event)),
    el('h3', 'extra-heading', event.title),
    // The longer text: for a landing it tells the fuel that was left and the crew's words.
    el('p', 'extra-text', event.text.more ?? event.text.short),
    el('p', 'extra-note', TEXT.when(mission, event)),
    sourcesBlock(citations, event.discrepancy, mission.launch?.discrepancy),
  );
  return story;
}

/** After landing: the landed line and the real landing; the stars go under the line, and "Up next" at the end. */
function afterLanding(landedText: string, real: RealLanding | null) {
  const after = el('section', 'landing__after');
  after.hidden = true;
  const landedLine = el('p', 'landing__landed', landedText);
  landedLine.setAttribute('data-testid', 'landing-landed');
  // Focus goes here on landing, so a screen reader reads on from it.
  landedLine.tabIndex = -1;
  after.append(landedLine);
  if (real) after.append(realStory(real));
  return { after, landedLine };
}

/** The picture without the 3D view, and how to show a moment of the flight on it. */
interface FlatView {
  element: HTMLDivElement;
  /** Shows a level's ground: where the clear patch is. */
  setLevel(level: Level): void;
  /** Shows how high the lander is and where it is over the ground. */
  show(flight: Flight): void;
}

/** Without the 3D view: a note, and two plain bars for how high the lander is and where it is over a level's ground. */
function flatView(level: Level): FlatView {
  const element = el('div', 'landing__fallback');
  const { bar: heightBar, fill: heightFill } = fillBar();
  const acrossTrack = el('div', 'landing__track');
  acrossTrack.setAttribute('aria-hidden', 'true');
  // The outlined part is where the lander's middle is when both footpads are over the clear patch.
  const clearZone = el('span', 'landing__zone');
  const setLevel = (shown: Level): void => {
    const room = landingRoom(shown);
    const clearStart = acrossPercent(room.from);
    const clearEnd = acrossPercent(room.to);
    clearZone.style.left = `${clearStart.toFixed(2)}%`;
    clearZone.style.width = `${(clearEnd - clearStart).toFixed(2)}%`;
  };
  setLevel(level);
  const acrossMarker = el('span', 'landing__marker');
  acrossTrack.append(clearZone, acrossMarker);
  element.append(
    el('p', 'extra-note', TEXT.noWebgl),
    el('p', 'landing__label', TEXT.height),
    heightBar,
    el('p', 'landing__label', TEXT.across),
    acrossTrack,
  );
  return {
    element,
    setLevel,
    show(flight) {
      const high = Math.max(0, Math.min(1, flight.height / RULES.startHeight));
      heightFill.style.width = `${(high * 100).toFixed(1)}%`;
      acrossMarker.style.left = `${acrossPercent(flight.x).toFixed(2)}%`;
    },
  };
}

/** What's next: back to the flight waiting behind the sheet, or the flight where the landing really happened. */
function nextStep(
  context: ExtraContext,
  params: URLSearchParams,
  real: RealLanding | null,
): UpNextOptions {
  if (context.origin === 'flight') {
    const flight =
      context.summaries.find((summary) => summary.id === context.missionId)?.name ??
      context.missionId;
    // "After the landing" only when the flight was left at the landing shown here.
    const atTheLanding =
      real !== null &&
      real.mission.id === context.missionId &&
      params.get('event') === real.event.id;
    return {
      title: TEXT.pickUp(flight, atTheLanding),
      line: TEXT.waiting,
      primary: { label: TEXT.back(flight), run: () => context.close() },
    };
  }
  if (real) {
    const { mission, event } = real;
    return {
      title: TEXT.seeReal,
      line: TEXT.flightAndMonth(mission.name, monthOf(mission.launch?.value.utc ?? '')),
      sentence: TEXT.opensAt,
      mission: mission.id,
      primary: {
        label: TEXT.fly(mission.name),
        run: () => context.openMission(mission.id, { event: event.id }),
      },
    };
  }
  // The story of the first landing did not load: its flight can still be flown.
  const first = context.summaries.find((summary) => summary.id === FIRST_LANDING);
  const name = first?.name ?? FIRST_LANDING;
  return {
    title: TEXT.seeReal,
    line: TEXT.flightAndMonth(name, monthOf(first?.date ?? '')),
    mission: FIRST_LANDING,
    primary: {
      label: TEXT.fly(name),
      run: () => context.openMission(FIRST_LANDING, { start: 'explore' }),
    },
  };
}

/* ------------------------------------------------------------------ */
/* The extra.                                                          */
/* ------------------------------------------------------------------ */

/** Where a run is: before it, flying, down (settling, then landed), or out of fuel (the halves parting, then at rest). */
type Phase = 'intro' | 'flying' | 'settling' | 'landed' | 'aborting' | 'aborted';
/** Down on clear ground: settling on its footpads, or landed. */
const isDown = (phase: Phase): boolean => phase === 'settling' || phase === 'landed';
/** Out of fuel: the two halves parting, or come to rest. */
const isOut = (phase: Phase): boolean => phase === 'aborting' || phase === 'aborted';

async function mount(
  host: HTMLElement,
  context: ExtraContext,
  params: URLSearchParams,
): Promise<ExtraMount> {
  const { signal } = context;
  const loading = el('p', 'extra-note', TEXT.loading);
  host.append(loading);
  const real = await realLanding(context, params);
  if (signal.aborted) return { dispose() {} };
  loading.remove();

  let still = context.reducedMotion();
  context.onReducedMotionChange((reduced) => {
    still = reduced;
  });
  // The level last chosen on this device, and the most stars on each.
  const record = gameRecord(context.store);

  /* ----------------------------- Layout ----------------------------- */

  const root = el('div', 'landing');
  const stage = el('div', 'landing__view');
  const canvas = el('canvas', 'landing__canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', TEXT.canvas);

  // The fuel strip, across the top of the picture.
  const fuelStrip = el('div', 'landing__fuel');
  const { bar: fuelBar, fill: fuelFill } = fillBar();
  const fuelValue = el('span', 'landing__fuel-word');
  fuelValue.setAttribute('data-testid', 'landing-fuel');
  fuelStrip.append(el('span', 'landing__label', TEXT.fuel), fuelBar, fuelValue);
  stage.append(canvas, fuelStrip);

  const side = el('div', 'landing__side');

  // Before starting.
  const intro = el('section', 'landing__intro');
  const words = el('div', 'landing__words');
  words.append(
    el('p', 'extra-text landing__lead', TEXT.whatLanding),
    el('p', 'extra-note landing__how', TEXT.howTo),
    el('p', 'extra-note landing__how', TEXT.fuelRule),
  );
  // Choosing a level shows its ground at once.
  const picker = createLevelPicker({
    record,
    describe: TEXT.levels,
    onChange: (level) => showLevel(level),
    signal,
  });
  const startButton = button('button button--primary button--large', TEXT.start);
  startButton.setAttribute('data-testid', 'landing-start');
  // Everything to read before starting comes first, together; the folded
  // sources of the sentences about the real flights go under the Start
  // button, labeled as theirs, as "Dock two spacecraft" does.
  const sources = sourcesBlock([...BOULDERS, ...DESCENT, ...BACK_TO_ORBIT]);
  sources.setAttribute('aria-describedby', 'landing-sources-for');
  const sourcesFor = el('p', 'landing__source-for', TEXT.sourcesFor);
  sourcesFor.id = 'landing-sources-for';
  // Together in one box, so on a phone held upright they can sit below the
  // screen without moving the picture or Start (see landing.css).
  const sourcesBox = el('div', 'landing__sources');
  sourcesBox.append(sourcesFor, sources);
  intro.append(words, picker.element, startButton, sourcesBox);

  // While flying, and after the fuel runs out.
  const flying = el('section', 'landing__fly');
  flying.hidden = true;
  const { readouts, fallPanel, pips, fallValue, slidePanel, slideMarker, slideValue } =
    flightReadouts();

  const coach = el('p', 'landing__coach');
  coach.setAttribute('data-testid', 'landing-coach');
  // When the fuel runs out this is the result, and focus goes here, so a screen reader reads on from it.
  coach.tabIndex = -1;

  const controls = el('div', 'landing__controls');
  const pad = el('div', 'landing__pad');
  pad.setAttribute('role', 'group');
  pad.setAttribute('aria-label', TEXT.pad);
  const thrustButton = (thrust: Thrust): HTMLButtonElement => {
    const control = button(`button landing__thrust landing__thrust--${thrust}`);
    control.setAttribute('aria-keyshortcuts', KEY_NAME[thrust]);
    // The word is the button's name; the key hint is only for the eye.
    const key = el('kbd', 'landing__key', KEY_HINT[thrust]);
    key.setAttribute('aria-hidden', 'true');
    control.append(arrowIcon(thrust), el('span', undefined, TEXT.thrust[thrust]), key);
    control.addEventListener('click', () => fire(thrust), { signal });
    return control;
  };
  const thrustButtons = {
    up: thrustButton('up'),
    left: thrustButton('left'),
    right: thrustButton('right'),
    down: thrustButton('down'),
  };
  // A cross, in the order Tab takes them: up on top, left and right, then down.
  pad.append(thrustButtons.up, thrustButtons.left, thrustButtons.right, thrustButtons.down);
  const aside = el('div', 'landing__aside');
  const startOver = button('button', TEXT.startOver);
  aside.append(el('p', 'extra-note landing__rule', TEXT.rule), startOver);
  controls.append(pad, aside);
  flying.append(readouts, coach, controls);

  // After landing.
  const landedText = TEXT.landed(landerName(real?.mission));
  const { after, landedLine } = afterLanding(landedText, real);

  // The stars of a run that ended, its goals, and Play again: under the landed line, or under the coach line when the fuel ran out.
  const runEnd = createRunEnd({
    record,
    onPlay: (level) => {
      picker.refresh();
      begin(level, true);
    },
    signal,
  });

  // Built afresh at each landing, at the end, so it always starts folded on a phone. Its button
  // is plain, as Play again is the amber one, and Play again is not repeated in it.
  let upNext: HTMLElement | null = null;
  const showUpNext = (): void => {
    const block = context.upNext({ ...nextStep(context, params, real), plainPrimary: true });
    if (upNext) upNext.replaceWith(block);
    else after.append(block);
    upNext = block;
  };

  side.append(intro, flying, after, el('p', 'extra-note landing__simple', TEXT.simplified));
  root.append(stage, side);
  host.append(root);

  /* ------------------------------ 3D view ----------------------------- */

  let scene: LandingScene | null = null;
  // With the 3D view, the two labels over it; without it, the plain bars in its place.
  let labels: { clear: PictureLabel; ahead: PictureLabel } | null = null;
  let flat: FlatView | null = null;
  try {
    scene = createLandingScene(canvas, picker.level);
    // Two small labels over the picture, under the fuel strip, placed each frame where the scene says.
    labels = {
      clear: pictureLabel('landing__tag', TEXT.clearGround),
      ahead: pictureLabel('landing__tag landing__tag--ahead', TEXT.aheadLabel),
    };
    // The drift label keeps clear of the ring by the ring's size on screen.
    stage.style.setProperty('--landing-ring', `${RING_PX}px`);
    fuelStrip.before(labels.clear.element, labels.ahead.element);
  } catch (error) {
    console.warn(error);
    canvas.remove();
    // Without the 3D view, two plain bars show how high the lander is and where it is over the ground.
    flat = flatView(picker.level);
    stage.append(flat.element);
    stage.classList.add('landing__view--flat');
  }

  /* ------------------------------ Playing ----------------------------- */

  let phase: Phase = 'intro';
  // Started on the level chosen; a new run starts a new flight on its level.
  let flight = startFlight(picker.level);
  let touchFalling = 0;
  let settleLeft = 0;
  let bumpMessage = '';
  let bumpLeft = 0;
  let shownFalling = Number.NaN;
  const timers = new Set<number>();

  const coachWord = (f: Flight): string => {
    if (isOut(phase)) return TEXT.outOfFuel;
    if (bumpLeft > 0) return bumpMessage;
    if (f.pushesDown < 0) return TEXT.coach.rising;
    if (f.pushesDown === 0) return TEXT.coach.hovering;
    if (isTooFast(f)) return TEXT.coach.tooFast;
    const fastRight = f.pushesX > RULES.stillSideways;
    const fastLeft = f.pushesX < -RULES.stillSideways;
    const past = pastClear(f);
    if (!overClear(f) && !past) {
      if (f.pushesX <= 0) return TEXT.coach.boulders;
      // A slow drift that reaches clear ground soon needs no push yet, so it keeps sliding too.
      return fastRight && clearAhead(f) ? TEXT.coach.close : TEXT.coach.keepSliding;
    }
    if (past) return f.pushesX < 0 ? TEXT.coach.slidingBack : TEXT.coach.slidPast;
    if (fastRight) return TEXT.coach.stopRight;
    if (fastLeft) return TEXT.coach.stopLeft;
    return TEXT.coach.clearBelow;
  };

  /** The read-outs and the coach line, from the flight as it is now. */
  const showReadouts = (): void => {
    // Out of fuel, the read-outs follow the top half, with the crew: straight back up.
    const out = isOut(phase);
    const shown: Flight = out ? { ...flight, pushesX: 0, pushesDown: -1 } : flight;
    if (shownFalling !== shown.pushesDown) {
      shownFalling = shown.pushesDown;
      pips.forEach((pip, index) => pip.classList.toggle('is-on', index < shown.pushesDown));
      fallPanel.classList.toggle('is-good', !out && fallingWord(shown) === TEXT.speed.gentle);
      fallPanel.classList.toggle('is-warn', !out && isTooFast(shown));
      setText(fallValue, fallingWord(shown));
    }
    slideMarker.style.left = `${50 + shown.pushesX * SLIDE_STEP}%`;
    slidePanel.classList.toggle('is-good', !out && isStill(shown));
    setText(slideValue, slideWord(shown));
    setText(coach, coachWord(shown));
    showGauges();
  };

  /** The fuel strip, and without the 3D view the height and over-the-ground bars. */
  const showGauges = (): void => {
    const left = fuelLeft(flight);
    fuelFill.style.width = `${(left * 100).toFixed(1)}%`;
    fuelBar.classList.toggle('is-empty', left <= 0);
    setText(fuelValue, fuelWord(flight));
    flat?.show(flight);
  };

  /** The two labels over the picture: the clear ground while its marker shows, and the drift while it is drawn. */
  const placeLabels = (): void => {
    if (!scene || !labels) return;
    const clearLabel = clearLabelAt(flight.level);
    labels.clear.place(isDown(phase) ? null : scene.spot(clearLabel.x, clearLabel.height));
    const drift = ahead(flight);
    const drawn = (phase === 'intro' || phase === 'flying') && driftShows(flight, drift);
    const spot = drawn ? scene.spot(drift.x, drift.height) : null;
    labels.ahead.place(spot);
    // Near the right edge, the label goes on the ring's other side so it stays in view.
    labels.ahead.element.classList.toggle('landing__tag--before', spot !== null && spot.left > 0.7);
  };

  const showPhase = (): void => {
    const out = isOut(phase);
    const flyingLayout = phase !== 'intro' && phase !== 'landed';
    intro.hidden = phase !== 'intro';
    flying.hidden = !flyingLayout;
    after.hidden = phase !== 'landed';
    fuelStrip.hidden = phase === 'landed';
    root.dataset['phase'] = phase;
    root.classList.toggle('landing--flying', flyingLayout);
    // Out of fuel the coach line is the result, with the stars under it: the read-outs and the controls step aside.
    readouts.hidden = out;
    controls.hidden = out;
    canvas.setAttribute(
      'aria-label',
      isDown(phase) ? TEXT.canvasLanded : out ? TEXT.canvasAborted : TEXT.canvas,
    );
  };

  /** The read-outs' words for the flight as it is now. */
  const wordsNow = (): readonly [falling: string, slide: string, fuel: string] => [
    fallingWord(flight),
    slideWord(flight),
    fuelWord(flight),
  ];
  // What the read-outs last said aloud, so only a change is said again.
  let said = wordsNow();
  const hearNothingNew = (): void => {
    said = wordsNow();
  };
  /** What changed since it was last said: a read-out's new word, or a fuel warning the first time the fuel word gets there. */
  const news = (): string[] => {
    const [saidFalling, saidSlide, saidFuel] = said;
    said = wordsNow();
    const [falling, slide, fuel] = said;
    const messages: string[] = [];
    if (falling !== saidFalling) messages.push(`${falling}.`);
    if (slide !== saidSlide) messages.push(`${slide}.`);
    if (fuel !== saidFuel && fuel === TEXT.fuelWord.low) messages.push(TEXT.fuelLow);
    if (fuel !== saidFuel && fuel === TEXT.fuelWord.almost) messages.push(TEXT.fuelAlmost);
    return messages;
  };
  const announceNews = (): void => {
    const messages = news();
    if (messages.length > 0) context.announce(messages.join(' '));
  };

  /* One loop runs while anything moves: the flight (and its fuel), a lean, the flame, the two halves. */
  let stopLoop: (() => void) | null = null;
  const onFrame = (seconds: number): void => {
    if (phase === 'flying') {
      const contact = advance(flight, seconds);
      if (bumpLeft > 0) bumpLeft -= seconds;
      if (contact) touch(contact);
      else announceNews();
      if (phase === 'flying') {
        scene?.fly(flight, seconds, still);
        showReadouts();
      }
    } else if (phase === 'settling') {
      settleLeft -= seconds;
      if (settleLeft <= 0) settle();
    }
    const moving = scene?.tick(seconds, still) ?? false;
    if (phase === 'aborting' && !moving) {
      phase = 'aborted';
      showPhase();
    }
    placeLabels();
    // The loop stops before a run, where a frame comes only from a resize, and at a run's end once the picture is still.
    const over = phase === 'landed' || phase === 'aborted';
    if (phase === 'intro' || (over && !moving)) endLoop();
  };
  const startLoop = (): void => {
    if (stopLoop) return;
    if (scene) {
      stopLoop = scene.view.addFrameCallback((seconds) => {
        onFrame(seconds);
        return true;
      });
      return;
    }
    // No 3D view: the same loop on plain animation frames.
    let frame = 0;
    let last: number | null = null;
    const tick = (now: number): void => {
      const seconds = last === null ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;
      frame = requestAnimationFrame(tick);
      onFrame(seconds);
    };
    frame = requestAnimationFrame(tick);
    stopLoop = () => cancelAnimationFrame(frame);
  };
  function endLoop(): void {
    stopLoop?.();
    stopLoop = null;
  }

  /** A push from a button or a key, with a brief light on its button. */
  function fire(thrust: Thrust): void {
    if (phase !== 'flying') return;
    push(flight, thrust);
    scene?.puff(thrust, still);
    const control = thrustButtons[thrust];
    control.classList.add('is-firing');
    const timer = window.setTimeout(() => {
      control.classList.remove('is-firing');
      timers.delete(timer);
    }, 180);
    timers.add(timer);
    announceNews();
    showReadouts();
    startLoop();
  }

  /** The footpads reached the ground (a landing or a bump), or the tank ran dry. */
  function touch(contact: Contact): void {
    switch (contact.kind) {
      case 'landed':
        touchFalling = contact.falling;
        scene?.land(flight, still);
        // The read-outs keep their last words while it settles; only the gauges show it down.
        showGauges();
        if (still) settle();
        else {
          phase = 'settling';
          settleLeft = SETTLE_SECONDS;
          showPhase();
        }
        break;
      case 'empty':
        runOut();
        break;
      case 'bump':
        bumpMessage = bumpWord(contact);
        bumpLeft = BUMP_MESSAGE_SECONDS;
        if (still) {
          // Under reduced motion, a bump is a plain reset: straight back to the start.
          flight = startFlight(flight.level);
          bumpMessage = `${bumpMessage} ${TEXT.backToStart}`;
        }
        shownFalling = Number.NaN;
        // The bump's message says what happened; the read-outs' new words are not said over it.
        hearNothingNew();
        context.announce(bumpMessage);
        break;
    }
  }

  /** Shows how a run ended, under its result line: the stars, the goals, and Play again. What to tell a screen reader of the stars. */
  const showStars = (goals: RunGoals, under: HTMLElement): string => {
    const { spoken } = runEnd.show({ level: flight.level, goals: goalsOf(goals, flight.level) });
    under.after(runEnd.element);
    picker.refresh();
    return spoken;
  };

  /** Down and settled: the result and its stars, the real landing, and what's next. */
  function settle(): void {
    phase = 'landed';
    const stars = showStars(
      runGoals(flight, { kind: 'landed', falling: touchFalling }),
      landedLine,
    );
    showUpNext();
    showPhase();
    context.announce(`${landedText} ${stars}`);
    landedLine.focus();
    startLoop();
  }

  /** The tank is dry: the top half takes the crew back up, and the coach line says so over no stars. */
  function runOut(): void {
    scene?.abort(flight, still);
    phase = still || !scene ? 'aborted' : 'aborting';
    shownFalling = Number.NaN;
    const stars = showStars(runGoals(flight, { kind: 'empty' }), coach);
    showPhase();
    showReadouts();
    context.announce(`${TEXT.outOfFuel} ${stars}`);
    coach.focus();
    startLoop();
  }

  /** A level's ground in the picture, from the start screen's choice or a new run's level. */
  const showGround = (level: Level): void => {
    scene?.setLevel(level);
    flat?.setLevel(level);
  };

  /** The start screen, after choosing a level: that level's ground, with the lander where a run on it starts. */
  function showLevel(level: Level): void {
    if (phase !== 'intro') return;
    flight = startFlight(level);
    showGround(level);
    shownFalling = Number.NaN;
    hearNothingNew();
    showReadouts();
    scene?.fly(flight, 0, still);
    placeLabels();
  }

  /** A new run on a level, from Start, Start over, Play again, or the other level's button. */
  const begin = (level: Level, focus: boolean): void => {
    scene?.reset();
    showGround(level);
    flight = startFlight(level);
    runEnd.hide();
    settleLeft = 0;
    bumpLeft = 0;
    shownFalling = Number.NaN;
    hearNothingNew();
    phase = 'flying';
    showPhase();
    showReadouts();
    scene?.fly(flight, 0, still);
    if (focus) thrustButtons.up.focus();
    context.announce(TEXT.started);
    startLoop();
  };

  startButton.addEventListener('click', () => begin(picker.level, true), { signal });
  startOver.addEventListener('click', () => begin(flight.level, false), { signal });

  document.addEventListener(
    'keydown',
    (event) => {
      if (phase !== 'flying' || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest('input, textarea, select'))
      )
        return;
      const thrust = KEYS.get(event.key);
      if (!thrust) return;
      // The arrows would otherwise scroll the sheet.
      event.preventDefault();
      // Holding a key down is not needed: one press, one push.
      if (event.repeat) return;
      fire(thrust);
    },
    { signal },
  );

  // The labels follow the camera, which the scene works out again for each
  // shape of canvas, so one frame runs whenever the canvas changes size (and
  // once when it is first laid out), even while nothing else moves.
  let resizing: ResizeObserver | null = null;
  if (scene) {
    resizing = new ResizeObserver(() => startLoop());
    resizing.observe(canvas);
  }

  // The opening picture: the lander high over the boulders, already coming down too fast (and on Hard, sliding away).
  showPhase();
  showReadouts();
  scene?.fly(flight, 0, still);
  placeLabels();

  return {
    dispose() {
      endLoop();
      resizing?.disconnect();
      resizing = null;
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      scene?.dispose();
      scene = null;
    },
  };
}

export const extra: Extra = { meta, mount };
