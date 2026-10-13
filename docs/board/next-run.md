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

1. In progress, continue: P4-SUMMIT (holds `busy-game-files`), P4-GP-EXISTING,
   FIX-AMBUSH-OPENING, FND-12 (copy-only dry run; the permission profile is
   Kyle's choice, so do not install one), DISC.
2. Ready now, start in free lanes: QA-AUDIO-CLOCK and QA-TITAN-REPLAY-TIMEOUT.
   Each gets the 30 minute limit, then a note and back to building.
3. When P4-SUMMIT merges and `busy-game-files` frees up, one owner at a time:
   FIX-FOOT-MOUSE, then AUD-15-P1, then P4-SNOWMEN, then DEEP-ZONE. P4-AVALANCHE
   and P4-YETI follow Claude's review answers. Then P4-SUMMIT-ATTACK.
4. After P4-CAREER is accepted: P4-VARIANTS, P4-INTEL-LEVELS, then P4-CUPS and
   P4-COACH. These need `busy-game-files` too, so they queue behind item 3.
5. The Deep, THE_DEEP section 10: DEEP-ART-SRC and DEEP-AUDIO continue under
   the 10.1 contracts; art sheets go to Claude. DEEP-ZONE starts when its lock
   frees. Build against the contracts; do not stop to ask.

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

## The night shift

Heavy checks wait for the night shift: full tier, frame check, combat balance
and all browser scenarios, run alone on the idle laptop by
`node tools/night-shift.mjs --idle-awake --no-push`. No builder starts a heavy
job after 23:00 PT. The morning report names the first merge after the last
green night for any failure; that fix goes first and other merges continue.
Until a night run has passed on the current head, the full tier on the exact
release commit is still required before any release.

## Retained facts

Sound was approved by Kyle on 11 October; recipes and current runtime audio
remain. Snow's final accepted pine clearance is at least 6.44677 m; there is
no fourth shared-snow art round. Claude owns Harbour base and finishing cost.
The older full-tier result is not a pass for the current integration commit.
