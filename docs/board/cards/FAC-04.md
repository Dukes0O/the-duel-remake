# FAC-04

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: FAC-04
    title: "Course kit: a new course is added by adding its own files"
    owner: codex
    lane: SIM
    size: L
    needs: [FAC-01]
    status: building
    locks: [circuit-registry, reference-laps, replay-fixtures, world-signatures]
    owns: [src/circuits/index.js, src/feature-flags.js, src/course-access.js, src/race-field.js, start-preview.bat, src/generated/reference-laps.json, tools/build-reference-laps.mjs, tools/replays/, tools/test-world-composition.mjs, docs/changes/FAC-04.md]
    design_decision: "Claude, docs/FACTORY.md section 5. Each circuit file exports {id, flag, state, price, grandPrix, releaseOrder, driver}; index.js discovers circuit files (import.meta.glob in Vite, readdir in Node) and sorts by releaseOrder; stage numbers derive from release order. Flags, prices, Grand Prix list and preview flags spread from the manifests. Reference laps, replay cases and world signatures become one file per course; the salt-flats hash covers only non-circuit fixtures. Every replay fingerprint and world signature value stays exact."
    acceptance:
      - "Adding a test circuit file plus its own reference lap, replay case and signature files registers it with no edit to any shared file. All existing fingerprints, signatures, prices, flags and course order are exact. Lane tier and build pass."
    claimed_by: codex-factory-2026-10-12
    branch: codex/fac-04
```

## Director scope grants, before code

Manifest exports only in the four existing circuit files; new
src/circuit-manifests.js; src/reference-laps.js and per-course generated JSON;
tools/preview-flags.mjs; per-course replay cases and world-signature JSON;
new pure tools/course-fixtures.mjs; the existing replay reader; narrow salt-flats
and arena-pit ordinary replay hash consumers; Blender file-presence path;
existing circuit-layout, Tremblant Snow, preview-launcher and reference-lap
tests, plus new tools/test-course-kit.mjs. No FAC-05 count sweep.

Director refinement before further generator code: preserve each authored
definition's original stage exactly. The registry sorts the course array; actual
COURSE positions derive from that array, as before. Do not rewrite definition
stages or the shared generators. This also preserves the existing legacy active
race entitlement fallback. The seven additional seed-site hooks are not needed.
The new card test checks ordered positions and original generation separately,
with samples, features and all original fingerprints and signatures exact.
No runtime dependency, handling, saved id, released price or state changes.
