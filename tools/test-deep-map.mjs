import assert from 'node:assert/strict';
import test from 'node:test';
import { deepMapGeometry, deepMapData } from '../src/deep/deep-map.js';
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
