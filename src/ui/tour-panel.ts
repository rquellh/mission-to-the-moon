import type { Tour } from '../app/tour';
import { copy } from '../content/copy';
import { button, byId, el } from './dom';
import { icon } from './icons';

export interface TourPanelOptions {
  /** Called when the person leaves the tour, from Exit or the ending. */
  onExplore(): void;
  /** Called to start the tour over from the ending. */
  onRestart(): void;
}

/**
 * The tour's controls inside the event sheet: which stop this is, a progress
 * row, and Back, Next, and Exit. After the last stop it shows the ending,
 * which hands off to exploring freely.
 */
export function setUpTourPanel(tour: Tour, { onExplore, onRestart }: TourPanelOptions): void {
  const panel = byId('tour', HTMLElement);

  // Stepping view.
  const steps = el('div', 'tour__steps');
  const count = el('p', 'tour__count');
  const progress = el('ol', 'tour__progress');
  progress.setAttribute('aria-hidden', 'true');
  const dots = tour.stops.map(() => el('li', 'tour__dot'));
  progress.append(...dots);

  const back = button('button button--quiet tour__back');
  back.append(icon('previous'), el('span', 'tour__back-label', copy.tour.back));
  const next = button('button button--primary tour__next');
  const nextLabel = el('span', undefined, copy.tour.next);
  next.append(nextLabel, icon('next'));
  const exit = button('button button--quiet tour__exit', copy.tour.exit);
  const stepper = el('div', 'tour__nav');
  stepper.append(back, next);
  steps.append(count, progress, exit, stepper);

  // The ending.
  const ending = el('div', 'tour__ending');
  const endTitle = el('h3', 'tour__end-title', copy.tour.endTitle);
  endTitle.tabIndex = -1;
  const endActions = el('div', 'tour__end-actions');
  const explore = button('button button--primary', copy.tour.endExplore);
  const again = button('button button--quiet', copy.tour.endAgain);
  endActions.append(explore, again);
  ending.append(endTitle, el('p', 'tour__end-text', copy.tour.endText), endActions);

  panel.replaceChildren(steps, ending);

  back.addEventListener('click', () => tour.back());
  next.addEventListener('click', () => tour.next());
  exit.addEventListener('click', onExplore);
  explore.addEventListener('click', onExplore);
  again.addEventListener('click', onRestart);

  let lastPhase = tour.phase;
  const render = (): void => {
    const phase = tour.phase;
    panel.hidden = phase === 'off';
    panel.dataset['phase'] = phase;
    const finished = phase === 'finished';
    steps.hidden = finished;
    ending.hidden = !finished;

    if (!finished && phase !== 'off') {
      const position = tour.index + 1;
      count.replaceChildren(el('strong', 'tour__count-number', copy.tour.stopOf(position, tour.total)));
      if (phase === 'traveling') count.append(' ', el('span', 'tour__count-note', copy.tour.onTheWay));
      dots.forEach((dot, i) => {
        dot.classList.toggle('tour__dot--done', i < tour.index);
        dot.classList.toggle('tour__dot--current', i === tour.index);
      });
      // Back is disabled at the first stop; if it had focus, Next takes it.
      const backHadFocus = document.activeElement === back;
      back.disabled = tour.index === 0;
      if (backHadFocus && back.disabled) next.focus();
      nextLabel.textContent = tour.index >= tour.total - 1 ? copy.tour.finish : copy.tour.next;
    }

    // Keep keyboard focus somewhere sensible as the panel changes.
    if (finished && lastPhase !== 'finished') endTitle.focus();
    if (lastPhase === 'finished' && !finished && phase !== 'off') next.focus();
    lastPhase = phase;
  };
  tour.subscribe(render);
  render();
}

/** Put keyboard focus on the tour's Next button. */
export function focusTourNext(): void {
  document.querySelector<HTMLButtonElement>('.tour__next')?.focus();
}
