import assert from 'node:assert/strict';
import {readFileSync, existsSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, join, relative, isAbsolute, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Card acceptance written before the recipe. This suite spawns no builds.
const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const home = join(root, 'public/assets/models/circuits/kits');
const wanted = {
  paddock: ['start-gantry', 'pit-garage', 'pit-wall', 'grandstand'],
  safety: ['armco', 'concrete-wall', 'catch-fence', 'tyre-wall',
    'braking-board-150', 'braking-board-100', 'braking-board-50', 'marshal-post'],
  harbour: ['lantern-tower', 'shopfront-a', 'shopfront-b', 'neon-sign', 'lantern-string', 'harbour-boat'],
  forest: ['ski-lodge', 'chairlift-tower', 'chairlift-cable', 'chairlift-chair', 'wooden-dock', 'autumn-tree'],
  snow: ['snow-pine', 'snow-ground', 'snow-rock', 'plough-bank', 'gallery', 'summit-hut', 'observatory'],
  characters: ['snowman', 'yeti'],
};
const expected = Object.values(wanted).flat();
assert.equal(expected.length, 33);
assert.ok(existsSync(join(home, 'manifest.json')), 'P4-KITS actual prepared assets and manifest are required');
const manifest = JSON.parse(readFileSync(join(home, 'manifest.json'), 'utf8'));
assert.equal(manifest.version, 1);
assert.equal(manifest.units, 'metres');
assert.equal(manifest.up, 'Y');
assert.deepEqual(manifest.pieces.map(p => p.id).sort(), [...expected].sort());
const catalog = JSON.parse(readFileSync(join(root, 'tools/art/catalog.json'), 'utf8'));
const protectedRows = catalog.assets.filter(a => ![
  'p4-kenney-racing', 'p4-gp', 'p4-barrier', 'p4-city', 'p4-boats',
  'p4-neon', 'p4-holiday', 'p4-ski', 'p4-nature', 'p4-dome', 'p4-monsters',
].includes(a.id));
assert.equal(createHash('sha256').update(JSON.stringify(protectedRows)).digest('hex'),
  '638e0675be0d488bfb8ae24b6ac5b8bc7ebeacd45580b574c0d7af7c63b6c1c2',
  'all prior catalog entries and both unselected P4 records remain unchanged');
const selected = new Map(catalog.assets.filter(a => a.id.startsWith('p4-') && a.status === 'selected')
  .map(a => [a.id, a]));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function below(base, child) {
  assert.equal(isAbsolute(child), false);
  const path = resolve(base, child), rel = relative(base, path);
  assert.ok(rel && rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel));
  return path;
}
const loader = new GLTFLoader();
// Only the Node geometry check stubs decoding; browser checks use actual images.
loader.register(() => ({name: 'P4_HEADLESS_TEXTURE',
  loadTexture: () => Promise.resolve(new THREE.Texture())}));
