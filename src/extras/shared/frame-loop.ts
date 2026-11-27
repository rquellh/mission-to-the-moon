/**
 * The one loop a flown game runs while anything moves: a step called once a
 * frame with the seconds since the last frame. With a 3D view it rides the
 * view's own frames, so the game and the picture move together; with no 3D
 * view (no WebGL, so the screen draws a flat picture) it asks for plain
 * animation frames itself and works out the seconds the same way the view
 * does: 0 on the first frame, and never more than a tenth of a second, so a
 * tab coming back from the background does not jump the game ahead.
 *
 * The docking and landing games still carry their own copies of this loop
 * (in their index.ts) until they are moved over to this one.
 *
 * This folder is not an extra: it has no meta.ts and no index.ts, so the
 * registry in ../index.ts does not list it.
 */
import type { MiniView } from '../../scene/kit.ts';

export interface FrameLoop {
  /** Start calling the step once a frame. Does nothing if already running. */
  start(): void;
  stop(): void;
  readonly running: boolean;
}

/** The longest step a frame is given, in seconds, as the 3D view's own frames are. */
const LONGEST_STEP = 0.1;

/**
 * Calls `step` once a frame with the seconds since the last one: 0 on the first frame, never more
 * than 0.1. With a 3D view it rides the view's own frames (`view.addFrameCallback`, returning true
 * so the view keeps drawing); without one it uses requestAnimationFrame.
 */
export function createFrameLoop(
  step: (seconds: number) => void,
  view?: Pick<MiniView, 'addFrameCallback'> | null,
): FrameLoop {
  // Set while the loop runs: whatever ends this run of it.
  let stopNow: (() => void) | null = null;

  const startOnView = (frames: Pick<MiniView, 'addFrameCallback'>): (() => void) =>
    // The view gives 0 on its first frame and caps each step itself.
    frames.addFrameCallback((seconds) => {
      step(seconds);
      return true;
    });

  const startOnAnimationFrames = (): (() => void) => {
    let frame = 0;
    let last: number | null = null;
    const tick = (now: number): void => {
      const seconds = last === null ? 0 : Math.min(LONGEST_STEP, (now - last) / 1000);
      last = now;
      // The next frame is asked for first, so a step that stops the loop cancels it.
      frame = requestAnimationFrame(tick);
      step(seconds);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  };

  return {
    start() {
      if (stopNow) return;
      stopNow = view ? startOnView(view) : startOnAnimationFrames();
    },
    stop() {
      stopNow?.();
      stopNow = null;
    },
    get running() {
      return stopNow !== null;
    },
  };
}
