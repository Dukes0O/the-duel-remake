import assert from 'node:assert/strict';
import {test, after} from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Duel} from '../src/game.js';
import {CARS, COURSE, DRIVE} from '../src/config.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {actorBody} from '../src/vehicle-knock.js';
import {solveVehicleImpact, yawInertia} from '../src/vehicle-collision.js';
import {vehicleContactEnvelope} from '../src/npc-yielding.js';
import {pilotStep} from '../src/arena/arena-pilot.js';
import {arenaTargetOutOfPlay} from '../src/combat-teams.js';
import {thinkBrain} from '../src/arena/arena-brains.js';
import {containInArena, floorLimit, worldPose} from '../src/arena/arena-floor.js';

const DT = 1 / 120, EPS = 1e-8;
const fixture = JSON.parse(readFileSync(new URL('./replays/arena-shove-controls.json', import.meta.url), 'utf8'));
const CARS_IN_GAME = Object.keys(CARS);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
let checks = 0;
const eq = (a, b, message) => {checks++; assert.deepEqual(a, b, message);};
const ok = (value, message) => {checks++; assert.ok(value, message);};
function pose(actor, s, lateral = 0, headingError = 0) {
  Object.assign(actor, {s, prevS: s, lateral, prevLateral: lateral, headingError,
    speedMph: 0, yawVelocity: 0, pushVelocity: 0, airHeight: 0,
    prevAirHeight: 0, airborne: false, contactCooldown: 0, damageCooldown: 0});
  if (!actor.combatWrecking) actor.impactTimer = 0;
}
function participant(duel, car) {
  return duel.state.arena.participants.find(p => p.id === (car === duel.state ? 'player' : car.arenaId));
}
function holdIdle(duel, car) {
  if (car === duel.state) {
    duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false}); return;
  }
  const at = worldPose(duel, car), p = participant(duel, car);
  // This is the real brain's existing held-goal/reaction state, not a replaced
  // brain or pilot. The goal asks for zero speed but does not suppress knocks.
  Object.assign(p, {targetId: arenaTargetOutOfPlay(duel, duel.state) ? null : 'player', targetHeldSec: -100, reactionSec: 10,
    goal: {x: at.x + Math.sin(at.heading) * 30,
      z: at.z + Math.cos(at.heading) * 30, speedMph: 0, boost: false}});
}
function arena(attackingCar, targetCar, role) {
  const playerCar = role === 'player-attacker' ? attackingCar : role === 'player-target' ? targetCar : 'falcone_f42';
  const opponents = role === 'cpu-cpu' ? [attackingCar, targetCar] :
    [role === 'player-attacker' ? targetCar : attackingCar];
  const duel = new Duel({seed: fixture.seed, featureFlags: {wasteland2: true, scrapdome: true}});
  assert.equal(duel.startArenaEvent({car: playerCar, driverId: 'club', seed: fixture.seed,
    cpuDifficulty: 'medium', opponents: opponents.map(car => ({car, driverId: 'club', brain: 'gunner'}))}), true);
  const state = duel.state;
  Object.assign(state, {status: 'racing', countdown: 0, invulnerableSec: 0});
  state.arena.phase = 'fight'; state.combat.aiTimer = state.combat.pickupTimer = Infinity;
  for (const [index, car] of [state, ...state.opponents].entries()) {
    pose(car, 20 + index * 140); holdIdle(duel, car);
  }
  const attacker = role === 'player-attacker' ? state : state.opponents[0];
  const target = role === 'player-target' ? state : role === 'cpu-cpu' ? state.opponents[1] : state.opponents[0];
  return {duel, attacker, target};
}
function sitting(c, kind) {
  const {duel, target, attacker} = c;
  if (kind === 'wreck' || kind === 'protected') {
    target.armor = 1;
    assert.equal(applyArmorDamage(duel, target, 'crossbow',
      {owner: attacker === duel.state ? 'player' : attacker.arenaId}), 1,
    'native owned damage creates the actual one-armor wreck');
    assert.equal(target.combatWrecking, true);
    duel.step(DT); // Real wreck counting and timer step.
    if (kind === 'protected') {
      for (let i = 0; i < 430 && target.combatWrecking; i++) duel.step(DT);
      assert.equal(target.combatWrecking, false, 'actual timer expires and native arena respawn completes');
      assert.equal(participant(duel, target).protectedSec, 2, 'actual respawn creates its authored protection');
      assert.equal(target.armor, target.maxArmor, 'actual respawn restores armor');
    }
  }
  const lateral = kind === 'pinned' ? floorLimit(duel) : 0;
  pose(target, 90, lateral, kind === 'pinned' ? Math.PI / 2 : 0);
  if (kind === 'pinned') {
    target.lateral += .01;
    containInArena(duel, target, DT); // The actual solid boundary pins it.
    assert.equal(target.lateral, floorLimit(duel));
  }
  holdIdle(duel, target);
  c.kind = kind;
}
export function ram(attackingCar, targetCar, role, kind, mph, fps = 120) {
  const c = arena(attackingCar, targetCar, role); sitting(c, kind);
  const {duel, attacker, target} = c;
  pose(attacker, target.s, target.lateral);
  const envelope = vehicleContactEnvelope(attacker, target, duel._vehicleSpec(attacker), duel._vehicleSpec(target));
  pose(attacker, target.s - envelope.length - .02, target.lateral);
  holdIdle(duel, attacker);
  // A real drive/pilot step produces the sweep. The 1.1-mph margin keeps its
  // measured incoming closing speed at or above the accepted threshold despite
  // one native drag/brake tick; no target is moved to manufacture displacement.
  attacker.speedMph = mph + 1.1;
  const initial = worldPose(duel, target), armor = target.armor, attackerArmor = attacker.armor;
  const protection = participant(duel, target).protectedSec;
  if (attacker === duel.state) duel._drive(DT);
  else {
    const at = worldPose(duel, attacker);
    pilotStep(duel, attacker, {x: at.x + Math.sin(at.heading) * 30,
      z: at.z + Math.cos(at.heading) * 30, speedMph: mph + 1.1, boost: false}, DT);
    holdIdle(duel, attacker);
  }
  const incomingMph = attacker.speedMph * Math.cos(attacker.headingError || 0);
  const contact = duel._vehicleContact(attacker, target, 'rival');
  const kinetic = actorBody(duel, target), firstKnock = !!target.knock;
  const initialTimer = target.combatWreckTimer;
  let moved = 0, air = 0, escaped = false, ticks = 0;
  const observe = () => {
    const at = worldPose(duel, target);
    moved = Math.max(moved, Math.hypot(at.x - initial.x, at.z - initial.z));
    air = Math.max(air, target.airHeight || 0);
    escaped ||= Math.abs(target.lateral) > floorLimit(duel) + EPS;
  };
  observe();
  const frames = Math.ceil(fixture.measureTicks / 120 * fps);
  for (let frame = 1; frame <= frames; frame++) {
    const due = Math.min(fixture.measureTicks, Math.floor(frame * 120 / fps + EPS));
    while (ticks < due) {duel.step(DT); observe(); ticks++;}
  }
  return {...c, moved, air, escaped, armor, attackerArmor, protection, contact,
    incomingMph, kinetic, firstKnock, initialTimer, ticks,
    trace: digest({state: duel.state, moved: +moved.toFixed(8), air: +air.toFixed(8)})};
}

