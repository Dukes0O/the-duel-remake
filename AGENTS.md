# The Duel: rules for every agent

Read `SPEC.md` section 0 first; it wins over conflicting later text.
**Cleanup comes first (SPEC 0.7, Kyle, 24 September 2026): do the CLEAN cards
in order and start no feature work until they are done.** After that, the
ordered work in section 0.6 resumes. Read `docs/CODEX_PLAYBOOK.md`
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

## Where files live (SPEC 0.7)

- `public/`: only files the game loads at runtime. Never Blender files,
  videos, raw captures or other sources.
- Blender `.blend` files are rebuilt by the scripts in `tools/blender/` and are
  not committed. Commit the script and its small inputs instead.
- Review evidence (screenshots, videos, audio captures, gate logs) goes in
  `.evidence/<date>/<card>/` in the integration folder, which Git ignores.
  Commit only one compressed comparison sheet per round (JPG, 500 KB at most)
  and its review note under `docs/board/looks/<family>/`.
- Scratch output stays in `.qa-dist/`. Nothing new in the repository root
  unless it is on the root allow-list in `tools/test-repo-hygiene.mjs`.
- Limits, checked by `tools/test-repo-hygiene.mjs` in every lane tier: a merge
  adds at most 5 MB to Git (20 MB for an art card that states its budget); no
  committed file over 2 MB outside approved art files; shipped build and
  per-model budgets as in SPEC 0.7.

## Clean up as you go (SPEC 0.7)

- Every change note has a **Removed** section. When work replaces something
  (a model, code path, test, doc or tool), remove the old one in the same task,
  or name the task that will remove it when its switch turns fully on.
- Read only `docs/README.md`, your task card and the files it names. Anything
  not listed in `docs/README.md` is history, not instructions.
- At the end of every run and after every 10 merges: run
  `node tools/repo-audit.mjs`, remove what it proves unused, file cards for
  the rest, and remove merged lane folders with `git worktree remove` after the
  hash check. Never force-remove a worktree or rewrite history without Kyle.
- History was rewritten on 24 September 2026 (SPEC 0.7, CLEAN-09). Never merge
  a branch that still contains pre-rewrite commits; rebase it first using
  `docs/history/history-rewrite-2026-09-24-map.txt`.
