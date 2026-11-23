/**
 * A lunar module's orbit right after liftoff from the Moon, when no source
 * gives where it reached orbit: the engine places the insertion itself.
 * Fixtures are Apollo 11's plan with the published insertion fix removed
 * (and, for one case, the landing site moved north with the orbits over it;
 * that value is invented and its citation says so).
 */
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { flight as apollo11 } from "../../content/missions/apollo-11/flight.ts";
import { EARTH_MEAN_RADIUS_KM, EARTH_MOON_DISTANCE, NAUTICAL_MILE_KM } from "../../content/physical-constants.ts";
import { type Cited } from "../../content/types.ts";
import { buildFlightPath } from "../build.ts";
import type { AnchoredOrbit } from "../segments.ts";
import type { FlightPlan, OrbitPhase, Phase } from "../types.ts";
import { pathProblems } from "./path-checks.ts";

function fake<T>(value: T): Cited<T> {
  return { value, citations: [{ source: "gemini-chronology", locator: "TEST FIXTURE: invented value, not from this source" }] };
}

const DEG = Math.PI / 180;
/** The lunar module's "Catching up" orbit, right after its lunar ascent. */
const lm = apollo11.ships.find((s) => s.id === "lm")!;
const K = lm.phases.findIndex((p) => p.label === "Catching up");
const PUBLISHED = lm.phases[K] as OrbitPhase;

/** Apollo 11 with the insertion fix (and optionally the end fix) of the orbit after liftoff removed. */
function plan(options: { endFix: boolean; north?: boolean }): FlightPlan {
  const copy = structuredClone(apollo11) as FlightPlan;
  const ship = copy.ships.find((s) => s.id === "lm")!;
  const orbit = { ...(ship.phases[K] as OrbitPhase) };
  delete orbit.startFix;
  if (!options.endFix) delete orbit.endFix;
  const phases = [...ship.phases] as Phase[];
  phases[K] = orbit;
  if (options.north) {
    const site = { latitude: fake(26.1), longitude: fake(23.47314) };
    for (let k = 0; k < phases.length; k++) {
      const p = phases[k]!;
      if (p.kind === "descent" || p.kind === "surface" || (p.kind === "ascent" && p.body === "moon")) phases[k] = { ...p, site };
    }
    copy.lunarOrbitPlane = { site };
  }
  ship.phases = phases as [Phase, ...Phase[]];
  return copy;
}

type Built = ReturnType<typeof buildFlightPath>;

/** Where the lander's orbit after liftoff begins (east longitude, degrees; height, n mi), and how much its rate was corrected (a fraction). */
interface Insertion {
  longitude: number;
  heightNm: number;
  correction: number;
}

function insertion(path: Built): Insertion {
  const seg = path.report.segment("lm", K) as AnchoredOrbit;
  const p = [0, 0, 0];
  path.position("lm", seg.t0, 1, p);
  const x = p[0]! - EARTH_MOON_DISTANCE;
  const r = Math.hypot(x, p[1]!, p[2]!) * EARTH_MEAN_RADIUS_KM;
  return {
    longitude: Math.atan2(p[2]!, -x) / DEG,
    heightNm: (r - apollo11.moonReferenceRadius!.value * NAUTICAL_MILE_KM) / NAUTICAL_MILE_KM,
    correction: Math.abs(seg.phaseCorrection) / (seg.conic.n * (seg.t1 - seg.t0)),
  };
}

describe("Lunar orbit after liftoff with no published insertion fix", () => {
  it("builds, and reaches the published end fix with no correction, starting at the orbit's low point", () => {
    const flight = plan({ endFix: true });
    const path = buildFlightPath(flight);
    const problems = pathProblems(flight, path);
    assert.equal(problems.length, 0, problems.slice(0, 5).join("\n"));
    const got = insertion(path);
    assert.ok(got.correction < 1e-4, `corrected by ${(got.correction * 100).toFixed(4)}% of its rate`);
    assert.ok(Math.abs(got.heightNm - PUBLISHED.periapsis.value) < 0.05, `inserted ${got.heightNm.toFixed(2)} n mi up`);
    // Published (not used here): 12.99 E. Placed: about 14.2 E, downrange (west) of the site at 23.47 E.
    assert.ok(Math.abs(got.longitude - 12.99) < 2, `inserted over ${got.longitude.toFixed(2)} E`);
  });

  it("with no end fix either, places insertion an illustrative distance downrange", () => {
    const flight = plan({ endFix: false });
    const path = buildFlightPath(flight);
    assert.equal(pathProblems(flight, path).length, 0);
    const got = insertion(path);
    assert.ok(Math.abs(got.longitude - 12.99) < 0.5, `inserted over ${got.longitude.toFixed(2)} E`);
  });

  it("over a site far from the equator, in the inclined plane", () => {
    const flight = plan({ endFix: true, north: true });
    const path = buildFlightPath(flight);
    const problems = pathProblems(flight, path);
    assert.equal(problems.length, 0, problems.slice(0, 5).join("\n"));
    assert.ok(insertion(path).correction < 1e-4);
  });

  it("keeps a published insertion fix when there is one", () => {
    const got = insertion(buildFlightPath(apollo11));
    assert.ok(Math.abs(got.longitude - PUBLISHED.startFix!.longitude.value) < 1e-6, `inserted over ${got.longitude}`);
  });
});
