# LAB-REVIEW-TUNNEL

Grip, Suspension, Braking and Downforce brought up to Kyle's rules of 19 November 2026 (`docs/LAB.md` 13.2, on top of
13.1). Only the four lessons' files (`src/lab/lessons/<id>-classroom.js` and `<id>-board.js`), their tests and their own
browser scenarios changed. `src/lab/classroom/*` is untouched: the page frame (the step on top, "Words so far", steps
leaving the page, the R button) belongs to LAB-PAGE. One commit per lesson, then the current `integration/wasteland` was
merged into the lane.

## Grip

### Audit checked against the code

All the faults in the audit were as written. The code runs 2, 3, 4 and 12 degrees where Brian said 3, 4, 4.5 and 9; the
reading is 100% from 0 to 4.3 degrees, so "pushes harder as the angle grows" was not what the numbers show; "grip loss
more than 10%" could never be true (the largest loss is 10.0% at 12 degrees); `grip-slide` had no entry in `WORDS`.

### Changed

- The watch says the angles it runs (2, 3, 4 and 12 degrees), takes 10 seconds (2.5 seconds an angle), and each angle
  joins the table when the tyre reaches it. The wonder slides the tyre from 0 to 12 degrees over 10 seconds, with the dot,
  the reading and the marks moving together. R plays both again and the table empties.
- The lesson says what the reading shows: the tyre keeps all of its grip up to 4.3 degrees, and keeps less past it. The
  recap, the key ideas, the best-angle word and the graph label say it too. "A tyre turns the car by sliding a little
  sideways" stays, in the slide angle step.
- Slide angle, Slip and Best angle are now taught by their steps. `grip-slide` has a notebook entry (Slide angle); `slip`
  and `limit` are carried by their steps. Old ids keep their places.
- The 4.5 degree prediction asks how much grip the tyre keeps, with three cards that can all be true; each wrong pick has
  its own explanation. The 9 degree prediction, and Questions 1 to 3, explain each wrong pick separately. Question 2 asks
  how much grip the tyre keeps at 12 degrees. Question 3 says the fastest corner slides to 4.3 degrees and no farther.
- The worked line is `0.939 × 100 = 93.9%` and now comes out on a calculator as the reading beside the dial (it said
  `0.94 × 100 = 94%` beside a reading of 93.9%).
- "In this game", "about", "grip loss", "squeal" and every key label left Brian's words, prompts and hints. The two-run
  challenge names its question first ("find one angle with full grip and one where grip has begun to fall").

## Suspension

### Audit checked against the code

- The first "worst fault" (the Watch again button and R do nothing) was wrong: LAB-PAGE already added the replay case to
  `act()`. A test now proves that R restarts the watch and the wonder.
- The tyre contact figures in the audit were 87.88% and 93.1%; the rig reads 87.87% and 93.12%. The claim stands: the stiff
  spring keeps the tyre on the road for more of the bumpy test, so "a stiff spring can lift a tyre" was the wrong way round.
- Everything else was as written: the leaning body on every step, the same bounce for both springs, the outward
  arrows, the hard-coded recap numbers, the missing roll rule, the undefined tyre contact.

### Changed

- The recap and the key idea no longer say a stiff spring lifts a tyre. They say a soft spring shakes the body less on
  bumps but leans more in a bend, and a stiff spring keeps the body flatter and keeps the tyre on the road for more of the
  bumpy test (93.12% against 87.87%). Tyre contact is defined where body shake is.
- The picture shows what the step is about: the bump test keeps the body level and shows the shake reading; the bend
  test leans the body by its roll and shows one sideways push; the full rig shows both. The body bounces by its measured
  body shake, so the stiff spring moves it more. An open roll prediction does not lean the body.
- The wonder drives over bumps for 5 seconds, then takes a bend (10 seconds in all). The watch runs the four pairs in
  10 seconds and fills the table as it goes. R plays both again. The recap numbers are read from the rig.
- The roll rule is in the panel for both springs, and every figure comes out on a calculator
  (`5,101 N·m ÷ (20,000 N/m × 1.5 m × 1.5 m) = 0.113 rad = 6.5°`). "The roll sum" became "The roll rule", and
  "≈ 3", "about a third" and "the numbers come from this test" are gone.
- Predictions and checks explain each wrong pick separately. The on-your-own step asks for the least body shake with under
  3 degrees of roll, so it has one non-trivial answer (the stiff spring on the smooth road), and its rows no longer carry
  over from the free test. Key labels and the five-word "Tell me more" marks are gone.

## Braking

### Audit checked against the code

- "The lever does not change the stopping distance" is true of the rig (all three cars stop in 18.2 m) but reads as a
  contradiction beside the Tune page card ("moving toward the rear makes the car brake a little harder"), which is a
  different rule. The claim was removed, and the watch states only what it shows.
- The audit's "sum predicted 18.07 m" is 18.21 m for the bench car; the formula and the tape differ by under 3 cm at
  every setting, and the tape shows tenths of a metre, so the caveat about the tape was dropped rather than reworded.
- Everything else was as written, including the 0.8% margin at 70% front, the pads jumping to 69%, "about" and the
  road-car comparison.

