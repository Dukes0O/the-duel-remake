import assert from 'node:assert/strict';
import {test} from 'node:test';
import {App} from '../src/app.js';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {createProfile, loadPlayers, replacePlayerProfile, savePlayers, PLAYERS_KEY} from '../src/progression.js';
import {startWarlordEvent} from '../src/arena/warlord-event.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {arenaResultsScreen} from '../src/screen-arena.js';
import {screenMetric, screenAction} from '../src/screen-results.js';
import {seedPreviewProfile} from './preview-player.js';
import * as settlement from '../src/arena/warlord-settlement.js';

// WAR-PAY / SCRAPDOME 5: public payout policy, actual fight results and the
// existing single-write save path. All storage below belongs to this process.
let checks = 0, failWrites = false;
const values = new Map(), writes = [];
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (value, message) => { checks++; assert.ok(value, message); };
globalThis.localStorage = {
  getItem: key => values.get(String(key)) ?? null,
  setItem: (key, value) => {
    if (failWrites) throw Error('WAR-PAY synthetic storage failure');
    values.set(String(key), String(value)); writes.push(String(key));
  },
  removeItem: key => values.delete(String(key)),
};
globalThis.cancelAnimationFrame = () => {};
const flags = () => createFeatureFlags({storage: null, qa: true, search: '?flags=warlords'});
const ladder = ['sal', 'dustmonger', 'mirage', 'gunn', 'kettle', 'vultures', 'tollkeeper', 'blackiron'];
const factors = {easy: 1, medium: 1.2, hard: 1.4};
const registryWrites = () => writes.filter(key => key === PLAYERS_KEY).length;
test.after(() => console.log('Warlord pay: ' + checks + ' acceptance checks executed.'));

function pay(options) {
  ok(typeof settlement.warlordPay === 'function', 'WAR-PAY exposes the public warlordPay rule for the complete ladder');
  return settlement.warlordPay(options);
}
function profile(defeated = false) {
  const p = seedPreviewProfile(createProfile());
  return {...p, unknownRoot: {keep: 17}, wasteland: {...p.wasteland,
    unknownCareer: {keep: 23}, warlords: {...p.wasteland.warlords,
      sal: {...p.wasteland.warlords.sal, defeated, wins: defeated ? 1 : 0, losses: 0, unknownSal: {keep: 31}}}}};
}
function completedArena({won = true, wrecksOnWarlord = 3, credited = wrecksOnWarlord} = {}) {
  const duel = new Duel({featureFlags: flags()});
  assert.equal(startWarlordEvent(duel, {warlordId: 'sal', car: 'falcone_f42'}), true);
  const arena = structuredClone(duel.state.arena), [player, boss] = arena.participants;
  player.wrecks = credited; boss.wrecked = wrecksOnWarlord;
  player.wrecked = won ? 0 : 3; boss.wrecks = won ? 0 : 3;
  arena.phase = 'over';
  arena.result = {winnerId: won ? 'player' : 'cpu-1', reason: 'damage',
    placings: won ? ['player', 'cpu-1'] : ['cpu-1', 'player']};
  return arena;
}
function settle(p, {cpuDifficulty = 'medium', arena = completedArena(), runId = 'pay-fight'} = {}) {
  return settlement.settleWarlordResult(p, {runId, ownerPlayerId: 'pay-driver',
    activePlayerId: 'pay-driver', arena, car: 'falcone_f42', cpuDifficulty});
}
function launch(app) {
  assert.equal(app.startWarlordFight('sal'), true, 'production fight entry works');
  assert.equal(app.beginWarlordFight(), true, 'production fight intro starts');
  app.duel.state.countdown = 0; app.duel.step(1 / 120); app.duel.step(1 / 120);
}
function appFight(cpuDifficulty = 'medium') {
  values.clear(); failWrites = false; writes.length = 0;
  const app = new App(); app.duel.featureFlags = flags(); app.audio.unlock = () => {};
  app.cpuDifficulty = cpuDifficulty; app.profile = profile();
  assert.equal(app._saveProfile(), true, 'memory-only Preview seed is durable');
  assert.equal(app.visitWasteland(), true); app.advance(8); launch(app);
  return app;
}
function wreck(app, victimId, owner) {
  const duel = app.duel, loser = victimId === 'player' ? duel.state : duel.state.opponents[0];
  for (const p of duel.state.arena.participants) {p.protectedSec = 0; p.wreckCounted = false;}
  duel.state.invulnerableSec = 0; duel.state.combat.shield = 0; duel.state.combat.rivalShield = 0;
  loser.combatWrecking = false; loser.armor = 1;
  applyArmorDamage(duel, loser, 'crossbow', {owner}); duel.step(1 / 120);
}
function finish(app, won = true) {
  for (let n = 0; n < 3; n++) wreck(app, won ? 'cpu-1' : 'player', won ? 'player' : 'cpu-1');
  assert.equal(app.duel.state.status, 'arena_result', 'three real credited wrecks complete the fight');
  return app.duel.state.arena.result;
}
function screen(app) {
  return arenaResultsScreen(app.duel.state, {metric: screenMetric, action: screenAction, escapeHTML: String});
}

