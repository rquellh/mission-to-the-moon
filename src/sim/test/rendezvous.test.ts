/**
 * A rendezvous with a target that was already in orbit long before the crew
 * launched (Gemini 7 for Gemini 6A, an old Agena for Gemini 10), followed by
 * station keeping and departure. The target is started shortly before the
 * crew's launch, placed by a published distance ahead of the crew's ship at
 * insertion, with no position fix of its own. The numbers are invented test
 * values, not facts; their citations say so.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Cited, ElapsedTime } from "../../content/types.ts";
import { EARTH_MEAN_RADIUS_KM, NAUTICAL_MILE_KM } from "../../content/physical-constants.ts";
import { buildFlightPath } from "../build.ts";
import { bodyFixedLatLon } from "../frames.ts";
import { AnchoredOrbit } from "../segments.ts";
import type { FlightPlan, Phase } from "../types.ts";
import { pathProblems } from "./path-checks.ts";

function fake<T>(value: T): Cited<T> {
  return { value, citations: [{ source: "gemini-chronology", locator: "TEST FIXTURE: invented value, not from this source" }] };
}

function clock(seconds: number): Cited<ElapsedTime> {
  const sign = seconds < 0 ? "-" : "";
  const a = Math.abs(seconds);
  return fake(`${sign}${Math.floor(a / 3600)}:${Math.floor((a % 3600) / 60)}:${(a % 60).toFixed(3)}` as ElapsedTime);
}

const DEG = Math.PI / 180;
const TARGET_START = -600;
const INSERTION = 360;
const NC = 3 * 5400;
const NC_END = NC + 60;
const TPI = 22_500;
const TPI_END = TPI + 30;
const ALONGSIDE = 24_600;
const DEPART = 30_000;
const RETROFIRE = 80_000;
const RETROFIRE_END = RETROFIRE + 22;
const LANDING = 81_900;
const END = 82_000;

const sky: FlightPlan["sky"] = [
  { time: clock(TARGET_START), moonEclipticLongitude: fake(40), subLunarLongitude: fake(120), sunEclipticLongitude: fake(262) },
  { time: clock(END), moonEclipticLongitude: fake(52.6), subLunarLongitude: fake(-205.6), sunEclipticLongitude: fake(262.9) },
];

const TARGET_ORBIT = { apoapsis: fake(162), periapsis: fake(160), sense: fake<"prograde">("prograde") };

function chaserPhases(splashdown: { latitude: Cited<number>; longitude: Cited<number> }): Phase[] {
  return [
    { kind: "ascent", label: "Launch", body: "earth", start: clock(0), end: clock(INSERTION), site: { latitude: fake(28.5), longitude: fake(-80.6) }, azimuth: fake(82) },
    { kind: "orbit", label: "First orbit", body: "earth", start: clock(INSERTION), end: clock(NC), apoapsis: fake(161), periapsis: fake(87), inclination: fake(28.9), sense: fake("prograde") },
    { kind: "burn", label: "Coelliptic maneuver", body: "earth", start: clock(NC), end: clock(NC_END) },
    {
      kind: "orbit",
      label: "Coelliptic orbit",
      body: "earth",
      start: clock(NC_END),
      end: clock(TPI),
      apoapsis: fake(147),
      periapsis: fake(145),
      sense: fake("prograde"),
      endRange: { target: "target", range: fake(30) },
    },
    { kind: "burn", label: "Terminal phase initiation", body: "earth", start: clock(TPI), end: clock(TPI_END) },
    { kind: "rendezvous", label: "Closing in", body: "earth", start: clock(TPI_END), end: clock(ALONGSIDE), target: "target", apoapsis: fake(161), periapsis: fake(146), sense: fake("prograde") },
    { kind: "station", label: "Station keeping", start: clock(ALONGSIDE), end: clock(DEPART), target: "target", range: fake(0.02) },
    { kind: "orbit", label: "Separated", body: "earth", start: clock(DEPART), end: clock(RETROFIRE), apoapsis: fake(163), periapsis: fake(159), sense: fake("prograde") },
    { kind: "burn", label: "Retrofire", body: "earth", start: clock(RETROFIRE), end: clock(RETROFIRE_END) },
    { kind: "entry", label: "Entry and splashdown", start: clock(RETROFIRE_END), end: clock(LANDING), splashdown },
  ];
}

function plan(splashdown: { latitude: Cited<number>; longitude: Cited<number> }): FlightPlan {
  return {
    missionId: "test",
    sky,
    ships: [
      { id: "chaser", name: "Crew spacecraft", role: "main", phases: chaserPhases(splashdown) as [Phase, ...Phase[]] },
      {
        id: "target",
        name: "Target, in orbit for days",
        role: "target",
        phases: [
          {
            kind: "orbit",
            label: "In orbit",
            body: "earth",
            start: clock(TARGET_START),
            end: clock(END),
            ...TARGET_ORBIT,
            startRelative: { ship: "chaser", time: clock(INSERTION), ahead: fake(1200) },
          },
        ],
      },
    ],
  };
}

type Built = ReturnType<typeof buildFlightPath>;

function pos(path: Built, ship: string, t: number, mix = 1): number[] {
  const out = [0, 0, 0];
  assert.ok(path.position(ship, t, mix, out), `${ship} at ${t}`);
  return out;
}

function rangeNm(path: Built, t: number): number {
  const a = pos(path, "chaser", t);
  const b = pos(path, "target", t);
  return (Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!) * EARTH_MEAN_RADIUS_KM) / NAUTICAL_MILE_KM;
}

/** Where the separated chaser would be nine minutes before landing if it flew on: a natural splashdown point. */
function naturalSplash(): { latitude: Cited<number>; longitude: Cited<number> } {
  const flight = plan({ latitude: fake(0), longitude: fake(0) });
  const chaser = flight.ships[0];
  const phases = chaser.phases.slice(0, 8) as Phase[];
  phases[7] = { ...(phases[7] as Extract<Phase, { kind: "orbit" }>), end: clock(LANDING) };
  chaser.phases = phases as [Phase, ...Phase[]];
  const path = buildFlightPath(flight);
  const t = LANDING - 9 * 60;
  const p = pos(path, "chaser", t);
  const km: [number, number, number] = [p[0]! * EARTH_MEAN_RADIUS_KM, p[1]! * EARTH_MEAN_RADIUS_KM, p[2]! * EARTH_MEAN_RADIUS_KM];
  const ll = bodyFixedLatLon(path.report.sky.sceneToEarthFixed(km, t, [0, 0, 0]));
  return { latitude: fake(ll.latitude / DEG), longitude: fake(ll.longitude / DEG) };
}

