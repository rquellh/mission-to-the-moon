---
name: e2e-testing
description: Expert at writing, debugging, running, and fixing the Playwright E2E (browser) tests for Mission to the Moon. Use when the user asks about E2E or browser tests, Playwright, specs, page objects, data-testid attributes, the scene report, a deep link a test should open, debugging a browser test failure, or running the E2E suite. Applies this project's browser testing standards with strict enforcement.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash(npm run test:e2e*), Bash(npx playwright*), TodoWrite
---

# E2E Testing Skill - Mission to the Moon

You are an expert Playwright test engineer for Mission to the Moon. You write, debug, run, and fix E2E tests following strict best practices.

**Scope:** This skill covers **how** to write Playwright E2E tests. For deciding **what** to test at which layer, use the `test-planning` skill. For Vitest tests (interface tests, and content and flight tests), use the `vitest-testing` skill.

The site is static: no server, no API, no accounts. Every page draws a 3D scene into `canvas#stage` with WebGL, in software when there is no graphics card, so every E2E test is slow and must earn its place. The tests drive the Google Chrome installed on the machine (`channel: 'chrome'`, software WebGL) in two projects, `chrome-desktop` (1280x800) and `chrome-phone` (Pixel 7). Everything an E2E test needs to know about the canvas comes from the **scene report** (section 5), never from pixels.

---

## 1. Adding data-testid Attributes to the Site

**ALWAYS add data-testid attributes to the site first.** Don't settle for CSS classes, ids, roles, or text.

Static markup is in `index.html`; the scripts in `src/ui/*.ts` build the rest (the card's recording and photo, the tour panel, the view buttons, the chapters, the mission list, "Up next" at the end of an extra's run). An extra builds its own elements, so their test ids are in its folder (`src/extras/docking/index.ts`: `docking-start`, `docking-aim`, `docking-docked`), named for the extra. Playwright's `getByTestId()` reads `data-testid`, its default `testIdAttribute`; the config leaves it at that default.

A test id is an **attribute-only** change: never change behavior, text, ids, classes, structure, or styles to add one. In script, use `setAttribute('data-testid', ...)` (not `dataset`) so a search for `data-testid` finds every one.

### Static vs Dynamic IDs

```html
<!-- STATIC - unique elements, in index.html -->
<section class="tour" id="tour" aria-label="Guided tour" hidden data-testid="tour-panel"></section>
<button type="button" class="play" id="play" aria-label="Play" data-testid="timeline-play"></button>
<span class="clock__met" id="clock-met" data-testid="clock-time">00:00:00</span>
```

```typescript
// STATIC - a unique element built by the script (src/ui/tour-panel.ts)
const next = button('button button--primary tour__next');
next.setAttribute('data-testid', 'tour-next');

// DYNAMIC - repeated items, by the entity's id (src/ui/view-controls.ts, src/ui/timeline.ts)
viewButton.setAttribute('data-testid', `view-button-${view}`);
chapterButton.setAttribute('data-testid', `chapter-${start.chapter.id}`);
```

The id in a dynamic test id is always a content id: a mission id (`apollo-11`), an event id (`liftoff`), a chapter id (`landing`), an extra id (`stages`), or a view id (`spacecraft`). Never a position in a list, and never a title (titles are content and change).

### Naming Convention

Pattern: `{component}-{entity-id?}-{element}`

| Type              | Pattern                      | Example                                                                                                                                                                                                                                                                                                   |
| ----------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Container         | `{component}`                | `welcome`, `dock`, `records`, `tour-panel`, `ending`, `event-card`, `hub`, `extra-sheet`, `up-next`, `about-dialog`                                                                                                                                                                                       |
| Container element | `{component}-{element}`      | `welcome-tour`, `welcome-all-missions`, `controls-toggle`, `records-close`, `tour-next`, `event-card-title`, `event-card-finish`, `ending-next`, `ending-more-toggle`, `ending-pick-next`, `up-next-primary`, `up-next-more-toggle`, `docking-start`, `timeline-play`, `clock-time`, `about-dialog-close` |
| Dynamic container | `{component}-{id}`           | `hub-mission-apollo-11`, `view-button-moon`, `chapter-landing`, `tour-dot-liftoff`                                                                                                                                                                                                                        |
| Dynamic child     | `{component}-{id}-{element}` | `hub-mission-apollo-11-tour`, `hub-mission-apollo-1-read`, `hub-extra-stages-open`                                                                                                                                                                                                                        |

`<body data-testid="site">` is the page itself: it carries the state classes `is-ready`, `is-welcome`, `is-touring`, and `no-3d`.

**Test ids locate; state attributes are what you assert.** The site already says what state it is in, so read that rather than adding test ids for states:

