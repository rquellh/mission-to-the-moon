import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  EARTH_MEAN_RADIUS_KM,
  EARTH_MOON_DISTANCE,
  MOON_RADIUS,
  NAUTICAL_MILE_KM,
} from "../../content/physical-constants.ts";
import {
  EARTH_LIFT,
  MOON_LIFT,
  READABLE_MOON_DISTANCE,
  WARP_SCALE,
  moonDistanceAtMix,
  readableRadius,
  toReadable,
} from "../warp.ts";

function warp(x: number, y: number, z: number): number[] {
  const out = [0, 0, 0];
  toReadable(x, y, z, out);
  return out;
}

/** Deterministic pseudo-random unit vectors. */
function* directions(count: number): Generator<number[]> {
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let i = 0; i < count; i++) {
    const z = 2 * rand() - 1;
    const a = 2 * Math.PI * rand();
    const s = Math.sqrt(1 - z * z);
    yield [s * Math.cos(a), z, s * Math.sin(a)];
  }
}

describe("readable warp", () => {
  it("uses the scene's readable Moon distance", () => {
    const config = readFileSync(new URL("../../scene/config.ts", import.meta.url), "utf8");
    const match = /readable:\s*([\d.]+)/.exec(config);
    assert.ok(match, "MOON_DISTANCE.readable not found in src/scene/config.ts");
    assert.equal(Number(match[1]), READABLE_MOON_DISTANCE);
  });

  it("puts the Moon at the readable distance", () => {
    const m = warp(EARTH_MOON_DISTANCE, 0, 0);
    assert.ok(Math.hypot(m[0]! - READABLE_MOON_DISTANCE, m[1]!, m[2]!) < 1e-12);
    assert.equal(moonDistanceAtMix(0), READABLE_MOON_DISTANCE);
    assert.equal(moonDistanceAtMix(1), EARTH_MOON_DISTANCE);
  });

  it("keeps Earth's and the Moon's surfaces fixed", () => {
    for (const d of directions(500)) {
      const e = warp(d[0]!, d[1]!, d[2]!);
      assert.ok(Math.hypot(e[0]! - d[0]!, e[1]! - d[1]!, e[2]! - d[2]!) < 1e-12, "Earth surface point moved");
      const m = warp(EARTH_MOON_DISTANCE + d[0]! * MOON_RADIUS, d[1]! * MOON_RADIUS, d[2]! * MOON_RADIUS);
      const expected = [READABLE_MOON_DISTANCE + d[0]! * MOON_RADIUS, d[1]! * MOON_RADIUS, d[2]! * MOON_RADIUS];
      assert.ok(Math.hypot(m[0]! - expected[0]!, m[1]! - expected[1]!, m[2]! - expected[2]!) < 1e-12, "Moon surface point moved");
    }
  });

  it("is monotone: distance from each body only grows", () => {
    for (const lift of [EARTH_LIFT, MOON_LIFT]) {
      let prev = readableRadius(lift.radius, lift);
      for (let h = 1e-4; h < lift.reach + 5; h *= 1.01) {
        const r = readableRadius(lift.radius + h, lift);
        assert.ok(r > prev, `readable radius must increase (h = ${h})`);
        prev = r;
      }
      assert.equal(readableRadius(lift.radius + lift.reach + 1, lift), WARP_SCALE * (lift.radius + lift.reach + 1));
    }
    // Along the Earth-Moon line, from Earth's surface to the Moon's and beyond it.
    let prevX = -Infinity;
    for (let x = 1; x < EARTH_MOON_DISTANCE + 30; x += 0.01) {
      if (Math.abs(x - EARTH_MOON_DISTANCE) < MOON_RADIUS) continue;
      const w = warp(x, 0, 0)[0]!;
      assert.ok(w > prevX, `warp folds at x = ${x}`);
      prevX = w;
    }
  });

  it("never folds space (positive Jacobian everywhere around both bodies)", () => {
    const h = 1e-5;
    const det = (x: number, y: number, z: number): number => {
      const dx = warp(x + h, y, z).map((v, k) => (v - warp(x - h, y, z)[k]!) / (2 * h));
      const dy = warp(x, y + h, z).map((v, k) => (v - warp(x, y - h, z)[k]!) / (2 * h));
      const dz = warp(x, y, z + h).map((v, k) => (v - warp(x, y, z - h)[k]!) / (2 * h));
      return (
        dx[0]! * (dy[1]! * dz[2]! - dy[2]! * dz[1]!) -
        dy[0]! * (dx[1]! * dz[2]! - dx[2]! * dz[1]!) +
        dz[0]! * (dx[1]! * dy[2]! - dx[2]! * dy[1]!)
      );
    };
    for (const [cx, radius, reach] of [
      [0, 1, EARTH_LIFT.reach],
      [EARTH_MOON_DISTANCE, MOON_RADIUS, MOON_LIFT.reach],
    ] as const) {
      for (const d of directions(60)) {
        for (let h0 = 0.001; h0 < reach + 2; h0 *= 1.6) {
          const r = radius + h0;
          const j = det(cx + d[0]! * r, d[1]! * r, d[2]! * r);
          assert.ok(j > 0, `Jacobian ${j} at height ${h0} from body at x = ${cx}`);
        }
      }
    }
  });

  it("lifts low orbits so they read clearly", () => {
    const earthOrbit = 100 * NAUTICAL_MILE_KM / EARTH_MEAN_RADIUS_KM;
    const lifted = readableRadius(1 + earthOrbit, EARTH_LIFT) - 1;
    assert.ok(lifted >= 0.15 && lifted <= 0.25, `100 n mi Earth orbit reads ${lifted.toFixed(3)} Earth radii up`);
    const lunarOrbit = 60 * NAUTICAL_MILE_KM / EARTH_MEAN_RADIUS_KM;
    const liftedMoon = (readableRadius(MOON_RADIUS + lunarOrbit, MOON_LIFT) - MOON_RADIUS) / MOON_RADIUS;
    assert.ok(liftedMoon >= 0.3 && liftedMoon <= 0.5, `60 n mi lunar orbit reads ${liftedMoon.toFixed(3)} Moon radii up`);
  });
});
