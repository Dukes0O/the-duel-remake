# FAC-03

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

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
      - "One command runs, alone: full tier jobs 4, frame check per AGENTS rule 8, combat balance with `combat-balance.mjs --check` on current rules (Claude 12 October: wasteland2 was retired by BALANCE-W2-OFF-RETIRE, so there is no off run), all browser scenarios. Writes docs/board/checks/night-<date>.json and a morning report under twenty lines that names, for each failure, the first merge after the last green night. Kyle creates the Windows scheduled task himself; the card writes the exact command for him."
      - "After a passing night full tier: compact binaries (SPEC 0.8, tools/compact-binaries.mjs) and push integration/wasteland with --force-with-lease (D8). A failing night pushes nothing."
    claimed_by: codex-factory-2026-10-12
    branch: codex/fac-03

    night_hooks: "Director before code: lane selection omits only explicit proven native browser/frame, full balance and Blender-heavy suites; full discovery/acceptance stays exact, pure unit suites stay daytime. Use existing runner tests, no import-wide exclusion. Existing frame-pacing gets a night-only simple mode: released Harbour Lights night GP grid, actual eight cars, High then Performance once each, delivered p95 <=18.5 ms and construction <1 s on quiet awake idle laptop; generic mode unchanged. Combat balance is one existing `combat-balance.mjs --check` run on current rules (Claude 12 October; no wasteland2 flag exists); default behavior/assertions exact; no runtime feature-flag/source edits."
```

## Director scope grant, before headed frame code

After FAC-07 merges, FAC-03 may add only a headed option and actual launch,
context and report metadata to tools/browser-harness.mjs, with additive checks
in tools/test-browser-harness.mjs. Default headless behavior and every existing
assertion stay exact. The official simple frame stage uses the existing harness
in actual headed mode and refuses headless, hidden, busy or undeclared awake
context. No browser-harness edit runs alongside FAC-07's ownership.
