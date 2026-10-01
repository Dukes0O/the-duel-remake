import assert from 'node:assert/strict';
import {test, after} from 'node:test';
import {Duel} from '../src/game.js';
import {fireWeapon} from '../src/combat-weapons.js';
import {stepCombat} from '../src/combat.js';
import {stepProjectiles} from '../src/combat-projectiles.js';
import {stepRaiders} from '../src/raiders.js';
import {stepFootWeapons, resetFootWeaponUser} from '../src/onfoot-weapons.js';
import {combatResultSnapshot} from '../src/combat-scoring.js';
import {combatNotoriety} from '../src/notoriety.js';
import {createProfile, settleRace} from '../src/progression.js';
import {COMBAT_TUNING as T} from '../src/wasteland-tuning.js';

// ARENA-03 follow-up: current on-foot-only event XP filter and RAID-02 policy.
// Never fabricate an onFoot event or a replacement reward. Native car/RPG
// launches hit actual seeded raiders, and their own result snapshot settles.
const DT = 1 / 120;
let checks = 0;
const eq = (a, b, message) => { checks++; assert.deepEqual(a, b, message); };
const ok = (value, message) => { checks++; assert.ok(value, message); };
const ticks = (duel, n) => { for (let i = 0; i < n; i++) duel.step(DT); };
function race() {
  const duel = new Duel({seed: 1989, featureFlags: {wasteland2: true}});
  duel.startCampaign({mode: 'wasteland', car: 'falcone_f42', crewId: 'nell',
    startStage: 0, discoveredGate: true, opponentCount: 3, seed: 1989});
  const state = duel.state;
  state.status = 'racing'; state.countdown = 0; state.invulnerableSec = 0;
  state.speedMph = 0; state.traffic = [];
  state.combat.aiTimer = state.combat.pickupTimer = Infinity;
  const r = state.raids.zones[0].raiders[0];
  Object.assign(state, {s: r.s - 30, prevS: r.s - 30,
    lateral: 0, prevLateral: 0, speedMph: 0});
  for (const [i, car] of state.opponents.entries()) Object.assign(car,
    {s: 100 + i * 100, prevS: 100 + i * 100, lateral: 0, prevLateral: 0,
      speedMph: 0, combatShield: 0, headingError: 0, pushVelocity: 0});
  eq(state.onFoot, false, 'the player starts in the actual occupied car');
  eq(r.health, 70, 'the actual generated raider starts with its existing 70 health');
  const events = [];
  duel.onChange((_state, event) => { if (event.raiderKnockdown) events.push(event); });
  return {duel, r, events};
}
function carBolt(context) {
  const {duel, r} = context, state = duel.state;
  eq(state.onFoot, false, 'car crossbow is fired while the player really remains in the car');
  eq(fireWeapon(duel, 'crossbow'), true, 'the native player car weapon actually fires');
  const shot = state.combat.projectiles.at(-1);
  eq(shot.kind, 'crossbow', 'the real fired projectile keeps its car weapon kind');
  eq(shot.enemy, false, 'the actual car projectile is player owned');
  // Controlled physical path, not a forged event or direct damageRaider call.
  // Both sweep endpoints miss; the actual production path crosses the body.
  Object.assign(shot, {x: r.x - 2, y: r.y + .9, z: r.z,
    vx: 480, vy: 0, vz: 0, targetIndex: null});
  stepProjectiles(duel, DT);
  eq(state.onFoot, false, 'resolving the actual car bolt does not put its driver on foot');
  eq(state.combat.projectiles.some(p => p.id === shot.id), false,
    'the actual swept raider contact consumes the real car bolt');
}
function carDown() {
  const c = race(); carBolt(c);
  eq(c.r.health, 35, 'the first actual car bolt removes exactly 35 health');
  eq(c.r.knockedDown, false, 'the first real car bolt leaves this raider standing');
  stepCombat(c.duel, 4); // Native cooldown update; no new shot or fabricated timer reset.
  carBolt(c);
  eq(c.r.knockedDown, true, 'two actual player car bolts knock the generated raider down');
  eq(c.r.health, 0, 'the native knocked raider has zero health');
  eq(c.r.knockdownRemaining, 3, 'car contact keeps the existing three-second raider recovery');
  return c;
}
function payload(duel) {
  const state = duel.state;
  // Match the current App's metadata around the real simulation snapshot.
  return {...combatResultSnapshot(duel), runId: 'fuel-attribution-fixture',
    stageIndex: state.stageIndex, car: state.car, mode: state.mode,
    cpuDifficulty: state.cpuDifficulty, difficulty: state.difficulty,
    combatRewardsEnabled: duel.featureFlags.enabled('wasteland2'),
    completed: true, won: true, timeSec: 180, laps: state.lapsTotal};
}
function finish(duel) {
  const state = duel.state;
  state.stageTimeSec = 180; state.completedLaps = state.lapsTotal;
  state.s = duel.raceLength; state.lapTimes = Array(state.lapsTotal).fill(90);
  eq(duel._finishStage(), true, 'the actual race produces a completed result snapshot');
  return {...state.results, ...payload(duel)};
}
function rocket(context) {
  const {duel, r} = context, state = duel.state, f = state.fighter;
  eq(state.onFoot, true, 'the real foot weapon user remains on foot');
  const distance = Math.hypot(r.x - f.x, r.z - f.z);
  Object.assign(f, {yaw: Math.atan2(r.x - f.x, r.z - f.z),
    pitch: Math.atan2(r.y + .9 - f.y - T.foot.rpgEyeHeight, distance)});
  resetFootWeaponUser(duel);
  eq(duel.setFighterInput({fire: true, aim: false}), true, 'native foot input accepts fire');
  const ammo = state.footWeapons.ammo;
  stepFootWeapons(duel, DT);
  eq(state.footWeapons.ammo, ammo - 1, 'the actual RPG launch spends its existing ammo');
  const shot = state.combat.projectiles.find(p => p.kind === 'rpg');
  ok(shot, 'the genuine F-exited fighter fires the native RPG projectile');
  eq(shot.owner, 'player', 'native foot RPG retains its player ownership');
  duel.setFighterInput({fire: false}); stepFootWeapons(duel, DT);
  for (let i = 0; i < 120 && state.combat.projectiles.some(p => p.id === shot.id); i++)
    stepProjectiles(duel, DT);
}
function footDown() {
  const c = race();
  c.duel.setInput({interact: true}); ticks(c.duel, 48);
  c.duel.setInput({interact: false});
  eq(c.duel.state.onFoot, true, 'a real 48-step F hold creates the genuine foot fighter');
  rocket(c);
  eq(c.r.knockedDown, true, 'the genuine native on-foot RPG knocks its actual raider down');
  eq(c.r.knockdownRemaining, 3, 'genuine foot contact retains the existing recovery duration');
  return c;
}
const awards = c => (c.duel.state.combat.notorietyEvents || [])
  .filter(event => event.type === 'raiderKnockdown' && event.id === 'raider-' + c.r.id);

