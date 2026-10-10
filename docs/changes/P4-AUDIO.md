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

## Listening and remaining work

Four labelled MP3 reels and their cue timestamp index are in ignored P4-AUDIO evidence: race signals; pit and surfaces; mountain hazards; crowd, summit wind and three location beds. These are processed recordings, not gameplay captures. Kyle's listening verdict remains pending.

The event follow-up changes only `src/audio.js`, this note and `tools/test-p4-audio.mjs`. Source catalog, audio assets and processing recipes are unchanged. Native browser audio checks, lane gate and build await Director scheduling. No merge, gameplay listening or complete P4 audio approval is claimed. Remaining cues become active only after their owning cards expose real events.

## Removed

No existing audio is replaced. Temporary review audio and raw derived files will be removed after the listening verdict is recorded. Future owner cards activate prepared cues as their events land.
