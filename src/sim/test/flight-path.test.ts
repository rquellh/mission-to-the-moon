/**
 * Tests for the flight-path model, run with `npm test` (Node's built-in
 * test runner; Node 24 runs TypeScript directly).
 */
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { flight as apollo11Flight } from "../../content/missions/apollo-11/flight.ts";
import {
  EARTH_AXIAL_TILT_RAD,
  EARTH_EQUATORIAL_RADIUS_KM,
  EARTH_FLATTENING,
  EARTH_MEAN_RADIUS_KM,
  EARTH_MOON_DISTANCE,
  MOON_RADIUS,
  NAUTICAL_MILE_KM,
} from "../../content/physical-constants.ts";
import { elapsedToSeconds, type ElapsedTime } from "../../content/types.ts";
import { buildFlightPath } from "../build.ts";
import { AnchoredOrbit } from "../segments.ts";
import type { OrbitPhase, Phase } from "../types.ts";

const path = buildFlightPath(apollo11Flight);
const DEG = Math.PI / 180;
const MIXES = [0, 0.37, 1];

function seconds(elapsed: ElapsedTime): number {
  return elapsedToSeconds(elapsed);
}

function pos(ship: string, t: number, mix: number): number[] {
  const out = [0, 0, 0];
  assert.ok(path.position(ship, t, mix, out), `${ship} should exist at ${t}`);
  return out;
}

function dist(a: number[], b: number[]): number {
  return Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
}

/** Rotation about +Y, three.js convention (+X toward -Z for positive angles). */
function rotY(v: number[], a: number): number[] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0]! * c + v[2]! * s, v[1]!, -v[0]! * s + v[2]! * c];
}

function rotX(v: number[], a: number): number[] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0]!, v[1]! * c - v[2]! * s, v[1]! * s + v[2]! * c];
}

/**
 * Where a point on Earth's surface appears in the scene at time t, built
 * only from the documented scene convention: globe texture longitude 0 on
 * local +X, east toward -Z; globe rotation.y = earthSpinAngle(t); tilt group
 * rotation (x = -tilt, y = earthAxisAngle(t), order "YXZ").
 */
function earthSurfacePoint(latDeg: number, lonDeg: number, t: number): number[] {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  const local = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon)];
  const spun = rotY(local, path.earthSpinAngle(t));
  const tilted = rotX(spun, -EARTH_AXIAL_TILT_RAD);
  return rotY(tilted, path.earthAxisAngle(t));
}

/** Geodetic (map) latitude for a geocentric one, degrees. */
function geodetic(latDeg: number): number {
  const k = (1 - EARTH_FLATTENING) ** 2;
  return Math.atan(Math.tan(latDeg * DEG) / k) / DEG;
}

/** A point on the Moon's surface relative to its center, per src/scene/moon.ts. */
function moonSurfaceOffset(latDeg: number, lonDeg: number): number[] {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  return [-Math.cos(lat) * Math.cos(lon) * MOON_RADIUS, Math.sin(lat) * MOON_RADIUS, Math.cos(lat) * Math.sin(lon) * MOON_RADIUS];
}

function moonCenter(mix: number): number[] {
  const out = [0, 0, 0];
  path.moonPosition(mix, out);
  return out;
}

const csmPlan = apollo11Flight.ships.find((s) => s.id === "csm")!;
const lmPlan = apollo11Flight.ships.find((s) => s.id === "lm")!;

