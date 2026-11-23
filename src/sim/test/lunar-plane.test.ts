/**
 * Lunar orbits over a landing site far from the Moon's equator (Apollo 15
 * landed at about 26 degrees north, Apollo 17 at about 20). The fixture is
 * Apollo 11's plan with its landing site moved to 26.1 degrees north (an
 * invented value; its citation says so) and `lunarOrbitPlane` set over it.
 */
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { flight as apollo11 } from "../../content/missions/apollo-11/flight.ts";
import { EARTH_MOON_DISTANCE } from "../../content/physical-constants.ts";
import { elapsedToSeconds, type Cited, type ElapsedTime } from "../../content/types.ts";
import { buildFlightPath } from "../build.ts";
import type { GroundPoint } from "../frames.ts";
import type { FlightPlan, Phase } from "../types.ts";
import { pathProblems } from "./path-checks.ts";

function fake<T>(value: T): Cited<T> {
  return { value, citations: [{ source: "gemini-chronology", locator: "TEST FIXTURE: invented value, not from this source" }] };
}

const DEG = Math.PI / 180;
const LATITUDE = 26.1;
const LONGITUDE = 23.47314;

/** Apollo 11's plan with the landing site moved north, with or without a plane over it. */
function plan(overSite: boolean): FlightPlan {
  const copy = structuredClone(apollo11) as FlightPlan;
  const site = { latitude: fake(LATITUDE), longitude: fake(LONGITUDE) };
  for (const ship of copy.ships) {
    ship.phases = ship.phases.map((phase) =>
      phase.kind === "descent" || phase.kind === "surface" || (phase.kind === "ascent" && phase.body === "moon") ? { ...phase, site } : phase,
    ) as [Phase, ...Phase[]];
  }
  if (overSite) copy.lunarOrbitPlane = { site };
  return copy;
}

type Built = ReturnType<typeof buildFlightPath>;

function pos(path: Built, ship: string, t: number): number[] {
  const out = [0, 0, 0];
  assert.ok(path.position(ship, t, 1, out));
  return out;
}

/** Selenographic latitude and longitude under a position (true scale), degrees. */
function overMoon(p: number[]): GroundPoint {
  const x = p[0]! - EARTH_MOON_DISTANCE;
  return { latitude: Math.atan2(p[1]!, Math.hypot(x, p[2]!)) / DEG, longitude: Math.atan2(p[2]!, -x) / DEG };
}

const seconds = (e: ElapsedTime) => elapsedToSeconds(e);
const LANDING = seconds("102:45:39.9");
const PDI = seconds("102:33:05.01");

