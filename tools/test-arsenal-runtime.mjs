import assert from 'node:assert/strict';
import {test, after} from 'node:test';
import * as THREE from 'three';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {point, fireWeapon, WEAPONS} from '../src/combat-weapons.js';
import {stepCombat} from '../src/combat.js';
import {stepCombatAI} from '../src/combat-ai.js';
import {stepProjectiles} from '../src/combat-projectiles.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {stepFootWeapons} from '../src/onfoot-weapons.js';
import {createCombatScene} from '../src/combat-scene.js';
import {createArmoryScreen} from '../src/screen-armory.js';
import {createProfile, createPlayerRegistry, createPlayer, replacePlayerProfile,
  loadPlayers, savePlayers, PLAYERS_KEY} from '../src/progression.js';
import {normalizeWasteland} from '../src/wasteland-progress.js';
import {WEAPON_IDS, ARSENAL_WEAPONS, getProfileWeapons} from '../src/weapon-upgrades.js';
import {availableCarWeapons} from '../src/car-loadout.js';
import {addHazard, hazardsFor, stepHazards, clearHazards} from '../src/arsenal/hazards.js';
import {carEffect, setCarEffect, stepCarEffects} from '../src/arsenal/car-effects.js';
import {deployOil} from '../src/arsenal/oil.js';
import {shouldUseSmoke} from '../src/arsenal/smoke.js';
import {targetFor} from '../src/arsenal/targeting.js';
import {arenaParticipant} from '../src/combat-teams.js';
import {pilotStep} from '../src/arena/arena-pilot.js';
import {thinkBrain} from '../src/arena/arena-brains.js';
import {stepArenaEvent} from '../src/arena/arena-event.js';
import {COMBAT_TUNING as T} from '../src/wasteland-tuning.js';

