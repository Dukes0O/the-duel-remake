# LAB-LESSON-FRAME

## Design settled before code

Lessons register a data definition and drawing hooks. The five stages are
wonder, words, watch, predict/try, and check/challenge. A session owns only
teaching state; it cannot grant rewards. The existing challenge owns passing.
Unconverted machines keep their existing benches until their lesson card
supplies real content; this card does not invent sixteen unfinished lessons.
The example is test-only, loaded into the real walking room for pictures.

Words have stable ids, a one-sentence meaning, and an animation hook. A
definition names its required vocabulary; validation rejects any mention
before that word's introduction, including in wonder, earlier meanings,
picture labels, hints and controls. Unknown jargon still needs author review.
Notebook entries store ids only in `profile.lab.notebook`, with an empty
old-save default. Definitions provide meanings and animations, never saves.

The machine remains the main picture. A bottom teaching strip uses the
hangar's steel (#252c29), chalk (#f5f0dc), brass (#edc557), and existing
sans-serif type at 23px. Force colours have fixed meanings. Picture choices
sit above the strip; pointing at an underlined word replaces the current
caption with its meaning. This preserves the two-sentence reading budget.
Watch controls operate a lesson clock, not wall time. The drawing layer receives
that clock, current input, and the previous run, and return drawing data.

Three tries remove guidance in order. Failure counts persist across retries;
Show me returns to the player's same try after the worked answer and cannot
complete it. Checks reveal and animate the correct picture without penalty.
The challenge card follows the launched challenge until it ends or is left.
Existing interface cues are reused; no new voice recording or voice spend.

## Checks planned

- `tools/test-lab-lesson-frame.mjs`: vocabulary ordering, transitions, hints,
  old/malformed/future saves, notebook writes and force scaling.
- `tools/scenarios/lab-lesson-frame.mjs`: real walking room, E, five stages,
  pause/step/replay, pictures, hints, notebook and switch-off behaviour.
- Lane tier (jobs 4), production build, independent save/code review.

## Results

- Seven new frame tests pass. Backup, storage-budget, combat-credit and
  police-fine suites pass (22 test cases plus their internal checks).
- Independent save/code review: approved. Reviewer ran 23 historical save
  fixtures and one forged fixture: 1,029 checks. Fixed future-notebook reads,
  old-save shape preservation, successful ghosts, every challenge kind,
  Show me during inline challenges, and ski session cleanup.
- Memory-only browser scenario passes after the read-helper fix on private
  port 47528 on reviewed source b16176cd: eleven
  screenshots, zero warnings/errors. Covers E, every teaching stage,
  help, notebook after reopening, the key card in a real flight challenge,
  and the old Lab with lab-2 off. No frame timing or live saves used.
- First browser attempt found the test helicopter's empty tank; the fixture
  now starts with a full tank. Pending challenge cards also survive refuelling.
- Visual review: captions and picture choices read clearly at 1440 by 900;
  arrow labels no longer cover the arrow. Force numbers share the arrow scale;
  graph and streams follow the paused clock. Example content is deliberately
  a ball and fan, not the future Lift lesson.
- `docs/board/looks/lab-2/look-2.jpg`: five required views, under 500 KB.
  Raw captures: `.evidence/2026-10-26/LAB-LESSON-FRAME/`.
- Lane tier on merged source 6bc0faf7: 42 passed, zero failed, zero not run,
  jobs 4, 415.71 seconds. Replay fingerprints: 225 checks across 25 cases;
  world composition: 47 exact scene checks, unchanged.
- `npm run build` passed on b16176cd in 1.14 seconds, with System32 first on
  PATH. Vite reports its existing large-chunk and shared dynamic-import warnings.
  Board check: 191 passed. Repository placement and diff whitespace pass.
- The first lane run on 8e7575ff caught the original `createLab()` shape
  assertion. Kept that assertion and constructor unchanged; `labNotebookOf`
  now supplies the empty read default, and only learning adds the save field.
  That run drained normally: 28 suites passed, one failed, fourteen not run.
  The original Lab rules and historical fixtures pass after the fix.
- Challenge key ideas and inline instructions each use one sentence. Hints,
  word meanings and Show me temporarily replace the key card, preserving the
  reading budget. Pure checks cover the return to the unfinished challenge.
- Resumed after the release hold and merged integration 416b8d6e. The only
  conflict was STATUS.md; kept the release snapshot. The independent reviewer
  confirmed that the merged helicopter save changes preserve the notebook.
  Current merged acceptance batch: 49 cases passed, including all 1,029
  historical save checks. The earlier e13 lane run was interrupted for the
  release window and is not counted as a passing gate.
- Fixed keyboard focus wrapping to skip hidden bench controls during lessons.
  The browser scenario sends a real Tab from the visible Notebook button and
  checks that focus remains inside the Lab. Independent delta review approved.
  This is the only game-code change after the green merged lane run; its real
  browser check passed on b16176cd. Reused the passing lane checks under the
  check-once rule rather than repeat unchanged race and world suites.
- Save/code review approved the complete frame, the notebook compatibility
  fix, the integration merge and the keyboard delta. No open card blockers.
- Final evidence sheet: 298,863 bytes. Final changes after the checked source
  are only this note, STATUS, the look verdict and its regenerated sheet.

## Handoff

`docs/lab-lesson-authoring.md` explains the packet and drawing contract.
LAB-LIFT-2 supplies the first real lesson's content and animation; it is not
implemented by this card. Machine actions reuse `lab.clunk`; teaching
navigation uses `lab.tick`. Existing recorded Brian cues can be named by data.
Session-end Cockpit sync ran against integration's current board: no changes
needed and no missing task mappings reported.

## Changed assertions

No existing assertions changed. The new notebook test now reads through
`labNotebookOf` and also asserts that an old Lab has no stored notebook field.

## Removed

No existing player content replaced. LAB-LIFT-2 and LAB-LESSONS-2 replace the
old bench content; Lab 2 go-live removes the old panels under LAB.md 12.5.
Recycled this task's generated `.qa-dist` and `dist` folders and the consumed
failed/interrupted logs. Kept the requested captures and current green logs.
