#!/usr/bin/env node
/**
 * Drive Mission to the Moon in headless Chrome and record what it draws:
 * every frame, a timeline of the interface and the scene every 100 ms, and
 * the camera's pose every frame. Chrome draws with software WebGL, so no GPU
 * is needed. No packages: it talks to Chrome over the DevTools protocol with
 * Node's built-in WebSocket (Node 22 or later).
 *
 * record.mjs uses this for whole recordings. Run it directly for anything
 * record.mjs does not drive:
 *
 *   node .claude/skills/animation-review/scripts/cast.mjs <url> [options] --step STEP ...
 *
 * Options: --size WxH (default 1440x900), --dpr N, --mobile, --desktop,
 * --reduced-motion, --no-webgl, --timeout MS (longest wait for one step,
 * default 30000), --out PATH (a screenshot after the steps), --fail-on-error.
 * Each --step is one step, run in order; nothing is ever split, so a step may
 * hold any JavaScript. Every step is described in
 * .claude/skills/animation-review/references/cast-steps.md, and briefly by --help.
 *
 * The timeline and camera columns are described in
 * .claude/skills/animation-review/references/recording-files.md.
 *
 * window.stage (the Stage, with its private fields) exists only in a
 * development build, so run this against the dev server.
 */
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/**
 * The dev server record.mjs and pace.mjs open (BASE, default http://localhost:5199).
 * cast.mjs itself opens the whole URL it is given.
 */
export const BASE = (process.env.BASE ?? 'http://localhost:5199').replace(/\/$/, '');

export const sleep = (ms) => new Promise((done) => setTimeout(done, Math.max(0, ms)));

/* ------------------------------------------------------------------ */
/* What the probe writes                                               */
/* ------------------------------------------------------------------ */

/** Columns of timeline.tsv: one row every 100 ms (see references/recording-files.md). */
export const TIMELINE_COLUMNS = [
  't',
  'clock',
  'story',
  'playing',
  'speed',
  'pace',
  'view',
  'scale',
  'ff',
  'fastview',
  'tween',
  'usermoved',
  'followed',
  'counter',
  'button',
  'play',
  'card',
  'ending',
  'clear',
  'dock',
  'ships',
  'left',
  'labels',
  'classes',
  'glide',
  'laps',
  'fflaps',
  'shown',
];

/** Columns of camera.tsv: one row every frame the page runs (see references/recording-files.md). */
export const CAMERA_COLUMNS = [
  't',
  'clock',
  'story',
  'playing',
  'speed',
  'view',
  'followed',
  'tween',
  'usermoved',
  'fastview',
  'fade',
  'ff',
  'laps',
  'near',
  'ed',
  'ex',
  'ey',
  'er',
  'md',
  'mx',
  'my',
  'mr',
  'sx',
  'sy',
  'occluded',
  'tilt',
  'tiltw',
  'fx',
  'fy',
  'fz',
  'ux',
  'uy',
  'uz',
  'w',
  'h',
  'standin',
  'glide',
  'dx',
  'dy',
  'doccluded',
  'dux',
  'duy',
  'duz',
  'ring',
  'shown',
  'dissolve',
];

/**
 * Installed in the page. It reads the scene through window.stage and
 * window.__missionScene, and the interface through the DOM, and never changes
 * either. Every read tolerates a page that is still loading.
 */
