/**
 * The patch book: a page for every flight, in order, plus Apollo 1.
 *
 * A flight's patch is "collected" once this device has opened that flight.
 * The book only reads that list and never writes it, so it cannot lose what
 * the site has stored. Apollo 1 never flew, so its page is always filled in,
 * as a page of remembrance rather than something to collect.
 *
 * Tapping a filled page shows it larger in place of the grid, like turning
 * to that page. "All patches" (or Escape) turns back and puts focus on the
 * patch it came from.
 */
import "./patches.css";
import type { MissionSummary, Program } from "../../content/types.ts";
import { externalLink, sourcesBlock } from "../../ui/citations.ts";
import { button, el, hiddenText } from "../../ui/dom.ts";
import { icon } from "../../ui/icons.ts";
import type { Extra } from "../types.ts";
import { meta } from "./meta.ts";
import { openedMissions, pageFor, type PatchPage, type PatchShape } from "./pages.ts";

/**
 * The site's own list of the missions whose tour or exploring has started on
 * this device (see STORING in ../types.ts). Extras can read it, not change it.
 */
const OPENED_KEY = "visited-missions";

const PROGRAMS: readonly { id: Program; title: string }[] = [
  { id: "gemini", title: "Gemini" },
  { id: "apollo", title: "Apollo" },
];

interface Entry {
  summary: MissionSummary;
  page: PatchPage;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/** The quiet outline of a patch not collected yet, on a 100-unit grid. */
function outline(shape: PatchShape): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const shapes: Record<PatchShape, string> = {
    circle: "M50 4a46 46 0 1 1 0 92a46 46 0 1 1 0-92z",
    oval: "M50 14c26 0 47 16 47 36s-21 36-47 36S3 70 3 50s21-36 47-36z",
    hexagon: "M27 10h46l23 40-23 40H27L4 50z",
    shield: "M8 12h84v40c0 22-18 38-42 44C26 90 8 74 8 52z",
    arch: "M50 4c20 16 34 38 34 62a34 30 0 0 1-68 0c0-24 14-46 34-62z",
    triangle: "M50 6c3 0 5 2 7 5l37 70c4 8-1 13-9 13H15c-8 0-13-5-9-13L43 11c2-3 4-5 7-5z",
  };
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", shapes[shape]);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.75");
  path.setAttribute("stroke-dasharray", "5 4");
  path.setAttribute("vector-effect", "non-scaling-stroke");
  svg.append(path);
  return svg;
}

