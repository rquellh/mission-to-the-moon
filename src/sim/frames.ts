/**
 * The frame of reference and the sky: where Earth, the Moon, and the Sun are,
 * and how Earth is turned, at each moment of a mission.
 *
 * Frame ("scene frame", R): Earth's center at the origin; +X toward the
 * Moon; +Y ecliptic north; right-handed, so prograde motion (seen from +Y)
 * carries +X toward -Z. This frame turns with the Moon, so Earth and the
 * Moon both stay put, as in NASA's mission diagrams. It matches
 * src/scene/config.ts. The model's working unit is the kilometer; the
 * public API converts to Earth radii.
 *
 * Inertial frame (I): the same axes at a fixed ecliptic longitude: +X toward
 * the March equinox, +Y ecliptic north. R = Ry(-moonLongitude(t)) I.
 *
 * Earth's orientation, from Earth-fixed coordinates to R, is
 *   Ry(-moonLongitude(t)) * Rx(-tilt) * Ry(spin(t))
 * where Rx(-tilt) leans the north pole toward ecliptic longitude 90 degrees
 * (as src/scene/earth.ts does) and spin(t) is Greenwich sidereal angle. In
 * the scene: tilt group rotation (x = -tilt, y = -moonLongitude, order
 * "YXZ"), globe rotation.y = spin. Earth-fixed coordinates follow the globe
 * texture: longitude 0 on local +X, east toward local -Z, north on +Y.
 *
 * Simplifications (modeling assumptions):
 * - The Moon moves uniformly on a circle of the mean Earth-Moon distance in
 *   the ecliptic plane (its 5.1 degree inclination and eccentricity are
 *   ignored, as the scene ignores them).
 * - Earth is drawn as a sphere of its mean radius; published heights keep
 *   their own reference surfaces (see types.ts).
 * - The Moon's spin axis is +Y and its near side faces -X (src/scene/moon.ts).
 */
import {
  EARTH_AXIAL_TILT_RAD,
  EARTH_EQUATORIAL_RADIUS_KM,
  EARTH_FLATTENING,
  EARTH_MOON_MEAN_DISTANCE_KM,
  EARTH_SIDEREAL_ORBIT_DAYS,
  EARTH_SIDEREAL_ROTATION_HOURS,
  MOON_SIDEREAL_PERIOD_DAYS,
} from '../content/physical-constants.ts';
import { elapsedToSeconds } from '../content/types.ts';
import type { SkySample } from './types.ts';
import { DEG, rotateX, rotateY, set, vec3, wrapPi, type Vec3 } from './vec.ts';

/** The Moon's mean motion around Earth, radians per second (sidereal). */
export const MOON_RATE = (2 * Math.PI) / (MOON_SIDEREAL_PERIOD_DAYS * 86_400);
/** Earth's rotation relative to the stars, radians per second. */
export const EARTH_SPIN_RATE = (2 * Math.PI) / (EARTH_SIDEREAL_ROTATION_HOURS * 3_600);
/** The Sun's mean motion along the ecliptic, radians per second. */
export const SUN_RATE = (2 * Math.PI) / (EARTH_SIDEREAL_ORBIT_DAYS * 86_400);
/** The Moon's center in the scene frame, kilometers. */
export const MOON_CENTER_KM: Readonly<Vec3> = [EARTH_MOON_MEAN_DISTANCE_KM, 0, 0];

/** Geocentric latitude to geodetic (map) latitude, radians. */
export function geocentricToGeodetic(latitude: number): number {
  const k = (1 - EARTH_FLATTENING) * (1 - EARTH_FLATTENING);
  return Math.atan(Math.tan(latitude) / k);
}

/** Geodetic (map) latitude to geocentric latitude, radians. */
export function geodeticToGeocentric(latitude: number): number {
  const k = (1 - EARTH_FLATTENING) * (1 - EARTH_FLATTENING);
  return Math.atan(Math.tan(latitude) * k);
}

/** Distance from Earth's center to the ellipsoid at a geodetic latitude, km. */
export function ellipsoidRadius(geodeticLatitude: number): number {
  const s = Math.sin(geodeticLatitude);
  return EARTH_EQUATORIAL_RADIUS_KM * (1 - EARTH_FLATTENING * s * s);
}

