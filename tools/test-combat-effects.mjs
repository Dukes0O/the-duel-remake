import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import {createCombatScene} from '../src/combat-scene.js';
import {createExplosion} from '../src/explosion.js';

const SHEETS = [
  '/assets/textures/fire-flipbook.png',
  '/assets/textures/explosion-flipbook.png',
  '/assets/textures/smoke-flipbook.png',
  '/assets/textures/muzzle-dust.png',
];
const course = {groundAt: (s, lateral) => ({
  x: lateral * 10, y: 1, z: s * 2, heading: 0,
})};
const actor = (s, lateral, wreck = false) => ({
  s, lateral, combatWrecking: wreck,
});
function state({bursts = [], playerWreck = false, laterWreck = false} = {}) {
  return {mode: 'wasteland', status: 'racing', paused: false,
    maxArmor: 100, s: 50, lateral: 2, combatWrecking: playerWreck,
    opponents: [actor(90, 0), actor(150, -3, laterWreck), actor(190, 2)],
    combat: {bursts, projectiles: [], pickups: [], shield: 0,
      rivalShield: 0}, stageTimeSec: 0};
}
function loader({missing = false} = {}) {
  const calls = [];
  const textures = new Map();
  const disposeCounts = new Map();
  return {calls, textures, disposeCounts, loadTexture(url) {
    calls.push(url);
    if (missing) return null;
    const texture = new THREE.Texture();
    texture.name = url;
    disposeCounts.set(url, 0);
    texture.addEventListener('dispose', () =>
      disposeCounts.set(url, disposeCounts.get(url) + 1));
    textures.set(url, texture);
    return texture;
  }};
}
function graphResources(root) {
  const objects = [], geometries = [], materials = [], textures = [];
  root.traverse(object => {
    objects.push(object.uuid);
    if (object.geometry) geometries.push(object.geometry.uuid);
    for (const material of [object.material].flat().filter(Boolean)) {
      materials.push(material.uuid);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.push(value.uuid);
      }
      for (const uniform of Object.values(material.uniforms || {})) {
        if (uniform?.value?.isTexture) textures.push(uniform.value.uuid);
      }
    }
  });
  return {objects: objects.sort(), geometries: geometries.sort(),
    materials: materials.sort(), textures: textures.sort()};
}
function visible(object) {
  for (let item = object; item; item = item.parent) if (!item.visible) return false;
  return true;
}
function visibleAtlasDrawables(root, textures) {
  const ids = new Set([...textures.values()].map(texture => texture.uuid));
  const drawables = [];
  root.traverse(object => {
    if (!visible(object) || !(object.isMesh || object.isSprite || object.isPoints)) return;
    for (const material of [object.material].flat().filter(Boolean)) {
      const values = [...Object.values(material),
        ...Object.values(material.uniforms || {}).map(uniform => uniform?.value)];
      if (values.some(value => value?.isTexture && ids.has(value.uuid))) {
        drawables.push(object);
        break;
      }
    }
  });
  return drawables;
}
function drawnPositions(root) {
  root.updateMatrixWorld(true);
  const positions = [];
  const point = new THREE.Vector3(), matrix = new THREE.Matrix4();
  root.traverse(object => {
    if (!visible(object)) return;
    if (object.isInstancedMesh) {
      for (let index = 0; index < object.count; index++) {
        object.getMatrixAt(index, matrix);
        if (new THREE.Vector3().setFromMatrixScale(matrix).length() < .01) continue;
        positions.push(point.setFromMatrixPosition(matrix)
          .applyMatrix4(object.matrixWorld).clone());
      }
    } else if (object.isMesh || object.isSprite || object.isPoints) {
      positions.push(object.getWorldPosition(point).clone());
      if (object.isPoints) {
        const attribute = object.geometry?.getAttribute('position');
        for (let index = 0; attribute && index < attribute.count; index++) {
          positions.push(point.fromBufferAttribute(attribute, index)
            .applyMatrix4(object.matrixWorld).clone());
        }
      }
    }
  });
  return positions;
}
function near(positions, target, radius = 5) {
  const expected = new THREE.Vector3(target.x, target.y, target.z);
  return positions.some(point => point.distanceTo(expected) <= radius);
}
function visualState(root) {
  const parts = [];
  root.traverse(object => {
    parts.push([object.visible, object.position.toArray(), object.scale.toArray(),
      object.rotation.toArray(), object.material?.opacity ?? null,
      ...Object.values(object.material?.uniforms || {}).map(uniform =>
        typeof uniform.value === 'number' ? uniform.value : null),
      object.geometry?.getAttribute('uv')?.array?.slice() ?? null,
      object.instanceMatrix?.array?.slice() ?? null]);
  });
  return JSON.stringify(parts);
}
function pngDimensions(path) {
  const header = readFileSync(path).subarray(0, 24);
  assert.equal(header.subarray(0, 8).toString('hex'),
    '89504e470d0a1a0a', `${path} is a PNG`);
  return [header.readUInt32BE(16), header.readUInt32BE(20)];
}

