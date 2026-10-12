# P4-SNOWMEN

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-SNOWMEN
    title: "Snowmen to smash"
    owner: codex
    lane: RACE
    size: S
    needs: [P4-SNOW, P4-SUMMIT, P4-CAREER, P4-TREMBLANT-SNOW]
    status: ready
    owns: [src/snowmen.js, src/snowmen-view.js, tools/test-snowmen.mjs, docs/changes/P4-SNOWMEN.md]
    hooks: [src/destructibles.js, src/screen-results.js, src/grand-prix-career.js, src/circuits/summit-run.js, src/circuits/tremblant-snow.js, src/track-script-course.js, src/game.js, src/sim-contacts.js, src/track-kits.js, src/render3d.js, src/audio.js, src/feature-flags.js, tools/test-feature-flags.mjs]
    acceptance:
      - "Build the snowmen in docs/CIRCUITS.md section 5.4: 12 on Summit Run and 8 on Tremblant Snow, in runoffs and outside hairpins, never on the racing line; burst with carrot and hat through the existing destructible scenery; 25 credits each, at most 10 paid per race, shown on results. Snowman model from Kyle's pick."

    design_decision: "Director before code: use the approved snowman model and its real hat and carrot. Authored placements are outside the racing line: 12 on Summit and 8 on the actual Tremblant Snow definition. A moving car can break each snowman once; soft snow causes no crash or armor penalty. Only player hits count for pay: 25 credits each, at most 10 paid, through completed-race settlement exactly once. Quitting, restarting and qualifying pay nothing. CPUs can break them without earning player credits. Reuse the existing snowman.burst sound. The renderer reads hit poses and time to draw white snow, the hat and the carrot; it never changes counts or race state. Pure rules and presentation may split into the two owned modules. Money, caps, duplicate settlement and malformed counts need independent save review. Keep old tree/sign behavior exact, and use a dev switch until ready."
```
