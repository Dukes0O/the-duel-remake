# FAC-07

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: FAC-07
    title: "Browser checks: build once, run side by side"
    owner: codex
    lane: TOOL
    size: M
    needs: [FAC-01]
    status: building
    owns: [tools/browser-harness.mjs, tools/run-browser-scenarios.mjs, tools/test-browser-harness.mjs, tools/test-browser-scenarios.mjs, docs/changes/FAC-07.md]
    acceptance:
      - "run-browser-scenarios builds the QA bundle once per run into its own folder and runs scenarios at most four at once with private ports and profiles. Lanes run only scenarios the change touches. Every scenario result is unchanged."
    claimed_by: codex-factory-2026-10-12
    branch: codex/fac-07

    test_scope: "Director before code: existing harness test plus one named pure runner test prove build-once, private shared QA bundle ownership, at most four children, deterministic result order, failure propagation and owned-folder recycling after every child drains. Keep all scenario assertions unchanged. CLI --all/--output-dir retained; add --jobs 1..4 and --scenarios for touched-only runs. Shared bundle is read-only to children and belongs to this run; no real browser check during implementation."
```