for (const kind of fixture.sittingStates) for (const role of fixture.roles) for (const [mph, metres] of fixture.minimums) {
  test(kind + '/' + role + ': every playable mass pair at ' + mph + '+ mph moves at least ' + metres + ' m', () => {
    const failures = [];
    for (const attacker of CARS_IN_GAME) for (const target of CARS_IN_GAME) {
      const result = ram(attacker, target, role, kind, mph);
      const name = attacker + '→' + target;
      checks++;
      if (result.incomingMph < mph - EPS) failures.push(name + ': fixture closing speed ' + result.incomingMph + ' is below threshold');
      else if (!result.contact) failures.push(name + ': native swept ram never reaches contact');
      else if (result.moved + EPS < metres) failures.push(name + ': moved ' + result.moved.toFixed(6) + ' m; requires ' + metres + ' m');
      else if (Math.hypot(result.kinetic.vx, result.kinetic.vz) <= EPS)
        failures.push(name + ': displacement has no native solver velocity');
      if (result.escaped) failures.push(name + ': native shoved body left the floor');
      if (kind === 'wreck' && (result.air > EPS || !result.target.combatWrecking ||
          !(result.target.combatWreckTimer > 0 && result.target.combatWreckTimer < result.initialTimer)))
        failures.push(name + ': wreck must slide on the floor during its actual running respawn timer');
      if (kind === 'protected' && (result.target.armor !== result.armor ||
          result.attacker.armor !== result.attackerArmor || !(participant(result.duel, result.target).protectedSec > 0)))
        failures.push(name + ': native protected ram damaged a body or outlasted its real protection');
    }
    eq(failures, [], failures.length + ' native mass/state/role witnesses fail; first: ' + failures[0]);
  });
}

test('positive control: an actual live sitting CPU responds to the released solver', () => {
  const r = ram('falcone_f42', 'dusthawk_rally', 'player-attacker', 'idle', 40);
  eq(r.contact, true, 'native swept positive control physically contacts');
  ok(r.moved >= 4, 'actual live CPU moves more than the forty-mph minimum');
  ok(r.firstKnock, 'native solver actually starts the released free-body knock');
  ok(Math.hypot(r.kinetic.vx, r.kinetic.vz) > 0, 'positive movement has native rigid-body velocity');
});

test('protection positive control: actual respawn guard blocks armor while allowing the released motion', () => {
  const r = ram('falcone_f42', 'dusthawk_rally', 'player-attacker', 'protected', 40);
  eq(r.protection, 2, 'protection came from the native respawn event');
  eq(r.target.armor, r.armor, 'protected target never loses armor');
  eq(r.attacker.armor, r.attackerArmor, 'protected target cannot deal ram armor damage');
  ok(r.moved >= 4, 'real respawn protection does not block physical movement');
});

for (const fps of [30, 60, 144]) for (const kind of fixture.sittingStates) {
  test(kind + ': native fixed-step shove repeats at ' + fps + ' FPS', () => {
    const expected = ram('falcone_f42', 'dusthawk_rally', 'player-attacker', kind, 40);
    const actual = ram('falcone_f42', 'dusthawk_rally', 'player-attacker', kind, 40, fps);
    eq(actual.ticks, fixture.measureTicks, 'presentation scheduler executes the exact same fixed ticks');
    eq(actual.trace, expected.trace, 'native full state and displacement repeat across presentation FPS');
  });
}

export function solverControl() {
  const results = [];
  for (const attackingCar of CARS_IN_GAME) for (const targetCar of CARS_IN_GAME) {
    const c = arena(attackingCar, targetCar, 'player-attacker');
    const a = actorBody(c.duel, c.attacker), b = actorBody(c.duel, c.target);
    for (const [angle, offset] of [[0, 0], [Math.PI / 2, 0], [0, 1]]) {
      const bodyA = {...a, x: angle ? -a.halfLength - b.halfWidth : offset,
        z: angle ? offset : -a.halfLength - b.halfLength,
        heading: angle, vx: Math.sin(angle) * 40 * DRIVE.mphToWorld,
        vz: Math.cos(angle) * 40 * DRIVE.mphToWorld};
      const bodyB = {...b, x: 0, z: 0, heading: 0, vx: 0, vz: 0};
      results.push({attackingCar, targetCar, angle, offset, result: solveVehicleImpact(bodyA, bodyB)});
    }
  }
  return digest(results);
}

test('released solver all-mass rear/side/corner fingerprint stays unchanged', () => {
  eq(solverControl(), fixture.solverFingerprint, 'global released rigid-body solver cannot change for an arena fix');
});

test('released solver conserves linear momentum and never adds energy', () => {
  const a = {mass: 940, halfLength: 2.1, halfWidth: .95, heading: 0,
    x: .6, z: -4.2, vx: 0, vz: 40 * DRIVE.mphToWorld, spin: 0};
  const b = {mass: 4700, halfLength: 2.8, halfWidth: 1.6, heading: 0,
    x: 0, z: 0, vx: 0, vz: 0, spin: 0};
  for (const body of [a, b]) body.inertia = yawInertia(body.mass, body.halfLength, body.halfWidth);
  const hit = solveVehicleImpact(a, b);
  for (const axis of ['vx', 'vz']) ok(Math.abs(a.mass * a[axis] + b.mass * b[axis] -
    a.mass * hit.a[axis] - b.mass * hit.b[axis]) < 1e-6, 'released solver conserves momentum ' + axis);
  const energy = (body, velocity) => (body.mass * (velocity.vx ** 2 + velocity.vz ** 2) + body.inertia * velocity.spin ** 2) / 2;
  ok(energy(a, hit.a) + energy(b, hit.b) <= energy(a, a) + energy(b, b) + EPS,
    'the released solver never creates impact energy');
});

for (const spec of fixture.roadControls) test('released road full-state fingerprint: ' + spec.car + '/' + spec.course, () => {
  const duel = new Duel({seed: fixture.seed, featureFlags: {wasteland2: true, scrapdome: true, warlords: true}});
  duel.startCampaign({car: spec.car, seed: fixture.seed, mode: 'duel', difficulty: 'casual',
    cpuDifficulty: 'medium', startStage: COURSE.findIndex(def => def.id === spec.course)});
  duel.state.status = 'racing'; duel.state.countdown = 0;
  const samples = [];
  for (let tick = 0; tick < fixture.roadTicks; tick++) {
    duel.setInput({throttle: tick < 240 ? 1 : .5, brake: 0, steer: tick < 120 ? .08 : -.12, boost: false});
    duel.step(DT); if (tick % 120 === 119) samples.push(structuredClone(duel.state));
  }
  ok(duel.state.s > 20, 'native road control actually drives');
  eq(digest(samples), spec.fingerprint, 'road/steering/Titan High Country full-state pin is retained');
});

