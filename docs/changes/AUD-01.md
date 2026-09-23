---
task: AUD-01
status: review
kind: sound-refinement
flag: none
player_facing: yes
---

This note covers measured combat blast and hit refinement only. It does not
complete the `AUD-01 Weapon sounds` card in `SPEC.md`: rocket launch and flight,
bolt release, harpoon and chain, flamethrower, oil splash, and the other listed
cues still need their own sound work. The recorded measurements below do not
replace a headphone and speaker listening pass.

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
| Corrected real-race capture, `audio-race-2026-09-23T08-21-23-370Z` | **9.59 / 10.60 / 6.38** | **about 12.3 dB, 3.37 dB, 0** | Combat targets passed with the App state and course forwarded through the QA recorder. |

The corrected stand-alone combat hit measured **6.87 dB over engine**; the
hit coincident with a blast measured 10.60 dB. The real blast's source was
at (−6.97, 16.64, 49.50) and listener at (−12.87, 14.89, 43.57). It carried
pan +0.612 and distance 8.55 m; the combined blast/hit weapons stem was
**6.60 dB louder on the right**. The isolated real hit's source was at
(−2.43, 15.15, −9.05) and listener at (−1.29, 14.10, 10.07). It carried pan
−0.145, distance 19.18 m, gain 0.983, and a **2.00 dB left bias** in the
recording. The two injected spatial probes measured 12.39/12.29 dB direction and 3.37 dB
near-to-far attenuation. The real blast was inside the 15 m full-gain radius,
so that event alone cannot demonstrate distance falloff. Every measured combat
cue began within 5 ms of its event. The mix peaked at −1.57 dBFS, with zero
clipped samples and zero measured clicks. The six-blast stress period kept the
engine at −23.28 dBFS against a −14.36 dBFS mix, within the analyzer's 18 dB
audibility bound.

The QA recorder initially dropped the new state and course arguments while
wrapping the App audio hook. Its earlier real-race spatial log therefore did
not prove the output pan. The corrected wrapper forwards both arguments, and
the browser scenario now rejects a real blast or isolated hit whose recorded
left/right levels disagree with its computed pan.

Visual inspection of the calibration loudness and spectrogram graphs found brief
weapon peaks near the marked events and a continuous engine band without a
sustained mix-level climb. No human or model listening judgment is claimed:
the available audio tool could not accept the WAV as input. A headphone and
speaker check remains useful before a sound release.

## Remaining analyzer failures

`node tools/audio-analysis.mjs <corrected-recording> --check` still exits 1.
Its shift onset detector cannot isolate most shift accents in the layered
engine stem (one measured onset was 33 ms, over the 30 ms target), and its
engine/revs estimator reported correlation 0.343 with a −50 ms best lag,
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
- The corrected browser recorder confirmed a real race blast with finite
  spatial geometry and **6.60 dB measured right bias**, six WAV stems, 791
  frames, and 23 events. The browser reported zero warnings and errors.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 157/157 suites
  passed in 358.32 seconds on the final production source before the QA wrapper
  correction. Its replay suite passed all
  162 fingerprints across 18 cases, three frame rates, and three runs.
- `npm run build`: passed with the existing large rendering chunk warning.
- `git diff --check`: passed.

No authored WAVs, credits, or runtime dependencies changed.

## Follow-up: hit positions

Bombs can strike several cars around one blast. Each `combatHit` event now
carries the struck car's existing world position. The audio mixer pans the
hit from that position; explosion sounds still use their burst position. The
private race recorder logs the same source used by the mixer. This changes
sound placement only, not race state, damage, or replay inputs.

The new audio and combat tests first failed against the prior branch: hits
still panned from the last burst, and hit events lacked victim coordinates.
After the fix, the audio test passed 459 checks, the combat test passed 68,
the analyzer fixture passed 5/5, the lane gate passed 157/157 (including
162 replay fingerprints), and `npm run build` passed. A private Chrome race
on port 14603 used memory-only saves and recorded 23 events, seven WAV stems,
zero browser warnings or errors. Its full analyzer passed all ten checks;
engine/rev correlation was 0.982, the mix peak was -1.841 dBFS, and there
were no clipped samples or clicks. The logged player hit had pan 0 at 1 m,
while the rival hit had pan -0.150 at 21.36 m.

