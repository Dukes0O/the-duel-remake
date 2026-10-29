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

## Assertion review for Claude before merge

The requested dev-switch registration also needs the strict catalogue row in
tools/test-feature-flags.mjs: fixed switch count 41 to 42, with nissan-skyline
added to the names required to remain dev. No existing switch state or retired
name guard is removed. The initial lane gate exposed this through course-kit.
The new model suite separately proves production denies the car and private
QA admits it explicitly. Please record AGENTS 18's written assertion review
here before merge. The builder has prepared this exact correction for review.

The dev registration also extends the existing PREVIEW_FLAGS row in this
lane's start-preview.bat. Its unchanged test requires every dev switch there.
Only nissan-skyline is appended; the launcher is never executed in this job.
No port, folder, player setup or preview behaviour changes.

## Round 2 decisions (28 October 2026)

Claude round 1 verdict: FAIL, it reads as a generic old saloon, not an R34.
Follow the latest brief: lower and move the cabin forward, flatten the bonnet
and raise the blunt nose, flare the arches, enlarge the silver wheels, use
black window seals, and replace twin tips with one large right-side exhaust.
The latest brief controls over round 1's packet choices. Keep the left seat,
red calipers, dev registration and the 60,000 triangle / 56 draw budget.
The one outlet has one boost flame. Height and wheel-radius assertions will
follow the revised geometry with unchanged tolerances. Existing damage,
clearance, grounding and isolation assertions remain.
Checks: headless model contract, four matched reference/model views and
self-score, lane tier jobs 2, production build. No browser or frame check.
Stop after round 2 and leave the art verdict to Claude.

Round 2 independent code review: clear after correcting the exhaust position
to clear the diffuser within the unchanged length tolerance, and moving black
window seals into the glass edges so the painted pillars do not cover them.
