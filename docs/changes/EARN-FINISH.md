# EARN-FINISH evidence for Claude

Status: four evidence checks complete; Claude keeps the finishing verdict and release decision.
Branch: `codex/earn-finish-prep`. Source: `8306d850`.
Kind: evidence and documents only. No game code, config, save rule or switch state changed.

## 1. Ladder pacing

Two separate memory-only careers use the production `App`, its race simulation,
settlement and car purchases. `earned-cars`, `grand-prix` and
`grand-prix-career` are enabled only in these checks. `helicopter` is explicitly
disabled for pacing; its transport rule is checked separately below.

The driver uses the existing headless autopilot, with its deliberate demo crash
disabled, at 60 updates per second. Pacific Canyon, Arcade, seed 1989 and field
seed 1989; ordinary Duel has two laps and Grand Prix has three. If the driver
loses, try subsequent seeds and count only actual wins toward the ladder.
Courses are owned in the test fixture; cars start with the two free starters,
zero credits and no upgrades. Cars are bought with actual race earnings,
cheapest first. No finish, rival pace, credit balance or medal is fabricated
in the pacing runs. These are automated winning paths, not measurements of a
child's or parent's real win rate.

| Career | Ferrari Enzo | McLaren F1 | Bugatti Bolide |
| --- | ---: | ---: | --- |
| Child: Easy, Duel and Grand Prix | 6 wins | 21 wins on the extended buying path | Unreachable on Easy; still locked after 38 wins |
| Parent: Medium/Hard, Duel and Grand Prix | 6 wins | 15 wins | 24 wins, including 12 Hard wins |

The child wins once in each Easy box of both starters, then buys the Falcone
Heritage for 1,800 credits after win 4. Its two Easy medals earn the Enzo on
win 6. That meets the 6–10-win target.

With three purchases (Heritage, Aurora, Dusthawk), the child reaches 12 medals
at win 12 and has 5,620 credits. The F1 is still locked. Continuing beyond
"a few purchases": buy the Banshee after win 12, then repeat six already-won
Falcone Duel races to afford the 7,500-credit Viper after win 20. Its first
Easy win earns the F1 on win 21: 15 medals, five purchases. Repeated wins pay
normal credits but do not create extra medals.

The extended child check buys the Titan after win 34 and exhausts every Easy
box available from ordinary cars, Enzo and F1: 38 wins, 20 medals, zero gold,
Bolide still locked. The six-Hard-medal requirement cannot be bypassed by
Easy wins or more money. The three-purchase path cannot reach the F1 without
another car or a higher difficulty.

The parent earns the Enzo using only the starters (win 6, attempt 11,
6 medals / 2 gold). It buys Heritage for 1,800 credits after win 8, earns
the F1 on win 15 (attempt 40, 15 medals / 7 gold), then buys Aurora for
2,200 credits after win 16. The Bolide arrives on win 24 (attempt 54,
24 medals / 12 gold). There are 30 losses in the full parent run; losses
never fill a box. No upgrade purchases or artificial credits are used.

Tuning recommendation: keep `6`, `15`, and `24` with `gold: 6`. Both first
rewards land at six wins; the second needs another car or harder rivals;
Easy cannot reach the third. No step is clearly outside the stated target,
so no alternative config numbers are proposed or applied. The F1's five
purchases and six repeat wins on the Easy path are a useful design tradeoff
for Claude to judge, rather than a counting fault.
These counts assume Grand Prix career is enabled; they do not claim the same
pacing with that row closed.

Raw career rows, purchases, award counts and disposable profile checkpoints:
`.evidence/2026-10-26/EARN-FINISH/child-{checkpoint,summary}.json` and the
corresponding `parent-` files. Each award records cumulative wins, attempts,
purchases, medals and gold.

## 2. Screens at 1280 × 720

Comparison sheet: `docs/board/looks/earned-cars-ui/look-1.jpg`, 1920 × 1168,
250,028 bytes (under 500 KB). Each cell preserves the source image's aspect
ratio. Raw captures are in `.evidence/2026-10-26/EARN-FINISH/`:

