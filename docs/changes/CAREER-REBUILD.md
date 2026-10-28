# CAREER-REBUILD: Spikey Ferns and Dukes00 come back

Claude (Sonnet 5.5 helper in lane `career-rebuild`), 28 October 2026. Kyle approved this
rebuild from his own description. Chrome cleared the live game's browser storage, so both
careers were gone. This card puts them back once, with no new button.

## What changed

- `tools/career-rebuild.mjs` (the recipe): builds both careers with the game's own save code
  (`createProfile`, `normalizeProfile`, the car, driver, course and paint lists, the warlord
  settlement rule) and writes the export the game already uses (`the-duel-career`). It checks
  the file with `parseCareerExport` and checks that loading it changes nothing.
  `node tools/career-rebuild.mjs --module` rewrites the data module below; `--out <file>`
  also writes the JSON file.
- `src/career-restore-2026-10-28.js`: that export, shipped in the build (9 KB).
- `src/career-restore.js`: `restoreLostCareers`. At start-up, after the career storage is
  ready, it runs once when neither "Spikey Ferns" nor "Dukes00" exists (any letter case) and
  the marker `duel_career_restore_2026_10_28` is not set. It saves a verified copy of the
  current career (`backupCareer`, reason `before-career-restore`), adds the two players in
  front of whoever is already there (for example an empty "Player 1"), makes Spikey Ferns the
  active player, sets the marker and shows "Spikey Ferns and Dukes00 are back." (click to
  dismiss, gone after 12 seconds). If a name already exists the marker is set and nothing is
  added. If the copy or the save fails, nothing changes, the game starts normally and the
  restore tries again next time.
- `src/main.js`: the start-up hook, the notice, and the storage request (below). In test
  builds the hook runs only when the address has `restore-career`, so every other browser
  scenario keeps its own players.
- `src/career-backup.js`: `requestPersistentStorage()`. On start the game asks the browser
  once, through `navigator.storage.persist()`, to keep its storage, if the browser has the
  feature and has not already said yes. It never delays start-up and ignores any failure.

### Why not `importCareer`

`importCareer` (and the budget-layer import the live game uses) replaces the whole career, so
it would wipe a player created since the clear. The brief allowed the fallback, so the two
players are added through the normal player-list code (`loadPlayers`, `savePlayers`) after
the same verified backup the import makes. Kyle asked for no permanent load button, so none
was added.

### What each player gets

Ids and sources come from the code, not from guesses.

**Spikey Ferns** (Gratian, id `player-spikey-ferns`, active player), 23,000 credits.
- Cars (every non-earned car, `CARS` entries without an `unlockRequirement`):
  `falcone_f42`, `stuttgart_959s`, `falcone_heritage`, `aurora_gt`, `dusthawk_rally`,
  `banshee_muscle`, `viper_proto`, `titan_monster`. Every upgrade in `UPGRADE_TYPES` (engine,
  nitro, handling, tires, brakes, suspension, tank) at level 3. The maxed roster earns
  `koenigsegg_jesko` by the game's own rule (`grantCompletionCars`), also maxed
  (`factoryMaxed`), with its driver `axel_storm`.
- Not given: the earned-cars switch cars (`ferrari_enzo`, `mclaren_f1`, `bugatti_bolide`; the
  `earned-cars` switch is `dev`), nor `falcone_sirena` (The Deep) or `mcmurtry_speirling`
  (the Lab).
- Drivers: `club`, `mara_vale`, `iko_ren`, `sana_marlow`, `jules_reyes`, `nia_frost`,
  `boone_ward` (all `DRIVERS` without an `unlockCar`) plus `axel_storm` from the Jesko.
  Selected: `club`.
- Courses (`profile.courses`, every course with a price or free, not practice, not a derived
  unlock, and whose circuit switch is `on`): `pacific-canyon`, `high-country`,
  `harbor-highlands`, `titan-arena`, `midnight-chase`, `ridge-rally`, `titan-stunt-trial`,
  `neon-drift-trial`, `timberline-rush`, `eifel-crown`, `alpine-serpent`, `azure-riviera`,
  `red-mesa`, `neon-docks`, `cloudbreak-skyway`, `tremblant-woods`, `tremblant-snow`,
  `harbour-lights`, `panorama-ridge`, `summit-run`, `ardennes-forest`. `summit-time-attack`
  opens by itself once `summit-run` is owned. `titan-freestyle` is free practice and needs no
  entry.
- Paints (`PAINT_PRESETS` that are neither a reward nor car-specific): `factory`,
  `copper_metallic`, `glacier_satin`, on every owned car including the Jesko. Selected:
  `factory`.
- The Deep (`deep`): `kit: true` (the dive kit), `found: ['kelp-coast']` (the coast the log
  page needs), `logged: ['turtle']` (the one turtle id in `DEEP_CREATURES`). Nothing else.
