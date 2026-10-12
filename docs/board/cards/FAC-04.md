# FAC-04: Course kit: a new course is added by adding its own files

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

```yaml
  - id: FAC-04
    title: "Course kit: a new course is added by adding its own files"
    owner: codex
    lane: SIM
    size: L
    needs: [FAC-01]
    status: ready
    locks: [circuit-registry, reference-laps, replay-fixtures, world-signatures]
    owns: [src/circuits/index.js, src/feature-flags.js, src/course-access.js, src/race-field.js, start-preview.bat, src/generated/reference-laps.json, tools/build-reference-laps.mjs, tools/replays/, tools/test-world-composition.mjs, docs/changes/FAC-04.md]
    design_decision: "Claude, docs/FACTORY.md section 5. Each circuit file exports {id, flag, state, price, grandPrix, releaseOrder, driver}; index.js discovers circuit files (import.meta.glob in Vite, readdir in Node) and sorts by releaseOrder; stage numbers derive from release order. Flags, prices, Grand Prix list and preview flags spread from the manifests. Reference laps, replay cases and world signatures become one file per course; the salt-flats hash covers only non-circuit fixtures. Every replay fingerprint and world signature value stays exact."
    acceptance:
      - "Adding a test circuit file plus its own reference lap, replay case and signature files registers it with no edit to any shared file. All existing fingerprints, signatures, prices, flags and course order are exact. Lane tier and build pass."
```
