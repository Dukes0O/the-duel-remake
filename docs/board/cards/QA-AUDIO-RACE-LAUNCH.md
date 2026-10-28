# QA-AUDIO-RACE-LAUNCH

The short board entry controls current state, ownership, dependencies and locks.

## Why (Claude, 25 October 2026)

The nightly full check of 24 October found `tools/scenarios/audio-race.mjs`
failing with "Audio race did not capture a real blast with spatial geometry".
It passes on bab0036b and fails alone and in the batch from FIX-LAUNCH's merge
(46c6d520, found by bisect). `tools/audio-race-check.js` fires the crossbow and
bomb at 1 s into the race; with the gentler launch the car is slower then, and
the real blast now lands almost dead behind it (its pan is under the 0.2 the
scenario requires).

## The card

Restage the race probe so a real (race-source) blast lands clearly to one
side under the new launch: fire later, from a lateral offset, or at a
placed opponent, whichever is simplest and stays repeatable. Do not change
any assertion or tolerance in `audio-race.mjs` (pan above 0.2, both probes,
the isolated hit, the decode checks) and do not lengthen the 14 s window.
Run `node tools/run-browser-scenarios.mjs --scenarios audio-race,audio-listening,audio-crash-peak --jobs 1`
three times; all must pass every time. Owns `tools/audio-race-check.js`.
