// HELI-RUSTWALL slice 2: a helicopter visit in the Scablands (src/heli/heli-session.js with `scablands`). Headless checks of
// the rules first: the town's Helipad is the pad with its pump and the bucket, nothing from the other places is offered, the
// loads wait for the hook, the Ridge fire runs on the fire rules unchanged, and the map fills in from the air. Then one
// scripted flight shows the jobs can be finished: the Ridge fire put out with the bucket from the dip tank, and Old Tam's
// pickup lifted up to his hut. Memory only; same inputs, same flight.
import assert from 'node:assert/strict';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {createTown} from '../src/town/index.js';
import {scablandsHeliInputs} from '../src/town/town-heli.js';
import {createHeliSession} from '../src/heli/heli-session.js';
import {heliOf, HELI_MONEY} from '../src/heli/heli-save.js';
import {SCABLANDS_ID, SCABLANDS_LINES, createScablandsWorld, ridgeFireRecord} from '../src/heli/heli-scablands.js';
import {createScablandsFireRun} from '../src/heli/heli-scablands-fire.js';
import {FIRE, dayWind, runFireEngine, cellIJ} from '../src/heli/heli-fire.js';
import {dispatchBoardMarkup} from '../src/heli/heli-board.js';
import {controlsMarkup, noticeText} from '../src/heli/heli-ui.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const has = (events, type) => events.some(event => event.type === type);
const said = events => events.filter(event => event.type === 'scablandsSaid').map(event => event.id);

const TRAINED = {liftoff: true, hover: true, landing: true, carry: true};
function town({fire = 'burning', reservoir = true, lifts = [], flown = false} = {}) {
  const t = createTown(4242, 'Rustwall');
  t.buildings = [{id: 'building-7', buildingId: 'helipad', regionId: 'scablands', x: 30, z: -12, width: 4, depth: 4, state: 'finished'},
    ...(reservoir ? [{id: 'building-9', buildingId: 'reservoir', regionId: 'scablands', x: 30, z: 6, width: 4, depth: 4, state: 'finished'}] : [])];
  t.heli = {ridgeFire: fire ? {state: fire, raisedTick: 0n} : null, liftsDone: lifts, scouted: 0, flown};
  return t;
}
const profile = (credits = 5000) => normalizeProfile({...createProfile(), credits,
  heli: {version: 1, fuelKg: 150, lessons: TRAINED, refuels: 3, playDay: {last: '2026-11-19', count: 9}}});
const noCourse = id => { throw new Error(`The Scablands visit loaded a course: ${id}`); };
function session(inputs, p = profile()) {
  return createHeliSession({profile: p, enabled: true, loadCourse: noCourse, loadFireCourse: noCourse, fireEnabled: true,
    rescueEnabled: true, pilotMapEnabled: true, summitRunEnabled: true, today: '2026-11-19', carId: 'falcone_f42', scablands: inputs});
}

