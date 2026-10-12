# P4-SUMMIT-ATTACK: Summit Time Attack

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

```yaml
  - id: P4-SUMMIT-ATTACK
    title: "Summit Time Attack"
    owner: codex
    lane: RACE
    size: S
    needs: [P4-SUMMIT, P4-AVALANCHE]
    status: ready
    flag: summit-run
    owns: [tools/test-summit-attack.mjs, docs/changes/P4-SUMMIT-ATTACK.md]
    hooks: [src/circuits/summit-run.js, src/circuits/index.js, src/ghost.js]
    acceptance:
      - "Build Summit Time Attack in docs/CIRCUITS.md section 5.4: alone against the clock and your ghost, bronze, silver and gold times set from test-driver runs on Medium, avalanche seeded by the start, the yeti may appear."
```
