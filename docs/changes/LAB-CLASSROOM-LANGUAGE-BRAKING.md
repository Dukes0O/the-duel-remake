# LAB-CLASSROOM-LANGUAGE: Braking

The rules and the method are in `docs/board/cards/LAB-CLASSROOM-LANGUAGE.md`.

## What changed

- Every sentence is rewritten as a teacher would say it, with the car named. Each hint, question, answer, hover line, recap card and notebook meaning is a whole sentence.
- **Units.** The dial shows km/h on the bench's own steps (80 km/h and 161 km/h for the two main speeds) and the sums use m/s. New step "Kilometres per hour and metres per second" defines both and gives the reason for 3.6, with a mark on the road for each second. Because the dial rounds, it says openly that twice 80 reads as 161: the exact figures are 22.35 m/s and 44.70 m/s, which is exactly twice.
- **New step "Deceleration"** defines m/s². The car's figure is the bench's own: 23.246 m/s² × brake strength 0.90 = 20.92 m/s² from the brakes, plus 0.27 m/s² of passive drag, which makes 21.19 m/s². Marks on the road show where the car was at each half second, so the speed falls by the same 10.6 m/s each time while the marks grow closer together. This step brakes from 129 km/h, not 161 km/h, to keep the guess open.
- **New step "Energy of motion"**, straight after the "Twice the speed" guess so that the guess stays open, explains why the road grows with the square of the speed: twice the speed carries four times the energy for the same brakes to remove, and the same brakes remove the same energy during each metre. Gold blocks of energy empty along numbered stretches of road. The panel builds d = v² ÷ (2 × a) from energy ÷ energy removed per metre, and the mass cancels. The dial stays open.
- **The sum and the tape.** The tape's reading shows in the panel only once the car has stopped. The panel says that the sum (47.15 m) and the tape (47.2 m) can differ, and why: rounded numbers, and the game working out each stop in steps of 1/120 of a second. It also says how much longer the stop would be without the passive drag. The bench has no reaction distance, so the sum has none. Across the five test cars and every dial step the two agree to within 5 cm, and a test holds that.
- **New step "Test your own settings".** The player changes the speed and the car (five cars with different brakes), the sums change on each press, a table keeps the results with the sum beside the tape, and three different settings open Continue. Show me tries a setting not yet tested each time, so it reaches three and finishes.
- **The wonder** now stops the clock when the slower car has stopped. The faster car has passed the line and is still travelling at 80 km/h, so its distance stays unknown until the guess. **The Watch** uses 80 and 113 km/h for the same reason.
- **Weight shift** explains the reason: the tyres slow the car at the road while the centre of mass carries on above it. Arrows show this during braking, and the panel works the 69%. The weighing pads now appear only from the step that defines them; earlier steps show the car alone.
- **Brake balance** says "in this game": the rule applies only to the back tyres, more front brake causes no slide, and the lever does not change the stopping distance. It explains why a tyre locks, and the lever stays free after the answer with the comparison on the picture and in the sum.
- **Brian's job** adds v = √(2 × a × d) for each gap. Its closing words compare the third corner with the first, with a number that adds up ("about four times").
- **The panel never settles an open guess or question.** "Twice the speed" shows only the general sum until the car has stopped, and each question shows only a general rule until it is answered.
- Hints that name a key now follow the setting, so the dial test says ↓ when the dial is above 161 km/h, and the lever test stops asking for → once the lever is far enough forward. Show me's words say what it will really do, including where it stops at a question.
- `benchAttempts` now tells the bench which car ran, so a free-test run in another car is recorded as that car. The bench's goal is unchanged.

Game rules, challenge, reward and the old notebook ids are unchanged. The notebook gains three words: `braking-metres-per-second`, `braking-deceleration`, `braking-energy`.

## Removed

- All of the old wording, the `MPS` constant and the `mph` field on a lane, and every "mph" in the two lesson files.
- The word step's lever lock, and the unused `pads` flag.

## Changed assertions

- `tools/test-lab-classroom-braking.mjs`: every assertion on wording moves to the new sentence and keeps its numbers. 50, 60, 70, 100 and 120 mph become 80, 97, 113, 161 and 193 km/h. Every distance is unchanged (11.8, 17.0, 23.1, 47.2 m and so on), and the checks on the bench's own numbers are untouched.
- `laneAt` returns `ms` in place of the old speed field, so "stopped" is now `end.ms === 0`, the same check in the new unit.
- The test that the lever "stopped at 70% and carries" depended on the word step's lock, which the card removes. It now checks that the lever stays free at 80% and that 80% carries into the next step, which is a stronger check of carrying. Nothing is loosened.
- The notebook lists grow by the three new words, and the old ids are still checked.
- Added tests: km/h and m/s against the bench; sum against tape; the deceleration marks; the energy step; the free test; Show me reaching three settings; the panel not giving away a guess or question; nothing before the guess saying its answer; the wonder's frozen moment; the tape line only after a stop; hints correct from every setting; opening words that do not change with a control; sums that add up; pads only after their definition.
- `tools/scenarios/lab-classroom-braking.mjs` runs at 1920 by 1000, follows the new steps, and adds checks that the sums follow the dial, the car and the lever, and that the panel keeps the guess's answer back.

## Proposed voice lines

- `lab.brian.braking.intro`: "Three identical cars will now brake at the same line. Two have the lever at seventy percent front, one from eighty kilometres per hour and one from a hundred and thirteen. The third brakes from eighty kilometres per hour with the lever at fifty percent front. Watch where each car stops, and watch the back of the third car."
- `lab.brian.braking.explain`: "A car's stopping distance grows with the square of its speed, because twice the speed carries four times the energy of motion, and the same brakes remove the same energy during each metre of road. Braking moves weight forward onto the front tyres, so the front brakes can do most of the work. If the back brakes do more of the braking than the weight on the back tyres allows, the back tyres lock and the back of the car slides."
- `lab.brian.braking.pass`: "Twice the speed needs four times the road, because it carries four times the energy for the same brakes to remove. So brake early, and brake in a straight line."

## Checks

- `node tools/test-lab-classroom-braking.mjs`: 24 of 24. One independent review; its ten faults are fixed, with tests where they fit.
- Source check on both lesson files with the patterns of `tools/test-lab-classroom-page.mjs`: clean. Every step after the first shows formulas on a fresh model.
- Browser scenario `lab-classroom-braking` through the shared slot: passes, 44 screenshots, read at 1920 by 1000 (word steps, free test, guess and questions with cards open, recap). Text fits, and the question is fully visible.
- Lane tier and build are left for the merge, as the brief asks. `braking` still has to join `REWRITTEN` in `tools/test-lab-classroom-page.mjs`, which this lane does not own.
