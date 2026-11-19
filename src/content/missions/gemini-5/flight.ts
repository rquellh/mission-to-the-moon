/**
 * The Gemini V flight plan: the published facts the flight path is built
 * from (see src/sim/types.ts for the format and units, and src/sim/ for how
 * the path is drawn between these facts).
 *
 * One ship: the crew's spacecraft ("gemini", the main ship). The rendezvous
 * evaluation pod the crew released on the second revolution is described in
 * the story only; it is not drawn.
 *
 * Sources:
 * - Gemini Program Mission Report, Gemini V (MSC-G-R-65-4, October 1965):
 *   the sequence of events (Table 4.2-I), launch, insertion and landing
 *   (Table 4.3-I), the orbit through the flight (Table 4.3-II), the perigee
 *   adjustment (Table 4.3-III), the simulated rendezvous (Table 4.3-IV),
 *   the state at 400,000 feet (Table 5.1.5-X), retrofire (Table 5.1.8-V),
 *   the drogue parachute (section 5.1.11), and the recovery (section 6.3.2).
 *   No NASA or Internet Archive copy was found; the citations link to the
 *   scan of the NASA report in the Virtual AGC library at ibiblio.org. Page
 *   numbers are the report's printed pages, then the scan's PDF pages.
 * - JPL Horizons: where the Moon and Sun were, and how Earth was turned.
 *
 * The mission clock is Gemini V's ground elapsed time, as the report prints
 * it: zero at lift-off, 13:59:59.518 G.m.t. on August 21, 1965 (Table 4.2-I
 * prints lift-off at 0.00 g.e.t.).
 *
 * Arithmetic of ours, from printed values:
 * - Times the report prints in seconds from lift-off are written as
 *   hours:minutes:seconds.
 * - The end of a maneuver is its printed start plus its printed thrust
 *   duration (Tables 4.3-III and 4.3-IV). Retrofire ends when the last of
 *   the four retrorockets stopped: its ignition plus its total burn time
 *   (Table 5.1.8-V).
 * - 69,000 feet is 11.36 nautical miles (1 foot = 0.3048 m, 1 nautical mile
 *   = 1852 m).
 * - The landing point is printed in degrees and minutes; we write it in
 *   decimal degrees.
 * - The universal times sent to Horizons are lift-off plus the mission
 *   clock times of the sky samples.
 *
 * What is an illustration (not a reconstruction of the flown path):
 * - The launch pad: Launch Complex 19 is placed where the Gemini VIII plan
 *   places it (its estimate from that flight's report; see
 *   missions/gemini-8/flight.ts), since every crewed Gemini flew from it.
 * - The climb to orbit between the pad and the published points, and the
 *   entry (a smooth ground track to the landing point and a smooth descent
 *   to the drogue parachute height). Where retrofire happened is not
 *   printed; the engine places it so the fall reaches the landing point on
 *   time.
 * - The orbit over the eight days: a Kepler ellipse turned slowly by
 *   Earth's bulge (J2), whose size passes through the report's published
 *   sizes at the moments they belong to and changes smoothly in between
 *   (air drag lowered it slowly). The four firings of the simulated
 *   rendezvous on the third day are not drawn one by one: the report gives
 *   the orbit before the first and after the last, and the drawn orbit
 *   changes smoothly from one to the other over the 2 hours 14 minutes
 *   29.5 seconds from the start of the first firing (50:49:57, Table 4.2-I)
 *   to the end of the last (53:04:04 plus its 22.5 seconds, Table 4.3-IV;
 *   our sum). The plane change (15.0 ft/sec, a tiny tilt) is not drawn. Table
 *   4.3-II's sizes for revolutions 5, 16, 48, 64, 80, 96 and 112 are not
 *   used because the report gives them by revolution, not by time; they
 *   lie close to the smooth change drawn between the sizes used here.
 * - The report's final orbit heights are over an oblate Earth (section
 *   4.3.1.2); the model measures them from Earth's equatorial radius, which
 *   can draw an apogee or perigee up to about 3 nautical miles off,
 *   depending on its latitude.
 * - The size for revolution 120, the last before retrofire, is placed at
 *   retrofire; the orbit changed by a small fraction of a nautical mile in
 *   one revolution.
 * - After landing, the spacecraft is drawn floating at the landing point
 *   until the carrier lifted it aboard; its drift of about 7 nautical miles
 *   (section 6.3.2) is not drawn.
 */
