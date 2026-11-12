# FIELD-BATTLE-ASH

Built by a Sonnet helper for Claude, 12 November 2026. No new switch: the battle is part of the gas run, so it waits for `scablands-runs` (dev, off), which needs
`story-everburn`. The design is the card's (`docs/board/cards/FIELD-BATTLE-ASH.md`). This note lists what was built, the numbers, the checks and every place where the
build differs from the card or settles something the card left open.

## What changed

- **The save** (`src/story/ember-save.js`). `furnaceDead` in the Everburn story's own entry. Only a saved value is checked: anything but `true` reads as false and is
  repaired to false, and an older save is read exactly as before (loading adds nothing). New: `emberFurnaceDead`, `emberBattleOpen` (the feud is at War party and the furnace
  is alive), the writer `battle`, and the pure `applyBattleEnding(profile, ending)`. `'won'` sets `furnaceDead`, sets the feud to Watching and adds one run. `'arrived'` (Big
  Bess in Tin Town with the furnace still rolling) adds one run and leaves the feud at War party and the furnace alive. Both refuse a save without the six jobs, a feud that
  is not War party, a dead furnace, an unknown ending and a save from a newer build. 117 checks in `tools/test-ember-save.mjs` (92 before).
- **The furnace's rules** (`src/world/jobs/old-smoke.js`). A furnace definition that carries `battle` rules runs the same doors, rhythm, hits and rams as the story's, with the
  switches listed below. A definition without `battle` runs exactly as before.
- **The battle as a job** (`src/world/jobs/gas-run.js`). `fieldBattleJob({runs, difficulty})`: the Boneyard road, Big Bess as in any run, two ambushes of 3 (2 on Easy) drawn by
  the seeded generator from five fixed places ahead of (0, 370), and the furnace as a second actor on the same escort step (`furnaceActor`). Also `FIELD_BATTLE` (every number
  of the battle in one place), `fieldBattleAmbushes`, `fieldBattlePay`, `isFieldBattle`, and `gasRunJob` takes `furnaceDead` to carry the wreck.
- **Running it** (`src/arena/modes/world-job.js`, `src/world/jobs/steps/escort.js`). The job mode steps the furnace beside Big Bess (`updateBattleFurnace`): it comes out when she
  passes (0, 370), uses the chase step's own wiring (`stepFurnaceActor`, door hits from weapons, rams from the car) and puts cinders on her health. The escort step closes on
  Auntie Solder's line for how the battle ended, fixed the moment Big Bess arrives so that a door broken while the line plays cannot change it.
- **Starting, ending and pay.** `src/story/ember-road.js` and `ember-ui.js`: at War party with the furnace alive the wall says the card's sentence and the Boneyard button reads
  BONEYARD ROAD: THE BATTLE with the pay of four shares. `src/app.js`: `gasRun('boneyard')` builds the battle in that case and the ordinary run otherwise (with `furnaceDead`
  the ordinary War party run, carrying the wreck); the settlement branch calls `applyBattleEnding` for a battle. `src/screen-arena.js`: the result says in one sentence which
  ending it was.
- **Drawing** (`src/world/scablands-scene.js`, drawing only). The furnace rig follows the battle's furnace actor exactly as it follows the story's, and stays where it stopped
  or turned away when the job is over. It comes out with two of its six shields gone and one door scorched. A dead furnace has its door fire out and a thin plume. A later
  Boneyard run shows it as a wreck.
- **Lines.** `src/story/ember-lines.js`: the seven lines, word for word. All seven ids were free.
- **Tests and a scenario.** `tools/test-field-battle.mjs` (new), the scripted drivers in `tools/test-everburn-easy.mjs` and `tools/test-run-gas-medium.mjs`, the seven lines in
  `tools/test-ember-lines.mjs`, the drawing in `tools/test-scablands-scene.mjs`, and `tools/scenarios/field-battle.mjs`.

## The switches added to the furnace's rules, and the proof that job 6 is unchanged

Every switch is the presence of `battle` on the furnace's definition (`f.battle`, null for the story's). Without it each line below takes its old branch.

