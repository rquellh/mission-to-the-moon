/**
 * Gemini 7 (NASA wrote it "Gemini VII"): the two-week endurance flight,
 * December 4-18, 1965, and the target of the first rendezvous of two
 * crewed spacecraft, with Gemini 6A (Gemini VI-A) on December 15.
 *
 * Event times come from the Gemini Program Mission Report for Gemini VII
 * (MSC-G-R-66-1), the canonical source for this mission: elapsed times as
 * its Table 4.2-I ("Sequence of Events") prints the actual times, and, for
 * moments that table does not list, its other sections, named in each
 * citation. No NASA or Internet Archive copy of the report was found; it
 * is cited from NASA's scan in the Virtual AGC project's library at
 * ibiblio.org, by printed page and then the scan's PDF page. Where another
 * source gives a different value, the `discrepancy` field says what it
 * gives and which we follow.
 *
 * Elapsed times are Gemini VII's ground elapsed time (g.e.t.), counted from
 * its lift-off at 19:30:03.702 G.m.t. on December 4, 1965 (Table 4.2-I).
 * Where a source gives a time only to the minute, seconds are written as 00
 * and the text says "about". Gemini VI-A's times, printed on its own clock,
 * are moved to Gemini VII's by adding 258:07:22.77, the Gemini VII elapsed
 * time of Gemini VI-A's lift-off (Gemini VII report, section 4.1; our sum;
 * see flight.ts).
 *
 * Universal times are given only where a source states the clock time.
 * Eastern Standard Time is converted by adding 5 hours (our arithmetic).
 *
 * Unit conversions in the text (nautical miles and kilometers to miles,
 * feet to meters) are our arithmetic on the cited values, rounded to the
 * digits the source gives.
 *
 * The flight path itself (orbits, burns, splashdown point) is described in
 * flight.ts, not here.
 */
import type { Citation, Mission, Photo } from "../../types.ts";

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const CHRONOLOGY_1965 = "https://www.nasa.gov/history/SP-4002/p3a.htm";
const CHRONOLOGY_TABLE_A = "https://www.nasa.gov/history/SP-4002/app1a.htm";
const CHRONOLOGY_TABLE_B = "https://www.nasa.gov/history/SP-4002/app1b.htm";
const NMC_GEMINI_7 = "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1965-100A";

/** The Gemini VII mission report, at a printed page (and the scan's PDF page). */
function report(locator: string): Citation {
  return { source: "gemini-6a-gemini-vii-mission-report", locator };
}

/** A row of the report's Table 4.2-I, the sequence of events, quoted as printed. */
function sequence(row: string, page: "4-12 (PDF page 90)" | "4-13 (PDF page 91)"): Citation {
  return report(`Table 4.2-I, "Sequence of Events" (page ${page}), "${row}" row, actual time`);
}

const SUMMARY = (page: "1-1" | "1-2" | "1-3", words: string): Citation =>
  report(`Section 1.0, "Mission Summary" (page ${page}, PDF page ${{ "1-1": 31, "1-2": 32, "1-3": 33 }[page]}): ${words}`);
const ACTUAL_MISSION = (page: "4-1" | "4-3" | "4-4" | "4-5" | "4-6" | "4-7", words: string): Citation =>
  report(`Section 4.1, "Actual Mission" (page ${page}, PDF page ${{ "4-1": 79, "4-3": 81, "4-4": 82, "4-5": 83, "4-6": 84, "4-7": 85 }[page]}): ${words}`);

/** The Gemini chronology's entries for 1965 (Part III (A)). */
function chronology(entry: string): Citation {
  return { source: "gemini-chronology", locator: `Part III (A), ${entry}`, url: CHRONOLOGY_1965 };
}

/** Appendix 1, Table A (General) of the Gemini chronology, Gemini VII column. */
function chronologyTable(rows: string): Citation {
  return { source: "gemini-chronology", locator: `Appendix 1, Table A (General), VII column: ${rows}`, url: CHRONOLOGY_TABLE_A };
}

/** On the Shoulders of Titans, chapter XII (printed page; the PDF page is 21 more). */
function titans(page: number, words: string): Citation {
  return { source: "on-the-shoulders-of-titans", locator: `Chapter XII, "Spirit of 76", page ${page} (PDF page ${page + 21}): ${words}` };
}

/** NSSDCA's Master Catalog page for Gemini 7. */
function nmc(section: string): Citation {
  return { source: "nssdca-master-catalog", locator: `"Gemini 7" (1965-100A), ${section}`, url: NMC_GEMINI_7 };
}

/** NASA's Gemini VII mission page. */
function nasaMission(section: string): Citation {
  return { source: "gemini-7-nasa-mission-page", locator: section };
}

/** NASA's article "Dual Gemini Flights Achieved Crucial Spaceflight Milestones". */
function dual(section: string): Citation {
  return { source: "gemini-7-nasa-dual-gemini-flights", locator: section };
}

/** The Smithsonian's page for the Gemini VII capsule. */
function nasm(section: string): Citation {
  return { source: "gemini-7-nasm-capsule", locator: section };
}

