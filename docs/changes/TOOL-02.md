---
task: TOOL-02
status: review
kind: tooling
flag: none
player_facing: no
---
## What changed

Added a deterministic feel lab that pairs Wasteland and ordinary races on the same seeds, course, car and production autopilot. It records wins by CPU difficulty, first combat, explosion spacing, hit events per fired offensive player weapon, wrecks, lead changes, catches and race time against the ordinary baseline. Bombs can hit several targets, so the hit measure is events per shot rather than a probability. CPU crew exits are explicitly unavailable because this build has no crew-exit event or mechanic.

Added an isolated, real-time browser audio race. It uses memory-only saves and a disposable Chrome profile, writes full-mix and engine, tire, weapon/impact, ambience and UI WAV stems, and records simulation events alongside audio-clock times and frame data. Two calibrated explosion cues and a six-blast stress cue supplement natural race events without changing race physics.

Added a dependency-free audio analyzer with 400 ms loudness readings, event onset checks, an engine pitch/revs estimate, clipping and click checks, loop gaps, blast-to-engine level, panning, distance, cue variety, stress mix and event-marked SVG spectrogram/loudness graphs. `--check` exits nonzero when a measured target fails.

## Evidence

- `node --test tools/test-audio-analysis.mjs`: aligned synthetic explosions pass timing; a deliberate 100 ms delay fails. A moving synthetic engine passes rev tracking; frozen pitch fails.
- `node --test tools/test-feel-lab.mjs`: fixed-seed race report repeats exactly and summary compares the paired modes.
- `node tools/feel-lab.mjs --seeds=8 --json=.qa-dist/feel-report.json`: 48 paired races. Wasteland wins were 8/8 at Easy, Medium and Hard, versus targets of 80–95%, 45–65% and 20–40%. Mean first combat was 7 s. Player hit events per offensive shot were 0.203, 0.274 and 0.321; CPU hits on the player averaged 0.75, 1.0 and 1.125. The combat/ordinary race-time ratios were 0.818, 0.931 and 0.775. This exposes balance misses; it does not pass those targets.
- `node tools/browser-harness.mjs record-race`: private port 41202, 787 real-time frames, 23 events, six WAV tracks, memory-only saves, zero browser warnings/errors. Files are under ignored `.qa-dist/browser-output/audio-race-2026-09-23T06-28-29-043Z/`.
- `node tools/audio-analysis.mjs <recording-dir> --check`: exits 1 on current sound misses. The 14.471-second recording peaked at −2.408 dBFS, had no measured loop gaps, and kept the engine audible under six simultaneous blasts. Explosion cues were roughly 1–4 dB below the engine versus the +6 dB target. Direction was 0 dB left/right, near/far attenuation was 0.033 dB, repeated blast envelopes matched at 0.995, and 18 click samples appeared in the stress burst. Shift/hit onset could not be isolated reliably from the layered stems. This is a measurement report, not a sound pass.
- `npm run build`: passed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 157/157 suites passed in 334.30 s. The final focused TOOL-02 tests were rerun after the last metric refinements.

## Remaining work

The full TOOL-02 sound loop is still open. Capture more natural landings and pickups, isolate shift and hit transients for unambiguous 30 ms timing checks, validate layered engine pitch estimation by listening, and add throttle/tone and gear-drop checks. Run sound design iterations until measured targets pass. The current audio implementation has no spatial panning or distance gain; those are sound changes for a later audio card. CPU crew-exit rate can be measured when that gameplay feature exists.

## Behavior and test changes

No production simulation, audio or save behavior changed. The browser harness gains `record-race`; its parsing test adds the new command. New regression tests cover the feel report and analyzer. Race fingerprints are unchanged.

## Current-source forward port

The isolated `codex/wasteland-feel-forward` branch applies these tools to
integration `41a6374`, preserving its later browser runner and board status.
Focused feel and analyzer tests pass. Eight seeded paired Pacific Canyon races
per difficulty now report Wasteland all-weapon player wins of Easy 8/8,
Medium 7/8 and Hard 7/8. The tool fires star, bomb, crossbow and UFO on a
12-second schedule; these wins are **not** the no-weapon balance samples.
Ordinary Duel win rates were 8/8, 8/8 and 2/8. Mean first combat was 8.03,
7 and 5 seconds for Easy, Medium and Hard. Hard had 5.13 lead changes and
5.38 CPU hits on the player per race. The 7/8 Hard all-weapon win rate is a
further reason to hold the current UFO behavior for redesign. The tool does
not make that policy win rate an approved acceptance assertion.
The exact forward-port lane gate passed 170/170 suites in 322.08 seconds and
the production build passed. A private memory-only browser race recorded 781
real-time frames, 22 events and six WAV tracks with zero browser warnings or
errors. The analyzer correctly exited red on the current integration audio:
shift and hit onset could not be isolated, engine/rev correlation was 0.179,
28 click samples were found, blast contrast was about 3 dB below the engine,
and panning, distance and variety targets failed. Peak was −2.481 dBFS with
zero clipped samples; stress mixing and loop-gap checks passed. This measures
the old audio implementation, not the separate held AUD-01 polish branch.

## Integration after tactical UFO

The diagnostic-only commits landed on the current integration branch as
`3c22f41` and `cbea2cd`. Focused feel-lab and audio-analyzer tests pass.
The earlier all-weapon and audio figures above were recorded before the
short tactical UFO release, so they are historical evidence rather than a
current acceptance result. A new feel report, private sound recording,
analyzer run, and the normal merge/full checks remain open. The independent
audio review also found that the current recording does not guarantee each
landing, crash and pickup cue occurs; those coverage checks and listening
remain part of TOOL-02.
