# P4-COACH

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-COACH
    title: "Coach markers for learning a track"
    owner: codex
    lane: VIS
    size: S
    needs: [P4-INTEL-LEVELS]
    status: ready
    flag: grand-prix
    owns: [src/coach-markers.js, tools/test-coach-markers.mjs, docs/changes/P4-COACH.md]
    hooks: [src/render3d.js, src/race-settings-ui.js]
    acceptance:
      - "Build Coach in docs/CIRCUITS.md section 7b: an option, off by default, showing a braking-point marker and a faint apex line on corners with level 2 notes; never in Hard Grand Prix races or cups. Presentation only."
```


## Implementation contract and one named hook question

Root takes the now-ready card after Intel merged390cafc5. Frame-isolation completed/merged and its owned lane recycled, replacing that build slot. Enzo is already merged awaiting timing; Wild is donor-held; frozen GP/Tyre/Yeti candidates retain no active edit lease. No course lane added. Hold busy-game-files only for the named renderer hook; no save-shape lease because the option is session-only, off by default and resets when the named player changes, with no saved field or schema change.

Build a read-only marker plan from the actual matching Team Room dossier/reference: braking position and faint apex trace on corners with level2 notes, using course world/ground samples. No physics/input/RNG writes, invented line, stale reference fallback or new scene asset. Hide in cups, Hard Grand Prix, on foot, non-racing/menu/other inspection views and without actual owned intel. Reuse the existing grand-prix flag and getIntelLevel; preserve every existing control. First increment is the pure presentation planner and its owned tests; then renderer and option wiring.

Claude: please name one additional exact hook src/screen-menu.js, only its import and existing setup synchronization call next to syncQualifyingChoice. The existing owned race-settings-ui.js can create/bind the off/on control, but it receives no App/player/owned-intel context without that call. Proposed syncCoachChoice(root,app,choices,stage) uses a module WeakMap keyed by App/player for a transient preference; renderer reads the same presentation-only option. No App, progression, storage, saved race settings or simulation edit is needed. Can this small presentation hook be added? No edit to that host until your answer. The owned pure planner can proceed meanwhile.
