# WW-HOOKS

## Changed

- Added the `world-job` arena mode and its headless job runner. It steps the shared job engine, sends wave requests through raiders, sends follow requests to the arena pilot, and shows caption lines through callouts.
- Allowed the player to step out and back in during a world job.
- Added per-run weapon lending. A job loan is added to the active arena loadout and does not change the saved loadout.
- Added a real-Duel test for starting a job, stepping out and in, firing a loaned weapon, and settling a completed job once.

## Checks

- `node tools/test-world-job-mode.mjs` — passed.
- `npm run build` — passed. Vite reported large-chunk and ineffective dynamic-import warnings.
- Lane tier — not run, as Kyle directed. Claude runs the lane tier.
- Browser check — Claude runs: one playthrough of a world job.
- Look check — Claude should check the Scablands job playthrough, including visible captions and any job marker, a requested raider wave and following target, and the loaned weapon during driving.

## Assertions and fingerprints

- No existing test assertion changed. The new mode test adds assertions for this card's behavior.
- No replay fingerprints were recorded or changed. Existing arena modes keep their existing time, combat, and control paths; the new rules run only for `world-job`.

## Removed

- None.

## Review follow-up still needed

- The Easy proof still calls `stepJob` and invents outcomes; it has not been replaced with an input-only real-mode driver.
- The new abstract path actors are not connected to visible vehicle props or real combat damage. Quit and pause loan cleanup are also untested. This change is not end-to-end acceptance for WW-HOOKS.
