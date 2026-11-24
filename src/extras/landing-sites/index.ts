/**
 * "Six landings on the Moon": a Moon to turn, with a ring at each place an
 * Apollo lunar module landed. Choosing one (a ring, or a button below)
 * turns that place toward the viewer and shows where and when it landed.
 * Every fact comes from the mission's own story and flight plan, with
 * their citations (see landings.ts).
 *
 * Simplified, and said so on screen: the Moon is a smooth ball covered with
 * a photo map, lit from where the viewer looks (so every site can be seen),
 * and each ring is drawn at a steady size on screen, far bigger than the
 * landing site it marks.
 */
import './landing-sites.css';
import { Vector3 } from 'three';
import type { MissionBundle } from '../../content/missions/bundle.ts';
import type { Citation, MissionSummary } from '../../content/types.ts';
import { COLORS, createMiniView, createMoon, type Globe, type MiniView } from '../../scene/kit.ts';
import { sourcesBlock } from '../../ui/citations.ts';
import { button, el, hiddenText } from '../../ui/dom.ts';
import { missionDates, summaryDates } from '../../ui/format.ts';
import type { Extra, ExtraContext, ExtraMount } from '../types.ts';
import {
  LANDING_MISSIONS,
  MEANT_TO_LAND,
  elapsedInWords,
  formatLatitude,
  formatLongitude,
  landingOf,
  utcInWords,
  type Landing,
} from './landings.ts';
import { meta } from './meta.ts';

interface Site {
  id: string;
  summary: MissionSummary | undefined;
  /** "Apollo 11". */
  name: string;
  /** "11": what the ring's label and the button show. */
  short: string;
  choice: HTMLButtonElement;
  label: HTMLSpanElement;
  labelSize: { width: number; height: number } | null;
  bundle: MissionBundle | null;
  landing: Landing | null;
  removeMarker: (() => void) | null;
}

