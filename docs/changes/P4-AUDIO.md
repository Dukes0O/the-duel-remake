# P4-AUDIO

## Decision

Prepare all 17 named CIRCUITS section 9 cues and three track beds from licensed library recordings. Use the exact cue IDs in the acceptance test. The beds are `ambient.harbour-night`, `ambient.forest-morning`, and `ambient.mountain-wind`. All 20 definitions use the `grand-prix` switch. Keep existing cue records and prior source credits unchanged.

Race signals come first: a short light tick, a distinct go signal, a rising position-gain cue, a final-lap signal, and a finish flourish. Pit sounds use a limiter pulse, recorded tool rattle, and release cue. Surfaces use subdued recorded gravel, snow and ice loops. Mountain hazards use recorded rumble, slide, creature voice and snow impact. Location beds remain quiet beneath engines and event cues.

Download only selected CC0 or CC BY recordings. Keep raw previews outside the repository. Record author, source page, licence, checksum and repeatable processing recipe. No paid generation or runtime network access.

## Playback contract

Add bank assets first. Wire start lights, position gain, final lap and finish only after P4-FIELD lands and exposes its event contract. Wire remaining cues when their owning cards land; do not invent simulation events or edit those owners' files. Continuous loops must stop on pause, mute and stage exit, and repeated updates must not create duplicate voices. Audio must not change simulation or saves.

## Listening

Produce four labelled listening clips: race signals; pit and surfaces; mountain hazards; crowd, summit wind and three location beds. Send clips to Kyle. Measurements establish duration, clipping and reproducibility; they do not substitute for listening approval.

## Validation

Before implementation: acceptance test pins all pre-P4 bank and catalog data and requires 20 licensed, compressed cue assets with bounded duration and matching checksums. RED confirmed before implementation: no P4 source recipes existed. A second RED witness caught all 20 disabled assets being fetched; the loader now skips disabled Grand Prix cues. Single-thread offline processing was authorized after checking no full or balance run was active. Browser checks, lane gate and build await Director scheduling.

Compatibility tests may exclude only the exact 20 new cue IDs from their historical bank/catalog views. Keep original expected hashes and assertions unchanged. The new test independently pins the full pre-P4 data.

## Removed

No existing audio is replaced. Temporary review audio and raw derived files will be removed after the listening verdict is recorded. Future owner cards activate prepared cues as their events land.

## Current evidence

- Focused test passes all 20 actual decoded assets, source/runtime checksums, duration and peak/RMS, loop boundaries, disabled-feature loading and repeated-load deduplication.
- Two builds from unchanged cache produce identical Vorbis bytes and catalog records. Runtime size: 1,185,427 bytes. Largest decoded peak: 0.71836.
- Full pre-P4 bank and catalog hashes stay exact. An independent deep comparison with base 7d1fb965 also confirms every prior catalog field and record is unchanged. The historical arsenal filters exclude only the approved 20 IDs; their original expected hashes/assertions are unchanged.
- Four MP3 audition reels and their cue timestamp index are in ignored P4-AUDIO evidence. They contain recorded source clips, not gameplay captures. Kyle's listening verdict is pending.
- Event wiring, native pause/mute/stage-exit/repeated-event checks and race fingerprints remain pending until the event-owning cards land. This foundation is not a claim that P4 gameplay audio is complete.
- Fixed Windows FFmpeg pipe closure during bounded source decoding by reading verified cache paths directly. No old test assertion was relaxed.

Late activation review: the same renderer initially fetched zero new cues after Grand Prix became enabled (RED: 0 versus 20). A separate P4-started marker now extends the cached load promise with only the new batch. Focused checks pass for both settled and in-flight ordinary loads, repeated calls, and off/on toggles, with no old asset refetches. Existing fight-voice selection stays fixed at first audio startup. No existing assertion or pin changed.

Historical focused suites pass with original hashes: Arsenal core 14/14, Arsenal wave one 36/36.

Base Audio/PCM suite passes 460 checks with 617,062 finite automation commands. Director requested retaining this foundation commit before switching lanes: lane tier/build remain held for foreign gate scheduling; no gate, merge, native-event or listening approval is claimed. P4-AUDIO remains open for event wiring after owner cards land.