| Element                                                              | State                                                                                                                 |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `site` (body)                                                        | classes `is-ready`, `is-welcome`, `is-touring`, `no-3d`                                                               |
| `tour-panel`                                                         | `data-phase`: `off`, `traveling`, `stopped`, `finished` (hidden once finished: the end of the flight takes its place) |
| `records-toggle`, `controls-toggle` (the moment card's two doors)    | `aria-expanded`                                                                                                       |
| `ending-more-toggle` (the end of a flight's "More to explore" door)  | `aria-expanded`                                                                                                       |
| `ending-again`                                                       | `aria-label`: `Watch again`, or `Start the tour again` after a tour                                                   |
| `extra-sheet`                                                        | `data-extra`: the open extra's id                                                                                     |
| `up-next-more-toggle` (on a phone, the door that pulls "Up next" up) | `aria-expanded`                                                                                                       |
| `docking-aim` (the docking extra's "Off center" read-out)            | its text: `Lined up` once the nose is lined up                                                                        |
| `view-button-<view>`, `scale-toggle`                                 | `aria-pressed`                                                                                                        |
| `timeline-play`                                                      | `aria-label`: `Play`, `Pause`                                                                                         |
| `hub-mission-<id>`                                                   | `aria-current="true"` on the loaded mission                                                                           |

### Real Examples

**index.html** - the header:

```html
<header class="masthead" id="masthead" data-testid="masthead">
  ...
  <button
    type="button"
    class="masthead__switch"
    id="hub-button"
    aria-haspopup="dialog"
    data-testid="masthead-missions"
  >
    <span class="masthead__label">
      <span class="masthead__name" id="mission-name" data-testid="masthead-mission-name"></span>
      <span class="masthead__dates" id="mission-dates" data-testid="masthead-mission-dates"></span>
    </span>
  </button>
```

**index.html** - the moment card's doors:

```html
<button
  type="button"
  class="button dock__door"
  id="records-toggle"
  aria-expanded="false"
  aria-controls="records"
  data-testid="records-toggle"
>
  ...
  <button
    type="button"
    class="button dock__door dock__controls"
    id="controls-toggle"
    aria-expanded="false"
    aria-controls="timeline"
    data-testid="controls-toggle"
  >
```

**src/ui/tour-panel.ts** - one dot per stop, by the stop's event id:

```typescript
const dots = tour.stops.map((stop) => {
  const dot = el('li', 'tour__dot');
  dot.setAttribute('data-testid', `tour-dot-${stop.id}`);
  return dot;
});
```

**src/ui/hub.ts** - a mission's entry and its buttons, by the mission id:

```typescript
const item = el('li', memorial ? 'hub__entry hub__entry--memorial' : 'hub__entry');
item.setAttribute('data-testid', `hub-mission-${shown.id}`);
...
const tour = button(`button${primary(true)} hub__tour`, copy.hub.tour);
tour.setAttribute('data-testid', `hub-mission-${shown.id}-tour`);
...
const explore = button(`button${primary(!shown.hasTour)} hub__explore`, copy.hub.explore);
explore.setAttribute('data-testid', `hub-mission-${shown.id}-explore`);
```

**src/ui/extra-sheet.ts** - the host an extra fills, by the extra id:

```typescript
const host = el('div', 'extra-host');
host.setAttribute('data-testid', `extra-sheet-host-${id}`);
```

The interface tests (Vitest) run against the same modules, so a test id edit must stay small and leave every file compiling.

---

## 2. Page Objects: Locator-First Pattern

**Page objects contain LOCATORS and complex methods only.** Tests call Playwright methods directly on locators. Simple actions (1-3 lines) belong in tests, not page objects.

### Core Principles

1. **Locators in constructor only** - define all locators in the constructor
2. **No wrapper methods for simple actions** - don't wrap `.click()`, `.fill()`, `.getAttribute()`, etc.
3. **Dynamic locators as arrow functions** - taking the entity's id
4. **Methods ONLY for complex logic (4+ lines)** - chiefly `waitForLoad()`, reading the scene report (`ScenePage.report()`), the tour's Skip (`TourPanelPage.skipTrip()`), and flying a hands-on extra to its end (`DockingPage.dockByKeys()`, `LandingPage.landByKeys()`)
5. **No goto() methods** - tests use `sitePage.goto(URLS.TOUR(...))` directly

### Correct Pattern (TourPanelPage)

```typescript
import { expect, type Locator, type Page } from '@playwright/test';

export class TourPanelPage {
  readonly page: Page;
  readonly panel: Locator;
  readonly count: Locator;
  readonly back: Locator;
  readonly next: Locator;
  readonly exit: Locator;
  // Dynamic locators (arrow functions)
  readonly dot: (stopId: string) => Locator;

  constructor(page: Page) {
    this.page = page;
    this.panel = page.getByTestId('tour-panel');
    this.count = page.getByTestId('tour-count');
    this.back = page.getByTestId('tour-back');
    this.next = page.getByTestId('tour-next');
    this.exit = page.getByTestId('tour-exit');
    this.dot = (stopId: string) => page.getByTestId(`tour-dot-${stopId}`);
  }
  // Methods only for complex logic (4+ lines) - see skipTrip() below
}
```

### Wrong Pattern (DO NOT USE)

```typescript
// WRONG - wrapper methods for simple actions
export class TourPanelPage {
  // ...locators...

  // DON'T DO THIS - one-liner wrapper
  async clickNext(): Promise<void> {
    await this.next.click();
  }

  // DON'T DO THIS - simple state check; assert the attribute in the test
  async isTraveling(): Promise<boolean> {
    return (await this.panel.getAttribute('data-phase')) === 'traveling';
  }

  // DON'T DO THIS - finding by text; use the test id
  async stopTitled(title: string): Promise<Locator> {
    return this.page.getByText(title);
  }

  // DON'T DO THIS - use the URLS constant instead
  async goto(): Promise<void> {
    await this.page.goto('?mission=gemini-6a&start=tour');
  }
}
```

### When Methods ARE Allowed (4+ lines of complex logic)

```typescript
// OK - waitForLoad(): the site is ready only when the scene has its textures (MissionPage)
async waitForLoad(): Promise<void> {
  await expect(this.site).toHaveClass(/\bis-ready\b/);
  await expect(this.loading).toBeHidden();
  await expect(this.missionName).not.toBeEmpty();
  await expect(this.message).toBeHidden();
}

// OK - reading the scene report, which lives in the page, not in an element (ScenePage)
async report(): Promise<SceneReport> {
  const report = await this.page.evaluate(() => window.__missionScene?.() ?? null);
  if (!report) throw new Error('There is no scene report: the page has no 3D view.');
  return report;
}

// OK - a timing rule of the site, handled once (TourPanelPage)
/**
 * Press Skip on a trip that has just begun, and wait until the tour is at
 * the stop. The tour ignores a Skip in a trip's first 400 ms (so a double
 * tap on Next does not skip the trip it started), so press again until it
 * takes, but only while the tour is still on its way. It must arrive
 * within 4 seconds: sooner than any trip ends by itself (5 at the least),
 * so a Skip that did nothing fails here.
 */
async skipTrip(): Promise<void> {
  await expect(this.panel).toHaveAttribute('data-phase', 'traveling');
  await expect(async () => {
    if ((await this.panel.getAttribute('data-phase')) === 'traveling') await this.next.click();
    await expect(this.panel).toHaveAttribute('data-phase', 'stopped', { timeout: 250 });
  }).toPass({ intervals: [250], timeout: 4_000 });
}
```

### The Page Objects

Each page object is the documentation of the test ids in its part of the site. Keep every locator, used or not.

| Page object      | Part of the site                                                                                                                                                                                          | Methods                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `MissionPage`    | `site`, header, the view buttons and True scale with its note (shown with Controls), the no-3D note, loading, messages                                                                                    | `waitForLoad()`             |
| `ScenePage`      | the canvas, and the scene report                                                                                                                                                                          | `waitForLoad()`, `report()` |
| `TourPanelPage`  | the tour panel in the card (hidden once the tour is finished)                                                                                                                                             | `skipTrip()`                |
| `EventCardPage`  | the moment card (`dock`): the story, the photo, Finish, the recording, a game's "Play: <title>" (`tryIt`), its two doors, the status beside Play, previous and next                                       | none                        |
| `EndingPage`     | the end of a flight in the card: Watch again, the title, the patch collected, the next flight, the "More to explore" door, and, opened, its picks and quiet ways on (with Explore on my own after a tour) | none                        |
| `RecordsPage`    | "Tell me more": its head and Close, its parts, and the links to the mission's own pages                                                                                                                   | none                        |
| `TimelinePage`   | Play, and the tools behind Controls: the clock, the scrubber, chapters, speed                                                                                                                             | none                        |
| `WelcomePage`    | the welcome: the mission on show, Take the tour, Explore on my own, All missions, Play a game (`games`), the no-3D note                                                                                   | `waitForLoad()`             |
| `HubPage`        | the mission list, opened from the welcome or the header, or at its games (`extrasTitle('hands-on')`) from Play a game                                                                                     | `waitForLoad()`             |
| `DialogsPage`    | About this mission, How this is drawn, Sources and credits (opened from "Tell me more"), a memorial page                                                                                                  | none                        |
| `ExtraSheetPage` | the full-screen sheet an extra opens in, and "Up next" at the end of a run: its title, the next step's button, the picks, the run again, All missions, and on a phone "More to explore" and Show less     | `waitForLoad()`             |
| `DockingPage`    | "Dock two spacecraft" inside the sheet: Start, the aim read-out, the docked line                                                                                                                          | `dockByKeys()`              |
| `LandingPage`    | "Land on the Moon" inside the sheet: Start, the fuel, falling speed and sideways slide read-outs, the coach line, the landed line                                                                         | `landByKeys()`              |

---

## 3. Refactoring Existing Page Objects

When cleaning up old page objects, follow this checklist:

### Cleanup Checklist

1. **Identify wrapper methods to remove:**
   - Methods that just call `.click()` on a locator
   - Methods that return `.isVisible()`, `.count()`, or compare a `.getAttribute()`
   - Methods that call `.selectOption()` or `.press()` and nothing else
   - `goto()` methods (use the URLS constant instead)

2. **Keep ALL locators** - even if unused in current tests
   - Locators document what `data-testid` attributes exist in the site
   - Makes it easy to see which test ids are available
   - Don't be overzealous removing "unused" locators during refactors
   - Only remove a locator if its `data-testid` was removed from the site

3. **Convert name-based methods to ID-based locators:**

   ```typescript
   // BEFORE: method that finds a mission by its name
   async exploreMission(name: string): Promise<void> {
     await this.list.getByRole('button', { name: `Explore ${name}` }).click();
   }

   // AFTER: dynamic locator by mission id (HubPage)
   readonly missionExplore: (id: string) => Locator;
   // In constructor:
   this.missionExplore = (id: string) => page.getByTestId(`hub-mission-${id}-explore`);
   ```

4. **Update tests to use direct locator access:**
   ```typescript
   // BEFORE
   await hubPage.exploreMission('Apollo 11');

   // AFTER
   await hubPage.missionExplore(MISSIONS.DEFAULT).click();
   ```

### Example: EventCardPage Cleanup

**Before (old pattern):**

```typescript
// These methods should be REMOVED:
async nextEvent(): Promise<void> {
  await this.next.click();
}

async currentTitle(): Promise<string | null> {
  return this.title.textContent();
}
```

**After (locator-first):**

```typescript
// Just locators in constructor:
readonly title: Locator;
readonly controlsToggle: Locator;
readonly next: Locator;

// Tests use directly (tests/e2e/no-webgl.test.ts):
await expect(cardPage.title).toHaveText('Liftoff');
await cardPage.controlsToggle.click();
await cardPage.next.click();
await expect(cardPage.title).toHaveText('First stage separates');
```

---

## 4. Test Files: Writing Tests

### Core Rules

1. **ALWAYS use page objects** - never call `page.getByTestId()`, `page.getByRole()`, or `page.locator()` directly in spec files
2. **Wrap every action and check in `test.step()`** - with a plain-words name; required for reading a report or a trace
3. **Use locators directly with Playwright assertions** - via page object properties
4. **Set the site up through the address** - never click your way to a starting place (unless that clicking IS the journey under test)
5. **Navigate with the URLS constant** - not page object methods
6. **Use the `sitePage` fixture** - import `{ test, expect }` from `../fixtures`; it fails the test on any console error or uncaught error
7. **One journey per test** - a test that loads a 3D scene must earn its place (see `test-planning`)

### Page Object Requirement

**Spec files must NEVER contain direct locator calls.** All element access goes through page objects.

```typescript
// WRONG - direct locators in a spec
await sitePage.getByTestId('records-about').click();
await expect(sitePage.getByRole('dialog', { name: 'About Apollo 11' })).toBeVisible();

// CORRECT - use page object locators
const recordsPage = new RecordsPage(sitePage);
const dialogsPage = new DialogsPage(sitePage);
await recordsPage.about.click();
await expect(dialogsPage.about).toBeVisible();
```

**Why?**

- Locators are defined once in page objects, not scattered across specs
- When a `data-testid` changes, update ONE file (the page object)
- Page objects document the test ids each part of the site has
- Specs read as the journey they test

Page-level input and setup are not element access and are fine in a spec: `sitePage.goto(...)`, `sitePage.keyboard.press('Escape')`, and helpers such as `withoutWebGL(sitePage)`.

### Correct Test Pattern

`tests/e2e/dialogs.test.ts`, complete:

```typescript
import { test, expect } from '../fixtures';
import { DialogsPage } from '../pages/DialogsPage';
import { EventCardPage } from '../pages/EventCardPage';
import { MissionPage } from '../pages/MissionPage';
import { RecordsPage } from '../pages/RecordsPage';
import { MISSIONS, URLS } from '../utils/vars';

/**
 * A dialog opens and gives focus back: focus moving into a dialog and out
 * again needs a real browser. What the dialogs show is tested in the
 * interface tests.
 */
test.describe('Dialogs', () => {
  test('About this mission opens from Tell me more, closes with Escape, and gives focus back', async ({
    sitePage,
  }) => {
    const missionPage = new MissionPage(sitePage);
    const cardPage = new EventCardPage(sitePage);
    const recordsPage = new RecordsPage(sitePage);
    const dialogsPage = new DialogsPage(sitePage);

    await test.step('Open the mission, exploring, with Tell me more open', async () => {
      await sitePage.goto(URLS.EXPLORE(MISSIONS.DEFAULT));
      await missionPage.waitForLoad();
      await cardPage.recordsToggle.click();
      await expect(recordsPage.records).toBeVisible();
    });

    await test.step('Open About this mission from the link at the end of Tell me more', async () => {
      await recordsPage.about.click();
      await expect(dialogsPage.about).toBeVisible();
      await expect(dialogsPage.aboutTitle).toHaveText('About Apollo 11');
      await expect(dialogsPage.aboutClose).toBeFocused();
    });

    await test.step('Escape closes it and focus returns to the link', async () => {
      await sitePage.keyboard.press('Escape');
      await expect(dialogsPage.about).toBeHidden();
      await expect(recordsPage.about).toBeFocused();
      await expect(recordsPage.records).toBeVisible();
    });
  });
});
```

### The Fixture (tests/fixtures/index.ts)

A page that draws but logs an error is still broken, so every test gets one that is watched:

```typescript
export const test = base.extend<SiteFixtures>({
  sitePage: async ({ page }, use) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console error: ${message.text()}`);
    });
    page.on('pageerror', (error) => {
      problems.push(`uncaught error: ${error.message}`);
    });

    await use(page);

    expect(problems, 'The page logged errors').toEqual([]);
  },
});
```

Never allow an error through this fixture. If a test logs one, the site has a bug: fix it, or report it.

### Key Patterns in Tests

**Direct locator usage:**

```typescript
// Click actions - call .click() on the locator
await tourPage.next.click();
await missionPage.viewButton(view).click();
await hubPage.missionExplore(MISSIONS.DEFAULT).click();

