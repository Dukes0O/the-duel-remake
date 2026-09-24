import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {CARS} from '../src/config.js';
import {fireWeapon, ufoDestination} from '../src/combat-weapons.js';
import {stepPickups, cpuPickupCharges} from '../src/combat-pickups.js';
import {stepCombatAI} from '../src/combat-ai.js';
import {COMBAT_TUNING as T, CPU_COMBAT} from '../src/wasteland-tuning.js';

// Exercise production pickup, destination, fire and AI APIs on a flat road.
// All state is disposable and headless; no player storage or renderer is used.
let checks = 0, failures = 0;
function check(name, run) {
  checks++;
  try { run(); }
  catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}
const near = (actual, expected, message) => assert.ok(
  Math.abs(actual - expected) < 1e-8, `${message}: expected ${expected}, got ${actual}`);
const clone = value => JSON.parse(JSON.stringify(value));
const pose = actor => Object.fromEntries(['s', 'prevS', 'lateral', 'prevLateral',
  'speedMph', 'completedLaps', 'nextLapGate', 'lapTimes', 'assistedLap', 'assistedLaps',
  'routeId', 'routeLap'].map(key => [key, actor[key]]));

function field(flagged = true, difficulty = 'medium') {
  const duel = new Duel({seed: 1989, featureFlags: {wasteland2: flagged}});
  duel.startCampaign({mode: 'wasteland', seed: 1989, car: 'falcone_f42',
    cpuDifficulty: difficulty, opponentCount: 3});
  const state = duel.state, combat = state.combat;
  Object.assign(state, {status: 'racing', countdown: 0, s: 0, prevS: 0,
    lateral: 0, prevLateral: 0, speedMph: 70, completedLaps: 0,
    nextLapGate: 1, lapsTotal: 2, currentLap: 1, traffic: [],
    assistedLap: false, assistedLaps: [], lapTimes: [], routeId: null, routeLap: null});
  state.opponents.forEach((actor, index) => Object.assign(actor, {
    s: 200 + index * 100, prevS: 200 + index * 100, lateral: 0, prevLateral: 0,
    speedMph: 70, completedLaps: 0, currentLap: 1, nextLapGate: 1,
    lapTimes: [], assistedLaps: [], assistedLap: false, airHeight: 0,
    prevAirHeight: 0, impactTimer: 0, finished: false, crushed: false,
    combatWrecking: false, routeId: null, routeLap: null,
  }));
  assert.equal(state.opponents.length, 3);
  combat.pickups = [];
  combat.seededPickupPlan = [];
  combat.pickupTimer = Infinity;
  combat.aiTimer = 100;
  combat.levels.ufo = 3; // CPUs must still use stock range.
  duel._lapGates = [100, 600, 900];
  duel.course = {
    seed: 1989, length: 1000, raceLength: 2000, closed: true,
    def: {...duel.stageDef, laps: 2}, features: {shortcuts: []},
    phase: value => ((value % 1000) + 1000) % 1000,
    groundAt: (s, lateral) => ({x: lateral, y: 0, z: s, heading: 0}),
    worldAt: (s, lateral) => ({x: lateral, y: 0, z: s, heading: 0}),
    at: s => ({x: 0, y: 0, z: s, heading: 0, curvature: 0}),
    nearest: (x, z) => ({s: z, lateral: x}),
    roadHalfWidthAt: () => 8,
    surfaceAt: () => ({road: true, mainRoad: true, roadHalfWidth: 8, shortcutId: null}),
  };
  duel._obstacles = () => [];
  const events = [];
  duel.onChange((_, event) => events.push(event));
  return {duel, state, combat, events};
}

function pickup(duel, actor, {lateral = 0, airHeight = 0} = {}) {
  const at = actor.s;
  actor.prevS = at - 6;
  actor.s = at + 6;
  actor.prevLateral = actor.lateral = lateral;
  actor.airHeight = airHeight;
  const crate = {id: `test-${duel.state.combat.serial}-${at}`, kind: 'weapon',
    weapon: 'ufo', s: at, lateral: 0, age: 0};
  duel.state.combat.pickups = [crate];
  stepPickups(duel, 0);
  return crate;
}

