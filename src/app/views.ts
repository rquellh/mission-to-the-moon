/**
 * Which camera views a mission offers. The interface shows a button for
 * each, and the scene only ever moves to one of them. Both sides read the
 * answer here, so they cannot disagree.
 */
import type { EventView, Mission } from '../content/types';

const MOON_FLIGHT: readonly EventView[] = ['earth', 'moon', 'spacecraft', 'journey'];
const EARTH_ORBIT_FLIGHT: readonly EventView[] = ['earth', 'spacecraft'];

/** The views that make sense for this mission, in button order. */
export function viewsFor(mission: Mission): readonly EventView[] {
  return mission.destination === 'moon' ? MOON_FLIGHT : EARTH_ORBIT_FLIGHT;
}

/**
 * The view that shows the whole flight in one picture: Earth and the Moon
 * together for a Moon flight, all of Earth for a flight that stayed in orbit.
 */
export function homeView(mission: Mission): EventView {
  return mission.destination === 'moon' ? 'journey' : 'earth';
}

/** The view to use when one is asked for that this mission does not offer. */
export function nearestView(mission: Mission, view: EventView): EventView {
  return viewsFor(mission).includes(view) ? view : homeView(mission);
}
