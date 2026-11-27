import type { Source } from '../source-types.ts';

/**
 * Sources cited only by "Fly to orbit", for its own sentences about the real
 * flights (src/extras/orbit/facts.ts). It also cites sources other parts of
 * the site register: the Apollo 7 and Gemini 8 mission reports, and "On the
 * Shoulders of Titans" (SP-4203).
 */
export const sources = {
  'orbit-basics-of-space-flight-gravity': {
    title: 'Basics of Space Flight, Chapter 3: Gravity & Mechanics',
    publisher: 'NASA Science',
    url: 'https://science.nasa.gov/learn/basics-of-space-flight/chapter3-4/',
    checked: '2026-11-27',
    use: 'What an orbit is: to get a spacecraft into orbit, you raise it up and speed it up until, as it falls, it falls all the way around the planet.',
  },
  'orbit-space-place-what-is-an-orbit': {
    title: 'What Is an Orbit?',
    publisher: 'NASA Space Place (NASA Science for Kids)',
    url: 'https://spaceplace.nasa.gov/orbits/en/',
    checked: '2026-11-27',
    use: 'What keeps a spacecraft in orbit: it is always falling toward the planet, but moving sideways fast enough that it never hits it.',
  },
  'orbit-glenn-flight-to-orbit': {
    title: 'Flight To Orbit (Beginners Guide to Aeronautics)',
    publisher: 'NASA Glenn Research Center',
    url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/flight-to-orbit/',
    checked: '2026-11-27',
    use: 'How a rocket climbs to orbit: straight up first, quickly out of the thick air near the ground, then pitching over toward the horizontal as it gathers speed.',
  },
  'orbit-nasm-lvdc-cards': {
    title: 'Cards, Launch Vehicle Digital Computer, Saturn V',
    publisher: 'Smithsonian National Air and Space Museum',
    url: 'https://airandspace.si.edu/collection-objects/cards-launch-vehicle-digital-computer-saturn-v/nasm_A20090028001',
    checked: '2026-11-27',
    use: 'That a computer on the rocket, the Launch Vehicle Digital Computer, guided both the Saturn V and the Saturn IB from launch into Earth orbit.',
  },
  'orbit-gemini-launch-vehicle-development': {
    title:
      'Gemini Launch Vehicle Development (Gemini Midprogram Conference, NASA SP-121, paper 12)',
    publisher:
      'By Walter D. Smith, Program Director, Gemini Program, Martin Marietta Corp. (NASA Technical Reports Server)',
    url: 'https://ntrs.nasa.gov/citations/19660020347',
    checked: '2026-11-27',
    use: "That the Titan II's inertial guidance was replaced by radio guidance when it became the Gemini launch vehicle.",
  },
  'orbit-apollo-abort-planning': {
    title: 'Apollo Experience Report: Abort Planning (NASA TN D-6847)',
    publisher:
      'By Charles T. Hyle, Charles E. Foggatt, and Bobbie D. Weber, NASA Manned Spacecraft Center, June 1972 (NASA Technical Reports Server)',
    url: 'https://ntrs.nasa.gov/citations/19720017278',
    checked: '2026-11-27',
    use: "Apollo's plan for a launch that went wrong above the air: the spacecraft separates from the rocket and lands in the Atlantic Ocean (a mode II abort).",
  },
} as const satisfies Record<string, Source>;