async function load(file) {
  const bytes = readFileSync(below(home, file));
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const json = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
  for (const resource of [...(json.buffers || []), ...(json.images || [])])
    assert.ok(!resource.uri || resource.uri.startsWith('data:'), file + ' self-contained resources');
  const model = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  model.scene.updateMatrixWorld(true);
  let triangles = 0;
  model.scene.traverse(node => {
    if (!node.isMesh) return;
    const pos = node.geometry.attributes.position;
    assert.ok(pos?.count >= 3, file + ' renderable mesh');
    for (let i = 0; i < pos.count; i++) for (const v of [pos.getX(i), pos.getY(i), pos.getZ(i)])
      assert.ok(Number.isFinite(v), file + ' finite vertex');
    triangles += (node.geometry.index?.count ?? pos.count) / 3;
  });
  assert.ok(triangles > 0, file + ' nonempty geometry');
  const bounds = new THREE.Box3().setFromObject(model.scene);
  assert.ok(Math.abs(bounds.min.y) <= .025, file + ' ground-level pivot');
  return {model, triangles, bounds};
}
const models = new Map();
for (const piece of manifest.pieces) {
  assert.ok(wanted[piece.group]?.includes(piece.id));
  assert.ok(piece.sources.length);
  for (const id of piece.sources) {
    const source = selected.get(id);
    assert.ok(source, piece.id + ' Kyle-selected donor');
    assert.equal(source.license, 'CC0-1.0');
    assert.ok(source.p4Kits?.files?.length, id + ' pinned licensed inputs');
    for (const file of source.p4Kits.files) {
      assert.match(file.sha256, /^[a-f0-9]{64}$/);
      assert.equal(hash(readFileSync(below(source.p4Kits.library, file.path))), file.sha256);
    }
    assert.ok(piece.credits.some(c => c.sourcePage === source.sourcePage && c.author === source.author));
  }
  assert.notEqual(piece.high, piece.low);
  const high = await load(piece.high), low = await load(piece.low);
  if (piece.id === 'yeti') assert.ok(low.triangles <= 2000, 'Yeti distant character budget');
  assert.ok(low.triangles <= high.triangles, piece.id + ' LOD never increases geometry');
  if (high.triangles > 100) assert.ok(low.triangles < high.triangles * .8,
    piece.id + ' distant version removes meaningful detail');
  for (const axis of ['x', 'y', 'z']) {
    const size = high.bounds.max[axis] - high.bounds.min[axis];
    const distant = low.bounds.max[axis] - low.bounds.min[axis];
    assert.ok(Math.abs(size - distant) <= Math.max(.15, size * .12), piece.id + ' preserves LOD size');
  }
  high.low = low;
  models.set(piece.id, high);
}
// A same-sized bounding box can hide missing seats or collapsed walls.
// These rays witness the actual donor treads and support faces in both GLBs.
function structuralHit(asset, origin, direction) {
  const scene = asset.model.scene;
  scene.traverse(mesh => {if (mesh.isMesh) {
    for (const material of [].concat(mesh.material)) material.side = THREE.DoubleSide;
  }});
  const ray = new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction));
  return ray.intersectObject(scene, true)[0]?.distance;
}
const structuralFailures = [];
const requireStructure = (ok, message) => {if (!ok) structuralFailures.push(message);};
const stand = models.get('grandstand');
for (const [y, z] of [[1.655, 3.27], [1.911, 2.77], [2.303, 2.26],
  [2.694, 1.76], [3.086, 1.25], [3.477, .75], [3.869, .24]]) {
  for (const x of [-4, 0, 4]) for (const [quality, asset] of [['High', stand], ['LOD', stand.low]]) {
    const hit = structuralHit(asset, [x, y + .08, z], [0, -1, 0]);
    requireStructure(hit != null && Math.abs(hit - .08) < .015,
      `grandstand ${quality} keeps seat tread at ${x},${y},${z}; distance=${hit}`);
  }
}
for (const x of [-5, 0, 5]) for (const z of [-3, 0, 3]) {
  const origin = [x, 9, z], direction = [0, -1, 0];
  const high = structuralHit(stand, origin, direction), low = structuralHit(stand.low, origin, direction);
  requireStructure(high != null && low != null && Math.abs(high - low) < .5,
    `grandstand keeps its spanning roof at ${x},${z}; High=${high}, LOD=${low}`);
}
for (const x of [-5.8, 5.8]) for (const y of [1, 3, 6]) {
  const origin = [x, y, 5], direction = [0, 0, -1];
  const high = structuralHit(stand, origin, direction), low = structuralHit(stand.low, origin, direction);
  requireStructure(high != null && low != null && Math.abs(high - low) < .025,
    `grandstand keeps side supports at ${x},${y}; High=${high}, LOD=${low}`);
}
const garage = models.get('pit-garage');
for (const y of [.5, 1.5, 2.5]) for (const z of [-3, 0, 3]) {
  const origin = [-4, y, z], direction = [1, 0, 0];
  const high = structuralHit(garage, origin, direction);
  const low = structuralHit(garage.low, origin, direction);
  requireStructure(high != null && low != null && Math.abs(high - low) < .025,
    `garage LOD keeps side support at ${y},${z}; High=${high}, LOD=${low}`);
}
const pine = models.get('snow-pine');
for (const y of [2.5, 4.5, 6.5, 7.5]) for (const [origin, direction] of [
  [[-3, y, 0], [1, 0, 0]], [[3, y, 0], [-1, 0, 0]],
  [[0, y, -3], [0, 0, 1]], [[0, y, 3], [0, 0, -1]],
]) {
  const high = structuralHit(pine, origin, direction), low = structuralHit(pine.low, origin, direction);
  requireStructure(high != null && low != null && Math.abs(high - low) < .18,
    `snow pine keeps its closed foliage at ${origin}; High=${high}, LOD=${low}`);
}
const bank = models.get('plough-bank');
for (const x of [-1, 0, 1]) for (const z of [-.2, 0, .2]) {
  const origin = [x, 2, z], direction = [0, -1, 0];
  const high = structuralHit(bank, origin, direction), low = structuralHit(bank.low, origin, direction);
  requireStructure(high != null && low != null && Math.abs(high - low) < .12,
    `plough bank retains continuous snow at ${x},${z}; High=${high}, LOD=${low}`);
}
let bankMaxProfileError = 0, bankProfileHits = 0;
for (let xi = 0; xi < 31; xi++) for (let zi = 0; zi < 17; zi++) {
  const origin = [-2.5 + 5 * (xi + .5) / 31, 2, -.8 + 1.6 * (zi + .5) / 17];
  const high = structuralHit(bank, origin, [0, -1, 0]);
  const low = structuralHit(bank.low, origin, [0, -1, 0]);
  requireStructure((high == null) === (low == null), `bank silhouette at ${origin}`);
  if (high != null && low != null) {
    bankProfileHits++;
    bankMaxProfileError = Math.max(bankMaxProfileError, Math.abs(high - low));
  }
}
requireStructure(bankProfileHits > 300 && bankMaxProfileError <= .00001,
  `bank exact top profile: hits=${bankProfileHits}, max error=${bankMaxProfileError}`);
