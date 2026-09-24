# The Duel: rules for every agent

Read `SPEC.md` section 0 first; it wins over conflicting later text. Complete
the ordered work in section 0.6 before other new work, with its listed existing
cards continuing when lanes are free. Read `docs/CODEX_PLAYBOOK.md`
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

## Gates (SPEC 0.5)

- Before **every** merge into integration, including docs-only, tuning-only
  and doc-plus-code changes: `node tools/run-tests.mjs --tier lane --changed --jobs 8`
  and `npm run build`. Run these in the lane before review and verify current
  passing evidence before merging; rerun after changes or conflict fixes.
- Full tier: `node tools/run-tests.mjs --tier full --jobs 8 --keep-going`
  after every 5 merges or 2 hours of merging, whichever comes first, and at
  the end of every session and overnight run. A failed full run stops feature
  merges until a fix lands and the full tier passes again.
- Release: full tier must pass on the exact final integration commit before
  every release, including small and tuning-only changes. Keep the full
  release evidence: build, combat balance (with `wasteland2` off and on),
  browser scenarios, frame pacing, art and save budget checks as applicable.
  Card-specific visual, audio, gameplay and save checks still apply.
- Run `node tools/build-status.mjs` after every merge and at every session end
  to update `docs/board/STATUS.md`. A later commit needs its own full-tier pass;
  a status snapshot never grants a pass to another commit.
- D8 is awaiting Kyle's approval: do not push `integration/wasteland` or
  align GitHub `main` under that proposal. D4 already permits pushing `master`
  after a release.

See playbook section 7 for the gate and evidence workflow.
