# EVERBURN-REMAKE slice 7
- Built: job cars use their floor height once; close rider map marks stay visible; the land requests wind.
- Checks: `test-scablands-scene` passed before `a36c38615`; `test-scablands-map` passed on cure 2.
- Checks: `test-audio` (618) and `test-p4-audio` passed on cure 3; the arena's pinned hashes are unchanged.
- Integration: brought `integration/wasteland` in; already current at `01cfa107c`.
- For Claude to run: updated `everburn-job1` pictures when all cures are complete; independent review.
- Changed assertions: the old sound-bank projection excludes new `ambience.scablands`; its expected hash is unchanged. No switches or saved fields changed.
- Sound: `ambience.scablands`, two looping noise layers under `story-everburn`; no new file.
- **Removed:** duplicate job-car ground offset; player arrow covering nearby riders on the map.
- Still to build: cures 4 to 8 and final checks.
