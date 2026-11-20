# BOWL-REX-LOOK

The short board entry controls current state, ownership, dependencies and locks.

The Scrapasaurus fight, drawn so that it explains itself. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), section 10, option A
(Kyle, 20 November 2026, turned down the ramp up its tail: the driver now hooks the open box and pulls it out). Claude's
card: it is judged by pictures from the game and by driving.

**Seen in the hand drive:** resting, it was a crouched heap of orange scrap at the edge of the picture; from the driver's
seat it did not read as a dinosaur, and nothing said what to do.

## What to draw

1. **Tired:** it sags with its head low and steam coming off it. Its tail lies on the floor as a tail, with nothing on
   it that invites a truck.
2. **The boxes:** each a yellow box with black stripes, a lightning sign and a steel ring. A closed one sits under its
   cage. The open one glows, and a beam of light stands up from it, tall enough to be seen from anywhere on the floor. A
   box that is out leaves a dark socket with torn cables. Three battery pictures at the top of the screen follow them.
3. **The hook and the cable:** the hook in flight; the cable slack on the floor and then tight, bright enough to follow
   from across the arena; the F key on the marker over the box whenever a shot would bite; a ring round the box that
   fills as the driver pulls; the truck straining with its nose up and dirt flying from its wheels; the box tearing out
   in sparks and bouncing along behind the truck.
4. **It pulls back:** on the second box it plants its legs and leans away from the truck. On the third it lifts its head
   towards the truck with its chest glowing, and the orange on the floor runs along the cable.
5. **Its fire as fire** (owed from BOWL-FINISH: today it is plain glowing sheets): the flamethrower's look, larger, with
   the orange on the floor exactly where the rules put it, and the sweep after the first box.
6. **It reads as a dinosaur from every side** while it walks, rears, breathes and falls.
7. **The ending:** its lights die, it sways and falls full length along the floor, the flame jets go off together, and
   the truck drags the last box past the crowd.
8. **The card before the fight:** three pictures, taken from the game.

## What done looks like

Pictures from the real game with its screen up, from the driver's seat: its burst from the gate; the tell with the orange
on the floor; tired, with the beam, from 60 m away; the cable tight on each of the three boxes; a box tearing out; the
fall and the truck dragging the last box. One comparison sheet under `docs/board/looks/bowl-rex/` with Claude's verdict,
sent to Kyle with a pick. Then Claude wins the fight by hand on Easy and Hard, and says on this card whether the pull
feels good in the hand. If it does not, section 10's option B is the fallback, and Kyle hears of it first.

## Files and locks

`src/bowl/bowl-rex-view.js`, `src/bowl/bowl-view.js`, `docs/board/looks/bowl-rex/`. No lock.

## Checks

1. The view reads the fight's state and writes nothing (the existing check in `tools/test-bowl-rex.mjs`).
2. Laptop only: the pictures above and the two hand drives.

## Sound cues

None new: the events and their cues are BOWL-REX-2's.

## Owed from BOWL-ART-REX round 5 (Claude, 20 November 2026)

The outline passed; the surface did not. Panels as dented painted steel with rust, bare edges and a sheen (as the welded
reference on round 5's sheet); legs as thick as the reference's; no plinth or rails under the feet. The tail is no longer
a ramp (see BOWL-ART-REX), so nothing is drawn on it.
From round 6: set the three battery boxes down into the body, strapped into the ribs, not on tall square posts; the torn
leads in an empty socket thick, bright and sparking, readable from the truck.

## Owed from BOWL-REX-3: the eye beam and the bombs (Claude, 20 November 2026)

Kyle, 20 November 2026: "maybe scrapasuarus should be able to shoot lazers or bombs at you." BOWL-REX-3 builds the rules
and draws plain shapes. Drawn here, in a second sitting once that card has merged, and in code first (shaders and
effects before any model file):

- **Its eyes:** two headlights that turn from white to red as it aims, bright enough to see from across the floor.
- **The line and the beam:** the thin red line on the floor that follows the truck; the orange strip when it stops;
  the beam itself as a hard white-red bar with heat above it and a scorched stripe left on the dirt for a few seconds.
- **The hatch and the bomb:** a hatch between its shoulders that opens with a spinning red lamp; the bomb as a scrap
  drum with a blinking light, a carrying ring that the hook can plainly take, and its orange ring filling on the floor.
- **Sent back:** the burst under the beast, and a stagger that reads as hurt and not as the ordinary tired pose.
- Pictures from the real game with its screen up: the red line on the truck; the orange strip a moment before the
  beam; the truck clear over the beam; a bomb ticking; a bomb on the cable; the burst under the beast.
