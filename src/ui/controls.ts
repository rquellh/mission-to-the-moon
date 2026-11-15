import type { ScaleMode } from '../scene/config';
import { byId } from './dom';

/** The parts of the stage the control bar needs. */
export interface StageControls {
  readonly scaleMode: ScaleMode;
  focusOn(target: 'earth' | 'moon'): void;
  setScaleMode(mode: ScaleMode): void;
}

export interface ControlBar {
  /** Turn the buttons on once the stage is ready. */
  enable(stage: StageControls): void;
  /** Hide the controls that need the 3D view (for example, without WebGL). */
  hideViewControls(): void;
}

export function setUpControlBar(scaleNotes: Record<ScaleMode, string>): ControlBar {
  const bar = byId('control-bar', HTMLElement);
  const earthButton = byId('focus-earth', HTMLButtonElement);
  const moonButton = byId('focus-moon', HTMLButtonElement);
  const scaleToggle = byId('scale-toggle', HTMLButtonElement);
  const note = byId('scale-note', HTMLParagraphElement);

  const showMode = (mode: ScaleMode): void => {
    scaleToggle.setAttribute('aria-pressed', String(mode === 'true'));
    note.textContent = scaleNotes[mode];
  };
  showMode('readable');

  return {
    enable(stage) {
      earthButton.addEventListener('click', () => stage.focusOn('earth'));
      moonButton.addEventListener('click', () => stage.focusOn('moon'));
      scaleToggle.addEventListener('click', () => {
        const next: ScaleMode = stage.scaleMode === 'true' ? 'readable' : 'true';
        stage.setScaleMode(next);
        showMode(next);
      });
      for (const button of [earthButton, moonButton, scaleToggle]) {
        button.disabled = false;
      }
      showMode(stage.scaleMode);
    },
    hideViewControls() {
      bar.hidden = true;
    },
  };
}
