# BOWL-TOUR

The short board entry controls current state, ownership, dependencies and locks.

More nights: nights 6 to 8, the tour. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), section 11. Kyle, 20 November 2026: more
nights, "using the larger Titan arena that already exists". This card follows the first release of nights 1 to 5 and is
not needed for it.

## Kyle's answer

Kyle, 20 November 2026: "Titan Stadium course". Nights 6 and 7 are held on the **Titan Monster Arena** course
(`titan-arena`: a lap of 1,120 m, about four times the Bowl's).

## What to build

1. **Night 6, Race Night, at Titan Stadium:** a **Stadium Race** of two laps against three named rivals at once, on the
   game's own race rules with the show truck lent as in the Bowl; a **Stunt Trial** of the stadium's jumps and crushes
   against the clock (the existing Titan Stunt Trial's rules, scored with the trick set); a Side by Side over half a lap.
2. **Night 7, Stunt Night, at Titan Stadium:** a Long Jump at its largest ramp; Freestyle on the long lap, where every
   triple pays; a Stadium Race run the other way round.
3. **Night 8, Champions' Night, at the Bowl:** Freestyle with the fallen Scrapasaurus lying on the floor as a ramp; Last
   Truck Rolling with five trucks; a Side by Side final with Dragon Wagon, best of three.
4. The trick rules, the wall rules, the show camera and the Bowl's screen hold at Titan Stadium during a night, chosen by
   the night and not by the course, so that the Titan Monster Arena and the Titan Stunt Trial are unchanged for anyone
   who enters them from the menu (replay fingerprints unchanged).
5. Nights 6 to 8 open after night 5 is won. Their purses are design numbers for Claude's review (450, 500 and 800 scrap),
   with one independent review, because they are pay (rule 17).

## Files and locks

`src/bowl/bowl-show.js` (the season table), `src/bowl/bowl-night.js` (a night's venue), `src/bowl/bowl-tour.js` (new),
`src/bowl/bowl-rivals.js`, `src/bowl/bowl-lines.js`, `src/bowl/bowl-save.js` (nights 6 to 8),
`tools/test-bowl-tour.mjs` (new), `tools/test-bowl-save.mjs`. Locks: `bowl-night`, `bowl-rivals`, `save-shape`.

## Checks

1. `tools/test-bowl-tour.mjs`: each of the three nights runs its events in order at its venue; a scripted child-pace
   driver wins the Stadium Race on Easy at least 9 times in 10.
2. Replay fingerprints and world signatures of `titan-arena` and `titan-stunt-trial` unchanged; `tools/test-bowl-save.mjs`
   with nights 6 to 8, reviewed by the save checker.
3. Laptop only, Claude runs: each night by hand, then Kyle's try.

## Sound cues

`bowl.tour.arrive` (the night opens at Titan Stadium: a bigger crowd; stand-in `crowd.cheer`), `bowl.race.lap` (a lap of
the Stadium Race is done; stand-in `interface.radar`), `bowl.final.heat` (a heat of the final is won or lost; stand-in
`interface.win` or `interface.lose`).

Behind `titan-bowl`. Builder's checks, then the lane tier and `npm run build`, recorded in `docs/changes/BOWL-TOUR.md`
with a Removed line. Before CARD DONE, search `tools/` for every id and name this card changes and bring each older suite
and scenario that names it up to date. No Chrome under `codex exec`: any browser scenario is "Claude runs". Memory-only
saves. No new dependency, network request or key. Clean up nothing outside this lane.
