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
## Preference and input implementation

Runtime source is `e3ae8ac`. The four independent runtime groups pass.
The affected existing controls ran once before review:

- Race settings: 42 checks passed.
- Input contexts: passed.
- Existing first-person controls/camera: 1 test passed.
- Career backup: stopped at its current-format fixture on line 67. That fixture
  writes an empty raceSettings object, which now correctly requires backup for
  the missing footCamera field. The independent author and Director are
  reviewing an exact fixture addition; no assertion was changed by the builder.

The additive named-player preference defaults to first-person and accepts only
first-person or overhead. Old or malformed raw values trigger the existing
verified pre-write migration backup. No new schema version or storage key is
used. Future Wasteland profiles retain their existing startup protection, and
this setter rejects them. Flag-off uses first-person without overwriting a
stored preference.

Foot KeyC changes only the presentation preference. Car cameraMode, car keys,
gamepad mappings, race choices and fighter input stay unchanged. Switching the
view does not clear held actions; pause and menu explicitly clear held mouse
look, fire and aim, including when pointer lock is already released. Menu also
releases an active on-foot pointer lock. Existing re-entry cleanup remains.

The independent author's approved exact saved-preference expectation adds only
footCamera: first-person; the old values remain. This matches the additive
schema rather than relaxing validation. Renderer, UI, camera geometry, browser
evidence and the final gate are separate pending work.
