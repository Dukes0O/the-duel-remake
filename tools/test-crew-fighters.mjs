import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createRiggedFighterFigures} from '../src/rigged-fighter.js';

// Asset structure and observable rendering behavior only. Likeness, matched
// fidelity rounds and measured frame cost require the separate visual review.
const CREW = ['rook', 'nell', 'jax', 'odessa', 'cinder', 'dune', 'wren', 'tusk'];
const CLIPS = ['idle', 'walk', 'sprint', 'jump', 'knockdown', 'get-up',
  'aim', 'fire', 'reload', 'repair', 'enter', 'exit'];
const checks = [];
const check = (name, run) => checks.push({name, run});
const file = path => new URL(`../${path}`, import.meta.url);
const settle = () => new Promise(resolve => setImmediate(resolve));
const fighter = (crewId, extra = {}) => ({crewId, x: 0, y: 0, z: 0, yaw: 0,
  speed: 0, airHeight: 0, knockedDown: false, ...extra});
const options = (detail = 'near', time = .25) => ({active: true, enabled: true, detail, time});
const meshes = group => {
  const result = []; group.traverse(node => {if (node.isSkinnedMesh) result.push(node);}); return result;
};
const visible = node => {
  for (let ancestor = node; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return false;
  return true;
};
const detailOf = node => {
  for (let ancestor = node; ancestor; ancestor = ancestor.parent) {
    const label = String(ancestor.userData?.lod || ancestor.name).toLowerCase();
    if (/(^|[-_ ])near($|[-_ ])/.test(label)) return 'near';
    if (/(^|[-_ ])far($|[-_ ])/.test(label)) return 'far';
  }
  return null;
};
// WebGLRenderer submits geometry groups only for material arrays. A mesh with
// one material draws once, even when BoxGeometry retains its six face groups.
const primitiveCount = mesh => Array.isArray(mesh.material) ? mesh.geometry.groups.length : 1;
function readGlb(id) {
  const path = file(`public/assets/models/wasteland/crew/${id}.glb`);
  assert.ok(existsSync(path), `${id}: exported crew GLB is missing`);
  const bytes = readFileSync(path);
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2); assert.equal(bytes.readUInt32LE(8), bytes.length);
  let json, binary;
  for (let offset = 12; offset < bytes.length;) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
    if (type === 0x004e4942) binary = chunk;
    offset += 8 + length;
  }
  assert.ok(json && binary, `${id}: GLB needs JSON and embedded geometry`);
  return {bytes, json, binary};
}
async function parseAsset(bytes) {
  // Node has no browser image decoder. Inspect embedded PNG dimensions below,
  // and substitute only texture decoding while loading real skins and clips.
  const loader = new GLTFLoader();
  loader.register(() => ({name: 'TEST_EMBEDDED_TEXTURE', loadTexture: () => Promise.resolve(new THREE.Texture())}));
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}

