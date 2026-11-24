/**
 * Checks every built flight path should pass, shared by the tests. Each
 * returns a list of problems in plain words (empty when all is well), so a
 * failing test says what is wrong and where.
 *
 * They are the invariants flight-path.test.ts and gemini-8.test.ts check for
 * Apollo 11 and Gemini VIII, written once so the all-missions test and the
 * fixture tests can run them on any plan.
 */
import {
  EARTH_AXIAL_TILT_RAD,
  EARTH_FLATTENING,
  EARTH_MEAN_RADIUS_KM,
  MOON_RADIUS,
} from '../../content/physical-constants.ts';
import { elapsedToSeconds } from '../../content/types.ts';
import type { Fix, FlightPath, FlightPlan, Phase } from '../types.ts';

const DEG = Math.PI / 180;
const MIXES = [0, 0.37, 1];

function dist(a: readonly number[], b: readonly number[]): number {
  return Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
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

function pos(path: FlightPath, ship: string, t: number, mix: number): number[] {
  const out = [Number.NaN, Number.NaN, Number.NaN];
  path.position(ship, t, mix, out);
  return out;
}

/** Map (geodetic) latitude of an Earth fix, degrees. */
function mapLatitude(fix: Fix): number {
  const lat = fix.latitude.value;
  if (fix.latitudeKind !== 'geocentric') return lat;
  return Math.atan(Math.tan(lat * DEG) / (1 - EARTH_FLATTENING) ** 2) / DEG;
}

/**
 * Where a point on Earth's drawn surface is in the scene at t, from the
 * documented globe convention only (see flight-path.test.ts).
 */
export function earthSurfacePoint(
  path: FlightPath,
  latDeg: number,
  lonDeg: number,
  t: number,
): number[] {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  const local = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon)];
  return rotY(
    rotX(rotY(local, path.earthSpinAngle(t)), -EARTH_AXIAL_TILT_RAD),
    path.earthAxisAngle(t),
  );
}

/** A point on the Moon's surface at scale mix `mix`, per src/scene/moon.ts. */
export function moonSurfacePoint(
  path: FlightPath,
  latDeg: number,
  lonDeg: number,
  mix: number,
): number[] {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  const c = [0, 0, 0];
  path.moonPosition(mix, c);
  return [
    c[0]! - Math.cos(lat) * Math.cos(lon) * MOON_RADIUS,
    c[1]! + Math.sin(lat) * MOON_RADIUS,
    c[2]! + Math.cos(lat) * Math.sin(lon) * MOON_RADIUS,
  ];
}

/** Each ship's phases follow on, and the path reports them at the plan's times. */
export function phaseProblems(plan: FlightPlan, path: FlightPath): string[] {
  const problems: string[] = [];
  for (const ship of plan.ships) {
    const track = path.ships.find((s) => s.id === ship.id);
    if (!track) {
      problems.push(`${ship.id}: missing from the built path`);
      continue;
    }
    const first = elapsedToSeconds(ship.phases[0].start.value);
    const last = elapsedToSeconds(ship.phases[ship.phases.length - 1]!.end.value);
    if (track.start !== first || track.end !== last)
      problems.push(
        `${ship.id}: path runs ${track.start} to ${track.end}, plan ${first} to ${last}`,
      );
    ship.phases.forEach((phase, i) => {
      const t0 = elapsedToSeconds(phase.start.value);
      const t1 = elapsedToSeconds(phase.end.value);
      if (!(t1 > t0)) problems.push(`${ship.id} ${phase.label}: ends before it starts`);
      if (i > 0 && t0 !== elapsedToSeconds(ship.phases[i - 1]!.end.value)) {
        problems.push(
          `${ship.id} ${phase.label}: starts at ${phase.start.value}, not where the previous phase ends`,
        );
      }
      if (path.phaseAt(ship.id, t0) !== phase)
        problems.push(`${ship.id} ${phase.label}: not reported at its start ${phase.start.value}`);
      if (path.phaseAt(ship.id, t0 + (t1 - t0) * 0.999) !== phase)
        problems.push(`${ship.id} ${phase.label}: not reported before its end ${phase.end.value}`);
    });
  }
  if (path.start !== Math.min(...path.ships.map((s) => s.start)))
    problems.push("path start is not the first ship's start");
  if (path.end !== Math.max(...path.ships.map((s) => s.end)))
    problems.push("path end is not the last ship's end");
  return problems;
}

