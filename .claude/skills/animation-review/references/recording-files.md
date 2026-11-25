# What a recording holds

`scripts/record.mjs` writes one folder per recording (and one per trip or event with `all`). Every time in it is seconds after the mark, the moment just before the press; rows before the mark have negative times and show the place the recording leaves. Every position is in CSS pixels from the top left of the page, whatever `--dpr` is; `sheets.py` scales them to the frames.

| File               | Written by | What it is                                                                                                                       |
| ------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `meta.json`        | record.mjs | How it was recorded (mode, mission, stop or event, screen, steps, why it ended) and the build stamp (below).                     |
| `events.json`      | record.mjs | The flight's events (id, title, mission second, story second, view, in the tour or not), the story clock's keys, its partings.   |
| `timeline.tsv`     | record.mjs | The interface and the scene every 100 ms.                                                                                        |
| `camera.tsv`       | record.mjs | The camera every frame the page runs (`requestAnimationFrame`), whether or not it draws.                                         |
| `cast/pNNNNN.jpg`  | record.mjs | Every frame the page drew, in CSS pixels whatever `--dpr` is, named by milliseconds after the mark (`mNNNNN` before it).         |
| `at-start.png`     | record.mjs | A screenshot just before recording (device pixels).                                                                              |
| `end.png`          | record.mjs | A screenshot at the end.                                                                                                         |
| `check.txt`        | check.py   | The report: build, frames, signals, the card against the clock, changes, pace, marks, a thinned camera table.                    |
| `camera-table.tsv` | check.py   | `camera.tsv` turned into motion, one row a frame.                                                                                |
| `marks.tsv`        | check.py   | The moments worth a closer look.                                                                                                 |
| `signals.json`     | check.py   | The signals, for the summary of a sweep.                                                                                         |
| `sheet-NN.jpg`     | sheets.py  | The whole recording at 0.5 s, 12 tiles to a sheet, whole frames.                                                                 |
| `craft-NN.jpg`     | sheets.py  | The same times, each tile cropped around the followed craft (about eight times its size, so a 30 px craft is drawn about 80 px). |
| `mark-NN-*.jpg`    | sheets.py  | Each marked moment at 0.1 s: whole frames for camera marks, cropped around the craft for craft marks.                            |

Sheets are at most 1980 px a side, so the image reader shows them at full size. Each tile's label gives its time, the mission clock, the view, `ff` while fast forward shows and `stopped` while the clock is still. A tile shows the frame on screen at its time, which is the last one drawn: a still page draws nothing, so a label that says `frame from 3.21 s` means nothing was drawn since then. While the clock runs that is a stall; while it is stopped it is rest.

## The build stamp

`meta.json` → `stamp`: the commit and branch of the checkout you ran from, how many files are changed (and the first twenty), when, the dev server's address, and `servedMatches`: whether the dev server serves this checkout. record.mjs compares a hash of a few files (`src/scene/stage.ts`, `src/app/tour.ts`, `src/app/player.ts`, `src/sim/story-time.ts`, `src/ui/interface.ts`) with what the server sends for them. When they differ it prints a warning: the recording shows some other tree, perhaps another agent's server, or yours half-saved. `load` and `cores` are the machine's load average and core count at the time; above one per core it warns, because other recorders slow every frame.

## timeline.tsv (every 100 ms)