describe("phase timing", () => {
  it("every phase starts and ends at its flight-plan time", () => {
    for (const ship of apollo11Flight.ships) {
      const track = path.ships.find((s) => s.id === ship.id)!;
      assert.equal(track.start, seconds(ship.phases[0].start.value));
      assert.equal(track.end, seconds(ship.phases[ship.phases.length - 1]!.end.value));
      ship.phases.forEach((phase, i) => {
        const t0 = seconds(phase.start.value);
        const t1 = seconds(phase.end.value);
        assert.equal(path.phaseAt(ship.id, t0), phase, `${ship.id} ${phase.label} starts at ${phase.start.value}`);
        assert.equal(path.phaseAt(ship.id, t1 - 1e-3), phase, `${ship.id} ${phase.label} runs to ${phase.end.value}`);
        if (i > 0) assert.equal(t0, seconds(ship.phases[i - 1]!.end.value), `${ship.id} ${phase.label} follows on`);
      });
    }
  });

  it("matches the published mission start and end", () => {
    assert.equal(path.start, seconds("000:00:00.63"));
    assert.equal(path.end, seconds("195:18:35"));
  });

  it("reports nothing when a ship does not exist", () => {
    const out = [7, 7, 7];
    assert.equal(path.position("lm", seconds("050:00:00"), 1, out), false);
    assert.equal(path.position("lm", seconds("131:00:00"), 1, out), false);
    assert.equal(path.position("csm", -10, 1, out), false);
    assert.equal(path.position("nope", 1000, 1, out), false);
    assert.deepEqual(out, [7, 7, 7]);
    assert.equal(path.phaseAt("lm", seconds("050:00:00")), undefined);
  });
});

describe("continuity", () => {
  it("position is continuous across every phase boundary, at every scale", () => {
    const d = 1e-3;
    for (const ship of apollo11Flight.ships) {
      for (const phase of ship.phases.slice(1)) {
        const t = seconds(phase.start.value);
        for (const mix of MIXES) {
          const gap = dist(pos(ship.id, t - d, mix), pos(ship.id, t + d, mix));
          assert.ok(gap < 1e-4, `${ship.id} jumps ${gap} Earth radii at ${phase.start.value} (${phase.label}), mix ${mix}`);
        }
      }
    }
  });

  it("velocity is continuous across boundaries where no engine starts or stops", () => {
    const smooth = (prev: Phase, next: Phase): boolean =>
      prev.kind !== "burn" && next.kind !== "burn" && prev.kind !== "surface" && next.kind !== "surface" && next.kind !== "entry";
    for (const ship of apollo11Flight.ships) {
      ship.phases.forEach((phase, i) => {
        if (i === 0 || !smooth(ship.phases[i - 1]!, phase)) return;
        const t = seconds(phase.start.value);
        const h = 2;
        const a = pos(ship.id, t - h, 1);
        const b = pos(ship.id, t, 1);
        const c = pos(ship.id, t + h, 1);
        const v1 = [0, 1, 2].map((k) => (b[k]! - a[k]!) / h);
        const v2 = [0, 1, 2].map((k) => (c[k]! - b[k]!) / h);
        const jump = dist(v1, v2) / Math.max(Math.hypot(...v1), 1e-9);
        assert.ok(jump < 0.02, `${ship.id} velocity changes by ${(jump * 100).toFixed(2)}% at ${phase.start.value} (${phase.label})`);
      });
    }
  });
});