check('headless regeneration source and original GFX-00 source remain available', () => {
  for (const path of ['tools/blender/crew-fighters.py', 'tools/blender/test-fighter.py',
    'public/assets/models/wasteland/test-fighter.blend', 'public/assets/models/wasteland/test-fighter.glb']) {
    assert.ok(existsSync(file(path)), `${path} is missing`);
    assert.ok(readFileSync(file(path)).length > 100, `${path} is empty`);
  }
});
for (const id of CREW) {
  check(`${id}: self-contained rig, both geometry budgets and 1024 texture set`, async () => {
    assert.ok(existsSync(file(`public/assets/models/wasteland/crew/${id}.blend`)), `${id}: editable Blender source is missing`);
    const {bytes, json, binary} = readGlb(id);
    for (const item of [...(json.buffers || []), ...(json.images || [])])
      assert.ok(!item.uri || item.uri.startsWith('data:'), `${id}: asset requires an external resource`);
    assert.ok(json.images?.length > 0, `${id}: no texture set is embedded`);
    const roles = new Map();
    for (const material of json.materials || []) {
      for (const [role, texture] of Object.entries({color: material.pbrMetallicRoughness?.baseColorTexture,
        surface: material.pbrMetallicRoughness?.metallicRoughnessTexture, normal: material.normalTexture,
        occlusion: material.occlusionTexture, emissive: material.emissiveTexture})) {
        if (!texture) continue;
        const source = json.textures[texture.index].source;
        if (!roles.has(role)) roles.set(role, new Set()); roles.get(role).add(source);
      }
    }
    assert.ok(roles.has('color'), `${id}: a readable textured outfit needs a base color map`);
    for (const [role, sources] of roles) assert.equal(sources.size, 1, `${id}: more than one ${role} atlas`);
    for (const image of json.images) {
      let png;
      if (image.uri) {
        assert.match(image.uri, /^data:image\/png;base64,/); png = Buffer.from(image.uri.split(',')[1], 'base64');
      } else {
        assert.equal(image.mimeType, 'image/png', `${id}: retain lossless PNG texture sources`);
        const view = json.bufferViews[image.bufferView];
        png = binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
      }
      assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.equal(png.readUInt32BE(16), 1024); assert.equal(png.readUInt32BE(20), 1024);
    }
    const asset = await parseAsset(bytes), skins = meshes(asset.scene);
    for (const [detail, limit] of [['near', 8000], ['far', 2000]]) {
      const level = skins.filter(mesh => detailOf(mesh) === detail);
      assert.ok(level.length, `${id}: ${detail} bound geometry is missing`);
      const triangles = level.reduce((sum, mesh) => sum +
        (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3, 0);
      assert.ok(triangles > 0 && triangles <= limit, `${id}: ${detail} has ${triangles} triangles; limit ${limit}`);
      assert.ok(level.reduce((sum, mesh) => sum + primitiveCount(mesh), 0) <= 2,
        `${id}: ${detail} exceeds two visible material primitives`);
      for (const mesh of level) {
        assert.ok(mesh.skeleton?.bones.length, `${id}: mesh is not bound to a skeleton`);
        for (const attribute of Object.values(mesh.geometry.attributes))
          assert.ok(Array.from(attribute.array).every(Number.isFinite), `${id}: non-finite geometry`);
        const weights = mesh.geometry.attributes.skinWeight;
        assert.ok(weights, `${id}: missing skin weights`);
        for (let index = 0; index < weights.count; index++) assert.ok(Math.abs(
          weights.getX(index) + weights.getY(index) + weights.getZ(index) + weights.getW(index) - 1) < .001);
      }
    }
  });
  check(`${id}: all twelve clips deform the bound skin`, async () => {
    const asset = await parseAsset(readGlb(id).bytes);
    const skins = meshes(asset.scene).filter(mesh => detailOf(mesh) === 'near');
    assert.ok(skins.length, `${id}: no near skin to animate`);
    for (const name of CLIPS) {
      const clip = asset.animations.find(item => item.name === name);
      assert.ok(clip?.duration > 0, `${id}: ${name} clip is missing`);
      const mixer = new THREE.AnimationMixer(asset.scene);
      mixer.clipAction(clip).play();
      const sample = time => {
        mixer.setTime(time); asset.scene.updateMatrixWorld(true);
        return skins.flatMap(mesh => {
          mesh.skeleton.update(); const points = [], count = mesh.geometry.attributes.position.count;
          for (let index = 0; index < count; index += Math.max(1, Math.floor(count / 256)))
            points.push(...mesh.getVertexPosition(index, new THREE.Vector3()).toArray());
          return points;
        });
      };
      const first = sample(0);
      const changed = [.23, .61].some(fraction => sample(clip.duration * fraction)
        .some((value, index) => Math.abs(value - first[index]) > .001));
      assert.ok(changed, `${id}: ${name} has no visible bound-vertex deformation`);
      mixer.stopAllAction(); mixer.uncacheRoot(asset.scene);
    }
  });
}

function fixture(id) {
  const scene = new THREE.Group(), disposed = {geometry: 0, material: 0};
  const material = new THREE.MeshStandardMaterial();
  material.addEventListener('dispose', () => disposed.material++);
  for (const detail of ['near', 'far']) {
    const geometry = new THREE.BoxGeometry(.5, 1.8, .3);
    geometry.translate(0, .9, 0);
    const count = geometry.attributes.position.count, weights = new Float32Array(count * 4);
    for (let index = 0; index < count; index++) weights[index * 4] = 1;
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    geometry.addEventListener('dispose', () => disposed.geometry++);
    const mesh = new THREE.SkinnedMesh(geometry, material), bone = new THREE.Bone();
    bone.name = `Root_${detail}`; mesh.name = `${id}-${detail}`; mesh.userData.lod = detail;
    mesh.add(bone); mesh.bind(new THREE.Skeleton([bone])); scene.add(mesh);
  }
  const animations = CLIPS.map((name, index) => new THREE.AnimationClip(name, 1,
    ['near', 'far'].map(detail => new THREE.NumberKeyframeTrack(`Root_${detail}.position[y]`,
      [0, .5, 1], [0, .03 * (index + 1), 0]))));
  return {scene, animations, disposed};
}
async function ready(roster, loadAsset) {
  const view = createRiggedFighterFigures({loadAsset});
  view.update(roster, options()); await settle(); view.update(roster, options()); return view;
}
check('crew requests are keyed by actual ID and shared between duplicates and frames', async () => {
  const requests = [], roster = [...CREW.map(id => fighter(id)), fighter('rook')];
  const view = await ready(roster, async id => {requests.push(id); return fixture(id);});
  try {
    for (let index = 0; index < 5; index++) view.update(roster, options());
    await settle(); assert.deepEqual([...requests].sort(), [...CREW].sort());
    const shown = meshes(view.group).filter(visible);
    assert.equal(shown.length, roster.length, 'exactly one LOD must draw for each fighter');
    for (const id of CREW) assert.ok(shown.some(mesh => mesh.name.startsWith(`${id}-`)), `wrong model for ${id}`);
    const rook = shown.filter(mesh => mesh.name.startsWith('rook-'));
    assert.equal(rook.length, 2); assert.notEqual(rook[0].skeleton, rook[1].skeleton);
    assert.notEqual(rook[0].skeleton.bones[0], rook[1].skeleton.bones[0]);
  } finally {view.dispose();}
});
check('twelve fighters switch detail without requests, new meshes or hidden LOD draws', async () => {
  let loads = 0; const roster = Array.from({length: 12}, (_, index) => fighter(CREW[index % 8], {x: index * 2}));
  const view = await ready(roster, async id => {loads++; return fixture(id);});
  try {
    const identities = meshes(view.group).map(mesh => [mesh.uuid, mesh.geometry.uuid, mesh.material.uuid]);
    for (const detail of ['far', 'near', 'far']) {
      view.update(roster, options(detail));
      const shown = meshes(view.group).filter(visible);
      assert.equal(shown.length, 12); assert.ok(shown.every(mesh => detailOf(mesh) === detail));
      assert.ok(shown.reduce((sum, mesh) => sum + primitiveCount(mesh), 0) <= 24);
      assert.deepEqual(meshes(view.group).map(mesh => [mesh.uuid, mesh.geometry.uuid, mesh.material.uuid]), identities,
        'detail switching must reuse prepared meshes and materials');
    }
    assert.equal(loads, 8);
  } finally {view.dispose();}
});
check('failed crew preserves its fallback while another crew renders normally', async () => {
  const calls = [];
  const roster = [fighter('rook'), fighter('nell', {x: 4})];
  const view = await ready(roster, async id => {
    calls.push(id); if (id === 'nell') throw new Error('controlled crew failure'); return fixture(id);
  });
  try {
    for (let index = 0; index < 4; index++) view.update(roster, options());
    await settle(); assert.deepEqual(calls.sort(), ['nell', 'rook']);
    assert.equal(meshes(view.group).filter(visible).length, 1);
    let fallback = 0;
    view.group.traverse(node => {if (node.isInstancedMesh && visible(node)) fallback += node.count;});
    assert.ok(fallback > 0, 'failed crew must remain visible as a primitive fallback');
  } finally {view.dispose();}
});
check('disposing pending crew requests releases every late asset once', async () => {
  const pending = new Map(), assets = new Map();
  const view = createRiggedFighterFigures({loadAsset: id => new Promise(resolve => pending.set(id, resolve))});
  view.update([fighter('rook'), fighter('nell')], options()); await settle();
  view.dispose(); view.dispose();
  for (const [id, resolve] of pending) {const asset = fixture(id); assets.set(id, asset); resolve(asset);}
  await settle();
  assert.deepEqual([...pending.keys()].sort(), ['nell', 'rook']);
  assert.equal(view.group.children.length, 0);
  for (const asset of assets.values()) assert.deepEqual(asset.disposed, {geometry: 2, material: 1});
});
check('first-person hiding applies to the selected local crew at either detail', async () => {
  const local = fighter('nell', {x: 8}), roster = [fighter('rook'), {fighter: local, local: true}];
  const view = await ready(roster, async id => fixture(id));
  try {
    const camera = new THREE.PerspectiveCamera();
    for (const detail of ['near', 'far']) {
      view.update(roster, options(detail));
      for (const [distance, expected] of [[0, 1], [6, 2]]) {
        camera.position.set(local.x + distance, local.y + 1.62, local.z);
        let drawn = 0;
        for (const mesh of meshes(view.group).filter(visible)) {
          mesh.onBeforeRender(null, null, camera, mesh.geometry, mesh.material, null);
          if (mesh.geometry.drawRange.count > 0 && mesh.material.visible && camera.layers.test(mesh.layers)) drawn++;
          mesh.onAfterRender(null, null, camera, mesh.geometry, mesh.material, null);
        }
        assert.equal(drawn, expected, `${detail}: local eye/distant body visibility is wrong`);
      }
    }
  } finally {view.dispose();}
});

const bonePose = group => meshes(group).filter(mesh => detailOf(mesh) === 'near' && visible(mesh))
  .flatMap(mesh => mesh.skeleton.bones.flatMap(bone => [...bone.position.toArray(),
    ...bone.quaternion.toArray(), ...bone.scale.toArray()]));

check('an airborne jump late in the race advances the actual authored bone pose', async () => {
  const asset = await parseAsset(readGlb('rook').bytes);
  const entry = {fighter: fighter('rook', {airHeight: .2, verticalSpeed: 4, y: .2})};
  const view = await ready([entry], async () => asset);
  try {
    view.update([entry], options('near', 10)); const first = bonePose(view.group);
    Object.assign(entry.fighter, {airHeight: .8, verticalSpeed: 2, y: .8});
    view.update([entry], options('near', 10.2)); const later = bonePose(view.group);
    assert.ok(first.some((value, index) => Math.abs(value - later[index]) > .001),
      'jump at 10 and 10.2 seconds must not stay clamped at the authored clip endpoint');
  } finally {view.dispose();}
});

for (const [clip, duration] of [['get-up', .8], ['enter', .65], ['exit', .65]]) {
  check(`${clip} reaches the authored endpoint within its simulation event window`, async () => {
    const asset = await parseAsset(readGlb('rook').bytes);
    const authored = asset.animations.find(item => item.name === clip);
    assert.ok(authored?.duration > 0);
    const entry = {fighter: fighter('rook'), presentation: {clip, startedAt: 10, duration}};
    const view = await ready([entry], async () => asset);
    try {
      const progress = .999;
      view.update([entry], options('near', 10 + duration * progress));
      const actual = bonePose(view.group);
      const mixer = new THREE.AnimationMixer(asset.scene);
      const action = mixer.clipAction(authored);
      action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
      mixer.setTime(authored.duration * progress); asset.scene.updateMatrixWorld(true);
      const expected = bonePose(asset.scene);
      assert.equal(actual.length, expected.length);
      const error = Math.max(...actual.map((value, index) => Math.abs(value - expected[index])));
      mixer.stopAllAction(); mixer.uncacheRoot(asset.scene);
      assert.ok(error < .002,
        `${clip} ends mid-pose: maximum bone component error ${error} at 99.9% of its event window`);
    } finally {view.dispose();}
  });
}

let failures = 0;
for (const {name, run} of checks) {
  try { await run(); } catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}
console.log(`Crew fighters: ${checks.length} checks, ${checks.length - failures} passed, ${failures} failed.`);
if (failures) process.exitCode = 1;