| Place in `old-smoke.js` | What `battle` changes |
| --- | --- |
| `createFurnace` | Resolves the rules for the difficulty; starts at `battle.startMetres` on the road; its first event is `comesOut`; new flags `dead`, `turnedAway`, `burning` (false for every furnace). |
| `furnacePace` | The battle's own pace (11 m/s, 10 on Easy), no speed-up after a hit, never the bolt pace. |
| `furnaceHealth` | A dead furnace has no health (the job engine sees it as stopped). |
| `furnaceHit` | The last door is `doorsToStop` (3, one on Easy) and the furnace then stops where it stands as dead, instead of rolling into the well; each earlier door stops it for `stopSec` (8 s, no movement) instead of the 2 second stagger at a quarter pace. |
| `legAt` | The three doors share one long leg: the leg is the number of doors already broken (left, right, rear). So it never bolts to a next leg's ground. |
| `rhythm` | No door opens once the furnace has turned away. |
| `stepFurnace` | The battle's `moveBattle` replaces `move` (no turning round at the road's end, no escape, no gate facts); a dead furnace does not roll into the well; the cinders burn the escort and not the player, and nothing shoves the player (the story's cinder-on-car and shoulder rules are skipped); the result carries `escortBurn` (0 for the story's furnace). |
| new `furnaceFallBack` | After a rest and restart it puts the furnace back where it came out, behind her, with its doors still broken. |

In `world-job.js` the chase's rule "wrecked: the chase starts over" is skipped for the battle's furnace only (`if (!furnace.battle)`).

**Job 6 is unchanged.** `tools/test-old-smoke.mjs` is not edited (it is not in this branch's diff) and passes: 616 checks. `tools/test-everburn-easy.mjs` still brings all nine jobs home
10 of 10 on Easy. `createFurnace` of job 6's furnace gives `battle: null`, `dead: false`, `turnedAway: false`, no pending event, start at metre 0, and `furnacePace` of the base
pace (checked in `test-field-battle.mjs`).

## Numbers (all from `FIELD_BATTLE` in `gas-run.js`)

| What | Value |
| --- | --- |
| Pay | 4 shares for a won battle: 320 Easy, 384 Medium, 448 Hard. Arriving with the furnace still rolling: 2 shares (the Boneyard road's own: 160, 192, 224) |
| The furnace's pace | 11 m/s (Medium, Hard), 10 m/s (Easy); it closes on Big Bess by 2 m/s, or 1 m/s on Easy |
| Where it comes out | 80 m behind Big Bess on her road, as she passes (0, 370), 430 m into the road (see "Differs from the card") |
| Cinders on Big Bess | within 25 m of her, while it is moving: 2 (Easy), 6 (Medium), 9 (Hard) health a second |
| Nearest it comes | 12 m behind her: it never rams her |
| Doors | left, right, rear in turn on one leg; glow 6 s (Easy), 4.5 s (Medium), 3.5 s (Hard); each broken door stops it for 8 s; 3 broken doors stop it for good (1 on Easy) |
| Riders | two ambushes of 3 (2 on Easy) at two of the places 540, 690, 830, 977 and 1,107 m along the road, appearing at 160 m as in any run |

## Differs from the card, or settled where the card was open

1. **Where the furnace starts. Claude should look at this first.** The card puts its start at (250, 415) and has it come out as Big Bess passes (0, 370), driving "her road
   behind her", closing on her by 2 m/s and throwing cinders within 25 m "behind her". But (250, 415) is 254 m **ahead** of (0, 370) along her road (684 m into the road, with
   (0, 370) at 430 m), so a furnace that starts there pulls away from her at 11 m/s and cannot close on her or burn her. The card's other statements (behind her, closing,
   within 25 m behind her, Moss: "on the road behind us") only hold for a furnace that comes out behind her. So the furnace's path is the Boneyard road itself (the whole road,
   so its metres are Big Bess's metres) and it comes out on the road 80 m behind her when she passes (0, 370). The 80 m is `FIELD_BATTLE_GAP_METRES`. With it, on Medium it is within
   25 m of her 27 seconds after it comes out. Other numbers could be set from the same constant; the card's numbers are as written.
2. **The furnace never gets nearer than 12 m to Big Bess** (`holdBehindMetres`). The card says it never rams her but gives no distance, and at 11 against 9 m/s it would pass
   her when she rests. After a rest and restart (she goes back to the last place she reached) it falls back to its 80 m.
3. **An ambush she has already passed gives up too, in the battle only** (`escort.js`). Without it the coward driver looped for ever: she passed the first ambush, the furnace
   finished her after it, and every restart put that ambush back. A step with a furnace now lets an ambush on the stretch being restarted give up after two rests on it, even if she
   had already passed it. Runs and job 4 are unchanged (their tests pass).