// Claude, 1 October: a purely outward push at the solid wall stays contained;
// normal ram damage/protection apply, and the attacker physically rebounds.
// The existing 1,944 open-floor/tangential witnesses stay unchanged above.
function wallRam(attackingCar, targetCar, role, kind, mph, side, tangentRadians = 0) {
  const c = arena(attackingCar, targetCar, role); sitting(c, kind);
  const {duel, attacker, target} = c, limit = floorLimit(duel);
  pose(target, 90, side * (limit + .01), 0);
  containInArena(duel, target, DT); holdIdle(duel, target);
  pose(attacker, target.s, target.lateral, side * Math.PI / 2 - tangentRadians);
  const envelope = vehicleContactEnvelope(attacker, target, duel._vehicleSpec(attacker), duel._vehicleSpec(target));
  pose(attacker, target.s, target.lateral - side * (envelope.width + .02), side * Math.PI / 2 - tangentRadians);
  holdIdle(duel, attacker); attacker.speedMph = (mph + 1.1) / Math.cos(tangentRadians);
  const before = worldPose(duel, target), armor = target.armor, attackerArmor = attacker.armor,
    timer = target.combatWreckTimer, protection = participant(duel, target).protectedSec,
    frame = duel.course.at(target.s), events = [];
  duel.onChange((_, event) => {
    if (event.combatRamHit || event.arenaWallHit) events.push(structuredClone(event));
  });
  if (attacker === duel.state) duel._drive(DT);
  else {
    const at = worldPose(duel, attacker);
    pilotStep(duel, attacker, {x: at.x + Math.sin(at.heading) * 30,
      z: at.z + Math.cos(at.heading) * 30, speedMph: mph + 1.1, boost: false}, DT);
    holdIdle(duel, attacker);
  }
  const body = actorBody(duel, attacker), incomingMph = side *
    (body.vx * Math.cos(frame.heading) - body.vz * Math.sin(frame.heading)) / DRIVE.mphToWorld;
  const contact = duel._vehicleContact(attacker, target, 'rival');
  const afterContactLateral = attacker.lateral;
  let reverseMps = 0, reboundMetres = 0, targetMotion = 0, tangentMetres = 0, escaped = false, air = 0;
  for (let tick = 0; tick < fixture.measureTicks; tick++) {
    duel.step(DT); const velocity = actorBody(duel, attacker), at = worldPose(duel, target);
    reverseMps = Math.max(reverseMps, -side * (velocity.vx * Math.cos(frame.heading) - velocity.vz * Math.sin(frame.heading)));
    reboundMetres = Math.max(reboundMetres, side * (afterContactLateral - attacker.lateral));
    targetMotion = Math.max(targetMotion, Math.hypot(at.x - before.x, at.z - before.z));
    tangentMetres = Math.max(tangentMetres, Math.abs((at.x - before.x) * Math.sin(frame.heading) + (at.z - before.z) * Math.cos(frame.heading)));
    escaped ||= Math.abs(target.lateral) > limit + EPS || Math.abs(attacker.lateral) > limit + EPS;
    air = Math.max(air, target.airHeight || 0);
  }
  return {...c, side, contact, incomingMph, reverseMps, reboundMetres, targetMotion, tangentMetres,
    escaped, air, armor, attackerArmor, timer, protection, events};
}
for (const kind of fixture.sittingStates) for (const role of fixture.roles)
  for (const side of [-1, 1]) for (const [mph] of fixture.minimums) {
    test(`SETTLED WALL: ${kind}/${role}/side${side}/${mph}mph all native masses stay solid and attacker rebounds`, () => {
      const failures = [];
      for (const attackingCar of CARS_IN_GAME) for (const targetCar of CARS_IN_GAME) {
        const r = wallRam(attackingCar, targetCar, role, kind, mph, side), name = attackingCar + '→' + targetCar;
        checks++;
        if (!r.contact || r.incomingMph < mph - EPS) failures.push(name + ': actual normal swept contact below threshold/missing');
        if (r.escaped || r.targetMotion > 1e-4) failures.push(name + ': outward target must stay at the solid wall, motion=' + r.targetMotion);
        if (!(r.reverseMps > 1e-6 && r.reboundMetres > .01)) failures.push(name + ': attacker must genuinely rebound away from wall; reverse=' + r.reverseMps.toFixed(6) + 'm/s, inward=' + r.reboundMetres.toFixed(6) + 'm');
        const victimId = r.target === r.duel.state ? 'player' : r.target.arenaId;
        const damage = r.events.filter(event => event.combatRamHit &&
          (event.victim === 'player' ? 'player' : `cpu-${event.victimIndex + 1}`) === victimId)
          .reduce((total, event) => total + event.armorRemoved, 0);
        if (kind === 'protected' && (r.target.armor !== r.armor || r.attacker.armor !== r.attackerArmor || damage !== 0 ||
            !(participant(r.duel, r.target).protectedSec > 0))) failures.push(name + ': actual protection must block both ram damage directions');
        if (kind === 'wreck' && (r.target.armor !== r.armor || damage !== 0 || r.air > EPS ||
            !r.target.combatWrecking || !(r.target.combatWreckTimer > 0 && r.target.combatWreckTimer < r.timer) ||
            participant(r.duel, r.target).wrecked !== 1 || r.events.some(event => event.arenaWallHit?.id === victimId)))
          failures.push(name + ': counted waiting wreck stays grounded, quiet, undamaged, and keeps its native deadline');
        if (kind !== 'wreck' && kind !== 'protected' && mph === 40 && !(damage > 0 && r.target.armor < r.armor))
          failures.push(name + ': eligible forty-mph normal contact must retain real ram armor damage');
        if (kind !== 'wreck' && kind !== 'protected' && mph === 20 && damage !== 0)
          failures.push(name + ': twenty-mph contact remains below the existing forty-kph ram damage threshold');
      }
      eq(failures, [], failures.length + ' settled normal-wall witnesses fail; first: ' + failures[0]);
    });
  }
for (const kind of fixture.sittingStates) for (const side of [-1, 1])
  test(`SETTLED WALL TANGENT: ${kind}/side${side} retains both actual along-wall components`, () => {
    for (const mph of [20, 40]) for (const angle of [-Math.PI / 12, Math.PI / 12]) {
      const r = wallRam('falcone_f42', 'dusthawk_rally', 'player-attacker', kind, mph, side, angle);
      eq(r.contact, true, 'oblique approach reaches actual native swept contact');
      ok(r.incomingMph >= mph - EPS, 'actual outward closing component reaches its threshold');
      ok(!r.escaped, 'oblique shove remains inside the same solid outer wall');
      ok(r.tangentMetres > 1e-6, 'a genuine nonzero along-wall component still slides; no new blocked-direction minimum');
    }
  });
