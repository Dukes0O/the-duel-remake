import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Duel} from '../src/game.js';
import {createFeatureFlags, FEATURE_STATES} from '../src/feature-flags.js';
import {damageRaider, stepRaiders} from '../src/raiders.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {selectFootGear, stepFootWeapons} from '../src/onfoot-weapons.js';
import {stepFighter} from '../src/onfoot.js';
import {sweepObstacle} from '../src/collision.js';
import {arenaReward, settleArenaResult} from '../src/arena/arena-settlement.js';
import {App} from '../src/app.js';
import {canLeaveCar, initializeFootTransition, stepFootTransition} from '../src/onfoot-transition.js';
import {stepCombatAI} from '../src/combat-ai.js';
import {createAmbushAlleyView} from '../src/arena/modes/ambush-alley-view.js';
import {CREW} from '../src/crew.js';
import {stepProjectiles} from '../src/combat-projectiles.js';

// ARENA-05: native acceptance. Kyle's 4 October answer replaces the
// Scrapdome ring fixture with the Pit; Salt Flats remains supported.
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (actual, message) => { checks++; assert.ok(actual, message); };
const near = (actual, expected, message) => ok(Math.abs(actual - expected) < 1e-6,
  `${message}: expected ${expected}, got ${actual}`);
const DT = 1 / 120, WAVE_COUNTS = [3, 4, 5, 6, 8];
test('reused fort view follows native cover poses without writing simulation and disposes once', () => {
  const f = fight(), before = structuredClone(f.state), removed = [];
  const view = createAmbushAlleyView(object => removed.push(object));
  view.update(f.state);
  equal(view.group.visible, true, 'native fort has a real salvage view');
  equal(view.group.userData.coverCount, alley(f).fort.cover.length, 'every solid cover has a salvage body');
  const shells = view.group.children[0].children;
  for (const [index, shell] of shells.entries()) {
    const cover = alley(f).fort.cover[index];
    near(shell.position.x, cover.x, 'cover x follows physical pose');
    near(shell.position.z, cover.z, 'cover z follows physical pose');
    near(shell.position.y, cover.y + .025, 'released salvage grounding is exact');
    near(shell.rotation.y, cover.heading, 'cover heading follows physical pose');
  }
  view.update(f.state);
  equal(f.state, before, 'fort rendering leaves all native state unchanged');
  view.update({...f.state, status: 'menu'});
  equal(view.group.visible, false, 'fort is hidden outside gameplay');
  view.dispose(); view.dispose();
  equal(removed.length, 1, 'the reusable salvage assembly is released once');
  equal(view.group.children.length, 0, 'no retired cover remains attached');
});
test.after(() => console.log(`Ambush Alley: ${checks} acceptance checks executed.`));

test('Ambush eligibility preserves released foot controls and denies other arenas', () => {
  const duel = new Duel({seed: 305});
  duel.startCampaign({mode: 'wasteland', discoveredGate: true, car: 'falcone_f42'});
  Object.assign(duel.state, {mode: 'wasteland', status: 'racing',
    wastelandGateDiscovered: true, combat: {}, paused: false, objective: null});
  const stage = duel.stageDef;
  for (const [mode, allowed] of [['fuel-run', true], ['ambush-alley', true],
    ['last-car-rolling', false], ['bounty-hunt', false], ['warlord', false]]) {
    duel.state.arena = {mode};
    equal(canLeaveCar(duel), allowed, `foot eligibility for ${mode} uses the native arena rule`);
  }
  duel.state.arena = null;
  equal(canLeaveCar(duel), !stage?.practice && !stage?.stuntTrial &&
    !['chase', 'drift', 'checkpoint'].includes(stage?.kind), 'ordinary foot admission is unchanged');
  duel.state.arena = {mode: 'ambush-alley'};
  for (const field of ['paused', 'objective']) {
    duel.state[field] = true;
    equal(canLeaveCar(duel), false, `${field} still forbids exit`);
    duel.state[field] = false;
  }
  duel.state.wastelandGateDiscovered = false;
  equal(canLeaveCar(duel), false, 'undiscovered careers cannot leave the car');
});

