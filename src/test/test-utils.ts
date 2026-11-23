/**
 * The one way an interface test sets up the page: `mountMission`.
 *
 * It builds what src/main.ts builds, from the real parts: a fresh copy of the
 * real index.html, a real mission loaded with loadBundle, its flight path
 * and story time, the real MissionPlayer, and the real mountInterface. Only
 * the edges are stand-ins: the 3D scene (FakeDirector), the screen's frames
 * and clock (fakeFrames), and what jsdom lacks (src/test/browser.ts).
 *
 *   const { user, director, frames } = await mountMission('apollo-11', { start: 'explore' });
 *   await user.click(screen.getByRole('button', { name: 'Moon' }));
 *   expect(director.view).toBe('moon');
 *
 * Tests import mountMission, screen, within, and waitFor from here, and
 * never put the page together by hand.
 */
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import page from '../../index.html?raw';
import type { StoryMap } from '../app/contract.ts';
import { outlineOf, sourcesCitedBy } from '../app/outline.ts';
import { MissionPlayer } from '../app/player.ts';
import { homeView, nearestView } from '../app/views.ts';
import type { MissionBundle } from '../content/missions/bundle.ts';
import {
  isReady,
  loadBundle,
  loadMemorial,
  summaries,
  summaryFor,
} from '../content/missions/index.ts';
import {
  elapsedToSeconds,
  type AudioClip,
  type Memorial,
  type Mission,
  type MissionSummary,
} from '../content/types.ts';
import { extraFor, extras, isExtraReady } from '../extras/index.ts';
import type { Extra } from '../extras/types.ts';
import { buildFlightPath, createStoryTime } from '../sim/index.ts';
import { createAudioPlayer } from '../ui/audio-player.ts';
import { mountInterface, type InterfaceOptions, type MissionInterface } from '../ui/interface.ts';
import { setScreen } from './browser.ts';
import { FakeDirector, fakeFrames, standInExtra, type Frames } from './fakes.ts';

export { screen, waitFor, within } from '@testing-library/dom';
export { navigation, sound } from './browser.ts';
export { later, type Frames, type Later } from './fakes.ts';

export type User = ReturnType<typeof userEvent.setup>;

export interface MountOptions {
  /**
   * How the visit begins, as the address's `start=` does: the welcome (the
   * default, as a plain address opens), the guided tour, or exploring.
   */
  start?: 'welcome' | 'tour' | 'explore';
  /** Open paused at this event of the mission and explore from there, as `?event=` does. */
  event?: string;
  /** No 3D view (no WebGL, or its code did not load): the note shown in its place, and whether Reload may help. */
  no3D?: { note: string; offerReload: boolean };
  /** Make the real mission into a typed fixture, for an edge case no mission has. */
  story?: (mission: Mission) => Mission;
  /** Make the real mission list into a typed fixture, for an entry no real mission gives. */
  missionList?: (summaries: readonly MissionSummary[]) => readonly MissionSummary[];
  /** Which missions count as unfinished. The default is the site's own rule (none are, today). */
  isDraft?: (summary: MissionSummary) => boolean;
  /** Load a memorial page. The default loads the real one; pass another for loading, failure, and late answers. */
  loadMemorial?: (id: string) => Promise<Memorial>;
  /** Load an extra. The default loads a stand-in for it (an extra's own code is tested on its own). */
  loadExtra?: (id: string) => Promise<Extra>;
  /** The wide layout (the card floats at the bottom; "Tell me more" is a panel at the side) instead of a phone's. */
  wide?: boolean;
}

export interface MountedMission {
  /** A visitor, set up with userEvent.setup(). It keeps working under fake timers. */
  user: User;
  /** The 3D scene's stand-in: what the interface asked of it. */
  director: FakeDirector;
  /** The screen: draw frames to let time pass. */
  frames: Frames;
}

/* Built once per mission, as main.ts builds them; the content never changes during a run. */
interface Prepared {
  bundle: MissionBundle;
  story: StoryMap;
  start: number;
  end: number;
}

const prepared = new Map<string, Promise<Prepared>>();

function prepare(id: string): Promise<Prepared> {
  let ready = prepared.get(id);
  if (!ready) {
    ready = loadBundle(id).then((bundle) => {
      if (bundle.mission.id !== id) throw new Error(`There is no mission "${id}"`);
      const path = buildFlightPath(bundle.flight);
      const storyTime = createStoryTime([
        path.start,
        path.end,
        ...bundle.mission.events.map((event) => elapsedToSeconds(event.elapsed)),
      ]);
      const keys = storyTime.keyTimes;
      const story: StoryMap = {
        duration: storyTime.length,
        toStory: (seconds) => storyTime.toStory(seconds),
        toElapsed: (seconds) => storyTime.toMission(seconds),
      };
      return {
        bundle,
        story,
        start: keys[0] ?? path.start,
        end: keys[keys.length - 1] ?? path.end,
      };
    });
    prepared.set(id, ready);
  }
  return ready;
}