/**
 * Where an engine or a separation can change the velocity at a boundary.
 * Elsewhere the path must be smooth.
 */
function smoothAcross(prev: Phase, next: Phase): boolean {
  const kinks: Phase['kind'][] = ['burn', 'surface', 'entry'];
  if (kinks.includes(prev.kind) || kinks.includes(next.kind)) return false;
  // Undocking and leaving station: a separation thrust.
  return prev.kind !== 'docked' && prev.kind !== 'station';
}

/** No jumps in position anywhere, and no kinks in velocity where nothing fires. */
export function continuityProblems(plan: FlightPlan, path: FlightPath): string[] {
  const problems: string[] = [];
  for (const ship of plan.ships) {
    ship.phases.forEach((phase, i) => {
      if (i === 0) return;
      const t = elapsedToSeconds(phase.start.value);
      for (const mix of MIXES) {
        const gap = dist(pos(path, ship.id, t - 1e-3, mix), pos(path, ship.id, t + 1e-3, mix));
        if (!(gap < 1e-4))
          problems.push(
            `${ship.id} jumps ${gap.toExponential(2)} Earth radii at ${phase.start.value} (${phase.label}), mix ${mix}`,
          );
      }
      if (!smoothAcross(ship.phases[i - 1]!, phase)) return;
      const h = 2;
      const a = pos(path, ship.id, t - h, 1);
      const b = pos(path, ship.id, t, 1);
      const c = pos(path, ship.id, t + h, 1);
      const v1 = [0, 1, 2].map((k) => (b[k]! - a[k]!) / h);
      const v2 = [0, 1, 2].map((k) => (c[k]! - b[k]!) / h);
      const jump = dist(v1, v2) / Math.max(Math.hypot(...v1), 1e-9);
      if (!(jump < 0.02))
        problems.push(
          `${ship.id} velocity changes by ${(jump * 100).toFixed(2)}% at ${phase.start.value} (${phase.label})`,
        );
    });
  }
  // Every position is a number, at every scale.
  for (const track of path.ships) {
    for (let k = 0; k <= 400; k++) {
      const t = track.start + ((track.end - track.start) * k) / 400;
      for (const mix of [0, 1]) {
        const p = pos(path, track.id, t, mix);
        if (!p.every(Number.isFinite)) {
          problems.push(`${track.id}: no position at ${t.toFixed(1)} s, mix ${mix}`);
          break;
        }
      }
    }
  }
  return problems;
}

/**
 * No point of any path lies below Earth's or the Moon's drawn surface by
 * more than `toleranceKm` (true scale), checked on the drawn polyline and on
 * a fine even sampling of each phase.
 */
export function surfaceProblems(plan: FlightPlan, path: FlightPath, toleranceKm = 1): string[] {
  const problems: string[] = [];
  const tol = toleranceKm / EARTH_MEAN_RADIUS_KM;
  const moon = [0, 0, 0];
  path.moonPosition(1, moon);
  const check = (ship: string, t: number, p: readonly number[]): boolean => {
    const dE = Math.hypot(p[0]!, p[1]!, p[2]!);
    const dM = dist(p, moon);
    if (dE < 1 - tol) {
      problems.push(
        `${ship} is ${((1 - dE) * EARTH_MEAN_RADIUS_KM).toFixed(1)} km below Earth's surface at ${t.toFixed(1)} s (${path.phaseAt(ship, t)?.label})`,
      );
      return false;
    }
    if (dM < MOON_RADIUS - tol) {
      problems.push(
        `${ship} is ${((MOON_RADIUS - dM) * EARTH_MEAN_RADIUS_KM).toFixed(1)} km below the Moon's surface at ${t.toFixed(1)} s (${path.phaseAt(ship, t)?.label})`,
      );
      return false;
    }
    return true;
  };
  for (const ship of plan.ships) {
    const line = path.polyline(ship.id);
    if (!line) continue;
    for (let i = 0; i < line.times.length; i++) {
      if (
        !check(ship.id, line.times[i]!, Array.from(line.truePositions.subarray(3 * i, 3 * i + 3)))
      )
        break;
    }
    for (const phase of ship.phases) {
      const t0 = elapsedToSeconds(phase.start.value);
      const t1 = elapsedToSeconds(phase.end.value);
      const n = 200;
      let ok = true;
      for (let k = 0; k <= n && ok; k++) {
        const t = t0 + ((t1 - t0) * k) / n;
        ok = check(ship.id, t, pos(path, ship.id, t, 1));
      }
    }
  }
  return problems;
}

