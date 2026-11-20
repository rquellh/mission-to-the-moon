/**
 * The Apollo 13 pattern: out to the Moon with a midcourse burn that leaves
 * the free-return path, one swing around the far side with no lunar orbit,
 * a burn about two hours after closest approach, the coast home, entry, and
 * splashdown, with the lunar module docked to the command module until
 * shortly before entry. The numbers are invented test values (some borrowed
 * from Apollo 11's plan for realism), not facts; their citations say so.
 */
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import type { Cited, ElapsedTime } from "../../content/types.ts";
import { EARTH_MEAN_RADIUS_KM, FOOT_KM, MOON_RADIUS, NAUTICAL_MILE_KM } from "../../content/physical-constants.ts";
import { elapsedToSeconds } from "../../content/types.ts";
import { buildFlightPath } from "../build.ts";
import { bodyInertialState } from "../segments.ts";
import type { BodyId, FlightPlan, LunarStateFix, Phase, TransferPhase } from "../types.ts";
import { earthSurfacePoint, pathProblems } from "./path-checks.ts";

function fake<T>(value: T): Cited<T> {
  return { value, citations: [{ source: "gemini-chronology", locator: "TEST FIXTURE: invented value, not from this source" }] };
}

const at = (elapsed: string): Cited<ElapsedTime> => fake(elapsed as ElapsedTime);
const seconds = (elapsed: string): number => elapsedToSeconds(elapsed as ElapsedTime);
const PROGRADE = fake<"prograde">("prograde");
const RETROGRADE = fake<"retrograde">("retrograde");

const sky: FlightPlan["sky"] = [
  { time: at("002:50:13.03"), moonEclipticLongitude: fake(136.8221387), subLunarLongitude: fake(320.339872), sunEclipticLongitude: fake(113.9370697) },
  { time: at("195:03:05.7"), moonEclipticLongitude: fake(239.6496456), subLunarLongitude: fake(45.35307), sunEclipticLongitude: fake(121.5828807) },
];

const MCC = "030:40:49";
const MCC_END = "030:40:53";
const PC2 = "078:00:00";
const PC2_END = "078:04:23";
const ENTRY_INTERFACE = "142:40:46";
const SPLASHDOWN = "142:54:41";
const LM_JETTISON = "141:30:00";

/** Translunar injection, on a free-return path (invented). */
const TLI = {
  time: at("002:50:13.03"),
  latitude: fake(9.91751),
  latitudeKind: "geocentric" as const,
  longitude: fake(-164.8373),
  altitude: fake(180.581),
  speed: fake(35_515.2),
  flightPathAngle: fake(6.56367),
  heading: fake(59.49975),
};

/** The lunar state the free-return path was heading for: a pass 130 n mi up (invented). */
const FREE_RETURN_ARRIVAL: LunarStateFix = { time: at("075:49:50.37"), longitude: fake(-169.58), altitude: fake(130), speed: fake(8150), flightPathAngle: fake(-9) };
/** After the midcourse burn, a lower pass (invented). */
const HYBRID_ARRIVAL: LunarStateFix = { time: at("075:49:50.37"), longitude: fake(-169.58), altitude: fake(86.7), speed: fake(8250), flightPathAngle: fake(-9.99) };
/** Just after the burn two hours past closest approach: faster, on the same heading (invented). */
const AFTER_PC2: LunarStateFix = { longitude: fake(55.97), altitude: fake(5768.3), speed: fake(5440), flightPathAngle: fake(74.27) };

const EI = { latitude: fake(-3.19), longitude: fake(-150), altitude: fake(65.8), speed: fake(36_194.4), flightPathAngle: fake(-6.48), heading: fake(50.18) };