for (const mph of [20, 40]) test(`SETTLED WALL TRAFFIC CONTROL: genuine road traffic native contact at ${mph}mph`, () => {
  const ordinary = new Duel({seed: fixture.seed, featureFlags: {wasteland2: true}});
  ordinary.startCampaign({mode: 'wasteland', car: 'falcone_f42', seed: fixture.seed, startStage: 0});
  const s = ordinary.state, traffic = s.traffic.find(actor => actor.alive && actor.dir === 1);
  ok(traffic, 'the actual seeded road spawner supplies the existing traffic shape');
  eq(s.arena, null, 'traffic contact is an ordinary-road control, never a fabricated arena participant');
  eq(Object.hasOwn(traffic, 'protectedSec'), false, 'traffic has no invented arena protection');
  Object.assign(s, {status: 'racing', countdown: 0, invulnerableSec: 0});
  pose(traffic, 905); pose(s, traffic.s, 0, Math.PI / 2);
  const shell = vehicleContactEnvelope(s, traffic, ordinary._vehicleSpec(s), ordinary._vehicleSpec(traffic));
  pose(s, traffic.s, -shell.width - .02, Math.PI / 2); s.speedMph = mph + 1.1;
  ordinary.setInput({throttle: 0, brake: 0, steer: 0, boost: false}); ordinary._drive(DT);
  eq(ordinary._vehicleContact(s, traffic, 'traffic'), true, 'actual swept traffic shell reaches contact');
  const body = actorBody(ordinary, traffic);
  ok([body.vx, body.vz, body.spin].every(Number.isFinite), 'released native traffic contact stays finite');
  ok(Math.hypot(body.vx, body.vz) > EPS, 'the real traffic contact receives native solver motion');
  const publicArena = arena('falcone_f42', 'dusthawk_rally', 'player-attacker').duel;
  eq(publicArena.state.traffic, [], 'public arena still has no traffic roster or traffic respawn contract');
});

after(() => console.log('Arena shove: ' + checks + ' acceptance checks reached.'));


test('outward wall ram preserves actual solid containment without inventing an escape', () => {
  const c = arena('falcone_f42', 'dusthawk_rally', 'player-attacker'); sitting(c, 'pinned');
  const {duel, attacker, target} = c;
  attacker.headingError = Math.PI / 2;
  const envelope = vehicleContactEnvelope(attacker, target, duel._vehicleSpec(attacker), duel._vehicleSpec(target));
  pose(attacker, target.s, target.lateral - envelope.width - .02, Math.PI / 2);
  attacker.speedMph = 41; const before = worldPose(duel, target);
  duel._drive(DT);
  eq(duel._vehicleContact(attacker, target, 'rival'), true, 'the actual outward swept ram reaches the pinned body');
  let maximum = 0;
  for (let tick = 0; tick < fixture.measureTicks; tick++) {
    duel.step(DT);
    ok(Math.abs(target.lateral) <= floorLimit(duel) + EPS, 'outward ram never puts the real target beyond the solid floor');
    const at = worldPose(duel, target);
    maximum = Math.max(maximum, Math.hypot(at.x - before.x, at.z - before.z));
  }
  ok(Number.isFinite(maximum), 'actual constrained outward displacement is measurable');
  console.log('Outward pinned witness: ' + maximum.toFixed(6) + ' m; universal minimum remains with Claude.');
});

test('a real swept miss never gives a stopped car the minimum shove for free', () => {
  const c = arena('falcone_f42', 'dusthawk_rally', 'player-attacker'); sitting(c, 'idle');
  const {duel, attacker, target} = c, before = worldPose(duel, target);
  const envelope = vehicleContactEnvelope(attacker, target, duel._vehicleSpec(attacker), duel._vehicleSpec(target));
  pose(attacker, target.s - envelope.length - .02, target.lateral + envelope.width + 1);
  attacker.speedMph = 41; duel._drive(DT);
  eq(duel._vehicleContact(attacker, target, 'rival'), false, 'the actual body-width boundary excludes a clear sweep');
  for (let tick = 0; tick < 30; tick++) duel.step(DT);
  const at = worldPose(duel, target);
  ok(Math.hypot(at.x - before.x, at.z - before.z) < EPS, 'a true miss leaves the real idle car stationary');
  eq(target.knock, null, 'a true miss cannot fabricate a native knock');
});

test('native waiting-wreck timer counts one wreck and really respawns at its original deadline', () => {
  const r = ram('falcone_f42', 'dusthawk_rally', 'player-attacker', 'wreck', 40);
  const p = participant(r.duel, r.target);
  eq(p.wrecked, 1, 'native wreck counting remains exactly once during the waiting state');
  ok(r.target.combatWreckTimer > 0 && r.target.combatWreckTimer < r.initialTimer,
    'the real waiting timer continues after the attempted shove');
  let ticks = 0;
  while (r.target.combatWrecking && ticks++ < 430) r.duel.step(DT);
  eq(r.target.combatWrecking, false, 'actual recovery time still ends with native respawn');
  eq(r.target.armor, r.target.maxArmor, 'native respawn keeps the full-armor rule');
  eq(p.protectedSec, 2, 'native respawn still begins with exactly two seconds of protection');
  eq(p.wrecked, 1, 'shoving cannot recount the original wreck');
});

for (const car of ['titan_monster', 'falcone_f42']) test('released road vehicle crush rule: ' + car, () => {
  const duel = new Duel({seed: fixture.seed, featureFlags: {wasteland2: true}});
  duel.startCampaign({mode: 'duel', car, driverId: 'club', seed: fixture.seed, startStage: 0,
    opponentCount: 1, rival: {car: 'falcone_f42'}});
  const state = duel.state, target = state.rival;
  state.status = 'racing'; state.countdown = 0; state.invulnerableSec = 0; state.traffic = [];
  pose(target, 905);
  const envelope = vehicleContactEnvelope(state, target, duel._vehicleSpec(state), duel._vehicleSpec(target));
  pose(state, target.s - envelope.length - .02); state.speedMph = 60;
  duel._drive(DT);
  const events = []; duel.onChange((_, event) => {if (event.vehicleCrushed) events.push(event.vehicleCrushed);});
  eq(duel._vehicleContact(state, target, 'rival'), true, 'real road contact reaches the actual rival body');
  eq(target.crushed === true, car === 'titan_monster', 'only the released Titan can physically crush the lighter car');
  eq(events.length, car === 'titan_monster' ? 1 : 0, 'the released crush event count is unchanged');
});


