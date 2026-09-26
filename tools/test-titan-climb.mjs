import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Duel } from '../src/game.js';
import { CARS, COURSE } from '../src/config.js';
import { offroadCapability } from '../src/offroad-physics.js';

const dt = 1 / 120;
const practice = COURSE.findIndex(course => course.practice);
const failures = [];
let checks = 0;

function check(name, run) {
  checks++;
  try { run(); } catch (error) { failures.push(`${name}: ${error.message}`); }
}

function game(car, height) {
  const duel = new Duel({ seed: 1989 });
  duel.startCampaign({ car, startStage: practice, difficulty: 'casual', mode: 'timetrial' });
  duel.state.status = 'racing';
  const point = (s, lateral = 0) => ({ x: lateral, y: height(s, lateral), z: s, heading: 0, curvature: 0 });
  duel.course = {
    def: { id: 'titan-climb-test', practice: true, kind: 'arena', theme: 'desert' },
    closed: false,
    length: 10000,
    raceLength: 20000,
    features: { obstacles: [], mountains: [], ramps: [], crushables: [], shortcuts: [], flocks: [] },
    at: point,
    worldAt: point,
    groundAt: point,
    nearest: (x, z) => ({ s: z, lateral: x }),
    phase: s => s,
    surfaceAt: (_, lateral) => ({ mainRoad: Math.abs(lateral) <= 7, road: Math.abs(lateral) <= 7, roadHalfWidth: 7 }),
    themeAt: () => 'desert',
    roadHalfWidthAt: () => 7,
    nearestRadar: () => null,
    obstaclesNear: () => [],
  };
  duel._obstacleArray = [];
  duel._obstacleQueryCache.clear();
  duel._lapGates = [];
  Object.assign(duel.state, {
    s: 20,
    prevS: 20,
    lateral: 30,
    prevLateral: 30,
    speedMph: 0,
    headingError: 0,
    yawVelocity: 0,
  });
  return duel;
}

function runClimb(car, grade, targetRise, seconds = 30) {
  const start = 25;
  const height = s => Math.max(0, Math.min(targetRise, (s - start) * grade));
  const duel = game(car, height);
  duel.setInput({ throttle: 1 });
  let peak = 0;
  for (let i = 0; i < seconds / dt && !duel.state.tumble && peak < targetRise - .01; i++) {
    duel.step(dt);
    peak = Math.max(peak, duel._supportAt(duel.state.s, duel.state.lateral).y);
  }
  return { duel, peak };
}

function speedAfterSlope(car, grade) {
  const duel = game(car, s => s * grade);
  Object.assign(duel.state, { s: 200, prevS: 200, speedMph: 40, gear: 1 });
  duel.setInput({ throttle: 0, brake: 0, steer: 0, boost: false });
  for (let i = 0; i < 120; i++) duel.step(dt);
  return duel.state.speedMph;
}

const fortyDegrees = Math.tan(40 * Math.PI / 180);
const titanClimb = runClimb('titan_monster', fortyDegrees, 60);
check('Titan climbs the full 60 m rise on a 40 degree slope', () => {
  assert.ok(titanClimb.peak >= 59.99,
    `Titan reached only ${titanClimb.peak.toFixed(3)} m before the climb ended`);
});
check('Titan does not tip on a 40 degree slope below maxGrade', () => {
  assert.equal(titanClimb.duel.state.tumble, null,
    `Titan tipped for ${titanClimb.duel.state.tumble?.reason || 'an unknown reason'}`);
});

check('Titan still tips when the local slope exceeds maxGrade', () => {
  const capability = offroadCapability(CARS.titan_monster);
  const result = runClimb('titan_monster', capability.maxGrade + .2, 10, 5);
  assert.equal(result.duel.state.tumble?.reason, 'climb_limit',
    `over-grade Titan did not tip; reached ${result.peak.toFixed(3)} m`);
});

check('Rally retains its lower accumulated-climb limit', () => {
  const capability = offroadCapability(CARS.dusthawk_rally);
  const result = runClimb('dusthawk_rally', fortyDegrees, 30, 15);
  assert.equal(result.duel.state.tumble?.reason, 'climb_limit', 'rally did not tip at its existing climb limit');
  assert.ok(result.peak <= capability.climbGain + .1,
    `rally exceeded its ${capability.climbGain} m climb limit by reaching ${result.peak.toFixed(3)} m`);
});

for (const car of ['titan_monster', 'dusthawk_rally']) check(`${car} loses speed uphill and gains speed downhill`, () => {
  const uphill = speedAfterSlope(car, .3);
  const flat = speedAfterSlope(car, 0);
  const downhill = speedAfterSlope(car, -.3);
  assert.ok(uphill < flat - 1e-6,
    `${car} uphill ${uphill.toFixed(6)} mph was not below flat ${flat.toFixed(6)} mph`);
  assert.ok(downhill > flat + 1e-6,
    `${car} downhill ${downhill.toFixed(6)} mph was not above flat ${flat.toFixed(6)} mph`);
});

check('ordinary cars keep slope-neutral driving', () => {
  assert.equal(offroadCapability(CARS.falcone_f42), null, 'ordinary car gained an off-road climbing capability');
  const speeds = [.3, 0, -.3].map(grade => speedAfterSlope('falcone_f42', grade));
  assert.ok(Math.max(...speeds) - Math.min(...speeds) < 1e-9,
    `ordinary slope speeds changed: ${speeds.map(speed => speed.toFixed(6)).join(', ')}`);
});

check('recorded replay fingerprints remain unchanged', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const replay = spawnSync(process.execPath, ['tools/test-replays.mjs'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 180000,
  });
  assert.equal(replay.status, 0,
    `replay suite failed: ${(replay.stderr || replay.stdout || 'no output').trim().split('\n').slice(-3).join(' | ')}`);
});

console.log(`Titan climb: ${checks} checks, ${failures.length} failures.`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
}
