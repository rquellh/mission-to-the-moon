#!/usr/bin/env node
/**
 * The pace of a flight, in numbers, without a single picture: each event's
 * story second; each stretch's mission seconds per story second (at its ends,
 * on average, and at its fastest) and how fast every craft laps its body
 * there at Explore's 1x; and each tour trip and run-up, with its top pace and
 * the fastest lapping it shows.
 *
 *   node .claude/skills/animation-review/scripts/pace.mjs <mission> [--even] [--json PATH]
 *
 * --even builds the clock with every stretch at one even pace (no easing, no
 * held partings or approaches, no swings kept calm), to compare with.
 * --usual-trips plays the tour's trips without the clock's hurry limit, as
 * the tour did before it kept to it (see planTrip in src/app/player.ts).
 *
 * It loads the mission in headless Chrome from the dev server and imports the
 * app's own modules there (the story clock, the tour's trip and run-up rules,
 * the scene's fast-forward rules), and reads each craft's laps from
 * window.stage (development builds only), so the numbers are the ones the app
 * uses. BASE sets the dev server (default http://localhost:5199).
 *
 * The pace is read from the clock itself, a moment at a time: a stretch does
 * not always run at one even pace (it may ease into and out of its events,
 * and keep a craft swinging round a body to a calm pace; see
 * src/sim/story-time.ts). Laps per second is the mission seconds the clock
 * covers per real second, divided by the orbit's period. The limit used here
 * for a drawn craft is one lap in 20 seconds (0.05 laps/s). It is a working
 * figure, not the owner's: the owner called a lap of the Moon in 4.4 seconds
 * "way too fast" and one in 8.8 "better", and then, with drawn craft kept to
 * about one lap in 8 seconds, said the orbit animations were still too fast.
 *
 * Whether a craft is in fast forward follows the scene's rules
 * (src/scene/fast-forward.ts and Stage.updateFastForward): only while it laps
 * faster than the fast-forward threshold (with its two levels) and its path
 * around now is a closed lap; never while docked, on a surface, or with no
 * parts of its own. A craft in fast forward is still drawn: its stand-in
 * glides round its ring at the glide's own pace (setting off at one lap in
 * FAST_FORWARD_ON_LAP_SECONDS and easing to one in
 * FAST_FORWARD_GLIDE_LAP_SECONDS over FAST_FORWARD_GLIDE_EASE_SECONDS of
 * real time), whatever the clock's pace. So "fastest drawn" is what is shown:
 * the true rate for a craft at its true place, the glide's for a stand-in
 * (marked "stand-in"). A craft on no closed lap has no stand-in and is drawn
 * at its true place however fast it goes: the tables single those out. A
 * recording's `7 laps` signal measures what was actually drawn.
 *
 * Tour trips are planned as the tour plans them (planTrip in
 * src/app/player.ts, with the clock's hurry limit): each trip's real length,
 * and the usual length it would have without the limit; its final run (from
 * the end of its last hurry to the stop); and when the camera moves to the
 * stop's view, by the tour's plan (tripViewSeconds in src/app/tour.ts), from
 * the view of the stop it leaves. The scene can still move the camera later
 * (while its fast-forward view shows) or sooner (see Tour.watchScene). The
 * stops, the trips' lengths and whether the camera moves follow the flight's
 * tour style (StyleRules in src/app/tour.ts): on an every-event tour no trip
 * moves the camera, and a page turn jumps the clock and plays nothing.
 */
import { writeFile } from 'node:fs/promises';
import { openBrowser, sleep } from './cast.mjs';

const BASE = (process.env.BASE ?? 'http://localhost:5199').replace(/\/$/, '');
/** The working limit for a drawn craft, laps per real second: one lap in 20 seconds (see the top of this file). */
const LIMIT_LAP_SECONDS = 20;
const LIMIT = 1 / LIMIT_LAP_SECONDS;
/** "Near an event": within this many story seconds of one, where the tour plays at Explore's pace. */
const NEAR_STORY_SECONDS = 3;