import type { Citation, Cited, ElapsedTime } from "../../types.ts";
import type { FlightPlan, StateFix } from "../../../sim/types.ts";

/* ------------------------------------------------------------------ */
/* Citation helpers.                                                   */
/* ------------------------------------------------------------------ */

const MISSION_REPORT = "https://www.ibiblio.org/apollo/Documents/Gemini5MissionReport.pdf";
const GEMINI_8_REPORT =
  "https://web.archive.org/web/20250908153858/https://www.nasa.gov/wp-content/uploads/static/history/alsj/43455667-Gemini-Program-Mission-Report-Gemini-Viii.pdf";
const HORIZONS =
  "https://ssd.jpl.nasa.gov/api/horizons.api?format=text&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27&TLIST_TYPE=%27CAL%27&TLIST=%271965-08-21%2013:59:59.518%27,%271965-08-23%2016:49:56.518%27,%271965-08-29%2012:27:42.518%27,%271965-08-29%2012:55:13.518%27";

function cite<T>(value: T, citation: Citation, ...more: Citation[]): Cited<T> {
  return { value, citations: [citation, ...more] };
}

function at(elapsed: ElapsedTime, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  return { value: elapsed, citations: [citation, ...more] };
}

function report(locator: string): Citation {
  return { source: "gemini-5-mission-report", locator, url: MISSION_REPORT };
}

/** Table 4.2-I, sequence of events, "Actual time, g.e.t." column. */
const events = (row: string, page: "4-10 (PDF page 71)" | "4-11 (PDF page 72)"): Citation =>
  report(`Table 4.2-I, "Sequence of Events" (page ${page}), "${row}" row, actual time`);
const launchEvent = (row: string): Citation => events(row, "4-10 (PDF page 71)");
const flightEvent = (row: string): Citation => events(row, "4-11 (PDF page 72)");
/** Table 4.3-I, trajectory parameters, "Actual, Final" column. */
const trajectory = (condition: string, row: string): Citation =>
  report(`Table 4.3-I, "Comparison of Planned and Actual Trajectory Parameters" (pages 4-18 and 4-19, PDF pages 79 and 80), ${condition}, "${row}" row, actual final column`);
/** Table 4.3-II, orbital elements, "Actual, Final" column. */
const elements = (revolution: string, row: string, page: "4-20 (PDF page 81)" | "4-21 (PDF page 82)"): Citation =>
  report(`Table 4.3-II, "Comparison of Orbital Elements" (page ${page}), revolution ${revolution}, "${row}" row, actual final column`);
/** Table 4.3-III, the maneuvers of the pod exercise, "Actual" column. */
const podManeuver = (name: string, row: string): Citation =>
  report(`Table 4.3-III, "Comparison of Planned and Actual Maneuvers During the REP Exercise" (page 4-22, PDF page 83), ${name}, "${row}" row, actual column`);
/** Table 4.3-IV, the simulated rendezvous maneuvers, "Actual" column. */
const rendezvousManeuver = (name: string, row: string): Citation =>
  report(`Table 4.3-IV, "Rendezvous Maneuvers" (page 4-23, PDF page 84), ${name}, "${row}" row, actual column`);
/** Table 5.1.8-V, retrograde rocket system performance. */
const retrorockets = (row: string): Citation =>
  report(`Table 5.1.8-V, "Retrograde Rocket System Performance" (page 5-93, PDF page 196), ${row}`);