test('Ambush settlement validates full and partial pay without changing its input', () => {
  const profile = {credits: 77, future: {kept: true}, wasteland: {version: 1,
    discoveredGate: true, scrap: 10, settledResults: [], territories: {
      kettle: {hold: 12, future: 'kept'}, tollkeeper: {hold: 9}}}};
  for (const venueId of ['pit', 'salt-flats']) {
    for (const [completedWaves, health, winnerId, reason, total, hold] of [
      [5, 100, 'player', 'waves-survived', 540, 25],
      [2, 0, 'raiders', 'fort-fell', 144, 10],
      [0, 0, 'raiders', 'fort-fell', 0, 0],
    ]) {
      const arena = {version: 1, mode: 'ambush-alley', venueId, phase: 'over',
        participants: [{id: 'player', kind: 'player'}, {id: 'cpu-1', kind: 'cpu'}],
        ambushAlley: {completedWaves, fort: {health}},
        result: {winnerId, reason, placings: winnerId === 'player' ?
          ['player', 'cpu-1'] : ['raiders', 'player', 'cpu-1']}};
      const payload = {arena, runId: `pure-${venueId}-${completedWaves}`,
        ownerPlayerId: 'driver', activePlayerId: 'driver', cpuDifficulty: 'medium'};
      const before = structuredClone(profile);
      const paid = settleArenaResult(profile, payload);
      equal(paid.awarded, true, 'completed Ambush facts settle');
      equal(paid.scrapEarned, total, 'only completed waves and a full-win bonus pay');
      equal(paid.holdAdded, hold, 'each completed wave adds five hold');
      equal(profile, before, 'input save and unknown fields stay unchanged');
      equal(paid.profile.credits, 77, 'race credits stay unchanged');
      equal(paid.profile.wasteland.territories.tollkeeper.hold, 9, 'other territory stays unchanged');
      equal(settleArenaResult(paid.profile, payload).awarded, false, 'journal blocks a second payment');
      equal(settleArenaResult(profile, {...payload, activePlayerId: 'other'}).awarded, false,
        'another owner cannot settle');
      for (const bad of [NaN, -1, 6, 1.5]) {
        const invalid = {...arena, ambushAlley: {...arena.ambushAlley, completedWaves: bad}};
        equal(arenaReward(invalid, 'medium').total, 0, 'invalid completed-wave facts never pay');
      }
      const forged = {...arena, result: {...arena.result, winnerId: 'cpu-1'}};
      equal(settleArenaResult(profile, {...payload, arena: forged}).awarded, false,
        'an inconsistent winner cannot settle');
    }
  }
});

for (const venueId of ['pit', 'salt-flats']) test(`native Ambush Alley entry admits ${venueId}`, () => {
  const duel = new Duel({seed: 305, featureFlags: createFeatureFlags({storage: null,
    qa: true, overrides: {scrapdome: true, 'salt-flats': true, 'crew-gear': true, 'ambush-alley': true}})});
  duel.state.wastelandGateDiscovered = true;
  equal(duel.startArenaEvent({venueId, mode: 'ambush-alley', car: 'falcone_f42',
    crewId: 'rook', arsenalRank: 30, cpuDifficulty: 'medium', opponents: []}), true,
    `${venueId}: native arena entry must admit the registered on-foot Ambush Alley event`);
  equal(duel.state.arena.mode, 'ambush-alley', 'native entry retains Ambush Alley');
  equal(duel.state.arena.venueId, venueId, 'entry retains the requested supported venue');
  equal(duel.course.def.id, venueId, 'the actual arena course matches the selected venue');
});

