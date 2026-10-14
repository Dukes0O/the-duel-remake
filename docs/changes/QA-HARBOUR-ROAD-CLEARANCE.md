# QA-HARBOUR-ROAD-CLEARANCE

Use Claude's approved midpoint heading for each existing 4 m road-clearance sweep. Harbour's Casino Corner change shifted an 8 m sample into the Lantern Hairpin spiral. The fixed start heading made the 4.9 m probe body clip wall-right-1105 at s 2056/lateral -3.5, although a car follows the turning road. The wall generator has only a global setback; smoothInnerWalls changes drawing only.

## Changed assertions

The contact assertion stays exact. Only its sweep orientation changes from the start heading to course.worldAt(s + 2, lateral).heading, as Claude approved. All seeds, courses, probe positions, widths, the 1 m hairpin allowance, body dimensions, ranges and tolerances stay exact. Runtime geometry and world signatures do not change.

## Checks

Root's independent source review confirms the approved operand-only change. The original focused suite on 0c6542e7 still fails the same Harbour wall at 2056/-3.5: exit 1 in 3676.1392 ms. A single read-only calculation also retains the hit with smaller midpoint sweeps, so the proposal does not resolve the guard. No lane gate or build followed the failure. The card has returned to Claude for a narrow released-course decision; no additional assertion, wall or runtime edit is assumed. Evidence: .evidence/2026-10-14/QA-HARBOUR-ROAD-CLEARANCE/final-0c6542e7. This lane is parked and unmerged.

## Removed

Replaced the fixed start-heading probe orientation. No runtime code, assets or checks were removed.