// Assertions - expect() with the locator, on the state the site sets
await expect(tourPage.panel).toHaveAttribute('data-phase', 'traveling');
await expect(cardPage.title).toHaveText(second.title);
await expect(missionPage.site).not.toHaveClass(/\bis-touring\b/);
```

**One generated test per id** (tests/e2e/missions.test.ts):

```typescript
for (const id of FLIGHT_IDS) {
  test(`${id} opens in the Ship view with its craft drawn`, async ({ sitePage }) => {
    const missionPage = new MissionPage(sitePage);
    const scenePage = new ScenePage(sitePage);

    await test.step('Open the mission in the Ship view', async () => {
      await sitePage.goto(URLS.EXPLORE(id, 'spacecraft'));
      await missionPage.waitForLoad();
      await scenePage.waitForLoad();
    });
    ...
```

A hard-coded list must be checked against the site's own, or a new entry is silently left out. `missions.test.ts` opens the mission list and compares every `hub-mission-<id>` entry with `FLIGHT_IDS`.

**Desktop only**, when the layout cannot matter (say why):

```typescript
test.describe('Deep links', () => {
  test.skip(({ isMobile }) => isMobile, 'Where a link opens does not depend on the screen.');
```

**A wait that is long by design** gets `test.slow()` and its own timeout on that one assertion, with a comment saying why:

```typescript
// A trip takes 5 to 15 seconds, and longer on a busy machine drawing in software.
test.slow();
...
await expect(tourPage.panel).toHaveAttribute('data-phase', 'stopped', { timeout: 45_000 });
```

---

## 5. Setting Up Through the Address, and Reading the Scene

There is no API to set data up with. The counterpart is the address: a deep link puts the site at any mission, moment, and view at once (`src/app/deep-link.ts` lists every value). **NEVER set a starting place up through the interface.** Clicking through the welcome to reach a mission's 3D view is slow and tests the welcome by accident; only the tests of those journeys (`welcome.test.ts`, `explore.test.ts`) do it. The mission list has no address of its own, so a test that needs it opens it from the welcome's All missions (`missions.test.ts`). The end of a flight has none either: open the last moment by address (`EVENTS.APOLLO_11_SPLASHDOWN`, which is at the end of the clock) and press Finish (`ending.test.ts`); the tour's end is reached only by the tour's own journey (`tour.test.ts`). An extra opens by address, over a mission (`URLS.EXTRA`) or on its own, as from the list (`URLS.EXTRA_ON_ITS_OWN`); the end of its run has no address, so it is played: `DockingPage.dockByKeys()` flies the docking to its end with the keys (`extras.test.ts`).

### URLS (tests/utils/vars.ts)

```typescript
/** A relative address for a place (the config's baseURL ends in "/"). */
function address(place: Place): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(place)) {
    if (value !== undefined) params.set(key, value);
  }
  return `?${params.toString()}`;
}

/** The addresses specs open. Each puts the site straight where the test begins. */
export const URLS = {
  /** The welcome: the mission on show, and the ways in, over its 3D view. */
  WELCOME: (mission: string) => address({ mission }),
  /** The guided tour, from its first stop. */
  TOUR: (mission: string) => address({ mission, start: 'tour' }),
  /** Exploring, from the first event, in a view if one is named. */
  EXPLORE: (mission: string, view?: EventView) => address({ mission, start: 'explore', view }),
  /** Paused at an event, in the event's own view unless one is named. */
  EVENT: (mission: string, event: string, view?: EventView) =>
    address({ mission, start: 'explore', event, view }),
  /** Paused at a mission time (HHH:MM:SS since liftoff). */
  TIME: (mission: string, t: string, view?: EventView) =>
    address({ mission, start: 'explore', t, view }),
  /** Only the event or the time, as a shared link has them: no `start`. */
  LINK: (place: Place) => address(place),
  /** An extra, open over a mission. */
  EXTRA: (mission: string, extra: string) => address({ mission, extra }),
  /** An extra on its own, as the mission list opens it: over the welcome, with no flight behind it. */
  EXTRA_ON_ITS_OWN: (extra: string) => address({ extra }),
} as const;
```

Views use the ids the scene report and the view buttons use (`earth`, `moon`, `spacecraft`, `journey`); the address takes those too.

The ids and moments tests open live beside it, with what the page shows there:

```typescript
export const EVENTS = {
  APOLLO_11_LANDING: { mission: 'apollo-11', id: 'landing', title: 'The Eagle has landed', clock: '102:45:39' },
  ...
};

export const MOMENTS = {
  /** Thirteen seconds after Apollo 17's ascent stage lifts off (185:21:37): the descent stage and the rover are left behind, labeled. */
  APOLLO_17_AFTER_LIFTOFF: { mission: 'apollo-17', t: '185:21:50' },
} as const;
```

`FLIGHT_IDS` and `EXTRAS` are kept here because the site finds missions and extras with Vite's `import.meta.glob`, which Playwright cannot run. Type-only imports from `src/` are fine (`import type { EventView } from '../../src/content/types'`); never import site code that runs.

### Before the Page Loads (tests/utils/helpers.ts)

A browser condition the address cannot set goes in an init script, called before `goto`:

```typescript
export async function withoutWebGL(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: unknown[]
    ) {
      const [kind] = args;
      if (typeof kind === 'string' && kind.toLowerCase().includes('webgl')) return null;
      return getContext.apply(this, args as Parameters<typeof getContext>);
    } as typeof getContext;
  });
}
```

### The Scene Report

A canvas cannot be queried like a page, so the scene describes itself. `window.__missionScene()` (set by `src/main.ts` once the scene exists; absent without a 3D view) returns a `SceneReport` (`src/scene/report.ts`): `view`, `scaleMode`, `time`, `fastForward`, `canvas`, `clear` (the box the interface leaves uncovered), `followed`, `ships[]` with `parts[]`, `leftBehind[]`, and `labels[]`. Boxes are CSS pixels from the canvas's top left (a smaller `y` is higher up), and `null` when the thing is not drawn.

Read it with `ScenePage.report()`, and find things in it with `tests/utils/scene-report.ts`:

| Helper                         | Purpose                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| `shipOf(report, id)`           | A ship by id (`csm`, `lm`, `gemini`, `agena`); throws, naming the ships there are, if missing |
| `followedShip(report)`         | The ship the Ship view follows now                                                            |
| `partOf(report, shipId, name)` | A named part of a ship's current shape (`spacewalker`, `gemini-reentry-module`)               |
| `leftBehindOf(report, name)`   | A part left on the Moon (`lm-descent-stage`, `lunar-rover`)                                   |
| `drawn(box, what)`             | A box that must be drawn; fails with `what` when it is null                                   |
| `isInside(box, frame)`         | True when `box` lies wholly inside `frame`                                                    |
| `overlaps(a, b)`               | True when two boxes share an area (touching within a pixel does not count)                    |
| `overlapping(box, others)`     | The names of the boxes in `others` that `box` overlaps, for a readable failure                |

```typescript
/** True when `box` lies wholly inside `frame`. */
export function isInside(box: SceneBox, frame: SceneBox): boolean {
  return (
    box.x >= frame.x &&
    box.y >= frame.y &&
    box.x + box.width <= frame.x + frame.width &&
    box.y + box.height <= frame.y + frame.height
  );
}
```

A box check in a spec (tests/e2e/scene.test.ts):

```typescript
await test.step('The astronaut rises above the reentry module rather than being drawn over it', async () => {
  const report = await scenePage.report();
  const figure = drawn(partOf(report, 'gemini', 'spacewalker').box, 'The astronaut');
  const capsule = drawn(
    partOf(report, 'gemini', 'gemini-reentry-module').box,
    'The reentry module',
  );
  // A smaller y is higher on the canvas.
  expect(figure.y, 'the top of the astronaut, against the top of the reentry module').toBeLessThan(
    capsule.y,
  );
});
```

### Extend the Report, Never Read Pixels

- **NEVER** use screenshots as assertions (`toHaveScreenshot`, comparing images), read canvas pixels (`getImageData`, `readPixels`), or guess positions from the layout. Software drawing differs between machines.
- If a test needs something the report cannot say, **add it to the report**: the field and its doc in `src/scene/report.ts`, the value in `Stage.report()` in `src/scene/stage.ts`. Asking for a report must change nothing in the picture.
- Assert on what a visitor would see: that a thing is drawn (a box, not null), where it is against another thing or against `clear`, and what the scene is showing (`view`, `scaleMode`, `time`). Never on exact pixel positions: the camera eases, and a model's size depends on the screen.

---

## 6. Wait Strategy: Element-Based Waits Only

**NEVER use timed waits or browser load states.** The page's own load event fires long before the site is ready: the mission, the scene's code, and its textures load after it, and shaders compile in software. The only "ready" that means anything is what the site says: `body.is-ready`.

### Banned Patterns

```typescript
// NEVER - arbitrary sleeps, in any form
await page.waitForTimeout(1000);
await new Promise((resolve) => setTimeout(resolve, 1000));