- `medal-sheet.png`: full starter sheet; bronze, silver and gold, both rows,
  six filled boxes, repeated Easy wins shown as `3 WINS`.
- `locked-car.png`: Bolide at 6/24 medals and 2/6 gold, no Buy button, with
  the Tremblant Woods delivery note.
- `results-lines.png`: new gold medal (+375 CR), new Enzo, and helicopter
  delivery line. The medal bonus is listed once.
- `menu-check/menu-picker.png`: real expanded native picker, all three
  locked cars and the 6 / 15 / 24-plus-6-gold requirements.

The production QA entry installs isolated memory storage before the game
loads. Private ports: 5681 (sheet, locked page and results), 54548 (picker).
Both browser runs passed with zero errors and zero warnings. The screenshot
fixtures seed medals to show each screen clearly; they are separate from
the actual simulated careers above. Results use the existing finish-line
fixture through the real simulation's `_finishStage` and App settlement.

Visual finding: medal colours are distinct, progress wording is clear, and
none of the four requested areas overlaps. The garage and results page need
vertical scrolling at 720 pixels; the captures deliberately frame the medal
panel and reward lines. Selecting a locked car in the menu opens its garage
page, as designed; the picker capture opens the menu without selecting it.
Claude still judges the look. No frame measurement was run.

## 3. Results sound

Two existing tests passed:

```powershell
node --test --test-name-pattern='switch on:|the medal event' tools/test-earned-cars-ui.mjs
```

The production App emits one medal event for a new medal and none for a
repeat win in that box. The EngineAudio test records exactly one
`interface.bonus` call for that event and zero for an empty event.

The browser result awards both the sixth medal and the Enzo. An event spy
records one medal/bonus event across the first settlement and five repeated
`_settleResult` plus `onFrame` calls, while all three reward lines remain
visible. `ui-findings.json` records `bonusCount: 1`. This is a cue-dispatch
check; Chrome is muted, and no listening-quality verdict is claimed.

## 4. Helicopter location

A short memory-only scripted check reuses the existing pilot and
`flightToPanorama` recipe in `tools/test-heli-mode.mjs`, substituting the real
Ferrari Enzo for the Falcone. The pilot uses normal helicopter controls,
hooks the Enzo at Tremblant Woods, cruises to Panorama Ridge, sets it down
and releases it. The production session remembers its new location.

The App has both `earned-cars` and `helicopter` enabled and owns both test
courses. Before flight, the Enzo's default location is Tremblant Woods:
START succeeds there and is refused at Pacific Canyon. After delivery,
START succeeds at Panorama Ridge and is refused at both Tremblant Woods and
Pacific Canyon. The flight's 21 existing assertions pass, including clean
release, persisted location, no crash and no repair charge; six additional
App/location assertions pass. It ends with 120.7 kg of fuel and unchanged
3,000-credit flight-fixture funds. `flight.json` records the events,
fingerprint and START checks. This checks the actual carry path, not just a
hand-edited `carsAt` value.

## Checks and boundaries

- No real player save was read, reset or written.
- `earned-cars` remains at its existing repository state.
- No frame timing, live checkout access, merge or push.
- No game fix or changed test assertion; lane tier and production build are
  not required for this evidence-only change. The browser QA build passed.
- Board: 173 checks passed. The first placement check rejected the sheet's
  `finish-ui.jpg` filename; renamed it to the existing allowed `look-1.jpg`
  convention in its own UI family, without changing any check.
- Final placement and whitespace checks passed. `build-status.mjs` refreshed
  the required status snapshot; its full-tier result is stale, and no new
  full-tier or release pass is claimed.
- Required Cockpit sync ran through the protected runner: zero tasks
  changed. It flagged unrelated `HELI-CARRY-CLEAR` as lacking a Cockpit task;
  no other card or task was changed here.

## Removed

The incorrect first picker capture was recycled; it had opened the locked
garage page. Temporary capture and simulation scripts and the generated QA
bundle are recycled after use. The four useful captures and JSON findings
remain for Claude's review; the one comparison JPG is committed.

## Night pass, 28 October 2026 (Claude helper, on integration 3f3d0420)

