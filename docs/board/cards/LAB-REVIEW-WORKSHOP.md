# LAB-REVIEW-WORKSHOP

Bring Rust, Fire, Strength and Fuel up to Kyle's rules of 19 November 2026. Lessons: rust, fire, strength, fuel (`src/lab/lessons/<id>-classroom.js` and `<id>-board.js`).

## Rules

Kyle played Rust on 19 November 2026; his rules are `docs/LAB.md` 13.2, on top of 13.1. Read both
first. In short: no hedging ("in this game", "a simplification", "real X is..."); a sum is an addition
and a product a multiplication; every task says plainly what to do and names its question first; no
instruction that repeats a key label; far less reading; watch animations with several moving parts
last about 10 seconds or play twice, and R replays them, while simple changes keep their quick pace;
pictures show the real process.

## How to build

- The audit below was written by a reader of the code, not a player. Check each fault in the code
  before fixing it, and say in the change note which ones were wrong.
- Fix wrong physics and claims the lesson's own numbers contradict first, then hedges and maths words,
  then plain tasks and shorter steps, then animation pacing.
- Keep each step's teaching: shorten by cutting what the learner does not need now, and keep every
  word's definition. `tools/test-lab-brian-short.mjs` still holds (13.1).
- Checks: every `tools/test-lab-*.mjs` suite for the lessons touched, every `tools/scenarios/lab-*.mjs`
  browser scenario (`node tools/run-browser-scenarios.mjs --scenarios ... --jobs 2`), the lane tier
  (`node tools/run-tests.mjs --tier lane --changed --jobs 4`) and `npm run build`. A test that pinned
  old wording is updated to the new wording, with a one-line reason each in the change note; a test is
  never loosened.
- Change note: `docs/changes/<CARD>.md` with Tests, Changed assertions and Removed sections.
- Brian's recorded lines (`src/lab/lab-lines.js`, `tools/audio/catalog.json`): when a recorded line's
  text changes, list it in the change note under "Lines to re-record"; do not record.

## Rust first (Kyle's own play)

- The day count stays at 7 for the first runs, because salt water reaches 84% in a week. The watch run lasts
  about 10 seconds, so the calendar, the nail, the graph and the "How rust forms" box can each be watched,
  and R replays it. The garden gate keeps its quick pace.
- Rust grows over the whole length of the nail that is under water, thicker as the days pass, not from the tip.
- "The rate is the percentage of the nail that rusts during one day." Nothing after it.
- `rust = rate × days` is a product: say "multiply the rate by the days".
- "Three days" names its question first, for example: "A bare nail sits in salt water for 3 days. How much
  of it rusts? Turn the day dial to 3 and multiply the rate by the days."
- When the zinc coat is introduced, say that the zinc wears away first and the bare steel rusts after it.
- The experiment step keeps up to 30 days.

## Audit (19 November 2026)

Lessons: Rust, Fire, Strength, Fuel. Read only. Code root: `C:\Users\kyleb\.codex\worktrees\wasteland-integration\the-duel-remake`.

Method note: the `dump-steps.mjs` script named in the brief was not in the scratchpad, so I loaded each lesson's model with a small Node script (kept in the scratchpad, nothing in the repo touched) and read each step's opening words, word counts, sentence counts and result texts. Line numbers below are in `src/lab/lessons/<id>-classroom.js` unless a board file is named. "T" means the "Tell me more" mark.

The "check" numbers below follow the brief's list of nine checks.

---

#### Rust

##### Worst faults first

1. **The picture shows rust growing from the nail's tip (check 7).** `rust-board.js` lines 81 to 82 say it in the code comment ("flakes from the tip up") and lines 108 to 114 build the rust as a crust that starts at the tip (`shaftEnd`, `tipY`) and rises by `span` as the share grows. This one function draws every nail: the jars, the answer cards in "Three days", "How long the zinc lasts" and Question 1, 2 (`nail(...)` at lines 183, 552, 568 to 575, 597), and the idea cards on the recap. The nail's head sits above the water line (nail starts at `top + 20`, water top at `top + 46`), so the head should stay clean while all of the part under water rusts together. Fix: draw patches over the whole submerged length from day 1 and thicken them.
2. **Hedges are still in the lesson, in seven places (check 1).** These contradict the key ideas, which state the same rules plainly.
   - Line 92, rate note: "In this game the rate stays the same every day, which is a simplification."
   - Line 103, coat note: "In this game the coat lasts 20 days in fresh water as well, which is a simplification, because real zinc lasts far longer in fresh water than in salt water." The recap key idea (line 63) says "20 days in salt water" as plain fact.
   - Line 104, coat wear note: "which is a simplification".
   - Line 118, salt note: "These rates belong to this game. They are much faster than the rates of real nails, so that one week shows a clear result."
   - Line 329, result after the first run of "Rust": "In this game the rust grows by the same amount every day ... Real rust is less regular than that, and real nails rust far more slowly, so this rule is a simplification that keeps the sums easy to follow." The screen cuts at three sentences, so the learner reads "In this game" as the last words, and a reader of the full text ends on the caveat. This is the exact failure Kyle described.
   - Line 476, opening of "Rust" (behind T): "the rate in this game is 2% a day".
   - Lines 84 and 85, answer cards say "About 6%", "About 36%", "About 84%", "About 10 days", "About 20 days". The answers are exact (6%, 36%, 84%, 20 days). "About" invites a hedge reading and teaches that the numbers are loose.