export const extra: Extra = {
  meta,
  mount(host, context) {
    const { signal } = context;
    const opened = openedMissions(context.store.get<unknown>(OPENED_KEY));

    const entries: Entry[] = [];
    for (const summary of context.summaries) {
      const page = pageFor(summary.id);
      if (page) entries.push({ summary, page });
    }
    const flights = entries.filter((entry) => entry.summary.kind === "flight");
    const collected = flights.filter((entry) => opened.has(entry.summary.id)).length;
    const isFilled = (entry: Entry): boolean => entry.summary.kind === "memorial" || opened.has(entry.summary.id);

    // The sheet's body scrolls, not the page: remember its place while a patch is shown.
    const scroller = host.closest<HTMLElement>(".dialog__body");

    const book = el("div", "patches__book");
    const detail = el("div", "patches__detail");
    detail.hidden = true;
    host.append(book, detail);

    /* ------------------------------ The grid ---------------------------- */

    const intro = el("div", "patches__intro");
    intro.append(
      el("p", "extra-text", "Every flight has a page in this book. Open a mission, and its patch appears here in color."),
      el("p", "extra-note", "The book remembers the missions you open on this device."),
      el("p", "patches__count", `${collected} of ${flights.length} flights collected`),
    );
    book.append(intro);

    const paper = (page: PatchPage): HTMLElement => {
      const box = el("span", "patches__paper");
      if (page.emblem) {
        const image = el("img", "patches__image");
        image.src = context.asset(page.emblem.src);
        image.alt = "";
        image.width = page.emblem.width;
        image.height = page.emblem.height;
        image.loading = "lazy";
        image.decoding = "async";
        image.addEventListener("error", () => image.remove(), { signal });
        box.append(image);
      } else {
        box.classList.add("patches__paper--none");
        box.append(el("span", "patches__none", "No crew patch"));
      }
      return box;
    };

    const filledSlot = (entry: Entry): HTMLLIElement => {
      const { summary, page } = entry;
      const slot = el("li", "patches__slot patches__slot--filled");
      const open = button("patches__open");
      const memorial = summary.kind === "memorial";
      // A page with no patch already says so on its paper.
      const note = memorial ? "In memory of the crew" : undefined;
      open.setAttribute(
        "aria-label",
        page.emblem ? `${summary.name} patch${memorial ? ", in memory of the crew" : ""}` : `${summary.name}, no crew patch`,
      );
      open.append(paper(page), el("span", "patches__name", summary.name));
      if (note) open.append(el("span", "patches__hint", note));
      open.addEventListener("click", () => show(entry, open), { signal });
      slot.append(open);
      return slot;
    };

    const emptySlot = (entry: Entry): HTMLLIElement => {
      const { summary, page } = entry;
      const slot = el("li", "patches__slot patches__slot--empty");
      const shape = el("span", "patches__outline");
      shape.append(outline(page.shape));
      const fly = button("button patches__fly");
      fly.append("Fly it", hiddenText(`: ${summary.name}`));
      // Start the flight itself, not the mission list, so opening it counts as a visit.
      fly.addEventListener("click", () => context.openMission(summary.id, { start: summary.hasTour ? "tour" : "explore" }), {
        signal,
      });
      slot.append(
        shape,
        el("span", "patches__name", summary.name),
        el("span", "patches__hint", page.emblem ? "Fly this mission to collect its patch." : "Fly this mission to fill in its page."),
        fly,
      );
      return slot;
    };

    for (const program of PROGRAMS) {
      const inProgram = entries.filter((entry) => entry.summary.program === program.id);
      if (inProgram.length === 0) continue;
      const section = el("section", "patches__program");
      const heading = el("h3", "extra-heading", program.title);
      heading.id = `patches-${program.id}`;
      section.setAttribute("aria-labelledby", heading.id);
      const grid = el("ul", "patches__grid");
      grid.setAttribute("role", "list");
      for (const entry of inProgram) grid.append(isFilled(entry) ? filledSlot(entry) : emptySlot(entry));
      section.append(heading, grid);
      book.append(section);
    }

    /* --------------------------- One patch, larger ------------------------ */

    let returnTo: HTMLElement | null = null;
    let returnScroll = 0;

    function show(entry: Entry, from: HTMLElement): void {
      const { summary, page } = entry;
      returnTo = from;
      returnScroll = scroller?.scrollTop ?? 0;

      const back = button("button button--quiet patches__back");
      back.append(icon("previous"), "All patches");
      back.addEventListener("click", turnBack, { signal });

      const title = el("h3", "extra-heading patches__title", summary.name);
      title.tabIndex = -1;

      const figure = el("figure", "patches__figure");
      if (page.emblem) {
        const frame = el("div", "patches__paper patches__paper--large");
        const image = el("img", "patches__image");
        image.src = context.asset(page.emblem.src);
        image.alt = page.emblem.alt;
        image.width = page.emblem.width;
        image.height = page.emblem.height;
        image.decoding = "async";
        frame.append(image);
        const credit = el("figcaption", "patches__credit");
        credit.append(`Image: ${page.emblem.credit}. `, externalLink(page.emblem.sourceUrl, "Original"));
        figure.append(frame, credit);
      } else {
        const frame = el("div", "patches__paper patches__paper--large patches__paper--none");
        frame.append(el("span", "patches__none", "No crew patch"));
        figure.append(frame);
      }

      const words = el("div", "patches__words");
      words.append(el("p", "extra-text", page.fact.text.short), sourcesBlock(page.fact.citations, page.fact.discrepancy));
      if (summary.kind === "memorial") {
        const visit = button("button button--quiet patches__visit", `Read about the ${summary.name} crew`);
        visit.addEventListener("click", () => context.openMission(summary.id), { signal });
        words.append(visit);
      }

      const spread = el("div", "patches__spread");
      spread.append(figure, words);
      detail.replaceChildren(back, title, spread);
      book.hidden = true;
      detail.hidden = false;
      if (scroller) scroller.scrollTop = 0;
      title.focus({ preventScroll: true });
    }

    function turnBack(): void {
      if (detail.hidden) return;
      detail.hidden = true;
      detail.replaceChildren();
      book.hidden = false;
      if (scroller) scroller.scrollTop = returnScroll;
      returnTo?.focus({ preventScroll: true });
      returnTo = null;
    }

    // Escape turns back to the grid first; only on the grid does it close the sheet.
    host.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape" || detail.hidden) return;
        event.preventDefault();
        turnBack();
      },
      { signal },
    );

    return {
      dispose() {
        returnTo = null;
        host.replaceChildren();
      },
    };
  },
};
