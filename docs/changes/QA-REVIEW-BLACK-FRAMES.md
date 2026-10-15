# QA-REVIEW-BLACK-FRAMES

The existing review recipe placed every non-grid picture at length plus its named station. That works for closed circuits, but Summit is an open road: Course.phase clamps those distances to its endpoint. The first grid picture bypassed this path. Claude reported black pictures 2 to 16 on unchanged code too; the original scratch evidence was deleted. Source proves the wrong coordinates, not the complete cause of those black pixels.

The existing R.place now uses the requested first-run station on open roads and bounds its run-up at zero. Closed circuits retain the exact second-lap target, run-up and reported-distance arithmetic, including the existing rounded headless length. The same controller, speed-based run-up formula, 600-step guard, clear-field calls, render settling and native screenshot sequence remain unchanged. No race, renderer, mirror or lighting source changed.

The small coordinate calculation lives in the existing scenario and is serialized into its existing page callback. The existing test-track-review suite uses actual Summit and Harbour Course queries to check open stations, near-start run-up bounds and exact closed behavior. No previous assertion changed and no new harness was added.

R.place also returns the actual absolute station, Course.phase, requested station, run-up start, target and open/closed identity. The existing browser-result.json now retains that information for each picture as framePoses, so the native packet can prove what the camera recipe actually requested. It does not invent missing earlier evidence.

## Checks

Source preparation only. Existing tests, original 16-view native check, nearby tier and build are UNRUN pending Root's independent review and slot admission. No executed RED, green pixels, frame timing or full black-frame fix is claimed. The bounded investigation ends by 15 October 05:01 UTC. Any unresolved failure is recorded rather than followed by a speculative RAF or mirror change.

Prepared original native command, verified against the existing argument parser, not run:

```powershell
node tools/track-review.mjs summit-run --flags summit-run --quality high --car falcone_f42 --seed 1989 --output-dir .evidence/2026-10-15/QA-REVIEW-BLACK-FRAMES/summit-high
```

The normal harness uses a private port and memory-only saves. No port 5174, live folder, release or push was used.

## Removed

Removed the invalid second-lap offset and negative run-up possibility for open-road review pictures only. Closed-course behavior, actual driver/input/timing rules, assertions and all game files remain unchanged. No earlier evidence or other team's files were removed.

## Final native and green merge

Merged29568807 from clean4a3a9b44. Original memory-only/private51358 native16-view Summit High check passed exit0 in25932.1443ms, zero browser warnings/errors. Root inspected the actual frames.jpg: all16 main views are visible, including night views. All15 placed poses remain inside the open course with Course.phase equal to actual station. Fourteen targets are within0.59m; Engineer's Hairpin reaches the unchanged600-step guard12.73156m short, lateral20.2937m/speed0.53277mph. That picture shows trees, not black; no claim that all targets are exact or that the controller was fixed.

Canonical nearby21/21, zero failures/unrun, jobs4; build1.11s. Root independent source review CLEAR. Closed arithmetic and all game files remain unchanged. The native packet was generated before the investigation cutoff, not reconstructed from Claude's deleted scratch packet. No timing or visual art acceptance is inferred. Conflict-free merge needed no rerun. Owned lane and branch recycled/deleted after ancestry and clean-source verification.
