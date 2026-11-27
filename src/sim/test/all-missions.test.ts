import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
/**
 * Checks every mission folder under src/content/missions/, so a new
 * mission is tested as soon as its files exist (nothing to register here).
 *
 * A folder with flight.ts is a flight: its plan must build into a sound
 * path, and its story, vehicle, summary, sources, and photos must agree with
 * it and with each other, and give Fly to orbit a rocket it can fly. A folder
 * with memorial.ts (Apollo 1) is a page of remembrance: its citations and
 * photo are checked.
 *
 * Run with `npm test`. Each mission gets its own group of tests, named by
 * its folder.
 */
import { describe, expect, it } from 'vitest';
import {
  RUN_UP_MAX_MISSION_SECONDS,
  RUN_UP_MIN_STORY_SECONDS,
  RUN_UP_STORY_SECONDS,
  tourStops,
} from '../../app/tour.ts';
import { SOURCE_GROUPS, SOURCES, type Source } from '../../content/sources.ts';
import {
  elapsedToSeconds,
  type ElapsedTime,
  type Memorial,
  type Mission,
  type MissionSummary,
} from '../../content/types.ts';
import type { LeftBehind, VehicleChange } from '../../content/vehicle-types.ts';
import { realEnd, rocketFrom } from '../../extras/orbit/rocket.ts';
import { buildFlightPath } from '../build.ts';
import { AnchoredOrbit } from '../segments.ts';
import {
  CALM_LAP_STORY_SECONDS,
  createStoryTime,
  EASE_GENTLE_PACE,
  storyIntervalLength,
  storyKeyTimes,
  SWING_LAP_STORY_SECONDS,
  type StoryTime,
} from '../story-time.ts';
import type { FlightPlan } from '../types.ts';
import {
  continuityProblems,
  endProblems,
  phaseProblems,
  stretchProblems,
  surfaceProblems,
} from './path-checks.ts';

const MISSIONS = new URL('../../content/missions/', import.meta.url);
const PUBLIC = new URL('../../../public/', import.meta.url);

/** A mission file's exports, loaded by path: each file has some of these. */
interface Exports {
  summary?: MissionSummary;
  story?: Mission;
  flight?: FlightPlan;
  vehicle?: readonly VehicleChange[];
  leftBehind?: readonly LeftBehind[];
  sources?: Readonly<Record<string, Source>>;
  memorial?: Memorial;
}

async function load(id: string, file: string): Promise<Exports | undefined> {
  const url = new URL(`${id}/${file}`, MISSIONS);
  if (!existsSync(url)) return undefined;
  return (await import(url.href)) as Exports;
}

interface FlightFolder {
  id: string;
  story: Mission;
  flight: FlightPlan;
  vehicle: readonly VehicleChange[];
  leftBehind: readonly LeftBehind[];
  summary: MissionSummary | undefined;
  sources: Exports | undefined;
  /** Set when the plan does not build. */
  error?: unknown;
  path?: ReturnType<typeof buildFlightPath>;
}

interface MemorialFolder {
  id: string;
  memorial: Exports;
  summary: MissionSummary | undefined;
}

