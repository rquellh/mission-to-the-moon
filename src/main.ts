import './styles/main.css';
import type { Director, StoryMap } from './app/contract';
import { MissionPlayer } from './app/player';
import { copy } from './content/copy';
import { homeView, nearestView } from './app/views';
import { bundleFor, missions } from './content/missions';
import { elapsedToSeconds, type ElapsedTime, type EventView } from './content/types';
import { Stage, WebGLUnavailableError } from './scene/stage';
import { buildFlightPath, createStoryTime } from './sim';
import { byId, reducedMotionQuery } from './ui/dom';
import { mountInterface } from './ui/interface';
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
 * - `?mission=gemini-8` picks the mission.
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

async function main(): Promise<void> {
  const canvas = byId('stage', HTMLCanvasElement);
  canvas.setAttribute('aria-label', copy.canvasLabel);
  const status = setUpStatus(canvas);
  status.setLoadingText(copy.loading);

  // 1. The mission, its flight path, and its clock. Story time gives every
  //    stretch between two events a watchable length.
  const link = readDeepLink();
  const bundle = bundleFor(link.mission);
  const mission = bundle.mission;
  const path = buildFlightPath(bundle.flight);
  const storyTime = createStoryTime([
    path.start,
    path.end,
    ...mission.events.map((event) => elapsedToSeconds(event.elapsed)),
  ]);
  const story: StoryMap = {
    duration: storyTime.length,
    toStory: (seconds) => storyTime.toStory(seconds),
    toElapsed: (seconds) => storyTime.toMission(seconds),
  };
  const keys = storyTime.keyTimes;
  const player = new MissionPlayer(keys[0] ?? path.start, keys[keys.length - 1] ?? path.end, story);

  if (link.time !== null) player.seek(link.time);

  // 2. The 3D scene. Without WebGL, the mission can still be read.
  let stage: Stage;
  try {
    stage = Stage.create(canvas, {
      path,
      player,
      mission,
      vehicle: bundle.vehicle,
      leftBehind: bundle.leftBehind,
      onContextLost: () => status.showMessage(copy.errors.contextLost, true),
      onContextRestored: () => status.hideMessage(),
    });
  } catch (error) {
    if (!(error instanceof WebGLUnavailableError)) console.error(error);
    mountInterface({ mission, missions, player, director: noDirector(homeView(mission)), has3D: false }).explore();
    status.reveal();
    status.showMessage(copy.errors.noWebGL, false);
    return;
  }
  const motion = reducedMotionQuery();
  stage.setReducedMotion(motion.matches);
  motion.addEventListener('change', () => stage.setReducedMotion(motion.matches));
  if (link.view) stage.setView(nearestView(mission, link.view), true);

  // 3. The interface, connected to the clock and the scene.
  const ui = mountInterface({ mission, missions, player, director: stage, has3D: true });

  try {
    await stage.load((loaded, total) => status.setProgress(loaded, total));
  } catch (error) {
    console.error(error);
    status.showMessage(copy.errors.textures, true);
    return;
  }

  stage.start();
  status.reveal();
  if (link.start === 'tour') ui.tour();
  else if (link.time !== null || link.start === 'explore') ui.explore();
  else ui.welcome();
}

void main();
