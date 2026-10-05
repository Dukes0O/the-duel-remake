import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {startRocketVolley, ROCKET_RULES} from '../src/arsenal/rockets.js';
import {stepProjectiles} from '../src/combat-projectiles.js';
import {stepFootTransition} from '../src/onfoot-transition.js';
import {point, fireWeapon} from '../src/combat-weapons.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {stepCpuCrew} from '../src/crew-gear/cpu-crews.js';
import {sweepObstacle} from '../src/collision.js';
import {FIGHTER_RULES} from '../src/onfoot.js';
import {COMBAT_TUNING} from '../src/wasteland-tuning.js';

const DT = 1 / 120;
let checks = 0;
const equal = (a, b, message) => {checks++; assert.deepEqual(a, b, message);};
const ok = (value, message) => {checks++; assert.ok(value, message);};
const near = (a, b, message) => ok(Math.abs(a - b) < 1e-5, `${message}: expected ${b}, received ${a}`);
test.after(() => console.log(`Rocket fighter contacts: ${checks} checks executed.`));

function place(actor, s, lateral = 0) {
  Object.assign(actor, {s, prevS: s, lateral, prevLateral: lateral,
    speedMph: 0, headingError: 0, airHeight: 0, prevAirHeight: 0,
    impactTimer: 0, combatShield: 0});
}
function fixture({race = false} = {}) {
  const duel = new Duel({seed: 1989, featureFlags: createFeatureFlags({storage: null,
    qa: true, overrides: {'crew-gear': true, 'cpu-crews': true}})});
  if (race) duel.startCampaign({mode: 'wasteland', car: 'falcone_f42', crewId: 'nell',
    seed: 1989, startStage: 0, opponentCount: 2, cpuDifficulty: 'medium', discoveredGate: true});
  else {
    duel.state.wastelandGateDiscovered = true;
    equal(duel.startArenaEvent({mode: 'fuel-run', car: 'falcone_f42', crewId: 'nell',
      opponents: [{car: 'dusthawk_rally'}, {car: 'aurora_gt'}]}), true, 'the real arena admits the fighter fixture');
  }
  const state = duel.state;
  Object.assign(state, {status: 'racing', countdown: 0, traffic: [], invulnerableSec: 0});
  state.combat.shield = state.combat.rivalShield = 0;
  state.combat.aiTimer = state.combat.pickupTimer = Infinity;
  for (const p of state.arena?.participants || []) p.protectedSec = 0;
  place(state, 100, 0);
  state.opponents.forEach((actor, index) => place(actor, 100, index ? 20 : -20));
  const events = [];
  duel.onChange((_state, event) => events.push(event));
  return {duel, state, events};
}
function exit(f) {
  f.duel.setInput({interact: true});
  for (let i = 0; i < 48; i++) stepFootTransition(f.duel, DT);
  f.duel.setInput({interact: false});
  equal(f.state.onFoot, true, 'the actual hold-to-exit path creates the player fighter');
  return f.state.fighter;
}
function aimAndLaunch(f, owner, target) {
  const at = point(f.duel, owner);
  owner.headingError = Math.atan2(target.x - at.x, target.z - at.z) - at.heading -
    ROCKET_RULES.bearings[0] * Math.PI / 180;
  const volley = startRocketVolley(f.duel, owner);
  ok(volley, 'the actual car Rocket Pods producer admits a volley');
  const shot = f.state.combat.projectiles.find(p => p.id === volley.shotIds[0]);
  ok(shot && f.events.some(e => e.projectile === shot && e.arsenalCue === 'weapon.rockets.fire'),
    'the tested projectile was emitted by the real native producer');
  return shot;
}
function resolve(f, shot) {
  for (let i = 0; i < 190 && !shot.dead; i++) stepProjectiles(f.duel, DT);
  ok(shot.dead, 'the real native projectile resolves within its bounded flight');
  return f.events.find(e => e.arsenalCue === 'weapon.rockets.hit' && e.projectile === shot)?.hitPosition;
}
function launchAtFighter(f, owner, fighter, raider = false) {
  const radius = raider ? COMBAT_TUNING.raider.hitRadius : FIGHTER_RULES.radius;
  const height = raider ? COMBAT_TUNING.raider.hitHeight * 2 : FIGHTER_RULES.height;
  const body = {x: fighter.x, y: fighter.y, z: fighter.z,
    halfX: radius, halfZ: radius, height, shape: 'box'};
  let clear = false;
  for (const [dx, dz] of [[12, 0], [-12, 0], [0, 12], [0, -12]]) {
    const nearest = f.duel.course.nearest(fighter.x + dx, fighter.z + dz);
    place(owner, nearest.s, nearest.lateral);
    const at = point(f.duel, owner), distance = Math.hypot(fighter.x - at.x, fighter.z - at.z);
    const ux = (fighter.x - at.x) / distance, uz = (fighter.z - at.z) / distance;
    const from = {x: at.x + ux * COMBAT_TUNING.projectileSpawnOffset, y: at.y,
      z: at.z + uz * COMBAT_TUNING.projectileSpawnOffset};
    const to = {x: fighter.x + ux, y: at.y, z: fighter.z + uz};
    const hit = sweepObstacle(from, to, body, 0, {halfWidth: .08, halfLength: .08, height: .16});
    if (!hit) continue;
    const a = f.duel.course.nearest(from.x, from.z), b = f.duel.course.nearest(to.x, to.z, a.s);
    const obstacles = [...f.duel._obstacles(Math.min(a.s, b.s) - 3, Math.max(a.s, b.s) + 3)];
    for (const actor of [f.state, ...f.state.opponents]) if (actor !== owner) {
      const ground = f.duel.course.groundAt(actor.s, actor.lateral), spec = f.duel._vehicleSpec(actor);
      obstacles.push({...ground, halfX: spec.halfWidth, halfZ: spec.halfLength,
        height: spec.height, shape: 'box'});
    }
    clear = !obstacles.some(obstacle => {
      const earlier = sweepObstacle(from, to, obstacle, 0, {halfWidth: .08, halfLength: .08, height: .16});
      return earlier && earlier.t < hit.t;
    });
    if (clear) break;
  }
  ok(clear, 'a bounded native ground pose provides a real fighter ray before any car or scenery');
  return aimAndLaunch(f, owner, fighter);
}
function placePlayerOnRay(f, fighter, shot) {
  const speed = Math.hypot(shot.vx, shot.vz);
  const x = shot.x + shot.vx / speed * 6, z = shot.z + shot.vz / speed * 6;
  const nearest = f.duel.course.nearest(x, z), ground = f.duel.course.groundAt(nearest.s, nearest.lateral);
  Object.assign(fighter, {x, y: ground.y, z, groundY: ground.y, s: nearest.s, lateral: nearest.lateral});
  const body = {x, y: ground.y, z, halfX: FIGHTER_RULES.radius,
    halfZ: FIGHTER_RULES.radius, height: FIGHTER_RULES.height, shape: 'box'};
  ok(sweepObstacle(shot, {x: shot.x + shot.vx, y: shot.y + shot.vy, z: shot.z + shot.vz},
    body, 0, {halfWidth: .08, halfLength: .08, height: .16}), 'the grounded player fighter really crosses the native launch ray');
}
function splashFixture(fraction) {
  const f = fixture(), fighter = exit(f), owner = f.state.opponents[0], car = f.state.opponents[1];
  place(f.state, 230, 0);
  // This car supplies the real blast; the fighter starts beside its impact plane.
  const shot = aimAndLaunch(f, owner, point(f.duel, car));
  const ground = f.duel.course.groundAt(car.s, car.lateral), spec = f.duel._vehicleSpec(car);
  const from = {x: shot.x, y: shot.y, z: shot.z};
  const to = {x: shot.x + shot.vx, y: shot.y + shot.vy, z: shot.z + shot.vz};
  const contact = sweepObstacle(from, to, {...ground, y: ground.y,
    halfX: spec.halfWidth, halfZ: spec.halfLength, height: spec.height, shape: 'box'},
  0, {halfWidth: .08, halfLength: .08, height: .16});
  ok(contact, 'the actual car body lies in the unmodified native rocket ray');
  const impact = {x: from.x + (to.x - from.x) * contact.t, y: from.y,
    z: from.z + (to.z - from.z) * contact.t};
  const speed = Math.hypot(shot.vx, shot.vz), distance = fraction * ROCKET_RULES.blastRadius;
  const vertical = ground.y + .85 - impact.y;
  const horizontal = Math.sqrt(Math.max(0, distance ** 2 - vertical ** 2));
  Object.assign(fighter, {x: impact.x + shot.vz / speed * horizontal, y: ground.y,
    z: impact.z - shot.vx / speed * horizontal, groundY: ground.y});
  const nearest = f.duel.course.nearest(fighter.x, fighter.z);
  fighter.s = nearest.s; fighter.lateral = nearest.lateral;
  return {...f, fighter, shot, impact, car};
}