3. **Wrong maths words (check 2).** Line 476: "so the sum is rust = rate × days" (a product). Line 504: "Now you can use the sum yourself ... work out the sum beside the picture". Line 524: "The sums beside the picture change". Line 329: "keeps the sums easy to follow". Say "multiply" or "work out the rust".
4. **"Three days" fails the newcomer test (checks 3 and 4).** Line 504 text: "Now you can use the sum yourself. A bare nail sits in salt water. Turn the day dial to 3 days and work out the sum beside the picture, then press Space to answer a question." This is the sentence Kyle quoted. It never names the question. The question ("What percentage of the nail will have rusted by then?") only appears after the player turns the dial to 3 and presses Space (line 304). Prompt at 505 repeats the key labels: "Press ↓ for fewer or ↑ for more, then press Space." Rewrite as: "A bare nail sits in salt water for 3 days. What percentage will have rusted? Set the dial to 3 days, work out the rust, then answer." Better still, ask the question on the first screen and let the dial be the working-out tool.
5. **Question 3 tests something the lesson never taught.** `check-sirena` (lines 147 to 158) asks why Brian soaks the wreck in fresh water, with the answer "to draw the salt out". Nothing earlier teaches a soak or salt left in metal. Hint 2 ("Sixty years in the sea left salt in the metal") gives the answer away and the right answer text introduces the idea for the first time. Either teach it (a short step) or ask about something the player did.
6. **Key labels repeated (check 4).** Line 476 (T): "Choose the number of days with ↑ and ↓, watch the sum change, then press Space to run the days." Lines 477 and 478: "Choose the days, then press Space." Prompt line 483, shown on all three word steps: "Press ↑ or ↓ to choose the days, then press Space to run them, or click the calendar." Line 524 in "Test your own settings": "Press 1, 2 or 3 to choose the jar, ↑ and ↓ to choose the days, up to 30, and ← and → to choose bare steel or a zinc coat." Line 539 (job prompt): "Press ← for bare or → for a zinc coat, then press Space to run the week." Lines 373 and 377 (job failure): "Press → to give it a zinc coat, then press Space." and "Press ← to leave it bare, then press Space." Line 253: "Press Space to run the calendar on to day 25". The dial, switch, jar buttons and the Run button all show their keys on screen.
7. **Steps too long (check 5).**
   - "Orange from the sea" is 113 words in full. The opening is one 30-word sentence, and the percentage definition ("a number of parts out of every 100") sits behind T although the numbers above the jars are percentages the learner must read straight away. Move the percentage sentence into the opening and cut the "50 parts out of every 100" example.
   - "Rust" result (line 329) is 105 words, five sentences. Cut to the two results and drop the last two sentences (the hedge and the "choose other days" line, which the prompt bar already carries).
   - "Salt water" is 99 words in full. The "very slow battery" paragraph behind T introduces electrons, charged particles, electric charge in three long sentences. Cut to one sentence ("Salt breaks into charged particles, and they let electric charge flow through the water, so rusting goes faster").
   - "Zinc coat" is 98 words in full. The "corrode" paragraph behind T is two sentences of definition plus electrons. Keep, but move "To corrode means to be slowly eaten away" before its first use.
   - "Test your own settings" is 74 words and "Brian's job" is 67 words in full. Both are fine in length if the key-label sentences are removed.
8. **Animations (check 6).** Calendar speed is 0.45 s a day (`DAY_S`, line 9), hold at the end 0.8 s, lead-in 0.6 s on the two watch steps.