function charge(fixture, index = 0) {
  const actor = fixture.state.opponents[index];
  pickup(fixture.duel, actor);
  assert.equal(fixture.combat.pickups.length, 0, 'physical UFO contact collects');
  assert.equal(cpuPickupCharges(fixture.state, fixture.combat, actor).ufo, 1,
    'contact supplies one charge');
  actor.prevS = actor.s;
  return actor;
}

function jump(fixture, actor) {
  return fireWeapon(fixture.duel, 'ufo', true, actor);
}

for (const flagged of [false, true]) {
  for (const difficulty of ['medium', 'hard']) for (let index = 0; index < 3; index++) {
    check(`${flagged}/${difficulty}/rival${index}: physical contact only`, () => {
      const f = field(flagged, difficulty), actor = f.state.opponents[index];
      pickup(f.duel, actor, {lateral: 6});
      assert.equal(f.combat.pickups.length, 1, 'wrong lane cannot collect');
      pickup(f.duel, actor, {airHeight: T.pickup.airClearance + .1});
      assert.equal(f.combat.pickups.length, 1, 'airborne car cannot collect');
      pickup(f.duel, actor);
      assert.equal(f.combat.pickups.length, 0, 'swept body contact collects');
      assert.equal(cpuPickupCharges(f.state, f.combat, actor).ufo, 1);
      for (const other of f.state.opponents.filter(other => other !== actor)) {
        assert.equal(cpuPickupCharges(f.state, f.combat, other).ufo || 0, 0);
      }
      assert.deepEqual(f.combat.ufoUsedLaps, [], 'collection alone does not spend player use');
    });
  }

  check(`${flagged}: Easy ignores UFOs and no rival starts with a free charge`, () => {
    for (const difficulty of ['easy', 'medium', 'hard']) {
      const f = field(flagged, difficulty);
      for (const actor of f.state.opponents) {
        const before = pose(actor);
        assert.equal(jump(f, actor), false, 'no collected charge means no jump');
        assert.deepEqual(pose(actor), before);
        if (difficulty === 'easy') {
          pickup(f.duel, actor);
          assert.equal(f.combat.pickups.length, 1, 'Easy leaves its physical pickup');
          assert.equal(cpuPickupCharges(f.state, f.combat, actor).ufo || 0, 0);
        }
      }
    }
  });

  for (let index = 0; index < 3; index++) {
    check(`${flagged}/rival${index}: stock jump isolates actor and player history`, () => {
      const f = field(flagged), actor = charge(f, index);
      f.state.nextLapGate = 0; // A CPU uses its own earned first checkpoint.
      f.combat.ufoUsedLaps[0] = true;
      f.state.assistedLaps = [false, true];
      f.state.routeId = 'player-route';
      f.state.routeLap = 7;
      f.combat.lastUfo = {sentinel: 'player-preview'};
      const player = clone(pose(f.state)), others = f.state.opponents.filter(a => a !== actor);
      const othersBefore = others.map(a => clone(pose(a)));
      const playerUse = clone(f.combat.ufoUsedLaps), lastUfo = clone(f.combat.lastUfo);
      const originalS = actor.s, gates = [actor.completedLaps, actor.nextLapGate];
      Object.assign(actor, {headingError: .2, yawVelocity: .8, pushVelocity: 2,
        slipAngle: .1, airborne: true, airHeight: .1, _verticalSpeed: 4,
        tumble: {sentinel: true}});
      const callouts = [];
      f.duel._callout = (...args) => callouts.push(args);
      const burstStart = f.combat.bursts.length;
      assert.equal(jump(f, actor), true);
      assert.equal(actor.s, originalS + T.ufo.baseDistance, 'CPU ignores player upgrades');
      assert.equal(cpuPickupCharges(f.state, f.combat, actor).ufo, 0);
      assert.deepEqual([actor.completedLaps, actor.nextLapGate], gates, 'no gate or lap awarded');
      assert.equal(actor.prevS, actor.s);
      assert.equal(actor.prevLateral, actor.lateral);
      for (const key of ['headingError', 'yawVelocity', 'pushVelocity', 'slipAngle', 'airHeight'])
        assert.equal(actor[key], 0, `landing clears ${key}`);
      assert.equal(actor.airborne, false);
      assert.equal(actor.tumble, null);
      assert.deepEqual(clone(pose(f.state)), player);
      assert.deepEqual(others.map(a => clone(pose(a))), othersBefore);
      assert.deepEqual(f.combat.ufoUsedLaps, playerUse);
      assert.deepEqual(f.combat.lastUfo, lastUfo);
      assert.equal(callouts.length, 0, 'CPU jump does not replace player HUD callout');
      const bursts = f.combat.bursts.slice(burstStart).filter(burst => burst.kind === 'ufo');
      assert.equal(bursts.length, 2, 'departure and arrival are visible');
      assert.deepEqual(bursts.map(burst => burst.z), [originalS, actor.s]);
      assert.ok(f.events.some(event => event.cpuPickupUsed === 'ufo' &&
        event.opponentIndex === index), 'CPU-use event identifies its rival');
      const shield = index === 0 ? f.combat.rivalShield : actor.combatShield;
      assert.ok(shield >= T.ufo.invulnerability, 'only the jumping actor gets protection');
    });
  }

  check(`${flagged}: first checkpoint and once-per-own-lap limits`, () => {
    const f = field(flagged), actor = charge(f, 1);
    actor.nextLapGate = 0;
    const before = pose(actor);
    assert.equal(jump(f, actor), false, 'before own first checkpoint is blocked');
    assert.deepEqual(pose(actor), before);
    assert.equal(cpuPickupCharges(f.state, f.combat, actor).ufo, 1);
    actor.nextLapGate = 1;
    assert.equal(jump(f, actor), true);
    assert.equal(jump(f, actor), false);
    pickup(f.duel, actor);
    assert.equal(f.combat.pickups.length, 1, 'spent lap cannot collect another UFO');
    assert.equal(cpuPickupCharges(f.state, f.combat, actor).ufo || 0, 0);
    Object.assign(actor, {completedLaps: 1, currentLap: 2, s: 1250, prevS: 1250,
      nextLapGate: 1});
    charge(f, 1);
    const start = actor.s;
    assert.equal(jump(f, actor), true, 'next validated lap permits a new collected charge');
    assert.equal(actor.s, start + T.ufo.baseDistance);
    assert.deepEqual(f.combat.ufoUsedLaps, []);
  });

  check(`${flagged}: one rival's lap use cannot consume another rival's charge`, () => {
    const f = field(flagged), first = charge(f, 0), second = charge(f, 1);
    assert.equal(jump(f, first), true);
    assert.equal(cpuPickupCharges(f.state, f.combat, second).ufo, 1);
    assert.equal(jump(f, second), true, 'another rival may jump during the same lap');
    assert.equal(jump(f, first), false);
    assert.equal(jump(f, second), false);
    assert.deepEqual(f.combat.ufoUsedLaps, []);
  });

  check(`${flagged}: occupied, solid and off-road landings do not spend charges`, () => {
    for (const obstacle of ['player', 'rival', 'solid', 'off-road']) {
      const f = field(flagged), actor = charge(f);
      f.duel.course.surfaceAt = (_, lateral) => ({road: obstacle !== 'off-road' &&
        lateral === 0, mainRoad: true, roadHalfWidth: 8});
      if (obstacle === 'player') f.state.s = f.state.prevS = actor.s + 7;
      if (obstacle === 'rival') f.state.opponents[1].s = actor.s + 7;
      if (obstacle === 'solid') f.duel._obstacles = () => [{x: 0, y: 0,
        z: actor.s + 7, halfX: 20, halfZ: 20, height: 4, shape: 'box'}];
      const before = clone(actor), history = clone(f.combat.ufoUsedLaps);
      assert.equal(ufoDestination(f.duel, actor).kind, 'blocked', obstacle);
      assert.equal(jump(f, actor), false, obstacle);
      assert.deepEqual(clone(actor), before, 'blocked attempt leaves all actor state intact');
      assert.deepEqual(f.combat.ufoUsedLaps, history);
      assert.equal(cpuPickupCharges(f.state, f.combat, actor).ufo, 1);
    }
  });

  check(`${flagged}: destination uses rival footprint and clears occupied lane`, () => {
    const f = field(flagged), actor = charge(f, 2);
    f.state.s = actor.s + T.ufo.baseDistance;
    const preview = ufoDestination(f.duel, actor);
    assert.equal(preview.kind, 'jump');
    assert.ok(Math.abs(preview.lateral - f.state.lateral) >= T.ufo.lateralClearance,
      'scanner includes player among occupied lanes');
    f.duel.course.surfaceAt = (_, lateral) => ({road: lateral === 0, roadHalfWidth: 8});
    f.state.s = 700;
    const originalSpec = f.duel._vehicleSpec.bind(f.duel);
    f.duel._vehicleSpec = a => a === actor ? {...originalSpec(a), halfWidth: 4} : originalSpec(a);
    f.duel._obstacles = () => [{x: 3, y: 0, z: actor.s + 7,
      halfX: .2, halfZ: 20, height: 4, shape: 'box'}];
    assert.equal(ufoDestination(f.duel, actor).kind, 'blocked', 'wide rival cannot use player footprint');
  });

  check(`${flagged}: own gate and finish margins bound destination`, () => {
    for (const finish of [false, true]) {
      const f = field(flagged), actor = charge(f, 1);
      Object.assign(actor, {completedLaps: finish ? 1 : 0,
        nextLapGate: finish ? f.duel._lapGates.length : 1,
        s: finish ? 1990 : 590, prevS: finish ? 1990 : 590});
      const preview = ufoDestination(f.duel, actor);
      assert.equal(preview.kind, 'jump');
      assert.equal(preview.toS, (finish ? 2000 : 600) - T.ufo.gateMargin);
      assert.equal(jump(f, actor), true);
      assert.equal(actor.s, preview.toS);
      assert.equal(actor.completedLaps, finish ? 1 : 0);
      assert.equal(actor.nextLapGate, finish ? 3 : 1);
    }
  });

  check(`${flagged}: actor vehicle speed and route metadata apply at landing`, () => {
    const f = field(flagged), actor = charge(f, 1);
    const carId = Object.keys(CARS).find(id => id !== f.state.car && CARS[id].topSpeed);
    actor.car = carId;
    actor.speedMph = 1000;
    f.duel.course.surfaceAt = () => ({road: true, mainRoad: false,
      roadHalfWidth: 8, shortcutId: 'cpu-dirt'});
    f.duel.course.features.shortcuts = [{id: 'cpu-dirt', start: 0, end: 900}];
    f.duel.course.shortcutOffset = () => 0;
    const expectedLimit = f.duel._drivingSurface(actor.s + T.ufo.baseDistance,
      actor.lateral, CARS[carId]).speedLimit;
    assert.equal(jump(f, actor), true);
    near(actor.speedMph, expectedLimit, 'rival uses its vehicle surface limit');
    assert.equal(actor.routeId, 'cpu-dirt');
    assert.equal(actor.routeLap, actor.completedLaps + 1);
    assert.equal(f.state.routeId, null);
  });

  check(`${flagged}: CPU holds UFO without a recognized player-bolt threat and preserves attack cadence`, () => {
    for (const difficulty of ['medium', 'hard']) {
      const f = field(flagged, difficulty), actor = charge(f, 2);
      const start = actor.s;
      f.combat.aiTimer = 3;
      const shots = f.combat.aiShot;
      stepCombatAI(f.duel, .1);
      assert.equal(actor.s, start, 'a collected UFO is not a free racing boost');
      assert.equal(cpuPickupCharges(f.state, f.combat, actor).ufo, 1);
      near(f.combat.aiTimer, 2.9, 'holding a UFO leaves the attack timer alone');
      assert.equal(f.combat.aiShot, shots);
      assert.equal(f.combat.projectiles.length, 0);
      const incoming = () => ({kind: 'crossbow', enemy: false, age: 1,
        x: actor.lateral, y: T.pointHeight, z: actor.s + 40,
        vx: 0, vy: 0, vz: -200});
      const controls = [
        ['enemy projectile', {enemy: true}], ['different weapon', {kind: 'bomb'}],
        ['reaction too early', {age: 0}], ['behind vision cone', {z: actor.s - 40, vz: 200}],
        ['above car', {y: 100}], ['receding', {vz: 200}],
        ['lateral miss', {x: actor.lateral + 50}],
      ];
      for (const [label, overrides] of controls) {
        f.combat.projectiles = [{...incoming(), ...overrides}];
        stepCombatAI(f.duel, .01);
        assert.equal(actor.s, start, `${label} does not spend a defensive UFO`);
        assert.equal(cpuPickupCharges(f.state, f.combat, actor).ufo, 1);
      }
      actor.combatShield = 1;
      f.combat.projectiles = [incoming()];
      stepCombatAI(f.duel, .01);
      assert.equal(actor.s, start, 'already shielded rival retains its UFO');
      assert.equal(cpuPickupCharges(f.state, f.combat, actor).ufo, 1);
      actor.combatShield = 0;
      const attackTimer = f.combat.aiTimer, attackShots = f.combat.aiShot;
      stepCombatAI(f.duel, .01);
      assert.equal(actor.s, start + T.ufo.baseDistance, 'recognized incoming player bolt triggers defense');
      assert.equal(cpuPickupCharges(f.state, f.combat, actor).ufo, 0);
      near(f.combat.aiTimer, attackTimer - .01, 'defense does not reset or spend an attack');
      assert.equal(f.combat.aiShot, attackShots);
      assert.equal(f.combat.projectiles.length, 1, 'defense does not invent another projectile');
      assert.equal(f.events.filter(event => event.cpuPickupUsed === 'ufo').length, 1);
      stepCombatAI(f.duel, .01);
      assert.equal(actor.s, start + T.ufo.baseDistance, 'same threat cannot reuse the lap charge');
      const control = field(flagged, difficulty);
      control.combat.aiTimer = null;
      stepCombatAI(control.duel, .1);
      near(control.combat.aiTimer, CPU_COMBAT[difficulty].interval / (flagged ? 3 : 1) - .1,
        'existing attack interval remains');
    }
  });

  check(`${flagged}: all rival identities hold then defend once at common time 30/60/144`, () => {
    for (let index = 0; index < 3; index++) {
      const outcomes = [30, 60, 144].map(fps => {
        const f = field(flagged), actor = charge(f, index), start = actor.s;
        const advance = seconds => {
          let elapsed = 0;
          while (elapsed < seconds - 1e-10) {
            const dt = Math.min(1 / fps, seconds - elapsed);
            stepCombatAI(f.duel, dt); elapsed += dt;
          }
        };
        advance(.25);
        assert.equal(actor.s, start, 'common-time no-threat phase never adds free race progress');
        assert.equal(cpuPickupCharges(f.state, f.combat, actor).ufo, 1);
        f.combat.projectiles = [{kind: 'crossbow', enemy: false, age: 1,
          x: actor.lateral, y: T.pointHeight, z: actor.s + 40,
          vx: 0, vy: 0, vz: -200}];
        advance(.25);
        assert.equal(actor.s, start + T.ufo.baseDistance, 'exactly one defensive jump at common time');
        assert.equal(jump(f, actor), false, 'cannot reuse the spent lap');
        return {pose: pose(actor), charges: cpuPickupCharges(f.state, f.combat, actor),
          playerHistory: f.combat.ufoUsedLaps, shots: f.combat.aiShot,
          events: f.events.filter(event => event.cpuPickupUsed === 'ufo').length};
      });
      assert.deepEqual(outcomes[0], outcomes[1]);
      assert.deepEqual(outcomes[1], outcomes[2]);
      assert.equal(outcomes[0].events, 1);
    }
  });
}

check('actual flag-off player preview, jump and blocked behavior remain unchanged', () => {
  const f = field(false);
  Object.assign(f.state, {s: 500, prevS: 500, nextLapGate: 1});
  assert.deepEqual(ufoDestination(f.duel), {kind: 'jump', fromS: 500, toS: 524,
    lateral: 0, gainMeters: 24, gateLimited: false});
  const rivalPoses = f.state.opponents.map(pose);
  assert.equal(fireWeapon(f.duel, 'ufo'), true);
  assert.equal(f.state.s, 524);
  assert.deepEqual(f.state.opponents.map(pose), rivalPoses);
  assert.equal(f.state.assistedLap, true);
  assert.deepEqual(f.combat.ufoUsedLaps, [true]);
  assert.deepEqual(ufoDestination(f.duel), {kind: 'blocked', reason: 'lap-used',
    fromS: 524, toS: 524, gainMeters: 0});
});

console.log(`CPU UFO: ${checks} checks, ${checks - failures} passed, ${failures} failed.`);
if (failures) process.exitCode = 1;
