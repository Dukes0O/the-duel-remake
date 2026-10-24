// LAB-HELI-CHALLENGES (docs/LAB.md 4.1 and 4.2): the six helicopter challenges. Each goal passes for a scripted good
// flight and fails for a scripted bad one, and the same inputs give the same answer. Headless, memory only.
import assert from 'node:assert/strict';
import test from 'node:test';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {createHeliSession, courseSite} from '../src/heli/heli-session.js';
import {armMissions} from '../src/heli/heli-missions.js';
import {setMissions, createMissions, heliOf} from '../src/heli/heli-save.js';
import {KESTREL} from '../src/heli/heli-flight.js';
import {FIRE, cellIJ} from '../src/heli/heli-fire.js';
import {CHALLENGE_IDS, CHALLENGE_RULES, challengeSpots, createChallenge, stepChallenge, challengeProps, challengeBriefing} from '../src/lab/lab-challenges.js';
import {labOf, createLab} from '../src/lab/lab-save.js';
import {createProfile, normalizeProfile} from '../src/progression.js';

const on = {enabled: true};
const worlds = new Map();
function loadCourse(id) {
  if (!worlds.has(id)) { const course = new Course(ALL_CIRCUITS.find(def => def.id === id), 1989); worlds.set(id, {course, ground: groundFromCourse(course)}); }
  return worlds.get(id);
}
const woods = loadCourse('tremblant-woods'), site = courseSite(woods.course, woods.ground, 'tremblant-woods');
const spotsOf = id => challengeSpots(id, woods, site);

// ---- scripted views -------------------------------------------------------------------------------------
const heliAt = (x, z, {y = 30, groundY = 14, onGround = false, fuelKg = 400} = {}) => ({x, y, z, groundY, onGround, fuelKg});
const quiet = (overrides = {}) => ({courseId: 'tremblant-woods', heli: heliAt(site.zone.x, site.zone.z), load: null, loadHeight: null, patches: [], events: [], ringIndex: 0, ...overrides});
// Runs a script: a list of [seconds, view] segments at 1/10 s steps. Returns the answers and the last non-running one.
function fly(challenge, script, dt = 0.1) {
  const answers = [];
  for (const [seconds, view] of script) {
    for (let t = 0; t < seconds - 1e-9; t += dt) {
      const answer = stepChallenge(challenge, typeof view === 'function' ? view(t) : view, dt);
      answers.push(answer);
      if (answer.result !== 'running') return {answers, last: answer};
    }
  }
  return {answers, last: answers.at(-1)};
}
const lastOf = (challenge, script) => fly(challenge, script).last;

test('the six challenges are the ones in the design, with its numbers', () => {
  assert.deepEqual(CHALLENGE_IDS, ['lift', 'projectile', 'fire', 'pendulum', 'altitude', 'headings']);
  assert.deepEqual(CHALLENGE_RULES.lift, {carId: 'dusthawk_rally', radius: 6, low: 2, high: 5, holdSeconds: 10, fullTankKg: KESTREL.tankKg - 1});
  assert.equal(CHALLENGE_RULES.projectile.buoys, 3); assert.equal(CHALLENGE_RULES.projectile.hitRadius, 5);
  assert.equal(CHALLENGE_RULES.fire.seconds, 180);
  assert.equal(CHALLENGE_RULES.pendulum.swingMetres, 1);
  assert.equal(CHALLENGE_RULES.altitude.crateKg, 300); assert.equal(CHALLENGE_RULES.altitude.fuelShare, 0.3);
  assert.equal(CHALLENGE_RULES.headings.radius, 30); assert.equal(CHALLENGE_RULES.headings.height, 20);
  assert.throws(() => createChallenge('nonsense', {}));
});

test('where things are: buoys on the lake clear of the scoop area, a clear target, a marker at its heading and distance', () => {
  const projectile = spotsOf('projectile');
  assert.equal(projectile.buoys.length, 3);
  for (const buoy of projectile.buoys) {
    assert.ok(woods.ground.water(buoy.x, buoy.z) != null, 'a buoy floats on the lake');
    assert.ok(Math.hypot(buoy.x - projectile.scoop.x, buoy.z - projectile.scoop.z) >= CHALLENGE_RULES.projectile.scoopKeepOut, 'clear of the scoop area');
  }
  for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++)
    assert.ok(Math.hypot(projectile.buoys[a].x - projectile.buoys[b].x, projectile.buoys[a].z - projectile.buoys[b].z) >= CHALLENGE_RULES.projectile.apart, 'buoys are apart');
  const pendulum = spotsOf('pendulum');
  near(Math.hypot(pendulum.target.x - site.zone.x, pendulum.target.z - site.zone.z), 500, 0.2, 'the target is across the woods');
  const headings = spotsOf('headings'), dx = headings.marker.x - site.zone.x, dz = headings.marker.z - site.zone.z;
  near((Math.atan2(dx, dz) * 180 / Math.PI + 360) % 360, 70, 1e-9, 'the marker\'s heading from the pad');
  near(Math.hypot(dx, dz), 550, 1e-9, 'and its distance');
  assert.equal(headings.headingDeg, 70); assert.equal(headings.distanceM, 550);
  // The practice fire is on dry ground on the lake shore, a short hop from the water, and the same every time.
  const fireSpots = spotsOf('fire'), rule = CHALLENGE_RULES.fire;
  for (let i = 0; i < rule.columns; i++) for (let j = 0; j < rule.rows; j++)
    assert.equal(woods.ground.water((fireSpots.fire.i0 + i + 0.5) * FIRE.cell, (fireSpots.fire.j0 + j + 0.5) * FIRE.cell) == null, true, 'no cell in the water');
  const fireMiddle = {x: (fireSpots.fire.i0 + rule.columns / 2) * FIRE.cell, z: (fireSpots.fire.j0 + rule.rows / 2) * FIRE.cell};
  assert.ok(Math.hypot(fireMiddle.x - fireSpots.scoop.x, fireMiddle.z - fireSpots.scoop.z) <= 260, 'within a short hop of the scoop spot');
    assert.deepEqual(spotsOf('fire'), spotsOf('fire'));
  for (const id of CHALLENGE_IDS) assert.deepEqual(spotsOf(id), spotsOf(id), `${id}: the same spots every time`);
});
function near(actual, expected, share, message) { assert.ok(Math.abs(actual - expected) <= Math.abs(expected) * share, `${message}: ${actual} against ${expected}`); }

