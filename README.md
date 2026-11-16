# Mission to the Moon

An interactive 3D tour of NASA's Gemini and Apollo programs: the launches, the flight paths, and what each crew accomplished. It runs in the browser on phones and desktops.

So far it tells two stories:

- **Gemini 8** (March 1966): the first docking of two spacecraft in orbit, then a stuck thruster and an emergency return.
- **Apollo 11** (July 1969): the first landing on the Moon.

How it works:

- The site opens on a list of missions. The mission name at the top of the screen brings the list back.
- **Take the tour** steps through a mission's key moments, or **Explore** lets you roam.
- Press play, or drag the timeline, to fly the mission. The clock shows real mission time. The trip is paced so every stretch between events is watchable, instead of days of coasting.
- Each event has a short card, a longer "Tell me more", a NASA photo where there is one, and its sources.
- The view buttons choose what the camera follows: **Earth** and **Ship** for every mission, plus **Moon** and **Both** for flights to the Moon. **True scale** shows real distances and orbit heights.
- Drag (or swipe) to turn the view, and scroll (or pinch) to zoom. With the 3D view focused, the arrow keys turn the view and + and - zoom.

A link can open a mission at a moment and a view, for example `?mission=apollo-11&t=102:45:40&view=moon` for the landing, or `?mission=gemini-8&t=06:33:16&view=spacecraft` for the first docking.

- `mission` is `gemini-8` or `apollo-11` (Apollo 11 when left out).
- `t` is mission time as hours:minutes:seconds. A minus sign means before liftoff.
- `view` is `earth`, `moon`, `spacecraft`, or `journey`.
- `start=tour` or `start=explore` skips the mission list.

### What is real and what is drawn

Event times, places, and facts come from the cited sources. The flight path is computed from the published points (burns, orbits, landing, splashdown) and drawn as a smooth curve between them, so it shows the shape of the trip and not every turn. The spacecraft are simple shapes built in code and drawn far larger than life so you can see them. "How this is drawn" on the site explains the same thing.

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
npm test          # tests for the flight path math
```

The site uses relative paths, so `dist/` works from any subpath. Pushing to `main` builds and deploys it to GitHub Pages through `.github/workflows/deploy.yml` (turn on Pages with "GitHub Actions" as the source in the repository settings).

## Folder structure

```
index.html                 Page markup
public/textures/           Earth, Moon, and star textures (2K and 4K JPEGs)
public/media/              Mission photos from NASA, one folder per mission
src/main.ts                Starts the app and connects the pieces
src/content/               Facts and text: sources, physical constants, credits, interface copy
src/content/missions/      Three files per mission: story, flight plan, spacecraft shapes
src/sim/                   Flight path math (plain TypeScript, no 3D code), with tests
src/app/                   The mission clock, the tour, and the contract between scene and interface
src/scene/                 three.js scene: Earth, Moon, stars, paths, spacecraft, camera
src/ui/                    Interface code: timeline, event cards, tour, dialogs
src/styles/                CSS
tools/                     Developer scripts (screenshots)
.github/workflows/         GitHub Pages deployment
assets-src/                Original downloads and screenshots (not committed)
```

How the facts are kept honest:

- `src/content/sources.ts` is the list of sources the site may cite. A source goes in only after its page has been opened and checked.
- Mission content is type-checked. A fact with no citation, or one that cites a source missing from the list, fails the build.
- Physical constants live in `src/content/physical-constants.ts`, each with its NASA source.
- Every image and data source is listed in `src/content/credits.json`, which also fills the "Sources and credits" dialog.

`src/scene` and `src/ui` never import each other. They meet through `src/app/contract.ts`, so either side can change without breaking the other.

## Principles

- Every fact on the site is cited to NASA, the Smithsonian, or a similarly authoritative source.
- Real NASA and Smithsonian media only. No AI-generated imagery.
- No third-party requests at runtime: no CDNs, web fonts, or analytics. Everything the site needs ships with it.

## Roadmap

1. Groundwork and sources
2. The stage (Earth, Moon, stars)
3. Apollo 11 in full
4. Gemini 8 in full
5. The remaining crewed flights and an Apollo 1 memorial card
6. Hands-on moments and extras
7. Polish and launch

## Remove installed packages

Everything `npm install` adds lives in this folder. To remove it, delete the `node_modules` folder:

```sh
rm -rf node_modules
```

The build output in `dist/` can be deleted the same way.
