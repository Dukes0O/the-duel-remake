import assert from 'node:assert/strict';
import {test, after} from 'node:test';
import {Duel} from '../src/game.js';
import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';
import {raceFeatureFlags} from '../src/wasteland-access.js';
import {point, fireWeapon} from '../src/combat-weapons.js';
import {stepProjectiles} from '../src/combat-projectiles.js';
import {stepCombatAI} from '../src/combat-ai.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {stepFootWeapons} from '../src/onfoot-weapons.js';
import {DRIVE} from '../src/config.js';
import {COMBAT_TUNING as T} from '../src/wasteland-tuning.js';

// Tests intentionally report each missing contract independently. No stub is
// accepted as a completed component; native consumer checks are separate.
const modules = Object.fromEntries(await Promise.all(
  ['hazards', 'car-effects', 'targeting', 'oil', 'smoke'].map(async name => {
    try { return [name, await import('../src/arsenal/' + name + '.js')]; }
    catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND' ||
          !error.url?.endsWith('/arsenal/' + name + '.js')) throw error;
      return [name, null];
    }
  })));
let checks = 0;
const eq = (a, b, message) => {checks++; assert.deepEqual(a, b, message);};
const ok = (value, message) => {checks++; assert.ok(value, message);};
const near = (a, b, message) => ok(Math.abs(a - b) < 1e-7, message + ': ' + a + ' versus ' + b);
function api(module, name, scope = 'CORE') {
  eq(typeof modules[module]?.[name], 'function', scope + ': ' + module + '.' + name + ' must exist');
  return modules[module][name];
}
const DT = 1 / 120;
function place(car, s, lateral = 0) {
  Object.assign(car, {s, prevS: s, lateral, prevLateral: lateral,
    speedMph: 0, headingError: 0, yawVelocity: 0, pushVelocity: 0,
    impactTimer: 0, airHeight: 0, prevAirHeight: 0, combatShield: 0});
}
function race({enabled = true, discovered = true, difficulty = 'hard', arena = false} = {}) {
  // Explicit private catalog lets independent core APIs be exercised before
  // the production dev switch hook is granted. It never touches browser storage.
  const base = createFeatureFlags({catalog: {...FEATURE_STATES, arsenal: 'dev'},
    storage: null, overrides: {arsenal: enabled, wasteland2: true, scrapdome: true}});
  const duel = new Duel({seed: 1989, featureFlags: base});
  if (arena) eq(duel.startArenaEvent({car: 'falcone_f42', seed: 1989,
    cpuDifficulty: difficulty, opponents: [{car: 'dusthawk_rally', brain: 'hunter'},
      {car: 'aurora_gt', brain: 'collector'}]}), true, 'native arena starts');
  else duel.startCampaign({mode: 'wasteland', car: 'falcone_f42', seed: 1989,
    startStage: 0, discoveredGate: discovered, cpuDifficulty: difficulty, opponentCount: 2});
  const state = duel.state;
  Object.assign(state, {status: 'racing', countdown: 0, invulnerableSec: 0, traffic: []});
  state.combat.aiTimer = state.combat.pickupTimer = Infinity;
  place(state, 500); place(state.opponents[0], 540);
  place(state.opponents[1], 600, 5);
  if (state.arena) for (const p of state.arena.participants) p.protectedSec = 0;
  return duel;
}
function circle(duel, actor, extra = {}) {
  const at = point(duel, actor);
  return api('hazards', 'addHazard')(duel, {kind: 'test', shape: 'circle',
    x: at.x, z: at.z, radius: 1, lifetime: 2, ...extra});
}
function tickHazards(duel, count) {
  const step = api('hazards', 'stepHazards');
  for (let i = 0; i < count; i++) step(duel, DT);
}
function between(duel, a, b) {
  const p = point(duel, a), q = point(duel, b);
  return {x: (p.x + q.x) / 2, z: (p.z + q.z) / 2};
}
function cloud(duel, at, radius = 6) {
  return api('hazards', 'addHazard')(duel, {kind: 'smoke', shape: 'circle',
    ...at, radius, lifetime: 5, owner: duel.state});
}

for (const shape of ['circle', 'strip']) test('CORE: ' + shape + ' uses real car body overlap once per hazard', () => {
  const duel = race(), car = duel.state.opponents[0], at = point(duel, car);
  const width = duel._vehicleSpec(car).halfWidth, hits = [];
  const offset = width + .5 - .01;
  const spec = {kind: 'test', shape, x: at.x + Math.cos(at.heading) * offset,
    z: at.z - Math.sin(at.heading) * offset, radius: .5, length: 2,
    width: 1, heading: at.heading, lifetime: 2, onTouch: actor => hits.push(actor)};
  api('hazards', 'addHazard')(duel, spec);
  tickHazards(duel, 3);
  eq(hits.filter(actor => actor === car).length, 1,
    'body edge overlap applies once even though the real car centre is outside');
  place(car, 580, 8); tickHazards(duel, 1);
  place(car, 540); tickHazards(duel, 1);
  eq(hits.filter(actor => actor === car).length, 1, 'exit and re-entry never repeat this hazard');
  api('hazards', 'addHazard')(duel, spec); tickHazards(duel, 1);
  eq(hits.filter(actor => actor === car).length, 2, 'a distinct hazard can affect the same body once');
});

