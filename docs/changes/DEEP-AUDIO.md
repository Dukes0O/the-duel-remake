# DEEP-AUDIO — design and handoff

## Design settled before source

Build the eight exact cues in THE_DEEP 10.1 from verified CC0 recordings. Wonder and quiet movement are the target: a softened splash, a short muffled engine descent, looping exhaust bubbles, a soft sandy landing, two distinct quiet reward notes, distant recorded whale song, and a low cave bed. Existing splash/engine/impact/bell/chime sources are reused; bubbles 208816, whales 82325 and underwater bed 504641 are fetched individually with the existing Freesound tool. Keep source caches outside Git; ship only compressed assets. The owned build recipe reuses existing codec, sourcing and EBU R128 measurements. Ambient bubbles/cave and whale target -20 LUFS; accents target -20 to -22 LUFS; encoded true peaks must be <= -1 dBTP. Loop beds use lossless FLAC and a short overlap; one-shots use bit-exact mono Vorbis. No master change.

`createDeepAudio({audio})` reads the existing host and 10.1 events. It exports event/update/stop/dispose, loads its own eight buffers lazily under the-deep, starts two bed loops only while exploring underwater, and consumes muted/paused event deliveries without later replay. Context loss, pause, mute, exit, scene replacement and dispose clear voices. Place descriptors provide an explicit `sound: 'deep.cave' | 'deep.whale'` hint; unknown places do not infer sound from arbitrary text. The whale is a finite distant one-shot with a 30-second cooldown. All event and state objects remain read-only. DEEP-ZONE owns App lifecycle wiring.

The audio.js engine-only hook caps existing synthesized/recorded main, body and intake filter targets at 520 Hz when the switch is enabled and `environment.deepDepth > 0`; normal targets remain exact otherwise. This keeps each car's original pitch, gear and load behavior. The engine-muffle asset is only the short entry accent, not a second continuously revving engine.

## Validation

Focused acceptance passes: all eight encoded assets, independent asset failure, lazy underwater requests, no Deep fetch by the ordinary loader, event deduplication, pause/mute/switch-off/exit/dispose/context cleanup, read-only inputs, and the actual synthesized/recorded EngineAudio filter targets. A second build produced identical compressed SHA-256 hashes for all eight assets. Existing level/seam bounds stay unchanged. The first generation exposed invalid FFmpeg duration spelling and a bubble boundary changed by the limiter's lookahead; the final recipe uses valid durations and applies the loop overlap after leveling. The short splash initially missed its -20 target; its final quiet-transient recipe targets -22 within the design's accent range.

| Cue | LUFS | True peak dBTP | Bytes |
| --- | ---: | ---: | ---: |
| deep.splash | -22.43 | -3.33 | 22,823 |
| deep.engine-muffle | -22.07 | -9.14 | 13,777 |
| deep.bubbles | -20.10 | -3.10 | 184,495 |
| deep.sand-land | -23.52 | -3.09 | 8,974 |
| deep.logged | -21.85 | -5.68 | 12,713 |
| deep.pearl | -21.98 | -9.62 | 14,271 |
| deep.whale | -21.07 | -3.52 | 93,697 |
| deep.cave | -21.49 | -4.17 | 181,879 |

Total: 532,629 runtime bytes. Both decoded FLAC loop boundaries pass the existing seam analyzer. Library sounds are public HQ previews, individually fetched, with source hash and CC0 provenance retained in the catalog. No native capture, listening score or final Claude sound acceptance is claimed. The Director additionally granted the loader predicate that excludes only the-deep cues; the adapter owns their lazy loading. Frozen source and nearby lane/build evidence follow below.

## Removed

No old runtime assets or code replaced. Scratch source-selection JSON, build drafts and the listening helper have been recycled. Review-only audio is retained until its verdict can be recorded, then Root recycles it. External selected CC0 source cache remains because the build uses it.

## Deferred

App wiring belongs to DEEP-ZONE. Actual browser capture, race mix masking and other heavy checks wait for the night shift. The Deep stays dev; no release, push or real saves.

## First frozen review and gate — 4fbcbda5

Original nearby lane result: 35 passed, one failed (`test-arsenal-core-audio`), 107 not run of 143, 301.124 s, jobs 4. Original JSON retained in `.evidence/2026-10-12/DEEP-AUDIO/lane-result.json`. Both failures are legacy whole-bank/catalog snapshot hashes including new Deep entries. No old expected hashes or bounds are changed; Director test-hook permission is requested for explicit eight-ID exclusions only. Build passed on the same source: 5,372.528 ms wall time (Vite 2.01 s), original build log and result retained there.

Root's ordinary review found cold entry silently misses splash/muffle before lazy loading finishes. Correct only the adapter and its existing test: preserve ready-buffer immediate playback, queue each missing entry cue once for its current audible visit, and invalidate that queue on pause, mute, exit, switch-off, scene/context replacement or dispose. Initially inaudible events remain consumed. Add delayed fake decode acceptance without browser or framework work. Every asset, cue gain, ordinary filter/load path and numeric bound stays exact. The corrected frozen source needs one fresh nearby lane/build and review.

Director granted only the historical bank/catalog projections in `test-arsenal-core-audio`, `test-arsenal-wave1-audio` and `test-p4-audio`. Add an independent literal list of the eight Deep IDs to those additions; keep all original expected SHA-256 values, individual assets, ordinary rows, exports and numeric assertions exact. No broad Deep-prefix exclusion is used. The owned Deep test independently pins those eight assets and recipes. The delayed-entry fix now passes ten fake-decode cases, including inaudible starts and stale completion; duplicate entry identities remain consumed after exit. Corrected source freezes with these related fixes and the existing real assets.

## Corrected frozen gate — aeb3415f

The nearby lane passed 82 tasks, failed `test-deep-look`, and left 60 not run of 143 in 539.882 s, jobs 4. Exact original result is `.evidence/2026-10-12/DEEP-AUDIO/lane-result-aeb3415f.json`. Deep acceptance, delayed-entry cases and all three historical audio projections passed. The existing D0 isolation guard forbids every importer of `src/deep`, including the already-granted `src/audio.js` and owned audio acceptance import of the audio-only module. No renderer, scene or look import was added by this card.

Requested bounded guard update before editing it: strip only the two literal approved import statements from those two exact file paths before the same existing forbidden-import scan. Every other Deep importer remains forbidden; the development flag and all geometry, colour and numeric assertions stay exact. Root's ordinary aeb3415f review is clear; the test-hook adjustment needs its explicit Director grant and final delta review. The runtime source and eight audition assets are unchanged. Build on aeb3415f passed in 1,662.931 ms, original `build-aeb3415f.log` and JSON retained.

Director granted the single D0 prototype-import assertion with eight exact importer/specifier pairs: Audio's two and the current guardian-reviewed Save contract's six. Only matching import text is stripped before the original forbidden Deep reference scan; all other paths/specifiers remain forbidden. The independent literal pairs match the Director card and do not import an allow-list from implementation code. Both development-switch checks, legacy tool exclusions and every look/geometry/numeric assertion stay exact. Audio is the sole editor; Save may copy the reviewed frozen blob without concurrent changes. No runtime, asset or mix change accompanies this guard correction.
