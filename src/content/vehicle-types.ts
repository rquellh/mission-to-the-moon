/**
 * The shape of every mission's vehicle file: cited moments at which a ship
 * of the flight path changes shape (which parts it is made of and how they
 * are put together), parts left behind where they came to rest, and how a
 * vehicle turns. The 3D scene draws simplified models from these.
 *
 * Every time is `Cited`, so the type checker rejects an uncited change. A
 * mission's file (for example missions/apollo-11-vehicle.ts) says which
 * sources it follows.
 */
import type { Cited, ElapsedTime } from "./types";

/** A part the scene can draw. */
export type VehiclePart =
  /* Saturn V and Apollo. */
  /** The Saturn V's first stage, S-IC. */
  | "first-stage"
  /** The ring between the first and second stages, which stayed on the second stage for a while. */
  | "aft-interstage"
  /** The second stage, S-II, with the tapered interstage above it. */
  | "second-stage"
  /** The third stage, S-IVB, with the instrument unit on top. */
  | "third-stage"
  /** The spacecraft-LM adapter: the tapered shroud the lunar module rode in. */
  | "adapter"
  /** The launch escape tower on the command module's nose. */
  | "escape-tower"
  | "service-module"
  | "command-module"
  | "lm-descent-stage"
  | "lm-ascent-stage"
  /** The command module's two drogue parachutes. */
  | "drogue-parachutes"
  /** The command module's three main parachutes. */
  | "main-parachutes"
  /* Gemini and its Titan II launch vehicle. */
  /** The Titan II's first stage. */
  | "titan-first-stage"
  /** The Titan II's second stage. */
  | "titan-second-stage"
  /** The aft section of the Gemini adapter, behind the retrograde section. */
  | "gemini-equipment-section"
  /** The forward section of the Gemini adapter, holding the retrorockets. */
  | "gemini-retro-section"
  /** The Gemini reentry module: the crew cabin with its heat shield and nose. */
  | "gemini-reentry-module"
  /** The Gemini drogue parachute. */
  | "gemini-drogue-parachute"
  /** The Gemini main parachute. */
  | "gemini-main-parachute"
  /* Agena and its Atlas launch vehicle. */
  /** The Atlas booster that launched the Agena. */
  | "atlas"
  /** The Agena target vehicle, with its docking cone. */
  | "agena"
  /** The nose shroud over the Agena's docking end during launch. */
  | "agena-shroud";

/** How the parts are put together. */
export type VehicleLayout =
  /** Stacked as they flew on their launch vehicle (for Apollo, the lunar module inside the adapter). */
  | "launch"
  /** Apollo: the command and service module apart from the third stage, turning around to face the lunar module on top of it. */
  | "transposition"
  /** Apollo: the command module docked nose to nose with the lunar module, which still sits on the third stage. */
  | "docked-on-stage"
  /**
   * Docked: Apollo's command and service module with the lunar module (or
   * its ascent stage) on its nose, or Gemini with its nose in the Agena's
   * docking cone.
   */
  | "docked"
  /** One spacecraft by itself. */
  | "alone";

/**
 * A turn of the whole vehicle, from its change until the ship's next
 * change: steady at `rate`, or changing smoothly from `rate` to `rateTo`
 * by the next change.
 */
export interface VehicleMotion {
  /** "roll": about the vehicle's long axis; "tumble": end over end, about an axis across it. */
  kind: "roll" | "tumble";
  /** How fast, in degrees per second, at the change. */
  rate: Cited<number>;
  /** How fast at the ship's next change, when the rate changes on the way. */
  rateTo?: Cited<number>;
}

export interface VehicleChange {
  /** The flight path ship this applies to (an id from the mission's flight plan). */
  ship: string;
  /** When the ship takes this shape. */
  at: Cited<ElapsedTime>;
  /** The moment, in plain words. */
  label: string;
  layout: VehicleLayout;
  /** The parts from this moment on. Empty while the ship is drawn as part of another one. */
  parts: readonly VehiclePart[];
  /** How the vehicle turns from this moment until its next change, if it does. */
  motion?: readonly VehicleMotion[];
  /**
   * Which way the crew spacecraft's nose points along its travel:
   * "forward" (small end forward) or "backward" (blunt end forward). When
   * omitted, the shape's usual way: nose forward, except a capsule on its
   * own, which falls heat shield first.
   */
  facing?: "forward" | "backward";
}

/** A part left where it came to rest, from a cited moment to the end of the mission. */
export interface LeftBehind {
  part: VehiclePart;
  /** The ship it came off; it stays at the site of that ship's time on the surface. */
  ship: string;
  /** When it is left behind. */
  at: Cited<ElapsedTime>;
  /** In plain words. */
  label: string;
}
