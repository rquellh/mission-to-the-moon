/**
 * "Fly to orbit": seen from the side, a rocket climbs from its launch pad
 * toward the orbit line. Going up gets it to space; going sideways very fast
 * is what keeps it there. The visitor tips it over a step at a time, drops
 * each stage when it is empty, and reaches orbit speed at the orbit line
 * before the last stage runs dry. A practice toy, not a simulator: its rules
 * and made-up numbers are in game.ts, and the screen says what is simplified.
 *
 * The rocket is the one the flight behind the sheet flew (Apollo 11's when
 * that flight's files cannot show a climb), read from the flight's own files
 * by rocketFrom (rocket.ts). The facts shown come from those files, with
 * their citations: the rocket's name, the event at orbit insertion (or, when
 * the story has none, its liftoff), and the real times its stages dropped
 * away. The game's own few
 * sentences about the real flights (what an orbit is, the climb through the
 * thick air, the computers that steered, the spacecraft coming down in the
 * ocean) are cited in facts.ts, and their sources are folded under the Start
 * button, as "Land on the Moon" does.
 *
 * It has two levels (game.ts says what differs), chosen above Start with
 * the games' shared level picker; each run ends with the shared stars, its
 * three goals, and Play again (src/extras/shared/), as "Land on the Moon"
 * does. The level last chosen and the most stars on each level are
 * remembered on this device, one record whichever rocket is flown.
 */
import './orbit.css';
import {
  elapsedToSeconds,
  type Citation,
  type ElapsedTime,
  type Mission,
  type MissionEvent,
} from '../../content/types.ts';
import { sourcesBlock } from '../../ui/citations.ts';
import { button, el, setText } from '../../ui/dom.ts';
import { formatDate, monthOf } from '../../ui/format.ts';
import { createFrameLoop } from '../shared/frame-loop.ts';
import { onGameKeys } from '../shared/keys.ts';
import { createLevelPicker, type LevelPicker } from '../shared/level-picker.ts';
import type { Level } from '../shared/levels.ts';
import { gameRecord } from '../shared/record.ts';
import { createRunEnd, type Goal } from '../shared/run-end.ts';
import { capitalize, sayElapsed, type Climb } from '../stages/climb.ts';
import type { Extra, ExtraContext, ExtraMount, UpNextOptions } from '../types.ts';
import { COMING_DOWN, COMPUTERS_STEERED, THE_CLIMB, WHAT_AN_ORBIT_IS } from './facts.ts';
import {
  RULES,
  advance,
  ahead,
  burning,
  canDrop,
  drop,
  fuelShare,
  heightBand,
  runGoals,
  speedShare,
  startFlight,
  tiltDegrees,
  tip,
  type Ahead,
  type Flight,
  type Happening,
  type RunGoals,
  type Tip,
} from './game.ts';
import { meta } from './meta.ts';
import { realEnd, rocketFrom, type Rocket } from './rocket.ts';
import { LINE_PX, RING_PX, createOrbitScene, type OrbitScene } from './scene.ts';

/** The rockets "Try another rocket" offers, the same three "Drop the stages" offers: the Titan II, the Saturn IB, and the Saturn V. */
const CHOICES = ['gemini-8', 'apollo-7', 'apollo-11'] as const;
/** The flight whose rocket flies when the flight behind the sheet cannot show its climb. */
const FALLBACK = 'apollo-11';
/** How long a short message takes the coach line's place, in seconds. */
const MESSAGE_SECONDS = 4;
/** How long a tilt button stays lit after a press, in milliseconds. */
const FIRE_MS = 180;
/** How many pips the sideways speed read-out has. */
const SPEED_PIPS = 6;
/** The height bands from the ground up, one pip each on the height read-out. */
const BANDS = ['thick', 'thin', 'space'] as const;

/** Each control's key: the name `aria-keyshortcuts` gives it, and the `KeyboardEvent.key` it answers to. */
const KEYS = {
  back: { shortcut: 'ArrowLeft', key: 'ArrowLeft' },
  drop: { shortcut: 'Space', key: ' ' },
  over: { shortcut: 'ArrowRight', key: 'ArrowRight' },
} as const;

/** Where a run is: before it, picking a rocket, flying, in orbit, or out of fuel (coming down, then at rest). */
type Phase = 'intro' | 'choosing' | 'flying' | 'orbit' | 'coming-home' | 'home';
/** Out of fuel: the spacecraft coming down under its parachutes, or at rest. */
const isOut = (phase: Phase): boolean => phase === 'coming-home' || phase === 'home';

/* ------------------------------------------------------------------ */
/* Words on screen.                                                    */
/* ------------------------------------------------------------------ */

