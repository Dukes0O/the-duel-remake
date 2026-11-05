# LAB-CLASSROOM-LANGUAGE: Fuel and weight

Rules and method: `docs/board/cards/LAB-CLASSROOM-LANGUAGE.md`. This note covers the Fuel lesson only.

## What changed

- Every sentence is rewritten as a teacher would say it. Objects are named, and each unit is defined the first time it appears: km/h, metres, seconds and centimetres in the opening race, then litres, kilograms and density, then m/s and m/s², then newtons.
- Metric only. The test's speed reads "about 97 km/h". The sums use its exact value, 96.56 km/h ÷ 3.6 = 26.822 m/s, so they come out on a calculator.
- Litre and Kilogram now come before Fuel load, because the fuel load is measured in litres. A new step, "Speed and acceleration", races one car and draws its speed on a graph, with a mark on the road for each second.
- "Force, mass and acceleration" explains why less mass accelerates faster: the same force speeds up every kilogram, so with fewer kilograms each one receives a larger share. It also says why the difference is small, because 51.8 kg is a small part of a 1,250 kg car.
- The panel shows the game's own rule: mass of petrol = litres × density, total mass, acceleration = force ÷ total mass, and time = speed ÷ acceleration. Every press of the tap or the pump, and every change of car, changes the sums at once. In a question the panel shows only general formulas until the answer. Under the cloth it follows the scale and never shows the litres until the scale has been read.
- New step "Test your own settings": the player changes the fuel load and the car (four petrol cars with the bench's 70 litre tank). The sums show first, the table keeps the results, and three different settings open Continue. Show me tries a different setting each time.
- The pictures show the mechanism: a force arrow of the same length behind each car, a speed arrow that grows, each car's sum under its lane, a box 10 cm on each side beside the jug, and the speed graph.
- The Fuel load word step stays open after its answer. "The tank is full" now goes as soon as the next pour makes it untrue. What Show me pours out now lands in the jerry can.
- The recap keeps the true note about electric cars: they carry batteries, and an electric car has no Fuel load to set, as on the Tune page. The claim about faster acceleration says "the same car", because a heavier car with a stronger engine can be faster in the free test.

## Removed

All the old wording in the lesson, the `mph` field on the lanes, and the old labels on the strip and the cards. The rules, the challenge, the rewards, the save and the notebook ids are unchanged.

## Changed assertions (for Claude's review, rule 18)

`tools/test-lab-classroom-fuel.mjs`:

- Assertions on wording move to the new sentences and keep their numbers: 3.09 s, 3.12 s, 3.16 s, 3.06 s, 86 cm, 25.9 kg, 33.3 kg, 40.7 kg, 37.0 kg, 110%, 55%, 40%, 3%, 60 litres, 44.4 kg. "47%" becomes "about 47%", because it is rounded.
- The order of the notebook word steps moves, with the same three ids, because Litre and Kilogram now come first.
- The lanes report `kmh` instead of the old unit, and the check that the lighter car is ahead keeps its meaning. The bench's own `dragAt` check in the test file still reads the bench's field, because the bench is unchanged.
- The filter in the cloth test moves to "Each press pours", the card's new sentence. It filters the same one line.
- Nothing is loosened or removed. Added: the sums come out and agree with the stopwatch for all four cars at every fuel load; the free test; Show me's different settings; hints right from every setting; the panel keeps each question and the cloth; words only after they are defined; opening words that do not change with a control; the word scans (no bench, no "takes", no colon that skips a verb).

`tools/scenarios/lab-classroom-fuel.mjs` follows the new step order, runs at 1920 by 1000, checks that the sums follow the gauge and the car, and plays the free test.

## Proposed voice lines

The classroom plays only `.explain` today; the other two are in `src/lab/lab-lines.js` and the table in `docs/LAB.md`.

- `lab.brian.fuel.intro`: "The scale shows the mass of the petrol as the tank empties. Then three identical cars race to about ninety seven kilometres per hour, with a full tank, half a tank and an empty tank."
- `lab.brian.fuel.explain`: "Every litre of petrol has a mass of nought point seven four kilograms, so a full tank of seventy litres adds fifty one point eight kilograms to the car. The engine pushes with the same force whatever the tank holds, and acceleration is force divided by mass, so the same car with less petrol accelerates faster. In a Grand Prix the petrol must still last the race, so carry the petrol you need and no more. All of this belongs to petrol cars. An electric car carries batteries instead, and a battery has the same mass whether it is full or empty, so an electric car has no Fuel load to set."
- `lab.brian.fuel.pass`: "Less petrol means less mass, so the same car accelerates faster. The petrol must still last the whole race."

## Checks

- `node tools/test-lab-classroom-fuel.mjs`: 22 of 22.
- Source scan for she, her, mph, decides and "air takes" in both lesson files: none (inside the suite).
- Browser walkthrough `lab-classroom-fuel` through the shared slot: passes at 1920 by 1000. Word steps, free test, questions with cards open, and the recap were read for fit and collisions.
- Lane tier and build are left for the merge, as the brief says. No voice credits were spent.