### Open

The weight shift (69% front, 31% back) is the bench's rule at a 1 g stop (`BRAKE_RIG.stopG` is 1), while the cars brake at
2.16 g (21.19 m/s²). Fixing that needs a change to the bench and to the Brake balance challenge, which are not this card's
files. The lesson no longer says the stops are at 9.8 m/s² or that "the lesson uses the figures of that steady stop"; it
says the front tyres carry 69% while the car brakes, which is what the pads show. This is for Claude to settle.

### Changed

- Brake balance names its task and reason first: "At 50% front the back brakes do 50% of the braking, more than the 31% of
  the weight on the back tyres. Move the lever toward the front until the back brakes do less than 31%."
- The wonder and the watch play twice, a second apart (the watch says to watch where each car stops first and the back of
  the third car on the second run), and R plays both again. The pads rise over half a second as the brakes go on.
- "Sum" became "formula" or "working" (the panel, the table under the board, the steps). "About" before a number, the
  hedges ("in this game", "in real life", "the game applies") and every key label left Brian's words, prompts and hints.
- The speed word step defines km/h and m/s in both directions. The guess cards read 36.4 m, 72.8 m and 145.7 m. Brian's job
  asks its question first and uses one set of words (marker, corner, distance) where it used marker, corner and gap.
  The weight shift result says what the pads show and no more. The recap's first sentence is split in three.
- The free test asks "which cars stop in the shortest distance?" before its instructions, and the tries open with their question.

## Downforce

### Audit checked against the code

All the hedges, "sum" uses, key labels, undefined "hold the course", the free test's prediction with no place to record
it, the missing notebook id for Fan speed, and the short word-step runs were as the audit said. The `pushSum`, `timesSum`
and similar names are internal and never shown, so they stay.

### Changed

- A flat wing no longer "has an area of 0". The number is the wing's turning area, 0 when flat, 0.9 when tilted and 1.8 when
  steep, because a steeper wing turns more air.
- Ratios are claimed only beside figures that show them: the watch and Question 1 give 21.7 kg, 86.7 kg and 195.1 kg
  (four times and nine times), and the speed test gives 15.6 kg, 62.4 kg and so on. "About", "to the nearest kilogram",
  "In this game" and "the table shows this to the nearest whole number" are gone.
- The wonder takes 10 seconds, and the two word steps that run the fan (Downforce, Drag) take 9 seconds and offer
  Watch again. R plays the wonder, the watch and both word steps again. The free test, the speed test, the cost test and
  Brian's job keep the quick pace of one reading.
- Fan speed carries `braking-metres-per-second`, so km/h and m/s are in the notebook once for both lessons. Drag's
  definition says what drag is, not how the rig reads it.
- The first sentence of each result says what was learned and the rest waits behind "Tell me more" (steep wing, Downforce,
  Drag). Brian's job opens with "Which is the least wing that keeps the car on the road in each bend?". The free test asks
  which settings give the most and the least push, which the table answers. The scale's kilograms are explained.
- "Sum" and the key labels left the words, prompts and hints.

## Tests

All run from PowerShell in the lane after merging the current `integration/wasteland`.

- `node --test tools/test-lab-classroom.mjs` (holds Grip and Suspension): 74 of 74.
- `node --test tools/test-lab-classroom-braking.mjs`: 31 of 31. `tools/test-lab-classroom-downforce.mjs`: 27 of 27.
- `node tools/test-lab-brian-short.mjs`: 6 of 6. `tools/test-lab-classroom-page.mjs`: 9 of 9.
- Also green: `test-lab-benches` (19), `test-lab-rules` (20), `test-lab-title-words` (5), `test-lab-tune-view` (14).
- All sixteen `tools/scenarios/lab-classroom*.mjs` (`--jobs 2`, output under `.evidence/tunnel/raw`, since the runner refuses
  any other folder): 16 of 16 passed, 0 warnings, 0 errors.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 39 passed, 0 failed. Three suites were left to the night by
  the runner (`test-arena-shove`, `test-convoy-tanker-art`, `test-first-person-polish`); they are picked only because a
  scenario or board file is named near them.
- `npm run build`: built, with the usual chunk-size notices.
- `lab-tune-view` (which calls `passDownforce`) was not run on its own; the Downforce scenario walks the same path.

### Added tests

Kyle's wording rules over every text each lesson shows (wrong answers, tries and the job included: no hedging, no "sum", no
"about" before a number, no key labels); Grip: the angles the watch names are the angles it runs, the wonder length, R,
and the reading being full from 0 to 4 degrees; Suspension: the watch and wonder length with R, the picture's three
modes, the roll rule's figures on a calculator, the stiff-spring claim against the rig; Braking: the wonder and watch
playing twice with R and the second prompt, the pads rising, the guess cards and Brian's job opening; Downforce: the
wonder and word-step lengths with R, Fan speed's notebook word, and the turning area.

## Changed assertions (one reason each)

Grip and Suspension (`tools/test-lab-classroom.mjs`):

