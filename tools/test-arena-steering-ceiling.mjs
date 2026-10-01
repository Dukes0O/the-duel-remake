import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {BOOST, CARS, COURSE, DRIVE, steeringYawAuthority} from '../src/config.js';
import {DRIVERS} from '../src/drivers.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {arenaCarSpec, pilotStep} from '../src/arena/arena-pilot.js';
import {arenaFloorSpeed} from '../src/arena/venues.js';
import {beginWarlordEvent, startWarlordEvent} from '../src/arena/warlord-event.js';
import {thinkBrain} from '../src/arena/arena-brains.js';

const DT = 1 / 120, DEG = 180 / Math.PI, EPSILON = 1e-8;
const failures = [];
let checks = 0;
function check(name, run) {
  checks++;
  try { run(); } catch (error) { failures.push(name + ': ' + error.message); }
}
const flags = () => createFeatureFlags({storage: null, qa: true, search: '?flags=warlords'});
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function arena(car, variant = 'stock', mode = 'last-car-rolling') {
  const driverId = variant === 'max-specialist'
    ? Object.values(DRIVERS).find(driver => driver.cars.includes(car))?.id || 'club' : 'club';
  const upgrades = variant === 'engine-only' ? {engine: 3} : variant === 'max-specialist'
    ? {engine: 3, nitro: 3, handling: 3, tires: 3, brakes: 3, suspension: 3, tank: 3} : {};
  const duel = new Duel({seed: 1989, featureFlags: flags()});
  if (mode === 'warlord') {
    assert.equal(startWarlordEvent(duel, {car, driverId, upgrades, warlordId: 'sal', seed: 1989,
      cpuDifficulty: 'medium'}), true);
    assert.equal(beginWarlordEvent(duel), true);
  } else assert.equal(duel.startArenaEvent({car, driverId, upgrades, seed: 1989,
    cpuDifficulty: 'medium', opponents: [{car, driverId, upgrades, brain: 'rammer'}]}), true);
  duel.state.status = 'racing'; duel.state.countdown = 0; duel.state.arena.phase = 'fighting';
  return duel;
}
// Keep the car on clear floor at the requested speed. Steering, yaw response,
// speed drag and the production floor traction still run in the real integrator.
function pose(duel, actor, speed) {
  Object.assign(actor, {s: duel.course.length * .18, prevS: duel.course.length * .18,
    lateral: 0, prevLateral: 0, headingError: 0, speedMph: speed, gear: speed < 0 ? -1 : 0,
    airborne: false, airHeight: 0, impactTimer: 0, knock: null, pushVelocity: 0});
  // A repeated position fixture has not actually stalled against a wall.
  // Restart only its distance-watch sample so the pilot does not reverse.
  actor._arenaWatch = null;
}
function goal(duel, actor, steer, steeringScale = 1) {
  const at = duel.course.worldAt(actor.s, actor.lateral);
  const heading = duel.course.at(actor.s).heading + actor.headingError;
  return {x: at.x + Math.sin(heading - steer * .9) * 15,
    z: at.z + Math.cos(heading - steer * .9) * 15,
    speedMph: Math.abs(actor.speedMph), boost: false, steeringScale};
}
function advance(duel, kind, speed, steer, scale = 1) {
  const actor = kind === 'player' ? duel.state : duel.state.opponents[0];
  pose(duel, actor, speed);
  if (kind === 'player') {
    duel.setInput({steer, throttle: 0, brake: 0, boost: false});
    duel.step(DT);
    assert.equal(actor.status, 'racing', 'measurement must remain in an actual arena fight');
  } else pilotStep(duel, actor, goal(duel, actor, steer, scale), DT);
  assert.equal(actor.knock, null, 'yaw must not come from a collision');
  assert.equal(actor.airborne, false, 'yaw must be measured on the floor');
  return actor;
}
function fullLock(duel, kind, speed, steer = 1, scale = 1) {
  const actor = kind === 'player' ? duel.state : duel.state.opponents[0];
  actor.steerVisual = steer; actor.yawVelocity = 0;
  advance(duel, kind, speed, steer, scale);
  assert.ok(Math.abs(actor.steerVisual - steer) < 1e-12, 'measurement must request actual full lock');
  // Undo only the known first-tick response filter to measure the yaw requested
  // by actual production driving. A sustained-turn check below measures raw yaw.
  return actor.yawVelocity / (1 - Math.exp(-DRIVE.yawResponse * DT));
}
function releasedAuthority(speed, grip, traction, car) {
  const assisted = car?.lowSpeedSteer === true;
  const rolling = Math.min(1, assisted && speed > 3
    ? Math.max(speed / 30, .55) : Math.max(0, speed) / 30);
  const steeringGrip = assisted && speed < 45 ? Math.max(grip, 1) : grip;
  const highSpeed = 1 / (1 + Math.max(0, speed - 110) * .0022);
  return Math.min(DRIVE.yawRate * rolling * highSpeed * steeringGrip * traction,
    DRIVE.maxLateralAccel * steeringGrip * traction / Math.max(8, speed * DRIVE.mphToWorld));
}