function enter({venueId = 'pit', enabled = true, discovered = true, seed = 305,
  difficulty = 'medium', crewId = 'rook'} = {}) {
  const duel = new Duel({seed, featureFlags: createFeatureFlags({storage: null, qa: true,
    overrides: {'salt-flats': true, 'crew-gear': true, 'ambush-alley': enabled}})});
  duel.state.wastelandGateDiscovered = discovered;
  const before = structuredClone(duel.state);
  const started = duel.startArenaEvent({venueId, mode: 'ambush-alley', car: 'falcone_f42',
    crewId, arsenalRank: 30, cpuDifficulty: difficulty, opponents: []});
  return {duel, state: duel.state, started, before};
}
function fight(options) {
  const f = enter(options);
  equal(f.started, true, 'the native Ambush Alley mode must admit its supported fight');
  f.state.countdown = 0; f.duel.step(DT); f.duel.step(DT);
  equal(f.state.onFoot, true, 'native entry puts the selected crew on foot');
  ok(f.state.fighter && f.state.raids, 'native entry supplies real fighters and the existing raider roster');
  ok(f.state.arena.ambushAlley?.fort, 'the native event owns the fort and wave state');
  return f;
}
const alley = f => f.state.arena.ambushAlley;
const raiders = f => f.state.raids.zones.flatMap(zone => zone.raiders);
const buggy = f => f.state.opponents.find(actor => actor.arenaRole === 'ambush-buggy' && !actor.finished);
function advance(f, seconds) {
  for (let n = 0; n < Math.round(seconds / DT); n++) f.duel.step(DT);
}
function downRaiders(f) {
  for (const member of raiders(f).filter(member => !member.knockedDown))
    equal(damageRaider(f.duel, member, member.health, {source: 'onFoot', owner: 'player'}), true,
      'native raider damage knocks down a real wave fighter');
}
function wreckBuggy(f) {
  const actor = buggy(f); if (!actor) return;
  for (const participant of f.state.arena.participants) participant.protectedSec = 0;
  actor.combatShield = 0;
  for (let hit = 0; hit < 4 && !actor.combatWrecking; hit++)
    applyArmorDamage(f.duel, actor, 'fixed', {amount: actor.maxArmor + 1, owner: 'player'});
  equal(actor.combatWrecking, true, 'native armor damage wrecks the actual wave buggy');
}
function finishWave(f) {
  const before = alley(f).completedWaves;
  downRaiders(f); wreckBuggy(f); advance(f, DT);
  equal(alley(f).completedWaves, before + 1, 'a fully defeated native wave counts once');
}
function reachWave(f, wanted) {
  while (alley(f).wave < wanted && f.state.status === 'racing') {
    finishWave(f); advance(f, 10 + 2 * DT);
  }
  equal(alley(f).wave, wanted, 'native ten-second gaps advance to the requested wave');
}
function win(options) {
  const f = fight(options);
  for (let wave = 1; wave <= 5; wave++) {
    reachWave(f, wave); finishWave(f);
    if (wave < 5) advance(f, 10 + 2 * DT);
  }
  equal(f.state.status, 'arena_result', 'surviving all five native waves finishes the event');
  equal(f.state.arena.result.winnerId, 'player', 'the native survivor wins');
  return f;
}
function moveRaider(f, member, point) {
  const nearest = f.duel.course.nearest(point.x, point.z, member.s);
  Object.assign(member, {x: point.x, y: point.y || 0, z: point.z,
    s: nearest.s, lateral: nearest.lateral, groundY: point.y || 0});
}
function settlement(f, scrap, hold) {
  const profile = {version: 2, credits: 77, future: {kept: true}, wasteland: {version: 1,
    discoveredGate: true, scrap: 10, settledResults: [], territories: {
      kettle: {hold: 12, future: 'kept'}, tollkeeper: {hold: 9}}}};
  const before = structuredClone(profile), payload = {runId: `ambush-${f.state.arena.venueId}-${hold}`,
    ownerPlayerId: 'ambush-driver', activePlayerId: 'ambush-driver', cpuDifficulty: f.state.cpuDifficulty,
    arena: f.state.arena};
  const result = settleArenaResult(profile, payload);
  equal(result.awarded, true, 'the actual completed event passes native settlement');
  equal(result.scrapEarned, scrap, 'scrap pays only completed native waves and the full-win bonus');
  equal(result.holdAdded, hold, 'each completed wave contributes five hold');
  equal(result.profile.wasteland.territories.kettle.hold, 12 + hold,
    'hold goes to the existing Last Car Rolling venue territory');
  equal(result.profile.wasteland.territories.tollkeeper.hold, 9, 'another territory stays unchanged');
  equal(profile, before, 'native settlement preserves its input and unknown fields');
  equal(result.profile.credits, 77, 'a failed or won fort costs no racing credits');
  equal(settleArenaResult(result.profile, payload).awarded, false, 'the same event never pays twice');
  equal(settleArenaResult(profile, {...payload, activePlayerId: 'other-driver'}).awarded, false,
    'a different named player cannot collect the result');
}

test('Ambush Alley has a separate dev gate', () => {
  equal(FEATURE_STATES['ambush-alley'], 'dev', 'unfinished Ambush Alley has an independent dev switch');
  const released = createFeatureFlags({qa: false, storage: {getItem: () => 'true'},
    search: '?flags=ambush-alley'});
  equal(released.enabled('ambush-alley'), false, 'ordinary released settings cannot activate the mode');
});

test('flag-off entry leaves native state unchanged and invalid careers or venues are rejected', () => {
  const off = enter({enabled: false});
  equal(off.started, false, 'the disabled mode cannot admit a fight');
  equal(off.state, off.before, 'a disabled request cannot partially initialize fort, actors or foot state');
  equal(enter({discovered: false}).started, false, 'an undiscovered career cannot admit a fight');
  equal(enter({venueId: 'scrapdome'}).started, false, 'the superseded Scrapdome venue is rejected');
});

