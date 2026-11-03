# LAB-CLASSROOM-RUST

Claude (Director and Release Manager), 3 November 2026. Rebuild order 12 of 15 (LAB-CLASSROOM
section 6), after Launch angles. Kyle, 31 October: lessons are upgraded in the live game once green,
behind `lab-classroom` (on), with no Preview step.

## What changed

- Rust rebuilt as a classroom lesson: twelve steps in seven parts, script on
  `docs/board/cards/LAB-CLASSROOM-RUST.md` ("Claude's script"). One scene in the steel workshop:
  Brian's shelf of glass jars, a steel nail in each (water drawn in the wet ones, salt crystals in the
  salt ones), and a wall calendar that counts the days as Space runs them, about half a second a day.
  Orange crust grows on each nail as the bench says; the zinc nail's pale coat thins first. Each jar
  shows its rust and, for zinc, the coat left. The day dial (↑ ↓) and the protection switch (← Bare,
  → Zinc coat) sit on the right when a step uses them; below, the results table, a close-up slice of
  the zinc-coated nail, the Sirena as she came up, or Brian's job card.
- The old lesson's faults are gone (the audit: tries with no goal, so any set-up passed; runs of 20
  real seconds; an exhaust story that contradicted itself; "compare with your last try" with nothing
  to compare). Every try has a goal and a guess, a week runs in about three seconds with a day
  counter, and the earlier nails stay on the shelf beside the new one. The paint and hot-exhaust story
  is dropped: no bench rule backs it, and the challenge's exhaust lives dry.
- Wonder: the Sirena came up from the sea crusted orange; a dry nail and a salt-water nail for a week:
  0% and 84%. Words: a nail in fresh water (14%); salt water beside it (84%, six times as much: 12% a
  day against 2%); a zinc-coated nail in salt water (0%, 65% of the coat left). Watch: the four jars
  for a week. Tries: a bare nail in salt water for 3 days (guess 6, 36 or 84%: 36%); how long the zinc
  lasts (guess 10 days, 20, never; it runs on to day 25: gone at day 20, then 60% rust).
- Brian's job: three things in the yard, each given the least protection that keeps it clean (10% or
  less in a week, the challenge's own line): the boat trailer dunked in the sea (zinc), the toolbox on
  the dry shelf (bare), the garden gate in the rain (zinc). Too little, too much and the slow gate each
  say why with the numbers.
- Questions: a bare nail in salt water for 5 days (60%); a zinc-coated nail for 22 days (coat gone,
  24%); why Brian soaks the Sirena in fresh water before restoring her (to draw the salt out).
- Every share is the rust bench's own (`jarAfter`, `RUST`), the rule the challenge's `rustOf` uses;
  the job's things live in the same jars as the challenge's parts and their answers are its
  `rightProtection`.
- The challenge is unchanged: finishing the lesson opens the Lab's parts panel (underbody, exhaust,
  armour plate), as before; passing it opens the Galvanised finish and, once she is raised, Restore
  the Sirena. The lesson does not pass it. The save is unchanged.
- New files: `src/lab/lessons/rust-classroom.js`, `rust-board.js`,
  `tools/test-lab-classroom-rust.mjs`, `tools/scenarios/lab-classroom-rust.mjs`.
  `src/lab/classroom/classroom-lessons.js` lists Rust. The notebook keeps the old word ids
  (`rust-rust`, `rust-salt-water`, `rust-zinc-coat`, and `rust-paint` for players who learned it).
  The Watch plays `lab.brian.rust.intro`, the recap `lab.brian.rust.explain`. Sounds: the Lab's tick
  (day dial) and clunk (switch).

## Removed

- The old Rust lesson: `src/lab/lessons/rust-lesson.js` and `rust-animation.js`.
- Rust's part of `tools/test-lab-lessons-workshop.mjs` (its packet, its prediction grid, its floor-pan
  hit skin and the jar-tag test of its 3D mount) and of `tools/scenarios/lab-lessons-workshop.mjs`
  (its walk to the jars, its tries and its hand-over); both now run G-force alone. The workshop props
  model (`workshop-lesson-props.glb`, with the old lesson's paint tin, zinc can, salt bag, water jug,
  dry-air jar, underbody panel, exhaust pipe and armour plate inside it) stays: G-force still
  loads it, and it goes when G-force is rebuilt. The nail-jars machine in the Lab hall stays.

