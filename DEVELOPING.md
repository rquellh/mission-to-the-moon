# Developing Mission to the Moon

This is how to run, build, test, and add to the site. The [README](README.md) says what the site is.

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
npm run lint      # looks for common mistakes in the code (oxlint)
npm run format    # rewrites every file in the project's format (oxfmt)
npm test          # the content, flight math, and interface tests
npm run test:e2e  # the browser tests
```

The lint rules come from Cloudflare's preset (`@cloudflare/oxlint-config`), which includes the anti-slop rules and checks types as it goes. `oxlint.config.ts` lists the rules that are off here, and why. Every rule that is on is an error, so a clean run prints nothing.

The format settings are in `oxfmt.config.ts`. They are the ones Cloudflare's oxlint-config repo uses for its own code: single quotes, sorted imports, and a sorted `package.json`. Everything else is oxfmt's default. `npm run format:check` changes nothing and fails on a file that is not in this format, and `npm run format` fixes it.

The site uses relative paths, so `dist/` works from any subpath. Each mission, and the 3D code, is built as its own file and fetched only when needed.

## How a change reaches the site

A pull request runs four workflows from `.github/workflows/` side by side: `oxlint.yml` lints the code, `oxfmt.yml` checks the format, `vitest.yml` runs the content, flight math, and interface tests, and `playwright.yml` builds the site and runs the browser tests against the build. It publishes nothing. Pushing to `main` runs `deploy.yml`, which runs all four again, builds the site, and publishes it to GitHub Pages only if all four pass (turn on Pages with "GitHub Actions" as the source in the repository settings).

`main` is protected: a repository rule (Settings → Rules) requires all four checks (`oxlint`, `oxfmt`, `vitest`, and `playwright`) to pass before a commit reaches `main`, so changes go through a pull request and a direct push of unchecked work is turned away. A lint error or an unformatted file stops the merge, the same as a failing test.

## Tests

There are three layers, each owning different things, so nothing is tested twice:

- **Content and flight** (`src/sim/test/`, `src/app/*.test.ts`): what must be true of every mission, the flight path math, the mission clock, and the tour. Plain Node, no page.
- **Interface** (`src/ui/*.test.ts`): the real interface over the real `index.html`, with a real mission and the real clock. Only the 3D scene and the screen's frames are replaced (`src/test/`).
- **Browser** (`tests/`): a few whole journeys in a real browser with the real 3D scene. The scene describes what it is drawing through `window.__missionScene()` (`src/scene/report.ts`), so a test can check that a craft is drawn and that nothing covers it without comparing pictures.

```sh
npm test                  # content, flight, and interface tests, once (Vitest)
npm run test:watch        # the same, re-run as files change
npm run test:e2e          # browser tests against the dev server (Playwright)
npm run test:e2e:preview  # build, then browser tests against the built site
npm run test:e2e:ui       # Playwright's window for stepping through a test
npm run test:e2e:report   # open the report of the last browser run
npm run test:e2e:debug    # browser tests with Playwright's debugger
npm run test:e2e:codegen  # Playwright's recorder, opened on the dev server at http://localhost:5173
```

The browser tests drive the Google Chrome already installed on the machine, so there is no browser to download. They start the site themselves.

Three skills in `.claude/skills/` say how tests are planned and written here: `test-planning` (which layer owns what), `vitest-testing`, and `e2e-testing`. Plan first, then write.

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
src/ui/                       Interface code: first screen, mission list, timeline, event cards, tour, dialogs, with tests
src/test/                     What the interface tests share: the page setup and the stand-ins for the scene and the screen
tests/                        Browser tests (Playwright): specs, page objects, helpers
src/styles/                   CSS
tools/                        Developer scripts (screenshots, Moon and Sun positions)
.github/workflows/            Lint, format check, tests, and GitHub Pages deployment
.claude/skills/               How tests are planned and written in this project
assets-src/                   Original downloads and screenshots (not committed)
```

### A mission folder

A mission folder holds:

- `story.ts`: the crew, the events with their two reading levels, photos, and citations.
- `flight.ts`: the flight plan, made of the published points the path is computed from.
- `vehicle.ts`: the cited moments at which each spacecraft changes shape, and what is left on the Moon.
- `sources.ts`: the sources only this mission cites.
- `summary.ts`: the few values the mission list needs before the mission is opened.
- `index.ts`: bundles the above.

Apollo 1's folder has `memorial.ts` in place of the story, flight plan, and vehicle file.

Adding a mission means adding a folder. Nothing else needs editing: the mission list and the loader find folders by themselves, and `summary.ts` can carry `status: "draft"` to keep an unfinished mission off the published list (it still opens by address on the dev server).

### An extra

An extra is a folder too: `src/extras/<id>/meta.ts` (its title, one-line description, and whether it is something to try or to explore) and `index.ts` (which draws it into a full-screen sheet). The contract is in the comment at the top of `src/extras/types.ts`. An extra that needs a 3D view uses only `src/scene/kit.ts`, which hands out the same spacecraft models and globes the missions use.

### Scene and interface

`src/scene` and `src/ui` never import each other. They meet through `src/app/contract.ts`, so either side can change without breaking the other.

## Developer tools

- `node tools/screenshot.mjs <address> ...` takes screenshots in headless Chrome and reports console errors.
- `node tools/sky.mjs --zero <UTC> --launch <UTC> --end <UTC>` asks NASA JPL's Horizons service where the Moon and Sun were during a flight and prints the values a flight plan needs.
- `gallery.html` (on the dev server) shows any spacecraft model from the address bar, for example `gallery.html?preset=saturn-ib`.

## Remove installed packages

Everything `npm install` adds lives in this folder, the test tools included. To remove it, delete the `node_modules` folder:

```sh
rm -rf node_modules
```

The build output in `dist/` can be deleted the same way.

## More

- [What is real and what is drawn](docs/accuracy.md): how the facts are sourced and checked.
- [Links that open a moment](docs/links.md): the address options that open a mission at a moment and a view.
