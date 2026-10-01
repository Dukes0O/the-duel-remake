import assert from 'node:assert/strict';
import {test, after} from 'node:test';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
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
      // Reviewed closed-loop correction: only this negative arena case uses
      // the settled 50-metre Harpoon context; no future weapon is implemented.
      const narrowArenaRange = arena && status === 'out-of-range';
      if (narrowArenaRange) {place(real, 20); place(cpu, 60);}
      const origin = point(duel, cpu);
      const owner = status === 'friendly' ? cpu : real;
      const data = decoyData(duel, owner, {s: status === 'out-of-range' ? cpu.s + 400 : real.s + 4,
        active: status !== 'inactive', expiresAt: status === 'expired' ? duel.state.stageTimeSec : duel.state.stageTimeSec + 10});
      eq(targetFor(duel, cpu, {range: narrowArenaRange ? 50 : T.cpu.attackRange, origin}), status === 'live' ? data : real,
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
    const buttons = html.match(/<button\b[\s\S]*?<\/button>/g) || [];
    const boundToWeapon = button => [...button.matchAll(/\bdata-[a-z-]+="([^"]+)"/g)]
      .some(match => match[1] === kind);
    if (admission === 'eligible') {
      ok(html.includes(name), 'genuine Armory renders the newly eligible weapon offer');
      ok(buttons.some(button => boundToWeapon(button) && /\b400\s+SCRAP\b/.test(button) && !/\bdisabled\b/.test(button)),
        'actual Armory offer provides the bound buy action and exact scrap price');
    } else if (admission === 'owned') {
      ok(new RegExp('<option[^>]*value="' + kind + '"').test(html), 'actual Armory offers owned Arsenal weapon for equip');
      ok(new RegExp('data-weapon-upgrade="' + kind + '"').test(html), 'actual Armory exposes the owned weapon upgrade action');
    } else ok(!buttons.some(button => boundToWeapon(button) && !/\bdisabled\b/.test(button)),
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

// Reviewed geometry controls use the settled Harpoon 50-metre API context,
// not a Harpoon producer, projectile, CPU attack or a new shared range default.
function closedArenaRangeFixture(copyS) {
  const duel = race({arena: true}), cpu = duel.state.rival, real = duel.state;
  place(real, 20); place(cpu, 60); arenaParticipant(duel, cpu).targetId = 'player';
  const data = decoyData(duel, real, {s: copyS});
  const origin = point(duel, cpu), copyAt = point(duel, data), realAt = point(duel, real);
  return {duel, cpu, real, data, origin,
    copyDistance: Math.hypot(copyAt.x - origin.x, copyAt.z - origin.z),
    realDistance: Math.hypot(realAt.x - origin.x, realAt.z - origin.z)};
}
for (const [copyS, drawsAim] of [[24, true], [460, false]]) {
  test('REVIEWED ARENA RANGE: genuine loop copy s=' + copyS + ' inside50=' + drawsAim, () => {
    const {duel, cpu, real, data, origin, copyDistance, realDistance} = closedArenaRangeFixture(copyS);
    ok(duel.course.closed, 'fixture uses the actual closed arena course');
    ok(copyS >= 0 && copyS < duel.course.length, 'copy stays inside genuine course progress bounds without unwrapped shortcuts');
    ok(realDistance < 50, 'native real owner stays inside the settled caller range');
    eq(copyDistance < 50, drawsAim, 'native point conversion independently proves the copy range condition');
    eq(targetFor(duel, cpu, {range: 50, origin}), drawsAim ? data : real,
      'genuine shared resolver selects the inside copy and rejects the outside copy while retaining the real owner');
    eq(arenaParticipant(duel, data).decoy, true, 'native loop copy retains the settled participant flag');
    eq(data.decoy, true, 'native loop copy retains the genuine actor flag');
  });
}
test('REVIEWED ARENA RANGE: native current-origin boundary is exact for the genuine closed-loop copy', () => {
  const {duel, cpu, real, data, origin, copyDistance, realDistance} = closedArenaRangeFixture(460);
  ok(realDistance < copyDistance - .1, 'real owner remains eligible on both sides of the native copy boundary');
  eq(targetFor(duel, cpu, {range: copyDistance + .1, origin}), data,
    'native copy draws aim when the actual current-origin range extends just past its distance');
  eq(targetFor(duel, cpu, {range: copyDistance - .1, origin}), real,
    'native copy cannot draw aim when the actual current-origin range stops just before its distance');
});

// Actual released whole-module bodies, held only in memory. Import routing is
// the sole transformation, as in the existing native dependency proof suites.
// Shared dependencies remain the genuine current native modules; this proves
// these two released consumers, not an entirely historical game deployment.
const RELEASED_RANGE_REF = '0f934845b451dc2429efcb574bc9847cc04a1fe5';
let releasedRangePromise;
function releasedCrossbowConsumers() {
  if (!releasedRangePromise) releasedRangePromise = (async () => {
    const specifications = [
      ['src/combat-weapons.js', 'b37efa29b8e9834886ed20dba8cf39a1c469e246608a108a839e030fa4e601ab'],
      ['src/combat-projectiles.js', 'f36e7c9b109a72e15d0dc2b36ce05451a9ba0cffcbfd6fccdc78c63e3cad4747'],
    ];
    const urls = new Map(), proof = [];
    for (const [path, expectedHash] of specifications) {
      const body = execFileSync('git', ['show', RELEASED_RANGE_REF + ':' + path],
        {cwd: new URL('..', import.meta.url), encoding: 'utf8', windowsHide: true, maxBuffer: 1024 * 1024});
      eq(createHash('sha256').update(body).digest('hex'), expectedHash,
        'retained released native whole-module identity: ' + path);
      const originalUrl = new URL('../' + path, import.meta.url), replacements = [];
      const routed = body.replace(/from\s+(['"])([^'"]+)\1/g, (match, quote, specifier) => {
        const dependency = specifier.startsWith('.') ? new URL(specifier, originalUrl) : null;
        const historicalSibling = dependency && specifications.find(([candidate]) =>
          new URL('../' + candidate, import.meta.url).href === dependency.href)?.[0];
        const address = historicalSibling && urls.get(historicalSibling) ||
          (dependency ? dependency.href : import.meta.resolve(specifier));
        const replacement = 'from ' + JSON.stringify(address);
        replacements.push([replacement, match]); return replacement;
      });
      let reconstructed = routed;
      for (const [replacement, original] of replacements) reconstructed = reconstructed.replace(replacement, original);
      eq(reconstructed, body, 'released consumer body is byte-exact after reversing import routing: ' + path);
      urls.set(path, 'data:text/javascript;base64,' + Buffer.from(routed).toString('base64'));
      proof.push({path, bytes: Buffer.byteLength(body), hash: expectedHash});
    }
    return {weapons: await import(urls.get('src/combat-weapons.js')),
      projectiles: await import(urls.get('src/combat-projectiles.js')), proof};
  })();
  return releasedRangePromise;
}
function longRoadCrossbow({enabled = false, level = 0, speedMph = 0} = {}) {
  const duel = race({enabled}); place(duel.state, 200); place(duel.state.rival, 430);
  place(duel.state.opponents[1], 900, 5);
  duel.state.combat.levels.crossbow = level; duel.state.speedMph = speedMph;
  const origin = point(duel, duel.state), target = point(duel, duel.state.rival);
  const distance = Math.hypot(target.x - origin.x, target.z - origin.z);
  eq(duel.course.surfaceAt(200, 0).road, true, 'actual long-range shooter is on legal native road');
  eq(duel.course.surfaceAt(430, 0).road, true, 'actual long-range target is on legal native road');
  ok(distance > T.cpu.attackRange, 'native legal road witness lies beyond the existing CPU acquisition range');
  ok(distance < T.crossbow.baseSpeed * T.crossbow.lifetime,
    'native legal witness is inside the existing L0 speed/lifetime flight reach; this is not a new targeting cap');
  eq(hazardsFor(duel), [], 'actual release witness has no smoke/oil obstruction or invented target');
  return {duel, origin, target, distance};
}
const nativeBoltVariables = shot => Object.fromEntries(
  ['x', 'y', 'z', 'vx', 'vy', 'vz', 'age', 'targetIndex', 'launchBearing'].map(key => [key, shot[key]]));
for (const [level, speedMph] of [[0, 0], [3, 40]]) {
  test('RELEASED RANGE CONTROL: native switch-off player bolt beyond180 level=' + level + ' carry=' + speedMph, async () => {
    const released = await releasedCrossbowConsumers();
    const current = longRoadCrossbow({level, speedMph}), old = longRoadCrossbow({level, speedMph});
    eq(fireWeapon(current.duel, 'crossbow'), true, 'actual switch-off player launches at a legal beyond180 target');
    eq(released.weapons.fireWeapon(old.duel, 'crossbow'), true, 'genuine retained released player consumer launches at that same target');
    const now = current.duel.state.combat.projectiles.at(-1), before = old.duel.state.combat.projectiles.at(-1);
    eq(now.targetIndex, 0, 'native switch-off launch retains its real intended car identity beyond180');
    eq(nativeBoltVariables(now), nativeBoltVariables(before), 'switch-off launch preserves every released native physical bolt variable');
    place(current.duel.state.rival, 430, 1); place(old.duel.state.rival, 430, 1);
    const launch = {vx: before.vx, vz: before.vz};
    stepProjectiles(current.duel, DT); released.projectiles.stepProjectiles(old.duel, DT);
    ok(Math.hypot(before.vx - launch.vx, before.vz - launch.vz) > 1e-5,
      'genuine released in-flight bolt actually homes beyond180 after the real target changes lane');
    eq(nativeBoltVariables(now), nativeBoltVariables(before), 'switch-off current-origin guidance preserves the genuine released consumer output');
  });
}
test('PENDING CLAUDE RANGE: active player launch preserves measured released beyond180 aim without a new cap formula', async () => {
  const released = await releasedCrossbowConsumers(), current = longRoadCrossbow({enabled: true}), old = longRoadCrossbow();
  eq(released.weapons.fireWeapon(old.duel, 'crossbow'), true, 'genuine released clear-road player consumer launches beyond180');
  eq(fireWeapon(current.duel, 'crossbow'), true, 'actual active player launch runs on the same legal clear-road witness');
  const now = current.duel.state.combat.projectiles.at(-1), baseline = old.duel.state.combat.projectiles.at(-1);
  eq(nativeBoltVariables(now), nativeBoltVariables(baseline),
    'PENDING CLAUDE RANGE: active consumer must not silently replace measured released beyond180 target aim with an unreviewed straight-shot fallback');
});
test('PENDING CLAUDE RANGE: actual in-flight player bolt beyond180 retains measured released guidance', async () => {
  const released = await releasedCrossbowConsumers(), current = longRoadCrossbow(), old = longRoadCrossbow();
  eq(fireWeapon(current.duel, 'crossbow'), true, 'actual native switch-off launch first supplies its genuine real locked bolt');
  eq(released.weapons.fireWeapon(old.duel, 'crossbow'), true, 'genuine released launch supplies the same real locked bolt');
  const now = current.duel.state.combat.projectiles.at(-1), baseline = old.duel.state.combat.projectiles.at(-1);
  eq(nativeBoltVariables(now), nativeBoltVariables(baseline), 'both genuine launched bolt inputs start byte-equivalent');
  // Activate the real view only after native launch, isolating the held flight
  // route from the separately held acquisition route. No projectile is mocked.
  current.duel.featureFlags = flags(true);
  place(current.duel.state.rival, 430, 1); place(old.duel.state.rival, 430, 1);
  stepProjectiles(current.duel, DT); released.projectiles.stepProjectiles(old.duel, DT);
  eq(nativeBoltVariables(now), nativeBoltVariables(baseline),
    'PENDING CLAUDE RANGE: active in-flight consumer must not discard measured released beyond180 real-target guidance at the CPU acquisition cap');
});

// Claude's 1 October physical-reach settlement. These fixtures use measured
// native world distances and real launch/flight consumers, never a fake bolt.
import {DRIVE as reachDrive} from '../src/config.js';

function measuredReach(origin, target) {
  return Math.hypot(target.x - origin.x, target.z - origin.z);
}
function settledReach(level, speedMph, age = 0) {
  // The decision is independently expressed using settled native units.
  eq(T.crossbow.baseSpeed, 200, 'settled native L0 bolt speed');
  eq(T.crossbow.speedPerLevel, 30, 'settled native speed increment');
  eq(T.crossbow.lifetime, 2.5, 'settled native lifetime');
  return (200 + 30 * level + speedMph * reachDrive.mphToWorld) * (2.5 - age);
}
function nativeAtRange(duel, actor, origin, distance, lateral = 0) {
  // Find a real legal course point with this horizontal distance, rather than
  // substituting a target point or replacing the resolver/geometry API.
  let previous = duel.state.s, low = previous, high;
  const worldDistance = s => {
    const at = duel.course.worldAt(s, lateral);
    return Math.hypot(at.x - origin.x, at.z - origin.z);
  };
  for (let s = previous + 8; s < duel.state.s + duel.course.length; s += 8) {
    if (worldDistance(s) >= distance && worldDistance(previous) < distance) {
      low = previous; high = s; break;
    }
    previous = s;
  }
  ok(Number.isFinite(high), 'native course contains the measured physical boundary witness');
  for (let i = 0; i < 52; i++) {
    const middle = (low + high) / 2;
    if (worldDistance(middle) < distance) low = middle; else high = middle;
  }
  place(actor, (low + high) / 2, lateral);
  eq(duel.course.surfaceAt(actor.s, actor.lateral).road, true, 'physical-range target uses real legal road');
  const at = point(duel, actor);
  near(measuredReach(origin, at), distance, 'actual native target world distance realizes the boundary');
  return at;
}
function physicalLaunch({enabled = true, level = 0, speedMph = 0, distance} = {}) {
  const duel = race({enabled});
  place(duel.state, 200);
  duel.state.opponents[1].finished = true;
  const origin = point(duel, duel.state);
  const target = nativeAtRange(duel, duel.state.rival, origin, distance);
  duel.state.combat.levels.crossbow = level;
  duel.state.speedMph = speedMph;
  // Collinear carry removes the documented diagonal/vector ambiguity. The
  // actual launch still computes and inherits native car velocity itself.
  duel.state.headingError = Math.atan2(target.x - origin.x, target.z - origin.z) - origin.heading;
  return {duel, origin, target, level, speedMph};
}
function realAgedBolt({level = 0, speedMph = 0, age = .125} = {}) {
  const fixture = physicalLaunch({enabled: false, level, speedMph, distance: 230});
  const {duel} = fixture;
  eq(fireWeapon(duel, 'crossbow'), true, 'genuine released route creates the real initial locked bolt');
  const shot = duel.state.combat.projectiles.at(-1);
  const initial = {vx: shot.vx, vz: shot.vz, age: shot.age, level: shot.level};
  near(Math.hypot(shot.vx, shot.vz), 200 + 30 * level + speedMph * reachDrive.mphToWorld,
    'actual collinear native launch inherits speed in correct world units');
  duel.state.rival.finished = true;
  for (let i = 0; i < Math.round(age / DT); i++) stepProjectiles(duel, DT);
  ok(duel.state.combat.projectiles.includes(shot), 'real aged bolt remains alive without position/age resets');
  near(shot.age, age, 'remaining lifetime comes from actual projectile stepping');
  duel.state.rival.finished = false;
  duel.featureFlags = flags(true);
  return {...fixture, shot, initial};
}
for (const level of [0, 3]) for (const speedMph of [0, 40]) for (const inside of [true, false]) {
  test('PHYSICAL REACH launch L' + level + ' carry' + speedMph + ' ' + (inside ? 'inside' : 'outside'), () => {
    const range = settledReach(level, speedMph), distance = range + (inside ? -.05 : .05);
    const {duel} = physicalLaunch({level, speedMph, distance});
    eq(fireWeapon(duel, 'crossbow'), true, 'player can still fire a real straight bolt when physical aim is unavailable');
    const shot = duel.state.combat.projectiles.at(-1);
    eq(shot.targetIndex, inside ? 0 : undefined, 'actual launch accepts only the measured physical-range target');
    if (inside) {
      eq(shot.targetId, 'cpu:0', 'real launch preserves the selected stable identity');
      near(Math.hypot(shot.vx, shot.vz), 200 + 30 * level + speedMph * reachDrive.mphToWorld,
        'aimed native launch keeps upgrade and carry speed');
    }
    near(shot.age, 0, 'real physical boundary launch starts at age zero');
  });
}
for (const level of [0, 3]) for (const speedMph of [0, 40]) for (const age of [.125, .25]) for (const inside of [true, false]) {
  test('PHYSICAL REACH flight L' + level + ' carry' + speedMph + ' age' + age + ' ' + (inside ? 'inside' : 'outside'), () => {
    const {duel, shot} = realAgedBolt({level, speedMph, age});
    const origin = {...shot}, range = settledReach(level, speedMph, shot.age);
    const target = nativeAtRange(duel, duel.state.rival, origin, range + (inside ? -.05 : .05), 3);
    if (inside) ok(measuredReach(point(duel, duel.state), target) > range,
      'actual target is beyond remaining reach from the car but inside from the native projectile');
    const velocity = {vx: shot.vx, vz: shot.vz}, oldAge = shot.age;
    stepProjectiles(duel, DT);
    eq(shot.targetIndex, inside ? 0 : null, 'actual homing range uses current bolt origin and remaining native lifetime');
    near(shot.age, oldAge + DT, 'native guidance keeps original fixed-step age increment');
    near(Math.hypot(shot.vx, shot.vz), Math.hypot(velocity.vx, velocity.vz), 'guidance never changes original horizontal flight speed');
    if (inside) eq(shot.targetId, 'cpu:0', 'within reach guidance keeps real locked identity');
    else eq({vx: shot.vx, vz: shot.vz}, velocity, 'out-of-reach bolt continues original flight instead of re-aiming');
  });
}
for (const speedAfterLaunch of [0, 120]) test('PHYSICAL REACH flight freezes launch carry despite current car speed' + speedAfterLaunch, () => {
  const {duel, shot} = realAgedBolt({level: 3, speedMph: 40, age: .25});
  const range = settledReach(3, 40, shot.age);
  duel.state.speedMph = speedAfterLaunch;
  duel.state.combat.levels.crossbow = 0;
  nativeAtRange(duel, duel.state.rival, shot, range - .05, 3);
  stepProjectiles(duel, DT);
  eq(shot.targetIndex, 0, 'remaining reach uses actual launched upgrade/carry, not a later actor/profile change');
  eq(shot.level, 3, 'original real projectile level remains unchanged');
});
for (const inside of [true, false]) test('PHYSICAL REACH native decoy launch ' + (inside ? 'inside' : 'outside'), () => {
  const {duel, origin} = physicalLaunch({distance: 100});
  const data = decoyData(duel, duel.state.rival, {id: 'physical-reach-decoy'});
  nativeAtRange(duel, data, origin, settledReach(0, 0) + (inside ? -.05 : .05));
  eq(fireWeapon(duel, 'crossbow'), true, 'actual native aimed player consumer fires');
  const shot = duel.state.combat.projectiles.at(-1);
  eq(shot.targetIndex, inside ? duel.state.opponents.indexOf(data) : 0,
    'real resolver redirects only to a native flagged decoy inside physical reach');
  eq(shot.targetId, inside ? data.id : 'cpu:0', 'stable native decoy/real identity survives launch');
});
for (const inside of [true, false]) test('PHYSICAL REACH native decoy flight ' + (inside ? 'inside' : 'outside'), () => {
  const {duel, shot} = realAgedBolt();
  nativeAtRange(duel, duel.state.rival, shot, 100, 3);
  const data = decoyData(duel, duel.state.rival, {id: 'physical-flight-decoy'});
  nativeAtRange(duel, data, shot, settledReach(0, 0, shot.age) + (inside ? -.05 : .05));
  stepProjectiles(duel, DT);
  eq(shot.targetId, inside ? data.id : 'cpu:0', 'actual in-flight guidance admits only a physically reachable native decoy');
});
test('PHYSICAL REACH flight keeps locked real identity despite nearer hostile car', () => {
  const {duel, shot} = realAgedBolt();
  nativeAtRange(duel, duel.state.rival, shot, 300, 3);
  const nearer = duel.state.opponents[1]; nearer.finished = false;
  nativeAtRange(duel, nearer, shot, 80, 3);
  stepProjectiles(duel, DT);
  eq(shot.targetIndex, 0, 'physical range does not retarget another real car');
  eq(shot.targetId, 'cpu:0', 'actual locked identity survives a nearer enemy');
});
for (const inside of [true, false]) test('PHYSICAL REACH CPU acquisition remains180 ' + (inside ? 'inside' : 'outside'), () => {
  const duel = race(), cpu = duel.state.rival;
  place(cpu, 200); duel.state.opponents[1].finished = true;
  nativeAtRange(duel, duel.state, point(duel, cpu), 180 + (inside ? -.05 : .05));
  eq(fireWeapon(duel, 'crossbow', true, cpu), inside,
    'actual CPU launch preserves the settled 180m acquisition boundary');
});
for (const inside of [true, false]) test('PHYSICAL REACH actual CPU bolt flight ' + (inside ? 'inside' : 'outside'), () => {
  const duel = race({enabled: false}), cpu = duel.state.rival;
  place(cpu, 200); place(duel.state, 430); duel.state.opponents[1].finished = true;
  eq(fireWeapon(duel, 'crossbow', true, cpu), true, 'genuine released CPU route launches its actual biased bolt');
  const shot = duel.state.combat.projectiles.at(-1);
  eq(shot.enemy, true, 'flight fixture is the actual enemy producer');
  duel.state.finished = true;
  for (let i = 0; i < 15; i++) stepProjectiles(duel, DT);
  ok(duel.state.combat.projectiles.includes(shot), 'native enemy bolt survives real aging without resets');
  near(shot.age, .125, 'actual enemy age supplies remaining lifetime');
  duel.state.finished = false;
  duel.featureFlags = flags(true);
  nativeAtRange(duel, duel.state, shot, settledReach(0, 0, shot.age) + (inside ? -.05 : .05), 3);
  stepProjectiles(duel, DT);
  eq(shot.targetIndex, inside ? -1 : null,
    'every in-flight bolt uses physical reach although CPU acquisition remains 180m');
  if (inside) eq(shot.targetId, 'player', 'real biased enemy bolt keeps its locked player identity');
});

// Actual App retry regression: a separate memory-only registry writer advances
// another named player after a failed shop save. No production saver is mocked.
function retryRegistryFixture(action) {
  values.clear(); writes.length = 0;
  const owner = career(6, {owned: action === 'purchase' ? [] : ['oil']});
  owner.credits = 54321;
  let registry = createPlayerRegistry(owner);
  registry.players[0].name = 'Retry Owner';
  registry = createPlayer(registry, 'Concurrent Other Player').registry;
  const other = career(1); other.credits = 54321;
  registry = replacePlayerProfile(registry, registry.players[1].id, other);
  registry.activePlayerId = registry.players[0].id;
  eq(savePlayers(registry), true, 'retry fixture persists both genuine named profiles');
  const app = new App(); app.duel.featureFlags = flags(); app.audio.unlock = () => {};
  return app;
}
function actualRetryAction(app, action) {
  return action === 'purchase' ? app.purchaseArsenalWeapon('oil')
    : action === 'upgrade' ? app.purchaseWeapon('oil') : app.equipCarWeapon(1, 'oil');
}
function concurrentShopRetry(action) {
  const app = retryRegistryFixture(action), storage = globalThis.localStorage;
  try {
    const ownerId = app.player.id, original = structuredClone(app.profile);
    const initialRegistry = loadPlayers(), otherId = initialRegistry.players[1].id;
    const originalRaw = values.get(PLAYERS_KEY), writeCount = writes.length;
    let failedWrites = 0;
    Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
      getItem: key => storage.getItem(key), removeItem: key => storage.removeItem(key),
      setItem: (key, value) => {
        if (key === PLAYERS_KEY) {failedWrites++; throw new Error('Test-only registry write failure');}
        storage.setItem(key, value);
      },
    }});
    let refused;
    try {refused = actualRetryAction(app, action);}
    finally {Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: storage});}
    eq(refused, {ok: false, reason: action === 'equip' ? 'Could not save this loadout.' : 'Could not save this purchase.'},
      'actual ' + action + ' reports the real failed registry save');
    eq(failedWrites, 1, 'one actual shop action attempts one failed PLAYERS_KEY write');
    eq(writes.length, writeCount, 'failed registry write commits no memory storage write');
    eq(values.get(PLAYERS_KEY), originalRaw, 'failed ' + action + ' leaves full raw registry bytes unchanged');
    eq(app.profile, original, 'failed ' + action + ' restores the complete owner profile');
    eq(app.profileSaved, false, 'genuine save failure leaves the App retry branch active');
    eq(loadPlayers(), initialRegistry, 'failed ' + action + ' changes neither durable named player');

    // This is a distinct writer object and genuine load/save normalization, not
    // an assignment to app.players or a fabricated return from the App saver.
    const separateWriter = {getItem: key => storage.getItem(key),
      setItem: (key, value) => storage.setItem(key, value), removeItem: key => storage.removeItem(key)};
    const external = loadPlayers(separateWriter), rawExternal = structuredClone(external);
    const other = external.players.find(player => player.id === otherId);
    const futureSlots = ['future-weapon', 'future-external-one', 'future-external-two', 'future-external-three'];
    const updated = {...other.profile, credits: 99999, externalProgress: {kept: 'new'},
      wasteland: normalizeWasteland({...other.profile.wasteland,
        externalCareer: {kept: 'new-career'},
        weapons: {...other.profile.wasteland.weapons, externalWeapons: {kept: 'new-weapons'},
          unlocked: [...other.profile.wasteland.weapons.unlocked, ...futureSlots],
          levels: {...other.profile.wasteland.weapons.levels, 'future-external-one': 17}},
        loadout: futureSlots})};
    eq(savePlayers(replacePlayerProfile(external, otherId, updated), separateWriter), true,
      'independent actual writer durably advances the other named player before retry');
    eq(external, rawExternal, 'independent profile replacement/save leaves its full raw input unchanged');
    const advanced = loadPlayers(separateWriter), expectedOther = structuredClone(advanced.players.find(player => player.id === otherId));
    eq(expectedOther.profile.credits, 99999, 'separate writer genuinely persists the concurrent credit advance');
    eq(expectedOther.profile.externalProgress, {kept: 'new'}, 'separate writer genuinely persists unknown root progress');
    eq(expectedOther.profile.wasteland.loadout, futureSlots, 'separate writer genuinely persists four earned future slots');
    eq(advanced.players.find(player => player.id === ownerId).profile, original,
      'external writer advances only the other player, leaving retry owner unchanged');
    const beforeRetryWrites = writes.length, retried = actualRetryAction(app, action);
    eq(retried.ok, true, 'actual ' + action + ' retries successfully after storage recovers');
    eq(app.profileSaved, true, 'successful real retry restores saved status');
    eq(writes.length, beforeRetryWrites + 1, 'successful retry performs exactly one registry write');
    const loaded = loadPlayers(separateWriter), savedOwner = loaded.players.find(player => player.id === ownerId);
    eq(loaded.activePlayerId, ownerId, 'successful retry preserves the intended active owner identity');
    eq(savedOwner.profile, app.profile, 'successful retry persists the complete actual owner profile');
    eq(savedOwner.profile.credits, 54321, 'Arsenal retry never charges ordinary credits');
    eq(savedOwner.profile.wasteland.scrap, original.wasteland.scrap -
      (action === 'purchase' ? 400 : action === 'upgrade' ? 150 : 0),
      'failed then successful ' + action + ' charges its settled scrap cost only once');
    eq(savedOwner.profile.wasteland.weapons.unlocked.filter(id => id === 'oil').length, 1,
      'retry persists exactly one earned Oil identity for its owner');
    eq(savedOwner.profile.wasteland.weapons.levels.oil, action === 'upgrade' ? 1 : 0,
      'actual retry purchases precisely one level only for the upgrade branch');
    eq(savedOwner.profile.wasteland.loadout, action === 'equip'
      ? ['future-weapon', 'oil', 'bomb', 'star'] : original.wasteland.loadout,
      'retry changes only the intended slot and preserves all four owner slots');
    eq(savedOwner.profile.unknownRoot, original.unknownRoot, 'retry preserves owner unknown root fields');
    eq(savedOwner.profile.wasteland.unknownCareer, original.wasteland.unknownCareer,
      'retry preserves owner unknown career fields');
    eq(savedOwner.profile.wasteland.weapons.levels['future-weapon'], 9,
      'retry preserves earned future owner weapon levels');
    eq(original, initialRegistry.players.find(player => player.id === ownerId).profile,
      'complete original owner input remains unchanged after both attempts');
    return {actualOther: loaded.players.find(player => player.id === otherId), expectedOther};
  } finally {
    Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: storage});
    app.dispose?.();
  }
}
for (const action of ['purchase', 'upgrade', 'equip']) {
  test('NATIVE APP RETRY CONTROL: ' + action + ' refusal, recovery and once-only owner mutation', () => {
    concurrentShopRetry(action);
  });
  test('NATIVE APP RETRY: ' + action + ' must preserve the complete concurrently advanced other player', () => {
    const {actualOther, expectedOther} = concurrentShopRetry(action);
    eq(actualOther, expectedOther,
      'successful ' + action + ' retry must preserve the full latest other-player profile after failed save');
  });
}
test('NATIVE APP RETRY: purchase preserves concurrent unknown future profile fields', () => {
  const {actualOther, expectedOther} = concurrentShopRetry('purchase');
  eq({root: actualOther.profile.externalProgress,
    career: actualOther.profile.wasteland.externalCareer,
    weapons: actualOther.profile.wasteland.weapons.externalWeapons,
    level: actualOther.profile.wasteland.weapons.levels['future-external-one']},
  {root: expectedOther.profile.externalProgress,
    career: expectedOther.profile.wasteland.externalCareer,
    weapons: expectedOther.profile.wasteland.weapons.externalWeapons,
    level: expectedOther.profile.wasteland.weapons.levels['future-external-one']},
  'successful purchase retry must retain concurrently saved unknown root/career/weapon progress and future level');
});
test('NATIVE APP RETRY: purchase preserves four concurrently earned future slots and ownership', () => {
  const {actualOther, expectedOther} = concurrentShopRetry('purchase');
  eq({loadout: actualOther.profile.wasteland.loadout,
    owned: actualOther.profile.wasteland.weapons.unlocked},
  {loadout: expectedOther.profile.wasteland.loadout,
    owned: expectedOther.profile.wasteland.weapons.unlocked},
  'successful purchase retry must retain all four concurrent future slots and their earned ownership');
});

