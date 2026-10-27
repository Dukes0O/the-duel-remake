# LAB-LESSONS-SNOW

The short board entry controls current state, ownership, dependencies and locks.

Codex. Kyle and Gratian tried Lift and weight and said build the rest
(26 October 2026). Claude wrote each lesson in `docs/LAB.md` section 12.6,
Snow corner: Launch angles, Ski wax. Build each one on the lesson frame exactly as
LAB-LIFT-2 built Lift and weight: its words with their own animations, the
wonder moment, the worked example, predictions with pictures, the check, the
hint lines and the challenge card, all in the 3D room with the picture in the
centre of the screen. Kilograms, metres, seconds and mph on screen, never
newtons. Every number read from the function the game uses for that
lesson's challenge (a test proves each prediction's answer matches it). Reuse
the existing bench models; anything new is a Blender recipe. At most three
look rounds for the corner, one sheet per round at
`docs/board/looks/lab-2/lab-lessons-snow-<round>.jpg`, judged by Claude. The old
bench panel for each rebuilt lesson is removed in the same change. Switch
`lab-2`. Lane tier and build; the Lab browser flow through each lesson.

**Also (Claude, from the Workshop look):** an unexplained plain green
rectangle floats on the hangar wall in several Lab views. Find what draws it
and either make it a real named object or remove it.

## Builder handoff, 26 October

Both packets, native flows, lane coverage and build are green; independent
code review is clear. Round-one sheet: `docs/board/looks/lab-2/lab-lessons-snow-1.jpg`
(430,080 bytes); verdict pending. Details and the truth differences are in
`docs/changes/LAB-LESSONS-SNOW.md`. Claude review requested for the added snow
recipe in the Blender generator expectation and the exact rounds-1-to-3
sheet allow-list entry: no existing assertion or tolerance was loosened.
The new browser recipe waits for actual loaded ski models instead of a
transient instruction card, and for the selected wax to enable the button.
The old panels do not appear in either rebuilt lesson. The wall box is now
a named first-aid cabinet. Cockpit mapping: T-064. Committed lane only;
no merge back, push, live game edit or frame timing.
