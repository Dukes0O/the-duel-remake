---
task: LAB-TUNE-VIEW
status: review
kind: feature
flag: lab-tuning
player_facing: yes
---

# Tune page, tuned-lap result line, pit board fuel and the five wind-tunnel lessons (25 October 2026)

Card `docs/board/cards/LAB-TUNE-VIEW.md`, design `docs/LAB.md` section 5. Behind `lab` and `lab-tuning` (both dev): with either off nothing
shows, nothing is saved and a race is exactly what it was. Local Sonnet 5.5 session (Claude), built on LAB-TUNE.

## Open design questions, with my picks (for Claude to confirm)

1. **The wind-tunnel lessons cannot be passed by a tuned lap.** LAB.md 4.4 says each lesson's challenge is the first tuned lap (0.5%
   faster than your stock lap), but `setTune` (LAB-TUNE) only lets a setting be set once its lesson is passed, so a tuned lap with
   that setting could never come first. **Pick:** with `lab-tuning` on, the five lessons pass on their bench the moment the goal is
   met, like Launch angles and Strength (`challengeKindOf` in `lab-model.js`; the challenge kind table is unchanged). Passing opens
   that setting free on the Tune page. The tuned lap is the 400 bonus (once per course, 1%), which LAB-TUNE already pays. With
   `lab-tuning` off they still read "Opens with tuning". The 0.5% lap on a named course is not built; if you want it, the rule for
   opening a setting has to change in `lab-save.js` (a setting opens on the bench, the lap pays a reward).
2. **Where the page lives.** A collapsible panel in the garage under the car's ratings, for each owned car (the page for the car on
   show), not a separate screen. Reset sets the five settings of that car to 0.
3. **What a race may use.** The page shows a setting only as set when its lesson is passed, and `app._labTuneOf` now hands the race
   `usableTune`: settings whose lesson is not passed read 0, and fuel reads 0 for a car with no tank (`electric`). Before, a hand-edited
   save could tune a setting the Lab never opened. An honest save is unchanged.
4. **Words for the result line** (tuned Time Trial laps are not on the leaderboard, as decided): faster by 1% or more and paid: "Tuned
   lap: 1.4% faster than your stock lap. Bonus 400."; faster by 1% or more, already paid: "... The 400 bonus for this course is already
   paid."; faster, under 1%: "... 0.6% faster than your stock lap. The 400 bonus needs 1%."; slower: "... 0.8% slower than your stock
   lap (1:43.91)."; no stock lap yet: says to drive the course once with every setting at 0. Each is followed by "Tuned laps are not
   on the leaderboard." A stock run shows "Stock lap: 1:43.91. A tuned lap is judged against it." only to a player who has a setting
   open. The percent is computed from the saved stock lap and the best unassisted lap (the same whole-millisecond rule as the rules).
5. **The pit board's fuel.** Only for a player with a tank (a Grand Prix, a petrol car, a fuel setting above 0): the lane line adds
   "FUEL 40%" (or "TANK EMPTY" when dry), the service line reads "FITTING ... TYRES AND FUEL". Nothing changes for a car with no tank.
   It reads the race state and never changes it.

## What it adds

- `src/lab/tune-view.js` (new): the page's rows (`tuneRows`), markup (`tunePanel`), the steps' own numbers (`effectLine`, from `LAB_TUNE`),
  `usableTune`, `resetTuneIn`, `stepIn`, the result lines (`tunedLapLines`) and `fuelBoardText`. `src/lab/tune-ui.css` (new): the page's look.
- Hooks, each marked `LAB-TUNE-VIEW`: `src/screen-garage.js` (the panel and `handleTuneAction`), `src/screen-router.js` (one import, one
  line in the click handler), `src/screen-results.js` (the lines under the bonuses), `src/pit-lane.js` (`pitView` words),
  `src/app.js` (`_labTuneOf` reads `usableTune`), `src/lab/lab-model.js` and `src/lab/lab-view.js` (`challengeKindOf`; the five lessons).
- Every change of the saved tune goes through `app.labCommit` with the Lab's own `setTune` (steps) or `resetTuneIn` (Reset, which also
  clears a forged value on a shut setting and refuses a later game's Lab). The page and the result line read only; the race state is
  untouched (the scenario compares the whole state before and after a step).

## Tests and checks

- `tools/test-lab-tune-view.mjs` (12 checks): rows by switch and lesson, the markup, steps refused (3, -3, 1.5, NaN, '1', null,
  Infinity, shut setting, switch off, forged names), Reset incl. forged and later-version Labs, `usableTune` (forged, out of range, old
  save, later game), the app's `_labTuneOf`, every step's numbers, the result-line cases, the pit board, the five lessons passing on
  real benches and opening exactly their settings.
- `tools/scenarios/lab-tune-view.mjs` (private port, memory-only save): the shut page; Downforce passed on its bench; the wing at +2 saved
  with the race state unchanged; a shut setting refused; Reset; a stock Time Trial lap (the stock lap kept), a tuned lap (wing +2,
  line "0.3% slower" with the demo driver), a tuned lap beating a stock lap by 1.6% (Bonus 400 paid, once), and the same again (already paid).
- Picture sheet `docs/board/looks/lab-tune-view/round-1.jpg` with `round-1-review.md`.
- Lane tier `node tools/run-tests.mjs --tier lane --changed --jobs 4` and `npm run build`: see the result lines in the final report.

## Changed assertions

None.

## Removed

Nothing.
