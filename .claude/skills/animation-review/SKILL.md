---
name: animation-review
description: Finds and fixes problems in how a flight plays on screen in Mission to the Moon - the pace of the clock, the guided tour's trips and stops, how the camera moves and follows the spacecraft, the fast-forward ring, two craft parting or docking, and whether the story card matches what the scene shows. Use this whenever the owner says an animation is too fast, odd, jumpy, hard to follow, or "not great"; whenever the card, the tour and the scene seem out of step; whenever they send a screen recording; and before and after any change to story time, tour pacing, camera moves, views, fast forward, or a flight's phases - even when the request names only one moment ("Eagle undocks looks wrong"). Record the motion before changing code.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash(node tools/*), Bash(bash .claude/skills/animation-review/scripts/*), Bash(swift .claude/skills/animation-review/scripts/*), Bash(npm run *), Bash(npx vitest*), TodoWrite
---

# Animation Review Skill - Mission to the Moon

You review and repair how a flight plays: what moves, how fast, where the camera goes, and whether the words at the bottom of the screen describe what is on it.

**Scope:** motion and its timing. For the layout of the card and dock, work in `src/styles/main.css` directly. For how to write the tests a fix needs, use `test-planning`, `vitest-testing` and `e2e-testing`.

## Why this skill exists

The site's owner judges motion by watching it, and wants it calm: "I want this UI to not be distracting, but give the user a lot of information when they want it."

Motion problems here hide from the usual checks. In November 2026 a single moment ("Eagle undocks") took four rounds of fixes, and every round passed lint, types, 800 unit tests and the browser suite. The first three rounds were judged from still frames a second or more apart, and each fixed something real while missing what the owner was looking at. One 34-second screen recording then showed three problems in a minute: the camera lurched past the Moon when it changed view, the stop never showed the undocking it described, and the card named a moment the scene had not reached.

So the method is: **watch the motion the way a visitor sees it, write down what is on screen second by second, and compare that with the standards below, before touching code and again after.** Passing tests say the code does what it was written to do. They do not say it is pleasant to watch.

## What good looks like

Each standard came from something the owner said or showed. Check every one over the whole sequence, not only the one that was reported, because a fix to one usually disturbs its neighbours.

| #   | Standard                                                                                                                                                                                                 | What breaking it looks like                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **The card describes what is on screen.** It never names a moment the clock has not reached.                                                                                                             | The card says "Eagle undocks" while the scene still shows a day of orbiting.                                                                                              |
| 2   | **A stop shows its event.** If the scene draws the action (two craft parting), the visitor sees it at the stop, under that stop's card.                                                                  | The stop rests on the instant before the action; the action plays after Next, under the next card.                                                                        |
| 3   | **One steady view through a time-lapse.** The camera does not change view while fast forward shows.                                                                                                      | Two wide views of the same ring with a lurch between them.                                                                                                                |
| 4   | **The camera goes around a body, never past it,** and it eases. A change of view is one move.                                                                                                            | The Moon swells to fill the frame for a few frames; the limb whips by; a snap in to the craft.                                                                            |
| 5   | **A drawn spacecraft never races around its body.** About one lap in 8 seconds is the limit the owner accepted; one in 4.4 seconds was "way too fast". Faster stretches belong to the fast-forward ring. | A model whirling round the Moon, or the ship view's camera whirling with it.                                                                                              |
| 6   | **Avoid the half-faded band.** A stretch should be clearly a drawn craft or clearly the ring.                                                                                                            | Craft and ring both partly shown for seconds.                                                                                                                             |
| 7   | **The subject is in frame and large enough to see.** At an undocking or docking that means both craft, clear of the dock.                                                                                | One craft off the edge or behind the card; a pair 30 pixels long.                                                                                                         |
| 8   | **Nothing pops.** Models fade, gaps open and close over a visible time, labels follow.                                                                                                                   | A craft jumps to a dot; a gap goes from 32 to 70 pixels in one frame.                                                                                                     |
| 9   | **Events get Explore's pace; only dead time hurries.** The tour never plays the moments just after or just before a stop faster than Explore does at 1x.                                                 | An undocking that Explore gives 5 seconds gets 2.6 on the tour.                                                                                                           |
| 10  | **A second press does what the button says.** During a trip the tour's main button reads "Skip".                                                                                                         | A visitor presses it again expecting to continue and the tour jumps. (The owner did this once; treat a "the tour jumped" report as a possible skip before hunting a bug.) |
| 11  | **It holds on a phone, in true scale, and with reduced motion** (where everything jumps and nothing animates).                                                                                           | Fine at 1440x900, a craft off the edge at 390x844.                                                                                                                        |

When a report does not fit any row, add a row once the owner has confirmed what they wanted. This table is the memory of what "calm" means here.

## The procedure

### 1. Get a recording before forming a theory

- **If the owner sent a screen recording, cut it up first.** It is the only evidence of what they actually saw, including what they pressed.

  ```bash
  swift .claude/skills/animation-review/scripts/video-sheets.swift "<video>" <out-dir> overview 0 <length> 1 560 4 3
  ```

  That writes contact sheets, one frame a second, twelve to a sheet, each labelled with its time. Read them, find the seconds that matter, then cut those again at 0.25 s with a crop (the last argument is `x,y,width,height` as fractions of the frame) so the spacecraft and the card are legible. Watch the pointer too: a press on the tour's button mid-trip is a skip.

- **If there is no recording, make one and say so.** Ask the owner for a recording when the report is about feel ("odd", "not great") and your own recording does not show an obvious cause. Guessing costs a round trip each time.
- **Record the same sequence yourself** so there is a before to compare with:

  ```bash
  bash .claude/skills/animation-review/scripts/record-tour-trip.sh apollo-11 4 <out-dir>            # desktop
  bash .claude/skills/animation-review/scripts/record-tour-trip.sh apollo-11 4 <out-dir> 22 390x844 --mobile --dpr 2
  bash .claude/skills/animation-review/scripts/record-explore.sh apollo-11 undocking spacecraft <out-dir> 20
  ```

  The first drives the guided tour to a stop (here the fourth) and presses Next; the last opens Explore paused at an event, in a view, and presses Play. Each writes three things:
  - `timeline.tsv`, every 250 ms: seconds, mission clock, fast forward, view, the button's label, the tour counter, the card's title, and where each craft is drawn. It catches standards 1, 3 and 7 without looking at a picture.
  - `cast/pNNNNN.jpg`, every frame the page drew (about ten a second), named by milliseconds after the press.
  - `sheet-N.jpg`, contact sheets of those frames at half-second steps, twelve seconds to a sheet. Read these first; open single frames from `cast/` where a sheet shows something moving quickly.

- For anything those two do not drive (a change of view, a Skip mid-trip, Back), drive `scripts/cast.mjs` yourself: it is `tools/screenshot.mjs` with three more steps, `cast:<dir>` (start keeping frames), `mark` (time zero), and `uncast` (stop and write them). Then `python3 scripts/cast-sheets.py <cast-dir> <out.jpg> <from-ms> <to-ms> <step-ms> [columns] [tile-width]` makes a sheet at any spacing; use 100 ms across a camera move.

Look at motion at several frames a second. Frames a second apart will not show a lurch that lasts half a second: that is exactly how the camera problem was missed three times. Headless Chrome draws with software WebGL, so it is slower than a real screen, but trips keep real time.

### 2. Write the sequence down

Make a table of the whole sequence, from the stop before to the stop after: the trip in, the arrival, the rest, the trip out. For each stretch note the seconds, what the clock covers, the view, whether fast forward shows, what is drawn, and what the card says. Then go down the standards and mark each breach with its time range and the frame that shows it.

Name each breach by class, because the class tells you which layer owns it:

| Class         | Typical cause                                                                     | Where it lives                                                                                                       |
| ------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Pace          | The clock covers too much mission time per second, or the tour squeezes a stretch | `src/sim/story-time.ts`, `src/app/player.ts` (`tripShape`), `src/app/tour.ts`                                        |
| Camera path   | A change of view, or the return from the steady fast-forward view                 | `src/scene/stage.ts` (`applyFraming`, `updateCamera`, the fast view), `src/scene/tween.ts`, `src/scene/config.ts`    |
| Camera timing | The tour moves the camera at the wrong moment                                     | `src/app/tour.ts` (`VIEW_LEAD_SECONDS`, `watchScene`)                                                                |
| Card          | The interface shows a different moment from the scene                             | `src/ui/interface.ts` (where the tour picks its card), `src/app/tour.ts`                                             |
| Drawing       | Fast-forward thresholds, a pair's gap, fades                                      | `src/scene/stage.ts` (`FAST_FORWARD_*`, `STATION_*`, `PAIR_*`)                                                       |
| Flight data   | A phase is missing, so the scene has nothing to draw                              | `src/content/missions/<id>/flight.ts` (for example a lander with no `kind: 'station'` phase beside the ship it left) |
| Stop          | Where a stop rests, what it plays on arriving                                     | `src/app/tour.ts` (the `PARTING_*` constants), `partingsAtEvents` in `src/sim/story-time.ts`                         |

Read the constants where they are defined rather than trusting numbers quoted anywhere else, this file included; they are tuned often.

### 3. Fix at the layer that owns it, one class at a time

- Prefer the general rule over the special case. "Eagle undocks" was first treated as one flight's problem; the causes were rules that reach every flight.
- Before changing a shared rule, **count what it reaches** and say so: how many tour trips, which flights, Explore as well as the tour. A throwaway script over every mission's story clock answers this in a minute (`src/test/test-utils.ts` and `src/app/tour.test.ts` show how to build a flight's clock outside the browser). One tour-pacing change reached 59 of 137 trips; one threshold change altered Explore at normal speed in a dozen flights.
- Keep the stated numbers honest. If a stop now rests a few minutes after its event, the clock in Controls reads later than the event's time: say so.

### 4. Record again, the same way

Run the same recording, on desktop and phone, and put before and after side by side: the timeline rows, and the frames for each breach. Then look at the stretches on either side of the one you changed. A fix to the trip out often shows up as a new problem at the arrival.

Also check the cases a recording of the happy path skips: Skip pressed mid-trip, Back, starting the tour over, the same moment reached in Explore by pressing Play, and reduced motion (`--reduced-motion`).

### 5. Sweep for the same class elsewhere

If the cause was a rule, the same breach is waiting in other flights. Record two or three other tours that exercise it (a Gemini flight for Earth orbit, another Apollo landing), and list the ones you did not watch. For standard 1 the timeline alone is enough, so sweeping every tour is cheap.

### 6. Tests

Pacing arithmetic and the tour's sequencing are pure and belong in unit tests: `src/app/tour.test.ts` runs the real tour and clock against a fake screen, and can assert what the camera was asked for and when, the clock's place at each moment, and how long a trip takes. Do not try to assert the feel of a camera move in a browser test; it is slow, flaky, and still would not tell you whether it looks right. Follow `test-planning` and `vitest-testing`.

### 7. Report what was watched

Say which sequences you watched, on which screens, with frames how far apart, and which you did not. Name the frames or sheets that show each claim. "All checks pass" is a statement about the tests; keep it separate from statements about how it looks. Give side effects on other flights their own list, and say plainly what still looks weak.

## Tools

| Tool                                         | Use                                                                                                                                                                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/record-tour-trip.sh`                | One tour trip: timeline, every frame, contact sheets. Start here for anything on the tour.                                                                                                                                                                                      |
| `scripts/record-explore.sh`                  | Explore playing on from an event, in a chosen view: the same three outputs.                                                                                                                                                                                                     |
| `scripts/cast.mjs`, `scripts/cast-sheets.py` | The recorder underneath, and its contact-sheet maker (needs Python with Pillow), for sequences the two scripts above do not drive.                                                                                                                                              |
| `scripts/video-sheets.swift`                 | Contact sheets from the owner's screen recording (macOS; needs only `swift`).                                                                                                                                                                                                   |
| `tools/screenshot.mjs`                       | Headless Chrome driven by steps: `--step waitfor:body.is-ready`, `wait:<ms>`, `click:<css>`, `key:<key>`, `eval:<js>` (prints the result, awaits promises), `shot:<path>`; flags `--size WxH`, `--mobile`, `--dpr`, `--reduced-motion`. Run `node tools/screenshot.mjs --help`. |
| `window.__missionScene()`                    | What the scene is doing now: `view`, `scaleMode`, `time` (mission seconds), `fastForward`, `clear` (the area the interface leaves), `followed`, and each ship's on-screen `box` (absent when it is not drawn). Defined in `src/scene/report.ts`.                                |

A dev server must be running: `npx vite --port 5199 --strictPort` (the browser tests start their own on 5173). It serves half-finished edits as they are saved, so while a fix is under way the page can show behaviour that belongs to neither the old code nor the new; do not judge from it, and warn the owner not to, until the work is done.

Addresses that put the site straight at a moment (`src/app/deep-link.ts` has them all):

- `?mission=apollo-11&start=tour` - the guided tour. `[data-testid=tour-next]` is Next, and Skip during a trip; `[data-testid=tour-back]` is Back.
- `?mission=apollo-11&start=explore&event=undocking` - Explore, paused at an event, in the event's own view. Add `&view=moon`, `earth`, `spacecraft` or `journey` to choose the view. `#play` is Play and Pause.
- `?mission=apollo-11&start=explore&t=100:20:00` - paused at a mission time.

## How the pieces fit

Enough of the mechanism to read a timeline. Verify details in the code.

- **Story time** (`src/sim/story-time.ts`). The clock does not run at one rate. Each stretch between two key times (the events, and a few added keys) plays for 2 to 14 "story seconds" depending on its length, so a three-minute climb and a three-day coast both get watchable time. Explore at 1x plays one story second per real second. Within a stretch the rate is even, so a day in lunar orbit is twelve laps in twelve seconds.
- **Fast forward** (`src/scene/stage.ts`, `FAST_FORWARD_*`). When a craft would lap its body faster than a threshold, its model fades out, its orbit shows as a bright ring, and the ship view holds a steady wide view. `fastForward` in the scene report is true while that shows, in any view.
- **The guided tour** (`src/app/tour.ts`). Next flies a trip to the next stop; Back and starting play a short run-up. A trip takes as long as its story lasts, between a minimum and a maximum. A longer story is squeezed: Explore's pace for the first and last few seconds, a hurry between (`tripShape` in `src/app/player.ts`). The camera moves to the stop's view shortly before arriving, with rules for fast forward. Some stops rest a little after their event so the event's action is seen (the `PARTING_*` constants).
- **Views** (`src/scene/stage.ts`). Earth, Moon, ship ("spacecraft", a chase view of the followed craft) and journey. Craft are drawn at a fixed size on screen, not to scale.
- **Pairs.** Two craft docked, parting or keeping station are drawn together with a gap that opens and closes in story time; the flight's phases (`kind: 'station'`, `'docked'`) say when.

Numbers for sanity checks: a low lunar orbit takes about two hours (7,100 seconds); a low Earth orbit about ninety minutes. Laps per second on screen is the mission seconds the clock covers per real second, divided by the period.

## Things that have gone wrong before

- **Judging from the wrong build.** The owner tested while a fix was half-saved. Say when a build is ready, and not before.
- **Fixing the reported moment only.** The trip out was slowed while the lurch was on the trip in and the mismatch was on the card.
- **Reading "too fast" as the spacecraft.** Much of it was the camera. Look at the camera's path first.
- **Trusting a transcript of numbers.** A timeline said the view changed at 11.5 s; only frames showed the Moon filling the screen on the way.
- **Reporting a pass as a result.** Every broken round had passed every check.
