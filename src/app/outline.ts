/**
 * What the interface needs to know about a flight beyond its story, read
 * from the flight plan and vehicle file. The interface uses it to say only
 * what is true of this flight (see "How this is drawn").
 */
import type { MissionBundle } from '../content/missions/bundle.ts';

export interface FlightOutline {
  /** How many ships the flight plan follows (the crew's spacecraft, a lander, a target). */
  ships: number;
  /** True when a ship rests on the Moon's surface at some point. */
  landsOnMoon: boolean;
  /** True when the flight plan ends a ship's trip with reentry and splashdown. */
  splashdown: boolean;
  /** True when the vehicle file gives a published speed at which a ship turns or spins. */
  turns: boolean;
}

export function outlineOf(bundle: MissionBundle): FlightOutline {
  const phases = bundle.flight.ships.flatMap((ship) => ship.phases);
  return {
    ships: bundle.flight.ships.length,
    landsOnMoon: phases.some((phase) => phase.kind === 'surface' && phase.body === 'moon'),
    splashdown: phases.some((phase) => phase.kind === 'entry'),
    turns: bundle.vehicle.some((change) => Boolean(change.motion?.length)),
  };
}

/**
 * Every source id a flight cites anywhere: in its story, flight plan, and
 * vehicle file. A mission may cite a source kept with another mission, and
 * the Sources dialog lists those with the mission's own.
 */
export function sourcesCitedBy(bundle: MissionBundle): Set<string> {
  const found = new Set<string>();
  const seen = new Set<object>();
  const visit = (value: unknown): void => {
    if (typeof value !== 'object' || value === null || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    const record = value as Record<string, unknown>;
    // A citation is the only shape with both a source and a locator.
    if (typeof record['source'] === 'string' && typeof record['locator'] === 'string') found.add(record['source']);
    for (const item of Object.values(record)) visit(item);
  };
  visit(bundle);
  return found;
}
