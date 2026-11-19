# Mission to the Moon

An interactive 3D tour of NASA's Gemini and Apollo programs: the launches, the flight paths, and what each crew accomplished. It runs in the browser on phones and desktops.

It tells every crewed flight of the two programs, from Gemini 3 in March 1965 to Apollo 17 in December 1972, and remembers the crew of Apollo 1:

- **Gemini** (1965 to 1966): Gemini 3, 4, 5, 7, 6A, 8, 9A, 10, 11, and 12. Ten flights in Earth orbit that practiced what a trip to the Moon would need: long flights, spacewalks, and meeting and docking with another spacecraft.
- **Apollo** (1967 to 1972): Apollo 7 through 17, including the first trip around the Moon (Apollo 8), the first landing (Apollo 11), the flight that had to turn back (Apollo 13), and the three long stays with a rover (Apollo 15, 16, and 17). Apollo 1 has a page of remembrance in place of a flight.

How it works:

- The site opens on a list of missions. The mission name at the top of the screen brings the list back.
- **Tour** steps through a mission's key moments, or **Explore** lets you roam.
- Press play, or drag the timeline, to fly the mission. The clock shows real mission time. The trip is paced so every stretch between events is watchable, instead of days of coasting. When a spacecraft circles many times between two events, the view switches to a calm fast forward: the model fades and its orbit shows as a bright ring.
- Each event has a short card, a longer "Tell me more", a NASA photo where there is one, and its sources. A few cards carry a real NASA recording of the moment, with every word written out beside the player.
- Under the missions are things to try and explore: drop a rocket's stages at the right moment, dock a Gemini with its Agena target, turn the Moon to find the six landing sites, stand the three rockets side by side, and fill a book of the crews' mission patches, which appear in color as you open each flight (the book is kept on your own device). A liftoff or docking card offers the matching one with a "Try it" button.
- The view buttons choose what the camera follows: **Earth** and **Ship** for every mission, plus **Moon** and **Both** for flights to the Moon. **True scale** shows real distances and orbit heights.
- Drag (or swipe) to turn the view, and scroll (or pinch) to zoom. With the 3D view focused, the arrow keys turn the view and + and - zoom.

A link can open a mission at a moment and a view, for example `?mission=apollo-11&t=102:45:40&view=moon` for the first landing, or `?mission=gemini-8&t=06:33:16&view=spacecraft` for the first docking.

- `mission` is a mission's id: `gemini-3` to `gemini-12` (with `gemini-6a` and `gemini-9a`), `apollo-7` to `apollo-17`, or `apollo-1` for the memorial page. Apollo 11 opens when it is left out.
- `t` is mission time as hours:minutes:seconds. A minus sign means before liftoff.
- `view` is `earth`, `moon`, `spacecraft`, or `journey`.
- `start=tour` or `start=explore` skips the mission list.
- `event` opens a mission paused at one of its events, by the event's id.
- `extra` opens one of the extras: `stages`, `docking`, `patches`, `landing-sites`, or `rockets`.

### What is real and what is drawn

Event times, places, and facts come from the cited sources, and each mission was checked against its sources by a separate pass before it went on the list. The flight path is computed from the published points (burns, orbits, landing, splashdown) and drawn as a smooth curve between them, so it shows the shape of the trip and not every turn. The spacecraft are simple shapes built in code and drawn far larger than life so you can see them. When two spacecraft fly side by side, the gap between them is not to scale. The hands-on extras are practice toys, not simulators, and say so on screen; the facts they show (staging times, docking times, landing places, rocket heights) come from the missions' own citations or from sources registered for that extra. Each mission's flight plan and vehicle file list, in their opening comments, which values are illustrations. "How this is drawn" on the site explains the same thing in plain words.

## Run it

You need Node 24 and npm.

