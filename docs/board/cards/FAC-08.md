# FAC-08: Drive-through check for new courses

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

```yaml
  - id: FAC-08
    title: "Drive-through check for new courses"
    owner: codex
    lane: TOOL
    size: M
    needs: [FAC-04]
    status: backlog
    acceptance:
      - "A headless lap per difficulty on a named course flags the car leaving the road surface, passing through a solid barrier, and objects whose base floats above the ground. It catches the 11 October Tremblant faults on the pre-fix commit (grass over road, drive-through barriers, floating barn) and passes on the fixed course."
```
