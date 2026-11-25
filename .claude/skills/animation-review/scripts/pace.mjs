#!/usr/bin/env node
/**
 * The pace of a flight, in numbers, without a single picture: each event's
 * story second; each stretch's mission seconds per story second and how fast
 * every craft laps its body there at Explore's 1x; and each tour trip and
 * run-up, with its top pace and the fastest lapping it shows.
 *
 *   node .claude/skills/animation-review/scripts/pace.mjs <mission> [--json PATH]
 *
 * It loads the mission in headless Chrome from the dev server and imports the
 * app's own modules there (the story clock, the tour's trip rules), and reads
 * each craft's laps from window.stage (development builds only), so the
 * numbers are the ones the app uses. BASE sets the dev server (default
 * http://localhost:5199).
 *
 * Laps per second is the mission seconds the clock covers per real second,
 * divided by the orbit's period. The owner's limit for a drawn craft is about
 * one lap in 8 seconds (0.125 laps/s). The scene's own fast-forward thresholds
 * are read from src/scene/stage.ts as it is now, and printed with the table.
 * The "scene" column follows the pace at each instant; the scene's fade lags
 * a little behind it, so a short fast stretch (a run-up) can still show a
 * drawn craft racing. A recording measures what was actually drawn.
 */
import { writeFile } from 'node:fs/promises';
import { openBrowser, sleep } from './cast.mjs';

const BASE = (process.env.BASE ?? 'http://localhost:5199').replace(/\/$/, '');
const LIMIT = 1 / 8;

