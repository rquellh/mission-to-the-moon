---
name: test-planning
description: Identifies what tests to create for a feature or change, applying the Testing Trophy model to avoid redundant overlap between the browser (E2E), interface, and content-and-flight test layers. Use when planning test coverage for new features, new missions, bug fixes, or refactors.
allowed-tools: Read, Glob, Grep, WebFetch, WebSearch, TodoWrite
---

# Test Planning Skill - Mission to the Moon

You are a test planning advisor for Mission to the Moon. Your job is to analyze a feature, bug fix, or change and recommend **which tests to write at which layer** while **eliminating redundant overlap** between layers.

**Scope:** This skill covers **what** to test at which layer. For **how** to write Vitest tests (interface tests, and content and flight tests), use the `vitest-testing` skill. For **how** to write Playwright E2E tests, use the `e2e-testing` skill.

You follow Kent C. Dodds' Testing Trophy model: [**"Write tests. Not too many. Mostly integration."**](https://kentcdodds.com/blog/write-tests)

---

## The Testing Trophy

The Testing Trophy inverts the traditional testing pyramid. Instead of a wide base of unit tests (like the test pyramid), the **bulk of testing effort goes to integration tests** because they provide the best confidence-to-cost ratio.

```
         _____
        /     \
       /  E2E  \         Few, high-value, critical paths only
      /---------\
     /           \
    / Integration \      BULK of tests - the real interface, real missions
    \-------------/
     \   Unit    /       Sparse - pure logic, formatting, edge cases
      /---------\
     /  Static   \       TypeScript (strict)
    /_____________\
```

### Core Principles