// NEVER - browser load states; they say nothing about the scene or the interface
await page.waitForLoadState('networkidle');
await page.waitForLoadState('domcontentloaded');
```

### Correct Pattern: Page Object `waitForLoad()`

Every page object a test lands on has a `waitForLoad()` that waits on real elements and the state the site sets:

```typescript
// The site (MissionPage): ready, revealed, and the address acted on
async waitForLoad(): Promise<void> {
  await expect(this.site).toHaveClass(/\bis-ready\b/);
  await expect(this.loading).toBeHidden();
  await expect(this.missionName).not.toBeEmpty();
  await expect(this.message).toBeHidden();
}

// The scene (ScenePage): drawn, and able to report
async waitForLoad(): Promise<void> {
  await expect(this.site).toHaveClass(/\bis-ready\b/);
  await expect(this.site).not.toHaveClass(/\bno-3d\b/);
  await expect(this.canvas).toHaveClass(/\bstage--visible\b/);
  await this.page.waitForFunction(() => typeof window.__missionScene === 'function');
}

// Content that loads on demand (ExtraSheetPage): the sheet is open and done loading, or failed
async waitForLoad(): Promise<void> {
  await expect(this.sheet).toBeVisible();
  await expect(this.title).not.toBeEmpty();
  await expect(this.body).not.toHaveAttribute('aria-busy', 'true');
}
```

### After an Action: Wait for Its Effect

Wait for the **observable effect**, not for time to pass:

```typescript
// After choosing Explore on my own - the welcome closes
await welcomePage.explore.click();
await expect(welcomePage.welcome).toBeHidden();
await expect(missionPage.site).not.toHaveClass(/\bis-welcome\b/);

