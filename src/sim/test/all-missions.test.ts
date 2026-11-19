/**
 * Checks every mission folder under src/content/missions/, so a new
 * mission is tested as soon as its files exist (nothing to register here).
 *
 * A folder with flight.ts is a flight: its plan must build into a sound
 * path, and its story, vehicle, summary, sources, and photos must agree with
 * it and with each other. A folder with memorial.ts (Apollo 1) is a page of
 * remembrance: its citations and photo are checked.
 *
 * Run with `npm test`. Each mission gets its own group of tests, named by
 * its folder.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { SOURCE_GROUPS, SOURCES } from "../../content/sources.ts";
import { elapsedToSeconds, type ElapsedTime, type Mission, type MissionSummary } from "../../content/types.ts";
import type { LeftBehind, VehicleChange } from "../../content/vehicle-types.ts";
import { buildFlightPath } from "../build.ts";
import { AnchoredOrbit } from "../segments.ts";
import type { FlightPlan } from "../types.ts";
import { continuityProblems, endProblems, phaseProblems, stretchProblems, surfaceProblems } from "./path-checks.ts";

const MISSIONS = new URL("../../content/missions/", import.meta.url);
const PUBLIC = new URL("../../../public/", import.meta.url);

/** A module's exports, loaded by path. */
type Exports = Record<string, unknown>;

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
  const summary = (await load(id, "summary.ts"))?.summary as MissionSummary | undefined;
  const flight = await load(id, "flight.ts");
  if (flight) {
    const story = await load(id, "story.ts");
    const vehicle = await load(id, "vehicle.ts");
    const folder: FlightFolder = {
      id,
      story: story?.story as Mission,
      flight: flight.flight as FlightPlan,
      vehicle: (vehicle?.vehicle ?? []) as readonly VehicleChange[],
      leftBehind: (vehicle?.leftBehind ?? []) as readonly LeftBehind[],
      summary,
      sources: await load(id, "sources.ts"),
    };
    try {
      folder.path = buildFlightPath(folder.flight);
    } catch (error) {
      folder.error = error;
    }
    flights.push(folder);
    continue;
  }
  const memorial = await load(id, "memorial.ts");
  if (memorial) memorials.push({ id, memorial, summary });
}

/* ------------------------------------------------------------------ */
/* Walking content for citations, photos, and reader text.             */
/* ------------------------------------------------------------------ */

interface Found {
  where: string;
  value: Record<string, unknown>;
}

/** Every plain object inside `root` (arrays and nested objects), with a path to it. */
function walk(root: unknown, where: string, out: Found[] = []): Found[] {
  if (Array.isArray(root)) root.forEach((item, i) => walk(item, `${where}[${i}]`, out));
  else if (root && typeof root === "object") {
    const value = root as Record<string, unknown>;
    out.push({ where, value });
    for (const [key, child] of Object.entries(value)) walk(child, `${where}.${key}`, out);
  }
  return out;
}

function citationsIn(root: unknown, where: string): Found[] {
  return walk(root, where).filter(({ value }) => typeof value.source === "string" && typeof value.locator === "string");
}

function photosIn(root: unknown, where: string): Found[] {
  return walk(root, where).filter(({ value }) => typeof value.src === "string" && typeof value.alt === "string" && typeof value.width === "number");
}

function unknownSources(root: unknown, where: string): string[] {
  return citationsIn(root, where)
    .filter(({ value }) => !(value.source as string in SOURCES))
    .map(({ where: at, value }) => `${at}: unknown source "${value.source as string}"`);
}

