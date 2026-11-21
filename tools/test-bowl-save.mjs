import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {backupCareer} from '../src/career-backup.js';
import {createProfile, loadPlayers, PLAYERS_KEY, savePlayers} from '../src/progression.js';
import {bowlSchoolRecord, foundBowlTricks, recordBowlSchool, recordBowlSecret, recordBowlScore, settleBowlNight} from '../src/bowl/bowl-save.js';

let checks = 0;
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const ok = (actual, label) => { assert.ok(actual, label); checks++; };
const memory = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
};

// Scores only rise, and writing one Bowl field leaves the rest of the profile alone.
{
  const profile = {...createProfile(), credits: 123, bowl: {bestScores: {'car-crush': 400}}};
  const higher = recordBowlScore(profile, 'car-crush', 450);
  ok(higher.ok && higher.changed, 'a higher event score is recorded');
  equal(higher.profile.bowl.bestScores['car-crush'], 450, 'the new best is kept');
  equal(higher.profile.credits, profile.credits, 'credits are untouched');
  ok(!recordBowlScore(higher.profile, 'car-crush', 450).changed, 'an equal score changes nothing');
  ok(!recordBowlScore(higher.profile, 'car-crush', 200).changed, 'a lower score cannot replace a best');
  ok(!recordBowlScore(higher.profile, 'unknown-event', 999).ok, 'unknown events are refused');
  const newer = {...higher.profile, bowl: {version: 2, savedForLater: true}};
  ok(!recordBowlScore(newer, 'freestyle', 10).ok, 'a newer Bowl save is read-only');
  equal(recordBowlScore(newer, 'freestyle', 10).profile, newer, 'newer Bowl data stays exact');
}

// A School record adds only an offer and completed public lessons. It can
// round trip through the existing player store without changing older data.
{
  const older = {...createProfile(), credits: 123, bowl: {version: 1, nightsWon: [1],
    bestScores: {'car-crush': 410}, foundTricks: ['yoYo'], keepField: {tag: 15}}};
  const before = structuredClone(older);
  equal(bowlSchoolRecord(older), {offered: false, completed: []}, 'an older driver has no offer or lessons yet');
  equal(older, before, 'reading a legacy profile leaves every field alone');
  const offered = recordBowlSchool(older, {offered: true});
  ok(offered.ok && offered.changed, 'the offer is recorded');
  ok(!recordBowlSchool(offered.profile, {offered: true}).changed, 'deciding about the offer twice does nothing');
  const first = recordBowlSchool(offered.profile, {completed: ['wheelie', 'wheelie']});
  const next = recordBowlSchool(first.profile, {completed: ['stoppie', 'wheelie']});
  equal(bowlSchoolRecord(next.profile), {offered: true, completed: ['wheelie', 'stoppie']}, 'ticks add once in the same record');
  equal(recordBowlSchool(next.profile, {completed: ['yoYo']}).profile, next.profile, 'a hidden move cannot become a School lesson');

  const store = memory();
  const st = loadPlayers(store);
  st.players[0].profile = next.profile;
  ok(savePlayers(st, store), 'the existing player store accepts the optional field');
  const saved = loadPlayers(store).players[0].profile;
  equal(bowlSchoolRecord(saved), {offered: true, completed: ['wheelie', 'stoppie']}, 'offer and both ticks survive a reload');
  equal(saved.bowl, {...before.bowl, school: {version: 1, offered: true, completed: ['wheelie', 'stoppie']}},
    'all neighboring Bowl fields survive the school write');
  equal(older, before, 'the legacy input object is left unchanged');

  for (const bowl of [
    {version: 5, school: {version: 1, completed: ['wheelie']}},
    {version: 1, school: {version: 2, completed: ['future'], unknown: 30}},
    {version: 1, school: {version: 1, completed: {unexpected: true}}},
  ]) {
    const future = {...before, bowl}, exact = JSON.stringify(future);
    const rejected = recordBowlSchool(future, {offered: true, completed: ['donut']});
    ok(!rejected.ok && rejected.profile === future && JSON.stringify(future) === exact,
      'newer or unknown School data is left byte-for-byte intact');
  }
}