describe("Lunar orbits over a site far from the equator", () => {
  const inclined = plan(true);
  const path = buildFlightPath(inclined);
  const equatorial = buildFlightPath(plan(false));

  it("builds into a sound path", () => {
    const problems = pathProblems(inclined, path);
    assert.equal(problems.length, 0, problems.slice(0, 8).join("\n"));
  });

  it("passes the main ship over the site near the landing time", () => {
    // The plane through the command module's position and velocity, in Moon-fixed axes.
    const a = pos(path, "csm", LANDING - 1);
    const b = pos(path, "csm", LANDING + 1);
    const c = [EARTH_MOON_DISTANCE, 0, 0];
    const r = [a[0]! - c[0]!, a[1]!, a[2]!];
    const v = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!];
    const n = [r[1]! * v[2]! - r[2]! * v[1]!, r[2]! * v[0]! - r[0]! * v[2]!, r[0]! * v[1]! - r[1]! * v[0]!];
    const len = Math.hypot(...n);
    const lat = LATITUDE * DEG;
    const lon = LONGITUDE * DEG;
    const site = [-Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
    const off = Math.asin(Math.abs(site[0]! * n[0]! + site[1]! * n[1]! + site[2]! * n[2]!) / len) / DEG;
    assert.ok(off < 0.5, `the site is ${off.toFixed(2)} degrees from the orbit plane at landing`);
    // Inclined about as far as the site is from the equator.
    const inclination = Math.acos(Math.abs(n[1]!) / len) / DEG;
    assert.ok(Math.abs(inclination - LATITUDE) < 0.3, `inclination ${inclination.toFixed(2)} degrees`);
  });

  it("starts the descent along the orbit's own track, not from the equator", () => {
    const start = overMoon(pos(path, "lm", PDI));
    assert.ok(Math.abs(start.latitude - LATITUDE) < 2, `powered descent starts at ${start.latitude.toFixed(2)} N`);
    // Drawn over the equator, the same descent has to swing 26 degrees sideways.
    assert.ok(Math.abs(overMoon(pos(equatorial, "lm", PDI)).latitude) < 2);
  });

  it("keeps the published burn longitudes", () => {
    let count = 0;
    for (const ship of inclined.ships) {
      for (const phase of ship.phases) {
        if (phase.kind !== "orbit" || phase.body !== "moon") continue;
        const checks: [ElapsedTime, number][] = [];
        if (phase.startFix) checks.push([phase.start.value, phase.startFix.longitude.value]);
        if (phase.endFix) checks.push([phase.end.value, phase.endFix.longitude.value]);
        for (const [elapsed, longitude] of checks) {
          const got = overMoon(pos(path, ship.id, seconds(elapsed))).longitude;
          const diff = ((got - longitude + 540) % 360) - 180;
          assert.ok(Math.abs(diff) < 1e-6, `${ship.id} at ${elapsed}: longitude ${got.toFixed(4)}, published ${longitude}`);
          count++;
        }
      }
    }
    assert.ok(count > 10);
  });
});

describe("Lunar orbits tilted through a published point, on a flight that never lands", () => {
  /** Apollo 11's command module alone, its orbits drawn through an invented point 11.66 degrees south. */
  function orbitOnly(withTime: boolean): FlightPlan {
    const copy = structuredClone(apollo11) as FlightPlan;
    copy.ships = [copy.ships.find((s) => s.id === "csm")!];
    copy.lunarOrbitPlane = { site: { latitude: fake(-11.66), longitude: fake(169.16) } };
    if (withTime) copy.lunarOrbitPlane.time = fake("080:11:53.63" as ElapsedTime);
    return copy;
  }
  const flight = orbitOnly(true);
  const path = buildFlightPath(flight);
  const t = seconds("080:11:53.63");

  it("builds into a sound path", () => {
    const problems = pathProblems(flight, path);
    assert.equal(problems.length, 0, problems.slice(0, 8).join("\n"));
  });

  it("passes through the point at its time: the lunar fix there lands on it", () => {
    // Circularization cutoff: the published longitude, 169.16 E, at this time.
    const at = overMoon(pos(path, "csm", t));
    assert.ok(Math.abs(at.latitude + 11.66) < 1e-6 && Math.abs(at.longitude - 169.16) < 1e-6, `at ${at.latitude}, ${at.longitude}`);
  });

  it("is inclined just enough to reach it (the default heading)", () => {
    const a = pos(path, "csm", t);
    const b = pos(path, "csm", t + 2);
    const r = [a[0]! - EARTH_MOON_DISTANCE, a[1]!, a[2]!];
    const v = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!];
    const n = [r[1]! * v[2]! - r[2]! * v[1]!, r[2]! * v[0]! - r[0]! * v[2]!, r[0]! * v[1]! - r[1]! * v[0]!];
    const inclination = Math.acos(Math.abs(n[1]!) / Math.hypot(...n)) / DEG;
    assert.ok(Math.abs(inclination - 11.66) < 0.05, `inclination ${inclination.toFixed(3)}`);
  });

  it("needs a time when there is no stay on the surface", () => {
    assert.throws(() => buildFlightPath(orbitOnly(false)), /needs a time/);
  });
});