function missingPhotos(root: unknown, where: string): string[] {
  return photosIn(root, where)
    .filter(({ value }) => !existsSync(new URL(value.src as string, PUBLIC)))
    .map(({ where: at, value }) => `${at}: public/${value.src as string} does not exist`);
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
    if (typeof value.short !== "string") continue;
    for (const level of ["short", "more"] as const) {
      const text = value[level];
      if (typeof text !== "string") continue;
      for (const match of text.matchAll(RAW_SECONDS)) {
        const seconds = Number(match[1]!.replace(/,/g, ""));
        if (seconds >= 60) problems.push(`${at}.${level}: "${match[0]}" should be written as minutes and seconds`);
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
  const shown = problems.slice(0, 12).join("\n  ");
  return problems.length > 12 ? `${shown}\n  ... and ${problems.length - 12} more` : shown;
}

/* ------------------------------------------------------------------ */
/* Sources shared by all missions.                                     */
/* ------------------------------------------------------------------ */

describe("all missions: sources", () => {
  it("source ids are unique across the shared list and every mission's sources.ts", () => {
    const seen = new Map<string, string>();
    const problems: string[] = [];
    const groups: [string, Readonly<Record<string, unknown>>][] = [
      ["shared", SOURCE_GROUPS.shared],
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
      assert.deepEqual(own.sort(), registered.sort(), `${folder.id}/sources.ts is not the group registered for ${folder.id}`);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Each flight.                                                        */
/* ------------------------------------------------------------------ */

for (const folder of flights) {
  const { id, story, flight } = folder;

  describe(`${id}: flight path`, () => {
    it("builds", () => {
      assert.equal(folder.error, undefined, `${id}: ${folder.error instanceof Error ? folder.error.message : String(folder.error)}`);
      assert.equal(flight.missionId, id, "flight.missionId should be the folder name");
    });

    it("each ship's phases are contiguous and reported at their times", () => {
      if (!folder.path) return assert.fail("the plan does not build");
      const problems = phaseProblems(flight, folder.path);
      assert.equal(problems.length, 0, report(problems));
    });

    it("is continuous: no jumps, and no kinks where nothing fires", () => {
      if (!folder.path) return assert.fail("the plan does not build");
      const problems = continuityProblems(flight, folder.path);
      assert.equal(problems.length, 0, report(problems));
    });

    it("has no sideways jog: no phase where the ship travels several times farther than its speed allows", () => {
      if (!folder.path) return assert.fail("the plan does not build");
      const problems = stretchProblems(flight, folder.path);
      assert.equal(problems.length, 0, report(problems));
    });

    it("never goes below the surface of Earth or the Moon", () => {
      if (!folder.path) return assert.fail("the plan does not build");
      const problems = surfaceProblems(flight, folder.path);
      assert.equal(problems.length, 0, report(problems));
    });

    it("ends where the plan says", () => {
      if (!folder.path) return assert.fail("the plan does not build");
      const problems = endProblems(flight, folder.path);
      assert.equal(problems.length, 0, report(problems));
    });

    it("every flight-plan citation names a registered source", () => {
      const problems = unknownSources(flight, "flight");
      assert.equal(problems.length, 0, report(problems));
    });

    it("bends no orbit hard to meet its published fixes", (t) => {
      const path = folder.path;
      if (!path) return assert.fail("the plan does not build");
      const problems: string[] = [];
      for (const ship of flight.ships) {
        ship.phases.forEach((phase, i) => {
          const seg = path.report.segment(ship.id, i);
          if (!(seg instanceof AnchoredOrbit)) return;
          const rate = Math.abs(seg.phaseCorrection) / (seg.conic.n * (seg.t1 - seg.t0));
          const plane = seg.planeCorrection * DEG_PER_RAD;
          const end = phase.kind === "orbit" && phase.endFix ? "its endFix" : phase.kind === "orbit" && phase.endRange ? "its endRange" : "where the next phase starts";
          const line = `${ship.id} "${phase.label}" (${phase.start.value} to ${phase.end.value}): ${(rate * 100).toFixed(2)}% of its orbital rate, plane turned ${plane.toFixed(2)} degrees, to end at ${end}`;
          if (rate >= 0.001 || plane >= 0.1) t.diagnostic(line);
          if (rate > MAX_RATE_CORRECTION || plane > MAX_PLANE_CORRECTION_DEG) problems.push(line);
        });
      }
      assert.equal(problems.length, 0, `check the published size, times, and end of\n  ${report(problems)}`);
    });
  });

  describe(`${id}: story`, () => {
    it("exists, with the folder's id", () => {
      assert.ok(story, `${id}/story.ts should export "story"`);
      assert.equal(story.id, id);
      assert.equal(story.kind, "flight");
    });

    it("events are in time order and inside the flight path's span", () => {
      if (!story) return assert.fail("no story");
      const problems: string[] = [];
      let previous = -Infinity;
      for (const event of story.events) {
        const t = elapsedToSeconds(event.elapsed);
        if (t < previous) problems.push(`"${event.id}" (${event.elapsed}) comes before the event listed ahead of it`);
        previous = t;
        if (folder.path && (t < folder.path.start || t > folder.path.end)) {
          problems.push(`"${event.id}" (${event.elapsed}) is outside the flight path (${folder.path.start} to ${folder.path.end} s)`);
        }
      }
      assert.equal(problems.length, 0, report(problems));
    });

    it("every event's chapter exists, and every chapter has an event", () => {
      if (!story) return assert.fail("no story");
      const chapters = new Set(story.chapters.map((c) => c.id));
      const problems: string[] = [];
      if (chapters.size !== story.chapters.length) problems.push("two chapters share an id");
      for (const event of story.events) if (!chapters.has(event.chapter)) problems.push(`"${event.id}" names chapter "${event.chapter}", which does not exist`);
      for (const chapter of story.chapters) {
        if (!story.events.some((e) => e.chapter === chapter.id)) problems.push(`chapter "${chapter.id}" has no events`);
      }
      const ids = story.events.map((e) => e.id);
      if (new Set(ids).size !== ids.length) problems.push("two events share an id");
      assert.equal(problems.length, 0, report(problems));
    });

    it("every citation names a registered source", () => {
      const problems = unknownSources(story, "story");
      assert.equal(problems.length, 0, report(problems));
    });

    it("every photo exists under public/", () => {
      const problems = missingPhotos(story, "story");
      const crewPhoto = story?.crewPhoto;
      if (crewPhoto) {
        if (!existsSync(new URL(crewPhoto.src, PUBLIC))) problems.push(`story.crewPhoto: public/${crewPhoto.src} does not exist`);
        if (!crewPhoto.alt.trim()) problems.push("story.crewPhoto: alt is empty");
      }
      assert.equal(problems.length, 0, report(problems));
    });

    it("every recording exists under public/ and has its words written out", () => {
      if (!story) return assert.fail("no story");
      // The words are always shown beside the player, so a recording without
      // them would leave out anyone who cannot hear it.
      const problems: string[] = [];
      for (const event of story.events) {
        const audio = event.audio;
        if (!audio) continue;
        if (!existsSync(new URL(audio.src, PUBLIC))) problems.push(`"${event.id}": public/${audio.src} does not exist`);
        const said = audio.transcript.filter((line) => line.speaker.trim() && line.words.trim());
        if (said.length === 0 || said.length !== audio.transcript.length) {
          problems.push(`"${event.id}": the transcript is empty or has a line with no speaker or no words`);
        }
      }
      assert.equal(problems.length, 0, report(problems));
    });

    it("reader text writes durations of a minute or more in minutes and seconds", () => {
      const problems = rawDurations(story, "story");
      assert.equal(problems.length, 0, report(problems));
    });
  });

  describe(`${id}: vehicle`, () => {
    const span = (ship: string): [number, number] | undefined => {
      const plan = flight.ships.find((s) => s.id === ship);
      if (!plan) return undefined;
      return [elapsedToSeconds(plan.phases[0].start.value), elapsedToSeconds(plan.phases[plan.phases.length - 1]!.end.value)];
    };
    const check = (ship: string, at: ElapsedTime, what: string, problems: string[]): void => {
      const s = span(ship);
      if (!s) return void problems.push(`${what} names ship "${ship}", which is not in the flight plan`);
      const t = elapsedToSeconds(at);
      if (t < s[0] || t > s[1]) problems.push(`${what} at ${at} is outside ${ship}'s span`);
    };

    it("every change names a ship in the flight plan, at a time inside its span", () => {
      const problems: string[] = [];
      for (const change of folder.vehicle) check(change.ship, change.at.value, `change "${change.label}"`, problems);
      assert.equal(problems.length, 0, report(problems));
    });

    it("every part left behind names a ship in the flight plan, at a time inside its span", () => {
      const problems: string[] = [];
      for (const item of folder.leftBehind) check(item.ship, item.at.value, `left-behind "${item.label}"`, problems);
      assert.equal(problems.length, 0, report(problems));
    });

    it("every citation names a registered source", () => {
      const problems = [...unknownSources(folder.vehicle, "vehicle"), ...unknownSources(folder.leftBehind, "leftBehind")];
      assert.equal(problems.length, 0, report(problems));
    });
  });

  describe(`${id}: summary`, () => {
    it("summary.ts exists and repeats the story", () => {
      const summary = folder.summary;
      assert.ok(summary, `${id}/summary.ts should export "summary"`);
      if (!story) return assert.fail("no story");
      assert.equal(summary.id, id, "id is the folder name");
      assert.equal(summary.kind, story.kind, "kind");
      assert.equal(summary.name, story.name, "name");
      assert.equal(summary.program, story.program, "program");
      assert.equal(summary.destination, story.destination, "destination");
      assert.equal(summary.blurb, story.summary.text.short, "blurb is the story summary's short text");
      assert.equal(summary.date, story.launch?.value.utc, "date is the story's launch time");
      assert.equal(summary.duration, story.duration?.value, "duration");
      assert.equal(summary.hasTour, story.events.some((e) => e.inTour === true), "hasTour says whether the story has tour stops");
    });
  });
}

/* ------------------------------------------------------------------ */
/* Each memorial.                                                      */
/* ------------------------------------------------------------------ */

for (const { id, memorial, summary } of memorials) {
  describe(`${id}: memorial`, () => {
    it("every citation names a registered source", () => {
      const problems = unknownSources(memorial, "memorial");
      assert.equal(problems.length, 0, report(problems));
    });

    it("its photo exists under public/", () => {
      const problems = missingPhotos(memorial, "memorial");
      assert.equal(problems.length, 0, report(problems));
    });

    it("reader text writes durations of a minute or more in minutes and seconds", () => {
      const problems = rawDurations(memorial, "memorial");
      assert.equal(problems.length, 0, report(problems));
    });

    it("its summary, when present, is a memorial's", () => {
      if (!summary) return;
      assert.equal(summary.id, id);
      assert.equal(summary.kind, "memorial");
    });
  });
}