// ---- Lift: the Dusthawk on the hook, 10 s at 2 to 5 m over the pad -------------------------------------------
test('lift: a steady hover with the Dusthawk passes; every way of not holding it does not', () => {
  const car = {id: 'dusthawk_rally', hooked: true, onGround: false, x: site.zone.x, y: 30, z: site.zone.z};
  const holding = (extra = {}) => quiet({load: {...car, ...extra.load}, loadHeight: 3.5, ...extra, heli: heliAt(site.zone.x + 1, site.zone.z - 1, extra.heli)});
  const good = lastOf(createChallenge('lift', spotsOf('lift')), [[10.5, holding()]]);
  assert.equal(good.result, 'passed');
  // 9.5 seconds is not enough.
  assert.equal(lastOf(createChallenge('lift', spotsOf('lift')), [[9.5, holding()]]).result, 'running');
  // Too low, too high, off the ground not at all, drifting off the pad, wrong load, not hooked.
  for (const [name, bad] of [['too low', holding({loadHeight: 1.5})], ['too high', holding({loadHeight: 5.5})], ['on the ground', holding({load: {onGround: true}})],
    ['off the pad', quiet({load: car, loadHeight: 3.5, heli: heliAt(site.zone.x + 8, site.zone.z)})], ['another car', holding({load: {id: 'falcone_f42'}})],
    ['not hooked', holding({load: {hooked: false}})], ['no load', quiet()]])
    assert.equal(lastOf(createChallenge('lift', spotsOf('lift')), [[30, bad]]).result, 'running', name);
  // Losing it for a moment starts the 10 s again.
  const slip = lastOf(createChallenge('lift', spotsOf('lift')), [[6, holding()], [0.5, holding({loadHeight: 6})], [6, holding()]]);
  assert.equal(slip.result, 'running');
  assert.equal(lastOf(createChallenge('lift', spotsOf('lift')), [[6, holding()], [0.5, holding({loadHeight: 6})], [10.5, holding()]]).result, 'passed');
});

// ---- Projectile motion: three buoys, each hit within 5 m -------------------------------------------------------
test('projectile: all three buoys hit within 5 m passes with the ring in use; a miss, a dry drop or two buoys does not', () => {
  const spots = spotsOf('projectile'), patchAt = (buoy, off, litres = 25) => ({x: buoy.x + off, z: buoy.z, litres, radius: 4});
  const ch = createChallenge('projectile', spots);
  const first = stepChallenge(ch, quiet({patches: [patchAt(spots.buoys[0], 4.9)]}), 0.1);
  assert.equal(first.result, 'running'); assert.equal(first.cue, 'heli.buoy-hit'); assert.deepEqual(first.events, [{type: 'buoyHit', index: 0}]);
  assert.deepEqual(challengeProps(ch).map(prop => prop.hit), [true, false, false]);
  // A drop that misses by 5.1 m, and one with no water in it, count for nothing.
  assert.equal(stepChallenge(ch, quiet({patches: [patchAt(spots.buoys[1], 5.1), patchAt(spots.buoys[1], 0, 0)]}), 0.1).cue, null);
  assert.deepEqual(challengeProps(ch).map(prop => prop.hit), [true, false, false]);
  stepChallenge(ch, quiet({patches: [patchAt(spots.buoys[1], -3)]}), 0.1);
  const done = stepChallenge(ch, quiet({patches: [patchAt(spots.buoys[2], 0)], ringIndex: 2}), 0.1);
  assert.equal(done.result, 'passed'); assert.equal(done.ring, 2, 'it passes with the ring in use');
  assert.equal(lastOf(createChallenge('projectile', spots), [[1, quiet({patches: [patchAt(spots.buoys[0], 0)]})], [1, quiet({patches: [patchAt(spots.buoys[1], 0)]})]]).result, 'running', 'two buoys is not enough');
  // One drop that lands on two buoys' worth of water counts each buoy it reaches, and a hit buoy stays hit.
  const again = createChallenge('projectile', spots);
  stepChallenge(again, quiet({patches: [patchAt(spots.buoys[0], 0)]}), 0.1);
  assert.equal(stepChallenge(again, quiet({patches: [patchAt(spots.buoys[0], 0)]}), 0.1).cue, null, 'the same buoy cannot score twice');
});

