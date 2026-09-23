import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {Duel} from '../src/game.js';
import {DRIVE} from '../src/config.js';
import {createCombat, fireWeapon, stepCombat} from '../src/combat.js';
import {stepProjectiles} from '../src/combat-projectiles.js';
import {COMBAT_TUNING} from '../src/wasteland-tuning.js';

const T = COMBAT_TUNING;
const radians = degrees => degrees * Math.PI / 180;
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const bearing = vector => Math.atan2(vector.x, vector.z);
const separation = (left, right) => Math.abs(wrap(bearing(left) - bearing(right)));
const close = (actual, expected, message, tolerance = 1e-6) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected}, got ${actual}`);
const round = value => Number.isFinite(value) ? +value.toFixed(5) : value ?? null;

function field({mode = 'wasteland', wasteland2 = true} = {}) {
  const duel = new Duel({seed: 1989, featureFlags: {wasteland2}});
  duel.startCampaign({mode, startStage: 0, cpuDifficulty: 'hard', opponentCount: 3});
  const state = duel.state;
  state.status = 'racing';
  state.s = state.prevS = 100;
  state.lateral = state.prevLateral = 0;
  state.speedMph = 0;
  state.pushVelocity = 0;
  state.headingError = 0;
  state.invulnerableSec = 0;
  state.traffic = [];
  if (state.combat) {
    state.combat.aiTimer = Infinity;
    state.combat.pickupTimer = Infinity;
    state.combat.rivalShield = 0;
  }
  for (const [index, opponent] of state.opponents.entries()) {
    Object.assign(opponent, {s: 600 + index * 80, prevS: 600 + index * 80,
      lateral: 0, prevLateral: 0, speedMph: 0, pushVelocity: 0,
      headingError: 0, impactTimer: 0, combatShield: 0, finished: false,
      crushed: false});
  }
  return {duel, state};
}

function place(actor, s, lateral = 0) {
  Object.assign(actor, {s, prevS: s, lateral, prevLateral: lateral,
    speedMph: 0, pushVelocity: 0, headingError: 0, impactTimer: 0});
}

function launchDirection(projectile, source) {
  const dx = projectile.x - source.x;
  const dz = projectile.z - source.z;
  const length = Math.hypot(dx, dz);
  assert.ok(length > 0, 'fired projectile has a muzzle offset');
  return {x: dx / length, z: dz / length};
}

function expectedCarry(actor, source) {
  const heading = source.heading + (actor.headingError || 0);
  const speed = actor.speedMph * (actor.dir || 1) * DRIVE.mphToWorld;
  return {
    x: Math.sin(heading) * speed + Math.cos(source.heading) * actor.pushVelocity,
    z: Math.cos(heading) * speed - Math.sin(source.heading) * actor.pushVelocity,
  };
}

test('bombs and bolts inherit the full player velocity, including reverse and lateral shove', () => {
  for (const kind of ['bomb', 'crossbow']) {
    const {duel, state} = field();
    place(state.opponents[1], 145);
    state.speedMph = -60;
    state.pushVelocity = 11;
    state.headingError = .17;
    assert.equal(fireWeapon(duel, kind), true, `${kind} fires`);
    const source = duel.course.groundAt(state.s, state.lateral);
    const carry = expectedCarry(state, source);
    const speed = kind === 'bomb' ? T.bomb.launchSpeed : T.crossbow.baseSpeed;
    for (const projectile of state.combat.projectiles) {
      const direction = launchDirection(projectile, source);
      close(projectile.vx - direction.x * speed, carry.x, `${kind} player x carry`);
      close(projectile.vz - direction.z * speed, carry.z, `${kind} player z carry`);
    }
  }
});

test('bombs and bolts inherit a later CPU car velocity and identify their source', () => {
  for (const kind of ['bomb', 'crossbow']) {
    const {duel, state} = field();
    const actor = state.opponents[1];
    place(actor, 145);
    actor.speedMph = 90;
    actor.pushVelocity = -9;
    actor.headingError = -.12;
    assert.equal(fireWeapon(duel, kind, true, actor), true, `${kind} CPU shot fires`);
    const source = duel.course.groundAt(actor.s, actor.lateral);
    const carry = expectedCarry(actor, source);
    const speed = kind === 'bomb' ? T.bomb.launchSpeed : T.crossbow.baseSpeed;
    for (const projectile of state.combat.projectiles) {
      const direction = launchDirection(projectile, source);
      close(projectile.vx - direction.x * speed, carry.x, `${kind} CPU x carry`);
      close(projectile.vz - direction.z * speed, carry.z, `${kind} CPU z carry`);
      assert.equal(projectile.sourceIndex, 1, 'later CPU source stays identifiable');
    }
  }
});

test('player and later CPU bolts lead a target moving across the road', () => {
  for (const enemy of [false, true]) {
    const {duel, state} = field();
    const shooter = enemy ? state.opponents[1] : state;
    const target = enemy ? state : state.opponents[1];
    place(shooter, enemy ? 145 : 100);
    place(target, enemy ? 100 : 145);
    target.pushVelocity = 20;
    assert.equal(fireWeapon(duel, 'crossbow', enemy, shooter), true);
    const projectile = state.combat.projectiles[0];
    const source = duel.course.groundAt(shooter.s, shooter.lateral);
    const current = duel.course.groundAt(target.s, target.lateral);
    const flight = Math.hypot(current.x - source.x, current.z - source.z) /
      T.crossbow.baseSpeed;
    const future = duel.course.groundAt(target.s, target.lateral + target.pushVelocity * flight);
    const direct = {x: current.x - source.x, z: current.z - source.z};
    const predicted = {x: future.x - source.x, z: future.z - source.z};
    const shot = launchDirection(projectile, source);
    assert.ok(separation(direct, predicted) > .03, 'fixture has a useful lateral lead');
    assert.ok(separation(shot, predicted) < separation(shot, direct),
      `${enemy ? 'later CPU' : 'player'} aims ahead of the moving target`);
  }
});

test('a bolt turns toward a moved target within a 12-degree cone at no more than 90 degrees per second', () => {
  const {duel, state} = field();
  const target = state.opponents[1];
  place(target, 350);
  assert.equal(fireWeapon(duel, 'crossbow'), true);
  const projectile = state.combat.projectiles[0];
  const launchAngle = bearing({x: projectile.vx, z: projectile.vz});
  target.lateral = target.prevLateral = 100;
  const dt = 1 / 60;
  let previous = launchAngle;
  let turned = false;
  for (let tick = 0; tick < 15; tick++) {
    stepCombat(duel, dt);
    assert.ok(state.combat.projectiles.includes(projectile), 'distant bolt remains in flight');
    const current = bearing({x: projectile.vx, z: projectile.vz});
    const delta = Math.abs(wrap(current - previous));
    assert.ok(delta <= radians(90) * dt + 1e-6, 'turn speed is capped at 90 degrees per second');
    assert.ok(Math.abs(wrap(current - launchAngle)) <= radians(12) + 1e-6,
      'homing stays within 12 degrees of the launch direction');
    turned ||= delta > .001;
    previous = current;
  }
  assert.ok(turned, 'bolt corrects toward a target that moved after launch');
});

test('bombs keep their launch direction while an aimed bolt homes', () => {
  const {duel, state} = field();
  place(state.opponents[1], 350);
  assert.equal(fireWeapon(duel, 'bomb'), true);
  const before = state.combat.projectiles.map(projectile => ({vx: projectile.vx, vz: projectile.vz}));
  state.opponents[1].lateral = 100;
  stepCombat(duel, 1 / 60);
  state.combat.projectiles.forEach((projectile, index) => {
    close(projectile.vx, before[index].vx, `bomb ${index} x direction`);
    close(projectile.vz, before[index].vz, `bomb ${index} z direction`);
  });
});

test('a fast bolt crosses a later CPU car without tunneling at 30, 60 and 144 FPS', () => {
  for (const fps of [30, 60, 144]) {
    const {duel, state} = field();
    const target = state.opponents[1];
    place(target, 140);
    const at = duel.course.groundAt(target.s, target.lateral);
    const speed = 1200;
    const dt = 1 / fps;
    const forward = {x: Math.sin(at.heading), z: Math.cos(at.heading)};
    const projectile = {kind: 'crossbow', enemy: false, level: 0,
      x: at.x - forward.x * speed * dt * .55,
      y: at.y + 2,
      z: at.z - forward.z * speed * dt * .55,
      vx: forward.x * speed, vy: 0, vz: forward.z * speed, age: 0};
    const hits = [];
    duel.onChange((_, event) => { if (event.combatHit) hits.push(event); });
    state.combat.projectiles.push(projectile);
    stepCombat(duel, dt);
    assert.equal(state.combat.hits, 1, `${fps} FPS bolt hits the later opponent`);
    assert.equal(hits.length, 1, `${fps} FPS produces one hit event`);
    assert.equal(state.combat.projectiles.includes(projectile), false,
      `${fps} FPS consumes the bolt on contact`);
  }
});

test('ordinary races cannot fire or guide a stray bolt with the development switch enabled', () => {
  const {duel, state} = field({mode: 'duel'});
  duel.featureFlags = {enabled: name => name === 'wasteland2'};
  state.combat = createCombat({});
  place(state.opponents[1], 350);
  assert.equal(fireWeapon(duel, 'crossbow'), false,
    'an ordinary race cannot launch a combat bolt');
  const from = duel.course.groundAt(state.s, state.lateral);
  const speed = T.crossbow.baseSpeed;
  const projectile = {kind: 'crossbow', enemy: false, level: 0,
    x: from.x, y: from.y + 3, z: from.z,
    vx: Math.sin(from.heading) * speed, vy: 0,
    vz: Math.cos(from.heading) * speed, age: 0,
    targetIndex: 1, launchBearing: from.heading};
  state.opponents[1].lateral = state.opponents[1].prevLateral = 100;
  state.combat.projectiles.push(projectile);
  const before = {vx: projectile.vx, vz: projectile.vz};
  stepProjectiles(duel, 1 / 60);
  assert.ok(state.combat.projectiles.includes(projectile), 'the stray bolt remains in flight');
  close(projectile.vx, before.vx, 'ordinary bolt x direction');
  close(projectile.vz, before.vz, 'ordinary bolt z direction');
});

function replayDigest(mode, wasteland2) {
  const duel = new Duel({seed: 1989, featureFlags: {wasteland2}});
  duel.startCampaign({mode, startStage: 0, cpuDifficulty: 'hard'});
  const state = duel.state;
  state.status = 'racing';
  state.countdown = 0;
  state.s = state.prevS = 100;
  state.lateral = state.prevLateral = 0;
  state.speedMph = 55;
  state.invulnerableSec = 0;
  state.traffic = [];
  state.rival.s = state.rival.prevS = 160;
  state.rival.speedMph = 55;
  if (state.combat) {
    state.combat.aiTimer = Infinity;
    state.combat.pickupTimer = Infinity;
  }
  duel.setInput({throttle: 1, steer: .05});
  const samples = [];
  for (let tick = 0; tick < 180; tick++) {
    if (tick === 0 && mode === 'wasteland') duel.fireWeapon('crossbow');
    if (tick === 90 && mode === 'wasteland') duel.fireWeapon('bomb');
    duel.step(1 / 120);
    if (tick % 30 === 29) samples.push({
      s: round(state.s), lateral: round(state.lateral), speed: round(state.speedMph),
      rivalS: round(state.rival.s), rivalSpeed: round(state.rival.speedMph),
      hits: state.combat?.hits ?? null,
      projectiles: state.combat?.projectiles.map(projectile => [
        projectile.kind, round(projectile.x), round(projectile.y), round(projectile.z),
        round(projectile.vx), round(projectile.vy), round(projectile.vz),
      ]) ?? null,
      bursts: state.combat?.bursts.length ?? null,
    });
  }
  return createHash('sha256').update(JSON.stringify(samples)).digest('hex');
}

test('ordinary and flag-off Wasteland projectiles keep the approved replay fingerprints', () => {
  assert.equal(replayDigest('duel', false), '1a7f0be659d29472a1ce36f2903dffdff8352f2b951c16a75df9bb7a7414c14e',
    'ordinary mode keeps the approved source behavior');
  assert.equal(replayDigest('duel', true), '1a7f0be659d29472a1ce36f2903dffdff8352f2b951c16a75df9bb7a7414c14e',
    'enabling combat rules cannot change ordinary races');
  assert.equal(replayDigest('wasteland', false), '9453a92c428b5194f5768392e2d1e76a0162de6f36429c39bd18bd02fc3bfd34',
    'flag-off Wasteland keeps the approved source behavior');
});
