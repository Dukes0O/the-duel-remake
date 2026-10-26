# SKI-PICKUP

- Kind: pad placement fix. Flag: `heli-skiing` (unchanged).
- Design settled before code: move only the helicopter pickup landing circle to
  the first clear, fully snowy 12 m circle below Devils Playground (seed 1989,
  course distance 7,320 m, lateral 30 m). Keep the ski recipes' existing
  2,886 m finish altitude separate from the helicopter pad's real altitude.
  This preserves all five runs, guide times, medal targets, run IDs and saves.
- Checks: ski suites, existing `ski-view` scenario with its pickup picture,
  lane tier with `--changed --jobs 4`, and `npm run build`.

- Required follow-up: the unchanged ski-view test found the relocated pickup's
  downhill valley is 265 degrees, rather than the old 205. Update that
  presentation constant only; keep the test's independent ground scan.

## Changed assertions

- Four run-finish/drop assertions now use the unchanged 2,886 m recipe
  altitude rather than the relocated helicopter's altitude. Tolerances unchanged.
- Replace the obsolete 350 m helicopter-pad gap with a downhill placement
  assertion. Add 16 snow samples around each pad and pin the original recipe
  finish altitude. Clearance and level-ground checks remain unchanged.
- Re-record pickup thrust/spare lift at the higher pad: 2,407/302/502 kg becomes
  2,311/206/406 kg. The flight model gives 2,310.8804 kg there; the 1 kg tolerance
  is unchanged. Devils Playground and summit numbers are unchanged.
- The test pilot's fuel-truck idle budget now uses remaining fuel divided by
  idle burn, plus five seconds, instead of a fixed 900 seconds. Truck arrival,
  payment and flight assertions remain intact. The outbound pilot budget now
  follows distance to the area's west boundary at its existing 20 m/s speed,
  plus approach time, instead of the old 120 seconds. Departure height is
  60 m above the landed helicopter, preserving the old pad's 100 - 40 m
  clearance. The old absolute 100 m target never took off from the higher pad.
- The group now reaches pickup with about 320 kg rather than under 160 kg:
  assert fuel remains above the cruise requirement and below a full tank.
  This records the shorter trip; truck charges and once-only payment remain
  independently checked after deliberately idling the tank dry.
- Independent code and assertion review: CLEAR (review agent). Claude's written
  review of changed expectations is still required before integration.

## Removed

Replace the desert pickup coordinates and the assumption that the helicopter
pickup must share the ski recipes' finish altitude. No assets or save fields removed.

## Verification

- First lane: 26 passed, 2 failed, 3 not run. Failures exposed the old backdrop
  direction and helicopter test assumptions above; corrected without changing
  the backdrop assertion or loosening tolerances.
- `node tools/test-ski-physics.mjs`: PASS, 112 checks.
- First browser attempt could not write Vite's shared cache under the sandbox.
  The admitted retry was stopped to restore the two-job cap, with no verdict;
  its owned QA bundle was recycled. Required scenario resumed in a free slot.
- `node tools/run-browser-scenarios.mjs --scenarios ski-view --jobs 1
  --output-dir .evidence/2026-10-25/SKI-PICKUP`: PASS, eight captures, zero
  warnings/errors. Picture inspected: helicopter on snow at 10,607 ft.
  Retained picture: `.evidence/2026-10-25/SKI-PICKUP/ski-view/ski-pickup.png`.
- `npm run build`: PASS (1.81 s); existing bundle-size advisory only.
- Corrected lane: 39/40 PASS, zero not run (233.01 s). Only ski-heli failed,
  exposing the remaining route/fuel assumptions above. Per rule 19, rerun
  only that corrected suite; the other 39 passing suites are not repeated.
  Replay fingerprints: 225 checks; world composition: 47 checks, unchanged.
- Ski-heli rerun: 13/15 PASS. The two return flights exposed the old
  absolute departure height; after correcting it, only those two are rerun
  with `node --test --test-name-pattern="the group job:|stepping out takes the
  autopilot" tools/test-ski-heli.mjs`: PASS, 2/2 (116.93 s).
  Together with the preceding 13 passing cases, all 15 ski-heli cases pass.
  All 40 selected lane suites are therefore covered by passing checks;
  passing suites were not rerun after test-helper-only corrections.
- Independent review confirmed all follow-ups. No runtime code changed after
  the passing browser/build; only the test pilot and expected fuel changed.
- Recycled the owned production build and seven consumed scenario pictures.
  Retain the requested pickup picture and gate/build receipts for handoff.

## Claude review (26 October 2026)

Approved: the moved pad changes altitude-dependent numbers (lift from the flight model at the same tolerance, recipe finish altitude) and the test pilot's time budgets now follow distance and fuel; nothing loosened. Picture: the pickup stands on snow.
