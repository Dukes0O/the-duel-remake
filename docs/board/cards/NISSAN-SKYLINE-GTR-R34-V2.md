# NISSAN-SKYLINE-GTR-R34-V2: Nissan Skyline GT-R R34, V2 shape

Owner: codex. Lane: ART.

## Prerequisites and graph

Claude must complete and approve [the packet](../../cars/nissan-skyline-gtr-r34.md) before this stage starts.

Needs: NISSAN-SKYLINE-GTR-R34-V1.
Next: NISSAN-SKYLINE-GTR-R34-V3.

See [FACTORY section 3](../../FACTORY.md#3-the-production-lines).

## Done when

Blender recipe; side, front, top and three-quarter compared against the photos on one sheet; at most three rounds

Judge: Claude, against photos.

## Files, locks and checks

Before building, copy owned files, contracts, locks and one to three checks from the approved packet.
Record any browser, look or frame checks needed. Follow the current lane and release gates.
New events must name their sound cue.

## Round 1 scope and decisions (28 October 2026)

Kyle requests a code builder instead of a Blender body recipe. Reuse the
959-S construction helpers and F1 damage contract. The supplied synthetic
references control proportions; the packet controls red calipers, twin tips,
five-spoke wheels and left-seat driver. No logos.

Owned: src/skyline-vehicle.js, tools/test-skyline-vehicle.mjs, round sheet and
review note. Kyle extends the named registration hooks to src/vehicle-assets.js
and src/feature-flags.js for a dev-only model entry. No config or shop entry.
Locks: none. Checks: own headless contract and budget test; four matched
model/reference views and self-review; lane tier jobs 2 and production build.
No frame check. No new game event or sound cue in this shape stage.

The round also owns tools/art/skyline-review.py and tools/art/skyline-sheet.py, repeatable review recipes
using the existing car-review renderer and Pillow sheet composition. The
requested nissan-skyline-gtr-r34 sheet folder supersedes the packet alias.
