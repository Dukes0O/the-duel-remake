# NISSAN-SKYLINE-GTR-R34-V4

## Changed

Appended the packet's Skyline handling entry behind the startup
`nissan-skyline` dev switch. Speed 205 mph, acceleration 8.4, grip 1.08,
braking 1.12, six gears [55, 95, 133, 167, 190, 205], mass 1,560 kg.
Off-road values, collision size, height and colours match packet 2.2.
No price yet: it cannot be bought. V6 owns the shop work.

The engine fitter produced base scale .601 and upgraded scales .598, .596,
and {scale: .613, power: .276}. Base and levels 1 and 2 use power .31.
Worst mark errors reported by the fitter: base .8%, level 1 .7%, level 2
1.0%, level 3 .4%. The fit row follows the same startup dev switch.
Recipe: use `tools/fit-engine-curve.mjs` unchanged except restricting its
car loop to `nissan_skyline_gtr_r34`, enable the QA `nissan-skyline` switch
before module import, and copy only its printed Skyline row. Do not use
`--write`, which would replace the other rows.

Only `awd: true` gets .93 graded-gravel grip and the 1.06 packed/deep-snow
multiplier. Other cars retain exact surface values, including the 959-S.
The Skyline is excluded from completion so the Jesko still needs eight cars.
ROAD_CLASS includes it; ROAD_CARS stays exact. Kestrel One cannot lift it,
so it never enters the helicopter customer pool.

With the switch off, CARS still has fourteen cars. With it on, the appended
Skyline makes fifteen. Only this addition changes the dev roster count.
The dev preview loads an existing 959-S body. This is a handling stand-in,
not finished Skyline art. V3 must replace the `skyline-preview` asset route.
V6 must add the price and final garage wiring.

## Pace

Game `performanceIndex`, base figures, higher means quicker:

| Circuit | Aurora | Skyline | Viper | Above Aurora | Below Viper |
| --- | ---: | ---: | ---: | ---: | ---: |
| Tremblant Woods | 138.449373 | 140.651005 | 146.363654 | 1.590% | 3.903% |
| Panorama Ridge | 127.240261 | 129.415324 | 134.255404 | 1.709% | 3.605% |
| Ardennes Forest | 126.064693 | 128.574155 | 133.293164 | 1.991% | 3.540% |
| Harbour Lights | 119.908213 | 122.619592 | 126.691416 | 2.261% | 3.214% |

All four meet the packet's 1 to 3% above Aurora and 3 to 5% below Viper bands.

## Checks

- `node tools/test-skyline-handling.mjs`: PASS. Includes a fresh-process dev
  preview, exact previous config hash, every old car on every surface and
  tyre, four pace bands, field pool, Jesko total, lift, no buy and donor load.
- Engine fit: PASS. All twenty marks (60, 100, 140, 170 and 190 mph at
  levels 0 to 3) are within the unchanged 2% acceleration bound.
- Feature-switch suite: PASS, 125 checks.
- Required lane command, PowerShell, jobs 2: first run stopped at 103 passed,
  1 failed, 131 not run (824.85 s). The only failure was the temporary Git
  copy test in `test-full-check`, because the sandbox denied spawning
  PowerShell 7 (`spawnSync pwsh EACCES`). Its exact focused diagnostic
  reproduced the denial. No game or test code changed.
- `node tools/test-full-check.mjs` outside the sandbox: PASS, 46/46 (6.28 s).
  These are tool fixtures, not actual frame measurements. The remaining
  131 suites run as a filtered lane continuation with jobs 2; passing
  suites from the first run are not repeated.
- The one-minute capacity check found a foreign browser started just before
  that continuation, taking the laptop to three heavy roots. Stopped only
  this newest gate and its children. Six suites passed before the stop:
  ghost-save-message, ghost-terrain, grand-prix-career-menu,
  grand-prix-career, grand-prix-podiums, heli-autopilot-rescue.
  The interrupted cups and fire-session checks need to run again; completed
  passes do not. Remaining 125 suites and build pending.
- Continuation found one real integration hook missing:
  `test-preview-launcher` requires every current dev switch in the private
  preview URL. Proposed fix: append `,nissan-skyline` to PREVIEW_FLAGS in
  `start-preview.bat`, after `engine-curve,lab-2`. This changes no test.
  That file is outside V4's packet ownership. Requested the Director's
  scope extension under AGENTS' owned-files rule; no launcher edit yet.
