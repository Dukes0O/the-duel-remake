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

## Original daily batch failure, 15 October 05:45 PT

The unchanged scheduled batch on detached `1c0cb3d0` failed p4-audio at the native mix continuity assertion, segment 5: expected frame 5383296, actual/chunk frame 5383168 (128 frames earlier). The error retains previous chunk labels and callback headers; the callback list jumps from 5383168 to 5383424. Those labels alone do not prove PCM loss or a metadata error. Report: private port 21665, memory-only, headless, issues and warnings empty. This is the sixth reported browser failure; the whole batch is still running.

Retain the actual packet at `.evidence/2026-10-15/FAC-03/night-QwGun4/browser/p4-audio/`. Its recording.json is explicitly incomplete: five saved segments, 48 kHz, frames [138496,4994176). Each of mix.f32, engine.f32 and interface.f32 is 38845440 bytes. These are a saved prefix, not the disputed segment [4994176,5960448), not its disputed PCM/witness, and not a completed whole-race recording. p4-audio.json and the original report/error are also retained. Historical deleted attempts remain unavailable; this new automatic attempt does not recover them or establish their cause.

No capture, retry, source edit or new lane was launched. Existing cleanup blocks a new lane. The next permitted work remains the previously settled diagnostic retention before the unchanged assertion throws, using this existing scenario and witnesses. Preserve all continuity, identity, loudness and peak assertions; no fill, resampling, relabelling, metadata-only waiver or whole-race pass. No new source triage was repeated.