// Unsafe durable registries are not proof that a stale shop registry is safe
// to save. These are real future-writer DATA and actual read-failure fixtures.
function unsafeOilRetry(kind) {
  const app = retryRegistryFixture('purchase'), storage = globalThis.localStorage;
  try {
    const ownerBefore = structuredClone(app.profile), rawBefore = values.get(PLAYERS_KEY);
    const initialWrites = writes.length;
    Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
      getItem: key => storage.getItem(key), removeItem: key => storage.removeItem(key),
      setItem: (key, value) => {
        if (key === PLAYERS_KEY) throw new Error('Test-only initial Oil purchase write failure');
        storage.setItem(key, value);
      },
    }});
    let first;
    try {first = app.purchaseArsenalWeapon('oil');}
    finally {Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: storage});}
    eq(first, {ok: false, reason: 'Could not save this purchase.'},
      'unsafe-registry fixture begins with a genuine refused Oil purchase');
    eq(app.profile, ownerBefore, 'first failed purchase restores full owner profile before unsafe retry');
    eq(values.get(PLAYERS_KEY), rawBefore, 'first failed purchase retains exact original durable raw bytes');
    eq(writes.length, initialWrites, 'first failed purchase commits no registry write');
    eq(app.profileSaved, false, 'unsafe-registry fixture genuinely enters unsaved App retry state');

    if (kind === 'future-other') {
      // A newer build can write a future schema that this build may only keep.
      // Raw memory storage models that external writer without normalizing it
      // through this older build, and never touches a real save or app.players.
      const newerRegistry = JSON.parse(rawBefore), other = newerRegistry.players.find(player => player.id !== app.player.id);
      other.profile.credits = 99999;
      other.profile.externalProgress = {kept: 'future-writer'};
      other.profile.wasteland = {...other.profile.wasteland, version: 8,
        futureSchema: {opaque: ['newer', {kept: true}]},
        loadout: ['future-weapon', 'future-v8-a', 'future-v8-b', 'future-v8-c']};
      values.set(PLAYERS_KEY, JSON.stringify(newerRegistry));
      const futureRaw = values.get(PLAYERS_KEY), attemptedInput = structuredClone(newerRegistry);
      eq(savePlayers(newerRegistry, storage), false,
        'genuine production savePlayers refuses another player career version eight');
      eq(values.get(PLAYERS_KEY), futureRaw, 'production future-schema refusal retains the complete exact external raw bytes');
      eq(writes.length, initialWrites, 'production future-schema refusal performs no memory storage write');
      eq(newerRegistry, attemptedInput, 'production future-schema guard never mutates the raw newer input');
      eq(loadPlayers(storage).players.find(player => player.id === other.id).profile.wasteland.version, 8,
        'actual load preserves the external future career rather than normalizing it to an old schema');
    } else {
      Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
        getItem: key => {if (key === PLAYERS_KEY) throw new Error('Test-only unreadable durable registry'); return storage.getItem(key);},
        setItem: (key, value) => storage.setItem(key, value), removeItem: key => storage.removeItem(key),
      }});
      assert.throws(() => globalThis.localStorage.getItem(PLAYERS_KEY), /unreadable durable registry/);
      checks++;
    }
    const unsafeRaw = values.get(PLAYERS_KEY), beforeRetryWrites = writes.length;
    const result = app.purchaseArsenalWeapon('oil');
    return {result, rawBefore: unsafeRaw, rawAfter: values.get(PLAYERS_KEY),
      writesBefore: beforeRetryWrites, writesAfter: writes.length,
      ownerBefore, ownerAfter: structuredClone(app.profile), saved: app.profileSaved};
  } finally {
    Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: storage});
    app.dispose?.();
  }
}
for (const kind of ['future-other', 'unreadable']) {
  test('NATIVE APP RETRY GUARD: ' + kind + ' must refuse Oil purchase retry', () => {
    const observed = unsafeOilRetry(kind);
    eq(observed.result, {ok: false, reason: 'Could not save this purchase.'},
      kind + ': actual Oil purchase retry must refuse an unsafe durable registry');
  });
  test('NATIVE APP RETRY GUARD: ' + kind + ' must preserve complete exact raw bytes without writing', () => {
    const observed = unsafeOilRetry(kind);
    eq({raw: observed.rawAfter, writes: observed.writesAfter},
      {raw: observed.rawBefore, writes: observed.writesBefore},
      kind + ': actual Oil purchase retry must not overwrite unsafe durable raw bytes or issue a registry write');
  });
  test('NATIVE APP RETRY GUARD: ' + kind + ' must preserve owner profile without charging or granting Oil', () => {
    const observed = unsafeOilRetry(kind);
    eq({profile: observed.ownerAfter, saved: observed.saved},
      {profile: observed.ownerBefore, saved: false},
      kind + ': actual Oil purchase retry must retain complete unsaved owner profile without scrap charge or unearned Oil');
  });
}


