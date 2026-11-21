# BOWL-FINISH

The short board entry controls current state, ownership, dependencies and locks.

Browser play, tune score numbers, looks, frame check, switch on, release, pictures to Kyle.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/BOWL-FINISH.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.

## Owed from the Bowl cards merged on 20 November 2026 (Claude)

- Play the whole season by hand on Easy and Hard, and a Turn Show for two at the one keyboard.
- Moved to round 2's slices (20 November 2026): the Scrapasaurus's fire drawn as fire and the beast reading as a dinosaur
  (BOWL-REX-LOOK, with BOWL-ART-REX round 3); the truck that grinds on an end wall (settled by BOWL-WALLS: the wall turns it
  along and carries it round); listening to the Bowl's stand-in cues (BOWL-SOUND).

## Round 2 comes first (Kyle, 20 November 2026)

This card waits for BOWL-SHOW-2 and its seventeen slices for nights 1 to 5 (the board lists them under `needs`). BOWL-TOUR,
nights 6 to 8, follows the first release and is not needed here. When the slices are merged: the freestyle targets and each
event's numbers tuned in play, the frame check at the busiest view of the Bowl with eight trucks, the switch, the release,
and pictures to Kyle.
- From the BOWL-RIVALS-2 browser run (20 November 2026): pausing in the Bowl shows the ordinary "ROAD ON HOLD" card naming the
  event "Titan Monster Arena"; it should name the night and the event. Watch by hand that Rust Rhino visibly races and that
  the rivals in Last Truck Rolling come at the truck.

## Tuned for a tween (Kyle, 20 November 2026)

Kyle: "don't worry about children losing too much. assume a pre-teen / tween. this isn't for 5 year olds." The standard
is on BOWL-SHOW-2 under "Who it is built for": the scripted slow driver wins an Easy event at least 6 times in 10 and
not all ten. The numbers below are already merged or pinned, so they are moved here, each by measurement and then
checked in the hand drive.

- **Freestyle's marks** moved to card BOWL-FREESTYLE-NIGHTS (one set of marks for each night, a rival's score that climbs,
  a floor of its own each night), which is on this card's `needs`. In the hand drive: play Freestyle on Nights 1 and 5 on
  Easy, and say whether the last 30 seconds still matter after the rival is beaten.
- **The rivals' pace on Easy** (`src/bowl/bowl-rivals.js`: 1.35 times the clean lap, Old Bess 1.45). Starting numbers 1.2
  and 1.3, set so that the scripted slow driver wins Side by Side at least 6 times in 10 and not all ten. The catch-up
  at the line stays. Rule 18, reviewed here: "a child who clips one wall wins narrowly" on at least 9 of 10 seeds in
  `tools/test-bowl-rivals.mjs` becomes at least 6 of 10 at the new pace, for the same reason.
- **Can a flip still go wrong on Medium?** On Easy and Medium a turn starts only when there is air to finish it. If ten
  Medium flips by hand never slam, the guard becomes Easy's alone (one condition in `src/bowl/bowl-tricks.js`; check 2 of
  BOWL-TRICKS-ALL part 1 then covers Easy only).
- **Kept on purpose:** flips that finish themselves, the rivals' longer tells on Easy, an Easy Slam that still pays the
  turns already finished, and no damage outside a fight. Each is a matter of clear keys or clear reading, which a
  pre-teen needs as well.
- The other changes of that day are on their own cards: BOWL-CRUSH (clock and count), BOWL-JUMP-EVENTS and BOWL-TOUR
  (gates), BOWL-REX-2 (the first tired spell and the back box), BOWL-WEAPONS (six wins in ten).
- **Best Trick** (BOWL-NIGHT-4, in place of Home Run) is in the first release and is on this card's `needs`. Big
  Kettle's three tricks on each level are starting numbers, moved here by measurement. In the hand drive: win it once on
  Easy and once on Medium, and say whether a tween needs to see Big Kettle jump or whether the board is enough.
- **The way out stays a secret** (Kyle, 20 November 2026; BOWL-SHOW-2 section 3). In the closing drive read every night
  card, goal line, weapon line, lesson and Big Mo line of nights 1 to 5: none may point the driver at the wall, the
  stands or the car park before the driver has been there. Then go over the wall once and check that Big Mo is surprised
  and the gate arrow leads home.
- **BOWL-REX-3** (the eye beam and the bombs, Kyle's idea of 20 November) is in the first release and is on this
  card's `needs`. In the hand drive: send a bomb back on Easy and on Hard, and say whether the beam can be read from
  the driver's seat.
- From the keyboard drives of 20 November 2026 on the merged game: the hammer, the saw (1.5 m) and the launcher's throw over
  the wall all work, and the stoppie, wheelie and pop-up show on all three Monster Arena vehicles. A hand driver won only one
  Last Truck Rolling in six on Easy, mostly losing to rams: play it by hand and judge whether a tween wins about six in ten.
  START ENGINE sometimes needed a second press at the Monster Arena: find out why.
- From BOWL-BATCH3-FIX (21 November 2026): a driver holding only W in the Scrapasaurus fight drifted between the resting beast and
  the outer wall and stalled at 22 seconds on integration `d09bc5917`. Try it by hand; if a player can be stuck there, card it.
