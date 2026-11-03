# LAB-CLASSROOM-ALTITUDE

The short board entry controls current state, ownership, dependencies and locks.

Air and altitude as a classroom lesson. Rebuild order 8 of 15 (LAB-CLASSROOM section 6);
audit severity 3 of 5 (5 is as broken as the old pendulum).

**What is wrong today** (audit, 31 October 2026): The site name is hidden while setting up, and following the guided prompt after predicting turns a right answer wrong.

**First fix:** Set up first, then predict (the classroom order), with the site and its air shown on the stand.

Rebuild on the classroom pattern of [LAB-CLASSROOM](LAB-CLASSROOM.md) sections 2 and 3, as
the pendulum was: `src/lab/lessons/altitude-classroom.js` (steps and model, no DOM),
`altitude-board.js` (the 2D board in the steel workshop look), one line in
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

## Claude's script (3 November 2026)

The challenge stays the flying one (`lab-challenges.js`): a 300 kg crate to Summit Run, landed
with at least 30% of the tank left, refuelling not counted. Its reward (the Altitude tune in the
Lab shop) and the save are unchanged. The recap says "Try it for real in the helicopter", as Lift's
does.

Numbers: every lift is `altitudeBench.run` (the challenge's bench): its `liftKg` is the most the
rotor pushes near the ground at that place, the same figure the Lift lesson uses at sea level.
Sea level 0 m: 3,887 kg. Panorama Ridge 860 m: 3,513 kg (90%). Summit Run 2,860 m: 2,777 kg (71%).
The air in a jar is the bench's `trueShare`: 100, 92 and 75 bits of every 100. Lift falls a little
more than the air (the engine breathes the same thin air), which is what the explain voice calls
the game rounding down to 71%. Kestrel One with her pilot and a full tank weighs 1,630 kg, the
Dusthawk 1,280 kg (2,910 kg together), a crate 500 kg (`lift-pad.js`, as Lift). The lever to
hover is weight over the most lift: 42% at sea, 46% at the Ridge, 59% at the summit. Fuel while
hovering is the flight rule's burn (0.25 kg/s idle plus 0.55 kg/s for every full lever): 28.8 kg a
minute at sea, 34.4 at the summit; with the 300 kg crate 31.4 and 37.9; the lever all the way up
burns 48. The most crates she lifts: 4 at sea, 3 at the Ridge, 2 at the summit.

**The board.** The steel workshop. Left: the mountain side on, Sea level at the foot, Panorama
Ridge part way up and Summit Run at the top, each with its height in metres; a marker shows where
the stand is (↑ and ↓ move it a place, or click a place). Middle: the weighing pad with Kestrel One
and her load, as in Lift. Right: the air jar, a 10 by 10 grid holding the bits of air a jar
scooped here holds, beside a faint sea-level jar of 100; under it Most lift here, Weight, and Lever
to hover. Far left of the pad: the collective lever as a share, 0 to 100% (W and S), the top stop
at 100%, and the red line at the share that hovers her here, which climbs as the stand goes up.
The place name and its air are always on the board (the audit's first fix), and every try sets up
before it asks for a guess.

| Step | Brian says | The player does | Wrong move, and why |
| --- | --- | --- | --- |
| Wonder | Same helicopter, same Dusthawk, lever all the way up. At Sea level she lifts it. At Summit Run it will not leave the ground. What changed? | Watches two pads side by side, sea and summit (R replays). | |
| Altitude | Altitude is how high a place is above the sea. Take her up to Summit Run. | ↑ twice (or a click on Summit Run): 860 m, then 2,860 m. | ↓ at the sea: "Sea level is as low as she goes: 0 m." |
| Air density | How much air is packed into one space. The sea's jar holds 100 bits. | Space scoops a jar up here: 75 bits. | |
| Thin air | Air with less packed in, as it is high up. Start the rotor with the lever all the way up. | Space: she pushes 2,777 kg here, 71% of the 3,887 kg at sea. | |
| Watch | (voice `lab.brian.altitude.intro`) | The stand visits each place with the lever all the way up; a table fills in place, height, air and most lift. Slow motion, Watch again. | |
| Try: the Dusthawk up high | At Sea level she lifts the Dusthawk: 2,910 kg against 3,887. Take her up to Summit Run with it. Will it lift? | ↑ to Summit Run, then a guess (lifts, stays down), then W all the way up: it stays down. | "Lifts": "2,910 kg against the 2,777 kg she can push up here: 133 kg too heavy, so it stays down. The load did not change; the air did." |
| Try: the lever up high | No load. At Sea level the red line, the lever that hovers her, is at 42%. Take her to Summit Run: where will the red line be? | ↑ to Summit Run, a guess (lower, the same, higher), then W up to the red line: 59%, and she hovers. | "Lower" or "the same": "59%: each sweep of the blades throws less air, so she needs more lever just to hover, and more lever burns more fuel: 34.4 kg a minute against 28.8." |
| On your own: Brian's job | Three deliveries, one to each place. Load as many 500 kg crates as she can lift and still hover there, then lift off. | Crates on (1) and off (2), Space lifts off: 4 at sea, 3 at the Ridge, 2 at the summit. | Too many (three at the summit): "3,130 kg is 353 kg more than the 2,777 kg she can push here: take one off." Too few (three at sea): "She hovers with room for 757 kg more; a crate is 500. Add one." |
| Question 1 | Why can she push less at Summit Run? | Thinner air; she is heavier up there; the rotor spins slower. | "Heavier": her weight is 1,630 kg at the sea and on the summit; the air changed, 75 bits in a jar instead of 100. "Slower": the rotor spins as fast; each sweep has less air to throw down. |
| Question 2 | Where can she lift the Dusthawk (2,910 kg with her)? | Only at Sea level; Sea level and Panorama Ridge; all three. | "Only Sea level": the Ridge's 3,513 kg is still more than 2,910. "All three": the summit's 2,777 kg is 133 kg short. |
| Question 3 | In the game you carry a 300 kg crate up to Summit Run and land with 30% of the tank left. What helps? | Fly straight there and land; keep the lever all the way up; fill up at a pump on the way. | "Lever up": the lever all the way up burns 48 kg a minute; use only what she needs. "Pump": refuelling after the crate is on the hook does not count; one tank. |
| Recap | Higher up the air is thinner; thin air, less lift, so plan the load; up high she needs more lever just to hover, so she burns fuel faster (voice `lab.brian.altitude.explain`). | Three key ideas; try it for real in the helicopter. | |

Help on every step climbs from a nudge, to the plain step, to Brian's pointer on the mountain,
the jar, the lever, the crates or the pad; Show me moves, scoops, lifts and loads for the player.
The notebook keeps the old words under their ids (`altitude-altitude` Altitude,
`altitude-thin-air` Thin air, `altitude-air-density` Air density). Checks: a new
`tools/test-lab-classroom-altitude.mjs` (every number from the bench, a child following each prompt
passes, each wrong move says why with the numbers, help climbs to the pointer) and a
`tools/scenarios/lab-classroom-altitude.mjs` keyboard play-through; every `test-lab-*` suite, all
Lab scenarios, lane tier and build. The old `altitude-lesson.js` and `altitude-animation.js` go.