test('accepted runtime sheets have the documented 8×8 and 2×2 dimensions', () => {
  for (const path of SHEETS.slice(0, 3)) {
    assert.deepEqual(pngDimensions(`public${path}`), [2048, 2048], path);
  }
  assert.deepEqual(pngDimensions(`public${SHEETS[3]}`), [1024, 1024]);
});

test('atlas UVs read top-left to bottom-right, one cell per frame', async () => {
  const {flipbookFrameUV} = await import('../src/combat-vfx-atlas.js');
  const uv = (frame, columns, rows) => {
    const {offset, repeat} = flipbookFrameUV(frame, {columns, rows});
    return [offset.x, offset.y, repeat.x, repeat.y];
  };
  assert.deepEqual(uv(0, 8, 8), [0, 7 / 8, 1 / 8, 1 / 8]);
  assert.deepEqual(uv(7, 8, 8), [7 / 8, 7 / 8, 1 / 8, 1 / 8]);
  assert.deepEqual(uv(8, 8, 8), [0, 6 / 8, 1 / 8, 1 / 8]);
  assert.deepEqual(uv(31, 8, 8), [7 / 8, 4 / 8, 1 / 8, 1 / 8]);
  assert.deepEqual(uv(63, 8, 8), [7 / 8, 0, 1 / 8, 1 / 8]);
  assert.deepEqual(uv(0, 2, 2), [0, 1 / 2, 1 / 2, 1 / 2]);
  assert.deepEqual(uv(3, 2, 2), [1 / 2, 0, 1 / 2, 1 / 2]);
});

test('one shared pool loads each sheet once and retains resources through repeated hits', async () => {
  const {createCombatEffects} = await import('../src/combat-effects.js');
  const source = loader();
  const effects = createCombatEffects({loadTexture: source.loadTexture});
  try {
    assert.ok(effects.group?.isObject3D && effects.resources,
      'the factory exposes a fixed group and its resources');
    assert.deepEqual(source.calls.slice().sort(), SHEETS.slice().sort(),
      'all four accepted runtime sheets preload once');
    const initial = graphResources(effects.group);
    assert.ok(initial.objects.length > 0 && initial.geometries.length > 0,
      'the effect slots are built before the first hit');
    assert.ok(new Set(initial.textures).size >= 4,
      'all four accepted sheets are bound to prebuilt effect materials');
    let lightCount = 0;
    effects.group.traverse(object => { if (object.isLight) lightCount++; });
    assert.equal(lightCount, 0,
      'pooled effects do not change the scene light count');
    for (let hit = 1; hit <= 80; hit++) {
      const current = state({bursts: [{id: hit, kind: hit % 3 ? 'blast' : 'spark',
        x: 40, y: 2, z: 60, age: 0}]});
      const before = JSON.stringify(current);
      effects.update({state: current, course, dt: 1 / 60});
      assert.equal(JSON.stringify(current), before,
        'rendering an impact never changes simulation state');
      assert.deepEqual(graphResources(effects.group), initial,
        `hit ${hit} reuses every object, geometry, material and texture`);
    }
    assert.deepEqual(source.calls.slice().sort(), SHEETS.slice().sort(),
      'hits never request another runtime sheet');
  } finally {
    effects.dispose();
  }
});

