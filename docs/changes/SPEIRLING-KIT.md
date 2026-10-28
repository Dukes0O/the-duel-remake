---
task: SPEIRLING-KIT
status: review
kind: art
flag: lab (dev)
---

# SPEIRLING-KIT

## Design settled before code

Use a vehicle-specific branch of the existing Blender kit recipe. Scrapper adds
four breakable fender-crown plates, low side sheets and a nose bar. Raider adds
side saws, a canopy-clear cage and a rear roof mount. Warlord adds a rust shell
from the actual painted body, crown teeth and a crossbar. Leave the rear fans,
canopy and wheel discs clear. Keep the stable tier/part names and existing kit
budget. Append the car to the recipe so other cars retain their plate shapes.
The lab switch stays dev. No driving, save, reward or sound changes.

## Checks planned

Existing armour asset, authored, fit and visuals tests; Blender output manifest;
lane tier with four jobs; production build; memory-only armor-kit-visuals browser
scenario. One comparison sheet of the real model and fitted tiers, with both
quality settings. No frame check for this art round.

## Implementation and assertions

- Added `mcmurtry_speirling.glb`: 765,416 bytes, 9,201 triangles, 34 nodes;
  under the existing 12,000-triangle kit limit. Stable tier and breakable-part
  names, painted UVs, and no runtime code changes.
- Added the car last in `armor-kits.py`. Its own build function uses narrow
  fender plates, sill sheets, side saws, canopy rails and a rear mount.
  The Warlord shell uses the actual runtime painted metal. Openings are cut
  after decimation around both fans and the canopy. Other recipes and GLBs
  stay unchanged. The audit's painted-metal export now recognises this car.
- Existing assertions are unchanged. The Blender output manifest gains the
  new GLB. A new fit assertion checks all three tiers against the actual
  glass triangles (12 mm clearance), both fan outlets and Scrapper/Raider
  wheel discs. Warlord retains the source body's wheel-arch relation.
- The existing armour visuals scenario has an opt-in `GFX_SPEIRLING_KIT=1`
  path: 18 tier/angle/quality captures, tier visibility and unchanged player
  rewards/records. The default 36-view matrix and assertions stay unchanged.
  The new path waits for shader warmup and painted frames before capture.

## Checks and review

- Asset structure, distinct geometry and UV tests pass. Authored kit,
  existing visuals and Blender output tests pass. The new fit test passes.
- Initial build failed the existing UV check; fixed the plate mapping.
  The new fit test caught shell fan/canopy contacts; cut true openings.
  No test assertion or tolerance was loosened.
- Independent review found one stale Performance picture; corrected the
  capture wait and replaced the sheet. Reviewer also checked triangle
  surfaces: 158 fan rays and 6,179 candidate canopy edge segments, no hits.
- Production build passes (1.40 s; existing chunk-size advisory).
- Lane: `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going
  --json`: 45/47 pass, no suites skipped, 373.79 s. Only failures were
  `test-review-evidence` and `test-warlord-blackiron`, both `spawnSync ffmpeg
  EPERM` in the sandbox. Reran just these two with permission: 2/2 pass.
  All replay and world-signature guards pass. Logs: ignored
  `.evidence/2026-10-25/SPEIRLING-KIT/lane*.json`.
- Final `GFX_SPEIRLING_KIT=1` armor-kit-visuals browser scenario passes:
  26 captures (18 specific to this car), both qualities, zero warnings or
  errors, memory-only storage. The final capture-only wait correction came
  after the lane run; its syntax check and actual browser scenario pass.
- Independent reviewer PASS, including the corrected 481,365-byte sheet:
  `docs/board/looks/speirling-kit/round-1.jpg`. Director art acceptance is
  left for integration. One art round used.
- Cockpit task T-050 created with `Board cards SPEIRLING-KIT`, grouped under
  Lab/ART; protected board sync sets In Progress. Status snapshot refreshed.
- Replay fingerprints and driving rules are unchanged; lab remains dev.

## Picture recipe

Run Blender with an absolute repository root:
`blender -b -t 4 --python tools/blender/armor-kits.py -- --root <repo> --cars mcmurtry_speirling`.
Run `GFX_SPEIRLING_KIT=1 node tools/browser-harness.mjs scenario armor-kit-visuals`
with output under `.evidence/2026-10-25/SPEIRLING-KIT`.
The comparison sheet crops each captured image to (260,250)-(1000,620),
resizes to 480 by 240, and arranges front/side/rear columns with High then
Performance tier rows. JPEG is capped at 500 KB.


## Removed

No existing game assets or code paths replaced. Recycled owned Blender
outputs/backups, raw captures, test/build scratch and generated builds after
review. Kept only the runtime GLB, compact sheet, recipes, review verdict and
ignored lane/build/browser result logs needed for handoff.