| Step | Run length from code | Things moving at once | Replay | Verdict |
|---|---|---|---|---|
| Orange from the sea (wonder) | 7 × 0.45 = 3.2 s, plus 0.6 s lead and 0.8 s hold, about 4.5 s | Calendar, 2 nails, 2 readings | R yes | Under 8 s, multi-part. Run about 10 s or twice. |
| Rust, Salt water, Zinc coat | 7 days default = 3.2 s | Calendar, 2 nails, graph, "how rust forms" box, readings | Space again, not R | Under 8 s, 5 things moving. Lengthen to about 10 s and wire R. |
| Four jars, one week (watch) | about 4.5 s | Calendar, 4 nails, graph, table, coat, close-up | R and S (slow motion doubles it to about 9 s) | Under 8 s. Slow motion helps, but the default is too fast. |
| Three days | 3 × 0.45 = 1.35 s | Calendar, nail, graph | none | A 3-day single run is fine quick only if the card pictures carry the lesson. Rust-from-tip makes it show the wrong thing. |
| How long the zinc lasts | 25 × 0.45 = 11.25 s | Calendar, nail, coat, close-up | Space again | Good length. |
| Test your own settings | up to 4 s (`FREE_RUN_S`, line 10), 3.2 s at 7 days | same as above | Space again | Fine for a repeatable free test. |
| Brian's job | 7 days = 3.2 s | calendar, one nail | Space again | Fine quick. |
| Garden gate in the rain (job item 3) | same run | | | Fine quick, as Kyle said. |

9. **Pictures (check 7), beyond the tip fault.**
   - `closeRust` (rust-board.js line 345 onward) draws rust added on top of an unchanged steel slab. Rust consumes the iron, so the slab should lose thickness as the rust layer grows. At minimum the label "iron + water + oxygen → rust" is right, but the picture reads as rust being added to the steel.
   - `closeCoat` shows the steel going orange from the outside in, which is correct.
10. **Which steps define words and which only instruct (check 8).**
    - Define words, go under "Words so far": "Rust" (rust-rust), "Salt water" (rust-salt-water), "Zinc coat" (rust-zinc-coat). Also defined inside step text but not saved in `WORDS`: rate, percentage, oxygen, corrode, electron, clean. `rust-paint` ("Paint") is in `WORDS` but no step ever teaches it.
    - Instruction only, leave the page when done: "Four jars, one week", "Three days" (its result is the instruction to continue), "Test your own settings", "Brian's job" (its parts are instructions and results).
    - Questions: "Orange from the sea" (a question at the end of the watch), the three checks.
11. **Other things a teacher would question (check 9).**
    - "The garden gate stands out in the rain" is scored as the continuous fresh water jar (14% rust a week, needs zinc). A gate that is rained on, then dries, rusts far slower. "The boat trailer is dunked at every launch" is scored as always in salt water (84%). Neither is shown as an approximation, which is correct under 13.2, but the jobs should be written so they fit the jar ("stands in a puddle all week", "stays under water in the harbour").
    - "A zinc coat costs time and money to put on" (job opening) introduces a cost the lesson never shows or counts, yet over-protecting a dry toolbox counts as a failed answer.
    - Zinc coat wears 5% a day in every wet jar, including fresh water (line 103 admits this). The learner cannot see that fresh water wears zinc slower, so the "coat lasts 20 days" rule looks like it applies everywhere.

---

#### Fire

##### Worst faults first

1. **Hedges (check 1), eight places.**
   - Line 234, bucket note: "These are the game's own numbers."
   - Line 236, strip note: "In this game a coated cell cannot catch fire for the rest of that fire."
   - Line 246, spread note: "This is the game's rule on level ground with no wind."
   - Line 264, water note: "This is the game's own rule."
   - Line 549 and line 627: "This is a fact about real wood, not a rule of the game." and "These temperatures are facts about real wood and water, not rules of the game."
   - Line 571, retardant opening: "In this game 150 litres coat one cell."
   - **Line 561, result of "Three ways out":** "In this pit the gas burner is the only source of heat. A large fire in real life makes so much heat of its own that turning off a burner would not stop it, which is why firefighters use water to cool it." This is the closing text of the lesson's main demonstration and it contradicts the key idea (line 145: "When any one of them is removed, the fire goes out"). The same caveat is in the free test panel (line 607).
