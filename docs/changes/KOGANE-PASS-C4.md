# KOGANE-PASS-C4: scenery, round 2

Status: round 2 complete for Claude's picture review. Switch `kogane-pass` stays dev. Stop after round 2.
Claude's direction and checker approval are on the card and in the round note.

## What changed

Low white guardrail replaces most concrete. Concrete remains only outside
four tight hairpins; mossy textured stone lines the uphill side elsewhere.
Kogane's new presentation options omit duplicate plain collision-wall boxes
and red-white circuit kerbs, and draw one solid yellow centre line. Packet
width, track script and physical walls remain unchanged.

Fir geometry is reused for cedars. Near forest starts closer to the rail,
with small red-orange and golden maple groups outside hairpins and leaves on
the verges. Inside clear zones keep the next turn visible. Existing curve
mirrors and chevrons remain at all four hairpins. Donor rail fixing faces
become orange reflectors within the same triangle cap.

Existing sodium road pools are stronger. A fixed world-space lamp wash lights
nearby rail, stone and tree trunks. Near-tree materials are cloned, with the
original needle shader preserved; distant trees reuse their original material.
No dynamic lights, network calls, dependencies, physics, save or audio changes.

Claude approved white rail and retaining stone in the existing footprint and
barrier tables. The footprint contract also reads Kogane's measured recipe table for the new
ids; the original P4 manifest and donor credits remain exact. Every tolerance and
limit is unchanged.

## Checks

Asset export passed: white rail 156/72 triangles; retaining stone 552/180;
mirror 220/96; chevron 28/28; tea house 2,076/396; vending row 612/468.
All High/LOD triangle and file budgets hold. Rail and stone footprint sizes
are unchanged. Stone's embedded colour tile is 128 x 128. The barrier asset set grows
36,328 bytes for the stone detail and embedded tile, within every file cap.
Course check passed: Casual 109.81 s, Pro 109.32 s, no crashes or resets.
All 1,232 actual High/LOD placements passed road clearance. Pine material
check passed 1,729 checks, including the new lamp-wash regression checks.
The complete drive-through passed with zero findings: Easy 109.808 s,
Medium 109.817 s, Hard 109.792 s. All three completed the native endpoint.
Grounding covered 1,194 objects; all 16 barrier probes passed at 70/110 mph,
including white rail, stone and concrete. No limit changed.
Native browser check passed: eight screenshots, zero warnings and errors.
Six native High views preserve the upper dusk (.55 night amount) and lower
night (1.0). Two labelled companion views hold renderer exposure at 8 while
keeping actual light, geometry and camera. Every view proved race/profile
unchanged; no crashes or boundary resets through 4,190 m. No frame timing.
The comparison sheet is 461,674 bytes, with all eight complete game frames.
The first 1,600 px layout was 500,611 bytes; a 1,360 px layout fits the same
500 KB cap with no crop. Delivered the requested scratchpad JPG; SHA-256 of
both copies is 3450e978eb5e201b8d9714e4600e45aa17fb8e67c32675c5915cf7883da53bf8.
Pictures show the open white rail, close forest, exposed stone and moss,
hairpin hardware and stronger warm pools with nearby lit rail and trunks.
Claude's art verdict remains pending. No third round started.
Initial lane run selected 137 suites: 108 passed, one failed, 28 not run
(699.30 s). The evidence check reads git ls-files and still listed the recycled
round 1 JPG because its deletion was not staged. Staged the replacement and
used its required round-2-review.md companion name. No game code or assertion
changed. The evidence suite then passed 403 checks. Only that suite and the
28 unrun suites were selected for recovery, jobs 2: 29 passed, zero failed or
not run (368.49 s). All 137 selected suites therefore completed successfully,
with the original 108 passes retained. No assertion changed during recovery.
The replay guard passed 225 checks across 25 cases and 23 events at three FPS
values over three runs. Combat replay fingerprints passed 12 checks across
four encounters. World composition passed 47 exact complete-scene checks on
twenty events. No replay or world-signature fixture changed.

npm run build passed: 600 modules, Vite 1.13 s. The lane-only launcher used
the existing Vite CLI and its supported runner config loader, avoiding config
cache writes through the shared dependency link. No package change. Existing
large-chunk and ineffective dynamic-import warnings remain.

Final source review is clear. No frame timing, merge, push or release.
STATUS is generated with other-lane and live inspections disabled. Cockpit
sync is left to the Director under this job's lane-only scope. Claude's art
and written assertion reviews remain pending before integration.
No frame measurement. Browser storage is memory-only.

Independent review found a lost pine shader callback when cloning and a
repeated far-tree asset factory call. Both were corrected and confirmed by
the reviewer. No remaining code fault reported in that review.

## Changed assertions

Round 2 adds two course checks: exactly the single-yellow marking option,
and concrete only on the outside of tight hairpins. The existing barrier-size assertion also reads the measured Kogane asset
table for its two new ids, keeping its .02 m tolerance and every P4 entry.
The pine-material suite adds checks for preserved crown shading, one shared
near/far texture pair and exact disposal. No existing assertion is removed or
loosened. No fixture or replay fingerprint is re-recorded.

Carried from round 1: the C2 placement whitelist becomes the exact approved
C4 ids; rail inner-face check uses armco-white with the same .349 m depth and
tolerance. Added id normalization, four mirrors, sixteen chevrons, hardware
setback, low hairpin sightlines, sodium lamp coverage, actual GLB hashes and
triangle caps. Track-kit count 40 becomes 46 by appending six ids, retaining
all old ids and order. Claude's assertion review is still needed for these
round 1 additions before integration.

## Removed

The superseded round-1.jpg was recycled after round-2.jpg was complete.
This round replaces the prior rail and retaining-stone runtime assets in
place. The recipe supports --only for the two changed barriers. Unchanged
chevron,
tea house and vending payloads keep their previous files, avoiding changes
caused only by Blender object names. No backup GLBs or blend files are kept. Consumed
captures were recycled after the sheet and results were recorded.
Gate logs, test copies, build output and temporary launcher helpers were
recycled after recording the final results: 55 proven run outputs. Automatic
cleanup review first required ownership proof for test copies; their private
paths and creation times established that this gate created them. The safer
cleanup then passed. Existing empty scratch/evidence containers were retained. The
named Claude scratchpad copy is delivery evidence;
nothing in that scratchpad is deleted or moved.
