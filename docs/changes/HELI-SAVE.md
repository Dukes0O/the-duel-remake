# HELI-SAVE

The helicopter's save field and its credit rules, as pure functions in
`src/heli/heli-save.js`. `normalizeProfile` gets one line that rebuilds an
existing `heli` field; a save with no field gets none, and nothing is guessed.
Stored helicopter data survives loading whether the `helicopter` switch is on
or off. Every helper takes the switch as `{enabled}`, refuses when it is off,
and returns a new profile without changing the one it was given.

What the helpers do: the first fuel tank is free, later fuel costs 1.5 credits
per kilogram (rounded up), and a short wallet buys only what it can pay for.
Repairs and the fuel truck take what the player has and forgive the rest, so
credits never go below zero and nobody is stranded. Play days, lessons, where
each special car was set down, and flights are recorded with safe limits. The
design is written in `docs/board/cards/HELI-SAVE.md`.

New files: `src/heli/heli-save.js`, `tools/test-heli-save.mjs` (14 groups),
`tools/fixtures/saves/10-heli.json`.

## Checks

On the lane branch, source commit 0526bc71:

- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 249 passed,
  0 failed, 0 not run, 1249.89 seconds.
- `npm run build`: passed (the existing large-chunk warning only).
- `tools/test-save-fixtures.mjs` now covers 10 shapes and 321 checks, with
  heli preservation (fuel, lessons, car places, refuels, flights) and a check
  that older saves gain no heli field. The older fixtures still match the
  pre-card normalizer byte for byte in `test-deep-save.mjs`, including the new
  fixture.

## Changed assertions

Only the three roster counts change, from nine to ten, because a new
historical save shape was added and the reviewed roster grows by one:

- `tools/test-save-fixtures.mjs`: `files.length` 9 to 10.
- `tools/test-arena-settlement.mjs`: `files.length` 9 to 10.
- `tools/test-career-backup.mjs`: `fixtures.length` 9 to 10.

Also added in `tools/test-save-fixtures.mjs` (a new check, nothing weakened):
heli preservation for a save that has the field, and no heli field for one
that does not.

## Removed

Nothing. This card replaces nothing.

## Sound cue

None. This card adds no game event sound.
