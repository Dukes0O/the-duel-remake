# LAB-CLASSROOM-GRIP

The short board entry controls current state, ownership, dependencies and locks.

Grip and slip as a classroom lesson. Rebuild order 14 of 15 (LAB-CLASSROOM section 6);
audit severity 2 of 5 (5 is as broken as the old pendulum).

**What is wrong today** (audit, 31 October 2026): At 4.5 degrees the label reads "100% grip" but the result counts as lost grip, and the "3 degrees or more" rule is never stated.

**First fix:** Make the label and the rule agree, and say the target band on screen.

Rebuild on the classroom pattern of [LAB-CLASSROOM](LAB-CLASSROOM.md) sections 2 and 3, as
the pendulum was: `src/lab/lessons/grip-classroom.js` (steps and model, no DOM),
`grip-board.js` (the 2D board in the steel workshop look), one line in
`src/lab/classroom/classroom-lessons.js`, behind `lab-classroom`. Every number from the
function the lesson's challenge uses. The challenge, its reward and the save are unchanged.
The step script is recorded below for Claude to review before code.

Checks: in `tools/test-lab-classroom.mjs`, a child who does exactly what each prompt says
passes with one press; each wrong guess says why with the real numbers; help climbs to
Brian's pointer. The `lab-classroom` browser scenario plays this lesson by keyboard alone.
Lane tier and build. The old lesson files go in LAB-CLASSROOM-LIVE.
If the challenge is a bench run ('inline' from `onChallenge` in `lab-view.js`), feed the
classroom's machine runs to it: the pendulum only needed the flying path, and `lesson-ui.js`
refuses 'inline' with a message until a lesson wires it.

## Codex revised script (4 November 2026)

**Design decision.** Teach the road contact and the driver's experience first. Use slide angle throughout the lesson. Keep the notebook ids `grip`, `slip` and `limit`; define Slip in one plain sentence. The challenge rule, reward and save stay unchanged. Keep the casual driver for the rolling-road lesson, matching `src/lab/benches/tunnel.js` and the casual/pro tyre table in `src/config.js`.

The graph plots unrounded casual grip readings at small angle steps. The board shows the tyre from above on the strip. It draws the direction the tyre points, the direction it travels, and the angle between those arrows. Rubber streaks grow as the tyre slides farther past its best angle. The graph keeps its 90–100% scale; Brian says the loss is small on this game's casual tyres and grows on the slide.

| Step | Brian's words and action |
| --- | --- |
| Wonder | Rubber presses against the road, and that lets the tyre push the car. A tyre needs a little sideways slide to turn. |
| Measure | A tyre points along one direction but travels a little sideways. Slide angle is the angle between those directions. |
| Grip | Grip is the tyre pushing against the road. A small slide lets the tyre push the car around a corner. |
| Best angle | Grip grows as the slide angle grows, up to the best angle. In this game, that is about 4.3 degrees. |
| Past the best angle | Past the best angle, the tyre slides more and pushes less. The driver feels the car start to skid. A corner at the best angle is fastest. |
| Percent | Grip kept as a fraction times 100 gives grip kept as a percent. For example, 0.94 × 100 = 94%. This is the simple part; the exact road rule is in this game. |
| Watch | Before either prediction, test 2, 3, 4 and 12 degrees. At 2, 3 and 4 the tyre keeps 100%; at 12 the grip is lower. Do not reveal the 4.5- or 9-degree prediction results here. |
| Predict at 4.5 | Ask if the grip loss is less than 1% or more than 10%. Hide the graph, marker, reading and worked sum while the guess is open. After the guess and run, show about 99.7% grip and the rounded sum 100% less 99.7% = about 0.3% lost. |
| Predict at 9 | Ask if grip has fallen more or less than at 4.5. After the guess, compare about 93.9% with about 99.7%; the farther slide loses more grip. |
| Free test | Record three different dial settings. Show one decimal place in percentages and a worked percent sum only when rounding the fraction first gives the displayed result. |
| Brian's test | Preserve the existing challenge: find full grip at 3 degrees or more, then run after grip starts to fall. Preserve its reward and save. |
| Three checks | Ask which setting is closest to the best angle, which is the lowest setting past it, and where the tyre should be for the fastest corner. Each has one correct answer. |
| Recap | Restate the road grip, the small slide needed to turn, the best angle, and the driver's skid feeling in short sentences. |

**Recorded lines.** The lesson uses the existing intro and explain audio cues. Brian's on-screen words give the plain language and rounded readings for every step. Preserve the existing pass line and challenge wording contract.

**Assertion changes.** Replace assertions that pinned hidden tyre variables, six-decimal sums, or the old one-question flow with checks for the rounded percent sum, hidden answers while a prediction is open, the two distinct prediction explanations, three check cards, and the unchanged two-run challenge. The challenge goal, run count, distinct free settings, saved reward and profile behavior remain behavior checks; none are loosened.

The parts must only move forward. Put Watch in part 2 before both part 3
predictions. Its live settings and recorded rows are 2, 3, 4 and 12 degrees.
Check that its closing words avoid the 4.5- and 9-degree answers.
