import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {createCombat, fireWeapon, point, predictedPoint} from '../src/combat-weapons.js';
import {stepCombatAI} from '../src/combat-ai.js';
import {stepProjectiles} from '../src/combat-projectiles.js';
import {initializeCombatArmor} from '../src/combat-armor.js';
import {stepRaiders} from '../src/raiders.js';
import {makeRng} from '../src/rng.js';
import {CPU_COMBAT, COMBAT_TUNING as T} from '../src/wasteland-tuning.js';

// BUG-07: production fire/steering rules on a flat, empty course. Removing
// scenery and elevation makes a change in angular aim error observable without
// running another campaign or balance report. No browser or storage is used.
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const heading = bolt => Math.atan2(bolt.vx, bolt.vz);
const round = number => +number.toFixed(8);
const near = (actual, expected, tolerance, message) => assert.ok(
  Math.abs(actual - expected) <= tolerance,
  `${message}: expected ${expected}, got ${actual}`);
let checks = 0, failures = 0;
function check(name, run) {
  checks++;
  try { run(); }
  catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}

function actor(s, lateral = 0, speedMph = 0) {
  return {s, prevS: s, lateral, prevLateral: lateral, speedMph,
    headingError: 0, pushVelocity: 0, airHeight: 0, prevAirHeight: 0,
    impactTimer: 0, combatShield: 0, finished: false, crushed: false,
    car: 'falcone_f42', dir: 1};
}

function field({difficulty = 'easy', seed = 1989, stage = 0, lap = 1,
  flagged = true} = {}) {
  const duel = new Duel({seed, featureFlags: {wasteland2: flagged}});
  const state = duel.state;
  Object.assign(state, actor(160), {mode: 'wasteland', status: 'racing',
    cpuDifficulty: difficulty, stageIndex: stage, currentLap: lap,
    completedLaps: lap - 1, combat: createCombat(), traffic: []});
  const rival = actor(0);
  state.opponents = [rival];
  state.rival = rival;
  duel.course = {
    seed, def: {...duel.stageDef, stage}, length: 2000, closed: false,
    rng: makeRng(7183),
    groundAt: (s, lateral) => ({x: lateral, y: 0, z: s, heading: 0}),
    at: s => ({x: 0, y: 0, z: s, heading: 0, curvature: 0}),
    nearest: (x, z) => ({s: z, lateral: x}),
  };
  initializeCombatArmor(duel);
  return duel;
}

function camp(duel, ids = ['0-0'], zoneId = 0) {
  const zone = {id: zoneId, s: 0, nextShotAt: 0, shotCount: 0,
    warnedLap: 0, salvage: null,
    raiders: ids.map(id => ({id, s: 0, lateral: 0, x: 0, y: 0, z: 0,
      health: T.raider.health, knockedDown: false, firedLap: 0}))};
  duel.state.raids ??= {zones: [], shots: 0};
  duel.state.raids.zones.push(zone);
  return zone;
}

function ideal(duel, origin, target, speed) {
  const at = point(duel, target);
  const flight = Math.min(T.crossbow.leadTime,
    Math.hypot(at.x - origin.x, at.z - origin.z) / speed);
  const future = predictedPoint(duel, target, flight);
  return Math.atan2(future.x - origin.x, future.z - origin.z);
}

function raiderShot(options = {}) {
  const duel = field(options);
  Object.assign(duel.state, actor(60, 0, 20));
  duel.state.rival.speedMph = 0;
  const zone = camp(duel, [options.id ?? '0-0']);
  const expected = ideal(duel, zone.raiders[0], duel.state,
    T.crossbow.baseSpeed * .72);
  stepRaiders(duel);
  const bolt = duel.state.combat.projectiles[0];
  assert.ok(bolt?.raid, 'the eligible raider actually fires');
  return {duel, zone, bolt, bias: wrap(heading(bolt) - expected)};
}

