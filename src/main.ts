import './styles/main.css';
import type { Director, StoryMap } from './app/contract';
import { readDeepLink } from './app/deep-link';
import { outlineOf, sourcesCitedBy } from './app/outline';
import { MissionPlayer } from './app/player';
import { homeView, nearestView } from './app/views';
import { copy } from './content/copy';
import {
  flightIdFor,
  hasMemorial,
  isReady,
  loadBundle,
  loadMemorial,
  summaries,
  summaryFor,
} from './content/missions';
import { elapsedToSeconds, type EventView, type MissionSummary } from './content/types';
import { extraFor, extras, hasExtra, isExtraReady, loadExtra } from './extras';
import type { Stage } from './scene/stage';
import { buildFlightPath, createStoryTime, partingsAtEvents, storyKeyTimes } from './sim';
import { byId, reducedMotionQuery } from './ui/dom';
import { mountInterface, setUpMissionList, type MissionInterface } from './ui/interface';
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

/**
 * Load a flight and build its path and story time. Story time gives every
 * stretch between two events a watchable length (see storyKeyTimes). The
 * partings are where the tour stops to show a lander leave its ship.
 */
async function prepareFlight(id: string) {
  const bundle = await loadBundle(id);
  const path = buildFlightPath(bundle.flight);
  const eventTimes = bundle.mission.events.map((event) => elapsedToSeconds(event.elapsed));
  const storyTime = createStoryTime(storyKeyTimes(path, eventTimes));
  return { bundle, path, storyTime, partings: partingsAtEvents(path, eventTimes) };
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
  const link = readDeepLink(window.location.search);
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
    status.showMessage(
      flightName ? copy.errors.mission(flightName) : copy.errors.missionUnnamed,
      true,
      {
        text: copy.errors.allMissions,
        run: (from) => list.open(from),
      },
    );
    return;
  }
  const { bundle, path, storyTime, partings } = flight;
  const mission = bundle.mission;
  const story: StoryMap = {
    duration: storyTime.length,
    toStory: (seconds) => storyTime.toStory(seconds),
    toElapsed: (seconds) => storyTime.toMission(seconds),
    hurryLimit: (seconds) => storyTime.hurryLimit(seconds),
  };
  const keys = storyTime.keyTimes;
  const player = new MissionPlayer(keys[0] ?? path.start, keys[keys.length - 1] ?? path.end, story);

  // A time in the address wins over an event.
  const atEvent =
    link.time === null ? mission.events.find((event) => event.id === link.event) : undefined;
  if (link.time !== null) player.seek(link.time);
  else if (atEvent) player.seek(elapsedToSeconds(atEvent.elapsed));
  const seeked = link.time !== null || atEvent !== undefined;
  const extraId = memorialId ? null : hasExtra(link.extra) ? link.extra : null;

  const shared = {
    ...listOptions,
    mission,
    flight: outlineOf(bundle),
    cited: sourcesCitedBy(bundle),
    loadBundle,
    extras,
    extraTitleOf: (id: string) => extraFor(id)?.title,
    isExtraDraft: (meta: (typeof extras)[number]) => !isExtraReady(meta),
    loadExtra,
    player,
    partings,
  };

  /** Begin where the address asks: the welcome, a tour, exploring, a memorial page, or an extra. */
  const begin = (ui: MissionInterface): void => {
    if (memorialId) {
      ui.welcome();
      ui.memorial(memorialId);
      return;
    }
    // An extra opens over the welcome, unless the address names a mission or a place in one.
    const namesPlace = link.mission !== null || seeked || link.start !== null;
    if (link.start === 'tour') ui.tour();
    else if (seeked || link.start === 'explore' || (extraId && namesPlace)) ui.explore();
    else ui.welcome();
    if (extraId) ui.extra(extraId, link.extraParams);
  };

  // 3. The 3D scene. Without WebGL, or if its code did not load, every
  //    mission can still be read, starting from the welcome as usual.
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
    const ui = mountInterface({
      ...shared,
      director: noDirector(homeView(mission)),
      has3D: false,
      no3D: { note: made.problem, offerReload: made.offerReload },
    });
    status.reveal();
    begin(ui);
    return;
  }
  const stage = made.stage;
  // For the browser tests: what the scene is drawing (see src/scene/report.ts).
  window.__missionScene = () => stage.report();
  const motion = reducedMotionQuery();
  stage.setReducedMotion(motion.matches);
  motion.addEventListener('change', () => stage.setReducedMotion(motion.matches));
  // A view in the address wins; an event in the address brings its own view, as a tour stop does.
  const startView = link.view ?? atEvent?.view ?? null;
  if (startView) stage.setView(nearestView(mission, startView), { instant: true });

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
  begin(ui);
}

void main();