// After a door on the moment card - it says it is open, and what it opens shows
await cardPage.controlsToggle.click();
await expect(cardPage.controlsToggle).toHaveAttribute('aria-expanded', 'true');
await expect(timelinePage.timeline).toBeVisible();

// After Next - the tour sets off, then arrives by itself
await tourPage.next.click();
await expect(tourPage.panel).toHaveAttribute('data-phase', 'traveling');
await expect(tourPage.panel).toHaveAttribute('data-phase', 'stopped', { timeout: 45_000 });
```

### Polling the Scene Report

The camera eases into a view, labels fade in, and the spacewalker's figure fades in over seconds, so read the report until it says what it should. Use `expect.poll()` for a value:

```typescript
await missionPage.viewButton(view).click();
await expect(missionPage.viewButton(view)).toHaveAttribute('aria-pressed', 'true');
await expect.poll(async () => (await scenePage.report()).view).toBe(view);

// The camera eases into the view, so wait for it to settle around the craft.
await expect
  .poll(async () => {
    const report = await scenePage.report();
    const box = followedShip(report).box;
    return box !== null && isInside(box, report.clear);
  })
  .toBe(true);
```

Return a small object or array from the poll when several things must hold at once, so a failure shows all of them:

```typescript
await expect
  .poll(async () => {
    const report = await scenePage.report();
    return {
      followed: report.followed,
      lander: shipOf(report, 'lm').box !== null,
      rover: leftBehindOf(report, 'lunar-rover').box !== null,
    };
  })
  .toEqual({ followed: 'lm', lander: true, rover: true });