// Claude's 06:30 settlement fixes reach to the actual resultant horizontal
// launch vector. These are actual released-produced bolts and native Course
// distance witnesses; no projectile, geometry or target resolver is replaced.
import {velocity as nativeCarryVelocity} from '../src/combat-weapons.js';
const vectorModes = [
  {id: 'diagonal', speedMph: 40, angle: Math.PI / 4, push: 0},
  {id: 'reverse', speedMph: -40, angle: 0, push: 0},
  {id: 'sideways', speedMph: 0, angle: 0, push: 18},
];
const vectorReceipts = new Map();
after(() => console.log('VECTOR REACH measured native witnesses: ' + JSON.stringify([...vectorReceipts.values()])));
function vectorScene(mode) {
  const duel = race({enabled: false}); place(duel.state, 200);
  duel.state.opponents[1].finished = true;
  duel.state.combat.levels.crossbow = 3;
  duel.state.speedMph = mode.speedMph; duel.state.pushVelocity = mode.push;
  return {duel, origin: point(duel, duel.state)};
}
function resultantFor(duel, origin, target) {
  const length = measuredReach(origin, target), carry = nativeCarryVelocity(duel.state, origin);
  return {speed: Math.hypot(290 * (target.x - origin.x) / length + carry.x,
    290 * (target.z - origin.z) / length + carry.z),
    scalar: 290 + Math.hypot(carry.x, carry.z), carry};
}
function vectorBoundary(mode, inside) {
  const f = vectorScene(mode), {duel, origin} = f;
  let speed = 290 + Math.abs(mode.speedMph) * reachDrive.mphToWorld + Math.abs(mode.push);
  let target, result;
  for (let i = 0; i < 12; i++) {
    target = nativeAtRange(duel, duel.state.rival, origin, speed * 2.5 + (inside ? -.05 : .05));
    duel.state.headingError = Math.atan2(target.x - origin.x, target.z - origin.z) - origin.heading + mode.angle;
    result = resultantFor(duel, origin, target); speed = result.speed;
  }
  near(measuredReach(origin, target), result.speed * 2.5 + (inside ? -.05 : .05),
    'native actual chosen-bearing vector realizes the settled launch boundary');
  ok(result.scalar - result.speed > 1, 'actual native vector differs materially from a scalar sum');
  return {...f, target, result};
}
for (const mode of vectorModes) for (const inside of [true, false]) {
  test('VECTOR REACH launch ' + mode.id + ' ' + (inside ? 'inside' : 'outside'), async () => {
    const released = await releasedCrossbowConsumers(), f = vectorBoundary(mode, inside), old = vectorBoundary(mode, inside);
    eq(released.weapons.fireWeapon(old.duel, 'crossbow'), true, 'actual retained producer launches the chosen native target');
    const baseline = old.duel.state.combat.projectiles.at(-1), speed = Math.hypot(baseline.vx, baseline.vz);
    near(speed, f.result.speed, 'actual original launch vector independently verifies the resultant calculation');
    vectorReceipts.set(mode.id + '-launch', {mode: mode.id, producerVx: baseline.vx, producerVz: baseline.vz,
      launchSpeed: speed, scalarSpeed: f.result.scalar, reach: speed * 2.5,
      carry: f.result.carry, lifetime: 2.5});
    f.duel.featureFlags = flags(true);
    eq(fireWeapon(f.duel, 'crossbow'), true, 'actual active player consumer fires at the same native boundary');
    const shot = f.duel.state.combat.projectiles.at(-1);
    eq(shot.targetIndex, inside ? 0 : undefined,
      mode.id + ': launch must use actual vector magnitude, not CPU180 or scalar sum');
    if (inside) {
      near(Math.hypot(shot.vx, shot.vz), speed, 'selected actual bolt preserves its original native horizontal launch speed');
      eq(shot.targetId, 'cpu:0', 'actual within-vector-range launch keeps the selected real identity');
    } else ok(measuredReach(f.origin, f.target) < f.result.scalar * 2.5,
      'outside-vector witness would wrongly remain eligible under scalar-sum reach');
  });
}
async function nativeVectorFlight(mode, guideFirst = false) {
  const released = await releasedCrossbowConsumers(), f = vectorScene(mode), {duel, origin} = f;
  const target = nativeAtRange(duel, duel.state.rival, origin, 230);
  duel.state.headingError = Math.atan2(target.x - origin.x, target.z - origin.z) - origin.heading + mode.angle;
  eq(released.weapons.fireWeapon(duel, 'crossbow'), true, 'genuine retained producer supplies the actual locked vector bolt');
  const shot = duel.state.combat.projectiles.at(-1), launch = {vx: shot.vx, vz: shot.vz,
    speed: Math.hypot(shot.vx, shot.vz), level: shot.level};
  near(launch.speed, resultantFor(duel, origin, target).speed, 'real original producer uses full native car velocity vector');
  if (guideFirst) {
    nativeAtRange(duel, duel.state.rival, shot, 130, 3);
    stepProjectiles(duel, DT);
    ok(Math.hypot(shot.vx - launch.vx, shot.vz - launch.vz) > 1e-5,
      'actual native guidance changes the real bolt direction before testing immutable reach');
    near(Math.hypot(shot.vx, shot.vz), launch.speed, 'actual guidance preserves original resultant launch magnitude');
  }
  duel.state.rival.finished = true;
  for (let i = guideFirst ? 1 : 0; i < 15; i++) stepProjectiles(duel, DT);
  ok(duel.state.combat.projectiles.includes(shot), 'real vector bolt survives actual aging without a pose or age reset');
  near(shot.age, .125, 'native fixed steps supply actual remaining lifetime');
  duel.state.rival.finished = false; duel.featureFlags = flags(true);
  return {...f, shot, launch};
}
for (const mode of vectorModes) for (const inside of [true, false]) {
  test('VECTOR REACH flight ' + mode.id + ' ' + (inside ? 'inside' : 'outside'), async () => {
    const f = await nativeVectorFlight(mode), {duel, shot, launch} = f;
    const range = launch.speed * (2.5 - shot.age), target = nativeAtRange(duel, duel.state.rival, shot,
      range + (inside ? -.05 : .05), 3), before = {vx: shot.vx, vz: shot.vz};
    near(measuredReach(shot, target), range + (inside ? -.05 : .05), 'real current-origin flight witness meets native vector boundary');
    vectorReceipts.set(mode.id + '-flight', {mode: mode.id, launchSpeed: launch.speed,
      age: shot.age, remainingLife: 2.5 - shot.age, range, origin: {x: shot.x, z: shot.z}});
    stepProjectiles(duel, DT);
    eq(shot.targetIndex, inside ? 0 : null,
      mode.id + ': guidance must use immutable resultant launch speed times remaining lifetime at current origin');
    near(Math.hypot(shot.vx, shot.vz), launch.speed, 'native guidance never changes actual launched magnitude');
    if (!inside) eq({vx: shot.vx, vz: shot.vz}, before, 'outside-vector bolt does not re-aim');
  });
}
for (const mode of vectorModes) test('VECTOR REACH immutable guided launch ' + mode.id, async () => {
  const f = await nativeVectorFlight(mode, true), {duel, shot, launch} = f;
  const changedProfile = career(6), nextLevels = getProfileWeapons(changedProfile).levels;
  duel.state.weaponLevels = nextLevels; duel.state.combat.levels.crossbow = nextLevels.crossbow;
  duel.state.speedMph = 120; duel.state.headingError = -Math.PI / 2; duel.state.pushVelocity = -25;
  const range = launch.speed * (2.5 - shot.age);
  nativeAtRange(duel, duel.state.rival, shot, range - .05, 3);
  stepProjectiles(duel, DT);
  eq(shot.targetIndex, 0,
    mode.id + ': real guidance and changed actor/profile must never recompute original launch reach');
  eq(shot.level, launch.level, 'actual original projectile retains its launch level despite normalized current profile change');
  near(Math.hypot(shot.vx, shot.vz), launch.speed, 'guided bolt retains immutable original horizontal speed');
});