1. Grip's word ids gain `grip-slide` last: its step already saved it; it now has a definition.
2. `0.94 × 100 = 94%` is `0.939 × 100 = 93.9%` (three places): the worked line must match the reading beside the dial.
3. `100% less 99.7% is about 0.3%` is `100% minus 99.7% is 0.3% lost` (two places): a subtraction, and no "about".
4. The no-long-decimals pattern is `\d{4,}`, not `\d{3,}`: the fraction needs three places to come out as the reading.
5. The Grip watch test is replaced: 2.5 seconds an angle, the table fills, R empties it. The helpers wait up to 14 s, not
   5 s, for the wonder and the watch.
6. The Suspension watch test steps 2.5 seconds a pair, not 1.2 seconds, and reads the new closing words.
7. `6.5° ÷ 2.2° ≈ 3` is `60,000 ÷ 20,000 = 3. The stiff spring leans 2.2° where the soft spring leans 6.5°.`: exact, and
   the roll rule is now in the panel.
8. The body shake words are `Body shake is how hard the body shakes up and down during a test`, plus tyre contact; the
   run caption `Tyre contact shows how much...` is now the reading in the run's own sentence (87.87% tyre contact).

Braking (`tools/test-lab-classroom-braking.mjs`):

9. The pads rise: `close.front` is below 69% when braking starts and reaches it after half a second.
10. `so this car brakes about twice as hard`, `the tape can differ from this sum...` and `In this game, the back tyres` are
    now asserted absent: they were the hedges and the contradicting claim.
11. `The sum predicted` is `The formula gave`; `press ↑ until the dial reads 200` is `turn the dial up until it reads 200`
    (and down); `The dial is set, so press Space` is `so brake`; `Press →` hints are `Move the lever toward the front`:
    no key labels.
12. `59.0 m is about four times the first stop of 14.7 m` is `its stop is four times as long`, with the ratio within 0.001.
13. `the gap is only 15 m` and `inside the 15 m gap` use "corner" and "distance"; the formula title says "before the corner".
14. The prompt `Pick a card by clicking it, or press 1, 2 or 3` is `Pick the card with your answer.`

Downforce (`tools/test-lab-classroom-downforce.mjs`):

15. The notebook list gains `braking-metres-per-second` first (Fan speed teaches it).
16. `is about the same as 27.8 m/s` is `is 27.78 m/s`; `scale read 1,272 kg, which is the car's` is `: the car's`.
17. `press ↑ until the dial reads 120` is `turn the dial up until it reads 120` (and the direction test); `Press ← or →`
    and `Press → for a steeper wing` are `Choose another wing` and `Choose a steeper wing and run the fan again`.
18. The guess cards read `31.2 kg`, `62.4 kg` and `124.9 kg` and the result `four times as much`, not `About 31 kg`...: a
    ratio is claimed beside figures that show it.
19. Question 1's wrong answers and the watch result use 21.7 kg, 86.7 kg and 195.1 kg without "about" or "to the nearest
    kilogram"; the test that said rounded figures say "about" now checks that the ratios come out to one decimal.
20. The watch's opening is checked for `The wing is now steep, and the fan will run at 50 km/h`, not as its first words:
    the question comes first.

Scenarios: the wonder and watch waits are about 10 s with an R check on each animated step; the Grip scenario checks
`keeps 99.7% of its grip`; Suspension checks `60,000 ÷ 20,000 = 3` and the new body shake words; Braking and Downforce check
the new turn-the-dial and choose-a-wing words; the Downforce scenario waits for the tilted wing in the panel rather than for
the old prompt.

## Lines to re-record

Brian's recorded lines were not edited. These spoken lines no longer match the screen or contain words Kyle's rules ban:

- `lab.brian.grip.explain`: says "In the game a tyre keeps all its grip..." and two sentences about a squeal that the lesson
  no longer teaches. The screen says "Up to 4.3 degrees of slide, a tyre keeps all of its grip. Past that, it keeps less,
  and the driver feels the car start to skid."
- `lab.brian.braking.intro`: says "eighty kilometres per hour ... a hundred and thirteen"; the screen says 100 and 150 km/h
  (this mismatch was there before this card).
- `lab.brian.downforce.intro`: says 80, 161 and 241 km/h; the screen says 50, 100 and 150 km/h (also there before).

`lab.brian.braking.explain` and `lab.brian.downforce.explain` still say what the recaps say (the Braking recap's first
sentence is split in three on screen, with the same words). The Suspension lines are not played by its steps.

## Removed

Grip: the claim that the tyre pushes harder as the angle grows, the hedges and "squeal", the "grip loss" card that could
never be true. Suspension: "briefly lift a tyre", the lean on every step, the outward arrow pair, the hard-coded recap
numbers, the run caption about tyre contact, `The roll sum`. Braking: the claim about the lever and the stopping distance,
the road-car comparison, `SUM_NOTE`, the 9.8 m/s² steady-stop words. Downforce: the "area is 0 when flat" claim and the
rounding captions. Nothing else; no files were deleted.

## Pictures

Three JPGs in `.evidence/tunnel/` (not committed): `grip-watch-midway.jpg`, `suspension-stiff-spring-corrected.jpg`
(the recap's third card and the panel) and `braking-watch-claims-fixed.jpg`.
