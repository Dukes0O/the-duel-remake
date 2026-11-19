# LAB-REVIEW-TUNNEL

Bring Downforce, Grip, Braking and Suspension up to Kyle's rules of 19 November 2026. Lessons: downforce, grip, braking, suspension (`src/lab/lessons/<id>-classroom.js` and `<id>-board.js`).

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

Checked against docs/LAB.md 13.1 and 13.2. Code is read only at C:\Users\kyleb\.codex\worktrees\wasteland-integration\the-duel-remake.
`dump-steps.mjs` was not in the scratchpad folder, so I read each step's opening words by walking the lesson models directly (same
split code as the screen) and by reading the source. Line numbers are in `src/lab/lessons/<id>-classroom.js` unless stated.

Rule numbers used below: (1) hedging, (2) maths words, (3) unclear task, (4) repeats key labels, (5) too long, (6) animation too quick,
(7) wrong picture, (8) instruction-only versus word-defining, (9) other.

#### Worst faults across all four lessons

1. Suspension: the Watch again button and R do nothing. The model's `act()` has no replay case (checked: `act('replay')` returns null and the step is unchanged), yet `actions: ['replay']` is shown on `wonder` and `watch`.
2. Grip: Brian says "I will test 3, 4, 4.5 and 9 degrees" (watch, line 338) but the code runs 2, 3, 4 and 12 degrees (line 247). The next two steps then ask the player to predict 4.5 and 9 degrees as if they had never been seen.
3. Several lessons teach something the numbers contradict: Grip says the tyre "pushes harder" as the angle grows up to 4.3 degrees, but the grip reading is 100% from 0 to 4.3 degrees. Suspension says the stiff spring "can briefly lift a tyre", but the rig's own tyre contact is 93.1% for stiff and 87.9% for soft on bumps. Braking says the lever "does not change the stopping distance", but the Tune page card says moving toward the rear "makes the car brake a little harder".

---

#### Downforce

##### Hedging and caveats (rule 1), most important
- `numberRow` note, line 158: "In this game the wing area ... is 0 when flat". Also physically wrong: a flat wing still has area; it is the angle that gives no push.
- `timesRow` note, line 163: "In this game the flat wing pushes 0 kg at any speed".
- `topRow` note, line 167: "In this game the engine's power stays fixed".
- `dragNumberRow` note, line 166: "In this game the car's body has a drag area ...".
- check-game table note, line 484: "In this game each step on the Tune page is a smaller change than the difference between two wings".
- Rounding caveats, many places: "To the nearest whole number" (KEY_IDEAS push, line 82), "To the nearest kilogram" (check-nine wrong, line 123; timesRow), "about nine times", "about four times", "is about the same as 27.8 m/s" (`turned`, line 283), "The table shows this to the nearest whole number" (line 168). State the numbers plainly; the 0.01 rounding does not need to be announced to a learner.

##### Maths words (rule 2)
- "sum" is used for products and divisions the learner sees: "watch the sum beside the picture change" (word-speed, line 517, a division), "Watch the sums change as you do" (try-free, line 555), "watch the sum change" (`turned`, line 283), "watch the sum and the scale change" (word-downforce, line 343), "watch the sums change" (word-drag, line 348), "the sum and the smoke" (tiltedSteep, line 302). Every one is a multiplication or a division. Say "the working" or "the formula" or "multiply".
- Step title and exports use "sum" internally (pushSum, timesSum); harmless unless any are shown.

##### Unclear tasks (rule 3)
- word-speed (line 517): "Turn the dial up to 100 km/h, and watch the sum beside the picture change." The step is meant to teach km/h and m/s, but the task never says what turning the dial is for.
- alone (line 590): "choose the least wing that lets the car hold the course". "Hold the course" is not defined; the 40 kg a bend needs, and why, are only behind "Tell me more". The first sentence that tells the player what to do is therefore a puzzle.
- try-speed (line 566): "Turn the fan up to 120 km/h ... and then press Space, and you can guess how hard ..." names the question only at the very end, after two instructions. Lead with "How hard will the tilted wing push at 120 km/h?" then say what to do.
- try-free (line 555): "predict what the scale and the rope will read before you press Space" gives no place to record a prediction, so it is an instruction with no effect.
- try-cost (line 573) is a good example: the question comes first. Keep that pattern.

