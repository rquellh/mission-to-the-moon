#!/usr/bin/env node
/**
 * Record how a flight plays, the way a visitor sees it, and check it.
 *
 *   node .claude/skills/animation-review/scripts/record.mjs tour <mission> <stop|start|all> --out DIR [options]
 *   node .claude/skills/animation-review/scripts/record.mjs explore <mission> <event|t=HHH:MM:SS|all> <view|-> --out DIR [options]
 *   node .claude/skills/animation-review/scripts/record.mjs page <url> --out DIR [options]
 *
 * tour <stop>     the tour rests at <stop> (counting from 1); the press (Next) and what follows.
 * tour start      from page load: the tour's opening run-up to stop 1.
 * tour all        the opening and every trip, with one browser, one folder each.
 * explore <at>    Explore paused at an event or a mission time, in a view ("-" for the event's
 *                 own); the press (Play) and what follows.
 * explore all     every event in turn, with one browser, one folder each.
 * page <url>      any address, from page load.
 *
 * Options:
 *   --out DIR          where the recording goes (required)
 *   --size WxH         default 1440x900;  --phone is 390x844 --mobile --dpr 2
 *   --mobile, --dpr N, --reduced-motion     as cast.mjs
 *   --before STEP      a cast.mjs step run before recording starts (at the stop, or once the
 *                      page has settled); repeat for more. One step per flag, never split.
 *   --press STEP       the step that starts it all (default press:next on the tour, press:play
 *                      in Explore; "none" for no press)
 *   --after STEP       a step run after the press; repeat for more
 *   --for S            record exactly S seconds after the press
 *   --rest S           otherwise stop once the clock, the tour and the camera have been still
 *                      this long (default 2)
 *   --overlap S        Explore: also stop this many story seconds past the next event (default 2)
 *   --max S            never longer than this after the press (default 40)
 *   --no-check, --no-sheets     skip check.py or sheets.py afterwards
 *
 * Each folder gets: meta.json (the build stamp and how it was recorded), events.json (the
 * flight's events and story clock), timeline.tsv, camera.tsv, cast/ (every frame), at-start.png,
 * end.png, then check.txt, camera-table.tsv, marks.tsv (check.py) and the sheets (sheets.py).
 * See references/recording-files.md. BASE sets the dev server (default http://localhost:5199).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { availableParallelism, loadavg } from 'node:os';
import { join, resolve } from 'node:path';
import { openBrowser, parseSize, samePose, sleep } from './cast.mjs';

const HERE = import.meta.dirname;
const BASE = (process.env.BASE ?? 'http://localhost:5199').replace(/\/$/, '');

/** Files whose served copy must match this checkout for the recording to describe it. */
const STAMPED_FILES = [
  'src/scene/stage.ts',
  'src/app/tour.ts',
  'src/app/player.ts',
  'src/sim/story-time.ts',
  'src/ui/interface.ts',
];

function usage(message) {
  if (message) console.error(`record.mjs: ${message}`);
  console.error(
    'Usage: record.mjs tour <mission> <stop|start|all> --out DIR [options]\n' +
      '       record.mjs explore <mission> <event|t=HHH:MM:SS|all> <view|-> --out DIR [options]\n' +
      '       record.mjs page <url> --out DIR [options]\n' +
      'See the comment at the top of record.mjs, or references/recording-files.md.',
  );
  process.exit(2);
}

