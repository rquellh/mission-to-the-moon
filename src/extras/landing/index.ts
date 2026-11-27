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
 */
import './landing.css';
import type { Citation, ElapsedTime, Mission, MissionEvent } from '../../content/types.ts';
import { sourcesBlock } from '../../ui/citations.ts';
import { button, el, setText } from '../../ui/dom.ts';
import { formatDate, monthOf } from '../../ui/format.ts';
import type { Extra, ExtraContext, ExtraMount, UpNextOptions } from '../types.ts';
import { BACK_TO_ORBIT, BOULDERS, DESCENT } from './facts.ts';
import {
  RULES,
  advance,
  ahead,
  driftShows,
  fuelLeft,
  groundUnder,
  isStill,
  isTooFast,
  overClear,
  pastClear,
  push,
  startFlight,
  type Contact,
  type Flight,
  type Thrust,
} from './game.ts';
import { meta } from './meta.ts';
import { createLandingScene, type LandingScene } from './scene.ts';

/** The mission of the first landing, whose story the end of a run shows. */
const FIRST_LANDING = 'apollo-11';

/* ------------------------------------------------------------------ */
/* Facts from the missions' stories.                                   */
/* ------------------------------------------------------------------ */

/** Says a story's title names a landing: "The Eagle has landed", "Landing". */
const LANDING_WORD = /\bland(s|ed|ing)?\b/i;

/**
 * A story's landing event: the one the visitor came from when it is a
 * landing, else the one called "landing", else the first in the landing
 * chapter whose title says landing. The moment that offers this game need
 * not be the landing (Apollo 11 offers it as the powered descent begins),
 * so offering it does not make a moment the landing.
 */
function landingEvent(mission: Mission, from: string | null): MissionEvent | undefined {
  const byTitle = (event: MissionEvent): boolean =>
    event.chapter === 'landing' && LANDING_WORD.test(event.title);
  const isLanding = (event: MissionEvent): boolean => event.id === 'landing' || byTitle(event);
  return (
    mission.events.find((event) => event.id === from && isLanding(event)) ??
    mission.events.find((event) => event.id === 'landing') ??
    mission.events.find(byTitle)
  );
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
  tryAgain: 'Try again',
  fuel: 'Fuel',
  fuelWord: { plenty: 'Plenty', low: 'Getting low', almost: 'Almost out', empty: 'Empty' },
  falling: 'Falling speed',
  speed: { rising: 'Going up', hovering: 'Hovering', gentle: 'Slow and steady', fast: 'Too fast' },
  slide: 'Sideways slide',
  slideWord: { still: 'Almost still', left: 'Sliding left', right: 'Sliding right' },
  clearGround: 'Clear ground',
  inFive: 'in 5 seconds',
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
  bump: ({ tooFast, sliding, rocks }: Extract<Contact, { kind: 'bump' }>): string =>
    rocks
      ? 'Rocks. The lander cannot stand on boulders. Slide over to clear ground.'
      : tooFast && sliding
        ? 'Too hard, and still sliding. Slow down and stop your slide before you touch.'
        : tooFast
          ? 'Too hard. Slow your fall before you touch down.'
          : 'Still sliding. Stop your slide before you touch down.',
  backToStart: 'You are back at the start.',
  started: 'Started. The lander is coming down fast over the boulders.',
  fuelLow: 'Fuel is getting low.',
  fuelAlmost: 'Fuel is almost out.',
  // The top half flying the crew back up to orbit is cited in facts.ts (BACK_TO_ORBIT).
  outOfFuel: 'Out of fuel. The top half is flying the crew back up to orbit. No landing this time.',
  landed: (name: string | undefined): string =>
    name ? `Landed. The ${name} is on the Moon.` : 'Landed. The lander is on the Moon.',
  touchdown: 'Touchdown',
  touchdownWord: { gentle: 'Gentle', firm: 'Firm' },
  fuelLeft: 'Fuel left',
  fuelLeftWord: {
    most: 'More than half',
    half: 'About half',
    quarter: 'About a quarter',
    none: 'Almost none',
  },
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

const KEYS: ReadonlyMap<string, Thrust> = new Map([
  ['ArrowUp', 'up'],
  ['ArrowDown', 'down'],
  ['ArrowLeft', 'left'],
  ['ArrowRight', 'right'],
]);

/** The key each button answers to, by its name. */
const KEY_NAME: Readonly<Record<Thrust, string>> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
};

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
/** Where the "Clear ground" label goes: under the middle of the clear patch's marker, in front of the lander's path. */
const CLEAR_LABEL = { x: (RULES.clearFrom + RULES.clearTo) / 2, height: -2.5 };

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

