// LAB-ART: the Lab's models (docs/LAB.md section 2): the committed GLBs match the
// manifest, rebuild byte for byte from the recipes, are real-sized, have the
// movable parts the benches need at their pivots, and stand in the hangar
// without overlapping. Headless; no storage.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const dir = join(root, 'public/assets/models/lab');
const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
const BUDGET = 6 * 1024 * 1024;
let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const equal = (value, expected, label) => { assert.deepEqual(value, expected, label); checks++; };

const BENCHES = ['weighing-pad', 'weights-and-cans', 'drop-tower', 'fire-pit', 'pendulum-frame', 'rotor-stand', 'bending-rig', 'nail-jars', 'turning-arm', 'map-table', 'snow-trays', 'wind-tunnel', 'launcher-ramp'];
equal(manifest.models.map(model => model.id), ['hangar', ...BENCHES], 'The hangar and the thirteen benches');
equal(Object.keys(manifest.layout).sort(), [...BENCHES].sort(), 'Every bench has a place in the hangar');

// Parts each bench needs to move (docs/LAB.md section 4), by model.
const PARTS = {
  'weighing-pad': ['pad'],
  'drop-tower': ['tower', 'carriage'],
  'fire-pit': ['pit', 'logs', 'lid'],
  'pendulum-frame': ['frame', 'cord-short', 'cord-medium', 'cord-long', 'cord-medium-heavy', 'stopwatch-hand'],
  'rotor-stand': ['stand', 'thrust-needle', 'rotor'],
  'bending-rig': ['rig', 'bar-aluminium', 'bar-steel', 'bar-carbon', 'ram', 'load-needle'],
  'nail-jars': ['shelf', 'jar-dry', 'jar-fresh', 'jar-salt', 'jar-zinc'],
  'turning-arm': ['base', 'g-needle', 'arm', 'plumb'],
  'map-table': ['table', 'compass-needle', 'ruler'],
  'wind-tunnel': ['tunnel', 'belt', 'fan', 'smoke-rake', 'fan-dial-needle', 'reverse-switch'],
  'launcher-ramp': ['launcher', 'ramp-arm'],
  'snow-trays': ['table', 'tray-minus15', 'tray-minus5', 'tray-zero', 'skis'],
};