// The held-goal fixture obeys the native target validity contract. It never
// suppresses a real brain decision or a later physical contact.
test('HELD GOAL: valid actual player preserves native identity, reaction and stopped goal', () => {
  const {duel, attacker} = arena('falcone_f42', 'dusthawk_rally', 'player-target');
  const p = participant(duel, attacker); holdIdle(duel, attacker);
  const goal = p.goal;
  eq(arenaTargetOutOfPlay(duel, duel.state), false, 'ordinary actual player is fightable');
  eq(p.targetId, 'player', 'fixture holds the valid actual player');
  eq(p.reactionSec, 10, 'fixture retains the original ten-second reaction');
  eq(goal.speedMph, 0, 'fixture retains the original stopped goal');
  eq(thinkBrain(duel, p, attacker, DT), goal, 'real brain preserves a still-valid held goal');
  ok(p.goal === goal, 'native goal identity is retained');
  eq(p.targetId, 'player', 'actual target identity remains the player');
  eq(p.reactionSec, 10 - DT, 'native reaction decreases by the real fixed step');
});
for (const kind of ['wreck', 'protected']) {
  test(`HELD GOAL: stale actual ${kind} player invalidates and naturally cruises`, () => {
    const c = arena('falcone_f42', 'dusthawk_rally', 'player-target'); sitting(c, kind);
    const {duel, attacker} = c, p = participant(duel, attacker); holdIdle(duel, attacker);
    p.targetId = 'player'; // Deliberately stale input to the unchanged real brain.
    const goal = p.goal;
    eq(arenaTargetOutOfPlay(duel, duel.state), true, 'native player state is actually unfightable');
    eq(p.reactionSec, 10, 'stale control starts at the same held reaction');
    eq(goal.speedMph, 0, 'stale control starts at the same zero-speed goal');
    const next = thinkBrain(duel, p, attacker, DT);
    eq(p.targetId, null, 'actual brain clears the invalid target itself');
    ok(next !== goal && p.goal === next, 'actual brain chooses a new goal without a replacement method');
    ok(next.speedMph > 0, 'actual no-target cruise naturally requests positive speed');
    ok(p.reactionSec > 0 && p.reactionSec < 1, 'native decision replaces the stale ten-second reaction');
    const before = attacker.s;
    for (let tick = 0; tick < 120; tick++) duel.step(DT);
    ok(attacker.speedMph > 0 && attacker.s !== before, 'native pilot really accelerates and drives the cruise goal');
  });
  test(`HELD GOAL: correctly null actual ${kind} player preserves native stopped goal`, () => {
    const c = arena('falcone_f42', 'dusthawk_rally', 'player-target'); sitting(c, kind);
    const {duel, attacker} = c, p = participant(duel, attacker); pose(attacker, 20); holdIdle(duel, attacker);
    const goal = p.goal;
    eq(arenaTargetOutOfPlay(duel, duel.state), true, 'actual wreck/protection guard remains active');
    eq(p.targetId, null, 'correct fixture holds the actual unfightable-player null target');
    eq(p.reactionSec, 10, 'correct fixture does not shorten the reaction');
    eq(goal.speedMph, 0, 'correct fixture does not change the requested stopped speed');
    eq(thinkBrain(duel, p, attacker, DT), goal, 'actual brain preserves the correctly held null goal');
    ok(p.goal === goal, 'actual native held goal identity survives target selection');
    eq(p.targetId, null, 'native selection stays null while the player cannot be fought');
    eq(p.reactionSec, 10 - DT, 'actual native step decrements the original reaction normally');
    const before = worldPose(duel, attacker);
    for (let tick = 0; tick < 120; tick++) duel.step(DT);
    const after = worldPose(duel, attacker);
    eq(attacker.speedMph, 0, 'real pilot keeps a legitimately held stopped car stopped');
    ok(Math.hypot(after.x - before.x, after.z - before.z) < EPS, 'holding a valid null goal creates no motion');
  });
}


import {sweepBox} from '../src/collision.js';

// The visual wreck fixture first creates a real crash. That crash is one
// continuing incident until the actual native collision pass sees separation.
// These controls preserve its debounce and prove a later fresh physical hit.
function visualWreckIncident(role, separated) {
  const attackingCar = role === 'player-attacker' ? 'falcone_f42' : 'dusthawk_rally';
  const targetCar = role === 'player-attacker' ? 'dusthawk_rally' : 'falcone_f42';
  const c = arena(attackingCar, targetCar, role), {duel, attacker, target} = c;
  const resetPose = (car, distance) => {
    pose(car, distance); Object.assign(car, {steerVisual: 0, slipAngle: 0,
      knock: null, tumble: null, groundHeight: null});
  };
  const approach = mph => {
    resetPose(attacker, target.s);
    const envelope = vehicleContactEnvelope(attacker, target,
      duel._vehicleSpec(attacker), duel._vehicleSpec(target));
    resetPose(attacker, target.s - envelope.length - .02);
    holdIdle(duel, attacker); attacker.speedMph = mph + 1.1;
    if (attacker !== duel.state) participant(duel, attacker).goal.speedMph = mph + 1.1;
  };
  resetPose(duel.state, 20); resetPose(duel.state.opponents[0], 90);
  holdIdle(duel, duel.state.opponents[0]);
  target.armor = 1; approach(60); duel.step(DT);
  eq(target.combatWrecking, true, 'ordinary native sixty-mph collision creates the real wreck');
  const latchedBefore = [...duel._combatRamIncidents];
  ok(latchedBefore.length === 1, 'actual preparation crash creates one continuing pair incident');
  resetPose(target, 260); holdIdle(duel, target);
  if (separated) duel.step(DT); // Real separated actors, no manual contact/map clear.
  const latchedAfter = [...duel._combatRamIncidents], initialTimer = target.combatWreckTimer;
  approach(40);
  const start = worldPose(duel, target), observations = [], reports = [];
  const original = duel._vehicleContact;
  duel._vehicleContact = function(a, b, reason) {
    const beforeA = actorBody(duel, a), beforeB = actorBody(duel, b);
    const envelope = vehicleContactEnvelope(a, b, duel._vehicleSpec(a), duel._vehicleSpec(b));
    const phase = duel.relativeS(b.s, a.s) - b.s;
    const hit = sweepBox({x: (a.prevLateral ?? a.lateral) - (b.prevLateral ?? b.lateral),
      z: (a.prevS ?? a.s) - (b.prevS ?? b.s) - phase},
    {x: a.lateral - b.lateral, z: a.s - b.s - phase}, envelope.width, envelope.length);
    const vaX = Math.sin(a.headingError || 0) * a.speedMph * (a.dir || 1) * DRIVE.mphToWorld + (a.pushVelocity || 0);
    const vbX = Math.sin(b.headingError || 0) * b.speedMph * (b.dir || 1) * DRIVE.mphToWorld + (b.pushVelocity || 0);
    const vaZ = a.speedMph * Math.cos(a.headingError || 0) * (a.dir || 1), vbZ = b.speedMph * Math.cos(b.headingError || 0) * (b.dir || 1);
    const closingMph = hit ? Math.max(0, -(vaX - vbX) / DRIVE.mphToWorld * hit.nx - (vaZ - vbZ) * hit.nz) : 0;
    const latched = [...duel._combatRamIncidents];
    const result = Reflect.apply(original, this, [a, b, reason]);
    if (result && hit && a === duel.state) {
      const afterA = actorBody(duel, a), afterB = actorBody(duel, b);
      const victimBefore = target === a ? beforeA : beforeB, victimAfter = target === a ? afterA : afterB;
      observations.push({latched, closingMph, hit,
        targetDvMph: Math.hypot(victimAfter.vx - victimBefore.vx, victimAfter.vz - victimBefore.vz) / DRIVE.mphToWorld});
    }
    return result;
  };
  const off = duel.onChange((_, event) => {if (event.vehicleSmash || event.combatRamHit) reports.push(event);});
  let moved = 0, air = 0;
  try {for (let tick = 0; tick < fixture.measureTicks; tick++) {
    duel.step(DT); const at = worldPose(duel, target);
    moved = Math.max(moved, Math.hypot(at.x - start.x, at.z - start.z));
    air = Math.max(air, target.airHeight || 0);
  }} finally {delete duel._vehicleContact; off();}
  return {...c, latchedBefore, latchedAfter, initialTimer, observations, reports, moved, air};
}
for (const role of ['player-attacker', 'player-target']) {
  test(`INCIDENT SEPARATION: ${role} continuing real wreck contact retains released debounce`, () => {
    const r = visualWreckIncident(role, false);
    eq(r.latchedAfter, r.latchedBefore, 'staging without a native separated step does not erase the actual incident');
    ok(r.observations.length > 0, 'real native contact still separates overlapping physical bodies');
    ok(r.observations[0].closingMph >= 40, 'actual first continuing contact is above forty mph');
    ok(r.observations[0].latched.length === 1, 'first contact still belongs to the genuine preparation incident');
    eq(r.observations[0].targetDvMph, 0, 'latched contact does not replay a solver impulse');
    eq(r.reports.length, 0, 'released continuing incident does not duplicate smash or armor reports');
    eq(r.target.armor, 0, 'actual wreck remains out of play without another armor loss');
    eq(r.air, 0, 'continuing wreck contact stays on the floor');
    ok(r.target.combatWreckTimer > 0 && r.target.combatWreckTimer < r.initialTimer,
      'continuing contact never resets or extends the running wreck timer');
  });
  test(`INCIDENT SEPARATION: ${role} one real separated step permits a fresh forty-mph wreck shove`, () => {
    const r = visualWreckIncident(role, true);
    eq(r.latchedAfter, [], 'ordinary native collision pass clears the genuinely separated incident');
    ok(r.observations.length > 0, 'subsequent ordinary native steps really collide');
    ok(r.observations[0].closingMph >= 40, 'fresh actual first hit remains above forty mph');
    eq(r.observations[0].latched, [], 'fresh hit starts a new incident');
    ok(r.observations[0].targetDvMph > 0, 'fresh hit transfers actual rigid-body momentum');
    ok(r.reports.some(event => event.vehicleSmash), 'fresh actual impact emits its native smash');
    ok(r.moved >= 4, 'fresh real wreck shove retains the unchanged four-metre minimum');
    eq(r.target.armor, 0, 'fresh shove does not revive the actual wreck');
    eq(r.air, 0, 'fresh wreck shove slides on the floor');
    ok(r.target.combatWrecking && r.target.combatWreckTimer > 0 && r.target.combatWreckTimer < r.initialTimer,
      'the same actual running deadline survives a new incident without reset');
    eq(r.duel._vehicleContact, Duel.prototype._vehicleContact, 'native observation restores the inherited contact method');
  });
}


