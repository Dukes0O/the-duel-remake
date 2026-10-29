# NISSAN-SKYLINE-GTR-R34-V2: shape round 1

## Changed

Original Bayside Blue R34 code builder using the 959-S helpers and F1 vehicle
contract. Long bonnet, boxy wedge, short boot, flared arches, upright coupe
cabin, tall separate wing, four round tail lamps, slim headlights, large front
intake and five silver split spokes. Red calipers, twin tips and left-seat
driver follow the packet. No maker mesh, texture or badge.

The nissan-skyline switch starts in dev. Asset registration requires it; there
is no shop or config entry. This lane's preview flag row includes the switch,
as its unchanged test requires. The launcher was not executed. No handling,
save, car pool, sound, world or other vehicle changes. Direct offline factory
calls remain available for art review, like the other builders.

## Checks

- `node tools/test-skyline-vehicle.mjs`: 272 checks pass; 56,577 visible
  triangles and 48 draws, below 60,000/56. Driver, steering, four wheels,
  exposed lights, paint, helmet clearance, grounding, directional damage,
  glass fracture, crush, exact reset and sibling isolation covered.
- `node tools/run-tests.mjs --tier lane --changed --jobs 2`: all 60 selected
  suites covered by passing results. Initial run: 18 pass, one failure,
  40 unrun, 214.99 s. After the exact flag-test correction: 24 pass, preview
  launcher fails, 16 unrun, 129.80 s. After its one-line flag row correction:
  18/18 pass, zero unrun, 179.42 s. This last batch includes the newly
  selected Tremblant snow suite. Only failed and unrun suites resumed with
  `--filter`; passing suites were not repeated.
- Replay fingerprints unchanged: 225 checks, 25 cases, 23 events, three FPS
  values and three runs. Combat replays: 12 checks over four encounters.
  World composition: 47 exact-scene and immutable-feature checks pass.
- `npm run build`: pass, 600 modules, 1.36 s. The first invocation could not
  find vite.cmd in the linked dependencies. A temporary lane-local command
  called the already installed Vite CLI through the unchanged npm script.
  No dependency install or shared node_modules edit. Existing chunk-size
  and mixed static/dynamic import warnings remain.
- Independent code reviews: clear, including body refinements, the exact
  test assertion and preview flag row.
- Four matched model/reference views inspected. Sheet: 259,070 bytes;
  requested scratchpad copy verified byte-identical by SHA-256. Self-review
  resemblance 3/5; five remaining differences are in the review note.
- No browser scenario, frame timing or real player storage access in this stage.
  The sheet clearly labels Blender renders of the real builder geometry.

## Changed assertions

Only tools/test-feature-flags.mjs changes an existing assertion: 41 fixed
switches becomes 42, and nissan-skyline joins the names required to stay dev.
Every existing state and retired-name guard stays. This exactly accounts for
one new dev switch and does not loosen the test. Independent review agrees.
Claude's written AGENTS 18 review is pending on the card before merge.

The new model test adapts the F1 contract to the R34 envelope, left seat and
stricter size budget. Its initial 280 checks became 272 because merging four
wheel material bins removed four visible meshes, each checked for vertices
and normals. No check or tolerance was removed or relaxed. F1 frame recipes
were not copied into a shape test.

## Removed

No existing vehicle or code path replaced. Review GLB and four renders went
to the Recycle Bin after self-review. The temporary command shim and generated
build also went to the Recycle Bin. Only the comparison sheet, verdict and
repeatable recipes remain. No runtime binary added.

## Handoff

Stop after round 1. Claude's art judgment and written assertion review remain
pending. No merge, push, release, frame measurement or live-game action.
