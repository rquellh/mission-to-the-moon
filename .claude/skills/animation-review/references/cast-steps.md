# Driving the site: record.mjs and cast.mjs steps

Run everything from the repository root, with a dev server up (`npx vite --port 5199 --strictPort`, or set `BASE` to yours). Record one thing at a time: two recorders at once halve each other's frame rate.

## record.mjs

```
node .claude/skills/animation-review/scripts/record.mjs tour <mission> <stop|start|all> --out DIR [options]
node .claude/skills/animation-review/scripts/record.mjs explore <mission> <event|t=HHH:MM:SS|all> <view|-> --out DIR [options]
node .claude/skills/animation-review/scripts/record.mjs page <url> --out DIR [options]
```

| Option                                    | What it does                                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `--out DIR`                               | Where the recording goes. Required. With `all`, one folder inside it per trip or event.                                         |
| `--size WxH`                              | The screen in CSS pixels; default 1440x900.                                                                                     |
| `--phone`                                 | 390x844, phone emulation, `--dpr 2`. Frames are cast in CSS pixels (390x844); screenshots are in device pixels (780x1688).      |
| `--mobile`, `--dpr N`, `--reduced-motion` | As cast.mjs.                                                                                                                    |
| `--before STEP`                           | A step run before recording starts: at the stop on the tour, once the page has settled in Explore. Repeat for more, in order.   |
| `--press STEP`                            | The step that starts the sequence. Default `press:next` on the tour and `press:play` in Explore; `none` for no press.           |
| `--after STEP`                            | A step run after the press. Repeat for more.                                                                                    |
| `--for S`                                 | Record exactly S seconds after the press.                                                                                       |
| `--rest S`                                | Otherwise stop once the clock, the tour and the camera have been still this long (default 2).                                   |
| `--overlap S`                             | Explore: also stop this many story seconds past the next event after the clock (default 2), so neighbouring recordings overlap. |
| `--max S`                                 | Never longer than this after the press (default 40).                                                                            |
| `--no-check`, `--no-sheets`               | Skip check.py or sheets.py afterwards.                                                                                          |

Each `--before`, `--press` and `--after` is exactly one step. Nothing is split, so a step may hold any JavaScript, `||` and all.

On the tour, the recorder drives the tour to the stop with `tourstop:N` (press, then wait until the counter reads that stop at rest), checks the stop again after the `--before` steps, and fails loudly if the tour is anywhere else. Under `--reduced-motion` each press jumps a whole stop; `tourstop` handles that.

## Sequences

