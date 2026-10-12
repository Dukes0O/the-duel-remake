# DISC: Discovery audits

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

```yaml
  - id: DISC
    title: "Discovery audits"
    wave: 1
    lane: Discovery
    size: continuous
    needs: [FND-05]
    status: building
    note: "Renderer ghost lifecycle finding merged as 10645f2; 147-suite merge gate, build, private High/Performance smoke and focused ghost-lifecycle browser scenario pass. Discovery continues."
    spec: "SPEC.md, task DISC"
    janitor_follow_up: "The resumed audit confirms all twenty-five flagged exports are used inside their modules. No unused module, removed-behavior test or safe asset deletion is proved; CLEAN-11 retains the dynamic-asset and future dirt-texture questions. Preserve the five unmerged lanes, licensed and current assets, and skip the three protected audio references."
    private_output_follow_up: "Claude approved fresh output folders and create-new files for Vesper. No additional alias matrix or system change is needed; the fitting card carries the small export fix."
```
