import './styles/main.css';
import { copy } from './content/copy';
import { credits } from './content/credits';
import { Stage, WebGLUnavailableError } from './scene/stage';
import { setUpControlBar } from './ui/controls';
import { setUpCreditsDialog } from './ui/credits-dialog';
import { byId, reducedMotionQuery } from './ui/dom';
import { watchViewInsets } from './ui/layout';
import { setUpStatus } from './ui/status';

async function main(): Promise<void> {
  const canvas = byId('stage', HTMLCanvasElement);
  canvas.setAttribute('aria-label', copy.canvasLabel);

  const status = setUpStatus(canvas);
  const controlBar = setUpControlBar(copy.scaleNote);
  setUpCreditsDialog(credits);
  status.setLoadingText(copy.loading);

  let stage: Stage;
  try {
    stage = Stage.create(canvas, {
      onContextLost: () => status.showMessage(copy.errors.contextLost, true),
      onContextRestored: () => status.hideMessage(),
    });
  } catch (error) {
    if (!(error instanceof WebGLUnavailableError)) console.error(error);
    controlBar.hideViewControls();
    status.showMessage(copy.errors.noWebGL, false);
    return;
  }

  watchViewInsets(canvas, (top, bottom) => stage.setViewInsets(top, bottom));

  const motion = reducedMotionQuery();
  stage.setReducedMotion(motion.matches);
  motion.addEventListener('change', () => stage.setReducedMotion(motion.matches));

  try {
    await stage.load((loaded, total) => status.setProgress(loaded, total));
  } catch (error) {
    console.error(error);
    controlBar.hideViewControls();
    status.showMessage(copy.errors.textures, true);
    return;
  }

  stage.start();
  controlBar.enable(stage);
  status.reveal();
}

void main();
