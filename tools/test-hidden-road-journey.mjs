import assert from 'node:assert/strict';
import { Duel } from '../src/game.js';
import { CARS, DRIVE } from '../src/config.js';
import { CAR_HALF_WIDTH, CAR_HALF_LENGTH } from '../src/collision.js';
import { ROUTE_VARIANTS } from '../src/route-variants.js';

const dt = 1 / 120;
const angle = x => Math.atan2(Math.sin(x), Math.cos(x));
let checks = 0;
const failures = [];
function check(name, run) {
  checks++;
  try { run(); } catch (error) { failures.push(`${name}: ${error.message}`); }
}
function race(seed = 1989, car = 'falcone_f42', difficulty = 'casual', enabled = true) {
  const duel = new Duel({ seed, featureFlags: { 'hidden-road': enabled, 'roadside-destruction': false } });
  duel.startCampaign({ startStage: 0, seed, car, difficulty, mode: 'duel' });
  Object.assign(duel.state, { status: 'racing', traffic: [], opponents: [], rival: null });
  return duel;
}
function place(duel, progress, { speed = 35, offset = 0, reverse = false } = {}) {
  const p = duel.course.hiddenRoad.poseAt(progress, offset), s = duel.state;
  Object.assign(s, { s: p.s, prevS: p.s, lateral: p.lateral, prevLateral: p.lateral,
    speedMph: speed, headingError: angle(p.heading + (reverse ? Math.PI : 0) - duel.course.at(p.s).heading),
    yawVelocity: 0, steerVisual: 0, slipAngle: 0, groundHeight: p.y, airborne: false,
    airHeight: 0, impactTimer: 0, pushVelocity: 0 });
  return p;
}
function journey(duel) {
  assert.ok(duel.state.hiddenRoadJourney, 'enabled course exposes journey state');
  return duel.state.hiddenRoadJourney;
}
function advance(duel, seconds) { for (let i = 0; i < Math.round(seconds / dt); i++) duel.step(dt); }
function depart(duel) {
  place(duel, 149.9);
  duel.setInput({ throttle: 0, brake: 0, steer: 0, boost: false });
  advance(duel, .1);
  assert.equal(duel.state.status, 'exploring', 'physical crossing departs');
  assert.equal(journey(duel).departed, true);
}
function gatePose(duel) {
  const gate = duel.course.hiddenRoad.poseAt(duel.course.hiddenRoad.length);
  const p = duel.course.worldAt(duel.state.s, duel.state.lateral);
  const dx = p.x - gate.x, dz = p.z - gate.z;
  return { x: dx * Math.cos(gate.heading) - dz * Math.sin(gate.heading),
    z: dx * Math.sin(gate.heading) + dz * Math.cos(gate.heading),
    heading: angle(duel.course.at(duel.state.s).heading + duel.state.headingError - gate.heading),
    world: p };
}
function reachChoice(duel, inspect = () => {}) {
  for (let i = 0; i < 15 / dt && journey(duel).phase !== 'choice'; i++) {
    const before = gatePose(duel), speed = duel.state.speedMph;
    duel.step(dt);
    inspect(before, speed);
  }
  assert.equal(journey(duel).phase, 'choice', 'arrival reaches the invitation in bounded simulation time');
  assert.equal(journey(duel).choiceReady, true);
}

check('before 150 metres the player can drive back without abandoning', () => {
  const duel = race(), events = [];
  duel.onChange((_s, e) => events.push(e));
  place(duel, 100, { reverse: true, speed: 25 });
  const before = duel.course.hiddenRoad.nearest(...(() => { const p = duel.course.worldAt(duel.state.s, duel.state.lateral); return [p.x, p.z]; })()).progress;
  advance(duel, .5);
  const after = duel.course.worldAt(duel.state.s, duel.state.lateral);
  assert.ok(duel.course.hiddenRoad.nearest(after.x, after.z).progress < before - 3);
  assert.equal(duel.state.status, 'racing');
  assert.equal(events.filter(e => e.hiddenRoadDeparted).length, 0);
});

