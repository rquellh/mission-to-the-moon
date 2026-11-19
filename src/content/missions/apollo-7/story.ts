/**
 * Apollo 7: the first Apollo flight with a crew, nearly 11 days in Earth
 * orbit testing the command and service module, October 11-22, 1968.
 *
 * Event times come from the Apollo 7 Mission Report (MSC-PA-R-68-15),
 * Table 2-I, "Sequence of Events", the more primary source; Apollo by the
 * Numbers (NASA SP-2000-4029) is used where it prints the same moment to
 * the hundredth of a second, and for moments the report's table does not
 * list. Universal times come from the GMT column of Apollo by the Numbers'
 * Apollo 7 Timeline. Where a source gives a different value, the
 * `discrepancy` field says what it gives and which we follow. NASA's own
 * link to the mission report no longer works, so the source registry links
 * to NASA's copy as saved by the Internet Archive.
 *
 * Elapsed times are ground elapsed time, counted from range zero (15:02:45
 * G.m.t.). Lift-off itself came 0.36 second later. Where a source gives a
 * time only to the minute, seconds are written as 00 and the text says
 * "about" or gives only hours and minutes.
 *
 * Unit conversions in the text (nautical miles to miles and kilometers, feet
 * to meters, feet per second to miles and kilometers per hour, pounds to
 * kilograms) are our arithmetic on the cited values, as are the durations
 * between two cited times and the date of a cited elapsed time (for
 * example, 023:33 after range zero is October 12).
 *
 * The flight path itself (orbits, burns, splashdown point) is described in
 * flight.ts, not here.
 */
import type { Citation, Mission, Photo } from "../../types.ts";

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const MISSION_REPORT =
  "https://web.archive.org/web/20250207014232/https://www.nasa.gov/wp-content/uploads/static/history/alsj/a410/A07_MissionReport.pdf";
const ABTN = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const ABTN_SUMMARY = `${ABTN}Apollo_07a_Summary.htm`;
const ABTN_TIMELINE = `${ABTN}Apollo_07f_Timeline.htm`;
const ABTN_CREW = `${ABTN}Apollo_18-02_Crew_Information_-_E-Orbit_and_L-Orbit.htm`;
const ABTN_CALL_SIGNS = `${ABTN}Apollo_18-17_Call_Signs.htm`;
const ABTN_ENTRY = `${ABTN}Apollo_18-40_Entry_Splashdown_and_Recovery.htm`;
const NMC_CSM = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1968-089A";

/** A section of the mission report. */
function report(section: string, pages: string): Citation {
  return { source: "apollo-7-mission-report", locator: `Section ${section} (${pages})`, url: MISSION_REPORT };
}

/** A row of the mission report's Table 2-I, the sequence of events, "Actual" column. */
function sequence(row: string, page: "2-3" | "2-4"): Citation {
  return {
    source: "apollo-7-mission-report",
    locator: `Table 2-I, "Sequence of Events" (page ${page}, PDF page ${page === "2-3" ? 29 : 30}), "${row}" row, actual column`,
    url: MISSION_REPORT,
  };
}

/** A table of the mission report. */
function reportTable(table: string, pages: string, rows: string): Citation {
  return { source: "apollo-7-mission-report", locator: `${table} (${pages}), ${rows}`, url: MISSION_REPORT };
}

/** A section of the Apollo by the Numbers Apollo 7 mission summary. */
function summary(section: string): Citation {
  return { source: "apollo-by-the-numbers", locator: `Apollo 7 mission summary, "${section}" section`, url: ABTN_SUMMARY };
}

/** A row of the Apollo by the Numbers Apollo 7 Timeline, quoted as printed. */
function timeline(row: string): Citation {
  return { source: "apollo-by-the-numbers", locator: `Apollo 7 Timeline, row "${row}"`, url: ABTN_TIMELINE };
}

/** One of the statistical tables in Apollo by the Numbers, Apollo 7 column. */
function table(name: string, rows: string, url: string): Citation {
  return { source: "apollo-by-the-numbers", locator: `"${name}" table, Apollo 7 column: ${rows}`, url };
}