function pageProbe() {
  if (window.__probe) return 'probe: ready';
  const now = () => performance.timeOrigin + performance.now();
  const probe = {
    timeline: [],
    camera: [],
    sampler: 0,
    cameraOn: false,
    errors: [],
    moonRadius: 1737.4 / 6371,
  };
  window.__probe = probe;
  import('/src/content/physical-constants.ts')
    .then((constants) => {
      if (constants.MOON_RADIUS > 0) probe.moonRadius = constants.MOON_RADIUS;
    })
    .catch(() => {});

  const shown = (el) => {
    if (!el || el.getClientRects().length === 0) return false;
    if (el.checkVisibility)
      return el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    const style = getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  };
  const textOf = (selector) => {
    const el = document.querySelector(selector);
    if (!shown(el)) return '-';
    return (el.textContent || '').replace(/\s+/g, ' ').trim() || '-';
  };
  const labelOf = (selector) => {
    const el = document.querySelector(selector);
    return shown(el) ? el.getAttribute('aria-label') || textOf(selector) : '-';
  };
  const fixed = (value, digits) =>
    typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '-';
  // How much of the 3D view shows (the canvas's opacity as drawn): below 1 while the page fades it
  // in on loading, or while a change of view dissolves through it; a cut under it is not a move.
  const pictureShown = () => {
    const canvas = document.querySelector('canvas.stage');
    if (!canvas) return '-';
    const opacity = Number(getComputedStyle(canvas).opacity);
    return fixed(opacity, 3);
  };
  // A craft's box as its centre and size; the clear area as its top left corner and size.
  const centred = (b) =>
    b
      ? `${Math.round(b.x + b.width / 2)},${Math.round(b.y + b.height / 2)},${Math.round(b.width)}x${Math.round(b.height)}`
      : '-';
  const cornered = (b) =>
    b
      ? `${Math.round(b.x)},${Math.round(b.y)},${Math.round(b.width)}x${Math.round(b.height)}`
      : '-';
  const tweening = (s) => Boolean(s.cameraTween && !s.cameraTween.done);
  const attempt = (read, fallback) => {
    try {
      return read();
    } catch {
      return fallback;
    }
  };
  // The Stage, once it exists. Until then window.stage is the <canvas id="stage"> (named access on window).
  const stageOf = () => {
    const s = window.stage;
    return s && s.camera && s.player && s.fastView ? s : null;
  };

  // Laps the craft has flown around the body below it by mission time t, as the scene counts them (see Stage.revolutionsOf).
  const lapsAt = (ship, t) => {
    const times = ship.times;
    const laps = ship.revolutions;
    if (!times || !laps || times.length === 0) return NaN;
    if (t <= times[0]) return laps[0];
    const last = times.length - 1;
    if (t >= times[last]) return laps[last];
    let lo = 0;
    let hi = last;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (times[mid] <= t) lo = mid;
      else hi = mid;
    }
    const u = times[hi] > times[lo] ? (t - times[lo]) / (times[hi] - times[lo]) : 0;
    return laps[lo] + (laps[hi] - laps[lo]) * u;
  };
  // In fast forward a craft's model is a stand-in gliding round its ring, not at its true place (see Stage.updateStandIn).
  // Builds from before the stand-in have no such field: '-' there, read as "no stand-in".
  const standInOf = (ship) => (ship && typeof ship.standIn === 'boolean' ? ship.standIn : null);
  // How opaque a model is drawn: 0 while it is not drawn at all. A ShipModel keeps the fade it last
  // drew with while it is hidden (ShipModel.update returns before setting it), which would read as
  // drawn: under reduced motion in fast forward, and on the frame a hand-back hides it to move it.
  const fadeOf = (model) => {
    if (!model || typeof model.fade !== 'number') return null;
    return model.root && model.root.visible === false ? 0 : model.fade;
  };

  const sample = () => {
    const s = stageOf();
    const report = attempt(() => (window.__missionScene ? window.__missionScene() : null), null);
    const player = s ? s.player : null;
    const states = s && Array.isArray(s.ships) ? s.ships : null;
    // Each craft: the laps its stand-in has glided while it is one, '-' while its model is at its true place.
    const glides = states
      ? states
          .map((ship) => {
            if (!ship.exists) return `${ship.id}:gone`;
            const standIn = standInOf(ship);
            return `${ship.id}:${standIn ? fixed(ship.glide, 5) : '-'}`;
          })
          .join(' ')
      : '-';
    // Each craft: the laps it has really flown (its true place), whatever its model shows.
    const laps = states
      ? states.map((ship) => `${ship.id}:${fixed(lapsAt(ship, player.time), 4)}`).join(' ')
      : '-';
    const ships = report
      ? report.ships
          .map((ship, i) => {
            const state = s?.ships?.[i];
            if (state && !state.exists) return `${ship.id}:gone`;
            const model = s?.fleet?.ships?.[i];
            // Its last fade even while not drawn (`id:-@fade`): check.py's vanish mark reads it.
            const fade = model && typeof model.fade === 'number' ? model.fade : 1;
            const dot = s?.companionMarkers?.[i]?.visible ? '+dot' : '';
            return `${ship.id}:${centred(ship.box)}@${fixed(fade, 2)}${dot}`;
          })
          .join(' ')
      : '-';
    const dock = document.querySelector('#dock');
    const dockBox = shown(dock) ? dock.getBoundingClientRect() : null;
    probe.timeline.push([
      now(),
      report ? fixed(report.time, 0) : '-',
      player ? fixed(player.storyTime, 2) : '-',
      player ? (player.playing ? 1 : 0) : '-',
      player ? fixed(player.speed, 2) : '-',
      s ? attempt(() => fixed(s.missionPace(), 0), '-') : '-',
      report ? report.view : '-',
      report ? report.scaleMode : '-',
      report ? (report.fastForward ? 1 : 0) : '-',
      s ? fixed(s.fastView.level, 2) : '-',
      s ? (tweening(s) ? 1 : 0) : '-',
      s ? (s.userMovedCamera ? 1 : 0) : '-',
      report ? report.followed : '-',
      textOf('[data-testid=tour-count]'),
      textOf('[data-testid=tour-next]'),
      labelOf('#play'),
      textOf('#card-title'),
      shown(document.querySelector('[data-testid=ending]')) ? 1 : 0,
      report ? cornered(report.clear) : '-',
      dockBox ? `${Math.round(dockBox.top)}+${Math.round(dockBox.height)}` : '-',
      ships,
      report
        ? report.leftBehind.map((part) => `${part.part}:${centred(part.box)}`).join(' ') || '-'
        : '-',
      report
        ? report.labels.map((label) => `${label.text}@${fixed(label.opacity, 2)}`).join('; ') || '-'
        : '-',
      (document.body?.className ?? '').replace(/\s+/g, ' ').trim() || '-',
      glides,
      laps,
      s && typeof s.fastForwardLaps === 'number' ? fixed(s.fastForwardLaps, 2) : '-',
      pictureShown(),
    ]);
  };

  /**
   * How far a craft's stand-in is from its ring as drawn (Stage's ship.ringNow, a closed loop of
   * points): the nearest point of the loop in space, then the two points' distance on screen in CSS
   * pixels. NaN when it is no stand-in, has no ring, or either point is behind the camera.
   */
  const offRing = (ship, onScreen, spare) => {
    const ring = ship.ringNow;
    const at = ship.standInPose ? ship.standInPose.position : null;
    if (!standInOf(ship) || !ring || !at || ring.length < 6) return NaN;
    const count = Math.floor(ring.length / 3);
    let best = Infinity;
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let k = 0; k < count; k += 1) {
      const j = (k + 1) % count;
      const ax = ring[3 * k];
      const ay = ring[3 * k + 1];
      const az = ring[3 * k + 2];
      const ex = ring[3 * j] - ax;
      const ey = ring[3 * j + 1] - ay;
      const ez = ring[3 * j + 2] - az;
      const length = ex * ex + ey * ey + ez * ez;
      const u =
        length > 0
          ? Math.max(
              0,
              Math.min(1, ((at.x - ax) * ex + (at.y - ay) * ey + (at.z - az) * ez) / length),
            )
          : 0;
      const px = ax + ex * u;
      const py = ay + ey * u;
      const pz = az + ez * u;
      const d = (at.x - px) ** 2 + (at.y - py) ** 2 + (at.z - pz) ** 2;
      if (d < best) {
        best = d;
        nx = px;
        ny = py;
        nz = pz;
      }
    }
    const from = onScreen(at);
    const to = onScreen(spare.set(nx, ny, nz));
    return from && to ? Math.hypot(from[0] - to[0], from[1] - to[1]) : NaN;
  };

  let scratch = null;
  // `frameMs` is the frame's own timestamp, the one the clock steps by, so rates are not skewed when a callback runs late.
  const cameraRow = (frameMs) => {
    const s = stageOf();
    if (!s) return;
    const c = s.camera;
    c.updateMatrixWorld();
    if (!scratch) {
      const V = c.position.constructor;
      scratch = {
        f: new V(),
        u: new V(),
        r: new V(),
        p: new V(),
        a: new V(),
        d: new V(),
        q: new V(),
      };
    }
    const { f, u, r, p, a, d, q } = scratch;
    c.getWorldDirection(f);
    u.set(0, 1, 0).applyQuaternion(c.quaternion);
    r.set(1, 0, 0).applyQuaternion(c.quaternion);
    const W = s.cssWidth;
    const H = s.cssHeight;
    const tanHalf = Math.tan((c.fov * Math.PI) / 360) / (c.zoom || 1);
    // Where a point is drawn, in CSS pixels, or null when it is behind the camera.
    const onScreen = (point) => {
      if (a.copy(point).sub(c.position).dot(f) <= 0) return null;
      p.copy(point).project(c);
      return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H];
    };
    // A body: the camera's distance from its centre in its radii, its centre on screen, and its radius on screen.
    const disc = (centre, radius) => {
      const distance = c.position.distanceTo(centre);
      const at = onScreen(centre);
      const px =
        distance > radius ? (Math.tan(Math.asin(radius / distance)) / tanHalf) * (H / 2) : NaN;
      return [
        fixed(distance / radius, 4),
        at ? fixed(at[0], 1) : '-',
        at ? fixed(at[1], 1) : '-',
        fixed(px, 1),
      ];
    };
    const ship = s.followed;
    const index = s.ships ? s.ships.indexOf(ship) : -1;
    const model = index >= 0 ? s.fleet?.ships?.[index] : null;
    // Its true place (sx, sy, occluded), which in fast forward races round the body while its model glides.
    const shipAt = ship && ship.exists ? onScreen(ship.position) : null;
    const earthHeight = ship ? ship.position.length() - 1 : Infinity;
    const moonHeight = ship
      ? (ship.position.distanceTo(s.moonCenter) - probe.moonRadius) / probe.moonRadius
      : Infinity;
    const nearMoon = moonHeight < earthHeight;
    let tilt = NaN;
    let weight = NaN;
    if (ship && ship.exists) {
      // The craft's local up (away from the body below it), as the screen shows it: 0 when it points straight up the screen.
      a.copy(ship.position)
        .sub(nearMoon ? s.moonCenter : s.origin)
        .normalize();
      tilt = (Math.atan2(a.dot(r), a.dot(u)) * 180) / Math.PI;
      weight = Math.hypot(a.dot(r), a.dot(u));
    }
    // Where its model is drawn this frame: the stand-in's place in fast forward, or beside its partner
    // in a pair (Stage.modelPlaces, as last drawn); its true place in a build without either.
    const standIn = standInOf(ship);
    const drawnAt =
      ship && ship.exists
        ? (index >= 0 && s.modelPlaces?.[index]) ||
          (standIn && ship.standInPose ? ship.standInPose.position : ship.position)
        : null;
    const drawnOn = drawnAt ? onScreen(drawnAt) : null;
    // Which way from the body's center it is drawn, so degrees round the body can be taken between frames.
    if (drawnAt)
      d.copy(drawnAt)
        .sub(nearMoon ? s.moonCenter : s.origin)
        .normalize();
    const player = s.player;
    probe.camera.push([
      performance.timeOrigin + frameMs,
      fixed(player.time, 1),
      fixed(player.storyTime, 3),
      player.playing ? 1 : 0,
      fixed(player.speed, 3),
      s.viewNow,
      ship ? ship.id : '-',
      tweening(s) ? 1 : 0,
      s.userMovedCamera ? 1 : 0,
      fixed(s.fastView.level, 3),
      fadeOf(model) !== null ? fixed(fadeOf(model), 3) : '-',
      ship ? fixed(ship.fastForward, 3) : '-',
      ship ? fixed(lapsAt(ship, player.time), 5) : '-',
      nearMoon ? 'M' : 'E',
      ...disc(s.origin, 1),
      ...disc(s.moonCenter, probe.moonRadius),
      shipAt ? fixed(shipAt[0], 1) : '-',
      shipAt ? fixed(shipAt[1], 1) : '-',
      ship && ship.exists ? attempt(() => (s.occluded(ship.position) ? 1 : 0), '-') : '-',
      fixed(tilt, 2),
      fixed(weight, 3),
      fixed(f.x, 6),
      fixed(f.y, 6),
      fixed(f.z, 6),
      fixed(u.x, 6),
      fixed(u.y, 6),
      fixed(u.z, 6),
      W,
      H,
      standIn === null ? '-' : standIn ? 1 : 0,
      standIn ? fixed(ship.glide, 6) : '-',
      drawnOn ? fixed(drawnOn[0], 1) : '-',
      drawnOn ? fixed(drawnOn[1], 1) : '-',
      drawnAt ? attempt(() => (s.occluded(drawnAt) ? 1 : 0), '-') : '-',
      drawnAt ? fixed(d.x, 6) : '-',
      drawnAt ? fixed(d.y, 6) : '-',
      drawnAt ? fixed(d.z, 6) : '-',
      standIn ? fixed(offRing(ship, onScreen, q), 1) : '-',
      pictureShown(),
      // A change of view dissolving through a cut (Stage.dissolve): 'out' while the last view
      // fades, 'in' as the new one shows; 'pending' for a view asked for and not framed yet.
      s.dissolve ? s.dissolve.phase : s.pendingView ? 'pending' : '-',
    ]);
  };
  const loop = (frameMs) => {
    if (!probe.cameraOn) return;
    try {
      cameraRow(frameMs);
    } catch (error) {
      if (probe.errors.length < 5) probe.errors.push(`camera: ${error}`);
    }
    requestAnimationFrame(loop);
  };

  probe.startTimeline = (ms) => {
    clearInterval(probe.sampler);
    probe.timeline = [];
    probe.sampler = setInterval(() => {
      try {
        sample();
      } catch (error) {
        if (probe.errors.length < 5) probe.errors.push(`timeline: ${error}`);
      }
    }, ms);
  };
  probe.startCamera = () => {
    probe.camera = [];
    if (probe.cameraOn) return;
    probe.cameraOn = true;
    requestAnimationFrame(loop);
  };
  probe.take = () => {
    clearInterval(probe.sampler);
    probe.cameraOn = false;
    const taken = { timeline: probe.timeline, camera: probe.camera, errors: probe.errors };
    probe.timeline = [];
    probe.camera = [];
    probe.errors = [];
    return taken;
  };
  // What record.mjs and the rest/tourstop steps wait on.
  probe.state = () => {
    const s = stageOf();
    const player = s ? s.player : null;
    const counter = textOf('[data-testid=tour-count]');
    const stop = /Stop (\d+) of (\d+)/.exec(counter);
    const button = textOf('[data-testid=tour-next]');
    const c = s ? s.camera : null;
    return {
      ready: Boolean(document.body?.classList.contains('is-ready') && window.__missionScene),
      stop: stop ? Number(stop[1]) : null,
      stops: stop ? Number(stop[2]) : null,
      // Not yet at rest at its stop: on a trip, or holding on and then playing the stop's own
      // action, when the counter already names the stop and only the button (Skip) says so.
      onTheWay: /On the way/.test(counter) || /Skip/.test(button),
      button,
      ending: shown(document.querySelector('[data-testid=ending]')),
      card: textOf('#card-title'),
      view: s ? s.viewNow : null,
      playing: player ? player.playing : false,
      clock: player ? player.time : null,
      story: player ? player.storyTime : null,
      tween: s ? tweening(s) : false,
      pending: s ? Boolean(s.pendingView) : false,
      fast: s ? s.fastView.level : 0,
      pose: c
        ? [
            c.position.x,
            c.position.y,
            c.position.z,
            c.quaternion.x,
            c.quaternion.y,
            c.quaternion.z,
            c.quaternion.w,
          ]
        : null,
    };
  };
  return 'probe: installed';
}

