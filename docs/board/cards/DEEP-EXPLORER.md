# DEEP-EXPLORER

The short board entry controls current state, ownership, dependencies and locks.

## Kyle's report (25 October 2026, playing the live Deep with Gratian)

Unable to exit the water. Rocks have no collision; the car goes straight
through. It is unclear what territory has been covered, what the objectives
are and when they are achieved. "We should mark off what we find, where it
was found ... slowly illuminate or build the map of where we've explored,
like an underwater cartographer."

## Claude's design

1. **A way out, always.** A clear "Surface" action in the dive HUD (button
   and key, for example Enter-held or a free key; list it in the controls
   help) that brings the car back to the top of the ramp on the road and
   resumes or ends the race as the ramp return does today. Driving back up
   the ramp must also work (DEEP-RAMP-2 rebuilds the ramp itself; this card
   makes sure the return is reachable and tested from every part of the loop).
2. **Solid rocks.** Every rock, sea stack and reef boulder in the zone the
   car can see is solid: the car bumps and stops or deflects as against a
   wall on land, with the existing soft underwater damage rules (no wrecks).
   Kelp stays soft (you drive through it, it sways).
3. **The cartographer's chart.** The dive map (DEEP-PLAYTEST-1) becomes a
   chart that starts dark and fills in as you explore: everything within
   about 25 m of the car's path is revealed, drawn as a hand-inked sea chart
   (sand, kelp, rock and depth tints, the loop, the ramp). Explored area is
   saved per player (`deep.charted`, a coarse bitmap or list of cells per
   zone; optional field, old saves untouched, small: a few KB at most) so it
   persists between dives. The chart shows how much of the Kelp Coast is
   charted as a percentage.
4. **Finds pinned where they were found.** Each logged creature, pearl, part
   and the badge leaves a small icon on the chart at the spot it was found
   (from the saved log and the zone's fixed spots), and a place's name is
   written on the chart once its title card has shown. Unfound things are
   never shown.
5. **Clear objectives.** A small "Ana's list" panel (open with the map) with
   the Kelp Coast goals and their progress, ticked as they happen, each with
   a one-line pointer when stuck:
   - Find the Falcone badge (then the sonar works)
   - Raise the Sirena's parts with lift bags: N of 5, then the Sirena herself
   - Log the sea life: N of 7
   - Find the pearls: N of 3
   - Chart the Kelp Coast: N%
   - Race the Coast Cup (after the Lab restores the Sirena)
   A tick plays the existing log sound and shows a short line ("Badge found"),
   never over a title card.

Locks: `busy-game-files`, `save-shape` (the `charted` field). Saves card:
one independent review. Acceptance: tests for the Surface action from every
place, rock collision on every placed rock, the chart reveal and its saved
size cap, pins only for real finds, the objective list against the save;
a picture sheet of the chart part-explored and fully explored with pins and
Ana's list for Claude's look check; deep scenarios and deep-frames (laptop
quiet) at most 18.5 ms p95; lane tier and build.