const folders = readdirSync(MISSIONS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const flights: FlightFolder[] = [];
const memorials: MemorialFolder[] = [];
for (const id of folders) {
  const summary = (await load(id, 'summary.ts'))?.summary;
  const flight = await load(id, 'flight.ts');
  if (flight) {
    const story = await load(id, 'story.ts');
    const vehicle = await load(id, 'vehicle.ts');
    const folder: FlightFolder = {
      id,
      story: story?.story as Mission,
      flight: flight.flight as FlightPlan,
      vehicle: vehicle?.vehicle ?? [],
      leftBehind: vehicle?.leftBehind ?? [],
      summary,
      sources: await load(id, 'sources.ts'),
    };
    try {
      folder.path = buildFlightPath(folder.flight);
    } catch (error) {
      folder.error = error;
    }
    flights.push(folder);
    continue;
  }
  const memorial = await load(id, 'memorial.ts');
  if (memorial) memorials.push({ id, memorial, summary });
}

/* ------------------------------------------------------------------ */
/* Walking content for citations, photos, and reader text.             */
/* ------------------------------------------------------------------ */

interface Found {
  where: string;
  value: object;
}

/** Every plain object inside `root` (arrays and nested objects), with a path to it. */
function walk(root: unknown, where: string, out: Found[] = []): Found[] {
  if (Array.isArray(root)) root.forEach((item, i) => walk(item, `${where}[${i}]`, out));
  else if (root && typeof root === 'object') {
    out.push({ where, value: root });
    for (const [key, child] of Object.entries(root)) walk(child, `${where}.${key}`, out);
  }
  return out;
}

/** A citation found inside the content: the path to it, and the source it names. */
interface FoundCitation {
  where: string;
  source: string;
}

function citationsIn(root: unknown, where: string): FoundCitation[] {
  return walk(root, where).flatMap(({ where: at, value }) =>
    'source' in value &&
    typeof value.source === 'string' &&
    'locator' in value &&
    typeof value.locator === 'string'
      ? [{ where: at, source: value.source }]
      : [],
  );
}

/** A photo found inside the content: the path to it, and its file under public/. */
interface FoundPhoto {
  where: string;
  src: string;
}

function photosIn(root: unknown, where: string): FoundPhoto[] {
  return walk(root, where).flatMap(({ where: at, value }) =>
    'src' in value &&
    typeof value.src === 'string' &&
    'alt' in value &&
    typeof value.alt === 'string' &&
    'width' in value &&
    typeof value.width === 'number'
      ? [{ where: at, src: value.src }]
      : [],
  );
}

function unknownSources(root: unknown, where: string): string[] {
  return citationsIn(root, where)
    .filter(({ source }) => !(source in SOURCES))
    .map(({ where: at, source }) => `${at}: unknown source "${source}"`);
}

function missingPhotos(root: unknown, where: string): string[] {
  return photosIn(root, where)
    .filter(({ src }) => !existsSync(new URL(src, PUBLIC)))
    .map(({ where: at, src }) => `${at}: public/${src} does not exist`);
}

/**
 * Durations of a minute or more must be written as minutes and seconds for
 * readers (see LeveledText in src/content/types.ts): "5 minutes 57.53
 * seconds", not "357.53 seconds" or "a 357.53-second burn".
 */
const RAW_SECONDS = /(\d[\d,]*(?:\.\d+)?)[\s-]*(?:seconds?|secs?)\b/gi;

function rawDurations(root: unknown, where: string): string[] {
  const problems: string[] = [];
  for (const { where: at, value } of walk(root, where)) {
    if (!('short' in value) || typeof value.short !== 'string') continue;
    const texts = { short: value.short, more: 'more' in value ? value.more : undefined };
    for (const level of ['short', 'more'] as const) {
      const text = texts[level];
      if (typeof text !== 'string') continue;
      for (const match of text.matchAll(RAW_SECONDS)) {
        const seconds = Number(match[1]!.replace(/,/g, ''));
        if (seconds >= 60)
          problems.push(`${at}.${level}: "${match[0]}" should be written as minutes and seconds`);
      }
    }
  }
  return problems;
}

/**
 * How hard an orbit may be bent to meet its published fixes (see
 * AnchoredOrbit in src/sim/segments.ts). Each test lists every orbit
 * corrected by 0.1% of its rate or 0.1 degree or more.
 *
 * The phase correction makes the craft run around its orbit faster or
 * slower than its published size implies: a correction of r of the orbital
 * rate is the same as an error of two thirds of r in the orbit's size (at
 * 1%, about 6 nautical miles of a low lunar orbit, 22 of an Earth orbit).
 * Published values need up to about 1.1% today: Apollo 11's lunar orbits
 * reach 0.6% (its times and places come from two tables), and Apollo 15's
 * 1.08% comes from drawing all its lunar orbits in one fixed plane while
 * the real orbit changed plane (on the equator the same phase needs 0.53%).
 * Mistakes move it more: a time a minute off in an hour-long phase gives
 * 1.7%, a longitude five degrees off over half a revolution 2.8%. So the
 * limit sits above every value the published data give and below those.
 *
 * The plane correction tilts the orbit to reach an end fix off its plane.
 * The bulge's turning is drawn, so what remains comes from inclinations and
 * places published at different moments: 0.75 degrees at most today
 * (Gemini 6A, nine revolutions after leaving Gemini 7). A latitude a couple
 * of degrees off, or a fix from the wrong pass, shows as several degrees.
 */
const MAX_RATE_CORRECTION = 0.015;
const MAX_PLANE_CORRECTION_DEG = 2;
const DEG_PER_RAD = 180 / Math.PI;

function report(problems: string[]): string {
  const shown = problems.slice(0, 12).join('\n  ');
  return problems.length > 12 ? `${shown}\n  ... and ${problems.length - 12} more` : shown;
}

/* ------------------------------------------------------------------ */
/* Sources shared by all missions.                                     */
/* ------------------------------------------------------------------ */

describe('all missions: sources', () => {
  it("source ids are unique across the shared list and every mission's sources.ts", () => {
    const seen = new Map<string, string>();
    const problems: string[] = [];
    const groups: [string, Readonly<Record<string, Source>>][] = [
      ['shared', SOURCE_GROUPS.shared],
      ...Object.entries(SOURCE_GROUPS.missions),
    ];
    for (const [group, sources] of groups) {
      for (const id of Object.keys(sources)) {
        const other = seen.get(id);
        if (other) problems.push(`"${id}" is in both ${other} and ${group}`);
        else seen.set(id, group);
      }
    }
    assert.deepEqual(problems, []);
  });

  it("every mission folder's own sources are registered in SOURCE_GROUPS", () => {
    for (const folder of flights) {
      if (!folder.sources) continue;
      const own = Object.keys((folder.sources.sources ?? {}) as object);
      const registered = Object.keys(SOURCE_GROUPS.missions[folder.id] ?? {});
      assert.deepEqual(
        own.sort(),
        registered.sort(),
        `${folder.id}/sources.ts is not the group registered for ${folder.id}`,
      );
    }
  });
});

/* ------------------------------------------------------------------ */
/* Each flight.                                                        */
/* ------------------------------------------------------------------ */

for (const folder of flights) {
  const { id, story, flight } = folder;

  describe(`${id}: flight path`, () => {
    it('builds', () => {
      assert.equal(
        folder.error,
        undefined,
        `${id}: ${folder.error instanceof Error ? folder.error.message : String(folder.error)}`,
      );
      assert.equal(flight.missionId, id, 'flight.missionId should be the folder name');
    });

    it("each ship's phases are contiguous and reported at their times", () => {
      if (!folder.path) return assert.fail('the plan does not build');
      const problems = phaseProblems(flight, folder.path);
      assert.equal(problems.length, 0, report(problems));
    });

    it('is continuous: no jumps, and no kinks where nothing fires', () => {
      if (!folder.path) return assert.fail('the plan does not build');
      const problems = continuityProblems(flight, folder.path);
      assert.equal(problems.length, 0, report(problems));
    });

    it('has no sideways jog: no phase where the ship travels several times farther than its speed allows', () => {
      if (!folder.path) return assert.fail('the plan does not build');
      const problems = stretchProblems(flight, folder.path);
      assert.equal(problems.length, 0, report(problems));
    });

    it('never goes below the surface of Earth or the Moon', () => {
      if (!folder.path) return assert.fail('the plan does not build');
      const problems = surfaceProblems(flight, folder.path);
      assert.equal(problems.length, 0, report(problems));
    });

    it('ends where the plan says', () => {
      if (!folder.path) return assert.fail('the plan does not build');
      const problems = endProblems(flight, folder.path);
      assert.equal(problems.length, 0, report(problems));
    });

    it('every flight-plan citation names a registered source', () => {
      const problems = unknownSources(flight, 'flight');
      assert.equal(problems.length, 0, report(problems));
    });

    it('bends no orbit hard to meet its published fixes', ({ annotate }) => {
      const path = folder.path;
      if (!path) return assert.fail('the plan does not build');
      const problems: string[] = [];
      for (const ship of flight.ships) {
        ship.phases.forEach((phase, i) => {
          const seg = path.report.segment(ship.id, i);
          if (!(seg instanceof AnchoredOrbit)) return;
          const rate = Math.abs(seg.phaseCorrection) / (seg.conic.n * (seg.t1 - seg.t0));
          const plane = seg.planeCorrection * DEG_PER_RAD;
          const end =
            phase.kind === 'orbit' && phase.endFix
              ? 'its endFix'
              : phase.kind === 'orbit' && phase.endRange
                ? 'its endRange'
                : 'where the next phase starts';
          const line = `${ship.id} "${phase.label}" (${phase.start.value} to ${phase.end.value}): ${(rate * 100).toFixed(2)}% of its orbital rate, plane turned ${plane.toFixed(2)} degrees, to end at ${end}`;
          if (rate >= 0.001 || plane >= 0.1) void annotate(line);
          if (rate > MAX_RATE_CORRECTION || plane > MAX_PLANE_CORRECTION_DEG) problems.push(line);
        });
      }
      assert.equal(
        problems.length,
        0,
        `check the published size, times, and end of\n  ${report(problems)}`,
      );
    });
  });

  describe(`${id}: story`, () => {
    it("exists, with the folder's id", () => {
      assert.ok(story, `${id}/story.ts should export "story"`);
      assert.equal(story.id, id);
      assert.equal(story.kind, 'flight');
    });

    it("events are in time order and inside the flight path's span", () => {
      if (!story) return assert.fail('no story');
      const problems: string[] = [];
      let previous = -Infinity;
      for (const event of story.events) {
        const t = elapsedToSeconds(event.elapsed);
        if (t < previous)
          problems.push(
            `"${event.id}" (${event.elapsed}) comes before the event listed ahead of it`,
          );
        previous = t;
        if (folder.path && (t < folder.path.start || t > folder.path.end)) {
          problems.push(
            `"${event.id}" (${event.elapsed}) is outside the flight path (${folder.path.start} to ${folder.path.end} s)`,
          );
        }
      }
      assert.equal(problems.length, 0, report(problems));
    });

    it("every event's chapter exists, and every chapter has an event", () => {
      if (!story) return assert.fail('no story');
      const chapters = new Set(story.chapters.map((c) => c.id));
      const problems: string[] = [];
      if (chapters.size !== story.chapters.length) problems.push('two chapters share an id');
      for (const event of story.events)
        if (!chapters.has(event.chapter))
          problems.push(`"${event.id}" names chapter "${event.chapter}", which does not exist`);
      for (const chapter of story.chapters) {
        if (!story.events.some((e) => e.chapter === chapter.id))
          problems.push(`chapter "${chapter.id}" has no events`);
      }
      const ids = story.events.map((e) => e.id);
      if (new Set(ids).size !== ids.length) problems.push('two events share an id');
      assert.equal(problems.length, 0, report(problems));
    });

    it('every citation names a registered source', () => {
      const problems = unknownSources(story, 'story');
      assert.equal(problems.length, 0, report(problems));
    });

    it('every photo exists under public/', () => {
      const problems = missingPhotos(story, 'story');
      const crewPhoto = story?.crewPhoto;
      if (crewPhoto) {
        if (!existsSync(new URL(crewPhoto.src, PUBLIC)))
          problems.push(`story.crewPhoto: public/${crewPhoto.src} does not exist`);
        if (!crewPhoto.alt.trim()) problems.push('story.crewPhoto: alt is empty');
      }
      assert.equal(problems.length, 0, report(problems));
    });

    it('every recording exists under public/ and has its words written out', () => {
      if (!story) return assert.fail('no story');
      // The words are always shown beside the player, so a recording without
      // them would leave out anyone who cannot hear it.
      const problems: string[] = [];
      for (const event of story.events) {
        const audio = event.audio;
        if (!audio) continue;
        if (!existsSync(new URL(audio.src, PUBLIC)))
          problems.push(`"${event.id}": public/${audio.src} does not exist`);
        const said = audio.transcript.filter((line) => line.speaker.trim() && line.words.trim());
        if (said.length === 0 || said.length !== audio.transcript.length) {
          problems.push(
            `"${event.id}": the transcript is empty or has a line with no speaker or no words`,
          );
        }
      }
      assert.equal(problems.length, 0, report(problems));
    });

    it('reader text writes durations of a minute or more in minutes and seconds', () => {
      const problems = rawDurations(story, 'story');
      assert.equal(problems.length, 0, report(problems));
    });

    it('has a run-up to every tour stop, but one at the very start of the clock', () => {
      if (!folder.path) return assert.fail('the plan does not build');
      // As the tour measures it (Tour.runUpFrom): the last few story seconds, or the last 30 minutes if fewer.
      const eventTimes = story.events.map((event) => elapsedToSeconds(event.elapsed));
      const clock = createStoryTime(storyKeyTimes(folder.path, eventTimes));
      const runUps = tourStops(story).map((event) => {
        const t = elapsedToSeconds(event.elapsed);
        const at = clock.toStory(t);
        const from = Math.max(
          0,
          at - RUN_UP_STORY_SECONDS,
          clock.toStory(t - RUN_UP_MAX_MISSION_SECONDS),
        );
        return { id: event.id, at, seconds: at - from };
      });

      const short = runUps.filter(
        ({ at, seconds }) => at >= RUN_UP_MIN_STORY_SECONDS && seconds < RUN_UP_MIN_STORY_SECONDS,
      );

      expect(short).toEqual([]);
    });
  });

  describe(`${id}: story clock`, () => {
    /** The flight's clock as main.ts builds it, and what it was built from. */
    const built = () => {
      if (!folder.path) throw new Error('the plan does not build');
      const eventTimes = story.events.map((event) => elapsedToSeconds(event.elapsed));
      const keys = storyKeyTimes(folder.path, eventTimes);
      return { keys, clock: createStoryTime(keys) };
    };
    /** Mission seconds per story second at mission time t, from the story seconds a hundredth of a second either side. */
    const paceAt = (clock: StoryTime, t: number): number =>
      0.02 / (clock.toStory(t + 0.01) - clock.toStory(t - 0.01));

    it('runs forward and back, each key at the story second its stretches add up to, none shorter than usual', () => {
      const { clock } = built();
      const problems: string[] = [];
      let sum = 0;
      clock.keyTimes.forEach((key, i) => {
        if (Math.abs(clock.toStory(key) - sum) > 1e-9) problems.push(`key ${key} is not at ${sum}`);
        if (Math.abs(clock.toMission(sum) - key) > 1e-6 * Math.max(1, Math.abs(key)))
          problems.push(`story ${sum} is not at key ${key}`);
        const stretch = clock.stretches[i];
        if (!stretch) return;
        if (stretch.length < storyIntervalLength(stretch.to - stretch.from) - 1e-9)
          problems.push(`the stretch from ${key} is shorter than usual`);
        sum += stretch.length;
      });
      let previous = -Infinity;
      for (let k = 0; k <= 20_000; k += 1) {
        const s = (clock.length * k) / 20_000;
        const t = clock.toMission(s);
        if (!(t > previous)) problems.push(`runs backward at story ${s}`);
        if (Math.abs(clock.toStory(t) - s) > 1e-9) problems.push(`story ${s} comes back off`);
        previous = t;
      }
      assert.equal(problems.length, 0, report(problems.slice(0, 10)));
    });

    it(`keeps every craft on no closed lap to one lap in ${SWING_LAP_STORY_SECONDS} story seconds`, () => {
      const { keys, clock } = built();
      const turns = keys.turns!;
      const problems: string[] = [];
      for (const [start, end] of turns.open) {
        const samples = turns.samples(start, end);
        const at = samples.flatMap((t, k) => [t, (t + (samples[k + 1] ?? t)) / 2]);
        for (const t of at) {
          const lapIn = 1 / (paceAt(clock, t) * turns.openRate(t));
          if (lapIn < SWING_LAP_STORY_SECONDS * (1 - 1e-3))
            problems.push(`at ${t.toFixed(0)} s a craft laps once in ${lapIn.toFixed(2)} s`);
        }
      }
      assert.equal(problems.length, 0, report(problems.slice(0, 10)));
    });

    it(`plays its calm, parting and docking stretches evenly, with no craft faster than once in ${CALM_LAP_STORY_SECONDS} story seconds, and eases the rest from the gentle pace`, () => {
      const { keys, clock } = built();
      const turns = keys.turns!;
      const problems: string[] = [];
      for (const stretch of clock.stretches) {
        const { from, to, length, play } = stretch;
        const s0 = clock.toStory(from);
        const name = `${play} stretch from ${from.toFixed(0)} s`;
        if (play === 'eased') {
          // Just after its start and just before its end: no faster than the gentle pace.
          const start = (clock.toMission(s0 + 0.01) - from) / 0.01;
          const end = (to - clock.toMission(s0 + length - 0.01)) / 0.01;
          if (Math.max(start, end) > EASE_GENTLE_PACE * (1 + 1e-6))
            problems.push(`${name} ends at ${start.toFixed(0)} and ${end.toFixed(0)}`);
          continue;
        }
        let fastest = Math.max(turns.rate(from), turns.rate(to));
        for (const t of turns.samples(from, to)) fastest = Math.max(fastest, turns.rate(t));
        const lapIn = 1 / (((to - from) / length) * fastest);
        if (lapIn < CALM_LAP_STORY_SECONDS * (1 - 1e-9))
          problems.push(`${name}: a craft laps once in ${lapIn.toFixed(2)} s`);
        const middle = (clock.toMission(s0 + length / 2) - from) / (length / 2);
        if (Math.abs(middle / ((to - from) / length) - 1) > 1e-6)
          problems.push(`${name} does not play at one pace`);
      }
      assert.equal(problems.length, 0, report(problems.slice(0, 10)));
    });
  });

  describe(`${id}: vehicle`, () => {
    const span = (ship: string): [number, number] | undefined => {
      const plan = flight.ships.find((s) => s.id === ship);
      if (!plan) return undefined;
      return [
        elapsedToSeconds(plan.phases[0].start.value),
        elapsedToSeconds(plan.phases[plan.phases.length - 1]!.end.value),
      ];
    };
    const check = (ship: string, at: ElapsedTime, what: string, problems: string[]): void => {
      const s = span(ship);
      if (!s)
        return void problems.push(`${what} names ship "${ship}", which is not in the flight plan`);
      const t = elapsedToSeconds(at);
      if (t < s[0] || t > s[1]) problems.push(`${what} at ${at} is outside ${ship}'s span`);
    };

    it('every change names a ship in the flight plan, at a time inside its span', () => {
      const problems: string[] = [];
      for (const change of folder.vehicle)
        check(change.ship, change.at.value, `change "${change.label}"`, problems);
      assert.equal(problems.length, 0, report(problems));
    });

    it('every part left behind names a ship in the flight plan, at a time inside its span', () => {
      const problems: string[] = [];
      for (const item of folder.leftBehind)
        check(item.ship, item.at.value, `left-behind "${item.label}"`, problems);
      assert.equal(problems.length, 0, report(problems));
    });

    it('every citation names a registered source', () => {
      const problems = [
        ...unknownSources(folder.vehicle, 'vehicle'),
        ...unknownSources(folder.leftBehind, 'leftBehind'),
      ];
      assert.equal(problems.length, 0, report(problems));
    });
  });

  describe(`${id}: summary`, () => {
    it('summary.ts exists and repeats the story', () => {
      const summary = folder.summary;
      assert.ok(summary, `${id}/summary.ts should export "summary"`);
      if (!story) return assert.fail('no story');
      assert.equal(summary.id, id, 'id is the folder name');
      assert.equal(summary.kind, story.kind, 'kind');
      assert.equal(summary.name, story.name, 'name');
      assert.equal(summary.program, story.program, 'program');
      assert.equal(summary.destination, story.destination, 'destination');
      assert.equal(
        summary.blurb,
        story.summary.text.short,
        "blurb is the story summary's short text",
      );
      assert.equal(summary.date, story.launch?.value.utc, "date is the story's launch time");
      assert.equal(summary.duration, story.duration?.value, 'duration');
      assert.equal(
        summary.hasTour,
        tourStops(story).length > 0,
        'hasTour says whether the story has tour stops',
      );
    });
  });
}

/* ------------------------------------------------------------------ */
/* Fly to orbit, over every flight.                                    */
/* ------------------------------------------------------------------ */

/**
 * Each rocket's stages, and how many of them the player drops on the way to
 * orbit (all but the last), by the name its flight's story gives it.
 */
const ROCKETS = new Map([
  ['Titan II Gemini Launch Vehicle', { stages: 2, drops: 1 }],
  ['Saturn IB', { stages: 2, drops: 1 }],
  ['Saturn V', { stages: 3, drops: 2 }],
]);

/** The rocket's name as a story gives it, without its serial number: "Saturn V". */
const rocketNameOf = (story: Mission): string =>
  story.launch?.value.vehicle.replace(/\s*\([^)]*\)\s*$/, '') ?? '';

