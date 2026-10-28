# LAB-CHALLENGE-EASE

Kind: challenge rules and feedback. Switch: `lab` (dev).

## Design before code

Implement Claude's four calls on the card. Preserve typed numeric choices from
DOM selects. Widen the projectile hit radius from 5 m to 10 m and show actual
landings for 5 seconds against visible buoy rings. Use native rounded controls
to approach steadily, release early and correct using splash feedback; require
three hits within 180 seconds. Measure native scoop trips before choosing the
practice fire's timing, allowing at least 60 seconds spare. A wax challenge
passes on a completed run with the day's correct wax, with gate penalties still
included in time. Ordinary ski scores and medals keep their existing rules.

Checks: pendulum DOM-value regression; projectile boundary/marker lifetime and
fire rules; wax correct/wrong/unfinished results; all sixteen scripted lessons.
Then lane tier (`--changed --jobs 4`), build, all Lab browser scenarios and the
affected ski/helicopter scenarios using private ports and memory-only saves.

## Before and after

Claude's four calls on the card authorize these design changes. No ordinary
fire, bucket physics, ski gate penalty, medal or best-time number changes.

| Number or rule | Before | After | Reason |
| --- | --- | --- | --- |
| Pendulum DOM length selections | All reset to 5 m | 5, 15, 25 m retained as numbers | Record three actual lengths; no lesson threshold change |
| Projectile hit radius | 5 m | 10 m | Twice the radius, as Claude directed |
| Buoy target circle | No drawn circle | 10 m radius | Show the actual accepted area |
| Splash marker | None | Latest landing, 3 m radius, 5 s after last parcel lands | Compare the miss with the buoy and correct next release |
| Buoy/splash drawing height | Buoy at lake level | Surface + 0.2 m | Keep rings visible; splash uses the actual landing surface, including shore |
| Practice fire spread interval | 30 s | 70 s | Two measured scoop trips need about 269 s; allow a minute spare |
| Unattended practice fire reaches road | 150 s | 350 s | About 81 s beyond the steady pilot's extinguishing time |
| Practice fire survival limit | 180 s | 420 s | Keep an unattended fire failing before the limit; allow a slowed fire to be held back |
| Wax Lab pass time ceiling | Silver: 26.2565 s | No ceiling; finite completed time > 0 | Test wax choice; missed gates add time only |
| Wax native result | 198.3 s, 33 missed, fails | Same run, time and misses, passes | Correct wax and completion now meet Claude's rule |
| Projectile native attempt | 688.3 s, zero hits | 174.0 s, three hits, one scoop, four short drops | Approach steadily, release early, correct both axes from splash |
| Fire native attempt | Road at 150 s, fails | About 269 s, two scoops, four drops, extinguished | Native scooping and aiming, with spare time |

Player-script numbers (test inputs, not game tuning): water-flight climb 110 m
above pad becomes 70 m; lake approach 100 m becomes 70 m, speed 14 becomes
20 m/s, budget 150 becomes 120 s; scoop budget 75 becomes 60 s, same 14.8 m
height and capacity-minus-5 L stop. Climb after scoop 100 becomes 40 m, budget
75 becomes 45 s, same 6 m/s. Transit stops within 3 m horizontally, 2 m in
height and below 2 m/s instead of the strict 1.5 m, 0.6 m, 0.7 m/s settle;
precise fire aiming retains the strict stop. This removes needless hovering.

Projectile: one scoop replaces one per buoy. Visit nearest buoy first; approach
45 m before it, aim 60 m beyond it, fly at 8 m/s and 40 m height, release about
12 m early for 0.25 s instead of hovering at 50 m and pouring for 15 s. Wait
5 s for splash; round observed corrections to metres; allow at most three
passes per buoy and refill below 75 L. Fire uses the currently burning cell,
a 40 m hover, rounded corrections from the ordinary ring, 0.5 s pours and
5 s waits; at most eight scoop trips. The previous fixed-cell script and 190 s
idle wait are removed. Flight controls still update every 0.25 s in tenths.

## Changed assertions and test inputs

- `test-lab-view`: new DOM-string regression records 5/15/25 m plus the second
  15 m weight (200 kg), then requires the experiment goal.
- `test-lab-challenges`: radius pin 5 -> 10 m; fire limit pin 180 -> 420 s.
  Inside/outside hit samples 4.9/5.1 -> 9.9/10.1 m preserve the same boundary
  claim. Hit-list comparisons filter buoy props because splash props now exist.
  New checks require real splash coordinates, feedback on misses without a hit,
  visibility at 4.9 s, expiry after another 0.2 s, 10 m circles and shore height.
