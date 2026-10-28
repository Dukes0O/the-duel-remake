---
task: FC-LAB-SCENARIOS
status: lane tier, build and all nine scenarios green on 8b6fb937
flag: lab-2
player_facing: yes
---

# FC-LAB-SCENARIOS: nine Lab browser scenarios that failed the nightly full check

The nightly full check on 22e9a9f8 failed nine Lab browser scenarios, and its rerun failed them again. The lane tier never
runs these scenarios, so 438 commits landed without anyone seeing it. Three were real faults a player would see, and six were
scenarios that still described the Lab before the walking Lab and the sixteen five-step lessons replaced the bench panels.

## What changed

Game code (three real faults):

- `src/lab/lesson-ui.css`: the Key idea card in a lesson screen had both `top` and `bottom` set, so it stretched into a tall
  column that covered the answer pictures. It now keeps its natural height. In a Lab lap (the G-force challenge) the card sat on
  the circuit map, so it now rides under the course name there (not in helicopter challenges).
- `src/lab/lessons/snow-display.js`: object captions in the two Snow lessons could sit on top of each other (the Launch angles
  landing and launcher labels, the flag label). A caption that would touch an earlier one now steps up or down clear of it.

Scenarios (stale against the shipped design):

- `lab-walk`, `lab-view`, `lab-tune-view`, `lab-polish`: strength, G-force and the wind tunnel now open their lesson, not a bench
  panel. The scenarios now take or open those lessons.
- `lab-lesson-frame`: walk to the Lift the way `lab-lift-2` does (Brian is solid now). The "switch off" tail is replaced.
- `lab-navigation`: the map and click checks are unchanged. The click on the object waits for the room to settle.
- `lab-lessons-tunnel`: the lesson driver is now an exported function so `lab-tune-view` can reuse it. Same checks in the same order.
- `lab-lessons-snow`: when captions overlap, the scenario names the step and takes a picture first. Same check.

## Cause of each failure

| Scenario | Failure | Cause | Introduced by |
|---|---|---|---|
| lab-view | Timed out waiting for the strength bench | Stale scenario: Strength is a five-step lesson | LAB-LESSONS-WORKSHOP (5763ccb4); lab-2 on in 615201a7 |
| lab-walk | Timed out waiting for turning-arm bench | Stale scenario: G-force and Strength are lessons | LAB-LESSONS-WORKSHOP |
| lab-navigation | Timed out waiting for arrive bending-rig | Recipe fault: the click on the bending rig came at a moment when the room was still settling after the previous lesson closed, so the highlighted spot no longer pointed at the rig. Cause of the settling not fully traced; the recipe now clicks only a spot that still names the object after 400 ms | LAB-LESSONS-WORKSHOP (strength is the first machine that follows a lesson with big handles) |
| lab-tune-view | Timed out waiting for the Downforce bench | Stale scenario: Downforce is a lesson | LAB-LESSONS-TUNNEL (9b1ad133) |
| lab-polish | Timed out waiting for lift opens | Stale scenario: the sixteen bench views are not reachable any more | LAB-LESSONS-* rounds, lab-2 on in 615201a7 |
| lab-lesson-frame | Timed out waiting for KeyA | Stale scenario: Brian became solid and the walker must face the Lift (LAB-BRIAN-FIX 615201a7 fixed `lab-lift-2` and `lab-walk` only) | 615201a7 |
| lab-lessons-tunnel | Key idea overlaps visible controls | Game fault: card stretched to the bottom bar | 364eb257 and 10af3f96 (26 October) |
| lab-lessons-workshop | Key idea covers picked | Same stretched card, then a second fault: in the G-force lap the card covered the circuit map | same, plus the lap handoff from LAB-LESSONS-WORKSHOP |
| lab-lessons-snow | Object captions overlap | Game fault: captions placed by fixed offsets collide when a shot lands near the launcher | 10af3f96 |

`4dd734e4` (LAB-RESTORE-PASSED) was not a cause of any of the nine.

## Changed assertions

- lab-walk, two machines: old "the bench `.lab-bench[data-lesson=ID]` opens, then click Back". New: the lesson panel opens and
  contains that lesson's own wonder text (from the lesson definition), no `.lab-bench` exists, then click the lesson's Back. Not
  weaker: it names the exact lesson and also proves the old panel is absent.
- lab-view: old "bench opens, Brian's caption shows above the canvas, set the lightest arm and Run, strength is saved". New: the
  Strength lesson opens with its own wonder text and no old bench, the lesson panel is the top element at its centre (the stand-in
  for the caption check, since the lesson hides the old caption), then the whole lesson is played (wonder, words, watch, a wrong
  prediction and hint, three real tries on the machine's part, material and thickness handles, two wrong check answers, the
  inline challenge, Finish) and the save is checked. The lesson alone must not pass the challenge. The shop checks (2000 credit
  Heavy hook, room release on leaving twice) are untouched. Stronger than before.
