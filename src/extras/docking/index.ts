/**
 * "Dock two spacecraft": fly a Gemini the last little way into its Agena
 * target's docking cone, lined up and slowly, the way Gemini 8's crew made
 * the first docking in orbit. A practice toy, not a simulator: its rules
 * and made-up numbers are in game.ts, and the screen says what is simplified.
 *
 * The only facts shown come from missions' cited stories, with their own
 * citations: why docking mattered (Gemini 8's accomplishment), and the real
 * docking (Gemini 8's docking event, or the docking event of the mission
 * this was opened from, when it has one).
 *
 * It has two levels (game.ts says what differs), chosen above Start with
 * the games' shared level picker; each docking ends with the shared stars,
 * its three goals, and Play again (src/extras/shared/), as "Land on the
 * Moon" does. The level last chosen and the most stars on each level are
 * remembered on this device.
 */
import './docking.css';
import type { MissionBundle } from '../../content/missions/bundle.ts';
import type { Citation, ElapsedTime, Fact, Mission, MissionEvent } from '../../content/types.ts';
import type { VehiclePart } from '../../content/vehicle-types.ts';
import { sourcesBlock } from '../../ui/citations.ts';
import { button, el, setText } from '../../ui/dom.ts';
import { formatDate, monthOf } from '../../ui/format.ts';
import { createLevelPicker } from '../shared/level-picker.ts';
import type { Level } from '../shared/levels.ts';
import { gameRecord } from '../shared/record.ts';
import { createRunEnd, type Goal } from '../shared/run-end.ts';
import type { Extra, ExtraContext, ExtraMount, UpNextOptions } from '../types.ts';
import {
  LEVEL_RULES,
  RULES,
  advance,
  backToStart,
  isLinedUp,
  isTooFast,
  push,
  runGoals,
  speedX,
  speedY,
  startFlight,
  type Contact,
  type Flight,
  type RunGoals,
  type Thrust,
} from './game.ts';
import { meta } from './meta.ts';
import { createDockingScene, type DockingParts, type DockingScene } from './scene.ts';

/** The mission of the first docking, whose story says why docking mattered. */
const FIRST_DOCKING = 'gemini-8';

/* ------------------------------------------------------------------ */
/* Facts from the missions' stories.                                   */
/* ------------------------------------------------------------------ */

/** The spacecraft parts, as Gemini 8's vehicle file lists them for flying alone and docked. */
function partsFrom(bundle: MissionBundle | null): DockingParts {
  const find = (ship: string, layout: string): readonly VehiclePart[] | undefined =>
    bundle?.vehicle.find(
      (change) => change.ship === ship && change.layout === layout && change.parts.length > 0,
    )?.parts;
  // The same lists, in case the vehicle file cannot be read.
  const gemini: readonly VehiclePart[] = [
    'gemini-equipment-section',
    'gemini-retro-section',
    'gemini-reentry-module',
  ];
  return {
    gemini: find('gemini', 'alone') ?? gemini,
    agena: find('agena', 'alone') ?? ['agena'],
    docked: find('gemini', 'docked') ?? [...gemini, 'agena'],
  };
}

/**
 * A story's docking event: the one the visitor came from when it is about
 * docking, else one that points at this extra, else the first whose id or
 * title says docking ("Undocking" does not count).
 */
function dockingEvent(mission: Mission, from: string | null): MissionEvent | undefined {
  const isDocking = (event: MissionEvent): boolean =>
    event.handsOn === meta.id || event.id === 'docking' || /\bdock(s|ed|ing)?\b/i.test(event.title);
  return (
    mission.events.find((event) => event.id === from && isDocking(event)) ??
    mission.events.find((event) => event.handsOn === meta.id) ??
    mission.events.find(isDocking)
  );
}

