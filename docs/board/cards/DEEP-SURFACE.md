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
