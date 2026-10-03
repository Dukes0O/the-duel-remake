import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {Duel} from '../src/game.js';
import {buildEnvironment, disposeTree} from '../src/world.js';
import {animateScene, syncScene} from '../src/scene-systems.js';

// Only canvas/image decoding is headless. Native Course, state and world are real.
const context = new Proxy({measureText: text => ({width: String(text).length * 8}),
  createLinearGradient: () => ({addColorStop() {}}), createRadialGradient: () => ({addColorStop() {}}),
  getImageData: () => ({data: new Uint8ClampedArray(4)}),
  createImageData: (w, h) => ({data: new Uint8ClampedArray(w * h * 4)})},
  {get: (target, key) => key in target ? target[key] : () => {}});
test('Pit production world loads finite geometry, preserves race state and releases owned resources', () => {
  const duel = new Duel({seed: 1989});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId: 'pit', car: 'falcone_f42', seed: 1989,
    opponents: [{car: 'dusthawk_rally'}]}), true, 'actual native Pit must exist before its world can load');
  const originalDocument = globalThis.document, originalLoad = THREE.TextureLoader.prototype.load;
  globalThis.document = {createElement: () => ({width: 0, height: 0, getContext: () => context})};
  THREE.TextureLoader.prototype.load = function () {return new THREE.Texture();};
  let world;
  try {
    const before = JSON.stringify({state: duel.state, features: duel.course.features, samples: duel.course.samples});
    world = buildEnvironment(duel.course);
    assert.ok(world.isGroup && world.children.length, 'production environment creates actual scene geometry');
    world.updateMatrixWorld(true);
    const visibleBoundary = world.getObjectByName('Pit hulk wall, centre pile and oval-end scrap');
    assert.ok(visibleBoundary, 'the native round boundary must have actual visible scenery');
    const walls = duel.course.features.barriers.filter(wall => wall.arenaWall).sort((a, b) => a.s - b.s);
    const ray = new THREE.Raycaster(); ray.far = 8;
    for (let index = 0; index < walls.length; index++) {
      const wall = walls[index], next = walls[(index + 1) % walls.length];
      const station = wall.s + duel.course.phase(next.s - wall.s) / 2;
      const from = duel.course.worldAt(station, wall.off - 5);
      const to = duel.course.worldAt(station, wall.off + 3);
      ray.set(new THREE.Vector3(from.x, .55, from.z),
        new THREE.Vector3(to.x - from.x, 0, to.z - from.z).normalize());
      assert.ok(ray.intersectObject(visibleBoundary, true).length,
        'each continuous native wall span has a visible car-height boundary');
    }
    const resources = new Map();
    world.traverse(node => {
      if (node.geometry) {
        assert.ok([...node.geometry.attributes.position.array].every(Number.isFinite), 'actual vertices are finite');
        resources.set(node.geometry, 0);
      }
      for (const material of [].concat(node.material || [])) resources.set(material, 0);
    });
    for (const resource of resources.keys()) resource.addEventListener('dispose', () => resources.set(resource, resources.get(resource) + 1));
    animateScene(world, 12); syncScene(world, duel.state, 1 / 120);
    assert.equal(JSON.stringify({state: duel.state, features: duel.course.features, samples: duel.course.samples}), before,
      'drawing and visual clocks never write rules or physical geometry');
    disposeTree(world); world = null;
    for (const [resource, calls] of resources) assert.equal(calls, resource.userData.sharedAsset ? 0 : 1,
      'unloading releases every owned resource once and preserves shared assets');
  } finally {
    if (world) disposeTree(world);
    globalThis.document = originalDocument; THREE.TextureLoader.prototype.load = originalLoad;
  }
});