describe("Rendezvous with a target already in orbit, then station keeping", () => {
  const flight = plan(naturalSplash());
  const path = buildFlightPath(flight);

  it("builds into a sound path for both ships", () => {
    const problems = pathProblems(flight, path);
    assert.equal(problems.length, 0, problems.slice(0, 8).join("\n"));
  });

  it("starts the target shortly before the crew's launch, without drawing its days in orbit", () => {
    assert.equal(path.start, TARGET_START);
    assert.equal(path.ships.find((s) => s.id === "target")!.start, TARGET_START);
    assert.ok(path.position("target", TARGET_START, 1, [0, 0, 0]));
    assert.equal(path.position("chaser", -1, 1, [0, 0, 0]), false);
  });

  it("puts the target the published distance ahead at insertion, in the chaser's plane", () => {
    assert.ok(Math.abs(rangeNm(path, INSERTION) - 1200) < 0.01, `range ${rangeNm(path, INSERTION).toFixed(3)} n mi`);
    const a = (path.report.segment("chaser", 1) as AnchoredOrbit).normalAt(INSERTION, [0, 0, 0]);
    const b = (path.report.segment("target", 0) as AnchoredOrbit).normalAt(INSERTION, [0, 0, 0]);
    const angle = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])) / DEG;
    assert.ok(angle < 0.01, `planes ${angle.toFixed(4)} degrees apart`);
    // Ahead: along the chaser's direction of travel.
    const dir = [0, 0, 0];
    path.direction("chaser", INSERTION, 1, dir);
    const c = pos(path, "chaser", INSERTION);
    const t = pos(path, "target", INSERTION);
    assert.ok((t[0]! - c[0]!) * dir[0]! + (t[1]! - c[1]!) * dir[1]! + (t[2]! - c[2]!) * dir[2]! > 0);
  });

  it("reaches the published range at terminal phase initiation with a small correction", () => {
    assert.ok(Math.abs(rangeNm(path, TPI) - 30) < 0.05, `range ${rangeNm(path, TPI).toFixed(2)} n mi`);
    const coelliptic = path.report.segment("chaser", 3) as AnchoredOrbit;
    const rate = Math.abs(coelliptic.phaseCorrection) / (coelliptic.conic.n * (coelliptic.t1 - coelliptic.t0));
    assert.ok(rate < 0.01, `corrected by ${(rate * 100).toFixed(3)}% of its rate`);
  });

  it("keeps station beside the target, reported as a station phase", () => {
    for (let k = 0; k <= 20; k++) {
      const t = ALONGSIDE + ((DEPART - ALONGSIDE) * k) / 20;
      assert.equal(path.phaseAt("chaser", t)?.kind, k === 20 ? "orbit" : "station");
      for (const mix of [0, 0.37, 1]) {
        const a = pos(path, "chaser", t, mix);
        const b = pos(path, "target", t, mix);
        assert.ok(Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!) < 1e-9, `apart at ${t}, mix ${mix}`);
      }
    }
  });

  it("leaves station from the target's place and drifts away on its own orbit", () => {
    assert.ok(rangeNm(path, DEPART + 1) < 0.01);
    assert.ok(rangeNm(path, DEPART + 6 * 3600) > 5, `range ${rangeNm(path, DEPART + 6 * 3600).toFixed(1)} n mi six hours later`);
  });
});