2. **The "How a forest fire spreads" result hides its own conclusion (checks 5 and 1).** Running the step to its end gives a 91-word result of five sentences with no mark. The screen shows only the first three. Hidden: "The front travelled 100 metres in that time, which is about 0.29 metres per second, written m/s. So a fire left alone reaches the road, and we must remove a side of the triangle somewhere in its path." The learner sees the 350 seconds against 420 seconds comparison but never reads that the fire reaches the road. Fix: put "A fire left alone reaches the road" third and move the speed to T. Also the step asks the player to press Space four times without saying what to watch for. The definitions of cell, strength and the 55 percent chance sit behind T while "Press Space to run one spread" is in the opening, so the first press happens before the numbers are explained (13.1: defined before used).
3. **Wrong maths words (check 2).** Line 660: "The sums beside the picture follow the cell you aim at." Those are products and quotients. Line 221: the formula "fire = fuel and heat and oxygen" uses "and" as if it were an operation. Say "fire needs fuel, heat and oxygen" and show it as a checklist, not as a formula.
4. **Tasks that do not say what for (check 3).**
   - "Fuel": "The fire pit is empty at the moment, so it has nothing to burn. Put the wood in." The wood then does not burn (the result says so), so the player sees nothing happen and the purpose of the press is never stated.
   - "Oxygen": "The open lid lets fresh air reach the flames. Shut the lid." It does not say to watch what the flame does.
   - "Fire triangle": the definition of the triangle is followed by "Open the lid again." with no link between them. State the purpose: "Open the lid, and the fire has all three again."
   - "A raked strip": the question ("which side does the strip remove?") appears only after the player rakes (line 394), then the player presses Space again to burn. Three inputs before the point. Name the question in the opening.
   - "Brian's job": "Here is a job for you." is filler. The opening never says what to do on each trip (pick a burning cell, drop). The hint ladder carries the idea of "flames nearest the road".
   - Question 3 ("Where should you drop the first load?") shows the formula "Spreads during the challenge: 420 s ÷ 70 s = 6 spreads" beside it (line 581), which has nothing to do with the question and distracts.
5. **Key labels repeated (check 4).** Line 546 and prompts "Press 1, or click the Wood switch.", "Press 2, or click the Gas switch.", "Press 3, or click the Lid switch." (lines 546, 550, 553, 556), each repeated in the hints. The switch plates show the key caps. Line 400 and 640: "Now tip the water bucket onto the fire by pressing Space." Line 608: "Press 1 for the wood, 2 for the gas and 3 for the lid." Line 618: "Press Space to run one spread." (the board already labels it "run one spread" with a Space key). Lines 375, 447, 661: "Press Space to run the next spread.", "Aim at the flames nearest the road with ← → ↑ ↓, then press Space.", "Aim with ← → ↑ ↓ and drop with Space, or click a cell."
6. **Steps too long (check 5).**
   - "How a forest fire spreads" result is 91 words, five sentences (see 2). Opening 41 words is fine; full text 115 words.
   - "Retardant" opening is 57 words (cap is 60) and defines retardant, chars and fuel in three long sentences. The full text is 93 words and includes "a litre is a measure of volume, and one litre of water weighs one kilogram", which no later step uses. Cut that sentence.
   - "Heat" 68 words, "Test your own settings" 65 words, "A raked strip" opening 54 words, "What you found out" 85 words. The recap restates three key ideas that appear again on the idea cards.
7. **Animations (check 6).**

| Step | Run length from code | Things moving | Replay | Verdict |
|---|---|---|---|---|
| Why did the lid work? (wonder) | 1.6 s of burning, lid slam, flame fades over 1.6 s, plus 1 s: 4.2 s (`SLAM_AT`, `DIE_S`) | lid, flame, smoke | R yes | Learner has 1.6 s to see the burning pit before the lid shuts. Lengthen the lead to about 3 s. |
| Three ways out (watch) | 11.4 s (`WATCH_END`), three events about 2.6 s apart | switches, flame, triangle sides, table | R and S yes | Good. |
| Heat, Oxygen, Fire triangle | flame catches 1 s, dies 1.6 s | one switch, one flame | none | Simple, fine quick. |
| Water bucket, sand bucket | pour 2.2 s, effect at 0.55 s, result at about 2.75 s | bucket swing, stream, steam, thermometer fall, triangle side darkens, flow arrows, flame | none | Under 8 s with six things moving. Lengthen to about 8 to 10 s and wire R. |
| Raked strip, Retardant | 6 spreads at 0.7 s each, first at 0.5 s: about 4.7 s | many forest cells change, arrows, numbers | none | Under 8 s, multi-cell. Lengthen the spread gap or let R replay. |
| How a forest fire spreads | one press, one spread | n/a | n/a | Fine. |
| Brian's job | splash 1.2 s, fire spreads after 1 s | splash, cells | none | Fine quick. |

   Also the forest spread runs once every 0.7 s in the lesson against once every 70 seconds in the challenge. The text says 70 seconds. That is accurate, but the picture runs 100 times faster, and the m/s speed shown (0.29 m/s) cannot be checked against what the learner sees.
