# KOGANE-PASS-C4: Kogane Pass, C4 scenery

Owner: codex. Lane: ART.

## Prerequisites and graph

Claude must complete and approve [the packet](../../courses/kogane-pass.md) before this stage starts.

Needs: KOGANE-PASS-C1.
Next: KOGANE-PASS-C5.

See [FACTORY section 3](../../FACTORY.md#3-the-production-lines).

## Done when

Reused kits placed first; new models as Blender recipes, at most three rounds, one comparison sheet per round under `docs/board/looks/kogane-pass/`

Judge: Claude, on pictures.

## Files, locks and checks

Before building, copy owned files, contracts, locks and one to three checks from the approved packet.
Record any browser, look or frame checks needed. Follow the current lane and release gates.
New events must name their sound cue.

## Round 1 scope and settled design

Owns the scenery and kit rows in `src/circuits/kogane-pass.js`, recipes and
settings in `tools/blender/kogane/`, their runtime High/LOD kit pairs, the
approved kit ids in `src/track-kits.js`, and the round 1 comparison sheet.
Holds `track-kit-placement` for the appended ids and continuous-wall anchoring.
Course geometry, collision walls, pace, lake and torii remain with their owners.

Reuse first: fir bands, copper/golden maples, concrete barriers, armco geometry,
lantern strings, shopfronts and Harbour's existing waterside lamp rows. Lamp
rows work on alpine sections, including their road pools, without a renderer
change. New original recipes cover retaining stone, mirror, chevron, tea house
and vending row. White armco imports the existing mesh and changes its finish.
Keep the existing fir for Claude to judge; no cedar recipe in round 1.

Checks: course test and actual High/LOD placement clearance; drive-through on
all three CPU difficulties; six memory-only browser views with no timing.
Also run the lane tier with jobs 2 and production build. The browser recipe and
course/kit assertions are the named test hooks for this scenery card. New kit
ids extend the exact approved-id assertions; no old id or check is removed.
No new game event or sound cue. Claude judges the first sheet before round 2.

## Requested test hook extension

The initial drive-through does not recognize `armco-white` or
`stone-retaining-wall`. Its generic barrier probes therefore skip those
pieces and sample only the remaining concrete at the hairpins. Asked the
Director to extend these existing tables, keeping every tolerance unchanged:

- `src/kit-footprints.js`: white rail 4 x .85 x .349 m; retaining stone
  4 x 2.54 x .796 m, measured from the exported High model.
- `tools/course-ground-checks.mjs`: append those two barrier ids so the
  grounding and barrier checks cover the whole safety lining again.

Pending answer. No changes to these two files yet. They do not need new
collision boxes: the existing script walls still own collision.

## Round 1 handoff

[Comparison sheet](../looks/kogane-pass/round-1.jpg), 478,573 bytes, copied to
the requested scratchpad. [Change note](../../changes/KOGANE-PASS-C4.md)
records all results and the exact changed assertions. All 70 selected lane
suites completed successfully, build passed, six native views passed, and all
1,055 final High/LOD placements passed clearance. No round 2 started.
Not green for integration: the drive-through table question above remains
unanswered. Claude's art and assertion review is also pending.
