---
name: hands-on-games
description: Designs, mocks up, builds, tunes, and reviews hands-on games for Mission to the Moon - the "Try it yourself" extras under src/extras/, such as Land on the Moon, Dock two spacecraft, and Drop the stages. Use whenever the user asks for a new game or a game idea, mock-ups for a game, a playable moment from a flight, or a "Try it" button on a mission card; says a game feels too easy, too hard, confusing, or not fun; or wants a draft game made ready. Use it even when they do not say "extra" or "hands-on".
---

# Hands-On Games Skill - Mission to the Moon

You are designing and building a hands-on game for Mission to the Moon: a short practice toy made from one real moment of one real flight. This skill records what worked when Land on the Moon (`src/extras/landing/`) was made, so the next game starts from there.

**Scope:** what to build, in what order, and how to tell that it is good. Three things live elsewhere and are not repeated here:

- **The contract every extra meets** (its files, `mount`, styles, the end of a run, drafts) is the header comment of `src/extras/types.ts`. Read it first.
- **Tests** are covered by the `test-planning`, `vitest-testing`, and `e2e-testing` skills.
- **The landing game's own story**, with its numbers before and after tuning, is in `landing-case-study.md` beside this file. Read it when you tune difficulty or split the work.

**Not doing the whole thing?**

| Asked for                              | Read                               |
| -------------------------------------- | ---------------------------------- |
| An idea or mock-ups                    | Sections 2 to 4, then stop and ask |
| A game made easier, harder, or clearer | Sections 4, 5, and 7               |
| A "Try it" button on a card            | Section 8                          |
| A draft made ready                     | Section 9                          |

---

## 1. The Order of Work

| Step                        | What comes out                                                            | Who decides                           |
| --------------------------- | ------------------------------------------------------------------------- | ------------------------------------- |
| 1. Pick the moment          | The player's job, in one sentence                                         | You propose                           |
| 2. Mock it up               | Two or three options as pictures, the best one drawn from start to finish | The person you are building for picks |
| 3. Build it as a draft      | Rules, view, and screen in `src/extras/<id>/`, with `status: 'draft'`     | You                                   |
| 4. Look at it               | Screenshots at phone and computer sizes, and the fixes they call for      | You                                   |
| 5. Have it played           | Their words about how it feels, then tuning                               | They play it                          |
| 6. Offer it from the flight | A "Try it" button on one event's card                                     | They choose the card                  |
| 7. Deliver it               | A stack of small pull requests                                            | When they ask                         |
| 8. Make it ready            | Everything in section 9                                                   | Later, as its own piece of work       |

Two steps are easy to skip and should not be:

- **Step 2.** A picture takes minutes to change. It settles the look, the words, and the endings before any code depends on them. The landing game's start-to-finish pictures were approved as drawn, and the build followed them.
- **Step 5.** Screenshots show layout. They do not show feel. Say plainly that you have only seen still pictures, start the dev server, and give the address (`http://localhost:5173/?extra=<id>`). Expect the first answer to be about difficulty.

---

## 2. Pick the Moment

A good moment has one job, something in the way, and a clock, and all three are real. Apollo 11's last minute had them: boulders where the computer was heading, a slide to stop, and fuel running low. Nothing had to be invented to make it exciting, and the end of the game could show what really happened.

Look for the moment in the flight's own story (`src/content/missions/<id>/story.ts`). Its events are already written and sourced, and one of them will be the game's end screen.

**The games already there**

| Game                | Folder    | Kind               | The player handles                                        | Instead of failing                                                                                               | Offered from                                                   |
| ------------------- | --------- | ------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Fly to orbit        | `orbit`   | Flying, on a clock | Tilt, a step at a time, when to drop each stage, and fuel | An empty stage left on drops by itself. Out of fuel, the spacecraft comes down in the ocean under its parachutes | Every flight's liftoff                                         |
| Drop the stages     | `stages`  | Timing             | One thing, once for each part: when to press              | A part not dropped in time drops by itself                                                                       | No card: the list, its address, and Up next after Fly to orbit |
| Dock two spacecraft | `docking` | Flying             | Aim and closing speed                                     | A bump sends the ship back to try again                                                                          | Each Gemini docking                                            |
| Land on the Moon    | `landing` | Flying, on a clock | Place, sideways slide, falling speed, and fuel            | A bump back up. Out of fuel, the top half flies the crew back to orbit                                           | Apollo 11's powered descent                                    |

**Test the idea before drawing it**