test('CORE: a circle beyond the actual body edge does not touch the car', () => {
  const duel = race(), car = duel.state.opponents[0], at = point(duel, car);
  let hits = 0;
  const offset = duel._vehicleSpec(car).halfWidth + 1.01;
  circle(duel, car, {x: at.x + Math.cos(at.heading) * offset,
    z: at.z - Math.sin(at.heading) * offset, onTouch: () => hits++});
  tickHazards(duel, 1); eq(hits, 0, 'steering around the actual hazard avoids body contact');
});

test('CORE: owner grace preserves a later first eligible contact', () => {
  const duel = race(), owner = duel.state; let own = 0;
  circle(duel, owner, {owner, ownerGraceSec: 1, onTouch: actor => {if (actor === owner) own++;}});
  const step = api('hazards', 'stepHazards');
  step(duel, .99); eq(own, 0, 'owner is harmless for the first second');
  step(duel, .01); eq(own, 1, 'ignored owner contact does not consume later entitlement');
  step(duel, DT); eq(own, 1, 'owner receives only one eligible contact');
});

test('CORE: hazards stay at most 24, expire and clear without touching race data', () => {
  const duel = race(), read = api('hazards', 'hazardsFor');
  const s = duel.state.s, armor = duel.state.armor;
  for (let i = 0; i < 30; i++) circle(duel, duel.state, {x: 1000 + i * 10, lifetime: .5});
  ok(read(duel).length <= 24, 'bounded hazards never exceed 24');
  ok(read(duel).length > 0, 'bounded list retains active hazards');
  tickHazards(duel, 61); eq(read(duel).length, 0, 'expired hazards are removed');
  circle(duel, duel.state); api('hazards', 'clearHazards')(duel);
  eq(read(duel).length, 0, 'explicit stage cleanup clears all hazards');
  eq(duel.state.s, s, 'hazard cleanup never resets race progress');
  eq(duel.state.armor, armor, 'harmless hazard cleanup never changes armor');
});

for (const kind of ['slick', 'grip', 'tether', 'disabled', 'burning', 'nitro']) {
  test('CORE: timed ' + kind + ' effect is independently readable and expires', () => {
    const duel = race(), cars = [duel.state, ...duel.state.opponents];
    const set = api('car-effects', 'setCarEffect'), read = api('car-effects', 'carEffect');
    const step = api('car-effects', 'stepCarEffects');
    for (const car of cars) {
      set(car, kind, {duration: .7, grip: .35});
      near(read(car, kind).remainingSec, .7, 'timed state begins at its authored duration');
      step(car, .2); near(read(car, kind).remainingSec, .5, 'fixed step advances the timed state');
      set(car, kind, {duration: .7, grip: .35});
      near(read(car, kind).remainingSec, .7, 'refresh replaces time instead of stacking');
      step(car, .7); eq(read(car, kind), null, 'effect returns to absent after its duration');
    }
  });
}

test('CORE: clearing one car effect never changes a different actual car', () => {
  const duel = race(), set = api('car-effects', 'setCarEffect'), read = api('car-effects', 'carEffect');
  set(duel.state, 'slick', {duration: 1, grip: .35});
  set(duel.state.rival, 'slick', {duration: 1, grip: .35});
  api('car-effects', 'clearCarEffects')(duel.state);
  eq(read(duel.state, 'slick'), null, 'stage cleanup clears only its named car');
  ok(read(duel.state.rival, 'slick'), 'independent actual CPU still retains its own timed state');
});

test('CORE: oil deploys four metres rearward with its exact radius and lifetime', () => {
  const duel = race(), owner = duel.state, at = point(duel, owner);
  const events = []; duel.onChange((_, event) => events.push(event));
  const oil = api('oil', 'deployOil')(duel, owner);
  near(oil.x, at.x - Math.sin(at.heading) * 4, 'oil is four metres behind x');
  near(oil.z, at.z - Math.cos(at.heading) * 4, 'oil is four metres behind z');
  eq(oil.shape, 'circle', 'oil is a circular pool');
  eq(oil.radius, 3.5, 'oil radius is exactly 3.5 metres');
  eq(oil.lifetime, 6, 'oil lasts exactly six seconds');
  eq(oil.ownerGraceSec, 1, 'oil owner grace is exactly one second');
  api('hazards', 'stepHazards')(duel, 5.5);
  ok(oil.opacity > 0 && oil.opacity < 1, 'oil visibly fades during its final second');
  api('hazards', 'stepHazards')(duel, .5);
  eq(api('hazards', 'hazardsFor')(duel).includes(oil), false, 'oil expires at six seconds');
  ok(events.some(event => event.arsenalCue === 'weapon.oil.deploy'), 'deploy event names its settled oil cue');
});

test('CORE: actual oil body contact slips, kicks away, slows once and never damages armor', () => {
  const duel = race(), target = duel.state.rival, owner = duel.state;
  place(owner, target.s + 4, 2);
  const oil = api('oil', 'deployOil')(duel, owner), at = point(duel, target);
  const events = []; duel.onChange((_, event) => events.push(event));
  target.speedMph = 60; const armor = target.armor;
  tickHazards(duel, 1);
  const slick = api('car-effects', 'carEffect')(target, 'slick');
  ok(slick, 'the actual contacted CPU receives slick');
  near(slick.remainingSec, .7, 'slick lasts 0.7 seconds');
  eq(slick.grip, .35, 'slick grip is exactly 0.35');
  near(target.speedMph, 51, 'oil multiplies speed by 0.85');
  near(Math.abs(target.yawVelocity), 2.2, 'oil adds the authored 2.2 rad/s spin kick');
  const side = (at.x - oil.x) * Math.cos(at.heading) - (at.z - oil.z) * Math.sin(at.heading);
  eq(Math.sign(target.yawVelocity), Math.sign(side), 'the kick turns away from the real pool centre');
  eq(target.armor, armor, 'oil never damages armor');
  tickHazards(duel, 4); near(target.speedMph, 51, 'remaining overlap does not repeat the speed loss');
  ok(events.some(event => event.arsenalCue === 'weapon.oil.slip'), 'eligible contact names its settled oil slip cue');
});

