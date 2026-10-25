# Earned cars and medal sheets

Design packet for Cockpit task T-013, written 14 October 2026 by Claude.
Some cars are earned by winning races, never bought. Each car keeps a medal
sheet of its wins, and medals from all your cars earn the next car. The
cards are in section 9; Kyle's answers are in section 10.

## 0. What the game does today (checked on integration 1599a001)

- **The Jesko is the one earned car.** `src/config.js` gives the Koenigsegg
  Jesko Absolut `unlockRequirement: 'max-all-other-cars'` and
  `factoryMaxed: true`. `completionCarProgress` in `src/progression.js`
  counts every other car in `CARS` that is owned with all seven upgrades at
  level 3. `grantCompletionCars` adds the Jesko to `unlockedCars` (with Axel
  Storm, `docs/DRIVERS.md`) after an upgrade purchase and on every load. It
  has no price, and once earned it stays owned even if the roster grows.
- **Any car with an `unlockRequirement`** is left out of `CAR_PRICES`, and
  the paint, race settings and Yeti code treat it as owned only when it is in
  `unlockedCars`. The garage shows its progress ("MAX OTHER CARS 7/8") in
  place of a price.
- **Wins.** `settleRace` settles each run once (`settledResults`), after its
  checks for abandoned, practice, duplicate and invalid finishes. A win is
  `result.won && isValidFinish(result)`. The CPU difficulty is `easy`,
  `medium` or `hard`. A Grand Prix win is first place, settled only when the
  `grand-prix-career` switch is on (dev today).
- **Saved history** keeps 60 rows with the car, the win and the CPU
  difficulty, but not the mode, so an old Grand Prix win cannot be told from
  a Duel win. The Grand Prix podium set (P4-CAREER) counts only from the day
  it shipped for the same reason.
- **Medal cars travel only by air** (`docs/HELICOPTER.md` section 5).
  `AIR_ONLY_CARS` in `src/heli/heli-jobs.js` holds medal cars and the restored
  Sirena. With the helicopter on, they race only where last set down. Medal
  cars start at Tremblant Woods; the Sirena starts at Pacific Canyon.
  Kyle, 25 October 2026: the Jesko races everywhere again, in every mode.
  Kestrel One lifts at most 1,500 kg.
- **A Grand Prix in a car outside the road class** (the Jesko, the Titan)
  fills the field with copies of the player's own car (`chooseCars` in
  `src/race-field.js`), so an earned car's model is drawn eight times.

## 1. Kyle's direction

- T-013: "Earned cars: medal sheets (wins, difficulty levels, Duel and Grand
  Prix)". Builds on how the Koenigsegg unlocks. Touches saves.
- 25 October: the Jesko leaves the air-only list. Medal cars and the restored
  Sirena keep the fly-it-there rule. This replaces the 14 October Jesko rule.
- Keep it small and fun for a parent and a child taking turns on one
  keyboard. Existing saves never lose a car or credits.
- 14 October, on this packet: the three cars are confirmed (Ferrari Enzo,
  McLaren F1, Bugatti Bolide), and medals earn credits too, "because it's
  still time that's being spent" (section 2.1).

## 2. The medal sheet

Every car has a medal sheet for each named player: six boxes, two rows and
three columns.

|  | Easy | Medium | Hard |
| --- | --- | --- | --- |
| **Duel** | bronze | silver | gold |
| **Grand Prix** | bronze | silver | gold |

- A box fills with its medal the first time you win that kind of race at
  that CPU difficulty in that car. The colour comes from the difficulty:
  Easy bronze, Medium silver, Hard gold.
- The box also counts your wins there ("3 WINS"), so a child sees each win
  land even after the medal is in.
- A full sheet is six medals. With today's nine cars a player can hold 54.
- Medals change no race. They count toward earned cars, show on the sheet
  and pay a one-time credit bonus (2.1).

### 2.1 Credits for medals (Kyle, 14 October 2026)

Every win already pays its normal credits, in every car, earned cars
included; medals take nothing away from that. On top, **each new medal pays
once**, a quarter of that difficulty's win pay:

| Medal | Difficulty | Win pay today | Medal bonus |
| --- | --- | --- | --- |
| Bronze | Easy | 600 | 150 |
| Silver | Medium | 1,000 | 250 |
| Gold | Hard | 1,500 | 375 |

- Paid in the race that fills the box, as its own line in the race's pay
  (`breakdown.medal`), the same way a milestone award is paid: not doubled by
  Pro, not scaled by laps, and like every race earning it can cover a police
  fine from that race.
