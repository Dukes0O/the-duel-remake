# QA-AUDIO-CLOCK

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

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


## Read-only recorder preflight, 15 October 01:20 PT

No lane or capture started. Current tools/scenarios/p4-audio.mjs checks chunk frame labels before its independent sample-identity check; it throws on the reported128-frame anomaly before that disputed interval can be classified from PCM. The existing worklet includes per-callback currentFrame, chunkOffset and input lengths as well as the independent witness. Those are the right existing signals; source inspection alone proves no cause. The P4-AUDIO note records consumed prefix PCM/raws deleted after review and no whole PCM existed; its integration evidence directory currently has no files. Neither historical failed attempt is called metadata-only or repaired.

When a lane is allowed, first settle the smallest diagnostic addition in this card's existing scenario: retain the actual disputed block PCM, witness and callback headers before the unchanged continuity assertion throws. Keep the original failure and every identity/loudness/peak assertion; no fill, resampling, relabelled timestamps or passing whole-race claim. A genuine current-source recording and its measured witness are still required. No recorder code, source witness, test, capture, gate/build or acceptance changed in this preflight.