/**
 * Unit vector, in a body's own coordinates as the scene's textures use them,
 * for a latitude and east longitude (radians): longitude 0 on +X, east
 * toward -Z, north on +Y.
 */
export function bodyFixedDirection(latitude: number, longitude: number, out: Vec3): Vec3 {
  const c = Math.cos(latitude);
  return set(out, c * Math.cos(longitude), Math.sin(latitude), -c * Math.sin(longitude));
}

/** A point on a body's surface: latitude north and longitude east, in radians or degrees as each use says. */
export interface GroundPoint {
  latitude: number;
  longitude: number;
}

/** Latitude and east longitude (radians) of a body-fixed vector. */
export function bodyFixedLatLon(v: Readonly<Vec3>): GroundPoint {
  return {
    latitude: Math.atan2(v[1], Math.hypot(v[0], v[2])),
    longitude: Math.atan2(-v[2], v[0]),
  };
}

/**
 * Moon-fixed (selenographic) latitude and east longitude to a direction in
 * the scene frame, relative to the Moon's center. The Moon's near side
 * (longitude 0) faces Earth (-X) and its east limb is toward +Z, as
 * src/scene/moon.ts orients the Moon texture.
 */
export function moonFixedDirection(latitude: number, longitude: number, out: Vec3): Vec3 {
  const c = Math.cos(latitude);
  return set(out, -c * Math.cos(longitude), Math.sin(latitude), c * Math.sin(longitude));
}

/** Inverse of moonFixedDirection. */
export function moonFixedLatLon(v: Readonly<Vec3>): GroundPoint {
  return {
    latitude: Math.atan2(v[1], Math.hypot(v[0], v[2])),
    longitude: Math.atan2(v[2], -v[0]),
  };
}

function circularMean(angles: number[]): number {
  let s = 0;
  let c = 0;
  for (const a of angles) {
    s += Math.sin(a);
    c += Math.cos(a);
  }
  return Math.atan2(s, c);
}

/** Right ascension of a point on the ecliptic at longitude `lambda`, radians. */
function rightAscensionOnEcliptic(lambda: number): number {
  return Math.atan2(Math.sin(lambda) * Math.cos(EARTH_AXIAL_TILT_RAD), Math.cos(lambda));
}

export interface SkyFit {
  /** Moon longitude at mission time 0, radians. */
  moonLongitude0: number;
  /** Earth spin angle at mission time 0, radians. */
  spin0: number;
  /** Sun longitude at mission time 0, radians. */
  sunLongitude0: number;
  /** Largest difference between the model and the samples, radians. */
  residuals: { moonLongitude: number; subLunarLongitude: number; sunLongitude: number };
}

/**
 * Fits the uniform motions (rates from the NSSDCA fact sheets) to the
 * published sky samples, averaging over the samples.
 */
export function fitSky(samples: readonly SkySample[]): SkyFit {
  const times = samples.map((s) => elapsedToSeconds(s.time.value));
  const moonLongitude0 = circularMean(
    samples.map((s, i) => s.moonEclipticLongitude.value * DEG - MOON_RATE * times[i]!),
  );
  const spin0 = circularMean(
    samples.map((s, i) => {
      const lambda = moonLongitude0 + MOON_RATE * times[i]!;
      return (
        rightAscensionOnEcliptic(lambda) -
        s.subLunarLongitude.value * DEG -
        EARTH_SPIN_RATE * times[i]!
      );
    }),
  );
  const sunLongitude0 = circularMean(
    samples.map((s, i) => s.sunEclipticLongitude.value * DEG - SUN_RATE * times[i]!),
  );
  const residuals = { moonLongitude: 0, subLunarLongitude: 0, sunLongitude: 0 };
  samples.forEach((s, i) => {
    const t = times[i]!;
    const lambda = moonLongitude0 + MOON_RATE * t;
    const subLunar = rightAscensionOnEcliptic(lambda) - (spin0 + EARTH_SPIN_RATE * t);
    residuals.moonLongitude = Math.max(
      residuals.moonLongitude,
      Math.abs(wrapPi(lambda - s.moonEclipticLongitude.value * DEG)),
    );
    residuals.subLunarLongitude = Math.max(
      residuals.subLunarLongitude,
      Math.abs(wrapPi(subLunar - s.subLunarLongitude.value * DEG)),
    );
    residuals.sunLongitude = Math.max(
      residuals.sunLongitude,
      Math.abs(wrapPi(sunLongitude0 + SUN_RATE * t - s.sunEclipticLongitude.value * DEG)),
    );
  });
  return { moonLongitude0, spin0, sunLongitude0, residuals };
}

