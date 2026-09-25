---
task: AUD-GATEKEEPER
status: in-progress
kind: feature
flag: hidden-road
player_facing: yes
---

# Kept gatekeeper welcome

## Design

Play Kyle's exact kept Callum take as gatekeeper.welcome once when the existing
Hidden Road opening event arrives. Use the voice bus and its duck request.
Do not change simulation state, phases or events. An opening seen while paused
waits for resume; a line already heard does not restart on paused or repeated
frames. Leaving the gate, muting or changing journeys stops owned playback.
If the optional sound is unavailable, the subtitle remains usable.

Copy the kept MP3 byte for byte to its runtime location through a checked
build recipe. Keep the selected source and checksum unchanged; no API request
or credit is needed. The clip is 4.102 seconds and measures -22.63 LUFS and
-2.99 dBTP before mixer gain. Measure its speech-band contrast over full
throttle before choosing the final gain.

Keep the current invitation text in the choice dialog. Also show that same
line as a nonmodal subtitle during opening and entering, because automatic
career arrivals skip the choice phase. Director approved the narrow subtitle
CSS and focused test/browser hooks. All new playback requires hidden-road.

Tests first cover the exact take, event timing, repeated frames, pause before
and after playback, mute/navigation, missing samples, feature flags, readonly
state, and the automatic-arrival subtitle.

## Evidence

Implementation and focused checks pass. AUD-10 and AUD-11 remain dependencies
and are not ready. Zero credits used.

## Removed

No prior approved sound is replaced. The existing text invitation is retained.

## Validation so far

Seven headless regressions pass after failing first. The actual browser visit
exposed opening-before-stageLoaded ordering; a new failing regression led to
preserving only that same automatic visit's pending event across the reset.
No simulation code or event order was changed.

Private browser scenario passed on port 27448, with no warnings or errors.
It proves the full line in the booth, one cue for the real opening event,
no replay across pause/repeated frames, and subtitles during opening and
entering. The screenshot was inspected: the line is readable below the gate
without covering the car. Storage is memory-only.

At full throttle, the 350-4000 Hz voice stem measures 13.06 dB above the
engine across 18 voiced 200 ms windows. The complete mix measures -15.51 LUFS
and -2.87 dBTP, with peak amplitude .718 and no clipping. This is a measured
intelligibility proxy, not a claim of human listening. Mixer voice gain is 2.2;
the source and runtime MP3 both retain Kyle's exact 66,499 bytes and SHA-256.
FFmpeg decodes 4.102 seconds; the browser trims codec padding to 4.087 seconds.
The booth waits for cue buffers and plays voice lines in full.

Credits now name ElevenLabs and Callum and retain the catalog's source terms.
The checked rebuild script verifies the selected hash before copying it.
Lane/build gates and the upstream AUD-10 finding still prevent readiness.
