import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Structural budgets and lifecycle behavior do not establish visual fidelity.
// Three matched Blender/game rounds and the real frame budget remain required.
const CREW = ['rook', 'nell', 'jax', 'odessa', 'cinder', 'dune', 'wren', 'tusk'];
const CLIPS = ['idle', 'aim', 'fire', 'reload', 'repair', 'wrench-idle', 'aim-fire', 'aim-reload'];
const tests = [], check = (name, run) => tests.push({name, run});
const file = path => new URL(`../${path}`, import.meta.url);
const settle = () => new Promise(resolve => setImmediate(resolve));
const nodes = (root, predicate) => {const result = []; root.traverse(node => {
  if (predicate(node)) result.push(node);
}); return result;};
const meshes = root => nodes(root, node => node.isMesh);
const visible = node => {
  for (let ancestor = node; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return false;
  return true;
};
// Installed Three submits groups only for material arrays. BoxGeometry with a
// single material is one draw, despite retaining six geometry face groups.
const draws = mesh => Array.isArray(mesh.material) ? mesh.geometry.groups.length : 1;
const triangles = mesh => (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
const freeze = value => {if (value && typeof value === 'object') {
  Object.values(value).forEach(freeze); Object.freeze(value);
} return value;};
const entry = (id = 'rook', weapon = 'rpg', extra = {}) => ({
  fighter: {crewId: id, x: 3, y: 0, z: 4, yaw: .2, speed: 0,
    airHeight: 0, verticalSpeed: 0, knockedDown: false}, input: {},
  weapons: {selected: weapon, ammo: 2, serial: 1, lastFireAt: 10,
    nextFireAt: 12.2, repairing: false, repairSeconds: 0, repairAmount: 0}, ...extra,
});
const options = (camera, time = 10.05) => ({enabled: true, active: true, firstPerson: true, camera, time});

function glb(path) {
  assert.ok(existsSync(file(path)), `${path} is missing`);
  const bytes = readFileSync(file(path));
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
  assert.ok(json && binary, 'self-contained geometry is required');
  for (const item of [...(json.buffers || []), ...(json.images || [])])
    assert.ok(!item.uri || item.uri.startsWith('data:'), 'asset cannot require external resources');
  assert.ok(json.images?.length, 'authored texture set is required');
  const colorSources = new Set((json.materials || []).flatMap(material => {
    const texture = material.pbrMetallicRoughness?.baseColorTexture;
    return texture ? [json.textures[texture.index].source] : [];
  }));
  assert.equal(colorSources.size, 1, 'one shared base-color atlas per asset');
  for (const image of json.images) {
    const view = json.bufferViews[image.bufferView];
    const png = image.uri ? Buffer.from(image.uri.split(',')[1], 'base64') :
      binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), 1024); assert.equal(png.readUInt32BE(20), 1024);
  }
  return bytes;
}
async function asset(path) {
  const bytes = glb(path), loader = new GLTFLoader();
  // Node cannot decode browser images; only texture decoding is substituted.
  // Geometry, material slots, skins, bones and clips use installed Three.
  loader.register(() => ({name: 'TEST_EMBEDDED_TEXTURE', loadTexture: () => Promise.resolve(new THREE.Texture())}));
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}
const modelPath = id => `public/assets/models/wasteland/first-person/${id}.glb`;