test('actual car-to-raider knockdown has accurate car attribution in its gameplay event', () => {
  const c = carDown();
  eq(c.events.length, 1, 'one real car knockdown emits one actual raider-knockdown event');
  eq(c.events[0].owner, 'player', 'the actual car knockdown keeps its real player owner');
  eq(c.events[0].source, 'car', 'the real car knockdown event identifies a car source');
});
test('actual car-to-raider contact never creates a false on-foot XP event', () => {
  const c = carDown();
  eq(awards(c).some(event => event.source === 'onFoot'), false,
    'a car bolt cannot label its raider knockdown as an on-foot award');
  ok(awards(c).every(event => event.source === 'car'),
    'any retained car knockdown award record keeps the accurate car source');
});
test('a car raider knockdown does not display a false +25 Notoriety promise', () => {
  const c = carDown();
  eq(/\+25\s+NOTORIETY/i.test(c.duel.state.callout), false,
    'a real car raider hit never promises the excluded on-foot +25 XP');
});
test('the actual XP filter excludes real car raider events while keeping normal finish and win XP', () => {
  const c = carDown(), xp = combatNotoriety(payload(c.duel), {finished: true, won: true});
  eq(xp.breakdown.raiderKnockdown, 0,
    'the existing on-foot XP filter excludes the actual car-caused knockdown');
  eq(xp.total, 400, 'car contact invents no new award beyond the existing finish and win');
});
test('native finish and real settlement never bank fake on-foot raider XP from car bolts', () => {
  const c = carDown(), result = finish(c.duel), settled = settleRace(createProfile(), result);
  eq(settled.awarded, true, 'the real completed combat result is eligible for its normal settlement');
  eq(settled.notorietyBreakdown.raiderKnockdown, 0,
    'real settlement excludes the false on-foot award from actual car hits');
  eq(settled.profile.wasteland.xp, 400, 'only existing legitimate finish and win XP reaches the fabricated profile');
  eq(settleRace(settled.profile, result).awarded, false, 'duplicate actual settlement cannot award again');
});
test('car bolt recovery cannot farm a false on-foot XP award', () => {
  const c = carDown(); stepRaiders(c.duel, 3);
  eq(c.r.knockedDown, false, 'the actual seeded raider recovers after exactly three seconds');
  eq(c.r.health, 70, 'actual raider recovery restores its existing health');
  stepCombat(c.duel, 4); carBolt(c); stepCombat(c.duel, 4); carBolt(c);
  eq(c.r.knockedDown, true, 'a recovered raider can still take real car contact');
  const xp = combatNotoriety(payload(c.duel), {finished: true, won: true});
  eq(xp.breakdown.raiderKnockdown, 0,
    'repeated real car knockdowns never farm an on-foot award');
});
test('a genuine F-exited fighter keeps the existing one-time RPG raider XP', () => {
  const c = footDown(), records = awards(c);
  eq(records.length, 1, 'genuine on-foot contact records one actual raider award');
  eq(records[0].source, 'onFoot', 'genuine RPG contact retains its accurate on-foot source');
  eq(records[0].owner, 'player', 'genuine RPG award remains player owned');
  eq(/\+25\s+NOTORIETY/i.test(c.duel.state.callout), true,
    'a genuinely eligible foot knockdown keeps the current truthful callout');
  const xp = combatNotoriety(payload(c.duel), {finished: true, won: true});
  eq(xp.breakdown.raiderKnockdown, 25, 'the actual on-foot-only XP filter retains 25 XP for genuine RPG contact');
});
test('genuine on-foot recovery preserves one-time XP and actual settlement deduplication', () => {
  const c = footDown(), firstRecords = structuredClone(awards(c));
  stepRaiders(c.duel, 3); c.duel.state.stageTimeSec += 3;
  eq(c.r.knockedDown, false, 'the genuine foot victim actually recovers');
  eq(c.r.health, 70, 'the recovered genuine foot victim keeps its native health');
  rocket(c); eq(c.r.knockedDown, true, 'a recovered raider remains physically hittable by the native RPG');
  eq(awards(c), firstRecords, 'recovering the same raider never duplicates its genuine on-foot award');
  eq(/\+25\s+NOTORIETY/i.test(c.duel.state.callout), false,
    'a repeated already-awarded foot knockdown does not promise another award');
  const result = finish(c.duel), settled = settleRace(createProfile(), result);
  eq(settled.notorietyBreakdown.raiderKnockdown, 25, 'one genuine raider award settles exactly once after recovery');
  eq(settled.profile.wasteland.xp, 425, 'genuine foot XP supplements only the existing finish and win XP');
  eq(settleRace(settled.profile, result).awarded, false, 'the actual foot result receipt prevents duplicate settlement');
});
test('native RPG contact cannot restart a downed raider recovery or create a second award', () => {
  const c = footDown(), records = structuredClone(awards(c));
  const timer = c.r.knockdownRemaining; c.duel.state.stageTimeSec += 2.3;
  rocket(c);
  eq(c.r.health, 0, 'another actual RPG cannot damage an already-down raider');
  eq(c.r.knockdownRemaining, timer, 'another actual RPG cannot restart raider recovery');
  eq(awards(c), records, 'actual contact during knockdown cannot duplicate its XP record');
});

