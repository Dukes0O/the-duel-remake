# FAC-08

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

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

## Director design and scope, before code

Own tools/drive-through.mjs, tools/test-drive-through.mjs and
docs/changes/FAC-08.md. Optional pure tools/course-ground-checks.mjs may
reuse the existing triangle and object-footprint checks, with no existing
test assertion changed. No runtime file, save, generator, course layout,
asset, signature or replay fixture change. Use the FAC-04 registry by id.

Run one native headless lap per easy/medium/hard difficulty on a named
course, memory-only storage set before imports, normal native driver and
seed. Record non-finish and car leaving the actual road surface, swept
solid-barrier passage, drawn ground over the road and object bases floating
above drawn ground. Reuse the existing circuit-ground/barrier thresholds
and real triangles, not analytic-only terrain. Add bounded barrier-contact
probes if ordinary centre-line driving never reaches the known defect.
Prove the three original Tremblant faults on the real pre-fix commit and
pass the actual fixed course, using isolated historical source in an owned
.qa-dist fixture, never editing live or the shared integration source.
Record the exact source/seed/profile and each verdict. This card explicitly
requests the new checker; no unrelated scenario or framework is authorized.
First write the exact native-lap/probe design and tests, then implement.
If the real fixed course does not pass, preserve the failure and stop at
30 minutes on that problem; do not create a slow driver or weaken bounds.
