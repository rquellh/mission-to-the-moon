import { EARTH_MOON_DISTANCE_IN_EARTH_WIDTHS } from './physical-constants';

/**
 * Interface text, kept in one place so later steps can revise it easily.
 * Written for a ten-year-old first: short labels, plain words.
 */
export const copy = {
  siteTitle: 'Mission to the Moon',
  canvasLabel:
    '3D view of Earth, the Moon, and stars. Drag or swipe to turn the view; scroll or pinch to zoom. When focused, arrow keys turn the view and the plus and minus keys zoom.',
  loading: 'Loading Earth, the Moon, and stars…',

  welcome: {
    lede: 'Ride along with Apollo 11, the first mission to land people on the Moon, from liftoff to splashdown.',
    tour: 'Take the tour',
    explore: 'Explore on my own',
    stops: (count: number) => `The tour has ${count} stops. You can leave it at any time.`,
  },

  header: {
    about: 'About',
    aboutFull: 'About this mission',
    sources: 'Sources',
    sourcesFull: 'Sources and credits',
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

  scaleNote: {
    readable: 'Distances not to scale',
    true: `True scale: the Moon is about ${Math.round(EARTH_MOON_DISTANCE_IN_EARTH_WIDTHS)} Earth-widths away`,
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

  howDrawn: {
    title: 'How this is drawn',
    paragraphs: [
      'Earth and the Moon are held still in this view, the way NASA’s mission diagrams show them. In real life, the Moon keeps moving along its orbit while the spacecraft travels.',
      'The times and places NASA published, like when the engines fired and where the lunar module landed, are exact.',
      'The path drawn between those points is an illustration. It shows the shape of the trip, not every turn the spacecraft made.',
      'In the normal view, the distance between Earth and the Moon is squeezed so both fit on your screen, and orbits are drawn higher above the ground so you can see them. Turn on True scale to see the real distance.',
      'The spacecraft are simple models, drawn far bigger than they really are. At their real size they would be too small to see.',
      'Sunlight comes from the direction it really did. The night side of Earth and the Moon is drawn brighter than it really is, so you can still see where you are.',
    ],
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
