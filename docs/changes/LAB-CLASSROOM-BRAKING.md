# LAB-CLASSROOM-BRAKING

Claude (Director and Release Manager), 2 November 2026. Rebuild order 7 of 15 (LAB-CLASSROOM
section 6), after Strength against weight. Kyle, 31 October: lessons are upgraded in the live game
once green, behind `lab-classroom` (on), with no Preview step. Also the classroom screen's reading
fixes from Kyle's note of 2 November.

## What changed

- Braking rebuilt as a classroom lesson: twelve steps in seven parts, script on
  `docs/board/cards/LAB-CLASSROOM-BRAKING.md` ("Claude's script"). The steel workshop: the car close
  up on two weighing pads (each end's share of the weight, an arrow sized to it, the back tyre red
  when it locks); a speed dial (↑ ↓, 10 mph a press) and a brake lever (← →, 10% a press, the steady
  side in green), both clickable with their keys on the board; an 80 m test strip where cars to scale
  arrive, brake at the line at real speed and stop, with a tape giving the metres and skid marks
  when the back slides. Space brakes; on the tries the bar shows only Brake, so it stays readable.
- The old lesson's faults are gone: settings carry from step to step, the dial steps in whole
  10 mph (100 mph is one press away, never a held arrow), and every try starts away from its answer
  (the slide try on 50% front; Brian's job at 50 mph). The bench has no 75 mph setting (its speed
  step is 10), so the card's "50, 75, 100" became 50 and 100.
- Every number is `brakingBench.run` (the challenge's bench): 11.8 m from 50 mph, 47.2 m from 100
  (four times), 17.0, 67.9 and 79.7 m from 60, 120 and 130; in a gentle stop the front tyres carry
  69% and the back 31% (`frontLoadShare`), so 60% front slides and 70% stops steady. Brian's job:
  three corners with braking markers 20, 50 and 70 m before them, the fastest steady stop being 60,
  100 and 120 mph; too fast, too slow and a slide each say why with the metres. Question 3 is the
  Tune page's own line (`effectLine('brakes', 2)`).
- The challenge is unchanged: the bench's goal (a run from 50 mph and one from 100 mph), passed on
  the lesson's own runs through `onChallenge` (`benchAttempts`); "Finish the lesson" passes it and
  Brian says Brake balance is open on the Tune page.
- The Tune page's Brake balance trade line said "Toward the rear stops shorter and keeps the car
  turning in while braking". The game rule (`LAB_TUNE.brakes`) and the page's own effect line give
  less cornering grip while braking toward the rear, so the line now reads "Toward the rear stops a
  little shorter, but grips less in a turn while braking: the back slides sooner. Toward the front
  is steadier." (found by the review).
- **The classroom screen, every rebuilt lesson** (Kyle, 2 November: "the text automatically goes
  to the next item before you've had a chance to even read the first box. there's no back arrow").
  Brian's "Stuck? Press H" offer and his automatic first hint now sit on their own line under his
  words (`nudge` in `classroom-frame.js`, `.lc-nudge` in the screen) instead of replacing them, and
  any press (a click of a dial included) counts as busy. A Previous step button (Backspace) beside
  Leave goes back one step; a done step stays done. The old five-step lessons are not changed
  (Kyle: "we don't need old lesson logic fixed"); each goes as it is rebuilt.
- New files: `src/lab/lessons/braking-classroom.js`, `braking-board.js`,
  `tools/test-lab-classroom-braking.mjs`, `tools/scenarios/lab-classroom-braking.mjs`.
  `src/lab/classroom/classroom-lessons.js` lists Braking. The notebook keeps the three words under
  the ids the old lesson saved (`braking-word-0` to `-2`). The Watch plays
  `lab.brian.braking.intro`, the recap `lab.brian.braking.explain`.
- Sound: the brake line plays the Lab's tick. The game has only a looping tyre squeal for driving,
  which does not fit a one-off skid; a skid sound for the Lab is a follow-up for the next sound pass.

## Removed

- The old Braking lesson: `src/lab/lessons/braking-lesson.js` and `braking-animation.js`.
- The brake disc's 3D part in `tunnel-model.js` and its picture branch in `tunnel-packet.js`;
  nothing else used them. The mesh stays inside `tunnel-parts.glb` until the last wind-tunnel lesson
  (Suspension, order 15), when the whole file and its recipe go.
- From `tools/test-lab-lessons-tunnel.mjs`: the Braking packet, its expected outcome and its
  picture test. The braking bench's own check there stays. From `tools/scenarios/lab-lessons-tunnel.mjs`:
  Braking from the default list (carried by `lab-classroom-braking.mjs`).

## Changed assertions (Claude's review, rule 18)

- `tools/test-lab-classroom.mjs`, "Brian notices a stuck player": the offer and the first hint were
  read from `brian.text` and are now read from `nudge.text`, because they moved there; the test now
  also checks that Brian's words stay unchanged while the offer and hint show, and that asking for
  help answers in his own words. Nothing is loosened: the offer still comes at 12 s and the hint at
  25 s. A new test covers Previous step.
- `tools/test-lab-lessons-tunnel.mjs`: only the removed lesson's packet, outcome and picture test
  left; the other three packets and every bench check are as before.

## Review

One independent review (a separate agent reading the code, checking every number with node, and
playing all eight classroom lessons back and forward at every step) found nothing serious: no dead
ends, every number matches the bench, the pass cannot come early, the stuck-test change is a move,
not a loosening. Its findings, all fixed: Brian's offer appeared while a player was turning the dial
(any press now counts as busy); the Tune page's line contradicted question 3 (fixed, above); "69%"
is the gentle-stop weight shift, now said so; the slide try could be passed without seeing the slide
(the lever opens after the first stop); a scenario check that could never fail; the tape label over
the lane name, runs past the 80 m strip, and the pads' hover area. Before the review, two browser
runs fixed a crowded bar (seven buttons squeezed the prompt), the dial's number over its buttons,
the lever's knob over its title, and two bubbles that scrolled.

## Checks

- `tools/test-lab-classroom-braking.mjs`: 12 of 12 (numbers from the bench; a child following the
  prompts passes; every wrong guess and run says why; help climbs to Show me on every step; the
  lesson's runs pass the bench only with the 100 mph run; mouse; drawing; the old faults; the
  review fixes). `tools/test-lab-classroom.mjs`: 16 of 16 (the offer and hint sit under Brian's
  words; Previous step).
- Every `tools/test-lab-*.mjs`: 28 suites, 321 tests, all pass (before the review fixes); the four
  classroom suites again after them, 53 of 53.
- Lab browser scenarios, 20, with the lane tier running alongside: 19 passed, including
  `lab-classroom-braking` (32 pictures: keyboard with one click on the lever, the stuck offer under
  Brian's words, Backspace back one step, the pass and the Brake balance row on the Tune page) and
  every other classroom lesson with the new frame. `lab-classroom-wax` timed out after its recap,
  inside the scenario's long helicopter flight to the slalom (a page call under load, not a failed
  check); rerun alone below.
- Lane tier (`--changed --jobs 4`) on c711a5db (integration merged in): 73 of 73.

## Follow-up

- A one-off skid sound for the Lab (the Braking slide plays a tick today).
