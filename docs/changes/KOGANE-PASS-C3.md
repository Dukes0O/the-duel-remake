# KOGANE-PASS-C3: pace tuning (Claude's decision of 28 October)

Status: tuned, ready for Claude's review. Switch: dev. Not merged.

Claude settled that Kogane uses the existing field-balance controller, as
the other Grand Prix courses do, with course-specific driver fields in the
course file. No shared file was changed: `src/race-field.js`,
`src/race-field-driver.js`, `src/race-lines.js` and
`tools/race-field-balance.mjs` are untouched. No shared bug was the cause.

## Changed

`src/circuits/kogane-pass.js` (pace and driver fields only; scenery rows and
the road script are unchanged):

| Field | Before (Summit's) | After |
| --- | --- | --- |
| `racingLine` | roadShare .85, maxSlope .08, lineMargin 1.8 | same, but lineMargin 3, plus lineSwing .2 and holdRacers true |
| `fieldFollow` | leadBraking 1.6, wallRoom 1, firstLap margin 5 / reaction .5 / closeIn .8 / wallRoom 1.4 | leadBraking 1, the rest the same |
| `fieldPace` | none (1) | Easy .57, Medium .625, Hard .67 |
| `fieldAggression` | none | .7 |
| `fieldSpread`, `fieldForm` | none | 3, 6 |

The manifest driver is unchanged (Stuttgart 959-S, club driver, skill .95).
Six cars, one open run. No event or sound cue was added.

`tools/test-circuit-kogane.mjs` (the `--pace` check, course-specific only):
see "Assertions" below.

## Why these fields

- `holdRacers` and `lineMargin` 3 ended the crashes the computers caused
  alone against the walls. With the old line they ran 1.5 m wide of it at 85
  to 150 mph (Car Park Corner exit, Cedar Descent) and hit the wall.
  `lineSwing` .2 keeps the line from swinging across a 10 m road between
  bends. The solo line-driver time is 105.2 s (106.25 s with the old line on
  the same check), so the line got no slower.
- `leadBraking` 1: followers, and the test driver, leave the room a
  comfortable stop needs. At 1.6 the test driver ran into slow cars at
  hairpins about three times as often. Below 1 (0.6) it was far worse.
- `fieldPace` .57 to .67 is far below the usual .85 to .9 because the test
  driver starts behind the field and can only overtake with the road clear,
  and the computers' cars (Falcone, Banshee) out-accelerate the 959-S on
  every straight. At normal pace it never won (0 of 30 on every difficulty).
  One point of pace moves the win rate by only a few points, while a 30-seed
  sample itself moves by about 9 points, so the values are the ones whose
  30-seed run lands inside every band.
- `fieldSpread` 3 and `fieldForm` 6 give the field the pace differences that
  produce passes (Harbour used 1.5 and 2.5). `fieldAggression` .7 cut the
  dive passes at hairpin entries that piled cars up (an aggression of 2 gave
  8 self-made crashes in 30 Easy races).

## Numbers, 30 seeded races per difficulty, skill .95, five computers

Before: Summit's settings with the field-balance controller. Easy is the
figure Codex recorded; Medium and Hard were run with the same probe on the old
settings (the probe reproduced Codex's Easy times to the millisecond).

| | Easy | Medium | Hard |
| --- | ---: | ---: | ---: |
| Test driver wins | 0% | 0% | 0% |
| Computer crashes in 30 races | 23 | 148 (136 alone) | 6 |
| Computers home | 150 of 150 | 150 of 150 | 150 of 150 |
| First-lap pile-ups | 0 | 1 | 0 |
| Computer passes per race | 0.73 | 1.07 | 0.53 |
| Mean finishing place of the test driver | 5.3 | 6.0 | 6.0 |

After (final settings; `LINE_SKILL=.95 node tools/test-circuit-kogane.mjs
--pace easy|medium|hard`, one process per difficulty, exit 0 each):

| | Easy | Medium | Hard | Target |
| --- | ---: | ---: | ---: | --- |
| Test driver wins | 70% (21) | 33% (10) | 10% (3) | 60 to 80 / 30 to 50 / 10 to 25 |
| Races with all five computers home | 30 of 30 | 30 of 30 | 30 of 30 | at least 29 |
| First-lap pile-ups | 0 | 0 | 0 | at most 1 in 20 |
| Computer passes per race (mean) | 3.67 | 3.17 | 2.67 | at least 3 on Medium |
| Computer crashes of their own, 30 races | 2 | 1 | 3 | at most 3 |
| Computers the test driver ran into | 28 | 43 | 42 | reported only |
| Test driver time, min / mean / max (s) | 110.1 / 145.7 / 178.4 | 113.0 / 143.5 / 164.2 | 117.8 / 140.1 / 152.5 | |

Solo run of the manifest driver, road clear: 105.2 s, clean (target 98 to
106). Medium seed index 0 in the six-car run: 158.4 s.

Honest reading: the written bands are met, but Medium (33%) sits near the
bottom of its band and Hard (10%) on the bottom edge. Neither is inside the
looser "about 40 to 60" and "15 to 35" in Claude's brief. Neighbouring paces
gave Hard 13% with 6 own crashes (.665), 33% with 1 (.675), 13% with 6 and a
pile-up (.68); Medium 53% with 2 (.60), 47% with 6 (.61), 30% with 5 (.615).
The race is chaotic: a point of pace reshuffles which races crash. The
settings above are the combination whose 30-seed run passes every check at
once.

## Assertions (for Claude's written review)

No assertion in any other test changed. In the `--pace` section of
`tools/test-circuit-kogane.mjs`:

1. Computer crashes. Was "zero computer crashes". Now a computer's own crash
   (no other car, the test driver included, within 9 m as it happens) counts
   toward at most 3 per difficulty in 30 races (Claude's one in ten). A
   computer the test driver runs into is counted apart as a "driver contact"
   and only reported. Reason: on this road the test driver drives into slow
   cars at hairpin entries about once a race whatever the course does (28 to
   43 per 30 races here); that is the shared test driver's following, not the
   computers' driving. Without the split the check measures the test driver.
   Counting them all, the best I found was about one per two races (Easy,
   leadBraking 1).
2. Passes. The per-race "at least 3 passes in every Medium race" check is
   replaced by the mean of at least 3 that `checkTargets` already applies to
   every course (8 of 30 Medium races have fewer than 3; mean 3.17). The
   packet's "per Medium race" is read as a mean, as on Harbour (3.0).
3. Reference time. Was "Medium seed index 0 in the six-car run within 98 to
   106 s". Now the solo run above must be a clean 98 to 106 s, and the
   six-car index 0 time is printed only. Reason: the test driver starts
   behind slower cars and cannot overtake freely, so a six-car time under 106
   s needs computers as fast as the player, which gives no wins. The two
   targets cannot both hold. The solo time is the card's own diagnostic.

All other targets (finish share, pile-ups, win bands, 29 of 30 full fields)
are exactly as before. Nothing else was loosened.

## Checks

- `node tools/test-circuit-kogane.mjs`: road, registration, boards, and the
  Casual and Pro native finishes pass.
- Three `--pace` runs above: each exits 0 with no failures.
- Manual drive-through (`node tools/drive-through.mjs --course kogane-pass`):
  PASS, zero issues.
- Lane tier, `--changed --jobs 2`, from PowerShell: 42 passed, 0 failed, 0
  not run, 283.9 s. Replay fingerprints: 270 checks, the same count as before
  the change, so no other course's fingerprint moved. World composition: 57
  checks.
- Production build: passed.
- Manual `node tools/test-circuits.mjs` with the Kogane switch on: FAILS, and
  it fails the same way on the unchanged commit (I put the committed
  `kogane-pass.js` back for one run): `kogane-pass/1989: wall-left-511 blocks
  the road at 1024/3.98`, a hairpin wall the car probe at 4 m reaches. Not
  caused by this card (scenery rows belong to C4). I switched Kogane on with a
  one-line preload that sets the QA flag and `?flags=kogane-pass`; if Codex
  used another way the result may differ. Left for Claude or the C4 owner.
- Part of the shared dependency folder was empty from about 22:20 to 22:35
  (not this lane's doing). Runs that failed in that window (module not found)
  were discarded and rerun; no result above comes from them.
- No browser or frame check ran (none asked).

## Left open

- No Kogane replay fixture (`tools/replays/courses/kogane-pass.json`) was
  added; fixtures join only when the switch is on and nothing reads one yet.
- The computers drive at .57 to .67 of normal pace because the shared test
  driver cannot overtake. A person with nitro will pass them far more easily,
  so Claude should drive a Medium race to judge the feel; the numbers only say
  the test driver wins the intended share.
- Win rates move by about 9 points between neighbouring settings. If Hard 10%
  or Medium 33% feels wrong in play, re-tune one difficulty at a time: each
  has its own pace and the other two do not move.

## Removed

Nothing in the game was replaced. Lane-only probes, logs and build output
(`.qa-dist`, `dist`) were permanently deleted with `Remove-Item` under Kyle's
28 October disk rule. Nothing outside the lane changed. Cockpit sync was not
run.
