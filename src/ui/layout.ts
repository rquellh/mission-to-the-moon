import { byId } from './dom';

/**
 * Report how much of the canvas the title bar (top) and control bar (bottom)
 * cover, now and whenever their size or the window changes.
 */
export function watchViewInsets(
  canvas: HTMLCanvasElement,
  onChange: (top: number, bottom: number) => void,
): void {
  const header = document.querySelector<HTMLElement>('.top-bar');
  const controls = byId('control-bar', HTMLElement);

  const measure = (): void => {
    const area = canvas.getBoundingClientRect();
    const top = header ? Math.max(0, header.getBoundingClientRect().bottom - area.top) : 0;
    const bottom = controls.hidden
      ? 0
      : Math.max(0, area.bottom - controls.getBoundingClientRect().top);
    onChange(Math.round(top), Math.round(bottom));
  };

  const observer = new ResizeObserver(measure);
  if (header) observer.observe(header);
  observer.observe(controls);
  observer.observe(canvas);
  measure();
}