// ---- The visit, with no flying ---------------------------------------------------------------------------------------------
const inputs = scablandsHeliInputs(town());
const world = createScablandsWorld(inputs);
{
  const s = session(inputs);
  const start = s.start();
  const view = s.view();
  ok(view.courseId === SCABLANDS_ID && view.heli.onGround, 'the visit starts on the town\'s Helipad');
  ok(Math.hypot(view.heli.x - inputs.pad.x, view.heli.z - inputs.pad.z) < 0.01, 'standing on the middle of the pad');
  same(said(start), ['heli.scablands.roger.first', 'heli.scablands.roger.fire'], 'Roger is surprised by the wall, then tells of the fire');
  ok(has(start, 'scablandsFlown'), 'the town is told the first visit has happened');
  ok(view.scablands.atPad && view.scablands.fire === 'burning' && view.scablands.tank, 'the view knows the pad, the fire and the dip tank');
  ok(view.scablands.fuel && Math.hypot(view.scablands.fuel.x - world.tank.x, view.scablands.fuel.z - world.tank.z) <= 60, 'a fuel truck stands with the dip tank while the Ridge burns');
  ok(!view.destinations && !view.secrets && !view.rescue && !view.ski, 'no cruise legs, pilot\'s map, rescues or ski drops over the wall');
  same(s.boardJobs(), [], 'the day\'s jobs stay at Tremblant Woods');
  ok(s.setDestination('tremblant-woods') === false, 'no destination can be chosen in the Scablands');
  const fuel = s.buyFuel(Infinity);
  ok(fuel.ok && fuel.cost === Math.ceil((400 - 150) * HELI_MONEY.creditsPerKg), `the pad's pump fills the tank at the home price (${fuel.cost} credits)`);
  ok(heliOf(s.profile).fuelKg === 400, 'the tank is full');
  ok(s.fitBucket().ok && s.view().bucket, 'the bucket is fitted at the pad');
  ok(said(s.takeEvents()).includes('heli.scablands.roger.tank'), 'Roger says where the dip tank is');
  ok(dispatchBoardMarkup(s.view(), {fire: {repairCost: 0}}).includes('Take off the bucket'), 'the board offers the bucket at the Scablands pad');
  ok(dispatchBoardMarkup(s.view(), {fire: {repairCost: 0}}).includes('Fire at The Ridge'), 'the board\'s radio box names the Ridge fire');
  ok(controlsMarkup(s.view(), {credits: 5000, refuels: 3}).includes('data-heli-fuel="fill"'), 'the pump button shows on the Scablands pad');
  const route = controlsMarkup(s.view(), {credits: 5000, refuels: 3});
  ok(!/Tremblant|Panorama|data-heli-destination/.test(route), 'the panel offers no other course to fly to over the Scablands');
  ok(/THE SCABLANDS/.test(route) && /The pad · here/.test(route) && /The dip tank · \d{3} · \d+\.\d km/.test(route) && /The fire on the Ridge/.test(route) && /Old Tam&#39;s hut|Old Tam's hut/.test(route),
    'it lists this land\'s places with their heading and distance');
  ok(s.takeOffBucket().ok, 'and taken off there');
  const truck = s.view().loads.find(load => load.lift === 'tam-truck');
  ok(truck && truck.renderAs === 'dusthawk_rally' && Math.hypot(truck.x - world.truck.x, truck.z - world.truck.z) < 0.01, 'Old Tam\'s pickup waits at the foot of the Ridge');
  ok(!s.view().loads.some(load => load.lift === 'tam-feed'), 'the feed waits until the fire is over');
  ok(noticeText({type: 'scablandsSaid', who: 'Roger', text: 'Hello.'}) === 'Roger: Hello.', 'the panel shows who said what');
  const left = (s.leave(), s.takeEvents());
  ok(left.some(event => event.type === 'scablandsFire' && event.state === 'burning' && event.fire?.courseId === SCABLANDS_ID), 'leaving hands the fire back to the town');
}
{
  const s = session(scablandsHeliInputs(town({fire: 'out', flown: true})));
  const start = s.start();
  same(said(start), ['heli.scablands.tam.feed'], 'after the fire, with the wall known, Old Tam asks for his feed');
  ok(s.view().loads.some(load => load.lift === 'tam-feed' && load.renderAs === 'crate'), 'the feed crate waits beside the pad');
  ok(s.view().scablands.tank === null && s.view().scablands.fuel === null && s.view().fire === null, 'the fire is out: no tank, no fuel truck, nothing burning');
  ok(s.fitBucket().ok, 'the bucket still fits, for the Reservoir');
}
ok(createHeliSession({profile: profile(), enabled: true, loadCourse: noCourse, scablands: null, fireEnabled: false}) !== null, 'with no Scablands the session is the usual one');
assert.throws(() => session(scablandsHeliInputs(Object.assign(town(), {buildings: []}))), /Helipad/); checks++;

// ---- The Ridge fire on the fire rules, with no flying -------------------------------------------------------------------------
{
  const events = [], run = createScablandsFireRun({world, inputs, emit: event => events.push(event)});
  const start = ridgeFireRecord(world, inputs), wind = dayWind(start.seed, 1);
  // Engine time spreads it exactly as the fire rules do.
  for (let k = 0; k < 40; k++) run.step({dt: 10, engine: true});
  same(run.record(), runFireEngine(start, world.grid, 400, wind).fire, '400 s of engine time is two spread steps of the unchanged rules');
  ok(run.view({x: world.site.zone.x, z: world.site.zone.z}).target?.distance > 1000, 'the instruments point at the hot edge, kilometres from the pad');
  // Water on every burning cell puts it out.
  const patches = run.record().burning.map(([cell]) => { const [i, j] = cellIJ(cell); return {x: (i + 0.5) * FIRE.cell, z: (j + 0.5) * FIRE.cell, litres: 400, radius: 6}; });
  run.water(SCABLANDS_ID, patches);
  ok(run.ended() === 'out' && events.some(event => event.type === 'scablandsFire' && event.state === 'out'), 'enough water puts the Ridge fire out');
  ok(events.some(event => event.type === 'radio' && event.line === 'heli.radio.fire.out') && said(events).includes('heli.scablands.tam.out'), 'Roger and Old Tam say so');
  ok(run.view() === null && run.burning() === false, 'out is out');
}
{
  const events = [], run = createScablandsFireRun({world, inputs, emit: event => events.push(event)});
  for (let k = 0; k < 600 && !run.ended(); k++) run.step({dt: 10, engine: true});
  ok(run.ended() === 'lost' && events.some(event => event.type === 'scablandsFire' && event.state === 'lost'), 'left alone, the Ridge burns out');
  ok(said(events).includes('heli.scablands.roger.lost'), 'Roger says Old Tam and his goats are safe');
}
ok(createScablandsFireRun({world, inputs: {...inputs, ridgeFire: {state: 'out'}}, emit: () => {}}).view() === null, 'no fire, nothing to show');