| Sequence                                     | Command (after `record.mjs`, each with `--out DIR`)                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| A trip from stop 4                           | `tour apollo-11 4`                                                                                                                                |
| The same on a phone, and with reduced motion | `tour apollo-11 4 --phone`; `tour apollo-11 4 --reduced-motion`                                                                                   |
| The tour's opening, from page load           | `tour apollo-11 start`                                                                                                                            |
| Every trip, one browser                      | `tour apollo-11 all` (folders `00-start`, `01-to-02`, ..., `12-finish`)                                                                           |
| Back from stop 6                             | `tour apollo-11 6 --press press:back`                                                                                                             |
| Skip pressed mid-trip                        | `tour apollo-11 4 --after wait:3000 --after press:skip`                                                                                           |
| The end of the tour                          | `tour apollo-11 12` (the last stop's button is Finish)                                                                                            |
| Starting the tour over                       | `tour apollo-11 12 --after wait:3000 --after press:again`                                                                                         |
| True scale during the tour                   | `tour apollo-11 5 --before 'eval:window.stage.setScaleMode("true")'` (the same call the True scale switch makes; Controls are hidden on the tour) |
| A deliberate slow frame                      | `tour apollo-11 4 --after wait:2000 --after stall:400`                                                                                            |
| Explore from an event, in a view             | `explore apollo-11 undocking moon`                                                                                                                |
| Explore from a mission time                  | `explore apollo-11 t=100:20:00 moon`                                                                                                              |
| Pause after 5 seconds                        | `explore apollo-11 undocking moon --after wait:5000 --after press:pause`                                                                          |
| Pause, then Play again                       | `explore apollo-11 undocking moon --after wait:3000 --after press:pause --after wait:2000 --after press:play`                                     |
| A drag while playing                         | `explore apollo-11 undocking earth --after wait:1500 --after drag:300,250,650,280`                                                                |
| A drag before Play                           | `explore apollo-11 undocking earth --press none --after drag:300,250,650,280 --after wait:1000 --after press:play`                                |
| Opening Controls while playing               | `explore apollo-11 undocking moon --after wait:2000 --after press:controls`                                                                       |
| Stepping to the next event                   | `explore apollo-11 undocking moon --press none --after press:controls --after wait:800 --after press:event-next`                                  |
| True scale in Explore                        | `explore apollo-11 undocking moon --before press:controls --before press:scale --before press:controls --before wait:2000`                        |
| Every event in one view                      | `explore apollo-11 all moon` (one folder each, `01-liftoff`, ...)                                                                                 |
| Any address from page load                   | `page 'http://localhost:5199/?mission=apollo-11&start=explore&event=docking'`                                                                     |

In Explore the recording ends a little past the next event after the clock as it stands once the `--after` steps are done, or once everything has been still for `--rest` seconds (after a Pause), whichever comes first.

## cast.mjs

For anything record.mjs does not drive:

```
node .claude/skills/animation-review/scripts/cast.mjs <url> [--size WxH] [--dpr N] [--mobile] [--desktop] [--reduced-motion] [--no-webgl] [--timeout MS] [--out PATH] [--fail-on-error] --step STEP ...
```

`--timeout` is the longest wait for one step (default 30000). `--out` saves a screenshot after the last step. It prints console errors at the end. It is also a module: record.mjs and pace.mjs import `openBrowser`.

| Step                    | What it does                                                                                                                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wait:MS`               | Wait.                                                                                                                                                                                                                                    |
| `waitfor:SELECTOR`      | Wait until an element is visible.                                                                                                                                                                                                        |
| `waituntil:JS`          | Wait until a JavaScript expression is truthy.                                                                                                                                                                                            |
| `assert:JS`             | Stop with an error unless the expression is truthy.                                                                                                                                                                                      |
| `click:SELECTOR`        | Click the centre of the first visible match.                                                                                                                                                                                             |
| `press:NAME`            | Click a named button: `next`, `skip` (the same button during a trip), `back`, `exit`, `again` (the ending's round button), `play`, `pause` (the same button), `controls`, `event-next`, `event-previous`, `scale` (needs Controls open). |
| `key:KEY`               | Press a key: Tab, Shift+Tab, Enter, Space, Escape, the arrows, PageUp, PageDown, Home, End, or one character.                                                                                                                            |
| `drag:X1,Y1,X2,Y2[,MS]` | Drag with the left button from one point to another over MS (default 300), in twelve moves.                                                                                                                                              |
| `wheel:X,Y,DY`          | One scroll-wheel step at a point.                                                                                                                                                                                                        |
| `eval:JS`               | Evaluate in the page, await a promise, print the result.                                                                                                                                                                                 |
| `shot:PATH`             | Save a screenshot, in device pixels.                                                                                                                                                                                                     |
| `stall:MS`              | Block the page's main thread for MS: a deliberate slow frame, to see whether a stall changes what the scene does.                                                                                                                        |
| `tourstop:N`            | Press Next, Skip or Back until the tour rests at stop N; fail if it cannot.                                                                                                                                                              |
| `rest:MS[,MAX]`         | Wait until the clock, the tour and the camera have been still for MS, at most MAX.                                                                                                                                                       |
| `clock:T[,MAX]`         | Wait until the mission clock reaches T (seconds or HHH:MM:SS).                                                                                                                                                                           |
| `story:S[,MAX]`         | Wait until the story clock reaches S.                                                                                                                                                                                                    |
| `probe`                 | Install the in-page probe (the next three steps do it themselves).                                                                                                                                                                       |
| `cast:DIR`              | Start keeping every frame the page draws.                                                                                                                                                                                                |
| `timeline[:MS]`         | Start sampling the interface and the scene every MS (default 100).                                                                                                                                                                       |
| `camera`                | Start logging the camera every frame.                                                                                                                                                                                                    |
| `mark`                  | Time zero, for frames, timeline and camera log alike.                                                                                                                                                                                    |
| `uncast`                | Stop keeping frames and write them to `DIR/pNNNNN.jpg`, milliseconds after the mark.                                                                                                                                                     |
| `save:DIR`              | Stop the timeline and camera log and write `DIR/timeline.tsv` and `DIR/camera.tsv`.                                                                                                                                                      |

A recording by hand, then the analysis (`meta.json` and `events.json` are record.mjs's; without them check.py still reads the rest, but cannot check the card):

```bash
D=<out-dir>
node .claude/skills/animation-review/scripts/cast.mjs 'http://localhost:5199/?mission=apollo-11&start=tour' \
  --step waitfor:body.is-ready --step tourstop:6 \
  --step "cast:$D/cast" --step timeline --step camera --step wait:400 --step mark \
  --step press:back --step wait:1500 --step press:skip --step rest:2000,20000 \
  --step uncast --step "save:$D"
python3 .claude/skills/animation-review/scripts/check.py "$D"
python3 .claude/skills/animation-review/scripts/sheets.py "$D" --auto
```

## sheets.py

```
python3 .claude/skills/animation-review/scripts/sheets.py DIR --auto
python3 .claude/skills/animation-review/scripts/sheets.py DIR [--from S] [--to S] [--step S] [--at S,S,...] [--around CRAFT|followed|all] [--crop X,Y,W,H] [--per-sheet N] [--name NAME]
```

`--around` crops each tile around a craft by its box in the timeline (or its place in the camera log while it is faded), one zoom for the whole sheet. `--crop` takes CSS pixels, as the timeline gives them, whatever the frames' resolution. Sheets are named `NAME-NN.jpg` in the recording's folder.

## The scene's own report

`window.__missionScene()` (all builds with a 3D view; `src/scene/report.ts`) gives the view, scale, mission time, the fast-forward flag, the clear area, the followed craft, each craft's box, and the parts left behind with their labels. Everything else the probe reads (the story clock, the camera, fades, laps, camera moves) comes from `window.stage`, which exists only in a development build. Before the Stage is made, `window.stage` is the `<canvas id="stage">` element, so check for `window.stage.camera` before trusting it.
