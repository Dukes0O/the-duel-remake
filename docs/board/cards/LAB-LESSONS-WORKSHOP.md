# LAB-LESSONS-WORKSHOP

The short board entry controls current state, ownership, dependencies and locks.

Codex. Kyle and Gratian tried Lift and weight and said build the rest
(26 October 2026). Claude wrote each lesson in `docs/LAB.md` section 12.6,
Workshop corner: Strength against weight, Rust, G-force, Headings and maps. Build each one on the lesson frame exactly as
LAB-LIFT-2 built Lift and weight: its words with their own animations, the
wonder moment, the worked example, predictions with pictures, the check, the
hint lines and the challenge card, all in the 3D room with the picture in the
centre of the screen. Kilograms, metres, seconds and mph on screen, never
newtons. Every number read from the function the game uses for that
lesson's challenge (a test proves each prediction's answer matches it). Reuse
the existing bench models; anything new is a Blender recipe. At most three
look rounds for the corner, one sheet per round at
`docs/board/looks/lab-2/lab-lessons-workshop-<round>.jpg`, judged by Claude. The old
bench panel for each rebuilt lesson is removed in the same change. Switch
`lab-2`. Lane tier and build; the Lab browser flow through each lesson.

## Checks and handoff

`tools/test-lab-lessons-workshop.mjs` checks predictions against the existing
bench rules, all teaching stages, help, real model cross-sections and input
bindings. `tools/scenarios/lab-lessons-workshop.mjs` checks the memory-only room
flow, actual machine controls and existing challenge handoffs. Run the lane tier
with jobs 4 and production build after the round-1 sheet. No frame timing.

Design choices, the two existing rule/prose differences, changed assertions,
review findings and results are in `docs/changes/LAB-LESSONS-WORKSHOP.md`.
Claude's round-1 look verdict remains required; this branch does not merge or push.

## For Claude

Judge `docs/board/looks/lab-2/lab-lessons-workshop-1.jpg` and the two rule/prose
differences in the change note. Also review the one-line `roundSheet`
registration in `tools/test-repo-hygiene.mjs`: only this card's required JPG
name for rounds 1–3 is added. All raw-capture checks and size budgets remain.
The new sheet-path check passes; no existing test assertion is removed or changed.
Written review of this classification addition remains open before integration.
