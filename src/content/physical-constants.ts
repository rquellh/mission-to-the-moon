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

/** Earth's equatorial radius, in kilometers (6,378.137 km). */
// Source: NASA NSSDCA Earth Fact Sheet, "Equatorial radius (km)"
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
export const EARTH_EQUATORIAL_RADIUS_KM = 6378.137;

/** Earth's flattening (ellipticity), 0.003353. */
// Source: NASA NSSDCA Earth Fact Sheet, "Ellipticity (Flattening)"
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
export const EARTH_FLATTENING = 0.003353;

/** Earth's gravitational parameter GM, 0.39860 x 10^6 km^3/s^2. */
// Source: NASA NSSDCA Earth Fact Sheet, "GM (x 10^6 km^3/s^2)"
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
export const EARTH_GM_KM3_PER_S2 = 398_600;

/** Earth's sidereal rotation period (one turn relative to the stars), in hours (23.9345). */
// Source: NASA NSSDCA Earth Fact Sheet, "Sidereal rotation period (hrs)"
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
export const EARTH_SIDEREAL_ROTATION_HOURS = 23.9345;

/** Earth's sidereal orbit period around the Sun, in days (365.256). */
// Source: NASA NSSDCA Earth Fact Sheet, "Sidereal orbit period (days)"
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
export const EARTH_SIDEREAL_ORBIT_DAYS = 365.256;

/** The Moon's gravitational parameter GM, 0.00490 x 10^6 km^3/s^2. */
// Source: NASA NSSDCA Moon Fact Sheet, "GM (x 10^6 km^3/s^2)"
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
export const MOON_GM_KM3_PER_S2 = 4_900;

/** The Moon's sidereal revolution period around Earth, in days (27.3217). */
// Source: NASA NSSDCA Moon Fact Sheet, "Revolution period (days)"
// https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
export const MOON_SIDEREAL_PERIOD_DAYS = 27.3217;

/** One international nautical mile, in kilometers (exactly 1,852 m). */
// Source: NASA SP-7012 (second revision, 1973), "The International System of
// Units: Physical Constants and Conversion Factors", Conversion Factors,
// Listing by Physical Quantity, Length: "nautical mile (international) ...
// meter ... +03 1.852*" (* = exact)
// https://ntrs.nasa.gov/citations/19730018242
export const NAUTICAL_MILE_KM = 1.852;

/** One foot, in kilometers (exactly 0.3048 m). */
// Source: NASA SP-7012 (second revision, 1973), Conversion Factors, Listing by
// Physical Quantity, Length: "foot ... meter ... -01 3.048*" (* = exact)
// https://ntrs.nasa.gov/citations/19730018242
export const FOOT_KM = 0.0003048;

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