function vectorDecoyBoundary(inside) {
  const mode = vectorModes.find(mode => mode.id === 'sideways'), f = vectorScene(mode), {duel, origin} = f;
  const real = nativeAtRange(duel, duel.state.rival, origin, 100, -3);
  duel.state.headingError = Math.atan2(real.x - origin.x, real.z - origin.z) - origin.heading;
  const realResult = resultantFor(duel, origin, real);
  const data = decoyData(duel, duel.state.rival, {id: 'vector-chosen-decoy'});
  let speed = 290, target, result;
  for (let i = 0; i < 12; i++) {
    target = nativeAtRange(duel, data, origin, speed * 2.5 + (inside ? -.05 : .05), 3);
    result = resultantFor(duel, origin, target); speed = result.speed;
  }
  near(measuredReach(origin, target), result.speed * 2.5 + (inside ? -.05 : .05),
    'native chosen-decoy bearing has its own settled vector range boundary');
  ok(Math.abs(realResult.speed - result.speed) * 2.5 > .1,
    'actual real-target and chosen-decoy bearings yield distinguishable physical reach');
  return {...f, data, target, result, realResult};
}
for (const inside of [true, false]) test('VECTOR REACH chosen decoy lateral ' + (inside ? 'inside' : 'outside'), async () => {
  const released = await releasedCrossbowConsumers(), f = vectorDecoyBoundary(inside), old = vectorDecoyBoundary(inside);
  // The unchanged retained producer selects the same native candidate when it
  // is the only unfinished target. This separate scene measures actual launch
  // physics for that candidate; the active scene keeps the real owner live.
  old.duel.state.rival.finished = true;
  eq(released.weapons.fireWeapon(old.duel, 'crossbow'), true, 'actual retained producer launches at the native chosen decoy candidate');
  const baseline = old.duel.state.combat.projectiles.at(-1);
  eq(baseline.targetIndex, old.duel.state.opponents.indexOf(old.data), 'actual original candidate launch selects the native decoy identity');
  near(Math.hypot(baseline.vx, baseline.vz), f.result.speed, 'actual candidate launch speed belongs to the decoy bearing');
  vectorReceipts.set('chosen-decoy', {mode: 'sideways', realBearingSpeed: f.realResult.speed,
    chosenDecoySpeed: Math.hypot(baseline.vx, baseline.vz), chosenReach: f.result.speed * 2.5,
    producerVx: baseline.vx, producerVz: baseline.vz});
  f.duel.featureFlags = flags(true);
  eq(fireWeapon(f.duel, 'crossbow'), true, 'actual active launch keeps real owner and native decoy available');
  const shot = f.duel.state.combat.projectiles.at(-1);
  eq(shot.targetIndex, inside ? f.duel.state.opponents.indexOf(f.data) : 0,
    'chosen decoy range must use its actual launch vector, never the previously considered real bearing');
  if (inside) near(Math.hypot(shot.vx, shot.vz), f.result.speed, 'actual selected decoy bolt uses its own immutable launch speed');
});