- Later wins in the same box pay their ordinary race credits only.
- A full sheet pays 1,550 credits in bonuses; today's nine cars 13,950; all
  twelve cars 18,600. A Titan costs 12,000, so medals help a player buy cars
  without flooding the garage.
- Earning a car pays nothing extra: the car is the prize.
- In the separate Wasteland career (Mad Max Duel after the gate is found)
  race pay is scrap and credits are held at zero, so a medal there counts on
  the sheet but pays no credits, as that career's races already do.

## 3. What counts as a win

A win counts once, inside `settleRace`, after all of its existing checks,
when the `earned-cars` switch is on:

- **Duel row:** a won race in any mode except Time Trial and Grand Prix.
  That is Rival Duel and Mad Max Duel, and the one-car events (chase, drift,
  stunt and checkpoint), which already call a met objective a win.
- **Grand Prix row:** first place in a Grand Prix (needs the
  `grand-prix-career` switch, which settles Grand Prix results).
- **Never counted:** a loss, an abandoned or invalid race, a repeat of a run
  already settled, a practice course, qualifying, a Time Trial (which can
  carry a win for beating par).
- The car is the car you raced. The difficulty is the CPU difficulty of the
  race. The transmission (Arcade or Pro) does not matter.

## 4. The earned cars

### 4.1 The ladder

Three new cars, each earned by medals from all your cars together (an earned
car's own sheet counts too):

| Car | Earned at | The car (Kyle confirmed, 14 October) |
| --- | --- | --- |
| Earned car 1 | 6 medals | Ferrari Enzo |
| Earned car 2 | 15 medals | McLaren F1 |
| Earned car 3 | 24 medals, 6 of them gold | Bugatti Bolide |

How fast that comes, for a new player with only the two starter cars:

- **Car 1** with no purchase: win on Easy and Medium in a Duel and on Easy in
  a Grand Prix with both starters. About six good races. Until the
  `grand-prix-career` switch is on, the Grand Prix row cannot fill, so the
  starters alone reach 4 medals (6 with two Hard wins), and car 1 needs a
  third car or Hard wins. The first prize
  comes early, so a child feels the system work.
- **Car 2** needs more than two cars or some Hard wins: the starters' full
  sheets make 12. It rewards trying new cars and harder rivals.
- **Car 3** needs six Hard wins, in six different car and row pairs. It is
  the long goal; a parent can reach it, and a child grows into it.

Each named player earns their own cars; medals are never shared. Turns on one
keyboard work as today: pick your player, then race.

### 4.2 Rules for every earned car

- **Earned, never bought.** No price and no Buy button. It joins
  `unlockedCars` the moment the medal count is reached: after the race that
  earns it, or on load for a save that already has the medals. Once earned it
  stays owned, even if a rule or number changes later.
- **Arrives fully tuned,** like the Jesko (`factoryMaxed: true`). There is
  nothing to upgrade, so no credits are ever spent on it, and a save rolled
  back one release loses nothing that cannot come back (section 6.4).
- **Travels only by air.** Every earned car joins `AIR_ONLY_CARS`. With the
  `helicopter` switch on it waits at Tremblant Woods and races only where
  Kestrel One last set it down. So every earned car weighs **1,500 kg or
  less** (its real weight, if lighter). That rules out heavy cars such as the
  Bugatti Chiron (about 2,000 kg) until a bigger lift exists.
- **Real name, original model.** Like the Jesko: the real car's name, an
  original model built in code from the maker's public pictures, used as a
  viewing reference only. No downloaded model, texture, badge or logo.
- **Speed in the ladder.** Fully tuned top speed close to the real car's,
  as the Jesko's is (a base value that the tuning raises by 10.5%):

  | Car | Fully tuned top speed | Between |
  | --- | --- | --- |
  | Earned car 1 | about 218 mph | a stock F42 (201) and a tuned Aurora (236) |
  | Earned car 2 | about 240 mph | a tuned Aurora (236) and a tuned Viper (256) |
  | Earned car 3 | about 300 to 315 mph | a tuned Viper (256) and the Jesko (329) |

  The Jesko stays the fastest car in the game. Each car card settles the
  exact numbers in writing before its code.
- **The Jesko keeps its rule.** It still asks for every bought car fully
  tuned: the two starters and the six cars with a price, eight cars, as
  today. Earned cars never join that list, so a new car never makes the
  Jesko harder. Existing Jesko owners keep it and Axel.
- **Drawn eight times.** A Grand Prix in an earned car fills the field with
  its copies (section 0). Each model stays within the Jesko's size (73,600
  triangles and 66 draws) and passes the frame check in a Grand Prix.

