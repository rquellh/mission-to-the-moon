---
name: vitest-testing
description: Expert at writing, debugging, and fixing Mission to the Moon's Vitest tests - interface tests that mount the real interface over the real index.html in jsdom (with the 3D scene, the screen's frames, and sound replaced at their edges), unit tests of pure helpers, and the content and flight tests in Node. Use when writing tests for a card, panel, dialog, or control, testing a helper in src/ui or src/app, or fixing failing Vitest tests.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash(npx vitest*), Bash(npm test*), Bash(npm run test*), TodoWrite
---

# Vitest Testing Skill - Mission to the Moon

You are an expert interface test engineer for Mission to the Moon. You write, debug, and fix Vitest tests following strict best practices with Testing Library, the real interface and real missions, and stand-ins only at the site's edges.

**Scope:** This skill covers **how** to write Vitest tests (interface tests, unit tests, and content and flight tests). For deciding **what** to test at which layer, use the `test-planning` skill. For Playwright browser tests, use the `e2e-testing` skill.

---

## 1. Philosophy & Scope

### Core Principles

1. **"Write tests. Not too many. Mostly integration."** - Integration tests give the best confidence for their cost. The bulk of interface testing belongs here: the real `mountInterface` over the real `index.html`, with a real mission, the real mission clock (`MissionPlayer`), and the real tour.

2. **Replace things only at the system's edges, never its own modules.** This site is static: no server, no API, no network to fake. Its edges are:
   - **the 3D scene**: a `FakeDirector` stands in for the scene's `Stage` and remembers what the interface asked of it;
   - **the screen's frames and clock**: `fakeFrames` replaces `requestAnimationFrame` and `performance.now`, so time moves only when the test draws frames;
   - **sound**: `HTMLMediaElement` play, pause, and load, driven by the test through `sound`;
   - **what jsdom lacks**: dialog `show`/`showModal`/`close` with their `close` and `cancel` events, `matchMedia`, `ResizeObserver`, `Element.animate`, `scrollBy`;
   - **leaving the page**: `location.assign` and `reload`, recorded in `navigation`;
   - **the interface's own loaders**: `loadMemorial` and `loadExtra`, the closest thing here to a request, swapped per test for loading, failure, and late answers.

   Never `vi.mock` a module of the site (`src/ui/*`, `src/app/*`, `src/content/*`, `src/extras/*`). The interface and the scene never import each other; they meet only through `src/app/contract.ts` (`Player` and `Director`), which is exactly where the fakes plug in.

3. **Accessibility-first queries.** The more your tests resemble how the site is used, the more confidence they give you. Prefer `getByRole` > `getByLabelText` > `getByText` > `getByTestId`.

4. **Test behavior, not implementation.** Tests verify what a visitor sees and can do: names, text, pressed and expanded states, focus, the tab title, what is announced. Never private state, call counts, `tour.phase`, `player.time`, or DOM structure a visitor cannot perceive. If a test breaks when the code is refactored, it tested the wrong thing.

5. **RITE tests.**
   - **R**eadable - tests document expected behavior
   - **I**solated - from other tests (not from the real parts they use)
   - **T**horough - cover the variations that matter (Earth orbit or Moon, one craft or two, touring or exploring)
   - **E**xplicit - assertions state exactly what is expected

6. **Practical quality rules.**
   - Prefer `toBeInTheDocument()` for presence, `toBeVisible()` when visibility matters (a `hidden` element is still in the document)
   - Use real, unique missions as the data, so a wrong mission can never pass by accident
   - No if/else in tests - tests are linear and predictable
   - Accessibility is part of every interface test (names, roles, states), not a separate concern
   - Plain words in test names and comments, in US English: the audience includes ten-year-olds, and the code's comments are written the same way

---

## 2. Infrastructure Quick Reference

