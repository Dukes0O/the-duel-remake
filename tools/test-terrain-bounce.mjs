import assert from 'node:assert/strict';
import { terrainBounceAmplitude } from '../src/render3d.js';

assert.equal(terrainBounceAmplitude(1, 0), 0, 'parked car has no terrain bob');
assert.equal(terrainBounceAmplitude(1, 4.5), .25, 'low-speed bob grows with movement');
assert.equal(terrainBounceAmplitude(1, 18), 1, 'terrain bob reaches its usual strength while driving');
assert.equal(terrainBounceAmplitude(.5, -18), .5, 'reverse driving keeps terrain feedback');
assert.equal(terrainBounceAmplitude(0, 100), 0, 'smooth pavement adds no bob');
console.log('Terrain bounce: parked, creeping, moving, reverse and smooth-road checks passed.');
