/**
 * Apollo 1: the crew of the first planned crewed Apollo flight, who died in
 * a fire in their spacecraft during a test on the launch pad on January 27,
 * 1967. The mission never flew, so this is a page of remembrance, not a
 * flight.
 *
 * The canonical source is the Report of Apollo 204 Review Board (NASA's
 * summary report, 197 PDF pages). Citations to it give the report's own page
 * number and the page of the PDF, because the two differ. Where another
 * source gives a different value, the `discrepancy` field says what it gives;
 * we follow the Review Board, and after it Apollo by the Numbers.
 *
 * Times are Eastern Standard Time as the Review Board prints them beside its
 * GMT times (Part IV, page 4-5: "23:31:04.7 GMT (6:31:04.7 P.M. EST)").
 *
 * Counting Grissom's two earlier flights is our arithmetic on Apollo by the
 * Numbers, which names both.
 */
import type { Citation, Memorial } from "../../types.ts";

/* ------------------------------------------------------------------ */
/* Source pages                                                        */
/* ------------------------------------------------------------------ */

const SP_4029 = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/";
const NUMBERS_SUMMARY = `${SP_4029}Apollo_01a_Summary.htm`;
const NUMBERS_TIMELINE = `${SP_4029}Apollo_01c_Timeline.htm`;
const NUMBERS_APOLLO_7 = `${SP_4029}Apollo_07a_Summary.htm`;

/** Apollo by the Numbers, the Apollo 1 summary page, under one of its headings. */
function numbers(heading: string): Citation {
  return { source: "apollo-by-the-numbers", locator: `Apollo 1, "The Fire": ${heading}`, url: NUMBERS_SUMMARY };
}

/** Apollo by the Numbers, the Apollo 1 Fire Timeline table. */
function fireTimeline(rows: string): Citation {
  return { source: "apollo-by-the-numbers", locator: `"Apollo 1 Fire Timeline" table, ${rows}`, url: NUMBERS_TIMELINE };
}

/** Apollo by the Numbers, the Apollo 7 summary page. */
function apollo7(section: string): Citation {
  return { source: "apollo-by-the-numbers", locator: `Apollo 7, "The First Mission: Testing the CSM in Earth Orbit": ${section}`, url: NUMBERS_APOLLO_7 };
}

const PART_IV_TEST = 'Part IV, "History of Spacecraft 012 and the Accident", section 2, "Events from Initiation of the Plugs-Out Test until the T-10 Minute Hold"';
const PART_IV_FIRE = 'Part IV, "History of Spacecraft 012 and the Accident", section 4, "Events from the Report of Fire until Crew Removal"';

/** A place in the Report of Apollo 204 Review Board. */
function board(place: string, reportPages: string, pdfPages: string): Citation {
  return {
    source: "apollo-204-review-board-report",
    locator: `${place} (report page ${reportPages}, PDF page ${pdfPages})`,
  };
}

/** A numbered item of Part VI, the Board's findings, determinations, and recommendations. */
function finding(item: string, reportPages: string, pdfPages: string): Citation {
  return board(`Part VI, "Board Findings, Determinations and Recommendations", ${item}`, reportPages, pdfPages);
}

/** The NASA History Office page for Apollo 204. */
function history204(place: string): Citation {
  return { source: "nasa-apollo-204-history", locator: place };
}

/** NASA's Apollo 1 mission page. */
function nasaMission(place: string): Citation {
  return { source: "nasa-apollo-1-mission", locator: place };
}

/** NASA's article "55 Years Ago: Final Preparations for the Planned Launch of Apollo 1". */
function finalPreparations(place: string): Citation {
  return { source: "nasa-apollo-1-final-preparations", locator: place };
}

/** NASA's article "55 Years Ago: Tragedy on the Launch Pad". */
function tragedy(place: string): Citation {
  return { source: "nasa-apollo-1-tragedy-on-the-launch-pad", locator: place };
}

/** NASA's article "55 Years Ago: The Apollo 1 Fire and its Aftermath". */
function aftermath(place: string): Citation {
  return { source: "nasa-apollo-1-fire-aftermath", locator: place };
}

/** NASA's article "Apollo 1 Crew Honored in New Tribute Exhibit". */
function tribute(place: string): Citation {
  return { source: "nasa-apollo-1-tribute-exhibit", locator: place };
}

