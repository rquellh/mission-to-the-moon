/**
 * Long and simple Earth-orbit flights, written the way summary sources
 * allow: launch site and time, insertion time, inclination, orbit sizes
 * over the flight, retrofire time, and the landing time and place. No
 * insertion fix, no retrofire position, no entry state. The numbers here
 * are invented test values, not facts; their citations say so.
 */
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import type { Cited, ElapsedTime } from "../../content/types.ts";
import {
  EARTH_EQUATORIAL_RADIUS_KM,
  EARTH_MEAN_RADIUS_KM,
  FOOT_KM,
  NAUTICAL_MILE_KM,
} from "../../content/physical-constants.ts";
import { buildFlightPath } from "../build.ts";
import { bodyFixedLatLon, type GroundPoint } from "../frames.ts";
import { AnchoredOrbit, bodyInertialState } from "../segments.ts";
import type { Fix, FlightPlan, OrbitPhase, Phase } from "../types.ts";
import { pathProblems } from "./path-checks.ts";

function fake<T>(value: T): Cited<T> {
  return { value, citations: [{ source: "gemini-chronology", locator: "TEST FIXTURE: invented value, not from this source" }] };
}

function clock(seconds: number): Cited<ElapsedTime> {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = (seconds % 60).toFixed(3);
  return fake(`${h}:${m}:${s}` as ElapsedTime);
}

const DEG = Math.PI / 180;
const DAY = 86_400;
const END = 14 * DAY;
const INSERTION = 380;
const RETROFIRE = END - 2000;
const RETROFIRE_END = RETROFIRE + 22;

const sky: FlightPlan["sky"] = [
  { time: clock(0), moonEclipticLongitude: fake(100), subLunarLongitude: fake(-30), sunEclipticLongitude: fake(250) },
  { time: clock(END), moonEclipticLongitude: fake(284.46), subLunarLongitude: fake(-30.4), sunEclipticLongitude: fake(263.8) },
];

const SITE = { latitude: fake(28.5), longitude: fake(-80.6) };

function launch(azimuth: number | null = 85): Phase {
  const phase: Phase = { kind: "ascent", label: "Launch", body: "earth", start: clock(0), end: clock(INSERTION), site: SITE };
  return azimuth === null ? phase : { ...phase, azimuth: fake(azimuth) };
}

/** About 206 revolutions, slowly losing height, with one small raise (a step) three hours in. */
function longOrbit(end: number, extra: Partial<OrbitPhase> = {}): OrbitPhase {
  return {
    kind: "orbit",
    label: "Orbit",
    body: "earth",
    start: clock(INSERTION),
    end: clock(end),
    apoapsis: fake(177),
    periapsis: fake(87),
    inclination: fake(28.9),
    sense: fake("prograde"),
    sizes: [
      { time: clock(3 * 3600), apoapsis: fake(177), periapsis: fake(87) },
      { time: clock(3 * 3600 + 60), apoapsis: fake(177), periapsis: fake(161) },
      { time: clock(5 * DAY), apoapsis: fake(165), periapsis: fake(158) },
      { time: clock(13 * DAY), apoapsis: fake(155), periapsis: fake(150) },
    ],
    ...extra,
  };
}

function plan(phases: Phase[]): FlightPlan {
  return { missionId: "test", sky, ships: [{ id: "capsule", name: "Capsule", role: "main", phases: phases as [Phase, ...Phase[]] }] };
}

type Built = ReturnType<typeof buildFlightPath>;

function pos(path: Built, t: number, mix = 1): number[] {
  const out = [0, 0, 0];
  assert.ok(path.position("capsule", t, mix, out), `no position at ${t}`);
  return out;
}

/** Geocentric latitude and east longitude under a position, degrees. */
function ground(path: Built, p: number[], t: number): GroundPoint {
  const km: [number, number, number] = [p[0]! * EARTH_MEAN_RADIUS_KM, p[1]! * EARTH_MEAN_RADIUS_KM, p[2]! * EARTH_MEAN_RADIUS_KM];
  const ll = bodyFixedLatLon(path.report.sky.sceneToEarthFixed(km, t, [0, 0, 0]));
  return { latitude: ll.latitude / DEG, longitude: ll.longitude / DEG };
}

