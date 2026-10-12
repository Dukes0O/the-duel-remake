# QA-AUDIO-CRASH-RELIABILITY: Investigate intermittent native crash-audio capture failure

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

```yaml
  - id: QA-AUDIO-CRASH-RELIABILITY
    title: "Investigate intermittent native crash-audio capture failure"
    owner: codex
    lane: TOOL
    size: S
    needs: []
    status: backlog
    priority: low
    owns: [tools/scenarios/audio-crash-peak.mjs, tools/test-audio-crash-peak.mjs, docs/changes/QA-AUDIO-CRASH-RELIABILITY.md]
    design: "Rule 3 follow-up only. On unchanged a9575dd4, the first qualifying lane failed meter continuity and the sixth blast was 0.667 ms beyond the original overlap window. The complete logged repeat passed all 23 native checks in 24.23 s. No audio/game assertion or tolerance changed; cause remains unknown. Original raw failed capture and metadata are hash-verified under .evidence/2026-10-12/QA-AUDIO-CRASH-RELIABILITY/a957-failed-capture; derived WAV/pictures are regenerable. Do not hold feature merges or start this tonight."
    acceptance:
      - "Use existing raw packets to establish a reproducible cause within 30 minutes. Preserve every assertion and threshold; scope any proposed fix before code. No new machinery unless this card is amended explicitly."

  # The factory (docs/FACTORY.md, Kyle 12 October 2026). Cards are graph nodes:
  # needs are the arrows, locks are the shared files (FACTORY section 2).
```
