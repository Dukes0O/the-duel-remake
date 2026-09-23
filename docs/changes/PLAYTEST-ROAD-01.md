# PLAYTEST-ROAD-01 — Wasteland roadside destruction

Status: ready to merge. This is staged behind the `roadside-destruction` dev switch. It does not change the live game or ordinary race scenery rules.

## What changed

- Small non-desert trees (scale at most 1.1) break at a 14 mph normal impact, cost `12 + 7 × scale` mph, and fall in the hit direction. At 90 mph against a scale 0.8 tree, the Wasteland car retains 72.4 mph instead of nearly stopping and entering the old crash response. Large trees remain solid.
- Hitting one road-sign post drops the whole sign and removes both post colliders. Turn chevrons also fall. A broken object cannot charge another hit on later laps; a new stage restores it. Cacti retain their existing one-time fall and 8% speed scrub.
- Solid scenery in Wasteland uses the same per-car armor/top-speed crash threshold as vehicle collisions. Ordinary races retain their 28 mph obstacle threshold.
- The traffic helper computes a mass-aware wreck threshold from closing speed. A wreck moves sideways, lifts, spins, lands, and stays visible using the existing pooled car mesh. The player-to-traffic contact hook and player crash response are owned by the separate armor-impact lane change.
- A severe traffic hit can wreck the other car and crash the player. The callout now reports both outcomes and the two-second penalty; a protected hit still reports only the wreck.
- The existing stage-local state drives the animation. Course features, world layout, saves, rewards, and assets remain unchanged. No generated image was needed because the current 3D scenery and car meshes support the fall and wreck states.

## Checks

- `node tools/test-roadside-destruction.mjs`: 28 checks passed, including soft/solid tree contacts, paired sign posts, flag isolation, traffic threshold and finite wreck motion.
- `node tools/test-roadside-visuals.mjs`: 15 checks passed for pine, sign and chevron animation, scene bounds, immutable source data and reset in a cached world.
- Existing contact damage, cactus fall, NPC vehicle damage, vegetation cells and exact world composition checks passed. Sixteen world signatures remain unchanged.
- Reviewer follow-up: the severe traffic fixture checks the combined wreck/crash message, and the private `traffic-wreck-callout` browser scenario confirms it appears in the live HUD with zero console issues.
- `node tools/test-feature-flags.mjs`: 21 checks passed. The only existing assertion changed is the catalog membership count: it now requires both `career-backup` and `roadside-destruction` as dev features. The Director approved this update after the first lane run exposed the old one-feature assertion. Runtime flag behavior assertions did not change.
- Exact lane gate on the corrected code: **127 passed, 0 failed, 0 not run in 467.01 seconds**. It includes 48/48 completed and won expansion driving runs, unchanged replay fingerprints, and exact scene composition checks. The prior run stopped at 89 passed / 1 failed / 37 not run because the catalog assertion still listed only one feature; that assertion is now fixed.
- Production build passed on the same code. The known large renderer chunk advisory remains.

## Playtest and limits

Use a private dev or QA build with `?flags=roadside-destruction`. A plain production preview does not enable a dev switch. Human review should judge the tree speed cost, sign fall, traffic flight, and sound/visual feel. Destroyed traffic leaves vehicle collisions and remains visible off the route; that stage-local wreck is not yet a solid debris collider.
