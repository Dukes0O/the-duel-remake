# P4-COACH: Coach markers for learning a track

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

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
