/**
 * The scene report: what the 3D scene is drawing right now, in words and
 * boxes a test can check. A canvas cannot be looked into the way a page can,
 * so the browser tests (tests/) read this instead of comparing pictures.
 *
 * `window.__missionScene()` returns one (src/main.ts sets it once the scene
 * exists). Asking for a report changes nothing in the picture.
 */
import type { ScaleMode } from '../app/contract';
import type { EventView } from '../content/types';

/** A rectangle on the canvas, in CSS pixels from its top left corner. */
export interface SceneBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One named part of a craft (see VehiclePart), as its current shape has it. */
export interface ScenePart {
  name: string;
  /** Around the part's drawn meshes, or null when it is not drawn (hidden, faded out, or behind the camera). */
  box: SceneBox | null;
}

export interface SceneShip {
  /** The ship's id in the flight plan ("csm", "lm", "gemini", "agena", ...). */
  id: string;
  /**
   * True while the craft is in fast forward: it goes around its body too
   * fast to draw at its true place, so a ring in its color shows its orbit.
   * (A craft not drawn for another reason, such as being behind the Moon, is
   * not.) The report's own `fastForward` is about the craft the story follows.
   */
  fastForward: boolean;
  /**
   * True while the craft's model is a stand-in: drawn on its fast-forward
   * ring, gliding round it at a calm pace of its own, not at the craft's true
   * place, from the moment fast forward begins until the model is handed back
   * to its true place as it ends. Always false with reduced motion, where the
   * ring is drawn alone.
   */
  standIn: boolean;
  /** Around everything of the craft that is drawn (as a stand-in, where the stand-in is), or null when the craft is not drawn. Its soft glow is not counted. */
  box: SceneBox | null;
  /** The parts its shape has at this moment of the mission, whether or not they are on screen. */
  parts: ScenePart[];
}

export interface SceneLeftBehind {
  /** "lm-descent-stage" or "lunar-rover". */
  part: string;
  /** The ship it came off. */
  ship: string;
  /** Null until it is left behind, and whenever it is not drawn. */
  box: SceneBox | null;
}

export interface SceneLabel {
  text: string;
  /** 0 when the label is not shown; up to 1. */
  opacity: number;
  /** Null when the label is not shown. */
  box: SceneBox | null;
}

export interface SceneReport {
  view: EventView;
  scaleMode: ScaleMode;
  /** The mission time being drawn, in seconds since liftoff. */
  time: number;
  /** True while the scene shows its calm fast-forward view: the craft the story follows is in fast forward. */
  fastForward: boolean;
  /** The canvas's size in CSS pixels. */
  canvas: { width: number; height: number };
  /** The part of the canvas the interface leaves uncovered. */
  clear: SceneBox;
  /** The id of the ship the ship view follows at this moment. */
  followed: string;
  /** Every ship of the flight, in the flight plan's order. */
  ships: SceneShip[];
  /** The parts left on the Moon, in the mission's order. */
  leftBehind: SceneLeftBehind[];
  /** Their labels, in the same order. */
  labels: SceneLabel[];
}

declare global {
  interface Window {
    /** What the 3D scene is drawing now. Missing when there is no 3D view. */
    __missionScene?: () => SceneReport;
  }
}
