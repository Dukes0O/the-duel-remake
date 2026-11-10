---
task: LAB-ROUND-NUMBERS
status: done
flag: lab-classroom
player_facing: yes
---

# LAB-ROUND-NUMBERS: round speeds in four Lab lessons

Claude, 9 November 2026. Card `docs/board/cards/LAB-ROUND-NUMBERS.md`, from the audit of 9 November
(item L4). Four helpers each changed one lesson from one written brief; Claude reviewed each result,
ran the checks and looked at the boards. No new switch, no save field, no game event, no new sound.

## What changed

The four lessons held their speeds in the game's miles per hour and showed the converted number.
Each now holds whole kilometres per hour, in tens, and works every result out from its own rule.

| Lesson | Before | Now |
| --- | --- | --- |
| Braking | dial 32 to 241 km/h; taught pair 80 and 161 | dial 30 to 240 in tens; taught pair 100 and 200; Brian's job answers 90, 150, 180 |
| Downforce | dial 80 to 241; fan at 161; watched 80, 161, 241 | dial 50 to 150 in tens; fan at 100; watched 50, 100, 150 |
| G-force | dial 16.1 to 241.4 in steps of 8.05; base turn 64.4 | dial 20 to 240 in tens; base turn 50, twice the speed 100, three times 150 |
| Fuel | race to 96.56 km/h, "about 97" | race to exactly 100 km/h |

- **Downforce's opening picture.** The green push arrow already pointed down. The white arrow for
  the air leaving the wing had no name, and the label "push" sat beside its tail. The white arrow is
  now labelled "air" and the push label sits beside the head of the green arrow.
- **Sentences removed** because the number is now exact: Braking's "Both readings are rounded to
  whole numbers, and the next step shows the exact figures" and "The dial rounds to whole numbers,
  which is why twice 80 reads as 161 here"; Fuel's "We round 96.56 km/h to about 97 km/h".
  Downforce's "about three times as fast" is now "three times as fast". "About" stays wherever
  the kilograms, metres or g shown are still rounded.
- **The panel's conversion sum is turned round** in Braking and Downforce: "m/s = km/h ÷ 3.6",
  starting from the exact dial reading. The old way round would show "27.78 m/s × 3.6 = 100.01".

## Decided while building (Claude)

- **Braking teaches with 100 and 200 km/h, not 50 and 100.** At 50 and 100 the stops show as 4.6 m
  and 18.2 m, and "4 × 4.6 m = 18.2 m" is wrong on a calculator. At 100 and 200 they are 18.2 m and
  72.8 m, and 4 × 18.2 = 72.8.
- **Braking: the gaps in Brian's job are 15, 45 and 60 m** (were 20, 50, 70), so the fastest speeds
  are 90, 150 and 180 km/h and "the third is twice the first" stays true.
- **Downforce: Brian's job needs 40 kg of push** (was 100 kg). The fan now runs slower, so the
  pushes are smaller: the steep wing gives 22, 87 and 195 kg at 50, 100 and 150 km/h.
- **The benches only take their own speed steps.** `brakingBench.run` and `downforceBench.run` snap
  a speed to steps of 10 mph, so they cannot be handed 100 km/h. Braking and Downforce now call the
  rule the bench itself runs on (`stopDistance` and `downforce` in `src/lab/benches/tunnel.js`) at
  the exact speed. No bench file changed.
- **The bench challenge passed inside the lesson.** Each bench's pass mark asks for runs at 50 and
  100 in the game's own unit. The lesson's taught pair (one speed and twice it) is handed over as 50
  and 100. The pass is reached by the same two runs as before, and the pass mark itself is unchanged.
- **G-force's faster turn is 150 km/h**, three times the base speed and nine times the reading
  (3.54 g). 75 is not on a dial of tens and 100 is already shown in the step before.