function heightNm(p: number[]): number {
  return (Math.hypot(...p) * EARTH_MEAN_RADIUS_KM - EARTH_EQUATORIAL_RADIUS_KM) / NAUTICAL_MILE_KM;
}

/**
 * A splashdown point under the orbit as it would fly on without a return,
 * nine minutes before the landing time: where a capsule leaving that orbit
 * would come down.
 */
function splashUnderTrack(orbit: (end: number) => OrbitPhase): Fix {
  const path = buildFlightPath(plan([launch(), orbit(END)]));
  const t = END - 9 * 60;
  const g = ground(path, pos(path, t), t);
  return { latitude: fake(g.latitude), longitude: fake(g.longitude) };
}

function returnPhases(splashdown: Fix): Phase[] {
  return [
    { kind: "burn", label: "Retrofire", body: "earth", start: clock(RETROFIRE), end: clock(RETROFIRE_END) },
    { kind: "entry", label: "Entry and splashdown", start: clock(RETROFIRE_END), end: clock(END), splashdown },
  ];
}

describe("A 14-day Earth-orbit flight from summary values", () => {
  const SPLASH = splashUnderTrack(longOrbit);
  const flight = plan([launch(), longOrbit(RETROFIRE), ...returnPhases(SPLASH)]);
  const path = buildFlightPath(flight);
  const orbit = path.report.segment("capsule", 1) as AnchoredOrbit;

  it("builds into a sound path that ends at the published splashdown", () => {
    const problems = pathProblems(flight, path);
    assert.equal(problems.length, 0, problems.slice(0, 8).join("\n"));
  });

  it("places the orbit plane from the launch site and the inclination", () => {
    const pole = path.report.sky.earthPoleInertial([0, 0, 0]);
    const n = orbit.normalAt(orbit.t0, [0, 0, 0]);
    const inclination = Math.acos(n[0] * pole[0] + n[1] * pole[1] + n[2] * pole[2]) / DEG;
    assert.ok(Math.abs(inclination - 28.9) < 0.01, `inclination ${inclination.toFixed(3)}`);
    // Insertion is downrange, east of the Cape, at the perigee height.
    const p = pos(path, INSERTION);
    const g = ground(path, p, INSERTION);
    assert.ok(g.longitude > -75 && g.longitude < -60, `insertion over ${g.latitude.toFixed(2)}, ${g.longitude.toFixed(2)}`);
    assert.ok(Math.abs(heightNm(p) - 87) < 0.5, `insertion height ${heightNm(p).toFixed(2)} n mi`);
  });

  it("leaves the site northeast or southeast as the launch azimuth says", () => {
    // Inclined 33 degrees, the two passes over the Cape (28.5 N) part clearly.
    const short = { ...longOrbit(INSERTION + 600), inclination: fake(33) };
    delete short.sizes;
    const north = buildFlightPath(plan([launch(72), short]));
    const south = buildFlightPath(plan([launch(108), short]));
    const t = INSERTION;
    const gn = ground(north, pos(north, t), t);
    const gs = ground(south, pos(south, t), t);
    assert.ok(gn.latitude > 30 && gs.latitude < 27, `northeast at ${gn.latitude.toFixed(2)}, southeast at ${gs.latitude.toFixed(2)}`);
    // With no azimuth, northeast.
    const plain = buildFlightPath(plan([launch(null), short]));
    assert.ok(ground(plain, pos(plain, t), t).latitude > 30);
  });

  it("follows the published sizes, including the small raise, with no burn phases", () => {
    const at = (t: number): [number, number] => {
      let lo = Infinity;
      let hi = -Infinity;
      for (let k = -100; k <= 100; k++) {
        const h = heightNm(pos(path, t + (k / 100) * 45 * 60));
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
      }
      return [lo, hi];
    };
    // Heights over a revolution centered on each published size. The
    // model measures from the equatorial radius, so allow 3 n mi.
    for (const [t, apo, peri] of [
      [2 * 3600, 177, 87],
      [5 * DAY, 165, 158],
      [13 * DAY, 155, 150],
    ] as const) {
      const [lo, hi] = at(t);
      assert.ok(Math.abs(lo - peri) < 3 && Math.abs(hi - apo) < 3, `at ${(t / DAY).toFixed(2)} days: ${lo.toFixed(1)} by ${hi.toFixed(1)}, published ${peri} by ${apo}`);
    }
  });

  it("needs only a tiny correction to arrive on time and on track after 206 revolutions", () => {
    const revolutions = (orbit.t1 - orbit.t0) / orbit.conic.period;
    assert.ok(revolutions > 200, `${revolutions.toFixed(0)} revolutions`);
    const rate = Math.abs(orbit.phaseCorrection) / (orbit.conic.n * (orbit.t1 - orbit.t0));
    assert.ok(rate < 0.001, `phase corrected by ${(rate * 100).toFixed(4)}% of its rate`);
    assert.ok(orbit.planeCorrection / DEG < 0.5, `plane turned ${(orbit.planeCorrection / DEG).toFixed(3)} degrees`);
  });

  it("returns naturally: a backward retrofire, a shallow entry, and the drogue over the landing area", () => {
    const sky2 = path.report.sky;
    const tMid = (RETROFIRE + RETROFIRE_END) / 2;
    const before = bodyInertialState(sky2, "earth", path.report.segment("capsule", 1), tMid);
    const after = bodyInertialState(sky2, "earth", path.report.segment("capsule", 3), tMid);
    const dv = [0, 1, 2].map((k) => (after.v[k]! - before.v[k]!) / FOOT_KM);
    const along = (dv[0]! * before.v[0]! + dv[1]! * before.v[1]! + dv[2]! * before.v[2]!) / Math.hypot(...before.v);
    assert.ok(Math.hypot(...dv) > 150 && Math.hypot(...dv) < 900, `retrofire ${Math.hypot(...dv).toFixed(0)} ft/sec`);
    assert.ok(along < -0.8 * Math.hypot(...dv), "retrofire slows the craft along its path");
    // Entry interface (400,000 ft) is fifteen minutes before landing, at a shallow angle.
    const tEI = END - 15 * 60;
    const state = bodyInertialState(sky2, "earth", path.report.segment("capsule", 3), tEI - 0.6);
    const r = Math.hypot(...state.r);
    const gamma = Math.asin((state.r[0] * state.v[0] + state.r[1] * state.v[1] + state.r[2] * state.v[2]) / (r * Math.hypot(...state.v))) / DEG;
    assert.ok(gamma < -0.5 && gamma > -4, `entry flight-path angle ${gamma.toFixed(2)} degrees`);
    // 400,000 feet above the ellipsoid is about 63 n mi above the equatorial radius at this latitude.
    assert.ok(Math.abs(heightNm(pos(path, tEI)) - 65.8) < 3.5, `entry interface at ${heightNm(pos(path, tEI)).toFixed(1)} n mi`);
    assert.equal(path.phaseAt("capsule", tEI)?.kind, "entry");
  });

  it("samples the long orbit smoothly without too many points", () => {
    const line = path.polyline("capsule")!;
    assert.ok(line.times.length < 60_000, `${line.times.length} samples`);
    const t0 = 12 * DAY;
    const t1 = 13 * DAY;
    let count = 0;
    for (const t of line.times) if (t >= t0 && t <= t1) count++;
    const perTurn = count / ((t1 - t0) / orbit.conic.period);
    assert.ok(perTurn > 40, `${perTurn.toFixed(1)} samples per turn late in the flight`);
  });
});

