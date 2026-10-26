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