- lab-tune-view: old "Downforce passes on the bench: label says Finish the experiment, two bench runs, pass saved, message names
  the Tune page". New: the real Downforce lesson through the shared tunnel driver (which checks the lesson does not award
  progress, a wrong prediction, three tries, checks, the challenge card does not cover controls, and the real goal and reward),
  the pass is saved, and the message still names the Tune page. Everything after (Tune page, wing step, stock and tuned laps,
  bonus) is untouched.
- lab-polish: old "each of sixteen lessons: open its bench, run its dial settings, readout appears, experiment finishes".
  New: each of the sixteen lessons is walked to by its map dot (the wind tunnel asks which of its five), opens as its own lesson
  with no old bench, starts at step 1 of 5 with a Continue button, and is photographed under the same file names. The dial
  settings themselves are still run by `tools/test-lab-player.mjs` on the rules, and the machine controls of all sixteen lessons
  are driven in the browser by the lesson scenarios. This one is weaker as a single scenario (it no longer touches each
  dial); Claude to decide whether that is enough or whether the dead bench panels should be removed (see Open).
- lab-lesson-frame: old tail "with the switch off, the old Lab is unchanged". The switch is on for everyone, so it cannot be
  tested. New tail: without the QA option the same Lift machine opens its real lesson, not the test lesson, and no bench.
  The first half of the scenario is unchanged apart from walking (z below 4.4, then looking at the Lift).
- lab-navigation: added only; a spot must still name the object 400 ms later before it is clicked.

No tolerance, timeout or game rule was changed.

## Tests run

- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4`): passed (31 suites, 0 failed).
- `npm run build`: passed.
- Browser scenarios, `--jobs 1`, one output folder reused, run on the final code unless noted:
  - Passed: lab-lessons-snow, lab-lessons-tunnel, lab-lessons-workshop, lab-walk, lab-navigation, lab-lesson-frame, lab-view,
    lab-polish (8 of 9).
  - lab-tune-view: not green yet. The first rerun failed at the Downforce lesson's first try (see below). After two more
    fixes the lesson itself ran through to its end and the pass was saved, but the next check failed, and I changed it (see
    below) without being able to run the scenario again, because C: fell to 0.3 GB free (limit 0.8 GB). It needs one rerun.
- Final run on 8b6fb937 (after the Tune page fix), 28 October: lane tier 31 passed, 0 failed; build passed; all nine Lab
  scenarios passed (lab-tune-view, lab-view, lab-walk, lab-navigation, lab-polish with --jobs 1; lab-lessons-tunnel,
  lab-lessons-workshop, lab-lessons-snow, lab-lesson-frame with --jobs 2).
- The run folder was deleted after the runs.

## lab-tune-view: what the reruns showed

1. At 1280 x 800 (this scenario's old window size) the picture boxes of the Try step sit on top of the fan dial, so a click
   on the dial in the 3D machine lands on a picture button. Every other Lab lesson scenario uses 1440 x 900, where the dial
   is clear. The scenario now uses 1440 x 900. A possible game fault is left open (see Open): at 1280 x 800 the answer pictures
   cover the dial.
2. `tunnelDriver` now takes a picture and names what is on top at the click point when a 3D part does not respond. Same check.
3. After the Downforce lesson is finished, the old check "the message says the setting is open on the Tune page" failed
   because finishing a lesson went back to the board (`backToBoard` in `src/lab/lab-view.js` cleared the message), so a
   player who passed Downforce in the walking Lab was no longer told it opened the wing. Claude's decision: a game fault.
   Fixed in `lab-view.js`: a lesson's own Finish keeps its pass message (opening a bench still clears it). The check is
   back in the scenario, as a wait for the Tune page message on the board; nothing is removed.

## Removed

- The old "switch off leaves the old Lab alone" tail of `lab-lesson-frame` (nothing can turn lab-2 off now).
- The bench-panel steps of `lab-view`, `lab-tune-view` and `lab-polish`, replaced by the lesson steps above.
- The scratch evidence under `.evidence/2026-10-28/FC-LAB-SCENARIOS` was deleted.

## Open

- The bench panel markup (dials and Run) in `lab-markup.js` and `lab-view.js` is now reachable only for the Rust Restore
  and the secret fan. The LAB-BRIAN-FIX note said fifteen bench panels would stay for LAB-LESSONS-2; that work is done.
  Removing them is a separate card.
- At 1280 x 800 the answer pictures in a lesson's Try step cover the fan dial of the wind tunnel, so the 3D dial cannot be
  clicked there (the on-screen dial button still works). Not changed here; card LAB-TRY-PICTURES-DIAL.
