---
task: AUD-01
status: review
kind: sound-refinement
flag: none
player_facing: yes
---

## What changed

Combat blasts and hits now use short, spatial sound paths in `audio.js`.
`App` passes the current race state and course to the audio hook. The sound
engine reads the newest existing combat burst and the player's position to
pan a real blast or hit and reduce its level with distance. The calibrated QA
probes supply their own side and distance. No simulation event, race state,
save, or replay input was changed.

Blasts use three bounded playback rates and attack shapes from the existing
credited explosion recording. A low-pass filter softens its very sharp edge.
Only new attacks share a power budget during a six-blast burst; quiet tails no
longer suppress later isolated blasts. Hits gain a brief filtered metal/noise
crack above their low thump. These short-lived nodes disconnect after use.

The audio analyzer's 6 dB weapon contrast threshold is unchanged. It now
checks both explosions and combat hits against that threshold. The browser
recording logs the computed spatial pose for real race events, separately from
the calibrated QA probe details.

## Measured browser rounds

All recordings used a disposable Chrome profile, a free private port,
memory-only saves, the real-time Wasteland autopilot, and the same analyzer.
Each browser run reported zero console warnings or errors. Outputs and
graphs are under ignored `.qa-dist/browser-output/`.

| Round and recording folder | Blast dB over engine, near / natural / far | Panning, near over far, clicks | Reading |
| --- | --- | --- | --- |
| Baseline, `audio-race-2026-09-23T07-38-04-194Z` | −3.02 / −1.54 / −2.91 | 0 dB, 0.005 dB, 20 | Blast buried; no space; six-blast burst clicked. |
| First routing pass, `audio-race-2026-09-23T07-46-10-646Z` | 9.34 / 4.22 / 0.61 | about 12.4 dB, 7.80 dB, 3 | Spatial direction worked, but long quiet tails suppressed later blasts. |
| Attack-window pass, `audio-race-2026-09-23T07-50-20-099Z` | 7.10 / 7.94 / 4.85 | about 12.4 dB, 3.32 dB, 0 | No clicks; far blast and cue variety still missed. |
| Cue-variation pass, `audio-race-2026-09-23T07-53-18-848Z` | 9.23 / 11.10 / 5.68 | about 12.4 dB, 4.25 dB, 0 | Variety passed; far blast missed 6 dB by 0.32 dB. |
| Final calibration, `audio-race-2026-09-23T07-54-35-037Z` | 9.45 / 11.76 / 6.18 | about 12.4 dB, 3.43 dB, 0 | All measured combat targets passed. |
| Exact-state repeat, `audio-race-2026-09-23T08-04-25-093Z` | **9.54 / 10.73 / 6.60** | **about 12.4 dB, 3.39 dB, 0** | Combat targets passed again after the final lifecycle change. |

The exact-state stand-alone combat hit measured **7.19 dB over engine**; the
hit coincident with a blast measured 10.73 dB. The real blast carried a
computed pan of +0.617 and source distance of 8.48 m; real hit positions were
also recorded. Every measured combat cue began within 5 ms of its event. The
mix peaked at −1.565 dBFS, with zero clipped samples and zero measured clicks.
The six-blast stress period kept the engine at −23.34 dBFS against a
−15.00 dBFS mix, well within the analyzer's 18 dB audibility bound.

Visual inspection of the final loudness and spectrogram graphs found brief
weapon peaks near the marked events and a continuous engine band without a
sustained mix-level climb. No human or model listening judgment is claimed:
the available audio tool could not accept the WAV as input. A headphone and
speaker check remains useful before a sound release.

## Remaining analyzer failures

`node tools/audio-analysis.mjs <final-recording> --check` still exits 1.
Its shift onset detector cannot isolate most shift accents in the layered
engine stem (one measured onset was 39 ms, over the 30 ms target), and its
engine/revs estimator reported correlation 0.224 with a −12.5 ms best lag,
below the 0.9 target. Those checks were already red in the TOOL-02 baseline
and were not weakened. This slice leaves them for a separate engine/audio
analysis pass. The `--check` failure is an honest whole-sound result even
though the combat-specific checks pass.

## Verification

- `node tools/test-audio.mjs`: 458 checks passed, including the App hook, real
  geometry, separate QA probe geometry, six live voice ownership, and impact
  and blast retirement.
- `node --test tools/test-audio-analysis.mjs`: four checks passed; a deliberately
  buried combat hit fails the unchanged 6 dB contrast gate.
- The exact-state browser recorder confirmed a real race blast with finite
  spatial geometry, six WAV stems, 792 frames, and 23 events.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 157/157 suites
  passed in 358.32 seconds on the final source. Its replay suite passed all
  162 fingerprints across 18 cases, three frame rates, and three runs.
- `npm run build`: passed with the existing large rendering chunk warning.
- `git diff --check`: passed.

No authored WAVs, credits, or runtime dependencies changed.
