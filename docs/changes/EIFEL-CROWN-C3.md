# EIFEL-CROWN-C3: Eifel Crown pace

Status: **not complete**. The row has full 30-race measurements for each
computer difficulty, but Easy and Hard exceed the crash limit, Easy also misses
the win band, Medium misses the three-pass target, and the switched-off lane
cannot publish the preview reference lap. The preview switch remains `dev`.

## Final measured row

`src/race-field.js`, entry `eifel-crown@3`: pace Easy `.94`, Medium `.864`,
Hard `.86`; aggression `1.4`; following `wallRoom: 1.3`, first-lap
`wallRoom: 1.8`.

| Difficulty | Computer finishers | Computer crashes | First-lap pile-ups | Player wins | Computer passes/race | Mean player time |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Easy | 30/30 races all seven | 14 | 0 | 27/30 (90%) | 1.30 | 337.973 s (328.711–358.436) |
| Medium | 30/30 races all seven | 3 | 0 | 15/30 (50%) | 1.60 | 343.405 s (331.936–353.309) |
| Hard | 30/30 races all seven | 4 | 0 | 6/30 (20%) | 2.03 | 347.307 s (338.744–355.306) |

Targets met: all computer racers finished every race; no first-lap pile-ups;
Medium and Hard player win bands; Medium crash limit. Targets missed: Easy win
band (90%, target 60–80%); Easy and Hard computer crash limit (14 and 4,
maximum 3 per 30); Medium computer passes (1.60, target at least 3); Hard
crash limit (4, maximum 3).

A lower wall buffer trial (`wallRoom: .5`, first lap `.8`) produced five
computer crashes in its third Easy race. I stopped that six-race calibration
after four races and removed the trial. The remaining tuning needed to lower
Easy mistake severity and raise computer passing without increasing crashes;
those controls are outside this card's Eifel pace row. Do not treat the
partial trial as acceptance.

## Reference lap and replay

`node tools/build-reference-laps.mjs --event=eifel-crown --probe` rebuilt the
layout 3 reference in memory: **105,600 ms (1:45.6)**, within 1:40–1:46;
281 samples; road fingerprint `track-v1-f45ae84e`. The reference was not
published because the Eifel switch remains off and the builder forbids
publishing a switched-on course reference while its released replacement is
still active.

Recorded the layout 3 Eifel replay in
`tools/replays/courses/eifel-crown.json`. The new replay fingerprint is
`dcfb0392a5fd6cdeaf9b92ac3c98ee9267b74d0e116218f40dbad4b9f985c8fb` at 30,
60 and 144 FPS. The one fingerprint that moves at C7 is
`eifel-crown-duel`: released-road
`ded9069111c028875ff7c5ac29c09933d33e5b9adaf407e8f78b0abbaf967aac` to the
layout 3 value above. The course file is marked `eifel-crown@3` so the replay
guard keeps using the released case until C7 removes that old case and
activates the layout 3 recording. No other replay fingerprint changed.

## Checks

- Pace runs: Easy, Medium and Hard, 30 races each, memory-only. Full results
  are listed above. Easy and Hard exited with crash/win target failures;
  Medium passed its test thresholds but missed the packet's passes target.
- `node tools/test-circuits.mjs`: passed; 232,142 geometry checks with the
  switch off and 232,138 with it on.
- `node tools/test-circuit-eifel.mjs`: 17/18 passed on rerun; the remaining
  sound loudness check could not run because FFmpeg is not available.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4
  --keep-going`): 53 passed, 3 failed. The failures were the Eifel loudness
  check and P4 audio (both could not start FFmpeg), plus a duplicate Eifel
  replay fingerprint while the layout 3 fixture was first staged. After
  marking the preview recording for layout 3, `node tools/test-replays.mjs`
  passed 297 checks across 33 cases; the two FFmpeg failures remain.
- `npm.cmd run build`: passed. PowerShell blocks `npm.ps1`; the `.cmd` shim
  ran the same build script. Vite reported its existing large-chunk warning.
- Browser checks: none required for C3.

## Assertions and fingerprints

Changed one exact assertion in `tools/test-circuit-eifel.mjs`: the layout 3
Medium pace expectation is `.864`, the final 30-race measured row. No band,
tolerance or result assertion was weakened. The replay fingerprint change is
only the Eifel layout 3 recording described above. Other course roads,
signatures, reference laps, replay fingerprints and pace rows were not edited.

## Removed

Removed the unproven `.5/.8` wall-buffer trial. No generated lane logs or
scratch scripts are retained. No other course data or live save was changed.