check('headless source and both retained shared tool sources exist', () => {
  for (const path of ['tools/blender/first-person-gear.py',
    'public/assets/models/wasteland/first-person/rpg.blend',
    'public/assets/models/wasteland/first-person/wrench.blend']) {
    assert.ok(existsSync(file(path)), `${path} is missing`);
    assert.ok(readFileSync(file(path)).length > 100, `${path} is empty`);
  }
});
check('shared tools are textured and RPG has an independently hideable loaded rocket', async () => {
  const rpg = await asset(modelPath('rpg')), wrench = await asset(modelPath('wrench'));
  assert.ok(meshes(rpg.scene).length && meshes(wrench.scene).length);
  const rockets = meshes(rpg.scene).filter(mesh => /loaded[-_ ]rocket/i.test(mesh.name));
  assert.ok(rockets.length, 'last-rocket state needs a separate loaded-rocket mesh');
  assert.ok(meshes(rpg.scene).some(mesh => !rockets.includes(mesh)), 'empty launcher stays present');
});
for (const id of CREW) {
  check(`${id}: retained bound hands and actual combined geometry/material budget`, async () => {
    assert.ok(existsSync(file(`public/assets/models/wasteland/first-person/hands/${id}.blend`)));
    const hands = await asset(modelPath(`hands/${id}`));
    const skins = meshes(hands.scene).filter(mesh => mesh.isSkinnedMesh);
    assert.ok(skins.length, 'hands need actual bound skin');
    for (const tool of ['rpg', 'wrench']) {
      const loaded = await asset(modelPath(tool)), combined = [...meshes(hands.scene), ...meshes(loaded.scene)];
      assert.ok(combined.reduce((sum, mesh) => sum + triangles(mesh), 0) <= 8000,
        `${id}/${tool} exceeds 8000 combined triangles`);
      assert.ok(combined.reduce((sum, mesh) => sum + draws(mesh), 0) <= 3,
        `${id}/${tool} exceeds three actual material draws`);
    }
    for (const socket of ['rpg-mount', 'wrench-mount'])
      assert.ok(hands.scene.getObjectByName(socket), `${id} is missing ${socket}`);
    const weightedFingers = new Set();
    for (const mesh of skins) {
      const indices = mesh.geometry.attributes.skinIndex, weights = mesh.geometry.attributes.skinWeight;
      assert.ok(indices && weights && mesh.skeleton?.bones.length);
      for (let vertex = 0; vertex < weights.count; vertex++) {
        let total = 0;
        for (let component = 0; component < 4; component++) {
          const weight = weights.getComponent(vertex, component); total += weight;
          const bone = mesh.skeleton.bones[indices.getComponent(vertex, component)];
          if (weight > .05 && /finger/i.test(bone?.name || '')) weightedFingers.add(bone.name);
        }
        assert.ok(Math.abs(total - 1) < .001, 'bound weights must be normalized');
      }
    }
    for (const side of ['L', 'R']) assert.ok([...weightedFingers].filter(name =>
      name.endsWith(`_${side}`)).length >= 5, `${side} hand needs five visibly weighted finger chains`);
  });
  check(`${id}: aim, recoil, reload and repair deform bound hand vertices`, async () => {
    const hands = await asset(modelPath(`hands/${id}`));
    const skins = meshes(hands.scene).filter(mesh => mesh.isSkinnedMesh);
    for (const name of CLIPS) {
      const clip = hands.animations.find(item => item.name === name);
      assert.ok(clip?.duration > 0, `${id}: ${name} clip missing`);
      const mixer = new THREE.AnimationMixer(hands.scene);
      mixer.clipAction(clip).play();
      const sample = time => {
        mixer.setTime(time); hands.scene.updateMatrixWorld(true);
        return skins.flatMap(mesh => {
          mesh.skeleton.update(); const result = [], count = mesh.geometry.attributes.position.count;
          for (let index = 0; index < count; index += Math.max(1, Math.floor(count / 256)))
            result.push(...mesh.getVertexPosition(index, new THREE.Vector3()).toArray());
          return result;
        });
      };
      const first = sample(0);
      assert.ok([.23, .61].some(fraction => sample(clip.duration * fraction)
        .some((value, index) => Math.abs(value - first[index]) > .001)),
      `${id}: ${name} has no visible skin deformation`);
      mixer.stopAllAction(); mixer.uncacheRoot(hands.scene);
    }
  });
}

async function factory() {
  assert.ok(existsSync(file('src/first-person-gear.js')), 'first-person gear runtime is missing');
  const module = await import('../src/first-person-gear.js');
  assert.equal(typeof module.createFirstPersonGear, 'function');
  return module.createFirstPersonGear;
}
function fixture(kind, id = kind) {
  const scene = new THREE.Group(), disposed = {geometry: 0, material: 0};
  const material = new THREE.MeshStandardMaterial();
  material.addEventListener('dispose', () => disposed.material++);
  const geometry = new THREE.BoxGeometry(.1, .1, .3);
  geometry.addEventListener('dispose', () => disposed.geometry++);
  let animations = [];
  if (kind === 'hands') {
    const count = geometry.attributes.position.count, weights = new Float32Array(count * 4);
    for (let index = 0; index < count; index++) weights[index * 4] = 1;
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    const mesh = new THREE.SkinnedMesh(geometry, material), root = new THREE.Bone();
    root.name = `finger-fixture-${id}`; mesh.name = `hands-${id}`;
    for (const name of ['rpg-mount', 'wrench-mount']) {const socket = new THREE.Bone(); socket.name = name; root.add(socket);}
    mesh.add(root); mesh.bind(new THREE.Skeleton([root, ...root.children])); scene.add(mesh);
    animations = CLIPS.map((name, index) => new THREE.AnimationClip(name, 1, [
      new THREE.NumberKeyframeTrack(`${root.name}.position[y]`, [0, .5, 1], [0, .02 * (index + 1), 0])]));
  } else {
    const mesh = new THREE.Mesh(geometry, material); mesh.name = kind; scene.add(mesh);
    if (kind === 'rpg') {const rocket = new THREE.Mesh(geometry, material); rocket.name = 'loaded-rocket'; scene.add(rocket);}
  }
  return {scene, animations, disposed};
}
async function ready(snapshot = entry(), loadAsset = async (kind, id) => fixture(kind, id)) {
  const create = await factory(), camera = new THREE.PerspectiveCamera(72, 16 / 9, .15, 1000);
  const view = create({loadAsset});
  view.update(snapshot, options(camera)); await settle(); await settle();
  view.update(snapshot, options(camera)); return {view, camera};
}
function drawn(view, camera) {
  let count = 0;
  for (const mesh of meshes(view.group).filter(visible)) {
    mesh.onBeforeRender(null, null, camera, mesh.geometry, mesh.material, null);
    const materials = [].concat(mesh.material);
    if (mesh.geometry.drawRange.count > 0 && materials.some(material => material.visible) &&
        camera.layers.test(mesh.layers)) count += draws(mesh);
    mesh.onAfterRender(null, null, camera, mesh.geometry, mesh.material, null);
  }
  return count;
}
const bones = root => nodes(root, node => node.isBone);
const pose = root => {root.updateMatrixWorld(true); return bones(root).flatMap(bone => bone.matrixWorld.toArray());};