4. **What Big Bess's arrival with the furnace still rolling pays.** The card does not say. It pays the Boneyard road's own 2 shares (192 on Medium): the gas is home. The
   definition carries `arrivedShares` and the job mode sets `shares` to it when the job ends with the furnace alive (`settleBattle`), so `arenaReward` is not touched.
5. **Closing lines.** The battle closes on Auntie Solder's one line for each ending. Moss's usual arrival line (whole or hurt) is not said in the battle.
6. **The last door.** Clinker's "That door was the last thing he made" plays for each door that is not the last. The last door ends the furnace, and Cinder's "That is the last of
   his fire" plays for that (on Easy, where the first door is the last, Clinker does not speak). Moss's line about the cinders plays the first time they land in a battle.
7. **Riders.** The card says two ambushes of 3; the War party table has 3, 3 and 4, so the battle has its own two (drawn by the seeded generator from five fixed places ahead of
   (0, 370), from the run count: the same save gets the same battle and two in a row are not alike).
8. **The wreck.** The save records only `furnaceDead`, as the card says, so the wreck is drawn at the fixed place, not where the furnace died. The place is 8 m north of the road at
   (250, 415), at (250, 407), lying along the road, so that Big Bess does not drive through it.
9. **The wall at War party, with the furnace dead,** reads as it did (the old War party sentence and button). Two existing assertions of `tools/test-run-gas.mjs` pinned that at feud 4
   (the wall's sentence and button, and an arrival from War party); they now run with `furnaceDead: true` in their save. Each assertion is as it was; only the input changed,
   because at War party with a live furnace the wall and the Boneyard button are the battle's by design. Claude's review under rule 18.

## Sound

Existing cues only, played through the arena tell event as the story's furnace does (`world-job.js`, `BATTLE_CUES`): the stoke (`arena.tell`), a door opening (`gate.latch`), a door
shutting (`vehicle.landing`) and a door breaking (`combat.hit-confirm`), the story's; the fire cue (`weapon.flame.start`, the one the gate's flame uses) when cinders land on Big Bess;
the raid warning for the riders (`raiderWarning`, the ambush's own, once for each ambush). The furnace coming out, dying and turning away have no cue of their own: they are Clinker's
and Cinder's lines.

## Checks

- `node tools/test-field-battle.mjs`: 643 checks (new). The furnace's rules as numbers (start on the road 80 m behind (0, 370), its path is the Boneyard road, pace and closing on each
  difficulty, 12 m hold, cinders 2, 6 and 9 within 25 m and none beyond, the doors in turn with 8 second stops, three doors or one on Easy, no cinders or shove on the player, no
  bolting or turning round, turning away, falling back after a rest, job 6's furnace untouched); the job (road, raids, pay, lines, both roads clear every solid by 8 m); a real Duel (the
  furnace comes out with Clinker's line, cinders by difficulty, a door stops it, the dead furnace stays, a rest, the riders); a real App (the wall before and after, starting, and the
  three endings with their pay and their writes; leaving and failing write nothing).
- `node tools/test-ember-save.mjs`: 117 checks. `node tools/test-ember-lines.mjs`: 54 captions and the battle's closing lines.
- `node tools/test-run-gas.mjs` 1,088; `test-old-smoke` 616 (untouched); `test-ember-screens` 23; `test-scablands-scene`; `test-world-job-mode`; `test-arena-settlement` 10;
  `test-story-registry` 78.
- Scripted drivers, 10 tries each, the run count the try's number (tables below).
- Lane tier (`--changed --jobs 4 --keep-going`): 105 passed, 0 failed (this includes `test-everburn-easy`, `test-run-gas-medium` and `test-old-smoke`). `npm run build`: pass.
- Browser scenarios `field-battle` (new: the wall before the battle, the battle starting, the furnace coming out, cinders on Big Bess, a door glowing and breaking, the dead
  furnace; 6 pictures), `run-gas` and `everburn-well`: pass, 0 warnings, 0 errors.

### The drivers

| Easy, child-pace driver (teaches itself to ram a glowing door as in job 6) | Brought home | Battle won | Doors broken in all | Big Bess's lowest health at the end | Longest battle |
| --- | --- | --- | --- | --- | --- |
| `tools/test-everburn-easy.mjs` | 10 of 10 | 10 of 10 | 10 | 60 | 142 s |

