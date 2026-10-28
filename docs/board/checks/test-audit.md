# Test audit (QA-TEST-AUDIT, 24 October 2026)

Every test suite, measured on `integration/wasteland` at `04770cec` in a cloud
Linux session (4 cores, full tier `--jobs 4`: 472 tasks in 36 minutes, 452
passed; the 20 that failed all need the laptop, listed below). Run times are
this machine's and only rough for the laptop. Failures cover 24 September to
24 October 2026, collected from the change notes (including deleted ones), the
run log, the night full-check reports, the cards and commit messages, and
counted once per incident.

## What the month shows

- 639 failure incidents in 30 days. **365 were pinned numbers moving on
  purpose** (a new car, a new switch, a release), 129 were new tests written
  red before their code, 78 were the tools or the machine, and **67 were real
  faults** found by 39 suites.
- One new car moved about 20 suites; each release moved 10 to 23. The
  biggest single causes: the full switch list pinned in two suites (23 edits
  each), the helicopter import allow-list (12), the circuit release list (10),
  the three sound bank snapshots (9, 8 and 4), the save fixture roster in
  three suites, the car count in six.
- 128 suites failed only on pins and never on a real fault. About 235 suites did
  not fail at all.
- Lane runs were slow because a change to any file reached by `game.js`,
  `app.js` or another hub pulled in every suite that builds a game: a lesson
  file selected 222 suites, `config.js` 387.

## Lane size: before and after

The last twenty merges into `integration/wasteland`, using the same changed
files. Time is the estimated wall time with `--jobs 4` from the run times
below (the laptop will differ, but in proportion). Every lane has a floor of
about 1.7 minutes: the smoke set and the replay and world guards.

| Merge | Card | Suites before | Suites after | Minutes before | Minutes after |
| --- | --- | ---: | ---: | ---: | ---: |
| 869421d6 | FIX-GRASS-GROUND note (docs) | 12 | 12 | 1.7 | 1.7 |
| e4c9e09c | DRIVE-LESSON-2 note (docs) | 11 | 11 | 1.7 | 1.7 |
| 55121fe9 | LAB-ART | 34 | 35 | 7.1 | 7.1 |
| 0d8abc1f | RESCUE-SUMMIT-ARRIVAL | 144 | 36 | 16.2 | 3.6 |
| 1508d596 | FIX-GRASS-GROUND | 127 | 80 | 10.8 | 8.4 |
| 0b6e47be | GP-RACECRAFT | 276 | 57 | 25.7 | 4.1 |
| 3fe9f179 | SKI-RULES | 274 | 37 | 25.7 | 3.3 |
| 2a62c87c | DRIVE-LESSON-2 | 235 | 27 | 21.2 | 2.2 |
| 62ecdd7a | DRIVE-LESSON-HUD | 47 | 46 | 4.6 | 3.9 |
| dc2b310e | GP-PASSING-2 design (docs) | 12 | 12 | 1.7 | 1.7 |
| 269f9fa9 | SIRENA-ART | 39 | 40 | 7.1 | 7.1 |
| 949eb246 | FIX-HELI-HOOK | 205 | 75 | 19.0 | 4.6 |
| 9037cb4f | RESCUE-SUMMIT-TUNE | 151 | 43 | 16.2 | 3.6 |
| 4eddb706 | EARN-CAR-3 | 406 | 101 | 30.5 | 8.4 |
| e9e05333 | DEEP-TRAIL | 29 | 28 | 2.1 | 2.1 |
| 660ffae7 | DRIVE-LESSON-HOOKS | 303 | 67 | 26.1 | 5.3 |
| a51559d1 | GP-PASSING-2, GP-WIDE-START, heli-skiing design (docs) | 14 | 14 | 1.7 | 1.7 |
| e94266b3 | Driving lessons 2 to 4 design (docs) | 15 | 15 | 1.7 | 1.7 |
| eae3775e | THE LAB design (docs) | 14 | 14 | 1.7 | 1.7 |
| 16f56280 | THE DEEP design (docs) | 14 | 14 | 1.7 | 1.7 |

A typical feature card now runs 30 to 80 suites in 2 to 8 minutes (target:
under 10). Single files: `game.js` 24 suites, `config.js` 31, a lesson screen
22. The save module `progression.js` still selects 169 suites on purpose: a
save change is the one place a wide lane is worth it (AGENTS rule 19).

## How the lane picks suites now

- A suite runs for a file it imports, a path it names, or a file one step
  further, as before.
- The extra step never passes through a **hub**: a module that imports 20 or
  more of the game's own files (`game.js`, `app.js`, `render3d.js`,
  `screen-router.js`, `world.js`, `sim-contacts.js`, `combat-weapons.js`,
  `progression.js`). Found from the code, not a list.