// ---- One scripted flight: the fire out, then the pickup up the Ridge ---------------------------------------------------------
const ground = world.ground;
function pilot(view, target, {speed = 12, sink = 4} = {}) {
  const h = view.heli;
  const fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), rightX = -fwdZ, rightZ = fwdX;
  const dx = target.x - h.x, dz = target.z - h.z, distance = Math.hypot(dx, dz);
  const want = Math.min(speed, distance * 0.4);
  const wx = distance > 0.01 ? dx / distance * want : 0, wz = distance > 0.01 ? dz / distance * want : 0;
  const ex = wx - h.vx, ez = wz - h.vz, c = v => Math.max(-1, Math.min(1, v));
  return {pitch: c((ex * fwdX + ez * fwdZ) * 0.25), roll: c((ex * rightX + ez * rightZ) * 0.25),
    lift: c(Math.max(-sink, Math.min(sink, target.y - h.y)) * 0.3 - h.vy * 0.3), yaw: 0};
}
function run(s, seconds, controls, until = null) {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 120); i++) {
    events.push(...s.step(controls(s.view())));
    if (until?.(s.view(), events)) break;
  }
  return events;
}
function legHeight(from, to, hang) {
  let top = -Infinity;
  for (let k = 0; k <= 60; k++) top = Math.max(top, ground.highest(from.x + (to.x - from.x) * k / 60, from.z + (to.z - from.z) * k / 60, 8));
  return top + 15 + hang;
}
function travel(s, goal, finalY, {speed = 22, hang = 19} = {}) {
  const view = s.view(), high = Math.max(finalY, legHeight(view.heli, goal, hang)), events = [];
  events.push(...run(s, 60, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: high}, {speed: 1}), v => v.heli.y > high - 3));
  events.push(...run(s, 600, v => pilot(v, {x: goal.x, z: goal.z, y: high}, {speed}), v => Math.hypot(v.heli.x - goal.x, v.heli.z - goal.z) < 3 && Math.hypot(v.heli.vx, v.heli.vz) < 1));
  const sinkAt = v => Math.max(1.5, Math.min(6, (v.heli.y - finalY) / 6));
  events.push(...run(s, 240, v => pilot(v, {x: goal.x, z: goal.z, y: finalY}, {speed: 2, sink: sinkAt(v)}), v => Math.abs(v.heli.y - finalY) < 0.6 && Math.abs(v.heli.vy) < 0.4));
  return events;
}
function fly({maxTrips = Infinity} = {}) {
  const s = session(inputs), log = [...s.start()], zone = s.view().zone;
  const above = (v, m) => ({x: v.heli.x, z: v.heli.z, y: ground.height(v.heli.x, v.heli.z) + m});
  ok(s.buyFuel(Infinity).ok && s.fitBucket().ok, 'fuelled and the bucket fitted');
  log.push(...s.takeEvents());
  const tank = world.tank, surface = ground.water(tank.x, tank.z);
  let trips = 0, refuels = 0, fingerprint = null;
  for (let round = 0; round < 30 && s.view().scablands.fire === 'burning' && trips < maxTrips; round++) {
    // Fuel low: down at the fuel truck beside the dip tank, with the bucket laid on the ground beside it.
    if (s.view().heli.fuelKg < 200) {
      const truck = world.fuel;
      log.push(...travel(s, truck, truck.y + 25));
      log.push(...run(s, 120, v => pilot(v, {x: truck.x, z: truck.z, y: truck.y - 2}, {speed: 1, sink: 1}), v => v.heli.onGround));
      ok(s.view().scablands.atFuel, 'on the ground at the fuel truck');
      if (s.buyFuel(Infinity).ok) refuels++;
      log.push(...s.takeEvents());
    }
    // Scoop: over the dip tank, then low and slow until the bucket is full (it hangs 19 m under the skids).
    log.push(...travel(s, tank, surface + 25));
    log.push(...run(s, 90, v => pilot(v, {x: tank.x, z: tank.z, y: surface + 17.8}, {speed: 1.5, sink: 1}), v => v.bucket?.words === 'full'));
    const target = () => s.view().fire?.target;
    if (!target()) break;
    const first = target();
    log.push(...travel(s, first, ground.height(first.x, first.z) + 60));
    log.push(...run(s, 300, v => {
      const goal = v.fire?.target ?? target(), aim = v.bucket?.aim, lead = aim ? {x: aim.x - v.bucket.x, z: aim.z - v.bucket.z} : {x: 0, z: 0};
      return pilot(v, {x: goal.x - lead.x, z: goal.z - lead.z, y: ground.height(goal.x, goal.z) + 60}, {speed: 3});
    }, v => { const goal = v.fire?.target, aim = v.bucket?.aim; return !goal || aim && Math.hypot(aim.x - goal.x, aim.z - goal.z) < 4 && Math.hypot(v.heli.vx, v.heli.vz) < 1.5; }));
    log.push(...run(s, 6, v => ({...pilot(v, above(v, 60), {speed: 1}), pour: true}), v => (v.bucket?.water ?? 0) <= 0.5));
    log.push(...run(s, 6, v => pilot(v, above(v, 60), {speed: 1}), v => !v.bucket?.parcels.length));
    trips++;
    if (trips === 2) fingerprint = s.fingerprint();
  }
  return {s, log, trips, refuels, fingerprint};
}
const flown = fly();
{
  const {s, log, trips} = flown;
  const out = log.find(event => event.type === 'scablandsFire' && event.state === 'out');
  ok(out, `the Ridge fire is put out from the dip tank (${trips} drops, ${flown.refuels} refuels)`);
  ok(trips >= 2 && trips <= 14, `in a sensible number of drops (${trips})`);
  ok(has(log, 'fireHiss') && has(log, 'bucketDip'), 'the bucket dipped in the tank and the water hissed on the fire');
  ok(log.some(event => event.type === 'scablandsScouted' && event.chunks.length), 'the flight put land on the town\'s map');
  ok(said(log).includes('heli.scablands.roger.scout'), 'Roger says what scouting does, once');
  ok(!has(log, 'crashed'), 'no crash on the way');
  // Then on the same flight: back to the pad for the bucket, and up the Ridge with Old Tam's pickup.
  const zone = s.view().zone;
  log.push(...travel(s, zone, zone.y + 25));
  log.push(...run(s, 120, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y - 2}, {speed: 1, sink: 1}), v => v.heli.onGround));
  ok(s.takeOffBucket().ok, 'the bucket comes off at the pad');
  if (s.view().heli.fuelKg < 300) s.buyFuel(Infinity);
  const truck = world.truck, hut = world.hut;
  // Hover with the hook over the pickup (the hook hangs 15 m under the skids) and press H.
  log.push(...travel(s, truck, truck.y + 16.4, {hang: 15}));
  log.push(...run(s, 20, v => pilot(v, {x: truck.x, z: truck.z, y: truck.y + 16.4}, {speed: 0.5, sink: 0.5}), v => Math.hypot(v.heli.vx, v.heli.vz, v.heli.vy) < 0.4));
  const hooked = s.pressHook();
  ok(hooked?.type === 'hooked', `the pickup is hooked (${hooked?.type ?? 'nothing'})`);
  log.push(...travel(s, hut, hut.y + 16.2, {speed: 12, hang: 17}));
  log.push(...run(s, 30, v => pilot(v, {x: hut.x, z: hut.z, y: hut.y + 15.5}, {speed: 0.4, sink: 0.4}), v => v.loads.find(load => load.lift === 'tam-truck')?.onGround));
  log.push(...s.takeEvents());
  const released = s.pressHook();
  log.push(...s.takeEvents());
  ok(released?.type === 'released', `set down gently at the hut (${released?.type})`);
  ok(log.some(event => event.type === 'scablandsLift' && event.liftId === 'tam-truck') && said(log).includes('heli.scablands.tam.trucked'), 'Old Tam has his pickup back');
}
// The same inputs fly the same flight.
same(fly({maxTrips: 2}).fingerprint, flown.fingerprint, 'same inputs, same flight after two drops');

console.log(`test-heli-scablands-session: ${checks} checks passed`);
