import type { Tour } from '../app/tour';
import { copy } from '../content/copy';
import { button, byId, el } from './dom';
import { icon } from './icons';

export interface TourPanelOptions {
  /** Called when the person leaves the tour with Exit. */
  onExplore(): void;
}

/**
 * The tour's controls inside the moment card, in place of Play and
 * Controls: which stop this is, a progress row, and Back, Next (Skip while
 * on the way, Finish at the last stop), and Exit. After the last stop the
 * panel steps aside for the end of the flight (see ending.ts); its
 * `data-phase` still says "finished".
 */
export function setUpTourPanel(tour: Tour, { onExplore }: TourPanelOptions): void {
  const panel = byId('tour', HTMLElement);

  const steps = el('div', 'tour__steps');
  const count = el('p', 'tour__count');
  count.setAttribute('data-testid', 'tour-count');
  const progress = el('ol', 'tour__progress');
  progress.setAttribute('aria-hidden', 'true');
  const dots = tour.stops.map((stop) => {
    const dot = el('li', 'tour__dot');
    dot.setAttribute('data-testid', `tour-dot-${stop.id}`);
    return dot;
  });
  progress.append(...dots);

  const back = button('button button--quiet tour__back');
  back.setAttribute('data-testid', 'tour-back');
  back.append(icon('previous'), el('span', 'tour__back-label', copy.tour.back));
  const next = button('button button--primary tour__next');
  next.setAttribute('data-testid', 'tour-next');
  const nextLabel = el('span', undefined, copy.tour.next);
  next.append(nextLabel, icon('next'));
  const exit = button('button button--quiet tour__exit', copy.tour.exit);
  exit.setAttribute('data-testid', 'tour-exit');
  const stepper = el('div', 'tour__nav');
  stepper.append(back, next);
  steps.append(count, progress, exit, stepper);

  panel.replaceChildren(steps);

  back.addEventListener('click', () => tour.back());
  next.addEventListener('click', () => tour.next());
  exit.addEventListener('click', onExplore);

  let lastPhase = tour.phase;
  const render = (): void => {
    const phase = tour.phase;
    // Off the tour, or past its last stop, the panel steps aside.
    panel.hidden = phase === 'off' || phase === 'finished';
    panel.dataset['phase'] = phase;

    if (phase === 'traveling' || phase === 'stopped') {
      const position = tour.index + 1;
      count.replaceChildren(
        el('strong', 'tour__count-number', copy.tour.stopOf(position, tour.total)),
      );
      if (phase === 'traveling')
        count.append(' ', el('span', 'tour__count-note', copy.tour.onTheWay));
      dots.forEach((dot, i) => {
        dot.classList.toggle('tour__dot--done', i < tour.index);
        dot.classList.toggle('tour__dot--current', i === tour.index);
      });
      // Back is disabled at the first stop; if it had focus, Next takes it.
      const backHadFocus = document.activeElement === back;
      back.disabled = tour.index === 0;
      if (backHadFocus && back.disabled) next.focus();
      // On the way, the same button skips ahead to the stop. Only its words
      // change, so keyboard focus stays on it. The panel announces nothing
      // itself: the interface says where the tour is going as it sets off,
      // and the stop as its card appears (see interface.ts).
      if (phase === 'traveling') {
        nextLabel.textContent = copy.tour.skip;
        next.setAttribute('aria-label', copy.tour.skipLabel);
      } else {
        nextLabel.textContent = tour.index >= tour.total - 1 ? copy.tour.finish : copy.tour.next;
        next.removeAttribute('aria-label');
      }
      // Starting again from the end of the flight: Next takes keyboard focus.
      if (lastPhase === 'finished') next.focus();
    }
    lastPhase = phase;
  };
  tour.subscribe(render);
  render();
}

/** Put keyboard focus on the tour's Next button. */
export function focusTourNext(): void {
  document.querySelector<HTMLButtonElement>('.tour__next')?.focus();
}