## 5. What shows on screen

### 5.1 The garage (the car screen)

- **Medal sheet panel,** on every owned car, under the stat bars: the six
  boxes in two rows (DUEL, GRAND PRIX) and three columns (EASY, MEDIUM,
  HARD). A won box shows the medal disc in its colour with the win count; an
  empty box shows a faint ring and "WIN ON MEDIUM". Under it, one line for
  all cars: "ALL CARS: 11 MEDALS · NEXT CAR AT 15".
- With the `grand-prix-career` switch off, the Grand Prix row reads "OPENS
  WITH THE GRAND PRIX CAREER" and its boxes stay empty.
- **Car list:** an earned car not yet earned shows "MEDALS 4/6" in place of
  a price, as the Jesko shows "MAX OTHER CARS". Car 3 shows "MEDALS 20/24 ·
  GOLD 4/6".
- **Locked earned car page:** the unlock card says "EARNED, NOT BOUGHT", the
  car's line, "Win medals with any of your cars", a progress bar of medals
  (and gold for car 3), and "Unlocks the moment you reach it. No credits."
  With the `helicopter` switch on it adds "Kestrel One brings it to
  Tremblant Woods."
- **Owned earned car:** the Jesko's fully tuned note, worded "MEDAL REWARD ·
  arrives fully tuned. No upgrades needed."
- The Jesko's own card and progress stay exactly as today.

### 5.2 The results screen

- **New medal** (a box filled for the first time): one line under the
  bonuses, "NEW MEDAL · SILVER · AURORA GTR · DUEL · MEDIUM · +250 CR".
  The general bonus list leaves the medal out so it shows once.
- **New car earned:** "NEW CAR EARNED · FERRARI ENZO · IN YOUR GARAGE".
  With the helicopter on: "KESTREL ONE WILL BRING IT TO TREMBLANT WOODS".
- **Sound:** the existing `interface.bonus` cue, once per results screen,
  when either line shows. No new sound.
- A win that only adds to a count shows nothing new here; the sheet shows it.

### 5.3 The menu

- The car picker shows an earned car as the Jesko is shown today: locked,
  with its medal progress, until earned.
- The "N EARNABLE CARS" note counts earned cars only with the switch on.

## 6. The save

### 6.1 Shape

One optional field per named player, written the first time a win counts:

```js
profile.medals = {
  version: 1,
  cars: {
    aurora_gt: {duel: [3, 1, 0], grandprix: [1, 0, 0]},
    // [easy wins, medium wins, hard wins]; only cars with a counted win
  },
}
```

- Win counts are whole numbers from 0 to 9,999.
- A medal is a count of one or more. Medals are the filled boxes of the cars
  the game knows; gold is the filled Hard boxes.
- Earned cars are stored where every owned car is: `unlockedCars`.
- The medal bonus reaches `credits` through the existing settlement, and the
  history row's `breakdown` gains its `medal` amount. Upgrades, records and
  every other field are untouched.

### 6.2 Loading

