---
task: AUD-GATEKEEPER
status: ready-to-merge
kind: feature
flag: hidden-road
player_facing: yes
---

# Kept gatekeeper welcome

Kyle's kept Callum line now plays once on Hidden Road gate arrival, with the
existing invitation retained as its subtitle. Checks pass with hidden-road
alone; wasteland2 is not required. AUD-10 and AUD-11 precede this card.

## Design and implementation

Cue gatekeeper.welcome uses the voice bus and voice ducking. Preserve simulation
phases and event order. An opening before stageLoaded retains only its own
journey's pending event. Pause before playback defers the line; pause after
playback stops it without replay. Muting, navigation or changing journeys
clears owned playback. Missing optional sound still leaves the subtitle usable.

Keep the choice callout, and show the same invitation as a nonmodal subtitle
during opening and entering because automatic arrivals skip choice. It does
not steal focus and is hidden while paused/inactive. Director approved the
narrow subtitle CSS and test/browser hooks.

The build recipe verifies and copies the exact kept MP3 bytes. Source/runtime
are both 66,499 bytes, SHA-256
5772399d1112b33edc845e5253417afd4d55ca1898fcb54f8901899a4eb96106.
No generation or credits were used. Attribution names ElevenLabs/Callum and
preserves the catalog's free-plan non-commercial terms. The source remains
compressed MP3 as Kyle selected; it is not transcoded.

## Tests first and measured review

Eight focused tests pass after failing first: kept bytes, event timing,
repeated frames, pause before/after, mute/navigation, missing buffers, flags,
readonly state, subtitle and independent Hidden Road voice ducking. Browser
arrival exposed opening-before-stageLoaded; the new regression led to the
pending-event fix without changing simulation order. Independent review found
the voice-duck flag dependency; the real-mixer regression failed then passed.
Blast ducking still requires wasteland2; both flags off keeps baseline routing.

The final real browser arrival uses hidden-road only, plays once with voice
ducking and a readable opening/entering subtitle, and stops without replay.
Private port 56807, memory-only storage, zero warnings/errors. Full booth line
is 4.087 seconds after browser codec-padding trim (FFmpeg: 4.102 seconds).
Screenshot review found the subtitle below the gate without covering the car.

Full-throttle speech-band contrast is 13.06 dB over engine across 18 voiced
200 ms windows. The final mix is about -15.5 LUFS/-2.8 dBTP, with no clipping.
Mixer gain is 2.2; source bytes remain exact. This is measured evidence of
intelligibility, not an invented human rating. Kyle's existing take selection
is retained.

## Removed

No previous approved sound was replaced. The text invitation remains.

## Handoff gate

Integration/wasteland was merged at 9a11eab (integration parent 0b1af27)
before readiness. On that frozen source, lane tier with --changed --jobs 8
passed 262/262, zero failures or skipped suites, in 361.08 seconds. Production
build passed in 392 ms with the existing large-chunk advisory. All 162 replay
fingerprints are unchanged; all 48 expansion drives completed and won.
No assertion was relaxed. No simulation or save-format change is included.

Gate logs live in .evidence/2026-09-25/audio-ready/. The session-ending
`node tools/run-tests.mjs --tier full --jobs 8 --keep-going` runs on the final
ready-note commit; full.log and full-tier.json record that exact commit and
result. The Director merges the series; this lane never merges into integration,
pushes, edits live files, or updates board/status/run-log files directly.