const TEXT = {
  loading: 'Getting the rocket ready.',
  // Cited in facts.ts (WHAT_AN_ORBIT_IS).
  lead: 'Going up gets a rocket to space. Going sideways very fast is what keeps it there. That is an orbit.',
  // Cited in facts.ts (THE_CLIMB); the steps are the game's.
  how: 'Climb straight up through the thick air first. Then tip the rocket over, one step at a time, to build sideways speed.',
  goal: 'Drop each stage when it is empty. Reach orbit speed before the fuel runs out.',
  // "Apollo 11's rocket: the Saturn V", the rocket as the flight's story names it.
  rocketLine: (flight: string, rocket: string | undefined): string =>
    rocket ? `${flight}'s rocket: the ${rocket}` : `${flight}'s rocket`,
  rule: 'Each press tips the rocket one step. It stays there until you tip it back.',
  // Under the level picker, for the level chosen.
  levels: {
    easy: 'Plenty of fuel, and an empty stage soon drops by itself.',
    hard: 'Less fuel, and an empty stage hangs on longer.',
  } satisfies Record<Level, string>,
  start: 'Start',
  // Over the folded sources under Start: the game's sentences about the real flights that they back.
  sourcesFor:
    'Where the sentences on what an orbit is, the climb through the thick air, the computers that steered, and the spacecraft coming down in the ocean come from:',
  another: 'Try another rocket',
  startOver: 'Start over',
  tip: { back: 'Tip back', over: 'Tip over' } satisfies Record<Tip, string>,
  drop: 'Drop it',
  dropWhen: 'when a stage is empty',
  dropWhich: (stage: string): string => `the ${stage} stage`,
  controls: 'Rocket controls',
  choose: 'Pick a rocket',
  choice: (flight: string): string => `${flight}'s rocket`,
  stageNames: ['first', 'second', 'third'],
  fuel: (stage: string): string => `${capitalize(stage)} stage fuel`,
  fuelWord: { plenty: 'Plenty', low: 'Getting low', almost: 'Almost out', empty: 'Empty' },
  height: 'Height',
  heightWord: { thick: 'Thick air', thin: 'Thin air', space: 'Space' } satisfies Record<
    (typeof BANDS)[number],
    string
  >,
  speed: 'Sideways speed',
  speedWord: { slow: 'Slow', picking: 'Picking up', fast: 'Fast', orbit: 'Orbit speed' },
  tilt: 'Tilt',
  tiltWord: {
    straight: 'Straight up',
    leaning: 'Leaning over',
    halfway: 'Halfway over',
    nearly: 'Nearly flat',
    flat: 'Flat',
  },
  coach: {
    thickAir: 'Go straight up first. The air down here is thick.',
    startTipping: 'The air is thin now. Start tipping over.',
    stageEmpty: (stage: string, next: string): string =>
      `The ${stage} stage is empty. Drop it, and the ${next} stage will light.`,
    heldBack: 'The air here still holds you back. Climb to the orbit line to go faster.',
    // By where the path ahead ends.
    path: {
      orbit: 'That will do it. Hold this tilt until you reach orbit speed.',
      slow: 'Keep tipping over. You need more sideways speed to stay up.',
      low: 'Too flat too soon. Tip back and climb up to the orbit line.',
    } satisfies Record<Ahead['outcome'], string>,
  },
  // The short messages, each in the coach line's place for a few seconds.
  tooThick: 'The air is too thick to tip that far. Climb higher first.',
  notYet: (stage: string): string => `Not yet. The ${stage} stage still has fuel.`,
  lastStage: 'This is the last stage. It stays on all the way to orbit.',
  droppedItself: (stage: string): string => `The ${stage} stage dropped by itself.`,
  // Said to screen readers.
  liftoff: 'Liftoff. Go straight up first.',
  backOnPad: 'You are back on the launch pad.',
  fuelLow: (stage: string): string => `${capitalize(stage)} stage fuel is getting low.`,
  fuelAlmost: (stage: string): string => `${capitalize(stage)} stage fuel is almost out.`,
  dropped: (stage: string, next: string): string =>
    `${capitalize(stage)} stage dropped. The ${next} stage is burning.`,
  // The endings.
  inOrbit: 'You are in orbit.',
  // The spacecraft letting go and coming down in the ocean is cited in facts.ts (COMING_DOWN).
  outOfFuel:
    'Out of fuel, and not fast enough to stay up. The spacecraft lets go of the rocket and comes down in the ocean under its parachutes. No orbit this time.',
  // The three stars of a run: what each is for when it was earned and when not, and a tip when not.
  goals: {
    orbit: {
      met: 'Reached orbit',
      missed: 'Reach orbit',
      tip: 'Tip over a step at a time once the air thins, and save the fuel for speed.',
    },
    droppedAll: {
      met: 'Dropped every stage yourself',
      missed: 'Drop every stage yourself',
      tip: 'Press Drop it as soon as a stage is empty.',
    },
    spareFuel: {
      met: 'Fuel to spare',
      missed: 'Fuel to spare',
      tip: 'Tip over as soon as the air lets you, and drop each stage at once.',
    },
  } satisfies Record<keyof RunGoals, { met: string; missed: string; tip: string }>,
  realLabel: 'What really happened',
  realHeading: (flight: string, title: string): string => `${flight}: ${title}`,
  realWhen: (day: string, elapsed: ElapsedTime): string =>
    day
      ? `${day}. ${sayElapsed(elapsed)} after liftoff.`
      : `${capitalize(sayElapsed(elapsed))} after liftoff.`,
  // Under the liftoff, told when the story has no event at orbit insertion: the date alone.
  realDay: (day: string): string => `${day}.`,
  realDrop: (part: string, at: ElapsedTime): string =>
    `The real ${part} dropped away at ${sayElapsed(at)}.`,
  // What's next, as "Drop the stages" says it for liftoff. From a flight: back to it.
  pickUp: (flight: string, atLiftoff: boolean): string =>
    atLiftoff ? `Pick up ${flight} after liftoff` : `Pick up ${flight}`,
  waiting: 'Your flight is waiting where you left it.',
  back: (flight: string): string => `Back to ${flight}`,
  // From the list: the flight where this liftoff really happened.
  seeReal: 'See the real liftoff',
  flightAndMonth: (name: string, month: string): string => (month ? `${name}, ${month}` : name),
  opensAt: 'Opens at liftoff.',
  fly: (name: string): string => `Fly ${name}`,
  // The simplification, said once in plain words, with the flight's own climb time.
  // The computers steering the real rockets are cited in facts.ts (COMPUTERS_STEERED).
  toy: (minutes: string): string =>
    `A practice toy, not a simulator. Computers steered the real rocket, not the crew, and its climb took about ${minutes} minutes. The heights and speeds here are not the real ones.`,
  noWebgl: 'This browser cannot draw 3D pictures, so the climb is drawn as a simple picture.',
  keyHint: { back: 'Left arrow', drop: 'Space', over: 'Right arrow' },
  // The labels over the picture.
  thickAirLabel: 'Thick air',
  orbitLabel: 'Orbit',
  aheadLabel: 'when the fuel runs out',
  // What the picture shows, for screen readers, after the approved pictures' own descriptions.
  picture: {
    pad: 'The rocket standing on the launch pad. High above it, a dashed line marks orbit.',
    flying:
      'The rocket climbing toward the dashed orbit line. Its path ahead ends in a ring where the fuel runs out.',
    orbit:
      'The spacecraft and its last stage flying along the orbit line, high above the thick air.',
    home: 'Out of fuel. The spacecraft has let go of the rocket and is coming down toward the sea under three parachutes.',
  },
} as const;

/** Whole minutes in words, for the toy note: "twelve". */
const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
] as const;

/** "first", "second", "third": a stage by its place, counting from the bottom. */
const stageName = (stage: number): string => TEXT.stageNames[stage] ?? '';

/** What the height read-out says. */
const heightWord = (flight: Flight): string => TEXT.heightWord[heightBand(flight)];

/** What the sideways speed read-out says. */
function speedWord(flight: Flight): string {
  const share = speedShare(flight);
  if (share >= 1) return TEXT.speedWord.orbit;
  if (share >= 0.6) return TEXT.speedWord.fast;
  return share >= 0.15 ? TEXT.speedWord.picking : TEXT.speedWord.slow;
}

/** How many of the sideways speed pips are lit: any speed at all lights one. */
const speedPips = (flight: Flight): number =>
  Math.min(SPEED_PIPS, Math.ceil(speedShare(flight) * SPEED_PIPS));

/** What the tilt read-out says: halfway is half of the most tilt, flat is all of it. */
function tiltWord({ tilt }: Flight): string {
  if (tilt <= 0) return TEXT.tiltWord.straight;
  if (tilt >= RULES.maxTilt) return TEXT.tiltWord.flat;
  if (tilt * 2 === RULES.maxTilt) return TEXT.tiltWord.halfway;
  return tilt * 2 < RULES.maxTilt ? TEXT.tiltWord.leaning : TEXT.tiltWord.nearly;
}

/** What the fuel strip says of the bottom stage's tank. */
function fuelWord(flight: Flight): string {
  const share = fuelShare(flight);
  if (share > 0.5) return TEXT.fuelWord.plenty;
  if (share > 0.2) return TEXT.fuelWord.low;
  return share > 0 ? TEXT.fuelWord.almost : TEXT.fuelWord.empty;
}

/**
 * The three goals of a run that ended, for the stars: worded for how it
 * went, with a tip under each one missed. A run that ran out of fuel missed
 * them all, and only the first, orbit, gets its tip.
 */
function goalsOf(goals: RunGoals): readonly [Goal, Goal, Goal] {
  const goal = (key: keyof RunGoals, tip: boolean): Goal => {
    const words = TEXT.goals[key];
    if (goals[key]) return { label: words.met, met: true };
    return tip
      ? { label: words.missed, met: false, tip: words.tip }
      : { label: words.missed, met: false };
  };
  return [goal('orbit', true), goal('droppedAll', goals.orbit), goal('spareFuel', goals.orbit)];
}

/**
 * What the coach line says, the first that applies: a stage is empty; in the
 * thick air; held back by the thin air's speed; just clear of the thick air
 * and still nearly upright; then by where the path ahead ends.
 */
function guidance(flight: Flight, look: Ahead | null): string {
  if (canDrop(flight))
    return TEXT.coach.stageEmpty(stageName(flight.stage), stageName(flight.stage + 1));
  const band = heightBand(flight);
  if (band === 'thick') return TEXT.coach.thickAir;
  if (band === 'thin' && flight.sideways >= RULES.thinAirSpeed) return TEXT.coach.heldBack;
  if (band === 'thin' && flight.tilt <= RULES.thickAirTilt) return TEXT.coach.startTipping;
  return TEXT.coach.path[look?.outcome ?? 'slow'];
}

/** The climb's length in whole minutes, as a word. */
function climbMinutes(climb: Climb): string {
  const minutes = Math.round((climb.end - climb.liftoff) / 60);
  return NUMBER_WORDS[minutes] ?? String(minutes);
}

/** What the picture shows in each phase, for screen readers. */
function pictureWords(phase: Phase): string {
  if (phase === 'flying') return TEXT.picture.flying;
  if (phase === 'orbit') return TEXT.picture.orbit;
  return isOut(phase) ? TEXT.picture.home : TEXT.picture.pad;
}

