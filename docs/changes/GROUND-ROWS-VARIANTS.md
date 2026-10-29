# GROUND-ROWS-VARIANTS

`tools/test-ground-rows-exact.mjs` failed on integration after VARIANTS-RELEASE switched on five course versions: its fixture held drawn-ground hashes only for the courses live when it was recorded, so panorama-ridge-night had no entry (the lane tier of VARIANTS-RELEASE did not select this suite). Fix forward (Claude, 28 October 2026): `--record` on the merged code adds the five versions' entries. The diff is 55 added lines and no removed or changed line, so the 20 existing pins are exactly as before. The bit-for-bit height check passed on all 25 courses before recording.

Tests: test-ground-rows-exact passes (25 courses).

## Removed

Nothing.

## Claude's review (28 October 2026, night)

Fix forward for a suite the VARIANTS-RELEASE lane tier did not select. Only additions to the fixture; existing pins unchanged (rule 18 written review: nothing loosened).