- Fire rule observation windows 400 -> 800 s, watering 200 -> 440 s, treated
  strip wait 190 -> 430 s, so they cover the new 420 s limit. Their pass/fail,
  repeatability, dry-drop and untreated-road assertions remain intact.
- The older native fire driver now uses the measured scoop/hover recipe with
  quarter-second rounded controls, targeting current flames rather than the
  advancing front. Idle observation 240 -> 400 s covers the 350 s road arrival.
  Its crash, pass, saved completion and idle-failure assertions are unchanged.
- `test-lab-snow`: silver + 0.01 s failure becomes silver + 100 s success for
  correct wax. Wrong wax, no wax and unfinished results still fail. Finite-time
  validation also rejects Infinity. Normal ski medal and best-time tests unchanged.
- `test-lab-player`: all six helicopter challenges now must pass (previously
  projectile/fire only reported). Require projectile <=180 s and fire <=290 s
  (a minute before the road at 350 s), plus correct-wax native completion.
- Browser `lab-polish`: remove the pendulum exception; all sixteen UI experiment
  goals now must finish. No other browser expectation is relaxed.

## Removed

Removed the broken numeric-select conversion, Lab-only silver-time failure,
old fixed-cell water-flight attempt and pendulum browser exception. No runtime
asset, ordinary ski scoring rule or saved-progress field is replaced.


## Checks and review

- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going --json`:
  58/60 passed, zero not run, 306.09 s. Both failures were sandbox FFmpeg
  startup permissions (`test-lab-radio`, `test-review-evidence`); the two-suite
  rerun with process access passed 2/2 in 7.65 s. All 60 selected suites are
  covered; no passing lane suite was repeated to repair that tool failure.
- The independent reviewer found splash feedback buried on shore misses.
  The final change attaches actual landing height in the existing session hook.
  `node --test tools/test-lab-challenges.mjs tools/test-lab-player.mjs
  tools/test-lab-snow.mjs` after that correction: 39/39 pass, 10.87 s.
  This also covers the added Infinity rejection. All sixteen model lessons,
  all six native helicopter challenges, G-force and correct-wax finish pass.
  Native projectile: 174.0 s, one scoop/four drops/three hits. Native fire:
  269.0 s, two scoops/four drops, extinguished 81 s before the unattended road.
- Final `npm.cmd run build`: pass, 1.01 s. The first build also passed (1.09 s);
  rebuilding was required by the later splash-height correction. Existing chunk
  size and dynamic-import advisories remain. PowerShell's npm script policy and
  the dependency junction's Vite temporary-file permission required using
  `npm.cmd` with process access; no game or dependency configuration changed.
- Replay fingerprints unchanged: 225 checks across 25 cases, 23 events,
  9 categories, three frame rates and three runs; combat replay 12 checks
  across four encounters. World composition 47 exact checks across twenty
  events. No replay or world pin changed.
- Independent review `review_lab_ease`: clear after confirmation of the
  shore-height fix and assertion inventory. Claude's card supplies the design
  decisions; this is a branch-only handoff, with no merge, push or release.
- Session status regenerated. Cockpit task T-052 names LAB-CHALLENGE-EASE and
  is synced from the board; the task remains In Progress until integration.

- Browser: `lab-view`, `lab-tune-view`, `lab-fan-view`, `lab-restore`,
  `lab-polish`, `ski-view`, `heli-first-flight`, `heli-finish`, `fire-view`:
  9/9 pass, zero warnings/errors, private ports, memory-only saves. All sixteen
  UI experiment goals pass, including Pendulum. The first seven pass reports
  came from the initial shared bundle. The last two ran on the final source
  with `HELI_FINISH_FRAMES=0 FIRE_VIEW_FRAMES=0`; no frame check is required for
  the dev-only Lab. The initial batch was stopped after seven completed passes
  to avoid its default release timing step; its unfinished heli-finish attempt
  is not counted. The two-scenario final batch passed 2/2.
- Board check: 183 pass. Repository placement and `git diff --check`: pass.
- Recycled generated lane build, both temporary QA bundles (one via its normal
  runner cleanup), the stopped private browser profile, consumed screenshots
  and superseded scratch logs. Retained the actual lane/rerun and final-check
  logs and scenario verdicts for the branch handoff. No runtime binary added.

The lane began before the review's final splash-height correction; the final
39-test challenge check and build cover that delta. The two final helicopter
browser scenarios also use the corrected source. Ordinary ski scoring,
physics, saves and world geometry are unchanged.
