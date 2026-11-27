# What is real and what is drawn

This page says what on the site comes from sources and what is drawn to be seen. It also says how the facts are kept honest.

Event times, places, and facts come from the cited sources, and each mission was checked against its sources by a separate pass before it went on the list. The flight path is computed from the published points (burns, orbits, landing, splashdown) and drawn as a smooth curve between them, so it shows the shape of the trip and not every turn.

The spacecraft are simple shapes built in code and drawn far larger than life so you can see them. When two spacecraft fly side by side, the gap between them is not to scale.

The hands-on extras are practice toys, not simulators, and say so on screen; the facts they show (staging times, docking times, landing places, rocket heights, how the first Moon landing came down) come from the missions' own citations or are cited by the extra itself to registered sources. A game's own sentences about the real flights have their sources folded under its Start button, labeled as theirs.

Each mission's flight plan and vehicle file list, in their opening comments, which values are illustrations. "How this is drawn" on the site explains the same thing in plain words.

## How the facts are kept honest

- `src/content/sources.ts` holds the sources shared by many missions, and each mission's `sources.ts` holds its own. A source goes in only after its page has been opened and checked.
- Mission content is type-checked. A fact with no citation, or one that cites a source that is not registered, fails the build.
- `npm test` includes a test that builds every mission's flight path and checks it: no jumps, nothing under the ground, events in order and inside the flight, every citation resolving, every photo present, and the mission list's summary matching the story.
- Physical constants live in `src/content/physical-constants.ts`, each with its NASA source.
- Site-wide images, data, and software are listed in `src/content/credits.json`. Mission photos are credited on the card, in "Tell me more", and in the "Sources and credits" dialog.

The principles of the site are in the [README](../README.md). How to run the tests is in [DEVELOPING.md](../DEVELOPING.md).