for (const shielded of [false, true]) test('CORE: oil steering/shield counter ' + shielded, () => {
  const duel = race(), target = duel.state.rival;
  place(duel.state, target.s + 4, 0);
  api('oil', 'deployOil')(duel, duel.state);
  if (shielded) duel.state.combat.rivalShield = 1;
  else place(target, target.s, 12);
  target.speedMph = 60;
  const armor = target.armor; tickHazards(duel, 1);
  eq(api('car-effects', 'carEffect')(target, 'slick'), null,
    shielded ? 'a real star shield ignores oil' : 'steering around oil avoids contact');
  near(target.speedMph, 60, 'the counter preserves native car speed');
  eq(target.armor, armor, 'the counter preserves native armor');
});

test('CORE: oil contact ends active nitro early', () => {
  const duel = race(), target = duel.state.rival;
  place(duel.state, target.s + 4);
  api('car-effects', 'setCarEffect')(target, 'nitro', {duration: 3});
  api('oil', 'deployOil')(duel, duel.state); tickHazards(duel, 1);
  eq(api('car-effects', 'carEffect')(target, 'nitro'), null, 'the settled oil counter ends nitro immediately');
});

test('CORE: oil deploy eligibility follows an actual enemy within 30 m behind in lane', () => {
  const duel = race(), owner = duel.state.rival, use = api('oil', 'shouldUseOil');
  place(duel.state, owner.s - 20); eq(use(duel, owner), true, 'actual enemy behind is eligible');
  place(duel.state, owner.s + 20); eq(use(duel, owner), false, 'enemy ahead is not eligible');
  place(duel.state, owner.s - 31); eq(use(duel, owner), false, 'enemy beyond thirty metres is excluded');
  place(duel.state, owner.s - 20, 15); eq(use(duel, owner), false, 'enemy in a distant lane is excluded');
});

test('CORE: smoke deploys four metres behind, drifts for one second and then stays', () => {
  const duel = race(), owner = duel.state, at = point(duel, owner);
  owner.speedMph = 60; const events = []; duel.onChange((_, event) => events.push(event));
  const smoke = api('smoke', 'deploySmoke')(duel, owner), first = {x: smoke.x, z: smoke.z};
  near(smoke.x, at.x - Math.sin(at.heading) * 4, 'smoke starts four metres behind x');
  near(smoke.z, at.z - Math.cos(at.heading) * 4, 'smoke starts four metres behind z');
  eq(smoke.radius, 6, 'smoke radius is six metres'); eq(smoke.lifetime, 5, 'smoke lasts five seconds');
  const step = api('hazards', 'stepHazards'); step(duel, .5); step(duel, .5);
  const distance = 60 * DRIVE.mphToWorld * .3;
  near(smoke.x, first.x - Math.sin(at.heading) * distance, 'first-second drift x uses thirty percent of actual speed');
  near(smoke.z, first.z - Math.cos(at.heading) * distance, 'first-second drift z uses thirty percent of actual speed');
  const stopped = {x: smoke.x, z: smoke.z}; step(duel, 1);
  near(smoke.x, stopped.x, 'smoke stops drifting after its first second');
  near(smoke.z, stopped.z, 'smoke remains at its stopped z');
  step(duel, 3); eq(api('hazards', 'hazardsFor')(duel).includes(smoke), false, 'smoke expires after five seconds');
  ok(events.some(event => event.arsenalCue === 'weapon.smoke.deploy'), 'smoke deployment names its settled cue');
});

for (const location of ['between', 'attacker', 'target', 'around']) {
  test('CORE: targetFor smoke geometry at ' + location + ' actual car poses', () => {
    const duel = race(), attacker = duel.state.rival, target = duel.state;
    const select = api('targeting', 'targetFor');
    eq(select(duel, attacker), target, 'without smoke the native CPU chooses the actual player');
    const at = location === 'attacker' ? point(duel, attacker) : location === 'target'
      ? point(duel, target) : between(duel, attacker, target);
    cloud(duel, {...at, x: at.x + (location === 'around' ? 30 : 0)});
    eq(select(duel, attacker), location === 'around' ? target : null,
      'smoke blocks through/inside but steering around a cloud restores the target');
  });
}

for (const fps of [30, 60, 144]) test('CORE: hazard/effect results repeat at ' + fps + ' presentation FPS', () => {
  const step = api('hazards', 'stepHazards'), effects = api('car-effects', 'stepCarEffects');
  function replay(frameRate) {
    const duel = race(); place(duel.state, 544); api('oil', 'deployOil')(duel, duel.state);
    duel.state.rival.speedMph = 60; let accumulator = 0, count = 0;
    for (let frame = 0; frame < frameRate * 2; frame++) {
      accumulator += 1 / frameRate;
      while (accumulator >= DT - 1e-10) {
        accumulator -= DT; step(duel, DT);
        for (const car of [duel.state, ...duel.state.opponents]) effects(car, DT);
        count++;
      }
    }
    return {count, speed: duel.state.rival.speedMph, yaw: duel.state.rival.yawVelocity,
      armor: duel.state.rival.armor, slick: api('car-effects', 'carEffect')(duel.state.rival, 'slick'),
      hazards: api('hazards', 'hazardsFor')(duel).map(h => ({kind: h.kind, age: +h.age.toFixed(8)}))};
  }
  eq(replay(fps), replay(120), 'seeded fixed-step hazard result is independent of presentation FPS');
});

