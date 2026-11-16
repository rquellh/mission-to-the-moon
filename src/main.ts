import './styles/main.css';
import type { Director, StoryMap } from './app/contract';
import { MissionPlayer } from './app/player';
import { copy } from './content/copy';
import { apollo11, missions } from './content/missions';
import { apollo11Flight } from './content/missions/apollo-11-flight';
import { apollo11LeftBehind, apollo11Vehicle } from './content/missions/apollo-11-vehicle';
import { elapsedToSeconds, type ElapsedTime, type EventView } from './content/types';
import { Stage, WebGLUnavailableError } from './scene/stage';
import { buildFlightPath, createStoryTime } from './sim';
import { byId, reducedMotionQuery } from './ui/dom';
import { mountInterface } from './ui/interface';
import { setUpStatus } from './ui/status';

/** A Director that does nothing, for when there is no 3D view. */
function noDirector(): Director {
  return {
    scaleMode: 'readable',
    view: 'journey',
    setScaleMode() {},
    setView() {},
    setViewInsets() {},
    subscribe: () => () => {},
  };
}

/**
 * Deep links: `?t=102:45:40` opens paused at that mission time (hours,
 * minutes, and seconds since liftoff, or plain seconds) and skips the
 * welcome; `?view=` picks the view (journey, earth, moon, or spacecraft;
 * "both" and "ship" also work, as the buttons name them).
 */
function readDeepLink(): { time: number | null; view: EventView | null } {
  const params = new URLSearchParams(window.location.search);
  let time: number | null = null;
  const t = params.get('t')?.trim();
  if (t) {
    const seconds = /^\d+(\.\d+)?$/.test(t)
      ? Number(t)
      : /^\d+:\d{1,2}(:\d{1,2}(\.\d+)?)?$/.test(t)
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
  return { time, view };
}

async function main(): Promise<void> {
  const canvas = byId('stage', HTMLCanvasElement);
  canvas.setAttribute('aria-label', copy.canvasLabel);
  const status = setUpStatus(canvas);
  status.setLoadingText(copy.loading);

  // 1. The mission, its flight path, and its clock. Story time gives every
  //    stretch between two events a watchable length.
  const mission = apollo11;
  const path = buildFlightPath(apollo11Flight);
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

  const link = readDeepLink();
  if (link.time !== null) player.seek(link.time);

  // 2. The 3D scene. Without WebGL, the mission can still be read.
  let stage: Stage;
  try {
    stage = Stage.create(canvas, {
      path,
      player,
      mission,
      vehicle: apollo11Vehicle,
      leftBehind: apollo11LeftBehind,
      onContextLost: () => status.showMessage(copy.errors.contextLost, true),
      onContextRestored: () => status.hideMessage(),
    });
  } catch (error) {
    if (!(error instanceof WebGLUnavailableError)) console.error(error);
    mountInterface({ mission, missions, player, director: noDirector(), has3D: false }).explore();
    status.reveal();
    status.showMessage(copy.errors.noWebGL, false);
    return;
  }
  const motion = reducedMotionQuery();
  stage.setReducedMotion(motion.matches);
  motion.addEventListener('change', () => stage.setReducedMotion(motion.matches));
  if (link.view) stage.setView(link.view, true);

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
  if (link.time !== null) ui.explore();
  else ui.welcome();
}

void main();