/** The last phase of each ship ends where the plan says: at the splashdown point or the surface site. */
export function endProblems(plan: FlightPlan, path: FlightPath): string[] {
  const problems: string[] = [];
  for (const ship of plan.ships) {
    const last = ship.phases[ship.phases.length - 1]!;
    const t = elapsedToSeconds(last.end.value);
    for (const mix of MIXES) {
      const p = pos(path, ship.id, t, mix);
      let expected: number[] | undefined;
      if (last.kind === 'entry')
        expected = earthSurfacePoint(
          path,
          mapLatitude(last.splashdown),
          last.splashdown.longitude.value,
          t,
        );
      else if (last.kind === 'surface' && last.body === 'earth')
        expected = earthSurfacePoint(path, mapLatitude(last.site), last.site.longitude.value, t);
      else if (last.kind === 'surface')
        expected = moonSurfacePoint(path, last.site.latitude.value, last.site.longitude.value, mix);
      if (expected && !(dist(p, expected) < 1e-7)) {
        problems.push(
          `${ship.id} ends ${(dist(p, expected) * EARTH_MEAN_RADIUS_KM).toFixed(3)} km from its published end point (${last.label}), mix ${mix}`,
        );
      }
    }
    // A splashdown followed by floating: the entry ends at the splashdown point too.
    ship.phases.forEach((phase) => {
      if (phase.kind !== 'entry') return;
      const te = elapsedToSeconds(phase.end.value);
      const p = pos(path, ship.id, te, 1);
      const expected = earthSurfacePoint(
        path,
        mapLatitude(phase.splashdown),
        phase.splashdown.longitude.value,
        te,
      );
      if (!(dist(p, expected) < 1e-7))
        problems.push(
          `${ship.id} splashes down ${(dist(p, expected) * EARTH_MEAN_RADIUS_KM).toFixed(3)} km from the published point`,
        );
    });
  }
  return problems;
}

/**
 * No phase where the ship travels several times farther than its speed on
 * either side allows. A blend between two paths that do not meet (a burn
 * bridging a gap) stays continuous, so the continuity checks miss it, but
 * the ship then jogs sideways: Apollo 13's second midcourse burn once moved
 * it 366 km in 34 seconds at about 1 km/s. The ship's speed just before and
 * just after a phase bounds how far it can go in it, give or take changes
 * of speed inside the phase: a factor of 3 leaves room for those (a lunar
 * orbit's low point, a flyby between two midcourse burns) and catches jogs.
 */
export function stretchProblems(plan: FlightPlan, path: FlightPath, factor = 3): string[] {
  const problems: string[] = [];
  for (const ship of plan.ships) {
    const track = path.ships.find((s) => s.id === ship.id);
    if (!track) continue;
    for (const mix of [0, 1]) {
      const speed = (a: number, b: number) =>
        dist(pos(path, ship.id, a, mix), pos(path, ship.id, b, mix)) / (b - a);
      for (const phase of ship.phases) {
        const t0 = elapsedToSeconds(phase.start.value);
        const t1 = elapsedToSeconds(phase.end.value);
        const before = t0 - 1 >= track.start ? speed(t0 - 1, t0) : speed(t0, t0 + 1);
        const after = t1 + 1 <= track.end ? speed(t1, t1 + 1) : speed(t1 - 1, t1);
        const steps = Math.max(50, Math.min(2000, Math.ceil((t1 - t0) / 10)));
        let traveled = 0;
        let prev = pos(path, ship.id, t0, mix);
        for (let k = 1; k <= steps; k++) {
          const p = pos(path, ship.id, t0 + ((t1 - t0) * k) / steps, mix);
          traveled += dist(prev, p);
          prev = p;
        }
        const allowed = factor * Math.max(before, after) * (t1 - t0) + 1e-6;
        if (traveled > allowed) {
          problems.push(
            `${ship.id} travels ${((traveled / allowed) * factor).toFixed(1)} times as far as its speed allows in ${phase.label} (${phase.start.value} to ${phase.end.value}), mix ${mix}`,
          );
        }
      }
    }
  }
  return problems;
}

/** All of the above. */
export function pathProblems(plan: FlightPlan, path: FlightPath): string[] {
  return [
    ...phaseProblems(plan, path),
    ...continuityProblems(plan, path),
    ...surfaceProblems(plan, path),
    ...endProblems(plan, path),
    ...stretchProblems(plan, path),
  ];
}