| Column      | What it is                                                                                                                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `t`         | Seconds after the mark.                                                                                                                                                                                         |
| `clock`     | The mission time drawn, in seconds since liftoff.                                                                                                                                                               |
| `story`     | The story clock, in story seconds.                                                                                                                                                                              |
| `playing`   | 1 while the clock runs (a tour trip, or Play).                                                                                                                                                                  |
| `speed`     | Story seconds per real second right now: the chosen rate, or a trip's pace (above 1 in a trip's hurry and in a run-up).                                                                                         |
| `pace`      | Mission seconds per real second right now (what fast forward is decided from).                                                                                                                                  |
| `view`      | `earth`, `moon`, `spacecraft` or `journey`.                                                                                                                                                                     |
| `scale`     | `readable` or `true`.                                                                                                                                                                                           |
| `ff`        | 1 while the scene says fast forward shows (the yes/no the interface hears).                                                                                                                                     |
| `fastview`  | How far the ship view has moved to its steady fast-forward view, 0 to 1.                                                                                                                                        |
| `tween`     | 1 while a camera move is under way (a change of view, a re-aim, the return from the steady view).                                                                                                               |
| `usermoved` | 1 once the visitor has moved the camera (drag, wheel, keys) since the last choice of view.                                                                                                                      |
| `followed`  | The craft the ship view follows now.                                                                                                                                                                            |
| `counter`   | The tour's counter as shown ("Stop 5 of 12 On the way…"), or `-` when hidden.                                                                                                                                   |
| `button`    | The tour's main button (Next, Skip, Finish), or `-` when hidden.                                                                                                                                                |
| `play`      | Play's label (Play or Pause), or `-` when hidden.                                                                                                                                                               |
| `card`      | The card's title, or `-` when the card is hidden (after the tour ends, say).                                                                                                                                    |
| `ending`    | 1 while the ending shows in the card's place.                                                                                                                                                                   |
| `clear`     | The area the interface leaves uncovered: `x,y,WxH`, its top left corner and size. A change here moves the framing.                                                                                              |
| `dock`      | The dock's top and height (`606+266`).                                                                                                                                                                          |
| `ships`     | Each craft: `id:cx,cy,WxH@fade` (its box's centre and size, and how opaque its model is drawn, 0 to 1), `id:-@fade` when not drawn, `id:gone` when it does not exist then. `+dot` when it shows as a small dot. |
| `left`      | Parts left behind on the Moon: `part:cx,cy,WxH`, or `part:-` while not drawn.                                                                                                                                   |
| `labels`    | Their labels: `text@opacity`, separated by `; `.                                                                                                                                                                |
| `classes`   | The page's body classes (`is-ready` once the loading screen has gone, `is-touring`, ...).                                                                                                                       |

Only what is visible is read: a hidden button or card reads `-`, so the end of the tour does not look like its last stop.

## camera.tsv (every frame)

| Column             | What it is                                                                                                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `t`                | Seconds after the mark, by the frame's own timestamp (the one the clock steps by), so a callback that runs late does not skew a rate.                                                                                                  |
| `clock`, `story`   | Mission and story time.                                                                                                                                                                                                                |
| `playing`, `speed` | As in the timeline.                                                                                                                                                                                                                    |
| `view`, `followed` | As in the timeline.                                                                                                                                                                                                                    |
| `tween`            | 1 while a camera move is under way.                                                                                                                                                                                                    |
| `usermoved`        | 1 once the visitor has moved the camera.                                                                                                                                                                                               |
| `fastview`         | The ship view's steady fast-forward view, 0 to 1.                                                                                                                                                                                      |
| `fade`             | How opaque the followed craft's model is drawn, 0 to 1.                                                                                                                                                                                |
| `ff`               | How far that craft is faded for fast forward, 0 to 1.                                                                                                                                                                                  |
| `laps`             | The laps it has flown around the body below it, as the scene counts them. Its rate is laps per second on screen.                                                                                                                       |
| `near`             | `E` or `M`: the body nearer the followed craft (by height in that body's radii, as the scene decides).                                                                                                                                 |
| `ed ex ey er`      | Earth: the camera's distance from its centre in Earth radii, its centre on screen (`-` when behind the camera), its radius on screen.                                                                                                  |
| `md mx my mr`      | The same for the Moon, in Moon radii.                                                                                                                                                                                                  |
| `sx sy`            | Where the followed craft's centre is drawn, or `-` when it does not exist or is behind the camera.                                                                                                                                     |
| `occluded`         | 1 when Earth or the Moon is between the camera and the followed craft.                                                                                                                                                                 |
| `tilt`, `tiltw`    | The craft's local up (away from the body below it) as the screen shows it, in degrees from straight up; `tiltw` is how much of it lies in the screen's plane (near 0 when the camera looks straight down, and the tilt means nothing). |
| `fx fy fz`         | The camera's view direction.                                                                                                                                                                                                           |
| `ux uy uz`         | The camera's up direction.                                                                                                                                                                                                             |
| `w h`              | The canvas's size.                                                                                                                                                                                                                     |

## camera-table.tsv (check.py)

One row a frame: `t`, `gap` (milliseconds since the frame before), `clock`, `story`, `playing`, `view`, `followed`, `tween`, `usermoved`, `fastview`, `fade`, and:

| Column   | What it is                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `turn`   | How fast the camera's view direction turns, degrees a second (over at least 50 ms).                                                                           |
| `roll`   | How fast the camera rolls about its view direction, degrees a second.                                                                                         |
| `tilt`   | The horizon's tilt in the ship view (see camera.tsv).                                                                                                         |
| `body`   | The body that matters: Earth in the Earth view, the Moon in the Moon view, otherwise the one nearer the followed craft.                                       |
| `dist`   | The camera's distance from that body's centre, in its radii.                                                                                                  |
| `cover`  | The share of the screen covered by whichever body covers more (1 when the camera is inside one).                                                              |
| `sx sy`  | The followed craft on screen.                                                                                                                                 |
| `jump`   | How far it moved on screen since the frame before, in pixels.                                                                                                 |
| `where`  | `in` the clear area, `under` the interface (on the canvas but outside the clear area), `off` the canvas, `behind` the camera, `hidden` behind a body, `none`. |
| `lapsps` | Laps per second of the followed craft on screen, over the last half second.                                                                                   |

## marks.tsv (check.py)

`kind`, `from`, `to`, `peak_t`, `peak`, `note`. The rules are rules of thumb that find moments to look at; a mark is a place to look and its absence is not a pass. The thresholds are at the top of `check.py`.

| Kind                               | Found when                                                                                                                                                                               | Standards |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `jump`                             | The followed craft moves more than 40 px (or 4% of the diagonal) between two frames while drawn. The note says if the clock jumped or a frame was slow.                                  | 18        |
| `turn`                             | The camera turns faster than 60°/s. The note says whether a camera move was under way.                                                                                                   | 11, 9     |
| `roll`                             | The camera rolls faster than 20°/s.                                                                                                                                                      | 14        |
| `tilt`                             | In the ship view, settled and not fast-forwarding, the horizon is more than 25° off level.                                                                                               | 14        |
| `swell`                            | A body covers more than 70% of the screen, or its share rises by 30 points within a second.                                                                                              | 11        |
| `moving-at-rest`                   | The clock is stopped, the visitor has not moved the camera, and the camera still turns or a body slides on screen. The note says whether the tour was holding on its way or had arrived. | 9, 10     |
| `re-aim`                           | A camera move starts in the Earth or Moon view with no change of view.                                                                                                                   | 9         |
| `off`, `under`, `behind`, `hidden` | The drawn followed craft is off the canvas, under the interface, behind the camera, or behind a body.                                                                                    | 16, 17    |
| `laps`                             | The drawn followed craft laps faster than standard 7 allows (once in 20 seconds; `LAP_LIMIT` in check.py).                                                                               | 7         |
| `pop`                              | A drawn craft's box changes size by half again in 100 ms. At a separation that can be the shape changing as a part falls away; the sheet tells.                                          | 18        |
| `vanish`                           | A drawn craft is not drawn 100 ms later, without fading and away from the edges.                                                                                                         | 18, 19    |
| `stall`                            | A page frame over 250 ms while the clock ran.                                                                                                                                            | all       |

Marks are not looked for while the loading screen still covers the scene (before `is-ready`). Under `--reduced-motion` every mark says that cuts are expected.

## check.txt: the signals

The report opens with the build, the frames (stalls while the clock ran apart from rest while it was stopped, and slow page frames), and a list of signals: `FAIL` where a standard is plainly broken (the card names a moment the clock has not reached), `LOOK` where the marks found something to read the sheets for, `ok` where they found nothing, and `REDO` on the frames when fewer than five frames a second came while the clock ran: too few to judge motion by, and slow enough to change what the scene does. Each signal's name starts with the numbers of the standards in SKILL.md it bears on (`1 card`, `9-10 still`, `16-17 in frame`, ...). Then the card against the clock stretch by stretch, every change in the timeline, the pace, the marks, and the camera every quarter second and at every mark.

Given the folder of a sweep (`record.mjs ... all`), `check.py` checks every recording in it again and prints one line a recording with each signal's state; record.mjs prints the same at the end of the sweep. Run it after changing `check.py`, or to compare a sweep before and after a fix, without recording again.