describe("Earth-orbit returns from fewer or more published values", () => {
  /** The same flight with a constant orbit size. */
  const steady = (apoapsis: number) => (end: number): OrbitPhase => {
    const { sizes: _unused, ...rest } = longOrbit(end, { apoapsis: fake(apoapsis), periapsis: fake(158) });
    return rest;
  };
  const SPLASH = splashUnderTrack(steady(165));

  it("a 1 nautical mile error in orbit size still lands on time and on the point, with a correction too small to see", () => {
    for (const apoapsis of [164, 165, 166]) {
      const flight = plan([launch(), steady(apoapsis)(RETROFIRE), ...returnPhases(SPLASH)]);
      const path = buildFlightPath(flight);
      const problems = pathProblems(flight, path);
      assert.equal(problems.length, 0, `${apoapsis}: ${problems.slice(0, 5).join("\n")}`);
      const orbit = path.report.segment("capsule", 1) as AnchoredOrbit;
      const rate = Math.abs(orbit.phaseCorrection) / (orbit.conic.n * (orbit.t1 - orbit.t0));
      // About 2.3 s per revolution per nautical mile, spread over 14 days.
      assert.ok(rate < 0.002, `apogee ${apoapsis}: corrected by ${(rate * 100).toFixed(4)}% of its rate`);
    }
  });

  it("a published entry interface time with no place: the coast ends there at 400,000 feet", () => {
    const tEI = END - 14 * 60;
    const flight = plan([
      launch(),
      steady(165)(RETROFIRE),
      { kind: "burn", label: "Retrofire", body: "earth", start: clock(RETROFIRE), end: clock(RETROFIRE_END) },
      { kind: "coast", label: "Falling", body: "earth", start: clock(RETROFIRE_END), end: clock(tEI), sense: fake("prograde") },
      { kind: "entry", label: "Entry", start: clock(tEI), end: clock(END), splashdown: SPLASH },
    ]);
    const path = buildFlightPath(flight);
    assert.equal(pathProblems(flight, path).length, 0, pathProblems(flight, path).slice(0, 5).join("\n"));
    assert.ok(Math.abs(heightNm(pos(path, tEI)) - 65.8) < 3.5);
    assert.equal(path.phaseAt("capsule", tEI - 1)?.kind, "coast");
  });

  it("a published retrofire position is kept", () => {
    const free = buildFlightPath(plan([launch(), steady(165)(END)]));
    const g = ground(free, pos(free, RETROFIRE), RETROFIRE);
    const flight = plan([
      launch(),
      {
        ...steady(165)(RETROFIRE),
        endFix: { latitude: fake(g.latitude), latitudeKind: "geocentric", longitude: fake(g.longitude), altitude: fake(heightNm(pos(free, RETROFIRE))) },
      },
      ...returnPhases(SPLASH),
    ]);
    const path = buildFlightPath(flight);
    assert.equal(pathProblems(flight, path).length, 0, pathProblems(flight, path).slice(0, 5).join("\n"));
    const at = ground(path, pos(path, RETROFIRE), RETROFIRE);
    assert.ok(Math.abs(at.latitude - g.latitude) < 1e-3 && Math.abs(at.longitude - g.longitude) < 1e-3, `retrofire at ${at.latitude}, ${at.longitude}`);
  });

  it("a published insertion fix with a heading wins over the derived plane", () => {
    const fix = { latitude: fake(26.7), longitude: fake(-70.03), altitude: fake(86.5), speed: fake(25_738), flightPathAngle: fake(0.04), heading: fake(101.88) };
    const path = buildFlightPath(plan([launch(), { ...steady(165)(INSERTION + 6000), startFix: fix }]));
    const g = ground(path, pos(path, INSERTION), INSERTION);
    assert.ok(Math.abs(g.longitude + 70.03) < 1e-6, `insertion longitude ${g.longitude}`);
    // Its heading (101.88, southeast) gives a descending pass: the craft heads south.
    const later = ground(path, pos(path, INSERTION + 300), INSERTION + 300);
    assert.ok(later.latitude < g.latitude);
  });

  it("a start fix with no heading takes the published inclination, on the pass nearer the launch site", () => {
    const path = buildFlightPath(plan([launch(), { ...steady(165)(INSERTION + 6000), startFix: { latitude: fake(27.5), longitude: fake(-68), altitude: fake(158) } }]));
    const orbit = path.report.segment("capsule", 1) as AnchoredOrbit;
    const pole = path.report.sky.earthPoleInertial([0, 0, 0]);
    const n = orbit.normalAt(orbit.t0, [0, 0, 0]);
    assert.ok(Math.abs(Math.acos(n[0] * pole[0] + n[1] * pole[1] + n[2] * pole[2]) / DEG - 28.9) < 0.01);
  });

  it("a phase lasting months is capped and still smooth", () => {
    const months = 120 * DAY;
    const path = buildFlightPath(plan([launch(), { ...steady(165)(months), end: clock(months) }]));
    const line = path.polyline("capsule")!;
    assert.ok(line.times.length <= 60_000, `${line.times.length} samples`);
    const orbit = path.report.segment("capsule", 1) as AnchoredOrbit;
    let count = 0;
    for (const t of line.times) if (t >= months - 10 * DAY) count++;
    const perTurn = count / ((10 * DAY) / orbit.conic.period);
    assert.ok(perTurn >= 24, `${perTurn.toFixed(1)} samples per turn at the end`);
  });
});