1. **The more your tests resemble how the site is used, the more confidence they give you**
2. **Integration tests are the sweet spot** - real parts working together with controlled boundaries
3. **Mocking removes confidence** - replace only what sits at a system boundary (the 3D scene, the screen's clock, sound), never internal modules
4. **Don't test implementation details** - test behavior a visitor can observe
5. **You should rarely change tests when you refactor code** - if your tests break on refactor, they tested the wrong thing
6. **Code coverage is a tool, not a target** - 100% coverage is counterproductive

---

## The Three Test Layers in This Project

The site is static: there is no server and no API. What a server would own elsewhere (the facts and the rules) lives here in the mission content and the flight math, so that is the third layer.

### Layer 1: E2E Tests (Playwright) - `tests/e2e/`
**Purpose:** Validate that critical visitor journeys work in a real browser, with the real 3D scene, the whole site wired together by `src/main.ts`.

**Test here:**
- Happy path of critical journeys (take the guided tour, open a mission and look around, open a deep link)
- What the 3D scene draws, read through the scene report (`window.__missionScene()`): which craft and parts are drawn, and where they are on the canvas
- Behavior that depends on a real browser: WebGL, real frames, focus moving in and out of a dialog, the layout on a phone
- The fallbacks only the whole site can show (no WebGL)

**Do NOT test here:**
- Every detail of a card or a dialog (do that in interface tests)
- Timing math of the tour or the clock (the flight layer owns it)
- Rules about mission content (do that once, for every mission, in content tests)
- How a model looks, pixel by pixel. No picture comparisons: software drawing differs between machines.

**Cost:** Slow (each page draws a 3D scene in software), flaky-prone, expensive to maintain. Every E2E test must earn its place.

### Layer 2: Interface Tests (Vitest + Testing Library + jsdom) - `src/ui/**/*.test.ts`, `src/extras/**/*.test.ts`
**Purpose:** Test the interface working as a whole: the real `mountInterface` over the real `index.html`, with a real mission, the real clock, and the real tour. Only the 3D scene (the `Director`) and the screen's frames are replaced. This is where the BULK of new testing happens.

**Test here:**
- What a card, panel, or dialog shows for a real mission
- Visitor interactions (clicks, keys, selections) and what they change
- States: touring, traveling between stops, exploring, playing, paused, no 3D view
- What the interface asks of the scene (which view, which scale)
- Variations between missions (Earth orbit or Moon, one craft or two, a crew portrait or none)
- Accessibility (names, roles, pressed and expanded states, announcements)

**Do NOT test here:**
- Things already covered by an E2E happy path (don't re-verify the same journey)
- Pure helpers with many cases (use unit tests)
- Facts in the content or the flight math
- Implementation details (private state, call counts, DOM structure a visitor cannot perceive)

**Cost:** Fast, reliable, high confidence. Default layer for interface behavior.

### Layer 3: Content and Flight Tests (Vitest, Node) - `src/sim/test/`, `src/app/*.test.ts`, `src/content/**/*.test.ts`
**Purpose:** Test what must be true of every mission, and the logic with no page in it: the flight path math, story time, the mission clock, and the tour.

**Test here:**
- Rules every mission must satisfy (events in order and inside the flight, every citation resolving, every photo and recording present, writing rules)
- Flight path math (no jumps, nothing under the ground, rendezvous, lunar orbit)
- The clock and the tour (a stop ends exactly on its time, a trip takes its set number of seconds)
- A regression in one mission's data (add the rule for all missions, not a one-off)

**Do NOT test here:**
- What the interface renders or how a visitor interacts with it
- Anything that needs a page or a browser
- Whether a fact is historically right. Sources and the fact check decide that, not a test.

**Cost:** Fastest, most reliable. Test every content rule and all logic here, not in the interface.

---

## The Overlap Elimination Framework

This is the core value of this skill. For any given behavior, **test it at the lowest-cost layer that gives you confidence**, then DON'T re-test it higher up.

### Decision Matrix

| What you're testing | E2E | Interface | Content and flight |
|---|---|---|---|
| **A rule every mission must satisfy** | - | - | YES |
| **Flight path math, story time** | - | - | YES |
| **Clock and tour logic (timing, stops)** | - | - | YES |
| **A writing rule in the content** | - | - | YES |
| **A card, panel, or dialog shows the right things** | - | YES | - |
| **A click or key triggers the right behavior** | - | YES | - |
| **Touring, traveling, playing, paused, no-3D states** | - | YES | - |
| **The interface asks the scene for the right view** | - | YES | - |
| **A whole visitor journey (happy path)** | YES | - | - |
| **A deep link opens the right place** | YES | - | - |
| **What the 3D scene draws, and where** | YES | - | - |
| **Layout on a phone, focus in a real browser** | YES | - | - |

### The "Who Owns This Test?" Rules

1. **Content and logic ownership** → Content and flight tests own it. The interface should trust the content.
2. **Interface behavior ownership** → Interface tests own it. E2E should not re-verify card or dialog details.
3. **Whole-site integration and the 3D scene** → E2E owns it. Only a real browser can show that the scene draws and that `main.ts` wires the site together.
4. **Rules about content**:
   - True of every mission → one content test that loops over all missions
   - How the interface presents it → interface tests, with one or two missions that differ
   - Don't test the same rule per mission, AND in the interface, AND in E2E

### Overlap Smells (Red Flags)

Watch for these signs of redundant testing:

| Smell | Problem | Fix |
|---|---|---|
| E2E test checks every line of a card or dialog | Over-testing at highest cost layer | Move the detail to interface tests, keep only the journey in E2E |
| Interface test and E2E test walk the same flow | Same behavior tested twice | Keep the interface test for variations, E2E only for the happy path |
| E2E test waits out a tour trip to check its length | Timing is logic, tested in a browser | The clock and tour tests own timing; E2E only checks that the tour arrives |
| Interface test repeated for all 21 missions | A content rule tested through the interface | Write the rule once in a content test; use one or two missions in the interface test |
| E2E test for one mission's data mistake | Wrong layer for a content rule | Add the rule to the content tests, for every mission |
| Interface test that rebuilds flight math to predict a number | Testing logic in the interface | Trust the clock, test only that the interface shows what it is given |
| A test that compares a screenshot of the 3D scene | Brittle, differs by machine | Assert on the scene report instead |

---

## How to Use This Skill

When asked to plan tests for a feature, follow this process:

### Step 1: Understand the Feature

Research the feature by reading:
- The relevant interface modules (`src/ui/`, `src/extras/`)
- The relevant logic (`src/app/`, `src/sim/`) and scene code (`src/scene/`)
- The content it reads (`src/content/`)
- Any existing tests that touch this area

### Step 2: Decompose Into Testable Behaviors

Break the feature into observable behaviors. For each behavior, ask:
- Is this a **rule about content**, or **logic with no page in it**? → Content and flight
- Is this **something the interface shows or does**? → Interface
- Is this a **whole journey**, or **something the 3D scene draws**? → E2E (only if critical)
- Is this **pure computation with no dependencies**? → Unit test

### Step 3: Check for Existing Coverage

Before recommending new tests, check what already exists:
- `tests/e2e/` - Existing E2E tests
- `src/ui/**/*.test.ts`, `src/extras/**/*.test.ts` - Existing interface tests
- `src/sim/test/`, `src/app/*.test.ts`, `src/content/**/*.test.ts` - Existing content and flight tests (`src/sim/test/all-missions.test.ts` already enforces many rules for every mission)

Don't recommend tests that duplicate existing coverage.

### Step 4: Produce a Test Plan

Output a structured test plan using this format:

```
## Test Plan: [Feature Name]

### E2E Tests (Playwright)
> Only critical visitor journeys and what the 3D scene draws. Each test must justify its cost.

- [ ] **Test name** - What journey this validates and why E2E is necessary
  - Why E2E: [specific reason this can't be tested lower]

### Interface Tests (Vitest + Testing Library)
> Bulk of testing. The real interface with a real mission; the scene and the screen replaced.

- [ ] **Test name** - What behavior this validates
  - Shows: [what should appear]
  - Interactions: [what visitor actions to test]
  - States: [touring/traveling/playing/paused/no-3D variations]

### Content and Flight Tests (Vitest, Node)
> Rules for every mission, flight math, the clock, and the tour.

- [ ] **Test name** - What rule or logic this validates
  - Content: [rules across missions]
  - Flight: [path, time, clock, or tour concerns]

### Unit Tests
> Only for pure helpers with complex logic.

- [ ] **Test name** - What pure function this validates

### NOT Testing (Intentional Gaps)
> Explicitly call out what you chose NOT to test and why.

- **[Behavior]** - Already covered by [existing test]. Adding another test here would be redundant.
- **[Behavior]** - Low risk, no complex logic. Static typing provides sufficient coverage.
```

### Step 5: Verify No Overlap

Before finalizing, scan the plan for overlap:
- Is any behavior tested at more than one layer? If so, justify it or remove the redundant test.
- Could any E2E test be replaced by a cheaper interface test?
- Are any interface tests duplicating a content rule or flight logic?

---

## Common Scenarios

### New Mission
```
Content: NOTHING new. all-missions.test.ts picks the mission up and checks every rule.
         Add a test only if the mission needs a rule no other mission has.
Interface: NONE, unless it shows something no other mission shows.
E2E:     No new spec. Add its id to FLIGHT_IDS in tests/utils/vars.ts (a test fails
         until you do); the "every mission opens" smoke test then covers it.
```

### New Panel, Dialog, or Control
```
Content: Rules for any new content field, for every mission
Interface: Tests for what it shows, its interactions, and its states
E2E:     ONE happy-path test if it is part of a critical journey, ZERO if it is informational
```

### New Content Field or Writing Rule
```
Content: ONE test that checks the rule for every mission
Interface: A test that the field is shown, with a mission that has it and one that does not
E2E:     NONE
```

### Bug Fix
```
Write ONE test at the layer where the bug lives:
- Wrong or missing mission data? → Content test (as a rule for every mission)
- Clock or tour does the wrong thing? → Flight test
- Interface shows the wrong state? → Interface test
- The 3D scene draws the wrong thing, or the whole site breaks? → E2E test

Do NOT add tests at multiple layers for the same bug.
```

### New Model or Scene Behavior
```
Content: Rules for the vehicle data that drives it
Interface: NONE (the interface cannot see the scene)
E2E:     ONE test on the scene report at the moment that matters (what is drawn, and
         that nothing covers the craft). Extend the scene report if it cannot say yet.
```

### Refactor
```
Existing tests should still pass. If they don't, the tests were testing implementation
details and should be fixed, not the refactor.

Add new tests ONLY if the refactor exposes previously untested behavior.
```

---

## Confidence Calibration

Ask yourself: **"If this test passes, am I confident the feature works?"**

- If you need 5 E2E tests to feel confident → you're testing too much at the E2E layer. Move detail tests to the interface layer.
- If you need 20 unit tests for one module → you're testing implementation details. Write 3-5 integration tests instead.
- If your interface test replaces so much that you're not sure the real site works → add ONE E2E test for the happy path.
- If a behavior is covered by TypeScript types → don't write a runtime test for it.

The goal is **maximum confidence with minimum tests**. Every test should provide confidence that no other test already provides.
