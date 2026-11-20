// WEAPON-WATER-CANNON: the water cannon's stream (docs/board/cards/WEAPON-WATER-CANNON.md, docs/ARSENAL.md sections 1, 2, 4).
// Proved without driving, in real races: the stream shoves the first car in it along the water, a little each moment and never
// more than its cap; it never damages; it puts out a burning car and ends a flamethrower burst by the flame's own rules; its
// counters work (steer out of the line, a star shield stops the shove). The car cannon is the player's only, behind its switch,
// offered in the Armory once the town has a finished Fire Station, and never in a computer loadout. On the fire truck, H sprays
// the same stream from the truck's one tank: in a fire call the tank is the call's, and outside one it is the truck's own.
import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';
import {createFeatureFlags, FEATURE_STATES} from '../src/feature-flags.js';
import {createProfile} from '../src/progression.js';
import {fireWeapon, point} from '../src/combat-weapons.js';
import {stepCombat} from '../src/combat.js';
import {createCombatScene} from '../src/combat-scene.js';
import {startFlamethrower, FLAME_RULES} from '../src/arsenal/flamethrower.js';
import {carEffect, carAlongPush, setCarEffect} from '../src/arsenal/car-effects.js';
import {targetIdentity} from '../src/arsenal/targeting.js';
import {WATER_RULES, WATER_CUES, waterStreamReach, waterStreamStart} from '../src/arsenal/water-cannon.js';
import {ARSENAL_WEAPONS, ARSENAL_WEAPON_COST, cpuArsenalLoadout, implementedArsenalWeapons, normalizeWeapons,
  offeredArsenalWeapons, purchaseArsenalWeapon, purchaseWeaponUpgrade, getProfileWeapons} from '../src/weapon-upgrades.js';
import {availableCarWeapons, equipCarWeapon} from '../src/car-loadout.js';
import {WEAPONS} from '../src/wasteland-tuning.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {makeRng} from '../src/rng.js';

const DT = 1 / 120;
const flagsFor = (water = true) => createFeatureFlags({storage: null, qa: true,
  catalog: {...FEATURE_STATES, arsenal: 'dev', 'water-cannon': 'dev'},
  overrides: {arsenal: true, 'water-cannon': water}});

// A Mad Max Duel on a straight with the rival parked `gap` metres ahead and `side` metres across, both stopped.
function race({gap = 9, side = 0, water = true, seed = 202611} = {}) {
  const duel = new Duel({seed, featureFlags: flagsFor(water)});
  duel.startCampaign({mode: 'wasteland', car: 'falcone_f42', driverId: 'club', crewId: 'rook', discoveredGate: true,
    arsenalRank: 30, opponentCount: 1, seed, cpuDifficulty: 'easy', weaponLoadout: ['water', 'crossbow', 'star', 'bomb']});
  const state = duel.state, rival = state.opponents[0];
  Object.assign(state, {status: 'racing', countdown: 0, invulnerableSec: 0, s: 500, prevS: 500, lateral: 0, prevLateral: 0,
    speedMph: 0, headingError: 0, traffic: []});
  Object.assign(rival, {s: 500 + gap, prevS: 500 + gap, lateral: side, prevLateral: side, speedMph: 0, headingError: 0,
    armor: 100, maxArmor: 100, combatShield: 0});
  state.combat.aiTimer = state.combat.pickupTimer = Infinity;
  rival.weaponsDisabledUntil = Infinity;
  const events = [];
  duel.onChange((_state, event) => events.push(event));
  return {duel, state, rival, events};
}
// Steps the combat only (no driving), so the shove is read straight from the push it leaves: nothing else pushes a car here.
function spray(duel, seconds) {
  for (let i = 0; i < Math.round(seconds / DT); i++) stepCombat(duel, DT);
}
function drive(duel, seconds) {
  for (let i = 0; i < Math.round(seconds / DT); i++) duel.step(DT);
}
// The rival's push as a world vector, split into along the stream (from the player's nose) and across it.
function shove(duel, rival) {
  const road = point(duel, rival).heading, lateral = rival.pushVelocity || 0, along = carAlongPush(rival);
  const x = Math.cos(road) * lateral + Math.sin(road) * along, z = -Math.sin(road) * lateral + Math.cos(road) * along;
  const at = point(duel, duel.state), heading = at.heading + (duel.state.headingError || 0);
  return {along: x * Math.sin(heading) + z * Math.cos(heading), across: x * Math.cos(heading) - z * Math.sin(heading)};
}
// The same race twice, driven, once spraying and once not: how much further down the stream the rival ends up.
function sprayedAgainstDry(options, seconds = WATER_RULES.duration + .5) {
  const dry = race(options), wet = race(options);
  const at = point(wet.duel, wet.state), heading = at.heading;
  fireWeapon(wet.duel, 'water');
  drive(dry.duel, seconds); drive(wet.duel, seconds);
  const a = point(dry.duel, dry.rival), b = point(wet.duel, wet.rival);
  return (b.x - a.x) * Math.sin(heading) + (b.z - a.z) * Math.cos(heading);
}
const damageEvents = events => events.filter(event => event.combatHit || event.armorRemoved > 0 || event.combatDamage);