function cpuShot(options = {}) {
  const duel = field(options);
  duel.state.combat.aiShot = options.shot ?? 1;
  const expected = ideal(duel, point(duel, duel.state.rival), duel.state,
    T.crossbow.baseSpeed);
  assert.equal(fireWeapon(duel, 'crossbow', true), true);
  const bolt = duel.state.combat.projectiles[0];
  return {duel, bolt, bias: wrap(heading(bolt) - expected)};
}

function widestShot(launch, difficulty) {
  return Array.from({length: 6}, (_, index) => launch({difficulty, seed: 1989 + index}))
    .sort((a, b) => Math.abs(b.bias) - Math.abs(a.bias))[0];
}

check('measured raider tuning uses 10 / 10 degree cones without changing CPU aim', () => {
  // Authorized after the retained-bias report measured 6/10/6 enemy hits;
  // owner traces attributed 5 Easy and 4 Medium hits to raiders. Hard stays
  // unchanged. The 20-degree Easy candidate won all ten seeds, so its cone
  // returned to 10 degrees. The measured Medium correction remains separate.
  const approved = {easy: Math.PI / 18, medium: Math.PI / 18, hard: .03};
  assert.deepEqual(T.raider.aimError, approved,
    'raider aim must use the approved 10-degree / 10-degree / .03-radian map');
  assert.deepEqual(Object.fromEntries(Object.entries(CPU_COMBAT).map(
    ([difficulty, settings]) => [difficulty, settings.aimError])),
  {easy: Math.PI / 18, medium: .055, hard: .03}, 'CPU aim settings stay unchanged');
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const errors = Array.from({length: 12}, (_, index) =>
      Math.abs(raiderShot({difficulty, seed: 1989 + index}).bias));
    assert.ok(errors.every(error => error <= approved[difficulty] + 1e-9),
      `${difficulty} launched raiders stay inside their approved separate cone`);
    if (difficulty === 'medium') assert.ok(errors.some(error =>
      error > CPU_COMBAT[difficulty].aimError),
    `${difficulty} raider launches must exercise their wider cone, not the CPU cone`);
  }
});

check('raider spread uses the current difficulty cones', () => {
  const rms = {};
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const errors = Array.from({length: 12}, (_, index) =>
      raiderShot({difficulty, seed: 1989 + index}).bias);
    assert.ok(errors.every(error => Math.abs(error) <= T.raider.aimError[difficulty] + 1e-9),
      `${difficulty} raiders remain inside their explicit aim cone`);
    assert.ok(errors.some(error => error < -.0001) && errors.some(error => error > .0001),
      `${difficulty} raiders must have seeded error on both sides of the lead point`);
    rms[difficulty] = Math.sqrt(errors.reduce((sum, value) => sum + value * value, 0) / errors.length);
  }
  near(rms.easy, rms.medium, 1e-12,
    'equal Easy/Medium cones retain equal spread for identical seeded samples');
  assert.ok(rms.medium > rms.hard, 'Hard raider aim remains tighter than Medium');
});

check('raider aim is repeatable from seed and identity', () => {
  const options = {seed: 55, difficulty: 'medium', stage: 1, lap: 2, id: '2-1'};
  const first = raiderShot(options).bolt, second = raiderShot(options).bolt;
  assert.deepEqual([first.vx, first.vy, first.vz], [second.vx, second.vy, second.vz]);
});

for (const [dimension, changes] of [
  ['seed', [1989, 1990, 1991]], ['stage', [0, 1, 2]],
  ['lap', [1, 2, 3]], ['id', ['0-0', '0-1', '1-0']],
]) {
  check(`raider error is keyed by ${dimension}`, () => {
    const values = changes.map(value => round(raiderShot({[dimension]: value}).bias));
    assert.equal(new Set(values).size, values.length,
      `changing ${dimension} must select a different deterministic aim sample`);
  });
}

