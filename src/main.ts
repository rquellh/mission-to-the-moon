import './styles/main.css';
import type { Director, StoryMap } from './app/contract';
import { outlineOf, sourcesCitedBy } from './app/outline';
import { MissionPlayer } from './app/player';
import { copy } from './content/copy';
import { homeView, nearestView } from './app/views';
import { flightIdFor, hasMemorial, isReady, loadBundle, loadMemorial, summaries, summaryFor } from './content/missions';
import { elapsedToSeconds, type ElapsedTime, type EventView, type MissionSummary } from './content/types';
import type { Stage } from './scene/stage';
import { buildFlightPath, createStoryTime } from './sim';
import { byId, reducedMotionQuery } from './ui/dom';
import { mountInterface, setUpMissionList } from './ui/interface';
import { setUpStatus } from './ui/status';

/** A Director that does nothing, for when there is no 3D view. */
function noDirector(view: EventView): Director {
  return {
    scaleMode: 'readable',
    view,
    setScaleMode() {},
    setView() {},
    setViewInsets() {},
    subscribe: () => () => {},
  };
}

/** The address of a mission (or memorial) by id, built from the current one so it works under any path. */
function addressOf(id: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('mission', id);
  return url.href;
}

/** What the address asks for. */
interface DeepLink {
  /** The mission's id, or null for the default mission. */
  mission: string | null;
  time: number | null;
  view: EventView | null;
  start: 'tour' | 'explore' | null;
}

/**
 * Deep links:
 * - `?mission=gemini-8` picks the mission. An unknown id opens the default
 *   mission. A memorial's id (`?mission=apollo-1`) opens the default mission
 *   with the memorial page open over the mission list.
 * - `?t=102:45:40` opens paused at that mission time (hours, minutes, and
 *   seconds since liftoff, or plain seconds; a leading minus sign means
 *   before liftoff) and skips the welcome.
 * - `?view=` picks the view (journey, earth, moon, or spacecraft; "both"
 *   and "ship" also work, as the buttons name them).
 * - `?start=tour` or `?start=explore` skips the welcome and begins that way.
 */
function readDeepLink(): DeepLink {
  const params = new URLSearchParams(window.location.search);
  let time: number | null = null;
  const t = params.get('t')?.trim();
  if (t) {
    const seconds = /^-?\d+(\.\d+)?$/.test(t)
      ? Number(t)
      : /^-?\d+:\d{1,2}(:\d{1,2}(\.\d+)?)?$/.test(t)
        ? elapsedToSeconds((t.split(':').length === 2 ? `${t}:0` : t) as ElapsedTime)
        : Number.NaN;
    if (Number.isFinite(seconds)) time = seconds;
  }
  const names: Record<string, EventView> = {
    journey: 'journey',
    both: 'journey',
    earth: 'earth',
    moon: 'moon',
    spacecraft: 'spacecraft',
    ship: 'spacecraft',
  };
  const view = names[params.get('view')?.trim().toLowerCase() ?? ''] ?? null;
  const startParam = params.get('start')?.trim().toLowerCase();
  const start = startParam === 'tour' || startParam === 'explore' ? startParam : null;
  return { mission: params.get('mission')?.trim().toLowerCase() || null, time, view, start };
}

/**
 * Load a flight and build its path and story time. Story time gives every
 * stretch between two events a watchable length.
 */
async function prepareFlight(id: string) {
  const bundle = await loadBundle(id);
  const path = buildFlightPath(bundle.flight);
  const storyTime = createStoryTime([
    path.start,
    path.end,
    ...bundle.mission.events.map((event) => elapsedToSeconds(event.elapsed)),
  ]);
  return { bundle, path, storyTime };
}

/**
 * Create the 3D scene once its code has arrived, or say why there is none:
 * its code did not load (reloading may help), or there is no WebGL.
 */
async function makeStage(
  code: Promise<typeof import('./scene/stage')>,
  canvas: HTMLCanvasElement,
  options: Parameters<typeof Stage.create>[1],
): Promise<{ stage: Stage } | { problem: string; offerReload: boolean }> {
  let scene: typeof import('./scene/stage');
  try {
    scene = await code;
  } catch (error) {
    console.error(error);
    return { problem: copy.errors.scene, offerReload: true };
  }
  try {
    return { stage: scene.Stage.create(canvas, options) };
  } catch (error) {
    if (!(error instanceof scene.WebGLUnavailableError)) console.error(error);
    return { problem: copy.errors.noWebGL, offerReload: false };
  }
}

