/**
 * The seams between the app's parts.
 *
 * The interface (src/ui) and the 3D scene (src/scene) never import each
 * other. They meet through the types in this file: the interface drives a
 * Player (the mission clock) and a Director (the camera and scale), and the
 * scene reads the Player and implements the Director.
 */
import type { EventView } from '../content/types.ts';

/** "readable" compresses distances so everything fits; "true" shows real proportions. */
export type ScaleMode = 'readable' | 'true';

/**
 * A mapping between mission time and "story time".
 *
 * A mission has seconds that matter (staging, landing) and days that do not
 * (the coast to the Moon). Story time gives every stretch between key moments
 * a watchable length, so playback and the timeline scrubber both work in
 * story seconds while the clock readout shows true mission time.
 */
export interface StoryMap {
  /** Total story length, in seconds. */
  readonly duration: number;
  /** Mission elapsed seconds to story seconds. */
  toStory(elapsedSeconds: number): number;
  /** Story seconds to mission elapsed seconds. */
  toElapsed(storySeconds: number): number;
}

/** The mission clock: where we are in the mission and whether time is running. */
export interface Player {
  /** Mission elapsed seconds at the start and end of the mission. */
  readonly start: number;
  readonly end: number;
  readonly story: StoryMap;
  /** Now, in mission elapsed seconds. */
  readonly time: number;
  /** Now, in story seconds. */
  readonly storyTime: number;
  readonly playing: boolean;
  /** Story seconds per real second the visitor chose for playing. 1 is normal speed. A playTo trip leaves it alone. */
  readonly rate: number;
  /**
   * Story seconds per real second the clock is moving at right now: 0 when
   * stopped, `rate` when playing, and a playTo trip's own changing pace
   * during a trip. Use it, not `rate`, to judge how far one frame should move.
   */
  readonly speed: number;
  /** Jump to a mission time. Ends a playTo trip (the clock then stops); otherwise does not change whether time is running. */
  seek(elapsedSeconds: number): void;
  /** Jump to a story time. Ends a playTo trip (the clock then stops); otherwise does not change whether time is running. */
  seekStory(storySeconds: number): void;
  /** Start the clock. At the end of the mission it starts over. During a playTo trip, play on from there at `rate` instead. */
  play(): void;
  /**
   * Play to a story time in a set number of real seconds, whatever the
   * device's frame rate or the chosen rate, easing out of the start and into
   * the end. `playing` is true on the way; the clock stops exactly on the
   * target. pause, seek, seekStory, and play end the trip early.
   */
  playTo(storySeconds: number, seconds: number): void;
  /** Stop the clock, and any playTo trip. */
  pause(): void;
  setRate(rate: number): void;
  /**
   * Hear about every change: each tick while playing, and every seek, play,
   * pause, and rate change. Returns a function that stops listening.
   */
  subscribe(listener: (player: Player) => void): () => void;
}

/** How much of the canvas the interface covers on each side, in CSS pixels. */
export interface ViewInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** What the interface can ask of the 3D scene. */
export interface Director {
  readonly scaleMode: ScaleMode;
  /** Animate between compressed and true proportions. */
  setScaleMode(mode: ScaleMode): void;
  /** The view the camera is in now. */
  readonly view: EventView;
  /**
   * Move the camera to a view. "journey" frames Earth and Moon together;
   * "spacecraft" follows the ship the story is following at the moment.
   * `at` is the mission time the view should frame the spacecraft for, when
   * that is not now: a tour on its way to a stop asks for the view as it
   * should look when it arrives.
   */
  setView(view: EventView, options?: { at?: number }): void;
  /** Keep the framed subject clear of the parts of the canvas the interface covers. */
  setViewInsets(insets: ViewInsets): void;
  /**
   * Stop drawing (false) while something covers the whole view, such as an
   * extra's full-screen sheet with its own 3D view, and start again (true).
   * Optional, so a scene without it still works; it then just keeps drawing.
   */
  setDrawing?(drawing: boolean): void;
  /** True while the followed ship circles too fast to follow and the scene shows its calm fast-forward view. Subscribers are told when it changes. */
  readonly fastForward?: boolean;
  /** True while the camera is on its way to a view, or back to the ship from its fast-forward view. Subscribers are told when it changes. */
  readonly moving?: boolean;
  /** Hear when the view or the scale mode changes. Returns a function that stops listening. */
  subscribe(listener: (director: Director) => void): () => void;
}