/** Runs in the page: everything the tables need. */
async function measure(missionId) {
  const s = window.stage;
  if (!s) throw new Error('window.stage is missing: run against the dev server');
  const { loadBundle } = await import('/src/content/missions/index.ts');
  const sim = await import('/src/sim/index.ts');
  const { elapsedToSeconds } = await import('/src/content/types.ts');
  const tour = await import('/src/app/tour.ts');
  const player = await import('/src/app/player.ts');
  const stageSource = (await import('/src/scene/stage.ts?raw')).default;
  const tourSource = (await import('/src/app/tour.ts?raw')).default;
  const constant = (source, name) => {
    const match = new RegExp(`const ${name} = ([0-9.]+)`).exec(source);
    return match ? Number(match[1]) : null;
  };
  const pace = constant(stageSource, 'FAST_FORWARD_PACE');
  const onset = constant(stageSource, 'FAST_FORWARD_ONSET');
  const leadIn = constant(tourSource, 'DEFAULT_LEAD_IN_SECONDS') ?? 3;

  const bundle = await loadBundle(missionId);
  const path = sim.buildFlightPath(bundle.flight);
  const eventTimes = bundle.mission.events.map((event) => elapsedToSeconds(event.elapsed));
  const story = sim.createStoryTime(sim.storyKeyTimes(path, eventTimes));
  const partings = sim.partingsAtEvents(path, eventTimes);
  const keys = story.keyTimes.map((t) => [t, story.toStory(t)]);

  // Mission seconds per story second at a story time (the stretch's even rate).
  const missionPerStory = (storySeconds) => {
    for (let i = 0; i + 1 < keys.length; i += 1) {
      const [a, sa] = keys[i];
      const [b, sb] = keys[i + 1];
      if (storySeconds <= sb || i + 2 === keys.length) return sb > sa ? (b - a) / (sb - sa) : 0;
    }
    return 0;
  };
  // Laps flown by mission time t, as the scene counts them, and the rate it fades by (see Stage.turnRate).
  const lapsAt = (ship, t) => {
    const times = ship.times;
    const laps = ship.revolutions;
    if (!times || !laps || times.length === 0) return 0;
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
    const u = (t - times[lo]) / (times[hi] - times[lo]);
    return laps[lo] + (laps[hi] - laps[lo]) * u;
  };
  const scratch = [0, 0, 0];
  const exists = (ship, t) => Boolean(s.path.position(ship.id, t, 0, scratch));
  const lapRate = (ship, t) =>
    exists(ship, t) ? Math.max(0, (lapsAt(ship, t + 30) - lapsAt(ship, t - 30)) / 60) : 0;
  const ships = s.ships;

  const events = bundle.mission.events.map((event, i) => ({
    id: event.id,
    title: event.title,
    seconds: eventTimes[i],
    story: story.toStory(eventTimes[i]),
    view: event.view,
    stop: null,
  }));
  let stopNumber = 0;
  for (const [i, event] of bundle.mission.events.entries()) {
    if (event.inTour) events[i].stop = stopNumber += 1;
  }

  // Each stretch between two key times at 1x: the fastest lapping of each craft in it.
  const stretches = [];
  for (let i = 0; i + 1 < keys.length; i += 1) {
    const [a, sa] = keys[i];
    const [b, sb] = keys[i + 1];
    const rate = sb > sa ? (b - a) / (sb - sa) : 0;
    const crafts = ships
      .map((ship) => {
        let top = 0;
        let at = a;
        for (let k = 0; k <= 200; k += 1) {
          const t = a + ((b - a) * k) / 200;
          const laps = lapRate(ship, t) * rate;
          if (laps > top) {
            top = laps;
            at = t;
          }
        }
        return { id: ship.id, laps: top, period: top > 0 ? rate / top : null, at };
      })
      .filter((craft) => craft.laps > 0);
    const mid = (a + b) / 2;
    stretches.push({
      from: a,
      to: b,
      storyFrom: sa,
      storyTo: sb,
      rate,
      followed: s.followedAt(mid).id,
      crafts,
      fromEvents: events.filter((e) => Math.abs(e.seconds - a) < 1e-6).map((e) => e.id),
      toEvents: events.filter((e) => Math.abs(e.seconds - b) < 1e-6).map((e) => e.id),
    });
  }

  // A play of `span` story seconds from `start` over `seconds` real seconds, as the player shapes it.
  const play = (start, span, seconds) => {
    let topSpeed = 0;
    let topLaps = { laps: 0, id: null, at: 0, speed: 0 };
    let unhurried = { laps: 0, id: null, at: 0, speed: 0 };
    const dt = 0.02;
    for (let e = 0; e <= seconds + 1e-9; e += dt) {
      const shape = player.tripShape(e, seconds, Math.abs(span));
      const speed = Math.abs(span) * shape.pace;
      const now = start + span * shape.share;
      const t = story.toMission(now);
      const missionSpeed = speed * missionPerStory(now);
      topSpeed = Math.max(topSpeed, speed);
      for (const ship of ships) {
        const laps = lapRate(ship, t) * missionSpeed;
        if (laps > topLaps.laps) topLaps = { laps, id: ship.id, at: e, speed };
        if (speed <= 1.0001 && laps > unhurried.laps)
          unhurried = { laps, id: ship.id, at: e, speed };
      }
    }
    return { topSpeed, topLaps, unhurried };
  };

  const stops = events.filter((event) => event.stop !== null);
  const restOf = (event) => {
    const parting = partings.find(({ start }) => Math.abs(start - event.seconds) < 1e-6);
    if (!parting) return event.story;
    const beside = story.toStory(parting.end) - event.story;
    if (!(beside > 0)) return event.story;
    const after = Math.min(tour.PARTING_REST_STORY_SECONDS, tour.PARTING_REST_MAX_SHARE * beside);
    return story.toStory(story.toMission(event.story + after));
  };
  const trips = [];
  for (let i = 0; i + 1 < stops.length; i += 1) {
    const from = stops[i];
    const to = stops[i + 1];
    const start = restOf(from);
    const span = to.story - start;
    const seconds = tour.tripSeconds(span);
    const trip = {
      from: from.stop,
      to: to.stop,
      fromTitle: from.title,
      toTitle: to.title,
      span,
      seconds,
      ...play(start, span, seconds),
    };
    const rest = restOf(to);
    if (rest > to.story) {
      const restSeconds = tour.restPlaySeconds(rest - to.story);
      trip.parting = {
        span: rest - to.story,
        seconds: restSeconds,
        ...play(to.story, rest - to.story, restSeconds),
      };
    }
    trips.push(trip);
  }
  // Starting the tour, Back, and starting over: a short run-up to the stop.
  const runUps = stops.map((stop) => {
    const span = Math.min(leadIn, stop.story);
    return {
      stop: stop.stop,
      title: stop.title,
      span,
      seconds: leadIn,
      ...play(stop.story - span, span, leadIn),
    };
  });

  return {
    mission: bundle.mission.id,
    name: bundle.mission.name,
    duration: story.length,
    thresholds: { pace, onset, leadIn },
    events,
    stretches,
    trips,
    runUps,
  };
}