// Actual native consumers, with synthetic career storage owned by this process.
// No DOM renderer, browser look verdict, audio verdict or playable decoy producer
// is claimed. The audio unlock boundary is silent; all gameplay methods are real.
const DT = 1 / 120, values = new Map(), writes = [];
const savedGlobals = new Map(['localStorage', 'cancelAnimationFrame'].map(key =>
  [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
  getItem: key => values.get(String(key)) ?? null,
  setItem: (key, value) => {values.set(String(key), String(value)); writes.push(String(key));},
  removeItem: key => values.delete(String(key)),
}});
Object.defineProperty(globalThis, 'cancelAnimationFrame', {configurable: true, value: () => {}});
let checks = 0;
const eq = (actual, expected, message) => {checks++; assert.deepEqual(actual, expected, message);};
const ok = (value, message) => {checks++; assert.ok(value, message);};
const near = (a, b, message) => ok(Math.abs(a - b) < 1e-7, message + ': ' + a + ' versus ' + b);
after(() => {
  for (const [key, descriptor] of savedGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
  console.log('Arsenal native runtime: ' + checks + ' acceptance checks reached.');
});
const flags = (enabled = true) => createFeatureFlags({storage: null, qa: true,
  search: enabled ? '?flags=arsenal' : '', overrides: {arsenal: enabled}});
function place(actor, s, lateral = 0) {
  Object.assign(actor, {s, prevS: s, lateral, prevLateral: lateral, speedMph: 0,
    headingError: 0, yawVelocity: 0, pushVelocity: 0, impactTimer: 0,
    airHeight: 0, prevAirHeight: 0, combatShield: 0});
}
function race({enabled = true, discovered = true, arena = false, difficulty = 'hard', seed = 1989} = {}) {
  const duel = new Duel({seed, featureFlags: flags(enabled)});
  if (arena) eq(duel.startArenaEvent({car: 'falcone_f42', seed, cpuDifficulty: difficulty,
    opponents: [{car: 'dusthawk_rally', brain: 'hunter'}, {car: 'aurora_gt', brain: 'collector'}]}),
  true, 'genuine native arena starts');
  else duel.startCampaign({mode: 'wasteland', car: 'falcone_f42', seed,
    cpuDifficulty: difficulty, discoveredGate: discovered, opponentCount: 2});
  Object.assign(duel.state, {status: 'racing', countdown: 0, invulnerableSec: 0, traffic: []});
  duel.state.combat.aiTimer = duel.state.combat.pickupTimer = Infinity;
  place(duel.state, 500); place(duel.state.rival, 540); place(duel.state.opponents[1], 610, 5);
  if (arena) for (const participant of duel.state.arena.participants) participant.protectedSec = 0;
  return duel;
}
function driveCpu(duel, actor, arena) {
  if (arena) pilotStep(duel, actor, thinkBrain(duel, arenaParticipant(duel, actor), actor, DT), DT);
  else duel._rival(DT, actor);
}
function smoke(duel, at, radius = 6) {
  return addHazard(duel, {kind: 'smoke', shape: 'circle', ...at, radius, lifetime: 5, owner: duel.state});
}
function career(rank = 6, {owned = [], discovered = true} = {}) {
  let xp = 0; for (let current = 1; current < rank; current++) xp += 400 + 150 * (current - 1);
  const p = createProfile(); p.credits = 9000;
  p.unknownRoot = {keep: 'root'};
  p.wasteland = normalizeWasteland({...p.wasteland, discoveredGate: discovered, xp, scrap: 3000,
    unknownCareer: {keep: 'career'}, weapons: {unlocked: [...WEAPON_IDS, ...owned, 'future-weapon'],
      levels: {oil: 0, smoke: 0, 'future-weapon': 9}, unknownWeapons: {keep: 23}},
    loadout: ['future-weapon', 'crossbow', 'bomb', 'star']});
  eq(p.wasteland.rank, rank, 'actual normalization creates the named rank fixture');
  return p;
}
function appFixture({rank = 6, owned = [], discovered = true, enabled = true} = {}) {
  values.clear(); writes.length = 0;
  let registry = createPlayerRegistry(career(rank, {owned, discovered}));
  registry.players[0].name = 'Arsenal Test One';
  registry = createPlayer(registry, 'Arsenal Test Two').registry;
  registry = replacePlayerProfile(registry, registry.players[1].id, career(1));
  registry.activePlayerId = registry.players[0].id;
  eq(savePlayers(registry, globalThis.localStorage), true, 'synthetic named registry saves through the actual API');
  const app = new App(); app.duel.featureFlags = flags(enabled); app.audio.unlock = () => {};
  return app;
}
function purchase(app, id) {
  eq(typeof app.purchaseArsenalWeapon, 'function', 'native App must expose purchaseArsenalWeapon for the actual Armory action');
  return app.purchaseArsenalWeapon(id);
}
function foot(duel, {walk = false} = {}) {
  duel.setInput({interact: true}); for (let i = 0; i < 48; i++) duel.step(DT);
  duel.setInput({interact: false}); eq(duel.state.onFoot, true, 'real F exit creates the RPG fighter');
  if (walk) {
    const before = {...duel.state.fighter};
    duel.setFighterInput({left: true, sprint: true}); for (let i = 0; i < 360; i++) duel.step(DT);
    duel.setFighterInput({left: false, sprint: false});
    ok(Math.hypot(duel.state.fighter.x - before.x, duel.state.fighter.z - before.z) > 20,
      'actual camera-left sprint moves the fighter away from its parked car');
  }
  return duel.state.fighter;
}
function aimAt(duel, actor) {
  const f = duel.state.fighter, at = point(duel, actor);
  f.yaw = Math.atan2(at.x - f.x, at.z - f.z);
  f.pitch = Math.atan2(at.y - f.y - T.foot.rpgEyeHeight, Math.hypot(at.x - f.x, at.z - f.z));
  duel.setFighterInput({aim: true, fire: false});
}
function lock(duel, actor = duel.state.rival) {
  aimAt(duel, actor); for (let i = 0; i < 100; i++) stepFootWeapons(duel, DT);
  eq(duel.state.footWeapons.lockTargetIndex, duel.state.opponents.indexOf(actor), 'actual unobscured RPG acquires its intended car');
  near(duel.state.footWeapons.lockSeconds, T.foot.rpgLockSeconds, 'actual RPG genuinely completes its settled lock time');
}

for (const arena of [false, true]) {
  test('NATIVE HISTORY: positive owned armor hit admits smoke on ' + (arena ? 'arena' : 'road'), () => {
    const duel = race({arena}), cpu = duel.state.rival;
    place(duel.state, cpu.s - 20);
    eq(shouldUseSmoke(duel, cpu), false, 'native car has no invented recent-hit eligibility');
    const before = JSON.stringify(duel.state), armor = cpu.armor;
    near(applyArmorDamage(duel, cpu, 'crossbow', {owner: 'player'}), 12, 'genuine armor damage removes positive armor');
    near(cpu.armor, armor - 12, 'actual victim armor really decreases');
    eq(shouldUseSmoke(duel, cpu), true, 'actual owned armor hit admits native defensive smoke');
    const serialized = JSON.parse(JSON.stringify(duel.state));
    for (const actor of [serialized, ...serialized.opponents]) {
      eq(Object.keys(actor).filter(key => /lastHit|recentHit|arsenalHit/i.test(key)), [],
        'temporary Arsenal history is absent from serialized car fields');
    }
    ok(before.length > 0, 'native state serialization is exercised before damage');
  });
  for (const denial of ['shield', 'zero', 'friendly', 'protection']) {
    test('NATIVE HISTORY CONTROL: ' + denial + ' does not qualify smoke on ' + (arena ? 'arena' : 'road'), () => {
      const duel = race({arena}), cpu = duel.state.rival;
      place(duel.state, cpu.s - 20);
      if (denial === 'shield') duel.state.combat.rivalShield = 1;
      if (denial === 'protection') {
        if (arena) arenaParticipant(duel, cpu).protectedSec = 1;
        else cpu.finished = true;
      }
      if (denial === 'friendly' && arena) arenaParticipant(duel, duel.state.opponents[1]).team = arenaParticipant(duel, cpu).team;
      const owner = denial === 'friendly'
        ? arena ? duel.state.opponents[1].arenaId : 'cpu' : 'player';
      const removed = applyArmorDamage(duel, cpu, denial === 'zero' ? 'unknown-zero-damage' : 'crossbow', {owner});
      if (denial !== 'friendly') eq(removed, 0, 'native denied/zero hit removes no armor');
      eq(shouldUseSmoke(duel, cpu), false, 'denied or friendly damage never creates defensive smoke eligibility');
      eq(JSON.stringify(cpu).includes('arsenalHit'), false, 'denied hit does not add serialized transient fields');
    });
  }
  for (const transition of ['five-seconds', 'stage', 'recovery']) {
    test('NATIVE HISTORY: hit eligibility expires by ' + transition + ' on ' + (arena ? 'arena' : 'road'), () => {
      const duel = race({arena}), cpu = duel.state.rival; place(duel.state, cpu.s - 20);
      near(applyArmorDamage(duel, cpu, 'crossbow', {owner: 'player'}), 12, 'actual positive history precondition');
      eq(shouldUseSmoke(duel, cpu), true, 'native positive hit qualification must work before checking cleanup');
      if (transition === 'five-seconds') {
        duel.state.stageTimeSec += 5; eq(shouldUseSmoke(duel, cpu), true, 'exact five-second boundary remains eligible');
        duel.state.stageTimeSec += DT;
      } else if (transition === 'stage') {
        duel.startCampaign({mode: 'wasteland', discoveredGate: true, opponentCount: 2});
        place(duel.state, duel.state.rival.s - 20);
      } else {
        duel._safeReset(cpu); place(duel.state, cpu.s - 20);
      }
      eq(shouldUseSmoke(duel, transition === 'stage' ? duel.state.rival : cpu), false,
        'genuine expiry/stage/recovery clears previous defensive hit eligibility');
    });
  }
}

for (const [weapon, minimumRank] of [['oil', 2], ['smoke', 6]]) {
  test('NATIVE APP: purchase, equip and three upgrades of ' + weapon + ' preserve the named registry', () => {
    const app = appFixture({rank: minimumRank});
    try {
      const oldProfile = app.profile, rawInput = structuredClone(oldProfile);
      const registryBefore = loadPlayers(), otherBefore = structuredClone(registryBefore.players[1]);
      const acquired = purchase(app, weapon);
      eq(acquired.ok, true, 'actual bound Armory purchase succeeds at settled unlock rank');
      eq(oldProfile, rawInput, 'purchase never mutates the raw input profile');
      near(app.profile.wasteland.scrap, 2600, 'bound new weapon purchase charges exactly 400 scrap');
      eq(app.equipCarWeapon(1, weapon).ok, true, 'actual bound loadout equips the purchased weapon');
      eq(app.profile.wasteland.loadout[0], 'future-weapon', 'editing another slot preserves earned future ownership and slot');
      for (const [level, cost] of [[1, 150], [2, 300], [3, 600]]) {
        const previous = app.profile.wasteland.scrap;
        eq(app.purchaseWeapon(weapon).ok, true, 'actual bound upgrade succeeds');
        eq(getProfileWeapons(app.profile).levels[weapon], level, 'actual save records the purchased level');
        near(app.profile.wasteland.scrap, previous - cost, 'bound upgrade charges its settled scrap amount');
      }
      const beforeMax = values.get(PLAYERS_KEY);
      eq(app.purchaseWeapon(weapon).ok, false, 'fourth level is refused');
      eq(values.get(PLAYERS_KEY), beforeMax, 'refused max-level purchase preserves raw registry bytes');
      const loaded = loadPlayers(); eq(loaded.players[1], otherBefore, 'other named player remains byte-equivalent');
      eq(loaded.players[0].profile.unknownRoot, {keep: 'root'}, 'unknown profile fields round trip');
      eq(loaded.players[0].profile.wasteland.weapons.levels['future-weapon'], 9, 'future weapon level round trips');
      eq(app.selectPlayer(loaded.players[1].id), true, 'actual App selects the second named player');
      eq(getProfileWeapons(app.profile).unlocked.includes(weapon), false, 'purchased weapon never crosses owners');
      eq(app.equipCarWeapon(1, weapon).ok, false, 'other named player cannot equip unearned weapon');
    } finally {app.dispose?.();}
  });
  for (const gate of ['rank', 'dev', 'discovery', 'implementation', 'race']) {
    test('NATIVE APP CONTROL: ' + gate + ' denies bound ' + weapon + ' purchase without a write', () => {
      const app = appFixture({rank: gate === 'rank' ? 1 : minimumRank,
        enabled: gate !== 'dev', discovered: gate !== 'discovery'});
      try {
        if (gate === 'race') app.duel.state.status = 'racing';
        const before = values.get(PLAYERS_KEY), oldProfile = structuredClone(app.profile), writeCount = writes.length;
        eq(purchase(app, gate === 'implementation' ? 'harpoon' : weapon).ok, false,
          'actual bound action refuses inadmissible purchase');
        eq(app.profile, oldProfile, 'refusal preserves full owner profile');
        eq(values.get(PLAYERS_KEY), before, 'refusal preserves raw registry bytes');
        eq(writes.length, writeCount, 'refusal makes no storage write');
      } finally {app.dispose?.();}
    });
  }
  for (const enabled of [false, true]) {
    test('NATIVE APP: owned ' + weapon + ' equip/upgrade and actual launch respect dev=' + enabled, () => {
      const app = appFixture({owned: [weapon], enabled});
      try {
        const raw = values.get(PLAYERS_KEY);
        eq(app.equipCarWeapon(1, weapon).ok, enabled, 'native equip follows actual feature admission');
        eq(app.purchaseWeapon(weapon).ok, enabled, 'native upgrade follows actual feature admission');
        if (!enabled) eq(values.get(PLAYERS_KEY), raw, 'closed dev gate preserves raw earned weapon profile');
        else {
          app.startCampaign({mode: 'wasteland', car: 'falcone_f42', seed: 1989, opponentCount: 2});
          ok(app.duel.state.weaponLoadout.includes(weapon), 'actual App-to-Duel launch retains the owned equipped Arsenal slot');
        }
      } finally {app.dispose?.();}
    });
  }
}

for (const rank of [1, 2, 6]) for (const difficulty of ['easy', 'medium', 'hard']) {
  test('NATIVE CPU: deterministic four-slot native loadouts at rank ' + rank + ' ' + difficulty, () => {
    const app = appFixture({rank}), other = new Duel({seed: 1989, featureFlags: flags()});
    try {
      app.startCampaign({mode: 'wasteland', seed: 1989, opponentCount: 3, cpuDifficulty: difficulty});
      const first = app.duel.state.opponents.map(cpu => cpu.weaponLoadout);
      other.startCampaign({mode: 'wasteland', seed: 1989, discoveredGate: true, opponentCount: 3, cpuDifficulty: difficulty});
      eq(app.duel.state.traffic, other.state.traffic, 'native CPU loadout assignment does not drift seeded traffic RNG');
      for (const loadout of first) {
        ok(Array.isArray(loadout), 'every real CPU actor receives a native weaponLoadout');
        eq(loadout.length, 4, 'native CPU has exactly four slots');
        eq(new Set(loadout).size, 4, 'native CPU never repeats a weapon');
        const maximumWave = {easy: 1, medium: 2, hard: 3}[difficulty];
        ok(loadout.every(id => WEAPON_IDS.includes(id) || ARSENAL_WEAPONS[id]?.rank <= rank &&
          ARSENAL_WEAPONS[id]?.wave <= maximumWave), 'CPU native loadout contains only rank/wave eligible implemented weapons');
      }
      app.duel.state.status = 'menu';
      app.startCampaign({mode: 'wasteland', seed: 1989, opponentCount: 3, cpuDifficulty: difficulty});
      eq(app.duel.state.opponents.map(cpu => cpu.weaponLoadout), first, 'same genuine launch rank/seed reproduces every CPU role');
    } finally {app.dispose?.();}
  });
}
test('NATIVE CPU CONTROL: switch-off road launch preserves the existing starter-only simulation', () => {
  const app = appFixture({enabled: false});
  try {
    app.startCampaign({mode: 'wasteland', seed: 1989, opponentCount: 3});
    ok(app.duel.state.opponents.every(cpu => !cpu.weaponLoadout ||
      cpu.weaponLoadout.every(id => WEAPON_IDS.includes(id))), 'switch-off opponents have no Arsenal weapons');
    eq(hazardsFor(app.duel), [], 'switch-off launch creates no new hazards');
  } finally {app.dispose?.();}
});

for (const arena of [false, true]) for (const weapon of ['oil', 'smoke']) {
  test('NATIVE CPU RECHARGE: separate real ' + weapon + ' timers on ' + (arena ? 'arena' : 'road'), () => {
    const duel = race({arena}), [one, two] = duel.state.opponents;
    one.weaponLoadout = [weapon, 'bomb', 'crossbow', 'star'];
    two.weaponLoadout = [weapon, 'bomb', 'crossbow', 'star'];
    const recharge = WEAPONS[weapon].cooldown;
    eq(fireWeapon(duel, weapon, true, one), true, 'first actual CPU rear weapon launches');
    eq(fireWeapon(duel, weapon, true, one), false, 'same actual CPU cannot bypass its recharge');
    eq(fireWeapon(duel, weapon, true, two), true, 'other actual CPU owns an independent ready timer');
    eq(duel.state.combat.cooldowns[weapon] ?? 0, 0, 'CPU launch never spends player recharge');
    for (let i = 0; i < Math.ceil(recharge / DT) + 1; i++) stepCombat(duel, DT);
    eq(fireWeapon(duel, weapon, true, one), true, 'native fixed combat steps complete CPU recharge');
  });
  for (const trigger of [false, true]) {
    test('NATIVE CPU CONDITION: ' + weapon + ' rear trigger=' + trigger + ' on ' + (arena ? 'arena' : 'road'), () => {
      const duel = race({arena}), cpu = duel.state.rival;
      cpu.weaponLoadout = [weapon, 'bomb', 'crossbow', 'star'];
      place(duel.state, cpu.s + (trigger ? -20 : 20));
      if (weapon === 'smoke') near(applyArmorDamage(duel, cpu, 'crossbow', {owner: 'player'}), 12,
        'native smoke scheduler fixture has actual positive hit history');
      duel.state.combat.aiTimer = 0; duel.state.combat.aiTurn = 0;
      stepCombatAI(duel, DT);
      eq(hazardsFor(duel).some(h => h.kind === weapon && h.owner === cpu), trigger,
        'actual equipped CPU scheduler uses the settled enemy-behind trigger');
    });
  }
}

for (const arena of [false, true]) for (const role of ['player', 'cpu']) {
  test('NATIVE DRIVING: actual slick changes ' + role + ' fixed-step grip on ' + (arena ? 'arena' : 'road'), () => {
    const affected = race({arena}), clear = race({arena});
    const a = role === 'player' ? affected.state : affected.state.rival;
    const b = role === 'player' ? clear.state : clear.state.rival;
    place(a, 500); place(b, 500); a.speedMph = b.speedMph = 60;
    setCarEffect(a, 'slick', {duration: .7, grip: .35});
    if (role === 'player') {affected.setInput({steer: .6}); clear.setInput({steer: .6});}
    for (let i = 0; i < 24; i++) {
      if (role === 'player') {affected._drive(DT); clear._drive(DT);}
      else {driveCpu(affected, a, arena); driveCpu(clear, b, arena);}
    }
    ok(Math.hypot(a.lateral - b.lateral, a.headingError - b.headingError) > 1e-4,
      'genuine driving consumer changes its physical trajectory while slick is active');
    for (let i = 0; i < 85; i++) stepCarEffects(a, DT);
    eq(carEffect(a, 'slick'), null, 'fixed-step slick expiry restores ordinary grip');
  });
  test('NATIVE DRIVING: real oil spin survives the next ' + role + ' drive step on ' + (arena ? 'arena' : 'road'), () => {
    const duel = race({arena}), actor = role === 'player' ? duel.state : duel.state.rival;
    const owner = role === 'player' ? duel.state.rival : duel.state;
    place(actor, 500, .1); place(owner, 504); actor.speedMph = 60;
    const armor = actor.armor; deployOil(duel, owner); stepHazards(duel, DT);
    ok(carEffect(actor, 'slick'), 'genuine oil body contact starts actual slick');
    near(Math.abs(actor.yawVelocity), 2.2, 'native oil supplies its exact once-only spin kick');
    near(actor.speedMph, 51, 'native oil slows the actual car by fifteen percent once');
    if (role === 'player') duel._drive(DT); else driveCpu(duel, actor, arena);
    ok(Math.abs(actor.yawVelocity) > 1, 'native drive preserves the actual oil spin kick rather than zeroing it');
    eq(actor.armor, armor, 'oil and its drive consumer never damage armor');
  });
}
for (const arena of [false, true]) for (const difficulty of ['easy', 'medium', 'hard']) {
  test('NATIVE AVOIDANCE: real CPU ' + difficulty + ' trajectory responds to visible oil on ' + (arena ? 'arena' : 'road'), () => {
    const blocked = race({difficulty, arena}), clear = race({difficulty, arena});
    const cpu = blocked.state.rival, control = clear.state.rival;
    place(cpu, 500); place(control, 500); cpu.speedMph = control.speedMph = 45;
    const at = point(blocked, cpu);
    addHazard(blocked, {kind: 'oil', shape: 'circle', radius: 3.5, lifetime: 6,
      x: at.x + Math.sin(at.heading) * 35, z: at.z + Math.cos(at.heading) * 35, owner: blocked.state});
    for (let i = 0; i < 60; i++) {driveCpu(blocked, cpu, arena); driveCpu(clear, control, arena);}
    const delta = Math.hypot(cpu.lateral - control.lateral, cpu.headingError - control.headingError);
    if (difficulty === 'easy') near(delta, 0, 'Easy retains actual ordinary steering');
    else ok(delta > .01, 'Medium/Hard native steering really changes course to avoid visible oil');
  });
}

for (const level of [1, 2, 3]) for (const weapon of ['bomb', 'crossbow', 'star']) {
  test('SETTLED NATIVE UPGRADE: ' + weapon + ' level ' + level + ' recharge and damage', () => {
    const duel = race(); duel.state.combat.levels[weapon] = level;
    eq(duel.fireWeapon(weapon), true, 'actual upgraded starter launches');
    if (weapon !== 'star') {
      const other = race(), before = other.state.rival.armor;
      const removed = applyArmorDamage(other, other.state.rival, weapon, {owner: 'player', level});
      const baseline = race(); const baseDamage = applyArmorDamage(baseline, baseline.state.rival, weapon, {owner: 'player', level: 0});
      near(removed, baseDamage * (1 + .15 * level), 'native damaging upgrade adds fifteen percent damage per level');
      near(other.state.rival.armor, before - removed, 'actual upgraded armor result matches native damage');
    }
    near(duel.state.combat.cooldowns[weapon], WEAPONS[weapon].cooldown / 1.15 ** level,
      'actual upgraded recharge uses the settled exponential division');
  });
}

// Native geometry, not renderer screenshots: no art score/frame verdict.
function visibleMeshes(group) {
  group.updateMatrixWorld(true); const found = [];
  group.traverse(object => {
    if (!object.isMesh || !object.geometry?.attributes.position?.count) return;
    for (let current = object; current; current = current.parent) if (!current.visible) return;
    found.push(object);
  });
  return found;
}
function resources(group) {
  const geometries = new Set(), materials = new Set();
  group.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material);
  });
  return {geometries, materials};
}
for (const kind of ['oil', 'smoke']) {
  test('NATIVE PRESENTATION: ' + kind + ' is visible, bounded, read-only and disposed', () => {
    const duel = race(); duel.state.raids = null;
    let disposedView = false;
    const view = createCombatScene(undefined, {loadFighterAsset: () => Promise.reject(Error('inactive fighter asset boundary'))});
    try {
      view.update(duel); const baseline = new Set(visibleMeshes(view.group));
      const at = point(duel, duel.state), radius = kind === 'oil' ? 3.5 : 6;
      addHazard(duel, {kind, shape: 'circle', ...at, radius, lifetime: kind === 'oil' ? 6 : 5, owner: duel.state});
      const before = JSON.stringify(duel.state), hazardBefore = {...hazardsFor(duel)[0]};
      view.update(duel);
      const meshes = visibleMeshes(view.group).filter(mesh => !baseline.has(mesh));
      ok(meshes.length > 0, 'actual native ' + kind + ' hazard exposes nonempty visible geometry');
      const bounds = new THREE.Box3(); for (const mesh of meshes) bounds.expandByObject(mesh);
      const center = bounds.getCenter(new THREE.Vector3());
      ok(Math.hypot(center.x - at.x, center.z - at.z) < radius,
        'native visible hazard is placed at its real simulation pool');
      ok(bounds.max.x > bounds.min.x && bounds.max.z > bounds.min.z, 'real pool geometry has a nonempty physical footprint');
      eq(JSON.stringify(duel.state), before, 'presentation update preserves complete serialized native race state');
      eq(hazardsFor(duel)[0], hazardBefore, 'presentation does not age or mutate the actual hazard');
      const owned = resources(view.group), count = view.group.children.length;
      for (let i = 0; i < 30; i++) {
        clearHazards(duel);
        for (let j = 0; j < 30; j++) addHazard(duel, {kind, shape: 'circle', x: at.x + j * 10, z: at.z, radius, lifetime: 6});
        view.update(duel);
      }
      eq(hazardsFor(duel).length, 24, 'actual visible hazard fixture reaches the shared bounded pool');
      eq(view.group.children.length, count, 'updates never append unbounded native scene objects');
      eq(resources(view.group).geometries, owned.geometries, 'bounded view reuses actual native geometries');
      eq(resources(view.group).materials, owned.materials, 'bounded view reuses actual native materials');
      const disposed = new Map();
      for (const resource of [...owned.geometries, ...owned.materials]) resource.addEventListener('dispose', () =>
        disposed.set(resource, (disposed.get(resource) || 0) + 1));
      view.dispose(); disposedView = true;
      ok(meshes.every(mesh => disposed.get(mesh.geometry) === 1), 'owned actual hazard geometries dispose exactly once');
      ok(meshes.every(mesh => (Array.isArray(mesh.material) ? mesh.material : [mesh.material])
        .every(material => disposed.get(material) === 1)), 'owned actual hazard materials dispose exactly once');
    } finally {if (!disposedView) view.dispose();}
  });
}

