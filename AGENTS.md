# The Duel: rules for every agent

Read `SPEC.md` section 0 first; it wins over conflicting later text.
**Cleanup comes first (SPEC 0.7, Kyle, 24 September 2026): do the CLEAN cards
in order and start no feature work until they are done.** After that, the
ordered work in section 0.6 resumes. The current plan and start prompt are in
`docs/board/next-run.md`. Read `docs/CODEX_PLAYBOOK.md`
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

## How we work with AI-written code (Kyle, 24 September 2026; SPEC 0.8)

Old best practices assumed code was expensive to write, so everything was kept
in case it had to be rolled back. Here, redoing is cheap and storage, speed and
small context matter. These rules win over habit:

1. **Fix forward.** A mistake is a failing test, a fix and a pass. Rollback
   exists only for the live game (the previous build, kept for one release).
2. **Keep the recipe, not the output.** Commit scripts, prompts and settings.
   Rebuild models, renders, textures, reports and screenshots from them. Commit
   generated output only when the game loads it.
3. **One version of every binary.** Text history (code, tests, docs) stays: it
   is small and shows when a problem started. Binary assets keep only their
   current version; superseded versions are compacted out of history before
   every push (SPEC 0.8).
4. **Evidence is used once.** Screenshots, videos, recordings and logs serve a
   review and are then deleted. Keep the verdict: scores, findings, numbers.
5. **Replace means remove,** in the same change.
6. **Delete, don't archive.** Once a note's facts live in the current docs,
   delete the note. Git text history holds it if anyone ever asks.
7. **A branch lives as long as its work.** Delete a lane branch and its folder
   when its card is merged, replaced by other work, or dropped with a written
   reason. Never delete a branch for being idle. Branches Kyle creates are his:
   the janitor lists them but never deletes them.
8. **Targets, watched by the janitor.** Sizes are targets kept in one place
   (`tools/size-targets.json`), not merge blockers; they change as the game
   grows. Only a file in the wrong home fails a check.
9. **Never discard what can't be regenerated:** real player saves and their
   backups, Kyle's decisions and notes, licensed third-party files and their
   credits, and the current game assets.

## Where files live (SPEC 0.7)

- `public/`: only files the game loads at runtime. Never Blender files,
  videos, raw captures or other sources.
- Blender `.blend` files are rebuilt by the scripts in `tools/blender/` and are
  not committed. Commit the script and its small inputs instead.
- Review evidence (screenshots, videos, audio captures, gate logs) goes in
  `.evidence/<date>/<card>/` in the integration folder, which Git ignores.
  Commit only one compressed comparison sheet per round (JPG, 500 KB at most)
  and its review note under `docs/board/looks/<family>/`.
- Lane folders may link `node_modules` only to the integration folder's copy,
  never the live folder's. Unlink the link before removing a lane folder.
- Scratch output stays in `.qa-dist/`. Nothing new in the repository root
  unless it is on the root allow-list in `tools/test-repo-hygiene.mjs`.
- `tools/test-repo-hygiene.mjs` checks placement in every lane tier: a file in
  the wrong home fails. Sizes are targets in `tools/size-targets.json`,
  reported on the status page and handled by the janitor, not merge blockers.

## The janitor (SPEC 0.7)

- Every change note has a **Removed** section. When work replaces something
  (a model, code path, test, doc or tool), remove the old one in the same task,
  or name the task that will remove it when its switch turns fully on.
- Read only `docs/README.md`, your task card and the files it names. Anything
  not listed in `docs/README.md` is history, not instructions.
- **The janitor** runs at the end of every run and after every 10 merges, as
  its own step, never squeezed into a feature card. It keeps the repository
  clean by deleting, not by moving things into a closet:
  1. Delete lane folders and branches whose work is merged, replaced or
     dropped. Unlink dependency links first, then `git worktree remove`
     (never forced).
  2. List idle unmerged branches on the status page with their card, last
     activity and what they hold. Leave them in place.
  3. Delete review evidence once its verdict is committed.
  4. Fold still-needed facts from old notes, handoffs and log entries into
     the current docs, then delete the originals. No "history" folders.
  5. Remove what `node tools/repo-audit.mjs` proves unused: assets nothing
     loads, code nothing imports, tests of removed behavior, switches fully on
     for a release. Each removal passes the lane tier with unchanged replay
     fingerprints. Anything uncertain becomes a card instead.
  6. Compare sizes with `tools/size-targets.json`. Delete waste, record why any
     real growth happened, and propose new targets when the game has grown.
  7. Write one janitor line in `run-log.md`: what went, what was flagged,
     sizes before and after.
- Never force-remove a worktree or rewrite history without Kyle.
- History was rewritten on 24 September 2026 (SPEC 0.7, CLEAN-09). Never merge
  a branch that still contains pre-rewrite commits; rebase it first using
  `docs/history/history-rewrite-2026-09-24-map.txt`.