check('crossing 150 metres departs once and freezes race outcomes, not driving', () => {
  const duel = race(), events = [];
  duel.onChange((_s, e) => events.push(e));
  depart(duel);
  const s = duel.state;
  const fields = ['stageTimeSec', 'lapTimeSec', 'totalTimeSec', 'nextLapGate', 'completedLaps', 'score', 'results', 'majorCrashes'];
  const frozen = Object.fromEntries(fields.map(key => [key, structuredClone(s[key])]));
  const before = duel.course.worldAt(s.s, s.lateral);
  duel.setInput({ throttle: .3 });
  advance(duel, .5);
  const after = duel.course.worldAt(s.s, s.lateral);
  assert.ok(Math.hypot(after.x - before.x, after.z - before.z) > 3, 'exploration remains drivable');
  assert.deepEqual(Object.fromEntries(fields.map(key => [key, s[key]])), frozen);
  assert.equal(events.filter(e => e.hiddenRoadDeparted).length, 1);
  assert.equal(events.some(e => e.stageResult || e.gameover || e.lapCompleted || e.checkpointReset), false);
  assert.equal(journey(duel).controlsLocked, false);
  assert.ok(journey(duel).elapsedSec > 0);
});

check('ordinary lane at the same racing coordinate never departs', () => {
  const duel = race(), p = duel.course.hiddenRoad.poseAt(180);
  Object.assign(duel.state, { s: p.s, prevS: p.s, lateral: 0, prevLateral: 0, speedMph: 30 });
  advance(duel, .2);
  assert.equal(duel.state.status, 'racing');
  assert.equal(journey(duel).departed, false);
});

check('actual 150 metre crossing takes priority over a simultaneous deadline', () => {
  const duel = race(), events = [];
  duel.onChange((_s, e) => events.push(e));
  place(duel, 149.9, { speed: 45 });
  Object.assign(duel.state, { timeLimitSec: 20, stageTimeSec: 20 - dt / 2, racePenaltySec: 0 });
  duel.step(dt);
  assert.equal(duel.state.status, 'exploring');
  assert.equal(events.filter(e => e.hiddenRoadDeparted).length, 1);
  assert.equal(events.some(e => e.stageResult || e.gameover), false, 'no deadline loss before departure');
});

check('departed wash contacts still resolve without terminal damage or earnings', () => {
  const duel = race(), events = [];
  depart(duel);
  duel.onChange((_s, e) => events.push(e));
  const wall = duel.course.hiddenRoad.walls.find(w => w.progress >= 250);
  assert.ok(wall);
  Object.assign(duel.state, { s: wall.s, prevS: wall.s, lateral: wall.lateral,
    prevLateral: wall.lateral, speedMph: 90, lives: 1 });
  const score = duel.state.score, crashes = duel.state.majorCrashes;
  advance(duel, .1);
  const p = duel.course.worldAt(duel.state.s, duel.state.lateral);
  assert.ok(Math.hypot(p.x - wall.x, p.z - wall.z) > 1, 'solid bank resolves the overlap');
  assert.equal(duel.state.status, 'exploring');
  assert.equal(duel.state.majorCrashes, crashes);
  assert.equal(duel.state.score, score);
  assert.equal(events.some(e => e.gameover || e.stageResult || e.ticket), false);
});

