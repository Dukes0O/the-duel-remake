# CLEAN-05: Current docs and short-lived evidence

Status: ready-to-merge.

## Changed

- Added `docs/README.md` as the entry point for current instructions, technical
  references and historical evidence. `AGENTS.md` and the playbook point to it.
  The playbook and operations guide now give the current cleanup order,
  after-merge deletion rule and D8 push condition.
- Moved six frozen first-person/Rustwall Blender QA manifests and two
  rigged-fighter fixtures, byte-for-byte, into `tools/fixtures/art-review/`.
  The browser scenario fallback and rigged-fighter test read them there. A
  fresh `.evidence` Blender manifest still takes precedence for new rounds.
- Added a review-folder note to explain that older review prose refers to raw
  files that were deleted after their verdicts. Current review notes and the
  CLEAN-04 compact JPG remain.
- The run log begins on 22 September; every entry is within the requested
  seven-day window on 24 September. None was trimmed or relabeled as current.
- Moved the still-needed Blender rebuild and size facts into the asset guide,
  the measured shift audibility concern into the audio guide, and the CMB-02
  contact rules into its board card. Historical task-note references now
  direct readers to current docs or Git history. The root README's old
  server-plan link resolves through a short current redirect, because lanes
  may not edit that README.

## Checks

- Focused `tools/test-review-evidence.mjs`: 9 tests, 185 checks, zero failures.
  It now requires no raw JSON under looks and verifies the frozen camera,
  asset, capture and hash facts in all six moved manifests.
- Focused `tools/test-rigged-fighter.mjs`: 14/14 checks. Existing assertions
  were only redirected to the moved, byte-identical fixture files; none was
  removed or weakened.
- `tools/test-repo-hygiene.mjs` passes. All local links in the new docs index
  resolve. The baseline integration full tier passed 237/237 suites and 162
  replay checks immediately before this lane. Final lane tier passed 237/237
  suites in 390.99 seconds, including 162 unchanged replay checks and 48/48
  expansion races. `npm run build` passed; `dist/` is 254,802,821 bytes,
  unchanged from CLEAN-04. `git diff --check` passed. Independent review
  confirmed the moved fixtures are byte-identical and found no remaining
  material defect after the stale SPEC sentence was corrected.
- No runtime code, race rule, save, replay fixture or shipped asset changed.
  The Rustwall historical fixture hashes already differ from today's GLBs,
  so an old-round direct Rustwall run remains unsuitable for new visual QA;
  a fresh capture is required. The current hidden-road scenario was used for
  CLEAN-04's matched visual comparison.

## Removed

- Deleted 109 historical raw looks JSON files (2,547,011 bytes) after moving
  the eight needed fixtures. Deleted seven builder provenance notes whose
  independent review verdicts remain.
- Deleted the stale remake plan, session handoff and two overnight handoffs
  after checking that the spec, board, operations guide and retained review
  notes hold the current decisions and limits. Replaced the server cutover
  document with a short current redirect for root README and verification
  links. That older worktree has already been retired.
- Deleted 125 superseded change notes: eight drafts first, then 117 task
  notes (449,586 bytes). Only the changes-folder instructions and this
  current CLEAN-05 note remain. Old text remains in Git history.
- `docs/` fell from 4,033,821 to 833,198 bytes; the review folder fell from
  2,826,636 to 158,118 bytes. The fixture move keeps 90,464 bytes of active
  QA input in its proper home.
