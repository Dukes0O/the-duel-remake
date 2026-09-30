import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {CARS, COURSE, DRIVE, steeringYawAuthority} from '../src/config.js';
import {pilotStep, arenaCarSpec} from '../src/arena/arena-pilot.js';

const STEP = 1 / 120;
const TITAN = 'titan_monster';
const others = Object.keys(CARS).filter(id => id !== TITAN);
const fixturePath = new URL('./replays/titan-handling.json', import.meta.url);
const failures = [];
let checks = 0;
function check(name, run) {
  checks++;
  try { run(); } catch (error) { failures.push(name + ': ' + error.message); }
}
function close(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) <= 1e-12,
    label + ': expected ' + expected + ', got ' + actual);
}
// Frozen pre-card rule. Keep the operation order so unchanged cases are exact.
function oldAuthority(speed, grip = 1, traction = 1) {
  const rolling = Math.min(1, Math.max(0, speed) / 30);
  const highSpeed = 1 / (1 + Math.max(0, speed - 110) * .0022);
  const steeringLimit = DRIVE.yawRate * rolling * highSpeed * grip * traction;
  const tireLimit = DRIVE.maxLateralAccel * grip * traction / Math.max(8, speed * DRIVE.mphToWorld);
  return Math.min(steeringLimit, tireLimit);
}
function titanAuthority(speed, grip, traction) {
  if (speed >= 45) return oldAuthority(speed, grip, traction);
  const rolling = Math.min(1, speed > 3 ? Math.max(speed / 30, .55) : Math.max(0, speed) / 30);
  const steeringGrip = Math.max(grip, 1);
  const steeringLimit = DRIVE.yawRate * rolling * steeringGrip * traction;
  const tireLimit = DRIVE.maxLateralAccel * steeringGrip * traction / Math.max(8, speed * DRIVE.mphToWorld);
  return Math.min(steeringLimit, tireLimit);
}
function straight(car, speed = 12, dirt = true, rival = false) {
  const duel = new Duel({seed: 1989, featureFlags: {'titan-climb': true}});
  duel.startCampaign({car, seed: 1989, startStage: rival ? 0 : COURSE.findIndex(def => def.practice),
    difficulty: 'casual', cpuDifficulty: 'medium', mode: rival ? 'duel' : 'timetrial'});
  const point = (s, lateral = 0) => ({x: lateral, y: 0, z: s, heading: 0, curvature: 0});
  duel.course = {
    def: {id: 'titan-handling-test', practice: !rival, theme: 'desert', kind: 'arena'},
    closed: false, length: 10000, raceLength: 20000,
    features: {obstacles: [], mountains: [], ramps: [], crushables: [], shortcuts: [], flocks: []},
    at: point, worldAt: point, groundAt: point,
    nearest: (x, z) => ({s: z, lateral: x}), phase: s => s,
    surfaceAt: () => ({mainRoad: !dirt, road: !dirt, roadHalfWidth: 7}),
    themeAt: () => 'desert', roadHalfWidthAt: () => 100,
    nearestRadar: () => null, obstaclesNear: () => [],
  };
  duel._obstacleArray = [];
  duel._obstacleQueryCache.clear();
  duel._lapGates = [];
  Object.assign(duel.state, {status: 'racing', countdown: 0, s: 500, prevS: 500,
    lateral: 30, prevLateral: 30, speedMph: speed, gear: speed < 0 ? -1 : 0,
    steerVisual: 1, yawVelocity: 0, headingError: 0, traffic: []});
  if (!rival) duel.state.opponents = [];
  duel.setInput({throttle: 0, brake: 0, steer: 1, boost: false});
  return duel;
}
function playerTurn(car, speed) {
  const duel = straight(car, speed);
  duel.step(STEP);
  assert.equal(duel.state.status, 'racing', 'fixture must remain in the driving simulation');
  assert.equal(duel.state.tumble, null, 'fixture must not tumble');
  assert.ok(duel.state.offRoad, 'turn comparison must run on dirt');
  return duel;
}
function replay(car) {
  const duel = new Duel({seed: 1989});
  duel.startCampaign({car, seed: 1989, startStage: 0, mode: 'duel', difficulty: 'casual', cpuDifficulty: 'medium'});
  Object.assign(duel.state, {status: 'racing', countdown: 0});
  const samples = [];
  duel.setInput({throttle: 1, brake: 0, steer: .08});
  for (let tick = 1; tick <= 360; tick++) {
    if (tick === 120) duel.setInput({throttle: .5, brake: .1, steer: -.12});
    if (tick === 240) duel.setInput({throttle: 1, brake: 0, steer: .04});
    duel.step(STEP);
    if (tick % 120 === 0) samples.push(structuredClone(duel.state));
  }
  assert.ok(duel.state.s > 20, car + ': seeded fixture must drive');
  return createHash('sha256').update(JSON.stringify(samples)).digest('hex');
}
if (process.argv.includes('--record')) {
  writeFileSync(fixturePath, JSON.stringify({version: 1, seed: 1989, stepHz: 120, durationTicks: 360,
    baselineCommit: '58cf295b84029ba5b018d41302760d490c4a21b2',
    description: 'Pre-TITAN-HANDLING full-state seeded Pacific Canyon runs for every non-Titan car.',
    fingerprints: Object.fromEntries(others.map(car => [car, replay(car)]))}, null, 2) + '\n');
  console.log('Titan handling: recorded ' + others.length + ' non-Titan fingerprints.');
  process.exit(0);
}

