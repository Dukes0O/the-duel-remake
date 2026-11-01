# LAB-CLASSROOM-PROJECTILE

The short board entry controls current state, ownership, dependencies and locks.

Projectile motion as a classroom lesson. Rebuild order 2 of 15 (LAB-CLASSROOM section 6);
audit severity 5 of 5 (5 is as broken as the old pendulum).

**What is wrong today** (audit, 31 October 2026): The flag starts at 24 m but the water lands at 10 m; the flag button only adds 1 m and wraps at 80 m, so it takes 66 presses. The landing mark the prompt and hint name is never drawn, and the speed crank stops at 18 m.

**First fix:** Drag the flag on the sand to where you think it lands, then drop; draw the landing mark and the fall path each time.

Rebuild on the classroom pattern of [LAB-CLASSROOM](LAB-CLASSROOM.md) sections 2 and 3, as
the pendulum was: `src/lab/lessons/projectile-classroom.js` (steps and model, no DOM),
`projectile-board.js` (the 2D board in the steel workshop look), one line in
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

## Claude's script (1 November 2026)

Numbers, all from the bucket's own water parcels (`waterTrace` in `benches/projectile.js`, which
steps `stepBucket`, the same parcels the challenge's buoys are hit by) and, for the stone, the same
fall with no air. From 30 m up, water lands 6 m ahead at 5 m/s, 10 m at 10 m/s, 13 m at 15 m/s and
15 m at 20 m/s; from 10 m up at 10 m/s, 9 m. A stone from 30 m lands 25 m ahead at 10 m/s and
49 m at 20 m/s, and falls 5 m in its first second and 20 m in two. Water never falls faster than
9 m/s. Speeds are in m/s, the unit beside knots on the helicopter's own airspeed readout.

**The board.** Kestrel One side on over the lake, a bucket (or a stone) on her hook, a ruler on
the water in metres from the let-go post. She waits at the left; Space sets her off, and she
reaches her full speed at the post. Every drop leaves its path and a landing mark with its
distance, so the last tries stay on the board to compare. The let-go key is Space (H is Help in
the Lab); Brian says H pours in the helicopter. This replaces the old drop tower, whose flag
needed 66 presses and whose landing mark was never drawn.

| Step | Brian says | The player does | Wrong move, and why |
| --- | --- | --- | --- |
| Wonder | She let go of the water right over the buoy, and it splashed 13 m past it. Why? | Watches (R replays). | |
| Gravity | Gravity is the Earth's pull that makes things fall, faster every second. | Space: she lets go of a stone while hovering; the marks show 5 m after 1 s, 20 m after 2 s. | |
| Forward speed | How fast she moves along when she lets go: 10 m/s is 10 metres every second. | Space: the stone stays right under her as it falls and lands 25 m ahead. | |
| Arc | The curved path a falling thing follows. Twice as fast now. | Space at 20 m/s: a longer arc, 49 m, beside the faint 25 m one. | |
| A stone and water | Brian lets both go at 10 m/s: the stone lands 25 m ahead, the water 10 m. Air slows the spray. | Watches; a table fills in. Slow motion and Watch again. | |
| Slow, medium, fast | Three helicopters let go over the post at the same moment, at 5, 10 and 20 m/s: 6, 10 and 15 m, and all hit the water at nearly the same moment. | Watches. | |
| Try: where will it land? | 15 m/s this time. Put the flag where the water will land. | Moves the flag (← and →, or drag it on the water), then Space. Within 2 m is right. | Short of it: "it carries on forward further than that, between the 10 m at 10 m/s and the 15 m at 20 m/s". Past it: "air slows the spray, so it lands short of where a stone would". |
| Try: low or high? | From 10 m up or 30 m up, both at 10 m/s: much further, about the same, or shorter? | Picks a card, then Space lets both go. | "Air takes the spray's forward speed away in the first second or two, then it falls nearly straight down: 9 m from 10 m up, 10 m from 30 m up. Height hardly changes it; speed does." |
| On your own: Brian's job | Hit the buoy at 10 m/s. | Space to fly, Space again to let go. Passes when the splash is inside the buoy's 3 m ring. | Let go over or past it: "the water keeps her forward speed and lands 10 m ahead, so it splashed X m past. Let go 10 m before the buoy." Too late or too early by a little: the metres before the buoy, the miss, and "a little sooner" or "a little later". Flew past without letting go: "press Space to go round again". |
| Question 1 | At 10 m/s she lets go right over the buoy. Where does the water land? | Short, on, or past the buoy. | "The water keeps her forward speed, so it lands 10 m past the buoy." |
| Question 2 | Twice as fast, 20 m/s. Where does she let go? | Further before, the same place, closer. | "At 20 m/s the water lands 15 m ahead, not 10 m, so she lets go 15 m before the buoy: further back." |
| Question 3 | In the game, what hits the buoys? | Pour right over it, start pouring before it, fly very high. | Over it: "the water carries on forward and splashes past". High: "height hardly changes where water lands". |
| Recap | A dropped thing keeps its forward speed and lands ahead; it falls faster every second; air slows water more than a stone (voice line `lab.brian.projectile.explain`). | Three key ideas; Enter starts the game challenge with the key idea card. | |

Help on every step climbs from a nudge, to the plain step, to Brian's pointer on the control; on
the job, Show me flies the run and lets go 10 m before the buoy. The key idea card in the game:
"Let go before the buoy. The water keeps your forward speed: hold H to pour before you reach it."
The intro voice line (`lab.brian.projectile.intro`, "pick a height and a forward speed") no
longer fits a step and is not played; it stays in the line list for now.

**Checks** (before code): `tools/test-lab-classroom-projectile.mjs` (a child who follows each prompt
passes with one press; each wrong guess and each miss says why with the real numbers; help climbs
to Brian's pointer and Show me hits the buoy; the numbers come from the bucket's own parcels); the
browser scenario `tools/scenarios/lab-classroom-projectile.mjs` plays the lesson by keyboard, with
one mouse drag of the flag, to the helicopter challenge; every `tools/test-lab-*.mjs`, the Lab
scenarios, the lane tier and the build.
