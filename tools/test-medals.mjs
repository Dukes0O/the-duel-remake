// Medal sheets and earned cars (docs/EARNED_CARS.md, card EARN-MEDALS).
// Memory-only: no browser storage is read or written.
import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {cp, mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {readFileSync, readdirSync} from 'node:fs';
import {join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {COURSE, CARS} from '../src/config.js';
import * as medals from '../src/medals.js';
import {createProfile, normalizeProfile, settleRace, completionCarProgress, unlockCar,
  createPlayerRegistry, createPlayer, replacePlayerProfile, selectPlayer, activePlayer,
  savePlayers, loadPlayers, PLAYERS_KEY, PROFILE_KEY} from '../src/progression.js';

const root = fileURLToPath(new URL('..', import.meta.url));
// At merge the switch-off races and every saved shape were also compared with
// the code before this card (7dbbd51c) and matched; docs/changes/EARN-MEDALS.md
// records it. These tests check the same promises without a commit id.

const pacific = COURSE.findIndex(course => course.id === 'pacific-canyon');
const chase = COURSE.findIndex(course => course.id === 'midnight-chase');
const practice = COURSE.findIndex(course => course.practice);
const finish = (extra = {}) => ({runId: 'medal-a', stageIndex: pacific, car: 'falcone_f42', mode: 'duel',
  difficulty: 'casual', cpuDifficulty: 'easy', seed: 1989, laps: 2, completed: true, won: true,
  timeSec: 180, lapTimes: [90, 90], earnedCarsEnabled: true, ...extra});
const grandPrix = (extra = {}) => ({runId: 'medal-gp', stageIndex: pacific, mode: 'grandprix',
  grandPrixCareerEnabled: true, completed: true, won: true, position: 1, fieldSize: 8, laps: 3,
  seed: 1989, timeSec: 300, car: 'falcone_f42', driverId: 'club', difficulty: 'casual',
  cpuDifficulty: 'medium', earnedCarsEnabled: true, ...extra});
const switchOff = ({earnedCarsEnabled, ...rest}) => rest;
// History rows carry the clock; everything else must match exactly.
const timeless = value => JSON.parse(JSON.stringify(value, (key, item) => key === 'at' ? undefined : item));
const withoutMedalFields = profile => {
  const {medals: _, credits: __, history, ...rest} = profile;
  return timeless({...rest, history: history.map(({reward, breakdown, ...row}) => {
    const {medal, ...others} = breakdown;
    return {...row, breakdown: others};
  })});
};
// One box's counts for a row: [easy, medium, hard].
const box = (level, count = 1) => medals.MEDAL_LEVELS.map(item => item === level ? count : 0);

test('the sheet normalizes: malformed entries go, counts are capped, unknown cars are kept but not counted', () => {
  const sheet = medals.normalizeMedals({version: 1, cars: {
    falcone_f42: {duel: [3, 1, 20000], grandprix: [0, 0, 0], extra: true},
    stuttgart_959s: {duel: [1, 'two', 0], grandprix: [0, 0, 0]},
    aurora_gt: {duel: [1, 0, 0]},
    viper_proto: {duel: [-1, 0, 0], grandprix: [0, 0, 0]},
    future_car: {duel: [1, 0, 0], grandprix: [0, 0, 1]},
    ['x'.repeat(65)]: {duel: [1, 0, 0], grandprix: [0, 0, 0]},
  }});
  const proto = medals.normalizeMedals(JSON.parse('{"version":1,"cars":{"__proto__":{"duel":[1,0,0],"grandprix":[0,0,0]},"constructor":{"duel":[1,0,0],"grandprix":[0,0,0]}}}'));
  assert.equal(Object.getPrototypeOf(proto.cars), Object.prototype, 'a __proto__ car id is skipped');
  assert.deepEqual(Object.keys(proto.cars), ['constructor']);
  assert.deepEqual(sheet, {version: 1, cars: {
    falcone_f42: {duel: [3, 1, 9999], grandprix: [0, 0, 0]},
    future_car: {duel: [1, 0, 0], grandprix: [0, 0, 1]},
  }});
  assert.deepEqual(medals.medalTotals({medals: sheet}), {medals: 3, gold: 1}, 'future_car is not counted');
  for (const bad of [null, 'medals', [], {cars: {}}, {version: 0, cars: {}}, {version: '1', cars: {}}])
    assert.deepEqual(medals.normalizeMedals(bad), {version: 1, cars: {}});
  const newer = {version: 2, sheets: {anything: true}};
  assert.equal(medals.normalizeMedals(newer), newer, 'a newer sheet is kept exactly');
  const many = Object.fromEntries(Array.from({length: 70}, (_, i) => [`later_${i}`, {duel: [1, 0, 0], grandprix: [0, 0, 0]}]));
  const capped = medals.normalizeMedals({version: 1, cars: {...many, falcone_f42: {duel: [1, 0, 0], grandprix: [0, 0, 0]}}});
  assert.equal(Object.keys(capped.cars).length, 64);
  assert.ok(capped.cars.falcone_f42, 'known cars are kept first');
  const loaded = normalizeProfile({...createProfile(), medals: {version: 2, sheets: {}}});
  assert.deepEqual(loaded.medals, {version: 2, sheets: {}});
  const counted = settleRace(loaded, finish());
  assert.deepEqual(counted.profile.medals, {version: 2, sheets: {}}, 'nothing is written to a newer sheet');
  assert.equal(counted.medal, null);
  assert.equal(Object.hasOwn(counted.breakdown, 'medal'), false);
});

test('a counted win fills its box and pays its medal once, the same in Arcade and Pro', () => {
  for (const [level, colour, bonus] of [['easy', 'bronze', 150], ['medium', 'silver', 250], ['hard', 'gold', 375]]) {
    assert.equal(medals.medalBonus(level), bonus);
    for (const difficulty of ['casual', 'pro']) {
      const on = settleRace(createProfile(), finish({cpuDifficulty: level, difficulty}));
      const off = settleRace(createProfile(), switchOff(finish({cpuDifficulty: level, difficulty})));
      assert.deepEqual(on.medal, {car: 'falcone_f42', row: 'duel', level, colour, bonus});
      assert.deepEqual(on.earnedCars, [], 'no medal car exists in the game yet');
      assert.equal(on.breakdown.medal, bonus);
      assert.equal(on.reward - off.reward, bonus, 'Pro does not double the medal');
      assert.equal(on.profile.credits - off.profile.credits, bonus);
      assert.equal(on.profile.history.at(-1).breakdown.medal, bonus);
      assert.deepEqual(on.profile.medals, {version: 1, cars: {falcone_f42: {duel: box(level), grandprix: [0, 0, 0]}}});
      assert.deepEqual(withoutMedalFields(on.profile), withoutMedalFields(off.profile), 'nothing else changes');
      const again = settleRace(on.profile, finish({runId: 'medal-b', cpuDifficulty: level, difficulty}));
      const againOff = settleRace(off.profile, switchOff(finish({runId: 'medal-b', cpuDifficulty: level, difficulty})));
      assert.equal(again.medal, null, 'the medal is new only once');
      assert.equal(Object.hasOwn(again.breakdown, 'medal'), false);
      assert.equal(again.reward, againOff.reward, 'a later win pays its ordinary credits only');
      assert.deepEqual(again.profile.medals.cars.falcone_f42.duel, box(level, 2));
    }
  }
});

test('Mad Max Duel and one-car events fill the Duel row; a Grand Prix win fills the Grand Prix row', () => {
  const madMax = settleRace(createProfile(), finish({mode: 'wasteland', combatRewardsEnabled: true}));
  assert.equal(madMax.medal.row, 'duel');
  assert.equal(madMax.breakdown.medal, 150);
  const gated = createProfile();
  gated.wasteland.discoveredGate = true;
  gated.credits = 800;
  const separate = settleRace(gated, finish({mode: 'wasteland', combatRewardsEnabled: true}));
  assert.equal(separate.medal.row, 'duel', 'the separate career still fills the sheet');
  assert.equal(separate.breakdown.medal, 0, 'its races pay scrap, not credits');
  assert.equal(separate.medal.bonus, 0, 'the medal reports what was paid');
  assert.equal(separate.profile.credits, 800);
  const event = settleRace(createProfile(), finish({stageIndex: chase, car: 'banshee_muscle'}));
  assert.deepEqual(event.profile.medals.cars.banshee_muscle.duel, [1, 0, 0]);
  const gp = settleRace(createProfile(), grandPrix());
  const gpOff = settleRace(createProfile(), switchOff(grandPrix()));
  assert.deepEqual(gp.medal, {car: 'falcone_f42', row: 'grandprix', level: 'medium', colour: 'silver', bonus: 250});
  assert.equal(gp.reward - gpOff.reward, 250);
  assert.deepEqual(gp.profile.medals.cars.falcone_f42, {duel: [0, 0, 0], grandprix: [0, 1, 0]});
});

test('longer races do not scale the medal, and a police fine can take from it', () => {
  const long = finish({laps: 6, lapTimes: [90, 90, 90, 90, 90, 90], timeSec: 540, lapChoiceEnabled: true});
  const on = settleRace(createProfile(), long), off = settleRace(createProfile(), switchOff(long));
  assert.ok(on.breakdown.base > 600, 'the race pay itself is scaled');
  assert.equal(on.breakdown.medal, 150);
  assert.equal(on.reward - off.reward, 150);
  const fined = (result) => ({...createProfile(), credits: 500,
    activeRace: {key: `${result.runId}:${result.stageIndex}`, pendingPoliceFineCount: 1000}});
  const fineOn = settleRace(fined(finish()), finish()), fineOff = settleRace(fined(finish()), switchOff(finish()));
  assert.equal(fineOn.profile.credits, 500, 'the fine takes the whole race gross');
  assert.equal(fineOn.policeFineCharge - fineOff.policeFineCharge, 150, 'including the medal');
});

test('losses, abandoned and invalid races, practice, qualifying, Time Trial and second place count nothing', () => {
  const refused = {
    loss: finish({won: false}),
    abandoned: finish({abandoned: true, completed: false, won: false}),
    invalid: finish({completed: false}),
    practice: finish({stageIndex: practice, car: 'titan_monster'}),
    qualifying: grandPrix({qualifying: true}),
    timeTrial: finish({mode: 'timetrial'}),
    secondPlace: grandPrix({position: 2, won: false}),
  };
  for (const [name, result] of Object.entries(refused)) {
    const on = settleRace(createProfile(), result);
    const off = settleRace(createProfile(), switchOff(result));
    assert.equal(Object.hasOwn(on.profile, 'medals'), false, name);
    assert.equal(Object.hasOwn(on.breakdown || {}, 'medal'), false, name);
    assert.equal(on.medal ?? null, null, name);
    assert.deepEqual(timeless(on.profile), timeless(off.profile), `${name}: the same as with the switch off`);
  }
  const first = settleRace(createProfile(), finish());
  const repeat = settleRace(first.profile, finish());
  assert.equal(repeat.awarded, false);
  assert.equal(repeat.profile, first.profile, 'a repeated run key counts and pays nothing');
});

test('with the switch off a race adds no sheet, no medal pay and no new result fields', () => {
  for (const result of [finish(), finish({cpuDifficulty: 'hard', difficulty: 'pro'}), grandPrix(),
    finish({mode: 'wasteland', combatRewardsEnabled: true}), finish({won: false})]) {
    const off = settleRace(createProfile(), switchOff(result));
    assert.equal(Object.hasOwn(off.profile, 'medals'), false);
    assert.equal(Object.hasOwn(off.breakdown, 'medal'), false);
    assert.equal(Object.hasOwn(off, 'medal'), false);
    assert.equal(Object.hasOwn(off, 'earnedCars'), false);
    assert.equal(Object.hasOwn(off.profile.history.at(-1).breakdown, 'medal'), false);
    const on = settleRace(createProfile(), result);
    assert.deepEqual(withoutMedalFields(on.profile), withoutMedalFields(off.profile), 'the switch changes only medal fields');
  }
});

test('the Jesko still asks for the eight bought cars, exactly as before', () => {
  const bought = Object.keys(CARS).filter(car => !CARS[car].unlockRequirement);
  assert.equal(bought.length, 8);
  const maxed = Object.fromEntries(Object.keys(CARS).map(car => [car,
    {engine: 3, nitro: 3, handling: 3, tires: 3, brakes: 3, suspension: 3, tank: 3}]));
  const garages = [createProfile(),
    {...createProfile(), unlockedCars: bought, upgrades: maxed},
    {...createProfile(), unlockedCars: bought.slice(0, 7), upgrades: maxed},
    {...createProfile(), unlockedCars: [...bought, 'koenigsegg_jesko'], upgrades: {}}];
  assert.deepEqual(bought, Object.keys(CARS).filter(car => !['koenigsegg_jesko', 'ferrari_enzo', 'mclaren_f1', 'bugatti_bolide', 'falcone_sirena'].includes(car)),
    'the list is every car but the Jesko, the medal cars and the Lab-restored Sirena (an earned car never joins it), as before');
  assert.deepEqual(garages.map(garage => completionCarProgress(garage)).map(({maxed, total, eligible}) => [maxed, total, eligible]),
    [[0, 8, false], [8, 8, true], [7, 8, false], [0, 8, false]]);
  assert.equal(normalizeProfile(garages[2]).unlockedCars.includes('koenigsegg_jesko'), false);
  assert.ok(normalizeProfile(garages[1]).unlockedCars.includes('koenigsegg_jesko'));
  assert.ok(normalizeProfile(garages[3]).drivers.unlocked.includes('axel_storm'), 'Jesko owners keep Axel');
});

test('a saved shape gains a sheet only if it had one, and the sheet changes nothing else', () => {
  const dir = new URL('./fixtures/saves/', import.meta.url);
  for (const file of readdirSync(dir).filter(name => name.endsWith('.json')).sort()) {
    const storage = JSON.parse(readFileSync(new URL(file, dir), 'utf8')).storage;
    const profiles = storage[PLAYERS_KEY]?.players.map(player => player.profile) ?? [storage[PROFILE_KEY]];
    for (const raw of profiles) {
      const now = normalizeProfile(raw);
      if (!Object.hasOwn(raw, 'medals')) {
        assert.equal(Object.hasOwn(now, 'medals'), false, `${file}: no sheet added`);
        continue;
      }
      const {medals: sheet, ...rest} = now;
      const {medals: _, ...rawWithout} = raw;
      assert.deepEqual(rest, normalizeProfile(rawWithout), `${file}: the sheet changes nothing else`);
      assert.deepEqual(sheet, raw.medals, `${file}: a well formed saved sheet loads exactly`);
      assert.ok(sheet.cars.future_car, 'the unknown car is kept');
      const memory = new Map(), storage = {getItem: key => memory.get(key) ?? null,
        setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key)};
      assert.ok(savePlayers(createPlayerRegistry(now), storage));
      assert.deepEqual(activePlayer(loadPlayers(storage)).profile.medals, sheet, `${file}: the sheet survives a save`);
    }
  }
});

test('one named player\'s wins never reach another\'s sheet', () => {
  let registry = createPlayerRegistry();
  const first = registry.activePlayerId;
  const added = createPlayer(registry, 'Medal Kid');
  registry = added.registry;
  const kid = registry.activePlayerId;
  registry = replacePlayerProfile(registry, kid, settleRace(activePlayer(registry).profile, finish()).profile);
  assert.deepEqual(activePlayer(registry).profile.medals.cars.falcone_f42.duel, [1, 0, 0]);
  registry = selectPlayer(registry, first);
  assert.equal(Object.hasOwn(activePlayer(registry).profile, 'medals'), false);
});

// The final medal car is still to come, so this runs a
// scratch copy of the code with three test cars added to its config, for the
// 6, 15 and 24 rungs. Nothing is added to src/.
test('medal cars are earned at 6, 15 and 24 (6 gold), arrive fully tuned and are never taken back', async () => {
  const sixMedals = {version: 1, cars: {falcone_f42: {duel: [1, 1, 1], grandprix: [1, 1, 1]}}};
  const saved = {...createProfile(), unlockedCars: ['falcone_f42', 'stuttgart_959s', 'medal_test_a'], medals: sixMedals};
  // A build that does not know the car (this one, without the test cars) drops
  // it from the garage and keeps the sheet, as an older build would.
  const rolledBack = normalizeProfile(saved);
  assert.equal(rolledBack.unlockedCars.includes('medal_test_a'), false);
  assert.deepEqual(rolledBack.medals, sixMedals);
  await mkdir(join(root, '.qa-dist'), {recursive: true});
  const scratch = await mkdtemp(join(root, '.qa-dist', 'medals-test-'));
  try {
    await cp(join(root, 'src'), join(scratch, 'src'), {recursive: true});
    await cp(join(root, 'package.json'), join(scratch, 'package.json'));
    await mkdir(join(scratch, 'tools/blender'), {recursive: true});
    await cp(join(root, 'tools/blender/gunn-turret.json'), join(scratch, 'tools/blender/gunn-turret.json'));
    const configPath = join(scratch, 'src', 'config.js');
    const config = await readFile(configPath, 'utf8');
    const anchor = "export const DEFAULT_CAR = 'falcone_f42';";
    assert.ok(config.includes(anchor));
    const testCar = (id, rule) => `CARS.${id}={...CARS.falcone_f42,name:'${id}',unlockRequirement:${JSON.stringify(rule)},factoryMaxed:true};\n`;
    await writeFile(configPath, config.replace(anchor,
      testCar('medal_test_a', {kind: 'medals', medals: 6}) +
      testCar('medal_test_b', {kind: 'medals', medals: 15}) +
      testCar('medal_test_c', {kind: 'medals', medals: 24, gold: 6}) + anchor));
    const code = `
import assert from 'node:assert/strict';
import {COURSE} from './src/config.js';
import {MEDAL_CARS, medalTotals} from './src/medals.js';
import {createProfile, normalizeProfile, settleRace, unlockCar, completionCarProgress, getUpgradeLevels} from './src/progression.js';
assert.deepEqual(MEDAL_CARS, ['ferrari_enzo', 'mclaren_f1', 'bugatti_bolide', 'medal_test_a', 'medal_test_b', 'medal_test_c']);
assert.equal(completionCarProgress(createProfile()).total, 8, 'medal cars never join the Jesko list');
const sheet = cars => ({version: 1, cars});
const owns = (profile, car) => profile.unlockedCars.includes(car);
const fullyTuned = (profile, car) => Object.values(profile.upgrades[car]).every(level => level === 3)
  && Object.values(getUpgradeLevels(profile, car)).every(level => level === 3);
// Five medals: not yet, and asking says what is missing.
const five = normalizeProfile({...createProfile(), medals: sheet({falcone_f42: {duel: [1, 1, 1], grandprix: [1, 1, 0]}})});
assert.equal(owns(five, 'medal_test_a'), false);
const early = unlockCar(five, 'medal_test_a');
assert.equal(early.ok, false); assert.equal(early.cost, 0); assert.equal(early.profile, five);
assert.equal(early.reason, '6 medals needed, you have 5.');
// The race that brings the sixth medal earns the car.
const pacific = COURSE.findIndex(course => course.id === 'pacific-canyon');
const win = settleRace(five, {runId: 'grant', stageIndex: pacific, car: 'stuttgart_959s', mode: 'duel', difficulty: 'casual',
  cpuDifficulty: 'easy', seed: 1989, laps: 2, completed: true, won: true, timeSec: 180, lapTimes: [90, 90], earnedCarsEnabled: true});
assert.deepEqual(win.earnedCars, ['ferrari_enzo', 'medal_test_a'], 'the real 6-medal Enzo and the 6-medal test car arrive together');
assert.ok(owns(win.profile, 'medal_test_a')); assert.ok(fullyTuned(win.profile, 'medal_test_a'));
assert.equal(unlockCar(win.profile, 'medal_test_a').reason, 'This car is already in your garage.');
// A save that already has the medals earns it on load.
const onLoad = normalizeProfile({...createProfile(), medals: sheet({falcone_f42: {duel: [1, 1, 1], grandprix: [1, 1, 1]}})});
assert.ok(owns(onLoad, 'medal_test_a')); assert.equal(owns(onLoad, 'medal_test_b'), false);
// 24 medals with 5 gold is not enough for the third car; the sixth gold is.
const cars = ['falcone_f42', 'stuttgart_959s', 'falcone_heritage', 'aurora_gt', 'dusthawk_rally', 'banshee_muscle'];
const rows = gold => Object.fromEntries(cars.map((car, i) => [car, {duel: [1, 1, i < gold ? 1 : 0], grandprix: [1, 1, 0]}]));
const fiveGold = normalizeProfile({...createProfile(), medals: sheet(rows(5))});
assert.deepEqual(medalTotals(fiveGold), {medals: 29, gold: 5});
assert.ok(owns(fiveGold, 'medal_test_b')); assert.equal(owns(fiveGold, 'medal_test_c'), false);
assert.equal(unlockCar(fiveGold, 'medal_test_c').reason, '24 medals needed, you have 29; 6 of them gold, you have 5.');
const sixGold = normalizeProfile({...createProfile(), medals: sheet(rows(6))});
assert.ok(owns(sixGold, 'medal_test_c')); assert.ok(fullyTuned(sixGold, 'medal_test_c'));
assert.ok(owns(sixGold, 'bugatti_bolide') && !owns(fiveGold, 'bugatti_bolide'), 'the real Bolide follows the same 24-with-6-gold rule');
// Once earned, never taken back, even with an empty sheet.
const kept = normalizeProfile({...createProfile(), unlockedCars: ['falcone_f42', 'stuttgart_959s', 'medal_test_c']});
assert.ok(owns(kept, 'medal_test_c'));
// Unknown cars on the sheet are kept and never counted.
const unknown = normalizeProfile({...createProfile(), medals: sheet({gone_car: {duel: [1, 1, 1], grandprix: [1, 1, 1]}})});
assert.ok(unknown.medals.cars.gone_car); assert.equal(owns(unknown, 'medal_test_a'), false);
// One release back: the older build dropped the car but kept the sheet; the car comes back.
const rolled = JSON.parse(process.env.MEDALS_ROLLED_BACK);
assert.equal(owns(rolled, 'medal_test_a'), false); assert.ok(rolled.medals);
const back = normalizeProfile(rolled);
assert.ok(owns(back, 'medal_test_a')); assert.ok(fullyTuned(back, 'medal_test_a'));
console.log('scratch medal cars passed');
`;
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', code], {cwd: scratch, encoding: 'utf8',
      windowsHide: true, env: {...process.env, MEDALS_ROLLED_BACK: JSON.stringify(rolledBack)}});
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.match(run.stdout, /scratch medal cars passed/);
  } finally {
    assert.equal(process.platform, 'win32', 'test cleanup requires the Recycle Bin');
    const part = relative(join(root, '.qa-dist'), scratch);
    assert.ok(/^medals-test-[a-zA-Z0-9]+$/.test(part), 'recycle only the folder this test made');
    const literal = "'" + scratch.replaceAll("'", "''") + "'";
    const script = 'Add-Type -AssemblyName Microsoft.VisualBasic; ' +
      '[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory(' + literal +
      ',[Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,[Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)';
    const cleanup = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand',
      Buffer.from(script, 'utf16le').toString('base64')], {windowsHide: true, encoding: 'utf8'});
    assert.equal(cleanup.status, 0, cleanup.stderr);
  }
});

