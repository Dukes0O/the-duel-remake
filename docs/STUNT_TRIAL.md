# Titan Stunt Trial

Win by completing two laps, landing at least four scored jumps, and crushing at least four junk cars before time runs out. The trial requires the Titan Monster. It has no rival, traffic, or police.

| Challenge level | Time limit |
| --- | ---: |
| Easy | 95 seconds |
| Medium | 75 seconds |
| Hard | 62 seconds |

Use the three arena ramps and six junk cars. Each ramp can score once per lap. Each junk car can score once during the event. A jump counts when the truck lands; clearing a junk car in the air does not crush it. Nitro is available, but the stock truck can meet the Hard targets without it.

Crushing junk cars costs a little speed and does not count as a major crash. Solid walls still cause damage and the normal 30-second crash penalty. A fifth major crash remains fatal. The clock includes penalties.

Finishing both laps with missing stunt targets is a loss. Meeting the targets before finishing both laps is not a win. Reaching the deadline ends the attempt, even when the stunt targets are already met.

## Integration

The event id is `titan-stunt-trial`. It uses the existing arena course and vehicle systems, with its own event record key. `state.objective` supplies the jump target, crush target, and deadline for the HUD. Completed, timed-out, and fatal results preserve objective progress for the result view. Credits remain settled by the existing progression flow after the result; no stunt event changes the wallet during driving.

Run `node tools/test-stunt-trial.mjs` to check deadlines, missing targets, early-finish protection, repeated result calls, required vehicle, and ordinary-input runs. The stock Titan completed the Hard target in 50.45 seconds with automatic shifting and 50.44 seconds with manual shifting, landing six scored jumps and crushing five cars. Those runs used no nitro and produced matching results at simulated 30 and 144 FPS.
