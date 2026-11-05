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

## Codex draft script (Claude to review)

The numbers below come from `suspensionBench.run({spring, road})` in
`src/lab/benches/tunnel.js`, the same function that the suspension challenge
uses. The four results are: soft on bumps, 4.09 m/s² body shake and 6.5° body
roll; stiff on bumps, 4.77 m/s² and 2.2°; soft on smooth road, 0.22 m/s² and
6.5°; stiff on smooth road, 0.27 m/s² and 2.2°. The displays round shake to
two decimals and roll to one decimal. On bumps the tyre-contact shares are
87.87% and 93.12%; on the smooth road both are 100%.

1. **Wonder — The shaker rig.** Brian says, “This rig moves one wheel over a
   rough road while the car body rides above it. Watch the body and the tyre
   contact light; we will name the measurements next.” Show the soft and stiff
   examples briefly, without asking for a prediction yet.
2. **Spring — The coil between wheel and body.** Brian says, “A spring is a
   coil between the wheel and the car body. A soft spring compresses more under
   the same force, while a stiff spring resists that movement.” Point to the
   coil and let the learner select soft or stiff once.
3. **Body shake — A measured motion.** Set soft spring and bumpy road before
   asking. Define a bump as a raised part of the road, measured in metres (m),
   and a second (s) as a unit of time. Brian says, “Body shake is the root mean
   square of the body's up-and-down acceleration during this 20-second run.
   Acceleration is a change in speed or direction over time; metres per second
   squared, written m/s², measures that change.” Show 4.09 m/s² after the
   example run.
4. **First prediction — Which spring shakes less on bumps?** Put the bumpy
   road under the wheel and show the spring control before asking: “On these
   same bumps, which spring gives the smaller body-shake reading?” The answer
   cards name predicted readings, not spring set-ups. Correct choice: soft.
   If the learner picks stiff, Brian says, “The soft spring gives 4.09 m/s² of
   body shake here. The stiff spring gives 4.77 m/s², so that choice shakes
   more in this test.” If the learner picks neither, Brian explains that
   4.09 m/s² is lower than 4.77 m/s².
5. **Body roll — The car tilts in a bend.** Define a bend as a turn in the
   road, and a degree (°) as a unit for an angle. Brian says, “Body roll is
   how far the car body tilts sideways in a bend. This rig calculates that
   angle from the car's mass, its centre height, the bend's sideways force,
   the distance between the wheels, and the spring's stiffness.” Show the
   angle after the word is defined.
6. **Second prediction — Which spring rolls less?** Set the smooth road first,
   then ask: “In this model bend, which spring gives the smaller body-roll
   angle?” Correct choice: stiff. If the learner picks soft, Brian says,
   “The soft spring gives 6.5° of body roll in this model bend. The stiff
   spring gives 2.2°, so the stiff spring rolls less here.” If the learner
   chooses neither, Brian explains that 2.2° is lower than 6.5°.
7. **The trade-off.** Brian says, “The soft spring isolates the body from
   these bumps better, but it allows more body roll in the model bend. The
   stiff spring sends more bump motion into the body, but its higher roll
   stiffness keeps the body flatter.” Show both measured comparisons and say
   tyre contact is similar: 87.87% for soft and 93.12% for stiff on bumps,
   and 100% for both on smooth road. Do not claim that the soft spring
   improves tyre contact.
8. **Free test — Choose the spring and road.** Brian says, “Choose either
   spring and either road, then run the rig. The panel shows the model's
   measurements, and the table keeps three different setting pairs so you
   can compare them.” Let the learner make any three distinct comparisons.
   Repeating a pair does not count. Record a result before describing it.
9. **Review and challenge.** Recap the spring, body shake and body roll with
   labelled pictures. Brian says, “The suspension challenge asks you to
   compare both springs on the rough and smooth roads. The challenge records
   all four comparisons.” This replaces the ambiguous “other spring” wording:
   either spring is a valid first choice, and the challenge still requires
   every spring-road pair.

**Formulas, in teaching order.** Once body shake is defined, show
`body shake = √(Σ(body acceleration²) ÷ number of time samples)` over the
20-second run. Label this as the rig's measured root mean square, not a simple
spring shortcut. Once body roll is defined, show the model rule
`roll angle = atan(mass × 0.8 g × centre height ÷ (spring stiffness × track²))`.
Use the displayed inputs: 1,300 kg, 9.81 m/s², 0.5 m, 0.8, 1.5 m track,
and 20,000 N/m or 60,000 N/m. These give about 6.5° for soft and 2.2° for
stiff. Explain that the game models a 0.8 g corner; the shaker simulation
supplies the body-shake readings. Do not show a result or worked sum that
settles an open prediction before the learner answers.

Checks: in `tools/test-lab-classroom.mjs`, a child who does exactly what each prompt says
passes with one press; each wrong guess says why with the real numbers; help climbs to
Brian's pointer. The `lab-classroom` browser scenario plays this lesson by keyboard alone.
Lane tier and build. The old lesson files go in LAB-CLASSROOM-LIVE.
If the challenge is a bench run ('inline' from `onChallenge` in `lab-view.js`), feed the
classroom's machine runs to it: the pendulum only needed the flying path, and `lesson-ui.js`
refuses 'inline' with a message until a lesson wires it.
