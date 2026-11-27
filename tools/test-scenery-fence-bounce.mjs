// SCENERY-FENCE-BOUNCE: native side-on rams at real thin fences, with memory-only state.
import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {SOLID_GRID, createJobSolidGrid} from '../src/world/scablands-solids.js';
import {homeSolids, newHome} from '../src/world/open/home-rule.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {worldPose} from '../src/arena/arena-floor.js';
import {vehicleContactEnvelope} from '../src/npc-yielding.js';
import {sweepObstacle} from '../src/collision.js';

const DT = 1 / 120, SEED = 1989, GAP = .05;
const CARS = ['falcone_f42', 'dusthawk_rally', 'titan_monster'];
const JOB = {id: 'fence-bounce-check', seed: SEED,
  steps: [{kind: 'reach', lineId: 'start', place: {position: {x: 500, z: 500}}, radius: 1}]};

function place(duel, actor, at, heading, speedMph = 0) {
  const road = duel._roadPosition(at, actor.s), frame = duel.course.at(road.s);
  Object.assign(actor, {s: road.s, prevS: road.s, lateral: road.lateral, prevLateral: road.lateral,
    headingError: heading - frame.heading, speedMph, yawVelocity: 0, pushVelocity: 0, slipAngle: 0,
    airHeight: 0, prevAirHeight: 0, airborne: false, _jumpY: null, _verticalSpeed: 0,
    groundHeight: null, contactCooldown: 0, damageCooldown: 0, impactTimer: 0, knock: null});
}

function fixture(car, fence, playerTarget) {
  const duel = new Duel({seed: SEED});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job',
    car: playerTarget ? car : 'banshee_muscle', seed: SEED,
    opponents: [{car: playerTarget ? 'banshee_muscle' : car, driverId: 'club', brain: 'gunner'}], job: JOB}), true);
  const state = duel.state, cpu = state.opponents[0], target = playerTarget ? state : cpu,
    attacker = playerTarget ? cpu : state;
  Object.assign(state, {status: 'racing', countdown: 0, invulnerableSec: 0});
  state.combat.aiTimer = state.combat.pickupTimer = Infinity;
  duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
  let wall;
  if (fence === 'gate') wall = SOLID_GRID.solids.find(solid => solid.id === 'tin-town-gate-fence-left');
  else {
    const home = {...newHome('Test'), pieces: [{kind: 'panel', i: 10, j: 10, axis: fence}]};
    state.arena.worldJob.solidGrid = createJobSolidGrid();
    const rows = homeSolids(home, {heightAt: scablandsSurfaceHeightAt});
    state.arena.worldJob.solidGrid.setOpenSolids('home-ground', rows);
    wall = state.arena.worldJob.solidGrid.near(rows[0].x, rows[0].z, rows[0].x, rows[0].z, 0)
      .find(solid => solid.id.startsWith('home/panel/'));
  }
  return {duel, state, cpu, target, attacker, wall};
}

