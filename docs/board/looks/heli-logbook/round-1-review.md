# HELI-LOGBOOK paints: round 1

26 October 2026. **For Claude's review. Paints are candidates; none is
accepted yet. Stop here before rounds 2 or 3, as Kyle requested.**

Picture: [round-1.jpg](round-1.jpg), 493,500 bytes. It compares the current
stock Kestrel One with all five paints in the production game renderer,
High and Performance. Every row uses the same home pad and side camera.
Near changes only the camera lens from 55 to 24 degrees; distance uses the
native side camera. No frame timing was run.

The five opaque 1024-square runtime colour maps are made by
`tools/blender/heli-logbook-paints.py`. They fit the existing Kestrel One
Blender airframe with metre-based side projection. The recipe's original
outputs were generated outside the repository and recycled after these
observations were recorded; the deterministic recipe recreates them.
`docs/WASTELAND_ART.md` records the full brief for each image;
the same document records the credits. No unused credits file is shipped.

Builder's observations for Claude:

- The five colour schemes and tail bands appear at both distances and
  qualities. Private is midnight blue with a silver waist line; the lodge
  is green and cream; Mountain is red and white; Gus is cream and red.
- The Commercial and Chief kestrels do **not** read clearly on the doors.
  The painted polygon crosses the existing model's glass/paint boundary,
  so its head is masked by the canopy material. A later approved round
  needs to move and size the motif within painted metal, or use a proper
  door decal. The two paints do not yet meet that part of the brief.
- Fine scratches, seam dirt and rain streaks are present in the maps but
  too subtle in this light. Claude should judge grit and reflective-band
  readability before a second round.
- The existing airframe, cockpit and mechanics remain unchanged. The
  raw Blender diagnostic views used the imported model's original UV layer
  before the review-layer wiring was corrected; they are not the verdict.
  This sheet uses the actual runtime projection.

Checks: `tools/test-heli-rank-paint.mjs` passes lazy loading, rapid paint
selection, UV projection, untouched glass, cached reuse and restoring the
existing material. `node tools/check-art-intake.mjs` passes. Separate
`inspectPng` validation confirms all five maps are 1024 square, opaque,
and below the recorded 1,500,000-byte limit (742,206 to 1,134,739 bytes).

The memory-only `heli-logbook-art` browser scenario passes on private port
33666: 25 pictures, zero errors or warnings. It photographs the shelf and
the 24 comparison views. No production storage or port 5174 was used.
The recipe is manual-only in browser discovery, so the nightly check will
not repeat an art round.

Changed existing assertions: `tools/test-heli-mode.mjs` adds
`heli-rank-paint.js` to its drawing-file regexp and set. This keeps the same
graphics/rules boundary for the new rendering module. The browser suite's
exact ordinary-versus-manual discovery difference now includes
`heli-logbook-art`; two added assertions require its manual-only status.
No existing behaviour limit or tolerance changed.

Removed: no old runtime art replaced. Diagnostic Blender renders and raw
browser pictures are disposable evidence; the recipes and this compressed
comparison sheet are the retained review record. No second round was run.

Gate repair: the Blender generator roster now registers this PNG-only recipe through its existing native-generator mechanism. Its `--paths-only` command returns the exact five runtime PNG homes with empty Blend, GLB and default evidence lists before importing Blender or NumPy. Standard-library-only Python planning is checked by the existing Blender output suite. Its generator-roster equality now includes this recipe; six new assertions check successful planning, no process error, no model outputs, exact PNG destinations and no default review output. No old assertion is removed or loosened. The failed suite alone was rerun: **87 checks, zero failures**.

Cleanup: recycled the created raw browser captures, diagnostic Blender renders, outside-repository original texture outputs, and unused runtime-folder credits file. Kept the round 1 sheet, these observations, the recipes and parent lane gate log.
