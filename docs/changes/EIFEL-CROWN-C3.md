# EIFEL-CROWN-C3: Eifel Crown pace

Status: **C3 pace pass complete**. The road stays behind its development switch.

## Claude's decision

Accepted: restore `EIFEL_GP_FIELD_FOLLOW` to following `wallRoom: 1` and first-lap `wallRoom: 1.4`. Final pace is Easy `.94`, Medium `.862`, Hard `.86`.

Accepted: Medium computer passes remain below 3 per race because single-file road sections make passes rare, and raising pace for more passes raises crashes. Easy may remain a little over the crash limit (up to 5 in 30). Do not change test bands or tolerances.

Hard was not rerun, as directed. Claude's retained result is 20% player wins and 3 computer crashes at `.86` with this room.

## Final measurements

Easy and Medium runs used `node tools/test-circuit-eifel.mjs --pace <difficulty>`, 30 seeded races each. Raw final outputs were written to `.qa-dist/eifel-easy-lastpace.log` and `.qa-dist/eifel-medium-finalpace.log`.

| Difficulty | Computers finish all races | Computer crashes | First-lap pile-ups | Player wins | Computer passes/race | Mean player time |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Easy `.94` | 30/30 | 4 | 0 | 22/30 (73.3%) | 1.03 | 340.336 s (330.502-354.941) |
| Medium `.862` | 30/30 | 1 | 0 | 10/30 (33.3%) | 1.53 | 345.583 s (334.294-358.493) |
| Hard `.86` | Not rerun | - | - | 20% (Claude's retained result) | - | - |

At `.861`, the completed batch won 17/30 (56.7%), outside Claude's band. I raised Medium by `.001` once to `.862`; its final batch is within the 30-50% band. An interrupted `.862` attempt after 10 races was discarded and excluded. No further pace change or measurement was made.

The final Medium pace command exits on the existing Grand Prix lower-bound assertion: 33% is below its 40% minimum. Claude's decision sets the accepted band at 30-50%. That assertion remains unchanged for Claude's review. The Medium passes average is below the target of 3 as accepted above. Easy's 4 crashes are above the built-in maximum of 3 and within Claude's stated 5-per-30 waiver. No assertion, band or tolerance was weakened.

## Reference lap and replay

The layout 3 reference remains **105,600 ms (1:45.6)**, within 1:40-1:46; 281 samples; road fingerprint `track-v1-f45ae84e`.

`node tools/test-replays.mjs` passed 297 checks across 33 cases, 31 events, 9 categories, three FPS values and three runs. The layout 3 Eifel replay fingerprint remains `dcfb0392a5fd6cdeaf9b92ac3c98ee9267b74d0e116218f40dbad4b9f985c8fb` at 30, 60 and 144 FPS; no re-record was needed. The released-road fingerprint remains `ded9069111c028875ff7c5ac29c09933d33e5b9adaf407e8f78b0abbaf967aac`.

The Eifel replay fixture had a literal `\n` after its closing brace, so the replay test could not parse it. Removed those two invalid trailing characters; valid JSON now passes the replay suite.

## Checks

- `node tools/test-circuit-eifel.mjs`: 17/18 passed; the only failure is its FFmpeg loudness measurement (FFmpeg unavailable).
- `node tools/test-replays.mjs`: passed, 297 checks.
- `node tools/test-circuits.mjs`: passed, 232,142 checks with the switch off and 232,138 with it on.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 8`): 19 suites passed, one failed, 36 not run; only failure was the same FFmpeg loudness measurement. Generic checks reported 799 passed, 0 failed.
- `npm.cmd run build`: passed; existing large-chunk and dynamic-import warnings remain.
- Browser and frame checks: not required for C3.

## Assertions and fingerprints

Changed one exact assertion in `tools/test-circuit-eifel.mjs`: the layout 3 Medium pace expectation now matches final `.862` (previously `.864`). The race-target assertions remain unchanged, including the 40% minimum that the final 33% result fails. No replay fingerprint changed.

## Removed

Removed only the malformed trailing characters from the Eifel replay JSON. The race and check outputs remain in `.qa-dist` as requested.