export const PROBE_SOURCE = `(${pageProbe.toString()})()`;

/** True when two camera poses from probe.state() are the same to well under a pixel. */
export function samePose(a, b) {
  if (!a || !b) return false;
  const scale = Math.max(1e-6, Math.hypot(a[0], a[1], a[2]));
  for (let i = 0; i < 3; i += 1) if (Math.abs(a[i] - b[i]) > 1e-6 * scale) return false;
  for (let i = 3; i < 7; i += 1) if (Math.abs(a[i] - b[i]) > 1e-6) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Arguments                                                           */
/* ------------------------------------------------------------------ */

export function parseSize(text) {
  const match = /^(\d+)x(\d+)$/.exec(text);
  if (!match) throw new Error('--size must look like 390x844');
  return { width: Number(match[1]), height: Number(match[2]) };
}

function parseArgs(argv) {
  const options = {
    url: null,
    width: 1440,
    height: 900,
    dpr: 1,
    mobile: null,
    reducedMotion: false,
    webgl: true,
    timeout: 30000,
    out: null,
    steps: [],
    failOnError: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      return value;
    };
    switch (arg) {
      case '--size':
        Object.assign(options, parseSize(next()));
        break;
      case '--out':
        options.out = next();
        break;
      case '--dpr':
        options.dpr = Number(next());
        break;
      case '--mobile':
        options.mobile = true;
        break;
      case '--desktop':
        options.mobile = false;
        break;
      case '--reduced-motion':
        options.reducedMotion = true;
        break;
      case '--no-webgl':
        options.webgl = false;
        break;
      case '--timeout':
        options.timeout = Number(next());
        break;
      case '--step':
        options.steps.push(next());
        break;
      case '--fail-on-error':
        options.failOnError = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}`);
        options.url = arg;
    }
  }
  if (options.mobile === null) options.mobile = options.width < 600;
  return options;
}

/* ------------------------------------------------------------------ */
/* Chrome and the DevTools protocol                                     */
/* ------------------------------------------------------------------ */

async function launchChrome(options) {
  const profile = await mkdtemp(join(tmpdir(), 'mttm-chrome-'));
  const args = [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-component-update',
    '--hide-scrollbars',
    '--mute-audio',
    '--force-color-profile=srgb',
    `--window-size=${options.width},${options.height}`,
  ];
  if (options.webgl) {
    // Software WebGL, so it works without a GPU.
    args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist');
  } else {
    args.push('--disable-3d-apis', '--disable-webgl');
  }
  args.push('about:blank');

  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((resolveEndpoint, reject) => {
    let buffer = '';
    const timer = setTimeout(() => reject(new Error('Chrome did not start in time')), 15000);
    chrome.stderr.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(buffer);
      if (match) {
        clearTimeout(timer);
        resolveEndpoint(match[1]);
      }
    });
    chrome.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    chrome.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited early (code ${code})`));
    });
  });

  const close = async () => {
    if (chrome.exitCode === null) {
      chrome.kill('SIGTERM');
      await new Promise((done) => {
        const timer = setTimeout(() => {
          chrome.kill('SIGKILL');
          done();
        }, 3000);
        chrome.once('exit', () => {
          clearTimeout(timer);
          done();
        });
      });
    }
    await rm(profile, { recursive: true, force: true });
  };
  return { endpoint, close };
}

