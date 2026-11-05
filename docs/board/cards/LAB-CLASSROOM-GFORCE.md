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

## Codex final script (Claude to review)

**Number rules.** The dial shows km/h and the formula converts that rounded value to m/s by dividing by 3.6. The arm shows radius in metres. The rule is G-force (g) = (speed in m/s)^2 / radius in m / 9.81 m/s^2. The worked sum rounds the displayed km/h first, then rounds m/s to two decimals. It says about because the meter uses the underlying setting and the rounded sum can differ slightly. One g is the rate at which a dropped stone speeds up near the ground, about 9.81 m/s^2.

| Step | Brian says and set-up | Question or result |
| --- | --- | --- |
| Wonder | A car on an arm goes around a marked circle with a cord hanging from it and a meter showing the reading. The words come next. | Brian then asks: Which change could make the meter show a larger reading? |
| Speed | Speed is distance travelled during a set time. The dial shows kilometres per hour, written km/h. The formula uses metres per second, written m/s, which counts metres travelled each second. Divide km/h by 3.6 because a kilometre has 1,000 metres and an hour has 3,600 seconds. | Set the dial to 64.4 km/h. The control stays usable after the step. |
| Radius | Radius is the distance from the centre of a circular turn to the car. The arm marks this distance. | Set the arm to 50 m. |
| Velocity and acceleration | Velocity is speed in a direction, and acceleration is how quickly velocity changes. Metres per second squared, written m/s^2, means a speed change measured in m/s during each second. A turning car changes direction, so its velocity changes even when its speed stays the same. | No new assertion. |
| One g | G-force compares the car's sideways acceleration with one g. One g is the rate at which a dropped stone speeds up near the ground, about 9.81 m/s^2. | The WORDS entry uses the same definition. |
| Formula | In this game, the rule squares the speed in m/s and divides by the radius in m to get sideways acceleration in m/s^2. The rule then divides by 9.81 m/s^2 to count the reading in g. | At 64.4 km/h: 64.4 km/h / 3.6 = 17.89 m/s; (17.89 m/s)^2 / 50 m / 9.81 m/s^2 = about 0.65 g. |
| Watch | I will raise the speed from 64.4 to 128.7 km/h while the radius stays at 50 m; then I will restore the speed and widen the radius to 100 m. Watch the cord, arrow, meter and formula as I change one setting at a time. | Tick changes the live speed and radius. The board, cord, arrow, meter and formula follow each value. |
| Faster try | Predict, then set 96.6 km/h at 50 m. | Right: about 1.47 g, about 2.25 times 0.65 g, because 96.6 / 64.4 = 1.5 and 1.5 x 1.5 = 2.25. Wrong: state those same readings and show the 1.5 x 1.5 reason. |
| Wider try | Predict, then keep 64.4 km/h and set 75 m. | Right: about 0.43 g, two thirds of 0.65 g, because 50 / 75 = 2 / 3. Wrong: say that 75 m is one and a half times 50 m, so the reading is two thirds as large. |
| Free test | You can change speed and radius freely, and the formula follows every change so you can predict before pressing Space. The table keeps three different settings and their readings. | Three distinct settings are recorded. The table and formula use the same displayed values. |
| Brian's job | I will start at 64.4 km/h and 50 m. Change at least one setting, predict from the formula, and press Space to run the turn. Reach 2 g or more. | A changed setting must reach the existing 2 g target. |
| Checks | Each answer gives the meter readings and explains the square-speed or divide-by-radius rule in a full sentence. | The corrected speed answer begins: That is right. At 64.4 km/h the meter reads... The radius answer says: A larger radius is a larger number to divide by, so the reading falls. |
| Recap | A turning car keeps changing direction, so it needs a sideways push that the driver feels. In this game, the reading rises with the square of speed and falls as radius grows. The G-force lap asks you to reach at least 2 g in three different corners without leaving the road. | Finish opens the G-force lap challenge. |

**Proposed Brian voice lines.** Intro: A car on an arm goes around a marked circle with a cord hanging from it and a meter showing the reading. The words come next. Closing question: Which change could make the meter show a larger reading? Explain: A turning car keeps changing direction, so it needs a sideways push that the driver feels. In this game, the rule squares the speed and divides by the turn radius. The G-force lap asks you to reach at least 2 g in three different corners without leaving the road. Pass: You have passed G-force. Drive a lap on a course you own and reach 2 g in three different corners without leaving the road.