for (const car of Object.keys(CARS)) for (const variant of ['stock', 'engine-only', 'max-specialist']) {
  const duel = arena(car, variant), cpu = arenaCarSpec(duel, duel.state.opponents[0]);
  const label = car + '/' + variant;
  check(label + ' arena authority ceiling at any speed', () => {
    let worst = {yaw: 0, speed: 0, traction: 0};
    // Cover standstill, low-speed and grip boundaries, floor tops, boosting and
    // speeds above the floor cap. No formula shape or tuning number is required.
    const speeds = [3, 3.0001, 14.9999, 15, 29.9999, 30, 44.9999, 45, 50,
      arenaFloorSpeed(duel.course.def.scrapdome, duel.car.topSpeed)];
    for (let speed = 0; speed <= Math.max(400, duel.car.topSpeed * 1.3); speed += .25) speeds.push(speed);
    for (const speed of speeds) for (const traction of [.95, 1]) {
      const yaw = steeringYawAuthority(speed, duel.car.grip, traction, duel.car, duel.course) * DEG;
      assert.ok(Number.isFinite(yaw) && yaw >= 0, 'authority must remain finite and nonnegative');
      if (yaw > worst.yaw) worst = {yaw, speed, traction};
    }
    assert.ok(worst.yaw <= 150 + EPSILON, 'arena ceiling requires <=150 deg/s; got ' +
      worst.yaw.toFixed(3) + ' at ' + worst.speed + ' mph, traction ' + worst.traction);
  });
  for (const kind of ['player', 'CPU']) {
    const spec = kind === 'player' ? duel.car : cpu;
    const top = arenaFloorSpeed(duel.course.def.scrapdome, spec.topSpeed);
    check(label + ' ' + kind + ' actual full-lock ceiling both directions', () => {
      let worst = {yaw: 0, speed: 0, steer: 0};
      const boostFactor = BOOST.topSpeedMult + (kind === 'player'
        ? .025 * (duel.state.upgrades.nitro || 0) + (spec.nitroSpeedBonus || 0) : 0);
      const speeds = [-22, -12, 0, .1, 3, 3.0001, 7.5, 12, 15, 20, 25, 30, 35, 40, 45, 50,
        top, top * boostFactor];
      for (const speed of speeds) for (const steer of [-1, 1]) {
        const yaw = fullLock(duel, kind, speed, steer) * DEG;
        assert.ok(Number.isFinite(yaw), 'actual yaw must remain finite');
        assert.ok(yaw * steer * (speed < 0 ? -1 : 1) <= EPSILON,
          'actual yaw must have the requested forward/reverse turn sign');
        if (Math.abs(yaw) > worst.yaw) worst = {yaw: Math.abs(yaw), speed, steer};
      }
      assert.ok(worst.yaw <= 150 + EPSILON, 'actual full lock requires <=150 deg/s; got ' +
        worst.yaw.toFixed(3) + ' at ' + worst.speed.toFixed(3) + ' mph, steer ' + worst.steer);
    });
    check(label + ' ' + kind + ' actual 15-50 mph minimum both directions', () => {
      for (let speed = 15; speed <= 50; speed += 5) for (const steer of [-1, 1]) {
        const yaw = Math.abs(fullLock(duel, kind, speed, steer)) * DEG;
        assert.ok(yaw >= 100, 'actual full lock requires >=100 deg/s at ' + speed +
          ' mph, steer ' + steer + '; got ' + yaw.toFixed(3));
      }
    });
    check(label + ' ' + kind + ' actual floor-top minimum both directions', () => {
      for (const steer of [-1, 1]) {
        const yaw = Math.abs(fullLock(duel, kind, top, steer)) * DEG;
        assert.ok(yaw >= 75, 'floor-top requires >=75 deg/s; got ' + yaw.toFixed(3));
      }
    });
    check(label + ' ' + kind + ' sustained yaw stays bounded and release settles', () => {
      let worst = 0;
      for (const steer of [-1, 1]) {
        const actor = kind === 'player' ? duel.state : duel.state.opponents[0];
        actor.steerVisual = steer; actor.yawVelocity = 0;
        for (let tick = 0; tick < 72; tick++) {
          const prior = Math.abs(actor.yawVelocity);
          advance(duel, kind, 45, steer);
          assert.ok(Number.isFinite(actor.yawVelocity) && actor.yawVelocity * steer <= EPSILON &&
            Math.abs(actor.yawVelocity) >= prior - 1e-12, 'held steering must settle without oscillation');
        }
        const full = Math.abs(actor.yawVelocity);
        worst = Math.max(worst, full * DEG);
        for (let tick = 0; tick < 36; tick++) {
          const prior = Math.abs(actor.yawVelocity);
          advance(duel, kind, 45, 0);
          assert.ok(actor.yawVelocity * steer <= EPSILON && Math.abs(actor.yawVelocity) <= prior + 1e-12,
            'released steering must decay without reversing or oscillating');
        }
        assert.ok(Math.abs(actor.yawVelocity) <= full * .015, 'release must settle below 1.5% within 0.3 s');
      }
      assert.ok(worst <= 150 + EPSILON, 'sustained actual yaw requires <=150 deg/s; got ' + worst.toFixed(3));
    });
  }
}