/** The body of the real index.html, without its script. */
function freshPage(): void {
  const parsed = new DOMParser().parseFromString(page, 'text/html');
  for (const script of parsed.querySelectorAll('script')) script.remove();
  document.title = parsed.title;
  document.body.className = '';
  document.body.innerHTML = parsed.body.innerHTML;
}

/** The address of a mission or memorial by id, as main.ts builds it. */
function addressOf(id: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('mission', id);
  return url.href;
}

function makeUser(): User {
  // With fake timers on, the visitor's pauses between keys move them along.
  return userEvent.setup({
    advanceTimers: (ms) => (vi.isFakeTimers() ? void vi.advanceTimersByTime(ms) : undefined),
  });
}

/**
 * Mount the whole interface for a real mission, the way the site does, and
 * begin as `options.start` asks.
 */
export async function mountMission(
  id: string,
  options: MountOptions = {},
): Promise<MountedMission> {
  const { bundle, story, start, end } = await prepare(id);
  const mission = options.story ? options.story(bundle.mission) : bundle.mission;
  setScreen({ wide: options.wide ?? false });
  freshPage();

  const frames = fakeFrames();
  const player = new MissionPlayer(start, end, story, frames.now);
  const atEvent = options.event
    ? mission.events.find((event) => event.id === options.event)
    : undefined;
  if (options.event && !atEvent) throw new Error(`${mission.name} has no event "${options.event}"`);
  if (atEvent) player.seek(elapsedToSeconds(atEvent.elapsed));
  const director = new FakeDirector(
    atEvent ? nearestView(mission, atEvent.view) : homeView(mission),
  );

  const interfaceOptions: InterfaceOptions = {
    mission,
    flight: outlineOf(bundle),
    cited: sourcesCitedBy(bundle),
    summaries: options.missionList ? options.missionList(summaries) : summaries,
    nameOf: (other) => summaryFor(other)?.name,
    isDraft: options.isDraft ?? ((summary) => !isReady(summary)),
    loadMemorial: options.loadMemorial ?? loadMemorial,
    addressOf,
    loadBundle,
    extras,
    extraTitleOf: (extraId) => extraFor(extraId)?.title,
    isExtraDraft: (meta) => !isExtraReady(meta),
    loadExtra:
      options.loadExtra ??
      ((extraId) => {
        const meta = extraFor(extraId);
        return meta
          ? Promise.resolve(standInExtra(meta))
          : Promise.reject(new Error(`There is no extra "${extraId}"`));
      }),
    player,
    director,
    has3D: !options.no3D,
  };
  if (options.no3D) interfaceOptions.no3D = options.no3D;
  const ui: MissionInterface = mountInterface(interfaceOptions);

  const begin = options.start ?? (atEvent ? 'explore' : 'welcome');
  if (begin === 'tour') ui.tour();
  else if (begin === 'explore') ui.explore();
  else ui.welcome();

  return { user: makeUser(), director, frames };
}

/** What mountRecordings gives a test: a visitor to use the players. */
export interface MountedRecordings {
  /** A visitor, set up with userEvent.setup(). It keeps working under fake timers. */
  user: User;
}

/**
 * Recording players on their own, side by side on a fresh page, for what
 * only shows with more than one (the card holds one at a time).
 */
export function mountRecordings(...clips: AudioClip[]): MountedRecordings {
  document.body.replaceChildren(...clips.map((clip) => createAudioPlayer(clip).element));
  return { user: makeUser() };
}

/** The ids of the missions this device has noted as visited, oldest first, as the site stores them. */
export type VisitedMissions = readonly string[];

/**
 * The missions this device has noted as visited, oldest first, as an extra
 * reads them: undefined until the first one. Anything stored that is not a
 * list of ids fails the test.
 */
export function visitedMissions(): VisitedMissions | undefined {
  const raw = window.localStorage.getItem('mission-to-the-moon/site/visited-missions');
  if (raw === null) return undefined;
  const stored: unknown = JSON.parse(raw);
  if (Array.isArray(stored) && stored.every((id): id is string => typeof id === 'string'))
    return stored;
  throw new Error(`The visited missions are stored as ${raw}, which is not a list of mission ids`);
}