| Item                                              | Location                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Test runner                                       | Vitest (`vitest.config.ts`, two projects)                                                              |
| Interface tests (project `ui`, jsdom)             | `src/ui/**/*.test.ts`, `src/extras/**/*.test.ts`                                                       |
| Content and flight tests (project `flight`, Node) | `src/sim/**/*.test.ts`, `src/app/**/*.test.ts`, `src/content/**/*.test.ts`                             |
| Queries and events                                | `@testing-library/dom`, `@testing-library/user-event`                                                  |
| Matchers                                          | `@testing-library/jest-dom` (loaded by the setup file)                                                 |
| Mount function                                    | `src/test/test-utils.ts` (`mountMission`)                                                              |
| Global setup (`ui` only)                          | `src/test/setup.ts`                                                                                    |
| What jsdom lacks, filled in                       | `src/test/browser.ts`                                                                                  |
| Edge fakes                                        | `src/test/fakes.ts` (`FakeDirector`, `fakeFrames`, `standInExtra`, `later`)                            |
| Imports                                           | Relative, with the `.ts` extension (no path alias)                                                     |
| Run every test                                    | `npm test`                                                                                             |
| Watch mode                                        | `npm run test:watch`                                                                                   |
| One file                                          | `npx vitest run src/ui/hub.test.ts`                                                                    |
| One test by name                                  | `npx vitest run src/ui/hub.test.ts -t "Escape"`                                                        |
| One project                                       | `npx vitest run --project ui` or `--project flight`                                                    |
| Type-check (tests included)                       | `npm run typecheck` (`tsc --noEmit`, strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) |
| Lint (tests included)                             | `npm run lint` (oxlint with Cloudflare's preset; `oxlint.config.ts` lists the rules that are off)      |

There is no coverage package. Coverage is not a target here; do not add one.

`src/main.ts` runs the site as soon as it is imported, so no test imports it. Its wiring (and everything that needs WebGL, real layout, or real focus trapping) belongs to the browser tests.

### What the Global Setup Provides (`setup.ts`)

The setup file runs before every `ui` test file and provides:

- The jest-dom matchers (`toBeInTheDocument`, `toBeVisible`, `toHaveAccessibleName`, ...)
- The browser stand-ins from `browser.ts`, installed once per file
- After each test: every open dialog is closed (so the page can tidy up, as leaving it would), the page and the device's storage are emptied, the screen, sound, and address are put back, fake timers are turned off, and every stub and spy is undone

```ts
installBrowser();

afterEach(() => {
  resetBrowser();
  document.body.replaceChildren();
  document.body.className = '';
  window.localStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
```

### What `browser.ts` Fills In

| jsdom lacks                                      | The stand-in                                                                                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HTMLDialogElement` `show`, `showModal`, `close` | Set and clear `open`, fire `close` at once; Escape fires `cancel` on the top modal dialog and closes it unless the page called `preventDefault()` |
| `matchMedia`                                     | A phone-sized screen with no reduced-motion preference; the mount's `wide` option switches to the wide layout                                     |
| `ResizeObserver`                                 | Never calls back (nothing is laid out in jsdom)                                                                                                   |
| `Element.animate`, `Element.scrollBy`            | Accepted and ignored                                                                                                                              |
| `HTMLMediaElement` `play`, `pause`, `load`       | A recording waits for the test to say how the file went (`sound`)                                                                                 |
| Navigation (`location.assign`, `reload`)         | Recorded in `navigation`; nothing loads                                                                                                           |

A jsdom "not implemented" error in the output means a test reached an edge with no stand-in. Fill the gap in `browser.ts`; never silence the console to hide it.

---

## 3. The Import Pattern

Every test file follows this canonical import structure:

```ts
// 1. Test framework
import { describe, expect, it, vi } from 'vitest';
// 3. Real content and real parts the test reads (missions, copy, sources)
import { loadMemorial } from '../content/missions/index.ts';
// 4. Types (import type for type-only imports)
import type { Memorial } from '../content/types.ts';
// 2. The mount function, queries, and edge fakes - always from test-utils
import {
  later,
  mountMission,
  navigation,
  screen,
  waitFor,
  within,
  type User,
} from '../test/test-utils.ts';
// 5. The module under test - pure modules only (interface tests mount the whole interface)
import { howDrawnParagraphs } from './about-dialog.ts';
```

**Key rules:**

- Import `mountMission`, `screen`, `within`, and `waitFor` from `../test/test-utils.ts`, **never** from `@testing-library/dom`
- Do not import `userEvent`: the mount hands you `user`, made with `userEvent.setup()`
- Import `sound`, `navigation`, `later`, `visitedMissions`, `mountRecordings`, and the `User` and `Frames` types from test-utils too
- Use `import type` for types (`verbatimModuleSyntax` is on)
- An interface test never imports the module it covers: it mounts the interface and uses it

---

## 4. Mounting the Interface

### The Custom `mountMission()` Function

`mountMission(id, options)` in `test-utils.ts` builds what `src/main.ts` builds, from the real parts:

- a fresh copy of the real `index.html` body (imported with `?raw`, its script removed)
- the real mission, loaded with `loadBundle`, with its flight path and story time
- the real `MissionPlayer`, on the frames' clock
- the real `mountInterface`, with the real mission list, extras list, credits, and memorial loader
- the edges: a `FakeDirector`, `fakeFrames`, and the browser stand-ins

It returns what a test may hold on to:

```ts
export interface MountedMission {
  /** A visitor, set up with userEvent.setup(). It keeps working under fake timers. */
  user: User;
  /** The 3D scene's stand-in: what the interface asked of it. */
  director: FakeDirector;
  /** The screen: draw frames to let time pass. */
  frames: Frames;
}
```

It does not hand out the player or the tour: a test reads the clock and the tour off the page, as a visitor would.

### Basic Mount

Without options the visit begins as a plain address does, with the welcome (the mission list):

```ts
await mountMission('apollo-11');
```

### Mount Where an Address Would Open

`start` begins the way `?start=` does; `event` opens paused at an event and explores, as `?event=` does:

```ts
await mountMission('apollo-11', { start: 'explore' });
await mountMission('gemini-3', { start: 'tour' });
await mountMission('apollo-11', { event: 'landing' });
```

### Mount Without a 3D View

`no3D` mounts with `has3D: false`, as the site does without WebGL or when the scene's code did not load:

```ts
await mountMission('gemini-8', { no3D: { note: copy.errors.noWebGL, offerReload: false } });
```

### Mount on a Wide Screen

The default screen is a phone's. `wide` switches the layout media query, for behavior that differs by layout:

```ts
const { user } = await mountMission('apollo-11', { start: 'explore', wide: true });
```

### All the Options

| Option         | What it does                                                 |
| -------------- | ------------------------------------------------------------ |
| `start`        | `'welcome'` (default), `'tour'`, or `'explore'`              |
| `event`        | Open paused at this event id and explore                     |
| `no3D`         | `{ note, offerReload }`: no 3D view                          |
| `story`        | Make the real mission into a typed fixture (section 6)       |
| `missionList`  | Make the real mission list into a typed fixture (section 6)  |
| `isDraft`      | Which list entries count as unfinished                       |
| `loadMemorial` | Replace the memorial loader (section 5)                      |
| `loadExtra`    | Replace the extra loader; the default loads a stand-in extra |
| `wide`         | The wide layout                                              |

### Recording Players on Their Own

The card holds one recording at a time, so "only one plays at a time" can only show with two players side by side. `mountRecordings` puts real players for real clips on a fresh page:

```ts
const { user } = mountRecordings(clipOf('landing'), clipOf('first-step'));
const [landing, firstStep] = screen.getAllByRole('region', { name: 'Recording' });
```

### Mount Helper Functions

When several tests need the same start, extract a helper at file scope:

```ts
async function atTheLanding() {
  const mounted = await mountMission('apollo-11', { event: 'landing' });
  return { ...mounted, recording: screen.getByRole('region', { name: 'Recording' }) };
}
```

```ts
async function openCredits(user: User): Promise<HTMLElement> {
  await user.click(screen.getByRole('button', { name: 'Sources and credits' }));
  return screen.getByRole('dialog', { name: 'Sources and credits' });
}
```

This keeps each test short and about one behavior.

---

## 5. Boundary Fakes

This is the most important section. The fakes stand where the site meets the outside, and nowhere else.

### The 3D Scene: `FakeDirector`

The interface asks the scene for a view and a scale; the fake takes them at once and tells its subscribers, as the real scene does once the camera has moved. A test reads what was asked for, and plays the scene's part when the scene moves on its own:

```ts
it('asks the scene for the view pressed, and shows it pressed', async () => {
  const { user, director } = await mountMission('apollo-17', { start: 'explore' });
  expect(screen.getByRole('button', { name: 'Both' })).toHaveAttribute('aria-pressed', 'true');

  await user.click(screen.getByRole('button', { name: 'Moon' }));

  expect(director.view).toBe('moon');
  expect(screen.getByRole('button', { name: 'Moon' })).toHaveAttribute('aria-pressed', 'true');
});

it('shows Earth when the scene reports a view an Earth-orbit flight does not offer', async () => {
  const { director } = await mountMission('gemini-8', { start: 'explore' });
  director.cameraMovesTo('spacecraft');

  director.cameraMovesTo('moon');

  expect(screen.getByRole('button', { name: 'Earth' })).toHaveAttribute('aria-pressed', 'true');
});
```

| On the fake                           | Meaning                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| `director.view`, `director.scaleMode` | The view and scale the scene is in                                                 |
| `director.drawing`                    | False while the interface has asked the scene to stop drawing (an extra covers it) |
| `director.cameraMovesTo(view)`        | The camera moved by itself                                                         |
| `director.setFastForward(on)`         | The followed ship starts or stops circling too fast to follow                      |

### The Screen: `fakeFrames`

Nothing moves until the test draws frames. The mount installs the frames before anything else, and the real `MissionPlayer` runs on their clock (its injectable `now`), so the mission clock, the tour, the announcer, and the timeline's throttles all keep the same time. `frames.advance(seconds)` draws frames (one every 100 ms of the clock); `frames.frame()` draws one.

```ts
it('sets off for the next stop, and arrives when the trip is over', async () => {
  const { user, frames } = await mountMission('gemini-3', { start: 'tour' });
  const panel = screen.getByRole('region', { name: 'Guided tour' });

  await user.click(within(panel).getByRole('button', { name: 'Next' }));

  expect(panel).toHaveTextContent('Stop 2 of 6 On the way…');
  expect(within(panel).getByRole('button', { name: 'Skip to this stop' })).toHaveTextContent(
    'Skip',
  );

  frames.advance(A_WHOLE_TRIP);

  expect(panel).toHaveTextContent('Stop 2 of 6');
  expect(panel).not.toHaveTextContent('On the way…');
});
```

Draw "enough" frames (`A_WHOLE_TRIP` is 16 seconds, longer than any trip) and check where things ended up. How long a trip takes, its easing, and when the camera moves are the tour's own tests (`src/app/tour.test.ts`); an interface test never measures them.

### Sound: `sound`

A recording asked to play waits, as a real file does while it loads. The test plays the speakers' part:

| Call                     | Meaning                                                         |
| ------------------------ | --------------------------------------------------------------- |
| `sound.starts()`         | The file loaded and can be heard (`playing`; `play()` resolves) |
| `sound.reaches(seconds)` | It has played this far (`timeupdate`)                           |
| `sound.ends()`           | It played to its end (`ended`)                                  |
| `sound.fails()`          | The file did not load (`error`; `play()` rejects)               |

```ts
it('loads the recording, then plays it', async () => {
  const { user, recording } = await atTheLanding();
  expect(within(recording).getByText('0:15')).toBeInTheDocument();

  await user.click(
    within(recording).getByRole('button', { name: 'Play the recording, 15 seconds' }),
  );

  const toggle = within(recording).getByRole('button', { name: 'Pause the recording' });
  expect(toggle).toHaveTextContent('Loading…');

  sound.starts();

  expect(within(recording).getByRole('status')).toHaveTextContent('Playing the recording.');
  expect(within(recording).getByText('0:00 / 0:15')).toBeInTheDocument();

  sound.reaches(6);

  expect(within(recording).getByText('0:06 / 0:15')).toBeInTheDocument();
});
```

### Leaving the Page: `navigation`

Opening another mission, reloading, and an extra's "open this mission" are page navigations. They are recorded, not followed. The address starts as `http://localhost:3000/`.

```ts
await user.click(screen.getByRole('button', { name: 'Take the tour of Gemini 8' }));
expect(navigation.address).toBe('http://localhost:3000/?mission=gemini-8&start=tour');
```

```ts
await user.click(screen.getByRole('button', { name: 'Reload' }));
expect(navigation.reloaded).toBe(true);
```

### Dialogs, Escape, and the Rest of jsdom's Gaps

The stand-ins act like the browser, so tests use dialogs the way a visitor does: press the opener, read the dialog by its name, close it with Close or Escape.

```ts
it('puts the visitor back where they were when the reopened list closes', async () => {
  const { user } = await mountMission('apollo-11', { start: 'explore' });
  const missionName = screen.getByRole('button', { name: /all missions$/ });
  await user.click(missionName);
  expect(document.title).toBe('Mission to the Moon');

  await user.keyboard('{Escape}');

  expect(screen.queryByRole('dialog', { name: 'Mission to the Moon' })).not.toBeInTheDocument();
  expect(document.title).toBe('Apollo 11 · Mission to the Moon');
  expect(missionName).toHaveFocus();
});
```

A closed `<dialog>` is `display: none`, so its contents drop out of role queries, as they do for a screen reader.

### Per-Test Overrides for Loading States

`later()` makes a promise the test settles when it chooses. Pass it through a loader to see the loading state, then let the answer come:

```ts
it('says it is loading until the page arrives', async () => {
  const answer = later<Memorial>();
  const { user } = await mountMission('apollo-11', { loadMemorial: () => answer.promise });

  await openApollo1(user);

  const page = screen.getByRole('dialog', { name: 'Apollo 1' });
  expect(within(page).getByRole('status')).toHaveTextContent('Loading Apollo 1…');

  answer.resolve(await loadMemorial('apollo-1'));

  await waitFor(() => {
    expect(within(page).queryByRole('status')).not.toBeInTheDocument();
  });
  expect(within(page).getByText('January 27, 1967')).toBeInTheDocument();
});
```

The answer is the real memorial (`loadMemorial` from the registry): only _when_ it arrives is controlled.

### Per-Test Overrides for Failures

A loader that rejects gives the failure state. The site logs the error, so spy on `console.error` to keep the output clean:

```ts
it('says the extra did not load and offers to reload it here', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const { user } = await mountMission('apollo-11', {
    start: 'explore',
    loadExtra: () => Promise.reject(new Error('The network went away')),
  });
  await user.click(screen.getByRole('button', { name: 'Try it: Drop the stages' }));
  const sheet = screen.getByRole('dialog', { name: 'Drop the stages' });

  expect(await within(sheet).findByRole('status')).toHaveTextContent(
    'Drop the stages did not load. Check your connection and reload the page, or go back to the mission.',
  );
  expect(within(sheet).getByRole('button', { name: 'Back to the mission' })).toHaveFocus();

  await user.click(within(sheet).getByRole('button', { name: 'Reload' }));

  expect(navigation.address).toBe(
    'http://localhost:3000/?mission=apollo-11&event=liftoff&extra=stages',
  );
});
```

### Per-Test Overrides for Late Answers

Give each opening its own answer, and settle them out of order:

```ts
it('ignores a page that arrives after it was closed', async () => {
  const closedEarly = later<Memorial>();
  const openedAgain = later<Memorial>();
  const answers = [closedEarly, openedAgain];
  const { user } = await mountMission('apollo-11', {
    loadMemorial: () => (answers.shift() ?? later<Memorial>()).promise,
  });
  await openApollo1(user);
  await user.click(screen.getByRole('button', { name: 'Close' }));
  await openApollo1(user);
  const page = screen.getByRole('dialog', { name: 'Apollo 1' });

  closedEarly.resolve(await loadMemorial('apollo-1'));
  await closedEarly.promise;

  expect(within(page).getByRole('status')).toHaveTextContent('Loading Apollo 1…');

  openedAgain.resolve(await loadMemorial('apollo-1'));

  expect(await within(page).findByText('January 27, 1967')).toBeInTheDocument();
});
```

Every override lasts for its own test only: each test mounts afresh, and the setup file resets every edge afterward.

---

## 6. Data Patterns

### Real Missions First

The data is the real content. Pick missions that differ in the way the test needs:

| Need                                                                   | Mission                                                                                      |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| A Moon flight with two craft, a landing, recordings, call signs        | `apollo-11`, `apollo-17`                                                                     |
| Earth orbit, two craft, an event before liftoff, a spin, no call signs | `gemini-8`                                                                                   |
| A short tour (6 stops), one craft                                      | `gemini-3`                                                                                   |
| Sources borrowed from other missions                                   | `gemini-7` (from Gemini 6A and Gemini 8)                                                     |
| A Moon flight with no landing, one craft                               | `apollo-8`                                                                                   |
| A memorial page                                                        | `apollo-1` (opened from the mission list)                                                    |
| A hands-on extra on an event                                           | `liftoff` on most flights ("Drop the stages"); `docking` on Gemini 8 ("Dock two spacecraft") |

Assert with the content's own words, written out: `'The Eagle has landed'`, `'Stop 1 of 6'`, `'102:45:39'`. When the test passes text in (a no-3D note), take it from `copy` (`src/content/copy.ts`) as the site does.

Do not loop an interface test over all 21 missions. A rule every mission must keep is a content test, once, in `src/sim/test/all-missions.test.ts`.

### Typed Fixtures for Edge Cases

Only when no real mission has the edge case, make a typed fixture **from** a real mission and pass it through `story` (or `missionList`). Name it for what it changes, and say why in one line:

```ts
/** Apollo 11 told from its first stage separation, so the clock starts before the first event. */
const withoutLiftoff = (mission: Mission): Mission => ({
  ...mission,
  events: mission.events.filter((event) => event.id !== 'liftoff'),
});

await mountMission('apollo-11', { story: withoutLiftoff });
```

```ts
/** The real list, with Gemini 7 as a flight that has no tour (every real flight has one). */
const gemini7WithoutATour = (summaries: readonly MissionSummary[]): MissionSummary[] =>
  summaries.map((summary) =>
    summary.id === 'gemini-7' ? { ...summary, hasTour: false } : summary,
  );

await mountMission('apollo-11', { missionList: gemini7WithoutATour });
```

A pure helper takes its fixture directly:

```ts
/** A flight with no landing and no splashdown: none of the real ones, so a typed fixture. */
const noLandingNoSplashdown: FlightOutline = {
  ships: 1,
  landsOnMoon: false,
  splashdown: false,
  turns: false,
};
```

With `exactOptionalPropertyTypes` on, leave an optional field out by deleting it from a copy, not by setting it to `undefined`:

```ts
/** Apollo 11's story with no launch time. */
function withoutLaunch(mission: Mission): Mission {
  const fixture = { ...mission };
  delete fixture.launch;
  return fixture;
}
```

**Rules for data:**

- Real missions first; a fixture only for an edge no mission has
- Build fixtures from a real mission with spread, so everything else stays real
- Type every fixture with the content types (`Mission`, `MissionSummary`, `Memorial`, `FlightOutline`, `Citation`)
- Use real ids: real source ids in a `Citation`, real event ids in `event:`
- Name a fixture for its variant: `withoutLiftoff`, `tryItOnTheLanding`, `acrossTheNewYear`

### Tiny Fakes at an Edge

An extra's code is the far side of the `loadExtra` edge. To test the sheet, pass a tiny typed `Extra` with the real meta:

```ts
/** A tiny extra: it says where it was opened, and can close itself or open another mission. */
const tinyStages: Extra = {
  meta: stages,
  mount(host, context, params) {
    const where = document.createElement('p');
    where.textContent = `Opened over ${context.missionId}, at ${params.get('event') ?? 'no event'}`;
    const done = document.createElement('button');
    done.type = 'button';
    done.textContent = 'Done';
    done.addEventListener('click', () => context.close());
    host.append(where, done);
    return { dispose() {} };
  },
};
```

Without a `loadExtra` option the mount loads `standInExtra`, which writes one line: `Dock two spacecraft for gemini-8`.

---

## 7. User Interactions

### Always the Mount's `user`

`mountMission` returns `user`, made with `userEvent.setup()`. Use it for every interaction:

```ts
it('steps to the next and previous events', async () => {
  const { user } = await mountMission('apollo-11', { start: 'explore' });
  const card = screen.getByRole('article');
  expect(within(card).getByRole('button', { name: 'Previous event' })).toBeDisabled();

  await user.click(within(card).getByRole('button', { name: 'Next event' }));
  expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent(
    'First stage separates',
  );
});
```

**NEVER use `fireEvent`.** `user` sends what a real visitor's browser sends (pointer, focus, key down and up, click).

### Common Interactions

```ts
// Click
await user.click(screen.getByRole('button', { name: 'Explore Apollo 11' }));

// Keys on the focused control
await user.click(within(timeline).getByRole('slider', { name: 'Mission time' }));
await user.keyboard('{PageUp}{PageUp}');
await user.keyboard('{End}');

// Escape (closes the top dialog, or explores from the welcome)
await user.keyboard('{Escape}');

// A select, by the option's text
await user.selectOptions(
  within(timeline).getByRole('combobox', { name: 'Jump to a chapter' }),
  'Splashdown',
);

// Open a folded Sources list
await user.click(within(sources).getByText('Sources (7)'));
```

### Things That Are Not the Visitor

The scene, the speakers, and the screen act on their own. Those are calls on the fakes, not on `user`: `director.cameraMovesTo('spacecraft')`, `sound.starts()`, `frames.advance(3)`.

---

## 8. Query Priority

### Testing Library Query Priority Table

Use the highest-priority query that works:

| Priority | Query                  | When to use                                                                        |
| -------- | ---------------------- | ---------------------------------------------------------------------------------- |
| 1        | `getByRole`            | Buttons, links, headings, dialogs, regions, sliders, comboboxes, figures, statuses |
| 2        | `getByLabelText`       | Form fields with a label                                                           |
| 3        | `getByPlaceholderText` | Inputs with placeholder text (none on this site yet)                               |
| 4        | `getByText`            | Text that is not a control: a date line, a note, a transcript                      |
| 5        | `getByDisplayValue`    | A control's current value                                                          |
| 6        | `getByTestId`          | Never in interface tests (below)                                                   |

### `getByTestId` Is for the Browser Tests

`index.html` and `src/ui` carry `data-testid` attributes for the Playwright tests. Interface tests never use them: every element a visitor uses has a role and a name, and a test that cannot find one by role has found an accessibility problem to report.

### Queries for This Site's Markup

```ts
// Dialogs, by their titles
screen.getByRole('dialog', { name: 'Mission to the Moon' }); // the mission list
screen.getByRole('dialog', { name: 'About Apollo 11' });

// Landmarks and groups named in index.html
screen.getByRole('region', { name: 'Timeline' });
screen.getByRole('region', { name: 'Guided tour' });
screen.getByRole('group', { name: 'Look at' });
within(timeline).getByRole('group', { name: 'Chapters' });

// The event card is an article; its title is its only level-3 heading
const card = screen.getByRole('article');
within(card).getByRole('heading', { level: 3 });

// Controls
within(timeline).getByRole('slider', { name: 'Mission time' });
within(timeline).getByRole('combobox', { name: 'Speed' });
within(card).getByRole('region', { name: 'Recording' });
within(recording).getByRole('status');

// The mission on show in the list
within(missionList()).getByRole('listitem', { current: true });

// A folded Sources list is a group; the photo is a figure
within(card).getByRole('group');
within(card).getByRole('figure');
```

**Names with hidden words.** A link that opens a new tab ends with hidden words, and the mission's button ends with ", all missions". Match the start or the end with a regular expression:

```ts
within(photo).getByRole('link', { name: /^Original/ });
screen.getByRole('button', { name: /all missions$/ });
```

---

## 9. Assertions & Waiting

### Sync Assertions (Most of the Time)

The interface answers a click, a key, a frame, or a fake's call at once. Assert straight after:

```ts
await user.click(screen.getByRole('button', { name: 'Take the tour of Apollo 11' }));

expect(screen.queryByRole('dialog', { name: 'Mission to the Moon' })).not.toBeInTheDocument();
expect(screen.getByRole('region', { name: 'Guided tour' })).toHaveTextContent('Stop 1 of 12');
expect(navigation.address).toBeNull();
```

### Async Assertions

Only a loader's answer (a memorial page, an extra) arrives later. Wait for it with `findBy*` or `waitFor`:

```ts
expect(await within(sheet).findByText('Opened over apollo-11, at liftoff')).toBeInTheDocument();
```

### `waitFor` vs `findBy*`

Both wait. `findBy*` is `waitFor` plus `getBy*`. **Prefer `waitFor` when** you wait for something to disappear, or need several assertions after the wait:

```ts
await waitFor(() => {
  expect(within(page).queryByRole('status')).not.toBeInTheDocument();
});
expect(within(page).getByText('January 27, 1967')).toBeInTheDocument();
```

Never wait for the clock or a trip with `waitFor`: draw frames instead.

### Negative Assertions with `queryBy*`

```ts
// CORRECT - queryBy returns null when not found
expect(within(card).queryByRole('button', { name: 'Tell me more' })).not.toBeInTheDocument();

// WRONG - getBy throws when not found, breaking the test
expect(within(card).getByRole('button', { name: 'Tell me more' })).not.toBeInTheDocument(); // THROWS!
```

### Hidden Is Not Gone

Role queries leave out `hidden` elements, closed dialogs, and `aria-hidden` ones. Text queries do not. For text that is there but hidden, assert visibility:

```ts
const { director } = await mountMission('apollo-11', { start: 'explore' });
expect(screen.getByText('Fast forward')).not.toBeVisible();

director.setFastForward(true);
expect(screen.getByText('Fast forward')).toBeVisible();
```

`toBeVisible()` also knows a closed `<details>`: what is folded under "Sources (7)" is not visible until it opens.

### Text Broken Up by Elements

`getByText` matches an element's own text. When a line is built from several elements (the card's time, the clock's date), assert on the container's text instead:

```ts
expect(card).toHaveTextContent('102:45:39 after liftoff');
expect(timeline).toHaveTextContent('Jul 20, 1969 20:17:39 UTC');
```

### Announcements: the One Place for Fake Timers

The announcer waits 500 ms for things to settle, then speaks on the next frame. That debounce is timer logic, so fake **only** the timeouts (the frames stay the test's own), then draw a frame:

```ts
// The announcer waits half a second for things to settle, then speaks on the next frame.
describe('announcements', () => {
  const settle = (frames: Frames): void => {
    vi.advanceTimersByTime(500);
    frames.frame();
  };

  it('says the event and its time once the card stops stepping, and only the latest', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { user, frames } = await mountMission('apollo-11', { start: 'explore' });

    await user.click(screen.getByRole('button', { name: 'Next event' }));
    await user.click(screen.getByRole('button', { name: 'Next event' }));
    settle(frames);

    expect(
      screen.getByText('In orbit around Earth, 11 minutes after liftoff, day 1 of the flight.'),
    ).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByText(/^First stage separates,/)).not.toBeInTheDocument();
  });
});
```

`user` keeps working under fake timers (the mount moves the timers along for it). Do not use `waitFor` under fake timers: nothing is pending that it could wait for.

### Common Matchers Reference

| Matcher                                    | Use for                                                   |
| ------------------------------------------ | --------------------------------------------------------- |
| `.toBeInTheDocument()`                     | The element exists                                        |
| `.toBeVisible()`                           | It exists and can be seen (not `hidden`, not folded away) |
| `.toHaveTextContent('text')`               | It contains the text (whitespace normalized)              |
| `.toHaveAccessibleName('name')`            | What a screen reader calls it                             |
| `.toHaveAccessibleDescription(text)`       | Its description (`aria-describedby`)                      |
| `.toHaveAttribute('aria-pressed', 'true')` | Pressed, expanded, and current states                     |
| `.toHaveFocus()`                           | Keyboard focus is on it                                   |
| `.toBeDisabled()` / `.toBeEnabled()`       | A control can or cannot be used                           |
| `.toHaveDisplayValue('2×')`                | The option a select shows                                 |
| `.toHaveClass('is-touring')`               | A state the page marks with a class                       |
| `.toEqual([...])`                          | Lists of names, the device's stored visits                |
| `.not.toBeInTheDocument()`                 | It does not exist (with `queryBy*`)                       |

---

## 10. Other Mocking

The edges in section 5 are almost always enough. These few are allowed besides them:

### Spying on the Console

The site logs a load failure with `console.error`, and an extra's attempt to change a site value with `console.warn`. Silence it in that test, and assert it when the message is the behavior:

```ts
it("does not let an extra change the site's own values", () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  recordVisit('apollo-8');

  extraStore('patches').set('visited-missions', ['apollo-13']);

  expect(extraStore('patches').get('visited-missions')).toEqual(['apollo-8']);
  expect(warn).toHaveBeenCalledWith(
    '"visited-missions" is kept by the site; extras can read it but not change it.',
  );
});
```

No restore call is needed: the setup file restores every spy after each test.

### Making the Browser's Storage Fail

The device's storage is an edge too. Make it throw from `Storage.prototype`:

```ts
vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
  throw new DOMException('Storage is turned off', 'SecurityError');
});
```

### Reading What Is Stored on the Device

Only one value is stored, the missions visited. Read it with `visitedMissions()`:

```ts
expect(visitedMissions()).toEqual(['apollo-11']);
```

### What Is Never Replaced

- A module of the site, with `vi.mock` (no `vi.mock` at all in interface tests)
- `MissionPlayer`, `Tour`, `MissionIndex`, or any part of `src/ui`
- `requestAnimationFrame` or `performance.now` outside `fakeFrames`
- Every timer at once with a bare `vi.useFakeTimers()` (it also takes over the frames and the clock)

---

## 11. Test File Structure

### Canonical Ordering

Every test file follows this order. Here is `src/ui/extra-sheet.test.ts`, trimmed, with the name of each part added as a comment:

```ts
// ── What the file covers ─────────────────────
/**
 * The extras sheet, opened from "Try it" on Apollo 11's liftoff. The extra
 * inside is a tiny stand-in passed through `loadExtra` (the interface's
 * edge): each real extra's own code is tested on its own.
 */

// ── Imports ──────────────────────────────────
import { describe, expect, it, vi } from 'vitest';
import type { Mission } from '../content/types.ts';
import { meta as stages } from '../extras/stages/meta.ts';
import type { Extra } from '../extras/types.ts';
import { mountMission, navigation, screen, sound, within } from '../test/test-utils.ts';

// ── Typed fixtures and tiny fakes ────────────
const tinyStages: Extra = {
  meta: stages,
  mount(host, context, params) {
    /* ... */
  },
};
const loadTinyStages = (): Promise<Extra> => Promise.resolve(tinyStages);
const tryItOnTheLanding = (mission: Mission): Mission => ({/* ... */});

// ── Test suites ──────────────────────────────
describe('the extras sheet', () => {
  describe('opening', () => {
    /* ... */
  });
  describe('closing', () => {
    /* ... */
  });
  describe('failing to load', () => {
    /* ... */
  });
});
```

Mount helpers, when a file has them, come after the fixtures and before the suites (`atTheLanding` in `audio-player.test.ts`, `openCredits` in `credits-dialog.test.ts`).

Each test reads in three steps, separated by blank lines: mount (and get to the starting point), act, assert.

### Naming Conventions

- **Test files:** beside their module: `src/ui/hub.ts` and `src/ui/hub.test.ts`. The whole interface working together is `src/ui/interface.test.ts`.
- **Describe blocks:** what the visitor knows the part as, in plain words: `describe('the mission list', ...)`, `describe('the tour panel', ...)`. A pure helper uses its own name: `describe('formatElapsed', ...)`.
- **Nested describes:** behavioral groupings: `describe('choosing', ...)`, `describe('leaving without a choice', ...)`.
- **Test names:** what a visitor sees or can do: `it('starts exploring when the welcome is closed with Escape', ...)`.

### Standard Behavioral Describe Groupings

| Grouping                                    | When to use                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| `rendering`                                 | What a part shows for a mission, and what it leaves out                  |
| `opening` / `closing`                       | A dialog or sheet coming and going, focus, the tab title                 |
| `loading` / `failing to load`               | A loader's waiting, answer, and failure                                  |
| `choosing`                                  | Picking an entry, a view, a chapter                                      |
| `stepping` / `traveling`                    | The card's Previous and Next; the tour's trips and Skip                  |
| `exploring` / `touring` / `during the tour` | States of the whole interface                                            |
| `the ending` / `leaving`                    | The tour's end and the ways out of it                                    |
| `announcements`                             | What screen readers hear (fake timers allowed here)                      |
| Domain groups                               | `photo`, `sources`, `try it`, `recording`, `true scale`, `one at a time` |

---

## 12. Testing Pure Modules

### When a Unit Test Is Right

Write a unit test only for a pure helper with many cases or tricky edges: the time and date writers (`format.ts`), the event and chapter lookups (`mission-index.ts`), the device store, the citation builders, `howDrawnParagraphs`, and in `src/app` the deep link reader, the views, and the flight outline. Use real missions as inputs, and `it.each` tables for many cases:

```ts
describe('missionDates', () => {
  it.each([
    ['in one month', apollo11, 'July 16–24, 1969'],
    ['across two months', apollo14, 'January 31 – February 9, 1971'],
    ['across two days', gemini8, 'March 16–17, 1966'],
    ['on one day', gemini3, 'March 23, 1965'],
    ['across two years', acrossTheNewYear, 'December 31, 1968 – January 2, 1969'],
    ['with no launch time', withoutLaunch(apollo11), ''],
  ])('a flight %s', (_name, mission, dates) => {
    expect(missionDates(mission)).toBe(dates);
  });
});
```

A builder that returns elements (a citation list) is tested on the element it returns, with `within`:

```ts
it("links to the citation's own page, or else to the source's", () => {
  const list = citationList([TIMELINE, WHOLE_CATALOG]);

  expect(within(list).getByRole('link', { name: /^Apollo 11 Timeline/ })).toHaveAttribute(
    'href',
    TIMELINE.url,
  );
  expect(within(list).getByRole('link', { name: /^NSSDCA Master Catalog/ })).toHaveAttribute(
    'href',
    SOURCES['nssdca-master-catalog'].url,
  );
});
```

The element is not on the page, so assert its text with `toHaveTextContent`, not `toBeInTheDocument`.

### Prefer Testing Through the Interface

If a helper is used in one place and has no tricky cases, test it through the interface that uses it. Keep unit tests sparse: a dozen cases that pin down edges, not one per line of code.

### The Node Project: Content and Flight Tests

Tests under `src/app`, `src/sim`, and `src/content` run in plain Node (the `flight` project): no page, no `document`. They import a mission's own files directly, as the flight tests do, rather than the registries:

```ts
import { bundle as apollo11 } from '../content/missions/apollo-11/index.ts';
import { story as gemini8 } from '../content/missions/gemini-8/story.ts';
```

- **New tests assert with `expect`.** The older flight tests use `node:assert/strict` (declared in `src/sim/test/node-shim.d.ts`, since there is no `@types/node`). Leave them as they are; do not convert them, and do not add `node:assert` to new files.
- **Rules about content** (events in order, every citation resolves, every photo and recording exists, no durations in raw seconds, summaries match their stories) live in `src/sim/test/all-missions.test.ts`, once, for every mission. Add a new rule there, not an interface test per mission.
- **The tour's timing** (trip length, easing, the camera's lead before arrival, a stalled tab) lives in `src/app/tour.test.ts`, with its own fake screen. Interface tests only check that a trip arrives.
- **Flight path math** lives in `src/sim/test/`.

---

## 13. Common Mistakes

### 1. Putting the Page Together by Hand

```ts
// WRONG - a page that is not the real one, wired differently from the site
document.body.innerHTML = '<article id="card"></article>';
setUpEventCard({/* ... */});

// CORRECT - the real page, the real interface, the real mission
await mountMission('apollo-11', { event: 'landing' });
```

### 2. Using `fireEvent` Instead of the Mount's `user`

```ts
// WRONG - one synthetic event, not what a browser sends
fireEvent.click(button);

// CORRECT - the full sequence a visitor's browser sends
await user.click(within(card).getByRole('button', { name: 'Next event' }));
```

### 3. Using `getBy*` for Negative Assertions

```ts
// WRONG - getBy throws when nothing is found
expect(screen.getByRole('region', { name: 'Guided tour' })).not.toBeInTheDocument();

// CORRECT - queryBy returns null
expect(screen.queryByRole('region', { name: 'Guided tour' })).not.toBeInTheDocument();
```

### 4. Waiting on Real Time

```ts
// WRONG - slow, and the answer depends on the computer
await new Promise((resolve) => setTimeout(resolve, 5000));

// CORRECT - draw the frames; time moves only when the test says
frames.advance(A_WHOLE_TRIP);
```

### 5. Replacing a Module of the Site

```ts
// WRONG - the interface then talks to something that is not the clock
vi.mock('../app/player.ts');

// CORRECT - the real clock, on the screen's fake frames
const { user, frames } = await mountMission('apollo-11', { start: 'explore' });
await user.click(within(timeline).getByRole('button', { name: 'Play' }));
frames.advance(2);
```

### 6. Reading Internal State

```ts
// WRONG - what the code holds, not what the visitor sees
expect(document.getElementById('tour')?.dataset['phase']).toBe('stopped');

// CORRECT - what the panel says
expect(panel).toHaveTextContent('Stop 2 of 6');
expect(panel).not.toHaveTextContent('On the way…');
```

### 7. Faking Every Timer

```ts
// WRONG - also takes over the frames and the clock the mount set up
vi.useFakeTimers();

// CORRECT - only the timeouts, only for the announcer's debounce
vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
```

### 8. Checking a Hidden Element Is Gone with a Text Query

```ts
// WRONG - the "Fast forward" mark is always in the page; it is hidden, not removed
expect(screen.queryByText('Fast forward')).not.toBeInTheDocument();

// CORRECT
expect(screen.getByText('Fast forward')).not.toBeVisible();
```

### 9. Testing a Content Rule Through the Interface

```ts
// WRONG - one interface test per mission, for a rule about the content
for (const id of allMissionIds) {
  /* mount and check every card */
}

// CORRECT - the rule once, for every mission, in src/sim/test/all-missions.test.ts;
// the interface test uses one or two missions that differ
await mountMission('gemini-8', { start: 'explore' });
```

### 10. Measuring the Tour in the Interface

```ts
// WRONG - the tour's timing belongs to src/app/tour.test.ts
expect(secondsTaken).toBe(5);

// CORRECT - draw enough frames, then check it arrived
frames.advance(A_WHOLE_TRIP);
expect(
  within(screen.getByRole('region', { name: 'Timeline' })).getByText('01:33:00'),
).toBeInTheDocument();
```

---

## 14. Strict Enforcement Rules

**REFUSE to write code that violates these rules:**

### ALWAYS

- Mount with `mountMission` (or `mountRecordings`) from `src/test/test-utils.ts`
- Use the mount's `user` (made with `userEvent.setup()`) for every interaction
- Use real missions as data, chosen to differ; a typed fixture only for an edge no mission has
- Replace only the edges: `FakeDirector`, `fakeFrames`, `sound`, `navigation`, the jsdom stand-ins, and the `loadMemorial` / `loadExtra` options
- Let time pass by drawing frames
- Use `queryBy*` for negative assertions, and `not.toBeVisible()` for something hidden
- Use `findBy*` or `waitFor` only for a loader's answer
- Query by role and name first
- Spy on `console.error` in a test that makes a loader fail
- Fill a jsdom gap in `src/test/browser.ts` when a "not implemented" error shows up
- Follow the canonical import order and file structure
- Group tests into behavioral `describe` blocks
- Assert with `expect` in new tests
- Write in plain words and US English

### NEVER

- Put the page together by hand, or call `setUp*` functions of `src/ui` in an interface test
- Use `fireEvent`
- `vi.mock` a module of the site (`src/ui/*`, `src/app/*`, `src/content/*`, `src/extras/*`)
- Read or assert private state: the player, the tour, `data-phase`, call counts of the site's own functions
- Use `getByTestId` in an interface test (test ids are for the browser tests)
- Use `getBy*` in negative assertions
- Wait on wall-clock time (sleeps, real timers, real animation frames)
- Use `vi.useFakeTimers()` unless testing timer-specific logic, and then fake only `setTimeout` and `clearTimeout`
- Use `waitFor` under fake timers
- Add if/else logic inside tests
- Loop an interface test over every mission
- Assert trip durations, easing, or camera timing in an interface test
- Import `src/main.ts` in a test
- Convert the older flight tests from `node:assert` to `expect`, or use `node:assert` in a new test
- Silence the console to hide a jsdom "not implemented" error
