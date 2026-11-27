/**
 * Gemini 3 (NASA also wrote it "Gemini III" and "GT-3"): the first Gemini
 * flight with a crew, March 23, 1965.
 *
 * NASA's own copy of the Gemini 3 mission report (MSC-G-R-65-2) was not
 * found, so the times here come from the next most primary sources we have:
 * the composite air-to-ground and onboard voice transcription of the GT-3
 * mission (NASA Manned Spacecraft Center, April 1965), whose elapsed-time
 * column dates the crew's and the ground's calls to the second; the NSSDCA
 * Master Catalog and NASA's Gemini III page, which give the insertion,
 * orbit-change, retrofire, and landing times; Project Gemini: A Chronology
 * (SP-4002); and On the Shoulders of Titans (SP-4203), chapter X, "The Last
 * Hurdle", with its Appendix B. Where sources disagree, the `discrepancy`
 * field says what each gives and which we follow.
 *
 * Elapsed times are ground elapsed time, counted from lift-off at
 * 14:24:00.064 UT (NASA's Gemini III page and NSSDCA). The transcript
 * prints them to the whole second, and an event drawn from it is placed at
 * the call that reports it. Where a source gives a time only to the minute,
 * or in EST only, seconds are written as 00 and the citation says so; EST
 * times are moved to the mission clock by subtracting 9:24 a.m., our
 * arithmetic.
 *
 * Universal times are given where a source states them (lift-off, the third
 * orbit change, landing) or where it gives an EST time to the second (the
 * insertion and retrofire: EST plus five hours, our arithmetic).
 *
 * Unit conversions in the text (kilometers and nautical miles to miles,
 * meters per second to miles per hour) are our arithmetic on the cited
 * values.
 *
 * The flight path itself (orbits, retrofire, splashdown point) is described
 * in flight.ts, not here.
 */
import type { Citation, Mission, Photo } from '../../types.ts';

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const TRANSCRIPT = 'https://www.nasa.gov/wp-content/uploads/2026/01/gt03-tec.pdf';
const CHRONOLOGY_1965 = 'https://www.nasa.gov/history/SP-4002/p3a.htm';
const NMC_GEMINI = 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1965-024A';
const NMC_ORBITS =
  'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/displayTrajectory.action?id=1965-024A';

/** A line of the voice transcription: its printed page (the scan's PDF page is one more), elapsed time, speaker, and words. */
function transcript(page: number, line: string): Citation {
  return {
    source: 'gemini-3-voice-transcript',
    locator: `page ${page} (PDF page ${page + 1}), ${line}`,
    url: TRANSCRIPT,
  };
}

/** On the Shoulders of Titans, chapter X, "The Last Hurdle" (PDF page = printed page + 21). */
function titans(page: number, quote: string): Citation {
  return {
    source: 'on-the-shoulders-of-titans',
    locator: `Chapter X, "The Last Hurdle", page ${page} (PDF page ${page + 21}): ${quote}`,
  };
}

/**
 * On the Shoulders of Titans, Appendix B, "Flight Data Summary". The Gemini 3
 * row is on printed page 524 (PDF page 545); its notes, and the rest of the
 * Gemini 4 row, are on page 525 (PDF page 546).
 */
function flightData(where: string, quote: string, pages = 'page 524, PDF page 545'): Citation {
  return {
    source: 'on-the-shoulders-of-titans',
    locator: `Appendix B, "Flight Data Summary-Continued", ${where} (${pages}): ${quote}`,
  };
}

/** The Gemini 3 entry of Project Gemini: A Chronology, Part III (A), March 23, 1965. */
function chronology(quote: string): Citation {
  return {
    source: 'gemini-chronology',
    locator: `Part III (A), March 23, 1965: ${quote}`,
    url: CHRONOLOGY_1965,
  };
}

/** The NSSDCA Master Catalog page for Gemini 3. */
function nmc(section: string): Citation {
  return {
    source: 'nssdca-master-catalog',
    locator: `"Gemini 3" (1965-024A), ${section}`,
    url: NMC_GEMINI,
  };
}

/** NSSDCA's launch and orbital information for Gemini 3. */
function nmcOrbits(section: string): Citation {
  return {
    source: 'nssdca-master-catalog',
    locator: `"Launch/Orbital information for Gemini 3" (1965-024A), Trajectory Details, ${section}`,
    url: NMC_ORBITS,
  };
}

/** NASA's Gemini III page. */
function nasaMission(section: string): Citation {
  return { source: 'nasa-gemini-3-mission', locator: section };
}

/** NASA's article "60 Years Ago: Gemini III, America's First Two-Person Flight". */
function sixty(section: string): Citation {
  return { source: 'nasa-gemini-3-60-years', locator: section };
}

/** The Smithsonian's page for the Gemini 3 capsule. */
function nasm(section: string): Citation {
  return { source: 'nasm-gemini-3-capsule', locator: section };
}

