# DEEP-SURFACE

## Design settled before code

Sea-floor is zone data in SURFACES only. The existing course.gripKindAt reader selects it only while the-deep is enabled. DEEP-ZONE owns the real journey and that reader; this lane adds no production zone or circuit. SURFACE_KINDS stays exact, so road scripts reject sea-floor. Director grant 1a8e2249 also restricts the existing checkSurfaceRules piece/patch predicates to that list, so sea-floor cannot become a circuit patch. isSurface still recognizes all SURFACES including zone data; diagnostics and all prior circuit validation stay exact.

The asphalt tyre column supplies grip .75 (winter .75 x .94), hint SEA FLOOR. The car keeps its own handling: a strict 70% top speed ceiling including boost, 60% engine/boost/reverse thrust, and normal braking scaled by grip. Turning drag means the existing passive drag rate multiplied by 1.4 at full steering, interpolated to the normal rate at zero steering. No ordinary arithmetic or output changes.

_jump already owns gravity and landing. Player sea-floor flight works for every car with gravity 6 instead of 18. Landing emits deepLanded {speed, cue: deep.sand-land} once, leaves damage/lives unchanged and returns before arena jump rewards. The frozen DeepAudio adapter reads a truthy deepLanded payload and plays deep.sand-land; no audio edits are needed.

## Validation

Acceptance tests authored first. Initial red run: all four tests failed on absent sea-floor data, traction, gravity and switch-off normalization (1.5 s TAP). Corrected the new test listener to the existing onChange(state, event) API before implementation; no existing assertion changed. Exact source and lane/build evidence are handed to Root. Browser, frame, combat balance and full checks belong to the night shift. No circuit data, ordinary fingerprints or existing assertions are changed.

## Removed

Nothing replaced. No production test zone, dependency, scratch copy or new test machinery added. Root owns lane cleanup after handoff.