| Medium, `tools/test-run-gas-medium.mjs` | Brought home | Battle won | Doors broken (each try) | Most rests in a try | Big Bess's lowest health on arrival | A battle lasts |
| --- | --- | --- | --- | --- | --- | --- |
| Fighting driver (clears the riders, breaks doors) | 10 of 10 | 10 of 10 | 3 in every try | 2 | 1 | 142 to 188 s |
| Driver who never fights | 10 of 10 | 0 of 10 | 0 | 5 | 22 | 186 to 272 s |

The card's targets are 8 of 10 on Easy, 6 of 10 on Medium for the fighting driver and 10 of 10 home for the driver who never fights; all are met. The fighting driver wins
every time, so the battle is not hard for a player who goes for the doors; Hard (scratch run, not asserted): 10 of 10 home and 10 of 10 won for the fighter, 10 of 10 home and none won
for the driver who never fights, with up to 6 rests. The existing Medium and Easy tables for job 4 and the runs are as the RUN-GAS note records them.

## Drawn after the pictures (Claude, 12 November 2026)

Pictures taken beside the two machines showed nothing drawn when cinders landed on Big Bess, and nothing to mark the
furnace's death. Added, drawing only: `createCinderArc` in `src/world/scrap-look.js` (glowing lumps on a low arc from
the chimney to the tank), three fires on her tank and firelight under her while the furnace's state says `burning`,
and the furnace's last fire (two tongues in the chimney for 5 seconds, heavy smoke for 12, then thin smoke at 0.45 of
full in place of 0.3). `tools/test-scablands-scene.mjs` checks each, and its thin-smoke check moved 18 seconds after
the death (reviewed on the card). No rule, pay, save, replay fingerprint or world signature is touched. Sound: none
new; cinders landing already play the fire cue.

## Tuning (builder, 12 November 2026)

**First attempt: stopped.** The first tuning limits (cinders, stoke, stop, glow) could not lower the win counts: a fighting driver broke the third
door about 44 s before Big Bess arrived and no cinder ever landed on her (the 1 health of the first build was the riders' doing, see the card's
"Tuning result"). Claude then redesigned the hunt, and it was built as follows.

**Three rule changes**, each only for a furnace whose definition says `battle` (`src/world/jobs/old-smoke.js`; the story's furnace is untouched and
`tools/test-old-smoke.mjs` passes unedited, 616 checks):

1. *It catches up.* More than 40 m behind Big Bess along the road the furnace drives at `catchUpSpeed` (15 m/s on Medium and Hard, 12 on Easy); within
   40 m at its own pace (11, 10 on Easy). `furnacePace` reports whichever it is driving at (flag `catchingUp`). It still never comes nearer than 12 m.
2. *A door begins to stoke only while the furnace is within cinder range of her* (flag `inCinderRange`, 25 m, set in `moveBattle`). Out of range the stoke
   waits (at the start, and after a door has shut or a broken door's stop is over). A door already glowing keeps its time. A stoke already begun goes on.
3. *Gentler cinders:* Medium 4 a second (was 6), Hard 6 (was 9), Easy 2 as before.

To carry the rest as battle numbers, `stokeSec`, `stopSec` and `glowSec` became tables by difficulty on the battle's rules (`FIELD_BATTLE.furnace` in
`gas-run.js`) and the rhythm reads them when the furnace is a battle's (the story's furnace reads `OLD_SMOKE` as before). The scene's stoke colour
(`scablands-scene.js`) divides by the battle's own stoke time (drawing only).

**What moved** (old, new):

| Number | Old | New |
| --- | --- | --- |
| Cinders, Medium / Hard / Easy | 6 / 9 / 2 | 4 / 6 / 2 |
| Catching-up pace beyond 40 m, Medium and Hard / Easy | none (11 / 10 at any distance) | 15 / 12 |
| Stoke, Medium and Hard / Easy | 4 / 4 | 6 / 4 |
| Stop after a broken door | 8 | 8 (unchanged) |
| Glow, Medium / Hard / Easy | 4.5 / 3.5 / 6 | unchanged |
| Where the furnace comes out (metres into the road; it starts 80 m behind her) | 430 (as she passes (0, 370)) | 560 (130 m past it; it starts at 480) |

The comes-out place was decided from 30 tries of each fighting driver (table on the card): 560 m is where Medium (23 of 30 won) and Hard (16 of 30)
both land in their targets. Nothing the card says must not move was touched: the riders and their damage, Big Bess's pace and health, one hit
breaking a door, Easy's one door, pay, the save, the lines, job 6.