/** The sky for one mission: orientation of Earth, place of Moon and Sun. */
export class Sky {
  readonly fit: SkyFit;

  constructor(samples: readonly SkySample[]) {
    this.fit = fitSky(samples);
  }

  /** The Moon's ecliptic longitude at mission time t, radians. */
  moonLongitude(t: number): number {
    return this.fit.moonLongitude0 + MOON_RATE * t;
  }

  /** Earth's spin angle (Greenwich sidereal angle) at t, radians. */
  spin(t: number): number {
    return this.fit.spin0 + EARTH_SPIN_RATE * t;
  }

  sunLongitude(t: number): number {
    return this.fit.sunLongitude0 + SUN_RATE * t;
  }

  /** Inertial (I) to scene frame (R), about Earth's center. */
  inertialToScene(p: Readonly<Vec3>, t: number, out: Vec3): Vec3 {
    return rotateY(out, p, -this.moonLongitude(t));
  }

  sceneToInertial(p: Readonly<Vec3>, t: number, out: Vec3): Vec3 {
    return rotateY(out, p, this.moonLongitude(t));
  }

  /** Earth-fixed vector (globe coordinates) to inertial. */
  earthFixedToInertial(p: Readonly<Vec3>, t: number, out: Vec3): Vec3 {
    rotateY(out, p, this.spin(t));
    return rotateX(out, out, -EARTH_AXIAL_TILT_RAD);
  }

  inertialToEarthFixed(p: Readonly<Vec3>, t: number, out: Vec3): Vec3 {
    rotateX(out, p, EARTH_AXIAL_TILT_RAD);
    return rotateY(out, out, -this.spin(t));
  }

  earthFixedToScene(p: Readonly<Vec3>, t: number, out: Vec3): Vec3 {
    this.earthFixedToInertial(p, t, out);
    return this.inertialToScene(out, t, out);
  }

  sceneToEarthFixed(p: Readonly<Vec3>, t: number, out: Vec3): Vec3 {
    this.sceneToInertial(p, t, out);
    return this.inertialToEarthFixed(out, t, out);
  }

  /** Moon-centered inertial offset to a scene-frame position. */
  moonInertialToScene(offset: Readonly<Vec3>, t: number, out: Vec3): Vec3 {
    rotateY(out, offset, -this.moonLongitude(t));
    out[0] += MOON_CENTER_KM[0];
    return out;
  }

  /** Scene-frame position to a Moon-centered inertial offset. */
  sceneToMoonInertial(p: Readonly<Vec3>, t: number, out: Vec3): Vec3 {
    set(out, p[0] - MOON_CENTER_KM[0], p[1], p[2]);
    return rotateY(out, out, this.moonLongitude(t));
  }

  /** The Moon's center in the inertial frame at t. */
  moonCenterInertial(t: number, out: Vec3): Vec3 {
    return rotateY(out, MOON_CENTER_KM, this.moonLongitude(t));
  }

  /** Unit vector toward the Sun in the scene frame. */
  sunDirection(t: number, out: Vec3): Vec3 {
    const a = this.sunLongitude(t) - this.moonLongitude(t);
    return set(out, Math.cos(a), 0, -Math.sin(a));
  }

  /**
   * A point at geodetic latitude and east longitude (radians) and radius r
   * (km), in the inertial frame at t.
   */
  earthPointInertial(latitude: number, longitude: number, r: number, t: number, out: Vec3): Vec3 {
    bodyFixedDirection(latitude, longitude, out);
    out[0] *= r;
    out[1] *= r;
    out[2] *= r;
    return this.earthFixedToInertial(out, t, out);
  }

  /** Earth's north pole in the inertial frame. */
  earthPoleInertial(out: Vec3): Vec3 {
    return rotateX(out, vec3(0, 1, 0), -EARTH_AXIAL_TILT_RAD);
  }
}