// Winning pays once to the established scrap wallet and only raises Bowl ownership.
{
  const profile = {...createProfile(), wasteland: {...createProfile().wasteland, scrap: 80},
    bowl: {nightsWon: [1], trophies: ['first'], paintOwned: ['rust'], boltOnsOwned: ['horn']}};
  const settled = settleBowlNight(profile, {night: 2, won: true, scrap: 125,
    trophy: 'second', paint: 'blue', boltOns: ['steam-stack']});
  ok(settled.ok && settled.changed, 'a won night settles');
  equal(settled.profile.wasteland.scrap, 205, 'the purse uses Wasteland scrap');
  equal(settled.profile.bowl.nightsWon, [1, 2], 'the won night is recorded');
  equal(settled.profile.bowl.trophies, ['first', 'second'], 'the trophy shelf only grows');
  equal(settled.profile.bowl.paintOwned, ['rust', 'blue'], 'owned paint only grows');
  equal(settled.profile.bowl.boltOnsOwned, ['horn', 'steam-stack'], 'owned bolt-ons only grow');
  const retry = settleBowlNight(settled.profile, {night: 2, won: true, scrap: 125,
    trophy: 'second', paint: 'blue', boltOns: ['steam-stack']});
  ok(!retry.changed && retry.profile === settled.profile, 'the same night cannot pay twice');
  ok(!settleBowlNight(settled.profile, {night: 3, won: false, scrap: 125}).changed,
    'a loss remains retryable and pays no purse');
  const capped = settleBowlNight({...profile, wasteland: {...profile.wasteland, scrap: 999_999_990}},
    {night: 3, won: true, scrap: 100});
  equal(capped.profile.wasteland.scrap, 1_000_000_000, 'scrap stays within the existing wallet limit');
}

// Existing save fixtures gain no Bowl field or other change on load/save.
{
  const names = readdirSync(new URL('./fixtures/saves/', import.meta.url)).filter(name => name.endsWith('.json'));
  for (const name of names) {
    const fixture = JSON.parse(readFileSync(new URL(`./fixtures/saves/${name}`, import.meta.url), 'utf8'));
    const storage = memory(Object.fromEntries(Object.entries(fixture.storage).map(([key, value]) => [key, JSON.stringify(value)])));
    const before = loadPlayers(storage);
    ok(before.players.every(player => !Object.hasOwn(player.profile, 'bowl')), `${name}: no Bowl data on load`);
    ok(savePlayers(before, storage), `${name}: old fixture saves`);
    const after = loadPlayers(storage);
    equal(after, before, `${name}: unchanged after save and reload`);
    ok(after.players.every(player => !Object.hasOwn(player.profile, 'bowl')), `${name}: no Bowl field added`);
  }
}

// A new Bowl save survives the normal player save and verified career backup round trip.
{
  const storage = memory();
  const before = settleBowlNight(recordBowlScore(createProfile(), 'freestyle', 1234).profile,
    {night: 1, won: true, scrap: 50, trophy: 'opening-night'}).profile;
  const newRecords = {'long-jump': 375, 'high-jump': 525, 'home-run': 750};
  const profile = Object.entries(newRecords).reduce((next, [event, score]) => recordBowlScore(next, event, score).profile, before);
  equal(before.bowl.bestScores, {freestyle: 1234}, 'adding jump records leaves the old driver object alone');
  equal(profile.bowl.nightsWon, before.bowl.nightsWon, 'jump records preserve earlier night wins');
  const registry = {version: 2, activePlayerId: 'bowl-test', players: [
    {id: 'bowl-test', name: 'Bowl Test', profile},
  ]};
  ok(savePlayers(registry, storage), 'Bowl career saves through the player store');
  const stored = loadPlayers(storage).players[0].profile;
  equal(stored.bowl.bestScores, {freestyle: 1234, ...newRecords}, 'old and new scores survive save and load');
  const lower = recordBowlScore(stored, 'home-run', 450);
  ok(lower.profile === stored && !lower.changed, 'a lesser ring leaves the Home Run record alone');
  equal(stored.bowl.settledNights, ['night:1'], 'settlement receipt survives save and load');
  equal(stored.wasteland.scrap, 50, 'purse survives save and load');
  const records = new Map();
  const backupStore = {save: async record => records.set(record.id, record), load: async id => records.get(id)};
  const backup = await backupCareer(storage, backupStore, 'bowl-save-test', () => new Date('2026-11-04T00:00:00Z'));
  const restored = memory(backup.entries);
  equal(loadPlayers(restored).players[0].profile, stored, 'career backup restores Bowl state exactly');
}

