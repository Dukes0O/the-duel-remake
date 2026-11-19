# LAB-REVIEW-FLYING

Bring Lift, Pendulums, Air and altitude, and Headings up to Kyle's rules of 19 November 2026. Lessons: lift, pendulum, altitude, headings (`src/lab/lessons/<id>-classroom.js` and `<id>-board.js`).

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

## Audit (19 November 2026)

Code read: `C:\Users\kyleb\.codex\worktrees\wasteland-integration\the-duel-remake\src\lab\lessons\` (`lift`, `pendulum`, `altitude`, `headings`, each `-classroom.js` and `-board.js`), plus `classroom-ui.js` and `classroom-frame.js`. Read only; nothing in the project was changed.

Note on method: `dump-steps.mjs` was not in the scratchpad, so I wrote my own small opener dump (`dump-flying.mjs`, `nums-flying.mjs`, both in the scratchpad). Word counts below come from that. Numbers quoted (3,887 kg, 2,910 kg and so on) were computed from the lessons' own code.

#### Faults that hit every lesson

- **Rule 8: key labels repeated.** Every board draws key caps and every page has a Continue (Enter) button, a Watch again (R) button and card numbers. Yet nearly every prompt and hint says "Press Enter to continue.", "Pick a card by clicking it, or press 1, 2 or 3.", "Click the crates, or press 1.", "Press W (or ↑)", "Press Space to fly". Only the clicking part ("click the crates") is new information. The `DONE` hints (`Press Enter to continue.` three times) exist in all four files.
- **Rule 2: "sum" used for formulas.** Lift: "watch the sums change" (lines 509, 517, 543). Pendulum: "which is the sum beside the picture" (513), "use the sums beside the picture" (537), "the lower sum" (335), "this sum" (35, 166), "the sum's 10.03 s" (389), "The sums beside the picture show this" (139). Headings: "the sum atan(east ÷ north) gives the heading" (590, 634), "the sum needs a correction" (592), "watch the sum change" (347, 581, 590, 591), "the sums beside the picture give heading 120" (600, 617). A formula is a rule or a calculation, not a sum. Altitude avoids the word and says "physics panel", which is the model to copy.
- **Rule 3 and 5: one Brian text defines several things and the task before the definition.** See each lesson.
- **Rule 8: Words so far.** The Rotor is defined in Lift's `word-lift` step but the step only has `word: 'lift-lift'`. The word `lift-rotor` is in WORDS and nothing ever teaches it to the notebook (the only reference in the repository is its own definition).

#### Lift

##### Hedging and caveats (rule 1)
- `jobDone` (line 608), the very last thing read on the job step: "This test measures only the rotor. The hook on the real helicopter has a separate limit, and it refuses a load of more than ... until you own the Lab's Heavy hook." This is the caveat that erases the rule. Cut the whole last two sentences, or move the hook limit to the recap card for the game challenge.
- `WORDS['lift-weight']` and `word-weight` MORE: "This game gives a weight in kilograms, meaning the pull on that many kilograms." and "this game does that too". State it as the rule: "A weight of 500 kg is the pull of the Earth on 500 kg."
- `pushSum` note (142): "In this game the push grows in step with the lever."
- `mostSum` note (140): "Every push in this lesson is measured close to the pad."
- `word-collective` MORE (508): "In this lesson, W raises the lever ... the same is true in the helicopter's Real flying. In its Assisted flying, W asks for a climb ..." The whole passage is a game-mode caveat. It also appears in `KEY_IDEAS.ease`, `CHALLENGE_CARD`, `check-game` right and wrong (239, 240). "Assisted flying" and "Real flying" are never defined in the lesson. Move all of it to the challenge card, out of the lesson.
- `alone` say: "on this test pad" (580).

##### Wrong or muddled physics words (rule 9)
- The same number is called "mass" and "weight". `massSum` is titled "The total mass" (1,630 kg), the next panel calls 1,630 kg "the weight". Brian defines weight as a force in newtons, then uses weight in kg everywhere. State once that the game's weight is the mass-equivalent, then call the panel "The total weight".
- `wonder`: "The engine is at full power, but the load does not leave the ground." The lever at the top is full collective, not engine power. Say "the lever is all the way up".
- `jobDone`/`BEST_CRATES`: with the Dusthawk only one crate fits (3,410 kg), and the Dusthawk with two crates is 3,910 kg against 3,887 kg, only 23 kg over. The key "stays on the pad" moment of `try-heavy` and `check-heavy` hangs on a 0.6 percent margin, so a newcomer may read it as rounding. Pick loads with a clear gap, or show the 23 kg plainly.

##### Tasks a newcomer will not understand (rule 3)
- `try-car` ("Hang the Dusthawk rally car from the helicopter's cable.") and `try-heavy` ("Now add two crates to the Dusthawk.") both give an action and never say what it is for. The question ("Can the helicopter lift this load off the pad?") comes only after the player has finished. Name it first: "We will test whether the helicopter can lift the Dusthawk. First hang it from the cable."
- `word-lift`: "Click the rotor to start it" has no purpose given. Say "Start the rotor to see lift."
- `check-heavy`: asks which load stays on the ground, but the labels show only the load (1,280 kg, 1,500 kg, 2,280 kg). The player must remember Kestrel One's 1,630 kg and the 3,887 limit from earlier steps (the panel shows only general formulas before answering). Put both numbers in the question.
- `check-game`: "what must happen to the lift" needs "Assisted flying" and "Real flying" (undefined), see above.

##### Rule 8 repeats
- `try-free` opening (543): "Press 1 and 2 to add and remove crates, press 3 to hang the Dusthawk ..., press W and S to move the lever." The FREE_BUTTONS and the Lever up/down buttons already show all of these keys. Cut the whole sentence to "Test three different loads and lever settings."
- Prompts at 509, 517, 581, `leverPrompt` ("Hold W (or ↑), or drag the lever") repeat the Lever up (W) and Lever down (S) buttons.
- `setupPrompt`, `setupHints`: "Click the Dusthawk, or press 3.", "Click the crates, or press 1."

##### Steps too long (rule 5)
- `word-collective`: 48-word opening then 107 words behind T, 155 in total. Cut the "A more steeply tilted blade ..." paragraph to one sentence and delete the Real/Assisted flying sentences.
- `word-weight`: 131 words. Cut "When we say that a helicopter weighs ..., we mean the pull of the Earth on ... of mass. That is the weight of Kestrel One with its pilot and a full tank ..." to one sentence.
- `word-lift`: 114 words and the opening is 55. Move Newton's third law to Words or cut.
- `try-free`: 47-word opening, mostly key instructions (see above).

##### Animations (rule 6)
- `wonder`: loop of 11 s (the crates come off at 4.5 s, the lift matches at 7.5 s), R replays, loops itself. Fine.
- `watch-lever`: 13.5 s script, lever, helicopter, numbers and table at once. Replay and slow motion exist. Fine.
- `watch-loads`: three helicopters, each starting 2.2 s after the last (0.8, 3.0, 5.2 s) and the step is "seen" at 7.6 s. Three things move, under 8 s. The last helicopter has only about 2 s to take the slack and rise. Stretch to about 10 s (spacing 3 s, 2 s at the end). Replay and slow motion exist.
- `try-car` and `try-heavy` runs: after the lever reaches the line or the top, the run settles after 1.6 s (`SETTLE_S`). For the heavy load nothing visible happens for 1.6 s, which is too short to trust "it did not lift"; hold 3 to 4 s, with the dial and arrows holding. R replays (the helicopter sets down for 0.3 s, then the lever returns).
- Quick and simple, fine as is: free test, check demonstrations.

##### Pictures (rule 7)
- No process shown wrongly found. In `wonder`, crates are dropped between frames (`dropped: 2`), they are not taken off by anyone; fine for a picture.

##### Words or instructions (rule 8)
- Define words, keep under Words so far: `word-weight` (Mass, Weight, Force, newton, kilogram), `word-lift` (Rotor, Lift), `word-collective` (Collective lever), `word-hover` (Hover).
- Instruction only, leave the page once done: `try-car`, `try-heavy`, `try-free`, `alone`.
- Watches: `watch-lever`, `watch-loads` (results sentence is the finding, keep it for the recap rather than the page).
- Other: first sentences that make no sense alone, for the page's earlier-step heading: "Now it is your turn." (`try-car`), "Here is a job for you." (`alone`).

#### Pendulum

##### Hedging and caveats (rule 1)
- `freeEntries` note (39), the last thing read on the "trip" panel: "In this game that holds for every pull-back. A real pendulum pulled back very far needs slightly longer." Delete. If the pull-back range matters, say "for pull-backs up to 30 degrees, the swing time stays the same" and stop there.
- `pullEntry` and `try-heavy` "speeding up" panels: "so the weight speeds up at the same rate" (see physics).
- `SWING_NOTE`: "π is about 3.14" is a rounding, fine.

##### Wrong or muddled physics (rule 9)
- `pullEntry` (31, 32) and `formulaAct` (335): "speeding up = (weight × g) ÷ weight = 9.81 m/s²" and "the answer stays at 9.81 m/s², so the weight speeds up at the same rate". A pendulum weight does not speed up at 9.81 m/s² (that is a free fall); the string pulls back and the speeding up along the path is g × sin of the angle. The conclusion (equal for every weight) is right, the number shown is wrong. Show "pull ÷ mass is the same for any weight" and drop 9.81 m/s² here.
- "weight" is the object on the string (20 kg weight), the force (weight × g in newtons) and the mass in kg in the same sentence. The Lift lesson defines weight as the force. Rename the object "the bob" or "the ball" and keep "weight" for the pull.
- `recap` (503): "How far you pull the weight back makes no difference either" is stated as a rule while `freeEntries` admits a real pendulum differs. Only true for small angles. Use the plain range (above).

##### Hedging in the answer to the wonder question
- `word-pendulum` release result (242) has five sentences. The screen cuts after three, so the sentence that answers the lesson's opening question ("That is why a pendulum keeps swinging, and it is also why the car keeps swinging after the helicopter stops.") is hidden behind Tell me more. Cut sentence 1 ("you have made a pendulum work") so the answer lands in the three.

##### Tasks a newcomer will not understand (rule 3)
- `try-short` ("Now it is your turn. The grey weight on the right stays ... Hang your weight on the short 5 m hook, and keep the 20 kg weight so that only the string changes.", 52 words): the question to predict (sooner, later or the same) is not named, only asked after the hook is chosen. Name it first: "We will predict which weight finishes one swing first."
- `try-heavy`: same. Opening has no purpose.
- `try-formula`: the task "change the hook and the weight and watch the sums change" is not explained; the player only learns afterwards (335) that it is to see which setting changes T. Say "Change the hook, then change the weight, and see which one changes the swing time T."
- `alone`: "my crane needs a slow swing that lasts about 10 seconds" with no reason; "use the sums to predict the time". Say "Pick the hook and weight whose swing time is about 10 seconds, using T = 2 × π × √(L ÷ g)."
- `word-swing-time`: the timing task (press Space within about 12 percent of the period at the flag) is hard on first reading; the ring flash helps only after help level 2. Keep, but name the goal in the first sentence ("Press Space when the weight is back at the flag.").

##### Rule 8 repeats
- `try-free` opening (526): "Press 1, 2 or 3 to choose the string length, press 4 or 5 to choose the weight, and press ↑ or ↓ to change how far the weight is pulled back." The key caps are drawn on the hooks, the weights (keyCap '4', '5') and the pull-back panel.
- `formulaView` prompt (514): "Press 1, 2 or 3 to change the hook, and press 4 or 5 to change the weight".
- `WHERE` strings and the setup prompts: "Click the 5 m hook on the left, or press 1."

##### Steps too long (rule 5)
- `try-formula`: 203 words, 174 behind T. Split into three steps: (1) the rule T = 2 × π × √(L ÷ g) with T and L; (2) π and the square root; (3) g and m/s. Delete "five times the length gives only about 2.2 times the time, as 10.03 ÷ 4.48 shows" (the 4.48 does not match the 4.5 s Brian shows elsewhere).
- `try-free`: 40-word opening is nearly all keys; the rest (degrees) can be one sentence.
- `recap`: 53-word opening, 90 in total; repeats KEY_IDEAS.

##### Animations (rule 6)
- `wonder`: 16 s loop, R replays. Fine.
- `watch-lengths`: both weights start at 0.4 s, finish at 8.2 s (15 m) and 10.4 s (25 m); two things at once; R and S (slow) exist. Fine.
- `try-short`, `try-heavy`: both weights swing together for 7.8 s plus 0.3 s, so about 8.1 s; R replays; a wrong guess replays itself while Brian explains. Fine, at the lower edge.
- `word-swing-time`: loops until the tap. R. Fine.
- Free test: one weight, 4.8 s to 10.3 s. Simple. Fine.
- `check-settle`: decays with the game's own rate; R replays. Fine.
- `check-slowest`, `check-heavy`: three or two weights released together and left running; R replays.

##### Pictures (rule 7)
- `drawWonder`: the label "the car is still moving" shows for only half a swing (3.9 s) and then goes; the swing path stays. Fine.
- `word-pendulum`: no picture fault found.

##### Words or instructions (rule 8)
- Define words, keep: `word-pendulum` (Pendulum, kilogram), `word-length` (String length, metre), `word-swing-time` (Swing time, second). Also defined in the text but not in Words: π, square root, m/s, g (acceleration due to gravity), T and L (in `try-formula`), pull-back and degree (in `try-free`), hover (in `check-settle`).
- Instruction only: `try-short`, `try-heavy`, `try-free`, `alone`.
- `try-formula` is a definition step; it should go under Words.

#### Altitude

##### Hedging and caveats (rule 1)
- `shareSum` note (143): "In this game one rule covers both effects of thin air, the smaller amount of air thrown down and the weaker engine."
- `word-thin` MORE (431): "This game uses one rule for both effects, shown in the physics panel, which is why the push falls to 71% while the air in the jar falls to 75%."
- `recap` MORE (564): "in this game the rotor pushes 71% as much".
- `airSum` note (141): "Pilots use this rule as the average for the real air." (implies the lesson's air is not real).
- `mostSum` note (145): "Every push in this lesson is measured on the pad, close to the ground."
- `check-game` wrong (223): "Refuelling ... does not count in this challenge".
- Underlying fault: the lesson has two different rules for thin air (the dots formula with exponent 4.256, then a separate exp(−height ÷ 8,500) for the push). The "one rule for both effects" sentence is a caveat covering the mismatch. A teacher would ask why the push is not just the dots share times 3,887 kg. Use one rule and one number, or state plainly "The push falls to 71 percent because there is less air and the engine also loses power."

##### Wrong or muddled physics (rule 9)
- `airSum` formula: "air share = (1 − 0.0065 × height ÷ 288.15) ^ 4.256" with the note "288.15 is the temperature at Sea level, counted in degrees from the coldest temperature possible". Kelvin is never named, 0.0065 and 4.256 are never explained; too much for a first lesson. Show the dot counts (100, 92, 75) as a table and cut the formula, or define the temperature in the Words.
- `shareSum`: "2.718 ^ (−height ÷ 8,500)" with "Every 8,500 m of height divides the push by 2.718": 2.718 is e, never named; and "the push falls a little faster than the air in the jar" is only visible by comparing two formulas.
- Terms drift: "air density", "air share", "dots", "push share" for the same idea.

##### Tasks a newcomer will not understand (rule 3)
- `try-car` setup (574): "Now move the stand, with the Dusthawk, up to Summit Run." The step then silently turns into a question ("Will the helicopter lift the car at Summit Run?"). Name it first: "We will test whether the helicopter can still lift the Dusthawk higher up."
- `try-lever` setup: same, then asks about the red line.
- `word-density`: "Fill the empty jar with the air at Summit Run." is odd (what does filling do?). Say "Press Space to fill the empty jar with air from Summit Run, and compare it with the Sea level jar."
- `check-game`: tests fuel burning, which the lesson mentions only in one clause of `leverWhy` (`try-lever` result) and in the `fuelSum` note. The question also asks about refuelling rules that the player has not been taught. Add a short step on fuel use, or ask a question on the air and the crates instead.
- `alone`: "load as many crates as the helicopter can lift and still hover" is clear, but the 4, 3 and 2 crates answers come from a rounded-down formula that has never been taught as a step; the panel formula does teach it.

##### Rule 8 repeats
- `alone` prompt (621): "Press 1 to add a crate, 2 to take one off, or Space to lift off." The board draws keys 1, 2 and Space.
- `try-free` opening (607): "Press ↑ and ↓ to move the stand between the three places, and press 1 and 2 to add or remove a crate". Keys drawn on the board (↑ up, ↓ down, 1, 2, Space).
- `word-altitude`, `try-car`, `try-lever` prompts: "Press ↑ to move the stand up, or click Summit Run." and `MOVE_ON`: "You can move the stand with ↑ and ↓".
- `word-thin` prompt: "Press Space to start the rotor, or click the rotor."

##### Steps too long (rule 5)
- `word-thin`: 149 words; 56-word opening. Cut the litre of water, the engine and the 0 percent and 100 percent sentence to one line: "Start the rotor and watch the green arrow, which shows the push."
- `word-density`: 108 words. The paragraph on particles can be one sentence.
- `recap`: 35-word opening, 87 in total, and repeats KEY_IDEAS.

##### Animations (rule 6)
- `wonder`: two helicopters; the lever jumps to the top at 0.6 s (it is not pulled) and the Sea level helicopter climbs for about 1.6 s; "seen" at 4.5 s. Two things move, only 4.5 s, and the key contrast at the summit is "nothing happens". Stretch to about 8 s, ease the lever up, and hold the summit helicopter with its green arrow visible. R replays.
- `watch`: 10.2 s for three places (0.6, 3.8, 7.0 s), about 3.2 s per place, stand, jar, lever, arrow and table at once. Borderline: each place shows full lever for about 1.7 s before its table row. Give each place 4 s (13 s). R and slow motion exist.
- `word-density` scoop: 1.4 s, one thing. Fine quick.
- `word-thin`: lever rises at 0.8 per second plus 1 s, about 2.3 s; two things (lever, arrow). Slightly short; replay is not offered here. Allow R.
- `try-car`, `try-lever`: after the lever reaches the line, 1.6 s (`SETTLE_S`) then the result. For the Dusthawk at the summit "nothing moves" for 1.6 s. No R in any altitude try or check, because `replay()` handles only `wonder` and `watch`. Add R for the tries and 3 to 4 s for the run.
- `alone`/free test: the lever rises to the red line automatically, then 1.6 s; simple, fine quick.

##### Pictures (rule 7)
- Lever jumping to the top in `wonder` (above) is a picture that shows no pulling. Otherwise nothing found.

##### Words or instructions (rule 8)
- Define words, keep: `word-altitude` (Altitude, metre, sea level, test stand), `word-density` (Air density, jar of 100 dots), `word-thin` (Thin air). Also defined in text but not in Words: push, lever, rotor, hover (`try-lever` defines hover a second time), percent, red line.
- Instruction only: `try-car`, `try-free`, `alone`.
- `try-lever` defines hover and red line, so it is a definition step as well as a try.

#### Headings

##### Hedging and caveats (rule 1)
- Mostly clean. Minor: `watch` MORE (600) "On this map the helicopter flies at 50 m/s" (just say "The helicopter flies at 50 m/s"), `markerAct` (364) "The marker cannot go any further that way in this step."

##### Wrong maths words (rule 2)
- "the sum atan(east ÷ north)" (590, 634) and every "watch the sum change" (see above). "heading = atan(east ÷ north)" is a calculation, call it "the rule" or "the formula". "The sum needs a correction" (592) should be "the rule needs a correction".
- `distanceSum` panel shows "√(300^2 + 400^2)" with a caret, while Brian writes 300² (591, 376). Make the panel match.

##### Tasks a newcomer will not understand (rule 3)
- `word-sums` opening (590): "Move it to 300 m east and 400 m north, and watch the triangle and the sum change." The triangle and atan are not yet defined (they are behind T). The question the step answers ("what heading points at the marker?") is never named. Start with "What heading would point the helicopter at the marker?" then explain.
- `word-distance`: "watch the sum change" before "sum" or the rule of Pythagoras makes sense; the rule's steps are all behind T.
- `word-quarters`: "A calculator's atan button only gives angles between −90° and 90°" assumes a calculator and does not say why we care. Start from "The rule so far fails for places south or west of the pad."
- `word-scale`: the ruler is first mentioned in the MORE text (581: "Stretch the ruler from the pad to the hut"), so the task is hidden behind T and the opening is only a definition. Put the task first.
- `word-heading` task is behind T: "Press D to turn the helicopter to the right, and watch the shaded angle grow from north." The prompt does say it, so fine, but the "shaded angle" is explained nowhere.
- `try-wrap`: good, names the question first.
- `try-free`: "Test at least 3 different settings." The purpose (predicting where the helicopter ends up with sin and cos) is behind T.

##### Rule 8 repeats
- `word-heading` prompt: "Press D a few times, or hold it down, and watch the HEADING gauge count up." (the Turn right D button shows it).
- `turnPrompt`: "Turn the helicopter with A and D until the gauge reads 070, then press Space." repeated on every turn step; the Turn left (A), Turn right (D) and Fly (Space) buttons show this. Say "Turn the helicopter to heading 070."
- `try-free` opening: "Press A and D to choose a heading, and ← and → to choose how far the helicopter will fly." The buttons Shorter (←), Longer (→) and the turn buttons show these.
- Marker steps: "Move it to ... with the arrow keys." (593) and the hint "Press ↑ to change the north distance" repeat the West ← East → North ↑ South ↓ buttons.
- `jobView` hints and `alone` say: "press Space to fly, and press Space again to stop" while the Fly and Stop buttons show Space.
- All the `CONTINUE` prompts.

##### Steps too long (rule 5)
- `word-sums`: 170 words, 121 behind T. Split into (1) "What is a heading from a map?" with the triangle, (2) atan on a calculator.
- `word-heading`: 132 words. Move the degree and clockwise definitions into two one-sentence Words.
- `word-distance`: 127 words. Move "to square a number" and "the square root" out.
- `watch`: 114 words. Delete the km/h sentence (the 180 km/h value is never used again) and the speed panel's "An hour has 3,600 seconds" note. Keep m/s.
- `try-free`: 116 words. The sine and cosine paragraph (86 words) is one more idea; give it its own step or drop it.
- `word-heading` result (305) has five sentences, so "Past 359 the number comes round to 000" falls behind T. Reorder so it is the third sentence.

##### Animations (rule 6)
- `wonder`: flies 550 m at 50 m/s, about 11 s plus 0.6 s start. R replays. Fine.
- `watch`: 2 s turn then 8 s flight (from 0.6 s), gauge, helicopter, FLOWN panel and time all at once, about 10.6 s. R and slow motion exist. Fine.
- `try-turn` 11 s, `try-wrap` 9 s flights. No R (only Space to fly again); acceptable because the player triggers the flight.
- `try-free`: 100 to 300 m, 2 to 6 s, plus the turn. Simple. A 2 s flight is quick, but fine.
- Check demos: `check-wrap` demo is 20 degrees at 60 degrees per second, about 0.33 s (starts at 0.4 s), far too quick to see the move through 000, which is the whole point; it also never shows the 340 degree turn. Make it slow (about 2 s). `check-sum` 0.75 s, `check-west` 1.5 s, `check-scale` 1.8 s. R replays each.
- `word-sums` and the other marker "Show me": 5 presses at 0.14 s, 0.7 s. Quick but a player-led step.

##### Pictures (rule 7)
- `check-west` demo (`demo: {from: 0, to: 270, way: 'left'}`) turns left a quarter turn, but the text says "three quarter turns clockwise from north". The picture shows a different process from the words. Show the clockwise run 000, 090, 180, 270, or change the text.
- `wonder`: the helicopter flies up the map on 000 with the label "heading 070"; it works as the "wrong" flight, but call it that: "The pilot simply flies straight up the map." The word "simply" (line 559) is a hedge. Say "Watch what happens when the helicopter flies straight up the map."

##### Words or instructions (rule 8)
- Define words, keep: `word-heading` (Heading, compass, degree, clockwise), `word-compass` (North, East, South, West), `word-scale` (Scale, ruler). Defined in text but not in Words: right-angled triangle, atan (arctangent), square, square root, rule of Pythagoras (`word-sums`, `word-distance`), the correction (`word-quarters`), speed, m/s (`watch`), sine and cosine (`try-free`).
- Instruction only: `try-turn`, `try-wrap`, `alone`, `try-free`.
- The `word-sums`, `word-distance` and `word-quarters` steps are both a definition and a task. Keep their definitions under Words and make the move-the-marker task leave the page.

#### Order of importance across the four lessons

1. Hedging at the end of a step or panel: Lift's `jobDone` (the Heavy hook), Pendulum's "A real pendulum pulled back very far needs slightly longer", Altitude's "In this game one rule covers both effects" and "Pilots use this rule as the average for the real air".
2. "Sum" for a formula in Lift, Pendulum and Headings.
3. Pendulum's "speeds up at 9.81 m/s²" panel, which is wrong for a pendulum.
4. Lift: "total mass" and "weight" for the same number, and the muddled game-mode paragraph (Real and Assisted flying).
5. Steps with a task or a calculation before its definition and 100+ words (Pendulum `try-formula` 203 words, Headings `word-sums` 170, Lift `word-collective` 155, Altitude `word-thin` 149).
6. Short animations: Headings `check-wrap` demo about 0.33 s, Altitude `wonder` 4.5 s and its tries with 1.6 s runs and no R, Lift `watch-loads` 7.6 s with three helicopters.
7. Key labels repeated in prompts, in all four lessons.

#### Left open
- I did not run the lessons in a browser (not allowed), so board label wording and the real look of key caps come from the draw code only.
- The scratch files `dump-flying.mjs`, `nums-flying.mjs` and an empty `nums.mjs` in the system temp folder are mine; I left them in place because the brief says to delete nothing.
