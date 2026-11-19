# LAB-REVIEW-MOTION

Bring Projectile, Launch, Wax and G-force up to Kyle's rules of 19 November 2026. Lessons: projectile, launch, wax, gforce (`src/lab/lessons/<id>-classroom.js` and `<id>-board.js`).

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

Code read: `C:\Users\kyleb\.codex\worktrees\wasteland-integration\the-duel-remake\src\lab\lessons\` (`<id>-classroom.js`, `<id>-board.js`), `src\lab\benches\`, `src\lab\classroom\classroom-frame.js`, `classroom-ui.js`, `brian-text.js`.
The brief's `dump-steps.mjs` did not exist in the scratchpad, so every text below was produced by running each lesson's own model (`createModel`, `act`, `tick`, `view`) with my own throw-away scripts. Word counts are of Brian's opening (what `splitSay` shows before "Tell me more"). Line numbers are in the lesson's `-classroom.js` unless the board is named.

Rules that apply to all four: any text after the first three sentences, or after the `${MORE}` mark, is hidden behind "Tell me more". Several lessons put the task, the question or the new word's definition there (see each lesson).

Cross-lesson faults (they appear in all or most of the four):

- The right answer is always the first card. Launch: all 3 checks. Wax: all 3 checks. G-force: all 3 checks plus both predictions (`correct: 0` at lines 99, 106, 117; `correct = m.guess === 0` at line 295). Projectile alone varies (cards 3, 1, 2 and 2). A player can press 1 every time.
- The key labels on the screen are repeated in Brian's prompts in every lesson (details per lesson).
- "Now you can ..." and "Now you can use what you have found" style task openings with no stated purpose (Projectile try-free, Launch try-free, Wax try-free, try-cool, try-wet, G-force try-free).
- A multiplication or formula called "the sum": Projectile 143, Launch 138, Wax (about nine places), G-force 76 and 531.
- Hedges: Projectile "barely/hardly", Launch "about 45", Wax "In this game" (five places), G-force "In this game" (six places).

---

#### 1. Projectile (`projectile-classroom.js`, `projectile-board.js`)

##### Worst faults first

1. **"the stone's sum" (maths word).** `ruleFormula`, line 143: title "For water, the stone’s sum is too big", formula `distance < forward speed × t`. `forward speed × t` is a product. It shows on watch-water, watch-speeds, try-flag, try-height and all three checks. Also shows an inequality as a "formula", which a newcomer cannot work out a number from.
2. **Hedge about the stone, and it contradicts the formulas.** Line 344 (word-forward-speed result): "nothing pushes the stone forward and the air barely holds it back". Line 481 (watch-water): "the air has barely affected it". Line 480: "the air hardly slows it". Board hover, `projectile-board.js` lines 52 and 61: "the air hardly slows it". Line 141 (drag note): "For a stone the number is so small that we leave it out" is the "a simplification" caveat Kyle banned. Meanwhile try-flag's formula title says "For a stone, with no air friction" and every number treats the stone as exactly drag-free. Pick one plain statement ("A stone has no air slowing in this lesson" is still a hedge; better "The air does not slow the stone, so its forward speed stays 10 m/s").
3. **The step's task or question is behind "Tell me more".**
   - try-flag (line 497): opening ends with the question, but "Put the flag on that spot." is behind the mark.
   - word-metres (453): "Choose a speed ... then press Space" and the definition "Speed is the distance an object travels in a certain amount of time" are both behind the mark. The step's new word is defined only after "Tell me more".
   - word-arc (462): "Now the helicopter will fly twice as fast, at 20 m/s" (what the player is about to see) is behind the mark.
   - alone (535): "The numbers on the water show how many metres remain before the buoy" is the one tool the player needs, and it is behind the mark.
4. **Task with no stated purpose, key labels repeated (rules 3 and 4).**
   - try-free (491): "Now you can experiment with a stone. Press ← and → to change the forward speed, and ↑ and ↓ to change the height." No question named; the buttons already show ← → ↑ ↓. The result never says what the three tests should show (no concluding sentence about height or speed).
   - Prompts that repeat keys: word-metres 454 "Choose a speed with ← and →, then press Space to fly"; line 219 "Press Space to watch it fly"; try-flag 498 "Move the flag with ← and → (or drag it ...), then press Space"; try-height 508 "Pick a card by clicking it, or press 1, 2 or 3" (the cards carry their number); word-* 466 "Press Space to set the helicopter off"; alone 536, 539 "Press Space to set off, then press Space again to release the water"; checks 523; every "Press Enter to continue, or press R to watch again" (the Continue and Watch again buttons show Enter and R).
5. **Watch runs too short for what moves (details in the animation table).** word-gravity 3.4 s, word-forward-speed 5.0 s, word-arc 4.2 s, watch-speeds 6.7 s, watch-water 7.2 s. Each has several things moving (stone, arrows, seconds marks, clock, formulas, table).
6. **The wonder step restarts itself.** `tick`, line 316: 2.8 s after the splash the step re-enters and wipes the marks while the player is still reading the question. R is not needed to replay, but the player cannot hold the picture.
7. **Over-long text (rule 5).**
   - watch-water result, MORE: 98 words, 5 sentences (line 480). Cut to: "Water breaks into small droplets, and the air slows small droplets far more than a stone. In the first second they lose more than half their forward speed."
   - watch-speeds result: 85 words, 5 sentences (482). Keep the first two sentences (distances). Move "Doubling the speed does not double the distance" and the timing sentence to the mark, or drop the timing sentence (see item 9 below).
   - word-gravity result: 65 words in 3 sentences, one of 33 words (342). Over the 60-word cap.
   - word-forward-speed result: 62 words (344). Over the cap.
   - try-height wrong results: 61 words (365-367).
   - word-metres result plus MORE: 81 words and the instruction "You can try another speed, or press Enter to continue" is behind the mark (339).
8. **Other hedges and loose words.** Line 345 (word-arc result) "about twice as far as the 25 m": it is exactly twice (49.5 and 24.7). The "about" comes from rounding 49.46 to 49 and 24.73 to 25 on screen, so the learner sees 49 against 25 and is told "about". Show 49.5 m and 24.7 m or say "exactly twice". Line 482 "nearly the same moment" (4.02, 4.08 and 4.17 s). Line 125 "nearly all of its forward speed".
9. **Confusing physics (item 9).**
   - watch-speeds line 482 says forward speed "has little effect on how long the fall takes. Height and gravity determine that." The water takes 4.0 to 4.2 s from 30 m; the stone takes 2.5 s. The air also sets the time, and no text says the water falls more slowly than the stone, although the two lands 1.6 s apart in watch-water.
   - "friction of the air" and "top falling speed" (9 m/s) are used with no definition and have no entry in `WORDS` (lines 84-90).
   - The formula panel on watch-water shows four formulas at once (`slowing = 0.12 × speed^2`, the top-speed square root, the rule, the two speeds) while a 7 s run is playing. Nothing introduces "0.12" except a note.
   - word-gravity: the board marks say "4.9 m fallen" and "19.6 m fallen" (cumulative), the result says "4.9 m during the first second and 14.7 m during the next". The learner has to subtract; the step never names that question.
   - `fallFormula` uses 9.8, the fall times use 9.81, so the formula after a 30 m fall reads "29.9 m" while the board says 30 m.
   - try-flag wrong text, short case (line 361): "...so it lands well short of where a stone would, between the 10 m it reached at 10 m/s and the 15 m it reached at 20 m/s." The "between" clause attaches to the stone. Reword.
   - try-flag wrong text, beyond case (360): "the water travels further than your flag suggests" is vague.

##### Rule checks in order

- **Hedging:** items 2 and 8 above.
- **Wrong maths words:** item 1. Also formula title "Downward speed gained" is fine.
- **Tasks a newcomer would not understand:** try-flag (how to predict is never stated; the only tool, interpolating between 6, 10 and 15 m from watch-speeds, appears only in hint 1 at line 499), try-free (item 4), word-metres (the purpose of choosing a speed), word-gravity (what the learner is watching for is not named; "watch how far it falls during each second" never says why).
- **Instruction repeats the screen:** item 4.
- **Too long:** item 7.
- **Pictures:** the water is drawn as one sheet that breaks into droplets over 1.1 s (`waterFall`, board line 190), which matches the text. No wrong process found. The `kestrel()` draw hangs the stone beside the bucket when both are carried (board line 208); fine. The picture of the stone and the clock use real time (1.0 x), so numbers on screen match seconds.
- **Words vs instruction:**
  - Define words (under "Words so far"): word-metres (metres per second, km/h), word-gravity (gravity, acceleration, m/s²), word-forward-speed (forward speed, downward speed), word-arc (arc), and watch-water's "top falling speed" (missing from `WORDS`).
  - Instruction only (leave once done): try-free, alone, try-flag's setup, the check questions. wonder keeps its question.
  - `STEPS` for word-gravity has `words: ['projectile-acceleration']` so it feeds two entries; the others one each.

##### Animations (real time, 1.0 x, no hidden speed-up)

| Step | Length | Things moving | Replay | Verdict |
|---|---|---|---|---|
| wonder | water lands at 6.0 s, then loops after 2.8 s | helicopter, water, splash | R; also self-loops | fine length, loop wipes the picture |
| word-metres | 4.6 s at 10 m/s (up to 7 s at 5 m/s) | helicopter, second marks | no R, but Space replays | fine |
| word-gravity | 3.4 s | stone, clock, fall marks, down arrow, 3 formulas | R (after result), S slow motion | too short, multi-part |
| word-forward-speed | 5.0 s | helicopter, stone, 2 arrows, seconds marks, 3 formulas | R, S | too short |
| word-arc | 4.2 s | helicopter, stone, ghost arc, scale | R, S | too short |
| watch-water | 7.2 s | stone, water, 4 arrows, readout, table, 4 formulas | R, S | too short for the load |
| watch-speeds | 6.7 s | 3 helicopters, 3 splashes, clock | R, S | too short |
| try-height | 6.6 s | 2 helicopters, 2 splashes | R after result | borderline, comparison of two |
| try-free, try-flag, alone, checks | 4.5 to 6.5 s | one object | R on result (try-flag, checks), none on try-free/alone | fine, single object |

Suggested fix: play the three-part watches twice, or hold the helicopter at the post for 1 s and slow the fall to a 10 s run, and keep R.

---

#### 2. Launch (`launch-classroom.js`, `launch-board.js`)

##### Worst faults first

1. **The wonder's question is hidden.** `view`, line 444: the done text has four sentences; "Is there an angle that goes further than both?" is the fourth, so `splitSay` moves it behind "Tell me more". The step ends with the question unnamed on the page. Fix: cut "Those are two very different jumps that land in nearly the same spot." and keep the question in the opening.
2. **"The ramp divides the speed" is wrong maths and misleads.** Lines 134 (title), 281 (word-angle result: "The ramp divides the skier’s speed into two parts ... At 45 degrees the two parts are equal"), 439 (recap: "it divides the speed evenly between moving forward and staying in the air"). At 20 m/s and 45° the two arrows read 14.1 and 14.1, which do not add to 20. A learner expects 10 and 10. Say "The ramp splits the speed into a forward part and an upward part, and each is worked out from the angle", and show that 14.1 and 14.1 are not shares that add up.
3. **"the sum above" (maths word).** Line 138: "so the tape reads shorter than the sum above". `distance = forward × time` is a product. Also the formulas contradict the tape every time: line 137 "Distance, leaving out the air" gives 40.9 m while the tape reads 35.6 m, and try-free (340), word-distance (333) tell the learner that "the formulas predict 40.9 m" and the real result is shorter. That is the same as a caveat: the formula shown cannot be used to hit the flag in try-flag or Brian's job. Either teach the rule with the air in it, or say once, in one step, what the air does, and stop repeating "leaving out the air".
4. **The task is behind "Tell me more", and the word steps give no purpose.**
   - word-speed (461): the opening defines speed, km/h and m/s (three words) and ends; "Turn it up to 72 km/h, and watch the formula beside the picture change" is behind the mark. The prompt (462) "Press → for faster or ← for slower, or click Faster or Slower" repeats the dial's key labels and does not say to reach 72.
   - try-free (490): "Now you can experiment. Press ↑ and ↓ ... and ← and → ...": no purpose, keys repeated. The reason to test is behind the mark.
   - try-speed (512): "Turn the dial down to 65 km/h, then press Space, and you can guess where the skier will land." Space does not launch here; it opens the guess cards (line 312). The prompt 513 says "then Space to launch", which is wrong for this step. The question ("where will the skier land?") is not named until after Space (313).
5. **Claims shown with no picture, and the conversion goes the wrong way round.** word-speed (297): "More speed means that the skier moves forward faster and also stays in the air for longer" is stated in a step where the player only turns a dial and sees a formula. The step says "To change km/h into m/s you divide by 3.6" (461 MORE), but the only formula shown is `km/h = m/s × 3.6` (line 133, `slice(0, 1)` for this step). The learner turns a km/h dial and is shown the other direction.
6. **Hedges.** Line 297: "about the same as 20 m/s" (72 km/h is exactly 20 m/s). Lines 64, 68, 476, 477, 439: "about 45 degrees", "near 45", "close together" for 30/60 (31.6 and 30.5 m) and 15/75. Line 110: "always throws you at about 50 degrees" and board line 479 "about 50°". Lines 95-98 "close together". The best angle at 20 m/s with air is 44.0°, so "about 45" is true; but the lesson then says flatly at 348 "A ramp at 45 degrees gives the greatest distance". Pick one plain sentence.
7. **Unexplained trig for a newcomer.** `formulasFor` line 134-135 shows `forward = speed × cos(angle)` and `upward = speed × sin(angle)` on word-angle. The note says "cos 45° is 0.71, the share of the speed going forward" but nothing says what cos or sin are or how to get them. "g" and "acceleration" appear in the line 136 note ("g is the acceleration caused by gravity, 9.8 m/s², read as metres per second, per second") with no step defining either word, and no definition of "upward speed" either.
8. **check-lower shows the wrong numbers.** Line 425: `CHECKS[id] ? formulasFor(45, SHOW_MS)`. During "Suppose the landing is 10 m lower" the panel shows the level-ground time in the air (2.89 s) and distance (40.9 m). With a 10 m drop both are wrong, and the question's answer (40 degrees) contradicts the panel's 45°. The same level-ground panel shows on check-pair (question about 50°) and check-game.
9. **Over-long and over-count.**
   - watch result (476): 104 words, 5 sentences, opening 55 words. "That is also why two ramps ... land close together" does not follow from "that product is greatest near 45 degrees"; cut the last two sentences or move them to a later step.
   - word-angle result (281): 88 words. Cut "points halfway between level ground and straight up" (the board shows it: "0 is level; 90 is straight up").
   - wonder opening 3 sentences is fine but its done text is 55 words with the question hidden (item 1).
   - check-pair right text (95) repeats 40/45/50 three times; one sentence is enough.
10. **Missing central relation.** Slowing from 72 to 65 km/h (10% less) cuts the jump by 17% (35.6 to 29.5 m). The lesson only says "both effects shorten the jump" (355). It never says distance grows with the square of speed, and KEY_IDEAS 65 gives numbers only.
11. **Key labels repeated:** word-angle prompt (454), word-speed (462), word-distance (469, 470 "Press Space to launch" is also drawn on the board, board line 249), try-free (490, 491), try-flag (503; the pick text 254 "Now tilt the ramp with ↑ or ↓"; the miss text, `angleFix`/`speedFix` lines 146-150: "by pressing ↑ ... by pressing →"), try-speed (513), alone (526), and the done prompts.
12. **Card wording and word definitions inside questions.** check-game question (110) defines "inrun" and "kicker" in one 40-word sentence; the correct card (111) is 17 words and defines "tuck" inside the answer. Those are new words and belong in "Words so far", not in a question or an answer card. The right and wrong texts then read "such as the launcher at 50 degrees" with no picture of that.
13. **Check-game and wonder wording.** wonder (445) says "the ramp will be at 60 degrees" before launch angle is defined in word-angle.

##### Rule checks in order

- **Hedging:** item 6; item 3 (the "leaving out the air" repetition at 333, 340, 137, 138).
- **Wrong maths words:** items 2 and 3.
- **Tasks a newcomer would not understand:** items 4, 5 and 7. alone (522) is clear: three flags, which control to set; Brian's panel shows "Within 2 m of the flag counts" but the spoken text does not.
- **Instruction repeats the screen:** item 11.
- **Too long:** item 9; word-speed MORE (41 words).
- **Pictures:** the skier's arc is drawn from the bench's own points (`pathOf`), so the arc is right. The flight plays at 1.6 x (`FLY_RATE`, line 13 and 403). No clock is drawn, so the speed-up is not visible, but the 20 m/s skier covers a 30 m jump in about 1.2 s and the board shows "72 km/h". The comment at line 12 calls this "faster than life". If a clock or "time in the air 2.9 s" formula is shown with a 1.8 s picture, they disagree (the formula panel shows `time = 2 × upward ÷ g` = 2.89 s).
- **Words vs instruction:** define words: word-speed (speed, km/h, m/s), word-angle (launch angle, forward speed, upward speed), word-distance (distance). Instruction only: try-free, try-flag's setup, try-speed's setup, alone, check questions. `WORDS` has the three it names; "forward speed", "upward speed", "tape", "inrun", "kicker" are not listed.

##### Animations

| Step | Length | Things moving | Replay | Verdict |
|---|---|---|---|---|
| wonder | 5.6 s total for two jumps (60°: about 2.1 s of flight; 30°: about 1.2 s) | skier, trail, table | R | too short for a two-jump comparison, 1.6 x speed |
| watch | 14.1 s for five jumps (0.65 to 2.4 s of flight each) | one skier at a time, table, trails | R, S | length fine, each jump quick |
| word-distance, try-free, try-flag, try-speed, alone | about 2.3 to 2.9 s per launch | one skier | none (relaunch with Space) | fine quick |

Suggested fix: run wonder and watch at 1.0 x (or play the pair twice).

---

#### 3. Wax (`wax-classroom.js`, `wax-board.js`)

##### Worst faults first

1. **"In this game" hedge in five places, one on every formula panel.** Line 86 `FRICTION_NOTE` ("In this game, a wax that suits the snow has 0.045, no wax has 0.05, and a wax that does not suit the snow has 0.06"), shown on the panels of word-friction, why-cold, why-wet, try-free, try-cool, try-wet, alone, the checks and the recap. Line 65 KEY_IDEAS: "In this game, a wax that does not suit the snow glides slower than no wax." Line 497 (watch result): "In this game, every wax that suits its snow has a friction number of 0.045 ... which is why all three trays show the same two times". That last sentence admits the three races are the same numbers. State the rule plainly: "Friction number: 0.045 with the right wax, 0.05 with no wax, 0.06 with the wrong wax."
2. **"the sum" used for every formula (maths word), nine places.** Line 247 (word-wax result: "as the sum beside the picture shows"), 276 and 287 comments, 284 (word-friction result: "The sums beside the picture follow the rule"), 134 ("the sum for distance"), 120 (gap note: "the sums use two"), 463/471 "watch the arrows and the sums", 505 hint "Compare the time with the sum beside the picture", 508 (try-free MORE: "The sums beside the picture change as you do"). The panel holds a subtraction (`pull − slowing`), multiplications, a division and a square root. Say "the numbers beside the picture" or name the one calculation.
3. **The wonder's opening teaches three unit lessons and omits the experiment.** Line 447: 103 words. The opening (48 words) defines 50 m, "minus 15 degrees Celsius" and freezing; what differs between the skis (hard wax against soft wax), what a stopwatch counts and "Watch which ski reaches the finish first" are all behind the mark. Opening should be: two skis, same strip, one with hard wax and one with soft wax; watch which finishes first. Units belong in later steps or "Words so far".
4. **word-glide is a 147-word step with six definitions.** Line 463: opening 40 words (glide, rest, gravity), then 107 words behind the mark: slope degrees, level ground, m/s, km/h conversion, acceleration, m/s². Move acceleration and m/s² to their own step; the instruction "Press Space to release the ski" is only in the prompt. The result (418): the speed numbers (1.269 m/s each second, 11.27 m/s, 40.6 km/h) are behind the mark.
5. **word-friction has no word id and defines three words.** `STEPS` line 48: `{id: 'word-friction', ...}` has no `word:`, so Friction (and "friction number" at 471 MORE, and "force") never reach `WORDS`. Opening (471) is 52 words, the task "Put a wax on the ski, and watch the arrows and the sums" is behind the mark, and the first formula panel shows five formulas with `sin`, `cos` and a square-root note. "sin, short for sine, turns an angle into a share" (line 88) and "cos ... also turns an angle into a share" (96) are not definitions a newcomer can use. The same for the `why-cold` and `why-wet` steps, which define "film" and "suction" with no word id.
6. **Task with no stated purpose or question (rule 3).**
   - word-wax (453, 454): opening defines wax and ends; "Pick a tin by pressing 1, 2 or 3, or by clicking the tin" is the only instruction, with no purpose, and the tins carry their numbers (rule 4). The gap formula shown (120) is a subtraction on a race the player did not run in this step.
   - try-free (508): "Now you can experiment with any snow and any wax. Press ← and → to change the snow, and press 1, 2 or 3 to change the wax." No question; keys repeated; the point ("try a wax on a snow that it does not suit") is the better opening.
   - try-cool and try-wet (515): "Now you can use what you have found." (the Kyle failure pattern); the question "which wax suits this snow?" is not named. The two steps are the same step with a different snow; merge into one.
   - why-cold (487): the opening is 56 words of explanation and never says what to do (the instruction is behind the mark); prompt 491 "Press 1 to change to hard wax" gives the answer before the learner has seen anything.
   - alone (530): "press Space to ski". Nothing skis; `jobAct` (366-389) only checks the pick. The first day's snow, "The ski menu reads “Today's snow: Dry powder, -13 °C”", is behind the mark.
7. **Wrong or inconsistent physics and numbers.**
   - Wet snow at "-1 °C" (line 34, `DAYS`; line 142 `freezingFormula` note "wet snow is -1 °C to 0 °C"; board `SNOW_DAYS`). The lesson says in word-crystals (480) that 0 °C is "the temperature at which ice begins to melt" and in the wonder that a minus sign means below freezing. Wet snow below freezing is not explained.
   - why-wet (488): "A softer wax repels water better" is stated as fact; a physics teacher would question it.
   - why-wet (186): "Racing skis also have fine grooves in the base" is a new fact added at the end of the result with no picture.
   - The lesson says the strip is "50 m"; the bench's own glide is 100 m (`GLIDE`, bench line 16). The numbers are consistent inside the lesson, only the bench differs.
   - word-glide formula note (line 128) "In this example the speed grows by 1.269 m/s during every second" then 1.221 with no wax in word-friction; the player is not told these are two cases.
8. **Over-long steps (rule 5), with the cut.**
   - wonder 103 words: see item 3.
   - word-glide 147 words: item 4.
   - watch result 110 words, opening 68 words (over 60): cut the "Cool snow lies between ..." sentence (it is said again in the recap).
   - word-friction 109, why-cold 88, why-wet 82, try-free 86 (opening 46 plus MORE 40), recap 73.
   - try-free and wrong-pick results are 63 and 64 words (judgeFree, 330-332) and over 60; try-cool/try-wet wrong result is exactly 60.
9. **Check questions.** check-game (174): "where can you read today's snow" is game navigation, not wax. Distractors "On the paint of the skis" and "In the shop" are not answers anyone would pick; the explanation (178) says the menu reads "Cool snow, -5 °C", while the real menu line is "Today's snow: Cool snow, -5 °C" (`todayLine`, line 35). check-rule wrong text for "the wax can stay the same" (170) quotes dry powder times for a general question.
10. **Key labels repeated.** word-wax 454, word-friction 472 ("Press 1, 2 or 3 to put a wax on the ski, or click a tin"; board shows a "No wax 4" button), word-crystals 481 ("Press → to warm the tray, or click the thermometer, until the tray reads 0 °C"; buttons "Colder ←" and "Warmer →"), why-cold/why-wet 491, try-free 509, try-cool 516, `judgeTry` 361 ("press 2 and then Space"), alone 531, check cards.

##### Rule checks in order

- **Hedging:** item 1.
- **Wrong maths words:** item 2.
- **Newcomer tasks:** item 6.
- **Instruction repeats screen:** item 10.
- **Too long:** item 8.
- **Pictures:** the close-up (`closeUp`, board lines 346-411) matches the lesson: points press into soft wax on powder, one water sheet on wet snow with hard wax, beads with soft wax. On cool snow with hard wax the picture draws a water film (`WET.cold.hard = .55`) that no text mentions. Powder shows no water at all, although the first sentence of why-cold says rubbing melts a thin film. The crystals draw as stars at -15 °C and round grains at 0 °C, correct. No picture that shows a process wrongly.
- **Words vs instruction:** define words: wonder (50 m, °C, freezing; no id), word-wax (wax, base), word-glide (glide, gravity, slope in degrees, m/s, km/h, acceleration, m/s²), word-friction (friction, friction number, force), word-crystals (snow crystals), why-cold/why-wet (film, suction). `WORDS` has wax, glide and snow crystals only. Instruction only: try-free, try-cool, try-wet, alone, the check questions.

##### Animations (real time, 1.0 x)

| Step | Length | Things moving | Replay | Verdict |
|---|---|---|---|---|
| wonder | 10.8 s | 2 skis, 2 stopwatches | R | good |
| watch | 10.8 s | 3 trays, 6 skis, stopwatches, 3 formulas | R, S | good |
| word-glide | 9.7 s | ski, stopwatch, second marks, speed readout, 3 formulas | R after result | good |
| try-free, try-cool, try-wet | 9.9 to 10.2 s per race | 2 skis, stopwatches | R on try-cool/try-wet only | fine; try-free has no replay and no slow motion |
| word-crystals "Show me" | 1.25 s (`m.celsius += 12 × dt`, line 400) | thermometer, crystals, formula | none | too quick; the crystals change from stars to wet grains in 1.25 s. The manual route is three 5 °C presses and is fine |

---

#### 4. G-force (`gforce-classroom.js`, `gforce-board.js`)

##### Worst faults first

1. **"Predict a tighter turn" sets a wider turn.** `STEPS` line 32 title; `goal()` line 192 sets the radius to 75 m (up from 50 m). A larger radius is a gentler turn. The question (559) says "if radius becomes 75 m", the reading falls to 0.26 g. The title says the opposite of what the step does.
2. **Real physics is presented as a quirk of the game.** "In this game" and "The game squares speed" appear at: line 80 ("The turning rule in this game"), 111 and 118-119 (check-rule: "Which sentence describes the G-force rule used in this game?", "The game squares speed and divides by radius"), 43-44 (KEY_IDEAS "The game squares speed ... The game divides by turn radius"), 531 (formula step: "In this game, the rule squares the speed"), 629 (recap). Sideways acceleration is v² ÷ r in every car. A learner is told this is a rule someone chose. Say "Sideways acceleration is the speed squared divided by the radius."
3. **Wrong maths word and a hedge on every formula panel.** Line 76 (note under the speed formula, shown on word-speed, formula, watch, tries, alone, recap): "The sum is approximate because the speed in m/s is rounded." It is a division, not a sum, and the "about" it causes (line 83 "= about 0.39 g") is only from rounding 13.89 to two places. Line 531: "the sum uses the values shown on the board". Line 86: "The meter and the sum use the same turn settings."
4. **"about" on exact results.** Line 299, 391 and 300: "about 9 times", "about four times as much", "about half as much". The results are exactly 9, 4 and 2 (3.539/0.393, 1.573/0.393, 0.393/0.197). `about two thirds` (303-304) is exact (0.262/0.393 = 0.667). Card labels "About 3.54 g." (lines 549-550) are precise numbers with "About" in front. Drop the "about".
5. **The wonder never asks or answers its own question.** Title (24): "Why does the cord lean?". Text (482): "A car on an arm goes around a marked circle with a cord hanging from it and a meter showing the reading. The words come next." After 2.5 s Brian says (394): "Which change could make the meter show a larger reading?" with no way to answer, and no step anywhere says why the cord leans (the weight keeps going straight while the car turns). Cord, arm and meter are never introduced as words. The animation is 2.5 s.
6. **Right answer is always card 1** in try-speed, try-radius and all three checks (item in the cross-lesson list). The wrong-answer cards also skip the common mistake: tripling speed triples the reading (1.18 g), which is not offered.
7. **word-acceleration carries the lesson's key idea in one run-on (line 515, 44 words).** "Velocity is speed in a direction, and acceleration is how quickly velocity changes. Metres per second squared, written m/s², means a speed change measured in m/s during each second; the turning car changes direction, so its velocity changes even when speed stays the same." The claim that matters (a car at steady speed in a circle still accelerates) is after a semicolon with no picture and no task; the step is just "Press Enter to continue". Split into two steps or add a picture.
8. **word-g is circular (line 523).** "G-force compares the car's sideways acceleration with one g. One g is the rate at which a dropped stone speeds up near the ground, about 9.81 m/s²." The first sentence defines g-force by "one g" before one g is explained; "about 9.81" hedges a definition. The next step (531) is the rule, which uses "squares" with no definition.
9. **Tasks with no purpose, key labels repeated.**
   - word-speed (494, 495): the dial starts at 40 and the task is "Press ← to lower it or → to raise it until it reads 50 km/h." The reason for going to 50 is never given, the dial already shows ← →, and the 47-word opening is two sentences joined by a semicolon with the reason for dividing by 3.6 inside.
   - word-radius (507): "Press ↓ to shorten it or ↑ to lengthen it until it reads 50 m." same fault.
   - try-speed (578): "Set the speed to 150 km/h ... then press Space." A player must press → ten times to move 50 to 150 (step is 10 km/h); `repeat` helps if the key is held.
   - try-free (589): "You can change speed and radius freely": no purpose, no question.
   - alone (600): "find a turn that reaches 2 g or more" has no stated reason; a 3.5 g turn passes (`result() < 2`), though the lap's "without leaving the road" is not taught: the lesson never mentions the car's grip limit (bench `gameLimitG`), so the player is told to reach 2 g in three corners with no idea what stops them.
   - Every `move` writes a new Brian line ("The dial shows 60 km/h, and the radius is 50 m. The turning rule gives 0.57 g.", line 266), and "Show me" produces ten of them in 1.4 s, so "I will set the speed dial to 150 km/h" is replaced within 0.14 s.
10. **The picture's cord lean is not the real lean.** `drawCordInset`, board line 174: `lean = 8 + min(48, g × 17)` pixels on a 55 px cord. At 0.39 g it draws 15°, real tan⁻¹(g) = 21°; at 1.57 g it draws 32°, real 57°; from about 2.8 g it stops at 45° whatever the reading (the 2 g target and 3.54 g look nearly the same). The bench already computes `leanDegrees = atan(g)` (bench line 22) and the board does not use it. The sideways arrow likewise tops out at 3 g (board line 158).
11. **Over-count of reading steps.** Five text-only or dial-only steps (word-speed to formula) before the first watch, three with no picture change. `formula` (531): "the rule squares the speed in m/s and divides by the radius in m to get sideways acceleration in m/s². The rule then divides by 9.81 m/s²": "squares" is never defined (it means "multiplied by itself"); check-speed (100) then uses "when the rule squares speed" as the reason.
12. **Recap (629):** "In this game the reading rises with the square of speed and falls as radius grows, and the G-force lap still asks you to reach at least 2 g ..." 53 words, one 40-word sentence, "still" is unexplained.

##### Rule checks in order

- **Hedging:** items 2, 3, 4, 8.
- **Wrong maths words:** item 3.
- **Newcomer tasks:** items 5, 7, 9.
- **Instruction repeats screen:** word-speed 495, word-radius 507, try-speed 578-579 ("Use ← or → to set 150 km/h"), alone 601-602, try-free 590. The board draws Slower ←, Faster →, Shorter ↓, Wider ↑ buttons.
- **Too long:** the openings are within 60 words, but word-speed (47), word-acceleration (44), formula (46) and recap (53) each pack three ideas; none uses `${MORE}`.
- **Pictures:** item 10. Also the car's angle rate is `v ÷ r × 1.1` (board line 142), 10% faster than real, harmless but not 1.0 x.
- **Words vs instruction:** define words: word-speed (speed, km/h, m/s), word-radius (radius), word-acceleration (velocity, acceleration, m/s²), word-g (G-force, one g), formula (squares; the rule). `WORDS` lists gforce, one-g, radius, gforce-speed, gforce-acceleration; `one-g` has no step with `word:` (it rides on word-g). Instruction only: the dial-setting part of word-speed and word-radius, try-speed and try-radius setups, try-free, alone, check questions.

##### Animations

| Step | Length | Things moving | Replay | Verdict |
|---|---|---|---|---|
| wonder | 2.5 s until `done`, the car keeps circling after | car, arm, cord, arrow, meter | R only after done | too short for what it must show, and the question is never named |
| watch | 6.0 s: base for 1.5 s, 100 km/h from 1.5 to 3.5 s, base for 1 s, 100 m radius from 4.5 s (lines 360-373, 386) | car, arrow, cord, meter, formula, table, three changes | R after done, no S | too short: each state shows for 1 to 2 s, the meter and cord cannot be compared. Run about 10 s or play it twice |
| try-speed, try-radius, try-free, alone | player-driven; "Show me" is about 1.4 s for a 100 km/h change | dial, car, cord, meter | none | fine |