test('the stream is a straight, narrow line from the nose, 14 m long', () => {
  const start = waterStreamStart({x: 0, y: 0, z: 0}, 0);
  assert.equal(start.z, WATER_RULES.noseMetres);
  assert.equal(waterStreamReach(start, {x: 0, z: start.z + 10}), 10, 'a car straight ahead is in the water');
  assert.equal(waterStreamReach(start, {x: 0, z: start.z + WATER_RULES.range + 2}), null, 'beyond the stream it is dry');
  assert.equal(waterStreamReach(start, {x: 2.5, z: start.z + 6}), null, 'a lane to the side is dry');
  assert.ok(waterStreamReach(start, {x: 1.4, z: start.z + 6}) !== null, 'a car whose side is in the water is hit');
  const turned = waterStreamStart({x: 0, y: 0, z: 0}, Math.PI / 2);
  assert.ok(waterStreamReach(turned, {x: 10, z: 0}) !== null && waterStreamReach(turned, {x: 0, z: 10}) === null,
    'the stream points where the nose points');
});

test('the car cannon shoves the car in front along the water, and never damages it', () => {
  const {duel, state, rival, events} = race();
  const armor = rival.armor, playerArmor = state.armor;
  assert.equal(fireWeapon(duel, 'water'), true, 'the water cannon fires from its slot');
  assert.ok(events.some(event => event.arsenalCue === WATER_CUES.spray), 'the stream opens with its cue');
  assert.equal(fireWeapon(duel, 'water'), false, 'one burst at a time: it is recharging');
  spray(duel, .5);
  const push = shove(duel, rival);
  assert.ok(push.along > 3 && Math.abs(push.across) < 1e-6, `the shove is along the stream, away from the cannon: ${JSON.stringify(push)}`);
  spray(duel, WATER_RULES.duration);
  assert.equal(state.combat.waterStreams.length, 0, 'the burst ends after its two seconds');
  assert.equal(rival.armor, armor, 'no armor is taken');
  assert.equal(state.armor, playerArmor);
  assert.deepEqual(damageEvents(events), [], 'and no hit is reported');
  assert.ok(state.combat.cooldowns.water > 0 && state.combat.cooldowns.water <= WEAPONS.water.cooldown);
  const further = sprayedAgainstDry({});
  assert.ok(further > .5, `driven, the rival ends up further down the stream than without the water: ${further.toFixed(2)} m`);
});

test('the shove builds while the car stays in the water, and one stream never gives more than its cap', () => {
  const {duel, state, rival} = race({gap: 6});
  fireWeapon(duel, 'water');
  const stream = state.combat.waterStreams[0];
  spray(duel, .25);
  const early = Object.values(stream.pushed)[0];
  assert.ok(Math.abs(early - WATER_RULES.pushPerSecond * .25) < .05, `about 7 m/s a second: ${early}`);
  spray(duel, 1.7);
  const total = Object.values(stream.pushed)[0];
  assert.ok(total <= WATER_RULES.pushLimit + 1e-9 && total > WATER_RULES.pushLimit - .01, `capped at 4 m/s: ${total}`);
  assert.equal(carEffect(rival, 'slick'), null, 'no grip is taken: the car keeps its steering');
  assert.equal(carEffect(rival, 'disabled'), null);
});