// ---- Fire triangle: the practice fire must not reach the road in three minutes -------------------------------
// The bucket's drops, scripted: water on every burning cell every 20 s, or a line of retardant across the fire's path.
function firePatches(ch, {litres = 600, radius = 8, retardant = false} = {}) {
  return ch.fire.burning.map(([cell]) => { const [i, j] = cellIJ(cell); return {x: (i + 0.5) * FIRE.cell, z: (j + 0.5) * FIRE.cell, litres, radius, ...(retardant ? {retardant: true} : {})}; });
}
test('fire: left alone it reaches the road; water on the flames or a line of retardant in its path holds it for three minutes', () => {
  const neglected = fly(createChallenge('fire', spotsOf('fire')), [[400, quiet()]]);
  assert.equal(neglected.last.result, 'retry'); assert.equal(neglected.last.reason, 'The fire reached the road.');
  assert.ok(neglected.answers.length * 0.1 < CHALLENGE_RULES.fire.seconds, 'and it does so inside the three minutes');
  // Water: a drop on every flame, every 20 s, from the first seconds on.
  const watered = createChallenge('fire', spotsOf('fire')), wet = [];
  let result = null;
  for (let t = 0; t < 200 && !result; t += 0.1) {
    const patches = Math.round(t * 10) % 200 === 50 ? firePatches(watered) : [];
    const answer = stepChallenge(watered, quiet({patches}), 0.1);
    if (answer.result !== 'running') result = answer;
  }
  assert.equal(result.result, 'passed', 'water on the flames holds the fire');
  assert.ok(watered.elapsed <= CHALLENGE_RULES.fire.seconds + 0.2);
  // Retardant: treat the fourth column right away, then wait.
  const strip = createChallenge('fire', spotsOf('fire'));
  const column = [...strip.grid.cells.values()].filter(cell => cell.i === strip.grid.cells.values().next().value.i + 4).map(cell => ({x: cell.x, z: cell.z, litres: 4000, radius: 4, retardant: true}));
  const treated = lastOf(strip, [[0.1, quiet({patches: column})], [190, quiet()]]);
  assert.equal(treated.result, 'passed', 'a treated line stops the spread');
  // The same inputs, the same answer.
  const a = fly(createChallenge('fire', spotsOf('fire')), [[400, quiet()]]), b = fly(createChallenge('fire', spotsOf('fire')), [[400, quiet()]]);
  assert.deepEqual(a.last, b.last); assert.equal(a.answers.length, b.answers.length);
  // The props show the cells, the flames and the road column.
  const props = challengeProps(createChallenge('fire', spotsOf('fire')));
  assert.equal(props.length, CHALLENGE_RULES.fire.columns * CHALLENGE_RULES.fire.rows);
  assert.equal(props.filter(prop => prop.percent > 0).length, 1); assert.equal(props.filter(prop => prop.road).length, CHALLENGE_RULES.fire.rows);
});

// ---- Pendulums: a car carried across the woods and set down with the swing under 1 m ---------------------------
test('pendulum: set down at the far place with a small swing passes; a swinging car, a dropped car or the wrong place does not', () => {
  const target = spotsOf('pendulum').target;
  const carried = (swing, at = target) => quiet({load: {id: 'falcone_f42', hooked: true, onGround: false, x: at.x + swing, y: 20, z: at.z}, heli: heliAt(at.x, at.z)});
  const letGo = (type, extra = {}) => quiet({events: [{type, id: 'falcone_f42', ...extra}]});
  const run = (swing, release, at) => lastOf(createChallenge('pendulum', spotsOf('pendulum')), [[3, carried(swing, at)], [0.1, release]]);
  assert.equal(run(0.4, letGo('released', {dropMetres: 0})).result, 'passed');
  assert.equal(run(1.4, letGo('released', {dropMetres: 0})).reason, 'The car was still swinging when you let go.');
  assert.equal(run(0.4, letGo('releasedHigh', {heightM: 6})).reason, 'Set the car down, do not drop it.');
  assert.equal(run(0.4, letGo('released', {dropMetres: 0}), {x: site.zone.x, z: site.zone.z}).reason, 'That is not the place: carry it across the woods.');
  assert.equal(run(0.4, quiet()).result, 'running', 'nothing is decided until the car is let go');
  // The swing counts at the moment of letting go, not an earlier wild one.
  const calmed = lastOf(createChallenge('pendulum', spotsOf('pendulum')), [[2, carried(3)], [3, carried(0.3)], [0.1, letGo('released', {dropMetres: 0})]]);
  assert.equal(calmed.result, 'passed');
  // Another car being let go is not this car.
  assert.equal(lastOf(createChallenge('pendulum', spotsOf('pendulum')), [[3, carried(0.4)], [0.1, quiet({events: [{type: 'released', id: 'dusthawk_rally', dropMetres: 0}]})]]).result, 'running');
});

// ---- Air and altitude: a 300 kg crate set down at Summit Run with 30% of the fuel ------------------------------
test('altitude: the crate set down at Summit Run with fuel to spare passes; too little fuel, the wrong course or in the air does not', () => {
  const summit = (extra = {}) => quiet({courseId: 'summit-run', events: [{type: 'setDown', id: 'lab-crate'}], heli: heliAt(0, 0, {onGround: true, fuelKg: 150, ...extra.heli}), ...extra.view});
  const ch = () => createChallenge('altitude', {zone: site.zone});
  assert.equal(lastOf(ch(), [[0.1, summit()]]).result, 'passed');
  assert.equal(lastOf(ch(), [[0.1, summit({heli: {fuelKg: KESTREL.tankKg * 0.3}})]]).result, 'passed', 'exactly 30% is enough');
  assert.equal(lastOf(ch(), [[0.1, summit({heli: {fuelKg: KESTREL.tankKg * 0.3 - 1}})]]).result, 'retry', 'a kilogram short is not');
  assert.equal(lastOf(ch(), [[0.1, quiet({events: [{type: 'setDown', id: 'lab-crate'}]})]]).result, 'running', 'set down at the home pad does not count');
  assert.equal(lastOf(ch(), [[0.1, summit({heli: {onGround: false}})]]).result, 'running', 'the helicopter must have landed too');
  assert.equal(lastOf(ch(), [[0.1, summit({view: {events: [{type: 'setDown', id: 'something-else'}]}})]]).result, 'running');
  // Set down first, landed a moment later, still counts.
  assert.equal(lastOf(ch(), [[0.1, summit({heli: {onGround: false}})], [0.1, quiet({courseId: 'summit-run', heli: heliAt(0, 0, {onGround: true, fuelKg: 150})})]]).result, 'passed');
});