/* ------------------------------------------------------------------ */
/* The rocket, from a flight's own files.                              */
/* ------------------------------------------------------------------ */

/** One flight's rocket; null when it does not load or cannot be flown. */
async function loadRocket(context: ExtraContext, id: string): Promise<Rocket | null> {
  try {
    return rocketFrom(await context.loadBundle(id));
  } catch (error) {
    console.warn(error);
    return null;
  }
}

/** The rocket of the flight the sheet was opened over, or else Apollo 11's. */
async function firstRocket(context: ExtraContext, params: URLSearchParams): Promise<Rocket> {
  const asked = params.get('mission')?.trim().toLowerCase() || context.missionId;
  const theirs = asked && asked !== FALLBACK ? await loadRocket(context, asked) : null;
  const rocket = theirs ?? (await loadRocket(context, FALLBACK));
  if (!rocket) throw new Error(`Fly to orbit: no rocket could be loaded for "${asked}".`);
  return rocket;
}

/** The day of a story's event: its own time when the story gives one, else the launch's plus the event's time on the mission clock (our arithmetic). */
function dayOf(mission: Mission, event: MissionEvent): string {
  if (event.utc) return formatDate(new Date(event.utc));
  const launch = Date.parse(mission.launch?.value.utc ?? '');
  if (Number.isNaN(launch)) return '';
  return formatDate(new Date(launch + elapsedToSeconds(event.elapsed) * 1000));
}

/** The rocket's name as its flight's story gives it, without its serial number: "Saturn V". */
const rocketName = (mission: Mission): string | undefined =>
  mission.launch?.value.vehicle.replace(/\s*\([^)]*\)\s*$/, '');

/* ------------------------------------------------------------------ */
/* Pieces of the screen.                                               */
/* ------------------------------------------------------------------ */

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

/** A number for an SVG attribute, to a thousandth. */
const num = (value: number): number => Math.round(value * 1000) / 1000;

/** The curved arrows of the two tilt buttons on the 24-unit icon grid: back turns toward straight up, over toward flat. */
const TILT_ICON: Readonly<Record<Tip, string>> = {
  back: 'M21 16A7.5 7.5 0 0 0 6 16M9.5 12.5L6 16l-3.5-3.5',
  over: 'M3 16A7.5 7.5 0 0 1 18 16M14.5 12.5L18 16l3.5-3.5',
};