const horizons = (target: string, quantity: string, time: string): Citation => ({
  source: "jpl-horizons",
  locator: `Observer table, ${target}, ${quantity}, ${time} UT`,
  url: HORIZONS,
});

/** Seconds on the mission clock as "hhh:mm:ss.sss". */
function clockTime(seconds: number): ElapsedTime {
  const total = Math.round(seconds * 1000) / 1000;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total - hours * 3600) / 60);
  const rest = (total - hours * 3600 - minutes * 60).toFixed(3).replace(/\.?0+$/, "");
  const [whole = "0", fraction] = rest.split(".");
  const secondsText = whole.padStart(2, "0") + (fraction ? `.${fraction}` : "");
  return `${String(hours).padStart(3, "0")}:${String(minutes).padStart(2, "0")}:${secondsText}` as ElapsedTime;
}

/** A time the report prints in seconds from lift-off. */
function fromLiftoff(seconds: number, citation: Citation): Cited<ElapsedTime> {
  return { value: clockTime(seconds), citations: [citation] };
}

/** A maneuver's end: its printed start plus its printed duration (our sum). */
function plus(start: ElapsedTime, seconds: number, citation: Citation, ...more: Citation[]): Cited<ElapsedTime> {
  const [h = "0", m = "0", s = "0"] = start.split(":");
  return { value: clockTime(Number(h) * 3600 + Number(m) * 60 + Number(s) + seconds), citations: [citation, ...more] };
}

/** Degrees and minutes as printed, in decimal degrees. */
function degrees(whole: number, minutes: number): number {
  return whole + minutes / 60;
}

/* ------------------------------------------------------------------ */
/* Times on the mission clock.                                         */
/* ------------------------------------------------------------------ */

const LIFTOFF = at("000:00:00", launchEvent("Lift-off (pad disconnect separation) (13:59:59.518 G.m.t.)"));
const INSERTION = fromLiftoff(356.91, trajectory("spacecraft separation", "Time from lift-off, sec"));
const PERIGEE_ADJUST = at("000:56:00", flightEvent("Perigee adjust maneuver initiate"));
const PERIGEE_ADJUST_END = plus("000:56:00", 13, podManeuver("perigee adjust", "Thrust duration, sec"), flightEvent("Perigee adjust maneuver initiate"));
const HEIGHT_ADJUST: Cited<ElapsedTime> = {
  ...at("050:49:57", flightEvent("Height adjustment initiate")),
  discrepancy:
    'Table 4.3-IV gives this firing ("apogee adjustment") as 50:49:57 in its ground-directed column and 50:49:58 in its actual column. We follow the sequence of events, Table 4.2-I.',
};
const COELLIPTIC_END = plus(
  "053:04:04",
  22.5,
  rendezvousManeuver("coelliptical maneuver", "Thrust duration, sec (22.5)"),
  flightEvent("Coelliptic maneuver initiate"),
);
const RETROFIRE: Cited<ElapsedTime> = {
  ...at("190:27:43.3", retrorockets('"Ignition time, g.e.t." row, motor 1 (fired first)')),
  discrepancy: "Table 4.2-I gives retrorocket 1 as 190:27:43, to the second. We follow the tenths of a second in Table 5.1.8-V.",
};
const RETROFIRE_END = plus(
  "190:28:00.1",
  6.2,
  retrorockets('motor 4, the last to fire: "Ignition time, g.e.t." 190:28:00.1 and "Total burn time, sec" 6.2'),
);
const ENTRY_INTERFACE: Cited<ElapsedTime> = {
  ...at(
    "190:42:03.32",
    report('Table 5.1.5-X, "Comparison of Computer Telemetry Reentry Parameters With Postflight Reconstructed Computer Data" (page 5-49, PDF page 152), first column heading: "Time = 190:42:03.32 g.e.t., Altitude = 400 000 ft"'),
  ),
  discrepancy:
    "The guidance and control summary (Table 5.1.5-I, page 5-40, PDF page 143) lists the 400K point at 190:42:06, and section 5.1.5.3 (page 5-32, PDF page 135) says the crew changed control modes at 190:41:53, at approximately 400,000 feet. We follow Table 5.1.5-X, which gives the time to hundredths of a second.",
};
const LANDING = at("190:55:14", flightEvent("Landing"));
/** The end of the path: the carrier lifted the spacecraft aboard. */
const SPACECRAFT_ABOARD = at(
  "194:50:00",
  report('Section 6.3.2, "Location and Retrieval" (page 6-24, PDF page 271): "The carrier retrieved the spacecraft at 194 hours 50 minutes g.e.t." (given to the minute; seconds written as 00)'),
);

