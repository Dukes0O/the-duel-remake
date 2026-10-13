# Overnight run, 12 to 13 October 2026

Kyle's order, AGENTS.md Build more, record less rules 1 to 10 and the factory
rules 11 to 17 govern this run. Read `docs/FACTORY.md` first. Work in
integration and isolated lanes. Nothing goes live tonight. No release, push,
history rewrite, port 5174 or real-save access. QA storage is memory-only.
Delete only lane folders created in this run; keep older retained lanes.

## Order

Start from `node tools/board.mjs`: CODEX CAN START NOW first, then whatever a
merge unblocks. Cards waiting on Claude are skipped; read the card's "Claude
answers" section before resuming it.

Kyle approved this order for tonight.

1. Finish and merge what is open, in this order:
   - FIX-FOOT-MOUSE (holds `busy-game-files` now);
   - P4-SUMMIT (takes `busy-game-files` back after the mouse fix);
   - FIX-AMBUSH-OPENING;
   - DEEP-RAMP-GEOMETRY (Codex is already building it, outside the core game
     files).
   Also still open: P4-GP-EXISTING (source merged; its browser cases wait
   for the full check), DEEP-AUDIO (source merged; waits for Claude's
   listening verdict) and FND-12 (copy-only dry run; the permission profile is
   Kyle's choice, so do not install one).
2. FAC-FULL-CHECK. It touches only tools, so it runs alongside item 1. It
   renames the night shift tool to the full check and lets it run on a copy
   of one commit.
3. When Claude's answers land on the cards: DEEP-ART-SRC round 2 and
   FIX-LIVE-EDGES. Both stay outside `busy-game-files`.
4. Then `busy-game-files`, one owner at a time: AUD-15-P1, P4-SNOWMEN,
   DEEP-ZONE, then P4-AVALANCHE, P4-YETI and P4-SUMMIT-ATTACK once Claude has
   answered them; then P4-CUPS and P4-COACH when their needs are met.
5. Hold until items 1 to 3 have merged: QA-AUDIO-CLOCK, QA-TITAN-REPLAY-TIMEOUT
   and DISC. No new lanes beyond these. Each of the QA cards gets the 30
   minute limit, then a note and back to building.

## Claude, not Codex

Claude owns the finishing passes (Harbour Lights, Tremblant, Panorama, Summit,
the Team Room), the review answers on cards, DEEP-TRAIL and FINISH-DEEP. A
review that lands in WAITING FOR CLAUDE'S REVIEW is answered inside the next
check-in; keep building other cards meanwhile.

## Limits

At most six build lanes across all lines, no more than three course lanes. At
most three heavy jobs at once across all teams, each `--jobs 4` or fewer;
check node.exe command lines before starting. Merge as soon as one lane tier
and a build are green, with one review where rule 17 asks for one. Spend at
most 30 minutes on any one failure or tool problem, then record the known
result and move on. No new test machinery without a card. One short run-log
line per merge. Commit board, inbox and STATUS edits on integration at once.
Clear merged lane folders (janitor) before opening new ones. A dev server on
port 5311 is still running from the removed p4-circuits folder; stop it if it
is yours.

## The full check

Heavy checks wait for the full check: full tier, frame check, combat balance
and all browser scenarios, then a short report. It runs once a day, by default
while Kyle sleeps, on a copy of one commit, so builders keep building and
merging while it runs. Only its frame step needs the laptop to itself, and
builders pause gates, builds and browser checks for that step only, about 15
minutes. Its other stages run alongside builders and each counts as one of the
three heavy jobs. The report names the first merge after the last green full
check for any failure; that fix goes first and other merges continue. The full
tier on the exact release commit still runs alone before any release.

Tonight only (the tool is unchanged until FAC-FULL-CHECK lands): Kyle schedules
`node tools/night-shift.mjs --idle-awake --no-push` for 04:00. From 03:45
nobody starts a gate, build, browser check or merge. By 03:45 every board,
inbox and status edit on integration is committed. The check refuses to start
if the integration folder has uncommitted changes. Builders resume when the
"Record night" check commit lands on integration, or at 06:30 at the latest.
Building in lane folders (editing code without running gates) may continue.

## Retained facts

Sound was approved by Kyle on 11 October; recipes and current runtime audio
remain. Snow's final accepted pine clearance is at least 6.44677 m; there is
no fourth shared-snow art round. Claude owns Harbour base and finishing cost.
The older full-tier result is not a pass for the current integration commit.