// A staged grounded QA pose must not keep ballistic integration from the CPU's
// earlier real ramp while it waits for another car's actual arena respawn.
function protectedCpuApproach(freshGroundedPose) {
  const duel = new Duel({seed: 89098, featureFlags: {wasteland2: true, scrapdome: true}});
  eq(duel.startArenaEvent({car: 'falcone_f42', driverId: 'club', seed: 89098,
    cpuDifficulty: 'easy', opponents: [{car: 'dusthawk_rally', upgradeLevel: 0}]}), true,
  'native seed/options match the independently captured protected CPU approach');
  const target = duel.state, attacker = target.opponents[0];
  const tick = n => {for (let i = 0; i < n; i++) duel.step(DT);};
  const stagedPose = (actor, distance) => {
    Object.assign(actor, {s: distance, prevS: distance, lateral: 0, prevLateral: 0,
      headingError: 0, speedMph: 0, yawVelocity: 0, pushVelocity: 0,
      steerVisual: 0, slipAngle: 0, knock: null, tumble: null, airborne: false,
      airHeight: 0, prevAirHeight: 0, groundHeight: null, contactCooldown: 0, damageCooldown: 0});
    if (freshGroundedPose) Object.assign(actor, {_jumpY: null, _verticalSpeed: 0});
  };
  const approach = mph => {
    stagedPose(attacker, target.s);
    const envelope = vehicleContactEnvelope(attacker, target, duel._vehicleSpec(attacker), duel._vehicleSpec(target));
    stagedPose(attacker, target.s - envelope.length - .02);
    holdIdle(duel, attacker); participant(duel, attacker).goal.speedMph = mph + 1.1;
    attacker.speedMph = mph + 1.1;
  };
  tick(362); target.combat.aiTimer = target.combat.pickupTimer = Infinity;
  stagedPose(target, 20); stagedPose(attacker, 90); holdIdle(duel, attacker);
  target.armor = 1; approach(60); duel._vehicleContact(attacker, target, 'rival'); tick(1);
  eq(target.combatWrecking, true, 'actual sixty-mph contact creates the real player wreck');
  for (let i = 0; i < 430 && target.combatWrecking; i++) tick(1);
  eq(target.combatWrecking, false, 'actual running wreck deadline completes without a forced respawn');
  eq(participant(duel, target).protectedSec, 2, 'native respawn grants exactly two seconds of protection');
  eq(target.armor, target.maxArmor, 'native respawn restores player armor');
  const beforePose = {jumpY: attacker._jumpY, verticalSpeed: attacker._verticalSpeed,
    ground: duel.course.groundAt(attacker.s, attacker.lateral).y};
  stagedPose(target, 260); holdIdle(duel, target); approach(40);
  const initial = {jumpY: attacker._jumpY, verticalSpeed: attacker._verticalSpeed,
    armor: target.armor, attackerArmor: attacker.armor, protection: participant(duel, target).protectedSec};
  const start = worldPose(duel, target), contacts = [], reports = [];
  const original = duel._vehicleContact;
  duel._vehicleContact = function(a, b, reason) {
    const envelope = vehicleContactEnvelope(a, b, duel._vehicleSpec(a), duel._vehicleSpec(b));
    const phase = duel.relativeS(b.s, a.s) - b.s;
    const hit = sweepBox({x: (a.prevLateral ?? a.lateral) - (b.prevLateral ?? b.lateral),
      z: (a.prevS ?? a.s) - (b.prevS ?? b.s) - phase},
    {x: a.lateral - b.lateral, z: a.s - b.s - phase}, envelope.width, envelope.length);
    const before = actorBody(duel, target);
    const vaX = Math.sin(a.headingError || 0) * a.speedMph * (a.dir || 1) * DRIVE.mphToWorld + (a.pushVelocity || 0);
    const vbX = Math.sin(b.headingError || 0) * b.speedMph * (b.dir || 1) * DRIVE.mphToWorld + (b.pushVelocity || 0);
    const vaZ = a.speedMph * Math.cos(a.headingError || 0) * (a.dir || 1), vbZ = b.speedMph * Math.cos(b.headingError || 0) * (b.dir || 1);
    const closingMph = hit ? Math.max(0, -(vaX - vbX) / DRIVE.mphToWorld * hit.nx - (vaZ - vbZ) * hit.nz) : 0;
    const targetHeight = (target.groundHeight ?? duel.course.groundAt(target.s, target.lateral).y) + (target.airHeight || 0);
    const attackerHeight = (attacker.groundHeight ?? duel.course.groundAt(attacker.s, attacker.lateral).y) + (attacker.airHeight || 0);
    const aboveShell = attackerHeight > targetHeight + duel._vehicleSpec(target).height;
    const result = Reflect.apply(original, this, [a, b, reason]);
    if (a === target && hit) {
      const after = actorBody(duel, target);
      contacts.push({result, hit, closingMph, aboveShell,
        targetDvMph: Math.hypot(after.vx - before.vx, after.vz - before.vz) / DRIVE.mphToWorld});
    }
    return result;
  };
  const off = duel.onChange((_, event) => {if (event.vehicleSmash || event.combatRamHit) reports.push(event);});
  let moved = 0, targetAir = 0, attackerAir = 0;
  try {for (let i = 0; i < fixture.measureTicks; i++) {
    tick(1); const at = worldPose(duel, target);
    moved = Math.max(moved, Math.hypot(at.x - start.x, at.z - start.z));
    targetAir = Math.max(targetAir, target.airHeight || 0);
    attackerAir = Math.max(attackerAir, attacker.airHeight || 0);
  }} finally {delete duel._vehicleContact; off();}
  return {duel, attacker, target, beforePose, initial, contacts, reports, moved, targetAir, attackerAir};
}
test('GROUNDED POSE: retained actual ramp ballistics honor the native height guard', () => {
  const r = protectedCpuApproach(false), first = r.contacts[0];
  ok(r.beforePose.ground > 0 && r.beforePose.verticalSpeed > 1, 'CPU really leaves the earlier ramp with upward ballistic state');
  eq(r.initial.jumpY, r.beforePose.jumpY, 'old staged pose carries the earlier ramp height');
  eq(r.initial.verticalSpeed, r.beforePose.verticalSpeed, 'old staged pose carries the earlier ramp velocity');
  ok(first.closingMph >= 40, 'first genuine native sweep still has the required incoming speed');
  eq(first.aboveShell, true, 'actual airborne CPU is vertically outside the player shell');
  eq(first.result, false, 'unchanged native height guard rejects that physical collision');
  eq(first.targetDvMph, 0, 'height rejection supplies no target impulse');
  ok(r.contacts.filter(c => c.aboveShell && !c.result).length > 1, 'native height rejection persists until real flight descends');
  eq(r.target.armor, r.initial.armor, 'rejected/protected contacts do not damage player armor');
  eq(r.attacker.armor, r.initial.attackerArmor, 'protected contacts do not damage CPU armor');
  ok(participant(r.duel, r.target).protectedSec > 0, 'actual native protection remains active');
  eq(r.targetAir, 0, 'rejected airborne attacker never launches the protected player');
});
test('GROUNDED POSE: complete fresh pose permits actual protected forty-mph CPU shove', () => {
  const r = protectedCpuApproach(true), first = r.contacts.find(c => c.result);
  eq(r.initial.jumpY, null, 'fresh staged ground pose discards the earlier absolute ramp height');
  eq(r.initial.verticalSpeed, 0, 'fresh staged ground pose has zero inherited upward velocity');
  ok(first && first.closingMph >= 40, 'real accepted first collision retains forty-mph closing speed');
  eq(r.contacts[0], first, 'first real sweep is accepted without an artificial missed approach');
  eq(first.aboveShell, false, 'actual bodies occupy overlapping physical height');
  ok(first.targetDvMph > 0, 'native solver really transfers target momentum');
  ok(r.reports.some(event => event.vehicleSmash), 'fresh actual collision emits its native smash');
  ok(r.moved >= 4, 'protected real player preserves the unchanged four-metre minimum');
  eq(r.target.armor, r.initial.armor, 'native player protection preserves armor');
  eq(r.attacker.armor, r.initial.attackerArmor, 'native protection preserves the CPU armor too');
  eq(r.targetAir, 0, 'actual protected target stays on the floor');
  eq(r.attackerAir, 0, 'freshly grounded actual CPU stays on the floor');
  ok(participant(r.duel, r.target).protectedSec > 0 && participant(r.duel, r.target).protectedSec < r.initial.protection,
    'original native protection deadline elapses normally without reset');
  eq(r.duel._vehicleContact, Duel.prototype._vehicleContact, 'readonly contact observer restores its original native method');
});


