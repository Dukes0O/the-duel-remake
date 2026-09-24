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