check('camp order, unrelated shots and world RNG do not affect a raider sample', () => {
  function volley(reverse, interference) {
    const duel = field();
    Object.assign(duel.state, actor(60, 0, 20));
    const first = camp(duel, ['0-0'], 0), second = camp(duel, ['1-0'], 1);
    if (reverse) duel.state.raids.zones.reverse();
    if (interference) {
      for (let index = 0; index < 17; index++) duel.course.rng.float();
      duel.state.combat.aiShot = 87;
      fireWeapon(duel, 'crossbow', true);
      duel.state.combat.projectiles = [];
    }
    stepRaiders(duel);
    assert.equal(first.shotCount, 1);
    assert.equal(second.shotCount, 1);
    return Object.fromEntries(duel.state.combat.projectiles.map(bolt =>
      [bolt.raidZone, [bolt.vx, bolt.vy, bolt.vz]]));
  }
  assert.deepEqual(volley(false, false), volley(true, false));
  assert.deepEqual(volley(false, false), volley(true, true));
  function memberOrder(ids) {
    const duel = field();
    Object.assign(duel.state, actor(60, 0, 20));
    const zone = camp(duel, ids), samples = {};
    for (const id of ids) {
      stepRaiders(duel);
      const bolt = duel.state.combat.projectiles.at(-1);
      samples[id] = [bolt.vx, bolt.vy, bolt.vz];
      duel.state.stageTimeSec = zone.nextShotAt;
    }
    return samples;
  }
  assert.deepEqual(memberOrder(['0-0', '0-1', '0-2']),
    memberOrder(['0-2', '0-1', '0-0']), 'member order does not select the random sample');
  const duel = field(), expectedRng = makeRng(7183);
  Object.assign(duel.state, actor(60, 0, 20));
  camp(duel);
  stepRaiders(duel);
  assert.equal(duel.course.rng.float(), expectedRng.float(),
    'firing does not consume the course random stream');
  const cleanCpu = cpuShot().bias;
  duel.state.combat.projectiles = [];
  duel.state.combat.aiShot = 1;
  Object.assign(duel.state, actor(160));
  fireWeapon(duel, 'crossbow', true);
  near(heading(duel.state.combat.projectiles[0]), cleanCpu, 1e-12,
    'raider fire must not consume the CPU aim sequence');
});

for (const [source, launch] of [['CPU', cpuShot], ['raider', raiderShot]]) {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    check(`${source} ${difficulty} guidance keeps its selected signed error`, () => {
      const {duel, bolt, bias} = widestShot(launch, difficulty);
      assert.ok(Math.abs(bias) > .001, `${source} needs a measurable launch bias`);
      for (let tick = 0; tick < 12; tick++) stepProjectiles(duel, 1 / 120);
      assert.ok(duel.state.combat.projectiles.includes(bolt), 'sample remains in flight');
      const error = wrap(heading(bolt) - ideal(duel, bolt, duel.state,
        Math.hypot(bolt.vx, bolt.vz)));
      assert.ok(error * bias > 0 && Math.abs(error) >= Math.abs(bias) * .8,
        `${source} ${difficulty} guidance erased launch bias ${bias}; remaining error ${error}`);
      assert.ok(Math.abs(error) <= Math.abs(bias) * 1.25 + .002,
        'retained bias does not compound at every guidance step');
    });
  }
}

check('biased enemy bolts still guide toward a changing target', () => {
  for (const launch of [cpuShot, raiderShot]) {
    const {duel, bolt, bias} = widestShot(launch, 'hard');
    const before = heading(bolt);
    duel.state.lateral = duel.state.prevLateral = 4;
    for (let tick = 0; tick < 8; tick++) stepProjectiles(duel, 1 / 120);
    assert.ok(wrap(heading(bolt) - before) > .01,
      'retaining aim error must not disable target guidance');
    const error = wrap(heading(bolt) - ideal(duel, bolt, duel.state,
      Math.hypot(bolt.vx, bolt.vz)));
    near(error, bias, .007, 'moving-target aim still includes the selected bias');
  }
});