/** NSSDCA's Master Catalog page for the Apollo 7 command and service module. */
function nmc(section: string): Citation {
  return { source: "nssdca-master-catalog", locator: `"Apollo 7" (1968-089A), ${section}`, url: NMC_CSM };
}

/** NASA's article "About Apollo 7, the First Crewed Apollo Space Mission". */
function nasaArticle(passage: string): Citation {
  return { source: "nasa-apollo-7-first-crewed-mission", locator: passage };
}

/** NASA's caption for a photograph in the NASA Image and Video Library. */
function caption(nasaId: string, passage: string): Citation {
  return {
    source: "nasa-images-apollo-7",
    locator: `Caption of ${nasaId}: ${passage}`,
    url: `https://images-api.nasa.gov/search?nasa_id=${nasaId}`,
  };
}

/** A photo from the NASA Image and Video Library, saved under public/media/apollo-7/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/apollo-7/${nasaId.toLowerCase()}.jpg`,
    width,
    height,
    alt,
    credit: "NASA",
    sourceUrl: `https://images.nasa.gov/details/${nasaId}`,
  };
}

/* ------------------------------------------------------------------ */
/* The mission                                                         */
/* ------------------------------------------------------------------ */

export const story: Mission = {
  id: "apollo-7",
  program: "apollo",
  name: "Apollo 7",
  kind: "flight",
  destination: "earth-orbit",

  summary: {
    text: {
      short:
        "Apollo 7 was the first Apollo flight with astronauts aboard. In October 1968, Wally Schirra, Donn Eisele, and Walt Cunningham spent nearly 11 days circling Earth, testing the spacecraft that would carry people to the Moon.",
      more:
        "Apollo 7 lifted off on a Saturn IB rocket from Cape Kennedy, Florida, on October 11, 1968, 21 months after the Apollo 1 fire. In Earth orbit the crew flew beside their rocket's spent upper stage, chased it down again the next day, fired the main engine eight times, and sent the first live television from an American spacecraft with a crew. All three caught head colds. They splashed down in the Atlantic Ocean on October 22, and NASA judged the spacecraft ready for its first tests on the way to the Moon and in orbit around it.",
    },
    citations: [
      summary("Background"),
      summary("Ascent Phase"),
      summary("Inflight Activities"),
      summary("Recovery"),
      summary("Conclusions"),
      report('1.0, "Summary"', "page 1-1, PDF page 26"),
      nmc("Description"),
      nasaArticle('Paragraph on the spacecraft: "The spacecraft performed nominally for nearly 11 days"'),
    ],
  },

  crew: {
    value: [
      { name: "Walter M. \"Wally\" Schirra Jr.", role: "Commander" },
      { name: "Donn F. Eisele", role: "Command module pilot" },
      { name: "R. Walter Cunningham", role: "Lunar module pilot" },
    ],
    citations: [
      summary("Background"),
      table("Crew Information - Earth Orbit and Lunar Orbit Missions", "Commander, Command Module Pilot, and Lunar Module Pilot rows", ABTN_CREW),
      reportTable("Photograph \"Apollo 7 flight crew\"", "PDF page 262", 'caption: "Command Module Pilot D. Eisele, Commander W. Schirra, Lunar Module Pilot W. Cunningham"'),
      caption("S68-48662", '"astronauts Walter M. Schirra Jr., commander; Donn F. Eisele, command module pilot; and Walter Cunningham, lunar module pilot"'),
    ],
  },

  launch: {
    value: {
      utc: "1968-10-11T15:02:45.36Z",
      site: "Launch Complex 34, Cape Kennedy, Florida",
      vehicle: "Saturn IB (SA-205)",
    },
    citations: [
      reportTable('Table 2-I, "Sequence of Events"', "page 2-3, PDF page 29", '"Lift-off (15:02:45.36 G.m.t.)" row'),
      report('2.0, "Mission Description"', "page 2-1, PDF page 27"),
      summary("Background"),
      summary("Ascent Phase"),
      nmc("Facts in Brief: Launch Vehicle, Saturn 1B"),
    ],
  },

  duration: {
    value: "260:09:03",
    citations: [sequence("Landing", "2-4"), summary("Recovery"), table("Entry, Splashdown, and Recovery", "Earth Splashdown, GET row", ABTN_ENTRY), nmc("Description")],
  },

  callSigns: {
    value: [{ craft: "Command module", name: "Apollo 7" }],
    citations: [table("Call Signs", "Command Module (\"Apollo 7.\") and Lunar Module (\"None.\")", ABTN_CALL_SIGNS)],
  },

  accomplishments: [
    {
      text: {
        short:
          "Apollo 7 was the first Apollo flight with a crew. It showed that the command and service module, the spacecraft built to carry astronauts to the Moon, worked in space.",
        more:
          "For nearly 11 days, longer than a trip to the Moon and back, almost all of the spacecraft's systems worked as intended. NASA concluded that the command and service module was ready for tests on the way to the Moon and in orbit around it, clearing the way for the lunar orbit flight planned next.",
      },
      citations: [
        report('1.0, "Summary"', "page 1-1, PDF page 26"),
        summary("Conclusions"),
        nmc("Description"),
        nasaArticle('Paragraphs on the spacecraft and the outcome: "nearly 11 days—longer than a journey to the Moon and back" and "qualifying the CSM and clearing the way for the proposed lunar orbit mission to follow"'),
      ],
    },
    {
      text: {
        short:
          "The service module's main engine fired eight times, and every firing worked. Later crews needed this engine to get into orbit around the Moon and back out again.",
        more:
          "The firings lasted from half a second to just over a minute. Two of them set up the rendezvous with the spent rocket stage, two very short ones tested the engine's smallest pushes, and the last one brought the crew home. The engine had no backup, so it had to work every time.",
      },
      citations: [
        report('1.0, "Summary"', "page 1-1, PDF page 26"),
        reportTable('Table 3-V, "Service Propulsion Maneuvers"', "page 3-19, PDF page 52", "firing times of maneuvers 1 to 8, actual column"),
        summary("Inflight Activities"),
        summary("Recovery"),
        nasaArticle('Paragraphs on the service propulsion system: "the crew could not switch to a redundant or backup system" and it "had to fire the CSM into and out of the Moon\'s orbit on later missions, worked perfectly during eight burns lasting from half a second to 67.6 seconds"'),
      ],
    },
    {
      text: {
        short:
          "The crew found the spent rocket stage and flew up close to it, using only the spacecraft's own instruments. That is how a command module would go to meet a lunar module in trouble.",
        more:
          "The rendezvous showed the spacecraft could reach a lunar module whose upper stage was disabled after leaving the Moon. NASA found it could be done with only the onboard computer and optical sightings, but that a way to measure the distance would be extremely desirable for the final approach. Afterward the crew tracked the stage with the sextant, a telescope-like navigation instrument, out to 320 nautical miles (368 miles, or 593 kilometers).",
      },
      citations: [
        summary("Inflight Activities"),
        summary("Conclusions"),
        report('2.0, "Mission Description"', "page 2-1, PDF page 27"),
        timeline("Sextant tracking of S-IVB ended at 320 n mi."),
      ],
    },
    {
      text: {
        short:
          "Apollo 7 sent the first live television from an American spacecraft with a crew aboard, in seven broadcasts.",
        more:
          "Whether to allow television was seriously debated at NASA, and the decision to carry the 4.5-pound (2-kilogram) camera came just before the flight. The broadcasts began on October 14 and showed Earth below and life inside the spacecraft. The early pictures were crude, but they taught the public about spaceflight.",
      },
      citations: [
        summary("Inflight Activities"),
        report('1.0, "Summary"', "page 1-1, PDF page 26"),
        nmc("Description"),
        nasaArticle('Paragraph on television: "Apollo 7 also saw the first live TV broadcast of Americans from space" and "The decision to carry a 4.5-pound video camera was made just before the mission"'),
      ],
    },
    {
      text: {
        short:
          "Apollo 7's spacecraft was the first of a new design, rebuilt after the Apollo 1 fire. At launch its cabin air was a mix of oxygen and nitrogen instead of pure oxygen.",
        more:
          "At launch the cabin held 64 percent oxygen and 36 percent nitrogen. Earlier American crewed flights had used pure oxygen, which was changed on the advice of the Apollo 1 fire investigation board. The spacecraft, CSM 101, was the first Block II command and service module, built to work with a lunar module.",
      },
      citations: [
        report('7.1.4, "Oxygen Enrichment Procedure"', "page 7-6, PDF page 276"),
        summary("Conclusions"),
        summary("Background"),
        { source: "nasm-apollo-7-command-module", locator: 'Object description: "A major redesign of the command module had occurred after the deadly Apollo 1 fire and this mission was the first opportunity to test the first of the new Block II spacecraft (CSM 101) in orbit."' },
      ],
      discrepancy:
        "Apollo by the Numbers (Apollo 7 summary, Conclusions) gives the mix as 65 percent oxygen and 35 percent nitrogen. We follow the mission report, section 7.1.4: 64 percent oxygen and 36 percent nitrogen at launch.",
    },
  ],

  chapters: [
    { id: "launch", title: "Launch" },
    { id: "spent-stage", title: "The spent stage" },
    { id: "in-orbit", title: "Testing in orbit" },
    { id: "coming-home", title: "Coming home" },
  ],

  events: [
    /* ----------------------------- Launch ----------------------------- */
    {
      id: "liftoff",
      title: "Liftoff",
      chapter: "launch",
      elapsed: "000:00:00.36",
      utc: "1968-10-11T15:02:45.36Z",
      text: {
        short:
          "A Saturn IB rocket lifts Apollo 7 off the launch pad in Florida. It is the first Apollo flight with astronauts aboard.",
        more:
          "Apollo 7 lifted off from Launch Complex 34 at Cape Kennedy at 11:02:45 a.m. Eastern Daylight Time on October 11, 1968, 21 months after the Apollo 1 fire. Wally Schirra was the commander, Donn Eisele the command module pilot, and Walt Cunningham the lunar module pilot. The surface winds were the strongest yet seen at the launch of a Saturn rocket. Schirra reported, \"She is riding like a dream.\"",
      },
      citations: [
        reportTable('Table 2-I, "Sequence of Events"', "page 2-3, PDF page 29", '"Lift-off (15:02:45.36 G.m.t.)" row'),
        timeline("Liftoff (umbilical disconnected)."),
        report('2.0, "Mission Description"', "page 2-1, PDF page 27"),
        summary("Background"),
        summary("Launch Preparations"),
        summary("Ascent Phase"),
        nasaArticle('Paragraph on the launch: "Commander Wally Schirra reported, \'She is riding like a dream.\'"'),
      ],
      photo: nasaPhoto(
        "S68-48662",
        1084,
        1600,
        "Black-and-white photo of the white Saturn IB rocket rising on a cloud of exhaust beside its launch tower, framed by two tall palm trees, while a crowd of people in white shirts watches from a lawn.",
      ),
      view: "earth",
      inTour: true,
    },
    {
      id: "in-orbit",
      title: "In orbit, still on the rocket",
      chapter: "launch",
      elapsed: "000:10:26.76",
      utc: "1968-10-11T15:13:11Z",
      text: {
        short:
          "About 10 minutes after liftoff, Apollo 7 is circling Earth. The rocket's empty upper stage, the S-IVB, is still attached.",
        more:
          "The first stage shut down at 2 minutes 24.32 seconds on the mission clock and fell away, and the S-IVB burned for 7 minutes 49.79 seconds. That put Apollo 7 in an orbit 123.3 to 153.7 nautical miles up (about 142 to 177 miles, or 228 to 285 kilometers). On the second trip around Earth, the crew steered the whole stack by hand for 2 minutes 56 seconds to test its controls.",
      },
      citations: [
        timeline("Earth orbit insertion."),
        sequence("Orbital insertion", "2-3"),
        timeline("S-IB outboard engine cutoff."),
        summary("Ascent Phase"),
        summary("Inflight Activities"),
        reportTable('Table 2-II, "Orbital Elements Before and After Maneuvers"', "page 2-5, PDF page 31", "insertion, after maneuver, apogee and perigee, actual column"),
        report('2.0, "Mission Description"', "page 2-1, PDF page 27"),
      ],
      discrepancy:
        "Apollo by the Numbers (Earth Orbit Phase table and Apollo 7 summary) gives the orbit as 152.34 by 123.03 nautical miles, worked out on a spherical Earth, and NSSDCA gives 228 by 282 kilometers. We follow the mission report's Table 2-II, 153.7 by 123.3 nautical miles.",
      view: "earth",
    },

    /* ------------------------- The spent stage ------------------------ */
    {
      id: "separation",
      title: "Flying beside the spent stage",
      chapter: "spent-stage",
      elapsed: "002:55:02.40",
      utc: "1968-10-11T17:57:47Z",
      text: {
        short:
          "Apollo 7 pulls away from the spent rocket stage, turns around, and flies close to it. Later crews will use this move to pull out the lunar module, the craft that lands on the Moon.",
        more:
          "Separation came 2 hours 55 minutes after liftoff. Schirra fired the small thrusters to move 50 feet (15 meters) ahead of the S-IVB, then turned the spacecraft around to face it. Apollo 7 carried no lunar module, so the crew practiced lining up on a white docking target inside the stage's adapter, whose four panels had swung open. One panel had opened fully and then partly closed again, leaving less room to maneuver. About 25 minutes after separation, a short thruster firing started the spacecraft moving away from the stage, to set up a rendezvous the next day.",
      },
      citations: [
        timeline("Separation of CSM from S-IVB."),
        report('2.0, "Mission Description"', "page 2-1, PDF page 27"),
        report('6.2.1, "Mission Description", flight crew report', "page 6-21, PDF page 263"),
        summary("Inflight Activities"),
        nmc('Description: "There was no lunar module or boilerplate unit on this flight."'),
        nasaArticle('Paragraph on separation: "Schirra fired the CSM\'s small rockets to pull 50 feet ahead of the S-IVB, then turned the spacecraft around to simulate rendezvous and docking, as would be necessary to extract a Lunar Module (LM) for future Moon landings"'),
        caption("as07-03-1531", '"The round, white disc inside the open panels of the Saturn IVB is a simulated docking target"'),
        report('11.7, "Adapter Panel Deployment"', "page 11-5, PDF page 332"),
        sequence("First phasing maneuver start", "2-3"),
      ],
      photo: nasaPhoto(
        "as07-03-1531",
        1583,
        1600,
        "The top of the spent S-IVB stage seen from Apollo 7, its four adapter panels spread open like petals around a dark opening with a round white target inside, above the tan desert and blue sea of Sonora, Mexico.",
      ),
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "rendezvous",
      title: "Catching the stage again",
      chapter: "spent-stage",
      elapsed: "029:55:43",
      utc: "1968-10-12T20:58:28Z",
      text: {
        short:
          "The next day, the crew chases down the spent stage and stops about 70 feet (21 meters) from it. It shows the spacecraft could fly to a lunar module that had trouble getting back to it.",
        more:
          "The chase began with the first firing of the service module's main engine, the service propulsion system, at 26 hours 24 minutes 55.7 seconds on the mission clock; the jolt made Schirra yell, \"Yabadabadoo!\" A second firing put Apollo 7 in an orbit just below the stage's, and the final approach began at 29 hours 16 minutes 33 seconds. With no reliable backup measure of the distance to check the computer's solutions against, the crew found the braking hard to judge. They flew beside the tumbling stage until 30 hours 20 minutes, then moved away. The stage fell back into the atmosphere over the Indian Ocean on October 18.",
      },
      citations: [
        sequence("End braking, begin station-keeping", "2-4"),
        timeline("Terminal phase end/start station-keeping."),
        sequence("First service propulsion ignition", "2-3"),
        sequence("Terminal phase initiate start", "2-3"),
        sequence("Separation maneuver start", "2-4"),
        report('3.2.1, "Rendezvous Maneuvers"', "pages 3-2 and 3-3, PDF pages 35 and 36"),
        report('6.2.1, "Mission Description", flight crew report', "page 6-21, PDF page 263"),
        summary("Inflight Activities"),
        report('3.4, "S-IVB and Service Module Entry"', "page 3-5, PDF page 38"),
        nmc('Description: "The S-IVB orbit decayed on 18 October and it impacted in the Indian Ocean"'),
        nasaArticle('Paragraph on the service propulsion system: "causing Schirra to yell, \'Yabadabadoo!,\' like cartoon character Fred Flintstone"'),
      ],
      discrepancy:
        "Section 2.0 of the mission report gives terminal phase initiation as 29:16:45, the onboard computer's time, and section 8.1.3 gives 29:18:34, the ground's; Table 2-I gives 29:16:33, which we follow. Apollo by the Numbers puts the stage's fall at 162:27:15 (09:30 GMT on October 18), as does NSSDCA (9:30 UT); section 3.4 of the mission report gives 168:27:00, also on October 18. We give only the date.",
      view: "spacecraft",
      inTour: true,
    },

    /* ------------------------- Testing in orbit ------------------------ */
    {
      id: "television",
      title: "Live from space",
      chapter: "in-orbit",
      // Apollo by the Numbers gives this moment only to the minute (071:43, 14:45 GMT),
      // so no UTC is given here: 071:43:00 would be 14:45:45, a precision the source does not have.
      elapsed: "071:43:00",
      text: {
        short:
          "The crew sends the first live television from an American spacecraft with astronauts aboard. Their first sign reads, \"From the lovely Apollo room high atop everything.\"",
        more:
          "The 7-minute broadcast began about 71 hours 43 minutes after liftoff, on October 14, as Apollo 7 passed over New Orleans and then Florida. It was the first of seven. Later shows gave a tour of the spacecraft, showed how the crew mixed a fruit drink from powder and water, and showed off the beards they had grown. Schirra, annoyed at an added workload and suffering from a head cold, had put off the first broadcast, planned for October 12.",
      },
      citations: [
        timeline("1st television transmission started."),
        timeline("1st television transmission ended."),
        summary("Inflight Activities"),
        report('1.0, "Summary"', "page 1-1, PDF page 26"),
        nasaArticle('Paragraph on television: "the crew held the first of seven TV broadcasts on Flight Day 4 (Oct. 14)"'),
      ],
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "hurricane",
      title: "A hurricane from above",
      chapter: "in-orbit",
      elapsed: "144:27:00",
      text: {
        short: "From space, the crew photographs Hurricane Gladys, a huge storm swirling over the Gulf of Mexico.",
        more:
          "This picture was taken about 144 hours 27 minutes after liftoff, on the 91st trip around Earth, from 99 nautical miles (114 miles, or 183 kilometers) up. Weather photography was one of the flight's two photography experiments: about 300 of the 500 pictures taken for it showed clouds or other weather, and the views of Hurricane Gladys and Typhoon Gloria were the best yet of tropical storms. The other experiment photographed land and coasts for studies of landforms and cities.",
      },
      citations: [
        caption("as07-07-1877", '"Hurricane Gladys, Gulf of Mexico, as seen from the Apollo 7 spacecraft during its 91st revolution of the earth. Photographed from an altitude of 99 nautical miles, at ground elapsed time of 144 hours and 27 minutes." (time given to the minute; seconds written as 00)'),
        summary("Inflight Activities"),
      ],
      photo: nasaPhoto(
        "as07-07-1877",
        1600,
        1600,
        "Earth's curved horizon against black space, with the white cloud bands of Hurricane Gladys spiraling over blue ocean below.",
      ),
      view: "earth",
    },
    {
      id: "biggest-firing",
      title: "The biggest engine firing",
      chapter: "in-orbit",
      elapsed: "165:00:00.5",
      utc: "1968-10-18T12:02:45Z",
      text: {
        short:
          "The crew fires the main engine for over a minute, its longest firing of the flight. On a trip to the Moon, this engine has to work every time.",
        more:
          "The service propulsion system would put later Apollo spacecraft into orbit around the Moon and send them home. This fifth firing lasted 1 minute 7.0 seconds and changed the spacecraft's speed by 1,691.3 feet per second (about 1,153 miles per hour, or 1,856 kilometers per hour), the biggest change of the flight. Halfway through, the crew took over steering the engine by hand. The firing raised the orbit's high point to 244.2 nautical miles (281 miles, or 452 kilometers) and set up the ground track for the trip home.",
      },
      citations: [
        sequence("Fifth service propulsion ignition", "2-4"),
        reportTable('Table 3-V, "Service Propulsion Maneuvers"', "page 3-19, PDF page 52", "maneuver 5, actual firing time (67.0 seconds) and actual total velocity (1691.3 ft/sec)"),
        report('3.2.2, "Service Propulsion Maneuvers"', "page 3-4, PDF page 37"),
        report('2.0, "Mission Description"', "page 2-2, PDF page 28"),
        summary("Inflight Activities"),
        timeline("5th SPS ignition (to position and size orbital ellipse)."),
        nasaArticle('Paragraph on the service propulsion system, which "had to fire the CSM into and out of the Moon\'s orbit on later missions"'),
      ],
      discrepancy:
        "For the firing's length, the mission report gives 1 minute 7.0 seconds in Table 3-V, 1 minute 7.6 seconds in section 2.0 (as does NASA's article), and 1 minute 7 seconds in section 3.2.2; Apollo by the Numbers gives 1 minute 6.95 seconds and an ignition time of 165:00:00.42. We follow Table 3-V for the length and Table 2-I for the time.",
      view: "earth",
    },

    /* --------------------------- Coming home --------------------------- */
    {
      id: "deorbit",
      title: "Heading home",
      chapter: "coming-home",
      elapsed: "259:39:16.3",
      utc: "1968-10-22T10:42:01Z",
      text: {
        short:
          "Over Hawaii, the main engine fires one last time to slow Apollo 7 down. The spacecraft drops out of orbit toward the Atlantic Ocean.",
        more:
          "This eighth firing, on the 163rd trip around Earth, lasted about 12 seconds. About 4 minutes later the crew cast off the service module, and only the cone-shaped command module went on. Because of their colds, the astronauts had insisted on coming home without their helmets and gloves, so they could clear their ears and throats.",
      },
      citations: [
        sequence("Eighth service propulsion ignition", "2-4"),
        sequence("Eighth service propulsion cutoff", "2-4"),
        reportTable('Table 3-V, "Service Propulsion Maneuvers"', "page 3-19, PDF page 52", "maneuver 8, actual firing time (12.4 seconds)"),
        sequence("Command module/service module separation", "2-4"),
        timeline("8th SPS ignition (deorbit burn)."),
        summary("Recovery"),
        nmc("Description"),
      ],
      discrepancy:
        "Apollo by the Numbers gives the ignition as 259:39:16.36 and the firing as 11.79 seconds; the mission report gives 12.4 seconds in Table 3-V and section 3.2.2, while its Table 2-I times are 11.9 seconds apart. We follow Table 2-I for the time and say about 12 seconds.",
      view: "earth",
      inTour: true,
    },
    {
      id: "parachutes",
      title: "Parachutes open",
      chapter: "coming-home",
      elapsed: "260:03:23",
      utc: "1968-10-22T11:06:08Z",
      text: {
        short:
          "Two small parachutes, called drogues, open first. Then three big main parachutes lower the crew's capsule, the command module, toward the sea.",
        more:
          "Apollo 7 reached the top of the atmosphere, 400,000 feet (122 kilometers) up, at 259 hours 53 minutes 27 seconds, moving at 25,846 feet per second (about 17,622 miles per hour, or 28,360 kilometers per hour). The crew felt a peak of 3.33 g, a little over three times their normal weight. The drogues opened at 260 hours 3 minutes 23 seconds, and the main parachutes, 83.5 feet (25.5 meters) across, 50 seconds later.",
      },
      citations: [
        sequence("Drogue deployment", "2-4"),
        sequence("Main parachute deployment", "2-4"),
        sequence("Entry interface (400 000 feet)", "2-4"),
        reportTable('Table 3-VI, "Trajectory Parameters for Entry"', "page 3-20, PDF page 53", "entry interface space-fixed velocity and maximum entry deceleration, actual column"),
        reportTable('Appendix A, section A.1.13, "Recovery System"', "page A-17, PDF page 360", "earth landing system: two drogue parachutes and three main parachutes with a nominal diameter of 83.5 feet"),
        timeline("Drogue parachute deployed"),
      ],
      discrepancy:
        "Apollo by the Numbers and section 5.16.1 of the mission report give the entry interface as 259:53:26, and Table 3-VI of the report gives drogue deployment as 260:03:25. We follow Table 2-I: 259:53:27 and 260:03:23.",
      view: "earth",
    },
    {
      id: "splashdown",
      title: "Splashdown",
      chapter: "coming-home",
      elapsed: "260:09:03",
      utc: "1968-10-22T11:11:48Z",
      text: {
        short:
          "Apollo 7 splashes down in the Atlantic Ocean after nearly 11 days in space. A helicopter carries the crew to the recovery ship USS Essex.",
        more:
          "The command module landed southeast of Bermuda at 7:11:48 a.m. Eastern Daylight Time on October 22, 1968, at 260 hours 9 minutes 3 seconds on the mission clock. It first floated upside down, until inflatable bags turned it upright 12 minutes later. Navy swimmers attached a flotation collar, and the crew reached the Essex 56 minutes after splashdown.",
      },
      citations: [
        sequence("Landing", "2-4"),
        timeline("Splashdown (went to apex-down)."),
        report('1.0, "Summary"', "page 1-1, PDF page 26"),
        report('8.3.2, "Command Module Location and Retrieval"', "pages 8-11 and 8-12, PDF pages 293 and 294"),
        summary("Recovery"),
        caption("S68-49539", '"U.S. Navy frogmen attach a flotation collar to the Apollo 7 command module during recovery operations in the Atlantic"'),
      ],
      discrepancy:
        "Apollo by the Numbers says the command module was upright within 13 minutes; the mission report's recovery section says 12 minutes, which we follow. The report's summary and Apollo by the Numbers place the landing southeast of Bermuda; the report's recovery section puts it about 290 nautical miles south of Bermuda, and NSSDCA and NASA's photo caption about 200 nautical miles south-southwest. We follow the report's summary.",
      photo: nasaPhoto(
        "S68-49539",
        1600,
        1040,
        "The scorched, cone-shaped Apollo 7 command module floats in gray-blue water, ringed by an orange flotation collar, with two white balloon-like bags on top. Two Navy swimmers in black wetsuits stand on the collar working on the spacecraft.",
      ),
      view: "earth",
      inTour: true,
    },
  ],

  whereNow: [
    {
      value: {
        object: "Apollo 7 command module",
        museum: "Frontiers of Flight Museum",
        place: "Dallas, Texas",
      },
      citations: [
        { source: "nssdca-apollo-current-locations", locator: 'Apollo 7, Command Module: "Frontiers of Flight Museum, Dallas, Texas"' },
        nmc('Description: "The Apollo 7 Command Module is on display at the Frontiers of Flight Museum, Dallas, Texas."'),
        { source: "apollo-7-frontiers-of-flight-exhibits", locator: 'Space Flight gallery: "It includes the Apollo 7 Command Module"' },
        { source: "nasm-apollo-7-command-module", locator: 'Display Status: "This object is not on display at the National Air and Space Museum. It is either on loan or in storage."' },
      ],
    },
  ],
};