// ---- Headings: a smoke marker at a set heading and distance -------------------------------------------------
test('headings: over the marker, low, in the air passes; too far, too high or on the ground does not', () => {
  const marker = spotsOf('headings').marker, over = (dx, y, onGround = false) => quiet({heli: heliAt(marker.x + dx, marker.z, {y: 14 + y, groundY: 14, onGround})});
  const ch = () => createChallenge('headings', spotsOf('headings'));
  assert.equal(lastOf(ch(), [[0.1, over(29, 19)]]).result, 'passed');
  assert.equal(lastOf(ch(), [[0.1, over(31, 10)]]).result, 'running', 'beyond 30 m');
  assert.equal(lastOf(ch(), [[0.1, over(5, 20)]]).result, 'running', 'at 20 m is not below 20 m');
  assert.equal(lastOf(ch(), [[0.1, over(5, 5, true)]]).result, 'running', 'flown there, not driven');
  assert.equal(lastOf(ch(), [[10, over(300, 60)], [0.1, over(0, 10)]]).result, 'passed');
  const brief = challengeBriefing(ch());
  assert.deepEqual(brief, {id: 'headings', headingDeg: 70, distanceM: 550, arrow: false, autopilot: false});
  assert.deepEqual(challengeProps(ch()).map(prop => prop.kind), ['smoke']);
});

test('once passed a challenge stays passed, and the same script always gives the same answers', () => {
  const run = () => fly(createChallenge('headings', spotsOf('headings')), [[3, quiet({heli: heliAt(0, 0)})], [1, ({}) => quiet({heli: heliAt(spotsOf('headings').marker.x, spotsOf('headings').marker.z, {y: 20})})]]);
  assert.deepEqual(run(), run());
  const ch = createChallenge('headings', spotsOf('headings'));
  stepChallenge(ch, quiet({heli: heliAt(spotsOf('headings').marker.x, spotsOf('headings').marker.z, {y: 20})}), 0.1);
  assert.equal(stepChallenge(ch, quiet(), 0.1).result, 'passed');
});

// ---- the session ----------------------------------------------------------------------------------------
const DAY = '2026-10-20', TRAINED = {liftoff: true, hover: true, landing: true, carry: true};
function readyProfile({labField} = {}) {
  const profile = normalizeProfile({...createProfile(), credits: 5000, courses: {version: 1, unlocked: ['tremblant-woods']},
    heli: {version: 1, fuelKg: 400, lessons: TRAINED, refuels: 3, playDay: {last: DAY, count: 5}}, ...(labField ? {lab: labField} : {})});
  const armed = armMissions(createMissions(), {date: '2026-10-14', playerName: 'Lab QA'});
  return setMissions(profile, {...armed, count: armed.need}, on).profile;
}
const sessionOf = (profile, extra = {}) => createHeliSession({profile, enabled: true, loadCourse, loadFireCourse: loadCourse, fireEnabled: true,
  playerName: 'Lab QA', today: DAY, carId: 'falcone_f42', ...extra});
function pilot(view, target, {speed = 12, sink = 4} = {}) {
  const h = view.heli, fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), rightX = -fwdZ, rightZ = fwdX;
  const dx = target.x - h.x, dz = target.z - h.z, distance = Math.hypot(dx, dz), want = Math.min(speed, distance * 0.4);
  const wx = distance > 0.01 ? dx / distance * want : 0, wz = distance > 0.01 ? dz / distance * want : 0, ex = wx - h.vx, ez = wz - h.vz;
  const clamp = v => Math.max(-1, Math.min(1, v));
  return {pitch: clamp((ex * fwdX + ez * fwdZ) * 0.25), roll: clamp((ex * rightX + ez * rightZ) * 0.25),
    lift: clamp(Math.max(-sink, Math.min(sink, target.y - h.y)) * 0.3 - h.vy * 0.3), yaw: 0};
}
function run(session, seconds, controls, until = null) {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 120); i++) { events.push(...session.step(controls(session.view()))); if (until?.(session.view(), events)) break; }
  return events;
}
const has = (events, type) => events.some(event => event.type === type);

test('with the Lab off nothing is offered and the view has no challenge', () => {
  const session = sessionOf(readyProfile());
  session.start();
  assert.equal(session.startChallenge('lift').ok, false);
  assert.ok(session.challengeBoard().every(row => row.open === false && row.active === false));
  assert.equal(Object.hasOwn(session.view(), 'challenge'), false);
  assert.equal(session.stopChallenge(), false);
  session.leave();
});

test('the board opens the challenges with the Lab and the flying lessons, and a try starts only on the pad', () => {
  const session = sessionOf(readyProfile(), {labEnabled: true});
  session.start();
  assert.deepEqual(session.challengeBoard().map(row => row.id), CHALLENGE_IDS);
  assert.ok(session.challengeBoard().every(row => row.open && !row.active && !row.done));
  assert.equal(session.startChallenge('nonsense').ok, false);
  const started = session.startChallenge('headings');
  assert.equal(started.ok, true);
  assert.equal(session.challengeBoard().find(row => row.id === 'headings').active, true);
  // No arrow and no autopilot for the heading flight.
  const view = session.view();
  assert.equal(view.challenge.id, 'headings'); assert.equal(view.destination, null); assert.equal(view.autopilot, false);
  assert.equal(session.pressAutopilot(), false); assert.equal(session.setDestination('panorama-ridge'), false);
  assert.deepEqual(view.challenge.props.map(prop => prop.kind), ['smoke']);
  assert.equal(view.challenge.briefing.headingDeg, 70);
  // Starting a lesson, or stopping, ends the try.
  assert.equal(session.stopChallenge(), true);
  assert.equal(Object.hasOwn(session.view(), 'challenge'), false);
  assert.equal(session.startChallenge('lift').ok, true);
  assert.equal(session.view().loads.filter(load => load.id === 'dusthawk_rally').length, 1, 'the Dusthawk waits by the pad');
  assert.equal(session.startLesson('hover').ok, true);
  assert.equal(Object.hasOwn(session.view(), 'challenge'), false);
  assert.equal(session.view().loads.some(load => load.id === 'dusthawk_rally'), false, 'and goes with it');
  session.stopLesson();
  // Air and altitude needs Summit Run; the tank must be full for the Dusthawk.
  assert.equal(session.startChallenge('altitude').ok, false);
  session.leave();
});

