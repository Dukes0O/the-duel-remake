# JANITOR-LANE-PATH

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: JANITOR-LANE-PATH
    title: "Keep worktree exclusions stable across branch changes"
    lane: TOOL
    size: S
    needs: []
    status: backlog
    owns: [tools/repo-audit.mjs, tools/build-status.mjs, tools/test-repo-audit.mjs, tools/test-build-status.mjs, docs/changes/JANITOR-LANE-PATH.md]
    helpers: [test_author, reviewer]
    acceptance:
      - "Add a tested absolute-worktree-path exclusion so a protected external worktree remains uninspected after its owner changes branch. Retain exact branch exclusions and never inspect the live checkout."
      - "Use registry-only fixtures to prove status and audit do not issue status/file probes in an excluded path on a renamed branch. Keep advisory inventory and safe cleanup semantics."
    note: "End-run inventory observed external audio now registered as lane/audio/aud-17-picks. The old aud-10-only skip no longer matched; its attempted Git status returned unknown, with no file contents reported. Remaining calls explicitly skip both names plus Kyle's audio branch. No external worktree cleanup is authorized."
```