function csmPhases(withMidcourse: boolean): Phase[] {
  const out: Phase[] = [
    { kind: "ascent", label: "Launch", body: "earth", start: at("000:00:00"), end: at("000:11:49"), site: { latitude: fake(28.6), longitude: fake(-80.6) }, azimuth: fake(72) },
    {
      kind: "orbit",
      label: "Parking orbit",
      body: "earth",
      start: at("000:11:49"),
      end: at("002:44:16"),
      apoapsis: fake(100.4),
      periapsis: fake(98.9),
      inclination: fake(32.5),
      sense: PROGRADE,
      endFix: { latitude: fake(-5.03), longitude: fake(172.55) },
    },
    { kind: "burn", label: "Translunar injection", body: "earth", start: at("002:44:16"), end: at("002:50:03") },
  ];
  const around: TransferPhase = {
    kind: "transfer",
    label: "Around the Moon",
    to: "moon",
    start: at(MCC_END),
    end: at(PC2),
    lunarSense: RETROGRADE,
    earthSense: PROGRADE,
    moonFix: HYBRID_ARRIVAL,
  };
  if (withMidcourse) {
    out.push(
      { kind: "transfer", label: "Free-return coast", to: "moon", start: at("002:50:03"), end: at(MCC), lunarSense: RETROGRADE, earthSense: PROGRADE, earthFix: TLI },
      { kind: "burn", label: "Midcourse correction", body: "earth", start: at(MCC), end: at(MCC_END) },
      around,
    );
  } else {
    // The same flight had it stayed on the free-return path.
    out.push({ ...around, start: at("002:50:03"), earthFix: TLI, moonFix: FREE_RETURN_ARRIVAL });
  }
  out.push(
    { kind: "burn", label: "Burn two hours after closest approach", body: "moon", start: at(PC2), end: at(PC2_END) },
    { kind: "transfer", label: "Coast home", to: "earth", start: at(PC2_END), end: at(ENTRY_INTERFACE), lunarSense: RETROGRADE, earthSense: PROGRADE, moonFix: AFTER_PC2, earthFix: EI },
    { kind: "entry", label: "Entry and splashdown", start: at(ENTRY_INTERFACE), end: at(SPLASHDOWN), splashdown: { latitude: fake(13.3), longitude: fake(-131.1) } },
  );
  return out;
}