for (const car of Object.values(CARS)) check(car.id + ' released road/Muddy/Titan authority unchanged', () => {
  for (const def of [...COURSE, {arena: true}, {venue: true}, {kind: 'arena'}])
    for (const speed of [0, 3, 3.0001, 12, 15, 25, 44.9999, 45, 50, 70, 110, 180, 300])
      for (const traction of [.55, .95, 1]) {
        assert.equal(steeringYawAuthority(speed, car.grip, traction, car, {def}),
          releasedAuthority(speed, car.grip, traction, car), 'non-venue handling must keep its exact released formula');
        assert.equal(steeringYawAuthority(speed, car.grip, traction, car),
          releasedAuthority(speed, car.grip, traction, car), 'four-argument road caller must stay unchanged');
      }
});
for (const car of Object.keys(CARS)) {
  const duel = arena(car, 'stock', 'warlord');
  check(car + ' Sal fight actual player has the same ceiling and floors', () => {
    for (const speed of [15, 25, 45, 50]) for (const steer of [-1, 1]) {
      const yaw = Math.abs(fullLock(duel, 'player', speed, steer)) * DEG;
      assert.ok(yaw >= 100 && yaw <= 150 + EPSILON,
        'Sal fight full lock must be 100-150 deg/s; got ' + yaw.toFixed(3) + ' at ' + speed + ' mph');
    }
  });
}
check('Sal actual window halves the bounded shared authority', () => {
  const duel = arena('falcone_f42', 'stock', 'warlord'), actor = duel.state.opponents[0];
  actor.salSaw = {...actor.salSaw, stage: 'window', phase: 'sparking',
    untilSec: duel.state.stageTimeSec + 2, runHeading: duel.course.at(actor.s).heading};
  const intent = thinkBrain(duel, duel.state.arena.participants[1], actor, DT);
  assert.equal(intent.steeringScale, .5, 'actual Sal brain must request the half-steering window');
  for (const speed of [15, 25, 35, 45, 50]) for (const steer of [-1, 1]) {
    const normal = fullLock(duel, 'CPU', speed, steer);
    const window = fullLock(duel, 'CPU', speed, steer, intent.steeringScale);
    assert.ok(Math.abs(window - normal * .5) < 1e-12, 'actual pilot window must halve yaw exactly');
    assert.ok(Math.abs(normal) * DEG >= 100, 'Sal normal steering must keep the arena minimum');
  }
});

// Consume the original full-state road fingerprints; never record new values.
const controls = JSON.parse(readFileSync(new URL('./replays/arena-steering-controls.json', import.meta.url), 'utf8'));
for (const spec of controls.cases) check(spec.car + '/' + spec.course + ' original full-state road fingerprint', () => {
  const duel = new Duel({seed: controls.seed, featureFlags: flags()});
  duel.startCampaign({car: spec.car, seed: controls.seed, mode: 'duel', difficulty: 'casual',
    cpuDifficulty: 'medium', startStage: COURSE.findIndex(def => def.id === spec.course)});
  duel.state.status = 'racing'; duel.state.countdown = 0;
  const samples = [];
  for (let tick = 0; tick < controls.ticks; tick++) {
    duel.setInput({throttle: tick < 240 ? 1 : .5, brake: 0, steer: tick < 120 ? .08 : -.12, boost: false});
    duel.step(DT);
    if (tick % 120 === 119) samples.push(structuredClone(duel.state));
  }
  assert.ok(duel.state.s > 20, 'fingerprint control must actually drive');
  assert.equal(digest(samples), spec.fingerprint, 'released full-state road fingerprint must not change');
});
function arenaTrace(mode, fps) {
  const duel = arena('falcone_f42', 'stock', mode), samples = [];
  let tick = 0;
  for (let frame = 1; frame <= fps * 6; frame++) {
    const target = Math.floor(frame * 120 / fps + 1e-9);
    while (tick < target) {
      duel.setInput({throttle: 1, brake: 0, steer: tick < 360 ? 1 : -.6, boost: false});
      duel.step(DT); tick++;
      if (tick % 120 === 0) samples.push(structuredClone(duel.state));
    }
  }
  assert.equal(tick, 720);
  return digest(samples);
}
for (const mode of ['last-car-rolling', 'warlord']) check(mode + ' bounded steering repeats at 30/60/144 fps', () => {
  const expected = arenaTrace(mode, 60);
  assert.equal(arenaTrace(mode, 60), expected, 'same seed and inputs must repeat');
  assert.equal(arenaTrace(mode, 30), expected, '30 fps must schedule the same physics');
  assert.equal(arenaTrace(mode, 144), expected, '144 fps must schedule the same physics');
});
console.log('Arena steering ceiling: ' + checks + ' checks, ' + failures.length + ' failures.');
if (failures.length) { console.error(failures.join(String.fromCharCode(10))); process.exitCode = 1; }