for (const [cpuDifficulty, factor] of Object.entries(factors)) {
  test('first-win pay covers all eight ladder positions on ' + cpuDifficulty, () => {
    equal(ladder.map((warlordId, index) => pay({warlordId, won: true, firstWin: true,
      wrecksOnWarlord: 3, cpuDifficulty})), ladder.map((_, index) => Math.round((600 + 100 * index) * factor)),
    'first win starts at 600 and rises by 100 per earlier warlord, then uses the fight factor');
  });
  test('Sal first win settles the ' + cpuDifficulty + ' payout without mutating its old career', () => {
    const p = profile(), before = structuredClone(p), result = settle(p, {cpuDifficulty});
    equal(result.scrapEarned, Math.round(600 * factor), 'first Sal win uses the arena difficulty factor');
    equal(result.firstWin, true, 'fresh Preview seed is a first win');
    equal(p, before, 'settlement does not mutate its input');
  });
  test('rematches pay actual boss wrecks on ' + cpuDifficulty, () => {
    const counts = [0, 1, 2, 3, 9];
    equal(counts.map(wrecksOnWarlord => settle(profile(true), {cpuDifficulty,
      arena: completedArena({wrecksOnWarlord, credited: 0})}).scrapEarned),
      counts.map(count => Math.round((80 + 60 * Math.min(3, count)) * factor)),
      'rematch pays 80 plus actual boss wrecks, capped at three, including uncredited wall wrecks');
  });
  test('losses pay actual boss wrecks on ' + cpuDifficulty, () => {
    const counts = [0, 1, 2, 3, 9];
    equal(counts.map(wrecksOnWarlord => settle(profile(), {cpuDifficulty,
      arena: completedArena({won: false, wrecksOnWarlord, credited: 0})}).scrapEarned),
      counts.map(count => Math.round(60 * Math.min(3, count) * factor)),
      'loss pays actual boss wrecks without first-win pay or win bonus');
  });
}

test('a fresh Preview player wins first, rematches, then loses in the same actual App tab', () => {
  const app = appFight();
  try {
    equal(app.profile.wasteland.warlords.sal.defeated, false, 'Preview seed has never beaten Sal');
    const first = finish(app);
    equal([first.scrapEarned, first.firstWin], [720, true], 'first actual Medium win earns 720, never rematch pay');
    launch(app); const second = finish(app);
    equal([second.scrapEarned, second.firstWin], [312, false], 'second actual Medium win earns the 312 rematch pay');
    launch(app); wreck(app, 'cpu-1', 'player'); wreck(app, 'cpu-1', 'player'); const loss = finish(app, false);
    equal([loss.scrapEarned, loss.firstWin], [144, false], 'actual loss after two boss wrecks earns 144');
    equal(app.profile.wasteland.scrap, 1176, 'three distinct fights bank exactly their awards');
    equal([app.profile.wasteland.warlords.sal.wins, app.profile.wasteland.warlords.sal.losses], [2, 1],
      'each actual completed fight records exactly once');
  } finally {app.dispose?.();}
});

test('pay uses the captured fight difficulty after the menu choice changes', () => {
  const app = appFight('medium');
  try {
    equal(app.duel.state.cpuDifficulty, 'medium', 'fight captured Medium on entry');
    app.cpuDifficulty = 'easy';
    equal(finish(app).scrapEarned, 720, 'later menu setting cannot change completed Medium pay');
  } finally {app.dispose?.();}
});

test('first-win result explains why the displayed award was earned', () => {
  const app = appFight();
  try {
    finish(app); const rendered = screen(app);
    ok(/first win/i.test(rendered.description + rendered.metrics), 'saved first win is labelled FIRST WIN on the result screen');
    ok(/\+720/.test(rendered.metrics), 'result displays the paid first-win amount');
  } finally {app.dispose?.();}
});

