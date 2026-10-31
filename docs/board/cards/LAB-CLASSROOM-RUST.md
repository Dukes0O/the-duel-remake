# LAB-CLASSROOM-RUST

The short board entry controls current state, ownership, dependencies and locks.

Rust as a classroom lesson. Rebuild order 12 of 15 (LAB-CLASSROOM section 6);
audit severity 3 of 5 (5 is as broken as the old pendulum).

**What is wrong today** (audit, 31 October 2026): The tries have no goal, so any set-up passes; runs take 20 real seconds; the exhaust story contradicts itself; try 2 says "compare with your last try" with nothing to compare.

**First fix:** Give each try a goal, a week that passes in a few seconds with a day counter, and the last jar kept beside the new one.

Rebuild on the classroom pattern of [LAB-CLASSROOM](LAB-CLASSROOM.md) sections 2 and 3, as
the pendulum was: `src/lab/lessons/rust-classroom.js` (steps and model, no DOM),
`rust-board.js` (the 2D board in the steel workshop look), one line in
`src/lab/classroom/classroom-lessons.js`, behind `lab-classroom`. Every number from the
function the lesson's challenge uses. The challenge, its reward and the save are unchanged.
Claude writes the step script (what Brian says, the set-up, the guesses and the reasons
for each wrong answer) under "Claude's script" here before code.

Checks: in `tools/test-lab-classroom.mjs`, a child who does exactly what each prompt says
passes with one press; each wrong guess says why with the real numbers; help climbs to
Brian's pointer. The `lab-classroom` browser scenario plays this lesson by keyboard alone.
Lane tier and build. The old lesson files go in LAB-CLASSROOM-LIVE.
