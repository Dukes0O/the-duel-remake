# BOWL-LTR-EASY

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 21 November 2026: Sol builds all the Bowl fix cards; none needs heavy physics).
In Claude's keyboard drives of 20 November 2026 a driver who steers at the nearest rival and presses F in reach won one
fight in nine (lost in 48 to 58 seconds on the merged game at `57e478340`), mostly to rams, while the card's scripted
driver wins eight in ten. Kyle, on his own play: "I might not win this"; and the same day: the player is a pre-teen, and
losing is allowed. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), sections 6, 7 and 9.

## What to build

1. **Measure first.** Add a second scripted Easy driver, the chaser: it steers at the nearest sound rival, presses F when
   the weapon is in reach, and does not dodge. Run ten seeds with each weapon and report where the player's health went
   (rival-started rams, own rams, walls, hammers, saw, throws).
2. **Tune Easy only** until the chaser wins five to seven fights in ten with each weapon and the card's careful driver
   still wins at least six. Levers, in this order: the player's recoil from own rams (50 per cent today); how many rivals
   may hunt the player at once and how soon; the rivals' closing speed in a ram. Medium and Hard keep their tables.
3. **A fight on Easy lasts at least 75 seconds** for the chaser in eight seeds of ten, win or lose, so there is time to use
   the weapon.

## Files and locks

`src/bowl/bowl-weapons.js`, `src/bowl/bowl-rivals.js`, `tools/test-bowl-weapons.mjs`, `tools/test-bowl-rivals.mjs`.
Locks: `bowl-rivals`.

## Checks

1. The two drivers' ten-seed results for each weapon, as assertions (the ranges above), with the health-by-source table in
   the change note.
2. The non-dodging Hard driver still loses.
3. Laptop only, Claude runs with the next batch drive.

## Sound cues

None new.

Behind `titan-bowl`. Tested and merged under AGENTS rule 23, recorded in `docs/changes/BOWL-LTR-EASY.md` with a Removed line.
Memory-only saves. No new dependency, network request or key.

## Added from Batch drive 2 of the merged game at `fb02d3233` (20 November 2026; pictures in `.evidence/2026-11-20/batch-2/` of the integration folder)

4. **Keeping away loses too.** On Night 3, a driver who kept away for the full two minutes with 44 health left still lost
   ("another truck had hit the others harder"). On Easy, a driver still rolling when the clock ends wins if no rival has more
   health left; on Medium and Hard the rule stays.
5. Nights 3 and 5 could not be passed after three tries each, so this card now stops the season for a tween. It goes first
   among the Bowl's fix cards.

## Kyle's try in the Preview (20 November 2026, integration at `bfec511bb`)

6. **Kyle won Hammer Night's Last Truck Rolling on Easy at the first try** (707 points), and called it "pretty good". So
   Easy may not need to be easier with the hammer: measure the chaser first, and do not move a number that already gives
   about six wins in ten. What spoiled his fights was the feel (the truck snapping sideways after a hit, the hammer while
   driving, the saw's jerk, the launcher's narrow reach), which is BOWL-FEEL-FIX. Tune after that card has merged.

## Builder baseline and narrow questions, 21 November

The chaser steers toward the nearest truck still rolling, uses F in the current weapon's real reach, and does not dodge. At `eda61d4c7`, ten starts with each weapon won 8 hammer, 8 saw and 7 launcher. Only 0, 6 and 5 respectively lasted 75 seconds. The average health loss to own rams was 20.0, 17.8 and 22.4. Rival rams averaged 0.8, 0.8 and 1.2. The hammer's group also lost 15.1 to hammer swings, the saw's group 12.9, and the launcher's group 7.2 to fire. The chaser needs more driving time, and a blanket armor bonus would make the two higher win rates worse.

I will keep recoil at its existing share unless a measured weapon group needs a change. I will first measure a lower Easy closing speed together with the card's remaining-health rule at the clock. May this card update that clock-result sentence in `src/bowl/bowl-lines.js` so Easy can explain the health rule? If pace alone cannot meet the gate, may it use the existing Bowl-only driver hook in `src/arena/arena-event.js` to limit how many rivals pursue the player and when, and one Bowl-only line in `src/sim-contacts.js` to read an Easy own-ram share if it needs tuning? All three hooks would use the Bowl event's rules and leave Medium, Hard and other arenas unchanged.

The Turn Show also prints the old clock reason. Its go currently keeps `timeUp` but not the reason for a win. May this card add the result's `decidedBy` value to the existing in-memory go in `src/bowl/bowl-turns.js` and select the matching `goKnockouts` sentence? The save writer still reads the same scores and settlement data. The old pursuit test pins 30 mph on Easy. If the measured Easy pace changes, I will keep that 30 mph check on Medium and add a separate Easy check against its retained pace.

Scratch trials on 21 November found Easy candidates with the same fight pace and staggered pursuit. In the ten fixed seeds, Hammer won 7 with 8 fights at least 75 seconds, Saw won 5 with 8, and Launcher won 7 with 9. The careful-driver checks are running. The clock check passes for an Easy tie, an Easy loss with a healthier rival, and Medium and Hard still deciding the clock by damage dealt. The two shared simulation hooks requested above are needed to turn the scratch settings into a lane candidate.

## Claude answers, the hooks (21 November 2026)

**Granted, all four,** each inert outside Last Truck Rolling on Easy with `titan-bowl` on:
- the clock-result sentence in `src/bowl/bowl-lines.js`, so Easy explains the health rule in one plain sentence;
- the existing Bowl-only driver hook in `src/arena/arena-event.js` to limit how many rivals pursue the player and when (the
  staggered pursuit);
- one Bowl-only line in `src/sim-contacts.js` to read an Easy own-ram share, if a weapon group needs it;
- `decidedBy` on the in-memory go in `src/bowl/bowl-turns.js`, choosing the matching `goKnockouts` sentence; the save writer
  reads the same scores and settlement as before.

The 30 mph pursuit check moves to Medium, with a separate Easy check at its new pace (rule 18 approved: nothing is loosened).
The scratch results (hammer 7, saw 5, launcher 7 wins in ten, and 8 or 9 fights of 75 seconds) meet the card. Combat balance
and other arenas unchanged. Merge under rule 23.

The careful driver also won 6/10 on each night. In the Hammer sample, five of those wins also credited at least two knock-outs. The sixth was a valid win at the Easy clock on remaining health, with no credited knock-outs. Please review the resulting assertion change under rule 23. The new gate counts any six valid wins, the direct scoring collision still checks knockout credit, and the clock fixtures prove the new Easy health rule and the old Medium and Hard rule.