function parseArgs(argv) {
  const options = {
    positional: [],
    out: null,
    width: 1440,
    height: 900,
    dpr: 1,
    mobile: null,
    reducedMotion: false,
    before: [],
    press: null,
    after: [],
    forSeconds: null,
    rest: 2,
    overlap: 2,
    max: 40,
    check: true,
    sheets: true,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) usage(`${arg} needs a value`);
      return value;
    };
    switch (arg) {
      case '--out':
        options.out = resolve(next());
        break;
      case '--size':
        Object.assign(options, parseSize(next()));
        break;
      case '--phone':
        Object.assign(options, { width: 390, height: 844, mobile: true, dpr: 2 });
        break;
      case '--mobile':
        options.mobile = true;
        break;
      case '--dpr':
        options.dpr = Number(next());
        break;
      case '--reduced-motion':
        options.reducedMotion = true;
        break;
      case '--before':
        options.before.push(next());
        break;
      case '--press':
        options.press = next();
        break;
      case '--after':
        options.after.push(next());
        break;
      case '--for':
        options.forSeconds = Number(next());
        break;
      case '--rest':
        options.rest = Number(next());
        break;
      case '--overlap':
        options.overlap = Number(next());
        break;
      case '--max':
        options.max = Number(next());
        break;
      case '--no-check':
        options.check = false;
        break;
      case '--no-sheets':
        options.sheets = false;
        break;
      case '--help':
      case '-h':
        usage();
        break;
      default:
        if (arg.startsWith('--')) usage(`unknown option ${arg}`);
        options.positional.push(arg);
    }
  }
  if (!options.out) usage('--out DIR is required');
  options.mobile ??= options.width < 600;
  return options;
}

/* ------------------------------------------------------------------ */
/* The build stamp                                                     */
/* ------------------------------------------------------------------ */

function git(args) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/** The commit, whether the tree is dirty, and whether the dev server serves this tree at all. */
async function buildStamp(page) {
  const changed = (git(['status', '--porcelain']) ?? '').split('\n').filter(Boolean);
  const local = {};
  for (const file of STAMPED_FILES) {
    try {
      local[file] = createHash('sha256')
        .update(await readFile(file))
        .digest('hex');
    } catch {
      local[file] = null;
    }
  }
  const served = await page.evaluate(`(async () => {
    const out = {};
    for (const file of ${JSON.stringify(STAMPED_FILES)}) {
      try {
        const text = (await import('/' + file + '?raw')).default;
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        out[file] = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch { out[file] = null; }
    }
    return out;
  })()`);
  const differs = STAMPED_FILES.filter((file) => local[file] && served[file] !== local[file]);
  return {
    commit: git(['rev-parse', '--short=10', 'HEAD']),
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    dirty: changed.length,
    changed: changed.slice(0, 20),
    recordedAt: new Date().toISOString(),
    // Other recorders on the machine slow every frame (see SKILL.md).
    load: loadavg()[0],
    cores: availableParallelism(),
    base: BASE,
    checkout: process.cwd(),
    servedMatches: differs.length === 0,
    servedDiffers: differs,
  };
}

/** The flight's events and story clock, built by importing the app's own modules in the page. */
async function flightData(page, mission) {
  return page.evaluate(`(async () => {
    const { loadBundle } = await import('/src/content/missions/index.ts');
    const sim = await import('/src/sim/index.ts');
    const { elapsedToSeconds } = await import('/src/content/types.ts');
    const tour = await import('/src/app/tour.ts');
    const bundle = await loadBundle(${JSON.stringify(mission)});
    const path = sim.buildFlightPath(bundle.flight);
    const times = bundle.mission.events.map((event) => elapsedToSeconds(event.elapsed));
    const story = sim.createStoryTime(sim.storyKeyTimes(path, times));
    // The tour's own stops (see tourStops), or on a build from before tour styles, its key moments.
    const keyMoment = (event) => Boolean(event.keyMoment ?? event.inTour);
    const stops = tour.tourStops
      ? tour.tourStops(bundle.mission)
      : bundle.mission.events.filter(keyMoment);
    return {
      mission: bundle.mission.id,
      duration: story.length,
      keys: story.keyTimes.map((t) => [t, story.toStory(t)]),
      events: bundle.mission.events.map((event, i) => ({
        id: event.id,
        title: event.title,
        seconds: times[i],
        story: story.toStory(times[i]),
        view: event.view,
        keyMoment: keyMoment(event),
        tourStop: stops.includes(event),
      })),
      partings: sim.partingsAtEvents(path, times),
    };
  })()`);
}

/* ------------------------------------------------------------------ */
/* Recording                                                           */
/* ------------------------------------------------------------------ */

