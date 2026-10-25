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


## Full-check path fault, 15 October 05:09 PT

The original scheduled full check on detached1c0cb3d0 ran the discovered `audio-crash-peak` scenario through the standard shared QA bundle. It failed `Scenario path must stay in QA tools`, with memory-only saves, no console issues/warnings and no completed capture file. Report: `.evidence/2026-10-15/FAC-03/night-QwGun4/browser/audio-crash-peak/report.json`.

Read-only source comparison establishes this setup mismatch: `actualRecorderProbe` navigates to `/.evidence/.../recorder-probe.html`, while standard browser-harness navigation accepts only `/tools/` paths. The specialized test-audio-crash-peak wrapper normally builds a recorder entry and rewrites its private harness/config; the direct all-scenarios route does neither. Do not relax the standard navigation guard or pretend a PCM check failed. This is distinct from the earlier Runtime.evaluate timeout after the first returned capture; that older cause is still unproved.

Claude: please settle a narrow supported shared-entry/build route in the already owned scenario/test files before this card resumes. Preserve the real EngineAudio/recorder, every native assertion, all prior failures and standard QA path confinement. The prior no-third-capture/no-new-bridge stop remains: this observation came from the authorized daily batch, not a manual retry, and grants no new job, source, harness, timeout or tolerance change. The card stays low priority; no lane claimed. Source inspection ended within ten minutes.

## Claude answers - 15 October 05:20

`audio-crash-peak` needs its own wrapper (`test-audio-crash-peak`), which
builds the recorder entry; the shared all-scenarios route cannot run it, and
the QA path guard stays as it is. So mark it wrapper-only in browser-scenario
discovery (the same treatment as rustwall-frame), reported as "run by its
wrapper" rather than failed, and make sure the full check runs the wrapper
once (inside the full tier if it is already there; check). No new route, no
guard change, no assertion change.


## Wrapper coverage verified from the original full tier, Codex 15 October 05:18 PT

Claude's requested check is complete without executing anything: the original detached1c0cb3d0 full.log includes exactly one `tools/test-audio-crash-peak.mjs` suite, exit0, duration26516.8782ms. Its actual TAP result is23 tests/23 passed/zero failed/zero skipped, including `actual existing race recorder meters the final runtime audio output`. The source wrapper always runs native Chrome and prepares its private recorder entry. This is real wrapper coverage, not a source-only or skipped pass.

The later direct all-scenarios failure is an extra incompatible invocation; do not rerun the wrapper or reinterpret its23 passing checks as the earlier historical fault's cause. Exact evidence is `.evidence/2026-10-15/FAC-03/night-QwGun4/full.log`, result row `tools/test-audio-crash-peak.mjs`. The current full-check aggregate still retains the direct browser failure.

For the future allowed lane, Claude's discovery instruction names only `tools/run-browser-scenarios.mjs`, its existing `tools/test-browser-scenarios.mjs` cases and this card's own change note. Keep normal `/tools/` confinement and existing recorder/test assertions unchanged. The full tier already supplies the one wrapper invocation, so no extra full-check job, recorder route or duplicate native capture is needed. Report delegation as “run by its wrapper”, never as an executed browser pass or a silently missing scenario. Independent review and normal nearby/jobs4/build remain required. This names the narrow hook; no code, lane or job is started while the cleanup rule blocks new lanes.

## Ready independent discovery repair, 15 October night

Root readies the already approved narrow discovery repair under Kyle's instruction to continue independent code while frozen checks wait. The old cleanup blocker is resolved. Own only tools/run-browser-scenarios.mjs, tools/test-browser-scenarios.mjs and docs/changes/QA-AUDIO-CRASH-RELIABILITY.md; no core/save locks. Keep audio-crash-peak visible as delegated to its existing wrapper, with no executed browser-pass claim. Preserve explicit direct/manual discovery separately, standard tools-only confinement, all recorder/assertion/deadline behavior and the original failed batch. Existing full tier already runs its wrapper once; no wrapper execution, native capture or extra full-check job is needed. Existing runner mock tests will cover discovery, honest delegated counts and mixed real failure preservation, followed by changed lane/jobs4, build and one independent review.

## Source built and reviewed, waiting for gate/build

Clean owned lane codex/qa-audio-crash-reliability is frozen at7b18ab7f. Executable discovery excludes the wrapper-only recipe; both default and explicit shared-suite requests report delegation separately, never as an executed browser pass. The unchanged full-check consumer still receives exact executable names/count/rows. An initial review caught incompatible mixed rows; corrected in the same two owned hooks and independently confirmed CLEAR. Existing runner tests RED8pass/2newfail, corrected10/10PASS125.4712ms; all eight original tests/assertions unchanged. No recorder/guard/deadline/threshold/source wrapper/full-check change, native capture or duplicate23-check run. Canonical changed lane/jobs4 and production build remain UNRUN. Freeze with locks[] while actual shared capacity is full.

## Final canonical admitted

One actual changed-lane/jobs4/keep-going run on frozen clean7b18ab7f started2026-10-16T05:17:21.322Z: wrapper8344,exec51902. Its final-7b18ab7f/lane-receipt.json is pending in the owned lane. Source review confirmation is CLEAR; no duplicate manual wrapper/capture or23-check native run is authorized. Build follows actual green/sourceclean and fresh admission. This is no new browser or audio pass.

## Actual final gate and build green

Exact clean7b18ab7f final canonical18/18/jobs4/exit0/zero failures-notRun passed245811.3315ms; build2119.2214ms PASS on the same frozen source. Actual receipts are final-7b18ab7f/lane-receipt.json and build-receipt.json in the owned lane. Independent source/consumer correction review CLEAR. No native audio wrapper or capture was repeated; original23checks and old failed browser batch stay source-labelled historical facts. Root merges this narrow discovery repair now with no clean-merge rerun.
