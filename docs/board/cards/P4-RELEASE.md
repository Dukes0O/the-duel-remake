# P4-RELEASE: Phase 4 releases in batches

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

```yaml
  - id: P4-RELEASE
    title: "Phase 4 releases in batches"
    owner: claude
    lane: DESIGN
    size: M
    needs: [P4-FINISH-PANORAMA, P4-GP-EXISTING, P4-CAREER]
    status: ready
    acceptance:
      - "Release in the batches of docs/CIRCUITS.md section 12, each after its finishing passes and Kyle's written approval, with the full release evidence."
```
