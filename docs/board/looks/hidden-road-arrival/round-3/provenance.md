# EGG-03 arrival — scoped round 3 correction

Round 3 source `7ad8a32` adds the approved physical spur camera and removes
confirmed redundant presentation work. The immutable gate pose is cached per
road. The DOM wrapper requests HUD-only output, avoiding unused camera/spark
construction and repeated `poseAt(length)` / `course.nearest` work.

Independent red `b16de98` reproduced the real wash-camera defect. The physical
camera now follows actual car heading and support height on the spur, including
before departure. It preserves all seven modes, shortens views at the bank,
and leaves ordinary road/menu/flag-off behavior unchanged. All 11 independent
presentation checks pass, including A/B/C bank and support clearance.

Private port 10785 retained three images with zero warnings/errors. The
`motion-supplement/` folder contains the actual canvas WebM and time-labeled
frame strip from the same recording. The strip reads immediately after a
production render, fixing the previously blank asynchronous WebGL read. It
shows the gate passage and inside orbit; DOM dialogs are excluded from video.
The legacy Mad Max departure view is now above ground in the wash, with its
weapon HUD faded. Root-level `round-3.png` is the contact sheet.

## Preserved invalid cost attribution

The original R3 pairs reported High CPU p95 2.2→2.6 ms and Performance
1.5→1.7 ms. Inspection found that the disabled fixture skipped the entire
existing `app.onFrame` HUD, so those differences include ordinary HUD work.
These pairs, and the same earlier R2 fixture, are invalid for attributing
gate-specific cost. Their raw rows remain unchanged. They are not proof of a
feature regression or a successful gate-specific budget check.

## Final narrow correction

Source `bc60aa4` keeps the physical spur camera as the base whenever a cinematic
blend is below one. This fixes the independent review's arrival/Turn-back
transition jump. It adds a QA-build-only presentation hook that skips only
`hiddenRoadUi.update`, with no simulation mutation. The corrected fixture runs
the same existing `app.onFrame` and ordinary HUD in both conditions. It resets
the QA hook and temporary renderer/RAF changes in `finally`.

`final-correction/` is a separate immutable result on private port 49199: four
screenshots, zero warnings/errors, real early-arrival and Turn-back snapshots,
and one corrected 120-frame stationary pair per quality. Turn-back camera
movement across 0.7917→0.8083 seconds is **0.00399 m**, resolving the roughly
10 m discontinuity identified in review.

| Quality | Total presentation CPU p95 | RAF p95 | Render-call CPU p95 | Draws | Triangles |
| --- | --- | --- | --- | --- | --- |
| High | 2.6→2.5 ms | 18.2→18.1 ms | 1.7→1.7 ms | 205→206 | 437,677 |
| Performance | 1.6→1.7 ms (+6.25%) | 18.3→18.2 ms | 1.1→1.3 ms (+18.2%) | 121→122 | 280,573 |

The total CPU and RAF pair stays within 10%. The Performance render-call
submetric exceeds 10%; it is retained without claiming every metric passed.
This is a short CPU submission sample, not GPU timing or a broad course matrix.
Draw/triangle totals differ from the earlier rounds because final camera
framing changes culling. Each corrected pair uses the same stopped scene and
camera, with one extra spark draw and unchanged triangles.

R2 audio source is unchanged and its actual PCM/plots remain the audio evidence.
No new subjective listening or whole-race audio acceptance is claimed. A final
fixture-only cleanup moves missing-hook validation before renderer wrapping;
it does not change the measured path or production source. Director scoring
and release gates remain separate from this builder's report.