test('native Rocket Pods still hit a car for ten armor once without foot-gear attribution', () => {
  const f = fixture(), car = f.state.opponents[1], armor = car.armor;
  place(f.state, 230, 0);
  const shot = aimAndLaunch(f, f.state.opponents[0], point(f.duel, car));
  resolve(f, shot);
  near(car.armor, armor - 10, 'the released car damage remains ten armor');
  const after = car.armor; stepProjectiles(f.duel, DT);
  equal(car.armor, after, 'a consumed native rocket cannot hit a car twice');
  equal(f.events.filter(e => e.arsenalCue === 'weapon.rockets.hit').length, 1, 'one native shot produces one blast');
  ok(!f.events.some(e => e.footGearHit), 'car rockets are not signature foot gear');
});

test('the earliest real player fighter intercepts a native rocket before a later car', () => {
  const f = fixture(), fighter = exit(f), car = f.state.opponents[1];
  place(f.state, 230, 0);
  const shot = aimAndLaunch(f, f.state.opponents[0], point(f.duel, car));
  placePlayerOnRay(f, fighter, shot);
  const armor = car.armor, hit = resolve(f, shot);
  ok(hit && Math.hypot(hit.x - fighter.x, hit.z - fighter.z) < 1,
    'the native sweep must stop at the earlier fighter body, not pass through to the car');
  equal(fighter.knockedDown, true, 'direct Rocket Pods blast knocks the fighter down inside half radius');
  equal(car.armor, armor, 'the later car outside the actual fighter blast remains untouched');
  ok(f.events.some(e => e.combatHit && e.fighter && e.enemy && !e.footGearHit), 'the fighter hit retains enemy car attribution');
});

