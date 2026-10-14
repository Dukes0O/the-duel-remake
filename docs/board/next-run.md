# Run, 14 October afternoon to 15 October 2026

Kyle's order, AGENTS.md rules 1 to 18 and `docs/FACTORY.md` govern this run.
Work in integration and isolated lanes. Nothing goes live without Kyle's word.
No push except Claude's release and compaction pushes, no port 5174, no real
saves. QA storage is memory-only. Delete only lane folders created in this run.

Keep every line busy (Kyle, 14 October): up to six build lanes at once, no
more than three course lanes. When a lane merges, open the next card at once.
Stop only when no Codex card is ready.

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
