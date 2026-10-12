# P4-FINISH-PANORAMA: Claude's finishing pass: Panorama Ridge

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

```yaml
  - id: P4-FINISH-PANORAMA
    title: "Claude's finishing pass: Panorama Ridge"
    owner: claude
    lane: DESIGN
    size: M
    needs: [P4-PANORAMA, P4-REVIEW-TOOL]
    status: ready
    acceptance:
      - "docs/CIRCUITS.md section 11: review with the tool, tune src/circuits/panorama-ridge.js directly, small Codex cards for code needs, postcard sheet to Kyle."
```