- The **shared files** (`game.js`, `main.js`, `render3d.js`, `app.js`,
  `config.js`, `feature-flags.js`) select only their owner suites
  (`feature-flags.js`: `test-feature-flags`, `test-preview-launcher`) and the
  suites that read them as text. The smoke set and the replay guards drive
  them in every lane; the night full tier runs every importer.
- Nine slow suites with no real catch run in the full tier only (below).

## Moved to the full tier only

Each took 90 seconds or more here and caught no real fault in 30 days. A card
whose claim needs one names it as its check and runs it with `--filter`.

| Suite | Seconds | Real | Pins |
| --- | ---: | ---: | ---: |
| test-campaigns | 1250 | 0 | 2 |
| test-expansion-driving | 322 | 0 | 0 |
| test-opponents | 241 | 0 | 1 |
| test-crossbow-aim | 167 | 0 | 0 |
| test-circuit-layouts | 122 | 0 | 10 |
| test-course-eligibility | 120 | 0 | 3 |
| test-ufo-landing | 117 | 0 | 0 |
| test-terrain | 116 | 0 | 1 |
| test-grand-prix-existing | 94 | 0 | 1 |

Kept in lanes although slow: `test-track-kits` (427 s, 5 real faults),
`test-arena-shove` (233 s, 1), `test-shortcuts` (123 s, 1), and the smoke set,
replay guards and the runner's own suite.

## Cannot run on Linux

These need the laptop (they are the 20 failures of the measured run, all
environment): Blender (`test-first-person-cloth`, `-contact`, `-polish`,
`test-rook-p2-candidate`, `test-rustwall-atlas-isolation`,
`test-rustwall-p2`, `test-rustwall-p2-relief`, `test-salt-flats-art`,
`test-vesper-art`), the art library on `C:` (`test-convoy-tanker-art`,
`test-p4-kits`, `test-salt-flats`, `test-tanker-valve-source`), the Windows
Recycle Bin (`test-course-kit`, `test-drive-through`, `test-earned-cars-ui`,
`test-medals`), `pwsh` (`test-full-check`), Chrome (`test-audio-crash-peak`)
and unsigned git commits (`test-compact-binaries`: the cloud signs its
commits).

## Every suite

Seconds: this machine, full tier. Real, Pins, Tools, Red first: failures in
the 30 days by kind (Red first: a new test failing before its code, as
intended). Where: when it runs now.

