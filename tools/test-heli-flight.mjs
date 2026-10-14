// Kestrel One's flight rules (docs/HELICOPTER.md section 3): hover, ground
// effect, thin air, forward-speed lift, fuel, touchdown classes,
// autorotation, the autopilot, and the same flight from the same inputs.
import assert from 'node:assert/strict';
import {
  KESTREL, HELI_STEP, GRAVITY, createHeliState, stepHeli, airFactor, groundEffectFactor,
  speedLiftFactor, touchdownClass, heliReadout, heliFingerprint, horizontalSpeed, heliMass, refuelHeli,
} from '../src/heli/heli-flight.js';
import {createAutopilot, toggleAutopilot, setAutopilotTarget, autopilotStep, AUTOPILOT} from '../src/heli/heli-autopilot.js';
import {flatGround, createHeliGround, groundFromCourse, courseObstacles} from '../src/heli/heli-ground.js';
import {Course} from '../src/course.js';
import {TREMBLANT_WOODS} from '../src/circuits/tremblant-woods.js';

const DEG = Math.PI / 180;
const ground = flatGround(0);
let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} not within ${tolerance} of ${expected}`);
  checks++;
};

function fly(state, seconds, controls = {}, env = {}) {
  const events = [];
  for (let i = 0; i < Math.round(seconds / HELI_STEP); i++) {
    const c = typeof controls === 'function' ? controls(state) : controls;
    events.push(...stepHeli(state, c, {ground, ...env}));
  }
  return events;
}
const airborne = (options = {}) => {
  const state = createHeliState({ground, altitudeOffset: 250, ...options});
  state.y = options.height ?? 30;
  state.onGround = false;
  return state;
};
const types = events => events.map(event => event.type);

// The thrust numbers: full tank and the heaviest load just lift at Tremblant.
near(KESTREL.maxThrust, 1.08 * 3130 * GRAVITY, 1e-6, 'most thrust at sea level');
near(airFactor(250), Math.exp(-250 / 8500), 1e-12, 'thin air at Tremblant');
near(airFactor(860), Math.exp(-860 / 8500), 1e-12, 'thin air at Panorama Ridge');
near(groundEffectFactor(0), 1.15, 1e-12, 'ground effect on the ground');
near(groundEffectFactor(5), 1.075, 1e-12, 'ground effect halfway');
near(groundEffectFactor(10), 1, 1e-12, 'no ground effect at one rotor diameter');
near(groundEffectFactor(40), 1, 1e-12, 'no ground effect high up');
near(speedLiftFactor(0), 1, 1e-12, 'no forward-speed lift in a hover');
near(speedLiftFactor(8), 1, 1e-12, 'forward-speed lift starts at 8 m/s');
near(speedLiftFactor(10.5), 1.05, 1e-12, 'forward-speed lift halfway');
near(speedLiftFactor(13), 1.1, 1e-12, 'forward-speed lift full at 13 m/s');
near(speedLiftFactor(50), 1.1, 1e-12, 'forward-speed lift stays');

// Lift-off and an Assisted hover that holds its height with the keys released.
{
  const state = createHeliState({ground, altitudeOffset: 250});
  ok(state.onGround && state.engine && state.fuelKg === 400, 'starts on the pad, engine running, full tank');
  const events = fly(state, 3, {lift: 1});
  ok(types(events).includes('liftoff'), 'W lifts off');
  fly(state, 3);
  const height = state.y;
  fly(state, 30);
  near(state.y, height, 0.1, 'Assisted hover holds its height for 30 s');
  near(state.vy, 0, 0.01, 'Assisted hover is steady');
  near(state.pitch, 0, 1e-6, 'released cyclic leaves it level');
  const burn = KESTREL.burnIdle + KESTREL.burnPerCollective * state.collective;
  near(burn, 0.55, 0.1, 'hover burns about 0.6 kg/s');
  const minutes = KESTREL.tankKg / burn / 60;
  ok(minutes >= 10 && minutes <= 15, `a full tank hovers 10 to 15 minutes (${minutes.toFixed(1)})`);
}

// Ground effect: hovering low needs less collective than hovering high.
{
  const low = airborne({height: 1});
  fly(low, 10);
  const high = airborne({height: 40});
  fly(high, 10);
  ok(low.collective < high.collective * 0.92, 'ground effect: a low hover needs less collective');
}

// Thin air: a full tank and the heaviest liftable car (1,450 kg) hover at
// Tremblant, sink at Panorama Ridge, and hover there with less fuel.
{
  const car = {x: 0, y: -1450 * GRAVITY, z: 0};
  const tremblant = airborne({height: 40, altitudeOffset: 250});
  fly(tremblant, 10, {}, {external: car});
  near(tremblant.vy, 0, 0.05, 'Tremblant: full tank and a 1,450 kg car hover');
  const panorama = airborne({height: 40, altitudeOffset: 860});
  fly(panorama, 10, {}, {external: car});
  ok(panorama.vy < -0.5 && panorama.collective === 1, 'Panorama Ridge: the same load sinks at full collective');
  const lighter = airborne({height: 40, altitudeOffset: 860, fuelKg: 250});
  fly(lighter, 10, {}, {external: car});
  near(lighter.vy, 0, 0.05, 'Panorama Ridge: with 250 kg of fuel it hovers');
}

// Forward-speed lift: the same collective climbs once past 13 m/s.
{
  const state = airborne({height: 100, mode: 'real'});
  state.collective = 0.46;
  fly(state, 0.01);
  state.vy = 0;
  const hoverAccel = (() => { const copy = structuredClone(state); stepHeli(copy, {}, {ground}); return copy.vy; })();
  state.vx = 20;
  const fastAccel = (() => { const copy = structuredClone(state); stepHeli(copy, {}, {ground}); return copy.vy; })();
  ok(fastAccel > hoverAccel + 0.005, 'forward speed adds lift at the same collective');
}

// Top speed: about 60 m/s with no load in both modes.
{
  const assisted = airborne({height: 100});
  fly(assisted, 80, {pitch: 1});
  near(horizontalSpeed(assisted), 60, 1.5, 'Assisted top speed');
  near(assisted.y, 100, 1, 'Assisted holds height at top speed');
  const real = airborne({height: 100, mode: 'real'});
  real.collective = 0.5;
  fly(real, 0.5, {pitch: 1});
  fly(real, 80, s => ({lift: s.vy < 0 ? 0.6 : s.vy > 0.5 ? -0.6 : 0}));
  near(real.pitch, 25 * DEG, 1e-9, 'Real tilts to 25 degrees');
  near(horizontalSpeed(real), 60.5, 1.5, 'Real top speed stays near 60 m/s at 25 degrees');
}

// Real: the collective stays where it is left and nothing levels itself.
{
  const state = airborne({height: 50, mode: 'real'});
  state.collective = 0.4;
  fly(state, 1, {lift: 1});
  near(state.collective, 0.9, 1e-9, 'Real: W raises the collective at 0.5 a second');
  fly(state, 2);
  near(state.collective, 0.9, 1e-9, 'Real: the collective stays put');
  fly(state, 0.25, {roll: 1});
  near(state.roll, 15 * DEG, 1e-9, 'Real: the cyclic tilts at 60 degrees a second');
  fly(state, 2);
  near(state.roll, 15 * DEG, 1e-9, 'Real: released cyclic keeps the tilt');
  const assisted = airborne({height: 50});
  fly(assisted, 1, {roll: 1});
  near(assisted.roll, 20 * DEG, 0.01, 'Assisted: full cyclic is 20 degrees');
  fly(assisted, 2);
  near(assisted.roll, 0, 0.001, 'Assisted: released cyclic levels');
  const turning = airborne({height: 50});
  fly(turning, 1, {yaw: 1});
  ok(turning.heading < -40 * DEG, 'D turns right (heading falls, like steering)');
  ok(heliReadout(turning).headingDeg > 40 && heliReadout(turning).headingDeg < 60, 'compass heading rises turning right');
}

// Fuel: burn follows the collective; low fuel at 15%; out of fuel stops the engine.
{
  const state = airborne({height: 60, fuelKg: 61});
  const events = fly(state, 5);
  ok(types(events).includes('lowFuel'), 'low fuel warning at 15% (60 kg)');
  const before = state.fuelKg, collective = state.collective;
  fly(state, 1);
  near(before - state.fuelKg, KESTREL.burnIdle + KESTREL.burnPerCollective * collective, 0.01, 'burn = 0.25 + 0.55 x collective kg/s');
  state.fuelKg = 0.01;
  const out = fly(state, 0.1);
  ok(types(out).includes('engineOut') && !state.engine && state.fuelKg === 0, 'the engine stops when the tank is empty');
}

// Touchdown classes.
assert.equal(touchdownClass({sink: 1.5, tilt: 10 * DEG}), 'good'); checks++;
assert.equal(touchdownClass({sink: 1.51}), 'hard'); checks++;
assert.equal(touchdownClass({sink: 3}), 'hard'); checks++;
assert.equal(touchdownClass({sink: 3.01}), 'crash'); checks++;
assert.equal(touchdownClass({sink: 1, tilt: 15 * DEG}), 'hard'); checks++;
assert.equal(touchdownClass({sink: 1, tilt: 21 * DEG}), 'crash'); checks++;
assert.equal(touchdownClass({sink: 1, slide: 5}), 'hard'); checks++;
assert.equal(touchdownClass({sink: 1, slide: 9}), 'crash'); checks++;
{
  const gentle = airborne({height: 20});
  const events = fly(gentle, 30, {lift: -1});
  const touch = events.find(event => event.type === 'touchdown');
  ok(touch?.result === 'good' && touch.sink < 1, 'Assisted: holding S lands gently');
  ok(gentle.onGround && !gentle.crashed, 'resting on the skids after landing');
  const hard = airborne({height: 3, mode: 'real'});
  hard.vy = -2.5;
  hard.collective = 0.42;
  const hardEvents = fly(hard, 2, {}, {});
  ok(hardEvents.find(e => e.type === 'touchdown')?.result === 'hard', 'a 2.5 m/s arrival is a hard landing');
  const crash = airborne({height: 3, mode: 'real'});
  crash.vy = -6;
  const crashEvents = fly(crash, 2);
  ok(types(crashEvents).includes('crash') && crash.crashed, 'a 6 m/s arrival is a crash');
  const frozen = crash.t;
  fly(crash, 1, {lift: 1});
  ok(crash.t === frozen, 'a crash ends the flight');
}

// Autorotation: about 8 m/s sink; a flare within 15 m lands it.
{
  const glide = airborne({height: 400, fuelKg: 0});
  fly(glide, 30);
  near(glide.vy, -8, 0.3, 'autorotation sinks at about 8 m/s');
  ok(glide.rotor > 0.98, 'the rushing air keeps the rotor turning');
  const flare = airborne({height: 200, fuelKg: 0});
  const events = fly(flare, 60, s => ({lift: s.y - s.groundY < 15 ? 1 : 0}));
  const touch = events.find(event => event.type === 'touchdown');
  ok(touch?.result === 'good' && touch.sink <= 1.5, `Assisted flare lands at ${touch?.sink?.toFixed(2)} m/s`);
  ok(types(events).includes('lowRotor'), 'the flare spends rotor speed (low rotor horn)');
  const none = airborne({height: 200, fuelKg: 0});
  const crash = fly(none, 60).find(event => event.type === 'touchdown');
  ok(crash?.result === 'crash', 'no flare is a crash');
  const withCar = airborne({height: 200, fuelKg: 0});
  const carTouch = fly(withCar, 60, s => ({lift: s.y - s.groundY < 15 ? 1 : 0}), {external: {x: 0, y: -1300 * GRAVITY, z: 0}})
    .find(event => event.type === 'touchdown');
  ok(carTouch?.result === 'good', 'Assisted flare also lands with a load pulling');
  const real = (from) => {
    const state = airborne({height: 120, fuelKg: 0, mode: 'real'});
    return fly(state, 60, s => {
      const h = s.y - s.groundY, sinkRate = -s.vy;
      return {lift: h < from ? (sinkRate > 1.2 ? 1 : -1) : (s.collective > 0 ? -1 : 0)};
    }).find(event => event.type === 'touchdown')?.result;
  };
  assert.equal(real(8), 'good', 'Real: a flare from 8 m lands well'); checks++;
  assert.equal(real(14), 'crash', 'Real: flaring too early spends the rotor and crashes'); checks++;
}

// Rotor strikes: a tree beside the helicopter at rotor height is a crash.
{
  const treeGround = createHeliGround({heightAt: () => 0, obstacles: [{x: 6, z: 0, radius: 1.5, base: 0, top: 14}]});
  const state = createHeliState({ground: treeGround});
  state.y = 8; state.onGround = false;
  const events = [];
  for (let i = 0; i < 10; i++) events.push(...stepHeli(state, {}, {ground: treeGround}));
  ok(events.some(event => event.type === 'crash' && event.cause === 'rotor'), 'rotor touching a tree is a crash');
  const clear = createHeliState({ground: treeGround});
  clear.y = 20; clear.onGround = false;
  for (let i = 0; i < 10; i++) stepHeli(clear, {}, {ground: treeGround});
  ok(!clear.crashed, 'above the tree tops is clear');
  const cliff = createHeliGround({heightAt: x => (x > 3 ? 20 : 0)});
  const wall = createHeliState({ground: cliff});
  wall.y = 6; wall.onGround = false;
  stepHeli(wall, {}, {ground: cliff});
  ok(wall.crashed, 'rotor touching a cliff is a crash');
}

// Mountains are cones: the rotor strikes one well above 60 m, the body
// strikes a column between the skids and the rotor, and clear air is clear.
{
  const peak = {x: 0, z: 0, radius: 120, base: 30, top: 110, shape: 'cone'};
  const hills = createHeliGround({heightAt: () => 30, obstacles: [peak]});
  near(hills.topAt(peak, 0), 110, 1e-9, 'a cone peaks at its centre');
  near(hills.topAt(peak, 60), 70, 1e-9, 'a cone falls away linearly');
  near(hills.topAt(peak, 200), 30, 1e-9, 'a cone ends at its base');
  const high = createHeliState({ground: hills});
  high.y = 100; high.onGround = false;
  stepHeli(high, {}, {ground: hills});
  ok(high.crashed, 'flying into a mountain 70 m above the ground is a crash');
  const above = createHeliState({ground: hills});
  above.y = 120; above.onGround = false;
  stepHeli(above, {}, {ground: hills});
  ok(!above.crashed, 'above the peak is clear');
  const post = createHeliGround({heightAt: () => 0, obstacles: [{x: 1, z: 0, radius: 0.5, base: 0, top: 9.5}]});
  const body = createHeliState({ground: post});
  body.y = 8; body.onGround = false;
  stepHeli(body, {}, {ground: post});
  ok(body.crashed, 'a post between the skids and the rotor hits the body');
  near(post.highest(30, 0, 6), 0, 1e-9, 'highest: open ground');
  near(hills.highest(0, 0, 6), 110, 1e-9, 'highest: the peak counts');
}

// Fuel again: refuelling restarts the engine and the warnings fire once.
{
  const state = airborne({height: 80, fuelKg: 61});
  let lows = 0;
  for (let i = 0; i < 120 * 10; i++) lows += stepHeli(state, {}, {ground}).filter(e => e.type === 'lowFuel').length;
  assert.equal(lows, 1, 'low fuel warns once'); checks++;
  state.fuelKg = 0.001;
  fly(state, 0.1);
  ok(!state.engine, 'engine out');
  refuelHeli(state, 300);
  ok(state.engine && state.fuelKg === 300 && !state.lowFuelWarned, 'refuelling restarts the engine and clears the warning');
}

// Bad numbers never spread into the flight.
{
  const state = airborne({height: 40});
  fly(state, 1, {lift: NaN, pitch: Infinity}, {external: {x: NaN, y: undefined, z: 0}, commands: null});
  ok(Number.isFinite(state.y) && Number.isFinite(state.vx), 'NaN inputs are ignored');
  const autopilot = createAutopilot();
  setAutopilotTarget(autopilot, {x: 100, z: 100});
  ok(autopilot.target === null, 'a target without a ground height is refused');
}

// The autopilot looks ahead: a 20% ramp toward the target is climbed in time.
{
  const ramp = createHeliGround({heightAt: (x, z) => Math.max(0, z - 300) * 0.2});
  const state = createHeliState({ground: ramp, altitudeOffset: 250});
  fly(state, 4, {lift: 1}, {ground: ramp});
  const autopilot = createAutopilot();
  toggleAutopilot(autopilot, state);
  setAutopilotTarget(autopilot, {x: 0, z: 1500, groundY: ramp.height(0, 1500)});
  let lowest = Infinity;
  for (let i = 0; i < 120 * 200 && !state.crashed; i++) {
    stepHeli(state, {}, {ground: ramp, commands: autopilotStep(autopilot, state, {}, {ground: ramp}).commands});
    if (state.z > 320 && state.z < 1400) lowest = Math.min(lowest, state.y - ramp.height(state.x, state.z));
  }
  ok(!state.crashed, 'the autopilot climbs a 20% ramp without touching it');
  ok(lowest >= 20, `it stays well clear of rising ground (${lowest.toFixed(1)} m)`);
}

// The autopilot: off at the start, P switches it on, it flies to the
// approach point with at most 10 degrees of tilt and hovers 20 m above the
// zone, and any input beyond 30% takes over.
{
  const state = createHeliState({ground, altitudeOffset: 250});
  fly(state, 4, {lift: 1});
  fly(state, 2);
  const autopilot = createAutopilot();
  ok(!autopilot.engaged, 'the autopilot is off at the start');
  ok(toggleAutopilot(autopilot, state), 'P switches it on');
  const holdY = state.y;
  for (let i = 0; i < 120 * 10; i++) stepHeli(state, {}, {ground, commands: autopilotStep(autopilot, state, {}, {ground}).commands});
  near(state.y, Math.max(holdY, AUTOPILOT.clearance), 1, 'with no destination it holds height (at least 30 m up)');
  setAutopilotTarget(autopilot, {x: 300, z: 1500, groundY: 0});
  let tilt = 0, combined = 0, arrived = null, top = 0;
  for (let i = 0; i < 120 * 150; i++) {
    const out = autopilotStep(autopilot, state, {}, {ground});
    stepHeli(state, {}, {ground, commands: out.commands});
    tilt = Math.max(tilt, Math.abs(state.pitch), Math.abs(state.roll));
    combined = Math.max(combined, Math.hypot(state.pitch, state.roll));
    top = Math.max(top, horizontalSpeed(state));
    if (!arrived && out.events.some(event => event.type === 'autopilotArrived')) arrived = state.t;
  }
  ok(arrived !== null, 'the autopilot arrives at the approach point');
  ok(combined <= 10 * DEG + 0.002, 'its combined tilt stays within 10 degrees');
  ok(tilt <= 10 * DEG + 1e-9, 'it never tilts beyond 10 degrees on either axis');
  near(top, 30, 0.6, 'it cruises at 30 m/s');
  near(Math.hypot(state.x - 300, state.z - 1500), 0, 3, 'it stops over the zone');
  near(state.y, 20, 1, 'it hovers 20 m above the landing zone');
  near(horizontalSpeed(state), 0, 0.3, 'it stops in a hover');
  const small = autopilotStep(autopilot, state, {pitch: 0.29}, {ground});
  ok(autopilot.engaged && small.commands, 'a 29% nudge does not take over');
  const take = autopilotStep(autopilot, state, {lift: -0.31}, {ground});
  ok(!autopilot.engaged && take.commands === null && take.events[0].type === 'autopilotOff', 'a 31% input takes over');
}

// Instruments agree with the simulation.
{
  const state = airborne({height: 50, altitudeOffset: 250});
  state.vx = 10; state.vz = 10; state.vy = 1.5;
  const readout = heliReadout(state, {loadKg: 1300});
  near(readout.altitudeM, 300, 1e-9, 'altitude above sea level');
  near(readout.altitudeFt, 300 * 3.28084, 1e-9, 'altitude in feet');
  near(readout.heightM, 50, 1e-9, 'height above ground');
  near(readout.airspeedKts, Math.hypot(10, 10) * 1.943844, 1e-9, 'airspeed in knots');
  near(readout.climbFpm, 1.5 * 196.8504, 1e-9, 'climb rate in feet a minute');
  near(readout.weightKg, heliMass(state) + 1300, 1e-9, 'weight with the load');
  near(readout.maxLiftKg, KESTREL.maxThrust * airFactor(300) / GRAVITY, 1e-9, 'most liftable weight here');
  near(readout.rotorPct, 100, 1e-9, 'rotor speed');
}

// Same start and inputs give the same flight, to the last digit.
{
  const script = s => ({lift: Math.sin(s.t * 0.7) * 0.8, pitch: Math.cos(s.t * 0.3), roll: Math.sin(s.t * 1.1) * 0.5, yaw: Math.sin(s.t * 0.2)});
  const run = () => { const state = createHeliState({ground, altitudeOffset: 860}); fly(state, 90, script); return heliFingerprint(state); };
  const first = run();
  assert.equal(run(), first, 'same inputs give the same flight'); checks++;
}

// Ground from a real course: Tremblant Woods' start line.
{
  const course = new Course(TREMBLANT_WOODS, 1989);
  const courseGround = groundFromCourse(course);
  const start = course.groundAt(0, 0);
  near(courseGround.height(start.x, start.z), start.y, 0.6, 'ground height at the start line');
  ok(courseObstacles(course).filter(o => o.kind === 'tree').length > 1000, 'the woods are full of trees');
  const pad = createHeliState({x: start.x, z: start.z, ground: courseGround});
  ok(pad.onGround, 'a helicopter placed on the course rests on its ground');
  ok(Number.isFinite(courseGround.height(start.x + 3000, start.z + 3000)), 'ground far from the road still reads');
}

// A rotor with no engine behind it: a tank that starts empty reads a stopped
// rotor; after an engine-out landing it spins down to 0 within 20 s on the
// ground (about 15 s); in the air autorotation is exactly as before.
{
  const parked = createHeliState({fuelKg: 0});
  ok(!parked.engine && parked.onGround, 'an empty-tank helicopter sits with its engine off');
  near(heliReadout(parked).rotorPct, 0, 1e-9, 'and its rotor reads stopped');
  fly(parked, 5);
  near(parked.rotor, 0, 1e-9, 'a parked dead engine stays stopped');
  ok(parked.rotor === 0 && !types(fly(parked, 2)).includes('lowRotor'), 'no low rotor horn for a rotor that is already stopped');
  refuelHeli(parked, 100);
  ok(parked.engine && parked.rotor >= 0.7, 'refuelling restarts the rotor');
  fly(parked, 3);
  near(parked.rotor, 1, 1e-9, 'and the engine spins it back to full speed');
  const full = createHeliState({});
  near(full.rotor, 1, 1e-9, 'a full tank still starts at full rotor speed');

  const glide = airborne({height: 200, fuelKg: 0});
  const events = fly(glide, 60, s => ({lift: s.y - s.groundY < 15 ? 1 : 0}));
  const touch = events.find(event => event.type === 'touchdown');
  ok(touch?.result === 'good' && glide.onGround, 'the engine-out flare lands');
  near(touch.sink, 0.8578, 0.001, 'autorotation flare sink is unchanged');
  ok(types(events).includes('lowRotor'), 'and its low rotor horn is unchanged');
  const settled = glide.t;
  const before = glide.rotor;
  fly(glide, 6);
  near(glide.rotor, Math.max(0, before - 0.07 * (glide.t - settled)), 0.02, 'on the ground the rotor winds down about 0.07 a second');
  fly(glide, 20);
  near(glide.rotor, 0, 1e-9, 'it is stopped within 20 s of an engine-out landing');
  const noFlare = airborne({height: 200, fuelKg: 0});
  const sink = fly(noFlare, 60).find(event => event.type === 'touchdown');
  ok(sink?.result === 'crash' && Math.abs(sink.sink - 8) < 0.001, 'an unflared autorotation arrival is unchanged');
  const air = airborne({height: 400, fuelKg: 0});
  fly(air, 30);
  ok(air.rotor > 0.98, 'airborne autorotation keeps the rotor turning');
}

console.log(`test-heli-flight: ${checks} checks passed`);