test('native Ambush entry starts a healthy fort, parked car, RPG, wrench and selected signature gear', () => {
  const f = fight();
  equal(alley(f).fort.health, 300, 'the fort starts with 300 health');
  equal(alley(f).fort.maxHealth, 300, 'fort repair cannot exceed 300 health');
  equal(alley(f).wave, 1, 'native progression begins at wave one');
  equal(alley(f).completedWaves, 0, 'entry invents no survived waves');
  equal(f.state.speedMph, 0, 'the player car is parked as cover and a refill point');
  equal(f.state.fighter.crewId, 'rook', 'the selected crew is the real fighter');
  equal(selectFootGear(f.duel, 1), true, 'the actual RPG remains selectable');
  equal(selectFootGear(f.duel, 2), true, 'the actual wrench remains selectable');
  ok(f.state.crewGear, 'the existing selected crew gear is initialized');
});

for (let wave = 1; wave <= 5; wave++) test(`native wave ${wave} has ${WAVE_COUNTS[wave - 1]} fighters and the settled buggy field`, () => {
  const f = fight(); reachWave(f, wave);
  equal(raiders(f).filter(member => !member.knockedDown).length, WAVE_COUNTS[wave - 1],
    'the actual current wave has its settled fighter count');
  equal(f.state.opponents.filter(actor => actor.arenaRole === 'ambush-buggy' && !actor.combatWrecking && !actor.finished).length,
    wave >= 4 ? 1 : 0, 'only waves four and five add one real buggy');
});

test('all fighters down is insufficient while the real buggy lives; neither returns in that wave', () => {
  const f = fight(); reachWave(f, 4);
  const members = [...raiders(f)], actor = buggy(f), completed = alley(f).completedWaves;
  downRaiders(f); advance(f, 4);
  equal(alley(f).completedWaves, completed, 'a living buggy prevents wave completion');
  equal(alley(f).wave, 4, 'the event remains in the fourth wave');
  ok(members.every(member => member.knockedDown), 'downed raiders never respawn inside their wave');
  ok(actor && !actor.combatWrecking, 'the required buggy is still alive');
  wreckBuggy(f); advance(f, DT);
  equal(alley(f).completedWaves, 4, 'wrecking the final required enemy completes the wave once');
  advance(f, 4);
  ok(actor.combatWrecking || actor.finished || !f.state.opponents.includes(actor),
    'the same wrecked buggy never respawns during its wave or gap');
});

test('wrecking the buggy alone cannot finish a wave with living raiders', () => {
  const f = fight(); reachWave(f, 4); wreckBuggy(f); advance(f, 4);
  equal(alley(f).completedWaves, 3, 'living fighters still prevent completion after a buggy wreck');
  ok(raiders(f).some(member => !member.knockedDown), 'real living raiders remain in the wave');
});

test('the real buggy weapon hold blocks normal CPU firing with Arsenal off and on', () => {
  for (const arsenal of [false, true]) {
    const f = fight(); reachWave(f, 4);
    f.duel.featureFlags = createFeatureFlags({storage: null, qa: true,
      overrides: {'ambush-alley': true, 'crew-gear': true, arsenal}});
    const actor = buggy(f), participant = f.state.arena.participants.find(p => p.id === actor.arenaId);
    actor.s = actor.prevS = f.state.s + 30;
    actor.lateral = actor.prevLateral = f.state.lateral;
    actor.headingError = 0; actor.impactTimer = 0;
    actor.weaponLoadout = ['crossbow', 'bomb'];
    participant.targetId = 'player';
    const shots = [];
    f.duel.onChange((_state, event) => {if (event.weaponFired && event.actor === actor) shots.push(event.weaponFired);});
    const decide = () => {f.state.combat.aiTimer = 0; stepCombatAI(f.duel, DT);};
    for (let n = 0; n < 20; n++) decide();
    equal(shots.length, 0, `the native permanent hold prevents every attack with Arsenal ${arsenal}`);
    actor.weaponsDisabledUntil = 0;
    for (let n = 0; n < 20; n++) decide();
    ok(shots.length > 0, 'removing only the hold allows the same actual CPU fire path');
  }
});

test('the native wave buggy drives into solid fort cover and deals ram damage', () => {
  const f = fight(); reachWave(f, 4);
  downRaiders(f);
  for (const zone of f.state.raids.zones) zone.nextShotAt = Infinity;
  const hits = [];
  f.duel.onChange((_state, event) => {if (event.ambushFortHit?.source === 'ram') hits.push(event.ambushFortHit);});
  const actor = buggy(f), fort = alley(f).fort, before = fort.health;
  for (let n = 0; n < Math.round(30 / DT) && !hits.length && f.state.status === 'racing'; n++) f.duel.step(DT);
  const at = f.duel.course.groundAt(actor.s, actor.lateral);
  ok(hits.length > 0, 'the actual native rammer reaches and contacts fort collision cover: ' +
    JSON.stringify({at, speed: actor.speedMph, headingError: actor.headingError,
      wrecked: actor.combatWrecking, health: fort.health, status: f.state.status}));
  equal(hits[0].owner, actor.arenaId, 'the fort impact belongs to the real buggy participant');
  ok(fort.health < before, 'real ram contact removes fort health');
});