| Suite | Seconds | Real | Pins | Tools | Red first | Where | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| src/test.js | 102 | 0 | 2 | 0 | 0 | every lane |  |
| test-adaptive-resolution.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-ambient-shading.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-app-lifecycle.mjs | 1 | 0 | 0 | 1 | 1 | every lane |  |
| test-arena-ambush-alley.mjs | 13 | 0 | 1 | 1 | 1 | lane when affected |  |
| test-arena-bounty-hunt.mjs | 10 | 0 | 2 | 0 | 0 | lane when affected |  |
| test-arena-convoy.mjs | 5 | 0 | 2 | 0 | 0 | lane when affected |  |
| test-arena-event.mjs | 35 | 2 | 2 | 0 | 0 | lane when affected |  |
| test-arena-feel.mjs | 19 | 0 | 1 | 0 | 1 | lane when affected |  |
| test-arena-fuel-beacon.mjs | 1 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-arena-fuel-depot.mjs | 1 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-arena-fuel-run.mjs | 17 | 0 | 5 | 0 | 1 | lane when affected |  |
| test-arena-junk-respawn.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-arena-junk-shove.mjs | 9 | 1 | 2 | 0 | 1 | lane when affected |  |
| test-arena-pit-render.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-arena-pit.mjs | 10 | 1 | 3 | 0 | 1 | lane when affected | the one Scrapdome trace; no hash of the replay file |
| test-arena-props.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-arena-ramp-side.mjs | 5 | 1 | 1 | 0 | 1 | lane when affected |  |
| test-arena-settlement.mjs | 2 | 0 | 5 | 0 | 2 | lane when affected | roster count now "every fixture, none skipped" |
| test-arena-shove.mjs | 233 | 1 | 2 | 1 | 0 | lane when affected | kept in lanes: caught a real fault |
| test-arena-steering-ceiling.mjs | 8 | 1 | 0 | 0 | 1 | lane when affected |  |
| test-arena-steering.mjs | 7 | 1 | 0 | 0 | 0 | lane when affected |  |
| test-arena-tanker-feedback.mjs | 1 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-arena-ui.mjs | 2 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-arena-wall-fit.mjs | 2 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-arena-wreck-rate.mjs | 39 | 0 | 1 | 1 | 1 | lane when affected |  |
| test-armor-kit-assets.mjs | 1 | 0 | 2 | 0 | 0 | lane when affected | car count now "every car" |
| test-armor-kit-authored.mjs | <1 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-armor-kit-fit.mjs | 7 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-armor-kit-resource-lifecycle.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-armor-kit-visuals.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-armor-kits.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-armored-vehicle-impact.mjs | 5 | 0 | 2 | 0 | 0 | lane when affected |  |
| test-arsenal-audio-recorder.mjs | <1 | 0 | 0 | 0 | 0 | retired | retired: tests only the scenario recorder and its witness |
| test-arsenal-core-audio.mjs | 3 | 1 | 9 | 0 | 0 | lane when affected | bank, catalog and export snapshots removed (subsets of p4-audio and wave1) |
| test-arsenal-core.mjs | 11 | 0 | 3 | 0 | 2 | lane when affected |  |
| test-arsenal-runtime.mjs | 52 | 0 | 2 | 3 | 0 | lane when affected |  |
| test-arsenal-save.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-arsenal-wave1-audio.mjs | 9 | 1 | 8 | 1 | 1 | lane when affected | keeps the export and F1 voice pins; bank and catalog snapshots removed |
| test-arsenal-wave1.mjs | 34 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-arsenal-wave2-audio.mjs | 5 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-arsenal-wave2.mjs | 5 | 0 | 1 | 0 | 1 | lane when affected |  |
| test-arsenal-wave3-audio.mjs | 12 | 0 | 0 | 1 | 0 | lane when affected |  |
| test-arsenal-wave3.mjs | 14 | 0 | 1 | 1 | 0 | lane when affected |  |
| test-art-intake.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-art-sourcing.mjs | <1 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-audio-analysis.mjs | 1 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-audio-compression.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-audio-crash-meter.mjs | <1 | 0 | 0 | 0 | 0 | retired | retired: tests only the meter inside a browser scenario |
| test-audio-crash-peak.mjs | 4 | 0 | 1 | 10 | 1 | full tier only | cannot run on Linux: needs Chrome |
| test-audio-listening.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-audio-sourcing.mjs | <1 | 0 | 0 | 0 | 2 | lane when affected |  |
| test-audio-vehicles.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-audio.mjs | 22 | 1 | 0 | 6 | 4 | lane when affected |  |
| test-balance-targets.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-blender-output.mjs | 5 | 1 | 3 | 0 | 0 | lane when affected |  |
| test-board.mjs | <1 | 4 | 0 | 0 | 1 | lane when affected |  |
| test-boarding.mjs | 7 | 0 | 1 | 0 | 1 | lane when affected |  |
| test-bolide-vehicle.mjs | 6 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-bomb-momentum.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-browser-harness.mjs | <1 | 0 | 0 | 0 | 3 | lane when affected |  |
| test-browser-scenarios.mjs | <1 | 0 | 0 | 0 | 2 | lane when affected |  |
| test-build-status.mjs | 28 | 0 | 0 | 1 | 3 | lane when affected |  |
| test-build-update.mjs | <1 | 1 | 1 | 0 | 0 | lane when affected |  |
| test-busted-quit.mjs | 6 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-cactus-fall.mjs | 5 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-camera-clearance.mjs | 19 | 0 | 1 | 0 | 1 | lane when affected |  |
| test-camera-views.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-campaigns.mjs | 1250 | 0 | 2 | 0 | 0 | full tier only | full tier only: slowest suite, no real catch |
| test-car-loadout.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-career-archives.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-career-backup.mjs | 1 | 0 | 7 | 0 | 0 | lane when affected | roster count now "every fixture, none skipped" |
| test-career-budget-recovery.mjs | 2 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-career-budget.mjs | 4 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-checkpoint-gates.mjs | 15 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-checkpoint-integration.mjs | 6 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-checkpoint-recovery.mjs | 9 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-checkpoint-rush.mjs | 44 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-chicken-pool.mjs | 10 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-circuit-ardennes.mjs | 89 | 0 | 4 | 3 | 2 | lane when affected |  |
| test-circuit-barriers.mjs | 7 | 0 | 1 | 0 | 1 | lane when affected |  |
| test-circuit-ground.mjs | 26 | 1 | 1 | 0 | 1 | lane when affected |  |
| test-circuit-harbour.mjs | 3 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-circuit-layouts.mjs | 122 | 0 | 10 | 0 | 0 | full tier only | full tier only; release states and orders now read from the manifests |
| test-circuit-panorama-registry.mjs | <1 | 0 | 2 | 0 | 0 | lane when affected |  |
| test-circuit-panorama.mjs | 22 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-circuit-summit.mjs | 5 | 0 | 2 | 0 | 0 | lane when affected |  |
| test-circuit-tremblant-snow.mjs | 34 | 0 | 2 | 1 | 0 | lane when affected |  |
| test-circuit-tremblant.mjs | 35 | 0 | 2 | 0 | 0 | lane when affected |  |
| test-circuit-variants.mjs | 20 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-circuits.mjs | 45 | 1 | 3 | 0 | 0 | lane when affected |  |
| test-city-decoration-placement.mjs | 13 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-city-interiors.mjs | 4 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-city-parking-gameplay.mjs | 12 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-city-parking.mjs | 6 | 1 | 0 | 0 | 0 | lane when affected |  |
| test-city-pavement.mjs | 8 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-city-road-paint.mjs | 7 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-city-skyline.mjs | 15 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-classic-vehicles.mjs | 3 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-coach-markers.mjs | 2 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-collider-heights.mjs | 27 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-combat-armor-bomb-radius.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-combat-armor-hud.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-combat-armor-terrain.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-combat-armor.mjs | 4 | 0 | 3 | 0 | 0 | lane when affected |  |
| test-combat-audio.mjs | 20 | 1 | 0 | 0 | 1 | lane when affected |  |
| test-combat-balance.mjs | 40 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-combat-brain.mjs | 2 | 0 | 2 | 0 | 0 | lane when affected |  |
| test-combat-credit-bonus.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-combat-effects.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-combat-field-shields.mjs | 4 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-combat-hud.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-combat-knockaway.mjs | 7 | 1 | 2 | 0 | 0 | lane when affected |  |
| test-combat-modules.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-combat-opponents.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-combat-payoff.mjs | 24 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-combat-pickups2.mjs | 5 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-combat-projectile-order.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-combat-projectiles.mjs | 6 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-combat-ramming.mjs | 5 | 0 | 2 | 0 | 0 | lane when affected |  |
| test-combat-replays.mjs | 4 | 0 | 2 | 0 | 0 | every lane |  |
| test-combat-scoring.mjs | 5 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-combat-vehicle-wear.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-combat.mjs | 10 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-compact-binaries.mjs | 20 | 0 | 0 | 3 | 0 | lane when affected | cannot run on Linux: the cloud signs its git commits |
| test-completion-screen.mjs | 7 | 1 | 0 | 0 | 0 | lane when affected |  |
| test-contact-damage.mjs | 5 | 1 | 0 | 0 | 0 | lane when affected |  |
| test-controls-help.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-convoy-tanker-art.mjs | <1 | 0 | 1 | 1 | 1 | full tier only | cannot run on Linux: needs the art library on C: |
| test-course-access-ui.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-course-access.mjs | 2 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-course-car-choice.mjs | 69 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-course-closures.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-course-eligibility.mjs | 120 | 0 | 3 | 1 | 0 | full tier only | full tier only |
| test-course-kit.mjs | 18 | 0 | 4 | 5 | 3 | lane when affected, laptop | cannot run on Linux: needs the Windows Recycle Bin |
| test-course-landmarks.mjs | 23 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-course-nearest.mjs | 78 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-course-preview.mjs | 12 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-cpu-combat.mjs | 22 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-cpu-crews.mjs | 38 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-cpu-pickups.mjs | 2 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-cpu-ufo.mjs | 8 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-crash-hollow-audio.mjs | <1 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-crash-presentation.mjs | 3 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-crash-site.mjs | 18 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-crash-slide.mjs | 5 | 0 | 1 | 0 | 1 | lane when affected |  |
| test-crash-switch-remove.mjs | 10 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-crew-fighters.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-crew-gear-modules.mjs | 3 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-crew-gear.mjs | 11 | 0 | 2 | 0 | 0 | lane when affected |  |
| test-crew.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-crossbow-aim.mjs | 167 | 0 | 0 | 0 | 0 | full tier only | full tier only |
| test-crossbow-race.mjs | 9 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-deep-audio.mjs | 3 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-deep-kelp-coast.mjs | 14 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-deep-look-zone.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-deep-look.mjs | 1 | 0 | 5 | 0 | 0 | lane when affected |  |
| test-deep-ramp.mjs | 8 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-deep-save.mjs | 2 | 0 | 2 | 1 | 0 | lane when affected |  |
| test-deep-surface.mjs | 34 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-deep-zone-format.mjs | <1 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-deep-zone.mjs | 13 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-desert-detail.mjs | 68 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-direct-color-output.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-drift-integration.mjs | 6 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-drift-leaderboard.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-drift-scoring.mjs | 10 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-drift-trial.mjs | 18 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-drive-lesson-2.mjs | - | 0 | 0 | 0 | 0 | lane when affected | new since the measured run |
| test-drive-lesson-lines.mjs | <1 | 1 | 0 | 0 | 0 | lane when affected |  |
| test-drive-lesson-run.mjs | 3 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-drive-lesson-save.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-drive-lessons.mjs | 51 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-drive-through.mjs | 38 | 0 | 0 | 5 | 0 | lane when affected, laptop | cannot run on Linux: needs the Windows Recycle Bin |
| test-driver-driving.mjs | 7 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-driver-ui.mjs | 1 | 1 | 0 | 0 | 0 | lane when affected |  |
| test-drivers.mjs | 3 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-driving-rewards.mjs | 3 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-dustmonger.mjs | <1 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-earned-cars-ui.mjs | 2 | 0 | 3 | 4 | 0 | lane when affected, laptop | cannot run on Linux: needs the Windows Recycle Bin |
| test-effects-contact-demand.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-effects-idle.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-effects.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-enemy-aim.mjs | <1 | 0 | 3 | 0 | 0 | lane when affected |  |
| test-enzo-vehicle.mjs | 4 | 0 | 1 | 0 | 1 | lane when affected |  |
| test-expansion-driving.mjs | 322 | 0 | 0 | 0 | 0 | full tier only | full tier only |
| test-expansion-geometry.mjs | 6 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-expansion-vegetation-grounding.mjs | 44 | 0 | 1 | 1 | 0 | lane when affected |  |
| test-explosion-mode-isolation.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-explosion-paused-start.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-feature-flags.mjs | <1 | 0 | 23 | 0 | 1 | lane when affected | the one full switch list |
| test-feel-lab.mjs | 9 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-fight-voices.mjs | 6 | 0 | 3 | 1 | 1 | lane when affected | ordinary race now compared switch on against off |
| test-fighter-presentation.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-fire-close.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-fire-view.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-first-person-cloth.mjs | 1 | 0 | 0 | 0 | 0 | full tier only | cannot run on Linux: needs Blender |
| test-first-person-contact.mjs | <1 | 0 | 0 | 0 | 0 | full tier only | cannot run on Linux: needs Blender |
| test-first-person-gear.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-first-person-polish.mjs | 3 | 0 | 0 | 0 | 0 | full tier only | cannot run on Linux: needs Blender |
| test-first-person-presentation.mjs | <1 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-frame-metrics.mjs | <1 | 1 | 1 | 0 | 0 | lane when affected |  |
| test-freestyle-course.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-fuel-car-attribution.mjs | 3 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-fuel-standing-carrier.mjs | 2 | 0 | 1 | 0 | 1 | lane when affected |  |
| test-full-check.mjs | 2 | 0 | 1 | 2 | 3 | lane when affected, laptop | cannot run on Linux: needs pwsh |
| test-gamepad-weapons.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-gatekeeper-audio.mjs | <1 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-ghost-terrain.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-ghost-vehicle.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-ghost.mjs | 11 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-grand-prix-career-menu.mjs | <1 | 0 | 1 | 0 | 1 | lane when affected |  |
| test-grand-prix-career.mjs | 17 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-grand-prix-cups.mjs | 79 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-grand-prix-existing.mjs | 94 | 0 | 1 | 0 | 0 | full tier only | full tier only |
| test-grand-prix-podiums.mjs | 5 | 0 | 2 | 0 | 0 | lane when affected |  |
| test-grass-ground.mjs | - | 0 | 0 | 0 | 0 | lane when affected | new since the measured run |
| test-harbor-batches.mjs | 5 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-harbor-detail.mjs | 4 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-heli-audio.mjs | 20 | 0 | 4 | 0 | 0 | lane when affected |  |
| test-heli-autopilot-rescue.mjs | 50 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-heli-bucket.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-heli-cable.mjs | 1 | 0 | 3 | 0 | 0 | lane when affected |  |
| test-heli-fire-session.mjs | 28 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-heli-fire.mjs | 5 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-heli-flight.mjs | 3 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-heli-hook-window.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-heli-hooks.mjs | 6 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-heli-jobs.mjs | 7 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-heli-lesson-core.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-heli-lessons.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-heli-missions.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-heli-mode.mjs | 8 | 1 | 12 | 0 | 0 | lane when affected | import allow-list replaced by a rule |
| test-heli-rescue-session.mjs | 56 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-heli-rescue-view.mjs | 8 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-heli-rescue.mjs | 1 | 0 | 2 | 0 | 0 | lane when affected |  |
| test-heli-save.mjs | <1 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-heli-search.mjs | 12 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-heli-skin-gear.mjs | 1 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-heli-skin-session.mjs | 79 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-heli-skins.mjs | <1 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-heli-summit-arrival.mjs | - | 0 | 0 | 0 | 0 | lane when affected | new since the measured run |
| test-heli-summit-rescues.mjs | 60 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-heli-summit-tune.mjs | 68 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-heli-survey.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-heli-view.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-heritage-driving.mjs | 13 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-hidden-road-departure.mjs | 3 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-hidden-road-discovery.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-hidden-road-hints.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-hidden-road-journey.mjs | 7 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-hidden-road-presentation.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-hidden-road.mjs | 19 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-input-contexts.mjs | <1 | 0 | 2 | 0 | 0 | lane when affected |  |
| test-integrate-lane.mjs | 6 | 0 | 0 | 1 | 1 | lane when affected |  |
| test-intel-levels.mjs | 40 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-jump-distance.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-jump-height-hud.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-jump-height.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-kerb-normals.mjs | 1 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-kettle-kingpin.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-keyboard-steering.mjs | 8 | 0 | 1 | 0 | 1 | lane when affected |  |
| test-koenigsegg-driver.mjs | 6 | 0 | 2 | 0 | 0 | lane when affected |  |
| test-koenigsegg-driving.mjs | 45 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-koenigsegg-progression.mjs | 2 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-koenigsegg-ui.mjs | <1 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-koenigsegg-vehicle.mjs | 5 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-lab-art.mjs | - | 0 | 0 | 0 | 0 | lane when affected | new since the measured run |
| test-landscape-cells.mjs | 9 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-lap-choice.mjs | 16 | 0 | 1 | 0 | 1 | lane when affected |  |
| test-lap-telemetry.mjs | 10 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-launcher-port.mjs | 1 | 0 | 0 | 2 | 0 | lane when affected |  |
| test-launcher-test-listen.mjs | <1 | 0 | 0 | 0 | 1 | retired | retired: tests only a helper of test-launcher-port, which still uses it |
| test-layout-archives.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-light-path.mjs | 8 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-lighting-integration.mjs | 11 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-lighting-moods.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-local-lighting.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-madmax-crash.mjs | 5 | 0 | 1 | 0 | 1 | lane when affected |  |
| test-madmax-solid.mjs | 4 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-mclaren-f1-vehicle.mjs | 4 | 1 | 0 | 0 | 0 | lane when affected |  |
| test-meadow-material.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-medals.mjs | 2 | 0 | 2 | 3 | 0 | lane when affected, laptop | cannot run on Linux: needs the Windows Recycle Bin |
| test-milestones.mjs | 4 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-mirage.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-mountain-landscape.mjs | 21 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-mountain-support.mjs | 4 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-muddy-hollow-scene.mjs | 17 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-muddy-hollow.mjs | 21 | 0 | 3 | 0 | 1 | lane when affected |  |
| test-notoriety-feedback.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-notoriety.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-npc-route.mjs | 33 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-npc-vehicle-damage.mjs | 5 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-npc-yielding.mjs | 12 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-offroad-physics.mjs | 16 | 0 | 2 | 0 | 0 | lane when affected |  |
| test-old-best.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-onfoot-camera-choice.mjs | 5 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-onfoot-car-contacts.mjs | 6 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-onfoot-controls-camera.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-onfoot-figures.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-onfoot-hints.mjs | 6 | 3 | 1 | 0 | 1 | lane when affected |  |
| test-onfoot-race.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-onfoot-screen-directions.mjs | <1 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-onfoot-transition.mjs | 3 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-onfoot-weapons.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-onfoot.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-opponents.mjs | 241 | 0 | 1 | 0 | 0 | full tier only | full tier only |
| test-p4-audio.mjs | 8 | 1 | 4 | 0 | 1 | lane when affected | the one sound bank and catalog snapshot |
| test-p4-kits.mjs | <1 | 0 | 2 | 0 | 0 | lane when affected | cannot run on Linux: needs the art library on C: |
| test-p4-listening.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-pacific-coast.mjs | 23 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-paint-integration.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-paint-presets.mjs | <1 | 0 | 2 | 0 | 0 | lane when affected |  |
| test-performance-review.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-phase-diagnostics.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-physics-expansion.mjs | 3 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-pine-material.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-pit-lane.mjs | 12 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-playground-rivals.mjs | 7 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-police-fines.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-police-knock.mjs | 3 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-police-route-reset.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-polish-arena.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-polish-flame.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-polish-smoke.mjs | <1 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-polyline-index.mjs | 33 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-polyline-terrain-integration.mjs | 13 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-practice-map.mjs | 4 | 0 | 1 | 0 | 1 | lane when affected |  |
| test-prepared-surface.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-preview-launcher.mjs | <1 | 10 | 6 | 0 | 2 | lane when affected |  |
| test-profile-damaged-fields.mjs | <1 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-progression-integration.mjs | 5 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-progression.mjs | 1 | 0 | 2 | 0 | 0 | every lane | car total now "every car has a way to be earned" |
| test-qa-storage.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-qualifying.mjs | 9 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-race-exit-rejoin.mjs | 2 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-race-field.mjs | 14 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-race-integrity.mjs | 19 | 0 | 0 | 0 | 0 | every lane |  |
| test-race-settings.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-race-surfaces.mjs | 11 | 1 | 0 | 0 | 1 | lane when affected |  |
| test-raiders.mjs | 8 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-rally-checkpoint.mjs | 2 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-rally-detail.mjs | 20 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-rally-shortcut-air.mjs | 2 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-rear-view.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-reference-laps.mjs | 16 | 1 | 5 | 0 | 0 | lane when affected |  |
| test-release-tremblant.mjs | <1 | 0 | 5 | 0 | 0 | lane when affected |  |
| test-render-profile.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-render-quality.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-render-readiness-ui.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-render-readiness.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-render-reuse.mjs | 4 | 0 | 0 | 1 | 0 | lane when affected |  |
| test-render-warmup-key.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-render-warmup-passes.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-render-warmup.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-replays.mjs | 101 | 0 | 3 | 0 | 0 | every lane | the one race replay reference |
| test-repo-audit-scope.mjs | 1 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-repo-hygiene-rules.mjs | 2 | 0 | 0 | 2 | 0 | lane when affected |  |
| test-repo-hygiene.mjs | <1 | 8 | 1 | 0 | 0 | every lane |  |
| test-reverse-presentation.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-reverse.mjs | 6 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-review-evidence.mjs | 6 | 3 | 7 | 1 | 0 | lane when affected |  |
| test-rigged-fighter.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-road-furniture.mjs | 62 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-road-powerups.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-road-surface.mjs | 24 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-roadside-destruction.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-roadside-visuals.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-rocket-fighter-contacts.mjs | 1 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-rook-p2-candidate.mjs | 4 | 0 | 0 | 0 | 0 | full tier only | cannot run on Linux: needs Blender |
| test-rook-p2-review.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-rook-p2-source.mjs | <1 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-route-map.mjs | 21 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-route-variants-integration.mjs | 33 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-route-variants.mjs | 30 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-runtime-art-sources.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-rustwall-assets.mjs | 1 | 0 | 1 | 1 | 0 | lane when affected |  |
| test-rustwall-atlas-isolation.mjs | <1 | 0 | 0 | 0 | 1 | full tier only | cannot run on Linux: needs Blender |
| test-rustwall-baseline.mjs | <1 | 0 | 0 | 0 | 1 | retired | retired: pins only the inputs of test-rustwall-frame |
| test-rustwall-frame.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-rustwall-p2-relief.mjs | 1 | 1 | 0 | 0 | 0 | full tier only | cannot run on Linux: needs Blender |
| test-rustwall-p2-sheet.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-rustwall-p2.mjs | 2 | 0 | 0 | 1 | 1 | full tier only | cannot run on Linux: needs Blender |
| test-rustwall-scene.mjs | 4 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-sal-art.mjs | <1 | 0 | 1 | 0 | 1 | lane when affected |  |
| test-sal-fight.mjs | 4 | 0 | 0 | 0 | 1 | lane when affected | ordinary-race copy removed |
| test-salt-flats-art.mjs | 2 | 0 | 0 | 3 | 0 | lane when affected, laptop | cannot run on Linux: needs Blender |
| test-salt-flats-effects.mjs | 3 | 0 | 0 | 1 | 0 | lane when affected |  |
| test-salt-flats-output.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-salt-flats-render.mjs | 5 | 0 | 0 | 1 | 0 | lane when affected |  |
| test-salt-flats.mjs | 1 | 0 | 3 | 2 | 0 | lane when affected, laptop | Scrapdome trace check removed (copy of test-arena-pit); cannot run on Linux: needs the art library on C: and Blender |
| test-save-fixtures.mjs | <1 | 0 | 4 | 0 | 0 | lane when affected | the one save fixture roster count |
| test-scene-lighting.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-scene-presentation.mjs | <1 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-scene-systems.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-scenery-batches.mjs | 24 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-scrapdome-yard-assets.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-scrapdome-yard.mjs | 2 | 1 | 0 | 0 | 1 | lane when affected |  |
| test-seeker-balance.mjs | 3 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-seeker-rockets.mjs | <1 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-shortcut-presets.mjs | 8 | 0 | 7 | 0 | 0 | lane when affected | freshness hash covers only solver code |
| test-shortcuts.mjs | 123 | 1 | 1 | 0 | 0 | lane when affected | kept in lanes: caught a real fault |
| test-side-saws.mjs | 5 | 0 | 1 | 0 | 1 | lane when affected | ordinary-race copy removed |
| test-sirena-vehicle.mjs | 7 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-ski-physics.mjs | - | 0 | 0 | 0 | 0 | lane when affected | new since the measured run |
| test-snow-world.mjs | 7 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-snowmen.mjs | 17 | 0 | 1 | 0 | 1 | lane when affected |  |
| test-sound-bank.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-speed-format.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-storage-budget.mjs | 2 | 0 | 3 | 0 | 0 | lane when affected |  |
| test-stunt-trial.mjs | 4 | 1 | 0 | 0 | 0 | lane when affected |  |
| test-summit-attack.mjs | 11 | 0 | 2 | 0 | 0 | lane when affected |  |
| test-summit-avalanche.mjs | 12 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-tanker-valve-source.mjs | <1 | 0 | 2 | 0 | 1 | lane when affected | cannot run on Linux: needs the art library on C: |
| test-team-room-views.mjs | 10 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-terrain-bounce.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-terrain-style.mjs | 15 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-terrain.mjs | 116 | 0 | 1 | 0 | 0 | full tier only | full tier only |
| test-territory-screen.mjs | <1 | 0 | 2 | 0 | 0 | lane when affected |  |
| test-territory-ui.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-test-driver-braking.mjs | 11 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-test-runner.mjs | 92 | 0 | 0 | 0 | 2 | every lane | kept (Claude): decides what runs |
| test-titan-climb.mjs | 1 | 0 | 3 | 1 | 1 | lane when affected |  |
| test-titan-handling.mjs | 4 | 1 | 1 | 0 | 1 | lane when affected |  |
| test-track-analysis.mjs | 25 | 0 | 4 | 0 | 0 | lane when affected |  |
| test-track-kits.mjs | 427 | 5 | 0 | 0 | 2 | lane when affected | kept in lanes: slow but caught 5 real faults |
| test-track-review.mjs | 2 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-track-script.mjs | 22 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-traffic-shield.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-tunnel-detail.mjs | 31 | 1 | 0 | 0 | 0 | lane when affected |  |
| test-turn-sign-cells.mjs | 22 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-twin-vultures.mjs | 3 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-tyre-slip.mjs | 35 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-ufo-landing.mjs | 117 | 0 | 0 | 0 | 0 | full tier only | full tier only |
| test-vegetation-cells.mjs | 6 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-vehicle-assets.mjs | 18 | 0 | 2 | 0 | 0 | lane when affected | the one car roster count |
| test-vehicle-collision.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-vehicle-crush-graphics.mjs | 9 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-vehicle-grounding.mjs | 39 | 0 | 2 | 0 | 0 | lane when affected | car count now "every car" |
| test-vehicle-knock-integration.mjs | 3 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-vehicle-paint.mjs | 20 | 0 | 2 | 0 | 0 | lane when affected | car count now "every car" |
| test-vehicle-projection.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-vehicle-sockets.mjs | 7 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-vesper-art.mjs | 2 | 0 | 1 | 2 | 0 | lane when affected | cannot run on Linux: needs Blender |
| test-vesper-gear.mjs | 4 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-voice-candidates.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-warlord-blackiron.mjs | 4 | 0 | 1 | 0 | 0 | lane when affected |  |
| test-warlord-cards.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-warlord-format.mjs | 5 | 0 | 1 | 0 | 1 | lane when affected | the one ordinary-race fingerprint check for these inputs |
| test-warlord-gunn-art.mjs | 3 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-warlord-gunn.mjs | 3 | 0 | 1 | 0 | 1 | lane when affected |  |
| test-warlord-hooks.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-warlord-pay.mjs | 3 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-warlord-settlement.mjs | 5 | 0 | 2 | 0 | 1 | lane when affected |  |
| test-warlord-tollkeeper.mjs | 5 | 0 | 2 | 0 | 0 | lane when affected |  |
| test-warlords.mjs | <1 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-wasteland-beta.mjs | <1 | 0 | 23 | 0 | 0 | lane when affected | checks only the Wasteland switches, not the full list |
| test-wasteland-career.mjs | <1 | 0 | 0 | 0 | 1 | lane when affected |  |
| test-wasteland-easter-egg.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-wasteland-police-off.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-wasteland-profile.mjs | 1 | 0 | 2 | 0 | 1 | lane when affected |  |
| test-wasteland-results.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-weapon-audio-waveforms.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-weapon-audio.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-weapon-upgrades.mjs | <1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-wildlife.mjs | 10 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-world-composition.mjs | 55 | 0 | 8 | 0 | 0 | every lane | the one world signature reference |
| test-yard-ground-render.mjs | 1 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-yard-home.mjs | 2 | 0 | 0 | 0 | 0 | lane when affected |  |
| test-yeti.mjs | 18 | 0 | 1 | 0 | 1 | lane when affected |  |
