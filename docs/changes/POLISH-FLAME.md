# POLISH-FLAME

Status: round 1 approved by Claude/Kyle on 10 October 2026.
Merge depends on POLISH-SMOKE approval/merge and a fresh lane gate after sync. No longer waiting on Claude; no additional frame rerun is required.
Exact shared-source dependency: POLISH-SMOKE b4494e996201e0956fb9ee1945e34bd531b2e430.

## Design before code
- Use verified CC0 Kenney Particle Pack flame/smoke silhouettes, reduced to small
  runtime atlases by a repeatable recipe. Source page and original license stay
  in the external art library; exact checksums and recipe enter the catalog.
- Replace the orange cone with bounded textured flame tongues: nozzle flicker,
  rolling amber core and darker curling tips, with sparse embers. Clip visible
  flame to the authoritative 9 m/30 degree car cone and 6 m/35 degree Cinder cone.
- Read burst age, fighter flaming state and existing burning timers only.
  Preserve target tests, damage, cooldowns, duration and all race fingerprints.
- Add short-lived ground scorch (5 s), tip smoke and warm local ground/car glow.
  Body flames last only the existing 1.5 s burning effect. Presentation pools
  use elapsed race time and bounded capacity; no simulation RNG consumption.
- Keep existing weapon.flame.start/loop/end cues; no new sound event.
- Both qualities and two concurrent flamethrowers need browser/frame evidence;
  one sheet covers start/full burst/burning car/Cinder. At most three rounds,
  each to Claude; no final art approval inferred from geometry or tests.

## Source
Existing runtime fire/smoke flipbooks are generated art. The official
https://kenney.nl/assets/particle-pack page explicitly labels CC0, verified
9 October 2026, and provides a free download without an account.

## Verification and review
- Director independently reviewed shared wiring and module: no finding. Shared
  textures retire once; fixed pools, scorch reset and two persistent lights.
- Car uses native point() origin, range and half-angle. Player Cinder uses its
  fighter origin and native pitch-projected sector; CPU Cinder keeps its native
  flat sector. No damage, timer, cooldown, targeting, RNG or audio changes.
- Native browser checks validate origins, transformed sector endpoints, decoded
  textures, outside-range safety, post-burst timer/body flames and unchanged
  race state. Eight matched poses in both qualities pass; zero browser warnings
  or errors. Both post-burst views retain 1.4583 s of native burning.
- Quiet fixed-pose sampling, two native flamethrowers, 240 real rAF intervals:
  P95 High 18.2 -> 18.8 ms (+3.3%), Performance 18.2 -> 18.2 ms. P95 passes
  the +10% limit. Means: High 17.77 -> 19.93 ms (+12.2%); Performance
  17.65 -> 17.72 ms. Claude/Kyle accepted the passing P95 result on 10 October;
  the High mean increase is recorded information, explicitly not a merge blocker.
  Draw calls High 1134 -> 1153; Performance 638 -> 657.
- First technical captures exposed faint scalar-mask sampling; corrected gamma
  handling and density. Cinder fixture now renders the first native firing tick
  before advancing to full burst. These fixes precede the first art submission.
- Focused Flame checks, native Arsenal Wave 2 (39), shared Smoke checks and
  npm run build pass. No existing assertion or race fingerprint changed.
- Director independently viewed round-1.jpg (454,634 bytes): textured car and
  Cinder plumes improve readability. Claude/Kyle approved round 1 on 10 October.
  Retained sheet/browser recipes are tools/art/polish-flame-sheet.py and
  tools/scenarios/polish-flame.mjs; raw evidence stays under integration
  .evidence/2026-10-09/POLISH-FLAME/. No second art round is needed.
- Broad lane gate awaits the approved Smoke dependency and integration sync. No integration merge or release is authorized here.

## Smoke source sync on 10 October
- Synced integration 1f5da9c8 (Height) cleanly in merge 75bb16e7, folding the
  existing Flame approval notes into that real sync. Then merged Smoke b4494e99.
- One conflict: render3d combatScene creation. Resolution preserves Flame's
  TextureLoader injection and adds Smoke's scene.onBeforeRender preparation for
  each main/rear camera. Combat scene auto-merge retains Flame plus Smoke's grey
  haze, deferred facing and prepareSmokeCamera. No new hook or Flame art change.
- Director reviewed the source/conflict resolution: clear. Flame module, shared
  Smoke and native Arsenal Wave 2 (39) checks pass; build passes.
- Native Flame scenario repeats all eight start/full/burning/Cinder poses across
  High and Performance: zero warnings/errors, decoded textures, unchanged race
  state, exact range/angle/origins. Maximum endpoint error 3.90e-14 m; post-burst
  native burn timer remains 1.4583 s. Car and Cinder previews inspected in both.
- New source-sync evidence: integration .evidence/2026-10-10/POLISH-FLAME/.
  No new art or frame round, broad gate, integration merge or release claimed.
  Smoke still needs final art approval and integration merge before Flame's gate.

## Removed
Removed the old car and crew orange cones and their dedicated geometry/material.
Reused CC0 textures total 55,170 bytes; one texture set serves all pooled views.
Scorch lasts five seconds; a full pool skips a new mark rather than ending an
existing mark early. Temporary exact-Smoke baseline checkout was removed
without force; shared dependencies and raw evidence remain intact. Gameplay cones remain authoritative.
