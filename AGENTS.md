# The Duel: rules for every agent

Read `SPEC.md` for the approved Wasteland design, `docs/CODEX_PLAYBOOK.md`
for the workflow, and `docs/board/board.yaml` for task ownership. Use
`docs/OPERATIONS.md` for current folders, ports and release steps.

## Never

- Do not edit or build in `C:\Users\kyleb\dev\the-duel-remake` except as the
  Release Manager after the release gate. That folder serves the live game.
- Do not use port 5174 for development or QA. Do not refresh a live race.
- Do not read, write or reset real player saves. QA uses memory-only storage.
- Do not add runtime dependencies, network requests, accounts or API keys.
- Do not weaken a test to make a change pass. Explain and review any changed
  assertion in the task's change note.
- Do not regenerate world signatures without a reviewed visual difference.
- Do not edit `README.md` or `docs/VERIFICATION.md` in a lane. Write a change
  note under `docs/changes/`; the Release Manager collects those notes.

## Always

- Keep race rules repeatable from seed and inputs, runnable without graphics.
- Keep the renderer, HUD and menus from changing race state.
- Use the seeded generator in `src/rng.js` for simulation randomness.
- Put new player features behind a switch in `src/feature-flags.js` once
  FND-09 installs it.
- Use readable code and LF line endings. Unpack a packed file when rewriting it.
- Stay inside the task card's owned files and named hooks. Ask the Director to
  re-slice a card when another file is needed.
- Record tests, browser checks, changed assertions and race fingerprints in
  `docs/changes/<task-id>.md` before a lane hands work to integration.

## Gates after FND-06 and FND-08

- Lane: `node tools/run-tests.mjs --tier lane --changed --jobs 8` and
  `npm run build`.
- Merge: `node tools/run-tests.mjs --tier merge --jobs 12`, `npm run build`,
  and `node tools/browser-harness.mjs smoke`.
- Full: `node tools/run-tests.mjs --tier full --jobs 10`, the combat balance
  check, browser scenarios, frame pacing, art and save budget checks.

Until those tools exist, run the current direct tests and full suite. A full
check must pass on the exact integration commit before a release.