async function main(): Promise<void> {
  const canvas = byId('stage', HTMLCanvasElement);
  canvas.setAttribute('aria-label', copy.canvasLabel);
  const status = setUpStatus(canvas);
  const link = readDeepLink();
  // The 3D scene's code (with three.js) is the largest file the site loads.
  // Fetch it now, alongside the mission, rather than before anything shows.
  const sceneCode = import('./scene/stage');
  sceneCode.catch(() => {}); // Handled where it is awaited, below.
  const listOptions = {
    summaries,
    nameOf: (id: string) => summaryFor(id)?.name,
    isDraft: (summary: MissionSummary) => !isReady(summary),
    loadMemorial,
    addressOf,
  };

  // 1. The mission, loaded on its own now that it is chosen. A memorial has
  //    no flight to show, so its page opens over the default mission.
  const memorialId = hasMemorial(link.mission) ? link.mission : null;
  const flightId = flightIdFor(memorialId ? null : link.mission);
  const flightName = summaryFor(flightId)?.name;
  status.setLoadingText(flightName ? copy.loadingMission(flightName) : copy.loading);

  // 2. Its flight path and clock. If either fails, say so and offer the
  //    mission list, which works without a mission.
  let flight: Awaited<ReturnType<typeof prepareFlight>>;
  try {
    flight = await prepareFlight(flightId);
  } catch (error) {
    console.error(error);
    const list = setUpMissionList(listOptions);
    status.showMessage(flightName ? copy.errors.mission(flightName) : copy.errors.missionUnnamed, true, {
      text: copy.errors.allMissions,
      run: (from) => list.open(from),
    });
    return;
  }
  const { bundle, path, storyTime } = flight;
  const mission = bundle.mission;
  const story: StoryMap = {
    duration: storyTime.length,
    toStory: (seconds) => storyTime.toStory(seconds),
    toElapsed: (seconds) => storyTime.toMission(seconds),
  };
  const keys = storyTime.keyTimes;
  const player = new MissionPlayer(keys[0] ?? path.start, keys[keys.length - 1] ?? path.end, story);

  if (link.time !== null) player.seek(link.time);

  const shared = {
    ...listOptions,
    mission,
    flight: outlineOf(bundle),
    cited: sourcesCitedBy(bundle),
    player,
  };

  // 3. The 3D scene. Without WebGL, or if its code did not load, the
  //    mission can still be read.
  const made = await makeStage(sceneCode, canvas, {
    path,
    player,
    mission,
    vehicle: bundle.vehicle,
    leftBehind: bundle.leftBehind,
    onContextLost: () => status.showMessage(copy.errors.contextLost, true),
    onContextRestored: () => status.hideMessage(),
  });
  if ('problem' in made) {
    const ui = mountInterface({ ...shared, director: noDirector(homeView(mission)), has3D: false });
    ui.explore();
    if (memorialId) ui.memorial(memorialId);
    status.reveal();
    status.showMessage(made.problem, made.offerReload);
    return;
  }
  const stage = made.stage;
  const motion = reducedMotionQuery();
  stage.setReducedMotion(motion.matches);
  motion.addEventListener('change', () => stage.setReducedMotion(motion.matches));
  if (link.view) stage.setView(nearestView(mission, link.view), true);

  // 4. The interface, connected to the clock and the scene.
  const ui = mountInterface({ ...shared, director: stage, has3D: true });

  try {
    await stage.load((loaded, total) => status.setProgress(loaded, total));
  } catch (error) {
    console.error(error);
    status.showMessage(copy.errors.textures, true);
    return;
  }

  stage.start();
  status.reveal();
  if (memorialId) {
    ui.welcome(memorialId);
    ui.memorial(memorialId);
  } else if (link.start === 'tour') ui.tour();
  else if (link.time !== null || link.start === 'explore') ui.explore();
  else ui.welcome();
}

void main();
