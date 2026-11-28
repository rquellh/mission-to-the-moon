/**
 * The interface's few icons, drawn on a 24-unit grid with one stroke weight
 * so they read as a set. Each is decorative: the control around it carries
 * the label.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';

type IconName =
  | 'play'
  | 'pause'
  | 'previous'
  | 'next'
  | 'chevron-down'
  | 'chevron-up'
  | 'close'
  | 'external'
  | 'replay'
  | 'arrow-right'
  | 'game';

const SHAPES: Record<IconName, { fill?: string[]; stroke?: string[] }> = {
  play: {
    fill: ['M8.5 5.6v12.8a.8.8 0 0 0 1.2.7l10.1-6.4a.8.8 0 0 0 0-1.4L9.7 4.9a.8.8 0 0 0-1.2.7z'],
  },
  pause: {
    fill: [
      'M7 5h3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
      'M14 5h3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
    ],
  },
  previous: { stroke: ['M14.5 5.5 8 12l6.5 6.5'] },
  next: { stroke: ['M9.5 5.5 16 12l-6.5 6.5'] },
  'chevron-down': { stroke: ['M6.5 9.5 12 15l5.5-5.5'] },
  'chevron-up': { stroke: ['M6.5 14.5 12 9l5.5 5.5'] },
  close: { stroke: ['M6.5 6.5l11 11', 'M17.5 6.5l-11 11'] },
  external: {
    stroke: [
      'M13.5 5.5h5v5',
      'M18.5 5.5 11 13',
      'M16.5 13.5v4a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h4',
    ],
  },
  // Round and back to the start: "Watch again".
  replay: { stroke: ['M3.5 12a8.5 8.5 0 1 0 2.8-6.3', 'M3.5 4.5v5h5'] },
  'arrow-right': { stroke: ['M5 12h14', 'M13 6l6 6-6 6'] },
  // A game controller, with a cross of arrows on the left and two buttons on the right: "Play".
  game: {
    stroke: [
      'M7.5 7.5h9a5 5 0 0 1 5 5v.5a4 4 0 0 1-7.2 2.4l-.3-.4h-4l-.3.4A4 4 0 0 1 2.5 13v-.5a5 5 0 0 1 5-5z',
      'M7.5 10.2v3',
      'M6 11.7h3',
      'M15.4 10.6h.01',
      'M17.6 12.8h.01',
    ],
  },
};

/** An inline SVG icon, hidden from assistive technology. */
export function icon(name: IconName, className = 'icon'): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', className);
  const shape = SHAPES[name];
  for (const d of shape.fill ?? []) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'currentColor');
    svg.append(path);
  }
  for (const d of shape.stroke ?? []) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.75');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
  }
  return svg;
}
