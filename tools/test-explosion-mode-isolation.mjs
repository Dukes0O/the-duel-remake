import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import * as THREE from 'three';
import {createExplosion} from '../src/explosion.js';

const position = {x: 13, y: 2, z: -7};
const legacyWreck = {status: 'racing', catastrophic: true};
const combatWreck = {...legacyWreck, combatWrecking: true};
const lightCount = root => {
  let count = 0;
  root.traverse(object => { if (object.isLight) count++; });
  return count;
};

test('ordinary fatal crashes retain the approved shader and visible PointLight', () => {
  const effect = createExplosion();
  try {
    const puffs = effect.group.children.find(child => child.isPoints);
    const light = effect.group.children.find(child => child.isPointLight);
    assert.ok(puffs && light, 'the ordinary blast retains its particles and PointLight');
    const shader = puffs.material;
    const fingerprint = createHash('sha256')
      .update(JSON.stringify([shader.vertexShader, shader.fragmentShader]))
      .digest('hex');
    assert.equal(fingerprint,
      '4e0604803a08ed1cc848ecf2775cb515d57a8723b943af5dfc6b2bf7fbe60f58',
      'ordinary crash shader stays visually identical to the approved source');
    effect.update(position, legacyWreck, 0);
    assert.equal(light.intensity, 0, 'a paused ordinary crash keeps its legacy activation');
    assert.ok(puffs.geometry.attributes.puff.array.every((size, index) =>
      index % 4 !== 0 || size === 0), 'a paused ordinary crash does not seed combat flames');
    effect.update(position, legacyWreck, 1 / 60);
    assert.equal(effect.group.visible, true);
    assert.equal(light.visible, true);
    assert.ok(light.intensity > 0, 'the ordinary fatal crash has a visible dynamic light');
  } finally {
    effect.dispose();
  }
});

test('combat explosion pools do not add dynamic lights to the scene', () => {
  const scene = new THREE.Scene();
  const legacy = createExplosion();
  const combat = Array.from({length: 3}, () => createExplosion({combat: true}));
  try {
    scene.add(legacy.group);
    assert.equal(lightCount(scene), 1, 'the ordinary effect owns one PointLight');
    for (const effect of combat) scene.add(effect.group);
    assert.equal(lightCount(scene), 1, 'adding combat pools keeps the scene light count fixed');
    for (const effect of combat) effect.update(position, combatWreck, 0);
    assert.equal(lightCount(scene), 1, 'starting all combat blasts keeps the light count fixed');
  } finally {
    for (const effect of combat) effect.dispose();
    legacy.dispose();
  }
});

test('combat blasts show flame, ring and debris on the first paused frame', () => {
  const effect = createExplosion({combat: true});
  try {
    const puffs = effect.group.children.find(child => child.isPoints);
    const ring = effect.group.children.find(child => child.geometry?.type === 'RingGeometry');
    const panels = effect.group.children.find(child => child.isInstancedMesh &&
      child.geometry?.type === 'BoxGeometry');
    assert.ok(puffs && ring && panels, 'the pool has flame, ring and body debris');
    effect.update(position, combatWreck, 0);
    const puff = puffs.geometry.attributes.puff.array;
    assert.equal(effect.group.visible, true);
    assert.ok(puff.some((size, index) => index % 4 === 0 && size > 0 && puff[index + 1] > 0),
      'flame is visible before simulation time advances');
    assert.ok(ring.material.opacity > 0, 'blast ring is visible before time advances');
    const matrix = new THREE.Matrix4();
    panels.getMatrixAt(0, matrix);
    const debrisPosition = new THREE.Vector3().setFromMatrixPosition(matrix);
    assert.ok(debrisPosition.distanceTo(new THREE.Vector3(position.x, position.y, position.z)) < 3,
      'the first debris panel is placed at the wreck');
    const frozen = {
      puff: puff.slice(),
      positions: puffs.geometry.attributes.position.array.slice(),
      ringOpacity: ring.material.opacity,
      panelMatrix: panels.instanceMatrix.array.slice(),
    };
    effect.update(position, combatWreck, 0);
    assert.deepEqual(puff, frozen.puff, 'paused flame pose stays still');
    assert.deepEqual(puffs.geometry.attributes.position.array, frozen.positions,
      'paused particles stay in place');
    assert.equal(ring.material.opacity, frozen.ringOpacity, 'paused ring stays still');
    assert.deepEqual(panels.instanceMatrix.array, frozen.panelMatrix, 'paused debris stays still');
  } finally {
    effect.dispose();
  }
});
