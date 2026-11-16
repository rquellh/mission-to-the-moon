/**
 * Every mission on the site, in flight order. Add each new mission here.
 *
 * A mission is made of three files: its story (events, crew, sources), its
 * flight plan (the published points the path is computed from), and its
 * spacecraft shapes. A bundle holds the three together.
 */
import type { FlightPlan } from "../../sim/types";
import type { Mission } from "../types";
import { apollo11 } from "./apollo-11";
import { apollo11Flight } from "./apollo-11-flight";
import { apollo11LeftBehind, apollo11Vehicle } from "./apollo-11-vehicle";
import { gemini8 } from "./gemini-8";
import { gemini8Flight } from "./gemini-8-flight";
import { gemini8LeftBehind, gemini8Vehicle } from "./gemini-8-vehicle";
import type { LeftBehind, VehicleChange } from "../vehicle-types";

export interface MissionBundle {
  mission: Mission;
  flight: FlightPlan;
  /** Cited moments at which each ship changes shape. */
  vehicle: readonly VehicleChange[];
  /** Cited parts that stay where they came to rest. */
  leftBehind: readonly LeftBehind[];
}

/** In flight order. */
export const bundles: readonly MissionBundle[] = [
  { mission: gemini8, flight: gemini8Flight, vehicle: gemini8Vehicle, leftBehind: gemini8LeftBehind },
  { mission: apollo11, flight: apollo11Flight, vehicle: apollo11Vehicle, leftBehind: apollo11LeftBehind },
];

/** Every mission's story, in flight order. */
export const missions: readonly Mission[] = bundles.map((bundle) => bundle.mission);

/** The mission shown when the address does not name one. */
export const DEFAULT_MISSION_ID = "apollo-11";

/** The bundle for a mission id, or the default mission's when the id is unknown. */
export function bundleFor(id: string | null | undefined): MissionBundle {
  const found = bundles.find((bundle) => bundle.mission.id === id);
  const fallback = bundles.find((bundle) => bundle.mission.id === DEFAULT_MISSION_ID) ?? bundles[0];
  if (!found && !fallback) throw new Error("No missions are registered");
  return (found ?? fallback)!;
}

export { apollo11 };