test('NATIVE PRESENTATION CONTROL: updating actual combat geometry never consumes simulation random draws', () => {
  const duel = race(), twin = race(); duel.state.raids = twin.state.raids = null;
  const view = createCombatScene(undefined, {loadFighterAsset: () => Promise.reject(Error('inactive fighter asset boundary'))});
  try {
    const courseRng = duel.course.rng;
    ok(courseRng && typeof courseRng.float === 'function', 'actual Course exposes its seeded generator');
    for (let i = 0; i < 60; i++) view.update(duel);
    eq(Array.from({length: 12}, () => courseRng.float()), Array.from({length: 12}, () => twin.course.rng.float()),
      'actual presentation preserves the native seeded RNG continuation');
  } finally {view.dispose();}
});

// Director-settled shared DATA contract. This does not build a Mirage/Drone.
// Settled Mirage records are genuine NPC actors/arena participants with decoy:true.
// Future producers own creation; this suite only supplies explicit actor DATA.
function identity(duel, actor) {
  return actor === duel.state ? 'player' : actor.decoy ? actor.id :
    actor.arenaId || 'cpu:' + duel.state.opponents.indexOf(actor);
}
function decoyData(duel, owner, {id = 'test-decoy-1', s = owner.s, lateral = owner.lateral,
  active = true, expiresAt = duel.state.stageTimeSec + 10} = {}) {
  // Borrow an actual initialized native NPC and its actual arena participant,
  // then supply the future producer's flag/metadata. No resolver is mocked.
  const donor = race({arena: !!duel.state.arena});
  const record = donor.state.opponents[1];
  const participant = arenaParticipant(donor, record);
  Object.assign(record, {id, ownerId: identity(duel, owner), car: owner.car || duel.state.car,
    s, prevS: s, lateral, prevLateral: lateral, headingError: 0, active, expiresAt, decoy: true});
  if (duel.state.arena) {
    record.arenaId = id;
    Object.assign(participant, {id, ownerId: identity(duel, owner), decoy: true, active, expiresAt,
      team: arenaParticipant(duel, owner).team});
    duel.state.arena.participants.push(participant);
  }
  duel.state.opponents.push(record);
  return record;
}
for (const arena of [false, true]) {
  for (const status of ['live', 'expired', 'inactive', 'friendly', 'out-of-range']) {
    test('SHARED DECOY DATA: actual resolver ' + status + ' on ' + (arena ? 'arena' : 'road'), () => {
      const duel = race({arena}), cpu = duel.state.rival, real = duel.state;
      if (arena) arenaParticipant(duel, cpu).targetId = 'player';
      const origin = point(duel, cpu);
      const owner = status === 'friendly' ? cpu : real;
      const data = decoyData(duel, owner, {s: status === 'out-of-range' ? cpu.s + 400 : real.s + 4,
        active: status !== 'inactive', expiresAt: status === 'expired' ? duel.state.stageTimeSec : duel.state.stageTimeSec + 10});
      eq(targetFor(duel, cpu, {range: T.cpu.attackRange, origin}), status === 'live' ? data : real,
        'genuine resolver selects only a live hostile decoy within this attack range');
      ok(duel.state.opponents.includes(data), 'decoy DATA is an actual native NPC actor record');
      eq(data.decoy, true, 'selected native actor DATA explicitly identifies its decoy role');
      if (arena) eq(arenaParticipant(duel, data).decoy, true, 'actual native arena participant carries the settled decoy flag');
    });
  }
  test('SHARED TARGET CONTEXT: actual weapon range and supplied current origin on ' + (arena ? 'arena' : 'road'), () => {
    const duel = race({arena}), attacker = duel.state, target = duel.state.rival;
    const origin = point(duel, attacker), at = point(duel, target), distance = Math.hypot(at.x - origin.x, at.z - origin.z);
    eq(targetFor(duel, attacker, {range: distance + .1, origin}), target, 'inside actual caller range retains the native target');
    eq(targetFor(duel, attacker, {range: distance - .1, origin}), null, 'resolver excludes a target beyond the exact caller range');
    const displacedOrigin = {x: at.x + 500, y: at.y, z: at.z};
    eq(targetFor(duel, attacker, {range: T.foot.rpgLockRange, origin: displacedOrigin}), null,
      'resolver uses the supplied current projectile/fighter origin for range');
  });
  test('SHARED TARGET CONTEXT: intended real target cannot switch to a nearer real car on ' + (arena ? 'arena' : 'road'), () => {
    const duel = race({arena}), locked = duel.state.opponents[1];
    place(locked, 560); place(duel.state.rival, 520);
    const context = {range: T.foot.rpgLockRange, origin: point(duel, duel.state), lockedTargetId: identity(duel, locked)};
    eq(targetFor(duel, duel.state, context), locked, 'genuine resolver preserves intended real target despite a nearer enemy');
    locked.finished = true;
    eq(targetFor(duel, duel.state, context), null, 'gone intended target breaks selection without changing to another real car');
  });
  test('SHARED TARGET CONTEXT: live decoy may redirect a lock, smoke breaks its actual current ray on ' + (arena ? 'arena' : 'road'), () => {
    const duel = race({arena}), locked = duel.state.rival;
    const data = decoyData(duel, locked, {s: locked.s - 3, lateral: 3});
    const origin = point(duel, duel.state), context = {range: T.foot.rpgLockRange, origin, lockedTargetId: identity(duel, locked)};
    eq(targetFor(duel, duel.state, context), data, 'genuine locked resolver may redirect only to a qualifying decoy');
    smoke(duel, origin);
    eq(targetFor(duel, duel.state, context), null, 'actual smoke around current attack origin breaks decoy aim too');
  });
}
for (const route of ['scheduled', 'direct']) {
  test('NATIVE DECOY SHOT: actual ' + route + ' CPU crossbow aims at live DATA', () => {
    const duel = race(), cpu = duel.state.rival;
    const data = decoyData(duel, duel.state, {s: duel.state.s, lateral: 8});
    if (route === 'scheduled') {
      duel.state.combat.aiTimer = 0; duel.state.combat.aiTurn = 0; stepCombatAI(duel, DT);
    } else eq(fireWeapon(duel, 'crossbow', true, cpu), true, 'actual clear CPU shot launches');
    const shot = duel.state.combat.projectiles.find(p => p.kind === 'crossbow');
    ok(shot, 'genuine CPU route creates its real crossbow');
    const at = point(duel, cpu), selected = point(duel, data), real = point(duel, duel.state);
    const bearing = Math.atan2(shot.vx, shot.vz) - (shot.aimBias || 0);
    const errorTo = target => Math.abs(Math.atan2(Math.sin(bearing - Math.atan2(target.x - at.x, target.z - at.z)),
      Math.cos(bearing - Math.atan2(target.x - at.x, target.z - at.z))));
    ok(errorTo(selected) < errorTo(real) * .25, 'actual CPU launch bearing aims at decoy DATA rather than the real player');
  });
}
for (const enemy of [false, true]) for (const obstruction of ['origin-smoke', 'decoy']) {
  test('NATIVE BOLT CONTEXT: ' + (enemy ? 'CPU' : 'player') + ' in-flight ' + obstruction, () => {
    const duel = race(), shooter = enemy ? duel.state.rival : duel.state, target = enemy ? duel.state : duel.state.rival;
    eq(fireWeapon(duel, 'crossbow', enemy, shooter), true, 'actual native bolt launches before obstruction');
    const shot = duel.state.combat.projectiles.at(-1);
    for (let i = 0; i < 4; i++) stepProjectiles(duel, DT);
    const initial = {vx: shot.vx, vz: shot.vz}, oldBearing = Math.atan2(shot.vx, shot.vz);
    if (obstruction === 'origin-smoke') {
      // The actual projectile advances first. The shooter then changes lane.
      place(shooter, shooter.s, 20); place(target, target.s, 3);
      smoke(duel, {x: shot.x, y: shot.y, z: shot.z}, .2);
      stepProjectiles(duel, DT);
      near(shot.vx, initial.vx, 'native in-flight bolt reads smoke at its current projectile origin x');
      near(shot.vz, initial.vz, 'native in-flight bolt reads smoke at its current projectile origin z');
    } else {
      const data = decoyData(duel, target, {s: target.s, lateral: target.lateral + 3});
      const at = point(duel, data), desired = Math.atan2(at.x - shot.x, at.z - shot.z) + (shot.aimBias || 0);
      const initialError = Math.abs(Math.atan2(Math.sin(desired - oldBearing), Math.cos(desired - oldBearing)));
      stepProjectiles(duel, DT);
      const nextError = Math.abs(Math.atan2(Math.sin(desired - Math.atan2(shot.vx, shot.vz)), Math.cos(desired - Math.atan2(shot.vx, shot.vz))));
      ok(nextError < initialError - 1e-5, 'actual native in-flight bolt steers toward the qualifying decoy DATA');
    }
  });
}
for (const obstruction of ['fighter-smoke', 'parked-smoke', 'out-of-range', 'decoy']) {
  test('NATIVE MOVED RPG LOCK: actual lock from current walking fighter with ' + obstruction, () => {
    const duel = race(); const parked = point(duel, duel.state);
    const fighter = foot(duel, {walk: true}); place(duel.state.rival, 540); place(duel.state.opponents[1], 610, 5);
    lock(duel);
    if (obstruction === 'fighter-smoke') smoke(duel, fighter);
    else if (obstruction === 'parked-smoke') smoke(duel, parked);
    else if (obstruction === 'out-of-range') place(duel.state.rival, duel.state.s + T.foot.rpgLockRange + 80);
    else decoyData(duel, duel.state.rival, {s: duel.state.rival.s - 2, lateral: duel.state.rival.lateral});
    stepFootWeapons(duel, DT);
    if (obstruction === 'fighter-smoke' || obstruction === 'out-of-range') {
      eq(duel.state.footWeapons.lockTargetIndex, null, 'actual native lock breaks when current fighter ray is smoked or target leaves range');
      near(duel.state.footWeapons.lockSeconds, 0, 'broken actual lock loses its charge');
    } else if (obstruction === 'parked-smoke') {
      eq(duel.state.footWeapons.lockTargetIndex, 0, 'parked-car-only smoke retains actual moved fighter clear lock');
    } else {
      duel.setFighterInput({fire: true}); stepFootWeapons(duel, DT);
      const shot = duel.state.combat.projectiles.find(p => p.kind === 'rpg');
      ok(shot, 'actual locked RPG really fires after native decoy selection');
      ok(shot.targetId === 'test-decoy-1' || duel.state.footWeapons.lockTargetId === 'test-decoy-1',
        'native RPG carries the stable decoy identity rather than a real-car-only index');
    }
  });
}
for (const obstruction of ['origin-smoke', 'decoy', 'nearer-real']) {
  test('NATIVE RPG GUIDANCE: actual fired projectile ' + obstruction, () => {
    const duel = race(); foot(duel); lock(duel);
    duel.setFighterInput({fire: true}); stepFootWeapons(duel, DT);
    const shot = duel.state.combat.projectiles.find(p => p.kind === 'rpg'); ok(shot, 'actual native locked RPG fires');
    for (let i = 0; i < 8; i++) stepProjectiles(duel, DT);
    const initial = {vx: shot.vx, vz: shot.vz};
    if (obstruction === 'origin-smoke') {
      smoke(duel, {x: shot.x, y: shot.y, z: shot.z}, .2); place(duel.state.rival, duel.state.rival.s, 3);
      stepProjectiles(duel, DT);
      near(shot.vx, initial.vx, 'genuine RPG guidance breaks at its current projectile smoke origin x');
      near(shot.vz, initial.vz, 'genuine RPG guidance breaks at its current projectile smoke origin z');
    } else {
      const intended = obstruction === 'decoy' ? decoyData(duel, duel.state.rival, {s: duel.state.rival.s, lateral: 3}) : duel.state.rival;
      if (obstruction === 'nearer-real') place(duel.state.opponents[1], duel.state.s + 10, 5);
      const at = point(duel, intended), desired = Math.atan2(at.x - shot.x, at.z - shot.z);
      const before = Math.abs(Math.atan2(Math.sin(desired - Math.atan2(shot.vx, shot.vz)), Math.cos(desired - Math.atan2(shot.vx, shot.vz))));
      stepProjectiles(duel, DT);
      const next = Math.abs(Math.atan2(Math.sin(desired - Math.atan2(shot.vx, shot.vz)), Math.cos(desired - Math.atan2(shot.vx, shot.vz))));
      ok(next <= before + 1e-5, 'actual RPG guidance follows its intended car or eligible decoy without chasing another real car');
      if (obstruction === 'decoy') {
        const control = race(); foot(control); lock(control);
        control.setFighterInput({fire: true}); stepFootWeapons(control, DT);
        const ordinary = control.state.combat.projectiles.find(p => p.kind === 'rpg');
        for (let i = 0; i < 9; i++) stepProjectiles(control, DT);
        ok(Math.hypot(shot.vx - ordinary.vx, shot.vz - ordinary.vz) > 1e-5,
          'actual RPG decoy guidance differs from genuine no-decoy flight; ordinary steering cannot satisfy this case');
        ok(next < before - 1e-5, 'actual fired RPG actively redirects toward live decoy DATA');
      }
    }
  });
}
for (const transition of ['stage', 'arena', 'menu']) {
  test('SHARED DECOY LIFECYCLE: actual ' + transition + ' transition clears transient DATA', () => {
    const duel = race(); decoyData(duel, duel.state.rival);
    if (transition === 'stage') duel.startCampaign({mode: 'wasteland', discoveredGate: true});
    else if (transition === 'arena') duel.startArenaEvent({car: 'falcone_f42', opponents: [{car: 'dusthawk_rally'}]});
    else {
      const app = appFixture();
      try {app.duel = duel; app.returnToMenu();} finally {app.dispose?.();}
    }
    eq(duel.state.opponents.some(actor => actor.decoy), false, 'genuine lifecycle removes transient flagged decoy actors');
  });
}