8. **Pictures (check 7).** The pit, lid, thermometer and spread arrows follow the rules shown. The retardant cells turn pink and stop the flames, which matches the text. Nothing I found draws a process wrongly. One fine point: after water, the thermometer falls from 450 °C to 100 °C along the flame's fade (fire-board.js line 401), which is a drawing convenience, not a measured cooling curve.
9. **Words versus instructions (check 8).**
    - Define words, go under "Words so far": "Fuel", "Heat", "Oxygen", "Fire triangle", "Retardant" (all in `WORDS`). Defined inside step text but not saved: spread, cell, strength (of a cell), front, rake, char, degrees Celsius. The "Retardant" step sits in part 3 "Try with help" though it is a word step.
    - Instruction only, leave the page when done: "Three ways out" (a watch), "Test your own settings", "The water bucket" and "The sand bucket" (the question and result stay, the instruction goes), "A raked strip" setup, "Brian's job".
    - "How a forest fire spreads" defines spread, cell and strength behind T and then runs. Treat as defining.
10. **Other (check 9).**
    - The result for "The sand bucket" and "The lid" says the burning "soon uses up the oxygen that is left". That is accurate, but the lesson never shows oxygen running out, only the flame going dark.
    - Checks 1 and 2 give the answer partly in the hints (the third hint of every check names the card to pick). Fine for a hint ladder.

---

#### Strength

This lesson has almost no hedging, which is good, and its board draws the bend correctly (the curve `d(s) = dip s²(3 - s) / 2` is the right shape for a bar loaded at its end, drawn to scale).

##### Worst faults first

1. **Maths words are wrong (check 2).**
   - "the sum" for formulas: line 154 ("These two sums fill in once the car is on the arm"), 168 ("This is the stress sum turned around"), 176 and 576 ("The sum fills in for each bar"), 372 ("Think about the sums that you have seen so far"), 446 ("Thickness counts three times in the sum for the dip"), 577 ("thickness counts twice in the sum"), 597 ("because thickness is squared in the sum"), 607 and 612 ("The sums beside the picture change"). These are products and quotients.
   - "Thickness counts twice" and "counts three times" (KEY_IDEA line 79, lines 446 and 577) are not maths words. Thickness is squared in what a bar can carry and cubed in the dip. "Counts twice" reads as thickness × 2. Say "squared" with the plain meaning ("double the thickness, four times the load") and "cubed" ("double the thickness, eight times as stiff").
2. **The step's own word is defined behind T (check 3 and 13.1).** In "Strength" (`word-strength`) the opening is two sentences defining load and stress. The definition of strength (the word the step is named for), newton, "bends for good" and the stretch and squeeze picture all sit behind T in a 145-word text. This step introduces load, stress, N/mm², newton, strength, "bend for good" and the Strength used gauge. Split it into two steps (Load and stress, then Strength) and move the strength sentence into the opening.
3. **"Too thin" fails the newcomer test (checks 3 and 4).** Line 600 opening: "Now we leave the test bars and build a hook arm, which is half a metre long and 60 mm wide and must carry the 2,000 kg car. This arm is 20 mm thick. Press 3 to pick carbon fibre, then press Space, and I will ask you what will happen to the arm." Faults:
   - The player builds nothing: material is forced to carbon fibre and thickness is locked (`handle.locked`). "Build" is wrong.
   - It forces a key press with no choice in it ("You have picked steel. This test uses carbon fibre, so press 3.", line 322). Brian should already have the carbon fibre arm on the rig.
   - "I will ask you what will happen to the arm" names the question only vaguely, and the guess screen then says "Think about the sums that you have seen so far" (line 372), but no sum for this arm has been shown (the panel holds only the blank formulas, `openGuessFormulas`).
   - The prompt repeats key labels ("Press 3 for carbon fibre, or click it in the rack, then press Space").
   Fix: start with the arm on the rig and ask "This carbon fibre arm is 20 mm thick and the car weighs 2,000 kg. Will the arm hold, bend for good, or snap?"
