# LAB-CLASSROOM-LIFT

The short board entry controls current state, ownership, dependencies and locks.

Lift and weight as a classroom lesson. Rebuild order 1 of 15 (LAB-CLASSROOM section 6);
audit severity 4 of 5 (5 is as broken as the old pendulum).

**What is wrong today** (audit, 31 October 2026): The hover window is only 1.5% of the weight either way: a held arrow crosses it in a few hundredths of a second and a drag in about two pixels. The kg labels stay hidden for the whole try, and the first fuel press empties a full tank.

**First fix:** Let the player load the pad with things they can see weighed, and make hover a band they can find (the lever slows near it), with the lift and weight numbers on screen the whole time.

Rebuild on the classroom pattern of [LAB-CLASSROOM](LAB-CLASSROOM.md) sections 2 and 3, as
the pendulum was: `src/lab/lessons/lift-classroom.js` (steps and model, no DOM),
`lift-board.js` (the 2D board in the steel workshop look), one line in
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

## Claude's script (31 October 2026)

Numbers, all from `padForces` with a full tank (the helicopter's own `heliMass` and
`availableThrust`, which the challenge flies on): Kestrel One with pilot and full tank 1,630 kg;
the Dusthawk 1,280 kg; a crate 500 kg; the most her rotor can push near the ground 3,887 kg.
The Dusthawk and one crate (3,410 kg) can be lifted; the Dusthawk and two crates (3,910 kg) are
23 kg too heavy.

**The lever.** The collective is a lever on the left of the board with a kilogram scale. It moves
a notch at a time (a notch is 500 kg of lift, one crate's worth), with a notch on the red line
(her weight) and one at the top stop (3,887 kg). W or ↑ raises it, S or ↓ lowers it, the same
keys as the helicopter. A held key stops on the red line; a fresh press goes past it. A drag
moves it anywhere and clicks onto the red line within 150 kg. This replaces the old hover window
of 1.5% that a held arrow crossed in a few hundredths of a second. Lift, weight, the two arrows
side by side and what the weighing pad feels (weight less lift) stay on screen in every step
that uses them.

**Picture.** Kestrel One on a steel weighing pad. With a load, the load sits on the pad and she
lifts herself first to take up the cable; the load leaves the pad only when lift reaches the
whole weight. Less than that and the cable is tight but the load stays down.

| Step | Brian says | The player does | Wrong move, and why |
| --- | --- | --- | --- |
| Wonder | Lever all the way up, the load will not leave the ground; a crate comes off and up she goes. Why? | Watches (R replays). | |
| Weight | Weight is how hard the Earth pulls something down, in kilograms; she weighs 1,630 kg. | Puts a crate on the pad (1 or click): the dial goes to 2,130 kg. | |
| Lift | The rotor's blades throw air down and the air pushes her up; that push is lift, in kilograms too. | Starts the rotor (Space or click): 500 kg of lift, the pad feels 1,130 kg. | |
| Collective | The lever by the pilot's left hand; up means more lift; W and S in the helicopter. | One press of W to the 1,000 kg mark. | |
| Hover | Staying still in the air: lift exactly as big as weight; the red line is her weight. | One press of W onto the red line: she hovers. | Past the line: "2,030 kg of lift is more than her 1,630 kg, so she climbs. Bring the lever back down to the red line." |
| Less, the same, more | Brian works the lever: 1,000 kg stays down, 1,630 kg hovers, 2,500 kg climbs, back to 1,630 kg holds still, 1,000 kg sinks. | Watches; a table fills in. Slow motion and Watch again. | |
| Three loads | The Dusthawk (2,910 kg) and the Dusthawk with a crate (3,410 kg) hover; with two crates (3,910 kg) the lever goes to the top and the load stays down. | Watches. | |
| Try: the Dusthawk | Hook it (3 or click); "2,910 kg against the most lift 3,887 kg: can she lift it?" | Hooks, guesses Yes or No, holds W to the red line. | Guessed No: "She can lift it: 2,910 kg is less than the 3,887 kg her rotor can push, so there is lift to spare." A crate added: "Just the Dusthawk this time." |
| Try: two more crates | Add two crates (1 twice); "3,910 kg against 3,887 kg: can she lift it?" | Adds, guesses, holds W to the top. | Guessed Yes: "Even with the lever at the top she pushes 3,887 kg, and the load weighs 3,910 kg: 23 kg too heavy, so it stays down." Unhooking the car: "Keep the Dusthawk on the hook." |
| On your own: Brian's job | Lift the Dusthawk with as many crates as she can carry, then hover. | Loads crates (1 adds, 2 takes off), then the lever. Passes only with one crate, hovering. | No crate: "She hovers with 2,910 kg, and she can push 3,887 kg: room for 977 kg more. A crate is 500 kg." Two or more: "3,910 kg is 23 kg more than the 3,887 kg she can push, so the load stays down. Take a crate off with 2." |
| Question 1 | Which stays on the ground even at full lever: the Dusthawk, three crates, or the Dusthawk and two crates? | Picks a card. | Each wrong card says its own weight and that it is under 3,887 kg. |
| Question 2 | Hovering with the Dusthawk, a little more lever: climbs, stays still or sinks? | Picks; the board then shows her climb. | "More lever makes more lift. With more lift than weight, she climbs." |
| Question 3 | In the game you hold the Dusthawk 2 to 5 m up: keep the lever at the top, ease it back until she holds still, or push it down? | Picks; the board shows her holding in the band. | Top: "she keeps climbing out of the band"; down: "she drops the car back on the ground". |
| Recap | To hover, the rotor has to push as hard as the Earth pulls her down; every rotor has a most it can give (voice line `lab.brian.lift.explain`). | Three key ideas; Enter starts the game challenge with the key idea card. | |

Help on every step climbs from a nudge, to the plain step, to Brian's pointer pressing the exact
control (the crates, the car, the rotor, the red line or the top stop). The key idea card in the
game: "Lift must match weight. Once the car is up, ease back on S until she holds still."

**Checks** (before code): `tools/test-lab-classroom-lift.mjs` (a child who follows each prompt
passes with one press or one held key; each wrong guess says why with the real numbers; help climbs
to Brian's pointer and his press; the numbers come from the flight rules); the browser scenario
`tools/scenarios/lab-classroom-lift.mjs` plays the lesson by keyboard alone to the helicopter
challenge; every `tools/test-lab-*.mjs`, the Lab scenarios, the lane tier and the build.
