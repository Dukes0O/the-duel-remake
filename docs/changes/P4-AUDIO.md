# P4-AUDIO

## Decision

Prepare all 17 named CIRCUITS section 9 cues and three track beds from licensed library recordings. The beds are `ambient.harbour-night`, `ambient.forest-morning`, and `ambient.mountain-wind`. All 20 definitions use the `grand-prix` switch. Keep existing cue records and prior source credits unchanged.

Use selected CC0 or CC BY recordings. Keep raw previews outside the repository. Record author, source page, licence, checksum and repeatable processing recipe. No paid generation or runtime network access.

## FIELD event contract

Director approved this contract before code. FIELD is merged at ae6acfa2. Use its real `startLight`, `lightsOut`/`go`, `positionGain`, `finalLap` and completed Grand Prix `stageResult` signals. Scope delivery to the actual field object. Five numbered lights, go, final lap and finish each play once. Position gains may repeat later, but duplicate delivery of one transition may not. Check the live field transition and simulation time without changing simulation or adding event IDs.

Observe events even while muted, paused or audio is locked, so resume does not replay old cues. Late recording decode also leaves missed events silent. Stop tracked race voices on mute, pause, stage replacement and exit. Stop earlier race cues before the finish flourish, which may finish naturally on the results screen. A repeated stageLoaded event for the same field does not reset delivery.

Ordinary countdown and results retain their existing cues. Completed Grand Prix finish uses its flourish at every finishing position; failures keep the ordinary loss cue. Remaining prepared cues await their owners' events. Do not invent simulation events or edit those owners' files. Future continuous loops must stop on pause, mute and stage exit, and repeated updates must not create duplicate voices.

## Evidence

- Foundation acceptance first failed because P4 recipes were absent. A later RED caught disabled assets being fetched; the loader now skips them. Late-activation RED caught zero new cues fetched after enabling Grand Prix on an existing renderer; a P4-started marker extends only the new batch. Settled/in-flight loading and repeated toggles pass without old asset refetches.
- All 20 actual decoded recordings pass source/runtime checksums, bounded duration, peak/RMS, loop boundaries and disabled-feature loading. Two builds from unchanged cache produce identical Vorbis bytes and catalog records. Runtime size: 1,185,427 bytes. Largest decoded peak: 0.71836.
- Full pre-P4 bank and catalog hashes remain exact. Independent comparison with base 7d1fb965 confirms every prior catalog field and record is unchanged. Historical arsenal filters exclude only the approved 20 IDs; original expected hashes and assertions remain unchanged.
- Event RED: the real Grand Prix stageLoaded signal played three old countdown cues under duplicate delivery instead of staying silent until its first light. The native FIELD acceptance now passes five light ticks, go, later position regains, final lap and completed second-place finish, including same-object and copied duplicate events.
- Mute, pause, suspended audio, paused state, late decoding, stage replacement, menu event/update and natural-end cleanup pass. Ordinary countdown/win/loss and Grand Prix failure fallback pass. Actual `_playCue` / `_runCue` / `_sample` scheduling uses the decoded recordings and proves one native source per expected cue, prompt stopping and released voice sets.
- Race state is unchanged during every observed event. A seeded 12-second race with duplicate audio delivery has the exact same full-state fingerprint as the race without audio: `e3d4a72558781ba5c6c00e74a9199cac2348a6357eb10bd666776c91e63c711a`.
- Focused checks pass: P4 AUDIO; Audio/PCM 460 checks with 617,062 finite automation commands; Arsenal core 14; Arsenal wave one 36. `git diff --check` passes. Director's source review found no blocker.
- One new fixture initially lacked Web Audio node methods when the deterministic drive reached a real car contact. The test device substitute now implements those methods. No assertion or tolerance was relaxed. Earlier Windows FFmpeg pipe closure was fixed by reading verified cache paths directly.

## Native browser design

