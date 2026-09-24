import {mkdtempSync, mkdirSync, copyFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname, resolve, relative, isAbsolute, win32} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFighter, stepFighter, FIGHTER_STEP_SECONDS} from '../src/onfoot.js';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createCombatScene} from '../src/combat-scene.js';

// GFX-00: exercise the public renderer with real Three objects, without WebGL
// or Blender. Matched camera alignment and likeness also require the art review.
const checks = [];
const check = (name, run) => checks.push({name, run});
const file = path => new URL(`../${path}`, import.meta.url);
const settle = () => new Promise(resolve => setImmediate(resolve));
const options = time => ({active: true, enabled: true, time});
const fighter = extra => Object.freeze({x: 3, y: 0, z: 7, yaw: 0,
  steps: 0, airHeight: 0, knockedDown: false, ...extra});
const skins = group => {
  const found = [];
  group.traverse(node => { if (node.isSkinnedMesh) found.push(node); });
  return found;
};
const visible = node => {
  for (let parent = node; parent; parent = parent.parent) if (!parent.visible) return false;
  return true;
};
const fallbackCount = group => {
  let count = 0;
  group.traverse(node => {
    if (node.isInstancedMesh && visible(node)) count += node.count;
  });
  return count;
};
async function factory() {
  assert.ok(existsSync(file('src/rigged-fighter.js')), 'GFX-00 rigged renderer module is missing');
  const module = await import('../src/rigged-fighter.js');
  assert.equal(typeof module.createRiggedFighterFigures, 'function');
  return module.createRiggedFighterFigures;
}
function fixture() {
  const scene = new THREE.Group();
  const geometry = new THREE.BoxGeometry(.5, 1.8, .3);
  geometry.translate(0, .9, 0);
  const count = geometry.attributes.position.count;
  const indices = new Uint16Array(count * 4);
  const weights = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) weights[i * 4] = 1;
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  const material = new THREE.MeshStandardMaterial();
  const mesh = new THREE.SkinnedMesh(geometry, material);
  const bone = new THREE.Bone(); bone.name = 'FixtureRoot';
  mesh.add(bone); mesh.bind(new THREE.Skeleton([bone])); scene.add(mesh);
  const animations = [
    new THREE.AnimationClip('idle', 2, [new THREE.NumberKeyframeTrack('FixtureRoot.position[y]', [0, 1, 2], [0, .2, 0])]),
    new THREE.AnimationClip('walk', 2, [new THREE.NumberKeyframeTrack('FixtureRoot.position[z]', [0, 1, 2], [0, .5, 0])]),
    new THREE.AnimationClip('knockdown', 2, [new THREE.QuaternionKeyframeTrack('FixtureRoot.quaternion', [0, 1, 2], [0, 0, 0, 1, -.70710678, 0, 0, .70710678, 0, 0, 0, 1])]),
  ];
  const disposed = {geometry: 0, material: 0};
  geometry.addEventListener('dispose', () => disposed.geometry++);
  material.addEventListener('dispose', () => disposed.material++);
  return {scene, animations, disposed};
}
async function ready(roster = [fighter()]) {
  const create = await factory();
  const asset = fixture();
  let loads = 0;
  const view = create({loadAsset: async () => { loads++; return asset; }});
  view.update(roster, options(0)); await settle(); view.update(roster, options(0));
  return {view, asset, loads: () => loads};
}
function pose(group) {
  group.updateMatrixWorld(true);
  return skins(group).flatMap(mesh => mesh.skeleton.bones.flatMap(bone => bone.matrixWorld.toArray()));
}

check('regeneration script and self-contained GLB', () => {
  assert.ok(!existsSync(file('public/assets/models/wasteland/test-fighter.blend')), 'SPEC 0.7: Blender files are rebuilt by the script and never shipped in public/');
  const script = file('tools/blender/test-fighter.py');
  assert.ok(existsSync(script) && readFileSync(script).length > 100, 'regeneration script is missing or empty');
  const bytes = readFileSync(file('public/assets/models/wasteland/test-fighter.glb'));
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const json = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
  for (const item of [...(json.buffers || []), ...(json.images || [])])
    assert.ok(!item.uri || item.uri.startsWith('data:'), 'GLB must not depend on external asset files');
  assert.ok(json.skins?.length > 0, 'GLB has no bound skin');
});

