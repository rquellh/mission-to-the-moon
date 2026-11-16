import type { Director, ScaleMode } from '../app/contract';
import type { EventView } from '../content/types';
import { byId } from './dom';

const VIEWS: readonly EventView[] = ['earth', 'moon', 'spacecraft', 'journey'];

function isView(value: string | undefined): value is EventView {
  return VIEWS.includes(value as EventView);
}

/**
 * The Earth, Moon, Ship, and Both buttons and the True scale switch. They
 * ask the Director for a view and show whatever view and scale it reports.
 */
export function setUpViewControls(director: Director, scaleNotes: Record<ScaleMode, string>): void {
  const group = byId('view-buttons', HTMLDivElement);
  const buttons = [...group.querySelectorAll<HTMLButtonElement>('button[data-view]')];
  const scaleToggle = byId('scale-toggle', HTMLButtonElement);
  const note = byId('scale-note', HTMLSpanElement);

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const view = button.dataset['view'];
      if (isView(view)) director.setView(view);
    });
  }
  scaleToggle.addEventListener('click', () => {
    director.setScaleMode(director.scaleMode === 'true' ? 'readable' : 'true');
  });

  const show = (): void => {
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset['view'] === director.view));
    }
    scaleToggle.setAttribute('aria-pressed', String(director.scaleMode === 'true'));
    const text = scaleNotes[director.scaleMode];
    if (note.textContent !== text) note.textContent = text;
  };
  director.subscribe(show);
  show();
}