An earlier private recording passed the browser scenario but missed the
unchanged 6 dB weapon contrast target for one far blast by 0.087 dB
(5.913 dB). The repeat passed at 7.337 dB. That narrow variation is a
remaining sound-mix margin risk, separate from the hit-position change.
Subjective listening and the remaining AUD-01 weapon cues are still open.

## Current integration forward port and recorder tail

The `codex/wasteland-audio-forward` branch applies this partial audio work to
the current integration gameplay, including the later narrow CPU bomb-use fix.
The changed lane passed 170/170 suites, the 162 replay comparisons stayed
unchanged, and the production build passed. A private Chrome race used
memory-only saves, recorded 22 events and seven WAV stems, and reported no
browser warnings or errors.

The first two captures ended immediately after stopping the simulation. A
shift near the 14-second boundary was logged but its sound was cut from the
recording. The QA recorder now keeps a 250 ms sound tail after simulation stop.
Two fresh captures detected every one of the 14 timed cues within the
unchanged 30 ms limit. Engine pitch/rev correlation was 0.979 and 0.982; no
clicks or clipped samples were measured. Panning, distance, cue variety, and
six-blast stress mixing passed. The analyzer still exits red: the far blast
measured 5.554 and 5.946 dB over the engine, below the 6 dB target. This is a
sound-mix margin issue; the target was not changed. A headphone and speaker
listening review, as well as the remaining AUD-01/02 sounds, is still open.

## Far-blast margin and engine measurement follow-up

The recorded far blast missed contrast by up to 0.446 dB. Raising only the
combat-blast sample gain from 2.2 to 2.45 gave the distant blast room above
the unchanged 6 dB target. Two private Chrome recordings after that change
measured far-blast contrast at 6.946 and 7.812 dB, with no clipped samples or
clicks and the near/far and stress checks still green.

Those recordings exposed an unrelated pitch-check error. After a 0.6 s gap
in clear tonal readings at launch, the checker sometimes halved a valid
100 Hz engine reading to 50 Hz and kept the wrong octave for the race. Its
correlation then fell to 0.681–0.704 although the recorded pitch moved with
revs. The checker now re-seeds from the audio alone after a long gap and a
large upward pitch change. It does not use rev telemetry to choose an octave,
and the 0.90 correlation and 50 ms lag limits are unchanged. A synthetic
engine that freezes at two notes across a silent gap still fails. All six
focused analyzer tests pass.

A fresh private browser race then passed all ten analyzer checks: 14 timed
cues, engine/rev correlation 0.979 at 0 ms lag, far-blast contrast 6.448 dB,
near/far difference 3.364 dB, zero clipped samples and clicks, and passing
panning, variety, loop and stress checks. It recorded 783 frames and 23 events
with seven WAV stems, zero browser warnings and zero errors. The final changed
lane passed 170/170 suites in 234.35 s, including 162 unchanged replay
comparisons; the production build passed. This verifies measured targets for
this partial audio slice. Subjective listening and remaining AUD-01/02 cues
are still open. That measurement was made on the earlier audio branch; this
forward port still needs its own lane, merge and browser recording gates.

## Forward port to integration base 5d00eeb

The six audio commits were applied in order to a new isolated branch based on
`5d00eeb`, after the three-opponent and short tactical UFO changes. No
conflict resolution or race-rule edit was needed. On this exact branch,
`node tools/test-audio.mjs` passed 459 checks, `node tools/test-combat.mjs`
passed 66, `node --test tools/test-audio-analysis.mjs` passed 6/6, and
`npm run build` passed. `git diff --check` passed. The later lane, merge,
fresh browser audio recording and listening checks remain pending.