check('requests and draws require explicit enabled, active first-person view and matching camera', async () => {
  const create = await factory(), calls = [], camera = new THREE.PerspectiveCamera();
  const view = create({loadAsset: async (kind, id) => {calls.push([kind, id]); return fixture(kind, id);}});
  try {
    for (const settings of [{}, {enabled: false, active: true, firstPerson: true, camera},
      {enabled: true, active: false, firstPerson: true, camera},
      {enabled: true, active: true, firstPerson: false, camera}]) view.update(entry(), settings);
    await settle(); assert.equal(calls.length, 0, 'hidden views must not request models');
    assert.equal(drawn(view, camera), 0);
    view.update(entry(), options(camera)); await settle(); await settle(); view.update(entry(), options(camera));
    assert.ok(drawn(view, camera) > 0);
    assert.equal(drawn(view, new THREE.PerspectiveCamera()), 0, 'other camera passes cannot draw the held model');
    assert.ok(drawn(view, camera) > 0, 'filtering another camera must restore the intended pass');
    for (const key of ['enabled', 'active', 'firstPerson']) {
      view.update(entry(), {...options(camera), [key]: false}); assert.equal(drawn(view, camera), 0);
    }
  } finally {view.dispose();}
});
check('crew/tool cache and prepared meshes survive switching without frame allocations', async () => {
  const calls = [], {view, camera} = await ready(entry(), async (kind, id) => {
    calls.push(`${kind}:${id || ''}`); return fixture(kind, id);
  });
  try {
    const identity = mesh => [mesh.geometry.uuid, [].concat(mesh.material).map(m => m.uuid)];
    const prepared = new Map(meshes(view.group).map(mesh => [mesh.uuid, identity(mesh)]));
    for (const snapshot of [entry('nell'), entry('nell', 'wrench'), entry('rook')]) {
      view.update(snapshot, options(camera)); await settle(); await settle(); view.update(snapshot, options(camera));
      for (const mesh of meshes(view.group)) prepared.set(mesh.uuid, identity(mesh));
    }
    for (let frame = 0; frame < 8; frame++) {
      view.update(entry(frame % 2 ? 'rook' : 'nell'), options(camera));
      for (const mesh of meshes(view.group)) assert.deepEqual(identity(mesh), prepared.get(mesh.uuid),
        'crew switching must reuse prepared meshes, geometry and materials');
    }
    assert.equal(new Set(calls).size, calls.length, 'each crew/shared tool loads only once');
    assert.ok(calls.includes('hands:rook') && calls.includes('hands:nell'));
  } finally {view.dispose();}
});
check('switching crew during loading never draws the stale resolved crew', async () => {
  const create = await factory(), pending = new Map(), camera = new THREE.PerspectiveCamera();
  const view = create({loadAsset: (kind, id) => kind === 'hands'
    ? new Promise(resolve => pending.set(id, resolve)) : Promise.resolve(fixture(kind, id))});
  try {
    view.update(entry('rook'), options(camera)); await settle();
    view.update(entry('nell'), options(camera)); await settle();
    pending.get('nell')(fixture('hands', 'nell')); await settle(); await settle();
    view.update(entry('nell'), options(camera));
    pending.get('rook')(fixture('hands', 'rook')); await settle();
    view.update(entry('nell'), options(camera));
    const shown = meshes(view.group).filter(mesh => mesh.isSkinnedMesh && visible(mesh));
    assert.equal(shown.length, 1); assert.equal(shown[0].name, 'hands-nell');
  } finally {view.dispose();}
});
check('separate view instances have independent bones and reusable pause/rewind poses', async () => {
  const assets = new Map(), loader = async (kind, id) => {
    const key = `${kind}:${id}`; if (!assets.has(key)) assets.set(key, fixture(kind, id)); return assets.get(key);
  };
  const snapshot = freeze(entry()), before = JSON.stringify(snapshot);
  const a = await ready(snapshot, loader), b = await ready(snapshot, loader);
  try {
    const aBones = bones(a.view.group), bBones = bones(b.view.group);
    assert.ok(aBones.length && bBones.length); assert.notEqual(aBones[0], bBones[0]);
    const first = pose(a.view.group);
    for (let frame = 0; frame < 6; frame++) {a.view.update(snapshot, options(a.camera)); assert.deepEqual(pose(a.view.group), first);}
    a.view.update(snapshot, options(a.camera, 11));
    assert.notDeepEqual(pose(a.view.group), first);
    a.view.update(snapshot, options(a.camera)); assert.deepEqual(pose(a.view.group), first);
    assert.equal(JSON.stringify(snapshot), before);
  } finally {a.view.dispose(); b.view.dispose();}
});
check('last rocket hides its loaded mesh without hiding the empty launcher', async () => {
  const snapshot = entry(); snapshot.weapons.ammo = 0;
  const {view, camera} = await ready(snapshot);
  try {
    for (const time of [10.05, 11]) {
      view.update(snapshot, options(camera, time));
      assert.ok(meshes(view.group).some(mesh => mesh.name === 'rpg' && visible(mesh)));
      assert.ok(meshes(view.group).filter(mesh => /loaded[-_ ]rocket/i.test(mesh.name)).every(mesh => !visible(mesh)));
    }
  } finally {view.dispose();}
});
check('spent rocket is hidden through recoil and reserve appears only at reload insertion', async () => {
  const snapshot = entry(), {view, camera} = await ready(snapshot);
  try {
    const showRocket = () => meshes(view.group).filter(mesh => /loaded[-_ ]rocket/i.test(mesh.name));
    assert.ok(showRocket().length, 'fixture has a separately visible loaded rocket');
    const recoilEnds = 10.22, reloadDuration = snapshot.weapons.nextFireAt - recoilEnds;
    for (const time of [10, 10.05, 10.219, recoilEnds, recoilEnds + reloadDuration * .119]) {
      view.update(snapshot, options(camera, time));
      assert.ok(showRocket().every(mesh => !visible(mesh)),
        `spent rocket remains absent before replacement insertion at simulation time ${time}`);
    }
    for (const phase of [.121, .5, .99]) {
      view.update(snapshot, options(camera, recoilEnds + reloadDuration * phase));
      assert.ok(showRocket().some(visible), 'available replacement appears during authored insertion');
    }
    view.update(snapshot, options(camera, snapshot.weapons.nextFireAt));
    assert.ok(showRocket().some(visible), 'loaded replacement remains ready after reload');
    snapshot.weapons.ammo = 0;
    for (const time of [10, 10.1, 10.219, 10.5, 11.5, 12.2]) {
      view.update(snapshot, options(camera, time));
      assert.ok(showRocket().every(mesh => !visible(mesh)), 'last rocket never creates a replacement');
      assert.ok(meshes(view.group).some(mesh => mesh.name === 'rpg' && visible(mesh)),
        'empty launcher remains visible');
    }
  } finally {view.dispose();}
});
check('failed loads remain bounded and cannot mutate the playable snapshot', async () => {
  const snapshot = freeze(entry()), before = JSON.stringify(snapshot), calls = [];
  const {view, camera} = await ready(snapshot, async (kind, id) => {calls.push(`${kind}:${id}`); throw Error('controlled load failure');});
  try {
    for (let frame = 0; frame < 6; frame++) view.update(snapshot, options(camera));
    await settle(); assert.equal(new Set(calls).size, calls.length, 'no per-frame failure request loop');
    assert.equal(JSON.stringify(snapshot), before);
  } finally {view.dispose();}
});
check('late resolutions after disposal release resources once and cannot resurrect models', async () => {
  const create = await factory(), pending = [], camera = new THREE.PerspectiveCamera();
  const view = create({loadAsset: (kind, id) => new Promise(resolve => pending.push({kind, id, resolve}))});
  view.update(entry(), options(camera)); await settle(); view.dispose(); view.dispose();
  assert.ok(pending.length);
  for (const request of pending) {request.asset = fixture(request.kind, request.id); request.resolve(request.asset);}
  await settle(); await settle(); view.update(entry(), options(camera));
  assert.equal(view.group.children.length, 0); assert.equal(drawn(view, camera), 0);
  for (const request of pending) assert.deepEqual(request.asset.disposed, {geometry: 1, material: 1});
});

let failures = 0;
for (const {name, run} of tests) {
  try {await run();} catch (error) {failures++; console.error(`FAIL ${name}: ${error.message}`);}
}
console.log(`First-person gear: ${tests.length} checks, ${tests.length - failures} passed, ${failures} failed.`);
if (failures) process.exitCode = 1;