for (const kind of ['oil', 'smoke']) for (const admission of ['eligible', 'rank', 'dev', 'discovery', 'owned']) {
  test('NATIVE ARMORY VIEW: ' + kind + ' offer/equip admission=' + admission, () => {
    const p = career(admission === 'rank' ? 1 : 6,
      {owned: admission === 'owned' ? [kind] : [], discovered: admission !== 'discovery'});
    const enabled = admission !== 'dev', before = structuredClone(p);
    // Existing screen factory is the genuine native HTML presenter. The new
    // Arsenal switch callback must gate offers without writing a profile.
    const render = createArmoryScreen({profile: () => p, credits: value => String(value),
      escapeHTML: value => String(value), getGarageMessage: () => '',
      kitsEnabled: () => admission !== 'discovery', loadoutsEnabled: () => true,
      arsenalEnabled: () => enabled, action: (label, id) => `<button data-action="${id}">${label}</button>`});
    const html = render(), options = {wastelandEnabled: admission !== 'discovery', arsenalEnabled: enabled};
    eq(availableCarWeapons(p, options).includes(kind), admission === 'owned',
      'actual offered equip list requires owned implemented admitted weapon');
    const name = WEAPONS[kind].name;
    if (admission === 'eligible') {
      ok(html.includes(name), 'genuine Armory renders the newly eligible weapon offer');
      ok(new RegExp('<button[^>]*data-[^>]*["\\\']' + kind + '["\\\'][^>]*>[\\s\\S]*?400\\s+SCRAP').test(html),
        'actual Armory offer provides the bound buy action and exact scrap price');
    } else if (admission === 'owned') {
      ok(new RegExp('<option[^>]*value="' + kind + '"').test(html), 'actual Armory offers owned Arsenal weapon for equip');
      ok(new RegExp('data-weapon-upgrade="' + kind + '"').test(html), 'actual Armory exposes the owned weapon upgrade action');
    } else ok(!new RegExp('<button[^>]*data-[^>]*["\\\']' + kind + '["\\\']').test(html),
      'genuine Armory contains no enabled acquisition action outside rank/dev/discovery admission');
    eq(p, before, 'genuine screen rendering preserves complete raw profile');
  });
}

