# STORY-NIGHT-TESTS

The two story tests now switch on `kogane-pass-night` (merged in KOGANE-PASS-C7-VERSIONS), so the duel and the Skyline grant run on the real Night road.

- `tools/test-story-kogane-duel.mjs`: the QA switch list gains `kogane-pass-night`. Curve on the Night road, 30 duels each: Easy 30/30, lesson-pace 10/10, Medium 11/30 (37%), Hard 7/30 (23%), identical to the day road (same road and physics, only the light differs).
- `tools/test-story-hooks.mjs`: the QA switch list and the partner switches gain `kogane-pass-night`; the grant through the real App now runs (144 checks, was 141). Test players already past the delivery (and the newer-save and switch-off players) are given the found Night version with a `foundNight` helper, because the delivery always finds it in the same change as the supplies mark.

## Changed assertions

None changed. Three setups gain the found Night road so their existing checks start the race they were written for; without it the race could not start at all on a road the player does not own. Nothing loosened (Claude, rule 18).

## Removed

Nothing.