- **Fuel's time to 100 km/h** is the bench's own acceleration carried on from its 60 mph:
  bench time × (100 km/h in m/s ÷ the bench's speed). Forces and masses are the bench's.
- **Launch is left alone** (card, "Scope"): its dial steps in whole metres per second.
- **Left as results, not multiples of 10:** the car's top speeds (323, 300, 283 km/h), the Tune
  page's 161 km/h reference, and Braking's worked answer "90.8 km/h" in the job panel.

## Changed assertions (Claude's review, rule 18)

Two tests compared the lesson with a bench run at the same speed. That cannot hold for a dial in
km/h, because the bench snaps the speed. Each now checks more, not less:

- `test-lab-classroom-braking.mjs`: the bench's run equals `stopDistance` at its own six steps; the
  lesson's distance and time equal `stopDistance` at the exact speed for seven km/h speeds; the rear
  slide equals the bench's run at all six lever settings.
- `test-lab-classroom-downforce.mjs`: each lesson number equals `downforce()` at the exact speed, and
  a bench run equals `downforce()` on bench steps 50, 100 and 150.

Nothing is loosened: no assertion was deleted or skipped and no tolerance changed.

## Pinned numbers re-recorded (a deliberate change)

- **Braking:** stops 11.8 and 47.2 m became 18.2 and 72.8 m; speeds 22.35 and 44.70 m/s became 27.78
  and 55.56; dial readings, press counts, deceleration marks and the job's numbers follow. Reason:
  the taught pair is 100 and 200 km/h and the job has new gaps.
- **Downforce:** pushes 56, 225, 505 kg became 22, 87, 195; drags, scale readings, guess cards and
  the worked sums follow. Reason: the fan runs at 50, 100 and 150 km/h.
- **G-force:** readings 0.65 g became 0.39 g and so on; press counts 4 became 10 for the faster
  turn. Reason: base turn at 50 km/h, steps of 10.
- **Fuel:** times 3.16, 3.09, 3.03 s became 3.27, 3.20, 3.13 s; gaps 86 cm and 1.7 m became 92 cm
  and 1.8 m; the strip is 50 m wide (was 46). Reason: the race runs to 100 km/h.

## Checks

- New test in each lesson's own test file: every speed in km/h that the lesson shows or lets the
  player set is a multiple of 10.
- The lessons' own test files: Braking 25 of 25, Downforce 24 of 24, Fuel 23 of 23, `test-lab-classroom.mjs` (G-force) 65 of 65,
  `test-lab-brian-short.mjs` 6 of 6.
- Lane tier from PowerShell (`--tier lane --changed --jobs 4`): 45 passed, 0 failed, 0 not run. The
  first run had one failure and two not run while helpers' test runs were still closing; the rerun
  on the same files passed (rule 3).
- `npm run build`: passed.
- Browser checks: all 23 `lab-*` scenarios pass (`--jobs 3`). Braking's was run again after the label fix below and passes.

## Seen in the browser (Claude)

Read from the browser checks' pictures at 1920 by 1000, one or more boards in each changed lesson:

- **Downforce, opening step:** the white arrow reads "air", and "push 53 kg" sits beside the green arrow that points down onto
  the car. The scale and its bar agree.
- **Braking, twice the speed:** the dial reads 200 km/h and the panel shows 72.8 m ÷ 18.2 m = 4.00. Two distance labels printed
  over each other at the far end of the strip; the label at the car is now left off when the stop is that far along, since the
  reading on the right gives the same distance. Brian's job and the recap read correctly.
- **G-force, the faster turn:** 150 km/h reads 3.54 g and the three recorded turns show 50, 100 and 150. The meter's bar ends at
  3.5 g, so it shows full at this reading.
- **Fuel, the three-car race:** all three cars reach 100 km/h in 3.13, 3.20 and 3.27 s and stay on the strip.

No frame check (rule 9: lesson boards and text).

## Removed

The converted speeds, the three sentences that explained an odd number, `ABOUT` and `ABOUT_KMH` in
the Fuel lesson, and the names `K50`, `K100`, `S50`, `S100` in Braking (now `K_SLOW` and so on).