- **One sentence.** Can you say the player's job the way a ten-year-old would repeat it? "Slide past the boulders to clear ground, stop the slide, and come down slowly before the fuel runs out."
- **Two or three things at once** for a game you fly. One thing is a button press, and five is a cockpit. A timing game has one thing, done several times.
- **Not the same game again.** If an idea would feel like one in the table with new art, say so when you present it.
- **A kind ending when it goes wrong.** Use what a real crew would do if they could not finish the job: the landing game's abort is the real way out. If there is no such thing for this moment, let the game finish the job for the player, as Drop the stages does. Do not invent a disaster.
- **A moment many flights share.** Six flights landed on the Moon. Design around the best-known one, make the end screen show the event of whichever flight the game was opened over (the landing game does), and offer it from one flight first.

---

## 3. Mock It Up Before Any Code

Draw pictures, not descriptions. Use a design canvas or an HTML page, whatever the session can show.

**What to draw**

| Board                                   | Size                                                                     | Why                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Each option, mid-play                   | 390x844                                                                  | The phone is the first layout, and mid-play is the screen people judge |
| The option you recommend: the start     | 390x844                                                                  | Shows how the job is explained                                         |
| The option you recommend: each ending   | 390x844, or taller if the end screen scrolls (the landing's is 390x1100) | The endings carry the real story and the way back to the flight        |
| The option you recommend: on a computer | 1280x720                                                                 | Shows the side column                                                  |

The options you do not recommend need only their mid-play board.

**How to draw them**

- Use the app's own colors, type, and button styles (the tokens are listed in `src/extras/types.ts`). They have amber and blue, and no red or green, so right and wrong are said in words.
- Write the real copy on the boards, for a ten-year-old. The words are half the design, and approving a board approves its words.
- When several boards are drawn at the same time, draw one reference board first and give the rest one written brief: exact colors and sizes, the copy word for word, and which real facts may be used. Otherwise the boards drift apart.
- Give each option a letter and a short name ("A · Find a clear spot") and never rename them. People answer with the letter.

**How to present them**

- One bullet per option: the idea, and its trade-off.
- How the option you recommend matches the games already there, and what is new in it.
- Your recommendation, and one question: which one?
- What is not real yet: stand-in drawings, sentences that still need a source, and whether you have looked at the boards as drawn.

---

## 4. What Makes It Feel Right

**Every game**

| Rule                                         | How the games do it                                                                                                                                            | Why                                                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **It says it is a toy**                      | On screen in docking and landing: "A practice toy, not a simulator.", then the biggest things left out. The header of `game.ts` says which numbers are made up | The site promises that every fact is sourced (`docs/accuracy.md`). A toy that passes for a simulation breaks that |
| **Nobody crashes**                           | See the last column of the table in section 2                                                                                                                  | The reader is ten. The real safe way out is also truer than an explosion                                          |
| **A mistake can be fixed in the same run**   | After a bump the landing carries on, with the slide unchanged                                                                                                  | Setting it right teaches more than starting over                                                                  |
| **Words, not numbers**                       | Falling speed reads "Going up", "Hovering", "Slow and steady", or "Too fast"                                                                                   | A word says whether it is good. A number needs a second fact to judge it                                          |
| **One line says what to do next**            | A coach line changes with the state of the run: "Push Forward to close in."                                                                                    | The player never has to work out which read-out matters now                                                       |
| **A clock, if there is one, is the story's** | Landing: fuel burns every second, whatever is pressed. Docking has no clock                                                                                    | A clock is the reason not to creep. An invented one is only pressure                                              |
| **It ends on the real event**                | The result in a word ("Touchdown", "Gentle"), then the flight's own event with its sources, then Up next                                                       | The toy is a way into the story, not a detour from it                                                             |
| **It looks like its siblings**               | The same tokens and buttons in all three, and the same wide-layout rule in docking and landing                                                                 | Three games should feel like one site                                                                             |

**Games you fly** (docking, landing, and the next one like them)

| Rule                                                | How the games do it                                                                               | Why                                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **One press is one whole push, and it keeps going** | "Each press is one push. It keeps going until you push the other way." Holding a key adds nothing | It is the one real idea the toy teaches. Whole pushes also cancel exactly, so "Almost still" can be reached |
| **It shows where things are heading**               | Landing: a ring marks where the lander will be in five seconds. Docking: an aim sight             | Judging the future is the hard part of the real job. Drawing it makes the game about choosing, not guessing |

**Writing the words**

- Name things the way a child would: "falling speed", "sideways slide", "the top half". Not "descent rate", "lateral velocity", "ascent stage".
- Say what to do next, not what the player did wrong.
- Give each read-out three or four words, with the bad one plainly bad ("Too fast").
- Tell screen readers a word only when it changes (`context.announce`).
- Keep real-history sentences out of the game's own copy where you can. Each one needs a source registered for the game in `src/content/extras/` (see `docking.ts` there). The flight's event text on the end screen is already sourced, so let it tell the history.

---

## 5. Difficulty

Start from the rules, not from a feeling. These are the dials, and each turns both ways:

| Dial              | Harder                                       | Easier                                  | Where landing sits                                 |
| ----------------- | -------------------------------------------- | --------------------------------------- | -------------------------------------------------- |
| **The start**     | Already wrong, in a way a read-out names     | Still, or already heading the right way | Starts "Too fast"                                  |
| **The play area** | Nothing stops the player for free            | An edge or a wall that helps            | Boulders on both sides of the clear patch          |
| **The window**    | A smaller "good enough", in place or in time | A bigger one                            | The lander's middle must stop inside 5.1 m of 33 m |
| **The push**      | Small: many presses, fine aim                | Big: few presses, coarse aim            | One press changes the slide by 0.6 m a second      |
| **The wait**      | A long time before the hard part             | The hard part comes soon                | Pressing nothing bumps after about 9.6 seconds     |
| **The clock**     | Little to spare after a clean run            | A lot to spare, or no clock             | A clean run takes about 17 of 32 seconds           |

**When it is too easy,** ask what the game is giving away. The first landing build was "a bit too easy" for three reasons: a gentle start meant two of the four controls were never pressed, the edge of the play area stopped the lander over clear ground, and a clean run left 24 seconds of fuel. The case study has the numbers.

**When it is too hard,** ask what the game is asking for that the real job did not: a long wait with nothing to do, many presses for one small move, a window that needs exact timing, or a start that must be undone before the job begins.

**Either way, a good run still needs every control.** Make a game easier by giving more room and less waiting, not by taking a job away. If a change leaves a control with nothing to do, choose a different dial.

**Measure, do not guess.** The rules are plain functions, so a script can fly them:

- **A clean run:** how long it takes, and how many presses.
- **Doing nothing:** what happens, and when.
- **The window:** how exact the player must be at the hardest step.

Keep these as tests in `game.test.ts`, so a later change to the numbers shows what it did to the game. Docking has no rules tests yet: measure it with a throwaway script, and add the tests with your change.

**Know what else moves.** Every number lives once, in `RULES` in `game.ts`, so tuning is a one-line change that the view, the screen, and the copy follow. If you find a number restated somewhere else, move it into `RULES` or report it. A game that is already ready also has tests that fly scripted runs with today's numbers (`src/extras/docking/docking.test.ts`, `tests/pages/DockingPage.ts`), so run the interface and browser tests and expect to update those runs.

**Report it so the next answer is useful.** Name each number you moved, with its value before and after. When all you were told is "too hard" or "they gave up", work out the likely causes from the rules, propose the change, and ask the one thing only they know: where did the player get stuck?

Stay on the kind side. A ten-year-old should win within a few tries, and a mistake should cost time, not the run.

---

## 6. Build It as a Draft

Copy the shape of the nearest game: `landing`, `orbit`, or `docking` for something you fly, `stages` for something you time. Landing has the most to copy.

| File           | Holds                                                        | Keep in mind                                                                                |
| -------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `meta.ts`      | Title, blurb, `kind: 'hands-on'`, `order`, `status: 'draft'` | Tiny. It imports only the type                                                              |
| `game.ts`      | The rules: `RULES`, the state, one push, one step of time    | No drawing, no page, no 3D. Its header says what is simplified                              |
| `game.test.ts` | The rules, flown by tests                                    | Section 5. Only landing has one so far, and a new game should                               |
| `scene.ts`     | The 3D view, through `src/scene/kit.ts` only                 | A small set of calls for the screen to make (`fly`, `land`, `reset`, `tick`, `dispose`)     |
| `index.ts`     | The screen: the start, playing, each ending                  | All copy in one `TEXT` object. The words for each read-out are small functions of their own |
| `<id>.css`     | Styles, every selector under `[data-extra='<id>']`           | Phone first                                                                                 |
| `<id>.test.ts` | The game in the real sheet                                   | The `vitest-testing` skill                                                                  |

The three code files do not overlap, so they can be written at the same time once one written spec fixes what they share: the names and types `game.ts` exports, the calls the view offers, every constant, and every word of copy. Without the spec the pieces will not fit.

**What every game does**, beyond the contract in `src/extras/types.ts`:

- It plays fully without 3D. Docking and landing draw a flat view when WebGL is missing.
- Its whole playing screen fits a 390x844 phone with no scrolling: the view takes the height the controls leave. A note that is not needed mid-play can hide on a phone while playing.
- It takes reduced motion from `context.reducedMotion()` and passes it to the view, which jumps to end states.
- It puts focus on the result line at each ending, never on a button.
- It finds the real event by what the event is, not by which card opened the game (section 8).

**Mistakes the landing game made, so the next one need not**

A cleanup pass after the game worked found the same few problems again and again:

- **A number written twice.** A bare 2 in the screen code restated a rule. A label said "in 5 seconds" as text while the rule said `aheadSeconds: 5`. A style used pixel sizes that the view owns. Boulders placed by hand had to stay off a patch whose edges are rules. Give each number one home and read it from there. Where things placed by hand must agree with a rule, add a test that checks it.
- **One mechanism written twice.** Two animations that ease toward a target were two copies of the same code.
- **Work repeated every frame.** The camera was fitted up to four times a frame, and the look-ahead worked out four or five times. Work each thing out once a frame and pass it along.
- **A `mount` of 600 lines.** Build the parts of the screen in named functions from the start.
- **Loading what is not shown.** Load another flight's story only when this run will show it.

Docking and landing each carry their own copy of the same key handling, arrow icons, frame loop, and about 150 lines of styles. A third game of that kind should not make a third copy: move the shared parts to one place first, as its own pull request.

---

## 7. Look at It

Run the checks: `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm test`.

Then take pictures with `node tools/screenshot.mjs` (its header lists the options) and look at every one yourself:

| What                                                     | How                                     |
| -------------------------------------------------------- | --------------------------------------- |
| The start, playing, each wrong-move message, each ending | `--size 390x844` and `--size 1280x720`  |
| A phone held sideways                                    | `--size 844x390`                        |
| Without 3D                                               | `--no-webgl`                            |
| Reduced motion                                           | `--reduced-motion`                      |
| The window resized while playing                         | Two computer sizes, one after the other |

What the landing game's pictures showed, as a guide to what to look for:

- A label sitting on top of the line it names.
- The view stretched on a computer, so the ground was off the screen.
- A marker drawn on top of the lander whenever it was barely moving.
- An effect too faint to see (the engine flame).
- At one ending, the thing the words were about had flown out of view.

Play it by keyboard alone as well. Then report what you saw and what you did not. Pictures are not motion.

---

## 8. Offer It From the Flight, and Deliver It

**The "Try it" button** is one line of content: `handsOn: '<id>'` on an event in the flight's `story.ts`.

- Put it on the event where the crew's job begins. The landing game is offered from Apollo 11's "Powered descent begins", not from "The Eagle has landed".
- The end screen shows the event where the job ends. These are often two different events, so the game looks up its end event itself. The landing game first took whichever event offered it as the landing, and showed the wrong one as soon as the button moved.
- A draft's button shows on the dev server only, so the published site does not change until the game is ready.
- The button changes what the end of that flight suggests (`handsOnPick` in `src/app/related.ts`), and drafts are listed under test. Expect to update what `src/ui/ending.test.ts` and `src/ui/hub.test.ts` expect.

**Deliver it as a stack of small pull requests**, each passing every check alone:

1. The rules and their tests. Nothing shows yet.
2. The 3D view.
3. The game itself, as a draft.
4. The "Try it" button and its tests.

Title each by the change it makes, with its place in the stack: "Add the rules of the Moon landing game (1 of 4)". In each description say what it adds, how to try it, what was tested, what you decided along the way, and what is left for ready.

---

## 9. From Draft to Ready

A draft can go in early, because nobody outside the dev server sees it. Before `status: 'ready'`:

- [ ] It has been played, and the person you built it for is happy with how it feels.
- [ ] Every real-history sentence in the game's own copy has a source registered in `src/content/extras/<id>.ts`, opened and checked (`docs/accuracy.md`).
- [ ] A browser test plays it, and it is in `EXTRAS` in `tests/utils/vars.ts` (the `e2e-testing` skill).
- [ ] `README.md` ("Things to try", and the counts of extras in its text) and `docs/links.md` name it.
- [ ] A phone held sideways reaches every control without scrolling.
- [ ] `handsOn` is set on every flight where the moment happened, not only the first.

---

## 10. Hold the Line

When time is short, these are the ones not to trade away:

- Pictures before code, and a person's choice between them.
- Nobody crashes, and the game says it is a toy.
- Words, not numbers, written for a ten-year-old.
- Every number once, in `RULES`.
- The playing screen fits a 390x844 phone.
- You say what you have not seen.
