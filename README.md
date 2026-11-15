# Mission to the Moon

An interactive 3D tour of NASA's Gemini and Apollo programs: the launches, the flight paths, and what each crew accomplished. It runs in the browser on phones and desktops.

This first piece is the stage: Earth, the Moon, and the stars in 3D, built from real NASA imagery. Drag (or swipe) to turn the view, scroll (or pinch) to zoom, and use the Earth, Moon, and True scale buttons. With the 3D view focused, the arrow keys turn the view and + and - zoom.

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
```

The site uses relative paths, so `dist/` works from any subpath. Pushing to `main` builds and deploys it to GitHub Pages through `.github/workflows/deploy.yml` (turn on Pages with "GitHub Actions" as the source in the repository settings).

## Folder structure

```
index.html                 Page markup: canvas, title, controls, credits dialog
public/textures/           Earth, Moon, and star textures (2K and 4K JPEGs)
src/main.ts                Starts the app and connects the scene to the interface
src/content/               Facts and text: physical constants (cited), credits, interface copy
src/scene/                 three.js scene: Earth, Moon, stars, camera, textures, framing
src/ui/                    Interface code: control bar, credits dialog, loading and messages
src/styles/                CSS
.github/workflows/         GitHub Pages deployment
assets-src/                Original downloads and screenshots (not committed)
```

All physical constants live in `src/content/physical-constants.ts`, each with its NASA source. Every image and data source is listed in `src/content/credits.json`, which also fills the Credits dialog.

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
