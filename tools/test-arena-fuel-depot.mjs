import assert from 'node:assert/strict';
import {test, after} from 'node:test';
import {Duel} from '../src/game.js';
import {FUEL_RULES, stepFuelRun} from '../src/arena/modes/fuel-run.js';
import {createFuelRunView} from '../src/arena/modes/fuel-run-view.js';

// Claude's 30 September 4 m depot review: native simulation and Three geometry.
const DT = 1 / 120;
const FLAGS = {wasteland2: true, 'hidden-road': true, scrapdome: true, warlords: true, 'fuel-run': true};
let checks = 0;
const eq = (a, b, message) => { checks++; assert.deepEqual(a, b, message); };
const ok = (value, message) => { checks++; assert.ok(value, message); };
const near = (a, b, message) => ok(Math.abs(a - b) < 1e-6,
  message + ': expected ' + b + ', received ' + a);
function start() {
  const duel = new Duel({seed: 1989, featureFlags: FLAGS});
  eq(duel.startArenaEvent({mode: 'fuel-run', car: 'falcone_f42', seed: 1989,
    crewId: 'nell', opponents: [{car: 'dusthawk_rally', brain: 'collector'},
      {car: 'aurora_gt', brain: 'rammer'}, {car: 'stuttgart_959s', brain: 'hunter'}]}), true, 'actual Fuel event starts');
  duel.state.status = 'racing'; duel.state.countdown = 0;
  duel.state.invulnerableSec = 0;
  return duel;
}
const actor = (duel, id) => id === 'player' ? duel.state :
  duel.state.opponents.find(car => car.arenaId === id);
function place(car, pose) {
  Object.assign(car, {s: pose.s, prevS: pose.s, lateral: pose.lateral,
    prevLateral: pose.lateral, speedMph: 0, headingError: 0,
    yawVelocity: 0, pushVelocity: 0, airHeight: 0});
}
function setupCarrier(id, foot = false) {
  const duel = start(), fuel = duel.state.arena.fuelRun;
  for (const car of [duel.state, ...duel.state.opponents])
    place(car, {s: duel.course.length * .93, lateral: 15});
  const p = duel.state.arena.participants.find(p => p.id === id);
  if (foot) {
    const car = duel.state;
    place(car, fuel.pads[0]);
    for (const other of duel.state.opponents) {
      other.combatWrecking = true; other.combatWreckTimer = 100000;
    }
    duel.setInput({interact: true});
    for (let i = 0; i < 48; i++) duel.step(DT);
    duel.setInput({interact: false});
    eq(duel.state.onFoot, true, 'actual F hold creates the depot-test fighter');
    const at = duel.course.groundAt(fuel.pads[0].s, fuel.pads[0].lateral);
    Object.assign(duel.state.fighter, {...at, groundY: at.y,
      s: fuel.pads[0].s, lateral: fuel.pads[0].lateral, airHeight: 0});
  } else place(actor(duel, id), fuel.pads[0]);
  stepFuelRun(duel, DT);
  ok(p.fuelCanisterId, 'native pad collection creates the actual carried canister');
  const depot = fuel.depots.find(d => d.participantId === id);
  return {duel, p, depot, id: p.fuelCanisterId, foot};
}
function atRadius(context, radius, depot = context.depot) {
  const {duel, p, foot} = context;
  const pose = {s: depot.s, lateral: depot.lateral + radius};
  const center = duel.course.worldAt(depot.s, depot.lateral);
  const world = duel.course.groundAt(pose.s, pose.lateral);
  near(Math.hypot(world.x - center.x, world.z - center.z), radius,
    'controlled depot edge is the actual world-space radius');
  if (foot) Object.assign(duel.state.fighter, {...world, ...pose,
    groundY: world.y, airHeight: 0, verticalSpeed: 0});
  else place(actor(duel, p.id), pose);
}

test('the settled depot radius is four metres', () => {
  eq(FUEL_RULES.depotMetres, 4, 'Claude review raises every depot from two to four metres');
});
for (const id of ['player', 'cpu-1', 'cpu-2', 'cpu-3']) {
  for (const radius of [2.001, 3.999]) test(id + ' delivers real car cargo inside the enlarged radius ' + radius, () => {
    const c = setupCarrier(id); atRadius(c, radius); stepFuelRun(c.duel, DT);
    eq(c.p.fuelDelivered, 1, 'native delivery scores at every point inside four metres');
    eq(c.p.fuelCanisterId, null, 'native enlarged-pad delivery consumes the actual cargo');
    eq(c.duel.state.arena.fuelRun.canisters.some(item => item.id === c.id), false,
      'one delivery removes the physical canister');
    stepFuelRun(c.duel, DT); eq(c.p.fuelDelivered, 1, 'staying on the enlarged depot never duplicates points');
  });
  test(id + ' stays carrying immediately outside the four-metre depot', () => {
    const c = setupCarrier(id); atRadius(c, 4.001); stepFuelRun(c.duel, DT);
    eq(c.p.fuelDelivered, 0, 'outside four metres does not score');
    eq(c.p.fuelCanisterId, c.id, 'the actual canister is retained outside the depot boundary');
  });
}
for (const radius of [3.999, 4.001]) test('actual fighter depot boundary at ' + radius + ' metres', () => {
  const c = setupCarrier('player', true), carPose = {s: c.duel.state.s, lateral: c.duel.state.lateral};
  atRadius(c, radius); stepFuelRun(c.duel, DT);
  eq(c.p.fuelDelivered, radius < 4 ? 1 : 0, 'the same four-metre rule reads the actual fighter pose');
  eq(c.p.fuelCanisterId, radius < 4 ? null : c.id, 'fighter cargo uses the same physical depot boundary');
  eq({s: c.duel.state.s, lateral: c.duel.state.lateral}, carPose,
    'fighter delivery never teleports the parked car to the depot');
});
test('the enlarged radius never scores at an enemy depot', () => {
  const c = setupCarrier('player'), enemy = c.duel.state.arena.fuelRun.depots.find(d => d.participantId === 'cpu-1');
  atRadius(c, 3.999, enemy); stepFuelRun(c.duel, DT);
  eq(c.p.fuelDelivered, 0, 'an enemy enlarged pad never awards a point');
  eq(c.p.fuelCanisterId, c.id, 'an enemy enlarged pad keeps the carried canister');
});
test('actual Three depot rings and bases show four metres without changing race state', () => {
  const duel = start(), before = JSON.stringify(duel.state), prior = globalThis.document;
  // Canvas text alone is unavailable in Node; geometry and Fuel view are real Three.
  globalThis.document = {createElement: () => ({getContext: () => ({
    fillRect() {}, strokeRect() {}, fillText() {}})})};
  let view;
  try {
    view = createFuelRunView(duel); view.update([]);
    const pads = view.group.children.find(group => group.type === 'Group');
    eq(pads.children.length, 8, 'native view contains four fuel pads and four depots');
    for (const holder of pads.children.slice(4)) {
      const ring = holder.children.find(mesh => mesh.geometry?.type === 'RingGeometry');
      const base = holder.children.find(mesh => mesh.geometry?.type === 'CylinderGeometry');
      near(ring.geometry.parameters.outerRadius * ring.scale.x, 4, 'actual visible depot ring reaches four metres');
      near(base.geometry.parameters.radiusTop * base.scale.x, 4, 'actual visible depot base reaches four metres');
    }
    eq(JSON.stringify(duel.state), before, 'the widened pad presentation cannot change simulation or scores');
  } finally { view?.dispose(); globalThis.document = prior; }
});
after(() => console.log('Fuel depot radius: ' + checks + ' acceptance checks reached.'));