/** Why docking mattered: the first sentence of the "more" text of Gemini 8's docking accomplishment, with its citations. */
function whyItMattered(mission: Mission): { text: string; fact: Fact } | undefined {
  const fact = mission.accomplishments.find((item) => /\bdock/i.test(item.text.short));
  if (!fact) return undefined;
  const first = fact.text.more?.split(/(?<=[.?])\s+(?=[A-Z])/)[0]?.trim();
  return { text: first || fact.text.short, fact };
}

/** "6 hours 33 minutes 16 seconds", keeping the precision the story prints ("37.1 seconds"); no part that is zero. */
function elapsedInWords(elapsed: ElapsedTime): string {
  const [h = '0', m = '0', s = '0'] = elapsed.replace('-', '').split(':');
  const unit = (count: string, one: string): string =>
    `${count} ${Number(count) === 1 ? one : `${one}s`}`;
  const parts: string[] = [];
  if (Number(h)) parts.push(unit(String(Number(h)), 'hour'));
  if (Number(m)) parts.push(unit(String(Number(m)), 'minute'));
  if (Number(s)) parts.push(unit(s.replace(/^0(?=\d)/, ''), 'second'));
  return parts.join(' ');
}

/* ------------------------------------------------------------------ */
/* Words on screen.                                                    */
/* ------------------------------------------------------------------ */

const TEXT = {
  loading: 'Getting the spacecraft ready.',
  canvas:
    "Looking over the Gemini spacecraft's shoulder at the Agena target ahead, with its docking cone facing the Gemini.",
  canvasDocked: 'The Gemini and the Agena docked together, seen from the side.',
  noWebgl:
    'This browser cannot draw the 3D view, so the spacecraft are not shown. You can still fly by the read-outs.',
  distance: 'Distance to the Agena',
  introHeading: 'Dock with the Agena',
  // Not a fact from a source: what the word means, as the game uses it.
  whatDocking: 'Docking means flying one spacecraft into another until they latch together.',
  howTo:
    "Line up the Gemini's nose with the Agena's docking cone, then close in slowly. Things in space keep moving: each push keeps going until you push the other way.",
  // Under the level picker, for the level chosen.
  levels: {
    easy: 'The Gemini starts almost lined up, and drifts slowly.',
    hard: 'It starts further off and drifts faster, and the cone is a tighter fit.',
  } satisfies Record<Level, string>,
  storyMissing: 'The story of the first docking could not be loaded.',
  sourcesFor: 'Where the sentence on why docking mattered comes from:',
  start: 'Start',
  pad: 'Thrusters',
  thrust: {
    up: 'Up',
    down: 'Down',
    left: 'Left',
    right: 'Right',
    forward: 'Forward',
    back: 'Back',
  } satisfies Record<Thrust, string>,
  startOver: 'Start over',
  keys: 'Keys: the arrow keys move up, down, left, and right. F is forward and B is back.',
  offCenter: 'Off center',
  closing: 'Closing speed',
  linedUp: 'Lined up',
  go: (ways: string[]): string => `Go ${ways.join(' and ')}`,
  speed: { back: 'Moving back', stopped: 'Stopped', gentle: 'Slow and steady', fast: 'Too fast' },
  coach: {
    closeIn: 'Push Forward to close in.',
    slowDown: 'Too fast. Push Back to slow down.',
    lineUpNear: 'Line up before you touch.',
    lineUp: 'Line up the nose with the cone.',
    keepGoing: 'Lined up and slow. Keep going.',
  },
  bump: (tooFast: boolean, offCenter: boolean): string =>
    tooFast && offCenter
      ? 'Bump. Slow down and line up before you touch.'
      : tooFast
        ? 'Bump. Slow down before you touch.'
        : 'Bump. Line up before you touch.',
  backToStart: 'You are back at the start.',
  started: 'Started. The Gemini is drifting toward the Agena.',
  docked: 'Docked. The Gemini and the Agena are joined.',
  // The three stars of a run: what each is for when it was earned and when not, and a tip when not.
  // Docking is the one way a run ends, so the first is always earned.
  goals: {
    docked: 'Docked',
    firstTry: {
      met: 'On the first try',
      missed: 'First try',
      tip: 'Line up and slow down before the nose reaches the cone.',
    },
    softTouch: {
      met: 'A soft touch',
      missed: 'A soft touch',
      tip: 'Push Back to come in slower.',
    },
  },
  realHeading: (mission: Mission, event: MissionEvent): string => `${mission.name}: ${event.title}`,
  when: (mission: Mission, event: MissionEvent): string =>
    mission.launch
      ? `${mission.name} lifted off on ${formatDate(new Date(mission.launch.value.utc))}. This came ${elapsedInWords(event.elapsed)} later.`
      : `This came ${elapsedInWords(event.elapsed)} after liftoff.`,
  // What's next, from a flight: back to it, at the docking when that is where it was left.
  pickUp: (flight: string, atTheDocking: boolean): string =>
    atTheDocking ? `Pick up ${flight} after the docking` : `Pick up ${flight}`,
  waiting: 'Your flight is waiting where you left it.',
  back: (flight: string): string => `Back to ${flight}`,
  // What's next, from the list: the flight where the docking really happened.
  seeReal: 'See the real docking',
  flightAndMonth: (name: string, month: string): string => (month ? `${name}, ${month}` : name),
  // "The first docking" names the moment; any other title reads as "the docking".
  opensAt: (event: MissionEvent): string =>
    `Opens at ${/^The /.test(event.title) ? event.title.charAt(0).toLowerCase() + event.title.slice(1) : 'the docking'}.`,
  fly: (name: string): string => `Fly ${name}`,
  // The simplification, said once in plain words.
  simplified:
    'A practice toy, not a simulator. Real spacecraft in orbit do not move in straight lines like this, and the real docking took hours of catching up first. The distances and speeds here are not the real ones.',
} as const;

