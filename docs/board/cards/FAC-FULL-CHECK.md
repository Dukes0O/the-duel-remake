# FAC-FULL-CHECK

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

Kyle, 12 October 2026, evening: "night shift" is the wrong name. The overnight
run means all the building that happens while Kyle sleeps. The batch of heavy
checks (full tier, frame check at both qualities, combat balance `--check` on
current rules, all browser scenarios, then a short report) is renamed **the
full check**, named for what it does. By default it runs once a day while Kyle
sleeps, but the time is a default, not its definition.

It is also less restrictive from now on. It checks a copy of one commit, so
builders keep building and merging while it runs. Only its frame step needs the
laptop to itself (builders pause gates, builds and browser checks for that
step only, about 15 minutes). The other stages run alongside builders, each
counting as one of the at-most-three heavy jobs at `--jobs 4`. The full tier on
an exact release commit still runs alone before a release (AGENTS rule 1).

The replacement `tools/full-check.mjs` checks one detached source commit.
Only its frame step refuses competing heavy jobs; integration may advance
while the other stages run. The original whole-batch restriction is removed.
Tonight's direct 03:45 to Record night/06:30 pause still applies.

```yaml
  - id: FAC-FULL-CHECK
    title: "The full check: run on a copy of one commit, tool renamed to full-check.mjs"
    owner: codex
    lane: TOOL
    size: S
    needs: []
    status: ready
    owns: [tools/full-check.mjs, tools/test-full-check.mjs, docs/changes/FAC-FULL-CHECK.md]
    hooks: [docs/OPERATIONS.md, granted literal rename/current scheduling wording paths below]
    acceptance:
      - "Replace the old night-shift tool with tools/full-check.mjs and remove the old name in the same change, including every list, doc or script that names it. Keep --no-push. The idle flag (--idle-awake) may stay or be renamed; the change note says which."
      - "Run the stages in a detached copy of the starting integration commit, created as a sibling worktree, with node_modules linked to the integration copy. Unlink it with PowerShell Remove-Item after checking LinkType is Junction, then remove the copy with plain git worktree remove (never forced)."
      - "The integration commit may move during the run. The result is recorded for the copied commit, not for whatever integration holds at the end."
      - "Only the frame stage refuses or discards timing when another heavy job is running before or during it. The full tier, balance and browser stages run alongside builders, up to the three-heavy-job limit, each at --jobs 4 or fewer."
      - "The check record and report keep their current fields and are committed on integration with only their own files."
      - "The existing tool test, now tools/test-full-check.mjs, is updated to cover the copy, the moving head and the frame-only rule. Do not weaken or drop an existing assertion."
      - "No change to what is checked or to pass limits."
    note: "Kyle's scheduled task command becomes node tools/full-check.mjs --idle-awake --no-push when this merges. The change note docs/changes/FAC-FULL-CHECK.md must say so for Kyle, with the exact new command. Kyle reinstalls the Windows scheduled task himself. AGENTS rule 13 and next-run.md describe the copy-based full check; tonight's direct pause still applies."
```

## Director settled production scope before code

Root claims this tools-only card alongside the four open source handoffs. Own the rename and copy/run/record/cleanup logic and renamed existing acceptance. The complete rename hooks are only the tool filenames and relevant current scheduling wording in AGENTS.md, docs/FACTORY.md, docs/CODEX_PLAYBOOK.md, docs/OPERATIONS.md, docs/board/next-run.md, this card, docs/changes/FULL-CHECK-RENAME.md, docs/changes/FAC-03.md and tools/scenarios/frame-pacing.mjs. Change those file references and relevant current scheduling wording only; preserve every game/scene/measurement function, threshold, frame packet field, legacy fixture and other rule. No runtime game, asset, feature flag, runner selector or player-save edits. Keep --idle-awake and mandatory --no-push. The copy also has a verified .evidence Junction to integration/.evidence so the unchanged harness path guard accepts logical copy output paths; both Junction targets are verified before unlink. Use installed PowerShell 7 for Junction operations, with no legacy or recursive fallback. Scheduled command after merge is node tools/full-check.mjs --idle-awake --no-push; Kyle owns the Windows task change. Tonight's direct03:45 to Record-night/06:30 pause remains in force even if this general frame-only tool improvement lands sooner. Tests use the existing test-night-shift style and fake host/temporary Git facilities; no new framework. One normal nearby lane/build and independent code review; three actual jobs maximum, jobs4; never stop foreign work. Root owns integration metadata/merge/cleanup.

## Completed tool handoff

Corrected5dfd5f33:20/20 nearby, no failures/unrun,122.9078s/jobs4, build728ms/exit0, same ordinary reviewer confirms actual race-field-balance detection repair CLEAR. Conflict-free integration; no repeated gate. Only source-tool acceptance is complete; the actual daily batch remains scheduled04:00. Tonight03:45 hold and Kyle-owned Windows task change stay.
## Observed overnight entry point, 12 October 22:35 PT

The existing Windows task "The Duel full check" is Ready but its action still names removed tools/night-shift.mjs, in the correct integration folder. This is an observed task configuration, not a tool failure or a successful full run. Root will leave Kyle's task unchanged. At 04:00, after the mandatory 03:45 pause and a fresh process/clean-folder check, Root will check whether a full check is already running and start the accepted node tools/full-check.mjs --idle-awake --no-push once if the old task has not started it. No duplicate batch, task installation, push or release. Any measured frames still require the declared awake, quiet context and honest evidence; source and context failures stay visible in the report.

## Director actual batch failure and bounded repair, 13 October 04:22 PT

The accepted04:00 batch on copied sourcec03777d0 ran all422 full-tier rows:422 passed, failures[], zero unrun, exit0. It then refused remaining stages and nonforced cleanup because the full runner intentionally wrote the tracked docs/board/checks/full-tier.json in its own copy. Actual git status shows ONLY that generated record changed; all game/source files and HEAD are unchanged. The report committed e4aa958d as FAILED; frames, combat and browsers were never run. This is a real tool defect, not a game-test failure or an accepted whole batch. The direct pause ended with that actual Record night commit.

Reopen this existing tools-only card; no new unrelated lane. Own only tools/full-check.mjs, tools/test-full-check.mjs and docs/changes/FAC-FULL-CHECK.md. Preserve the unfiltered runner, all suites, assertions, thresholds, metadata publication paths, no-push and real source-dirty protection. Consume the full runner's intentional full-tier.json as generated evidence only after validating its exact source commit/end commit, clean source-state fields and actual complete result counts against the parsed full stdout. Preserve the generated record in this batch's owned ignored evidence, then restore ONLY that verified copied generated-record path to its source bytes so subsequent stages and nonforced cleanup see clean source. Reject any changed game/other file, changed HEAD, malformed/mismatched record or unverified partial output. Never broadly restore/ignore dirty files. Real complete failed-suite packets still keep their true failure verdict; do not hide a game failure while consuming its own report. Existing fake/temporary-Git test facilities add the actual report-mutation regression and rejection cases, not a new framework. No runner, selector, runtime, asset, save, flags, schedule installation or history edit.

One original nearby/jobs4, build and same ordinary code review on frozen repair. Investigation budget04:19→04:49; then a short note if unresolved. Retry the unfinished daily batch only after a real reviewed repair, never blind unchanged rerun. Root owns shared metadata/merge/cleanup and the retained full-check-XjBtWd copy; preserve its actual422 packet/verdict before restoring its verified generated report and unlinking both exact integration dependency/evidence Junctions for nonforced cleanup. No force or deletion of another folder. Yeti stays frozen bf26459b waiting Claude and corrected gate/build; no core-file work is added here.
