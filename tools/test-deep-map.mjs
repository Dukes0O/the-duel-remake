import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { deepMapGeometry, deepMapData, mapScreen, HEADING_UP_CAR } from '../src/deep/deep-map.js';
import { rampAt, deepWorldPose } from '../src/deep/deep-journey.js';
import { CAMERA_UNDER_SURFACE, deepPresentation } from '../src/deep/deep-ui.js';
import { ZONE_EDGE } from '../src/deep/zone-floor.js';
import { SEA_LEVEL } from '../src/coastal-water.js';
const wrapAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
import { kelpCoastProvider } from '../src/deep/zones/kelp-coast.js';
import { Duel } from '../src/game.js';

test('the map reads the authored loop, discovered places, ramp and car without changing inputs', () => {
  const duel = new Duel({ seed: 1989, deepProviders: [kelpCoastProvider], featureFlags: { 'the-deep': true } });
  duel.startCampaign({ seed: 1989, deepKit: true });
  const zone = duel.course.deepZone.zone, ramp = zone.trail[0];
  const before = JSON.stringify({ zone, state: duel.state });
  const geometry = deepMapGeometry(zone), car = { x: ramp.x + 100, z: ramp.z, heading: Math.PI / 2 };
  const discovery = { places: ['kelp-forest'], elapsedSec: 59 };
  const data = deepMapData(geometry, zone, car, discovery);
  assert.equal(data.loop.length, zone.trail.length);
  assert.deepEqual(data.ramp, data.loop[0]);
  assert.deepEqual(data.places.map(p => p.name), ['The Kelp Forest']);
  assert.deepEqual(data.car, { ...geometry.project(car), heading: -Math.PI / 2 });
  assert.equal(data.home.distance, 100);
  assert.ok(Math.abs(Math.abs(data.home.relative) - Math.PI) < 1e-12, 'ramp is behind the east-facing car');
  assert.equal(data.home.visible, false);
  assert.equal(deepMapData(geometry, zone, car, { elapsedSec: 60 }).home.visible, true);
  assert.equal(deepMapData(geometry, zone, car, { requested: true }).home.visible, true);
  assert.equal(deepMapData(geometry, zone, car).places.length, 0, 'unfound places stay hidden');
  assert.equal(JSON.stringify({ zone, state: duel.state }), before);
  assert.deepEqual(discovery, { places: ['kelp-forest'], elapsedSec: 59 });
  assert.deepEqual(car, { x: ramp.x + 100, z: ramp.z, heading: Math.PI / 2 });
});

// DEEP-SHALLOWS-FIX (Kyle, 28 October 2026: "the map also seems to be left-right opposite of
// how we're driving"). A north-up chart turns left and right round whenever the car heads south,
// which the dive's first leg does. The chart now turns with the car, so left on the chart is
// left on the screen. These tests tie the chart to the real chase camera the driver looks through.
const DT = 1 / 120;
function diveIn() {
  const duel = new Duel({ seed: 1989, deepProviders: [kelpCoastProvider], featureFlags: { 'the-deep': true } });
  duel.startCampaign({ seed: 1989, deepKit: true, deepSave: {}, playerId: 'map-qa', opponentCount: 1 });
  const ramp = duel.course.deepRamp, p = rampAt(ramp, ramp.shoreline.center.progress - .04), near = duel.course.nearest(p.x, p.z, duel.state.s);
  Object.assign(duel.state, { s: near.s, prevS: near.s, lateral: near.lateral, prevLateral: near.lateral, speedMph: 35, status: 'racing', countdown: 0,
    headingError: ramp.heading - duel.course.at(near.s).heading, airborne: false, airHeight: 0, yawVelocity: 0, pushVelocity: 0, impactTimer: 0, _jumpY: null });
  duel.step(DT); assert.equal(duel.chooseDeep('dive'), true);
  for (let i = 0; i < 260; i++) duel.step(DT);
  assert.equal(duel.state.deepJourney.phase, 'underwater');
  return duel;
}
const rightOf = h => ({ x: -Math.cos(h), z: Math.sin(h) }), ahead = h => ({ x: Math.sin(h), z: Math.cos(h) });
// Which side of the arrow a chart point lies on (positive: right), on the panel as drawn.
function arrowSide(data, point) {
  const at = mapScreen(data, point), car = mapScreen(data, data.car), rho = data.headingUp ? 0 : data.car.heading;
  return (at.x - car.x) * Math.cos(rho) + (at.y - car.y) * Math.sin(rho);
}
test('on the chart, right of the car is right of the arrow, whichever way the car faces and in either view', () => {
  const duel = diveIn(), geometry = deepMapGeometry(duel.deepRuntime.zone), world = deepWorldPose(duel);
  for (const headingUp of [true, false]) for (const heading of [0, Math.PI / 2, Math.PI, -2.4, 3.1]) {
    const car = { ...world, heading }, data = deepMapData(geometry, duel.deepRuntime.zone, car, { headingUp });
    const to = (v, m) => geometry.project({ x: car.x + v.x * m, z: car.z + v.z * m });
    assert.ok(arrowSide(data, to(rightOf(heading), 60)) > 5, `heading ${heading} up ${headingUp}: a point on the right is right of the arrow`);
    assert.ok(arrowSide(data, to(rightOf(heading), -60)) < -5, `heading ${heading} up ${headingUp}: a point on the left is left of the arrow`);
    if (headingUp) {
      const arrow = mapScreen(data, data.car), front = mapScreen(data, to(ahead(heading), 60));
      assert.ok(Math.abs(front.x - arrow.x) < 1e-9 && front.y < arrow.y - 5, `heading ${heading}: ahead is straight up the panel`);
      assert.deepEqual(arrow, { x: HEADING_UP_CAR.x, y: HEADING_UP_CAR.y }, 'the car stays put on the panel');
    }
  }
});