test('the stream is drawn from the nose to the car it lands on, and the drawing changes nothing in the race', () => {
  const {duel, state} = race();
  const view = createCombatScene(undefined, {loadFighterAsset: () => Promise.reject(Error('no fighter asset here'))});
  try {
    fireWeapon(duel, 'water');
    spray(duel, .2);
    const before = JSON.stringify(state.combat.waterStreams);
    view.update(duel);
    const drawn = view.group.getObjectByName('arsenal-water-0');
    assert.ok(drawn?.visible, 'the stream is drawn');
    assert.equal(JSON.stringify(state.combat.waterStreams), before, 'drawing reads only');
    spray(duel, WATER_RULES.duration);
    view.update(duel);
    assert.equal(drawn.visible, false, 'and is gone when the burst ends');
  } finally { view.dispose(); }
});

test('the counters: out of the line of water, or behind a star shield, there is no shove', () => {
  const sprayed = (options, before = () => {}) => {
    const sim = race(options);
    before(sim);
    assert.equal(fireWeapon(sim.duel, 'water'), true);
    spray(sim.duel, WATER_RULES.duration);
    return shove(sim.duel, sim.rival);
  };
  const dry = push => Math.abs(push.along) + Math.abs(push.across) === 0;
  assert.ok(dry(sprayed({side: 3})), 'a car a lane to the side is not touched');
  assert.ok(dry(sprayed({gap: 20})), 'nor is a car beyond the stream');
  assert.ok(dry(sprayed({}, sim => { sim.state.combat.rivalShield = 5; sim.rival.combatShield = 5; })), 'a star shield stops the shove');
});

test('water puts out a burning car and ends a flamethrower burst, by the flame rules', () => {
  const {duel, state, rival, events} = race({gap: 6});
  // The rival has been set alight: the flame's lingering burn and its burning effect, as stepFlamethrowers leaves them.
  const rivalId = targetIdentity(duel, rival);
  state.combat.flameBurns = {[rivalId]: {remainingSec: FLAME_RULES.burnDuration, ownerId: 'player'}};
  setCarEffect(rival, 'burning', {duration: FLAME_RULES.burnDuration});
  fireWeapon(duel, 'water');
  spray(duel, DT * 2);
  assert.equal(state.combat.flameBurns[rivalId], undefined, 'the burn is gone');
  assert.equal(carEffect(rival, 'burning'), null, 'and the car stops burning');
  assert.ok(events.some(event => event.arsenalCue === WATER_CUES.douse && event.waterDoused === rivalId), 'the hiss is heard');

  // A rival spraying fire at the player: water on it ends its burst at once, with the flame's own end cue.
  const fight = race({gap: 6});
  fight.rival.headingError = Math.PI;
  const burst = startFlamethrower(fight.duel, fight.rival);
  assert.ok(burst, 'the rival opens its flamethrower');
  fireWeapon(fight.duel, 'water');
  spray(fight.duel, .1);
  assert.equal(fight.state.combat.flameBursts.length, 0, 'the water ends the flame');
  assert.ok(fight.events.some(event => event.arsenalCue === 'weapon.flame.end' && event.burst === burst));
  assert.ok(burst.doused === true);
});