/** A bar for the fuel, the fuel left, and the height without the 3D view. */
function fillBar(): FillBar {
  const bar = el('div', 'landing__bar');
  bar.setAttribute('aria-hidden', 'true');
  const fill = el('span', 'landing__bar-fill');
  bar.append(fill);
  return { bar, fill };
}

/** Where a place across the ground sits on the flat track: 0 at the play area's left edge, 100 at its right. */
const acrossPercent = (x: number): number => ((x + RULES.maxSide) / (2 * RULES.maxSide)) * 100;

/** Puts a label over the picture where the scene says a point is, or hides it when the point is out of view. */
function place(tag: HTMLElement, spot: { left: number; top: number } | null): void {
  tag.hidden = spot === null;
  if (!spot) return;
  tag.style.left = `${(spot.left * 100).toFixed(2)}%`;
  tag.style.top = `${(spot.top * 100).toFixed(2)}%`;
}

/* ------------------------------------------------------------------ */
/* The extra.                                                          */
/* ------------------------------------------------------------------ */

async function mount(
  host: HTMLElement,
  context: ExtraContext,
  params: URLSearchParams,
): Promise<ExtraMount> {
  const { signal } = context;
  const loading = el('p', 'extra-note', TEXT.loading);
  host.append(loading);

  // Apollo 11's story (its landing and its lunar module's name), and the
  // story of the landing flight this was opened from, if any.
  const fromMission = params.get('mission');
  const otherId =
    fromMission &&
    fromMission !== FIRST_LANDING &&
    context.summaries.some((summary) => summary.id === fromMission)
      ? fromMission
      : null;
  const [first, other] = await Promise.all([
    context.loadBundle(FIRST_LANDING).catch(() => null),
    otherId ? context.loadBundle(otherId).catch(() => null) : Promise.resolve(null),
  ]);
  if (signal.aborted) return { dispose() {} };
  loading.remove();

  const otherEvent = other ? landingEvent(other.mission, params.get('event')) : undefined;
  // Opened at a moment of Apollo 11 itself, that moment wins when it is a landing.
  const firstEvent = first
    ? landingEvent(first.mission, fromMission === FIRST_LANDING ? params.get('event') : null)
    : undefined;
  const real =
    other && otherEvent
      ? { mission: other.mission, event: otherEvent }
      : first && firstEvent
        ? { mission: first.mission, event: firstEvent }
        : null;

  let still = context.reducedMotion();
  context.onReducedMotionChange((reduced) => {
    still = reduced;
  });

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
  intro.append(words, startButton, sourcesBox);

  // While flying, and after the fuel runs out.
  const flying = el('section', 'landing__fly');
  flying.hidden = true;

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

  const coach = el('p', 'landing__coach');
  coach.setAttribute('data-testid', 'landing-coach');
  // Focus goes here when the fuel runs out, so a screen reader reads on from it.
  coach.tabIndex = -1;

  const controls = el('div', 'landing__controls');
  const pad = el('div', 'landing__pad');
  pad.setAttribute('role', 'group');
  pad.setAttribute('aria-label', TEXT.pad);
  const thrustButtons = new Map<Thrust, HTMLButtonElement>();
  for (const thrust of ['up', 'left', 'right', 'down'] as const) {
    const control = button(`button landing__thrust landing__thrust--${thrust}`);
    control.setAttribute('aria-keyshortcuts', KEY_NAME[thrust]);
    // The word is the button's name; the key hint is only for the eye.
    const key = el('kbd', 'landing__key', KEY_HINT[thrust]);
    key.setAttribute('aria-hidden', 'true');
    control.append(arrowIcon(thrust), el('span', undefined, TEXT.thrust[thrust]), key);
    control.addEventListener('click', () => fire(thrust), { signal });
    thrustButtons.set(thrust, control);
    pad.append(control);
  }
  const aside = el('div', 'landing__aside');
  const startOver = button('button', TEXT.startOver);
  aside.append(el('p', 'extra-note landing__rule', TEXT.rule), startOver);
  controls.append(pad, aside);
  flying.append(readouts, coach, controls);

  // After landing.
  const after = el('section', 'landing__after');
  after.hidden = true;
  const landedText = TEXT.landed(landerName(real?.mission));
  const landedLine = el('p', 'landing__landed', landedText);
  landedLine.setAttribute('data-testid', 'landing-landed');
  // Focus goes here on landing, so a screen reader reads on from it.
  landedLine.tabIndex = -1;

  const results = el('div', 'landing__readouts');
  const touchdownPanel = el('div', 'landing__readout landing__readout--spread');
  const touchdownValue = el('p', 'landing__value');
  touchdownPanel.append(el('p', 'landing__label', TEXT.touchdown), touchdownValue);
  const leftPanel = el('div', 'landing__readout');
  const { bar: leftBar, fill: leftFill } = fillBar();
  const leftValue = el('p', 'landing__value');
  leftPanel.append(el('p', 'landing__label', TEXT.fuelLeft), leftBar, leftValue);
  results.append(touchdownPanel, leftPanel);
  after.append(landedLine, results);

  if (real) {
    const { mission, event } = real;
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
    after.append(story);
  }

  /** What's next: back to the flight waiting behind the sheet, or the flight where the landing really happened. */
  const nextStep = (): UpNextOptions => {
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
  };
  // Built afresh at each landing, where the run's buttons go, so it always starts folded on a phone.
  let upNext: HTMLElement | null = null;
  const showUpNext = (): void => {
    const block = context.upNext({
      ...nextStep(),
      actions: [{ label: TEXT.tryAgain, again: true, run: () => begin(true) }],
    });
    if (upNext) upNext.replaceWith(block);
    else after.append(block);
    upNext = block;
  };

  side.append(intro, flying, after, el('p', 'extra-note landing__simple', TEXT.simplified));
  root.append(stage, side);
  host.append(root);

  /* ------------------------------ 3D view ----------------------------- */

  let scene: LandingScene | null = null;
  let clearTag: HTMLElement | null = null;
  let aheadTag: HTMLElement | null = null;
  let heightFill: HTMLElement | null = null;
  let acrossMarker: HTMLElement | null = null;
  try {
    scene = createLandingScene(canvas);
    // Two small labels over the picture, under the fuel strip, placed each frame where the scene says.
    clearTag = el('span', 'landing__tag landing__tag--clear', TEXT.clearGround);
    aheadTag = el('span', 'landing__tag landing__tag--ahead', TEXT.inFive);
    for (const tag of [clearTag, aheadTag]) {
      tag.setAttribute('aria-hidden', 'true');
      tag.hidden = true;
    }
    fuelStrip.before(clearTag, aheadTag);
  } catch (error) {
    console.warn(error);
    canvas.remove();
    // Without the 3D view, two plain bars show how high the lander is and where it is over the ground.
    const fallback = el('div', 'landing__fallback');
    const { bar: heightBar, fill } = fillBar();
    heightFill = fill;
    const acrossTrack = el('div', 'landing__track');
    acrossTrack.setAttribute('aria-hidden', 'true');
    // The outlined part is where the lander's middle is when both footpads are over the clear patch.
    const clearZone = el('span', 'landing__zone');
    const clearStart = acrossPercent(RULES.clearFrom + RULES.footHalfSpan);
    const clearEnd = acrossPercent(RULES.clearTo - RULES.footHalfSpan);
    clearZone.style.left = `${clearStart.toFixed(2)}%`;
    clearZone.style.width = `${(clearEnd - clearStart).toFixed(2)}%`;
    acrossMarker = el('span', 'landing__marker');
    acrossTrack.append(clearZone, acrossMarker);
    fallback.append(
      el('p', 'extra-note', TEXT.noWebgl),
      el('p', 'landing__label', TEXT.height),
      heightBar,
      el('p', 'landing__label', TEXT.across),
      acrossTrack,
    );
    stage.append(fallback);
    stage.classList.add('landing__view--flat');
  }

  /* ------------------------------ Playing ----------------------------- */

  type Phase = 'intro' | 'flying' | 'settling' | 'landed' | 'aborting' | 'aborted';
  let phase: Phase = 'intro';
  let flight = startFlight();
  let touchFalling = 0;
  let settleLeft = 0;
  let bumpMessage = '';
  let bumpLeft = 0;
  let shownFalling = Number.NaN;
  const timers = new Set<number>();

  const fallingWord = (f: Flight): string =>
    f.pushesDown < 0
      ? TEXT.speed.rising
      : f.pushesDown === 0
        ? TEXT.speed.hovering
        : isTooFast(f)
          ? TEXT.speed.fast
          : TEXT.speed.gentle;

  const slideWord = (f: Flight): string =>
    isStill(f) ? TEXT.slideWord.still : f.pushesX < 0 ? TEXT.slideWord.left : TEXT.slideWord.right;

  const fuelWord = (f: Flight): string => {
    const left = fuelLeft(f);
    return left >= 0.5
      ? TEXT.fuelWord.plenty
      : left >= 0.15
        ? TEXT.fuelWord.low
        : left > 0
          ? TEXT.fuelWord.almost
          : TEXT.fuelWord.empty;
  };

  const fuelLeftWord = (f: Flight): string => {
    const left = fuelLeft(f);
    return left >= 0.6
      ? TEXT.fuelLeftWord.most
      : left >= 0.4
        ? TEXT.fuelLeftWord.half
        : left >= 0.18
          ? TEXT.fuelLeftWord.quarter
          : TEXT.fuelLeftWord.none;
  };

  /** True when the ground under where the lander will be in 5 seconds is the clear patch. */
  const clearAhead = (f: Flight): boolean => groundUnder(ahead(f).x) === 0;

  const coachWord = (f: Flight): string => {
    if (phase === 'aborting' || phase === 'aborted') return TEXT.outOfFuel;
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
    const out = phase === 'aborting' || phase === 'aborted';
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
    if (heightFill) {
      const high = Math.max(0, Math.min(1, flight.height / RULES.startHeight));
      heightFill.style.width = `${(high * 100).toFixed(1)}%`;
    }
    if (acrossMarker) acrossMarker.style.left = `${acrossPercent(flight.x).toFixed(2)}%`;
  };

  /** The two labels over the picture: the clear ground while its marker shows, and the drift while it is drawn. */
  const placeLabels = (): void => {
    if (!scene || !clearTag || !aheadTag) return;
    const marked = phase !== 'settling' && phase !== 'landed';
    place(clearTag, marked ? scene.spot(CLEAR_LABEL.x, CLEAR_LABEL.height) : null);
    const drift = ahead(flight);
    const drawn = (phase === 'intro' || phase === 'flying') && driftShows(flight);
    const spot = drawn ? scene.spot(drift.x, drift.height) : null;
    place(aheadTag, spot);
    // Near the right edge, the label goes on the ring's other side so it stays in view.
    aheadTag.classList.toggle('landing__tag--before', spot !== null && spot.left > 0.7);
  };

  const showPhase = (): void => {
    const out = phase === 'aborting' || phase === 'aborted';
    const flyingLayout = phase !== 'intro' && phase !== 'landed';
    intro.hidden = phase !== 'intro';
    flying.hidden = !flyingLayout;
    after.hidden = phase !== 'landed';
    fuelStrip.hidden = phase === 'landed';
    root.dataset['phase'] = phase;
    root.classList.toggle('landing--flying', flyingLayout);
    // Out of fuel the controls stay on screen, but only the run again works: it becomes the one main action.
    for (const control of thrustButtons.values()) control.disabled = out;
    setText(startOver, out ? TEXT.tryAgain : TEXT.startOver);
    startOver.classList.toggle('button--primary', out);
    canvas.setAttribute(
      'aria-label',
      phase === 'settling' || phase === 'landed'
        ? TEXT.canvasLanded
        : out
          ? TEXT.canvasAborted
          : TEXT.canvas,
    );
  };

  // What the read-outs last said aloud, so only a change is said again.
  let saidFalling = fallingWord(flight);
  let saidSlide = slideWord(flight);
  let saidFuel = fuelWord(flight);
  const hearNothingNew = (): void => {
    saidFalling = fallingWord(flight);
    saidSlide = slideWord(flight);
    saidFuel = fuelWord(flight);
  };
  /** What changed since it was last said: a read-out's new word, or a fuel warning the first time the fuel word gets there. */
  const news = (): string[] => {
    const messages: string[] = [];
    const falling = fallingWord(flight);
    const slide = slideWord(flight);
    const fuel = fuelWord(flight);
    if (falling !== saidFalling) messages.push(`${falling}.`);
    if (slide !== saidSlide) messages.push(`${slide}.`);
    if (fuel !== saidFuel && fuel === TEXT.fuelWord.low) messages.push(TEXT.fuelLow);
    if (fuel !== saidFuel && fuel === TEXT.fuelWord.almost) messages.push(TEXT.fuelAlmost);
    saidFalling = falling;
    saidSlide = slide;
    saidFuel = fuel;
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
    if ((phase === 'landed' || phase === 'aborted') && !moving) endLoop();
    if (phase === 'intro') endLoop();
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
    const control = thrustButtons.get(thrust);
    if (control) {
      control.classList.add('is-firing');
      const timer = window.setTimeout(() => {
        control.classList.remove('is-firing');
        timers.delete(timer);
      }, 180);
      timers.add(timer);
    }
    announceNews();
    showReadouts();
    startLoop();
  }

  function touch(contact: Contact): void {
    if (contact.kind === 'landed') {
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
      return;
    }
    if (contact.kind === 'empty') {
      runOut();
      return;
    }
    bumpMessage = TEXT.bump(contact);
    bumpLeft = BUMP_MESSAGE_SECONDS;
    if (still) {
      // Under reduced motion, a bump is a plain reset: straight back to the start.
      flight = startFlight();
      bumpMessage = `${bumpMessage} ${TEXT.backToStart}`;
    }
    shownFalling = Number.NaN;
    // The bump's message says what happened; the read-outs' new words are not said over it.
    hearNothingNew();
    context.announce(bumpMessage);
  }

  /** Down and settled: the result, the real landing, and what's next. */
  function settle(): void {
    phase = 'landed';
    setText(
      touchdownValue,
      touchFalling <= 2 ? TEXT.touchdownWord.gentle : TEXT.touchdownWord.firm,
    );
    leftFill.style.width = `${(fuelLeft(flight) * 100).toFixed(1)}%`;
    setText(leftValue, fuelLeftWord(flight));
    showUpNext();
    showPhase();
    context.announce(landedText);
    landedLine.focus();
    startLoop();
  }

  /** The tank is dry: the top half takes the crew back up, and the run can start again. */
  function runOut(): void {
    scene?.abort(flight, still);
    phase = still || !scene ? 'aborted' : 'aborting';
    shownFalling = Number.NaN;
    showPhase();
    showReadouts();
    context.announce(TEXT.outOfFuel);
    coach.focus();
    startLoop();
  }

  const begin = (focus: boolean): void => {
    scene?.reset();
    flight = startFlight();
    settleLeft = 0;
    bumpLeft = 0;
    shownFalling = Number.NaN;
    hearNothingNew();
    phase = 'flying';
    showPhase();
    showReadouts();
    scene?.fly(flight, 0, still);
    if (focus) thrustButtons.get('up')?.focus();
    context.announce(TEXT.started);
    startLoop();
  };

  startButton.addEventListener('click', () => begin(true), { signal });
  // Out of fuel this is "Try again", the end of a run, so focus goes to the controls as it does from the end screen.
  startOver.addEventListener('click', () => begin(phase === 'aborting' || phase === 'aborted'), {
    signal,
  });

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

  // The opening picture: the lander high over the boulders, already coming down too fast.
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
