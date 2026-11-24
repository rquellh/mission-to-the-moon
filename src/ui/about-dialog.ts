import type { FlightOutline } from '../app/outline';
import { copy } from '../content/copy';
import type { Fact, Mission } from '../content/types';
import type { Citation } from '../content/types';
import { sourcesBlock } from './citations';
import { byId, el } from './dom';
import { formatDate, formatTimeOfDay, missionDates } from './format';
import { fillPhoto } from './photo';

/** The folded list of sources, with any notes where sources disagree inside it. */
function sources(
  citations: readonly Citation[],
  ...discrepancies: Array<string | undefined>
): HTMLElement[] {
  return [sourcesBlock(citations, ...discrepancies)];
}

function section(title: string): HTMLElement {
  const block = el('section', 'about__section');
  block.append(el('h3', 'about__heading', title));
  return block;
}

function factText(fact: Fact, className: string): HTMLElement {
  const wrap = el('div', className);
  wrap.append(el('p', 'about__short', fact.text.short));
  if (fact.text.more) wrap.append(el('p', 'about__more', fact.text.more));
  return wrap;
}

/** Fill the "About this mission" dialog: summary, crew, accomplishments, and where the craft are now. */
export function renderAbout(mission: Mission): void {
  byId('about-title', HTMLHeadingElement).textContent = `${copy.about.titlePrefix} ${mission.name}`;
  const body = byId('about-body', HTMLDivElement);
  const parts: HTMLElement[] = [];

  // Summary, with the dates and launch details as its byline.
  const intro = el('section', 'about__section about__section--intro');
  const dates = missionDates(mission);
  const byline = el('p', 'about__byline');
  if (dates) byline.append(el('span', 'about__dates', dates));
  if (mission.launch) {
    const launch = mission.launch.value;
    const when = new Date(launch.utc);
    const line = Number.isNaN(when.getTime())
      ? copy.about.launchUndated(launch.site, launch.vehicle)
      : copy.about.launch(
          `${formatDate(when)}, at ${formatTimeOfDay(when).slice(0, 5)} UTC`,
          launch.site,
          launch.vehicle,
        );
    byline.append(el('span', 'about__launch', line));
  }
  if (byline.childElementCount) intro.append(byline);
  intro.append(factText(mission.summary, 'about__summary'));
  const introCitations = [...mission.summary.citations, ...(mission.launch?.citations ?? [])];
  intro.append(
    ...sources(introCitations, mission.summary.discrepancy, mission.launch?.discrepancy),
  );
  parts.push(intro);

  // Crew: NASA's portrait when the mission has one, then the names and roles.
  const crew = section(copy.about.crew);
  if (mission.crewPhoto) {
    const figure = el('figure', 'card__photo about__crew-photo');
    fillPhoto(figure, mission.crewPhoto);
    // Say who is who for people looking at the picture. The words are the
    // photo's own description, which screen readers already get from the image.
    const who = el('p', 'about__crew-who', mission.crewPhoto.alt);
    who.setAttribute('aria-hidden', 'true');
    figure.insertBefore(who, figure.lastElementChild);
    crew.append(figure);
  }
  const crewList = el('ul', 'about__crew');
  for (const member of mission.crew.value) {
    const item = el('li', 'about__crew-member');
    item.append(
      el('span', 'about__crew-name', member.name),
      el('span', 'about__crew-role', member.role),
    );
    crewList.append(item);
  }
  crew.append(crewList, ...sources(mission.crew.citations, mission.crew.discrepancy));
  parts.push(crew);

  // Call signs.
  if (mission.callSigns && mission.callSigns.value.length) {
    const calls = section(copy.about.callSigns);
    const list = el('ul', 'about__crew');
    for (const sign of mission.callSigns.value) {
      const item = el('li', 'about__crew-member');
      item.append(
        el('span', 'about__crew-name', sign.name),
        el('span', 'about__crew-role', sign.craft),
      );
      list.append(item);
    }
    calls.append(list, ...sources(mission.callSigns.citations, mission.callSigns.discrepancy));
    parts.push(calls);
  }

  // Accomplishments.
  if (mission.accomplishments.length) {
    const done = section(copy.about.accomplishments);
    const list = el('ol', 'about__list');
    for (const fact of mission.accomplishments) {
      const item = el('li', 'about__item');
      item.append(factText(fact, 'about__fact'), ...sources(fact.citations, fact.discrepancy));
      list.append(item);
    }
    done.append(list);
    parts.push(done);
  }

  // Where the spacecraft are now.
  if (mission.whereNow && mission.whereNow.length) {
    const now = section(copy.about.whereNow(mission.whereNow.length));
    const list = el('ul', 'about__list');
    for (const exhibit of mission.whereNow) {
      const item = el('li', 'about__item');
      const text = el('div', 'about__fact');
      text.append(
        el('p', 'about__short about__object', exhibit.value.object),
        el('p', 'about__more', `${exhibit.value.museum}, ${exhibit.value.place}`),
      );
      item.append(text, ...sources(exhibit.citations, exhibit.discrepancy));
      list.append(item);
    }
    now.append(list);
    parts.push(now);
  }

  body.replaceChildren(...parts);
}

/**
 * The "How this is drawn" paragraphs that are true of this flight: they
 * depend on how far it went and on what its flight plan holds.
 */
export function howDrawnParagraphs(mission: Mission, flight: FlightOutline): string[] {
  const text = copy.howDrawn;
  const where = mission.destination;
  const moon = where === 'moon';
  const exact = flight.landsOnMoon
    ? text.exact.moonLanding
    : flight.splashdown
      ? text.exact.splashdown
      : text.exact.other;
  return [
    ...(moon ? [text.heldStill] : []),
    exact,
    text.path[where],
    text.scale[where],
    flight.ships > 1 ? text.models.many : text.models.one,
    ...(!moon && flight.ships > 1 ? [text.closeTogether] : []),
    ...(flight.turns ? [text.turning] : []),
    ...(!moon ? [text.loops] : []),
    text.sunlight[where],
  ];
}

/** Fill the "How this is drawn" note. */
export function renderHowDrawn(mission: Mission, flight: FlightOutline): void {
  byId('drawn-title', HTMLHeadingElement).textContent = copy.howDrawn.title;
  const body = byId('drawn-body', HTMLDivElement);
  body.replaceChildren(
    ...howDrawnParagraphs(mission, flight).map((line) => el('p', 'note__paragraph', line)),
  );
}
