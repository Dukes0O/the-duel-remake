// The car on the cable (docs/HELICOPTER.md section 5): which cars lift, the
// pendulum, set-down, drops, cargo hits, trees that fall, and the same
// swing from the same inputs.
import assert from 'node:assert/strict';
import {GRAVITY, HELI_STEP, createHeliState, stepHeli, heliFingerprint, heliMass} from '../src/heli/heli-flight.js';
import {createAutopilot, toggleAutopilot, setAutopilotTarget, autopilotStep} from '../src/heli/heli-autopilot.js';
import {flatGround, createHeliGround} from '../src/heli/heli-ground.js';
import {CABLE, CRATE, carMassKg, liftCheck, createLoad, canHook, hook, release, stepCable, swingAngle} from '../src/heli/heli-cable.js';
import {CARS} from '../src/config.js';

const DEG = Math.PI / 180;
const ground = flatGround(0);
let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} not within ${tolerance} of ${expected}`);
  checks++;
};

// One step of helicopter and load together, the way the session runs them.
function step(heli, load, controls = {}, env = {}) {
  const cable = stepCable(load, heli, {ground, ...env});
  const events = [...cable.events, ...stepHeli(heli, controls, {ground: env.ground || ground, external: cable.force, commands: env.commands})];
  return events;
}
function fly(heli, load, seconds, controls = {}, env = {}) {
  const events = [];
  for (let i = 0; i < Math.round(seconds / HELI_STEP); i++) {
    events.push(...step(heli, load, typeof controls === 'function' ? controls(heli, load) : controls, env));
  }
  return events;
}
// A helicopter hovering with the hook right above a load on the ground.
function hookedOver(massKg, {fuelKg = 400} = {}) {
  const heli = createHeliState({ground, altitudeOffset: 250, fuelKg});
  const load = createLoad({id: 'car', massKg, ground});
  heli.y = load.y + CABLE.length;
  heli.onGround = false;
  const hooked = hook(heli, load);
  ok(hooked.ok && load.hooked, `hooks a ${massKg} kg load`);
  return {heli, load};
}

// Which cars lift (the packet's table).
const table = {
  viper_proto: [940, true], falcone_heritage: [1150, true], falcone_f42: [1250, true],
  dusthawk_rally: [1280, true], aurora_gt: [1350, true], koenigsegg_jesko: [1390, true],
  stuttgart_959s: [1450, true], banshee_muscle: [1810, false], titan_monster: [4700, false],
  ferrari_enzo: [1365, true], mclaren_f1: [1140, true],
  bugatti_bolide: [1450, true],
  falcone_sirena: [810, true],
};
for (const [id, [mass, lifts]] of Object.entries(table)) {
  assert.equal(carMassKg(id), mass, `${id} mass`); checks++;
  assert.equal(liftCheck(id).ok, lifts, `${id} lifts: ${lifts}`); checks++;
}
ok(Object.keys(CARS).every(id => Object.hasOwn(table, id)), 'every car in the game has a helicopter mass');
ok(/Lab/.test(liftCheck('banshee_muscle').reason), 'the Banshee needs the Lab');
ok(/Too heavy/.test(liftCheck('titan_monster').reason), 'the Titan never lifts');
ok(!liftCheck('no_such_car').ok, 'an unknown car does not lift');
assert.equal(CRATE.massKg, 500, 'the lesson crate'); checks++;
for (const id of ['falcone_f42', 'stuttgart_959s', 'falcone_heritage', 'aurora_gt'])
  ok(CARS[id].mass === undefined, `${id}: car physics gets no new mass`);

// Hooking needs the hook close and the helicopter slow.
{
  const heli = createHeliState({ground});
  const load = createLoad({id: 'car', massKg: 1300, ground, x: 0, z: 0});
  heli.y = load.y + CABLE.length; heli.onGround = false;
  ok(canHook(heli, load), 'hook right above the car');
  heli.x = 4;
  ok(canHook(heli, load), '4 m to the side is within the hook\'s reach');
  heli.x = 4.5;
  ok(!canHook(heli, load), 'not from 4.5 m to the side');
  heli.x = 0; heli.vx = 3;
  ok(!canHook(heli, load), 'not while moving at 3 m/s');
  heli.vx = 0; heli.y += 4;
  ok(!canHook(heli, load), 'not with the hook 4 m above the car');
}

// Hanging still: the cable carries the car's weight to the helicopter.
{
  const {heli, load} = hookedOver(1300);
  const events = fly(heli, load, 15, {lift: 0.5});
  fly(heli, load, 10);
  ok(events.some(e => e.type === 'loadLifted'), 'the car leaves the ground');
  near(heli.y - load.y, CABLE.length, 0.1, 'the car hangs one cable length below');
  near(Math.hypot(heli.x - load.x, heli.z - load.z), 0, 0.05, 'straight below');
  const pull = stepCable(load, heli, {ground}).force.y;
  near(pull, -1300 * GRAVITY, 300, 'the cable pulls the helicopter down by the car\'s weight');
  near(heli.vy, 0, 0.05, 'Assisted holds height with the car on');
}

// The F1's actual configured 1,140 kg load lifts and holds steady on the cable.
{
  const {heli, load} = hookedOver(carMassKg('mclaren_f1'));
  const events = fly(heli, load, 15, {lift: 0.5});
  fly(heli, load, 10);
  ok(events.some(event => event.type === 'loadLifted'), 'the actual F1 load leaves the ground');
  ok(!load.onGround && load.y > 2, 'the F1 stays safely above the ground');
  near(heli.y - load.y, CABLE.length, 0.1, 'the F1 hangs at cable length');
  near(heli.vy, 0, 0.05, 'Assisted holds height with the F1 aboard');
}

// The pendulum: about 7.8 s a swing on 15 m, and it dies away.
{
  const {heli, load} = hookedOver(1300);
  fly(heli, load, 12, {lift: 0.5});
  fly(heli, load, 6);
  load.vx = 3;
  const xs = [];
  for (let i = 0; i < 120 * 40; i++) { step(heli, load); xs.push(load.x - heli.x); }
  const crossings = [];
  for (let i = 1; i < xs.length; i++) if (xs[i - 1] < 0 && xs[i] >= 0) crossings.push(i * HELI_STEP);
  ok(crossings.length >= 3, 'it swings back and forth');
  const period = (crossings.at(-1) - crossings[0]) / (crossings.length - 1);
  // The helicopter is free to move, so it swings against the car: the pair
  // swings faster than a pendulum on a fixed hook, by (1 + car / helicopter).
  const coupled = 2 * Math.PI * Math.sqrt(CABLE.length / (GRAVITY * (1 + 1300 / heliMass(heli))));
  near(period, coupled, 0.4, `swing period ${period.toFixed(2)} s`);
  const first = Math.max(...xs.slice(0, 120 * 8).map(Math.abs)), last = Math.max(...xs.slice(-120 * 8).map(Math.abs));
  ok(last < first * 0.6, 'the swing dies away');
}

// Flying a car on the autopilot at 30 m/s: little swing, nose first.
{
  const {heli, load} = hookedOver(1390);
  fly(heli, load, 15, {lift: 0.6});
  const autopilot = createAutopilot();
  toggleAutopilot(autopilot, heli);
  setAutopilotTarget(autopilot, {x: 0, z: 1500, groundY: 0});
  let swing = 0, top = 0, cruiseHeading = null;
  for (let i = 0; i < 120 * 140; i++) {
    const commands = autopilotStep(autopilot, heli, {}, {ground, hang: CABLE.length + 1, load}).commands;
    step(heli, load, {}, {commands});
    swing = Math.max(swing, swingAngle(load, heli));
    top = Math.max(top, Math.hypot(heli.vx, heli.vz));
    if (cruiseHeading === null && heli.z > 700) cruiseHeading = load.heading;
  }
  ok(top > 25, `the autopilot carries the car at speed (${top.toFixed(1)} m/s)`);
  // At 30 m/s the air alone trails the car about 7 degrees back.
  ok(swing < 12 * DEG, `the swing stays small (${(swing / DEG).toFixed(1)} degrees)`);
  console.log(`  autopilot with a 1,390 kg car: top ${top.toFixed(1)} m/s, widest swing ${(swing / DEG).toFixed(1)} degrees`);
  near(cruiseHeading, 0, 10 * DEG, 'the car hangs nose first the way it flies');
  ok(!heli.crashed, 'no crash on the way');
}

// Setting down in the 12 m circle at 1 m/s or less, then H to let go.
{
  const {heli, load} = hookedOver(1300);
  fly(heli, load, 3, {lift: 0.5});
  const zone = {x: 0, z: 0, radius: CABLE.landingRadius};
  const events = fly(heli, load, 30, (h, l) => ({lift: l.onGround ? 0 : -0.15}), {zone});
  ok(events.some(e => e.type === 'setDown'), 'a gentle set-down in the zone');
  const freed = release(load, ground);
  ok(freed.ok && freed.event.type === 'released' && freed.event.dropMetres === 0, 'H on the ground lets go cleanly');
  ok(!load.hooked, 'unhooked');
  const outside = hookedOver(1300);
  fly(outside.heli, outside.load, 3, {lift: 0.5});
  const away = fly(outside.heli, outside.load, 30, (h, l) => ({lift: l.onGround ? 0 : -0.15}), {zone: {x: 40, z: 0, radius: 12}});
  ok(!away.some(e => e.type === 'setDown') && away.some(e => e.type === 'touched' && !e.inZone), 'outside the circle it only touches');
}

// Released higher than 1 m it drops, and the drop is measured.
{
  const {heli, load} = hookedOver(1300);
  fly(heli, load, 10, {lift: 0.5});
  fly(heli, load, 0.7, {lift: -0.2});
  fly(heli, load, 10);
  const height = load.y - CABLE.restHeight;
  ok(height > 1, `the car hangs ${height.toFixed(1)} m up`);
  const freed = release(load, ground);
  ok(freed.event.type === 'releasedHigh', 'released in the air');
  const events = [];
  for (let i = 0; i < 120 * 5; i++) events.push(...stepCable(load, heli, {ground}).events);
  const drop = events.find(e => e.type === 'drop');
  near(drop?.dropMetres ?? -1, height, 0.01, 'the drop is the height it fell from');
  ok(load.onGround && !load.falling, 'the car lies on the ground');
}

// Cargo hits: slamming the car into the ground, a tree that falls, and
// the car swinging into the helicopter.
{
  const {heli, load} = hookedOver(1300);
  fly(heli, load, 3, {lift: 0.5});
  // Coming down fast with the cable slack: the car meets the ground at 9 m/s.
  load.y = CABLE.restHeight + 2; load.vy = -9; heli.y = load.y + 10;
  const slamEvents = [];
  for (let i = 0; i < 120; i++) slamEvents.push(...stepCable(load, heli, {ground}).events);
  const slam = slamEvents.find(e => e.type === 'cargoHit');
  ok(slam?.with === 'ground' && ['cargoHeavy', 'cargoWreck'].includes(slam.kind), `a 9 m/s slam is a heavy hit (${slam?.kind})`);

  const tree = {x: 0, z: 20, radius: 1.5, base: 0, top: 14, id: 'tree-7', kind: 'tree'};
  const woods = createHeliGround({heightAt: () => 0, obstacles: [tree]});
  const heli2 = createHeliState({ground: woods});
  const car = createLoad({id: 'car', massKg: 1300, ground: woods});
  heli2.y = car.y + CABLE.length; heli2.onGround = false;
  hook(heli2, car);
  heli2.y = 23; car.y = 8; car.onGround = false; heli2.vz = 10; car.vz = 10;
  const fallen = new Set();
  const events = [];
  for (let i = 0; i < 120 * 3; i++) {
    const cable = stepCable(car, heli2, {ground: woods, fallen});
    events.push(...cable.events);
    stepHeli(heli2, {}, {ground: woods, external: cable.force});
  }
  ok(events.some(e => e.type === 'treeDown' && e.id === 'tree-7') && fallen.has('tree-7'), 'the tree the car hits falls over');
  assert.equal(events.filter(e => e.type === 'cargoHit' && e.with === 'tree').length, 1, 'a fallen tree is hit once'); checks++;

  const {heli: h3, load: l3} = hookedOver(1300);
  fly(h3, l3, 10, {lift: 0.5});
  l3.x = h3.x + 1; l3.y = h3.y - 1; l3.vy = 8;
  const bump = stepCable(l3, h3, {ground}).events.find(e => e.type === 'cargoHit');
  ok(bump?.with === 'helicopter', 'the car swinging into the helicopter is a hit');
}

// Review cases: a building is charged once per strike, a release up to
// 1 m is clean, bobbing on the ground sets down once, a hooked car on the
// ground slides instead of anchoring, no hooking past the limit.
{
  const building = {x: 0, z: 20, radius: 4, base: 0, top: 14, id: 'shed', kind: 'building'};
  const town = createHeliGround({heightAt: () => 0, obstacles: [building]});
  for (const speed of [20, 12, 8]) {
    const heli = createHeliState({ground: town});
    const car = createLoad({id: 'car', massKg: 1300, ground: town});
    heli.y = car.y + CABLE.length; heli.onGround = false;
    hook(heli, car);
    heli.y = 23; car.y = 8; car.onGround = false; heli.vz = speed; car.vz = speed;
    const hits = [];
    let inside = 0;
    for (let i = 0; i < 120 * 3; i++) {
      const cable = stepCable(car, heli, {ground: town});
      hits.push(...cable.events.filter(e => e.type === 'cargoHit' && e.with === 'building'));
      if (car.y < building.top && Math.hypot(car.x - building.x, car.z - building.z) < building.radius + CABLE.loadRadius - 0.01) inside++;
      stepHeli(heli, {}, {ground: town, external: cable.force});
    }
    assert.equal(hits.length, 1, `a ${speed} m/s strike on a building is charged once (${hits.length})`); checks++;
    ok(inside === 0, `the car is never left inside the building (${inside} steps)`);
  }
  const pine = {x: 0, z: 20, radius: 1.5, base: 0, top: 14, id: 'pine', kind: 'tree'};
  const grove = createHeliGround({heightAt: () => 0, obstacles: [pine]});
  const heliT = createHeliState({ground: grove});
  const carT = createLoad({id: 'car', massKg: 1300, ground: grove});
  heliT.y = carT.y + CABLE.length; heliT.onGround = false;
  hook(heliT, carT);
  heliT.y = 23; carT.y = 8; carT.onGround = false; heliT.vz = 10; carT.vz = 10;
  let treeHits = 0;
  for (let i = 0; i < 120 * 3; i++) {
    const cable = stepCable(carT, heliT, {ground: grove});
    treeHits += cable.events.filter(e => e.type === 'cargoHit').length;
    stepHeli(heliT, {}, {ground: grove, external: cable.force});
  }
  assert.equal(treeHits, 1, 'without a fallen list from the caller a tree is still hit once'); checks++;

  const {heli, load} = hookedOver(1300);
  fly(heli, load, 3, {lift: 0.5});
  fly(heli, load, 30, (h, l) => ({lift: l.y - CABLE.restHeight > 0.5 ? -0.15 : 0}));
  const low = load.y - CABLE.restHeight;
  ok(low > 0.05 && low <= 1, `the car hangs ${low.toFixed(2)} m up`);
  const freed = release(load, ground);
  ok(freed.event.type === 'released', 'a release at under 1 m is clean');
  const after = [];
  for (let i = 0; i < 120 * 2; i++) after.push(...stepCable(load, heli, {ground}).events);
  ok(after.some(e => e.type === 'settled') && !after.some(e => e.type === 'drop'), 'the car settles without a drop charge');

  const bob = hookedOver(1300);
  fly(bob.heli, bob.load, 3, {lift: 0.5});
  const bobEvents = fly(bob.heli, bob.load, 40, (h, l) => ({lift: l.onGround ? 0.4 : -0.15}), {zone: {x: 0, z: 0, radius: 12}});
  assert.equal(bobEvents.filter(e => e.type === 'setDown').length, 1, 'bobbing on the ground sets down once'); checks++;

  const drag = hookedOver(1450);
  drag.heli.y = drag.load.y + CABLE.length + 0.2;
  let worst = 0;
  for (let i = 0; i < 120 * 6; i++) {
    const vx = drag.heli.vx;
    step(drag.heli, drag.load, {roll: 1, lift: 0});
    worst = Math.max(worst, Math.abs(drag.heli.vx - vx) * 120);
  }
  ok(Math.hypot(drag.load.x, drag.load.z) > 1, 'a hooked car on the ground can be dragged');
  ok(worst < 12, `dragging never jerks the helicopter (${worst.toFixed(1)} m/s2)`);

  const titan = createHeliState({ground});
  const heavy = createLoad({id: 'titan_monster', massKg: 4700, ground});
  titan.y = heavy.y + CABLE.length; titan.onGround = false;
  ok(!hook(titan, heavy).ok, 'a load over the hook limit cannot be hooked');

  const away = createHeliState({ground});
  away.y = 60; away.onGround = false; away.vz = -30;
  const autopilot = createAutopilot();
  toggleAutopilot(autopilot, away);
  setAutopilotTarget(autopilot, {x: 0, z: 2000, groundY: 0});
  const first = autopilotStep(autopilot, away, {}, {ground});
  ok(autopilot.speed < 1, 'engaging while flying away starts the wanted speed from zero, not 30 m/s');
  ok(Number.isFinite(first.commands.pitch), 'the first command is a number');
}

// A badly stretched cable never flings the load.
{
  const {heli, load} = hookedOver(1300);
  fly(heli, load, 3, {lift: 0.5});
  load.onGround = false; load.y = heli.y - CABLE.length - 10;
  let fastest = 0;
  for (let i = 0; i < 120; i++) { stepCable(load, heli, {ground}); fastest = Math.max(fastest, Math.hypot(load.vx, load.vy, load.vz)); }
  ok(fastest < 30, `a 10 m overstretch pulls the car up at ${fastest.toFixed(1)} m/s, not a fling`);
}

// Same inputs give the same swing.
{
  const run = () => {
    const {heli, load} = hookedOver(1250);
    fly(heli, load, 60, h => ({lift: Math.sin(h.t * 0.5) * 0.6 + 0.2, pitch: Math.cos(h.t * 0.2), roll: Math.sin(h.t * 0.9) * 0.6}));
    return heliFingerprint(heli) + `|${load.x.toFixed(6)}|${load.y.toFixed(6)}|${load.z.toFixed(6)}`;
  };
  assert.equal(run(), run(), 'same inputs give the same swing'); checks++;
}

console.log(`test-heli-cable: ${checks} checks passed`);