4. **Key labels repeated (check 4).** Lines 315 and 546 ("Press 1 to see the same bar in aluminium ... press 3 to see the bar in carbon fibre"), 347 ("Press ↑ to hang another 10 kg, or ↓ to take the weight off."), 355 and 360 ("Press ↑ to hang 10 kg on the fresh bar"), 403 ("Make the arm thicker with ↑"), 226 and 625 (`towards()` and "Press 1, 2 or 3 to pick the material, ↑ or ↓ to change the thickness, and Space to hang the car."), 608 ("Press ↑ to make the arm thicker or ↓ to make it thinner, then press Space to hang the car."), 612 ("Press 1, 2 and 3 to change the material, and ↑ and ↓ to change the thickness"), 562 and 569 ("Press Space to hang the weights", "Press Space to start the ram"). The rack, handle and Space button are labelled with their keys on the board.
5. **Steps too long (check 5).**
   - "Strength": 145 words in full (see 2).
   - "Density": 97 words. The opening defines density and kg/m³ well. T holds the setup and the "press 1 ... press 3" instruction. Cut the instruction.
   - "Light and strong?" (wonder): 88 words. The millimetre definition ("a millimetre is one thousandth of a metre") is behind T. Move to a unit key or cut: the learner never needs it to answer.
   - "Thick enough" (`try-steel`): 91 words. The opening explains two house rules (safety line at 67%, dip no more than 10 mm). Keep the rules, cut "so that a bump on the cable cannot bend the arm for good".
   - "Stiff" opening is 58 words and "Brittle" 55 words, both within the 60 cap but each packs a definition, a setup and a key instruction.
   - Question 3 text is 37 words, then each card has 15 to 17 words.
6. **Animations (check 6).**

| Step | Run length from code | Things moving | Replay | Verdict |
|---|---|---|---|---|
| Light and strong? (wonder) | car lowers over 1.1 s after 0.4 s, seen after 2.2 s (`WONDER_S`) | 2 arms, car, number labels | R yes | Mostly a single motion (the car comes down). Fine quick, but 2.2 s total. |
| Stiff | 2.2 s (`DIP_S`): weights on 0.5 s, held, off 0.5 s | 2 bars, 2 weights | none after done (Space only works when ready) | Too quick. The steel dips 23.7 mm (18 px); the carbon fibre bar dips 0.30 mm, under one pixel (`PX = 0.76`, strength-board.js line 13), so it looks as if it does not move at all. The numbers come only after. Show the dip numbers live and run 6 to 8 s with R. |
| Brittle | the ram on carbon fibre reaches 1,991 kg at rate 2 in 3.0 s (`ramKg`) | bar, gauge, ram load, snap | none after done | Under 8 s, no replay. The snap is the point and lasts under a second. |
| Three bars, one weight (watch) | rate 1; steel gives way at 2.1 s, aluminium at 4.1 s, carbon fibre at 6.8 s, settle 0.7 s: 7.5 s | 3 bars, gauge, table, formulas | R and S (S doubles it to 15 s) | Just under 8 s, multi-part. Acceptable with S; slow the ramp so steel does not go before the learner finds it. |
| Too thin | car lowers over 1.1 s, arm snaps at about 0.7 s, 1.8 s in all (`LOWER_S`, `SETTLE_S`) | arm, gauge, break | none (the step is done after one run) | Too quick for the key point ("past 100% the arm gives way"). Slow to 4 to 6 s and add Watch again. |
| Thick enough, free test, Brian's job | 1.8 s per hang | arm, two gauges | Space hangs it again | Fine for a repeatable test. |

7. **"Stiff" contradicts itself (check 9).** The word is defined for parts ("A stiff part bends very little under a load"). The result (line 446) then says "Steel is in fact the stiffer material, but the carbon fibre bar is about five times as thick". A newcomer is told the stiff bar is the one that dipped less, and then that steel is the stiffer material. E also appears in formula notes (lines 161 and 162) as "the stiffness of the material" without a step teaching it. Say "part" and "material" apart: "The carbon fibre bar is stiffer, because it is five times as thick, even though steel is stiffer as a material."
8. **Maths is heavy for a first lesson (check 9).** The panel shows `stress = 6 × force × length ÷ (width × thickness²)` and `dip = 4 × force × length³ ÷ (E × width × thickness³)` with the line "The 6 comes from the shape of a bar with a rectangular end" and no explanation of E or width and length as fixed numbers. These formulas are correct. The "Thick enough" task needs trial and error with them. A newcomer needs the shortened chain: thicker means a lot stronger.
9. **Words versus instructions (check 8).**
    - Define words, go under "Words so far": "Density" (defined in the step, but `STEPS` gives it no `word` and `WORDS` has no entry, so Density never reaches the notebook), "Strength", "Stiff", "Brittle", "Aluminium", "Steel", "Carbon fibre". Also defined inside text and not saved: load, stress, newton, hook arm, dip, millimetre, ram, safety line.
    - Instruction only, leave the page when done: "Three bars, one weight", "Too thin" (the setup), "Thick enough" (the setup), "Test your own settings", "Brian's job".
