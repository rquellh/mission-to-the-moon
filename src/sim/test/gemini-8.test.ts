/**
 * Tests for the Gemini VIII flight path: two ships in Earth orbit, a
 * target launched before the mission clock starts, a rendezvous and
 * docking, an early return, and a comparison with published values the
 * plan does not use as inputs. Page and table numbers refer to the Gemini
 * VIII Mission Report (MSC-G-R-66-4).
 */
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { flight as gemini8Flight } from "../../content/missions/gemini-8/flight.ts";
import {
  EARTH_AXIAL_TILT_RAD,
  EARTH_EQUATORIAL_RADIUS_KM,
  EARTH_MEAN_RADIUS_KM,
  FOOT_KM,
  NAUTICAL_MILE_KM,
} from "../../content/physical-constants.ts";
import { elapsedToSeconds, type ElapsedTime } from "../../content/types.ts";
import { buildFlightPath } from "../build.ts";
import type { GroundPoint } from "../frames.ts";
import { AnchoredOrbit, bodyInertialState, Converge, type Segment } from "../segments.ts";
import type { AscentPhase, EntryPhase, OrbitPhase, Phase, ShipPlan, SurfacePhase } from "../types.ts";
import { readableRadius, EARTH_LIFT } from "../warp.ts";

const path = buildFlightPath(gemini8Flight);
const DEG = Math.PI / 180;
const MIXES = [0, 0.37, 1];
const NM_PER_RE = EARTH_MEAN_RADIUS_KM / NAUTICAL_MILE_KM;

const gemini = gemini8Flight.ships.find((s) => s.id === "gemini")!;
const agena = gemini8Flight.ships.find((s) => s.id === "agena")!;

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

function dot(a: readonly number[], b: readonly number[]): number {
  return a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
}

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

/** A point on Earth's drawn surface in the scene at t, from the documented globe convention. */
function earthSurfacePoint(latDeg: number, lonDeg: number, t: number): number[] {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  const local = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon)];
  return rotY(rotX(rotY(local, path.earthSpinAngle(t)), -EARTH_AXIAL_TILT_RAD), path.earthAxisAngle(t));
}

/** Geocentric latitude and east longitude, degrees, under a scene position at t. */
function groundPoint(p: number[], t: number): GroundPoint {
  let v = rotY(p, -path.earthAxisAngle(t));
  v = rotX(v, EARTH_AXIAL_TILT_RAD);
  v = rotY(v, -path.earthSpinAngle(t));
  return {
    latitude: Math.atan2(v[1]!, Math.hypot(v[0]!, v[2]!)) / DEG,
    longitude: Math.atan2(-v[2]!, v[0]!) / DEG,
  };
}

/** Angle between two ground points, degrees. */
function groundAngle(a: GroundPoint, b: GroundPoint): number {
  const u = (g: GroundPoint) => [
    Math.cos(g.latitude * DEG) * Math.cos(g.longitude * DEG),
    Math.cos(g.latitude * DEG) * Math.sin(g.longitude * DEG),
    Math.sin(g.latitude * DEG),
  ];
  return Math.acos(Math.min(1, dot(u(a), u(b)))) / DEG;
}

function phaseIndex(ship: ShipPlan, label: string): number {
  const i = ship.phases.findIndex((p) => p.label === label);
  assert.ok(i >= 0, `no phase "${label}"`);
  return i;
}

/** The orbit a phase moves on (a rendezvous phase's own orbit). */
function orbitOf(shipId: string, i: number): AnchoredOrbit {
  let seg: Segment = path.report.segment(shipId, i);
  if (seg instanceof Converge) seg = seg.own;
  assert.ok(seg instanceof AnchoredOrbit);
  return seg;
}

/** Distance between the two ships at t, nautical miles (true scale). */
function range(t: number): number {
  return dist(pos("gemini", t, 1), pos("agena", t, 1)) * NM_PER_RE;
}

/* ------------------------------------------------------------------ */