test('ten-second gaps hold the next wave until the native deadline', () => {
  const f = fight(); finishWave(f); advance(f, 9.8);
  equal(alley(f).wave, 1, 'the next wave cannot appear early');
  equal(alley(f).completedWaves, 1, 'the gap never credits a second completed wave');
  advance(f, .3);
  equal(alley(f).wave, 2, 'the next native wave appears after the ten-second gap');
});

test('each live raider within ten metres drains five fort health per second; outsiders do not', () => {
  for (const distance of [10.1, 9.9]) {
    const f = fight(), fort = alley(f).fort;
    for (const zone of f.state.raids.zones) zone.nextShotAt = Infinity;
    const cover = fort.cover[0], radius = Math.hypot(cover.x - fort.x, cover.z - fort.z);
    for (const member of raiders(f)) moveRaider(f, member, {...cover,
      x: cover.x + (cover.x - fort.x) / radius * distance,
      z: cover.z + (cover.z - fort.z) / radius * distance});
    const before = fort.health; advance(f, DT);
    near(before - fort.health, distance < 10 ? 3 * 5 * DT : 0,
      'the real first wave applies per-fighter fort wear at the distance boundary');
  }
});

test('a live raider near outside fort cover wears it down beyond ten metres from the centre', () => {
  const f = fight(), fort = alley(f).fort, member = raiders(f)[0], cover = fort.cover[0];
  for (const other of raiders(f).slice(1)) damageRaider(f.duel, other, other.health);
  for (const zone of f.state.raids.zones) zone.nextShotAt = Infinity;
  const length = Math.hypot(cover.x - fort.x, cover.z - fort.z);
  moveRaider(f, member, {...cover, x: cover.x + (cover.x - fort.x) / length * 8,
    z: cover.z + (cover.z - fort.z) / length * 8});
  ok(Math.hypot(member.x - fort.x, member.z - fort.z) > 10, 'the witness is beyond centre wear range');
  const before = fort.health; advance(f, DT);
  near(before - fort.health, 5 * DT, 'one actual raider near physical cover drains five health per second');
});

test('native raider RPG production and flight can damage the fort from outside wear range', () => {
  const f = fight(), fort = alley(f).fort, member = raiders(f)[0];
  for (const other of raiders(f).slice(1)) damageRaider(f.duel, other, other.health);
  moveRaider(f, member, {...fort, x: fort.x + 65});
  const hits = [];
  f.duel.onChange((_state, event) => {if (event.ambushFortHit?.source === 'rpg') hits.push(event.ambushFortHit);});
  let shot = null;
  for (let n = 0; n < Math.round(20 / DT) && f.state.status === 'racing' && !shot; n++) {
    f.duel.step(DT); shot = f.state.combat.projectiles.find(projectile => projectile.kind === 'rpg' && projectile.enemy);
  }
  ok(shot, 'a real live raider produces an enemy RPG, not a fixture projectile');
  ok(Math.hypot(member.x - fort.x, member.z - fort.z) > 10,
    'the native rocket producer is still outside passive fort-wear range');
  const before = fort.health;
  for (let n = 0; n < Math.round(4 / DT) && f.state.status === 'racing' && !hits.length; n++) f.duel.step(DT);
  ok(fort.health < before, 'the native hostile rocket flight damages the fort');
  ok(hits.length > 0, 'the fort emits an actual RPG impact rather than only passive wear');
  ok(Math.hypot(member.x - fort.x, member.z - fort.z) > 10,
    'the recorded damage is from the rocket rather than close-range fort wear');
});

test('the real wrench repairs forty fort health over four seconds without repairing a full car', () => {
  const f = fight(), fort = alley(f).fort;
  for (const zone of f.state.raids.zones) zone.nextShotAt = Infinity;
  for (const member of raiders(f)) moveRaider(f, member, {...fort, x: fort.x + 9});
  advance(f, 3); downRaiders(f); advance(f, DT);
  ok(fort.health <= 260, 'real enemy wear provides enough fort damage to repair');
  const fighter = f.state.fighter, cover = fort.cover[0];
  const span = Math.hypot(cover.x - fort.x, cover.z - fort.z) || 1;
  const at = {...cover, x: cover.x - (cover.x - fort.x) / span * .5,
    z: cover.z - (cover.z - fort.z) / span * .5};
  const nearest = f.duel.course.nearest(at.x, at.z, fighter.s);
  Object.assign(fighter, {x: at.x, y: at.y || 0, z: at.z, s: nearest.s,
    lateral: nearest.lateral, groundY: at.y || 0, airHeight: 0, verticalSpeed: 0});
  equal(selectFootGear(f.duel, 2), true, 'native gear selection chooses the wrench');
  f.state.fighterInput = {fire: true};
  const before = fort.health, armor = f.state.armor;
  for (let n = 0; n < Math.round((4 - DT) / DT); n++) {
    f.state.stageTimeSec += DT; stepFootWeapons(f.duel, DT);
  }
  near(fort.health - before, 40 - 10 * DT, 'repair accumulates at ten fort health per second');
  f.state.stageTimeSec += DT; stepFootWeapons(f.duel, DT);
  near(fort.health - before, 40, 'the full native wrench action restores forty at four seconds');
  equal(f.state.armor, armor, 'fort repair does not alter the parked full-health car');
});

