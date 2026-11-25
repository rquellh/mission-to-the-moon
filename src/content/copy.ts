import { EARTH_MOON_DISTANCE_IN_EARTH_WIDTHS } from './physical-constants';

const SITE_TITLE = 'Mission to the Moon';

/** The name of the list of every mission, wherever a button opens it. */
const ALL_MISSIONS = 'All missions';

/** Leaving the guided way in to roam the mission freely. */
const EXPLORE_ON_MY_OWN = 'Explore on my own';

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

  /** The first screen: the mission on show, the ways into it, and the way to every other mission. */
  welcome: {
    title: (missionName: string) => `Ride along on ${missionName}`,
    tour: 'Take the tour',
    /** Under "Take the tour": how many stops the tour makes. */
    stops: (count: number) =>
      `${count} ${count === 1 ? 'stop' : 'stops'}, from liftoff to splashdown`,
    explore: EXPLORE_ON_MY_OWN,
    allMissions: ALL_MISSIONS,
    /** Under "All missions": the programs and the years the list covers, for example "Gemini and Apollo, 1965 to 1972". */
    span: (programs: string, years: string) => `${programs}, ${years}`,
    /** The number beside "All missions", read out. */
    count: (count: number) => `${count} ${count === 1 ? 'mission' : 'missions'}`,
  },

  /** The list of every mission: opened from the welcome, and from the mission's name in the header. */
  hub: {
    title: ALL_MISSIONS,
    lede: 'Choose a flight and ride along in 3D, from liftoff to splashdown.',
    /** The same, when this browser has no 3D view. */
    ledeNo3D:
      'Choose a flight and follow it, from liftoff to splashdown. This browser can’t show the 3D view, but every mission can still be read.',
    /** Added to the lede when the list has a memorial page, for a crew that never flew. */
    ledeMemorial: (names: string, count: number) =>
      `${names} ${count === 1 ? 'is' : 'are'} remembered here too.`,
    tour: 'Tour',
    tourOf: (missionName: string) => `Take the tour of ${missionName}`,
    explore: 'Explore',
    exploreMission: (missionName: string) => `Explore ${missionName}`,
    read: 'Read',
    readAbout: (missionName: string) => `Read about ${missionName}`,
    current: 'Now showing',
    /** Marks an unfinished mission, which only the dev server lists. */
    draft: 'Draft',
    /** The years a program's listed missions span, read out. */
    yearsSpoken: (first: number, last: number) =>
      first === last ? String(first) : `${first} to ${last}`,
    programs: {
      gemini: 'Gemini',
      apollo: 'Apollo',
    },
    /** The extras, in two small groups under the missions. */
    extras: {
      'hands-on': 'Try it yourself',
      explore: 'More to explore',
    },
    open: 'Open',
    openExtra: (title: string) => `Open ${title}`,
  },

  /** The full-screen sheet an extra opens in. */
  extra: {
    loadingUnnamed: 'Loading…',
    failed: (title: string) =>
      `${title} did not load. Check your connection and reload the page, or go back to the mission.`,
    failedUnnamed:
      'This did not load. Check your connection and reload the page, or go back to the mission.',
    reload: 'Reload',
    back: 'Back to the mission',
  },

  /**
   * The end of a run in a hands-on extra: what's next. The extra says the
   * next step and its own actions; the sheet adds the rest, so every extra
   * ends the same way.
   */
  upNext: {
    title: 'Up next',
    /** After the extra's sentence, while the flight the next step flies is not collected yet. */
    collect: 'Fly it to collect its patch.',
    /** On a phone: the door that pulls the next step up into a sheet with the picks and the other ways on. */
    more: 'More to explore',
    lessLabel: 'Show less',
    /** The two shelves, one pick each. */
    handsOn: 'Try it yourself',
    explore: 'More to explore',
    open: 'Open',
    openExtra: (title: string) => `Open ${title}`,
    /** Only when the extra was opened from the list (or on its own): back to every mission. */
    allMissions: ALL_MISSIONS,
  },

  /** A page of remembrance, for a crew that did not fly. */
  memorial: {
    crew: 'The crew',
    loadingUnnamed: 'Loading…',
    failed: 'This page did not load. Check your connection and reload the page.',
    reload: 'Reload',
  },

  header: {
    /** Spoken after the mission's name on the button that opens the mission picker. */
    missions: 'all missions',
    missionsHint: ALL_MISSIONS,
  },

  /** What the camera looks at, shown at the top left with Controls. */
  views: {
    groupLabel: 'Look at',
    earth: 'Earth',
    moon: 'Moon',
    spacecraft: 'Ship',
    journey: 'Both',
    trueScale: 'True scale',
  },

  /** The small note beside True scale, by destination and scale. */
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
    fromLiftoff: (span: string, before: boolean) =>
      `${span} ${before ? 'before' : 'after'} liftoff`,
    /** Added to the time on flights longer than two days. */
    onDay: (day: number) => `day ${day} of the flight`,
    seconds: (count: number) => `${count} ${count === 1 ? 'second' : 'seconds'}`,
  },

  /** Play, and the tools behind "Controls" for moving through the flight. */
  timeline: {
    regionLabel: 'Timeline',
    play: 'Play',
    pause: 'Pause',
    scrubber: 'Mission time',
    speed: 'Speed',
    chapter: 'Jump to a chapter',
    sinceLiftoff: 'since liftoff',
    beforeLiftoff: 'before liftoff',
    /** Beside the clock on flights longer than two days. Day 1 is the first 24 hours. */
    day: (day: number) => `Day ${day}`,
    /** Under the chapter's name beside Play, on flights longer than two days. */
    dayOf: (day: number, total: number) => `Day ${day} of ${total}`,
    /** Beside the clock while the ship circles too fast to follow and the view holds still. */
    fastForward: 'Fast forward',
    fastForwardSpoken:
      'Fast forward. The ship goes around too fast to see, so its path shows as a ring.',
    /** On Play, which rests while the tour runs the clock. */
    lockedDuringTour: 'The tour runs the clock for you. Exit the tour to play it yourself.',
  },

  /** The moment card at the bottom of the screen, and its two doors. */
  card: {
    regionLabel: 'What is happening',
    previous: 'Previous event',
    next: 'Next event',
    afterLiftoff: 'after liftoff',
    beforeLiftoff: 'before liftoff',
    /** The door to the records of the moment: its longer text, recording, photo, and sources. */
    tellMore: 'Tell me more',
    tellLess: 'Show less',
    /** The door to the tools for moving through the flight. */
    controls: 'Controls',
    /** Beside Play: the chapter and the day while "Tell me more" is open, or on a phone the clock while Controls are open. */
    where: 'Where the flight is',
    /** The photo's small picture on the card, which opens "Tell me more" at the photo. */
    seePhoto: 'See the photo',
    sourcesDiffer: 'Sources differ.',
    /** Also the name of "Tell me more" when a moment has nothing but its sources. */
    sources: 'Sources',
    photoCredit: 'Photo:',
    original: 'Original',
    nowShowing: (title: string, spokenTime: string) => `${title}, ${spokenTime}.`,
    /** The button that opens an event's hands-on extra. */
    tryIt: 'Try it',
    tryItLabel: (title: string) => `Try it: ${title}`,
    /** Once the clock has reached the end of the flight: shows what comes next. */
    finish: 'Finish',
  },

  /** "Tell me more": the records of the moment on the card. */
  records: {
    fullStory: 'The full story',
    photo: 'Photo',
    /** Under "About <mission>": what that page tells, with the spacecraft's names when the mission has them. */
    aboutLine: (hasCallSigns: boolean) =>
      hasCallSigns ? 'Crew, spacecraft names, what they did' : 'Crew and what they did',
    credits: 'Sources and credits',
  },

  /** The recording player in "Tell me more", and its button on the moment card. Its words are always shown as text. */
  audio: {
    label: 'Recording',
    play: 'Hear the recording',
    pause: 'Pause',
    loading: 'Loading…',
    playLabel: (length: string) => `Hear the recording, ${length}`,
    pauseLabel: 'Pause the recording',
    /** The card's shorter button for the same recording; its spoken name keeps the length. */
    listen: 'Listen',
    listenLabel: (length: string) => `Listen to the recording, ${length}`,
    playing: 'Playing the recording.',
    paused: 'Recording paused.',
    ended: 'The recording has ended.',
    failed: 'The recording did not load. Press Play to try again.',
    transcript: 'What they said',
    credit: 'Recording:',
  },

  tour: {
    label: 'Guided tour',
    stopOf: (index: number, total: number) => `Stop ${index} of ${total}`,
    onTheWay: 'On the way…',
    back: 'Back',
    next: 'Next',
    finish: 'Finish',
    /** The Next button while the tour is on its way to a stop. */
    skip: 'Skip',
    skipLabel: 'Skip to this stop',
    exit: 'Exit tour',
    /** Said as the tour sets off: the card stays on the stop just left until the clock reaches the next one. */
    headingFor: (index: number, total: number, title: string) =>
      `On the way to stop ${index} of ${total}: ${title}.`,
    arrived: (index: number, total: number, title: string) =>
      `Stop ${index} of ${total}: ${title}.`,
    ended: 'Tour ended. You are exploring on your own.',
  },

  /**
   * The end of every flight, in the moment card: what comes next. One
   * recommended next step, and "More to explore", which opens one pick from
   * each shelf.
   */
  ending: {
    title: 'That’s the flight!',
    /** The round button where Play was: the flight from the beginning. */
    watchAgain: 'Watch again',
    /** The same button after the guided tour: the tour from its first stop. */
    tourAgain: 'Start the tour again',
    /** Beside the patch: how many flights this device has flown. */
    patchCollected: (count: number, total: number) => `Patch collected · ${count} of ${total}`,
    /** The same, for a flight whose crew had no patch (its page in the book still fills in). */
    flightCollected: (count: number, total: number) => `Flight collected · ${count} of ${total}`,
    /** The main button: the next flight to fly. */
    next: (missionName: string) => `Next: ${missionName}`,
    /** The door that opens one pick from each shelf. */
    more: 'More to explore',
    less: 'Less',
    lessLabel: 'Show less',
    /** Under the title, with "More to explore" open. */
    flew: (missionName: string) => `You flew ${missionName} from liftoff to splashdown.`,
    inYourBook: (count: number, total: number) =>
      `Its patch is in your book: ${count} of ${total}.`,
    pageInYourBook: (count: number, total: number) =>
      `Its page in your book is filled in: ${count} of ${total}.`,
    /** The three shelves, one pick each. */
    nextFlight: 'Next flight',
    handsOn: 'Try it yourself',
    explore: 'More to explore',
    fly: (missionName: string) => `Fly ${missionName}`,
    /** In place of the next flight, once this device has flown them all. */
    allFlown: 'You have flown every flight! Pick any one to fly again from All missions.',
    open: 'Open',
    openExtra: (title: string) => `Open ${title}`,
    /** The quiet actions at the bottom. After the guided tour, one keeps exploring the flight. */
    keepExploring: EXPLORE_ON_MY_OWN,
    about: (missionName: string) => `About ${missionName}`,
    credits: 'Sources and credits',
    allMissions: ALL_MISSIONS,
    /** The number beside "All missions", read out. */
    count: (count: number) => `${count} ${count === 1 ? 'mission' : 'missions'}`,
  },

  about: {
    titlePrefix: 'About',
    launch: (when: string, site: string, vehicle: string) =>
      `Launched ${when} from ${site}, on a ${vehicle}.`,
    launchUndated: (site: string, vehicle: string) => `Launched from ${site}, on a ${vehicle}.`,
    crew: 'The crew',
    callSigns: 'Spacecraft names',
    accomplishments: 'What they did',
    whereNow: (count: number) =>
      count === 1 ? 'Where the spacecraft is now' : 'Where the spacecraft are now',
    sources: 'Sources',
  },

  /**
   * What in the 3D view is exact and what is drawn for clarity. Each
   * paragraph is shown only for flights it is true of: some depend on how
   * far the flight went, others on what its flight plan holds (a Moon
   * landing, a splashdown, a second ship, a published spin).
   */
  howDrawn: {
    title: 'How this is drawn',
    /** Moon flights. */
    heldStill:
      'Earth and the Moon are held still in this view, the way NASA’s mission diagrams show them. In real life, the Moon keeps moving along its orbit while the spacecraft travels.',
    exact: {
      /** A lander touched down on the Moon. */
      moonLanding:
        'The times and places NASA published, like when the engines fired and where the lunar module landed, are exact.',
      /** No landing on the Moon, but the flight plan ends in a splashdown. */
      splashdown:
        'The times and places NASA published, like when the engines fired and where the spacecraft came down, are exact.',
      other: 'The times and places NASA published, like when the engines fired, are exact.',
    },
    path: {
      moon: 'The path drawn between those points is an illustration. It shows the shape of the trip, not every turn the spacecraft made.',
      'earth-orbit':
        'The path drawn between those points is an illustration. It shows the shape of the flight, not every turn the spacecraft made.',
    },
    scale: {
      moon: 'In the normal view, the distance between Earth and the Moon is squeezed so both fit on your screen, and orbits are drawn higher above the ground so you can see them. Turn on True scale to see the real distance.',
      'earth-orbit':
        'In the normal view, orbits are drawn higher above the ground than they really were, so you can see them. Turn on True scale to see their real height.',
    },
    models: {
      one: 'The spacecraft is a simple model, drawn far bigger than it really is. At its real size it would be too small to see.',
      many: 'The spacecraft are simple models, drawn far bigger than they really are. At their real size they would be too small to see.',
    },
    /** Earth-orbit flights with a second ship. */
    closeTogether:
      'When two spacecraft fly close together, the gap between them is not to scale. They are placed so you can see both.',
    /** Flights whose vehicle file gives a published turning speed. */
    turning:
      'How a spacecraft turns and spins is an illustration too. It follows the speeds NASA published, but not every wobble.',
    /** Earth-orbit flights. */
    loops:
      'Each trip around Earth is one loop of the line. Older loops are dimmed so the newest one stands out.',
    sunlight: {
      moon: 'Sunlight comes from the direction it really did. The night side of Earth and the Moon is drawn brighter than it really is, so you can still see where you are.',
      'earth-orbit':
        'Sunlight comes from the direction it really did. The night side of Earth is drawn brighter than it really is, so you can still see where you are.',
    },
  },

  credits: {
    intro: (missionName: string) =>
      `Every fact on this site comes from one of the sources below. The ones for ${missionName} come first. Photos, images, and software are credited after them.`,
    sources: 'Sources',
    /** Sources that many missions cite. */
    shared: 'Used by many missions',
    otherMissions: 'Other missions',
    /** The extras' own sources. */
    extras: 'Things to try and explore',
    sourceCount: (count: number) => `${count} ${count === 1 ? 'source' : 'sources'}`,
    photos: 'Photos',
    photosNote:
      'Each mission’s photos are credited on its own cards, and listed here when that mission is open.',
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
      'This browser can’t show the 3D view, but you can still read about every mission. To see it in 3D, try a current Chrome, Edge, Firefox, or Safari.',
    contextLost:
      'The 3D view stopped because the graphics processor reset. It should recover on its own; if it does not, reload the page.',
    textures:
      'Some images for the 3D view did not load. Check your connection and reload the page.',
    scene:
      'The 3D view did not load, but you can still read about every mission. To see it in 3D, check your connection and reload the page.',
    mission: (missionName: string) =>
      `${missionName} did not load. Check your connection and reload the page, or choose another mission.`,
    missionUnnamed:
      'This mission did not load. Check your connection and reload the page, or choose another mission.',
    allMissions: ALL_MISSIONS,
  },
} as const;
