# SUMMIT-GALLERY-COVER

The short board entry controls current state, ownership, dependencies and locks.

Claude, 14 October night, from P4-FINISH-SUMMIT (round-4 sheet, top right
pair, "PROPOSED cover hook"). The Gallery's dark tent is the generic tunnel
rock cover drawn in `src/race-structures.js` `addTunnel`, hiding the pale
concrete shed. Add an opt-in `cover: false` on a tunnel that skips the two
`'rock'` geometry calls (every other tunnel unchanged), and set it on the
Summit Gallery. Tested in Claude's lane: the shed then reads as a pale slab
with a snow roof. Claude approves the Summit signature change in advance;
other rows stay exact. Lane tier, build, one review.


## Claimed narrow implementation

Integration was fetched and fast-forward pulled before this new card. Own summit-gallery-cover/codex/summit-gallery-cover, based on current integration; dependency junction points only to integration. Own src/race-structures.js addTunnel cover opt-out, Summit's galleries option in src/circuits/summit-run.js, additive existing tools/test-tunnel-detail.mjs assertions, the already approved tools/fixtures/world-signatures/summit-run.json row through the existing publisher, and docs/changes/SUMMIT-GALLERY-COVER.md. Acquire world-signatures only. The existing gallery spread already forwards this field, so no track-script-course, registry, collision, ground or busy-game-file edit is granted. Ordinary tunnels stay byte-for-byte visually exact unless cover is explicitly false; skip only the two rock geometry dispatches, retain lining/portals/detail/lights and physical tunnel behavior. Claude's existing round-four proposed-cover comparison and this card approve the Summit difference in advance; preserve every other signature row exactly. No new harness or released-course change. Source preparation may run alongside the original frozen Attack gate; tests/build use fresh heavy capacity and no active frame/release hold. One independent code review, nearby/jobs4 and build before merge; no clean-merge rerun.
