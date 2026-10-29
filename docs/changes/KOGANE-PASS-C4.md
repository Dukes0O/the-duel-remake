# KOGANE-PASS-C4: scenery, round 1

Status: round 1 captured for Claude's picture review. Kind: art and scenery.
Switch: `kogane-pass`, still dev.
Not green for integration: the drive-through coverage extension below needs
the Director's scope decision. Art and changed assertions await Claude.

## Design

Reuse the existing forest, autumn maples, barrier geometry, lanterns,
shopfronts and Harbour lamp rows first. Use the alpine-compatible waterside
lamp hook for lower-road sodium lamps and pools. Add original Blender recipes
only for the missing roadside shapes. Lake and torii belong to C5.
No road, physics, pace, save or audio changes.

## Checks

Initial course test passed: Casual 109.81 s and Pro 109.32 s, no crashes or
resets. Initial real High/LOD clearance passed for all 1,153 placements.
Blender export passed all six High/LOD budgets. Original new shapes, High/LOD
triangles: retaining stone 528/168, mirror 220/96, chevron 28/28, tea house
2,076/396, vending row 612/468. White rail retains the donor's 156/72 triangles.

Initial drive-through failed: 27 maple grounding findings near folded terrain
and four barrier-probe findings. Broad maple groves now skip the hairpin
approaches and exits. The barrier checker recognizes only the old barrier ids,
so it samples the remaining concrete hairpin pieces and omits the new white
rails and retaining walls. Asked for a scope extension to add those ids to its
existing footprint and barrier tables, with unchanged limits. No table edit
made while the answer is pending.
The native drive-through runs finished on all three CPU difficulties, with no
off-road or barrier-passage observation in the driven laps. The four reported
probe findings were separate stationary barrier approach probes. The final
drive-through was not rerun: its slot check found two heavy jobs, and the
requested table extension still has no answer. No limits were changed or
findings dismissed as a pass.

The single-browser native scenario passed: six High views, zero warnings and
errors, zero crashes and boundary resets through 4,190 m. Every capture proved
that rendering left the race and profile unchanged. Dusk night amount .55 at
the first three views, full night at the last three. No frame timing.
`docs/board/looks/kogane-pass/round-1.jpg` is 478,573 bytes, six game/reference
pairs, and was copied to the requested Claude scratchpad as
`kogane-c4-round1.jpg`. Lake and torii are labelled as C5 work.

Pictures show the remaining art gap honestly: dark forest and village faces,
clean repeated stone blocks, and fairly weak sodium pools compared with the
references. Claude judges this first round; no second round has started.

The stock browser launcher first failed because Vite's config cache writes
through the shared node_modules junction. The supported `--configLoader
runner` flag fixed the build, using a temporary lane-only Node preload. The
first sandboxed Chrome launch then closed before DevTools connected. The
authorized headless retry outside the sandbox passed on a private port with
memory-only storage. No persistent harness change or integration-folder edit.

Final lane evidence: `node tools/run-tests.mjs --tier lane --changed --jobs 2`
selected 70 suites. Its first run ended 55 passed, one failed, 14 not run
(474.17 s): the evidence suite could not find ffmpeg in the restricted shell.
The laptop already has ffmpeg. The same evidence suite passed on its one
retry with the existing binary in `FFMPEG_PATH` (5.50 s). Only the 14 unrun
suites were then selected with `--filter`, jobs 2: 14 passed, zero failed or
not run (310.81 s). Thus all 70 selected suites completed successfully with
the original 55 passes retained and no assertion changes during recovery.

Final real kit clearance passed for all 1,055 Kogane High/LOD placements.
The replay guard passed 225 checks across 25 cases, 23 events, three FPS values
and three runs. World composition passed 47 exact complete-scene checks across
twenty events. No replay or signature fixture was changed.

`npm run build` passed (Vite 1.12 s, 600 modules). The shared dependency link
also lacks `vite.cmd`; a temporary lane-only launcher exposed the existing
Vite CLI on this command's PATH. The same supported config-loader flag kept
temporary config files out of the shared junction. The first bare npm attempt
printed a missing-Vite error and is not counted as a build pass. Existing
large-chunk and dynamic-import warnings remain. No package or dependency change.

Generated the lane's STATUS with other lane inspections disabled. No merge,
push, release, live-game access or frame timing. The final drive-through and
Director's scope/round/assertion decisions remain outstanding.

## Changed assertions

`test-circuit-kogane`: replace the C2 existing-kits-only whitelist with the
exact placed C4 list. Move the guardrail inner-face assertion from `armco` to
`armco-white`, with the same .349 m depth and exact tolerance. Add approved-id
normalization, four mirrors and sixteen chevrons, hardware setback, low
hairpin sightlines, lower-road sodium lamp coverage, and actual GLB hashes and
triangle budgets. Road shape and driving assertions remain exact.

`test-track-kits`: count 40 becomes 46, and the exact suffix appends six new
ids. The old 40 ids and their order remain in the exact comparison. No
clearance, terrain, collision, replay or timing assertion is loosened.
Claude's written assertion review is required before integration.

## Removed

Replace C2's plain lakeside rail finish and selected uphill concrete rows with
the white finish and retaining stone. No backup models or blend files.
Consumed browser captures, their reports, the unused manual QA bundle, the
production build output, 46 test-generated module copies and temporary
launcher helpers are recycled after recording these results. Keep only the
recipes, runtime assets and one review
JPG. The requested scratchpad JPG is the review delivery copy.