check('actual asset has finite weighted geometry, ground alignment and budget', async () => {
  assert.ok(existsSync(file('public/assets/models/wasteland/test-fighter.glb')), 'exported test-fighter.glb is missing');
  const bytes = readFileSync(file('public/assets/models/wasteland/test-fighter.glb'));
  const asset = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const meshes = skins(asset.scene);
  assert.ok(meshes.length, 'GLTFLoader must produce a SkinnedMesh');
  let triangles = 0; const materials = new Set();
  asset.scene.updateMatrixWorld(true);
  for (const mesh of meshes) {
    const geometry = mesh.geometry;
    triangles += (geometry.index?.count || geometry.attributes.position.count) / 3;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material);
    assert.ok(mesh.skeleton.bones.length && mesh.skeleton.boneInverses.length === mesh.skeleton.bones.length);
    for (const attribute of Object.values(geometry.attributes))
      assert.ok(Array.from(attribute.array).every(Number.isFinite), 'asset geometry must be finite');
    const indices = geometry.attributes.skinIndex, weights = geometry.attributes.skinWeight;
    assert.ok(indices && weights, 'bound mesh needs skin indices and weights');
    for (let i = 0; i < weights.count; i++) {
      const sum = weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i);
      assert.ok(Math.abs(sum - 1) < .001, 'vertex skin weights must sum to one');
      for (const get of ['getX', 'getY', 'getZ', 'getW'])
        assert.ok(indices[get](i) < mesh.skeleton.bones.length, 'skin index must reference a bone');
    }
  }
  assert.ok(triangles > 0 && triangles <= 8000, `near asset has ${triangles} triangles; limit 8000`);
  assert.ok(materials.size <= 2, `asset has ${materials.size} materials; limit 2`);
  const bounds = new THREE.Box3().setFromObject(asset.scene);
  assert.ok(Math.abs(bounds.min.y) < .06 && bounds.max.y > 1, 'standing fighter feet must be at Y=0 with upright metre-scale body');
  // Prove exported clips deform bound vertices, not merely an unbound object.
  for (const name of ['idle', 'walk', 'knockdown']) {
    const clip = asset.animations.find(item => item.name.toLowerCase() === name);
    assert.ok(clip?.duration > 0, `export is missing named ${name} clip`);
    const mixer = new THREE.AnimationMixer(asset.scene);
    mixer.clipAction(clip).play();
    const vertices = time => {
      mixer.setTime(time); asset.scene.updateMatrixWorld(true);
      return meshes.flatMap(mesh => {
        mesh.skeleton.update();
        return Array.from({length: mesh.geometry.attributes.position.count}, (_, i) =>
          mesh.getVertexPosition(i, new THREE.Vector3()).toArray()).flat();
      });
    };
    const start = vertices(0), middle = vertices(clip.duration * .37);
    assert.ok(start.some((value, i) => Math.abs(value - middle[i]) > .001), `${name} must visibly deform bound vertices`);
    mixer.stopAllAction(); mixer.uncacheRoot(asset.scene);
  }
});

check('flag-off and inactive updates request no assets', async () => {
  const create = await factory(); let loads = 0;
  const view = create({loadAsset: async () => { loads++; return fixture(); }});
  view.update([fighter()], {active: true, enabled: false, time: 0});
  view.update([fighter()], {active: false, enabled: true, time: 1});
  await settle(); assert.equal(loads, 0, 'disabled/inactive renderer must make no asset request'); view.dispose();
});

check('pending fallback remains visible, load starts once and ready replaces fallback', async () => {
  const create = await factory(); let resolve, loads = 0;
  const promise = new Promise(done => { resolve = done; });
  const view = create({loadAsset: () => { loads++; return promise; }});
  for (let i = 0; i < 4; i++) view.update([fighter()], options(i / 10));
  await settle(); assert.equal(loads, 1, 'repeated updates must share a single pending load');
  assert.ok(fallbackCount(view.group) > 0, 'primitive fallback must remain visible while loading');
  resolve(fixture()); await settle(); view.update([fighter()], options(.4));
  assert.equal(skins(view.group).filter(visible).length, 1, 'resolved asset must appear');
  assert.equal(fallbackCount(view.group), 0, 'ready rig must replace its primitive fallback'); view.dispose();
});

