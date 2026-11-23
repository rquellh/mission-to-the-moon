import type { MissionBundle } from '../content/missions/bundle.ts';
/**
 * Extras: hands-on moments and things to look through, beside the missions.
 *
 * HOW AN EXTRA IS FOUND
 * Each extra is one folder, src/extras/<id>/, and nothing else needs an
 * edit: the registry (src/extras/index.ts) finds it by its file names.
 *
 *   src/extras/<id>/meta.ts    export const meta: ExtraMeta
 *                              Loads with the page, for the list. Keep it
 *                              tiny: import only the type, nothing else.
 *   src/extras/<id>/index.ts   export const extra: Extra
 *                              Loads only when the extra is opened, as its
 *                              own file in the build, with everything it imports.
 *   src/extras/<id>/*.css      Your styles, imported by index.ts (see STYLES).
 *
 * `meta.id` must equal the folder name. Use explicit `.ts` extensions in
 * relative imports, so a Node test can import your pure logic files.
 *
 * WHERE IT SHOWS
 * - The mission list shows every listed extra under the missions, in two
 *   groups by `kind`, each sorted by `order`.
 * - An event can point at a hands-on extra with `handsOn: "<id>"` (see
 *   MissionEvent in src/content/types.ts). Its card then shows "Try it",
 *   which opens the extra with `mission=<mission id>&event=<event id>`.
 * - The address `?extra=<id>` opens it directly. Every other value in the
 *   address reaches `mount` as `params`, so `?extra=stages&mission=apollo-11&event=liftoff`
 *   opens it over Apollo 11, at liftoff, with those two values in `params`.
 *
 * DRAFTS
 * `status: "draft"` lists the extra only on the dev server, marked Draft. It
 * still opens by its address in any build, so you can test it anywhere.
 * Set "ready" when it is finished.
 *
 * WHAT MOUNT GETS
 * The interface opens a full-screen sheet with your `meta.title` and a Close
 * button, pauses the mission clock, stops drawing the main 3D view, and calls
 * `mount(host, context, params)`. `host` is an empty element inside the
 * sheet's scrolling body, with the class `extra-host` and
 * `data-extra="<id>"`. Fill it however you like. Return (or resolve to) an
 * `ExtraMount`; Close, Escape, or `context.close()` calls its `dispose()`,
 * then empties `host` and puts focus back where it was. Stop your timers,
 * animation frames, sounds, and WebGL contexts in `dispose()`; listeners
 * added with `{ signal: context.signal }` are removed for you.
 * If `mount` throws or rejects, the sheet shows a plain failure message.
 * Escape closes the sheet; to use Escape yourself (to cancel a drag, say),
 * call `preventDefault()` on that keydown.
 *
 * STYLES
 * Put your CSS in a file imported by index.ts. It loads with your extra and
 * stays loaded after it closes, so start every selector with your own root,
 * `[data-extra="<id>"]` (or a class only you use). Reuse these from
 * src/styles/main.css instead of writing your own:
 *
 *   Colors   --color-text, --color-text-muted, --color-text-faint,
 *            --color-bg, --color-surface, --color-surface-strong,
 *            --color-surface-solid, --color-raised, --color-hover,
 *            --color-line, --color-line-strong,
 *            --color-accent (amber: the one main action and the active
 *            state), --color-accent-ink (text on amber), --color-accent-soft,
 *            --color-accent-line, --color-csm (main ship path, amber),
 *            --color-lm (lunar module path, blue)
 *   Type     --font-sans; --font-mono for clock-like numbers (with
 *            font-variant-numeric: tabular-nums)
 *   Motion   --ease-out; keep transitions near 160 to 320 ms
 *   Space    --extra-gutter (the host's side padding), --gutter, and
 *            --safe-top, --safe-right, --safe-bottom, --safe-left
 *   Buttons  .button (44 px tall), .button--primary (amber, one per view),
 *            .button--quiet, .button--large, .icon-button; and a pressed
 *            state with .segmented + .segmented__item[aria-pressed]
 *            or .switch[aria-pressed]
 *   Text     .extra-heading (a section title), .extra-text (body text, 62ch),
 *            .extra-note (small, muted), .link, .visually-hidden
 *   Cards    .extra-panel (a raised box with a hairline border)
 *   Layout   .extra-actions (a row of buttons that wraps)
 *   Folding  .disclosure with aria-expanded (as "Tell me more" does)
 *   Icons    icon() from src/ui/icons.ts (play, pause, previous, next,
 *            chevron-down, external); draw any others as inline SVG on a
 *            24-unit grid with stroke-width 1.75, hidden with aria-hidden.
 *
 * Focus rings come from the global :focus-visible rule (a 2 px amber
 * outline); do not remove outlines. Every control needs a visible label or
 * an aria-label, and must work by keyboard with a target at least 44 px. The
 * global reduced-motion rule shortens CSS animations and transitions; for
 * motion you drive from script, check `context.reducedMotion()` and jump to
 * the end state instead. Lay out for a 390 px phone first. Write text for a
 * ten-year-old first, in US English. Facts need citations like any other
 * content (types in src/content/types.ts, sources in your mission's or the
 * shared registry).
 *
 * STORING
 * `context.store` keeps small values on this device, as JSON, under keys
 * private to your extra. Nothing in it is sent anywhere. It never throws: in
 * a private window it may forget, and `get` then returns undefined.
 * The site also keeps keys of its own, which every extra reads by the same
 * name but cannot change (`set` on them is ignored):
 *   "visited-missions"   string[]: the ids of the missions whose tour or
 *                        exploring has started on this device, oldest
 *                        first, no duplicates (showing the list alone does
 *                        not count). Undefined until the first one.
 *
 * 3D
 * Draw small 3D views with the scene's kit (src/scene/kit.ts), not three.js
 * directly, and dispose of them in `dispose()`.
 *
 * TESTING
 * Open http://localhost:5173/?extra=<id> (add mission=, event=, or your own
 * values to test `params`). Check it at 390x844 and 1280x720 with
 * `node tools/screenshot.mjs`, with --reduced-motion, and by keyboard alone.
 */
