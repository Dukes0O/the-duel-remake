# Overnight run, 11 to 12 October 2026

Kyle's order and AGENTS.md Build more, record less rules 1 to 10 govern this run.
Work in integration and isolated lanes. Nothing goes live tonight. No release,
push, history rewrite, port 5174 or real-save access. QA storage is memory-only.
Delete only lane folders created in this run; keep older retained lanes.

## Factory first (Kyle, 12 October 2026)

Read `docs/FACTORY.md` and AGENTS rules 11 to 15. Once FAC-01 is merged,
start FAC-02, FAC-03, FAC-06 and FAC-07 as four lanes at the same time; they
own different files. Then FAC-04 (holds the course lock; no new course starts
until it and FAC-05 merge) and FAC-08. Each FAC card: tests first, one lane
tier, build, one review, merge as soon as green. Existing P4 lanes continue.

## Order

1. P4-PANORAMA: Claude's 21:20 field recipe, then at most three original
   90-race fieldPace runs. Send the final round-three sheet through the inbox.
   Merge after Claude accepts it. Claude owns the finishing pass.
2. P4-GP-EXISTING: each existing circuit gets one bounded fieldPace and
   fieldAggression tuning, at most three original 90-race runs. Record the
   closest honest result and merge under Claude's 21:20 decision. Team Room
   stays base-only. P4-AZURE-GP-COMPARISON is a small low-priority follow-up.
3. P4-QUALIFYING. Claude's 22:10 answer brings forward P4-CAREER-PAY
   (position pay, records and ghosts) behind grand-prix-career dev. The rest
   of P4-CAREER still waits for Panorama to merge. Preserve the
   accepted native pit/skip/telemetry evidence when its runtime stays exact.
4. P4-SUMMIT from CIRCUITS section 5.4; its own dev switch and noCombat.
   Then P4-SNOWMEN, P4-AVALANCHE and P4-YETI. New courses append stable ids.
5. A separate janitor sweep: fold consumed earlier-round verdicts into the
   final art reviews, then delete those earlier sheets. Preserve current
   sheets, licensed sources, recipes, runtime assets and Kyle's decisions.
6. The Deep, THE_DEEP section 10 (Claude packet 12 October): DEEP-ZONE,
   DEEP-SURFACE, DEEP-SAVE, DEEP-ART-SRC and DEEP-AUDIO start in free lanes
   alongside Phase 4, within the six-lane limit. Build against the 10.1
   contracts; do not stop to ask. Keep the-deep dev; art sheets to Claude.

When a card waits on Claude, move on. Read the card's "Claude answers" section before resuming it, and
playtest-inbox.md for notes with no card.

## Ownership and limits

Claude owns P4-TREMBLANT-SNOW in claude/tremblant-snow behind its own dev
switch, all finishing passes, and later DEEP-WATER and DEEP-TRAIL.

At most three heavy jobs across all teams, each jobs 4 or fewer. Check node.exe
command lines before starting. Frame timing waits for a quiet laptop: one
simple busiest-view run per quality, eight cars, delivered p95 at most
18.5 ms and construction under 1 s. Hidden art gets no frame checks.
Spend at most 30 minutes on one failure or tool problem, then record the
known result and move on. No new test machinery without a card.

Lane tier and build before every merge; one ordinary review. Extra helpers
only for saves, rewards, records, releases or art. One short run-log line per
merge and full run. Fold notes/status into a real change or merge commit.
At run end, full tier alone with jobs 4, then refresh STATUS.md.

## Retained facts

Snow and focused lane gates merged at 13a0313c; full 395/395 passed there.
Harbour finishing round two then merged at 5092a018. That older full result
is not a pass for the later integration commit. Snow's final accepted pine
clearance is at least 6.44677 m; no fourth shared-snow art round. Loader
source/clearance acceptance does not turn its earlier failed timing packet
into a pass. Claude owns Harbour base and finishing cost. Sound was approved
by Kyle on 11 October; recipes and current runtime audio remain.