/** A minimal DevTools protocol client over one browser WebSocket. */
async function connect(endpoint) {
  const socket = new WebSocket(endpoint);
  await new Promise((done, fail) => {
    socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', () => fail(new Error('Could not connect to Chrome')), {
      once: true,
    });
  });
  let nextId = 1;
  const pending = new Map();
  const handlers = new Set();
  socket.addEventListener('message', (message) => {
    const data = JSON.parse(String(message.data));
    if (data.id !== undefined && pending.has(data.id)) {
      const { resolve: done, reject: fail } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) fail(new Error(`${data.error.message} ${data.error.data ?? ''}`.trim()));
      else done(data.result);
    } else if (data.method) {
      for (const handler of handlers) handler(data);
    }
  });
  return {
    send(method, params = {}, sessionId) {
      const id = nextId++;
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      socket.send(JSON.stringify(payload));
      return new Promise((done, fail) => pending.set(id, { resolve: done, reject: fail }));
    },
    on(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    close() {
      socket.close();
    },
  };
}

/* ------------------------------------------------------------------ */
/* The page and its steps                                              */
/* ------------------------------------------------------------------ */

const KEYS = {
  Tab: { code: 'Tab', keyCode: 9 },
  Enter: { code: 'Enter', keyCode: 13, text: '\r' },
  Space: { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
  Escape: { code: 'Escape', keyCode: 27 },
  ArrowLeft: { code: 'ArrowLeft', keyCode: 37 },
  ArrowUp: { code: 'ArrowUp', keyCode: 38 },
  ArrowRight: { code: 'ArrowRight', keyCode: 39 },
  ArrowDown: { code: 'ArrowDown', keyCode: 40 },
  PageUp: { code: 'PageUp', keyCode: 33 },
  PageDown: { code: 'PageDown', keyCode: 34 },
  Home: { code: 'Home', keyCode: 36 },
  End: { code: 'End', keyCode: 35 },
};

/** The buttons `press:NAME` clicks. */
export const BUTTONS = {
  next: '[data-testid=tour-next]',
  skip: '[data-testid=tour-next]',
  back: '[data-testid=tour-back]',
  exit: '[data-testid=tour-exit]',
  again: '[data-testid=ending-again]',
  play: '#play',
  pause: '#play',
  controls: '#controls-toggle',
  'event-next': '#event-next',
  'event-previous': '#event-previous',
  scale: '#scale-toggle',
};

export const STEP_HELP = `Steps (each --step is one step; see references/cast-steps.md):
  wait:MS                 wait
  waitfor:SELECTOR        wait until an element is visible
  waituntil:JS            wait until a JavaScript expression is truthy
  assert:JS               stop with an error unless the expression is truthy
  click:SELECTOR          click the first visible match
  press:NAME              click a named button: ${Object.keys(BUTTONS).join(', ')}
  key:KEY                 press a key (Tab, Enter, Space, Escape, arrows, Page/Home/End, a character)
  drag:X1,Y1,X2,Y2[,MS]   drag with the left button over MS (default 300)
  wheel:X,Y,DY            one scroll-wheel step
  eval:JS                 evaluate in the page (awaits promises) and print the result
  shot:PATH               save a screenshot (device pixels)
  stall:MS                block the page's main thread for MS: a deliberate slow frame
  tourstop:N              drive the tour until it rests at stop N (fails loudly if it cannot)
  rest:MS[,MAX]           wait until the clock, the tour and the camera have been still for MS
  clock:T[,MAX]           wait until the mission clock reaches T (seconds or HHH:MM:SS)
  story:S[,MAX]           wait until the story clock reaches S seconds
  probe                   install the in-page probe (timeline, camera, state)
  cast:DIR                start keeping every frame the page draws
  mark                    time zero for frames, timeline and camera log
  timeline[:MS]           start sampling the interface and scene every MS (default 100)
  camera                  start logging the camera every frame
  uncast                  stop keeping frames and write them to DIR/pNNNNN.jpg (ms after the mark)
  save:DIR                stop the timeline and camera log; write DIR/timeline.tsv and DIR/camera.tsv`;

/** Mission seconds from "HHH:MM:SS" or plain seconds. */
export function missionSeconds(text) {
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  const negative = text.trim().startsWith('-');
  const [h = 0, m = 0, s = 0] = text.replace('-', '').split(':').map(Number);
  const total = h * 3600 + m * 60 + s;
  return negative ? -total : total;
}

function makePage(cdp, sessionId, options) {
  const send = (method, params) => cdp.send(method, params, sessionId);
  const cast = { dir: null, frames: [], stop: null };
  let markMs = null;

  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ?? result.exceptionDetails.text,
      );
    }
    return result.result.value;
  };

  const waitFor = async (check, what, timeout = options.timeout) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await check()) return;
      await sleep(100);
    }
    throw new Error(`Timed out waiting for ${what}`);
  };

  const visibleCenter = (selector) =>
    evaluate(`(() => {
      for (const el of document.querySelectorAll(${JSON.stringify(selector)})) {
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (box.width > 0 && box.height > 0 && style.visibility !== 'hidden') {
          return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
        }
      }
      return null;
    })()`);

  const screenshot = async (path) => {
    const { data } = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    const file = resolve(path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, Buffer.from(data, 'base64'));
    console.log(`Saved ${path}`);
  };

  const press = async (combo) => {
    const parts = combo.split('+');
    const name = parts.pop();
    const shift = parts.includes('Shift');
    const spec = KEYS[name] ?? {
      code: `Key${name.toUpperCase()}`,
      keyCode: name.toUpperCase().charCodeAt(0),
      text: name,
    };
    const key = spec.key ?? name;
    const modifiers = shift ? 8 : 0;
    const base = {
      key,
      code: spec.code,
      windowsVirtualKeyCode: spec.keyCode,
      nativeVirtualKeyCode: spec.keyCode,
      modifiers,
    };
    const down = spec.text
      ? { ...base, type: 'keyDown', text: spec.text, unmodifiedText: spec.text }
      : { ...base, type: 'rawKeyDown' };
    await send('Input.dispatchKeyEvent', down);
    await send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
  };

  const click = async (selector) => {
    let point = null;
    await waitFor(async () => (point = await visibleCenter(selector)) !== null, selector);
    const at = { x: point.x, y: point.y, button: 'left', clickCount: 1 };
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at });
  };

  const installProbe = () => evaluate(PROBE_SOURCE);
  /** What the page is doing now (see probe.state); installs the probe first if a new page lacks it. */
  const state = async () => {
    const now = await evaluate('window.__probe ? window.__probe.state() : null');
    if (now) return now;
    await installProbe();
    return evaluate('window.__probe.state()');
  };

  /** Wait until the clock, the tour and the camera have been still for `ms`, at most `max`. Returns true if they were. */
  const waitForRest = async (ms, max) => {
    const deadline = Date.now() + max;
    let since = null;
    let last = null;
    while (Date.now() < deadline) {
      const now = await state();
      const still =
        now.ready &&
        !now.playing &&
        !now.tween &&
        !now.pending &&
        now.fast < 0.001 &&
        !now.onTheWay &&
        samePose(now.pose, last);
      last = now.pose;
      if (still) {
        since ??= Date.now();
        if (Date.now() - since >= ms) return true;
      } else {
        since = null;
      }
      await sleep(100);
    }
    return false;
  };

  /** Press Next, Skip or Back until the tour rests at stop `n`. */
  const tourStop = async (n) => {
    const deadline = Date.now() + Math.max(options.timeout, 25000 * n);
    let pressedAt = 0;
    while (Date.now() < deadline) {
      const now = await state();
      if (now.stop === null) {
        await sleep(200);
        continue;
      }
      if (n < 1 || n > now.stops) throw new Error(`tourstop:${n}: the tour has ${now.stops} stops`);
      const sincePress = Date.now() - pressedAt;
      if (now.stop === n && !now.onTheWay && !now.playing) {
        if (await waitForRest(800, 8000)) {
          const settled = await state();
          if (settled.stop === n && !settled.onTheWay) return settled;
        }
        continue;
      }
      if (sincePress < 600) {
        await sleep(100);
        continue;
      }
      // On the way (to any stop): skip to it, once the tour's guard against a double tap has passed.
      if (now.onTheWay) await click(BUTTONS.skip);
      else if (now.stop < n) await click(BUTTONS.next);
      else await click(BUTTONS.back);
      pressedAt = Date.now();
      await sleep(150);
    }
    throw new Error(`tourstop:${n}: the tour did not come to rest at stop ${n}`);
  };

  const waitForClock = async (read, target, max, what) => {
    const deadline = Date.now() + max;
    while (Date.now() < deadline) {
      const now = await state();
      if (now[read] !== null && now[read] >= target) return true;
      await sleep(50);
    }
    console.log(`${what}: not reached in ${max} ms`);
    return false;
  };

  const startCast = async (dir) => {
    cast.dir = resolve(dir);
    await rm(cast.dir, { recursive: true, force: true });
    await mkdir(cast.dir, { recursive: true });
    cast.frames = [];
    cast.stop?.();
    cast.stop = cdp.on((event) => {
      if (event.sessionId !== sessionId || event.method !== 'Page.screencastFrame') return;
      const { data, metadata, sessionId: frameSession } = event.params;
      send('Page.screencastFrameAck', { sessionId: frameSession }).catch(() => {});
      cast.frames.push({ ms: metadata.timestamp * 1000, data });
    });
    // Chrome casts in CSS pixels whatever the device pixel ratio (a phone at --dpr 2 casts 390x844,
    // its screenshots are 780x1688); sheets.py scales by each frame's own size, so crops agree.
    await send('Page.startScreencast', { format: 'jpeg', quality: 85, everyNthFrame: 1 });
  };

  const stopCast = async () => {
    await send('Page.stopScreencast').catch(() => {});
    cast.stop?.();
    cast.stop = null;
    const zero = markMs ?? cast.frames[0]?.ms ?? 0;
    for (const frame of cast.frames) {
      const ms = Math.round(frame.ms - zero);
      const name = `${ms < 0 ? 'm' : 'p'}${String(Math.abs(ms)).padStart(5, '0')}.jpg`;
      await writeFile(join(cast.dir, name), Buffer.from(frame.data, 'base64'));
    }
    const count = cast.frames.length;
    cast.frames = [];
    return { dir: cast.dir, count };
  };

  /** Stop the probe and write timeline.tsv and camera.tsv, with times in seconds after the mark. */
  const saveProbe = async (dir) => {
    const taken = await evaluate('window.__probe ? window.__probe.take() : null');
    if (!taken) throw new Error('save: no probe in the page (run timeline or camera first)');
    const zero = markMs ?? taken.timeline[0]?.[0] ?? taken.camera[0]?.[0] ?? 0;
    const toText = (columns, rows, digits) =>
      `${columns.join('\t')}\n${rows
        .map((row) => [((row[0] - zero) / 1000).toFixed(digits), ...row.slice(1)].join('\t'))
        .join('\n')}\n`;
    const folder = resolve(dir);
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, 'timeline.tsv'), toText(TIMELINE_COLUMNS, taken.timeline, 2));
    await writeFile(join(folder, 'camera.tsv'), toText(CAMERA_COLUMNS, taken.camera, 3));
    for (const error of taken.errors) console.log(`probe error: ${error}`);
    return { timeline: taken.timeline.length, camera: taken.camera.length };
  };

  const runStep = async (step) => {
    const colon = step.indexOf(':');
    const kind = colon === -1 ? step : step.slice(0, colon);
    const arg = colon === -1 ? '' : step.slice(colon + 1);
    const limits = () => arg.split(',').map((part) => part.trim());
    switch (kind) {
      case 'wait':
        await sleep(Number(arg) || 0);
        break;
      case 'waitfor':
        await waitFor(async () => (await visibleCenter(arg)) !== null, arg);
        break;
      case 'waituntil':
        await waitFor(async () => Boolean(await evaluate(arg)), arg);
        break;
      case 'assert': {
        const value = await evaluate(arg);
        if (!value) throw new Error(`assert failed: ${arg} (got ${JSON.stringify(value)})`);
        break;
      }
      case 'click':
        await click(arg);
        break;
      case 'press': {
        const selector = BUTTONS[arg];
        if (!selector) throw new Error(`press:${arg}: no such button (${Object.keys(BUTTONS)})`);
        await click(selector);
        break;
      }
      case 'key':
        await press(arg);
        break;
      case 'drag': {
        const [x1, y1, x2, y2, ms = 300] = arg.split(',').map(Number);
        const steps = 12;
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1, y: y1 });
        await send('Input.dispatchMouseEvent', {
          type: 'mousePressed',
          x: x1,
          y: y1,
          button: 'left',
          buttons: 1,
          clickCount: 1,
        });
        for (let k = 1; k <= steps; k += 1) {
          await send('Input.dispatchMouseEvent', {
            type: 'mouseMoved',
            x: x1 + ((x2 - x1) * k) / steps,
            y: y1 + ((y2 - y1) * k) / steps,
            button: 'left',
            buttons: 1,
          });
          await sleep(ms / steps);
        }
        await send('Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          x: x2,
          y: y2,
          button: 'left',
          buttons: 0,
          clickCount: 1,
        });
        break;
      }
      case 'wheel': {
        const [x, y, dy] = arg.split(',').map(Number);
        await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy });
        break;
      }
      case 'eval':
        console.log(`eval: ${JSON.stringify(await evaluate(arg))}`);
        break;
      case 'shot':
        await screenshot(arg);
        break;
      case 'stall':
        await evaluate(
          `(() => { const end = performance.now() + ${Number(arg) || 0}; while (performance.now() < end) {} return true; })()`,
        );
        break;
      case 'tourstop': {
        const at = await tourStop(Number(arg));
        console.log(`tourstop: at stop ${at.stop} of ${at.stops}: ${at.card}`);
        break;
      }
      case 'rest': {
        const [ms = '2000', max = String(options.timeout)] = limits();
        const rested = await waitForRest(Number(ms), Number(max));
        if (!rested) console.log(`rest: still moving after ${max} ms`);
        break;
      }
      case 'clock': {
        const [time, max = String(options.timeout)] = limits();
        await waitForClock('clock', missionSeconds(time), Number(max), step);
        break;
      }
      case 'story': {
        const [seconds, max = String(options.timeout)] = limits();
        await waitForClock('story', Number(seconds), Number(max), step);
        break;
      }
      case 'probe':
        await installProbe();
        break;
      case 'cast':
        await startCast(arg);
        break;
      case 'mark':
        markMs = Date.now();
        console.log(`mark ${markMs}`);
        break;
      case 'timeline':
        await installProbe();
        await evaluate(`window.__probe.startTimeline(${Number(arg) || 100})`);
        break;
      case 'camera':
        await installProbe();
        await evaluate('window.__probe.startCamera()');
        break;
      case 'uncast': {
        const { dir, count } = await stopCast();
        console.log(`cast: ${count} frames in ${dir}`);
        break;
      }
      case 'save': {
        const counts = await saveProbe(arg);
        console.log(
          `save: ${counts.timeline} timeline rows, ${counts.camera} camera rows in ${arg}`,
        );
        break;
      }
      default:
        throw new Error(`Unknown step "${step}"`);
    }
  };

  return {
    send,
    evaluate,
    screenshot,
    runStep,
    state,
    waitForRest,
    installProbe,
    get markMs() {
      return markMs;
    },
    set markMs(value) {
      markMs = value;
    },
  };
}