/* ------------------------------------------------------------------ */
/* Places.                                                             */
/* ------------------------------------------------------------------ */

/*
 * Launch Complex 19, as the Gemini VIII plan places it, with that plan's
 * citations: the Gemini VIII report does not print where the pad is either,
 * so it is that plan's estimate from the report's first-stage cutoff point,
 * its range from the launch site, and the flight azimuth (see
 * missions/gemini-8/flight.ts). Every crewed Gemini flew from this pad.
 */
const PAD_19_ESTIMATE: [Citation, ...Citation[]] = [
  report('Section 1.0, "Mission Summary" (page 1-1, PDF page 30): Gemini V "was launched from Complex 19, Cape Kennedy, Florida"'),
  {
    source: "gemini-8-mission-report",
    locator:
      'Section 1.0 (page 1-1): the spacecraft "was launched from Complex 19"; our estimate of where Complex 19 is, not a printed value: the point from which a great circle at the flight azimuth reaches the BECO point after the BECO range',
    url: GEMINI_8_REPORT,
  },
  {
    source: "gemini-8-mission-report",
    locator:
      'Table 4.3-I, "Comparison of Planned and Actual Gemini Space Vehicle Trajectory Parameters" (pages 4-22 and 4-23), BECO, "Geodetic latitude, deg north; Longitude, deg west; Range, n. mi. (28.36 N, 79.61 W, 51.4)" row, actual final column',
    url: GEMINI_8_REPORT,
  },
  {
    source: "gemini-8-mission-report",
    locator: 'Section 4.1 (page 4-1): "the GLV was launched ... on a rendezvous launch azimuth of 99.9 degrees"',
    url: GEMINI_8_REPORT,
  },
];
const PAD_19 = {
  latitude: cite(28.51, ...PAD_19_ESTIMATE),
  longitude: cite(-80.57, ...PAD_19_ESTIMATE),
};

/** Where the spacecraft came down, and floated until the carrier lifted it aboard. */
const SPLASHDOWN = {
  latitude: {
    ...cite(degrees(29, 47), trajectory("landing point", "Latitude, deg:min North (printed 29:47)")),
    discrepancy:
      "Section 6.3.2 (page 6-25, PDF page 272) gives the same landing point, 29 degrees 47 minutes north, and the carrier's pickup point about 7 nautical miles away, 29 degrees 52.5 minutes north, 69 degrees 50.8 minutes west, which section 1.0 gives as the recovery position. Section 4.3.1.3 (page 4-17, PDF page 78) gives a reconstructed landing point of 29 degrees 44 minutes north, 69 degrees 45 minutes west, and NASA's Gemini V page gives 29.73 N, 69.75 W, which matches it. We follow Table 4.3-I's final column. The report does not say whether this latitude is geodetic; we draw it as a map latitude.",
  },
  longitude: cite(-degrees(69, 45), trajectory("landing point", "Longitude, deg:min West (printed 69:45)")),
};

const PROGRADE: Cited<"prograde"> = cite("prograde", trajectory("spacecraft separation", "Space-fixed heading angle, deg (78.52)"));

/* ------------------------------------------------------------------ */
/* The plan.                                                           */
/* ------------------------------------------------------------------ */