import type { EventView, MissionSummary } from '../content/types.ts';

export interface ExtraMeta {
  /** The folder name, for example "stages". */
  id: string;
  /** Short and plain, for example "Drop the stages". */
  title: string;
  /** One plain sentence for the list. */
  blurb: string;
  /** "hands-on": something to try. "explore": something to look through. */
  kind: 'hands-on' | 'explore';
  /** Position in its group in the list (lower first). */
  order: number;
  /** "draft" keeps an unfinished extra off the published list. */
  status: 'ready' | 'draft';
}

/** Where `openMission` should start the mission. */
export interface OpenMissionOptions {
  /** Mission time, as the address takes it: "102:45:40", or seconds. Opens paused there. */
  t?: string;
  /** An event id of that mission: opens paused at the event. */
  event?: string;
  /** The camera view to start in. */
  view?: EventView;
  /** Begin with the guided tour or exploring, skipping the mission list. */
  start?: 'tour' | 'explore';
}

/** What the interface gives an extra. */
export interface ExtraContext {
  /** Every listed mission (and the memorial), in date order. */
  summaries: readonly MissionSummary[];
  /** The id of the mission loaded behind the sheet. */
  missionId: string;
  /** Load any mission's story, flight plan, and vehicle file. Fast for the one already open. */
  loadBundle(id: string): Promise<MissionBundle>;
  /** Open a mission (a page navigation), optionally at a time or event and view. */
  openMission(id: string, options?: OpenMissionOptions): void;
  /** Close the sheet, as its Close button does. */
  close(): void;
  /** True when the visitor prefers reduced motion. */
  reducedMotion(): boolean;
  /** Hear when that preference changes. Returns a function that stops listening (done for you at dispose). */
  onReducedMotionChange(listener: (reduced: boolean) => void): () => void;
  /** Speaks a short message to screen readers (politely, after things settle). */
  announce(message: string): void;
  /** Remembers small things on this device (localStorage, safely wrapped; values are JSON). */
  store: { get<T>(key: string): T | undefined; set(key: string, value: unknown): void };
  /** The address of a file under public/, for example asset("media/apollo-11/liftoff.jpg"). */
  asset(path: string): string;
  /** Aborted when the extra is disposed: pass it to addEventListener and fetch. */
  signal: AbortSignal;
}

export interface ExtraMount {
  dispose(): void;
}

export interface Extra {
  meta: ExtraMeta;
  /**
   * Draws itself into `host`, the body of a full-screen sheet. `params`
   * carries the address's other values (for example mission and event).
   */
  mount(
    host: HTMLElement,
    context: ExtraContext,
    params: URLSearchParams,
  ): ExtraMount | Promise<ExtraMount>;
}