```

Use `expect(async () => { ... }).toPass()` only when an action has to be retried, as `TourPanelPage.skipTrip()` does; keep the retry in the page object.

### Timeouts

The config gives each test 60 seconds and each assertion 15. Keep those. A wait that is long by design (a tour trip) gets its own timeout on that one assertion, and the test gets `test.slow()`, with a comment saying why. Never time how long something takes: timing belongs to the clock's and the tour's own tests (`src/app/tour.test.ts`). A bound that proves something happened at once (Skip, in `skipTrip()`) is fine when it is shorter than the slowest the other way could take.

### helpers.ts Utilities

`helpers.ts` holds shared helpers that are not element access. Nothing in it sleeps.

| Utility              | Purpose                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| `withoutWebGL(page)` | Makes every canvas refuse a WebGL context, for the no-3D fallback (call before `goto`) |
| `clockSeconds(text)` | Seconds since liftoff from the mission clock's text, to see that the clock moved on    |

---

## 7. Project Structure

```
tests/
├── e2e/                        # Specs
│   ├── deep-links.test.ts      # A deep link opens the right place (desktop)
│   ├── dialogs.test.ts         # A dialog opens from Tell me more and gives focus back
│   ├── doors.test.ts           # The moment card's doors: Tell me more and Controls open, close, and give focus back
│   ├── ending.test.ts          # Explore to the end, Finish, open More to explore (the ship clear of it), fly the next flight
│   ├── explore.test.ts         # Choose Explore on my own, open Controls, look through the views, True scale, Play
│   ├── extras.test.ts          # Every extra opens and closes (desktop); dock, land, and fly to orbit to the end, fly the real flight from Up next, and open Fly to orbit from its liftoff card
│   ├── missions.test.ts        # Every mission opens in the Ship view (desktop)
│   ├── no-webgl.test.ts        # Without WebGL the mission can still be read (desktop)
│   ├── scene.test.ts           # What the scene draws, at moments it has drawn wrong before, and the ship clear of the card and its doors
│   ├── tour.test.ts            # Take the guided tour to its end, start it again, and leave it
│   ├── welcome.test.ts         # Arrive: the scene framed beside the welcome, All missions and back, Play a game and back, take the tour
│   ├── report/                 # HTML report (git-ignored)
│   └── results/                # Traces of failed tests (git-ignored)
├── pages/                      # Page objects (locators + complex methods)
│   ├── DialogsPage.ts
│   ├── DockingPage.ts
│   ├── EndingPage.ts
│   ├── EventCardPage.ts
│   ├── ExtraSheetPage.ts
│   ├── HubPage.ts
│   ├── LandingPage.ts
│   ├── MissionPage.ts
│   ├── RecordsPage.ts
│   ├── ScenePage.ts
│   ├── TimelinePage.ts
│   ├── TourPanelPage.ts
│   └── WelcomePage.ts
├── fixtures/
│   └── index.ts                # sitePage: fails a test on console errors and uncaught errors
├── utils/
│   ├── vars.ts                 # URLS, and the mission, event, and extra ids tests use
│   ├── scene-report.ts         # Finding things in the scene report, box checks
│   └── helpers.ts              # withoutWebGL, clockSeconds
├── node-shim.d.ts              # process.env, the one Node global the tests may use
└── playwright.e2e.config.ts
```

There is no `@types/node`: in tests, use only `process.env` (declared in `tests/node-shim.d.ts`), no other Node APIs. `npx tsc --noEmit` type-checks `tests/**` too (strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), and it must pass.

---

## 8. Commands

| Command                    | Purpose                                                                       |
| -------------------------- | ----------------------------------------------------------------------------- |
| `npm run test:e2e`         | Run the tests against the dev server (port 5173), both projects - **DEFAULT** |
| `npm run test:e2e:preview` | Build, then run the tests against the built site (port 4173)                  |
| `npm run test:e2e:ui`      | Open Playwright UI mode for debugging                                         |
| `npm run test:e2e:debug`   | Debug mode with step-through                                                  |
| `npm run test:e2e:codegen` | Record new tests (then rewrite them with page objects and test ids)           |
| `npm run test:e2e:report`  | View the HTML report                                                          |

Pass Playwright flags after `--`:

```bash
npm run test:e2e -- --project=chrome-desktop tests/e2e/scene.test.ts
npm run test:e2e -- --grep "Deep links"
```

The config starts the server itself and reuses one that is already running. It drives the installed Google Chrome, so there is nothing to download: never run `npx playwright install`. The whole suite runs 54 tests (43 on the desktop, 11 on the phone, where the desktop-only ones are skipped) in about a minute on a laptop; most of that is drawing 3D scenes in software, and flying the docking extra to its end, which takes over 20 seconds by design.

---

## 9. Strict Enforcement Rules

**REFUSE to write code that violates these rules:**

### Locator Strategy

1. `getByTestId()` - USE THIS. Almost always.
2. `getByRole()`, `getByText()`, `getByLabel()`, CSS selectors - LAST RESORT only, and only inside a page object (for example, `HubPage.missions` narrows a test id prefix to the entries: `li[data-testid^="hub-mission-"]`)
3. The canvas - only through the scene report. Never pixels.

**If a data-testid doesn't exist, ADD IT to the site first** (`index.html` or `src/ui`), as an attribute-only change. Don't settle for alternatives. **If the scene report cannot say it, ADD IT to the report.**

### ALWAYS Required

- Page objects for ALL element access - never `page.getByTestId()` in a spec
- `test.step()` wrapping every action and check, named in plain words
- `{ test, expect }` from `../fixtures`, and the `sitePage` fixture
- Setup through the address, with the `URLS` constant
- `waitForLoad()` after every `goto`, on the page objects the test lands on
- Dynamic locators for repeated items, by the entity's content id
- Direct locator usage via page objects (`.click()`, `expect().toHaveAttribute()`)
- `expect.poll()` on the scene report for anything that moves, fades, or flies in
- A reason, in words, for every desktop-only skip and every timeout longer than the default

### NEVER Do

- Direct `page.getByTestId()`, `page.getByRole()`, or `page.locator()` in spec files - use page objects
- Wrapper methods for 1-3 line actions in page objects
- `goto()` methods on page objects
- Clicking through the interface to reach a starting place - use a deep link
- `page.waitForTimeout()`, or a sleep in any other form - wait for an element or the report
- `page.waitForLoadState('networkidle')` or `('domcontentloaded')` - the page loads long before the scene does
- Screenshots or pixel reads as assertions - assert on the scene report
- Timing how long a tour trip or the clock takes - their own tests own timing
- Testing what the interface tests own: every line of a card, panel, or dialog
- Letting a console error through the fixture
- Name- or title-based finding when an id is available
- Changing behavior, text, ids, classes, structure, or styles to add a test id