// Integration obligations deliberately stay RED until the Director grants hooks.
test('INTEGRATION: arsenal is a production dev switch and discovery gates it', () => {
  eq(FEATURE_STATES.arsenal, 'dev', 'INTEGRATION: arsenal must start in dev');
  const base = createFeatureFlags({storage: null, qa: true, search: '?flags=arsenal'});
  eq(base.enabled('arsenal'), true, 'private QA may enable the dev switch');
  let state = {wastelandGateDiscovered: false};
  const view = raceFeatureFlags(base, () => state);
  eq(view.enabled('arsenal'), false, 'an undiscovered named player cannot use arsenal');
  state = {wastelandGateDiscovered: true};
  eq(view.enabled('arsenal'), true, 'discovery admits the requested arsenal switch');
});

test('INTEGRATION: a real scheduled CPU shot cannot bypass smoke', () => {
  const duel = race(), state = duel.state;
  state.combat.aiTimer = 0; stepCombatAI(duel, DT);
  ok(state.combat.projectiles.some(p => p.enemy), 'native clear-line scheduled shot is a positive control');
  state.combat.projectiles = [];
  cloud(duel, between(duel, state.rival, state));
  state.combat.aiTimer = 0; state.combat.aiTurn = 0; stepCombatAI(duel, DT);
  eq(state.combat.projectiles.filter(p => p.enemy && p.kind === 'crossbow').length, 0,
    'INTEGRATION: native scheduled CPU aimed fire must route through smoke targeting');
});

test('INTEGRATION: direct native CPU launch cannot bypass smoke while player straight fire remains legal', () => {
  const duel = race(); cloud(duel, between(duel, duel.state.rival, duel.state));
  eq(fireWeapon(duel, 'crossbow', true, duel.state.rival), false,
    'INTEGRATION: direct native CPU aimed launch must respect the same smoke targetFor');
  eq(fireWeapon(duel, 'crossbow', false), true, 'the player may still fire straight through smoke');
});

test('INTEGRATION: an actual fired crossbow stops homing while smoke interrupts its line', () => {
  const duel = race(); eq(fireWeapon(duel, 'crossbow', false), true, 'native player bolt launches before smoke');
  const shot = duel.state.combat.projectiles.at(-1), initial = Math.atan2(shot.vx, shot.vz);
  place(duel.state.rival, 540, 3); cloud(duel, between(duel, duel.state, duel.state.rival));
  stepProjectiles(duel, DT);
  near(Math.atan2(shot.vx, shot.vz), initial, 'INTEGRATION: native homing cannot bypass an intervening smoke cloud');
});

test('INTEGRATION: real fighter RPG lock breaks and fired RPG guidance stops in smoke', () => {
  const duel = race(), state = duel.state;
  duel.setInput({interact: true}); for (let i = 0; i < 48; i++) duel.step(DT);
  duel.setInput({interact: false}); eq(state.onFoot, true, 'real F hold creates the native fighter');
  const f = state.fighter, at = point(duel, state.rival);
  f.yaw = Math.atan2(at.x - f.x, at.z - f.z);
  f.pitch = Math.atan2(at.y - f.y - T.foot.rpgEyeHeight, Math.hypot(at.x - f.x, at.z - f.z));
  duel.setFighterInput({aim: true});
  for (let i = 0; i < 96; i++) stepFootWeapons(duel, DT);
  eq(state.footWeapons.lockTargetIndex, 0, 'native RPG acquires its real target before smoke');
  duel.setFighterInput({fire: true}); stepFootWeapons(duel, DT);
  const shot = state.combat.projectiles.find(p => p.kind === 'rpg'); ok(shot, 'a real locked RPG is launched');
  const initial = {vx: shot.vx, vy: shot.vy, vz: shot.vz};
  cloud(duel, between(duel, state, state.rival));
  stepFootWeapons(duel, DT);
  eq(state.footWeapons.lockTargetIndex, null, 'INTEGRATION: native RPG lock must break inside smoke');
  eq(state.footWeapons.lockSeconds, 0, 'broken native lock loses its charge');
  place(state.rival, state.rival.s, 3); stepProjectiles(duel, DT);
  near(shot.vx, initial.vx, 'INTEGRATION: native RPG guidance cannot bypass smoke x');
  near(shot.vz, initial.vz, 'INTEGRATION: native RPG guidance cannot bypass smoke z');
});

test('INTEGRATION: stage end and a new stage remove hazards and timed effects', () => {
  const duel = race(); circle(duel, duel.state);
  api('car-effects', 'setCarEffect')(duel.state, 'slick', {duration: .7, grip: .35});
  const events = []; duel.onChange((_, event) => events.push(event));
  duel.state.completedLaps = duel.state.lapsTotal;
  duel.state.s = duel.raceLength;
  eq(duel._finishStage(), true, 'native finish accepts completed laps and actual finish position');
  eq(duel.state.status, 'stage_result', 'accepted native finish reaches the genuine stage result');
  eq(events.filter(event => event.stageResult), [{stageResult: duel.state.results}],
    'accepted finish emits exactly its genuine successful stageResult');
  eq(duel.state.results.completed, true, 'genuine stage result records completion');
  eq(api('hazards', 'hazardsFor')(duel).length, 0, 'INTEGRATION: native stage finish clears hazards');
  eq(api('car-effects', 'carEffect')(duel.state, 'slick'), null, 'native stage finish clears timed effects');
  duel.startCampaign({mode: 'wasteland', car: 'falcone_f42', seed: 1989, discoveredGate: true});
  eq(api('hazards', 'hazardsFor')(duel).length, 0, 'new stage starts without old hazards');
});

