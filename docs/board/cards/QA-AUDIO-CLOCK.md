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

## Explicit daylight exception and bounded retention claim —15October

Kyle explicitly answered Allow one audio-clock lane after automatic approval rejected the first new-lane action; that rejected command did not run. New qa-audio-clock/codex/qa-audio-clock starts from current integration and owns only existing tools/scenarios/p4-audio.mjs and ownnote. The already settled diagnostic addition retains original expected/actual frame labels and actual four neighboring raw chunks (previous two, disputed and next) for every existing stem before the unchanged continuity demand throws: original PCM, independent witness and complete callback headers. This is a small exact neighborhood, not a saved whole segment/race. Expose it through the existing recorder closure and persist in the existing Node finally before stop. Retention errors are explicit and never waive/replace the original continuity failure. No worklet/clock/frame/sample/assertion/deadline change, fill, resampling, invented witness, new harness or runtime audio/renderer change.

One genuine private memory-only whole-mode existing scenario capture on changed source is allowed within this30minute diagnosis, fresh holds and shared heavy cap. No prefix substitute or repeated attempt. If no anomaly recurs, cause stays unproved. If retained chunks expose it, classify only actual PCM/witness/header facts and settle a minimal fix on this card before further source. Do not repeat full check/wrapper23passingtests or reclassify historical failures. Nearby/jobs4/build and one independent code review precede any retention merge.

## One changed-source native result —15October afternoon

Source77d63a9e retention independently CLEAR and build passed. Its only native whole-mode capture FINISHED PASS/private24193/memory-only/zero issues or warnings, actual native GP first place/three laps/eight cars/154.73s. Recording statuscomplete,9segments at actual44100Hz, frames[61312,7912576), each stem62810112bytes. Unchanged native continuity, independent sample identity, event signal and full-race assertions passed. Actual mix−16.59LUFS/−2.36dBTP meets existing advisory whole-mix targets; engine−20.58LUFS is a separate stem, not a failed master target. No listening approval or renderer/frame claim.

The128frame anomaly did NOT recur, so no clock-failure packet exists and its failure-only persistence path was not exercised by this native run. The historical failed attempt was48000Hz; this run is44100Hz. That difference is reported, not a sample-rate cause or waiver. Original daily batch remainsfailed; no oldattempt recovered or retroactively green. Stop native diagnosis here, no secondcapture or blindretry. Narrow retention can preserve actual evidence in a future naturally failing existing run; cause/remedy remain unproved and the overall card staysopen. Current21suite nearby/jobs4 is running on frozen77d63a9e, with no crash-audio wrapper selected or repeated. Final receipt will name its actual result before any retention-only merge.

Retention-only frozen77d63a9e is now green for integration: nearby21/21/jobs4/zero failures-unrun/306999.1478ms; production Vite build reported2.32s; independent source review CLEAR. No native crash-wrapper suite was selected. Merge only this useful evidence-retention step, not a claimed clock fix or completed overall card. Keep this card low/backlog for actual future discontinuity evidence; no second manual capture is authorized now. Preserve the actual current whole-mode packet under integration evidence before recycling only the new owned audio-clock lane.