describe("A spent stage set loose and kept on station (the Apollo 7 pattern)", () => {
  const SEPARATION = 3 * 3600;
  const PHASING = 4 * 3600;
  const flight: FlightPlan = {
    missionId: "test",
    sky,
    ships: [
      {
        id: "csm",
        name: "Command and service module",
        role: "main",
        phases: [
          { kind: "ascent", label: "Launch", body: "earth", start: clock(0), end: clock(600), site: { latitude: fake(28.5), longitude: fake(-80.6) }, azimuth: fake(72) },
          { kind: "orbit", label: "On the stage", body: "earth", start: clock(600), end: clock(SEPARATION), apoapsis: fake(152), periapsis: fake(123), inclination: fake(31.6), sense: fake("prograde") },
          { kind: "station", label: "Station keeping with the stage", start: clock(SEPARATION), end: clock(PHASING), target: "stage" },
          { kind: "burn", label: "Phasing burn", body: "earth", start: clock(PHASING), end: clock(PHASING + 10) },
          { kind: "orbit", label: "Apart", body: "earth", start: clock(PHASING + 10), end: clock(END), apoapsis: fake(155), periapsis: fake(124), sense: fake("prograde") },
        ],
      },
      {
        id: "stage",
        name: "Spent upper stage",
        role: "target",
        phases: [
          { kind: "docked", label: "Carrying the spacecraft", start: clock(0), end: clock(SEPARATION), target: "csm" },
          { kind: "orbit", label: "Set loose", body: "earth", start: clock(SEPARATION), end: clock(END), apoapsis: fake(152), periapsis: fake(123), sense: fake("prograde") },
        ],
      },
    ],
  };
  const path = buildFlightPath(flight);

  it("builds into a sound path for both ships", () => {
    const problems = pathProblems(flight, path);
    assert.equal(problems.length, 0, problems.slice(0, 8).join("\n"));
  });

  it("flies the pair together, then side by side, then apart after the burn", () => {
    for (const t of [300, SEPARATION - 1, SEPARATION + 1, (SEPARATION + PHASING) / 2, PHASING]) {
      const a = pos(path, "csm", t);
      const b = pos(path, "stage", t);
      assert.ok(Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!) < 1e-9, `apart at ${t}`);
    }
    assert.equal(path.phaseAt("csm", SEPARATION + 60)?.kind, "station");
    const a = pos(path, "csm", PHASING + 5 * 3600);
    const b = pos(path, "stage", PHASING + 5 * 3600);
    assert.ok((Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!) * EARTH_MEAN_RADIUS_KM) / NAUTICAL_MILE_KM > 5);
  });
});

