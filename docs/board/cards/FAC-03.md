# FAC-03: Night shift and morning report

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

```yaml
  - id: FAC-03
    title: "Night shift and morning report"
    owner: codex
    lane: TOOL
    size: M
    needs: [FAC-01]
    status: building
    owns: [tools/night-shift.mjs, tools/test-night-shift.mjs, tools/run-tests.mjs, tools/test-test-runner.mjs, tools/scenarios/frame-pacing.mjs, tools/combat-balance.mjs, tools/test-combat-balance.mjs, docs/changes/FAC-03.md]
    acceptance:
      - "One command runs, alone: full tier jobs 4, frame check per AGENTS rule 8, combat balance with wasteland2 off and on, all browser scenarios. Writes docs/board/checks/night-<date>.json and a morning report under twenty lines that names, for each failure, the first merge after the last green night. Kyle creates the Windows scheduled task himself; the card writes the exact command for him."
    claimed_by: codex-factory-2026-10-12
    branch: codex/fac-03

    night_hooks: "Director before code: lane selection omits only explicit proven native browser/frame, full balance and Blender-heavy suites; full discovery/acceptance stays exact, pure unit suites stay daytime. Use existing runner tests, no import-wide exclusion. Existing frame-pacing gets a night-only simple mode: released Harbour Lights night GP grid, actual eight cars, High then Performance once each, delivered p95 <=18.5 ms and construction <1 s on quiet awake idle laptop; generic mode unchanged. Existing combat-balance gets explicit --wasteland2 off|on propagated through simulationFlags, default behavior/assertions exact. Use existing combat tests for that flag; no runtime feature-flag/source edits."
```