for (const venueId of ['pit', 'salt-flats']) test(`${venueId}: native fort placement and attackers follow the settled geometry`, () => {
  const f = enter({venueId});
  equal(f.started, true, 'native entry initializes the actual fort and spawn positions before motion');
  const fort = alley(f).fort, car = f.duel.course.groundAt(f.state.s, f.state.lateral);
  ok(Array.isArray(fort.cover) && fort.cover.length > 0, 'the fort has actual scrap collision cover');
  if (venueId === 'pit') {
    for (const cover of fort.cover)
      near(Math.hypot(cover.x, cover.z) - f.duel.course.def.pit.pileRadius, 8,
        'the Pit cover ring is eight metres outside the actual centre pile');
    ok(Math.hypot(car.x, car.z) < f.duel.course.def.pit.pileRadius + 8,
      'the parked player car is inside the fort cover ring');
    const pile = f.duel.course.features.obstacles.find(obstacle => obstacle.id === 'pit-centre-pile');
    ok(pile, 'the actual solid Pit pile remains present');
    equal(sweepObstacle(car, car, pile, car.heading + (f.state.headingError || 0), f.duel._vehicleSpec(f.state)), null,
      'the parked player body clears the actual solid pile inside the cover ring');
  } else {
    const nearest = f.duel.course.nearest(fort.x, fort.z);
    const samples = f.duel.course.samples.slice(0, -1), count = samples.length;
    const gap = sample => Math.abs(f.duel.course.phase(sample.s - nearest.s + f.duel.course.length / 2) - f.duel.course.length / 2);
    const index = samples.reduce((best, sample, at) => gap(sample) < gap(samples[best]) ? at : best, 0);
    ok(Math.abs(samples[index].curvature) <= Math.abs(samples[(index + count - 1) % count].curvature) &&
      Math.abs(samples[index].curvature) <= Math.abs(samples[(index + 1) % count].curvature),
    'the Salt fort is at the native low-curvature run midpoint, not on a bend');
    ok(Math.abs(nearest.lateral) < f.duel.course.def.scrapdome.floorHalfWidth,
      'the Salt fort stands on the real drivable band');
    ok(fort.cover.some(cover => f.duel.course.nearest(cover.x, cover.z).lateral < nearest.lateral) &&
      fort.cover.some(cover => f.duel.course.nearest(cover.x, cover.z).lateral > nearest.lateral),
    'Salt cover spans both sides of the fort across the band');
  }
  const attackers = raiders(f);
  for (const member of attackers) ok(Math.hypot(member.x - fort.x, member.z - fort.z) >= 60,
    'native attackers spawn at least sixty metres from the fort before any movement');
  ok(attackers.some((a, index) => attackers.slice(index + 1).some(b => {
    const ax = a.x - fort.x, az = a.z - fort.z, bx = b.x - fort.x, bz = b.z - fort.z;
    return Math.abs(ax * bz - az * bx) > 1e-6 || ax * bx + az * bz < 0;
  })),
  'the initial attackers approach from at least two separated directions');
});