for (const [fraction, down] of [[.75, false], [.49, true]]) {
  test(`native car rocket splash at ${fraction} radius follows fighter falloff and knockdown`, () => {
    const f = splashFixture(fraction), initial = f.fighter.health;
    const hit = resolve(f, f.shot);
    ok(hit && Math.hypot(hit.x - f.impact.x, hit.y - f.impact.y, hit.z - f.impact.z) < 1e-5,
      'the native blast occurs at the independently swept real car contact');
    const body = {x: f.fighter.x, y: f.fighter.y + .85, z: f.fighter.z};
    const distance = Math.hypot(body.x - hit.x, body.y - hit.y, body.z - hit.z);
    near(distance / ROCKET_RULES.blastRadius, fraction, 'the real fighter starts at the selected blast distance');
    const event = f.events.find(e => e.combatHit && e.fighter);
    ok(event, 'the actual native car blast must emit fighter damage instead of ignoring the body');
    near(event?.strength * 60, 60 * (1 - fraction), 'fighter splash uses the existing 60-health maximum and linear falloff');
    equal(f.fighter.knockedDown, down, 'only a fighter strictly inside half radius is knocked down');
    equal(f.fighter.health, down ? 0 : initial - 60 * (1 - fraction), 'native fighter health follows splash and existing knockdown');
    const health = f.fighter.health; stepProjectiles(f.duel, DT);
    equal(f.fighter.health, health, 'one resolved car rocket cannot damage the fighter twice');
    ok(!event.footGearHit && event.enemy, 'splash remains an enemy car hit, not foot gear');
  });
}

