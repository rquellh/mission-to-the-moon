import { copy } from '../content/copy';
import type { MissionBundle } from '../content/missions/bundle';
import type { MissionSummary } from '../content/types';
import type {
  Extra,
  ExtraContext,
  ExtraMeta,
  ExtraMount,
  ExtraOrigin,
  OpenMissionOptions,
} from '../extras/types';
import { extraStore } from './device-store';
import { setUpDialog } from './dialogs';
import { button, byId, el, find, reducedMotionQuery } from './dom';
import { mediaUrl } from './photo';
import { buildUpNext } from './up-next';

export interface ExtraSheetOptions {
  /** Load an extra's code. */
  load(id: string): Promise<Extra>;
  /** An extra's title, to show while it loads. */
  titleOf(id: string): string | undefined;
  summaries: readonly MissionSummary[];
  /** The extras list: "Up next" picks from it. */
  extras: readonly ExtraMeta[];
  /** The mission loaded behind the sheet. */
  missionId: string;
  loadBundle(id: string): Promise<MissionBundle>;
  announce(message: string): void;
  /** Called as the sheet opens: pause the clock, stop the 3D view, stop any recording. */
  onOpen(): void;
  /** Called once it has closed and the extra is gone: put things back. */
  onClose(): void;
  /**
   * "All missions" in "Up next": the sheet has closed; show the mission list
   * (unless it is already open under the sheet), giving focus back to
   * `returnTo` when it closes.
   */
  onAllMissions(returnTo: HTMLElement | null): void;
}

export interface ExtraSheet {
  /**
   * Open an extra. `origin` is how it was opened: over a flight waiting
   * behind the sheet, or from the list. Focus goes back to `returnTo` (or
   * what had focus) when it closes.
   */
  open(
    id: string,
    params: URLSearchParams,
    origin: ExtraOrigin,
    returnTo?: HTMLElement | null,
  ): void;
}

/** The address of a mission, starting where `options` asks. */
function missionAddress(id: string, options: OpenMissionOptions = {}): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('mission', id);
  if (options.t !== undefined) url.searchParams.set('t', options.t);
  if (options.event !== undefined) url.searchParams.set('event', options.event);
  if (options.view !== undefined) url.searchParams.set('view', options.view);
  if (options.start !== undefined) url.searchParams.set('start', options.start);
  return url.href;
}

/** The address that opens this extra again over this mission, for reloading after a failed load. */
function extraAddress(id: string, missionId: string, params: URLSearchParams): string {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = params.toString();
  if (!url.searchParams.has('mission')) url.searchParams.set('mission', missionId);
  url.searchParams.set('extra', id);
  return url.href;
}

/**
 * The extras sheet: a full-screen dialog with the extra's title and a Close
 * button, whose body the extra fills. One extra is open at a time; one can
 * open another in its place. Closing (Close, Escape, or the extra asking)
 * disposes of it and puts focus back.
 */
