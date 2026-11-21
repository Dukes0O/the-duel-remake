# BOWL-REX-3-LOOK

The short board entry controls current state, ownership, dependencies and locks.

The Scrapasaurus's eye beam and bombs drawn, once BOWL-REX-3 has merged. Claude's card: it is judged by pictures from the
game. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), section 10, and [BOWL-REX-3](BOWL-REX-3.md), item 4, which binds this card.
Moved here from BOWL-REX-LOOK when that card merged (round 7 of the model and the fight's moments, 20 November 2026).

## What to draw

Kyle, 20 November 2026: "maybe scrapasuarus should be able to shoot lazers or bombs at you." BOWL-REX-3 builds the rules
and draws plain shapes. Drawn here, in a second sitting once that card has merged, and in code first (shaders and
effects before any model file):

- **Its eyes:** two headlights that turn from white to red as it aims, bright enough to see from across the floor.
- **The line and the beam:** the thin red line on the floor that follows the truck; the orange strip when it stops;
  the beam itself as a hard white-red bar with heat above it and a scorched stripe left on the dirt for a few seconds.
- **The hatch and the bomb:** a hatch between its shoulders that opens with a spinning red lamp; the bomb as a scrap
  drum with a blinking light, a carrying ring that the hook can plainly take, a lamp that blinks faster as its time runs out, and its shadow
  growing on the floor as it falls. **Its two rings on the floor are barely there** (Kyle, 20 November 2026: "the
  colour contrast should be close to the colour of the ground. like really close"): Kyle's later word the same day moved the number:
  each of red, green and blue 3 steps of 255 from the floor under it, never more than 4, all a little darker or a tiny
  tint, with no glow, outline or flashing. BOWL-REX-3, item 4, has the whole rule, and nothing drawn here may make the rings plainer.
- **Sent back:** the burst under the beast, and a stagger that reads as hurt and not as the ordinary tired pose.
- Pictures from the real game with its screen up: the red line on the truck; the orange strip a moment before the
  beam; the truck clear over the beam; a bomb ticking, with its ring measured against the floor beside it; a bomb on the cable; the burst under the beast.

## Files and locks

`src/bowl/bowl-rex-view.js`, `docs/board/looks/bowl-rex/`. No lock.

## Checks

1. The view reads the fight's state and writes nothing (`tools/test-bowl-rex.mjs`).
2. Laptop only: the pictures above, with each bomb ring's colour measured against the floor beside it.

## Sound cues

None new: the events and their cues are BOWL-REX-3's.