```sh
npm install
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173/).

To try it on a phone on the same Wi-Fi network:

```sh
npm run dev -- --host
```

Open the "Network" address Vite prints on your phone.

## Build

```sh
npm run build     # type-checks, then builds the site into dist/
npm run preview   # serves dist/ locally to check the build
npm run typecheck # type-check only
npm test          # tests for the flight path math, plus one test that checks every mission
```

The site uses relative paths, so `dist/` works from any subpath. Each mission, and the 3D code, is built as its own file and fetched only when needed. Pushing to `main` builds and deploys the site to GitHub Pages through `.github/workflows/deploy.yml` (turn on Pages with "GitHub Actions" as the source in the repository settings).

## Folder structure

```
index.html                    Page markup
gallery.html                  Developer page for looking at spacecraft models (dev server only)
public/textures/              Earth, Moon, and star textures (2K and 4K JPEGs)
public/media/<mission>/       Mission photos and recordings from NASA, one folder per mission
src/main.ts                   Starts the app, loads the chosen mission, and connects the pieces
src/content/                  Shared facts and text: sources, physical constants, credits, interface copy
src/content/missions/<id>/    One folder per mission (see below)
src/content/extras/           Sources cited only by an extra, one file per extra
src/extras/<id>/              One folder per extra: a hands-on moment or something to explore
src/sim/                      Flight path math (plain TypeScript, no 3D code), with tests
src/app/                      The mission clock, the tour, and the contract between scene and interface
src/scene/                    three.js scene: Earth, Moon, stars, paths, spacecraft, camera
src/ui/                       Interface code: mission list, timeline, event cards, tour, dialogs
src/styles/                   CSS
tools/                        Developer scripts (screenshots, Moon and Sun positions)
.github/workflows/            GitHub Pages deployment
assets-src/                   Original downloads and screenshots (not committed)
```

A mission folder holds:

- `story.ts`: the crew, the events with their two reading levels, photos, and citations.
- `flight.ts`: the flight plan, made of the published points the path is computed from.
- `vehicle.ts`: the cited moments at which each spacecraft changes shape, and what is left on the Moon.
- `sources.ts`: the sources only this mission cites.
- `summary.ts`: the few values the mission list needs before the mission is opened.
- `index.ts`: bundles the above.

Apollo 1's folder has `memorial.ts` in place of the story, flight plan, and vehicle file.

Adding a mission means adding a folder. Nothing else needs editing: the mission list and the loader find folders by themselves, and `summary.ts` can carry `status: "draft"` to keep an unfinished mission off the published list (it still opens by address on the dev server).

An extra is a folder too: `src/extras/<id>/meta.ts` (its title, one-line description, and whether it is something to try or to explore) and `index.ts` (which draws it into a full-screen sheet). The contract is in the comment at the top of `src/extras/types.ts`. An extra that needs a 3D view uses only `src/scene/kit.ts`, which hands out the same spacecraft models and globes the missions use.

How the facts are kept honest:

- `src/content/sources.ts` holds the sources shared by many missions, and each mission's `sources.ts` holds its own. A source goes in only after its page has been opened and checked.
- Mission content is type-checked. A fact with no citation, or one that cites a source that is not registered, fails the build.
- `npm test` builds every mission's flight path and checks it: no jumps, nothing under the ground, events in order and inside the flight, every citation resolving, every photo present, and the mission list's summary matching the story.
- Physical constants live in `src/content/physical-constants.ts`, each with its NASA source.
- Site-wide images, data, and software are listed in `src/content/credits.json`. Mission photos are credited on their cards and in the "Sources and credits" dialog.

`src/scene` and `src/ui` never import each other. They meet through `src/app/contract.ts`, so either side can change without breaking the other.

Developer tools:

- `node tools/screenshot.mjs <address> ...` takes screenshots in headless Chrome and reports console errors.
- `node tools/sky.mjs --zero <UTC> --launch <UTC> --end <UTC>` asks NASA JPL's Horizons service where the Moon and Sun were during a flight and prints the values a flight plan needs.
- `gallery.html` (on the dev server) shows any spacecraft model from the address bar, for example `gallery.html?preset=saturn-ib`.

## Principles

- Every fact on the site is cited to NASA, the Smithsonian, or a similarly authoritative source.
- Real NASA and Smithsonian media only. No AI-generated imagery.
- No third-party requests at runtime: no CDNs, web fonts, or analytics. Everything the site needs ships with it.

## Roadmap

1. Groundwork and sources (done)
2. The stage: Earth, Moon, stars (done)
3. Apollo 11 in full (done)
4. Gemini 8 in full (done)
5. The remaining crewed flights and an Apollo 1 memorial page (done)
6. Hands-on moments and extras (done)
7. Polish and launch

## Remove installed packages

Everything `npm install` adds lives in this folder. To remove it, delete the `node_modules` folder:

```sh
rm -rf node_modules
```

The build output in `dist/` can be deleted the same way.
