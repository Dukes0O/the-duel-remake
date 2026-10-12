# P4-INTEL-LEVELS

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-INTEL-LEVELS
    title: "Team Room: earning intel levels and the reference ghost"
    owner: codex
    lane: RACE
    size: S
    needs: [P4-INTEL-TELEMETRY, P4-CAREER]
    status: ready
    flag: grand-prix
    owns: [src/intel-levels.js, tools/test-intel-levels.mjs, docs/changes/P4-INTEL-LEVELS.md]
    hooks: [src/screen-team-room.js, src/grand-prix-career.js, src/ghost.js]
    acceptance:
      - "Build the four intel levels in docs/CIRCUITS.md section 7b exactly, per event and named player, with the stated ways to earn them, and the level 4 reference ghost in Time Trial. Settles once; additive save fields; old saves unchanged."
```
