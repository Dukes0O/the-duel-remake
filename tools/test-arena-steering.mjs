import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {CARS, COURSE, DRIVE, steeringYawAuthority} from '../src/config.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {arenaCarSpec, pilotStep} from '../src/arena/arena-pilot.js';
import {arenaFloorSpeed} from '../src/arena/venues.js';
import {startWarlordEvent, beginWarlordEvent} from '../src/arena/warlord-event.js';
import {thinkBrain} from '../src/arena/arena-brains.js';

const DT = 1 / 120, DEG = 180 / Math.PI;
const flags = () => createFeatureFlags({storage: null, qa: true, search: '?flags=warlords'});
const fixturePath = new URL('./replays/arena-steering-controls.json', import.meta.url);
const failures = [];
let checks = 0;
function check(name, run) {
  checks++;
  try { run(); } catch (error) { failures.push(name + ': ' + error.message); }
}
function hash(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function arena(car = 'falcone_f42', mode = 'last-car-rolling') {
  const duel = new Duel({seed: 1989, featureFlags: flags()});
  if (mode === 'warlord') {
    assert.equal(startWarlordEvent(duel, {warlordId: 'sal', car, seed: 1989, cpuDifficulty: 'medium'}), true);
    assert.equal(beginWarlordEvent(duel), true);
  } else assert.equal(duel.startArenaEvent({car, seed: 1989, cpuDifficulty: 'medium',
    opponents: [{car, brain: 'rammer'}]}), true);
  duel.state.status = 'racing'; duel.state.countdown = 0; duel.state.arena.phase = 'fighting';
  return duel;
}
// Reset position, not steering physics, between samples. This isolates a
// driver's turn from walls, collisions, ramps and changes in requested speed.
function pose(duel, actor, speed) {
  Object.assign(actor, {s: duel.course.length * .18, prevS: duel.course.length * .18,
    lateral: 0, prevLateral: 0, headingError: 0, speedMph: speed,
    gear: speed < 0 ? -1 : 0, airborne: false, airHeight: 0, impactTimer: 0,
    knock: null, pushVelocity: 0});
}
function playerYaw(duel, speed, steer = 1) {
  const state = duel.state;
  pose(duel, state, speed);
  state.steerVisual = steer; state.yawVelocity = 0;
  duel.setInput({steer, throttle: 0, brake: 0, boost: false});
  duel.step(DT);
  assert.equal(state.status, 'racing', 'real arena event must still be running');
  assert.equal(state.knock, null, 'turn must not be produced by a crash');
  assert.equal(state.airborne, false, 'turn must be measured on the floor');
  return state.yawVelocity / (1 - Math.exp(-DRIVE.yawResponse * DT));
}
function cpuGoal(duel, actor, steer = 1, steeringScale = 1) {
  const at = duel.course.worldAt(actor.s, actor.lateral);
  const heading = duel.course.at(actor.s).heading + actor.headingError;
  return {x: at.x + Math.sin(heading - steer * .9) * 15,
    z: at.z + Math.cos(heading - steer * .9) * 15,
    speedMph: Math.abs(actor.speedMph), boost: false, steeringScale};
}
function cpuYaw(duel, speed, scale = 1) {
  const actor = duel.state.opponents[0];
  pose(duel, actor, speed); actor.steerVisual = 1; actor.yawVelocity = 0;
  pilotStep(duel, actor, cpuGoal(duel, actor, 1, scale), DT);
  assert.ok(actor.steerVisual > .99, 'CPU fixture must request full lock');
  return actor.yawVelocity / (1 - Math.exp(-DRIVE.yawResponse * DT));
}
function releasedAuthority(speed, grip, traction, car) {
  const assisted = car?.lowSpeedSteer === true;
  const rolling = Math.min(1, assisted && speed > 3 ? Math.max(speed / 30, .55) : Math.max(0, speed) / 30);
  const steeringGrip = assisted && speed < 45 ? Math.max(grip, 1) : grip;
  const highSpeed = 1 / (1 + Math.max(0, speed - 110) * .0022);
  const steeringLimit = DRIVE.yawRate * rolling * highSpeed * steeringGrip * traction;
  const tireLimit = DRIVE.maxLateralAccel * steeringGrip * traction / Math.max(8, speed * DRIVE.mphToWorld);
  return Math.min(steeringLimit, tireLimit);
}
function roadReplay(car, course = 'pacific-canyon') {
  const duel = new Duel({seed: 1989, featureFlags: flags()});
  duel.startCampaign({car, seed: 1989, mode: 'duel', difficulty: 'casual', cpuDifficulty: 'medium',
    startStage: COURSE.findIndex(def => def.id === course)});
  duel.state.status = 'racing'; duel.state.countdown = 0;
  const samples = [];
  for (let tick = 0; tick < 360; tick++) {
    duel.setInput({throttle: tick < 240 ? 1 : .5, brake: 0, steer: tick < 120 ? .08 : -.12, boost: false});
    duel.step(DT);
    if (tick % 120 === 119) samples.push(structuredClone(duel.state));
  }
  assert.ok(duel.state.s > 20, 'road replay must drive');
  return hash(samples);
}
function arenaReplay(mode, fps = 60) {
  const duel = arena('falcone_f42', mode), samples = [];
  let tick = 0;
  // Graphics frames schedule identical fixed simulation ticks, as the game does.
  for (let frame = 1; frame <= fps * 12; frame++) {
    const target = Math.floor(frame * 120 / fps + 1e-9);
    while (tick < target) {
      duel.setInput({throttle: 1, brake: tick >= 800 ? .1 : 0,
        steer: tick < 400 ? 1 : tick < 800 ? -.6 : 0, boost: false});
      duel.step(DT); tick++;
      if (tick % 120 === 0) samples.push(structuredClone(duel.state));
    }
  }
  assert.equal(tick, 1440);
  return hash(samples);
}
if (process.argv.includes('--record-controls')) {
  writeFileSync(fixturePath, JSON.stringify({version: 1, seed: 1989, stepHz: 120, ticks: 360,
    baselineCommit: '390454a', description: 'Released road full-state controls before ARENA-STEER; all cars plus Titan High Country.',
    cases: [...Object.keys(CARS).map(car => ({car, course: 'pacific-canyon', fingerprint: roadReplay(car)})),
      {car: 'titan_monster', course: 'high-country', fingerprint: roadReplay('titan_monster', 'high-country')}]}, null, 2) + '\n');
  console.log('Arena steering: recorded road controls; arena before-change hashes ' +
    JSON.stringify(Object.fromEntries(['last-car-rolling', 'warlord'].map(mode => [mode, arenaReplay(mode)]))));
  process.exit(0);
}
for (const car of Object.keys(CARS)) {
  const duel = arena(car), cpuSpec = arenaCarSpec(duel, duel.state.opponents[0]);
  for (const speed of [15, 25, 35, 45, 50]) {
    check(car + ' player full lock at ' + speed + ' mph', () => {
      const yaw = Math.abs(playerYaw(duel, speed)) * DEG;
      assert.ok(yaw >= 100, 'arena player requires >=100 deg/s, got ' + yaw.toFixed(3));
    });
    check(car + ' CPU full lock at ' + speed + ' mph', () => {
      const yaw = Math.abs(cpuYaw(duel, speed)) * DEG;
      assert.ok(yaw >= 100, 'arena CPU requires >=100 deg/s, got ' + yaw.toFixed(3));
    });
  }
  check(car + ' player full lock at its floor top speed', () => {
    const top = arenaFloorSpeed(duel.course.def.scrapdome, duel.car.topSpeed);
    const yaw = Math.abs(playerYaw(duel, top)) * DEG;
    assert.ok(yaw >= 75, 'arena player floor-top requires >=75 deg/s, got ' + yaw.toFixed(3));
  });
  check(car + ' CPU full lock at its floor top speed', () => {
    const top = arenaFloorSpeed(duel.course.def.scrapdome, cpuSpec.topSpeed);
    const yaw = Math.abs(cpuYaw(duel, top)) * DEG;
    assert.ok(yaw >= 75, 'arena CPU floor-top requires >=75 deg/s, got ' + yaw.toFixed(3));
  });
  check(car + ' sustained full lock has finite bounded yaw without oscillation', () => {
    const state = duel.state;
    state.steerVisual = 1; state.yawVelocity = 0;
    duel.setInput({steer: 1, throttle: 0, brake: 0, boost: false});
    const limit = steeringYawAuthority(45 - DRIVE.dragCoeff * DT, duel.car.grip, .95, duel.car, duel.course);
    for (let tick = 0; tick < 120; tick++) {
      pose(duel, state, 45); const prior = state.yawVelocity; duel.step(DT);
      assert.ok(Number.isFinite(state.yawVelocity) && state.yawVelocity <= 0 &&
        Math.abs(state.yawVelocity) >= Math.abs(prior) - 1e-12 && Math.abs(state.yawVelocity) <= limit + 1e-10,
        'full-lock yaw must approach one finite limit without oscillating');
    }
  });
  check(car + ' CPU released steering also settles within 0.3 s', () => {
    const actor = duel.state.opponents[0];
    actor.steerVisual = 1;
    actor.yawVelocity = -steeringYawAuthority(45, cpuSpec.grip, 1, cpuSpec, duel.course);
    const full = Math.abs(actor.yawVelocity);
    for (let tick = 0; tick < 36; tick++) {
      pose(duel, actor, 45); const prior = actor.yawVelocity;
      pilotStep(duel, actor, cpuGoal(duel, actor, 0), DT);
      assert.ok(actor.yawVelocity <= 1e-12 && Math.abs(actor.yawVelocity) <= Math.abs(prior) + 1e-12,
        'released CPU yaw must decay without sign reversal');
    }
    assert.ok(Math.abs(actor.yawVelocity) <= full * .015, 'CPU yaw must settle below 1.5% in 0.3 s');
  });
  check(car + ' standstill and reverse steering remain finite and signed', () => {
    assert.equal(playerYaw(duel, 0), 0);
    const forward = playerYaw(duel, 12), reverse = playerYaw(duel, -12);
    assert.ok(Number.isFinite(reverse) && forward < 0 && reverse > 0);
  });
  check(car + ' released stick settles yaw within 0.3 s without oscillation', () => {
    playerYaw(duel, 45);
    const state = duel.state;
    // Begin from a settled full-lock yaw, then use the real player integration.
    state.yawVelocity = -steeringYawAuthority(45, duel.car.grip, .95, duel.car, duel.course);
    const full = Math.abs(state.yawVelocity);
    duel.setInput({steer: 0, throttle: 0, brake: 0, boost: false});
    for (let tick = 0; tick < 36; tick++) {
      pose(duel, state, 45); const prior = state.yawVelocity; duel.step(DT);
      assert.ok(state.yawVelocity <= 1e-12 && Math.abs(state.yawVelocity) <= Math.abs(prior) + 1e-12,
        'released yaw must decay monotonically without reversing');
    }
    assert.ok(Math.abs(state.yawVelocity) <= full * .015, 'yaw must settle below 1.5% in 0.3 s');
  });
}
for (const def of [{kind: 'arena'}, {venue: true}, {arena: true}, ...COURSE]) {
  check('non-venue course ' + (def.id || JSON.stringify(def)) + ' preserves exact steering formula', () => {
    for (const car of Object.values(CARS)) for (const speed of [0, 3, 12, 25, 44.999, 45, 50, 70, 180])
      for (const traction of [.55, .95, 1]) {
        assert.equal(steeringYawAuthority(speed, car.grip, traction, car, {def}),
          releasedAuthority(speed, car.grip, traction, car), 'road/Muddy/Titan authority changed');
        assert.equal(steeringYawAuthority(speed, car.grip, traction),
          releasedAuthority(speed, car.grip, traction, null), 'legacy three-argument authority changed');
        assert.equal(steeringYawAuthority(speed, car.grip, traction, car),
          releasedAuthority(speed, car.grip, traction, car), 'legacy four-argument authority changed');
      }
  });
}
for (const speed of [15, 25, 45]) check('Sal fight player full lock at ' + speed + ' mph', () => {
  const yaw = Math.abs(playerYaw(arena('falcone_f42', 'warlord'), speed)) * DEG;
  assert.ok(yaw >= 100, 'warlord venue requires >=100 deg/s, got ' + yaw.toFixed(3));
});
check('Sal window physically halves the same arena steering authority', () => {
  const duel = arena('falcone_f42', 'warlord'), actor = duel.state.opponents[0];
  const participant = duel.state.arena.participants[1];
  actor.salSaw = {...actor.salSaw, stage: 'window', phase: 'sparking',
    untilSec: duel.state.stageTimeSec + 2, runHeading: duel.course.at(actor.s).heading};
  const goal = thinkBrain(duel, participant, actor, DT);
  assert.equal(goal.steeringScale, .5, 'actual vulnerability window must request half authority');
  const normal = cpuYaw(duel, 35), window = cpuYaw(duel, 35, goal.steeringScale);
  assert.ok(Math.abs(window - normal * .5) < 1e-12, 'Sal physical yaw must halve exactly');
  assert.ok(Math.abs(normal) * DEG >= 100, 'Sal must also receive the tighter normal arena steering');
});
const controls = JSON.parse(readFileSync(fixturePath, 'utf8'));
for (const spec of controls.cases) check(spec.car + '/' + spec.course + ' unchanged full-state road fingerprint', () => {
  assert.equal(roadReplay(spec.car, spec.course), spec.fingerprint);
});
for (const mode of ['last-car-rolling', 'warlord']) check(mode + ' seeded replay repeats at 30/60/144 graphics fps', () => {
  const baseline = arenaReplay(mode, 60);
  assert.equal(arenaReplay(mode, 60), baseline, 'same seeded run must repeat');
  assert.equal(arenaReplay(mode, 30), baseline, '30 fps must schedule identical physical ticks');
  assert.equal(arenaReplay(mode, 144), baseline, '144 fps must schedule identical physical ticks');
});
console.log('Arena steering: ' + checks + ' checks, ' + failures.length + ' failures.');
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
