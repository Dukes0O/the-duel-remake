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

## Claude's script (3 November 2026)

The challenge stays the bench's own goal (`downforceBench`, LAB-TUNE-VIEW): a run with a wing at
50 mph and one at 100 mph. It passes on the lesson's own fan runs, fed to the bench through
`onChallenge` as Braking's were; the pass opens Wing angle on the Tune page. The recap's button
says "Finish the lesson".

Numbers: every push and drag is `downforceBench.run` (`downforce()` in `benches/tunnel.js`). The
bench's three wings are named for how far they tilt: Flat, Tilted (the bench's `small`) and Steep
(`big`). Push from the steep wing: 56 kg at 50 mph, 225 kg at 100 (four times), 505 kg at 150
(nine times); the tilted wing gives half: 40 kg at 60 mph, 162 kg at 120, 55 kg at 70, 112 kg at
100. Drag on the rope at 100 mph: 81 kg flat (the car's body alone), 101 kg tilted, 122 kg steep.
Top speed: the bench's car is the Falcone F42 (201 mph); with the bench's `topSpeedShare` it
reaches 201 mph flat, 187 mph tilted, 176 mph steep, at any fan speed. The fan dial moves 10 mph a
press (the bench's step), 50 to 150. Question 3 is the Tune page's own line (`effectLine('wing',
2)`): "Grip at 100 mph +6%, more at higher speed; top speed -2%." The Tune page's steps are
smaller than the bench's race wings; both trade the same way.

**The board.** The wind tunnel in the steel workshop look. Top left: the fan on the left blowing
smoke lines right; the Falcone F42 facing into the wind on a weighing plate, a wing on a stand
over its back; a rope from its nose to a post with a gauge that reads the drag. The smoke bends up
behind a tilted wing. A green arrow down from the wing sized to the push, an orange arrow back
sized to the drag. The scale reads the car's 1,250 kg plus the push. Top right: the fan dial (↑
and ↓, or a click) and the wing panel (← flatter, → steeper, or a click), each showing its
value. Bottom: the runs table (fan, wing, push, drag, top speed) and, in Brian's job, the course
card and a bend the car drives round (holding its line, or sliding wide). Space runs the fan.
This replaces the old 3D tunnel whose wing started flat for "keep the wing steep", whose held
arrow showed "73.4666 mph", and whose third try was met before it began.

| Step | Brian says | The player does | Wrong move, and why |
| --- | --- | --- | --- |
| Wonder | The car stands on the scale: 1,250 kg. The fan comes on at 100 mph and the scale climbs to 1,475 kg. Nothing touched it: where did 225 kg come from? | Watches (R replays). | |
| Wing | A wing is a shaped blade that turns the air. Tilt it steep. | → twice: the smoke behind it bends up. "It throws the air up, so the air pushes it down: a plane's wing the other way up." | |
| Downforce | Downforce is air pushing the car down onto the road. Run the fan at 50 mph. | Space: the scale reads +56 kg. Pressed harder onto the road, the tyres grip harder. | |
| Drag | Drag is air pushing back and slowing the car. The rope holds it against the wind. | Space: the rope's gauge reads 30 kg. | |
| Watch | (voice `lab.brian.downforce.intro`) | The fan runs 50, 100, 150 mph with the steep wing: 56, 225, 505 kg; the drag grows the same way. Slow motion, Watch again. | |
| Try: twice the speed | The tilted wing pushes 40 kg at 60 mph. Turn the fan to 120 mph, twice as fast, then guess the push. | ↑ to 120, Space, a guess (about 81, 162, 323 kg); the scale reads 162 kg. | "Twice": "four times, not twice: 4 × 40 kg." "Eight times": "four times, not eight." Space at another speed: "This try is at 120 mph: press ↑ until the dial reads 120." |
| Try: the cost | Fan at 100 mph. Which wing keeps the most top speed? | Guess (Flat, Tilted, Steep), then runs all three: 81, 101, 122 kg drag; 201, 187, 176 mph. | Steep: "It pushes most, 225 kg, but drags most: 122 kg, so only 176 mph. Flat drags least, the body alone, and keeps 201." Tilted: the same with its numbers. The same wing twice: "You have run that wing: press ← or → for another." |
| On your own: Brian's job | Three courses. Brian sets the fan to each one's speed; pick the least wing that holds, since every bit of wing costs top speed. 1: a 100 mph bend needs 100 kg of push. 2: a 70 mph bend needs 100 kg. 3: one long straight, no bends. | Tilted (112 kg), Steep (110 kg), Flat (201 mph). | Too little: "At 70 mph the tilted wing pushes 55 kg; the bend needs 100: the car slides wide. Steeper: press →." Too much: "It holds with 225 kg, but the tilted wing does it with 112 and keeps 187 mph, not 176. Flatter: press ←." The straight with a wing: "No bend needs push here, and the tilted wing costs top speed: 187 mph, not 201." That course again. |
| Question 1 | From 50 to 150 mph, three times as fast: how much more push? | Three, six, nine times. | "56 kg at 50 mph, 505 kg at 150: nine times. Three times the speed, three times three the push." |
| Question 2 | The steep wing on: in which bend does it push hardest? | The 50 mph hairpin, the 100 mph bend, the 150 mph sweeper. | "At 50 mph it pushes only 56 kg; at 150 mph, 505 kg. A wing helps most in the fastest bends." |
| Question 3 | On the Tune page, Wing angle two steps toward More wing: what happens in a race? | Grips 6% more in a 100 mph corner (more when faster) but 2% less top speed; faster everywhere; nothing. | The Tune page's own line. "Faster everywhere": the drag costs top speed on the straights. |
| Recap | Twice the speed, four times the push; a wing drags, so top speed falls; choose for the track (voice `lab.brian.downforce.explain`). | Three key ideas; Enter finishes the lesson and opens Wing angle on the Tune page. | |

Help on every step climbs from a nudge, to the plain step, to Brian's pointer on the dial, the
wing or the fan; Show me turns, tilts and runs for the player. The notebook keeps the old words
under their ids (`downforce-word-0` Wing, `downforce-word-1` Downforce, `downforce-word-2` Drag).

**Checks** (before code): `tools/test-lab-classroom-downforce.mjs` (every number is
`downforceBench.run`'s; a child who follows each prompt passes; each wrong guess and run says why
with the real numbers; help climbs to Show me; the lesson's runs pass the bench's goal); the browser
scenario `tools/scenarios/lab-classroom-downforce.mjs` plays the lesson by keyboard, with one click
on the wing panel, to the pass and the Wing angle row on the Tune page. Lane tier, build, every
`tools/test-lab-*.mjs` and the Lab scenarios. The old Downforce lesson, its 3D drawing and its part
of the tunnel suite and scenario go in this card.
