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
Claude's round-2 look verdict remains required; this branch does not merge out or push.

## For Claude

Judge `docs/board/looks/lab-2/lab-lessons-workshop-2.jpg` against the five
picture corrections below. Round-1 logic, rule/prose differences and sheet-path
registration are approved. No existing assertion or tolerance changes in round 2.

## Claude answers — round 1, 26 October

Approved via Kyle's handoff: lesson logic, words, predictions, hints and numbers;
both rule/prose differences (truth wins); the exact sheet-path registration.
No assertion was loosened. Claude corrects LAB.md 12.6. Pictures need round 2:
real named objects, close low three-quarter views, readings beside their objects
(three floating labels at most), thick arrows on the object, unobstructed challenge
cards and loaded worlds. Round 2 is the second of three, not a new first round.

## Round-2 design and checks, before code

Keep the approved packets and rule calculations. Replace visible control cubes
with one Blender-built library of named workshop props; invisible hit skins keep
the existing controls. Use object-anchored readings and stamp the materials and
jar identities onto the models. Show the four jars together in Watch; three
numeric captions compare fresh, salt and zinc while dry air has its stamped name.
Keep the challenge's world camera and use a clear viewport area for its reminder.
Checks: existing workshop truth/model checks plus object/anchor checks; the real
memory-only flow with full-world challenge readiness and non-overlap checks;
round-2 sheet, lane tier (jobs 4), build and independent review. No frame timing.
