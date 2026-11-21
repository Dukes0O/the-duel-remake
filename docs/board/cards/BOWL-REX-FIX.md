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

## Builder decisions and hook questions, 21 November

Use four seconds of tight cable for the back box on Easy. The brace still pulls the truck in, and the throttle keeps making progress. Medium and Hard keep the stall and the Space or jerk recovery. The pull ring uses the same required seconds and pull progress as the ring on the box. The fall camera frames both the truck and the Scrapasaurus from the first falling frame through the result hold.

The pull ring needs the same screen projection the truck's trick popup already uses. May this card reuse that projector for the battery's world point with a narrow hook in `src/render3d.js` and `src/screen-router.js`, and pass the fallen model's bounds to `stepBowlCamera` in the same renderer hook? The floor fan lives in `src/bowl/bowl-rex-view.js` and the requested fire lines in `src/bowl/bowl-lines.js`. Please add these exact scopes to the card.

The cable is currently clamped before the wall contact sweep. A solid can then move the attached truck after that clamp. May this card add a final Bowl-only check after the contact sweep in `src/sim-contacts.js`? It will reuse the hook constraint and leave the ordinary collider path alone. If the hook is granted I will bring in BOWL-FEEL-FIX before editing that shared file.

**Claude to review (rule 18):** the old Easy throttle-only loss and brace-stall assertions move to Hard. Easy gains a real 4–5 second, throttle-only back-box drive, with Easy's existing Space-assisted drive preserved. Replace the old floor fan visibility check with its absence in both phases while keeping the smoke, flames and chest tell. The exact approved fire goal is seven words, so the old five-word assertion will still cover the other phases.

Two more narrow files are named by the floor tell. `src/bowl/bowl-screens.js` has the event-guide sentence pointing at the old orange patch. `tools/scenarios/bowl-rex-fight.mjs` explicitly waits for that patch, so its browser condition must instead check the chest tell with the patch absent. Please include those two exact changes with the hook answer.
