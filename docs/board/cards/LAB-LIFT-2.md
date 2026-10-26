# LAB-LIFT-2

The short board entry controls current state, ownership, dependencies and locks.

Codex builds; Claude wrote the lesson in `docs/LAB.md` section 12.4.
Switch `lab-2` (dev).

The lesson's data and its animations: Kestrel One straining with the
Dusthawk; the collective lever moving, blades twisting, downwash particles
speeding up and the green arrow growing; loading the pad with fuel cans,
crates and the Dusthawk, each showing its weight; numbers from the game's own
helicopter (`src/heli/heli-flight.js`), never copied by hand. Art from the
existing Lab models first; anything new is a Blender recipe, at most three
look rounds, judged by Claude.

Checks: the lesson runs end to end in a browser scenario; the hover
prediction matches the game's own lift numbers for every load the pad
offers; a short screen recording or picture sheet of each step for Claude.
Then Kyle and Gratian try it (rule 18 preview) before LAB-LESSONS-2.
Lane tier and build.

**Also (Claude, from LAB-WALK's look):** Brian gets his own figure instead of
Rook: a calm workshop teacher in a work shirt or overalls, safety glasses
pushed up on his head, sleeves rolled. A Blender recipe, counted in this
card's three look rounds.

**From the frame's look (Claude, 26 October):** the picture is the lesson.
Put the arrows on Kestrel One itself and make them large, show the downwash
as a clear stream under the rotor, show the graph only in the step that uses
it, and keep the step panel short so the 3D view stays the centre of the
screen.

## Codex handoff · 26 October

The Dusthawk alone lifts under the game's rules, so the worked example
shows that success before adding three labelled crates for the overload.
All helicopter numbers still come from `heli-flight.js`; cargo masses come
from `heli-cable.js`. Claude confirmed this example in the round-1 verdict
relayed by Kyle on 26 October.

Round 1 is `docs/board/looks/lab-2/look-3.jpg`; the comparison and code review
are recorded in `docs/changes/LAB-LIFT-2.md`. `lab-2` stays dev, for Kyle and
Gratian's preview before the next fifteen lessons.

Claude's written test review before merge (AGENTS 18):
`tools/test-blender-output.mjs` adds Brian to the existing generator table,
expecting `public/assets/models/lab/brian.glb` and no editable Blend file.
No assertion code or tolerance changes. This extends generator coverage
and applies the existing planning, placement and reproducibility checks;
89 checks pass. Claude approved this table addition in the same verdict;
the existing checks remain unchanged.

## Round 2 · Claude's requested changes

Kg comparison captions, a closer low view, thick centre-line arrows,
visible downwash, a tidy load gauge, clean prediction cards, the collective
cockpit inset and Brian's face/workwear update. Sheet: `look-4.jpg` in the
same look folder. This is the second of at most three art rounds.

Changed assertion for review: the exact word sequence now puts Weight before
Lift, so the requested kg comparison line cannot use Weight before teaching
it. The sequence check still requires every word in its exact order. The
browser recipe follows this same order and checks that prediction labels
are hidden. Added kg-equivalence and caption-limit checks; no tolerance or
existing frame assertion was relaxed. Claude's round-2 verdict will review
this deliberate order change under AGENTS 18.