/** Where a ring was last drawn on the canvas, for tapping. */
interface OnScreen {
  site: Site;
  x: number;
  y: number;
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** How long the Moon takes to turn a chosen place toward the viewer, seconds (at once under reduced motion). */
const TURN_SECONDS = 0.9;
/** A tap this close to a ring (CSS pixels) chooses it. */
const TAP_RADIUS = 30;
/** Rings this near the Moon's edge (the cosine of the angle from the viewer) are too slanted to label. */
const EDGE = 0.12;

const overlaps = (a: Box, b: Box): boolean =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const unique = (notes: Array<string | undefined>): string[] => [
  ...new Set(notes.filter((n): n is string => Boolean(n))),
];

function mount(host: HTMLElement, context: ExtraContext, params: URLSearchParams): ExtraMount {
  const { signal } = context;
  const summaryOf = (id: string): MissionSummary | undefined =>
    context.summaries.find((s) => s.id === id);

  /* The page. */
  const root = el('div', 'ls');
  const stage = el('div', 'ls__stage');
  const canvas = el('canvas', 'ls__canvas');
  canvas.setAttribute('role', 'img');
  const labels = el('div', 'ls__labels');
  labels.setAttribute('aria-hidden', 'true');
  stage.append(canvas, labels);

  const side = el('div', 'ls__side');
  const intro = el(
    'p',
    'extra-note ls__intro',
    'Each ring is a place where an Apollo lunar module landed. Drag to turn the Moon. Tap a ring or an Apollo flight number.',
  );
  const choices = el('div', 'segmented ls__choices');
  choices.setAttribute('role', 'group');
  choices.setAttribute('aria-label', 'Choose a landing');
  const status = el('p', 'extra-note ls__status', 'Loading the landings…');
  const card = el('section', 'extra-panel ls__card');
  card.hidden = true;
  // Said on screen, as the header comment explains.
  const note = el(
    'p',
    'extra-note ls__note',
    'Simplified: the Moon is drawn as a smooth ball covered with a photo map, lit from where you look, and each ring is far bigger than the landing site it marks.',
  );
  const meant = el('div', 'ls__meant');
  meant.hidden = true;
  side.append(intro, choices, status, card, note, meant);
  root.append(stage, side);
  host.append(root);

  const sites: Site[] = LANDING_MISSIONS.map((id) => {
    const summary = summaryOf(id);
    const name = summary?.name ?? id;
    const short = name.replace(/^Apollo\s+/, '');
    const choice = button('segmented__item ls__choice');
    if (short !== name) choice.append(hiddenText('Apollo '), short);
    else choice.textContent = name;
    choice.setAttribute('aria-pressed', 'false');
    choice.disabled = true;
    const label = el('span', 'ls__label', short);
    label.hidden = true;
    choices.append(choice);
    labels.append(label);
    return {
      id,
      summary,
      name,
      short,
      choice,
      label,
      labelSize: null,
      bundle: null,
      landing: null,
      removeMarker: null,
    };
  });

  /* The Moon. Without WebGL the cards still work, and the screen says why the Moon is missing. */
  let view: MiniView | null = null;
  let moon: Globe | null = null;
  try {
    view = createMiniView(canvas, { lighting: 'globes' });
    moon = createMoon({ view });
    view.scene.add(moon.root);
    view.frame(new Vector3(0, 0, 0), moon.radius * 1.12, new Vector3(0, 0, 1));
  } catch {
    moon?.dispose();
    view?.dispose();
    moon = null;
    view = null;
    stage.classList.add('ls__stage--none');
    stage.replaceChildren(
      el(
        'p',
        'extra-note',
        'This browser cannot draw 3D pictures, so the Moon is not shown. Choose a flight to read where it landed.',
      ),
    );
  }

  // Light the Moon from a little above and to the left of the viewer, so
  // the side in view is always lit and craters keep a little shadow.
  const sun = new Vector3();
  const axis = new Vector3();
  const light = (): void => {
    if (!view || !moon) return;
    sun.copy(view.camera.position).sub(view.controls.target).normalize();
    sun.addScaledVector(axis.set(0, 1, 0).applyQuaternion(view.camera.quaternion), 0.35);
    sun.addScaledVector(axis.set(1, 0, 0).applyQuaternion(view.camera.quaternion), -0.35);
    sun.normalize();
    view.setSunDirection(sun);
    moon.setSunDirection(sun);
  };
  if (view) {
    view.controls.addEventListener('change', light);
    light();
  }

  /* Labels beside the rings, placed after each frame so they never overlap each other or a ring. */
  let onScreen: OnScreen[] = [];
  const point = new Vector3();
  const toViewer = new Vector3();
  const placeLabels = (): void => {
    if (!view || !moon) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const shown: OnScreen[] = [];
    for (const site of sites) {
      if (!site.landing) continue;
      moon.pointAt(site.landing.latitude, site.landing.longitude, 0, point);
      toViewer.copy(view.camera.position).sub(point).normalize();
      const facing = point.clone().sub(moon.root.position).normalize().dot(toViewer);
      if (facing < EDGE) {
        site.label.hidden = true;
        continue;
      }
      point.project(view.camera);
      shown.push({ site, x: ((point.x + 1) / 2) * width, y: ((1 - point.y) / 2) * height });
    }
    const taken: Box[] = shown.map(({ x, y }) => ({
      left: x - 8,
      top: y - 8,
      right: x + 8,
      bottom: y + 8,
    }));
    for (const { site, x, y } of shown) {
      site.label.hidden = false;
      site.labelSize ??= { width: site.label.offsetWidth, height: site.label.offsetHeight };
      const { width: w, height: h } = site.labelSize;
      const gap = 9;
      const tries: [number, number][] = [
        [x + gap, y - h / 2],
        [x - gap - w, y - h / 2],
        [x - w / 2, y - gap - h],
        [x - w / 2, y + gap],
        [x + gap * 0.7, y - gap * 0.7 - h],
        [x - gap * 0.7 - w, y - gap * 0.7 - h],
        [x + gap * 0.7, y + gap * 0.7],
        [x - gap * 0.7 - w, y + gap * 0.7],
      ];
      const boxOf = ([left, top]: [number, number]): Box => ({
        left,
        top,
        right: left + w,
        bottom: top + h,
      });
      const spot = tries.find((t) => !taken.some((box) => overlaps(box, boxOf(t)))) ??
        tries[0] ?? [x, y];
      taken.push(boxOf(spot));
      site.label.style.transform = `translate(${Math.round(spot[0])}px, ${Math.round(spot[1])}px)`;
    }
    onScreen = shown;
  };
  if (view) view.scene.onAfterRender = placeLabels;

  /* Choosing a landing. */
  let chosen: Site | null = null;

  const setMarker = (site: Site, isChosen: boolean): void => {
    if (!moon || !site.landing) return;
    site.removeMarker?.();
    site.removeMarker = moon.addMarker(
      site.landing.latitude,
      site.landing.longitude,
      // The chosen place is drawn as the lunar module's color in a white ring.
      isChosen ? { style: 'dot', color: COLORS.other } : { style: 'ring' },
    );
  };

  const describeCanvas = (): void => {
    const ready = sites.filter((s) => s.landing).length;
    const which = chosen ? ` ${chosen.name} is chosen.` : '';
    canvas.setAttribute(
      'aria-label',
      `The Moon, with a ring at each of ${ready} Apollo landing sites.${which}`,
    );
  };

  const fact = (list: HTMLDListElement, term: string, ...lines: string[]): void => {
    const row = el('div', 'ls__fact');
    const dd = el('dd');
    lines.forEach((line, i) => dd.append(...(i > 0 ? [el('br'), line] : [line])));
    row.append(el('dt', undefined, term), dd);
    list.append(row);
  };

  const showCard = (site: Site): void => {
    const { bundle, landing } = site;
    if (!bundle || !landing) return;
    const mission = bundle.mission;
    const event = landing.event;
    const heading = el('h3', 'extra-heading ls__name', site.name);
    heading.id = `ls-name-${site.id}`;
    card.setAttribute('aria-labelledby', heading.id);
    const dates = el(
      'p',
      'ls__dates',
      site.summary ? summaryDates(site.summary) : missionDates(mission),
    );
    const blurb = el(
      'p',
      'extra-text ls__blurb',
      site.summary?.blurb ?? mission.summary.text.short,
    );
    const facts = el('dl', 'ls__facts');
    fact(
      facts,
      'Where it landed',
      `${formatLatitude(landing.latitude)}, ${formatLongitude(landing.longitude)}`,
    );
    if (event) {
      const lines = [`${elapsedInWords(event.elapsed)} after liftoff, on the mission clock`];
      if (event.utc) lines.push(utcInWords(event.utc));
      fact(facts, 'When it landed', ...lines);
    }
    const open = button('button button--primary', `Open ${site.name} at the landing`);
    open.addEventListener(
      'click',
      () =>
        context.openMission(site.id, event ? { event: event.id, view: 'moon' } : { view: 'moon' }),
      { signal },
    );
    const actions = el('div', 'extra-actions');
    actions.append(open);
    const citations: Citation[] = [
      ...mission.summary.citations,
      ...(mission.launch?.citations ?? []),
      ...(mission.duration?.citations ?? []),
      ...landing.placeCitations,
      ...(event?.citations ?? []),
    ];
    const notes = unique([
      mission.summary.discrepancy,
      mission.launch?.discrepancy,
      mission.duration?.discrepancy,
      ...landing.placeNotes,
      event?.discrepancy,
    ]);
    card.replaceChildren(heading, dates, blurb, facts, actions, sourcesBlock(citations, ...notes));
    card.hidden = false;
  };

  /**
   * "visitor": turn the place toward the viewer and say so to screen readers.
   * "address": the address named it; face it at once, without motion.
   * "first": the first landing to arrive; nothing turns.
   */
  const choose = (site: Site, how: 'visitor' | 'address' | 'first'): void => {
    if (!site.landing) return;
    const previous = chosen;
    chosen = site;
    for (const s of sites) s.choice.setAttribute('aria-pressed', String(s === site));
    for (const s of sites) s.label.classList.toggle('is-chosen', s === site);
    if (previous && previous !== site) setMarker(previous, false);
    if (previous !== site) setMarker(site, true);
    if (view && moon && how !== 'first') {
      const toward = view.camera.position.clone().sub(view.controls.target).normalize();
      void moon.turnTo(
        site.landing.latitude,
        site.landing.longitude,
        toward,
        how === 'visitor' ? TURN_SECONDS : 0,
      );
    }
    showCard(site);
    describeCanvas();
    if (how === 'visitor') {
      context.announce(
        `${site.name}. It landed at ${formatLatitude(site.landing.latitude)}, ${formatLongitude(site.landing.longitude)}.`,
      );
    }
  };

  for (const site of sites)
    site.choice.addEventListener('click', () => choose(site, 'visitor'), { signal });

  // A tap (not a drag) near a ring chooses it.
  let down: { x: number; y: number; time: number } | null = null;
  canvas.addEventListener(
    'pointerdown',
    (e) => (down = { x: e.offsetX, y: e.offsetY, time: performance.now() }),
    { signal },
  );
  canvas.addEventListener(
    'pointerup',
    (e) => {
      const start = down;
      down = null;
      if (
        !start ||
        Math.hypot(e.offsetX - start.x, e.offsetY - start.y) > 8 ||
        performance.now() - start.time > 600
      )
        return;
      let best: Site | null = null;
      let bestDistance = TAP_RADIUS;
      for (const { site, x, y } of onScreen) {
        const distance = Math.hypot(e.offsetX - x, e.offsetY - y);
        if (distance < bestDistance) {
          best = site;
          bestDistance = distance;
        }
      }
      if (best) choose(best, 'visitor');
    },
    { signal },
  );
  canvas.addEventListener('pointercancel', () => (down = null), { signal });

  /* Loading: one mission after another, each ring shown as it arrives. */
  // Only an address that names a landing picks it (the mission behind the sheet may just be the default).
  const named = sites.find((s) => s.id === params.get('mission'))?.id;
  const showMeantToLand = (bundle: MissionBundle): void => {
    const summary = summaryOf(MEANT_TO_LAND);
    const text = summary?.blurb ?? bundle.mission.summary.text.short;
    // Only if the story itself says this flight was meant to land.
    if (!/\bland/i.test(text)) return;
    const name = summary?.name ?? bundle.mission.name;
    const line = el('p', 'extra-note ls__meant-text', text);
    const open = button('button button--quiet', `Open ${name}`);
    open.addEventListener('click', () => context.openMission(MEANT_TO_LAND), { signal });
    const actions = el('div', 'extra-actions');
    actions.append(open);
    meant.replaceChildren(
      line,
      actions,
      sourcesBlock(bundle.mission.summary.citations, bundle.mission.summary.discrepancy),
    );
    meant.hidden = false;
  };

  void (async () => {
    const failed: string[] = [];
    let ready = 0;
    for (const site of sites) {
      status.textContent = `Loading the landings: ${ready} of ${sites.length} ready…`;
      try {
        const bundle = await context.loadBundle(site.id);
        if (signal.aborted) return;
        const landing = landingOf(bundle);
        if (!landing) throw new Error(`${site.id}: no lunar module landing in its flight plan`);
        site.bundle = bundle;
        site.landing = landing;
        site.choice.disabled = false;
        setMarker(site, false);
        ready += 1;
        describeCanvas();
        if (site.id === named) choose(site, 'address');
        else if (!chosen && !named) choose(site, 'first');
        view?.requestRender();
      } catch (error) {
        if (signal.aborted) return;
        console.warn(error);
        failed.push(site.name);
      }
    }
    if (!chosen) {
      const first = sites.find((s) => s.landing);
      if (first) choose(first, 'first');
    }
    if (failed.length > 0) {
      status.textContent = `${failed.join(' and ')} could not be loaded. The other landings are shown.`;
      context.announce(status.textContent);
    } else {
      status.hidden = true;
    }
    try {
      const bundle = await context.loadBundle(MEANT_TO_LAND);
      if (!signal.aborted) showMeantToLand(bundle);
    } catch (error) {
      // The note about Apollo 13 is a welcome extra; without it the six landings stand.
      if (!signal.aborted) console.warn(error);
    }
  })();

  describeCanvas();

  return {
    dispose() {
      if (view) {
        view.scene.onAfterRender = () => undefined;
        view.controls.removeEventListener('change', light);
      }
      if (moon) {
        view?.scene.remove(moon.root);
        moon.dispose();
      }
      view?.dispose();
      moon = null;
      view = null;
    },
  };
}

export const extra: Extra = { meta, mount };