check('load rejection preserves fallback without retrying every frame', async () => {
  const create = await factory(); let loads = 0;
  const view = create({loadAsset: async () => { loads++; throw new Error('fixture load failure'); }});
  view.update([fighter()], options(0)); await settle();
  for (let i = 1; i < 4; i++) view.update([fighter()], options(i));
  await settle(); assert.equal(loads, 1, 'failed asset must not trigger a request every frame');
  assert.ok(fallbackCount(view.group) > 0, 'failure must leave a drawable primitive fighter'); view.dispose();
});

check('simulation clock advances, pauses and rewinds actual bone pose without changing input', async () => {
  const roster = Object.freeze([fighter()]); const before = JSON.stringify(roster);
  const {view} = await ready(roster);
  view.update(roster, options(.25)); const first = pose(view.group);
  assert.ok(first.length, 'ready renderer needs animated bones');
  for (let i = 0; i < 8; i++) view.update(roster, options(.25));
  assert.deepEqual(pose(view.group), first, 'extra render frames must not advance animation');
  view.update(roster, options(.75)); assert.notDeepEqual(pose(view.group), first, 'simulation time must advance animation');
  view.update(roster, options(.25)); assert.deepEqual(pose(view.group), first, 'same simulation time must restore the same bone pose');
  assert.equal(JSON.stringify(roster), before, 'rendering must not mutate fighter inputs'); view.dispose();
});

check('fighters own independent skeletons and knockdown animation', async () => {
  const roster = [fighter(), fighter({x: 6, knockedDown: true})];
  const {view} = await ready(roster); view.update(roster, options(.5));
  const meshes = skins(view.group); assert.equal(meshes.length, 2);
  assert.notEqual(meshes[0].skeleton, meshes[1].skeleton);
  assert.notEqual(meshes[0].skeleton.bones[0], meshes[1].skeleton.bones[0]);
  assert.notDeepEqual(meshes[0].skeleton.bones[0].quaternion.toArray(), meshes[1].skeleton.bones[0].quaternion.toArray(), 'knockdown must select a different pose from idle');
  const second = meshes[1].skeleton.bones[0].position.clone();
  meshes[0].skeleton.bones[0].position.x += 8;
  assert.ok(meshes[1].skeleton.bones[0].position.equals(second), 'one skeleton must not move another'); view.dispose();
});

check('first-person draw hides only the local rig and restores distant views', async () => {
  const local = fighter({x: 9}); const roster = [fighter(), {fighter: local, local: true}];
  const {view} = await ready(roster); const camera = new THREE.PerspectiveCamera();
  const countDrawn = () => skins(view.group).filter(mesh => {
    mesh.onBeforeRender(null, null, camera, mesh.geometry, mesh.material, null);
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const drawn = visible(mesh) && materials.some(material => material.visible) && mesh.geometry.drawRange.count > 0 && camera.layers.test(mesh.layers);
    mesh.onAfterRender(null, null, camera, mesh.geometry, mesh.material, null); return drawn;
  }).length;
  camera.position.set(local.x, local.y + 1.62, local.z);
  assert.equal(countDrawn(), 1, 'camera at local eye must omit the local body only');
  camera.position.x += 5; assert.equal(countDrawn(), 2, 'distant camera must see both bodies'); view.dispose();
});

check('dispose releases loaded resources once and removes scene objects', async () => {
  const {view, asset} = await ready(); const parent = new THREE.Group(); parent.add(view.group);
  view.dispose(); view.dispose();
  assert.equal(view.group.parent, null); assert.equal(view.group.children.length, 0);
  assert.deepEqual(asset.disposed, {geometry: 1, material: 1}, 'shared loaded resources must be disposed exactly once');
});