/** A photo from the NASA Image and Video Library, saved under public/media/gemini-3/. */
function nasaPhoto(nasaId: string, width: number, height: number, alt: string): Photo {
  return {
    src: `media/gemini-3/${nasaId.toLowerCase()}.jpg`,
    width,
    height,
    alt,
    credit: 'NASA',
    sourceUrl: `https://images.nasa.gov/details/${nasaId}`,
  };
}

/* ------------------------------------------------------------------ */
/* The mission                                                         */
/* ------------------------------------------------------------------ */

export const story: Mission = {
  id: 'gemini-3',
  program: 'gemini',
  name: 'Gemini 3',
  kind: 'flight',
  destination: 'earth-orbit',

  summary: {
    text: {
      short:
        'Gemini 3 was the first Gemini flight with a crew. On March 23, 1965, Gus Grissom and John Young circled Earth three times and became the first crew ever to change their orbit with their own thrusters.',
      more: "Grissom, who had flown in Project Mercury, and Young, on his first flight, lifted off from Cape Kennedy, Florida, in a spacecraft Grissom nicknamed Molly Brown. Three times Grissom fired the spacecraft's thrusters, the small rocket engines that push and turn it, to change the orbit: to make it smaller and rounder, to tilt it slightly, and to lower its low point so the spacecraft would come down even if its retrorockets, the rockets that slow it for the trip home, failed. After 4 hours 52 minutes 31 seconds, Molly Brown splashed down in the Atlantic Ocean about 60 nautical miles (111 kilometers) short of its target, because it glided less than wind tunnel tests had predicted.",
    },
    citations: [
      chronology(
        '"Gemini-Titan 3 (GT-3), the first manned mission of the Gemini program, was launched from complex 19" and "During the flight, Grissom successfully performed three orbital maneuvers"',
      ),
      nasaMission(
        'Introduction: "the first crewed flight of the Gemini spacecraft. It was NASA’s first mission where the crew was able to maneuver the spacecraft in orbit by firing thrusters"; Mission Facts: "Revolutions Completed: 3" and "Duration: 4 hours, 52 minutes, 31 seconds"',
      ),
      nmc(
        'Mission Profile: the first orbital maneuver, the 0.02-degree change in inclination, the perigee lowered "to allow the orbit to decay naturally in case of retrorocket failure", and "Due to less-than-expected spacecraft lift during reentry, the spacecraft landed 111 km short of the target point"',
      ),
      flightData('Gemini 3 row, Description column', '"miss distance, 111.1 km (60 n.m.)"'),
      titans(
        233,
        "the spacecraft's name: \"'Molly Brown,' the 'unsinkable' heroine of a Broadway stage hit, seemed to Grissom the logical choice for his second space command\"",
      ),
      titans(
        236,
        '"its real lift fell far short of what had been predicted from wind tunnel tests"',
      ),
      sixty(
        '"Grissom earned the honor as the first person to enter space twice and Young as the first member of the second group of astronauts to fly in space. During their three-orbit flight they carried out the first orbital maneuvers of a crewed spacecraft"',
      ),
    ],
    discrepancy:
      'On the Shoulders of Titans (chapter X, page 236) says Gemini 3 came down about 84 kilometers short, and NASA\'s article "60 Years Ago: Gemini III" about 52 miles short. We follow the Gemini chronology ("about 60 nautical miles") and the same book\'s Appendix B (111.1 km, 60 n.m.), which NASA\'s Gemini III page and NSSDCA also give as 111 km.',
  },

  crew: {
    value: [
      { name: 'Virgil I. Grissom', role: 'Command pilot' },
      { name: 'John W. Young', role: 'Pilot' },
    ],
    citations: [
      chronology(
        '"The crew were command pilot Astronaut Virgil I. Grissom and pilot Astronaut John W. Young."',
      ),
      nasaMission(
        'Mission Facts: "Crew: Virgil I. “Gus” Grissom (Command Pilot) and John W. Young (Pilot)"',
      ),
    ],
  },
  crewPhoto: nasaPhoto(
    'S64-19430',
    957,
    1200,
    'Virgil I. Grissom, left, and John W. Young, right, smile in silver Gemini spacesuits and white helmets with the visors raised, posed against a plain blue backdrop.',
  ),

  launch: {
    value: {
      utc: '1965-03-23T14:24:00.064Z',
      site: 'Launch Complex 19, Cape Kennedy, Florida',
      vehicle: 'Titan II Gemini Launch Vehicle (GLV-3)',
    },
    citations: [
      nasaMission(
        'Mission Overview: "Gemini III was launched from Complex 19 on Mar. 23, 1965, at 9:24 a.m. EST (14:24:00.064 UT)"; Mission Facts: "Launch Vehicle: Titan II"',
      ),
      nmc('Mission Profile: "launched from Complex 19 at 9:24 a.m. EST (14:24:00.064 UT)"'),
      flightData('Gemini 3 row, Description column', '"launch, 9:24:00.064 a.m., e.s.t."'),
      chronology('"launched from complex 19 at 9:24 a.m., e.s.t."'),
      titans(233, '"the engines of GLV-3 burst into life"'),
      sixty(
        '"Grissom and Young rode the transfer van to Launch Pad 19 at Cape Kennedy in Florida"',
      ),
      nasm(
        'Object description: "were launched from Cape Kennedy on March 23, 1965, atop a Titan II launch vehicle"',
      ),
    ],
    discrepancy:
      'NASA\'s Gemini III page ("Launch Site: Complex 19, Cape Canaveral, United States") and NSSDCA ("Launch Site: Cape Canaveral, United States") use the name the Cape has today. NASA\'s article "60 Years Ago: Gemini III" and the Smithsonian say Cape Kennedy, its name at the time; we follow them.',
  },

  duration: {
    value: '004:52:31',
    citations: [
      nasaMission('Mission Facts: "Duration: 4 hours, 52 minutes, 31 seconds"'),
      flightData('Gemini 3 row, Description column', '"duration, 4 hours, 52 mins., 31 secs."'),
      nmc('Mission Profile: splashdown "at 4:52:31 GET"'),
    ],
  },

  callSigns: {
    value: [{ craft: 'Spacecraft', name: 'Molly Brown' }],
    citations: [
      titans(
        233,
        '"Officially the flight of Gemini 3, unofficially it was the voyage of \'Molly Brown.\'" and "the name remained \'Molly Brown,\' though only quasi-officially"',
      ),
      transcript(2, '00 00 26, CC: "Roger. Pitch. You\'re on your way, Molly Brown."'),
      transcript(89, '04 20 17, Grissom (C): "Hawaii, Molly Brown is all ready for burn."'),
      nasm(
        'Object description: "he unofficially named Gemini 3 for the \'Unsinkable Molly Brown\' of Broadway musical fame"',
      ),
    ],
  },

  accomplishments: [
    {
      text: {
        short:
          "Grissom and Young were the first crew ever to change their spacecraft's orbit. That was the first step toward meeting and docking with another spacecraft in orbit, a skill NASA needed for the Moon landings.",
        more: 'Project Gemini was meant to prove the techniques Apollo would need to land on the Moon, and meeting and docking with another spacecraft ranked high among them. Grissom changed the orbit\'s size, tilted it, and lowered its low point, and NASA called these first maneuvers by a crew "a critical step toward demonstrating rendezvous and docking."',
      },
      citations: [
        sixty(
          '"During their three-orbit flight they carried out the first orbital maneuvers of a crewed spacecraft, a critical step toward demonstrating rendezvous and docking" and "The primary goals of Project Gemini included proving the techniques required for the Apollo Program ... Demonstrating rendezvous and docking between two spacecraft ranked as a high priority for Project Gemini."',
        ),
        nasaMission(
          'Introduction: "It was NASA’s first mission where the crew was able to maneuver the spacecraft in orbit by firing thrusters."',
        ),
        nasm(
          'Object description: "Their primary objectives were to test the basic systems of the Gemini spacecraft and make the first orbit-changing maneuvers in space."',
        ),
        titans(
          235,
          '"the Gemini 3 crew did chalk up at least one historic first by maneuvering in orbit"',
        ),
      ],
    },
    {
      text: {
        short:
          'Gemini 3 was the first American spaceflight with two people aboard. Grissom became the first person to go into space twice.',
        more: "Young was the first astronaut from NASA's second group of astronauts to fly in space. Grissom had flown a Mercury spacecraft, Liberty Bell 7, in 1961.",
      },
      citations: [
        sixty(
          '"the United States launched the Gemini III spacecraft with astronauts Virgil “Gus” Grissom and John Young aboard, America’s first two-person spaceflight. Grissom earned the honor as the first person to enter space twice and Young as the first member of the second group of astronauts to fly in space."',
        ),
        nasm(
          'Object description: "Grissom\'s Mercury spacecraft, Liberty Bell 7, had sunk at the end of his 1961 suborbital mission"',
        ),
      ],
    },
    {
      text: {
        short:
          'The flight showed that the Gemini spacecraft was ready to carry crews. Only its steered landing fell short of the goal.',
        more: 'Its main goals were to show that a crew could fly the spacecraft in orbit, to test its systems and the tracking network, to change orbits, and to fly a controlled return to a chosen landing point. All were met except the landing, which came down far from its target because the spacecraft made less lift than expected. NASA\'s history of Gemini says that after the flight "there could be no doubt that Gemini was ready for its role."',
      },
      citations: [
        chronology('the major objectives, and "Landing point accuracy was unexpectedly poor"'),
        flightData(
          'Gemini 3 row, Primary Objectives and Result columns',
          '"Demonstrate controlled reentry and landing" marked "PA" (partially achieved) with note 2; the other primary objectives marked "A" (achieved)',
        ),
        flightData(
          'notes below the table',
          'note 2, "Angle of attack during reentry lower than expected"',
          'page 525, PDF page 546',
        ),
        titans(
          237,
          '"Despite its minor problems, Gemini 3 was a complete success as far as its major objectives were concerned. There could be no doubt that Gemini was ready for its role in the manned space flight program."',
        ),
        nasaMission('Mission Overview: "All other mission objectives were achieved."'),
      ],
    },
  ],

  chapters: [
    { id: 'launch', title: 'Launch' },
    { id: 'steering', title: 'Steering in orbit' },
    { id: 'home', title: 'Coming home' },
    { id: 'recovery', title: 'Recovery' },
  ],

  events: [
    /* ----------------------------- Launch ---------------------------- */
    {
      id: 'liftoff',
      handsOn: 'orbit',
      title: 'Liftoff',
      chapter: 'launch',
      elapsed: '000:00:00',
      utc: '1965-03-23T14:24:00.064Z',
      text: {
        short:
          'A Titan II rocket lifts Gemini 3 off the pad at Cape Kennedy, Florida, with Gus Grissom and John Young aboard. It is the first time a Gemini spacecraft carries people.',
        more: 'Liftoff came at 9:24 a.m. Eastern Standard Time on March 23, 1965, after a 24-minute hold to make sure a leak in the rocket\'s first stage had stopped. Gordon Cooper, the capsule communicator who talked with the crew from the ground, radioed, "You\'re on your way, Molly Brown." Grissom had named the spacecraft after the "unsinkable" heroine of a Broadway musical, because his Mercury spacecraft had sunk after landing. The ride was so smooth that the crew knew they were off only when the mission clock on the instrument panel started.',
      },
      citations: [
        transcript(
          2,
          '00 00 00, CC: "Bolts and lift-off."; 00 00 26, CC: "Roger. Pitch. You\'re on your way, Molly Brown."',
        ),
        nasaMission(
          'Mission Facts: "Launch Date: Mar. 23, 1965, 9:24:00 a.m. EST (14:24:00 UT)"; Mission Overview: "(14:24:00.064 UT)"',
        ),
        titans(
          233,
          'the first-stage oxidizer leak and "the count was held for 24 minutes to make certain the leak had stopped"; "You\'re on your way, Molly Brown," from CapCom (capsule communicator) L. Gordon Cooper, Jr.; the naming, "the \'unsinkable\' heroine of a Broadway stage hit"; and "Their real cues were seeing the mission clock on the instrument panel start running"',
        ),
        nasm(
          'Object description: Liberty Bell 7 "had sunk at the end of his 1961 suborbital mission"',
        ),
        chronology('"launched from complex 19 at 9:24 a.m., e.s.t."'),
        sixty(
          '"Grissom and Young rode the transfer van to Launch Pad 19 at Cape Kennedy in Florida"',
        ),
      ],
      discrepancy:
        'NASA\'s Gemini III page and NSSDCA call the launch site Cape Canaveral, the name the Cape has today. NASA\'s article "60 Years Ago: Gemini III" and the Smithsonian say Cape Kennedy, its name at the time; we follow them.',
      photo: nasaPhoto(
        'S65-21520',
        1600,
        722,
        'Seen from far across flat scrubland, a thin white rocket rises from a red launch tower on Pad 19, with a big cloud of white smoke spreading beside it. Another red tower and low buildings stand along the horizon under a gray sky.',
      ),
      view: 'earth',
      keyMoment: true,
    },
    {
      id: 'in-orbit',
      title: 'In orbit',
      chapter: 'launch',
      elapsed: '000:05:54',
      utc: '1965-03-23T14:29:54Z',
      text: {
        short:
          'Less than six minutes after liftoff, Gemini 3 is in orbit, circling Earth between about 100 and 139 miles up. Grissom is now the first person to go into space twice.',
        more: "The rocket's second stage shut down five and a half minutes after liftoff, and the spacecraft separated from it. The orbit measured 87 by 121 nautical miles (161 by 224 kilometers). It was the last American spaceflight run from the Mission Control Center at Cape Kennedy; from Gemini IV on, flights were run from Houston. About 20 minutes into the first orbit, a gauge showed the oxygen pressure dropping suddenly. Young noticed other dials looked wrong too, guessed the trouble was in the power to the instruments, and switched to a backup power supply. It took him 45 seconds, and the problem went away.",
      },
      citations: [
        nmc(
          'Mission Profile: "inserted 5 minutes 54 seconds later (9:29:54 a.m. EST) into a 161.2 x 224.2 km (87 x 121 nautical mile) orbit"',
        ),
        nmcOrbits(
          'first orbit, epoch start 1965-03-23 14:24:00 UTC: periapsis 161.20 km, apoapsis 224.20 km',
        ),
        transcript(4, '00 05 34, Grissom (C): "SECO." and 00 06 10: "Okay. We are separated."'),
        titans(233, '"Five and a half minutes after launch, the second-stage engine shut down."'),
        titans(
          235,
          'about 20 minutes into the first orbit, the oxygen pressure gauge "reported an abrupt drop"; Young "switched from the primary to the secondary electrical converter to power the dials, and the problem vanished", which "took 45 seconds"',
        ),
        sixty(
          '"Gemini III entered an orbit of 100 miles by 139 miles above the Earth", "Grissom became the first human to enter space a second time", "Gemini 3 marked the last spaceflight controlled from Cape Kennedy", and "Beginning with Gemini IV, control of all American human spaceflights shifted permanently to the Houston facility"',
        ),
      ],
      discrepancy:
        'On the Shoulders of Titans (page 235) gives the orbit as 122 by 175 kilometers, and the ground\'s first estimate by radio was "an 87 by 125 orbit" (transcript page 5, 00 07 23). We follow NSSDCA, 87 by 121 nautical miles, which the same book\'s Appendix B supports with its highest apogee, 121 n.m.',
      view: 'earth',
    },

    /* ------------------------- Steering in orbit ------------------------ */
    {
      id: 'first-orbit-change',
      title: 'The first orbit change',
      chapter: 'steering',
      elapsed: '001:33:00',
      text: {
        short:
          'Over Texas, Grissom fires the thrusters for 1 minute 14 seconds, and the orbit becomes smaller and rounder. No crew has ever changed its orbit before.',
        more: 'The firing came near the end of the first trip around Earth and slowed the spacecraft by 15 meters per second (about 34 miles per hour). As it began, Young reported, "They appear to be firing good." The orbit dropped to a nearly circular one, 158 by 169 kilometers (about 98 by 105 miles). It was the first time a crew had changed its orbit, and a first step toward meeting another spacecraft in space.',
      },
      citations: [
        transcript(
          37,
          '01 33 00, Grissom (C): "MARK!"; 01 33 01, Young (P): "Okay. They appear to be firing good."; 01 33 03, CC: "Roger. Texas confirms OAMS thruster firing."',
        ),
        transcript(
          38,
          '01 34 14, Young (P): "MARK!" and Grissom (C): "Thrusting complete."; 01 34 21, Young: "That burn was 1 minute and 14 seconds by our watches."',
        ),
        sixty(
          '"Near the end of the first orbit, while passing over Texas, Grissom and Young fired their spacecraft’s thrusters for one minute, 14 seconds. “They appear to be firing good,” said Young"',
        ),
        titans(
          235,
          '"cutting spacecraft speed by 15 meters per second and dropping it into a nearly circular orbit"',
        ),
        nmc(
          'Mission Profile: "At the end of the first orbit Grissom effected the first orbital maneuver, which lowered the orbit to a near-circular 158 x 169 kms."',
        ),
        nmcOrbits(
          'second orbit, epoch start 1965-03-23 16:00:00 UTC: periapsis 158.00 km, apoapsis 169.00 km',
        ),
        nasm('Object description: "make the first orbit-changing maneuvers in space"'),
      ],
      discrepancy:
        'On the Shoulders of Titans (page 235) says the firing "lasted a carefully timed 75 seconds". We follow the transcript and NASA\'s article, 1 minute 14 seconds. NASA\'s article gives the new orbit as 97 miles by 105 miles and the ground radioed "85.6, 92.6" (nautical miles; transcript page 44, 01 50 32); we follow NSSDCA, 158 by 169 kilometers.',
      view: 'spacecraft',
      keyMoment: true,
    },
    {
      id: 'orbit-tilt',
      title: 'Tilting the orbit',
      chapter: 'steering',
      elapsed: '002:17:00',
      text: {
        short:
          'On the second trip around Earth, Grissom turns the spacecraft sideways and fires the thrusters again. The orbit tilts by a tiny amount, one-fiftieth of a degree.',
        more: 'This second firing came about 45 minutes after the first and tested how well the thrusters could push the spacecraft in other directions. The crew had other jobs too, such as testing new space food. Young had hidden a corned beef sandwich in his suit pocket before the flight, and he and Grissom each took a bite before putting it away, worried about crumbs floating around the cabin.',
      },
      citations: [
        transcript(
          54,
          '02 16 31, Grissom (C): "Roger. Getting ready for a translation burn."; 02 16 55, Grissom: "Roger. 5 seconds ..."; 02 17 15, Grissom: "9 ft/sec-10."; 02 17 47, Grissom: "That was with a 90° yaw." (the firing fell between 02 16 55 and 02 17 15; the event is placed at 02 17 00, our reading)',
        ),
        titans(
          235,
          '"Three quarters of an hour later, during the second revolution, Grissom fired the system again, this time to test the ship\'s translational capability and shift the plane of its orbit by one-fiftieth of a degree."',
        ),
        nmc(
          'Mission Profile: "On the second orbit Grissom altered the spacecraft inclination by 0.02 degrees."',
        ),
        sixty(
          '"A second burn 45 minutes later altered the orbital inclination by 0.02 degrees. Another task for the crew involved testing new food and packaging developed for Gemini. As an off-the-menu item, Young had stowed a corned beef on rye sandwich in his suit pocket before flight, and both he and Grissom took a bite before stowing it away, concerned about crumbs from the sandwich floating free in the cabin."',
        ),
      ],
      view: 'spacecraft',
    },

    /* ---------------------------- Coming home --------------------------- */
    {
      id: 'lower-perigee',
      title: 'Making sure of the way down',
      chapter: 'home',
      elapsed: '004:21:23',
      utc: '1965-03-23T18:45:23Z',
      text: {
        short:
          "Near the end of the third trip, over Hawaii, Grissom fires the thrusters once more and lowers the orbit's low point. Now Gemini 3 would come down even if its retrorockets, the rockets that slow it for the trip home, did not work.",
        more: 'The crew had already turned the spacecraft around to fly blunt end first, the way it would face for retrofire. The firing, which the crew timed at 1 minute 48 seconds, lowered the perigee, the lowest point of the orbit, to 84 kilometers (about 52 miles). Passing that low through the top of the atmosphere, the spacecraft would have been dragged down by the air on its own.',
      },
      citations: [
        transcript(89, '04 20 17, Grissom (C): "Hawaii, Molly Brown is all ready for burn."'),
        transcript(
          91,
          '04 21 23, Grissom (C): "MARK!" and 04 21 28, CC: "We got your start of burn."; 04 23 14, Grissom: "MARK! End of burn."',
        ),
        transcript(90, '04 23 19, Young (P): "We timed that a minute and 48 seconds."'),
        transcript(82, '03 57 28, Grissom (C): "We are blunt-end-forward."'),
        transcript(
          80,
          '03 49 46, CC: "Cape recommends you perform your OAMS retroburn in BEF after alinement, and stay in BEF up to retrofire."',
        ),
        nmc(
          'Mission Profile: "Near the end of the third orbit, at 4:21:23 ground elapsed time, or GET (1:45:23 p.m. EST) the perigee was lowered to 84 km to allow the orbit to decay naturally in case of retrorocket failure."',
        ),
        nmcOrbits(
          'third orbit, epoch start 1965-03-23 18:45:23 UTC: periapsis 84.00 km, apoapsis 169.00 km',
        ),
        sixty(
          '"They oriented Gemini III with its blunt end facing forward and completed a final orbital maneuver to lower the low point of their orbit to 45 miles, ensuring reentry even if the retrorockets failed to fire."',
        ),
        titans(
          235,
          '"During the third pass, Grissom completed the fail-safe plan with a two and a half minute burn that dropped the spacecraft\'s perigee to 72 kilometers and ensured reentry even if the retrorockets failed to work."',
        ),
      ],
      discrepancy:
        "On the Shoulders of Titans gives this firing as two and a half minutes, and the perigee after it as 72 kilometers; NASA's article gives 45 miles. We follow the crew's timing in the transcript and NSSDCA's 84 kilometers.",
      view: 'spacecraft',
      keyMoment: true,
    },
    {
      id: 'retrofire',
      title: 'Retrofire',
      chapter: 'home',
      elapsed: '004:33:23',
      utc: '1965-03-23T18:57:23Z',
      text: {
        short:
          'Four small rockets fire one after another to slow Gemini 3 down, and it starts to fall back toward Earth.',
        more: 'Retrofire, the firing that starts the trip home, came 4 hours 33 minutes 23 seconds after liftoff. Just before it, the crew cast off the back section of the spacecraft, and Grissom said, "you can really feel it kick off." After the four retrorockets had fired, the section that held them was dropped too, uncovering the heat shield. In the fall through the air, a sheath of hot, glowing gas formed around the spacecraft and blocked its radio. Young switched on an experiment that sprayed water into it, and ground stations picked up signals from the spacecraft.',
      },
      citations: [
        transcript(
          96,
          '04 32 29, Grissom (C): "Hey, the adapter has separated."; 04 32 37: "I said you can really feel it kick off."; 04 33 13, CC: "10 - 9 - 8 - 7 - 6 - 5 - 4 - 3 - 2 - 1 - Retrofire."; 04 33 23, Grissom: "Auto-retro."',
        ),
        transcript(
          97,
          '04 33 44, Grissom (C): "All rockets fired normally and attitudes were right in the center."; 04 34 15, Young (P): "Roger, and retropack has jettisoned."',
        ),
        nmc(
          'Mission Profile: "retrofire at 4:33:23 GET (1:57:23 p.m. EST). At an altitude of 90 km about 7 kg of water were injected into the ionized plasma sheath resulting in improved communications during the blackout period." (UTC is our conversion)',
        ),
        titans(
          236,
          '"One after the other, the four rockets exploded into life and burned themselves out. Another set of pyrotechnics cut loose the expended package"; and at "high rates of water flow, both UHF and C-band signals from the spacecraft were picked up by ground stations"',
        ),
        sixty(
          '"They jettisoned the retrograde section, exposing Gemini’s heat shield. Minutes later, they encountered the upper layers of Earth’s atmosphere at 400,000 feet, and he buildup of ionized gases caused a temporary loss of communication between the spacecraft and Mission Control."',
        ),
        titans(
          236,
          '"Young threw the switch to start the reentry communications experiments just over a minute after the plasma had formed and communications had blacked out."',
        ),
      ],
      view: 'spacecraft',
      keyMoment: true,
    },
    {
      id: 'splashdown',
      title: 'Splashdown, short of the target',
      chapter: 'home',
      elapsed: '004:52:31',
      utc: '1965-03-23T19:16:31Z',
      text: {
        short:
          'Molly Brown splashes down in the Atlantic Ocean near Grand Turk Island, about 69 miles short of where it was aimed. The spacecraft did not glide as far as engineers had expected.',
        more: 'The Gemini spacecraft was shaped to glide a little as it fell through the air, so the crew could steer it toward the landing point. But it made far less lift than wind tunnel tests had predicted, and Grissom could not make up the difference. It landed about 60 nautical miles (111 kilometers) short. Under the main parachute, when Grissom switched the spacecraft to its landing position, it dropped suddenly and threw both men forward. "Broke my face plate when we went to landing attitude," Grissom said.',
      },
      citations: [
        transcript(
          105,
          '04 52 31, "(Impact)"; 04 52 34, Grissom (C): "Broke my face plate when we went to landing attitude."',
        ),
        nmc(
          'Mission Profile: "Splashdown occurred in the Atlantic in the vicinity of Grand Turk Island, at 22.43 N, 70.85 W, at 4:52:31 GET (2:16:31 p.m. EST). Due to less-than-expected spacecraft lift during reentry, the spacecraft landed 111 km short of the target point."',
        ),
        nasaMission(
          'Mission Facts: "Landing Date: Mar. 23,1965, 2:16:31 EST (19:16:31 UT)" and "Landing Site: Near Grand Turk Island, 22.43° N, 70.85° W"',
        ),
        chronology(
          '"The spacecraft landed at 2:16 p.m. about 60 nautical miles from its nominal landing point."',
        ),
        flightData(
          'Gemini 3 row, Description column',
          '"landing, 22°26\' N, 70°51\' W; miss distance, 111.1 km (60 n.m.)"',
        ),
        titans(
          236,
          '"Theoretically, the Gemini spacecraft had enough lift to be piloted to a relatively precise landing, but its real lift fell far short of what had been predicted from wind tunnel tests"; and "When Grissom hit the landing attitude switch, \'Molly Brown\' literally dropped into place, pitching both men into the windshield, breaking Grissom\'s faceplate"',
        ),
      ],
      discrepancy:
        'On the Shoulders of Titans (chapter X, page 236) says Gemini 3 came down about 84 kilometers short, and NASA\'s article "60 Years Ago: Gemini III" about 52 miles short. We follow the Gemini chronology and the same book\'s Appendix B, 60 nautical miles (111.1 km).',
      photo: nasaPhoto(
        's65-18645',
        1270,
        1280,
        'Some time after splashdown, seen from above, Navy swimmers fasten a yellow flotation collar around the dark Gemini 3 spacecraft in a deep blue sea while Grissom and Young wait inside. A yellow raft floats beside it, bright green marker dye spreads across the water, and a Navy helicopter hovers near the horizon.',
      ),
      view: 'earth',
      keyMoment: true,
    },

    /* ------------------------------ Recovery ----------------------------- */
    {
      id: 'to-the-carrier',
      title: 'A helicopter ride to the carrier',
      chapter: 'recovery',
      elapsed: '006:04:00',
      text: {
        short:
          'After a hot, rocking wait inside the closed spacecraft, Grissom and Young climb out. A helicopter carries them to the aircraft carrier USS Intrepid.',
        more: 'The crew had last heard that the Intrepid was about 8 kilometers away; it was closer to 110 kilometers (about 68 miles). Remembering how Liberty Bell 7 had sunk, Grissom kept the hatches shut until Navy swimmers had fastened a flotation collar around the spacecraft, while the cabin grew hotter and the spacecraft pitched on the waves. The two men climbed out shortly after 3:00 p.m. and reached the Intrepid at 3:28 p.m. Eastern time, 1 hour 12 minutes after splashdown. On board, they had a medical checkup and a telephone call from President Lyndon B. Johnson.',
      },
      citations: [
        nasaMission(
          'Mission Overview: "left the spacecraft at about 3:00 p.m. EST. They were picked up by helicopter and taken to the recovery ship U.S.S. Intrepid at 3:28 p.m. EST" (given to the minute in EST; on the mission clock 6:04:00, our arithmetic)',
        ),
        chronology(
          '"The flight crew left the spacecraft shortly after 3:00 and was transported by helicopter to the prime recovery ship, the aircraft carrier Intrepid."',
        ),
        titans(
          236,
          'the carrier "was only about eight kilometers away, as Grissom and Young had last heard", but "the real distance was closer to 110 kilometers"; Grissom "refused to crack a hatch until Navy swimmers had"',
        ),
        titans(
          237,
          '"attached a flotation collar to \'Molly Brown.\'" and "the crew endured a long 30 minutes as the sealed spacecraft grew hotter inside while it pitched and tossed on the long Atlantic swells"',
        ),
        sixty(
          '"A helicopter recovered Grissom and Young and delivered them to the deck of the U.S.S. Intrepid, arriving there one hour and 12 minutes after splashdown. On board the carrier, the astronauts received a medical checkup and a telephone call from President Lyndon B. Johnson."',
        ),
      ],
      discrepancy:
        "NASA's Gemini III page and NSSDCA say both astronauts became seasick; On the Shoulders of Titans (page 237) says Young kept his breakfast down. The text does not say who was seasick.",
      photo: nasaPhoto(
        's65-22893',
        1600,
        1052,
        'In choppy blue water, swimmers in black wetsuits stand on the yellow flotation collar around the dark spacecraft, whose hatches are open. To the right, beside a streak of green dye, a man in a white shirt sits in a yellow raft holding an orange lifting ring, with swimmers in the water around him.',
      ),
      view: 'earth',
    },
    {
      id: 'spacecraft-aboard',
      title: 'Molly Brown comes aboard',
      chapter: 'recovery',
      elapsed: '007:39:00',
      text: {
        short:
          'The Intrepid sails to the floating spacecraft and lifts it aboard. Gemini 3 has shown that the Gemini spacecraft is ready to carry crews.',
        more: "Sailors hoisted Molly Brown aboard at 5:03 p.m., less than three hours after it landed. Of the flight's three experiments, two worked. The third, about how sea urchin eggs grow without gravity, failed when the handle on its equipment broke. Next came Gemini 4, a flight of four days.",
      },
      citations: [
        nasaMission(
          'Mission Overview: "The Gemini capsule was recovered at 5:03 p.m. EST." and "Two of the three experiments were performed successfully, the third, sea urchin egg growth in microgravity, was not completed due to a mechanical failure." (5:03 p.m. given to the minute; on the mission clock 7:39:00, our arithmetic)',
        ),
        chronology('"Spacecraft recovery was completed at 5:03."'),
        sixty(
          '"The ship sailed to pick up the spacecraft and sailors hoisted it aboard less than three hours after landing."',
        ),
        titans(235, 'the cell-growth experiment: "the handle broke, ruining the experiment"'),
        titans(
          237,
          '"There could be no doubt that Gemini was ready for its role in the manned space flight program."',
        ),
        flightData(
          'Gemini 4 row, Mission and Description columns',
          'the next flight, "Gemini 4, 3-7 June 1965", "McDivitt and White; 62 revolutions"',
        ),
        flightData(
          'Gemini 4 row, continued, Description column',
          '"duration, 97 hours, 56 mins., 12 secs."',
          'page 525, PDF page 546',
        ),
      ],
      photo: nasaPhoto(
        'S65-18713',
        1265,
        1280,
        "John Young, left, and Gus Grissom, smiling in light blue flight suits, stand on either side of the round end of their spacecraft in the carrier's dim hangar. Behind Grissom, a sign is painted with the words USS Intrepid.",
      ),
      view: 'earth',
      keyMoment: true,
    },
  ],

  whereNow: [
    {
      value: {
        object: 'Gemini 3 spacecraft, Molly Brown',
        museum: 'Grissom Memorial, Spring Mill State Park',
        place: 'Mitchell, Indiana',
      },
      citations: [
        {
          source: 'gemini-3-spring-mill-state-park',
          locator:
            '"Grissom Memorial & Park Office": "Exhibits include Grissom\'s space suit, the Gemini 3 Molly Brown spacecraft"; park address "3333 State Road 60 E. Mitchell, IN 47446"',
        },
        nasm(
          'Display Status: "This object is not on display at the National Air and Space Museum. It is either on loan or in storage."',
        ),
      ],
    },
  ],
};
