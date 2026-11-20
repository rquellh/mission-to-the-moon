import type { Director } from '../app/contract';
import { nearestView, viewsFor } from '../app/views';
import { copy } from '../content/copy';
import type { Mission } from '../content/types';
import { button, byId } from './dom';

/**
 * The view buttons and the True scale switch. The buttons are the views this
 * mission offers (Earth, Moon, Ship, and Both for a Moon flight; Earth and
 * Ship for a flight that stayed in Earth orbit). They ask the Director for a
 * view and show whatever view and scale it reports.
 */
export function setUpViewControls(director: Director, mission: Mission): void {
  const group = byId('view-buttons', HTMLDivElement);
  const scaleToggle = byId('scale-toggle', HTMLButtonElement);
  const note = byId('scale-note', HTMLSpanElement);
  const notes = copy.scaleNote[mission.destination];

  group.setAttribute('aria-label', copy.views.groupLabel);
  const buttons = viewsFor(mission).map((view) => {
    const viewButton = button('segmented__item', copy.views[view]);
    viewButton.setAttribute('data-testid', `view-button-${view}`);
    viewButton.dataset['view'] = view;
    viewButton.setAttribute('aria-pressed', 'false');
    viewButton.addEventListener('click', () => director.setView(view));
    return viewButton;
  });
  group.replaceChildren(...buttons);

  scaleToggle.addEventListener('click', () => {
    director.setScaleMode(director.scaleMode === 'true' ? 'readable' : 'true');
  });

  const show = (): void => {
    // A view this mission does not offer shows as its home view.
    const view = nearestView(mission, director.view);
    for (const viewButton of buttons) {
      viewButton.setAttribute('aria-pressed', String(viewButton.dataset['view'] === view));
    }
    scaleToggle.setAttribute('aria-pressed', String(director.scaleMode === 'true'));
    const text = notes[director.scaleMode];
    if (note.textContent !== text) note.textContent = text;
  };
  director.subscribe(show);
  show();
}
