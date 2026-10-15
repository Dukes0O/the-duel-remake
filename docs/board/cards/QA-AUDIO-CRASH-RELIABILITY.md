# QA-AUDIO-CRASH-RELIABILITY

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

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

## Current actual setup fault,14 October

QA-BROWSER-SWEEP's two unchanged-game canonical c5 runs time out in Runtime.evaluate before23 PCM assertions;0pass/23hookFailed, no threshold waiver or actualaudio pass. Prepared tools-only standard-recorder/ES-loader plus existingcapture.json stage locator at9ff34067 on preserved codex/qa-browser-sweep remains UNRUN/unmerged. Start no repeat here until this existing card's priority allows it; retain both actualreceipt folders under .evidence/2026-10-14/QA-BROWSER-SWEEP/native-c5acbf61/audio and audio-rerun. No cause is proved yet, and QA-AUDIO-CLOCK is a different problem.


## New stage observation, stopped at the real probe failure

The one permitted real47fb630d execution completed its genuine first capture, then failed in the later actual-recorder probe with Runtime.evaluate timed out: exit1, wall96625.2104ms, zero of23 assertions reached. Report private port41277, memory-only true, issues and warnings empty. capture.json exists with native48000Hz and three actual contact rows; each mix/engine/impact track has153600 frames. It has no actualRecorder member. This proves only that the first capture returned and the later probe did not; its exact internal step and cause remain unproved. Do not infer autoplay, continuity, signal peak or final output acceptance.

Preserve the raw16,881,547-byte capture at .evidence/2026-10-14/AUD-CRASH-PEAK/native-2026-10-14T23-12-28-383Z/capture.json, SHA256011b474456345ea2d9843f79eab27a3f7cc47b7a2911f777600365bd76c98bfa, its report/browser log and QA-BROWSER-SWEEP/runtime-47fb receipts. A separate earlier invocation never opened a browser because Root's live log blocked Vite emptyOutDir (EBUSY,1936.3062ms); its logs are preserved there and the command output path was corrected. That is not a PCM attempt or audio cause.

Stop the recorder follow-up here under its existing bounded rule. QA's ready UI/reuse/comparator slice restores the two unpassed recorder setup files exactly to current integration; prepared9ff34067 and47fb630d history retain the candidate. No third capture, new bridge, changed recorder, timeout, tolerance or assertion is authorized here. This known tool fault does not hold unrelated feature merges; no audio pass is claimed.