- Wasteland: `discoveredGate: true`, `pacificFinishes: 10`. Every territory `hold: 100`.
  Beaten by running the game's own `settleWarlordResult` once per warlord in ladder order, so
  the state is what real wins leave: `sal`, `dustmonger`, `mirage`, `gunn`, `kettle`,
  `vultures` (`defeated: true`, `wins: 1`, territory `claimed: true`). What the six wins
  leave: crew `tusk`; weapons `smoke`, `decoy`, `rockets`; kits `side-saws` and `turret-look`
  (on `falcone_f42`, the car that won; `turret-look` equipped) and `warlord` on
  `titan_monster` (equipped); six warlord story cards (those six ids); 5,100 scrap. No title.
- `tollkeeper` and `blackiron`: `defeated: false`, `wins: 0`, `claimed: false`, no win settled,
  `hold: 100` on both territories. Nothing only their wins give is in the save: no
  `chrome-crown`, no title "Warlord of the Wastes", no card, and 1,300 less scrap (Blackiron's
  first-win pay). Claude's decision, 28 October: Blackiron's fight opens only after the
  Tollkeeper (`warlordUnlockSatisfied`), so Gratian cannot have beaten him.

**Dukes00** (Kyle, id `player-dukes00`), 15,000 credits. Kyle's correction, 28 October: the
same garage as Spikey Ferns (the eight cars and the Jesko maxed, all eight drivers, the same
21 courses, the same paints), with these differences:
- Deep: `{kit: true}` only, so the dive kit and nothing logged.
- Wasteland: gate found, same as above. Only the first three warlords of the game's ladder
  (`WARLORD_LADDER` in `src/warlords.js`, the order that sets warlord pay) are beaten, each
  settled with `settleWarlordResult`: `sal`, `dustmonger`, `mirage`. Those three leave weapons
  `smoke` and `decoy`, kit `side-saws` on `falcone_f42` (equipped), the three story cards and
  2,100 scrap; crew stays `rook`. Territories of those three are held at 100 and claimed; the
  other five have hold 0 and are not beaten.
- No lessons (the save has no `drivingLessons` field, so he redoes them). Nothing else.

Both players have their race settings filled in by `normalizeRaceSettings`, so the game does
not treat them as an old save needing a migration.

## Things Kyle should know

- Blackiron is not beaten, against the first reading of the brief: his fight opens only after
  every other warlord including the Tollkeeper is beaten (`warlordUnlockSatisfied`).
- Dukes00 has the full roster too (Kyle's correction replaced my first reading of "starting
  cars" as the two free ones).
- Scrap (5,100 for Spikey Ferns, 2,100 for Dukes00) comes from the game's pay rule for first
  wins at the easiest CPU level.
- The export is version 1: that is what the game writes when a career has no archived
  records. Version 2 needs an IndexedDB archive that does not exist here.

## Tests

- `tools/test-career-rebuild.mjs` (18): the file goes through `importCareer` into a memory
  store, loads through `loadPlayers`, and both players are checked field by field as above
  (names, credits, cars, upgrade levels, no earned-cars car, drivers, courses, paints, dive
  kit, turtle in the sea-life log, Wasteland open, every warlord but the Tollkeeper and Blackiron, with no Blackiron reward); the
  shipped data equals what the recipe builds; the restore happens once, never after the
  marker, never when either name exists, keeps existing players and their credits, and a failed
  copy changes nothing; the storage request asks once and ignores refusals and errors.
- `tools/scenarios/career-restore.mjs` (browser, memory-only saves, private port): shows the
  notice, the existing player dropdown with Dukes00, Spikey Ferns, Player 1 (Spikey Ferns
  selected), Spikey Ferns' garage (23,000 CR, every car MAXED, the sea-life log 1 of 7), then a
  real reload that does not restore again.
- Gates (lane `career-rebuild`, commit after `3ed23f4f`): lane tier `--changed --jobs 4` 40 of 40
  passed; `npm run build` passed; by hand: test-career-archives, test-career-backup,
  test-career-budget, test-career-budget-recovery, test-save-fixtures, test-progression,
  test-progression-integration, test-old-best all passed; browser scenarios career-backup,
  career-archive, career-tab-isolation, career-writer-lock, career-origin-missing,
  career-archive-missing, career-backup-failure and career-restore all passed. No assertion in
  an existing test was changed. The Deep import guard (`test-deep-look`) caught a path
  mention in the new files at first; the wording was changed, not the guard.

## Removed

- Nothing replaced. The module `src/career-restore-2026-10-28.js`, `src/career-restore.js`,
  the start-up block and notice in `src/main.js`, and `tools/scenarios/career-restore.mjs` are
  removed by the later card **CAREER-RESTORE-REMOVE** once Kyle confirms both players are
  back. `tools/career-rebuild.mjs` and the storage request stay.
