/**
 * Stand-ins for what sits at the interface's edges, for the interface tests.
 * Everything inside the edges (the interface, the clock, the tour, the
 * content) is the real thing.
 *
 * - FakeDirector: the 3D scene. It remembers what the interface asked for
 *   and reports it back, as the scene does once the camera has moved.
 * - fakeFrames: the screen's frames and clock. Nothing moves until the test
 *   draws frames, so time never depends on how fast the computer is.
 * - standInExtra: an extra that draws one line of text, for the extras sheet.
 * - later: an answer that arrives when the test says, for loading states and late answers.
 */
import { vi } from 'vitest';
import type { Director, ScaleMode } from '../app/contract.ts';
import type { EventView } from '../content/types.ts';
import type { Extra, ExtraMeta } from '../extras/types.ts';

/** The 3D scene, without the 3D. */
export class FakeDirector implements Director {
  private viewNow: EventView;
  private scaleNow: ScaleMode = 'readable';
  private fastNow = false;
  private drawingNow = true;
  private readonly listeners = new Set<(director: Director) => void>();

  constructor(view: EventView) {
    this.viewNow = view;
  }

  get view(): EventView {
    return this.viewNow;
  }

  get scaleMode(): ScaleMode {
    return this.scaleNow;
  }

  get fastForward(): boolean {
    return this.fastNow;
  }

  /** False while the interface has asked the scene to stop drawing (an extra covers it). */
  get drawing(): boolean {
    return this.drawingNow;
  }

  setView(view: EventView): void {
    this.viewNow = view;
    this.notify();
  }

  setScaleMode(mode: ScaleMode): void {
    this.scaleNow = mode;
    this.notify();
  }

  // jsdom lays nothing out, so the interface only ever reports zero insets here; the browser tests check real ones.
  setViewInsets(): void {}

  setDrawing(drawing: boolean): void {
    this.drawingNow = drawing;
  }

  subscribe(listener: (director: Director) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /* What the scene does on its own, for a test to call. */

  /** The camera moved to a view by itself (as it can on a tour). */
  cameraMovesTo(view: EventView): void {
    this.setView(view);
  }

  /** The followed ship starts (or stops) circling too fast to follow. */
  setFastForward(fast: boolean): void {
    this.fastNow = fast;
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this);
  }
}

export interface Frames {
  /** Real time in milliseconds, on the frames' clock. */
  now(): number;
  /** Draw one frame. */
  frame(): void;
  /** Draw frames for this many real seconds. */
  advance(seconds: number): void;
}

/**
 * The screen: animation frames and the real-time clock (performance.now),
 * both moved only by the test. A frame is drawn every `frameMs`
 * milliseconds of the clock, on demand. Every part that waits for a frame
 * (the mission clock, the announcer, the layout) waits here.
 */
export function fakeFrames(frameMs = 100): Frames {
  let nowMs = 0;
  let lastId = 0;
  const waiting = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback): number => {
    lastId += 1;
    waiting.set(lastId, callback);
    return lastId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number): void => {
    waiting.delete(id);
  });
  vi.spyOn(performance, 'now').mockImplementation(() => nowMs);

  const frame = (): void => {
    nowMs += frameMs;
    const due = [...waiting.values()];
    waiting.clear();
    for (const callback of due) callback(nowMs);
  };
  return {
    now: () => nowMs,
    frame,
    advance(seconds) {
      const count = Math.ceil((seconds * 1000) / frameMs);
      for (let i = 0; i < count; i += 1) frame();
    },
  };
}

/** An extra that only says what it is, opened in the real extras sheet. */
export function standInExtra(meta: ExtraMeta): Extra {
  return {
    meta,
    mount(host, context, params) {
      const line = document.createElement('p');
      line.textContent = `${meta.title} for ${params.get('mission') ?? context.missionId}`;
      host.append(line);
      return { dispose() {} };
    },
  };
}

/** A promise the test settles when it chooses. */
export interface Later<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

export function later<T>(): Later<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
