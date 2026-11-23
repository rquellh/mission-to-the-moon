import type { MissionBundle } from '../bundle.ts';
import { flight } from './flight.ts';
import { story } from './story.ts';
import { leftBehind, vehicle } from './vehicle.ts';

/** Everything the site needs to fly this mission. */
export const bundle: MissionBundle = { mission: story, flight, vehicle, leftBehind };