check('raiders keep nearest moving target selection and one shot per member per lap', () => {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const duel = field({difficulty});
    const gap = difficulty === 'easy' ? 1.6 : .8;
    Object.assign(duel.state, actor(60, 0, 20));
    Object.assign(duel.state.rival, actor(30, 0, 25));
    const zone = camp(duel, ['0-0', '0-1', '0-2']);
    stepRaiders(duel);
    assert.equal(duel.state.combat.projectiles[0].targetIndex, 0);
    duel.state.stageTimeSec = gap - .001;
    stepRaiders(duel);
    assert.equal(zone.shotCount, 1, 'no second shot before the difficulty gap');
    duel.state.stageTimeSec = gap;
    duel.state.rival.speedMph = 0;
    stepRaiders(duel);
    assert.equal(duel.state.combat.projectiles[1].targetIndex, -1, 'stationary rival is ignored');
    duel.state.stageTimeSec = gap * 2;
    stepRaiders(duel);
    duel.state.stageTimeSec = gap * 3;
    stepRaiders(duel);
    assert.equal(zone.shotCount, 3, 'three members make exactly three shots per lap');
    duel.state.currentLap++;
    duel.state.stageTimeSec = zone.nextShotAt;
    stepRaiders(duel);
    assert.equal(zone.shotCount, 4, 'a new lap renews eligibility');
  }
});

check('CPU attack cadence stays 10 / 7 / 5 seconds', () => {
  for (const [difficulty, interval] of [['easy', 10], ['medium', 7], ['hard', 5]]) {
    const duel = field({difficulty}), combat = duel.state.combat;
    stepCombatAI(duel, .1);
    near(combat.aiTimer, interval - .1, 1e-10, `${difficulty} initial cadence`);
    combat.aiTimer = .01;
    stepCombatAI(duel, .02);
    assert.equal(combat.projectiles.length, 1, 'one eligible CPU shot');
    assert.equal(combat.aiTimer, interval);
  }
});

check('enemy launch paths keep the shared projectile limit', () => {
  assert.equal(T.projectileLimit, 40, 'this aim correction must not retune the projectile limit');
  const duel = field();
  Object.assign(duel.state, actor(60, 0, 20));
  const zone = camp(duel);
  duel.state.combat.projectiles = Array.from({length: T.projectileLimit}, () => ({}));
  assert.equal(fireWeapon(duel, 'crossbow', true), false);
  stepRaiders(duel);
  assert.equal(duel.state.combat.projectiles.length, T.projectileLimit);
  assert.equal(zone.shotCount, 0);
  assert.equal(zone.raiders[0].firedLap, 0, 'a rejected shot does not consume the lap');
});

check('CPU and raider body hits retain the existing armor damage', () => {
  for (const launch of [cpuShot, raiderShot]) {
    const {duel, bolt} = launch();
    const armor = duel.state.armor;
    // Deliberate body contact isolates damage from the accuracy being changed.
    Object.assign(bolt, {x: -8, z: duel.state.s, y: duel._vehicleSpec(duel.state).height / 2,
      vx: 160, vz: 0, vy: 0, targetIndex: null});
    stepProjectiles(duel, .1);
    assert.equal(armor - duel.state.armor, 12, 'body contact still removes 12 armor');
    assert.equal(duel.state.combat.projectiles.includes(bolt), false);
  }
});

check('flag-off field has no raider shots', () => {
  const duel = field({flagged: false});
  stepRaiders(duel, 1);
  assert.equal(duel.state.combat.projectiles.length, 0);
  assert.equal(duel.state.raids, undefined);
});

function trajectory({flagged, enemy, fps = 60}) {
  const duel = field({flagged, difficulty: 'medium'});
  const state = duel.state;
  Object.assign(state, actor(enemy ? 160 : 0));
  Object.assign(state.rival, actor(enemy ? 0 : 160, 3));
  state.combat.aiShot = 3;
  fireWeapon(duel, 'crossbow', enemy);
  const bolt = state.combat.projectiles[0];
  const result = [];
  for (let frame = 0; frame < fps / 2; frame++) {
    if (frame === fps / 6) {
      const target = enemy ? state : state.rival;
      target.lateral += 8;
      target.prevLateral = target.lateral;
    }
    stepProjectiles(duel, 1 / fps);
    if (frame === 0 || frame === fps / 2 - 1) result.push(
      ['x', 'y', 'z', 'vx', 'vy', 'vz', 'age'].map(key => round(bolt[key])));
  }
  return {flagged, enemy, samples: result, live: state.combat.projectiles.includes(bolt)};
}