test('INTEGRATION: native oil/smoke recharge and disabled weapon counter are enforced', () => {
  const duel = race();
  eq(duel.fireWeapon('oil'), true, 'INTEGRATION: native car weapon path launches implemented oil');
  near(duel.state.combat.cooldowns.oil, 10, 'oil native recharge is ten seconds');
  eq(duel.fireWeapon('oil'), false, 'oil cannot redeploy during recharge');
  eq(duel.fireWeapon('smoke'), true, 'native car weapon path launches implemented smoke');
  near(duel.state.combat.cooldowns.smoke, 14, 'smoke native recharge is fourteen seconds');
  eq(duel.fireWeapon('smoke'), false, 'smoke cannot redeploy during recharge');
  api('car-effects', 'setCarEffect')(duel.state, 'disabled', {duration: 3});
  eq(duel.fireWeapon('crossbow'), false, 'native disabled effect prevents weapon launch');
});

after(() => console.log('Arsenal core: ' + checks + ' acceptance checks reached.'));


test('CORE: smoke CPU eligibility requires an actual hit within five seconds and enemy within fifty behind', () => {
  const duel = race({arena: true}), owner = duel.state.rival;
  const use = api('smoke', 'shouldUseSmoke');
  place(duel.state, owner.s - 20);
  eq(use(duel, owner), false, 'no damage history means no defensive smoke');
  eq(applyArmorDamage(duel, owner, 'crossbow', {owner: 'player'}), 12,
    'a native owned armor hit creates the actual recent-hit history');
  eq(use(duel, owner), true, 'actual recent hit plus enemy behind admits smoke');
  place(duel.state, owner.s + 20); eq(use(duel, owner), false, 'enemy ahead is excluded');
  place(duel.state, owner.s - 55); eq(use(duel, owner), false, 'enemy beyond fifty metres is excluded');
  place(duel.state, owner.s - 20); duel.state.stageTimeSec += 5.01;
  eq(use(duel, owner), false, 'the real recent-hit record expires after five seconds');
});

test('CORE: Medium and Hard perceive visible oil within sixty metres; Easy does not', () => {
  const duel = race(), car = duel.state.rival, at = point(duel, car);
  const oil = api('hazards', 'addHazard')(duel, {kind: 'oil', shape: 'circle',
    x: at.x + Math.sin(at.heading) * 50, z: at.z + Math.cos(at.heading) * 50,
    radius: 3.5, lifetime: 6, owner: duel.state});
  const threat = api('oil', 'oilThreat');
  eq(threat(duel, car, 'medium'), oil, 'Medium perceives a pool fifty metres ahead');
  eq(threat(duel, car, 'hard'), oil, 'Hard perceives the same visible pool');
  eq(threat(duel, car, 'easy'), null, 'Easy does not proactively avoid pools');
  oil.x = at.x + Math.sin(at.heading) * 61; oil.z = at.z + Math.cos(at.heading) * 61;
  eq(threat(duel, car, 'hard'), null, 'a pool beyond sixty metres is not an avoidance threat');
});

test('INTEGRATION: native CPU weapon scheduler really deploys equipped oil', () => {
  const duel = race(), state = duel.state, cpu = state.rival;
  place(state, cpu.s - 20);
  cpu.weaponLoadout = ['oil', 'smoke', 'crossbow', 'star'];
  const events = []; duel.onChange((_, event) => events.push(event));
  state.combat.aiTimer = 0; state.combat.aiTurn = 0; stepCombatAI(duel, DT);
  ok(events.some(event => event.arsenalCue === 'weapon.oil.deploy'),
    'INTEGRATION: a real CPU with oil equipped must use it at the settled rear-enemy trigger');
});

test('INTEGRATION: a native CPU bolt cannot home through smoke', () => {
  const duel = race();
  eq(fireWeapon(duel, 'crossbow', true, duel.state.rival), true, 'clear-line native CPU launches a real bolt');
  const shot = duel.state.combat.projectiles.at(-1), initial = {vx: shot.vx, vz: shot.vz};
  place(duel.state, duel.state.s, 3); cloud(duel, between(duel, duel.state.rival, duel.state));
  stepProjectiles(duel, DT);
  near(shot.vx, initial.vx, 'INTEGRATION: native CPU crossbow homing is disabled by smoke x');
  near(shot.vz, initial.vz, 'INTEGRATION: native CPU crossbow homing is disabled by smoke z');
});

test('INTEGRATION: native fired RPG homing independently cannot bypass smoke', () => {
  const duel = race(), state = duel.state;
  duel.setInput({interact: true}); for (let i = 0; i < 48; i++) duel.step(DT);
  duel.setInput({interact: false}); eq(state.onFoot, true, 'native F exit supplies the real RPG user');
  const f = state.fighter, at = point(duel, state.rival);
  f.yaw = Math.atan2(at.x - f.x, at.z - f.z);
  f.pitch = Math.atan2(at.y - f.y - T.foot.rpgEyeHeight, Math.hypot(at.x - f.x, at.z - f.z));
  duel.setFighterInput({aim: true}); for (let i = 0; i < 96; i++) stepFootWeapons(duel, DT);
  eq(state.footWeapons.lockTargetIndex, 0, 'real clear-line RPG lock is the positive control');
  duel.setFighterInput({fire: true}); stepFootWeapons(duel, DT);
  const shot = state.combat.projectiles.find(p => p.kind === 'rpg'); ok(shot, 'the real locked RPG launches');
  const initial = {vx: shot.vx, vz: shot.vz};
  cloud(duel, between(duel, state, state.rival)); place(state.rival, state.rival.s, 3);
  stepProjectiles(duel, DT);
  near(shot.vx, initial.vx, 'INTEGRATION: native fired RPG guidance respects smoke independently of lock update x');
  near(shot.vz, initial.vz, 'INTEGRATION: native fired RPG guidance respects smoke independently of lock update z');
});

