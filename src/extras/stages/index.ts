/**
 * "Drop the stages": a rocket climbs to orbit by dropping the parts it has
 * used up, and the visitor presses one button to drop each one.
 *
 * Every time shown comes from the mission's own files, with their
 * citations (see climb.ts). What is simplified, and says so on screen: the
 * mission clock runs much faster than real time; the gauge only shows how
 * much is left until the real drop, not fuel; the fading haze and falling
 * ground only suggest the climb.
 */
import "./stages.css";
import type { MissionBundle } from "../../content/missions/bundle.ts";
import { sourcesBlock } from "../../ui/citations.ts";
import { button, el, setText } from "../../ui/dom.ts";
import { yearOf } from "../../ui/format.ts";
import type { Extra, ExtraContext, ExtraMount } from "../types.ts";
import {
  capitalize,
  climbFor,
  clockFace,
  judge,
  missionAt,
  overdue,
  sayClock,
  sayElapsed,
  scheduleFor,
  type Climb,
  type Drop,
  type Schedule,
} from "./climb.ts";
import { meta } from "./meta.ts";
import { createRocketView, type RocketView } from "./rocket-view.ts";

/** The rockets offered from the list: the Titan II, the Saturn IB, and the Saturn V. */
const CHOICES = ["gemini-8", "apollo-7", "apollo-11"] as const;
/** The rocket offered when a mission's files cannot show a climb. */
const DEFAULT_MISSION = "apollo-11";
/** After a too-early press, presses are ignored this long (real seconds), so the line can be read. */
const EARLY_PAUSE = 0.4;
/** A pause at orbit before the summary (real seconds). */
const ORBIT_PAUSE = 0.8;

type Screen = "loading" | "choose" | "ready" | "climbing" | "done" | "missing";

interface Result {
  kind: "on-time" | "auto";
  /** The illustration's clock when it dropped, mission seconds. */
  clock: number;
}

interface Run {
  climb: Climb;
  schedule: Schedule;
  /** Real seconds since Start. */
  seconds: number;
  /** The drop to make next. */
  next: number;
  results: Result[];
  quietUntil: number;
  orbitAt: number | null;
  coasting: boolean;
}

