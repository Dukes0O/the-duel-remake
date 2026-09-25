---
task: AUD-10
status: ready-to-merge
kind: refactor
flag: wasteland2
player_facing: yes
---

# Sound bank and mixer foundation

Implementation, all five strict waveform comparisons, fresh lane/build and
independent review pass. No tolerance approval is needed; no threshold changed.

## Design and implementation

One sound bank owns existing source declarations, layers, voicings, cue routing,
priorities, voice limits, variation and ducking. One renderer retains the old
synthesis envelopes and engine automation. Eight named buses cover engine,
vehicle, weapons, impacts, ambience, music, voice and interface. Dry vehicle
and engine paths retain their original perspective/reflection behavior.

The Director approved flat legacy destinations for both-flags-off mode after
shared bus summation exposed tiny floating-point differences amplified by the
unchanged master compressor. Each leaf still feeds its named bus for metering.
With both flags off, bus outputs are disconnected from the audible path and
the existing leaf reconnects directly to its original master/vehicle endpoint.
There is no copied legacy renderer, duplicate recipe or extra per-leaf node.
The original shared vehicle and Hidden Road stages remain.

When wasteland2 or hidden-road is enabled, physical bus outputs reconnect and
flat leaf connections disconnect. External spatial subgroups disconnect in
flat mode to avoid doubling. Routing records track inputs, fade targets and
subgroups; ended nodes release them. Off/on/off changes reuse existing sources.
Fading sounds cannot reopen during a switch. Hidden-road alone permits voice
ducking; blast ducking and moving-source playback still require wasteland2.

The mixer limits each cue and caps total voices at 64, evicting lower-priority
voices when needed. Duck requests overlap safely and release smoothly. Moving
sources use HRTF direction, inverse distance and bounded doppler, reading world
state only. AUD-14 now attaches that API to the real projectiles.

## Sources and compression

Fourteen runtime WAVs became lossless FLAC: 6,108,572 -> 3,575,193 bytes. Every
decoded signed-16-bit PCM hash and loop sample count matches the original.
Git attributes mark FLAC and OGG binary; byte checks catch text normalization.
Two licensed originals without verified direct download recipes remain once
in audio-src/library/ as lossless FLAC. Other original recordings/downloads
are cached outside Git in C:/Users/kyleb/dev/audio-library/legacy/ with hashes
and reconstruction recipes in tools/audio/catalog.json. Credits remain.
The audio preparation tool rebuilds from those recipes and checks source hashes.

## Tests first and evidence

Bank/mixer, placement, compression, moving-source and Git-byte tests failed
before implementation. The later disabled-route, enabled-route, off/on/off,
external-subgroup, fading and cleanup regressions also failed first. An initial
extra per-leaf gain failed the existing two-node shift budget; reconnecting
existing nodes fixed it without changing that assertion.

The original recorded race and migrated capture both pass the ten existing
analysis gates: 841 frames, 23 events, seven tracks; correlation .978/.977,
peaks -1.740/-1.599 dBFS, no clips/clicks/gaps, weapon contrast at least 6.94 dB,
and 3.38 dB distance difference. This is measurement, not human listening.

The stricter same-clock comparator renders old/current/old-control stereo,
with shared decoded buffers, fixed noise and complete filter tails. Initial
shared summation failed the 14-second case at .00001648 peak. An earlier
proposal to relax tolerance was not applied. After the routing correction,
all five unchanged cases pass the original .000002 peak bound: race .000000194,
wide .000000238, hood/events below .000000269, gate .000000119. Reference
controls pass too. The baseline tool and its pass conditions were not edited.
Evidence: audio-baseline-2026-09-25T08-06-10-999Z.

Live switch test: off/on/off/hidden-road-only RMS .03930/.03913/.03908/.03909,
with correct physical routing and route cleanup. Moving tone approach/recede
483/404 Hz, correct stereo direction, zero remaining voices. Hidden-road-only
arrival still plays once with real voice ducking, readable subtitle and 13.06 dB
speech-band contrast. Modern combat still passes all 27 full-throttle checks,
real bolt following, near/far, doppler and pause cleanup. Browser runs use
private ports and memory-only storage, with no warnings/errors.

Focused PCM suite: 460 checks, 598,770 finite automation commands; all original
pitch, loop, envelope, headroom, missing-file and node-budget targets retained.

## Changed assertions and review scope

Source-preservation tests now check catalog/external-cache hashes instead of
requiring raw downloads in public. Exact decoded PCM assertions remain.
Physical-bus assertions now explicitly enable grouped mode, as the Director
approved; separate disabled-route coverage requires the original endpoints.
The landing test follows the actual oscillator/gain path instead of assuming
a node's allocation index. Mock disconnect(destination) now matches the native
API's selective disconnect. No numerical acceptance target was lowered and no
scenario, variant, replay or fault injection was removed. The packed audio
unit file was formatted for readable review; unrelated assertions are intact.

## Independent review and final recorded race

The Director independently reviewed frozen 0b5a731 routing, bus assertions,
group fades and cleanup, verified unchanged numerical PCM checks and strict
baseline source, and ran the frozen bank tests with native-like connections.
No finding remains. The later booth fix and finite-flight policy have their
own notes; the mixer stayed frozen. Kyle requested this builder work alone;
no subagents were used in this lane.

The post-fix native-rate race captured 790 frames, 23 events and seven tracks.
All ten original gates pass: correlation .980, zero lag, peak -1.555 dBFS,
no clips/clicks/gaps, weapon contrast >=12.399 dB, distance difference 3.096 dB.
LUFS/true peak are -17.75/-1.52; ten loop seams and three-variant repetition
pass. Port 21041, zero warnings/errors, memory-only storage. Evidence:
audio-race-2026-09-25T08-16-46-808Z. Human listening is still flagged.


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

## Removed

Removed 12 raw downloads/excerpts and 14 uncompressed runtime WAVs from public.
Their compressed replacements, licensed originals, credits and build recipes
remain in the governed homes. Inline sound recipes moved to the bank. The
kept Callum MP3 remains byte-identical. The consumed AUD-12-R1 note was removed
after its facts were integrated; Kyle's AUD-12 source selections remain.