// Claude approved candidate-specific launch reach on 1 October. The resolver
// must judge each genuine car or decoy using its own prospective launch vector.
for (const inside of [true, false]) test('CANDIDATE REACH real and decoy ' + (inside ? 'inside' : 'outside'), () => {
  const f = vectorDecoyBoundary(inside), {duel, origin, data} = f;
  const numericRange = f.realResult.speed * 2.5;
  ok(measuredReach(origin, f.target) < numericRange,
    'native decoy lies inside the real-car scalar reach in this witness');
  eq(targetFor(duel, duel.state, {origin, range: numericRange}), data,
    'numeric callers keep the existing range and qualifying decoy behavior');
  const before = structuredClone(duel.state);
  const selected = targetFor(duel, duel.state, {origin, range: numericRange,
    rangeForTarget: actor => resultantFor(duel, origin, point(duel, actor)).speed * 2.5});
  eq(selected, inside ? data : duel.state.rival,
    'each candidate is accepted only within its own resultant horizontal launch reach');
  eq(duel.state, before, 'candidate reach selection leaves actual race state unchanged');
});

test('CANDIDATE REACH real target can leave physical reach despite an unlimited scalar context', () => {
  const f = vectorBoundary(vectorModes[0], false), {duel, origin} = f;
  eq(targetFor(duel, duel.state, {origin, range: Infinity,
    rangeForTarget: actor => resultantFor(duel, origin, point(duel, actor)).speed * 2.5}), null,
  'the optional candidate reach excludes the actual real car outside its vector boundary');
});

test('CANDIDATE REACH does not change numeric CPU acquisition or smoke eligibility', () => {
  const duel = race(), cpu = duel.state.rival, real = duel.state;
  place(cpu, 200);
  const origin = point(duel, cpu);
  nativeAtRange(duel, real, origin, T.cpu.attackRange - .05);
  eq(targetFor(duel, cpu, {origin, range: T.cpu.attackRange}), real,
    'the unchanged numeric CPU range still admits the native just-inside target');
  nativeAtRange(duel, real, origin, T.cpu.attackRange + .05);
  eq(targetFor(duel, cpu, {origin, range: T.cpu.attackRange}), null,
    'the unchanged numeric CPU range still rejects the native just-outside target');
  nativeAtRange(duel, real, origin, 40);
  smoke(duel, origin);
  eq(targetFor(duel, cpu, {origin, range: 1, rangeForTarget: () => 50}), null,
    'candidate reach never bypasses smoke at the actual attack origin');
  clearHazards(duel);
  eq(targetFor(duel, cpu, {origin, range: 1, rangeForTarget: () => 50}), real,
    'the optional candidate reach supplies this attack range while retaining genuine eligibility');
});