/**
 * "Fly to orbit", opened over a flight, reads the flight's own files with
 * rocketFrom (src/extras/orbit/rocket.ts): with no rocket there, it would
 * fly Apollo 11's instead. Its climb must start at the flight's liftoff (so
 * "Up next" says "after liftoff" when it was opened there), and its end
 * screen tells an event of the flight's own (realEnd: the one at orbit
 * insertion, or else the liftoff).
 */
describe('all missions: Fly to orbit at liftoff', () => {
  it.each(flights.map((folder) => [folder.id, folder] as const))(
    "%s: Fly to orbit flies the flight's own rocket with that rocket's stages and ends on an event of the flight's own",
    (id, { story, flight, vehicle, leftBehind }) => {
      const rocket = rocketFrom({ mission: story, flight, vehicle, leftBehind });
      const end = rocket && realEnd(rocket);

      expect({
        flight: rocket?.mission.id,
        rocket: rocket && { stages: rocket.stages, drops: rocket.drops.length },
        climbStartsAt: rocket?.climb.liftoffEvent?.id,
        endsOnItsOwnEvent: story.events.some((event) => event === end?.event),
      }).toEqual({
        flight: id,
        rocket: ROCKETS.get(rocketNameOf(story)),
        climbStartsAt: 'liftoff',
        endsOnItsOwnEvent: true,
      });
    },
  );
});

/* ------------------------------------------------------------------ */
/* Each memorial.                                                      */
/* ------------------------------------------------------------------ */

for (const { id, memorial, summary } of memorials) {
  describe(`${id}: memorial`, () => {
    it('every citation names a registered source', () => {
      const problems = unknownSources(memorial, 'memorial');
      assert.equal(problems.length, 0, report(problems));
    });

    it('its photo exists under public/', () => {
      const problems = missingPhotos(memorial, 'memorial');
      assert.equal(problems.length, 0, report(problems));
    });

    it('reader text writes durations of a minute or more in minutes and seconds', () => {
      const problems = rawDurations(memorial, 'memorial');
      assert.equal(problems.length, 0, report(problems));
    });

    it("its summary, when present, is a memorial's", () => {
      if (!summary) return;
      assert.equal(summary.id, id);
      assert.equal(summary.kind, 'memorial');
    });
  });
}