describe("Gemini VIII: building and timing", () => {
  it("has the crew's spacecraft first and the Agena target second, with their roles", () => {
    assert.deepEqual(
      path.ships.map((s) => [s.id, s.role]),
      [
        ["gemini", "main"],
        ["agena", "target"],
      ],
    );
  });

  it("every phase starts and ends at its flight-plan time", () => {
    for (const ship of gemini8Flight.ships) {
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

  it("starts before the mission clock, at the Agena's lift-off (16:41:02.389 minus 15:00:03.127 G.m.t.)", () => {
    const gmt = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;
    const lead = gmt(16, 41, 2.389) - gmt(15, 0, 3.127);
    assert.ok(Math.abs(path.start + lead) < 1e-6, `path starts at ${path.start}, expected ${-lead}`);
    assert.ok(path.start < 0);
    assert.equal(path.start, seconds("-001:40:59.262"));
  });

  it("the Agena exists before time zero and the spacecraft does not", () => {
    const out = [7, 7, 7];
    for (const t of [path.start, -3600, -1]) {
      assert.ok(path.position("agena", t, 1, out), `Agena at ${t}`);
      assert.equal(path.position("gemini", t, 1, [0, 0, 0]), false, `no spacecraft at ${t}`);
    }
    assert.equal(path.position("agena", path.start - 1, 1, [0, 0, 0]), false);
    assert.equal(path.phaseAt("gemini", -1), undefined);
  });

  it("both ships last until the crew boards the recovery ship, the end of the story", () => {
    assert.equal(path.end, seconds("013:47:00"));
    for (const ship of path.ships) assert.equal(ship.end, path.end);
    assert.ok(path.position("agena", path.end, 1, [0, 0, 0]));
    assert.equal(path.phaseAt("agena", path.end)?.kind, "orbit");
    assert.equal(path.phaseAt("gemini", path.end)?.kind, "surface");
  });

  it("the mission clock matches the published landing time in G.m.t. (NSSDCA: 1966-03-17 03:22:28)", () => {
    const landing = seconds("010:41:26");
    const liftoffGmt = 16 * 3600 + 41 * 60 + 2.389;
    const landingGmt = (liftoffGmt + landing) % 86_400;
    assert.ok(Math.abs(landingGmt - (3 * 3600 + 22 * 60 + 28)) < 1, `landing at ${landingGmt} s after midnight`);
  });
});

describe("Gemini VIII: continuity", () => {
  it("position is continuous across every phase boundary, at every scale", () => {
    const d = 1e-3;
    for (const ship of gemini8Flight.ships) {
      for (const phase of ship.phases.slice(1)) {
        const t = seconds(phase.start.value);
        for (const mix of MIXES) {
          const gap = dist(pos(ship.id, t - d, mix), pos(ship.id, t + d, mix));
          assert.ok(gap < 1e-4, `${ship.id} jumps ${gap} Earth radii at ${phase.start.value} (${phase.label}), mix ${mix}`);
        }
      }
    }
  });

  it("velocity is continuous where no engine or separation thrust starts or stops", () => {
    // Undocking used a separation thrust, burns change the orbit, and entry
    // and splashdown are not orbits.
    const smooth = (prev: Phase, next: Phase): boolean =>
      ![prev.kind, next.kind].some((k) => k === "burn" || k === "surface" || k === "entry") && prev.kind !== "docked";
    for (const ship of gemini8Flight.ships) {
      ship.phases.forEach((phase, i) => {
        if (i === 0 || !smooth(ship.phases[i - 1]!, phase)) return;
        const t = seconds(phase.start.value);
        const h = 2;
        const a = pos(ship.id, t - h, 1);
        const b = pos(ship.id, t, 1);
        const c = pos(ship.id, t + h, 1);
        const v1 = [0, 1, 2].map((k) => (b[k]! - a[k]!) / h);
        const v2 = [0, 1, 2].map((k) => (c[k]! - b[k]!) / h);
        const jump = dist(v1, v2) / Math.hypot(...v1);
        assert.ok(jump < 0.02, `${ship.id} velocity changes by ${(jump * 100).toFixed(2)}% at ${phase.start.value} (${phase.label})`);
      });
    }
  });

  it("polylines carry times and both scales, starting before time zero for the Agena", () => {
    for (const ship of path.ships) {
      const line = path.polyline(ship.id)!;
      const n = line.times.length;
      assert.equal(line.times[0], ship.start);
      assert.equal(line.times[n - 1], ship.end);
      for (let i = 1; i < n; i++) assert.ok(line.times[i]! > line.times[i - 1]!);
      for (const phase of ship.phases) assert.ok(line.times.includes(seconds(phase.start.value)));
    }
    assert.ok(path.polyline("agena")!.times[0]! < 0);
  });
});

describe("Gemini VIII: published places and times", () => {
  it("each launch pad is under its ship at lift-off, on the spinning Earth", () => {
    for (const ship of gemini8Flight.ships) {
      const ascent = ship.phases[0] as AscentPhase;
      const t = seconds(ascent.start.value);
      const site = earthSurfacePoint(ascent.site.latitude.value, ascent.site.longitude.value, t);
      for (const mix of MIXES) {
        const p = pos(ship.id, t, mix);
        assert.ok(dist(p, site) < 1e-9, `${ship.id} launch site off by ${dist(p, site)} at mix ${mix}`);
      }
    }
  });

  it("the pad estimates follow from the printed BECO points, ranges, and flight azimuths", () => {
    // The plan's pads are our estimates (see its header): the point from
    // which a great circle at the flight azimuth reaches BECO after the
    // published range from the launch site.
    function estimate(lat: number, lon: number, rangeNm: number, azimuth: number): [number, number] {
      const destination = (bearing: number): [number, number] => {
        const p1 = lat * DEG;
        const d = (rangeNm / 60) * DEG;
        const b = bearing * DEG;
        const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
        const l2 = lon * DEG + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
        return [p2 / DEG, l2 / DEG];
      };
      const bearingTo = (from: [number, number]): number => {
        const p1 = from[0] * DEG;
        const p2 = lat * DEG;
        const dl = (lon - from[1]) * DEG;
        return Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) / DEG;
      };
      let lo = azimuth + 160;
      let hi = azimuth + 200;
      for (let k = 0; k < 80; k++) {
        const mid = (lo + hi) / 2;
        if (bearingTo(destination(mid)) > azimuth) hi = mid;
        else lo = mid;
      }
      return destination((lo + hi) / 2);
    }
    const checks: [ShipPlan, [number, number]][] = [
      [gemini, estimate(28.36, -79.61, 51.4, 99.9)],
      [agena, estimate(28.55, -79.74, 43.3, 84.36)],
    ];
    for (const [ship, [lat, lon]] of checks) {
      const site = (ship.phases[0] as AscentPhase).site;
      assert.ok(Math.abs(site.latitude.value - lat) <= 0.006, `${ship.id} pad latitude ${site.latitude.value} vs ${lat.toFixed(4)}`);
      assert.ok(Math.abs(site.longitude.value - lon) <= 0.006, `${ship.id} pad longitude ${site.longitude.value} vs ${lon.toFixed(4)}`);
    }
  });

  it("the two ships coincide from station keeping through docking to undocking, at every scale", () => {
    const alongside = seconds("005:55:00");
    const undock = seconds("007:15:12.3");
    for (let k = 0; k <= 40; k++) {
      const t = alongside + ((undock - alongside) * k) / 40;
      for (const mix of MIXES) {
        const d = dist(pos("gemini", t, mix), pos("agena", t, mix));
        assert.ok(d < 1e-9, `ships ${d} apart at ${t}, mix ${mix}`);
      }
    }
    assert.equal(path.phaseAt("gemini", seconds("006:00:00"))?.kind, "rendezvous");
    assert.equal(path.phaseAt("gemini", seconds("007:00:26.7"))?.kind, "docked");
  });

  it("the spacecraft splashes down at the published point and time, and floats there until pickup", () => {
    const entry = gemini.phases.find((p) => p.kind === "entry") as EntryPhase;
    const surface = gemini.phases.find((p) => p.kind === "surface") as SurfacePhase;
    assert.equal(entry.end.value, "010:41:26");
    assert.equal(surface.body, "earth");
    const { latitude, longitude } = entry.splashdown;
    assert.ok(Math.abs(latitude.value - (25 + 12 / 60)) < 1e-12 && Math.abs(longitude.value - (136 + 5 / 60)) < 1e-12);
    const t0 = seconds(entry.end.value);
    const t1 = seconds(surface.end.value);
    for (let k = 0; k <= 10; k++) {
      const t = t0 + ((t1 - t0) * k) / 10;
      const splash = earthSurfacePoint(latitude.value, longitude.value, t);
      for (const mix of MIXES) {
        const p = pos("gemini", t, mix);
        assert.ok(dist(p, splash) < 1e-9, `off the splashdown point by ${dist(p, splash)} at ${t}, mix ${mix}`);
      }
    }
    // Floating, it points up.
    const out = [0, 0, 0];
    path.direction("gemini", seconds("012:00:00"), 1, out);
    const p = pos("gemini", seconds("012:00:00"), 1);
    assert.ok(dot(out, p) / Math.hypot(...p) > 0.999999);
  });

  it("retrofire and the 400,000-foot state are the published ones (Tables 5.1.5-VII and 5.1.5-VIII)", () => {
    const t = seconds("010:26:53.239");
    const p = pos("gemini", t, 1);
    const g = groundPoint(p, t);
    assert.ok(Math.abs(g.latitude - 28.82) < 0.01 && Math.abs(g.longitude - 102.99) < 0.01, `at ${g.latitude}, ${g.longitude}`);
    assert.equal(path.phaseAt("gemini", seconds("010:04:50"))?.label, "Retrofire");
  });

  it("the Earth spin puts the Moon over the published sub-lunar longitudes (JPL Horizons)", () => {
    for (const sample of gemini8Flight.sky) {
      const t = seconds(sample.time.value);
      const g = groundPoint([1, 0, 0], t);
      const diff = ((g.longitude - sample.subLunarLongitude.value + 540) % 360) - 180;
      assert.ok(Math.abs(diff) < 0.5, `sub-lunar longitude off by ${diff.toFixed(2)} degrees at ${sample.time.value}`);
    }
  });
});

describe("Gemini VIII: orbits", () => {
  it("orbit heights stay within the published apogee and perigee at true scale", () => {
    for (const ship of gemini8Flight.ships) {
      ship.phases.forEach((phase, i) => {
        if (phase.kind !== "orbit") return;
        const orbit = phase as OrbitPhase;
        const t0 = seconds(orbit.start.value);
        const t1 = seconds(orbit.end.value);
        let lo = Infinity;
        let hi = -Infinity;
        for (let k = 0; k <= 3000; k++) {
          const p = pos(ship.id, t0 + ((t1 - t0) * k) / 3000, 1);
          const h = (Math.hypot(...p) * EARTH_MEAN_RADIUS_KM - EARTH_EQUATORIAL_RADIUS_KM) / NAUTICAL_MILE_KM;
          lo = Math.min(lo, h);
          hi = Math.max(hi, h);
        }
        const tol = 0.01;
        const label = `${ship.id} ${orbit.label}`;
        assert.ok(lo >= orbit.periapsis.value - tol, `${label}: lowest ${lo.toFixed(3)} below perigee ${orbit.periapsis.value}`);
        assert.ok(hi <= orbit.apoapsis.value + tol, `${label}: highest ${hi.toFixed(3)} above apogee ${orbit.apoapsis.value}`);
        if (t1 - t0 >= orbitOf(ship.id, i).conic.period) {
          assert.ok(Math.abs(lo - orbit.periapsis.value) < 0.05, `${label}: perigee ${lo.toFixed(3)}`);
          assert.ok(Math.abs(hi - orbit.apoapsis.value) < 0.05, `${label}: apogee ${hi.toFixed(3)}`);
        }
      });
    }
  });

  it("phase corrections stay under 1% of the orbital rate", () => {
    for (const ship of gemini8Flight.ships) {
      ship.phases.forEach((phase, i) => {
        if (phase.kind !== "orbit") return;
        const seg = orbitOf(ship.id, i);
        const rate = Math.abs(seg.phaseCorrection) / (seg.conic.n * (seg.t1 - seg.t0));
        assert.ok(rate < 0.01, `${ship.id} ${phase.label}: corrected by ${(rate * 100).toFixed(2)}% of its rate`);
      });
    }
  });

  it("Earth's bulge swings the orbit planes west (J2)", () => {
    const seg = orbitOf("agena", 1);
    // About 0.47 degrees per revolution at this height and inclination.
    const perRevolution = (seg.nodeRate * seg.conic.period) / DEG;
    assert.ok(perRevolution < -0.4 && perRevolution > -0.55, `node moves ${perRevolution.toFixed(3)} degrees per revolution`);
  });

  it("the ships fly prograde (west to east)", () => {
    for (const ship of ["gemini", "agena"]) {
      const t = seconds("004:00:00");
      const a = pos(ship, t, 1);
      const b = pos(ship, t + 10, 1);
      const pole = rotX([0, 1, 0], -EARTH_AXIAL_TILT_RAD);
      const scenePole = rotY(pole, path.earthAxisAngle(t));
      const h = [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];
      assert.ok(dot(h, scenePole) > 0, `${ship} should orbit eastward`);
    }
  });
});

/**
 * Published values the plan does not use as inputs, and how close the model
 * comes. Tolerances are set from what the model can be expected to do, and
 * the comments give the model's value at the time of writing.
 */
describe("Gemini VIII: checks against published values not used as inputs", () => {
  it("at insertion the spacecraft trails the Agena by about 1060 nautical miles (pages 1-2, 4-2, 4-17)", () => {
    // Model: about 1081 n mi (2% more).
    const r = range(seconds("000:06:05.66"));
    assert.ok(Math.abs(r - 1060) / 1060 < 0.05, `range ${r.toFixed(1)} n mi`);
  });

  it("at terminal phase initiation the Agena is about 26.8 degrees above the horizon (page 4-18)", () => {
    // The range at TPI (29 n mi) is an input; the angle is not. Model: about
    // 33.7 degrees, because its height difference there is about 16 n mi
    // where the report gives about 13.4.
    const t = seconds("005:14:55.7");
    const g = pos("gemini", t, 1);
    const a = pos("agena", t, 1);
    const rel = [a[0]! - g[0]!, a[1]! - g[1]!, a[2]! - g[2]!];
    const elevation = Math.asin(dot(rel, g) / (Math.hypot(...rel) * Math.hypot(...g))) / DEG;
    assert.ok(Math.abs(elevation - 26.8) < 8, `elevation ${elevation.toFixed(2)} degrees`);
    assert.ok(Math.abs(range(t) - 29) < 0.05, `range ${range(t).toFixed(2)}`);
  });

  it("the model's retrofire matches the published velocity change (Table 5.1.8-V: 292.5 back, 114.1 down, 314.0 in all)", () => {
    // The fall from retrofire is run back from the 400,000-foot state, so
    // the change of velocity across retrofire is a check of the two
    // published states against each other. Model: about 359 ft/sec, within
    // a degree of the published direction.
    const i = phaseIndex(gemini, "Retrofire");
    const t = (seconds("010:04:46.6") + seconds("010:05:08.9")) / 2;
    const sky = path.report.sky;
    const before = bodyInertialState(sky, "earth", path.report.segment("gemini", i - 1), t);
    const after = bodyInertialState(sky, "earth", path.report.segment("gemini", i + 1), t);
    const dv = [0, 1, 2].map((k) => (after.v[k]! - before.v[k]!) / FOOT_KM);
    const along = dot(dv, before.v) / Math.hypot(...before.v);
    const up = dot(dv, before.r) / Math.hypot(...before.r);
    const total = Math.hypot(...dv);
    assert.ok(Math.abs(total - 314.0) / 314.0 < 0.2, `delta-v ${total.toFixed(1)} ft/sec`);
    const angle = Math.acos((-292.5 * along - 114.1 * up) / (Math.hypot(292.5, 114.1) * Math.hypot(along, up))) / DEG;
    assert.ok(angle < 3, `delta-v direction off by ${angle.toFixed(2)} degrees (back ${(-along).toFixed(1)}, down ${(-up).toFixed(1)})`);
  });

  it("the docked pair began to tumble over the Indian Ocean (page 4-17)", () => {
    // "Over the Indian Ocean, in the fifth revolution, the spacecraft and
    // GATV began rolling" (thruster anomaly start, 7:00:26.7, Table 4.2-I).
    // Model: about 7.6 S, 54.6 E, east of Madagascar.
    const t = seconds("007:00:26.7");
    const g = groundPoint(pos("gemini", t, 1), t);
    assert.ok(g.latitude > -40 && g.latitude < 10 && g.longitude > 40 && g.longitude < 100, `at ${g.latitude.toFixed(1)}, ${g.longitude.toFixed(1)}`);
  });

  it("retrofire happened on the night side (page 7-9)", () => {
    const t = seconds("010:04:46.6");
    const p = pos("gemini", t, 1);
    const sun = [0, 0, 0];
    path.sunDirection(t, sun);
    assert.ok(dot(p, sun) < 0, "the Sun should be below the spacecraft's horizon");
  });

  it("the 400,000-foot point lies at the published radius (Table 5.1.5-VIII: 21,300,862 feet)", () => {
    // The plan gives the altitude as 400,000 feet over the ellipsoid; the
    // computer's own radius differs from that by about 2.6 km.
    const p = pos("gemini", seconds("010:26:53.239"), 1);
    const radiusFt = (Math.hypot(...p) * EARTH_MEAN_RADIUS_KM) / FOOT_KM;
    assert.ok(Math.abs(radiusFt - 21_300_862) / 21_300_862 < 0.001, `radius ${radiusFt.toFixed(0)} ft`);
  });

  it("the illustrated entry passes near the computer's position at guidance termination (Table 5.1.5-VIII)", () => {
    // Published: 25.08 (geocentric) north, 136.00 east at 10:35:50.392.
    // Model: about 0.4 degrees (25 n mi) away; the ground track of the
    // entry is an illustration.
    const t = seconds("010:35:50.392");
    const g = groundPoint(pos("gemini", t, 1), t);
    const off = groundAngle(g, { latitude: 25.08, longitude: 136.0 }) * 60;
    assert.ok(off < 35, `${off.toFixed(1)} n mi from the published point`);
  });

  it("orbital periods follow from the published sizes, close to the published periods", () => {
    // Published periods, Tables 4.3-II, 4.3-IV and 4.3-IX (final column).
    // The model computes each from the orbit's size; it runs up to about
    // 0.15 minutes short, as the report measures heights from the Fischer
    // ellipsoid and the model from the equatorial radius.
    const published: [ShipPlan, string, number][] = [
      [gemini, "First orbit", 88.83],
      [gemini, "Lower apogee", 88.8],
      [gemini, "Higher perigee", 89.35],
      [gemini, "Coelliptic orbit, below the Agena", 90.02],
      [gemini, "Closing in on the Agena", 90.14],
      [gemini, "After undocking", 90.55],
      [agena, "Waiting for Gemini VIII", 90.57],
    ];
    for (const [ship, label, minutes] of published) {
      const period = orbitOf(ship.id, phaseIndex(ship, label)).conic.period / 60;
      assert.ok(Math.abs(period - minutes) < 0.2, `${ship.id} ${label}: ${period.toFixed(3)} min vs ${minutes}`);
    }
  });

  it("the Agena's insertion orbit has the published semi-major axis (Table 4.3-VI: 3603.0 n mi)", () => {
    const a = orbitOf("agena", 1).conic.a / NAUTICAL_MILE_KM;
    assert.ok(Math.abs(a - 3603.0) < 2, `semi-major axis ${a.toFixed(1)} n mi`);
  });

  it("orbit inclinations match the published ones", () => {
    // The plane comes from the heading at insertion. Table 4.3-VI gives the
    // Agena's osculating inclination at insertion as 28.86 degrees, and
    // NSSDCA gives 28.91 for the spacecraft's first orbit; the report's
    // final columns (heights over the Fischer ellipsoid) print 29.02 to 29.07.
    const pole = path.report.sky.earthPoleInertial([0, 0, 0]);
    const inclination = (seg: AnchoredOrbit) => Math.acos(dot(seg.normalAt(seg.t0, [0, 0, 0]), pole)) / DEG;
    const agenaI = inclination(orbitOf("agena", 1));
    const geminiI = inclination(orbitOf("gemini", 1));
    assert.ok(Math.abs(agenaI - 28.86) < 0.05, `Agena ${agenaI.toFixed(3)}`);
    assert.ok(Math.abs(geminiI - 28.91) < 0.05, `spacecraft ${geminiI.toFixed(3)}`);
    for (const i of [agenaI, geminiI]) assert.ok(Math.abs(i - 29.02) < 0.2, `inclination ${i.toFixed(3)}`);
  });

  it("the Sun lights the Cape at launch (Gemini VIII lifted off at 10:41 a.m. e.s.t.)", () => {
    const t = 0;
    const site = (gemini.phases[0] as AscentPhase).site;
    const p = earthSurfacePoint(site.latitude.value, site.longitude.value, t);
    const sun = [0, 0, 0];
    path.sunDirection(t, sun);
    const elevation = Math.asin(dot(p, sun)) / DEG;
    assert.ok(elevation > 30, `Sun ${elevation.toFixed(1)} degrees up at the Cape`);
  });
});

describe("Gemini VIII: readable scale", () => {
  /** Readable height above the globe, Earth radii. */
  function readableHeight(ship: string, t: number): number {
    return Math.hypot(...pos(ship, t, 0)) - 1;
  }

  it("both ships' orbits read clearly above the globe", () => {
    for (const ship of path.ships) {
      for (const phase of ship.phases) {
        if (phase.kind !== "orbit" && phase.kind !== "rendezvous" && phase.kind !== "docked") continue;
        const t0 = seconds(phase.start.value);
        const t1 = seconds(phase.end.value);
        for (let k = 0; k <= 50; k++) {
          const h = readableHeight(ship.id, t0 + ((t1 - t0) * k) / 50);
          assert.ok(h > 0.15, `${ship.id} ${phase.label} reads only ${h.toFixed(3)} Earth radii up`);
        }
      }
    }
  });

  it("the spacecraft's chase orbits read visibly below the Agena's until the final approach", () => {
    const check = (label: string, minGap: number) => {
      const phase = gemini.phases[phaseIndex(gemini, label)]!;
      const t0 = seconds(phase.start.value);
      const t1 = seconds(phase.end.value);
      let worst = Infinity;
      for (let k = 0; k <= 60; k++) {
        const t = t0 + ((t1 - t0) * k) / 60;
        worst = Math.min(worst, readableHeight("agena", t) - readableHeight("gemini", t));
      }
      assert.ok(worst > minGap, `${label}: the orbits come within ${worst.toFixed(4)} Earth radii`);
    };
    // The coelliptic orbit, about 14 to 17 n mi under the Agena.
    check("Coelliptic orbit, below the Agena", 0.022);
    for (const label of ["First orbit", "Lower apogee", "Higher perigee", "In the Agena's plane", "Before the coelliptic maneuver"]) {
      check(label, 0.02);
    }
  });

  it("the band that spreads them leaves everything at or below Apollo 11's parking orbit alone", () => {
    // Apollo 11's parking orbit reached 100.4 n mi above the equatorial radius.
    const highest = (EARTH_EQUATORIAL_RADIUS_KM + 100.4 * NAUTICAL_MILE_KM) / EARTH_MEAN_RADIUS_KM;
    const band = EARTH_LIFT.band!;
    assert.ok(highest - 1 < band.from, "the band must start above Apollo 11's parking orbit");
    const { band: _, ...without } = EARTH_LIFT;
    for (let r = 1; r <= 1 + band.from; r += 0.0005) {
      assert.equal(readableRadius(r, EARTH_LIFT), readableRadius(r, without));
    }
  });
});

