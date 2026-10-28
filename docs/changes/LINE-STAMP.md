# LINE-STAMP

Kind: tooling. Flag: none. Status: ready for Director handoff.

Lane started with a fast-forward from `integration/wasteland` at `62309ab2`,
including Claude's 28 October staged-line design. No merge back or push.

## Design

Use FACTORY section 3 for stage names and gate text, and section 6 for packet
headings. Stage arrows are explicit data in the generator. Packet approval is
a written prerequisite in every card, not an unknown board card in `needs`.
Only root stages become ready with `--ready`. Generated locks start empty
except release stages, which hold `release`; Claude fills stage-specific
locks and owned files from the packet before work starts. Lanes describe the
stage work; sizes are initial estimates, not design decisions.

Preflight all seven ids against open and completed cards and existing card
files before writing. Preserve existing packets. Dry runs show planned board
entries and file contents without creating directories.

## Checks

Extend `tools/test-board.mjs` with temporary-copy stamping, standard board
validation, both graphs, ready roots, packet preservation, dry runs and refusal
without writes. Run the lane tier with two jobs and the production build.
No browser, save, art or frame checks apply to this documentation tool.

Results:

- Final lane coverage: 20 of 20 selected suites passed, with no failures or
  unrun suites remaining. The final focused completion passed 10 of 10 in
  209 seconds; the preceding final-source lane run supplied the other ten.
  Both runs used `--tier lane --changed --jobs 2`. Completion selected
  full-check, integrate-lane, lab-lessons-flying, preview-launcher,
  qa-storage, replays, repo-hygiene (both suites), test-test-runner and
  world-composition, with `--keep-going`.
- Final `node tools/test-board.mjs`: 196 checks passed. File fixtures require
  Windows Recycle Bin cleanup; other systems explicitly report them unrun
  while retaining the portable board checks.
- Production build: passed, 599 modules, using
  `node node_modules/vite/bin/vite.js build --configLoader native`.
  Plain `npm run build` failed because Vite tried to write its config cache
  through the shared dependency link outside the writable lane. npm also
  stripped the attempted loader argument, so the direct Vite CLI was used.
  No dependency or config changes were needed.
- Independent review found reserved Windows packet names, a link anchor and
  portable test cleanup. All fixed and confirmed clear by the reviewer.
- `git diff --check`: passed. No real course or car stamped.
- Replay fingerprints: 225 checks passed; combat replays: 12 checks passed;
  world composition: 47 checks passed. No fingerprints were re-recorded.

The first lane tier passed 16 of 17 suites. Its unchanged test-selector
assertion caught broad `docs/` prefixes in computed paths. Course and car
folder literals now name their exact folders; no selector assertion changed.
The next lane tier passed ten suites, then stopped with one failure and nine
unrun: the existing full-check fixture could not launch `pwsh` in the sandbox.
The failed and unrun suites were then run as one focused lane completion
with two jobs and launch permission. No existing assertion changed.
Game source, race rules, world signatures and saves are unchanged. The
successful production build covers the final change because only the card
tool and its tests changed afterwards.

## Changed assertions

None. Add acceptance checks without changing existing assertions.

## Removed

Nothing replaced. Temporary stamp copies and the generated production build
were recycled. No `.evidence` folder was created. Cockpit was not changed:
this job permits work only in this lane. STATUS was regenerated in the lane.

## Claude's review (28 October 2026, night)

Approved (independent review by Codex's reviewer and Claude's check). Tool only: stamps C1 to C7 or V1 to V7 with needs following the FACTORY graphs, refuses duplicates and bad ids, has a dry run. Dry run for kogane-pass checked by Claude. No assertion changed; board tests added.
