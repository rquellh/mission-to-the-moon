/**
 * Apollo 8: the first crew to leave Earth orbit and circle the Moon,
 * December 21-27, 1968.
 *
 * Event times are copied from Apollo by the Numbers (NASA SP-2000-4029),
 * Apollo 8 Timeline, exactly as printed, and UTC from that table's GMT
 * columns, wherever they agree with the Apollo 8 Mission Report's Table 3-I
 * to its rounding. Where the two differ, we follow the Mission Report, the
 * more primary source, and the `discrepancy` field gives the timeline's
 * value. The Earthrise photograph is not in either table; its time comes
 * from NASA Goddard's frame-by-frame reconstruction (SVS 4593).
 *
 * Elapsed times are ground elapsed time (GET), counted from range zero
 * (12:51:00 GMT, "the integral second before lift-off", Mission Report
 * Section 2.0). Liftoff itself came 0.67 seconds later.
 *
 * Unit conversions in the text (nautical miles to miles and kilometers, feet
 * per second to miles and kilometers per hour) and Eastern times worked out
 * from GMT are our arithmetic on the cited values. So is writing durations
 * of a minute or more as minutes and seconds: the source's 246.9 seconds is
 * "4 minutes 6.9 seconds" here.
 *
 * Apollo 8 had no call signs: Apollo by the Numbers' Call Signs table gives
 * the command module's as "Apollo 8.", so `callSigns` is left out.
 *
 * The flight path itself (orbits, burns, splashdown point) is described in
 * flight.ts, not here.
 */
import type { Citation, Mission, Photo } from "../../types.ts";

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const ABTN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const ABTN_SUMMARY = `${ABTN}Apollo_08a_Summary.htm`;
const ABTN_TIMELINE = `${ABTN}Apollo_08i_Timeline.htm`;
const ABTN_CREW = `${ABTN}Apollo_18-02_Crew_Information_-_E-Orbit_and_L-Orbit.htm`;
const ABTN_ENTRY = `${ABTN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`;
const ABTN_TLI = `${ABTN}Apollo_18-24_Translunar_Injection.htm`;
const MISSION_REPORT =
  "https://web.archive.org/web/20251209023927/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a410/A08_MissionReport.pdf";

/** A section of the Apollo by the Numbers Apollo 8 mission summary. */
function summary(section: string): Citation {
  return {
    source: "apollo-by-the-numbers",
    locator: `Apollo 8 mission summary, "${section}" section`,
    url: ABTN_SUMMARY,
  };
}

/** A row of the Apollo by the Numbers Apollo 8 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return {
    source: "apollo-by-the-numbers",
    locator: `Apollo 8 Timeline, row "${row}"`,
    url: ABTN_TIMELINE,
  };
}

/** One of the Apollo by the Numbers phase or statistical tables. */
function table(name: string, rows: string, url: string): Citation {
  return {
    source: "apollo-by-the-numbers",
    locator: `"${name}" table, Apollo 8: ${rows}`,
    url,
  };
}

/** A row of the Mission Report's Table 3-I, Sequence of Events (pages 3-3 and 3-4, PDF pages 12 and 13). */
function sequence(row: string, page: "3-3" | "3-4" = "3-3"): Citation {
  return {
    source: "apollo-8-mission-report",
    locator: `Table 3-I, "Sequence of Events" (page ${page}, PDF page ${page === "3-3" ? 12 : 13}), "${row}" row`,
    url: MISSION_REPORT,
  };
}

/** A passage of the Mission Report, by section, printed page, and PDF page. */
function report(section: string, page: string, pdfPage: number, what: string): Citation {
  return {
    source: "apollo-8-mission-report",
    locator: `Section ${section} (page ${page}, PDF page ${pdfPage}): ${what}`,
    url: MISSION_REPORT,
  };
}

/** The NASA Apollo 8 mission page. */
function nasaMission(what: string): Citation {
  return { source: "nasa-apollo-8-mission", locator: what };
}

/** The NASA Apollo 8 Mission Details page. */
function nasaDetails(what: string): Citation {
  return { source: "nasa-apollo-8-mission-details", locator: what };
}

/** The Smithsonian record of the Apollo 8 command module. */
function nasm(what: string): Citation {
  return { source: "nasm-apollo-8-command-module", locator: what };
}

/** A photo from the NASA Image and Video Library, saved under public/media/apollo-8/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/apollo-8/${nasaId.toLowerCase()}.jpg`,
    width,
    height,
    alt,
    credit: "NASA",
    sourceUrl: `https://images.nasa.gov/details/${nasaId}`,
  };
}

const ABTN_DIFFERS = "The Apollo by the Numbers Apollo 8 Timeline gives";

/* ------------------------------------------------------------------ */
/* The mission                                                         */
/* ------------------------------------------------------------------ */