test('NATIVE PRESENTATION CONTROL: full native race, hazard and effect data remain read-only', () => {
  const duel = race(); duel.state.raids = null;
  const at = point(duel, duel.state);
  const hazard = addHazard(duel, {kind: 'oil', shape: 'circle', ...at, radius: 3.5, lifetime: 6, owner: duel.state});
  setCarEffect(duel.state, 'slick', {duration: .7, grip: .35});
  const stateBefore = JSON.stringify(duel.state), hazardBefore = {...hazard}, effectBefore = {...carEffect(duel.state, 'slick')};
  const events = []; duel.onChange((_, event) => events.push(event));
  const view = createCombatScene(undefined, {loadFighterAsset: () => Promise.reject(Error('inactive fighter asset boundary'))});
  try {
    for (let i = 0; i < 60; i++) view.update(duel);
    eq(JSON.stringify(duel.state), stateBefore, 'actual repeated presentation updates preserve every serialized race field');
    eq(hazard, hazardBefore, 'actual native presenter never ages or edits the simulation hazard');
    eq(carEffect(duel.state, 'slick'), effectBefore, 'actual native presenter never ages or edits timed effects');
    eq(events, [], 'actual presentation produces no race event or write');
  } finally {view.dispose();}
});

for (const kind of ['oil', 'smoke']) {
  test('NATIVE APP UPGRADE: already-owned ' + kind + ' upgrades without needing an equip action', () => {
    const app = appFixture({owned: [kind]});
    try {
      const before = app.profile, raw = structuredClone(before), balance = before.wasteland.scrap;
      eq(app.purchaseWeapon(kind).ok, true, 'actual bound already-owned Arsenal upgrade succeeds');
      eq(before, raw, 'native upgrade preserves its original complete input profile');
      near(app.profile.wasteland.scrap, balance - 150, 'actual first bound upgrade spends 150 scrap');
      eq(getProfileWeapons(app.profile).levels[kind], 1, 'actual bound upgrade records level one');
    } finally {app.dispose?.();}
  });
  test('NATIVE APP LAUNCH: an already-saved earned ' + kind + ' slot survives actual App-to-Duel launch', () => {
    const app = appFixture({owned: [kind]});
    try {
      const owned = {...app.profile, wasteland: {...app.profile.wasteland,
        loadout: ['future-weapon', kind, 'crossbow', 'star']}};
      const registry = replacePlayerProfile(loadPlayers(), app.player.id, owned);
      eq(savePlayers(registry), true, 'genuine native registry persists the earned four-slot fixture');
      app.startCampaign({mode: 'wasteland', seed: 1989, opponentCount: 2});
      ok(app.duel.state.weaponLoadout.includes(kind), 'actual native launch admits the already-owned implemented saved Arsenal slot');
    } finally {app.dispose?.();}
  });
}
test('NATIVE CPU GROWTH: actual seeded rank-six launches use both implemented wave-one weapons', () => {
  const app = appFixture({rank: 6}), used = new Set();
  try {
    for (let seed = 1989; seed < 2001; seed++) {
      app.duel.state.status = 'menu';
      app.startCampaign({mode: 'wasteland', seed, opponentCount: 3, cpuDifficulty: 'hard'});
      for (const cpu of app.duel.state.opponents) {
        ok(Array.isArray(cpu.weaponLoadout), 'actual seeded CPU growth requires native assigned slots');
        for (const id of cpu.weaponLoadout) used.add(id);
      }
    }
    ok(used.has('oil') && used.has('smoke'), 'genuine seeded CPU assignments grow to both eligible implemented rear weapons');
  } finally {app.dispose?.();}
});