// Claude settled context and upgrade rules; the Director settled transient decoy DATA.
// The records below exercise shared Core selection, not a playable Mirage/Drone.
test('SETTLED DECOY DATA: actual CPU shot aims at a live hostile record', () => {
  const duel = race(), cpu = duel.state.rival, player = duel.state;
  const data = nativeDecoyData(duel, {id: 'core-data-decoy', ownerId: 'player', car: player.car,
    s: player.s, lateral: 8, headingError: 0, active: true,
    expiresAt: player.stageTimeSec + 10, decoy: true});
  eq(fireWeapon(duel, 'crossbow', true, cpu), true, 'actual clear native CPU launches');
  const shot = player.combat.projectiles.at(-1), at = point(duel, cpu), target = point(duel, data);
  const desired = Math.atan2(target.x - at.x, target.z - at.z) + shot.aimBias;
  const actual = Math.atan2(shot.vx, shot.vz);
  near(Math.atan2(Math.sin(actual - desired), Math.cos(actual - desired)), 0,
    'native CPU launch aims at genuine course conversion of live decoy DATA');
});
test('SETTLED DECOY DATA: native crossbow flight redirects from its real current origin', () => {
  const duel = race(), target = duel.state.rival;
  eq(duel.fireWeapon('crossbow'), true, 'actual native player launches its real bolt');
  const shot = duel.state.combat.projectiles.at(-1);
  const data = nativeDecoyData(duel, {id: 'core-flight-decoy', ownerId: 'cpu:0', car: target.car || duel.state.car,
    s: target.s, lateral: 3, headingError: 0, active: true,
    expiresAt: duel.state.stageTimeSec + 10, decoy: true});
  const at = point(duel, data), desired = Math.atan2(at.x - shot.x, at.z - shot.z);
  const error = () => Math.abs(Math.atan2(Math.sin(desired - Math.atan2(shot.vx, shot.vz)),
    Math.cos(desired - Math.atan2(shot.vx, shot.vz))));
  const before = error(); stepProjectiles(duel, DT);
  ok(error() < before - 1e-5, 'genuine in-flight crossbow steers toward live hostile decoy DATA');
});
for (const [weapon, recharge, radius, lifetime] of [['oil', 10, 3.5, 6], ['smoke', 14, 6, 5]]) {
  for (const level of [0, 1, 2, 3]) test('SETTLED UPGRADE: actual ' + weapon + ' level ' + level, () => {
    const duel = race(); duel.state.combat.levels[weapon] = level;
    eq(duel.fireWeapon(weapon), true, 'actual native rear weapon launches at this owned upgrade level');
    const hazard = api('hazards', 'hazardsFor')(duel).find(h => h.kind === weapon);
    ok(hazard, 'actual native upgraded launch creates its genuine hazard');
    near(hazard.radius, radius, 'upgrades do not scale control-weapon footprint');
    near(hazard.lifetime, lifetime, 'upgrades do not lengthen oil or smoke control lifetime');
    if (weapon === 'oil') {
      place(duel.state.rival, duel.state.s - 4);
      tickHazards(duel, 1);
      const effect = api('car-effects', 'carEffect')(duel.state.rival, 'slick');
      ok(effect, 'native upgraded pool really contacts the CPU');
      near(effect.remainingSec, .7, 'upgrades never lengthen the actual slick');
      near(effect.grip, .35, 'upgrades never strengthen control grip loss');
      near(Math.abs(duel.state.rival.yawVelocity), 2.2, 'upgrades never strengthen the spin kick');
    }
    near(duel.state.combat.cooldowns[weapon], recharge / 1.15 ** level,
      'settled recharge divides by 1.15 once per level');
  });
}


test('CORE: one hazard separately affects each actual body exactly once', () => {
  const duel = race(), cpu = duel.state.rival, hits = [];
  place(duel.state, cpu.s, 2);
  circle(duel, cpu, {radius: 5, onTouch: actor => hits.push(actor)});
  tickHazards(duel, 3);
  eq(hits.filter(actor => actor === duel.state).length, 1, 'player body has its own contact entitlement');
  eq(hits.filter(actor => actor === cpu).length, 1, 'CPU body has its independent contact entitlement');
});

test('INTEGRATION: native CPU scheduler really deploys smoke after a recent native hit', () => {
  const duel = race({arena: true}), state = duel.state, cpu = state.rival;
  place(state, cpu.s - 20);
  cpu.weaponLoadout = ['smoke', 'oil', 'crossbow', 'star'];
  const events = []; duel.onChange((_, event) => events.push(event));
  eq(applyArmorDamage(duel, cpu, 'crossbow', {owner: 'player'}), 12,
    'actual armor hit creates the scheduler smoke eligibility control');
  state.combat.aiTimer = 0; state.combat.aiTurn = 0; stepCombatAI(duel, DT);
  ok(events.some(event => event.arsenalCue === 'weapon.smoke.deploy'),
    'INTEGRATION: native CPU with smoke equipped uses it after the settled real-hit trigger');
});