10. **Other (check 9).**
    - "Brian's two rules" (safety line two thirds for metal, one third for carbon fibre, and the 10 mm dip) are shown in the rule card and the question text but never given a reason a learner can test, except in the one phrase "so that a bump on the cable cannot bend the arm".
    - Question 1 ("Which bar bends for good first?") has three bars but carbon fibre does not bend for good at all (it snaps). The wrong-answer text for it handles that; the question wording could be "gives way first" for fairness.

---

#### Fuel

##### Worst faults first

1. **A caveat is the last thing the learner reads (check 1).** `RECAP_SAY` (line 573, T part): "All of this belongs to petrol cars. An electric car carries batteries instead, and a battery has the same mass whether it is full or empty, so an electric car has no Fuel load to set." The lesson's last words erase the rule. Cut it.
2. **More hedges (check 1).**
   - Line 111, `FORCE_NOTE`, shown in the "Force, mass and acceleration" panel and the free test: "In this game the engine's force stays the same until the stopwatch stops. A real car's force changes with its gears." This tells the learner that the central rule (acceleration = force ÷ mass with the same force) is not how a real car behaves.
   - Line 503 (watch opening): "In this game the engine pushes this car with the same force, 10,617 N, whatever the tank holds."
   - Lines 122 and 547: "In this game a full tank of 70 litres lasts 110% of a Grand Prix."
   - fuel-board.js line 324: "From a standstill to 100 km/h, timed at real speed".
   - Line 510 formula note for the free test: "Each car has its own engine, so each car has its own force. The force stays the same whatever the tank holds."
   State these rules plainly ("The engine pushes with 10,617 N whatever the tank holds") and delete the comparisons with real cars.
3. **Wrong maths words (check 2).** Line 475: "Density is the mass of one litre of a liquid" is fine, but around it: line 484 "watch the sum beside the picture change", line 494 "the sums use metres per second", line 502 (result) "The sum shows the same thing", line 515 "The panel shows the sums for your settings", line 472 note "Put a jug on the scale to fill in this sum." These are products and quotients (`mass = litres × density`, `acceleration = force ÷ total mass`). Only "total mass = car with an empty tank + petrol" is a sum.
4. **Words are defined and not saved (check 8).**
   - "Kilogram and density" defines two words but `word: 'fuel-word-2'` saves only "Kilogram". Density is not in `WORDS`.
   - "Speed and acceleration" has no `word` at all. Speed, acceleration, km/h, m/s and m/s² are defined inline and are not saved.
   - "Force, mass and acceleration" (the watch step) defines force and newton in its opening and saves nothing.
   - "Fuel load" is saved. "Litre" is saved.
   Add Density, Speed, Acceleration, Force and Mass to `WORDS`.
5. **The job fails the player for a difference the lesson says cannot be seen.** `judgeJob` (line 362) fails any tank larger than the least pour: "was extra mass that the car carried for nothing". For the half-Grand-Prix race, 40 litres instead of 35 is five litres, 3.7 kg of a 1,250 kg car, about 0.3 percent. The free test at line 335 says that such small amounts "made no difference that the stopwatch can show". Either make the over-fill fail only when the stopwatch difference is shown, or accept any tank that lasts the race and report the extra kilograms as information.
6. **Tiny differences in the main demonstration (check 9).** The wonder race is 3.27 s (full) against 3.20 s (half), a gap of 0.07 s or 92 cm at the line. The watch race is 3.27, 3.20, 3.14 s, a 0.13 s spread. A learner cannot see which car is ahead in real time, only on the two-decimal stopwatches and the photo finish. The text says "The car with half a tank reached 100 km/h first", which is correct but the picture alone does not show it. Slow motion (S) exists only on the watch step; add it, or run the cars slowly with a long strip so the 92 cm gap is visible.
7. **Tasks that do not say what for (check 3).**
   - "Pouring by mass" (line 533): "The gauge is covered, so you must use the scale. Pour petrol in or out until the scale reads 37.0 kg, then press Space to weigh it." It never says what the exercise is for (reading litres from kilograms). Add "so that you can work out how many litres you poured from the scale alone".
   - "Force, mass and acceleration" opening (line 503): defines force and newton, then the instruction "Watch the scale as I empty the tank, and then three identical cars will race" is behind T. The opening never says what the learner is about to see.
   - "Brian's job": the opening defines "Grand Prix" and "pit lane" in the first two sentences but the actual task ("pour the least that lasts the race") is the third. The first race ("Half a Grand Prix") shows a card with 55%, 78.6%, 102% only after the first pour.