for (const arena of [false, true]) {
  test('SHARED DECOY TERMINAL: genuine ' + (arena ? 'arena result' : 'legal race finish') + ' clears transient DATA', () => {
    const duel = race({arena}); decoyData(duel, duel.state.rival);
    const events = []; duel.onChange((_, event) => events.push(event));
    if (arena) {
      duel.state.arena.phase = 'sudden-death';
      duel.state.arena.suddenDeathSec = duel.state.arena.suddenDeathLimitSec;
      stepArenaEvent(duel, DT);
      eq(duel.state.status, 'arena_result', 'genuine native clock emits an actual arena result');
      eq(events.filter(event => event.arenaResult).length, 1, 'actual arena terminal event occurs once');
    } else {
      duel.state.completedLaps = duel.state.lapsTotal; duel.state.s = duel.raceLength;
      eq(duel._finishStage(), true, 'genuine fully completed race emits an actual stage result');
      eq(events.filter(event => event.stageResult).length, 1, 'actual race terminal event occurs once');
    }
    eq(duel.state.opponents.some(actor => actor.decoy), false, 'native terminal event clears transient flagged decoy actors without a fake emit');
  });
}

test('SHARED DECOY SAVE CONTROL: native fight DATA never enters named player saves', () => {
  const app = appFixture();
  try {
    app.startCampaign({mode: 'wasteland', seed: 1989, opponentCount: 2});
    const profileBefore = structuredClone(app.profile), rawBefore = values.get(PLAYERS_KEY);
    const record = decoyData(app.duel, app.duel.state.rival);
    ok(app.duel.state.opponents.includes(record), 'actual current native fight contains the supplied flagged actor DATA');
    eq(app._saveProfile(), true, 'actual bound profile saver works with transient fight actors present');
    eq(app.profile, profileBefore, 'native fight DATA never changes the real owner profile');
    eq(loadPlayers().players.find(player => player.id === app.player.id).profile, profileBefore,
      'actual named-player round trip contains no transient fight records');
    eq(values.get(PLAYERS_KEY), rawBefore, 'profile-only save preserves registry bytes despite transient fight DATA');
  } finally {app.dispose?.();}
});