/** The Smithsonian National Air and Space Museum's Apollo 1 page. */
function nasm(place: string): Citation {
  return { source: "nasm-apollo-1", locator: place };
}

/** The Smithsonian National Air and Space Museum's article "Learning from Tragedy: Apollo 1 Fire". */
function learning(place: string): Citation {
  return { source: "nasm-apollo-1-learning-from-tragedy", locator: place };
}

/* ------------------------------------------------------------------ */
/* The memorial                                                        */
/* ------------------------------------------------------------------ */

export const memorial: Memorial = {
  id: "apollo-1",
  program: "apollo",
  name: "Apollo 1",

  summary: {
    text: {
      short:
        "Gus Grissom, Ed White, and Roger Chaffee were getting ready to fly the first Apollo mission with a crew. On January 27, 1967, during a practice countdown on the launch pad, a fire broke out inside their spacecraft, and all three astronauts died.",
      more:
        "Apollo 1 was planned as a test flight of up to 14 days in orbit around Earth, set to launch on February 21, 1967. During a rehearsal of the countdown at Launch Complex 34, Cape Kennedy, Florida, the crew sat sealed inside their command module, which was filled with pure oxygen. A fire started in the cabin and spread so quickly that there was no time to open the hatches. NASA's investigation led to a safer spacecraft and more careful ways of building and testing it, and astronauts flew Apollo again on Apollo 7 in October 1968.",
    },
    citations: [
      history204("Opening paragraph, and the second paragraph on the Board's recommendations and the changes that followed"),
      nasaMission("\"Apollo 1 Tragedy\": \"The mission was to be the first crewed flight of Apollo, and was scheduled to launch Feb. 21, 1967.\""),
      numbers("\"Background\", first and second paragraphs"),
      finalPreparations("Opening paragraph: \"a 14-day Earth orbital test flight of a Block I Apollo CSM\""),
      tragedy("Opening paragraph: \"a flash fire swept through their spacecraft so quickly they had no time to open the hatches\""),
      board(PART_IV_TEST, "4-3", "121"),
      apollo7("heading (\"11 October–22 October 1968\") and \"Background\", first paragraph"),
    ],
  },

  crew: {
    value: [
      { name: "Virgil I. \"Gus\" Grissom", role: "Command pilot" },
      { name: "Edward H. White II", role: "Senior pilot" },
      { name: "Roger B. Chaffee", role: "Pilot" },
    ],
    citations: [
      numbers("\"Background\", second paragraph: command pilot, senior pilot, and pilot"),
      board(`${PART_IV_TEST}: "The Command Pilot entered at 18:00 GMT (1:00 p.m. EST) followed by the Pilot and Senior Pilot"`, "4-3", "121"),
      history204("\"Crew\" list"),
      nasaMission("Mission facts: \"Crew\" row"),
    ],
    discrepancy:
      "The Smithsonian's Apollo 1 page calls Grissom \"Commander\". NASA's caption for the April 1966 crew portrait (S66-30236), written when the crew was first named, lists Grissom as mission commander, White as command module pilot, and Chaffee as lunar module pilot. We follow Apollo by the Numbers and the Review Board's report, which use command pilot, senior pilot, and pilot.",
  },

  date: {
    value: "1967-01-27",
    citations: [
      numbers("page heading: \"APOLLO 1 / The Fire / 27 January 1967\""),
      board(`${PART_IV_TEST}: "The Plugs-Out Test was initiated on January 27, 1967"`, "4-3", "121"),
      nasaMission("Opening paragraph: \"On Jan. 27, 1967, tragedy struck on the launch pad at Cape Kennedy\""),
      nasm("Opening paragraph"),
    ],
  },

  sections: [
    /* --------------------- The crew and their mission -------------------- */
    {
      title: "The crew and their mission",
      facts: [
        {
          text: {
            short:
              "Apollo 1 was going to be the first Apollo flight with astronauts on board. It was planned to launch on February 21, 1967, and to circle Earth for up to 14 days.",
            more:
              "Its official name was AS-204, for Apollo-Saturn 204. The crew would test the new Apollo command and service module in orbit, including its life support systems and its main engine, the one later crews would use to go into orbit around the Moon and to head back toward Earth. They also planned the first television broadcast from an American spacecraft with a crew in orbit. If the flight went its full length, it would have ended with a splashdown in the Atlantic Ocean north of Puerto Rico.",
          },
          citations: [
            nasaMission("\"Apollo 1 Tragedy\", first sentences: \"a preflight test for Apollo 204 (AS-204). The mission was to be the first crewed flight of Apollo, and was scheduled to launch Feb. 21, 1967.\""),
            numbers("\"Background\", first paragraph"),
            finalPreparations("Opening paragraph: \"officially called Apollo-Saturn-204 (AS-204), but more commonly known as Apollo 1, would be a 14-day Earth orbital test flight\""),
            finalPreparations("Paragraph beginning \"The Apollo 1 flight plan called for an open-ended mission of up to 14 days\""),
          ],
        },
        {
          text: {
            short:
              "Gus Grissom, the command pilot, had already flown in space twice. In 1961 he became the second American in space, and later he commanded Gemini 3, the first Gemini flight with astronauts aboard.",
            more:
              "Grissom was one of NASA's original seven astronauts, chosen in 1959. His 1961 flight, in the Mercury spacecraft Liberty Bell 7, was a short trip up into space and back down without circling Earth. He commanded Gemini 3 in 1965. Born in Mitchell, Indiana, on April 3, 1926, he studied mechanical engineering at Purdue University. He was a lieutenant colonel in the U.S. Air Force and 40 years old on the day of the fire.",
          },
          citations: [
            numbers("\"Background\", third paragraph: \"pilot of MR-4, America's second and last suborbital flight, and command pilot of the first two-person flight, Gemini 3\""),
            nasm("\"The Astronauts\": \"Virgil I. \"Gus\" Grissom, Commander\""),
            tribute("Paragraph on Grissom's display: \"one of NASA's Original Seven astronauts who flew the second Mercury mission\""),
            history204("\"Crew\" list: \"Lieutenant Colonel, USAF\""),
          ],
        },
        {
          text: {
            short:
              "Ed White, the senior pilot, had flown once before, on Gemini 4. On that flight he became the first American to walk in space.",
            more:
              "White graduated from the U.S. Military Academy at West Point and was chosen as an astronaut in 1962. He enjoyed his spacewalk so much that he had to be told several times to come back to his spacecraft, and he stayed outside nearly twice as long as planned. Spacewalks like his were meant to help prepare astronauts for Apollo. Born in San Antonio, Texas, on November 14, 1930, he was a lieutenant colonel in the U.S. Air Force and 36 years old on the day of the fire.",
          },
          citations: [
            numbers("\"Background\", fourth paragraph"),
            nasm("\"The Astronauts\": \"Edward H. White II, Senior Pilot\""),
            history204("Opening paragraph: \"the astronaut who had performed the first United States extravehicular activity during the Gemini program\""),
            history204("\"Crew\" list: \"Lieutenant Colonel, USAF\""),
          ],
        },
        {
          text: {
            short:
              "Roger Chaffee, the pilot, joined NASA as an astronaut in 1963 after flying for the U.S. Navy. Apollo 1 was going to be his first flight into space.",
            more:
              "Chaffee was born in Grand Rapids, Michigan, on February 15, 1935, and studied aeronautical engineering at Purdue University. He was a lieutenant commander in the Navy and 31 years old on the day of the fire. The three men had worked on one flight together before, though not as crewmates: during Gemini 4, Grissom and Chaffee served as CAPCOMs, talking with Ed White and his commander, James McDivitt.",
          },
          citations: [
            numbers("\"Background\", fifth paragraph: \"Chaffee was training for his first spaceflight\""),
            nasm("\"The Astronauts\": \"Roger B. Chaffee, Pilot\""),
            tribute("Paragraphs beginning \"Roger Chaffee, for whom Apollo 1 would have been his first mission\" and \"The three men had worked an earlier mission together\""),
            history204("\"Crew\" list: \"Lieutenant Commander, USN\""),
          ],
        },
      ],
    },

    /* ---------------------------- What happened --------------------------- */
    {
      title: "What happened",
      facts: [
        {
          text: {
            short:
              "On January 27, 1967, the three astronauts sat in their spacecraft on top of its rocket for a practice countdown. The rocket had no fuel in it, and the test was meant to act out launch day as closely as it could.",
            more:
              "The rehearsal was called the plugs-out test: at the pretend liftoff, the spacecraft's connections to the launch pad would be pulled out and it would switch to its own power. It took place at Launch Complex 34, Cape Kennedy, Florida. As on launch day, the crew wore their spacesuits, the hatches were closed and sealed, and the cabin was filled with pure oxygen at 16.7 pounds per square inch, a little more than the pressure of the air outside. The crew had asked to end the test by practicing how to get out in an emergency. For hours, trouble with the radio links slowed the countdown, and it was held 10 minutes before the pretend liftoff while people worked on the problem.",
          },
          citations: [
            board(`${PART_IV_TEST}: the test's purpose and objectives`, "4-3", "121"),
            board(`${PART_IV_TEST}, continued: the communications problem and the hold at T-10 minutes`, "4-4", "122"),
            board('Part IV, section 1: "This Plugs-Out Test had not been classified as hazardous because only those tests involving fueled vehicles ... were routinely classified as hazardous"', "4-3", "121"),
            finding("Finding 2b", "6-1", "194"),
            numbers("\"The Accident\", first through fifth paragraphs"),
            tragedy("Opening paragraph, and the paragraph beginning \"In January 1967, at the NASA-operated Launch Complex 34\""),
            aftermath("Paragraph beginning \"Astronauts Grissom, White, and Chaffee, clad in their spacesuits\""),
            learning("Opening paragraph: \"atop an unfueled Saturn 1B rocket on launch pad 34\""),
          ],
          discrepancy:
            "The Review Board's Finding 2b gives the test atmosphere as 16.7 pounds per square inch absolute, 100 percent oxygen, and NASA's article on the fire's aftermath also gives 16.7. NASA's articles on the tragedy and on the final preparations, and its article on the mixed-gas decision, give 16 pounds per square inch. We follow the Review Board.",
        },
        {
          text: {
            short:
              "At 6:31 in the evening, the crew reported a fire in the cabin, and in the pure oxygen it spread very fast. The astronauts quickly lost consciousness from the poisonous gases the fire made, and died soon after.",
            more:
              "No one could tell for certain what started the fire. The Review Board decided that the most likely cause was an electrical arc, a spark from wiring near the floor on Grissom's side of the cabin. The cabin held many things that could burn, and in pure oxygen the fire spread very quickly. About 15 seconds after the crew's first report, the rising heat and pressure broke the cabin open. The Board found that the crew died from breathing poisonous gases from the fire, and that they lost consciousness quickly.",
          },
          citations: [
            board(`${PART_IV_FIRE}: "Beginning at 23:31:04.7 GMT (6:31:04.7 P.M. EST), the crew gave the first verbal indication of an emergency"`, "4-5", "123"),
            nasaMission("Mission facts: \"Apollo Pad Fire Emergency Transmission: Jan. 27, 1967; 6:31:05 p.m. EST\""),
            finding("Finding 1 and its Determination", "6-1", "194"),
            finding("Finding 2a and its Determination", "6-1", "194"),
            finding("Finding 3 and its Determination", "6-1", "194"),
            numbers("\"Chronology of the Fire\", first and second paragraphs"),
            fireTimeline("rows 23:31:04.7 (\"First verbal indication of fire reported by crew\") and 23:31:19.4 (\"Command module ruptured\")"),
            aftermath("Paragraph beginning \"The Board released its 3,000-page report on April 9\""),
          ],
        },
        {
          text: {
            short:
              "The spacecraft's inner hatch opened inward, and the rising pressure in the cabin held it shut, so it could not be opened. Ed White, whose job in an emergency was to open the hatch, had started to do it the way he was trained.",
            more:
              "There were three hatches, one outside another: two on the spacecraft itself and one in a cover that protected it during launch. Even in ideal conditions, opening them took at least 1 minute 30 seconds. In an escape, the crew had to open the inner hatch first by pulling it into the cabin, and with the pressure inside higher than outside, that was impossible. The Review Board found that, because of the pressure before the cabin split open and how quickly the astronauts lost consciousness after, the crew never had a chance to get out.",
          },
          citations: [
            finding("Finding 4 and its Determination", "6-1", "194"),
            board(`${PART_IV_FIRE}: "Emergency procedures called for the Senior Pilot ... to unlatch and remove the hatch"`, "4-5", "123"),
            board(`${PART_IV_FIRE}: the three hatches`, "4-6", "124"),
            board(`${PART_IV_FIRE}: "With a slightly higher pressure inside the Command Module than outside, opening the inner hatch is impossible"`, "4-7 to 4-8", "125 to 126"),
            numbers("\"The Accident\", paragraphs on the hatches and the crew"),
            aftermath("Paragraph beginning \"The Board released its 3,000-page report on April 9\": \"taking 90 seconds to open under ideal conditions\""),
            nasm("\"What Went Wrong?\": \"Procedures for emergency escape called for a minimum of 90 seconds.\""),
            tragedy("Paragraph beginning \"At 6:30:55 p.m.\": \"as White tried in vain to open the inward-opening inner spacecraft hatch\""),
          ],
        },
        {
          text: {
            short:
              "Workers on the launch tower rushed through thick smoke and heat to open the hatches from outside. It took them about five minutes, and by then it was too late to save the astronauts.",
            more:
              "Five people took turns opening the three hatches. The smoke was so thick that they worked mostly by touch, and they kept going back out for air. Many of them breathed in smoke or were burned. Because the rocket had no fuel, the test had not been treated as dangerous, so no fire, rescue, or medical teams were standing by, and the gas masks at hand were not made for thick smoke. The Review Board found that \"adequate safety precautions were neither established nor observed for this test.\"",
          },
          citations: [
            board(`${PART_IV_FIRE}: the work to open the hatches`, "4-6", "124"),
            finding("Finding 5, its Determination, and its Recommendations", "6-1 to 6-2", "194 to 195"),
            numbers("\"The Accident\", paragraphs on the rescue"),
            fireTimeline("rows 23:32:04 (\"Attempts to remove hatches\") and 23:36 (\"Hatches opened, outer hatches removed. Resuscitation of crew impossible.\")"),
            tragedy("Paragraph beginning \"Shocked observers watching the closed-circuit television feed\""),
            aftermath("Paragraph beginning \"The Board released its 3,000-page report on April 9\": the test \"had been considered non-hazardous\""),
          ],
        },
      ],
    },

    /* ------------------------ What changed afterward ----------------------- */
    {
      title: "What changed afterward",
      facts: [
        {
          text: {
            short:
              "A NASA review board took the spacecraft apart piece by piece to learn what went wrong. It found that pure oxygen, too many things that could burn, and no quick way out had made the test very dangerous.",
            more:
              "The Apollo 204 Review Board, led by Floyd L. Thompson, director of NASA's Langley Research Center, sent its report to NASA in April 1967. It named six conditions that led to the disaster: a sealed cabin filled with oxygen, many materials in the cabin that could burn, wiring carrying power that could be damaged, pipes carrying a coolant that could burn and corrode, poor ways for the crew to escape, and poor ways to rescue them or give them medical help. The Board concluded that the Apollo team, busy with the many hard problems of spaceflight, had not paid enough attention to ordinary but vital questions of crew safety. NASA also changed how it managed safety, with a new safety office in Houston independent of the Apollo spacecraft program and a new Aerospace Safety Advisory Panel for independent safety oversight.",
          },
          citations: [
            { source: "apollo-204-review-board-report", locator: "Letter of Transmittal to the NASA Administrator, dated April 5, 1967 (PDF page 3)" },
            board('Part I, "Narrative of Board History"', "1-1", "16"),
            finding("Finding 2, Determination: \"The test conditions were extremely hazardous.\"", "6-1", "194"),
            numbers("\"The Investigation\" and \"Cause of the Apollo 1 Fire\", first and second paragraphs"),
            history204("Second paragraph: the board under Dr. Floyd L. Thompson, and the final report completed in April 1967"),
            aftermath("Paragraphs beginning \"In March 7-9\" (disassembly completed March 27) and \"Among the management changes\""),
          ],
        },
        {
          text: {
            short:
              "Engineers designed a new hatch that swung outward and could be opened in seconds, from inside or outside.",
            more:
              "The new \"unified hatch\" replaced the spacecraft's two-piece hatch with a single door of aluminum and fiberglass, helped open by a gas-powered counterbalance. Apollo by the Numbers says the crew could open it from inside in seven seconds, and a pad safety crew in 10 seconds. To open it on the launch pad, an astronaut pumped a handle that released all the latches at once; on the hatch from Apollo 11, five pumps were enough. The Smithsonian's National Air and Space Museum keeps the old-style hatches from Apollo 4, built almost the same as Apollo 1's, and the new hatch from Columbia, Apollo 11's command module.",
          },
          citations: [
            numbers("\"Cause of the Apollo 1 Fire\", third paragraph"),
            finding("Finding 4, Recommendation", "6-1", "194"),
            learning("Paragraphs on the Apollo 4 hatches, the Block II \"unified hatch\", and the Apollo 11 hatch"),
            aftermath("Paragraph beginning \"Following the fire, NASA decided\""),
            tribute("Paragraph beginning \"Beside the failed hatch\""),
          ],
          discrepancy:
            "Apollo by the Numbers gives seven seconds to open the new hatch from inside and 10 seconds for a pad safety crew. NASA's 2022 article on the fire's aftermath says it could be opened from inside or outside in three seconds, and NASA's 2017 article on the Kennedy Space Center tribute says five seconds. We follow Apollo by the Numbers.",
        },
        {
          text: {
            short:
              "NASA removed or replaced many things in the cabin that could burn. On the launch pad, the cabin was now filled with a mix of oxygen and nitrogen instead of pure oxygen.",
            more:
              "After more than 140 fire tests in full-size test versions of the command module and lunar module, NASA chose a mix of 60 percent oxygen and 40 percent nitrogen for the cabin on the launch pad, while the crew still breathed pure oxygen in their suits. In orbit, the mix was slowly replaced with pure oxygen at a much lower pressure, 5 pounds per square inch. Wire bundles got protective covers, metal switches replaced plastic ones, high-pressure oxygen tubing was made of stainless steel instead of aluminum, flammable materials were replaced or kept in fireproof containers, and a fire extinguisher was added to the cabin. Astronauts got new spacesuits made with fire-resistant materials, and the launch pad got better firefighting equipment and emergency escape routes.",
          },
          citations: [
            finding("Finding 2, Recommendation: \"The amount and location of combustible materials in the Command Module must be severely restricted and controlled.\"", "6-1", "194"),
            numbers("\"Cause of the Apollo 1 Fire\", third through fifth paragraphs"),
            { source: "nasa-apollo-1-mixed-gas-atmosphere", locator: "Article text, both paragraphs" },
            aftermath("Paragraph beginning \"Following the fire, NASA decided\""),
          ],
        },
        {
          text: {
            short:
              "In October 1968, Apollo 7 carried astronauts into space in the redesigned spacecraft. Its crew, Wally Schirra, Donn Eisele, and Walter Cunningham, had been the backup crew for Apollo 1.",
            more:
              "Twenty-one months after the fire, Apollo 7 began the flights of Apollo with crews, testing the command and service module in orbit around Earth from October 11 to 22, 1968. NASA had announced in May 1967 that the Apollo 1 backup crew would fly the first crewed Apollo mission. At a news conference the next day, they and their own backup crew said they were satisfied with the changes, among them the new outward-opening hatch, the removal or replacement of flammable materials, the protected wiring, and the flame-resistant spacesuits. Every Apollo crew after that flew in the redesigned spacecraft, with the new hatch and the other safety features.",
          },
          citations: [
            apollo7("heading (\"11 October–22 October 1968\") and \"Background\", first and second paragraphs"),
            nasaMission("Mission facts: \"Backup Crew\" row"),
            numbers("\"Background\", third through fifth paragraphs: each astronaut's backup"),
            aftermath("Paragraph beginning \"On May 9, NASA announced\""),
            learning("Paragraph beginning \"All the Apollo crews flew in redesigned spacecraft\""),
          ],
        },
      ],
    },

    /* ------------------------ How they are remembered ---------------------- */
    {
      title: "How they are remembered",
      facts: [
        {
          text: {
            short:
              "The mission's official name was AS-204, but in the spring of 1967 NASA named it Apollo 1, in honor of the crew. Apollo 1 was the name the crew had meant to use.",
            more:
              "George E. Mueller, NASA's Associate Administrator for Manned Space Flight, made the announcement. Two earlier test flights that carried Apollo spacecraft, AS-201 and AS-202, had been called Apollo 1 and Apollo 2 unofficially. Mueller also said that the first launch of the Saturn V rocket, planned for November 1967, would be called Apollo 4. No mission was ever named Apollo 2 or Apollo 3.",
          },
          citations: [
            nasaMission("\"Apollo 1 Tragedy\", paragraph beginning \"In the spring of 1967\" and the sentences before it"),
            nasm("Opening paragraph: \"officially designated Apollo 1, which was name for the mission the crew had intended to use\""),
            nasm("\"What Came Next?\""),
            history204("Second paragraph: \"The AS-204 mission was redesignated Apollo I in honor of the crew.\""),
          ],
        },
        {
          text: {
            short:
              "The nation honored the three astronauts at their funerals. Gus Grissom and Roger Chaffee are buried at Arlington National Cemetery, and Ed White at West Point.",
            more:
              "President Lyndon B. Johnson said: \"Three valiant young men have given their lives in the nation's service. We mourn this great loss and our hearts go out to their families.\" Memorial services for each astronaut were held in Houston on January 29 and 30, 1967, and on January 31 each was buried with full military honors, with fellow astronauts serving as pallbearers. President Johnson attended the funerals at Arlington, and First Lady \"Lady Bird\" Johnson and Vice President Hubert H. Humphrey attended the one at West Point.",
          },
          citations: [
            aftermath("Opening quotation from President Lyndon B. Johnson"),
            aftermath("Paragraph beginning \"On Jan. 29-30, separate memorial services\""),
          ],
        },
        {
          text: {
            short:
              "In 2017, 50 years after the fire, NASA opened a tribute to the crew at Kennedy Space Center in Florida. It shows things from their lives and the hatch from their spacecraft.",
            more:
              "The tribute, \"Ad Astra Per Aspera – A Rough Road Leads to the Stars,\" opened in the Apollo/Saturn V Center on January 27, 2017, with the blessing of the astronauts' families. It shows the men as their families knew them, with things like Grissom's hunting jacket, the hand-held thruster White used to steer himself on his spacewalk, and board games Chaffee played with his wife and children. Its display of the three-part hatch was the first time any part of the Apollo 1 spacecraft had been shown to the public. The command module itself is kept in storage at NASA's Langley Research Center in Hampton, Virginia.",
          },
          citations: [
            tribute("Opening paragraphs and the paragraphs on each astronaut's display"),
            tribute("Paragraph beginning \"The tribute also displays for the first time the three-section hatch\", and the photo caption before it"),
            aftermath("Last paragraph, beginning \"After the conclusion of the investigation\""),
          ],
        },
        {
          text: {
            short:
              "Every year, NASA holds a Day of Remembrance for the crew of Apollo 1 and the other astronauts who lost their lives exploring space.",
            more:
              "NASA centers across the country take part in the agency's yearly memorial event, which also honors the crews of the space shuttles Challenger and Columbia. At Kennedy Space Center the 2021 ceremony was held at the Space Mirror Memorial in the Visitor Complex. The mirror was dedicated in 1991 to honor all astronauts who lost their lives on missions or in training, and Congress has named it a National Memorial.",
          },
          citations: [
            {
              source: "nasa-apollo-1-day-of-remembrance",
              locator: "Opening paragraphs, the paragraph beginning \"The date marks the 35th anniversary\", and the paragraph on the Astronauts Memorial Foundation",
            },
          ],
        },
      ],
    },
  ],

  photo: {
    src: "media/apollo-1/s66-30236.jpg",
    width: 1600,
    height: 1280,
    alt: "Ed White, Gus Grissom, and Roger Chaffee, from left to right, smile behind a table covered with green cloth. They wear light blue NASA flight suits with name tags. A small white model of the Apollo command module sits on the table in front of them, and an American flag stands behind them on the left.",
    credit: "NASA",
    sourceUrl: "https://images.nasa.gov/details/S66-30236",
  },
};