test('disposing the shared pool releases each dedicated sheet exactly once', async () => {
  const {createCombatEffects} = await import('../src/combat-effects.js');
  const source = loader();
  const effects = createCombatEffects({loadTexture: source.loadTexture});
  effects.dispose();
  for (const path of SHEETS) {
    assert.equal(source.disposeCounts.get(path), 1, `${path} is disposed once`);
  }
  effects.dispose();
  for (const path of SHEETS) {
    assert.equal(source.disposeCounts.get(path), 1,
      `${path} is not disposed again`);
  }
});

test('effect planes face each camera during its render pass', async () => {
  const {createCombatEffects} = await import('../src/combat-effects.js');
  const source = loader();
  const effects = createCombatEffects({loadTexture: source.loadTexture});
  try {
    const plane = effects.group.getObjectByName('combat-vfx-burst-0-explosion');
    const camera = new THREE.PerspectiveCamera();
    for (const yaw of [.6, -.9]) {
      camera.rotation.set(.2, yaw, 0);
      plane.onBeforeRender(null, null, camera);
      assert.ok(plane.getWorldQuaternion(new THREE.Quaternion())
        .angleTo(camera.quaternion) < 1e-6,
      'the world matrix faces the current main or rear-view camera');
    }
  } finally {
    effects.dispose();
  }
});

test('sheet effects show the first frame, advance, fade and freeze when paused', async () => {
  const {createCombatEffects} = await import('../src/combat-effects.js');
  const source = loader();
  const effects = createCombatEffects({loadTexture: source.loadTexture});
  try {
    const current = state({bursts: [{id: 1, kind: 'blast',
      x: 40, y: 2, z: 60, age: 0}]});
    effects.update({state: current, course, dt: 0});
    assert.ok(visibleAtlasDrawables(effects.group, source.textures).length > 0,
      'the first paused blast uses a visible accepted sheet');
    assert.ok(near(drawnPositions(effects.group), {x: 40, y: 2, z: 60}),
      'the first paused blast is placed at the real hit position');
    const first = visualState(effects.group);
    effects.update({state: current, course, dt: 0});
    assert.equal(visualState(effects.group), first,
      'repeated paused updates keep the same frame, alpha and pose');
    current.combat.bursts[0].age = .55;
    effects.update({state: current, course, dt: .55});
    assert.notEqual(visualState(effects.group), first,
      'the blast progresses after time advances');
    const active = [];
    effects.group.traverse(object => {
      if (visible(object) && object.material) active.push(...[object.material].flat());
    });
    assert.ok(active.some(material => material.transparent && !material.depthWrite),
      'the atlas is alpha blended without writing depth');
    current.combat.bursts[0] = {id: 2, kind: 'spark',
      x: 40, y: 2, z: 60, age: .36};
    effects.update({state: current, course, dt: 1 / 60});
    assert.equal(visibleAtlasDrawables(effects.group, source.textures).length, 0,
      'an expired impact does not keep an invisible draw call alive');
    current.combat.bursts = [];
    effects.update({state: current, course, dt: 1 / 60});
    assert.equal(visibleAtlasDrawables(effects.group, source.textures).length, 0,
      'ended effects retire their draw calls and alpha');
  } finally {
    effects.dispose();
  }
});

test('simultaneous player and later CPU wrecks keep separate world positions', async () => {
  const {createCombatEffects} = await import('../src/combat-effects.js');
  const source = loader();
  const effects = createCombatEffects({loadTexture: source.loadTexture});
  try {
    const current = state({playerWreck: true, laterWreck: true,
      bursts: [{id: 1, kind: 'blast', x: 40, y: 2, z: 60, age: 0},
        {id: 2, kind: 'blast', x: -25, y: 2, z: 90, age: 0}]});
    effects.update({state: current, course, dt: 0});
    const positions = drawnPositions(effects.group);
    for (const expected of [course.groundAt(50, 2), course.groundAt(150, -3),
      {x: 40, y: 2, z: 60}, {x: -25, y: 2, z: 90}]) {
      assert.ok(near(positions, expected),
        `an active wreck or hit stays at ${JSON.stringify(expected)}`);
    }
    assert.ok(positions.length > 0, 'the fixture has active visual instances');
  } finally {
    effects.dispose();
  }
});

