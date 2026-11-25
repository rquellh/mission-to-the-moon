import { EARTH_MOON_DISTANCE } from '../content/physical-constants';

/**
 * Scene tuning: presentation choices, not physical facts. Physical
 * constants live in src/content/physical-constants.ts; where things are at
 * each moment comes from the flight path (src/sim).
 *
 * Frame of reference (the flight path's "scene frame"): Earth sits at the
 * origin, the Moon on +X, and +Y points to ecliptic north. Longitude
 * increases toward -Z, so motion that is counterclockwise when seen from +Y
 * is prograde (eastward). The frame turns with the Moon, so Earth and the
 * Moon both stay put, as in NASA's mission diagrams; Earth's axis, the Sun,
 * and the stars turn instead.
 */

export type ScaleMode = 'readable' | 'true';

/** Earth-Moon distance in Earth radii for each scale mode. */
export const MOON_DISTANCE: Record<ScaleMode, number> = {
  /** Compressed so both bodies fit comfortably on one screen. Must equal the flight path's READABLE_MOON_DISTANCE. */
  readable: 10,
  /** The real mean distance, about 60.3 Earth radii. */
  true: EARTH_MOON_DISTANCE,
};

/** Directional "sun" light intensity. */
export const SUN_INTENSITY = 3.0;
/** A little fill light everywhere. Night sides get their own floor of light (src/scene/night-side.ts). */
export const AMBIENT_INTENSITY = 0.05;
/** Lights on the spacecraft models, which are drawn to be found, not to be realistic. */
export const SHIP_SUN_INTENSITY = 2.2;
export const SHIP_AMBIENT_INTENSITY = 0.9;

/**
 * How bright the star map appears, as a fraction of its original display
 * brightness. Kept low so the stars do not compete with Earth and Moon.
 */
export const STAR_BRIGHTNESS = 0.5;

/** Scale-change duration, in milliseconds. */
export const TRANSITION_MS = 1500;
/**
 * A camera move between views, and the ship view's moves into and out of its
 * steady fast-forward view, take as long as they need for the picture never
 * to turn faster than CAMERA_TURN_DEG_PER_S (its turn and its roll
 * together), eased in and out: at least the first time here and at most the
 * second, in milliseconds. A small move takes the first; the largest (a
 * swing far around a body that rolls the picture over as well) the second,
 * turning a little faster. The tour waits for a move to end before it says it
 * has arrived, for at most CAMERA_SETTLE_MAX_SECONDS (src/app/tour.ts), which
 * the second time must not exceed.
 */
export const CAMERA_MOVE_MS = [1500, 3000] as const;
/**
 * The fastest a camera move turns the picture, in degrees a second, where
 * CAMERA_MOVE_MS leaves it time to. A working figure, not one the owner
 * gave: moves that turned the picture at over 200 a second read as a lurch
 * in a recording. Kept a little under 90, as a move's end can move on the way
 * (the ship view follows its craft) and a slow frame bunches a move's turn.
 */
export const CAMERA_TURN_DEG_PER_S = 80;
/** A shorter move, for reframing after the interface changes size. */
export const REFRAME_MS = 450;

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

/** Height of the journey view's camera above the plane of the path, in degrees. */
export const JOURNEY_ELEVATION_DEG = 58;
/** Angle between a body's line to the ship and the camera in the Earth and Moon views, in degrees. */
export const BODY_VIEW_ANGLE_DEG = 38;

/** OrbitControls zoom limits, as multiples of the framed body's radius. */
export const MIN_DISTANCE_FACTOR = 1.25;
/** Farthest the camera may zoom out, in Earth radii, per scale mode. */
export const MAX_DISTANCE: Record<ScaleMode, number> = {
  readable: 60,
  true: 260,
};

/**
 * Path line and halo colors by role: amber for the crew's main spacecraft
 * (and its rocket), aqua for every other ship (a lander such as Eagle, or a
 * target such as the Agena).
 */
export const SHIP_COLORS = {
  main: 0xf4b942,
  other: 0x6fd3e8,
} as const;
/** Path line width in CSS pixels, so it reads the same on every screen density. */
export const PATH_WIDTH_PX = 2.5;
/** Opacity of the part of a path still to come. */
export const PATH_FUTURE_OPACITY = 0.32;

/** Marker sizes in CSS pixels. */
export const MARKER_SIZE_PX = 7;
export const MARKER_CURRENT_SIZE_PX = 13;
export const SITE_MARKER_SIZE_PX = 12;

/**
 * Apparent length of a spacecraft model, in CSS pixels, for a model as long
 * as the command and service module. Longer stacks look somewhat longer.
 */
export const SHIP_SIZE_PX = 34;