for (const route of ROUTE_VARIANTS) for (const car of Object.keys(CARS)) {
  check(`${route.id}/${car}: smooth stop, real gate clearance and safe passage`, () => {
    const duel = race(route.seed, car);
    depart(duel);
    place(duel, duel.course.hiddenRoad.length - 61, { speed: 45, offset: 2 });
    duel.setInput({ throttle: 1, steer: 1, boost: true });
    const halfWidth = CARS[car].collision?.halfWidth ?? CAR_HALF_WIDTH;
    const halfLength = CARS[car].collision?.halfLength ?? CAR_HALF_LENGTH;
    let sawArrival = false, sawOpening = false;
    reachChoice(duel, (before, speed) => {
      const j = journey(duel), after = gatePose(duel);
      assert.ok(Math.hypot(after.world.x - before.world.x, after.world.z - before.world.z) < 1,
        'takeover and alignment cannot teleport the car');
      if (j.phase === 'arriving') {
        sawArrival = true;
        assert.ok(Math.abs(duel.state.speedMph - speed) < 2, 'takeover decelerates over time');
      }
      if (j.phase === 'opening') sawOpening = true;
      assert.ok(after.z + halfLength < 0, 'whole hull stays outside the gate until choice');
    });
    assert.ok(sawArrival && sawOpening, 'stop and lift precede invitation');
    assert.ok(Math.abs(duel.state.speedMph) < .05, 'car is stopped at invitation');
    assert.equal(journey(duel).gateOpen, 1);
    assert.equal(journey(duel).controlsLocked, true);
    assert.equal(duel.chooseHiddenRoad('enter'), true);
    assert.equal(journey(duel).phase, 'choice', 'input queues; simulation owns transition');
    assert.equal(duel.chooseHiddenRoad('turn-back'), false, 'pending choice cannot be replaced');
    for (let i = 0; i < 6 / dt && journey(duel).phase !== 'arrived'; i++) {
      duel.step(dt);
      const p = gatePose(duel), j = journey(duel);
      const width = halfWidth * Math.abs(Math.cos(p.heading)) + halfLength * Math.abs(Math.sin(p.heading));
      assert.ok(Math.abs(p.x) + width < 4.5, 'actual hull fits the nine metre opening');
      assert.ok((CARS[car].height ?? 1.2) < 7, 'actual car height fits the seven metre opening');
      if (p.z + halfLength >= 0) assert.equal(j.gateOpen, 1, 'panel fully lifted before leading bumper crosses');
    }
    assert.equal(journey(duel).phase, 'arrived');
    assert.ok(gatePose(duel).z - halfLength > 0, 'rear bumper clears the wall');
    assert.equal(journey(duel).controlsLocked, true);
    assert.ok(Math.abs(duel.state.speedMph) < .05);
    const parked = gatePose(duel);
    advance(duel, .5);
    assert.deepEqual(gatePose(duel), parked, 'unbuilt yard holds safely');
  });
}

check('invalid, early, paused and repeated choices cannot advance journey', () => {
  const duel = race();
  assert.equal(typeof duel.chooseHiddenRoad, 'function');
  assert.equal(duel.chooseHiddenRoad('enter'), false);
  depart(duel);
  place(duel, duel.course.hiddenRoad.length - 59);
  reachChoice(duel);
  for (const choice of [null, '', 'unlock', 'ENTER']) assert.equal(duel.chooseHiddenRoad(choice), false);
  duel.state.paused = true;
  const frozen = structuredClone(journey(duel));
  assert.equal(duel.chooseHiddenRoad('enter'), false);
  advance(duel, .5);
  assert.deepEqual(journey(duel), frozen);
  duel.state.paused = false;
  const events = [];
  duel.onChange((_s, e) => events.push(e));
  assert.equal(duel.chooseHiddenRoad('turn-back'), true);
  duel.step(dt);
  assert.equal(journey(duel).phase, 'turned-back');
  assert.equal(journey(duel).controlsLocked, false);
  assert.equal(duel.chooseHiddenRoad('enter'), false);
  const before = gatePose(duel);
  duel.setInput({ throttle: .5, steer: 0, boost: false });
  advance(duel, 1);
  assert.notDeepEqual(gatePose(duel), before, 'Turn back restores car controls');
  assert.equal(duel.state.status, 'exploring', 'race cannot be resumed after abandonment');
  assert.equal(events.filter(e => e.hiddenRoadChoice).length, 1);
});