{
  const old = createProfile();
  equal(foundBowlTricks(old), [], 'old profiles have no found secrets');
  for (const invalid of [null, undefined, {bowl:4},{bowl:{version:1,foundTricks:'damaged'}}]) {
    const edit = recordBowlSecret(invalid,'gyro');
    ok(!edit.ok && edit.profile === invalid,'refuse a malformed discovery record in place');
  }
  const futureIds = {bowl:{version:1,foundTricks:['future-kind','gyro']}};
  equal(recordBowlSecret(futureIds,'corkscrew').profile.bowl.foundTricks,['future-kind','gyro','corkscrew'],'unrecognized stored IDs survive');
  const found = recordBowlSecret(old, 'gyro').profile;
  equal(foundBowlTricks(found), ['gyro'], 'a genuine kind can be recorded');
  ok(recordBowlSecret(found, 'gyro').profile === found && recordBowlSecret(found, 'unknown').profile === found, 'duplicate or invalid finds do not write');
  const newer = {...found, bowl: {...found.bowl, version: 8}};
  ok(recordBowlSecret(newer, 'yoYo').profile === newer, 'newer records remain untouched');
  const storage = memory();
  const registry = {version:2,activePlayerId:'one',players:[{id:'one',name:'One',profile:found},{id:'two',name:'Two',profile:old}]};
  ok(savePlayers(registry,storage),'two independent drivers saved in memory');
  equal(loadPlayers(storage).players.map(p => foundBowlTricks(p.profile)), [['gyro'],[]], 'finds survive loading and stay with the finder');
}
// Discoveries are written from a real landing against the current driver's durable record.
{
  globalThis.window = new EventTarget();
  window.location = {search: ''};
  globalThis.Element ??= class {};
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  const {App} = await import('../src/app.js');
  const {stepBowlTricks, landBowlTricks} = await import('../src/bowl/bowl-tricks.js');
  for (const situation of ['same version', 'newer version', 'missing', 'damaged', 'switched driver']) {
    const store = globalThis.localStorage = memory();
    const app = new App();
    app.audio.unlock = app.audio.setPaused = () => {};
    const base = app.duel.featureFlags.base || app.duel.featureFlags;
    const flags = {...base, enabled: name => name === 'titan-bowl' || base.enabled(name)};
    flags.base = flags;
    app.duel.featureFlags = flags;
    app.addPlayer('Other');
    const other = app.player.id;
    app.addPlayer('Finder');
    app.startShowNight(1, {cpuDifficulty:'easy'});
    app.advance(5);
    const duel = app.duel, state = duel.state;
    function landCode(keys) {
      function run(input, ticks) {
        state.input = input;
        for (let i = 0; i < ticks; i++) {
          state.stageTimeSec += 1/120;
          stepBowlTricks(duel, state, 1/120);
        }
      }
      Object.assign(state,{airborne:false, speedMph:0});
      run({},48);
      Object.assign(state,{airborne:true, airHeight:38, _verticalSpeed:5});
      run({},6);
      for (const key of keys) { run(key,6); run({},7); }
      run({},150);
      state.airborne = false;
      landBowlTricks(duel,state);
    }
    const set = store.setItem;
    store.setItem = (key,value) => { if(key === PLAYERS_KEY) throw new Error('quota'); set(key,value); };
    landCode([{throttle:1},{throttle:1},{brake:1},{brake:1}]);
    ok(state.bowlSecretSavePending && state.bowlNight.foundTricks.includes('corkscrew'),'failed first landing stays in the session');
    store.setItem = set;
    const registry = JSON.parse(store.getItem(PLAYERS_KEY));
    const owner = registry.players.find(player => player.id === state.playerId);
    owner.profile.credits += 717;
    owner.profile.bowl = situation === 'newer version' ? {version:2,fromFuture:'keep me'} : {version:1,foundTricks:['gyro']};
    if (situation === 'switched driver') registry.activePlayerId = other;
    if (situation === 'missing') store.removeItem(PLAYERS_KEY);
    else set(PLAYERS_KEY,situation === 'damaged' ? '{' : JSON.stringify(registry));
    const before = store.getItem(PLAYERS_KEY);
    landCode([{steer:-1},{steer:-1},{steer:1},{steer:1}]);
    if (situation === 'same version') {
      owner.profile.bowl.foundTricks.push('corkscrew','tornado');
      equal(JSON.parse(store.getItem(PLAYERS_KEY)),registry,'both discoveries append while the outside edits survive');
    } else {
      equal(store.getItem(PLAYERS_KEY),before,situation+' registry stays exact');
      ok(state.bowlSecretSavePending,situation+' keeps the session save warning');
    }
  }
}
console.log(`test-bowl-save: ${checks} checks passed`);
