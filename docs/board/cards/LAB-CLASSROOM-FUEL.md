# LAB-CLASSROOM-FUEL

The short board entry controls current state, ownership, dependencies and locks.

Fuel and weight as a classroom lesson. Rebuild order 5 of 15 (LAB-CLASSROOM section 6);
audit severity 4 of 5 (5 is as broken as the old pendulum).

**What is wrong today** (audit, 31 October 2026): The first press of "Pour 5 litres" at a full tank empties the can to 0, and "Pour" adds petrol while the prompt says pour out.

**First fix:** Separate "pour in" and "pour out" with the litres and kilograms shown on the scale as they change.

Rebuild on the classroom pattern of [LAB-CLASSROOM](LAB-CLASSROOM.md) sections 2 and 3, as
the pendulum was: `src/lab/lessons/fuel-classroom.js` (steps and model, no DOM),
`fuel-board.js` (the 2D board in the steel workshop look), one line in
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

The challenge stays the bench's own goal (`fuelBench`, LAB-TUNE-VIEW): a run with a full tank and a
run with half a tank or less. It passes on the lesson's own runs, the player's races in the tries and
Brian's job, fed to the bench through `onChallenge` as the card asks; the pass opens Fuel load on
the Tune page. The recap's button says "Finish the lesson", not "Try it in the game".

Numbers: every car run is `fuelBench.run` on the bench's car (the Falcone F42). Petrol weighs
0.74 kg a litre (`PETROL_KG_PER_LITRE`); the 70 litre tank weighs 51.8 kg. Nought to sixty: full
tank 3.16 s, half tank 3.09 s, empty 3.03 s. When the half tank reaches 60 mph the full one is
86 cm behind; empty beats full by 1.7 m. The difference is small, and Brian says so: every kilogram
counts a little. A litre of water weighs 1.00 kg (the one number not from the bench). Brian's job
uses the game's Grand Prix rule (`LAB_TUNE.fuel`): a full tank lasts 110% of a Grand Prix, so a
litre lasts 1.57% of one.

**The board.** The steel workshop. On the left the car's tank, see-through, standing on a platform
scale: a litres gauge on the tank with a half line, and the scale's dial and big readout in
kilograms, both moving as the petrol moves. A pump nozzle above pours in; a tap at the bottom pours
out into a jerry can. ↑ (or a click on the nozzle) pours in 5 litres, ↓ (or a click on the tap)
pours out 5; the buttons say "Pour in" and "Pour out". On the right a drag strip: two or three
Falcone F42s side on, each with its speed and a stopwatch at real speed; the first to 60 mph stops
its clock, and a photo finish shows the gap in centimetres. This replaces the old "Pour 5 litres"
control, which started at a full tank so that the first press emptied it, and which poured in while
the prompt said pour out.

| Step | Brian says | The player does | Wrong move, and why |
| --- | --- | --- | --- |
| Wonder | Same car, same engine, same push: why did one reach 60 mph first? | Watches a full tank race a half tank, nought to sixty (R replays); the half tank wins, 3.09 s against 3.16 s, 86 cm ahead. | |
| Fuel load | The petrol the car carries. | Fills the empty tank with ↑ (held pours on); the gauge counts to 70 litres. | |
| Litre | How much space a liquid takes up. | Space fills a one litre jug to its line: this much space; the tank holds 70 of them. | |
| Kilogram | How much stuff there is: its mass. | Puts a litre of water (1) and a litre of petrol (2) on the scale: 1.00 kg and 0.74 kg. Same space, different mass. | |
| Watch | Every litre weighs 0.74 kg: watch the scale as I empty the tank, then three cars race. | Watches 70 litres (51.8 kg) pour out to 0, then full, half and empty race: 3.16 s, 3.09 s, 3.03 s (Slow motion, Watch again). | |
| Try: half a tank | Pour out petrol until the tank is half full, then race it against a full tank. | ↓ to 35 litres (25.9 kg), Space. | More than half: "50 litres is more than half; half of 70 is 35: pour out 15 more." Less: "pour in". The race still runs and shows its times. |
| Try: by weight | The gauge is covered: make the petrol weigh 37 kg, using the scale. | ↓ until the scale reads 37.0 kg (50 litres), then Space (or a click on the scale) weighs it. | A wrong weight says how far off and which way: "33.3 kg: 3.7 kg too light; each press of ↑ pours in 3.7 kg". |
| On your own: Brian's job | Three races from the game's Grand Prix: half a Grand Prix, three quarters, a whole one. The tank starts full each time. Carry the fuel you need, no more. | Pours the least that lasts (the scale's panel says how much of a Grand Prix the petrol lasts) and Space races it: 35, 50 and 65 litres. | Too little: the car coughs and stops at its share ("45 litres lasts 71% of a Grand Prix: three quarters needs at least 48 litres"). Too much: "70 litres finished, but carried 5 litres, 3.7 kg, it did not need". That race again. |
| Question 1 | Which weighs more: a litre of water or a litre of petrol? | Water, petrol, the same. | "Same space, not the same mass: water 1.00 kg, petrol 0.74 kg." |
| Question 2 | Same car, same engine: which reaches 60 mph first? | Full tank, half tank, both together. | Full: "it carries 25.9 kg more; the same push moves less mass quicker". Together: "close, but 3.09 s against 3.16 s, 86 cm apart". The race replays. |
| Question 3 | In the game you set Fuel load to Half tank for a Grand Prix. What happens? | Quicker, but it runs dry past half way: pit to fill up; it lasts the race; it is slower. | "A full tank lasts 110% of a Grand Prix, so half lasts 55%; empty is 40% power until the pit stop, which takes 5 s longer." "Lighter is quicker: 3% better acceleration and braking." |
| Recap | Petrol weighs about three quarters of a kilo a litre; a lighter car speeds up quicker; carry the fuel you need, no more (voice line `lab.brian.fuel.explain`). | Three key ideas; Enter finishes the lesson and opens Fuel load on the Tune page. | |

Help on every step climbs from a nudge, to the plain step, to Brian's pointer on the nozzle, the
tap or the strip; Show me pours or races for the player. The notebook keeps the old words under
their ids (`fuel-word-0` Fuel load, `fuel-word-1` Litre, `fuel-word-2` Kilogram). The intro voice
line (`lab.brian.fuel.intro`) no longer fits a step and is not played.

**Checks** (before code): `tools/test-lab-classroom-fuel.mjs` (a child who follows each prompt
passes; each wrong pour says why with the real litres and kilograms; every number is
`fuelBench.run`'s; help climbs to Brian's pointer and Show me pours; the lesson's runs pass the
bench's goal through `onChallenge`); the browser scenario `tools/scenarios/lab-classroom-fuel.mjs`
plays the lesson by keyboard, with one mouse click on the tap, to the pass and the Fuel load row on
the Tune page; every `tools/test-lab-*.mjs`, the Lab scenarios, the lane tier and the build.
