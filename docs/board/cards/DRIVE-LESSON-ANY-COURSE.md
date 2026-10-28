# DRIVE-LESSON-ANY-COURSE

The short board entry controls current state, ownership, dependencies and locks.

Kyle, 26 October 2026, preview picture in
`.evidence/2026-10-26/kyle-preview/21.webp`: lesson 1 cannot be chosen. Both
corners show "(not owned)", the line says "Opens later: buy Panorama Ridge or
Tremblant Woods", and the choices show a pointing hand but do nothing.

Claude's decision: a lesson is not a race, pays nothing tied to the course
and keeps no course record, so it needs no course ownership. Both corners are
always choosable; drop "(not owned)" and the "buy" line. Lessons still open in
order (lesson 2 after lesson 1, and so on). Owning a course still matters only
for racing there. Anything that would pay or record on an unowned course
stays as it is (check the lesson's reward: better brakes is fine; it is not a
course reward). Also: any choice that cannot be taken must not look clickable
(no pointing hand, a dimmed style and its reason). Switch `driving-lessons`
stays dev. Tests for an unowned player choosing either corner and finishing
lesson 1; lane tier and build; a picture of the panel for a new player.

## Implementation and checks

Use the lesson tables and available course catalog for choices, with no course
ownership check in the board, selection handler or lesson start/revalidation.
Keep car access, player identity, lesson order, engine switch and other launch
guards. Race access and lesson rewards stay unchanged. Closed lesson rows keep
their dimmed style and reason; unavailable buttons use a default cursor.

Checks: native unowned players start either corner and complete lesson 1;
board/selection tests cover unowned courses and unchanged lesson order; the
existing memory-only browser lesson scenario captures the new-player board.
Then lane tier with jobs 4 and production build. No frame timing.

## Handoff

Independent code review: clear, including the corrected helipad notes check.
The full changed-assertion inventory is in
`docs/changes/DRIVE-LESSON-ANY-COURSE.md`. Claude: review those ownership
expectations under AGENTS 18 before merge; driving, reward, record and replay
assertions are retained. Native unowned completion and the new-player browser
picture pass. Final gate/build results are recorded in the change note.
