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

## Codex final script (Director review pending)

The numbers come from `suspensionBench.run({spring, road})` in
`src/lab/benches/tunnel.js`, which is also used by the unchanged challenge.
The four runs read: soft/bumpy, 4.09 m/s? body shake and 6.5? body roll;
stiff/bumpy, 4.77 m/s? and 2.2?; soft/smooth, 0.22 m/s? and 6.5?;
stiff/smooth, 0.27 m/s? and 2.2?. Tyre contact is 87.87% and 93.12% on
the bumpy road and 100% on either spring on the smooth road.

1. **Wonder.** Brian shows the wheel crossing the shaker rig while the body
   moves above it. He says the car leans outward in a bend and asks the learner
   to watch the wheel and body. No measurement or prediction is given yet.
2. **Spring.** Brian defines a spring as a coil between the wheel and car body.
   It compresses when they move closer and stretches when they move apart.
3. **Spring stiffness.** Brian defines stiffness as how strongly a spring
   resists compression or stretch. A stiffer spring moves less under the same
   force. It can reduce sideways lean in a turn, but it sends more bump motion
   into the body and can make this car less comfortable.
4. **Weight transfer.** Brian defines a corner as a bend in the road, then
   explains that turning changes how the tyres share the car's load: the
   outside tyres carry more and the inside tyres carry less. The car body
   leans outward as the suspension moves by different amounts on each side.
5. **Body roll.** Brian names that sideways angle body roll and defines degrees
   (?) as its unit. In a turn the outside spring compresses while the inside
   spring extends, until the forces balance.
6. **Body shake.** Brian defines body shake as the root mean square of the
   body's up-and-down acceleration over a 20-second run. Acceleration describes
   how quickly speed or direction changes. The unit m/s? means metres per
   second squared.
7. **Formula.** Show the root-mean-square rule and the model roll rule. The
   worked roll example uses the displayed values 1,300 kg, 0.8 g, 9.81 m/s?,
   0.5 m, 40,000 N/m and 1.5 m track: `atan(5101.20 ? 90000.00) = 3.25?`.
   This intermediate spring stiffness does not reveal either answer to the
   next predictions. The model uses 0.8 g; the shaker rig supplies body-shake
   readings.
8. **Prediction: bumps.** Ask which spring gives less body shake on the same
   bumps. The cards show the real readings (soft 4.09 m/s?, stiff 4.77 m/s?,
   or equal). Keep the panel's worked sums and measured values hidden until the
   learner answers. Explain the choice with these two readings.
9. **Prediction: body roll.** Ask which spring gives the smaller roll angle in
   this model bend. The choices are soft 6.5?, stiff 2.2?, or equal. Keep the
   panel's worked sum hidden until the learner answers, then explain the result
   with both measured angles.
10. **Watch.** Brian changes through the four spring and road settings. The car
    visibly tilts by the model's roll angle, the springs compress and extend,
    and the panel changes with the live setting. He explains the real bump
    readings and roll trade-off after the demonstration.
11. **Free test.** Let the learner choose spring and road and record three
    different pairs. Keep each measured shake, roll and tyre-contact reading
    in the results table. A repeated pair does not count.
12. **On your own.** Ask the learner to find a setup below 3? body roll. The
    live formula and result follow the selected spring. Show me sets a stiff
    spring on the smooth road and runs it, reaching 2.2?.
13. **Three checks.** Ask what spring stiffness changes, where weight transfers
    in a corner, and what happens to roll when spring stiffness increases.
    Each wrong answer explains the rule in a whole sentence.
14. **Recap.** Show recap cards for the spring trade-off (4.09 and 4.77 m/s? on
    bumps), weight transfer, and stiffness (6.5? soft, 2.2? stiff). Brian says
    the unchanged challenge records all four spring-road pairs.

The challenge card asks the learner to compare both springs on both roads.
The pass condition, reward and save remain unchanged. Its classroom route feeds
all four original spring-road attempts to `onChallenge`.