function plan(withMidcourse = true): FlightPlan {
  return {
    missionId: "test",
    sky,
    ships: [
      { id: "csm", name: "Command and service module", role: "main", phases: csmPhases(withMidcourse) as [Phase, ...Phase[]] },
      {
        id: "lm",
        name: "Lunar module",
        role: "lander",
        phases: [
          { kind: "docked", label: "Docked to the command module", start: at("003:19:00"), end: at(LM_JETTISON), target: "csm" },
          { kind: "coast", label: "Set loose before entry", body: "earth", start: at(LM_JETTISON), end: at("142:40:00"), sense: PROGRADE },
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

/** Height above the Moon's mean surface, km (true scale). */
function moonHeight(path: Built, t: number): number {
  const p = pos(path, "csm", t);
  const c = [0, 0, 0];
  path.moonPosition(1, c);
  return (Math.hypot(p[0]! - c[0]!, p[1]! - c[1]!, p[2]! - c[2]!) - MOON_RADIUS) * EARTH_MEAN_RADIUS_KM;
}

/** Velocity change across a burn, ft/sec, measured about `body`. */
function burnDeltaV(path: Built, label: string, body: BodyId): number {
  const csm = plan().ships[0];
  const i = csm.phases.findIndex((p) => p.label === label);
  const t = (seconds(csm.phases[i]!.start.value) + seconds(csm.phases[i]!.end.value)) / 2;
  const before = bodyInertialState(path.report.sky, body, path.report.segment("csm", i - 1), t);
  const after = bodyInertialState(path.report.sky, body, path.report.segment("csm", i + 1), t);
  return Math.hypot(...[0, 1, 2].map((k) => after.v[k]! - before.v[k]!)) / FOOT_KM;
}

/** Closest approach to the Moon between two times: when, and how high (km). */
function closest(path: Built, from: number, to: number): { t: number; height: number; minima: number } {
  let best = { t: from, height: Infinity };
  let minima = 0;
  let a = moonHeight(path, from);
  let b = moonHeight(path, from + 60);
  for (let t = from + 120; t <= to; t += 60) {
    const c = moonHeight(path, t);
    if (b < a && b < c) minima++;
    if (b < best.height) best = { t: t - 60, height: b };
    a = b;
    b = c;
  }
  // Refine to the second.
  for (let t = best.t - 60; t <= best.t + 60; t += 1) {
    const h = moonHeight(path, t);
    if (h < best.height) best = { t, height: h };
  }
  return { ...best, minima };
}

describe("The Apollo 13 pattern: a lunar flyby with no lunar orbit", () => {
  const flight = plan();
  const path = buildFlightPath(flight);
  const flyby = closest(path, seconds("060:00:00"), seconds("100:00:00"));

  it("builds into a sound path for both ships", () => {
    const problems = pathProblems(flight, path);
    assert.equal(problems.length, 0, problems.slice(0, 8).join("\n"));
  });

  it("swings once around the far side of the Moon, with no lunar orbit", () => {
    const whole = closest(path, seconds("010:00:00"), seconds("140:00:00"));
    assert.equal(whole.minima, 1, "one closest approach to the Moon");
    assert.ok(flyby.height > 50 && flyby.height < 250, `closest approach ${flyby.height.toFixed(1)} km up`);
    // Behind the Moon as seen from Earth: on its far side (+X of its center in the scene frame).
    const p = pos(path, "csm", flyby.t);
    const c = [0, 0, 0];
    path.moonPosition(1, c);
    const away = (p[0]! - c[0]!) / Math.hypot(p[0]! - c[0]!, p[1]! - c[1]!, p[2]! - c[2]!);
    assert.ok(away > 0.5, `closest approach ${(Math.acos(away) * 180 / Math.PI).toFixed(1)} degrees from the far side's center`);
    for (const t of [flyby.t - 3600, flyby.t, flyby.t + 3600]) assert.equal(path.phaseAt("csm", t)?.kind, "transfer");
  });

  it("fires about two hours after closest approach, then heads home", () => {
    const after = (seconds(PC2) - flyby.t) / 3600;
    assert.ok(after > 1.8 && after < 2.5, `the burn comes ${after.toFixed(2)} hours after closest approach`);
    const dv = burnDeltaV(path, "Burn two hours after closest approach", "moon");
    assert.ok(dv > 400 && dv < 1500, `burn of ${dv.toFixed(0)} ft/sec`);
    assert.equal(path.phaseAt("csm", seconds(PC2) + 60)?.kind, "burn");
  });

  it("shows the midcourse burn that left the free-return path: a small burn with a big effect at the Moon", () => {
    assert.equal(path.phaseAt("csm", seconds(MCC) + 1)?.label, "Midcourse correction");
    const dv = burnDeltaV(path, "Midcourse correction", "earth");
    assert.ok(dv > 1 && dv < 150, `midcourse burn of ${dv.toFixed(1)} ft/sec`);
    // Before the burn the path is the free-return one; after it, it passes lower.
    const free = buildFlightPath(plan(false));
    const t = seconds("020:00:00");
    const a = pos(path, "csm", t);
    const b = pos(free, "csm", t);
    const apart = Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!) * EARTH_MEAN_RADIUS_KM;
    assert.ok(apart < 50, `${apart.toFixed(1)} km from the free-return path before the burn`);
    const freePass = closest(free, seconds("060:00:00"), seconds("100:00:00"));
    assert.ok(freePass.height - flyby.height > 50, `free return passes ${freePass.height.toFixed(0)} km up, the flight ${flyby.height.toFixed(0)} km`);
  });

  it("reaches the entry interface at the published time and place, and splashes down", () => {
    const t = seconds(ENTRY_INTERFACE);
    const p = pos(path, "csm", t);
    const ground = earthSurfacePoint(path, -3.19, -150, t);
    const r = Math.hypot(...p);
    const off = Math.acos(Math.min(1, (p[0]! * ground[0]! + p[1]! * ground[1]! + p[2]! * ground[2]!) / r)) * 180 / Math.PI;
    assert.ok(off < 0.3, `entry interface ${off.toFixed(3)} degrees from the published point`);
    const heightNm = ((r - 1) * EARTH_MEAN_RADIUS_KM) / NAUTICAL_MILE_KM;
    assert.ok(Math.abs(heightNm - 65.8) < 10, `entry interface ${heightNm.toFixed(1)} n mi up`);
    // A natural entry: about the published angle (-6.48 degrees; only kept for checking).
    const i = flight.ships[0].phases.findIndex((phase) => phase.label === "Coast home");
    const state = bodyInertialState(path.report.sky, "earth", path.report.segment("csm", i), t - 1);
    const gamma = (Math.asin((state.r[0] * state.v[0] + state.r[1] * state.v[1] + state.r[2] * state.v[2]) / (Math.hypot(...state.r) * Math.hypot(...state.v))) * 180) / Math.PI;
    assert.ok(gamma < -5 && gamma > -8, `entry flight-path angle ${gamma.toFixed(2)} degrees`);
  });

  it("keeps the lunar module docked to the command module until shortly before entry", () => {
    const start = seconds("003:19:00");
    const jettison = seconds(LM_JETTISON);
    for (let k = 0; k <= 30; k++) {
      const t = start + ((jettison - start) * k) / 30;
      for (const mix of [0, 1]) {
        const a = pos(path, "lm", t, mix);
        const b = pos(path, "csm", t, mix);
        assert.ok(Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!) < 1e-9, `apart at ${t}`);
      }
    }
    assert.equal(path.phaseAt("lm", jettison - 1)?.kind, "docked");
    assert.equal(path.phaseAt("lm", jettison + 1)?.kind, "coast");
    // Set loose, it coasts on alongside and ends above the atmosphere.
    const end = seconds("142:40:00");
    const height = ((Math.hypot(...pos(path, "lm", end)) - 1) * EARTH_MEAN_RADIUS_KM) / NAUTICAL_MILE_KM;
    assert.ok(height > 60, `the lunar module ends ${height.toFixed(1)} n mi up`);
  });
});

describe("A midcourse burn inside the Earth-Moon cross-fade", () => {
  // Apollo 13's second midcourse correction came about 16 hours before
  // closest approach, where the path is fading from its Earth conic to its
  // lunar conic. The leg after the burn must start from the burn, not part
  // way toward its lunar conic (which once drew a 366 km sideways jog).
  const MCC2 = "061:29:43.49";
  const MCC2_END = "061:30:17.72";
  const flight = plan();
  const csm = flight.ships[0];
  const k = csm.phases.findIndex((p) => p.label === "Around the Moon");
  const around = csm.phases[k] as TransferPhase;
  const phases = [...csm.phases] as Phase[];
  phases.splice(
    k,
    1,
    { ...around, label: "Hybrid coast", end: at(MCC2), moonFix: FREE_RETURN_ARRIVAL },
    { kind: "burn", label: "Second midcourse correction", body: "earth", start: at(MCC2), end: at(MCC2_END) },
    { ...around, start: at(MCC2_END) },
  );
  csm.phases = phases as [Phase, ...Phase[]];
  const path = buildFlightPath(flight);

  it("is inside the cross-fade (between 3 and 18 Earth radii from the Moon)", () => {
    const p = pos(path, "csm", seconds(MCC2));
    const c = [0, 0, 0];
    path.moonPosition(1, c);
    const d = Math.hypot(p[0]! - c[0]!, p[1]! - c[1]!, p[2]! - c[2]!);
    assert.ok(d > 3 && d < 18, `${d.toFixed(1)} Earth radii from the Moon`);
  });

  it("builds into a sound path, with no sideways jog at the burn", () => {
    const problems = pathProblems(flight, path);
    assert.equal(problems.length, 0, problems.slice(0, 8).join("\n"));
    for (const mix of [0, 1]) {
      const a = pos(path, "csm", seconds(MCC2), mix);
      const b = pos(path, "csm", seconds(MCC2_END), mix);
      const c = pos(path, "csm", seconds(MCC2) - 34.23, mix);
      const during = Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
      const before = Math.hypot(a[0]! - c[0]!, a[1]! - c[1]!, a[2]! - c[2]!);
      assert.ok(during < 1.5 * before, `moves ${(during / before).toFixed(2)} times as far during the burn as in the same time before it, mix ${mix}`);
    }
  });
});
