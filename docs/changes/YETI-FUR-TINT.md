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