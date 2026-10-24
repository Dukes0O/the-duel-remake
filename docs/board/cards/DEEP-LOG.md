# DEEP-LOG

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/THE_DEEP.md`; this card names the slice, files and acceptance.

Codex. Rewritten 24 October 2026: THE_DEEP sections 5 and 6.4 to 6.6.
Switch `the-deep` (dev). Needs DEEP-TRAIL (DEEP-SAVE is done).

- `src/deep/deep-log.js`: log a creature within 6 m of its zone spot under
  15 km/h for 1 s (spots, never the moving creatures); collect a pearl
  within 3 m under 15 km/h for 1 s; pay 50 credits for a first log, 250
  when a place's page completes and 150 per pearl, each once; the
  pearl-white finish in `src/paint-presets.js` after all nine. Emits
  `deepLogged` and `deepPearl`.
- The log page in the garage: one row per place, picture cards with each
  creature's name and the true fact from section 5's last column, grey
  shapes for the ones not yet found, and the pearl count.
- Ana's `deep.ana.log`, `deep.ana.otter`, `deep.ana.page` and
  `deep.ana.pearl` at those moments once DEEP-RADIO has merged (before
  that the caption shows without sound).
- `tools/test-deep-log.mjs`: log and pearl rules, pay once, page complete,
  pearl-white after nine, a fact for each of the 14 ids.

Owns: `src/deep/deep-log.js`, `tools/test-deep-log.mjs`,
`docs/changes/DEEP-LOG.md`. Hooks: `src/screen-garage.js`,
`src/paint-presets.js`. Locks: none (the fields exist from DEEP-SAVE).
Sound: `deep.logged` and `deep.pearl` (both exist). Art: creature pictures
rendered from DEEP-ART-SRC's models.

Acceptance: the test, lane tier, build, one review. Removed: nothing.
