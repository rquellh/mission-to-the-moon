/**
 * What to suggest at the end of a flight: the next flight to fly, one
 * hands-on extra, and one extra to explore. The rules live here, in one
 * place with no page in it, so the interface only asks and shows.
 *
 * "Collected" means what it means in the patch book (src/extras/patches):
 * the flight's tour or exploring has started on this device (see
 * recordVisit in src/ui/device-store.ts). The book counts with
 * flightsCollected, so the end of a flight and the book always agree.
 */
import type { Mission, MissionEvent, MissionSummary } from '../content/types.ts';
import type { ExtraMeta } from '../extras/types.ts';

/** The explore extra suggested after a flight no explore extra is about: it fits every flight. */
export const EVERY_FLIGHT_EXTRA = 'rockets';

/** A hands-on extra to try, and the moment of the flight that names it. */
export interface HandsOnPick {
  extra: ExtraMeta;
  event: MissionEvent;
}

/** A date's place in time, with a date that does not read as one last. */
function timeOf(date: string): number {
  const ms = Date.parse(date);
  return Number.isNaN(ms) ? Infinity : ms;
}

/**
 * The flight to suggest next: among the listed flights (not the memorial),
 * the first one after this flight, by date, that is not collected yet; if
 * none after it is left, the earliest one not collected yet; and null when
 * every flight is collected.
 */
export function nextFlight(
  summaries: readonly MissionSummary[],
  current: { id: string; date: string },
  collected: ReadonlySet<string>,
): MissionSummary | null {
  const left = summaries
    .filter(
      (summary) =>
        summary.kind === 'flight' && summary.id !== current.id && !collected.has(summary.id),
    )
    .sort((a, b) => timeOf(a.date) - timeOf(b.date));
  const now = timeOf(current.date);
  return left.find((summary) => timeOf(summary.date) > now) ?? left[0] ?? null;
}

/**
 * The hands-on extra to suggest: a listed one that a moment of this flight
 * names (`handsOn`). When the flight names more than one, the first that is
 * not the liftoff's (so a flight with a docking suggests the docking).
 * Null when the flight names none that is listed.
 */
export function handsOnPick(mission: Mission, extras: readonly ExtraMeta[]): HandsOnPick | null {
  const named = mission.events.flatMap((event) => {
    const extra = extras.find((meta) => meta.kind === 'hands-on' && meta.id === event.handsOn);
    return extra ? [{ extra, event }] : [];
  });
  return named.find((pick) => pick.event.id !== 'liftoff') ?? named[0] ?? null;
}

/**
 * The explore extra to suggest: the first listed one about this flight (its
 * `missions` names it); otherwise "rockets" when it is listed; otherwise the
 * first explore extra listed. Null when none is listed.
 */
export function explorePick(missionId: string, extras: readonly ExtraMeta[]): ExtraMeta | null {
  const shelf = extras.filter((meta) => meta.kind === 'explore');
  return (
    shelf.find((meta) => meta.missions?.includes(missionId)) ??
    shelf.find((meta) => meta.id === EVERY_FLIGHT_EXTRA) ??
    shelf[0] ??
    null
  );
}

/** How many flights are collected, out of how many there are. */
export interface FlightCount {
  collected: number;
  total: number;
}

/** How many of the listed flights are collected, out of how many: the numbers the patch book shows. */
export function flightsCollected(
  summaries: readonly MissionSummary[],
  collected: ReadonlySet<string>,
): FlightCount {
  const flights = summaries.filter((summary) => summary.kind === 'flight');
  return {
    collected: flights.filter((summary) => collected.has(summary.id)).length,
    total: flights.length,
  };
}
