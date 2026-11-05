# WW-EVERBURN-JOBS

## Changed

- **Completion design decisions (5 November 2026):** replace the synthetic
  `stepJob` driver with the fixed-step `Duel` and only player controls. A
  small input helper will steer the car or fighter to the job's live marker;
  job steps, enemy health, contacts and hit reports remain owned by the real
  simulation. Keep job settings unless the real run proves a specific
  definition prevents Easy completion; any adjustment must say why here.
- Visible actors use the renderer's existing car-asset path and existing
  source props as temporary stand-ins. WW-ART-VEHICLES replaces the thief,
  Big Bess and furnace vehicle stand-ins; WW-ART-KIT replaces the barricade,
  ember pot and smaller job props; WW-ART-FOLK replaces townspeople and Ash
  Men.

- Added six Everburn story jobs and three Tin Town side jobs as data in `src/world/jobs/everburn.js`.
- Added `tools/test-everburn-easy.mjs`, which runs each definition through the existing headless job engine for ten deterministic Easy passes and checks completion, restart count and an action limit.

## Checks

- `node tools/test-everburn-easy.mjs` — passed; each of the nine jobs won 10/10 scripted Easy runs.
- `npm run build` — passed via `npm.cmd run build` because PowerShell blocked the `npm.ps1` shim. Vite emitted the existing dynamic-import and large-chunk warnings.
- Lane tier — not run, as directed; Claude runs it.
- Browser/look checks — Claude runs. Please check that each mission's current marker and prompt match its objective, the on-foot job clearly prompts exit and return, and the Everburn finale progresses from three defence waves to three glowing furnace vents.

## Changed assertions

- None.

## Race fingerprints

- Not applicable. These job definitions do not alter race simulation or replay fixtures.

## Removed

- None.

## Review follow-up still needed

- `tools/test-everburn-easy.mjs` still simulates `stepJob` directly and its 10/10 report does not prove the actual arena mode. Replacing it with a child-pace input driver remains required before this card can be accepted.
- The review fix adds definitions for the thief, Big Bess and Old Smoke's furnace paths, but the current mode actors are simulation-only. Visible vehicle props, real hit handling for the furnace vents, and complete real-mode runs remain unverified.