test('a real fighter can walk beyond the car tether inside Salt walls but cannot cross the wall', () => {
  const f = fight({venueId: 'salt-flats'}), course = f.duel.course, fighter = f.state.fighter;
  const car = course.groundAt(f.state.s, f.state.lateral);
  const candidates = course.samples.map(sample => ({...course.groundAt(sample.s, 0), s: sample.s, lateral: 0}));
  const far = candidates.find(at => Math.hypot(at.x - car.x, at.z - car.z) > 160 &&
    !course.obstaclesNear(at.s - 2, at.s + 2).some(obstacle => sweepObstacle(at, at, obstacle, 0,
      {halfWidth: .34, halfLength: .34, height: 1.7})));
  ok(far, 'the actual Salt band supplies a clear point beyond the old 150 m tether');
  Object.assign(fighter, far, {groundY: far.y, airHeight: 0, verticalSpeed: 0, yaw: far.heading});
  const before = {x: fighter.x, z: fighter.z};
  stepFighter(course, f.state, fighter, {forward: true}, DT);
  ok(Math.hypot(fighter.x - before.x, fighter.z - before.z) > .03,
    'native foot movement remains free beyond the old car tether');
  const limit = course.def.scrapdome.wallOffset - .34, edge = course.groundAt(far.s, limit - .1);
  Object.assign(fighter, edge, {s: far.s, lateral: limit - .1, groundY: edge.y, yaw: edge.heading});
  for (let n = 0; n < 240; n++) stepFighter(course, f.state, fighter, {left: true}, DT);
  ok(course.nearest(fighter.x, fighter.z, far.s).lateral <= limit + 1e-6,
    'the real arena wall still contains the fighter');
});

test('the actual yard admits rank twelve but not rank eleven', () => {
  const previousStorage = globalThis.localStorage, previousCancel = globalThis.cancelAnimationFrame;
  const values = new Map();
  globalThis.localStorage = {getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key)};
  globalThis.cancelAnimationFrame = () => {};
  try {
    for (const [rank, expected] of [[11, false], [12, true]]) {
      values.clear(); const app = new App();
      try {
        app.duel.featureFlags = createFeatureFlags({storage: null, qa: true,
          overrides: {'ambush-alley': true, 'crew-gear': true}});
        app.audio.unlock = () => {};
        let xp = 0; for (let level = 1; level < rank; level++) xp += 400 + 150 * (level - 1);
        app.profile = {...app.profile, wasteland: {...app.profile.wasteland, discoveredGate: true, xp}};
        ok(app._saveProfile(), 'the fixture profile uses memory-only storage');
        ok(app.visitWasteland(), 'the native App enters the discovered yard'); app.advance(8);
        equal(app.startArenaEvent({venueId: 'pit', mode: 'ambush-alley', opponents: 0}), expected,
          `the real yard applies the rank-${rank} Ambush admission rule`);
      } finally {app.dispose?.();}
    }
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage;
    if (previousCancel === undefined) delete globalThis.cancelAnimationFrame; else globalThis.cancelAnimationFrame = previousCancel;
  }
});

for (const [difficulty, factor] of [['easy', 1], ['medium', 1.2], ['hard', 1.4]])
  test(`${difficulty}: surviving five real waves pays the full bonus and five hold per wave once`, () => {
    const f = win({difficulty});
    equal(arenaReward(f.state.arena, difficulty).total, Math.round(450 * factor),
      'native five-wave pay is sixty per wave plus one hundred fifty');
    settlement(f, Math.round(450 * factor), 25);
  });

test('a native fort loss pays and grows hold only for waves already completed', () => {
  const f = fight(); reachWave(f, 3);
  const fort = alley(f).fort;
  for (const member of raiders(f)) moveRaider(f, member, {...fort, x: fort.x + 1});
  for (let n = 0; n < Math.round(60 / DT) && f.state.status === 'racing'; n++) f.duel.step(DT);
  equal(f.state.status, 'arena_result', 'real enemy fort damage ends the event with a loss');
  equal(alley(f).completedWaves, 2, 'the fallen third wave cannot earn survival credit');
  ok(f.state.arena.result.winnerId !== 'player', 'a fallen fort is never a player win');
  settlement(f, 144, 10);
});

test('the same seed and native input script repeat at 30, 60 and 144 frames per second', () => {
  function run(fps) {
    const f = fight({venueId: 'salt-flats'}); let remainder = 0;
    for (let frame = 0; frame < fps * 2; frame++) {
      remainder += 1 / fps;
      while (remainder + 1e-10 >= DT) {f.duel.step(DT); remainder = Math.max(0, remainder - DT);}
    }
    return {arena: structuredClone(f.state.arena), raids: structuredClone(f.state.raids),
      fighter: structuredClone(f.state.fighter), projectiles: structuredClone(f.state.combat.projectiles)};
  }
  const base = run(30); equal(run(60), base, 'the same seed/input gives the same native result at sixty FPS');
  equal(run(144), base, 'the same seed/input gives the same native result at 144 FPS');
});