test('an ineligible car knockdown preserves the first genuine on-foot award after actual recovery', () => {
  const c = carDown();
  const priorEligible = awards(c).filter(event => event.source === 'onFoot').length;
  stepRaiders(c.duel, 3); c.duel.state.stageTimeSec += 3;
  eq(c.r.knockedDown, false, 'the car-first raider actually recovers before genuine foot action');
  eq(c.r.health, 70, 'car-first recovery restores the same real raider health');
  c.duel.setInput({interact: true}); ticks(c.duel, 48);
  c.duel.setInput({interact: false});
  eq(c.duel.state.onFoot, true, 'the same car driver genuinely exits with the native 48-step F hold');
  rocket(c);
  eq(c.r.knockedDown, true, 'the recovered car-first raider takes a genuine native foot RPG hit');
  const eligible = awards(c).filter(event => event.source === 'onFoot');
  eq(eligible.length, priorEligible + 1,
    'an ineligible car knockdown cannot consume the first genuine on-foot XP entitlement');
  eq(eligible.length, 1, 'the same real raider has exactly one genuinely eligible foot award');
  eq(/\+25\s+NOTORIETY/i.test(c.duel.state.callout), true,
    'the first genuinely eligible foot knockdown truthfully promises its existing 25 XP');
  stepRaiders(c.duel, 3); c.duel.state.stageTimeSec += 3;
  rocket(c); eq(c.r.knockedDown, true, 'another actual recovery still leaves the same raider hittable');
  eq(awards(c).filter(event => event.source === 'onFoot'), eligible,
    'a later genuine RPG knockdown cannot farm the preserved one-time foot award');
  const result = finish(c.duel), settled = settleRace(createProfile(), result);
  eq(settled.notorietyBreakdown.raiderKnockdown, 25,
    'car-first then genuine-foot settlement keeps exactly the first eligible existing 25 XP');
  eq(settled.profile.wasteland.xp, 425, 'the car-first sequence adds no car award and preserves only legitimate foot XP');
  eq(settleRace(settled.profile, result).awarded, false, 'the real car-first/foot-after result settles only once');
});

// Director: ineligible car actions must not consume the current first eligible
// on-foot entitlement. Claude reviews this preservation interpretation before merge.
after(() => console.log('Fuel car attribution: ' + checks + ' acceptance checks reached.'));