describe("published places", () => {
  it("the spacecraft is at the launch site at liftoff, on the spinning Earth", () => {
    const ascent = csmPlan.phases[0] as Extract<Phase, { kind: "ascent" }>;
    const t = seconds(ascent.start.value);
    const site = earthSurfacePoint(geodetic(ascent.site.latitude.value), ascent.site.longitude.value, t);
    for (const mix of MIXES) {
      const p = pos("csm", t, mix);
      assert.ok(dist(p, site) < 1e-9, `launch site off by ${dist(p, site)} at mix ${mix}`);
    }
  });

  it("the lunar module sits on the landing site from landing to liftoff", () => {
    const surface = lmPlan.phases.find((p) => p.kind === "surface") as Extract<Phase, { kind: "surface" }>;
    const t0 = seconds(surface.start.value);
    const t1 = seconds(surface.end.value);
    const offset = moonSurfaceOffset(surface.site.latitude.value, surface.site.longitude.value);
    for (let k = 0; k <= 20; k++) {
      const t = t0 + ((t1 - t0) * k) / 20;
      for (const mix of MIXES) {
        const c = moonCenter(mix);
        const expected = [c[0]! + offset[0]!, c[1]! + offset[1]!, c[2]! + offset[2]!];
        const p = pos("lm", t, mix);
        assert.ok(dist(p, expected) < 1e-9, `LM off the site by ${dist(p, expected)} at ${t}, mix ${mix}`);
      }
    }
    // The landing time is the published one.
    assert.equal(t0, seconds("102:45:39.9"));
    assert.equal(t1, seconds("124:22:00.79"));
  });

  it("the spacecraft splashes down at the published point, on the spinning Earth", () => {
    const entry = csmPlan.phases[csmPlan.phases.length - 1] as Extract<Phase, { kind: "entry" }>;
    const t = seconds(entry.end.value);
    const splash = earthSurfacePoint(entry.splashdown.latitude.value, entry.splashdown.longitude.value, t);
    for (const mix of MIXES) {
      const p = pos("csm", t, mix);
      assert.ok(dist(p, splash) < 1e-9, `splashdown off by ${dist(p, splash)} at mix ${mix}`);
    }
  });

  it("the Earth spin convention puts the Moon over the published sub-lunar longitude", () => {
    for (const sample of apollo11Flight.sky) {
      const t = seconds(sample.time.value);
      // Find the Earth longitude under +X (the Moon) by inverting the convention.
      let v = rotY([1, 0, 0], -path.earthAxisAngle(t));
      v = rotX(v, EARTH_AXIAL_TILT_RAD);
      v = rotY(v, -path.earthSpinAngle(t));
      const lon = Math.atan2(-v[2]!, v[0]!) / DEG;
      const diff = ((lon - sample.subLunarLongitude.value + 540) % 360) - 180;
      assert.ok(Math.abs(diff) < 3, `sub-lunar longitude off by ${diff.toFixed(2)} degrees at ${sample.time.value}`);
    }
  });

  it("burns happen over the published longitudes (Mission Report Table 7-II)", () => {
    const checks: [string, string, number][] = [];
    for (const ship of apollo11Flight.ships) {
      for (const phase of ship.phases) {
        if (phase.kind !== "orbit" || phase.body !== "moon") continue;
        if (phase.startFix) checks.push([ship.id, phase.start.value, phase.startFix.longitude.value]);
        if (phase.endFix) checks.push([ship.id, phase.end.value, phase.endFix.longitude.value]);
      }
    }
    assert.ok(checks.length > 10);
    for (const [ship, elapsed, lonDeg] of checks) {
      const p = pos(ship, seconds(elapsed as ElapsedTime), 1);
      const lon = Math.atan2(p[2]!, -(p[0]! - EARTH_MOON_DISTANCE)) / DEG;
      const diff = ((lon - lonDeg + 540) % 360) - 180;
      assert.ok(Math.abs(diff) < 1e-6, `${ship} at ${elapsed}: longitude ${lon.toFixed(3)}, published ${lonDeg}`);
    }
  });
});