test('rematch result explains why the displayed award was earned', () => {
  const app = appFight();
  try {
    finish(app); launch(app); finish(app); const rendered = screen(app);
    ok(/rematch/i.test(rendered.description + rendered.metrics), 'saved rematch pay is explained independently of the REMATCH button');
    ok(/\+312/.test(rendered.metrics), 'result displays the paid rematch amount');
  } finally {app.dispose?.();}
});

test('save failure awards zero; retry rebases on fresh named players and writes once', () => {
  const app = appFight(), before = structuredClone(app.profile), durable = [...values];
  try {
    writes.length = 0; failWrites = true; const result = finish(app); failWrites = false;
    equal(app.profile, before, 'failed new payout rolls back the entire visible owner');
    equal([...values], durable, 'failed payout changes no durable field');
    equal(registryWrites(), 0, 'failed payout makes no successful registry write');
    equal([result.scrapEarned, result.settlementSaved, result.settlementRetryable], [0, false, true],
      'unpaid result offers retry without advertising scrap');
    const fresh = loadPlayers(), owner = fresh.players.find(player => player.id === app.player.id);
    fresh.players.push({id: 'pay-other', name: 'Other', profile: {...createProfile(), credits: 900, unknownOther: {keep: 47}}});
    const updated = {...owner.profile, credits: 1765, unknownLater: {keep: 41}};
    assert.equal(savePlayers(replacePlayerProfile(fresh, owner.id, updated)), true);
    writes.length = 0;
    equal(app.retryArenaSettlement(), true, 'public retry saves the same immutable completed fight');
    equal(registryWrites(), 1, 'complete reward and marker enter one registry write');
    equal([app.profile.wasteland.scrap, result.scrapEarned], [720, 720], 'retry pays first Medium win exactly once');
    const saved = loadPlayers(), after = saved.players.find(player => player.id === owner.id).profile;
    equal([after.credits, after.unknownLater, after.unknownRoot, after.wasteland.unknownCareer,
      after.wasteland.warlords.sal.unknownSal], [1765, {keep: 41}, {keep: 17}, {keep: 23}, {keep: 31}],
      'fresh owner data and unknown fields survive higher pay');
    equal(saved.players.find(player => player.id === 'pay-other').profile.unknownOther, {keep: 47}, 'fresh other player survives retry');
    equal(app.retryArenaSettlement(), false, 'public repeat retry cannot pay again');
    equal(registryWrites(), 1, 'repeat retry performs no additional registry write');
  } finally {failWrites = false; app.dispose?.();}
});

test('successful higher-pay settlement atomically saves reward, territory and exact fight marker once', () => {
  const app = appFight();
  try {
    const runId = app.runId; writes.length = 0; const result = finish(app);
    equal(registryWrites(), 1, 'one registry write settles the complete fight');
    const saved = loadPlayers().players.find(player => player.id === app.player.id).profile;
    equal([saved.wasteland.scrap, saved.wasteland.warlords.sal.defeated, saved.wasteland.territories.sal.claimed,
      saved.wasteland.settledResults.includes('warlord:' + runId)], [720, true, true, true],
      'higher scrap, defeat, claim and immutable marker are durable together');
    equal(app._settleArenaResult({result}, app.duel.state), false, 'duplicate completed callback cannot award twice');
    equal(registryWrites(), 1, 'duplicate result performs no additional registry write');
  } finally {app.dispose?.();}
});

test('invalid payout economics reject without touching the owner or marker', () => {
  for (const cpuDifficulty of [undefined, null, '', 'extreme', 'toString', 2]) {
    const p = profile(), before = structuredClone(p), result = settlement.settleWarlordResult(p, {
      runId: 'invalid-pay', ownerPlayerId: 'pay-driver', activePlayerId: 'pay-driver',
      arena: completedArena(), car: 'falcone_f42', cpuDifficulty});
    equal([result.awarded, result.scrapEarned], [false, 0], 'unknown difficulty must not guess an award');
    assert.equal(result.profile, p, 'unknown difficulty retains the exact input');
    equal(p, before, 'unknown difficulty preserves owner and markers');
  }
  for (const wrecksOnWarlord of [undefined, null, -1, 1.5, '3', Infinity]) {
    const p = profile(), arena = completedArena();
    arena.participants.find(item => item.id === 'cpu-1').wrecked = wrecksOnWarlord;
    const before = structuredClone(p), result = settle(p, {arena});
    equal([result.awarded, result.scrapEarned], [false, 0], 'unknown boss wreck count must not guess an award');
    assert.equal(result.profile, p, 'unknown boss wreck count retains the exact input');
    equal(p, before, 'unknown boss wreck count preserves owner and markers');
  }
});