test('a scripted heading flight to the smoke marker passes, is saved, and a flight the wrong way does not', () => {
  const profile = readyProfile();
  const session = sessionOf(profile, {labEnabled: true});
  session.start();
  session.startChallenge('headings');
  const marker = session.view().challenge.props[0];
  // Wrong way first: 60 s towards the opposite side does nothing.
  run(session, 8, v => pilot(v, {x: v.zone.x - 200, z: v.zone.z - 200, y: v.zone.y + 40}, {speed: 12}));
  assert.equal(has(session.takeEvents(), 'challengePassed'), false);
  // Cruise high over the hills, then come down onto the marker.
  const approach = v => Math.hypot(v.heli.x - marker.x, v.heli.z - marker.z) > 120 ? {x: marker.x, z: marker.z, y: 90} : {x: marker.x, z: marker.z, y: marker.y + 12};
  const events = run(session, 120, v => pilot(v, approach(v), {speed: 18, sink: 6}), (v, got) => has(got, 'challengePassed'));
  assert.equal(has(events, 'crashed'), false, 'a clean flight');
  assert.equal(has(events, 'challengePassed'), true, 'flown to the marker');
  assert.equal(Object.hasOwn(session.view(), 'challenge'), false, 'and over');
  assert.equal(labOf(session.profile).done.headings, true, 'saved as a passed Lab lesson');
  session.leave();
});

test('a scripted lift with the Dusthawk passes and is saved; hovering without the load does not', () => {
  const session = sessionOf(readyProfile(), {labEnabled: true});
  session.start();
  assert.equal(session.startChallenge('lift').ok, true);
  const dusthawk = () => session.view().loads.find(load => load.id === 'dusthawk_rally');
  // Without the load: ten seconds of hover over the pad is nothing.
  run(session, 4, v => pilot(v, {x: v.zone.x, z: v.zone.z, y: v.zone.y + 17}, {speed: 6}));
  assert.equal(has(session.takeEvents(), 'challengePassed'), false);
  const car = dusthawk(), over = {x: car.x, z: car.z, y: car.y + 15.3};
  run(session, 90, v => pilot(v, over, {speed: 6, sink: 3}), v => Math.hypot(v.heli.x - over.x, v.heli.z - over.z) < 1 && Math.abs(v.heli.y - over.y) < 0.4 && Math.hypot(v.heli.vx, v.heli.vz, v.heli.vy) < 0.5);
  session.pressHook(); session.takeEvents();
  assert.equal(dusthawk().hooked, true);
  // Over the pad, the car about 3.5 m off the ground.
  const hover = v => pilot(v, {x: v.zone.x, z: v.zone.z, y: v.zone.y + 15 + 0.7 + 3.5}, {speed: 4, sink: 2});
  const events = run(session, 120, hover, (v, got) => has(got, 'challengePassed'));
  assert.equal(has(events, 'challengePassed'), true, 'ten steady seconds with the Dusthawk');
  assert.equal(labOf(session.profile).done.lift, true);
  assert.equal(dusthawk(), undefined, 'the challenge load is gone');
  session.leave();
});

test('a try needs a full tank for the lift, and ends without cost when the session is left', () => {
  const profile = readyProfile();
  const half = normalizeProfile({...profile, heli: {...profile.heli, fuelKg: 200}});
  const session = sessionOf(half, {labEnabled: true});
  session.start();
  assert.equal(session.startChallenge('lift').ok, false);
  assert.equal(session.startChallenge('lift').reason, 'Fill the tank first.');
  assert.equal(session.startChallenge('headings').ok, true);
  const credits = session.profile.credits;
  session.leave();
  assert.equal(session.profile.credits, credits, 'leaving costs nothing');
  assert.deepEqual(labOf(session.profile), createLab(), 'and passes nothing');
});

// ---- Air and altitude, flown: the crate to Summit Run through the cruise ---------------------------------------
// An efficient pilot arrives with fuel to spare; one who dawdles at the pad does not. The same script each time.
function altitudeFlight({dawdleSeconds = 0} = {}) {
  const session = sessionOf(readyProfile(), {labEnabled: true, summitRunEnabled: true});
  session.start();
  assert.equal(session.startChallenge('altitude').ok, true);
  const crate = () => session.view().loads.find(load => load.id === 'lab-crate');
  const events = [];
  if (dawdleSeconds) events.push(...run(session, dawdleSeconds, () => ({lift: 0.1})));
  const car = crate(), over = {x: car.x, z: car.z, y: car.y + 15.3};
  events.push(...run(session, 90, v => pilot(v, over, {speed: 10, sink: 4}), v => Math.hypot(v.heli.x - over.x, v.heli.z - over.z) < 1 && Math.abs(v.heli.y - over.y) < 0.4 && Math.hypot(v.heli.vx, v.heli.vz, v.heli.vy) < 0.5));
  session.pressHook(); events.push(...session.takeEvents());
  assert.equal(crate().hooked, true, 'the crate is on the hook');
  assert.equal(session.setDestination('summit-run'), true);
  events.push(...run(session, 240, v => pilot(v, {x: v.heli.x - 300, z: v.heli.z + 300, y: 100}, {speed: 30, sink: 8}), v => v.cruiseOffered));
  assert.equal(session.acceptCruise(), true);
  events.push(...run(session, 10, () => ({}), v => v.phase === 'flying'));
  assert.equal(session.view().courseId, 'summit-run');
  assert.equal(session.view().challenge?.id, 'altitude', 'the challenge goes with the crate to Summit Run');
  const fuelAtSummit = session.view().heli.fuelKg, zone = session.view().zone;
  let released = false;
  events.push(...run(session, 300, v => {
    const d = Math.hypot(v.heli.x - zone.x, v.heli.z - zone.z), c = crate();
    if (!released && c?.onGround && c?.hooked) { session.pressHook(); released = true; }
    const target = released ? {x: zone.x + 20, z: zone.z, y: zone.y - 1} : {x: zone.x, z: zone.z, y: zone.y + (d > 300 ? 150 : Math.max(15.2, d * 0.45))};
    return pilot(v, target, {speed: released ? 6 : d > 150 ? 30 : Math.min(30, d * 0.3 + 2), sink: released ? 3 : 7});
  }, (v, got) => got.some(event => ['challengePassed', 'challengeRetry', 'crashed'].includes(event.type))));
  return {session, events, fuelAtSummit};
}
test('altitude, flown: an efficient flight to Summit Run passes with fuel to spare and is saved; dawdling at the pad does not', () => {
  const good = altitudeFlight();
  assert.equal(has(good.events, 'crashed'), false);
  assert.equal(has(good.events, 'challengePassed'), true, 'passed');
  assert.ok(good.session.view().heli.fuelKg >= KESTREL.tankKg * CHALLENGE_RULES.altitude.fuelShare, 'with 30% of the tank left');
  assert.equal(labOf(good.session.profile).done.altitude, true);
  assert.equal(Object.hasOwn(good.session.view(), 'challenge'), false);
  good.session.leave();
  const slow = altitudeFlight({dawdleSeconds: 110});
  assert.equal(has(slow.events, 'challengePassed'), false);
  const retry = slow.events.find(event => event.type === 'challengeRetry');
  assert.ok(retry && /fuel/i.test(retry.reason), 'too little fuel is the reason');
  assert.equal(labOf(slow.session.profile).done?.altitude, undefined);
  slow.session.leave();
});

