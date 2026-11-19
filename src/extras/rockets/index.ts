/**
 * "Three rockets": the Titan II, Saturn IB, and Saturn V standing side by
 * side, each model scaled to its cited height (rockets.ts), with a person
 * for scale. Choosing one (tap it, or a button) shows its height, the
 * flights on this site it launched, and a little about it.
 *
 * Simplified, and said so on screen: the models are the site's simple
 * shapes, proportioned by eye and then scaled to the true heights, so the
 * heights compare truly and the shapes only roughly; the person's height
 * (1.8 meters) is an illustration.
 */
import "./rockets.css";
import { Box3, CapsuleGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SphereGeometry, Vector3 } from "three";
import type { MissionBundle } from "../../content/missions/bundle.ts";
import type { Citation, MissionSummary } from "../../content/types.ts";
import { createMiniView, createVehicle, disposeObject, type MiniView, type Vehicle } from "../../scene/kit.ts";
import { sourcesBlock } from "../../ui/citations.ts";
import { button, el } from "../../ui/dom.ts";
import type { Extra, ExtraContext, ExtraMount } from "../types.ts";
import { meta } from "./meta.ts";
import { ROCKETS, heightMeters, liftoffParts, metersText, rocketOf, type Rocket } from "./rockets.ts";

/** The person beside the rockets, meters: an illustration for scale, not a cited height. */
const PERSON_HEIGHT = 1.8;
/** Space between the rockets, meters (a drawing choice). */
const GAP = 14;

interface Stand {
  rocket: Rocket;
  choice: HTMLButtonElement;
  label: HTMLDivElement;
  vehicle: Vehicle | null;
  /** Where the model stands, in the scene (it does not move). */
  box: Box3;
}

/** The flights a rocket launched, as found in the stories. */
interface Flights {
  names: string[];
  citations: Citation[];
  /** Flights whose stories could not be loaded, so the list may be short. */
  missing: number;
}

const listFormat = new Intl.ListFormat("en-US", { style: "long", type: "conjunction" });

