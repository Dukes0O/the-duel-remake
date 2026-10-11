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

## Native replay adapter correction

The first real-time run stopped on a native frame discontinuity after two valid segments. A diagnostic retry recorded the entire genuine race: nine segments, 8,627,456 frames at 48 kHz, with exact native continuity and independent sample identity for all three stems. Its full-state replay assertion then found only `results` and `hiddenRoadDiscovery` different. The native App adds discovery metadata and Grand Prix reward/balance fields; the graphics-free Duel did not run those App callbacks. Original failed hashes remain in ignored evidence; neither run is a functional pass.

Director approved a narrow correction before code: give the no-audio Duel a disposable adapter with cloned starting player/profile and the same native switch provider. Run the actual App discovery sync on its native events and the actual App settlement method only for a genuine Grand Prix result. Require its Grand Prix branch, zero save calls, an unchanged cloned profile and exact reward/balance/discovery values. Keep full-state value equality as the assertion and retain both raw serialization hashes; do not remove fields, copy final state or alter either race. This adapter supplies the missing native App presentation lifecycle to the independent replay.

## Recorded listening copy plan

Director added `tools/audio/p4-listening.mjs` to this follow-up. Add an exported offline builder and `--recorded-mix <native-evidence-directory>` mode. Keep the existing four source reels, cue arrays, default path and positional CLI unchanged. Require the completed native harness, functional and recorder-integrity metadata before encoding. Check the full float WAV agrees with its recorded native rate, channels, frame count and source PCM. Encode that whole WAV with the existing codec helper and libmp3lame, without filters, normalization, cuts, cue substitution or a rate change. Write source/output SHA-256 digests, the exact recipe and relative cue timestamps in `listening.json`. Preserve the original WAV/PCM and pending human-listening status. Syntax-check and run this offline builder on the already verified capture; no further native attempt is needed.

## Completed native evidence

- Corrected source `ca2c7786` passed the private browser scenario on port 42343 with memory-only storage, zero warnings and zero errors. The genuine eight-car, three-lap race finished first in 154.73 simulation seconds. Five lights, one go, four actual position gains, one final-lap signal and one finish each used the decoded native recording once; legacy race cues stayed silent.
- Pause, mute, stage replacement, menu exit and suspended-context resume passed native source stopping, voice release and missed-event suppression. No simulation fields or results were injected. The control adapter handled 39 native events, made zero saves and preserved its cloned starting profile.
- Full-state **value** equality passed across the union of every key on both states: no differences. Raw whole-object JSON hashes differ because the native App and replay adapter insert top-level metadata keys in a different order. Race serialization SHA-256: `8729622640fa6686def2fd92a175e177bf0e225aeafbde4cfff5aeebc020409f`; control serialization: `c0a532937c256631ca47a77b74868e1679de42f971bfbcd5ce00128bdea2c093`. Do not report these as equal serialization hashes. No comparison field was removed or copied to obtain the value equality.
- The complete 171.144-second capture retained 8,214,912 native frames at 48 kHz across nine segments. Mix, engine and interface all passed exact sample boundaries, continuous native frame coverage and independent witness identity. Recording began before the real stage load and includes every signal's full tail.
- Actual mix: -22.42 LUFS and -4.25 dBTP. Its loudness is outside the advisory -16 ±2 LUFS target; true peak passes the -1 dBTP ceiling. Engine stem: -20.56 LUFS / -5.76 dBTP. Interface stem: -16.64 LUFS / -2.64 dBTP. No volume or mastering change was made to make the advisory pass.
- Measured cue onsets range from -3 to 107 ms; the final-lap signal is 107 ms. Interface/engine RMS ratios range from -1.92 to +19.07 dB. The first gain overlaps the go tail and is labelled as aggregate interface signal. Repetition advisory flags the five identical start ticks and four identical gain recordings. Kyle accepted this current native race mix on 11 October: go with it; no level or repetition changes requested.
- `node tools/audio/p4-listening.mjs --recorded-mix .evidence/2026-10-10/P4-AUDIO/native-ca2` verifies the complete metadata, exact float WAV/native PCM agreement and decoded MP3 rate, channels and all 8,214,912 frames. The 2,243,709-byte whole-race MP3 is unnormalized and unedited. WAV SHA-256: `db956124a60195a877db95a9e17f47d2bbcb7c9dce489947c4ae2eac7ffd1f28`; MP3 SHA-256: `da5e661d89e79a74a59852ed8058d1b720e20c3be44ef76cfb998a9bbc32e2d6`. `listening.json` preserves the recipe and cue times. The existing four-reel cue arrays, builder and default path remain byte-for-byte unchanged.
- Offline decode first exposed 47 MP3 padding frames when input bytes were piped to FFmpeg. Reading the actual seekable MP3 file applies its gapless end-padding metadata and decodes exactly the native frame count. No tolerance, trimming or audio filter was added. Syntax and diff checks pass. Final frozen source c331f6db passed 376/376 lane suites in 1086.89 seconds and the sequential build in 668 ms; zero failed or not run.

## Listening and remaining work

Four labelled MP3 reels and their cue timestamp index are in ignored P4-AUDIO evidence: race signals; pit and surfaces; mountain hazards; crowd, summit wind and three location beds. These are processed recordings, not gameplay captures. The source reels remain available for future owner events; the current native three-lap race mix was accepted by Kyle on 11 October.

The event and QA follow-up changes `src/audio.js`, `tools/test-p4-audio.mjs`, `tools/scenarios/p4-audio.mjs`, the recorded-mix mode of `tools/audio/p4-listening.mjs`, and this note. Source catalog, runtime audio assets and source processing recipes are unchanged. Functional browser, recorder integrity, final lane gate and build passed; Director source review is clear. Integration merges this foundation. Kyle accepted the current complete native three-lap gameplay recording on 11 October. Complete P4 event wiring remains open. The other prepared cues become active only after their owning cards expose real events.

## Louder mix, 11 October

Kyle requests -16 LUFS, about 5 dB louder, with true peaks at most -1 dBTP.
Use gain after the existing compressor and before its oversampled ceiling.
The original -22.42 LUFS whole-race measurement gives an initial +6.4 dB.
Bus balance, compressor timing, cue assets, events and race state stay exact.
The actual new whole-race recording determines the final gain. Kyle listens
again tomorrow; earlier acceptance covers only the earlier quieter mix.

Changed assertion: the native quiet tone keeps its unchanged released
reference, but now expects exactly +6.4 dB in peak and RMS. The existing
0.1 dB tolerance remains. This tests the requested output change; every
ceiling, contrast, onset, continuity and lifecycle limit remains unchanged.
Independent review clears the gain and this exact expected-level change.
Native peak stress, whole-mix measurement and lane/build remain pending.
Initial audio460 and P4-assets checks pass.

## Removed

The direct compressor-to-ceiling connection is replaced by the output gain. No existing audio is replaced. The bare-Duel replay setup was replaced with the native App metadata adapter; no state-comparison fields were removed. Temporary review audio and raw derived files will be removed after the listening verdict is recorded. Future owner cards activate prepared cues as their events land.