test('missing sheets report unavailable while the existing procedural effects remain usable', async () => {
  const {createCombatEffects} = await import('../src/combat-effects.js');
  const source = loader({missing: true});
  const effects = createCombatEffects({loadTexture: source.loadTexture});
  try {
    assert.equal(effects.available ?? effects.resources?.available, false,
      'a missing runtime sheet is reported to the renderer');
    const current = state({bursts: [{id: 1, kind: 'blast',
      x: 40, y: 2, z: 60, age: 0}]});
    const before = graphResources(effects.group);
    assert.doesNotThrow(() => effects.update({state: current, course, dt: 0}));
    assert.deepEqual(graphResources(effects.group), before,
      'the missing-asset path creates no per-hit meshes or materials');
    assert.deepEqual(source.calls.slice().sort(), SHEETS.slice().sort(),
      'each missing sheet was attempted once');
  } finally {
    effects.dispose();
  }
  const procedural = createExplosion({combat: true});
  try {
    procedural.update({x: 40, y: 2, z: 60},
      {status: 'racing', catastrophic: true}, 0);
    const puff = procedural.group.children.find(child => child.isPoints);
    const ring = procedural.group.children.find(child =>
      child.geometry?.type === 'RingGeometry');
    assert.ok(procedural.group.visible && ring.material.opacity > 0 &&
      puff.geometry.attributes.puff.array.some((size, index) =>
        index % 4 === 0 && size > 0),
    'the retained CMB-01 combat pool supplies a visible paused fallback');
  } finally {
    procedural.dispose();
  }
  const fallbackScene = createCombatScene();
  try {
    const current = state({bursts: [{id: 1, kind: 'blast',
      x: 40, y: 2, z: 60, age: 0}]});
    fallbackScene.update({state: current, course}, {});
    assert.ok(near(drawnPositions(fallbackScene.group), {x: 40, y: 2, z: 60}),
      'the retained procedural combat burst can still show an impact');
  } finally {
    fallbackScene.dispose();
  }
});

test('ordinary fatal crashes retain their approved shader and dynamic light', () => {
  const effect = createExplosion();
  try {
    const puffs = effect.group.children.find(child => child.isPoints);
    const light = effect.group.children.find(child => child.isPointLight);
    const shader = puffs.material;
    const fingerprint = createHash('sha256')
      .update(JSON.stringify([shader.vertexShader, shader.fragmentShader]))
      .digest('hex');
    assert.equal(fingerprint,
      '4e0604803a08ed1cc848ecf2775cb515d57a8723b943af5dfc6b2bf7fbe60f58');
    effect.update({x: 0, y: 1, z: 0},
      {status: 'racing', catastrophic: true}, 0);
    assert.equal(light.intensity, 0, 'legacy paused activation is unchanged');
    effect.update({x: 0, y: 1, z: 0},
      {status: 'racing', catastrophic: true}, 1 / 60);
    assert.ok(effect.group.visible && light.visible && light.intensity > 0);
  } finally {
    effect.dispose();
  }
});

test('flag-off Wasteland retains its procedural combat burst presentation', () => {
  const scene = createCombatScene();
  try {
    const current = state({bursts: [{id: 7, kind: 'blast',
      x: 4, y: 1, z: 8, age: .3}]});
    current.maxArmor = undefined;
    scene.update({state: current, course}, {});
    const visibleParts = [];
    scene.group.traverse(object => {
      if (!visible(object) || !object.isMesh) return;
      visibleParts.push([object.geometry?.type, object.material?.type,
        object.material?.color?.getHex() ?? null,
        object.position.toArray().map(value => +value.toFixed(4)),
        object.scale.toArray().map(value => +value.toFixed(4))]);
    });
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(visibleParts)).digest('hex');
    assert.equal(fingerprint,
      '410c81e83f0e22bf4207a764123bcc9a72c4ac6bc1384c3471f03f9de607de94',
      'the existing procedural burst remains unchanged when the switch is off');
  } finally {
    scene.dispose();
  }
});
