# Run, 14 October afternoon to 15 October 2026

Kyle's order, AGENTS.md rules 1 to 18 and `docs/FACTORY.md` govern this run.
Work in integration and isolated lanes. Nothing goes live without Kyle's word.
No push except Claude's release and compaction pushes, no port 5174, no real
saves. QA storage is memory-only. Delete only lane folders created in this run.

Keep every line busy (Kyle, 14 October): up to six build lanes at once, no
more than three course lanes. When a lane merges, open the next card at once.
Stop only when no Codex card is ready.

## Tonight, 15 to 16 October (Claude, 20:20; wins over older sections)

Ardennes Forest went live at 20:03 (build 20261016030307). Kyle, 20:20: Summit
may go live overnight only if all green; Claude stops at 08:00 for Kyle's
quota; Codex carries on.

**Core locks are released (Root handback d77e28eb).** Team Room is Claude-owned;
its remaining presentation hook does not hold the next core/save cards.

1. **Team Room is handed back to Claude before the22:30 deadline.** Retain
   clean b7df3fde, its passing72photos and native ghosts. The existing b7
   canonical run drains once; do not duplicate it. Claude's approved five-variant
   entry hook and semantic check remain, with a new core lease only if needed.
2. **busy-game-files, in this order:** SUMMIT-SWITCH-ON (Kyle approved the
   v2 patch at 20:20; merge, then Claude runs RELEASE-SUMMIT), TYRE-SLIP (finish
   to merge, switch dev), GP-RACECRAFT (switch dev; add it to the desktop
   preview flags for Kyle), DRIVE-LESSON-1 then DRIVE-LESSON-HOOKS,
   YETI-FUR-TINT, WILD-VIEW, QA-SUMMIT-WARMUP-EXCEPTION.
3. **save-shape, in this order:** RESCUE-SAVE, then SKIN-SAVE, then P4-COACH's
   save part.
4. **No core lock (any time):** EARN-CAR-2 (F1 pitch approved) and EARN-CAR-3,
   QA-YARD-HOME-AIR-ONLY, QA-YETI-THREE, WILD-ART-SRC's beaver (moose and bear
   wait for Kyle's downloads).
5. **Claude overnight:** RELEASE-SUMMIT when SUMMIT-SWITCH-ON merges (all
   green only); ARDENNES-FAR-FOREST in a Claude lane when its files are free;
   P4-FINISH-TEAMROOM when P4-INTEL-LEVELS merges; the janitor clears merged
   lane folders (Kyle approved, merged only).
6. **The 04:00 full check stays;** the laptop is Codex's alone for its frame
   step, 04:00 to about 04:40. Laptop screen off, Dells on.
7. **Holds:** read the top of docs/playtest-inbox.md before every heavy job;
   start nothing heavy while a FULL TIER FOR RELEASE STARTING or FRAME CHECK
   STARTING has no later DONE. At most three heavy jobs across all chats.

**Build while checks wait (Kyle, 15 October evening).** A frozen card waiting
only for a heavy slot does not stop source work. Release core/save locks it
will not edit, preserve the exact frozen candidate and continue another ready
Codex card in an existing or properly admitted card lane. Respect real file
ownership and the six-lane/three-course limits. Summit keeps merge priority;
do not launch another heavy job above three or call an unrun check passed.
## Tonight, 14 to 15 October (Claude, 19:50; wins over the order above where they differ)

