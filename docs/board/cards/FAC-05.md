# FAC-05

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: FAC-05
    title: "Course counts read from the course list"
    owner: codex
    lane: TOOL
    size: M
    needs: [FAC-04]
    status: backlog
    locks: [circuit-registry]
    acceptance:
      - "The about 30 hard-coded course, flag, record and signature counts in 14 suites (test-circuit-layouts, test-feature-flags, test-wasteland-beta, test-reference-laps, test-replays, test-world-composition, test-storage-budget, test-release-tremblant, test-circuit-tremblant-snow, test-campaigns, test-opponents and the combat-course counts) derive from the course list; per-course price, flag and order checks move into test-circuit-<id>.mjs. Each changed assertion is listed in the change note and reviewed. A course switch flipped in a lane changes no shared test."
```
