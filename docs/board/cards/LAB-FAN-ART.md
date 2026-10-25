# LAB-FAN-ART

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/LAB.md`; this card names the slice, files and acceptance.

Codex (Blender and the laptop screen). LAB section 6. Switch `lab` (dev).
Can start now.

The McMurtry Spéirling: a tiny single-seat electric fan car, about 3.2 m
long, closed canopy, a short high nose, big rear fan housings with
round outlets, skirts along the floor to seal the fan's low pressure, slick
tyres. Work from public photographs as a viewing reference only; build it
from `tools/blender/speirling.py`. The real maker's name is used, as for the
other real cars (Koenigsegg, Ferrari, McLaren, Bugatti); match their badge
and naming practice. Same rules as the other car models (four wheels,
driver, damage, brake lights). A second small model: the Project Fan
blueprint as a pinned sheet for the Lab wall.

One sheet per round in `docs/board/looks/speirling/`, at most three rounds;
Claude judges. No frame check until it races (rule 9).

Owns: `tools/blender/speirling.py`, `public/assets/models/speirling/`,
catalogue and credit rows, `docs/board/looks/speirling/`,
`docs/changes/LAB-FAN-ART.md`. Locks: none. Sound: none.

Acceptance: the car-model checks used for the other unlock cars; Claude's
verdict; lane tier and build. Removed: nothing.

## Claude's review at merge (25 October 2026)

Look: accepted at round 5. Rounds 1 to 4 were code-built from a written
description and missed the car; Kyle supplied photos and lifted the cap, and
Codex made four Blender studies (try 04 chosen) and a final pass with the
closed engine cover. Changed assertions in `tools/test-speirling-vehicle.mjs`,
approved: every measurement of the retired code-built body is replaced by
the same kind of check on the accepted GLB (triangle cap 50k, seven
materials, four named wheels, hub height, size, grounding); no budget,
damage or grounding limit was raised. Floor clearance now matches the
model's 6 mm skirt instead of the old 2 to 6 cm range, which is what a fan
car's skirt does.
