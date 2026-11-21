# BOWL-REX-FIX

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 21 November 2026: Sol builds all the Bowl fix cards; none needs heavy physics).
(`6c320374a`, Easy, two wins in 82 s and 140 s, 20 November 2026). Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), section 10.
Tested and merged under AGENTS rule 23.

## What to build

1. **The back box on Easy.** About a second after the cable goes tight the beast braces, the pull stops counting, and the
   truck is dragged up against the beast with the ring a third full. The box needed three tired spells in each fight. The
   design says that on Easy the throttle alone still wins the back box in 4 seconds: the pull keeps counting through the
   brace on Easy, and on Medium and Hard a jerk or nitro restarts it as designed.
2. **The pull ring cannot be seen while pulling,** because the box is behind the truck and off screen. Show the same ring
   on the screen's strip beside the goal ("KEEP PULLING") whenever the box is off screen.
3. **The fall is not in the picture.** For the ten seconds after the third box the camera follows the truck as it drives
   off. Turn the camera to hold the falling beast and the truck together for those ten seconds.

## Files and locks

`src/bowl/bowl-rex.js`, `src/bowl/bowl-hook.js`, `src/bowl/bowl-hud.js`, `src/bowl/bowl-camera.js`,
`tools/test-bowl-rex.mjs`, `tools/test-bowl-camera.mjs`. Locks: `bowl-screens`.

## Checks

1. `tools/test-bowl-rex.mjs`: on Easy, a driver holding only the throttle takes the back box within one tired spell, in 4 to
   5 seconds of tight cable; on Hard the same driver does not.
2. `tools/test-bowl-camera.mjs`: during the ten seconds of the fall, the beast and the truck are both inside the picture.
3. Laptop only, Claude runs with the next batch drive.

## Sound cues

None new.

## Added from Batch drive 2 of the merged game at `fb02d3233` (20 November 2026; pictures in `.evidence/2026-11-20/batch-2/` of the integration folder)

4. **The cable does not hold the truck.** With the cable tight and "KEEP PULLING" up, the truck drove through the wall, the
   stands and the bank to 317 m and then 475 m out, and won the fight from the car park (`n5-rex-a-20-pulling.jpg`). The
   cable is 15 m long: a hooked truck can never be further than 15 m from the box. When the cable is tight the truck's
   travel away is stopped (it strains, nose up), and the beast's pull drags it back as designed. Check: no hooked truck is
   ever more than 15 m from its box, whatever the throttle and nitro.

## Kyle's try in the Preview (20 November 2026, integration at `bfec511bb`)

5. **No light on the floor before the fire.** Kyle: "scraposaurus probably doesn't need the ground to light up before
   breathing fire. no need at all." The orange that marks the fire's reach on the floor goes, on every level. The tell is
   on the beast: the chest glows, it roars, and its head turns to aim, for the tell's whole time as now. The fire itself
   is unchanged. Words: the goal line during the tell and the fire becomes "ITS CHEST IS GLOWING, SO GET CLEAR";
   `rex.tell` becomes "Look at its chest glowing. That means fire is coming, so get away from its head."; `rex.scorch`
   becomes "Ouch, that truck got toasted. Watch its chest, and move when it glows." Check: no floor marking is drawn in
   the tell or fire phases; a scripted driver who drives away from the head when the chest glows is not burned on Easy.
   The bomb rings (BOWL-REX-3) were already made almost invisible, and the eye beam's red line stays, because it is the
   beam's own aim and not a mark on the floor.
6. **The jerk to the side after a bump** in the fight is BOWL-FEEL-FIX item 1.