export const flight: FlightPlan = {
  missionId: "gemini-5",

  // Four samples across the eight days: lift-off, the start of the
  // simulated rendezvous, retrofire, and landing.
  sky: [
    {
      time: LIFTOFF,
      moonEclipticLongitude: cite(76.3923017, horizons("Moon (301) from Earth's center", "ObsEcLon", "1965-08-21 13:59:59.518")),
      subLunarLongitude: cite(255.488154, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1965-08-21 13:59:59.518")),
      sunEclipticLongitude: cite(148.2846074, horizons("Sun (10) from Earth's center", "ObsEcLon", "1965-08-21 13:59:59.518")),
    },
    {
      time: at("050:49:57", flightEvent("Height adjustment initiate")),
      moonEclipticLongitude: cite(106.8479221, horizons("Moon (301) from Earth's center", "ObsEcLon", "1965-08-23 16:49:56.518")),
      subLunarLongitude: cite(244.428931, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1965-08-23 16:49:56.518")),
      sunEclipticLongitude: cite(150.3262986, horizons("Sun (10) from Earth's center", "ObsEcLon", "1965-08-23 16:49:56.518")),
    },
    {
      time: at("190:27:43", flightEvent("Initiate retrorocket 1")),
      moonEclipticLongitude: cite(193.5487984, horizons("Moon (301) from Earth's center", "ObsEcLon", "1965-08-29 12:27:42.518")),
      subLunarLongitude: cite(29.654711, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1965-08-29 12:27:42.518")),
      sunEclipticLongitude: cite(155.9447249, horizons("Sun (10) from Earth's center", "ObsEcLon", "1965-08-29 12:27:42.518")),
    },
    {
      time: LANDING,
      moonEclipticLongitude: cite(193.8195831, horizons("Moon (301) from Earth's center", "ObsEcLon", "1965-08-29 12:55:13.518")),
      subLunarLongitude: cite(23.000735, horizons("Earth (399) from the Moon's center", "ObsSub-LON", "1965-08-29 12:55:13.518")),
      sunEclipticLongitude: cite(155.9632011, horizons("Sun (10) from Earth's center", "ObsEcLon", "1965-08-29 12:55:13.518")),
    },
  ],

  ships: [
    {
      id: "gemini",
      name: "Gemini V spacecraft",
      role: "main",
      phases: [
        {
          kind: "ascent",
          label: "Launch",
          body: "earth",
          start: LIFTOFF,
          end: INSERTION,
          site: PAD_19,
          // The orbit itself takes over in the last 30 seconds before
          // insertion, so the second-stage cutoff point (23.6 seconds
          // before) is listed but not drawn through.
          track: [ascentPoint("BECO", 153.58, 35.5, 28.77, -79.67), ascentPoint("SECO", 333.28, 87.3, 30.52, -72.25)],
        },
        {
          kind: "orbit",
          label: "Eight days in orbit",
          body: "earth",
          start: INSERTION,
          end: RETROFIRE,
          apoapsis: cite(188.9, elements("Insertion", "Apogee, n. mi.", "4-20 (PDF page 81)")),
          periapsis: cite(87.4, elements("Insertion", "Perigee, n. mi.", "4-20 (PDF page 81)")),
          inclination: cite(32.59, elements("Insertion", "Inclination, deg", "4-20 (PDF page 81)")),
          sense: PROGRADE,
          startFix: {
            latitude: cite(30.89, trajectory("spacecraft separation", "Geodetic latitude, deg North")),
            longitude: cite(-70.55, trajectory("spacecraft separation", "Longitude, deg West (printed 70.55 west)")),
            altitude: cite(87.4, trajectory("spacecraft separation", "Altitude, n. mi.")),
            speed: cite(25_805, trajectory("spacecraft separation", "Space-fixed velocity, ft/sec")),
            flightPathAngle: cite(0.0, trajectory("spacecraft separation", "Space-fixed flight-path angle, deg")),
            heading: cite(78.52, trajectory("spacecraft separation", "Space-fixed heading angle, deg")),
          },
          sizes: [
            // The perigee adjustment, a step: the insertion orbit until the
            // thrusters fired, the raised orbit when they stopped.
            {
              time: PERIGEE_ADJUST,
              apoapsis: cite(188.9, elements("Insertion", "Apogee, n. mi.", "4-20 (PDF page 81)")),
              periapsis: cite(87.4, elements("Insertion", "Perigee, n. mi.", "4-20 (PDF page 81)")),
            },
            {
              time: PERIGEE_ADJUST_END,
              apoapsis: cite(188.9, elements("2 (after perigee adjust)", "Apogee, n. mi.", "4-20 (PDF page 81)")),
              periapsis: cite(92.4, elements("2 (after perigee adjust)", "Perigee, n. mi.", "4-20 (PDF page 81)")),
            },
            // Two days of slow decay, then the simulated rendezvous.
            {
              time: HEIGHT_ADJUST,
              apoapsis: cite(181.8, elements("32 (before simulated rendezvous)", "Apogee, n. mi.", "4-20 (PDF page 81)")),
              periapsis: cite(91.1, elements("32 (before simulated rendezvous)", "Perigee, n. mi.", "4-20 (PDF page 81)")),
            },
            {
              time: COELLIPTIC_END,
              apoapsis: cite(168.8, elements("34 (after simulated rendezvous)", "Apogee, n. mi.", "4-20 (PDF page 81)")),
              periapsis: cite(108.7, elements("34 (after simulated rendezvous)", "Perigee, n. mi.", "4-20 (PDF page 81)")),
            },
            // Five more days of slow decay, to the last orbit before retrofire.
            {
              time: RETROFIRE,
              apoapsis: cite(154.8, elements("120", "Apogee, n. mi.", "4-21 (PDF page 82)")),
              periapsis: cite(106.0, elements("120", "Perigee, n. mi.", "4-21 (PDF page 82)")),
            },
          ],
        },
        {
          kind: "burn",
          label: "Retrofire",
          body: "earth",
          start: RETROFIRE,
          end: RETROFIRE_END,
          deltaV: cite(324.5, retrorockets('"Delta V, ft/sec" row, actual column')),
        },
        {
          kind: "coast",
          label: "Falling toward the atmosphere",
          body: "earth",
          start: RETROFIRE_END,
          end: ENTRY_INTERFACE,
          sense: PROGRADE,
        },
        {
          kind: "entry",
          label: "Entry and splashdown",
          start: ENTRY_INTERFACE,
          end: LANDING,
          drogue: at("190:49:19", flightEvent("Drogue parachute deployment")),
          // 69,000 feet, in nautical miles (our conversion).
          drogueAltitude: cite(
            11.36,
            report('Section 5.1.11, "Landing System" (page 5-111, PDF page 214): "the drogue parachute was inadvertently deployed at an altitude of 69 000 feet instead of the normal altitude of 50 000 feet"'),
          ),
          splashdown: SPLASHDOWN,
        },
        {
          kind: "surface",
          label: "Floating until the carrier lifts it aboard",
          body: "earth",
          start: LANDING,
          end: SPACECRAFT_ABOARD,
          site: SPLASHDOWN,
        },
      ],
    },
  ],
};

/** A launch vehicle point from Table 4.3-I (geodetic latitude; longitude printed west). */
function ascentPoint(condition: string, secondsFromLiftoff: number, altitude: number, latitude: number, longitude: number): StateFix {
  return {
    time: fromLiftoff(secondsFromLiftoff, trajectory(condition, "Time from lift-off, sec")),
    altitude: cite(altitude, trajectory(condition, "Altitude, n. mi.")),
    latitude: cite(latitude, trajectory(condition, "Geodetic latitude, deg North")),
    longitude: cite(longitude, trajectory(condition, `Longitude, deg West (printed ${-longitude} west)`)),
  };
}