test('actual raider movement retains elapsed time at native 30, 60 and 144 FPS deltas', () => {
  function run(fps) {
    const f = fight(), member = raiders(f)[0], start = {x: member.x, z: member.z};
    for (const zone of f.state.raids.zones) zone.nextShotAt = Infinity;
    for (let frame = 0; frame < fps; frame++) stepRaiders(f.duel, 1 / fps);
    return {x: member.x, z: member.z, moved: Math.hypot(member.x - start.x, member.z - start.z)};
  }
  const base = run(30);
  near(base.moved, 4.5, 'one native second advances at the existing fighter walking rate');
  for (const fps of [60, 144]) {
    const at = run(fps);
    near(at.x, base.x, `${fps} FPS reaches the same native x without pre-converting dt`);
    near(at.z, base.z, `${fps} FPS reaches the same native z without pre-converting dt`);
    near(at.moved, base.moved, `${fps} FPS retains the full movement time`);
  }
});

test('the nine-metre attack stop is decided on each native fixed tick at every frame rate', () => {
  function run(fps) {
    const f = fight(), member = raiders(f)[0];
    moveRaider(f, member, {x: 0, y: 0, z: 9.1});
    for (const zone of f.state.raids.zones) zone.nextShotAt = Infinity;
    for (let frame = 0; frame < fps; frame++) stepRaiders(f.duel, 1 / fps);
    const stopped = {x: member.x, z: member.z};
    near(member.fighterStepRemainder, 0, 'stopped fixed ticks consume all elapsed time');
    moveRaider(f, member, {x: 0, y: 0, z: 15}); stepRaiders(f.duel, DT);
    near(15 - member.z, 4.5 * DT, 'a later shove cannot release a banked movement burst');
    return stopped;
  }
  const base = run(30);
  for (const fps of [60, 144]) {
    const at = run(fps);
    near(at.x, base.x, `${fps} FPS preserves the native stop x`);
    near(at.z, base.z, `${fps} FPS preserves the native stop z`);
  }
});

test('every initial Ambush fighter has the same crew stats as their normal native exit', () => {
  for (const crewId of Object.keys(CREW)) {
    const f = fight({crewId}), initial = {health: f.state.fighter.health,
      maximum: f.state.fighter.maxHealth, sprint: f.state.fighter.sprintMultiplier || 1};
    initializeFootTransition(f.duel); f.state.input.interact = true;
    for (let n = 0; n < 50; n++) stepFootTransition(f.duel, DT);
    equal(f.state.onFoot, true, `${crewId} exits through the real normal transition`);
    equal(initial, {health: f.state.fighter.health, maximum: f.state.fighter.maxHealth,
      sprint: f.state.fighter.sprintMultiplier || 1},
      `${crewId} initial admission preserves their existing crew stats`);
  }
});

test('real enemy raid RPG hits never credit the player; real player RPG hits still do', () => {
  for (const enemy of [true, false]) {
    const f = fight(); reachWave(f, 4);
    const actor = buggy(f), member = raiders(f)[0], events = [];
    f.duel.onChange((_state, event) => {if (event.combatHit) events.push(event);});
    for (const other of raiders(f).slice(enemy ? 1 : 0)) damageRaider(f.duel, other, other.health);
    for (const zone of f.state.raids.zones) zone.nextShotAt = Infinity;
    f.state.combat.projectiles.length = 0;
    let shot;
    if (enemy) {
      moveRaider(f, member, {...alley(f).fort, x: 0, z: 65});
      const zone = f.state.raids.zones.find(z => z.raiders.includes(member));
      zone.nextShotAt = 0; stepRaiders(f.duel, 0);
      shot = f.state.combat.projectiles.find(p => p.kind === 'rpg' && p.enemy);
    } else {
      const fighter = f.state.fighter;
      fighter.pitch = 0; f.state.footWeapons.selected = 'rpg';
      f.duel.setFighterInput({fire: true}); stepFootWeapons(f.duel, DT);
      f.duel.setFighterInput({fire: false});
      shot = f.state.combat.projectiles.find(p => p.kind === 'rpg' && !p.enemy);
    }
    ok(shot, 'the native producer creates the actual RPG for this owner');
    const speed = Math.hypot(shot.vx, shot.vz), x = shot.x + shot.vx / speed * 24,
      z = shot.z + shot.vz / speed * 24, at = f.duel.course.nearest(x, z);
    Object.assign(actor, {s: at.s, prevS: at.s, lateral: at.lateral, prevLateral: at.lateral,
      airHeight: 0, prevAirHeight: 0, armor: actor.maxArmor, combatShield: 0});
    f.state.combat.rivalShield = 0;
    for (const participant of f.state.arena.participants) participant.protectedSec = 0;
    const before = f.state.combat.hits;
    for (let n = 0; n < 120 && !events.length; n++) stepProjectiles(f.duel, DT);
    ok(events.length > 0, 'the actual RPG crosses the real wave buggy body');
    equal(events[0].enemy, enemy, 'the native hit event retains its actual owner');
    equal(f.state.combat.hits - before, enemy ? 0 : 1, 'only the actual player earns a direct hit');
  }
});