Kind: evidence and documents only. No game code, config, save rule or switch
state changed, so no lane tier or build was needed. Claude keeps the tuning
and go-live decision and the frame checks. The first pass above counted a
perfect player (every race a win). This pass adds a realistic spread of
wins and losses, and repeats the screens, sound and fly-in checks on the
current branch. The Grand Prix career is on in the game now, so the Grand
Prix row counts below.

### 1. Ladder count with a realistic win spread

How it was run. A scratch script plays whole careers through the game's own
`settleRace` (the same credits, medal counting, car prices and earned-car
grants the game uses), so every number below comes from the real rules. Only
the race itself is replaced by a dice roll. Nothing was saved and the script
was deleted afterwards. 1,000 careers per row, seeded.

Assumptions (all mine, none measured from a real player):

- Pacific Canyon, Arcade. A Duel is 2 laps; a Grand Prix is 3 laps against 8
  cars. A lost Grand Prix finishes 2nd to 6th. Only a first place counts.
- No upgrades are bought; credits go on cars only. The player buys the
  cheapest car they can afford, up to a limit ("a few" is 3 purchases, "all"
  is no limit).
- Child: Easy only. Wins about a third of races at first (33 percent),
  gaining 1.2 points per race played, capped at 80 percent. 40 percent of
  races are Grand Prix.
- Parent: Medium and Hard, half each, half the races Grand Prix. Medium
  starts at 55 percent and Hard at 30 percent, gaining 1 point per race
  (caps 85 and 70 percent).
- "Random" means the player picks any owned car each race, with no thought
  for empty boxes. "Chasing" means the player always picks a box still
  empty. A real family sits between the two.

Won races needed to earn each car (middle of 1,000 careers, with the range
that covers 8 careers in 10 in brackets). "Races" is all races played,
losses included. A dash means the car was never earned in 700 races.

| Player and choices | Ferrari Enzo (6 medals) | McLaren F1 (15) | Bugatti Bolide (24, 6 gold) |
| --- | --- | --- | --- |
| Child, random cars, 3 purchases | 10 wins (7 to 14), 22 races, 2 bought | never | never |
| Child, random cars, buys all | 10 wins (7 to 14), 22 races | 45 wins (35 to 55), 67 races, 6 bought | never (Easy has no gold) |
| Child, chasing empty boxes, buys all | 6 wins, 14 races | 27 wins (24 to 30), 44 races, 5 bought | never |
| Parent, random cars, 3 purchases | 7 wins (6 to 9), 14 races, 3 bought | 23 wins (19 to 29), 38 races | 54 wins (43 to 69), 78 races |
| Parent, random cars, buys all | 7 wins (6 to 9), 14 races | 21 wins (18 to 24), 34 races, 5 bought | 38 wins (33 to 46), 57 races, 6 bought |
| Parent, chasing empty boxes | 6 wins, 12 races | 15 wins, 27 races | 24 wins, 39 races |

The "parent, chasing" row matches the first pass exactly (6, 15 and 24 wins),
which confirms the model against the real-race run.

Reading against the targets:

- **Car 1** is inside the target for a child who chases boxes (6 wins) and at
  the top of it for one who picks cars at random (10 wins, up to 14 in 1
  career in 10). Fine as it is.
- **Car 2** needs a new car or harder rivals, as designed. A child on Easy
  only needs 5 or 6 purchases (about 20,000 credits of cars) and 27 to 45
  wins, which is the slowest step in the ladder for a child. A parent needs
  15 to 24 wins. I do not call this clearly off, because Easy-only is an
  extreme and the design wants the second car to reward harder rivals. If
  Kyle sees a child stall here, the lever is the second number only (see
  below).
- **Car 3** is out of a child's reach on Easy by design (Easy has no gold). A
  parent gets there in 24 to 69 wins. A long goal, as intended.
- With the Grand Prix row closed (no longer the case, the switch is on) a
  child on Easy needs 4 purchases and about 28 wins just for the Enzo, and a
  child with only 3 purchases never gets it. So the Grand Prix career must
  stay on when the earned cars go live. Parent, Duel row only: Enzo in 9 wins,
  F1 in 36 wins with all purchases, Bolide never in 700 races.

