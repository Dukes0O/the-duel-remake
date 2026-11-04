# LAB-CLASSROOM-LANGUAGE: Fire triangle

Claude (lane `claude/lang-fire`), 4 November 2026. Rules and method: `docs/board/cards/LAB-CLASSROOM-LANGUAGE.md`.
No game rule, challenge, reward, save or notebook id changes; every game number comes from the same fire and bucket rules as before.

## What changed

- **Words.** Every sentence is rewritten as a teacher would say it, with objects named and one measurement system. "Takes", "took", "dies" and the
  fragments are gone: water cools the fire and removes the heat, sand smothers it and removes the oxygen, a raked strip removes the fuel, and each try
  says why. Retardant is explained: a coated plant chars, which means that it blackens slowly and gives off almost no gas that can burn.
- **Definitions.** Degrees Celsius, oxygen (one fifth of the air, and what burning does with it), cell, strength, spread, front, raking, litre and m/s are
  each defined where they first appear.
- **New step "Test your own settings"** (`try-free`). The three switches work in any combination. The rule in the panel changes on the press, the flame
  answers, Brian gives the reason for that setting (all eight have their own words), and a table on the board keeps each result. Three different
  settings open Continue; repeating a setting does not count.
- **New step "How a forest fire spreads"** (`try-spread`). One press runs one spread of the challenge's own fire. It teaches cells, strength and spreads,
  and the sums follow: a marked cell's strength, how many cells caught fire, and how fast the front moves in m/s.
- **The physics panel**, using only the game's own rules or facts labelled as real-world facts:
  - the rule, fire = fuel and heat and oxygen, built up over the word steps and following the switches;
  - wood burning near 300 °C and water boiling at 100 °C (labelled as facts about real wood and water, not game rules);
  - cells within reach = columns × rows, which changes when the strip is raked;
  - tank 600 ÷ 150 = 4 cells, and 3 × 150 = 450 litres for the strip;
  - litres = strength × 180 ÷ 100 for the aimed cell, which changes on each press of an arrow key;
  - the total for all flames and the fewest trips left, which change after each drop and spread;
  - damp trees 0.55 × 0.2 = 0.11, one bucket 600 ÷ 180 = 3.33 cells, and the challenge 420 s ÷ 70 s = 6 spreads.
  The panel beside a question does not give away its answer.
- **Pictures.** Blue arrows show fresh air moving in, or stopped with a cross by the lid or the sand. Red arrows show heat from the gas. White arrows show
  steam carrying heat away. A thermometer on the Heat and Water steps shows the wood passing the 300 °C line or falling to 100 °C. A sentence over the
  pit says why it burns or why it does not. Forest cells show their strength, with arrows to the trees that could catch fire next and crosses at the raked
  strip and the coated trees. Question 1 now shows the burning pan and its lid rather than a forest.
- **The challenge card** now starts from the bucket already on the hook, says to fill it in the lake and to hold H over the flames nearest the road, and
  keeps the challenge's own 7 minutes. The scenario checks that the bucket is fitted when the card shows.
- **A small fault fixed.** The pit's flame dipped and recovered on alternate frames while burning at full strength (`burn` in `fire-classroom.js`).

## Removed

- All of the old wording, the `takes` field and the `taken` view field (now `removes` and `removed`).
- The forest picture and bucket caption from question 1, and the `Out!` and `Splash:` exclamations.

## Changed assertions (for Claude's review, rule 18)

- `tools/test-lab-classroom-fire.mjs`: every assertion on wording moves to the new sentence and keeps its numbers (180, 600, 150, 4, 3 trips, 2 spreads,
  `OPEN_SPREADS` 4, `MINUTES`). The hover check on litres now allows one decimal (`[\d.]+`), because a part-doused cell's litres are shown as they come
  out from its whole-number strength. It still requires a number, and the strength and litres agree with the panel. No check of behaviour is removed.
  `playThroughTo` gains the two new steps, and the "guided tries" test walks through the spread step to reach the strip.
- Added: the eight settings and their reasons, the free test's counting, the sums following the switch, the aim and the rake, the spread step against the
  game's own `spreadStep`, the worked totals coming out from the numbers on the board, the panel not giving away question 1, and a source check that also
  bars `takes`, `took`, `dies` and `died`.
- `tools/scenarios/lab-classroom-fire.mjs`: wording moves as above and it runs at 1920 by 1000. Added: the free test, the spread step, sums following the
  controls, earlier words staying on the page, questions fully visible, and the bucket fitted as the card says.

## Proposed voice lines

Not recorded. Each matches what the lesson now says on its page.

- `lab.brian.fire.intro`: This pit has three switches. The gas controls the heat, the wood controls the fuel, and the lid controls the oxygen. I will remove one side of the triangle at a time. Watch the switches and the triangle.
- `lab.brian.fire.explain`: A fire needs heat, fuel and oxygen, all at the same time, and it goes out when any one of them is removed. Water cools the fire, which removes the heat. Sand or a lid smothers the fire, which removes the oxygen. A raked strip removes the fuel, because it leaves nothing to burn. Retardant is sprayed on the trees in front of a fire, so that those trees char instead of burning. To fight a forest fire, start with the flames nearest the road.
- `lab.brian.fire.pass`: Heat, fuel and oxygen are the three sides of the fire triangle. When any one of them is removed, the fire goes out.

## Checks

- `node tools/test-lab-classroom-fire.mjs` 14/14; `tools/test-lab-classroom-page.mjs` 6/6; `tools/test-lab-classroom.mjs` 15/15.
- Source check of the two lesson files for `she`, `her`, `mph`, `decides`, "air takes", `takes`, `took`, `dies`: none (inside the suite).
- Browser walkthrough `lab-classroom-fire` at 1920 by 1000 passes through to the helicopter challenge, and the pictures were read for fit.
- Lane tier and build are left for the merge, as the brief says. No frame check: the classroom is a 2D board.
