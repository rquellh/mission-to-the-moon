# Land on the Moon: How It Was Made

A worked example for the `hands-on-games` skill. The numbers are the game's as a draft. `src/extras/landing/game.ts` is the truth if they differ.

## The moment

Apollo 11's last minute before touchdown. The player's job: slide past the boulders to clear ground, stop the slide, and come down slowly before the fuel runs out.

## The mock-ups

Three options were drawn at phone size, mid-play:

| Option                        | Idea                                                                               | Trade-off said at the time                |
| ----------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------- |
| **A · Find a clear spot**     | Side view of the last minute: slide, stop, come down, with fuel as the clock       | Recommended                               |
| **B · Fly the whole descent** | Ride the whole trip down and make five timed calls                                 | More choosing than flying                 |
| **C · Land on the target**    | Looking straight down, steer onto a target while dust hides the ground (Apollo 12) | Cheapest, but may feel like docking again |

Option A was also drawn from start to finish: the start, out of fuel, landed (390x1100, because the end screen scrolls), and mid-play on a computer (1280x720).

The answer was A, and the start-to-finish boards were approved as drawn. B and C were not commented on, so they count as not chosen, not as rejected.

## How the build was split

One written spec fixed the names and types the rules export, the calls the view offers, every constant, the layout, and every word of copy. Three pieces were then written at the same time, each owning its own files:

| Piece  | Files                                | Had to guarantee                                         |
| ------ | ------------------------------------ | -------------------------------------------------------- |
| Rules  | `game.ts`, `game.test.ts`            | No drawing and no page in it, and tests of every rule    |
| View   | `scene.ts`                           | The whole play area in frame at phone and computer sizes |
| Screen | `index.ts`, `landing.css`, `meta.ts` | Playable without 3D, and the playing screen fits 390x844 |

The interface tests were written after the pieces were joined. They open the game over flights other than Apollo 11 on purpose, so they prove the lookup of the real landing and not one lucky case.

## Difficulty: the first build and the second

After playing the first build, the answer was: "it feels a bit too easy". The causes, and what changed:

| Rule           | First build                   | Second build                | Why                                                   |
| -------------- | ----------------------------- | --------------------------- | ----------------------------------------------------- |
| `startHeight`  | 15                            | 18                          | Room to slow down                                     |
| `startFalling` | 2 (already a safe speed)      | 5 (over `gentleFalling`, 4) | Slower and Faster were never needed                   |
| `clearFrom`    | 6                             | 4                           | With `clearTo`, makes clear ground a patch            |
| `clearTo`      | None: clear to the right edge | 17.5                        | The edge of the play area stopped the lander for free |
| Boulders       | On the left only              | On both sides of the patch  | Sliding too far is now a mistake                      |
| `fuelSeconds`  | 45                            | 32                          | A clean run left too much to spare                    |

What the second build measures, by test or by a scripted run:

- A clean run takes about 17 seconds and ends with about half the fuel. In the first build it took about 21 seconds, with 24 to spare.
- Pressing nothing bumps on the boulders, too fast, after about 9.6 seconds.
- Both footpads are on the patch only while the lander's middle is between 8.2 and 13.3, in a play area that runs from -16.5 to 16.5.
- A cautious run, or one with a bump, ends with very little fuel.

New coach lines were written for sliding on past the patch, a mistake that could not happen before.

## What the screenshots caught

All found by looking at pictures of the first build, and all fixed before it was played:

- The "Clear ground" label overlapped the dashed line it names.
- On a computer the landed view stretched, and the ground went off the screen.
- The "in 5 seconds" ring sat on top of the lander when it was rising or barely moving. It now shows only when the spot ahead is clear of the lander (`driftShows`).
- The engine flame was too faint to see.
- After running out of fuel, the top half flew out of view. It now comes to rest in view.

Found and left, on purpose: on a phone held sideways, the lower buttons need scrolling.

## What moving the button caught

The game was first offered from the landing's own card, and took "the event that offered me" as the real landing. When the button moved to "Powered descent begins", the end screen would have shown that event as the landing. The game now finds the landing itself, and Up next still returns to the card it was opened from.

Adding a draft also changed two other tests' expectations, because drafts are listed under test: the list of things to try, and what the end of Apollo 11 suggests.

## What the cleanup pass caught

- **Numbers written twice:** the cutoff between a "Gentle" and a "Firm" touchdown, the 5 in "in 5 seconds", the view's width, the ring's size in the styles, and a height in the styles that must match the sheet's title bar.
- **Code written twice:** the lander's lean and the flame's swell were one mechanism, copied. Two key tables were each other's inverse. Three variables tracked what had last been announced.
- **Work repeated every frame:** the camera fit, the look-ahead, and label positions.
- **Long functions:** `mount` was 634 lines, and the view's main function about 535.
- **Loading:** Apollo 11's story was loaded even when another flight's landing was shown.

Left for a pull request of its own, because it changes docking too: one shared copy of the key handling, the arrow icons, the frame loop, and the common styles.

## How it was delivered

Four stacked pull requests, each passing every check alone:

1. Add the rules of the Moon landing game (1 of 4)
2. Add the 3D view of the Moon landing game (2 of 4)
3. Add Land on the Moon as a draft Try it yourself (3 of 4)
4. Offer Land on the Moon from Apollo 11's powered descent card (4 of 4)

## Left for ready

- A browser test, and the `EXTRAS` entry in `tests/utils/vars.ts`.
- `README.md` and `docs/links.md` entries.
- A layout for phones held sideways.
- Sources for the history in the game's own copy: that a computer helped the crew most of the way down, and that the top half flies the crew back to orbit.
- `handsOn: 'landing'` on the other five Moon landings.