function urlFor(kind, mission, at, view) {
  const params = new URLSearchParams({ mission, start: kind });
  if (kind === 'explore') {
    if (at.startsWith('t=')) params.set('t', at.slice(2));
    else params.set('event', at);
    if (view && view !== '-') params.set('view', view);
  }
  return `${BASE}/?${params}`;
}

async function waitUntilReady(page, timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const now = await page.state().catch(() => null);
    if (now?.ready) return now;
    await sleep(200);
  }
  throw new Error('the page did not get ready (is the dev server up at BASE?)');
}

/**
 * Wait for the end of a recording: a fixed length, or the clock, the tour and
 * the camera still for `rest` seconds, or the story clock past `untilStory`,
 * or `max` seconds after the mark.
 */
async function waitForEnd(page, options, untilStory) {
  const markMs = page.markMs;
  if (options.forSeconds !== null) {
    await sleep(markMs + options.forSeconds * 1000 - Date.now());
    return `${options.forSeconds} s, as asked`;
  }
  let since = null;
  let last = null;
  for (;;) {
    const elapsed = (Date.now() - markMs) / 1000;
    if (elapsed >= options.max) return `the longest allowed, ${options.max} s`;
    const now = await page.state();
    if (untilStory !== null && now.story !== null && now.story >= untilStory)
      return `the story clock passed ${untilStory.toFixed(2)} s`;
    const still =
      !now.playing &&
      !now.tween &&
      !now.pending &&
      now.fast < 0.001 &&
      !now.onTheWay &&
      samePose(now.pose, last);
    last = now.pose;
    if (still && elapsed > 1) {
      since ??= Date.now();
      if (Date.now() - since >= options.rest * 1000)
        return `still for ${options.rest} s (from ${((since - markMs) / 1000).toFixed(1)} s)`;
    } else {
      since = null;
    }
    await sleep(100);
  }
}