/**
 * Start Chrome with one page, emulating the screen in `options` (width,
 * height, dpr, mobile, reducedMotion, webgl, timeout). Returns the page, the
 * console errors it has logged so far, navigate(url), and close().
 */
export async function openBrowser(options) {
  const settings = {
    width: 1440,
    height: 900,
    dpr: 1,
    reducedMotion: false,
    webgl: true,
    timeout: 30000,
    ...options,
  };
  settings.mobile ??= settings.width < 600;
  const chrome = await launchChrome(settings);
  const cdp = await connect(chrome.endpoint);
  const errors = [];
  try {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const page = makePage(cdp, sessionId, settings);
    cdp.on((event) => {
      if (event.sessionId !== sessionId) return;
      const { method, params } = event;
      if (
        method === 'Runtime.consoleAPICalled' &&
        (params.type === 'error' || params.type === 'assert')
      ) {
        errors.push(
          `console.${params.type}: ${params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`,
        );
      } else if (method === 'Runtime.exceptionThrown') {
        const details = params.exceptionDetails;
        errors.push(`exception: ${details.exception?.description ?? details.text}`);
      } else if (method === 'Log.entryAdded' && params.entry.level === 'error') {
        errors.push(
          `${params.entry.source}: ${params.entry.text}${params.entry.url ? ` (${params.entry.url})` : ''}`,
        );
      }
    });
    await page.send('Runtime.enable');
    await page.send('Log.enable');
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: settings.width,
      height: settings.height,
      deviceScaleFactor: settings.dpr,
      mobile: settings.mobile,
    });
    if (settings.mobile) {
      await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    }
    await page.send('Emulation.setEmulatedMedia', {
      features: [
        {
          name: 'prefers-reduced-motion',
          value: settings.reducedMotion ? 'reduce' : 'no-preference',
        },
      ],
    });

    /**
     * Load an address and wait for its load event. With `probeFromStart`, the
     * probe is in the page before any of its scripts run, already sampling.
     */
    const navigate = async (url, { probeFromStart = false } = {}) => {
      let injected = null;
      if (probeFromStart) {
        const source = `${PROBE_SOURCE}; window.__probe.startTimeline(100); window.__probe.startCamera();`;
        ({ identifier: injected } = await page.send('Page.addScriptToEvaluateOnNewDocument', {
          source,
        }));
      }
      const loaded = new Promise((done) => {
        const stop = cdp.on((event) => {
          if (event.sessionId === sessionId && event.method === 'Page.loadEventFired') {
            stop();
            done();
          }
        });
      });
      await page.send('Page.navigate', { url });
      await Promise.race([loaded, sleep(settings.timeout)]);
      if (injected)
        await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injected });
    };

    const close = async () => {
      cdp.close();
      await chrome.close();
    };
    return { page, errors, navigate, close, settings };
  } catch (error) {
    cdp.close();
    await chrome.close();
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Command line                                                        */
/* ------------------------------------------------------------------ */

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.url) {
    console.log(
      'Usage: node .claude/skills/animation-review/scripts/cast.mjs <url> [--size WxH] [--dpr N] [--mobile] [--reduced-motion] [--out PATH] --step STEP ...',
    );
    console.log(STEP_HELP);
    process.exit(options.help ? 0 : 2);
  }

  const browser = await openBrowser(options);
  let failed = false;
  try {
    await browser.navigate(options.url);
    for (const step of options.steps) {
      await browser.page.runStep(step);
    }
    if (options.out) await browser.page.screenshot(options.out);
  } catch (error) {
    failed = true;
    console.error(`Error: ${error.message}`);
  } finally {
    await browser.close();
  }

  if (browser.errors.length) {
    console.log(`Console errors (${browser.errors.length}):`);
    for (const error of browser.errors) console.log(`  ${error}`);
  } else {
    console.log('Console errors: none');
  }
  if (failed || (options.failOnError && browser.errors.length)) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