/** A photo from the NASA Image and Video Library, saved under public/media/gemini-7/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/gemini-7/${nasaId.toLowerCase()}.jpg`,
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
  id: "gemini-7",
  program: "gemini",
  name: "Gemini 7",
  kind: "flight",
  destination: "earth-orbit",

  summary: {
    text: {
      short:
        "Gemini 7 kept Frank Borman and Jim Lovell in orbit for almost 14 days in December 1965, to test whether people could stay in space longer than a Moon landing mission would need. Partway through, Gemini 6A flew up to meet them: the first meeting of two spacecraft with crews.",
      more:
        "Gemini 7 lifted off from Cape Kennedy, Florida, on December 4, 1965. Its main goals were to fly for about 14 days and to learn what such a long flight did to the crew's bodies. Borman and Lovell wore new lightweight spacesuits that they could take off, and they had 20 experiments to do. After the Agena target rocket for Gemini 6 was lost on its way to orbit in October, Gemini 7 also became the target for Gemini 6A. On December 15, Wally Schirra and Tom Stafford caught up with Gemini 7 and the two spacecraft flew in formation for hours. Gemini 7 splashed down in the Atlantic Ocean on December 18, 330 hours 35 minutes 1 second after liftoff, the longest spaceflight yet.",
    },
    citations: [
      SUMMARY("1-1", "launched \"at 2:30 p.m.e.s.t., on December 4, 1965\"; \"The primary objectives of the Gemini VII mission were to demonstrate manned orbital flight for approximately 14 days and to evaluate the physiological effects of long-duration flight on the crew members\"; secondary objectives to \"provide a passive target for the spacecraft 6 rendezvous\", \"conduct 20 experiments, wear a lightweight pressure suit\""),
      nmc("Spacecraft description: the general objectives of the Gemini program \"included: long duration flights in excess of of the requirements of a lunar landing mission\""),
      nasm("Object description: \"Their primary mission was to show that humans could live in weightlessness for 14 days\""),
      dual("Paragraphs on the original Gemini VI plan (the Agena \"failed to reach orbit\") and the plan to send Gemini VI to meet Gemini VII"),
      sequence("Landing", "4-13 (PDF page 91)"),
      nasaMission("Mission Overview: \"Total mission elapsed time was 330 hours, 35 minutes, and 1 second, making this the longest anyone had ever stayed in space.\""),
      chronology("December 4, 1965: the Gemini VII mission entry"),
    ],
  },

  crew: {
    value: [
      { name: "Frank Borman", role: "Command pilot" },
      { name: "James A. Lovell, Jr.", role: "Pilot" },
    ],
    citations: [
      SUMMARY("1-1", "\"The spacecraft was manned by Astronaut Frank Borman, command pilot, and Astronaut James A. Lovell, Jr., pilot.\""),
      nasaMission("Mission Facts: \"Crew: Frank F. Borman II (Command Pilot) and James A. Lovell Jr. (Pilot)\""),
      chronologyTable("Flight crew, Command pilot and Pilot rows, \"Borman\" and \"Lovell\""),
    ],
  },
  crewPhoto: nasaPhoto(
    "s65-41825",
    1200,
    960,
    "James A. Lovell, Jr., left, and Frank Borman, right, stand in light blue flight suits and flight helmets, oxygen masks hanging loose, behind a small model of the Gemini spacecraft, with an American flag at left.",
  ),

  launch: {
    value: {
      utc: "1965-12-04T19:30:03.702Z",
      site: "Launch Complex 19, Cape Kennedy, Florida",
      vehicle: "Titan II Gemini Launch Vehicle (GLV-7)",
    },
    citations: [
      sequence("Lift-off (pad disconnect separation) (19:30:03.702 G.m.t.)", "4-12 (PDF page 90)"),
      ACTUAL_MISSION("4-1", "\"Lift-off of the Gemini VII vehicle occurred on December 4, 1965, at 19:30:03.702 G.m.t.\""),
      SUMMARY("1-1", "\"launched from Complex 19, Cape Kennedy, Florida\""),
      report('Section 3.0, "Gemini VII Vehicle Description" (page 3-1, PDF page 37): "spacecraft 7 and Gemini launch vehicle 7 (GLV-7)"'),
      nasaMission("Mission Facts: \"Launch Date: Dec. 4, 1965, 2:30:03 p.m. EST (19:30:03 UT)\", Launch Site, and Launch Vehicle"),
    ],
  },

  duration: {
    value: "330:35:01",
    citations: [
      sequence("Landing", "4-13 (PDF page 91)"),
      chronologyTable("\"G.E.T. to touchdown (hr; min; sec)\" row, 330:35:01"),
      nasaMission("Mission Facts: \"Duration: 330 hours, 35 minutes, 1 second (13 days, 18 hours, 35 minutes, 1 second)\""),
      titans(294, "\"On 18 December 1965, after 330 hours, 35 minutes, 01 second, Gemini VII came to rest\""),
    ],
  },

  accomplishments: [
    {
      text: {
        short:
          "Gemini 7 tested a skill Apollo needed for the Moon: staying in space a long time. Borman and Lovell lived and worked in orbit for two weeks and came home in good condition.",
        more:
          "One of Project Gemini's goals was flights longer than a Moon landing mission would need, and Gemini 7 was its last long flight. Before it flew, NASA's chief of medical programs, Dr. Charles Berry, said of the 14-day flight, \"The additional data will allow us to medically commit man to a lunar mission.\" Afterward, doctors found Borman and Lovell in better shape than the crew of the eight-day Gemini 5 flight had been.",
      },
      citations: [
        titans(294, "Berry, after the flight: \"They were in better physiologic shape than the V crew.\""),
        titans(277, "\"as Cooper and Conrad had learned in the eight-day mission\""),
        titans(278, "\"Because it was the last long-duration mission, its medical experiments were particularly important in assessing man's capabilities for the lunar landing program.\""),
        SUMMARY("1-1", "\"The crew completed the flight in good physical condition and demonstrated full control of the spacecraft and competent management of all aspects of the mission.\""),
        nmc("Spacecraft description: the general objectives of the Gemini program \"included: long duration flights in excess of of the requirements of a lunar landing mission\""),
        dual("Paragraph quoting \"Charles Berry, M.D., chief of Medical Programs at the Manned Spacecraft Center\", on the flight to come: \"The mission will show us that man, indeed, can adapt.\" \"The additional data will allow us to medically commit man to a lunar mission.\""),
        SUMMARY("1-3", "\"Initial postflight medical evaluation of the crew reveals that their condition was generally better than that observed in some crew men after shorter missions.\""),
        nasm("Object description: \"These two achievements were critical steps on the road to the Apollo Moon landing.\""),
      ],
    },
    {
      text: {
        short: "At almost 14 days, Gemini 7 was the longest spaceflight yet. Its record lasted until 1970.",
        more:
          "Borman and Lovell held the world record for the longest human spaceflight until the 17-day Soyuz 9 flight in June 1970, and the American record until the Skylab missions of 1973 and 1974.",
      },
      citations: [
        dual("\"Borman and Lovell held the world record for the longest human spaceflight until the 17-day Soyuz 9 mission in June 1970 and were U.S. record holders until the Skylab missions in 1973 and 1974.\""),
        nasm("Object description: \"Their primary mission was to show that humans could live in weightlessness for 14 days, a record that would stand until 1970.\""),
        nasaMission("Mission Overview: \"making this the longest anyone had ever stayed in space\""),
      ],
    },
    {
      text: {
        short: "Gemini 7 was the target for the first rendezvous in space: Gemini 6A met it in orbit, and the two flew side by side for hours.",
        more:
          "Lights, a radar transponder that answered Gemini 6A's radar, and an extra antenna were added to Gemini 7 for this job. During the meeting its crew kept it pointed so the transponder could do its work, and each pilot also took a turn flying beside Gemini 6A. It was the first time two spacecraft were steered toward each other by their crews.",
      },
      citations: [
        titans(280, "\"target acquisition and orientation lights, a radar transponder, a spiral antenna, and a voltage booster were installed on Spacecraft 7\" (the sentence begins on page 279)"),
        titans(282, "\"VII's radar transponder was interrogated as Borman and Lovell passed over Cape Kennedy to ensure that it would answer VI-A's radar transmissions\""),
        report('Section 7.1.2.3.4, "Rendezvous" (page 7-52, PDF page 308): "The main contribution it made was to maintain the correct attitude for L-band radar transponder operation during the final stages of rendezvous"; "Station keeping with spacecraft 6 was accomplished by both crew members of spacecraft 7"'),
        SUMMARY("1-2", "\"each spacecraft 7 crew member spent approximately 5 minutes conducting station keeping with spacecraft 6 as the passive target vehicle\""),
        nmc("Mission Profile: \"This marked the first time two spacecraft were maneuvered with respect to each other by their crews.\""),
      ],
    },
    {
      text: {
        short: "Borman and Lovell tested a new lightweight spacesuit that could be taken off in flight, and completed, in whole or in part, 18 of their 20 experiments.",
        more:
          "Gemini 7 carried more experiments than any other Gemini flight, and eight of them were medical. Because it was the last long Gemini flight, they mattered for judging whether people could manage the trip to the Moon. Equipment failures cost two experiments.",
      },
      citations: [
        titans(278, "\"Gemini VII carried more experiments than any other flight in the program. Because it was the last long-duration mission, its medical experiments were particularly important in assessing man's capabilities for the lunar landing program. Of 20 experiments, eight were medical\"; the lightweight suit, \"designed to be removed during flight\""),
        SUMMARY("1-3", "\"During the course of the mission, 18 of the planned 20 experiments were partially or entirely executed. A failure in equipment for the D-5 and MSC-12 experiments caused the loss of these two experiments.\""),
        dual("\"They are wearing lightweight pressure suits designed to be removable during their marathon 14-day mission.\""),
      ],
    },
  ],

  chapters: [
    { id: "launch", title: "Launch" },
    { id: "orbit", title: "Life in orbit" },
    { id: "company", title: "Company" },
    { id: "home", title: "Coming home" },
  ],

  events: [
    /* ----------------------------- Launch ---------------------------- */
    {
      id: "liftoff",
      handsOn: "stages",
      title: "Liftoff for two weeks",
      chapter: "launch",
      elapsed: "000:00:00",
      utc: "1965-12-04T19:30:03.702Z",
      text: {
        short: "A Titan II rocket lifts Frank Borman and Jim Lovell off the pad at Cape Kennedy. Their plan: stay in orbit for 14 days.",
        more:
          "Liftoff came at 2:30 p.m. Eastern Standard Time on December 4, 1965, 3.702 seconds later than planned. \"We're on our way, Frank!\" Lovell shouted. About six minutes later the spacecraft separated from the rocket, and Borman turned around to find the spent second stage. For about 15 minutes the crew flew beside it, no closer than 60 feet (18 meters), while fuel spraying from it made it tumble.",
      },
      citations: [
        sequence("Lift-off (pad disconnect separation) (19:30:03.702 G.m.t.)", "4-12 (PDF page 90)"),
        ACTUAL_MISSION("4-1", "\"the lift-off of the Gemini VII space vehicle occurred 3.702 seconds later than the planned G.m.t.\"; after separation, \"a 180° turnaround\" and station keeping with the second stage"),
        nasaMission("Mission Facts: \"Launch Date: Dec. 4, 1965, 2:30:03 p.m. EST (19:30:03 UT)\""),
        titans(280, "\"'We're on our way, Frank!' Lovell shouted.\"; \"Borman wheeled Gemini VII around to find the launch vehicle\""),
        sequence("Spacecraft separation (shaped charge fire)", "4-13 (PDF page 91)"),
        SUMMARY("1-1", "station keeping \"for about a 15-minute period\"; \"profuse second-stage fuel venting which was apparently causing it to tumble\"; \"a minimum distance of 60 feet between vehicles was maintained\""),
      ],
      discrepancy:
        "NSSDCA says the station keeping lasted 17 minutes at distances from 6 meters, and On the Shoulders of Titans (page 280) that Borman came within 15 meters. We follow the mission report: about 15 minutes, no closer than 60 feet.",
      photo: nasaPhoto(
        "s65-61650",
        739,
        1600,
        "The white-and-black Titan II rocket rises on a bright flame beside the red service tower at Pad 19, with orange-tinted smoke billowing at left and a low building in the foreground.",
      ),
      view: "earth",
      inTour: true,
    },

    /* ------------------------- Life in orbit -------------------------- */
    {
      id: "suit-off",
      title: "Out of the spacesuit",
      chapter: "orbit",
      elapsed: "045:03:00",
      text: {
        short: "Almost two days into the flight, Jim Lovell starts taking off his spacesuit. Without it he is cooler and can move more easily in the tiny cabin.",
        more:
          "Gemini 7 carried new lightweight suits, made to be taken off in flight, because the Gemini 5 crew had found flying in heavier suits tiring. At first NASA's managers wanted one pilot to stay suited at all times, so Borman kept his on and sweated while Lovell stayed comfortable. At about 148 hours they traded, and some 20 hours later Lovell took his suit off again. From then on both flew without suits, except for the meeting with Gemini 6A and the trip home.",
      },
      citations: [
        ACTUAL_MISSION("4-3", "\"The pilot began removing his pressure suit at 45:03:00 g.e.t.\""),
        report('Section 7.1.2.3.3, "Pressure suit operation" (page 7-52, PDF page 308): "In addition to increasing pilot comfort, the suit-off configuration increased mobility."'),
        dual("Borman: \"One of the things we got from Gemini V was that flying in the heavier spacesuits was very debilitating ... So we were able to convince NASA that we should have a lightweight pressure suit\""),
        titans(281, "\"one crewman should be suited at all times\"; \"Even sitting with his suit completely unzipped and his gloves off, Borman sweated while Lovell remained dry.\""),
        SUMMARY("1-3", "\"At approximately 148 hours g.e.t., the pilot donned his suit and the command pilot removed his.\" \"for the remainder of the mission, except for the rendezvous and reentry phases, the crew did not wear pressure suits\""),
        chronology("December 4, 1965: \"Some 20 hours later Lovell again removed his suit\""),
      ],
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "missile",
      title: "Watching a missile launch",
      chapter: "orbit",
      elapsed: "047:55:00",
      text: {
        short: "From orbit, the crew tracks a Polaris missile fired from a submarine. It is one of their 20 experiments.",
        more:
          "At about 47 hours 55 minutes, Borman and Lovell followed the missile with an instrument for experiment D-4/D-7, which measured the light given off by things on Earth and in the sky. Over the two weeks it also measured the Moon, stars, lightning, a rocket sled, a large fire in Africa, and Gemini 6A. Other experiments recorded the crew's sleep, kept track of the calcium in everything they ate, photographed weather and land, and tried sending messages by laser.",
      },
      citations: [
        ACTUAL_MISSION("4-3", "\"A very successful experiment D-4/D-7 sequence was obtained of a Polaris launch from a submarine at 47:55:00 g.e.t.\" (given to the minute; seconds written as 00)"),
        report('Section 8.1, "Experiment D-4/D-7, Celestial Radiometry and Space Object Radiometry" (page 8-5, PDF page 367): the objective "to obtain spectral irradiance information about terrestrial features and celestial objects"; measurements of "the moon, selected stars", "a Polaris missile launch", "lightning, a rocket-sled run", "spacecraft 6 during station keeping and separation of the two spacecraft, a large fire in Africa"'),
        titans(279, "the inflight sleep analysis, the calcium-balance study (\"a complete record of body intake and wastes\"), and \"an in-flight laser transmitter\" to establish \"optical communications from space\""),
        nasaMission("Mission Overview: \"synoptic terrain photography, synoptic weather photography\""),
      ],
      photo: nasaPhoto(
        "s65-63797",
        1600,
        1600,
        "Looking down from orbit at a hazy blue scene crossed by wispy streaks of thin white cloud; a thin, straight, bright white line rising from the bottom edge at lower right is the trail of a Polaris missile climbing after its underwater launch.",
      ),
      view: "earth",
    },
    {
      id: "circularize",
      title: "A round orbit for the visitors",
      chapter: "orbit",
      elapsed: "119:11:55",
      text: {
        short:
          "Borman and Lovell fire their thrusters twice to make their orbit nearly round, about 185 miles (300 kilometers) high. It is the orbit Gemini 6A's lost target rocket would have flown, so the chase can go as planned.",
        more:
          "The first firing, at 119 hours 11 minutes 55 seconds, lasted 1 minute 15.6 seconds and raised the low point of the orbit; the second, 43 minutes later, lowered the high point. Gemini 7 was left in an orbit 162.8 by 160.5 nautical miles high, which could have lasted more than 100 days. Earlier firings, on the first day and the third, had raised the orbit so it would last the two weeks and adjusted its timing. About a third of the maneuvering fuel was left.",
      },
      citations: [
        report('Table 4.2-I, "Sequence of Events" (page 4-13, PDF page 91), first "Circularization maneuver" row, actual time 119:11:55'),
        report('Table 4.3-II, "Gemini VII Maneuvers - Concluded" (page 4-24, PDF page 102), circular perigee adjust (119:11:55, Δt 75.6 s) and circular apogee adjust (119:55:01, yaw 178.1 degrees), actual column'),
        report('Table 4.3-III, "Comparison of Orbital Elements for Maneuvers" (page 4-25, PDF page 103), circularize revolution 75/76, after maneuver, actual final column: apogee 162.8, perigee 160.5 n. mi.'),
        ACTUAL_MISSION("4-4", "\"The first was a posigrade perigee adjust maneuver\"; \"The second was a retrograde apogee adjust maneuver\"; \"The OAMS propellant remaining after the two maneuvers was approximately 33 percent of that loaded before the flight.\"; the phasing maneuver at 69:43:19 \"to adjust the phase of the orbit\""),
        report('Section 4.1, "Actual Mission" (page 4-2, PDF page 80): the perigee adjust maneuver at 03:47:59 and the charts showing "the required altitudes for 14 days orbital lifetime"'),
        titans(276, "\"Gemini VII's flight plan was altered to circularize the orbit, so Spacecraft 7 would travel in the same path that the Agena would have used.\" and \"Rendezvous plans remained unchanged.\""),
        titans(282, "\"In a nearly circular orbit of 300 kilometers, the spacecraft's orbital lifetime was now theoretically over 100 days. The friendly target was ready.\""),
      ],
      discrepancy:
        "NSSDCA gives the circular orbit as 299.7 by 303.7 km. We follow the mission report's Table 4.3-III, final values after the maneuver, 162.8 by 160.5 nautical miles.",
      view: "earth",
      inTour: true,
    },

    /* ----------------------------- Company ---------------------------- */
    {
      id: "gemini-6a-launch",
      title: "Company is coming",
      chapter: "company",
      elapsed: "258:07:22.77",
      utc: "1965-12-15T13:37:26.47Z",
      text: {
        short: "Back at Cape Kennedy, Gemini 6A lifts off with Wally Schirra and Tom Stafford. Their job: catch up with Gemini 7, which is about 1,240 miles (1,992 kilometers) ahead when they reach orbit.",
        more:
          "Gemini 6A lifted off on December 15 from the same launch pad, 10 days 18 hours 7 minutes after Gemini 7. Passing near Cape Kennedy, Borman and Lovell saw only clouds, but they followed the rocket's climb by eye and with their experiment instrument, and a few minutes later caught a glimpse of the other spacecraft and its trail. Then they put their suits back on and waited for company to arrive.",
      },
      citations: [
        ACTUAL_MISSION("4-6", "\"Gemini VI-A was launched at 13:37:26.47 G.m.t. (258:07:22.77 g.e.t. of Gemini VII)\"; \"The actual lift-off was not seen from spacecraft 7, but tracking of powered flight was achieved both visually and with experiment D-4/D-7 equipment.\"; \"At approximately 259:00 g.e.t, both pilots put their pressure suits back on for rendezvous.\""),
        titans(286, "\"Borman and Lovell in Gemini VII, passing near the Cape Kennedy area, saw nothing except clouds\"; over Tananarive \"they saw VI-A's contrail and got a brief glimpse of the visitors' spacecraft. They put on their suits and waited for company to arrive.\"; \"At insertion, the chase vehicle trailed its target by 1992 kilometers.\""),
        chronology("December 15, 1965: Gemini VI-A \"was launched from complex 19 at 8:37 a.m., e.s.t.\", \"crewed by command pilot Astronaut Walter M. Schirra, Jr., and pilot Astronaut Thomas P. Stafford\""),
        SUMMARY("1-1", "Gemini VII \"was launched from Complex 19, Cape Kennedy, Florida\""),
        sequence("Lift-off (pad disconnect separation) (19:30:03.702 G.m.t.)", "4-12 (PDF page 90)"),
      ],
      discrepancy: "NSSDCA says Gemini 6A trailed Gemini 7 by about 1,900 km at insertion. We follow On the Shoulders of Titans, 1992 km.",
      view: "earth",
    },
    {
      id: "rendezvous",
      title: "Visitors",
      chapter: "company",
      elapsed: "263:58:00",
      text: {
        short:
          "Borman and Lovell spot a point of light: Gemini 6A, closing in. It brakes with its thrusters, and a few minutes later it is flying right beside them, the first meeting of two spacecraft with crews.",
        more:
          "Gemini 7's part was to hold its attitude so its radar transponder pointed at the visitor, with its lights on. Borman and Lovell first saw Gemini 6A just before sunset, a point of reflected light 2 to 3 miles away against the dark Earth. From about half a mile they could watch its thrusters fire, thin streams of glowing haze about 40 feet (12 meters) long, as Gemini 6A braked at about 263 hours 58 minutes. At 264 hours 3 minutes 22.77 seconds, about 120 feet (37 meters) apart and no longer moving toward each other, the two began station keeping, flying in formation. For more than five hours the two flew in formation, sometimes only a foot apart, and both Gemini 7 pilots took a turn flying beside Gemini 6A.",
      },
      citations: [
        SUMMARY("1-2", "\"The rendezvous of spacecraft 6 with spacecraft 7 was accomplished at 263:58 g.e.t.\" (given to the minute; seconds written as 00; it is 5:50:37 on Gemini 6A's clock, our arithmetic, when braking began); \"Station keeping of the two vehicles was conducted for about three and one-half orbits.\""),
        chronology("December 15, 1965: \"Two midcourse corrections preceded final braking maneuvers at 5 hours 50 minutes into the flight. Rendezvous was technically accomplished and stationkeeping began some 6 minutes later when the two spacecraft were about 120 feet apart and their relative motion had stopped.\""),
        { source: "gemini-chronology", locator: 'Appendix 1, Table B (Orbital Operations), VI-A rows: Station keeping, Ground Elapsed Time "To begin (hr:min:sec)" 5:56:00 on Gemini 6A\'s clock, which is 264:03:22.77 on Gemini 7\'s (Gemini 6A\'s clock plus 258:07:22.77, the Gemini 7 elapsed time of its liftoff, Gemini VII report page 4-6: our sum)', url: CHRONOLOGY_TABLE_B },
        { source: "gemini-6a-voice-transcript", locator: 'Page 72 (PDF page 73), 05:50:34 on Gemini 6A\'s clock, pilot: "Brake at .48 nautical miles."' },
        report('Section 7.1.2.3.4, "Rendezvous" (page 7-52, PDF page 308): the attitude "for L-band radar transponder operation"; "Spacecraft 7 turned on its docking and acquisition lights"; "acquired spacecraft 6 visually as a point of reflected light against the dark earth background just prior to sunset at a range of 2 to 3 miles"; "thin streams of light haze shooting out approximately 40 feet from the spacecraft"; "Station keeping with spacecraft 6 was accomplished by both crew members of spacecraft 7"'),
        ACTUAL_MISSION("4-6", "\"After closing to approximately 1/2 mile, the actual thruster firings of spacecraft 6 could be seen by the Gemini VII crew.\""),
        titans(288, "\"For more than three Earth revolutions, the two spacecraft stayed at ranges of from 0.30 meters to 90 meters.\""),
        chronology("December 15, 1965: \"Stationkeeping maneuvers continued for three and a half orbits at distances from 1 to 300 feet.\""),
      ],
      discrepancy:
        "The two times mark different moments: the Gemini VII report's rendezvous at 263:58 is 5:50:37 on Gemini 6A's clock (our arithmetic), when the chronology says final braking began, and the chronology's station keeping began about 6 minutes later, at 5:56:00 on Gemini 6A's clock. NSSDCA gives the start of station keeping as 2:33 p.m. EST, at a distance of 110 meters.",
      photo: nasaPhoto(
        "s65-63197",
        1581,
        1600,
        "Gemini 7 seen close up from Gemini 6A: the white spacecraft's narrow nose points left and its wide, dark end, trailing loose wires, faces right, with the blue Earth and white clouds curving behind it. Part of Gemini 6A's window frame shows at upper left.",
      ),
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "apart-for-the-night",
      title: "Company for the night",
      chapter: "company",
      elapsed: "269:30:00",
      text: {
        short: "Gemini 6A backs away for the night and settles about 10 miles (16 kilometers) from Gemini 7. \"We have company tonight,\" Borman radios.",
        more:
          "At about 269 hours 30 minutes Gemini 6A fired its thrusters to move away, and Borman and Lovell measured the maneuver with their D-4/D-7 instrument. The next day, after a Christmas joke from the visitors, Schirra said goodbye: \"Really a good job, Frank and Jim. We'll see you on the beach.\" Gemini 6A fired its retrorockets at 283 hours 23 minutes on Gemini 7's clock and landed in the Atlantic, leaving Gemini 7 alone again for its last two days in orbit, about 47 hours.",
      },
      citations: [
        ACTUAL_MISSION("4-6", "\"At approximately 269:30 g.e.t., the Gemini VI-A crew performed a separation maneuver, and the Gemini VII crew obtained a D-4/D-7 experiment sequence of this maneuver.\" (given to the minute; seconds written as 00)"),
        titans(289, "\"Eventually, the crews settled down 16 kilometers apart. Borman, who frequently caught sight of Gemini VI-A in the distance, remarked to the Rose Knot Victor tracking ship communicator, 'We have company tonight.'\"; the \"Jingle Bells\" joke; \"Schirra said, 'Really a good job, Frank and Jim. We'll see you on the beach.'\""),
        { source: "gemini-chronology", locator: 'Appendix 1, Table A (General), VI-A column: "G.E.T. to retrofire (hr; min; sec)" row, 25:15:58 (283:23:20.77 on Gemini VII\'s clock, our sum)', url: CHRONOLOGY_TABLE_A },
        sequence("Landing", "4-13 (PDF page 91)"),
      ],
      discrepancy:
        "On the Shoulders of Titans (page 291) says that \"With VI-A gone and almost three days left, the mission began to drag.\" From Gemini 6A's retrofire, 283:23:20.77, to Gemini 7's landing, 330:35:01, is 47 hours 11 minutes 40.23 seconds (our arithmetic), about two days; we follow the mission report's times. The chronology ends Gemini 6A's station keeping 11 hours 13 minutes 29 seconds after its liftoff, 269:20:51.77 on Gemini 7's clock (our arithmetic), and says it withdrew to about 30 miles; NSSDCA says roughly 50 km. We follow the Gemini VII mission report for the time and On the Shoulders of Titans for the distance.",
      view: "spacecraft",
    },

    /* --------------------------- Coming home -------------------------- */
    {
      id: "wearing-out",
      title: "Wearing out",
      chapter: "home",
      elapsed: "286:57:00",
      text: {
        short: "Two parts of the fuel cells that make Gemini 7's electricity have grown weak and are switched off. Some small steering thrusters are failing too, but the flight goes on.",
        more:
          "At about 286 hours 57 minutes, fuel cell stacks 2A and 2C were taken off line because they were making too little current; the other four stacks kept supplying the power until the batteries joined them for the trip home. Since the eighth day the crew had mostly let Gemini 7 drift, to save fuel, after venting from the spacecraft's water boiler kept setting it turning. After about 283 hours, two thrusters that turned the spacecraft to the right also began to fail, and the crew used other thrusters to stop it swinging. The last days dragged. Borman read Mark Twain's Roughing It, and Lovell read Drums Along the Mohawk.",
      },
      citations: [
        SUMMARY("1-2", "\"at 286:57 ground elapsed time (g.e.t.), these stacks were taken off line because they were producing considerably less than the minimum specified level of current. The remaining four stacks (1A, 1B, 1C, and 2B) of the fuel cell continued to furnish the necessary electrical requirements until preparations were started for retrofire and reentry. The main batteries were placed on line at that time\"; \"the yaw-right orbital-attitude thrusters which exhibited poor performance after 283 hours of flight\" (given to the minute; seconds written as 00)"),
        ACTUAL_MISSION("4-5", "\"On the eighth day of the mission (Dec. 11), rates began building up as a result of water-boiler venting, necessitating higher OAMS propellant usage to keep the rates low. The decision was made to assume drifting flight in order to conserve fuel.\""),
        ACTUAL_MISSION("4-7", "\"Because of the drifting mode of flight during the 13th day (Dec. 17), many of the activities were curtailed\"; \"The crew was advised to use other thrusters to reduce excessive yaw rates because of the degraded condition of thrusters 3 and 4.\""),
        titans(291, "\"While in drifting flight, Borman read some of Mark Twain's Roughing It, Lovell part of Drums along the Mohawk by Walter D. Edmonds\""),
        titans(292, "\"the fuel cell was a greater concern\"; \"Test results in St. Louis, however, showed that the electrical system would carry them all the way.\""),
      ],
      view: "spacecraft",
    },
    {
      id: "retrofire",
      title: "Retrofire",
      chapter: "home",
      elapsed: "329:58:04",
      utc: "1965-12-18T13:28:07Z",
      text: {
        short: "In the dark over the Pacific Ocean, four small rockets fire one after another to slow Gemini 7 down, and it starts the long fall home.",
        more:
          "Retrofire, the engine firing that starts the trip home, came exactly on time at 329 hours 58 minutes 4 seconds, at the end of the 206th revolution. \"That's one big hurdle over with, tiger!\" Lovell said, and Borman answered, \"You're right, ace.\" The section that had held the retrorockets was cast off 45 seconds later, uncovering the heat shield. On the way down Borman steered by banking left and right to follow his computer's needles, while Lovell watched for the horizon.",
      },
      citations: [
        sequence("Retrofire initiation", "4-13 (PDF page 91)"),
        SUMMARY("1-3", "\"Retrofire occurred exactly on time at 329:58:04 g.e.t\""),
        ACTUAL_MISSION("4-7", "\"A nominal retrofire sequence was performed in darkness at 329:58:04 g.e.t.\""),
        nasaMission("Mission Overview: \"Retrorockets were fired at the end of revolution 206 on Dec. 18 at 8:28:07 a.m.\" (EST; UTC is our conversion)"),
        titans(292, "\"With retrofire approaching in the darkness near Canton Island in the Pacific\""),
        titans(293, "\"The first retrorocket fired automatically and on time. The next two rockets followed in quick succession and, after a pause, the fourth fired. As the firings jolted them, Lovell said, with relief, 'That's one big hurdle over with, tiger!' Borman answered, 'You're right, ace.'\"; Borman \"banking to right and left, following the needles\"; Lovell \"finally saw the horizon\""),
        report('Section 7.1.2.4, "Preretrofire and retrofire" (page 7-57, PDF page 313): "The retrograde section of the adapter was jettisoned at TR + 45 seconds"'),
        nmc("Spacecraft description: \"The retrorocket module would then be jettisonned, exposing the heat shield\""),
      ],
      view: "spacecraft",
      inTour: true,
    },
    {
      id: "splashdown",
      title: "Splashdown",
      chapter: "home",
      elapsed: "330:35:01",
      utc: "1965-12-18T14:05:04Z",
      text: {
        short: "Gemini 7 splashes down in the Atlantic Ocean, about 7 miles (12 kilometers) from its target, after almost 14 days in space. Borman and Lovell are tired but in good shape.",
        more:
          "Gemini 7 landed at 9:05 a.m. Eastern Standard Time on December 18, 330 hours 35 minutes 1 second after liftoff, 6.4 nautical miles short of the planned point. Swimmers from a helicopter fastened a flotation collar around it, and the crew climbed into a raft and were lifted into a helicopter. They stepped onto the deck of the carrier USS Wasp about half an hour after landing, walking a little stooped. The Wasp had Gemini 7 aboard at 331 hours 38 minutes, about an hour after landing.",
      },
      citations: [
        sequence("Landing", "4-13 (PDF page 91)"),
        nasaMission("Mission Facts: \"Landing Date: Dec. 18, 1965, 9:05:04 a.m. EST (14:05:04 UT)\""),
        SUMMARY("1-3", "\"the landing point achieved was 6.4 nautical miles short and 0.5 nautical mile to the left\"; \"The crew was returned to the recovery ship by helicopter approximately 30 minutes after landing.\""),
        SUMMARY("1-1", "\"The crew completed the flight in good physical condition\""),
        report('Section 6.3.2, "Location and Retrieval" (page 6-18, PDF page 238): swimmers deployed at 330:43 and the flotation collar attached and inflated by 330:47; both pilots in the liferaft and "hoisted aboard the recovery helicopter by 330:57 g.e.t"; "The flight crew was on the carrier deck at 331:07 g.e.t. The carrier had the spacecraft onboard at 331:38 g.e.t."'),
        titans(294, "\"they were tired but happy. They walked slightly stooped and a little gimpy-legged\""),
      ],
      discrepancy:
        "For how far from the target Gemini 7 landed, NASA's Gemini VII page and NSSDCA give 12.2 km and On the Shoulders of Titans 11.8 km. We follow the mission report, 6.4 nautical miles (11.9 kilometers).",
      photo: nasaPhoto(
        "s65-63690",
        1600,
        1053,
        "Seen from above, two astronauts in white suits and helmets sit with Navy swimmers in an orange life raft beside the dark Gemini 7 spacecraft, in a patch of bright green dye on the blue sea.",
      ),
      view: "earth",
      inTour: true,
    },
  ],

  whereNow: [
    {
      value: {
        object: "Gemini VII spacecraft",
        museum: "Smithsonian National Air and Space Museum (Destination Moon gallery)",
        place: "Washington, D.C.",
      },
      citations: [
        nasm("Display Status: \"This object is on display in Destination Moon at the National Air and Space Museum in Washington, DC.\"; \"In 1968 the National Aeronautics and Space Administration gave Gemini VII to the Smithsonian.\""),
      ],
    },
  ],
};