function mount(host: HTMLElement, context: ExtraContext, params: URLSearchParams): ExtraMount {
  let disposed = false;
  const root = el("div", "stages");
  const stage = el("div", "stages__stage");
  const canvas = el("canvas", "stages__canvas");
  canvas.setAttribute("role", "img");
  stage.append(canvas);
  const panel = el("div", "stages__panel");
  root.append(stage, panel);
  host.append(root);

  let view: RocketView | null = null;
  try {
    if (canDrawWebGL()) view = createRocketView(canvas, () => context.reducedMotion());
  } catch (error) {
    console.warn(error);
  }
  // The lineup's labels, one per column of the canvas, under each rocket (the buttons below carry the names for screen readers).
  const tags = el("div", "stages__tags");
  tags.setAttribute("aria-hidden", "true");
  for (const id of CHOICES) tags.append(el("span", "stages__tag", context.summaries.find((summary) => summary.id === id)?.name ?? id));
  if (view) stage.append(tags);
  if (!view) {
    canvas.remove();
    stage.classList.add("stages__stage--flat");
    stage.append(el("p", "extra-note", "This browser cannot draw 3D pictures, so the climb runs without the picture of the rocket."));
  }

  /* -------------------------------------------------------------- */
  /* Loading missions.                                               */
  /* -------------------------------------------------------------- */

  const bundles = new Map<string, Promise<MissionBundle>>();
  const load = (id: string): Promise<MissionBundle> => {
    let bundle = bundles.get(id);
    if (!bundle) {
      bundle = context.loadBundle(id);
      bundles.set(id, bundle);
    }
    return bundle;
  };
  const summaryOf = (id: string) => context.summaries.find((summary) => summary.id === id);
  /** "Apollo 11, 1969". */
  const flightLine = (id: string, name?: string): string => {
    const summary = summaryOf(id);
    const year = summary ? yearOf(summary.date) : null;
    const title = name ?? summary?.name ?? id;
    return year === null ? title : `${title}, ${year}`;
  };

  /* -------------------------------------------------------------- */
  /* Screens.                                                        */
  /* -------------------------------------------------------------- */

  let screen: Screen = "loading";
  /** Counts screen changes, so a slow load cannot replace a newer screen. */
  let turn = 0;
  let run: Run | null = null;
  let stopLoop: (() => void) | null = null;

  const setScreen = (next: Screen, ...children: Node[]): void => {
    turn += 1;
    screen = next;
    root.dataset["screen"] = next;
    panel.replaceChildren(...children);
  };
  const heading = (text: string): HTMLHeadingElement => {
    const h = el("h3", "extra-heading", text);
    h.tabIndex = -1;
    return h;
  };
  const actions = (...buttons: HTMLButtonElement[]): HTMLDivElement => {
    const row = el("div", "extra-actions stages__actions");
    row.append(...buttons);
    return row;
  };
  const action = (text: string, primary: boolean, onClick: () => void): HTMLButtonElement => {
    const b = button(primary ? "button button--primary button--large" : "button", text);
    b.addEventListener("click", onClick, { signal: context.signal });
    return b;
  };
  const focus = (target: HTMLElement): void => {
    if (!disposed) target.focus();
  };
  const stop = (): void => {
    stopLoop?.();
    stopLoop = null;
    view?.setClimbing(false);
  };

  const showLoading = (text: string): void => {
    stop();
    const line = el("p", "extra-note", text);
    line.setAttribute("role", "status");
    setScreen("loading", line);
  };

  /** Open one mission's rocket, or say why it cannot be shown. */
  const openRocket = (id: string): void => {
    // The lineup goes as soon as a rocket is picked.
    view?.clear();
    showLoading("Loading the rocket.");
    const mine = turn;
    load(id).then(
      (bundle) => {
        if (disposed || turn !== mine) return;
        const climb = climbFor(bundle);
        if (climb) showReady(climb, bundle);
        else showMissing(bundle.mission.name, "noSequence");
      },
      (error: unknown) => {
        console.warn(error);
        if (!disposed && turn === mine) showMissing(summaryOf(id)?.name ?? id, "notLoaded");
      },
    );
  };

  /** The choice of rockets: the buttons at once, each rocket's name and picture as its mission loads. */
  const showChoose = (): void => {
    stop();
    const title = heading("Pick a rocket");
    const intro = el("p", "extra-text", "Each one climbs to orbit by dropping parts on the way up. You drop them.");
    const list = el("ul", "stages__choices");
    const names = CHOICES.map((id, index) => {
      const name = el("span", "stages__choice-name", `${summaryOf(id)?.name ?? id}'s rocket`);
      const flight = el("span", "stages__choice-flight", flightLine(id));
      const pick = button("stages__choice");
      pick.append(name, flight);
      const mark = (): void => view?.highlight(index);
      const unmark = (): void => view?.highlight(null);
      pick.addEventListener("click", () => openRocket(id), { signal: context.signal });
      pick.addEventListener("pointerenter", mark, { signal: context.signal });
      pick.addEventListener("focus", mark, { signal: context.signal });
      pick.addEventListener("pointerleave", unmark, { signal: context.signal });
      pick.addEventListener("blur", unmark, { signal: context.signal });
      const item = el("li");
      item.append(pick);
      list.append(item);
      return { name, flight };
    });
    const children: Node[] = [title, intro, list];
    if (view) children.push(el("p", "extra-note", "The drawings are simplified, and all drawn the same height: they are not to scale."));
    setScreen("choose", ...children);
    view?.showLineup(
      CHOICES.length,
      `Simplified drawings of the three rockets standing side by side, not to scale: ${CHOICES.map((id) => summaryOf(id)?.name ?? id).join(", ")}. Tap one to pick it, or use the buttons.`,
    );
    const first = list.querySelector("button");
    if (first) focus(first);
    const mine = turn;
    CHOICES.forEach((id, index) => {
      load(id).then(
        (bundle) => {
          if (disposed || turn !== mine) return;
          const shown = names[index];
          if (shown) {
            shown.name.textContent = bundle.mission.launch?.value.vehicle ?? shown.name.textContent;
            shown.flight.textContent = flightLine(id, bundle.mission.name);
          }
          const climb = climbFor(bundle);
          if (climb) view?.setLineupRocket(index, climb.liftoffParts);
        },
        (error: unknown) => console.warn(error),
      );
    });
  };

  // A tap on the lineup picks the rocket in that column; pointing at one marks it (the buttons do the same by keyboard).
  const columnAt = (event: MouseEvent): number => {
    const box = canvas.getBoundingClientRect();
    const column = Math.floor(((event.clientX - box.left) / Math.max(1, box.width)) * CHOICES.length);
    return Math.min(CHOICES.length - 1, Math.max(0, column));
  };
  canvas.addEventListener(
    "click",
    (event) => {
      const id = CHOICES[columnAt(event)];
      if (screen === "choose" && id) openRocket(id);
    },
    { signal: context.signal },
  );
  canvas.addEventListener("pointermove", (event) => screen === "choose" && view?.highlight(columnAt(event)), { signal: context.signal });
  canvas.addEventListener("pointerleave", () => screen === "choose" && view?.highlight(null), { signal: context.signal });

  const showMissing = (name: string, why: "noSequence" | "notLoaded"): void => {
    stop();
    const title = heading("This climb cannot be shown");
    const text =
      why === "noSequence"
        ? `This site does not have the times when ${name}'s rocket dropped its parts, so its climb cannot be shown here.`
        : `${name} could not be loaded, so its climb cannot be shown here.`;
    const fallback = action(`Try ${summaryOf(DEFAULT_MISSION)?.name ?? "Apollo 11"}'s rocket`, true, () => openRocket(DEFAULT_MISSION));
    const other = action("Pick a rocket", false, showChoose);
    setScreen("missing", title, el("p", "extra-text", text), actions(fallback, other));
    context.announce(text);
    focus(fallback);
  };

  const showReady = (climb: Climb, bundle: MissionBundle): void => {
    stop();
    view?.show(climb.liftoffParts, `${climb.rocket} standing on the launch pad, a simplified drawing.`);
    const eyebrow = el("p", "stages__flight", flightLine(climb.missionId, climb.missionName));
    const title = heading(climb.rocket);
    const intro = el(
      "p",
      "extra-text",
      "A rocket is built in stages, stacked one on top of another. When a stage has burned its fuel, the rocket drops it, so the rest is lighter and can keep climbing.",
    );
    const count = climb.drops.length;
    const how = el(
      "p",
      "extra-text",
      `This rocket drops ${count === 1 ? "one part" : `${count} parts`} on the way to orbit. Press Drop it when each part's gauge runs out.`,
    );
    const start = action("Start", true, () => startClimb(climb));
    const other = action("Try another rocket", false, showChoose);
    const children: Node[] = [eyebrow, title, intro, how, actions(start, other)];
    const launch = bundle.mission.launch;
    if (launch) children.push(sourcesBlock(launch.citations, launch.discrepancy));
    setScreen("ready", ...children);
    focus(start);
  };

  /* -------------------------------------------------------------- */
  /* The climb.                                                      */
  /* -------------------------------------------------------------- */

  /** What the line says about the real drop, exactly as cited. */
  const realLine = (drop: Drop): string =>
    drop.planned
      ? `${capitalize(drop.name)} was planned to come off at ${sayElapsed(drop.at.value)} on the mission clock. The real time was not recorded.`
      : `The real ${drop.name.replace(/^the /, "")} came off at ${sayElapsed(drop.at.value)} on the mission clock.`;

  const startClimb = (climb: Climb): void => {
    stop();
    const schedule = scheduleFor(climb);
    const state: Run = { climb, schedule, seconds: 0, next: 0, results: [], quietUntil: 0, orbitAt: null, coasting: false };
    run = state;
    view?.show(climb.liftoffParts, `${climb.rocket} climbing, a simplified drawing. Parts fall away as you drop them.`);
    view?.setClimbing(true);

    // What to drop next, and the clock.
    const nextLabel = el("p", "stages__label", "Next to drop");
    const nextName = el("p", "stages__part");
    const next = el("div", "stages__next");
    next.append(nextLabel, nextName);
    const clockLabel = el("p", "stages__label", "Mission clock");
    const clockValue = el("p", "stages__clock-value", clockFace(climb.liftoff));
    const clockUnits = el("p", "stages__label stages__units", "minutes : seconds");
    const clock = el("div", "stages__clock");
    clock.append(clockLabel, clockValue, clockUnits);
    // The clock and the gauge change every frame; screen readers hear each prompt and result instead.
    clock.setAttribute("aria-hidden", "true");
    const readout = el("div", "stages__readout");
    readout.append(next, clock);

    // The gauge: an illustration of how much is left until the real drop.
    const gaugeLabel = el("p", "stages__label", "How much is left");
    const gaugeFill = el("div", "stages__gauge-fill");
    const gaugeBar = el("div", "stages__gauge-bar");
    gaugeBar.append(gaugeFill);
    const gauge = el("div", "stages__gauge");
    gauge.append(gaugeLabel, gaugeBar);
    gauge.setAttribute("aria-hidden", "true");

    const dropButton = button("button button--primary button--large stages__drop", "Drop it");
    const line = el("p", "stages__line", "Liftoff. Press Drop it when the gauge runs out.");
    const lineSources = el("div", "stages__line-sources");
    const result = el("div", "stages__result");
    result.append(line, lineSources);
    const note = el(
      "p",
      "extra-note stages__note",
      "Simplified: the clock is sped up, most of all between drops. The gauge shows how much is left until the real drop, not fuel. The sky and ground only suggest the climb.",
    );
    setScreen("climbing", readout, gauge, dropButton, result, note);

    const showNext = (): void => {
      const drop = climb.drops[state.next];
      if (drop) {
        setText(nextName, capitalize(drop.name));
        gauge.hidden = false;
        dropButton.removeAttribute("aria-disabled");
      } else {
        setText(nextName, "Nothing left to drop");
        gauge.hidden = true;
        dropButton.setAttribute("aria-disabled", "true");
      }
    };
    const say = (text: string, drop: Drop | null, tone: "info" | "early" | "dropped"): void => {
      line.textContent = text;
      line.dataset["tone"] = tone;
      lineSources.replaceChildren(...(drop ? [sourcesBlock(drop.at.citations, drop.at.discrepancy)] : []));
    };
    const nextSentence = (): string => {
      const drop = climb.drops[state.next];
      return drop ? `Next to drop: ${drop.name}.` : "Nothing left to drop.";
    };

    const resolve = (kind: Result["kind"]): void => {
      const drop = climb.drops[state.next];
      if (!drop) return;
      state.results[state.next] = { kind, clock: missionAt(schedule, state.seconds) };
      state.next += 1;
      view?.drop(drop.parts);
      const lead = kind === "on-time" ? "On time." : "It dropped by itself.";
      say(`${lead} ${realLine(drop)}`, drop, "dropped");
      showNext();
      context.announce(`${lead} ${realLine(drop)} ${nextSentence()}`);
    };

    dropButton.addEventListener(
      "click",
      () => {
        if (run !== state || screen !== "climbing") return;
        const drop = climb.drops[state.next];
        const target = schedule.targets[state.next];
        if (!drop || target === undefined || state.seconds < state.quietUntil) return;
        if (judge(target, state.seconds) === "early") {
          state.quietUntil = state.seconds + EARLY_PAUSE;
          const text = `Not yet. ${capitalize(drop.name)} still ${drop.parts.length > 1 ? "have" : "has"} work to do.`;
          say(text, null, "early");
          context.announce(text);
          return;
        }
        resolve("on-time");
      },
      { signal: context.signal },
    );

    const tick = (dt: number): void => {
      if (run !== state) return;
      state.seconds += dt;
      const t = state.seconds;
      const clockNow = missionAt(schedule, t);
      setText(clockValue, clockFace(clockNow));
      const target = schedule.targets[state.next];
      if (target !== undefined && overdue(target, t)) resolve("auto");
      const upcoming = schedule.targets[state.next];
      if (upcoming !== undefined) {
        const from = state.next === 0 ? 0 : (schedule.targets[state.next - 1] ?? 0);
        const left = Math.min(1, Math.max(0, (upcoming - t) / Math.max(0.001, upcoming - from)));
        gaugeFill.style.transform = `scaleX(${left})`;
      }
      // The engines stop at orbit: the glow goes (an illustration, like the glow itself).
      if (clockNow >= climb.end - 1e-6 && !state.coasting) {
        state.coasting = true;
        view?.setClimbing(false);
      }
      const span = Math.max(1, climb.end - climb.liftoff);
      view?.update(t, (clockNow - climb.liftoff) / span, dt);
      // In orbit once the clock is done, every part has dropped, and the last one has gone.
      if (state.next >= climb.drops.length && t >= schedule.end && !view?.busy) {
        state.orbitAt ??= t;
        if (t - state.orbitAt >= ORBIT_PAUSE) showDone(state);
      }
    };

    showNext();
    gaugeFill.style.transform = "scaleX(1)";
    focus(dropButton);
    context.announce(`Liftoff. ${nextSentence()} Press Drop it when its gauge runs out.`);
    stopLoop = view ? view.onFrame(tick) : frameLoop(tick);
  };

  const showDone = (state: Run): void => {
    stop();
    const { climb } = state;
    const orbit = climb.orbit;
    const title = heading(orbit?.title ?? "The climb is over");
    const children: Node[] = [title];
    if (orbit) children.push(el("p", "extra-text", orbit.text.short), sourcesBlock(orbit.citations, orbit.discrepancy));

    const list = el("ol", "stages__summary");
    climb.drops.forEach((drop, index) => {
      const item = el("li", "stages__row");
      const result = state.results[index];
      const yours =
        result?.kind === "on-time" ? `You: ${sayClock(result.clock)}, on time` : "You: it dropped by itself";
      const times = el("div", "stages__row-times");
      times.append(
        el(
          "p",
          "stages__row-time",
          drop.planned
            ? `Planned: ${sayElapsed(drop.at.value)} (the real time was not recorded)`
            : `Real rocket: ${sayElapsed(drop.at.value)}`,
        ),
        el("p", "stages__row-yours", yours),
      );
      item.append(
        el("p", "stages__row-name", capitalize(drop.name)),
        times,
        sourcesBlock(drop.at.citations, drop.at.discrepancy),
      );
      list.append(item);
    });
    children.push(list);

    const again = action("Try again", true, () => startClimb(climb));
    const other = action("Try another rocket", false, showChoose);
    const open = action(`Open ${climb.missionName} at liftoff`, false, () =>
      context.openMission(climb.missionId, climb.liftoffEvent ? { event: climb.liftoffEvent.id } : { t: climb.liftoffAt }),
    );
    children.push(actions(again, other, open));
    setScreen("done", ...children);
    context.announce(`${title.textContent ?? ""}. Each part's real time and yours are listed below.`);
    focus(again);
  };

  /* -------------------------------------------------------------- */
  /* Start.                                                          */
  /* -------------------------------------------------------------- */

  // From an event card: that mission's rocket. From the list, or for anything that is not a flight: the choice.
  const asked = params.get("mission")?.trim().toLowerCase();
  if (asked && summaryOf(asked)?.kind === "flight") openRocket(asked);
  else showChoose();

  return {
    dispose() {
      disposed = true;
      stop();
      run = null;
      view?.dispose();
      view = null;
    },
  };
}

/** True when the browser can draw WebGL 2 (asked first, so three.js does not log an error when it cannot). */
function canDrawWebGL(): boolean {
  try {
    const probe = document.createElement("canvas").getContext("webgl2");
    probe?.getExtension("WEBGL_lose_context")?.loseContext();
    return probe !== null;
  } catch {
    return false;
  }
}

/** A frame loop for when there is no 3D view to drive one; it pauses while the page is hidden, as the view does. */
function frameLoop(callback: (dt: number) => void): () => void {
  let frame = 0;
  let last: number | null = null;
  const step = (now: number): void => {
    const dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    callback(dt);
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}

export const extra: Extra = { meta, mount };
