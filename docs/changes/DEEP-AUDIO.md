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

No old runtime assets or code replaced. Scratch source-selection JSON and review-only audio will be recycled after the review verdict is retained. External selected CC0 source cache remains because the build uses it.

## Deferred

App wiring belongs to DEEP-ZONE. Actual browser capture, race mix masking and other heavy checks wait for the night shift. The Deep stays dev; no release, push or real saves.
