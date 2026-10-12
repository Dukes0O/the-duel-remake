# QA-AUDIO-CLOCK: Native audio recorder clock diagnosis

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

```yaml
  - id: QA-AUDIO-CLOCK
    title: "Native audio recorder clock diagnosis"
    owner: codex
    lane: AUDIO
    size: S
    needs: []
    status: ready
    owns: [tools/scenarios/p4-audio.mjs, docs/changes/QA-AUDIO-CLOCK.md]
    design_decision: "Claude check-in5: separate low-priority one30-minute diagnosis after track work; prove metadata error versus actual PCM loss from native clock/identity witnesses, retain all original assertions and raw attempts. No fill/resampling/tolerance waiver; not a P4-AUDIO merge blocker."
    acceptance:
      - "Prove the native discontinuity cause with actual recorded PCM and AudioWorklet clock witnesses, then settle the smallest fix before code. Preserve original assertions and both failed attempts. Complete current-source whole-race capture must pass unchanged continuity and meet about -16 LUFS with at most -1 dBTP for this recorder follow-up to pass; P4-AUDIO is independently approved."
```