test('the chart agrees with the chase camera: what is on the driver\'s right is on the right of the arrow', () => {
  const duel = diveIn(), geometry = deepMapGeometry(duel.deepRuntime.zone);
  for (const turn of [0, 1.2, 2.6, 4.1]) {
    // Drive a while, turning, so the car faces several different ways (including south).
    duel.setInput({ throttle: 1, brake: 0, steer: 1 });
    for (let i = 0; i < turn * 60; i++) duel.step(DT);
    const car = deepWorldPose(duel), view = deepPresentation(duel).camera;
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, .1, 600);
    camera.position.set(view.position.x, view.position.y, view.position.z); camera.lookAt(view.target.x, view.target.y, view.target.z); camera.updateMatrixWorld();
    for (const headingUp of [true, false]) {
      const data = deepMapData(geometry, duel.deepRuntime.zone, car, { headingUp });
      for (const [dx, dz] of [[30, 0], [-30, 0], [20, 40], [-20, 40], [25, 60], [-25, 60]]) {
        const world = { x: car.x + dx, z: car.z + dz }, ndc = new THREE.Vector3(world.x, car.y, world.z).project(camera);
        if (Math.abs(ndc.x) < .05 || ndc.z > 1) continue;               // dead ahead or behind the camera
        const side = arrowSide(data, geometry.project(world));
        assert.equal(side > 0, ndc.x > 0, `facing ${car.heading.toFixed(2)}, point (${dx}, ${dz}), headingUp ${headingUp}: chart ${side.toFixed(1)}, screen ${ndc.x.toFixed(2)}`);
      }
    }
  }
});

test('turning right turns the arrow clockwise and the whole sea anticlockwise under it; north up, the arrow swings right', () => {
  const duel = diveIn(), geometry = deepMapGeometry(duel.deepRuntime.zone);
  duel.setInput({ throttle: 1, brake: 0, steer: 0 });
  for (let i = 0; i < 240; i++) duel.step(DT);
  const before = deepWorldPose(duel), a = deepMapData(geometry, duel.deepRuntime.zone, before, { headingUp: false });
  duel.setInput({ throttle: 1, brake: 0, steer: 1 });          // the right key
  for (let i = 0; i < 60; i++) duel.step(DT);
  const after = deepWorldPose(duel), b = deepMapData(geometry, duel.deepRuntime.zone, after, { headingUp: false });
  assert.ok(wrapAngle(after.heading - before.heading) < -.1, 'the car turned right (its heading fell)');
  assert.ok(wrapAngle(b.car.heading - a.car.heading) > .1, 'the arrow turned clockwise on the panel');
  // The chart point straight ahead of the car before the turn is now to its left: the sea swings round.
  const mark = geometry.project({ x: before.x + Math.sin(before.heading) * 80, z: before.z + Math.cos(before.heading) * 80 });
  const up = deepMapData(geometry, duel.deepRuntime.zone, after, { headingUp: true });
  assert.ok(mapScreen(up, mark).x < HEADING_UP_CAR.x - 5, 'the point the car was heading for slid to the left of the arrow');
});

// DEEP-SHALLOWS-FIX: on the shallow banks the chase camera used to climb out of the water, and the
// whole screen became the flat surface seen from above (Kyle's picture of the Ramp Shallows).
test('the dive camera, as the game places it, stays under the water everywhere the car can drive', () => {
  const duel = diveIn(), runtime = duel.deepRuntime, floor = runtime.floor, limit = SEA_LEVEL - CAMERA_UNDER_SURFACE;
  let checked = 0, held = 0, shallowest = Infinity;
  for (const car of ['falcone_f42', 'titan_monster']) {
    duel.state.car = car;
    const height = car === 'titan_monster' ? 5.8 : 3.65;   // the chase height the game asks for
    for (let s = 0; s < floor.length; s += 9) for (const lateral of [-ZONE_EDGE, -60, -30, 0, 30, 60, ZONE_EDGE]) {
      const p = runtime.zoneCourse.worldAt(s, lateral), at = floor.sample(p.x, p.z);
      if (!at || at.distance > ZONE_EDGE) continue;
      Object.assign(duel.state, { s, prevS: s, lateral, prevLateral: lateral, headingError: 0, airHeight: 0 });
      const pose = deepWorldPose(duel), y = deepPresentation(duel).camera.position.y, wanted = pose.y + height;
      assert.ok(y <= limit + 1e-9, `s ${s.toFixed(0)}, ${lateral} m across: camera ${(y - SEA_LEVEL).toFixed(2)} m from the surface`);
      // It is the chase height wherever that is under water, and held under the surface where it would not be.
      if (wanted > limit) { assert.ok(Math.abs(y - limit) < 1e-9, 'held under the surface'); held++; }
      else assert.ok(Math.abs(y - wanted) < 1e-9, 'the usual chase height');
      if (car === 'falcone_f42') assert.ok(y >= pose.y + 1.5, 'and still above the car roof');
      shallowest = Math.min(shallowest, SEA_LEVEL - p.y); checked++;
    }
  }
  assert.ok(checked > 3000, `${checked} places checked`);
  assert.ok(held > 300, `the hold really is needed on the shallow banks (${held} places)`);
  assert.ok(shallowest >= 2.6 - 1e-9, `the sea floor never comes closer than 2.6 m to the surface (${shallowest.toFixed(2)})`);
});