Director added `tools/scenarios/p4-audio.mjs` to AUDIO ownership. Use the production App, Duel and EngineAudio on a private harness port with disposable memory storage. Wrap the real audio event and source methods only to observe native delivery, decoded AudioBuffer samples, started sources and cleanup. Preserve their return values and behavior. Start the genuine eight-car, three-lap Grand Prix with fixed seeds, then use its real-time fixed-step and ordinary autopilot controls through the finish. App.advance is reserved for the later lifecycle checks. Do not shorten laps, move cars, inject results or modify simulation fields.

Replay the same real fixed-step inputs in a separate graphics-free Duel with identical start options and no audio listener. Compare the final race fingerprint. Check audio leaves race state unchanged during each event. Require five native light ticks, one go, a real position gain, one final-lap signal and one genuine completed finish, without legacy countdown/go/win/lose doubles. Copied delivery checks may repeat an already observed event to the sound manager only.

Then exercise actual App pause/resume and menu/stage transitions plus audio mute and suspended-context resume. Check native decoded sources stop and release, missed events do not replay, and fresh fields get fresh starts. This is functional browser evidence; no frame timing or listening approval is claimed. Scenario additions require a fresh lane gate and build on final source.

## Recorded race plan (Director approved)

The source reels and accelerated native observer are not a gameplay mix recording. Before integration, record a genuine real-time eight-car, three-lap Grand Prix through ordinary App autopilot and fixed-step controls. Keep the current native event and exact input-replay witnesses. Do not alter the lap count, car positions, simulation state or finish result. Bound the attempt to ten minutes of wall time and any recorder diagnosis to thirty minutes.

Reuse the unchanged `tools/audio/capture-witness.mjs` AudioWorklet, independent witness generator and sample-identity inspector. Tap the actual post-output mix, engine bus and interface bus. Establish recording before the real campaign starts and retain every native cue plus the complete finish tail. Assert their actual audio times lie within retained PCM. Rotate overlapping captures about every twenty seconds, within the existing ninety-second witness source. Establish each segment only after all three meters deliver consecutive native blocks. Close the earlier segment on the next segment's absolute native sample frame. Prove witness identity, frame continuity and equal boundaries on every stem; discard only setup samples and exact overlap. Never fill, resample, relabel or conceal missing samples. Save joined native-rate PCM and metadata in ignored P4-AUDIO evidence.

Record actual AudioContext times for native events and source starts, and per-frame race time, revs, throttle, speed and status. Measure the joined race mix and stems with existing `measurements.mjs` LUFS/true-peak functions. Measure interface onset against native event times and interface/engine level during each cue; report overlap when another interface cue prevents isolation. Record repetition by cue/source identity; the five deliberately identical light ticks remain explicit. Existing decoded-asset checks cover loop boundaries; listening stays pending. Keep functional, recorder-integrity and measured-mix verdicts separate.

Director approved this QA order to avoid repeating the full lane for recorder repairs: finish the owned recipe, syntax/build, root source review, then a scheduled native run. Freeze the proven recipe and run the required final lane tier and build before integration. Earlier lane runs were interrupted, not passing evidence.

## Listening and remaining work

Four labelled MP3 reels and their cue timestamp index are in ignored P4-AUDIO evidence: race signals; pit and surfaces; mountain hazards; crowd, summit wind and three location beds. These are processed recordings, not gameplay captures. Kyle's listening verdict remains pending.

The event follow-up changes only `src/audio.js`, this note and `tools/test-p4-audio.mjs`. Source catalog, audio assets and processing recipes are unchanged. Native browser audio checks, lane gate and build await Director scheduling. No merge, gameplay listening or complete P4 audio approval is claimed. Remaining cues become active only after their owning cards expose real events.

## Removed

No existing audio is replaced. Temporary review audio and raw derived files will be removed after the listening verdict is recorded. Future owner cards activate prepared cues as their events land.
