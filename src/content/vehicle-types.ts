/**
 * The shape of every mission's vehicle file: cited moments at which a ship
 * of the flight path changes shape (which parts it is made of and how they
 * are put together), parts left behind where they came to rest, and how a
 * vehicle turns. The 3D scene draws simplified models from these.
 *
 * Every time is `Cited`, so the type checker rejects an uncited change. A
 * mission's file (for example missions/apollo-11/vehicle.ts) says which
 * sources it follows.
 */
import type { Cited, ElapsedTime } from "./types";

/**
 * A part the scene can draw. Which layouts each part works in, and the part
 * lists to use for each kind of ship, are listed in src/scene/vehicles.ts
 * (see `kindOf`); a part a shape cannot show is reported in the browser's
 * console while developing.
 */
export type VehiclePart =
  /* Saturn V, Saturn IB, and Apollo. */
  /** The Saturn V's first stage, S-IC. */
  | "first-stage"
  /** The ring between the first and second stages, which stayed on the second stage for a while. */
  | "aft-interstage"
  /** The second stage, S-II, with the tapered interstage above it. */
  | "second-stage"
  /**
   * The S-IVB stage, with the instrument unit on top: the Saturn V's third
   * stage, and the Saturn IB's second stage (the same id serves both). In
   * an "alone" layout with "adapter", the spent stage drifting in orbit with
   * its adapter panels open.
   */
  | "third-stage"
  /**
   * The Saturn IB's first stage, S-IB: eight tanks clustered around a
   * ninth, with eight fins. In a "launch" layout it makes the stack a Saturn
   * IB, with "third-stage" above it as the second stage.
   */
  | "saturn-ib-first-stage"
  /**
   * The spacecraft-LM adapter: the tapered shroud the lunar module rode in
   * (empty on flights without one). With "third-stage" in an "alone" layout,
   * its four panels are drawn opened like petals, as on Apollo 7.
   */
  | "adapter"
  /** The launch escape tower on the command module's nose. */
  | "escape-tower"
  | "service-module"
  /**
   * Apollo 13's service module with one side panel blown away, as the crew
   * saw it when they cast it off before entry. Use it in place of
   * "service-module" in a part list.
   */
  | "service-module-damaged"
  | "command-module"
  | "lm-descent-stage"
  | "lm-ascent-stage"
  /** The command module's two drogue parachutes. */
  | "drogue-parachutes"
  /** The command module's three main parachutes. */
  | "main-parachutes"
  /**
   * The Lunar Roving Vehicle. Use it as a `LeftBehind` item: it stays on the
   * Moon, parked a little apart from the descent stage.
   */
  | "lunar-rover"
  /* Crew outside. */
  /**
   * An astronaut in a suit on a tether, floating just outside the
   * spacecraft: beside the open right-hand hatch of a Gemini spacecraft
   * ("alone" or "docked" layouts), or by the service module of an Apollo
   * command and service module ("alone", for the film-retrieval spacewalks).
   * It fades in and out at its changes and does not change the model's
   * size on screen. How far out it floats is an illustration. The hatch
   * stands open while it is listed. In the ship view the craft is drawn
   * close up while a spacewalker is listed.
   */
  | "spacewalker"
  /**
   * A "standup" spacewalk: an astronaut standing in the open hatch, head
   * and shoulders outside, not floating free and with no tether: the
   * Gemini pilot in the right-hand hatch ("alone" or "docked" layouts), or
   * an Apollo crewmate in the command module's side hatch ("alone" or
   * "docked"). The hatch is drawn open. Like "spacewalker", it fades in and
   * out, does not change the model's size, and the ship view draws the craft
   * close up while it is listed.
   */
  | "standup-spacewalker"
  /**
   * The hand-held gas gun (the Gemini IV mission report's "maneuvering
   * unit"), held up in the right hand of a Gemini spacewalker, as NASA photo
   * S65-34635 shows it on Gemini IV. List it with "spacewalker" on a Gemini
   * spacecraft ("alone" or "docked"); it is drawn only while the
   * spacewalker is, and fades with it. It does not change the model's size.
   */
  | "gas-gun"
  /**
   * The crew hatch standing open with no one outside: the Gemini
   * spacecraft's right-hand hatch, or the Apollo command module's side
   * hatch. List it with the spacecraft's parts from the cited moment the
   * hatch opened (before a spacewalker goes out, or after one comes back in
   * and before it closes); "spacewalker" opens the hatch by itself. It does
   * not change the model's size.
   */
  | "open-hatch"
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
  /* Gemini's target vehicles and their Atlas launch vehicle. */
  /** The Atlas booster that launched the Agena or the ATDA. */
  | "atlas"
  /** The Agena target vehicle, with its docking cone. */
  | "agena"
  /** The nose shroud over the Agena's docking end during launch. */
  | "agena-shroud"
  /**
   * Gemini 9A's target, the Augmented Target Docking Adapter: a short
   * cylinder with a docking cone on its front.
   */
  | "atda"
  /**
   * The ATDA's nose shroud: closed over the docking cone on the Atlas
   * ("launch" layout); in orbit ("alone" layout) its two halves stay half
   * open, the "angry alligator" of Gemini 9A.
   */
  | "atda-shroud";

/** How the parts are put together. */
export type VehicleLayout =
  /** Stacked as they flew on their launch vehicle (for Apollo, the lunar module inside the adapter). */
  | "launch"
  /** Apollo: the command and service module apart from the third stage, turning around to face the lunar module on top of it. */
  | "transposition"
  /** Apollo: the command module docked nose to nose with the lunar module, which still sits on the third stage. */
  | "docked-on-stage"
  /**
   * Docked: Apollo's command module (with or without its service module)
   * with the lunar module (or its ascent stage) on its nose, or Gemini with
   * its nose in the docking cone of the target listed with it ("agena").
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
   * Which way the craft's nose points along its travel: "forward" (small
   * end, or a target's docking end, forward) or "backward" (blunt end
   * forward). It applies to a spacecraft or target in orbit (Gemini, alone
   * or docked; Apollo's command and service module, alone or docked; an
   * Agena, the ATDA, a spent stage); launch stacks, the lunar module, and a
   * capsule on its own keep their usual way. When omitted: nose forward,
   * except a capsule on its own, which falls heat shield first. While two
   * ships keep station, the scene turns the one drawn beside the other to
   * face it.
   */
  facing?: "forward" | "backward";
}

/**
 * A part left where it came to rest, from a cited moment to the end of the
 * mission: "lm-descent-stage" or "lunar-rover". Several can stand at one
 * landing site; the scene parks them a little apart.
 */
export interface LeftBehind {
  part: VehiclePart;
  /** The ship it came off; it stays at the site of that ship's time on the surface. */
  ship: string;
  /** When it is left behind. */
  at: Cited<ElapsedTime>;
  /**
   * In plain words. The scene shows it under the part once the lander has
   * lifted off, so write it for then ("The rover stays on the Moon") and
   * keep it short: every part at a site gets its own line or two.
   */
  label: string;
}