test('INTEGRATION: native driving reads disabled effect without taking away ordinary driving', () => {
  const duel = race(), state = duel.state;
  state.speedMph = 60; state.input.throttle = 1; state.input.boost = true;
  api('car-effects', 'setCarEffect')(state, 'disabled', {duration: 3});
  duel._drive(DT);
  eq(state.boosting, false, 'INTEGRATION: actual driving reads disabled through the shared effect function');
  ok(state.speedMph > 0, 'disabled car still drives');
});


test('INTEGRATION: native new weapons remain unavailable before discovery or with arsenal off', () => {
  const admitted = race();
  eq(admitted.fireWeapon('oil'), true, 'INTEGRATION: discovered enabled native weapon is the positive gate control');
  for (const options of [{discovered: false}, {enabled: false}]) {
    const duel = race(options);
    eq(duel.fireWeapon('oil'), false, 'native oil cannot bypass the discovery/switch gate');
    eq(duel.fireWeapon('smoke'), false, 'native smoke cannot bypass the discovery/switch gate');
  }
});

// Independent review regressions, ARS-CORE, 30 September 2026.
// Append only: the tests-first freeze above remains byte-identical.
for (const shape of ['circle', 'strip']) for (const axis of ['right', 'forward']) {
  test('CORE: regression spinning player ' + shape + ' contact on course-' + axis, () => {
    const duel = race(), player = duel.state, at = point(duel, player);
    const dimensions = duel._vehicleSpec(player);
    eq([dimensions.halfWidth, dimensions.halfLength], [1.02, 2.35],
      'real Falcone body supplies the independently reproduced dimensions');
    player.crashSpin = Math.PI / 2;
    const distance = (dimensions.halfWidth + dimensions.halfLength) / 2, hits = [];
    const dx = axis === 'right' ? Math.cos(at.heading) : Math.sin(at.heading);
    const dz = axis === 'right' ? -Math.sin(at.heading) : Math.cos(at.heading);
    api('hazards', 'addHazard')(duel, {kind: 'test', shape,
      x: at.x + dx * distance, z: at.z + dz * distance,
      radius: .05, width: .1, length: .1, heading: at.heading, lifetime: 2,
      onTouch: actor => hits.push(actor)});
    tickHazards(duel, 3);
    eq(hits.filter(actor => actor === player).length, axis === 'right' ? 1 : 0,
      axis === 'right'
        ? 'spinning player actual long body touches course-right hazard once'
        : 'spinning player actual narrow body misses course-forward hazard');
  });
}

for (const actorKind of ['player', 'cpu', 'turning-cpu']) for (const axis of ['right', 'forward']) {
  test('CORE: regression body orientation control ' + actorKind + ' course-' + axis, () => {
    const duel = race(), actor = actorKind === 'player' ? duel.state : duel.state.rival;
    place(actor, 500);
    if (actorKind === 'turning-cpu') actor.headingError = Math.PI / 2;
    const at = point(duel, actor), dimensions = duel._vehicleSpec(actor), hits = [];
    const distance = (dimensions.halfWidth + dimensions.halfLength) / 2;
    const dx = axis === 'right' ? Math.cos(at.heading) : Math.sin(at.heading);
    const dz = axis === 'right' ? -Math.sin(at.heading) : Math.cos(at.heading);
    circle(duel, actor, {x: at.x + dx * distance, z: at.z + dz * distance,
      radius: .05, onTouch: body => hits.push(body)});
    tickHazards(duel, 3);
    const shouldTouch = actorKind === 'turning-cpu' ? axis === 'right' : axis === 'forward';
    eq(hits.filter(body => body === actor).length, shouldTouch ? 1 : 0,
      'native nonspinning/CPU orientation retains its real long and narrow body contacts');
  });
}

for (const [slipAngle, ownerLateral, kick] of [
  [.4, -.1, -2.2], [.4, .1, -2.2], [-.4, .1, 2.2], [-.4, -.1, 2.2],
  [0, -.1, 2.2], [0, .1, -2.2],
]) {
  test('CORE: regression oil away kick at actual player slip ' + slipAngle + ' owner lateral ' + ownerLateral, () => {
    const duel = race(), player = duel.state, owner = duel.state.rival;
    place(player, 500); place(owner, 503, ownerLateral);
    player.slipAngle = slipAngle; player.speedMph = 60;
    const armor = player.armor, events = [];
    duel.onChange((_, event) => events.push(event));
    const oil = api('oil', 'deployOil')(duel, owner), at = point(duel, player);
    const facing = at.heading + player.headingError + player.slipAngle + player.crashSpin;
    const side = (at.x - oil.x) * Math.cos(facing) - (at.z - oil.z) * Math.sin(facing);
    eq(Math.sign(side), Math.sign(kick),
      'actual rotated player body independently identifies the away-from-pool side');
    tickHazards(duel, 1);
    const slick = api('car-effects', 'carEffect')(player, 'slick');
    ok(slick, 'native already-sliding player really touches this pool');
    near(slick.remainingSec, .7, 'sliding contact keeps the settled 0.7-second effect');
    eq(slick.grip, .35, 'sliding contact keeps the settled grip');
    near(player.speedMph, 51, 'sliding contact slows the actual player exactly once');
    eq(player.armor, armor, 'sliding contact never damages actual player armor');
    const firstYaw = player.yawVelocity;
    tickHazards(duel, 4);
    near(player.speedMph, 51, 'continued overlap never repeats sliding speed loss');
    near(player.yawVelocity, firstYaw, 'continued overlap never repeats sliding spin kick');
    eq(events.filter(event => event.arsenalCue === 'weapon.oil.slip' && event.actor === player).length, 1,
      'actual player receives exactly one slip cue per pool');
    near(firstYaw, kick, 'oil kick turns away from centre using actual player slip angle');
  });
}

