# RFX-04 acceptance test handoff

Status: tests ready for the CMB builder. This branch adds tests only. The
production split and multi-opponent combat are still pending.

## What changed

- `tools/test-combat-modules.mjs` requires the four named combat modules and
  `wasteland-tuning.js` to be importable and to expose their behavior or data.
- `tools/test-combat-opponents.mjs` exercises a seeded three-opponent race
  without a renderer. It checks UFO landing safety, bomb and bolt damage,
  CPU attacks and pickups, bomb cooldowns, and shield ownership. It also
  confirms that the first opponent remains the `state.rival` alias and keeps
  its existing shield behavior.
- No existing test or assertion changed.

## Current evidence on b16dd9a

- `node tools/test-combat-modules.mjs`: five expected failures, each
  `ERR_MODULE_NOT_FOUND` for a file required by RFX-04.
- `node tools/test-combat-opponents.mjs`: seven expected failures caused by
  combat still using only `state.rival`; the first-rival shield control passes.
- The opponent test used a temporary ignored `node_modules` junction to the
  integration worktree's installed dependencies. It did not install packages.
- No lane, merge, full, build, browser, or fingerprint gate was run while the
  audio lane's full check was in progress.

## Builder hooks

- Keep `src/combat.js`'s public `WEAPONS`, `supportsCombat`, `createCombat`,
  `ufoDestination`, `fireWeapon`, and `stepCombat` imports working while moving
  implementations to the named modules. An explicit CPU actor parameter or
  equivalent is needed so later opponents can fire.
- Read the full `state.opponents` list for UFO safety, projectile victims,
  CPU attack/pickup loops, and impact cooldowns. Keep `state.rival` as the
  first opponent for one-opponent compatibility.
- Scope shields and pickup charges per opponent. The existing first-rival
  shield must still work and must not shield another opponent. Preserve the
  existing combat test's event and tuning behavior for a one-opponent race.
- Review each combat literal while moving it to `wasteland-tuning.js`; these
  tests check module imports, but cannot prove every number was moved.
- The held audio branch may add a combat hit-position hook. Preserve that
  hook when applying the split.

## Required follow-up checks

Run both new files, the existing `tools/test-combat.mjs`, all combat tests,
replay fingerprints, then the normal lane gate and production build when the
audio full check is clear. Review one-opponent replay fingerprints for exact
matches and inspect the tuning extraction directly.