import {sweepObstacle as observedWallSweep} from '../src/collision.js';
import {arenaWallNormal as actualWallNormal} from '../src/arena/arena-floor.js';

// One real native normal-wall incident, with a separately labelled continuing
// CPU throttle control. No source contact/guard/controller result is replaced.
function scriptedNormalIncident(role, side, segment, coast) {
  const seed = role === 'player-attacker' ? (side < 0 ? 112855 : 120774) : (side < 0 ? 128693 : 136612);
  const duel = new Duel({seed, featureFlags: {wasteland2: true, scrapdome: true}});
  eq(duel.startArenaEvent({car: 'falcone_f42', driverId: 'club', seed, cpuDifficulty: 'easy',
    opponents: [{car: 'dusthawk_rally', upgradeLevel: 0}]}), true, 'real normal-wall fixture uses captured native actors/options');
  const s = duel.state, cpu = s.opponents[0], target = role === 'player-attacker' ? cpu : s,
    attacker = target === s ? cpu : s;
  const tick = () => duel.step(DT);
  const fresh = (actor, distance, lateral = 0, headingError = 0) => Object.assign(actor,
    {s: distance, prevS: distance, lateral, prevLateral: lateral, headingError,
      speedMph: 0, yawVelocity: 0, pushVelocity: 0, steerVisual: 0, slipAngle: 0,
      knock: null, tumble: null, airborne: false, airHeight: 0, prevAirHeight: 0,
      _jumpY: null, _verticalSpeed: 0, groundHeight: null, contactCooldown: 0, damageCooldown: 0});
  const hold = (actor, speedMph = 0) => {
    holdIdle(duel, actor);
    if (actor !== s) participant(duel, actor).goal.speedMph = speedMph;
  };
  for (let i = 0; i < 362; i++) tick();
  s.combat.aiTimer = s.combat.pickupTimer = Infinity;
  fresh(s, 20); fresh(cpu, 90); hold(cpu);
  fresh(target, segment, side * (floorLimit(duel) + .01)); hold(target);
  const railContacts = [], originalStatic = duel._staticContacts;
  duel._staticContacts = function(actor, ...rest) {
    const before = {s: actor.s, lateral: actor.lateral};
    const from = duel.course.worldAt(actor.prevS ?? actor.s, actor.prevLateral ?? actor.lateral),
      to = duel.course.worldAt(actor.s, actor.lateral);
    from.y = to.y = undefined;
    const hits = actor === target ? duel._obstacles(actor.prevS ?? actor.s, actor.s)
      .map(obstacle => ({obstacle, hit: observedWallSweep(from, to, obstacle,
        duel.course.at(actor.s).heading + (actor.headingError || 0) + (actor.slipAngle || 0), duel._vehicleSpec(actor))}))
      .filter(row => row.hit && row.obstacle.arenaWall) : [];
    const result = Reflect.apply(originalStatic, this, [actor, ...rest]);
    if (actor === target && hits.length) railContacts.push({before, hits, after: {s: actor.s, lateral: actor.lateral}});
    return result;
  };
  try {tick();} finally {delete duel._staticContacts;}
  const staged = {s: target.s, lateral: target.lateral, wall: actualWallNormal(duel, target),
    ground: duel.course.groundAt(target.s, target.lateral).y, air: target.airHeight};
  fresh(attacker, target.s, target.lateral, side * Math.PI / 2);
  const envelope = vehicleContactEnvelope(attacker, target, duel._vehicleSpec(attacker), duel._vehicleSpec(target));
  fresh(attacker, target.s, target.lateral - side * (envelope.width + .02), side * Math.PI / 2);
  hold(attacker, coast ? 0 : 41.1); attacker.speedMph = 41.1;
  const before = worldPose(duel, target), frame = duel.course.at(target.s), armor = target.armor,
    initialLateral = attacker.lateral, contacts = [], events = [], original = duel._vehicleContact;
  let step = 0;
  duel._vehicleContact = function(a, b, reason) {
    const shape = vehicleContactEnvelope(a, b, duel._vehicleSpec(a), duel._vehicleSpec(b));
    const phase = duel.relativeS(b.s, a.s) - b.s;
    const hit = sweepBox({x: a.prevLateral - b.prevLateral, z: a.prevS - b.prevS - phase},
      {x: a.lateral - b.lateral, z: a.s - b.s - phase}, shape.width, shape.length);
    const vx = (Math.sin(a.headingError || 0) * a.speedMph * (a.dir || 1) -
      Math.sin(b.headingError || 0) * b.speedMph * (b.dir || 1)) * DRIVE.mphToWorld + (a.pushVelocity || 0) - (b.pushVelocity || 0);
    const vz = (Math.cos(a.headingError || 0) * a.speedMph * (a.dir || 1) -
      Math.cos(b.headingError || 0) * b.speedMph * (b.dir || 1)) * DRIVE.mphToWorld;
    const latch = [...duel._combatRamIncidents], incoming = {s: target.s, lateral: target.lateral};
    const result = Reflect.apply(original, this, [a, b, reason]);
    if (result && hit && a === s && b === cpu) contacts.push({step, hit, latch, incoming,
      normalMph: Math.max(0, -(vx * hit.nx + vz * hit.nz) / DRIVE.mphToWorld),
      tangentMph: (vx * hit.nz - vz * hit.nx) / DRIVE.mphToWorld,
      separated: {s: target.s, lateral: target.lateral}});
    return result;
  };
  const off = duel.onChange((_, event) => {if (event.combatRamHit || event.vehicleSmash) events.push(event);});
  let moved = 0, firstMotion = 0, reverse = 0, rebound = 0, air = 0, escaped = false;
  try {for (step = 1; step <= fixture.measureTicks; step++) {
    tick(); const at = worldPose(duel, target), body = actorBody(duel, attacker),
      distance = Math.hypot(at.x - before.x, at.z - before.z);
    moved = Math.max(moved, distance); if (step === 1) firstMotion = distance;
    reverse = Math.max(reverse, -side * (body.vx * Math.cos(frame.heading) - body.vz * Math.sin(frame.heading)));
    rebound = Math.max(rebound, side * (initialLateral - attacker.lateral));
    air = Math.max(air, target.airHeight || 0);
    escaped ||= Math.abs(target.lateral) > floorLimit(duel) + EPS || Math.abs(attacker.lateral) > floorLimit(duel) + EPS;
  }} finally {delete duel._vehicleContact; off();}
  return {duel, target, attacker, staged, railContacts, contacts, events, armor, firstMotion, moved, reverse, rebound, air, escaped};
}
test('NORMAL INCIDENT: real negative rail leaves an unpinned gap that the first ram closes', () => {
  const r = scriptedNormalIncident('cpu-attacker', -1, 260, true);
  eq(r.staged.wall, null, 'actual staged player is not at the solid floor boundary');
  ok(r.railContacts.some(row => row.hits.some(hit => hit.obstacle.id === 'arena-wall-248--1')),
    'actual native rail contact supplies the inward staging displacement');
  const gap = floorLimit(r.duel) - Math.abs(r.staged.lateral);
  ok(gap > .04, 'native rail leaves a real open-floor gap rather than a pinned target');
  ok(r.contacts[0].normalMph >= 40, 'first genuine ram remains above forty mph');
  ok(r.firstMotion > .04, 'real initially unpinned target can move across its genuine gap');
  ok(Math.abs(r.firstMotion - gap) < EPS, 'first physical displacement closes the measured native gap');
  eq(r.escaped, false, 'native containment still prevents escape');
  ok(r.target.armor < r.armor, 'eligible real gap-closing ram retains native armor damage');
});
for (const role of ['player-attacker', 'cpu-attacker']) for (const side of [-1, 1]) {
  test(`NORMAL INCIDENT: ${role}/side${side} genuinely pinned single ram stays solid and rebounds`, () => {
    const r = scriptedNormalIncident(role, side, 100, true);
    ok(r.staged.wall, 'actual staged target has a native solid-wall normal');
    eq(r.staged.lateral, side * floorLimit(r.duel), 'actual post-static pose is genuinely at the floor boundary');
    eq(r.staged.ground, 0, 'native staged pose is on flat actual floor');
    eq(r.staged.air, 0, 'native staged target is genuinely grounded');
    eq(r.contacts[0].hit.nz, 0, 'first native swept contact is normal to the wall');
    ok(r.contacts[0].normalMph >= 40, 'actual first native impact remains above forty mph');
    ok(r.firstMotion < 1e-4, 'genuine first normal ram preserves strict pinned motion');
    ok(r.moved < 1e-4, 'single normal ram preserves strict pinned motion for all210 actual steps');
    ok(r.reverse > 1e-6 && r.rebound > .01, 'attacker genuinely reverses velocity and moves away from wall');
    ok(r.target.armor < r.armor, 'eligible actual normal ram retains armor damage');
    eq(r.escaped, false, 'all native steps retain solid floor containment');
    eq(r.air, 0, 'actual pinned target remains on the floor');
    eq(r.duel._vehicleContact, Duel.prototype._vehicleContact, 'contact observer restores original native method');
    eq(r.duel._staticContacts, Duel.prototype._staticContacts, 'rail observer restores original native method');
  });
}
for (const side of [-1, 1]) test(`NORMAL INCIDENT: continued CPU throttle side${side} makes a later legitimate oblique ram`, () => {
  const r = scriptedNormalIncident('cpu-attacker', side, 100, false), later = r.contacts.slice(1).find(c => c.latch.length === 0);
  ok(r.staged.wall, 'continuing-throttle control also begins genuinely pinned');
  ok(r.firstMotion < 1e-4, 'the genuine first normal ram still meets strict pinned motion');
  ok(later && later.step > 1, 'real continued pilot input naturally clears and starts a later incident');
  ok(Math.abs(later.tangentMph) > 1, 'later native contact contains a genuine along-wall velocity component');
  ok(r.moved > 1e-4, 'later oblique continuation legitimately moves the target along the wall');
  eq(r.escaped, false, 'genuine oblique motion does not cross the solid boundary');
  ok(r.reverse > 1e-6 && r.rebound > .01, 'initial physical rebound is retained before the later approach');
});
