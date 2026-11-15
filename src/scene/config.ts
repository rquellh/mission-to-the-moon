import { Vector3 } from 'three';
import { EARTH_MOON_DISTANCE } from '../content/physical-constants';

/**
 * Scene tuning: presentation choices, not physical facts. Physical
 * constants live in src/content/physical-constants.ts.
 *
 * Frame of reference: Earth sits at the origin and +Y points to ecliptic
 * north. +X points toward ecliptic longitude 0 (the March equinox
 * direction) and longitude increases toward -Z, so motion that is
 * counterclockwise when seen from +Y is prograde (eastward).
 */

export type ScaleMode = 'readable' | 'true';

/** Earth-Moon distance in Earth radii for each scale mode. */
export const MOON_DISTANCE: Record<ScaleMode, number> = {
  /** Compressed so both bodies fit comfortably on one screen. */
  readable: 10,
  /** The real mean distance, about 60.3 Earth radii. */
  true: EARTH_MOON_DISTANCE,
};

/**
 * Direction from Earth toward the Moon. The Moon is placed at ecliptic
 * longitude 0 (along +X) for a clean layout; its position is illustrative.
 */
export const MOON_DIRECTION = new Vector3(1, 0, 0);

/**
 * Direction from Earth toward the Sun: ecliptic longitude 240 degrees, in the
 * ecliptic plane. This lights Earth's day side toward the default views and,
 * with the Moon 120 degrees east of the Sun, shows a waxing gibbous Moon from
 * Earth. Northern winter (the Sun near longitude 270) matches the December
 * Blue Marble imagery.
 */
export const SUN_DIRECTION = new Vector3(
  Math.cos((240 * Math.PI) / 180),
  0,
  -Math.sin((240 * Math.PI) / 180),
).normalize();

/** Directional "sun" light intensity, and the faint ambient fill. */
export const SUN_INTENSITY = 3.0;
export const AMBIENT_INTENSITY = 0.07;

/** Decorative Earth spin, in radians per second (about one turn per 5 minutes). */
export const EARTH_SPIN_RATE = (2 * Math.PI) / 300;

/**
 * How bright the star map appears, as a fraction of its original display
 * brightness. Kept low so the stars do not compete with Earth and Moon.
 */
export const STAR_BRIGHTNESS = 0.5;

/** Camera transition and scale-change duration, in milliseconds. */
export const TRANSITION_MS = 1500;

/** Camera vertical field of view on wide screens, in degrees. */
export const CAMERA_FOV = 40;
/**
 * On tall (portrait) screens the vertical field of view widens so the
 * horizontal view never drops below this many degrees. That keeps the star
 * map from being magnified into soft blobs on phones.
 */
export const PORTRAIT_MIN_HORIZONTAL_FOV = 36;
/** Upper limit for the widened vertical field of view, in degrees. */
export const PORTRAIT_MAX_FOV = 66;

/**
 * Camera directions (from the framed point toward the camera) for each view.
 * They lean toward the Sun so the framed body shows mostly its day side.
 */
export const VIEW_DIRECTION = {
  /** Looking down on Earth and Moon from slightly above, Sun to the left. */
  overviewLandscape: new Vector3(-0.2, 0.42, 1).normalize(),
  /**
   * From above and behind Earth, so on tall screens Earth sits low and the
   * Moon high, using the screen's height.
   */
  overviewPortrait: new Vector3(-0.5, 0.82, 0.12).normalize(),
  /** Earth with the Americas facing the camera near local noon. */
  earth: new Vector3(-0.25, 0.3, 1).normalize(),
  /** From the Earth side, so the Moon's near side faces the camera. */
  moon: new Vector3(-1, 0.18, 0.5).normalize(),
} as const;

/** OrbitControls zoom limits, as multiples of the framed body's radius. */
export const MIN_DISTANCE_FACTOR = 1.25;
/** Farthest the camera may zoom out, in Earth radii, per scale mode. */
export const MAX_DISTANCE: Record<ScaleMode, number> = {
  readable: 60,
  true: 260,
};