/** Runs in the page: everything the tables need. */
async function measure(missionId, near, even, usualTrips) {
  const s = window.stage;
  if (!s) throw new Error('window.stage is missing: run against the dev server');
  if (!s.fleet || !s.ships.some((ship) => ship.revolutions))
    throw new Error('the stage has not built the mission yet (no craft or laps to measure)');
  const { loadBundle } = await import('/src/content/missions/index.ts');
  const sim = await import('/src/sim/index.ts');
  const { elapsedToSeconds } = await import('/src/content/types.ts');
  const tour = await import('/src/app/tour.ts');
  const player = await import('/src/app/player.ts');
  const views = await import('/src/app/views.ts');
  const ff = await import('/src/scene/fast-forward.ts');
  const { EARTH_RADIUS, MOON_RADIUS } = await import('/src/content/physical-constants.ts');

  const bundle = await loadBundle(missionId);
  const path = sim.buildFlightPath(bundle.flight);
  const eventTimes = bundle.mission.events.map((event) => elapsedToSeconds(event.elapsed));
  const story = sim.createStoryTime(sim.storyKeyTimes(path, eventTimes), { ease: !even });
  const partings = sim.partingsAtEvents(path, eventTimes);
  const keys = story.keyTimes.map((t) => [t, story.toStory(t)]);
  // The flight's tour style (see StyleRules in src/app/tour.ts), or on a build from before tour
  // styles, the one tour there was: its key moments, each in its own view.
  const rules = tour.tourRules?.(bundle.mission) ?? {
    stops: (mission) => mission.events.filter((event) => event.keyMoment ?? event.inTour),
    view: (mission, stop) => views.nearestView(mission, stop.view),
    tripSeconds: tour.tripSeconds,
    viewOnTrips: true,
    showsDrops: false,
    pageTurns: false,
  };
  const drops = rules.showsDrops
    ? (await import('/src/app/drops.ts')).dropsAtEvents(bundle, eventTimes)
    : [];
  const stays = rules.pageTurns ? sim.staysOnSurface(path) : [];

  /**
   * Mission seconds per story second at story time `at`, read from the clock
   * over a moment: the pace just ahead, as the scene reads it (Stage.missionPace),
   * or just behind at `hi`, the end of the stretch it is in.
   */
  const paceAt = (at, lo = 0, hi = story.length) => {
    const h = 0.002;
    const b = Math.min(hi, at + h);
    const a = b - at < h / 2 ? Math.max(lo, b - h) : at;
    return b > a ? (story.toMission(b) - story.toMission(a)) / (b - a) : 0;
  };

  // Revolutions flown around the nearer body by mission time t (see Stage.revolutionsOf).
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
  const ships = s.ships;
  const models = s.fleet?.ships ?? [];
  const where = [0, 0, 0];
  const moonAtTrueScale = [0, 0, 0];
  s.path.moonPosition(1, moonAtTrueScale);
  const moonReadable = [s.moonCenter.x, s.moonCenter.y, s.moonCenter.z];
  const origin = [0, 0, 0];
  /**
   * Laps per mission second a craft makes around its body at t, as the scene
   * counts them (Stage.turnRate): 0 while it does not exist, is docked or on
   * a surface, or has no parts of its own (it is drawn as part of another).
   */
  const turnRate = (ship, index, t) => {
    if (!ship.revolutions || !ship.times) return 0;
    if (!s.path.position(ship.id, t, 0, where)) return 0;
    const phase = s.path.phaseAt(ship.id, t);
    if (!phase || phase.kind === 'docked' || phase.kind === 'surface') return 0;
    const model = models[index];
    if (model && model.shapeParts(model.shapeAt(t)).length === 0) return 0;
    return Math.max(0, (lapsAt(ship, t + 30) - lapsAt(ship, t - 30)) / 60);
  };
  /** Whether the craft's path around t is a closed lap of its body (Stage.closedLap). */
  const closes = (ship, t) => {
    if (!ship.lap || !s.path.position(ship.id, t, 0, where)) return false;
    const earthHeight = (Math.hypot(...where) - EARTH_RADIUS) / EARTH_RADIUS;
    const moonHeight =
      (Math.hypot(
        where[0] - moonReadable[0],
        where[1] - moonReadable[1],
        where[2] - moonReadable[2],
      ) -
        MOON_RADIUS) /
      MOON_RADIUS;
    const center = moonHeight < earthHeight ? moonAtTrueScale : origin;
    return !Number.isNaN(ff.closedLapStart(ship.lap, lapsAt(ship, t), center));
  };

  /**
   * Follows the scene through a run of moments in order, each a mission time,
   * the mission seconds the clock covers per real second there, and the real
   * seconds since the moment before. For each moment it gives every craft
   * drawn on its own: the laps per real second it is shown going round its
   * body (`laps`: its true rate at its true place, or its stand-in's glide in
   * fast forward), its true rate (`trueLaps`), whether it is a stand-in, and
   * whether its path around now is no closed lap (`open`: drawn at its true
   * place however fast it goes). It starts with no fast forward, as after a
   * stop or a pause (the scene never fast-forwards a stopped clock), so a
   * stand-in sets off at the pace a craft goes into fast forward at. On a
   * build from before the stand-in, a craft in fast forward was hidden, and
   * is shown going round at no pace at all.
   */
  const glideRate = ff.glideRate ?? (() => 0);
  const follower = () => {
    const fast = ships.map(() => false);
    const glided = ships.map(() => 0);
    return (t, missionPerReal, dt) =>
      ships
        .map((ship, index) => {
          const trueLaps = turnRate(ship, index, t) * missionPerReal;
          const closed = closes(ship, t);
          const was = fast[index];
          fast[index] = ff.inFastForward(trueLaps, was) && closed;
          glided[index] = fast[index] && was ? glided[index] + dt : 0;
          const standIn = fast[index];
          const laps = standIn
            ? glideRate(glided[index], 1 / ff.FAST_FORWARD_ON_LAP_SECONDS)
            : trueLaps;
          return { id: ship.id, laps, trueLaps, standIn, open: !standIn && !closed };
        })
        .filter((craft) => craft.trueLaps > 0);
  };
  const better = (best, candidate) => (candidate.laps > (best?.laps ?? 0) ? candidate : best);
  /** The clock as the app hands it to the player and the tour (see main.ts), with its hurry limit. */
  const map = {
    duration: story.length,
    toStory: (seconds) => story.toStory(seconds),
    toElapsed: (seconds) => story.toMission(seconds),
  };
  if (story.hurryLimit && !usualTrips) map.hurryLimit = (seconds) => story.hurryLimit(seconds);
  /** A trip as the player plays it (planTrip), or, on a build from before trips were planned, its usual shape. */
  const planOf = (from, to, seconds) =>
    player.planTrip
      ? player.planTrip(map, from, to, seconds)
      : {
          seconds,
          finalRun: player.TRIP_ARRIVE_SECONDS,
          over: 1,
          limited: false,
          hurries: player.tripHurries(seconds, Math.abs(to - from)),
          at: (e) => player.tripShape(e, seconds, Math.abs(to - from)),
        };

  const events = bundle.mission.events.map((event, i) => ({
    id: event.id,
    title: event.title,
    seconds: eventTimes[i],
    story: story.toStory(eventTimes[i]),
    view: event.view,
    stop: null,
  }));
  const tourStops = rules.stops(bundle.mission);
  let stopNumber = 0;
  for (const [i, event] of bundle.mission.events.entries()) {
    if (tourStops.includes(event)) events[i].stop = stopNumber += 1;
  }
  const eventStories = events.map((event) => event.story);
  const nearEvent = (at) => eventStories.some((e) => Math.abs(e - at) <= near);

  // Explore at 1x, played from the start without a stop: each stretch between two key times.
  const step = 0.01;
  const explore = follower();
  const stretches = [];
  let nearTop = null;
  let nearOpenTop = null;
  let nearClosedTop = null;
  let anyTop = null;
  let openTop = null;
  let standInTop = null;
  for (let i = 0; i + 1 < keys.length; i += 1) {
    const [a, sa] = keys[i];
    const [b, sb] = keys[i + 1];
    const even = sb > sa ? (b - a) / (sb - sa) : 0;
    const startPace = paceAt(sa, sa, sb);
    const endPace = paceAt(sb, sa, sb);
    let topPace = 0;
    let drawnTop = null;
    const count = Math.max(2, Math.ceil((sb - sa) / step));
    for (let k = 0; k < count; k += 1) {
      const at = sa + ((sb - sa) * (k + 0.5)) / count;
      const pace = paceAt(at, sa, sb);
      topPace = Math.max(topPace, pace);
      const t = story.toMission(at);
      // At 1x a story second is a real second.
      for (const craft of explore(t, pace, (sb - sa) / count)) {
        const entry = { ...craft, at, t, sinceStart: at - sa, beforeEnd: sb - at };
        if (craft.standIn) standInTop = better(standInTop, entry);
        drawnTop = better(drawnTop, entry);
        anyTop = better(anyTop, entry);
        if (craft.open) openTop = better(openTop, entry);
        if (nearEvent(at)) nearTop = better(nearTop, entry);
        if (nearEvent(at) && craft.open) nearOpenTop = better(nearOpenTop, entry);
        if (nearEvent(at) && !craft.open) nearClosedTop = better(nearClosedTop, entry);
      }
    }
    // How the clock plays the stretch (see story-time.ts), or, on a clock that does not say, whether
    // its ends are slower than its average (eased).
    const play =
      story.stretches?.[i]?.play ??
      (startPace < even * 0.999 && endPace < even * 0.999 ? 'eased' : 'even');
    stretches.push({
      from: a,
      to: b,
      storyFrom: sa,
      storyTo: sb,
      even,
      startPace,
      endPace,
      topPace,
      play,
      // Played longer than the clock's usual length for its mission time (see storyIntervalLength).
      longer: sb - sa - sim.storyIntervalLength(b - a) > 1e-6,
      shoulders: play === 'eased',
      followed: s.followedAt((a + b) / 2).id,
      drawnTop,
      fromEvents: events.filter((e) => Math.abs(e.seconds - a) < 1e-6).map((e) => e.id),
      toEvents: events.filter((e) => Math.abs(e.seconds - b) < 1e-6).map((e) => e.id),
    });
  }

  // A play of `span` story seconds from `start` asked for in `seconds` real seconds, as the player
  // plans and plays it (a hurried trip the clock's craft hold back takes longer).
  const play = (start, span, seconds) => {
    const plan = planOf(start, start + span, seconds);
    const follow = follower();
    let topSpeed = 0;
    let topLaps = null;
    let unhurried = null;
    let openLaps = null;
    const dt = 0.02;
    for (let e = 0; e <= plan.seconds + 1e-9; e += dt) {
      const shape = plan.at(e);
      const speed = Math.abs(span) * shape.pace;
      const now = start + span * shape.share;
      const t = story.toMission(now);
      topSpeed = Math.max(topSpeed, speed);
      for (const craft of follow(t, speed * paceAt(now), dt)) {
        const entry = { ...craft, at: e, speed };
        topLaps = better(topLaps, entry);
        if (craft.open) openLaps = better(openLaps, entry);
        if (speed <= 1.0001) unhurried = better(unhurried, entry);
      }
    }
    return {
      seconds: plan.seconds,
      limited: plan.limited,
      over: plan.over,
      finalRun: plan.finalRun,
      plan,
      topSpeed,
      topLaps,
      unhurried,
      openLaps,
    };
  };

  const stops = events.filter((event) => event.stop !== null);
  /** Where the clock rests at a stop, in story seconds, by the tour's own rule (Tour.restFor). */
  const restOf = (event) => {
    const at = (time) => Math.abs(time - event.seconds) < 1e-6;
    const parting = partings.find(({ start }) => at(start));
    if (parting) {
      const beside = story.toStory(parting.end) - event.story;
      if (!(beside > 0)) return event.story;
      const after = Math.min(tour.PARTING_REST_STORY_SECONDS, tour.PARTING_REST_MAX_SHARE * beside);
      return story.toStory(story.toMission(event.story + after));
    }
    if (drops.some(at)) {
      const next = stops.find((stop) => stop.story > event.story + 1e-6)?.story ?? story.length;
      const after = Math.min(
        tour.DROP_REST_STORY_SECONDS,
        tour.PARTING_REST_MAX_SHARE * (next - event.story),
      );
      if (after > 1e-6) return story.toStory(story.toMission(event.story + after));
    }
    return event.story;
  };
  const trips = [];
  for (let i = 0; i + 1 < stops.length; i += 1) {
    const from = stops[i];
    const to = stops[i + 1];
    const start = restOf(from);
    const span = to.story - start;
    // A page turn jumps the clock: no play at all (see StyleRules.pageTurns).
    const page =
      stays.length > 0 &&
      sim.stillBetween(stays, story.toMission(start), story.toMission(restOf(to)));
    const usual = page ? 0 : rules.tripSeconds(span);
    const played = page
      ? {
          seconds: 0,
          limited: false,
          over: 1,
          finalRun: 0,
          plan: null,
          topSpeed: 0,
          topLaps: null,
          unhurried: null,
          openLaps: null,
        }
      : play(start, span, usual);
    // When the camera moves to the stop's view, by the tour's plan, from the view of the stop
    // just left; null when the tour keeps one view (see StyleRules.viewOnTrips).
    const fromView = rules.view(
      bundle.mission,
      bundle.mission.events.find((e) => e.id === from.id),
    );
    const toView = rules.view(
      bundle.mission,
      bundle.mission.events.find((e) => e.id === to.id),
    );
    const viewAt = !rules.viewOnTrips
      ? null
      : !(played.seconds > tour.VIEW_LEAD_SECONDS)
        ? 0
        : tour.tripViewSeconds
          ? tour.tripViewSeconds({
              fromView,
              toView,
              missionToStop: to.seconds - story.toMission(start),
              plan: played.plan,
            })
          : played.seconds - tour.VIEW_LEAD_SECONDS;
    const { plan: _plan, ...kept } = played;
    const trip = {
      from: from.stop,
      to: to.stop,
      fromTitle: from.title,
      toTitle: to.title,
      span,
      usual,
      page,
      ...kept,
      fromView,
      toView,
      viewAt,
    };
    const rest = restOf(to);
    if (rest > to.story) {
      const restSeconds = tour.playSeconds(rest - to.story);
      const { plan: _restPlan, ...rested } = play(to.story, rest - to.story, restSeconds);
      trip.parting = { span: rest - to.story, ...rested };
    }
    trips.push(trip);
  }
  // Starting the tour, Back, and starting over: a run-up to the stop, by the tour's own rules (Tour.runUpFrom).
  const runUps = stops.map((stop) => {
    const from = Math.max(
      0,
      stop.story - tour.RUN_UP_STORY_SECONDS,
      story.toStory(stop.seconds - tour.RUN_UP_MAX_MISSION_SECONDS),
    );
    const span = stop.story - from;
    const base = { stop: stop.stop, title: stop.title, span };
    if (span < tour.RUN_UP_MIN_STORY_SECONDS)
      return { ...base, cut: true, seconds: 0, topSpeed: 0, topLaps: null, mission: 0 };
    const { plan: _plan, ...played } = play(from, span, tour.playSeconds(span));
    return { ...base, cut: false, mission: stop.seconds - story.toMission(from), ...played };
  });

  return {
    mission: bundle.mission.id,
    name: bundle.mission.name,
    duration: story.length,
    thresholds: {
      onLap: ff.FAST_FORWARD_ON_LAP_SECONDS,
      offLap: ff.FAST_FORWARD_OFF_LAP_SECONDS,
      // Undefined on a build from before the clock eased its stretches; calm and swing on one
      // from before it read the craft's turning.
      ease: {
        gentle: sim.EASE_GENTLE_PACE,
        shoulder: sim.EASE_SHOULDER_STORY_SECONDS,
        least: sim.EASE_SHOULDER_MIN_STORY_SECONDS,
        ramp: sim.EASE_RAMP_MISSION_SECONDS,
        hurry: sim.EASE_MAX_HURRY,
        calm: sim.CALM_LAP_STORY_SECONDS,
        swing: sim.SWING_LAP_STORY_SECONDS,
      },
      runUp: {
        story: tour.RUN_UP_STORY_SECONDS,
        mission: tour.RUN_UP_MAX_MISSION_SECONDS,
        min: tour.RUN_UP_MIN_STORY_SECONDS,
      },
      // Undefined on a build from before the stand-in, or before trips were held to the clock's limit.
      glide: { lap: ff.FAST_FORWARD_GLIDE_LAP_SECONDS, ease: ff.FAST_FORWARD_GLIDE_EASE_SECONDS },
      trip: { usual: tour.TRIP_MAX_SECONDS, longest: player.TRIP_LIMITED_MAX_SECONDS },
    },
    near,
    events,
    stretches,
    even,
    nearTop,
    nearOpenTop,
    nearClosedTop,
    anyTop,
    openTop,
    standInTop,
    trips,
    runUps,
  };
}

