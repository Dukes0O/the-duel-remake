import assert from 'node:assert/strict';
import test from 'node:test';
import {createExplosion} from '../src/explosion.js';

test('a newly active wreck is visible on a paused first frame without moving particles', () => {
  const effect = createExplosion({combat: true});
  try {
    const position = {x: 4, y: 2, z: -8};
    const active = {catastrophic: true, status: 'racing'};
    effect.update(position, active, 0);
    const puffs = effect.group.children.find(child => child.isPoints);
    const ring = effect.group.children.find(child => child.isMesh && child.geometry?.type === 'RingGeometry');
    const visiblePuffs = puffs.geometry.attributes.puff.array;
    assert.equal(effect.group.visible, true);
    assert.ok(ring.material.opacity > 0, 'the blast ring is visible on the first paused frame');
    assert.ok(!effect.group.children.some(child => child.isLight),
      'the blast does not change the scene light count');
    assert.ok(Array.from(visiblePuffs).some((value, index) => index % 4 === 1 && value > 0),
      'the seeded flame has visible opacity on the first paused frame');
    const firstPositions = puffs.geometry.attributes.position.array.slice();
    effect.update(position, active, 0);
    assert.deepEqual(puffs.geometry.attributes.position.array, firstPositions,
      'a second paused frame does not advance the blast');
    effect.update(position, active, 1 / 60);
    assert.notDeepEqual(puffs.geometry.attributes.position.array, firstPositions,
      'animation begins when simulation time advances');
    effect.update(position, {catastrophic: false, status: 'racing'}, 0);
    assert.equal(effect.group.visible, false);
  } finally {
    effect.dispose();
  }
});