- A save without `medals` loads exactly as it does today (the same result as
  today's `normalizeProfile`) and gains no `medals` field.
- With `medals` present, `normalizeMedals` keeps a well formed entry and
  drops a malformed one. It keeps entries for car ids this build does not
  know (at most 64 entries, ids up to 64 characters), so a car added later
  and then rolled back does not lose its wins. They are kept but not counted.
- A newer version (a whole number above 1): the field is kept untouched and
  nothing is counted or written to it, so a newer save is never damaged by an
  older build. Any other malformed sheet starts empty.
- The earned-car grant runs on load, after `grantCompletionCars`, like the
  Jesko's.

### 6.3 Existing saves

- Every sheet starts empty, for old and new players alike. Old history is not
  turned into medals: it has no mode and only 60 rows, so it could count a
  Grand Prix win as a Duel win. This is the same rule as the Grand Prix
  podiums.
- Every existing car, credit, upgrade, driver, paint, course, record and
  ghost stays as it is. Jesko owners keep the Jesko and Axel. Nobody's
  Jesko progress changes, because the Jesko still counts only the eight
  bought cars.

### 6.4 One release back

A build that does not know a car drops everything kept per car for it: the
car in `unlockedCars`, its paint (bought with credits), its leaderboard rows,
its ghosts and where the helicopter left it. Every one of those checks asks
only whether the car is in `CARS`, not whether a switch is on. So the rule:

- **The earned cars ship in a release with the switch off, at least one
  release before the release that turns `earned-cars` on.** Then the build a
  rollback returns to already knows every earned car and keeps all of its
  data. With the switch off nobody can earn one, so that earlier release
  changes nothing for players.
- The previous build also keeps unknown top-level fields, so `medals`
  survives a rollback. The grant on load re-checks the medals, and earned cars
  arrive fully tuned, so no upgrade credit is ever attached to them.

With that order nothing is lost.

### 6.5 The save checker

EARN-MEDALS holds the `save-shape` lock, adds one fixture to
`tools/fixtures/saves/` (a player with a clean saved sheet that includes an
unknown car; EARN-CAR-1 adds its earned car once the car exists; malformed
sheets are tested in `tools/test-medals.mjs`) and gets a fresh save review
(the save checker) as well as the ordinary code review. The fixture roster
count goes from 11 to 12; the change note explains each changed assertion.

## 7. The switch

- `earned-cars`, dev, in `src/feature-flags.js`.
- **Off:** no win is counted, no save gains a field, and the earned cars
  appear nowhere: not in the garage, the menu's car picker or its count, the
  armory, the rival car choice, the leaderboard or the dispatch board. Every
  car list is exactly today's.
- **On:** the sheets count, the panel and lines show, and the earned cars
  show locked until earned.
- **Release:** the cars first reach players in a release with the switch
  off (section 6.4). The switch goes to beta in a later release, only after
  all three cars pass their look tests and EARN-FINISH passes. The Grand Prix row needs `grand-prix-career` on to fill;
  if that switch is still dev at release, the row says so (section 5.1) and
  the Duel row alone can earn every car.

## 8. Files

| File | Card | Purpose |
| --- | --- | --- |
| `src/medals.js` | EARN-MEDALS | Sheet rules, counting, totals, earned-car progress and grant |
| `tools/test-medals.mjs` | EARN-MEDALS | Rules, save, old saves, rollback, player isolation |
| `tools/fixtures/saves/12-medals.json` | EARN-MEDALS | The new save fixture |
| `src/earned-cars-ui.js` | EARN-SCREEN | Which cars show, the medal panel, the lines |
| `tools/test-earned-cars-ui.mjs` | EARN-SCREEN | Real App and screens, memory-only |
| `src/<car>-vehicle.js` | EARN-CAR-1 to 3 | Each car's original model |
| `docs/board/looks/earned-cars/` | EARN-CAR-1 to 3 | One comparison sheet and note per round |

Tests that need an earned car before the real cars exist use a scratch copy
of the config in `.qa-dist/`, as P4-CAREER did for its courses. No stand-in
car goes into the game.

## 9. Cards and order

1. **EARN-MEDALS** (Codex, SAVE, M; locks `save-shape`). The sheets in the
   save, counting in `settleRace`, the earned-car rule and grant, the Jesko
   list limited to bought cars, the switch. Fresh save review.
2. **EARN-SCREEN** (Codex, UI, M; locks `busy-game-files`; needs
   EARN-MEDALS). The switch passed into settlement, the garage panel, list
   labels and locked page, the results lines and cue, the menu, hiding
   earned cars with the switch off, and `AIR_ONLY_CARS` covering every
   earned car.
3. **EARN-CAR-1, EARN-CAR-2, EARN-CAR-3** (Codex, ART, M each; lock
   `sound-bank` for the engine voice; need EARN-SCREEN). One car each: the
   model, its stats, its config entry with its medal rule, its engine voice
   from an existing sample, its weight for the helicopter, and a look test
   of at most three rounds with Claude's verdict. Car 1 first. Their
   models can be built side by side, but they add to the same config and
   sound files, so they merge one at a time.
4. **EARN-FINISH** (Claude, FINISH, S; needs the three cars). Play the ladder
   on a memory-only career as a child would (Easy) and as a parent would,
   check the pacing and the screens, send Kyle the sheet, and prepare the
   switch for beta on Kyle's word.

The `save-shape` lock is shared with the Lab's tuning work (T-011), so they
take turns, as the Cockpit already notes.

## 10. Kyle's answers (14 October 2026)

- **The three cars:** confirmed as picked: Ferrari Enzo (6 medals), McLaren
  F1 (15), Bugatti Bolide (24 with 6 gold).
- **Credits:** medals pay credits too, since the races are time spent
  (section 2.1).
