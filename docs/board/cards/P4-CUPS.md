# P4-CUPS: Cups and the trophy case

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

```yaml
  - id: P4-CUPS
    title: "Cups and the trophy case"
    owner: codex
    lane: RACE
    size: M
    needs: [P4-CAREER, P4-SUMMIT, P4-VARIANTS, P4-TREMBLANT-SNOW, P4-GP-EXISTING]
    status: ready
    flag: grand-prix
    owns: [src/grand-prix-cups.js, src/screen-trophies.js, tools/test-grand-prix-cups.mjs, docs/changes/P4-CUPS.md]
    hooks: [src/grand-prix-career.js, src/screen-courses.js, src/screen-garage.js, src/app.js]
    acceptance:
      - "Build the cups in docs/CIRCUITS.md section 7: Mountain, Night and Winter Cups and the Grand Tour, points 10 to 1 with the tie rule, saved per named player, abandonable, settled once, cup bonus pay, and the garage trophy case. Additive save fields; old-save fixtures load unchanged."
```
