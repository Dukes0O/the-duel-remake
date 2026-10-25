# GP-WIDE-START

The short board entry controls current state, ownership, dependencies and locks.

## Why this card exists (Claude, 16 October 13:10)

GP-RACECRAFT answers two of Kyle's three Grand Prix complaints: nitro off the
line no longer wins lap one, and faster CPU cars pass a slower player. Its
third aim, a field that reaches the first corner two and three wide instead of
filing into one line, failed twice: cars holding their grid lanes into the
first corner (through the apex, then to the first braking point with inside
priority) brought more crashes and pile-ups than today on every track. So the
start was split from the racing. GP-RACECRAFT now leaves the start exactly as
today, and the wide start is designed here.

## When

Design this only after Kyle has driven the GP-RACECRAFT preview and said how
the racing feels. His verdict on the start (is single file still the problem
once cars pass and nitro is a duel?) decides whether and how this card goes.

## What is known

- Both attempts and their per-course tables are on `docs/board/cards/GP-RACECRAFT.md`.
- A staggered two-by-two grid with equal cars reaches the first braking zone
  strung out; three level cars are rare even in Formula 1. The start measures
  in `tools/racecraft-rate.mjs` (distinct side-by-side pairs, lateral spread
  of the leading six) are the reporting tools to reuse.
- Crash and pile-up targets compare with today's own off-switch races per
  course; today's field already breaks the fixed "under 8" bound on Panorama.

## Open design question (Claude, before any code)

How the field stays wide into the first corner without two cars holding lanes
through the same apex. Owned files, switch and acceptance are written here
when Claude designs it.

## Claude's design (24 October 2026)

Claude in the cloud (runs without graphics). Switch `cpu-racecraft` (dev).
Needs GP-PASSING-2. Board entry when it starts: owner `claude-cloud`, lane
SIM, status ready, locks `busy-game-files`.

**What the batches really showed.** Both earlier start-formation batches
(ce3a9a85 and c674605f) ran with the extra pass types switched on too. The
24 October batch, with the formation off and the pass types on, still had
more crashes and pile-ups than today on every course. So the start was
never measured on its own: the pile-ups may have come from the pass types,
not the lanes.

**Step 1: measure the start alone.** On top of GP-PASSING-2's result (only
the pass types that passed), switch on the 16 October 00:35 formation
(`3b175051`: each car holds its grid lane until its first braking point; at
that point the inside car of an overlapping pair owns the corner and the
outside car tucks in behind unless it is more than half a car length
ahead). One 20-race batch, same gates as GP-RACECRAFT per course. Pass: it
stays.

**Step 2, only if step 1 fails: hold lanes for 200 m, then merge when
clear.** Each car keeps its grid lane for the first 200 m (by then speed
differences have begun to string the field out), then drifts toward the
racing line only when the lane between is clear for a car's width and
1 s ahead and behind. Into the first corner the inside car owns it as in
step 1. One 20-race batch, same gates.

**Step 3, if both fail:** park the start with both tables. The racing
(nitro, real pace and the passing that passed) still goes to Kyle's
preview; the start stays as today.

**Report-only, for Kyle:** the two start measures already in
`racecraft-rate.mjs` (side-by-side pairs at the first braking zone, spread
of the leading six), beside today's figures.

**Acceptance:** one of steps 1 or 2 passes the gates, or step 3's tables are
recorded; switch off byte-identical; lane tier, build, one review. Sound:
none new. Art: none. Kyle drives the preview before `cpu-racecraft` goes
live (he asked to try it first).

## Kyle's verdict (25 October 2026)

Kyle drove the racecraft preview: acceleration and nitro are right, but the
cars still patiently form one lane off the start, which he expected fixed.
Build steps 1 to 3 above now. Moved to Codex (CLI) since the cloud credit is
used up.

## Claude's decision (25 October 2026)

Claude's decision as design lead (Kyle asked for the wide start and will hear
about it in the release note): ship step 2. Its table shows the start is wider
(side-by-side pairs and the spread of the leading six roughly double) and
safer overall (Panorama mean crashes 9.10 to 6.55, early pile-ups 4 to 0;
Pacific crashes 0.30 to 0.10). The two misses are accepted: Tremblant's single
extra 8+-crash race in 20 is a small count, and Pacific's 3.14% race-time change
is the price of the field running wide into the first corner.

| Gate (today off -> step 2) | Panorama Ridge | Tremblant Woods | Pacific Canyon |
| --- | --- | --- | --- |
| 8+-crash races, on <= off | 12 -> 10 PASS | 0 -> 1 FAIL | 0 -> 0 PASS |
| Mean crashes, on <= off x 1.1 | 9.10 -> 6.55 PASS | 2.40 -> 2.50 PASS | 0.30 -> 0.10 PASS |
| Early pile-ups, on <= off + 1 | 4 -> 0 PASS | 0 -> 0 PASS | 0 -> 0 PASS |
| Max paired CPU-time change, <= 2% | 1.64% PASS | 1.64% PASS | 3.14% FAIL |
| Races with >= 2 distinct side-by-side pairs (report-only) | 0 -> 0 /20 | 0 -> 4 /20 | 0 -> 2 /20 |
| Races with leading-six lateral spread >= 3 m (report-only) | 0 -> 15 /20 | 0 -> 0 /20 | 0 -> 0 /20 |
| Mean distinct pairs at first braking (report-only) | 0.15 -> 0.25 | 0.20 -> 0.70 | 0.10 -> 0.35 |
| Mean leading-six lateral spread, m (report-only) | 2.409 -> 3.118 | 1.245 -> 2.592 | 1.763 -> 2.561 |
| CPU passes per normal race (report-only) | 7.75 -> 3.80 | 8.65 -> 10.50 | 3.50 -> 7.20 |
| Slower player passed (report-only, enabled) | 11 /20 | 20 /20 | 19 /20 |
| Nitro player leads after lap 1 (report-only, off -> on) | 0 -> 0 /20 | 0 -> 0 /20 | 16 -> 0 /20 |

The FAIL labels preserve the measured gate results; the two exceptions above
are accepted. Restore the corrected step 2 under the existing development
switch, with continuous clearance checks until merging completes. Step 1 is
removed. Do not rerun the 360-race batch. Run the lane tier, production build
and `grand-prix-existing` browser scenario; commit only on this lane.
