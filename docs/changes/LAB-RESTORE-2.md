---
task: LAB-RESTORE-2
status: done
flag: lab
player_facing: no
---

# LAB-RESTORE-2

## Design settled before code

Kyle's two prices replace the single payment. Pay 1,000 at the start of the
mechanical show (46 seconds: soak, current, strip). This unlocks the car and
owns/applies sea-wreck atomically in cosmetics. Body crust stays throughout.
Pay 1,500 from the Sirena paint list at the start of the body show (14 seconds:
rebuild, paint). Both finishes remain owned. Closing either show loses nothing.
Replay is free and skippable; each paid first show has no Skip.

Use the existing cosmetics owned/selected fields; no new save version or field.
With lab enabled, an already owned Sirena with no sea-wreck entry is the old
single restore: expose both finishes and keep its restored appearance. Do not
migrate or add anything during ordinary loading with lab off. Preserve stored
finish entries on normalization, including when the switch is off. Only the
Sirena offers these two finishes; factory must not bypass the body purchase.
The renderer selects the GLB from the applied finish only while lab is enabled;
keep the ordinary driver, damage/effect hooks and all four steer/spin references.
Coast Cup access stays based on car ownership.

Checks: test-lab-restore (money, saves, sequence, fixture), paint/vehicle checks
selected by the lane tier, build; memory-only lab-restore and lab-view scenarios.
Capture the actual Sea wreck racing model in lab-restore and keep one small
picture sheet. One independent money/save review. Existing restore cues are
lab.fizz and Brian restore.start/restore.done; no new audio asset.

## Changed assertions

- `test-lab-restore`: purchase expectation 2,500 -> 1,000; 5,000 leaves
  4,000 and 4,000 leaves 3,000. The short-credit refusal now uses 999;
  the 500-credit-short UI case starts at 500. The save-change assertion now
  also permits exactly the Sirena cosmetics grant and checks its round trip.
  Existing five-stage choreography checks remain; added checks prove the
  46/14-second split, intact crust during mechanical work, two prices,
  permanent finish ownership, free switching, both Coast Cup finishes,
  forged balances, stale tabs, lab-off behavior and the legacy fixture.
- `test-paint-presets`: catalog count 6 -> 8, for the two Sirena finishes.
  All existing material bounds, wallet and physics assertions remain.
- `test-save-fixtures`: historical fixture roster 22 -> 23. The new fixture
  contains an old restored Sirena and a two-finish Sirena with Sea wreck
  selected. All historical fixture checks remain, including unchanged bytes.
- `test-vehicle-assets`: added checks using the actual runtime GLB geometry
  (only image decoding omitted in Node): four steer/spin pairs, driver,
  steering, brake lamps, nitro, damage/reset, private instances and no clean
  placeholder during loading. Browser captures cover the embedded textures.
- `test-deep-save`: add the new fixture to the explicit list of fixtures
  carrying Deep data, so it must preserve that data rather than assert none.
- `test-frame-metrics` and `test-scene-presentation`: the exact renderer-source
  match now names `prepareVehicle(carKey,{finish:modelFinish})`. The required
  frame-metric suspension and adaptive-resolution reset stay identical.
- `lab-restore` scenario: first debit 1,000 and first show 46 seconds; moved
  rebuild/paint captures and Brian's completion line to the garage purchase
  (1,500, 14 seconds). Added the real Sea wreck race, both-finish list and
  free switch back. The replay stays free and skippable. No tolerance or
  race/world fingerprint loosened or re-recorded.

## Independent review

One independent save guardian: clear. Real App instances over shared memory
storage pay each step once; stale retries, short credits, forged balances,
wrong cars and disabled switches are refused. Old saves stay unchanged on
load, both finishes survive round trips and ordinary paint writes. All 23
historical + one forged fixture pass 1,029 checks. Damaged-data normalization
passes 86 tests / 3,654 checks. Backup, storage-budget, combat-credit, fine,
quitting and reload checks pass. The reviewer found two fixture-format
faults and a mechanical completion-label issue; all were fixed and confirmed.
Runtime GLB geometry/contract review is clear (browser owns texture checking).
The final replay/model-swap delta was also reviewed: no new findings.

## Checks and pictures

- Lane tier: `node tools/run-tests.mjs --tier lane --changed --jobs 4
  --keep-going --json`. The initial run selected 73 suites (68 pass, 5 fail).
  After corrections, the affected-file delta selected 41 (38 pass, 3 menu
  adapter failures); those three then passed their targeted checks. Across
  the union: **79 distinct suites, latest results all pass, none unrun**.
  No passing unrelated suite was rerun. The Windows rerun used System32 tar
  and permitted ffmpeg. Exact loader-source/fixture assertions were updated
  as listed above; menu adapters now use the existing option collection.
- `test-lab-restore`: 17 tests pass. `test-vehicle-assets`: 171 checks pass,
  including the real GLB geometry. Save fixtures: 1,029 checks pass.
- Replay fingerprints: 225 checks, 25 cases, 23 events; combat fingerprints:
  12 checks across four encounters. Race integrity: 605 checks. All unchanged.
- Final production `npm run build`: pass, 937 ms. Existing chunk-size and
  dynamic-import warnings only. No runtime code changed after this build.
- `lab-restore`: pass, 15 pictures, zero warnings/errors. Actual menu choice,
  Sea wreck race above 30 mph, both paid shows, exactly 2,500 total, both
  finishes, free switch back, and free skippable replay. Private memory saves.
- `lab-view`: pass, four pictures, zero warnings/errors. Its passing result
  was retained; it was not repeated during restore-only scenario fixes.
- Board: 197 checks pass. Repository placement passes; no oversized new sheet.
- Independent review clear, including the final replay and menu deltas.
  Cockpit sync completed: zero tasks changed. Session status regenerated.

The scenario fixes waited for model readiness before Start, scoped paint
selectors to buttons (the renderer also has a data-paint marker), and waited
for the reopened Lab to be visible before the replay. These fix the script's
interaction with loading/hidden DOM; no purchase or replay assertion weakened.
The suite runner's existing private bundle avoids sharing the lane scratch
folder. Earlier failure details were consumed by those fixes; raw output is
recycled after this verdict is committed.

Picture: `docs/board/looks/lab-restore-2/round-1.jpg` and its short review.
It includes the actual Sea wreck race frame. This is no frame-timing claim.
Lab remains dev. No feature switch changed; no live checkout or player save
was read or written. Lane commit only; no merge or push.

## Removed

Replace the single 2,500 purchase and full-show first run with the two steps.
