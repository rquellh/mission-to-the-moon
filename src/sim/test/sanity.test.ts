/**
 * Prints a sanity table: where the main spacecraft is at about twenty
 * moments of Apollo 11, with published altitudes beside the model's where
 * Apollo by the Numbers gives them. Run with `npm test`.
 */
import { it } from "vitest";
import assert from "node:assert/strict";
import { flight as apollo11Flight } from "../../content/missions/apollo-11/flight.ts";
import {
  EARTH_MEAN_RADIUS_KM,
  EARTH_MOON_DISTANCE,
  MOON_RADIUS,
} from "../../content/physical-constants.ts";
import { elapsedToSeconds, type ElapsedTime } from "../../content/types.ts";
import { buildFlightPath } from "../build.ts";
import { bodyFixedLatLon, ellipsoidRadius, geocentricToGeodetic } from "../frames.ts";

const moments: [ElapsedTime, string, number?][] = [
  ["000:00:00.63", "Liftoff"],
  ["000:11:49.33", "Earth orbit insertion"],
  ["001:30:00", "Parking orbit"],
  ["002:50:13.03", "Translunar injection", 180.581],
  ["003:15:23.0", "CSM separated from S-IVB", 3815.19],
  ["004:40:01.72", "Evasive maneuver", 16_620.8],
  ["010:00:00", "Coasting"],
  ["026:44:58.64", "Midcourse correction", 109_475.3],
  ["050:00:00", "Coasting"],
  ["061:39:55", "Equigravisphere"],
  ["075:49:50.37", "Lunar orbit insertion"],
  ["090:00:00", "Lunar orbit"],
  ["102:45:39.9", "Landing (main ship in orbit)"],
  ["124:22:00.79", "Lunar liftoff"],
  ["128:03:00", "Docking"],
  ["135:23:42.28", "Transearth injection"],
  ["150:29:57.4", "Midcourse correction", 169_087.2],
  ["175:00:00", "Coasting home"],
  ["194:49:12.7", "CM/SM separation", 1_778.3],
  ["195:03:05.7", "Entry interface", 65.8],
  ["195:18:35", "Splashdown"],
];

it("sanity table: distance from Earth and the Moon across the mission", () => {
  const path = buildFlightPath(apollo11Flight);
  const p = [0, 0, 0];
  const rows = moments.map(([elapsed, event, published]) => {
    const t = elapsedToSeconds(elapsed);
    assert.ok(path.position("csm", t, 1, p));
    const fromEarth = Math.hypot(p[0]!, p[1]!, p[2]!);
    const fromMoon = Math.hypot(p[0]! - EARTH_MOON_DISTANCE, p[1]!, p[2]!);
    // Altitude above the ellipsoid, as the sources measure it.
    const km: [number, number, number] = [p[0]! * EARTH_MEAN_RADIUS_KM, p[1]! * EARTH_MEAN_RADIUS_KM, p[2]! * EARTH_MEAN_RADIUS_KM];
    const fixed = path.report.sky.sceneToEarthFixed(km, t, [0, 0, 0]);
    const surface = ellipsoidRadius(geocentricToGeodetic(bodyFixedLatLon(fixed).latitude));
    return {
      GET: elapsed,
      event,
      phase: path.phaseAt("csm", t)?.label ?? "",
      "Earth (Re)": Number(fromEarth.toFixed(3)),
      "Earth (km)": Math.round(fromEarth * EARTH_MEAN_RADIUS_KM),
      "Moon (km)": Math.round(fromMoon * EARTH_MEAN_RADIUS_KM),
      "Moon alt (km)": Math.round((fromMoon - MOON_RADIUS) * EARTH_MEAN_RADIUS_KM),
      "Earth alt (n mi)": Math.max(0, Math.round((fromEarth * EARTH_MEAN_RADIUS_KM - surface) / 1.852)),
      "published alt (n mi)": published ?? "",
    };
  });
  console.table(rows);
  assert.equal(rows.length, moments.length);
});