8. **Key labels repeated (check 4).** Line 515: "Press ↑ and ↓ to change the fuel load, and ← and → to change the car." Lines 534 (try-half and try-weigh prompts): "Press ↓ to pour out, ↑ to pour in, or Space to race." and "...or Space to weigh it." Line 476: "Press 1 for the water and 2 for the petrol, or click a jug." Line 485: "Press ↑ to pour petrol in (hold it to keep pouring), or click the nozzle." Line 494 (T): "Press Space to race the car to that speed". Lines 313 and 314: "Each press of ↓ lets out 3.7 kg", "Each press of ↑ pours in 3.7 kg" are useful facts and fine. The labels Pour in ↑, Pour out ↓, Weigh it Space, Race Space and the car arrows are on the screen.
9. **Steps too long (check 5).**
   - "Brian's job" is 99 words in full, with an opening of 55 words. Cut the "pit lane" definition to the first mention of the pit lane on the board and cut "which is the whole race and a little more" (T).
   - "Why did one car win?" is 64 words and fine.
   - "Speed and acceleration" is 85 words in full, with the unit explanation (3.6, 3,600 seconds, 1,000 metres) in T. Cut to "To change km/h into m/s, divide by 3.6".
   - "Force, mass and acceleration" result is 80 words and four sentences.
   - "Test your own settings" is 81 words. Cut the T paragraph.
   - "What you found out" is 106 words in full; its T text is the electric car caveat (see 1).
10. **Animations (check 6).**

| Step | Run length from code | Things moving | Replay | Verdict |
|---|---|---|---|---|
| Why did one car win? (wonder) | 0.6 s lead, 3.27 s race, 0.8 s settle: about 4.7 s | 2 cars, 2 stopwatches, speed readouts, photo finish | R yes | Under 8 s, multi-part. The 0.07 s gap is not visible. Run about 10 s or twice. |
| Speed and acceleration | one car 3.27 s plus 0.2 s lead and 0.8 s settle: about 4.3 s | car, graph, stopwatch | R after done | Single car, fine quick. |
| Force, mass and acceleration (watch) | drain 70 L at 20 L/s = 3.5 s, then 0.5 s lead, 3.27 s race, 0.8 s settle: about 8.1 s | scale, tank, 3 cars, 3 stopwatches | R and S | Meets about 8 s. The three finishes are within 0.13 s, so use S by default or lengthen. |
| Test your own settings | 3.3 s (the car's time) | one car, stopwatch, table | none | Fine quick, a repeated test. |
| Half a tank | 3.3 s | 2 cars, 2 stopwatches | R after result | Fine. |
| Question 2 race | about 4.7 s | 2 cars | R after answer | Fine. |
| Brian's job race | `RACE_S` = 2.6 s plus 0.8 s settle, or 1.2 s after the petrol runs out | car, fuel bar, sputter | none | A whole Grand Prix drawn in 2.6 s. Fine for a job; add R so a failed run can be watched again. |
| Fill the jug | 1.2 s | jug | none | Simple, fine quick. |

11. **Physics and wording (check 9).**
    - "Fuel and weight" is the lesson title and "Weigh it" a button, while the text says mass throughout and "weight" only once ("When people ask what something weighs, they usually mean its mass in kilograms"). A teacher would call the title and button wrong or at least inconsistent. Use "Fuel and mass" or explain once and keep to mass.
    - Acceleration of 8.5 m/s² held constant for 3.3 s is shown as how this car behaves; the stopwatch is the bench's 60 mph run carried on to 100 km/h (header comment, lines 3 to 5). The board text "timed at real speed" is then not exact.
    - `check-game` first answer card is 25 words long and the other two are short. Shorten the first so the three cards compare at a glance.
12. **Words versus instructions (check 8).**
    - Define words, go under "Words so far": "Litre", "Kilogram" (and density), "Fuel load", "Speed and acceleration". After the fixes in point 4, also "Force" and "Mass".
    - Instruction only, leave the page when done: "Force, mass and acceleration" (watch part), "Test your own settings", "Half a tank", "Pouring by mass", "Brian's job".
    - "Fill the jug" in "Litre" and "weigh the water and petrol" in "Kilogram" are demonstrations that carry the definition; keep the definition, drop the task text after use.

---

#### Faults common to all four

- Hedging comes from the same pattern: a formula note that begins "In this game" or "This is the game's own rule". Delete the note or keep only the numbers.
- "The sum" or "the sums" is used for every formula in Rust, Strength and Fuel. Fire uses it once.
- The key-label repetition lives in two places in every lesson: the prompt bar and Brian's `say`. Delete the key names from `say` and from the prompt (the controls show them).
- Every result text is built from three kinds of words (the result, the reason, the next instruction). The next instruction is always redundant with the prompt bar and the buttons.
- Replay with R exists only on the wonder and watch steps (and a few results in Fuel). Every multi-part run that is not a watch has no R.
