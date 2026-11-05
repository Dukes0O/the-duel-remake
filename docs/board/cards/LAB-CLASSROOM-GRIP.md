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

## Codex draft script (Claude to review)

**Number rules.** The rolling-road dial moves from 0 to 12 degrees in half-degree steps.
Each reading comes from `gripBench.run({slideDeg, driver: 'casual'})`. In this game the
tyre reaches its best grip at about 4.297 degrees. At 4 degrees the tyre model returns full
grip; at 4.5 degrees it returns 0.9973779 grip, which is 99.73779% and must be shown as
99%, not rounded to 100%. At 9 degrees it returns 0.9392003 grip, or 94% when rounded.
The challenge asks for one full-grip run at 3 degrees or more and one run after grip has
started to fall. With this dial, 3 and 4 degrees meet the first part; 4.5 degrees meets
the second. The board uses the same tyre result as the challenge.

| Step | Brian says and set-up | Guess, run and explanation |
| --- | --- | --- |
| Wonder | A tyre rolls against a road strip. The rolling road slowly turns the tyre sideways, while a dial marks the angle. Brian asks: What changes as the tyre moves farther sideways? | The words and controls follow. No answer is printed beside the dial yet. |
| Sideways slide | Brian says: A tyre has sideways slide when it moves a little across the road instead of following the direction it points. This dial measures the slide angle in degrees; a degree is one small unit for measuring an angle. | The player turns the dial to 2 degrees. The mark moves on the angle scale. |
| Grip | Brian says: Grip is the tyre's ability to push against the road without sliding farther. The graph shows how much of the tyre's full grip remains at each slide angle. | At 2 degrees the result is 100%. The player presses Run to compare it with the next demonstration. |
| Slip and the limit | Brian says: In this game, slip is the tyre's sideways movement compared with the point where grip is strongest. At slip 1, grip is strongest; after slip 1, the model lowers grip. The angle at that point is about 4.297 degrees. | Brian explains the challenge's target: a full-grip run at 3 degrees or more, then a run where grip has fallen. On the half-degree dial, 3 or 4 degrees meets the first target, and 4.5 degrees is past the limit. The formula panel shows the casual-tyre rule and current grip result, but hides the worked result while a guess is open. |
| Watch the tyre | Brian says: I will test 3, 4, 4.5 and 9 degrees. Watch the blue point and the grip reading as the tyre moves farther sideways. The readings come from the same rolling-road rule used by the challenge. | The board runs 3 degrees: 100%; 4 degrees: 100%; 4.5 degrees: 99%; and 9 degrees: 94%. At 3 degrees the squeal has begun, but the tyre still has full grip. At 4.5 degrees the tyre has crossed the 4.297-degree peak, so the tyre model reports less than full grip. |
| Predict at 4.5 degrees | Brian asks: At 4.5 degrees, does this tyre still have all its grip, or has grip started to fall? The setup is fixed at 4.5 degrees before answer cards appear. | Cards: "The tyre still has 100% grip." / "The tyre has lost some grip." / "The tyre has lost more than 10% of its grip." Only the second is correct. For either wrong card, Brian says: At 4.5 degrees the tyre is about 0.203 degrees past the 4.297-degree peak. The tyre model returns 0.9973779 grip, or 99.73779%, so the board shows 99% and a small loss, not 100% or a loss greater than 10%. |
| Try with help | Brian asks the player to set 4 degrees, predict whether the tyre keeps full grip, choose a picture, and run the test. | Correct: At 4 degrees the tyre model returns 1.0000000 grip, so the tyre keeps all its grip. That is below the 4.297-degree peak. Wrong: The run still returns 1.0000000 grip, or 100%, because 4 degrees is about 0.297 degrees below the peak; the tyre has not crossed the point where this model lowers grip. |
| Test your settings | Brian says: You can change the angle freely and compare three different runs. The formula and graph follow the dial, and the table keeps each result so you can compare before you choose another angle. | The player records three different dial settings. Repeating a setting does not count. At 3 and 4 degrees the tyre model returns 100%; at 4.5 it returns 99%; and at 9 it returns 94%. Only general formulas appear while the player is predicting; a worked result appears after each run. |
| Brian's test | Brian asks: Find one setting with full grip at 3 degrees or more, then one setting where grip has fallen. Set up each angle, predict, then run it. | A changed setting is required for each run. For full grip, 3 or 4 degrees returns 100%. For fallen grip, 4.5 degrees returns 99%. A failure explains the current angle, the tyre model's returned grip, and whether the run meets either part of the target. Completing both runs passes the existing grip challenge. |
| Check | Brian asks which setting shows the first loss of grip among 4, 4.5 and 9 degrees. Each answer is a complete statement. | 4.5 degrees, because the peak is 4.297 degrees and the tyre model returns 99.73779% (shown as 99%). Wrong answers explain all compared settings with the same tyre-model values. |
| Recap | Brian says: This tyre keeps full grip through four degrees, and the game starts lowering grip after about four point three degrees. The Grip challenge asks for full grip at three degrees or more, then a run after grip has started to fall. | The recap picture marks 3 and 4 degrees in the full-grip band, the peak at about 4.297 degrees, and 4.5 degrees just past it. Finish opens the unchanged Grip challenge. |

**Proposed recorded lines.** `lab.brian.grip.intro`: A tyre rolls against a road strip while the dial turns it sideways, and a graph shows how much grip remains. `lab.brian.grip.explain`: This tyre keeps full grip through four degrees, and the game starts lowering grip after about four point three degrees. The Grip challenge asks for full grip at three degrees or more, then a run after grip has started to fall. `lab.brian.grip.pass`: You have found full grip at three degrees or more and found a setting where grip has started to fall.
