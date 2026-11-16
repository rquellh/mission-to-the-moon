/**
 * An Earth-orbit-only flight (Gemini-style: launch, orbit, retrofire, coast,
 * entry), to show the plan format and builder cover flights that never
 * leave Earth. The numbers here are invented test values, not facts; their
 * citations say so.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Cited, ElapsedTime } from "../../content/types.ts";
import { EARTH_AXIAL_TILT_RAD, EARTH_EQUATORIAL_RADIUS_KM, EARTH_MEAN_RADIUS_KM, NAUTICAL_MILE_KM } from "../../content/physical-constants.ts";
import { buildFlightPath } from "../build.ts";
import { bodyFixedLatLon } from "../frames.ts";
import type { FlightPlan, Phase } from "../types.ts";

function fake<T>(value: T): Cited<T> {
  return { value, citations: [{ source: "gemini-chronology", locator: "TEST FIXTURE: invented value, not from this source" }] };
}

function clock(seconds: number): Cited<ElapsedTime> {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return fake(`${h}:${m}:${s}` as ElapsedTime);
}

const sky: FlightPlan["sky"] = [
  { time: clock(0), moonEclipticLongitude: fake(100), subLunarLongitude: fake(-30), sunEclipticLongitude: fake(250) },
  { time: clock(20_000), moonEclipticLongitude: fake(103.05), subLunarLongitude: fake(-109.1), sunEclipticLongitude: fake(250.2) },
];

const launchPhases: Phase[] = [
  {
    kind: "ascent",
    label: "Launch",
    body: "earth",
    start: clock(0),
    end: clock(360),
    site: { latitude: fake(28.5), longitude: fake(-80.6) },
  },
];

function orbitPhase(end: number): Phase {
  return {
    kind: "orbit",
    label: "Orbit",
    body: "earth",
    start: clock(360),
    end: clock(end),
    apoapsis: fake(160),
    periapsis: fake(87),
    sense: fake("prograde"),
    startFix: {
      latitude: fake(31),
      longitude: fake(-66),
      altitude: fake(87),
      speed: fake(25_700),
      flightPathAngle: fake(0),
      heading: fake(80),
    },
  };
}

function plan(phases: Phase[]): FlightPlan {
  return { missionId: "test", sky, ships: [{ id: "capsule", name: "Capsule", phases: phases as [Phase, ...Phase[]] }] };
}

/** Ground point under the capsule at time t, from a plan that just keeps orbiting. */
function groundPointOnOrbit(t: number): { latitude: number; longitude: number } {
  const orbitOnly = buildFlightPath(plan([...launchPhases, orbitPhase(20_000)]));
  const p = [0, 0, 0];
  orbitOnly.position("capsule", t, 1, p);
  const km: [number, number, number] = [p[0]! * EARTH_MEAN_RADIUS_KM, p[1]! * EARTH_MEAN_RADIUS_KM, p[2]! * EARTH_MEAN_RADIUS_KM];
  const ll = bodyFixedLatLon(orbitOnly.report.sky.sceneToEarthFixed(km, t, [0, 0, 0]));
  return { latitude: (ll.latitude * 180) / Math.PI, longitude: (ll.longitude * 180) / Math.PI };
}

describe("Earth-orbit-only flight", () => {
  const entryPoint = groundPointOnOrbit(5_700);
  const splashPoint = groundPointOnOrbit(6_000);
  const path = buildFlightPath(
    plan([
      ...launchPhases,
      orbitPhase(5_000),
      { kind: "burn", label: "Retrofire", body: "earth", start: clock(5_000), end: clock(5_022) },
      {
        kind: "coast",
        label: "Coast to entry",
        body: "earth",
        start: clock(5_022),
        end: clock(5_600),
        sense: fake("prograde"),
        endFix: { latitude: fake(entryPoint.latitude), longitude: fake(entryPoint.longitude), altitude: fake(65.8) },
      },
      {
        kind: "entry",
        label: "Entry",
        start: clock(5_600),
        end: clock(6_400),
        splashdown: { latitude: fake(splashPoint.latitude), longitude: fake(splashPoint.longitude) },
      },
    ]),
  );

  it("builds, and the path is continuous", () => {
    for (const t of [360, 5_000, 5_022, 5_600]) {
      const a = [0, 0, 0];
      const b = [0, 0, 0];
      for (const mix of [0, 1]) {
        path.position("capsule", t - 1e-3, mix, a);
        path.position("capsule", t + 1e-3, mix, b);
        assert.ok(Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!) < 1e-4, `jump at ${t}`);
      }
    }
  });

  it("keeps the published orbit size and ends at the splashdown point", () => {
    let lo = Infinity;
    let hi = -Infinity;
    const p = [0, 0, 0];
    for (let t = 360; t <= 5_000; t += 5) {
      path.position("capsule", t, 1, p);
      const h = (Math.hypot(p[0]!, p[1]!, p[2]!) * EARTH_MEAN_RADIUS_KM - EARTH_EQUATORIAL_RADIUS_KM) / NAUTICAL_MILE_KM;
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
    assert.ok(lo > 86.9 && hi < 160.1, `orbit between ${lo} and ${hi}`);

    path.position("capsule", 6_400, 1, p);
    const lat = (splashPoint.latitude * Math.PI) / 180;
    const lon = (splashPoint.longitude * Math.PI) / 180;
    let v = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon)];
    const rot = (u: number[], a: number) => [u[0]! * Math.cos(a) + u[2]! * Math.sin(a), u[1]!, -u[0]! * Math.sin(a) + u[2]! * Math.cos(a)];
    v = rot(v, path.earthSpinAngle(6_400));
    v = [v[0]!, v[1]! * Math.cos(-EARTH_AXIAL_TILT_RAD) - v[2]! * Math.sin(-EARTH_AXIAL_TILT_RAD), v[1]! * Math.sin(-EARTH_AXIAL_TILT_RAD) + v[2]! * Math.cos(-EARTH_AXIAL_TILT_RAD)];
    v = rot(v, path.earthAxisAngle(6_400));
    assert.ok(Math.hypot(p[0]! - v[0]!, p[1]! - v[1]!, p[2]! - v[2]!) < 1e-9);
  });
});