check('a late asset is disposed and cannot repopulate a disposed renderer', async () => {
  const create = await factory(); let resolve;
  const promise = new Promise(done => { resolve = done; });
  const view = create({loadAsset: () => promise});
  view.update([fighter()], options(0)); await settle(); view.dispose();
  const asset = fixture(); resolve(asset); await settle();
  assert.equal(view.group.children.length, 0, 'late load must not resurrect scene children');
  assert.deepEqual(asset.disposed, {geometry: 1, material: 1}, 'late loaded resources must be released');
});

check('combat scene gates loading by mode and switch and passes simulation time', async () => {
  let loads = 0;
  const scene = createCombatScene(undefined, {loadFighterAsset: async () => { loads++; return fixture(); }});
  const duel = {state: {status: 'racing', mode: 'duel', onFoot: true, fighter: fighter(), stageTimeSec: .25,
    combat: {pickups: [], projectiles: [], bursts: []}, opponents: []}, featureFlags: {enabled: () => false}};
  scene.update(duel); await settle(); assert.equal(loads, 0);
  duel.featureFlags.enabled = () => true; scene.update(duel); await settle(); assert.equal(loads, 0, 'ordinary mode must not request a fighter asset');
  duel.state.mode = 'wasteland'; duel.featureFlags.enabled = () => false;
  scene.update(duel); await settle(); assert.equal(loads, 0, 'flag-off Wasteland must not request a fighter asset');
  duel.featureFlags.enabled = () => true; const before = JSON.stringify(duel.state);
  scene.update(duel); await settle(); scene.update(duel);
  assert.equal(loads, 1, 'eligible combat scene must load the rigged fighter');
  const first = pose(scene.group); assert.ok(first.length);
  scene.update(duel); assert.deepEqual(pose(scene.group), first);
  assert.equal(JSON.stringify(duel.state), before, 'combat renderer must not write race state');
  duel.state.stageTimeSec = .75; scene.update(duel);
  assert.notDeepEqual(pose(scene.group), first, 'combat hook must pass simulation time to the rig'); scene.dispose();
});

check('matched-sheet provenance retains asset, camera, pose and cost evidence', () => {
  const root = 'docs/board/looks/test-fighter/round-1';
  const fixture = 'tools/fixtures/art-review/test-fighter/round-1.json';
  // SPEC 0.7: raw sheets live outside Git. When a local copy exists, it must still be a real image.
  if (existsSync(file(`${root}.png`))) {
    const png = readFileSync(file(`${root}.png`));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.ok(png.readUInt32BE(16) >= 400 && png.readUInt32BE(20) >= 200, 'contact sheet must contain useful image evidence');
  }
  assert.ok(existsSync(file(fixture)), 'contact sheet provenance fixture is missing');
  const evidence = JSON.parse(readFileSync(file(fixture), 'utf8'));
  const hash = createHash('sha256').update(readFileSync(file('public/assets/models/wasteland/test-fighter.glb'))).digest('hex');
  assert.equal(evidence.assetHash, hash, 'provenance hash must identify the checked-in fighter');
  assert.match(evidence.observationCommit, /^[a-f0-9]{7,40}$/);
  assert.ok(evidence.camera && evidence.clip && Number.isFinite(evidence.time), 'provenance must identify camera and clip/time');
  for (const kind of ['reference', 'blender', 'high', 'performance']) assert.ok(evidence[kind], `provenance needs ${kind} image sources`);
  assert.ok(evidence.counts && evidence.qualities, 'provenance must record triangle/material/draw-call counts and quality modes');
});

