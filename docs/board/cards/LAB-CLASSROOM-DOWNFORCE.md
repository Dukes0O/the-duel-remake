# LAB-CLASSROOM-DOWNFORCE

The short board entry controls current state, ownership, dependencies and locks.

Downforce as a classroom lesson. Rebuild order 10 of 15 (LAB-CLASSROOM section 6);
audit severity 3 of 5 (5 is as broken as the old pendulum).

**What is wrong today** (audit, 31 October 2026): "Keep the wing steep" starts flat again; a held arrow shows raw decimals ("73.4666 mph"); try 3 is already met at the start.

**First fix:** Carry settings between tries, round every number, start each try away from its answer.

Rebuild on the classroom pattern of [LAB-CLASSROOM](LAB-CLASSROOM.md) sections 2 and 3, as
the pendulum was: `src/lab/lessons/downforce-classroom.js` (steps and model, no DOM),
`downforce-board.js` (the 2D board in the steel workshop look), one line in
`src/lab/classroom/classroom-lessons.js`, behind `lab-classroom`. Every number from the
function the lesson's challenge uses. The challenge, its reward and the save are unchanged.
Claude writes the step script (what Brian says, the set-up, the guesses and the reasons
for each wrong answer) under "Claude's script" here before code.

Checks: in `tools/test-lab-classroom.mjs`, a child who does exactly what each prompt says
passes with one press; each wrong guess says why with the real numbers; help climbs to
Brian's pointer. The `lab-classroom` browser scenario plays this lesson by keyboard alone.
Lane tier and build. The old lesson files go in LAB-CLASSROOM-LIVE.
If the challenge is a bench run ('inline' from `onChallenge` in `lab-view.js`), feed the
classroom's machine runs to it: the pendulum only needed the flying path, and `lesson-ui.js`
refuses 'inline' with a message until a lesson wires it.
