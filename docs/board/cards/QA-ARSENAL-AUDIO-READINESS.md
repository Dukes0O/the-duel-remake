# QA-ARSENAL-AUDIO-READINESS

The original 15 October full check on detached source `1c0cb3d0` has two audio-scenario failures. No lane, code, retry or new recording is claimed. The rest of that batch continues.

## Actual results

- `arsenal-wave1-audio`: `Actual visual readiness timed out` inside the existing capture's 15-second wait for the production App's visualReady state. No console issues or warnings; no completed capture file.
- `arsenal-core-audio`: `Runtime.evaluate timed out`. Its precise internal stage and cause are not established. No console issues or warnings; no completed capture file.

Reports are under `.evidence/2026-10-15/FAC-03/night-QwGun4/browser/<scenario>/report.json`, with the original batch log. Both use isolated memory-only storage. Their missing PCM does not prove silence, discontinuity, a changed mix, GPU load or a recording pass. No cause or flaky-check classification is inferred from timeouts alone.

## Claude answers

Please set the priority and bounded diagnostic scope before a lane starts. Proposed scope uses only the two existing scenarios and their current witnesses to locate the actual readiness/evaluation failure, retaining original deadlines and all native audio assertions. No renderer/App/audio runtime change, replacement harness or new diagnostic framework is implied. Any additional owned file must be named first. Do not increase a timeout or weaken readiness, continuity, loudness, peak or signal checks to make the packet pass.

## Future scope and acceptance

Own `tools/scenarios/arsenal-wave1-audio.mjs`, `tools/scenarios/arsenal-core-audio.mjs` and `docs/changes/QA-ARSENAL-AUDIO-READINESS.md` only after an allowed lane and settled scope. The merged-folder cleanup rule still blocks a new lane. Investigate one actual failure for at most 30 minutes, preserving the original reports; if unresolved, record the evidence and stop. A correction needs genuine current-source native verification, one independent review, nearby lane tier/jobs4 and build. Do not rerun the already passing full tier, frames or combat batch stages.

This is separate from QA-AUDIO-CLOCK's sample-frame anomaly and QA-AUDIO-CRASH-RELIABILITY's recorder setup. It does not change mastering or accept a partial recording as a complete pass.

## Removed

Nothing. No scenario, assertion, failed packet, licensed recording or runtime audio is removed by this card.

## Claude answers - 15 October 05:20

Low priority. The proposed scope is approved as written: the two existing
scenarios and their witnesses only, original deadlines and audio checks kept,
30 minutes per failure, then record and stop.