test('the car cannon is town gear: behind its switch, the player only, never in a computer loadout', () => {
  const off = race({water: false});
  assert.equal(fireWeapon(off.duel, 'water'), false, 'the switch off: the slot does nothing');
  assert.ok(!off.state.weaponLoadout.includes('water'), 'and a saved water slot is not carried into the race');
  const on = race();
  assert.equal(on.state.weaponLoadout[0], 'water', 'the switch on: the slot is kept');
  assert.equal(fireWeapon(on.duel, 'water', true, on.rival), false, 'a computer car cannot fire it');
  assert.ok(!implementedArsenalWeapons().includes('water'), 'not implemented for anyone unless its switch is on');
  assert.ok(!implementedArsenalWeapons({arsenalWave3Enabled: true}).includes('water'));
  assert.ok(implementedArsenalWeapons({waterCannonEnabled: true}).includes('water'));
  for (let seed = 0; seed < 200; seed++) for (const difficulty of ['easy', 'medium', 'hard']) {
    const loadout = cpuArsenalLoadout(30, difficulty, {arsenalWave3Enabled: true, rng: makeRng(seed)});
    assert.ok(!loadout.includes('water'), `seed ${seed} ${difficulty}`);
  }
  // Every computer loadout is what it was before this card: the same draws from the same generator.
  const expected = cpuArsenalLoadout(30, 'hard', {arsenalWave3Enabled: true, rng: makeRng(5),
    implemented: Object.keys(ARSENAL_WEAPONS).filter(id => id !== 'water')});
  assert.deepEqual(cpuArsenalLoadout(30, 'hard', {arsenalWave3Enabled: true, rng: makeRng(5)}), expected);
});

// A career that has found the gate, at rank 1, with scrap to spend.
function career({scrap = 1000} = {}) {
  const profile = createProfile();
  return {...profile, wasteland: {...profile.wasteland, version: 1, discoveredGate: true, xp: 0, scrap}};
}
const armory = (extra = {}) => ({wastelandEnabled: true, arsenalEnabled: true, waterCannonEnabled: true, ...extra});

test('the Armory offers the water cannon once the town has a finished Fire Station, at any rank', () => {
  const profile = career();
  assert.ok(!offeredArsenalWeapons(profile, armory()).includes('water'), 'no Fire Station: not offered');
  assert.ok(!offeredArsenalWeapons(profile, armory({townBuildings: ['soup-kitchen']})).includes('water'));
  assert.ok(offeredArsenalWeapons(profile, armory({townBuildings: ['fire-station']})).includes('water'), 'a Fire Station: offered');
  assert.ok(!offeredArsenalWeapons(profile, armory({waterCannonEnabled: false, townBuildings: ['fire-station']})).includes('water'),
    'the switch off: not offered');
  const refused = purchaseArsenalWeapon(profile, 'water', armory());
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'Build a Fire Station in your town to buy this.');
  const bought = purchaseArsenalWeapon(profile, 'water', armory({townBuildings: ['fire-station']}));
  assert.equal(bought.ok, true);
  assert.equal(bought.profile.wasteland.scrap, 1000 - ARSENAL_WEAPON_COST);
  assert.ok(getProfileWeapons(bought.profile).unlocked.includes('water'));
  assert.ok(availableCarWeapons(bought.profile, armory()).includes('water'), 'owned, it can be fitted');
  const fitted = equipCarWeapon(bought.profile, 0, 'water', armory());
  assert.equal(fitted.ok, true);
  assert.equal(fitted.loadout[0], 'water');
  assert.ok(!availableCarWeapons(bought.profile, armory({waterCannonEnabled: false})).includes('water'),
    'with the switch off an owned cannon is kept in the save but not offered for a slot');
  const upgraded = purchaseWeaponUpgrade(bought.profile, 'water', armory());
  assert.equal(upgraded.ok, true, 'it upgrades like any arsenal weapon (recharge only)');
  assert.equal(getProfileWeapons(upgraded.profile).levels.water, 1);
  // Normalizing never grants it: a level alone, or a town, gives no ownership.
  assert.ok(!normalizeWeapons({levels: {water: 2}}).unlocked.includes('water'));
  assert.ok(!getProfileWeapons(career()).unlocked.includes('water'));
});

test('the stream has its two named sound cues, from the fire call recordings', () => {
  for (const id of Object.values(WATER_CUES)) assert.ok(SOUND_BANK[id], id);
  assert.deepEqual(SOUND_BANK[WATER_CUES.spray].files, SOUND_BANK['town.spray'].files, 'the same pour as the truck');
  assert.deepEqual(SOUND_BANK[WATER_CUES.douse].files, SOUND_BANK['town.fire.out'].files, 'the same hiss as a fire put out');
});