// ---- Pendulums, flown: the car carried across the woods ----------------------------------------------------
function pendulumFlight({releaseHigh = false} = {}) {
  const session = sessionOf(readyProfile(), {labEnabled: true});
  session.start();
  assert.equal(session.startChallenge('pendulum').ok, true);
  const car = () => session.view().loads.find(load => load.id === 'falcone_f42' && !load.own);
  const heli = () => session.view().heli, events = [];
  const target = spotsOf('pendulum').target, spot = car(), over = {x: spot.x, z: spot.z, y: spot.y + 15.3};
  events.push(...run(session, 90, v => pilot(v, over, {speed: 10, sink: 4}), v => Math.hypot(v.heli.x - over.x, v.heli.z - over.z) < 1 && Math.abs(v.heli.y - over.y) < 0.4 && Math.hypot(v.heli.vx, v.heli.vz, v.heli.vy) < 0.5));
  session.pressHook(); events.push(...session.takeEvents());
  assert.equal(car().hooked, true);
  const swing = () => Math.hypot(car().x - heli().x, car().z - heli().z);
  // High over the hills to the target, slowly, then wait for the car to hang still.
  events.push(...run(session, 120, v => pilot(v, {x: target.x, z: target.z, y: 110}, {speed: 14, sink: 5}), v => Math.hypot(v.heli.x - target.x, v.heli.z - target.z) < 4 && Math.hypot(v.heli.vx, v.heli.vz) < 0.6));
  events.push(...run(session, 60, v => pilot(v, {x: target.x, z: target.z, y: 110}, {speed: 3, sink: 3}), () => swing() < 0.25));
  const settled = swing();
  // Down onto the ground, or just above it for a drop.
  const ground = woods.ground.height(target.x, target.z);
  events.push(...run(session, 120, v => pilot(v, {x: target.x, z: target.z, y: ground + 0.8 + 15.1 + (releaseHigh ? 6 : 0)}, {speed: 3, sink: 2}),
    v => car().onGround === true || (releaseHigh && Math.abs(v.heli.y - (ground + 21.9)) < 0.6 && Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < 0.4)));
  const atRelease = swing();
  session.pressHook(); events.push(...session.takeEvents());
  events.push(...run(session, 3, () => ({lift: 0})));
  return {session, events, settled, atRelease};
}
test('pendulum, flown: carried across the woods and set down still passes; dropped from height does not', () => {
  const good = pendulumFlight();
  assert.equal(has(good.events, 'crashed'), false);
  assert.ok(good.atRelease < 1, `the swing at let-go: ${good.atRelease}`);
  assert.equal(has(good.events, 'challengePassed'), true, 'passed');
  assert.equal(labOf(good.session.profile).done.pendulum, true);
  good.session.leave();
  const drop = pendulumFlight({releaseHigh: true});
  assert.equal(has(drop.events, 'challengePassed'), false);
  assert.equal(drop.events.find(event => event.type === 'challengeRetry')?.reason, 'Set the car down, do not drop it.');
  assert.equal(drop.session.view().challenge?.id, 'pendulum', 'and the try starts over on the pad');
  assert.equal(drop.session.view().loads.some(load => load.id === 'falcone_f42' && !load.own), true, 'with a new car');
  drop.session.leave();
});

