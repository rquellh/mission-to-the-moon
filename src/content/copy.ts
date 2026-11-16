import { EARTH_MOON_DISTANCE_IN_EARTH_WIDTHS } from './physical-constants';

const SITE_TITLE = 'Mission to the Moon';

/** How to move the 3D view, the second half of the canvas label. */
const CANVAS_CONTROLS =
  'Drag or swipe to turn the view; scroll or pinch to zoom. When focused, arrow keys turn the view and the plus and minus keys zoom.';

/**
 * Interface text, kept in one place so later steps can revise it easily.
 * Written for a ten-year-old first: short labels, plain words.
 *
 * Nothing here may assume a particular mission. Text that depends on how far
 * a flight went is keyed by the mission's destination ("moon" or
 * "earth-orbit"). Facts about a mission belong in its cited content, never here.
 */
export const copy = {
  siteTitle: SITE_TITLE,
  /** The browser tab's title for a mission. */
  pageTitle: (missionName: string) => `${missionName} · ${SITE_TITLE}`,

  /** Before the mission is known. */
  canvasLabel: `3D view of the mission. ${CANVAS_CONTROLS}`,
  /** Once it is known, by destination. */
  canvas: {
    moon: `3D view of Earth, the Moon, and stars. ${CANVAS_CONTROLS}`,
    'earth-orbit': `3D view of Earth and stars. ${CANVAS_CONTROLS}`,
  },
  loading: 'Loading the 3D view…',
  loadingMission: (missionName: string) => `Loading ${missionName}…`,

  /** The mission picker: the first thing a visitor sees, and reachable from the header. */
  hub: {
    lede: 'Choose a mission and ride along in 3D, from liftoff to splashdown.',
    tour: 'Take the tour',
    tourOf: (missionName: string) => `Take the tour of ${missionName}`,
    explore: 'Explore',
    exploreMission: (missionName: string) => `Explore ${missionName}`,
    current: 'Now showing',
    programs: {
      gemini: 'Gemini',
      apollo: 'Apollo',
    },
  },

  header: {
    about: 'About',
    aboutFull: 'About this mission',
    sources: 'Sources',
    sourcesFull: 'Sources and credits',
    /** Spoken after the mission's name on the button that opens the mission picker. */
    missions: 'all missions',
    missionsHint: 'All missions',
  },

  views: {
    groupLabel: 'Look at',
    earth: 'Earth',
    moon: 'Moon',
    spacecraft: 'Ship',
    journey: 'Both',
    trueScale: 'True scale',
    howDrawn: 'How this is drawn',
  },

  /** The note under the 3D view, by destination and scale. */
  scaleNote: {
    moon: {
      readable: 'Distances not to scale',
      true: `True scale: the Moon is about ${Math.round(EARTH_MOON_DISTANCE_IN_EARTH_WIDTHS)} Earth-widths away`,
    },
    'earth-orbit': {
      readable: 'Orbit height not to scale',
      true: 'True scale: orbit height drawn to scale',
    },
  },

  /** Mission time read out in words, for screen readers. */
  time: {
    atLiftoff: 'at liftoff',
    justBeforeLiftoff: 'just before liftoff',
    hours: (count: number) => `${count} ${count === 1 ? 'hour' : 'hours'}`,
    minutes: (count: number) => `${count} ${count === 1 ? 'minute' : 'minutes'}`,
    fromLiftoff: (span: string, before: boolean) => `${span} ${before ? 'before' : 'after'} liftoff`,
  },

  timeline: {
    regionLabel: 'Timeline',
    play: 'Play',
    pause: 'Pause',
    scrubber: 'Mission time',
    speed: 'Speed',
    chapter: 'Jump to a chapter',
    sinceLiftoff: 'since liftoff',
    beforeLiftoff: 'before liftoff',
    lockedDuringTour: 'The timeline follows the tour. Exit the tour to use it.',
  },

  card: {
    regionLabel: 'What is happening',
    previous: 'Previous event',
    next: 'Next event',
    afterLiftoff: 'after liftoff',
    beforeLiftoff: 'before liftoff',
    tellMore: 'Tell me more',
    tellLess: 'Show less',
    sourcesDiffer: 'Sources differ.',
    sources: 'Sources',
    photoCredit: 'Photo:',
    original: 'Original',
    expand: 'Show the whole card',
    collapse: 'Show less of the card',
    nowShowing: (title: string, spokenTime: string) => `${title}, ${spokenTime}.`,
  },

  tour: {
    label: 'Guided tour',
    stopOf: (index: number, total: number) => `Stop ${index} of ${total}`,
    onTheWay: 'On the way…',
    back: 'Back',
    next: 'Next',
    finish: 'Finish',
    exit: 'Exit tour',
    arrived: (index: number, total: number, title: string) => `Stop ${index} of ${total}: ${title}.`,
    endTitle: 'That’s the tour!',
    endText:
      'Now it’s your turn. Press play, drag the timeline, or pick a chapter. Use the arrows on each card to step through every event.',
    endExplore: 'Explore on my own',
    endAgain: 'Start the tour again',
    ended: 'Tour ended. You are exploring on your own.',
  },

  about: {
    titlePrefix: 'About',
    launch: (when: string, site: string, vehicle: string) =>
      `Launched ${when} from ${site}, on a ${vehicle}.`,
    launchUndated: (site: string, vehicle: string) => `Launched from ${site}, on a ${vehicle}.`,
    crew: 'The crew',
    callSigns: 'Spacecraft names',
    accomplishments: 'What they did',
    whereNow: 'Where the spacecraft are now',
    sources: 'Sources',
  },

  /** What in the 3D view is exact and what is drawn for clarity, by destination. */
  howDrawn: {
    title: 'How this is drawn',
    paragraphs: {
      moon: [
        'Earth and the Moon are held still in this view, the way NASA’s mission diagrams show them. In real life, the Moon keeps moving along its orbit while the spacecraft travels.',
        'The times and places NASA published, like when the engines fired and where the lunar module landed, are exact.',
        'The path drawn between those points is an illustration. It shows the shape of the trip, not every turn the spacecraft made.',
        'In the normal view, the distance between Earth and the Moon is squeezed so both fit on your screen, and orbits are drawn higher above the ground so you can see them. Turn on True scale to see the real distance.',
        'The spacecraft are simple models, drawn far bigger than they really are. At their real size they would be too small to see.',
        'Sunlight comes from the direction it really did. The night side of Earth and the Moon is drawn brighter than it really is, so you can still see where you are.',
      ],
      'earth-orbit': [
        'The times and places NASA published, like when the engines fired and where the spacecraft came down, are exact.',
        'The path drawn between those points is an illustration. It shows the shape of the flight, not every turn the spacecraft made.',
        'In the normal view, orbits are drawn higher above the ground than they really were, so you can see them. Turn on True scale to see their real height.',
        'The spacecraft are simple models, drawn far bigger than they really are. At their real size they would be too small to see.',
        'When two spacecraft fly close together, the gap between them is not to scale. They are placed so you can see both.',
        'How a spacecraft turns and spins is an illustration too. It follows the speeds NASA published, but not every wobble.',
        'Each trip around Earth is one loop of the line. Older loops are dimmed so the newest one stands out.',
        'Sunlight comes from the direction it really did. The night side of Earth is drawn brighter than it really is, so you can still see where you are.',
      ],
    },
  },

  credits: {
    intro:
      'Every fact on this site comes from one of the sources below. The images and software are credited after them.',
    sources: 'Sources',
    photos: 'Photos',
    media: 'Images, data, and software',
    checked: (date: string) => `Link checked ${date}`,
    usedFor: 'Used for',
    credit: 'Credit',
    changes: 'Changes',
    originalFile: 'Original file',
  },

  close: 'Close',
  opensInNewTab: '(opens in a new tab)',

  errors: {
    noWebGL:
      'This 3D view needs WebGL 2, which this browser or device does not have turned on. You can still read about the mission below. To see the 3D view, try a current version of Chrome, Edge, Firefox, or Safari, or turn on hardware acceleration in your browser settings.',
    contextLost:
      'The 3D view stopped because the graphics processor reset. It should recover on its own; if it does not, reload the page.',
    textures:
      'Some images for the 3D view did not load. Check your connection and reload the page.',
  },
} as const;
