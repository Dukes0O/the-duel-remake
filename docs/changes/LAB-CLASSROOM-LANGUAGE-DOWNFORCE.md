# LAB-CLASSROOM-LANGUAGE-DOWNFORCE

The Downforce lesson rewritten to Kyle's standard (`docs/board/cards/LAB-CLASSROOM-LANGUAGE.md`). The bench, the
challenge, the reward, the save and the three notebook ids are unchanged, and every number still comes from the bench.

## What changed

- **Words.** Every sentence, question, hint, prompt, recap card, notebook meaning and hover line is rewritten as whole
  sentences a teacher would say. Objects are named, and verbs are accurate: the wing turns the air, and more wing lowers the top speed.
- **Units.** Metric only. The fan dial shows km/h, rounded, beside the m/s the sums use, and it keeps the bench's own
  steps: 80, 97, 113, 129, 145, 161, 177, 193, 209, 225 and 241 km/h. kg is defined on first use as the scale's reading, and
  km/h on first use in the opening step.
- **New step "Fan speed"** (no notebook word). It defines km/h and m/s and the reason for 3.6, turns the dial from 80 to 161 km/h,
  and draws a tape that shows how far the air moves during each second.
- **The explanation.** The wing turns the air upward, so the wing pushes on the air and the air pushes back on the wing, and the
  wing is fixed to the car. A tyre grips harder when it is pressed harder, which is why that matters in a bend. The push grows with
  the square of the speed because twice the speed meets twice as much air, and turns each kilogram of it twice as hard. Drag is the
  rope's reading, and more wing lowers the top speed because drag uses up the engine's fixed power.
- **The physics panel**, on every step after the first, from the bench's own rule: km/h from m/s, the wing's number k,
  `push = k × speed²`, a comparison line that shows four times the push at twice the speed as the dial moves, `drag = d × speed²`,
  and the top speed as a cube root. Each sum is worked from the rounded numbers it shows, and comes out at the bench's reading at all
  eleven dial speeds and all three wings. A question's worked sums wait for its answer. Question 3's panel shows the game's own
  Tune page rule, in which extra grip also grows with the square of the speed.
- **Experimenting.** New step "Test your own settings": any fan speed and wing, the sums first, three different settings
  open Continue, and the table keeps the results. The word steps stay open after their answer, and their closing words are
  in the past tense, so they stay true while the player turns the dial.
- **Pictures.** The smoke now arrives level, parts round the wing and leaves rising behind a tilted wing, with arrows for
  the air arriving and leaving. The green push arrow hangs from the wing onto the car, and the push and drag arrows are to scale,
  so four times the push is four times as long. The table marks × 4 and × 9. The rope's gauge now reads to 300 kg, because the
  dial can now reach that drag. Question 2's three bends differ in size and name.

## Removed

- All the old wording, the mph dial, table and readouts, and the `MIN_MPH`, `MAX_MPH`, `TOP_MPH`, `WONDER_MPH` and
  `WATCH_MPH` names. Only the bench's own names (`speedMph`, `topMph`, `referenceMph`, `mphToWorld`) remain, because the bench
  reads them.
- The old smoke rule, which ran straight through the wing.

## Changed assertions (for Claude's review, rule 18)

- `tools/test-lab-classroom-downforce.mjs`: each assertion on wording moves to the new sentence and keeps its numbers. Speeds in
  mph become the same speeds in km/h: 50, 60, 70, 100, 120 and 150 become 80, 97, 113, 161, 193 and 241. Top speeds 201, 187 and 176
  become 323, 300 and 283 km/h. Every kilogram figure is unchanged. No check is removed or loosened.
- `WING_TWO_LINE` was the Tune page's own line. It is now checked as that same line with `100 mph` replaced by `161 km/h`.
- `TOP_MPH` was a lesson constant. The check now reads `tunnelCar.topMph` against `CARS`, which is the same fact.
- The playthrough gains the two new steps. Added: every panel sum against the bench, controls moving the sums on the press,
  word steps staying open, the free test, a question's sums waiting for its answer, and the source check on `she`, `her`, `mph`,
  `decides` and "air takes".
- `tools/scenarios/lab-classroom-downforce.mjs`: wording moves as above, and it now runs at 1920 by 1000 so the panel is on. It adds
  checks that the sums follow the controls and that a question is not cut off. `passDownforce` plays the two new steps, so
  `lab-tune-view` still opens the wing.

## Proposed voice lines

Not recorded. For `src/lab/lab-lines.js` and the table in `docs/LAB.md`:

- `lab.brian.downforce.intro`: The wing is now steep, and the fan will run at eighty kilometres per hour, then at a hundred and sixty-one and then at two hundred and forty-one. Watch the scale and the table.
- `lab.brian.downforce.explain`: A racing wing turns the air upward, so the air pushes the wing and the car downward, and that push is called downforce. Downforce presses the tyres harder onto the road, so the tyres grip harder in a bend. The push grows with the square of the speed, so twice the speed gives four times the push. A wing also adds drag, which lowers the top speed, so you choose more wing for fast bends and less wing for long straights.
- `lab.brian.downforce.pass`: More wing gives more grip and a lower top speed, so you choose the wing that suits the track.

## Review

One independent review. All of its faults are fixed, with a test for each that fits. During the speed test and the top speed
guess, the panel showed sums that gave away the answer, so those sums now wait for the guess. "Press ↑" was wrong with the dial above
193 km/h. Show me on the free test reran the same setting, so it now tries a new one each time and reaches three. Show me said it would run the
fan when it stops at the guess, and Space in that step now says that it goes to the guess. "The fan stays" followed a run at another speed.
Two prompts were fragments. Whole figures sat beside exact claims, so they now say "about", and the panel shows decimals that come out on a calculator.
Checked against the first batch's list as well: "drag" no longer appears on the picture before the step that defines it, the square of a
number is now defined in Brian's words where it first appears, and "the steep wing stays in place" became "the wing is now steep", because the player may have left it flatter.

`tools/test-lab-classroom-downforce.mjs` replaces `100 mph` in the Tune page's line until Claude changes `tune-view.js` to 161 km/h at the merge.

## Checks

- `node tools/test-lab-classroom-downforce.mjs`: 23 of 23.
- The source check on both lesson files finds no `she`, `her`, `mph`, `decides` or "air takes". Every step after the first shows formulas, which is
  what `tools/test-lab-classroom-page.mjs` will ask once Downforce joins its list.
- Browser scenario `lab-classroom-downforce` passes at 1920 by 1000: 38 screenshots, 0 warnings, 0 errors. Pictures read: the word steps, the free test,
  each question with its cards open and answered, Brian's job and the recap. Text fits, and the questions are fully visible.
- The lane tier and the build are left for Claude at the merge. No frame check: the classroom is a 2D board.
