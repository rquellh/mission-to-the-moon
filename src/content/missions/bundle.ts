import type { FlightPlan } from '../../sim/types.ts';
import type { Mission } from '../types.ts';
import type { LeftBehind, VehicleChange } from '../vehicle-types.ts';

export interface MissionBundle {
  mission: Mission;
  flight: FlightPlan;
  /** Cited moments at which each ship changes shape. */
  vehicle: readonly VehicleChange[];
  /** Cited parts that stay where they came to rest. */
  leftBehind: readonly LeftBehind[];
}