// ---- Projectile motion, flown: scoop from the lake, aim with the ring, drop on the buoys ------------------------
function projectileFlight({aimed = true} = {}) {
  const session = sessionOf(readyProfile(), {labEnabled: true});
  session.start();
  assert.equal(session.startChallenge('projectile').ok, true);
  assert.equal(session.fitBucket().ok, true);
  const spots = spotsOf('projectile'), scoop = spots.scoop, surface = woods.ground.water(scoop.x, scoop.z), high = 40, events = [];
  // Straight up first so the bucket is lifted, not dragged; then to the lake and down until it is full.
  events.push(...run(session, 60, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: high}, {speed: 1}), v => v.heli.y > high - 3));
  events.push(...run(session, 90, v => pilot(v, {x: scoop.x, z: scoop.z, y: high}, {speed: 20, sink: 6}), v => Math.hypot(v.heli.x - scoop.x, v.heli.z - scoop.z) < 8));
  events.push(...run(session, 60, v => pilot(v, {x: scoop.x, z: scoop.z, y: surface + 17.6}, {speed: 2, sink: 3}), v => v.bucket?.words === 'full'));
  assert.equal(session.view().bucket.words, 'full', 'the bucket filled from the lake');
  for (const [index, buoy] of spots.buoys.entries()) {
    // The ring shows where the water will land; put its centre on the buoy (or, unaimed, the helicopter itself).
    const goal = v => {
      const ring = aimed ? v.bucket.aim : null, lead = ring ? {x: ring.x - v.bucket.x, z: ring.z - v.bucket.z} : {x: 0, z: 0};
      return {x: buoy.x - lead.x, z: buoy.z - lead.z, y: high};
    };
    events.push(...run(session, 90, v => pilot(v, goal(v), {speed: 15, sink: 6}),
      v => v.bucket.aim && Math.hypot(v.bucket.aim.x - buoy.x, v.bucket.aim.z - buoy.z) < 2 && Math.hypot(v.heli.vx, v.heli.vz) < 0.4));
    events.push(...run(session, 0.5, v => ({...pilot(v, goal(v), {speed: 3, sink: 3}), pour: true})));
    events.push(...run(session, 8, v => pilot(v, goal(v), {speed: 3, sink: 3})));
    if (!aimed) break;
    if (index < 2 && session.view().bucket.water < 300) {
      events.push(...run(session, 90, v => pilot(v, {x: scoop.x, z: scoop.z, y: high}, {speed: 20, sink: 6}), v => Math.hypot(v.heli.x - scoop.x, v.heli.z - scoop.z) < 8));
      events.push(...run(session, 60, v => pilot(v, {x: scoop.x, z: scoop.z, y: surface + 17.6}, {speed: 2, sink: 3}), v => v.bucket?.words === 'full'));
    }
  }
  return {session, events};
}
test('projectile, flown: water scooped from the lake and dropped with the ring on each buoy passes and is saved; an unaimed drop misses', () => {
  const good = projectileFlight();
  assert.equal(has(good.events, 'crashed'), false);
  assert.equal(good.events.filter(event => event.type === 'buoyHit').length, 3, 'three buoys hit');
  assert.equal(has(good.events, 'challengePassed'), true, 'passed');
  assert.equal(labOf(good.session.profile).done.projectile, true);
  good.session.leave();
  // Dropping straight down from 40 m, ignoring the ring, lands the water well downwind of the buoy.
  const blind = projectileFlight({aimed: false});
  assert.equal(blind.events.filter(event => event.type === 'buoyHit').length, 0, 'the unaimed drop hits no buoy');
  assert.equal(has(blind.events, 'challengePassed'), false);
  assert.equal(labOf(blind.session.profile).done?.projectile, undefined);
  blind.session.leave();
});

// ---- Review fixes -----------------------------------------------------------------------------------------
test('a bucket on the hook does not stop the water challenges or the heading flight, but does stop the ones that carry a load', () => {
  const session = sessionOf(readyProfile(), {labEnabled: true});
  session.start();
  assert.equal(session.fitBucket().ok, true);
  for (const id of ['projectile', 'fire', 'headings']) assert.equal(session.startChallenge(id).ok, true, `${id} starts with the bucket fitted`);
  session.stopChallenge();
  for (const id of ['lift', 'pendulum']) assert.deepEqual(session.startChallenge(id), {ok: false, reason: 'Take the bucket off first.'}, id);
  session.leave();
  // Without forest fires there is no bucket, so the two water challenges are not offered a try that cannot be passed.
  const noFire = sessionOf(readyProfile(), {labEnabled: true, fireEnabled: false});
  noFire.start();
  for (const id of ['projectile', 'fire']) assert.equal(noFire.startChallenge(id).ok, false, `${id} needs the bucket`);
  assert.equal(noFire.startChallenge('headings').ok, true);
  noFire.leave();
});

test('altitude: fuel from the truck or the pump after the crate was lifted ends the try; before it, it does not', () => {
  const summit = {courseId: 'summit-run', heli: heliAt(0, 0, {onGround: true, fuelKg: 300}), events: [{type: 'setDown', id: 'lab-crate'}, {type: 'refuelled'}]};
  const ch = () => createChallenge('altitude', {zone: site.zone});
  const hooked = {id: 'lab-crate', hooked: true, x: 0, z: 0};
  const first = ch();
  stepChallenge(first, quiet({load: hooked}), 0.1);
  const result = stepChallenge(first, quiet(summit), 0.1);
  assert.equal(result.result, 'retry');
  assert.match(result.reason, /Refuelling/);
  assert.equal(stepChallenge(ch(), quiet(summit), 0.1).result, 'passed', 'a tank filled before the crate was lifted is simply a full start');
});

test('pendulum: a car let go that was never the Lab\'s car on the hook is not the try\'s release', () => {
  const target = spotsOf('pendulum').target, ch = createChallenge('pendulum', {...spotsOf('pendulum')});
  const result = stepChallenge(ch, quiet({events: [{type: 'releasedHigh', id: 'falcone_f42', heightM: 12}]}), 0.1);
  assert.equal(result.result, 'running');
  const hooked = quiet({load: {id: 'falcone_f42', hooked: true, x: target.x, z: target.z}, heli: heliAt(target.x, target.z)});
  stepChallenge(ch, hooked, 0.1);
  assert.equal(stepChallenge(ch, quiet({events: [{type: 'releasedHigh', id: 'falcone_f42', heightM: 12}]}), 0.1).result, 'retry', 'the Lab\'s own car dropped high still ends the try');
});