check('production movement selects the same GLB clip and pose at 30/60/144 FPS', async () => {
  const create = await factory();
  const bytes = readFileSync(file('public/assets/models/wasteland/test-fighter.glb'));
  const course = {def: {},
    groundAt: (s, lateral) => ({x: lateral, y: 0, z: s, heading: 0}),
    nearest: (x, z) => ({s: z, lateral: x}), obstaclesNear: () => []};
  const car = {s: 0, lateral: 0}, results = [];
  for (const fps of [30, 60, 144]) {
    // Each renderer receives the same production simulation, sampled at its
    // own display rate. No speed, displacement or clip is supplied by the test.
    const actor = createFighter(course, car, {s: 0, lateral: 0});
    const asset = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const view = create({loadAsset: async () => asset});
    const roster = [actor];
    let tick = 0, frame = 1;
    const render = () => view.update(roster, options(tick * FIGHTER_STEP_SECONDS));
    const advance = target => {
      while (tick < target) {
        stepFighter(course, car, actor, {forward: tick < 2});
        tick++;
      }
    };
    try {
      render(); await settle(); render();
      const samples = [];
      for (const sharedTick of [4, 8]) {
        while (Math.floor(frame * 120 / fps + 1e-9) <= sharedTick) {
          advance(Math.floor(frame * 120 / fps + 1e-9)); render(); frame++;
        }
        advance(sharedTick); render();
        const rig = view.group.children.find(node => node.userData.clip);
        assert.ok(rig, 'loaded GLB must report its selected animation');
        samples.push({tick: sharedTick, clip: rig.userData.clip, bones: pose(view.group)});
      }
      assert.ok(Math.abs(actor.z - .075) < 1e-10, 'production movement must run only the first two steps');
      results.push({fps, samples});
    } finally { view.dispose(); }
  }
  const choices = results.map(({fps, samples}) => ({fps, clips: samples.map(sample => sample.clip)}));
  assert.deepEqual(choices, [30, 60, 144].map(fps => ({fps, clips: ['idle', 'idle']})),
    'stopped production fighter must be idle at shared ticks 4 and 8 regardless of render FPS');
  for (const result of results.slice(1))
    assert.deepEqual(result.samples, results[0].samples, `${result.fps} FPS must reproduce the same GLB bone pose as 30 FPS`);
});

check('retained capture and contact-sheet paths survive checkout relocation', () => {
  const repository = fileURLToPath(file(''));
  const captures = JSON.parse(readFileSync(file('tools/fixtures/art-review/test-fighter/captures.json'), 'utf8'));
  const evidence = JSON.parse(readFileSync(file('tools/fixtures/art-review/test-fighter/round-1.json'), 'utf8'));
  const paths = [...captures.captures.map(capture => capture.path), evidence.reference.path,
    ...evidence.blender, ...evidence.high, ...evidence.performance, evidence.output];
  assert.ok(paths.length > 18, 'retained evidence must include both game quality modes and source images');
  const relocated = mkdtempSync(join(tmpdir(), 'duel-gfx00-relocated-'));
  try {
    for (const path of new Set(paths)) {
      assert.equal(typeof path, 'string');
      assert.ok(!isAbsolute(path) && !win32.isAbsolute(path) && !/^[a-z]+:/i.test(path),
        `retained capture path must be repository-relative: ${path}`);
      const target = resolve(relocated, path);
      const inside = relative(relocated, target);
      assert.ok(inside && !inside.startsWith('..') && !isAbsolute(inside),
        `retained capture path must stay inside the relocated checkout: ${path}`);
      // SPEC 0.7: raw captures are no longer committed; copy only local copies that exist.
      if (!existsSync(resolve(repository, path))) continue;
      mkdirSync(dirname(target), {recursive: true});
      copyFileSync(resolve(repository, path), target);
    }
    // Resolve only against the new checkout: no original-lane fallback is used.
    for (const path of paths) {
      if (!existsSync(resolve(repository, path))) continue;
      const retained = readFileSync(resolve(relocated, path));
      assert.ok(retained.length > 8, `relocated image must be readable: ${path}`);
      assert.equal(retained.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    }
  } finally {
    const withinTemp = relative(resolve(tmpdir()), resolve(relocated));
    assert.ok(withinTemp.startsWith('duel-gfx00-relocated-') && !isAbsolute(withinTemp));
    rmSync(relocated, {recursive: true, force: true});
  }
});

let failures = 0;
for (const {name, run} of checks) {
  try { await run(); } catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}
console.log(`Rigged fighter: ${checks.length} checks, ${checks.length - failures} passed, ${failures} failed.`);
if (failures) process.exitCode = 1;