check('only Titan opts into low-speed steering', () => {
  assert.equal(CARS[TITAN].lowSpeedSteer, true, 'Titan must declare lowSpeedSteer: true');
  assert.ok(others.every(id => !CARS[id].lowSpeedSteer), 'another car opted into Titan steering');
});
for (const speed of [0, 3, 3.001, 12, 16.5, 25, 30, 44.999]) {
  check('Titan settled rolling/grip rule at ' + speed + ' mph', () => {
    for (const traction of [.55, .96, 1, 1.05]) {
      close(steeringYawAuthority(speed, .91, traction, CARS[TITAN]), titanAuthority(speed, .91, traction),
        'Titan yaw authority at ' + speed + ' mph and traction ' + traction);
    }
  });
}
check('Titan steering grip floor never reduces an upgraded grip', () => {
  for (const grip of [1, 1.1, 1.2]) {
    close(steeringYawAuthority(12, grip, .96, CARS[TITAN]), titanAuthority(12, grip, .96),
      'upgraded Titan grip ' + grip);
  }
});
for (const speed of [45, 70, 110, 180]) {
  check('Titan retains exact old authority at ' + speed + ' mph', () => {
    for (const grip of [.91, 1.1]) for (const traction of [.55, 1, 1.05]) {
      assert.equal(steeringYawAuthority(speed, grip, traction, CARS[TITAN]), oldAuthority(speed, grip, traction));
    }
  });
}
check('three-argument callers retain the exact old steering rule', () => {
  for (const speed of [0, 3, 3.001, 12, 25, 30, 44.999, 45, 70, 110, 180]) {
    assert.equal(steeringYawAuthority(speed, .91, .96), oldAuthority(speed, .91, .96));
  }
});
for (const id of others) {
  check(id + ' retains exact old steering at every boundary', () => {
    for (const speed of [0, 3, 3.001, 12, 25, 30, 44.999, 45, 70, 110, 180]) {
      for (const traction of [.55, .96, 1]) {
        assert.equal(steeringYawAuthority(speed, CARS[id].grip, traction, CARS[id]),
          oldAuthority(speed, CARS[id].grip, traction), id + ' changed at ' + speed + ' mph');
      }
    }
  });
}
for (const speed of [12, 25]) {
  check('actual dirt driving: Titan turns at least as fast as Rally at ' + speed + ' mph', () => {
    const titan = playerTurn(TITAN, speed), rally = playerTurn('dusthawk_rally', speed);
    assert.ok(Math.abs(titan.state.yawVelocity) >= Math.abs(rally.state.yawVelocity),
      'Titan turn rate ' + Math.abs(titan.state.yawVelocity) + ' is below Rally ' + Math.abs(rally.state.yawVelocity));
    assert.ok(titan.state.headingError < 0 && titan.state.lateral < 30, 'actual Titan pose must turn toward the input');
  });
}
check('actual reverse driving applies Titan assistance with opposite yaw', () => {
  const duel = playerTurn(TITAN, -12);
  const steeringSpeed = 12 - DRIVE.dragCoeff * STEP;
  close(duel.state.yawVelocity, titanAuthority(steeringSpeed, duel.car.grip, duel.car.offRoadGrip) *
    (1 - Math.exp(-DRIVE.yawResponse * STEP)), 'reverse Titan yaw');
  assert.ok(duel.state.headingError > 0 && duel.state.s < 500, 'reverse must turn the nose oppositely while moving backward');
});
check('actual 70 mph Titan player turn retains the old curve', () => {
  const duel = playerTurn(TITAN, 70);
  const steeringSpeed = 70 - DRIVE.dragCoeff * STEP;
  close(duel.state.yawVelocity, -oldAuthority(steeringSpeed, duel.car.grip, duel.car.offRoadGrip) *
    (1 - Math.exp(-DRIVE.yawResponse * STEP)), '70 mph player yaw');
});
check('arena computer Titan uses its actual car and the same low-speed curve', () => {
  const duel = straight('falcone_f42');
  const actor = {car: TITAN, s: 500, lateral: 0, speedMph: 12, steerVisual: 1, yawVelocity: 0, headingError: 0};
  const spec = arenaCarSpec(duel, actor);
  pilotStep(duel, actor, {x: -20, z: 520, speedMph: 12, boost: false}, STEP);
  close(actor.yawVelocity, -actor.steerVisual * titanAuthority(12, spec.grip, 1) *
    (1 - Math.exp(-DRIVE.yawResponse * STEP)), 'arena Titan yaw');
  assert.ok(actor.headingError < 0 && actor.lateral < 0, 'arena Titan must physically turn');
  assert.equal(actor.speedMph, 12, 'steering assistance must not alter the requested pace');
});
check('arena ordinary car keeps the old curve while the player drives Titan', () => {
  const duel = straight(TITAN);
  const actor = {car: 'falcone_f42', s: 500, lateral: 0, speedMph: 12, steerVisual: 1, yawVelocity: 0, headingError: 0};
  const spec = arenaCarSpec(duel, actor);
  pilotStep(duel, actor, {x: -20, z: 520, speedMph: 12, boost: false}, STEP);
  close(actor.yawVelocity, -actor.steerVisual * oldAuthority(12, spec.grip, 1) *
    (1 - Math.exp(-DRIVE.yawResponse * STEP)), 'ordinary arena yaw');
});
check('road computer Titan follows its route with the same low-speed curve', () => {
  const duel = straight('falcone_f42', 0, true, true), rival = duel.state.rival;
  rival.car = TITAN;
  duel.rivalSpec = CARS[TITAN];
  Object.assign(rival, {s: 20, prevS: 20, lateral: 30, speedMph: 12, headingError: 0, pushVelocity: 0});
  // Fixed route intent isolates physical turning from the route planner's strategy.
  duel._npcRoutePlanner = {course: duel.course, car: duel.rivalSpec,
    update: () => ({routeId: 'test-route', targetSpeedMph: 12, headingTarget: .5, curvature: 0, targetLateral: 30})};
  duel.step(STEP);
  close(rival.headingError / STEP, titanAuthority(rival.speedMph, duel.rivalSpec.grip, duel.rivalSpec.offRoadGrip),
    'rival route-limited yaw');
  assert.ok(rival.s > 20 && rival.headingError > 0, 'road computer must turn by physical motion');
  assert.ok(rival.speedMph <= 12, 'steering assistance must not increase route speed');
});
check('demo controller supplies steering using the actual Titan authority', () => {
  const duel = straight(TITAN);
  // The existing demo method is used without constructing App or touching storage.
  const lane = -Math.min(DRIVE.laneOffset, 7 * .48);
  Object.assign(duel.state, {lateral: lane, prevLateral: lane, headingError: .03});
  duel.course.roadHalfWidthAt = () => 7;
  App.prototype._driveAutopilot.call({duel, _scriptedCrashDone: true}, STEP);
  const authority = titanAuthority(12, duel.car.grip, duel.car.offRoadGrip);
  close(duel.state.input.steer, .18 / authority, 'demo steering input');
  assert.ok(duel.state.input.steer > 0 && duel.state.input.steer < 1, 'fixture must exercise unsaturated demo steering');
});
const baseline = JSON.parse(readFileSync(fixturePath, 'utf8'));
check('non-Titan replay fixture covers the complete unchanged car roster', () => {
  assert.deepEqual(Object.keys(baseline.fingerprints).sort(), [...others].sort());
  assert.equal(baseline.stepHz, 120);
  assert.equal(baseline.durationTicks, 360);
});
for (const id of others) {
  check(id + ' full-state seeded race fingerprint remains unchanged', () => {
    assert.equal(replay(id), baseline.fingerprints[id], id + ': non-Titan race state changed');
  });
}
console.log('Titan handling: ' + checks + ' checks, ' + failures.length + ' failures.');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
}