check('player guidance and flag-off CPU/player trajectories preserve their fingerprints', () => {
  const outcomes = [{flagged: true, enemy: false}, {flagged: false, enemy: false},
    {flagged: false, enemy: true}].map(trajectory);
  const expected = JSON.parse(readFileSync(new URL('./replays/enemy-aim-controls.json', import.meta.url), 'utf8'));
  assert.deepEqual(outcomes, expected.outcomes);
  assert.equal(createHash('sha256').update(JSON.stringify(outcomes)).digest('hex'), expected.sha256);
});

check('enemy guidance keeps one turn budget and its launch cone when targets reverse', () => {
  for (const launch of [cpuShot, raiderShot]) {
    for (const difficulty of ['easy', 'medium', 'hard']) {
      for (const fps of [30, 60, 144]) {
        const {duel, bolt} = launch({difficulty});
        const speed = Math.hypot(bolt.vx, bolt.vz);
        // Keep this steering probe away from ground and body contact. Moving
        // the target across the far field demands both maximum-rate turns.
        bolt.y = 10;
        bolt.vy = 0;
        Object.assign(duel.state, actor(1000));
        let leftEdge = false, rightEdge = false;
        let leftTurn = false, rightTurn = false;
        for (let frame = 0; frame < fps; frame++) {
          const side = Math.floor(frame * 3 / fps) % 2 ? -1 : 1;
          duel.state.lateral = duel.state.prevLateral = side * 1000;
          const before = heading(bolt);
          stepProjectiles(duel, 1 / fps);
          assert.ok(duel.state.combat.projectiles.includes(bolt),
            'the turn-limit probe remains in flight');
          const turn = wrap(heading(bolt) - before);
          const fromLaunch = wrap(heading(bolt) - bolt.launchBearing);
          assert.ok(Math.abs(turn) <= T.crossbow.homingTurnRadiansPerSecond / fps + 1e-10,
            `${launch.name} ${difficulty} ${fps} FPS exceeded one step's turn budget`);
          assert.ok(Math.abs(fromLaunch) <= T.crossbow.homingConeRadians + 1e-10,
            'guidance never leaves the original launch cone');
          near(Math.hypot(bolt.vx, bolt.vz), speed, 1e-9,
            'steering preserves horizontal speed');
          leftTurn ||= turn < -.001;
          rightTurn ||= turn > .001;
          leftEdge ||= fromLaunch < -T.crossbow.homingConeRadians + 1e-8;
          rightEdge ||= fromLaunch > T.crossbow.homingConeRadians - 1e-8;
        }
        assert.ok(leftTurn && rightTurn && leftEdge && rightEdge,
          'the probe exercises both turn directions and both launch-cone edges');
      }
    }
  }
});

check('CPU and raider aim has comparable common-time outcomes at 30 / 60 / 144 FPS', () => {
  for (const launch of [cpuShot, raiderShot]) {
    const results = [30, 60, 144].map(fps => {
      const {duel, bolt, bias} = widestShot(launch, 'medium');
      const duration = 1 / 6;
      for (let frame = 0; frame < fps * duration; frame++) stepProjectiles(duel, 1 / fps);
      return {x: bolt.x, z: bolt.z, error: wrap(heading(bolt) - ideal(duel, bolt,
        duel.state, Math.hypot(bolt.vx, bolt.vz))), bias,
      live: duel.state.combat.projectiles.includes(bolt), armor: duel.state.armor};
    });
    const reference = results[2];
    for (const result of results) {
      assert.equal(result.live, reference.live);
      assert.equal(result.armor, reference.armor);
      near(result.x, reference.x, .08, 'common-time lateral position');
      near(result.z, reference.z, .08, 'common-time forward position');
      near(result.error, result.bias, .004, 'common-time steering keeps aim bias');
    }
  }
});

console.log(`Enemy aim: ${checks} checks, ${checks - failures} passed, ${failures} failed.`);
if (failures) process.exitCode = 1;
