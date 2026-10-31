# LAB-CLASSROOM-SUSPENSION

The short board entry controls current state, ownership, dependencies and locks.

Suspension as a classroom lesson. Rebuild order 15 of 15 (LAB-CLASSROOM section 6);
audit severity 2 of 5 (5 is as broken as the old pendulum).

**What is wrong today** (audit, 31 October 2026): Works. The challenge accepts either spring though it says "the other spring", and the answers say "lean" instead of the taught "body roll".

**First fix:** Use the taught words and make the challenge ask for what it says.

Rebuild on the classroom pattern of [LAB-CLASSROOM](LAB-CLASSROOM.md) sections 2 and 3, as
the pendulum was: `src/lab/lessons/suspension-classroom.js` (steps and model, no DOM),
`suspension-board.js` (the 2D board in the steel workshop look), one line in
`src/lab/classroom/classroom-lessons.js`, behind `lab-classroom`. Every number from the
function the lesson's challenge uses. The challenge, its reward and the save are unchanged.
Claude writes the step script (what Brian says, the set-up, the guesses and the reasons
for each wrong answer) under "Claude's script" here before code.

Checks: in `tools/test-lab-classroom.mjs`, a child who does exactly what each prompt says
passes with one press; each wrong guess says why with the real numbers; help climbs to
Brian's pointer. The `lab-classroom` browser scenario plays this lesson by keyboard alone.
Lane tier and build. The old lesson files go in LAB-CLASSROOM-LIVE.