check('swept side wall and closed panel stay solid; raised panel clears Titan', () => {
  const duel = race(1989, 'titan_monster');
  depart(duel);
  const obstacles = JSON.stringify(duel.course.features.obstacles);
  const gate = duel.course.hiddenRoad.poseAt(duel.course.hiddenRoad.length);
  const atGate = (x, z) => duel.course.nearest(gate.x + Math.cos(gate.heading) * x + Math.sin(gate.heading) * z,
    gate.z - Math.sin(gate.heading) * x + Math.cos(gate.heading) * z, gate.s);
  function sweep(x, open) {
    const start = atGate(x, -8), end = atGate(x, 12), s = duel.state;
    Object.assign(s, { prevS: start.s, prevLateral: start.lateral, s: end.s, lateral: end.lateral,
      groundHeight: gate.y, prevGroundHeight: gate.y, airHeight: 0, prevAirHeight: 0,
      speedMph: 60, headingError: angle(gate.heading - duel.course.at(end.s).heading) });
    journey(duel).gateOpen = open;
    duel._staticContacts(s, true);
    return gatePose(duel);
  }
  assert.ok(sweep(100, 0).z + CARS.titan_monster.collision.halfLength <= -1.575 + .1,
    'side wall blocks a swept full hull at its conservative facade plane');
  assert.ok(sweep(0, 0).z + CARS.titan_monster.collision.halfLength <= -.845 + .1,
    'closed physical panel blocks the swept hull');
  assert.ok(sweep(0, 1).z > 5.5 + CARS.titan_monster.collision.halfLength,
    'open panel and seven metre header clear the whole largest car');
  assert.equal(JSON.stringify(duel.course.features.obstacles), obstacles, 'journey contacts do not mutate ordinary course obstacles');
  assert.equal(duel.state.majorCrashes, 0);
  assert.equal(duel.state.status, 'exploring');
});

check('common simulation times agree under 30/60/144 Hz presentation schedules', () => {
  const run = fps => {
    const duel = race(), events = [];
    depart(duel);
    place(duel, duel.course.hiddenRoad.length - 59);
    duel.onChange((_s, e) => { if (e.hiddenRoadPhase || e.hiddenRoadChoice || e.hiddenRoadArrived) events.push(e); });
    let tick = 0;
    const samples = [];
    for (let frame = 1; frame <= fps * 12; frame++) {
      const target = Math.floor(frame * 120 / fps + 1e-9);
      while (tick < target) {
        if (journey(duel).phase === 'choice') duel.chooseHiddenRoad('enter');
        duel.step(dt);
        if (++tick % 120 === 0) samples.push({ journey: structuredClone(journey(duel)), pose: gatePose(duel) });
      }
    }
    // Per-run identity is not a timing outcome.
    for (const item of samples) delete item.journey.id;
    return { samples, phases: events.map(e => e.hiddenRoadPhase?.phase ?? (e.hiddenRoadChoice ? 'enter' : 'arrived')) };
  };
  assert.deepEqual(run(30), run(60));
  assert.deepEqual(run(144), run(60));
});

check('Pro overrev after departure cannot freeze movement; ordinary engine failure remains', () => {
  const duel = race(1989, 'falcone_f42', 'pro');
  depart(duel);
  place(duel, 800, { speed: 57 });
  duel.state.gear = 0;
  duel.setInput({ throttle: 1, steer: 0, brake: 0 });
  advance(duel, DRIVE.overRevBlowSec + .2);
  const before = gatePose(duel);
  advance(duel, .3);
  assert.ok(gatePose(duel).z > before.z + 1, 'limiter does not stop all position integration');
  assert.equal(duel.state.status, 'exploring');
  assert.equal(duel.state.majorCrashes, 0);
  assert.ok(Number.isFinite(duel.state.overrevSec) && duel.state.overrevSec <= DRIVE.overRevBlowSec + dt * 2);
  const ordinary = race(1989, 'falcone_f42', 'pro', false);
  Object.assign(ordinary.state, { speedMph: 57, gear: 0, overrevSec: DRIVE.overRevBlowSec });
  ordinary.setInput({ throttle: 1 });
  advance(ordinary, .1);
  assert.ok(ordinary.state.majorCrashes > 0 || ordinary.state.impactTimer > 0, 'ordinary Pro limiter still fails the engine');
});

check('flag-off has no journey and no accepted choice', () => {
  const duel = race(1989, 'falcone_f42', 'casual', false);
  assert.equal(duel.state.hiddenRoadJourney ?? null, null);
  assert.equal(typeof duel.chooseHiddenRoad, 'function');
  assert.equal(duel.chooseHiddenRoad('enter'), false);
});

for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(`Hidden Road journey: ${checks - failures.length}/${checks} checks passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