/** Run the after-steps and wait for the end, with the frames, timeline and camera log kept from the mark. */
async function recordSegment(browser, dir, options, details) {
  const { page } = browser;
  await mkdir(dir, { recursive: true });
  if (!details.fromLoad) {
    await page.screenshot(join(dir, 'at-start.png'));
    // Start a moment before the press, so the recording shows the place it leaves.
    await page.runStep(`cast:${join(dir, 'cast')}`);
    await page.runStep('timeline:100');
    await page.runStep('camera');
    await sleep(400);
    await page.runStep('mark');
  }
  const press = details.press;
  if (press && press !== 'none') await page.runStep(press);
  for (const step of options.after) await page.runStep(step);
  // Where the story clock is now decides Explore's end (an after-step may have moved it).
  const untilStory = details.untilStory ? details.untilStory(await page.state()) : null;
  const ended = await waitForEnd(page, options, untilStory);
  await page.runStep('uncast');
  await page.runStep(`save:${dir}`);
  await page.screenshot(join(dir, 'end.png'));
  const meta = {
    ...details.meta,
    press: press ?? 'none',
    before: options.before,
    after: options.after,
    ended,
    size: { width: options.width, height: options.height },
    dpr: options.dpr,
    mobile: options.mobile,
    reducedMotion: options.reducedMotion,
    stamp: details.stamp,
    consoleErrors: browser.errors.splice(0),
  };
  await writeFile(join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
  await writeFile(join(dir, 'events.json'), `${JSON.stringify(details.flight, null, 2)}\n`);
  console.log(`recorded ${dir} (ended: ${ended})`);
  return meta;
}

/** Folders analysed in this run, for the summary at the end of an `all` run. */
const analysed = [];

/** check.py and sheets.py over one folder. With `quiet`, only check.py's summary is printed. */
function analyse(dir, options, quiet) {
  analysed.push(dir);
  if (options.check) {
    const run = spawnSync(
      'python3',
      [join(HERE, 'check.py'), dir, ...(quiet ? ['--summary'] : [])],
      {
        encoding: 'utf8',
      },
    );
    process.stdout.write(run.stdout ?? '');
    if (run.status !== 0) process.stdout.write(run.stderr ?? '');
  }
  if (options.sheets) {
    const run = spawnSync('python3', [join(HERE, 'sheets.py'), dir, '--auto'], {
      encoding: 'utf8',
    });
    if (run.status !== 0) process.stdout.write(`sheets.py failed:\n${run.stderr}`);
    else process.stdout.write(quiet ? '' : run.stdout);
  }
}

/** After an `all` run: check.py over the whole folder prints one line a recording, each signal's state. */
function summarise(root, options) {
  if (analysed.length < 2 || !options.check) return;
  const run = spawnSync('python3', [join(HERE, 'check.py'), root], { encoding: 'utf8' });
  process.stdout.write(run.stdout ?? '');
  if (run.status !== 0) process.stdout.write(run.stderr ?? '');
}

function warnStamp(stamp) {
  console.log(
    `build: ${stamp.commit ?? '?'} on ${stamp.branch ?? '?'}, ${stamp.dirty ? `${stamp.dirty} changed files` : 'clean'}, ${stamp.recordedAt}`,
  );
  if (!stamp.servedMatches)
    console.log(
      `WARNING: the dev server at ${stamp.base} serves a different copy of ${stamp.servedDiffers.join(', ')} from this checkout (${stamp.checkout}). The recording does not show this tree.`,
    );
  if (stamp.load > stamp.cores)
    console.log(
      `WARNING: the machine is busy (load ${stamp.load.toFixed(0)} on ${stamp.cores} cores). Frames will come slowly, and slow frames change what the scene does; record again when it is quiet before judging.`,
    );
}

/** Settle at a tour stop and say which one; fail loudly if it is not the one asked for. */
async function atStop(page, stop) {
  await page.runStep(`tourstop:${stop}`);
  const now = await page.state();
  if (now.stop !== stop || now.onTheWay)
    throw new Error(`asked to leave from stop ${stop}, but the tour is at stop ${now.stop}`);
  return now;
}

async function tour(browser, options, mission, where) {
  const { page, navigate } = browser;
  const url = urlFor('tour', mission, '', null);
  const fromLoad = where === 'start' || where === 'all';
  const out = options.out;
  const opening = where === 'all' ? join(out, '00-start') : out;

  if (fromLoad) {
    // The opening, from page load: the probe goes in before the page's own scripts.
    await mkdir(opening, { recursive: true });
    await page.runStep(`cast:${join(opening, 'cast')}`);
    page.markMs = Date.now();
    await navigate(url, { probeFromStart: true });
  } else {
    await navigate(url);
  }
  await waitUntilReady(page);
  const stamp = await buildStamp(page);
  const flight = await flightData(page, mission);
  warnStamp(stamp);
  if (fromLoad) {
    await recordSegment(browser, opening, options, {
      fromLoad: true,
      press: 'none',
      stamp,
      flight,
      meta: { mode: 'tour', mission, where: 'start', url },
    });
    analyse(opening, options, where === 'all');
    if (where === 'start') return;
  }

  const stops = flight.events.filter((event) => event.tourStop);
  const from = where === 'all' ? 1 : Number(where);
  const to = where === 'all' ? stops.length : from;
  if (!(from >= 1 && from <= stops.length))
    usage(`the tour of ${mission} has ${stops.length} stops`);
  for (let stop = from; stop <= to; stop += 1) {
    const leaving = await atStop(page, stop);
    for (const step of options.before) await page.runStep(step);
    const check = await page.state();
    if (check.stop !== stop || check.onTheWay)
      throw new Error(`the --before steps moved the tour from stop ${stop} to stop ${check.stop}`);
    const next = stops[stop] ?? null;
    console.log(
      `leaving stop ${stop} of ${stops.length}: ${leaving.card}${next ? ` (next: ${next.title})` : ' (the last stop)'}`,
    );
    const name = next
      ? `${String(stop).padStart(2, '0')}-to-${String(stop + 1).padStart(2, '0')}`
      : `${String(stop).padStart(2, '0')}-finish`;
    const dir = where === 'all' ? join(out, name) : out;
    await recordSegment(browser, dir, options, {
      press: options.press ?? 'press:next',
      stamp,
      flight,
      meta: {
        mode: 'tour',
        mission,
        where: String(stop),
        url,
        leaving: { stop, stops: stops.length, card: leaving.card, next: next?.title ?? null },
      },
    });
    analyse(dir, options, where === 'all');
    // After the last stop's Finish the tour is over; nothing more to reach.
    if (!next) break;
  }
}

async function explore(browser, options, mission, where, view) {
  const { page, navigate } = browser;
  const first = urlFor('explore', mission, where === 'all' ? 't=0:00:00' : where, view);
  await navigate(first);
  await waitUntilReady(page);
  const stamp = await buildStamp(page);
  const flight = await flightData(page, mission);
  warnStamp(stamp);
  const places = where === 'all' ? flight.events.map((event) => event.id) : [where];
  for (const [i, at] of places.entries()) {
    const url = urlFor('explore', mission, at, view);
    if (where === 'all' || i > 0 || url !== first) {
      await navigate(url);
      await waitUntilReady(page);
    }
    // Let the opening framing settle before recording.
    await page.waitForRest(1000, 8000);
    for (const step of options.before) await page.runStep(step);
    const now = await page.state();
    // Explore's natural end: a little past the next event, so each stretch overlaps the next recording.
    const nextAfter = (story) => flight.events.find((event) => event.story > story + 0.05) ?? null;
    const nextEvent = nextAfter(now.story);
    const untilStory = (later) => {
      const upcoming = nextAfter(later.story);
      return upcoming ? upcoming.story + options.overlap : null;
    };
    const dir =
      where === 'all' ? join(options.out, `${String(i + 1).padStart(2, '0')}-${at}`) : options.out;
    console.log(
      `explore at ${at} (clock ${now.clock?.toFixed(0)} s, story ${now.story?.toFixed(2)} s), view ${now.view}; card: ${now.card}`,
    );
    await recordSegment(browser, dir, options, {
      press: options.press ?? 'press:play',
      untilStory,
      stamp,
      flight,
      meta: {
        mode: 'explore',
        mission,
        where: at,
        view: now.view,
        url,
        nextEvent: nextEvent?.id ?? null,
      },
    });
    analyse(dir, options, where === 'all');
  }
}

async function fromAddress(browser, options, url) {
  const { page, navigate } = browser;
  const mission = new URL(url).searchParams.get('mission') ?? 'apollo-11';
  await mkdir(options.out, { recursive: true });
  await page.runStep(`cast:${join(options.out, 'cast')}`);
  page.markMs = Date.now();
  await navigate(url, { probeFromStart: true });
  await waitUntilReady(page);
  const stamp = await buildStamp(page);
  const flight = await flightData(page, mission);
  warnStamp(stamp);
  await recordSegment(browser, options.out, options, {
    fromLoad: true,
    press: options.press ?? 'none',
    stamp,
    flight,
    meta: { mode: 'page', mission, where: 'load', url },
  });
  analyse(options.out, options, false);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [mode, ...rest] = options.positional;
  const browser = await openBrowser({
    width: options.width,
    height: options.height,
    dpr: options.dpr,
    mobile: options.mobile,
    reducedMotion: options.reducedMotion,
  });
  const started = Date.now();
  try {
    if (mode === 'tour' && rest.length === 2) await tour(browser, options, rest[0], rest[1]);
    else if (mode === 'explore' && rest.length === 3)
      await explore(browser, options, rest[0], rest[1], rest[2]);
    else if (mode === 'page' && rest.length === 1) await fromAddress(browser, options, rest[0]);
    else usage(`cannot read "${options.positional.join(' ')}"`);
  } finally {
    await browser.close();
  }
  summarise(options.out, options);
  console.log(`done in ${((Date.now() - started) / 1000).toFixed(0)} s: ${options.out}`);
}

main().catch((error) => {
  console.error(`record.mjs: ${error.message}`);
  process.exit(1);
});