## Changed assertions (Claude's review, rule 18)

- `tools/test-lab-lessons-workshop.mjs`: the Rust packet, its prediction grid, its floor-pan hit skin
  and its 3D jar-tag test go with the lesson they tested (removed behaviour). That the lesson's
  numbers are the bench's and the protection answers are the challenge's moves to the new suite.
  G-force's tests are unchanged, and the props model's named-prop check is unchanged. Nothing left is
  loosened.
- `tools/scenarios/lab-lessons-workshop.mjs`: Rust's run goes; the parts panel is now reached and
  passed from the classroom in `lab-classroom-rust.mjs`.
- `tools/scenarios/lab-restore.mjs`: after the Sirena's restore, the passed Rust bench still offers the
  lesson again; it now waits for that lesson to open as the classroom instead of the five-step panel.
  Every restore, charge and replay check is unchanged.
- `tools/scenarios/lab-lesson-frame.mjs` and its test-only lesson `tools/fixtures/lab-lesson-example.js`:
  the example borrowed the nail jars because Rust was on the five-step frame; with Rust a classroom it
  borrows the turning arm (G-force, still five-step), the scenario walks there and checks the real
  G-force lesson opens without the example, and its test player has the cornering lesson that G-force
  needs, as the workshop scenario's player does. Every frame check (Tab focus, words, notebook,
  isolation from rewards) is unchanged.

## Review

One independent review (read-only agent), on b8a60962: no real fault. It probed Show me from every
day-dial setting and both switch settings on every job item (each finished), checked that guesses and
answers only work in their own phase, every number and message against `jarAfter` and `RUST_OK`, the
hand-over to the parts panel (no pass granted by the lesson), the four old word ids, and that nothing
removed is still needed and G-force's tests and run are intact. Small points, fixed: going back to the
job restarted the trailer on whatever the switch last held (it could start on zinc, its answer); the
job now starts bare on every visit, with a test. Question 2's nail no longer shows a zinc coat before
the pick. Numbers that were typed in now come from the bench (`RUST`, `RUST_OK`, `jarAfter`). The
calendar and button say "opens the guess" and "Guess" where Space opens the cards, and the empty table
no longer says Space runs the days during the Watch. Left: `docs/LAB.md`'s lesson section still
describes the old Rust lesson (paint, the hot exhaust) as it does the other rebuilt lessons, for the
cleanup sweep; the card's "last jar kept beside the new one" is met by the paired jars and the table
rather than a shelf kept across steps.

## Checks

- `tools/test-lab-classroom-rust.mjs`: 10/10 (one assertion added after the review: a second visit
  to the job starts the trailer bare).
- Every `tools/test-lab-*.mjs`: 358/358 on 1195a6a0 (integration merged in).
- Lane tier (`--changed --jobs 4`): 44/44 on 1195a6a0 (an earlier run on b8a60962 stopped at
  `test-board` only because the lane was cut from an integration commit whose board had a finished
  card still open; integration had fixed it, and the merged lane passes); `npm run build` passed.
- All 23 Lab browser scenarios: 21/23 in the batch on 1195a6a0; `lab-restore` and `lab-lesson-frame`
  still expected Rust's five-step lesson. Both were updated (changed assertions above) and pass, so
  23/23. `lab-classroom-rust` plays the lesson by keyboard, with one click on the switch, through
  every wrong move and Show me, to the parts panel and the pass.
- Look: the walkthrough's pictures checked by Claude over two runs. Run 1 found the rust drawn as a
  string of beads rather than a crust, and the shelf cramped into the left half when no panel sits on
  the right; both fixed and checked in run 2.
- No frame check: the Lab classroom is a 2D board and changes no race scene.
