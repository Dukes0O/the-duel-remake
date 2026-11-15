# Scablands land, round 8: the realism trial, step 1 (light and air)

Sheet: `round-8.jpg` (four places, before above and after below; pictures from the real game in a
visible browser window on the QA page with memory-only saves, Performance). Taken 14 November
2026 with scenario `tools/scenarios/scablands-realism.mjs` (run with `SCABLANDS_SHEET=1`). Built
and reviewed by Claude.

Kyle: "Curious what it would take to make things more photo-realistic? I think more photo realism
(doesn't need perfection) could make a lot of the game play really enticing." Then: "Yeah! Let's
experiment and go for it."

## What changed, behind the switch `scablands-realism` (off)

- The sun stands 25 degrees up in the south-south-west (it stood 45 degrees up) and is about
  seven times as strong as the light from the sky (it was little more than the same).
- The sky is a desert afternoon: blue above, pale at the horizon, thin cloud.
- The haze starts at the car and thickens evenly to the edge of what the camera sees, in the
  horizon's own colour. It was a blue-grey wall between 260 and 1,650 m.
- Shadows reach 100 m from a point 45 m ahead of the car. They stopped 45 m from the car.

## Verdict (Claude): kept as the base for steps 2 and 3; a small gain alone

Better:

- **Things throw long shadows.** The Girder Bridge's frames lie across its deck, and a thing 100 m
  ahead has a shadow where it had none.
- **The far hill at Tin Town fades into the haze.** It stood as a flat blue shape.
- **The sky reads as a desert afternoon**, not a pink evening over a grey-blue band.

Not right yet:

- **The ground is still one flat matt sheet of one colour.** Light has nothing to catch on it,
  so the land looks much as it did. This is the trial's main finding: light alone does not make
  this land look real. Step 2 (photographed surfaces with their relief) is where the gain is.
- **The scab plates are black in any light.**
- **Far black ground meets the pale sky in a dark line**, because haze cannot lighten ground
  that is only a few hundred metres off.
- **The clouds are one flat layer.**
- **The haze is the same in every direction.** Real haze is brighter toward the sun. That needs
  a change to how every thing on the land is drawn, and is left until the surfaces are done.
- **Shadow edges are soft on Performance** (a shadow dot is 20 cm across there, 10 cm on High).
- **The soft dark shading where a thing meets the ground** exists only on High, as before.

Cost, roughly: the game held 60 pictures a second before and after in a visible window, which
is the screen's own limit, so a cost under that limit is not seen. Draw calls and triangles are
the same within a few per cent. This is a guide, not a frame check.