**`burning` and the cinders.** `f.burning` is set in one place (`burnEscort`) from `inCinderRange && staggerLeft <= 0`, the same condition that adds
`escortBurn`; the new check in `tools/test-field-battle.mjs` runs 60 s of steps in and out of range and with doors broken and asserts that
`escortBurn > 0` exactly when `burning` is true, on every step.

**Drivers** (scratch copies of the drivers in `tools/test-everburn-easy.mjs` and `tools/test-run-gas-medium.mjs`, a Hard driver added; 10 tries each, same
seeds; the tests themselves still pass): Easy 10 home, 10 won, lowest 52, cinders 4.3 s; Medium fights 10 home, 9 won, 9 of 9 at 25 or more, cinders 11
to 21 s; Medium never fights 10 home, 0 won; Hard fights 10 home, 7 won; Hard never fights 0 home (32 rests, stopped at 15 minutes), reported on the card.

**Checks.** `node tools/test-field-battle.mjs` 684 (was 643, 41 more net: the two new rules, the burning flag and the ranges, see below), `test-old-smoke` 616
(untouched), `test-run-gas` 1,088, `test-ember-save` 117, `test-ember-lines` 54 captions, `test-scablands-scene` pass. Lane tier
(`--changed --jobs 4 --keep-going`, from PowerShell): 34 of 34 passed, 0 failed (it includes `test-everburn-easy`, `test-run-gas-medium`, `test-old-smoke`,
`test-field-battle`, `test-replays` and `test-world-composition`). `npm run build`: pass. Browser scenarios `field-battle` (7 pictures), `run-gas`
and `everburn-well`: 3 of 3 passed, 0 warnings, 0 errors. The field-battle scenario needed no change: it waits for the furnace to come out and for its
cinders in loops long enough for the new timings, and it hits each door the moment it glows.

**Re-recorded assertions in `tools/test-field-battle.mjs`** (each moved by design; none loosened, no tolerance widened, no check removed):

- Cinder rates 6 and 9 become 4 and 6 (the unit loop, the Medium Duel check "4 health a second, 8 in 2 s", the Hard Duel check): the redesign's gentler cinders.
- The pace and closing loop: one pace at any distance becomes the catching-up pace beyond 40 m and today's within it (covers 150 m in 10 s far behind her,
  110 m at 39 m, closing 6 m/s then 2 m/s on Medium); the same checks for each difficulty plus new ones at 39 m and 41 m.
- Door, stop and ram checks and the "never bolts" loop now keep Big Bess 20 m ahead of the furnace instead of 500 m (or nobody): a door begins to stoke only
  in cinder range, so with her far away no door ever glows. The assertions themselves (which door glows, the 8 s stop, 11 m/s after it, the hits) are as they were.
- The car-in-cinders and car-beside checks keep her 20 m ahead (was 60 m) so that the run still has doors and cinders in it.
- "It comes out as Big Bess passes (0, 370)" and "about 430 m into the road" become 130 m past (0, 370) and 560 m; "that is 80 m behind (0, 370)" becomes
  50 m past it, 80 m behind where she is; the furnace starts 480 m in. The Duel check allows 60 s (was 30) for her to reach the place, and says the furnace is
  not out when she passes (0, 370).
- The ambush places check "ahead of Big Bess when the furnace comes out" now says ahead of (0, 370) by 100 m (the same number, the same place); the nearest
  place, 540 m, may stand just before the new comes-out place.
- After the third door "Big Bess drives on to Tin Town" (no result 20 s later) becomes: no result at the moment of death (the card's claim), and 20 s later
  no result or the battle won (she may now arrive inside those 20 s, because the furnace dies later on the road).
- New: a door waits to stoke while she is out of range, at the start, after it has shut and after a broken door's stop; a stoke begun and a glow keep going out
  of range, the glow for its own time; stoke begins at once when she is back; `burning` equals cinders landing (60 s).

**Replay fingerprints and world signatures:** unchanged (no replay, race or world file is touched; `tools/test-combat-replays.mjs` is in the lane tier).

**Removed:** nothing.

## Removed

Nothing is deleted. At War party with a live furnace the wall's War party sentence and the Boneyard road's plain button are replaced by the battle's; they stay for a War party with
the furnace dead, as the card says. The ordinary Boneyard run at War party is replaced by the battle until it is won.