test('a challenge that does not use the bucket leaves its drops to the real fire, and the heading flight gives back the arrow', () => {
  const dropped = id => {
    const session = sessionOf(readyProfile(), {labEnabled: true});
    session.start();
    assert.equal(session.fitBucket().ok, true);
    assert.equal(session.startChallenge(id).ok, true);
    const events = [], high = 60;
    events.push(...run(session, 120, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: high}, {speed: 1}), v => v.heli.y > high - 3));
    events.push(...run(session, 120, v => pilot(v, {x: v.heli.x + 3, z: v.heli.z, y: high}, {speed: 1}), (v, got) => has(got, 'fireCall')));
    session.pressRadio(); events.push(...session.takeEvents());
    const lake = spotsOf('projectile'), surface = woods.ground.water(lake.scoop.x, lake.scoop.z);
    events.push(...run(session, 120, v => pilot(v, {x: lake.scoop.x, z: lake.scoop.z, y: high}, {speed: 20, sink: 6}), v => Math.hypot(v.heli.x - lake.scoop.x, v.heli.z - lake.scoop.z) < 8));
    events.push(...run(session, 90, v => pilot(v, {x: lake.scoop.x, z: lake.scoop.z, y: surface + 17.6}, {speed: 2, sink: 3}), v => v.bucket?.words === 'full'));
    const target = session.view().fire?.target;
    assert.ok(target, 'a fire to drop on');
    const goal = v => { const aim = v.bucket.aim, lead = aim ? {x: aim.x - v.bucket.x, z: aim.z - v.bucket.z} : {x: 0, z: 0};
      return {x: target.x - lead.x, z: target.z - lead.z, y: woods.ground.height(target.x, target.z) + 60}; };
    events.push(...run(session, 300, v => pilot(v, goal(v), {speed: 15, sink: 6}), v => { const aim = v.bucket.aim; return aim && Math.hypot(aim.x - target.x, aim.z - target.z) < 3 && Math.hypot(v.heli.vx, v.heli.vz) < 0.5; }));
    events.push(...run(session, 8, v => ({...pilot(v, goal(v), {speed: 2, sink: 3}), pour: true}), v => (v.bucket?.water ?? 0) <= 0.5));
    events.push(...run(session, 8, v => pilot(v, goal(v), {speed: 2, sink: 3})));
    session.leave();
    return events;
  };
  assert.equal(has(dropped('headings'), 'fireHiss'), true, 'with the heading flight under way the water still goes on the real fire');
  // The heading flight hides the arrow and gives it back.
  const session = sessionOf(readyProfile(), {labEnabled: true, summitRunEnabled: true});
  session.start();
  assert.equal(session.setDestination('summit-run'), true);
  const before = session.view().destination;
  assert.ok(before, 'a destination is set');
  session.startChallenge('headings');
  assert.equal(session.view().destination, null);
  session.stopChallenge();
  assert.deepEqual(session.view().destination, before);
  session.leave();
});

// ---- The fire, flown: scoop from the lake, drop on the practice fire --------------------------------------------
function fireFlight({drop = true} = {}) {
  const session = sessionOf(readyProfile(), {labEnabled: true});
  session.start();
  assert.equal(session.fitBucket().ok, true);
  assert.equal(session.startChallenge('fire').ok, true);
  const lake = spotsOf('projectile').scoop, surface = woods.ground.water(lake.x, lake.z), high = 50, events = [];
  const done = () => has(events, 'challengePassed') || has(events, 'challengeRetry') || has(events, 'crashed');
  const burning = v => v.challenge?.props.filter(prop => prop.kind === 'fire' && prop.percent > 0) ?? [];
  const centre = v => { const cells = burning(v); if (!cells.length) return null; const front = Math.max(...cells.map(c => c.x)), edge = cells.filter(c => c.x === front); return {x: front, z: edge.reduce((s, c) => s + c.z, 0) / edge.length}; };
  const go = (seconds, controls, until) => { events.push(...run(session, seconds, controls, (v, got) => done() || until(v, got))); };
  go(60, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: high}, {speed: 1}), v => v.heli.y > v.heli.groundY + 22);
  if (drop) for (let trip = 0; trip < 3 && !done(); trip++) {
    go(90, v => pilot(v, {x: lake.x, z: lake.z, y: high}, {speed: 20, sink: 6}), v => Math.hypot(v.heli.x - lake.x, v.heli.z - lake.z) < 8);
    go(60, v => pilot(v, {x: lake.x, z: lake.z, y: surface + 17.6}, {speed: 2, sink: 8}), v => v.bucket?.words === 'full');
    const goal = v => { const c = centre(v) ?? {x: v.heli.x, z: v.heli.z}, aim = v.bucket.aim, lead = aim ? {x: aim.x - v.bucket.x, z: aim.z - v.bucket.z} : {x: 0, z: 0};
      const near = Math.hypot(v.heli.x - c.x, v.heli.z - c.z) < 90;
      return {x: c.x - lead.x, z: c.z - lead.z, y: woods.ground.height(c.x, c.z) + 55}; };
    go(120, v => pilot(v, goal(v), {speed: 25, sink: 6}), v => { const c = centre(v), aim = v.bucket.aim; return !c || aim && Math.hypot(aim.x - c.x, aim.z - c.z) < 4 && Math.hypot(v.heli.vx, v.heli.vz) < 1; });
    go(6, v => ({...pilot(v, goal(v), {speed: 2, sink: 3}), pour: true}), v => (v.bucket?.water ?? 0) <= 0.5);
    go(6, v => pilot(v, goal(v), {speed: 2, sink: 3}), () => false);
  }
  else go(240, () => ({lift: 0.1}), () => false);
  return {session, events};
}
test('fire, flown: water from the lake on the practice fire passes and is saved; leaving it alone sends the pilot back', () => {
  const good = fireFlight();
  assert.equal(has(good.events, 'crashed'), false);
  assert.equal(has(good.events, 'challengePassed'), true, `passed (${good.events.filter(event => event.type === 'challengeRetry').map(event => event.reason)})`);
  assert.equal(labOf(good.session.profile).done.fire, true);
  good.session.leave();
  const idle = fireFlight({drop: false});
  assert.equal(has(idle.events, 'challengePassed'), false);
  assert.equal(idle.events.find(event => event.type === 'challengeRetry')?.reason, 'The fire reached the road.');
  idle.session.leave();
});