// 1. The committed bytes match the manifest; the size budget; the models load.
let total = 0;
const loader = new GLTFLoader(), loaded = {};
for (const model of manifest.models) {
  const bytes = readFileSync(join(dir, `${model.id}.glb`));
  total += bytes.length;
  equal([bytes.length, createHash('sha256').update(bytes).digest('hex')], [model.bytes, model.sha256], `${model.id}: bytes match the manifest`);
  const gltf = await new Promise((resolve, reject) => loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', resolve, reject));
  loaded[model.id] = gltf.scene;
  let triangles = 0;
  gltf.scene.traverse(node => {
    if (!node.isMesh) return;
    const g = node.geometry;
    ok(g.attributes.position.array.every(Number.isFinite) && g.attributes.color, `${model.id}/${node.name}: finite vertices with colours`);
    triangles += g.index.count / 3;
  });
  equal(triangles, model.triangles, `${model.id}: triangle count matches the manifest`);
}
ok(total <= BUDGET && manifest.totalBytes === total, `The Lab's models total ${total} bytes (budget ${BUDGET})`);

// 2. Parts: each bench has the movable parts it needs, at the pivots the manifest lists.
for (const [id, names] of Object.entries(PARTS)) {
  const model = manifest.models.find(m => m.id === id);
  equal(model.parts.map(part => part.name), names, `${id}: the movable parts`);
  for (const part of model.parts) {
    const node = loaded[id].getObjectByName(part.name);
    ok(node, `${id}/${part.name}: a node of that name`);
    equal(node.position.toArray().map(v => Math.round(v * 1000) / 1000), part.pivot.map(v => Math.round(v * 1000) / 1000), `${id}/${part.name}: the node sits at its pivot`);
  }
}

// 3. Real sizes in metres.
const size = id => new THREE.Box3().setFromObject(loaded[id]).getSize(new THREE.Vector3());
const hall = manifest.hall;
ok(Math.abs(size('hangar').x - 2 * hall.halfWidth) < 2.5 && size('hangar').y > hall.ridge - .5, 'The hangar is 30 m wide and as tall as its ridge');
ok(size('weighing-pad').x > 6 && size('weighing-pad').z > 8, 'The weighing pad fits Kestrel One (about 6 x 8 m)');
ok(size('drop-tower').y > 6 && size('drop-tower').y < 8, 'The drop tower is a little over 6 m tall');
ok(size('pendulum-frame').y > 5.5 && size('pendulum-frame').x > 5, 'The pendulum frame carries a 5 m cord');
ok(size('turning-arm').z > 4.5, 'The turning arm cradle is car-sized (4.8 m)');
ok(size('wind-tunnel').x > 7.5, 'The wind tunnel is about 8 m long');
const reverse = loaded['wind-tunnel'].getObjectByName('reverse-switch');
ok(reverse && reverse.parent === loaded['wind-tunnel'].getObjectByName('tunnel').parent, 'REVERSE is its own node beside the tunnel, so a viewer can hide it until the secret opens');

// 4. The benches stand inside the hangar and none overlaps another (turning arm by its swept circle).
const foot = id => {
  const model = manifest.models.find(m => m.id === id), at = manifest.layout[id], f = model.footprint, sweep = manifest.sweepRadius[id];
  if (sweep) return { circle: { x: at.x, z: at.z, r: sweep } };
  const quarter = Math.round(at.yaw / (Math.PI / 2));
  ok(Math.abs(at.yaw - quarter * Math.PI / 2) < 1e-9, `${id}: placed square to the walls`);
  // A quarter turn about Y sends (x, z) to (z, -x) or (-z, x); a half turn flips both.
  const turn = ((quarter % 4) + 4) % 4;
  const [x0, x1, z0, z1] = [[f.minX, f.maxX, f.minZ, f.maxZ], [f.minZ, f.maxZ, -f.maxX, -f.minX], [-f.maxX, -f.minX, -f.maxZ, -f.minZ], [-f.maxZ, -f.minZ, f.minX, f.maxX]][turn];
  return { rect: { x0: at.x + x0, x1: at.x + x1, z0: at.z + z0, z1: at.z + z1 } };
};
const overlap = (a, b) => {
  if (a.rect && b.rect) return a.rect.x0 < b.rect.x1 && b.rect.x0 < a.rect.x1 && a.rect.z0 < b.rect.z1 && b.rect.z0 < a.rect.z1;
  if (a.circle && b.circle) return Math.hypot(a.circle.x - b.circle.x, a.circle.z - b.circle.z) < a.circle.r + b.circle.r;
  const c = a.circle ?? b.circle, r = a.rect ?? b.rect;
  const nx = Math.max(r.x0, Math.min(c.x, r.x1)), nz = Math.max(r.z0, Math.min(c.z, r.z1));
  return Math.hypot(nx - c.x, nz - c.z) < c.r;
};
const feet = Object.fromEntries(BENCHES.map(id => [id, foot(id)]));
for (const id of BENCHES) {
  const f = feet[id], box = f.rect ?? { x0: f.circle.x - f.circle.r, x1: f.circle.x + f.circle.r, z0: f.circle.z - f.circle.r, z1: f.circle.z + f.circle.r };
  ok(box.x0 >= -hall.halfWidth && box.x1 <= hall.halfWidth && box.z0 >= -hall.halfDepth && box.z1 <= hall.halfDepth + 5, `${id}: inside the hangar walls (the door side opens onto the pad)`);
}
for (let i = 0; i < BENCHES.length; i++) for (let j = i + 1; j < BENCHES.length; j++) ok(!overlap(feet[BENCHES[i]], feet[BENCHES[j]]), `${BENCHES[i]} and ${BENCHES[j]} do not overlap`);

// 5. The recipe rebuilds the committed models byte for byte.
const scratch = join(root, '.qa-dist', `lab-check-${process.pid}`);
mkdirSync(scratch, { recursive: true });
try {
  const run = spawnSync(process.execPath, [join(root, 'tools/art/lab-props.mjs'), '--out', scratch], { cwd: root, encoding: 'utf8', windowsHide: true });
  equal(run.status, 0, run.stderr);
  for (const model of manifest.models) equal(createHash('sha256').update(readFileSync(join(scratch, `${model.id}.glb`))).digest('hex'), model.sha256, `${model.id}: rebuilds to the same bytes`);
  equal(readFileSync(join(scratch, 'manifest.json'), 'utf8'), readFileSync(join(dir, 'manifest.json'), 'utf8'), 'The manifest rebuilds too');
} finally { rmSync(scratch, { recursive: true, force: true }); }
console.log(`Lab art: ${checks} checks; ${manifest.models.length} models, ${total.toLocaleString()} bytes (budget ${BUDGET.toLocaleString()}), rebuilt byte for byte.`);
