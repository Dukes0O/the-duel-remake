# DEEP-SURFACE

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: DEEP-SURFACE
    title: "Driving on the sea floor"
    owner: codex
    lane: SIM
    size: M
    needs: [DEEP-LOOK]
    status: ready
    flag: the-deep
    owns: [tools/test-deep-surface.mjs, docs/changes/DEEP-SURFACE.md]
    hooks: [src/race-surfaces.js, src/sim-driving.js]
    design_decision: "Claude, THE_DEEP 10.1: sea-floor in SURFACES only (not SURFACE_KINDS), tyre column asphalt, grip .75, top speed 70% of the car's own, acceleration 60%, turning drag 1.4x, gravity one third, landings never damage, hint SEA FLOOR, cue deep.sand-land.
    acceptance:
      - "The 10.1 numbers hold in Node for every car scaled from its own handling; every other surface and every fingerprint exact."
```

## Director parallel claim — 12 October 2026

Codex session01a1325c-da51-7ad3-90a3-dccce8964fdd holds surfaces in its own deep-surface lane. This settled source card uses only its owned test/note and sea-floor entry/reader in race-surfaces.js and sim-driving.js. Root owns metadata, review and integration. If gravity or landing requires another file, identify the existing hook before edits; no silent scope extension. Keep SURFACE_KINDS, circuit surfaces, switch-off behavior and ordinary fingerprints exact. One nearby lane/build and independent code review; actual heavy native/balance/frame/browser checks wait for night. Summit must acquire all its locks together after this source handoff as well as GP and Save.

## Director circuit validator grant before edit â€” 12 October 2026

The sea-floor SURFACES entry must never become a circuit road or patch. Existing track-script already selects SURFACE_KINDS, but checkSurfaceRules in race-surfaces.js currently calls broad isSurface, so adding the zone entry would accidentally admit a sea-floor circuit patch. Grant that existing function's two piece/patch validation conditions to use SURFACE_KINDS directly. Leave isSurface as the complete SURFACES identity reader. Preserve every prior accepted/rejected surface and diagnostic; add a meaningful sea-floor circuit-patch rejection check in the owned test. No other validator or circuit source edit. Existing sea-floor-only linear full-steer1.4 drag on DRIVE.dragCoeff, optional output multipliers and gated course.gripKindAt reader are settled; ordinary arithmetic and output shapes stay exact. All further test execution waits the safer two-job capacity after automatic launch review rejected the third slot.