##### Repeats what the screen shows (rule 4)
- prompt word-speed (line 518): "Press ↑ for faster or ↓ for slower, or click Faster or Slower." The dial already shows Faster/Slower with ↑ ↓.
- prompt word-wing (line 526): "Press → to tilt the wing steeper, or click the wing panel."
- try-free (line 555): "Press ↑ and ↓ to change the fan speed, and ← and → to tilt the wing." Also line 555 hints, line 320 ("Press ← or → to choose another wing"), line 372 ("Press ← or → to change the wing, then press Space"), lines 390, 394, 398 ("Press → for a steeper wing, then press Space"), line 566 prompt, line 579 prompt, line 593-594 prompts.
- Hints at rung two that name keys (line 519, 527, 580) are fine as help; the main text and prompt should not.

##### Too long (rule 5)
- Finished-run texts have no MORE mark, so the screen cuts them after three sentences and the cut text can still pass 60 words: tiltedSteep (line 302) is 5 sentences and 100 words, opening 62 words; word-downforce result (line 343) 5 sentences, 109 words, opening 61; word-drag result (line 348) 6 sentences, 118 words, opening 63. Put MORE after the sentence that says what was learned. Suggested cuts: tiltedSteep, stop after "so the wing is pushed downward" and move the aeroplane sentence behind MORE; word-downforce, move "The panel shows the rule ..." behind MORE; word-drag, move the Falcone top speed sentence behind MORE.
- word-speed opening is 53 words, word-drag opening 57, check-bend 51, recap 39 plus 42 behind the mark.
- word-speed `turned` result (line 283) is three sentences, 49 words, fine.

##### Animations (rule 6, from the code)
- wonder: 3.7 s (0.6 s wait, 2.2 s spin-up, 0.9 s hold); fan, scale number, smoke and car all change. Replay with R exists. Too quick for several moving things; make it about 8 to 10 s or play it twice.
- watch: 9.15 s for the three speeds (0.6 s + 3 x (1.2 s spin-up + 1.6 s hold)); replay and slow motion exist. Acceptable length; each reading is held 1.6 s.
- word-downforce and word-drag runs: 2.1 s each, fan plus scale or rope plus smoke; no replay once finished (the fan stays on and the player can move the dial, so this is partly covered). Short for a first look at a new word.
- try-free, try-speed, try-cost runs: 2.1 s, one number rises. Fine quick; these are repeated by the player.
- alone: fan run 2.1 s then car drives the course 2.4 s (DRIVE_S); no replay, but a failed course can be re-run. Fine.
- Replay (R) exists only on wonder and watch.

##### Pictures (rule 7)
- Wing is drawn with its front edge low and its back edge raised, so the air is turned upward and the push is down. Correct.
- The wing area 0 for the flat wing means the picture of a flat wing has no push; explained wrongly (see hedging).
- The scale reads kg for a force (1,337 kg). Common in racing but unexplained; the lesson says mass and then "the scale read" without saying the scale shows kilograms of push. Minor.

##### Which steps give only an instruction, which define words (rule 8)
- Instruction only (would leave the page when done): try-free, try-speed, try-cost, alone, watch, wonder (a setup), and the three check steps. The `word-` steps that end with "keep turning the dial" are not instruction only.
- Define words (go under Words so far): word-speed (km/h, m/s; no notebook id is attached, so the definition is lost: add one), word-wing (Wing), word-downforce (Downforce, plus "square" which is defined only in the cut-off fifth sentence), word-drag (Drag). Also unlisted: "top speed", "k", "cube root".