for (const smokeAt of ['fighter', 'parked-car', 'away']) {
  test('CORE: regression moved native RPG fighter smoke at ' + smokeAt, async () => {
    const {onFootCameraPose} = await import('../src/onfoot-camera.js');
    const {segmentCircle} = await import('../src/collision.js');
    const duel = race(), state = duel.state, select = api('targeting', 'targetFor');
    eq(select(duel, state), state.rival, 'native car has its ordinary clear-line target before F exit');
    const parked = point(duel, state), parkedS = state.s, parkedLateral = state.lateral;
    duel.setInput({interact: true}); for (let i = 0; i < 48; i++) duel.step(DT);
    duel.setInput({interact: false});
    eq(state.onFoot, true, 'real 48-tick F hold creates the native RPG fighter');
    eq(state.footWeapons.selected, 'rpg', 'native fighter carries the actual RPG');
    const fighter = state.fighter, start = {x: fighter.x, z: fighter.z};
    const cameraBefore = onFootCameraPose(duel.course, fighter);
    const forwardX = cameraBefore.target.x - cameraBefore.position.x;
    const forwardZ = cameraBefore.target.z - cameraBefore.position.z;
    const forwardLength = Math.hypot(forwardX, forwardZ);
    eq(duel.setFighterInput({left: true, sprint: true}), true,
      'actual camera-left sprint input is accepted by the native engine');
    for (let i = 0; i < 360; i++) duel.step(DT);
    duel.setFighterInput({left: false, sprint: false, aim: true});
    const movedCamera = onFootCameraPose(duel.course, fighter);
    ok(((fighter.x - start.x) * forwardZ - (fighter.z - start.z) * forwardX) / forwardLength > 20,
      'native left sprint moves over twenty metres toward actual camera left');
    near(movedCamera.position.x, fighter.x, 'actual first-person camera uses moved fighter x');
    near(movedCamera.position.z, fighter.z, 'actual first-person camera uses moved fighter z');
    near(state.s, parkedS, 'real exit and walking leave the parked car course progress unchanged');
    near(state.lateral, parkedLateral, 'real exit and walking leave parked car lateral unchanged');
    ok(Math.hypot(fighter.x - parked.x, fighter.z - parked.z) > 24,
      'native moved fighter is well outside a six-metre cloud around its parked car');
    place(state.rival, 540); place(state.opponents[1], 600, 5);
    const target = point(duel, state.rival);
    eq(select(duel, state), state.rival, 'native moved RPG fighter has an unobscured real target');
    const center = smokeAt === 'parked-car' ? parked : smokeAt === 'fighter'
      ? movedCamera.position : {x: fighter.x + 50, z: fighter.z + 50};
    const smoke = cloud(duel, center, 6);
    const fighterBlocked = segmentCircle(movedCamera.position.x, movedCamera.position.z,
      target.x, target.z, smoke.x, smoke.z, smoke.radius);
    const carBlocked = segmentCircle(parked.x, parked.z, target.x, target.z,
      smoke.x, smoke.z, smoke.radius);
    eq(fighterBlocked, smokeAt === 'fighter', 'smoke intersects the actual RPG fighter line only in the fighter case');
    eq(carBlocked, smokeAt === 'parked-car', 'parked-car cloud is independently distinct from actual fighter smoke');
    eq(select(duel, state), smokeAt === 'fighter' ? null : state.rival,
      smokeAt === 'fighter'
        ? 'moved actual RPG fighter inside smoke has no target'
        : smokeAt === 'parked-car'
          ? 'parked-car-only smoke does not block the moved actual RPG fighter clear line'
          : 'smoke away from actual fighter and parked car retains the native clear target');
  });
}

// Independent native refusal control for the reviewed legal-finish fixture.
test('LIFECYCLE CONTROL: refused unfinished race preserves complete state, hazard and effect', () => {
  const duel = race(); const hazard = circle(duel, duel.state);
  const effect = api('car-effects', 'setCarEffect')(duel.state, 'slick', {duration: .7, grip: .35});
  const before = structuredClone(duel.state), hazardsBefore = {...hazard}, effectBefore = {...effect};
  const events = []; duel.onChange((_, event) => events.push(event));
  eq(duel._finishStage(), false, 's=500 and zero completed laps are refused by the native finish guard');
  eq(events, [], 'refused finish emits no fake stage event');
  eq(duel.state, before, 'refused finish preserves every actual state field');
  eq(api('hazards', 'hazardsFor')(duel), [hazard], 'refused finish preserves the actual hazard identity');
  eq(hazard, hazardsBefore, 'refused finish preserves every hazard field');
  eq(api('car-effects', 'carEffect')(duel.state, 'slick'), effectBefore,
    'refused finish preserves the complete timed effect');
});

function nativeDecoyData(duel, metadata) {
  // A genuine initialized native NPC; explicit data for the future producer.
  const donor = race(), actor = donor.state.opponents[1];
  Object.assign(actor, metadata, {prevS: metadata.s, prevLateral: metadata.lateral});
  duel.state.opponents.push(actor);
  return actor;
}