export function setUpExtraSheet(options: ExtraSheetOptions): ExtraSheet {
  const dialog = byId('extra-dialog', HTMLDialogElement);
  const title = byId('extra-title', HTMLHeadingElement);
  const body = byId('extra-body', HTMLDivElement);
  const handle = setUpDialog(dialog);
  const motion = reducedMotionQuery();

  let open: { ticket: number; mount: ExtraMount | null; controller: AbortController } | null = null;
  let tickets = 0;
  let titleBefore = document.title;

  // On a phone, "Up next" is pinned at the bottom of the screen. The page keeps
  // room for it at its end (--up-next-room), so its last lines can always be read.
  const pinned = new Set<HTMLElement>();
  let roomFrame: number | null = null;
  const measureRoom = (): void => {
    roomFrame = null;
    let height = 0;
    for (const block of pinned) {
      if (!block.isConnected) {
        pinned.delete(block);
        room.unobserve(block);
        continue;
      }
      height = Math.max(height, block.getBoundingClientRect().height);
    }
    body.style.setProperty('--up-next-room', `${Math.ceil(height)}px`);
  };
  // On the next frame: the room moves the extra's own layout, which may be watched for its size too.
  const room = new ResizeObserver(() => {
    roomFrame ??= requestAnimationFrame(measureRoom);
  });

  /** Take down the open extra and put the page back. Safe to call more than once. */
  const finish = (): void => {
    if (!open) return;
    const was = open;
    open = null;
    was.controller.abort();
    try {
      was.mount?.dispose();
    } catch (error) {
      console.error(error);
    }
    body.replaceChildren();
    body.removeAttribute('aria-busy');
    for (const block of pinned) room.unobserve(block);
    pinned.clear();
    if (roomFrame !== null) cancelAnimationFrame(roomFrame);
    roomFrame = null;
    body.style.removeProperty('--up-next-room');
    delete dialog.dataset['extra'];
    document.title = titleBefore;
    options.onClose();
  };
  // The browser fires "close" with its next frame, so Close also tears down straight away.
  dialog.addEventListener('close', finish);
  find(dialog, '.dialog__close', HTMLButtonElement).addEventListener('click', finish);

  const note = (text: string): HTMLParagraphElement => {
    const line = el('p', 'extra-sheet__status', text);
    line.setAttribute('data-testid', 'extra-sheet-status');
    line.setAttribute('role', 'status');
    return line;
  };

  const sheet: ExtraSheet = {
    open(id, params, origin, returnTo) {
      // Focus goes back to where it was before the sheet opened, even after one extra has opened another in its place.
      const from =
        returnTo ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      finish();
      const ticket = (tickets += 1);
      const controller = new AbortController();
      open = { ticket, mount: null, controller };
      const isCurrent = (): boolean => open?.ticket === ticket;

      const name = options.titleOf(id);
      title.textContent = name ?? '';
      titleBefore = document.title;
      if (name) document.title = copy.pageTitle(name);
      dialog.dataset['extra'] = id;
      body.setAttribute('aria-busy', 'true');
      body.replaceChildren(note(name ? copy.loadingMission(name) : copy.extra.loadingUnnamed));
      options.onOpen();
      handle.open(from);

      const close = (): void => {
        if (!isCurrent()) return;
        handle.close();
        finish();
      };
      const openExtra = (other: string, otherParams?: URLSearchParams): void => {
        if (isCurrent()) sheet.open(other, otherParams ?? new URLSearchParams(), origin, from);
      };
      const context: ExtraContext = {
        summaries: options.summaries,
        missionId: options.missionId,
        origin,
        loadBundle: options.loadBundle,
        openMission: (mission, where) => window.location.assign(missionAddress(mission, where)),
        close,
        openExtra,
        upNext(next) {
          const block = buildUpNext(
            {
              extraId: id,
              origin,
              missionId: options.missionId,
              extras: options.extras,
              openExtra,
              onAllMissions: () => {
                close();
                options.onAllMissions(from);
              },
              signal: controller.signal,
            },
            next,
          );
          pinned.add(block);
          room.observe(block);
          return block;
        },
        reducedMotion: () => motion.matches,
        onReducedMotionChange(listener) {
          const changed = (): void => listener(motion.matches);
          motion.addEventListener('change', changed, { signal: controller.signal });
          return () => motion.removeEventListener('change', changed);
        },
        announce: options.announce,
        store: extraStore(id),
        asset: mediaUrl,
        signal: controller.signal,
      };

      const failed = (error: unknown): void => {
        console.error(error);
        if (!isCurrent()) return;
        const reload = button('button', copy.extra.reload);
        reload.setAttribute('data-testid', 'extra-sheet-reload');
        reload.addEventListener('click', () =>
          window.location.assign(extraAddress(id, options.missionId, params)),
        );
        const back = button('button button--primary', copy.extra.back);
        back.setAttribute('data-testid', 'extra-sheet-back');
        back.addEventListener('click', close);
        const actions = el('div', 'extra-actions');
        actions.append(back, reload);
        const box = el('div', 'extra-sheet__failed');
        box.setAttribute('data-testid', 'extra-sheet-failed');
        box.append(note(name ? copy.extra.failed(name) : copy.extra.failedUnnamed), actions);
        body.replaceChildren(box);
        body.removeAttribute('aria-busy');
        back.focus();
      };

      options
        .load(id)
        .then(async (extra) => {
          if (!isCurrent()) return;
          title.textContent = extra.meta.title;
          document.title = copy.pageTitle(extra.meta.title);
          const host = el('div', 'extra-host');
          host.setAttribute('data-testid', `extra-sheet-host-${id}`);
          host.dataset['extra'] = id;
          body.replaceChildren(host);
          const mount = await extra.mount(host, context, new URLSearchParams(params));
          // Closed while it was getting ready: take it down at once.
          if (!isCurrent() || !open) {
            mount.dispose();
            return;
          }
          open.mount = mount;
          body.removeAttribute('aria-busy');
        })
        .catch(failed);
    },
  };
  return sheet;
}