describe("Two ships that stay near each other for hours (Gemini 6A and 7 overnight)", () => {
  // After station keeping the chaser drifts off on an orbit 2 n mi higher
  // at apogee than the target's. Run on the periods their sizes imply, the
  // pair would be far apart by morning. A radar range at a published time
  // (endRange, ahead) and the published periods keep them together.
  const RADAR = 50_000;
  const MORNING = END;
  function night(pinned: boolean): FlightPlan {
    const flight = plan({ latitude: fake(0), longitude: fake(0) });
    const chaser = flight.ships[0];
    const upToStation = chaser.phases.slice(0, 7) as Phase[];
    const apart = { kind: "orbit" as const, body: "earth" as const, apoapsis: fake(164), periapsis: fake(160), sense: fake<"prograde">("prograde") };
    const period = pinned ? { period: fake(90.57) } : {};
    const night: Phase[] = [
      ...upToStation,
      pinned
        ? { ...apart, ...period, label: "Apart", start: clock(DEPART), end: clock(RADAR), endRange: { target: "target", range: fake(17.63), side: "ahead" as const } }
        : { ...apart, label: "Apart", start: clock(DEPART), end: clock(RADAR) },
      { ...apart, ...period, label: "Apart, later", start: clock(RADAR), end: clock(MORNING) },
    ];
    chaser.phases = night as [Phase, ...Phase[]];
    const targetShip = flight.ships[1]!;
    const target = targetShip.phases[0] as Extract<Phase, { kind: "orbit" }>;
    targetShip.phases = [{ ...target, ...period }];
    return flight;
  }

  it("drift far apart when each runs on the period its own size implies", () => {
    const path = buildFlightPath(night(false));
    assert.ok(rangeNm(path, MORNING) > 60, `${rangeNm(path, MORNING).toFixed(0)} n mi apart by morning`);
  });

  it("stay together with a published range and published periods", () => {
    const flight = night(true);
    const path = buildFlightPath(flight);
    const problems = pathProblems(flight, path);
    assert.equal(problems.length, 0, problems.slice(0, 8).join("\n"));
    assert.ok(Math.abs(rangeNm(path, RADAR) - 17.63) < 0.05, `range ${rangeNm(path, RADAR).toFixed(2)} n mi at the radar time`);
    for (let t = RADAR; t <= MORNING; t += 600) {
      const r = rangeNm(path, t);
      assert.ok(r > 10 && r < 30, `${r.toFixed(1)} n mi apart at ${t}`);
    }
    // Ahead: along the target's direction of travel.
    const dir = [0, 0, 0];
    path.direction("target", RADAR, 1, dir);
    const c = pos(path, "chaser", RADAR);
    const t = pos(path, "target", RADAR);
    assert.ok((c[0]! - t[0]!) * dir[0]! + (c[1]! - t[1]!) * dir[1]! + (c[2]! - t[2]!) * dir[2]! > 0);
  });

  it("goes around in the published period", () => {
    const path = buildFlightPath(night(true));
    const k = night(true).ships[0].phases.findIndex((p) => p.label === "Apart, later");
    const seg = path.report.segment("chaser", k) as AnchoredOrbit;
    assert.ok(Math.abs(seg.conic.period / 60 - 90.57) < 1e-9, `period ${(seg.conic.period / 60).toFixed(4)} min`);
  });
});