function mount(host: HTMLElement, context: ExtraContext, params: URLSearchParams): ExtraMount {
  const { signal } = context;

  /* The page. */
  const root = el("div", "rk");
  const stage = el("div", "rk__stage");
  const canvas = el("canvas", "rk__canvas");
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    `Three rockets side by side at their true heights: ${ROCKETS.map((r) => `${r.name}, ${r.height.printed} feet`).join("; ")}; and a person, for scale.`,
  );
  const labels = el("div", "rk__labels");
  labels.setAttribute("aria-hidden", "true");
  const personLabel = el("div", "rk__label rk__label--person", "Person");
  labels.append(personLabel);
  stage.append(canvas, labels);

  const side = el("div", "rk__side");
  const intro = el(
    "p",
    "extra-note rk__intro",
    "These three rockets launched the crews on this site. They stand side by side at their true heights. Tap a rocket to learn about it.",
  );
  const choices = el("div", "segmented rk__choices");
  choices.setAttribute("role", "group");
  choices.setAttribute("aria-label", "Choose a rocket");
  const status = el("p", "extra-note rk__status", "Loading the rockets…");
  const card = el("section", "extra-panel rk__card");
  card.hidden = true;
  // Said on screen, as the header comment explains.
  const note = el(
    "p",
    "extra-note rk__note",
    `Simplified: each rocket is a simple model, stretched to its true height, so the heights compare truly but the shapes are only close. The person is ${PERSON_HEIGHT} meters (about 6 feet) tall, an example for scale.`,
  );
  side.append(intro, choices, status, card, note);
  root.append(stage, side);
  host.append(root);

  const stands: Stand[] = ROCKETS.map((rocket) => {
    const choice = button("segmented__item rk__choice", rocket.name);
    choice.setAttribute("aria-pressed", "false");
    const label = el("div", "rk__label");
    label.append(el("span", "rk__label-name", rocket.name), el("span", "rk__label-height", `${rocket.height.printed} ft`));
    label.hidden = true;
    choices.append(choice);
    labels.append(label);
    return { rocket, choice, label, vehicle: null, box: new Box3() };
  });

  /* The view. Without WebGL the cards still work, and the screen says why the picture is missing. */
  let view: MiniView | null = null;
  try {
    view = createMiniView(canvas);
  } catch {
    view = null;
    stage.classList.add("rk__stage--none");
    stage.replaceChildren(
      el("p", "extra-note", "This browser cannot draw 3D pictures, so the rockets are not shown. Choose a rocket to read about it."),
    );
  }

  // A person to compare with: a plain shape, built here (the kit has no people).
  const personMaterial = new MeshStandardMaterial({ color: 0xd9d4ca, roughness: 0.8 });
  const person = new Group();
  const head = 0.13;
  const bodyRadius = 0.2;
  const bodyLength = PERSON_HEIGHT - 2 * head - 2 * bodyRadius - 0.02;
  const body = new Mesh(new CapsuleGeometry(bodyRadius, bodyLength, 4, 10), personMaterial);
  body.position.y = bodyRadius + bodyLength / 2;
  const headMesh = new Mesh(new SphereGeometry(head, 16, 12), personMaterial);
  headMesh.position.y = PERSON_HEIGHT - head;
  person.add(body, headMesh);
  const ground = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ color: 0x0d0f13 }));
  ground.rotation.x = -Math.PI / 2;

  /* Labels above each rocket, placed after each frame. */
  const top = new Vector3();
  const corner = new Vector3();
  /** Each rocket's box on screen when last drawn, for tapping. */
  let onScreen: { stand: Stand; left: number; right: number; top: number; bottom: number }[] = [];
  const toScreen = (point: Vector3): { x: number; y: number } => {
    point.project((view as MiniView).camera);
    return { x: ((point.x + 1) / 2) * canvas.clientWidth, y: ((1 - point.y) / 2) * canvas.clientHeight };
  };
  const placeLabels = (): void => {
    if (!view) return;
    const shown: typeof onScreen = [];
    for (const stand of stands) {
      if (!stand.vehicle) continue;
      const box = stand.box;
      const at = toScreen(top.set((box.min.x + box.max.x) / 2, box.max.y, 0));
      stand.label.style.transform = `translate(${Math.round(at.x)}px, ${Math.round(at.y)}px)`;
      stand.label.hidden = false;
      let left = Infinity;
      let right = -Infinity;
      let high = Infinity;
      let low = -Infinity;
      for (let i = 0; i < 8; i += 1) {
        corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
        const p = toScreen(corner);
        left = Math.min(left, p.x);
        right = Math.max(right, p.x);
        high = Math.min(high, p.y);
        low = Math.max(low, p.y);
      }
      shown.push({ stand, left, right, top: high, bottom: low });
    }
    const p = toScreen(top.copy(person.position).setY(PERSON_HEIGHT * 0.6));
    personLabel.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
    personLabel.hidden = !person.parent;
    onScreen = shown;
  };
  personLabel.hidden = true;

  /** Stand the loaded rockets in a row, smallest first, with the person at the left, and frame them. */
  const standUp = (): void => {
    if (!view) return;
    let x = 0;
    person.position.set(x, 0, 0);
    view.scene.add(person);
    x += 0.5 + 3;
    let tallest = PERSON_HEIGHT;
    for (const stand of stands) {
      const vehicle = stand.vehicle;
      if (!vehicle) continue;
      vehicle.setHeight(heightMeters(stand.rocket));
      vehicle.object.position.set(0, 0, 0);
      vehicle.object.updateMatrixWorld(true);
      const box = stand.box.setFromObject(vehicle.object);
      vehicle.object.position.x = x - box.min.x;
      vehicle.object.updateMatrixWorld(true);
      stand.box.setFromObject(vehicle.object);
      x += box.max.x - box.min.x + GAP;
      tallest = Math.max(tallest, vehicle.top);
      view.scene.add(vehicle.object);
    }
    const width = x - GAP + 0.5;
    // Wide enough that its edges stay out of view, a plain dark floor to stand on.
    ground.scale.set(3000, 3000, 1);
    ground.position.set(width / 2 - 0.5, 0, 0);
    view.scene.add(ground);
    // Room above the tallest for its label.
    const center = new Vector3(width / 2 - 0.5, tallest * 0.54, 0);
    const radius = Math.max(tallest * 0.56, width * 0.55);
    view.frame(center, radius, new Vector3(0, 0.08, 1).normalize());
    // Turn a little either way and look from a little higher, never from below the ground.
    view.controls.minPolarAngle = Math.PI / 2 - 0.6;
    view.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    view.controls.minAzimuthAngle = -1;
    view.controls.maxAzimuthAngle = 1;
    view.controls.minDistance = radius * 0.4;
    view.scene.onAfterRender = placeLabels;
    view.requestRender();
  };

  /* Choosing a rocket. */
  let chosen: Stand | null = null;
  const byProgram = new Map<string, Promise<{ bundles: MissionBundle[]; missing: number }>>();

  /** Every flight's story in a program, loaded once, when one of its rockets is first chosen. */
  const programBundles = (program: string): Promise<{ bundles: MissionBundle[]; missing: number }> => {
    let loading = byProgram.get(program);
    if (!loading) {
      const flights = context.summaries.filter((s: MissionSummary) => s.kind === "flight" && s.program === program);
      loading = Promise.allSettled(flights.map((s) => context.loadBundle(s.id))).then((results) => ({
        bundles: results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])),
        missing: results.filter((r) => r.status === "rejected").length,
      }));
      byProgram.set(program, loading);
    }
    return loading;
  };

  const flightsOf = async (rocket: Rocket): Promise<Flights> => {
    const { bundles, missing } = await programBundles(rocket.program);
    const launched = bundles.filter((b) => rocketOf(b) === rocket);
    return {
      names: launched.map((b) => b.mission.name),
      citations: launched.flatMap((b) => b.mission.launch?.citations ?? []),
      missing,
    };
  };

  const showCard = (stand: Stand): void => {
    const { rocket } = stand;
    const heading = el("h3", "extra-heading", rocket.name);
    heading.id = `rk-name-${rocket.id}`;
    card.setAttribute("aria-labelledby", heading.id);
    const height = el("p", "extra-text rk__height");
    height.append(el("strong", undefined, `${rocket.height.printed} feet`), " tall with its spacecraft on top, as launched.");
    const meters = el("p", "extra-note rk__meters", `That is ${metersText(rocket)} (our conversion from feet).`);
    const flights = el("p", "extra-text rk__flights", "Finding the flights it launched…");
    const about = el("p", "extra-text rk__about", rocket.about.text.short);
    const sources = (extra: Citation[] = []): HTMLDetailsElement =>
      sourcesBlock([...rocket.height.citations, ...rocket.about.citations, ...extra], rocket.height.discrepancy, rocket.about.discrepancy);
    const block = sources();
    card.replaceChildren(heading, height, meters, flights, about, block);
    card.hidden = false;
    void flightsOf(rocket).then((found) => {
      if (signal.aborted || chosen !== stand) return;
      const list = found.names.length > 0 ? listFormat.format(found.names) : "none of the flights that could be loaded";
      flights.textContent = `On this site it launched ${list}.`;
      if (found.missing > 0) flights.append(" ", el("span", "extra-note", "Some flights could not be loaded, so this list may be short."));
      block.replaceWith(sources(found.citations));
    });
  };

  const choose = (stand: Stand, how: "visitor" | "first"): void => {
    chosen = stand;
    for (const s of stands) {
      s.choice.setAttribute("aria-pressed", String(s === stand));
      s.label.classList.toggle("is-chosen", s === stand);
    }
    showCard(stand);
    if (how === "visitor") context.announce(`${stand.rocket.name}: ${stand.rocket.height.printed} feet tall.`);
  };
  for (const stand of stands) stand.choice.addEventListener("click", () => choose(stand, "visitor"), { signal });

  // A tap (not a drag) on a rocket, or just above it on its label, chooses it.
  let down: { x: number; y: number; time: number } | null = null;
  canvas.addEventListener("pointerdown", (e) => (down = { x: e.offsetX, y: e.offsetY, time: performance.now() }), { signal });
  canvas.addEventListener("pointercancel", () => (down = null), { signal });
  canvas.addEventListener(
    "pointerup",
    (e) => {
      const start = down;
      down = null;
      if (!start || Math.hypot(e.offsetX - start.x, e.offsetY - start.y) > 8 || performance.now() - start.time > 600) return;
      const slack = 12;
      const hits = onScreen.filter(
        (s) => e.offsetX >= s.left - slack && e.offsetX <= s.right + slack && e.offsetY >= s.top - 48 && e.offsetY <= s.bottom + slack,
      );
      const middle = (s: (typeof onScreen)[number]): number => Math.abs(e.offsetX - (s.left + s.right) / 2);
      const hit = hits.sort((a, b) => middle(a) - middle(b))[0];
      if (hit) choose(hit.stand, "visitor");
    },
    { signal },
  );

  /* Loading: the three part lists, then the picture; the first card follows the mission behind the sheet. */
  void (async () => {
    const results = await Promise.allSettled(ROCKETS.map((rocket) => context.loadBundle(rocket.partsFrom)));
    if (signal.aborted) return;
    const failed: string[] = [];
    results.forEach((result, i) => {
      const stand = stands[i];
      if (!stand) return;
      const parts = result.status === "fulfilled" ? liftoffParts(result.value) : null;
      if (!parts) {
        if (result.status === "rejected") console.warn(result.reason);
        failed.push(stand.rocket.name);
        return;
      }
      if (view) stand.vehicle = createVehicle({ layout: "launch", parts });
    });
    standUp();
    if (failed.length > 0) {
      status.textContent = `The ${listFormat.format(failed)} could not be drawn. The others are shown.`;
      context.announce(status.textContent);
    } else {
      status.hidden = true;
    }
    let first = stands.find((s) => s.rocket.id === "saturn-v");
    const wanted = params.get("mission") ?? context.missionId;
    try {
      const rocket = rocketOf(await context.loadBundle(wanted));
      first = stands.find((s) => s.rocket === rocket) ?? first;
    } catch {
      // Not a flight with a story: start with the Saturn V.
    }
    if (signal.aborted || chosen) return;
    if (first) choose(first, "first");
  })();

  return {
    dispose() {
      if (view) {
        view.scene.onAfterRender = () => undefined;
        for (const stand of stands) {
          if (stand.vehicle) view.scene.remove(stand.vehicle.object);
        }
        view.scene.remove(person, ground);
      }
      for (const stand of stands) stand.vehicle?.dispose();
      disposeObject(person);
      disposeObject(ground);
      view?.dispose();
      view = null;
    },
  };
}

export const extra: Extra = { meta, mount };