// The fire truck in a free drive through a town, with one other car on the ground.
import {createTown} from '../src/town/town-state.js';
import {createTownWorld} from '../src/town/town-world.js';
import {setScablandsTownLayout, clearScablandsTownLayout} from '../src/world/scablands-ground.js';
import {cleanupWorldJobLoan, setJobVehicleSpray} from '../src/arena/modes/world-job.js';
import {truckStreamToDraw} from '../src/town/view/work-vehicle-view.js';
import {stepDouse} from '../src/world/jobs/steps/douse.js';

function truck({gap = 8, side = 0} = {}) {
  const layout = createTownWorld(createTown(1405, 'Water test town'));
  const duel = new Duel({seed: 1989, featureFlags: {'wasteland-town': true}});
  duel.state.wastelandGateDiscovered = true;
  setScablandsTownLayout(layout);
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', opponents: [{car: 'falcone_f42'}],
    job: {id: 'town-drive', kind: 'town-drive', steps: [], seed: 1989, layout, vehicle: 'fire-truck'}}), true);
  while (duel.state.status === 'countdown') duel.step(DT);
  const state = duel.state, other = state.opponents[0];
  const at = duel.course.worldAt(state.s, state.lateral), heading = duel.course.at(state.s).heading + state.headingError;
  const across = heading + Math.PI / 2;
  const pose = duel.course.nearest(at.x + Math.sin(heading) * (gap + WATER_RULES.noseMetres) + Math.sin(across) * side,
    at.z + Math.cos(heading) * (gap + WATER_RULES.noseMetres) + Math.cos(across) * side);
  Object.assign(other, {s: pose.s, prevS: pose.s, lateral: pose.lateral, prevLateral: pose.lateral, speedMph: 0,
    headingError: 0, weaponsDisabledUntil: Infinity});
  const events = [];
  duel.onChange((_state, event) => events.push(event));
  return {duel, state, other, events, finish: () => { cleanupWorldJobLoan(duel); clearScablandsTownLayout(); }};
}
function hold(duel, seconds) {
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    duel.setInput({throttle: 0, brake: 1, steer: 0, boost: false});
    setJobVehicleSpray(duel, true);
    duel.step(DT);
  }
}

test('on the fire truck, H sprays the same stream at a car in front, from the truck\'s own tank, with no damage', () => {
  const sim = truck();
  try {
    const worldJob = sim.state.arena.worldJob, armor = sim.other.armor, tankL = worldJob.vehicle.tankL;
    assert.equal(worldJob.vehicle.id, 'fire-truck');
    // A third of a second: the other car is a computer car and soon drives off.
    hold(sim.duel, 1 / 3);
    const stream = worldJob.truckStream;
    assert.ok(stream?.hitId, 'the stream is on the car');
    assert.ok(Math.abs(Object.values(stream.pushed)[0] - WATER_RULES.pushPerSecond / 3) < .05,
      `the car is shoved as by the car cannon: ${JSON.stringify(stream.pushed)}`);
    assert.equal(sim.other.armor, armor, 'and not damaged');
    assert.ok(Math.abs(tankL - worldJob.vehicle.tankL - 1000 / 60 / 3) < .2,
      `the truck's tank pays at the pump's rate: ${tankL} to ${worldJob.vehicle.tankL}`);
    assert.ok(sim.events.some(event => event.arenaTell?.cue === 'town.spray'), 'with the truck\'s spray sound');
    const drawn = truckStreamToDraw(sim.state), car = point(sim.duel, sim.other);
    assert.ok(drawn && Math.hypot(drawn.x - car.x, drawn.z - car.z) < 3, 'the stream is drawn landing on the car');
  } finally { sim.finish(); }
  const empty = truck({side: 6});
  try {
    const worldJob = empty.state.arena.worldJob, tankL = worldJob.vehicle.tankL;
    hold(empty.duel, 1);
    assert.equal(worldJob.vehicle.tankL, tankL, 'nothing in front: holding H wastes no water');
    assert.equal(truckStreamToDraw(empty.state), null, 'and no stream is drawn');
  } finally { empty.finish(); }
});