export const story: Mission = {
  id: "apollo-8",
  program: "apollo",
  name: "Apollo 8",
  kind: "flight",
  destination: "moon",

  summary: {
    text: {
      short:
        "Apollo 8 was the first mission to carry people to the Moon and back. In December 1968, Frank Borman, Jim Lovell, and Bill Anders circled the Moon ten times without landing, then came safely home.",
      more:
        "Apollo 8 launched from Kennedy Space Center on December 21, 1968, on the first Saturn V rocket to carry a crew. It flew without a lunar module. Its job was to test the command and service module, and the navigation and communications a Moon landing would need, on a real trip to the Moon. On Christmas Eve the crew went into orbit around the Moon, saw its far side and an Earthrise with their own eyes, and read from the Bible in a television broadcast to Earth. They splashed down in the Pacific Ocean on December 27.",
    },
    citations: [
      summary("Background"),
      summary("Ascent Phase"),
      summary("Lunar Orbit Phase"),
      summary("Recovery"),
      nasaMission(
        'Mission overview: "The Apollo 8 mission proved the performance of the command and service module and was the first crewed launch of the Saturn V rocket. On Christmas Eve, Frank Borman, Jim Lovell, and Bill Anders were the first humans to orbit the Moon and the first to see an Earthrise above its surface."',
      ),
      report("1.0, Summary", "1-1", 7, '"Ten revolutions were completed during the 20 hours 11 minutes spent in lunar orbit"'),
      report("2.0, Introduction", "2-1", 9, '"The overall objectives of the mission were to demonstrate command and service module performance in a cislunar and lunar-orbit environment, to evaluate crew performance in a lunar-orbit mission, to demonstrate communications and tracking at lunar distances"'),
      report("3.0, Mission Description", "3-1", 10, '"A lunar module test article (LTA-B) was mounted in the spacecraft/launch vehicle adapter for mass loading purposes"'),
    ],
  },

  crew: {
    value: [
      { name: "Frank Borman", role: "Commander" },
      { name: "James A. Lovell Jr.", role: "Command module pilot" },
      { name: "William A. Anders", role: "Lunar module pilot" },
    ],
    citations: [
      summary("Background"),
      report("1.0, Summary", "1-1", 7, '"The crew were Frank Borman, Commander; James A. Lovell, Command Module Pilot; and William A. Anders, Lunar Module Pilot"'),
      table("Crew Information - Earth Orbit and Lunar Orbit Missions", "Commander, Command Module Pilot, and Lunar Module Pilot rows", ABTN_CREW),
    ],
  },

  launch: {
    value: {
      utc: "1968-12-21T12:51:00Z",
      site: "Launch Complex 39, Pad A, Kennedy Space Center, Florida",
      vehicle: "Saturn V (SA-503)",
    },
    citations: [
      summary("Ascent Phase"),
      summary("Background"),
      timeline("Range zero."),
      report("2.0, Introduction", "2-1", 9, '"Range zero for this mission was 12:51:00 G.m.t."'),
      nasaDetails('Launch: "Dec. 21, 1968; 7:51 a.m. EST Launch Pad 39A Saturn-V AS-503"'),
    ],
  },

  duration: {
    value: "147:00:42.0",
    citations: [
      summary("Recovery"),
      table("Entry, Splashdown, and Recovery", "Earth Splashdown, GET row", ABTN_ENTRY),
      sequence("Landing", "3-4"),
    ],
  },

  accomplishments: [
    {
      text: {
        short:
          "Borman, Lovell, and Anders were the first people to leave Earth orbit, travel to the Moon, and orbit it.",
        more:
          "Apollo 8 went into orbit around the Moon on December 24, 1968, and circled it ten times in about 20 hours before heading home. At its farthest it was 203,752.37 nautical miles (about 234,470 miles, or 377,350 kilometers) from Earth.",
      },
      citations: [
        summary("Background"),
        summary("Lunar Orbit Phase"),
        nasm('Object description: "The mission was the first manned mission beyond earth orbit and the first mission to the moon"'),
        nasaMission('Mission overview: "the first humans to orbit the Moon"'),
        table("Entry, Splashdown, and Recovery", "Maximum Distance Traveled From Earth (n mi) row", ABTN_ENTRY),
      ],
    },
    {
      text: {
        short: "Apollo 8 was the first time the giant Saturn V rocket carried people.",
        more:
          "The two Saturn V flights before it had flown without a crew. Apollo 8 was first planned as an uncrewed test in Earth orbit. NASA made it a crewed flight in April 1968, and after Apollo 7's ten days in Earth orbit went well, decided on November 12, just five weeks before launch, to send it into orbit around the Moon.",
      },
      citations: [
        summary("Background"),
        report("2.0, Introduction", "2-1", 9, '"the first manned flight using a Saturn V launch vehicle"'),
        nasaMission('Mission overview: "was the first crewed launch of the Saturn V rocket"'),
      ],
    },
    {
      text: {
        short:
          "The crew were the first people to see the far side of the Moon, and the first to see Earth rise over the Moon's horizon.",
        more:
          "They took more than 800 still photographs, about 600 of them good pictures of the Moon's surface. Many small features they photographed, mostly on the far side, had never been seen before.",
      },
      citations: [
        summary("Lunar Orbit Phase"),
        summary("Conclusions"),
        nasaMission('Mission overview: "the first to see an Earthrise above its surface"'),
      ],
    },
    {
      text: {
        short:
          "Apollo 8 showed that the spacecraft could find its way to the Moon and back and stay in touch with Earth the whole way, as a landing mission would need.",
        more:
          "NASA concluded that the command and service module's systems were ready for a crewed lunar mission, that its navigation was more than accurate enough for arriving in lunar orbit and leaving it, and that communications at the Moon's distance were excellent. The crew also saw surface detail with the Sun low, at angles once thought too low, which widened the lighting limits for choosing landing times.",
      },
      citations: [summary("Conclusions"), summary("Lunar Orbit Phase")],
    },
    {
      text: {
        short:
          "On Christmas Eve, an estimated one billion people in 64 countries heard or watched the crew's broadcast from orbit around the Moon.",
        more:
          "It was the fourth of six live television broadcasts during the flight. Recordings of it were shown in 30 more countries the same day.",
      },
      citations: [
        summary("Lunar Orbit Phase"),
        timeline("4 th television transmission started."),
        report("1.0, Summary", "1-2", 8, '"live television was transmitted on six occasions"'),
      ],
    },
  ],

  chapters: [
    { id: "launch", title: "Launch" },
    { id: "earth-orbit", title: "Earth orbit" },
    { id: "outbound", title: "To the Moon" },
    { id: "lunar-orbit", title: "Around the Moon" },
    { id: "return", title: "Coming home" },
    { id: "splashdown", title: "Splashdown" },
  ],

  events: [
    /* ---------------------------- Launch ---------------------------- */
    {
      id: "liftoff",
      title: "Liftoff",
      chapter: "launch",
      elapsed: "000:00:00.67",
      utc: "1968-12-21T12:51:00Z",
      text: {
        short:
          "A Saturn V rocket lifts Apollo 8 off its launch pad in Florida. It is the first time this giant rocket has carried people.",
        more:
          "Apollo 8 lifted off from Launch Complex 39, Pad A, at Kennedy Space Center at 7:51 a.m. Eastern Standard Time on December 21, 1968. Aboard were Frank Borman, commander; James Lovell, command module pilot; and William Anders, lunar module pilot, although there was no lunar module. Inside the rocket, below the spacecraft, a test article of about the same weight rode in its place.",
      },
      citations: [
        timeline("Liftoff (umbilical disconnected)."),
        sequence("Lift-off"),
        summary("Ascent Phase"),
        summary("Background"),
        report("3.0, Mission Description", "3-1", 10, '"A lunar module test article (LTA-B) was mounted in the spacecraft/launch vehicle adapter for mass loading purposes"'),
      ],
      photo: nasaPhoto(
        "S68-56050",
        1088,
        1600,
        "The white Saturn V rocket climbs on a long trail of flame above billowing orange-brown smoke, seen from across the water, with marsh grass in front and seagulls in a blue sky.",
      ),
      view: "earth",
      inTour: true,
    },
    {
      id: "first-stage-separation",
      title: "First stage falls away",
      chapter: "launch",
      elapsed: "000:02:34.47",
      utc: "1968-12-21T12:53:34Z",
      text: {
        short:
          "The rocket's huge first stage shuts down and drops away. The second stage lights its engines and keeps climbing.",
        more:
          "The first stage, called the S-IC, shut down 2 minutes 33.82 seconds after liftoff and separated less than a second later. The second stage, the S-II, then took over. The first stage fell into the Atlantic Ocean about 9 minutes after launch, 353.462 nautical miles (about 407 miles, or 655 kilometers) from the launch site.",
      },
      citations: [
        timeline("S-IC outboard engine cutoff."),
        timeline("S-IC maximum Earth-fixed velocity; S-IC/S-II separation command"),
        sequence("S-IC/S-II separation"),
        summary("Ascent Phase"),
      ],
      view: "earth",
    },

    /* -------------------------- Earth orbit -------------------------- */
    {
      id: "earth-orbit-insertion",
      title: "In orbit around Earth",
      chapter: "earth-orbit",
      elapsed: "000:11:34.98",
      utc: "1968-12-21T13:02:35Z",
      text: {
        short:
          "Less than 12 minutes after liftoff, Apollo 8 is circling Earth about 115 miles (185 kilometers) up. The crew checks the spacecraft before heading for the Moon.",
        more:
          "The third stage, the S-IVB, fired for 2 minutes 36.69 seconds to reach an orbit 99.99 by 99.57 nautical miles high. During the second trip around Earth, at 1 hour 56 minutes, all of the spacecraft's systems were approved for the trip to the Moon. At 2 hours 27 minutes, Michael Collins, speaking for Mission Control as capsule communicator, told the crew, \"All right, Apollo 8. You are go for TLI\": translunar injection, the engine firing that would send them to the Moon.",
      },
      citations: [
        timeline("Earth orbit insertion."),
        timeline("All spacecraft systems approved for translunar injection."),
        timeline('CAPCOM (Mike Collins): "All right, Apollo 8. You are go for TLI."'),
        table("Apollo 8 Ascent Phase", '"S-IVB 1 st burn cutoff" row, Event Duration (sec)', `${ABTN}Apollo_08d_Ascent_Phase.htm`),
        table("Apollo 8 Earth Orbit Phase", '"Earth orbit insertion" row, Apogee and Perigee (n mi)', `${ABTN}Apollo_08e_Earth_Orbit_Phase.htm`),
        sequence("Earth orbit insertion"),
        summary("Earth Orbit Phase"),
        summary("Background"),
      ],
      view: "earth",
    },
    {
      id: "translunar-injection",
      title: "Leaving Earth behind",
      chapter: "earth-orbit",
      elapsed: "002:50:37.1",
      utc: "1968-12-21T15:41:37Z",
      text: {
        short:
          "The third stage fires again for just over 5 minutes. Apollo 8 speeds out of Earth orbit, and its crew become the first people ever to leave it.",
        more:
          "This firing, translunar injection, began 2 hours 50 minutes after launch, after one and a half trips around Earth, and ended at 2 hours 55 minutes 55.51 seconds. Ten seconds later Apollo 8 was moving at 35,505.41 feet per second, about 24,200 miles per hour (39,000 kilometers per hour), on its way to the Moon.",
      },
      citations: [
        sequence("Translunar injection ignition"),
        sequence("Translunar injection cutoff"),
        timeline("S-IVB 2nd burn cutoff."),
        timeline("Translunar injection."),
        table("Translunar Injection", '"GET" and "Space-Fixed Velocity (ft/sec)" rows', ABTN_TLI),
        summary("Earth Orbit Phase"),
        nasm('Object description: "The mission was the first manned mission beyond earth orbit"'),
      ],
      discrepancy: `${ABTN_DIFFERS} ignition at 002:50:37.79 (15:41:37 GMT), and its Earth Orbit Phase table gives the burn as 317.72 seconds (5 minutes 17.72 seconds). We follow the Mission Report's Table 3-I, 02:50:37.1.`,
      view: "journey",
      inTour: true,
    },

    /* --------------------------- To the Moon -------------------------- */
    {
      id: "spacecraft-separation",
      title: "Leaving the rocket behind",
      chapter: "outbound",
      elapsed: "003:20:59.3",
      utc: "1968-12-21T16:11:59Z",
      text: {
        short:
          "The spacecraft separates from the rocket's third stage and turns around to take pictures of it. With no lunar module to pick up, Apollo 8 then flies on alone.",
        more:
          "A small thruster firing pushed the command and service module off the third stage 3 hours 20 minutes 59.3 seconds after launch, and the high-gain antenna, a set of four dishes for talking with Earth from far away, swung out from the service module. In the adapter on the stage was a 19,900-pound test article standing in for the lunar module, which had not been ready in time. The crew flew alongside the stage, then fired thrusters at 3 hours 40 minutes and 4 hours 45 minutes to move farther away. The stage then dumped its leftover propellant to send itself past the Moon and into orbit around the Sun.",
      },
      citations: [
        timeline("CSM separated from S-IVB."),
        timeline("1 st CSM evasive maneuver from S-IVB (RCS)."),
        timeline("2nd CSM evasive maneuver from S-IVB (RCS)."),
        sequence("Spacecraft/S-IVB separation"),
        summary("Background"),
        summary("Translunar Phase"),
        report("3.0, Mission Description", "3-1", 10, '"After separation and transposition, the crew observed and photographed the S-IVB"'),
      ],
      photo: nasaPhoto(
        "as08-16-2583",
        1600,
        1600,
        "The rocket's spent third stage floats in black space, seen end-on from Apollo 8. On its end, where the adapter's panels have come off, stands the test article that took the place of a lunar module. Tiny sunlit specks drift around it.",
      ),
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "midcourse-correction",
      title: "A course correction",
      chapter: "outbound",
      elapsed: "010:59:59.5",
      utc: "1968-12-21T23:50:59Z",
      text: {
        short:
          "Apollo 8 fires its own main engine for the first time, for just over 2 seconds, to aim its path more exactly at the Moon.",
        more:
          "The 2.4-second firing of the service propulsion system, the command and service module's main engine, was its first check before it would be needed to go into lunar orbit. It changed the speed by 20.4 feet per second, a little less than planned because the engine pushed less hard than expected, and brought Apollo 8's closest approach to the Moon down from 458.1 to 66.3 nautical miles. The second thruster firing away from the third stage had shifted the path, so this correction was larger than it would otherwise have been. A second, much smaller correction followed at 60 hours 59 minutes.",
      },
      citations: [
        sequence("First midcourse correction ignition"),
        sequence("First midcourse correction cutoff"),
        sequence("Second midcourse correction"),
        summary("Translunar Phase"),
        {
          source: "apollo-by-the-numbers",
          locator: "Apollo 8 mission summary, footnote 1",
          url: ABTN_SUMMARY,
        },
        report("3.0, Mission Description", "3-1", 10, '"the unplanned maneuver of 7.7 ft/sec at 4:45:01 altered the trajectory so that the predicted altitude was 458.1 n. mi., which required a 24.8-ft/sec correction"'),
        nasaDetails('"The first midcourse correction ... provided a first check on the service propulsion system, or SPS, engine prior to committing spacecraft to lunar orbit insertion"'),
      ],
      discrepancy: `${ABTN_DIFFERS} ignition at 010:59:59.2 and cutoff at 011:00:01.6. We follow the Mission Report's Table 3-I, 10:59:59.5 and 11:00:01.9. NASA's Apollo 8 Mission Details page gives "about 10 hours, 55 minutes".`,
      view: "journey",
    },
    {
      id: "moons-pull",
      title: "Into the Moon's pull",
      chapter: "outbound",
      elapsed: "055:38:40",
      text: {
        short:
          "Apollo 8 crosses an invisible line in space. From here on, the Moon pulls on the spacecraft harder than Earth does.",
        more:
          "At 55 hours 38 minutes 40 seconds, Mission Control told the crew they had become the first humans to travel to a place where Earth's pull was weaker than another body's. They were 176,250 nautical miles (about 202,800 miles, or 326,400 kilometers) from Earth and 33,800 nautical miles from the Moon, and Earth's pull had slowed them to 3,261 feet per second. From then on, the Moon's pull sped them up. Minutes earlier, the crew had finished their second television broadcast, which showed Earth's western hemisphere.",
      },
      citations: [
        summary("Translunar Phase"),
        timeline("Equigravisphere."),
        timeline("2 nd television transmission ended."),
      ],
      photo: nasaPhoto(
        "S68-55808",
        1600,
        1221,
        "A grainy black-and-white television picture of Earth: a bright, partly lit globe with swirls of cloud, low in the frame against dark space.",
      ),
      view: "journey",
      inTour: true,
    },

    /* ------------------------- Around the Moon ------------------------ */
    {
      id: "lunar-orbit-insertion",
      title: "Into orbit around the Moon",
      chapter: "lunar-orbit",
      elapsed: "069:08:20.4",
      utc: "1968-12-24T09:59:20Z",
      text: {
        short:
          "Behind the Moon, out of radio contact with Earth, Apollo 8 fires its engine to slow down and goes into orbit. The crew are the first people to see the Moon's far side.",
        more:
          "Just before contact was lost, Jim Lovell told Mission Control, \"We'll see you on the other side.\" The firing began 69 hours 8 minutes 20.4 seconds after launch and lasted 4 minutes 6.9 seconds, putting Apollo 8 in an orbit 168.5 by 60.0 nautical miles above the Moon (about 194 by 69 miles, or 312 by 111 kilometers). The trip from Earth had taken 66 hours 16 minutes 21.79 seconds. When Apollo 8 came back around, Lovell called, \"Go ahead, Houston. This is Apollo 8. Burn complete.\"",
      },
      citations: [
        timeline("Lunar orbit insertion ignition."),
        timeline("Lunar orbit insertion cutoff."),
        timeline("CMP (Lovell): \"We'll see you on the other side.\""),
        timeline('CMP: "Go ahead, Houston . This is Apollo 8. Burn complete..."'),
        sequence("Lunar orbit insertion ignition"),
        summary("Translunar Phase"),
        summary("Lunar Orbit Phase"),
        nasaDetails('"At that moment, NASA\'s three astronauts became the first humans to see the moon\'s far side"'),
      ],
      photo: nasaPhoto(
        "as08-12-2192",
        1545,
        1600,
        "The Moon's far side seen from high above, looking south: gray, crater-covered ground curving away to a horizon under a black sky. A round crater with a dark floor sits right of center.",
      ),
      view: "moon",
      inTour: true,
    },
    {
      id: "lunar-television",
      title: "Television from lunar orbit",
      chapter: "lunar-orbit",
      elapsed: "071:40:52",
      utc: "1968-12-24T12:31:52Z",
      text: {
        short:
          "The crew points a television camera out the window and shows people on Earth the Moon's surface, live from orbit.",
        more:
          "The 12-minute broadcast began 71 hours 40 minutes after launch, between the burn that put Apollo 8 in orbit and the one that made the orbit round. In their first descriptions from lunar orbit, the crew called the surface \"black-and-white,\" with \"absolutely no color,\" or \"whitish gray, like dirty beach sand.\"",
      },
      citations: [
        timeline("3 rd television transmission started."),
        timeline("3 rd television transmission ended."),
        summary("Lunar Orbit Phase"),
      ],
      photo: nasaPhoto(
        "S68-55816",
        1600,
        1226,
        "A blurry black-and-white television picture of the cratered surface of the Moon, filling a window-shaped frame.",
      ),
      view: "moon",
    },
    {
      id: "lunar-orbit-circularization",
      title: "A rounder orbit",
      chapter: "lunar-orbit",
      elapsed: "073:35:06.6",
      utc: "1968-12-24T14:26:06Z",
      text: {
        short:
          "A short engine firing, behind the Moon again, makes Apollo 8's orbit nearly round, about 70 miles (112 kilometers) above the surface.",
        more:
          "The 9.6-second firing came 73 hours 35 minutes after launch, about two trips around after arriving, and changed the orbit to 60.7 by 59.7 nautical miles. For the next 12 hours the crew photographed the near and far sides of the Moon and sighted landmarks and possible landing areas for later missions.",
      },
      citations: [
        timeline("Lunar orbit circularization ignition."),
        timeline("Lunar orbit circularization cutoff."),
        sequence("Lunar orbit circularization ignition"),
        summary("Lunar Orbit Phase"),
        report("3.0, Mission Description", "3-2", 11, '"The next 12 hours of crew activity in lunar orbit involved near- and far-side photography, landing-area sightings, and television transmissions"'),
        report("5.5, Lunar Orbit Insertion", "5-3", 46, '"About two revolutions later, at 73:35:07, the elliptical lunar orbit was circularized to 60.7 by 59.7 n. mi."'),
        nasaDetails('"performed at the start of the third revolution, again on the back side of the moon"'),
      ],
      view: "moon",
    },
    {
      id: "earthrise",
      title: "Earthrise",
      chapter: "lunar-orbit",
      elapsed: "075:48:39.8",
      text: {
        short:
          "Coming around the Moon for the fourth time, the crew sees Earth rising over the Moon's gray horizon. Bill Anders takes a color photograph of it, known as Earthrise.",
        more:
          "\"Oh my God, look at that picture over there! There's the Earth comin' up. Wow, is that pretty!\" Anders said, as the spacecraft's tape recorder captured. Earth came into view in his window because Frank Borman was turning the spacecraft at that moment. Anders took a black-and-white picture first, then called for color film. This first color picture was taken 75 hours 48 minutes 39.8 seconds after launch, with Apollo 8 about 60 nautical miles (110 kilometers) above the Moon at 11.2 degrees south, 113.8 degrees east.",
      },
      citations: [
        {
          source: "nasa-svs-earthrise-4k",
          locator:
            'Frame sets: the 3840 x 2160 frames start at "75:46:19.0 Mission Elapsed Time" (16:37:19.0 UT) at 30 frames a second (47 seconds is 1410 frames), and "AS08-13-2329, AS08-14-2383, and AS08-14-2384" fall on frames 2502, 4224, and 4955, which puts AS08-14-2383, the first of the two color photographs, 4224 frames (140.8 seconds) after 75:46:19.0: at 75:48:39.8 (our arithmetic; if the frames are counted from 1, 140.77 seconds, the same to a tenth of a second)',
        },
        {
          source: "nasa-svs-earthrise-4k",
          locator:
            'Description: "the spacecraft was rolling when the photos were taken, and that it was this roll that brought the Earth into view"; and the video transcript (G2018_Earthrise_Master_Output.en_US.srt): "Anders: Oh my God, look at that picture over there! There\'s the Earth comin\' up. Wow, is that pretty!"',
          url: "https://svs.gsfc.nasa.gov/vis/a000000/a004500/a004593/G2018_Earthrise_Master_Output.en_US.srt",
        },
        {
          source: "nasa-svs-earthrise",
          locator:
            'Description: "The spacecraft was 110 km (68 miles, 60 nautical miles) above the surface of the Moon at 11.2°S 113.8°E when the Earthrise photograph was taken", on "its fourth pass behind the Moon"; and the black-and-white image "was taken about a minute before the first color photo"',
        },
        nasaMission('Mission overview: "the first to see an Earthrise above its surface"'),
      ],
      discrepancy:
        "NASA's Image and Video Library caption for AS08-14-2383 says the photo was taken around 10:40 a.m. Houston time and converts that to 15:40 GMT; 10:40 a.m. Central Standard Time is 16:40 GMT, about 75 hours 49 minutes on the mission clock. NASA Goddard's Earthrise visualization (svs.gsfc.nasa.gov/3936) centers its two minutes on 16:39:06 UT. We follow the frame-by-frame timing of Goddard's Earthrise in 4K (svs.gsfc.nasa.gov/4593).",
      photo: nasaPhoto(
        "as08-14-2383",
        1600,
        1600,
        "Earth, a half-lit blue and white globe, hangs in black space above the gray, curving horizon of the Moon.",
      ),
      view: "moon",
      inTour: true,
    },
    {
      id: "christmas-eve-broadcast",
      title: "Christmas Eve broadcast",
      chapter: "lunar-orbit",
      elapsed: "085:43:03",
      utc: "1968-12-25T02:34:03Z",
      text: {
        short:
          "On Christmas Eve, the crew sends television pictures of the Moon and Earth and reads from the Bible to the people back home.",
        more:
          "The 26-minute 43-second broadcast began 85 hours 43 minutes after launch, at 9:34 p.m. Eastern time on December 24. Earlier, Borman had canceled the rest of the planned work in lunar orbit so the tired crew could rest. As they neared lunar sunrise, Anders, Lovell, and Borman took turns reading the first ten verses of Genesis. Borman closed: \"And from the crew of Apollo 8, we close with good night, good luck, a merry Christmas, and God bless all of you, all of you on the good Earth.\"",
      },
      citations: [
        timeline("4 th television transmission started."),
        timeline('LMP: "We are now approaching the lunar sunrise, and for all the people back on Earth, the crew of Apollo 8 has a message that we would like to send to you. In the beginning..." (reading from the Bible).'),
        timeline('CDR: "And from the crew of Apollo 8, we close with good night, good luck, a merry Christmas, and God bless all of you, all of you on the good Earth."'),
        timeline("4 th television transmission ended."),
        summary("Lunar Orbit Phase"),
      ],
      view: "moon",
      inTour: true,
    },

    /* --------------------------- Coming home -------------------------- */
    {
      id: "transearth-injection",
      title: "Heading home",
      chapter: "return",
      elapsed: "089:19:16.6",
      utc: "1968-12-25T06:10:16Z",
      text: {
        short:
          "Behind the Moon once more, Apollo 8 fires its main engine to leave lunar orbit and head home. The crew depends on this one engine to get back.",
        more:
          "The 3-minute 23.7-second firing began 89 hours 19 minutes after launch, after ten trips around the Moon. When Apollo 8 came back into radio contact early on Christmas morning, Lovell announced, \"Please be informed there IS a Santa Claus.\" Mission Control answered, \"That's affirmative. You are the best ones to know.\"",
      },
      citations: [
        timeline("Transearth injection ignition (SPS)."),
        timeline("Transearth injection cutoff."),
        timeline('CMP: "Roger. Please be informed there IS a Santa Claus."'),
        timeline('CAPCOM: "That\'s affirmative. You are the best ones to know."'),
        sequence("Transearth injection ignition"),
        summary("Background"),
        summary("Lunar Orbit Phase"),
        summary("Transearth Phase"),
      ],
      view: "journey",
      inTour: true,
    },
    {
      id: "transearth-midcourse-correction",
      title: "One small correction",
      chapter: "return",
      elapsed: "103:59:54",
      text: {
        short:
          "The path home is so accurate that only one small correction is needed, a short thruster firing on Christmas Day.",
        more:
          "Three corrections had been planned for the trip home. The one that was needed, at 103 hours 59 minutes 54 seconds, used the service module's small thrusters to change the speed by 4.8 feet per second. On the way home the crew sent two more television broadcasts; the last one showed Earth's western hemisphere.",
      },
      citations: [
        sequence("Third midcourse correction"),
        report("5.7, Transearth Midcourse Correction", "5-3", 46, '"only one of three planned midcourse corrections was required"'),
        summary("Transearth Phase"),
      ],
      discrepancy: `${ABTN_DIFFERS} ignition at 104:00:00 (20:51:00 GMT on December 25). We follow the Mission Report's Table 3-I, 103:59:54.`,
      view: "journey",
    },
    {
      id: "cm-sm-separation",
      title: "Letting go of the service module",
      chapter: "return",
      elapsed: "146:28:48.0",
      utc: "1968-12-27T15:19:48Z",
      text: {
        short:
          "Shortly before reaching Earth, the crew lets go of the service module. Only the cone-shaped command module will come home.",
        more:
          "The service module was cast off 146 hours 28 minutes 48 seconds after launch. The command module then flew an automatically guided path down through the air.",
      },
      citations: [timeline("CM/SM separation."), sequence("Command module/service module separation", "3-4"), summary("Transearth Phase")],
      view: "spacecraft",
    },
    {
      id: "entry",
      title: "Back into the atmosphere",
      chapter: "return",
      elapsed: "146:46:12.8",
      utc: "1968-12-27T15:37:12Z",
      text: {
        short:
          "The command module reaches the top of Earth's atmosphere moving at about 24,700 miles per hour (39,700 kilometers per hour). The air around it glows as it slows down.",
        more:
          "Entry is counted from 400,000 feet, about 76 miles (122 kilometers) up, which Apollo 8 reached after a coast home of 57 hours 23 minutes 32.5 seconds. The glowing gas lit the cabin with a cold blue light as bright as daylight. At 180,000 feet, the command module's lift bounced it back up to 210,000 feet before it headed down again. The crew felt up to 6.84 times their normal weight.",
      },
      citations: [
        timeline("Entry."),
        timeline("Maximum entry g force (6.84 g)."),
        sequence("Entry interface (400 000 feet)", "3-4"),
        table("Entry, Splashdown, and Recovery", "Earth Entry, GET, Velocity (ft/sec), and Maximum g rows", ABTN_ENTRY),
        summary("Recovery"),
      ],
      view: "earth",
    },

    /* ----------------------------- Splashdown ---------------------------- */
    {
      id: "parachutes",
      title: "Parachutes open",
      chapter: "splashdown",
      elapsed: "146:54:47.8",
      utc: "1968-12-27T15:45:47Z",
      text: {
        short:
          "First, small parachutes called drogues open to steady the falling capsule. Then three big main parachutes lower it toward the Pacific Ocean in the dark before dawn.",
        more:
          "The drogue parachutes opened 146 hours 54 minutes 47.8 seconds after launch and the main parachutes 51.1 seconds later. Recovery aircraft had already picked up the spacecraft's radio signals and seen it, the recovery ship had it on radar, and its flashing light could be seen from the ship.",
      },
      citations: [
        timeline("Drogue parachute deployed"),
        timeline("Main parachute deployed."),
        timeline("Recovery aircraft received direction-finding signals from CM and established visual contact."),
        timeline("Radar contact with CM established by recovery ship at 270 nautical miles."),
        timeline("Flashing light on CM visible on recovery ship"),
        sequence("Drogue deployment", "3-4"),
        sequence("Main parachute deployment", "3-4"),
        report("7.2.7, Entry and Landing (Pilots' Report)", "7-22", 171, '"a visual check of the three main parachutes"'),
        summary("Recovery"),
      ],
      view: "earth",
    },
    {
      id: "splashdown",
      title: "Splashdown",
      chapter: "splashdown",
      elapsed: "147:00:42.0",
      utc: "1968-12-27T15:51:42Z",
      text: {
        short:
          "Apollo 8 splashes down in the Pacific Ocean before sunrise, close to the recovery ship USS Yorktown. The capsule tips upside down, and inflatable bags turn it upright.",
        more:
          "Splashdown came 147 hours 42 seconds after launch, at 10:51:42 a.m. Eastern time on December 27, 2.6 nautical miles (about 3 miles, or 4.8 kilometers) from the Yorktown. The hard landing let water into the cabin and splashed Borman, which delayed letting go of the parachutes, and they pulled the capsule over. Compressors filled flotation bags that turned it upright, which took about four and a half minutes. Swimmers went into the water at local sunrise, 43 minutes after splashdown.",
      },
      citations: [
        timeline("Splashdown."),
        timeline("CM went to apex down position. Voice contact lost."),
        timeline("CM returned to apex-up position."),
        sequence("Landing", "3-4"),
        summary("Recovery"),
        table("Entry, Splashdown, and Recovery", "Earth Splashdown GET, KSC Time, Distance To Recovery Ship (n mi), and Recovery Ship rows", ABTN_ENTRY),
        report("1.0, Summary", "1-2", 8, '"The total flight duration was 147 hours 42 seconds"'),
        report("7.2.7, Entry and Landing (Pilots' Report)", "7-22", 171, 'water entering at landing "caused a momentary delay in releasing the main parachutes. As a result, the spacecraft was pulled over to a stable II attitude. The uprighting compressors were activated to inflate the flotation bags and upright the spacecraft, which required approximately 4-1/2 minutes."'),
        report("9.3.2, Command Module Location and Retrieval", "9-4", 192, '"Six minutes 3 seconds elapsed between the time of loss of beacon signal and the time the crew reported that they were upright"'),
      ],
      discrepancy:
        "We follow the crew's account in the Mission Report (Section 7.2.7, page 7-22): uprighting took about 4 1/2 minutes once the compressors began filling the bags. The report's Section 9.3.2 (page 9-4) gives 6 minutes 3 seconds from the loss of the recovery beacon signal, when the capsule tipped over, to the crew reporting it upright, and Apollo by the Numbers' mission summary (Recovery) gives that same 6 minutes 3 seconds as the time to return to the upright position. The Apollo by the Numbers Timeline rows \"CM went to apex down position\" (147:00:50) and \"CM returned to apex-up position\" (147:07:45) are 6 minutes 55 seconds apart.",
      photo: nasaPhoto(
        "S69-15732",
        1600,
        1237,
        "Black-and-white photo of two Navy swimmers in wet suits standing on the flotation collar around the Apollo 8 capsule, one of them waving, beside an inflated life raft on the open sea.",
      ),
      view: "earth",
      inTour: true,
    },
    {
      id: "aboard-yorktown",
      title: "Aboard the Yorktown",
      chapter: "splashdown",
      elapsed: "148:29:00",
      utc: "1968-12-27T17:20:00Z",
      text: {
        short:
          "A helicopter lifts the three astronauts from the ocean and carries them to the deck of the USS Yorktown. Their trip around the Moon is over.",
        more:
          "The crew were aboard the ship about 88 minutes after splashdown, at about 12:20 p.m. Eastern time, and the spacecraft was lifted aboard about an hour later. In all, Apollo 8 traveled an estimated 504,006 nautical miles (about 580,000 miles, or 933,400 kilometers).",
      },
      citations: [
        timeline("Crew aboard recovery helicopter."),
        timeline("Crew aboard recovery ship."),
        timeline("CM aboard recovery ship."),
        report("3.0, Mission Description", "3-2", 11, '"The crew were retrieved and were aboard the USS Yorktown at 17:20 G.m.t., and the spacecraft was taken aboard approximately 1 hour later"'),
        table("Entry, Splashdown, and Recovery", "Minutes To Crew Pickup, Launch Site Pickup Time, and Distance Traveled (n mi) rows", ABTN_ENTRY),
        summary("Recovery"),
      ],
      photo: nasaPhoto(
        "S69-15737",
        1600,
        1230,
        "Black-and-white photo of the three Apollo 8 astronauts in white flight suits, waving from the doorway of a Navy helicopter on the deck of the USS Yorktown.",
      ),
      view: "earth",
    },
  ],

  whereNow: [
    {
      value: {
        object: "Apollo 8 command module",
        museum: "Museum of Science and Industry",
        place: "Chicago, Illinois",
      },
      citations: [
        { source: "nssdca-apollo-current-locations", locator: 'Apollo 8, "Command Module": "Chicago Museum of Science and Industry, Chicago, Illinois"' },
        nasm('Object description: "it was placed on loan to the Museum of Science and Industry in Chicago for display"'),
        nasm('Display Status: "This object is not on display at the National Air and Space Museum. It is either on loan or in storage."'),
      ],
    },
  ],
};