describe("orbits", () => {
  it("orbit heights match the published apoapsis and periapsis at true scale", () => {
    const moonRef = apollo11Flight.moonReferenceRadius!.value * NAUTICAL_MILE_KM;
    for (const ship of apollo11Flight.ships) {
      ship.phases.forEach((phase, i) => {
        if (phase.kind !== "orbit") return;
        const orbit = phase as OrbitPhase;
        const ref = orbit.body === "earth" ? EARTH_EQUATORIAL_RADIUS_KM : moonRef;
        const cx = orbit.body === "earth" ? 0 : EARTH_MOON_DISTANCE;
        const t0 = seconds(orbit.start.value);
        const t1 = seconds(orbit.end.value);
        const n = 4000;
        let lo = Infinity;
        let hi = -Infinity;
        for (let k = 0; k <= n; k++) {
          const p = pos(ship.id, t0 + ((t1 - t0) * k) / n, 1);
          const h = (Math.hypot(p[0]! - cx, p[1]!, p[2]!) * EARTH_MEAN_RADIUS_KM - ref) / NAUTICAL_MILE_KM;
          lo = Math.min(lo, h);
          hi = Math.max(hi, h);
        }
        const tol = 0.01;
        const label = `${ship.id} ${orbit.label}`;
        assert.ok(lo >= orbit.periapsis.value - tol, `${label}: lowest ${lo.toFixed(3)} below periapsis ${orbit.periapsis.value}`);
        assert.ok(hi <= orbit.apoapsis.value + tol, `${label}: highest ${hi.toFixed(3)} above apoapsis ${orbit.apoapsis.value}`);
        const seg = path.report.segment(ship.id, i) as AnchoredOrbit;
        if (t1 - t0 >= seg.conic.period) {
          assert.ok(Math.abs(lo - orbit.periapsis.value) < tol, `${label}: periapsis ${lo.toFixed(3)} vs ${orbit.periapsis.value}`);
          assert.ok(Math.abs(hi - orbit.apoapsis.value) < tol, `${label}: apoapsis ${hi.toFixed(3)} vs ${orbit.apoapsis.value}`);
        }
      });
    }
  });

  it("orbital periods follow from orbit size (phase corrections stay under 1% of the rate)", () => {
    for (const ship of apollo11Flight.ships) {
      ship.phases.forEach((phase, i) => {
        if (phase.kind !== "orbit") return;
        const seg = path.report.segment(ship.id, i) as AnchoredOrbit;
        const rate = Math.abs(seg.phaseCorrection) / (seg.conic.n * (seg.t1 - seg.t0));
        assert.ok(rate < 0.01, `${ship.id} ${phase.label}: corrected by ${(rate * 100).toFixed(2)}% of its rate`);
      });
    }
  });

  it("the parking orbit has the published inclination to Earth's equator", () => {
    const seg = path.report.segment("csm", 1) as AnchoredOrbit;
    const pole = path.report.sky.earthPoleInertial([0, 0, 0]);
    const n = seg.conic.normal;
    const inclination = Math.acos(n[0] * pole[0] + n[1] * pole[1] + n[2] * pole[2]) / DEG;
    const published = (csmPlan.phases[1] as OrbitPhase).inclination!.value;
    assert.ok(Math.abs(inclination - published) < 0.1, `inclination ${inclination.toFixed(3)} vs ${published}`);
  });

  it("lunar orbits run east to west (retrograde), and the coasts west to east around Earth", () => {
    const t = seconds("090:00:00");
    const a = pos("csm", t, 1);
    const b = pos("csm", t + 10, 1);
    const r = [a[0]! - EARTH_MOON_DISTANCE, a[1]!, a[2]!];
    const v = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!];
    const hy = r[2]! * v[0]! - r[0]! * v[2]!; // y component of r x v
    assert.ok(hy < 0, "lunar orbit should turn clockwise seen from +Y");
  });

  it("the coast to the Moon is fast near Earth and slow far out, matching published distances", () => {
    // Published altitudes during the coasts (Apollo by the Numbers).
    const checks: [ElapsedTime, number][] = [
      ["003:15:23.0", 3815.19],
      ["004:40:01.72", 16_620.8],
      ["026:44:58.64", 109_475.3],
      ["150:29:57.4", 169_087.2],
    ];
    for (const [elapsed, altitudeNm] of checks) {
      const p = pos("csm", seconds(elapsed), 1);
      const alt = (Math.hypot(p[0]!, p[1]!, p[2]!) * EARTH_MEAN_RADIUS_KM - EARTH_MEAN_RADIUS_KM) / NAUTICAL_MILE_KM;
      const err = Math.abs(alt - altitudeNm) / altitudeNm;
      assert.ok(err < 0.03, `${elapsed}: ${alt.toFixed(0)} n mi vs published ${altitudeNm} (${(err * 100).toFixed(1)}%)`);
    }
  });
});

describe("two ships", () => {
  it("coincide at undocking and docking, and while docked", () => {
    const undock = seconds("100:12:00");
    const dock = seconds("128:03:00.0");
    const jettison = seconds("130:09:31.2");
    for (const t of [undock, dock, (dock + jettison) / 2, jettison]) {
      for (const mix of MIXES) {
        const d = dist(pos("csm", t, mix), pos("lm", t, mix));
        assert.ok(d < 1e-9, `ships ${d} apart at ${t}, mix ${mix}`);
      }
    }
  });

  it("separate between undocking and docking, with the main ship still in orbit", () => {
    const t = seconds("110:00:00");
    const csm = pos("csm", t, 1);
    const lm = pos("lm", t, 1);
    const c = moonCenter(1);
    const csmAlt = (dist(csm, c) - MOON_RADIUS) * EARTH_MEAN_RADIUS_KM / NAUTICAL_MILE_KM;
    assert.ok(csmAlt > 50 && csmAlt < 70, `CSM altitude ${csmAlt}`);
    assert.ok(dist(lm, c) - MOON_RADIUS < 1e-9, "LM on the surface");
  });
});

