/**
 * Where a craft lets go of a part at one of the flight's events: a spent
 * stage, the empty ascent stage, the service module. It comes from the
 * vehicle file, which says what each ship is made of from each moment on.
 * The scene draws the part falling away over the moments just after (see
 * the drops in src/scene/vehicles.ts), so an every-event tour that stops
 * there rests a little after the event, as it does at a parting (see
 * DROP_REST_STORY_SECONDS in tour.ts).
 */
import type { MissionBundle } from '../content/missions/bundle.ts';
import { elapsedToSeconds, type ElapsedTime } from '../content/types.ts';
import { FALLING_PARTS } from '../content/vehicle-types.ts';

/**
 * Two moments this close, in seconds, are one, as the scene matches a part
 * another ship takes on, or one left behind, to the change that lets it go.
 */
const SAME_MOMENT_SECONDS = 1;

/** An event and a change of shape this close, in seconds, are at one time. */
const SAME_TIME_SECONDS = 1e-6;

/**
 * The mission seconds of each event at which a ship lets go of a part that
 * falls away (see FALLING_PARTS): one it was made of before its change of
 * shape there and not after, which no other ship takes on at that moment
 * (Eagle undocking takes its own parts with it) and which is not left
 * behind on a surface (Eagle's descent stage, at its liftoff from the Moon).
 */
export function dropsAtEvents(
  bundle: Pick<MissionBundle, 'vehicle' | 'leftBehind'>,
  eventTimes: readonly number[],
): number[] {
  const { vehicle, leftBehind } = bundle;
  const timeOf = (at: { readonly value: ElapsedTime }): number => elapsedToSeconds(at.value);
  const drops: number[] = [];
  vehicle.forEach((change, k) => {
    const time = timeOf(change.at);
    if (!eventTimes.some((event) => Math.abs(event - time) < SAME_TIME_SECONDS)) return;
    const before = vehicle
      .slice(0, k)
      .reverse()
      .find((earlier) => earlier.ship === change.ship);
    if (!before) return;
    const letGo = before.parts.filter(
      (part) =>
        FALLING_PARTS.has(part) &&
        !change.parts.includes(part) &&
        !vehicle.some(
          (other) =>
            other.ship !== change.ship &&
            other.parts.includes(part) &&
            Math.abs(timeOf(other.at) - time) <= SAME_MOMENT_SECONDS,
        ) &&
        !leftBehind.some(
          (item) =>
            item.ship === change.ship &&
            item.part === part &&
            Math.abs(timeOf(item.at) - time) <= SAME_MOMENT_SECONDS,
        ),
    );
    if (letGo.length > 0 && !drops.includes(time)) drops.push(time);
  });
  return drops.sort((a, b) => a - b);
}