const KEYS: ReadonlyMap<string, Thrust> = new Map([
  ['ArrowUp', 'up'],
  ['ArrowDown', 'down'],
  ['ArrowLeft', 'left'],
  ['ArrowRight', 'right'],
  ['f', 'forward'],
  ['F', 'forward'],
  ['b', 'back'],
  ['B', 'back'],
]);

/** The key shown on each button (the arrows draw their own arrow). */
const KEY_LABEL: Readonly<Record<Thrust, string>> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  forward: 'F',
  back: 'B',
};

/** How many too-fast pips the speed read-out has after a level's gentle ones. */
const FAST_PIPS = 2;
/** How long a bump's message stays before the usual advice comes back, in seconds. */
const BUMP_MESSAGE_SECONDS = 4;
/** How long the nose takes to slide the last bit into the cone before the latches catch, in seconds. */
const LATCH_SECONDS = 0.8;

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * How far from the middle of the sight a distance off center is drawn: on
 * a square-root scale, so the lined-up ring is big enough to aim at, and
 * the edge of the play area is the edge of the sight.
 */
function sightRadius(distance: number): number {
  return 26 * Math.sqrt(Math.min(1, distance / RULES.maxSide));
}

/** A place off center (right and up) as a point on the sight, whose y runs down. */
function sightPoint(x: number, y: number): [number, number] {
  const distance = Math.hypot(x, y);
  if (distance < 1e-6) return [0, 0];
  const r = sightRadius(distance);
  return [(x / distance) * r, (-y / distance) * r];
}

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