describe("directions and drawing", () => {
  it("direction of travel is a unit vector; on the surface it points up", () => {
    const out = [0, 0, 0];
    for (const t of [seconds("000:00:00.63"), seconds("000:05:00"), seconds("050:00:00"), seconds("195:10:00")]) {
      for (const mix of MIXES) {
        assert.ok(path.direction("csm", t, mix, out));
        assert.ok(Math.abs(Math.hypot(...out) - 1) < 1e-9);
      }
    }
    const t = seconds("110:00:00");
    assert.ok(path.direction("lm", t, 1, out));
    const p = pos("lm", t, 1);
    const c = moonCenter(1);
    const up = [p[0]! - c[0]!, p[1]! - c[1]!, p[2]! - c[2]!].map((x) => x / MOON_RADIUS);
    assert.ok(dist(out, up) < 1e-9);
    // The launch vehicle climbs at liftoff (relative to the ground).
    path.direction("csm", seconds("000:00:10"), 1, out);
    const lp = pos("csm", seconds("000:00:10"), 1);
    const radial = (out[0]! * lp[0]! + out[1]! * lp[1]! + out[2]! * lp[2]!) / Math.hypot(...lp);
    assert.ok(radial > 0.9, `liftoff direction should be mostly up, got ${radial}`);
  });

  it("polylines carry times and both scales on the same samples", () => {
    for (const ship of path.ships) {
      const line = path.polyline(ship.id)!;
      const n = line.times.length;
      assert.ok(n > 100);
      assert.equal(line.truePositions.length, 3 * n);
      assert.equal(line.readablePositions.length, 3 * n);
      assert.equal(line.times[0], ship.start);
      assert.equal(line.times[n - 1], ship.end);
      for (let i = 1; i < n; i++) assert.ok(line.times[i]! > line.times[i - 1]!);
      for (const phase of ship.phases) {
        const t = seconds(phase.start.value);
        assert.ok(line.times.includes(t), `${ship.id} polyline includes ${phase.start.value}`);
      }
      for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 50))) {
        const t = line.times[i]!;
        const p1 = pos(ship.id, t, 1);
        const p0 = pos(ship.id, t, 0);
        assert.ok(dist(p1, Array.from(line.truePositions.subarray(3 * i, 3 * i + 3))) < 1e-5);
        assert.ok(dist(p0, Array.from(line.readablePositions.subarray(3 * i, 3 * i + 3))) < 1e-5);
      }
    }
  });

  it("samples tight curves densely: the parking orbit gets dozens of points per turn", () => {
    const line = path.polyline("csm")!;
    const t0 = seconds("000:11:49.33");
    const t1 = seconds("002:44:16.20");
    let count = 0;
    for (const t of line.times) if (t >= t0 && t <= t1) count++;
    const turns = (t1 - t0) / (88.18 * 60);
    assert.ok(count / turns > 40, `${(count / turns).toFixed(1)} samples per turn`);
  });
});

describe("sun", () => {
  it("lights the launch site at liftoff (Apollo 11 launched in the morning)", () => {
    const t = seconds("000:00:00.63");
    const site = earthSurfacePoint(geodetic(28.447), -80.6041, t);
    const sun = [0, 0, 0];
    path.sunDirection(t, sun);
    const cosZenith = site[0]! * sun[0]! + site[1]! * sun[1]! + site[2]! * sun[2]!;
    assert.ok(cosZenith > 0.2, `Sun elevation at the Cape: ${(Math.asin(cosZenith) / DEG).toFixed(1)} degrees`);
  });
});
