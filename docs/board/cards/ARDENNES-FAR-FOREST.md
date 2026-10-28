# ARDENNES-FAR-FOREST

From Claude's finishing pass on Ardennes (P4-FINISH-ARDENNES, finding F5, 15 October 2026).

## The fault

Beyond Ardennes' forest band (firs from 23 to 60 m past the road edge) the hills are bare grass. At La Fontaine, Les Combes, Riverside, Stavelot and Bus Stop Exit a bald slope fills half the picture, which reads as a golf course rather than the Ardennes. Pictures: `.evidence/2026-10-15/P4-FINISH-ARDENNES/views/` in the integration folder (`ardennes-les-combes-high-first-lap.png`, `ardennes-la-fontaine-high-first-lap.png`, `ardennes-stavelot-high-first-lap.png`).

## Why course data cannot fix it

The forest band is one seeded pass (`scatterScenery` in `src/track-script-course.js`). Its trees are named in order (`forest-0`, `forest-1`, ...), and its random numbers are drawn per tree, so any change to the band's depth, rows or clear stretches renames and moves every later tree on that side. The accepted beeches are chosen from those trees by name and distance (`beechTreePlacements` in `src/vegetation.js`), so the Kestrel and Forest Run groves would change. A deeper band would also turn its new far trees inside the grove reach into beeches.

## Settled design

- An optional second band, `scenery.farForest` (same fields as `scenery.forest`: from, to, spacing, rows, thin, scale, jitter, and optional `clear` stretches of its own), placed after the first band.
- Its own random generator (its own seed constant mixed with the course stage) and its own tree names (`far-forest-N`). The first band's trees, names, positions and random sequence stay exactly as they are; the far band only avoids spots the first band already took.
- `beechTreePlacements` ignores far-band trees, so the beech set stays identical.
- Far trees are scenery like the first band: same ground, the same keep-clear rules (road, run-off, corner insides, basins, kit `clear`), same fall and reset behaviour.
- Ardennes opts in with a band from about 60 to 100 m, rows thinned further out, plus firs on the slope behind Stavelot outside the village and its clear stretch. Keep the drawn tree count increase under about 25 percent (9,131 today).
- Every course without `farForest` is unchanged, byte for byte.

## Acceptance

- Tests (in the existing circuit and vegetation suites): the first band's trees and the beech list are identical with and without the far band; a course without `farForest` is unchanged; far trees obey the keep-clear rules.
- Native Ardennes views at La Fontaine, Les Combes and Stavelot, judged by Claude in pictures.
- A simple frame check when a quiet slot is available (it adds trees). Ardennes' world signature is recaptured after a reviewed visual difference.
- Lane tier, build, one review.