##### Other (rule 9)
- word-speed repeats the km/h and m/s definitions that Braking also gives; one shared definition would do.
- The Drag word `meaning` in WORDS ("In the wind tunnel a rope holds the car still") describes the rig, not the word.

---

#### Grip

##### Wrong or contradictory (rules 7 and 9), most important
- watch (line 338 versus line 247): Brian says 3, 4, 4.5 and 9 degrees; the code runs 2, 3, 4 and 12. Hints (line 340) talk about "3 degrees" and "between 4 and 4.5 degrees", but 4.5 is never shown. The result says "At 2, 3 and 4 degrees ... At 12 degrees".
- word-limit (line 330), recap (line 378), KEY_IDEAS 'sideways' and 'limit': "the tyre pushes harder as the angle grows, up to its best angle". The reading and the graph show 100% grip at every angle from 0 to 4.3 degrees, so nothing is pushing harder on screen. Either the graph needs a rising part (force against angle) or the text must say what is actually shown: full grip up to 4.3 degrees, then it falls.
- try-edge cards (line 301): "grip loss is more than 10%" can never be true: the largest loss at 12 degrees is exactly 10.0% (90.0% grip). The wrong card is not a real choice. Also "grip loss" is not defined (the panel shows "grip kept").
- try-edge wrong feedback (line 170): "not more than 10%" is also shown to the player who picked "grip is still full" (card 3), which is a different mistake.
- 100% less 99.7% (line 169): awkward way to say a subtraction; say "100% minus 99.7% is 0.3%".
- `grip-slide` (word-slide, line 19) has no entry in WORDS, while 'slip' and 'limit' have entries but no step carries them. So that step commits an unknown word and the 'Best angle' and 'Slip' definitions are never learned.
- Part of the picture: marks on the road "grow longer and darker past the best angle", good. The sideways arrow labelled TRAVEL against TYRE POINTS is correct.

##### Hedging and caveats (rule 1)
- "In this game" and "in this game, ..." at lines 49, 62, 276, 280, 330 ("In this game, that angle is about 4.3 degrees"), 334 ("this game lets the tyre slide more and push less"), 49 word meaning, and the board label "best grip in this game" (grip-board.js line 264).
- "about 4.3 degrees" everywhere (key idea, board label, formula note): the bench computes 4.297 degrees; say "4.3 degrees" plainly.
- "about" before every percentage in run results (lines 159, 169, 172, 182, 251).

##### Maths words (rule 2)
- Formula "grip kept (%) = grip kept as a fraction × 100" (line 52) is circular and only changes units. Brian says "Grip as a fraction times 100 gives grip as a percent" (line 334), which is correct, but the step title "Grip as a percentage" and a whole step for a unit change is thin. No "sum" misuse found.

##### Unclear tasks (rule 3)
- word-slide (line 319): "Set the slide angle to 2 degrees." No reason given; the step is meant to define slide angle. State the purpose: "Turn the dial and see the tyre point away from the road."
- challenge (line 363): "Run the tyre at 3 degrees or more while it keeps full grip, then run it again after grip starts to fall." Two steps, no reason, and "after grip starts to fall" is not an angle. Name the question first: "Find one angle with full grip and one angle where grip has begun to fall."
- try-edge and try-far lead to questions named only on the card (lines 342, 346); the step opening is the question, which is good, but "grip loss" is undefined.
- word-grip (line 326): "Rubber presses against the road, and that lets the tyre push the car." Too vague to be a definition; it does not say what grip is for.
- watch's hint "At 3 degrees, the squeal begins" uses "squeal", which is never taught.

##### Repeats what the screen shows (rule 4)
- prompt word-slide (line 319) "The dial reads 2 degrees"; hint "Use the arrows to change the angle" (line 322); prompts at lines 359-360, 364-368 ("Set 3 or 4 degrees ... then press Space"), 351, 355 ("Press Space to run the tyre"). The key labels already say Space and arrows.
- Line 288 `DIRECTIONS` keys shown on the dial; Brian should not repeat them.