Medal numbers: **no change made or proposed as necessary.** One option for
Claude to weigh, tested but not applied (child and parent, 400 careers each,
F1 medal count only):

| F1 earned at | Child, buys all | Child, 3 purchases | Parent, buys all |
| --- | --- | --- | --- |
| 15 (today) | 45 wins, 6 bought | never | 21 wins |
| 13 | 32 wins, 5 bought | never | 17 wins |
| 12 | 28 wins, 5 bought | 39 wins (25 to 63) | 15 wins |

Lowering the F1 to 13 trims about a quarter off the child's wait and a few
wins off the parent's, and still needs a fifth car. Going to 12 lets a child
with three purchases reach it, but only by filling every box on six cars, so
the median is still 39 wins. The gap between the Enzo (6) and the F1 would
shrink to 6 or 7 medals, which feels quick for a prize. My view: keep 15
unless Kyle's son stalls. If Claude changes it, it is a one-number tuning
change in `src/config.js` with the lane tier.

### 2. Screens at 1280 by 720

Taken with the harness on a private port (random port above 5191, 55708 on
the last run), memory-only saves, `earned-cars`, `grand-prix-career` and
`helicopter` on. The test page's own grey "temporary saves" boxes were hidden
so they do not cover the pictures. The pictures are git-ignored and kept in
`C:\Users\kyleb\.codex\worktrees\wasteland-integration\the-duel-remake\.evidence\2026-10-28\EARN-FINISH\`:

- `1-sheet-panel.png`: the medal sheet on the Falcone F42 with bronze, silver
  and gold, win counts, one empty Grand Prix gold box ("WIN ON HARD") and the
  line "ALL CARS: 5 MEDALS · NEXT CAR AT 6".
- `2-locked-enzo.png` and `3-locked-bolide.png`: the locked pages. "EARNED,
  NOT BOUGHT", the car's name, "Win medals with any of your cars. Each new
  medal also pays credits once.", the Kestrel One line, bars of 5 / 6, or 5 /
  24 medals and 1 / 6 gold, and "Unlocks the moment you reach it. No
  credits." No Buy button.
- `4-locked-list.png`: the garage car list with "MEDALS 5/6", "MEDALS 5/15"
  and "MEDALS 5/24 · GOLD 1/6" in place of prices.
- `5-menu-picker.png`: the menu car picker opened out so every choice shows:
  the three earned cars read "LOCKED · MEDALS 5/6", "5/15" and "5/24 · GOLD
  1/6". The count reads 01 / 12. (The browser's own drop-down cannot be
  photographed, so the list box was opened in place.)
- `6-results-lines.png`: a Hard Rival Duel win that fills a new gold box and
  earns the Enzo. Three lines under the bonuses: "NEW MEDAL · GOLD ·
  STUTTGART 959-S · DUEL · HARD · +375 CR", "NEW CAR EARNED · FERRARI ENZO ·
  IN YOUR GARAGE", "KESTREL ONE WILL BRING IT TO TREMBLANT WOODS". The medal
  shows once and is not repeated in the bonus list.

Findings. Nothing overlaps or runs outside its panel (the scripted checks
found every box inside the garage panel and no sideways overflow; the
results lines are 15 pixels high, one line each, 26 pixels apart). The words
are plain and no label reads "undefined". Small points for Claude to judge:

- The medal lines on the results screen are tiny (the same small tan type as
  "CLEAN RACE +150") and the medal colour appears only in the word, never as
  colour. A new car is a big moment, so a larger or coloured line could suit
  it better.
- The sheet and the locked unlock card sit well down the garage page, so a
  child has to scroll at 720 pixels to find them. The card is below Paint,
  Roof Look and Specialist Drivers.
- The result text in this picture mentions "Unlock High Country Grand Tour
  for 900 CR". That is the ordinary next-course message for a test player
  who owns only one course, not part of this feature.

### 3. Sound

`interface.bonus` plays once per results screen. By code: `settleRace` runs
once per race (a repeat is refused by `settledResults`); in `src/app.js` the
one call `this.audio.event({medalEarned:true}, ...)` fires only when a new
medal or a new car came out of that settlement; `src/audio.js` turns that
event into the single `interface.bonus` cue. A medal and an earned car in the
same race give one event, not two. By test: `tools/test-earned-cars-ui.mjs`
(5 passed) records one cue for a new medal, none for a later win in the same
box, none with the switch off, and none for an empty event. By a real
screen: in the scenario above, the results screen with a gold medal and the
Enzo showed three lines and the event counter read 1 after four more screen
redraws. This checks the cue is sent, not how it sounds (browser muted).

### 4. Fly one in

With `helicopter` on, all three earned cars wait at Tremblant Woods and race
only where Kestrel One set them down. A scratch copy of the existing
headless flight in `tools/test-heli-mode.mjs` was run for each earned car in
turn (hook at the home pad, cruise to Panorama Ridge, set down, release),
with the game's own start check (`airOnlyNote`, the check the menu uses to
refuse a start):

| Car | Weight | Before the flight | After setting it down at Panorama Ridge |
| --- | --- | --- | --- |
| Ferrari Enzo | 1,365 kg | at Tremblant Woods; start allowed there, refused at Pacific Canyon, Tremblant Snow and Panorama Ridge | at Panorama Ridge; start allowed there, refused at Tremblant Woods and Pacific Canyon |
| McLaren F1 | 1,140 kg | same | same |
| Bugatti Bolide | 1,450 kg | same | same |

With the helicopter switch off the check allows every course, as the game
did before. The flight's own checks passed for all three cars: car hooked
and lifted, cruise leg paid in fuel (120 kg), delivered at Panorama Ridge,
no crash, no repair charge, credits unchanged. The existing suites also
passed on this branch: `test-heli-mode` (184 checks), `test-heli-jobs` (5,927
checks), `test-medals` (11) and `test-earned-cars-ui` (5).

One thing to know: with the same scripted pilot, the Enzo and F1 touch down
softly (the "set-down" event), but the Bolide, the heaviest at 1,450 kg,
touches down inside the zone at about 1.1 metres a second, just over the 1
metre a second line for a "gentle set-down". It was still delivered cleanly
with no damage and no charge, so this only matters if a lesson or bonus
needs the gentle event. A human pilot slowing near the ground would pass it.
It is a test pilot limit, not a game fault, but worth knowing before the
Bolide is described as easy to carry.

### Checks and boundaries

- No real player save was read or written; every career and browser run was
  memory-only. No frame timing was run; the three frame checks stay with
  Claude.
- No game code, config, save rule or test assertion changed. The scratch
  simulation, the scratch fly-in script and a temporary browser scenario were
  deleted afterwards. The browser build bundle the harness made was
  recycled by the harness.

### Removed

Nothing replaced. The temporary scenario file `tools/scenarios/zz-earn-finish-night.mjs`
was removed before the commit.
## Claude's decisions built, 28 October 2026

Three decisions from Claude after the night pass, built in the same lane.
`earned-cars` stays at dev; Claude switches it on after the frame checks.

### What changed

1. **The McLaren F1 is earned at 12 medals, not 15** (`src/config.js`, the one
   number). Reason: at 15 an Easy-only child with three purchases never got
   it; at 12 that child gets it in about 39 wins, and a parent can earn it
   with no purchase (the two starters' full sheets make exactly 12). Docs
   updated: `docs/EARNED_CARS.md` (ladder table, section 4.1 prose, the
   garage example line, section 5.2 and 5.1), `docs/HELICOPTER.md` (the F1
   row), `docs/board/cards/EARN-CAR-2.md` (title, numbers and the config
   line). Historic notes in older change files still say 15; they record what
   was true then.
2. **Results screen** (`src/earned-cars-ui.js`, `src/screen-results.js`,
   `src/screen-results.css`). A newly earned car gets its own card: "NEW CAR
   EARNED", the car's name at 25 pixels italic bold (the same as the race time
   numbers), and a line under it: "Earned with 6 medals. Kestrel One will bring
   it to Tremblant Woods." with the helicopter on, "Earned with 6 medals. In
   your garage now." with it off (the Bolide reads "24 medals, 6 of them
   gold"). The new-medal line gets a small bronze, silver or gold dot before
   the text. To keep the Unlock button on screen at 1280 by 720, a results
   screen that shows a car card takes the same smaller headline the Grand
   Prix results use and a slightly tighter metrics block. The sound cue is
   unchanged: one `interface.bonus` per results screen.
3. **Garage chip** (`src/earned-cars-ui.js`, `src/screen-garage.js`,
   `src/screen-garage.css`, `src/screen-router.js`). A small chip under the
   build name: "MEDALS 5/6 · NEXT CAR AT 6" ("NEXT CAR AT 24 WITH 6 GOLD" for
   the last car, "EVERY EARNED CAR WON" once all three are owned). Clicking it
   scrolls to the medal sheet. It shows only with the switch on and on an
   owned car. Drawing only; the router line only scrolls.

### Changed assertions, with reasons

- `tools/test-medals.mjs`, "the real F1 is earned on the twelfth medal": the
  eleven-medal fixture, the failure text ("12 medals needed, you have 11."),
  the totals (11 medals and 3 gold before, 12 and 4 after) and the test name.
  Reason: the F1 now needs 12. Same checks as before (not earned early,
  earned on the threshold, free, fully tuned, kept when the sheet empties).
- `tools/test-earned-cars-ui.mjs`: "NEXT CAR AT 15" is now "NEXT CAR AT 12"
  (the next car in the garage is the F1). The old check that listed the car
  lines inside `medalResultLines` (five lines with the helicopter on, three
  with it off) is replaced: `medalResultLines` now returns only the medal
  line, and a new `earnedCarCards` is checked for the Enzo, the Bolide's gold
  wording and both helicopter settings. Reason: the car lines moved into the
  card. New checks added: the chip's wording, that it is present with the
  switch on and absent with it off.
- `tools/test-lab-fan.mjs` and `tools/test-sirena-car.mjs`: both compare every
  earlier car with an old commit's config. They now apply the one known
  difference (the F1's medals 12 instead of 15) to the old data before the
  exact comparison; every other value, the order and the car list are still
  compared exactly. Reason: these guards prove a new car changed nothing
  else, and the F1 number is an intended change.

### Pictures (git-ignored, memory-only, 1280 by 720)

In `C:\Users\kyleb\.codex\worktrees\wasteland-integration\the-duel-remake\.evidence\2026-10-28\EARN-FINISH\`:

- `6-results-lines-v2.png`: a Hard Duel win in the Stuttgart: the gold dot line
  and the Ferrari Enzo card with the Kestrel One line. The whole screen fits:
  the Unlock button spans y 601 to 663 and Restart and Main Menu end at about
  y 717, with no scrolling. The scripted check found no overlap between the
  headline, text, bonus lines, card and buttons.
- `1-sheet-panel-v2.png`: the garage top with the chip under "Falcone F42".
- `2-garage-after-chip-v2.png`: after clicking the chip, the medal sheet is in
  view (checked by script).

For comparison, before this change the same results screen was already 848
pixels tall, so the Unlock button sat below the fold; it is now 749 tall with
the card. The old pictures (without `-v2`) are from before and can be deleted.

### Gates

- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`: 80
  of 81 suites passed on the final tree. The one failure,
  `tools/test-deep-kelp-coast.mjs` ("route_a: reached 0 of 3082 m", the
  Kelp Coast journey drive), is not from this change: it fails the same way,
  twice, on a clean copy of the starting commit 3f3d0420. It was not touched
  here and needs its own card.
- The first run also failed `tools/test-lab-fan.mjs` and
  `tools/test-sirena-car.mjs`, because they pin the F1's old number. Fixed as
  listed above, both pass.
- `npm run build` passed (output deleted afterwards).
- The browser scenario `earned-cars` (garage sheet and results medal line)
  still passes, and the medal and earned-car suites pass (`test-medals` 11,
  `test-earned-cars-ui` 5).

### Removed

The temporary scenario file `tools/scenarios/zz-earn-finish-v2.mjs`, the
clean-copy folder used to test the starting commit, and the build output were
removed. Nothing in the game was replaced; the two old car lines on the
results screen are replaced by the card.