function clock(seconds) {
  const sign = seconds < 0 ? '-' : '';
  const s = Math.round(Math.abs(seconds));
  return `${sign}${String(Math.floor(s / 3600)).padStart(3, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function main() {
  const args = process.argv.slice(2);
  const mission = args.find((arg) => !arg.startsWith('--'));
  const jsonAt = args.indexOf('--json');
  if (!mission) {
    console.error('Usage: pace.mjs <mission> [--even] [--usual-trips] [--json PATH]');
    process.exit(2);
  }
  return {
    mission,
    even: args.includes('--even'),
    usualTrips: args.includes('--usual-trips'),
    json: jsonAt >= 0 ? args[jsonAt + 1] : null,
  };
}

async function run() {
  const { mission, even, usualTrips, json } = main();
  const browser = await openBrowser({ width: 1280, height: 800 });
  let data;
  try {
    await browser.navigate(`${BASE}/?mission=${encodeURIComponent(mission)}&start=explore`);
    // The stage exists before it has built the mission (its paths, laps and craft come once
    // Earth has loaded): measured earlier, no craft would ever be seen lapping.
    for (let i = 0; i < 300; i += 1) {
      if (
        await browser.page.evaluate(
          'Boolean(window.stage && window.__missionScene && window.stage.fleet && window.stage.ships.some((ship) => ship.revolutions))',
        )
      )
        break;
      await sleep(200);
    }
    data = await browser.page.evaluate(
      `(${measure.toString()})(${JSON.stringify(mission)}, ${NEAR_STORY_SECONDS}, ${even}, ${usualTrips})`,
    );
  } finally {
    await browser.close();
  }
  if (json) await writeFile(json, `${JSON.stringify(data, null, 2)}\n`);

  const { onLap, offLap, ease, runUp, glide, trip: tripLimits } = data.thresholds;
  const lapText = (laps) =>
    laps > 0 ? `${laps.toFixed(3)} (1 in ${(1 / laps).toFixed(1)} s)` : '-';
  const lapAt = (entry) =>
    entry && entry.laps > 0
      ? `${entry.id} ${lapText(entry.laps)}${entry.standIn ? ' stand-in' : ''}`
      : '-';
  // Flags carry the numbers of the standards in SKILL.md (7: a drawn craft never races around its
  // body). A craft on a closed lap is drawn up to the scene's faster threshold, so one passing
  // between the two thresholds is marked as such.
  const flag = (entry) =>
    !entry || entry.laps <= LIMIT
      ? ''
      : entry.laps <= 1 / onLap + 1e-3
        ? `7: a drawn craft laps faster than once in ${LIMIT_LAP_SECONDS} s, between the scene's two thresholds (once in ${onLap} to ${offLap} s)`
        : `7: a drawn craft laps faster than once in ${LIMIT_LAP_SECONDS} s`;
  const pace = (value) => value.toFixed(0).padStart(6);

  console.log(
    `${data.name} (${data.mission}): ${data.events.length} events, story ${data.duration.toFixed(1)} s at 1x.`,
  );
  console.log(
    `The limit used for a drawn craft: ${LIMIT.toFixed(3)} laps/s (one lap in ${LIMIT_LAP_SECONDS} s, a working figure: the owner called one in 8.8 s "better" than one in 4.4, then said the orbits were still too fast). The scene puts a craft on a closed lap into fast forward once it laps faster than once in ${onLap} s, and takes it out once slower than once in ${offLap} s (src/scene/fast-forward.ts)${glide.lap === undefined ? ', hiding it behind its ring meanwhile.' : `; meanwhile its stand-in glides round its ring, setting off at one lap in ${onLap} s and easing to one in ${glide.lap} s over ${glide.ease} s ("stand-in" below). A craft on no closed lap is drawn at its true place however fast it goes.`}`,
  );
  console.log(
    data.even || ease.gentle === undefined
      ? `The clock plays every stretch at one even pace (${data.even ? '--even' : 'a build from before it eased long stretches'}).`
      : ease.calm === undefined
        ? `The clock eases a long stretch: its first and last ${ease.shoulder} story s at ${ease.gentle}, then a ramp where the pace grows as (1 + t / ${ease.ramp} s)^2, t mission seconds into it, up to its middle's pace (a build from before the clock read the craft's turning).`
        : `The clock plays a stretch evenly when its craft, played evenly, lap no faster than once in ${ease.calm} s (*: eased; h: held, a parting or docking approach played evenly at no more than that; +: played longer than usual). An eased stretch plays its first and last ${ease.shoulder} story s (down to ${ease.least} where that leaves too little room) at ${ease.gentle}, then a ramp where the pace grows as (1 + t / ${ease.ramp} s)^2, t mission seconds into it, up to its middle's pace (at most ${ease.hurry} times the even pace); and where a craft is on no closed lap it keeps it to one lap in ${ease.swing} s (src/sim/story-time.ts).`,
  );

  console.log('\nevents');
  console.log('  story s  mission      view        stop  id: title');
  for (const event of data.events) {
    console.log(
      `  ${event.story.toFixed(2).padStart(7)}  ${clock(event.seconds)}  ${event.view.padEnd(10)}  ${event.stop === null ? '   ' : String(event.stop).padStart(3)}   ${event.id}: ${event.title}`,
    );
  }

  console.log(
    "\nstretches at Explore's 1x (one story second a second), played on from the start: mission seconds per story second at the start, on average, at the fastest and at the end (* eased into and out of its ends, h held, + played longer than usual); the fastest lapping of a craft drawn on its own, and where (story s after the stretch starts / before it ends)",
  );
  console.log(
    '  story s           start   even    top    end  followed  fastest drawn (laps/s)           where          from -> to',
  );
  const marks = { eased: '*', held: 'h', even: ' ' };
  for (const stretch of data.stretches) {
    const top = stretch.drawnTop;
    const name = `${stretch.fromEvents[0] ?? '(key)'} -> ${stretch.toEvents[0] ?? '(key)'}`;
    const whereText = top
      ? top.sinceStart <= top.beforeEnd
        ? `+${top.sinceStart.toFixed(2)} s`
        : `-${top.beforeEnd.toFixed(2)} s`
      : '';
    const warn = flag(top);
    const mark = `${marks[stretch.play] ?? ' '}${stretch.longer ? '+' : ' '}`;
    console.log(
      `  ${stretch.storyFrom.toFixed(2).padStart(6)}-${stretch.storyTo.toFixed(2).padEnd(7)}${mark}${pace(stretch.startPace)} ${pace(stretch.even)} ${pace(stretch.topPace)} ${pace(stretch.endPace)}  ${stretch.followed.padEnd(8)}  ${lapAt(top).padEnd(31)}  ${whereText.padEnd(13)}  ${name}${warn ? `\n${' '.repeat(18)}^ ${warn}` : ''}`,
    );
  }
  const count = (play) => data.stretches.filter((stretch) => stretch.play === play).length;
  const longer = data.stretches.filter((stretch) => stretch.longer).length;
  console.log(
    `  ${count('eased')} of ${data.stretches.length} stretches eased into and out of their ends (*), ${count('held')} held (h), ${longer} played longer than usual (+).`,
  );
  const at = (entry) =>
    entry ? `${lapAt(entry)} at story ${entry.at.toFixed(2)} s (${clock(entry.t)})` : '-';
  console.log(
    `  fastest lapping of a drawn craft within ${data.near} story s of an event: ${at(data.nearTop)}`,
  );
  console.log(`    of those, on a closed lap: ${at(data.nearClosedTop)}`);
  console.log(
    `    of those, on no closed lap (arriving, leaving, climbing: no ring can stand in): ${at(data.nearOpenTop)}`,
  );
  console.log(`  fastest lapping of a drawn craft anywhere: ${at(data.anyTop)}`);
  console.log(`    of those, on no closed lap: ${at(data.openTop)}`);
  console.log(`    of those, a stand-in: ${at(data.standInTop)}`);

  console.log(
    `\ntour trips (Next): the trip, then at a parting or a part let go, the play from its event to where it rests (a page turn jumps the clock and plays nothing). Real seconds as played, and as usual without the clock's hurry limit (a trip held back takes longer, up to ${tripLimits.longest ?? tripLimits.usual} s); its final run, from the end of its last hurry to the stop; and when the camera moves to the stop's view, as planned from the view of the stop it leaves`,
  );
  console.log(
    '  trip     story s  real s (usual)  top pace  fastest drawn at 1x or slower        fastest drawn overall              final run  camera at        to',
  );
  for (const trip of data.trips) {
    // At Explore's pace or slower the craft is seen as Explore shows it: there it must keep to standard 7.
    const notes = [];
    const warn = flag(trip.unhurried);
    if (warn) notes.push(warn);
    // On no closed lap no stand-in covers the hurry: the craft is drawn at its true place.
    if (trip.openLaps && trip.openLaps.laps > LIMIT)
      notes.push(
        `7: in the hurry, a craft on no closed lap is drawn lapping once in ${(1 / trip.openLaps.laps).toFixed(1)} s`,
      );
    if (trip.over > 1)
      notes.push(
        `over the clock's hurry limit by x${trip.over.toFixed(2)} where it holds the trip back: it would take longer than ${tripLimits.longest} s`,
      );
    const real = trip.page
      ? ' page turn  '
      : `${trip.seconds.toFixed(1).padStart(5)} (${trip.usual.toFixed(1).padStart(4)})`;
    // A tour that keeps one view moves no camera on a trip (see StyleRules.viewOnTrips).
    const camera =
      trip.viewAt === null || trip.viewAt === undefined
        ? `  -     ${trip.toView}`
        : `${trip.viewAt.toFixed(1).padStart(5)} s ${trip.toView}`;
    console.log(
      `  ${String(trip.from).padStart(2)} -> ${String(trip.to).padEnd(2)} ${trip.span.toFixed(2).padStart(7)}  ${real}  ${trip.topSpeed.toFixed(2).padStart(6)}x   ${lapAt(trip.unhurried).padEnd(36)}  ${lapAt(trip.topLaps).padEnd(33)}  ${`${trip.finalRun.toFixed(1)} s`.padStart(8)}  ${camera.padEnd(16)} ${trip.toTitle}${notes.length ? `\n${' '.repeat(18)}^ ${notes.join('; ')}` : ''}`,
    );
    if (trip.parting) {
      console.log(
        `     rest    ${trip.parting.span.toFixed(2).padStart(5)}  ${trip.parting.seconds.toFixed(1).padStart(5)}         ${trip.parting.topSpeed.toFixed(2).padStart(6)}x   ${lapAt(trip.parting.unhurried).padEnd(36)}  ${lapAt(trip.parting.topLaps)}`,
      );
    }
  }
  const longerTrips = data.trips.filter((trip) => trip.seconds > trip.usual + 1e-6);
  console.log(
    `  ${longerTrips.length} of ${data.trips.length} trips take longer than usual${longerTrips.length ? `: ${longerTrips.map((trip) => `${trip.from} -> ${trip.to} ${trip.usual.toFixed(1)} -> ${trip.seconds.toFixed(1)} s`).join(', ')}` : ''}.`,
  );

  console.log(
    `\nrun-ups (starting the tour, Back, starting over): the last ${runUp.story} story s before the stop, no more than ${runUp.mission / 60} mission minutes, or a straight cut when that leaves under ${runUp.min} story s`,
  );
  console.log(
    '  stop  story s  mission  real s  top pace  fastest drawn                         stop',
  );
  for (const runUp of data.runUps) {
    if (runUp.cut) {
      console.log(
        `  ${String(runUp.stop).padStart(4)}  ${runUp.span.toFixed(2).padStart(7)}        -       -  cut       -                                     ${runUp.title}`,
      );
      continue;
    }
    // A run-up is held to the pace standards like any trip (standard 6).
    const notes = [];
    if (runUp.topSpeed > 1.05)
      notes.push(`6: ${runUp.topSpeed.toFixed(1)}x Explore's pace just before the stop`);
    const warn = flag(runUp.topLaps);
    if (warn) notes.push(`6, ${warn}`);
    console.log(
      `  ${String(runUp.stop).padStart(4)}  ${runUp.span.toFixed(2).padStart(7)}  ${`${(runUp.mission / 60).toFixed(0)} min`.padStart(7)}  ${runUp.seconds.toFixed(1).padStart(6)}  ${runUp.topSpeed.toFixed(2).padStart(6)}x   ${lapAt(runUp.topLaps).padEnd(36)}  ${runUp.title}${notes.length ? `\n${' '.repeat(18)}^ ${notes.join('; ')}` : ''}`,
    );
  }
  const cuts = data.runUps.filter((runUp) => runUp.cut).length;
  console.log(
    `  ${data.runUps.length - cuts} of ${data.runUps.length} stops get a run-up; ${cuts} arrive by a straight cut.`,
  );
}

run().catch((error) => {
  console.error(`pace.mjs: ${error.message}`);
  process.exit(1);
});
