/**
 * The flight-path model: where each spacecraft was at every moment of a
 * mission, in the scene frame, at true and readable scale.
 *
 *   const path = buildFlightPath(flight);
 *   path.position("csm", t, mix, out);       // false when the ship does not exist at t
 *   path.polyline("csm");                     // typed arrays for drawing
 *   const story = createStoryTime(eventTimes); // watchable timeline clock
 *
 * Pure TypeScript: no three.js, no DOM.
 */
export { buildFlightPath } from "./build.ts";
export { createStoryTime, storyIntervalLength } from "./story-time.ts";
export type { StoryTime, StoryTimeOptions } from "./story-time.ts";
export { READABLE_MOON_DISTANCE, toReadable } from "./warp.ts";
export type * from "./types.ts";