- Final continuation: 124 passed, 1 failed, zero not run (756.50 s).
  Across retained results, all 235 planned suites are covered: 234 PASS,
  only preview-launcher FAIL for the missing dev flag. Replay guard PASS:
  225 checks, 25 cases, 23 events, nine categories, three FPS values and
  three runs. World composition and exact world-build guards PASS.
- First `npm run build` could not find `vite`: the linked dependency tree
  has `vite/bin/vite.js` but no `.bin/vite.cmd`. Prepared a temporary
  lane-local PATH shim to that existing CLI, using its native config loader
  so it creates no config-loader temporary file in shared dependencies.
  No dependency or package-script change.
- `npm run build` with that temporary PATH shim: PASS, 599 modules, Vite
  build 1.38 s (command 2.12 s). Existing chunk-size and mixed-import
  warnings remain. Build output and shim recycled after recording results.
- STATUS refreshed in this lane only. Other lane inspections skipped;
  no live-folder check, merge, push or Cockpit write from this lane.
- Independent code and numbers review: CLEAR, including the fit row,
  twenty launch checks and change note. No defects found.
- No browser or frame measurement applies to this headless handling stage.
  Tests use memory-only storage. No player save was read or written.

## Changed assertions

`tools/test-feature-flags.mjs`: exact non-course switch count 41 to 42,
solely for `nissan-skyline`; also require that switch to be `dev`.
The independent review found no loosened assertion. Claude's written
assertion review remains required before integration under AGENTS rule 18.
No existing car-count assertion or replay fingerprint was changed.
The first lane run passed the released road full-state fingerprints and
combat replay fingerprints (12 checks across four encounters). Final replay
and world-signature guards passed unchanged.

## Preview launcher continuation (28 October 2026)

Claude approved the scope extension in Kyle's continuation brief. Added
`nissan-skyline` to `start-preview.bat`'s explicit non-course flag list,
exactly like the existing dev cars. The generated list in
`tools/preview-flags.mjs` contains course flags only and needs no change.
The existing preview entry still installs memory-only saves before startup.

- `node tools/test-preview-launcher.mjs`: PASS, 23 checks, zero failures.
- `node tools/run-tests.mjs --tier lane --changed --jobs 2 --keep-going`
  from PowerShell: PASS, 238/238, zero failed or not run, 1354.41 s.
  This covers all previous 235 suites plus the launcher change's additional
  selected suites. Skyline handling, engine curve, feature flags, preview
  launcher, replay guard and exact world guards all pass. No fingerprint
  or signature changed.
- `npm run build`: PASS, 599 modules, Vite build 1.06 s. The linked
  dependencies still lack `.bin/vite.cmd`, so a temporary lane-local PATH
  shim invokes the installed Vite CLI with its native config loader.
  No dependency or package-script change. Existing chunk-size and mixed-import
  warnings remain. The shim and generated build output were recycled.
- STATUS refreshed in this lane with all other lane inspections skipped.
  No live-folder inspection, browser scenario, frame measurement, merge,
  push or Cockpit write. Tests use memory-only saves.

No assertions changed in this continuation. The earlier exact switch-count
change from 41 to 42 is solely the new car's `nissan-skyline` switch. The
added dev-state assertion names that switch. Neither change relaxes a check.
Claude's written assertion review remains pending before integration.
No merge or push was performed.

## Removed

Nothing replaced in the released game. The temporary dev donor is removed
by V3 when the accepted body is registered. Scratch fitting output is
recycled after recording the fit. No review pictures or evidence folders
are needed for this handling stage. Continuation build output and temporary
PATH shim were recycled after recording the results.

## Claude's review (28 October 2026, night)

Approved (independent code review, rule 17; rule 18 written review). Car numbers from the packet behind the nissan-skyline dev switch; all-wheel-drive grip applies only to a car with awd: true; excludeFromCompletion keeps the Jesko list at eight; ROAD_CLASS only. Replay fingerprints and every other car unchanged. The feature-flag count moves 41 to 42 only for the new switch; the dev list gains nissan-skyline. Nothing loosened. 959-S body stands in until V3.
