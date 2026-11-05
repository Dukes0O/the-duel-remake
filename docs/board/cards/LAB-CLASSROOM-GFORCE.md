# LAB-CLASSROOM-GFORCE

The short board entry controls current state, ownership, dependencies and locks.

G-force as a classroom lesson. Rebuild order 13 of 15 (LAB-CLASSROOM section 6);
audit severity 3 of 5 (5 is as broken as the old pendulum).

**What is wrong today** (audit, 31 October 2026): Try 3 is met only by the untouched start, and the radius button only moves the car out.

**First fix:** Two-way speed and radius with the g number live, and a try that needs a change.

Rebuild on the classroom pattern of [LAB-CLASSROOM](LAB-CLASSROOM.md) sections 2 and 3, as
the pendulum was: `src/lab/lessons/gforce-classroom.js` (steps and model, no DOM),
`gforce-board.js` (the 2D board in the steel workshop look), one line in
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

## Codex draft script (Claude to review)

All speed labels below use km/h (kilometres per hour). The lesson defines m/s
(metres per second), m (metres), s (seconds), m/s² (metres per second squared),
and g (a unit equal to Earth's gravitational acceleration, 9.81 m/s²) before
using them in a formula. The game's bench function is `lateralG(speed, radius)`:
it converts the bench speed to m/s, squares that speed, divides by radius in m,
then divides by 9.81 m/s². The board uses the bench's existing settings but
labels speed in km/h. Display values are rounded to one decimal place; meter
values are rounded to two decimal places.

| Step | Brian says and set-up | Question, correct answer, and why each other answer is wrong |
| --- | --- | --- |
| Wonder: Why does the weight lean? | Brian shows the car fixed to a turning arm, a hanging cord, and a large meter. The initial setting is 64.4 km/h on a 50 m radius; the bench meter reads 0.65 g. Brian says: “The car is moving around a bend, and the cord leans away from the middle of the turn. The meter measures sideways acceleration in g. One g equals Earth's gravitational acceleration near the ground. Which change will make the meter reading larger: going faster, taking a wider bend, or both?” | “Which single change makes the meter reading larger while the other setting stays fixed?” Answers: “A higher speed makes the reading larger.” Correct: doubling speed to 128.7 km/h at 50 m changes 0.65 g to 2.61 g. “A wider bend makes the reading larger.” Wrong: doubling radius to 100 m at 64.4 km/h changes 0.65 g to 0.33 g because radius is the divisor. “Neither change affects the reading.” Wrong: the two changes give 2.61 g and 0.33 g, respectively. |
| Words: G-force and radius | Brian says: “G-force is the sideways acceleration a driver feels while a car turns. Acceleration is how quickly velocity changes, and velocity is speed in a direction. Radius is the distance from the centre of a circular turn to the car. In this game, G-force in g equals speed in m/s squared, divided by radius in m, then divided by 9.81 m/s².” He points along the 50 m arm from its centre to the car. | “At 64.4 km/h, what happens when the radius grows from 50 m to 100 m?” “It halves, from 0.65 g to 0.33 g.” Correct: the rule divides by radius. “It doubles, from 0.65 g to 1.30 g.” Wrong: a larger divisor lowers the result. “It stays at 0.65 g.” Wrong: changing the divisor from 50 to 100 m halves the result. |
| Words: speed units | Brian says: “Kilometres per hour, written km/h, measures distance in kilometres during each hour. Metres per second, written m/s, measures distance in metres during each second. One kilometre is 1,000 m and one hour is 3,600 s, so divide km/h by 3.6 to get m/s.” The panel shows 64.4 km/h, its unrounded bench equivalent, and the live result. | The question asks: “What operation changes km/h to m/s?” “Divide by 3.6.” Correct, because 1,000 divided by 3,600 is 1 divided by 3.6. “Multiply by 3.6.” Wrong: that converts m/s to km/h. “Divide by 1,000.” Wrong: that changes kilometres to metres but does not account for the 3,600 seconds in an hour. |
| Watch: speed and radius | Brian holds radius at 50 m and doubles speed from 64.4 to 128.7 km/h, then restores the speed and doubles radius to 100 m. The arm, cord, meter, and formula update together. Brian says: “Speed is squared in this game's rule. Doubling speed makes the reading four times as large, from 0.65 g to 2.61 g. Doubling radius makes the reading half as large, from 0.65 g to 0.33 g.” | “If speed doubles and radius stays at 50 m, what happens?” “The reading becomes four times as large, reaching 2.61 g.” Correct: the squared speed term is multiplied by four. “It becomes twice as large, reaching 1.30 g.” Wrong: that does not account for speed being squared. “It stays at 0.65 g.” Wrong: the changed speed changes the squared term. |
| Guided try 1: faster | Brian sets the reference to 64.4 km/h and 50 m and points to the speed control. The prompt says: “Keep the radius at 50 m. Raise the speed to 128.7 km/h, predict the meter, then run the turn.” | Correct: “The meter reaches 2.61 g, four times the 0.65 g reference.” Wrong: “It reaches 1.30 g.” Brian says: “The speed is squared, so doubling it multiplies 0.65 g by four, giving 2.61 g.” Wrong: “It stays at 0.65 g.” Brian says: “The radius stayed fixed, but the speed doubled. The squared speed makes the meter rise to 2.61 g.” |
| Guided try 2: tighter | Brian returns the speed to 64.4 km/h. The prompt says: “Shrink the radius to 25 m, predict the meter, then run the turn.” | Correct: “The meter doubles to 1.30 g.” Wrong: “It falls to 0.33 g.” Brian says: “The rule divides by radius. Halving the divisor doubles the result, so the meter reads 1.30 g.” Wrong: “It reaches 2.61 g.” Brian says: “The speed did not change. Halving the radius doubles the reading; doubling speed would make it four times as large.” |
| Free test: Test your own settings | Both controls are unlocked, and a result table keeps distinct settings and their meter readings. The formula appears before each run and follows every control change. Brian says: “Choose a speed and radius, read the formula, and predict the meter. Run the turn, then change at least one setting for each of two more runs. The table will compare your three different settings.” Only three distinct completed runs open Continue; the unchanged starting setting and duplicate pairs do not count. | There is no fixed answer. Each recorded result comes from `lateralG`, the same function used by the G-force bench. |
| Check 1 | “At the same 50 m radius, which speed gives the larger reading: 32.2 km/h or 64.4 km/h?” | “64.4 km/h gives the larger reading.” Correct: it gives 0.65 g, while half speed gives 0.16 g. “32.2 km/h gives the larger reading.” Wrong: 0.16 g is below 0.65 g because speed is squared. “They give the same reading.” Wrong: halving speed quarters the reading. |
| Check 2 | “At 64.4 km/h, which radius gives the larger reading: 25 m or 100 m?” | “25 m gives the larger reading.” Correct: 1.30 g is above 0.33 g because the rule divides by radius. “100 m gives the larger reading.” Wrong: 100 m gives 0.33 g and 25 m gives 1.30 g. “They give the same reading.” Wrong: the divisor changes from 25 to 100 m. |
| Check 3 | “Which statement matches the game's rule?” | “The reading rises with the square of speed and falls as radius grows.” Correct. “The reading rises in direct proportion to speed and radius.” Wrong: speed is squared, and radius is the divisor. “The reading falls as speed rises and radius shrinks.” Wrong: both changes raise the result. |
| Recap and game challenge | Brian says: “The game squares speed and divides by turn radius and Earth's gravitational acceleration. Doubling speed gives four times the reading, while doubling radius halves it. In the driving challenge, reach at least 2 g in three different corners without leaving the road. Passing still opens the G-meter and racing seat.” The recap repeats the three rules in complete sentences. | The challenge remains the existing lap challenge. Its goal, reward, completion state, and save and notebook identifiers stay unchanged. |

The meter values above are rounded summaries of the existing bench function,
not new physics. The implementation must derive every result from that function;
no separate classroom approximation may decide whether a guess or run passes.