Kyle, 14 October evening: "do what you can"; Summit Run may go live overnight
**only if every check is green** (full tier alone, combat balance, browser
checks, the headed frame check at Summit's busiest view at both qualities,
Claude's review). Otherwise it waits for Kyle's go in the morning. Kyle has
set the laptop screen off (Dells on) for frame checks.

1. **After the helicopter release posts RELEASE DONE**, Codex first takes the
   two cards that decide whether Summit can ship:
   - **PERF-HIGH-NIGHT** (High at night misses frames; Summit's snowy night is
     heavier), measured on Harbour and on Summit's night summit;
   - **P4-SUMMIT-ATTACK**, measure T on the accepted route and finish it. If it
     is not green by 02:30, Summit ships without Time Attack (it stays dev).
2. **Codex, right after those two:** SUMMIT-GALLERY-COVER, SUMMIT-PIT-BALANCE
   (Claude settles its number), SNOW-VARIATION, YETI-FUR-TINT, then
   QA-REVIEW-BLACK-FRAMES. Summit's finishing pass part 1 is merged.
   **Claude** finishes P4-FINISH-SUMMIT in lane claude-finish-summit, merges
   it, then prepares and runs the Summit release (RELEASE-SUMMIT), posting the
   usual hold and RELEASE DONE.
3. **The 04:00 full check stays** (scheduled task). A Summit release full tier
   must finish by 03:40 or start after the full check's frame step ends
   (about 04:30); the frame step needs the laptop alone from 04:00.
4. Everything else as ordered above. History compaction is not run tonight.
5. **Claude stops all its work at 08:00** (Kyle needs the quota from 08:40).
   Codex carries on; questions wait on the cards, and rule 16's one-hour
   backup applies to small questions overnight.

## Order

Start from `node tools/board.mjs`. Read each card's "Claude answers" first.

1. **Finish what is open:** QA-HARBOUR-ROAD-CLEARANCE, P4-AVALANCHE,
   P4-ARDENNES (Kyle: "make that one a beauty!"), QA-BROWSER-SWEEP and
   HELI-ART-SRC. Their lane folders hold committed work; continue from there.
2. **Gameplay, as locks allow:**
   - TYRE-SLIP (`busy-game-files`, behind its `tyre-slip` switch);
   - EARN-MEDALS (`save-shape`), then EARN-SCREEN, then EARN-CAR-1, 2 and 3;
   - P4-VARIANTS (`circuit-registry`), then P4-CUPS;
   - P4-INTEL-LEVELS, then P4-COACH.
3. **Fixes Kyle will see:** FIX-ROAD-SEAM, PERF-HIGH-NIGHT, PANORAMA-TOWN,
   QA-STOCK-SNOW.
4. **Art, whenever an ART lane is free:** WILD-ART-SRC (North woods first).
5. **Checks and tools, in the gaps:** QA-FRAME-ENVIRONMENT first (a frame
   check that misreads holds back releases), then QA-TITAN-REPLAY-TIMEOUT,
   QA-AUDIO-CLOCK and DISC.

Lower numbers win when two cards need the same lock. Cards waiting on Claude
are skipped while other work exists; after an hour without an answer, AGENTS
rule 16's backup applies.

## Holds

- The Deep beyond its art and sound, and the Lab, wait for Kyle's storyboard
  with Gratian: no DEEP-TRAIL, DEEP-LIFE or DEEP-LOG work.
- The Flying line (HELI and FIRE cards) is Claude's, in Claude's own lanes
  (`docs/HELICOPTER.md`, `docs/HELI_FIRE.md`). Codex takes only HELI-ART-SRC.
- Claude's finishing passes (P4-FINISH-*) start as their cards merge.

## The full check

Once tonight while Kyle sleeps, per AGENTS rule 13:
`node tools/full-check.mjs --idle-awake --no-push`. It checks a copy of one
commit, so building and merging continue; only its frame step needs the
laptop to itself (about 15 minutes, no gates, builds or browser checks).
Commit every board, inbox and status edit on integration before it starts. A
failure names the first merge after the last green full check; its fix goes
first.

## Limits

At most six build lanes across all teams, no more than three course lanes.
At most three heavy jobs at once, each `--jobs 4` or fewer. Check node.exe
command lines first.

Merge as soon as one lane tier and a build are green, with one review where
rule 17 asks for one. Spend at most 30 minutes on any one failure or tool
problem, then note it and move on. No new test machinery without a card. One
short run-log line per merge.

Commit board, inbox and STATUS edits at once. Clear merged lane folders
before opening new ones.

## Start prompt for Codex

```
You are Codex's lead for The Duel. Work in
C:\Users\kyleb\.codex\worktrees\wasteland-integration\the-duel-remake on
integration/wasteland. Read AGENTS.md, then docs/board/next-run.md, then run
node tools/board.mjs. Follow the order in next-run.md without asking: finish the
open cards first, then keep up to six build lanes busy with ready Codex cards,
opening the next card as soon as a lane merges. Never start a card owned by
Claude. Stop only when no Codex card is ready, then run the janitor sweep and
write one handoff line in docs/board/run-log.md.
```

## Retained facts

- Sound was approved by Kyle on 11 October; recipes and current runtime audio
  remain.
- Snow's accepted pine clearance is at least 6.44677 m; there is no fourth
  shared-snow art round.
- Claude owns Harbour base and finishing cost.
- An older full-tier result is not a pass for the current commit.


## Morning handoff, 16 October 08:30 PT (Root)

The authorized overnight run ends here; its heartbeat is paused after this
handoff. The queue is not complete. All four unmerged owned lanes are clean
and retained, with no Root heavy job, private browser/server, core/save lease
or heavy reservation left active:

- TYRE-SLIP `tyre-slip` / `codex/tyre-slip`,
  `3e2bf73f81c3f703ac9cce1b154adb4ee829d5a2`: corrected inactive state remains
  byte-identical; independent code/save delta review CLEAR. Corrected gate
  was interrupted at restart, morning resume cancelled for the older release
  full. Neither is a pass or failure; actual receipts are absent. Resume the
  corrected canonical once under fresh admission, then build/merge if green.
- GP-RACECRAFT `gp-racecraft` / `codex/gp-racecraft`,
  `3b1750519230b3a25673ee44467b12cc68aa80e0`: revised formation/report source
  and review CLEAR; native approved batch was interrupted, zero-byte outputs,
  no retained completed races. Resume this frozen batch once after admission.
  Exact additional catalog hooks still await written Claude answer; Kyle
  preview remains required before live. Old failed360packet stays failed.
- YETI-FUR-TINT `yeti-fur-tint` / `codex/yeti-fur-tint`,
  `562048b60bfe488af94764cc352e4c6c0078cad2`: approved original/1.4/1.8 native
  comparison recipe source and failure-path review CLEAR. No new native
  capture, gate/build or colour verdict. Exact existing manual-discovery
  filter/test hook awaits Claude. Do not rerun the foreign fullphase/audio.
- DRIVE-LESSON-1 `drive-lesson-1` / `codex/drive-lesson-1`,
  `f4e715e4449ca24e9c860b082d4dd6bd15b67038`: real instructor implementation,
  stage rules and cone tracking built on Kyle's direct request ahead of
  Tyre tests. Exact Tyre3e2 dependency is combined only inside this lane via
  `bfc3c4d6`, not integrated or claimed green. First20stage checks and4new
  helper cases passed; required code/numbers review and actual-fault fixes
  CLEAR. Four native both-course/settings/FPS cases prepared but UNRUN.
  First real instructor drive, late/right loss/screech acceptance, lane/build,
  Tyre green/final merge and later presentation hooks remain unfinished.

Evidence retained in each lane's `.evidence/2026-10-15/<CARD>/`; Tyre cancelled
morning admission is `.evidence/2026-10-16/TYRE-SLIP/resume-3e2bf73f/`.
No zero-byte interrupted packet grants a test verdict. Integration creation
receipts remain `.evidence/2026-10-16/DRIVE-LESSON-1/creation-receipt.json`
and `.evidence/2026-10-15/YETI-FUR-TINT/creation-receipt.json`. Current source
and committed notes hold completed review verdicts; retain historical actual
failed packets and every unfinished lane. No cleanup of foreign work.

Release ownership stays Claude. Exact full runner28640/parent31228 drained;
Claude announced candidate7f108454 full455/455/jobs4/0fail-notRun in2141s.
FRAME CHECK DONE is posted: Summit p9516.8ms both qualities, but world
1498/1533ms exceeds1000ms; Ardennes High33.3ms fails with far forest and
16.8ms passes without it. RELEASE-SUMMIT records the Director's decision to
remove the far forest from this release and treat Summit build time as a
release warning; SUMMIT-BUILD-TIME retains the unchanged future under1s goal.
Root made no release, waiver, live edit, frame run or push. No live release
completion was verified here. Daily04:00 full check did not run after restart.

Last observed foreign active roots at08:29PT: combat24384/parent32680;
browser suite13744/parent1868 with harness1872 and preview34976 on53207;
lane gate20856/parent31796. Children count with their existing roots, not as
extra slots. These jobs and any newer owner announcements remain untouched;
read fresh process identities and holds before any later launch. There is
no Root hold to release. Old overnight/accessory/Fire watches stay paused.
