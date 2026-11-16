import { copy } from '../content/copy';
import type { Fact, Mission } from '../content/types';
import type { Citation } from '../content/types';
import { discrepancyNote, sourcesBlock } from './citations';
import { byId, el } from './dom';
import { formatDate, formatTimeOfDay, missionDates } from './format';

/** Any notes where sources disagree, then the folded list of sources. */
function sources(citations: readonly Citation[], ...discrepancies: Array<string | undefined>): HTMLElement[] {
  const notes = discrepancies.filter((text): text is string => Boolean(text)).map(discrepancyNote);
  return [...notes, sourcesBlock(citations)];
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
      : copy.about.launch(`${formatDate(when)}, at ${formatTimeOfDay(when).slice(0, 5)} UTC`, launch.site, launch.vehicle);
    byline.append(el('span', 'about__launch', line));
  }
  if (byline.childElementCount) intro.append(byline);
  intro.append(factText(mission.summary, 'about__summary'));
  const introCitations = [...mission.summary.citations, ...(mission.launch?.citations ?? [])];
  intro.append(...sources(introCitations, mission.summary.discrepancy, mission.launch?.discrepancy));
  parts.push(intro);

  // Crew.
  const crew = section(copy.about.crew);
  const crewList = el('ul', 'about__crew');
  for (const member of mission.crew.value) {
    const item = el('li', 'about__crew-member');
    item.append(el('span', 'about__crew-name', member.name), el('span', 'about__crew-role', member.role));
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
      item.append(el('span', 'about__crew-name', sign.name), el('span', 'about__crew-role', sign.craft));
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
    const now = section(copy.about.whereNow);
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

/** Fill the "How this is drawn" note. */
export function renderHowDrawn(): void {
  byId('drawn-title', HTMLHeadingElement).textContent = copy.howDrawn.title;
  const body = byId('drawn-body', HTMLDivElement);
  body.replaceChildren(...copy.howDrawn.paragraphs.map((text) => el('p', 'note__paragraph', text)));
}
