import type { MissionBundle } from '../../content/missions/bundle.ts';
/**
 * The rocket "Fly to orbit" flies, read from a flight's own files, kept
 * apart from the screen so Node can check it for every flight. No drawing,
 * no page, no 3D.
 *
 * The climb comes from climbFor (src/extras/stages/climb.ts). How many
 * stages the rocket has comes from what stood on the pad, not from when
 * things dropped: a flight's climb can end well after its last stage let go
 * (Gemini 12's files put orbit insertion, after the spacecraft's own
 * insertion firing, 73 seconds after its second stage separated), so timing
 * alone would count a stage too many.
 */
import type { Mission, MissionEvent } from '../../content/types.ts';
import type { VehiclePart } from '../../content/vehicle-types.ts';
import { climbFor, type Climb, type Drop } from '../stages/climb.ts';

/** The parts that are a rocket's stages: the Saturn V has three, the Saturn IB two ("third-stage" is its second), the Titan II two. */
const STAGE_PARTS: ReadonlySet<VehiclePart> = new Set<VehiclePart>([
  'first-stage',
  'second-stage',
  'third-stage',
  'saturn-ib-first-stage',
  'titan-first-stage',
  'titan-second-stage',
]);

/** True when a drop lets go of a stage (not only the ring between two stages, or the escape tower). */
const dropsAStage = (drop: Drop): boolean => drop.parts.some((part) => STAGE_PARTS.has(part));

/** A stage the player drops: the real drop, and every part that goes with it. */
export interface StageDrop {
  drop: Drop;
  parts: VehiclePart[];
}

/** A flight's rocket, as the game flies it. */
export interface Rocket {
  /** The flight's story: the rocket's name, and the day of the real event. */
  mission: Mission;
  climb: Climb;
  stages: 2 | 3;
  /** The stages the player drops, in order; the last stage is not among them. */
  drops: readonly StageDrop[];
}

/**
 * The rocket a flight's files describe, or null when they show no climb the
 * game can fly. Its stages are the stage parts on the pad (two or three).
 * The player drops all but the last: the first that many drops of a stage
 * in the climb, in order. A drop of only the ring or the escape tower goes
 * with the stage dropped before it (or, before any, with the first).
 */
export function rocketFrom(bundle: MissionBundle): Rocket | null {
  const climb = climbFor(bundle);
  if (!climb) return null;
  const stages = climb.liftoffParts.filter((part) => STAGE_PARTS.has(part)).length;
  if (stages !== 2 && stages !== 3) return null;
  const drops: StageDrop[] = [];
  let early: VehiclePart[] = [];
  for (const real of climb.drops) {
    const last = drops[drops.length - 1];
    if (!dropsAStage(real)) {
      if (last) last.parts.push(...real.parts);
      else early.push(...real.parts);
      continue;
    }
    // The last stage stays on to orbit: nothing after it is the player's.
    if (drops.length === stages - 1) break;
    drops.push({ drop: real, parts: [...early, ...real.parts] });
    early = [];
  }
  return drops.length === stages - 1 ? { mission: bundle.mission, climb, stages, drops } : null;
}

/** The flight's own event the end of a climb tells, and whether it is the one at orbit insertion. */
export interface RealEnd {
  event: MissionEvent;
  atOrbit: boolean;
}

/**
 * What the end of a climb tells of the real flight: the story's event at
 * orbit insertion, or, when the story has none, its liftoff. Null when it
 * has neither.
 */
export function realEnd({ climb }: Rocket): RealEnd | null {
  if (climb.orbit) return { event: climb.orbit, atOrbit: true };
  return climb.liftoffEvent ? { event: climb.liftoffEvent, atOrbit: false } : null;
}