function ram(car, fence, face, mph, playerTarget) {
  const {duel, state, cpu, target, attacker, wall} = fixture(car, fence, playerTarget);
  const c = Math.cos(wall.heading), s = Math.sin(wall.heading), nx = face * s, nz = face * c;
  const at = out => ({x: wall.x + nx * out, z: wall.z + nz * out});
  const out = point => (point.x - wall.x) * nx + (point.z - wall.z) * nz;
  const spec = duel._vehicleSpec(target), clearance = wall.halfZ + spec.halfWidth;
  place(duel, target, at(clearance + GAP), Math.atan2(c, -s));
  const envelope = vehicleContactEnvelope(attacker, target, duel._vehicleSpec(attacker), spec);
  place(duel, attacker, at(clearance + GAP + envelope.width + .02), Math.atan2(-nx, -nz), mph + 1.1);
  const participant = state.arena.participants.find(p => p.id === cpu.arenaId);
  const contacts = [], nativeStatic = duel._staticContacts, nativeVehicle = duel._vehicleContact;
  let tick = 0, closingMph = 0;
  duel._vehicleContact = function(a, b, ...rest) {
    const speed = attacker.speedMph;
    const result = Reflect.apply(nativeVehicle, this, [a, b, ...rest]);
    if (result && (a === target || b === target) && (a === attacker || b === attacker)) closingMph = Math.max(closingMph, speed);
    return result;
  };
  duel._staticContacts = function(actor, ...rest) {
    const before = worldPose(duel, actor), from = duel.course.worldAt(actor.prevS, actor.prevLateral);
    const hit = actor === target && sweepObstacle(from, before, wall, before.heading + (actor.slipAngle || 0), spec);
    const result = Reflect.apply(nativeStatic, this, [actor, ...rest]);
    if (hit) {
      const after = worldPose(duel, actor), relative = after.heading + (actor.slipAngle || 0) - wall.heading;
      const reach = spec.halfLength * Math.abs(Math.cos(relative)) + spec.halfWidth * Math.abs(Math.sin(relative));
      contacts.push({tick, depth: hit.penetration, before: out(before), after: out(after),
        gap: out(after) - wall.halfZ - reach, headingBefore: before.heading, headingAfter: after.heading});
    }
    return result;
  };
  const positions = [out(worldPose(duel, target))];
  try {
    for (tick = 0; tick < 12; tick++) {
      Object.assign(participant, {targetId: null, reactionSec: 10});
      duel.step(DT);
      positions.push(out(worldPose(duel, target)));
    }
  } finally { delete duel._staticContacts; delete duel._vehicleContact; }
  const first = contacts[0]?.tick;
  return {car, fence, face, mph, role: playerTarget ? 'player' : 'cpu', contacts, closingMph,
    stepBack: first === undefined ? NaN : positions[first + 2] - positions[first + 1],
    closest: Math.min(...positions), clearance};
}

const rows = [];
for (const car of CARS) for (const fence of ['gate', 'x', 'z']) for (const face of [-1, 1])
  for (const mph of [20, 40]) for (const player of [false, true]) rows.push(ram(car, fence, face, mph, player));
for (const fence of ['gate', 'x', 'z']) for (const role of ['cpu', 'player']) {
  const cases = rows.filter(row => row.fence === fence && row.role === role);
  console.log(`${fence}/${role}: next-tick step back ${Math.min(...cases.map(row => row.stepBack)).toFixed(6)}..${Math.max(...cases.map(row => row.stepBack)).toFixed(6)} m`);
}
const failures = rows.filter(row => !row.contacts.length || row.closingMph < row.mph || row.stepBack > .1 ||
  row.closest < row.clearance - GAP || row.contacts.some(contact => contact.gap < -1e-6 || contact.gap > GAP ||
    Math.abs(contact.headingBefore - contact.headingAfter) > 1e-8));
if (failures.length) console.log(JSON.stringify(failures.slice(0, 2), null, 2));
assert.equal(failures.length, 0, `${failures.length}/${rows.length} rams miss speed/contact, change heading, jump back over 10 cm or fail face clearance`);
console.log(`PASS: ${rows.length} native fence rams at 20/40 mph, both faces, player and CPU.`);

// A shove can put the endpoint's middle beyond the sheet. The swept face must
// still put the car back on its entry side, including a small starting overlap.
let sweeps = 0;
for (const car of CARS) for (const fence of ['gate', 'x', 'z']) for (const face of [-1, 1])
  for (const overlap of [false, true]) for (const player of [false, true]) {
    const {duel, target, wall} = fixture(car, fence, player), spec = duel._vehicleSpec(target);
    const nx = face * Math.sin(wall.heading), nz = face * Math.cos(wall.heading);
    const clearance = wall.halfZ + spec.halfWidth;
    const at = distance => ({x: wall.x + nx * distance, z: wall.z + nz * distance});
    place(duel, target, at(clearance + (overlap ? -.02 : .04)), wall.heading + Math.PI / 2);
    const end = duel._roadPosition(at(-clearance - .5), target.s);
    target.s = end.s; target.lateral = end.lateral;
    target.headingError = wall.heading + Math.PI / 2 - duel.course.at(target.s).heading;
    duel._staticContacts(target, player);
    const after = worldPose(duel, target), gap = (after.x - wall.x) * nx + (after.z - wall.z) * nz - clearance;
    assert.ok(Math.abs(gap - .04) < 1e-6, `${car}/${fence}/${face}/${overlap}/${player}: entry-face gap ${gap}`);
    sweeps++;
  }
console.log(`PASS: ${sweeps} cross-sheet endpoints return to the entry face with 4 cm clearance.`);
