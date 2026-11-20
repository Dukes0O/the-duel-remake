# BOWL-REX-LOOK

The short board entry controls current state, ownership, dependencies and locks.

The Scrapasaurus fight, drawn so that it explains itself. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), section 10. Claude's
card: it is judged by pictures from the game and by driving.

**Seen in the hand drive:** resting, it was a crouched heap of orange scrap at the edge of the picture; from the driver's
seat it did not read as a dinosaur, and nothing said "drive here".

## What to draw

1. **Tired:** it sags with its head on the floor and steam coming off it, and its tail lies flat as a ramp with lit
   arrows running up it towards its back.
2. **The boxes:** each a yellow box with a lightning sign; the open one glows and a beam of light stands up from it, tall
   enough to be seen from anywhere on the floor; a smashed one is dark and broken. Three battery pictures at the top of
   the screen follow them.
3. **Its fire as fire** (owed from BOWL-FINISH: today it is plain glowing sheets): the flamethrower's look, larger, with
   the orange on the floor exactly where the rules put it, and the sweep after the first box.
4. **It reads as a dinosaur from every side** while it walks, rears, breathes and falls (with BOWL-ART-REX round 3, which
   also makes the tail wide and flat enough to be the ramp the rules describe: at least 4.5 m wide, no steeper than 25
   degrees).
5. **The ending:** it falls, the flame jets go off together, and the truck stands on it.
6. **The card before the fight:** three pictures, taken from the game.

## What done looks like

Pictures from the real game with its screen up, from the driver's seat: its burst from the gate; the tell with the orange
on the floor; tired, with the tail's arrows and the beam, from 60 m away; the truck on its back at each box; the fall and
the truck standing on it. One comparison sheet under `docs/board/looks/bowl-rex/` with Claude's verdict, sent to Kyle
with a pick. Then Claude wins the fight by hand on Easy and Hard.

## Files and locks

`src/bowl/bowl-rex-view.js`, `src/bowl/bowl-view.js`, `docs/board/looks/bowl-rex/`. No lock.

## Checks

1. The view reads the fight's state and writes nothing (the existing check in `tools/test-bowl-rex.mjs`).
2. Laptop only: the pictures above and the two hand drives.

## Sound cues

None new: the events and their cues are BOWL-REX-2's.