/** An arrow on the 24-unit icon grid, pointing up, turned for the other ways. */
function arrowIcon(thrust: 'up' | 'down' | 'left' | 'right'): SVGSVGElement {
  const turn = { up: 0, right: 90, down: 180, left: 270 }[thrust];
  const icon = svg('svg', {
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
    focusable: 'false',
    class: 'docking__arrow',
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

/** What the closing speed read-out says. */
function speedWord(f: Flight): string {
  if (f.pushesClosing < 0) return TEXT.speed.back;
  if (f.pushesClosing === 0) return TEXT.speed.stopped;
  return isTooFast(f) ? TEXT.speed.fast : TEXT.speed.gentle;
}

/** What the off-center read-out says: lined up, or which ways to go. */
function aimWord(f: Flight): string {
  if (isLinedUp(f)) return TEXT.linedUp;
  const ways: string[] = [];
  const near = 0.12;
  if (f.x > near) ways.push('left');
  else if (f.x < -near) ways.push('right');
  if (f.y > near) ways.push('down');
  else if (f.y < -near) ways.push('up');
  return TEXT.go(ways);
}

/**
 * The three goals of a run that docked, for the stars: worded for how it
 * went, with a tip under each one missed. Docking is the one way a run
 * ends, so the first is always earned.
 */
function goalsOf(goals: RunGoals): readonly [Goal, Goal, Goal] {
  const goal = (key: 'firstTry' | 'softTouch'): Goal => {
    const words = TEXT.goals[key];
    return goals[key]
      ? { label: words.met, met: true }
      : { label: words.missed, met: false, tip: words.tip };
  };
  return [{ label: TEXT.goals.docked, met: true }, goal('firstTry'), goal('softTouch')];
}

/* ------------------------------------------------------------------ */
/* Pieces of the screen.                                               */
/* ------------------------------------------------------------------ */

/** The off-center and closing speed read-outs, and how to show a level and a moment of the flight on them. */
interface Readouts {
  element: HTMLDivElement;
  /** Shows a level's lined-up ring on the sight, and its gentle and too-fast pips. */
  setLevel(level: Level): void;
  /** Shows where the nose is, where it drifts, and how fast it closes in. */
  show(flight: Flight): void;
}

/** The read-outs while flying: the aim sight, and the closing speed in pips, each with its word. */
function flightReadouts(level: Level): Readouts {
  const element = el('div', 'docking__readouts');
  const aimPanel = el('div', 'docking__readout');
  const sight = svg('svg', {
    viewBox: '-30 -30 60 60',
    class: 'docking__sight',
    'aria-hidden': 'true',
  });
  // A sight seen from behind the Gemini: the ring is the lined-up zone around the cone's middle, the dot is the nose.
  const ring = svg('circle', { cx: 0, cy: 0, r: 0, class: 'docking__zone' });
  const drift = svg('line', { x1: 0, y1: 0, x2: 0, y2: 0, class: 'docking__drift' });
  const dot = svg('circle', { cx: 0, cy: 0, r: 3, class: 'docking__nose' });
  sight.append(
    svg('line', { x1: -28, y1: 0, x2: 28, y2: 0, class: 'docking__cross' }),
    svg('line', { x1: 0, y1: -28, x2: 0, y2: 28, class: 'docking__cross' }),
    ring,
    drift,
    dot,
  );
  const aimValue = el('p', 'docking__value');
  aimValue.setAttribute('data-testid', 'docking-aim');
  const aimRow = el('div', 'docking__readout-row');
  aimRow.append(sight, aimValue);
  aimPanel.append(el('p', 'docking__label', TEXT.offCenter), aimRow);

  const speedPanel = el('div', 'docking__readout');
  const pipRow = el('div', 'docking__pips');
  pipRow.setAttribute('aria-hidden', 'true');
  const speedValue = el('p', 'docking__value');
  speedPanel.append(el('p', 'docking__label', TEXT.closing), pipRow, speedValue);
  element.append(aimPanel, speedPanel);

  let pips: HTMLSpanElement[] = [];
  // The closing speed and level last shown, so the pips are only lit again when one changes.
  let shown = '';

  const setLevel = (chosen: Level): void => {
    const { linedUp, gentlePushes } = LEVEL_RULES[chosen];
    ring.setAttribute('r', sightRadius(linedUp).toFixed(2));
    // The gentle pips, then the too-fast ones.
    pips = Array.from({ length: gentlePushes + FAST_PIPS }, (_, index) =>
      el('span', index < gentlePushes ? 'docking__pip' : 'docking__pip docking__pip--fast'),
    );
    pipRow.replaceChildren(...pips);
    shown = '';
  };
  setLevel(level);

  return {
    element,
    setLevel,
    show(flight) {
      const [sx, sy] = sightPoint(flight.x, flight.y);
      dot.setAttribute('cx', sx.toFixed(2));
      dot.setAttribute('cy', sy.toFixed(2));
      // The drift line points where the nose will be in a few seconds.
      const [dx, dy] = sightPoint(flight.x + speedX(flight) * 5, flight.y + speedY(flight) * 5);
      drift.setAttribute('x1', sx.toFixed(2));
      drift.setAttribute('y1', sy.toFixed(2));
      drift.setAttribute('x2', dx.toFixed(2));
      drift.setAttribute('y2', dy.toFixed(2));
      aimPanel.classList.toggle('is-good', isLinedUp(flight));
      setText(aimValue, aimWord(flight));
      const now = `${flight.level} ${flight.pushesClosing}`;
      if (shown === now) return;
      shown = now;
      pips.forEach((pip, index) => pip.classList.toggle('is-on', index < flight.pushesClosing));
      speedPanel.classList.toggle('is-good', flight.pushesClosing > 0 && !isTooFast(flight));
      speedPanel.classList.toggle('is-warn', isTooFast(flight));
      setText(speedValue, speedWord(flight));
    },
  };
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

  // Gemini 8's story (why docking mattered, its docking, its spacecraft), and
  // the story of the docking flight this was opened from, if any.
  const fromMission = params.get('mission');
  const otherId =
    fromMission &&
    fromMission !== FIRST_DOCKING &&
    context.summaries.some((summary) => summary.id === fromMission)
      ? fromMission
      : null;
  const [first, other] = await Promise.all([
    context.loadBundle(FIRST_DOCKING).catch(() => null),
    otherId ? context.loadBundle(otherId).catch(() => null) : Promise.resolve(null),
  ]);
  if (signal.aborted) return { dispose() {} };
  loading.remove();

  const why = first ? whyItMattered(first.mission) : undefined;
  const otherEvent = other ? dockingEvent(other.mission, params.get('event')) : undefined;
  const firstEvent = first ? dockingEvent(first.mission, null) : undefined;
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
  // The level last chosen on this device, and the most stars on each.
  const record = gameRecord(context.store);

  /* ----------------------------- Layout ----------------------------- */

  const root = el('div', 'docking');
  const stage = el('div', 'docking__view');
  const canvas = el('canvas', 'docking__canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', TEXT.canvas);
  stage.append(canvas);

  const side = el('div', 'docking__side');

  // Before starting.
  const intro = el('section', 'docking__intro');
  intro.setAttribute('aria-labelledby', 'docking-intro-heading');
  const introHeading = el('h3', 'extra-heading', TEXT.introHeading);
  introHeading.id = 'docking-intro-heading';
  intro.append(introHeading, el('p', 'extra-text', TEXT.whatDocking));
  // Everything to read before starting comes first, together; then the
  // level, and Start. The folded sources of the cited sentence go under the
  // Start button, labeled as its own.
  const whyLine = el('p', 'extra-text', why?.text ?? TEXT.storyMissing);
  if (!why) whyLine.className = 'extra-note';
  // Choosing a level shows where the Gemini starts on it at once.
  const picker = createLevelPicker({
    record,
    describe: TEXT.levels,
    onChange: (level) => showLevel(level),
    signal,
  });
  const startButton = button('button button--primary button--large', TEXT.start);
  startButton.setAttribute('data-testid', 'docking-start');
  intro.append(
    whyLine,
    el('p', 'extra-note docking__how', TEXT.howTo),
    picker.element,
    startButton,
  );
  if (why) {
    const sources = sourcesBlock(why.fact.citations, why.fact.discrepancy);
    sources.classList.add('docking__why-sources');
    sources.setAttribute('aria-describedby', 'docking-why-for');
    const label = el('p', 'docking__source-for', TEXT.sourcesFor);
    label.id = 'docking-why-for';
    intro.append(label, sources);
  }

  // While flying.
  const flying = el('section', 'docking__fly');
  flying.hidden = true;
  const readouts = flightReadouts(picker.level);

  const coach = el('p', 'docking__coach');

  const pad = el('div', 'docking__pad');
  pad.setAttribute('role', 'group');
  pad.setAttribute('aria-label', TEXT.pad);
  const thrustButtons = new Map<Thrust, HTMLButtonElement>();
  for (const thrust of ['up', 'left', 'right', 'down', 'forward', 'back'] as const) {
    const control = button(`button docking__thrust docking__thrust--${thrust}`);
    control.setAttribute('aria-keyshortcuts', KEY_LABEL[thrust]);
    if (thrust === 'forward' || thrust === 'back') {
      const key = el('kbd', 'docking__key', KEY_LABEL[thrust]);
      key.setAttribute('aria-hidden', 'true');
      control.append(el('span', undefined, TEXT.thrust[thrust]), key);
    } else {
      control.setAttribute('aria-label', TEXT.thrust[thrust]);
      control.append(arrowIcon(thrust));
    }
    control.addEventListener('click', () => fire(thrust), { signal });
    thrustButtons.set(thrust, control);
    pad.append(control);
  }
  const startOver = button('button button--quiet docking__over', TEXT.startOver);
  pad.append(startOver);
  flying.append(readouts.element, coach, pad, el('p', 'extra-note docking__keys', TEXT.keys));

  // After docking: the docked line, the stars under it, the real docking, and "Up next" at the end.
  const after = el('section', 'docking__after');
  after.hidden = true;
  const dockedLine = el('p', 'docking__docked', TEXT.docked);
  dockedLine.setAttribute('data-testid', 'docking-docked');
  // Focus goes here on docking, so a screen reader reads on from it.
  dockedLine.tabIndex = -1;
  after.append(dockedLine);
  if (real) {
    const { mission, event } = real;
    const heading = el('h3', 'extra-heading', TEXT.realHeading(mission, event));
    const citations: Citation[] = [...event.citations, ...(mission.launch?.citations ?? [])];
    after.append(
      heading,
      el('p', 'extra-text', event.text.short),
      el('p', 'extra-text', TEXT.when(mission, event)),
      sourcesBlock(citations, event.discrepancy, mission.launch?.discrepancy),
    );
  }

  // The stars of a run that docked, its goals, and Play again: under the docked line.
  const runEnd = createRunEnd({
    record,
    onPlay: (level) => {
      picker.refresh();
      begin(level, true);
    },
    signal,
  });

  /** What's next: back to the flight waiting behind the sheet, or the flight where the docking really happened. */
  const nextStep = (): UpNextOptions => {
    if (context.origin === 'flight') {
      const flight =
        context.summaries.find((summary) => summary.id === context.missionId)?.name ??
        context.missionId;
      // "After the docking" only when the flight was left at the docking shown here.
      const atTheDocking =
        real !== null &&
        real.mission.id === context.missionId &&
        params.get('event') === real.event.id;
      return {
        title: TEXT.pickUp(flight, atTheDocking),
        line: TEXT.waiting,
        primary: { label: TEXT.back(flight), run: () => context.close() },
      };
    }
    if (real) {
      const { mission, event } = real;
      return {
        title: TEXT.seeReal,
        line: TEXT.flightAndMonth(mission.name, monthOf(mission.launch?.value.utc ?? '')),
        sentence: TEXT.opensAt(event),
        mission: mission.id,
        primary: {
          label: TEXT.fly(mission.name),
          run: () => context.openMission(mission.id, { event: event.id }),
        },
      };
    }
    // The story of the first docking did not load: its flight can still be flown.
    const first = context.summaries.find((summary) => summary.id === FIRST_DOCKING);
    const name = first?.name ?? FIRST_DOCKING;
    return {
      title: TEXT.seeReal,
      line: TEXT.flightAndMonth(name, monthOf(first?.date ?? '')),
      mission: FIRST_DOCKING,
      primary: {
        label: TEXT.fly(name),
        run: () => context.openMission(FIRST_DOCKING, { start: 'explore' }),
      },
    };
  };
  // Built afresh at each docking, at the end, so it always starts folded on a phone. Its button
  // is plain, as Play again is the amber one, and Play again is not repeated in it.
  let upNext: HTMLElement | null = null;
  const showUpNext = (): void => {
    const block = context.upNext({ ...nextStep(), plainPrimary: true });
    if (upNext) upNext.replaceWith(block);
    else after.append(block);
    upNext = block;
  };

  side.append(intro, flying, after, el('p', 'extra-note docking__simple', TEXT.simplified));
  root.append(stage, side);
  host.append(root);

  /* ------------------------------ 3D view ----------------------------- */

  let scene: DockingScene | null = null;
  let distanceFill: HTMLElement | null = null;
  try {
    scene = createDockingScene(canvas, partsFrom(first));
  } catch (error) {
    console.warn(error);
    canvas.remove();
    // Without the 3D view, a plain bar shows how far is left to go.
    const fallback = el('div', 'docking__fallback');
    const track = el('div', 'docking__track');
    distanceFill = el('span', 'docking__track-fill');
    track.append(distanceFill);
    track.setAttribute('aria-hidden', 'true');
    fallback.append(
      el('p', 'extra-note', TEXT.noWebgl),
      el('p', 'docking__label', TEXT.distance),
      track,
    );
    stage.append(fallback);
    stage.classList.add('docking__view--flat');
  }

  /* ------------------------------ Playing ----------------------------- */

  type Phase = 'intro' | 'flying' | 'latching' | 'docked';
  let phase: Phase = 'intro';
  // Started on the level chosen; a new run starts a new flight on its level.
  let flight = startFlight(picker.level);
  let latch: { from: Flight; t: number } | null = null;
  // The closing speed when the nose touched and the latches began to catch.
  let touchClosing = 0;
  let bumpMessage = '';
  let bumpLeft = 0;
  let wasLinedUp = isLinedUp(flight);
  const timers = new Set<number>();

  const coachWord = (f: Flight): string => {
    if (bumpLeft > 0) return bumpMessage;
    if (f.pushesClosing <= 0) return TEXT.coach.closeIn;
    if (isTooFast(f)) return TEXT.coach.slowDown;
    if (!isLinedUp(f)) return f.gap < 3 ? TEXT.coach.lineUpNear : TEXT.coach.lineUp;
    return TEXT.coach.keepGoing;
  };

  /** The read-outs, the coach line, and without the 3D view the distance bar, from the flight as it is now. */
  const showReadouts = (): void => {
    readouts.show(flight);
    setText(coach, coachWord(flight));
    if (distanceFill)
      distanceFill.style.width = `${Math.max(0, Math.min(1, flight.gap / RULES.startGap)) * 100}%`;
  };

  const showPhase = (): void => {
    intro.hidden = phase !== 'intro';
    flying.hidden = phase !== 'flying' && phase !== 'latching';
    after.hidden = phase !== 'docked';
    root.dataset['phase'] = phase;
    canvas.setAttribute('aria-label', phase === 'docked' ? TEXT.canvasDocked : TEXT.canvas);
  };

  /* One loop runs while anything moves: the flight, a puff, the camera. */
  let stopLoop: (() => void) | null = null;
  const onFrame = (seconds: number): void => {
    if (phase === 'flying') {
      const contact = advance(flight, seconds);
      if (bumpLeft > 0) bumpLeft -= seconds;
      const lined = isLinedUp(flight);
      if (lined !== wasLinedUp) {
        wasLinedUp = lined;
        context.announce(lined ? TEXT.linedUp : `${TEXT.offCenter}. ${aimWord(flight)}.`);
      }
      if (contact) touch(contact);
    } else if (phase === 'latching' && latch) {
      // The last little slide into the cone, settling on its middle.
      latch.t = Math.min(1, latch.t + seconds / LATCH_SECONDS);
      const u = latch.t * latch.t * (3 - 2 * latch.t);
      flight.x = latch.from.x * (1 - u);
      flight.y = latch.from.y * (1 - u);
      flight.gap = -RULES.latchDepth * u;
      if (latch.t >= 1) join();
    }
    if (phase === 'flying' || phase === 'latching') {
      scene?.fly(flight, seconds, still);
      showReadouts();
    }
    const moving = scene?.tick(seconds, still) ?? false;
    if (phase === 'docked' && !moving) endLoop();
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
    const before = speedWord(flight);
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
    const now = speedWord(flight);
    if (now !== before) context.announce(now);
    showReadouts();
    startLoop();
  }

  /** The nose reached the cone: the latches catch, or it bumps and backs away. */
  function touch(contact: Contact): void {
    if (contact.kind === 'docked') {
      touchClosing = contact.closing;
      if (still) {
        flight.x = 0;
        flight.y = 0;
        flight.gap = -RULES.latchDepth;
        join();
      } else {
        phase = 'latching';
        latch = { from: { ...flight }, t: 0 };
      }
      return;
    }
    bumpMessage = TEXT.bump(contact.tooFast, contact.offCenter);
    bumpLeft = BUMP_MESSAGE_SECONDS;
    if (still) {
      // Under reduced motion, a bump is a plain reset: straight back to the start, the bump still counted.
      flight = backToStart(flight);
      wasLinedUp = isLinedUp(flight);
      bumpMessage = `${bumpMessage} ${TEXT.backToStart}`;
    }
    context.announce(bumpMessage);
  }

  /** Docked: the result and its stars, the real docking, and what's next. */
  function join(): void {
    phase = 'docked';
    latch = null;
    scene?.fly(flight, 0, true);
    scene?.join(still);
    const { spoken } = runEnd.show({
      level: flight.level,
      goals: goalsOf(runGoals(flight, { kind: 'docked', closing: touchClosing })),
    });
    dockedLine.after(runEnd.element);
    picker.refresh();
    showUpNext();
    showPhase();
    context.announce(`${TEXT.docked} ${spoken}`);
    dockedLine.focus();
    startLoop();
  }

  /** The start screen, after choosing a level: the Gemini where a run on it starts, and its read-outs ready. */
  function showLevel(level: Level): void {
    if (phase !== 'intro') return;
    flight = startFlight(level);
    readouts.setLevel(level);
    wasLinedUp = isLinedUp(flight);
    showReadouts();
    scene?.fly(flight, 0, true);
  }

  /** A new run on a level, from Start, Start over, Play again, or the other level's button. */
  const begin = (level: Level, focus: boolean): void => {
    scene?.separate();
    flight = startFlight(level);
    readouts.setLevel(level);
    runEnd.hide();
    latch = null;
    bumpLeft = 0;
    wasLinedUp = isLinedUp(flight);
    phase = 'flying';
    showPhase();
    showReadouts();
    scene?.fly(flight, 0, still);
    if (focus) thrustButtons.get('forward')?.focus();
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

  // The opening picture: both craft, the Gemini a short way back and off to one side (further off on Hard).
  showPhase();
  showReadouts();
  scene?.fly(flight, 0, true);

  return {
    dispose() {
      endLoop();
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      scene?.dispose();
      scene = null;
    },
  };
}

export const extra: Extra = { meta, mount };