##### Too long (rule 5)
- Nothing over 34 words in the opening. Grip is the shortest lesson. The issue is the opposite: several steps have three words of content (word-grip, word-limit, formula are single-idea steps and could be merged).

##### Animations (rule 6, from the code)
- wonder: 2.2 s; the angle steps 0, 2, 4 degrees each 0.8 s while the tyre turns, the graph dot moves and the marks change (several things at once). Replay with R after it finishes. Far too quick for what is shown.
- watch: 3.2 s for four angles, 0.8 s each, while the tyre, graph dot, percentage and table change together. Replay with R only after it finishes. Needs about 10 s (2.5 s per angle) or a twice-through run.
- try-edge and try-far: the result is instant on Space (no run time), fine quick.
- Dial steps are 0.5 degrees per press and the `AUTO_GAP_S` of 0.14 s runs Show me fast; fine.

##### Which steps give only an instruction, which define words (rule 8)
- Instruction only: wonder (watch), watch, try-edge, try-far, try-free, challenge, all checks.
- Define words (go under Words so far): word-slide (slide angle), word-grip (grip), word-limit (best angle), formula ("grip kept", percent). Only word-grip actually carries a notebook word, see above.

##### Other (rule 9)
- Checks (lines 68-82) give one `reason` for every answer, right or wrong, so a wrong pick gets no explanation of its own mistake.
- check-best asks for the "best grip" angle: the lesson's word is "best angle". check-loss "Which is the lowest setting past the best angle" is a reading exercise rather than physics.
- Real tyres lose more than 10% grip; the lesson says nothing about this, but the "in this game" hedges would be the wrong fix.

---

#### Braking

##### Wrong or contradictory (rules 7 and 9), most important
- The lever "does not change the stopping distance" (watch more-text line 525, word-balance line 518): all three cars from 100 km/h stop in 18.2 m even though the back tyres lock and slide. The Tune page card says moving toward the rear "makes the car brake a little harder" (CHALLENGE_CARD line 105; check-game right text line 155). The two cannot both be what the learner remembers. Locked back tyres lengthen a stop in real life; either show it or remove the sentence.
- Weight shift is worked at 9.8 m/s² (frontFormula note line 182, word-weight line 350: "In a steady stop at 9.8 m/s²") while this car brakes at 21.19 m/s² (checked: `aOf()`). The figure 69% front is therefore wrong for the stops shown; at 21 m/s² the same formula gives about 92%. The text itself admits it: "but in this game the lesson uses the figures of that steady stop for every run." Fix the number or the car.
- Margin: 70% front puts 30% on the back brakes against a 30.8% back load, so the step shows a pass with only 0.8% to spare, and 60% fails. A learner cannot see why 70 is "steady".
- The pads jump to 69% at the moment the brakes go on (board `close.front`: .5 then FRONT_LOAD) instead of rising, and then stay fixed; fine for a constant-deceleration model but shown as an instant change.
- "A road car on a dry road in real life can brake at about 10 m/s², so this car brakes about twice as hard as that" (line 342) is a hedge and an odd comparison.

##### Hedging and caveats (rule 1)
- Line 342: "in real life", "about twice as hard".
- Line 164: "In this game every car has a brake strength".
- Line 173 `SUM_NOTE`: "The tape can differ from this sum by a few centimetres, because the sum uses rounded numbers and the game works out each stop in steps of 1/120 of a second." Remove from the learner's view.
- Line 163: "The sums use the result rounded to two decimal places."
- Line 182: "in this game, the lesson uses it for every stop". Line 350: "but in this game the lesson uses the figures of that steady stop for every run". Line 518: "In this game, the back tyres can do only about ..." and "The game applies this rule only to the back tyres". Line 525: "in this game the lever does not change the stopping distance". Line 165: "that the game applies to a moving car even without its brakes" (passive drag).
- "about four times" (line 383), "about 4 times".