// Witness the actual lower steel frame, independently of object names or bounds.
const chair = models.get('chairlift-chair');
let frameArea = 0, retainedFrameArea = 0;
chair.model.scene.traverse(mesh => {
  if (!mesh.isMesh || !mesh.material.name.includes('steel')) return;
  const pos = mesh.geometry.attributes.position, index = mesh.geometry.index;
  for (let i = 0; i < (index?.count ?? pos.count); i += 3) {
    const v = [0, 1, 2].map(k => new THREE.Vector3()
      .fromBufferAttribute(pos, index ? index.getX(i + k) : i + k).applyMatrix4(mesh.matrixWorld));
    const triangle = new THREE.Triangle(...v), centre = triangle.getMidpoint(new THREE.Vector3());
    const area = triangle.getArea();
    if (centre.y > .4 || area < 1e-7) continue;
    const normal = triangle.getNormal(new THREE.Vector3());
    const origin = centre.clone().addScaledVector(normal, .05);
    const distance = structuralHit(chair.low, origin.toArray(), normal.negate().toArray());
    frameArea += area;
    if (distance != null && Math.abs(distance - .05) < .025) retainedFrameArea += area;
  }
});
requireStructure(frameArea > .1, 'donor has a measurable lower steel chair frame');
requireStructure(retainedFrameArea / frameArea >= .9,
  `chair LOD retains lower frame surface; fraction=${retainedFrameArea / frameArea}`);
assert.deepEqual(structuralFailures, [], 'distant donor structures remain intact');
const gantry = models.get('start-gantry').model.scene;
const lamps = [1, 2, 3, 4, 5].map(n => gantry.getObjectByName('lamp-' + n));
for (const lamp of lamps) {
  assert.ok(lamp?.isMesh, 'each countdown lamp is a distinct mesh');
  assert.ok(lamp.material?.emissive, 'lamp can be lit natively');
}
assert.equal(new Set(lamps.map(l => l.material.uuid)).size, 5, 'independent lamp materials');
assert.equal(new Set(lamps.map(l => l.getWorldPosition(new THREE.Vector3()).x.toFixed(3))).size, 5);
const clear = new THREE.Box3(new THREE.Vector3(-5, .05, -2.99), new THREE.Vector3(5, 4.5, 2.99));
let roof = false;
models.get('gallery').model.scene.traverse(mesh => {
  if (!mesh.isMesh) return;
  const pos = mesh.geometry.attributes.position, index = mesh.geometry.index;
  for (let i = 0; i < (index?.count ?? pos.count); i += 3) {
    const v = [0, 1, 2].map(k => new THREE.Vector3()
      .fromBufferAttribute(pos, index ? index.getX(i + k) : i + k).applyMatrix4(mesh.matrixWorld));
    assert.equal(clear.intersectsTriangle(new THREE.Triangle(...v)), false, 'gallery intrudes into clear road');
    if (v.every(p => p.y > 4.5) && Math.min(...v.map(p => p.x)) < -4.9 &&
      Math.max(...v.map(p => p.x)) > 4.9) roof = true;
  }
});
assert.ok(roof, 'gallery has a spanning roof above the clear road');
const snowman = models.get('snowman').model.scene;
for (const name of ['hat', 'carrot', 'snow-body'])
  assert.ok(snowman.getObjectByName(name)?.isMesh, name + ' separate snowman debris mesh');
const yeti = models.get('yeti').model;
assert.ok(yeti.scene.getObjectByProperty('isSkinnedMesh', true));
const signatures = new Set();
for (const name of ['idle', 'roar', 'chest-beat', 'lope']) {
  const clip = THREE.AnimationClip.findByName(yeti.animations, name);
  assert.ok(clip && clip.duration > .3 && clip.tracks.length > 1, name + ' playable clip');
  signatures.add(hash(Buffer.from(JSON.stringify(clip.tracks.map(t => [t.name, [...t.times], [...t.values]])))));
  const mixer = new THREE.AnimationMixer(yeti.scene);
  mixer.clipAction(clip).play();
  const sample = time => {
    mixer.setTime(time); yeti.scene.updateMatrixWorld(true);
    const values = []; yeti.scene.traverse(n => {if (n.isBone) values.push(...n.matrixWorld.elements);});
    return values;
  };
  const first = sample(0), frames = [.23, .51, .77].map(f => sample(clip.duration * f));
  assert.ok(frames.some(frame => frame.some((v, i) => Math.abs(v - first[i]) > .001)), name + ' actual motion');
  mixer.stopAllAction(); mixer.uncacheRoot(yeti.scene);
}
assert.equal(signatures.size, 4, 'four distinct motions');
assert.ok(readdirSync(home).every(name => /\.(?:glb|json)$/.test(name)));
console.log('P4 kits: 33 actual high/low props, provenance, lamps, clearance, debris and clips passed.');
console.log(`Bank top profile: ${bankProfileHits} hits, maximum error ${bankMaxProfileError} m.`);
