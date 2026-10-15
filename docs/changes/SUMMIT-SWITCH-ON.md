# SUMMIT-SWITCH-ON

Task: SUMMIT-SWITCH-ON. Status: held unmerged on an actual clearance-contract failure; no release or preview install. This lane alone sets Summit/Yeti on and Summit snowWorld.always; integration stays unchanged until accepted.

The closed-loop seamless/phase assertions are preserved verbatim inside course.closed. Open courses instead get real endpoint-clamping and nearest-position/lateral assertions across three lateral offsets, local/negative/past-end hints and five stations. A direct actual start projection with length+25 hint returned length14219.9546078104 instead of0; the generic nearest tail now unwraps hints only for closed courses. No geometry/sample change or closed behavior change.

After the first open checks passed, the unchanged horizontal road sweep falsely marked the authored gallery roof as contact: road584m, underside589.0163634m. The existing sweep deliberately uses2D when no body height is supplied; production sim-contacts supplies grounded height for verticalClearance roofs. This suite now supplies the existing1.35m body height/useModelBounds:false only for authored overhead flags, with the same horizontal envelope and every unflagged sweep unchanged. A lowered-copy roof case must still contact; no obstacle is skipped. Director named this exact hook on the card. This model correction still needs independent review.

## Actual remaining blocker

The same unmodified shared tunnel assertion requires width>=8 and height>=7. Summit gallery reports width5 and height5.056112670898438, matching its authored descriptor (the route is10m wide). The suite now reaches this failure on Summit/1989. Do not lower/skip the assertion or change the accepted gallery model without Claude settling the authored-gallery versus legacy tunnel contract. All grade, ground-continuity, clearance and obstacle assertions remain; the full four-seed shared suite did not complete. The branch is preparation, not a gate pass.

Feature-switch suite86passes. Direct open-nearest failure was reproduced before its fix. No world-signature capture/update, final-source canonical lane, build, independent review or release checks were run; they remain required after the clearance decision. Every other baseline, Tremblant Snow and snow-world dev state remain untouched. Attack inherits Summit state/descriptor already; no child runtime edit.

## Removed

Replaced only the invalid open-course closed-lap premise and open nearest lap unwrapping. No old closed assertion, runtime model or source asset removed. No new harness or runtime dependency.

## Claude's settled Gallery contract, 15 October

The accepted roof is unchanged. Summit now declares full clearance width 10 m and actual underside height 5.056112670898438 m. The shared geometry test requires this width across the whole gallery, at least 4.5 m headroom and at least 1 m over every admitted car. All garage cars can race Summit; Titan is tallest at 3.6 m, so the effective minimum is 4.6 m. Physical width/height must also meet the declaration. Every generic tunnel retains the exact old width>=8 and height>=7 assertion. This is Claude's explicit 16:00 test-model approval, not a relaxed generic tolerance. Closed-loop assertions, all four seeds and all grade/ground/obstacle loops remain. Current integration was merged cleanly before this change. Final checks and signature remain pending.

The next generic wall-tag assertion also exposed a model mismatch: authored Gallery colliders carry trackWall/sourceBounds/kitS, not generic tunnelWall. Director settles this existing-test hook before implementation: retain the old tunnelWall assertion exactly in the generic branch; for authored galleries require every placed non-roof source bound to exist with positive physical dimensions and prove a vehicle sweep actually hits each one. Existing native grounded/airborne/entrance-pillar tests remain unchanged. No runtime tag, collider, model, scene or wall is altered. This assertion-model change needs the same independent review.

Enabling the shared Summit switch also enables summit-time-attack, which has no existing signature because it has never been enabled. Director extends the already named world-signature hook to tools/fixtures/world-signatures/summit-time-attack.json: capture this real scene separately with the parent; never copy a guessed hash. The existing --capture mode records scenes, so only that explicit mode omits the pre-existing-baseline-count demand; ordinary comparison keeps its exact count assertion and every scene equality. No new capture option or framework. All unrelated captured signatures must match their existing fixtures before either Summit fixture is written.

## Current verification

Original four-seed geometry suite passes: 164654 checks across 22 enabled events, legacy maximum grade 14.9%, expansion 27.9%. Real existing composition --capture records both Summit scenes with hash a574e548c9f6ca7ecb856dcc2ea5105507338b19cd6f790455fc935b173c6a5e (666 nodes, 641 meshes, 21123 instances), identical to the accepted parent signature; all 20 unrelated enabled scenes exactly match their fixtures. Only the newly enabled Attack needs a new fixture. No visual change or new art round is inferred. Canonical lane, build and final review follow on the frozen source; no full/release/browser/frame result claimed.
