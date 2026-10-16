# YETI-FUR-TINT

The optional fur material colour is implemented; final night appearance is not accepted yet. Existing Yeti assets, rig, clips, geometry, texture maps, vertex colours, roughness, lights, emissive values, sighting rules and saves remain unchanged.

## Implementation

createYetiView accepts optional {furTint}. Omission retains the exact shared donor materials. For an explicit tint, each High/LOD actor clones only round-two-yeti-matted-ivory materials, reusing a clone for meshes sharing that original. Other materials stay shared; material arrays are replaced only where fur changed. Distinct views/qualities have independent owned clones, disposed once with their actor. Donor materials/textures/geometry are never disposed by a view. The seated roof path remains unchanged.

The renderer supplies neutral linear RGB(1.8,1.8,1.8) as a candidate brightness lift. Actual accepted GLBs use a white diffuse factor, so a conventional pale colour below1 would darken their textured fur. This lift preserves its texture and vertex-colour variation instead of replacing them or adding emissive light. Claude must judge the actual matched night-roar pair before this colour is accepted; it is not an art verdict or a new art round.

## Verification

New focused material tests failed first on the unmodified view at the owned-clone check. After implementation30pure ownership checks pass: exact omission, fur-only colour, shared textures/geometry, untouched eyes/teeth/donor arrays/colours, per-quality sharing, independent views, idempotent owned disposal, no donor disposal and race-state immutability. The fixture is a small flat ribbon for isolating materials; original actual accepted-model slope/animation/reward/save tests remain byte-for-byte. Additional actual accepted High/LOD tint/donor checks are appended to that existing suite and remain UNRUN. All three changed source/test files parse; diff check passes.

Applicable existing checks: test-yeti, test-render-reuse, test-render-readiness, test-p4-kits, then the canonical changed lane/jobs4 and production build; reuse any exact passing coverage instead of duplicating it. Actual night-roar pair and final independent source review remain pending. No heavy job, native race, browser, audio capture, frame run, live edit or release was launched for this card. The separate QA-YETI-THREE scenario owner/file stays untouched.

## Removed

Nothing removed. This optional view-only path replaces no donor asset, original behaviour when omitted, test assertion, race rule, geometry or old review evidence.

## Approved one-shot colour recipe prepared, unrun

Claude63c54565 approved tools/scenarios/yeti-fur-tint.mjs and three matched brightnesses original/1.4/1.8. Recipe reuses the actual menu P4KitsQa page modules, memory-only native App fixture and production autopilot, freezes only after an actual sighting reaches roar, then synchronously renders the same actor/camera at all three factors. Exact race/profile, rig/pose, material properties excluding only fur colour, geometry arrays and camera/light witnesses must stay equal; original candidate and camera restore in finally. Original GLB diffuse factors and source hashes are checked. No helper Vite bundle, Three duplicate, injected seen state, audio recording, frame timing or five-phase packet. It writes three raw JPEGs/receipt and one <=500KB labelled comparison sheet with no overwrite.

Source parses/diffclean only. No QA build, browser, native drive, picture, gate/build or final colour acceptance has run for this recipe. Existing84294d30 runtime46/46/build remains historical passed evidence, not a pass for this new source. Current integration union is conflict-free. Summit exclusive full hold prevents heavy validation. Exact additional existing discovery-filter/test hook is requested on card to keep this one-shot out of daily --all; no foreign runner edit before answer. Independent recipe review pending.

Required source review found a real failure-path ordering fault: a restoration assertion could throw before restoring camera, and the colour-excluding invariant could not prove fur restoration. Fixed with inner finally for unconditional camera restore and explicit exact original colour-array equality; receipt now reports that actual check rather than a literal true. Source parses/diffclean; reviewer confirmation pending. No browser/native/art capture or heavy check during release hold.

## Approved manual discovery hook

Claude's 16 October 08:30 card answer approves these two existing hooks. The default browser discovery now excludes only the two manual names, rustwall-frame and yeti-fur-tint. Explicit discovery still includes both, so the existing runner executes a requested fur comparison normally. No ordinary scenario, quiet scheduling, recorder, threshold, wrapper delegation or runtime source changed.

The existing discovery assertion now expects those exact two excluded names; it still proves no other scenario is hidden. Added assertions require the real fur recipe to remain available explicitly, and a mocked runner case proves --all omits it while explicit selection runs and reports it normally. This is the written, reviewed scope change on the card, not a dropped scenario result or a claimed photo pass.

The actual discovery regression failed first while the fur recipe was still included in --all. After the one-name filter change, all 14 existing/new pure browser-runner tests pass in 244.1549 ms. The tests use mock builds/children and filesystem name discovery; no QA bundle, browser, native encounter, build or lane gate was launched. The prior recipe review fixes were confirmed CLEAR on 562048b6. Capture, the changed-source lane/build and Claude's colour choice remain pending under Root's admission control.

Removed: the one-shot fur picture recipe from automatic nightly discovery only. Its source and explicit/manual invocation remain available; no accepted art or evidence is replaced.
