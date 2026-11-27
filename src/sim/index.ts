/**
 * The flight-path model: where each spacecraft was at every moment of a
 * mission, in the scene frame, at true and readable scale.
 *
 *   const path = buildFlightPath(flight);
 *   path.position("csm", t, mix, out);       // false when the ship does not exist at t
 *   path.polyline("csm");                     // typed arrays for drawing
 *   const story = createStoryTime(storyKeyTimes(path, eventTimes)); // watchable timeline clock, eased into and out of each event
 *
 * Pure TypeScript: no three.js, no DOM.
 */
export { buildFlightPath } from './build.ts';
export {
  approachesAtEvents,
  CALM_LAP_STORY_SECONDS,
  closesToDocked,
  createStoryTime,
  EASE_GENTLE_PACE,
  EASE_MAX_HURRY,
  EASE_RAMP_MISSION_SECONDS,
  EASE_SHOULDER_MIN_STORY_SECONDS,
  EASE_SHOULDER_STORY_SECONDS,
  EASE_START_PACE,
  onNoClosedLap,
  partingsAtEvents,
  partsFromDocked,
  PLAIN_ORBIT_SECONDS,
  storyIntervalLength,
  storyKeyTimes,
  SWING_LAP_STORY_SECONDS,
  turnsOf,
} from './story-time.ts';
export type {
  Approach,
  Parting,
  StoryKeys,
  StoryTime,
  StoryTimeOptions,
  Stretch,
  StretchPlay,
  Turns,
} from './story-time.ts';
export { READABLE_MOON_DISTANCE, toReadable } from './warp.ts';
export type * from './types.ts';