##### Maths words (rule 2)
- "sum" for formulas: "The sum predicted 18.07 m" (try-free, line 355), "That is where the sum comes from" (word-energy, line 347), "watch the sum beside the picture" (lines 518, 553), "the sums beside the picture" (lines 495, 543), "The sum beside the picture gives the fastest speed" (line 572), "Compare the tape with the sum beside the picture" (line 541), "sum 18.07 m, tape 18.2 m" (braking-board.js line 309, a table the player reads). d = v² ÷ (2 × a) is a division; call it "the formula" or "the working".
- Line 347: "When you divide the first by the second, the mass cancels" is correct.

##### Unclear tasks (rule 3)
- word-speed (line 495): "Turn it up to 200 km/h, and watch the marks on the road and the sums". The purpose (compare km/h with m/s, learn the 3.6) is only in "Tell me more".
- word-balance (line 518): "Move it to 70% front, and watch the sum beside the picture." No reason why 70.
- alone (line 572): "Arrive as fast as you can while still stopping before the corner, with the back of the car in line." Uses "braking marker", "corner" and "gap" (three words for what earlier steps called the yellow line and the chequered line). Name the question: "How fast can the car arrive and still stop before the marker?"
- try-slide (line 560): "I have moved the lever to 50% front." Brian changing the control and then saying nothing of why leaves the learner without a question. Open with "What happens to the back of the car if the back brakes do 50% of the braking?"
- try-free (line 543): says to test at least 3 settings; the purpose (compare cars' brakes) is behind the mark.

##### Repeats what the screen shows (rule 4)
- Prompt line 496: "Press ↑ to turn it up or ↓ to turn it down, or click Faster or Slower."
- Prompt line 519: "Press → to move it toward the front, or click the lever." Prompt line 554: "Press ↑ for faster or ↓ for slower, then Space to brake." Prompt line 573 lists ↑ ↓ ← → Space. Line 543 and prompt 544. Lines 320, 369, 378-379 ("Press ↓ to arrive more slowly", "press ↑ to arrive faster"), 561 prompt.
- The Brake button, speed dial and lever all show their own keys on the board (`DIAL_KEYS`, `LEVER_KEYS`, `BRAKE`).

##### Too long (rule 5)
- Over 60 words once the mark is passed: word-energy more-text (85 words), word-balance more-text (82), word-deceleration more-text (53), word-weight more-text (50). Openings are 34 to 53 words. The `recap` opening is 53 words in two sentences, one of them 31 words; split it.
- watch result (line 525): the first two sentences run 62 words including the 50% back brakes explanation, so the result opening is longer than the 45-word target; the cut is correct but the second sentence ("The back brakes of the third car did 50% ...") could go behind the mark.
- word-balance more-text (line 518), suggested cut: keep the first two sentences, drop "The game applies this rule only to the back tyres, so more braking at the front causes no slide, and the lever does not change the stopping distance."

##### Animations (rule 6, from the code)
- wonder: 3.15 s total (0.5 s wait, 0.6 s run-up, 1.32 s for the slower car, 0.7 s rest); two cars, the line and the clock move together. Replay R exists; no slow motion on this step. Needs about 8 to 10 s or two passes.
- watch: 4.05 s for three cars braking together with the back sliding on the third. Replay and slow motion exist. Quick; the instruction "watch the back of the third car" asks for two things at once.
- word-stopping 2.7 s, word-weight 2.7 s, word-deceleration 3.35 s: each shows a car, a tape or marks, and numbers or pads together. Replay and slow motion exist once finished, so fine as a first look, but half-second marks in word-deceleration appear three or four times and vanish quickly.
- word-energy: about 4 s from 200 km/h while blocks disappear on two cars. Replay is only by pressing Space again.
- try-speed, try-free, try-slide and alone runs: 1.6 to 3.3 s of one car braking; simple, fine quick.

##### Which steps give only an instruction, which define words (rule 8)
- Instruction only: wonder, watch, try-speed, try-free, try-slide, alone, three checks.
- Define words (go under Words so far): word-speed (km/h, m/s), word-stopping (stopping distance), word-deceleration (deceleration, passive drag), word-weight (weight shift, centre of mass), word-balance (brake balance, locking), word-energy (energy of motion, joule).
- word-balance defines "locking" only behind the mark; it has no notebook entry.

##### Other (rule 9)
- The word 'Metres per second' meaning says to change m/s into km/h "multiply by 3.6", while the step says to change km/h into m/s by dividing. Both are right but the same step uses both directions without saying so (line 108 versus line 163).
- check-balance question "Which of these brake balances lets the car stop with the back of the car in line behind the front?" uses 50/60/80 but the lesson's steady figure is 70. Nothing wrong, but a learner who remembers 70 finds no 70 card.

---

#### Suspension

Oldest style of the four: no MORE marks used well, wording is not three-sentence, and several pictures do not match the text.

##### Wrong, broken or contradictory (rules 7 and 9), most important
- Replay does not work. `actions: ['replay']` for wonder and watch (line 411) but `act()` (line 222) has no replay case. Checked by running it: `act('replay')` returns null and the step does not restart.
- Recap and KEY_IDEAS 'tradeoff' (lines 45-46, 392-393): the stiff spring "can pass bumps into the body and briefly lift a tyre". The rig's own readings: tyre contact on bumps is 93.1% for the stiff spring and 87.9% for the soft spring, so the soft spring loses contact more. The same recap card claim is therefore the wrong way round, and tyre contact is never taught.
- Roll angle is drawn on every step. `rollDeg` is always the selected spring's lean (6.5 or 2.2 degrees); on wonder, word-spring and the bump steps the body is drawn already leaning, with sideways arrows (suspension-board.js lines 132-133, 187-190) although no bend has been mentioned. Bumps and bend are drawn as one picture.
- The picture does not show the measured result: the body bounces with the same sin(time × 7) on soft and stiff (line 134-136), so it cannot show that the stiff spring shakes more (4.77 against 4.09 m/s²). Only the wheel moves differently.
- Sideways push arrows point outward from both sides of the car (board lines 188-189), which looks like a stretch, not one push.
- The recap card numbers are hard-coded text on the board: 4.09, 4.77, 6.5 and 2.2 (suspension-board.js lines 260-275, lesson lines 81-92, 333, 335). If the bench changes, the lesson goes wrong. The values currently match the bench (4.089, 4.772, 6.467, 2.164).
- wonder is titled "Why does the car lean?" but shows bumps over a wheel, and ends with "In a bend the body leans outward" without having shown a bend.

##### Hedging and caveats (rule 1)
- Title/comment line 1: "its simplified corner model". Check feedback: "The numbers come from this test: 6.5° ÷ 2.2° is about 3" (lines 92, 144, 334-335), "In this bend, the numbers come from this test" (line 353). The bend itself (0.8 g, 1,300 kg, 1.5 m track) is never named. The phrase "The numbers come from this test" reads as a caveat and says nothing.
- "about 3", "about a third" for a 2.99 ratio (6.467 ÷ 2.164); state "three times" or give the exact stiffness ratio (20,000 and 60,000 N/m, also 3 times).
- word-stiffness (line 312): "so it can make this car less comfortable" - "can" hedges the lesson's own result.

##### Maths words (rule 2)
- Step title "The roll sum" (line 28) and prompt "Check the worked sum" (line 336): the only calculation is a division of two results (6.5 ÷ 2.2). Call it "the comparison". The step carries no formula at all (`formula: ''`, line 145), so the roll rule (angle depends on weight, height, 0.8 g, track and the spring's stiffness) is never shown even though check-formula (line 112) asks about "the roll rule", and its hints say "Use the lesson words and the formula".
- "≈ 3" (line 144) and "about 3": use the equals sign and a full sentence.

##### Unclear tasks (rule 3)
- watch (line 359): "I am changing the spring and road settings. Watch the wheel, body, spring and readings as the rig moves." Four things to watch with no question.
- try-free (line 364): "Choose a spring and a road, then run the rig." No question or aim; the three rows are just readings.
- alone (line 371): "find a setup with less than 3° of body roll." The player has already seen 2.2° for the stiff spring, so there is only one answer, and road does not change roll (never said). The task is trivial and its reason (flatter cornering) is only in the title.
- guess-bumps comes before watch and before any run, and the player has no readings to predict from; the answer is given away in word-stiffness (line 311: "It sends more bump motion into the body") and in the first guess hint (line 350).
- guess-roll question (line 87): "In this bend" - no bend has been shown yet.

##### Repeats what the screen shows (rule 4)
- Hints line 355 and 368: "Use the arrows to choose a spring and road." Prompt line 366-367: "Choose settings and press Space to run." The key caps are drawn on the controls (suspension-board.js lines 204-218).

##### Too long (rule 5)
- recap opening is 59 words in three sentences; KEY_IDEAS and the recap talk a third time about the same two ideas. Cut the recap to the first two sentences and put the rough-road sentence behind MORE.
- word-stiffness (line 312): third sentence, "It sends more bump motion into the body ...", belongs behind MORE; it also gives away the guess.
- MORE is used for a five-word "more" ("The body rides above it.", line 306) and a six-word one (line 318); remove them.
- formula opening is 47 words, fine for length, but it is the answer to guess-roll shown after the guess.
- Every run's result text (line 196-198) adds "Tyre contact shows how much of the test the tyre touched the road: 87.88%" which is undefined, long and shown every run.

##### Animations (rule 6, from the code)
- wonder: 2 s, wheel and body bounce together; replay button shows but does nothing.
- watch: 3.2 s for four setting pairs, 1.2 s each (the last gets 0.8 s), while the spring, wheel, body, three readings and a table row change together. Needs about 8 to 10 s or two passes; replay shows but does nothing.
- Runs (Space on try-free and alone) are instant: the table row appears at once and nothing in the picture runs. The bounce in the picture is an endless loop that does not start or stop with a run, so a run looks like a button press, not a test.

##### Pictures (rule 7)
- See the first group: the body leans on every step; bounce is identical for both springs; both push arrows point outward.
- "LEFT SPRING COMPRESSES / RIGHT SPRING EXTENDS" labels are shown at all times, even with no bend.

##### Which steps give only an instruction, which define words (rule 8)
- Instruction only: wonder, watch, guess-bumps, guess-roll, try-free, alone, checks.
- Define words (go under Words so far): word-spring (Spring), word-stiffness (Spring stiffness), word-weight (Weight transfer), word-roll (Body roll), word-shake (Body shake). Not defined anywhere: tyre contact, "body-shake reading" (what is measured: the typical up-and-down acceleration over a 20 s run).
- formula and check-formula refer to a "roll rule" and "formula" that is never given.

##### Other (rule 9)
- word-weight (line 316-318) says "the car wants to tip outward" and "the outside tyres carry more load"; the cause is the height of the centre of mass, which is not named; "Weight transfer" and "body roll" are explained twice (word steps and KEY_IDEAS).
- guess-bumps wrong-answer text for "Both springs give the same reading" is the same as for "The stiff spring" apart from one clause; neither explains why the stiff spring shakes more (the model passes bump motion up through a 3 times stiffer spring).
- The lesson uses `rows` shared across try-free and alone; both reset on entering try-free only, so rows from try-free can appear under alone (line 183-184). Minor.
