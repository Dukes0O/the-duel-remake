# QA-HARBOUR-ROAD-CLEARANCE

Use Claude's approved midpoint heading for each existing 4 m road-clearance sweep. Harbour's Casino Corner change shifted an 8 m sample into the Lantern Hairpin spiral. The fixed start heading made the 4.9 m probe body clip wall-right-1105 at s 2056/lateral -3.5, although a car follows the turning road. The wall generator has only a global setback; smoothInnerWalls changes drawing only.

## Changed assertions

The contact assertion stays exact. Only its sweep orientation changes from the start heading to course.worldAt(s + 2, lateral).heading, as Claude approved. All seeds, courses, probe positions, widths, the 1 m hairpin allowance, body dimensions, ranges and tolerances stay exact. Runtime geometry and world signatures do not change.

## Checks

Source preparation only. No focused check, lane gate or build has run on this change. Independent review and the required checks remain pending.

## Removed

Replaced the fixed start-heading probe orientation. No runtime code, assets or checks were removed.
