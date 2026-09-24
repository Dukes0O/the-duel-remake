# CAM-01: on-foot camera choice

## Independent runtime red contract

The preference is separate from the existing car camera: validated
`raceSettings.footCamera` defaults to `first-person`, with `overhead` the only
other value. App set/cycle methods preserve simulation input and car view.
Foot-only KeyC toggles it; no gamepad mapping is added. Named-player storage,
flag-off effective default and the pre-write backup seam remain required.

Before implementation, `test-onfoot-camera-choice.mjs` ran four runtime groups:
0/4 passed in 0.19 seconds, with expected absent preference, migration detection,
App mode and KeyC failures. All storage is synthetic memory. The existing exact
saved-preference assertion in `test-race-settings.mjs` adds only the approved
`footCamera: 'first-person'` field and retains every previous value. This
intentional additive-schema assertion will be independently reviewed.

Pure pose/aim acceptance follows in the same owned suite. Existing short
race-settings, input-contexts, onfoot-controls-camera and backup checks will run
once against completed source before any broad gate. Browser checks and source
review cover actual body/gear switching, reticle wiring and navigation cleanup.

## Independent presentation red and assertion review

Added three bounded presentation groups to the same suite: unchanged exact
first-person pose plus real behind/above overhead placement; final actual-eye
terrain/tunnel clearance across all eleven combat courses; and aim-ray
projection through actual Three cameras, including overhead parallax. Inputs
are frozen and repeated poses are exact. The terrain group uses two road
positions per course and one actual tunnel midpoint where available. Bounds
follow the existing 0.65 m ground and 0.45 m arch margins, with a short boom.
No simulation targeting or weapon rule is changed by this contract.

Before presentation source existed, the combined suite ran 5/7 in 0.88 seconds:
runtime work had already made its four groups green, while overhead-behind and
missing aim helpers remained red. The terrain control already passed for the
old first-person eye; the separate overhead assertion prevents that control
from falsely proving the requested new mode. Actual body/gear/reticle wiring,
metrics invalidation and navigation remain independent source/browser review.

The Director independently reviewed `8f73859` and approved the exact existing
race-settings assertion change: only `footCamera: 'first-person'` was added,
with every previous value and assertion retained. No other old test changed.