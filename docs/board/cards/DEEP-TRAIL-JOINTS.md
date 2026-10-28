# DEEP-TRAIL-JOINTS

The short board entry controls current state, ownership, dependencies and locks.
Design: `docs/THE_DEEP.md` section 3.

Found in DEEP-ROCKS-PUSH (27 October 2026, night): the Deep drives in a course
frame built from the trail, a chain of 8 m segments. A car far to the side of
the trail jumps sideways when it crosses a joint, by about its sideways offset
times the bend angle, even with no rocks. Kyle reported "weird course resets"
underwater; the rock snap was one cause, this is probably the other.

Claude decides: the car's world position must be continuous on the open sea
floor. Crossing a joint never moves the car in the world. Fix the cause in how
the Deep converts the car's frame position to the world (for example a smooth
frame between segments, or carrying the car's world position and re-deriving
s and lateral without a jump), not by hiding it in the drawing. Races are not
touched: replay fingerprints and world signatures stay exact.

Checks: a native test drives far beside a bending stretch of trail and shows
no world-position step larger than the car's own travel at any joint; the
Deep suites pass; lane tier and build.