function clock(seconds) {
  const sign = seconds < 0 ? '-' : '';
  const s = Math.round(Math.abs(seconds));
  return `${sign}${String(Math.floor(s / 3600)).padStart(3, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function minutes(seconds) {
  return seconds === null
    ? '-'
    : seconds >= 5400
      ? `${(seconds / 3600).toFixed(1)} h`
      : `${(seconds / 60).toFixed(0)} min`;
}

function main() {
  const args = process.argv.slice(2);
  const mission = args.find((arg) => !arg.startsWith('--'));
  const jsonAt = args.indexOf('--json');
  if (!mission) {
    console.error('Usage: pace.mjs <mission> [--json PATH]');
    process.exit(2);
  }
  return { mission, json: jsonAt >= 0 ? args[jsonAt + 1] : null };
}

async function run() {
  const { mission, json } = main();
  const browser = await openBrowser({ width: 1280, height: 800 });
  let data;
  try {
    await browser.navigate(`${BASE}/?mission=${encodeURIComponent(mission)}&start=explore`);
    for (let i = 0; i < 150; i += 1) {
      if (await browser.page.evaluate('Boolean(window.stage && window.__missionScene)')) break;
      await sleep(200);
    }
    data = await browser.page.evaluate(`(${measure.toString()})(${JSON.stringify(mission)})`);
  } finally {
    await browser.close();
  }
  if (json) await writeFile(json, `${JSON.stringify(data, null, 2)}\n`);

  const { pace, onset } = data.thresholds;
  const scene = (laps) => {
    if (pace === null || onset === null) return '?';
    if (laps >= pace) return 'ring';
    if (laps > pace * onset) return 'fading';
    return 'drawn';
  };
  const lapText = (laps) =>
    laps > 0 ? `${laps.toFixed(3)} (1 in ${(1 / laps).toFixed(1)} s)` : '-';
  // Flags carry the numbers of the standards in SKILL.md.
  const flags = (laps, id, followed) => {
    const kind = scene(laps);
    const out = [];
    if (laps > LIMIT && kind !== 'ring') out.push('7: a drawn craft laps faster than once in 8 s');
    if (kind === 'fading') out.push('8: half-faded');
    // The ring is drawn for the followed craft only; any other fades out with nothing in its place.
    if (followed && id !== followed && kind !== 'drawn')
      out.push(`19: ${id} is not followed, so it fades with no ring`);
    return out.join('; ');
  };

  console.log(
    `${data.name} (${data.mission}): ${data.events.length} events, story ${data.duration.toFixed(1)} s at 1x.`,
  );
  console.log(
    `The owner's limit for a drawn craft: ${LIMIT.toFixed(3)} laps/s (one lap in 8 s). The scene now starts fading a craft at ${pace !== null && onset !== null ? (pace * onset).toFixed(3) : '?'} laps/s and shows only the ring from ${pace ?? '?'} (read from src/scene/stage.ts).`,
  );

  console.log('\nevents');
  console.log('  story s  mission      view        stop  id: title');
  for (const event of data.events) {
    console.log(
      `  ${event.story.toFixed(2).padStart(7)}  ${clock(event.seconds)}  ${event.view.padEnd(10)}  ${event.stop === null ? '   ' : String(event.stop).padStart(3)}   ${event.id}: ${event.title}`,
    );
  }

  console.log("\nstretches at Explore's 1x (one story second a second)");
  console.log(
    '  story s         mission s per story s   followed  fastest lapping (laps/s)     period    scene    from -> to',
  );
  for (const stretch of data.stretches) {
    const top = stretch.crafts.reduce(
      (best, craft) => (craft.laps > (best?.laps ?? 0) ? craft : best),
      null,
    );
    const name = `${stretch.fromEvents[0] ?? '(key)'} -> ${stretch.toEvents[0] ?? '(key)'}`;
    console.log(
      `  ${stretch.storyFrom.toFixed(2).padStart(6)}-${stretch.storyTo.toFixed(2).padEnd(7)} ${stretch.rate.toFixed(0).padStart(8)}               ${stretch.followed.padEnd(8)}  ${top ? `${top.id} ${lapText(top.laps)}`.padEnd(28) : '-'.padEnd(28)} ${top ? minutes(top.period).padEnd(8) : '-       '}  ${top ? scene(top.laps).padEnd(7) : '-      '}  ${name}${top && flags(top.laps, top.id, stretch.followed) ? `\n${' '.repeat(18)}^ ${flags(top.laps, top.id, stretch.followed)}` : ''}`,
    );
  }

  console.log(
    "\ntour trips (Next): the trip, then a parting's play from its event to where it rests",
  );
  console.log(
    '  trip     story s  real s  top pace  fastest lapping at 1x or slower      fastest lapping overall          to',
  );
  const lapAt = (entry) =>
    entry.laps > 0 ? `${entry.id} ${lapText(entry.laps)} ${scene(entry.laps)}` : '-';
  for (const trip of data.trips) {
    // At Explore's pace or slower the craft is seen as Explore shows it: there it must keep to 7 and 8.
    const flag = trip.unhurried.laps > 0 ? flags(trip.unhurried.laps, trip.unhurried.id, null) : '';
    console.log(
      `  ${String(trip.from).padStart(2)} -> ${String(trip.to).padEnd(2)} ${trip.span.toFixed(2).padStart(7)}  ${trip.seconds.toFixed(1).padStart(6)}  ${trip.topSpeed.toFixed(2).padStart(6)}x   ${lapAt(trip.unhurried).padEnd(36)}  ${lapAt(trip.topLaps).padEnd(31)}  ${trip.toTitle}${flag ? `\n${' '.repeat(18)}^ ${flag}` : ''}`,
    );
    if (trip.parting) {
      console.log(
        `     parting ${trip.parting.span.toFixed(2).padStart(5)}  ${trip.parting.seconds.toFixed(1).padStart(6)}  ${trip.parting.topSpeed.toFixed(2).padStart(6)}x   ${lapAt(trip.parting.unhurried).padEnd(36)}  ${lapAt(trip.parting.topLaps)}`,
      );
    }
  }

  console.log(
    '\nrun-ups (starting the tour, Back, starting over): the last story seconds before the stop',
  );
  console.log('  stop  story s  real s  top pace  fastest lapping                       ');
  for (const runUp of data.runUps) {
    // A run-up is held to the pace standards like any trip (standard 6).
    const notes = [];
    if (runUp.topSpeed > 1.05)
      notes.push(`6: ${runUp.topSpeed.toFixed(1)}x Explore's pace just before the stop`);
    if (runUp.topLaps.laps > 0) {
      const lapFlags = flags(runUp.topLaps.laps, runUp.topLaps.id, null);
      if (lapFlags) notes.push(`6, ${lapFlags}`);
    }
    console.log(
      `  ${String(runUp.stop).padStart(4)}  ${runUp.span.toFixed(2).padStart(7)}  ${runUp.seconds.toFixed(1).padStart(6)}  ${runUp.topSpeed.toFixed(2).padStart(6)}x   ${lapAt(runUp.topLaps).padEnd(36)}  ${runUp.title}${notes.length ? `\n${' '.repeat(18)}^ ${notes.join('; ')}` : ''}`,
    );
  }
}

run().catch((error) => {
  console.error(`pace.mjs: ${error.message}`);
  process.exit(1);
});
