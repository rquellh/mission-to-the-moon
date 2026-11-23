/**
 * Reading the scene report: what the 3D scene draws, in words and boxes.
 *
 * A canvas cannot be queried like a page, so the scene describes itself
 * (`window.__missionScene()`, see src/scene/report.ts). ScenePage.report()
 * fetches one; these helpers find things in it and compare boxes. Boxes are
 * CSS pixels from the canvas's top left, so a smaller `y` is higher up.
 *
 * Never compare pictures or read pixels. If a test needs something the
 * report cannot say, add it to the report.
 */
import type {
  SceneBox,
  SceneLeftBehind,
  ScenePart,
  SceneReport,
  SceneShip,
} from '../../src/scene/report';

export type { SceneBox, SceneReport } from '../../src/scene/report';

/** A ship of the flight by its id ("csm", "lm", "gemini", ...). */
export function shipOf(report: SceneReport, id: string): SceneShip {
  const ship = report.ships.find((candidate) => candidate.id === id);
  if (!ship)
    throw new Error(
      `The scene has no ship "${id}"; it has ${report.ships.map((s) => s.id).join(', ')}.`,
    );
  return ship;
}

/** The ship the Ship view follows now. */
export function followedShip(report: SceneReport): SceneShip {
  return shipOf(report, report.followed);
}

/** A named part of a ship ("spacewalker", "gemini-reentry-module", ...), as its shape has it now. */
export function partOf(report: SceneReport, shipId: string, name: string): ScenePart {
  const ship = shipOf(report, shipId);
  const part = ship.parts.find((candidate) => candidate.name === name);
  if (!part)
    throw new Error(
      `Ship "${shipId}" has no part "${name}" now; it has ${ship.parts.map((p) => p.name).join(', ')}.`,
    );
  return part;
}

/** A part left on the Moon ("lm-descent-stage" or "lunar-rover"). */
export function leftBehindOf(report: SceneReport, name: string): SceneLeftBehind {
  const part = report.leftBehind.find((candidate) => candidate.part === name);
  if (!part) throw new Error(`Nothing called "${name}" is left behind in this mission.`);
  return part;
}

/** True when `box` lies wholly inside `frame`. */
export function isInside(box: SceneBox, frame: SceneBox): boolean {
  return (
    box.x >= frame.x &&
    box.y >= frame.y &&
    box.x + box.width <= frame.x + frame.width &&
    box.y + box.height <= frame.y + frame.height
  );
}

/**
 * Boxes that meet edge to edge share a line, not an area, but rounding can
 * put one a hair inside the other. Overlaps smaller than this, in CSS pixels, do not count.
 */
const TOUCHING_PX = 1;

/** True when two boxes share an area. Boxes that only touch do not overlap. */
export function overlaps(a: SceneBox, b: SceneBox): boolean {
  const across = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const down = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return across > TOUCHING_PX && down > TOUCHING_PX;
}

/** The names of the boxes in `others` that `box` overlaps: empty when it covers none of them. */
export function overlapping(box: SceneBox, others: Readonly<Record<string, SceneBox>>): string[] {
  return Object.entries(others)
    .filter(([, other]) => overlaps(box, other))
    .map(([name]) => name);
}

/** A box that must be drawn: fails with `what` when it is not. */
export function drawn(box: SceneBox | null, what: string): SceneBox {
  if (!box) throw new Error(`${what} is not drawn.`);
  return box;
}