function tiltIcon(way: Tip): SVGSVGElement {
  const icon = svg('svg', {
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
    focusable: 'false',
    class: 'orbit__tilt-icon',
  });
  icon.append(
    svg('path', {
      d: TILT_ICON[way],
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.75,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
  );
  return icon;
}

/** A read-out card: its label, a row of pips, and its word. */
interface Readout {
  card: HTMLDivElement;
  pips: HTMLSpanElement[];
  value: HTMLParagraphElement;
}

/** A read-out card with `count` pips; `mark` ends the row with a line (orbit speed, on the sideways speed). */
function readout(label: string, count: number, testId: string, mark = false): Readout {
  const card = el('div', 'orbit__readout');
  const row = el('div', 'orbit__pips');
  row.setAttribute('aria-hidden', 'true');
  const pips = Array.from({ length: count }, () => {
    const pip = el('span', 'orbit__pip');
    row.append(pip);
    return pip;
  });
  if (mark) row.append(el('span', 'orbit__pips-mark'));
  const value = el('p', 'orbit__value');
  value.setAttribute('data-testid', testId);
  card.append(el('p', 'orbit__label', label), row, value);
  return { card, pips, value };
}

/** Lights the pips `lit` picks out, and writes the word. */
function showReadout(
  { pips, value }: Readout,
  lit: (index: number) => boolean,
  word: string,
): void {
  pips.forEach((pip, index) => pip.classList.toggle('is-on', lit(index)));
  setText(value, word);
}

/** The three read-outs while flying: height, sideways speed, and tilt. */
function flightReadouts() {
  const row = el('div', 'orbit__readouts');
  const height = readout(TEXT.height, BANDS.length, 'orbit-height');
  const speed = readout(TEXT.speed, SPEED_PIPS, 'orbit-speed', true);
  const tilt = readout(TEXT.tilt, RULES.maxTilt + 1, 'orbit-tilt');
  row.append(height.card, speed.card, tilt.card);
  return {
    row,
    show(flight: Flight): void {
      const band = BANDS.indexOf(heightBand(flight));
      const fast = speedPips(flight);
      showReadout(height, (index) => index === band, heightWord(flight));
      showReadout(speed, (index) => index < fast, speedWord(flight));
      showReadout(tilt, (index) => index <= flight.tilt, tiltWord(flight));
    },
  };
}

/** The fuel strip across the top of the picture: which stage, how full its tank is, and a word. */
function fuelStrip() {
  const strip = el('div', 'orbit__fuel');
  const label = el('span', 'orbit__label');
  const bar = el('div', 'orbit__bar');
  bar.setAttribute('aria-hidden', 'true');
  const fill = el('span', 'orbit__bar-fill');
  fill.setAttribute('data-testid', 'orbit-fuel-fill');
  bar.append(fill);
  const word = el('span', 'orbit__fuel-word');
  word.setAttribute('data-testid', 'orbit-fuel');
  strip.append(label, bar, word);
  return {
    strip,
    show(flight: Flight): void {
      const share = fuelShare(flight);
      const full = `${(share * 100).toFixed(1)}%`;
      setText(label, TEXT.fuel(stageName(flight.stage)));
      if (fill.style.width !== full) fill.style.width = full;
      bar.classList.toggle('is-empty', share <= 0);
      setText(word, fuelWord(flight));
    },
  };
}

/**
 * Before a run: the rocket, what an orbit is, how to fly, the rule, the
 * level picker, Start, and Try another rocket, then the folded sources of
 * the sentences about the real flights, labeled as theirs, as "Land on the
 * Moon" does.
 */
function introSection(picker: LevelPicker) {
  const section = el('section', 'orbit__intro');
  const rocketLine = el('p', 'orbit__label');
  rocketLine.setAttribute('data-testid', 'orbit-rocket');
  const start = button('button button--primary button--large', TEXT.start);
  start.setAttribute('data-testid', 'orbit-start');
  const another = button('button', TEXT.another);
  const sources = sourcesBlock([
    ...WHAT_AN_ORBIT_IS,
    ...THE_CLIMB,
    ...COMPUTERS_STEERED,
    ...COMING_DOWN,
  ]);
  sources.setAttribute('aria-describedby', 'orbit-sources-for');
  const sourcesFor = el('p', 'orbit__source-for', TEXT.sourcesFor);
  sourcesFor.id = 'orbit-sources-for';
  // Together in one box, so on a phone held upright they can sit below the
  // screen without moving the picture or Start (see orbit.css).
  const sourcesBox = el('div', 'orbit__sources');
  sourcesBox.append(sourcesFor, sources);
  section.append(
    rocketLine,
    el('p', 'extra-text', TEXT.lead),
    el('p', 'extra-text', TEXT.how),
    el('p', 'extra-text', TEXT.goal),
    el('p', 'extra-note orbit__intro-rule', TEXT.rule),
    picker.element,
    start,
    another,
    sourcesBox,
  );
  return { section, rocketLine, start, another };
}

/** The choice of rockets: one button for each, by the flight that flew it. */
function chooseSection(context: ExtraContext, pick: (id: string) => void) {
  const section = el('section', 'orbit__choose');
  const list = el('ul', 'orbit__choices');
  const choices = CHOICES.map((id) => {
    const flight = context.summaries.find((summary) => summary.id === id)?.name ?? id;
    const choice = button('button', TEXT.choice(flight));
    choice.addEventListener('click', () => pick(id), { signal: context.signal });
    const item = el('li');
    item.append(choice);
    list.append(item);
    return choice;
  });
  section.append(el('h3', 'extra-heading', TEXT.choose), list);
  return { section, choices };
}

/** Gives each "Drop it" note its own id, for the button's description. */
let dropNotes = 0;

/**
 * The three controls in a row, each with its key hint under it: Tip back,
 * Drop it, and Tip over. A mouse press on a tilt button does not take the
 * focus, so after a click the space bar still drops a stage; Tab still
 * reaches it, and Space or Enter there presses it as usual. "Drop it" keeps
 * its name; its second line ("when a stage is empty", "the first stage") is
 * its description.
 */
function rocketControls(press: { tip(way: Tip): void; drop(): void }, signal: AbortSignal) {
  const group = el('div', 'orbit__controls');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', TEXT.controls);
  const slot = (control: HTMLButtonElement, hint: string): HTMLDivElement => {
    const holder = el('div', 'orbit__control');
    const key = el('span', 'orbit__key', hint);
    key.setAttribute('aria-hidden', 'true');
    holder.append(control, key);
    return holder;
  };
  const tiltButton = (way: Tip): HTMLButtonElement => {
    const control = button('button orbit__tilt');
    control.setAttribute('aria-keyshortcuts', KEYS[way].shortcut);
    control.append(tiltIcon(way), el('span', undefined, TEXT.tip[way]));
    control.addEventListener('mousedown', (event) => event.preventDefault(), { signal });
    control.addEventListener('click', () => press.tip(way), { signal });
    return control;
  };
  const tilt = { back: tiltButton('back'), over: tiltButton('over') } satisfies Record<
    Tip,
    HTMLButtonElement
  >;
  const dropButton = button('button orbit__drop');
  dropButton.setAttribute('aria-keyshortcuts', KEYS.drop.shortcut);
  dropButton.setAttribute('aria-label', TEXT.drop);
  const note = el('span', 'orbit__drop-note', TEXT.dropWhen);
  dropNotes += 1;
  note.id = `orbit-drop-note-${dropNotes}`;
  dropButton.setAttribute('aria-describedby', note.id);
  dropButton.append(el('span', undefined, TEXT.drop), note);
  dropButton.addEventListener('click', () => press.drop(), { signal });
  group.append(
    slot(tilt.back, TEXT.keyHint.back),
    slot(dropButton, TEXT.keyHint.drop),
    slot(tilt.over, TEXT.keyHint.over),
  );
  // The tilt buttons' lights still to go out; the sheet closing puts them all out.
  const lit = new Set<number>();
  signal.addEventListener('abort', () => {
    for (const timer of lit) window.clearTimeout(timer);
    lit.clear();
  });
  let shownReady: boolean | null = null;
  return {
    group,
    drop: dropButton,
    /** A tilt that worked lights its button for a moment. */
    light(way: Tip): void {
      const control = tilt[way];
      control.classList.add('is-firing');
      const timer = window.setTimeout(() => {
        control.classList.remove('is-firing');
        lit.delete(timer);
      }, FIRE_MS);
      lit.add(timer);
    },
    /** "Drop it" as it is now: the one amber button when a stage is empty, dimmed but still focusable when not. */
    show(flight: Flight): void {
      const ready = canDrop(flight);
      setText(note, ready ? TEXT.dropWhich(stageName(flight.stage)) : TEXT.dropWhen);
      if (ready === shownReady) return;
      shownReady = ready;
      dropButton.classList.toggle('button--primary', ready);
      if (ready) dropButton.removeAttribute('aria-disabled');
      else dropButton.setAttribute('aria-disabled', 'true');
    },
  };
}

/**
 * What the read-outs say aloud: only what changed since it was last said (a
 * read-out's new word, or a fuel warning the first time the fuel word gets
 * there). `hush` takes the words as they are now as said, for when other
 * words have just said it.
 */
function readoutNews(context: ExtraContext, flightNow: () => Flight) {
  const wordsOf = (flight: Flight) =>
    [heightWord(flight), speedWord(flight), tiltWord(flight), fuelWord(flight)] as const;
  let said = wordsOf(flightNow());
  return {
    hush(): void {
      said = wordsOf(flightNow());
    },
    tell(): void {
      const flight = flightNow();
      const [saidHeight, saidSpeed, saidTilt, saidFuel] = said;
      said = wordsOf(flight);
      const [height, speed, tilted, fuel] = said;
      const messages: string[] = [];
      if (height !== saidHeight) messages.push(`${height}.`);
      if (speed !== saidSpeed) messages.push(`${speed}.`);
      if (tilted !== saidTilt) messages.push(`${tilted}.`);
      if (fuel !== saidFuel && fuel === TEXT.fuelWord.low)
        messages.push(TEXT.fuelLow(stageName(flight.stage)));
      if (fuel !== saidFuel && fuel === TEXT.fuelWord.almost)
        messages.push(TEXT.fuelAlmost(stageName(flight.stage)));
      if (messages.length > 0) context.announce(messages.join(' '));
    },
  };
}

/** The rule under the controls, a sentence to a line. */
function ruleLine(): HTMLParagraphElement {
  const rule = el('p', 'extra-note orbit__rule');
  const [first = '', ...rest] = TEXT.rule.split(/(?<=\.) /);
  rule.append(el('span', undefined, first), ' ', el('span', undefined, rest.join(' ')));
  return rule;
}

/**
 * The real climb: the event at orbit insertion with its day and time (or,
 * when the story has none, its liftoff with the day alone), the real drop
 * times, and all their sources. Null when the story has neither event.
 */
function realStory(rocket: Rocket): HTMLDivElement | null {
  const { mission, drops } = rocket;
  const end = realEnd(rocket);
  if (!end) return null;
  const { event } = end;
  const day = dayOf(mission, event);
  const story = el('div', 'orbit__real');
  const title = el('h3', 'extra-heading', TEXT.realHeading(mission.name, event.title));
  title.setAttribute('data-testid', 'orbit-real-title');
  story.append(
    el('p', 'orbit__label', TEXT.realLabel),
    title,
    el('p', 'extra-text', event.text.short),
  );
  if (end.atOrbit) story.append(el('p', 'extra-note', TEXT.realWhen(day, event.elapsed)));
  else if (day) story.append(el('p', 'extra-note', TEXT.realDay(day)));
  const citations: Citation[] = [...event.citations];
  const discrepancies: Array<string | undefined> = [event.discrepancy];
  if (!event.utc && mission.launch) {
    citations.push(...mission.launch.citations);
    discrepancies.push(mission.launch.discrepancy);
  }
  const times = el('div', 'orbit__drops');
  // A time the files give only as planned is not a real one, so it is left out.
  for (const { drop: real } of drops.filter(({ drop: shown }) => !shown.planned)) {
    times.append(el('p', undefined, TEXT.realDrop(real.name.replace(/^the /, ''), real.at.value)));
    citations.push(...real.at.citations);
    discrepancies.push(real.at.discrepancy);
  }
  if (times.childElementCount > 0) story.append(times);
  if (citations.length > 0) story.append(sourcesBlock(citations, ...discrepancies));
  return story;
}

/** In orbit: the result line, then the real climb and "Up next"; the stars go under the line. */
function afterOrbit() {
  const section = el('section', 'orbit__after');
  section.hidden = true;
  const result = el('p', 'orbit__result', TEXT.inOrbit);
  result.setAttribute('data-testid', 'orbit-result');
  // Focus goes here at orbit, so a screen reader reads on from it.
  result.tabIndex = -1;
  return {
    section,
    result,
    show(story: HTMLElement | null, upNext: HTMLElement): void {
      section.replaceChildren(...[result, story, upNext].filter((part) => part !== null));
    },
  };
}

/** What's next, as "Drop the stages" builds it for liftoff: back to the flight behind the sheet, or the flight where this liftoff really happened. */
function nextStep(
  context: ExtraContext,
  params: URLSearchParams,
  climb: Climb,
): Omit<UpNextOptions, 'actions'> {
  const summary = (id: string) => context.summaries.find((each) => each.id === id);
  if (context.origin === 'flight') {
    const flight = summary(context.missionId)?.name ?? context.missionId;
    // "After liftoff" only when the flight was left at this rocket's liftoff.
    const atLiftoff =
      params.get('mission') === climb.missionId && params.get('event') === climb.liftoffEvent?.id;
    return {
      title: TEXT.pickUp(flight, atLiftoff),
      line: TEXT.waiting,
      primary: { label: TEXT.back(flight), run: () => context.close() },
    };
  }
  const month = monthOf(summary(climb.missionId)?.date ?? '');
  return {
    title: TEXT.seeReal,
    line: TEXT.flightAndMonth(climb.missionName, month),
    sentence: TEXT.opensAt,
    mission: climb.missionId,
    primary: {
      label: TEXT.fly(climb.missionName),
      run: () =>
        context.openMission(
          climb.missionId,
          climb.liftoffEvent ? { event: climb.liftoffEvent.id } : { t: climb.liftoffAt },
        ),
    },
  };
}

/** A label at the left edge of the picture, for the eye only, just above the line at `height`. */
interface EdgeLabel {
  element: HTMLSpanElement;
  /** With the 3D view: its height, from where the scene draws its line. Hidden while the line is out of view. */
  place(scene: OrbitScene): void;
}

/**
 * A label pinned to the picture's left edge, so it never lands on the
 * rocket's column, taking only its height from the line it names. With the
 * 3D view the scene says where the line is; in the flat picture the styles
 * work it out from the line's height in units (--orbit-tag-units).
 */
function edgeLabel(className: string, text: string, height: number): EdgeLabel {
  const element = el('span', className, text);
  element.setAttribute('aria-hidden', 'true');
  element.style.setProperty('--orbit-tag-units', String(height + RULES.groundDepth));
  let at = '';
  return {
    element,
    place(scene) {
      // The camera is level and straight in front, so the line is level: any point of it gives its height.
      const spot = scene.spot(RULES.width / 2, height);
      if (element.hidden !== (spot === null)) element.hidden = spot === null;
      const top = spot ? `${(spot.top * 100).toFixed(2)}%` : at;
      if (top === at) return;
      at = top;
      element.style.setProperty('--orbit-tag-at', top);
    },
  };
}

/**
 * The labels over the picture, the same with the 3D view and the flat
 * picture: "Thick air" and "Orbit" at the left edge, and at the bottom right
 * a legend for the ring at the end of the path ahead (a ring like it, sized
 * from the scene's own, and its words), shown exactly while the path ahead is.
 */
function pictureLabels(view: HTMLElement) {
  const thickAir = edgeLabel('orbit__tag', TEXT.thickAirLabel, RULES.thickAirTop);
  const orbit = edgeLabel('orbit__tag orbit__tag--orbit', TEXT.orbitLabel, RULES.orbitHeight);
  const legend = el('span', 'orbit__legend');
  legend.setAttribute('aria-hidden', 'true');
  legend.append(el('span', 'orbit__legend-ring'), TEXT.aheadLabel);
  legend.hidden = true;
  view.style.setProperty('--orbit-line', `${LINE_PX}px`);
  view.style.setProperty('--orbit-ring', `${RING_PX}px`);
  view.append(legend);
  return {
    edges: [thickAir.element, orbit.element],
    showLegend(look: Ahead | null): void {
      if (legend.hidden !== (look === null)) legend.hidden = look === null;
    },
    place(scene: OrbitScene): void {
      thickAir.place(scene);
      orbit.place(scene);
    },
  };
}

/* ------------------------------------------------------------------ */
/* The flat picture, without 3D.                                       */
/* ------------------------------------------------------------------ */

/**
 * The flat picture's own sizes, in units of the rules: one unit of the rules
 * is one unit of its viewBox, and a unit is about ten CSS px on a phone.
 */
const FLAT = {
  ringRadius: 0.55,
  /** The path ahead leaves this gap after the rocket's nose and before the ring, as the 3D view's does. */
  aheadGap: 0.35,
  /** The path flown gets a new point once the rocket has moved this far. */
  trailStep: 0.25,
  /** The launch pad: half its slab's width and its thickness, and its tower beside the rocket. */
  padHalf: 0.8,
  padThick: 0.3,
  towerOffset: 1.6,
  towerHeight: 1.8,
  /** The parachutes: each canopy's radii, how far apart they are, and how high they hang above the spacecraft. */
  chute: { rx: 0.65, ry: 0.7, apart: 1.1, above: 2 },
  /** The spacecraft comes down at least this far in from the right edge. */
  restInset: 2.5,
} as const;

/** One stage of the flat rocket: its length and its width. */
interface FlatStage {
  length: number;
  width: number;
}

/**
 * The flat picture's rocket, in shares of RULES.rocketLength (the whole
 * rocket): the spacecraft's cone, then each stage from the first up. After
 * the approved pictures.
 */
const FLAT_ROCKET: Readonly<Record<2 | 3, { nose: number; stages: readonly FlatStage[] }>> = {
  2: {
    nose: 0.15,
    stages: [
      { length: 0.47, width: 0.15 },
      { length: 0.38, width: 0.13 },
    ],
  },
  3: {
    nose: 0.13,
    stages: [
      { length: 0.37, width: 0.158 },
      { length: 0.3, width: 0.137 },
      { length: 0.2, width: 0.095 },
    ],
  },
};

/** The smaller shapes, in the same shares: the bells under the bottom stage, its flame, a stripe on each stage, the first stage's fins. */
const FLAT_SHAPES = {
  bell: 0.05,
  flame: 0.22,
  stripe: 0.02,
  /** How far down a stage its stripe is, as a share of the stage. */
  stripeAt: 0.15,
  fin: 0.1,
  finOut: 0.04,
} as const;

/** The spacecraft's cone, its tip at (x, y), `length` long and `width` across its base. */
function cone(x: number, y: number, length: number, width: number): SVGPolygonElement {
  return svg('polygon', {
    points: `${num(x - width / 2)},${num(y + length)} ${num(x)},${num(y)} ${num(x + width / 2)},${num(y + length)}`,
    class: 'orbit__flat-body',
  });
}

/** Points for an SVG polyline, with height up. */
const pointsOf = (points: readonly { x: number; height: number }[]): string =>
  points.map((point) => `${num(point.x)},${num(-point.height)}`).join(' ');

/** The flat rocket's shapes, and half its length (counting the spacecraft's cone, on or not). */
interface DrawnRocket {
  shapes: SVGElement[];
  half: number;
}

/**
 * The flat rocket about the middle of what is left of it, nose up (+y is
 * down): the stages from `bottom` up, the spacecraft's cone on top while it is
 * on, and the flame while an engine burns.
 */
function flatRocket(stages: 2 | 3, bottom: number, craft: boolean, flame: boolean): DrawnRocket {
  const length = RULES.rocketLength;
  const { nose, stages: shapes } = FLAT_ROCKET[stages];
  const left = shapes.slice(bottom);
  const half = (length * (nose + left.reduce((sum, shape) => sum + shape.length, 0))) / 2;
  const drawn: SVGElement[] = [];
  if (craft)
    drawn.push(cone(0, -half, length * nose, length * (left[left.length - 1]?.width ?? 0)));
  let y = -half + length * nose;
  for (let index = left.length - 1; index >= 0; index -= 1) {
    const shape = left[index]!;
    const width = length * shape.width;
    const tall = length * shape.length;
    const onBottom = index === 0;
    const bells = onBottom ? length * FLAT_SHAPES.bell : 0;
    const body =
      bottom + index === 0 ? 'orbit__flat-body orbit__flat-body--first' : 'orbit__flat-body';
    const end = y + tall - bells;
    drawn.push(
      svg('rect', {
        x: num(-width / 2),
        y: num(y),
        width: num(width),
        height: num(end - y),
        class: body,
      }),
      svg('rect', {
        x: num(-width / 2),
        y: num(y + tall * FLAT_SHAPES.stripeAt),
        width: num(width),
        height: num(length * FLAT_SHAPES.stripe),
        class: 'orbit__flat-stripe',
      }),
    );
    if (bottom + index === 0) {
      const fin = length * FLAT_SHAPES.fin;
      const out = length * FLAT_SHAPES.finOut;
      for (const side of [-1, 1])
        drawn.push(
          svg('path', {
            d: `M${num((side * width) / 2)} ${num(end - fin)}L${num(side * (width / 2 + out))} ${num(end)}L${num((side * width) / 2)} ${num(end)}Z`,
            class: body,
          }),
        );
    }
    if (onBottom)
      for (const place of [-1, 0, 1]) {
        const middle = (place * width) / 3;
        const top = width * 0.1;
        const foot = width * 0.14;
        drawn.push(
          svg('path', {
            d: `M${num(middle - top)} ${num(end)}L${num(middle + top)} ${num(end)}L${num(middle + foot)} ${num(end + bells)}L${num(middle - foot)} ${num(end + bells)}Z`,
            class: 'orbit__flat-bell',
          }),
        );
      }
    y += tall;
  }
  if (flame) {
    const wide = length * (left[0]?.width ?? 0) * 0.22;
    const long = length * FLAT_SHAPES.flame;
    drawn.push(
      svg('path', {
        d: `M${num(-wide)} ${num(y)}C${num(-wide * 1.6)} ${num(y + long * 0.2)} ${num(-wide * 1.3)} ${num(y + long * 0.55)} 0 ${num(y + long)}C${num(wide * 1.3)} ${num(y + long * 0.55)} ${num(wide * 1.6)} ${num(y + long * 0.2)} ${num(wide)} ${num(y)}Z`,
        class: 'orbit__flat-flame',
      }),
    );
  }
  return { shapes: drawn, half };
}

/** Out of fuel: the spacecraft's track from the top of the rocket, and the spacecraft under three parachutes on its way down to the sea. */
function underParachutes(flight: Flight, from: { x: number; height: number }): SVGElement[] {
  const length = RULES.rocketLength;
  const { nose, stages } = FLAT_ROCKET[flight.stages];
  const tall = length * nose;
  const width = length * (stages[stages.length - 1]?.width ?? 0);
  const x = Math.min((flight.x + RULES.width) / 2, RULES.width - FLAT.restInset);
  const tipY = -flight.height / 2 - tall;
  const { rx, ry, apart, above } = FLAT.chute;
  const chord = tipY - above;
  const shapes: SVGElement[] = [
    svg('path', {
      d: `M${num(from.x)} ${num(-from.height)}Q${num(x)} ${num(-from.height)} ${num(x)} ${num(tipY)}`,
      class: 'orbit__flat-fall',
    }),
  ];
  // The middle canopy last, in front of the other two.
  const middles = [x - apart, x + apart, x];
  for (const middle of middles)
    shapes.push(
      svg('path', {
        d: `M${num(middle - rx)} ${num(chord)}L${num(x)} ${num(tipY)}M${num(middle + rx)} ${num(chord)}L${num(x)} ${num(tipY)}`,
        class: 'orbit__flat-riser',
      }),
    );
  for (const middle of middles)
    shapes.push(
      svg('path', {
        d: `M${num(middle - rx)} ${num(chord)}A${rx} ${ry} 0 0 1 ${num(middle + rx)} ${num(chord)}Z`,
        class: 'orbit__flat-canopy',
      }),
    );
  shapes.push(cone(x, tipY, tall, width));
  return shapes;
}

/** A point of the play area, in units. */
type Point = Ahead['end'];

/** The part of a path from `start` along it to `end` short of its last point, in units; empty when nothing is left. */
function trimPath(points: readonly Point[], start: number, end: number): Point[] {
  const along = [0];
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    along.push(along[index - 1]! + Math.hypot(b.x - a.x, b.height - a.height));
  }
  const to = along[along.length - 1]! - end;
  if (to <= start) return [];
  /** The point `distance` along the path. */
  const at = (distance: number): Point => {
    const index = Math.max(
      1,
      along.findIndex((length) => length >= distance),
    );
    const a = points[index - 1]!;
    const b = points[index]!;
    const span = along[index]! - along[index - 1]!;
    const share = span > 0 ? (distance - along[index - 1]!) / span : 0;
    return { x: a.x + (b.x - a.x) * share, height: a.height + (b.height - a.height) * share };
  };
  const inside = points.filter((_, index) => along[index]! > start && along[index]! < to);
  return [at(start), ...inside, at(to)];
}

/** The picture without the 3D view, and how to show a moment of the flight on it. */
interface FlatPicture {
  /** The picture's box, under the fuel strip: the SVG fills it, and the edge labels go in it. */
  element: HTMLDivElement;
  svg: SVGSVGElement;
  /** The rocket with the stages it has left, turned to its tilt, its flame while a run is on (`running`) and it burns, the path flown, and the path ahead (none when `look` is null). */
  show(flight: Flight, look: Ahead | null, running: boolean): void;
  /** Out of fuel: the empty last stage stays, and the spacecraft comes down under its parachutes. */
  comeHome(flight: Flight): void;
  /** Back to the start: no paths, and nothing coming down. */
  reset(): void;
}

/**
 * Without the 3D view, the same scene as an inline SVG, drawn as the approved
 * pictures draw it: the thick air's band and its edge, the ground and the
 * pad, the orbit line, the path flown, the rocket, and the path ahead with
 * its ring. The play area always fits, standing on the bottom edge; the
 * band, the ground, and the orbit line run on past its sides, so a wider
 * picture still shows them edge to edge. The labels are the same HTML ones
 * the 3D view has; the styles place them from the picture's size and the
 * play area's (--orbit-wide and --orbit-tall, in units).
 */
function flatPicture(): FlatPicture {
  const { width, top, groundDepth, thickAirTop, orbitHeight, padX } = RULES;
  const element = el('div', 'orbit__flat');
  element.style.setProperty('--orbit-wide', String(width));
  element.style.setProperty('--orbit-tall', String(top + groundDepth));
  const picture = svg('svg', {
    viewBox: `0 ${-top} ${width} ${top + groundDepth}`,
    preserveAspectRatio: 'xMidYMax meet',
    role: 'img',
    class: 'orbit__picture',
  });
  element.append(picture);
  const across = (height: number, className: string): SVGLineElement =>
    svg('line', { x1: -width, x2: 2 * width, y1: -height, y2: -height, class: className });
  const trailLine = svg('polyline', { class: 'orbit__flat-trail' });
  const rocket = svg('g');
  const aheadLine = svg('polyline', { class: 'orbit__flat-ahead' });
  const ring = svg('circle', { r: FLAT.ringRadius, class: 'orbit__flat-ring' });
  const home = svg('g');
  picture.append(
    svg('rect', {
      x: -width,
      y: -thickAirTop,
      width: 3 * width,
      height: thickAirTop,
      class: 'orbit__flat-band',
    }),
    across(thickAirTop, 'orbit__flat-edge'),
    svg('rect', {
      x: -width,
      y: 0,
      width: 3 * width,
      height: groundDepth,
      class: 'orbit__flat-ground',
    }),
    across(0, 'orbit__flat-ground-edge'),
    svg('line', {
      x1: padX - FLAT.towerOffset,
      x2: padX - FLAT.towerOffset,
      y1: 0,
      y2: -FLAT.towerHeight,
      class: 'orbit__flat-tower',
    }),
    svg('rect', {
      x: padX - FLAT.padHalf,
      y: -FLAT.padThick / 2,
      width: 2 * FLAT.padHalf,
      height: FLAT.padThick,
      class: 'orbit__flat-pad',
    }),
    across(orbitHeight, 'orbit__flat-orbit'),
    trailLine,
    rocket,
    aheadLine,
    ring,
    home,
  );

  let trail: { x: number; height: number }[] = [];
  let drawn = '';
  let half = 0;
  /**
   * The rocket at the flight's place and tilt, drawn again only when its
   * stages, spacecraft, or flame change. The flame shows only while a run is
   * on: a fresh flight on the pad, before Start or while a rocket is picked,
   * has fuel but is not lit.
   */
  const placeRocket = (flight: Flight, craft: boolean, running: boolean): void => {
    const flame = craft && running && burning(flight);
    const key = `${flight.stages}:${flight.stage}:${craft}:${flame}`;
    if (key !== drawn) {
      drawn = key;
      const made = flatRocket(flight.stages, flight.stage, craft, flame);
      half = made.half;
      rocket.replaceChildren(...made.shapes);
    }
    rocket.setAttribute(
      'transform',
      `translate(${num(flight.x)} ${num(-flight.height)}) rotate(${num(tiltDegrees(flight))})`,
    );
  };
  /** The path ahead from just past the rocket's nose (half the rocket from its middle) to just short of the ring, as the 3D view draws it. */
  const showAhead = (look: Ahead | null): void => {
    for (const part of [aheadLine, ring]) part.toggleAttribute('hidden', look === null);
    if (!look) return;
    const { end } = look;
    const shown = trimPath(look.points, half + FLAT.aheadGap, FLAT.ringRadius + FLAT.aheadGap);
    aheadLine.setAttribute('points', pointsOf(shown));
    ring.setAttribute('cx', String(num(end.x)));
    ring.setAttribute('cy', String(num(-end.height)));
  };

  const flat: FlatPicture = {
    element,
    svg: picture,
    show(flight, look, running) {
      const last = trail[trail.length - 1];
      if (!last || Math.hypot(flight.x - last.x, flight.height - last.height) >= FLAT.trailStep) {
        trail.push({ x: flight.x, height: flight.height });
        trailLine.setAttribute('points', pointsOf(trail));
      }
      placeRocket(flight, true, running);
      showAhead(look);
    },
    comeHome(flight) {
      placeRocket(flight, false, false);
      showAhead(null);
      // The spacecraft let go from the top of what is left of the rocket.
      const turn = (tiltDegrees(flight) * Math.PI) / 180;
      const from = {
        x: flight.x + Math.sin(turn) * half,
        height: flight.height + Math.cos(turn) * half,
      };
      home.replaceChildren(...underParachutes(flight, from));
      home.removeAttribute('hidden');
    },
    reset() {
      // The path flown starts at the pad.
      trail = [{ x: padX, height: 0 }];
      trailLine.setAttribute('points', pointsOf(trail));
      drawn = '';
      showAhead(null);
      home.replaceChildren();
      home.setAttribute('hidden', '');
    },
  };
  flat.reset();
  return flat;
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
  let rocket = await firstRocket(context, params);
  if (signal.aborted) return { dispose() {} };
  loading.remove();

  let still = context.reducedMotion();
  context.onReducedMotionChange((reduced) => {
    still = reduced;
  });
  // The level last chosen on this device, and the most stars on each: one record whichever rocket is flown.
  const record = gameRecord(context.store);

  /* ----------------------------- Layout ----------------------------- */

  const root = el('div', 'orbit');
  const view = el('div', 'orbit__view');
  const canvas = el('canvas', 'orbit__canvas');
  canvas.setAttribute('role', 'img');
  const fuel = fuelStrip();
  view.append(canvas, fuel.strip);

  // A picked rocket loading, in the place of the start.
  const picking = el('p', 'extra-note', TEXT.loading);
  picking.setAttribute('role', 'status');
  // Choosing a level stands a rocket of that level on the pad at once.
  const picker = createLevelPicker({
    record,
    describe: TEXT.levels,
    onChange: (level) => showLevel(level),
    signal,
  });
  const intro = introSection(picker);
  const choose = chooseSection(context, (id) => pick(id));

  const flying = el('section', 'orbit__fly');
  const readouts = flightReadouts();
  const coach = el('p', 'orbit__coach');
  coach.setAttribute('data-testid', 'orbit-coach');
  // Focus goes here when the fuel runs out, so a screen reader reads on from it.
  coach.tabIndex = -1;
  const controls = rocketControls({ tip: pressTip, drop: pressDrop }, signal);
  const rule = ruleLine();
  const startOver = button('button orbit__again', TEXT.startOver);
  flying.append(readouts.row, coach, controls.group, rule, startOver);

  const after = afterOrbit();
  // The stars of a run that ended, its goals, and Play again: under the result line, or under the coach line when the fuel ran out.
  const runEnd = createRunEnd({
    record,
    onPlay: (level) => {
      picker.refresh();
      begin(level, TEXT.liftoff);
    },
    signal,
  });
  const toyNote = el('p', 'extra-note orbit__note orbit__note--toy');
  const side = el('div', 'orbit__side');
  side.append(picking, intro.section, choose.section, flying, after.section, toyNote);
  root.append(view, side);
  host.append(root);

  /* --------------------- 3D view, or the flat picture --------------------- */

  let scene: OrbitScene | null = null;
  let flat: FlatPicture | null = null;
  const labels = pictureLabels(view);
  try {
    scene = createOrbitScene(canvas);
    // Over the canvas, under the fuel strip, hidden until the scene first says where their lines are.
    for (const edge of labels.edges) edge.hidden = true;
    fuel.strip.before(...labels.edges);
  } catch (error) {
    console.warn(error);
    canvas.remove();
    flat = flatPicture();
    // Under the fuel strip, filling the rest of the view, with the edge labels over it.
    flat.element.append(...labels.edges);
    fuel.strip.after(flat.element);
    view.classList.add('orbit__view--flat');
    side.append(el('p', 'extra-note orbit__note', TEXT.noWebgl));
  }
  const picture: Element = flat?.svg ?? canvas;

  /* ------------------------------ Playing ----------------------------- */

  let phase: Phase = 'intro';
  // Started on the level chosen; a new run starts a new flight on its level.
  let flight = startFlight(picker.level, rocket.stages);
  /** Counts the rockets asked for, so a slow load cannot replace a newer choice. */
  let turn = 0;
  let loadingRocket = false;
  let message = '';
  let messageLeft = 0;

  /** The path ahead, worked out once a frame: shown only while an engine burns. */
  const lookNow = (): Ahead | null =>
    phase === 'flying' && burning(flight) ? ahead(flight) : null;

  const coachLine = (look: Ahead | null): string => {
    if (isOut(phase)) return TEXT.outOfFuel;
    return messageLeft > 0 ? message : guidance(flight, look);
  };

  /** The read-outs, the fuel strip, "Drop it", and the coach line, from the flight as it is now. */
  const showPanel = (look: Ahead | null): void => {
    readouts.show(flight);
    fuel.show(flight);
    controls.show(flight);
    setText(coach, coachLine(look));
  };

  /** The picture and the panel together; `seconds` is the time since the last frame. */
  const render = (look: Ahead | null, seconds: number): void => {
    scene?.fly(flight, look, seconds, still);
    flat?.show(flight, look, phase === 'flying');
    showPanel(look);
  };

  /** The legend shows while the path ahead does; with the 3D view, the edge labels follow the camera. */
  const placeLabels = (look: Ahead | null): void => {
    labels.showLegend(look);
    if (scene) labels.place(scene);
  };

  /** Shows the flight at once, outside a frame (after a press, or a new start). */
  const refresh = (): void => {
    const look = lookNow();
    render(look, 0);
    placeLabels(look);
  };

  const showPhase = (): void => {
    const out = isOut(phase);
    const flyingLayout = phase === 'flying' || out;
    picking.hidden = !loadingRocket;
    intro.section.hidden = phase !== 'intro' || loadingRocket;
    choose.section.hidden = phase !== 'choosing' || loadingRocket;
    flying.hidden = !flyingLayout;
    after.section.hidden = phase !== 'orbit';
    fuel.strip.hidden = !flyingLayout;
    root.dataset['phase'] = phase;
    root.classList.toggle('orbit--flying', flyingLayout);
    // Out of fuel the coach line is the result, with the stars under it: the read-outs, the controls, the rule, and Start over step aside.
    for (const part of [readouts.row, controls.group, rule, startOver]) part.hidden = out;
    picture.setAttribute('aria-label', pictureWords(phase));
  };

  const news = readoutNews(context, () => flight);

  /** A short message in the coach line's place for a few seconds, and said aloud. */
  const showMessage = (text: string): void => {
    message = text;
    messageLeft = MESSAGE_SECONDS;
    context.announce(text);
  };

  /* One loop runs while anything moves: the flight, then whatever the scene still moves after an ending. */
  function onFrame(seconds: number): void {
    let look: Ahead | null = null;
    if (phase === 'flying') {
      messageLeft = Math.max(0, messageLeft - seconds);
      for (const happening of advance(flight, seconds)) if (phase === 'flying') happen(happening);
      if (phase === 'flying') {
        look = lookNow();
        render(look, seconds);
        news.tell();
      }
    }
    const moving = scene?.tick(seconds, still) ?? false;
    if (phase === 'coming-home' && !moving) {
      phase = 'home';
      showPhase();
    }
    placeLabels(look);
    // Before a run a frame comes only to draw a change or a new size; after an ending the loop runs until the picture is still.
    const over = phase === 'orbit' || phase === 'home';
    if (phase === 'intro' || phase === 'choosing' || (over && !moving)) loop.stop();
  }
  const loop = createFrameLoop(onFrame, scene?.view ?? null);

  function happen(happening: Happening): void {
    switch (happening.kind) {
      case 'stage-empty':
        // The coach line says it at once, over any short message, and nothing else is said over it.
        messageLeft = 0;
        news.hush();
        context.announce(
          TEXT.coach.stageEmpty(stageName(happening.stage), stageName(happening.stage + 1)),
        );
        break;
      case 'dropped':
        stageDropped(happening.stage, happening.byItself);
        break;
      case 'stood-up':
        break;
      case 'orbit':
        reachOrbit(happening);
        break;
      case 'out-of-fuel':
        runOut();
        break;
    }
  }

  /** A stage drops, with any ring or tower that goes with it, and the next one lights. */
  function stageDropped(stage: number, byItself: boolean): void {
    scene?.drop(rocket.drops[stage]?.parts ?? [], still);
    // The drop's own words say it; the read-outs' new words are not said over them.
    news.hush();
    if (byItself) showMessage(TEXT.droppedItself(stageName(stage)));
    else {
      messageLeft = 0;
      context.announce(TEXT.dropped(stageName(stage), stageName(stage + 1)));
    }
  }

  function pressTip(way: Tip): void {
    if (phase !== 'flying') return;
    const result = tip(flight, way);
    if (result === 'tipped') controls.light(way);
    if (result === 'thick-air') showMessage(TEXT.tooThick);
    refresh();
    news.tell();
  }

  /** "Drop it", by button or space bar: a stage drops only when it is empty and not the last. */
  function pressDrop(): void {
    if (phase !== 'flying') return;
    const stage = flight.stage;
    const result = drop(flight);
    if (result === 'dropped') stageDropped(stage, false);
    else showMessage(result === 'not-yet' ? TEXT.notYet(stageName(stage)) : TEXT.lastStage);
    refresh();
  }

  /** Shows how a run ended, under its result line: the stars, the goals, and Play again. What to tell a screen reader of the stars. */
  const showStars = (goals: RunGoals, under: HTMLElement): string => {
    const { spoken } = runEnd.show({ level: flight.level, goals: goalsOf(goals) });
    under.after(runEnd.element);
    picker.refresh();
    return spoken;
  };

  /** In orbit: the result and its stars, the real climb, and what's next. */
  function reachOrbit(end: Extract<Happening, { kind: 'orbit' }>): void {
    phase = 'orbit';
    scene?.orbit(flight, still);
    flat?.show(flight, null, false);
    // Its button is plain, as Play again is the amber one, and Play again is not repeated in it.
    const upNext = context.upNext({
      ...nextStep(context, params, rocket.climb),
      plainPrimary: true,
      actions: [{ label: TEXT.another, run: toChoosing }],
    });
    after.show(realStory(rocket), upNext);
    const stars = showStars(runGoals(flight, end), after.result);
    showPhase();
    context.announce(`${TEXT.inOrbit} ${stars}`);
    after.result.focus();
  }

  /** Out of fuel: the spacecraft lets go and comes home under its parachutes, and the coach line says so over no stars. */
  function runOut(): void {
    scene?.comeHome(flight, still);
    flat?.comeHome(flight);
    phase = still || !scene ? 'home' : 'coming-home';
    const stars = showStars(runGoals(flight, { kind: 'out-of-fuel' }), coach);
    showPhase();
    showPanel(null);
    context.announce(`${TEXT.outOfFuel} ${stars}`);
    coach.focus();
  }

  /** The whole rocket back on the pad, on a level, with no paths. */
  function toPad(level: Level): void {
    scene?.reset();
    flat?.reset();
    flight = startFlight(level, rocket.stages);
    messageLeft = 0;
  }

  /** Before a run: the rocket on the pad, on the level chosen, drawn by one frame. */
  function standOnPad(): void {
    toPad(picker.level);
    refresh();
    loop.start();
  }

  /** The start screen, after choosing a level: a rocket of that level on the pad, which looks the same on either. */
  function showLevel(level: Level): void {
    if (phase !== 'intro') return;
    flight = startFlight(level, rocket.stages);
    refresh();
  }

  /** A new run on a level from the pad, with focus on "Drop it" so the space bar is ready: from Start, Start over, Play again, or the other level's button. */
  function begin(level: Level, saying: string): void {
    toPad(level);
    runEnd.hide();
    news.hush();
    phase = 'flying';
    showPhase();
    refresh();
    controls.drop.focus();
    context.announce(saying);
    loop.start();
  }

  /** The start, for this rocket. */
  function showRocket(next: Rocket): void {
    rocket = next;
    scene?.setRocket(next.climb.liftoffParts);
    setText(intro.rocketLine, TEXT.rocketLine(next.mission.name, rocketName(next.mission)));
    setText(toyNote, TEXT.toy(climbMinutes(next.climb)));
    phase = 'intro';
    showPhase();
    standOnPad();
  }

  function toChoosing(): void {
    turn += 1;
    loadingRocket = false;
    phase = 'choosing';
    showPhase();
    standOnPad();
    choose.choices[0]?.focus();
  }

  /** Loads a picked rocket (Apollo 11's if it cannot be flown) and shows its start. */
  function pick(id: string): void {
    turn += 1;
    const mine = turn;
    loadingRocket = true;
    showPhase();
    loadRocket(context, id)
      .then((next) => next ?? loadRocket(context, FALLBACK))
      .then((next) => {
        if (signal.aborted || mine !== turn) return;
        loadingRocket = false;
        if (next) showRocket(next);
        else showPhase();
        (next ? intro.start : choose.choices[0])?.focus();
      })
      .catch((error: unknown) => console.warn(error));
  }

  intro.start.addEventListener('click', () => begin(picker.level, TEXT.liftoff), { signal });
  intro.another.addEventListener('click', toChoosing, { signal });
  startOver.addEventListener('click', () => begin(flight.level, TEXT.backOnPad), { signal });

  onGameKeys(
    [
      { key: KEYS.back.key, press: () => pressTip('back') },
      { key: KEYS.over.key, press: () => pressTip('over') },
      // On a focused button the space bar presses that button instead.
      { key: KEYS.drop.key, press: pressDrop, yieldsToControls: true },
    ],
    { signal, active: () => phase === 'flying' },
  );

  // The labels follow the camera, which the scene works out again for each
  // shape of canvas, so one frame runs whenever the canvas changes size (and
  // once when it is first laid out), even while nothing else moves.
  let resizing: ResizeObserver | null = null;
  if (scene) {
    resizing = new ResizeObserver(() => loop.start());
    resizing.observe(canvas);
  }

  showRocket(rocket);

  return {
    dispose() {
      loop.stop();
      resizing?.disconnect();
      resizing = null;
      scene?.dispose();
      scene = null;
    },
  };
}

export const extra: Extra = { meta, mount };
