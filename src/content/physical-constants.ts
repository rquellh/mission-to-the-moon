/**
 * Physical constants used by the site. Every value is copied from a NASA
 * source, cited beside it. Keep all physical constants in this file.
 *
 * Scene units: 1 scene unit = Earth's volumetric mean radius.
 */

/** Earth's volumetric mean radius, in kilometers (6,371.000 km). */
// Source: NASA NSSDCA Earth Fact Sheet, "Volumetric mean radius (km)"
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
export const EARTH_MEAN_RADIUS_KM = 6371.0;

/** The Moon's volumetric mean radius, in kilometers (1,737.4 km). */
// Source: NASA NSSDCA Moon Fact Sheet, "Volumetric mean radius (km)"
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
export const MOON_MEAN_RADIUS_KM = 1737.4;

/**
 * Mean Earth-Moon distance, in kilometers: the semimajor axis of the Moon's
 * orbit, 0.3844 x 10^6 km = 384,400 km.
 */
// Source: NASA NSSDCA Moon Fact Sheet, "Semimajor axis (10^6 km)"
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
export const EARTH_MOON_MEAN_DISTANCE_KM = 384_400;

/** Earth's axial tilt (obliquity to orbit), in degrees (23.44 degrees). */
// Source: NASA NSSDCA Earth Fact Sheet, "Obliquity to orbit (deg)"
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
export const EARTH_AXIAL_TILT_DEG = 23.44;

/* ------------------------------------------------------------------ */
/* Derived values, in scene units (Earth radii) and radians.           */
/* ------------------------------------------------------------------ */

/** Earth's radius in scene units (1 by definition). */
export const EARTH_RADIUS = 1;

/** The Moon's radius in scene units: 1737.4 / 6371.0 = about 0.2727. */
export const MOON_RADIUS = MOON_MEAN_RADIUS_KM / EARTH_MEAN_RADIUS_KM;

/** Mean Earth-Moon distance in scene units: 384,400 / 6371.0 = about 60.34. */
export const EARTH_MOON_DISTANCE = EARTH_MOON_MEAN_DISTANCE_KM / EARTH_MEAN_RADIUS_KM;

/** Earth's axial tilt in radians. */
export const EARTH_AXIAL_TILT_RAD = (EARTH_AXIAL_TILT_DEG * Math.PI) / 180;

/**
 * The mean Earth-Moon distance measured in Earth diameters
 * ("Earth-widths"): 384,400 / 12,742 = about 30.2.
 */
export const EARTH_MOON_DISTANCE_IN_EARTH_WIDTHS =
  EARTH_MOON_MEAN_DISTANCE_KM / (2 * EARTH_MEAN_RADIUS_KM);