test('in a fire call, water on a car comes from the call\'s one tank', () => {
  const step = {mainId: 'kitchen', tank: {capacityL: 3000, startL: 3000, pumpLpm: 1000}, water: [], wind: {x: 1, z: 0, factor: 0},
    buildings: [{id: 'kitchen', name: 'the soup kitchen', x: 200, z: 200, halfX: 8, halfZ: 4, areaM2: 64, fuelHours: 24, heat: .3}]};
  const far = {player: {position: {x: 0, z: 0}}, speedKmh: 0, difficulty: 'medium', onFoot: false, heading: 0};
  const dry = stepDouse(step, {}, {...far, controls: {spray: true}}, 1).state;
  assert.equal(dry.tankL, 3000, 'H with nothing in front uses no water');
  const wet = stepDouse(step, {}, {...far, controls: {spray: true}, waterOnCar: true}, 1).state;
  assert.ok(Math.abs(wet.tankL - (3000 - 1000 / 60)) < 1e-9, `the stream on a car empties the same tank: ${wet.tankL}`);
  assert.equal(wet.targetId, null, 'and no building is being sprayed');
});

import {createArmoryScreen} from '../src/screen-armory.js';
import {finishedTownBuildings, readOwnTownBuildings} from '../src/town/town-gear.js';
import {createTownStore} from '../src/town/town-store.js';

test('the Armory reads the Fire Station from the player\'s own town, finished, and never from a site or another town', async () => {
  const town = createTown(77, 'Gear town');
  town.mayors = ['kyle'];
  town.buildings = [{id: 'b1', buildingId: 'fire-station', state: 'site'}, {id: 'b2', buildingId: 'soup-kitchen', state: 'finished'}];
  assert.deepEqual(finishedTownBuildings(town), ['soup-kitchen'], 'a Fire Station still being built does not count');
  town.buildings[0].state = 'finished';
  assert.deepEqual(finishedTownBuildings(town).sort(), ['fire-station', 'soup-kitchen']);
  const memory = {towns: new Map([['town-kyle-1', {id: 'town-kyle-1', town}],
    ['town-other-2', {id: 'town-other-2', town: {...town, mayors: ['gratian'], buildings: []}}]]), copies: new Map()};
  const store = createTownStore({memoryOnly: true, memory});
  assert.deepEqual((await readOwnTownBuildings({playerId: 'kyle', store, pointers: ['town-kyle-1', 'town-other-2']})).sort(),
    ['fire-station', 'soup-kitchen']);
  assert.deepEqual(await readOwnTownBuildings({playerId: 'gratian', store, pointers: ['town-kyle-1', 'town-other-2']}), [],
    'each player\'s own town only');
  assert.deepEqual(await readOwnTownBuildings({playerId: 'kyle', store, pointers: []}), []);
});

test('the Armory screen offers and explains the water cannon in plain sentences', () => {
  const profile = career();
  const screen = gear => createArmoryScreen({profile: () => profile, credits: value => String(value),
    escapeHTML: value => String(value), getGarageMessage: () => '', kitsEnabled: () => true, arsenalEnabled: () => true,
    loadoutsEnabled: () => true, action: () => '', featureFlags: {enabled: id => id === 'gear-find'}, townGear: () => gear});
  const offered = screen({waterCannonEnabled: true, townBuildings: ['fire-station']}).yardContent();
  assert.match(offered, /WATER CANNON/);
  assert.match(offered, /Your town's Fire Station can fit it\. It sprays the car ahead aside and puts out flames\. It never does damage\./);
  assert.match(offered, /data-arsenal-purchase="water"/);
  assert.doesNotMatch(screen({waterCannonEnabled: true, townBuildings: []}).yardContent(), /WATER CANNON/, 'no Fire Station, no offer');
  assert.doesNotMatch(screen({waterCannonEnabled: false, townBuildings: ['fire-station']}).yardContent(), /WATER CANNON/,
    'switch off, no offer');
  assert.doesNotMatch(screen({}).yardContent(), /WATER CANNON/, 'an Armory that is told nothing about the town shows nothing new');
});
