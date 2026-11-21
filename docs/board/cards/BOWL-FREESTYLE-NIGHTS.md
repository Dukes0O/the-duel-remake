# BOWL-FREESTYLE-NIGHTS

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (rules, data, the strip's words and three pieces already drawn). Kyle, 20 November 2026: graphics
and physics go to Astra, the rest to Sol.

Freestyle night by night. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), section 11, "Freestyle, night by night". The batch drive
of `fb02d3233` found Freestyle the same on Nights 1, 2, 3 and 5, and won on Easy about six seconds in by one double
backflip (600 against 310). Kyle finds Freestyle "pretty awesome" to play: keep the event, the keys and the scoring, and
give the 90 seconds a purpose.

BOWL-NIGHT-4 has merged, so start from its Barrel Roll Night (it changed `src/bowl/bowl-show.js`, `src/bowl/bowl-night.js` and
`src/bowl/bowl-lines.js`).

## What to build

1. **Each night's marks** go into its row in `src/bowl/bowl-show.js` (`freestyle: {rival, name, target: {easy, medium,
   hard}}`), and `BOWL_NIGHT_RULES.freestyle.target` goes. Starting numbers: Night 1 800 / 1,800 / 4,300; Night 2 1,000 /
   2,100 / 4,800; Night 3 1,200 / 2,400 / 5,300; Night 5 1,500 / 2,800 / 6,000. Set each by measurement with
   `tools/bowl-freestyle-balance.mjs`, by the rules in check 1. If the "no one trick" rule and the Easy gate cannot both
   hold on a night, write the measured numbers in `docs/board/questions/BOWL-FREESTYLE-NIGHTS.md` and carry on with the
   "no one trick" rule kept.
2. **The rival's climbing score.** Each night's row also holds the rival's run: eight or nine tricks in that rival's
   manner, each with a name and a time between 6 and 85 seconds, 9 to 12 seconds apart (Old Bess: wheelies and donuts;
   Rust Rhino: front flips and crushes; Tin Lizard: spins and combos; Dragon Wagon: doubles and big air). The points are
   worked out from the night's target on the level being played, in the list's proportions, so that the run adds up to
   the target exactly. As the event clock passes each time, the rival's score goes up and a pop-up at the side of the
   strip names the trick and its points ("OLD BESS: DONUT 40"). The event's state carries `rivalScore`; the win at the
   bell is unchanged (the driver's score against the target).
3. **The strip** (`src/bowl/bowl-hud.js`): both scores and the gap ("YOU 640, OLD BESS 520, AHEAD BY 120", or "BEHIND BY
   80"); tonight's tricks ("TONIGHT: BACKFLIP x2") from `featuredBowlTricks`; and, once the driver's score has passed the
   target, "OLD BESS BEATEN" and the driver's best Freestyle score read from the saved records ("YOUR BEST 2,140"). The
   saved record is read only; nothing writes to the save that does not already.
4. **The night's floor in Freestyle,** through the night's `dressing` in `src/bowl/bowl-show.js` and the dressings in
   `src/bowl/bowl-crush-field.js` (pieces already drawn by `src/bowl/bowl-view.js`):
   - Night 1: as today, the two parked cars to launch off.
   - Night 2: Long Jump's row of buses. Each bus cleared in flight off the Big Jump pays 40, with the crowd multiplier,
     as a `busClear` stunt (Long Jump's own clearing rule, shared, not copied). A bus landed on is crushed and pays as a
     crush.
   - Night 3: the two Bus Piles from Car Crush, new for Freestyle, and no other Car Crush piece. A crush pays as the show
     already pays it.
   - Night 5: High Jump's flame bar over the Big Jump at 8 m on Easy, 10 m on Medium and 12 m on Hard. A pass over it
     pays 100 the first time and 60 each time after, as a `barClear` stunt (High Jump's own rule, shared).
   - The parked cars stay on every night. A piece stands on the floor only during Freestyle.
5. **Words,** each one full plain sentence (`memory/dialogue-plain-prose`), in `src/bowl/bowl-lines.js`:
   - the night card's sentence for the floor: Night 2 "Tonight the buses from Long Jump stay out for Freestyle.", Night 3
     "Tonight the two Bus Piles are back for Freestyle.", Night 5 "Tonight the flame bar stays over the Big Jump for
     Freestyle.";
   - Big Mo's opening, in place of `event.freestyle.intro`: "Now it is Freestyle, and you have ninety seconds. Old Bess
     has already been round, and you can watch her score climb on the board." (the rival's name by night);
   - Big Mo, the first time the driver goes ahead: "Our driver has gone ahead of Old Bess, so keep it going!"; the first
     time the rival goes back ahead: "Old Bess is back in front, so it is time for a trick you have not done yet.";
   - Big Mo, once, when the rival's final score is passed: "Old Bess is beaten, so every point from now on is for the
     record.";
   - lost: "Old Bess finished ahead this time, so try mixing in a trick you have not done yet." (by rival).
   None of them mentions the wall, the stands or the car park.
6. **In a Turn Show** Freestyle is one 90 second go with the night's floor; the rival takes no part and its pop-ups and
   score are not shown.

## Kyle's try in the Preview (20 November 2026, integration at `bfec511bb`)

Kyle: "Easy mode is super easy. I'm beating opponents like 12000 to 400. I scored 22,000 in the night 5 freestyle.
granted, I was going a bit crazy". He also scored 1,815 in Best Trick against Big Kettle's tricks of 0, 50 and 60. So:

7. **Medium and Hard are set from play, not only from scripts.** The scripted expert scores far below a person who plays
   well. Starting numbers, raised: Medium 6,000 / 7,000 / 8,000 / 10,000 and Hard 12,000 / 14,000 / 16,000 / 20,000 on
   Nights 1, 2, 3 and 5. Claude's hand drive on Medium and Hard (check 4) moves them; Kyle's 22,000 "going a bit crazy" on
   Night 5 should beat Hard, and a merely good run should not. Easy stays set by the slow scripted driver (six in ten),
   because the player is a tween; how much harder Easy can be is Kyle's to judge after Gratian has played it.
8. **Best Trick's Big Kettle numbers** (`src/bowl/bowl-jump-events.js`, from BOWL-NIGHT-4) were the trick table's plain
   points, while the driver's tricks score with NEW, the crowd and tonight's doubled barrel roll. Big Kettle's tricks now
   score by the same rules as the driver's, with the crowd at the driver's crowd meter when the round starts. Starting
   points before those rules: Easy 0 / 150 / 300, Medium 300 / 600 / 900, Hard 900 / 1,500 / 2,400. Set by the same
   checks as BOWL-NIGHT-4 (the child-pace driver wins Easy at least 6 in 10 and not all ten), plus: a driver who lands
   only single tricks loses Medium.

## Files and locks

`src/bowl/bowl-show.js`, `src/bowl/bowl-night.js` (the Freestyle runner), `src/bowl/bowl-crush-field.js`,
`src/bowl/bowl-jump-events.js` (only to share the bus and bar rules), `src/bowl/bowl-view.js` (only if a piece needs
placing on the Freestyle floor), `src/bowl/bowl-hud.js`, `src/bowl/bowl-lines.js`, `tools/bowl-freestyle-balance.mjs`,
`tools/test-bowl-hud.mjs`, `tools/test-bowl-night.mjs`, `tools/test-bowl-show.mjs`, `tools/test-bowl-turns.mjs`.
Locks: `bowl-night`, `bowl-floor`.

## Checks

1. `tools/bowl-freestyle-balance.mjs`, for each of Nights 1, 2, 3 and 5:
   - **no one trick:** a driver who lands tonight's trick as a double off the Big Jump in the first 15 seconds and then
     drives on with no tricks falls short on every level, on all ten seeds; on Medium and Hard the same for a triple with
     nitro;
   - **Easy is reachable:** the slow driver who lands single flips off the Table and the Big Jump, with wheelies and donuts
     between, and uses the night's floor, wins Easy at least 6 times in 10 and not on all ten;
   - Medium and Hard each stay won by its scripted driver at least 8 times in 10;
   - each night's mark is at least a tenth above the night before on the same level.
   Report the measured marks and the ten scores of each driver in the change note.
2. `tools/test-bowl-night.mjs`: the rival's score climbs at its listed times and ends equal to the target; the event ends
   at 90 seconds and not when the target is passed; each night's pieces stand on the floor in Freestyle only; a bus
   cleared and a bar passed in Freestyle pay through the crowd multiplier.
3. `tools/test-bowl-hud.mjs`: the strip's two scores and gap, tonight's tricks, "BEATEN" with the best score; no line of
   the event contains "wall", "stands" or "car park". `tools/test-bowl-turns.mjs`: a Freestyle go with no rival.
4. Laptop only, Claude runs: Freestyle by hand on Nights 1 and 5, Easy.

## Older checks that change

Search `tools/` for `freestyle`, `310`, `1810`, `4260` and `Old Bess's` before CARD DONE. Found on 20 November:
`tools/bowl-freestyle-balance.mjs` line 86 (the pinned marks [310, 1810, 4260]) and lines 87 to 96 (the child's nine in
ten, and the child who never backflips); `tools/test-bowl-hud.mjs` lines 20 and 84; `tools/test-bowl-night.mjs` line 387.

