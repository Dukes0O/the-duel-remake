# BOWL-OUT-LOOK

The short board entry controls current state, ownership, dependencies and locks.

Over the wall, drawn: the crowd that scatters, the tunnels, the car park and the tyre walls. Design:
[BOWL-SHOW-2](BOWL-SHOW-2.md), sections 3 and 8. Claude's card: it is judged by pictures from the game and by driving.
Drawn in code first (`memory/code-drawn-art-first`), gritty, never toy-like.

## What to draw

1. **The crowd scatters.** People within 6 m of a truck in the stands are gone from their places, the people at the edge
   of that ring run from it, and they come back when the truck has gone. Drawn from the existing crowd cut-outs; the view
   reads the truck's place and writes nothing. Nobody is hit.
2. **Two gates:** an arch 8 m wide in the outer wall and in the stand wall, a concrete tunnel under the stands between
   them with strip lamps, and a lamp over each mouth that flashes while a truck is outside.
3. **The outside of the stadium:** the back of the stands as a structure (today a blank concrete face), the feet of the
   floodlight towers, the car park's ground and its parked cars (the existing junk car models), the dirt bank at its edge,
   and the night beyond.
4. **Tyre walls:** a row of big tyres along the foot of the stand wall and the Spine, so that a bounce looks like a bounce.
5. **The marker back to the gate:** an arrow with a shaft and a head and a distance, as NIGHT-2-TRY-FIXES draws them.

## What done looks like

Pictures from the real game with its screen up, at night: a truck in the air over the fence; a truck on the terraces with
the crowd running; the leap off the back; the car park from truck height; a truck coming out of a tunnel onto the floor.
One comparison sheet under `docs/board/looks/bowl-out/` with Claude's verdict, sent to Kyle with a pick.

## Files and locks

`src/bowl/bowl-stadium.js`, `src/bowl/bowl-view.js`, `src/bowl/bowl-outside-view.js` (new),
`docs/board/looks/bowl-out/`. No lock.

## Checks

1. `tools/test-bowl-course.mjs`: the stadium view builds once, with the two gates where `features.bowl.gates` puts them.
2. Laptop only: the pictures above, and a hand drive of the whole trip. No frame check until the Bowl can be reached by
   players (rule 9); BOWL-FINISH times it.

## Sound cues

None new: the events and their cues are BOWL-OUT-SIM's.
