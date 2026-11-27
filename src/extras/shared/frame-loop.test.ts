/**
 * The loop a flown game runs while anything moves (frame-loop.ts): on its
 * own animation frames when there is no 3D view, and on the view's frames
 * when there is one. The screen's frames are the test's (fakeFrames), so
 * nothing moves until the test draws a frame, and the view is a stand-in
 * whose frames the test runs itself.
 *
 * Run: npx vitest run src/extras/shared/frame-loop.test.ts
 */
import { describe, expect, it } from 'vitest';
import type { FrameCallback, MiniView } from '../../scene/kit.ts';
import { fakeFrames, type Frames } from '../../test/fakes.ts';
import { createFrameLoop, type FrameLoop } from './frame-loop.ts';

/** About sixty frames a second, as most screens draw. */
const FRAME_MS = 16;
const FRAME_SECONDS = FRAME_MS / 1000;

/** A step that writes down the seconds it is given, frame by frame. */
interface Recorder {
  readonly seconds: number[];
  step(seconds: number): void;
}

function recorder(): Recorder {
  const seconds: number[] = [];
  return {
    seconds,
    step: (each) => {
      seconds.push(each);
    },
  };
}

/** Draw `count` frames. */
function draw(frames: Frames, count: number): void {
  for (let drawn = 0; drawn < count; drawn += 1) frames.frame();
}

/** A 3D view's frames without the 3D: the test runs the callbacks itself. */
interface FakeView extends Pick<MiniView, 'addFrameCallback'> {
  readonly callbacks: Set<FrameCallback>;
  /** One of the view's frames, with the seconds the view worked out; what each callback said back. */
  frame(seconds: number): ReturnType<FrameCallback>[];
}

function fakeView(): FakeView {
  const callbacks = new Set<FrameCallback>();
  return {
    callbacks,
    addFrameCallback(callback) {
      callbacks.add(callback);
      return () => {
        callbacks.delete(callback);
      };
    },
    frame: (seconds) => [...callbacks].map((callback) => callback(seconds, 0)),
  };
}

describe('the frame loop', () => {
  describe('with no 3D view', () => {
    it('gives 0 seconds on the first frame, then the time since the frame before', () => {
      const frames = fakeFrames(FRAME_MS);
      const { seconds, step } = recorder();
      createFrameLoop(step).start();

      draw(frames, 3);

      expect(seconds).toEqual([0, FRAME_SECONDS, FRAME_SECONDS]);
    });

    it('gives no more than a tenth of a second, however long the gap since the frame before', () => {
      // Two seconds between frames, as when a tab comes back from the background.
      const frames = fakeFrames(2000);
      const { seconds, step } = recorder();
      createFrameLoop(step).start();

      draw(frames, 3);

      expect(seconds).toEqual([0, 0.1, 0.1]);
    });

    it('runs one loop when it is started twice', () => {
      const frames = fakeFrames(FRAME_MS);
      const { seconds, step } = recorder();
      const loop = createFrameLoop(step);
      loop.start();
      loop.start();

      draw(frames, 3);

      expect(loop.running).toBe(true);
      expect(seconds).toEqual([0, FRAME_SECONDS, FRAME_SECONDS]);
    });

    it('stops calling the step once it is stopped, and stopping again does nothing', () => {
      const frames = fakeFrames(FRAME_MS);
      const { seconds, step } = recorder();
      const loop = createFrameLoop(step);
      loop.start();
      draw(frames, 2);

      loop.stop();
      loop.stop();
      draw(frames, 5);

      expect(loop.running).toBe(false);
      expect(seconds).toEqual([0, FRAME_SECONDS]);
    });

    it('starts again from 0 seconds after a stop, not from the time it was stopped', () => {
      const frames = fakeFrames(FRAME_MS);
      const { seconds, step } = recorder();
      const loop = createFrameLoop(step);
      loop.start();
      draw(frames, 2);
      loop.stop();
      draw(frames, 5);

      loop.start();
      draw(frames, 2);

      expect(seconds).toEqual([0, FRAME_SECONDS, 0, FRAME_SECONDS]);
    });

    it('can be stopped from inside its own step, as a game stops once nothing moves', () => {
      const frames = fakeFrames(FRAME_MS);
      const { seconds, step } = recorder();
      const loop: FrameLoop = createFrameLoop((each) => {
        step(each);
        if (seconds.length === 2) loop.stop();
      });
      loop.start();

      draw(frames, 5);

      expect(loop.running).toBe(false);
      expect(seconds).toEqual([0, FRAME_SECONDS]);
    });

    it('runs on its own animation frames when the view is null', () => {
      const frames = fakeFrames(FRAME_MS);
      const { seconds, step } = recorder();
      createFrameLoop(step, null).start();

      draw(frames, 2);

      expect(seconds).toEqual([0, FRAME_SECONDS]);
    });
  });

  describe('riding a 3D view', () => {
    it('adds one callback to the view, which calls the step and keeps the view drawing', () => {
      fakeFrames(FRAME_MS);
      const view = fakeView();
      const { seconds, step } = recorder();
      const loop = createFrameLoop(step, view);
      loop.start();
      loop.start();

      expect(view.callbacks.size).toBe(1);
      expect(view.frame(0)).toEqual([true]);
      expect(view.frame(0.05)).toEqual([true]);
      expect(seconds).toEqual([0, 0.05]);
      expect(loop.running).toBe(true);
    });

    it('asks for no animation frames of its own', () => {
      const frames = fakeFrames(FRAME_MS);
      const { seconds, step } = recorder();
      createFrameLoop(step, fakeView()).start();

      draw(frames, 5);

      expect(seconds).toEqual([]);
    });

    it('takes its callback off the view when stopped, and puts one back when started again', () => {
      fakeFrames(FRAME_MS);
      const view = fakeView();
      const { seconds, step } = recorder();
      const loop = createFrameLoop(step, view);
      loop.start();
      view.frame(0.05);

      loop.stop();

      expect(view.callbacks.size).toBe(0);
      expect(loop.running).toBe(false);
      expect(view.frame(0.05)).toEqual([]);

      loop.start();
      view.frame(0);

      expect(view.callbacks.size).toBe(1);
      expect(seconds).toEqual([0.05, 0]);
    });
  });
});