## Claude answers: the changed assertions (rule 18, 20 November 2026)

Approved before the build. The pinned marks change to each night's measured marks, a deliberate change, each re-recorded
with a one-line reason in the change note. The child's "nine in ten on Easy" becomes "six in ten and not all ten" (Kyle,
20 November: the player is a pre-teen). "The child never backflips" goes, because since BOWL-TRICKS-ALL a tap is a flip
and the slow driver flips. The new "no one trick" check is stricter than anything it replaces. The HUD and night suites'
"310" becomes Night 1's measured Easy mark. Nothing is loosened.

**Removed:** the one set of Freestyle marks in `BOWL_NIGHT_RULES.freestyle.target`, and the old `event.freestyle.intro`
and `event.lost.freestyle` lines.

## Sound cues

`bowl.free.rival` (a rival's trick pops up and its score climbs; stand-in `interface.radar`), `bowl.free.lead` (the
driver goes ahead; stand-in `crowd.cheer`), `bowl.free.behind` (the rival goes back ahead; stand-in `interface.lose`),
`bowl.free.beaten` (the rival's final score is passed; stand-in `interface.win`), `bowl.free.bar` (a pass over the flame
bar in Freestyle; the same sound as `bowl.high.clear`). A bus cleared uses `bowl.long.clear`.

## How it merges

Behind `titan-bowl`, with no save, pay or released change (the saved best is read only), so rule 23's small set: the
card's checks, the core suite, the three guards and `npm run build`, recorded in `docs/changes/BOWL-FREESTYLE-NIGHTS.md`
with the Removed line. No Chrome under `codex exec`: check 4 is "Claude runs". Memory-only saves. No new dependency,
network request or key. Clean up nothing outside this lane.

## Builder questions for Claude, 21 November

Item 8 calls for Best Trick scoring changes, but the file list limits `src/bowl/bowl-jump-events.js` to sharing bus and bar rules. Please grant the Best Trick scoring hook and `tools/test-bowl-jump-events.mjs` assertions. Please approve changing the old Medium singles-win assertion to a Medium singles loss as Kyle specified, while still checking the individual points and preserving the Easy child gate.
