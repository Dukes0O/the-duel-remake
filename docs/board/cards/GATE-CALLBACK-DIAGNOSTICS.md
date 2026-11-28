# GATE-CALLBACK-DIAGNOSTICS

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: GATE-CALLBACK-DIAGNOSTICS
    title: "Prove audio capture delivery independently of callback clocks"
    owner: codex
    lane: TOOL
    size: S
    needs: []
    status: backlog
    claimed_by: codex-director-2026-10-04
    branch: codex/tools/callback-diagnostics
    owns: [tools/scenarios/audio-crash-peak.mjs, tools/test-audio-callback-diagnostics.mjs, docs/changes/GATE-CALLBACK-DIAGNOSTICS.md]
    helpers: [reviewer]
    acceptance:
      - "Retain each native callback's raw currentFrame and left/right input lengths with its existing chunk. Keep PCM copying, original frame labels and every existing assertion unchanged. Tests first cover ordinary and offset timestamps, input lengths and byte-exact PCM. No label repair, retry, skip, tolerance change or new framework."
      - "Add one silent native sine witness as a second input to each existing meter, copied in the same callback and sent in the same payload as game PCM. Use a period longer than each capture so whole-period losses cannot alias. Tests first prove missing or repeated 128-frame callbacks and 2048-frame payloads fail the witness while bad raw clock labels alone do not. Keep the original continuity result unchanged until independent native evidence and review justify any assertion migration."
      - "One source review and native capture identify what the evidence proves and leaves unproved. Lane and build gates precede integration. An unreliable check follows AGENTS.md rule 3; the full tier runs only at run end."
    test_commit: 603f651e
    source_commit: bf672f5e29208ab9fccf556b2add87c6dbcf7288
    source_review: "Independent review clears raw callback metadata. The native capture passes but catches repeated clocks inside full chunks; inputs have normal lengths."
    parked_lane_commit: 66560252
    note: "Claude parked this separate diagnostic card for the overnight run. Work on it only when no feature card can move; never change the crash-audio test, its assertions or tolerances."
```

## Claude answers

QA-AUDIO-SWEEP, 28 November 2026, `edad56dd0`: **same method, small**. The five focused callback tests pass (ordinary/offset clocks, missing/repeated 128-frame callbacks and 2048-frame payloads, short inputs, corrupt witness and byte-exact Float32 PCM). Isolated `test-audio-crash-peak` runs `crash-2/3/4` each pass 23/23 tests and 98 checks: all 12 native tracks have intact witnesses, despite 6/6/15 raw clock notes. Sample identity now decides continuity; labels and input lengths remain recorded. Copying uses `?? 0` to preserve signed zero, as settled for this sweep; no sound limit changed. Ready for Claude's assertion review.
