import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {Duel} from '../src/game.js';
import {DRIVE} from '../src/config.js';
import {createCombat, fireWeapon, stepCombat} from '../src/combat.js';
import {stepProjectiles} from '../src/combat-projectiles.js';
import {COMBAT_TUNING} from '../src/wasteland-tuning.js';
import {readFileSync} from 'node:fs';

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
      y: at.y + duel._vehicleSpec(target).height / 2,
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

test('a flagged bolt hits when its height crosses a later CPU car between frames', () => {
  const outcomes = [];
  for (const fps of [30, 60, 144]) {
    const {duel, state} = field();
    duel.featureFlags = {enabled: name => name === 'wasteland2'};
    const target = state.opponents[1];
    place(target, 140);
    target.airHeight = target.prevAirHeight = 0;
    const at = duel.course.groundAt(target.s, target.lateral);
    const forward = {x: Math.sin(at.heading), z: Math.cos(at.heading)};
    const speed = T.crossbow.baseSpeed;
    const span = speed / 30;
    const projectile = {kind: 'crossbow', enemy: false, level: 0,
      x: at.x - forward.x * span / 2,
      // Descend through the body centre as the horizontal path crosses it.
      y: at.y + duel._vehicleSpec(target).height / 2 + 1,
      z: at.z - forward.z * span / 2,
      vx: forward.x * speed, vy: -60, vz: forward.z * speed, age: 0};
    const hits = [];
    duel.onChange((_, event) => { if (event.combatHit) hits.push(event); });
    state.combat.projectiles.push(projectile);
    for (let frame = 0; frame < Math.ceil(fps * .12) && !hits.length; frame++) {
      stepCombat(duel, 1 / fps);
    }
    assert.equal(state.combat.hits, hits.length, `${fps} FPS records each hit once`);
    if (hits.length) {
      assert.equal(state.combat.projectiles.includes(projectile), false,
        `${fps} FPS consumes the bolt on contact`);
    }
    outcomes.push({fps, hits: hits.length});
  }
  assert.deepEqual(outcomes, [
    {fps: 30, hits: 1},
    {fps: 60, hits: 1},
    {fps: 144, hits: 1},
  ], 'the vertical crossing must hit at every frame rate');
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

// BUG-06: exercise production projectile stepping on a flat, deterministic
// course. Vehicle sizes, armor, hit events and damage still use Duel rules.
function bodyContact({wasteland2 = true, kind = 'crossbow', enemy = false,
  car = 'falcone_f42', fps = 60, startAir = 0, endAir = startAir,
  height, endHeight = height, startZ = 130, endZ = 150} = {}) {
  const {duel, state} = field({wasteland2});
  duel.course = {
    groundAt: (s, lateral) => ({x: lateral, y: 0, z: s, heading: 0}),
    nearest: (x, z) => ({s: z, lateral: x}),
  };
  const target = enemy ? state : state.opponents[1];
  place(target, 140);
  target.car = car;
  target.airHeight = endAir;
  target.prevAirHeight = startAir;
  const bodyHeight = duel._vehicleSpec(target).height;
  const shotHeight = height ?? bodyHeight / 2;
  const nextHeight = endHeight ?? shotHeight;
  const projectile = {kind, enemy, sourceIndex: 0, level: 0,
    x: 0, y: shotHeight, z: startZ,
    vx: 0, vy: (nextHeight - shotHeight) * fps,
    vz: (endZ - startZ) * fps, age: 1};
  const beforeArmor = target.armor;
  const events = [];
  duel.onChange((_, event) => { if (event.combatHit) events.push(event); });
  state.combat.projectiles.push(projectile);
  stepProjectiles(duel, 1 / fps);
  return {hits: events.filter(event => event.victim === (enemy ? 'player' : 'rival')).length,
    armorLost: Number.isFinite(beforeArmor) ? round(beforeArmor - target.armor) : null,
    consumed: !state.combat.projectiles.includes(projectile), bodyHeight};
}

let bodyChecks = 0;
function bodyCase(name, options, hitExpected) {
  test(name, () => {
    bodyChecks++;
    const result = bodyContact(options);
    assert.equal(result.hits, hitExpected ? 1 : 0, name);
    assert.equal(result.consumed, hitExpected, `${name}: bolt consumption`);
    assert.equal(result.armorLost, hitExpected ? T.armor.crossbow : 0,
      `${name}: armor changes only on actual body contact`);
  });
}

for (const enemy of [false, true]) {
  const target = enemy ? 'player' : 'later CPU';
  for (const fps of [30, 60, 144]) {
    bodyCase(`flagged bolt at 2 m clears the ${target} roof at ${fps} FPS`,
      {enemy, fps, height: 2}, false);
    bodyCase(`flagged bolt through the ${target} body hits at ${fps} FPS`,
      {enemy, fps}, true);
    // Neither end overlaps in Y: the car rises through a stationary-height
    // bolt while their horizontal paths cross in the middle of this step.
    bodyCase(`flagged bolt hits a vertically crossing ${target} at ${fps} FPS`,
      {enemy, fps, startAir: 0, endAir: 8, height: 4.5}, true);
  }
  bodyCase(`flagged bolt below an airborne ${target} misses`,
    {enemy, startAir: 3, height: 2}, false);
  // Horizontal overlap is around t=.5, but vertical overlap only near t=1.
  // Independent XZ and Y hits at different times must not count as contact.
  bodyCase(`flagged bolt misses the ${target} when horizontal and vertical overlaps occur at different times`,
    {enemy, startAir: 0, endAir: 8, height: 8}, false);
}

bodyCase('flagged bolt at 1.5 m clears the Viper roof',
  {car: 'viper_proto', height: 1.5}, false);
bodyCase('flagged bolt at 3 m hits the taller Titan body',
  {car: 'titan_monster', height: 3}, true);
bodyCase('flagged bolt at 4 m clears the Titan roof',
  {car: 'titan_monster', height: 4}, false);

test('legacy bolts and other weapon outcomes keep the body-height control fingerprint', () => {
  bodyChecks++;
  const controls = [
    {wasteland2: false, height: 2},
    {wasteland2: false, height: 2, enemy: true},
    {kind: 'bomb', height: 2},
    {kind: 'rpg', height: 2},
  ].map(options => ({options, result: bodyContact(options)}));
  const expected = JSON.parse(readFileSync(new URL(
    './replays/projectile-height-controls.json', import.meta.url), 'utf8'));
  assert.deepEqual(controls, expected.outcomes,
    'height correction must preserve legacy bolts and other weapons');
  assert.equal(createHash('sha256').update(JSON.stringify(controls)).digest('hex'),
    expected.sha256, 'unchanged weapon control fingerprint');
});

test.after(() => console.log(`Projectile body bounds: ${bodyChecks} checks executed.`));
