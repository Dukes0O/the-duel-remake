import assert from 'node:assert/strict';
import {COURSE} from '../src/config.js';
import {sweepObstacle} from '../src/collision.js';
import {Duel} from '../src/game.js';
import {stepKnock} from '../src/vehicle-knock.js';

const duel = new Duel({seed: 2609,
  featureFlags: {wasteland2: true, 'crash-physics': true}});
duel.startCampaign({mode: 'duel', startStage: COURSE.findIndex(stage =>
  !stage.kind && stage.hasRival), car: 'falcone_f42'});
const state = duel.state;
state.status = 'racing';
state.countdown = 0;
state.invulnerableSec = 0;
state.speedMph = 0;
state.pushVelocity = 0;
state.headingError = 0;
state.input.throttle = 1;
state.input.brake = 0;
state.knock = {vx: 0, vz: 0, spin: 0, severity: 'knocked', age: .31, vy: 0};

duel._drive(1 / 60);
assert.equal(state.knock, null, 'the settled knock releases control');
assert.equal(state.speedMph, 0,
  'driver input does not advance the car again on the knock settlement tick');

duel._drive(1 / 60);
assert.ok(state.speedMph > 0, 'driver input resumes on the following tick');

const rival = state.rival;
Object.assign(rival, {knock: {vx: 0, vz: 0, spin: 0, severity: 'knocked',
  age: .31, vy: 0}, airborne: false, airHeight: 0, crushed: false,
  combatWrecking: false, finished: false});
let solidChecks = 0, boundaryChecks = 0;
const staticContacts = duel._staticContacts, boundary = duel._boundary;
duel._staticContacts = actor => { if (actor === rival) solidChecks++; };
duel._boundary = actor => { if (actor === rival) boundaryChecks++; };
duel._rival(1 / 60, rival);
duel._staticContacts = staticContacts;
duel._boundary = boundary;
assert.equal(rival.knock, null, 'the rival knock settles in the fixture');
assert.deepEqual([solidChecks, boundaryChecks], [1, 1],
  'a settling rival still resolves walls and the course boundary on that tick');

const roadside = {alive: false, s: state.s, prevS: state.s, lateral: 6.775,
  prevLateral: 7.9, dir: 1, headingError: 0, speedMph: 0, pushVelocity: 0,
  airborne: false, airHeight: 0, roadsideMotion: {visible: true},
  knock: {vx: 0, vz: 0, spin: 0, severity: 'knocked', age: 3.5, vy: 0,
    roadside: {side: 1}}};
state.traffic = [roadside];
stepKnock(duel, roadside, 1 / 60);
const parkedClearance = (duel.course.roadHalfWidthAt?.(roadside.s) ?? 7) +
  duel._vehicleSpec(roadside).halfWidth + .5;
assert.ok(roadside.lateral >= parkedClearance,
  'a curve-sensitive roadside knock cannot settle back inside its whole-car clearance');
assert.ok(roadside.wrecked && roadside.wrecked.rollLimit === 0,
  'the clamped roadside car becomes the still parked wreck');

const barrierS = 500;
const roadHalfWidth = duel.course.roadHalfWidthAt(barrierS);
const barrierLateral = roadHalfWidth + .1;
const barrierPoint = duel.course.groundAt(barrierS, barrierLateral);
const barrier = {id: 'road-edge-barrier', kind: 'building', shape: 'box',
  s: barrierS, off: barrierLateral, ...barrierPoint,
  heading: barrierPoint.heading, halfX: .1, halfZ: 4, height: 4, barrier: true};
const walledRoadside = {alive: false, s: barrierS, prevS: barrierS,
  lateral: roadHalfWidth - 1.3, prevLateral: roadHalfWidth - 1.3, dir: 1,
  headingError: 0, speedMph: 0, pushVelocity: 0, airborne: false,
  airHeight: 0, roadsideMotion: {visible: true},
  knock: {vx: 0, vz: 0, spin: 0, severity: 'knocked', age: 3.5, vy: 0,
    roadside: {side: 1}}};
const wallStart = duel.course.worldAt(walledRoadside.s, walledRoadside.lateral);
const obstacleQuery = duel._obstacles;
duel._obstacles = () => [barrier];
state.traffic = [walledRoadside];
duel._traffic(1 / 60);
duel._obstacles = obstacleQuery;
const wallEnd = duel.course.worldAt(walledRoadside.s, walledRoadside.lateral);
const wallSpec = duel._vehicleSpec(walledRoadside);
assert.equal(sweepObstacle(wallStart, wallEnd, barrier,
  duel.course.at(barrierS).heading, wallSpec), null,
'roadside settlement cannot cross a solid while finding a clear parking pose');
const wallClearance = duel.course.roadHalfWidthAt(walledRoadside.s) +
  wallSpec.halfWidth + .5;
assert.ok(walledRoadside.lateral >= wallClearance,
  'the collision-safe roadside parking pose still clears the whole car from the route');
assert.ok(walledRoadside.wrecked && walledRoadside.knock == null,
  'the collision-safe pose finishes as a still wreck');

const heldRoadside = lateral => ({alive: false, s: barrierS, prevS: barrierS,
  lateral, prevLateral: lateral, dir: 1, headingError: 0, speedMph: 0,
  pushVelocity: 0, airborne: false, airHeight: 0,
  roadsideMotion: {visible: true},
  knock: {vx: 0, vz: 0, spin: 0, severity: 'knocked', age: 3.5, vy: 0,
    roadside: {side: 1}}});
const continuousBarrier = {...barrier, id: 'continuous-road-edge-barrier',
  halfX: 200, halfZ: 200};
for (const [label, lateral] of [
  ['no clear pose', roadHalfWidth - 1.3],
  ['initial overlap', barrierLateral - wallSpec.halfWidth - .08],
]) {
  const held = heldRoadside(lateral);
  duel._obstacles = () => [continuousBarrier];
  state.traffic = [held];
  duel._traffic(1 / 60);
  duel._obstacles = obstacleQuery;
  assert.ok(held.knock?.roadside && held.roadsideMotion?.visible,
    `${label} keeps the non-collidable roadside motion visible for a later retry`);
  assert.equal(held.wrecked, undefined,
    `${label} cannot claim a clear parked wreck`);
  assert.deepEqual([held.knock.vx, held.knock.vz, held.knock.spin, held.knock.vy],
    [0, 0, 0, 0], `${label} waits safely without moving through the solid`);
}

console.log('Vehicle knock integration: settlement consumes one tick and keeps solid checks.');
