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
