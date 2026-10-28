# LAB-POLISH

Task: LAB-POLISH. Kind: UI and player check. Switch: `lab`, still dev.

## Design settled before code

Frame the working height of each bench, with closer camera candidates and a
wide sightline check for foreground obstructions. The lift view faces its
instruments from the door side, rather than looking across the floor grate.
Keep the room models and every lesson and challenge threshold unchanged.

Use fixed, rounded dial settings through the screen for all sixteen benches.
Record actual screen time until their readouts show the effect. Use native
simulation controls for the flying, driving and skiing challenges; report
failures honestly rather than giving the script a passing state. Existing Lab
browser scenarios, the lane tier and build remain required.

## Player pass

`node --test tools/test-lab-player.mjs` drives all sixteen bench models and
each challenge with ordinary controls. The flying stick is rounded to tenths
and read four times a second. The driving check uses the existing line driver
at 90% skill. Ski controls are rounded and read five times a second. No
positions, challenge verdicts, water patches or race results are injected.

The browser recipe `lab-polish` runs the same dial settings through the UI.
Times below are automated seconds from opening the bench to the picture,
including a 2.5 s camera glide, so they bound time to see the readout's effect.
They are not estimates of a child's reading or thinking time. All are below
the two-minute target. Sixteen model goals pass; fifteen UI goals pass.

| Lesson | Effect visible by (s) | Simple challenge play |
| --- | ---: | --- |
| Lift | 2.9 | Pass, 22.4 s with Dusthawk |
| Projectile | 2.8 | Flag: 688.3 s attempt, full bucket, zero buoy hits |
| Fire | 2.8 | Flag: road reached at 150 s; scoop filled to 600 L |
| Pendulum | 2.8 | Flying challenge passes in 89.3 s; UI experiment blocked (below) |
| Altitude | 2.8 | Pass, 200.6 s including cruise to Summit Run |
| Strength | 2.8 | Pass: carbon fibre arm, 55 mm, rather than the exact optimum |
| Rust | 2.8 | Pass: zinc underbody and armour; bare dry exhaust |
| G-force | 2.9 | Pass: three corners on a native 94.4 s Woods lap |
| Headings | 3.4 | Pass: rounded map reading; smoke flight 49.6 s |
| Grip | 3.2 | Pass on bench with tuning dev switch |
| Downforce | 2.8 | Pass on bench with tuning dev switch |
| Braking | 2.8 | Pass on bench with tuning dev switch |
| Suspension | 3.3 | Pass on bench with tuning dev switch |
| Fuel | 2.9 | Pass on bench with tuning dev switch |
| Launch | 2.8 | Pass: 45 degrees, 17 m/s, 29.46 m (not dead centre) |
| Wax | 2.8 | Flag: finished in 198.3 s with 33 missed gates; no pass |

**Follow-ups for Director:** Pendulum's numeric select values arrive as strings
from the DOM and reset to 5 m, so the UI never records three lengths. Its
model and native flying challenge work. Water aiming, fire-trip pacing and
slalom control need a separate player/controller check before deciding
whether any threshold should change. These failed simple attempts are flags,
not evidence that the existing thresholds are wrong. No threshold changed.
The player suite asserts the successful native challenges; its green result
does **not** mean the flagged challenges passed.

## Checks and picture sheet

- Player script: 3/3 test groups pass, with the failed simple-play attempts
  explicitly reported above. Selected Lab radio checks: 791 pass.
- Lane: `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going
  --json`, source `d8dac1b1`: 64/65 pass, zero not run, 260.7 s. The sole failure
  was the sheet filename `benches.jpg`, which the placement rule treats as a
  raw capture. Renamed to the allowed `look-1.jpg`; unchanged
  `node tools/test-repo-hygiene.mjs` then passes. All 65 selected suites are
  covered without rerunning the passing 64. Original result: ignored
  `.evidence/2026-10-25/LAB-POLISH/lane.log`.
- `npm run build`: pass, 1.12 s (existing large-chunk advisory).
- Browser: `lab-view`, `lab-tune-view`, `lab-fan-view`, `lab-restore` and
  `lab-polish` pass, zero warnings/errors. Private ports, memory-only saves.
- Replay guard: 225 checks across 25 cases, 23 events, 9 categories, three
  frame rates and three runs. Combat replay guard: 12 checks across four
  encounters. World composition: 47 exact checks across twenty events.
  All pins unchanged; no race rules changed.
- Independent review: `review_lab_polish` confirmed fixes and final picture;
  no remaining code defects. Its findings corrected the script's impossible
  bucket-fill target, the distant lift view, and the duplicate wax transcript.
- Board check: 186 pass. Cockpit task `T-051` now names LAB-POLISH; the board
  sync sets its status. Session status regenerated.

After the gate, only notes, status and the sheet name/current picture changed.
No passing game check was repeated. This is a branch handoff, not a release.

Picture recipe: `python tools/art/lab-polish-sheet.py <lab-polish output>
docs/board/looks/lab-polish/look-1.jpg`. One sheet, all sixteen views,
under 500 KB. Cameras only; no model, texture, sound or world signature changed.
No frame check for this dev-only room.

## Changed assertions

The existing exact-caption comparison now expects the clarified wax line
from LAB.md. The catalog comparison for `lab.brian.wax.explain` still pins its
original spoken words, as the card expressly permits retaining that take.
An optional `spokenText` field lets the voice-copy recipe validate that old
take honestly. New checks allow that field only on this one line and pin its
words. Every recording hash, runtime byte comparison, voice, setting, cue,
count and budget assertion stays intact. No tolerance or threshold loosened.
New player-pass coverage is requested by the card.

Claude's written assertion review is required before integration (AGENTS 18);
this branch is committed only, as Kyle requested.

## Removed

Replaced the distant, low bench camera framing and the old wax caption.
No runtime asset, recorded voice or challenge threshold is replaced.
Consumed raw screenshots, temporary QA bundles/scripts and the local build
are recycled; the one current sheet, review verdict and handoff logs remain.