for (const guard of ['shield', 'wreck']) test(`a parked car ${guard} does not make its real fighter immune to rockets`, () => {
  const f = fixture();
  if (guard === 'shield') equal(fireWeapon(f.duel, 'star'), true, 'the real player Star producer shields the parked car');
  const fighter = exit(f); place(f.state, 230, 0);
  if (guard === 'wreck') {
    for (let i = 0; i < 4 && !f.state.combatWrecking; i++)
      applyArmorDamage(f.duel, f.state, 'fixed', {amount: 1000, owner: 'cpu-1'});
    equal(f.state.combatWrecking, true, 'native armor damage creates the actual parked wreck');
  } else ok(f.state.combat.shield > 0, 'the native car shield is active');
  const shot = aimAndLaunch(f, f.state.opponents[0], point(f.duel, f.state.opponents[1]));
  placePlayerOnRay(f, fighter, shot);
  resolve(f, shot);
  equal(fighter.knockedDown, true, 'the exposed fighter uses its own body, not its parked car shield or recovery immunity');
});

test('actual arena participant protection still blocks Rocket Pods fighter damage', () => {
  for (const protectedId of ['player', 'cpu-1']) {
    const f = splashFixture(.75);
    f.state.arena.participants.find(p => p.id === protectedId).protectedSec = 1;
    resolve(f, f.shot);
    equal(f.fighter.health, 100, 'native owner/victim participant protection preserves fighter health');
    equal(f.fighter.knockedDown, false, 'protection cannot force a fighter knockdown');
  }
});

test('a native player rocket reaches a real generated raider with car damage credit', () => {
  const f = fixture({race: true}), raider = f.state.raids.zones[0].raiders[0];
  f.state.opponents.forEach((actor, i) => place(actor, 100 + i * 100));
  const shot = launchAtFighter(f, f.state, raider, true);
  const initial = raider.health;
  resolve(f, shot);
  ok(raider.health < initial, 'the actual native rocket intersects the generated raider body');
  ok(f.events.some(e => e.raiderHit && e.raider === raider.id && e.source === 'car' && e.owner === 'player'),
    'raider damage is credited to the player car, never on-foot scrap rewards');
  ok(!f.events.some(e => e.footGearHit), 'the generated raider contact is not a foot-gear attack');
});

test('a native player rocket strikes the real repair-module computer fighter', () => {
  const f = fixture({race: true}), car = f.state.opponents[0];
  const anchor = f.duel.course.length * .45;
  place(f.state, anchor - 1000); f.state.lapsTotal = 1;
  place(car, anchor); car.armor = 29; car.maxArmor = 100;
  place(f.state.opponents[1], anchor - 1500);
  for (let i = 0; i < 1200 && car.cpuCrew?.phase !== 'repair'; i++) {
    f.state.stageTimeSec += DT; stepCpuCrew(f.duel, car, DT, {enabled: true});
  }
  equal(car.cpuCrew?.phase, 'repair', 'the actual owned controller creates a repair stop without invented CPU records');
  const fighter = car.cpuCrew.fighter;
  ok(fighter && car.speedMph <= 1, 'the actual CPU fighter exits its parked car');
  const shot = launchAtFighter(f, f.state, fighter), health = fighter.health;
  resolve(f, shot);
  ok(fighter.health < health, 'the real CPU repair fighter is included in the native rocket contact path');
  ok(f.events.some(e => e.cpuCrew && e.source === 'car' && e.owner === 'player'),
    'CPU fighter damage preserves the player-car attribution');
});
