# LAB-CLASSROOM-BRAKING

The short board entry controls current state, ownership, dependencies and locks.

Braking as a classroom lesson. Rebuild order 7 of 15 (LAB-CLASSROOM section 6);
audit severity 4 of 5 (5 is as broken as the old pendulum).

**What is wrong today** (audit, 31 October 2026): The starting lever (60% front) already slides; try 2 says "Keep 70%" but starts back at 60%; holding the arrow can never give exactly 100 mph; try 3 passes untouched.

**First fix:** Carry settings between tries, step the speed in clear amounts (50, 75, 100 mph) and start each try away from its answer.

Rebuild on the classroom pattern of [LAB-CLASSROOM](LAB-CLASSROOM.md) sections 2 and 3, as
the pendulum was: `src/lab/lessons/braking-classroom.js` (steps and model, no DOM),
`braking-board.js` (the 2D board in the steel workshop look), one line in
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

## Claude's script (2 November 2026)

The challenge stays the bench's own goal (`brakingBench`, LAB-TUNE-VIEW): a run from 50 mph and a
run from 100 mph. It passes on the lesson's own braking runs, fed to the bench through
`onChallenge` as Fuel's were; the pass opens Brake balance on the Tune page. The recap's button
says "Finish the lesson".

Numbers: every stop is `brakingBench.run` on the bench's car (the Falcone F42), which brakes as the
game does. Stopping distance: 11.8 m from 50 mph, 17.0 m from 60, 23.1 m from 70, 47.2 m from 100
(four times 50's), 67.9 m from 120, 79.7 m from 130. The speed dial moves 10 mph a press (the
bench's own step: 75 mph is not a setting, so the card's "50, 75, 100" becomes 50 and 100). Weight
shift (`frontLoadShare`, at a steady stop): standing, each end carries half; braking, the front
tyres carry 69% and the back 31%. The back slides when its brakes do more of the braking than the
weight left on it: 60% front slides, 70% front stops steady. The brake lever moves 10% a press.

**The board.** The steel workshop. Top: the car close up, side on, with a weighing pad under the
front and the back tyres that reads each end's share of the weight, an arrow on each sized to it;
the back tyre turns red when it locks. Beside it the speed dial (↑ and ↓, 10 mph a press, or a
click) and the brake lever (← toward the back, → toward the front, or a click), each showing its
value. Bottom: the test strip, 80 m long with a mark every 10 m, one to three lanes; a car to
scale arrives at its speed, brakes at the line at real speed and stops, with a tape giving the
metres; a sliding back swings out with skid marks. Space brakes. This replaces the old speed dial
(held arrows, so 100 mph could not be hit exactly) and the lever that started at 60%, a setting
that slides, while the prompt said 70.

| Step | Brian says | The player does | Wrong move, and why |
| --- | --- | --- | --- |
| Wonder | Same car, same brakes. From 50 mph it stops in 11.8 m; from 100 mph it runs past the line and needs 47.2 m. Twice the speed: why four times the road? | Watches two cars brake side by side at a line 30 m on (R replays). | |
| Stopping distance | The road a car uses while its brakes slow it to a stop. | Space brakes from 50 mph; the tape reads 11.8 m. | |
| Weight shift | Braking tips the car's weight forward onto its front tyres. | Space brakes; the pads go from half and half to 69% front, 31% back, and back again when it stops. | |
| Brake balance | How much of the braking the front and back brakes do. | → moves the lever from 50% to 70% front: the front brakes do 70%, the back 30%. | |
| Watch | (voice `lab.brian.braking.intro`) | Three lanes at once: 50 mph and 100 mph at 70% front (11.8 m and 47.2 m, four times), and 50 mph at 50% front, whose back slides. Slow motion, Watch again. | |
| Try: twice the speed | Turn the dial to 100 mph, then brake. Where will it stop? | ↑ to 100, Space, then a guess from three pictures of results (about 24 m, 47 m, 94 m); it stops at 47.2 m. | "Twice": "twice the speed needs four times the road: 4 × 11.8 = 47.2 m." "Eight times": "four times, not eight". Space at another speed: "This try is from 100 mph: press ↑ until the dial reads 100." |
| Try: steady back | The lever is at 50% front. Brake from 50 mph and watch the back; then move the lever until it stops steady. | Space: the back slides (the back brakes do 50%, the back tyres carry 31%). → to 70%, Space: a steady stop. | 60%: "The back brakes still do 40%, more than the 31% of weight on the back tyres: it slid. Move the lever on with →." |
| On your own: Brian's job | Three corners on Harbour Lights, each with a braking marker before it: 20 m, 50 m, 70 m. Arrive as fast as you can and still stop before the corner, with the back steady. | Sets the speed (the lever carries over) and brakes: 60, 100 and 120 mph. | Too fast: "From 70 mph it needs 23.1 m; the gap is 20 m: it ran 3.1 m past." Too slow: "Stopped 8.2 m short: from 60 mph it still stops in time (17.0 m). Arrive faster." Slid: why, with the shares. That corner again. |
| Question 1 | Twice the speed: how much more road does it need to stop? | Twice, four times, the same. | "Twice": "11.8 m from 50, 47.2 m from 100: four times." "The same": the two stops. |
| Question 2 | Which brake balance stops steady? | 50%, 60%, 80% front. | "The back tyres carry only 31% while braking; 50% or 60% gives the back brakes more than that, and the back slides." |
| Question 3 | On the Tune page, Brake balance two steps toward the rear: what happens in a race? | Brakes 2% harder but 4% less grip to turn while braking; stops shorter and turns better; nothing. | The Tune page's own line: "Braking +2%; cornering grip while braking -4%." Toward the front is the other way round. |
| Recap | Four times the road from twice the speed; braking tips the weight forward, so the front brakes do most of the work; too much rear brake and the back slides (voice `lab.brian.braking.explain`). | Three key ideas; Enter finishes the lesson and opens Brake balance on the Tune page. | |

Help on every step climbs from a nudge, to the plain step, to Brian's pointer on the dial, the
lever or the strip; Show me turns, moves and brakes for the player. The notebook keeps the old
words under their ids (`braking-word-0` Stopping distance, `braking-word-1` Weight shift,
`braking-word-2` Brake balance).

**Classroom screen, every lesson (Kyle, 2 November: "the text automatically goes to the next item
before you've had a chance to even read the first box. there's no back arrow").** Brian's "Stuck?"
offer and his first hint now appear under his words instead of replacing them, and a Previous step
button (Backspace) goes back one step. The old five-step lessons are not changed (Kyle: "we don't
need old lesson logic fixed"); they go as each is rebuilt.

**Checks** (before code): `tools/test-lab-classroom-braking.mjs` (every number is
`brakingBench.run`'s; a child who follows each prompt passes; each wrong guess and run says why with
the real metres and shares; help climbs to Show me; the lesson's runs pass the bench's goal through
`onChallenge`); `tools/test-lab-classroom.mjs` (the offer and hint sit under Brian's words; Previous
step); the browser scenario `tools/scenarios/lab-classroom-braking.mjs` plays the lesson by keyboard,
with one click on the lever, to the pass and the Brake balance row on the Tune page. Lane tier,
build, every `tools/test-lab-*.mjs` and the Lab scenarios.