// The production F1 grant crosses the real 15-medal threshold in a real result.
test('the real F1 is earned on the fifteenth medal, factory tuned and free', () => {
  const fourteen = normalizeProfile({...createProfile(), medals: {version: 1, cars: {
    falcone_f42: {duel: [1, 1, 1], grandprix: [1, 1, 1]},
    stuttgart_959s: {duel: [1, 1, 1], grandprix: [1, 1, 1]},
    falcone_heritage: {duel: [1, 1, 0], grandprix: [0, 0, 0]},
  }}});
  assert.deepEqual(medals.medalTotals(fourteen), {medals: 14, gold: 4});
  assert.equal(fourteen.unlockedCars.includes('mclaren_f1'), false);
  const early = unlockCar(fourteen, 'mclaren_f1');
  assert.equal(early.ok, false); assert.equal(early.cost, 0);
  assert.equal(early.reason, '15 medals needed, you have 14.');
  const won = settleRace(fourteen, finish({runId: 'f1-fifteenth', car: 'falcone_heritage', cpuDifficulty: 'hard'}));
  assert.deepEqual(medals.medalTotals(won.profile), {medals: 15, gold: 5});
  assert.deepEqual(won.earnedCars, ['mclaren_f1']);
  assert.ok(won.profile.unlockedCars.includes('mclaren_f1'));
  assert.equal(Object.keys(won.profile.upgrades.mclaren_f1).length, 7);
  assert.ok(Object.values(won.profile.upgrades.mclaren_f1).every(level => level === 3));
  assert.equal(won.profile.credits, fourteen.credits + won.reward, 'the grant charges no credits');
  assert.equal(unlockCar(won.profile, 'mclaren_f1').reason, 'This car is already in your garage.');
  const kept = normalizeProfile({...won.profile, medals: {version: 1, cars: {}}});
  assert.ok(kept.unlockedCars.includes('mclaren_f1'), 'empty sheets never take an earned F1 back');
});
