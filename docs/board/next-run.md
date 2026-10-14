# Overnight run, 13 to 14 October 2026

Kyle's order, AGENTS.md rules 1 to 18 and `docs/FACTORY.md` govern this run.
Work in integration and isolated lanes. Nothing goes live overnight: Claude
releases only on Kyle's word. No push except Claude's release and compaction
pushes, no port 5174, no real saves. QA storage is memory-only. Delete only
lane folders created in this run.

## Order (Kyle approved, 13 October evening)

Start from `node tools/board.mjs`. Read each card's "Claude answers" first.

1. **Kyle's fixes lane, first:** FIX-HAIRPIN-CAMERA (Harbour Lantern Hairpin
   camera). It goes ahead of every other `busy-game-files` card.
2. **Finish and merge what is open:**
   - AUD-15-P1 (rival voices, dev);
   - P4-YETI;
   - DEEP-AUDIO;
   - DEEP-ART-SRC as working art only (Kyle: not finished art; otter held).
3. **Summit Run, in order:**
   - merge P4-SUMMIT's round-3 source (Claude accepted it for dev);
   - P4-AVALANCHE: slow the Gallery to 18.4 to 19.2 s and move the entrance
     pillars;
   - then P4-SUMMIT-ATTACK (medals settled).
4. **Grand Prix career, then variants:** P4-CAREER (variant unlock rule
   settled), holding `save-shape`, then P4-VARIANTS (Panorama Night and
   Reverse, Harbour Dusk and Reverse, Tremblant Reverse). Summit items in 3
   take priority over these whenever they need the same lock.
5. **New course, Ardennes Forest (Kyle: "make that one a beauty!").** When
   Claude's road layout (P4-ARDENNES-ROAD) merges tonight, start P4-ARDENNES
   in a course lane. It needs no `busy-game-files`, so it runs alongside
   items 3 and 4. Design: `docs/CIRCUITS.md` section 5.5.
6. **Hold:** QA-AUDIO-CLOCK, QA-TITAN-REPLAY-TIMEOUT and DISC wait until items
   1 to 5 are merged.
   - The Deep beyond its art and sound waits for Kyle's storyboard with
     Gratian: no DEEP-TRAIL, DEEP-LIFE or DEEP-LOG work.
   - The Lab waits for it too. The helicopter is released (Kyle, 14
     October): Claude owns the Flying line in its own lanes
     (`docs/HELICOPTER.md`); Codex takes only HELI-ART-SRC, whenever an
     ART lane is free.

Cards waiting on Claude are skipped while other work exists. After an hour
without an answer, AGENTS rule 16's backup applies.

## Claude, overnight

- Check-ins about every 30 minutes. Claude tests that its wake-up fires
  before Kyle goes to bed.
- **Release before Kyle sleeps:** FIX-DRIVING-FEEL and FIX-RACE-SCREEN,
  approved by Kyle once green. Claude runs the full tier alone on the exact
  release commit and announces the short hold in the inbox.
- **Finishing passes:**
  - P4-FINISH-HARBOUR: the test driver's lap is 2:26 with a game over;
    target 1:30 to 1:45 with no stop.
  - P4-FINISH-TREMBLANT: Snow corners at 9, 0 and 17 mph; target no corner
    under 20 mph.

  - P4-FINISH-SUMMIT, as soon as P4-SUMMIT and the avalanche timing merge:
    pale Gallery roof, town lights below the Ledge, lit hut and observatory
    windows, snow tone, views and cue listening, then the frame check. The aim
    is Summit Run ready for Kyle's "go live" on 14 October.

  Claude owns these course values. A Claude helper works in its own lane
  and counts as one of the six build lanes.
- **History compaction at 06:30 (Kyle: no approval needed).** From 06:15
  Codex opens no new lane and pauses merges. Claude:
  1. compacts superseded binaries out of `integration/wasteland` (SPEC 0.8);
  2. pushes it to GitHub;
  3. posts "COMPACTION DONE" in the inbox.

  Codex then rebases any open lane onto the new history before its next
  merge; never merge a lane that still holds pre-compaction commits.

## The full check

`node tools/full-check.mjs --idle-awake --no-push` runs once at 04:00 (a
one-time scheduled task). It checks a copy of one commit, so building and
merging continue. **From 04:00 to 04:30 nobody starts a gate, build or
browser check**, so the frame step has the laptop to itself. Commit every
board, inbox and status edit on integration before 04:00. A failure names the
first merge after the last green full check; its fix goes first.

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

## Retained facts

- Sound was approved by Kyle on 11 October; recipes and current runtime audio
  remain.
- Snow's accepted pine clearance is at least 6.44677 m; there is no fourth
  shared-snow art round.
- Claude owns Harbour base and finishing cost.
- An older full-tier result is not a pass for the current commit.
